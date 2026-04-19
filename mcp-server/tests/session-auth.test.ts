import { describe, expect, it } from "vitest";

import { KagiCliError } from "../src/errors.js";
import {
  buildSessionRunOptions,
  extractBearerSessionToken,
  resolveInitializeSessionToken,
  resolveSessionAuthMode,
  validateSessionAuthConfig
} from "../src/session-auth.js";

describe("extractBearerSessionToken", () => {
  it("extracts the bearer token", () => {
    expect(extractBearerSessionToken("Bearer session-token")).toBe("session-token");
  });

  it("rejects missing auth header", () => {
    expect(() => extractBearerSessionToken(undefined)).toThrow(KagiCliError);
  });

  it("rejects malformed auth header", () => {
    expect(() => extractBearerSessionToken("Basic abc")).toThrow(KagiCliError);
  });
});

describe("buildSessionRunOptions", () => {
  it("sets only the session token env var", () => {
    const options = buildSessionRunOptions("session-token", {
      env: {
        KAGI_API_TOKEN: "api-token",
        OTHER_ENV: "ok"
      }
    });

    expect(options.env?.KAGI_SESSION_TOKEN).toBe("session-token");
    expect(options.env?.KAGI_API_TOKEN).toBeUndefined();
    expect(options.env?.OTHER_ENV).toBe("ok");
  });
});

describe("resolveSessionAuthMode", () => {
  it("defaults to env-session-token", () => {
    expect(resolveSessionAuthMode({})).toBe("env-session-token");
  });

  it("accepts env-session-token mode", () => {
    expect(
      resolveSessionAuthMode({
        KAGI_MCP_AUTH_MODE: "env-session-token"
      })
    ).toBe("env-session-token");
  });

  it("rejects unsupported auth modes", () => {
    expect(() =>
      resolveSessionAuthMode({
        KAGI_MCP_AUTH_MODE: "google-oauth"
      })
    ).toThrow(KagiCliError);
  });
});

describe("validateSessionAuthConfig", () => {
  it("accepts env-session-token mode with required env vars", () => {
    expect(
      validateSessionAuthConfig({
        KAGI_SESSION_TOKEN: "server-session-token",
        MCP_BEARER_TOKEN: "app-access-token"
      })
    ).toBe("env-session-token");
  });

  it("accepts direct-session-token mode without extra env vars", () => {
    expect(
      validateSessionAuthConfig({
        KAGI_MCP_AUTH_MODE: "direct-session-token"
      })
    ).toBe("direct-session-token");
  });

  it("rejects env-session-token mode without KAGI_SESSION_TOKEN", () => {
    expect(() =>
      validateSessionAuthConfig({
        MCP_BEARER_TOKEN: "app-access-token"
      })
    ).toThrow(KagiCliError);
  });

  it("rejects env-session-token mode without MCP_BEARER_TOKEN", () => {
    expect(() =>
      validateSessionAuthConfig({
        KAGI_SESSION_TOKEN: "server-session-token"
      })
    ).toThrow(KagiCliError);
  });
});

describe("resolveInitializeSessionToken", () => {
  it("uses the bearer session token in direct-session-token mode", () => {
    expect(
      resolveInitializeSessionToken("Bearer session-token", {
        KAGI_MCP_AUTH_MODE: "direct-session-token"
      })
    ).toBe("session-token");
  });

  it("uses the server session token by default in env-session-token mode", () => {
    expect(
      resolveInitializeSessionToken("Bearer app-access-token", {
        KAGI_SESSION_TOKEN: "server-session-token",
        MCP_BEARER_TOKEN: "app-access-token"
      })
    ).toBe("server-session-token");
  });

  it("rejects env-session-token mode without KAGI_SESSION_TOKEN", () => {
    expect(() =>
      resolveInitializeSessionToken("Bearer app-access-token", {
        KAGI_MCP_AUTH_MODE: "env-session-token",
        MCP_BEARER_TOKEN: "app-access-token"
      })
    ).toThrow(KagiCliError);
  });

  it("rejects env-session-token mode without MCP_BEARER_TOKEN", () => {
    expect(() =>
      resolveInitializeSessionToken("Bearer app-access-token", {
        KAGI_MCP_AUTH_MODE: "env-session-token",
        KAGI_SESSION_TOKEN: "server-session-token"
      })
    ).toThrow(KagiCliError);
  });

  it("rejects env-session-token mode with a mismatched bearer token", () => {
    expect(() =>
      resolveInitializeSessionToken("Bearer wrong-token", {
        KAGI_MCP_AUTH_MODE: "env-session-token",
        KAGI_SESSION_TOKEN: "server-session-token",
        MCP_BEARER_TOKEN: "app-access-token"
      })
    ).toThrow(KagiCliError);
  });
});
