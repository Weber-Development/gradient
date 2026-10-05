# @sweberdev/gradient

## 0.2.0

### Minor Changes

- fd990a3: Status colors (`status: true`, CLI `--status`): success, warning, danger and info scales that match the brand and keep every contrast promise. Color vision checks: `simulate()`, `deltaE()` and `checkDistinguishable()` for protanopia, deuteranopia and tritanopia; `--check` notes pairs that look alike. New dark mode `light-dark` for CSS and Tailwind v4 writes one `light-dark()` value per variable.

## 0.1.0

### Minor Changes

- 231dae2: First release: accessible OKLCH color scales with fixed contrast per step, dark mode, a matching neutral, and export to CSS, Tailwind CSS v4 and v3, design tokens and JSON. Includes the `gradient` CLI.
