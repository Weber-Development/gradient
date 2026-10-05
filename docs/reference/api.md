---
title: API
description: Functions and types of @sweberdev/gradient.
---

All functions are pure and run in Node.js and in the browser.

## Palettes

### `createPalette(colors, options?)`

Generates one scale per entry of `colors` (`{ brand: "#e30613" }`), plus a neutral unless `neutral: false`. Names must be lowercase letters, digits and dashes.

| Option | Default | |
|---|---|---|
| `neutral` | `true` | `false` to skip, a number for its chroma (`0` = pure grey) |
| `saturation` | `1` | Multiplies the chroma of all steps |
| `hueShift` | `0` | Degrees the hue turns from the lightest to the darkest step |
| `pin` | `false` | Put the exact input color on its anchor step |

Returns `{ scales: Scale[] }`.

### `generateScale(color, options?)` and `generateNeutral(color, options?)`

One scale. Options as above, plus `name` and a fixed `chroma`.

```ts
interface Scale {
  name: string;
  source: string; // input as hex
  anchor: Step; // step closest to the input
  light: Record<Step, Swatch>;
  dark: Record<Step, Swatch>;
}

interface Swatch {
  hex: string;
  oklch: { l: number; c: number; h: number };
  css: string; // "oklch(62.8% 0.2577 29.23)"
  contrast: number; // against white (light) or black (dark)
  on: string; // readable text color on this swatch
}
```

`STEPS` lists the steps (`50` … `950`), `CONTRAST_TARGETS` their targets.

### `checkPalette(palette)`

Measures the [safe pairs](../guides/steps.md#safe-pairs) in both modes. Returns `{ scale, mode, foreground, background, ratio, required, pass }[]`.

## Exports

| Function | Returns |
|---|---|
| `toCss(palette, options?)` | Stylesheet, see [CSS](../guides/css-and-tokens.md) |
| `toTailwind(palette, options?)` | Tailwind CSS v4 stylesheet |
| `toTailwindV3(palette, options?)` | `{ css, colors }` |
| `toTokens(palette)` | W3C design tokens object |
| `toJson(palette)` | Plain hex values |

## Color utilities

| Function | |
|---|---|
| `parseColor(input)` | Hex, `rgb()`, `hsl()` or `oklch()` to `{ l, c, h }` |
| `toHex(color)`, `fromHex(hex)` | Convert, with gamut mapping |
| `formatOklch(color)`, `oklchChannels(color)` | CSS strings |
| `inGamut(color)`, `toGamut(color)`, `maxChroma(l, h)` | sRGB gamut |
| `contrast(a, b)`, `luminance(hex)` | WCAG 2 contrast ratio and relative luminance |
| `wcagLevel(ratio, large?)` | `"AAA"`, `"AA"` or `"fail"` |
| `anchorStep(color)` | Step closest to a color |
