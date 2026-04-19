import { createServer as createHttpServer } from "node:http";
import type { AddressInfo } from "node:net";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StreamableHTTPClientTransport,
  StreamableHTTPError
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createHttpApp } from "../src/http-app.js";

describe("HTTP MCP app", () => {
  let server: ReturnType<typeof createHttpServer>;
  let baseUrl: string;
  let app: ReturnType<typeof createHttpApp>;

  beforeEach(async () => {
    app = createHttpApp({
      env: {
        KAGI_SESSION_TOKEN: "server-session-token",
        MCP_BEARER_TOKEN: "app-access-token"
      },
      sessionIdGenerator: () => "session-under-test"
    });

    server = createHttpServer((req, res) => {
      void app.requestHandler(req, res);
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await app.close();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  });

  it("authenticates with env-session-token, creates a session, and exposes session-safe tools", async () => {
    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
      requestInit: {
        headers: {
          Authorization: "Bearer app-access-token"
        }
      }
    });
    const client = new Client({
      name: "kagi-cli-mcp-test-client",
      version: "0.1.0"
    });

    try {
      await client.connect(transport);
      expect(transport.sessionId).toBe("session-under-test");

      const result = await client.listTools();
      const toolNames = result.tools.map((tool) => tool.name);

      expect(toolNames).toContain("kagi_search");
      expect(toolNames).toContain("kagi_translate");
      expect(toolNames).not.toContain("kagi_fastgpt");
      expect(toolNames).not.toContain("kagi_enrich_web");
      expect(toolNames).not.toContain("kagi_enrich_news");

      await transport.terminateSession();

      const response = await fetch(`${baseUrl}/mcp`, {
        method: "GET",
        headers: {
          "mcp-session-id": "session-under-test"
        }
      });

      expect(response.status).toBe(404);
    } finally {
      await transport.close();
    }
  });

  it("rejects initialize requests with an invalid bearer token", async () => {
    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
      requestInit: {
        headers: {
          Authorization: "Bearer wrong-token"
        }
      }
    });
    const client = new Client({
      name: "kagi-cli-mcp-test-client",
      version: "0.1.0"
    });

    await expect(client.connect(transport)).rejects.toMatchObject<Partial<StreamableHTTPError>>({
      code: 401
    });
  });

  it("returns explicit 400 responses for requests that omit the MCP session id", async () => {
    const getResponse = await fetch(`${baseUrl}/mcp`, {
      method: "GET"
    });
    expect(getResponse.status).toBe(400);

    const postResponse = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {}
      })
    });

    expect(postResponse.status).toBe(400);
  });
});
