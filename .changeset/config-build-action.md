---
"@sweberdev/gradient": minor
---

One config file and a GitHub Action. `gradient.config.json` describes your colors and the files to generate; `gradient build` writes them all, `gradient build --verify` fails when a file is out of date, a contrast promise breaks or an audited stylesheet fails, and `gradient init` writes a starter config. A JSON schema ships with the package. `parseConfig()` and `renderConfig()` do the same in code. The new action `Weber-Development/gradient` checks pull requests and keeps one comment with the result; `audit` and `build` print Markdown with `--markdown`.
