import { describe, expect, it } from "vitest";
import {
  CLAIM_FAMILY_DEFINITIONS,
  CLOSURE_CONTRACT_DEFINITIONS,
  DECLARATION_SURFACE_DEFINITIONS,
  DEPENDENCY_CONCEPTS,
  FIELD_SCHEMA_DEFINITIONS,
  GOVERNED_FAMILY_DEFINITIONS,
  GRAMMAR_SHAPE_DEFINITIONS,
  POSITION_FAMILY_DEFINITIONS,
  RESOURCE_KIND_DEFINITIONS,
  SCOPE_FAMILY_DEFINITIONS,
  SUBJECT_MODEL_REGISTRY,
  TRAIT_SCHEMA_DEFINITIONS,
  WITNESS_FAMILY_DEFINITIONS,
  registerSubjectModelExtension,
} from "../../out/subject-model/index.js";
import { EDGE_CLASSES } from "../../out/shared/index.js";
import type {
  ClaimFamilyDefinition,
  GovernedFamilyDefinition,
} from "../../out/subject-model/index.js";

const EXPECTED_FAMILY_IDS_BY_ORDINAL = [
  "claim.identity.custom-element",
  "claim.resource.custom-element-field",
  "claim.identity.custom-attribute",
  "claim.resource.custom-attribute-field",
  "claim.resource.controllerhood",
  "claim.identity.value-converter",
  "claim.resource.value-converter-field",
  "claim.identity.binding-behavior",
  "claim.resource.binding-behavior-field",
  "claim.identity.binding-command",
  "claim.resource.binding-command-field",
  "claim.identity.attribute-pattern",
  "claim.resource.attribute-pattern-field",
  "claim.identity.local-custom-element",
  "claim.interface.bindable-identity",
  "claim.interface.bindable-attribute",
  "claim.interface.bindable-mode",
  "claim.interface.bindable-callback",
  "claim.interface.bindable-set",
  "claim.availability.resource-admission",
  "claim.availability.vocabulary-admission",
  "claim.reachability.resource-scope",
  "claim.reachability.template-scope",
  "claim.position.grammar-only-classification",
  "claim.position.vocabulary-gated-classification",
  "claim.position.resource-gated-classification",
  "correctness.1.resource-scope-absence",
  "correctness.1.vocabulary-entry-absence",
  "correctness.1.schema-surface-absence",
  "correctness.2.missing-bindable",
  "correctness.3.duplicate-registration",
  "correctness.4.syntax-invalid",
  "correctness.4.symbol-unresolved",
  "correctness.4.type-contradiction",
  "correctness.4.subject-derived-resource-misuse",
  "correctness.4.governed-resource-misuse",
  "correctness.5.template-structure",
  "correctness.6.controller-linkage",
  "correctness.7.binding-behavior-unknown-entry",
  "correctness.7.binding-behavior-misuse",
  "correctness.7.binding-command-unknown-entry",
  "correctness.7.binding-command-misuse",
  "correctness.8.composition",
  "correctness.9.structural-invalid",
  "correctness.9.semantic-non-iterable",
  "witness.boundary.open-boundary",
  "witness.declaration.declaration-surface",
  "witness.support.support-bundle",
  "witness.completeness.grammar-shape",
  "witness.completeness.resource-admission",
  "witness.completeness.vocabulary-admission",
  "witness.completeness.resource-scope",
  "witness.completeness.template-scope",
  "witness.completeness.type-closure",
  "claim.governed.controller-semantics",
  "claim.governed.binding-command-semantics",
  "claim.governed.attribute-pattern-semantics",
] as const;

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

    expect(SUBJECT_MODEL_REGISTRY.claimFamiliesById.get("claim.resource.custom-element-field")).toMatchObject({
      nodeKind: "field-fact",
      stage: "2-4",
      keyConstructor: "FieldFactKey(ResourceKey(custom-element, canonicalName), fieldPath)",
      incomingEdgeClasses: ["support"],
      output: "14 FieldFact nodes per CE",
    });

    expect(SUBJECT_MODEL_REGISTRY.claimFamiliesById.get("claim.resource.binding-command-field")).toMatchObject({
      nodeKind: "field-fact",
      stage: "2-4",
      keyConstructor: "FieldFactKey(ResourceKey(binding-command, canonicalName), fieldPath)",
      output: "2 FieldFact nodes per BC",
    });

    expect(SUBJECT_MODEL_REGISTRY.claimFamiliesById.get("claim.governed.binding-command-semantics")).toMatchObject({
      nodeKind: "governed-semantic",
      stage: "3",
      incomingEdgeClasses: ["support", "reachability-scope"],
      analysis: "Extract commandKind, expressionRequired, targetProperty",
    });

    expect(SUBJECT_MODEL_REGISTRY.claimFamiliesById.get("witness.completeness.resource-admission")).toMatchObject({
      nodeKind: "completeness-witness",
      stage: "5",
      keyConstructor: "CompletenessKey(consultedWorld+resourceFamily, resource-admission)",
      output: "witnessState",
    });
  });

  it("surfaces EB-6 field schema metadata and the EB-7 trait catalog", () => {
    expect(FIELD_SCHEMA_DEFINITIONS).toHaveLength(37);
    expect(SUBJECT_MODEL_REGISTRY.fieldSchemasByResourceKind.get("custom-element")).toHaveLength(14);
    expect(SUBJECT_MODEL_REGISTRY.fieldSchemasByResourceKind.get("custom-attribute")).toHaveLength(9);
    expect(SUBJECT_MODEL_REGISTRY.fieldSchemasByResourceKind.get("value-converter")).toHaveLength(3);
    expect(SUBJECT_MODEL_REGISTRY.fieldSchemasByResourceKind.get("binding-behavior")).toHaveLength(3);
    expect(SUBJECT_MODEL_REGISTRY.fieldSchemasByResourceKind.get("binding-command")).toHaveLength(2);
    expect(SUBJECT_MODEL_REGISTRY.fieldSchemasByResourceKind.get("attribute-pattern")).toHaveLength(2);
    expect(SUBJECT_MODEL_REGISTRY.fieldSchemasByResourceKind.get("local-custom-element")).toHaveLength(4);

    expect(
      FIELD_SCHEMA_DEFINITIONS.find(({ schemaId }) => schemaId === "custom-element:shadowOptions"),
    ).toMatchObject({
      valueType: "{ mode: 'open' | 'closed' } | null",
      identityCarried: false,
      completenessSensitive: true,
      owningFamilyId: "claim.resource.custom-element-field",
    });
    expect(
      FIELD_SCHEMA_DEFINITIONS.find(({ schemaId }) => schemaId === "custom-element:capture"),
    ).toMatchObject({
      valueType: "boolean | { kind: 'filter' }",
      identityCarried: false,
      completenessSensitive: true,
    });
    expect(
      FIELD_SCHEMA_DEFINITIONS.find(({ schemaId }) => schemaId === "custom-element:processContent"),
    ).toMatchObject({
      valueType: "boolean",
      identityCarried: false,
      completenessSensitive: true,
    });
    expect(
      FIELD_SCHEMA_DEFINITIONS.find(({ schemaId }) => schemaId === "custom-element:watches"),
    ).toMatchObject({
      valueType: "WatchFieldValue[]",
      identityCarried: false,
      completenessSensitive: true,
    });
    expect(
      FIELD_SCHEMA_DEFINITIONS.find(({ schemaId }) => schemaId === "custom-attribute:watches"),
    ).toMatchObject({
      valueType: "WatchFieldValue[]",
      identityCarried: false,
      completenessSensitive: true,
    });
    expect(
      FIELD_SCHEMA_DEFINITIONS.find(({ schemaId }) => schemaId === "binding-command:name"),
    ).toMatchObject({
      valueType: "string",
      identityCarried: true,
      completenessSensitive: false,
    });
    expect(
      FIELD_SCHEMA_DEFINITIONS.find(({ schemaId }) => schemaId === "binding-command:aliases"),
    ).toMatchObject({
      valueType: "string[]",
      identityCarried: false,
      completenessSensitive: true,
    });
    expect(
      FIELD_SCHEMA_DEFINITIONS.find(({ schemaId }) => schemaId === "binding-command:commandKind"),
    ).toBeUndefined();

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
        dependencies: ["controller-semantics-governed-closure"],
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

  it("maintains referential integrity across the full runtime registry", () => {
    expect(CLAIM_FAMILY_DEFINITIONS.map(({ ordinal }) => ordinal)).toEqual(
      Array.from({ length: EXPECTED_FAMILY_IDS_BY_ORDINAL.length }, (_, index) => index + 1),
    );
    expect(CLAIM_FAMILY_DEFINITIONS.map(({ familyId }) => familyId)).toEqual(
      EXPECTED_FAMILY_IDS_BY_ORDINAL,
    );
    expect(new Set(CLAIM_FAMILY_DEFINITIONS.map(({ familyId }) => familyId)).size).toBe(
      EXPECTED_FAMILY_IDS_BY_ORDINAL.length,
    );

    const usedEdgeClasses = new Set<string>();
    for (const family of CLAIM_FAMILY_DEFINITIONS) {
      expect(new Set(family.incomingEdgeClasses).size).toBe(family.incomingEdgeClasses.length);
      for (const edgeClass of family.incomingEdgeClasses) {
        usedEdgeClasses.add(edgeClass);
        expect(EDGE_CLASSES).toContain(edgeClass);
      }

      const crossFamilyDependencies = family.crossFamilyDependencies ?? [];
      expect(new Set(crossFamilyDependencies).size).toBe(crossFamilyDependencies.length);
      expect(crossFamilyDependencies).not.toContain(family.familyId);
      for (const dependencyFamilyId of crossFamilyDependencies) {
        expect(SUBJECT_MODEL_REGISTRY.claimFamiliesById.has(dependencyFamilyId)).toBe(true);
      }
    }
    expect([...usedEdgeClasses].sort()).toEqual([
      "completeness",
      "context-admission",
      "reachability-scope",
      "support",
    ]);

    const usedDependencyConcepts = new Set<string>();
    for (const family of CLAIM_FAMILY_DEFINITIONS) {
      for (const dependency of family.dependencies) usedDependencyConcepts.add(dependency);
    }
    for (const family of GOVERNED_FAMILY_DEFINITIONS) {
      for (const dependency of family.dependencies) usedDependencyConcepts.add(dependency);
      expect(SUBJECT_MODEL_REGISTRY.claimFamiliesById.has(family.claimFamilyId)).toBe(true);
    }
    for (const family of SCOPE_FAMILY_DEFINITIONS) {
      for (const dependency of family.dependencies) usedDependencyConcepts.add(dependency);
      expect(SUBJECT_MODEL_REGISTRY.claimFamiliesById.has(family.claimFamilyId)).toBe(true);
    }
    for (const contract of CLOSURE_CONTRACT_DEFINITIONS) {
      for (const dependency of contract.blockingDependencies) usedDependencyConcepts.add(dependency);
      expect(SUBJECT_MODEL_REGISTRY.claimFamiliesById.has(contract.familyId)).toBe(true);
    }
    expect([...usedDependencyConcepts].sort()).toEqual([...DEPENDENCY_CONCEPTS].sort());

    for (const resourceKind of RESOURCE_KIND_DEFINITIONS) {
      expect(SUBJECT_MODEL_REGISTRY.claimFamiliesById.has(resourceKind.identityFamilyId)).toBe(true);
      if (resourceKind.fieldFamilyId) {
        expect(SUBJECT_MODEL_REGISTRY.claimFamiliesById.has(resourceKind.fieldFamilyId)).toBe(true);
      }
      expect(new Set(resourceKind.declarationSurfaceIds).size).toBe(resourceKind.declarationSurfaceIds.length);
      for (const declarationSurfaceId of resourceKind.declarationSurfaceIds) {
        const declarationSurface =
          SUBJECT_MODEL_REGISTRY.declarationSurfacesById.get(declarationSurfaceId);
        expect(declarationSurface).toBeDefined();
        expect(declarationSurface?.resourceKinds).toContain(resourceKind.kind);
      }
    }

    expect(new Set(DECLARATION_SURFACE_DEFINITIONS.map(({ surfaceId }) => surfaceId)).size).toBe(
      DECLARATION_SURFACE_DEFINITIONS.length,
    );

    for (const fieldSchema of FIELD_SCHEMA_DEFINITIONS) {
      expect(SUBJECT_MODEL_REGISTRY.claimFamiliesById.has(fieldSchema.owningFamilyId)).toBe(true);
    }

    for (const grammarShape of GRAMMAR_SHAPE_DEFINITIONS) {
      expect(
        SUBJECT_MODEL_REGISTRY.claimFamiliesById.has(grammarShape.classificationFamilyId),
      ).toBe(true);
      for (const positionFamilyId of grammarShape.positionFamilies) {
        const positionFamily =
          SUBJECT_MODEL_REGISTRY.positionFamiliesByFamily.get(positionFamilyId);
        expect(positionFamily).toBeDefined();
        expect(positionFamily?.classificationFamilyId).toBe(grammarShape.classificationFamilyId);
        expect(positionFamily?.gatingTier).toBe(grammarShape.gatingTier);
      }
    }

    for (const positionFamily of POSITION_FAMILY_DEFINITIONS) {
      expect(
        SUBJECT_MODEL_REGISTRY.claimFamiliesById.has(positionFamily.classificationFamilyId),
      ).toBe(true);
    }

    for (const witnessFamily of WITNESS_FAMILY_DEFINITIONS) {
      expect(SUBJECT_MODEL_REGISTRY.claimFamiliesById.has(witnessFamily.claimFamilyId)).toBe(true);
    }

    const familiesByStatus = CLAIM_FAMILY_DEFINITIONS.reduce<Record<string, ClaimFamilyDefinition[]>>(
      (grouped, family) => {
        grouped[family.status] ??= [];
        grouped[family.status].push(family);
        return grouped;
      },
      {},
    );
    expect((familiesByStatus.provisional ?? []).map(({ familyId }) => familyId)).toEqual([
      "correctness.4.type-contradiction",
      "correctness.4.governed-resource-misuse",
      "correctness.7.binding-behavior-misuse",
    ]);
    expect((familiesByStatus.open ?? []).map(({ familyId }) => familyId)).toEqual([
      "correctness.8.composition",
      "witness.completeness.type-closure",
    ]);
    expect((familiesByStatus.deferred ?? []).map(({ familyId }) => familyId)).toEqual([
      "correctness.9.semantic-non-iterable",
    ]);

    const familiesByCategory = CLAIM_FAMILY_DEFINITIONS.reduce<Record<string, ClaimFamilyDefinition[]>>(
      (grouped, family) => {
        grouped[family.category] ??= [];
        grouped[family.category].push(family);
        return grouped;
      },
      {},
    );
    expect((familiesByCategory["resource-interface"] ?? []).length).toBe(19);
    expect((familiesByCategory["dependency-stage"] ?? []).length).toBe(4);
    expect((familiesByCategory["position-classification"] ?? []).length).toBe(3);
    expect((familiesByCategory.correctness ?? []).length).toBe(19);
    expect((familiesByCategory["witness-completeness"] ?? []).length).toBe(9);
    expect((familiesByCategory["governed-semantic"] ?? []).length).toBe(3);
  });
});
