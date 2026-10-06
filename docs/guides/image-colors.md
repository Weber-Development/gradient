---
title: Colors from an image
description: Find the dominant colors of a logo or photo and pick a brand color from them.
---

`extractColors` takes the pixels of an image and returns its dominant colors with their share. `pickBrand` picks the one that makes a good brand color. Gradient has no dependencies, so you bring the pixels: in the browser from a canvas, in Node from an image library.

```ts
import { createPalette, extractColors, pickBrand } from "@sweberdev/gradient";

const ctx = canvas.getContext("2d");
const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

const colors = extractColors(data, { count: 5 });
// [{ hex: "#e30613", share: 0.61 }, { hex: "#0a84ff", share: 0.27 }, …]

const brand = pickBrand(colors);
if (brand) createPalette({ brand });
```

`data` is a flat RGBA array (`ImageData.data`, or a Node `Buffer`). The result is deterministic: the same image always gives the same colors.

## How it works

1. Pixels with an alpha below 128 are ignored. Large images are sampled, at most about 40,000 pixels.
2. A 4-bit color histogram gives the starting colors.
3. k-means in OKLab, which measures distance the way people see it, groups them into `count` colors (1 to 12, default 5).
4. The result is sorted by share.

## Picking a brand color

`pickBrand` chooses the color with the highest share times colorfulness. Near-white, near-black and greys are skipped, so a logo on a white background gives the logo color, not white. It returns `null` if the image has no colorful color; then choose by hand.

There is no command line version, because the command line cannot decode images. The [live demo](https://packages.sweber.dev/gradient/demo) lets you drop an image and use the pick as the brand.
