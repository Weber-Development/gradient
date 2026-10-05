import type { Palette } from "../palette";
import { STEPS } from "../scale";

interface Token {
  $type: "color";
  $value: string;
}

type TokenTree = Record<string, Record<string, Record<string, Token>>>;

/**
 * Design tokens in the W3C Design Tokens format (Figma Tokens Studio, Style
 * Dictionary), grouped by mode: `light.brand.500`, `dark.brand.500`.
 */
export function toTokens(palette: Palette): TokenTree {
  const tree: TokenTree = { light: {}, dark: {} };
  for (const mode of ["light", "dark"] as const) {
    for (const scale of palette.scales) {
      const group: Record<string, Token> = {};
      for (const step of STEPS) {
        group[String(step)] = { $type: "color", $value: scale[mode][step].hex };
      }
      for (const step of STEPS) {
        group[`on-${step}`] = { $type: "color", $value: scale[mode][step].on };
      }
      (tree[mode] as Record<string, Record<string, Token>>)[scale.name] = group;
    }
  }
  return tree;
}

/** Plain hex values: `{ brand: { light: { 50: "#…" }, dark: { … } } }`. */
export function toJson(palette: Palette): Record<string, Record<string, Record<string, string>>> {
  const out: Record<string, Record<string, Record<string, string>>> = {};
  for (const scale of palette.scales) {
    const entry: Record<string, Record<string, string>> = { light: {}, dark: {} };
    for (const mode of ["light", "dark"] as const) {
      for (const step of STEPS)
        (entry[mode] as Record<string, string>)[step] = scale[mode][step].hex;
    }
    out[scale.name] = entry;
  }
  return out;
}
