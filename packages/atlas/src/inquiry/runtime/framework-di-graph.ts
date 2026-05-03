import {
  readFrameworkDiIndex,
  type FrameworkDiKeyRow,
} from "../../framework/di-index.js";
import {
  FrameworkMaterializationProviderIdentity,
  FrameworkMaterializationRouteDescriptor,
} from "../../framework/materialization.js";
import {
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipAtom,
  type FrameworkRelationshipEndpoint,
} from "../../framework/relationships.js";
import type { SourceProject } from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import type {
  FrameworkMaterializationRelationshipRow,
  FrameworkMaterializationRouteRow,
} from "./framework-materialization-lenses.js";
import { readFrameworkMaterializationIndex } from "./framework-materialization-lenses.js";
import { countBy } from "./framework-support.js";

export type FrameworkDiGraphLayer =
  | "definition"
  | "admission"
  | "container-state"
  | "lookup"
  | "resolution"
  | "materialization"
  | "dependency"
  | "construction";

export type FrameworkDiGraphNodeKind =
  | "di-key"
  | "key-expression"
  | "source-symbol"
  | "registration-shape"
  | "resolver-strategy"
  | "provider"
  | "runtime-value"
  | "consumer"
  | "container"
  | "resolver-slot"
  | "self-resolver-slot"
  | "resource-slot"
  | "factory-slot"
  | "materialization-route"
  | "construction-site";

export type FrameworkDiGraphEdgeKind =
  | "declares-key"
  | "creates-container"
  | "creates-registration"
  | "creates-resolver"
  | "registers-provider"
  | "provider-provides-key"
  | "stores-resolver-slot"
  | "stores-resource-slot"
  | "slot-provides-key"
  | "resource-slot-provides-key"
  | "key-aliases-key"
  | "lookup-requests-key"
  | "resolution-requests-key"
  | "key-materializes-through-route"
  | "route-uses-provider"
  | "key-instantiates-value"
  | "key-depends-on-key"
  | "factory-constructs-value";

export interface FrameworkDiGraphNodeRow {
  readonly id: string;
  readonly kind: FrameworkDiGraphNodeKind;
  readonly name: string;
  readonly packageId?: string;
  readonly packageName?: string;
  readonly source?: SourceRange;
  readonly summary: string;
}

export interface FrameworkDiGraphEdgeRow {
  readonly id: string;
  readonly kind: FrameworkDiGraphEdgeKind;
  readonly layer: FrameworkDiGraphLayer;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly fromName: string;
  readonly toName: string;
  readonly packageId?: string;
  readonly packageName?: string;
  readonly relation?: string;
  readonly mechanism?: string;
  readonly phase?: string;
  readonly strategy?: string;
  readonly routeKind?: string;
  readonly closure?: string;
  readonly source?: SourceRange;
  readonly sourceRowId?: string;
  readonly summary: string;
}

export interface FrameworkDiGraphComponentRow {
  readonly id: string;
  readonly keyNames: readonly string[];
  readonly nodeIds: readonly string[];
  readonly edgeIds: readonly string[];
  readonly cyclic: boolean;
  readonly outgoingComponentIds: readonly string[];
  readonly incomingComponentIds: readonly string[];
  readonly summary: string;
}

export interface FrameworkDiGraphValue {
  readonly graphVersion: string;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly componentCount: number;
  readonly cyclicComponentCount: number;
  readonly nodeKinds: Readonly<Record<string, number>>;
  readonly edgeKinds: Readonly<Record<string, number>>;
  readonly layers: Readonly<Record<string, number>>;
  readonly routeKinds: Readonly<Record<string, number>>;
  readonly strategies: Readonly<Record<string, number>>;
  readonly nodes?: readonly FrameworkDiGraphNodeRow[];
  readonly edges?: readonly FrameworkDiGraphEdgeRow[];
  readonly components?: readonly FrameworkDiGraphComponentRow[];
}

export interface FrameworkDiGraphFilters {
  readonly packageId?: string;
  readonly key?: string;
  readonly nodeKind?: string;
  readonly edgeKind?: string;
  readonly relation?: string;
  readonly mechanism?: string;
  readonly phase?: string;
  readonly strategy?: string;
  readonly routeKind?: string;
  readonly query?: string;
}

export interface FrameworkDiGraphIndex {
  readonly nodes: readonly FrameworkDiGraphNodeRow[];
  readonly edges: readonly FrameworkDiGraphEdgeRow[];
  readonly components: readonly FrameworkDiGraphComponentRow[];
  readonly value: FrameworkDiGraphValue;
}

const FRAMEWORK_DI_GRAPH_VERSION = "framework-di-graph@1";

/** Build a product-model-shaped DI graph over the Aurelia framework source. */
export function readFrameworkDiGraph(
  sourceProject: SourceProject,
  filters: FrameworkDiGraphFilters = {},
): FrameworkDiGraphIndex {
  const graph = new FrameworkDiGraphBuilder(sourceProject, filters).build();
  const filteredEdges = graph.edges.filter((edge) =>
    graph.edgeMatches(edge, filters),
  );
  const retainedNodeIds = new Set(
    filteredEdges.flatMap((edge) => [edge.fromNodeId, edge.toNodeId]),
  );
  const filteredNodes = graph.nodes.filter(
    (node) =>
      retainedNodeIds.has(node.id) ||
      graph.nodeMatches(node, filters),
  );
  const filteredNodeIds = new Set(filteredNodes.map((node) => node.id));
  const edges = filteredEdges.filter(
    (edge) =>
      filteredNodeIds.has(edge.fromNodeId) &&
      filteredNodeIds.has(edge.toNodeId),
  );
  const components = graphComponents(filteredNodes, edges).filter(
    (component) => componentMatches(component, filters),
  );
  return {
    nodes: filteredNodes,
    edges,
    components,
    value: graphValue(filteredNodes, edges, components),
  };
}

class FrameworkDiGraphBuilder {
  readonly #nodes = new Map<string, FrameworkDiGraphNodeRow>();
  readonly #edges = new Map<string, FrameworkDiGraphEdgeRow>();
  readonly #knownKeyNames = new Set<string>();

  constructor(
    readonly sourceProject: SourceProject,
    readonly filters: FrameworkDiGraphFilters,
  ) {}

  build(): FrameworkDiGraphBuilder {
    const diIndex = readFrameworkDiIndex(this.sourceProject);
    const materialization = readFrameworkMaterializationIndex(
      this.sourceProject,
      materializationFilters(this.filters),
    );
    for (const key of diIndex.keys) {
      this.#knownKeyNames.add(key.interfaceKey);
    }
    for (const route of materialization.routes) {
      this.#knownKeyNames.add(route.key);
    }
    for (const relationship of materialization.relationships) {
      if (relationship.relation === FrameworkRelationshipRelation.DependsOnKey) {
        this.#knownKeyNames.add(relationship.to.name);
      }
    }
    for (const key of diIndex.keys) {
      this.addKeyRow(key);
    }
    for (const atom of diIndex.relationships) {
      this.addRelationshipAtom(atom);
    }
    for (const route of materialization.routes) {
      this.addMaterializationRoute(route);
    }
    for (const relationship of materialization.relationships) {
      this.addMaterializationRelationship(relationship);
    }
    return this;
  }

  get nodes(): readonly FrameworkDiGraphNodeRow[] {
    return [...this.#nodes.values()].sort(compareNodes);
  }

  get edges(): readonly FrameworkDiGraphEdgeRow[] {
    return [...this.#edges.values()].sort(compareEdges);
  }

  nodeMatches(
    node: FrameworkDiGraphNodeRow,
    filters: FrameworkDiGraphFilters,
  ): boolean {
    return (
      (filters.packageId === undefined ||
        node.packageId === filters.packageId) &&
      (filters.nodeKind === undefined || node.kind === filters.nodeKind) &&
      (filters.key === undefined || node.name === filters.key) &&
      (filters.query === undefined ||
        node.name.includes(filters.query) ||
        node.kind.includes(filters.query) ||
        node.packageId?.includes(filters.query) === true ||
        node.summary.includes(filters.query))
    );
  }

  edgeMatches(
    edge: FrameworkDiGraphEdgeRow,
    filters: FrameworkDiGraphFilters,
  ): boolean {
    const from = this.#nodes.get(edge.fromNodeId);
    const to = this.#nodes.get(edge.toNodeId);
    return (
      (filters.packageId === undefined ||
        edge.packageId === filters.packageId ||
        from?.packageId === filters.packageId ||
        to?.packageId === filters.packageId) &&
      (filters.edgeKind === undefined || edge.kind === filters.edgeKind) &&
      (filters.nodeKind === undefined ||
        from?.kind === filters.nodeKind ||
        to?.kind === filters.nodeKind) &&
      (filters.relation === undefined || edge.relation === filters.relation) &&
      (filters.mechanism === undefined ||
        edge.mechanism === filters.mechanism) &&
      (filters.phase === undefined || edge.phase === filters.phase) &&
      (filters.strategy === undefined || edge.strategy === filters.strategy) &&
      (filters.routeKind === undefined ||
        edge.routeKind === filters.routeKind) &&
      (filters.key === undefined ||
        edge.fromName === filters.key ||
        edge.toName === filters.key ||
        from?.name === filters.key ||
        to?.name === filters.key) &&
      (filters.query === undefined ||
        edge.summary.includes(filters.query) ||
        edge.kind.includes(filters.query) ||
        edge.layer.includes(filters.query) ||
        edge.fromName.includes(filters.query) ||
        edge.toName.includes(filters.query) ||
        edge.relation?.includes(filters.query) === true ||
        edge.mechanism?.includes(filters.query) === true ||
        edge.routeKind?.includes(filters.query) === true)
    );
  }

  private addKeyRow(row: FrameworkDiKeyRow): void {
    const source = this.sourceNode(row.exportName, row.packageId, row.packageName, row.source);
    const key = this.keyNode(row.interfaceKey, row.packageId, row.packageName, row.source);
    this.addEdge({
      id: `${row.id}:graph:declares-key`,
      kind: "declares-key",
      layer: "definition",
      fromNodeId: source.id,
      toNodeId: key.id,
      fromName: source.name,
      toName: key.name,
      packageId: row.packageId,
      packageName: row.packageName,
      relation: FrameworkRelationshipRelation.DefinesKey,
      mechanism: "create-interface",
      phase: "definition",
      source: row.source,
      sourceRowId: row.id,
      summary: `${row.exportName} declares DI key ${row.interfaceKey}.`,
    });
  }

  private addRelationshipAtom(row: FrameworkRelationshipAtom): void {
    switch (row.relation) {
      case FrameworkRelationshipRelation.DefinesKey:
        return;
      case FrameworkRelationshipRelation.CreatesContainer:
        this.addEndpointEdge(row, "creates-container", "construction");
        return;
      case FrameworkRelationshipRelation.CreatesRegistration:
        this.addEndpointEdge(row, "creates-registration", "admission");
        return;
      case FrameworkRelationshipRelation.CreatesResolver:
        this.addEndpointEdge(row, "creates-resolver", "admission");
        return;
      case FrameworkRelationshipRelation.RegistersProvider:
        this.addEndpointEdge(row, "registers-provider", "container-state");
        return;
      case FrameworkRelationshipRelation.ProvidesKey:
        this.addProvidesKeyAtom(row);
        return;
      case FrameworkRelationshipRelation.AliasesKey:
        this.addAliasAtom(row);
        return;
      case FrameworkRelationshipRelation.StoresResolverSlot:
        this.addSlotStoreAtom(row, "resolver-slot");
        return;
      case FrameworkRelationshipRelation.StoresResourceSlot:
        this.addSlotStoreAtom(row, "resource-slot");
        return;
      case FrameworkRelationshipRelation.LooksUpKey:
        this.addLookupAtom(row, "lookup-requests-key", "lookup");
        return;
      case FrameworkRelationshipRelation.ResolvesKey:
      case FrameworkRelationshipRelation.DelegatesLookup:
        this.addLookupAtom(row, "resolution-requests-key", "resolution");
        return;
      case FrameworkRelationshipRelation.CreatesFactory:
      case FrameworkRelationshipRelation.ConstructsInstance:
      case FrameworkRelationshipRelation.MaterializesKey:
        this.addEndpointEdge(row, "factory-constructs-value", "construction");
        return;
      default:
        return;
    }
  }

  private addProvidesKeyAtom(row: FrameworkRelationshipAtom): void {
    const provider = this.providerNodeForAtom(row);
    const key = this.keyLikeNode(
      row.key ?? row.from.name,
      row.packageId,
      row.packageName,
      row.from.source ?? row.source,
    );
    this.addEdge({
      ...edgeFromAtom(row, "provider-provides-key", "admission", provider, key),
      summary: `${provider.name} provides DI key ${key.name}.`,
    });
  }

  private addAliasAtom(row: FrameworkRelationshipAtom): void {
    const key = this.keyLikeNode(
      row.key ?? row.from.name,
      row.packageId,
      row.packageName,
      row.from.source ?? row.source,
    );
    const target =
      row.to.kind === FrameworkRelationshipEndpointKind.DiKey
        ? this.keyLikeNode(row.to.name, row.packageId, row.packageName, row.to.source ?? row.source)
        : this.nodeForEndpoint(row.to, "provider");
    this.addEdge(edgeFromAtom(row, "key-aliases-key", "resolution", key, target));
  }

  private addSlotStoreAtom(
    row: FrameworkRelationshipAtom,
    slotKind: "resolver-slot" | "resource-slot",
  ): void {
    const owner = this.nodeForEndpoint(row.from, "container");
    const storedSlotKind =
      slotKind === "resolver-slot" && row.key === "IContainer"
        ? "self-resolver-slot"
        : slotKind;
    const slot = this.slotNode(storedSlotKind, row);
    const storeKind =
      slotKind === "resolver-slot"
        ? "stores-resolver-slot"
        : "stores-resource-slot";
    const providesKind =
      slotKind === "resolver-slot"
        ? "slot-provides-key"
        : "resource-slot-provides-key";
    this.addEdge(edgeFromAtom(row, storeKind, "container-state", owner, slot));
    if (row.key !== undefined) {
      const key = this.keyLikeNode(row.key, row.packageId, row.packageName, row.source);
      this.addEdge({
        id: `${row.id}:graph:${providesKind}`,
        kind: providesKind,
        layer: "container-state",
        fromNodeId: slot.id,
        toNodeId: key.id,
        fromName: slot.name,
        toName: key.name,
        packageId: row.packageId,
        packageName: row.packageName,
        relation: FrameworkRelationshipRelation.ProvidesKey,
        mechanism: row.mechanism,
        phase: row.phase,
        strategy: row.strategy,
        closure: row.closure,
        source: row.source,
        sourceRowId: row.id,
        summary: `${slot.name} provides DI key ${key.name}.`,
      });
    }
  }

  private addLookupAtom(
    row: FrameworkRelationshipAtom,
    edgeKind: "lookup-requests-key" | "resolution-requests-key",
    layer: "lookup" | "resolution",
  ): void {
    const consumer = this.nodeForEndpoint(row.from, "consumer");
    const key = this.keyLikeNode(
      row.key ?? row.to.name,
      row.packageId,
      row.packageName,
      row.to.source ?? row.source,
    );
    this.addEdge(edgeFromAtom(row, edgeKind, layer, consumer, key));
  }

  private addEndpointEdge(
    row: FrameworkRelationshipAtom,
    edgeKind: FrameworkDiGraphEdgeKind,
    layer: FrameworkDiGraphLayer,
  ): void {
    const from = this.nodeForEndpoint(row.from, endpointNodeKind(row.from));
    const to = this.nodeForEndpoint(row.to, endpointNodeKind(row.to));
    this.addEdge(edgeFromAtom(row, edgeKind, layer, from, to));
  }

  private addMaterializationRoute(row: FrameworkMaterializationRouteRow): void {
    const key = this.keyNode(row.key, row.packageId, row.packageName, row.keyEndpoint.source ?? row.source);
    const route = this.materializationRouteNode(row);
    const provider = this.materializationProviderNode(row, "provider");
    this.addEdge({
      id: `${row.id}:graph:key-materializes-through-route`,
      kind: "key-materializes-through-route",
      layer: "materialization",
      fromNodeId: key.id,
      toNodeId: route.id,
      fromName: key.name,
      toName: route.name,
      packageId: row.packageId,
      packageName: row.packageName,
      relation: FrameworkRelationshipRelation.MaterializesThrough,
      strategy: row.strategy,
      routeKind: row.routeKind,
      closure: row.closure,
      source: row.source,
      sourceRowId: row.id,
      summary: `${row.key} enters materialization route ${row.routeKind}.`,
    });
    this.addEdge({
      id: `${row.id}:graph:route-uses-provider`,
      kind: "route-uses-provider",
      layer: "materialization",
      fromNodeId: route.id,
      toNodeId: provider.id,
      fromName: route.name,
      toName: provider.name,
      packageId: row.packageId,
      packageName: row.packageName,
      relation: FrameworkRelationshipRelation.MaterializesThrough,
      strategy: row.strategy,
      routeKind: row.routeKind,
      closure: row.closure,
      source: row.providerSource ?? row.source,
      sourceRowId: row.id,
      summary: `${row.routeKind} route for ${row.key} uses provider ${row.providerIdentity.name}.`,
    });
  }

  private addMaterializationRelationship(
    row: FrameworkMaterializationRelationshipRow,
  ): void {
    if (row.relation === FrameworkRelationshipRelation.InstantiatesKey) {
      const key = this.keyNode(row.key, row.packageId, row.packageName, row.from.source ?? row.source);
      const value = row.providerIdentity === undefined
        ? this.nodeForEndpoint(row.to, "runtime-value")
        : this.providerIdentityNode(
            "runtime-value",
            row.providerIdentity,
            row.packageId,
            row.packageName,
            row.to.source ?? row.source,
          );
      this.addEdge(edgeFromMaterialization(row, "key-instantiates-value", "materialization", key, value));
      return;
    }
    if (row.relation === FrameworkRelationshipRelation.DependsOnKey) {
      const key = this.keyNode(row.key, row.packageId, row.packageName, row.from.source ?? row.source);
      const dependency = this.keyNode(row.to.name, row.packageId, row.packageName, row.to.source ?? row.source);
      this.addEdge(edgeFromMaterialization(row, "key-depends-on-key", "dependency", key, dependency));
    }
  }

  private sourceNode(
    name: string,
    packageId: string | undefined,
    packageName: string | undefined,
    source: SourceRange | undefined,
  ): FrameworkDiGraphNodeRow {
    return this.addNode({
      id: nodeId("source-symbol", packageId, name),
      kind: "source-symbol",
      name,
      ...(packageId === undefined ? {} : { packageId }),
      ...(packageName === undefined ? {} : { packageName }),
      ...(source === undefined ? {} : { source }),
      summary: `${name} source symbol.`,
    });
  }

  private keyNode(
    name: string,
    packageId: string | undefined,
    packageName: string | undefined,
    source: SourceRange | undefined,
  ): FrameworkDiGraphNodeRow {
    return this.addNode({
      id: nodeId("di-key", undefined, name),
      kind: "di-key",
      name,
      ...(packageId === undefined ? {} : { packageId }),
      ...(packageName === undefined ? {} : { packageName }),
      ...(source === undefined ? {} : { source }),
      summary: `${name} DI key.`,
    });
  }

  private keyExpressionNode(
    name: string,
    packageId: string | undefined,
    packageName: string | undefined,
    source: SourceRange | undefined,
  ): FrameworkDiGraphNodeRow {
    return this.addNode({
      id: nodeId("key-expression", packageId, name),
      kind: "key-expression",
      name,
      ...(packageId === undefined ? {} : { packageId }),
      ...(packageName === undefined ? {} : { packageName }),
      ...(source === undefined ? {} : { source }),
      summary: `${name} DI key expression that is not closed to a known framework key.`,
    });
  }

  private keyLikeNode(
    name: string,
    packageId: string | undefined,
    packageName: string | undefined,
    source: SourceRange | undefined,
  ): FrameworkDiGraphNodeRow {
    return this.#knownKeyNames.has(name)
      ? this.keyNode(name, packageId, packageName, source)
      : this.keyExpressionNode(name, packageId, packageName, source);
  }

  private slotNode(
    kind: "resolver-slot" | "self-resolver-slot" | "resource-slot",
    row: FrameworkRelationshipAtom,
  ): FrameworkDiGraphNodeRow {
    const keySuffix = row.key === undefined ? row.to.name : `${row.to.name}:${row.key}`;
    return this.addNode({
      id: nodeId(kind, row.packageId, keySuffix),
      kind,
      name: keySuffix,
      packageId: row.packageId,
      packageName: row.packageName,
      source: row.to.source ?? row.source,
      summary: `${kind} ${keySuffix}.`,
    });
  }

  private materializationRouteNode(
    row: FrameworkMaterializationRouteRow,
  ): FrameworkDiGraphNodeRow {
    return this.addNode({
      id: nodeId("materialization-route", row.packageId, row.id),
      kind: "materialization-route",
      name: `${row.key}:${row.routeKind}`,
      packageId: row.packageId,
      packageName: row.packageName,
      source: row.source,
      summary: row.summary,
    });
  }

  private materializationProviderNode(
    row: FrameworkMaterializationRouteRow,
    kind: "provider" | "runtime-value",
  ): FrameworkDiGraphNodeRow {
    return this.providerIdentityNode(
      kind,
      row.providerIdentity,
      row.packageId,
      row.packageName,
      row.provider.source ?? row.source,
    );
  }

  private providerNodeForAtom(
    row: FrameworkRelationshipAtom,
  ): FrameworkDiGraphNodeRow {
    const routeKind = FrameworkMaterializationRouteDescriptor.forProviderSeed(
      row,
    ).routeKind;
    const identity = FrameworkMaterializationProviderIdentity.forRoute(
      row.key ?? row.from.name,
      routeKind,
      row.to,
    );
    return this.providerIdentityNode(
      "provider",
      identity,
      row.packageId,
      row.packageName,
      row.to.source ?? row.source,
    );
  }

  private providerIdentityNode(
    kind: "provider" | "runtime-value",
    identity: FrameworkMaterializationRouteRow["providerIdentity"],
    packageId: string | undefined,
    packageName: string | undefined,
    source: SourceRange | undefined,
  ): FrameworkDiGraphNodeRow {
    return this.addNode({
      id: nodeId(kind, packageId, identity.id),
      kind,
      name: identity.name,
      ...(packageId === undefined ? {} : { packageId }),
      ...(packageName === undefined ? {} : { packageName }),
      ...(source === undefined ? {} : { source }),
      summary: `${identity.name} ${kind} (${identity.kind}).`,
    });
  }

  private nodeForEndpoint(
    endpoint: FrameworkRelationshipEndpoint,
    fallbackKind: FrameworkDiGraphNodeKind,
  ): FrameworkDiGraphNodeRow {
    if (endpoint.kind === FrameworkRelationshipEndpointKind.DiKey) {
      return this.keyLikeNode(
        endpoint.name,
        endpoint.packageId,
        endpoint.packageName,
        endpoint.source,
      );
    }
    const kind =
      fallbackKind;
    const packageId = endpoint.packageId;
    return this.addNode({
      id: nodeId(kind, packageId, endpoint.name),
      kind,
      name: endpoint.name,
      ...(endpoint.packageId === undefined ? {} : { packageId: endpoint.packageId }),
      ...(endpoint.packageName === undefined ? {} : { packageName: endpoint.packageName }),
      ...(endpoint.source === undefined ? {} : { source: endpoint.source }),
      summary: `${endpoint.name} ${kind}.`,
    });
  }

  private addNode(row: FrameworkDiGraphNodeRow): FrameworkDiGraphNodeRow {
    const current = this.#nodes.get(row.id);
    if (current !== undefined) {
      const merged = {
        ...current,
        packageId: current.packageId ?? row.packageId,
        packageName: current.packageName ?? row.packageName,
        source: current.source ?? row.source,
      };
      this.#nodes.set(row.id, merged);
      return merged;
    }
    this.#nodes.set(row.id, row);
    return row;
  }

  private addEdge(row: FrameworkDiGraphEdgeRow): void {
    if (!this.#edges.has(row.id)) {
      this.#edges.set(row.id, row);
    }
  }
}

function edgeFromAtom(
  row: FrameworkRelationshipAtom,
  kind: FrameworkDiGraphEdgeKind,
  layer: FrameworkDiGraphLayer,
  from: FrameworkDiGraphNodeRow,
  to: FrameworkDiGraphNodeRow,
): FrameworkDiGraphEdgeRow {
  return {
    id: `${row.id}:graph:${kind}`,
    kind,
    layer,
    fromNodeId: from.id,
    toNodeId: to.id,
    fromName: from.name,
    toName: to.name,
    packageId: row.packageId,
    packageName: row.packageName,
    relation: row.relation,
    mechanism: row.mechanism,
    phase: row.phase,
    ...(row.strategy === undefined ? {} : { strategy: row.strategy }),
    closure: row.closure,
    source: row.source,
    sourceRowId: row.id,
    summary: row.summary,
  };
}

function edgeFromMaterialization(
  row: FrameworkMaterializationRelationshipRow,
  kind: FrameworkDiGraphEdgeKind,
  layer: FrameworkDiGraphLayer,
  from: FrameworkDiGraphNodeRow,
  to: FrameworkDiGraphNodeRow,
): FrameworkDiGraphEdgeRow {
  return {
    id: `${row.id}:graph:${kind}`,
    kind,
    layer,
    fromNodeId: from.id,
    toNodeId: to.id,
    fromName: from.name,
    toName: to.name,
    packageId: row.packageId,
    packageName: row.packageName,
    relation: row.relation,
    ...(row.strategy === undefined ? {} : { strategy: row.strategy }),
    routeKind: row.routeKind,
    source: row.source,
    sourceRowId: row.id,
    summary: row.summary,
  };
}

function endpointNodeKind(
  endpoint: FrameworkRelationshipEndpoint,
): FrameworkDiGraphNodeKind {
  switch (endpoint.kind) {
    case FrameworkRelationshipEndpointKind.DiKey:
      return "di-key";
    case FrameworkRelationshipEndpointKind.ResolverStrategy:
      return "resolver-strategy";
    case FrameworkRelationshipEndpointKind.ContainerSlot:
      return "resolver-slot";
    case FrameworkRelationshipEndpointKind.Resource:
      return "resource-slot";
    case FrameworkRelationshipEndpointKind.Factory:
      return "factory-slot";
    case FrameworkRelationshipEndpointKind.Concept:
    case FrameworkRelationshipEndpointKind.Expression:
    case FrameworkRelationshipEndpointKind.RegistrationArgument:
      return "provider";
    case FrameworkRelationshipEndpointKind.Method:
    case FrameworkRelationshipEndpointKind.CallSite:
      return "consumer";
    default:
      return "source-symbol";
  }
}

function nodeId(
  kind: FrameworkDiGraphNodeKind,
  packageId: string | undefined,
  name: string,
): string {
  return `framework-di:${kind}:${packageId ?? "repo"}:${name}`;
}

function materializationFilters(
  filters: FrameworkDiGraphFilters,
): {
  readonly packageId?: string;
  readonly key?: string;
  readonly strategy?: string;
  readonly routeKind?: string;
  readonly relation?: string;
  readonly query?: string;
} {
  return {
    ...(filters.packageId === undefined ? {} : { packageId: filters.packageId }),
    ...(filters.key === undefined ? {} : { key: filters.key }),
    ...(filters.strategy === undefined ? {} : { strategy: filters.strategy }),
    ...(filters.routeKind === undefined ? {} : { routeKind: filters.routeKind }),
    ...(filters.relation === undefined ? {} : { relation: filters.relation }),
    ...(filters.query === undefined ? {} : { query: filters.query }),
  };
}

function graphValue(
  nodes: readonly FrameworkDiGraphNodeRow[],
  edges: readonly FrameworkDiGraphEdgeRow[],
  components: readonly FrameworkDiGraphComponentRow[],
): FrameworkDiGraphValue {
  return {
    graphVersion: FRAMEWORK_DI_GRAPH_VERSION,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    componentCount: components.length,
    cyclicComponentCount: components.filter((component) => component.cyclic).length,
    nodeKinds: countBy(nodes, (node) => node.kind),
    edgeKinds: countBy(edges, (edge) => edge.kind),
    layers: countBy(edges, (edge) => edge.layer),
    routeKinds: countBy(
      edges.filter((edge) => edge.routeKind !== undefined),
      (edge) => edge.routeKind as string,
    ),
    strategies: countBy(
      edges.filter((edge) => edge.strategy !== undefined),
      (edge) => edge.strategy as string,
    ),
  };
}

function graphComponents(
  nodes: readonly FrameworkDiGraphNodeRow[],
  edges: readonly FrameworkDiGraphEdgeRow[],
): readonly FrameworkDiGraphComponentRow[] {
  const keyNodes = nodes.filter((node) => node.kind === "di-key");
  const keyNodeIds = new Set(keyNodes.map((node) => node.id));
  const graphEdges = edges.filter(
    (edge) =>
      keyNodeIds.has(edge.fromNodeId) &&
      keyNodeIds.has(edge.toNodeId) &&
      (edge.kind === "key-depends-on-key" || edge.kind === "key-aliases-key"),
  );
  const adjacency = new Map<string, string[]>();
  for (const node of keyNodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of graphEdges) {
    adjacency.get(edge.fromNodeId)?.push(edge.toNodeId);
  }
  const components = new Tarjan(adjacency).components();
  const componentByNode = new Map<string, string>();
  const rows = components.map((nodeIds, index) => {
    const id = `framework-di:dag-component:${index}`;
    for (const nodeId of nodeIds) {
      componentByNode.set(nodeId, id);
    }
    const names = nodeIds
      .map((nodeId) => keyNodes.find((node) => node.id === nodeId)?.name)
      .filter((name): name is string => name !== undefined)
      .sort();
    const selfLoop = graphEdges.some(
      (edge) =>
        nodeIds.includes(edge.fromNodeId) &&
        edge.fromNodeId === edge.toNodeId,
    );
    const internalEdges = graphEdges
      .filter(
        (edge) =>
          nodeIds.includes(edge.fromNodeId) &&
          nodeIds.includes(edge.toNodeId),
      )
      .map((edge) => edge.id)
      .sort();
    return {
      id,
      keyNames: names,
      nodeIds: [...nodeIds].sort(),
      edgeIds: internalEdges,
      cyclic: nodeIds.length > 1 || selfLoop,
      outgoingComponentIds: [],
      incomingComponentIds: [],
      summary: `${names.join(", ")} DI dependency component.`,
    } satisfies FrameworkDiGraphComponentRow;
  });
  const mutable = new Map(
    rows.map((row) => [
      row.id,
      {
        outgoing: new Set<string>(),
        incoming: new Set<string>(),
      },
    ]),
  );
  for (const edge of graphEdges) {
    const from = componentByNode.get(edge.fromNodeId);
    const to = componentByNode.get(edge.toNodeId);
    if (from === undefined || to === undefined || from === to) {
      continue;
    }
    mutable.get(from)?.outgoing.add(to);
    mutable.get(to)?.incoming.add(from);
  }
  return rows
    .map((row) => {
      const links = mutable.get(row.id);
      return {
        ...row,
        outgoingComponentIds: [...(links?.outgoing ?? [])].sort(),
        incomingComponentIds: [...(links?.incoming ?? [])].sort(),
        summary: row.cyclic
          ? `${row.keyNames.join(", ")} forms a cyclic DI dependency component.`
          : `${row.keyNames.join(", ")} is one DI dependency DAG component.`,
      };
    })
    .sort(
      (left, right) =>
        Number(right.cyclic) - Number(left.cyclic) ||
        left.keyNames.join(",").localeCompare(right.keyNames.join(",")),
    );
}

class Tarjan {
  readonly #indexByNode = new Map<string, number>();
  readonly #lowLinkByNode = new Map<string, number>();
  readonly #stack: string[] = [];
  readonly #onStack = new Set<string>();
  readonly #components: string[][] = [];
  #nextIndex = 0;

  constructor(readonly adjacency: ReadonlyMap<string, readonly string[]>) {}

  components(): readonly string[][] {
    for (const node of this.adjacency.keys()) {
      if (!this.#indexByNode.has(node)) {
        this.strongConnect(node);
      }
    }
    return this.#components;
  }

  private strongConnect(node: string): void {
    this.#indexByNode.set(node, this.#nextIndex);
    this.#lowLinkByNode.set(node, this.#nextIndex);
    ++this.#nextIndex;
    this.#stack.push(node);
    this.#onStack.add(node);

    for (const next of this.adjacency.get(node) ?? []) {
      if (!this.#indexByNode.has(next)) {
        this.strongConnect(next);
        this.#lowLinkByNode.set(
          node,
          Math.min(
            this.#lowLinkByNode.get(node) ?? 0,
            this.#lowLinkByNode.get(next) ?? 0,
          ),
        );
      } else if (this.#onStack.has(next)) {
        this.#lowLinkByNode.set(
          node,
          Math.min(
            this.#lowLinkByNode.get(node) ?? 0,
            this.#indexByNode.get(next) ?? 0,
          ),
        );
      }
    }

    if (this.#lowLinkByNode.get(node) !== this.#indexByNode.get(node)) {
      return;
    }
    const component: string[] = [];
    while (this.#stack.length > 0) {
      const next = this.#stack.pop()!;
      this.#onStack.delete(next);
      component.push(next);
      if (next === node) {
        break;
      }
    }
    this.#components.push(component.sort());
  }
}

function componentMatches(
  component: FrameworkDiGraphComponentRow,
  filters: FrameworkDiGraphFilters,
): boolean {
  const query = filters.query;
  return (
    (filters.key === undefined || component.keyNames.includes(filters.key)) &&
    (query === undefined ||
      component.summary.includes(query) ||
      component.keyNames.some((key) => key.includes(query)))
  );
}

function compareNodes(
  left: FrameworkDiGraphNodeRow,
  right: FrameworkDiGraphNodeRow,
): number {
  return (
    left.kind.localeCompare(right.kind) ||
    left.name.localeCompare(right.name) ||
    (left.packageId ?? "").localeCompare(right.packageId ?? "")
  );
}

function compareEdges(
  left: FrameworkDiGraphEdgeRow,
  right: FrameworkDiGraphEdgeRow,
): number {
  return (
    left.layer.localeCompare(right.layer) ||
    left.kind.localeCompare(right.kind) ||
    left.fromName.localeCompare(right.fromName) ||
    left.toName.localeCompare(right.toName) ||
    left.id.localeCompare(right.id)
  );
}
