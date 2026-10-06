---
title: Gradients
description: Gradients between brand colors that stay lively in the middle and show whether text on them stays readable.
---

A CSS gradient between two colors blends in sRGB. Between complementary colors such as blue and yellow that passes through a muddy grey. `createBlend` blends in OKLCH instead: lightness, colorfulness and hue move in even steps, so the middle stays as colorful as the ends.

```sh
npx @sweberdev/gradient blend "#e30613" "#0a84ff" --steps 7
```

```css
background: linear-gradient(90deg, #e30613, #d3006a, …, #0a84ff);
/* or, in current browsers: */
background: linear-gradient(90deg in oklch, #e30613, #0a84ff);
```

```ts
import { contrastOnBlend, createBlend } from "@sweberdev/gradient";

const blend = createBlend(["#e30613", "#0a84ff"], { steps: 9, angle: 135 });
blend.stops;  // hex colors, the first and last are yours
blend.css;    // linear-gradient with all stops, works everywhere
blend.native; // linear-gradient(... in oklch ...), the browser blends
```

## Options

| Option | Default | |
|---|---|---|
| `steps` | `9` | Number of stops, 2 to 64 |
| `angle` | `90` | CSS angle for the strings |
| `hue` | `"shorter"` | `"longer"` turns the hue the long way round, for rainbow-like gradients |

With three or more colors the gradient runs through each of them in order. A grey or white end takes the hue of its partner, so a gradient from white to a color does not drift.

## Text on a gradient

Text has to pass on the worst stop, not the middle one.

```ts
contrastOnBlend(blend, "#ffffff"); // { min: 4.2, max: 5.6, pass: false, required: 4.5 }
contrastOnBlend(blend, "#ffffff", 3); // for large text
```

On the command line, `--format json` prints the stops, `--format table` one color per line, `--steps` and `--angle` set the number and direction.
