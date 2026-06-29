import type { GitFlags } from "./types.ts";

// 短选项 `-n` 只在 git commit 上下文里才算违规（由 `looksLikeGitCommit`
// 联合判断），所以 `findForbiddenFlags` 不会单独因为 `echo -n` 误报。
// 长选项 `--no-verify` 必须独立命中，因为没有歧义。
const FORBIDDEN_LONG_FLAGS = ["--no-verify"] as const;

export function tokenizeFlags(command: string): Set<string> {
  // Whitespace split only — we don't parse quotes, escapes, or globs.
  // Conservative by design: false negatives (missed flags) are tolerable;
  // false positives (blocking innocent commands) are not.
  const tokens = new Set<string>();
  const re = /\s*(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(command)) !== null) {
    tokens.add(match[1]);
  }
  return tokens;
}

export function extractShortFlags(token: string): string[] {
  // Splits merged short flags like `-abc` into `["a", "b", "c"]`.
  // Returns `[]` for long flags, non-flag tokens, or bare `-`.
  if (!token.startsWith("-") || token.startsWith("--") || token.length < 2) {
    return [];
  }
  return [...token.slice(1)];
}

export function findForbiddenFlags(command: string): GitFlags {
  // Self-contained: this function does NOT check git-commit context.
  // It only flags `--no-verify` (unambiguous long flag). The short `-n`
  // must be combined with `looksLikeGitCommit` by the caller to avoid
  // false positives like `echo -n` / `npm -n install`.
  const tokens = tokenizeFlags(command);
  let hasNoVerify = false;

  for (const token of tokens) {
    if (FORBIDDEN_LONG_FLAGS.includes(token as (typeof FORBIDDEN_LONG_FLAGS)[number])) {
      hasNoVerify = true;
      break;
    }
  }

  return { hasNoVerify, hasShortN: false };
}

export function hasShortNInGitCommitContext(command: string): boolean {
  // Helper for callers that need short-flag detection: only returns
  // `true` if the command (1) looks like a git commit AND (2) contains
  // short flag `-n` (in any form: standalone `-n` or merged like `-nm`).
  if (!looksLikeGitCommit(command)) return false;

  const tokens = tokenizeFlags(command);
  for (const token of tokens) {
    for (const flag of extractShortFlags(token)) {
      if (flag === "n") return true;
    }
  }
  return false;
}

export function looksLikeGitCommit(command: string): boolean {
  // Strict word-boundary check: `commit` must follow whitespace (not `=`),
  // optionally followed by `-tree`. This avoids `git log --grep=commit`
  // matching (where `commit` is the value of `--grep=`).
  // Matches: `git commit`, `git commit-tree`, `git -C /p commit`,
  // `git --git-dir=... commit`, `/usr/bin/git commit`, `cd /x && git commit`.
  return /\bgit\b[^\n=]*\s+commit(?:-tree)?\b/.test(command);
}
