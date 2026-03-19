import type {
  DegradationTarget,
  ObservationSourceSurface,
  WitnessState,
} from "../../shared/index.js";
import type { FamilyTag } from "../../shared/types.js";
import { serializeGraphEntityKey, type DeclarationWitnessKey, type GraphEntityKey, type NodeKey, type ObservationKey } from "../../graph/index.js";
import type { ClaimGraph } from "../../graph/index.js";
import type { ObservationNode, WitnessNode } from "../../graph/index.js";

export interface ObservationDeclarationWitnessInput {
  readonly declarationFormSet: readonly string[];
  readonly subjectKey: GraphEntityKey;
  readonly witnessState: Exclude<WitnessState, "open">;
  readonly valueLevelProvenance?: unknown | null;
  readonly decisionLevelProvenance?: unknown | null;
}

export interface ObservationSupportTarget {
  readonly mechanismId?: string;
  readonly targetNodeKey: NodeKey;
}

export interface ObservationRecordInput {
  readonly degradationTarget?: DegradationTarget | null;
  readonly position: ObservationKey["position"];
  readonly rawDatum: unknown;
  readonly sourceSurface: ObservationSourceSurface;
  readonly supportTargets: readonly ObservationSupportTarget[];
  readonly valueLevelProvenance?: unknown | null;
}

export interface ObservationEvaluationInput {
  readonly declarationWitnesses: readonly ObservationDeclarationWitnessInput[];
  readonly documentUri: string;
  readonly observations: readonly ObservationRecordInput[];
  readonly previousDeclarationWitnessKeys?: readonly DeclarationWitnessKey[];
  readonly previousObservationKeys?: readonly ObservationKey[];
}

export interface ObservationEvaluationResult {
  readonly declarationWitnessKeys: readonly DeclarationWitnessKey[];
  readonly observationKeys: readonly ObservationKey[];
}

function createObservationNode(
  documentUri: string,
  input: ObservationRecordInput,
): ObservationNode {
  const key: ObservationKey = {
    keyKind: "observation",
    documentUri,
    position: input.position,
    sourceSurface: input.sourceSurface,
  };

  return {
    key,
    nodeKind: "observation",
    familyTag: "infrastructure.observation",
    claimState: "holds",
    validityState: "valid",
    revisionToken: 0,
    retentionTier: "hot",
    documentUri,
    position: input.position,
    sourceSurface: input.sourceSurface,
    rawDatum: input.rawDatum,
    witnessSource: input.sourceSurface,
    degradationTarget: input.degradationTarget ?? null,
    valueLevelProvenance: input.valueLevelProvenance ?? null,
  };
}

function createDeclarationWitnessNode(
  input: ObservationDeclarationWitnessInput,
): WitnessNode {
  const declarationFormSet = [...input.declarationFormSet].sort();
  const key: DeclarationWitnessKey = {
    keyKind: "declaration-witness",
    subjectKey: input.subjectKey,
    declarationFormSet: declarationFormSet.join("|"),
  };

  return {
    key,
    nodeKind: "witness",
    familyTag: "witness.declaration.declaration-surface",
    claimState: input.witnessState === "satisfied" ? "holds" : "unevaluated",
    validityState: "valid",
    revisionToken: 0,
    retentionTier: "warm",
    witnessKind: "declaration-surface",
    subjectKey: input.subjectKey,
    declarationFormSet,
    targetFamilyId: null,
    witnessState: input.witnessState,
    degradationTarget: null,
    valueLevelProvenance: input.valueLevelProvenance ?? null,
    decisionLevelProvenance: input.decisionLevelProvenance ?? null,
  };
}

export async function applyObservationEvaluation(
  graph: ClaimGraph,
  input: ObservationEvaluationInput,
): Promise<ObservationEvaluationResult> {
  const result = await graph.runMutation((mutation) => {
    for (const key of input.previousObservationKeys ?? []) {
      mutation.deleteNode(key);
    }

    for (const key of input.previousDeclarationWitnessKeys ?? []) {
      mutation.deleteNode(key);
    }

    const observationKeys: ObservationKey[] = [];
    const declarationWitnessKeys: DeclarationWitnessKey[] = [];

    for (const observation of input.observations) {
      const node = createObservationNode(input.documentUri, observation);
      observationKeys.push(node.key);
      mutation.upsertNode(node);

      for (const target of observation.supportTargets) {
        mutation.addEdge({
          edgeClass: "support",
          sourceNodeKey: node.key,
          targetNodeKey: target.targetNodeKey,
          mechanismId: target.mechanismId ?? "declaration-surface",
          revisionToken: 0,
        });
      }
    }

    for (const declarationWitness of input.declarationWitnesses) {
      const node = createDeclarationWitnessNode(declarationWitness);
      declarationWitnessKeys.push(node.key as DeclarationWitnessKey);
      mutation.upsertNode(node);
    }

    return {
      declarationWitnessKeys,
      observationKeys,
    };
  });

  return result.result;
}

export function getObservationNodesForDocument(
  graph: ClaimGraph,
  documentUri: string,
): readonly ObservationNode[] {
  const observations: ObservationNode[] = [];

  for (const node of graph.nodeStore.values()) {
    if (node.nodeKind !== "observation") {
      continue;
    }

    if ((node as ObservationNode).documentUri !== documentUri) {
      continue;
    }

    observations.push(node as ObservationNode);
  }

  return observations;
}

export function getDeclarationWitnessNodesForSubjects(
  graph: ClaimGraph,
  subjectKeys: readonly GraphEntityKey[],
): readonly WitnessNode[] {
  const subjectKeyIds = new Set(subjectKeys.map((subjectKey) => serializeGraphEntityKey(subjectKey)));
  const witnesses: WitnessNode[] = [];

  for (const node of graph.nodeStore.values()) {
    if (node.nodeKind !== "witness" || node.familyTag !== "witness.declaration.declaration-surface") {
      continue;
    }

    const witness = node as WitnessNode;
    if (!subjectKeyIds.has(serializeGraphEntityKey(witness.subjectKey))) {
      continue;
    }

    witnesses.push(witness);
  }

  return witnesses;
}
