---
title: WCAG and the European Accessibility Act
description: Which WCAG 2.2 criteria Gradient covers, and what it cannot check.
---

Gradient checks contrast, which is one part of an accessible interface. This page says which part.

## What the promises cover

| Criterion | Level | Gradient |
|---|---|---|
| 1.4.3 Contrast (Minimum) | AA | Step 600 reaches 4.5:1 on the page and on step 50. Step 700 reaches 4.5:1 on steps 50 to 200. Text on a filled step (`on-600` to `on-950`) reaches 4.5:1. |
| 1.4.6 Contrast (Enhanced) | AAA | Step 800 reaches 7:1 on the page and on step 50. |
| 1.4.11 Non-text Contrast | AA | Step 500 reaches 3:1 on the page and on step 50: borders, icons and focus rings. The shadcn theme uses it for form field borders. |

Dark mode has the same promises against black and the dark step 50. `gradient --check` fails when one of them breaks, `gradient audit` checks stylesheets you already have, and `gradient check` measures any two colors.

## What it does not cover

- **Use of color (1.4.1).** Information must not depend on color alone. `checkDistinguishable` and `gradient --check` warn when two colors look alike with a color vision deficiency, and the chart colors stay apart, but only you can tell whether a label or an icon is also there.
- **Text over images and gradients.** Measure the worst point yourself, or use `contrastOnBlend` for gradients you build with Gradient.
- **Opacity and overlays.** The checks use opaque colors. Check the result of a semi-transparent color as a color of its own.
- **Everything that is not color.** Focus order, text alternatives, keyboard use and the rest of WCAG need a check of the whole site.

## APCA

The contrast method of the WCAG 3 draft, APCA, is shown by `gradient check` for information. Pass and fail follow WCAG 2.2, because that is the standard the laws refer to.

## The European Accessibility Act

From 28 June 2025, many consumer-facing products and services in the EU have to meet accessibility requirements, and the technical standard behind them, EN 301 549, refers to WCAG 2.1 level AA. WCAG 2.2 level AA includes all of its contrast criteria. A passing Gradient check is evidence for the contrast part of that, not a declaration of conformity. Whether the act applies to you is a legal question that this page does not answer.
