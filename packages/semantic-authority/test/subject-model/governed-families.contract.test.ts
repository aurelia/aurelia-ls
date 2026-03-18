import { describe, expect, it } from "vitest";
import { GOVERNED_FAMILY_DEFINITIONS } from "../../out/subject-model/index.js";

describe("semantic-authority governed family definitions", () => {
  it("matches the EB-8 slot inventories", () => {
    const slotNamesByFamily = Object.fromEntries(
      GOVERNED_FAMILY_DEFINITIONS.map(({ familyId, slotNames }) => [familyId, [...slotNames]]),
    );

    expect(slotNamesByFamily).toEqual({
      "controller-semantics": [
        "scopeEffect",
        "linkageKind",
        "cardinality",
        "contextualData",
        "viewManagement",
      ],
      "binding-command-semantics": [
        "commandKind",
        "expressionRequired",
        "targetProperty",
      ],
      "attribute-pattern-semantics": ["interpret", "symbols"],
    });
  });
});
