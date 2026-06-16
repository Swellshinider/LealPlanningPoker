# Changesets

Changesets help us track changes and generate the changelog for each release.

## Adding a changeset

Before opening a pull request with a user-facing change, run:

```bash
pnpm changeset
```

You'll be prompted to:

1. **Select packages** -- choose the package(s) affected by your change. If your change only affects unpublished apps (`@lealplanningpoker/server` or `@lealplanningpoker/web`), the root `lealplanningpoker` entry still feeds the `docs/CHANGELOG.md` entry.
2. **Choose bump type**:
   - `patch` -- bug fix
   - `minor` -- new feature, backwards-compatible
   - `major` -- breaking change
3. **Write a summary** -- one or two sentences. This text becomes the changelog entry.

Commit the generated `.changeset/<random-name>.md` file alongside your code.

## Consuming changesets

Maintainers run:

```bash
pnpm version-packages
```

This consumes all changesets, bumps versions, and updates `docs/CHANGELOG.md`. The result is committed, then tagged (e.g. `v0.1.0`) to trigger the release workflow.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full workflow.
