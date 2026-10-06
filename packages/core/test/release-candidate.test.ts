import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/config";
import { contrast, wcagLevel } from "../src/contrast";
import { extractColors } from "../src/extract";
import * as api from "../src/index";
import { createPalette } from "../src/palette";
import { render } from "../src/render";

const root = join(__dirname, "..");

describe("bundle size", () => {
  const bundle = async (entry: string) => {
    const result = await build({
      stdin: { contents: entry, resolveDir: join(root, "src"), loader: "ts" },
      bundle: true,
      minify: true,
      format: "esm",
      platform: "browser",
      treeShaking: true,
      write: false,
    });
    return gzipSync(result.outputFiles[0]?.text ?? "").length;
  };

  it("the whole library stays under 15 kB gzipped", async () => {
    const size = await bundle('export * from "./index"');
    expect(size).toBeLessThan(15 * 1024);
  });

  it("tree-shakes: one function pulls in only what it needs", async () => {
    const size = await bundle('export { contrast } from "./index"');
    expect(size).toBeLessThan(2 * 1024);
  });
});

describe("the library runs without Node.js", () => {
  it("only the command line imports node: modules", () => {
    const offenders = readdirSync(join(root, "src"), { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith(".ts"))
      .filter((f) => !["cli.ts", "bin.ts"].includes(f))
      .filter((f) =>
        /from "node:|require\("node:/.test(readFileSync(join(root, "src", f), "utf8")),
      );
    expect(offenders).toEqual([]);
  });
});

describe("documentation", () => {
  it("mentions every exported function in the API reference or a guide", () => {
    const docs = join(root, "../../docs");
    const text = readdirSync(docs, { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith(".md"))
      .map((f) => readFileSync(join(docs, f), "utf8"))
      .join("\n");
    const names = Object.entries(api)
      .filter(([, value]) => typeof value === "function" || Array.isArray(value))
      .map(([name]) => name);
    const missing = names.filter((name) => !new RegExp(`\\b${name}\\b`).test(text));
    expect(missing).toEqual([]);
  });
});

describe("small helpers", () => {
  it("wcagLevel names the level of a ratio", () => {
    expect(wcagLevel(7)).toBe("AAA");
    expect(wcagLevel(4.5)).toBe("AA");
    expect(wcagLevel(4.4)).toBe("fail");
    expect(wcagLevel(4.5, true)).toBe("AAA");
    expect(wcagLevel(3, true)).toBe("AA");
    expect(wcagLevel(2.9, true)).toBe("fail");
    expect(contrast("#000", "#fff")).toBeCloseTo(21, 5);
  });

  it("render handles tailwind3, prefixes and rejects unknown formats", () => {
    const palette = createPalette({ brand: "#e30613" });
    const opts = { dark: "both" as const, darkSelector: undefined, hex: true, prefix: "c" };
    expect(render(palette, "tailwind3", opts)).toContain("tailwind.config.js");
    expect(render(palette, "css", opts)).toContain("--c-brand-600: #");
    expect(render(palette, "scss", opts)).toContain("$c-brand-600");
    expect(render(palette, "shadcn", opts)).toContain("#");
    expect(() => render(palette, "nope", opts)).toThrow(/Unknown/);
  });

  it("parseConfig rejects wrong option types", () => {
    const base = { colors: { brand: "#e30613" } };
    const out = (o: object) => () =>
      parseConfig({ ...base, outputs: [{ file: "a", format: "css", ...o }] });
    expect(out({ prefix: 1 })).toThrow(/prefix/);
    expect(out({ hex: "yes" })).toThrow(/hex/);
    expect(out({ nope: 1 })).toThrow(/nope/);
    expect(() =>
      parseConfig({ ...base, outputs: [{ file: "a", format: "css" }], audit: [1] }),
    ).toThrow(/audit/);
    expect(() =>
      parseConfig({ ...base, outputs: [{ file: "a", format: "css" }], palette: 1 }),
    ).toThrow(/palette/);
    expect(() => parseConfig({ ...base, outputs: ["a"] })).toThrow(/outputs\[0\]/);
    expect(
      parseConfig({ ...base, outputs: [{ file: "a", format: "css" }], audit: ["x.css"] }).audit,
    ).toEqual(["x.css"]);
  });
});

describe("extractColors accuracy", () => {
  it("returns a flat color exactly, not the center of its bin", () => {
    expect(extractColors(new Uint8ClampedArray([255, 0, 0, 255]))[0]?.hex).toBe("#ff0000");
    expect(extractColors(new Uint8ClampedArray([227, 6, 19, 255, 227, 6, 19, 255]))[0]?.hex).toBe(
      "#e30613",
    );
  });

  it("samples large images", () => {
    const data = new Uint8ClampedArray(4 * 300_000);
    for (let i = 0; i < data.length; i += 4) data.set([10, 132, 255, 255], i);
    const out = extractColors(data, { count: 3 });
    expect(out).toEqual([{ hex: "#0a84ff", share: 1 }]);
  });
});
