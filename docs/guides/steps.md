---
title: What the steps promise
description: Contrast targets of each step and the color pairs that are safe to use.
---

Every step is solved for a contrast ratio against the page: white in light mode, black in dark mode. The generated hex value reaches at least this ratio, and at most about 2 % more.

| Step | Target | Typical use |
|---|---|---|
| 50 | 1.06:1 | Page and card background tint |
| 100 | 1.15:1 | Hover background, selected row |
| 200 | 1.32:1 | Active background, subtle border |
| 300 | 1.6:1 | Border, divider |
| 400 | 2.3:1 | Strong border, disabled text |
| 500 | 3.3:1 | Icons, input borders, focus ring |
| 600 | 4.9:1 | Text, links, solid buttons |
| 700 | 6.4:1 | Text on tinted surfaces, button hover |
| 800 | 8.5:1 | Small text, AAA |
| 900 | 12:1 | Headings |
| 950 | 15.5:1 | Highest contrast text |

## Safe pairs

These pairs pass in light and dark mode, for every input color. `checkPalette()` and `gradient --check` measure all of them.

| Foreground | Background | Ratio | WCAG |
|---|---|---|---|
| 500 | page, 50 | ≥ 3:1 | 1.4.11 non-text contrast |
| 600 | page, 50 | ≥ 4.5:1 | 1.4.3 AA text |
| 700 | 50, 100, 200 | ≥ 4.5:1 | 1.4.3 AA text |
| 800 | page, 50 | ≥ 7:1 | 1.4.6 AAA text |
| `on-600` … `on-950` | 600 … 950 | ≥ 4.5:1 | text on solid backgrounds |

Steps of different scales mix too: contrast depends only on luminance, and luminance is the same per step for every hue. `text-neutral-700` on `bg-brand-100` passes like `text-brand-700` does.

## Text on a solid color

`on-<step>` is white or the deepest step of the scale (950 in light mode, 50 in dark mode), whichever has more contrast. Use it for buttons and badges:

```html
<button class="bg-brand-600 text-brand-on-600 hover:bg-brand-700">Save</button>
```

## Your exact brand color

The scale contains a color close to your input on the step named `anchor`, with the same hue and chroma, but with lightness adjusted to the target of that step. To keep the exact input, pass `pin: true` (CLI `--pin`). The step then has the contrast of your input, and `checkPalette()` reports it if that breaks a promise:

```sh
npx @sweberdev/gradient "#ec2a20" --pin --check
# fail brand light: 600 on white = 4.27:1, needs 4.5:1
```
