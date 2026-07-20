import ts from 'typescript';
import {
  readClassTarget,
  readStaticStringArrayValue,
  StaticInvocationEvidenceExpressionReader,
  StaticSourceLiteralExpressionReader,
  type StaticExpressionEvaluationReader,
} from '../evaluation/expression-reader.js';
import {
  EvaluationValueKind,
  closedEvaluationPromiseFulfillment,
  type EvaluationPromiseValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import {
  isStaticCallInvocationOccurrence,
  type StaticInvocationOccurrence,
} from '../evaluation/invocation.js';
import {
  hasStaticModifier,
  readObjectPropertyExpression,
  readPropertyName,
  readReferenceName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import type { EvaluatedProjectSource, StaticProjectEvaluationResult } from '../evaluation/project-evaluation.js';
import { isEvaluatedProjectSource } from '../evaluation/project-evaluation.js';
import {
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  EvidenceHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelPublicationPlan,
  KernelStoreBatch,
  publishProductDetails,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import type { KernelStoreRecord } from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { ProjectBootFrame, SourceFileAdmission } from '../boot/frames.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { localKeyPart } from '../kernel/local-key.js';
import { RouterFrameworkErrorCode } from './framework-error-code.js';
import {
  RouteableComponentKind,
  RouteableComponentModel,
  RouteableComponentReference,
  RouteConfigContributionModel,
  RouteConfigExecutionKind,
  RouteConfigFieldState,
  RouteConfigFieldStateKind,
  RouteConfigKind,
  RouteConfigOriginKind,
  RouteConfigValueKind,
  RouterIssueKind,
  RouterIssueModel,
  RouterIssuePhase,
  type RouteConfigField,
  type RouteConfigValueField,
} from './model.js';
import { RouterProductDetails } from './product-details.js';
import { routerIdentityProductRecords } from './router-product-records.js';
import { routerIssueProductRecords } from './router-issue-publication.js';

const ROUTER_MODULES = new Set([
  '@aurelia/router',
]);

class RouterImportedBindings {
  readonly routeDecoratorIdentifiers = new Set<string>();
  readonly routeObjectIdentifiers = new Set<string>();
  readonly routerNamespaces = new Set<string>();
}

class RouteConfigRecognitionContext {
  constructor(
    readonly sourceFile: ts.SourceFile,
    readonly moduleKey: string,
    readonly sourceFileAddressHandle: AddressHandle,
    readonly projectKey: string,
    readonly evaluation: EvaluatedProjectSource,
    readonly resourceIndex: ResourceDefinitionIndex,
    readonly typeSystem: TypeSystemProject,
    readonly expressionReader: StaticExpressionEvaluationReader,
  ) {}

  withExpressionReader(expressionReader: StaticExpressionEvaluationReader): RouteConfigRecognitionContext {
    return new RouteConfigRecognitionContext(
      this.sourceFile,
      this.moduleKey,
      this.sourceFileAddressHandle,
      this.projectKey,
      this.evaluation,
      this.resourceIndex,
      this.typeSystem,
      expressionReader,
    );
  }
}

class SourceRecordSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly addressHandle: AddressHandle,
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

interface RouteableComponentObservation {
  readonly componentKind: RouteableComponentKind;
  readonly localName: string | null;
  readonly sourceNode: ts.Node;
  readonly resourceDefinition: FullResourceDefinition | null;
  readonly invalidLazyImport: boolean;
}

interface RouteConfigObservation {
  readonly routeKind: RouteConfigKind;
  readonly originKind: RouteConfigOriginKind;
  readonly valueKind: RouteConfigValueKind;
  readonly executionKind: RouteConfigExecutionKind;
  readonly executionOrder: number | null;
  readonly id: string | null;
  readonly paths: readonly string[];
  readonly pathSourceNode: ts.Node | null;
  readonly title: string | null;
  readonly component: RouteableComponentObservation | null;
  readonly redirectTo: string | null;
  readonly caseSensitive: boolean | null;
  readonly transitionPlan: string | null;
  readonly viewport: string | null;
  readonly hasData: boolean | null;
  readonly childRoutes: readonly RouteConfigObservation[];
  readonly fallback: RouteableComponentObservation | null;
  readonly nav: boolean | null;
  readonly sourceNode: ts.Node;
  readonly fieldSourceNodes: RouteConfigFieldSourceNodes;
  readonly validationIssues: readonly RouteConfigValidationIssueObservation[];
  readonly localName: string | null;
}

interface RouteObjectConfigRead {
  readonly id: string | null;
  readonly paths: readonly string[];
  readonly pathSourceNode: ts.Node | null;
  readonly title: string | null;
  readonly component: RouteableComponentObservation | null;
  readonly redirectTo: string | null;
  readonly caseSensitive: boolean | null;
  readonly transitionPlan: string | null;
  readonly viewport: string | null;
  readonly hasData: boolean | null;
  readonly childRoutes: readonly RouteConfigObservation[];
  readonly fallback: RouteableComponentObservation | null;
  readonly nav: boolean | null;
  readonly fieldSourceNodes: RouteConfigFieldSourceNodes;
  readonly validationIssues: readonly RouteConfigValidationIssueObservation[];
  readonly localName: string | null;
}

interface RouteObjectPathRead {
  readonly paths: readonly string[];
  readonly pathSourceNode: ts.Node | null;
}

interface RouteObjectPropertyExpressions {
  readonly id: ts.Expression | null;
  readonly path: ts.Expression | null;
  readonly title: ts.Expression | null;
  readonly component: ts.Expression | null;
  readonly redirectTo: ts.Expression | null;
  readonly caseSensitive: ts.Expression | null;
  readonly transitionPlan: ts.Expression | null;
  readonly viewport: ts.Expression | null;
  readonly data: ts.Expression | null;
  readonly routes: ts.Expression | null;
  readonly fallback: ts.Expression | null;
  readonly nav: ts.Expression | null;
}

interface RouteConfigValidationIssueObservation {
  readonly phase: RouterIssuePhase;
  readonly issueKind:
    | RouterIssueKind.InvalidRouteConfig
    | RouterIssueKind.InvalidRouteConfigProperty
    | RouterIssueKind.UnknownRouteConfigProperty
    | RouterIssueKind.UnknownRedirectRouteConfigProperty
    | RouterIssueKind.ChildRouteLazyImportMissingPath
    | RouterIssueKind.InvalidLazyImport
    | RouterIssueKind.RouteableComponentNotFound;
  readonly message: string;
  readonly frameworkErrorCode: RouterFrameworkErrorCode;
  readonly property: string | null;
  readonly expected: string | null;
  readonly actual: string | null;
  readonly sourceNode: ts.Node;
}

class RouteableComponentEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly reference: RouteableComponentReference,
  ) {}
}

interface RouteConfigRouteableEmissions {
  readonly records: readonly KernelStoreRecord[];
  readonly component: RouteableComponentReference | null;
  readonly fallback: RouteableComponentReference | null;
}

interface RouteConfigSubtreeEmission {
  readonly records: readonly KernelStoreRecord[];
  /** Contribution emitted for this observation and referenced by its direct parent. */
  readonly rootContribution: RouteConfigContributionModel;
  /** Pre-order closure containing the root contribution and every nested child contribution. */
  readonly subtreeContributions: readonly RouteConfigContributionModel[];
  readonly issues: readonly RouterIssueModel[];
}

class RouteConfigValidationIssueEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly issues: readonly RouterIssueModel[],
  ) {}
}

class RouteConfigSourceRecords {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly source: SourceRecordSet,
    readonly pathSources: readonly SourceRecordSet[],
    readonly fieldSources: ReadonlyMap<RouteConfigField, SourceRecordSet>,
  ) {}
}

type RouteConfigFieldSourceNodes = Partial<Record<RouteConfigField, ts.Node>>;
type RouteConfigFieldSourceEntry = readonly [RouteConfigField, ts.Node | null | undefined] | null | undefined;
const ROUTE_CONFIG_SOURCE_FIELDS = [
  'id',
  'path',
  'title',
  'component',
  'redirectTo',
  'caseSensitive',
  'transitionPlan',
  'viewport',
  'data',
  'children',
  'fallback',
  'nav',
] as const satisfies readonly RouteConfigField[];

const ROUTE_CONFIG_VALUE_FIELDS = ROUTE_CONFIG_SOURCE_FIELDS satisfies readonly RouteConfigValueField[];

const ROUTE_CONFIG_ALLOWED_PROPERTIES = new Set([
  'id',
  'path',
  'title',
  'component',
  'redirectTo',
  'caseSensitive',
  'transitionPlan',
  'viewport',
  'data',
  'routes',
  'fallback',
  'nav',
]);

const REDIRECT_ROUTE_CONFIG_ALLOWED_PROPERTIES = new Set([
  'path',
  'redirectTo',
]);

/** Route configuration recognition result for one boot-admitted source file. */
export class RouteConfigRecognitionSourceResult {
  constructor(
    readonly admission: SourceFileAdmission,
    readonly moduleKey: string,
    readonly contributions: readonly RouteConfigContributionModel[],
    readonly issues: readonly RouterIssueModel[] = [],
  ) {}
}

/** Source-backed route configuration products recognized across one project frame. */
export class RouteConfigRecognitionProjectResult {
  constructor(
    readonly project: ProjectBootFrame,
    readonly sources: readonly RouteConfigRecognitionSourceResult[],
  ) {}

  readContributions(): readonly RouteConfigContributionModel[] {
    return this.sources.flatMap((source) => source.contributions);
  }

  readIssues(): readonly RouterIssueModel[] {
    return this.sources.flatMap((source) => source.issues);
  }
}

/** Recognize source-backed router route configs without executing navigation or recognizer state. */
export class RouteConfigRecognitionProjectPass {
  recognizeAndEmit(
    publication: KernelPublicationContext,
    project: ProjectBootFrame,
    evaluation: StaticProjectEvaluationResult,
    resourceIndex: ResourceDefinitionIndex,
    typeSystem: TypeSystemProject,
  ): RouteConfigRecognitionProjectResult {
    return new RouteConfigRecognitionProjectResult(
      project,
      evaluation.sources.map((source) =>
        this.recognizeSource(publication, project, source, resourceIndex, typeSystem)
      ),
    );
  }

  private recognizeSource(
    publication: KernelPublicationContext,
    project: ProjectBootFrame,
    source: StaticProjectEvaluationResult['sources'][number],
    resourceIndex: ResourceDefinitionIndex,
    typeSystem: TypeSystemProject,
  ): RouteConfigRecognitionSourceResult {
    if (!isEvaluatedProjectSource(source)) {
      return new RouteConfigRecognitionSourceResult(source.admission, source.moduleKey, [], []);
    }

    const context = new RouteConfigRecognitionContext(
      source.sourceFile,
      source.moduleKey,
      source.admission.addressHandle,
      project.projectKey,
      source,
      resourceIndex,
      typeSystem,
      new StaticSourceLiteralExpressionReader(),
    );
    const observations = recognizeRouteConfigs(context);
    const emittedSubtrees = new RouteConfigKernelEmitter(publication).emit(context, observations);
    return new RouteConfigRecognitionSourceResult(
      source.admission,
      source.moduleKey,
      emittedSubtrees.flatMap((subtree) => subtree.subtreeContributions),
      emittedSubtrees.flatMap((subtree) => subtree.issues),
    );
  }
}

class RouteConfigKernelEmitter {
  constructor(
    readonly publication: KernelPublicationContext,
  ) {}

  emit(
    context: RouteConfigRecognitionContext,
    observations: readonly RouteConfigObservation[],
  ): readonly RouteConfigSubtreeEmission[] {
    const emittedSubtrees = observations.map((observation, index) =>
      this.emitRouteConfigSubtree(context, observation, `${context.projectKey}:${context.moduleKey}:${index}`, null)
    );
    const records = emittedSubtrees.flatMap((subtree) => subtree.records);
    this.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(records, `router-route-config-contribution:${context.moduleKey}`),
      publishProductDetails(
        RouterProductDetails.RouteConfigContribution,
        emittedSubtrees.flatMap((subtree) => subtree.subtreeContributions),
      ),
    ));
    return emittedSubtrees;
  }

  private emitRouteConfigSubtree(
    context: RouteConfigRecognitionContext,
    observation: RouteConfigObservation,
    local: string,
    parentIdentityHandle: IdentityHandle | null,
  ): RouteConfigSubtreeEmission {
    const sources = this.recordsForRouteConfigSources(context, observation, local);
    const productHandle = this.publication.handles.product(`router-route-config-contribution:${local}`);
    const identityHandle = this.publication.handles.identity(`router-route-config-contribution:${local}`);
    const routeables = this.routeableComponentEmissions(context, observation, local, identityHandle);
    const childSubtrees = this.emitChildRouteConfigSubtrees(context, observation, local, identityHandle);
    const contribution = this.contributionModelForObservation(
      context,
      observation,
      sources,
      routeables.component,
      routeables.fallback,
      childSubtrees,
      productHandle,
      identityHandle,
    );
    const validationIssueRecords = this.validationIssueRecords(
      context,
      local,
      contribution,
      observation.validationIssues,
    );

    return {
      records: [
        ...sources.records,
        ...routeables.records,
        ...childSubtrees.flatMap((subtree) => subtree.records),
        ...validationIssueRecords.records,
        ...this.recordsForRouteConfigProduct(local, observation, sources, contribution, parentIdentityHandle),
      ],
      rootContribution: contribution,
      subtreeContributions: [
        contribution,
        ...childSubtrees.flatMap((subtree) => subtree.subtreeContributions),
      ],
      issues: [
        ...validationIssueRecords.issues,
        ...childSubtrees.flatMap((subtree) => subtree.issues),
      ],
    };
  }

  private routeableComponentEmissions(
    context: RouteConfigRecognitionContext,
    observation: RouteConfigObservation,
    local: string,
    ownerIdentityHandle: IdentityHandle,
  ): RouteConfigRouteableEmissions {
    const componentEmission = observation.component == null
      ? null
      : this.routeableComponentEmission(context, observation.component, `${local}:component`, ownerIdentityHandle);
    const fallbackEmission = observation.fallback == null
      ? null
      : this.routeableComponentEmission(context, observation.fallback, `${local}:fallback`, ownerIdentityHandle);
    return {
      records: [
        ...(componentEmission?.records ?? []),
        ...(fallbackEmission?.records ?? []),
      ],
      component: componentEmission?.reference ?? null,
      fallback: fallbackEmission?.reference ?? null,
    };
  }

  private emitChildRouteConfigSubtrees(
    context: RouteConfigRecognitionContext,
    observation: RouteConfigObservation,
    local: string,
    ownerIdentityHandle: IdentityHandle,
  ): readonly RouteConfigSubtreeEmission[] {
    return observation.childRoutes.map((child, index) =>
      this.emitRouteConfigSubtree(context, child, `${local}:child:${index}`, ownerIdentityHandle)
    );
  }

  private validationIssueRecords(
    context: RouteConfigRecognitionContext,
    local: string,
    contribution: RouteConfigContributionModel,
    issues: readonly RouteConfigValidationIssueObservation[],
  ): RouteConfigValidationIssueEmission {
    const records: KernelStoreRecord[] = [];
    const models: RouterIssueModel[] = [];
    for (let index = 0; index < issues.length; index += 1) {
      const observed = issues[index]!;
      const issueLocal = [
        'router-route-config-validation',
        local,
        index,
        localKeyPart(observed.property ?? observed.issueKind),
      ].join(':');
      const issueSource = this.recordsForSource(
        context,
        observed.sourceNode,
        `${issueLocal}:source`,
        'Router route configuration validation issue source.',
      );
      const sourceAddressHandle = issueSource.addressHandle;
      const model = new RouterIssueModel(
        this.publication.handles.product(issueLocal),
        this.publication.handles.identity(issueLocal),
        observed.phase,
        observed.issueKind,
        observed.message,
        'error',
        observed.frameworkErrorCode,
        contribution.toRouteConfigReference(),
        null,
        observed.property,
        observed.expected,
        observed.actual,
        null,
        contribution.paths[0] ?? null,
        contribution.redirectTo,
        null,
        sourceAddressHandle,
        [],
      );
      models.push(model);
      records.push(
        ...issueSource.records,
        ...routerIssueProductRecords(this.publication, {
          local: issueLocal,
          issue: model,
          ownerHandle: contribution.identityHandle,
          sourceAddressHandle,
          localName: observed.property ?? contribution.id ?? contribution.paths[0] ?? observed.issueKind,
          evidenceSummary: observed.message,
        }),
      );
    }
    return new RouteConfigValidationIssueEmission(records, models);
  }

  private contributionModelForObservation(
    context: RouteConfigRecognitionContext,
    observation: RouteConfigObservation,
    sources: RouteConfigSourceRecords,
    component: RouteableComponentReference | null,
    fallback: RouteableComponentReference | null,
    childSubtrees: readonly RouteConfigSubtreeEmission[],
    productHandle: ProductHandle,
    identityHandle: IdentityHandle,
  ): RouteConfigContributionModel {
    return new RouteConfigContributionModel(
      productHandle,
      identityHandle,
      observation.routeKind,
      observation.originKind,
      observation.valueKind,
      observation.executionKind,
      context.moduleKey,
      observation.sourceNode.getStart(context.sourceFile),
      observation.executionOrder,
      observation.id,
      observation.paths,
      observation.title,
      component,
      observation.redirectTo,
      observation.caseSensitive,
      observation.transitionPlan,
      observation.viewport,
      observation.hasData,
      childSubtrees.map((subtree) => subtree.rootContribution.toReference()),
      fallback,
      observation.nav,
      routeConfigFieldStates(context, observation, component, fallback),
      sources.source.addressHandle,
      sources.pathSources.map((source) => source.addressHandle),
      sources.fieldSources.get('redirectTo')?.addressHandle ?? null,
      routeConfigFieldProvenance(sources, observation, component, fallback),
    );
  }

  private recordsForRouteConfigProduct(
    local: string,
    observation: RouteConfigObservation,
    sources: RouteConfigSourceRecords,
    contribution: RouteConfigContributionModel,
    parentIdentityHandle: IdentityHandle | null,
  ): readonly KernelStoreRecord[] {
    return routerIdentityProductRecords(this.publication, {
      local: `router-route-config-contribution:${local}`,
      productHandle: contribution.productHandle,
      identityHandle: contribution.identityHandle,
      productKindKey: KernelVocabulary.Router.RouteConfigContribution.key,
      ownerHandle: parentIdentityHandle,
      materializationOwnerHandle: contribution.identityHandle,
      sourceAddressHandle: sources.source.addressHandle,
      localName: observation.localName,
      provenanceHandle: sources.source.provenanceHandle,
    });
  }

  private recordsForRouteConfigSources(
    context: RouteConfigRecognitionContext,
    observation: RouteConfigObservation,
    local: string,
  ): RouteConfigSourceRecords {
    const source = this.recordsForSource(
      context,
      observation.sourceNode,
      `router-route-config:${local}:source`,
      'Router route configuration source.',
    );
    const fieldSources = this.recordsForRouteConfigFieldSources(context, observation, local, source);
    const pathFieldSource = fieldSources.get('path') ?? null;
    const pathSources = routeConfigPathSourceNodes(observation).map((node, index) =>
      node === observation.fieldSourceNodes.path && pathFieldSource != null
        ? pathFieldSource
        : this.recordsForSource(
            context,
            node,
            `router-route-config:${local}:path:${index}`,
            'Router route path entry source.',
          )
    );
    return new RouteConfigSourceRecords(
      [
        ...source.records,
        ...uniqueRouteSourceRecordSets([...fieldSources.values(), ...pathSources], source)
          .flatMap((fieldSource) => fieldSource.records),
      ],
      source,
      pathSources,
      fieldSources,
    );
  }

  private recordsForRouteConfigFieldSources(
    context: RouteConfigRecognitionContext,
    observation: RouteConfigObservation,
    local: string,
    source: SourceRecordSet,
  ): ReadonlyMap<RouteConfigField, SourceRecordSet> {
    const sources = new Map<RouteConfigField, SourceRecordSet>();
    const knownSources = new Map<ts.Node, SourceRecordSet>([[observation.sourceNode, source]]);
    const fieldsByNode = new Map<ts.Node, RouteConfigField[]>();
    for (const [field, node] of routeConfigFieldSourceEntries(observation)) {
      const existing = knownSources.get(node) ?? null;
      if (existing != null) {
        sources.set(field, existing);
        continue;
      }
      let fields = fieldsByNode.get(node);
      if (fields === undefined) {
        fields = [];
        fieldsByNode.set(node, fields);
      }
      fields.push(field);
    }
    for (const [node, fields] of fieldsByNode) {
      const fieldSource = this.recordsForSource(
        context,
        node,
        `router-route-config:${local}:${routeFieldSourceLocalSuffix(fields)}`,
        routeFieldSourceSummary(fields),
      );
      knownSources.set(node, fieldSource);
      for (const field of fields) {
        sources.set(field, fieldSource);
      }
    }
    return sources;
  }

  private routeableComponentEmission(
    context: RouteConfigRecognitionContext,
    observation: RouteableComponentObservation,
    local: string,
    ownerIdentityHandle: IdentityHandle,
  ): RouteableComponentEmission {
    const source = this.recordsForSource(
      context,
      observation.sourceNode,
      `router-routeable:${local}:source`,
      'Router routeable component reference.',
    );
    const productHandle = this.publication.handles.product(`router-routeable:${local}`);
    const identityHandle = this.publication.handles.identity(`router-routeable:${local}`);
    const routeable = this.routeableComponentModel(observation, source, productHandle, identityHandle);
    return new RouteableComponentEmission(
      [
        ...source.records,
        ...this.recordsForRouteableComponentProduct(local, observation, source, productHandle, identityHandle, ownerIdentityHandle),
      ],
      routeable.toReference(),
    );
  }

  private routeableComponentModel(
    observation: RouteableComponentObservation,
    source: SourceRecordSet,
    productHandle: ProductHandle,
    identityHandle: IdentityHandle,
  ): RouteableComponentModel {
    return new RouteableComponentModel(
      productHandle,
      identityHandle,
      observation.componentKind,
      observation.resourceDefinition?.productHandle ?? null,
      observation.resourceDefinition?.target.identityHandle ?? null,
      source.addressHandle,
      observation.localName,
      observation.resourceDefinition?.type === ResourceDefinitionKind.CustomElement
        ? observation.resourceDefinition.name
        : null,
    );
  }

  private recordsForRouteableComponentProduct(
    local: string,
    observation: RouteableComponentObservation,
    source: SourceRecordSet,
    productHandle: ProductHandle,
    identityHandle: IdentityHandle,
    ownerIdentityHandle: IdentityHandle,
  ): readonly KernelStoreRecord[] {
    return routerIdentityProductRecords(this.publication, {
      local: `router-routeable:${local}`,
      productHandle,
      identityHandle,
      productKindKey: KernelVocabulary.Router.RouteableComponent.key,
      ownerHandle: ownerIdentityHandle,
      sourceAddressHandle: source.addressHandle,
      localName: observation.localName,
      provenanceHandle: source.provenanceHandle,
    });
  }

  private recordsForSource(
    context: RouteConfigRecognitionContext,
    node: ts.Node,
    local: string,
    evidenceSummary: string,
  ): SourceRecordSet {
    const addressHandle = this.publication.handles.address(local);
    const evidenceHandle = this.publication.handles.evidence(local);
    const provenanceHandle = this.publication.handles.provenance(local);
    return new SourceRecordSet(
      [
        new SourceSpanAddress(
          addressHandle,
          context.sourceFileAddressHandle,
          node.getStart(context.sourceFile),
          node.end,
          SourceSpanRole.Range,
        ),
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.ConfigurationFlow,
          [EvidenceRole.Configuration],
          evidenceSummary,
          addressHandle,
        ),
        new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
      ],
      addressHandle,
      evidenceHandle,
      provenanceHandle,
    );
  }
}

function recognizeRouteConfigs(
  context: RouteConfigRecognitionContext,
): readonly RouteConfigObservation[] {
  const bindings = readRouterImportedBindings(context.sourceFile);
  const executionsByCall = new Map<ts.CallExpression, StaticInvocationOccurrence<ts.CallExpression>[]>();
  for (const invocation of context.evaluation.evaluation.invocations) {
    if (!isStaticCallInvocationOccurrence(invocation)) {
      continue;
    }
    const executions = executionsByCall.get(invocation.node);
    if (executions == null) {
      executionsByCall.set(invocation.node, [invocation]);
    } else {
      executions.push(invocation);
    }
  }
  const observations: RouteConfigObservation[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      observations.push(...recognizeRouteDecorators(context, bindings, node));
    }
    if (ts.isCallExpression(node)) {
      const executions = executionsByCall.get(node) ?? [];
      if (executions.length === 0) {
        const configured = recognizeRouteConfigureCall(context, bindings, node, null);
        if (configured != null) {
          observations.push(configured);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(context.sourceFile);
  for (const executions of executionsByCall.values()) {
    for (const execution of executions) {
      const configured = recognizeRouteConfigureCall(
        context.withExpressionReader(new StaticInvocationEvidenceExpressionReader(
          execution.moduleKey,
          [execution],
        )),
        bindings,
        execution.node,
        execution.ordinal,
      );
      if (configured != null) {
        observations.push(configured);
      }
    }
  }
  return observations.sort((left, right) =>
    compareRouteConfigObservations(context.sourceFile, left, right)
  );
}

function compareRouteConfigObservations(
  sourceFile: ts.SourceFile,
  left: RouteConfigObservation,
  right: RouteConfigObservation,
): number {
  if (left.executionOrder != null && right.executionOrder != null) {
    return left.executionOrder - right.executionOrder;
  }
  return left.sourceNode.getStart(sourceFile) - right.sourceNode.getStart(sourceFile);
}

function executionKindForOrigin(originKind: RouteConfigOriginKind): RouteConfigExecutionKind {
  switch (originKind) {
    case RouteConfigOriginKind.ConfigureCall:
      return RouteConfigExecutionKind.Unproven;
    case RouteConfigOriginKind.ChildRoutesProperty:
      return RouteConfigExecutionKind.Embedded;
    case RouteConfigOriginKind.RouteDecorator:
    case RouteConfigOriginKind.ClassStaticDefaults:
    case RouteConfigOriginKind.DynamicHook:
      return RouteConfigExecutionKind.Declarative;
  }
}

function recognizeRouteDecorators(
  context: RouteConfigRecognitionContext,
  bindings: RouterImportedBindings,
  classNode: ts.ClassLikeDeclarationBase,
): readonly RouteConfigObservation[] {
  const decorators = ts.canHaveDecorators(classNode)
    ? ts.getDecorators(classNode) ?? []
    : [];
  const observations: RouteConfigObservation[] = [];
  const classTarget = readClassTarget(classNode);
  const component = routeableComponentForClass(context, classNode);
  const typeDefaults = readRouteTypeDefaults(context, classNode, component);

  for (const decorator of decorators) {
    const call = routeDecoratorCall(decorator, bindings);
    if (call == null) {
      continue;
    }
    const argument = call.arguments[0] ?? null;
    observations.push(
      readRouteConfigObservation(
        context,
        argument,
        RouteConfigKind.Route,
        RouteConfigOriginKind.RouteDecorator,
        component,
        decorator,
        component,
      )
    );
  }

  if (component?.resourceDefinition != null && hasRouteTypeDefaults(typeDefaults)) {
    observations.push(
      routeConfigFromTypeDefaults(typeDefaults, component, classNode)
    );
  }

  const dynamicHook = classNode.members.find((member) =>
    !hasStaticModifier(member)
    && 'name' in member
    && member.name != null
    && readPropertyName(member.name) === 'getRouteConfig'
  );
  if (component?.resourceDefinition != null && dynamicHook != null) {
    observations.push({
      ...openRouteConfigObservation(
        RouteConfigKind.Route,
        RouteConfigOriginKind.DynamicHook,
        component,
        dynamicHook,
      ),
      executionKind: RouteConfigExecutionKind.Declarative,
    });
  }

  return observations.map((observation) => ({
    ...observation,
    localName: classTarget.localName ?? observation.localName,
  }));
}

function recognizeRouteConfigureCall(
  context: RouteConfigRecognitionContext,
  bindings: RouterImportedBindings,
  call: ts.CallExpression,
  executionOrder: number | null,
): RouteConfigObservation | null {
  const expression = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== 'configure') {
    return null;
  }
  if (!isRouteObjectExpression(expression.expression, bindings)) {
    return null;
  }
  const configExpression = call.arguments[0] ?? null;
  const typeExpression = call.arguments[1] ?? null;
  const component = typeExpression == null || ts.isSpreadElement(typeExpression)
    ? null
    : routeableComponentForExpression(context, typeExpression);
  return {
    ...readRouteConfigObservation(
    context,
    configExpression,
    RouteConfigKind.Route,
    RouteConfigOriginKind.ConfigureCall,
    component,
    call,
    ),
    executionKind: executionOrder == null
      ? RouteConfigExecutionKind.Unproven
      : RouteConfigExecutionKind.Executed,
    executionOrder,
  };
}

function readRouteConfigObservation(
  context: RouteConfigRecognitionContext,
  expression: ts.Expression | null,
  routeKind: RouteConfigKind,
  originKind: RouteConfigOriginKind,
  fallbackComponent: RouteableComponentObservation | null,
  sourceNode: ts.Node,
  routeContextComponent: RouteableComponentObservation | null = null,
): RouteConfigObservation {
  if (expression == null || ts.isSpreadElement(expression)) {
    return openRouteConfigObservation(routeKind, originKind, fallbackComponent, sourceNode);
  }
  const current = unwrapExpression(expression);
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current) || ts.isArrayLiteralExpression(current)) {
    return routeConfigFromPathExpression(context, current, routeKind, originKind, fallbackComponent, sourceNode);
  }
  if (ts.isObjectLiteralExpression(current)) {
    return routeConfigFromObject(context, current, routeKind, originKind, fallbackComponent, sourceNode, '', routeContextComponent);
  }
  const validationValue = evaluatedRouteConfigValidationValue(context, current);
  if (validationValue?.kind === EvaluationValueKind.Null) {
    return openRouteConfigObservation(
      routeKind,
      originKind,
      routeableComponentForExpression(context, current, routeContextComponent) ?? fallbackComponent,
      current,
      [invalidRouteConfigIssue(current, validationValue)],
    );
  }
  return openRouteConfigObservation(routeKind, originKind, routeableComponentForExpression(context, current, routeContextComponent) ?? fallbackComponent, current);
}

function routeConfigFromPathExpression(
  context: RouteConfigRecognitionContext,
  expression: ts.Expression,
  routeKind: RouteConfigKind,
  originKind: RouteConfigOriginKind,
  fallbackComponent: RouteableComponentObservation | null,
  sourceNode: ts.Node,
): RouteConfigObservation {
  const paths = readStringArrayValue(context, expression) ?? [];
  const pathSourceNode = paths.length === 0 ? null : expression;
  return {
    routeKind,
    originKind,
    valueKind: RouteConfigValueKind.PathExpression,
    executionKind: executionKindForOrigin(originKind),
    executionOrder: null,
    id: paths[0] ?? null,
    paths,
    pathSourceNode,
    title: null,
    component: fallbackComponent,
    redirectTo: null,
    caseSensitive: null,
    transitionPlan: null,
    viewport: null,
    hasData: null,
    childRoutes: [],
    fallback: null,
    nav: null,
    sourceNode,
    fieldSourceNodes: routeConfigFieldSourceNodes([
      ['id', pathSourceNode],
      ['path', pathSourceNode],
      fallbackComponent == null ? null : ['component', fallbackComponent.sourceNode],
    ]),
    validationIssues: [],
    localName: fallbackComponent?.localName ?? paths[0] ?? null,
  };
}

function routeConfigFromObject(
  context: RouteConfigRecognitionContext,
  object: ts.ObjectLiteralExpression,
  routeKind: RouteConfigKind,
  originKind: RouteConfigOriginKind,
  fallbackComponent: RouteableComponentObservation | null,
  sourceNode: ts.Node,
  parentPath: string,
  routeContextComponent: RouteableComponentObservation | null,
): RouteConfigObservation {
  const read = readRouteObjectConfig(context, object, routeKind, fallbackComponent, parentPath, routeContextComponent);
  return {
    routeKind: routeObjectKind(routeKind, read),
    originKind,
    valueKind: RouteConfigValueKind.ObjectLiteral,
    executionKind: executionKindForOrigin(originKind),
    executionOrder: null,
    id: read.id,
    paths: read.paths,
    pathSourceNode: read.pathSourceNode,
    title: read.title,
    component: read.component,
    redirectTo: read.redirectTo,
    caseSensitive: read.caseSensitive,
    transitionPlan: read.transitionPlan,
    viewport: read.viewport,
    hasData: read.hasData,
    childRoutes: read.childRoutes,
    fallback: read.fallback,
    nav: read.nav,
    sourceNode,
    fieldSourceNodes: read.fieldSourceNodes,
    validationIssues: read.validationIssues,
    localName: read.localName,
  };
}

function readRouteObjectConfig(
  context: RouteConfigRecognitionContext,
  object: ts.ObjectLiteralExpression,
  routeKind: RouteConfigKind,
  fallbackComponent: RouteableComponentObservation | null,
  parentPath: string,
  routeContextComponent: RouteableComponentObservation | null,
): RouteObjectConfigRead {
  const expressions = readRouteObjectPropertyExpressions(object);
  const path = readRouteObjectPaths(context, object);
  const component = readRouteObjectComponent(context, object, fallbackComponent, routeContextComponent);
  const fallback = readRouteObjectFallback(context, object, routeContextComponent);
  const redirectTo = readStringValueOrNull(context, expressions.redirectTo);
  const childRoutes = readRouteObjectChildRoutes(context, object, propertyPath(parentPath, 'routes'), component);
  const objectId = readStringValueOrNull(context, expressions.id);
  const id = objectId ?? path.paths[0] ?? null;

  const validationIssues = [
    ...routeObjectValidationIssues(context, object, routeKind, expressions, parentPath),
    ...childRouteLazyImportMissingPathIssues(routeKind, parentPath, object, expressions, component),
    ...invalidLazyImportIssues(propertyPath(parentPath, 'component'), component),
    ...invalidLazyImportIssues(propertyPath(parentPath, 'fallback'), fallback),
    ...unresolvedStringRouteableIssues(propertyPath(parentPath, 'component'), component),
    ...unresolvedStringRouteableIssues(propertyPath(parentPath, 'fallback'), fallback),
  ];
  return {
    id,
    paths: path.paths,
    pathSourceNode: path.pathSourceNode,
    title: readStringValueOrNull(context, expressions.title),
    component,
    redirectTo,
    caseSensitive: readBooleanValueOrNull(context, expressions.caseSensitive),
    transitionPlan: readStringValueOrNull(context, expressions.transitionPlan),
    viewport: readStringValueOrNull(context, expressions.viewport),
    hasData: expressions.data != null ? true : null,
    childRoutes,
    fallback,
    nav: readBooleanValueOrNull(context, expressions.nav),
    fieldSourceNodes: routeObjectConfigFieldSourceNodes(expressions, path, component, childRoutes),
    validationIssues,
    localName: objectId ?? component?.localName ?? path.paths[0] ?? null,
  };
}

function readRouteObjectPropertyExpressions(
  object: ts.ObjectLiteralExpression,
): RouteObjectPropertyExpressions {
  return {
    id: readObjectPropertyExpression(object, 'id'),
    path: readObjectPropertyExpression(object, 'path'),
    title: readObjectPropertyExpression(object, 'title'),
    component: readObjectPropertyExpression(object, 'component'),
    redirectTo: readObjectPropertyExpression(object, 'redirectTo'),
    caseSensitive: readObjectPropertyExpression(object, 'caseSensitive'),
    transitionPlan: readObjectPropertyExpression(object, 'transitionPlan'),
    viewport: readObjectPropertyExpression(object, 'viewport'),
    data: readObjectPropertyExpression(object, 'data'),
    routes: readObjectPropertyExpression(object, 'routes'),
    fallback: readObjectPropertyExpression(object, 'fallback'),
    nav: readObjectPropertyExpression(object, 'nav'),
  };
}

function routeObjectValidationIssues(
  context: RouteConfigRecognitionContext,
  object: ts.ObjectLiteralExpression,
  routeKind: RouteConfigKind,
  expressions: RouteObjectPropertyExpressions,
  parentPath: string,
): readonly RouteConfigValidationIssueObservation[] {
  const issues: RouteConfigValidationIssueObservation[] = [];
  if (routeKind === RouteConfigKind.Redirect) {
    addPathPropertyIssues(context, issues, propertyPath(parentPath, 'path'), expressions.path);
    addStringPropertyIssue(context, issues, propertyPath(parentPath, 'redirectTo'), expressions.redirectTo);
    addUnknownRouteObjectPropertyIssues(issues, object, parentPath, REDIRECT_ROUTE_CONFIG_ALLOWED_PROPERTIES, true);
    return issues;
  }
  addStringPropertyIssue(context, issues, propertyPath(parentPath, 'id'), expressions.id);
  addStringPropertyIssue(context, issues, propertyPath(parentPath, 'viewport'), expressions.viewport);
  addStringPropertyIssue(context, issues, propertyPath(parentPath, 'redirectTo'), expressions.redirectTo);
  addBooleanPropertyIssue(context, issues, propertyPath(parentPath, 'caseSensitive'), expressions.caseSensitive);
  addBooleanPropertyIssue(context, issues, propertyPath(parentPath, 'nav'), expressions.nav);
  addDataPropertyIssue(context, issues, propertyPath(parentPath, 'data'), expressions.data);
  addTitlePropertyIssue(context, issues, propertyPath(parentPath, 'title'), expressions.title);
  addTransitionPlanPropertyIssue(context, issues, propertyPath(parentPath, 'transitionPlan'), expressions.transitionPlan);
  addPathPropertyIssues(context, issues, propertyPath(parentPath, 'path'), expressions.path);
  addRoutesPropertyIssue(context, issues, propertyPath(parentPath, 'routes'), expressions.routes);
  addRouteablePropertyIssue(context, issues, propertyPath(parentPath, 'component'), expressions.component);
  addRouteablePropertyIssue(context, issues, propertyPath(parentPath, 'fallback'), expressions.fallback);
  addUnknownRouteObjectPropertyIssues(issues, object, parentPath, ROUTE_CONFIG_ALLOWED_PROPERTIES, false);
  return issues;
}

function addUnknownRouteObjectPropertyIssues(
  issues: RouteConfigValidationIssueObservation[],
  object: ts.ObjectLiteralExpression,
  parentPath: string,
  allowed: ReadonlySet<string>,
  redirectConfig: boolean,
): void {
  for (const property of object.properties) {
    if (ts.isSpreadAssignment(property)) {
      continue;
    }
    const name = readPropertyName(property.name);
    if (name == null || allowed.has(name)) {
      continue;
    }
    issues.push(unknownRouteConfigPropertyIssue(parentPath, name, property.name, redirectConfig));
  }
}

function unknownRouteConfigPropertyIssue(
  parentPath: string,
  property: string,
  sourceNode: ts.Node,
  redirectConfig: boolean,
): RouteConfigValidationIssueObservation {
  return {
    phase: RouterIssuePhase.RouteConfigValidation,
    issueKind: redirectConfig
      ? RouterIssueKind.UnknownRedirectRouteConfigProperty
      : RouterIssueKind.UnknownRouteConfigProperty,
    frameworkErrorCode: redirectConfig
      ? RouterFrameworkErrorCode.UnknownRedirectRouteConfigProperty
      : RouterFrameworkErrorCode.UnknownRouteConfigProperty,
    property: propertyPath(parentPath, property),
    expected: redirectConfig ? 'redirect route config property' : 'route config property',
    actual: property,
    message: redirectConfig
      ? `Invalid redirect route config at '${parentPath}': unknown property '${property}'.`
      : `Invalid route config at '${parentPath}': unknown property '${property}'.`,
    sourceNode,
  };
}

function childRouteLazyImportMissingPathIssues(
  routeKind: RouteConfigKind,
  parentPath: string,
  object: ts.ObjectLiteralExpression,
  expressions: RouteObjectPropertyExpressions,
  component: RouteableComponentObservation | null,
): readonly RouteConfigValidationIssueObservation[] {
  if (
    routeKind !== RouteConfigKind.ChildRoute
    || expressions.path != null
    || component?.componentKind !== RouteableComponentKind.Promise
  ) {
    return [];
  }
  return [{
    phase: RouterIssuePhase.RouteConfigContextChildRouteConfiguration,
    issueKind: RouterIssueKind.ChildRouteLazyImportMissingPath,
    frameworkErrorCode: RouterFrameworkErrorCode.ChildRouteLazyImportMissingPath,
    property: propertyPath(parentPath, 'path'),
    expected: 'path for lazy child route component',
    actual: 'missing',
    message: 'Invalid route config. When the component property is a lazy import, the path must be specified.',
    sourceNode: object,
  }];
}

function invalidLazyImportIssues(
  property: string,
  component: RouteableComponentObservation | null,
): readonly RouteConfigValidationIssueObservation[] {
  if (component?.invalidLazyImport !== true) {
    return [];
  }
  return [{
    phase: RouterIssuePhase.RouteContextLazyImportResolution,
    issueKind: RouterIssueKind.InvalidLazyImport,
    frameworkErrorCode: RouterFrameworkErrorCode.InvalidLazyImport,
    property,
    expected: 'custom element type or partial custom element definition',
    actual: 'non-component lazy import fulfillment',
    message: 'Lazy route import does not appear to be a component or CustomElement recognizable by Aurelia; make sure to use the @customElement decorator for your class if not using conventions.',
    sourceNode: component.sourceNode,
  }];
}

function unresolvedStringRouteableIssues(
  property: string,
  component: RouteableComponentObservation | null,
): readonly RouteConfigValidationIssueObservation[] {
  if (
    component?.componentKind !== RouteableComponentKind.CustomElementName
    || component.resourceDefinition != null
  ) {
    return [];
  }
  const name = component.localName ?? '(anonymous-routeable)';
  return [{
    phase: RouterIssuePhase.RouteableComponentResolution,
    issueKind: RouterIssueKind.RouteableComponentNotFound,
    frameworkErrorCode: RouterFrameworkErrorCode.RouteableComponentNotFound,
    property,
    expected: 'custom element definition visible to the route context',
    actual: name,
    message: `String routeable component "${name}" does not resolve to a CustomElement definition visible to semantic-runtime.`,
    sourceNode: component.sourceNode,
  }];
}

function addStringPropertyIssue(
  context: RouteConfigRecognitionContext,
  issues: RouteConfigValidationIssueObservation[],
  property: string,
  expression: ts.Expression | null,
): void {
  const value = evaluatedRouteConfigValidationValue(context, expression);
  if (value == null || value.kind === EvaluationValueKind.String) {
    return;
  }
  issues.push(invalidRouteConfigPropertyIssue(property, 'string', expression!, value));
}

function addBooleanPropertyIssue(
  context: RouteConfigRecognitionContext,
  issues: RouteConfigValidationIssueObservation[],
  property: string,
  expression: ts.Expression | null,
): void {
  const value = evaluatedRouteConfigValidationValue(context, expression);
  if (value == null || value.kind === EvaluationValueKind.Boolean) {
    return;
  }
  issues.push(invalidRouteConfigPropertyIssue(property, 'boolean', expression!, value));
}

function addDataPropertyIssue(
  context: RouteConfigRecognitionContext,
  issues: RouteConfigValidationIssueObservation[],
  property: string,
  expression: ts.Expression | null,
): void {
  const value = evaluatedRouteConfigValidationValue(context, expression);
  if (value == null || routeConfigValueIsNonNullObject(value)) {
    return;
  }
  issues.push(invalidRouteConfigPropertyIssue(property, 'object', expression!, value));
}

function addTitlePropertyIssue(
  context: RouteConfigRecognitionContext,
  issues: RouteConfigValidationIssueObservation[],
  property: string,
  expression: ts.Expression | null,
): void {
  const value = evaluatedRouteConfigValidationValue(context, expression);
  if (value == null || value.kind === EvaluationValueKind.String || routeConfigValueIsFunction(value)) {
    return;
  }
  issues.push(invalidRouteConfigPropertyIssue(property, 'string or function', expression!, value));
}

function addTransitionPlanPropertyIssue(
  context: RouteConfigRecognitionContext,
  issues: RouteConfigValidationIssueObservation[],
  property: string,
  expression: ts.Expression | null,
): void {
  const value = evaluatedRouteConfigValidationValue(context, expression);
  if (value == null || routeConfigValueIsFunction(value)) {
    return;
  }
  if (
    value.kind === EvaluationValueKind.String
    && (value.value === 'none' || value.value === 'replace' || value.value === 'invoke-lifecycles')
  ) {
    return;
  }
  issues.push(invalidRouteConfigPropertyIssue(property, "string('none'|'replace'|'invoke-lifecycles') or function", expression!, value));
}

function addPathPropertyIssues(
  context: RouteConfigRecognitionContext,
  issues: RouteConfigValidationIssueObservation[],
  property: string,
  expression: ts.Expression | null,
): void {
  const value = evaluatedRouteConfigValidationValue(context, expression);
  if (value == null || value.kind === EvaluationValueKind.String) {
    return;
  }
  if (value.kind !== EvaluationValueKind.Array) {
    issues.push(invalidRouteConfigPropertyIssue(property, 'string or Array of strings', expression!, value));
    return;
  }
  if (value.mayHaveUnknownElements || value.mayHaveUnknownOrder) {
    return;
  }
  for (let index = 0; index < value.elements.length; index += 1) {
    const element = value.elements[index]!;
    if (element.value.kind !== EvaluationValueKind.String) {
      issues.push(invalidRouteConfigPropertyIssue(
        `${property}[${index}]`,
        'string',
        element.expression ?? expression!,
        element.value,
      ));
    }
  }
}

function addRoutesPropertyIssue(
  context: RouteConfigRecognitionContext,
  issues: RouteConfigValidationIssueObservation[],
  property: string,
  expression: ts.Expression | null,
): void {
  const value = evaluatedRouteConfigValidationValue(context, expression);
  if (value == null || value.kind === EvaluationValueKind.Array) {
    return;
  }
  issues.push(invalidRouteConfigPropertyIssue(property, 'Array', expression!, value));
}

function addRouteablePropertyIssue(
  context: RouteConfigRecognitionContext,
  issues: RouteConfigValidationIssueObservation[],
  property: string,
  expression: ts.Expression | null,
): void {
  const value = evaluatedRouteConfigValidationValue(context, expression);
  if (
    value == null
    || value.kind === EvaluationValueKind.String
    || routeConfigValueIsFunction(value)
    || routeConfigValueIsNonNullObject(value)
    || value.kind === EvaluationValueKind.Promise
  ) {
    return;
  }
  issues.push(invalidRouteConfigPropertyIssue(property, 'function, object or string (see Routeable)', expression!, value));
}

function evaluatedRouteConfigValidationValue(
  context: RouteConfigRecognitionContext,
  expression: ts.Expression | null,
): EvaluationValue | null {
  if (expression == null) {
    return null;
  }
  const value = context.expressionReader.evaluateExpression(expression).value;
  return value == null || value.kind === EvaluationValueKind.Unknown || value.kind === EvaluationValueKind.BoundaryValue
    ? null
    : value;
}

function routeConfigValueIsFunction(value: EvaluationValue): boolean {
  return value.kind === EvaluationValueKind.Function || value.kind === EvaluationValueKind.Class;
}

function routeConfigValueIsNonNullObject(value: EvaluationValue): boolean {
  switch (value.kind) {
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.Instance:
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.RegularExpression:
      return true;
    default:
      return false;
  }
}

function invalidRouteConfigPropertyIssue(
  property: string,
  expected: string,
  expression: ts.Expression,
  actualValue: EvaluationValue,
): RouteConfigValidationIssueObservation {
  const actual = routeConfigValueDisplay(actualValue);
  return {
    phase: RouterIssuePhase.RouteConfigValidation,
    issueKind: RouterIssueKind.InvalidRouteConfigProperty,
    frameworkErrorCode: RouterFrameworkErrorCode.InvalidRouteConfigProperty,
    property,
    expected,
    actual,
    message: `Invalid route config property: "${property}". Expected ${expected}, but got ${actual}.`,
    sourceNode: expression,
  };
}

function invalidRouteConfigIssue(
  expression: ts.Expression,
  actualValue: EvaluationValue,
): RouteConfigValidationIssueObservation {
  const actual = routeConfigValueDisplay(actualValue);
  return {
    phase: RouterIssuePhase.RouteConfigValidation,
    issueKind: RouterIssueKind.InvalidRouteConfig,
    frameworkErrorCode: RouterFrameworkErrorCode.InvalidRouteConfig,
    property: null,
    expected: 'object or string',
    actual,
    message: `Invalid route config: expected an object or string, but got: ${actual}`,
    sourceNode: expression,
  };
}

function routeConfigValueDisplay(value: EvaluationValue): string {
  switch (value.kind) {
    case EvaluationValueKind.Undefined:
      return 'undefined';
    case EvaluationValueKind.Null:
      return 'null';
    case EvaluationValueKind.String:
      return JSON.stringify(value.value);
    case EvaluationValueKind.Boolean:
    case EvaluationValueKind.Number:
      return String(value.value);
    case EvaluationValueKind.BigInt:
      return `${value.text}n`;
    case EvaluationValueKind.Array:
      return 'array';
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
      return 'function';
    default:
      return value.kind;
  }
}

function propertyPath(parentPath: string, property: string): string {
  return parentPath.length === 0 ? property : `${parentPath}.${property}`;
}

function routeObjectConfigFieldSourceNodes(
  expressions: RouteObjectPropertyExpressions,
  path: RouteObjectPathRead,
  component: RouteableComponentObservation | null,
  childRoutes: readonly RouteConfigObservation[],
): RouteConfigFieldSourceNodes {
  return routeConfigFieldSourceNodes([
    ['id', expressions.id ?? path.pathSourceNode],
    ['path', path.pathSourceNode],
    ['title', expressions.title],
    component == null ? null : ['component', expressions.component ?? component.sourceNode],
    ['redirectTo', expressions.redirectTo],
    ['caseSensitive', expressions.caseSensitive],
    ['transitionPlan', expressions.transitionPlan],
    ['viewport', expressions.viewport],
    ['data', expressions.data],
    childRoutes.length === 0 ? null : ['children', expressions.routes],
    ['fallback', expressions.fallback],
    ['nav', expressions.nav],
  ]);
}

function readRouteObjectPaths(
  context: RouteConfigRecognitionContext,
  object: ts.ObjectLiteralExpression,
): RouteObjectPathRead {
  const pathExpression = readObjectPropertyExpression(object, 'path');
  const objectPaths = pathExpression == null ? null : readStringArrayValue(context, pathExpression);
  return {
    paths: objectPaths ?? [],
    pathSourceNode: objectPaths == null ? null : pathExpression,
  };
}

function readRouteObjectComponent(
  context: RouteConfigRecognitionContext,
  object: ts.ObjectLiteralExpression,
  fallbackComponent: RouteableComponentObservation | null,
  routeContextComponent: RouteableComponentObservation | null,
): RouteableComponentObservation | null {
  const componentExpression = readObjectPropertyExpression(object, 'component');
  return componentExpression == null
    ? fallbackComponent
    : routeableComponentForExpression(context, componentExpression, routeContextComponent);
}

function readRouteObjectChildRoutes(
  context: RouteConfigRecognitionContext,
  object: ts.ObjectLiteralExpression,
  parentPath: string,
  routeContextComponent: RouteableComponentObservation | null,
): readonly RouteConfigObservation[] {
  return readChildRouteObservations(context, readObjectPropertyExpression(object, 'routes'), parentPath, routeContextComponent);
}

function readRouteObjectFallback(
  context: RouteConfigRecognitionContext,
  object: ts.ObjectLiteralExpression,
  routeContextComponent: RouteableComponentObservation | null,
): RouteableComponentObservation | null {
  return routeableComponentForExpression(context, readObjectPropertyExpression(object, 'fallback'), routeContextComponent);
}

function routeObjectKind(
  routeKind: RouteConfigKind,
  read: RouteObjectConfigRead,
): RouteConfigKind {
  return routeKind === RouteConfigKind.ChildRoute
    ? RouteConfigKind.ChildRoute
    : read.redirectTo != null && read.component == null
      ? RouteConfigKind.Redirect
      : routeKind;
}

function routeConfigFromTypeDefaults(
  typeDefaults: RouteTypeDefaults,
  fallbackComponent: RouteableComponentObservation | null,
  sourceNode: ts.Node,
): RouteConfigObservation {
  const paths = typeDefaults.paths ?? [];
  return {
    routeKind: RouteConfigKind.Route,
    originKind: RouteConfigOriginKind.ClassStaticDefaults,
    valueKind: RouteConfigValueKind.ClassStaticDefaults,
    executionKind: RouteConfigExecutionKind.Declarative,
    executionOrder: null,
    id: typeDefaults.id ?? paths[0] ?? null,
    paths,
    pathSourceNode: typeDefaults.pathSourceNode,
    title: typeDefaults.title,
    component: fallbackComponent,
    redirectTo: typeDefaults.redirectTo,
    caseSensitive: typeDefaults.caseSensitive,
    transitionPlan: typeDefaults.transitionPlan,
    viewport: typeDefaults.viewport,
    hasData: typeDefaults.hasData,
    childRoutes: typeDefaults.childRoutes,
    fallback: typeDefaults.fallback,
    nav: typeDefaults.nav,
    sourceNode,
    fieldSourceNodes: routeConfigFieldSourceNodes([
      ...routeTypeDefaultFieldSourceEntries(typeDefaults),
      fallbackComponent == null ? null : ['component', fallbackComponent.sourceNode],
    ]),
    validationIssues: [],
    localName: fallbackComponent?.localName ?? typeDefaults.id ?? paths[0] ?? null,
  };
}

function openRouteConfigObservation(
  routeKind: RouteConfigKind,
  originKind: RouteConfigOriginKind,
  component: RouteableComponentObservation | null,
  sourceNode: ts.Node,
  validationIssues: readonly RouteConfigValidationIssueObservation[] = [],
): RouteConfigObservation {
  return {
    routeKind: component == null ? RouteConfigKind.Open : routeKind,
    originKind,
    valueKind: RouteConfigValueKind.OpenExpression,
    executionKind: executionKindForOrigin(originKind),
    executionOrder: null,
    id: null,
    paths: [],
    pathSourceNode: null,
    title: null,
    component,
    redirectTo: null,
    caseSensitive: null,
    transitionPlan: null,
    viewport: null,
    hasData: null,
    childRoutes: [],
    fallback: null,
    nav: null,
    sourceNode,
    fieldSourceNodes: routeConfigFieldSourceNodes([
      component == null ? null : ['component', component.sourceNode],
    ]),
    validationIssues,
    localName: component?.localName ?? (ts.isExpression(sourceNode) ? readReferenceName(sourceNode) : null),
  };
}

function readChildRouteObservations(
  context: RouteConfigRecognitionContext,
  expression: ts.Expression | null,
  parentPath: string,
  routeContextComponent: RouteableComponentObservation | null,
): readonly RouteConfigObservation[] {
  if (expression == null) {
    return [];
  }
  const current = unwrapExpression(expression);
  if (!ts.isArrayLiteralExpression(current)) {
    return [childRouteObservationForRouteable(context, current, routeContextComponent)];
  }
  return current.elements.map((element, index) =>
    readChildRouteElementObservation(context, element, `${parentPath}[${index}]`, routeContextComponent)
  );
}

function readChildRouteElementObservation(
  context: RouteConfigRecognitionContext,
  element: ts.Expression,
  parentPath: string,
  routeContextComponent: RouteableComponentObservation | null,
): RouteConfigObservation {
  if (ts.isSpreadElement(element)) {
    return openRouteConfigObservation(
      RouteConfigKind.Open,
      RouteConfigOriginKind.ChildRoutesProperty,
      null,
      element,
    );
  }
  const expression = unwrapExpression(element);
  if (ts.isObjectLiteralExpression(expression)) {
    const redirectTo = readStringValueOrNull(context, readObjectPropertyExpression(expression, 'redirectTo'));
    return routeConfigFromObject(
      context,
      expression,
      redirectTo == null ? RouteConfigKind.ChildRoute : RouteConfigKind.Redirect,
      RouteConfigOriginKind.ChildRoutesProperty,
      null,
      expression,
      parentPath,
      routeContextComponent,
    );
  }
  return childRouteObservationForRouteable(context, expression, routeContextComponent);
}

function childRouteObservationForRouteable(
  context: RouteConfigRecognitionContext,
  expression: ts.Expression,
  routeContextComponent: RouteableComponentObservation | null,
): RouteConfigObservation {
  const component = routeableComponentForExpression(context, expression, routeContextComponent);
  const validationIssues = invalidLazyImportIssues('component', component);
  if (component == null) {
    return openRouteConfigObservation(
      RouteConfigKind.Open,
      RouteConfigOriginKind.ChildRoutesProperty,
      component,
      expression,
      validationIssues,
    );
  }
  return {
    routeKind: RouteConfigKind.ChildRoute,
    originKind: RouteConfigOriginKind.ChildRoutesProperty,
    valueKind: RouteConfigValueKind.RouteableComponent,
    executionKind: RouteConfigExecutionKind.Embedded,
    executionOrder: null,
    id: null,
    paths: [],
    pathSourceNode: null,
    title: null,
    component,
    redirectTo: null,
    caseSensitive: null,
    transitionPlan: null,
    viewport: null,
    hasData: null,
    childRoutes: [],
    fallback: null,
    nav: null,
    sourceNode: expression,
    fieldSourceNodes: routeConfigFieldSourceNodes([
      ['component', expression],
    ]),
    validationIssues,
    localName: component.localName,
  };
}

interface RouteTypeDefaults {
  readonly id: string | null;
  readonly paths: readonly string[] | null;
  readonly pathSourceNode: ts.Node | null;
  readonly title: string | null;
  readonly redirectTo: string | null;
  readonly caseSensitive: boolean | null;
  readonly transitionPlan: string | null;
  readonly viewport: string | null;
  readonly hasData: boolean | null;
  readonly childRoutes: readonly RouteConfigObservation[];
  readonly fallback: RouteableComponentObservation | null;
  readonly nav: boolean | null;
  readonly fieldSourceNodes: RouteConfigFieldSourceNodes;
}

function readRouteTypeDefaults(
  context: RouteConfigRecognitionContext,
  classNode: ts.ClassLikeDeclarationBase,
  routeContextComponent: RouteableComponentObservation | null,
): RouteTypeDefaults {
  const id = readStaticPropertyInitializer(classNode, 'id');
  const path = readStaticPropertyInitializer(classNode, 'path');
  const title = readStaticPropertyInitializer(classNode, 'title');
  const redirectTo = readStaticPropertyInitializer(classNode, 'redirectTo');
  const caseSensitive = readStaticPropertyInitializer(classNode, 'caseSensitive');
  const transitionPlan = readStaticPropertyInitializer(classNode, 'transitionPlan');
  const viewport = readStaticPropertyInitializer(classNode, 'viewport');
  const data = readStaticPropertyInitializer(classNode, 'data');
  const routes = readStaticPropertyInitializer(classNode, 'routes');
  const fallback = readStaticPropertyInitializer(classNode, 'fallback');
  const nav = readStaticPropertyInitializer(classNode, 'nav');
  return {
    id: readStringValueOrNull(context, id),
    paths: path == null ? null : readStringArrayValue(context, path),
    pathSourceNode: path,
    title: readStringValueOrNull(context, title),
    redirectTo: readStringValueOrNull(context, redirectTo),
    caseSensitive: readBooleanValueOrNull(context, caseSensitive),
    transitionPlan: readStringValueOrNull(context, transitionPlan),
    viewport: readStringValueOrNull(context, viewport),
    hasData: data != null ? true : null,
    childRoutes: readChildRouteObservations(context, routes, 'routes', routeContextComponent),
    fallback: routeableComponentForExpression(context, fallback, routeContextComponent),
    nav: readBooleanValueOrNull(context, nav),
    fieldSourceNodes: routeConfigFieldSourceNodes([
      ['id', id],
      ['path', path],
      ['title', title],
      ['redirectTo', redirectTo],
      ['caseSensitive', caseSensitive],
      ['transitionPlan', transitionPlan],
      ['viewport', viewport],
      ['data', data],
      ['children', routes],
      ['fallback', fallback],
      ['nav', nav],
    ]),
  };
}

function hasRouteTypeDefaults(defaults: RouteTypeDefaults): boolean {
  return Object.keys(defaults.fieldSourceNodes).length > 0;
}

function routeableComponentForClass(
  context: RouteConfigRecognitionContext,
  classNode: ts.ClassLikeDeclarationBase,
): RouteableComponentObservation | null {
  const target = readClassTarget(classNode);
  if (target.localName == null) {
    return null;
  }
  return {
    componentKind: RouteableComponentKind.ClassReference,
    localName: target.localName,
    sourceNode: target.node,
    resourceDefinition: context.resourceIndex.lookupByModuleLocal(context.moduleKey, target.localName),
    invalidLazyImport: false,
  };
}

function routeableComponentForExpression(
  context: RouteConfigRecognitionContext,
  expression: ts.Expression | null,
  routeContextComponent: RouteableComponentObservation | null = null,
): RouteableComponentObservation | null {
  if (expression == null || ts.isSpreadElement(expression)) {
    return null;
  }
  const current = unwrapExpression(expression);
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    return stringRouteableComponent(context, current, routeContextComponent);
  }
  const dynamicImportSpecifier = readDynamicImportSpecifier(current);
  const read = context.expressionReader.evaluateExpression(current);
  if (read.value?.kind === EvaluationValueKind.Promise) {
    return promiseRouteableComponent(context, current, read.value, dynamicImportSpecifier);
  }
  if (dynamicImportSpecifier != null) {
    return dynamicImportRouteableComponent(current, dynamicImportSpecifier);
  }
  return evaluatedRouteableComponent(context, current, read.value ?? null);
}

function stringRouteableComponent(
  context: RouteConfigRecognitionContext,
  expression: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral,
  routeContextComponent: RouteableComponentObservation | null,
): RouteableComponentObservation {
  const routeContextDefinition = routeContextComponent?.resourceDefinition ?? null;
  const scopedDefinition = routeContextDefinition?.type === ResourceDefinitionKind.CustomElement
    ? context.resourceIndex.lookupCustomElementByResourceNameInDependencies(expression.text, routeContextDefinition.dependencies)
    : null;
  return {
    componentKind: RouteableComponentKind.CustomElementName,
    localName: expression.text,
    sourceNode: expression,
    resourceDefinition: scopedDefinition ?? context.resourceIndex.lookupCustomElementByResourceName(expression.text),
    invalidLazyImport: false,
  };
}

function promiseRouteableComponent(
  context: RouteConfigRecognitionContext,
  expression: ts.Expression,
  promise: EvaluationPromiseValue,
  dynamicImportSpecifier: string | null,
): RouteableComponentObservation {
  const resourceDefinition = routeableResourceDefinitionForPromise(context, promise);
  return {
    componentKind: RouteableComponentKind.Promise,
    localName: dynamicImportSpecifier ?? resourceDefinition?.target.localName ?? readReferenceName(expression),
    sourceNode: expression,
    resourceDefinition,
    invalidLazyImport: resourceDefinition == null && promiseFulfillmentIsKnownInvalidLazyImport(
      context,
      closedEvaluationPromiseFulfillment(promise),
    ),
  };
}

function dynamicImportRouteableComponent(
  expression: ts.Expression,
  dynamicImportSpecifier: string,
): RouteableComponentObservation {
  return {
    componentKind: RouteableComponentKind.Promise,
    localName: dynamicImportSpecifier,
    sourceNode: expression,
    resourceDefinition: null,
    invalidLazyImport: false,
  };
}

function evaluatedRouteableComponent(
  context: RouteConfigRecognitionContext,
  expression: ts.Expression,
  value: EvaluationValue | null,
): RouteableComponentObservation {
  const localName = readReferenceName(expression);
  const resourceDefinition = context.resourceIndex.lookupValue(value)
    ?? context.resourceIndex.lookupByTypeScriptExpression(context.typeSystem, expression)
    ?? (localName == null ? null : context.resourceIndex.lookupByModuleLocal(context.moduleKey, localName));
  const componentKind = resourceDefinition != null
    ? RouteableComponentKind.ResourceDefinition
    : value?.kind === EvaluationValueKind.Class || value?.kind === EvaluationValueKind.Function
      ? RouteableComponentKind.ClassReference
      : RouteableComponentKind.Open;
  return {
    componentKind,
    localName,
    sourceNode: expression,
    resourceDefinition,
    invalidLazyImport: false,
  };
}

function readDynamicImportSpecifier(
  expression: ts.Expression,
): string | null {
  const current = unwrapExpression(expression);
  if (ts.isCallExpression(current)) {
    const callee = unwrapExpression(current.expression);
    if (
      ts.isPropertyAccessExpression(callee)
      && callee.name.text === 'then'
    ) {
      return readDynamicImportSpecifier(callee.expression);
    }
  }
  if (!ts.isCallExpression(current) || current.expression.kind !== ts.SyntaxKind.ImportKeyword) {
    return null;
  }
  const argument = current.arguments[0];
  if (argument == null || ts.isSpreadElement(argument)) {
    return null;
  }
  const specifier = unwrapExpression(argument);
  return ts.isStringLiteral(specifier) || ts.isNoSubstitutionTemplateLiteral(specifier)
    ? specifier.text
    : null;
}

function routeableResourceDefinitionForPromise(
  context: RouteConfigRecognitionContext,
  promise: EvaluationPromiseValue,
): FullResourceDefinition | null {
  const fulfillment = closedEvaluationPromiseFulfillment(promise);
  return fulfillment == null ? null : routeableResourceDefinitionForFulfillment(context, fulfillment);
}

function promiseFulfillmentIsKnownInvalidLazyImport(
  context: RouteConfigRecognitionContext,
  value: EvaluationValue | null,
): boolean {
  if (value == null) {
    return false;
  }
  if (value.kind === EvaluationValueKind.Promise) {
    return promiseFulfillmentIsKnownInvalidLazyImport(context, closedEvaluationPromiseFulfillment(value));
  }
  if (routeableResourceDefinitionForFulfillment(context, value) != null) {
    return false;
  }
  switch (value.kind) {
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Function:
      return false;
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
      return !hasOwnNameProperty(value);
    case EvaluationValueKind.ModuleNamespace:
      return moduleNamespaceIsKnownInvalidLazyImport(value);
    case EvaluationValueKind.Unknown:
    case EvaluationValueKind.BoundaryValue:
      return false;
    default:
      return true;
  }
}

function moduleNamespaceIsKnownInvalidLazyImport(
  value: Extract<EvaluationValue, { readonly kind: EvaluationValueKind.ModuleNamespace }>,
): boolean {
  if (value.mayHaveUnknownExports || hasOwnNameProperty(value)) {
    return false;
  }
  for (const exportEntry of value.exportEntries.values()) {
    if (!exportValueIsDefinitelyNotLazyRouteable(exportEntry.value)) {
      return false;
    }
  }
  return true;
}

function exportValueIsDefinitelyNotLazyRouteable(
  value: EvaluationValue,
): boolean {
  switch (value.kind) {
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.Promise:
    case EvaluationValueKind.Unknown:
    case EvaluationValueKind.BoundaryValue:
      return false;
    default:
      return true;
  }
}

function routeableResourceDefinitionForFulfillment(
  context: RouteConfigRecognitionContext,
  value: EvaluationValue,
): FullResourceDefinition | null {
  if (value.kind === EvaluationValueKind.Promise) {
    return routeableResourceDefinitionForPromise(context, value);
  }
  if (value.kind === EvaluationValueKind.Class || value.kind === EvaluationValueKind.Function) {
    return context.resourceIndex.lookupValue(value);
  }
  if (value.kind !== EvaluationValueKind.ModuleNamespace) {
    return null;
  }

  const moduleDefinitions = context.resourceIndex.lookupByModule(value.moduleKey);
  if (moduleDefinitions.length === 1) {
    return moduleDefinitions[0]!;
  }
  const defaultDefinition = context.resourceIndex.lookupValue(value.exportEntries.get('default')?.value ?? null);
  for (const [exportName, exportEntry] of value.exportEntries) {
    if (exportName === 'default') {
      continue;
    }
    const definition = context.resourceIndex.lookupValue(exportEntry.value);
    if (definition != null) {
      return definition;
    }
  }
  return defaultDefinition;
}

function hasOwnNameProperty(
  value:
    | Extract<EvaluationValue, { readonly kind: EvaluationValueKind.Object }>
    | Extract<EvaluationValue, { readonly kind: EvaluationValueKind.BoundaryObject }>
    | Extract<EvaluationValue, { readonly kind: EvaluationValueKind.ModuleNamespace }>,
): boolean {
  switch (value.kind) {
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
      return value.properties.has('name');
    case EvaluationValueKind.ModuleNamespace:
      return value.exportEntries.has('name');
  }
}

function readRouterImportedBindings(sourceFile: ts.SourceFile): RouterImportedBindings {
  const bindings = new RouterImportedBindings();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    if (!ROUTER_MODULES.has(statement.moduleSpecifier.text)) {
      continue;
    }
    const namedBindings = statement.importClause?.namedBindings;
    if (namedBindings == null) {
      continue;
    }
    if (ts.isNamespaceImport(namedBindings)) {
      bindings.routerNamespaces.add(namedBindings.name.text);
      continue;
    }
    for (const element of namedBindings.elements) {
      const importedName = (element.propertyName ?? element.name).text;
      if (importedName === 'route') {
        bindings.routeDecoratorIdentifiers.add(element.name.text);
      }
      if (importedName === 'Route') {
        bindings.routeObjectIdentifiers.add(element.name.text);
      }
    }
  }
  return bindings;
}

function routeDecoratorCall(
  decorator: ts.Decorator,
  bindings: RouterImportedBindings,
): ts.CallExpression | null {
  const expression = unwrapExpression(decorator.expression);
  return ts.isCallExpression(expression) && isRouteDecoratorExpression(expression.expression, bindings)
    ? expression
    : null;
}

function isRouteDecoratorExpression(
  expression: ts.Expression,
  bindings: RouterImportedBindings,
): boolean {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return bindings.routeDecoratorIdentifiers.has(current.text);
  }
  return ts.isPropertyAccessExpression(current)
    && current.name.text === 'route'
    && ts.isIdentifier(unwrapExpression(current.expression))
    && bindings.routerNamespaces.has((unwrapExpression(current.expression) as ts.Identifier).text);
}

function isRouteObjectExpression(
  expression: ts.Expression,
  bindings: RouterImportedBindings,
): boolean {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return bindings.routeObjectIdentifiers.has(current.text);
  }
  return ts.isPropertyAccessExpression(current)
    && current.name.text === 'Route'
    && ts.isIdentifier(unwrapExpression(current.expression))
    && bindings.routerNamespaces.has((unwrapExpression(current.expression) as ts.Identifier).text);
}

function routeConfigFieldSourceNodes(
  entries: readonly RouteConfigFieldSourceEntry[],
): RouteConfigFieldSourceNodes {
  const sources: Partial<Record<RouteConfigField, ts.Node>> = {};
  for (const entry of entries) {
    if (entry == null) {
      continue;
    }
    const [field, node] = entry;
    if (node == null) {
      continue;
    }
    sources[field] = node;
  }
  return sources;
}

function routeTypeDefaultFieldSourceEntries(
  defaults: RouteTypeDefaults | null | undefined,
): readonly RouteConfigFieldSourceEntry[] {
  if (defaults == null) {
    return [];
  }
  return ROUTE_CONFIG_SOURCE_FIELDS.map((field) => [field, defaults.fieldSourceNodes[field]] as const);
}

function routeConfigFieldSourceEntries(
  observation: RouteConfigObservation,
): readonly (readonly [RouteConfigField, ts.Node])[] {
  return ROUTE_CONFIG_SOURCE_FIELDS.flatMap((field) => {
    const node = observation.fieldSourceNodes[field] ?? null;
    return node == null ? [] : [[field, node] as const];
  });
}

function routeConfigPathSourceNodes(
  observation: RouteConfigObservation,
): readonly ts.Node[] {
  const pathSource = observation.fieldSourceNodes.path ?? null;
  if (pathSource == null || observation.paths.length === 0) {
    return [];
  }
  const current = ts.isExpression(pathSource) ? unwrapExpression(pathSource) : pathSource;
  if (ts.isArrayLiteralExpression(current)) {
    const entries = current.elements.filter((element): element is ts.Expression => !ts.isSpreadElement(element));
    if (entries.length === observation.paths.length) {
      return entries;
    }
  }
  return observation.paths.map(() => pathSource);
}

function uniqueRouteSourceRecordSets(
  candidates: Iterable<SourceRecordSet>,
  source: SourceRecordSet,
): readonly SourceRecordSet[] {
  const unique: SourceRecordSet[] = [];
  const seen = new Set<SourceRecordSet>([source]);
  for (const candidate of candidates) {
    if (seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    unique.push(candidate);
  }
  return unique;
}

function routeFieldSourceLocalSuffix(
  fields: readonly RouteConfigField[],
): string {
  return fields.length === 1
    ? `field:${fields[0]}`
    : `fields:${fields.join('+')}`;
}

function routeFieldSourceSummary(
  fields: readonly RouteConfigField[],
): string {
  return fields.length === 1
    ? `Router route ${fields[0]} field source.`
    : `Router route ${fields.join('/')} fields source.`;
}

function readStringValueOrNull(
  context: RouteConfigRecognitionContext,
  expression: ts.Expression | null | undefined,
): string | null {
  return expression == null ? null : readStringValue(context, expression);
}

function readBooleanValueOrNull(
  context: RouteConfigRecognitionContext,
  expression: ts.Expression | null | undefined,
): boolean | null {
  return expression == null ? null : readBooleanValue(context, expression);
}

function readStaticPropertyInitializer(
  classNode: ts.ClassLikeDeclarationBase,
  propertyName: string,
): ts.Expression | null {
  for (const member of classNode.members) {
    if (
      !ts.isPropertyDeclaration(member)
      || member.initializer == null
      || !hasStaticModifier(member)
      || readPropertyName(member.name) !== propertyName
    ) {
      continue;
    }
    return member.initializer;
  }
  return null;
}

function readStringValue(
  context: RouteConfigRecognitionContext,
  expression: ts.Expression,
): string | null {
  const value = context.expressionReader.evaluateExpression(expression).value;
  return value?.kind === EvaluationValueKind.String ? value.value : null;
}

function readStringArrayValue(
  context: RouteConfigRecognitionContext,
  expression: ts.Expression,
): readonly string[] | null {
  const read = context.expressionReader.evaluateExpression(expression);
  if (read.value?.kind === EvaluationValueKind.String) {
    return [read.value.value];
  }
  return read.value?.kind === EvaluationValueKind.Array
    ? readStaticStringArrayValue(read.value)
    : null;
}

function readBooleanValue(
  context: RouteConfigRecognitionContext,
  expression: ts.Expression,
): boolean | null {
  const value = context.expressionReader.evaluateExpression(expression).value;
  return value?.kind === EvaluationValueKind.Boolean ? value.value : null;
}

function routeConfigFieldStates(
  context: RouteConfigRecognitionContext,
  observation: RouteConfigObservation,
  component: RouteableComponentReference | null,
  fallback: RouteableComponentReference | null,
): readonly RouteConfigFieldState[] {
  return ROUTE_CONFIG_VALUE_FIELDS.map((field) => new RouteConfigFieldState(
    field,
    routeConfigFieldState(context, observation, component, fallback, field),
  ));
}

function routeConfigFieldState(
  context: RouteConfigRecognitionContext,
  observation: RouteConfigObservation,
  component: RouteableComponentReference | null,
  fallback: RouteableComponentReference | null,
  field: RouteConfigValueField,
): RouteConfigFieldStateKind {
  if (observation.originKind === RouteConfigOriginKind.DynamicHook) {
    return field === 'component' && component != null
      ? RouteConfigFieldStateKind.Referential
      : RouteConfigFieldStateKind.Open;
  }
  switch (field) {
    case 'id': if (observation.id != null) return RouteConfigFieldStateKind.Closed; break;
    case 'path': if (observation.paths.length > 0) return RouteConfigFieldStateKind.Closed; break;
    case 'title': if (observation.title != null) return RouteConfigFieldStateKind.Closed; break;
    case 'component': if (component != null) return RouteConfigFieldStateKind.Referential; break;
    case 'redirectTo': if (observation.redirectTo != null) return RouteConfigFieldStateKind.Closed; break;
    case 'caseSensitive': if (observation.caseSensitive != null) return RouteConfigFieldStateKind.Closed; break;
    case 'transitionPlan': if (observation.transitionPlan != null) return RouteConfigFieldStateKind.Closed; break;
    case 'viewport': if (observation.viewport != null) return RouteConfigFieldStateKind.Closed; break;
    case 'children': if (observation.childRoutes.length > 0) return RouteConfigFieldStateKind.Referential; break;
    case 'fallback': if (fallback != null) return RouteConfigFieldStateKind.Referential; break;
    case 'nav': if (observation.nav != null) return RouteConfigFieldStateKind.Closed; break;
  }

  const sourceNode = observation.fieldSourceNodes[field];
  if (sourceNode == null || !ts.isExpression(sourceNode)) {
    return observation.valueKind === RouteConfigValueKind.OpenExpression
      ? RouteConfigFieldStateKind.Open
      : RouteConfigFieldStateKind.Absent;
  }
  const value = context.expressionReader.evaluateExpression(sourceNode).value;
  switch (value?.kind) {
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Object:
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.Instance:
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.Promise:
      return RouteConfigFieldStateKind.Referential;
    case EvaluationValueKind.Unknown:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.BoundaryValue:
      return RouteConfigFieldStateKind.Open;
    default:
      return value == null
        ? RouteConfigFieldStateKind.Open
        : RouteConfigFieldStateKind.Closed;
  }
}

function routeConfigFieldProvenance(
  sources: RouteConfigSourceRecords,
  observation: RouteConfigObservation,
  component: RouteableComponentReference | null,
  fallback: RouteableComponentReference | null,
): readonly FieldProvenance<RouteConfigField>[] {
  return compactFieldProvenance<RouteConfigField>([
    routeConfigFieldProvenanceEntry(sources, 'id', observation.fieldSourceNodes.id != null || observation.id != null),
    routeConfigFieldProvenanceEntry(sources, 'path', observation.fieldSourceNodes.path != null || observation.paths.length > 0),
    routeConfigFieldProvenanceEntry(sources, 'title', observation.fieldSourceNodes.title != null || observation.title != null),
    routeConfigFieldProvenanceEntry(sources, 'component', observation.fieldSourceNodes.component != null || component != null),
    routeConfigFieldProvenanceEntry(sources, 'redirectTo', observation.fieldSourceNodes.redirectTo != null || observation.redirectTo != null),
    routeConfigFieldProvenanceEntry(sources, 'caseSensitive', observation.fieldSourceNodes.caseSensitive != null || observation.caseSensitive != null),
    routeConfigFieldProvenanceEntry(sources, 'transitionPlan', observation.fieldSourceNodes.transitionPlan != null || observation.transitionPlan != null),
    routeConfigFieldProvenanceEntry(sources, 'viewport', observation.fieldSourceNodes.viewport != null || observation.viewport != null),
    routeConfigFieldProvenanceEntry(sources, 'data', observation.fieldSourceNodes.data != null || observation.hasData != null),
    routeConfigFieldProvenanceEntry(sources, 'children', observation.fieldSourceNodes.children != null || observation.childRoutes.length > 0),
    routeConfigFieldProvenanceEntry(sources, 'fallback', observation.fieldSourceNodes.fallback != null || fallback != null),
    routeConfigFieldProvenanceEntry(sources, 'nav', observation.fieldSourceNodes.nav != null || observation.nav != null),
    new FieldProvenance('source', sources.source.provenanceHandle),
  ]);
}

function routeConfigFieldProvenanceEntry(
  sources: RouteConfigSourceRecords,
  field: RouteConfigField,
  include: boolean,
): FieldProvenance<RouteConfigField> | null {
  if (!include) {
    return null;
  }
  const source = sources.fieldSources.get(field) ?? null;
  return source == null ? null : new FieldProvenance(field, source.provenanceHandle);
}
