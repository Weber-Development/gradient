---
title: Why Gradient
description: Color scales where the step number tells you the contrast, in light and dark mode.
---

A brand usually starts with one color. A product needs eleven: light backgrounds, borders, hover states, text, and all of it again for dark mode. Most generators produce those steps by spacing lightness evenly. That looks fine in a swatch row, but contrast then depends on the hue: `blue-600` is readable on white, `yellow-600` often is not. You find out in an accessibility audit.

Gradient starts from contrast instead:

- **Fixed contrast per step.** Each step is solved for a target luminance, so step 600 reaches 4.5:1 on white for red, blue and yellow alike. See [What the steps promise](guides/steps.md).
- **Dark mode with the same promises.** The dark scale uses the same step numbers against a dark page, so one set of classes works in both modes. See [Dark mode](guides/dark-mode.md).
- **OKLCH.** Hue and chroma are kept perceptually even. Colors outside sRGB are brought in by lowering chroma only, never by shifting lightness, so the contrast stays where it was solved.
- **A matching neutral.** A grey tinted with the hue of your brand, with the same steps.
- **Exports.** [Tailwind CSS v4 and v3](guides/tailwind.md), [CSS variables, design tokens and JSON](guides/css-and-tokens.md).
- **Zero dependencies.** One small ESM/CJS module and a [CLI](guides/cli.md).

## What Gradient does not do

Contrast ratios cover WCAG 2.2 success criteria 1.4.3 (text), 1.4.6 (enhanced) and 1.4.11 (non-text). They say nothing about color blindness, or whether information is conveyed by color alone. Gradient makes the safe choice easy; it does not check how you use it.

## Package

| Package | License | Content |
|---|---|---|
| `@sweberdev/gradient` | MIT | Scale generator, contrast checks, exports, CLI |
