---
title: API
description: Functions and types of @sweberdev/gradient.
---

All functions are pure and run in Node.js and in the browser. Wherever a color is expected you can pass hex, `rgb()`, `hsl()` or `oklch()`. What is stable between versions is described in [Stability](stability.md).

## Palettes

### `createPalette(colors, options?)`

Generates one scale per entry of `colors` (`{ brand: "#e30613" }`), plus a neutral unless `neutral: false`. Names must be lowercase letters, digits and dashes.

| Option | Default | |
|---|---|---|
| `neutral` | `true` | `false` to skip, a number for its chroma (`0` = pure grey) |
| `saturation` | `1` | Multiplies the chroma of all steps |
| `hueShift` | `0` | Degrees the hue turns from the lightest to the darkest step |
| `pin` | `false` | Put the exact input color on its anchor step |
| `status` | `false` | `true` adds `success`, `warning`, `danger`, `info`; an object overrides single colors |

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

`STEPS` lists the steps (`50` … `950`), `CONTRAST_TARGETS` their targets. `stepsOf(scale, mode)` returns the steps of one mode as `[step, swatch]` pairs, lightest first in light mode.

### `PROMISES`

The contrast promises as a list of `[step, background, ratio]`, the same ones `checkPalette` measures and [Stability](stability.md) guarantees.

### `checkPalette(palette)`

Measures the [safe pairs](../guides/steps.md#safe-pairs) in both modes. Returns `{ scale, mode, foreground, background, ratio, required, pass }[]`.

### `auditCss(css)`

Checks the color steps of a stylesheet. Returns `{ scales, checks, skipped }`, where `checks` have the shape of `checkPalette` plus `fix`, a color that passes every pair of the step. See [Audit an existing stylesheet](../guides/audit.md).

### `checkDistinguishable(palette, options?)`

Compares colored scales pairwise at `step` (default 600) with normal vision and simulated color vision deficiencies. Returns `{ a, b, mode, vision, distance, pass }[]`; `minDistance` defaults to 0.08 (ΔE in OKLab). See [Status colors and color vision](../guides/status-colors.md).

### `checkPair(foreground, background)`

WCAG 2 ratio and levels plus APCA for any two colors. Returns `{ foreground, background, ratio, aa, aaLarge, aaa, aaaLarge, apca }`. See [Check any two colors](../guides/check-colors.md).

### `fixContrast(foreground, background, target?)`

The closest color to `foreground`, with only its lightness changed, that reaches `target` (default 4.5) on `background`. Returns the input if it already passes and `null` if no lightness gets there.

### `createSeries(brand, options?)`

Chart colors: `{ light, dark, distance }` with `count` hex colors (2 to 8, default 6) per mode. See [Chart colors](../guides/chart-colors.md).

### `createBlend(colors, options?)`

Gradient between two or more colors, blended in OKLCH: `{ stops, css, native }`. Options `steps` (2 to 64, default 9), `angle` (default 90) and `hue` (`"shorter"` or `"longer"`). See [Gradients](../guides/gradients.md).

### `contrastOnBlend(blend, text, required?)`

Contrast of a text color on every stop: `{ min, max, pass, required }`. `required` defaults to 4.5.

### `extractColors(pixels, options?)`

Dominant colors of an RGBA pixel array: `{ hex, share }[]`, sorted by share. `count` is 1 to 12, default 5. See [Colors from an image](../guides/image-colors.md).

### `pickBrand(colors)`

The best brand color of an `extractColors` result as hex, or `null` if there is none.

### `parseConfig(input)` and `renderConfig(config)`

`parseConfig` validates a parsed `gradient.config.json` and returns it typed, or throws an error that names the field. `renderConfig` generates every file of it without touching the file system: `{ outputs: [{ file, content }], checks }`. See [Config file and build](../guides/config-file.md).

## Exports

| Function | Returns |
|---|---|
| `toCss(palette, options?)` | Stylesheet, see [CSS](../guides/css-and-tokens.md) |
| `toTailwind(palette, options?)` | Tailwind CSS v4 stylesheet |
| `toTailwindV3(palette, options?)` | `{ css, colors }` |
| `toScss(palette, options?)` | Sass variables: `$brand-600`, `$brand-600-dark`, `$brand-on-600`; `prefix` option |
| `toTypeScript(palette)` | TypeScript module with a typed `colors` constant |
| `toShadcn(palette, options?)` | Stylesheet with the semantic colors of shadcn/ui, see [shadcn/ui theme](../guides/shadcn.md) |
| `shadcnTokens(palette)` | The same colors as hex per mode |
| `toTokens(palette)` | W3C design tokens object |
| `toJson(palette)` | Plain hex values |

## Color utilities

| Function | |
|---|---|
| `parseColor(input)` | Hex, `rgb()`, `hsl()` or `oklch()` to `{ l, c, h }` |
| `toHex(color)`, `fromHex(hex)` | Convert, with gamut mapping |
| `formatOklch(color)`, `oklchChannels(color)` | CSS strings |
| `inGamut(color)`, `toGamut(color)`, `maxChroma(l, h)` | sRGB gamut |
| `contrast(a, b)`, `luminance(color)` | WCAG 2 contrast ratio and relative luminance |
| `wcagLevel(ratio, large?)` | `"AAA"`, `"AA"` or `"fail"` |
| `apca(text, background)` | APCA lightness contrast Lc (WCAG 3 draft) |
| `anchorStep(color)` | Step closest to a color |
| `simulate(color, deficiency)` | Color as seen with `protanopia`, `deuteranopia` or `tritanopia` |
| `deltaE(a, b)` | Perceptual distance in OKLab |
| `statusColors(brand)` | The derived status colors as `oklch()` strings |
| `STATUS_NAMES`, `STATUS_HUES` | The status names (`success`, `warning`, `danger`, `info`) and their fixed hues |
| `DEFICIENCIES` | `protanopia`, `deuteranopia`, `tritanopia`, the values `simulate` accepts |
| `CONFIG_FORMATS` | The output formats a `gradient.config.json` accepts |
