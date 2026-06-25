import type { QueryOptions } from "./query-client.js";

export type QueryPolicyName =
  | "diagnostics"
  | "dumpState"
  | "capabilities";

export const QueryPolicies: Record<QueryPolicyName, QueryOptions> = {
  diagnostics: { dedupe: true, ttlMs: 0, timeoutMs: 1500, reportErrors: false },
  dumpState: { dedupe: false, ttlMs: 0, timeoutMs: 2500, reportErrors: false },
  capabilities: { dedupe: true, ttlMs: 5000, timeoutMs: 1000, reportErrors: false },
};

export function withQueryPolicy(
  name: QueryPolicyName,
  overrides?: QueryOptions,
): QueryOptions {
  return overrides ? { ...QueryPolicies[name], ...overrides } : { ...QueryPolicies[name] };
}
