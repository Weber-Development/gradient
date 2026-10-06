---
title: CSS, tokens and JSON
description: Export the palette as CSS custom properties, W3C design tokens, JSON, Sass or TypeScript.
---

## CSS custom properties

```sh
npx @sweberdev/gradient "#e30613" --out gradient.css
npx @sweberdev/gradient "#e30613" --hex --prefix c --dark class --out gradient.css
```

```css
:root {
  --color-brand-50: oklch(97.98% 0.0098 25.07);
  /* … */
  --color-brand-on-600: oklch(100% 0 0);
}
```

Options of `toCss(palette, options)`:

| Option | Default | |
|---|---|---|
| `prefix` | `"color"` | `--<prefix>-<name>-<step>` |
| `format` | `"oklch"` | `"hex"`, or `"channels"` for `oklch(var(--x) / 50%)` |
| `dark` | `"both"` | See [Dark mode](dark-mode.md) |
| `darkSelector` | `".dark"` | |
| `lightSelector` | `".light"` | Forces light mode when `dark` is `both` |
| `root` | `":root"` | Selector for the light values, e.g. `.theme-brand` |

## Design tokens

```sh
npx @sweberdev/gradient "#e30613" --format tokens --out tokens.json
```

The file follows the W3C Design Tokens format and works with Tokens Studio for Figma and Style Dictionary:

```json
{
  "light": { "brand": { "500": { "$type": "color", "$value": "#ff4c41" } } },
  "dark": { "brand": { "500": { "$type": "color", "$value": "#c3000d" } } }
}
```

## JSON

`--format json` or `toJson(palette)` gives plain hex values: `{ "brand": { "light": { "50": "#fff6f5", … }, "dark": { … } } }`.

## Sass

```sh
npx @sweberdev/gradient "#e30613" --format scss --out _colors.scss
```

Light values are `$brand-600`, dark values `$brand-600-dark`, text colors `$brand-on-600`. Sass variables are fixed at build time, so dark mode needs your own selectors or media queries. Prefer CSS custom properties when you can.

## TypeScript

```sh
npx @sweberdev/gradient "#e30613" --format ts --out src/colors.ts
```

```ts
import { colors } from "./colors";

colors.brand.light[600]; // "#e20211"
colors.brand.light.on[600]; // "#ffffff"
```

For CSS-in-JS, React Native, canvas or charts. `ColorName` and `ColorStep` are exported as types.
