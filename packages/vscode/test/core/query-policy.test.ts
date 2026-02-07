import { describe, test, expect } from "vitest";
import { QueryPolicies } from "../../out/core/query-policy.js";

describe("QueryPolicies", () => {
  test("capabilities policy has short TTL", () => {
    expect(QueryPolicies.capabilities.ttlMs).toBe(5000);
  });

  test("position queries are fast and uncached", () => {
    expect(QueryPolicies.queryAtPosition.ttlMs).toBe(0);
    expect(QueryPolicies.queryAtPosition.timeoutMs).toBe(400);
  });
});
