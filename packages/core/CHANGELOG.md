# @sweberdev/gradient

## 0.5.0

### Minor Changes

- f066fb7: Audit an existing stylesheet: `gradient audit app/globals.css` and `auditCss()` check custom properties named like `--color-brand-600` (light, dark class or media, `light-dark()`) against the contrast promises of the step numbers and suggest one color per step that fixes every pair it is part of. Exits with 1 on a failing pair, `--json` prints the full result. A new test sweeps every hue, three chroma ranges and three lightness levels to keep the promises for any input color.

## 0.4.0

### Minor Changes

- ef02fc4: shadcn/ui theme: `toShadcn()` and `--format shadcn` write the semantic variables (`--background`, `--primary`, `--muted-foreground`, …) for light and dark mode, picked from the palette so the contrast promises hold, with the `@theme inline` mapping for Tailwind v4; `shadcnTokens()` returns them as hex. Chart colors: `createSeries()` and `gradient series` pick up to eight series colors that stay apart under protanopia, deuteranopia and tritanopia and reach 3:1 on the page; they also fill `chart-1` to `chart-5` of the shadcn theme.

## 0.3.0

### Minor Changes

- 7312cdc: Check any two colors: `gradient check <foreground> <background>` and `checkPair()` report the WCAG 2 ratio and levels plus the APCA value (WCAG 3 draft); `fixContrast()` finds the closest color, with only lightness changed, that reaches a target. New exports `toScss()` and `toTypeScript()` (CLI `--format scss` and `--format ts`).

## 0.2.0

### Minor Changes

- fd990a3: Status colors (`status: true`, CLI `--status`): success, warning, danger and info scales that match the brand and keep every contrast promise. Color vision checks: `simulate()`, `deltaE()` and `checkDistinguishable()` for protanopia, deuteranopia and tritanopia; `--check` notes pairs that look alike. New dark mode `light-dark` for CSS and Tailwind v4 writes one `light-dark()` value per variable.

## 0.1.0

### Minor Changes

- 231dae2: First release: accessible OKLCH color scales with fixed contrast per step, dark mode, a matching neutral, and export to CSS, Tailwind CSS v4 and v3, design tokens and JSON. Includes the `gradient` CLI.
