// Runtime smoke test, run with the built package on Node.js, Bun and Deno:
//   node scripts/smoke.mjs
// It checks that the ESM and CommonJS builds load, produce the same output as
// the snapshot of the tests, and that the command line runs.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const esm = await import(new URL("../dist/index.js", import.meta.url));
const cjs = createRequire(import.meta.url)("../dist/index.cjs");

const expected = readFileSync(here("../test/__snapshots__/exports/red/css.css"), "utf8");
const colors = { brand: "#e30613", accent: "#0a84ff" };
for (const [name, lib] of [
  ["esm", esm],
  ["cjs", cjs],
]) {
  const palette = lib.createPalette(colors, { status: true });
  assert.equal(lib.toCss(palette), expected, `${name}: toCss differs from the snapshot`);
  assert.ok(
    lib.checkPalette(palette).every((c) => c.pass),
    `${name}: a promise fails`,
  );
  assert.ok(lib.contrast("#000000", "#ffffff") > 20.9, `${name}: contrast`);
  assert.equal(lib.createBlend(["#0000ff", "#ffff00"], { steps: 3 }).stops.length, 3);
  assert.equal(lib.createSeries("#e30613", { count: 4 }).light.length, 4);
  assert.equal(lib.extractColors(new Uint8ClampedArray([255, 0, 0, 255]))[0].hex, "#ff0000");
}
assert.deepEqual(
  Object.keys(esm).sort(),
  Object.keys(cjs).sort(),
  "esm and cjs export the same names",
);

const runtime = typeof Deno !== "undefined" ? "deno" : typeof Bun !== "undefined" ? "bun" : "node";
const bin = here("../dist/bin.js");
// The runtime that runs this script also runs the command line.
const run = runtime === "deno" ? [Deno.execPath(), ["run", "-A", bin]] : [process.execPath, [bin]];
const out = execFileSync(run[0], [...run[1], "#e30613", "--format", "json"], { encoding: "utf8" });
assert.match(JSON.parse(out).brand.light["600"], /^#[0-9a-f]{6}$/, "cli output");

console.log(`smoke ok on ${runtime}`);
