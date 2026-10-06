import { afterEach, describe, expect, it, vi } from "vitest";
import { apca } from "../src/apca";
import { main } from "../src/cli";
import { contrast } from "../src/contrast";
import { toScss, toTypeScript } from "../src/export/code";
import { checkPair, fixContrast } from "../src/pair";
import { createPalette } from "../src/palette";

describe("apca", () => {
  it("matches the reference values of APCA 0.0.98G", () => {
    expect(apca("#000000", "#ffffff")).toBeCloseTo(106.0, 0);
    expect(apca("#ffffff", "#000000")).toBeCloseTo(-107.9, 0);
    expect(apca("#888888", "#ffffff")).toBeCloseTo(63.1, 0);
    expect(apca("#777777", "#777777")).toBe(0);
  });
});

describe("checkPair", () => {
  it("reports WCAG levels and APCA for any two colors", () => {
    const c = checkPair("#ffffff", "#e30613");
    expect(c.ratio).toBe(4.88);
    expect(c).toMatchObject({ aa: true, aaLarge: true, aaa: false, aaaLarge: true });
    expect(c.apca).toBeLessThan(0);
    expect(checkPair("oklch(0% 0 0)", "rgb(255 255 255)").ratio).toBe(21);
  });
});

describe("fixContrast", () => {
  it("returns the input when it already passes", () => {
    expect(fixContrast("#000000", "#ffffff")).toBe("#000000");
  });

  it("moves only lightness until the target holds", () => {
    for (const [fg, bg, target] of [
      ["#ff5a5f", "#ffffff", 4.5],
      ["#ffd60a", "#ffffff", 7],
      ["#3b82f6", "#111827", 4.5],
      ["#777777", "#888888", 4.5],
    ] as const) {
      const fixed = fixContrast(fg, bg, target);
      expect(fixed).not.toBeNull();
      expect(contrast(fixed as string, bg)).toBeGreaterThanOrEqual(target);
      // Close to the target, not simply black or white.
      expect(contrast(fixed as string, bg)).toBeLessThan(target * 1.1);
    }
  });

  it("returns null when no lightness reaches the target", () => {
    expect(fixContrast("#e30613", "#767676", 7)).toBeNull();
  });
});

describe("scss and typescript export", () => {
  const palette = createPalette({ brand: "#e30613" }, { neutral: false });

  it("writes light, dark and text color variables", () => {
    const scss = toScss(palette);
    expect(scss).toContain(`$brand-600: ${palette.scales[0]?.light[600].hex};`);
    expect(scss).toContain(`$brand-600-dark: ${palette.scales[0]?.dark[600].hex};`);
    expect(scss).toContain("$brand-on-600:");
    expect(toScss(palette, { prefix: "color" })).toContain("$color-brand-50:");
  });

  it("writes a typed module", () => {
    const ts = toTypeScript(palette);
    expect(ts).toContain("export const colors = {");
    expect(ts).toContain("} as const;");
    expect(ts).toContain(`"600": "${palette.scales[0]?.light[600].hex}"`);
    expect(ts).toContain("export type ColorStep");
  });
});

describe("cli check", () => {
  afterEach(() => vi.restoreAllMocks());

  it("passes a good pair and suggests a fix for a bad one", async () => {
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((m: string) => lines.push(m));
    expect(await main(["check", "#ffffff", "#e30613"])).toBe(0);
    expect(lines).toContain("WCAG 2   4.88:1");
    lines.length = 0;
    expect(await main(["check", "#ff5a5f", "#ffffff"])).toBe(1);
    expect(lines.at(-1)).toMatch(/Closest color that passes: #[0-9a-f]{6}/);
    expect(await main(["check", "#ffffff", "#e30613", "--target", "7"])).toBe(1);
  });

  it("exits 2 without two colors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await main(["check", "#ffffff"])).toBe(2);
  });
});
