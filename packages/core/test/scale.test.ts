import { describe, expect, it } from "vitest";
import {
  CONTRAST_TARGETS,
  checkPalette,
  contrast,
  createPalette,
  generateScale,
  STEPS,
} from "../src";

const SAMPLES = [
  "#e30613",
  "#0a84ff",
  "#ffd60a",
  "#00a86b",
  "#7c3aed",
  "#ff6b00",
  "#00bcd4",
  "#ec4899",
  "#808080",
  "#000000",
  "#ffffff",
  "#1e293b",
];

describe("generateScale", () => {
  it.each(SAMPLES)("meets every contrast target for %s", (color) => {
    const scale = generateScale(color);
    for (const step of STEPS) {
      expect(contrast(scale.light[step].hex, "#ffffff")).toBeGreaterThanOrEqual(
        CONTRAST_TARGETS[step],
      );
      expect(contrast(scale.dark[step].hex, "#000000")).toBeGreaterThanOrEqual(
        CONTRAST_TARGETS[step],
      );
      // Close to the target, not far above it.
      expect(scale.light[step].contrast).toBeLessThan(CONTRAST_TARGETS[step] * 1.03);
      expect(scale.dark[step].contrast).toBeLessThan(CONTRAST_TARGETS[step] * 1.03);
    }
  });

  it.each(SAMPLES)("keeps every promised pair for %s", (color) => {
    const failed = checkPalette(createPalette({ brand: color })).filter((c) => !c.pass);
    expect(failed).toEqual([]);
  });

  it("keeps the promised pairs across scales", () => {
    const scales = SAMPLES.map((c) => generateScale(c));
    const pairs: Array<[number, number, number]> = [
      [500, 50, 3],
      [600, 50, 4.5],
      [700, 200, 4.5],
      [800, 50, 7],
    ];
    for (const a of scales) {
      for (const b of scales) {
        for (const mode of ["light", "dark"] as const) {
          for (const [fg, bg, required] of pairs) {
            const ratio = contrast(a[mode][fg as 500].hex, b[mode][bg as 50].hex);
            expect(ratio).toBeGreaterThanOrEqual(required);
          }
        }
      }
    }
  });

  it("gets darker step by step in light mode and lighter in dark mode", () => {
    const scale = generateScale("#0a84ff");
    for (let i = 1; i < STEPS.length; i++) {
      const prev = STEPS[i - 1] as (typeof STEPS)[number];
      const step = STEPS[i] as (typeof STEPS)[number];
      expect(scale.light[step].oklch.l).toBeLessThan(scale.light[prev].oklch.l);
      expect(scale.dark[step].oklch.l).toBeGreaterThan(scale.dark[prev].oklch.l);
    }
  });

  it("keeps the hue of the input", () => {
    const scale = generateScale("#0a84ff");
    const hue = scale.light[scale.anchor].oklch.h;
    expect(Math.abs(hue - 255)).toBeLessThan(6);
  });

  it("finds the closest step and can pin the exact color", () => {
    const scale = generateScale("#e30613");
    expect(scale.anchor).toBe(600);
    expect(scale.light[600].hex).not.toBe("#e30613");
    expect(generateScale("#e30613", { pin: true }).light[600].hex).toBe("#e30613");
  });

  it("is deterministic", () => {
    expect(generateScale("#7c3aed")).toEqual(generateScale("#7c3aed"));
  });

  it("chooses a readable text color for every step", () => {
    const scale = generateScale("#e30613");
    for (const mode of ["light", "dark"] as const) {
      for (const step of [600, 700, 800, 900, 950] as const) {
        const s = scale[mode][step];
        expect(contrast(s.on, s.hex)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("createPalette", () => {
  it("adds a low-chroma neutral by default", () => {
    const palette = createPalette({ brand: "#e30613", accent: "#0a84ff" });
    expect(palette.scales.map((s) => s.name)).toEqual(["brand", "accent", "neutral"]);
    const neutral = palette.scales[2];
    for (const step of STEPS) expect(neutral?.light[step].oklch.c).toBeLessThan(0.02);
  });

  it("can skip the neutral or make it pure grey", () => {
    expect(createPalette({ brand: "#e30613" }, { neutral: false }).scales).toHaveLength(1);
    const grey = createPalette({ brand: "#e30613" }, { neutral: 0 }).scales[1];
    expect(grey?.light[500].oklch.c).toBeLessThan(0.002);
  });

  it("rejects invalid names", () => {
    expect(() => createPalette({ Brand: "#e30613" })).toThrow(/Invalid color name/);
  });
});
