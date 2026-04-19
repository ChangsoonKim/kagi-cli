import type { RunKagiOptions } from "./runner.js";
import { KagiCliError } from "./errors.js";

export type SessionAuthMode = "direct-session-token" | "env-session-token";

function extractBearerToken(
  authorizationHeader: string | string[] | undefined,
  expectedUsage: string
): string {
  const raw = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;

  if (!raw) {
    throw new KagiCliError("missing Authorization header");
  }

  const [scheme, ...rest] = raw.trim().split(/\s+/);
  const token = rest.join(" ").trim();

  if (scheme.toLowerCase() !== "bearer" || !token) {
    throw new KagiCliError(`invalid Authorization header format; expected 'Bearer <${expectedUsage}>'`);
  }

  return token;
}

export function extractBearerSessionToken(
  authorizationHeader: string | string[] | undefined
): string {
  return extractBearerToken(authorizationHeader, "session-token");
}

export function resolveSessionAuthMode(
  env: NodeJS.ProcessEnv = process.env
): SessionAuthMode {
  const value = (env.KAGI_MCP_AUTH_MODE ?? "env-session-token").trim();

  if (value === "direct-session-token" || value === "env-session-token") {
    return value;
  }

  throw new KagiCliError(
    `unsupported KAGI_MCP_AUTH_MODE '${value}'; expected 'direct-session-token' or 'env-session-token'`
  );
}

export function validateSessionAuthConfig(
  env: NodeJS.ProcessEnv = process.env
): SessionAuthMode {
  const authMode = resolveSessionAuthMode(env);

  if (authMode === "env-session-token") {
    if (!env.KAGI_SESSION_TOKEN?.trim()) {
      throw new KagiCliError(
        "KAGI_SESSION_TOKEN is required when KAGI_MCP_AUTH_MODE=env-session-token"
      );
    }

    if (!env.MCP_BEARER_TOKEN?.trim()) {
      throw new KagiCliError(
        "MCP_BEARER_TOKEN is required when KAGI_MCP_AUTH_MODE=env-session-token"
      );
    }
  }

  return authMode;
}

export function resolveInitializeSessionToken(
  authorizationHeader: string | string[] | undefined,
  env: NodeJS.ProcessEnv = process.env
): string {
  const authMode = validateSessionAuthConfig(env);

  if (authMode === "direct-session-token") {
    return extractBearerSessionToken(authorizationHeader);
  }

  const configuredSessionToken = env.KAGI_SESSION_TOKEN?.trim();
  if (!configuredSessionToken) {
    throw new KagiCliError(
      "KAGI_SESSION_TOKEN is required when KAGI_MCP_AUTH_MODE=env-session-token"
    );
  }

  const expectedBearerToken = env.MCP_BEARER_TOKEN?.trim();
  if (!expectedBearerToken) {
    throw new KagiCliError(
      "MCP_BEARER_TOKEN is required when KAGI_MCP_AUTH_MODE=env-session-token"
    );
  }

  const providedBearerToken = extractBearerToken(authorizationHeader, "access-token");
  if (providedBearerToken !== expectedBearerToken) {
    throw new KagiCliError("invalid bearer token");
  }

  return configuredSessionToken;
}

export function buildSessionRunOptions(
  sessionToken: string,
  baseOptions: RunKagiOptions = {}
): RunKagiOptions {
  const env = {
    ...(baseOptions.env ?? process.env)
  };

  delete env.KAGI_API_TOKEN;
  delete env.KAGI_SESSION_TOKEN;
  env.KAGI_SESSION_TOKEN = sessionToken;

  return {
    ...baseOptions,
    env
  };
}
