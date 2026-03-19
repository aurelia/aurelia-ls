import { describe, expect, it } from "vitest";
import {
  ClaimGraph,
  type ResourceKey,
} from "../../../out/graph/index.js";
import {
  applyObservationEvaluation,
  getDeclarationWitnessNodesForSubjects,
  getObservationNodesForDocument,
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

describe("semantic-authority observation evaluator", () => {
  it("creates observation nodes, declaration-surface witnesses, and forward support edges", async () => {
    const graph = new ClaimGraph();
    const subjectKey = createResourceKey("custom-element", "app");
    const observationPosition = serializeOccurrenceAnchor({
      documentUri: "file:///app.ts",
      position: { line: 1, character: 4 },
    });

    const result = await applyObservationEvaluation(graph, {
      documentUri: "file:///app.ts",
      observations: [
        {
          position: observationPosition,
          rawDatum: {
            declarationSurface: "custom-element.decorator",
            resourceKind: "custom-element",
          },
          sourceSurface: "decorator",
          supportTargets: [
            {
              targetNodeKey: subjectKey,
            },
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

    const observations = getObservationNodesForDocument(graph, "file:///app.ts");
    expect(result.observationKeys).toHaveLength(1);
    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({
      familyTag: "infrastructure.observation",
      nodeKind: "observation",
      documentUri: "file:///app.ts",
      sourceSurface: "decorator",
      witnessSource: "decorator",
      claimState: "holds",
      retentionTier: "hot",
    });

    const declarationWitnesses = getDeclarationWitnessNodesForSubjects(graph, [subjectKey]);
    expect(result.declarationWitnessKeys).toHaveLength(1);
    expect(declarationWitnesses).toHaveLength(1);
    expect(declarationWitnesses[0]).toMatchObject({
      familyTag: "witness.declaration.declaration-surface",
      nodeKind: "witness",
      witnessKind: "declaration-surface",
      subjectKey,
      declarationFormSet: ["convention", "custom-element.decorator"],
      witnessState: "satisfied",
      claimState: "holds",
    });

    expect(graph.getIncomingEdges(subjectKey, "support")).toEqual([
      expect.objectContaining({
        edgeClass: "support",
        sourceNodeKey: observations[0].key,
        targetNodeKey: subjectKey,
        mechanismId: "declaration-surface",
      }),
    ]);
  });

  it("supports Layer 1 config observations and unsatisfied declaration witnesses", async () => {
    const graph = new ClaimGraph();
    const subjectKey = createResourceKey("binding-command", "trigger");
    const configPosition = serializeOccurrenceAnchor({
      documentUri: "config://layer1",
      position: { line: 0, character: 0 },
    });

    await applyObservationEvaluation(graph, {
      documentUri: "config://layer1",
      observations: [
        {
          position: configPosition,
          rawDatum: {
            activeBundles: ["standard-configuration"],
            governedContracts: ["binding-command-semantics"],
          },
          sourceSurface: "config",
          supportTargets: [
            {
              targetNodeKey: {
                keyKind: "governed-semantic",
                resourceKey: subjectKey,
                governedFamily: "binding-command-semantics",
              },
            },
          ],
        },
      ],
      declarationWitnesses: [
        {
          declarationFormSet: ["binding-command.definition-object"],
          subjectKey,
          witnessState: "unsatisfied",
        },
      ],
    });

    const observations = getObservationNodesForDocument(graph, "config://layer1");
    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({
      sourceSurface: "config",
      witnessSource: "config",
    });

    const declarationWitnesses = getDeclarationWitnessNodesForSubjects(graph, [subjectKey]);
    expect(declarationWitnesses).toEqual([
      expect.objectContaining({
        witnessState: "unsatisfied",
        claimState: "unevaluated",
      }),
    ]);
  });

  it("re-observes a file by deleting prior observation and declaration-witness keys before writing the new batch", async () => {
    const graph = new ClaimGraph();
    const subjectKey = createResourceKey("custom-element", "app");
    const firstPosition = serializeOccurrenceAnchor({
      documentUri: "file:///app.ts",
      position: { line: 1, character: 0 },
    });
    const secondPosition = serializeOccurrenceAnchor({
      documentUri: "file:///app.ts",
      position: { line: 2, character: 0 },
    });

    const firstPass = await applyObservationEvaluation(graph, {
      documentUri: "file:///app.ts",
      observations: [
        {
          position: firstPosition,
          rawDatum: { surface: "decorator" },
          sourceSurface: "decorator",
          supportTargets: [{ targetNodeKey: subjectKey }],
        },
      ],
      declarationWitnesses: [
        {
          declarationFormSet: ["custom-element.decorator"],
          subjectKey,
          witnessState: "satisfied",
        },
      ],
    });

    const secondPass = await applyObservationEvaluation(graph, {
      documentUri: "file:///app.ts",
      observations: [
        {
          position: secondPosition,
          rawDatum: { surface: "static-au" },
          sourceSurface: "static-au",
          supportTargets: [{ targetNodeKey: subjectKey }],
        },
      ],
      declarationWitnesses: [
        {
          declarationFormSet: ["custom-element.static-au"],
          subjectKey,
          witnessState: "satisfied",
        },
      ],
      previousObservationKeys: firstPass.observationKeys,
      previousDeclarationWitnessKeys: firstPass.declarationWitnessKeys,
    });

    const observations = getObservationNodesForDocument(graph, "file:///app.ts");
    expect(observations.map(({ key }) => key)).toEqual(secondPass.observationKeys);
    expect(observations).toEqual([
      expect.objectContaining({
        sourceSurface: "static-au",
        witnessSource: "static-au",
      }),
    ]);

    const declarationWitnesses = getDeclarationWitnessNodesForSubjects(graph, [subjectKey]);
    expect(declarationWitnesses.map(({ key }) => key)).toEqual(secondPass.declarationWitnessKeys);
    expect(declarationWitnesses).toEqual([
      expect.objectContaining({
        declarationFormSet: ["custom-element.static-au"],
      }),
    ]);
  });
});
