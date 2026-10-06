---
"@sweberdev/gradient": minor
---

shadcn/ui theme: `toShadcn()` and `--format shadcn` write the semantic variables (`--background`, `--primary`, `--muted-foreground`, …) for light and dark mode, picked from the palette so the contrast promises hold, with the `@theme inline` mapping for Tailwind v4; `shadcnTokens()` returns them as hex. Chart colors: `createSeries()` and `gradient series` pick up to eight series colors that stay apart under protanopia, deuteranopia and tritanopia and reach 3:1 on the page; they also fill `chart-1` to `chart-5` of the shadcn theme.
