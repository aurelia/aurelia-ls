import { describe, expect, test } from "vitest";
import { StatusFeature } from "../../../out/features/status/status-feature.js";

describe("StatusFeature", () => {
  test("is available when the semantic-runtime query contract is present", () => {
    const ctx = {
      capabilities: {
        current: {
          contracts: { query: { version: "query/1" } },
          notifications: { analysisReady: true, workspaceChanged: true },
        },
      },
    };

    expect(StatusFeature.isAvailable?.(ctx as never)).toBe(true);
  });

  test("is unavailable when the query contract is explicitly absent", () => {
    const ctx = {
      capabilities: {
        current: {
          contracts: { query: undefined },
          notifications: { analysisReady: true, workspaceChanged: true },
        },
      },
    };

    expect(StatusFeature.isAvailable?.(ctx as never)).toBe(false);
  });
});
