import { parseColor, toHex } from "./color";
import { contrast } from "./contrast";
import { fixContrastFor } from "./pair";
import { PROMISES } from "./palette";
import { type Mode, STEPS, type Step } from "./scale";

export interface AuditCheck {
  /** Name of the color group, e.g. `brand` for `--color-brand-600`. */
  scale: string;
  mode: Mode;
  /** Foreground step, or `on-<step>` for the text color on a solid step. */
  foreground: string;
  background: string;
  ratio: number;
  required: number;
  pass: boolean;
  /** Closest color with the same hue that would pass, when there is one. */
  fix: string | null;
}

export interface AuditResult {
  /** Color groups found, in the order they appear. */
  scales: string[];
  checks: AuditCheck[];
  /** Variables that look like steps but could not be read, e.g. `var()` or unknown notation. */
  skipped: string[];
}

type StepValues = Partial<Record<Step | `on-${Step}`, string>>;

const STEP_NAME = new RegExp(`^(.+?)-(on-)?(${STEPS.join("|")})$`);
const DARK_RULE = /\.dark\b|\[data-theme[^\]]*dark|prefers-color-scheme:\s*dark/i;

/**
 * Checks the colors of an existing stylesheet against the promises of the
 * step numbers: custom properties named like `--color-brand-600`,
 * `--brand-600` or `--color-brand-on-600`, from `:root`, a dark class or a
 * dark `prefers-color-scheme` block, or written as `light-dark(a, b)`.
 * Light mode is measured against white, dark mode against black. Groups
 * that only have some of the steps are checked for the pairs they have.
 *
 * ```ts
 * const result = auditCss(readFileSync("app/globals.css", "utf8"));
 * result.checks.filter((c) => !c.pass);
 * ```
 */
export function auditCss(css: string): AuditResult {
  const groups = new Map<string, Record<Mode, StepValues>>();
  const skipped: string[] = [];

  for (const { name, value, dark } of declarations(css)) {
    const match = STEP_NAME.exec(name.slice(2));
    if (!match) continue;
    const key = (match[1] as string).replace(/^color-/, "");
    const step = `${match[2] ? "on-" : ""}${match[3]}` as keyof StepValues;
    const [light, darkValue] = splitLightDark(value);
    const entries: Array<[Mode, string]> =
      light && darkValue
        ? [
            ["light", light],
            ["dark", darkValue],
          ]
        : [[dark ? "dark" : "light", value]];
    for (const [mode, raw] of entries) {
      const hex = toHexOrNull(raw);
      if (!hex) {
        skipped.push(`${name}: ${raw}`);
        continue;
      }
      const group = groups.get(key) ?? { light: {}, dark: {} };
      group[mode][step] = hex;
      groups.set(key, group);
    }
  }

  const checks: AuditCheck[] = [];
  for (const [scale, modes] of groups) {
    for (const mode of ["light", "dark"] as const) {
      const steps = modes[mode];
      const page = mode === "light" ? "#ffffff" : "#000000";
      interface Pair {
        fg: string;
        bg: string;
        fgHex: string;
        bgHex: string;
        required: number;
      }
      const pairs: Pair[] = [];
      for (const [fg, bg, required] of PROMISES) {
        const fgHex = steps[fg];
        const bgHex = bg === "page" ? page : steps[bg];
        if (!fgHex || !bgHex) continue;
        const bgName = bg === "page" ? (mode === "light" ? "white" : "black") : String(bg);
        pairs.push({ fg: String(fg), bg: bgName, fgHex, bgHex, required });
      }
      for (const step of [600, 700, 800, 900, 950] as const) {
        const on = steps[`on-${step}`];
        const solid = steps[step];
        if (on && solid) {
          pairs.push({
            fg: `on-${step}`,
            bg: String(step),
            fgHex: on,
            bgHex: solid,
            required: 4.5,
          });
        }
      }
      for (const pair of pairs) {
        const value = contrast(pair.fgHex, pair.bgHex);
        const pass = value >= pair.required;
        // One color has to fix every pair the step is part of, not just this one.
        const fix = pass
          ? null
          : fixContrastFor(
              pair.fgHex,
              pairs.filter((p) => p.fg === pair.fg).map((p) => [p.bgHex, p.required]),
            );
        checks.push({
          scale,
          mode,
          foreground: pair.fg,
          background: pair.bg,
          ratio: Math.round(value * 100) / 100,
          required: pair.required,
          pass,
          fix,
        });
      }
    }
  }
  return { scales: [...groups.keys()], checks, skipped };
}

function toHexOrNull(value: string): string | null {
  try {
    return toHex(parseColor(value));
  } catch {
    return null;
  }
}

/** `light-dark(a, b)` to `[a, b]`; anything else to `[null, null]`. */
function splitLightDark(value: string): [string | null, string | null] {
  const m = /^light-dark\((.*)\)$/i.exec(value.trim());
  if (!m?.[1]) return [null, null];
  let depth = 0;
  const inner = m[1];
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 0) return [inner.slice(0, i).trim(), inner.slice(i + 1).trim()];
  }
  return [null, null];
}

/** Custom property declarations with the information whether a dark rule encloses them. */
function declarations(css: string): Array<{ name: string; value: string; dark: boolean }> {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: Array<{ name: string; value: string; dark: boolean }> = [];
  const preludes: string[] = [];
  let buffer = "";
  const flush = () => {
    const colon = buffer.indexOf(":");
    const name = buffer.slice(0, colon).trim();
    if (colon > 0 && name.startsWith("--")) {
      out.push({
        name,
        value: buffer.slice(colon + 1).trim(),
        dark: preludes.some((p) => DARK_RULE.test(p)),
      });
    }
    buffer = "";
  };
  for (const char of text) {
    if (char === "{") {
      preludes.push(buffer.trim());
      buffer = "";
    } else if (char === "}") {
      flush();
      preludes.pop();
    } else if (char === ";") {
      flush();
    } else {
      buffer += char;
    }
  }
  return out;
}
