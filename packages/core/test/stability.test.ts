import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createBlend } from "../src/blend";
import { renderConfig } from "../src/config";
import { toScss, toTypeScript } from "../src/export/code";
import { toCss } from "../src/export/css";
import { toShadcn } from "../src/export/shadcn";
import { toTailwind, toTailwindV3 } from "../src/export/tailwind";
import { toJson, toTokens } from "../src/export/tokens";
import * as api from "../src/index";
import { createPalette } from "../src/palette";
import { table } from "../src/render";
import { createSeries } from "../src/series";

// These tests are the stability promise of 1.0. A failing snapshot means the
// public API or the generated colors changed. Update a snapshot (vitest -u)
// only on purpose, and say so in the changeset.

const snap = (name: string) => join(__dirname, "__snapshots__", name);

describe("public API", () => {
  it("exports exactly the documented names", async () => {
    await expect(Object.keys(api).sort().join("\n")).toMatchFileSnapshot(snap("api.txt"));
  });
});

const PALETTES = {
  red: { colors: { brand: "#e30613", accent: "#0a84ff" }, options: { status: true } },
  yellow: { colors: { brand: "#facc15" }, options: {} },
  indigo: { colors: { brand: "#6366f1" }, options: { pin: true, neutral: 0.02 } },
} as const;

describe("generated output stays the same", () => {
  for (const [name, { colors, options }] of Object.entries(PALETTES)) {
    const palette = createPalette(colors, options);
    const outputs: Record<string, string> = {
      "css.css": toCss(palette),
      "css-hex-class.css": toCss(palette, { format: "hex", prefix: "c", dark: "class" }),
      "css-light-dark.css": toCss(palette, { dark: "light-dark" }),
      "tailwind.css": toTailwind(palette),
      "tailwind3.json": JSON.stringify(toTailwindV3(palette), null, 2),
      "scss.scss": toScss(palette),
      "colors.ts": toTypeScript(palette),
      "shadcn.css": toShadcn(palette),
      "shadcn-hex.css": toShadcn(palette, { format: "hex", dark: "media" }),
      "tokens.json": JSON.stringify(toTokens(palette), null, 2),
      "plain.json": JSON.stringify(toJson(palette), null, 2),
      "table.txt": table(palette),
    };
    for (const [file, content] of Object.entries(outputs)) {
      it(`${name}: ${file}`, async () => {
        await expect(content).toMatchFileSnapshot(snap(`exports/${name}/${file}`));
      });
    }
  }

  it("chart series and blends", async () => {
    const series = JSON.stringify(
      [3, 6, 8].map((count) => createSeries("#e30613", { count })),
      null,
      2,
    );
    await expect(series).toMatchFileSnapshot(snap("exports/series.json"));
    const blends = JSON.stringify(
      [
        createBlend(["#0000ff", "#ffff00"]),
        createBlend(["#e30613", "#ffffff", "#0a84ff"], { steps: 7, angle: 45 }),
        createBlend(["#ff0000", "#0000ff"], { hue: "longer", steps: 5 }),
      ],
      null,
      2,
    );
    await expect(blends).toMatchFileSnapshot(snap("exports/blends.json"));
  });

  it("config build", async () => {
    const result = renderConfig({
      colors: { brand: "#e30613" },
      outputs: [
        { file: "a.css", format: "shadcn" },
        { file: "b.css", format: "series", count: 5 },
      ],
    });
    await expect(JSON.stringify(result.outputs, null, 2)).toMatchFileSnapshot(
      snap("exports/config.json"),
    );
  });
});

describe("colors are accepted in every format everywhere", () => {
  it("measures rgb(), hsl() and oklch() like the hex they display as", () => {
    const hex = "#1481b8";
    for (const input of ["rgb(20 129 184)", "hsl(200 80% 40%)", hex]) {
      expect(api.contrast(input, "#ffffff")).toBeCloseTo(api.contrast(hex, "#ffffff"), 0);
      expect(api.simulate(input, "deuteranopia")).toMatch(/^#[0-9a-f]{6}$/);
      expect(api.deltaE(input, hex)).toBeLessThan(0.02);
    }
    expect(api.contrast("oklch(62% 0.2 250)", "#fff")).toBeGreaterThan(1);
    expect(api.luminance("rgb(0 0 0)")).toBe(0);
  });
});

describe("promises", () => {
  it("are exported and non-empty", () => {
    expect(api.PROMISES.length).toBeGreaterThanOrEqual(7);
  });
});
