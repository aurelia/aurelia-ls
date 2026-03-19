import { describe, expect, it } from "vitest";
import type {
  BindableKey,
  BindableTraitKey,
  DeclarationWitnessKey,
  FieldFactKey,
  ResourceKey,
} from "../../../out/graph/index.js";
import {
  ClaimGraph,
  type ResourceIdentityNode,
} from "../../../out/graph/index.js";
import {
  applyObservationEvaluation,
  applySubjectConvergenceStage2,
} from "../../../out/evaluators/index.js";
import { serializeOccurrenceAnchor } from "../../../out/shared/index.js";

function createResourceKey(
  resourceKind: ResourceKey["resourceKind"] = "custom-element",
  canonicalName = "app",
): ResourceKey {
  return {
    keyKind: "resource",
    resourceKind,
    canonicalName,
    ownerKey: null,
  };
}

function fieldKey(resourceKey: ResourceKey, fieldPath: string): FieldFactKey {
  return {
    keyKind: "field-fact",
    resourceKey,
    fieldPath,
  };
}

function bindableKey(ownerResourceKey: ResourceKey, propertyName: string): BindableKey {
  return {
    keyKind: "bindable",
    ownerResourceKey,
    propertyName,
  };
}

function bindableTraitKey(
  ownerResourceKey: ResourceKey,
  propertyName: string,
  traitKind: BindableTraitKey["traitKind"],
): BindableTraitKey {
  return {
    keyKind: "bindable-trait",
    bindableKey: bindableKey(ownerResourceKey, propertyName),
    traitKind,
  };
}

describe("semantic-authority subject convergence stage 2", () => {
  it("materializes resource identity, field facts, bindable interface, and declaration reference entries from observations", async () => {
    const graph = new ClaimGraph();
    const subjectKey = createResourceKey("custom-element", "app");
    const declarationWitnessKey: DeclarationWitnessKey = {
      keyKind: "declaration-witness",
      subjectKey,
      declarationFormSet: "custom-element.decorator|convention",
    };

    await applyObservationEvaluation(graph, {
      documentUri: "file:///app.ts",
      observations: [
        {
          position: serializeOccurrenceAnchor({
            documentUri: "file:///app.ts",
            position: { line: 1, character: 0 },
          }),
          rawDatum: {
            datumKind: "resource-observation",
            declarationSurfaceId: "custom-element.decorator",
            declarationReference: {
              span: { start: 10, end: 24 },
            },
            resourceKind: "custom-element",
            subjectKey,
            fields: {
              name: "app",
              className: "App",
              template: "<template></template>",
              aliases: ["x-app"],
              dependencies: ["dep-a"],
              hasSlots: true,
            },
            bindables: [
              {
                propertyName: "value",
              },
            ],
          },
          sourceSurface: "decorator",
          supportTargets: [
            { targetNodeKey: subjectKey },
            { targetNodeKey: fieldKey(subjectKey, "name") },
            { targetNodeKey: fieldKey(subjectKey, "template") },
            { targetNodeKey: bindableKey(subjectKey, "value") },
            { targetNodeKey: bindableTraitKey(subjectKey, "value", "attribute") },
          ],
        },
        {
          position: serializeOccurrenceAnchor({
            documentUri: "file:///app.ts",
            position: { line: 4, character: 0 },
          }),
          rawDatum: {
            datumKind: "resource-observation",
            declarationSurfaceId: "convention",
            resourceKind: "custom-element",
            subjectKey,
            fields: {
              template: "<template>ignored by precedence</template>",
              aliases: ["app-element"],
              dependencies: ["dep-b"],
            },
          },
          sourceSurface: "convention",
          supportTargets: [
            { targetNodeKey: subjectKey },
          ],
        },
      ],
      declarationWitnesses: [
        {
          declarationFormSet: ["custom-element.decorator", "convention"],
          subjectKey,
          witnessState: "satisfied",
        },
      ],
    });

    const result = await applySubjectConvergenceStage2(graph, {
      subjectKey,
      declarationWitnessKey,
    });

    const identity = graph.getNodeByKind("resource-identity", subjectKey) as ResourceIdentityNode | undefined;
    expect(identity).toMatchObject({
      familyTag: "claim.identity.custom-element",
      factKind: "identity",
      claimState: "holds",
      supportStatus: "supported",
      canonicalName: "app",
    });
    expect(result.nodeKeys).toContain(subjectKey);

    expect(graph.getNodeByKind("field-fact", fieldKey(subjectKey, "template"))).toMatchObject({
      fieldValue: "<template></template>",
      claimState: "holds",
      supportStatus: "supported",
    });
    expect(graph.getNodeByKind("field-fact", fieldKey(subjectKey, "aliases"))).toMatchObject({
      fieldValue: ["x-app", "app-element"],
      claimState: "holds",
    });
    expect(graph.getNodeByKind("field-fact", fieldKey(subjectKey, "dependencies"))).toMatchObject({
      fieldValue: ["dep-a", "dep-b"],
      claimState: "holds",
    });

    const bindableIdentityKey = bindableKey(subjectKey, "value");
    expect(graph.getNodeByKind("bindable-identity", bindableIdentityKey)).toMatchObject({
      claimState: "holds",
      propertyName: "value",
      supportStatus: "supported",
    });
    expect(graph.getNodeByKind("bindable-trait", bindableTraitKey(subjectKey, "value", "attribute"))).toMatchObject({
      traitValue: "value",
    });
    expect(graph.getNodeByKind("bindable-trait", bindableTraitKey(subjectKey, "value", "mode"))).toMatchObject({
      traitValue: "default",
    });
    expect(graph.getNodeByKind("bindable-trait", bindableTraitKey(subjectKey, "value", "callback"))).toMatchObject({
      traitValue: null,
    });
    expect(graph.getNodeByKind("bindable-trait", bindableTraitKey(subjectKey, "value", "set"))).toMatchObject({
      traitValue: false,
    });

    expect(graph.getIncomingEdges(subjectKey, "support")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceNodeKey: expect.objectContaining({
            keyKind: "declaration-witness",
            subjectKey,
          }),
          targetNodeKey: subjectKey,
          mechanismId: "support-bundle",
        }),
      ]),
    );

    expect(graph.getReferenceEntriesForSubject(subjectKey)).toEqual([
      expect.objectContaining({
        familyTag: "infrastructure.reference-entry.declaration",
        role: "declaration",
        referent: subjectKey,
      }),
    ]);
    expect(result.referenceEntryKeys).toHaveLength(1);
  });

  it("uses the documented row3/row5 cohabitation workaround for template-controller custom attributes", async () => {
    const graph = new ClaimGraph();
    const subjectKey = createResourceKey("custom-attribute", "if");
    const declarationWitnessKey: DeclarationWitnessKey = {
      keyKind: "declaration-witness",
      subjectKey,
      declarationFormSet: "custom-attribute.decorator|custom-attribute.template-controller-decorator",
    };

    await applyObservationEvaluation(graph, {
      documentUri: "file:///if.ts",
      observations: [
        {
          position: serializeOccurrenceAnchor({
            documentUri: "file:///if.ts",
            position: { line: 0, character: 0 },
          }),
          rawDatum: {
            datumKind: "resource-observation",
            declarationSurfaceId: "custom-attribute.template-controller-decorator",
            resourceKind: "custom-attribute",
            subjectKey,
            fields: {
              name: "if",
              className: "IfCustomAttribute",
              isTemplateController: true,
              defaultProperty: "value",
            },
          },
          sourceSurface: "decorator",
          supportTargets: [{ targetNodeKey: subjectKey }],
        },
      ],
      declarationWitnesses: [
        {
          declarationFormSet: [
            "custom-attribute.decorator",
            "custom-attribute.template-controller-decorator",
          ],
          subjectKey,
          witnessState: "satisfied",
        },
      ],
    });

    await applySubjectConvergenceStage2(graph, {
      subjectKey,
      declarationWitnessKey,
    });

    expect(graph.getNodeByKind("resource-identity", subjectKey)).toMatchObject({
      familyTag: "claim.identity.custom-attribute",
      factKind: "controllerhood",
      claimState: "holds",
      supportStatus: "supported",
    });
    expect(graph.getNodeByKind("field-fact", fieldKey(subjectKey, "isTemplateController"))).toMatchObject({
      fieldValue: true,
      claimState: "holds",
    });
  });

  it("produces a negative identity when declaration-surface is closed and no supporting observations exist", async () => {
    const graph = new ClaimGraph();
    const subjectKey = createResourceKey("binding-command", "trigger");
    const declarationWitnessKey: DeclarationWitnessKey = {
      keyKind: "declaration-witness",
      subjectKey,
      declarationFormSet: "binding-command.definition-object|binding-command.standard-configuration",
    };

    await applyObservationEvaluation(graph, {
      documentUri: "config://commands",
      observations: [],
      declarationWitnesses: [
        {
          declarationFormSet: [
            "binding-command.definition-object",
            "binding-command.standard-configuration",
          ],
          subjectKey,
          witnessState: "satisfied",
        },
      ],
    });

    const result = await applySubjectConvergenceStage2(graph, {
      subjectKey,
      declarationWitnessKey,
    });

    expect(graph.getNodeByKind("resource-identity", subjectKey)).toMatchObject({
      familyTag: "claim.identity.binding-command",
      factKind: "identity",
      claimState: "fails",
      supportStatus: "unsupported",
      realizedState: "open",
    });
    expect(result.nodeKeys).toEqual([subjectKey]);
    expect(result.referenceEntryKeys).toEqual([]);
    expect(graph.getFieldFactsForResource(subjectKey)).toEqual([]);
  });
});
