import {
  type FrameworkAdmissionRelationshipRow,
} from "../../framework/admission.js";
import {
  FrameworkRelationshipEndpointKind,
  type FrameworkRelationshipEndpoint,
} from "../../framework/relationships.js";
import {
  FrameworkResourceDefinitionKind,
  FrameworkResourceInstantiationKind,
} from "../../framework/resources.js";
import {
  sourceRangeKey,
  type SourceProject,
} from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import type { FrameworkDiscoveryFilters } from "./framework-filters.js";
import { readFrameworkBundles } from "./framework-bundles.js";
import {
  readFrameworkMaterializationIndex,
  type FrameworkMaterializationIndex,
  type FrameworkMaterializationDependencyRow,
  type FrameworkMaterializationRouteRow,
} from "./framework-materialization-lenses.js";
import {
  readFrameworkCompilerRelationships,
} from "./framework-compiler-products.js";
import {
  FrameworkResourceConvergenceLane,
  readFrameworkResourceConvergenceRows,
  type FrameworkResourceConvergenceRow,
} from "./framework-resource-lenses.js";
import { FrameworkResourceMaterializationSiteKind } from "./framework-resource-materialization.js";
import {
  countBy,
} from "./framework-support.js";
import {
  endpointForAdmissionAssociation,
} from "./framework-admission-endpoints.js";

/** Node kinds used by the admission flow graph. */
export type FrameworkAdmissionFlowNodeKind =
  | "configuration-export"
  | "registration-catalog"
  | "registry-export"
  | "resource"
  | "di-key"
  | "provider"
  | "compiler-instruction"
  | "registration-product"
  | "world-role";

/** Edge kinds used by the admission flow graph. */
export type FrameworkAdmissionFlowEdgeKind =
  | "admits"
  | "expands-catalog"
  | "catalog-admits"
  | "registry-invokes"
  | "materializes-key"
  | "provider-depends-on-key"
  | "resource-forms-world"
  | "compiler-produces-instruction";

/** Coarse layer where one admission flow edge participates. */
export type FrameworkAdmissionFlowLayer =
  | "configuration"
  | "catalog"
  | "registry"
  | "di-materialization"
  | "di-dependency"
  | "resource-world"
  | "compiler";

/** Named flow corridors that slice a composed admission graph for one semantic path. */
export const FrameworkAdmissionFlowCorridor = {
  JitCompiler: "jit-compiler",
} as const;

export type FrameworkAdmissionFlowCorridor =
  typeof FrameworkAdmissionFlowCorridor[keyof typeof FrameworkAdmissionFlowCorridor];

/** Node in the configuration admission flow graph. */
export interface FrameworkAdmissionFlowNodeRow {
  /** Stable node id within the current source basis. */
  readonly id: string;
  /** Node kind. */
  readonly kind: FrameworkAdmissionFlowNodeKind;
  /** Human-readable node name. */
  readonly name: string;
  /** Owning framework package id when source-backed. */
  readonly packageId?: string;
  /** Owning framework package name when source-backed. */
  readonly packageName?: string;
  /** Exact source range for the node when visible. */
  readonly source?: SourceRange;
  /** Compact node summary. */
  readonly summary: string;
}

/** Edge in the configuration admission flow graph. */
export interface FrameworkAdmissionFlowEdgeRow {
  /** Stable edge id within the current source basis. */
  readonly id: string;
  /** Specific graph edge kind. */
  readonly edgeKind: FrameworkAdmissionFlowEdgeKind;
  /** Coarse graph layer. */
  readonly layer: FrameworkAdmissionFlowLayer;
  /** Association, materialization route, or resource role carried by the edge. */
  readonly role: string;
  /** Source node id. */
  readonly fromNodeId: string;
  /** Target node id. */
  readonly toNodeId: string;
  /** Source node display name. */
  readonly fromName: string;
  /** Target node display name. */
  readonly toName: string;
  /** Owning framework package id when source-backed. */
  readonly packageId?: string;
  /** Owning framework package name when source-backed. */
  readonly packageName?: string;
  /** Exact source range for the edge evidence when visible. */
  readonly source?: SourceRange;
  /** Source row id from the underlying substrate. */
  readonly sourceRowId?: string;
  /** Admission relationship that introduced this flow path, when applicable. */
  readonly admissionRelationshipId?: string;
  /** Evaluator bundle association behind this edge, when applicable. */
  readonly bundleAssociationId?: string;
  /** DI materialization route id behind this edge, when applicable. */
  readonly routeId?: string;
  /** DI materialization route kind behind this edge, when applicable. */
  readonly routeKind?: string;
  /** DI key whose materialization route owns this edge, when applicable. */
  readonly ownerKey?: string;
  /** Provider/value whose materialization route owns this edge, when applicable. */
  readonly providerName?: string;
  /** Raw provider endpoint name when it differs from the graph/display name. */
  readonly providerRawName?: string;
  /** DI dependency row id behind this edge, when applicable. */
  readonly dependencyId?: string;
  /** DI key resolved by a provider callback dependency, when applicable. */
  readonly dependencyKey?: string;
  /** Container access kind for dependency edges, when applicable. */
  readonly dependencyAccess?: string;
  /** Execution policy for dependency edges, when applicable. */
  readonly dependencyPolicy?: string;
  /** Static certainty for dependency edges, when applicable. */
  readonly dependencyCertainty?: string;
  /** Control-path labels for dependency edges, when applicable. */
  readonly controlPath?: readonly string[];
  /** Resource definition kind behind this edge, when applicable. */
  readonly resourceKind?: string;
  /** Registration catalog that owns this edge, when applicable. */
  readonly catalogName?: string | null;
  /** Evaluator path inside spread/catalog expansion. */
  readonly path?: readonly string[];
  /** Resource convergence lanes present on resource-world edges. */
  readonly lanes?: readonly string[];
  /** Syntax product kinds joined to a resource-world edge. */
  readonly syntaxProductKinds?: readonly string[];
  /** Instruction names joined to a resource-world edge. */
  readonly instructionNames?: readonly string[];
  /** Binding names joined to a resource-world edge. */
  readonly bindingNames?: readonly string[];
  /** Resource materialization classes joined to a resource-world edge. */
  readonly instantiationKinds?: readonly string[];
  /** Materialization site kinds joined to a resource-world edge. */
  readonly materializationSiteKinds?: readonly string[];
  /** Materialization phases joined to a resource-world edge. */
  readonly materializationPhases?: readonly string[];
  /** Open reasons preserved from resource convergence. */
  readonly openReasons?: readonly string[];
  /** Flow corridor that introduced or retained this edge, when a corridor is selected. */
  readonly corridor?: FrameworkAdmissionFlowCorridor;
  /** Compiler producer symbol/method behind compiler edges. */
  readonly compilerProducerName?: string;
  /** Compiler instruction produced by this edge. */
  readonly instructionName?: string;
  /** Compiler mechanism behind instruction production. */
  readonly compilerMechanism?: string;
  /** Compact edge summary. */
  readonly summary: string;
}

/** Compact edge row for first-pass graph inspection. */
export interface FrameworkAdmissionFlowEdgeSummaryRow {
  readonly id: string;
  readonly edgeKind: FrameworkAdmissionFlowEdgeKind;
  readonly layer: FrameworkAdmissionFlowLayer;
  readonly role: string;
  readonly fromName: string;
  readonly toName: string;
  readonly source?: SourceRange;
  readonly ownerKey?: string;
  readonly providerName?: string;
  readonly dependencyAccess?: string;
  readonly dependencyKey?: string;
  readonly resourceKind?: string;
  readonly instructionName?: string;
  readonly compilerProducerName?: string;
  readonly summary: string;
}

/** Value returned by framework.admission:flow. */
export interface FrameworkAdmissionFlowValue {
  /** Flow graph schema version. */
  readonly flowVersion: string;
  /** Optional graph corridor used to slice the composed flow. */
  readonly corridor?: FrameworkAdmissionFlowCorridor;
  /** Number of retained nodes. */
  readonly nodeCount: number;
  /** Number of retained edges. */
  readonly edgeCount: number;
  /** Edge counts grouped by edge kind. */
  readonly edgeKinds: Readonly<Record<string, number>>;
  /** Edge counts grouped by graph layer. */
  readonly layers: Readonly<Record<string, number>>;
  /** Edge counts grouped by role. */
  readonly roles: Readonly<Record<string, number>>;
  /** DI materialization edges grouped by route kind. */
  readonly routeKinds: Readonly<Record<string, number>>;
  /** Resource-world edges grouped by resource kind. */
  readonly resourceKinds: Readonly<Record<string, number>>;
  /** Number of resource-world edges with open convergence reasons. */
  readonly openResourceCount: number;
  /** Flow nodes returned for the current page context. */
  readonly nodes?: readonly FrameworkAdmissionFlowNodeRow[];
  /** Compact flow edges returned for the current page. */
  readonly edges?: readonly FrameworkAdmissionFlowEdgeSummaryRow[];
  /** Full flow edge rows returned for explicit detail projections. */
  readonly edgeDetails?: readonly FrameworkAdmissionFlowEdgeRow[];
}

export interface FrameworkAdmissionFlowFilters
  extends FrameworkDiscoveryFilters {
  /** Optional named graph corridor. */
  readonly corridor?: string;
  /** Filter by flow edge kind. */
  readonly edgeKind?: string;
  /** Filter by source or target node kind. */
  readonly nodeKind?: string;
  /** Filter by association, route, or resource role. */
  readonly role?: string;
  /** Filter by source or target node name. */
  readonly targetName?: string;
  /** Filter resource-world rows by resource kind. */
  readonly resourceKind?: string;
  /** Filter by DI key or node name. */
  readonly key?: string;
}

export interface FrameworkAdmissionFlowIndex {
  /** Retained flow nodes. */
  readonly nodes: readonly FrameworkAdmissionFlowNodeRow[];
  /** Retained flow edges. */
  readonly edges: readonly FrameworkAdmissionFlowEdgeRow[];
  /** Compact flow rollup. */
  readonly value: FrameworkAdmissionFlowValue;
}

const FRAMEWORK_ADMISSION_FLOW_VERSION = "framework-admission-flow@1";
const MAX_REGISTRY_EXPANSION_DEPTH = 4;
const MAX_DI_DEPENDENCY_DEPTH = 8;

/** Compose admission, registry expansion, DI materialization, and resource-role rows into one graph. */
export function readFrameworkAdmissionFlow(
  sourceProject: SourceProject,
  relationships: readonly FrameworkAdmissionRelationshipRow[],
  filters: FrameworkAdmissionFlowFilters,
): FrameworkAdmissionFlowIndex {
  const builder = new FrameworkAdmissionFlowBuilder(
    sourceProject,
    relationships,
    filters,
  );
  return builder.build();
}

class FrameworkAdmissionFlowBuilder {
  readonly #nodes = new Map<string, FrameworkAdmissionFlowNodeRow>();
  readonly #edges = new Map<string, FrameworkAdmissionFlowEdgeRow>();
  readonly #visitedRegistryTargets = new Set<string>();
  readonly #visitedDependencyRoutes = new Set<string>();
  readonly #resourceRowsBySource = new Map<string, FrameworkResourceConvergenceRow>();
  readonly #materialization: FrameworkMaterializationIndex;
  readonly #routesByProviderName: ReadonlyMap<string, readonly FrameworkMaterializationRouteRow[]>;
  readonly #routesByKey: ReadonlyMap<string, readonly FrameworkMaterializationRouteRow[]>;

  constructor(
    readonly sourceProject: SourceProject,
    readonly relationships: readonly FrameworkAdmissionRelationshipRow[],
    readonly filters: FrameworkAdmissionFlowFilters,
  ) {
    this.#materialization = readFrameworkMaterializationIndex(sourceProject);
    this.#routesByProviderName = groupRoutes(
      this.#materialization.routes,
      (route) => route.provider.name,
    );
    this.#routesByKey = groupRoutes(
      this.#materialization.routes,
      (route) => route.key,
    );
    for (const row of readFrameworkResourceConvergenceRows(sourceProject, {
      ...(filters.exportName === undefined
        ? {}
        : { bundleExportName: filters.exportName }),
      ...(filters.resourceKind === undefined
        ? {}
        : { resourceKind: filters.resourceKind }),
    })) {
      this.#resourceRowsBySource.set(sourceRangeKey(row.definitionSource), row);
      if (row.declarationSource !== null) {
        this.#resourceRowsBySource.set(sourceRangeKey(row.declarationSource), row);
      }
    }
  }

  build(): FrameworkAdmissionFlowIndex {
    for (const relationship of this.relationships) {
      this.addAdmissionEdge(relationship);
      this.addEndpointMaterializationEdges(
        relationship.to,
        relationship.id,
      );
      if (relationship.to.kind === FrameworkRelationshipEndpointKind.Resource) {
        this.addResourceFlowEdges(relationship);
      }
    }
    for (const relationship of this.relationships) {
      if (relationship.to.kind !== FrameworkRelationshipEndpointKind.RegistryExport) {
        continue;
      }
      this.addRegistryExpansion(relationship.to, relationship.id, 0);
    }
    if (this.filters.corridor === FrameworkAdmissionFlowCorridor.JitCompiler) {
      this.addJitCompilerEdges();
    }
    const allNodes = [...this.#nodes.values()].sort(compareAdmissionFlowNodes);
    const allNodesById = new Map(allNodes.map((node) => [node.id, node]));
    const corridorEdges = flowCorridorEdges(
      [...this.#edges.values()],
      allNodesById,
      this.filters.corridor,
    );
    const edges = corridorEdges
      .filter((edge) => admissionFlowEdgeMatches(edge, this.filters, allNodesById))
      .sort(compareAdmissionFlowEdges);
    const retainedNodeIds = new Set(
      edges.flatMap((edge) => [edge.fromNodeId, edge.toNodeId]),
    );
    const retainedNodes = allNodes.filter((node) =>
      retainedNodeIds.has(node.id),
    );
    return {
      nodes: retainedNodes,
      edges,
      value: flowValue(retainedNodes, edges, this.filters.corridor),
    };
  }

  private addAdmissionEdge(
    relationship: FrameworkAdmissionRelationshipRow,
  ): void {
    const from =
      relationship.catalogName !== null &&
      relationship.to.kind !== FrameworkRelationshipEndpointKind.RegistrationCatalog
        ? this.nodeForEndpoint(
            {
              kind: FrameworkRelationshipEndpointKind.RegistrationCatalog,
              name: relationship.catalogName,
              packageId: relationship.packageId,
              packageName: relationship.packageName,
              source: relationship.source,
            },
            "registration-catalog",
          )
        : this.nodeForEndpoint(relationship.from, "configuration-export");
    const to = this.nodeForEndpoint(
      relationship.to,
      nodeKindForEndpoint(relationship.to),
    );
    const isCatalog =
      relationship.to.kind === FrameworkRelationshipEndpointKind.RegistrationCatalog;
    this.addEdge({
      id: `${relationship.id}:flow:admission`,
      edgeKind: isCatalog
        ? "expands-catalog"
        : relationship.catalogName !== null
          ? "catalog-admits"
          : "admits",
      layer: isCatalog
        ? "configuration"
        : relationship.catalogName !== null
          ? "catalog"
          : "configuration",
      role: relationship.associationKind,
      fromNodeId: from.id,
      toNodeId: to.id,
      fromName: from.name,
      toName: to.name,
      packageId: relationship.packageId,
      packageName: relationship.packageName,
      source: relationship.source,
      sourceRowId: relationship.id,
      admissionRelationshipId: relationship.id,
      bundleAssociationId: relationship.bundleAssociationId,
      resourceKind: relationship.to.resourceKind,
      catalogName: relationship.catalogName,
      path: relationship.path,
      summary: `${from.name} ${isCatalog ? "expands" : "admits"} ${to.name} through ${relationship.associationKind}.`,
    });
  }

  private addResourceFlowEdges(
    relationship: FrameworkAdmissionRelationshipRow,
  ): void {
    const source = relationship.to.source;
    const resource =
      source === undefined ? undefined : this.#resourceRowsBySource.get(sourceRangeKey(source));
    if (resource === undefined) {
      return;
    }
    const from = this.nodeForEndpoint(relationship.to, "resource");
    const role = resourceRole(resource);
    const to = this.addNode({
      id: admissionFlowNodeId("world-role", undefined, role),
      kind: "world-role",
      name: role,
      summary: `${role} resource role.`,
    });
    this.addEdge({
      id: `${relationship.id}:flow:resource:${resource.id}`,
      edgeKind: "resource-forms-world",
      layer: "resource-world",
      role,
      fromNodeId: from.id,
      toNodeId: to.id,
      fromName: from.name,
      toName: to.name,
      packageId: resource.packageId,
      packageName: resource.packageName,
      source: resource.definitionSource,
      sourceRowId: resource.id,
      admissionRelationshipId: relationship.id,
      resourceKind: resource.resourceKind,
      lanes: resource.lanes,
      syntaxProductKinds: resource.syntaxProductKinds,
      instructionNames: resource.instructionNames,
      bindingNames: resource.bindingNames,
      instantiationKinds: resource.instantiationKinds,
      materializationSiteKinds: resource.materializationSiteKinds,
      materializationPhases: resource.materializationPhases,
      openReasons: resource.openReasons,
      summary: `${from.name} participates as ${role}; lanes ${resource.lanes.join(", ")}.`,
    });
  }

  private addRegistryExpansion(
    endpoint: FrameworkRelationshipEndpoint,
    admissionRelationshipId: string | undefined,
    depth: number,
  ): void {
    if (
      depth > MAX_REGISTRY_EXPANSION_DEPTH ||
      endpoint.packageId === undefined
    ) {
      return;
    }
    const targetKey = `${endpoint.packageId}:${endpoint.name}`;
    if (this.#visitedRegistryTargets.has(targetKey)) {
      return;
    }
    this.#visitedRegistryTargets.add(targetKey);
    this.addEndpointMaterializationEdges(
      endpoint,
      admissionRelationshipId,
    );
    const bundles = readFrameworkBundles(this.sourceProject, {
      packageId: endpoint.packageId,
      exportName: endpoint.name,
    });
    for (const bundle of bundles) {
      for (const association of bundle.associations) {
        const child = endpointForAdmissionAssociation(association);
        const from = this.nodeForEndpoint(endpoint, "registry-export");
        const to = this.nodeForEndpoint(child, nodeKindForEndpoint(child));
        this.addEdge({
          id: `${association.id}:flow:registry:${depth}`,
          edgeKind: "registry-invokes",
          layer: "registry",
          role: association.associationKind,
          fromNodeId: from.id,
          toNodeId: to.id,
          fromName: from.name,
          toName: to.name,
          packageId: association.packageId,
          packageName: association.packageName,
          source: association.source,
          sourceRowId: association.id,
          admissionRelationshipId,
          bundleAssociationId: association.id,
          catalogName: association.catalogName,
          path: association.path,
          summary: `${from.name}.register admits ${to.name} through ${association.associationKind}.`,
        });
        this.addEndpointMaterializationEdges(
          child,
          admissionRelationshipId,
        );
        if (child.kind === FrameworkRelationshipEndpointKind.RegistryExport) {
          this.addRegistryExpansion(child, admissionRelationshipId, depth + 1);
        }
      }
    }
  }

  private addEndpointMaterializationEdges(
    endpoint: FrameworkRelationshipEndpoint,
    admissionRelationshipId: string | undefined,
  ): void {
    const routes = uniqueRoutes([
      ...(this.#routesByProviderName.get(endpoint.name) ?? []),
      ...(this.#routesByKey.get(endpoint.name) ?? []),
    ]);
    for (const route of routes) {
      this.addMaterializationEdge(
        route,
        this.providerNodeForRoute(route),
        admissionRelationshipId,
      );
      this.addRouteDependencyEdges(
        route,
        admissionRelationshipId,
        0,
      );
    }
  }

  private addMaterializationEdge(
    route: FrameworkMaterializationRouteRow,
    from: FrameworkAdmissionFlowNodeRow,
    admissionRelationshipId: string | undefined,
  ): void {
    const to = this.nodeForEndpoint(route.keyEndpoint, "di-key");
    this.addEdge({
      id: `framework-admission-flow:materializes:${route.providerIdentity.id}:${route.key}:${route.routeKind}`,
      edgeKind: "materializes-key",
      layer: "di-materialization",
      role: route.routeKind,
      fromNodeId: from.id,
      toNodeId: to.id,
      fromName: from.name,
      toName: to.name,
      packageId: route.packageId,
      packageName: route.packageName,
      source: route.providerSource ?? route.source,
      sourceRowId: route.id,
      admissionRelationshipId,
      routeId: route.id,
      routeKind: route.routeKind,
      ownerKey: route.key,
      providerName: route.providerIdentity.name,
      providerRawName: route.providerIdentity.rawName,
      summary: `${route.providerIdentity.name} materializes DI key ${route.key} through ${route.routeKind}.`,
    });
  }

  private addRouteDependencyEdges(
    route: FrameworkMaterializationRouteRow,
    admissionRelationshipId: string | undefined,
    depth: number,
  ): void {
    if (depth > MAX_DI_DEPENDENCY_DEPTH) {
      return;
    }
    const visitKey = routeTraversalKey(route);
    if (this.#visitedDependencyRoutes.has(visitKey)) {
      return;
    }
    this.#visitedDependencyRoutes.add(visitKey);
    for (const dependency of route.dependencies) {
      this.addDependencyEdge(route, dependency, admissionRelationshipId);
      const dependencyRoutes =
        this.#routesByKey.get(dependency.dependencyKey) ?? [];
      for (const dependencyRoute of dependencyRoutes) {
        this.addMaterializationEdge(
          dependencyRoute,
          this.providerNodeForRoute(dependencyRoute),
          admissionRelationshipId,
        );
        this.addRouteDependencyEdges(
          dependencyRoute,
          admissionRelationshipId,
          depth + 1,
        );
      }
    }
  }

  private addDependencyEdge(
    route: FrameworkMaterializationRouteRow,
    dependency: FrameworkMaterializationDependencyRow,
    admissionRelationshipId: string | undefined,
  ): void {
    const from = this.providerNodeForRoute(route);
    const to = this.nodeForEndpoint(
      {
        kind: FrameworkRelationshipEndpointKind.DiKey,
        name: dependency.dependencyKey,
        packageId: dependency.packageId,
        packageName: dependency.packageName,
        source: dependency.argumentSource,
      },
      "di-key",
    );
    this.addEdge({
      id: `framework-admission-flow:provider-depends:${route.providerIdentity.id}:${dependency.dependencyKey}:${dependency.access}:${dependency.policy}`,
      edgeKind: "provider-depends-on-key",
      layer: "di-dependency",
      role: dependency.access,
      fromNodeId: from.id,
      toNodeId: to.id,
      fromName: from.name,
      toName: to.name,
      packageId: dependency.packageId,
      packageName: dependency.packageName,
      source: dependency.source,
      sourceRowId: dependency.id,
      admissionRelationshipId,
      routeId: route.id,
      routeKind: route.routeKind,
      ownerKey: route.key,
      providerName: route.providerIdentity.name,
      providerRawName: route.providerIdentity.rawName,
      dependencyId: dependency.id,
      dependencyKey: dependency.dependencyKey,
      dependencyAccess: dependency.access,
      dependencyPolicy: dependency.policy,
      dependencyCertainty: dependency.certainty,
      controlPath: dependency.controlPath,
      summary: `${route.providerIdentity.name} materializing ${route.key} depends on DI key ${dependency.dependencyKey} through ${dependency.access}.`,
    });
  }

  private addJitCompilerEdges(): void {
    for (const relationship of readFrameworkCompilerRelationships(
      this.sourceProject,
      {},
    )) {
      const from = this.compilerProducerNodeFor(relationship.from.name);
      if (from === null) {
        continue;
      }
      const instructionName = relationship.to.name;
      const to = this.addNode({
        id: admissionFlowNodeId(
          "compiler-instruction",
          relationship.packageId,
          instructionName,
        ),
        kind: "compiler-instruction",
        name: instructionName,
        packageId: relationship.packageId,
        packageName: relationship.packageName,
        summary: `${instructionName} compiler instruction.`,
      });
      this.addEdge({
        id: `${relationship.id}:flow:jit-compiler`,
        edgeKind: "compiler-produces-instruction",
        layer: "compiler",
        role: relationship.mechanism,
        fromNodeId: from.id,
        toNodeId: to.id,
        fromName: from.name,
        toName: to.name,
        packageId: relationship.packageId,
        packageName: relationship.packageName,
        source: relationship.source,
        sourceRowId: relationship.sourceRowId,
        corridor: FrameworkAdmissionFlowCorridor.JitCompiler,
        compilerProducerName: relationship.from.name,
        instructionName,
        compilerMechanism: relationship.mechanism,
        instructionNames: [instructionName],
        summary: `${relationship.from.name} produces compiler instruction ${instructionName} through ${relationship.mechanism}.`,
      });
    }
  }

  private compilerProducerNodeFor(
    producerName: string,
  ): FrameworkAdmissionFlowNodeRow | null {
    const actorName = compilerActorName(producerName);
    const candidates = [...this.#nodes.values()].filter(
      (node) => node.name === producerName || node.name === actorName,
    );
    if (candidates.length === 0) {
      return null;
    }
    return candidates.sort(compareCompilerProducerNodes)[0] ?? null;
  }

  private providerNodeForRoute(
    route: FrameworkMaterializationRouteRow,
  ): FrameworkAdmissionFlowNodeRow {
    return this.addNode({
      id: admissionFlowNodeId("provider", route.packageId, route.providerIdentity.id),
      kind: "provider",
      name: route.providerIdentity.name,
      packageId: route.packageId,
      packageName: route.packageName,
      source: route.provider.source ?? route.source,
      summary: `${route.providerIdentity.name} provider (${route.providerIdentity.kind}).`,
    });
  }

  private nodeForEndpoint(
    endpoint: FrameworkRelationshipEndpoint,
    fallbackKind: FrameworkAdmissionFlowNodeKind,
  ): FrameworkAdmissionFlowNodeRow {
    const nodePackageId =
      fallbackKind === "di-key" ? undefined : endpoint.packageId;
    return this.addNode({
      id: admissionFlowNodeId(fallbackKind, nodePackageId, endpoint.name),
      kind: fallbackKind,
      name: endpoint.name,
      ...(endpoint.packageId === undefined
        ? {}
        : { packageId: endpoint.packageId }),
      ...(endpoint.packageName === undefined
        ? {}
        : { packageName: endpoint.packageName }),
      ...(endpoint.source === undefined ? {} : { source: endpoint.source }),
      summary: `${endpoint.name} ${fallbackKind}.`,
    });
  }

  private addNode(
    row: FrameworkAdmissionFlowNodeRow,
  ): FrameworkAdmissionFlowNodeRow {
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

  private addEdge(row: FrameworkAdmissionFlowEdgeRow): void {
    if (!this.#edges.has(row.id)) {
      this.#edges.set(row.id, row);
    }
  }
}

function routeTraversalKey(route: FrameworkMaterializationRouteRow): string {
  return `${route.key}:${route.providerIdentity.id}:${route.routeKind}`;
}

function groupRoutes(
  routes: readonly FrameworkMaterializationRouteRow[],
  keyForRoute: (route: FrameworkMaterializationRouteRow) => string,
): ReadonlyMap<string, readonly FrameworkMaterializationRouteRow[]> {
  const groups = new Map<string, FrameworkMaterializationRouteRow[]>();
  for (const route of routes) {
    const key = keyForRoute(route);
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [route]);
      continue;
    }
    group.push(route);
  }
  return groups;
}

function uniqueRoutes(
  routes: readonly FrameworkMaterializationRouteRow[],
): readonly FrameworkMaterializationRouteRow[] {
  const seen = new Set<string>();
  const unique: FrameworkMaterializationRouteRow[] = [];
  for (const route of routes) {
    if (seen.has(route.id)) {
      continue;
    }
    seen.add(route.id);
    unique.push(route);
  }
  return unique;
}

function flowCorridorEdges(
  edges: readonly FrameworkAdmissionFlowEdgeRow[],
  nodesById: ReadonlyMap<string, FrameworkAdmissionFlowNodeRow>,
  corridor: string | undefined,
): readonly FrameworkAdmissionFlowEdgeRow[] {
  if (corridor !== FrameworkAdmissionFlowCorridor.JitCompiler) {
    return edges;
  }
  return jitCompilerCorridorEdges(edges, nodesById);
}

const JIT_COMPILER_RESOURCE_KINDS = new Set<string>([
  FrameworkResourceDefinitionKind.AttributePattern,
  FrameworkResourceDefinitionKind.BindingCommand,
  FrameworkResourceDefinitionKind.CustomAttribute,
  FrameworkResourceDefinitionKind.CustomElement,
  FrameworkResourceDefinitionKind.TemplateController,
]);

const JIT_COMPILER_DEFINITION_LOOKUP_RESOURCE_KINDS = new Set<string>([
  FrameworkResourceDefinitionKind.CustomAttribute,
  FrameworkResourceDefinitionKind.CustomElement,
  FrameworkResourceDefinitionKind.TemplateController,
]);

function jitCompilerCorridorEdges(
  edges: readonly FrameworkAdmissionFlowEdgeRow[],
  nodesById: ReadonlyMap<string, FrameworkAdmissionFlowNodeRow>,
): readonly FrameworkAdmissionFlowEdgeRow[] {
  const retainedEdgeIds = new Set<string>();
  const relevantNodeIds = new Set<string>();
  const relevantNames = new Set<string>();
  const diSeedNodeIds = new Set<string>();
  const diSeedNames = new Set<string>();

  const rememberEdge = (
    edge: FrameworkAdmissionFlowEdgeRow,
    seedDi: boolean,
  ): boolean => {
    const before =
      retainedEdgeIds.size +
      relevantNodeIds.size +
      relevantNames.size +
      diSeedNodeIds.size +
      diSeedNames.size;
    retainedEdgeIds.add(edge.id);
    rememberEndpoint(edge.fromNodeId, edge.fromName, seedDi);
    rememberEndpoint(edge.toNodeId, edge.toName, seedDi);
    rememberName(edge.ownerKey, seedDi);
    rememberName(edge.providerName, seedDi);
    rememberName(edge.providerRawName, seedDi);
    rememberName(edge.dependencyKey, seedDi);
    rememberName(edge.compilerProducerName, seedDi);
    rememberName(edge.instructionName, seedDi);
    for (const instructionName of edge.instructionNames ?? []) {
      rememberName(instructionName, seedDi);
    }
    return (
      retainedEdgeIds.size +
        relevantNodeIds.size +
        relevantNames.size +
        diSeedNodeIds.size +
        diSeedNames.size !==
      before
    );
  };

  const rememberEndpoint = (
    nodeId: string,
    name: string,
    seedDi: boolean,
  ): void => {
    relevantNodeIds.add(nodeId);
    rememberName(name, seedDi);
    if (seedDi) {
      diSeedNodeIds.add(nodeId);
    }
    const node = nodesById.get(nodeId);
    if (node !== undefined) {
      rememberName(node.name, seedDi);
    }
  };

  const rememberName = (name: string | undefined, seedDi: boolean): void => {
    if (name !== undefined && name.length > 0) {
      relevantNames.add(name);
      if (seedDi) {
        diSeedNames.add(name);
      }
    }
  };

  for (const edge of edges) {
    if (edge.layer === "compiler") {
      rememberEdge(edge, true);
      continue;
    }
    if (
      edge.edgeKind === "resource-forms-world" &&
      isJitCompilerResourceKind(edge.resourceKind)
    ) {
      rememberEdge(edge, false);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (
        !shouldRetainJitCompilerEdge(
          edge,
          relevantNodeIds,
          relevantNames,
          diSeedNodeIds,
          diSeedNames,
        )
      ) {
        continue;
      }
      changed = rememberEdge(edge, edge.layer.startsWith("di-")) || changed;
    }
  }

  return edges
    .filter((edge) => retainedEdgeIds.has(edge.id))
    .map((edge) => jitCompilerCorridorEdge(edge));
}

function jitCompilerCorridorEdge(
  edge: FrameworkAdmissionFlowEdgeRow,
): FrameworkAdmissionFlowEdgeRow {
  if (
    edge.edgeKind !== "resource-forms-world" ||
    !JIT_COMPILER_DEFINITION_LOOKUP_RESOURCE_KINDS.has(edge.resourceKind ?? "")
  ) {
    return edge;
  }
  const siteKinds = (edge.materializationSiteKinds ?? []).filter(
    (siteKind) =>
      siteKind === FrameworkResourceMaterializationSiteKind.DefinitionLookup ||
      siteKind === FrameworkResourceMaterializationSiteKind.DefinitionRegistration,
  );
  const phases = (edge.materializationPhases ?? []).filter(
    (phase) =>
      phase === "compilation" ||
      phase === "registration" ||
      phase === "resource-lookup",
  );
  return {
    ...edge,
    role: FrameworkResourceMaterializationSiteKind.DefinitionLookup,
    instantiationKinds: [FrameworkResourceInstantiationKind.DefinitionOnly],
    materializationSiteKinds: siteKinds,
    materializationPhases: phases,
    summary: `${edge.fromName} is available to the compiler as a ${edge.resourceKind} definition lookup; runtime view-model construction is outside this corridor.`,
  };
}

function shouldRetainJitCompilerEdge(
  edge: FrameworkAdmissionFlowEdgeRow,
  relevantNodeIds: ReadonlySet<string>,
  relevantNames: ReadonlySet<string>,
  diSeedNodeIds: ReadonlySet<string>,
  diSeedNames: ReadonlySet<string>,
): boolean {
  if (edge.resourceKind === "renderer") {
    return false;
  }
  if (edge.layer === "compiler") {
    return true;
  }
  if (edge.edgeKind === "resource-forms-world") {
    return isJitCompilerResourceKind(edge.resourceKind);
  }
  if (
    edge.layer === "configuration" ||
    edge.layer === "catalog" ||
    edge.layer === "registry"
  ) {
    return (
      isJitCompilerResourceKind(edge.resourceKind) ||
      relevantNodeIds.has(edge.toNodeId) ||
      relevantNames.has(edge.toName)
    );
  }
  if (edge.layer === "di-dependency") {
    return edgeDependencyOwnerIsRelevant(edge, diSeedNodeIds, diSeedNames);
  }
  if (edge.layer === "di-materialization") {
    return edgeMaterializationEndpointIsRelevant(
      edge,
      diSeedNodeIds,
      diSeedNames,
    );
  }
  return edgeTouchesRelevantName(edge, relevantNodeIds, relevantNames);
}

function edgeDependencyOwnerIsRelevant(
  edge: FrameworkAdmissionFlowEdgeRow,
  relevantNodeIds: ReadonlySet<string>,
  relevantNames: ReadonlySet<string>,
): boolean {
  return (
    relevantNodeIds.has(edge.fromNodeId) ||
    relevantNames.has(edge.fromName) ||
    (edge.ownerKey !== undefined && relevantNames.has(edge.ownerKey)) ||
    (edge.providerName !== undefined && relevantNames.has(edge.providerName)) ||
    (edge.providerRawName !== undefined &&
      relevantNames.has(edge.providerRawName))
  );
}

function edgeMaterializationEndpointIsRelevant(
  edge: FrameworkAdmissionFlowEdgeRow,
  relevantNodeIds: ReadonlySet<string>,
  relevantNames: ReadonlySet<string>,
): boolean {
  return (
    relevantNodeIds.has(edge.fromNodeId) ||
    relevantNodeIds.has(edge.toNodeId) ||
    relevantNames.has(edge.fromName) ||
    relevantNames.has(edge.toName) ||
    (edge.ownerKey !== undefined && relevantNames.has(edge.ownerKey)) ||
    (edge.providerName !== undefined && relevantNames.has(edge.providerName)) ||
    (edge.providerRawName !== undefined &&
      relevantNames.has(edge.providerRawName))
  );
}

function edgeTouchesRelevantName(
  edge: FrameworkAdmissionFlowEdgeRow,
  relevantNodeIds: ReadonlySet<string>,
  relevantNames: ReadonlySet<string>,
): boolean {
  if (
    relevantNodeIds.has(edge.fromNodeId) ||
    relevantNodeIds.has(edge.toNodeId) ||
    relevantNames.has(edge.fromName) ||
    relevantNames.has(edge.toName)
  ) {
    return true;
  }
  return [
    edge.ownerKey,
    edge.providerName,
    edge.providerRawName,
    edge.dependencyKey,
    edge.compilerProducerName,
    edge.instructionName,
    ...(edge.instructionNames ?? []),
  ].some((value) => value !== undefined && relevantNames.has(value));
}

function isJitCompilerResourceKind(
  resourceKind: string | undefined,
): boolean {
  return resourceKind !== undefined &&
    JIT_COMPILER_RESOURCE_KINDS.has(resourceKind);
}

function nodeKindForEndpoint(
  endpoint: FrameworkRelationshipEndpoint,
): FrameworkAdmissionFlowNodeKind {
  switch (endpoint.kind) {
    case FrameworkRelationshipEndpointKind.ConfigurationExport:
      return "configuration-export";
    case FrameworkRelationshipEndpointKind.RegistrationCatalog:
      return "registration-catalog";
    case FrameworkRelationshipEndpointKind.RegistryExport:
      return "registry-export";
    case FrameworkRelationshipEndpointKind.Resource:
      return "resource";
    case FrameworkRelationshipEndpointKind.DiKey:
      return "di-key";
    default:
      return "registration-product";
  }
}

function resourceRole(row: FrameworkResourceConvergenceRow): string {
  if (row.syntaxProductKinds.length > 0) {
    return `syntax:${row.syntaxProductKinds.join("+")}`;
  }
  if (row.instantiationKinds.length > 0) {
    return `materialization:${row.instantiationKinds.join("+")}`;
  }
  if (row.lanes.includes(FrameworkResourceConvergenceLane.DefinitionOnly)) {
    return "definition-only";
  }
  return row.resourceKind;
}

function compilerActorName(producerName: string): string {
  return producerName.split(".")[0] ?? producerName;
}

function compareCompilerProducerNodes(
  left: FrameworkAdmissionFlowNodeRow,
  right: FrameworkAdmissionFlowNodeRow,
): number {
  return (
    compilerProducerNodePriority(left.kind) -
      compilerProducerNodePriority(right.kind) ||
    (left.packageId ?? "").localeCompare(right.packageId ?? "") ||
    left.name.localeCompare(right.name)
  );
}

function compilerProducerNodePriority(
  kind: FrameworkAdmissionFlowNodeKind,
): number {
  switch (kind) {
    case "resource":
      return 0;
    case "provider":
      return 1;
    case "di-key":
      return 2;
    default:
      return 10;
  }
}

function flowValue(
  nodes: readonly FrameworkAdmissionFlowNodeRow[],
  edges: readonly FrameworkAdmissionFlowEdgeRow[],
  corridor: string | undefined,
): FrameworkAdmissionFlowValue {
  return {
    flowVersion: FRAMEWORK_ADMISSION_FLOW_VERSION,
    ...(corridor === FrameworkAdmissionFlowCorridor.JitCompiler
      ? { corridor }
      : {}),
    nodeCount: nodes.length,
    edgeCount: edges.length,
    edgeKinds: countBy(edges, (edge) => edge.edgeKind),
    layers: countBy(edges, (edge) => edge.layer),
    roles: countBy(edges, (edge) => edge.role),
    routeKinds: countBy(
      edges.filter((edge) => edge.routeKind !== undefined),
      (edge) => edge.routeKind as string,
    ),
    resourceKinds: countBy(
      edges.filter(
        (edge) =>
          edge.edgeKind === "resource-forms-world" &&
          edge.resourceKind !== undefined,
      ),
      (edge) => edge.resourceKind as string,
    ),
    openResourceCount: edges.filter(
      (edge) => (edge.openReasons?.length ?? 0) > 0,
    ).length,
  };
}

function admissionFlowEdgeMatches(
  edge: FrameworkAdmissionFlowEdgeRow,
  filters: FrameworkAdmissionFlowFilters,
  nodesById: ReadonlyMap<string, FrameworkAdmissionFlowNodeRow>,
): boolean {
  const fromNode = nodesById.get(edge.fromNodeId);
  const toNode = nodesById.get(edge.toNodeId);
  return (
    (filters.edgeKind === undefined || edge.edgeKind === filters.edgeKind) &&
    (filters.nodeKind === undefined ||
      fromNode?.kind === filters.nodeKind ||
      toNode?.kind === filters.nodeKind) &&
    (filters.role === undefined || edge.role === filters.role) &&
    (filters.targetName === undefined ||
      edge.fromName === filters.targetName ||
      edge.toName === filters.targetName) &&
    (filters.key === undefined ||
      edge.fromName === filters.key ||
      edge.toName === filters.key ||
      edge.ownerKey === filters.key ||
      edge.providerName === filters.key ||
      edge.providerRawName === filters.key ||
      edge.dependencyKey === filters.key) &&
    (filters.resourceKind === undefined ||
      edge.resourceKind === filters.resourceKind) &&
    (filters.query === undefined ||
      [
        fromNode?.kind,
        fromNode?.summary,
        toNode?.kind,
        toNode?.summary,
        edge.edgeKind,
        edge.layer,
        edge.role,
        edge.fromName,
        edge.toName,
        edge.routeKind,
        edge.ownerKey,
        edge.providerName,
        edge.providerRawName,
        edge.dependencyKey,
        edge.dependencyAccess,
        edge.dependencyPolicy,
        edge.dependencyCertainty,
        edge.resourceKind,
        edge.corridor,
        edge.compilerProducerName,
        edge.instructionName,
        edge.compilerMechanism,
        edge.summary,
        ...(edge.controlPath ?? []),
        ...(edge.lanes ?? []),
        ...(edge.syntaxProductKinds ?? []),
        ...(edge.instructionNames ?? []),
        ...(edge.bindingNames ?? []),
        ...(edge.instantiationKinds ?? []),
        ...(edge.materializationSiteKinds ?? []),
        ...(edge.materializationPhases ?? []),
        ...(edge.openReasons ?? []),
      ].some(
        (value) =>
          typeof value === "string" && value.includes(filters.query!),
      ))
  );
}

function admissionFlowNodeId(
  kind: FrameworkAdmissionFlowNodeKind,
  packageId: string | undefined,
  name: string,
): string {
  return `framework-admission-flow:${kind}:${packageId ?? "repo"}:${name}`;
}

function compareAdmissionFlowNodes(
  left: FrameworkAdmissionFlowNodeRow,
  right: FrameworkAdmissionFlowNodeRow,
): number {
  return (
    left.kind.localeCompare(right.kind) ||
    left.name.localeCompare(right.name) ||
    (left.packageId ?? "").localeCompare(right.packageId ?? "")
  );
}

function compareAdmissionFlowEdges(
  left: FrameworkAdmissionFlowEdgeRow,
  right: FrameworkAdmissionFlowEdgeRow,
): number {
  return (
    left.layer.localeCompare(right.layer) ||
    left.edgeKind.localeCompare(right.edgeKind) ||
    left.fromName.localeCompare(right.fromName) ||
    left.toName.localeCompare(right.toName) ||
    left.id.localeCompare(right.id)
  );
}
