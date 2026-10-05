import { fromHex, luminanceOf } from "./color";

/** Relative luminance (WCAG 2) of a hex color. */
export function luminance(hex: string): number {
  return luminanceOf(fromHex(hex));
}

/** WCAG 2 contrast ratio between two hex colors, 1–21. */
export function contrast(a: string, b: string): number {
  return ratio(luminance(a), luminance(b));
}

export function ratio(y1: number, y2: number): number {
  const [hi, lo] = y1 > y2 ? [y1, y2] : [y2, y1];
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG 2 level a text color reaches on a background. */
export function wcagLevel(ratioValue: number, large = false): "AAA" | "AA" | "fail" {
  if (ratioValue >= (large ? 4.5 : 7)) return "AAA";
  if (ratioValue >= (large ? 3 : 4.5)) return "AA";
  return "fail";
}
