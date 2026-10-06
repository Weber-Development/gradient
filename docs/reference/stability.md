---
title: Stability
description: What stays the same within a major version of Gradient, and how the tests enforce it.
---

Gradient 1.0 is the first stable release, and from here it follows semantic versioning. This page says what that covers.

## What is stable

- **Exports.** Every name exported from `@sweberdev/gradient`, with its parameters and return type. A name is not removed or renamed within a major version. A deprecated name keeps working until the next major version and is marked `@deprecated` in the types.
- **Command line.** Subcommands, options and exit codes. `0` means the check passed, `1` means a check failed, `2` means wrong usage.
- **Config file.** Fields of `gradient.config.json`. Unknown fields are an error, so new fields only arrive in minor versions.
- **Contrast promises.** Step 500 reaches 3:1, 600 reaches 4.5:1, 700 reaches 4.5:1 on steps 50 to 200 and 800 reaches 7:1, in light mode against white and in dark mode against black. A release never weakens a promise.
- **Generated colors.** For the same input and options, the generated colors and files stay byte for byte the same within a major version. The only exception is a fix for a broken promise, which is named in the changelog.

## What may change in a minor version

- New exports, options, formats and subcommands.
- New fields in returned objects. Do not compare returned objects with strict equality; read the fields you need.
- Wording of messages and of the table output. Use `--json`, `--format json` or the API to read results.
- The suggestion `gradient audit` and `fixContrast` make for a failing color, as long as it passes.
- Chart series and blends picked by `createSeries` and `createBlend`, `extractColors` and `pickBrand`: their guarantees (distance of series colors, endpoints of a blend, determinism) stay, the exact colors may be improved in a minor version and the changelog says so.

## How the tests enforce it

The test suite keeps a snapshot of the exported names and a snapshot of every export format for three reference palettes (a red, a yellow that is hard for contrast and a pinned indigo). A change that alters the public API or a generated file fails the tests until the snapshot is updated on purpose, and the pull request has to say so in its changeset. A sweep over 36 hues, four levels of colorfulness and three lightnesses checks the contrast promises on every run.

## Runtimes and size

CI builds the package and runs a smoke test of the ESM build, the CommonJS build and the command line on Node.js 20, Node.js 22, Bun and Deno. The library uses no Node.js APIs (a test checks that only the command line imports `node:` modules), so it also runs in browsers, edge runtimes and workers.

The whole library is about 10 kB gzipped and a test keeps it under 15 kB. It is tree-shakeable (`sideEffects: false`): importing only `contrast` adds about 1.5 kB.

Test coverage is above 95 % of statements, with a floor in the CI configuration that only goes down on purpose.

## Support

Bug fixes go to the latest version of the current major version. Gradient runs on Node.js 20 and newer.
