import type { QueryOptions } from "./query-client.js";

export type QueryPolicyName =
  | "overlay"
  | "mapping"
  | "ssr"
  | "queryAtPosition"
  | "dumpState"
  | "capabilities";

// Keys: ["name", uri, line, character, docVersion?] for position queries.
// Prefer docVersion when available to avoid cross-version dedupe.
export const QueryPolicies: Record<QueryPolicyName, QueryOptions> = {
  overlay: { dedupe: true, ttlMs: 0, timeoutMs: 1500, reportErrors: false },
  mapping: { dedupe: true, ttlMs: 0, timeoutMs: 1500, reportErrors: false },
  ssr: { dedupe: true, ttlMs: 0, timeoutMs: 2500, reportErrors: false },
  queryAtPosition: { dedupe: true, ttlMs: 0, timeoutMs: 400, reportErrors: false },
  dumpState: { dedupe: false, ttlMs: 0, timeoutMs: 2500, reportErrors: false },
  capabilities: { dedupe: true, ttlMs: 5000, timeoutMs: 1000, reportErrors: false },
};

export function withQueryPolicy(
  name: QueryPolicyName,
  overrides?: QueryOptions,
): QueryOptions {
  return overrides ? { ...QueryPolicies[name], ...overrides } : { ...QueryPolicies[name] };
}
