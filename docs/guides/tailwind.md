---
title: Tailwind CSS
description: Use Gradient scales as Tailwind CSS v4 theme colors or in a Tailwind v3 config.
---

## Tailwind CSS v4

```sh
npx @sweberdev/gradient "#e30613" accent=#0a84ff --format tailwind --out app/gradient.css
```

```css
@import "tailwindcss";
@import "./gradient.css";
```

The file defines the light values in `@theme` and overrides the same variables for dark mode. You get `bg-brand-500`, `text-accent-700`, `border-neutral-200`, `text-brand-on-600`, opacity modifiers like `bg-brand-500/20`, and the colors as CSS variables (`var(--color-brand-500)`).

To replace Tailwind's default palette entirely, add `--color-*: initial;` in your own `@theme` block before the import.

## Tailwind CSS v3

```sh
npx @sweberdev/gradient "#e30613" --format tailwind3 --out styles/gradient.css
```

The file holds the variables as OKLCH channels and, in a comment at the end, the `colors` object for your config. In code:

```js
// tailwind.config.js
import { createPalette, toTailwindV3 } from "@sweberdev/gradient";

const { colors } = toTailwindV3(createPalette({ brand: "#e30613" }));

export default {
  darkMode: "class",
  theme: { extend: { colors } },
};
```

Each color is `oklch(var(--color-brand-500) / <alpha-value>)`, so opacity modifiers work.
