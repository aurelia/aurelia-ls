import type { LogOutputChannel } from "vscode";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";

interface LoggerState {
  readonly channel: LogOutputChannel;
}

/** Thin scoped adapter over VS Code's native level-aware output channel. */
export class ClientLogger {
  readonly #state: LoggerState;
  readonly #scope: readonly string[];
  readonly #context: Readonly<Record<string, unknown>>;

  constructor(
    channelName: string,
    vscode?: VscodeApi,
    state?: LoggerState,
    scope: readonly string[] = [],
    context: Readonly<Record<string, unknown>> = {},
  ) {
    this.#state = state ?? {
      channel: (vscode ?? getVscodeApi()).window.createOutputChannel(channelName, { log: true }),
    };
    this.#scope = scope;
    this.#context = context;
  }

  get channel(): LogOutputChannel {
    return this.#state.channel;
  }

  child(scope: string, context?: Record<string, unknown>): ClientLogger {
    return new ClientLogger(
      this.#state.channel.name,
      undefined,
      this.#state,
      [...this.#scope, scope],
      { ...this.#context, ...(context ?? {}) },
    );
  }

  dispose(): void {
    this.#state.channel.dispose();
  }

  show(preserveFocus = false): void {
    this.#state.channel.show(preserveFocus);
  }

  log(message: string, context?: Record<string, unknown>): void {
    this.info(message, context);
  }

  trace(message: string, context?: Record<string, unknown>): void {
    this.#state.channel.trace(this.#format(message, context));
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.#state.channel.debug(this.#format(message, context));
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.#state.channel.info(this.#format(message, context));
  }

  warn(message: string, context?: Record<string, unknown>, error?: unknown): void {
    this.#state.channel.warn(this.#format(message, context), ...errorArgs(error));
  }

  error(message: string, context?: Record<string, unknown>, error?: unknown): void {
    this.#state.channel.error(this.#format(message, context), ...errorArgs(error));
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
