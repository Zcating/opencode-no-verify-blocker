import type { Hooks, PluginInput } from "@opencode-ai/plugin";
import { describe, expect, it } from "vite-plus/test";
import { NoVerifyBlocker, default as defaultExport, noVerifyBlocker } from "../src/index.ts";

function mockInput(): PluginInput {
  return {
    client: undefined as never,
    project: undefined as never,
    directory: "/tmp",
    worktree: "/tmp",
    serverUrl: new URL("http://localhost:0"),
    $: undefined as never,
    experimental_workspace: { register: () => {} },
  };
}

async function loadHooks(options?: Record<string, unknown>): Promise<Hooks> {
  return (await NoVerifyBlocker(mockInput(), options)) as Hooks;
}

function getBefore(hooks: Hooks) {
  const before = hooks["tool.execute.before"];
  if (!before) throw new Error("plugin returned no tool.execute.before hook");
  return before;
}

describe("NoVerifyBlocker plugin", () => {
  it("skips non-bash tools", async () => {
    const before = getBefore(await loadHooks());
    await expect(
      before({ tool: "read", sessionID: "s", callID: "c" }, { args: { command: "git commit -n" } }),
    ).resolves.toBeUndefined();
  });

  it("blocks git commit -n", async () => {
    const before = getBefore(await loadHooks());
    await expect(
      before(
        { tool: "bash", sessionID: "s", callID: "c" },
        { args: { command: "git commit -n -m test" } },
      ),
    ).rejects.toThrow(/NoVerifyBlocker/);
  });

  it("blocks git commit --no-verify", async () => {
    const before = getBefore(await loadHooks());
    await expect(
      before(
        { tool: "bash", sessionID: "s", callID: "c" },
        { args: { command: "git commit --no-verify -m test" } },
      ),
    ).rejects.toThrow(/--no-verify/);
  });

  it("blocks git -C /path commit -n", async () => {
    const before = getBefore(await loadHooks());
    await expect(
      before(
        { tool: "bash", sessionID: "s", callID: "c" },
        { args: { command: "git -C /repo commit -n -m x" } },
      ),
    ).rejects.toThrow(/-n/);
  });

  it("blocks git commit-tree --no-verify", async () => {
    const before = getBefore(await loadHooks());
    await expect(
      before(
        { tool: "bash", sessionID: "s", callID: "c" },
        { args: { command: "git commit-tree --no-verify HEAD" } },
      ),
    ).rejects.toThrow(/--no-verify/);
  });

  it("passes clean git commit through", async () => {
    const before = getBefore(await loadHooks());
    await expect(
      before(
        { tool: "bash", sessionID: "s", callID: "c" },
        { args: { command: "git commit -m test" } },
      ),
    ).resolves.toBeUndefined();
  });

  it("passes echo -n through (no git commit context)", async () => {
    const before = getBefore(await loadHooks());
    await expect(
      before({ tool: "bash", sessionID: "s", callID: "c" }, { args: { command: "echo -n hi" } }),
    ).resolves.toBeUndefined();
  });

  it("uses customMessage when provided", async () => {
    const custom = "CUSTOM BLOCK see AGENTS.md";
    const before = getBefore(await loadHooks({ customMessage: custom }));
    await expect(
      before({ tool: "bash", sessionID: "s", callID: "c" }, { args: { command: "git commit -n" } }),
    ).rejects.toThrow(custom);
  });

  it("uses default English message when no customMessage", async () => {
    const before = getBefore(await loadHooks());
    await expect(
      before({ tool: "bash", sessionID: "s", callID: "c" }, { args: { command: "git commit -n" } }),
    ).rejects.toThrow(/pre-commit hooks/i);
  });

  it("handles missing args gracefully", async () => {
    const before = getBefore(await loadHooks());
    await expect(
      before({ tool: "bash", sessionID: "s", callID: "c" }, { args: undefined }),
    ).resolves.toBeUndefined();
  });

  it("handles empty command gracefully", async () => {
    const before = getBefore(await loadHooks());
    await expect(
      before({ tool: "bash", sessionID: "s", callID: "c" }, { args: { command: "" } }),
    ).resolves.toBeUndefined();
  });
});

describe("exports", () => {
  it("default export is the same plugin as named export", () => {
    expect(defaultExport).toBe(NoVerifyBlocker);
  });

  it("noVerifyBlocker alias equals NoVerifyBlocker", () => {
    expect(noVerifyBlocker).toBe(NoVerifyBlocker);
  });
});
