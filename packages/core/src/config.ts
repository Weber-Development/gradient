import type { DarkMode } from "./export/css";
import { type ContrastCheck, checkPalette, createPalette, type PaletteOptions } from "./palette";
import { render, seriesCss } from "./render";

export const CONFIG_FORMATS = [
  "css",
  "tailwind",
  "tailwind3",
  "scss",
  "ts",
  "shadcn",
  "tokens",
  "json",
  "table",
  "series",
] as const;

export type ConfigFormat = (typeof CONFIG_FORMATS)[number];

export interface ConfigOutput {
  /** Path of the file to write, relative to the config file. */
  file: string;
  format: ConfigFormat;
  /** `both`, `media`, `class`, `light-dark` or `none`. Default `class` for shadcn, else `both`. */
  dark?: DarkMode;
  /** Class that turns dark mode on. Default `.dark`. */
  darkSelector?: string;
  /** css and shadcn: hex values instead of `oklch()`. */
  hex?: boolean;
  /** css and scss: variable prefix. */
  prefix?: string;
  /** series: number of chart colors, 2 to 8. */
  count?: number;
}

export interface GradientConfig {
  /** Named colors, the first one is the brand color. */
  colors: Record<string, string>;
  /** Options of `createPalette`: `status`, `pin`, `neutral`, `saturation`, `hueShift`. */
  palette?: Pick<PaletteOptions, "status" | "pin" | "neutral" | "saturation" | "hueShift">;
  /** Files to generate. */
  outputs: ConfigOutput[];
  /** Existing stylesheets to audit with `gradient build --verify` or the GitHub Action. */
  audit?: string[];
}

const DARK_MODES = ["both", "media", "class", "light-dark", "none"];
const PALETTE_KEYS = ["status", "pin", "neutral", "saturation", "hueShift"];
const OUTPUT_KEYS = ["file", "format", "dark", "darkSelector", "hex", "prefix", "count"];

const fail = (path: string, message: string): never => {
  throw new Error(`gradient.config.json: ${path} ${message}`);
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Checks a parsed `gradient.config.json` and returns it typed. Throws an
 * error that names the field when something is wrong, including unknown
 * keys, so a typo does not silently do nothing.
 */
export function parseConfig(input: unknown): GradientConfig {
  if (!isObject(input)) return fail("", "must be an object.");
  for (const key of Object.keys(input)) {
    if (!["$schema", "colors", "palette", "outputs", "audit"].includes(key)) {
      fail(key, "is not a known key (colors, palette, outputs, audit).");
    }
  }

  const colors = input.colors;
  if (!isObject(colors) || Object.keys(colors).length === 0) {
    return fail("colors", 'needs at least one color, for example { "brand": "#e30613" }.');
  }
  for (const [name, value] of Object.entries(colors)) {
    if (typeof value !== "string") fail(`colors.${name}`, "must be a color string.");
  }

  let palette: GradientConfig["palette"];
  if (input.palette !== undefined) {
    if (!isObject(input.palette)) return fail("palette", "must be an object.");
    for (const [key, value] of Object.entries(input.palette)) {
      if (!PALETTE_KEYS.includes(key)) fail(`palette.${key}`, `is not a known option.`);
      const ok =
        key === "status" || key === "pin"
          ? typeof value === "boolean"
          : key === "neutral"
            ? typeof value === "boolean" || typeof value === "number"
            : typeof value === "number" && Number.isFinite(value);
      if (!ok) fail(`palette.${key}`, "has the wrong type.");
    }
    palette = input.palette as GradientConfig["palette"];
  }

  if (!Array.isArray(input.outputs) || input.outputs.length === 0) {
    return fail(
      "outputs",
      'needs at least one entry, for example { "file": "app/globals.css", "format": "shadcn" }.',
    );
  }
  const outputs = input.outputs.map((raw: unknown, i) => {
    const at = `outputs[${i}]`;
    if (!isObject(raw)) return fail(at, "must be an object.");
    for (const key of Object.keys(raw)) {
      if (!OUTPUT_KEYS.includes(key)) fail(`${at}.${key}`, "is not a known option.");
    }
    if (typeof raw.file !== "string" || raw.file === "") fail(`${at}.file`, "must be a path.");
    if (!CONFIG_FORMATS.includes(raw.format as ConfigFormat)) {
      fail(`${at}.format`, `must be one of ${CONFIG_FORMATS.join(", ")}.`);
    }
    if (raw.dark !== undefined && !DARK_MODES.includes(raw.dark as string)) {
      fail(`${at}.dark`, `must be one of ${DARK_MODES.join(", ")}.`);
    }
    for (const key of ["darkSelector", "prefix"]) {
      if (raw[key] !== undefined && typeof raw[key] !== "string")
        fail(`${at}.${key}`, "must be a string.");
    }
    if (raw.hex !== undefined && typeof raw.hex !== "boolean")
      fail(`${at}.hex`, "must be true or false.");
    if (
      raw.count !== undefined &&
      (!Number.isInteger(raw.count) || (raw.count as number) < 2 || (raw.count as number) > 8)
    ) {
      fail(`${at}.count`, "must be a whole number from 2 to 8.");
    }
    return raw as unknown as ConfigOutput;
  });
  const files = outputs.map((o) => o.file);
  const duplicate = files.find((f, i) => files.indexOf(f) !== i);
  if (duplicate) fail("outputs", `writes ${duplicate} twice.`);

  let audit: string[] | undefined;
  if (input.audit !== undefined) {
    if (!Array.isArray(input.audit) || input.audit.some((f) => typeof f !== "string")) {
      return fail("audit", "must be a list of file paths.");
    }
    audit = input.audit as string[];
  }

  return {
    colors: colors as Record<string, string>,
    ...(palette ? { palette } : {}),
    outputs,
    ...(audit ? { audit } : {}),
  };
}

export interface RenderedOutput {
  file: string;
  content: string;
}

export interface ConfigResult {
  outputs: RenderedOutput[];
  /** Contrast checks of the palette, the same as `checkPalette`. */
  checks: ContrastCheck[];
}

/**
 * Generates the content of every file in a config, without touching the
 * file system. The CLI writes the result; you can compare it with the
 * files on disk to find out whether they are up to date.
 */
export function renderConfig(config: GradientConfig): ConfigResult {
  const palette = createPalette(config.colors, config.palette ?? {});
  const first = Object.values(config.colors)[0] as string;
  const outputs = config.outputs.map((o) => {
    if (o.format === "series") {
      return { file: o.file, content: seriesCss(first, o.count, o.darkSelector).css };
    }
    const dark = o.dark ?? (o.format === "shadcn" ? "class" : "both");
    return {
      file: o.file,
      content: render(palette, o.format, {
        dark,
        darkSelector: o.darkSelector,
        hex: o.hex,
        prefix: o.prefix,
      }),
    };
  });
  return { outputs, checks: checkPalette(palette) };
}
