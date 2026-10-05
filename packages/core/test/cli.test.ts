import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/cli";

describe("cli", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes Tailwind CSS for several colors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const out = join(mkdtempSync(join(tmpdir(), "gradient-")), "colors.css");
    const code = await main(["#e30613", "accent=#0a84ff", "--format", "tailwind", "--out", out]);
    expect(code).toBe(0);
    const css = readFileSync(out, "utf8");
    expect(css).toContain("--color-brand-500:");
    expect(css).toContain("--color-accent-500:");
    expect(css).toContain("--color-neutral-500:");
  });

  it("checks contrast and fails when a pinned color breaks a promise", async () => {
    const errors: string[] = [];
    vi.spyOn(console, "error").mockImplementation((m: string) => errors.push(m));
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    expect(await main(["#e30613", "--check"])).toBe(0);
    // 4.27:1 on white, closest to step 600, which promises 4.5:1.
    expect(await main(["#ec2a20", "--pin", "--check", "--no-neutral"])).toBe(1);
    expect(errors.some((e) => /^fail brand light: 600 on white/.test(e))).toBe(true);
  });

  it("rejects unknown formats", async () => {
    await expect(main(["#e30613", "--format", "scss"])).rejects.toThrow(/Unknown --format/);
  });
});
