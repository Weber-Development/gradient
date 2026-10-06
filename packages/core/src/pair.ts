import { apca } from "./apca";
import { type Oklch, parseColor, toGamut, toHex } from "./color";
import { contrast } from "./contrast";

export interface PairCheck {
  foreground: string;
  background: string;
  /** WCAG 2 contrast ratio, rounded to two decimals. */
  ratio: number;
  /** Body text, 4.5:1. */
  aa: boolean;
  /** Large text (24px, or 18.66px bold), and AA for icons and borders, 3:1. */
  aaLarge: boolean;
  /** Body text, 7:1. */
  aaa: boolean;
  /** Large text, 4.5:1. */
  aaaLarge: boolean;
  /** APCA Lc (WCAG 3 draft), for information. */
  apca: number;
}

/**
 * Checks any two colors, not only palette steps: WCAG 2 levels for normal
 * and large text plus the APCA value.
 *
 * ```ts
 * checkPair("#ffffff", "#e30613") // { ratio: 4.88, aa: true, aaa: false, apca: -76.5, … }
 * ```
 */
export function checkPair(foreground: string, background: string): PairCheck {
  const fg = toHex(parseColor(foreground));
  const bg = toHex(parseColor(background));
  const value = contrast(fg, bg);
  return {
    foreground: fg,
    background: bg,
    ratio: Math.round(value * 100) / 100,
    aa: value >= 4.5,
    aaLarge: value >= 3,
    aaa: value >= 7,
    aaaLarge: value >= 4.5,
    apca: apca(fg, bg),
  };
}

/**
 * The color closest to `foreground` (same hue and chroma, only lightness
 * moved) that reaches `target` against `background`. Returns the input when
 * it already passes, and `null` when no lightness gets there.
 *
 * ```ts
 * fixContrast("#ff5a5f", "#ffffff") // "#db3742", 4.53:1 on white
 * ```
 */
export function fixContrast(foreground: string, background: string, target = 4.5): string | null {
  return fixContrastFor(foreground, [[background, target]]);
}

/**
 * Like `fixContrast`, for a color that has to reach a target on several
 * backgrounds at once: `fixContrastFor("#ca8a04", [["#ffffff", 4.5], ["#fffbeb", 4.5]])`.
 */
export function fixContrastFor(
  foreground: string,
  requirements: Array<[background: string, target: number]>,
): string | null {
  const parsed = parseColor(foreground);
  // Greys carry a tiny chroma after parsing; keep them grey.
  const fg = parsed.c < 1e-3 ? { ...parsed, c: 0 } : parsed;
  const reqs = requirements.map(([bg, target]) => [toHex(parseColor(bg)), target] as const);
  const passesAll = (hex: string) => reqs.every(([bg, target]) => contrast(hex, bg) >= target);
  if (passesAll(toHex(fg))) return toHex(fg);
  const candidates = [solve(fg, passesAll, 0), solve(fg, passesAll, 1)].filter(
    (c): c is Oklch => c !== null,
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => Math.abs(a.l - fg.l) - Math.abs(b.l - fg.l));
  return toHex(candidates[0] as Oklch);
}

/** Moves lightness from `fg.l` towards `end` (0 or 1) until `passes` holds. */
function solve(fg: Oklch, passes: (hex: string) => boolean, end: 0 | 1): Oklch | null {
  const at = (l: number) => toGamut({ ...fg, l });
  const ok = (l: number) => passes(toHex(at(l)));
  if (!ok(end)) return null;
  let lo = fg.l; // fails
  let hi: number = end; // passes
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid;
    else lo = mid;
  }
  // Hex rounding can cost a hair of contrast; step on until it holds.
  let l = hi;
  for (let i = 0; i < 50 && !ok(l); i++) l += end === 1 ? 0.001 : -0.001;
  return ok(l) ? at(l) : null;
}
