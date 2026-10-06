import { toScss, toTypeScript } from "./export/code";
import { block, type DarkMode, toCss } from "./export/css";
import { toShadcn } from "./export/shadcn";
import { toTailwind, toTailwindV3 } from "./export/tailwind";
import { toJson, toTokens } from "./export/tokens";
import type { Palette } from "./palette";
import { STEPS } from "./scale";
import { createSeries } from "./series";

export interface RenderOptions {
  dark: DarkMode;
  darkSelector: string | undefined;
  hex: boolean | undefined;
  prefix: string | undefined;
}

export function render(palette: Palette, format: string, o: RenderOptions): string {
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

export function table(palette: Palette): string {
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

/** CSS custom properties `--chart-1` … for the chart colors of a brand color. */
export function seriesCss(brand: string, count: number | undefined, darkSelector = ".dark") {
  const series = createSeries(brand, count ? { count } : {});
  const lines = (mode: "light" | "dark") =>
    series[mode].map((hex, i) => `--chart-${i + 1}: ${hex};`);
  return {
    series,
    css: `${[block(":root", lines("light")), block(darkSelector, lines("dark"))].join("\n\n")}\n`,
  };
}
