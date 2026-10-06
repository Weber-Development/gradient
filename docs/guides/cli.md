---
title: CLI
description: All options of the gradient command.
---

```sh
npx @sweberdev/gradient <color> [name=color ...] [options]
npx @sweberdev/gradient check <foreground> <background> [--target <ratio>]
npx @sweberdev/gradient series <color> [--count <n>] [--format css|json|table]
```

Colors can be hex (`#e30613`, `#f00`), `rgb()`, `hsl()` or `oklch()`. Quote them in the shell. The first color is named `brand` unless you pass `--name` or `name=color`.

| Option | Default | |
|---|---|---|
| `--name <name>` | `brand` | Name of the first color |
| `--format <format>` | `css` | `css`, `tailwind` (v4), `tailwind3`, `scss`, `ts`, `shadcn`, `tokens`, `json`, `table` |
| `--dark <mode>` | `both` | `both`, `media`, `class`, `light-dark`, `none` |
| `--dark-selector <sel>` | `.dark` | Class or attribute that turns dark mode on |
| `--hex` | | `css` and `shadcn`: hex values instead of `oklch()` |
| `--prefix <prefix>` | `color` | `css` and `scss`: variable prefix (`scss` has none by default) |
| `--status` | | Add `success`, `warning`, `danger` and `info` scales |
| `--no-neutral` | | Do not add the tinted grey `neutral` |
| `--neutral-chroma <n>` | auto | Chroma of the neutral, `0` for pure grey |
| `--saturation <n>` | `1` | Multiply the chroma of all steps |
| `--hue-shift <deg>` | `0` | Turn the hue from the lightest to the darkest step |
| `--pin` | | Put the exact input color on its closest step |
| `--out <file>` | stdout | Write to a file |
| `--check` | | Print failed contrast checks; exit code `1` if one fails. Also notes colors that look alike with a color vision deficiency |
| `--target <ratio>` | `4.5` | `check`: contrast the pair needs |
| `--count <n>` | `6` | `series`: number of chart colors, 2 to 8 |

## Check two colors

`gradient check` measures any pair, also colors that are not in a palette. It exits with `1` when the pair is below `--target` (default 4.5) and suggests the closest color that passes. See [Check any two colors](check-colors.md).

```sh
npx @sweberdev/gradient check "#ff5a5f" "#ffffff"
```

## Chart colors

`gradient series` prints colors for charts that stay apart under color vision deficiencies. `--count <n>` sets the number (2 to 8, default 6). See [Chart colors](chart-colors.md).

## In CI

Keep the generated file in the repository and check it in CI when you pin your brand color:

```sh
npx @sweberdev/gradient "#e30613" --pin --check --format tailwind --out app/gradient.css
git diff --exit-code app/gradient.css
```
