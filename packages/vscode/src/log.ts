import type { LogOutputChannel } from "vscode";

/** Thin scoped adapter over VS Code's native level-aware output channel. */
export class ClientLogger {
  readonly #channel: LogOutputChannel;
  readonly #scope: readonly string[];
  readonly #context: Readonly<Record<string, unknown>>;

  constructor(
    channel: LogOutputChannel,
    scope: readonly string[] = [],
    context: Readonly<Record<string, unknown>> = {},
  ) {
    this.#channel = channel;
    this.#scope = scope;
    this.#context = context;
  }

  child(scope: string, context?: Record<string, unknown>): ClientLogger {
    return new ClientLogger(
      this.#channel,
      [...this.#scope, scope],
      { ...this.#context, ...(context ?? {}) },
    );
  }

  show(preserveFocus = false): void {
    this.#channel.show(preserveFocus);
  }

  log(message: string, context?: Record<string, unknown>): void {
    this.info(message, context);
  }

  trace(message: string, context?: Record<string, unknown>): void {
    this.#channel.trace(this.#format(message, context));
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.#channel.debug(this.#format(message, context));
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.#channel.info(this.#format(message, context));
  }

  warn(message: string, context?: Record<string, unknown>, error?: unknown): void {
    this.#channel.warn(this.#format(message, context), ...errorArgs(error));
  }

  error(message: string, context?: Record<string, unknown>, error?: unknown): void {
    this.#channel.error(this.#format(message, context), ...errorArgs(error));
  }

  #format(message: string, context?: Record<string, unknown>): string {
    const scope = this.#scope.length === 0 ? "" : `[${this.#scope.join(".")}] `;
    const detail = formatContext({ ...this.#context, ...(context ?? {}) });
    return detail.length === 0 ? `${scope}${message}` : `${scope}${message} ${detail}`;
  }
}

function errorArgs(error: unknown): readonly unknown[] {
  return error == null ? [] : [error];
}

function formatContext(context: Readonly<Record<string, unknown>>): string {
  return Object.entries(context)
    .map(([key, value]) => `${key}=${formatValue(value)}`)
    .join(" ");
}

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value.includes(" ") ? JSON.stringify(value) : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}
