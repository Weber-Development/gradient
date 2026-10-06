import type { LinearRgb } from "./color";
import { fromHex, linearToOklch, type Oklch, toHex, toLinear } from "./color";

export interface ExtractedColor {
  hex: string;
  /** Share of the counted pixels, 0 to 1. The shares add up to 1. */
  share: number;
}

export interface ExtractOptions {
  /** Number of colors, 1 to 12. Default 5. */
  count?: number;
}

const MAX_PIXELS = 40_000;
const BITS = 4;
const SHIFT = 8 - BITS;

type Lab = [number, number, number];

const toLab = ({ l, c, h }: Oklch): Lab => {
  const rad = (h * Math.PI) / 180;
  return [l, c * Math.cos(rad), c * Math.sin(rad)];
};

const dist2 = (a: Lab, b: Lab) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/**
 * The dominant colors of an image, from its RGBA pixels, for example
 * `ctx.getImageData(0, 0, w, h).data` from a canvas, or the raw output of an
 * image library. Pixels are grouped by color, then clustered by perceptual
 * distance (k-means in OKLab), so a photo gives its main colors, not 5
 * shades of the same sky. Transparent pixels are ignored. The result is
 * sorted by share and deterministic. No dependencies; decoding the image
 * file is up to you.
 *
 * ```ts
 * const colors = extractColors(imageData.data, { count: 5 }); // [{ hex: "#d4312b", share: 0.41 }, …]
 * ```
 */
export function extractColors(
  pixels: ArrayLike<number>,
  options: ExtractOptions = {},
): ExtractedColor[] {
  const count = options.count ?? 5;
  if (!Number.isInteger(count) || count < 1 || count > 12) {
    throw new Error("extractColors: count must be a whole number from 1 to 12.");
  }
  if (pixels.length % 4 !== 0) {
    throw new Error("extractColors: expected RGBA pixels, the length must be a multiple of 4.");
  }
  const total = pixels.length / 4;
  const stride = Math.max(1, Math.floor(total / MAX_PIXELS));

  // Histogram over 4 bits per channel.
  // Each bin keeps the sum of its real pixels, so a flat color comes out exact.
  const bins = new Map<number, { count: number; r: number; g: number; b: number }>();
  let counted = 0;
  for (let p = 0; p < total; p += stride) {
    const i = p * 4;
    if ((pixels[i + 3] as number) < 128) continue;
    const key =
      (((pixels[i] as number) >> SHIFT) << (BITS * 2)) |
      (((pixels[i + 1] as number) >> SHIFT) << BITS) |
      ((pixels[i + 2] as number) >> SHIFT);
    const bin = bins.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bin.count++;
    bin.r += pixels[i] as number;
    bin.g += pixels[i + 1] as number;
    bin.b += pixels[i + 2] as number;
    bins.set(key, bin);
    counted++;
  }
  if (counted === 0) return [];

  const points = [...bins.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0] - b[0])
    .map(([, bin]) => {
      const rgb = [bin.r, bin.g, bin.b].map((sum) => toLinear(sum / bin.count / 255)) as LinearRgb;
      return { lab: toLab(linearToOklch(rgb)), weight: bin.count };
    });

  const k = Math.min(count, points.length);
  // Weighted farthest-point start: the most common color, then the point
  // that is far from the centers and still common.
  const centers: Lab[] = [(points[0] as (typeof points)[number]).lab];
  while (centers.length < k) {
    let best = points[0] as (typeof points)[number];
    let bestScore = -1;
    for (const point of points) {
      const score = Math.min(...centers.map((c) => dist2(c, point.lab))) * Math.sqrt(point.weight);
      if (score > bestScore) {
        best = point;
        bestScore = score;
      }
    }
    centers.push(best.lab);
  }

  let assignment: number[] = [];
  for (let iteration = 0; iteration < 12; iteration++) {
    assignment = points.map((point) => {
      let nearest = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      centers.forEach((c, index) => {
        const d = dist2(c, point.lab);
        if (d < nearestDistance) {
          nearest = index;
          nearestDistance = d;
        }
      });
      return nearest;
    });
    let moved = false;
    for (let index = 0; index < k; index++) {
      let weight = 0;
      const sum: Lab = [0, 0, 0];
      points.forEach((point, i) => {
        if (assignment[i] !== index) return;
        weight += point.weight;
        for (let axis = 0; axis < 3; axis++) {
          sum[axis] = (sum[axis] as number) + (point.lab[axis] as number) * point.weight;
        }
      });
      if (weight === 0) continue;
      const next = sum.map((v) => v / weight) as Lab;
      if (dist2(next, centers[index] as Lab) > 1e-8) moved = true;
      centers[index] = next;
    }
    if (!moved) break;
  }

  const shares = new Array<number>(k).fill(0);
  points.forEach((point, i) => {
    shares[assignment[i] as number] = (shares[assignment[i] as number] as number) + point.weight;
  });
  return centers
    .map((lab, index) => ({ hex: labToHex(lab), share: (shares[index] as number) / counted }))
    .filter((c) => c.share > 0)
    .sort((a, b) => b.share - a.share || a.hex.localeCompare(b.hex))
    .map((c) => ({ hex: c.hex, share: Math.round(c.share * 1000) / 1000 }));
}

function labToHex([l, a, b]: Lab): string {
  const c = Math.hypot(a, b);
  const h = c < 1e-4 ? 0 : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return toHex({ l, c, h });
}

/**
 * The color most likely to be the brand: of the extracted colors, the one
 * with the highest share times chroma, ignoring near-greys, white and black.
 * Returns `null` for images without any colorful pixel.
 */
export function pickBrand(colors: ExtractedColor[]): string | null {
  let best: string | null = null;
  let bestScore = 0;
  for (const { hex, share } of colors) {
    const { l, c } = fromHex(hex);
    if (c < 0.05 || l > 0.97 || l < 0.08) continue;
    const score = share * c;
    if (score > bestScore) {
      best = hex;
      bestScore = score;
    }
  }
  return best;
}
