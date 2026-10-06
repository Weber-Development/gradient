---
title: shadcn/ui theme
description: One brand color to the semantic colors of shadcn/ui, with contrast that holds in light and dark mode.
---

shadcn/ui themes are a list of semantic variables: `--background`, `--primary`, `--muted-foreground` and so on. Most generators pick them by eye. Gradient picks them from the palette steps, so the contrast promises carry over.

```sh
npx @sweberdev/gradient "#e30613" --format shadcn --out app/globals.css
```

The file contains the variables for `:root` and `.dark`, and the `@theme inline` block that maps them to Tailwind v4 colors, so `bg-primary` and `text-muted-foreground` work. Replace the theme section of your `globals.css` with it. Dark mode uses the `.dark` class, as shadcn/ui does; `--dark media`, `--dark both` and `--dark light-dark` work too.

## What goes where

| Variable | Step | Guaranteed |
|---|---|---|
| `background` | neutral 50 | |
| `foreground`, `card-foreground`, `popover-foreground` | neutral 900 | 7:1 on `background` and `card` |
| `card`, `popover` | white (light), neutral 100 (dark) | |
| `primary` / `primary-foreground` | brand 600 / its text color | 4.5:1 |
| `secondary` / `secondary-foreground` | neutral 100 / neutral 900 | 4.5:1 |
| `muted` / `muted-foreground` | neutral 100 / neutral 700 | 4.5:1, also on `background` |
| `accent` / `accent-foreground` | brand 100 / brand 900 | 4.5:1 |
| `destructive` / `destructive-foreground` | danger 600 / its text color | 4.5:1 |
| `border` | neutral 200 | decorative |
| `input` | neutral 500 | 3:1 on the page, so form fields meet WCAG 1.4.11 |
| `ring` | brand 500 | 3:1 |
| `chart-1` to `chart-5` | [chart colors](chart-colors.md) | 3:1 |

The `danger` scale is derived from your brand when the palette has none. To use your own red, pass it in code:

```ts
import { createPalette, toShadcn } from "@sweberdev/gradient";

const palette = createPalette({ brand: "#e30613" }, { status: { danger: "#d4351c" } });
toShadcn(palette, { format: "hex" });
```

## Options

`toShadcn(palette, options?)` takes `format` (`"oklch"` default, or `"hex"`), `dark` (`"class"` default), `darkSelector` and `theme` (`false` leaves out the `@theme inline` block). `shadcnTokens(palette)` returns the values as hex per mode, for your own tooling.

The default `shadcn/ui` input border is a light grey that fails 3:1 on white. Gradient's `input` is darker on purpose. If you prefer the lighter look, override `--input` after the generated block.
