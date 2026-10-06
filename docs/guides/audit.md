---
title: Audit an existing stylesheet
description: Check the colors of a project you already have against the contrast promises of the step numbers.
---

You do not have to start from a generated palette. If your stylesheet has color steps, `gradient audit` tells you which ones break the promises, and suggests a color that passes.

```sh
npx @sweberdev/gradient audit app/globals.css
```

```
app/globals.css
  brand light: 14/14 pairs pass
  brand dark: 14/14 pairs pass
  yellow light: 0/2 pairs pass
    fail 600 on white = 2.94:1, needs 4.5:1 (try #9d6a00)
    fail 600 on 50 = 2.83:1, needs 4.5:1 (try #9d6a00)
```

The command exits with `1` when a pair fails, so it works in CI. `--json` prints the full result for your own tooling.

## What it reads

Custom properties whose name ends in a step number, with or without the `color-` prefix, so `--color-brand-600`, `--brand-600` and the text color `--color-brand-on-600` all count. This covers Tailwind v4 `@theme` blocks and the CSS from `gradient` itself, but also hand-written systems like `--blue-500`.

- **Light mode** comes from `:root` and everything else, **dark mode** from a `.dark` rule, `[data-theme="dark"]` or a `prefers-color-scheme: dark` block. A value written as `light-dark(a, b)` counts for both.
- Colors can be hex, `rgb()`, `hsl()` or `oklch()`. Variables that point to another variable (`var(--x)`) are skipped and counted.
- Groups with only some of the steps are checked for the pairs they have. Variables that do not end in a step number are ignored.

Light mode is measured against white and dark mode against black, as in the [step guide](steps.md#safe-pairs).

## The suggestion

A step is part of several pairs, for example 600 on white and 600 on 50. The suggested color keeps hue and chroma, changes only the lightness, and reaches all of them at once, so you can replace the value and be done.

## In code

```ts
import { readFileSync } from "node:fs";
import { auditCss } from "@sweberdev/gradient";

const result = auditCss(readFileSync("app/globals.css", "utf8"));
result.scales; // ["brand", "yellow", "neutral"]
result.checks.filter((c) => !c.pass); // { scale, mode, foreground, background, ratio, required, fix }
result.skipped; // variables that are not plain colors
```
