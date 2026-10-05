---
title: Status colors and color vision
description: Success, warning, danger and info scales that match your brand, and a check for color vision deficiencies.
---

## Status colors

```ts
const palette = createPalette({ brand: "#0a84ff" }, { status: true });
```

```sh
npx @sweberdev/gradient "#0a84ff" --status --format tailwind --out app/gradient.css
```

This adds four scales with the same steps and the same [contrast promises](steps.md) as your brand: `success` (green), `warning` (amber), `danger` (red) and `info` (blue). Their chroma follows your brand color within a range where green still reads as green, so a muted brand gets calmer status colors and a vivid brand gets brighter ones.

Override single colors, or pass them as normal colors, which always win:

```ts
createPalette({ brand: "#0a84ff", danger: "#d4351c" }, { status: { warning: "#ffdd00" } });
```

```html
<p class="rounded-md bg-danger-50 p-3 text-danger-800">Payment failed.</p>
```

## Color vision deficiencies

About one in twelve men has a red-green color vision deficiency. Because the steps of all scales share their luminance, `success-600` and `danger-600` differ only in hue, and for someone with deuteranopia they can look almost the same. That is not a contrast problem; it means color must not be the only signal (WCAG 1.4.1).

`checkDistinguishable(palette)` compares every pair of colored scales at step 600, with normal vision and simulated protanopia, deuteranopia and tritanopia (Machado et al. 2009). A pair fails when the distance in OKLab drops below 0.08.

```ts
import { checkDistinguishable, simulate } from "@sweberdev/gradient";

checkDistinguishable(palette).filter((c) => !c.pass);
// [{ a: "success", b: "danger", mode: "light", vision: "deuteranopia", distance: 0.069, pass: false }, …]

simulate("#e30613", "deuteranopia"); // how the color looks, as hex
```

`gradient --check` prints these pairs as notes, without changing the exit code. Where a pair looks alike, add an icon or a label next to the color.
