import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { KagiCliError } from "./errors.js";

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_BUFFER_BYTES = 10 * 1024 * 1024;

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(packageDir, "..", "..");

export interface ResolveKagiBinaryOptions {
  env?: NodeJS.ProcessEnv;
  repoRoot?: string;
}

export interface RunKagiOptions extends ResolveKagiBinaryOptions {
  binary?: string;
  cwd?: string;
  timeoutMs?: number;
}

interface ExecLikeError extends Error {
  code?: number | string;
  signal?: NodeJS.Signals | null;
  stdout?: string;
  stderr?: string;
  killed?: boolean;
}

function platformBinaryName() {
  return process.platform === "win32" ? "kagi.exe" : "kagi";
}

function trimToSingleLine(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.replace(/\s+/g, " ");
}

export function resolveKagiBinary(options: ResolveKagiBinaryOptions = {}): string {
  const env = options.env ?? process.env;
  const repoRoot = options.repoRoot ?? defaultRepoRoot;
  const override = env.KAGI_BIN?.trim();

  if (override) {
    return override;
  }

  const binaryName = platformBinaryName();
  const candidates = [
    path.join(repoRoot, "target", "debug", binaryName),
    path.join(repoRoot, "target", "release", binaryName)
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return binaryName;
}

function buildExecErrorMessage(error: ExecLikeError, binary: string, args: string[]): string {
  if (error.code === "ENOENT") {
    return `failed to start kagi binary '${binary}'; set KAGI_BIN or build the local Rust binary`;
  }

  const stderr = trimToSingleLine(error.stderr);
  const stdout = trimToSingleLine(error.stdout);
  const detail = stderr ?? stdout;

  if (typeof error.code === "number") {
    return detail
      ? `kagi exited with code ${error.code}: ${detail}`
      : `kagi exited with code ${error.code}`;
  }

  if (error.signal) {
    return detail
      ? `kagi was terminated by signal ${error.signal}: ${detail}`
      : `kagi was terminated by signal ${error.signal}`;
  }

  if (error.message) {
    return `failed to execute kagi '${binary} ${args.join(" ")}': ${error.message}`;
  }

  return `failed to execute kagi '${binary} ${args.join(" ")}'`;
}

async function runKagi(args: string[], options: RunKagiOptions = {}) {
  const binary = options.binary ?? resolveKagiBinary(options);

  try {
    return await execFileAsync(binary, args, {
      cwd: options.cwd ?? process.cwd(),
      env: options.env ?? process.env,
      timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxBuffer: DEFAULT_MAX_BUFFER_BYTES
    });
  } catch (error) {
    const execError = error as ExecLikeError;
    throw new KagiCliError(buildExecErrorMessage(execError, binary, args), {
      binary,
      args,
      code: execError.code ?? null,
      signal: execError.signal ?? null,
      stdout: execError.stdout,
      stderr: execError.stderr,
      cause: error
    });
  }
}

export function parseJsonOutput<T>(stdout: string): T {
  const trimmed = stdout.trim();

  if (!trimmed) {
    throw new KagiCliError("kagi returned empty stdout for a JSON command");
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch (error) {
    throw new KagiCliError("failed to parse JSON output from kagi", {
      stdout: trimmed,
      cause: error
    });
  }
}

export async function runKagiJson<T = unknown>(
  args: string[],
  options: RunKagiOptions = {}
): Promise<T> {
  const { stdout } = await runKagi(args, options);
  return parseJsonOutput<T>(stdout);
}

export async function runKagiText(
  args: string[],
  options: RunKagiOptions = {}
): Promise<string> {
  const { stdout } = await runKagi(args, options);
  return stdout.trimEnd();
}
