# Contributing Guide

## Commit Message Convention

We use **Conventional Commits** with commitlint + husky.

Format:

```text
<type>(<scope>): <subject>
```

Examples:

- `feat(api): add alerts acknowledge endpoint`
- `fix(overview): handle empty stats response`
- `refactor(services): split dashboard logic by domain`

### Allowed `type`

- `feat` new feature
- `fix` bug fix
- `refactor` code refactor without behavior change
- `perf` performance improvements
- `docs` documentation only changes
- `test` tests
- `chore` tooling/dependency tasks
- `build` build system or dependency affecting build
- `ci` CI configuration
- `revert` revert a previous commit

### `scope`

Use a short kebab-case scope, such as:

- `api`
- `overview`
- `jobs`
- `nodes`
- `events`
- `alerts`
- `services`
- `db`
- `ui`

### `subject`

- use imperative mood (e.g. "add", "fix", "refactor")
- keep concise
- no trailing period

## Local hooks

- `pre-commit`: runs `npm run lint`
- `commit-msg`: validates message with commitlint

If your commit is rejected, adjust the message format and retry.
