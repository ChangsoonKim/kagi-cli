import { existsSync, mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startMockKagiServer } from "./helpers/mock-kagi-server.js";
import { executeSearchTool } from "../src/tools/search.js";
import { executeNewsTool, executeSummarizeTool } from "../src/tools/content.js";

function findLocalBinary() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const binaryName = process.platform === "win32" ? "kagi.exe" : "kagi";

  for (const relative of [
    path.join("target", "debug", binaryName),
    path.join("target", "release", binaryName)
  ]) {
    const candidate = path.join(repoRoot, relative);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

const localBinary = findLocalBinary();
const maybeIt = localBinary ? it : it.skip;

describe("adapter integration", () => {
  let mockServer: Awaited<ReturnType<typeof startMockKagiServer>>;
  let cwd: string;

  beforeEach(async () => {
    mockServer = await startMockKagiServer();
    cwd = mkdtempSync(path.join(os.tmpdir(), "kagi-mcp-e2e-"));
  });

  afterEach(async () => {
    await mockServer.close();
  });

  maybeIt("executes search through the real kagi binary against mocked search API", async () => {
    const response = await executeSearchTool(
      {
        query: "rust programming"
      },
      {
        binary: localBinary ?? undefined,
        cwd,
        env: {
          ...process.env,
          KAGI_SESSION_TOKEN: "test-session-token",
          KAGI_BASE_URL: mockServer.baseUrl
        }
      }
    );

    const result = response.structuredContent.result as { data: Array<{ title: string }> };
    expect(result.data[0]?.title).toBe("Rust Programming Language");
  });

  maybeIt("executes summarize through the real kagi binary against mocked summarize API", async () => {
    const response = await executeSummarizeTool(
      {
        url: "https://example.com/article",
        subscriber: true,
        targetLanguage: "EN"
      },
      {
        binary: localBinary ?? undefined,
        cwd,
        env: {
          ...process.env,
          KAGI_SESSION_TOKEN: "test-session-token",
          KAGI_BASE_URL: mockServer.baseUrl
        }
      }
    );

    const result = response.structuredContent.result as { data: { output: string } };
    expect(result.data.output).toContain("https://example.com/article");
  });

  maybeIt("executes news through the real kagi binary against mocked news endpoints", async () => {
    const response = await executeNewsTool(
      {
        category: "tech",
        lang: "en",
        limit: 5
      },
      {
        binary: localBinary ?? undefined,
        cwd,
        env: {
          ...process.env,
          KAGI_NEWS_BASE_URL: mockServer.baseUrl
        }
      }
    );

    const result = response.structuredContent.result as {
      category: { category_name: string };
      stories: Array<{ title: string }>;
    };
    expect(result.category.category_name).toBe("Tech");
    expect(result.stories[0]?.title).toBe("Rust ships new release");
  });
});
