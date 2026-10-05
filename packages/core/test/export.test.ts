import { describe, expect, it } from "vitest";
import { createPalette, toCss, toJson, toTailwind, toTailwindV3, toTokens } from "../src";

const palette = createPalette({ brand: "#e30613" }, { neutral: false });

describe("exports", () => {
  it("writes CSS with light values and both dark mode switches", () => {
    const css = toCss(palette);
    expect(css).toMatch(/^:root \{$/m);
    expect(css).toMatch(/--color-brand-500: oklch\([\d.]+% [\d.]+ [\d.]+\);/);
    expect(css).toMatch(/--color-brand-on-600: oklch\(100% 0 0\);/);
    expect(css).toContain("@media (prefers-color-scheme: dark) {\n  :root:not(.light) {");
    expect(css).toContain(":root.dark, .dark {");
    expect(css.match(/--color-brand-500:/g)).toHaveLength(3);
  });

  it("supports hex, a prefix and media-only dark mode", () => {
    const css = toCss(palette, { format: "hex", prefix: "c", dark: "media" });
    expect(css).toContain(`--c-brand-500: ${palette.scales[0]?.light[500].hex};`);
    expect(css).not.toContain(".dark");
    expect(css).toContain("@media (prefers-color-scheme: dark) {\n  :root {");
  });

  it("writes a Tailwind v4 theme", () => {
    const css = toTailwind(palette, { dark: "class" });
    expect(css).toMatch(/^@theme \{$/m);
    expect(css).toContain("--color-brand-950:");
    expect(css).toContain(":root.dark, .dark {");
    expect(css).not.toContain("@media");
  });

  it("writes a Tailwind v3 config with alpha support", () => {
    const { css, colors } = toTailwindV3(palette);
    expect(colors.brand?.["500"]).toBe("oklch(var(--color-brand-500) / <alpha-value>)");
    expect(colors.brand?.["on-500"]).toBe("oklch(var(--color-brand-on-500) / <alpha-value>)");
    expect(css).toMatch(/--color-brand-500: [\d.]+% [\d.]+ [\d.]+;/);
  });

  it("writes design tokens and plain JSON", () => {
    const tokens = toTokens(palette);
    expect(tokens.light?.brand?.["500"]).toEqual({
      $type: "color",
      $value: palette.scales[0]?.light[500].hex,
    });
    expect(tokens.dark?.brand?.["on-950"]?.$type).toBe("color");
    expect(toJson(palette).brand?.dark?.["50"]).toBe(palette.scales[0]?.dark[50].hex);
  });
});
