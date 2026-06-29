import type { Plugin } from "@opencode-ai/plugin";
import { findForbiddenFlags, hasShortNInGitCommitContext, looksLikeGitCommit } from "./detector.ts";
import type { NoVerifyBlockerOptions } from "./types.ts";

// NoVerifyBlocker — OpenCode plugin that prevents AI agents from
// `git commit --no-verify` / `git commit -n` to bypass pre-commit hooks.
//
// Mechanism: hooks `tool.execute.before`, inspects `bash` tool calls that
// look like `git commit` / `git commit-tree`, and throws an error if the
// command contains `--no-verify` or short flag `-n`.
//
// Known limitations (see README for full context):
// - OpenCode issue #31680: `output.args` in-place mutation does not work
//   in 1.17.7/1.17.8, so the plugin can only throw, not silently strip
//   the flag.
// - OpenCode issue #6862: the first message in a new session may not
//   trigger `tool.execute.before`.

const DEFAULT_ERROR_MESSAGE = (found: string): string =>
  `[NoVerifyBlocker] git commit with ${found} is blocked by project policy. ` +
  `Pre-commit hooks (lint / format / typecheck / test) must run on every commit. ` +
  `Remove ${found} and retry.`;

export const NoVerifyBlocker: Plugin = async (_input, options) => {
  const opts = options as NoVerifyBlockerOptions | undefined;

  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool !== "bash") return;

      const args = output?.args;
      if (!args || typeof args !== "object") return;

      const command = (args as Record<string, unknown>).command;
      if (typeof command !== "string" || command.length === 0) return;

      // Gate: only inspect commands that look like `git commit`. This is
      // what lets us safely look for the short flag `-n` below without
      // false-positiving on `echo -n` / `npm -n install`.
      if (!looksLikeGitCommit(command)) return;

      const hasNoVerify = findForbiddenFlags(command).hasNoVerify;
      const hasShortN = hasShortNInGitCommitContext(command);
      if (!hasNoVerify && !hasShortN) return;

      const found = [hasNoVerify && "--no-verify", hasShortN && "-n"].filter(Boolean).join(" / ");

      throw new Error(opts?.customMessage ?? DEFAULT_ERROR_MESSAGE(found));
    },
  };
};

export const noVerifyBlocker = NoVerifyBlocker;
export default NoVerifyBlocker;
