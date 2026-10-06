---
"@sweberdev/gradient": minor
---

Release candidate for 1.0. `extractColors()` now returns the exact color of flat areas (a pure red pixel gave `#f80808`, the center of its histogram bin, instead of `#ff0000`). CI now runs the built package on Node.js 20, Node.js 22, Bun and Deno, the tests enforce a bundle size under 15 kB gzipped (the whole library is about 10 kB), that only the command line imports `node:` modules, that every exported function appears in the docs, and a coverage floor of 95 % lines. The API reference now lists `stepsOf`, `STATUS_NAMES`, `STATUS_HUES`, `DEFICIENCIES` and `CONFIG_FORMATS`.
