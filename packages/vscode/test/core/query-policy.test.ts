import { describe, test, expect } from "vitest";
import { QueryPolicies } from "../../out/core/query-policy.js";

describe("QueryPolicies", () => {
  test("capabilities policy has short TTL", () => {
    expect(QueryPolicies.capabilities.ttlMs).toBe(5000);
  });

  test("diagnostics reports are uncached runtime reads", () => {
    expect(QueryPolicies.diagnostics.ttlMs).toBe(0);
    expect(QueryPolicies.diagnostics.timeoutMs).toBe(1500);
  });
});
