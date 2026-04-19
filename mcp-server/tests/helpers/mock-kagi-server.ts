import http from "node:http";
import { once } from "node:events";

interface MockKagiServer {
  baseUrl: string;
  close(): Promise<void>;
}

function json(res: http.ServerResponse, statusCode: number, payload: unknown) {
  res.writeHead(statusCode, {
    "content-type": "application/json"
  });
  res.end(JSON.stringify(payload));
}

function notFound(res: http.ServerResponse, method: string, pathname: string) {
  json(res, 404, {
    error: [`unhandled mock route: ${method} ${pathname}`]
  });
}

export async function startMockKagiServer(): Promise<MockKagiServer> {
  const server = http.createServer(async (req, res) => {
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const pathname = url.pathname;

    if (method === "GET" && pathname === "/api/v0/search") {
      json(res, 200, {
        meta: { id: "req-1", node: "test", ms: 8 },
        data: [
          {
            t: 0,
            rank: 1,
            url: "https://www.rust-lang.org",
            title: "Rust Programming Language",
            snippet: `Search result for ${url.searchParams.get("q") ?? ""}`
          }
        ]
      });
      return;
    }

    if (method === "GET" && pathname === "/html/search") {
      const query = url.searchParams.get("q") ?? "";
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8"
      });
      res.end(`<!doctype html>
<html>
  <body>
    <div class="search-result">
      <a class="__sri_title_link" href="https://www.rust-lang.org">Rust Programming Language</a>
      <div class="__sri-desc">Search result for ${query}</div>
    </div>
  </body>
</html>`);
      return;
    }

    if (method === "POST" && pathname === "/api/v0/summarize") {
      let body = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => {
        body += chunk;
      });
      await once(req, "end");

      const parsed = JSON.parse(body || "{}") as { url?: string; text?: string };
      const source = parsed.url ?? parsed.text ?? "unknown";

      json(res, 200, {
        meta: { id: "sum-1", node: "test", ms: 10 },
        data: {
          output: `Summary for ${source}`,
          tokens: 42
        }
      });
      return;
    }

    if (method === "GET" && pathname === "/mother/summary_labs") {
      const source = url.searchParams.get("url") ?? url.searchParams.get("text") ?? "unknown";
      res.writeHead(200, {
        "content-type": "application/vnd.kagi.stream"
      });
      res.end(
        `hi:{"v":"202603091651.stage.c128588","trace":"abc123"}\0\nnew_message.json:{"id":"msg-1","thread_id":"thread-1","created_at":"2026-03-16T05:17:57Z","state":"done","prompt":"summarize","reply":"Summary for ${source}","md":"Summary for ${source}","metadata":"<li>meta</li>","documents":[]}\0\n`
      );
      return;
    }

    if (method === "GET" && pathname === "/api/batches/latest") {
      json(res, 200, {
        createdAt: "2026-04-06T00:00:00Z",
        dateSlug: "2026-04-06",
        id: "batch-1",
        languageCode: url.searchParams.get("lang") ?? "en",
        processingTime: 14,
        totalArticles: 120,
        totalCategories: 8,
        totalClusters: 64,
        totalReadCount: 90
      });
      return;
    }

    if (method === "GET" && pathname === "/api/categories/metadata") {
      json(res, 200, {
        categories: [
          {
            categoryId: "tech",
            categoryType: "topic",
            displayName: "Tech",
            isCore: true,
            sourceLanguage: "en"
          }
        ]
      });
      return;
    }

    if (method === "GET" && pathname === "/api/batches/batch-1/categories") {
      json(res, 200, {
        batchId: "batch-1",
        createdAt: "2026-04-06T00:00:00Z",
        hasOnThisDay: false,
        categories: [
          {
            id: "category-1",
            categoryId: "tech",
            categoryName: "Tech",
            sourceLanguage: "en",
            timestamp: 1712361600,
            readCount: 42,
            clusterCount: 3
          }
        ]
      });
      return;
    }

    if (method === "GET" && pathname === "/api/batches/batch-1/categories/category-1/stories") {
      json(res, 200, {
        batchId: "batch-1",
        categoryId: "tech",
        categoryName: "Tech",
        timestamp: 1712361600,
        stories: [
          {
            title: "Rust ships new release",
            url: "https://example.com/rust-release"
          }
        ],
        totalStories: "1",
        domains: [],
        readCount: 10
      });
      return;
    }

    notFound(res, method, pathname);
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("failed to resolve mock server address");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      server.close();
      await once(server, "close");
    }
  };
}
