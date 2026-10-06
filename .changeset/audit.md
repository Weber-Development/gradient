---
"@sweberdev/gradient": minor
---

Audit an existing stylesheet: `gradient audit app/globals.css` and `auditCss()` check custom properties named like `--color-brand-600` (light, dark class or media, `light-dark()`) against the contrast promises of the step numbers and suggest one color per step that fixes every pair it is part of. Exits with 1 on a failing pair, `--json` prints the full result. A new test sweeps every hue, three chroma ranges and three lightness levels to keep the promises for any input color.
