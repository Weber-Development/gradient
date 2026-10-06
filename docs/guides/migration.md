---
title: Migrating to Gradient
description: Move from the Tailwind default colors or hand-written color variables, and upgrade between Gradient versions.
---

## From the Tailwind default colors

Gradient uses the same step numbers as Tailwind (50 to 950), so the classes keep their shape: `bg-blue-600 text-white` becomes `bg-brand-600 text-brand-on-600`.

What changes is what the number means. In the Tailwind v3 palette the contrast of a step depends on the hue. On white, `blue-600` (#2563eb) reaches 5.17:1, but `sky-600` (#0284c7) only 4.10:1, `emerald-600` (#059669) 3.77:1 and `yellow-600` (#ca8a04) 2.94:1. So `text-yellow-600` on white fails WCAG AA while `text-blue-600` passes. In Gradient step 600 reaches 4.5:1 on white for every color you start from.

1. Generate the scales and add them next to your current colors:

   ```sh
   npx @sweberdev/gradient "#2563eb" accent=#16a34a --format tailwind --out app/gradient.css
   ```

2. Find out where your current stylesheet breaks the promises, before you change anything:

   ```sh
   npx @sweberdev/gradient audit app/globals.css
   ```

   The audit lists failing pairs and suggests one color per step that fixes all of them. See [Audit an existing stylesheet](audit.md).

3. Replace the color classes one component at a time. A search for `-600` and `-500` finds the text and border colors that matter most. Where you used a lighter step as text, move up to 600 or 700.

4. Delete the old variables when nothing uses them.

## From hand-written color variables

If your variables already end in a step number (`--blue-600`, `--color-brand-500`), `gradient audit` works on them as they are. If they have other names, rename them to `--color-<name>-<step>` first, or generate the Gradient scales and map your names to them:

```css
:root {
  --button-bg: var(--color-brand-600);
  --button-fg: var(--color-brand-on-600);
}
```

Keep the exact brand color with `--pin` (`pin: true` in code) if a design file names it. The contrast check then tells you if that color breaks a promise.

## Upgrading Gradient

Gradient follows [semantic versioning](../reference/stability.md). Every release from 0.1 to 0.8 was backward compatible: no function, option or output format was removed or renamed. New options are optional and new exports do not change existing ones.

One behavior changed in a way you may notice: `contrast()`, `luminance()`, `simulate()` and `deltaE()` accept `rgb()`, `hsl()` and `oklch()` colors as well as hex (0.8.0). Before, they threw on anything but hex.

After an upgrade, regenerate your files with `gradient build` (or the command you used) and look at the diff. With a [config file](config-file.md), `gradient build --verify` in CI tells you when the committed files are out of date.
