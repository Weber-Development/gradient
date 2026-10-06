import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli";
import { CONFIG_FORMATS, parseConfig, renderConfig } from "../src/config";
import { toShadcn } from "../src/export/shadcn";
import { createPalette } from "../src/palette";

const valid = {
  colors: { brand: "#e30613", accent: "#0a84ff" },
  palette: { status: true },
  outputs: [
    { file: "app/globals.css", format: "shadcn" },
    { file: "src/colors.ts", format: "ts" },
    { file: "src/chart.css", format: "series", count: 4 },
  ],
};

describe("parseConfig", () => {
  it("accepts a valid config", () => {
    expect(parseConfig(valid)).toEqual(valid);
  });

  it("names the field when something is wrong", () => {
    const bad = (patch: object) => () => parseConfig({ ...valid, ...patch });
    expect(bad({ colors: {} })).toThrow(/colors/);
    expect(bad({ colors: { brand: 5 } })).toThrow(/colors\.brand/);
    expect(bad({ outputs: [] })).toThrow(/outputs/);
    expect(bad({ outputs: [{ file: "a.css", format: "nope" }] })).toThrow(/outputs\[0\]\.format/);
    expect(bad({ outputs: [{ file: "a.css", format: "css", dark: "x" }] })).toThrow(/dark/);
    expect(bad({ outputs: [{ file: "a.css", format: "series", count: 9 }] })).toThrow(/count/);
    expect(
      bad({
        outputs: [
          { file: "a", format: "css" },
          { file: "a", format: "ts" },
        ],
      }),
    ).toThrow(/twice/);
    expect(bad({ palette: { statuss: true } })).toThrow(/palette\.statuss/);
    expect(bad({ extra: 1 })).toThrow(/extra/);
    expect(() => parseConfig(null)).toThrow();
  });
});

describe("config schema", () => {
  it("lists the same formats as the code", () => {
    const schema = JSON.parse(
      readFileSync(join(__dirname, "../gradient.config.schema.json"), "utf8"),
    );
    expect(schema.properties.outputs.items.properties.format.enum).toEqual([...CONFIG_FORMATS]);
  });
});

describe("renderConfig", () => {
  it("renders every output like the matching CLI command", () => {
    const result = renderConfig(parseConfig(valid));
    expect(result.outputs.map((o) => o.file)).toEqual([
      "app/globals.css",
      "src/colors.ts",
      "src/chart.css",
    ]);
    const expected = toShadcn(createPalette(valid.colors, { status: true }), { dark: "class" });
    expect(result.outputs[0]?.content).toBe(expected);
    expect(result.outputs[2]?.content).toContain("--chart-4:");
    expect(result.outputs[2]?.content).not.toContain("--chart-5:");
    expect(result.checks.every((c) => c.pass)).toBe(true);
  });
});

describe("cli build and init", () => {
  afterEach(() => vi.restoreAllMocks());

  const setup = () => {
    const dir = mkdtempSync(join(tmpdir(), "gradient-"));
    const config = join(dir, "gradient.config.json");
    writeFileSync(config, JSON.stringify(valid));
    const out: string[] = [];
    vi.spyOn(console, "log").mockImplementation((m: string) => out.push(m));
    vi.spyOn(console, "error").mockImplementation((m: string) => out.push(m));
    vi.spyOn(process.stdout, "write").mockImplementation((m: string | Uint8Array) => {
      out.push(String(m));
      return true;
    });
    return { dir, config, out };
  };

  it("writes the files, then reports them unchanged", async () => {
    const { dir, config, out } = setup();
    expect(await main(["build", "--config", config])).toBe(0);
    expect(existsSync(join(dir, "app/globals.css"))).toBe(true);
    expect(readFileSync(join(dir, "src/colors.ts"), "utf8")).toContain("colors");
    expect(out.join("\n")).toContain("written");
    out.length = 0;
    expect(await main(["build", "--config", config])).toBe(0);
    expect(out.join("\n")).toContain("unchanged");
  });

  it("--verify exits 1 for missing and stale files and writes nothing", async () => {
    const { dir, config, out } = setup();
    expect(await main(["build", "--config", config, "--verify"])).toBe(1);
    expect(existsSync(join(dir, "app/globals.css"))).toBe(false);
    expect(out.join("\n")).toContain("missing");
    await main(["build", "--config", config]);
    expect(await main(["build", "--config", config, "--verify"])).toBe(0);
    writeFileSync(join(dir, "src/colors.ts"), "// edited");
    out.length = 0;
    expect(await main(["build", "--config", config, "--verify", "--markdown"])).toBe(1);
    expect(out.join("\n")).toMatch(/src\/colors\.ts.*stale/);
    expect(readFileSync(join(dir, "src/colors.ts"), "utf8")).toBe("// edited");
  });

  it("audits the files listed in the config", async () => {
    const { dir, config, out } = setup();
    mkdirSync(join(dir, "css"));
    writeFileSync(
      join(dir, "css/a.css"),
      ":root { --color-yellow-50: #fffbeb; --color-yellow-600: #ca8a04; }",
    );
    writeFileSync(config, JSON.stringify({ ...valid, audit: ["css/a.css"] }));
    expect(await main(["build", "--config", config, "--json"])).toBe(1);
    const report = JSON.parse(out.join(""));
    expect(report.ok).toBe(false);
    expect(report.audit[0].checks.some((c: { pass: boolean }) => !c.pass)).toBe(true);
  });

  it("explains a missing or broken config", async () => {
    const { dir } = setup();
    await expect(main(["build", "--config", join(dir, "nope.json")])).rejects.toThrow(
      /gradient init/,
    );
    const broken = join(dir, "broken.json");
    writeFileSync(broken, "{");
    await expect(main(["build", "--config", broken])).rejects.toThrow(/not valid JSON/);
  });

  it("init writes a config that builds, and refuses to overwrite", async () => {
    const { dir } = setup();
    const config = join(dir, "init.config.json");
    expect(
      await main([
        "init",
        "#e30613",
        "accent=#0a84ff",
        "--config",
        config,
        "--format",
        "css",
        "--out",
        "x.css",
      ]),
    ).toBe(0);
    expect(parseConfig(JSON.parse(readFileSync(config, "utf8"))).outputs).toEqual([
      { file: "x.css", format: "css" },
    ]);
    expect(await main(["build", "--config", config])).toBe(0);
    expect(existsSync(join(dir, "x.css"))).toBe(true);
    expect(await main(["init", "#e30613", "--config", config])).toBe(1);
    expect(await main(["init"])).toBe(2);
  });

  it("audit --markdown prints a table for failing pairs", async () => {
    const { dir, out } = setup();
    const file = join(dir, "a.css");
    writeFileSync(file, ":root { --color-yellow-50: #fffbeb; --color-yellow-600: #ca8a04; }");
    expect(await main(["audit", file, "--markdown"])).toBe(1);
    expect(out.join("\n")).toContain("| Scale | Mode |");
  });
});
