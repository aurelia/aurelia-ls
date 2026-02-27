/**
 * Trace Utilities for Vite SSR Plugin
 *
 * Provides trace creation and management for the Vite plugin.
 * Supports console, JSON, and silent output modes.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createConsoleExporter,
  createJSONExporter,
  createMultiExporter,
  type JSONExporter,
} from "@aurelia-ls/compiler/shared/trace-exporters.js";
import {
  NOOP_TRACE,
  createTrace,
  type CompileTrace,
  type TraceExporter,
} from "@aurelia-ls/compiler/shared/trace.js";
import type { ResolvedTraceOptions, TraceOptions } from "./types.js";

/**
 * Managed trace instance with lifecycle methods.
 */
export interface ManagedTrace {
  /** The CompileTrace instance */
  trace: CompileTrace;

  /** Finish the trace and output results */
  finish(): void;

  /** Get JSON exporter if available (for JSON output mode) */
  jsonExporter: JSONExporter | null;
}

/**
 * Resolve trace options from plugin options.
 *
 * @param options - User-provided trace options
 * @param root - Project root directory
 * @returns Resolved trace options
 */
export function resolveTraceOptions(
  options: boolean | TraceOptions | undefined,
  root: string,
): ResolvedTraceOptions {
  // Check environment variable
  const envTrace = process.env["AURELIA_TRACE"];
  const envEnabled = envTrace === "1" || envTrace === "true";

  // Determine if tracing is enabled
  const enabled = options === true ||
    (typeof options === "object" && options !== null) ||
    envEnabled;

  if (!enabled) {
    return {
      enabled: false,
      output: "silent",
      minDurationNs: 0n,
      file: null,
      includeEvents: true,
      summary: false,
    };
  }

  // Parse options
  const opts = typeof options === "object" ? options : {};
  const output = opts.output ?? "console";
  const minDurationMs = opts.minDuration ?? 0;
  const minDurationNs = BigInt(Math.round(minDurationMs * 1_000_000));
  const file = opts.file
    ? resolve(root, opts.file)
    : output === "json"
      ? resolve(root, "aurelia-trace.json")
      : null;
  const includeEvents = opts.includeEvents ?? true;
  const summary = opts.summary ?? true;

  return {
    enabled: true,
    output,
    minDurationNs,
    file,
    includeEvents,
    summary,
  };
}

/**
 * Create a managed trace for a build or request.
 *
 * @param name - Trace name (e.g., "build", "request:/about")
 * @param options - Resolved trace options
 * @param logger - Vite logger for console output
 * @returns Managed trace with lifecycle methods
 */
export function createManagedTrace(
  name: string,
  options: ResolvedTraceOptions,
  logger?: { info: (msg: string) => void },
): ManagedTrace {
  if (!options.enabled) {
    return {
      trace: NOOP_TRACE,
      finish: () => {},
      jsonExporter: null,
    };
  }

  const exporters: TraceExporter[] = [];
  let jsonExporter: JSONExporter | null = null;

  // Create exporters based on output mode
  switch (options.output) {
    case "console":
      exporters.push(
        createConsoleExporter({
          minDuration: options.minDurationNs,
          logEvents: options.includeEvents,
          prefix: "[aurelia-trace]",
        }),
      );
      break;

    case "json":
      jsonExporter = createJSONExporter({
        minDuration: options.minDurationNs,
        includeEvents: options.includeEvents,
        pretty: true,
      });
      exporters.push(jsonExporter);
      break;

    case "silent":
      // Create JSON exporter for programmatic access but don't output
      jsonExporter = createJSONExporter({
        minDuration: options.minDurationNs,
        includeEvents: options.includeEvents,
      });
      exporters.push(jsonExporter);
      break;
  }

  // Create trace
  const exporter = exporters.length === 1
    ? exporters[0]!
    : createMultiExporter(exporters);

  const trace = createTrace({ name, exporter });

  // Return managed trace
  return {
    trace,
    jsonExporter,
    finish: () => {
      // End root span
      trace.rootSpan().end();

      // Write JSON file if configured
      if (options.output === "json" && options.file && jsonExporter) {
        try {
          writeFileSync(options.file, jsonExporter.toJSON());
          logger?.info(`[aurelia-trace] Trace written to ${options.file}`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          logger?.info(`[aurelia-trace] Failed to write trace: ${msg}`);
        }
      }

      // Log summary if enabled
      if (options.summary && jsonExporter && logger) {
        const summary = jsonExporter.getSummary();
        const durationStr = summary.totalDurationMs !== null
          ? `${summary.totalDurationMs}ms`
          : "unknown";

        logger.info(
          `[aurelia-trace] ${name}: ${summary.spanCount} spans, ${summary.eventCount} events, ${durationStr} total`,
        );

        // Log top spans if any
        if (summary.topSpans.length > 0) {
          const topLines = summary.topSpans
            .slice(0, 5)
            .map((s) => `  ${s.name}: ${s.totalMs}ms (${s.count}x, avg ${s.avgMs}ms)`)
            .join("\n");
          logger.info(`[aurelia-trace] Top spans:\n${topLines}`);
        }
      }
    },
  };
}

/**
 * Create a per-request trace for dev server.
 * Uses a shorter name format for cleaner logs.
 */
export function createRequestTrace(
  url: string,
  options: ResolvedTraceOptions,
  logger?: { info: (msg: string) => void },
): ManagedTrace {
  // Truncate long URLs
  const shortUrl = url.length > 40 ? url.slice(0, 37) + "..." : url;
  return createManagedTrace(`request:${shortUrl}`, options, logger);
}

/**
 * Create a build trace for production builds.
 */
export function createBuildTrace(
  options: ResolvedTraceOptions,
  logger?: { info: (msg: string) => void },
): ManagedTrace {
  return createManagedTrace("build", options, logger);
}
