import type { OutputChannel } from "vscode";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";
export type LogFormat = "pretty" | "json";

export interface LoggerSettings {
  level: LogLevel;
  format: LogFormat;
  timestamps: boolean;
}

export interface LoggerOptions {
  settings?: Partial<LoggerSettings>;
  channel?: OutputChannel;
  scope?: string[];
  context?: Record<string, unknown>;
  state?: LoggerState;
}

export interface LoggerState {
  name: string;
  channel: OutputChannel;
  settings: LoggerSettings;
}

const DEFAULT_SETTINGS: LoggerSettings = {
  level: "info",
  format: "pretty",
  timestamps: false,
};

const LEVELS: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

export class ClientLogger {
  #vscode: VscodeApi;
  #state: LoggerState;
  #scope: string[];
  #context: Record<string, unknown>;

  constructor(channelName: string, vscode: VscodeApi = getVscodeApi(), options: LoggerOptions = {}) {
    this.#vscode = vscode;
    this.#state = options.state ?? this.#createState(channelName, vscode, options);
    this.#scope = options.scope ?? [];
    this.#context = options.context ?? {};
  }

  get channel(): OutputChannel {
    return this.#state.channel;
  }

  get settings(): LoggerSettings {
    return this.#state.settings;
  }

  child(scope: string, context?: Record<string, unknown>): ClientLogger {
    return new ClientLogger(this.#state.name, this.#vscode, {
      state: this.#state,
      scope: [...this.#scope, scope],
      context: { ...this.#context, ...(context ?? {}) },
    });
  }

  updateSettings(settings: Partial<LoggerSettings>): void {
    Object.assign(this.#state.settings, settings);
  }

  setLevel(level: LogLevel): void {
    this.#state.settings.level = level;
  }

  show(preserveFocus = false): void {
    this.#state.channel.show(preserveFocus);
  }

  write(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    options?: { raw?: boolean; force?: boolean; error?: unknown },
  ): void {
    if (!options?.force && !this.#shouldLog(level)) return;
    if (options?.raw) {
      this.#state.channel.appendLine(message);
      return;
    }
    const line = this.#formatLine(level, message, context, options?.error);
    this.#state.channel.appendLine(line);
    const stack = options?.error instanceof Error ? options.error.stack : null;
    if (stack) {
      this.#state.channel.appendLine(stack);
    }
  }

  log(message: string, context?: Record<string, unknown>): void {
    this.write("info", message, context);
  }

  trace(message: string, context?: Record<string, unknown>): void {
    this.write("trace", message, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.write("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.write("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>, error?: unknown): void {
    this.write("warn", message, context, { error });
  }

  error(message: string, context?: Record<string, unknown>, error?: unknown): void {
    this.write("error", message, context, { error });
  }

  #shouldLog(level: LogLevel): boolean {
    return LEVELS[level] >= LEVELS[this.#state.settings.level];
  }

  #formatLine(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: unknown,
  ): string {
    const settings = this.#state.settings;
    const scope = this.#scope.length ? this.#scope.join(".") : null;
    const mergedContext = this.#mergeContext(context, error, settings.format === "json");

    if (settings.format === "json") {
      return JSON.stringify({
        timestamp: settings.timestamps ? new Date().toISOString() : undefined,
        level,
        scope,
        message,
        context: mergedContext && Object.keys(mergedContext).length ? mergedContext : undefined,
      });
    }

    const parts: string[] = [];
    if (settings.timestamps) {
      parts.push(new Date().toISOString());
    }
    parts.push(level.toUpperCase());
    if (scope) {
      parts.push(scope);
    }
    const header = parts.length ? `[${parts.join("] [")}]` : "";
    const contextText = mergedContext ? formatContext(mergedContext) : "";
    return contextText ? `${header} ${message} ${contextText}` : `${header} ${message}`;
  }

  #mergeContext(
    context?: Record<string, unknown>,
    error?: unknown,
    includeStack?: boolean,
  ): Record<string, unknown> | null {
    const base = { ...this.#context, ...(context ?? {}) };
    if (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      base.error = err.message;
      if (includeStack && err.stack) {
        base.stack = err.stack;
      }
    }
    return Object.keys(base).length ? base : null;
  }

  #createState(channelName: string, vscode: VscodeApi, options: LoggerOptions): LoggerState {
    const settings: LoggerSettings = {
      ...DEFAULT_SETTINGS,
      ...(options.settings ?? {}),
    };
    const channel = options.channel ?? vscode.window.createOutputChannel(channelName);
    return { name: channelName, channel, settings };
  }
}

function formatContext(context: Record<string, unknown>): string {
  const entries = Object.entries(context);
  if (!entries.length) return "";
  return entries
    .map(([key, value]) => `${key}=${formatValue(value)}`)
    .join(" ");
}

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") {
    return value.includes(" ") ? JSON.stringify(value) : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.length}]`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}
