import type { PluginOptions } from "@opencode-ai/plugin";

export type GitFlags = {
  hasNoVerify: boolean;
  hasShortN: boolean;
};

export type NoVerifyBlockerOptions = PluginOptions & {
  /**
   * Custom error message thrown when a forbidden flag is detected.
   * Use this to point users to project-specific docs (e.g. AGENTS.md link).
   */
  customMessage?: string;
};
