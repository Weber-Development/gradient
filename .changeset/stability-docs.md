---
"@sweberdev/gradient": minor
---

Preparation for 1.0. `contrast()`, `luminance()`, `simulate()` and `deltaE()` now accept `rgb()`, `hsl()` and `oklch()` colors like every other function, not only hex. `PROMISES` is exported. The tests now snapshot the exported names and every output format for three reference palettes, so an unintended change to the API or to generated colors fails the build. New documentation: a stability policy, WCAG and EAA coverage, recipes and a migration guide.
