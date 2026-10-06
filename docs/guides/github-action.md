---
title: GitHub Action
description: Check pull requests for out-of-date color files and contrast problems, with a comment on the pull request.
---

The action rebuilds the files of your `gradient.config.json`, compares them with the committed ones and audits your stylesheets. It writes the result to the job summary and, on pull requests, to one comment that is updated on every push. The check fails when a file is out of date or a contrast pair fails.

```yaml
name: Colors
on: pull_request

permissions:
  contents: read
  pull-requests: write

jobs:
  gradient:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Weber-Development/gradient@v1
        with:
          audit: app/legacy.css
```

## Inputs

| Input | Default | |
|---|---|---|
| `config` | `gradient.config.json` | Config file. Skipped if it does not exist. |
| `audit` | none | Stylesheets to audit, separated by spaces or new lines. |
| `version` | `latest` | Version of `@sweberdev/gradient` to run. Pin it for reproducible builds. |
| `comment` | `true` | Comment on the pull request. Needs `pull-requests: write`. |

The action fails if it has nothing to check. Pull requests from forks get a read-only token, so the comment is skipped there and the result stays in the job summary.

## Without the action

The same checks run as plain commands in any CI:

```sh
npx @sweberdev/gradient build --verify
npx @sweberdev/gradient audit app/legacy.css
```
