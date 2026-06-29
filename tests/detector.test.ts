import { describe, expect, it } from "vite-plus/test";
import {
  extractShortFlags,
  findForbiddenFlags,
  hasShortNInGitCommitContext,
  looksLikeGitCommit,
  tokenizeFlags,
} from "../src/detector.ts";

describe("tokenizeFlags", () => {
  it("splits space-delimited tokens", () => {
    expect(tokenizeFlags("git commit -m hello")).toEqual(new Set(["git", "commit", "-m", "hello"]));
  });

  it("collapses multiple spaces", () => {
    expect(tokenizeFlags("git   commit   -n")).toEqual(new Set(["git", "commit", "-n"]));
  });

  it("handles tabs and newlines as whitespace", () => {
    expect(tokenizeFlags("git\tcommit\n-n")).toEqual(new Set(["git", "commit", "-n"]));
  });

  it("returns empty set for empty input", () => {
    expect(tokenizeFlags("").size).toBe(0);
  });
});

describe("extractShortFlags", () => {
  it("extracts a single short flag", () => {
    expect(extractShortFlags("-n")).toEqual(["n"]);
  });

  it("splits merged short flags", () => {
    expect(extractShortFlags("-abc")).toEqual(["a", "b", "c"]);
  });

  it("extracts n from merged -nm", () => {
    expect(extractShortFlags("-nm")).toEqual(["n", "m"]);
  });

  it("returns empty for --no-verify (long flag)", () => {
    expect(extractShortFlags("--no-verify")).toEqual([]);
  });

  it("returns empty for non-flag tokens", () => {
    expect(extractShortFlags("git")).toEqual([]);
  });

  it("returns empty for bare dash", () => {
    expect(extractShortFlags("-")).toEqual([]);
  });
});

describe("findForbiddenFlags", () => {
  it("detects --no-verify", () => {
    expect(findForbiddenFlags("git commit --no-verify -m msg")).toEqual({
      hasNoVerify: true,
      hasShortN: false,
    });
  });

  it("detects --no-verify in any context (no git-commit check)", () => {
    expect(findForbiddenFlags("echo --no-verify hi")).toEqual({
      hasNoVerify: true,
      hasShortN: false,
    });
  });

  it("does not detect -n alone (caller must combine with looksLikeGitCommit)", () => {
    expect(findForbiddenFlags("git commit -n -m msg")).toEqual({
      hasNoVerify: false,
      hasShortN: false,
    });
  });

  it("does not flag echo -n", () => {
    expect(findForbiddenFlags("echo -n hello")).toEqual({
      hasNoVerify: false,
      hasShortN: false,
    });
  });

  it("does not flag npm -n", () => {
    expect(findForbiddenFlags("npm -n install")).toEqual({
      hasNoVerify: false,
      hasShortN: false,
    });
  });

  it("returns false for clean command", () => {
    expect(findForbiddenFlags("git commit -m msg")).toEqual({
      hasNoVerify: false,
      hasShortN: false,
    });
  });

  it("returns false for empty input", () => {
    expect(findForbiddenFlags("")).toEqual({
      hasNoVerify: false,
      hasShortN: false,
    });
  });
});

describe("hasShortNInGitCommitContext", () => {
  it("detects -n in git commit", () => {
    expect(hasShortNInGitCommitContext("git commit -n -m msg")).toBe(true);
  });

  it("detects merged -nm in git commit", () => {
    expect(hasShortNInGitCommitContext("git commit -nm 'msg'")).toBe(true);
  });

  it("detects -n in git -C /p commit", () => {
    expect(hasShortNInGitCommitContext("git -C /p commit -n -m x")).toBe(true);
  });

  it("detects -n in git commit-tree", () => {
    expect(hasShortNInGitCommitContext("git commit-tree -n HEAD")).toBe(true);
  });

  it("rejects echo -n (not git context)", () => {
    expect(hasShortNInGitCommitContext("echo -n hi")).toBe(false);
  });

  it("rejects npm -n install (not git context)", () => {
    expect(hasShortNInGitCommitContext("npm -n install")).toBe(false);
  });

  it("rejects git commit without -n", () => {
    expect(hasShortNInGitCommitContext("git commit -m msg")).toBe(false);
  });

  it("rejects git push -n (not commit)", () => {
    expect(hasShortNInGitCommitContext("git push -n origin main")).toBe(false);
  });
});

describe("looksLikeGitCommit", () => {
  it("matches simple git commit", () => {
    expect(looksLikeGitCommit("git commit -m hello")).toBe(true);
  });

  it("matches git commit-tree", () => {
    expect(looksLikeGitCommit("git commit-tree HEAD^{tree} -m root")).toBe(true);
  });

  it("matches git -C path commit", () => {
    expect(looksLikeGitCommit("git -C /repo/path commit -m msg")).toBe(true);
  });

  it("matches git --git-dir=... commit", () => {
    expect(looksLikeGitCommit("git --git-dir=/repo/.git commit -m msg")).toBe(true);
  });

  it("matches full path git", () => {
    expect(looksLikeGitCommit("/usr/bin/git commit -m msg")).toBe(true);
  });

  it("matches commit chained with &&", () => {
    expect(looksLikeGitCommit("cd /tmp && git commit -m msg")).toBe(true);
  });

  it("rejects git push", () => {
    expect(looksLikeGitCommit("git push origin main")).toBe(false);
  });

  it("rejects git log --grep=commit (commit is inside --grep= value, not its own token)", () => {
    expect(looksLikeGitCommit("git log --grep=commit")).toBe(false);
  });

  it("rejects npm run test", () => {
    expect(looksLikeGitCommit("npm run test")).toBe(false);
  });

  it("rejects empty input", () => {
    expect(looksLikeGitCommit("")).toBe(false);
  });
});
