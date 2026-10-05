import { describe, expect, it } from "vitest";
import {
  checkDistinguishable,
  checkPalette,
  createPalette,
  deltaE,
  simulate,
  toCss,
  toTailwind,
  toTailwindV3,
} from "../src";

describe("status colors", () => {
  it("adds four status scales that keep every contrast promise", () => {
    const palette = createPalette({ brand: "#0a84ff" }, { status: true });
    expect(palette.scales.map((s) => s.name)).toEqual([
      "brand",
      "success",
      "warning",
      "danger",
      "info",
      "neutral",
    ]);
    expect(checkPalette(palette).filter((c) => !c.pass)).toEqual([]);
  });

  it("uses the expected hues", () => {
    const palette = createPalette({ brand: "#7c3aed" }, { status: true, neutral: false });
    const hue = (name: string) =>
      palette.scales.find((s) => s.name === name)?.light[600].oklch.h ?? 0;
    expect(Math.abs(hue("success") - 150)).toBeLessThan(8);
    expect(Math.abs(hue("danger") - 27)).toBeLessThan(8);
    expect(Math.abs(hue("info") - 245)).toBeLessThan(8);
  });

  it("lets own colors win over derived ones", () => {
    const palette = createPalette(
      { brand: "#0a84ff", danger: "#d4351c" },
      { status: { warning: "#ffdd00" }, neutral: false },
    );
    expect(palette.scales.filter((s) => s.name === "danger")).toHaveLength(1);
    expect(palette.scales.find((s) => s.name === "danger")?.source).toBe("#d4351c");
    expect(palette.scales.find((s) => s.name === "warning")?.source).toBe("#ffdd00");
  });
});

describe("color vision deficiency", () => {
  it("keeps greys unchanged", () => {
    for (const d of ["protanopia", "deuteranopia", "tritanopia"] as const) {
      expect(deltaE(simulate("#808080", d), "#808080")).toBeLessThan(0.01);
    }
  });

  it("makes red and green hard to tell apart for deuteranopia", () => {
    expect(deltaE("#d62728", "#2ca02c")).toBeGreaterThan(0.2);
    expect(
      deltaE(simulate("#d62728", "deuteranopia"), simulate("#2ca02c", "deuteranopia")),
    ).toBeLessThan(deltaE("#d62728", "#2ca02c") / 2);
  });

  it("flags success and danger as alike for deuteranopia but not for normal vision", () => {
    const palette = createPalette({ brand: "#0a84ff" }, { status: true });
    const pair = checkDistinguishable(palette).filter(
      (c) => c.a === "success" && c.b === "danger" && c.mode === "light",
    );
    expect(pair.find((c) => c.vision === "normal")?.pass).toBe(true);
    expect(pair.find((c) => c.vision === "deuteranopia")?.pass).toBe(false);
  });
});

describe("light-dark()", () => {
  const palette = createPalette({ brand: "#e30613" }, { neutral: false });

  it("writes one light-dark() value per variable", () => {
    const css = toCss(palette, { dark: "light-dark", format: "hex" });
    const light = palette.scales[0]?.light[500].hex;
    const dark = palette.scales[0]?.dark[500].hex;
    expect(css).toContain(`--color-brand-500: light-dark(${light}, ${dark});`);
    expect(css).toContain("color-scheme: light dark;");
    expect(css).toContain(":root.dark, .dark {\n  color-scheme: dark;\n}");
    expect(css).not.toContain("@media");
  });

  it("works in Tailwind v4 and is refused where it cannot work", () => {
    expect(toTailwind(palette, { dark: "light-dark" })).toMatch(
      /--color-brand-50: light-dark\(oklch/,
    );
    expect(() => toCss(palette, { dark: "light-dark", format: "channels" })).toThrow();
    expect(() => toTailwindV3(palette, { dark: "light-dark" })).toThrow();
  });
});
