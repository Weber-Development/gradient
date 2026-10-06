import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli";
import { contrast } from "../src/contrast";
import { shadcnTokens, toShadcn } from "../src/export/shadcn";
import { createPalette } from "../src/palette";
import { createSeries } from "../src/series";

const BRANDS = ["#e30613", "#0a84ff", "#ffd60a", "#00a86b", "#7c3aed", "#334155"];

describe("shadcnTokens", () => {
  it.each(BRANDS)("keeps the contrast promises for %s in both modes", (brand) => {
    const tokens = shadcnTokens(createPalette({ brand }));
    for (const mode of ["light", "dark"] as const) {
      const t = tokens[mode];
      const c = (fg: string, bg: string) => contrast(t[fg] as string, t[bg] as string);
      const page = mode === "light" ? "#ffffff" : "#000000";
      expect(c("foreground", "background")).toBeGreaterThanOrEqual(7);
      expect(c("card-foreground", "card")).toBeGreaterThanOrEqual(7);
      expect(c("popover-foreground", "popover")).toBeGreaterThanOrEqual(7);
      expect(c("primary-foreground", "primary")).toBeGreaterThanOrEqual(4.5);
      expect(c("secondary-foreground", "secondary")).toBeGreaterThanOrEqual(4.5);
      expect(c("accent-foreground", "accent")).toBeGreaterThanOrEqual(4.5);
      expect(c("muted-foreground", "muted")).toBeGreaterThanOrEqual(4.5);
      expect(c("muted-foreground", "background")).toBeGreaterThanOrEqual(4.5);
      expect(c("destructive-foreground", "destructive")).toBeGreaterThanOrEqual(4.5);
      expect(c("input", "background")).toBeGreaterThanOrEqual(3);
      expect(c("ring", "background")).toBeGreaterThanOrEqual(3);
      for (let i = 1; i <= 5; i++) {
        expect(contrast(t[`chart-${i}`] as string, page)).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("uses the palette's own danger scale when there is one", () => {
    const custom = createPalette({ brand: "#0a84ff" }, { status: { danger: "#d4351c" } });
    const plain = createPalette({ brand: "#0a84ff" });
    expect(shadcnTokens(custom).light.destructive).not.toBe(shadcnTokens(plain).light.destructive);
  });
});

describe("toShadcn", () => {
  const palette = createPalette({ brand: "#e30613" });

  it("writes variables, a .dark block and the Tailwind theme mapping", () => {
    const css = toShadcn(palette);
    expect(css).toContain(":root {\n  --background: oklch(");
    expect(css).toContain(".dark {");
    expect(css).toContain("@theme inline {");
    expect(css).toContain("--color-primary-foreground: var(--primary-foreground);");
    expect(css).not.toContain("prefers-color-scheme");
  });

  it("supports hex, media, light-dark and no theme block", () => {
    expect(toShadcn(palette, { format: "hex" })).toMatch(/--primary: #[0-9a-f]{6};/);
    expect(toShadcn(palette, { dark: "media" })).toContain("prefers-color-scheme: dark");
    const ld = toShadcn(palette, { dark: "light-dark" });
    expect(ld).toContain("color-scheme: light dark;");
    expect(ld).toMatch(/--primary: light-dark\(oklch\(/);
    expect(toShadcn(palette, { theme: false })).not.toContain("@theme");
  });
});

describe("createSeries", () => {
  it("returns the requested number of colors, readable on the page", () => {
    for (const count of [2, 5, 8]) {
      const s = createSeries("#e30613", { count });
      expect(s.light).toHaveLength(count);
      expect(s.dark).toHaveLength(count);
      for (const hex of s.light) expect(contrast(hex, "#ffffff")).toBeGreaterThanOrEqual(3);
      for (const hex of s.dark) expect(contrast(hex, "#000000")).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps up to six colors apart under color vision deficiencies", () => {
    for (const brand of BRANDS) {
      expect(createSeries(brand, { count: 6 }).distance).toBeGreaterThanOrEqual(0.08);
    }
  });

  it("starts at the brand hue and is deterministic", () => {
    const a = createSeries("#0a84ff", { count: 4 });
    expect(createSeries("#0a84ff", { count: 4 })).toEqual(a);
    expect(new Set(a.light).size).toBe(4);
  });

  it("rejects counts outside 2 to 8", () => {
    expect(() => createSeries("#e30613", { count: 1 })).toThrow(/2 to 8/);
    expect(() => createSeries("#e30613", { count: 9 })).toThrow(/2 to 8/);
    expect(() => createSeries("#e30613", { count: 2.5 })).toThrow(/2 to 8/);
  });
});

describe("cli", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes the shadcn theme with a .dark class by default", async () => {
    const out: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((m) => {
      out.push(String(m));
      return true;
    });
    expect(await main(["#e30613", "--format", "shadcn"])).toBe(0);
    const css = out.join("");
    expect(css).toContain("--chart-5:");
    expect(css).not.toContain("prefers-color-scheme");
  });

  it("prints chart colors as css, json and table", async () => {
    const out: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((m) => {
      out.push(String(m));
      return true;
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await main(["series", "#e30613", "--count", "3"])).toBe(0);
    expect(out.join("")).toMatch(/--chart-3: #[0-9a-f]{6};/);
    out.length = 0;
    expect(await main(["series", "#e30613", "--format", "json"])).toBe(0);
    expect(JSON.parse(out.join("")).light).toHaveLength(6);
    out.length = 0;
    expect(await main(["series", "#e30613", "--format", "table"])).toBe(0);
    expect(out.join("")).toContain("Worst distance");
    expect(await main(["series"])).toBe(2);
  });
});
