---
title: Dark mode
description: How the dark scale works and how to switch between light and dark.
---

The dark scale keeps the step numbers and their meaning. Step 50 is the darkest surface, step 950 the brightest text, and the [contrast targets](steps.md) apply against black. Your markup therefore does not change between modes:

```html
<div class="bg-neutral-50 text-neutral-800">…</div>
```

Saturated colors look brighter on dark backgrounds, so the dark steps are solved for luminance, not copied from the light scale. Your brand red is a lighter red in dark mode at step 600, because that is what 4.5:1 on a dark page needs.

## Switching

The exports write the light values to `:root` and the dark values as overrides. Choose how they apply with `dark` (CLI `--dark`):

| Value | Output | Use when |
|---|---|---|
| `both` (default) | `@media (prefers-color-scheme: dark) { :root:not(.light) {…} }` and `:root.dark, .dark {…}` | System setting by default, a theme toggle can force either mode |
| `media` | `@media (prefers-color-scheme: dark) { :root {…} }` | No toggle |
| `class` | `:root.dark, .dark {…}` | `next-themes` and similar with the `class` strategy |
| `none` | light values only | Light-only sites |

Change the class names with `darkSelector` and `lightSelector` (CLI `--dark-selector`), e.g. `[data-theme="dark"]`.

## Tailwind's `dark:` variant

You do not need it for Gradient colors: the variables switch on their own. If you use `dark:` elsewhere with a class toggle, tell Tailwind v4 about the class:

```css
@custom-variant dark (&:where(.dark, .dark *));
```
