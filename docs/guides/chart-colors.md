---
title: Chart colors
description: Series colors for charts that stay apart for people with a color vision deficiency.
---

Chart libraries ship default series colors, and many of them blur into one color for people with red-green deficiency. `createSeries` picks colors that stay apart.

```sh
npx @sweberdev/gradient series "#e30613" --count 5
```

```css
:root {
  --chart-1: #d4312b;
  --chart-2: #4a64e8;
  …
}
.dark {
  --chart-1: #e03e35;
  …
}
```

```ts
import { createSeries } from "@sweberdev/gradient";

const { light, dark, distance } = createSeries("#e30613", { count: 5 });
```

## How it picks

The first color has your brand hue. Every next color is chosen from a pool of all hues in 15 degree steps at four lightness levels (steps 500 to 800): the one whose closest neighbor is farthest away. Distance is the perceptual ΔE in OKLab, measured with normal vision and with simulated protanopia, deuteranopia and tritanopia, in light and dark mode. Every color reaches 3:1 on the page, the minimum for graphical objects (WCAG 1.4.11).

`distance` is the smallest distance between any two colors. From 0.08 the colors are clearly different. With the usual brand colors, up to six series reach that. For seven or eight, the distance drops to around 0.055 to 0.09: label lines and bars directly or use different markers instead of relying on the legend.

## Options

`createSeries(brand, { count })` with `count` from 2 to 8 (default 6). On the command line `--count <n>` and `--format css | json | table`. The CSS format writes `--chart-1` and so on for `:root` and the dark selector.

The same colors fill `chart-1` to `chart-5` in the [shadcn/ui theme](shadcn.md).
