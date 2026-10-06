---
title: Getting started
description: Generate a palette from your brand color and use it in your project.
---

1. Preview the scale with contrast ratios:

   ```sh
   npx @sweberdev/gradient "#e30613" --format table
   ```

   The first line names the step closest to your color, e.g. `closest step 600`.

2. Write the stylesheet. For Tailwind CSS v4:

   ```sh
   npx @sweberdev/gradient "#e30613" accent=#0a84ff --format tailwind --out app/gradient.css
   ```

   ```css
   /* app/globals.css */
   @import "tailwindcss";
   @import "./gradient.css";
   ```

   Without Tailwind, use `--format css` and import the file anywhere.

3. Use the steps:

   ```html
   <section class="bg-brand-50">
     <h2 class="text-brand-900">Angebot</h2>
     <p class="text-neutral-700">Body text on a tinted surface passes WCAG AA.</p>
     <button class="bg-brand-600 text-brand-on-600">Bestellen</button>
   </section>
   ```

   Dark mode follows the system setting, and a `dark` class on `<html>` switches it on as well. The classes stay the same.

## In code

```sh
pnpm add -D @sweberdev/gradient
```

```ts
import { createPalette, toTailwind } from "@sweberdev/gradient";
import { writeFileSync } from "node:fs";

const palette = createPalette({ brand: "#e30613" });
writeFileSync("app/gradient.css", toTailwind(palette));
```

The library also runs in the browser, for example in a theme editor.

## Requirements

- Node.js 20 or newer for the CLI (Bun and Deno work too, CI tests all of them)
- Any browser from 2023 on for `oklch()` values; use `--hex` for older ones
- The library itself has no dependencies and no Node.js APIs. It is about 10 kB gzipped and tree-shakeable, see [Stability](reference/stability.md#runtimes-and-size).
