import type { FamilyTag } from "../shared/types.js";
import { GraphDirectIndexStore } from "./direct-index-store.js";
import { GraphEdgeStore } from "./edge-store.js";
import type { GraphEdgeIdentity, GraphEdgeUnion } from "./edges.js";
import type {
  AdmissionKey,
  BindableKey,
  CompletenessKey,
  GraphEntityKey,
  NodeKey,
  OccurrenceKey,
  OpenBoundaryKey,
  ReachabilityKey,
  ResourceKey,
} from "./keys.js";
import { serializeGraphEntityKey, serializeGraphNodeKey } from "./keys.js";
import { GraphNodeStore } from "./node-store.js";
import type {
  GraphCommittedNodeChange,
  GraphMutationCommitSummary,
  GraphMutationHandle,
  GraphNodeEvaluationRequester,
  GraphNodeMutationOptions,
} from "./protocol.js";
import { GraphRevisionClock } from "./revision-clock.js";
import { GraphScanIndexStore } from "./scan-index-store.js";
import type { ClaimNodeBase, NodeKindTag } from "./types.js";

export interface ClaimGraphOptions {
  readonly nodeEvaluationRequester?: GraphNodeEvaluationRequester;
  readonly revisionClock?: GraphRevisionClock;
}

export class ClaimGraph<
  TNode extends ClaimNodeBase = ClaimNodeBase,
  TEdge extends GraphEdgeUnion = GraphEdgeUnion,
> implements GraphNodeEvaluationRequester {
  readonly #defaultNodeEvaluationRequester?: GraphNodeEvaluationRequester;
  readonly #directIndexStore: GraphDirectIndexStore<TNode>;
  readonly #edgeStore: GraphEdgeStore<TEdge>;
  readonly #nodeStore: GraphNodeStore<TNode>;
  readonly #revisionClock: GraphRevisionClock;
  readonly #scanIndexStore: GraphScanIndexStore<TNode>;

  public constructor(options: ClaimGraphOptions = {}) {
    this.#revisionClock = options.revisionClock ?? new GraphRevisionClock();
    this.#nodeStore = new GraphNodeStore(this.#revisionClock);
    this.#edgeStore = new GraphEdgeStore(this.#revisionClock);
    this.#directIndexStore = new GraphDirectIndexStore(this.#nodeStore);
    this.#scanIndexStore = new GraphScanIndexStore(this.#nodeStore);
    this.#defaultNodeEvaluationRequester = options.nodeEvaluationRequester;
  }

  public get currentRevisionToken(): number {
    return this.#revisionClock.currentRevisionToken;
  }

  public get edgeStore(): GraphEdgeStore<TEdge> {
    return this.#edgeStore;
  }

  public get nodeStore(): GraphNodeStore<TNode> {
    return this.#nodeStore;
  }

  public addEdge(edge: TEdge): TEdge {
    return this.#edgeStore.add(edge);
  }

  public clear(): void {
    this.#directIndexStore.clear();
    this.#scanIndexStore.clear();
    this.#edgeStore.clear();
    this.#nodeStore.clear();
  }

  public createMutationHandle(
    nodeEvaluationRequester: GraphNodeEvaluationRequester | undefined = this.#defaultNodeEvaluationRequester,
  ): BufferedGraphMutationHandle<TNode, TEdge> {
    return new BufferedGraphMutationHandle(this, nodeEvaluationRequester);
  }

  public deleteEdge(identity: GraphEdgeIdentity): boolean {
    return this.#edgeStore.delete(identity);
  }

  public deleteNode(
    nodeKey: NodeKey,
    options: GraphNodeMutationOptions = {},
  ): boolean {
    this.#directIndexStore.delete(nodeKey);
    this.#scanIndexStore.deleteWithContext(nodeKey, options);
    return this.#nodeStore.delete(nodeKey);
  }

  public deleteOpenBoundariesFor(
    targetFamilyId: FamilyTag,
    subjectKey: GraphEntityKey,
  ): number {
    const openBoundaries = this.#scanIndexStore.getOpenBoundariesForTargetFamily(
      targetFamilyId,
      subjectKey,
    );

    for (const openBoundary of openBoundaries) {
      this.deleteNode(openBoundary.key);
    }

    return openBoundaries.length;
  }

  public getAdmissionsForSubject(
    subjectKey: AdmissionKey["subjectKey"],
  ): readonly TNode[] {
    return this.#directIndexStore.getAdmissionsForSubject(subjectKey);
  }

  public getAdmissionsForWorldByKind(
    consultedWorld: AdmissionKey["consultedWorld"],
    admissionKind: Parameters<GraphScanIndexStore<TNode>["getAdmissionsForWorldByKind"]>[1],
  ): readonly TNode[] {
    return this.#scanIndexStore.getAdmissionsForWorldByKind(consultedWorld, admissionKind);
  }

  public getBindableIdentitiesForOwner(
    ownerResourceKey: ResourceKey,
  ): readonly TNode[] {
    return this.#directIndexStore.getBindableIdentitiesForOwner(ownerResourceKey);
  }

  public getBindableTraitsForBindable(
    bindableKey: BindableKey,
  ): readonly TNode[] {
    return this.#directIndexStore.getBindableTraitsForBindable(bindableKey);
  }

  public getCompletenessWitness(key: CompletenessKey): TNode | undefined {
    return this.#directIndexStore.getCompletenessWitness(key);
  }

  public getCorrectnessFindingsForContext(
    consultedContext: string,
    correctnessFamilyId?: string,
  ): readonly TNode[] {
    return this.#scanIndexStore.getCorrectnessFindingsForContext(
      consultedContext,
      correctnessFamilyId,
    );
  }

  public getFieldFactsForResource(resourceKey: ResourceKey): readonly TNode[] {
    return this.#directIndexStore.getFieldFactsForResource(resourceKey);
  }

  public getGovernedSemanticsForResource(
    resourceKey: ResourceKey,
  ): readonly TNode[] {
    return this.#directIndexStore.getGovernedSemanticsForResource(resourceKey);
  }

  public getIncomingEdges(targetNodeKey: NodeKey, edgeClass?: TEdge["edgeClass"]): readonly TEdge[] {
    return this.#edgeStore.getIncoming(targetNodeKey, edgeClass);
  }

  public getNode(nodeKey: NodeKey): TNode | undefined {
    return this.#nodeStore.get(nodeKey);
  }

  public getNodeByKind<K extends NodeKindTag>(
    nodeKind: K,
    nodeKey: NodeKey,
  ): Extract<TNode, { readonly nodeKind: K }> | undefined {
    return this.#nodeStore.getByNodeKind(nodeKind, nodeKey);
  }

  public getOpenBoundariesForTargetFamily(
    targetFamilyId: OpenBoundaryKey["targetFamilyId"],
    subjectKey: OpenBoundaryKey["subjectKey"],
  ): readonly TNode[] {
    return this.#scanIndexStore.getOpenBoundariesForTargetFamily(targetFamilyId, subjectKey);
  }

  public getOutgoingEdges(sourceNodeKey: NodeKey, edgeClass?: TEdge["edgeClass"]): readonly TEdge[] {
    return this.#edgeStore.getOutgoing(sourceNodeKey, edgeClass);
  }

  public getPositionClassificationsForOccurrence(
    consultedContext: OccurrenceKey["consultedContext"],
    occurrenceAnchor: OccurrenceKey["occurrenceAnchor"],
  ): readonly TNode[] {
    return this.#scanIndexStore.getPositionClassificationsForOccurrence(
      consultedContext,
      occurrenceAnchor,
    );
  }

  public getReachabilityForContextByKind(
    consultedContext: ReachabilityKey["consultedContext"],
    reachabilityKind: Parameters<GraphScanIndexStore<TNode>["getReachabilityForContextByKind"]>[1],
  ): readonly TNode[] {
    return this.#scanIndexStore.getReachabilityForContextByKind(
      consultedContext,
      reachabilityKind,
    );
  }

  public getReachabilityForSubjectInContext(
    subjectKey: ReachabilityKey["subjectKey"],
    consultedContext: ReachabilityKey["consultedContext"],
  ): TNode | undefined {
    return this.#directIndexStore.getReachabilityForSubjectInContext(subjectKey, consultedContext);
  }

  public getReferenceEntriesForSubject(
    subjectEntityKey: GraphEntityKey,
  ): readonly TNode[] {
    return this.#directIndexStore.getReferenceEntriesForSubject(subjectEntityKey);
  }

  public getWitnessesByKindForSubject(
    witnessKind: Parameters<GraphScanIndexStore<TNode>["getWitnessesByKindForSubject"]>[0],
    subjectKey: GraphEntityKey,
  ): readonly TNode[] {
    return this.#scanIndexStore.getWitnessesByKindForSubject(witnessKind, subjectKey);
  }

  public async runMutation<TResult>(
    mutator: (mutation: GraphMutationHandle) => TResult | Promise<TResult>,
    options: {
      readonly nodeEvaluationRequester?: GraphNodeEvaluationRequester;
    } = {},
  ): Promise<{ readonly commitSummary: GraphMutationCommitSummary; readonly result: TResult }> {
    const mutation = this.createMutationHandle(options.nodeEvaluationRequester);
    const result = await mutator(mutation);
    return {
      commitSummary: mutation.commit(),
      result,
    };
  }

  public requestNodeEvaluation(nodeKey: NodeKey): void | Promise<void> {
    return this.#defaultNodeEvaluationRequester?.requestNodeEvaluation(nodeKey);
  }

  public scanCorrectnessFindingsByContextPrefix(
    consultedContextPrefix: string,
    correctnessFamilyId?: string,
  ): readonly TNode[] {
    return this.#scanIndexStore.scanCorrectnessFindingsByContextPrefix(
      consultedContextPrefix,
      correctnessFamilyId,
    );
  }

  public upsertNode(
    node: TNode,
    options: GraphNodeMutationOptions = {},
  ): TNode {
    const committedNode = this.#nodeStore.set(node);
    this.#directIndexStore.upsert(committedNode);
    this.#scanIndexStore.upsertWithContext(committedNode, options);
    return committedNode;
  }
}

export class BufferedGraphMutationHandle<
  TNode extends ClaimNodeBase = ClaimNodeBase,
  TEdge extends GraphEdgeUnion = GraphEdgeUnion,
> implements GraphMutationHandle {
  readonly #edgeDeletes = new Map<string, GraphEdgeIdentity>();
  readonly #edgeUpserts = new Map<string, TEdge>();
  readonly #graph: ClaimGraph<TNode, TEdge>;
  readonly #nodeDeletes = new Map<string, { readonly key: NodeKey; readonly options: GraphNodeMutationOptions }>();
  readonly #nodeEvaluationRequester?: GraphNodeEvaluationRequester;
  readonly #nodeUpserts = new Map<string, { readonly node: TNode; readonly options: GraphNodeMutationOptions }>();
  readonly #priorNodeSnapshots = new Map<string, TNode | undefined>();

  public constructor(
    graph: ClaimGraph<TNode, TEdge>,
    nodeEvaluationRequester?: GraphNodeEvaluationRequester,
  ) {
    this.#graph = graph;
    this.#nodeEvaluationRequester = nodeEvaluationRequester;
  }

  public addEdge(edge: TEdge): void {
    const edgeId = serializeEdgeIdentity(edge);
    this.#edgeDeletes.delete(edgeId);
    this.#edgeUpserts.set(edgeId, cloneGraphValue(edge));
  }

  public commit(): GraphMutationCommitSummary {
    for (const identity of this.#edgeDeletes.values()) {
      this.#graph.deleteEdge(identity);
    }

    for (const { key, options } of this.#nodeDeletes.values()) {
      this.#graph.deleteNode(key, options);
    }

    const committedNodeChanges: GraphCommittedNodeChange[] = [];
    for (const [nodeId, { node, options }] of this.#nodeUpserts.entries()) {
      const committedNode = this.#graph.upsertNode(cloneGraphValue(node), options);
      committedNodeChanges.push({
        current: committedNode,
        previous: this.#priorNodeSnapshots.get(nodeId),
      });
    }

    for (const edge of this.#edgeUpserts.values()) {
      this.#graph.addEdge(cloneGraphValue(edge));
    }

    return {
      committedNodeChanges,
      deletedNodeKeys: [...this.#nodeDeletes.values()].map(({ key }) => key),
    };
  }

  public deleteEdge(identity: GraphEdgeIdentity): void {
    const edgeId = serializeEdgeIdentity(identity);
    this.#edgeUpserts.delete(edgeId);
    this.#edgeDeletes.set(edgeId, cloneGraphValue(identity));
  }

  public deleteNode(nodeKey: NodeKey, options: GraphNodeMutationOptions = {}): void {
    const nodeId = serializeGraphNodeKey(nodeKey);
    this.#nodeUpserts.delete(nodeId);
    this.#nodeDeletes.set(nodeId, {
      key: cloneGraphValue(nodeKey),
      options: cloneGraphValue(options),
    });
    this.#capturePriorNode(nodeId, nodeKey);
  }

  public deleteOpenBoundariesFor(targetFamilyId: FamilyTag, subjectKey: GraphEntityKey): number {
    let deleted = 0;
    const subjectKeyId = serializeGraphEntityKey(subjectKey);

    for (const node of this.#collectVisibleNodes()) {
      if (node.key.keyKind !== "open-boundary") {
        continue;
      }

      if (node.key.targetFamilyId !== targetFamilyId) {
        continue;
      }

      if (serializeGraphEntityKey(node.key.subjectKey) !== subjectKeyId) {
        continue;
      }

      this.deleteNode(node.key);
      deleted += 1;
    }

    return deleted;
  }

  public getNode(nodeKey: NodeKey): TNode | undefined {
    const nodeId = serializeGraphNodeKey(nodeKey);
    if (this.#nodeDeletes.has(nodeId)) {
      return undefined;
    }

    const pending = this.#nodeUpserts.get(nodeId);
    if (pending != null) {
      return cloneGraphValue(pending.node);
    }

    const liveNode = this.#graph.getNode(nodeKey);
    return liveNode == null ? undefined : cloneGraphValue(liveNode);
  }

  public getNodeByKind<K extends NodeKindTag>(
    nodeKind: K,
    nodeKey: NodeKey,
  ): Extract<TNode, { readonly nodeKind: K }> | undefined {
    const node = this.getNode(nodeKey);
    if (node == null || node.nodeKind !== nodeKind) {
      return undefined;
    }

    return node as Extract<TNode, { readonly nodeKind: K }>;
  }

  public requestNodeEvaluation(nodeKey: NodeKey): void | Promise<void> {
    return this.#nodeEvaluationRequester?.requestNodeEvaluation(nodeKey)
      ?? this.#graph.requestNodeEvaluation(nodeKey);
  }

  public upsertNode(node: TNode, options: GraphNodeMutationOptions = {}): void {
    const nodeId = serializeGraphNodeKey(node.key);
    this.#nodeDeletes.delete(nodeId);
    this.#capturePriorNode(nodeId, node.key);
    this.#nodeUpserts.set(nodeId, {
      node: cloneGraphValue(node),
      options: cloneGraphValue(options),
    });
  }

  #capturePriorNode(nodeId: string, nodeKey: NodeKey): void {
    if (this.#priorNodeSnapshots.has(nodeId)) {
      return;
    }

    const liveNode = this.#graph.getNode(nodeKey);
    this.#priorNodeSnapshots.set(
      nodeId,
      liveNode == null ? undefined : cloneGraphValue(liveNode),
    );
  }

  #collectVisibleNodes(): readonly TNode[] {
    const visible = new Map<string, TNode>();

    for (const node of this.#graph.nodeStore.values()) {
      visible.set(serializeGraphNodeKey(node.key), node);
    }

    for (const [nodeId] of this.#nodeDeletes) {
      visible.delete(nodeId);
    }

    for (const [nodeId, { node }] of this.#nodeUpserts.entries()) {
      visible.set(nodeId, node);
    }

    return [...visible.values()];
  }
}

function cloneGraphValue<T>(value: T): T {
  return structuredClone(value);
}

function serializeEdgeIdentity(identity: GraphEdgeIdentity): string {
  return [
    identity.edgeClass,
    serializeGraphNodeKey(identity.sourceNodeKey),
    serializeGraphNodeKey(identity.targetNodeKey),
    identity.mechanismId,
  ].join(":");
}
