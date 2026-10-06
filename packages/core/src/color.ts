/** A color in OKLCH: lightness 0–1, chroma 0–~0.4, hue in degrees. */
export interface Oklch {
  l: number;
  c: number;
  h: number;
}

/** Linear-light sRGB, each channel 0–1 when in gamut. */
export type LinearRgb = [number, number, number];

export const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const toGamma = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/** OKLab matrices by Björn Ottosson (https://bottosson.github.io/posts/oklab/). */
export function linearToOklch([r, g, b]: LinearRgb): Oklch {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.sqrt(A * A + B * B);
  // Hue of a grey is undefined; 0 keeps the output stable.
  const h = c < 1e-4 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

export function oklchToLinear({ l: L, c, h }: Oklch): LinearRgb {
  const rad = (h * Math.PI) / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const EPSILON = 1e-6;

/** Whether the color can be shown on an sRGB screen without clipping. */
export function inGamut(color: Oklch): boolean {
  return oklchToLinear(color).every((v) => v >= -EPSILON && v <= 1 + EPSILON);
}

/** Largest chroma at this lightness and hue that still fits sRGB. */
export function maxChroma(l: number, h: number): number {
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ l, c: mid, h })) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Brings a color into sRGB by lowering chroma at constant lightness and hue,
 * so the perceived brightness the scale relies on never moves.
 */
export function toGamut(color: Oklch): Oklch {
  if (inGamut(color)) return color;
  return { ...color, c: maxChroma(color.l, color.h) };
}

/** Relative luminance as defined by WCAG 2. */
export function luminanceOf(color: Oklch): number {
  const [r, g, b] = oklchToLinear(toGamut(color)).map((v) => Math.min(1, Math.max(0, v))) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const clamp8 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);

/** Six-digit hex of the color, gamut mapped first. */
export function toHex(color: Oklch): string {
  const rgb = oklchToLinear(toGamut(color)).map((v) => clamp8(toGamma(v)));
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Any supported color (hex, `rgb()`, `hsl()`, `oklch()`) as the six-digit hex
 * it is displayed as. Out-of-gamut colors are mapped first, so measurements
 * of the result match what people see.
 */
export function asHex(input: string): string {
  return /^#[0-9a-f]{6}$/i.test(input) ? input : toHex(parseColor(input));
}

/** Converts a hex color to OKLCH. */
export function fromHex(hex: string): Oklch {
  const rgb = hexToRgb(hex);
  if (!rgb) throw new Error(`Invalid hex color "${hex}".`);
  return fromRgb255(rgb);
}

function fromRgb255(rgb: [number, number, number]): Oklch {
  return linearToOklch(rgb.map((v) => toLinear(v / 255)) as LinearRgb);
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex.trim());
  if (!m?.[1]) return null;
  let digits = m[1];
  if (digits.length <= 4) digits = [...digits].map((d) => d + d).join("");
  return [0, 2, 4].map((i) => Number.parseInt(digits.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function hslToRgb255(h: number, s: number, l: number): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
  };
  return [f(0), f(8), f(4)];
}

const NUMBER = String.raw`(-?\d*\.?\d+)(%|deg)?`;
const FN = new RegExp(
  String.raw`^(rgba?|hsla?|oklch)\(\s*${NUMBER}[\s,]+${NUMBER}[\s,]+${NUMBER}(?:\s*[/,]\s*[\d.]+%?)?\s*\)$`,
  "i",
);

/**
 * Parses a CSS color: hex (`#e30613`, `#f00`), `rgb()`, `hsl()` or `oklch()`.
 * Alpha is ignored, a scale is always opaque.
 */
export function parseColor(input: string): Oklch {
  const value = input.trim();
  const rgb = hexToRgb(value);
  if (rgb) return fromRgb255(rgb);
  const m = FN.exec(value);
  if (!m) throw new Error(`Unsupported color "${input}". Use hex, rgb(), hsl() or oklch().`);
  const fn = (m[1] ?? "").toLowerCase();
  const n = (i: number) => Number(m[i * 2]);
  const unit = (i: number) => m[i * 2 + 1];
  if (fn.startsWith("rgb")) {
    const ch = (i: number) => (unit(i) === "%" ? (n(i) / 100) * 255 : n(i));
    return fromRgb255([ch(1), ch(2), ch(3)]);
  }
  if (fn.startsWith("hsl")) {
    return fromRgb255(hslToRgb255(n(1), n(2) / 100, n(3) / 100));
  }
  const l = unit(1) === "%" ? n(1) / 100 : n(1);
  const c = unit(2) === "%" ? (n(2) / 100) * 0.4 : n(2);
  return { l, c, h: ((n(3) % 360) + 360) % 360 };
}

const round = (v: number, digits: number) => Number(v.toFixed(digits));

/** CSS `oklch()` string, e.g. `oklch(62.8% 0.2577 29.23)`. */
export function formatOklch(color: Oklch): string {
  return `oklch(${oklchChannels(color)})`;
}

/** The three channels without the function, e.g. `62.8% 0.2577 29.23`, for `oklch(var(--x) / a)`. */
export function oklchChannels({ l, c, h }: Oklch): string {
  return `${round(l * 100, 2)}% ${round(c, 4)} ${round(c < 1e-4 ? 0 : h, 2)}`;
}
