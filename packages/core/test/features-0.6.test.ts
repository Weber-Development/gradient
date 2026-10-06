import { afterEach, describe, expect, it, vi } from "vitest";
import { contrastOnBlend, createBlend } from "../src/blend";
import { main } from "../src/cli";
import { extractColors, pickBrand } from "../src/extract";

const channels = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));

describe("createBlend", () => {
  it("starts and ends on the given colors", () => {
    const { stops } = createBlend(["#e30613", "#0a84ff"], { steps: 5 });
    expect(stops).toHaveLength(5);
    expect(stops[0]).toBe("#e30613");
    expect(stops[4]).toBe("#0a84ff");
  });

  it("keeps blue to yellow lively where sRGB goes grey", () => {
    const { stops } = createBlend(["#0000ff", "#ffff00"], { steps: 9 });
    const [r = 0, g = 0, b = 0] = channels(stops[4] as string);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeGreaterThan(40);
  });

  it("is piecewise for three colors", () => {
    const three = createBlend(["#ff0000", "#00ff00", "#0000ff"], { steps: 5 });
    expect(three.stops[2]).toBe(createBlend(["#00ff00", "#00ff00"], { steps: 2 }).stops[0]);
  });

  it("writes css strings", () => {
    const b = createBlend(["#e30613", "#0a84ff"], { steps: 3, angle: 45 });
    expect(b.css).toMatch(/^linear-gradient\(45deg, #[0-9a-f]{6}, #[0-9a-f]{6}, #[0-9a-f]{6}\)$/);
    expect(b.native).toBe("linear-gradient(45deg in oklch, #e30613, #0a84ff)");
  });

  it("goes the long way round on request", () => {
    const short = createBlend(["#ff0000", "#0000ff"], { steps: 5 }).stops[2];
    const long = createBlend(["#ff0000", "#0000ff"], { steps: 5, hue: "longer" }).stops[2];
    expect(short).not.toBe(long);
  });

  it("rejects bad input", () => {
    expect(() => createBlend(["#fff"])).toThrow();
    expect(() => createBlend(["#fff", "#000"], { steps: 1 })).toThrow();
    expect(() => createBlend(["#fff", "#000"], { steps: 65 })).toThrow();
  });
});

describe("contrastOnBlend", () => {
  it("reports the worst stop", () => {
    const r = contrastOnBlend(createBlend(["#000000", "#ffffff"], { steps: 9 }), "#ffffff");
    expect(r.min).toBeCloseTo(1, 1);
    expect(r.pass).toBe(false);
    expect(r.max).toBeGreaterThan(20);
    const ok = contrastOnBlend(createBlend(["#000033", "#003366"]), "#ffffff");
    expect(ok.pass).toBe(true);
  });
});

function pixels(parts: Array<[number, number, number, number, number]>) {
  const total = parts.reduce((n, p) => n + p[4], 0);
  const data = new Uint8ClampedArray(total * 4);
  let o = 0;
  for (const [r, g, b, a, n] of parts) {
    for (let i = 0; i < n; i++) data.set([r, g, b, a], o++ * 4);
  }
  return data;
}

describe("extractColors", () => {
  const img = pixels([
    [227, 6, 19, 255, 600],
    [10, 132, 255, 255, 300],
    [255, 255, 255, 255, 100],
  ]);

  it("finds the dominant colors with their share", () => {
    const out = extractColors(img, { count: 3 });
    expect(out).toHaveLength(3);
    expect(out[0]?.share).toBeCloseTo(0.6, 1);
    expect(out[0]?.hex.startsWith("#e")).toBe(true);
    expect(out.reduce((n, c) => n + c.share, 0)).toBeCloseTo(1, 2);
  });

  it("is deterministic", () => {
    expect(extractColors(img)).toEqual(extractColors(img));
  });

  it("ignores transparent pixels", () => {
    const out = extractColors(
      pixels([
        [255, 0, 0, 255, 10],
        [0, 255, 0, 0, 1000],
      ]),
      { count: 2 },
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.share).toBe(1);
  });

  it("rejects bad input", () => {
    expect(() => extractColors([1, 2, 3])).toThrow();
    expect(() => extractColors(img, { count: 0 })).toThrow();
    expect(() => extractColors(img, { count: 13 })).toThrow();
  });
});

describe("pickBrand", () => {
  it("prefers the colorful color over white and black", () => {
    const out = extractColors(
      pixels([
        [255, 255, 255, 255, 700],
        [0, 0, 0, 255, 100],
        [227, 6, 19, 255, 200],
      ]),
      { count: 3 },
    );
    expect(pickBrand(out)?.startsWith("#e")).toBe(true);
  });

  it("returns null when everything is grey", () => {
    expect(pickBrand(extractColors(pixels([[128, 128, 128, 255, 50]])))).toBeNull();
  });
});

describe("cli blend", () => {
  afterEach(() => vi.restoreAllMocks());

  it("prints css and exits 0, usage exits 2", async () => {
    const out: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((m: string | Uint8Array) => {
      out.push(String(m));
      return true;
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await main(["blend", "#e30613", "#0a84ff", "--steps", "3"])).toBe(0);
    expect(out.join("")).toContain("linear-gradient(90deg,");
    expect(await main(["blend", "#e30613"])).toBe(2);
  });
});
