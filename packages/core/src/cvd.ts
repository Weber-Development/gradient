import { asHex, fromHex, type LinearRgb, linearToOklch, toHex, toLinear } from "./color";
import type { Palette } from "./palette";
import type { Mode, Step } from "./scale";

export type Deficiency = "protanopia" | "deuteranopia" | "tritanopia";

export const DEFICIENCIES: Deficiency[] = ["protanopia", "deuteranopia", "tritanopia"];

/** Machado, Oliveira and Fernandes (2009), severity 1, applied to linear sRGB. */
const MATRICES: Record<Deficiency, number[][]> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

function hexToLinear(hex: string): LinearRgb {
  const v = Number.parseInt(asHex(hex).slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => toLinear(c / 255)) as LinearRgb;
}

/** How a color (hex, `rgb()`, `hsl()` or `oklch()`) looks to someone with a color vision deficiency, as hex. */
export function simulate(color: string, deficiency: Deficiency): string {
  const rgb = hexToLinear(color);
  const m = MATRICES[deficiency];
  const out = m.map((row) =>
    Math.min(
      1,
      Math.max(0, (row[0] ?? 0) * rgb[0] + (row[1] ?? 0) * rgb[1] + (row[2] ?? 0) * rgb[2]),
    ),
  ) as LinearRgb;
  return toHex(linearToOklch(out));
}

/** Perceptual distance (ΔE in OKLab) between two colors. 0.02 is barely visible. */
export function deltaE(a: string, b: string): number {
  const lab = (hex: string) => {
    const { l, c, h } = fromHex(asHex(hex));
    const rad = (h * Math.PI) / 180;
    return [l, c * Math.cos(rad), c * Math.sin(rad)];
  };
  const [l1 = 0, a1 = 0, b1 = 0] = lab(a);
  const [l2 = 0, a2 = 0, b2 = 0] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

export interface DistinguishCheck {
  a: string;
  b: string;
  mode: Mode;
  /** `normal` or a deficiency. */
  vision: "normal" | Deficiency;
  distance: number;
  pass: boolean;
}

export interface DistinguishOptions {
  /** Step that is compared. Default 600, the step used for text and solid buttons. */
  step?: Step;
  /** Smallest ΔE in OKLab that counts as distinguishable. Default 0.08. */
  minDistance?: number;
}

/**
 * Compares every pair of colored scales (all except `neutral`) at one step,
 * with normal vision and simulated protanopia, deuteranopia and tritanopia.
 * Steps share their luminance by design, so pairs like `success` and
 * `danger` can look alike: there, add an icon or a label next to the color.
 */
export function checkDistinguishable(
  palette: Palette,
  options: DistinguishOptions = {},
): DistinguishCheck[] {
  const step = options.step ?? 600;
  const min = options.minDistance ?? 0.08;
  const scales = palette.scales.filter((s) => s.name !== "neutral");
  const checks: DistinguishCheck[] = [];
  for (let i = 0; i < scales.length; i++) {
    for (let j = i + 1; j < scales.length; j++) {
      const a = scales[i];
      const b = scales[j];
      if (!a || !b) continue;
      for (const mode of ["light", "dark"] as const) {
        const ha = a[mode][step].hex;
        const hb = b[mode][step].hex;
        for (const vision of ["normal", ...DEFICIENCIES] as const) {
          const distance =
            vision === "normal"
              ? deltaE(ha, hb)
              : deltaE(simulate(ha, vision), simulate(hb, vision));
          checks.push({
            a: a.name,
            b: b.name,
            mode,
            vision,
            distance: Math.round(distance * 1000) / 1000,
            pass: distance >= min,
          });
        }
      }
    }
  }
  return checks;
}
