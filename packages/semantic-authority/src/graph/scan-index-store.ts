import {
  serializeGraphEntityKey,
  serializeGraphNodeKey,
  serializeGraphOccurrenceKey,
  type AdmissionKey,
  type GraphEntityKey,
  type NodeKey,
  type OccurrenceKey,
  type OpenBoundaryKey,
  type ReachabilityKey,
} from "./keys.js";
import type { GraphNodeStore } from "./node-store.js";
import { TwoLevelKeyIndex } from "./two-level-key-index.js";
import type { ClaimNodeBase } from "./types.js";

const ADMISSION_INDEX_KINDS = [
  "claim.availability.resource-admission",
  "claim.availability.vocabulary-admission",
] as const;

const REACHABILITY_INDEX_KINDS = [
  "claim.reachability.resource-scope",
  "claim.reachability.template-scope",
] as const;

const WITNESS_INDEX_KINDS = [
  "witness.declaration.declaration-surface",
  "witness.support.support-bundle",
] as const;

type AdmissionIndexKind = (typeof ADMISSION_INDEX_KINDS)[number];
type ReachabilityIndexKind = (typeof REACHABILITY_INDEX_KINDS)[number];
type WitnessIndexKind = (typeof WITNESS_INDEX_KINDS)[number];

function assertAdmissionIndexKind(familyTag: string): AdmissionIndexKind {
  if ((ADMISSION_INDEX_KINDS as readonly string[]).includes(familyTag)) {
    return familyTag as AdmissionIndexKind;
  }

  throw new Error(`Unrecognized admission index kind "${familyTag}".`);
}

function assertReachabilityIndexKind(familyTag: string): ReachabilityIndexKind {
  if ((REACHABILITY_INDEX_KINDS as readonly string[]).includes(familyTag)) {
    return familyTag as ReachabilityIndexKind;
  }

  throw new Error(`Unrecognized reachability index kind "${familyTag}".`);
}

function assertWitnessIndexKind(familyTag: string): WitnessIndexKind {
  if ((WITNESS_INDEX_KINDS as readonly string[]).includes(familyTag)) {
    return familyTag as WitnessIndexKind;
  }

  throw new Error(`Unrecognized witness index kind "${familyTag}".`);
}

function extractConsultedContextFromNodeKey(key: NodeKey): string | undefined {
  switch (key.keyKind) {
    case "occurrence":
      return key.consultedContext;
    case "lookup":
      return key.occurrenceKey.consultedContext;
    case "relation":
      return extractConsultedContextFromRelationOperand(key.sourceKey)
        ?? extractConsultedContextFromRelationOperand(key.targetKey);
    default:
      return undefined;
  }
}

function extractConsultedContextFromRelationOperand(
  operand: GraphEntityKey | OccurrenceKey,
): string | undefined {
  return operand.keyKind === "occurrence" ? operand.consultedContext : undefined;
}

function serializeAdmissionKindLookupKey(key: AdmissionKey): string {
  return key.consultedWorld;
}

function serializeOpenBoundarySubjectKey(subjectKey: OpenBoundaryKey["subjectKey"]): string {
  return serializeGraphEntityKey(subjectKey);
}

function serializeReachabilityKindLookupKey(key: ReachabilityKey): string {
  return key.consultedContext;
}

export class GraphScanIndexStore<TNode extends ClaimNodeBase = ClaimNodeBase> {
  readonly #admissionsByWorldAndKind = new TwoLevelKeyIndex();
  readonly #correctnessByContextAndFamily = new TwoLevelKeyIndex();
  readonly #nodeStore: GraphNodeStore<TNode>;
  readonly #openBoundariesByTargetFamilyAndSubject = new TwoLevelKeyIndex();
  readonly #positionByContextAndOccurrence = new TwoLevelKeyIndex();
  readonly #reachabilityByContextAndKind = new TwoLevelKeyIndex();
  readonly #witnessesByKindAndSubject = new TwoLevelKeyIndex();

  public constructor(nodeStore: GraphNodeStore<TNode>) {
    this.#nodeStore = nodeStore;
  }

  public clear(): void {
    this.#admissionsByWorldAndKind.clear();
    this.#correctnessByContextAndFamily.clear();
    this.#openBoundariesByTargetFamilyAndSubject.clear();
    this.#positionByContextAndOccurrence.clear();
    this.#reachabilityByContextAndKind.clear();
    this.#witnessesByKindAndSubject.clear();
  }

  public delete(nodeKey: NodeKey): boolean {
    return this.deleteWithContext(nodeKey);
  }

  public deleteWithContext(
    nodeKey: NodeKey,
    options: { readonly correctnessContextOverride?: string } = {},
  ): boolean {
    const node = this.#nodeStore.get(nodeKey);
    if (node == null) {
      return false;
    }

    const nodeKeyId = serializeGraphNodeKey(node.key);

    switch (node.key.keyKind) {
      case "occurrence":
        if (node.nodeKind === "position-classification") {
          return this.#positionByContextAndOccurrence.delete(
            node.key.consultedContext,
            node.key.occurrenceAnchor,
            nodeKeyId,
          );
        }
        if (node.nodeKind === "correctness-finding") {
          return this.#correctnessByContextAndFamily.delete(
            node.key.consultedContext,
            node.familyTag,
            nodeKeyId,
          );
        }
        return false;
      case "admission":
        return this.#admissionsByWorldAndKind.delete(
          serializeAdmissionKindLookupKey(node.key),
          assertAdmissionIndexKind(node.familyTag),
          nodeKeyId,
        );
      case "reachability":
        return this.#reachabilityByContextAndKind.delete(
          serializeReachabilityKindLookupKey(node.key),
          assertReachabilityIndexKind(node.familyTag),
          nodeKeyId,
        );
      case "open-boundary":
        return this.#openBoundariesByTargetFamilyAndSubject.delete(
          node.key.targetFamilyId,
          serializeOpenBoundarySubjectKey(node.key.subjectKey),
          nodeKeyId,
        );
      case "declaration-witness":
      case "support-bundle":
        return this.#witnessesByKindAndSubject.delete(
          assertWitnessIndexKind(node.familyTag),
          serializeGraphEntityKey(node.key.subjectKey),
          nodeKeyId,
        );
      case "lookup":
      case "relation":
        if (node.nodeKind === "correctness-finding") {
          const consultedContext =
            extractConsultedContextFromNodeKey(node.key) ?? options.correctnessContextOverride;
          if (consultedContext == null) {
            throw new Error(`Cannot derive consultedContext for correctness node "${node.familyTag}".`);
          }
          return this.#correctnessByContextAndFamily.delete(
            consultedContext,
            node.familyTag,
            nodeKeyId,
          );
        }
        return false;
      default:
        return false;
    }
  }

  public getAdmissionsForWorldByKind(
    consultedWorld: AdmissionKey["consultedWorld"],
    admissionKind: AdmissionIndexKind,
  ): readonly TNode[] {
    return this.#collect(this.#admissionsByWorldAndKind.get(consultedWorld, admissionKind));
  }

  public getCorrectnessFindingsForContext(
    consultedContext: string,
    correctnessFamilyId?: string,
  ): readonly TNode[] {
    return this.#collect(
      this.#correctnessByContextAndFamily.get(consultedContext, correctnessFamilyId),
    );
  }

  public scanCorrectnessFindingsByContextPrefix(
    consultedContextPrefix: string,
    correctnessFamilyId?: string,
  ): readonly TNode[] {
    return this.#collect(
      this.#correctnessByContextAndFamily.scanByPrimaryPrefix(
        consultedContextPrefix,
        correctnessFamilyId,
      ),
    );
  }

  public getOpenBoundariesForTargetFamily(
    targetFamilyId: OpenBoundaryKey["targetFamilyId"],
    subjectKey: OpenBoundaryKey["subjectKey"],
  ): readonly TNode[] {
    return this.#collect(
      this.#openBoundariesByTargetFamilyAndSubject.get(
        targetFamilyId,
        serializeOpenBoundarySubjectKey(subjectKey),
      ),
    );
  }

  public getPositionClassificationsForOccurrence(
    consultedContext: OccurrenceKey["consultedContext"],
    occurrenceAnchor: OccurrenceKey["occurrenceAnchor"],
  ): readonly TNode[] {
    return this.#collect(
      this.#positionByContextAndOccurrence.get(consultedContext, occurrenceAnchor),
    );
  }

  public getReachabilityForContextByKind(
    consultedContext: ReachabilityKey["consultedContext"],
    reachabilityKind: ReachabilityIndexKind,
  ): readonly TNode[] {
    return this.#collect(
      this.#reachabilityByContextAndKind.get(consultedContext, reachabilityKind),
    );
  }

  public getWitnessesByKindForSubject(
    witnessKind: WitnessIndexKind,
    subjectKey: GraphEntityKey,
  ): readonly TNode[] {
    return this.#collect(
      this.#witnessesByKindAndSubject.get(witnessKind, serializeGraphEntityKey(subjectKey)),
    );
  }

  public upsert(node: TNode): void {
    this.upsertWithContext(node);
  }

  public upsertWithContext(
    node: TNode,
    options: { readonly correctnessContextOverride?: string } = {},
  ): void {
    const nodeKeyId = serializeGraphNodeKey(node.key);

    switch (node.key.keyKind) {
      case "occurrence":
        if (node.nodeKind === "position-classification") {
          this.#positionByContextAndOccurrence.set(
            node.key.consultedContext,
            node.key.occurrenceAnchor,
            nodeKeyId,
          );
        } else if (node.nodeKind === "correctness-finding") {
          this.#correctnessByContextAndFamily.set(
            node.key.consultedContext,
            node.familyTag,
            nodeKeyId,
          );
        }
        break;
      case "admission":
        this.#admissionsByWorldAndKind.set(
          serializeAdmissionKindLookupKey(node.key),
          assertAdmissionIndexKind(node.familyTag),
          nodeKeyId,
        );
        break;
      case "reachability":
        this.#reachabilityByContextAndKind.set(
          serializeReachabilityKindLookupKey(node.key),
          assertReachabilityIndexKind(node.familyTag),
          nodeKeyId,
        );
        break;
      case "open-boundary":
        this.#openBoundariesByTargetFamilyAndSubject.set(
          node.key.targetFamilyId,
          serializeOpenBoundarySubjectKey(node.key.subjectKey),
          nodeKeyId,
        );
        break;
      case "declaration-witness":
      case "support-bundle":
        this.#witnessesByKindAndSubject.set(
          assertWitnessIndexKind(node.familyTag),
          serializeGraphEntityKey(node.key.subjectKey),
          nodeKeyId,
        );
        break;
      case "lookup":
      case "relation":
        if (node.nodeKind === "correctness-finding") {
          const consultedContext =
            extractConsultedContextFromNodeKey(node.key) ?? options.correctnessContextOverride;
          if (consultedContext == null) {
            throw new Error(`Cannot derive consultedContext for correctness node "${node.familyTag}".`);
          }
          this.#correctnessByContextAndFamily.set(
            consultedContext,
            node.familyTag,
            nodeKeyId,
          );
        }
        break;
    }
  }

  #collect(nodeKeyIds: readonly string[]): readonly TNode[] {
    return nodeKeyIds
      .map((nodeKeyId) => this.#nodeStore.getBySerializedKey(nodeKeyId))
      .filter((node): node is TNode => node != null);
  }
}
