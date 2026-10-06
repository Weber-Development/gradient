# Gradient

Accessible color scales from one brand color. Gradient generates eleven steps in OKLCH for light and dark mode, and every step reaches a fixed contrast, so the step number tells you what it is safe for. Status colors (success, warning, danger, info) that match your brand, a check for color vision deficiencies, and export to CSS variables (also as `light-dark()`), Tailwind CSS v4 and v3, or design tokens. Zero dependencies.

```sh
npx @sweberdev/gradient "#e30613" --format tailwind --out app/gradient.css
```

| Step | Contrast on white (light) and on black (dark) | Use it for |
|---|---|---|
| 50–200 | 1.06–1.32:1 | Backgrounds, hover surfaces, subtle borders |
| 300–400 | 1.6–2.3:1 | Decorative borders, disabled states |
| **500** | **≥ 3:1**, also on step 50 | Icons, input borders, focus rings (WCAG 1.4.11) |
| **600** | **≥ 4.5:1**, also on step 50 | Body text, links, solid buttons with `on-600` text (WCAG AA) |
| **700** | ≥ 6.4:1, ≥ 4.5:1 on steps 50–200 | Text on tinted surfaces |
| **800** | **≥ 7:1**, also on step 50 | Small text at WCAG AAA |
| 900–950 | ≥ 12:1 | Headings, high-contrast text |

The same promise holds in dark mode against black and the dark step 50, so `bg-brand-50 text-brand-700` stays readable in both modes without a `dark:` variant. Each step also comes with a text color (`brand-on-600`) that is readable on top of it.

## Why

Most palette generators interpolate lightness and hope for the best: `blue-500` passes 4.5:1 on white, `yellow-500` does not. Gradient solves each step for a target luminance instead, so contrast is the same across hues. Lightness, chroma and hue are computed in OKLCH, out-of-gamut colors are brought into sRGB by lowering chroma only, and the hex value is checked again after rounding.

## Library

```ts
import {
  auditCss,
  checkDistinguishable,
  checkPair,
  checkPalette,
  createPalette,
  createSeries,
  fixContrast,
  toCss,
  toTailwind,
  toTokens,
} from "@sweberdev/gradient";

const palette = createPalette({ brand: "#e30613", accent: "#0a84ff" }, { status: true });
// + success, warning, danger, info and a tinted "neutral"

palette.scales[0].light[600]; // { hex: "#e20211", css: "oklch(…)", contrast: 4.94, on: "#ffffff", … }
toTailwind(palette); // @theme { --color-brand-50: oklch(…); … } + dark overrides
toCss(palette, { dark: "class", format: "hex" });
toTokens(palette); // W3C design tokens for Figma and Style Dictionary
checkPalette(palette).every((c) => c.pass); // true
checkDistinguishable(palette).filter((c) => !c.pass); // pairs that look alike with color blindness
checkPair("#ffffff", "#e30613"); // { ratio: 4.88, aa: true, apca: -76.5, … }
fixContrast("#ff5a5f", "#ffffff"); // "#db3742", the closest color that reaches 4.5:1
auditCss(css); // check the colors of an existing stylesheet
createSeries("#e30613", { count: 5 }); // chart colors that stay apart with color blindness
```

## CLI

```sh
npx @sweberdev/gradient "#e30613" accent=#0a84ff --format tailwind --out app/gradient.css
npx @sweberdev/gradient "#e30613" --format table      # preview with contrast ratios
npx @sweberdev/gradient "#e30613" --pin --check       # keep the exact brand color, fail if it breaks a promise
npx @sweberdev/gradient check "#ff5a5f" "#ffffff"     # check any pair, suggest a fix
npx @sweberdev/gradient "#e30613" --format shadcn --out app/globals.css   # shadcn/ui theme
npx @sweberdev/gradient series "#e30613" --count 5   # chart colors
npx @sweberdev/gradient audit app/globals.css          # check the colors you already have
npx @sweberdev/gradient blend "#e30613" "#0a84ff"      # gradient without the muddy middle
npx @sweberdev/gradient init "#e30613"                 # gradient.config.json, then:
npx @sweberdev/gradient build --verify                 # regenerate or verify all files (CI)
```

Formats: `css` (default), `tailwind` (v4), `tailwind3`, `scss`, `ts`, `shadcn`, `tokens`, `json`, `table`. Dark mode: `both` (system setting, a `.dark` or `.light` class overrides), `media`, `class`, `light-dark`, `none`. `--status` adds the status colors.

## Documentation

[packages.sweber.dev/gradient/docs](https://packages.sweber.dev/gradient/docs)

## License

MIT © Seya Weber
