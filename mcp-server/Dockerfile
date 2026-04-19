FROM rust:1.89-bookworm AS rust-builder

WORKDIR /build

COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY data ./data

RUN cargo build --locked --release

FROM node:20-bookworm-slim AS node-builder

WORKDIR /build/mcp-server

COPY mcp-server/package.json mcp-server/package-lock.json* ./
RUN npm ci

COPY mcp-server/tsconfig.json ./
COPY mcp-server/vitest.config.ts ./
COPY mcp-server/vitest.integration.config.ts ./
COPY mcp-server/src ./src

RUN npm run build && npm prune --omit=dev

FROM node:20-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV MCP_HOST=0.0.0.0
ENV KAGI_MCP_AUTH_MODE=env-session-token
ENV KAGI_BIN=/usr/local/bin/kagi

COPY --from=rust-builder /build/target/release/kagi /usr/local/bin/kagi
COPY --from=node-builder /build/mcp-server/package.json ./package.json
COPY --from=node-builder /build/mcp-server/node_modules ./node_modules
COPY --from=node-builder /build/mcp-server/dist ./dist

EXPOSE 3000

CMD ["node", "dist/http.js"]
