/**
 * Debug Channels for Compiler Visibility
 *
 * Provides targeted debug logging for understanding data flow and decisions
 * throughout the compiler. Complementary to CompileTrace (which handles
 * performance/timing), debug channels focus on *what* data flows and *why*
 * decisions are made.
 *
 * ## Usage
 *
 * Enable via environment variable:
 * ```bash
 * AURELIA_DEBUG=link npm test        # Just template linking
 * AURELIA_DEBUG=lower,bind npm test  # Multiple channels
 * AURELIA_DEBUG=* npm test           # Everything
 * ```
 *
 * In code (always present, zero-cost when disabled):
 * ```typescript
 * debug.link('attribute.candidates', { name, candidates });
 * debug.link('attribute.selected', { selected, reason });
 * ```
 *
 * ## Design Principles
 *
 * 1. **Zero-cost when disabled**: Channel check is a single boolean
 * 2. **Always present in code**: No adding/removing console.logs
 * 3. **Targeted activation**: Enable only what you need
 * 4. **Structured output**: Easy to parse, grep, analyze
 * 5. **AI-friendly**: Designed for LLM consumption during debugging
 */

/** Debug data can be any serializable value */
export type DebugData = Record<string, unknown>;

/** A debug channel function - logs when enabled, no-op when disabled */
export type DebugChannel = (point: string, data?: DebugData) => void;

/** Configuration for debug output */
export interface DebugConfig {
  /** Format output as JSON (machine-readable) or pretty (human-readable) */
  format: "json" | "pretty";
  /** Include timestamps in output */
  timestamps: boolean;
  /** Custom output function (defaults to console.log) */
  output: (message: string) => void;
}

/** Default configuration */
const DEFAULT_CONFIG: DebugConfig = {
  format: "pretty",
  timestamps: false,
  output: console.log,
};

/** Current configuration (can be modified at runtime) */
let config: DebugConfig = { ...DEFAULT_CONFIG };

/** Parse AURELIA_DEBUG environment variable */
function parseDebugEnv(): Set<string> {
  const env = process.env["AURELIA_DEBUG"] ?? "";
  if (!env || env === "0" || env === "false") return new Set();
  if (env === "*" || env === "1" || env === "true") {
    return new Set(["*"]); // Wildcard - all channels enabled
  }
  return new Set(env.split(",").map((s) => s.trim().toLowerCase()));
}

/** Enabled channels (parsed once at module load, can be refreshed) */
let enabledChannels = parseDebugEnv();

/** Additional channels created outside of this module */
const extraChannels = new Map<string, DebugChannel>();

/** Check if a channel is enabled */
function isEnabled(channel: string): boolean {
  return enabledChannels.has("*") || enabledChannels.has(channel.toLowerCase());
}

/** Format a debug message */
function formatMessage(
  channel: string,
  point: string,
  data: DebugData | undefined,
): string {
  const prefix = config.timestamps
    ? `[${new Date().toISOString()}] `
    : "";

  if (config.format === "json") {
    return JSON.stringify({
      channel,
      point,
      ...(data && { data }),
      ...(config.timestamps && { timestamp: Date.now() }),
    });
  }

  // Pretty format
  const label = `[${channel}.${point}]`;
  if (!data || Object.keys(data).length === 0) {
    return `${prefix}${label}`;
  }

  // Format data compactly but readably
  const formatted = formatData(data);
  return `${prefix}${label} ${formatted}`;
}

/** Format data for pretty output */
function formatData(data: DebugData, depth = 0): string {
  const entries = Object.entries(data);
  if (entries.length === 0) return "{}";

  const parts: string[] = [];
  for (const [key, value] of entries) {
    parts.push(`${key}=${formatValue(value, depth)}`);
  }

  // Single line if compact enough
  const inline = `{ ${parts.join(", ")} }`;
  if (inline.length <= 100 && depth === 0) return inline;

  // Multi-line for complex data
  if (depth === 0) {
    return `{\n  ${parts.join(",\n  ")}\n}`;
  }
  return inline;
}

/** Format a single value */
function formatValue(value: unknown, depth: number): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") {
    // Truncate long strings
    if (value.length > 60) return `"${value.slice(0, 57)}..."`;
    return `"${value}"`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.length <= 3 && depth < 2) {
      const items = value.map((v) => formatValue(v, depth + 1));
      const inline = `[${items.join(", ")}]`;
      if (inline.length <= 50) return inline;
    }
    return `[${value.length} items]`;
  }
  if (typeof value === "object") {
    // Check for common patterns
    if ("name" in value && typeof value.name === "string") {
      return `<${value.name}>`;
    }
    if ("kind" in value && typeof value.kind === "string") {
      return `<${value.kind}>`;
    }
    if (depth < 1) {
      return formatData(value as DebugData, depth + 1);
    }
    return `{...}`;
  }
  // Fallback for primitives - use JSON.stringify to avoid [object Object]
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

/**
 * Create a debug channel.
 *
 * Returns a function that logs when the channel is enabled,
 * or a no-op function when disabled (zero cost).
 */
function createChannel(name: string): DebugChannel {
  // Check enablement at creation time for zero-cost when disabled
  if (!isEnabled(name)) {
    return () => {}; // No-op
  }

  return (point: string, data?: DebugData) => {
    const message = formatMessage(name, point, data);
    config.output(message);
  };
}

/**
 * Get or create an extra debug channel by name.
 * Channels are refreshed when refreshDebugChannels() is called.
 */
export function getDebugChannel(name: string): DebugChannel {
  const key = name.trim().toLowerCase();
  if (!key) return () => {};
  const existing = extraChannels.get(key);
  if (existing) return existing;
  const channel = createChannel(key);
  extraChannels.set(key, channel);
  return channel;
}

/**
 * Refresh debug channels (re-reads environment variable).
 * Call this if AURELIA_DEBUG changes at runtime.
 */
export function refreshDebugChannels(): void {
  enabledChannels = parseDebugEnv();
  // Recreate all channels
  debug.lower = createChannel("lower");
  debug.link = createChannel("link");
  debug.bind = createChannel("bind");
  debug.typecheck = createChannel("typecheck");
  debug.aot = createChannel("aot");
  debug.overlay = createChannel("overlay");
  debug.workspace = createChannel("workspace");
  debug.ssr = createChannel("ssr");
  debug.transform = createChannel("transform");
  debug.project = createChannel("project");
  debug.vite = createChannel("vite");
  for (const name of extraChannels.keys()) {
    extraChannels.set(name, createChannel(name));
  }
}

/**
 * Configure debug output format.
 */
export function configureDebug(options: Partial<DebugConfig>): void {
  config = { ...config, ...options };
}

/**
 * Check if any debug channel is enabled.
 * Useful for conditional expensive computations.
 */
export function isDebugEnabled(channel?: string): boolean {
  if (channel) return isEnabled(channel);
  return enabledChannels.size > 0;
}

/**
 * Debug channels for each compiler subsystem.
 *
 * Usage:
 * ```typescript
 * import { debug } from './debug.js';
 *
 * debug.link('lookup', { name: 'if', candidates: [...] });
 * debug.bind('scope.create', { parentId, symbols: [...] });
 * ```
 */
export const debug = {
  /** Template lowering (HTML → IR) */
  lower: createChannel("lower"),

  /** Template linking (attaching Aurelia semantics to IR) */
  link: createChannel("link"),

  /** Scope and binding analysis */
  bind: createChannel("bind"),

  /** Type checking */
  typecheck: createChannel("typecheck"),

  /** AOT code generation */
  aot: createChannel("aot"),

  /** LSP overlay generation */
  overlay: createChannel("overlay"),

  /** Semantic workspace (editor/LSP) */
  workspace: createChannel("workspace"),

  /** SSR rendering */
  ssr: createChannel("ssr"),

  /** Source transform (TS manipulation) */
  transform: createChannel("transform"),

  /** Project semantics (project-level resource discovery and analysis) */
  project: createChannel("project"),

  /** Vite plugin lifecycle (server config, middleware, build) */
  vite: createChannel("vite"),
};

/** Type for the debug object */
export type Debug = typeof debug;
