import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { auditCss } from "./audit";
import { createBlend } from "./blend";
import { type GradientConfig, parseConfig, renderConfig } from "./config";
import { checkDistinguishable } from "./cvd";
import type { DarkMode } from "./export/css";
import { checkPair, fixContrast } from "./pair";
import { checkPalette, createPalette } from "./palette";
import { render, seriesCss } from "./render";
import { createSeries } from "./series";

const HELP = `Usage:
  gradient <color> [name=color ...] [options]
  gradient check <foreground> <background> [--target <ratio>]
  gradient audit <file.css> [--json] [--markdown]
  gradient build [--config <file>] [--verify] [--json] [--markdown]
  gradient init <color> [--format <format>] [--out <file>]
  gradient series <color> [--count <n>] [--format css|json|table]
  gradient blend <color> <color> [...] [--steps <n>] [--angle <deg>] [--format css|json|table]

Examples:
  gradient "#e30613"
  gradient "#e30613" accent=#0a84ff --format tailwind --out src/gradient.css
  gradient "oklch(62% 0.2 250)" --format tokens --out tokens.json
  gradient check "#ffffff" "#e30613"
  gradient "#e30613" --format shadcn --out app/globals.css
  gradient series "#e30613" --count 5
  gradient audit app/globals.css
  gradient init "#e30613" --format shadcn --out app/globals.css
  gradient build
  gradient build --verify
  gradient blend "#e30613" "#0a84ff" --steps 7

Options:
  --name <name>          Name of the first color (default: brand)
  --format <format>      css (default) | tailwind | tailwind3 | scss | ts |
                         shadcn | tokens | json | table
  --dark <mode>          both (default) | media | class | light-dark | none
  --dark-selector <sel>  Class that turns dark mode on (default: .dark)
  --hex                  css and shadcn: hex values instead of oklch()
  --prefix <prefix>      css and scss: variable prefix (default: color, scss none)
  --status               Add success, warning, danger and info scales
  --no-neutral           Do not add the tinted grey "neutral"
  --neutral-chroma <n>   Chroma of the neutral, 0 for pure grey (default: auto)
  --saturation <n>       Multiply the chroma of all steps (default: 1)
  --hue-shift <deg>      Turn the hue from the lightest to the darkest step
  --pin                  Put the exact input color on its closest step
  --out <file>           Write to a file instead of stdout
  --check                Print the contrast checks; exit code 1 if one fails.
                         Also warns about colors that look alike with a
                         color vision deficiency (no effect on the exit code)
  --target <ratio>       check: contrast the pair needs (default: 4.5)
  --config <file>        build: config file (default: gradient.config.json)
  --verify               build: write nothing, exit code 1 if a file is out of date
  --markdown             build and audit: print a Markdown report

Every step reaches a fixed contrast: 500 is at least 3:1 on white, 600 at
least 4.5:1, 800 at least 7:1, in dark mode the same on black.`;

export async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    allowNegative: true,
    options: {
      name: { type: "string" },
      format: { type: "string" },
      dark: { type: "string" },
      "dark-selector": { type: "string" },
      hex: { type: "boolean" },
      prefix: { type: "string" },
      neutral: { type: "boolean", default: true },
      status: { type: "boolean" },
      "neutral-chroma": { type: "string" },
      saturation: { type: "string" },
      "hue-shift": { type: "string" },
      pin: { type: "boolean" },
      out: { type: "string" },
      check: { type: "boolean" },
      target: { type: "string" },
      count: { type: "string" },
      steps: { type: "string" },
      angle: { type: "string" },
      json: { type: "boolean" },
      config: { type: "string" },
      verify: { type: "boolean" },
      markdown: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help || positionals.length === 0) {
    console.log(HELP);
    return values.help ? 0 : 2;
  }

  if (positionals[0] === "audit") return auditCommand(positionals.slice(1), values);
  if (positionals[0] === "build") return buildCommand(values);
  if (positionals[0] === "init") return initCommand(positionals.slice(1), values);
  if (positionals[0] === "series") return seriesCommand(positionals.slice(1), values);
  if (positionals[0] === "blend") return blendCommand(positionals.slice(1), values);
  if (positionals[0] === "check") return checkCommand(positionals.slice(1), values.target);

  const colors: Record<string, string> = {};
  positionals.forEach((arg, i) => {
    const eq = arg.indexOf("=");
    if (eq > 0 && !arg.startsWith("#")) colors[arg.slice(0, eq)] = arg.slice(eq + 1);
    else colors[i === 0 ? (values.name ?? "brand") : `color${i + 1}`] = arg;
  });

  const neutralChroma = values["neutral-chroma"];
  const palette = createPalette(colors, {
    neutral: values.neutral === false ? false : neutralChroma ? number(neutralChroma) : true,
    saturation: values.saturation ? number(values.saturation) : undefined,
    hueShift: values["hue-shift"] ? number(values["hue-shift"]) : undefined,
    pin: values.pin,
    status: values.status,
  });

  const format = values.format ?? "css";
  const dark = (values.dark ?? (format === "shadcn" ? "class" : "both")) as DarkMode;
  if (!["both", "media", "class", "light-dark", "none"].includes(dark)) {
    throw new Error(`Unknown --dark "${dark}".`);
  }
  const darkSelector = values["dark-selector"];
  const output = render(palette, format, {
    dark,
    darkSelector,
    hex: values.hex,
    prefix: values.prefix,
  });

  if (values.out) {
    writeFileSync(values.out, output);
    console.error(`Wrote ${values.out}.`);
  } else {
    process.stdout.write(output);
  }

  if (values.check) {
    const checks = checkPalette(palette);
    const failed = checks.filter((c) => !c.pass);
    for (const c of failed) {
      console.error(
        `fail ${c.scale} ${c.mode}: ${c.foreground} on ${c.background} = ${c.ratio}:1, needs ${c.required}:1`,
      );
    }
    console.error(`${checks.length - failed.length}/${checks.length} contrast checks passed.`);
    const alike = new Map<string, string[]>();
    for (const c of checkDistinguishable(palette).filter((c) => !c.pass && c.mode === "light")) {
      const key = `${c.a} and ${c.b}`;
      alike.set(key, [...(alike.get(key) ?? []), c.vision]);
    }
    for (const [pair, visions] of alike) {
      console.error(`note ${pair} look alike (${visions.join(", ")}): add an icon or a label.`);
    }
    return failed.length > 0 ? 1 : 0;
  }
  return 0;
}

function seriesCommand(
  colors: string[],
  values: {
    count?: string;
    format?: string;
    dark?: string;
    "dark-selector"?: string;
    out?: string;
  },
): number {
  const [color] = colors;
  if (!color || colors.length > 1) {
    console.error("Usage: gradient series <color> [--count <n>] [--format css|json|table]");
    return 2;
  }
  const series = createSeries(color, values.count ? { count: number(values.count) } : {});
  const format = values.format ?? "css";
  let output: string;
  if (format === "json") {
    output = `${JSON.stringify(series, null, 2)}\n`;
  } else if (format === "table") {
    output = `${series.light
      .map((l, i) => `${i + 1}  light ${l}  dark ${series.dark[i]}`)
      .join("\n")}\nWorst distance ${series.distance} (0.08 and up is clearly distinguishable)\n`;
  } else if (format === "css") {
    output = seriesCss(
      color,
      values.count ? number(values.count) : undefined,
      values["dark-selector"],
    ).css;
  } else {
    throw new Error(`Unknown --format "${format}" for series.`);
  }
  if (values.out) {
    writeFileSync(values.out, output);
    console.error(`Wrote ${values.out}.`);
  } else {
    process.stdout.write(output);
  }
  console.error(
    `Worst distance ${series.distance}${series.distance >= 0.08 ? "" : ": below 0.08, label the series directly"}.`,
  );
  return 0;
}

function blendCommand(
  colors: string[],
  values: { steps?: string; angle?: string; format?: string; out?: string },
): number {
  if (colors.length < 2) {
    console.error(
      "Usage: gradient blend <color> <color> [...] [--steps <n>] [--angle <deg>] [--format css|json|table]",
    );
    return 2;
  }
  const blend = createBlend(colors, {
    ...(values.steps ? { steps: number(values.steps) } : {}),
    ...(values.angle ? { angle: number(values.angle) } : {}),
  });
  const format = values.format ?? "css";
  let output: string;
  if (format === "json") output = `${JSON.stringify(blend, null, 2)}\n`;
  else if (format === "table") output = `${blend.stops.join("\n")}\n`;
  else if (format === "css")
    output = `background: ${blend.css};\n/* or, in current browsers: */\nbackground: ${blend.native};\n`;
  else throw new Error(`Unknown --format "${format}" for blend.`);
  if (values.out) {
    writeFileSync(values.out, output);
    console.error(`Wrote ${values.out}.`);
  } else {
    process.stdout.write(output);
  }
  return 0;
}

type AuditReport = { file: string } & ReturnType<typeof auditCss>;

function auditCommand(files: string[], values: { json?: boolean; markdown?: boolean }): number {
  if (files.length === 0) {
    console.error("Usage: gradient audit <file.css> [...] [--json] [--markdown]");
    return 2;
  }
  const reports = files.map((file) => ({ file, ...auditCss(readFileSync(file, "utf8")) }));
  const failures = reports.reduce((n, r) => n + r.checks.filter((c) => !c.pass).length, 0);
  if (values.json) {
    process.stdout.write(`${JSON.stringify(reports, null, 2)}\n`);
  } else if (values.markdown) {
    process.stdout.write(`${auditMarkdown(reports)}\n`);
  } else {
    printAudit(reports);
  }
  return failures > 0 ? 1 : 0;
}

function printAudit(reports: AuditReport[]) {
  for (const report of reports) {
    if (report.scales.length === 0) {
      console.log(`${report.file}: no color steps found (variables like --color-brand-600).`);
      continue;
    }
    console.log(report.file);
    for (const scale of report.scales) {
      for (const mode of ["light", "dark"] as const) {
        const checks = report.checks.filter((c) => c.scale === scale && c.mode === mode);
        if (checks.length === 0) continue;
        const failed = checks.filter((c) => !c.pass);
        console.log(
          `  ${scale} ${mode}: ${checks.length - failed.length}/${checks.length} pairs pass`,
        );
        for (const c of failed) {
          console.log(
            `    fail ${c.foreground} on ${c.background} = ${c.ratio}:1, needs ${c.required}:1${c.fix ? ` (try ${c.fix})` : ""}`,
          );
        }
      }
    }
    if (report.skipped.length > 0) {
      console.log(`  skipped ${report.skipped.length} variable(s) that are not plain colors`);
    }
  }
}

function auditMarkdown(reports: AuditReport[]): string {
  const lines: string[] = [];
  for (const report of reports) {
    const failed = report.checks.filter((c) => !c.pass);
    if (report.scales.length === 0) {
      lines.push(`- \`${report.file}\`: no color steps found.`);
    } else if (failed.length === 0) {
      lines.push(`- \`${report.file}\`: all ${report.checks.length} pairs pass.`);
    } else {
      lines.push(
        `- \`${report.file}\`: ${failed.length} of ${report.checks.length} pairs fail.`,
        "",
        "  | Scale | Mode | Pair | Ratio | Needs | Try |",
        "  |---|---|---|---|---|---|",
        ...failed.map(
          (c) =>
            `  | ${c.scale} | ${c.mode} | ${c.foreground} on ${c.background} | ${c.ratio}:1 | ${c.required}:1 | ${c.fix ? `\`${c.fix}\`` : "-"} |`,
        ),
        "",
      );
    }
  }
  return lines.join("\n");
}

function readConfig(path: string): GradientConfig {
  if (!existsSync(path)) {
    throw new Error(`${path} not found. Create one with: gradient init <color>`);
  }
  try {
    return parseConfig(JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error(`${path} is not valid JSON: ${error.message}`);
    throw error;
  }
}

type OutputStatus = "written" | "unchanged" | "stale" | "missing";

function buildCommand(values: {
  config?: string;
  verify?: boolean;
  json?: boolean;
  markdown?: boolean;
}): number {
  const configPath = resolve(values.config ?? "gradient.config.json");
  const config = readConfig(configPath);
  const base = dirname(configPath);
  const result = renderConfig(config);

  const outputs = result.outputs.map((o) => {
    const path = resolve(base, o.file);
    const current = existsSync(path) ? readFileSync(path, "utf8") : undefined;
    let status: OutputStatus;
    if (current === o.content) status = "unchanged";
    else if (values.verify) status = current === undefined ? "missing" : "stale";
    else {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, o.content);
      status = "written";
    }
    return { file: o.file, status };
  });
  const failedChecks = result.checks.filter((c) => !c.pass);
  const audits = (config.audit ?? []).map((file) => ({
    file,
    ...auditCss(readFileSync(resolve(base, file), "utf8")),
  }));
  const auditFailures = audits.reduce((n, r) => n + r.checks.filter((c) => !c.pass).length, 0);
  const outOfDate = outputs.filter((o) => o.status === "stale" || o.status === "missing");
  const ok = outOfDate.length === 0 && failedChecks.length === 0 && auditFailures === 0;

  if (values.json) {
    process.stdout.write(
      `${JSON.stringify({ ok, outputs, checks: { total: result.checks.length, failed: failedChecks }, audit: audits }, null, 2)}\n`,
    );
  } else if (values.markdown) {
    const lines = [
      "| File | Status |",
      "|---|---|",
      ...outputs.map((o) => `| \`${o.file}\` | ${o.status} |`),
      "",
      failedChecks.length === 0
        ? `Contrast promises: all ${result.checks.length} checks pass.`
        : `Contrast promises: ${failedChecks.length} of ${result.checks.length} checks fail.`,
    ];
    if (outOfDate.length > 0) {
      lines.push("", "Run `npx @sweberdev/gradient build` and commit the changed files.");
    }
    if (audits.length > 0) lines.push("", auditMarkdown(audits));
    process.stdout.write(`${lines.join("\n")}\n`);
  } else {
    for (const o of outputs) console.log(`${o.status.padEnd(9)} ${o.file}`);
    for (const c of failedChecks) {
      console.log(
        `fail ${c.scale} ${c.mode}: ${c.foreground} on ${c.background} = ${c.ratio}:1, needs ${c.required}:1`,
      );
    }
    console.log(
      `${result.checks.length - failedChecks.length}/${result.checks.length} contrast checks passed.`,
    );
    printAudit(audits);
    if (outOfDate.length > 0) {
      console.error("Files are out of date. Run `gradient build` and commit the result.");
    }
  }
  return ok ? 0 : 1;
}

function initCommand(
  colors: string[],
  values: { format?: string; out?: string; status?: boolean; config?: string },
): number {
  if (colors.length === 0) {
    console.error(
      "Usage: gradient init <color> [name=color ...] [--format <format>] [--out <file>]",
    );
    return 2;
  }
  const path = resolve(values.config ?? "gradient.config.json");
  if (existsSync(path)) {
    console.error(`${path} already exists.`);
    return 1;
  }
  const named: Record<string, string> = {};
  colors.forEach((arg, i) => {
    const eq = arg.indexOf("=");
    if (eq > 0 && !arg.startsWith("#")) named[arg.slice(0, eq)] = arg.slice(eq + 1);
    else named[i === 0 ? "brand" : `color${i + 1}`] = arg;
  });
  const config = parseConfig({
    colors: named,
    ...(values.status ? { palette: { status: true } } : {}),
    outputs: [{ file: values.out ?? "src/gradient.css", format: values.format ?? "tailwind" }],
  });
  renderConfig(config);
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
  console.error(`Wrote ${path}. Generate the files with: gradient build`);
  return 0;
}

function checkCommand(colors: string[], targetValue: string | undefined): number {
  const [foreground, background] = colors;
  if (!foreground || !background || colors.length > 2) {
    console.error("Usage: gradient check <foreground> <background> [--target <ratio>]");
    return 2;
  }
  const target = targetValue ? number(targetValue) : 4.5;
  const c = checkPair(foreground, background);
  const mark = (ok: boolean) => (ok ? "pass" : "fail");
  console.log(`${c.foreground} on ${c.background}`);
  console.log(`WCAG 2   ${c.ratio}:1`);
  console.log(`  text        AA ${mark(c.aa)}   AAA ${mark(c.aaa)}`);
  console.log(`  large text  AA ${mark(c.aaLarge)}   AAA ${mark(c.aaaLarge)}`);
  console.log(`  icons, UI   ${mark(c.aaLarge)} (3:1)`);
  console.log(`APCA     Lc ${c.apca} (WCAG 3 draft, for information)`);
  if (c.ratio >= target) return 0;
  const fixed = fixContrast(foreground, background, target);
  console.log(
    fixed
      ? `Needs ${target}:1. Closest color that passes: ${fixed} (${checkPair(fixed, background).ratio}:1, same hue).`
      : `Needs ${target}:1. No color of this hue reaches it on ${c.background}.`,
  );
  return 1;
}

function number(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`Not a number: "${value}".`);
  return n;
}
