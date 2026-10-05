import type { Palette } from "../palette";
import { STEPS } from "../scale";
import { block, type CssOptions, darkBlocks, declarations, HEADER } from "./css";

export type TailwindOptions = Omit<CssOptions, "prefix" | "format" | "root">;

/**
 * Tailwind CSS v4 stylesheet: the light values as `@theme` variables, dark
 * mode as overrides of the same variables. Utilities such as `bg-brand-500`
 * or `text-brand-on-600` then switch with the mode on their own, no `dark:`
 * variant needed.
 *
 * ```css
 * @import "tailwindcss";
 * @import "./gradient.css";
 * ```
 */
export function toTailwind(palette: Palette, options: TailwindOptions = {}): string {
  const light = declarations(palette, "light", { prefix: "color" });
  const dark = declarations(palette, "dark", { prefix: "color" });
  const parts = [block("@theme", light), ...darkBlocks(dark, options)];
  return `${HEADER}\n${parts.join("\n\n")}\n`;
}

export interface TailwindV3Output {
  /** Put this in your global CSS, e.g. after `@tailwind base`. */
  css: string;
  /** Put this under `theme.extend.colors` in `tailwind.config.js`. */
  colors: Record<string, Record<string, string>>;
}

/**
 * Tailwind CSS v3: CSS variables holding the OKLCH channels, plus a colors
 * object that supports opacity modifiers like `bg-brand-500/50`.
 */
export function toTailwindV3(palette: Palette, options: TailwindOptions = {}): TailwindV3Output {
  const cssOptions: CssOptions = { ...options, prefix: "color", format: "channels" };
  const light = declarations(palette, "light", cssOptions);
  const dark = declarations(palette, "dark", cssOptions);
  const css = `${HEADER}\n${[block(":root", light), ...darkBlocks(dark, cssOptions)].join("\n\n")}\n`;
  const colors: TailwindV3Output["colors"] = {};
  for (const scale of palette.scales) {
    const group: Record<string, string> = {};
    for (const step of STEPS) {
      group[step] = `oklch(var(--color-${scale.name}-${step}) / <alpha-value>)`;
    }
    for (const step of STEPS) {
      group[`on-${step}`] = `oklch(var(--color-${scale.name}-on-${step}) / <alpha-value>)`;
    }
    colors[scale.name] = group;
  }
  return { css, colors };
}
