import ts from 'typescript';
import { readClassTarget, readStaticStringArrayValue, StaticEvaluationExpressionReader } from '../evaluation/expression-reader.js';
import {
  EvaluationValueKind,
  type EvaluationPromiseValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import { hasStaticModifier, readPropertyName, readReferenceName, unwrapExpression } from '../evaluation/ts-syntax.js';
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
import { RouterIdentity } from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { ProjectBootFrame, SourceFileAdmission } from '../boot/frames.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import {
  RouteableComponentKind,
  RouteableComponentModel,
  RouteableComponentReference,
  RouteConfigKind,
  RouteConfigModel,
  type RouteConfigField,
  type RouteableComponentField,
} from './model.js';

const ROUTER_MODULES = new Set([
  '@aurelia/router',
]);

class RouterImportedBindings {
  readonly routeDecoratorIdentifiers = new Set<string>();
  readonly routeObjectIdentifiers = new Set<string>();
  readonly routerNamespaces = new Set<string>();
}

class RouteConfigRecognitionContext {
  readonly expressionReader: StaticEvaluationExpressionReader;

  constructor(
    readonly sourceFile: ts.SourceFile,
    readonly moduleKey: string,
    readonly sourceFileAddressHandle: AddressHandle,
    readonly projectKey: string,
    readonly evaluation: EvaluatedProjectSource,
    readonly resourceIndex: ResourceDefinitionIndex,
  ) {
    this.expressionReader = new StaticEvaluationExpressionReader(
      evaluation.evaluation.environment,
      moduleKey,
      evaluation.evaluation.policy,
      evaluation.evaluation.runtimeHost,
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
}

interface RouteConfigObservation {
  readonly routeKind: RouteConfigKind;
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
  readonly localName: string | null;
}

class RouteConfigEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly routeConfig: RouteConfigModel,
    readonly routeConfigs: readonly RouteConfigModel[],
  ) {}
}

/** Route configuration recognition result for one boot-admitted source file. */
export class RouteConfigRecognitionSourceResult {
  constructor(
    readonly admission: SourceFileAdmission,
    readonly moduleKey: string,
    readonly routeConfigs: readonly RouteConfigModel[],
  ) {}
}

/** Source-backed route configuration products recognized across one project frame. */
export class RouteConfigRecognitionProjectResult {
  constructor(
    readonly project: ProjectBootFrame,
    readonly sources: readonly RouteConfigRecognitionSourceResult[],
  ) {}

  readRouteConfigs(): readonly RouteConfigModel[] {
    return this.sources.flatMap((source) => source.routeConfigs);
  }
}

/** Recognize source-backed router route configs without executing navigation or recognizer state. */
export class RouteConfigRecognitionProjectPass {
  recognizeAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    evaluation: StaticProjectEvaluationResult,
    resourceIndex: ResourceDefinitionIndex,
  ): RouteConfigRecognitionProjectResult {
    return new RouteConfigRecognitionProjectResult(
      project,
      evaluation.sources.map((source) =>
        this.recognizeSource(store, project, source, resourceIndex)
      ),
    );
  }

  private recognizeSource(
    store: KernelStore,
    project: ProjectBootFrame,
    source: StaticProjectEvaluationResult['sources'][number],
    resourceIndex: ResourceDefinitionIndex,
  ): RouteConfigRecognitionSourceResult {
    if (!isEvaluatedProjectSource(source)) {
      return new RouteConfigRecognitionSourceResult(source.admission, source.moduleKey, []);
    }

    const context = new RouteConfigRecognitionContext(
      source.sourceFile,
      source.moduleKey,
      source.admission.addressHandle,
      project.projectKey,
      source,
      resourceIndex,
    );
    const observations = recognizeRouteConfigs(context);
    const emission = new RouteConfigKernelEmitter(store).emit(context, observations);
    return new RouteConfigRecognitionSourceResult(source.admission, source.moduleKey, emission);
  }
}

class RouteConfigKernelEmitter {
  constructor(
    readonly store: KernelStore,
  ) {}

  emit(
    context: RouteConfigRecognitionContext,
    observations: readonly RouteConfigObservation[],
  ): readonly RouteConfigModel[] {
    const emissions = observations.map((observation, index) =>
      this.emitRouteConfig(context, observation, `${context.projectKey}:${context.moduleKey}:${index}`, null)
    );
    const records = emissions.flatMap((emission) => emission.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `router-route-config:${context.moduleKey}`));
    }
    return emissions.flatMap((emission) => emission.routeConfigs);
  }

  private emitRouteConfig(
    context: RouteConfigRecognitionContext,
    observation: RouteConfigObservation,
    local: string,
    parentIdentityHandle: IdentityHandle | null,
  ): RouteConfigEmission {
    const records: KernelStoreRecord[] = [];
    const source = this.recordsForSource(
      context,
      observation.sourceNode,
      `router-route-config:${local}:source`,
      'Router route configuration source.',
    );
    records.push(...source.records);
    const pathSource = observation.pathSourceNode == null
      ? null
      : this.recordsForSource(
        context,
        observation.pathSourceNode,
        `router-route-config:${local}:path-source`,
        'Router route path source.',
      );
    if (pathSource != null) {
      records.push(...pathSource.records);
    }

    const productHandle = this.store.handles.product(`router-route-config:${local}`);
    const identityHandle = this.store.handles.identity(`router-route-config:${local}`);
    const component = observation.component == null
      ? null
      : this.routeableReference(context, observation.component, `${local}:component`, identityHandle, records);
    const fallback = observation.fallback == null
      ? null
      : this.routeableReference(context, observation.fallback, `${local}:fallback`, identityHandle, records);
    const childEmissions = observation.childRoutes.map((child, index) =>
      this.emitRouteConfig(context, child, `${local}:child:${index}`, identityHandle)
    );
    records.push(...childEmissions.flatMap((emission) => emission.records));

    const routeConfig = new RouteConfigModel(
      productHandle,
      identityHandle,
      observation.routeKind,
      observation.id,
      observation.paths,
      observation.title,
      component,
      observation.redirectTo,
      observation.caseSensitive,
      observation.transitionPlan,
      observation.viewport,
      observation.hasData,
      childEmissions.map((emission) => emission.routeConfig.toReference()),
      fallback,
      observation.nav,
      source.addressHandle,
      pathSource?.addressHandle ?? null,
      routeConfigFieldProvenance(source.provenanceHandle, pathSource?.provenanceHandle ?? null, observation, component, fallback),
    );

    records.push(
      new RouterIdentity(
        identityHandle,
        KernelVocabulary.Router.RouteConfig.key,
        parentIdentityHandle,
        source.addressHandle,
        observation.localName,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Router.RouteConfig.key,
        identityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`router-route-config:${local}`),
        identityHandle,
        [productHandle],
        [],
        [],
      ),
    );

    return new RouteConfigEmission(
      records,
      routeConfig,
      [routeConfig, ...childEmissions.flatMap((emission) => emission.routeConfigs)],
    );
  }

  private routeableReference(
    context: RouteConfigRecognitionContext,
    observation: RouteableComponentObservation,
    local: string,
    ownerIdentityHandle: IdentityHandle,
    records: KernelStoreRecord[],
  ): RouteableComponentReference {
    const source = this.recordsForSource(
      context,
      observation.sourceNode,
      `router-routeable:${local}:source`,
      'Router routeable component reference.',
    );
    records.push(...source.records);
    const productHandle = this.store.handles.product(`router-routeable:${local}`);
    const identityHandle = this.store.handles.identity(`router-routeable:${local}`);
    const routeable = new RouteableComponentModel(
      productHandle,
      identityHandle,
      observation.componentKind,
      observation.resourceDefinition?.productHandle ?? null,
      observation.resourceDefinition?.target.identityHandle ?? null,
      source.addressHandle,
      observation.localName,
      routeableComponentFieldProvenance(source.provenanceHandle, observation),
    );
    records.push(
      new RouterIdentity(
        identityHandle,
        KernelVocabulary.Router.RouteableComponent.key,
        ownerIdentityHandle,
        source.addressHandle,
        observation.localName,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Router.RouteableComponent.key,
        identityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`router-routeable:${local}`),
        ownerIdentityHandle,
        [productHandle],
        [],
        [],
      ),
    );
    return routeable.toReference();
  }

  private recordsForSource(
    context: RouteConfigRecognitionContext,
    node: ts.Node,
    local: string,
    evidenceSummary: string,
  ): SourceRecordSet {
    const addressHandle = this.store.handles.address(local);
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
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
  const observations: RouteConfigObservation[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      observations.push(...recognizeRouteDecorators(context, bindings, node));
    }
    if (ts.isCallExpression(node)) {
      const configured = recognizeRouteConfigureCall(context, bindings, node);
      if (configured != null) {
        observations.push(configured);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(context.sourceFile);
  return observations.sort((left, right) =>
    left.sourceNode.getStart(context.sourceFile) - right.sourceNode.getStart(context.sourceFile)
  );
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
  const typeDefaults = readRouteTypeDefaults(context, classNode);
  const component = routeableComponentForClass(context, classNode);

  for (const decorator of decorators) {
    const call = routeDecoratorCall(decorator, bindings);
    if (call == null) {
      continue;
    }
    const argument = call.arguments[0] ?? null;
    observations.push(
      readRouteConfigObservation(context, argument, RouteConfigKind.Route, component, decorator, typeDefaults)
    );
  }

  if (observations.length === 0 && component?.resourceDefinition != null && hasRouteTypeDefaults(typeDefaults)) {
    observations.push(
      routeConfigFromTypeDefaults(typeDefaults, component, classNode)
    );
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
  return readRouteConfigObservation(
    context,
    configExpression,
    RouteConfigKind.Route,
    component,
    call,
    null,
  );
}

function readRouteConfigObservation(
  context: RouteConfigRecognitionContext,
  expression: ts.Expression | null,
  routeKind: RouteConfigKind,
  fallbackComponent: RouteableComponentObservation | null,
  sourceNode: ts.Node,
  typeDefaults: RouteTypeDefaults | null,
): RouteConfigObservation {
  if (expression == null || ts.isSpreadElement(expression)) {
    return openRouteConfigObservation(routeKind, fallbackComponent, sourceNode);
  }
  const current = unwrapExpression(expression);
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current) || ts.isArrayLiteralExpression(current)) {
    return routeConfigFromPathExpression(context, current, routeKind, fallbackComponent, sourceNode, typeDefaults);
  }
  if (ts.isObjectLiteralExpression(current)) {
    return routeConfigFromObject(context, current, routeKind, fallbackComponent, typeDefaults);
  }
  return openRouteConfigObservation(routeKind, routeableComponentForExpression(context, current) ?? fallbackComponent, current);
}

function routeConfigFromPathExpression(
  context: RouteConfigRecognitionContext,
  expression: ts.Expression,
  routeKind: RouteConfigKind,
  fallbackComponent: RouteableComponentObservation | null,
  sourceNode: ts.Node,
  typeDefaults: RouteTypeDefaults | null,
): RouteConfigObservation {
  const expressionPaths = readStringArrayValue(context, expression);
  const paths = expressionPaths ?? typeDefaults?.paths ?? [];
  const pathSourceNode = expressionPaths == null ? typeDefaults?.pathSourceNode ?? null : expression;
  return {
    routeKind,
    id: typeDefaults?.id ?? paths[0] ?? null,
    paths,
    pathSourceNode: pathSourceNode ?? typeDefaults?.pathSourceNode ?? null,
    title: typeDefaults?.title ?? null,
    component: fallbackComponent,
    redirectTo: typeDefaults?.redirectTo ?? null,
    caseSensitive: typeDefaults?.caseSensitive ?? null,
    transitionPlan: typeDefaults?.transitionPlan ?? null,
    viewport: typeDefaults?.viewport ?? null,
    hasData: typeDefaults?.hasData ?? null,
    childRoutes: typeDefaults?.childRoutes ?? [],
    fallback: typeDefaults?.fallback ?? null,
    nav: typeDefaults?.nav ?? null,
    sourceNode,
    localName: fallbackComponent?.localName ?? paths[0] ?? null,
  };
}

function routeConfigFromObject(
  context: RouteConfigRecognitionContext,
  object: ts.ObjectLiteralExpression,
  routeKind: RouteConfigKind,
  fallbackComponent: RouteableComponentObservation | null,
  typeDefaults: RouteTypeDefaults | null,
): RouteConfigObservation {
  const pathExpression = readObjectPropertyExpression(object, 'path');
  const objectPaths = pathExpression == null ? null : readStringArrayValue(context, pathExpression);
  const paths = objectPaths ?? typeDefaults?.paths ?? [];
  const componentExpression = readObjectPropertyExpression(object, 'component');
  const component = componentExpression == null
    ? fallbackComponent
    : routeableComponentForExpression(context, componentExpression);
  const redirectTo = readStringObjectProperty(context, object, 'redirectTo') ?? typeDefaults?.redirectTo ?? null;
  const childRoutes = [
    ...readChildRouteObservations(context, readObjectPropertyExpression(object, 'routes')),
    ...(typeDefaults?.childRoutes ?? []),
  ];
  const resolvedKind = routeKind === RouteConfigKind.ChildRoute
    ? RouteConfigKind.ChildRoute
    : redirectTo != null && component == null
      ? RouteConfigKind.Redirect
      : routeKind;

  return {
    routeKind: resolvedKind,
    id: readStringObjectProperty(context, object, 'id') ?? typeDefaults?.id ?? paths[0] ?? null,
    paths,
    pathSourceNode: objectPaths == null ? typeDefaults?.pathSourceNode ?? null : pathExpression,
    title: readStringObjectProperty(context, object, 'title') ?? typeDefaults?.title ?? null,
    component,
    redirectTo,
    caseSensitive: readBooleanObjectProperty(context, object, 'caseSensitive') ?? typeDefaults?.caseSensitive ?? null,
    transitionPlan: readStringObjectProperty(context, object, 'transitionPlan') ?? typeDefaults?.transitionPlan ?? null,
    viewport: readStringObjectProperty(context, object, 'viewport') ?? typeDefaults?.viewport ?? null,
    hasData: readObjectPropertyExpression(object, 'data') != null ? true : typeDefaults?.hasData ?? null,
    childRoutes,
    fallback: routeableComponentForExpression(context, readObjectPropertyExpression(object, 'fallback')) ?? typeDefaults?.fallback ?? null,
    nav: readBooleanObjectProperty(context, object, 'nav') ?? typeDefaults?.nav ?? null,
    sourceNode: object,
    localName: readStringObjectProperty(context, object, 'id') ?? component?.localName ?? paths[0] ?? null,
  };
}

function routeConfigFromTypeDefaults(
  typeDefaults: RouteTypeDefaults,
  fallbackComponent: RouteableComponentObservation | null,
  sourceNode: ts.Node,
): RouteConfigObservation {
  const paths = typeDefaults.paths ?? [];
  return {
    routeKind: RouteConfigKind.Route,
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
    localName: fallbackComponent?.localName ?? typeDefaults.id ?? paths[0] ?? null,
  };
}

function openRouteConfigObservation(
  routeKind: RouteConfigKind,
  component: RouteableComponentObservation | null,
  sourceNode: ts.Node,
): RouteConfigObservation {
  return {
    routeKind: component == null ? RouteConfigKind.Open : routeKind,
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
    localName: component?.localName ?? (ts.isExpression(sourceNode) ? readReferenceName(sourceNode) : null),
  };
}

function readChildRouteObservations(
  context: RouteConfigRecognitionContext,
  expression: ts.Expression | null,
): readonly RouteConfigObservation[] {
  if (expression == null) {
    return [];
  }
  const current = unwrapExpression(expression);
  if (!ts.isArrayLiteralExpression(current)) {
    return [
      openRouteConfigObservation(RouteConfigKind.Open, routeableComponentForExpression(context, current), current),
    ];
  }
  return current.elements.map((element) => {
    if (ts.isSpreadElement(element)) {
      return openRouteConfigObservation(RouteConfigKind.Open, null, element);
    }
    const expression = unwrapExpression(element);
    if (ts.isObjectLiteralExpression(expression)) {
      const redirectTo = readStringObjectProperty(context, expression, 'redirectTo');
      return routeConfigFromObject(
        context,
        expression,
        redirectTo == null ? RouteConfigKind.ChildRoute : RouteConfigKind.Redirect,
        null,
        null,
      );
    }
    if (
      ts.isStringLiteral(expression)
      || ts.isNoSubstitutionTemplateLiteral(expression)
    ) {
      return openRouteConfigObservation(
        RouteConfigKind.Open,
        routeableComponentForExpression(context, expression),
        expression,
      );
    }
    return openRouteConfigObservation(
      RouteConfigKind.Open,
      routeableComponentForExpression(context, expression),
      expression,
    );
  });
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
}

function readRouteTypeDefaults(
  context: RouteConfigRecognitionContext,
  classNode: ts.ClassLikeDeclarationBase,
): RouteTypeDefaults {
  return {
    id: readStringStaticProperty(context, classNode, 'id'),
    paths: readStringArrayStaticProperty(context, classNode, 'path'),
    pathSourceNode: readStaticPropertyInitializer(classNode, 'path'),
    title: readStringStaticProperty(context, classNode, 'title'),
    redirectTo: readStringStaticProperty(context, classNode, 'redirectTo'),
    caseSensitive: readBooleanStaticProperty(context, classNode, 'caseSensitive'),
    transitionPlan: readStringStaticProperty(context, classNode, 'transitionPlan'),
    viewport: readStringStaticProperty(context, classNode, 'viewport'),
    hasData: readStaticPropertyInitializer(classNode, 'data') != null ? true : null,
    childRoutes: readChildRouteObservations(context, readStaticPropertyInitializer(classNode, 'routes')),
    fallback: routeableComponentForExpression(context, readStaticPropertyInitializer(classNode, 'fallback')),
    nav: readBooleanStaticProperty(context, classNode, 'nav'),
  };
}

function hasRouteTypeDefaults(defaults: RouteTypeDefaults): boolean {
  return defaults.id != null
    || defaults.paths != null
    || defaults.title != null
    || defaults.redirectTo != null
    || defaults.caseSensitive != null
    || defaults.transitionPlan != null
    || defaults.viewport != null
    || defaults.hasData != null
    || defaults.childRoutes.length > 0
    || defaults.fallback != null
    || defaults.nav != null;
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
  };
}

function routeableComponentForExpression(
  context: RouteConfigRecognitionContext,
  expression: ts.Expression | null,
): RouteableComponentObservation | null {
  if (expression == null || ts.isSpreadElement(expression)) {
    return null;
  }
  const current = unwrapExpression(expression);
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    return {
      componentKind: RouteableComponentKind.CustomElementName,
      localName: current.text,
      sourceNode: current,
      resourceDefinition: null,
    };
  }
  const dynamicImportSpecifier = readDynamicImportSpecifier(current);
  const read = context.expressionReader.evaluateExpression(current);
  if (read.value?.kind === EvaluationValueKind.Promise) {
    const resourceDefinition = routeableResourceDefinitionForPromise(context, read.value);
    return {
      componentKind: RouteableComponentKind.Promise,
      localName: dynamicImportSpecifier ?? resourceDefinition?.target.localName ?? readReferenceName(current),
      sourceNode: current,
      resourceDefinition,
    };
  }
  if (dynamicImportSpecifier != null) {
    return {
      componentKind: RouteableComponentKind.Promise,
      localName: dynamicImportSpecifier,
      sourceNode: current,
      resourceDefinition: null,
    };
  }
  const resourceDefinition = context.resourceIndex.lookupValue(read.value);
  const componentKind = resourceDefinition != null
    ? RouteableComponentKind.ResourceDefinition
    : read.value?.kind === EvaluationValueKind.Class || read.value?.kind === EvaluationValueKind.Function
      ? RouteableComponentKind.ClassReference
      : RouteableComponentKind.Open;
  return {
    componentKind,
    localName: readReferenceName(current),
    sourceNode: current,
    resourceDefinition,
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
  return routeableResourceDefinitionForFulfillment(context, promise.fulfilledValue);
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

  const defaultDefinition = context.resourceIndex.lookupValue(value.exports.get('default') ?? null);
  for (const [exportName, exportValue] of value.exports) {
    if (exportName === 'default') {
      continue;
    }
    const definition = context.resourceIndex.lookupValue(exportValue);
    if (definition != null) {
      return definition;
    }
  }
  return defaultDefinition;
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

function readObjectPropertyExpression(
  object: ts.ObjectLiteralExpression,
  propertyName: string,
): ts.Expression | null {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property) || readPropertyName(property.name) !== propertyName) {
      continue;
    }
    return property.initializer;
  }
  return null;
}

function readStringObjectProperty(
  context: RouteConfigRecognitionContext,
  object: ts.ObjectLiteralExpression,
  propertyName: string,
): string | null {
  const expression = readObjectPropertyExpression(object, propertyName);
  return expression == null ? null : readStringValue(context, expression);
}

function readStringArrayObjectProperty(
  context: RouteConfigRecognitionContext,
  object: ts.ObjectLiteralExpression,
  propertyName: string,
): readonly string[] | null {
  const expression = readObjectPropertyExpression(object, propertyName);
  return expression == null ? null : readStringArrayValue(context, expression);
}

function readBooleanObjectProperty(
  context: RouteConfigRecognitionContext,
  object: ts.ObjectLiteralExpression,
  propertyName: string,
): boolean | null {
  const expression = readObjectPropertyExpression(object, propertyName);
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

function readStringStaticProperty(
  context: RouteConfigRecognitionContext,
  classNode: ts.ClassLikeDeclarationBase,
  propertyName: string,
): string | null {
  const initializer = readStaticPropertyInitializer(classNode, propertyName);
  return initializer == null ? null : readStringValue(context, initializer);
}

function readStringArrayStaticProperty(
  context: RouteConfigRecognitionContext,
  classNode: ts.ClassLikeDeclarationBase,
  propertyName: string,
): readonly string[] | null {
  const initializer = readStaticPropertyInitializer(classNode, propertyName);
  return initializer == null ? null : readStringArrayValue(context, initializer);
}

function readBooleanStaticProperty(
  context: RouteConfigRecognitionContext,
  classNode: ts.ClassLikeDeclarationBase,
  propertyName: string,
): boolean | null {
  const initializer = readStaticPropertyInitializer(classNode, propertyName);
  return initializer == null ? null : readBooleanValue(context, initializer);
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

function routeConfigFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  pathProvenanceHandle: ProvenanceHandle | null,
  observation: RouteConfigObservation,
  component: RouteableComponentReference | null,
  fallback: RouteableComponentReference | null,
): readonly FieldProvenance<RouteConfigField>[] {
  return compactFieldProvenance<RouteConfigField>([
    observation.id == null ? null : new FieldProvenance('id', provenanceHandle),
    pathProvenanceHandle == null ? null : new FieldProvenance('path', pathProvenanceHandle),
    observation.title == null ? null : new FieldProvenance('title', provenanceHandle),
    component == null ? null : new FieldProvenance('component', provenanceHandle),
    observation.redirectTo == null ? null : new FieldProvenance('redirectTo', provenanceHandle),
    observation.caseSensitive == null ? null : new FieldProvenance('caseSensitive', provenanceHandle),
    observation.transitionPlan == null ? null : new FieldProvenance('transitionPlan', provenanceHandle),
    observation.viewport == null ? null : new FieldProvenance('viewport', provenanceHandle),
    observation.hasData == null ? null : new FieldProvenance('data', provenanceHandle),
    observation.childRoutes.length === 0 ? null : new FieldProvenance('children', provenanceHandle),
    fallback == null ? null : new FieldProvenance('fallback', provenanceHandle),
    observation.nav == null ? null : new FieldProvenance('nav', provenanceHandle),
    new FieldProvenance('source', provenanceHandle),
  ]);
}

function routeableComponentFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  observation: RouteableComponentObservation,
): readonly FieldProvenance<RouteableComponentField>[] {
  return compactFieldProvenance<RouteableComponentField>([
    new FieldProvenance('componentKind', provenanceHandle),
    observation.resourceDefinition == null ? null : new FieldProvenance('resolvedResource', provenanceHandle),
    new FieldProvenance('source', provenanceHandle),
  ]);
}
