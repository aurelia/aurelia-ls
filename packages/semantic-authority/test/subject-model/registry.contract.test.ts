import { describe, expect, it } from "vitest";
import {
  CLAIM_FAMILY_DEFINITIONS,
  FIELD_SCHEMA_DEFINITIONS,
  SUBJECT_MODEL_REGISTRY,
  TRAIT_SCHEMA_DEFINITIONS,
  registerSubjectModelExtension,
} from "../../out/subject-model/index.js";
import type {
  ClaimFamilyDefinition,
  GovernedFamilyDefinition,
} from "../../out/subject-model/index.js";

describe("semantic-authority subject-model registry", () => {
  it("exposes the full 57-family substrate registry with committed status counts", () => {
    expect(CLAIM_FAMILY_DEFINITIONS).toHaveLength(57);

    const statusCounts = CLAIM_FAMILY_DEFINITIONS.reduce<Record<string, number>>((counts, family) => {
      counts[family.status] = (counts[family.status] ?? 0) + 1;
      return counts;
    }, {});

    expect(statusCounts).toEqual({
      "attractor-derived": 51,
      provisional: 3,
      open: 2,
      deferred: 1,
    });
  });

  it("indexes representative family depth for evaluator queries", () => {
    const bindingCommandMisuse =
      SUBJECT_MODEL_REGISTRY.claimFamiliesById.get("correctness.7.binding-command-misuse");
    expect(bindingCommandMisuse).toMatchObject({
      nodeKind: "correctness-finding",
      stage: "7",
      producingEvaluatorGroups: ["template-interpretation"],
      dependencies: [
        "admissibility-gate",
        "classification",
        "binding-command-semantics-governed-closure",
        "realized-world-consultation",
      ],
      keyConstructor:
        "RelationKey(OccurrenceKey(...), ResourceKey(binding-command, canonicalName), binding-command-misuse)",
    });
    expect(bindingCommandMisuse?.correctnessConditions).toContain(
      "when command semantics close and usage violates it",
    );

    const admissionFamilies =
      SUBJECT_MODEL_REGISTRY.claimFamiliesByEvaluatorGroup.get("admission")?.map(
        ({ familyId }) => familyId,
      ) ?? [];
    expect(admissionFamilies).toEqual(
      expect.arrayContaining([
        "claim.availability.resource-admission",
        "claim.availability.vocabulary-admission",
        "correctness.3.duplicate-registration",
      ]),
    );
  });

  it("surfaces the EB-6 and EB-7 schema catalogs", () => {
    expect(FIELD_SCHEMA_DEFINITIONS).toHaveLength(33);
    expect(
      FIELD_SCHEMA_DEFINITIONS.find(({ schemaId }) => schemaId === "custom-element:shadowOptions"),
    ).toMatchObject({
      valueType: "{ mode: 'open' | 'closed' } | null",
      owningFamilyId: "claim.resource.custom-element-field",
    });
    expect(
      FIELD_SCHEMA_DEFINITIONS.find(({ schemaId }) => schemaId === "binding-command:aliases"),
    ).toMatchObject({
      valueType: "string[]",
    });

    expect(TRAIT_SCHEMA_DEFINITIONS).toEqual([
      {
        traitKind: "attribute",
        valueType: "string",
        description: "Resolved HTML attribute name; never null at the graph level.",
      },
      {
        traitKind: "mode",
        valueType: "'toView' | 'fromView' | 'twoWay' | 'oneTime' | 'default'",
        description: "Bindable binding mode, including the explicit 'default' sentinel.",
      },
      {
        traitKind: "callback",
        valueType: "string | null",
        description: "Change callback method name, or null when no callback is defined.",
      },
      {
        traitKind: "set",
        valueType: "boolean",
        description: "Whether a coercion/setter function is defined.",
      },
    ]);
  });

  it("supports additive extension registration without mutating substrate definitions", () => {
    const extensionClaimFamilies = [
      {
        familyId: "extension.correctness.demo",
        ordinal: 9001,
        category: "correctness",
        nodeKind: "correctness-finding",
        keyConstructor: "RelationKey(demo-left, demo-right, demo-relation)",
        stage: "7",
        producingEvaluatorGroups: ["template-interpretation"],
        positiveAssertion: "Demo extension correctness family.",
        entityFamily: "RelationKey(demo-left, demo-right, demo-relation)",
        dependencies: ["admissibility-gate"],
        completenessConditions: "Violation-style family.",
        degradationTarget: "demo relation stays open via OpenBoundaryKey(...).",
        status: "extension",
        incomingEdgeClasses: ["context-admission"],
      },
    ] satisfies readonly ClaimFamilyDefinition[];

    const extensionGovernedFamilies = [
      {
        familyId: "controller-semantics-extension",
        claimFamilyId: "extension.correctness.demo",
        description: "Demo governed family.",
        keyConstructor:
          "GovernedSemanticKey(ResourceKey(custom-attribute, canonicalName), controller-semantics-extension)",
        closureStates: ["closed", "unassigned", "open"],
        dependencies: ["demo-governed-closure"],
        slotNames: ["demoSlot"],
        slots: [{ slotName: "demoSlot", valueType: "string", meaning: "Demo slot." }],
      },
    ] satisfies readonly GovernedFamilyDefinition[];

    const extended = registerSubjectModelExtension(SUBJECT_MODEL_REGISTRY, {
      extensionId: "extension.demo",
      claimFamilies: extensionClaimFamilies,
      governedFamilies: extensionGovernedFamilies,
    });

    expect(extended.extensionFamilies).toEqual(["extension.demo"]);
    expect(extended.claimFamiliesById.get("extension.correctness.demo")).toMatchObject({
      status: "extension",
      nodeKind: "correctness-finding",
    });
    expect(SUBJECT_MODEL_REGISTRY.claimFamiliesById.has("extension.correctness.demo")).toBe(false);

    expect(() =>
      registerSubjectModelExtension(SUBJECT_MODEL_REGISTRY, {
        extensionId: "extension.bad",
        claimFamilies: [
          {
            ...CLAIM_FAMILY_DEFINITIONS[0],
            ordinal: 9999,
          },
        ],
      }),
    ).toThrow(/override existing claim family/u);
  });
});
