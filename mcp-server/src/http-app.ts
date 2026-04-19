import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { KagiCliError } from "./errors.js";
import {
  buildSessionRunOptions,
  resolveInitializeSessionToken,
  validateSessionAuthConfig,
  type SessionAuthMode
} from "./session-auth.js";
import {
  createServer as createMcpServer,
  type CreateServerOptions
} from "./server.js";

interface SessionEntry {
  server: ReturnType<typeof createMcpServer>;
  transport: StreamableHTTPServerTransport;
  sessionToken: string;
}

export interface CreateHttpAppOptions {
  env?: NodeJS.ProcessEnv;
  createServer?: (options?: CreateServerOptions) => ReturnType<typeof createMcpServer>;
  sessionIdGenerator?: () => string;
}

export interface HttpApp {
  authMode: SessionAuthMode;
  requestHandler(req: IncomingMessage, res: ServerResponse): Promise<void>;
  close(): Promise<void>;
}

function writeJson(
  res: ServerResponse,
  statusCode: number,
  payload: unknown,
  headers?: Record<string, string>
) {
  res.writeHead(statusCode, {
    "content-type": "application/json",
    ...(headers ?? {})
  });
  res.end(JSON.stringify(payload));
}

function writeAuthError(res: ServerResponse, error: KagiCliError) {
  writeJson(
    res,
    401,
    {
      error: error.message
    },
    {
      "WWW-Authenticate": 'Bearer realm="kagi-cli-mcp", error="invalid_token"'
    }
  );
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new KagiCliError("failed to parse JSON request body", { cause: error });
  }
}

function sessionIdFromRequest(req: IncomingMessage): string | undefined {
  const header = req.headers["mcp-session-id"];
  if (Array.isArray(header)) {
    return header[0];
  }
  return header;
}

export function createHttpApp(options: CreateHttpAppOptions = {}): HttpApp {
  const env = options.env ?? process.env;
  const authMode = validateSessionAuthConfig(env);
  const sessions = new Map<string, SessionEntry>();
  const sessionIdGenerator = options.sessionIdGenerator ?? randomUUID;
  const createServer = options.createServer ?? createMcpServer;

  async function closeSession(sessionId: string) {
    const entry = sessions.get(sessionId);
    if (!entry) {
      return;
    }

    sessions.delete(sessionId);
    await entry.transport.close();
    await entry.server.close();
  }

  async function handlePost(req: IncomingMessage, res: ServerResponse) {
    const body = await readJsonBody(req);
    const sessionId = sessionIdFromRequest(req);

    if (sessionId) {
      const existing = sessions.get(sessionId);
      if (!existing) {
        writeJson(res, 404, { error: "unknown MCP session" });
        return;
      }

      await existing.transport.handleRequest(req, res, body);
      return;
    }

    if (!isInitializeRequest(body)) {
      writeJson(res, 400, {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: expected initialize request or valid MCP session id"
        },
        id: null
      });
      return;
    }

    let sessionToken: string;
    try {
      sessionToken = resolveInitializeSessionToken(req.headers.authorization, env);
    } catch (error) {
      writeAuthError(
        res,
        error instanceof KagiCliError ? error : new KagiCliError(String(error))
      );
      return;
    }

    let transport!: StreamableHTTPServerTransport;
    const server = createServer({
      mode: "session-only",
      runOptions: buildSessionRunOptions(sessionToken, { env })
    });

    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator,
      onsessioninitialized: (createdSessionId) => {
        sessions.set(createdSessionId, {
          server,
          transport,
          sessionToken
        });
      }
    });

    transport.onclose = () => {
      const createdSessionId = transport.sessionId;
      if (createdSessionId) {
        const existing = sessions.get(createdSessionId);
        if (existing) {
          sessions.delete(createdSessionId);
          void existing.server.close();
        }
      }
    };

    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  }

  async function handleGet(req: IncomingMessage, res: ServerResponse) {
    const sessionId = sessionIdFromRequest(req);
    if (!sessionId) {
      writeJson(res, 400, { error: "missing MCP session id" });
      return;
    }

    const existing = sessions.get(sessionId);
    if (!existing) {
      writeJson(res, 404, { error: "unknown MCP session" });
      return;
    }

    await existing.transport.handleRequest(req, res);
  }

  async function handleDelete(req: IncomingMessage, res: ServerResponse) {
    const sessionId = sessionIdFromRequest(req);
    if (!sessionId) {
      writeJson(res, 400, { error: "missing MCP session id" });
      return;
    }

    const existing = sessions.get(sessionId);
    if (!existing) {
      writeJson(res, 404, { error: "unknown MCP session" });
      return;
    }

    await existing.transport.handleRequest(req, res);
    await closeSession(sessionId);
  }

  return {
    authMode,
    async requestHandler(req: IncomingMessage, res: ServerResponse) {
      try {
        const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

        if (url.pathname === "/healthz") {
          writeJson(res, 200, { ok: true });
          return;
        }

        if (url.pathname !== "/mcp") {
          writeJson(res, 404, { error: "not found" });
          return;
        }

        switch (req.method) {
          case "POST":
            await handlePost(req, res);
            return;
          case "GET":
            await handleGet(req, res);
            return;
          case "DELETE":
            await handleDelete(req, res);
            return;
          default:
            writeJson(res, 405, { error: "method not allowed" });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!res.headersSent) {
          writeJson(res, 500, {
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message
            },
            id: null
          });
        }
      }
    },
    async close() {
      const sessionIds = Array.from(sessions.keys());
      await Promise.all(sessionIds.map((sessionId) => closeSession(sessionId)));
    }
  };
}
