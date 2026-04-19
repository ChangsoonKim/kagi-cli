import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { RunKagiOptions } from "./runner.js";
import { registerAssistantTools } from "./tools/assistant.js";
import { registerContentTools } from "./tools/content.js";
import { registerSearchTools } from "./tools/search.js";

export interface CreateServerOptions {
  mode?: "all" | "session-only";
  runOptions?: RunKagiOptions;
}

export function createServer(options: CreateServerOptions = {}) {
  const server = new McpServer({
    name: "kagi-cli-mcp",
    version: "0.1.0"
  });

  registerSearchTools(server, options.runOptions);
  registerContentTools(server, {
    mode: options.mode,
    runOptions: options.runOptions
  });
  registerAssistantTools(server, options.runOptions);

  return server;
}
