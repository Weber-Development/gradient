# Release checklist (package-launch)

| Item | Status |
|---|---|
| Repo `Weber-Development/gradient` | private, created by the werkbank workflow "Neues Package" (no Pro) |
| npm `@sweberdev/gradient` | 0.1.0 is published by the Release workflow once the "version packages" PR is merged (`NPM_TOKEN` set by the workflow) |
| packages.sweber.dev | entry, docs config and live demo at `/gradient/demo` in `sxwxbxr/portfoliov3` |
| Docs | Markdown in `docs/` with `nav.json`, rendered at packages.sweber.dev/gradient/docs once the repo is public |
| Pro / Polar | none for now: Gradient is the free, open-source package of the family |
| Trademark check "Gradient" | open (Seya); the npm name is scoped, so no clash there |

## Open (Seya)

- [ ] Merge the "version packages" PR so 0.1.0 is published to npm.
- [ ] Say "öffentlich machen" so the repo goes public and the docs render.

## Later

- Replace the vendored copy of the library in the portfolio demo with the npm package.
- Lattice (Swiss-design UI library) can use Gradient for its color tokens.
