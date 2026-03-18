import { describe, expect, it } from "vitest";
import { GOVERNED_FAMILY_DEFINITIONS } from "../../out/subject-model/index.js";

describe("semantic-authority governed family definitions", () => {
  it("matches the EB-8 slot inventories and value shapes", () => {
    const slotsByFamily = Object.fromEntries(
      GOVERNED_FAMILY_DEFINITIONS.map(({ familyId, slots }) => [
        familyId,
        slots.map(({ slotName, valueType }) => ({ slotName, valueType })),
      ]),
    );

    expect(slotsByFamily).toEqual({
      "controller-semantics": [
        { slotName: "scopeEffect", valueType: "'inherit' | 'create-child' | 'create-override'" },
        { slotName: "linkageKind", valueType: "'none' | 'parent-controller' | 'sibling-controller'" },
        { slotName: "cardinality", valueType: "'zero-or-one' | 'zero-or-many' | 'exactly-one'" },
        { slotName: "contextualData", valueType: "string[]" },
        { slotName: "viewManagement", valueType: "'none' | 'create-one' | 'create-many' | 'cache-branches'" },
      ],
      "binding-command-semantics": [
        {
          slotName: "commandKind",
          valueType:
            "'one-time' | 'to-view' | 'two-way' | 'from-view' | 'trigger' | 'capture' | 'delegate' | 'attr' | 'class' | 'style' | 'spread'",
        },
        { slotName: "expressionRequired", valueType: "boolean" },
        { slotName: "targetProperty", valueType: "string | null" },
      ],
      "attribute-pattern-semantics": [
        { slotName: "interpret", valueType: "string" },
        { slotName: "symbols", valueType: "string[]" },
      ],
    });

    expect(slotsByFamily["binding-behavior-semantics"]).toBeUndefined();
  });
});
