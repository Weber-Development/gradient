---
title: Config file and build
description: Keep your colors in gradient.config.json and generate every file with one command.
---

Instead of a long command per file, describe your colors once in `gradient.config.json` and run `gradient build`. The same file feeds the [GitHub Action](github-action.md), which fails a pull request when someone changes the colors without regenerating the files.

```sh
npx @sweberdev/gradient init "#e30613" accent=#0a84ff --format shadcn --out app/globals.css
npx @sweberdev/gradient build
```

`init` writes a starter `gradient.config.json` and does not overwrite an existing one. `build` writes every file in it.

```json
{
  "$schema": "https://unpkg.com/@sweberdev/gradient/gradient.config.schema.json",
  "colors": { "brand": "#e30613", "accent": "#0a84ff" },
  "palette": { "status": true },
  "outputs": [
    { "file": "app/globals.css", "format": "shadcn" },
    { "file": "src/colors.ts", "format": "ts" },
    { "file": "app/chart.css", "format": "series", "count": 5 }
  ],
  "audit": ["app/legacy.css"]
}
```

The `$schema` line gives your editor completion and error checking.

## Fields

| Field | |
|---|---|
| `colors` | Named colors. The first one is the brand color. Required. |
| `palette` | Options of `createPalette`: `status`, `pin`, `neutral`, `saturation`, `hueShift`. |
| `outputs` | The files to write. Required, each file only once. |
| `audit` | Existing stylesheets to check against the contrast promises. |

Each output has a `file` (relative to the config file) and a `format`: `css`, `tailwind`, `tailwind3`, `scss`, `ts`, `shadcn`, `tokens`, `json`, `table` or `series` (chart colors, see [Chart colors](chart-colors.md)). Optional per output: `dark` (`both`, `media`, `class`, `light-dark`, `none`; shadcn defaults to `class`), `darkSelector`, `hex`, `prefix` and, for `series`, `count`.

An unknown key or a wrong value is an error that names the field, so a typo does not silently do nothing.

## Verify in CI

```sh
npx @sweberdev/gradient build --verify
```

`--verify` writes nothing. It exits with `1` when a file is missing or differs from what the config produces, when a contrast promise fails (for example with `pin`), or when an audited stylesheet fails. `--json` and `--markdown` print the result for other tools.

## In code

```ts
import { parseConfig, renderConfig } from "@sweberdev/gradient";

const config = parseConfig(JSON.parse(text));
const { outputs, checks } = renderConfig(config); // [{ file, content }], contrast checks
```

`renderConfig` touches no files, so it also runs in the browser.
