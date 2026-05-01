import {
  readEvaluationEffectTrace,
  sourceRangeForEvaluationEffect,
  type EvaluationEffectCertainty,
  type EvaluationInvocationEffect,
} from "../../evaluation/index.js";
import {
  readFrameworkDiIndex,
} from "../../framework/di-index.js";
import {
  FrameworkDiResolverStrategy,
  FrameworkRelationshipClosure,
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipAtom,
  type FrameworkRelationshipEndpoint,
} from "../../framework/relationships.js";
import {
  sourceSelectorForRange,
  type SourceProject,
  type SourceSpan,
  type TypeScriptCallSiteEntry,
  type TypeScriptExpressionFact,
} from "../../source/index.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import { BasisAuthority, BasisClosure, BasisFreshness, BasisKind, type Basis } from "../basis.js";
import { clampBudget } from "../budget.js";
import { ContinuationKind, ContinuationPriority, type Continuation } from "../continuation.js";
import { EvidenceConfidence, EvidenceKind, EvidenceRole, OpenSeamKind, type Evidence, type OpenSeam } from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { LocusKind, type SourceRange } from "../locus.js";
import { NavigationPlane, NavigationRelation, type NavigationRouteClaim } from "../navigation.js";

/** First-pass route class for a DI key provider materialization seed. */
export const enum FrameworkMaterializationRouteKind {
  /** Existing runtime value is registered for the key. */
  InstanceValue = "instance-value",
  /** Constructable provider is visible for singleton/transient resolution. */
  ConstructableProvider = "constructable-provider",
  /** Callback provider is visible but needs evaluator/effect tracing to close. */
  CallbackProvider = "callback-provider",
  /** Key resolves through another key. */
  AliasDelegation = "alias-delegation",
  /** Provider target is visible but not classified more narrowly yet. */
  Provider = "provider",
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

/** Relationship axis exposed by framework.materialization graph rows. */
export const enum FrameworkMaterializationRelationshipKind {
  /** A DI key reaches a visible provider route. */
  MaterializesThrough = "materializes-through",
  /** Materializing one DI key reads another container key. */
  DependsOnKey = "depends-on-key",
}

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
  /** Materialization relation kind. */
  readonly relation: FrameworkMaterializationRelationshipKind;
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
  /** Route rows returned by route/fact/evidence projections. */
  readonly routes?: readonly FrameworkMaterializationRouteRow[];
  /** Dependency rows returned by dependency projections. */
  readonly dependencies?: readonly FrameworkMaterializationDependencyRow[];
  /** Graph-native materialization relationships returned by relationship projections. */
  readonly relationships?: readonly FrameworkMaterializationRelationshipRow[];
}

interface FrameworkMaterializationFilters {
  readonly packageId?: string;
  readonly key?: string;
  readonly strategy?: string;
  readonly routeKind?: string;
  readonly relation?: string;
  readonly dependencyKey?: string;
  readonly dependencyAccess?: string;
  readonly dependencyPolicy?: string;
  readonly certainty?: string;
  readonly query?: string;
}

const materializationDependenciesByProject = new WeakMap<SourceProject, Map<string, readonly FrameworkMaterializationDependencyRow[]>>();

/** Answer framework.materialization inquiries from exact DI provider seeds. */
export function answerFrameworkMaterialization(
  /** Inquiry being answered. */
  inquiry: Inquiry,
  /** Hot source project owned by the daemon. */
  sourceProject: SourceProject,
): Answer<FrameworkMaterializationValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = filtersFromInquiry(inquiry);
  const routes = readFrameworkDiIndex(sourceProject).relationships
    .filter(isProviderSeedAtom)
    .map((row) => routeForProviderSeed(sourceProject, row))
    .filter((row) => routeMatches(row, filters));
  const dependencies = routes
    .flatMap((row) => row.dependencies)
    .filter((row) => dependencyMatches(row, filters));
  const relationships = routes
    .flatMap(relationshipsForRoute)
    .filter((row) => relationshipMatches(row, filters));
  const limit = clampBudget(inquiry.budget?.rows, 80, 1_000);
  const offset = pageOffset(inquiry);

  if (projection === "dependencies") {
    const page = pageRows(dependencies, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${dependencies.length} framework materialization dependency row(s).`, {
      value: {
        routeCount: routes.length,
        routeKinds: countBy(routes, (row) => row.routeKind),
        strategies: countBy(routes, (row) => row.strategy ?? "unknown"),
        dependencyCount: dependencies.length,
        dependencyAccesses: countBy(dependencies, (row) => row.access),
        dependencyPolicies: countBy(dependencies, (row) => row.policy),
        relationshipCount: relationships.length,
        relationshipRelations: countBy(relationships, (row) => row.relation),
        dependencies: page.rows,
      },
      basis: [frameworkMaterializationBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForDependency),
      page: pageInfo(inquiry, page.rows.length, dependencies.length, limit, page.nextOffset),
      continuations: dependencyContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "relationships") {
    const page = pageRows(relationships, offset, limit);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit, `Returned ${page.rows.length} of ${relationships.length} framework materialization relationship row(s).`, {
      value: {
        routeCount: routes.length,
        routeKinds: countBy(routes, (row) => row.routeKind),
        strategies: countBy(routes, (row) => row.strategy ?? "unknown"),
        dependencyCount: dependencies.length,
        dependencyAccesses: countBy(dependencies, (row) => row.access),
        dependencyPolicies: countBy(dependencies, (row) => row.policy),
        relationshipCount: relationships.length,
        relationshipRelations: countBy(relationships, (row) => row.relation),
        relationships: page.rows,
      },
      basis: [frameworkMaterializationBasis(sourceProject)],
      evidence: page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForRelationship),
      page: pageInfo(inquiry, page.rows.length, relationships.length, limit, page.nextOffset),
      continuations: relationshipContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  if (projection === "routes" || projection === "facts" || projection === "evidence") {
    const page = pageRows(routes, offset, limit);
    const evidence = page.rows.slice(0, evidenceLimit(inquiry)).map(evidenceForRoute);
    const openSeams = openSeamsForRoutes(page.rows, evidence);
    return createAnswer(inquiry, page.rows.length === 0 ? OutcomeKind.Miss : openSeams.length > 0 ? OutcomeKind.Partial : OutcomeKind.Hit, `Returned ${page.rows.length} of ${routes.length} framework materialization route(s).`, {
      value: {
        routeCount: routes.length,
        routeKinds: countBy(routes, (row) => row.routeKind),
        strategies: countBy(routes, (row) => row.strategy ?? "unknown"),
        dependencyCount: dependencies.length,
        dependencyAccesses: countBy(dependencies, (row) => row.access),
        dependencyPolicies: countBy(dependencies, (row) => row.policy),
        relationshipCount: relationships.length,
        relationshipRelations: countBy(relationships, (row) => row.relation),
        routes: page.rows,
      },
      basis: [frameworkMaterializationBasis(sourceProject)],
      evidence,
      openSeams,
      page: pageInfo(inquiry, page.rows.length, routes.length, limit, page.nextOffset),
      continuations: routeContinuations(inquiry, page.rows, page.nextOffset, limit),
    });
  }

  const evidence = routes.slice(0, evidenceLimit(inquiry)).map(evidenceForRoute);
  const openSeams = openSeamsForRoutes(routes.slice(0, evidence.length), evidence);
  return createAnswer(inquiry, routes.length === 0 ? OutcomeKind.Miss : openSeams.length > 0 ? OutcomeKind.Partial : OutcomeKind.Hit, `Framework materialization has ${routes.length} DI provider route(s).`, {
    value: {
      routeCount: routes.length,
      routeKinds: countBy(routes, (row) => row.routeKind),
      strategies: countBy(routes, (row) => row.strategy ?? "unknown"),
      dependencyCount: dependencies.length,
      dependencyAccesses: countBy(dependencies, (row) => row.access),
      dependencyPolicies: countBy(dependencies, (row) => row.policy),
      relationshipCount: relationships.length,
      relationshipRelations: countBy(relationships, (row) => row.relation),
    },
    basis: [frameworkMaterializationBasis(sourceProject)],
    evidence,
    openSeams,
    continuations: summaryContinuations(inquiry),
  });
}

function isProviderSeedAtom(row: FrameworkRelationshipAtom): boolean {
  return row.relation === FrameworkRelationshipRelation.ProvidesKey
    || row.relation === FrameworkRelationshipRelation.AliasesKey && row.to.kind === FrameworkRelationshipEndpointKind.Expression;
}

function routeForProviderSeed(sourceProject: SourceProject, row: FrameworkRelationshipAtom): FrameworkMaterializationRouteRow {
  const routeKind = routeKindForSeed(row);
  const id = `framework-materialization:${row.id}`;
  const dependencies = routeKind === FrameworkMaterializationRouteKind.CallbackProvider
    ? dependencyRowsForProviderSeed(sourceProject, row, id)
    : [];
  return {
    id,
    packageId: row.packageId,
    packageName: row.packageName,
    key: row.key ?? row.from.name,
    keyEndpoint: row.from,
    ...(row.strategy === undefined ? {} : { strategy: row.strategy }),
    routeKind,
    provider: row.to,
    ...(row.to.expression?.type === undefined ? {} : { providerType: row.to.expression.type }),
    relationshipAtomId: row.id,
    closure: routeKind === FrameworkMaterializationRouteKind.CallbackProvider
      ? FrameworkRelationshipClosure.Partial
      : row.closure,
    source: row.source,
    ...(row.to.source === undefined ? {} : { providerSource: row.to.source }),
    dependencies,
    summary: materializationSummary(row, routeKind),
  };
}

function relationshipsForRoute(row: FrameworkMaterializationRouteRow): readonly FrameworkMaterializationRelationshipRow[] {
  return [
    materializesThroughRelationship(row),
    ...row.dependencies.map((dependency) => dependsOnKeyRelationship(row, dependency)),
  ];
}

function materializesThroughRelationship(row: FrameworkMaterializationRouteRow): FrameworkMaterializationRelationshipRow {
  return {
    id: `${row.id}:relationship:materializes-through`,
    routeId: row.id,
    packageId: row.packageId,
    packageName: row.packageName,
    relation: FrameworkMaterializationRelationshipKind.MaterializesThrough,
    key: row.key,
    routeKind: row.routeKind,
    ...(row.strategy === undefined ? {} : { strategy: row.strategy }),
    from: row.keyEndpoint,
    to: row.provider,
    source: row.source,
    summary: `${row.key} materializes through ${row.provider.name}.`,
  };
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
    relation: FrameworkMaterializationRelationshipKind.DependsOnKey,
    key: dependency.key,
    routeKind: route.routeKind,
    ...(route.strategy === undefined ? {} : { strategy: route.strategy }),
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

function routeKindForSeed(row: FrameworkRelationshipAtom): FrameworkMaterializationRouteKind {
  if (row.relation === FrameworkRelationshipRelation.AliasesKey) {
    return FrameworkMaterializationRouteKind.AliasDelegation;
  }
  switch (row.strategy) {
    case FrameworkDiResolverStrategy.Instance:
      return FrameworkMaterializationRouteKind.InstanceValue;
    case FrameworkDiResolverStrategy.Singleton:
    case FrameworkDiResolverStrategy.Transient:
      return FrameworkMaterializationRouteKind.ConstructableProvider;
    case FrameworkDiResolverStrategy.Callback:
    case FrameworkDiResolverStrategy.CachedCallback:
      return FrameworkMaterializationRouteKind.CallbackProvider;
    default:
      return FrameworkMaterializationRouteKind.Provider;
  }
}

function materializationSummary(row: FrameworkRelationshipAtom, routeKind: FrameworkMaterializationRouteKind): string {
  const key = row.key ?? row.from.name;
  const provider = row.value ?? row.to.name;
  switch (routeKind) {
    case FrameworkMaterializationRouteKind.AliasDelegation:
      return `${key} resolves by aliasing ${provider}.`;
    case FrameworkMaterializationRouteKind.InstanceValue:
      return `${key} materializes as existing instance/value ${provider}.`;
    case FrameworkMaterializationRouteKind.ConstructableProvider:
      return `${key} materializes through ${row.strategy ?? "unknown"} constructable ${provider}.`;
    case FrameworkMaterializationRouteKind.CallbackProvider:
      return `${key} materializes through callback provider ${provider}; callback effects still need evaluator tracing.`;
    case FrameworkMaterializationRouteKind.Provider:
      return `${key} materializes through provider ${provider}.`;
  }
}

function dependencyRowsForProviderSeed(
  sourceProject: SourceProject,
  row: FrameworkRelationshipAtom,
  routeId: string,
): readonly FrameworkMaterializationDependencyRow[] {
  const cache = materializationDependenciesByProject.get(sourceProject) ?? new Map<string, readonly FrameworkMaterializationDependencyRow[]>();
  if (!materializationDependenciesByProject.has(sourceProject)) {
    materializationDependenciesByProject.set(sourceProject, cache);
  }
  const cached = cache.get(row.id);
  if (cached !== undefined) {
    return cached;
  }
  const rows = dependencyRowsForProviderSeedUncached(sourceProject, row, routeId);
  cache.set(row.id, rows);
  return rows;
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
  const read = readEvaluationEffectTrace(sourceProject, sourceSelectorForRange(row.to.source), {
    limit: 200,
    maxDepth: 120,
  });
  return read.effects
    .map((effect) => dependencyRowForEffect(routeId, row.packageId, row.packageName, key, effect))
    .filter((dependency): dependency is FrameworkMaterializationDependencyRow => dependency !== null);
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
  if (access === null || firstArgument === undefined || !isContainerReceiverEffect(effect)) {
    return null;
  }
  const dependencyKey = firstArgument.expression.symbolName ?? firstArgument.expression.text;
  const policy = dependencyPolicyForEffect(effect);
  const source = sourceRangeForEvaluationEffect(effect);
  const argumentSource = sourceRangeForSpan(effect.callSite.file.repoPath, firstArgument.expression.span);
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

function dependencyPolicyForEffect(effect: EvaluationInvocationEffect): FrameworkMaterializationDependencyPolicy {
  if (effect.certainty === "deferred" || effect.controlPath.some((part) => /^callback:.+:\d+$/u.test(part))) {
    return FrameworkMaterializationDependencyPolicy.Deferred;
  }
  if (effect.certainty === "repeated" || effect.controlPath.some((part) =>
    part === "for"
    || part === "for-of"
    || part === "loop"
    || part === "callback:forEach"
    || part === "callback:map"
    || part === "callback:flatMap")) {
    return FrameworkMaterializationDependencyPolicy.Repeated;
  }
  if (effect.controlPath.some((part) => part.endsWith(":else") || part.endsWith(":false"))) {
    return FrameworkMaterializationDependencyPolicy.Fallback;
  }
  if (effect.certainty === "potential" || effect.controlPath.length > 0) {
    return FrameworkMaterializationDependencyPolicy.Guarded;
  }
  return FrameworkMaterializationDependencyPolicy.Direct;
}

function dependencyAccessForEffect(effect: EvaluationInvocationEffect): FrameworkMaterializationDependencyAccess | null {
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
    default:
      return null;
  }
}

function isContainerReceiverEffect(effect: EvaluationInvocationEffect): boolean {
  const parameterIndex = effect.receiverBinding?.parameterIndex;
  return parameterIndex === 0
    || parameterIndex === 1
    || effect.receiver?.type.includes("IContainer") === true
    || effect.receiver?.apparentType.includes("IContainer") === true;
}

function filtersFromInquiry(inquiry: Inquiry): FrameworkMaterializationFilters {
  return {
    ...filtersFromRecord(inquiry.subject),
    ...filtersFromRecord(inquiry.filters),
  };
}

function filtersFromRecord(value: unknown): FrameworkMaterializationFilters {
  if (value === null || typeof value !== "object") {
    return {};
  }
  const source = value as Record<string, unknown>;
  return {
    ...stringFilter(source, "packageId"),
    ...stringFilter(source, "key"),
    ...stringFilter(source, "strategy"),
    ...stringFilter(source, "routeKind"),
    ...stringFilter(source, "relation"),
    ...stringFilter(source, "dependencyKey"),
    ...stringFilter(source, "dependencyAccess"),
    ...stringFilter(source, "dependencyPolicy"),
    ...stringFilter(source, "certainty"),
    ...stringFilter(source, "query"),
  };
}

function stringFilter(source: Record<string, unknown>, key: keyof FrameworkMaterializationFilters): object {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? { [key]: value } : {};
}

function routeMatches(row: FrameworkMaterializationRouteRow, filters: FrameworkMaterializationFilters): boolean {
  return (filters.packageId === undefined || row.packageId === filters.packageId)
    && (filters.key === undefined || row.key === filters.key || row.provider.name === filters.key)
    && (filters.strategy === undefined || row.strategy === filters.strategy)
    && (filters.routeKind === undefined || row.routeKind === filters.routeKind)
    && (filters.dependencyKey === undefined || row.dependencies.some((dependency) => dependency.dependencyKey === filters.dependencyKey))
    && (filters.dependencyAccess === undefined || row.dependencies.some((dependency) => dependency.access === filters.dependencyAccess))
    && (filters.dependencyPolicy === undefined || row.dependencies.some((dependency) => dependency.policy === filters.dependencyPolicy))
    && (filters.query === undefined
      || row.summary.includes(filters.query)
      || row.key.includes(filters.query)
      || row.provider.name.includes(filters.query)
      || row.provider.expression?.text.includes(filters.query) === true
      || row.providerType?.includes(filters.query) === true
      || row.dependencies.some((dependency) => dependencyMatches(dependency, { query: filters.query })));
}

function dependencyMatches(row: FrameworkMaterializationDependencyRow, filters: FrameworkMaterializationFilters): boolean {
  return (filters.key === undefined || row.key === filters.key)
    && (filters.dependencyKey === undefined || row.dependencyKey === filters.dependencyKey || row.argument.text === filters.dependencyKey)
    && (filters.dependencyAccess === undefined || row.access === filters.dependencyAccess)
    && (filters.dependencyPolicy === undefined || row.policy === filters.dependencyPolicy)
    && (filters.certainty === undefined || row.certainty === filters.certainty)
    && (filters.query === undefined
      || row.summary.includes(filters.query)
      || row.key.includes(filters.query)
      || row.dependencyKey.includes(filters.query)
      || row.argument.text.includes(filters.query)
      || row.argument.type.includes(filters.query));
}

function relationshipMatches(row: FrameworkMaterializationRelationshipRow, filters: FrameworkMaterializationFilters): boolean {
  return (filters.packageId === undefined || row.packageId === filters.packageId)
    && (filters.key === undefined || row.key === filters.key || row.from.name === filters.key || row.to.name === filters.key)
    && (filters.strategy === undefined || row.strategy === filters.strategy)
    && (filters.routeKind === undefined || row.routeKind === filters.routeKind)
    && (filters.relation === undefined || row.relation === filters.relation)
    && (filters.dependencyKey === undefined || row.to.name === filters.dependencyKey)
    && (filters.dependencyAccess === undefined || row.access === filters.dependencyAccess)
    && (filters.dependencyPolicy === undefined || row.policy === filters.dependencyPolicy)
    && (filters.certainty === undefined || row.certainty === filters.certainty)
    && (filters.query === undefined
      || row.summary.includes(filters.query)
      || row.key.includes(filters.query)
      || row.from.name.includes(filters.query)
      || row.to.name.includes(filters.query)
      || row.to.expression?.text.includes(filters.query) === true
      || row.to.expression?.type.includes(filters.query) === true);
}

function evidenceForRoute(row: FrameworkMaterializationRouteRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: row.closure === FrameworkRelationshipClosure.Partial ? EvidenceConfidence.Strong : EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function evidenceForDependency(row: FrameworkMaterializationDependencyRow): Evidence {
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

function evidenceForRelationship(row: FrameworkMaterializationRelationshipRow): Evidence {
  return {
    id: row.id,
    kind: row.relation === FrameworkMaterializationRelationshipKind.DependsOnKey
      ? EvidenceKind.DiLookup
      : EvidenceKind.DiRegistration,
    role: EvidenceRole.Subject,
    confidence: row.certainty === "potential" ? EvidenceConfidence.Strong : EvidenceConfidence.Exact,
    summary: row.summary,
    source: row.source,
    data: row,
  };
}

function openSeamsForRoutes(rows: readonly FrameworkMaterializationRouteRow[], evidence: readonly Evidence[]): readonly OpenSeam[] {
  return rows
    .map((row, index) => row.routeKind === FrameworkMaterializationRouteKind.CallbackProvider
      ? callbackOpenSeam(row, evidence[index])
      : null)
    .filter((row): row is OpenSeam => row !== null);
}

function callbackOpenSeam(row: FrameworkMaterializationRouteRow, evidence: Evidence | undefined): OpenSeam {
  const dependencySummary = row.dependencies.length === 0
    ? "No container dependency calls have been closed yet."
    : `Atlas closed ${row.dependencies.length} container dependency call(s), but return/value effects still need evaluator closure.`;
  return {
    id: `framework-materialization:callback:${row.relationshipAtomId}`,
    kind: OpenSeamKind.DynamicRuntime,
    summary: `${row.key} has a visible callback provider. ${dependencySummary}`,
    ...(evidence === undefined ? {} : { evidence }),
    basis: frameworkMaterializationBasisSummary(),
    data: row,
  };
}

function summaryContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    projectionContinuation(inquiry, "framework.materialization:routes", "routes", "Inspect DI provider materialization routes."),
    projectionContinuation(inquiry, "framework.materialization:dependencies", "dependencies", "Inspect container dependencies found inside callback providers."),
    projectionContinuation(inquiry, "framework.materialization:relationships", "relationships", "Inspect materialization graph relationships between keys, providers, and dependency keys."),
    projectionContinuation(inquiry, "framework.materialization:facts", "facts", "Inspect normalized materialization route facts."),
  ];
}

function routeContinuations(inquiry: Inquiry, rows: readonly FrameworkMaterializationRouteRow[], nextOffset: number | undefined, limit: number): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.materialization:routes:next-page", "Continue materialization route rows.", nextOffset, limit));
  }
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = evidenceForRoute(row);
    continuations.push({
      id: `framework.materialization:routes:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect the exact provider source behind this materialization route.",
      inquiry: {
        lens: LensId.TsSource,
        locus: sourceRangeLocus(row.source),
        projection: "text",
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Exact provider source for a materialization route."),
    });
    if (row.providerSource !== undefined) {
      continuations.push({
        id: `framework.materialization:routes:type:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Secondary,
        rationale: "Inspect TypeChecker facts for the provider expression.",
        inquiry: {
          lens: LensId.TsType,
          locus: sourceRangeLocus(row.providerSource),
          projection: "facts",
        },
        evidence: [evidence],
        route: route(NavigationPlane.Inspection, NavigationRelation.TypeFactsFor, [BasisKind.TypeScriptChecker], "Provider expression TypeChecker facts for a materialization route."),
      });
      if (row.routeKind === FrameworkMaterializationRouteKind.CallbackProvider) {
        continuations.push({
          id: `framework.materialization:routes:evaluator:${index}`,
          kind: ContinuationKind.SwitchLens,
          priority: ContinuationPriority.Primary,
          rationale: "Inspect static evaluator effects for this callback provider.",
          inquiry: {
            lens: LensId.FrameworkEvaluator,
            locus: sourceRangeLocus(row.providerSource),
            projection: "effects",
            budget: {
              ...inquiry.budget,
              rows: 40,
            },
          },
          evidence: [evidence],
          route: route(NavigationPlane.Semantic, NavigationRelation.EffectsOf, [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker], "Static evaluator effects for a callback materialization route."),
        });
      }
    }
    if (row.dependencies.length > 0) {
      continuations.push({
        id: `framework.materialization:routes:dependencies:${index}`,
        kind: ContinuationKind.SwitchProjection,
        priority: ContinuationPriority.Primary,
        rationale: "Inspect container dependency calls observed inside this callback provider.",
        inquiry: {
          ...inquiry,
          projection: "dependencies",
          filters: {
            ...inquiry.filters,
            key: row.key,
          },
          page: undefined,
        },
        evidence: [evidence],
        route: route(NavigationPlane.Semantic, NavigationRelation.ProjectionOf, [BasisKind.TypeScriptChecker, BasisKind.StaticEvaluator], "Callback dependency calls for one materialization route."),
      });
    }
    continuations.push({
      id: `framework.materialization:routes:di-provider:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Return to the DI provider atom that seeded this materialization route.",
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
      route: route(NavigationPlane.Semantic, NavigationRelation.ProvenanceOf, [BasisKind.TypeScriptChecker], "DI provider atom that seeded this materialization route."),
    });
  }
  return continuations;
}

function relationshipContinuations(inquiry: Inquiry, rows: readonly FrameworkMaterializationRelationshipRow[], nextOffset: number | undefined, limit: number): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.materialization:relationships:next-page", "Continue materialization relationship rows.", nextOffset, limit));
  }
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = evidenceForRelationship(row);
    continuations.push({
      id: `framework.materialization:relationships:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect the exact source for this materialization relationship.",
      inquiry: {
        lens: LensId.TsSource,
        locus: sourceRangeLocus(row.source),
        projection: "text",
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Exact source for a materialization relationship."),
    });
    if (row.to.source !== undefined) {
      continuations.push({
        id: `framework.materialization:relationships:target:${index}`,
        kind: ContinuationKind.SwitchLens,
        priority: ContinuationPriority.Secondary,
        rationale: "Inspect TypeChecker facts for the materialization relationship target.",
        inquiry: {
          lens: LensId.TsType,
          locus: sourceRangeLocus(row.to.source),
          projection: "facts",
        },
        evidence: [evidence],
        route: route(NavigationPlane.Inspection, NavigationRelation.TypeFactsFor, [BasisKind.TypeScriptChecker], "TypeChecker facts for a materialization relationship target."),
      });
    }
    if (row.relation === FrameworkMaterializationRelationshipKind.DependsOnKey) {
      continuations.push({
        id: `framework.materialization:relationships:dependency:${index}`,
        kind: ContinuationKind.SwitchProjection,
        priority: ContinuationPriority.Primary,
        rationale: "Inspect the dependency row that produced this relationship.",
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
        route: route(NavigationPlane.Semantic, NavigationRelation.ProvenanceOf, [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker], "Dependency row that produced this materialization relationship."),
      });
    }
  }
  return continuations;
}

function dependencyContinuations(inquiry: Inquiry, rows: readonly FrameworkMaterializationDependencyRow[], nextOffset: number | undefined, limit: number): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(nextPageContinuation(inquiry, "framework.materialization:dependencies:next-page", "Continue materialization dependency rows.", nextOffset, limit));
  }
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = evidenceForDependency(row);
    continuations.push({
      id: `framework.materialization:dependencies:source:${index}`,
      kind: ContinuationKind.InspectEvidence,
      priority: ContinuationPriority.Primary,
      rationale: "Inspect the exact source for this callback dependency.",
      inquiry: {
        lens: LensId.TsSource,
        locus: sourceRangeLocus(row.source),
        projection: "text",
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.SourceFor, [BasisKind.SourceText, BasisKind.TypeScriptChecker], "Exact source for a callback dependency."),
    });
    continuations.push({
      id: `framework.materialization:dependencies:key:${index}`,
      kind: ContinuationKind.SwitchLens,
      priority: ContinuationPriority.Secondary,
      rationale: "Inspect TypeChecker facts for the dependency key expression.",
      inquiry: {
        lens: LensId.TsType,
        locus: sourceRangeLocus(row.argumentSource),
        projection: "facts",
      },
      evidence: [evidence],
      route: route(NavigationPlane.Inspection, NavigationRelation.TypeFactsFor, [BasisKind.TypeScriptChecker], "TypeChecker facts for a dependency key expression."),
    });
  }
  return continuations;
}

function projectionContinuation(inquiry: Inquiry, id: string, projection: string, rationale: string): Continuation {
  return {
    id,
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Primary,
    rationale,
    inquiry: {
      ...inquiry,
      projection,
      page: undefined,
    },
    route: route(NavigationPlane.Semantic, NavigationRelation.ProjectionOf, [BasisKind.TypeScriptChecker], rationale),
  };
}

function nextPageContinuation(inquiry: Inquiry, id: string, rationale: string, nextOffset: number, limit: number): Continuation {
  return {
    id,
    kind: ContinuationKind.NextPage,
    priority: ContinuationPriority.Primary,
    rationale,
    inquiry: {
      ...inquiry,
      page: { size: limit, cursor: String(nextOffset) },
    },
    route: route(NavigationPlane.Addressing, NavigationRelation.NextPageOf, [], rationale),
  };
}

function sourceRangeLocus(range: SourceRange) {
  return {
    kind: LocusKind.SourceRange,
    range,
  } as const;
}

function sourceRangeForSpan(filePath: string, span: SourceSpan): SourceRange {
  return {
    filePath,
    start: {
      line: span.startLine - 1,
      character: span.startCharacter - 1,
    },
    end: {
      line: span.endLine - 1,
      character: span.endCharacter - 1,
    },
  };
}

function pageInfo(inquiry: Inquiry, returned: number, total: number, limit: number, nextOffset: number | undefined) {
  return {
    size: limit,
    cursor: inquiry.page?.cursor,
    returned,
    total,
    ...(nextOffset === undefined ? {} : { nextCursor: String(nextOffset) }),
  };
}

function pageRows<TValue>(
  rows: readonly TValue[],
  offset: number,
  limit: number,
): { readonly rows: readonly TValue[]; readonly nextOffset?: number } {
  const page = rows.slice(offset, offset + limit);
  const nextOffset = offset + page.length < rows.length ? offset + page.length : undefined;
  return {
    rows: page,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

function pageOffset(inquiry: Inquiry): number {
  const cursor = inquiry.page?.cursor;
  if (cursor === undefined) {
    return 0;
  }
  const parsed = Number.parseInt(cursor, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function evidenceLimit(inquiry: Inquiry): number {
  return clampBudget(inquiry.budget?.evidencePerSubject, 5, 20);
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
    summary: "Answered from DI provider relationship atoms plus checker-backed provider expression facts; callback body/effect closure remains a later evaluator layer.",
  };
}

function route(
  plane: NavigationPlane,
  relation: NavigationRelation,
  basis: readonly BasisKind[],
  summary: string,
): NavigationRouteClaim {
  return { plane, relation, basis, summary };
}

function countBy<TValue>(rows: readonly TValue[], keyFor: (row: TValue) => string): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = keyFor(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}
