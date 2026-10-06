import { type Oklch, parseColor, toGamut, toHex } from "./color";
import { contrast } from "./contrast";

export interface BlendOptions {
  /** Number of color stops, 2 to 64. Default 9. */
  steps?: number;
  /** CSS angle in degrees, used for the `css` strings. Default 90 (left to right). */
  angle?: number;
  /**
   * Which way the hue turns between two colors: `shorter` (default) takes
   * the short way round the color wheel, `longer` the long way, which gives
   * rainbow-like gradients.
   */
  hue?: "shorter" | "longer";
}

export interface Blend {
  /** Hex colors, evenly spaced. The first and last are your colors (gamut mapped). */
  stops: string[];
  /** `linear-gradient()` with all stops, works in every browser. */
  css: string;
  /** `linear-gradient(in oklch, …)` with only your colors: the browser does the blending. */
  native: string;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Hue of a color without chroma is undefined; it takes the hue of its partner. */
const POWERLESS = 0.02;

/**
 * A gradient between two or more colors, blended in OKLCH. Blending in sRGB,
 * the CSS default, passes through a muddy grey between complementary colors
 * such as blue and yellow; blending lightness, chroma and hue keeps the
 * colors lively and the lightness even.
 *
 * ```ts
 * const { stops, css } = createBlend(["#e30613", "#0a84ff"], { steps: 7 });
 * ```
 */
export function createBlend(colors: string[], options: BlendOptions = {}): Blend {
  if (colors.length < 2) throw new Error("createBlend needs at least two colors.");
  const steps = options.steps ?? 9;
  if (!Number.isInteger(steps) || steps < 2 || steps > 64) {
    throw new Error("createBlend: steps must be a whole number from 2 to 64.");
  }
  const angle = options.angle ?? 90;
  const longer = options.hue === "longer";
  const parsed = colors.map((c) => parseColor(c));

  const stops: string[] = [];
  for (let i = 0; i < steps; i++) {
    const position = (i / (steps - 1)) * (parsed.length - 1);
    const index = Math.min(parsed.length - 2, Math.floor(position));
    const t = position - index;
    stops.push(toHex(mix(parsed[index] as Oklch, parsed[index + 1] as Oklch, t, longer)));
  }
  const ends = colors.map((c) => toHex(parseColor(c)));
  return {
    stops,
    css: `linear-gradient(${angle}deg, ${stops.join(", ")})`,
    native: `linear-gradient(${angle}deg in oklch, ${ends.join(", ")})`,
  };
}

function mix(a: Oklch, b: Oklch, t: number, longer: boolean): Oklch {
  let ha = a.h;
  let hb = b.h;
  if (a.c < POWERLESS && b.c >= POWERLESS) ha = hb;
  else if (b.c < POWERLESS && a.c >= POWERLESS) hb = ha;
  let delta = hb - ha;
  if (!longer) {
    if (delta > 180) delta -= 360;
    else if (delta < -180) delta += 360;
  } else if (Math.abs(delta) < 180) {
    delta = delta > 0 ? delta - 360 : delta + 360;
  }
  return toGamut({
    l: a.l + (b.l - a.l) * t,
    c: clamp(a.c + (b.c - a.c) * t, 0, 0.4),
    h: (((ha + delta * t) % 360) + 360) % 360,
  });
}

export interface BlendContrast {
  /** Lowest contrast ratio of the text color on any stop. */
  min: number;
  /** Highest contrast ratio. */
  max: number;
  /** Whether every stop reaches `required`. */
  pass: boolean;
  required: number;
}

/**
 * Contrast of a text color over the whole gradient. Text has to pass on the
 * worst stop, not on the middle one. `required` defaults to 4.5 (body text).
 *
 * ```ts
 * contrastOnBlend(createBlend(["#e30613", "#0a84ff"]), "#ffffff") // { min: 4.2, pass: false, … }
 * ```
 */
export function contrastOnBlend(blend: Blend, text: string, required = 4.5): BlendContrast {
  const t = toHex(parseColor(text));
  const ratios = blend.stops.map((stop) => contrast(t, stop));
  const min = Math.min(...ratios);
  return {
    min: Math.round(min * 100) / 100,
    max: Math.round(Math.max(...ratios) * 100) / 100,
    pass: min >= required,
    required,
  };
}
