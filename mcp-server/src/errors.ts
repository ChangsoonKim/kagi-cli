export interface KagiCliErrorOptions {
  binary?: string;
  args?: string[];
  code?: number | string | null;
  signal?: NodeJS.Signals | null;
  stdout?: string;
  stderr?: string;
  cause?: unknown;
}

export class KagiCliError extends Error {
  readonly binary?: string;
  readonly args?: string[];
  readonly code?: number | string | null;
  readonly signal?: NodeJS.Signals | null;
  readonly stdout?: string;
  readonly stderr?: string;

  constructor(message: string, options: KagiCliErrorOptions = {}) {
    super(message);
    this.name = "KagiCliError";
    this.binary = options.binary;
    this.args = options.args;
    this.code = options.code;
    this.signal = options.signal;
    this.stdout = options.stdout;
    this.stderr = options.stderr;

    if (options.cause !== undefined) {
      Object.defineProperty(this, "cause", {
        configurable: true,
        enumerable: false,
        value: options.cause,
        writable: true
      });
    }
  }
}
