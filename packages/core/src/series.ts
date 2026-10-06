import { type Oklch, parseColor } from "./color";
import { DEFICIENCIES, deltaE, simulate } from "./cvd";
import { generateScale, type Step } from "./scale";

export interface SeriesOptions {
  /** Number of colors, 2 to 8. Default 6. */
  count?: number;
}

export interface Series {
  /** Hex colors for a light page, each at least 3:1 on white. */
  light: string[];
  /** Hex colors for a dark page, each at least 3:1 on black. */
  dark: string[];
  /**
   * Smallest ΔE in OKLab between any two colors, over normal vision and
   * simulated protanopia, deuteranopia and tritanopia, in both modes.
   * 0.08 and up is clearly distinguishable, below 0.04 is hard.
   */
  distance: number;
}

/** Lightness levels a color can take: steps 500 to 800, from 3.3:1 to 8.5:1 on the page. */
const LEVELS: Step[] = [500, 600, 700, 800];
const HUE_STEP = 15;

interface Candidate {
  light: string;
  dark: string;
}

/**
 * Colors for charts that stay apart under color vision deficiencies. The
 * first color is your brand hue; every next one is the candidate, out of all
 * hues in 15 degree steps at four lightness levels, whose closest neighbor
 * is farthest away, measured with normal vision and simulated protanopia,
 * deuteranopia and tritanopia in both modes. Every color reaches 3:1 on the
 * page, the minimum for graphical objects (WCAG 1.4.11).
 *
 * ```ts
 * const { light, dark, distance } = createSeries("#e30613", { count: 5 });
 * ```
 *
 * Color alone does not carry a chart: label lines and bars directly, or use
 * different markers, especially beyond five series.
 */
export function createSeries(brand: string, options: SeriesOptions = {}): Series {
  const count = options.count ?? 6;
  if (!Number.isInteger(count) || count < 2 || count > 8) {
    throw new Error("createSeries: count must be a whole number from 2 to 8.");
  }
  const base: Oklch = parseColor(brand);
  const chroma = Math.min(0.2, Math.max(0.12, base.c));

  const pool: Candidate[] = [];
  for (let h = 0; h < 360; h += HUE_STEP) {
    const scale = generateScale(`oklch(0.62 ${chroma.toFixed(4)} ${h}.0)`, { name: "series" });
    for (const level of LEVELS) {
      pool.push({ light: scale.light[level].hex, dark: scale.dark[level].hex });
    }
  }
  const first = generateScale(`oklch(0.62 ${chroma.toFixed(4)} ${base.h.toFixed(2)})`, {
    name: "series",
  });
  const chosen: Candidate[] = [{ light: first.light[600].hex, dark: first.dark[600].hex }];
  while (chosen.length < count) {
    let best: Candidate | null = null;
    let bestDistance = -1;
    for (const candidate of pool) {
      const distance = Math.min(...chosen.map((c) => apart(c, candidate)));
      if (distance > bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }
    chosen.push(best as Candidate);
  }
  const light = chosen.map((c) => c.light);
  const dark = chosen.map((c) => c.dark);
  const distance = Math.min(worst(light), worst(dark));
  return { light, dark, distance: Math.round(distance * 1000) / 1000 };
}

function apart(a: Candidate, b: Candidate): number {
  return Math.min(pair(a.light, b.light), pair(a.dark, b.dark));
}

function pair(a: string, b: string): number {
  let min = deltaE(a, b);
  for (const d of DEFICIENCIES) min = Math.min(min, deltaE(simulate(a, d), simulate(b, d)));
  return min;
}

function worst(colors: string[]): number {
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      min = Math.min(min, pair(colors[i] as string, colors[j] as string));
    }
  }
  return min;
}
