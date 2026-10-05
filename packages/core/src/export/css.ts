import { fromHex, oklchChannels } from "../color";
import type { Palette } from "../palette";
import { type Mode, STEPS } from "../scale";

export type ColorFormat = "oklch" | "hex" | "channels";
export type DarkMode = "media" | "class" | "both" | "light-dark" | "none";

export interface CssOptions {
  /** Variable prefix: `color` gives `--color-brand-500`. Default `color`. */
  prefix?: string;
  /**
   * `oklch` (default), `hex`, or `channels` (`62.8% 0.2577 29.23`, for
   * `oklch(var(--x) / <alpha>)` as in Tailwind v3).
   */
  format?: ColorFormat;
  /**
   * How dark mode switches: `media` (system setting), `class` (a class on
   * `<html>`), `both` (system setting unless a class overrides it),
   * `light-dark` (one `light-dark()` value per variable, switched by
   * `color-scheme`; the classes set `color-scheme`) or `none`. Default `both`.
   */
  dark?: DarkMode;
  /** Class that turns dark mode on. Default `.dark`. */
  darkSelector?: string;
  /** Class that forces light mode when `dark` is `both`. Default `.light`. */
  lightSelector?: string;
  /** Selector for the light values. Default `:root`. */
  root?: string;
}

/** CSS custom property declarations of one mode, one per line. */
export function declarations(palette: Palette, mode: Mode, options: CssOptions = {}): string[] {
  const prefix = options.prefix ?? "color";
  const format = options.format ?? "oklch";
  const lines: string[] = [];
  for (const scale of palette.scales) {
    for (const step of STEPS) {
      const swatch = scale[mode][step];
      const value =
        format === "hex"
          ? swatch.hex
          : format === "channels"
            ? oklchChannels(swatch.oklch)
            : swatch.css;
      lines.push(`--${prefix}-${scale.name}-${step}: ${value};`);
    }
    for (const step of STEPS) {
      const on = scale[mode][step].on;
      lines.push(`--${prefix}-${scale.name}-on-${step}: ${formatHex(on, format)};`);
    }
  }
  return lines;
}

function formatHex(hex: string, format: ColorFormat): string {
  if (format === "hex") return hex;
  // Text colors are white or a scale step; reuse the same notation as the steps.
  return format === "channels" ? channelsOfHex(hex) : `oklch(${channelsOfHex(hex)})`;
}

function channelsOfHex(hex: string): string {
  return oklchChannels(fromHex(hex));
}

export function block(selector: string, lines: string[], indent = ""): string {
  return `${indent}${selector} {\n${lines.map((l) => `${indent}  ${l}`).join("\n")}\n${indent}}`;
}

/** Wraps dark declarations in the selectors that `dark` asks for. */
export function darkBlocks(lines: string[], options: CssOptions = {}): string[] {
  const dark = options.dark ?? "both";
  const darkSelector = options.darkSelector ?? ".dark";
  const lightSelector = options.lightSelector ?? ".light";
  const root = options.root ?? ":root";
  const out: string[] = [];
  if (dark === "media" || dark === "both") {
    const selector = dark === "both" ? `${root}:not(${lightSelector})` : root;
    out.push(`@media (prefers-color-scheme: dark) {\n${block(selector, lines, "  ")}\n}`);
  }
  if (dark === "class" || dark === "both") {
    out.push(block(`${root}${darkSelector}, ${darkSelector}`, lines));
  }
  return out;
}

/**
 * Merges light and dark declarations into `light-dark()` values. Needs real
 * colors, so the `channels` format is not supported.
 */
export function lightDarkDeclarations(light: string[], dark: string[]): string[] {
  return light.map((line, i) => {
    const [name, value] = splitDeclaration(line);
    const [, darkValue] = splitDeclaration(dark[i] ?? line);
    return value === darkValue ? line : `${name}: light-dark(${value}, ${darkValue});`;
  });
}

function splitDeclaration(line: string): [string, string] {
  const colon = line.indexOf(":");
  return [
    line.slice(0, colon),
    line
      .slice(colon + 1)
      .trim()
      .replace(/;$/, ""),
  ];
}

/** `color-scheme` rules that let the classes switch `light-dark()` values. */
export function schemeBlocks(options: CssOptions = {}): string[] {
  const root = options.root ?? ":root";
  const darkSelector = options.darkSelector ?? ".dark";
  const lightSelector = options.lightSelector ?? ".light";
  return [
    block(`${root}${lightSelector}, ${lightSelector}`, ["color-scheme: light;"]),
    block(`${root}${darkSelector}, ${darkSelector}`, ["color-scheme: dark;"]),
  ];
}

/**
 * Complete stylesheet with custom properties for light mode and dark mode.
 *
 * ```css
 * :root { --color-brand-500: oklch(…); --color-brand-on-500: oklch(…); }
 * @media (prefers-color-scheme: dark) { :root:not(.light) { … } }
 * :root.dark, .dark { … }
 * ```
 */
export function toCss(palette: Palette, options: CssOptions = {}): string {
  const root = options.root ?? ":root";
  if (options.dark === "light-dark") {
    if (options.format === "channels") {
      throw new Error('dark: "light-dark" needs colors, use format "oklch" or "hex".');
    }
    const lines = lightDarkDeclarations(
      declarations(palette, "light", options),
      declarations(palette, "dark", options),
    );
    const parts = [block(root, ["color-scheme: light dark;", ...lines]), ...schemeBlocks(options)];
    return `${HEADER}\n${parts.join("\n\n")}\n`;
  }
  const parts = [block(root, declarations(palette, "light", options))];
  parts.push(...darkBlocks(declarations(palette, "dark", options), options));
  return `${HEADER}\n${parts.join("\n\n")}\n`;
}

export const HEADER = "/* Generated by @sweberdev/gradient. */";
