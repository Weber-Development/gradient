import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { auditCss } from "../src/audit";
import { main } from "../src/cli";
import { contrast } from "../src/contrast";
import { toCss } from "../src/export/css";
import { toTailwind } from "../src/export/tailwind";
import { checkPalette, createPalette } from "../src/palette";

describe("auditCss", () => {
  it("passes what Gradient generates, in every export", () => {
    const palette = createPalette({ brand: "#e30613", accent: "#0a84ff" }, { status: true });
    for (const css of [
      toCss(palette),
      toCss(palette, { format: "hex", prefix: "c", dark: "class" }),
      toCss(palette, { dark: "light-dark" }),
      toTailwind(palette),
    ]) {
      const result = auditCss(css);
      const prefix = css.includes("--c-brand-") ? "c-" : "";
      expect(result.scales).toEqual(
        expect.arrayContaining(
          ["brand", "accent", "success", "danger", "neutral"].map((n) => `${prefix}${n}`),
        ),
      );
      expect(result.checks.length).toBeGreaterThan(100);
      expect(result.checks.filter((c) => !c.pass)).toEqual([]);
      expect(result.skipped).toEqual([]);
    }
  });

  it("suggests one color that fixes every pair of the step", () => {
    const css = ":root { --color-yellow-600: #ca8a04; --color-yellow-50: #fffbeb; }";
    const fails = auditCss(css).checks.filter((c) => !c.pass);
    expect(new Set(fails.map((c) => c.fix)).size).toBe(1);
    const fix = fails[0]?.fix as string;
    expect(contrast(fix, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(fix, "#fffbeb")).toBeGreaterThanOrEqual(4.5);
  });

  it("finds as many checks as checkPalette", () => {
    const palette = createPalette({ brand: "#e30613" });
    expect(auditCss(toCss(palette)).checks).toHaveLength(checkPalette(palette).length);
  });

  it("flags a low-contrast step and suggests a color that passes", () => {
    const css = `:root {
      --color-yellow-50: #fffbeb;
      --color-yellow-500: #facc15;
      --color-yellow-600: #ca8a04;
    }`;
    const result = auditCss(css);
    const fails = result.checks.filter((c) => !c.pass);
    expect(fails.map((c) => `${c.foreground}/${c.background}`)).toEqual(
      expect.arrayContaining(["500/white", "600/white", "600/50"]),
    );
    expect(fails.every((c) => c.mode === "light" && typeof c.fix === "string")).toBe(true);
  });

  it("reads modes from .dark, media queries and light-dark()", () => {
    const css = `
      :root { --brand-600: #b30000; --brand-50: #fff5f5; }
      .dark { --brand-600: #ff8a8a; --brand-50: #1a0000; }
      @media (prefers-color-scheme: dark) { :root:not(.light) { --acc-600: #8ab4ff; } }
      :root { --acc-600: light-dark(#0b3d91, #8ab4ff); }`;
    const result = auditCss(css);
    const modes = (scale: string) => [
      ...new Set(result.checks.filter((c) => c.scale === scale).map((c) => c.mode)),
    ];
    expect(modes("brand")).toEqual(["light", "dark"]);
    expect(modes("acc")).toEqual(["light", "dark"]);
  });

  it("checks the text color on a solid step", () => {
    const css = ":root { --color-brand-600: #e30613; --color-brand-on-600: #444444; }";
    const bad = auditCss(css).checks.find((c) => c.foreground === "on-600");
    expect(bad?.pass).toBe(false);
  });

  it("skips values it cannot read and ignores everything else", () => {
    const css = `/* --color-x-600: #000 */
      :root { --color-x-600: var(--other); --gap-4: 1rem; --font-sans: ui-sans-serif; }`;
    const result = auditCss(css);
    expect(result.scales).toEqual([]);
    expect(result.skipped).toEqual(["--color-x-600: var(--other)"]);
  });
});

describe("promise sweep", () => {
  it("holds for every hue, from grey-ish to vivid", () => {
    const failures: string[] = [];
    for (let hue = 0; hue < 360; hue += 10) {
      for (const chroma of [0.02, 0.07, 0.14, 0.25]) {
        for (const lightness of [0.35, 0.65, 0.9]) {
          const palette = createPalette({ brand: `oklch(${lightness} ${chroma} ${hue})` });
          for (const c of checkPalette(palette).filter((x) => !x.pass)) {
            failures.push(
              `oklch(${lightness} ${chroma} ${hue}): ${c.scale} ${c.mode} ${c.foreground} on ${c.background} ${c.ratio}`,
            );
          }
        }
      }
    }
    expect(failures).toEqual([]);
  }, 120_000);
});

describe("cli audit", () => {
  afterEach(() => vi.restoreAllMocks());

  const write = (css: string) => {
    const file = join(mkdtempSync(join(tmpdir(), "gradient-")), "app.css");
    writeFileSync(file, css);
    return file;
  };

  it("exits 0 for a clean file and 1 with suggestions for a failing one", async () => {
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((m: string) => lines.push(m));
    const good = write(toCss(createPalette({ brand: "#e30613" })));
    expect(await main(["audit", good])).toBe(0);
    expect(lines.some((l) => /brand light: \d+\/\d+ pairs pass/.test(l))).toBe(true);
    lines.length = 0;
    const bad = write(":root { --color-yellow-600: #ca8a04; --color-yellow-50: #fffbeb; }");
    expect(await main(["audit", bad])).toBe(1);
    expect(
      lines.some((l) => /fail 600 on white = \d\.\d+:1, needs 4\.5:1 \(try #[0-9a-f]{6}\)/.test(l)),
    ).toBe(true);
  });

  it("prints json and reports files without steps", async () => {
    const out: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((m) => {
      out.push(String(m));
      return true;
    });
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((m: string) => lines.push(m));
    expect(await main(["audit", write(":root { --gap: 1px; }")])).toBe(0);
    expect(lines.join("\n")).toContain("no color steps found");
    expect(await main(["audit", write(toCss(createPalette({ brand: "#e30613" }))), "--json"])).toBe(
      0,
    );
    expect(JSON.parse(out.join(""))[0].scales).toContain("brand");
  });

  it("needs a file", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await main(["audit"])).toBe(2);
  });
});
