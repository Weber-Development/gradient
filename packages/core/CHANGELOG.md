# @sweberdev/gradient

## 0.3.0

### Minor Changes

- 7312cdc: Check any two colors: `gradient check <foreground> <background>` and `checkPair()` report the WCAG 2 ratio and levels plus the APCA value (WCAG 3 draft); `fixContrast()` finds the closest color, with only lightness changed, that reaches a target. New exports `toScss()` and `toTypeScript()` (CLI `--format scss` and `--format ts`).

## 0.2.0

### Minor Changes

- fd990a3: Status colors (`status: true`, CLI `--status`): success, warning, danger and info scales that match the brand and keep every contrast promise. Color vision checks: `simulate()`, `deltaE()` and `checkDistinguishable()` for protanopia, deuteranopia and tritanopia; `--check` notes pairs that look alike. New dark mode `light-dark` for CSS and Tailwind v4 writes one `light-dark()` value per variable.

## 0.1.0

### Minor Changes

- 231dae2: First release: accessible OKLCH color scales with fixed contrast per step, dark mode, a matching neutral, and export to CSS, Tailwind CSS v4 and v3, design tokens and JSON. Includes the `gradient` CLI.
