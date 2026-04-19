# kagi CLI MCP server

This package provides a thin MCP server around the existing `kagi` CLI.

## Design

- the Rust CLI remains the source of truth
- the MCP server shells out to `kagi`
- machine-facing tools only use JSON output when available
- the HTTP runtime stores a resolved `KAGI_SESSION_TOKEN` per MCP session
- the default HTTP deployment is `env-session-token` for shared personal use

## Binary resolution

The server finds the `kagi` binary in this order:

1. `KAGI_BIN`
2. `../target/debug/kagi` or `../target/release/kagi`
3. `kagi` from `PATH`

## Development

```bash
cd mcp-server
npm ci
npm run build
npm run test:all
```

Build the local Rust CLI first:

```bash
cargo build
```

Run the Streamable HTTP MCP server:

```bash
cd mcp-server
export KAGI_SESSION_TOKEN=your-kagi-session-token
export MCP_BEARER_TOKEN=your-server-access-token
npm start
```

Run the stdio variant for local process-spawned integrations:

```bash
cd mcp-server
npm run start:stdio
```

Or force a specific binary:

```bash
KAGI_BIN=/absolute/path/to/kagi npm start
```

## HTTP auth flow

The HTTP runtime is intentionally session-token-based. The default mode is `env-session-token`.

Default: `env-session-token`

- server env must define `KAGI_SESSION_TOKEN` and `MCP_BEARER_TOKEN`
- first `initialize` request: `Authorization: Bearer <MCP_BEARER_TOKEN>`
- later requests: use the returned `mcp-session-id`
- the server injects its configured `KAGI_SESSION_TOKEN`
- clients never see the underlying Kagi session token

Optional local/dev mode: `direct-session-token`

```bash
KAGI_MCP_AUTH_MODE=direct-session-token \
npm start
```

- first `initialize` request: `Authorization: Bearer <KAGI_SESSION_TOKEN>`
- useful when you do not want the server to store a long-lived Kagi session token

`google OAuth` can sit in front of this later, but it should be treated as an identity layer. You still need a way to map a signed-in user to a Kagi session token because the CLI itself only understands Kagi credentials.

## Supported tools in HTTP mode

- `kagi_search`
- `kagi_quick`
- `kagi_summarize` (subscriber mode only)
- `kagi_assistant_prompt`
- `kagi_assistant_thread_list`
- `kagi_assistant_thread_get`
- `kagi_assistant_thread_export`
- `kagi_ask_page`
- `kagi_translate`
- `kagi_news`
- `kagi_smallweb`

Not exposed in session-token-only HTTP mode:

- `kagi_fastgpt`
- `kagi_enrich_web`
- `kagi_enrich_news`

## Docker

Build from the repo root:

```bash
docker build -f mcp-server/Dockerfile -t kagi-cli-mcp .
```

Run with the default `env-session-token` mode:

```bash
docker run --rm -p 3000:3000 \
  -e KAGI_SESSION_TOKEN=your-kagi-session-token \
  -e MCP_BEARER_TOKEN=your-server-access-token \
  kagi-cli-mcp
```

Pull the published image from GHCR:

```bash
docker pull ghcr.io/<your-github-owner>/kagi-cli-mcp:latest
```

Health endpoint:

```text
GET /healthz
```

MCP endpoint:

```text
POST /mcp
```

## Notes

- the server inherits the current working directory when spawning `kagi`
- that means `.kagi.toml` resolution still follows the CLI's existing behavior
- for one user across many clients, `env-session-token` is the recommended deployment model
- for many users, keep this auth layer separate from the CLI and add a token store or OAuth-backed identity mapping on top
