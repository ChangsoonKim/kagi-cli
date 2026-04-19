import { createServer as createHttpServer } from "node:http";

import { createHttpApp } from "./http-app.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.MCP_HOST ?? "0.0.0.0";

const app = createHttpApp();
const httpServer = createHttpServer((req, res) => {
  void app.requestHandler(req, res);
});

httpServer.listen(port, host, () => {
  console.log(`kagi MCP HTTP server listening on http://${host}:${port}/mcp (auth: ${app.authMode})`);
});

async function shutdown() {
  await app.close();

  await new Promise<void>((resolve, reject) => {
    httpServer.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

process.on("SIGINT", () => {
  void shutdown().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void shutdown().finally(() => process.exit(0));
});
