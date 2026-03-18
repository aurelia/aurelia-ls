import type { GraphNodeStore } from "./node-store.js";
import {
  serializeGraphBindableKey,
  serializeGraphCompletenessKey,
  serializeGraphEntityKey,
  serializeGraphNodeKey,
  serializeGraphResourceKey,
  serializeGraphTemplateScopeSubjectKey,
  serializeGraphVocabularyEntryKey,
  type AdmissionKey,
  type BindableKey,
  type CompletenessKey,
  type GraphEntityKey,
  type NodeKey,
  type ReachabilityKey,
  type ResourceKey,
  type TemplateScopeSubjectKey,
} from "./keys.js";
import type { ClaimNodeBase } from "./types.js";

function serializeAdmissionSubjectKey(
  subjectKey: AdmissionKey["subjectKey"],
): string {
  return subjectKey.keyKind === "resource"
    ? serializeGraphResourceKey(subjectKey)
    : serializeGraphVocabularyEntryKey(subjectKey);
}

function serializeReachabilityLookupKey(
  consultedContext: ReachabilityKey["consultedContext"],
  subjectKey: ReachabilityKey["subjectKey"],
): string {
  return `${consultedContext}:${serializeReachabilitySubjectKey(subjectKey)}`;
}

function serializeReachabilitySubjectKey(
  subjectKey: ReachabilityKey["subjectKey"],
): string {
  return "keyKind" in subjectKey
    ? serializeGraphResourceKey(subjectKey)
    : serializeGraphTemplateScopeSubjectKey(subjectKey as TemplateScopeSubjectKey);
}

export class GraphDirectIndexStore<TNode extends ClaimNodeBase = ClaimNodeBase> {
  readonly #admissionsBySubject = new Map<string, Set<string>>();
  readonly #bindableTraitsByBindable = new Map<string, Set<string>>();
  readonly #bindablesByOwner = new Map<string, Set<string>>();
  readonly #completenessWitnessesByKey = new Map<string, string>();
  readonly #fieldFactsByResource = new Map<string, Set<string>>();
  readonly #governedSemanticsByResource = new Map<string, Set<string>>();
  readonly #nodeStore: GraphNodeStore<TNode>;
  readonly #reachabilityBySubjectInContext = new Map<string, string>();
  readonly #referencesBySubject = new Map<string, Set<string>>();

  public constructor(nodeStore: GraphNodeStore<TNode>) {
    this.#nodeStore = nodeStore;
  }

  public clear(): void {
    this.#admissionsBySubject.clear();
    this.#bindableTraitsByBindable.clear();
    this.#bindablesByOwner.clear();
    this.#completenessWitnessesByKey.clear();
    this.#fieldFactsByResource.clear();
    this.#governedSemanticsByResource.clear();
    this.#reachabilityBySubjectInContext.clear();
    this.#referencesBySubject.clear();
  }

  public delete(nodeKey: NodeKey): boolean {
    const nodeKeyId = serializeGraphNodeKey(nodeKey);

    switch (nodeKey.keyKind) {
      case "field-fact":
        return this.#removeFromBucket(
          this.#fieldFactsByResource,
          serializeGraphResourceKey(nodeKey.resourceKey),
          nodeKeyId,
        );
      case "bindable":
        return this.#removeFromBucket(
          this.#bindablesByOwner,
          serializeGraphResourceKey(nodeKey.ownerResourceKey),
          nodeKeyId,
        );
      case "bindable-trait":
        return this.#removeFromBucket(
          this.#bindableTraitsByBindable,
          serializeGraphBindableKey(nodeKey.bindableKey),
          nodeKeyId,
        );
      case "admission":
        return this.#removeFromBucket(
          this.#admissionsBySubject,
          serializeAdmissionSubjectKey(nodeKey.subjectKey),
          nodeKeyId,
        );
      case "reachability":
        return this.#removeSingleton(
          this.#reachabilityBySubjectInContext,
          serializeReachabilityLookupKey(nodeKey.consultedContext, nodeKey.subjectKey),
          nodeKeyId,
        );
      case "governed-semantic":
        return this.#removeFromBucket(
          this.#governedSemanticsByResource,
          serializeGraphResourceKey(nodeKey.resourceKey),
          nodeKeyId,
        );
      case "reference-entry":
        return this.#removeFromBucket(
          this.#referencesBySubject,
          serializeGraphEntityKey(nodeKey.subjectEntityKey),
          nodeKeyId,
        );
      case "completeness":
        return this.#removeSingleton(
          this.#completenessWitnessesByKey,
          serializeGraphCompletenessKey(nodeKey),
          nodeKeyId,
        );
      default:
        return false;
    }
  }

  public getAdmissionsForSubject(
    subjectKey: AdmissionKey["subjectKey"],
  ): readonly TNode[] {
    return this.#collect(this.#admissionsBySubject.get(serializeAdmissionSubjectKey(subjectKey)));
  }

  public getBindableIdentitiesForOwner(
    ownerResourceKey: ResourceKey,
  ): readonly TNode[] {
    return this.#collect(this.#bindablesByOwner.get(serializeGraphResourceKey(ownerResourceKey)));
  }

  public getBindableTraitsForBindable(
    bindableKey: BindableKey,
  ): readonly TNode[] {
    return this.#collect(this.#bindableTraitsByBindable.get(serializeGraphBindableKey(bindableKey)));
  }

  public getCompletenessWitness(
    key: CompletenessKey,
  ): TNode | undefined {
    const nodeKeyId = this.#completenessWitnessesByKey.get(serializeGraphCompletenessKey(key));
    return nodeKeyId == null ? undefined : this.#nodeStore.getBySerializedKey(nodeKeyId);
  }

  public getFieldFactsForResource(resourceKey: ResourceKey): readonly TNode[] {
    return this.#collect(this.#fieldFactsByResource.get(serializeGraphResourceKey(resourceKey)));
  }

  public getGovernedSemanticsForResource(
    resourceKey: ResourceKey,
  ): readonly TNode[] {
    return this.#collect(this.#governedSemanticsByResource.get(serializeGraphResourceKey(resourceKey)));
  }

  public getReachabilityForSubjectInContext(
    subjectKey: ReachabilityKey["subjectKey"],
    consultedContext: ReachabilityKey["consultedContext"],
  ): TNode | undefined {
    const nodeKeyId = this.#reachabilityBySubjectInContext.get(
      serializeReachabilityLookupKey(consultedContext, subjectKey),
    );
    return nodeKeyId == null ? undefined : this.#nodeStore.getBySerializedKey(nodeKeyId);
  }

  public getReferenceEntriesForSubject(
    subjectEntityKey: GraphEntityKey,
  ): readonly TNode[] {
    return this.#collect(
      this.#referencesBySubject.get(serializeGraphEntityKey(subjectEntityKey)),
    );
  }

  public upsert(node: TNode): void {
    const nodeKeyId = serializeGraphNodeKey(node.key);

    switch (node.key.keyKind) {
      case "field-fact":
        this.#addToBucket(
          this.#fieldFactsByResource,
          serializeGraphResourceKey(node.key.resourceKey),
          nodeKeyId,
        );
        break;
      case "bindable":
        this.#addToBucket(
          this.#bindablesByOwner,
          serializeGraphResourceKey(node.key.ownerResourceKey),
          nodeKeyId,
        );
        break;
      case "bindable-trait":
        this.#addToBucket(
          this.#bindableTraitsByBindable,
          serializeGraphBindableKey(node.key.bindableKey),
          nodeKeyId,
        );
        break;
      case "admission":
        this.#addToBucket(
          this.#admissionsBySubject,
          serializeAdmissionSubjectKey(node.key.subjectKey),
          nodeKeyId,
        );
        break;
      case "reachability":
        this.#reachabilityBySubjectInContext.set(
          serializeReachabilityLookupKey(node.key.consultedContext, node.key.subjectKey),
          nodeKeyId,
        );
        break;
      case "governed-semantic":
        this.#addToBucket(
          this.#governedSemanticsByResource,
          serializeGraphResourceKey(node.key.resourceKey),
          nodeKeyId,
        );
        break;
      case "reference-entry":
        this.#addToBucket(
          this.#referencesBySubject,
          serializeGraphEntityKey(node.key.subjectEntityKey),
          nodeKeyId,
        );
        break;
      case "completeness":
        this.#completenessWitnessesByKey.set(serializeGraphCompletenessKey(node.key), nodeKeyId);
        break;
    }
  }

  #addToBucket(index: Map<string, Set<string>>, bucketKey: string, nodeKeyId: string): void {
    let bucket = index.get(bucketKey);
    if (bucket == null) {
      bucket = new Set<string>();
      index.set(bucketKey, bucket);
    }

    bucket.add(nodeKeyId);
  }

  #collect(nodeKeyIds: Set<string> | undefined): readonly TNode[] {
    if (nodeKeyIds == null || nodeKeyIds.size === 0) {
      return [];
    }

    const nodes: TNode[] = [];
    for (const nodeKeyId of nodeKeyIds) {
      const node = this.#nodeStore.getBySerializedKey(nodeKeyId);
      if (node != null) {
        nodes.push(node);
      }
    }

    return nodes;
  }

  #removeFromBucket(index: Map<string, Set<string>>, bucketKey: string, nodeKeyId: string): boolean {
    const bucket = index.get(bucketKey);
    if (bucket == null) {
      return false;
    }

    const deleted = bucket.delete(nodeKeyId);
    if (bucket.size === 0) {
      index.delete(bucketKey);
    }

    return deleted;
  }

  #removeSingleton(index: Map<string, string>, bucketKey: string, nodeKeyId: string): boolean {
    if (index.get(bucketKey) !== nodeKeyId) {
      return false;
    }

    return index.delete(bucketKey);
  }
}
