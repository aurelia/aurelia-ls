import { describe, expect, it } from "vitest";
import {
  DEGRADATION_FORM_ONLY_VALUES,
  DEGRADATION_TARGET_CATEGORIES,
  DEGRADATION_TARGET_FORM_RELATIONS,
  parseDegradationTarget,
  serializeDegradationTarget,
} from "../../out/shared/index.js";

describe("semantic-authority degradation target encoding", () => {
  it("serializes and parses EB-5 degradation targets deterministically", () => {
    const serialized = serializeDegradationTarget([
      { category: "world-open", detail: "declaration-missing" },
      { category: "activation-gap", detail: "plugin-unresolved" },
    ]);

    expect(serialized).toBe(
      "activation-gap:plugin-unresolved|world-open:declaration-missing",
    );
    expect(parseDegradationTarget(serialized)).toEqual([
      { category: "activation-gap", detail: "plugin-unresolved" },
      { category: "world-open", detail: "declaration-missing" },
    ]);
  });

  it("keeps graph-node target categories distinct from facade-only degradation forms", () => {
    expect(DEGRADATION_TARGET_CATEGORIES).toContain("evaluator-error");
    expect(DEGRADATION_TARGET_FORM_RELATIONS["evaluator-error"]).toEqual({
      relation: "target-only",
    });
    expect(DEGRADATION_FORM_ONLY_VALUES).toEqual(["site-unknown"]);
  });
});
