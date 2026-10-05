import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { checkDistinguishable } from "./cvd";
import { type DarkMode, toCss } from "./export/css";
import { toTailwind, toTailwindV3 } from "./export/tailwind";
import { toJson, toTokens } from "./export/tokens";
import { checkPalette, createPalette, type Palette } from "./palette";
import { STEPS } from "./scale";

const HELP = `Usage:
  gradient <color> [name=color ...] [options]

Examples:
  gradient "#e30613"
  gradient "#e30613" accent=#0a84ff --format tailwind --out src/gradient.css
  gradient "oklch(62% 0.2 250)" --format tokens --out tokens.json

Options:
  --name <name>          Name of the first color (default: brand)
  --format <format>      css (default) | tailwind | tailwind3 | tokens | json | table
  --dark <mode>          both (default) | media | class | light-dark | none
  --dark-selector <sel>  Class that turns dark mode on (default: .dark)
  --hex                  css format: hex values instead of oklch()
  --prefix <prefix>      css format: variable prefix (default: color)
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
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help || positionals.length === 0) {
    console.log(HELP);
    return values.help ? 0 : 2;
  }

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

  const dark = (values.dark ?? "both") as DarkMode;
  if (!["both", "media", "class", "light-dark", "none"].includes(dark)) {
    throw new Error(`Unknown --dark "${dark}".`);
  }
  const darkSelector = values["dark-selector"];
  const output = render(palette, values.format ?? "css", {
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
