import ts from "typescript";

import {
  readEvaluationEffectTrace,
  sourceRangeForEvaluationEffect,
  EvaluationEffectCertainty,
  type EvaluationInvocationEffect,
} from "../../evaluation/index.js";
import { readFrameworkDiIndex } from "../../framework/di-index.js";
import {
  readFrameworkConfigurationDiWorld,
  type FrameworkDiDependencyAccess,
  type FrameworkDiDependencyRow,
  type FrameworkDiResolverSlot,
  type FrameworkDiValueRef,
  type FrameworkDiWorld,
} from "../../framework/di-world.js";
import {
  FrameworkMaterializationProviderIdentity,
  FrameworkMaterializationProviderIdentityKind,
  FrameworkMaterializationRouteDescriptor,
  type FrameworkMaterializationRouteKind,
} from "../../framework/materialization.js";
import {
  FrameworkDiResolverStrategy,
  FrameworkRelationshipClosure,
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipRelation,
  FrameworkRelationshipMechanism,
  type FrameworkRelationshipAtom,
  type FrameworkRelationshipEndpoint,
} from "../../framework/relationships.js";
import {
  SourceProjectKeyedMemo,
  sourceRangeFromFileSpan,
  sourceSelectorForRange,
  type SourceProject,
  type TypeScriptCallSiteEntry,
  type TypeScriptExpressionFact,
} from "../../source/index.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
  type Basis,
} from "../basis.js";
import {
  ContinuationKind,
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import {
  EvidenceConfidence,
  EvidenceKind,
  EvidenceRole,
  OpenSeamKind,
  type Evidence,
  type OpenSeam,
} from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import type { SourceRange } from "../locus.js";
import {
  evidenceLimit,
  pageOffset,
  rowLimit,
} from "../paging.js";
import {
  NavigationPlane,
  NavigationRelation,
} from "../navigation.js";
import {
  readFrameworkResourceInstantiationRows,
  type FrameworkResourceInstantiationRow,
} from "./framework-resource-materialization.js";
import {
  FrameworkRowContinuationBuilder,
  nextPageContinuation,
  projectionContinuation,
} from "./framework-continuation-core.js";
import { PagedRowFamily } from "../paged-row-family.js";
import {
  countBy,
  route,
} from "./framework-support.js";
import { stringFiltersFromRecord } from "./lens-filter-utils.js";

const CHECKER_PROJECTION_BASIS = [BasisKind.TypeScriptChecker] as const;

/** Low-level construction-site class within Aurelia's DI materialization path. */
export const enum FrameworkMaterializationConstructionSiteKind {
  /** A resolver/factory invokes Factory.construct for the key route. */
  FactoryEntry = "factory-entry",
  /** Factory.construct directly calls new on the captured provider type. */
  ConstructorCall = "constructor-call",
}

/** Container access kind observed inside a DI callback provider. */
export const enum FrameworkMaterializationDependencyAccess {
  /** Callback checks whether the container/requestor has a key. */
  Has = "has",
  /** Callback resolves one key. */
  Get = "get",
  /** Callback resolves all registrations for one key. */
  GetAll = "get-all",
  /** Callback asks for the resolver behind one key. */
  GetResolver = "get-resolver",
  /** Callback performs Aurelia resource lookup. */
  Find = "find",
  /** Callback asks the container to construct/invoke a type. */
  Invoke = "invoke",
}

/** Execution policy for a callback dependency edge. */
export const enum FrameworkMaterializationDependencyPolicy {
  /** Dependency read is in straight-line callback code. */
  Direct = "direct",
  /** Dependency read is behind a positive branch/condition. */
  Guarded = "guarded",
  /** Dependency read is behind a negative branch/fallback path. */
  Fallback = "fallback",
  /** Dependency read is inside loop-like or synchronous collection-callback flow. */
  Repeated = "repeated",
  /** Dependency read is inside a callback whose invocation is deferred by the callee. */
  Deferred = "deferred",
}

const constructionSiteKindByRelation =
  new Map<FrameworkRelationshipRelation, FrameworkMaterializationConstructionSiteKind>([
    [
      FrameworkRelationshipRelation.MaterializesKey,
      FrameworkMaterializationConstructionSiteKind.FactoryEntry,
    ],
  ]);

const dependencyAccessByDiWorldAccess =
  new Map<FrameworkDiDependencyAccess, FrameworkMaterializationDependencyAccess>([
    ["get", FrameworkMaterializationDependencyAccess.Get],
    ["get-all", FrameworkMaterializationDependencyAccess.GetAll],
    ["get-resolver", FrameworkMaterializationDependencyAccess.GetResolver],
    ["has", FrameworkMaterializationDependencyAccess.Has],
    ["find", FrameworkMaterializationDependencyAccess.Find],
    ["invoke", FrameworkMaterializationDependencyAccess.Invoke],
    ["resolve", FrameworkMaterializationDependencyAccess.Get],
  ]);

const endpointKindByDiWorldValueKind = new Map<
  FrameworkDiValueRef["kind"],
  FrameworkRelationshipEndpointKind
>([
  ["interface", FrameworkRelationshipEndpointKind.DiKey],
  ["class", FrameworkRelationshipEndpointKind.Symbol],
  ["function", FrameworkRelationshipEndpointKind.Symbol],
  ["class-expression", FrameworkRelationshipEndpointKind.Expression],
  ["function-expression", FrameworkRelationshipEndpointKind.Expression],
  ["object", FrameworkRelationshipEndpointKind.Expression],
  ["value", FrameworkRelationshipEndpointKind.Expression],
  ["resource", FrameworkRelationshipEndpointKind.Resource],
  ["registry", FrameworkRelationshipEndpointKind.RegistryExport],
  ["unknown", FrameworkRelationshipEndpointKind.Unknown],
]);

interface DependencyPolicyRule {
  readonly policy: FrameworkMaterializationDependencyPolicy;
  readonly matches: (effect: EvaluationInvocationEffect) => boolean;
}

const dependencyPolicyRules: readonly DependencyPolicyRule[] = [
  {
    policy: FrameworkMaterializationDependencyPolicy.Deferred,
    matches: isDeferredDependencyEffect,
  },
  {
    policy: FrameworkMaterializationDependencyPolicy.Repeated,
    matches: isRepeatedDependencyEffect,
  },
  {
    policy: FrameworkMaterializationDependencyPolicy.Fallback,
    matches: isFallbackDependencyEffect,
  },
  {
    policy: FrameworkMaterializationDependencyPolicy.Guarded,
    matches: isGuardedDependencyEffect,
  },
];

/** Dependency edge observed inside a materialization route callback provider. */
export interface FrameworkMaterializationDependencyRow {
  /** Stable dependency id. */
  readonly id: string;
  /** Owning materialization route id. */
  readonly routeId: string;
  /** Aurelia framework package that owns the callback provider source. */
  readonly packageId: string;
  /** Package name that owns the callback provider source. */
  readonly packageName: string;
  /** DI key whose provider callback contains this dependency. */
  readonly key: string;
  /** Container dependency key expression text or symbol name. */
  readonly dependencyKey: string;
  /** Container access performed by the callback provider. */
  readonly access: FrameworkMaterializationDependencyAccess;
  /** Policy describing how this dependency read is reached inside the callback provider. */
  readonly policy: FrameworkMaterializationDependencyPolicy;
  /** Static execution certainty from the evaluator effect trace. */
  readonly certainty: EvaluationEffectCertainty;
  /** Control-path labels that led to this dependency. */
  readonly controlPath: readonly string[];
  /** Exact call-site row for the dependency access. */
  readonly callSite: TypeScriptCallSiteEntry;
  /** Receiver expression for the container access. */
  readonly receiver: TypeScriptExpressionFact | null;
  /** Container key argument expression. */
  readonly argument: TypeScriptExpressionFact;
  /** Exact dependency call source. */
  readonly source: SourceRange;
  /** Exact dependency key argument source. */
  readonly argumentSource: SourceRange;
  /** Human-facing dependency summary. */
  readonly summary: string;
}

/** Graph-native materialization relationship row. */
export interface FrameworkMaterializationRelationshipRow {
  /** Stable relationship id. */
  readonly id: string;
  /** Owning materialization route id. */
  readonly routeId: string;
  /** Aurelia framework package that owns the source evidence. */
  readonly packageId: string;
  /** Package name that owns the source evidence. */
  readonly packageName: string;
  /** Shared framework relationship relation. */
  readonly relation: FrameworkRelationshipRelation;
  /** DI key whose materialization route owns the relationship. */
  readonly key: string;
  /** Route kind for the owning materialization route. */
  readonly routeKind: FrameworkMaterializationRouteKind;
  /** Resolver strategy observed at the provider site. */
  readonly strategy?: FrameworkDiResolverStrategy;
  /** Relationship origin. */
  readonly from: FrameworkRelationshipEndpoint;
  /** Relationship target. */
  readonly to: FrameworkRelationshipEndpoint;
  /** Provider identity when this relationship targets a materialization provider. */
  readonly providerIdentity?: FrameworkMaterializationProviderIdentity;
  /** Container access kind when this is a dependency relationship. */
  readonly access?: FrameworkMaterializationDependencyAccess;
  /** Dependency policy when this is a dependency relationship. */
  readonly policy?: FrameworkMaterializationDependencyPolicy;
  /** Evaluator certainty when this is a dependency relationship. */
  readonly certainty?: EvaluationEffectCertainty;
  /** Control-path labels when this is a dependency relationship. */
  readonly controlPath?: readonly string[];
  /** Owning dependency id when this relationship came from a dependency row. */
  readonly dependencyId?: string;
  /** Exact source evidence for the relationship. */
  readonly source: SourceRange;
  /** Human-facing relationship summary. */
  readonly summary: string;
}

/** Compact low-level framework site involved in route instantiation. */
export interface FrameworkMaterializationConstructionSiteRow {
  /** DI relationship atom id that produced this construction site. */
  readonly atomId: string;
  /** Construction-site class within the materialization path. */
  readonly siteKind: FrameworkMaterializationConstructionSiteKind;
  /** Construction or factory relation observed in kernel source. */
  readonly relation: FrameworkRelationshipRelation;
  /** Source mechanism observed at the construction site. */
  readonly mechanism: FrameworkRelationshipMechanism;
  /** Resolver strategy when the kernel switch/case exposes one. */
  readonly strategy?: FrameworkDiResolverStrategy;
  /** Source-side construction owner. */
  readonly from: FrameworkRelationshipEndpoint;
  /** Constructed target or factory method endpoint. */
  readonly to: FrameworkRelationshipEndpoint;
  /** Exact source evidence for the construction site. */
  readonly source: SourceRange;
  /** Human-facing construction-site summary. */
  readonly summary: string;
}

/** A key-provider route reframed as the runtime-existence site for a DI key. */
export interface FrameworkMaterializationInstantiationRow {
  /** Stable instantiation id. */
  readonly id: string;
  /** Owning materialization route id. */
  readonly routeId: string;
  /** Aurelia framework package that owns the provider source. */
  readonly packageId: string;
  /** Package name that owns the provider source. */
  readonly packageName: string;
  /** DI key expression or InterfaceSymbol name. */
  readonly key: string;
  /** Route class that produced this instantiation row. */
  readonly routeKind: FrameworkMaterializationRouteKind;
  /** Resolver strategy observed at the provider site. */
  readonly strategy?: FrameworkDiResolverStrategy;
  /** Source-backed key endpoint from the DI provider atom. */
  readonly keyEndpoint: FrameworkRelationshipEndpoint;
  /** Provider or alias target endpoint. */
  readonly provider: FrameworkRelationshipEndpoint;
  /** Source-backed provider identity used for graph nodes and concise summaries. */
  readonly providerIdentity: FrameworkMaterializationProviderIdentity;
  /** TypeChecker display type for the provider expression when available. */
  readonly providerType?: string;
  /** Provider source when the provider itself is source-backed. */
  readonly providerSource?: SourceRange;
  /** Relationship atom that seeded this route. */
  readonly relationshipAtomId: string;
  /** Closure class for this instantiation claim. */
  readonly closure: FrameworkRelationshipClosure;
  /** Low-level framework construction sites involved in this route class. */
  readonly constructionSites: readonly FrameworkMaterializationConstructionSiteRow[];
  /** Exact provider-route source evidence. */
  readonly source: SourceRange;
  /** Human-facing instantiation summary. */
  readonly summary: string;
}

/** One route from a DI key/provider atom toward materialization. */
export interface FrameworkMaterializationRouteRow {
  /** Stable route id. */
  readonly id: string;
  /** Aurelia framework package that owns the source evidence. */
  readonly packageId: string;
  /** Package name that owns the source evidence. */
  readonly packageName: string;
  /** DI key expression or InterfaceSymbol name being provided. */
  readonly key: string;
  /** Source-backed key endpoint from the DI provider atom. */
  readonly keyEndpoint: FrameworkRelationshipEndpoint;
  /** Resolver strategy observed at the provider site. */
  readonly strategy?: FrameworkDiResolverStrategy;
  /** Materialization route class. */
  readonly routeKind: FrameworkMaterializationRouteKind;
  /** Provider or alias target endpoint. */
  readonly provider: FrameworkRelationshipEndpoint;
  /** Source-backed provider identity used for graph nodes and concise summaries. */
  readonly providerIdentity: FrameworkMaterializationProviderIdentity;
  /** TypeChecker display type for the provider expression when available. */
  readonly providerType?: string;
  /** Relationship atom that seeded this route. */
  readonly relationshipAtomId: string;
  /** Closure class for this materialization route. */
  readonly closure: FrameworkRelationshipClosure;
  /** Exact provider relationship source. */
  readonly source: SourceRange;
  /** Exact provider expression source when available. */
  readonly providerSource?: SourceRange;
  /** Container dependencies observed inside a callback provider. */
  readonly dependencies: readonly FrameworkMaterializationDependencyRow[];
  /** Human-facing route summary. */
  readonly summary: string;
}

/** Value returned by framework.materialization. */
export interface FrameworkMaterializationValue {
  /** Number of routes after filtering. */
  readonly routeCount: number;
  /** Route counts grouped by route kind. */
  readonly routeKinds: Readonly<Record<string, number>>;
  /** Route counts grouped by resolver strategy. */
  readonly strategies: Readonly<Record<string, number>>;
  /** Number of callback dependency rows after filtering. */
  readonly dependencyCount: number;
  /** Dependency counts grouped by container access kind. */
  readonly dependencyAccesses: Readonly<Record<string, number>>;
  /** Dependency counts grouped by materialization dependency policy. */
  readonly dependencyPolicies: Readonly<Record<string, number>>;
  /** Number of materialization graph relationships after filtering. */
  readonly relationshipCount: number;
  /** Relationship counts grouped by materialization relation. */
  readonly relationshipRelations: Readonly<Record<string, number>>;
  /** Number of key instantiation rows after filtering. */
  readonly instantiationCount: number;
  /** Number of resource instantiation rows after filtering. */
  readonly resourceInstantiationCount: number;
  /** Resource instantiation counts grouped by resource runtime-existence class. */
  readonly resourceInstantiationKinds: Readonly<Record<string, number>>;
  /** Route rows returned by route/fact/evidence projections. */
  readonly routes?: readonly FrameworkMaterializationRouteRow[];
  /** Dependency rows returned by dependency projections. */
  readonly dependencies?: readonly FrameworkMaterializationDependencyRow[];
  /** Graph-native materialization relationships returned by relationship projections. */
  readonly relationships?: readonly FrameworkMaterializationRelationshipRow[];
  /** Key instantiation rows returned by instantiation projections. */
  readonly instantiations?: readonly FrameworkMaterializationInstantiationRow[];
  /** Resource instantiation rows returned by resource-instantiation projections. */
  readonly resourceInstantiations?: readonly FrameworkResourceInstantiationRow[];
}

export interface FrameworkMaterializationFilters {
  readonly packageId?: string;
  readonly key?: string;
  readonly strategy?: string;
  readonly routeKind?: string;
  readonly relation?: string;
  readonly resourceKind?: string;
  readonly resourceName?: string;
  readonly resourceSiteKind?: string;
  readonly dependencyKey?: string;
  readonly dependencyAccess?: string;
  readonly dependencyPolicy?: string;
  readonly certainty?: string;
  readonly query?: string;
}

/** Fully derived in-memory materialization rows for one filter basis. */
export interface FrameworkMaterializationIndex {
  /** DI provider routes after route-level filters. */
  readonly routes: readonly FrameworkMaterializationRouteRow[];
  /** Callback dependency rows after dependency-level filters. */
  readonly dependencies: readonly FrameworkMaterializationDependencyRow[];
  /** Graph-native materialization relationships after relationship-level filters. */
  readonly relationships: readonly FrameworkMaterializationRelationshipRow[];
  /** DI key runtime-existence rows after instantiation-level filters. */
  readonly instantiations: readonly FrameworkMaterializationInstantiationRow[];
  /** Resource runtime-existence rows after resource-level filters. */
  readonly resourceInstantiations: readonly FrameworkResourceInstantiationRow[];
}

const materializationDependenciesByRoute = new SourceProjectKeyedMemo<
  string,
  readonly FrameworkMaterializationDependencyRow[]
>();

const MATERIALIZATION_DEPENDENCY_ROW_FAMILY =
  new PagedRowFamily<FrameworkMaterializationDependencyRow>({
    id: "framework.materialization:dependencies",
    rowLabel: "framework materialization dependency row(s)",
    evidenceForRow: evidenceForMaterializationDependency,
    continuationsForPage: dependencyContinuations,
  });

const MATERIALIZATION_RELATIONSHIP_ROW_FAMILY =
  new PagedRowFamily<FrameworkMaterializationRelationshipRow>({
    id: "framework.materialization:relationships",
    rowLabel: "framework materialization relationship row(s)",
    evidenceForRow: frameworkMaterializationEvidenceForRelationship,
    continuationsForPage: materializationRelationshipContinuations,
  });

const MATERIALIZATION_INSTANTIATION_ROW_FAMILY =
  new PagedRowFamily<FrameworkMaterializationInstantiationRow>({
    id: "framework.materialization:instantiations",
    rowLabel: "framework key instantiation row(s)",
    evidenceForRow: evidenceForInstantiation,
    continuationsForPage: instantiationContinuations,
  });

const RESOURCE_INSTANTIATION_ROW_FAMILY =
  new PagedRowFamily<FrameworkResourceInstantiationRow>({
    id: "framework.materialization:resource-instantiations",
    rowLabel: "framework resource instantiation row(s)",
    evidenceForRow: evidenceForResourceInstantiation,
    continuationsForPage: resourceInstantiationContinuations,
  });

const MATERIALIZATION_ROUTE_ROW_FAMILY =
  new PagedRowFamily<FrameworkMaterializationRouteRow>({
    id: "framework.materialization:routes",
    rowLabel: "framework materialization route(s)",
    evidenceForRow: evidenceForRoute,
    continuationsForPage: routeContinuations,
  });

/** Read materialization rows as a reusable index without projecting an answer. */
export function readFrameworkMaterializationIndex(
  /** Hot source project owned by the daemon. */
  sourceProject: SourceProject,
  /** Optional materialization filters. */
  filters: FrameworkMaterializationFilters = {},
): FrameworkMaterializationIndex {
  const diIndex = readFrameworkDiIndex(sourceProject);
  const world = readFrameworkConfigurationDiWorld(sourceProject);
  const routes = uniqueMaterializationRoutes([
    ...diIndex.relationships
      .filter(isProviderSeedAtom)
      .filter((row) => !isParameterizedProviderSeed(sourceProject, row))
      .map((row) => routeForProviderSeed(sourceProject, row)),
    ...world.resolverSlots
      .filter((slot) => slot.role !== "resource-type-factory")
      .map((slot) => routeForConfigurationWorldSlot(sourceProject, world, slot))
      .filter((row): row is FrameworkMaterializationRouteRow => row !== null),
  ]).filter((row) => routeMatches(row, filters));
  const constructionAtoms = diIndex.relationships.filter(isConstructionSiteAtom);
  const dependencies = routes
    .flatMap((row) => row.dependencies)
    .filter((row) => dependencyMatches(row, filters));
  const relationships = routes
    .flatMap(relationshipsForRoute)
    .filter((row) => materializationRelationshipMatches(row, filters));
  const instantiations = routes
    .map((row) => instantiationForRoute(row, constructionAtoms))
    .filter((row) => instantiationMatches(row, filters));
  const resourceInstantiations = readFrameworkResourceInstantiationRows(
    sourceProject,
    filters,
  );
  return {
    routes,
    dependencies,
    relationships,
    instantiations,
    resourceInstantiations,
  };
}

/** Answer framework.materialization inquiries from exact DI provider seeds. */
export function answerFrameworkMaterialization(
  /** Inquiry being answered. */
  inquiry: Inquiry,
  /** Hot source project owned by the daemon. */
  sourceProject: SourceProject,
): Answer<FrameworkMaterializationValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = frameworkMaterializationFiltersFromInquiry(inquiry);
  const index = readFrameworkMaterializationIndex(sourceProject, filters);
  const {
    routes,
    dependencies,
    relationships,
    instantiations,
    resourceInstantiations,
  } = index;
  const limit = rowLimit(inquiry);
  const offset = pageOffset(inquiry);
  const basis = [frameworkMaterializationBasis(sourceProject)];

  if (projection === "dependencies") {
    return MATERIALIZATION_DEPENDENCY_ROW_FAMILY.answer({
      inquiry,
      rows: dependencies,
      limit,
      offset,
      basis,
      value: (page) => ({
        ...materializationCounts(index),
        dependencies: page.rows,
      }),
    });
  }

  if (projection === "relationships") {
    return MATERIALIZATION_RELATIONSHIP_ROW_FAMILY.answer({
      inquiry,
      rows: relationships,
      limit,
      offset,
      basis,
      value: (page) => ({
        ...materializationCounts(index),
        relationships: page.rows,
      }),
    });
  }

  if (projection === "instantiations") {
    return MATERIALIZATION_INSTANTIATION_ROW_FAMILY.answer({
      inquiry,
      rows: instantiations,
      limit,
      offset,
      basis,
      value: (page) => ({
        ...materializationCounts(index),
        instantiations: page.rows,
      }),
    });
  }

  if (projection === "resource-instantiations") {
    return RESOURCE_INSTANTIATION_ROW_FAMILY.answer({
      inquiry,
      rows: resourceInstantiations,
      limit,
      offset,
      basis,
      value: (page) => ({
        ...materializationCounts(index),
        resourceInstantiations: page.rows,
      }),
    });
  }

  if (
    projection === "routes" ||
    projection === "facts" ||
    projection === "evidence"
  ) {
    return MATERIALIZATION_ROUTE_ROW_FAMILY.answer({
      inquiry,
      rows: routes,
      limit,
      offset,
      basis,
      value: (page) => ({
        ...materializationCounts(index),
        routes: page.rows,
      }),
      openSeams: (page, evidence) => openSeamsForRoutes(page.rows, evidence),
      outcome: (page, openSeams) =>
        page.rows.length === 0
          ? OutcomeKind.Miss
          : openSeams.length > 0
          ? OutcomeKind.Partial
          : OutcomeKind.Hit,
    });
  }

  const evidence = routes
    .slice(0, evidenceLimit(inquiry))
    .map(evidenceForRoute);
  const openSeams = openSeamsForRoutes(
    routes.slice(0, evidence.length),
    evidence,
  );
  return createAnswer(
    inquiry,
    routes.length === 0
      ? OutcomeKind.Miss
      : openSeams.length > 0
      ? OutcomeKind.Partial
      : OutcomeKind.Hit,
    `Framework materialization has ${routes.length} DI provider route(s) and ${resourceInstantiations.length} resource instantiation row(s).`,
    {
      value: materializationCounts(index),
      basis,
      evidence,
      openSeams,
      continuations: materializationSummaryContinuations(inquiry),
    },
  );
}

function materializationCounts(
  index: FrameworkMaterializationIndex,
): FrameworkMaterializationValue {
  const {
    routes,
    dependencies,
    relationships,
    instantiations,
    resourceInstantiations,
  } = index;
  return {
    routeCount: routes.length,
    routeKinds: countBy(routes, (row) => row.routeKind),
    strategies: countBy(routes, (row) => row.strategy ?? "unknown"),
    dependencyCount: dependencies.length,
    dependencyAccesses: countBy(dependencies, (row) => row.access),
    dependencyPolicies: countBy(dependencies, (row) => row.policy),
    relationshipCount: relationships.length,
    relationshipRelations: countBy(relationships, (row) => row.relation),
    instantiationCount: instantiations.length,
    resourceInstantiationCount: resourceInstantiations.length,
    resourceInstantiationKinds: countBy(
      resourceInstantiations,
      (row) => row.instantiationKind,
    ),
  };
}

function isProviderSeedAtom(row: FrameworkRelationshipAtom): boolean {
  return (
    row.relation === FrameworkRelationshipRelation.ProvidesKey ||
    (row.relation === FrameworkRelationshipRelation.AliasesKey &&
      row.to.kind === FrameworkRelationshipEndpointKind.Expression)
  );
}

function isParameterizedProviderSeed(
  sourceProject: SourceProject,
  row: FrameworkRelationshipAtom,
): boolean {
  const source = row.to.source;
  if (source === undefined) {
    return false;
  }
  const sourceFile = sourceProject.readSourceFile(source.filePath);
  if (sourceFile === null) {
    return false;
  }
  const position = sourceFile.getPositionOfLineAndCharacter(
    source.start.line,
    source.start.character,
  );
  let parameterBacked = false;
  const visit = (node: ts.Node): void => {
    if (parameterBacked) {
      return;
    }
    if (node.getStart(sourceFile) === position) {
      const symbol = sourceProject.checker.getSymbolAtLocation(node);
      const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
      parameterBacked = declaration !== undefined && ts.isParameter(declaration);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return parameterBacked;
}

function isConstructionSiteAtom(
  row: FrameworkRelationshipAtom,
): boolean {
  return (
    row.relation === FrameworkRelationshipRelation.MaterializesKey ||
    row.relation === FrameworkRelationshipRelation.ConstructsInstance
  );
}

function routeForProviderSeed(
  sourceProject: SourceProject,
  row: FrameworkRelationshipAtom,
): FrameworkMaterializationRouteRow {
  const route = FrameworkMaterializationRouteDescriptor.forProviderSeed(row);
  const id = `framework-materialization:${row.id}`;
  const key = row.key ?? row.from.name;
  const providerIdentity = FrameworkMaterializationProviderIdentity.forRoute(
    key,
    route.routeKind,
    row.to,
  );
  const dependencies = [
    ...(route.tracesCallbackDependencies
      ? dependencyRowsForProviderSeed(sourceProject, row, id)
      : []),
    ...dependencyRowsFromConfigurationDiWorld(sourceProject, row, id),
  ];
  const result = {
    id,
    packageId: row.packageId,
    packageName: row.packageName,
    key,
    keyEndpoint: row.from,
    routeKind: route.routeKind,
    provider: row.to,
    providerIdentity,
    relationshipAtomId: row.id,
    closure: route.routeClosure(row.closure),
    source: row.source,
    dependencies,
    summary: route.summarizeRoute(
      key,
      providerIdentity.name,
      row.strategy,
    ),
  };
  if (row.strategy !== undefined) {
    Object.assign(result, { strategy: row.strategy });
  }
  if (row.to.expression?.type !== undefined) {
    Object.assign(result, { providerType: row.to.expression.type });
  }
  if (row.to.source !== undefined) {
    Object.assign(result, { providerSource: row.to.source });
  }
  return result;
}

function routeForConfigurationWorldSlot(
  sourceProject: SourceProject,
  world: FrameworkDiWorld,
  slot: FrameworkDiResolverSlot,
): FrameworkMaterializationRouteRow | null {
  const source = slot.source ?? slot.provider.source ?? slot.key.source;
  if (source === undefined) {
    return null;
  }
  const packageInfo = packageInfoForSource(sourceProject, source);
  const relation =
    slot.strategy === FrameworkDiResolverStrategy.Alias
      ? FrameworkRelationshipRelation.AliasesKey
      : FrameworkRelationshipRelation.ProvidesKey;
  const route = FrameworkMaterializationRouteDescriptor.forProviderSeed({
    relation,
    strategy: slot.strategy,
    closure: slot.closure,
  });
  const id = `framework-materialization:${slot.id}`;
  const providerEndpoint = endpointForDiWorldValueRef(slot.provider, packageInfo);
  const providerIdentity = FrameworkMaterializationProviderIdentity.forRoute(
    slot.key.name,
    route.routeKind,
    providerEndpoint,
    providerExpressionLabelForDiWorldValueRef(slot.provider),
  );
  const dependencies = world
    .readDependenciesForRoute(slot.key.name, slot.provider.name)
    .map((dependency, index) =>
      dependencyRowForDiWorldDependency(
        sourceProject,
        id,
        slot.key.name,
        dependency,
        index,
      ),
    )
    .filter(
      (dependency): dependency is FrameworkMaterializationDependencyRow =>
        dependency !== null,
    );
  return {
    id,
    packageId: packageInfo.packageId,
    packageName: packageInfo.packageName,
    key: slot.key.name,
    keyEndpoint: endpointForDiWorldValueRef(slot.key, packageInfo),
    strategy: slot.strategy,
    routeKind: route.routeKind,
    provider: providerEndpoint,
    providerIdentity,
    relationshipAtomId: slot.id,
    closure: route.routeClosure(slot.closure),
    source,
    providerSource: slot.provider.source,
    dependencies,
    summary: route.summarizeRoute(
      slot.key.name,
      providerIdentity.name,
      slot.strategy,
    ),
  };
}

function dependencyRowsFromConfigurationDiWorld(
  sourceProject: SourceProject,
  row: FrameworkRelationshipAtom,
  routeId: string,
): readonly FrameworkMaterializationDependencyRow[] {
  const key = row.key ?? row.from.name;
  return readFrameworkConfigurationDiWorld(sourceProject)
    .readDependenciesForRoute(key, row.to.name)
    .map((dependency, index) =>
      dependencyRowForDiWorldDependency(
        sourceProject,
        routeId,
        key,
        dependency,
        index,
      ),
    )
    .filter(
      (dependency): dependency is FrameworkMaterializationDependencyRow =>
        dependency !== null,
    );
}

function dependencyRowForDiWorldDependency(
  sourceProject: SourceProject,
  routeId: string,
  key: string,
  dependency: FrameworkDiDependencyRow,
  index: number,
): FrameworkMaterializationDependencyRow | null {
  const access = dependencyAccessForDiWorldAccess(dependency.access);
  const source = dependency.source ?? dependency.argumentSource ?? dependency.ownerProvider.source;
  const argumentSource = dependency.argumentSource ?? source;
  if (
    dependency.callSite === undefined ||
    dependency.argument === undefined ||
    source === undefined ||
    argumentSource === undefined
  ) {
    return null;
  }
  const packageDefinition = sourceProject.packageForFileName(source.filePath);
  return {
    id: `${routeId}:di-world-dependency:${index}:${access}:${dependency.dependencyKey.name}`,
    routeId,
    packageId: packageDefinition?.id ?? "framework",
    packageName: packageDefinition?.packageName ?? "framework",
    key,
    dependencyKey: dependency.dependencyKey.name,
    access,
    policy: FrameworkMaterializationDependencyPolicy.Direct,
    certainty: EvaluationEffectCertainty.Unconditional,
    controlPath: dependency.path,
    callSite: dependency.callSite,
    receiver: null,
    argument: dependency.argument,
    source,
    argumentSource,
    summary: `${key} depends on ${dependency.dependencyKey.name} through DI world ${dependency.access}.`,
  };
}

function endpointForDiWorldValueRef(
  ref: FrameworkDiValueRef,
  packageInfo: MaterializationPackageInfo,
): FrameworkRelationshipEndpoint {
  return {
    kind: endpointKindForDiWorldValueRef(ref),
    name: ref.name,
    packageId: packageInfo.packageId,
    packageName: packageInfo.packageName,
    source: ref.source,
  };
}

function endpointKindForDiWorldValueRef(
  ref: FrameworkDiValueRef,
): FrameworkRelationshipEndpointKind {
  return endpointKindByDiWorldValueKind.get(ref.kind)!;
}

function providerExpressionLabelForDiWorldValueRef(
  ref: FrameworkDiValueRef,
): string | undefined {
  switch (ref.kind) {
    case "class-expression":
      return "class";
    case "function-expression":
      return "function";
    case "object":
      return "value";
    default:
      return undefined;
  }
}

interface MaterializationPackageInfo {
  readonly packageId: string;
  readonly packageName: string;
}

function packageInfoForSource(
  sourceProject: SourceProject,
  source: SourceRange,
): MaterializationPackageInfo {
  const sourceFile = sourceProject.readSourceFile(source.filePath);
  const packageDefinition =
    sourceFile === null
      ? sourceProject.packageForFileName(source.filePath)
      : sourceProject.packageForFileName(sourceFile.fileName);
  return {
    packageId: packageDefinition?.id ?? "framework",
    packageName: packageDefinition?.packageName ?? "framework",
  };
}

function uniqueMaterializationRoutes(
  rows: readonly FrameworkMaterializationRouteRow[],
): readonly FrameworkMaterializationRouteRow[] {
  const seen = new Set<string>();
  const unique: FrameworkMaterializationRouteRow[] = [];
  for (const row of rows) {
    const providerKey =
      row.providerIdentity.kind === FrameworkMaterializationProviderIdentityKind.Named
        ? row.providerIdentity.name
        : row.providerIdentity.id;
    const key = `${row.key}:${providerKey}:${row.strategy ?? "unknown"}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(row);
  }
  return unique;
}

function dependencyAccessForDiWorldAccess(
  access: FrameworkDiDependencyAccess,
): FrameworkMaterializationDependencyAccess {
  return dependencyAccessByDiWorldAccess.get(access)!;
}

function relationshipsForRoute(
  row: FrameworkMaterializationRouteRow,
): readonly FrameworkMaterializationRelationshipRow[] {
  return [
    materializesThroughRelationship(row),
    ...instantiatesKeyRelationships(row),
    ...row.dependencies.map((dependency) =>
      dependsOnKeyRelationship(row, dependency),
    ),
  ];
}

function materializesThroughRelationship(
  row: FrameworkMaterializationRouteRow,
): FrameworkMaterializationRelationshipRow {
  return {
    id: `${row.id}:relationship:materializes-through`,
    routeId: row.id,
    packageId: row.packageId,
    packageName: row.packageName,
    relation: FrameworkRelationshipRelation.MaterializesThrough,
    key: row.key,
    routeKind: row.routeKind,
    strategy: row.strategy,
    from: row.keyEndpoint,
    to: row.provider,
    providerIdentity: row.providerIdentity,
    source: row.source,
    summary: `${row.key} materializes through ${row.providerIdentity.name}.`,
  };
}

function instantiatesKeyRelationships(
  row: FrameworkMaterializationRouteRow,
): readonly FrameworkMaterializationRelationshipRow[] {
  const route = FrameworkMaterializationRouteDescriptor.forRouteKind(
    row.routeKind,
  );
  if (!route.emitsInstantiationRelationship) {
    return [];
  }
  return [
    {
      id: `${row.id}:relationship:instantiates-key`,
      routeId: row.id,
      packageId: row.packageId,
      packageName: row.packageName,
      relation: FrameworkRelationshipRelation.InstantiatesKey,
      key: row.key,
      routeKind: row.routeKind,
      strategy: row.strategy,
      from: row.keyEndpoint,
      to: row.provider,
      providerIdentity: row.providerIdentity,
      source: row.providerSource ?? row.source,
      summary: `${row.key} can enter runtime existence through ${row.providerIdentity.name}.`,
    },
  ];
}

function instantiationForRoute(
  row: FrameworkMaterializationRouteRow,
  constructionAtoms: readonly FrameworkRelationshipAtom[],
): FrameworkMaterializationInstantiationRow {
  const constructionSites = constructionSitesForRoute(row, constructionAtoms);
  return {
    id: `${row.id}:instantiation`,
    routeId: row.id,
    packageId: row.packageId,
    packageName: row.packageName,
    key: row.key,
    routeKind: row.routeKind,
    strategy: row.strategy,
    keyEndpoint: row.keyEndpoint,
    provider: row.provider,
    providerIdentity: row.providerIdentity,
    providerType: row.providerType,
    providerSource: row.providerSource,
    relationshipAtomId: row.relationshipAtomId,
    closure: instantiationClosureForRoute(row, constructionSites),
    constructionSites,
    source: row.providerSource ?? row.source,
    summary: instantiationSummary(row, constructionSites),
  };
}

function constructionSitesForRoute(
  row: FrameworkMaterializationRouteRow,
  constructionAtoms: readonly FrameworkRelationshipAtom[],
): readonly FrameworkMaterializationConstructionSiteRow[] {
  const route = FrameworkMaterializationRouteDescriptor.forRouteKind(
    row.routeKind,
  );
  if (!route.usesFrameworkConstructionSites) {
    return [];
  }
  return constructionAtoms
    .filter(
      (atom) =>
        atom.strategy === undefined ||
        row.strategy === undefined ||
        atom.strategy === row.strategy,
    )
    .map((atom) => ({
      atomId: atom.id,
      siteKind: constructionSiteKindForAtom(atom),
      relation: atom.relation,
      mechanism: atom.mechanism,
      strategy: atom.strategy,
      from: atom.from,
      to: atom.to,
      source: atom.source,
      summary: atom.summary,
    }));
}

function constructionSiteKindForAtom(
  atom: FrameworkRelationshipAtom,
): FrameworkMaterializationConstructionSiteKind {
  return constructionSiteKindByRelation.get(atom.relation) ??
    FrameworkMaterializationConstructionSiteKind.ConstructorCall;
}

function instantiationClosureForRoute(
  row: FrameworkMaterializationRouteRow,
  constructionSites: readonly FrameworkMaterializationConstructionSiteRow[],
): FrameworkRelationshipClosure {
  return FrameworkMaterializationRouteDescriptor.forRouteKind(
    row.routeKind,
  ).instantiationClosure(row.closure, constructionSites.length);
}

function instantiationSummary(
  row: FrameworkMaterializationRouteRow,
  constructionSites: readonly FrameworkMaterializationConstructionSiteRow[],
): string {
  return FrameworkMaterializationRouteDescriptor.forRouteKind(
    row.routeKind,
  ).summarizeInstantiation(
    row.key,
    row.providerIdentity.name,
    constructionSites.length,
  );
}

function dependsOnKeyRelationship(
  route: FrameworkMaterializationRouteRow,
  dependency: FrameworkMaterializationDependencyRow,
): FrameworkMaterializationRelationshipRow {
  return {
    id: `${dependency.id}:relationship:depends-on-key`,
    routeId: route.id,
    packageId: dependency.packageId,
    packageName: dependency.packageName,
    relation: FrameworkRelationshipRelation.DependsOnKey,
    key: dependency.key,
    routeKind: route.routeKind,
    strategy: route.strategy,
    from: route.keyEndpoint,
    to: {
      kind: FrameworkRelationshipEndpointKind.DiKey,
      name: dependency.dependencyKey,
      packageId: dependency.packageId,
      packageName: dependency.packageName,
      source: dependency.argumentSource,
      expression: dependency.argument,
    },
    access: dependency.access,
    policy: dependency.policy,
    certainty: dependency.certainty,
    controlPath: dependency.controlPath,
    dependencyId: dependency.id,
    source: dependency.source,
    summary: `${dependency.key} depends on ${dependency.dependencyKey} through ${dependency.policy} callback ${dependency.access}.`,
  };
}

function dependencyRowsForProviderSeed(
  sourceProject: SourceProject,
  row: FrameworkRelationshipAtom,
  routeId: string,
): readonly FrameworkMaterializationDependencyRow[] {
  return materializationDependenciesByRoute.read(sourceProject, row.id, () =>
    dependencyRowsForProviderSeedUncached(sourceProject, row, routeId),
  );
}

function dependencyRowsForProviderSeedUncached(
  sourceProject: SourceProject,
  row: FrameworkRelationshipAtom,
  routeId: string,
): readonly FrameworkMaterializationDependencyRow[] {
  if (row.to.source === undefined) {
    return [];
  }
  const key = row.key ?? row.from.name;
  const read = readEvaluationEffectTrace(
    sourceProject,
    sourceSelectorForRange(row.to.source),
    {
      limit: 200,
      maxDepth: 120,
    },
  );
  return read.effects
    .map((effect) =>
      dependencyRowForEffect(
        routeId,
        row.packageId,
        row.packageName,
        key,
        effect,
      ),
    )
    .filter(
      (dependency): dependency is FrameworkMaterializationDependencyRow =>
        dependency !== null,
    );
}

function dependencyRowForEffect(
  routeId: string,
  packageId: string,
  packageName: string,
  key: string,
  effect: EvaluationInvocationEffect,
): FrameworkMaterializationDependencyRow | null {
  const access = dependencyAccessForEffect(effect);
  const firstArgument = effect.arguments[0];
  if (
    access === null ||
    firstArgument === undefined ||
    !isContainerReceiverEffect(effect)
  ) {
    return null;
  }
  const dependencyKey =
    firstArgument.expression.symbolName ?? firstArgument.expression.text;
  const policy = dependencyPolicyForEffect(effect);
  const source = sourceRangeForEvaluationEffect(effect);
  const argumentSource = sourceRangeFromFileSpan(
    effect.callSite.file.repoPath,
    firstArgument.expression.span,
  );
  return {
    id: `${routeId}:dependency:${effect.sequence}:${access}:${dependencyKey}`,
    routeId,
    packageId,
    packageName,
    key,
    dependencyKey,
    access,
    policy,
    certainty: effect.certainty,
    controlPath: effect.controlPath,
    callSite: effect.callSite,
    receiver: effect.receiver,
    argument: firstArgument.expression,
    source,
    argumentSource,
    summary: `${key} ${policy} callback ${access} dependency on ${dependencyKey}.`,
  };
}

function dependencyPolicyForEffect(
  effect: EvaluationInvocationEffect,
): FrameworkMaterializationDependencyPolicy {
  for (const rule of dependencyPolicyRules) {
    if (rule.matches(effect)) {
      return rule.policy;
    }
  }
  return FrameworkMaterializationDependencyPolicy.Direct;
}

function isDeferredDependencyEffect(effect: EvaluationInvocationEffect): boolean {
  return effect.certainty === "deferred" ||
    effect.controlPath.some((part) => /^callback:.+:\d+$/u.test(part));
}

function isRepeatedDependencyEffect(effect: EvaluationInvocationEffect): boolean {
  return effect.certainty === "repeated" ||
    effect.controlPath.some(isRepeatedControlPathPart);
}

function isRepeatedControlPathPart(part: string): boolean {
  return part === "for" ||
    part === "for-of" ||
    part === "loop" ||
    part === "callback:forEach" ||
    part === "callback:map" ||
    part === "callback:flatMap";
}

function isFallbackDependencyEffect(effect: EvaluationInvocationEffect): boolean {
  return effect.controlPath.some((part) =>
    part.endsWith(":else") || part.endsWith(":false")
  );
}

function isGuardedDependencyEffect(effect: EvaluationInvocationEffect): boolean {
  return effect.certainty === "potential" || effect.controlPath.length > 0;
}

function dependencyAccessForEffect(
  effect: EvaluationInvocationEffect,
): FrameworkMaterializationDependencyAccess | null {
  switch (effect.memberName) {
    case "has":
      return FrameworkMaterializationDependencyAccess.Has;
    case "get":
      return FrameworkMaterializationDependencyAccess.Get;
    case "getAll":
      return FrameworkMaterializationDependencyAccess.GetAll;
    case "getResolver":
      return FrameworkMaterializationDependencyAccess.GetResolver;
    case "find":
      return FrameworkMaterializationDependencyAccess.Find;
    case "invoke":
      return FrameworkMaterializationDependencyAccess.Invoke;
    default:
      return null;
  }
}

function isContainerReceiverEffect(
  effect: EvaluationInvocationEffect,
): boolean {
  const parameterIndex = effect.receiverBinding?.parameterIndex;
  return (
    parameterIndex === 0 ||
    parameterIndex === 1 ||
    effect.receiver?.type.includes("IContainer") === true ||
    effect.receiver?.apparentType.includes("IContainer") === true
  );
}

function frameworkMaterializationFiltersFromInquiry(
  inquiry: Inquiry,
): FrameworkMaterializationFilters {
  return {
    ...frameworkMaterializationFiltersFromRecord(inquiry.subject),
    ...frameworkMaterializationFiltersFromRecord(inquiry.filters),
  };
}

const frameworkMaterializationFilterKeys = [
  "packageId",
  "key",
  "strategy",
  "routeKind",
  "relation",
  "resourceKind",
  "resourceName",
  "resourceSiteKind",
  "dependencyKey",
  "dependencyAccess",
  "dependencyPolicy",
  "certainty",
  "query",
] as const satisfies readonly (keyof FrameworkMaterializationFilters & string)[];

function frameworkMaterializationFiltersFromRecord(
  value: unknown,
): FrameworkMaterializationFilters {
  return stringFiltersFromRecord<FrameworkMaterializationFilters>(
    value,
    frameworkMaterializationFilterKeys,
  );
}

function routeMatches(
  row: FrameworkMaterializationRouteRow,
  filters: FrameworkMaterializationFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.key === undefined ||
      row.key === filters.key ||
      row.provider.name === filters.key ||
      row.providerIdentity.name === filters.key) &&
    (filters.strategy === undefined || row.strategy === filters.strategy) &&
    (filters.routeKind === undefined || row.routeKind === filters.routeKind) &&
    (filters.dependencyKey === undefined ||
      row.dependencies.some(
        (dependency) => dependency.dependencyKey === filters.dependencyKey,
      )) &&
    (filters.dependencyAccess === undefined ||
      row.dependencies.some(
        (dependency) => dependency.access === filters.dependencyAccess,
      )) &&
    (filters.dependencyPolicy === undefined ||
      row.dependencies.some(
        (dependency) => dependency.policy === filters.dependencyPolicy,
      )) &&
    (filters.query === undefined ||
      row.summary.includes(filters.query) ||
      row.key.includes(filters.query) ||
      row.providerIdentity.name.includes(filters.query) ||
      row.providerIdentity.rawName.includes(filters.query) ||
      row.provider.name.includes(filters.query) ||
      row.provider.expression?.text.includes(filters.query) === true ||
      row.providerType?.includes(filters.query) === true ||
      row.dependencies.some((dependency) =>
        dependencyMatches(dependency, { query: filters.query }),
      ))
  );
}

function instantiationMatches(
  row: FrameworkMaterializationInstantiationRow,
  filters: FrameworkMaterializationFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.key === undefined ||
      row.key === filters.key ||
      row.provider.name === filters.key ||
      row.providerIdentity.name === filters.key) &&
    (filters.strategy === undefined || row.strategy === filters.strategy) &&
    (filters.routeKind === undefined || row.routeKind === filters.routeKind) &&
    (filters.query === undefined ||
      row.summary.includes(filters.query) ||
      row.key.includes(filters.query) ||
      row.providerIdentity.name.includes(filters.query) ||
      row.providerIdentity.rawName.includes(filters.query) ||
      row.provider.name.includes(filters.query) ||
      row.provider.expression?.text.includes(filters.query) === true ||
      row.providerType?.includes(filters.query) === true ||
      row.constructionSites.some(
        (site) =>
          site.summary.includes(filters.query!) ||
          site.from.name.includes(filters.query!) ||
          site.to.name.includes(filters.query!),
      ))
  );
}

function dependencyMatches(
  row: FrameworkMaterializationDependencyRow,
  filters: FrameworkMaterializationFilters,
): boolean {
  return (
    (filters.key === undefined || row.key === filters.key) &&
    (filters.dependencyKey === undefined ||
      row.dependencyKey === filters.dependencyKey ||
      row.argument.text === filters.dependencyKey) &&
    (filters.dependencyAccess === undefined ||
      row.access === filters.dependencyAccess) &&
    (filters.dependencyPolicy === undefined ||
      row.policy === filters.dependencyPolicy) &&
    (filters.certainty === undefined || row.certainty === filters.certainty) &&
    (filters.query === undefined ||
      row.summary.includes(filters.query) ||
      row.key.includes(filters.query) ||
      row.dependencyKey.includes(filters.query) ||
      row.argument.text.includes(filters.query) ||
      row.argument.type.includes(filters.query))
  );
}

function materializationRelationshipMatches(
  row: FrameworkMaterializationRelationshipRow,
  filters: FrameworkMaterializationFilters,
): boolean {
  return (
    (filters.packageId === undefined || row.packageId === filters.packageId) &&
    (filters.key === undefined ||
      row.key === filters.key ||
      row.from.name === filters.key ||
      row.to.name === filters.key) &&
    (filters.strategy === undefined || row.strategy === filters.strategy) &&
    (filters.routeKind === undefined || row.routeKind === filters.routeKind) &&
    (filters.relation === undefined || row.relation === filters.relation) &&
    (filters.dependencyKey === undefined ||
      row.to.name === filters.dependencyKey) &&
    (filters.dependencyAccess === undefined ||
      row.access === filters.dependencyAccess) &&
    (filters.dependencyPolicy === undefined ||
      row.policy === filters.dependencyPolicy) &&
    (filters.certainty === undefined || row.certainty === filters.certainty) &&
    (filters.query === undefined ||
      row.summary.includes(filters.query) ||
      row.key.includes(filters.query) ||
      row.from.name.includes(filters.query) ||
      row.to.name.includes(filters.query) ||
      row.providerIdentity?.name.includes(filters.query) === true ||
      row.providerIdentity?.rawName.includes(filters.query) === true ||
      row.to.expression?.text.includes(filters.query) === true ||
      row.to.expression?.type.includes(filters.query) === true)
  );
}

function evidenceForRoute(row: FrameworkMaterializationRouteRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence:
      row.closure === FrameworkRelationshipClosure.Partial
        ? EvidenceConfidence.Strong
        : EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function evidenceForMaterializationDependency(
  row: FrameworkMaterializationDependencyRow,
): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.DiLookup,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function frameworkMaterializationEvidenceForRelationship(
  row: FrameworkMaterializationRelationshipRow,
): Evidence {
  return {
    id: row.id,
    kind:
      row.relation === FrameworkRelationshipRelation.DependsOnKey
        ? EvidenceKind.DiLookup
        : EvidenceKind.DiRegistration,
    role: EvidenceRole.Subject,
    confidence:
      row.certainty === "potential"
        ? EvidenceConfidence.Strong
        : EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function evidenceForInstantiation(
  row: FrameworkMaterializationInstantiationRow,
): Evidence {
  return evidenceForClosureBackedRow(row, EvidenceKind.TypeFact);
}

function evidenceForResourceInstantiation(
  row: FrameworkResourceInstantiationRow,
): Evidence {
  return evidenceForClosureBackedRow(row, EvidenceKind.ResourceDefinition);
}

function evidenceForClosureBackedRow(
  row: FrameworkMaterializationInstantiationRow | FrameworkResourceInstantiationRow,
  kind: EvidenceKind,
): Evidence {
  return {
    id: row.id,
    kind,
    role: EvidenceRole.Subject,
    confidence:
      row.closure === FrameworkRelationshipClosure.Partial
        ? EvidenceConfidence.Strong
        : EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function openSeamsForRoutes(
  rows: readonly FrameworkMaterializationRouteRow[],
  evidence: readonly Evidence[],
): readonly OpenSeam[] {
  return rows
    .map((row, index) =>
      FrameworkMaterializationRouteDescriptor.forRouteKind(row.routeKind)
        .tracesCallbackDependencies
        ? callbackOpenSeam(row, evidence[index])
        : null,
    )
    .filter((row): row is OpenSeam => row !== null);
}

function callbackOpenSeam(
  row: FrameworkMaterializationRouteRow,
  evidence: Evidence | undefined,
): OpenSeam {
  const dependencySummary =
    row.dependencies.length === 0
      ? "No container dependency calls have been closed yet."
      : `Atlas closed ${row.dependencies.length} container dependency call(s), but return/value effects still need evaluator closure.`;
  return {
    id: `framework-materialization:callback:${row.relationshipAtomId}`,
    kind: OpenSeamKind.DynamicRuntime,
    summary: `${row.key} has a visible callback provider. ${dependencySummary}`,
    evidence,
    basis: frameworkMaterializationBasisSummary(),
    data: row,
  };
}

function materializationSummaryContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    projectionContinuation(
      inquiry,
      "framework.materialization:routes",
      "routes",
      "Inspect DI provider materialization routes.",
      { basis: CHECKER_PROJECTION_BASIS },
    ),
    projectionContinuation(
      inquiry,
      "framework.materialization:dependencies",
      "dependencies",
      "Inspect container dependencies found inside callback providers.",
      { basis: CHECKER_PROJECTION_BASIS },
    ),
    projectionContinuation(
      inquiry,
      "framework.materialization:relationships",
      "relationships",
      "Inspect materialization graph relationships between keys, providers, and dependency keys.",
      { basis: CHECKER_PROJECTION_BASIS },
    ),
    projectionContinuation(
      inquiry,
      "framework.materialization:instantiations",
      "instantiations",
      "Inspect where DI keys enter runtime existence and which framework construction sites apply.",
      { basis: CHECKER_PROJECTION_BASIS },
    ),
    projectionContinuation(
      inquiry,
      "framework.materialization:resource-instantiations",
      "resource-instantiations",
      "Inspect where framework resources can enter runtime existence.",
      { basis: CHECKER_PROJECTION_BASIS },
    ),
    projectionContinuation(
      inquiry,
      "framework.materialization:facts",
      "facts",
      "Inspect normalized materialization route facts.",
      { basis: CHECKER_PROJECTION_BASIS },
    ),
  ];
}

function routeContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkMaterializationRouteRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.materialization:routes:next-page",
        "Continue materialization route rows.",
        nextOffset,
        limit,
      ),
    );
  }
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = evidenceForRoute(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.materialization:routes",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect the exact provider source behind this materialization route.",
        "Exact provider source for a materialization route.",
      ),
    );
    if (row.providerSource !== undefined) {
      continuations.push(
        builder.typeFacts(
          "type",
          row.providerSource,
          "Inspect TypeChecker facts for the provider expression.",
          "Provider expression TypeChecker facts for a materialization route.",
        ),
      );
      if (
        FrameworkMaterializationRouteDescriptor.forRouteKind(row.routeKind)
          .tracesCallbackDependencies
      ) {
        continuations.push(
          builder.effects(
            "evaluator",
            row.providerSource,
            "Inspect static evaluator effects for this callback provider.",
            "Static evaluator effects for a callback materialization route.",
            {
              budget: {
                ...inquiry.budget,
                rows: 40,
              },
              basis: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
            },
          ),
        );
      }
    }
    if (row.dependencies.length > 0) {
      continuations.push(
        projectionContinuation(
          inquiry,
          `framework.materialization:routes:dependencies:${index}`,
          "dependencies",
          "Inspect container dependency calls observed inside this callback provider.",
          {
            filters: {
              ...inquiry.filters,
              key: row.key,
            },
            evidence,
            basis: [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator],
            summary: "Callback dependency calls for one materialization route.",
          },
        ),
      );
    }
    continuations.push({
      id: `framework.materialization:routes:di-provider:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale:
        "Return to the DI provider atom that seeded this materialization route.",
      inquiry: {
        ...inquiry,
        lens: LensId.FrameworkDi,
        projection: "providers",
        filters: {
          ...inquiry.filters,
          key: row.key,
        },
        page: undefined,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Semantic,
        NavigationRelation.ProvenanceOf,
        [BasisKind.TypeScriptChecker],
        "DI provider atom that seeded this materialization route.",
      ),
    });
  }
  return continuations;
}

function materializationRelationshipContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkMaterializationRelationshipRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.materialization:relationships:next-page",
        "Continue materialization relationship rows.",
        nextOffset,
        limit,
      ),
    );
  }
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = frameworkMaterializationEvidenceForRelationship(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.materialization:relationships",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect the exact source for this materialization relationship.",
        "Exact source for a materialization relationship.",
      ),
    );
    if (row.to.source !== undefined) {
      continuations.push(
        builder.typeFacts(
          "target",
          row.to.source,
          "Inspect TypeChecker facts for the materialization relationship target.",
          "TypeChecker facts for a materialization relationship target.",
        ),
      );
    }
    if (
      row.relation === FrameworkRelationshipRelation.DependsOnKey
    ) {
      continuations.push({
        id: `framework.materialization:relationships:dependency:${index}`,
        kind: ContinuationKind.SwitchProjection,
        priority: ContinuationPriority.Primary,
        rationale:
          "Inspect the dependency row that produced this relationship.",
        inquiry: {
          ...inquiry,
          projection: "dependencies",
          filters: {
            ...inquiry.filters,
            key: row.key,
            dependencyKey: row.to.name,
          },
          page: undefined,
        },
        evidence: [evidence],
        route: route(
          NavigationPlane.Semantic,
          NavigationRelation.ProvenanceOf,
          [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
          "Dependency row that produced this materialization relationship.",
        ),
      });
    }
  }
  return continuations;
}

function instantiationContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkMaterializationInstantiationRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.materialization:instantiations:next-page",
        "Continue key instantiation rows.",
        nextOffset,
        limit,
      ),
    );
  }
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = evidenceForInstantiation(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.materialization:instantiations",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "provider-source",
        row.source,
        "Inspect the provider source for this key instantiation.",
        "Provider source for a key instantiation row.",
      ),
    );
    const firstConstructionSite = row.constructionSites[0];
    if (firstConstructionSite !== undefined) {
      continuations.push(
        builder.source(
          "construction-source",
          firstConstructionSite.source,
          "Inspect the low-level Aurelia framework construction site used by this route class.",
          "Low-level framework construction site for a key instantiation row.",
          { priority: ContinuationPriority.Secondary },
        ),
      );
    }
    continuations.push({
      id: `framework.materialization:instantiations:route:${index}`,
      kind: ContinuationKind.SwitchProjection,
      priority: ContinuationPriority.Secondary,
      rationale:
        "Return to the materialization route that produced this instantiation row.",
      inquiry: {
        ...inquiry,
        projection: "routes",
        filters: {
          ...inquiry.filters,
          key: row.key,
        },
        page: undefined,
      },
      evidence: [evidence],
      route: route(
        NavigationPlane.Semantic,
        NavigationRelation.ProvenanceOf,
        [BasisKind.TypeScriptChecker],
        "Materialization route that produced this instantiation row.",
      ),
    });
  }
  return continuations;
}

function resourceInstantiationContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkResourceInstantiationRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.materialization:resource-instantiations:next-page",
        "Continue resource instantiation rows.",
        nextOffset,
        limit,
      ),
    );
  }
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = evidenceForResourceInstantiation(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.materialization:resource-instantiations",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "resource-source",
        row.source,
        "Inspect the resource carrier source for this instantiation row.",
        "Resource carrier source for a resource instantiation row.",
      ),
    );
    const firstMaterializationSite = row.materializationSites[0];
    if (firstMaterializationSite !== undefined) {
      continuations.push(
        builder.source(
          "materialization-source",
          firstMaterializationSite.source,
          "Inspect the framework materialization site that can instantiate, resolve, build, or apply this resource class.",
          "Runtime/compiler/evaluator materialization site for a resource instantiation row.",
          { priority: ContinuationPriority.Secondary },
        ),
      );
    }
  }
  return continuations;
}

function dependencyContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkMaterializationDependencyRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.materialization:dependencies:next-page",
        "Continue materialization dependency rows.",
        nextOffset,
        limit,
      ),
    );
  }
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = evidenceForMaterializationDependency(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.materialization:dependencies",
      index,
      evidence,
    );
    continuations.push(
      builder.source(
        "source",
        row.source,
        "Inspect the exact source for this callback dependency.",
        "Exact source for a callback dependency.",
      ),
      builder.typeFacts(
        "key",
        row.argumentSource,
        "Inspect TypeChecker facts for the dependency key expression.",
        "TypeChecker facts for a dependency key expression.",
      ),
    );
  }
  return continuations;
}

function frameworkMaterializationBasis(sourceProject: SourceProject): Basis {
  return {
    ...frameworkMaterializationBasisSummary(),
    identity: sourceProject.snapshot().identity,
  };
}

function frameworkMaterializationBasisSummary(): Basis {
  return {
    kind: BasisKind.TypeScriptChecker,
    closure: BasisClosure.Partial,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary:
      "Answered from DI provider relationship atoms plus checker-backed provider expression facts; callback body/effect closure remains a later evaluator layer.",
  };
}
