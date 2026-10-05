import {
  formatOklch,
  fromHex,
  luminanceOf,
  maxChroma,
  type Oklch,
  parseColor,
  toHex,
} from "./color";
import { contrast, ratio } from "./contrast";

export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type Step = (typeof STEPS)[number];
export type Mode = "light" | "dark";

/**
 * Contrast of each step against the page background: white in light mode,
 * black in dark mode. Every generated color reaches at least this ratio, so a
 * step number says how it can be used:
 *
 * - 500 reaches 3:1 on white and on step 50 (borders, icons, focus rings)
 * - 600 reaches 4.5:1 on white and on step 50 (body text, WCAG AA)
 * - 700 reaches 4.5:1 on steps 50–200
 * - 800 reaches 7:1 on white and on step 50 (WCAG AAA)
 *
 * The same holds in dark mode against black and the dark step 50.
 */
export const CONTRAST_TARGETS: Record<Step, number> = {
  50: 1.06,
  100: 1.15,
  200: 1.32,
  300: 1.6,
  400: 2.3,
  500: 3.3,
  600: 4.9,
  700: 6.4,
  800: 8.5,
  900: 12,
  950: 15.5,
};

/** Share of the brand color's chroma per step, highest in the middle. */
const CHROMA_CURVE: Record<Step, number> = {
  50: 0.14,
  100: 0.28,
  200: 0.48,
  300: 0.72,
  400: 0.9,
  500: 1,
  600: 1,
  700: 0.92,
  800: 0.78,
  900: 0.62,
  950: 0.48,
};

export interface Swatch {
  hex: string;
  oklch: Oklch;
  /** `oklch()` string of `hex`. */
  css: string;
  /** Contrast against the page background of the mode (white or black). */
  contrast: number;
  /** Text color with the higher contrast on this swatch: white or the darkest step. */
  on: string;
}

export type ScaleSteps = Record<Step, Swatch>;

export interface Scale {
  name: string;
  /** Input color as hex. */
  source: string;
  /** Step that is closest to the input color in light mode. */
  anchor: Step;
  light: ScaleSteps;
  dark: ScaleSteps;
}

export interface ScaleOptions {
  /** Token name, e.g. `brand`. Default `brand`. */
  name?: string;
  /** Multiplies the chroma of all steps. Default 1. */
  saturation?: number;
  /** Fixed chroma for every step instead of following the input, e.g. 0.012 for a tinted grey. */
  chroma?: number;
  /** Degrees the hue turns from the lightest to the darkest step. Default 0. */
  hueShift?: number;
  /**
   * Put the exact input color on the anchor step. Its contrast then follows
   * the input, not the target of the step. Default false.
   */
  pin?: boolean;
}

const WHITE = 1;
const BLACK = 0;

function stepIndex(step: Step): number {
  return STEPS.indexOf(step);
}

/** Step whose contrast target on white is closest to the color. */
export function anchorStep(color: Oklch): Step {
  const c = ratio(luminanceOf(color), WHITE);
  let best: Step = 500;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const step of STEPS) {
    const d = Math.abs(Math.log(c) - Math.log(CONTRAST_TARGETS[step]));
    if (d < bestDistance) {
      best = step;
      bestDistance = d;
    }
  }
  return best;
}

/** Target luminance for a step: contrast to white (light) or black (dark). */
function targetLuminance(step: Step, mode: Mode): number {
  const t = CONTRAST_TARGETS[step];
  return mode === "light" ? (WHITE + 0.05) / t - 0.05 : t * (BLACK + 0.05) - 0.05;
}

function colorAt(l: number, h: number, desiredChroma: number): Oklch {
  return { l, h, c: Math.min(desiredChroma, maxChroma(l, h)) };
}

/** Finds the lightness at which a color of this hue and chroma has the target luminance. */
function solve(targetY: number, h: number, desiredChroma: number): Oklch {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    if (luminanceOf(colorAt(mid, h, desiredChroma)) < targetY) lo = mid;
    else hi = mid;
  }
  return colorAt((lo + hi) / 2, h, desiredChroma);
}

/** Rounds to hex and nudges lightness until the rounded color still meets the target. */
function settle(color: Oklch, step: Step, mode: Mode, desiredChroma: number): string {
  const background = mode === "light" ? "#ffffff" : "#000000";
  const direction = mode === "light" ? -1 : 1;
  let current = color;
  let hex = toHex(current);
  for (let i = 0; i < 50 && contrast(hex, background) < CONTRAST_TARGETS[step]; i++) {
    current = colorAt(current.l + direction * 0.002, current.h, desiredChroma);
    hex = toHex(current);
  }
  return hex;
}

function swatch(hex: string, background: string, darkest: string): Swatch {
  const oklch = fromHex(hex);
  const onWhite = contrast(hex, "#ffffff");
  const onDarkest = contrast(hex, darkest);
  return {
    hex,
    oklch,
    css: formatOklch(oklch),
    contrast: contrast(hex, background),
    on: onWhite >= onDarkest ? "#ffffff" : darkest,
  };
}

function buildMode(base: Oklch, anchor: Step, mode: Mode, options: ScaleOptions): ScaleSteps {
  const saturation = options.saturation ?? 1;
  const hueShift = options.hueShift ?? 0;
  const hexes = {} as Record<Step, string>;
  for (const step of STEPS) {
    const ratioToAnchor = Math.min(CHROMA_CURVE[step] / CHROMA_CURVE[anchor], 2.5);
    const desired = (options.chroma ?? base.c * ratioToAnchor) * saturation;
    // Darker steps sit at higher indices in both modes, light 950 and dark 50 are the deepest.
    const position = stepIndex(step) / (STEPS.length - 1);
    const depth = mode === "light" ? position : 1 - position;
    const h = (base.h + hueShift * (depth - 0.5) + 360) % 360;
    const solved = solve(targetLuminance(step, mode), h, desired);
    hexes[step] = settle(solved, step, mode, desired);
  }
  const background = mode === "light" ? "#ffffff" : "#000000";
  const darkest = mode === "light" ? hexes[950] : hexes[50];
  const steps = {} as ScaleSteps;
  for (const step of STEPS) steps[step] = swatch(hexes[step], background, darkest);
  return steps;
}

/** Generates an 11-step light and dark scale from one color. */
export function generateScale(color: string, options: ScaleOptions = {}): Scale {
  const base = parseColor(color);
  const source = toHex(base);
  const anchor = anchorStep(base);
  const light = buildMode(base, anchor, "light", options);
  const dark = buildMode(base, anchor, "dark", options);
  if (options.pin) {
    light[anchor] = swatch(source, "#ffffff", light[950].hex);
  }
  return { name: options.name ?? "brand", source, anchor, light, dark };
}

/** A tinted grey that matches the hue of the color. */
export function generateNeutral(color: string, options: ScaleOptions = {}): Scale {
  const base = parseColor(color);
  const chroma = options.chroma ?? Math.min(0.014, base.c * 0.12);
  return generateScale(color, { name: "neutral", ...options, chroma, pin: false });
}

/** Steps of one mode as `[step, swatch]` pairs, lightest first in light mode. */
export function stepsOf(scale: Scale, mode: Mode): Array<[Step, Swatch]> {
  return STEPS.map((step) => [step, scale[mode][step]]);
}
