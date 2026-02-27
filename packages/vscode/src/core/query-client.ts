import type {
  CapabilitiesResponse,
  DiagnosticsSnapshotResponse,
  MappingResponse,
  OverlayResponse,
  SsrResponse,
  TemplateInfoResponse,
} from "../types.js";
import type { DebugChannel, ErrorReporter, ObservabilityService, TraceService } from "./observability.js";
import type { LspFacade } from "./lsp-facade.js";

type QueryKeyPart = string | number | boolean | null | undefined;
export type QueryKey = string | readonly QueryKeyPart[];

export interface QueryOptions {
  ttlMs?: number;
  dedupe?: boolean;
  timeoutMs?: number;
  name?: string;
  signal?: AbortSignal;
  reportErrors?: boolean;
  errorContext?: Record<string, unknown>;
}

type CacheEntry<T> = {
  value: T;
  storedAt: number;
  accessedAt: number;
  expiresAt: number;
};

export class QueryClient {
  #lsp: LspFacade;
  #debug: DebugChannel;
  #trace: TraceService;
  #errors: ErrorReporter;
  #cache = new Map<string, CacheEntry<unknown>>();
  #inFlight = new Map<string, Promise<unknown>>();
  #maxEntries: number;
  #defaultTtlMs: number;

  constructor(
    lsp: LspFacade,
    observability: ObservabilityService,
    options: { maxEntries?: number; defaultTtlMs?: number } = {},
  ) {
    this.#lsp = lsp;
    this.#debug = observability.debug.channel("query");
    this.#trace = observability.trace;
    this.#errors = observability.errors;
    this.#maxEntries = Math.max(0, Math.floor(options.maxEntries ?? 500));
    this.#defaultTtlMs = Math.max(0, Math.floor(options.defaultTtlMs ?? 0));
  }

  clear(): void {
    this.#cache.clear();
    this.#inFlight.clear();
  }

  invalidate(key: QueryKey): void {
    const normalized = normalizeKey(key);
    this.#cache.delete(normalized);
    this.#inFlight.delete(normalized);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.#cache.keys()) {
      if (key.startsWith(prefix)) {
        this.#cache.delete(key);
      }
    }
    for (const key of this.#inFlight.keys()) {
      if (key.startsWith(prefix)) {
        this.#inFlight.delete(key);
      }
    }
  }

  async query<T>(key: QueryKey, fetcher: () => Promise<T>, options: QueryOptions = {}): Promise<T> {
    const name = options.name ?? defaultName(key);
    const normalized = normalizeKey(key);
    const ttlMs = Math.max(0, Math.floor(options.ttlMs ?? this.#defaultTtlMs));
    const dedupe = options.dedupe !== false;
    const now = Date.now();

    if (ttlMs > 0) {
      const cached = this.#cache.get(normalized);
      if (cached && cached.expiresAt > now) {
        cached.accessedAt = now;
        this.#debug("cache.hit", { name });
        return cached.value as T;
      }
      if (cached) {
        this.#cache.delete(normalized);
        this.#debug("cache.expired", { name });
      }
    }

    if (dedupe) {
      const inFlight = this.#inFlight.get(normalized);
      if (inFlight) {
        this.#debug("dedupe.hit", { name });
        return inFlight as Promise<T>;
      }
    }

    this.#debug("request.start", { name });

    const run = async () => {
      try {
        const result = await withGuards(fetcher(), options);
        if (ttlMs > 0) {
          const completedAt = Date.now();
          this.#cache.set(normalized, {
            value: result,
            storedAt: completedAt,
            accessedAt: completedAt,
            expiresAt: completedAt + ttlMs,
          });
          this.#prune();
        }
        this.#debug("request.success", { name });
        return result;
      } catch (err) {
        if (options.reportErrors) {
          this.#errors.report(err, `query.${name}`, {
            context: { key: normalized, ...options.errorContext },
          });
        }
        const message = err instanceof Error ? err.message : String(err);
        this.#debug("request.error", { name, message });
        throw err;
      } finally {
        this.#inFlight.delete(normalized);
      }
    };

    const traceName = `query.${name}`;
    const promise = this.#trace.spanAsync(traceName, run);
    if (dedupe) {
      this.#inFlight.set(normalized, promise as Promise<unknown>);
    }
    return promise;
  }

  getOverlay(uri: string, options?: QueryOptions): Promise<OverlayResponse | null> {
    return this.query(["overlay", uri], () => this.#lsp.getOverlay(uri), { ...options, name: "overlay" });
  }

  getMapping(uri: string, options?: QueryOptions): Promise<MappingResponse | null> {
    return this.query(["mapping", uri], () => this.#lsp.getMapping(uri), { ...options, name: "mapping" });
  }

  getSsr(uri: string, options?: QueryOptions): Promise<SsrResponse | null> {
    return this.query(["ssr", uri], () => this.#lsp.getSsr(uri), { ...options, name: "ssr" });
  }

  getDiagnostics(uri: string, options?: QueryOptions): Promise<DiagnosticsSnapshotResponse | null> {
    return this.query(["diagnostics", uri], () => this.#lsp.getDiagnostics(uri), { ...options, name: "diagnostics" });
  }

  queryAtPosition(
    uri: string,
    position: { line: number; character: number },
    options?: QueryOptions & { docVersion?: number },
  ): Promise<TemplateInfoResponse | null> {
    const { docVersion, ...queryOptions } = options ?? {};
    const key: QueryKey = ["query", uri, position.line, position.character, docVersion ?? null];
    return this.query(key, () => this.#lsp.queryAtPosition(uri, position), { ...queryOptions, name: "queryAtPosition" });
  }

  dumpState(options?: QueryOptions): Promise<unknown> {
    return this.query("dumpState", () => this.#lsp.dumpState(), { ...options, name: "dumpState" });
  }

  getCapabilities(options?: QueryOptions): Promise<CapabilitiesResponse | null> {
    return this.query("capabilities", () => this.#lsp.getCapabilities(), {
      ...options,
      name: "capabilities",
      ttlMs: options?.ttlMs ?? 5_000,
    });
  }

  #prune(): void {
    if (this.#maxEntries <= 0) {
      this.#cache.clear();
      return;
    }
    if (this.#cache.size <= this.#maxEntries) return;

    const now = Date.now();
    for (const [key, entry] of this.#cache) {
      if (entry.expiresAt <= now) {
        this.#cache.delete(key);
      }
    }
    if (this.#cache.size <= this.#maxEntries) return;

    const entries = Array.from(this.#cache.entries())
      .sort((a, b) => a[1].accessedAt - b[1].accessedAt);
    const toRemove = this.#cache.size - this.#maxEntries;
    for (const [key] of entries.slice(0, toRemove)) {
      this.#cache.delete(key);
    }
  }
}

function defaultName(key: QueryKey): string {
  return typeof key === "string" ? key : "query";
}

function normalizeKey(key: QueryKey): string {
  if (typeof key === "string") return key;
  return JSON.stringify(key);
}

function withGuards<T>(promise: Promise<T>, options: QueryOptions): Promise<T> {
  if (!options.timeoutMs && !options.signal) {
    return promise;
  }

  const races: Promise<T>[] = [promise];
  const cleanups: Array<() => void> = [];

  if (options.timeoutMs && options.timeoutMs > 0) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        const err = new Error(`Query timed out after ${options.timeoutMs}ms`);
        err.name = "TimeoutError";
        reject(err);
      }, options.timeoutMs);
      timer.unref?.();
    });
    cleanups.push(() => {
      if (timer) {
        clearTimeout(timer);
      }
    });
    races.push(timeoutPromise);
  }

  if (options.signal) {
    const { signal } = options;
    let onAbort: (() => void) | undefined;
    const abortPromise = new Promise<never>((_resolve, reject) => {
      if (signal.aborted) {
        const err = new Error("Query aborted");
        err.name = "AbortError";
        reject(err);
        return;
      }
      onAbort = () => {
        const err = new Error("Query aborted");
        err.name = "AbortError";
        reject(err);
      };
      signal.addEventListener("abort", onAbort, { once: true });
    });
    cleanups.push(() => {
      if (onAbort) {
        signal.removeEventListener("abort", onAbort);
      }
    });
    races.push(abortPromise);
  }

  const raced = Promise.race(races);
  raced.finally(() => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  });

  void promise.catch(() => {});
  return raced;
}
