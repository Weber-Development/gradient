import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { auditCss } from "./audit";
import { checkDistinguishable } from "./cvd";
import { toScss, toTypeScript } from "./export/code";
import { block, type DarkMode, toCss } from "./export/css";
import { toShadcn } from "./export/shadcn";
import { toTailwind, toTailwindV3 } from "./export/tailwind";
import { toJson, toTokens } from "./export/tokens";
import { checkPair, fixContrast } from "./pair";
import { checkPalette, createPalette, type Palette } from "./palette";
import { STEPS } from "./scale";
import { createSeries } from "./series";

const HELP = `Usage:
  gradient <color> [name=color ...] [options]
  gradient check <foreground> <background> [--target <ratio>]
  gradient audit <file.css> [--json]
  gradient series <color> [--count <n>] [--format css|json|table]

Examples:
  gradient "#e30613"
  gradient "#e30613" accent=#0a84ff --format tailwind --out src/gradient.css
  gradient "oklch(62% 0.2 250)" --format tokens --out tokens.json
  gradient check "#ffffff" "#e30613"
  gradient "#e30613" --format shadcn --out app/globals.css
  gradient series "#e30613" --count 5
  gradient audit app/globals.css

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
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help || positionals.length === 0) {
    console.log(HELP);
    return values.help ? 0 : 2;
  }

  if (positionals[0] === "audit") return auditCommand(positionals.slice(1), values.json);
  if (positionals[0] === "series") return seriesCommand(positionals.slice(1), values);
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

interface RenderOptions {
  dark: DarkMode;
  darkSelector: string | undefined;
  hex: boolean | undefined;
  prefix: string | undefined;
}

function render(palette: Palette, format: string, o: RenderOptions): string {
  const darkOptions = { dark: o.dark, ...(o.darkSelector ? { darkSelector: o.darkSelector } : {}) };
  switch (format) {
    case "css":
      return toCss(palette, {
        ...darkOptions,
        format: o.hex ? "hex" : "oklch",
        ...(o.prefix ? { prefix: o.prefix } : {}),
      });
    case "tailwind":
      return toTailwind(palette, darkOptions);
    case "tailwind3": {
      const { css, colors } = toTailwindV3(palette, darkOptions);
      return `${css}\n/* tailwind.config.js → theme.extend.colors:\n${JSON.stringify(colors, null, 2)}\n*/\n`;
    }
    case "shadcn":
      return toShadcn(palette, { ...darkOptions, format: o.hex ? "hex" : "oklch" });
    case "scss":
      return toScss(palette, o.prefix ? { prefix: o.prefix } : {});
    case "ts":
      return toTypeScript(palette);
    case "tokens":
      return `${JSON.stringify(toTokens(palette), null, 2)}\n`;
    case "json":
      return `${JSON.stringify(toJson(palette), null, 2)}\n`;
    case "table":
      return table(palette);
    default:
      throw new Error(`Unknown --format "${format}".`);
  }
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
    const lines = (mode: "light" | "dark") =>
      series[mode].map((hex, i) => `--chart-${i + 1}: ${hex};`);
    const darkSelector = values["dark-selector"] ?? ".dark";
    output = `${[block(":root", lines("light")), block(`${darkSelector}`, lines("dark"))].join(
      "\n\n",
    )}\n`;
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

function auditCommand(files: string[], json: boolean | undefined): number {
  if (files.length === 0) {
    console.error("Usage: gradient audit <file.css> [...] [--json]");
    return 2;
  }
  let failures = 0;
  const reports = files.map((file) => ({ file, ...auditCss(readFileSync(file, "utf8")) }));
  if (json) {
    process.stdout.write(`${JSON.stringify(reports, null, 2)}\n`);
    return reports.some((r) => r.checks.some((c) => !c.pass)) ? 1 : 0;
  }
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
        failures += failed.length;
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
  return failures > 0 ? 1 : 0;
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

function table(palette: Palette): string {
  const lines: string[] = [];
  for (const scale of palette.scales) {
    lines.push(`${scale.name} (from ${scale.source}, closest step ${scale.anchor})`);
    lines.push("step   light    contrast   dark     contrast");
    for (const step of STEPS) {
      const l = scale.light[step];
      const d = scale.dark[step];
      lines.push(
        `${String(step).padEnd(6)} ${l.hex}  ${l.contrast.toFixed(2).padStart(5)}:1   ${d.hex}  ${d.contrast.toFixed(2).padStart(5)}:1`,
      );
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function number(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`Not a number: "${value}".`);
  return n;
}
