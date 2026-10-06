---
title: Recipes
description: Where Gradient fits into a project, with the commands and files to copy.
---

## Generate before every build

Keep the colors in a [config file](config-file.md) and run `gradient build` before the app builds, so the generated files cannot drift from the config.

```json
{
  "scripts": {
    "colors": "gradient build",
    "prebuild": "gradient build",
    "lint:colors": "gradient build --verify"
  },
  "devDependencies": { "@sweberdev/gradient": "^0.8.0" }
}
```

Commit the generated files. Then reviewers see color changes in the diff, and `gradient build --verify` in CI catches files nobody regenerated.

## Next.js with Tailwind v4 and shadcn/ui

```sh
npx @sweberdev/gradient init "#e30613" --format shadcn --out app/globals.css
npx @sweberdev/gradient build
```

The shadcn output replaces the theme part of `app/globals.css`: the variables for `:root` and `.dark` and the `@theme inline` mapping. Add `{ "file": "app/chart.css", "format": "series", "count": 5 }` to `outputs` for chart colors that stay apart with a color vision deficiency, and import that file as well.

## Vite with plain CSS

```sh
npx @sweberdev/gradient "#e30613" --format css --out src/colors.css
```

```css
@import "./colors.css";

.button {
  background: var(--color-brand-600);
  color: var(--color-brand-on-600);
}
```

## A theme editor in the browser

The library has no Node.js dependency, so a customer-facing editor can use it directly. `renderConfig` returns the files as strings and `checkPalette` the contrast results.

```ts
import { createPalette, toCss, checkPalette } from "@sweberdev/gradient";

function theme(brand: string) {
  const palette = createPalette({ brand }, { status: true });
  return { css: toCss(palette), ok: checkPalette(palette).every((c) => c.pass) };
}
```

## Gradient for a banner or hero

```sh
npx @sweberdev/gradient blend "#e30613" "#0a84ff" --steps 9
```

Use `blend.css` where you need an exact list of stops and `blend.native` (`in oklch`) in current browsers. Check your text with `contrastOnBlend`, see [Gradients](gradients.md).

## Check a pull request

Add the [GitHub Action](github-action.md), or run `gradient build --verify` and `gradient audit <file.css>` in any CI.
