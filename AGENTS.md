# AGENTS.md

Guidance for AI agents contributing to `opencode-no-verify-blocker`.

## What this is

A small open-source npm package: an [OpenCode](https://opencode.ai) plugin that blocks AI agents from bypassing pre-commit hooks via `git commit --no-verify` / `git commit -n`.

The shipped runtime is one file (`dist/index.mjs`, ~2 KB) plus a `.d.mts` declaration. Detection logic is in `src/detector.ts`; the plugin entry is `src/index.ts`.

## Conventions

- **Default error message is English.** Users override via `customMessage` option.
- **`findForbiddenFlags` is self-contained but only flags `--no-verify`.** Short flag `-n` is gated by `hasShortNInGitCommitContext` (which combines with `looksLikeGitCommit`) to avoid false-positives on `echo -n` / `npm -n install`.
- **Don't add shell parsing.** We deliberately use a whitespace tokenizer. A user can put `--no-verify` inside an unexecuted `echo` and we'll miss it — that's acceptable.
- **Throw, don't mutate.** OpenCode issue #31680 means `output.args` in-place mutation does not work in 1.17.7/1.17.8. We can only `throw new Error()`.

## Commands

```bash
vp install         # install deps (after clone / dep change)
vp test            # run vitest
vp check           # format + lint + typecheck
vp pack            # build dist/
```

## Review checklist

- [ ] `vp test` — 48 tests pass (35 detector + 13 plugin)
- [ ] `vp check` — 0 errors
- [ ] `vp pack` — produces `dist/index.mjs` and `dist/index.d.mts`
- [ ] No new file is added that isn't strictly needed (no .editorconfig, no .eslintrc, no .github workflows)
- [ ] Default error message stays English; any non-English message must come from `customMessage`

## Adding detection rules

If you want to block another flag (e.g. `git push --no-verify` once git supports it), edit `src/detector.ts` and add a new `FORBIDDEN_LONG_FLAGS` entry. Add a unit test in `tests/detector.test.ts` for both the `findForbiddenFlags` path and (if relevant) the `hasShortNInGitCommitContext` path.
