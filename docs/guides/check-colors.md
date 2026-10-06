---
title: Check any two colors
description: WCAG 2 and APCA contrast for any pair, with the closest color that passes.
---

The palette promises its contrast pairs, but real interfaces also have colors from elsewhere: a logo, a photo overlay, a color from a design file. `gradient check` measures any pair.

```sh
npx @sweberdev/gradient check "#ff5a5f" "#ffffff"
```

```
#ff5a5f on #ffffff
WCAG 2   3.05:1
  text        AA fail   AAA fail
  large text  AA pass   AAA fail
  icons, UI   pass (3:1)
APCA     Lc 56.3 (WCAG 3 draft, for information)
Needs 4.5:1. Closest color that passes: #db3742 (4.52:1, same hue).
```

The first color is the text, the second the background. The command exits with `1` when the pair is below `--target` (default 4.5), so it works in CI. `--target 7` checks for AAA, `--target 3` for large text, icons and borders.

## The suggestion

When a pair fails, Gradient keeps hue and chroma of the text color and moves only its lightness until the target holds, darker or lighter, whichever is closer. The color still looks like yours, only darker or lighter. If no lightness reaches the target on that background, it says so.

## In code

```ts
import { checkPair, fixContrast } from "@sweberdev/gradient";

checkPair("#ffffff", "#e30613");
// { ratio: 4.88, aa: true, aaLarge: true, aaa: false, aaaLarge: true, apca: -76.5, … }

fixContrast("#ff5a5f", "#ffffff"); // "#db3742"
fixContrast("#ffd60a", "#ffffff", 7); // "#6a5700"
```

## WCAG 2 and APCA

WCAG 2.2 is the standard the law refers to (European Accessibility Act, EN 301 549), so the pass and fail results use it. APCA is the method in the WCAG 3 working draft. It treats text and background differently and rates light text on dark backgrounds more strictly, which matches how people read better than the WCAG 2 ratio. Gradient shows the APCA value (Lc) for information. As a rough guide, body text wants |Lc| 75 or more, large text 60, icons and borders 45.
