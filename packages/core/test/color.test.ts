import { describe, expect, it } from "vitest";
import { contrast, fromHex, inGamut, parseColor, toGamut, toHex } from "../src";

describe("color", () => {
  it("round-trips hex through OKLCH", () => {
    for (const hex of ["#000000", "#ffffff", "#e30613", "#0a84ff", "#ffd60a", "#7f7f7f"]) {
      expect(toHex(fromHex(hex))).toBe(hex);
    }
  });

  it("matches reference OKLCH values", () => {
    const red = fromHex("#ff0000");
    expect(red.l).toBeCloseTo(0.628, 3);
    expect(red.c).toBeCloseTo(0.2577, 3);
    expect(red.h).toBeCloseTo(29.23, 1);
  });

  it("parses CSS color notations", () => {
    const expected = "#e30613";
    expect(toHex(parseColor("#E30613"))).toBe(expected);
    expect(toHex(parseColor("rgb(227, 6, 19)"))).toBe(expected);
    expect(toHex(parseColor("rgb(227 6 19 / 50%)"))).toBe(expected);
    expect(toHex(parseColor("#f00"))).toBe("#ff0000");
    expect(toHex(parseColor("hsl(0 100% 50%)"))).toBe("#ff0000");
    expect(toHex(parseColor("oklch(62.8% 0.2577 29.23)"))).toBe("#ff0000");
    expect(() => parseColor("red")).toThrow(/Unsupported color/);
  });

  it("maps out-of-gamut colors by lowering chroma only", () => {
    const wide = { l: 0.7, c: 0.37, h: 145 };
    expect(inGamut(wide)).toBe(false);
    const mapped = toGamut(wide);
    expect(inGamut(mapped)).toBe(true);
    expect(mapped.l).toBe(wide.l);
    expect(mapped.h).toBe(wide.h);
    expect(mapped.c).toBeLessThan(wide.c);
  });

  it("computes WCAG contrast", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });
});
