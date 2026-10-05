import { type Oklch, parseColor } from "./color";

export type StatusName = "success" | "warning" | "danger" | "info";

/** Hues of the status colors in OKLCH: green, amber, red, blue. */
export const STATUS_HUES: Record<StatusName, number> = {
  success: 150,
  warning: 75,
  danger: 27,
  info: 245,
};

export const STATUS_NAMES = Object.keys(STATUS_HUES) as StatusName[];

/**
 * Status colors that match a brand color: the usual hues, with the chroma of
 * the brand kept in a range where green still reads as green and red as red.
 * Returns `oklch()` strings to feed into `generateScale`.
 */
export function statusColors(brand: string): Record<StatusName, string> {
  const base: Oklch = parseColor(brand);
  const chroma = Math.min(0.2, Math.max(0.12, base.c));
  const out = {} as Record<StatusName, string>;
  for (const name of STATUS_NAMES) {
    out[name] = `oklch(0.62 ${chroma.toFixed(4)} ${STATUS_HUES[name]})`;
  }
  return out;
}
