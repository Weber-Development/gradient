import { contrast } from "./contrast";
import {
  generateNeutral,
  generateScale,
  type Mode,
  type Scale,
  type ScaleOptions,
  type Step,
} from "./scale";
import { STATUS_NAMES, type StatusName, statusColors } from "./status";

export interface Palette {
  scales: Scale[];
}

export interface PaletteOptions extends Omit<ScaleOptions, "name" | "chroma"> {
  /**
   * Adds a tinted grey called `neutral`, based on the first color.
   * `true` uses a subtle default tint, a number sets its chroma (0 = pure grey).
   * Default true.
   */
  neutral?: boolean | number;
  /**
   * Adds `success`, `warning`, `danger` and `info` scales that match the
   * first color. `true` derives all four, an object overrides single ones,
   * e.g. `{ danger: "#d4351c" }`. Colors you pass yourself under these names
   * win. Default false.
   */
  status?: boolean | Partial<Record<StatusName, string>>;
}

/**
 * Generates one scale per color, plus a matching neutral and, on request,
 * status colors.
 *
 * ```ts
 * const palette = createPalette({ brand: "#e30613", accent: "#0a84ff" }, { status: true });
 * ```
 */
export function createPalette(
  colors: Record<string, string>,
  options: PaletteOptions = {},
): Palette {
  const entries = Object.entries(colors);
  if (entries.length === 0) throw new Error("createPalette needs at least one color.");
  const { neutral = true, status = false, ...scaleOptions } = options;
  const scales = entries.map(([name, color]) => {
    assertName(name);
    return generateScale(color, { ...scaleOptions, name });
  });
  if (status) {
    const derived = {
      ...statusColors(entries[0]?.[1] as string),
      ...(status === true ? {} : status),
    };
    for (const name of STATUS_NAMES) {
      if (!colors[name]) scales.push(generateScale(derived[name], { name }));
    }
  }
  if (neutral !== false && !colors.neutral) {
    const first = entries[0]?.[1] as string;
    scales.push(generateNeutral(first, typeof neutral === "number" ? { chroma: neutral } : {}));
  }
  return { scales };
}

function assertName(name: string) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error(`Invalid color name "${name}": use lowercase letters, digits and dashes.`);
  }
}

export interface ContrastCheck {
  scale: string;
  mode: Mode;
  /** Foreground step, or `on-<step>` for the text color on a solid swatch. */
  foreground: string;
  background: string;
  ratio: number;
  required: number;
  pass: boolean;
}

/** The pairs the step numbers promise, see `CONTRAST_TARGETS`. */
const PROMISES: Array<[Step, Step | "page", number]> = [
  [500, "page", 3],
  [500, 50, 3],
  [600, "page", 4.5],
  [600, 50, 4.5],
  [700, 50, 4.5],
  [700, 100, 4.5],
  [700, 200, 4.5],
  [800, "page", 7],
  [800, 50, 7],
];

/**
 * Measures every contrast pair the step numbers promise, in both modes, plus
 * the text color on the solid steps 500–950. Use it in tests to make sure a
 * pinned or edited palette still holds.
 */
export function checkPalette(palette: Palette): ContrastCheck[] {
  const checks: ContrastCheck[] = [];
  for (const scale of palette.scales) {
    for (const mode of ["light", "dark"] as const) {
      const steps = scale[mode];
      const page = mode === "light" ? "#ffffff" : "#000000";
      for (const [fg, bg, required] of PROMISES) {
        const background = bg === "page" ? page : steps[bg].hex;
        const value = contrast(steps[fg].hex, background);
        checks.push({
          scale: scale.name,
          mode,
          foreground: String(fg),
          background: bg === "page" ? (mode === "light" ? "white" : "black") : String(bg),
          ratio: round(value),
          required,
          pass: value >= required,
        });
      }
      for (const step of [600, 700, 800, 900, 950] as const) {
        const value = contrast(steps[step].on, steps[step].hex);
        checks.push({
          scale: scale.name,
          mode,
          foreground: `on-${step}`,
          background: String(step),
          ratio: round(value),
          required: 4.5,
          pass: value >= 4.5,
        });
      }
    }
  }
  return checks;
}

const round = (v: number) => Math.round(v * 100) / 100;
