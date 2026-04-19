import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { KagiCliError } from "../src/errors.js";
import { parseJsonOutput, resolveKagiBinary, runKagiText } from "../src/runner.js";

describe("resolveKagiBinary", () => {
  it("prefers KAGI_BIN when set", () => {
    expect(
      resolveKagiBinary({
        env: {
          KAGI_BIN: "/tmp/custom-kagi"
        }
      })
    ).toBe("/tmp/custom-kagi");
  });

  it("falls back to the local debug binary when present", () => {
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "kagi-mcp-runner-"));
    const debugDir = path.join(repoRoot, "target", "debug");
    mkdirSync(debugDir, { recursive: true });

    const binaryPath = path.join(debugDir, process.platform === "win32" ? "kagi.exe" : "kagi");
    writeFileSync(binaryPath, "");

    expect(
      resolveKagiBinary({
        env: {},
        repoRoot
      })
    ).toBe(binaryPath);
  });
});

describe("parseJsonOutput", () => {
  it("parses valid JSON", () => {
    expect(parseJsonOutput<{ ok: boolean }>("{\"ok\":true}\n")).toEqual({ ok: true });
  });

  it("throws on empty stdout", () => {
    expect(() => parseJsonOutput("   ")).toThrow(KagiCliError);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseJsonOutput("not-json")).toThrow(KagiCliError);
  });
});

describe("runKagiText", () => {
  it("surfaces ENOENT errors with a helpful message", async () => {
    const missingBinary = path.join(os.tmpdir(), "missing-kagi-binary-do-not-create");

    await expect(
      runKagiText(["--version"], {
        binary: missingBinary
      })
    ).rejects.toMatchObject({
      name: "KagiCliError",
      message: expect.stringContaining("failed to start kagi binary")
    });
  });

  it("captures non-zero exit codes and stderr", async () => {
    const error = await runKagiText(
      ["-e", "process.stderr.write('boom\\n'); process.exit(2)"],
      {
        binary: process.execPath
      }
    ).catch((failure) => failure as KagiCliError);

    expect(error).toBeInstanceOf(KagiCliError);
    expect(error.code).toBe(2);
    expect(error.stderr).toContain("boom");
    expect(error.message).toContain("kagi exited with code 2");
  });

  it("captures timeout failures", async () => {
    const error = await runKagiText(
      ["-e", "setTimeout(() => {}, 1000)"],
      {
        binary: process.execPath,
        timeoutMs: 10
      }
    ).catch((failure) => failure as KagiCliError);

    expect(error).toBeInstanceOf(KagiCliError);
    expect(error.message).toMatch(/terminated by signal|failed to execute/);
  });
});
