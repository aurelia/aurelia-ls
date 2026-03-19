import type {
  BindableKey,
  BindableTraitKey,
  ClaimGraph,
  DeclarationWitnessKey,
  FieldFactKey,
  GraphEntityKey,
  NodeKey,
  ObservationKey,
  ReferenceEntryKey,
  ResourceKey,
  ResourceIdentityNode,
  FieldFactNode,
  BindableIdentityNode,
  BindableTraitNode,
  ReferenceEntryNode,
  WitnessNode,
  ObservationNode,
  SupportStatus,
} from "../../graph/index.js";
import { serializeGraphEntityKey } from "../../graph/index.js";
import { FIELD_SCHEMA_DEFINITIONS, RESOURCE_KIND_DEFINITIONS, TRAIT_SCHEMA_DEFINITIONS } from "../../subject-model/index.js";
import type { FieldSchemaDefinition } from "../../subject-model/index.js";
import type {
  DegradationTarget,
  ResourceKind,
} from "../../shared/index.js";
import {
  getDeclarationWitnessNodesForSubjects,
  getObservationNodesForDocument,
} from "./observation.js";
import {
  type BindableObservationDatum,
  type ResourceObservationDatum,
  isResourceObservationDatum,
  sourceSurfacePrecedence,
} from "./types.js";

export interface SubjectConvergenceStage2Input {
  readonly previousNodeKeys?: readonly NodeKey[];
  readonly previousReferenceEntryKeys?: readonly ReferenceEntryKey[];
  readonly subjectKey: ResourceKey;
}

export interface SubjectConvergenceStage2Result {
  readonly nodeKeys: readonly NodeKey[];
  readonly referenceEntryKeys: readonly ReferenceEntryKey[];
}

type ConvergenceCandidate = {
  readonly declarationSurfaceId: string;
  readonly sourceSurface: ObservationNode["sourceSurface"];
  readonly value: unknown;
};

function createResourceIdentityNode(
  subjectKey: ResourceKey,
  familyTag: string,
  supportStatus: SupportStatus,
  claimState: ResourceIdentityNode["claimState"],
  degradationTarget: DegradationTarget | null,
  factKind: ResourceIdentityNode["factKind"],
): ResourceIdentityNode {
  return {
    key: subjectKey,
    nodeKind: "resource-identity",
    familyTag,
    claimState,
    validityState: "valid",
    revisionToken: 0,
    retentionTier: "warm",
    resourceKind: subjectKey.resourceKind,
    canonicalName: subjectKey.canonicalName,
    ownerResourceKey: subjectKey.ownerKey,
    factKind,
    realizedState: "open",
    supportStatus,
    degradationTarget,
    valueLevelProvenance: null,
    decisionLevelProvenance: null,
  };
}

function createFieldFactNode(
  subjectKey: ResourceKey,
  schema: FieldSchemaDefinition,
  claimState: FieldFactNode["claimState"],
  fieldValue: unknown | null,
  supportStatus: SupportStatus,
  degradationTarget: DegradationTarget | null,
): FieldFactNode {
  const key: FieldFactKey = {
    keyKind: "field-fact",
    resourceKey: subjectKey,
    fieldPath: schema.fieldPath,
  };

  return {
    key,
    nodeKind: "field-fact",
    familyTag: schema.owningFamilyId,
    claimState,
    validityState: "valid",
    revisionToken: 0,
    retentionTier: "warm",
    resourceKind: subjectKey.resourceKind,
    canonicalName: subjectKey.canonicalName,
    ownerResourceKey: subjectKey.ownerKey,
    fieldPath: schema.fieldPath,
    factKind: "resource-field",
    realizedState: "open",
    supportStatus,
    fieldValue,
    identityCarried: schema.identityCarried,
    completenessSensitive: schema.completenessSensitive,
    degradationTarget,
    valueLevelProvenance: null,
    decisionLevelProvenance: null,
  };
}

function createBindableIdentityNode(
  bindableKey: BindableKey,
  supportStatus: SupportStatus,
): BindableIdentityNode {
  return {
    key: bindableKey,
    nodeKind: "bindable-identity",
    familyTag: "claim.interface.bindable-identity",
    claimState: "holds",
    validityState: "valid",
    revisionToken: 0,
    retentionTier: "warm",
    ownerResourceKey: bindableKey.ownerResourceKey,
    propertyName: bindableKey.propertyName,
    factKind: "bindable-interface",
    realizedState: "open",
    supportStatus,
    degradationTarget: null,
    valueLevelProvenance: null,
    decisionLevelProvenance: null,
  };
}

function createBindableTraitNode(
  bindableKey: BindableKey,
  traitKey: BindableTraitKey,
  traitValue: unknown,
  supportStatus: SupportStatus,
): BindableTraitNode {
  return {
    key: traitKey,
    nodeKind: "bindable-trait",
    familyTag: `claim.interface.bindable-${traitKey.traitKind === "attribute" ? "attribute" : traitKey.traitKind}`,
    claimState: "holds",
    validityState: "valid",
    revisionToken: 0,
    retentionTier: "warm",
    ownerResourceKey: bindableKey.ownerResourceKey,
    propertyName: bindableKey.propertyName,
    traitKind: traitKey.traitKind,
    factKind: "bindable-trait",
    realizedState: "open",
    supportStatus,
    traitValue,
    degradationTarget: null,
    valueLevelProvenance: null,
    decisionLevelProvenance: null,
  };
}

function createDeclarationReferenceEntry(
  subjectKey: GraphEntityKey,
  documentUri: string,
  declarationReference: NonNullable<ResourceObservationDatum["declarationReference"]>,
): ReferenceEntryNode {
  const key: ReferenceEntryKey = {
    keyKind: "reference-entry",
    subjectEntityKey: subjectKey,
    referenceKind: declarationReference.referenceKind ?? "resource",
    site: {
      documentUri,
      span: declarationReference.span,
      siteKind: "declaration",
    },
  };

  return {
    key,
    nodeKind: "reference-entry",
    familyTag: "infrastructure.reference-entry.declaration",
    claimState: "holds",
    validityState: "valid",
    revisionToken: 0,
    retentionTier: "warm",
    subjectEntityKey: subjectKey,
    referenceKind: key.referenceKind,
    site: key.site,
    referent: subjectKey,
    role: "declaration",
    degradationTarget: null,
    valueLevelProvenance: null,
  };
}

function defaultSupportStatus(
  hasObservations: boolean,
  declarationWitnessState: WitnessNode["witnessState"] | undefined,
): SupportStatus {
  if (!hasObservations) {
    return declarationWitnessState === "satisfied" ? "unsupported" : "partial";
  }

  return declarationWitnessState === "satisfied" ? "supported" : "partial";
}

function declarationWitnessForSubject(
  graph: ClaimGraph,
  subjectKey: GraphEntityKey,
): WitnessNode | undefined {
  return getDeclarationWitnessNodesForSubjects(graph, [subjectKey])[0];
}

function mergeArrayCandidates(candidates: readonly ConvergenceCandidate[]): readonly unknown[] {
  return candidates.flatMap(({ value }) => Array.isArray(value) ? value : []);
}

function mergeScalarCandidates(
  candidates: readonly ConvergenceCandidate[],
): { readonly degradationTarget: DegradationTarget | null; readonly value: unknown | null } {
  if (candidates.length === 0) {
    return {
      degradationTarget: null,
      value: null,
    };
  }

  const ranked = [...candidates].sort((left, right) => {
    return sourceSurfacePrecedence(right.sourceSurface) - sourceSurfacePrecedence(left.sourceSurface);
  });
  const winner = ranked[0]?.value ?? null;
  const conflict = ranked.some(({ value }) => JSON.stringify(value) !== JSON.stringify(winner));

  return {
    degradationTarget: conflict ? "convergence-conflict:fieldPath" : null,
    value: winner,
  };
}

function normalizeAttribute(propertyName: string, explicitAttribute?: string): string {
  if (explicitAttribute != null) {
    return explicitAttribute;
  }

  return propertyName.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function observationDataForSubject(
  graph: ClaimGraph,
  subjectKey: ResourceKey,
): readonly { readonly datum: ResourceObservationDatum; readonly node: ObservationNode }[] {
  const observations: { readonly datum: ResourceObservationDatum; readonly node: ObservationNode }[] = [];

  for (const edge of graph.getIncomingEdges(subjectKey, "support")) {
    const node = graph.getNodeByKind("observation", edge.sourceNodeKey);
    if (node == null) {
      continue;
    }

    const rawDatum = (node as ObservationNode).rawDatum;
    if (!isResourceObservationDatum(rawDatum)) {
      continue;
    }

    if (serializeGraphEntityKey(rawDatum.subjectKey) !== serializeGraphEntityKey(subjectKey)) {
      continue;
    }

    observations.push({
      datum: rawDatum,
      node: node as ObservationNode,
    });
  }

  return observations;
}

export async function applySubjectConvergenceStage2(
  graph: ClaimGraph,
  input: SubjectConvergenceStage2Input,
): Promise<SubjectConvergenceStage2Result> {
  const observationInputs = observationDataForSubject(graph, input.subjectKey);
  const declarationWitness = declarationWitnessForSubject(graph, input.subjectKey);
  const hasObservations = observationInputs.length > 0;
  const supportStatus = defaultSupportStatus(hasObservations, declarationWitness?.witnessState);

  const result = await graph.runMutation((mutation) => {
    for (const key of input.previousNodeKeys ?? []) {
      mutation.deleteNode(key);
    }

    for (const key of input.previousReferenceEntryKeys ?? []) {
      mutation.deleteNode(key);
    }

    const nodeKeys: NodeKey[] = [];
    const referenceEntryKeys: ReferenceEntryKey[] = [];

    const customAttributeIdentity = createResourceIdentityNode(
      input.subjectKey,
      `claim.identity.${input.subjectKey.resourceKind}`,
      supportStatus,
      hasObservations ? "holds" : declarationWitness?.witnessState === "satisfied" ? "fails" : "unevaluated",
      null,
      input.subjectKey.resourceKind === "custom-attribute"
      && observationInputs.some(({ datum }) => datum.fields?.isTemplateController === true)
        ? "controllerhood"
        : "identity",
    );
    mutation.upsertNode(customAttributeIdentity);
    nodeKeys.push(customAttributeIdentity.key);

    if (declarationWitness != null) {
      mutation.addEdge({
        edgeClass: "support",
        sourceNodeKey: declarationWitness.key,
        targetNodeKey: customAttributeIdentity.key,
        mechanismId: "support-bundle",
        revisionToken: 0,
      });
    }

    if (hasObservations) {
      const resourceSchemas = FIELD_SCHEMA_DEFINITIONS.filter(
        ({ resourceKind }) => resourceKind === input.subjectKey.resourceKind,
      );

      for (const schema of resourceSchemas) {
        const candidates = observationInputs.flatMap(({ datum, node }) => {
          const fields = datum.fields ?? {};
          const value = fields[schema.fieldPath];
          return value === undefined
            ? []
            : [{
              declarationSurfaceId: datum.declarationSurfaceId,
              sourceSurface: node.sourceSurface,
              value,
            } satisfies ConvergenceCandidate];
        });

        const arrayLike = schema.valueType.endsWith("[]");
        const merged = arrayLike
          ? { degradationTarget: null, value: mergeArrayCandidates(candidates) }
          : mergeScalarCandidates(candidates);

        const fieldFact = createFieldFactNode(
          input.subjectKey,
          schema,
          merged.value === null ? "fails" : "holds",
          merged.value,
          supportStatus,
          merged.degradationTarget == null ? null : `convergence-conflict:${schema.fieldPath}`,
        );
        mutation.upsertNode(fieldFact);
        nodeKeys.push(fieldFact.key);
      }

      const bindables = new Map<string, BindableObservationDatum>();
      for (const { datum } of observationInputs) {
        for (const bindable of datum.bindables ?? []) {
          bindables.set(bindable.propertyName, bindable);
        }
      }

      for (const bindable of bindables.values()) {
        const bindableKey: BindableKey = {
          keyKind: "bindable",
          ownerResourceKey: input.subjectKey,
          propertyName: bindable.propertyName,
        };
        const bindableIdentity = createBindableIdentityNode(bindableKey, supportStatus);
        mutation.upsertNode(bindableIdentity);
        nodeKeys.push(bindableIdentity.key);

        const traitValues = {
          attribute: normalizeAttribute(bindable.propertyName, bindable.attribute),
          mode: bindable.mode ?? "default",
          callback: bindable.callback ?? null,
          set: bindable.set ?? false,
        } as const;

        for (const schema of TRAIT_SCHEMA_DEFINITIONS) {
          const key: BindableTraitKey = {
            keyKind: "bindable-trait",
            bindableKey,
            traitKind: schema.traitKind,
          };
          const traitNode = createBindableTraitNode(
            bindableKey,
            key,
            traitValues[schema.traitKind],
            supportStatus,
          );
          mutation.upsertNode(traitNode);
          nodeKeys.push(traitNode.key);
        }
      }

      for (const { datum, node } of observationInputs) {
        if (datum.declarationReference == null) {
          continue;
        }

        const referenceEntry = createDeclarationReferenceEntry(
          input.subjectKey,
          node.documentUri,
          datum.declarationReference,
        );
        mutation.upsertNode(referenceEntry);
        referenceEntryKeys.push(referenceEntry.key);
      }
    }

    return {
      nodeKeys,
      referenceEntryKeys,
    };
  });

  return result.result;
}
