import type { ProjectBootFrame } from '../boot/frames.js';
import type { Container } from '../di/container.js';
import {
  EvaluationBoundaryKind,
  EvaluationObjectPropertyState,
  EvaluationValueKind,
  EvaluationUndefined,
  isEvaluationPrimitiveValue,
  readEvaluationPrimitive,
  type EvaluationArrayValue,
  type EvaluationInstanceValue,
  type EvaluationObjectValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import {
  openSeamReasonKindForEvaluationBoundary,
} from '../evaluation/boundary-open-reason.js';
import {
  EvidenceKind,
  EvidenceRole,
} from '../kernel/evidence.js';
import type { AddressHandle, IdentityHandle, OpenSeamHandle, ProductHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import { OpenSeam, OpenSeamReasonKind, type OpenSeamReasonSource } from '../kernel/open-seam.js';
import {
  KernelPublicationPlan,
  KernelStoreBatch,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import type { KernelStoreRecord } from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  RuntimeBindingSourceValueEvaluator,
} from '../observation/binding-source-value-evaluator.js';
import {
  projectRuntimeBindingSourceValuePressure,
} from '../observation/binding-source-value-pressure.js';
import {
  RuntimeBindingSourceValueEvaluation,
  RuntimeBindingSourceValueEvaluationClosure,
} from '../configuration/binding-source-value-evaluation.js';
import {
  RuntimeBindingSourceValueEvaluationContext,
  sourceValueContextForRuntimeBindingSourceExpressionProjection,
} from '../observation/binding-source-value-evaluation-context.js';
import {
  expressionProductHandleForBinding,
  instructionScopeLookup,
  isRuntimeExpressionBinding,
} from '../observation/runtime-binding-expression.js';
import {
  aggregateRuntimeBindingSourceExpressionChainIndex,
  RuntimeBindingSourceExpressionContextProjector,
  RuntimeBindingSourceExpressionProjectionKind,
} from '../observation/runtime-binding-source-expression-context.js';
import { HtmlAttribute, HtmlElement } from '../template/html-ir.js';
import {
  HydrateAttributeInstruction,
  InterpolationInstruction,
  MultiAttrInstruction,
  PropertyBindingInstruction,
  SetPropertyInstruction,
} from '../template/instruction-ir.js';
import { bindingExpressionAstForProduct, readTemplateExpressionParse } from '../template/expression-parse-product.js';
import { TemplateProductDetails } from '../template/product-details.js';
import { RuntimeControllerCreationKind } from '../template/runtime-controller.js';
import type { RuntimeControllerFrame } from '../template/runtime-controller.js';
import type { RuntimeRenderingEmission } from '../template/runtime-rendering-materializer.js';
import type { TemplateCompilationProjectEmission } from '../template/template-compilation-project-pass.js';
import {
  NavigationInstructionKind,
  RouterIssueKind,
  RouterIssueModel,
  RouterIssuePhase,
  RouteQueryParameterValueModel,
  RouterClosureKind,
  TypedNavigationInstructionModel,
  ViewportInstructionModel,
  ViewportInstructionTreeModel,
  type RouteConfigContextModel,
  type RouteContextModel,
} from './model.js';
import type { ArrayLiteralExpression, ExpressionAstNode, ObjectLiteralExpression } from '../expression/ast.js';
import { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import { RouterFrameworkErrorCode } from './framework-error-code.js';
import {
  EagerRouteComponentKind,
  RouteEagerPathGenerationIndex,
  type EagerPathGenerationResult,
  type EagerPathGenerationInstruction,
  type EagerRouteParameterValue,
  type EagerRouteParameters,
} from './route-eager-path-generation.js';
import type { RouteConfigContextMaterializationProjectResult } from './route-context-materialization.js';
import {
  parseRouteExpression,
  RouteExpressionParseFailure,
  type ParsedRouteExpression,
  type ParsedViewportInstruction,
} from './route-expression-parser.js';
import {
  normalizeRouterStringNavigationInstructionPrefix,
  RouterStringNavigationInstructionPrefixKind,
} from './router-string-navigation-instruction.js';
import type { RouteRecognizerMaterializationProjectResult } from './route-recognizer-materialization.js';
import type { RouteRuntimeTopologyProjectResult } from './route-runtime-topology.js';
import { routeRuntimeContextsByComponentDefinition } from './route-topology-index.js';
import { routerIssueProductRecords } from './router-issue-publication.js';
import { routerOpenSeamRecords, routerProductRecords } from './router-product-records.js';
import type { RouterOptionsMaterializationProjectResult } from './router-options-materialization.js';

export const enum RouterResourceInstructionKind {
  Load = 'load',
  Href = 'href',
}

const enum RouterLoadBindableName {
  /** Load custom attribute route/component bindable consumed before ViewportInstructionTree creation. */
  Route = 'route',
  /** Load custom attribute params bindable that switches route strings into eager component+params instructions. */
  Params = 'params',
  /** Load custom attribute context bindable that can replace the owning IRouteContext before instruction creation. */
  Context = 'context',
}

const enum RouterHrefBindableName {
  /** Href custom attribute value bindable consumed before ViewportInstructionTree creation or external-link proof. */
  Value = 'value',
}

interface RouterResourceInstructionSite {
  readonly kind: RouterResourceInstructionKind;
  readonly routeContext: RouteContextModel | null;
  readonly controller: RuntimeControllerFrame;
  readonly instruction: HydrateAttributeInstruction;
  readonly runtimeRendering: RuntimeRenderingEmission;
  readonly sourceExpressionContexts: RuntimeBindingSourceExpressionContextProjector;
  readonly host: HtmlElement | null;
  readonly sourceAddressHandle: AddressHandle | null;
}

interface ClosedRouteExpressionInstruction {
  readonly kind: 'route-expression';
  readonly site: RouterResourceInstructionSite;
  readonly value: string;
  readonly valueSourceAddressHandle: AddressHandle | null;
  readonly openSeamHandles: readonly OpenSeamHandle[];
}

interface ClosedEagerRouterResourceInstruction {
  readonly kind: 'eager-instruction';
  readonly site: RouterResourceInstructionSite;
  readonly instruction: EagerPathGenerationInstruction;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly openSeamHandles: readonly OpenSeamHandle[];
}

type ClosedRouterResourceInstruction =
  | ClosedRouteExpressionInstruction
  | ClosedEagerRouterResourceInstruction;

interface RouteInstructionEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly typedNavigationInstructions: readonly TypedNavigationInstructionModel[];
  readonly viewportInstructions: readonly ViewportInstructionModel[];
  readonly viewportInstructionTree: ViewportInstructionTreeModel;
}

interface RouterResourceExpression {
  readonly routeContext: RouteContextModel;
  readonly expression: ParsedRouteExpression;
}

interface MaterializedViewportInstructionEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly typedNavigationInstructions: readonly TypedNavigationInstructionModel[];
  readonly viewportInstructions: readonly ViewportInstructionModel[];
  readonly viewportInstruction: ViewportInstructionModel;
}

interface RouteInstructionMaterializationState {
  readonly sourceValueEvaluator: RuntimeBindingSourceValueEvaluator;
  readonly resourceIndex: ResourceDefinitionIndex;
  readonly eagerPathGeneration: RouteEagerPathGenerationIndex;
  readonly routeContextsByDefinition: ReadonlyMap<IdentityHandle, readonly RouteContextModel[]>;
  readonly routeContextsByContainerIdentity: ReadonlyMap<IdentityHandle, RouteContextModel>;
  readonly rootRouteContextsByParentContainerIdentity: ReadonlyMap<IdentityHandle, readonly RouteContextModel[]>;
  readonly routeContextsByIdentity: ReadonlyMap<IdentityHandle, RouteContextModel>;
  readonly routeConfigContextsByIdentity: ReadonlyMap<IdentityHandle, RouteConfigContextModel>;
  readonly routeConfigContextsByRouteConfigIdentity: ReadonlyMap<IdentityHandle, RouteConfigContextModel>;
  readonly routeParameterEndpointPlans: Map<ProductHandle, MutableRouteParameterEndpointPlan>;
  readonly emissions: RouteInstructionEmission[];
  readonly issues: RouterIssueModel[];
  readonly issueRecords: KernelStoreRecord[];
  readonly openSeams: OpenSeam[];
  readonly openRecords: KernelStoreRecord[];
}

type RouteInstructionTemplateResource = TemplateCompilationProjectEmission['resources'][number];

export interface RouteParameterEndpointPlan {
  readonly endpointProductHandles: readonly ProductHandle[];
  readonly isOpen: boolean;
}

interface MutableRouteParameterEndpointPlan {
  readonly endpointProductHandles: Set<ProductHandle>;
  isOpen: boolean;
}

/** Router instruction products created before route-tree transition compilation. */
export class RouteInstructionMaterializationProjectResult {
  constructor(
    readonly typedNavigationInstructions: readonly TypedNavigationInstructionModel[],
    readonly viewportInstructions: readonly ViewportInstructionModel[],
    readonly viewportInstructionTrees: readonly ViewportInstructionTreeModel[],
    readonly issues: readonly RouterIssueModel[],
    readonly openSeams: readonly OpenSeam[],
    readonly routeParameterEndpointPlans: ReadonlyMap<ProductHandle, RouteParameterEndpointPlan>,
  ) {}

  readTypedNavigationInstructions(): readonly TypedNavigationInstructionModel[] {
    return this.typedNavigationInstructions;
  }

  readViewportInstructions(): readonly ViewportInstructionModel[] {
    return this.viewportInstructions;
  }

  readViewportInstructionTrees(): readonly ViewportInstructionTreeModel[] {
    return this.viewportInstructionTrees;
  }

  readIssues(): readonly RouterIssueModel[] {
    return this.issues;
  }

  readRouteParameterEndpointPlans(): ReadonlyMap<ProductHandle, RouteParameterEndpointPlan> {
    return this.routeParameterEndpointPlans;
  }
}

/** Materialize static load/href ViewportInstructionTree products from router resource controllers. */
export class RouteInstructionMaterializationProjectPass {
  materializeAndEmit(
    publication: KernelPublicationContext,
    project: ProjectBootFrame,
    routeConfigContexts: RouteConfigContextMaterializationProjectResult,
    routeRecognizer: RouteRecognizerMaterializationProjectResult,
    routeRuntime: RouteRuntimeTopologyProjectResult,
    templates: TemplateCompilationProjectEmission,
    routerOptions: RouterOptionsMaterializationProjectResult,
    resourceIndex: ResourceDefinitionIndex,
    sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
  ): RouteInstructionMaterializationProjectResult {
    const state = createRouteInstructionMaterializationState(
      publication,
      resourceIndex,
      templates,
      routeConfigContexts,
      routeRecognizer,
      routeRuntime,
      sourceValueEvaluator,
    );
    this.collectRouteInstructionEmissions(publication, templates, routerOptions, state);

    const records = [
      ...state.emissions.flatMap((emission) => emission.records),
      ...state.issueRecords,
      ...state.openRecords,
    ];
    publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(records, `router-instructions:${project.projectKey}`),
    ));
    return new RouteInstructionMaterializationProjectResult(
      state.emissions.flatMap((emission) => emission.typedNavigationInstructions),
      state.emissions.flatMap((emission) => emission.viewportInstructions),
      state.emissions.map((emission) => emission.viewportInstructionTree),
      state.issues,
      state.openSeams,
      routeParameterEndpointPlans(state.routeParameterEndpointPlans),
    );
  }

  private collectRouteInstructionEmissions(
    store: KernelPublicationContext,
    templates: TemplateCompilationProjectEmission,
    routerOptions: RouterOptionsMaterializationProjectResult,
    state: RouteInstructionMaterializationState,
  ): void {
    for (const resource of templates.resources) {
      this.collectResourceInstructionEmissions(store, resource, routerOptions, state);
    }
  }

  private collectResourceInstructionEmissions(
    store: KernelPublicationContext,
    resource: RouteInstructionTemplateResource,
    routerOptions: RouterOptionsMaterializationProjectResult,
    state: RouteInstructionMaterializationState,
  ): void {
    const definitionIdentity = resource.compilation.definition.target.identityHandle;
    const routeContexts = definitionIdentity == null
      ? null
      : state.routeContextsByDefinition.get(definitionIdentity) ?? null;
    for (const controller of resource.runtimeAnalysis.runtimeRendering.controllers) {
      for (const routeContext of routeContextCandidatesForController(controller, routeContexts, state)) {
        this.collectControllerInstructionEmission(store, resource, controller, routeContext, routerOptions, state);
      }
    }
  }

  private collectControllerInstructionEmission(
    store: KernelPublicationContext,
    resource: RouteInstructionTemplateResource,
    controller: RuntimeControllerFrame,
    routeContext: RouteContextModel | null,
    routerOptions: RouterOptionsMaterializationProjectResult,
    state: RouteInstructionMaterializationState,
  ): void {
    const site = routerResourceInstructionSite(
      store,
      controller,
      routeContext,
      resource,
    );
    if (site == null) {
      return;
    }
    const closed = closeRouterResourceInstruction(
      store,
      site,
      state,
      routerOptions,
    );
    if (closed == null) {
      return;
    }
    const emission = closed.kind === 'route-expression'
      ? materializeInstructionTree(
          store,
          closed,
          state.routeContextsByIdentity,
          routerOptions,
          state.openSeams,
          state.openRecords,
          state.issues,
          state.issueRecords,
        )
      : materializeEagerInstructionTree(
          store,
          closed,
          state,
          routerOptions,
        );
    if (emission != null) {
      state.emissions.push(emission);
    }
  }
}

function createRouteInstructionMaterializationState(
  store: KernelPublicationContext,
  resourceIndex: ResourceDefinitionIndex,
  templates: TemplateCompilationProjectEmission,
  routeConfigContexts: RouteConfigContextMaterializationProjectResult,
  routeRecognizer: RouteRecognizerMaterializationProjectResult,
  routeRuntime: RouteRuntimeTopologyProjectResult,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
): RouteInstructionMaterializationState {
  return {
    sourceValueEvaluator,
    resourceIndex,
    eagerPathGeneration: new RouteEagerPathGenerationIndex(routeConfigContexts, routeRecognizer),
    routeContextsByDefinition: routeRuntimeContextsByComponentDefinition(routeConfigContexts, routeRuntime),
    routeContextsByContainerIdentity: routeContextsByContainerIdentity(routeRuntime),
    rootRouteContextsByParentContainerIdentity: rootRouteContextsByParentContainerIdentity(routeRuntime),
    routeContextsByIdentity: new Map(
      routeRuntime.readRouteContexts().map((routeContext) => [routeContext.identityHandle, routeContext] as const),
    ),
    routeConfigContextsByIdentity: new Map(
      routeConfigContexts.readRouteConfigContexts().map((routeConfigContext) => [routeConfigContext.identityHandle, routeConfigContext] as const),
    ),
    routeConfigContextsByRouteConfigIdentity: new Map(
      routeConfigContexts.readRouteConfigContexts().flatMap((routeConfigContext) => {
        const identityHandle = routeConfigContext.config.identityHandle;
        return identityHandle == null ? [] : [[identityHandle, routeConfigContext] as const];
      }),
    ),
    routeParameterEndpointPlans: new Map(),
    emissions: [],
    issues: [],
    issueRecords: [],
    openSeams: [],
    openRecords: [],
  };
}

function recordRouteParameterEndpointPlan(
  site: RouterResourceInstructionSite,
  routeValue: StaticRouterResourceValue | null,
  state: RouteInstructionMaterializationState,
): void {
  if (site.kind !== RouterResourceInstructionKind.Load) {
    return;
  }
  const attributeProductHandle = site.instruction.attribute.productHandle;
  if (attributeProductHandle == null) {
    return;
  }
  const plan = state.routeParameterEndpointPlans.get(attributeProductHandle) ?? {
    endpointProductHandles: new Set<ProductHandle>(),
    isOpen: false,
  };
  state.routeParameterEndpointPlans.set(attributeProductHandle, plan);

  const routeConfigContextIdentity = site.routeContext?.routeConfigContext?.identityHandle ?? null;
  const routeConfigContext = routeConfigContextIdentity == null
    ? null
    : state.routeConfigContextsByIdentity.get(routeConfigContextIdentity) ?? null;
  if (routeConfigContext == null) {
    plan.isOpen = true;
    return;
  }

  if (routeValue?.state !== 'route-expression') {
    plan.isOpen = true;
    return;
  }

  const selection = state.eagerPathGeneration.selectEndpointCandidates(routeConfigContext, {
    kind: EagerRouteComponentKind.String,
    value: routeValue.value,
    localName: routeValue.value,
  });
  if (selection.kind !== 'selected') {
    plan.isOpen = true;
    return;
  }
  for (const candidate of selection.candidates) {
    plan.endpointProductHandles.add(candidate.endpoint.productHandle);
  }
  plan.isOpen ||= selection.errors.length > 0;
}

function routeParameterEndpointPlans(
  plans: ReadonlyMap<ProductHandle, MutableRouteParameterEndpointPlan>,
): ReadonlyMap<ProductHandle, RouteParameterEndpointPlan> {
  return new Map([...plans].map(([attributeProductHandle, plan]) => [
    attributeProductHandle,
    {
      endpointProductHandles: [...plan.endpointProductHandles].sort((left, right) => left.localeCompare(right)),
      isOpen: plan.isOpen,
    },
  ]));
}

function routeContextsByContainerIdentity(
  routeRuntime: RouteRuntimeTopologyProjectResult,
): ReadonlyMap<IdentityHandle, RouteContextModel> {
  return new Map(routeRuntime.readRouteContexts().flatMap((routeContext) => {
    const container = routeRuntime.containerForRouteContext(routeContext.identityHandle);
    const identityHandle = container?.identityHandle ?? routeContext.container?.identityHandle ?? null;
    return identityHandle == null
      ? []
      : [[identityHandle, routeContext] as const];
  }));
}

function rootRouteContextsByParentContainerIdentity(
  routeRuntime: RouteRuntimeTopologyProjectResult,
): ReadonlyMap<IdentityHandle, readonly RouteContextModel[]> {
  const byParent = new Map<IdentityHandle, RouteContextModel[]>();
  for (const routeContext of routeRuntime.readRouteContexts()) {
    if (routeContext.parent != null) {
      continue;
    }
    const routeContextContainer = routeRuntime.containerForRouteContext(routeContext.identityHandle);
    const parentIdentityHandle = routeContextContainer?.parent?.identityHandle ?? null;
    if (parentIdentityHandle == null) {
      continue;
    }
    const existing = byParent.get(parentIdentityHandle);
    if (existing == null) {
      byParent.set(parentIdentityHandle, [routeContext]);
    } else {
      existing.push(routeContext);
    }
  }
  return byParent;
}

function routerResourceInstructionSite(
  store: KernelPublicationContext,
  controller: RuntimeControllerFrame,
  routeContext: RouteContextModel | null,
  resource: RouteInstructionTemplateResource,
): RouterResourceInstructionSite | null {
  const runtimeAnalysis = resource.runtimeAnalysis;
  if (controller.creationKind !== RuntimeControllerCreationKind.CustomAttribute) {
    return null;
  }
  const kind = controller.name === RouterResourceInstructionKind.Load
    ? RouterResourceInstructionKind.Load
    : controller.name === RouterResourceInstructionKind.Href
      ? RouterResourceInstructionKind.Href
      : null;
  if (kind == null || controller.instructionProductHandle == null) {
    return null;
  }
  const instruction = store.readProductDetail(TemplateProductDetails.Instruction, controller.instructionProductHandle);
  if (!(instruction instanceof HydrateAttributeInstruction)) {
    return null;
  }
  const instructionScopes = instructionScopeLookup(runtimeAnalysis.scopes.instructionScopes);
  const host = htmlElementForInstruction(store, instruction);
  return {
    kind,
    routeContext,
    controller,
    instruction,
    runtimeRendering: runtimeAnalysis.runtimeRendering,
    sourceExpressionContexts: new RuntimeBindingSourceExpressionContextProjector(
      runtimeAnalysis.runtimeRendering,
      instructionScopes,
      runtimeAnalysis.scopes.bindingExpressionScopes,
      runtimeAnalysis.expressionResourcePlan,
    ),
    host,
    sourceAddressHandle: instruction.sourceAddressHandle ?? controller.sourceAddressHandle,
  };
}

function routeContextCandidates(
  routeContexts: readonly RouteContextModel[] | null,
): readonly (RouteContextModel | null)[] {
  // Router resources create ViewportInstructionTrees only once a concrete IRouteContext owner is known.
  // Standalone component-definition renders are potential reuse surfaces, not app-level route instruction sites.
  return routeContexts == null || routeContexts.length === 0
    ? []
    : routeContexts;
}

function routeContextCandidatesForController(
  controller: RuntimeControllerFrame,
  definitionRouteContexts: readonly RouteContextModel[] | null,
  state: RouteInstructionMaterializationState,
): readonly (RouteContextModel | null)[] {
  const inheritedRouteContexts = routeContextsFromContainerAncestry(controller.containerFrame, state);
  return routeContextCandidates(
    inheritedRouteContexts.length > 0
      ? inheritedRouteContexts
      : definitionRouteContexts,
  );
}

function routeContextsFromContainerAncestry(
  container: Container | null,
  state: RouteInstructionMaterializationState,
): readonly RouteContextModel[] {
  const matches: RouteContextModel[] = [];
  const seen = new Set<IdentityHandle>();
  let current = container;
  while (current != null) {
    const routeContext = state.routeContextsByContainerIdentity.get(current.identityHandle) ?? null;
    if (routeContext != null && !seen.has(routeContext.identityHandle)) {
      seen.add(routeContext.identityHandle);
      matches.push(routeContext);
    }
    for (const rootContext of state.rootRouteContextsByParentContainerIdentity.get(current.identityHandle) ?? []) {
      if (!seen.has(rootContext.identityHandle)) {
        seen.add(rootContext.identityHandle);
        matches.push(rootContext);
      }
    }
    current = current.parent;
  }
  return matches;
}

function closeRouterResourceInstruction(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  state: RouteInstructionMaterializationState,
  routerOptions: RouterOptionsMaterializationProjectResult,
): ClosedRouterResourceInstruction | null {
  if (site.kind === RouterResourceInstructionKind.Href && hrefHostHasExplicitExternalMarker(store, site.host)) {
    return null;
  }
  if (site.routeContext == null) {
    recordOpenSeam(
      store,
      site,
      'Router resource instruction needs an owning RouteContext before relative ViewportInstructionTree creation can close.',
      [OpenSeamReasonKind.RouterInstructionNeedsRouteContext],
      [],
      state.openSeams,
      state.openRecords,
    );
    return null;
  }
  const property = site.kind === RouterResourceInstructionKind.Load
    ? RouterLoadBindableName.Route
    : RouterHrefBindableName.Value;
  if (site.kind === RouterResourceInstructionKind.Load) {
    const contextOverrideSourceAddressHandle = routerInstructionBindableSourceAddressHandle(
      store,
      site,
      RouterLoadBindableName.Context,
    );
    if (contextOverrideSourceAddressHandle != null) {
      recordRouteParameterEndpointPlan(site, null, state);
      recordOpenSeam(
        store,
        site,
        'Load router resource has a context override; semantic-runtime does not yet remap router instruction ownership across dynamic IRouteContext values.',
        [OpenSeamReasonKind.RouterInstructionNeedsRouteContext],
        [{
          reasonKind: OpenSeamReasonKind.RouterInstructionNeedsRouteContext,
          summary: 'The load.context bindable can replace the owning IRouteContext before ViewportInstructionTree creation.',
          addressHandle: contextOverrideSourceAddressHandle,
        }],
        state.openSeams,
        state.openRecords,
        contextOverrideSourceAddressHandle,
      );
      return null;
    }
  }
  let value: StaticRouterResourceValue | null;
  if (site.kind === RouterResourceInstructionKind.Load) {
    const routeValue = staticRouterResourceValue(
      store,
      site,
      RouterLoadBindableName.Route,
      state.sourceValueEvaluator,
      state.resourceIndex,
    );
    recordRouteParameterEndpointPlan(site, routeValue, state);
    value = staticLoadRouterResourceValue(
      store,
      site,
      state.sourceValueEvaluator,
      routeValue,
    );
  } else {
    value = staticRouterResourceValue(
        store,
        site,
        RouterHrefBindableName.Value,
        state.sourceValueEvaluator,
        state.resourceIndex,
    );
  }
  if (value == null) {
    return null;
  }
  if (
    site.kind === RouterResourceInstructionKind.Href
    && value.state === 'route-expression'
    && value.pressure.length === 0
    && hrefRouteExpressionIsExternal(store, site, value)
  ) {
    return null;
  }
  switch (value.state) {
    case 'route-expression': {
      const openSeamHandles = retainRouterInstructionPressure(
        store,
        site,
        routerOptions,
        property,
        value.sourceAddressHandle,
        value.pressure,
        state,
      );
      return {
        kind: 'route-expression',
        site,
        value: value.value,
        valueSourceAddressHandle: value.sourceAddressHandle,
        openSeamHandles,
      };
    }
    case 'eager-instruction': {
      const openSeamHandles = retainRouterInstructionPressure(
        store,
        site,
        routerOptions,
        property,
        value.sourceAddressHandle,
        value.pressure,
        state,
      );
      return {
        kind: 'eager-instruction',
        site,
        instruction: value.instruction,
        sourceAddressHandle: value.sourceAddressHandle,
        openSeamHandles,
      };
    }
    case 'dynamic':
      recordOpenSeam(
        store,
        site,
        dynamicRouterInstructionSummary(store, site, routerOptions, property, value.reason),
        dynamicRouterInstructionReasonKinds(store, site, routerOptions, value.reasonKinds),
        dynamicRouterInstructionReasonSources(store, site, routerOptions, value.sourceAddressHandle, value.reasonKinds),
        state.openSeams,
        state.openRecords,
        value.sourceAddressHandle,
      );
      return null;
    case 'invalid-instruction':
      recordInvalidInstructionIssue(store, site, value, state.issues, state.issueRecords);
      return null;
    case 'missing':
      recordOpenSeam(
        store,
        site,
        `${site.kind} router resource did not expose a '${property}' value instruction.`,
        [OpenSeamReasonKind.RouterInstructionMissingValue],
        [],
        state.openSeams,
        state.openRecords,
      );
      return null;
  }
}

function retainRouterInstructionPressure(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  routerOptions: RouterOptionsMaterializationProjectResult,
  property: string,
  sourceAddressHandle: AddressHandle | null,
  evaluations: readonly RuntimeBindingSourceValueEvaluation[],
  state: RouteInstructionMaterializationState,
): readonly OpenSeamHandle[] {
  const pressure = projectRuntimeBindingSourceValuePressure(
    store,
    state.sourceValueEvaluator,
    evaluations,
    sourceAddressHandle,
    'router-instruction-pressure',
  );
  if (!pressure.isOpen) {
    return [];
  }
  state.openRecords.push(...pressure.records);
  const summary = dynamicRouterInstructionSummary(
    store,
    site,
    routerOptions,
    property,
    pressure.summary,
  );
  const reasonSources = compactOpenSeamReasonSources([
    ...pressure.reasonSources,
    ...dynamicRouterInstructionReasonSources(
      store,
      site,
      routerOptions,
      sourceAddressHandle,
      [],
    ),
  ]);
  return [recordOpenSeam(
    store,
    site,
    summary,
    dynamicRouterInstructionReasonKinds(store, site, routerOptions, pressure.reasonKinds),
    reasonSources,
    state.openSeams,
    state.openRecords,
    sourceAddressHandle,
  )];
}

function materializeInstructionTree(
  store: KernelPublicationContext,
  closed: ClosedRouteExpressionInstruction,
  routeContextsByIdentity: ReadonlyMap<RouteContextModel['identityHandle'], RouteContextModel>,
  routerOptions: RouterOptionsMaterializationProjectResult,
  openSeams: OpenSeam[],
  openRecords: KernelStoreRecord[],
  issues: RouterIssueModel[],
  issueRecords: KernelStoreRecord[],
): RouteInstructionEmission | null {
  const site = closed.site;
  const local = viewportInstructionTreeLocal(site, closed.value);
  const parsed = parseClosedRouteExpression(store, closed, routeContextsByIdentity, openSeams, openRecords, issues, issueRecords);
  if (parsed == null) {
    return null;
  }
  const ownerHandle = parsed.routeContext.identityHandle;
  const viewportInstructionEmissions = parsed.expression.instructions.map((instruction, index) =>
    materializeViewportInstruction(store, closed, ownerHandle, local, `${index}`, instruction)
  );
  const viewportInstructionTree = viewportInstructionTreeModel(
    store,
    `${local}:tree`,
    parsed,
    viewportInstructionEmissions,
    routerOptions,
    site,
    routerInstructionClosure(closed.openSeamHandles),
  );
  return {
    records: viewportInstructionTreeRecords(
      store,
      `${local}:tree`,
      viewportInstructionTree,
      ownerHandle,
      site.kind,
      viewportInstructionEmissions,
      closed.openSeamHandles,
    ),
    typedNavigationInstructions: viewportInstructionEmissions.flatMap((emission) => emission.typedNavigationInstructions),
    viewportInstructions: viewportInstructionEmissions.flatMap((emission) => emission.viewportInstructions),
    viewportInstructionTree,
  };
}

function viewportInstructionTreeLocal(
  site: RouterResourceInstructionSite,
  value: string,
): string {
  const routeContextIdentity = site.routeContext?.identityHandle ?? 'unowned-route-context';
  return `router-instruction:${routeContextIdentity}:${site.kind}:${site.controller.productHandle}:${localKeyPart(value)}`;
}

function materializeEagerInstructionTree(
  store: KernelPublicationContext,
  closed: ClosedEagerRouterResourceInstruction,
  state: RouteInstructionMaterializationState,
  routerOptions: RouterOptionsMaterializationProjectResult,
): RouteInstructionEmission | null {
  const site = closed.site;
  const routeContext = site.routeContext;
  const routeConfigContextIdentity = routeContext?.routeConfigContext?.identityHandle ?? null;
  const routeConfigContext = routeConfigContextIdentity == null
    ? null
    : state.routeConfigContextsByIdentity.get(routeConfigContextIdentity) ?? null;
  if (routeConfigContext == null) {
    recordOpenSeam(
      store,
      site,
      'Eager router resource instruction needs a materialized RouteConfigContext before path generation can close.',
      [OpenSeamReasonKind.RouterInstructionNeedsRouteContext],
      [],
      state.openSeams,
      state.openRecords,
      closed.sourceAddressHandle,
    );
    return null;
  }

  const result = state.eagerPathGeneration.generate(
    routeConfigContext,
    closed.instruction,
  );
  switch (result.kind) {
    case 'generated': {
      const generated = generatedEagerRouteExpression(
        store,
        closed,
        state,
        routeConfigContext,
        result,
      );
      if (generated == null) {
        return null;
      }
      const value = routePathWithQuery(generated.path, generated.query);
      return materializeInstructionTree(
        store,
        {
          kind: 'route-expression',
          site,
          value,
          valueSourceAddressHandle: generated.sourceAddressHandle ?? closed.sourceAddressHandle,
          openSeamHandles: closed.openSeamHandles,
        },
        state.routeContextsByIdentity,
        routerOptions,
        state.openSeams,
        state.openRecords,
        state.issues,
        state.issueRecords,
      );
    }
    case 'failed':
      recordEagerPathGenerationIssue(store, closed, routeConfigContext, result, state.issues, state.issueRecords);
      return null;
    case 'open':
      recordOpenSeam(
        store,
        site,
        result.reason,
        [OpenSeamReasonKind.RouterInstructionNeedsStaticValue],
        [],
        state.openSeams,
        state.openRecords,
        closed.sourceAddressHandle,
      );
      return null;
    case 'not-eager':
      recordOpenSeam(
        store,
        site,
        result.component == null
          ? 'Eager router resource instruction did not expose a component that RouteConfigContext can resolve.'
          : `Eager router resource instruction component '${result.component}' did not resolve to an eagerly generated route path.`,
        [OpenSeamReasonKind.RouterInstructionNeedsStaticValue],
        [],
        state.openSeams,
        state.openRecords,
        closed.sourceAddressHandle,
      );
      return null;
  }
}

function routePathWithQuery(
  path: string,
  query: ReadonlyMap<string, string>,
): string {
  if (query.size === 0) {
    return path;
  }
  const params = new URLSearchParams();
  for (const [key, value] of query) {
    params.set(key, value);
  }
  return `${path}?${params.toString()}`;
}

interface GeneratedEagerRouteExpression {
  readonly path: string;
  readonly query: ReadonlyMap<string, string>;
  readonly sourceAddressHandle: AddressHandle | null;
}

function generatedEagerRouteExpression(
  store: KernelPublicationContext,
  closed: ClosedEagerRouterResourceInstruction,
  state: RouteInstructionMaterializationState,
  routeConfigContext: RouteConfigContextModel,
  result: Extract<EagerPathGenerationResult, { readonly kind: 'generated' }>,
): GeneratedEagerRouteExpression | null {
  const childRouteContext = result.routeConfig.identityHandle == null
    ? null
    : state.routeConfigContextsByRouteConfigIdentity.get(result.routeConfig.identityHandle) ?? null;
  const childPaths: string[] = [];
  let query = result.query;
  for (const child of closed.instruction.children) {
    const childClosed = closedEagerChildInstruction(closed, child);
    if (childRouteContext == null) {
      recordOpenSeam(
        store,
        closed.site,
        'Eager router instruction children need the generated component RouteConfigContext before recursive path generation can close.',
        [OpenSeamReasonKind.RouterInstructionNeedsRouteContext],
        [],
        state.openSeams,
        state.openRecords,
        closed.sourceAddressHandle,
      );
      return null;
    }
    const childResult = state.eagerPathGeneration.generate(
      childRouteContext,
      child,
      result.endpoint.path,
    );
    switch (childResult.kind) {
      case 'generated': {
        const generatedChild = generatedEagerRouteExpression(
          store,
          childClosed,
          state,
          childRouteContext,
          childResult,
        );
        if (generatedChild == null) {
          return null;
        }
        childPaths.push(generatedChild.path);
        query = mergeRouteQuery(query, generatedChild.query);
        break;
      }
      case 'failed':
        recordEagerPathGenerationIssue(
          store,
          childClosed,
          childRouteContext,
          childResult,
          state.issues,
          state.issueRecords,
        );
        return null;
      case 'open':
        recordOpenSeam(
          store,
          closed.site,
          childResult.reason,
          [OpenSeamReasonKind.RouterInstructionNeedsStaticValue],
          [],
          state.openSeams,
          state.openRecords,
          closed.sourceAddressHandle,
        );
        return null;
      case 'not-eager':
        recordOpenSeam(
          store,
          closed.site,
          childResult.component == null
            ? 'Eager child router instruction did not expose a component that RouteConfigContext can resolve.'
            : `Eager child router instruction component '${childResult.component}' did not resolve to an eagerly generated route path.`,
          [OpenSeamReasonKind.RouterInstructionNeedsStaticValue],
          [],
          state.openSeams,
          state.openRecords,
          closed.sourceAddressHandle,
        );
        return null;
    }
  }
  const ownPath = routePathWithViewport(result.path, closed.instruction.viewport);
  const childPath = childPaths.join('+');
  return {
    path: childPath.length === 0
      ? ownPath
      : ownPath.length === 0 ? childPath : `${ownPath}/${childPath}`,
    query,
    sourceAddressHandle: closed.sourceAddressHandle,
  };
}

function closedEagerChildInstruction(
  parent: ClosedEagerRouterResourceInstruction,
  instruction: EagerPathGenerationInstruction,
): ClosedEagerRouterResourceInstruction {
  return {
    kind: 'eager-instruction',
    site: parent.site,
    instruction,
    sourceAddressHandle: parent.sourceAddressHandle,
    openSeamHandles: parent.openSeamHandles,
  };
}

function mergeRouteQuery(
  left: ReadonlyMap<string, string>,
  right: ReadonlyMap<string, string>,
): ReadonlyMap<string, string> {
  if (right.size === 0) {
    return left;
  }
  const merged = new Map(left);
  for (const [key, value] of right) {
    merged.set(key, value);
  }
  return merged;
}

function routePathWithViewport(
  path: string,
  viewport: string | null,
): string {
  const normalizedViewport = viewport?.trim() ?? '';
  return normalizedViewport.length === 0 || normalizedViewport === 'default' || path.length === 0
    ? path
    : `${path}@${normalizedViewport}`;
}

function recordEagerPathGenerationIssue(
  store: KernelPublicationContext,
  closed: ClosedEagerRouterResourceInstruction,
  routeConfigContext: RouteConfigContextModel,
  result: Extract<ReturnType<RouteEagerPathGenerationIndex['generate']>, { readonly kind: 'failed' }>,
  issues: RouterIssueModel[],
  records: KernelStoreRecord[],
): void {
  const component = result.component;
  const local = [
    'router-route-context-issue',
    'eager-path-generation',
    routeConfigContext.identityHandle,
    closed.site.controller.productHandle,
    localKeyPart(component ?? 'unknown-component'),
    localKeyPart(result.path ?? 'unknown-path'),
  ].join(':');
  const message = `Unable to eagerly generate path for ${component ?? 'router instruction'}; reasons: ${result.errors.join(' ')}`;
  const issue = new RouterIssueModel(
    store.handles.product(local),
    store.handles.identity(local),
    RouterIssuePhase.RouteContextEagerPathGeneration,
    RouterIssueKind.EagerPathGenerationFailed,
    message,
    'error',
    RouterFrameworkErrorCode.EagerPathGenerationFailed,
    result.routeConfig?.toReference() ?? null,
    null,
    null,
    null,
    null,
    component,
    result.path,
    null,
    null,
    closed.sourceAddressHandle,
    [],
  );
  issues.push(issue);
  records.push(...routerIssueProductRecords(store, {
    local,
    issue,
    ownerHandle: result.routeConfig?.identityHandle ?? routeConfigContext.identityHandle,
    sourceAddressHandle: closed.sourceAddressHandle,
    localName: component ?? result.path,
    evidenceSummary: message,
  }));
}

function recordInvalidInstructionIssue(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  value: Extract<StaticRouterResourceValue, { readonly state: 'invalid-instruction' }>,
  issues: RouterIssueModel[],
  records: KernelStoreRecord[],
): void {
  const ownerHandle = site.routeContext?.identityHandle ?? site.controller.identityHandle;
  const sourceAddressHandle = value.sourceAddressHandle ?? site.sourceAddressHandle;
  const local = [
    'router-instruction-issue',
    'invalid-instruction',
    ownerHandle,
    site.controller.productHandle,
    site.kind,
    localKeyPart(value.actual),
  ].join(':');
  const message = `Invalid ${site.kind} router instruction value '${value.actual}'; expected a route string, routeable component, or viewport instruction.`;
  const issue = new RouterIssueModel(
    store.handles.product(local),
    store.handles.identity(local),
    RouterIssuePhase.TypedNavigationInstructionCreation,
    RouterIssueKind.InvalidInstruction,
    message,
    'error',
    RouterFrameworkErrorCode.InstructionInvalid,
    null,
    null,
    site.kind === RouterResourceInstructionKind.Load ? 'route' : 'value',
    'route string, routeable component, or viewport instruction',
    value.actual,
    value.actual,
    null,
    null,
    null,
    sourceAddressHandle,
    [],
  );
  issues.push(issue);
  records.push(...routerIssueProductRecords(store, {
    local,
    issue,
    ownerHandle,
    sourceAddressHandle,
    localName: site.kind,
    evidenceSummary: message,
  }));
}

function viewportInstructionTreeModel(
  store: KernelPublicationContext,
  treeLocal: string,
  parsed: RouterResourceExpression,
  viewportInstructionEmissions: readonly MaterializedViewportInstructionEmission[],
  routerOptions: RouterOptionsMaterializationProjectResult,
  site: RouterResourceInstructionSite,
  closure: RouterClosureKind,
): ViewportInstructionTreeModel {
  const effectiveOptions = routerOptions.readRouterOptionsForReference(parsed.routeContext.options);
  return new ViewportInstructionTreeModel(
    store.handles.product(treeLocal),
    store.handles.identity(treeLocal),
    closure,
    parsed.routeContext.toReference(),
    viewportInstructionEmissions.map((emission) => emission.viewportInstruction.toReference()),
    effectiveOptions?.toReference() ?? null,
    parsed.expression.isAbsolute,
    parsed.expression.queryParamCount,
    routeQueryParameterValues(parsed.expression.queryParams),
    parsed.expression.fragment,
    site.sourceAddressHandle,
  );
}

function routeQueryParameterValues(
  queryParams: ParsedRouteExpression['queryParams'],
): readonly RouteQueryParameterValueModel[] {
  return queryParams.map((queryParam) => new RouteQueryParameterValueModel(queryParam.name, queryParam.value));
}

function viewportInstructionTreeRecords(
  store: KernelPublicationContext,
  treeLocal: string,
  viewportInstructionTree: ViewportInstructionTreeModel,
  ownerHandle: RouteContextModel['identityHandle'],
  localName: string,
  viewportInstructionEmissions: readonly MaterializedViewportInstructionEmission[],
  openSeamHandles: readonly OpenSeamHandle[],
): readonly KernelStoreRecord[] {
  return [
    ...viewportInstructionEmissions.flatMap((emission) => emission.records),
    ...routerProductRecords(store, {
      local: treeLocal,
      evidenceHandle: store.handles.evidence(treeLocal),
      provenanceHandle: store.handles.provenance(treeLocal),
      productHandle: viewportInstructionTree.productHandle,
      identityHandle: viewportInstructionTree.identityHandle,
      productKindKey: KernelVocabulary.Router.ViewportInstructionTree.key,
      ownerHandle,
      sourceAddressHandle: viewportInstructionTree.sourceAddressHandle,
      localName,
      evidenceKind: EvidenceKind.SemanticObservation,
      evidenceRoles: [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
      evidenceSummary: 'Router resource valueChanged created a RouteExpression-backed ViewportInstructionTree before route-tree transition compilation.',
      materializationOpenSeamHandles: openSeamHandles,
    }),
  ];
}

function parseClosedRouteExpression(
  store: KernelPublicationContext,
  closed: ClosedRouteExpressionInstruction,
  routeContextsByIdentity: ReadonlyMap<RouteContextModel['identityHandle'], RouteContextModel>,
  openSeams: OpenSeam[],
  records: KernelStoreRecord[],
  issues: RouterIssueModel[],
  issueRecords: KernelStoreRecord[],
): RouterResourceExpression | null {
  try {
    const normalized = normalizeRouteExpressionInput(closed, routeContextsByIdentity);
    return {
      routeContext: normalized.routeContext,
      expression: parseRouteExpression(normalized.value),
    };
  } catch (error) {
    if (error instanceof RouteExpressionParseFailure) {
      if (closed.openSeamHandles.length > 0) {
        recordOpenSeam(
          store,
          closed.site,
          `Open router instruction candidate could not be parsed as a RouteExpression: ${error.message}`,
          [OpenSeamReasonKind.RouterInstructionParseFailure],
          [{
            reasonKind: OpenSeamReasonKind.RouterInstructionParseFailure,
            summary: error.message,
            addressHandle: closed.valueSourceAddressHandle,
          }],
          openSeams,
          records,
          closed.valueSourceAddressHandle,
        );
        return null;
      }
      recordRouteExpressionParseIssue(store, closed, error, issues, issueRecords);
      return null;
    }
    const reason = error instanceof Error ? error.message : String(error);
    recordOpenSeam(
      store,
      closed.site,
      `${closed.site.kind} router resource value could not be parsed as a RouteExpression: ${reason}`,
      [OpenSeamReasonKind.RouterInstructionParseFailure],
      [],
      openSeams,
      records,
    );
    return null;
  }
}

function recordRouteExpressionParseIssue(
  store: KernelPublicationContext,
  closed: ClosedRouteExpressionInstruction,
  failure: RouteExpressionParseFailure,
  issues: RouterIssueModel[],
  records: KernelStoreRecord[],
): void {
  const site = closed.site;
  const ownerHandle = site.routeContext?.identityHandle ?? site.controller.identityHandle;
  const sourceAddressHandle = closed.valueSourceAddressHandle ?? site.sourceAddressHandle;
  const local = [
    'router-instruction-issue',
    'route-expression-parse',
    ownerHandle,
    site.controller.productHandle,
    failure.failureKind,
    localKeyPart(closed.value),
    failure.offset,
  ].join(':');
  const issueKind = failure.failureKind === 'not-done'
    ? RouterIssueKind.RouteExpressionNotDone
    : RouterIssueKind.RouteExpressionUnexpectedSegment;
  const frameworkErrorCode = failure.failureKind === 'not-done'
    ? RouterFrameworkErrorCode.RouteExpressionNotDone
    : RouterFrameworkErrorCode.RouteExpressionUnexpectedSegment;
  const issue = new RouterIssueModel(
    store.handles.product(local),
    store.handles.identity(local),
    RouterIssuePhase.RouteExpressionParsing,
    issueKind,
    failure.message,
    'error',
    frameworkErrorCode,
    null,
    null,
    site.kind === RouterResourceInstructionKind.Load ? 'route' : 'value',
    failure.expected,
    failure.rest,
    null,
    closed.value,
    null,
    null,
    sourceAddressHandle,
    [],
  );
  issues.push(issue);
  records.push(...routerIssueProductRecords(store, {
    local,
    issue,
    ownerHandle,
    sourceAddressHandle,
    localName: closed.value,
    evidenceSummary: failure.message,
  }));
}

function normalizeRouteExpressionInput(
  closed: ClosedRouteExpressionInstruction,
  routeContextsByIdentity: ReadonlyMap<RouteContextModel['identityHandle'], RouteContextModel>,
): {
  readonly routeContext: RouteContextModel;
  readonly value: string;
} {
  let routeContext = closed.site.routeContext!;
  let value = closed.value;
  let contextChanged = false;
  const prefix = normalizeRouterStringNavigationInstructionPrefix(value);

  switch (prefix.prefixKind) {
    case RouterStringNavigationInstructionPrefixKind.Root:
      routeContext = requiredRouteContextForReference(
        routeContext.root,
        routeContextsByIdentity,
        'Root router instruction could not resolve its root RouteContext reference.',
      );
      value = prefix.routeExpressionInput;
      contextChanged = true;
      break;
    case RouterStringNavigationInstructionPrefixKind.Parent:
      // Match RouteContext.createViewportInstructions: each "../" climbs one context until the framework loop stops.
      while (
        value.startsWith('../')
        && (routeContext.parent != null || contextChanged)
      ) {
        value = value.slice(3);
        if (!contextChanged) {
          routeContext = requiredRouteContextForReference(
            routeContext.parent,
            routeContextsByIdentity,
            'Parent-relative router instruction could not resolve its parent RouteContext reference.',
          );
        }
      }
      contextChanged = true;
      break;
    case RouterStringNavigationInstructionPrefixKind.Current:
      value = prefix.routeExpressionInput;
      break;
    case RouterStringNavigationInstructionPrefixKind.None:
      break;
  }

  return { routeContext, value };
}

function requiredRouteContextForReference(
  reference: RouteContextModel['parent'] | RouteContextModel['root'],
  routeContextsByIdentity: ReadonlyMap<RouteContextModel['identityHandle'], RouteContextModel>,
  message: string,
): RouteContextModel {
  const identityHandle = reference?.identityHandle ?? null;
  if (identityHandle == null) {
    throw new Error(message);
  }
  const routeContext = routeContextsByIdentity.get(identityHandle) ?? null;
  if (routeContext == null) {
    throw new Error(message);
  }
  return routeContext;
}

function materializeViewportInstruction(
  store: KernelPublicationContext,
  closed: ClosedRouteExpressionInstruction,
  ownerHandle: RouteContextModel['identityHandle'],
  treeLocal: string,
  indexPath: string,
  instruction: ParsedViewportInstruction,
): MaterializedViewportInstructionEmission {
  const site = closed.site;
  const local = `${treeLocal}:viewport:${indexPath}`;
  const typedLocal = `${local}:typed`;
  const childEmissions = materializeChildViewportInstructions(
    store,
    closed,
    ownerHandle,
    treeLocal,
    indexPath,
    instruction,
  );
  const typedInstruction = typedNavigationInstructionForViewport(
    store,
    typedLocal,
    closed,
    instruction,
  );
  const viewportInstruction = viewportInstructionForParsedInstruction(
    store,
    local,
    site,
    instruction,
    typedInstruction,
    childEmissions,
  );
  return {
    records: [
      ...childEmissions.flatMap((emission) => emission.records),
      ...viewportInstructionRecords(
        store,
        local,
        typedLocal,
        ownerHandle,
        instruction,
        typedInstruction,
        viewportInstruction,
        closed.openSeamHandles,
      ),
    ],
    typedNavigationInstructions: [
      ...childEmissions.flatMap((emission) => emission.typedNavigationInstructions),
      typedInstruction,
    ],
    viewportInstructions: [
      ...childEmissions.flatMap((emission) => emission.viewportInstructions),
      viewportInstruction,
    ],
    viewportInstruction,
  };
}

function materializeChildViewportInstructions(
  store: KernelPublicationContext,
  closed: ClosedRouteExpressionInstruction,
  ownerHandle: RouteContextModel['identityHandle'],
  treeLocal: string,
  indexPath: string,
  instruction: ParsedViewportInstruction,
): readonly MaterializedViewportInstructionEmission[] {
  return instruction.children.map((child, index) =>
    materializeViewportInstruction(store, closed, ownerHandle, treeLocal, `${indexPath}.${index}`, child)
  );
}

function typedNavigationInstructionForViewport(
  store: KernelPublicationContext,
  typedLocal: string,
  closed: ClosedRouteExpressionInstruction,
  instruction: ParsedViewportInstruction,
): TypedNavigationInstructionModel {
  return new TypedNavigationInstructionModel(
    store.handles.product(typedLocal),
    store.handles.identity(typedLocal),
    routerInstructionClosure(closed.openSeamHandles),
    NavigationInstructionKind.String,
    instruction.component,
    null,
    closed.valueSourceAddressHandle ?? closed.site.sourceAddressHandle,
  );
}

function viewportInstructionForParsedInstruction(
  store: KernelPublicationContext,
  local: string,
  site: RouterResourceInstructionSite,
  instruction: ParsedViewportInstruction,
  typedInstruction: TypedNavigationInstructionModel,
  childEmissions: readonly MaterializedViewportInstructionEmission[],
): ViewportInstructionModel {
  return new ViewportInstructionModel(
    store.handles.product(local),
    store.handles.identity(local),
    typedInstruction.closure,
    typedInstruction.toReference(),
    instruction.viewport,
    null,
    instruction.parameterCount,
    childEmissions.map((emission) => emission.viewportInstruction.toReference()),
    instruction.open,
    instruction.close,
    null,
    typedInstruction.sourceAddressHandle ?? site.sourceAddressHandle,
  );
}

function viewportInstructionRecords(
  store: KernelPublicationContext,
  local: string,
  typedLocal: string,
  ownerHandle: RouteContextModel['identityHandle'],
  instruction: ParsedViewportInstruction,
  typedInstruction: TypedNavigationInstructionModel,
  viewportInstruction: ViewportInstructionModel,
  openSeamHandles: readonly OpenSeamHandle[],
): readonly KernelStoreRecord[] {
  return [
    ...typedNavigationInstructionRecords(store, typedLocal, ownerHandle, instruction, typedInstruction, openSeamHandles),
    ...viewportInstructionProductRecords(store, local, ownerHandle, instruction, viewportInstruction, openSeamHandles),
  ];
}

function typedNavigationInstructionRecords(
  store: KernelPublicationContext,
  local: string,
  ownerHandle: RouteContextModel['identityHandle'],
  instruction: ParsedViewportInstruction,
  typedInstruction: TypedNavigationInstructionModel,
  openSeamHandles: readonly OpenSeamHandle[],
): readonly KernelStoreRecord[] {
  return routerProductRecords(store, {
    local,
    evidenceHandle: store.handles.evidence(local),
    provenanceHandle: store.handles.provenance(local),
    productHandle: typedInstruction.productHandle,
    identityHandle: typedInstruction.identityHandle,
    productKindKey: KernelVocabulary.Router.TypedNavigationInstruction.key,
    ownerHandle,
    sourceAddressHandle: typedInstruction.sourceAddressHandle,
    localName: instruction.component,
    evidenceKind: EvidenceKind.SemanticObservation,
    evidenceRoles: [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
    evidenceSummary: 'TypedNavigationInstruction.create normalized one static RouteExpression component segment.',
    materializationOpenSeamHandles: openSeamHandles,
  });
}

function viewportInstructionProductRecords(
  store: KernelPublicationContext,
  local: string,
  ownerHandle: RouteContextModel['identityHandle'],
  instruction: ParsedViewportInstruction,
  viewportInstruction: ViewportInstructionModel,
  openSeamHandles: readonly OpenSeamHandle[],
): readonly KernelStoreRecord[] {
  return routerProductRecords(store, {
    local,
    evidenceHandle: store.handles.evidence(local),
    provenanceHandle: store.handles.provenance(local),
    productHandle: viewportInstruction.productHandle,
    identityHandle: viewportInstruction.identityHandle,
    productKindKey: KernelVocabulary.Router.ViewportInstruction.key,
    ownerHandle,
    sourceAddressHandle: viewportInstruction.sourceAddressHandle,
    localName: instruction.component,
    evidenceKind: EvidenceKind.SemanticObservation,
    evidenceRoles: [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
    evidenceSummary: 'ViewportInstruction.create wrapped a typed RouteExpression segment with viewport, parameter, and child shape.',
    materializationOpenSeamHandles: openSeamHandles,
  });
}

function routerInstructionClosure(
  openSeamHandles: readonly OpenSeamHandle[],
): RouterClosureKind {
  return openSeamHandles.length === 0
    ? RouterClosureKind.Closed
    : RouterClosureKind.Open;
}

type StaticRouterResourceValue =
  | {
      readonly state: 'route-expression';
      readonly value: string;
      readonly sourceAddressHandle: AddressHandle | null;
      readonly dynamicPartCount: number;
      readonly pressure: readonly RuntimeBindingSourceValueEvaluation[];
    }
  | {
      readonly state: 'eager-instruction';
      readonly instruction: EagerPathGenerationInstruction;
      readonly sourceAddressHandle: AddressHandle | null;
      readonly pressure: readonly RuntimeBindingSourceValueEvaluation[];
    }
  | { readonly state: 'dynamic'; readonly reason: string | null; readonly reasonKinds: readonly OpenSeamReasonKind[]; readonly sourceAddressHandle: AddressHandle | null }
  | { readonly state: 'invalid-instruction'; readonly actual: string; readonly sourceAddressHandle: AddressHandle | null }
  | { readonly state: 'missing' };

type StaticStringBindingValue = Extract<StaticRouterResourceValue, { readonly state: 'route-expression' }>;

type AcceptedBindingExpressionAst = NonNullable<ReturnType<typeof bindingExpressionAstForProduct>>;

type LoadRouteParametersRead =
  | {
      readonly state: 'closed';
      readonly params: EagerRouteParameters;
      readonly sourceAddressHandle: AddressHandle | null;
      readonly pressure: readonly RuntimeBindingSourceValueEvaluation[];
    }
  | {
      readonly state: 'dynamic';
      readonly reason: string;
      readonly reasonKinds: readonly OpenSeamReasonKind[];
      readonly sourceAddressHandle: AddressHandle | null;
    }
  | {
      readonly state: 'missing';
    };

interface DynamicBindingReason {
  readonly summary: string | null;
  readonly reasonKinds: readonly OpenSeamReasonKind[];
}

function staticLoadRouterResourceValue(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
  routeValue: StaticRouterResourceValue,
): StaticRouterResourceValue | null {
  const params = loadRouteParameters(
    store,
    site,
    sourceValueEvaluator,
  );
  if (params.state === 'missing') {
    return routeValue;
  }
  if (params.state === 'dynamic') {
    return {
      state: 'dynamic',
      reason: params.reason,
      reasonKinds: params.reasonKinds,
      sourceAddressHandle: params.sourceAddressHandle,
    };
  }
  switch (routeValue.state) {
    case 'route-expression':
      return {
        state: 'eager-instruction',
        instruction: {
          component: {
            kind: EagerRouteComponentKind.String,
            value: routeValue.value,
            localName: routeValue.value,
          },
          params: params.params,
          viewport: null,
          children: [],
        },
        sourceAddressHandle: params.sourceAddressHandle ?? routeValue.sourceAddressHandle,
        pressure: [...routeValue.pressure, ...params.pressure],
      };
    case 'eager-instruction':
      return {
        state: 'dynamic',
        reason: 'Load router resource route bindable reduced to an eager instruction object while a sibling params bindable was supplied; the framework would treat the route value as the component, not merge two instruction objects.',
        reasonKinds: [OpenSeamReasonKind.BindingSourceUnsupportedExpression],
        sourceAddressHandle: routeValue.sourceAddressHandle ?? params.sourceAddressHandle,
      };
    case 'dynamic':
    case 'invalid-instruction':
    case 'missing':
      return routeValue;
  }
}

function staticRouterResourceValue(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  property: string,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null = null,
  resourceIndex: ResourceDefinitionIndex,
): StaticRouterResourceValue {
  let sawDynamic = false;
  let dynamicReason: string | null = null;
  let dynamicReasonKinds: readonly OpenSeamReasonKind[] = [];
  let dynamicSourceAddressHandle: AddressHandle | null = null;
  for (const productHandle of site.instruction.bindingInstructionProductHandles) {
    const instruction = store.readProductDetail(TemplateProductDetails.Instruction, productHandle);
    if (instruction instanceof SetPropertyInstruction && instruction.targetProperty === property) {
      const valueSourceAddressHandle = instructionValueSourceAddressHandle(store, instruction);
      return {
        state: 'route-expression',
        value: instruction.value,
        sourceAddressHandle: valueSourceAddressHandle,
        dynamicPartCount: 0,
        pressure: [],
      };
    }
    if (instruction instanceof MultiAttrInstruction && instruction.target === property) {
      const valueSourceAddressHandle = instructionValueSourceAddressHandle(store, instruction);
      if (instruction.command == null && instruction.expressionProductHandle == null) {
        return {
          state: 'route-expression',
          value: instruction.value,
          sourceAddressHandle: valueSourceAddressHandle,
          dynamicPartCount: 0,
          pressure: [],
        };
      }
      const multiAttrValue = expressionRouterResourceValue(
        store,
        site,
        productHandle,
        instruction.expressionProductHandle,
        valueSourceAddressHandle,
        sourceValueEvaluator,
        resourceIndex,
      );
      if (multiAttrValue != null) {
        return multiAttrValue;
      }
      sawDynamic = true;
      dynamicSourceAddressHandle ??= valueSourceAddressHandle;
      const reason = dynamicBindingReason(store, site, productHandle, instruction.expressionProductHandle, sourceValueEvaluator);
      dynamicReason ??= reason?.summary ?? null;
      dynamicReasonKinds = compactOpenSeamReasonKinds([...dynamicReasonKinds, ...(reason?.reasonKinds ?? [])]);
      continue;
    }
    if (instruction instanceof PropertyBindingInstruction && instruction.targetProperty === property) {
      const valueSourceAddressHandle = instructionValueSourceAddressHandle(store, instruction);
      const propertyBound = expressionRouterResourceValue(
        store,
        site,
        productHandle,
        instruction.expressionProductHandle,
        valueSourceAddressHandle,
        sourceValueEvaluator,
        resourceIndex,
      );
      if (propertyBound != null) {
        return propertyBound;
      }
      sawDynamic = true;
      dynamicSourceAddressHandle ??= valueSourceAddressHandle;
      const reason = dynamicBindingReason(store, site, productHandle, instruction.expressionProductHandle, sourceValueEvaluator);
      dynamicReason ??= reason?.summary ?? null;
      dynamicReasonKinds = compactOpenSeamReasonKinds([...dynamicReasonKinds, ...(reason?.reasonKinds ?? [])]);
      continue;
    }
    if (instruction instanceof InterpolationInstruction && instruction.target === property) {
      const valueSourceAddressHandle = instructionValueSourceAddressHandle(store, instruction);
      const interpolated = interpolatedStringValue(
        store,
        site,
        productHandle,
        instruction.expressionProductHandles[0] ?? null,
        valueSourceAddressHandle,
        sourceValueEvaluator,
      );
      if (interpolated != null) {
        return interpolated;
      }
      sawDynamic = true;
      dynamicSourceAddressHandle ??= valueSourceAddressHandle;
      const reason = dynamicBindingReason(store, site, productHandle, instruction.expressionProductHandles[0] ?? null, sourceValueEvaluator);
      dynamicReason ??= reason?.summary ?? null;
      dynamicReasonKinds = compactOpenSeamReasonKinds([...dynamicReasonKinds, ...(reason?.reasonKinds ?? [])]);
    }
  }
  return sawDynamic
    ? {
        state: 'dynamic',
        reason: dynamicReason,
        reasonKinds: dynamicReasonKinds,
        sourceAddressHandle: dynamicSourceAddressHandle,
      }
    : { state: 'missing' };
}

function instructionValueSourceAddressHandle(
  store: KernelPublicationContext,
  instruction:
    | SetPropertyInstruction
    | MultiAttrInstruction
    | PropertyBindingInstruction
    | InterpolationInstruction,
): AddressHandle | null {
  const attribute = instruction.attribute?.productHandle == null
    ? null
    : store.readProductDetail(TemplateProductDetails.HtmlAttribute, instruction.attribute.productHandle);
  return attribute instanceof HtmlAttribute
    ? attribute.valueAddressHandle ?? instruction.sourceAddressHandle
    : instruction.sourceAddressHandle;
}

function routerInstructionBindableSourceAddressHandle(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  property: string,
): AddressHandle | null {
  for (const productHandle of site.instruction.bindingInstructionProductHandles) {
    const instruction = store.readProductDetail(TemplateProductDetails.Instruction, productHandle);
    if (
      instruction instanceof SetPropertyInstruction
      && instruction.targetProperty === property
    ) {
      return instructionValueSourceAddressHandle(store, instruction);
    }
    if (
      instruction instanceof MultiAttrInstruction
      && instruction.target === property
    ) {
      return instructionValueSourceAddressHandle(store, instruction);
    }
    if (
      instruction instanceof PropertyBindingInstruction
      && instruction.targetProperty === property
    ) {
      return instructionValueSourceAddressHandle(store, instruction);
    }
    if (
      instruction instanceof InterpolationInstruction
      && instruction.target === property
    ) {
      return instructionValueSourceAddressHandle(store, instruction);
    }
  }
  return null;
}

function loadRouteParameters(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
): LoadRouteParametersRead {
  for (const productHandle of site.instruction.bindingInstructionProductHandles) {
    const instruction = store.readProductDetail(TemplateProductDetails.Instruction, productHandle);
    if (
      instruction instanceof SetPropertyInstruction
      && instruction.targetProperty === RouterLoadBindableName.Params
    ) {
      continue;
    }
    if (
      instruction instanceof InterpolationInstruction
      && instruction.target === RouterLoadBindableName.Params
    ) {
      continue;
    }
    if (
      instruction instanceof MultiAttrInstruction
      && instruction.target === RouterLoadBindableName.Params
    ) {
      if (instruction.command == null && instruction.expressionProductHandle == null) {
        continue;
      }
      return loadRouteParametersFromExpression(
        store,
        site,
        productHandle,
        instruction.expressionProductHandle,
        instructionValueSourceAddressHandle(store, instruction),
        sourceValueEvaluator,
      );
    }
    if (
      instruction instanceof PropertyBindingInstruction
      && instruction.targetProperty === RouterLoadBindableName.Params
    ) {
      return loadRouteParametersFromExpression(
        store,
        site,
        productHandle,
        instruction.expressionProductHandle,
        instructionValueSourceAddressHandle(store, instruction),
        sourceValueEvaluator,
      );
    }
  }
  return { state: 'missing' };
}

function loadRouteParametersFromExpression(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  expressionProductHandle: ProductHandle | null,
  sourceAddressHandle: AddressHandle | null,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
): LoadRouteParametersRead {
  const expression = expressionProductHandle == null
    ? null
    : bindingExpressionAstForProduct(store, expressionProductHandle);
  if (expression == null) {
    return {
      state: 'dynamic',
      reason: 'Load router resource params binding did not expose a parsed expression.',
      reasonKinds: [OpenSeamReasonKind.BindingSourceUnsupportedExpression],
      sourceAddressHandle,
    };
  }
  const params = eagerRouteParameters(
    expression,
    site,
    bindingInstructionProductHandle,
    sourceValueEvaluator,
  );
  if (params.state === 'dynamic') {
    return {
      state: 'dynamic',
      reason: params.reason,
      reasonKinds: params.reasonKinds,
      sourceAddressHandle,
    };
  }
  return {
    state: 'closed',
    params: params.params,
    sourceAddressHandle,
    pressure: params.pressure,
  };
}

function expressionRouterResourceValue(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  expressionProductHandle: ProductHandle | null,
  sourceAddressHandle: AddressHandle | null,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null = null,
  resourceIndex: ResourceDefinitionIndex,
): StaticRouterResourceValue | null {
  const expression = expressionProductHandle == null
    ? null
    : bindingExpressionAstForProduct(store, expressionProductHandle);
  if (expression == null) {
    return null;
  }
  const expressionSourceAddressHandle = expressionSourceAddressHandleForProduct(store, expressionProductHandle)
    ?? sourceAddressHandle;
  if (expression.$kind === 'ObjectLiteral') {
    return eagerInstructionValue(
      expression,
      expressionSourceAddressHandle,
      site,
      bindingInstructionProductHandle,
      sourceValueEvaluator,
      resourceIndex,
    );
  }
  if (expression.$kind === 'Interpolation') {
    return interpolatedStringValue(
      store,
      site,
      bindingInstructionProductHandle,
      expressionProductHandle,
      expressionSourceAddressHandle,
      sourceValueEvaluator,
    );
  }
  const evaluatedInstruction = evaluatedRouterResourceValue(
    expression,
    expressionSourceAddressHandle,
    site,
    bindingInstructionProductHandle,
    sourceValueEvaluator,
    resourceIndex,
  );
  if (evaluatedInstruction != null) {
    return evaluatedInstruction;
  }
  return expressionStringValue(expression, expressionSourceAddressHandle, site, bindingInstructionProductHandle, sourceValueEvaluator)
    ?? invalidClosedRouterInstructionValue(expression, expressionSourceAddressHandle, site, bindingInstructionProductHandle, sourceValueEvaluator);
}

function eagerInstructionValue(
  expression: ObjectLiteralExpression,
  sourceAddressHandle: AddressHandle | null,
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
  resourceIndex: ResourceDefinitionIndex,
): StaticRouterResourceValue | null {
  if (sourceValueEvaluator == null) {
    return null;
  }
  const instruction = eagerInstructionFromObjectLiteral(expression, site, bindingInstructionProductHandle, sourceValueEvaluator, resourceIndex);
  if (instruction.state === 'missing') {
    return null;
  }
  if (instruction.state === 'dynamic') {
    return {
      state: 'dynamic',
      reason: instruction.reason,
      reasonKinds: instruction.reasonKinds,
      sourceAddressHandle,
    };
  }
  return {
    state: 'eager-instruction',
    instruction: instruction.instruction,
    sourceAddressHandle,
    pressure: instruction.pressure,
  };
}

type EagerRouteInstructionRead =
  | {
      readonly state: 'closed';
      readonly instruction: EagerPathGenerationInstruction;
      readonly pressure: readonly RuntimeBindingSourceValueEvaluation[];
    }
  | {
      readonly state: 'dynamic';
      readonly reason: string;
      readonly reasonKinds: readonly OpenSeamReasonKind[];
    }
  | {
      readonly state: 'missing';
    };

function eagerInstructionFromObjectLiteral(
  expression: ObjectLiteralExpression,
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
  resourceIndex: ResourceDefinitionIndex,
): EagerRouteInstructionRead {
  const componentExpression = readObjectLiteralValue(expression, 'component');
  if (componentExpression == null) {
    return { state: 'missing' };
  }
  const component = eagerRouteComponent(componentExpression, site, bindingInstructionProductHandle, sourceValueEvaluator, resourceIndex);
  if (component.state === 'dynamic') {
    return {
      state: 'dynamic',
      reason: component.reason,
      reasonKinds: component.reasonKinds,
    };
  }
  const params = eagerRouteParameters(
    readObjectLiteralValue(expression, 'params'),
    site,
    bindingInstructionProductHandle,
    sourceValueEvaluator,
  );
  if (params.state === 'dynamic') {
    return {
      state: 'dynamic',
      reason: params.reason,
      reasonKinds: params.reasonKinds,
    };
  }
  const viewport = eagerRouteViewport(
    readObjectLiteralValue(expression, 'viewport'),
    site,
    bindingInstructionProductHandle,
    sourceValueEvaluator,
  );
  if (viewport.state === 'dynamic') {
    return {
      state: 'dynamic',
      reason: viewport.reason,
      reasonKinds: viewport.reasonKinds,
    };
  }
  const children = eagerRouteChildren(
    readObjectLiteralValue(expression, 'children'),
    site,
    bindingInstructionProductHandle,
    sourceValueEvaluator,
    resourceIndex,
  );
  if (children.state === 'dynamic') {
    return {
      state: 'dynamic',
      reason: children.reason,
      reasonKinds: children.reasonKinds,
    };
  }
  return {
    state: 'closed',
    instruction: {
      component: component.component,
      params: params.params,
      viewport: viewport.viewport,
      children: children.children,
    },
    pressure: [
      ...component.pressure,
      ...params.pressure,
      ...viewport.pressure,
      ...children.pressure,
    ],
  };
}

type EvaluationObjectLikeRouteInstructionValue =
  | EvaluationObjectValue
  | EvaluationInstanceValue;

type RouterSourceExpressionEvaluationFrame =
  | {
      readonly state: 'open';
      readonly evaluation: RuntimeBindingSourceValueEvaluation;
    }
  | {
      readonly state: 'context';
      readonly context: RuntimeBindingSourceValueEvaluationContext;
    };

function evaluateRouterSourceExpression(
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  expression: ExpressionAstNode,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
): RuntimeBindingSourceValueEvaluation {
  const frame = routerSourceExpressionEvaluationFrame(site, bindingInstructionProductHandle, expression);
  return frame.state === 'open'
    ? frame.evaluation
    : sourceValueEvaluator.evaluate(frame.context);
}

function routerSourceExpressionEvaluationFrame(
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  expression: ExpressionAstNode,
): RouterSourceExpressionEvaluationFrame {
  const bindings = site.runtimeRendering.readBindingsForInstruction(bindingInstructionProductHandle)
    .filter(isRuntimeExpressionBinding)
    .filter((binding) =>
      site.runtimeRendering.requireRenderContextForBinding(binding.productHandle)
        .targetController.productHandle === site.controller.productHandle
    );
  if (bindings.length !== 1) {
    return {
      state: 'open',
      evaluation: RuntimeBindingSourceValueEvaluation.open(
        bindings.length === 0
          ? 'Router resource binding source did not retain a rendered binding for its concrete custom-attribute controller.'
          : 'Router resource binding source retained more than one rendered binding for its concrete custom-attribute controller.',
        [OpenSeamReasonKind.BindingSourceSlotNoStaticValue],
      ),
    };
  }
  const binding = bindings[0]!;
  const projection = site.sourceExpressionContexts.projectSource({
    binding,
    expressionProductHandle: expressionProductHandleForBinding(binding),
    expressionChainIndex: aggregateRuntimeBindingSourceExpressionChainIndex(expression),
    expression,
    localKey: `router-resource:${binding.productHandle}:source-value:${expression.span.start}:${expression.span.end}`,
  });
  if (projection.kind === RuntimeBindingSourceExpressionProjectionKind.Open) {
    return {
      state: 'open',
      evaluation: RuntimeBindingSourceValueEvaluation.open(
        projection.openReason,
        [OpenSeamReasonKind.BindingSourceSlotNoStaticValue],
      ),
    };
  }
  return {
    state: 'context',
    context: sourceValueContextForRuntimeBindingSourceExpressionProjection(projection),
  };
}

function eagerInstructionFromObjectValue(
  value: EvaluationObjectLikeRouteInstructionValue,
  resourceIndex: ResourceDefinitionIndex,
): EagerRouteInstructionRead {
  const componentProperty = readRouteInstructionObjectProperty(value, 'component');
  if (componentProperty.value == null) {
    return value.mayHaveUnknownProperties
      ? {
          state: 'dynamic',
          reason: 'Eager router instruction object did not expose a statically known component property.',
          reasonKinds: [OpenSeamReasonKind.RouterInstructionNeedsStaticValue],
        }
      : { state: 'missing' };
  }
  const componentValue = eagerRouteComponentFromValue(componentProperty.value, resourceIndex);
  const component = componentValue.state === 'dynamic'
    ? componentValue
    : {
        ...componentValue,
        pressure: [...componentValue.pressure, ...componentProperty.pressure],
      };
  if (component.state === 'dynamic') {
    return component;
  }

  const paramsProperty = readRouteInstructionObjectProperty(value, 'params');
  const paramsValue = eagerRouteParametersFromValue(paramsProperty.value);
  const params = paramsValue.state === 'dynamic'
    ? paramsValue
    : {
        ...paramsValue,
        pressure: [...paramsValue.pressure, ...paramsProperty.pressure],
      };
  if (params.state === 'dynamic') {
    return params;
  }

  const viewportProperty = readRouteInstructionObjectProperty(value, 'viewport');
  const viewportValue = eagerRouteViewportFromValue(viewportProperty.value ?? EvaluationUndefined);
  const viewport = viewportValue.state === 'dynamic'
    ? viewportValue
    : {
        ...viewportValue,
        pressure: [...viewportValue.pressure, ...viewportProperty.pressure],
      };
  if (viewport.state === 'dynamic') {
    return viewport;
  }

  const childrenProperty = readRouteInstructionObjectProperty(value, 'children');
  const childrenValue = eagerRouteChildrenFromValue(childrenProperty.value, resourceIndex);
  const children = childrenValue.state === 'dynamic'
    ? childrenValue
    : {
        ...childrenValue,
        pressure: [...childrenValue.pressure, ...childrenProperty.pressure],
      };
  if (children.state === 'dynamic') {
    return children;
  }

  return {
    state: 'closed',
    instruction: {
      component: component.component,
      params: params.params,
      viewport: viewport.viewport,
      children: children.children,
    },
    pressure: [
      ...component.pressure,
      ...params.pressure,
      ...viewport.pressure,
      ...children.pressure,
    ],
  };
}

type EagerRouteComponentRead =
  | {
      readonly state: 'closed';
      readonly component: EagerPathGenerationInstruction['component'];
      readonly pressure: readonly RuntimeBindingSourceValueEvaluation[];
    }
  | {
      readonly state: 'dynamic';
      readonly reason: string;
      readonly reasonKinds: readonly OpenSeamReasonKind[];
    };

function eagerRouteComponent(
  expression: ExpressionAstNode,
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
  resourceIndex: ResourceDefinitionIndex,
): EagerRouteComponentRead {
  const evaluated = evaluateRouterSourceExpression(site, bindingInstructionProductHandle, expression, sourceValueEvaluator);
  if (evaluated.value == null) {
    return {
      state: 'dynamic',
      reason: evaluated.openReason ?? 'Eager router instruction component did not close.',
      reasonKinds: evaluated.openReasonKinds,
    };
  }
  const component = eagerRouteComponentFromValue(evaluated.value, resourceIndex);
  return component.state === 'dynamic'
    ? component
    : {
        ...component,
        pressure: bindingSourceEvaluationPressure(evaluated),
      };
}

function eagerRouteComponentFromValue(
  value: EvaluationValue,
  resourceIndex: ResourceDefinitionIndex,
): EagerRouteComponentRead {
  if (value.kind === EvaluationValueKind.String) {
    return {
      state: 'closed',
      component: {
        kind: EagerRouteComponentKind.String,
        value: value.value,
        localName: value.value,
      },
      pressure: [],
    };
  }
  const definition = resourceIndex.lookupValue(value);
  if (definition != null) {
    return {
      state: 'closed',
      component: {
        kind: EagerRouteComponentKind.RouteableComponent,
        resolvedIdentityHandle: definition.target.identityHandle,
        localName: definition.target.localName,
      },
      pressure: [],
    };
  }
  if (value.kind === EvaluationValueKind.Class || value.kind === EvaluationValueKind.Function) {
    return {
      state: 'closed',
      component: {
        kind: EagerRouteComponentKind.RouteableComponent,
        resolvedIdentityHandle: null,
        localName: value.declaration.name?.getText(value.declaration.getSourceFile()) ?? null,
      },
      pressure: [],
    };
  }
  return {
    state: 'dynamic',
    reason: `Eager router instruction component reduced to '${value.kind}' instead of a string or routeable component.`,
    reasonKinds: [OpenSeamReasonKind.BindingSourceUnsupportedExpression],
  };
}

type EagerRouteParametersRead =
  | {
      readonly state: 'closed';
      readonly params: EagerRouteParameters;
      readonly pressure: readonly RuntimeBindingSourceValueEvaluation[];
    }
  | {
      readonly state: 'dynamic';
      readonly reason: string;
      readonly reasonKinds: readonly OpenSeamReasonKind[];
    };

function eagerRouteParameters(
  expression: ExpressionAstNode | null,
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
): EagerRouteParametersRead {
  if (expression == null) {
    return {
      state: 'closed',
      params: {
        values: new Map(),
        mayHaveUnknownProperties: false,
      },
      pressure: [],
    };
  }
  if (expression.$kind === 'ObjectLiteral') {
    return paramsFromObjectLiteral(expression, site, bindingInstructionProductHandle, sourceValueEvaluator);
  }
  const evaluated = evaluateRouterSourceExpression(site, bindingInstructionProductHandle, expression, sourceValueEvaluator);
  if (evaluated.value == null) {
    return {
      state: 'dynamic',
      reason: evaluated.openReason ?? 'Eager router instruction params did not close.',
      reasonKinds: evaluated.openReasonKinds,
    };
  }
  if (evaluated.value.kind !== EvaluationValueKind.Object) {
    return {
      state: 'dynamic',
      reason: `Eager router instruction params reduced to '${evaluated.value.kind}' instead of an object.`,
      reasonKinds: [OpenSeamReasonKind.BindingSourceUnsupportedExpression],
    };
  }
  const params = paramsFromObjectValue(evaluated.value);
  return {
    ...params,
    pressure: [
      ...params.pressure,
      ...bindingSourceEvaluationPressure(evaluated),
    ],
  };
}

function eagerRouteParametersFromValue(
  value: EvaluationValue | null,
): EagerRouteParametersRead {
  if (value == null || value.kind === EvaluationValueKind.Null || value.kind === EvaluationValueKind.Undefined) {
    return {
      state: 'closed',
      params: emptyEagerRouteParameters(),
      pressure: [],
    };
  }
  if (value.kind !== EvaluationValueKind.Object) {
    return {
      state: 'dynamic',
      reason: `Eager router instruction params reduced to '${value.kind}' instead of an object.`,
      reasonKinds: [OpenSeamReasonKind.BindingSourceUnsupportedExpression],
    };
  }
  return paramsFromObjectValue(value);
}

type EagerRouteViewportRead =
  | {
      readonly state: 'closed';
      readonly viewport: string | null;
      readonly pressure: readonly RuntimeBindingSourceValueEvaluation[];
    }
  | {
      readonly state: 'dynamic';
      readonly reason: string;
      readonly reasonKinds: readonly OpenSeamReasonKind[];
    };

function eagerRouteViewport(
  expression: ExpressionAstNode | null,
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
): EagerRouteViewportRead {
  if (expression == null) {
    return { state: 'closed', viewport: null, pressure: [] };
  }
  const evaluated = evaluateRouterSourceExpression(site, bindingInstructionProductHandle, expression, sourceValueEvaluator);
  if (evaluated.value == null) {
    return {
      state: 'dynamic',
      reason: evaluated.openReason ?? 'Eager router instruction viewport did not close.',
      reasonKinds: evaluated.openReasonKinds,
    };
  }
  if (evaluated.value.kind === EvaluationValueKind.Null || evaluated.value.kind === EvaluationValueKind.Undefined) {
    return {
      state: 'closed',
      viewport: null,
      pressure: bindingSourceEvaluationPressure(evaluated),
    };
  }
  const viewport = eagerRouteViewportFromValue(evaluated.value);
  return viewport.state === 'dynamic'
    ? viewport
    : {
        ...viewport,
        pressure: bindingSourceEvaluationPressure(evaluated),
      };
}

function eagerRouteViewportFromValue(
  value: EvaluationValue,
): EagerRouteViewportRead {
  if (value.kind === EvaluationValueKind.Null || value.kind === EvaluationValueKind.Undefined) {
    return { state: 'closed', viewport: null, pressure: [] };
  }
  if (value.kind === EvaluationValueKind.String) {
    return { state: 'closed', viewport: value.value, pressure: [] };
  }
  return {
    state: 'dynamic',
    reason: `Eager router instruction viewport reduced to '${value.kind}' instead of a string.`,
    reasonKinds: [OpenSeamReasonKind.BindingSourceUnsupportedExpression],
  };
}

type EagerRouteChildrenRead =
  | {
      readonly state: 'closed';
      readonly children: readonly EagerPathGenerationInstruction[];
      readonly pressure: readonly RuntimeBindingSourceValueEvaluation[];
    }
  | {
      readonly state: 'dynamic';
      readonly reason: string;
      readonly reasonKinds: readonly OpenSeamReasonKind[];
    };

function eagerRouteChildren(
  expression: ExpressionAstNode | null,
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
  resourceIndex: ResourceDefinitionIndex,
): EagerRouteChildrenRead {
  if (expression == null) {
    return { state: 'closed', children: [], pressure: [] };
  }
  if (expression.$kind !== 'ArrayLiteral') {
    const evaluated = evaluateRouterSourceExpression(site, bindingInstructionProductHandle, expression, sourceValueEvaluator);
    if (
      evaluated.value?.kind === EvaluationValueKind.Array
    ) {
      const children = eagerRouteChildrenFromArrayValue(evaluated.value, resourceIndex);
      return children.state === 'dynamic'
        ? children
        : {
            ...children,
            pressure: bindingSourceEvaluationPressure(evaluated),
          };
    }
    if (evaluated.closure === RuntimeBindingSourceValueEvaluationClosure.Open) {
      return {
        state: 'dynamic',
        reason: evaluated.openReason ?? 'Eager router instruction children did not close.',
        reasonKinds: evaluated.openReasonKinds,
      };
    }
    return {
      state: 'dynamic',
      reason: `Eager router instruction children reduced from '${expression.$kind}' instead of a static array literal.`,
      reasonKinds: [OpenSeamReasonKind.BindingSourceUnsupportedExpression],
    };
  }
  return eagerRouteChildrenFromArray(expression, site, bindingInstructionProductHandle, sourceValueEvaluator, resourceIndex);
}

function eagerRouteChildrenFromArray(
  expression: ArrayLiteralExpression,
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
  resourceIndex: ResourceDefinitionIndex,
): EagerRouteChildrenRead {
  const children: EagerPathGenerationInstruction[] = [];
  const pressure: RuntimeBindingSourceValueEvaluation[] = [];
  for (const element of expression.elements) {
    const child = eagerRouteChildInstruction(element, site, bindingInstructionProductHandle, sourceValueEvaluator, resourceIndex);
    if (child.state === 'dynamic') {
      return child;
    }
    children.push(child.instruction);
    pressure.push(...child.pressure);
  }
  return { state: 'closed', children, pressure };
}

function eagerRouteChildrenFromArrayValue(
  value: EvaluationArrayValue,
  resourceIndex: ResourceDefinitionIndex,
): EagerRouteChildrenRead {
  if (value.mayHaveUnknownElements || value.mayHaveUnknownOrder) {
    return {
      state: 'dynamic',
      reason: 'Eager router instruction children reduced to an array with unknown membership or order.',
      reasonKinds: [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
    };
  }
  const children: EagerPathGenerationInstruction[] = [];
  const pressure: RuntimeBindingSourceValueEvaluation[] = [];
  for (const element of value.elements) {
    const child = eagerRouteChildInstructionFromValue(element.value, resourceIndex);
    if (child.state === 'dynamic') {
      return child;
    }
    children.push(child.instruction);
    pressure.push(...child.pressure);
  }
  return { state: 'closed', children, pressure };
}

function eagerRouteChildrenFromValue(
  value: EvaluationValue | null,
  resourceIndex: ResourceDefinitionIndex,
): EagerRouteChildrenRead {
  if (value == null || value.kind === EvaluationValueKind.Null || value.kind === EvaluationValueKind.Undefined) {
    return { state: 'closed', children: [], pressure: [] };
  }
  if (value.kind !== EvaluationValueKind.Array) {
    return {
      state: 'dynamic',
      reason: `Eager router instruction children reduced to '${value.kind}' instead of an array.`,
      reasonKinds: [OpenSeamReasonKind.BindingSourceUnsupportedExpression],
    };
  }
  return eagerRouteChildrenFromArrayValue(value, resourceIndex);
}

function eagerRouteChildInstruction(
  expression: ExpressionAstNode,
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
  resourceIndex: ResourceDefinitionIndex,
): Exclude<EagerRouteInstructionRead, { readonly state: 'missing' }> {
  if (expression.$kind === 'ObjectLiteral') {
    const child = eagerInstructionFromObjectLiteral(expression, site, bindingInstructionProductHandle, sourceValueEvaluator, resourceIndex);
    return child.state === 'missing'
      ? {
          state: 'dynamic',
          reason: 'Eager child router instruction object did not expose a component property.',
          reasonKinds: [OpenSeamReasonKind.RouterInstructionNeedsStaticValue],
        }
      : child;
  }
  const component = eagerRouteComponent(expression, site, bindingInstructionProductHandle, sourceValueEvaluator, resourceIndex);
  return instructionFromComponentRead(component);
}

function eagerRouteChildInstructionFromValue(
  value: EvaluationValue,
  resourceIndex: ResourceDefinitionIndex,
): Exclude<EagerRouteInstructionRead, { readonly state: 'missing' }> {
  if (value.kind === EvaluationValueKind.Object) {
    const child = eagerInstructionFromObjectValue(value, resourceIndex);
    return child.state === 'missing'
      ? {
          state: 'dynamic',
          reason: 'Eager child router instruction object did not expose a component property.',
          reasonKinds: [OpenSeamReasonKind.RouterInstructionNeedsStaticValue],
        }
      : child;
  }
  return instructionFromComponentRead(eagerRouteComponentFromValue(value, resourceIndex));
}

function instructionFromComponentRead(
  component: EagerRouteComponentRead,
): Exclude<EagerRouteInstructionRead, { readonly state: 'missing' }> {
  return component.state === 'dynamic'
    ? component
    : {
        state: 'closed',
        instruction: {
          component: component.component,
          params: emptyEagerRouteParameters(),
          viewport: null,
          children: [],
        },
        pressure: component.pressure,
      };
}

function bindingSourceEvaluationPressure(
  evaluation: RuntimeBindingSourceValueEvaluation,
): readonly RuntimeBindingSourceValueEvaluation[] {
  return evaluation.closure === RuntimeBindingSourceValueEvaluationClosure.Open
    ? [evaluation]
    : [];
}

function emptyEagerRouteParameters(): EagerRouteParameters {
  return {
    values: new Map(),
    mayHaveUnknownProperties: false,
  };
}

function paramsFromObjectLiteral(
  expression: ObjectLiteralExpression,
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
): Extract<EagerRouteParametersRead, { readonly state: 'closed' }> {
  const values = new Map<string, EagerRouteParameterValue>();
  const pressure: RuntimeBindingSourceValueEvaluation[] = [];
  let dynamicPartIndex = 0;
  for (let index = 0; index < expression.keys.length; index += 1) {
    const valueExpression = expression.values[index];
    if (valueExpression == null) {
      continue;
    }
    const parameterName = String(expression.keys[index]);
    const evaluated = evaluateRouterSourceExpression(site, bindingInstructionProductHandle, valueExpression, sourceValueEvaluator);
    const parameterValue = eagerRouteParameterValueFromEvaluation(evaluated, parameterName, dynamicPartIndex);
    dynamicPartIndex = parameterValue.nextDynamicPartIndex;
    values.set(parameterName, parameterValue.value);
    pressure.push(...parameterValue.pressure);
  }
  return {
    state: 'closed',
    params: {
      values,
      mayHaveUnknownProperties: false,
    },
    pressure,
  };
}

function paramsFromObjectValue(
  value: EvaluationObjectLikeRouteInstructionValue,
): Extract<EagerRouteParametersRead, { readonly state: 'closed' }> {
  const values = new Map<string, EagerRouteParameterValue>();
  const pressure: RuntimeBindingSourceValueEvaluation[] = [];
  let dynamicPartIndex = 0;
  for (const [name, property] of value.properties) {
    const parameterValue = eagerRouteParameterValue(property.value, dynamicPartIndex);
    dynamicPartIndex = parameterValue.nextDynamicPartIndex;
    values.set(name, parameterValue.value);
    if (property.state === EvaluationObjectPropertyState.Open) {
      pressure.push(RuntimeBindingSourceValueEvaluation.openWithValue(
        property.value,
        `Route parameter '${name}' retains a candidate value that a later unresolved object write may replace.`,
        [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
      ));
    }
  }
  return {
    state: 'closed',
    params: {
      values,
      mayHaveUnknownProperties: value.mayHaveUnknownProperties,
    },
    pressure,
  };
}

interface EagerRouteObjectPropertyRead {
  readonly value: EvaluationValue | null;
  readonly pressure: readonly RuntimeBindingSourceValueEvaluation[];
}

function readRouteInstructionObjectProperty(
  value: EvaluationObjectLikeRouteInstructionValue,
  name: string,
): EagerRouteObjectPropertyRead {
  const property = value.properties.get(name) ?? null;
  if (property == null) {
    return {
      value: null,
      pressure: value.mayHaveUnknownProperties
        ? [RuntimeBindingSourceValueEvaluation.open(
            `Eager router instruction property '${name}' may be supplied by unresolved object members.`,
            [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
          )]
        : [],
    };
  }
  return {
    value: property.value,
    pressure: property.state === EvaluationObjectPropertyState.Open
      ? [RuntimeBindingSourceValueEvaluation.openWithValue(
          property.value,
          `Eager router instruction property '${name}' retains a candidate value that a later unresolved object write may replace.`,
          [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
        )]
      : [],
  };
}

function eagerRouteParameterValue(
  value: EvaluationValue,
  dynamicPartIndex: number,
): { readonly value: EagerRouteParameterValue; readonly nextDynamicPartIndex: number } {
  if (value.kind === EvaluationValueKind.Null || value.kind === EvaluationValueKind.Undefined) {
    return {
      value: {
        kind: 'closed',
        value: null,
      },
      nextDynamicPartIndex: dynamicPartIndex,
    };
  }
  if (isEvaluationPrimitiveValue(value)) {
    return {
      value: {
        kind: 'closed',
        value: String(readEvaluationPrimitive(value)),
      },
      nextDynamicPartIndex: dynamicPartIndex,
    };
  }
  if (
    value.kind === EvaluationValueKind.BoundaryValue
    && value.boundaryKind === EvaluationBoundaryKind.BindingScope
  ) {
    return {
      value: dynamicRouteParameterValue(dynamicPartIndex),
      nextDynamicPartIndex: dynamicPartIndex + 1,
    };
  }
  if (
    value.kind === EvaluationValueKind.StringPattern
    && value.holes.every((hole) => hole.value.boundaryKind === EvaluationBoundaryKind.BindingScope)
  ) {
    return {
      value: dynamicRouteParameterValue(dynamicPartIndex),
      nextDynamicPartIndex: dynamicPartIndex + 1,
    };
  }
  return {
    value: {
      kind: 'open',
      reason: `Route parameter value reduced to '${value.kind}' instead of a primitive.`,
    },
    nextDynamicPartIndex: dynamicPartIndex,
  };
}

function eagerRouteParameterValueFromEvaluation(
  evaluation: RuntimeBindingSourceValueEvaluation,
  parameterName: string,
  dynamicPartIndex: number,
): {
  readonly value: EagerRouteParameterValue;
  readonly nextDynamicPartIndex: number;
  readonly pressure: readonly RuntimeBindingSourceValueEvaluation[];
} {
  if (evaluation.value != null) {
    return {
      ...eagerRouteParameterValue(evaluation.value, dynamicPartIndex),
      pressure: bindingSourceEvaluationPressure(evaluation),
    };
  }
  if (routeParameterValueCanUseDynamicPlaceholder(evaluation)) {
    return {
      value: dynamicRouteParameterValue(dynamicPartIndex),
      nextDynamicPartIndex: dynamicPartIndex + 1,
      pressure: [],
    };
  }
  return {
    value: {
      kind: 'open',
      reason: evaluation.openReason ?? `Route parameter '${parameterName}' did not close.`,
    },
    nextDynamicPartIndex: dynamicPartIndex,
    pressure: [],
  };
}

function dynamicRouteParameterValue(index: number): EagerRouteParameterValue {
  return {
    kind: 'closed',
    value: `__au_dynamic_${index}__`,
  };
}

function routeParameterValueCanUseDynamicPlaceholder(
  evaluation: RuntimeBindingSourceValueEvaluation,
): boolean {
  return evaluation.openReasonKinds.length > 0
    && evaluation.openReasonKinds.every((reasonKind) =>
      reasonKind === OpenSeamReasonKind.BindingSourceSlotNoStaticValue
      || reasonKind === OpenSeamReasonKind.BindingSourceMemberNoStaticValue
    );
}

function readObjectLiteralValue(
  expression: ObjectLiteralExpression,
  name: string,
): ExpressionAstNode | null {
  const index = expression.keys.findIndex((key) => key === name);
  return index < 0 ? null : expression.values[index] ?? null;
}

function expressionStringValue(
  expression: ExpressionAstNode,
  sourceAddressHandle: AddressHandle | null,
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null = null,
): StaticStringBindingValue | null {
  switch (expression.$kind) {
    case 'PrimitiveLiteral':
      return typeof expression.value === 'string'
        ? {
            state: 'route-expression',
            value: expression.value,
            sourceAddressHandle,
            dynamicPartCount: 0,
            pressure: [],
          }
        : null;
    case 'Template':
      return dynamicRouteStringValue(expression.cooked, expression.expressions.length, sourceAddressHandle);
    default:
      return evaluatedStringValue(expression, site, bindingInstructionProductHandle, sourceValueEvaluator, sourceAddressHandle);
  }
}

function interpolatedStringValue(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  expressionProductHandle: ProductHandle | null,
  sourceAddressHandle: AddressHandle | null,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null = null,
): StaticStringBindingValue | null {
  if (expressionProductHandle == null) {
    return null;
  }
  const expression = bindingExpressionAstForProduct(store, expressionProductHandle);
  if (expression?.$kind !== 'Interpolation') {
    return null;
  }
  return dynamicRouteStringValue(expression.parts, expression.expressions.length, sourceAddressHandle)
    ?? evaluatedStringValue(expression, site, bindingInstructionProductHandle, sourceValueEvaluator, sourceAddressHandle);
}

function evaluatedRouterResourceValue(
  expression: AcceptedBindingExpressionAst,
  sourceAddressHandle: AddressHandle | null,
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
  resourceIndex: ResourceDefinitionIndex,
): StaticRouterResourceValue | null {
  if (sourceValueEvaluator == null) {
    return null;
  }
  const evaluation = evaluateRouterSourceExpression(site, bindingInstructionProductHandle, expression, sourceValueEvaluator);
  if (evaluation.value == null) {
    return {
      state: 'dynamic',
      reason: evaluation.openReason,
      reasonKinds: evaluation.openReasonKinds,
      sourceAddressHandle,
    };
  }
  if (evaluation.value.kind === EvaluationValueKind.String) {
    return {
      state: 'route-expression',
      value: evaluation.value.value,
      sourceAddressHandle,
      dynamicPartCount: 0,
      pressure: bindingSourceEvaluationPressure(evaluation),
    };
  }
  if (evaluation.value.kind === EvaluationValueKind.Object || evaluation.value.kind === EvaluationValueKind.Instance) {
    const instruction = eagerInstructionFromObjectValue(evaluation.value, resourceIndex);
    if (instruction.state === 'missing') {
      return null;
    }
    if (instruction.state === 'dynamic') {
      return {
        state: 'dynamic',
        reason: instruction.reason,
        reasonKinds: instruction.reasonKinds,
        sourceAddressHandle,
      };
    }
    return {
      state: 'eager-instruction',
      instruction: instruction.instruction,
      sourceAddressHandle,
      pressure: [
        ...instruction.pressure,
        ...bindingSourceEvaluationPressure(evaluation),
      ],
    };
  }
  return definitelyInvalidInstructionValueKind(evaluation.value.kind)
    ? {
        state: 'invalid-instruction',
        actual: evaluation.value.kind,
        sourceAddressHandle,
      }
    : null;
}

function evaluatedStringValue(
  expression: AcceptedBindingExpressionAst | null,
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
  sourceAddressHandle: AddressHandle | null,
): StaticStringBindingValue | null {
  if (expression == null || sourceValueEvaluator == null) {
    return null;
  }
  const evaluation = evaluateRouterSourceExpression(site, bindingInstructionProductHandle, expression, sourceValueEvaluator);
  if (
    evaluation.value?.kind === EvaluationValueKind.String
  ) {
    return {
      state: 'route-expression',
      value: evaluation.value.value,
      sourceAddressHandle,
      dynamicPartCount: 0,
      pressure: bindingSourceEvaluationPressure(evaluation),
    };
  }
  if (
    evaluation.value?.kind === EvaluationValueKind.StringPattern
  ) {
    const value = dynamicRouteStringValue(
      evaluation.value.parts,
      evaluation.value.holes.length,
      sourceAddressHandle,
    );
    return value == null
      ? null
      : {
          ...value,
          pressure: bindingSourceEvaluationPressure(evaluation),
        };
  }
  return null;
}

function invalidClosedRouterInstructionValue(
  expression: AcceptedBindingExpressionAst,
  sourceAddressHandle: AddressHandle | null,
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
): Extract<StaticRouterResourceValue, { readonly state: 'invalid-instruction' }> | null {
  if (expression.$kind === 'PrimitiveLiteral' && typeof expression.value !== 'string') {
    return {
      state: 'invalid-instruction',
      actual: expression.value === null ? 'null' : typeof expression.value,
      sourceAddressHandle,
    };
  }
  if (sourceValueEvaluator == null) {
    return null;
  }
  const evaluation = evaluateRouterSourceExpression(site, bindingInstructionProductHandle, expression, sourceValueEvaluator);
  if (
    evaluation.closure !== RuntimeBindingSourceValueEvaluationClosure.Value
    || evaluation.value == null
  ) {
    return null;
  }
  return definitelyInvalidInstructionValueKind(evaluation.value.kind)
    ? {
        state: 'invalid-instruction',
        actual: evaluation.value.kind,
        sourceAddressHandle,
      }
    : null;
}

function definitelyInvalidInstructionValueKind(
  kind: EvaluationValueKind,
): boolean {
  switch (kind) {
    case EvaluationValueKind.Undefined:
    case EvaluationValueKind.Null:
    case EvaluationValueKind.Boolean:
    case EvaluationValueKind.Number:
    case EvaluationValueKind.BigInt:
    case EvaluationValueKind.RegularExpression:
      return true;
    default:
      return false;
  }
}

function dynamicBindingReason(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  expressionProductHandle: ProductHandle | null,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
): DynamicBindingReason | null {
  const evaluation = evaluatedBindingExpressionProduct(
    store,
    site,
    bindingInstructionProductHandle,
    expressionProductHandle,
    sourceValueEvaluator,
  );
  return evaluation == null ? null : dynamicBindingReasonForEvaluation(evaluation);
}

function dynamicBindingReasonForEvaluation(
  evaluation: RuntimeBindingSourceValueEvaluation,
): DynamicBindingReason | null {
  if (evaluation.closure === RuntimeBindingSourceValueEvaluationClosure.Open) {
    return {
      summary: evaluation.openReason,
      reasonKinds: evaluation.openReasonKinds,
    };
  }
  return evaluation.value?.kind === EvaluationValueKind.String
    ? null
    : evaluation.value?.kind === EvaluationValueKind.StringPattern
      ? {
          summary: 'Binding source value reduced to a dynamic string pattern without a static route prefix.',
          reasonKinds: evaluation.value.holes.map((hole) =>
            openSeamReasonKindForEvaluationBoundary(hole.value.boundaryKind)
          ),
        }
    : {
        summary: `Binding source value reduced to '${evaluation.value?.kind ?? 'unknown'}' instead of a string.`,
        reasonKinds: [],
      };
}

function expressionSourceAddressHandleForProduct(
  store: KernelPublicationContext,
  expressionProductHandle: ProductHandle | null,
): AddressHandle | null {
  if (expressionProductHandle == null) {
    return null;
  }
  return readTemplateExpressionParse(store, expressionProductHandle)?.sourceAddressHandle ?? null;
}

function evaluatedBindingExpressionProduct(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  bindingInstructionProductHandle: ProductHandle,
  expressionProductHandle: ProductHandle | null,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
): RuntimeBindingSourceValueEvaluation | null {
  if (expressionProductHandle == null || sourceValueEvaluator == null) {
    return null;
  }
  const expression = bindingExpressionAstForProduct(store, expressionProductHandle);
  return expression == null
    ? null
    : evaluateRouterSourceExpression(site, bindingInstructionProductHandle, expression, sourceValueEvaluator);
}

function dynamicRouteStringValue(
  parts: readonly string[],
  dynamicPartCount: number,
  sourceAddressHandle: AddressHandle | null,
): StaticStringBindingValue | null {
  if (dynamicPartCount === 0 || parts.length !== dynamicPartCount + 1 || !hasStaticRoutePrefix(parts[0] ?? '')) {
    return null;
  }
  return {
    state: 'route-expression',
    value: parts.map((part, index) =>
      index < dynamicPartCount ? `${part}__au_dynamic_${index}__` : part
    ).join(''),
    sourceAddressHandle,
    dynamicPartCount,
    pressure: [],
  };
}

function hasStaticRoutePrefix(prefix: string): boolean {
  return prefix
    .replace(/\.\.\//g, '')
    .replace(/\.\//g, '')
    .replace(/[/?#&=._-]/g, '')
    .trim()
    .length > 0;
}

function hrefRouteExpressionIsExternal(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  value: StaticStringBindingValue,
): boolean {
  if (hrefHostHasExplicitExternalMarker(store, site.host)) {
    return true;
  }
  return hrefStringIsExternal(value.value);
}

function hrefHostHasExplicitExternalMarker(
  store: KernelPublicationContext,
  host: HtmlElement | null,
): boolean {
  return hasHostAttribute(store, host, 'external') || hasHostAttribute(store, host, 'data-external');
}

function hrefStringIsExternal(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (trimmed.startsWith('//')) {
    return true;
  }
  if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(trimmed)) {
    return true;
  }
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

function dynamicRouterInstructionSummary(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  routerOptions: RouterOptionsMaterializationProjectResult,
  property: string,
  reason: string | null,
): string {
  const closure = site.kind === RouterResourceInstructionKind.Href
    ? 'ViewportInstructionTree materialization needs a static string value before it can close or prove the href is external.'
    : 'ViewportInstructionTree materialization needs a static string value before it can close.';
  const hostDisposition = hrefClickInterceptionSummary(store, site, routerOptions);
  return `${site.kind} router resource has a dynamic '${property}' binding; ${closure}${hostDisposition == null ? '' : ` ${hostDisposition}`}${reason == null ? '' : ` ${reason}`}`;
}

function dynamicRouterInstructionReasonKinds(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  routerOptions: RouterOptionsMaterializationProjectResult,
  reasonKinds: readonly OpenSeamReasonKind[],
): readonly OpenSeamReasonKind[] {
  return compactOpenSeamReasonKinds([
    OpenSeamReasonKind.RouterInstructionNeedsStaticValue,
    ...(site.kind === RouterResourceInstructionKind.Href ? [
      OpenSeamReasonKind.RouterHrefExternalityOpen,
      ...hrefClickInterceptionReasonKinds(store, site, routerOptions),
    ] : []),
    ...reasonKinds,
  ]);
}

function dynamicRouterInstructionReasonSources(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  routerOptions: RouterOptionsMaterializationProjectResult,
  valueSourceAddressHandle: AddressHandle | null,
  reasonKinds: readonly OpenSeamReasonKind[],
): readonly OpenSeamReasonSource[] {
  const sources: OpenSeamReasonSource[] = [
    {
      reasonKind: OpenSeamReasonKind.RouterInstructionNeedsStaticValue,
      summary: 'The router resource binding value must close statically before ViewportInstructionTree materialization can close.',
      addressHandle: valueSourceAddressHandle,
    },
  ];
  if (site.kind === RouterResourceInstructionKind.Href) {
    sources.push({
      reasonKind: OpenSeamReasonKind.RouterHrefExternalityOpen,
      summary: 'A dynamic href value must close before semantic-runtime can prove whether the URL is external or router-owned.',
      addressHandle: valueSourceAddressHandle,
    });
    sources.push(...hrefClickInterceptionFacts(store, site, routerOptions).map((fact): OpenSeamReasonSource => ({
      reasonKind: fact.reasonKind,
      summary: fact.summary,
      addressHandle: fact.sourceAddressHandle,
    })));
  }
  for (const reasonKind of reasonKinds) {
    sources.push({
      reasonKind,
      summary: 'The binding-source value evaluator reported this open reason while reducing the router resource binding.',
      addressHandle: valueSourceAddressHandle,
    });
  }
  return compactOpenSeamReasonSources(sources);
}

function hrefClickInterceptionSummary(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  routerOptions: RouterOptionsMaterializationProjectResult,
): string | null {
  const facts = hrefClickInterceptionFacts(store, site, routerOptions);
  if (facts.length === 0) {
    return null;
  }
  return `${facts.map((fact) => fact.summary).join(' ')} The href custom attribute still needs the runtime value to decide external URL versus router URL generation.`;
}

function hrefClickInterceptionReasonKinds(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  routerOptions: RouterOptionsMaterializationProjectResult,
): readonly OpenSeamReasonKind[] {
  return compactOpenSeamReasonKinds(hrefClickInterceptionFacts(store, site, routerOptions).map((fact) => fact.reasonKind));
}

interface HrefClickInterceptionFact {
  readonly summary: string;
  readonly reasonKind: OpenSeamReasonKind;
  readonly sourceAddressHandle: AddressHandle | null;
}

function hrefClickInterceptionFacts(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  routerOptions: RouterOptionsMaterializationProjectResult,
): readonly HrefClickInterceptionFact[] {
  if (site.kind !== RouterResourceInstructionKind.Href) {
    return [];
  }
  const facts: HrefClickInterceptionFact[] = [];
  const effectiveOptions = routerOptions.readRouterOptionsForReference(site.routeContext?.options ?? null);
  if (effectiveOptions?.useHref === false) {
    facts.push({
      summary: 'RouterOptions.useHref=false disables router click interception.',
      reasonKind: OpenSeamReasonKind.RouterHrefClickInterceptionDisabled,
      sourceAddressHandle: null,
    });
  }
  if (!hostIsAnchor(site.host)) {
    facts.push({
      summary: 'The host element is not an anchor, so router click interception is disabled.',
      reasonKind: OpenSeamReasonKind.RouterHrefClickInterceptionDisabled,
      sourceAddressHandle: site.host?.sourceAddressHandle ?? null,
    });
    return facts;
  }
  const targetAttribute = hostAttribute(store, site.host, 'target');
  if (targetAttribute != null) {
    const normalized = targetAttribute.rawValue.trim().toLowerCase();
    if (normalized.length > 0 && normalized !== '_self') {
      facts.push({
        summary: 'The host target disables router click interception unless it equals the runtime window name; semantic-runtime keeps that runtime window-name comparison open.',
        reasonKind: OpenSeamReasonKind.RouterHrefClickInterceptionTargetOpen,
        sourceAddressHandle: targetAttribute.valueAddressHandle ?? targetAttribute.sourceAddressHandle,
      });
    }
  }
  if (hostHasRouterLoadResource(store, site.host)) {
    facts.push({
      summary: 'A load custom attribute owns this host, so href click interception is disabled after binding initialization.',
      reasonKind: OpenSeamReasonKind.RouterHrefClickInterceptionDisabled,
      sourceAddressHandle: hostAttribute(store, site.host, RouterResourceInstructionKind.Load)?.sourceAddressHandle
        ?? site.host?.sourceAddressHandle
        ?? null,
    });
  }
  return facts;
}

function hostHasRouterLoadResource(
  store: KernelPublicationContext,
  host: HtmlElement | null,
): boolean {
  return hasHostAttribute(store, host, RouterResourceInstructionKind.Load);
}

function hostIsAnchor(host: HtmlElement | null): boolean {
  return host?.tagName.toUpperCase() === 'A';
}

function htmlElementForInstruction(
  store: KernelPublicationContext,
  instruction: HydrateAttributeInstruction,
): HtmlElement | null {
  const productHandle = instruction.node.productHandle;
  if (productHandle == null) {
    return null;
  }
  const node = store.readProductDetail(TemplateProductDetails.HtmlNode, productHandle);
  return node instanceof HtmlElement ? node : null;
}

function hasHostAttribute(
  store: KernelPublicationContext,
  host: HtmlElement | null,
  attributeName: string,
): boolean {
  return hostAttribute(store, host, attributeName) != null;
}

function hostAttribute(
  store: KernelPublicationContext,
  host: HtmlElement | null,
  attributeName: string,
): HtmlAttribute | null {
  if (host == null) {
    return null;
  }
  for (const attributeReference of host.attributes) {
    const attribute = attributeReference.productHandle == null
      ? null
      : store.readProductDetail(TemplateProductDetails.HtmlAttribute, attributeReference.productHandle);
    if (attribute instanceof HtmlAttribute && attribute.rawName.toLowerCase() === attributeName) {
      return attribute;
    }
  }
  return null;
}

function hostAttributeValue(
  store: KernelPublicationContext,
  host: HtmlElement | null,
  attributeName: string,
): string | null {
  return hostAttribute(store, host, attributeName)?.rawValue ?? null;
}

function recordOpenSeam(
  store: KernelPublicationContext,
  site: RouterResourceInstructionSite,
  summary: string,
  reasonKinds: readonly OpenSeamReasonKind[],
  reasonSources: readonly OpenSeamReasonSource[],
  openSeams: OpenSeam[],
  records: KernelStoreRecord[],
  sourceAddressHandle: AddressHandle | null = site.sourceAddressHandle,
): OpenSeamHandle {
  const routeContextIdentity = site.routeContext?.identityHandle ?? 'unowned-route-context';
  const local = `router-instruction-open:${routeContextIdentity}:${site.kind}:${site.controller.productHandle}:${localKeyPart(summary)}`;
  const emission = routerOpenSeamRecords(store, {
    local,
    seamKindKey: KernelVocabulary.Router.OpenInstruction.key,
    ownerHandle: site.controller.identityHandle,
    summary,
    sourceAddressHandle,
    reasonKinds: compactOpenSeamReasonKinds(reasonKinds),
    reasonSources,
    evidenceKind: EvidenceKind.SemanticObservation,
    evidenceRoles: [EvidenceRole.TransformInput],
  });
  openSeams.push(emission.openSeam);
  records.push(...emission.records);
  return emission.openSeam.handle;
}

function compactOpenSeamReasonKinds(
  values: readonly OpenSeamReasonKind[],
): readonly OpenSeamReasonKind[] {
  return [...new Set(values)];
}

function compactOpenSeamReasonSources(
  values: readonly OpenSeamReasonSource[],
): readonly OpenSeamReasonSource[] {
  const seen = new Set<string>();
  const result: OpenSeamReasonSource[] = [];
  for (const value of values) {
    const key = `${value.reasonKind}:${value.addressHandle ?? 'no-source'}:${value.summary}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }
  return result;
}
