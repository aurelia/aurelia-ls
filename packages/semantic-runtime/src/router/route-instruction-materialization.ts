import type { ProjectBootFrame } from '../boot/frames.js';
import type { BindingScope } from '../configuration/scope.js';
import type { Container } from '../di/container.js';
import type { StaticProjectEvaluationResult } from '../evaluation/project-evaluation.js';
import {
  EvaluationValueKind,
} from '../evaluation/values.js';
import {
  EvidenceKind,
  EvidenceRole,
} from '../kernel/evidence.js';
import type { AddressHandle, IdentityHandle, ProductHandle, ProvenanceHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import { OpenSeam, OpenSeamReasonKind } from '../kernel/open-seam.js';
import {
  fieldProvenanceEntries,
  FieldProvenance,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  RuntimeBindingSourceValueEvaluationKind,
  RuntimeBindingSourceValueEvaluator,
} from '../observation/binding-source-value-evaluator.js';
import { HtmlAttribute, HtmlElement } from '../template/html-ir.js';
import {
  HydrateAttributeInstruction,
  InterpolationInstruction,
  MultiAttrInstruction,
  PropertyBindingInstruction,
  SetPropertyInstruction,
} from '../template/instruction-ir.js';
import { runtimeAcceptedBindingExpressionAstForParse } from '../template/expression-parse-projection.js';
import { TemplateProductDetails } from '../template/product-details.js';
import { RuntimeControllerCreationKind } from '../template/runtime-controller.js';
import type { RuntimeControllerFrame } from '../template/runtime-controller.js';
import type { TemplateCompilationProjectEmission } from '../template/template-compilation-project-pass.js';
import type { TemplateScopeConstructionEmission } from '../template/template-controller-scope-materializer.js';
import {
  NavigationInstructionKind,
  TypedNavigationInstructionModel,
  ViewportInstructionModel,
  ViewportInstructionTreeModel,
  type RouterInstructionField,
  type RouteContextModel,
} from './model.js';
import type { RouteConfigContextMaterializationProjectResult } from './route-context-materialization.js';
import {
  parseRouteExpression,
  type ParsedRouteExpression,
  type ParsedViewportInstruction,
} from './route-expression-parser.js';
import type { RouteRuntimeTopologyProjectResult } from './route-runtime-topology.js';
import { routeRuntimeContextsByComponentDefinition } from './route-topology-index.js';
import { routerOpenSeamRecords, routerProductRecords } from './router-product-records.js';
import type { RouterOptionsMaterializationProjectResult } from './router-options-materialization.js';

export const enum RouterResourceInstructionKind {
  Load = 'load',
  Href = 'href',
}

interface RouterResourceInstructionSite {
  readonly kind: RouterResourceInstructionKind;
  readonly routeContext: RouteContextModel | null;
  readonly controller: RuntimeControllerFrame;
  readonly instruction: HydrateAttributeInstruction;
  readonly scope: BindingScope | null;
  readonly host: HtmlElement | null;
  readonly sourceAddressHandle: AddressHandle | null;
}

interface ClosedRouterResourceInstruction {
  readonly site: RouterResourceInstructionSite;
  readonly value: string;
  readonly valueSourceAddressHandle: AddressHandle | null;
}

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
  readonly routeContextsByDefinition: ReadonlyMap<IdentityHandle, readonly RouteContextModel[]>;
  readonly routeContextsByContainerIdentity: ReadonlyMap<IdentityHandle, RouteContextModel>;
  readonly rootRouteContextsByParentContainerIdentity: ReadonlyMap<IdentityHandle, readonly RouteContextModel[]>;
  readonly routeContextsByIdentity: ReadonlyMap<IdentityHandle, RouteContextModel>;
  readonly emissions: RouteInstructionEmission[];
  readonly openSeams: OpenSeam[];
  readonly openRecords: KernelStoreRecord[];
}

type RouteInstructionTemplateResource = TemplateCompilationProjectEmission['resources'][number];

/** Router instruction products created before route-tree transition compilation. */
export class RouteInstructionMaterializationProjectResult {
  constructor(
    readonly project: ProjectBootFrame,
    readonly typedNavigationInstructions: readonly TypedNavigationInstructionModel[],
    readonly viewportInstructions: readonly ViewportInstructionModel[],
    readonly viewportInstructionTrees: readonly ViewportInstructionTreeModel[],
    readonly openSeams: readonly OpenSeam[],
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
}

/** Materialize static load/href ViewportInstructionTree products from router resource controllers. */
export class RouteInstructionMaterializationProjectPass {
  materializeAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    routeConfigContexts: RouteConfigContextMaterializationProjectResult,
    routeRuntime: RouteRuntimeTopologyProjectResult,
    templates: TemplateCompilationProjectEmission,
    routerOptions: RouterOptionsMaterializationProjectResult,
    evaluation: StaticProjectEvaluationResult,
  ): RouteInstructionMaterializationProjectResult {
    const state = createRouteInstructionMaterializationState(
      store,
      evaluation,
      routeConfigContexts,
      routeRuntime,
    );
    this.collectRouteInstructionEmissions(store, templates, routerOptions, state);

    const records = [
      ...state.emissions.flatMap((emission) => emission.records),
      ...state.openRecords,
    ];
    if (records.length > 0) {
      store.commit(new KernelStoreBatch(records, `router-instructions:${project.projectKey}`));
    }
    return new RouteInstructionMaterializationProjectResult(
      project,
      state.emissions.flatMap((emission) => emission.typedNavigationInstructions),
      state.emissions.flatMap((emission) => emission.viewportInstructions),
      state.emissions.map((emission) => emission.viewportInstructionTree),
      state.openSeams,
    );
  }

  private collectRouteInstructionEmissions(
    store: KernelStore,
    templates: TemplateCompilationProjectEmission,
    routerOptions: RouterOptionsMaterializationProjectResult,
    state: RouteInstructionMaterializationState,
  ): void {
    for (const resource of templates.resources) {
      this.collectResourceInstructionEmissions(store, resource, routerOptions, state);
    }
  }

  private collectResourceInstructionEmissions(
    store: KernelStore,
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
    store: KernelStore,
    resource: RouteInstructionTemplateResource,
    controller: RuntimeControllerFrame,
    routeContext: RouteContextModel | null,
    routerOptions: RouterOptionsMaterializationProjectResult,
    state: RouteInstructionMaterializationState,
  ): void {
    const site = routerResourceInstructionSite(store, controller, routeContext, resource.runtimeAnalysis.scopes);
    if (site == null) {
      return;
    }
    const closed = closeRouterResourceInstruction(
      store,
      site,
      state.sourceValueEvaluator,
      state.openSeams,
      state.openRecords,
    );
    if (closed == null) {
      return;
    }
    const emission = materializeInstructionTree(
      store,
      closed,
      state.routeContextsByIdentity,
      routerOptions,
      state.openSeams,
      state.openRecords,
    );
    if (emission != null) {
      state.emissions.push(emission);
    }
  }
}

function createRouteInstructionMaterializationState(
  store: KernelStore,
  evaluation: StaticProjectEvaluationResult,
  routeConfigContexts: RouteConfigContextMaterializationProjectResult,
  routeRuntime: RouteRuntimeTopologyProjectResult,
): RouteInstructionMaterializationState {
  return {
    sourceValueEvaluator: new RuntimeBindingSourceValueEvaluator(store, evaluation),
    routeContextsByDefinition: routeRuntimeContextsByComponentDefinition(routeConfigContexts, routeRuntime),
    routeContextsByContainerIdentity: routeContextsByContainerIdentity(routeRuntime),
    rootRouteContextsByParentContainerIdentity: rootRouteContextsByParentContainerIdentity(routeRuntime),
    routeContextsByIdentity: new Map(
      routeRuntime.readRouteContexts().map((routeContext) => [routeContext.identityHandle, routeContext] as const),
    ),
    emissions: [],
    openSeams: [],
    openRecords: [],
  };
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
  store: KernelStore,
  controller: RuntimeControllerFrame,
  routeContext: RouteContextModel | null,
  scopes: TemplateScopeConstructionEmission,
): RouterResourceInstructionSite | null {
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
  const instruction = store.productDetails.read(TemplateProductDetails.Instruction, controller.instructionProductHandle);
  if (!(instruction instanceof HydrateAttributeInstruction)) {
    return null;
  }
  const host = htmlElementForInstruction(store, instruction);
  return {
    kind,
    routeContext,
    controller,
    instruction,
    scope: scopeForInstruction(scopes, instruction),
    host,
    sourceAddressHandle: controller.sourceAddressHandle,
  };
}

function routeContextCandidates(
  routeContexts: readonly RouteContextModel[] | null,
): readonly (RouteContextModel | null)[] {
  return routeContexts == null || routeContexts.length === 0
    ? [null]
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

function scopeForInstruction(
  scopes: TemplateScopeConstructionEmission,
  instruction: HydrateAttributeInstruction,
): BindingScope | null {
  return scopes.instructionScopes.find((candidate) =>
    candidate.instructionProductHandle === instruction.productHandle
  )?.scope ?? null;
}

function closeRouterResourceInstruction(
  store: KernelStore,
  site: RouterResourceInstructionSite,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
  openSeams: OpenSeam[],
  records: KernelStoreRecord[],
): ClosedRouterResourceInstruction | null {
  if (site.routeContext == null) {
    recordOpenSeam(
      store,
      site,
      'Router resource instruction needs an owning RouteContext before relative ViewportInstructionTree creation can close.',
      [OpenSeamReasonKind.RouterInstructionNeedsRouteContext],
      openSeams,
      records,
    );
    return null;
  }
  const property = site.kind === RouterResourceInstructionKind.Load ? 'route' : 'value';
  const value = staticStringBindingValue(store, site.instruction, property, site.scope, sourceValueEvaluator);
  if (site.kind === RouterResourceInstructionKind.Href && hrefStaticStringIsExternal(store, site, value)) {
    return null;
  }
  switch (value.state) {
    case 'closed':
      return {
        site,
        value: value.value,
        valueSourceAddressHandle: value.sourceAddressHandle,
      };
    case 'dynamic':
      recordOpenSeam(
        store,
        site,
        dynamicRouterInstructionSummary(site.kind, property, value.reason),
        dynamicRouterInstructionReasonKinds(site.kind, value.reasonKinds),
        openSeams,
        records,
      );
      return null;
    case 'missing':
      recordOpenSeam(
        store,
        site,
        `${site.kind} router resource did not expose a '${property}' value instruction.`,
        [OpenSeamReasonKind.RouterInstructionMissingValue],
        openSeams,
        records,
      );
      return null;
  }
}

function materializeInstructionTree(
  store: KernelStore,
  closed: ClosedRouterResourceInstruction,
  routeContextsByIdentity: ReadonlyMap<RouteContextModel['identityHandle'], RouteContextModel>,
  routerOptions: RouterOptionsMaterializationProjectResult,
  openSeams: OpenSeam[],
  openRecords: KernelStoreRecord[],
): RouteInstructionEmission | null {
  const site = closed.site;
  const local = viewportInstructionTreeLocal(site, closed.value);
  const parsed = parseClosedRouteExpression(store, closed, routeContextsByIdentity, openSeams, openRecords);
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
  );
  return {
    records: viewportInstructionTreeRecords(store, `${local}:tree`, viewportInstructionTree, ownerHandle, site.kind, viewportInstructionEmissions),
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

function viewportInstructionTreeModel(
  store: KernelStore,
  treeLocal: string,
  parsed: RouterResourceExpression,
  viewportInstructionEmissions: readonly MaterializedViewportInstructionEmission[],
  routerOptions: RouterOptionsMaterializationProjectResult,
  site: RouterResourceInstructionSite,
): ViewportInstructionTreeModel {
  const effectiveOptions = routerOptions.readEffectiveRouterOptions();
  return new ViewportInstructionTreeModel(
    store.handles.product(treeLocal),
    store.handles.identity(treeLocal),
    parsed.routeContext.toReference(),
    viewportInstructionEmissions.map((emission) => emission.viewportInstruction.toReference()),
    effectiveOptions?.toReference() ?? null,
    parsed.expression.isAbsolute,
    parsed.expression.queryParamCount,
    parsed.expression.fragment,
    site.sourceAddressHandle,
    viewportInstructionTreeFieldProvenance(store.handles.provenance(treeLocal), effectiveOptions != null),
  );
}

function viewportInstructionTreeRecords(
  store: KernelStore,
  treeLocal: string,
  viewportInstructionTree: ViewportInstructionTreeModel,
  ownerHandle: RouteContextModel['identityHandle'],
  localName: string,
  viewportInstructionEmissions: readonly MaterializedViewportInstructionEmission[],
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
    }),
  ];
}

function parseClosedRouteExpression(
  store: KernelStore,
  closed: ClosedRouterResourceInstruction,
  routeContextsByIdentity: ReadonlyMap<RouteContextModel['identityHandle'], RouteContextModel>,
  openSeams: OpenSeam[],
  records: KernelStoreRecord[],
): RouterResourceExpression | null {
  try {
    const normalized = normalizeRouteExpressionInput(closed, routeContextsByIdentity);
    return {
      routeContext: normalized.routeContext,
      expression: parseRouteExpression(normalized.value),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    recordOpenSeam(
      store,
      closed.site,
      `${closed.site.kind} router resource value could not be parsed as a RouteExpression: ${reason}`,
      [OpenSeamReasonKind.RouterInstructionParseFailure],
      openSeams,
      records,
    );
    return null;
  }
}

function normalizeRouteExpressionInput(
  closed: ClosedRouterResourceInstruction,
  routeContextsByIdentity: ReadonlyMap<RouteContextModel['identityHandle'], RouteContextModel>,
): {
  readonly routeContext: RouteContextModel;
  readonly value: string;
} {
  let routeContext = closed.site.routeContext!;
  let value = closed.value;
  let contextChanged = false;

  if (value.startsWith('/')) {
    routeContext = requiredRouteContextForReference(
      routeContext.root,
      routeContextsByIdentity,
      'Root router instruction could not resolve its root RouteContext reference.',
    );
    value = value.slice(1);
    contextChanged = true;
  } else if (value.startsWith('../')) {
    // Match RouteContext.createViewportInstructions: each "../" climbs one context before the flag flips.
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
  } else if (value.startsWith('./')) {
    value = value.slice(2);
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
  store: KernelStore,
  closed: ClosedRouterResourceInstruction,
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
      ...viewportInstructionRecords(store, local, typedLocal, ownerHandle, instruction, typedInstruction, viewportInstruction),
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
  store: KernelStore,
  closed: ClosedRouterResourceInstruction,
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
  store: KernelStore,
  typedLocal: string,
  closed: ClosedRouterResourceInstruction,
  instruction: ParsedViewportInstruction,
): TypedNavigationInstructionModel {
  return new TypedNavigationInstructionModel(
    store.handles.product(typedLocal),
    store.handles.identity(typedLocal),
    NavigationInstructionKind.String,
    instruction.component,
    null,
    closed.valueSourceAddressHandle ?? closed.site.sourceAddressHandle,
    typedInstructionFieldProvenance(store.handles.provenance(typedLocal)),
  );
}

function viewportInstructionForParsedInstruction(
  store: KernelStore,
  local: string,
  site: RouterResourceInstructionSite,
  instruction: ParsedViewportInstruction,
  typedInstruction: TypedNavigationInstructionModel,
  childEmissions: readonly MaterializedViewportInstructionEmission[],
): ViewportInstructionModel {
  return new ViewportInstructionModel(
    store.handles.product(local),
    store.handles.identity(local),
    typedInstruction.toReference(),
    instruction.viewport,
    null,
    instruction.parameterCount,
    childEmissions.map((emission) => emission.viewportInstruction.toReference()),
    instruction.open,
    instruction.close,
    null,
    site.sourceAddressHandle,
    viewportInstructionFieldProvenance(store.handles.provenance(local), instruction),
  );
}

function viewportInstructionRecords(
  store: KernelStore,
  local: string,
  typedLocal: string,
  ownerHandle: RouteContextModel['identityHandle'],
  instruction: ParsedViewportInstruction,
  typedInstruction: TypedNavigationInstructionModel,
  viewportInstruction: ViewportInstructionModel,
): readonly KernelStoreRecord[] {
  return [
    ...typedNavigationInstructionRecords(store, typedLocal, ownerHandle, instruction, typedInstruction),
    ...viewportInstructionProductRecords(store, local, ownerHandle, instruction, viewportInstruction),
  ];
}

function typedNavigationInstructionRecords(
  store: KernelStore,
  local: string,
  ownerHandle: RouteContextModel['identityHandle'],
  instruction: ParsedViewportInstruction,
  typedInstruction: TypedNavigationInstructionModel,
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
  });
}

function viewportInstructionProductRecords(
  store: KernelStore,
  local: string,
  ownerHandle: RouteContextModel['identityHandle'],
  instruction: ParsedViewportInstruction,
  viewportInstruction: ViewportInstructionModel,
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
  });
}

type StaticStringBindingValue =
  | { readonly state: 'closed'; readonly value: string; readonly sourceAddressHandle: AddressHandle | null; readonly dynamicPartCount: number }
  | { readonly state: 'dynamic'; readonly reason: string | null; readonly reasonKinds: readonly OpenSeamReasonKind[] }
  | { readonly state: 'missing' };

function staticStringBindingValue(
  store: KernelStore,
  hydrate: HydrateAttributeInstruction,
  property: string,
  scope: BindingScope | null = null,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null = null,
): StaticStringBindingValue {
  let sawDynamic = false;
  let dynamicReason: string | null = null;
  let dynamicReasonKinds: readonly OpenSeamReasonKind[] = [];
  for (const productHandle of hydrate.bindingInstructionProductHandles) {
    const instruction = store.productDetails.read(TemplateProductDetails.Instruction, productHandle);
    if (instruction instanceof SetPropertyInstruction && instruction.targetProperty === property) {
      return {
        state: 'closed',
        value: instruction.value,
        sourceAddressHandle: instruction.sourceAddressHandle,
        dynamicPartCount: 0,
      };
    }
    if (instruction instanceof MultiAttrInstruction && instruction.target === property) {
      if (instruction.command == null && instruction.expressionProductHandle == null) {
        return {
          state: 'closed',
          value: instruction.value,
          sourceAddressHandle: instruction.sourceAddressHandle,
          dynamicPartCount: 0,
        };
      }
      const multiAttrInterpolated = interpolatedStringValue(store, instruction.expressionProductHandle, instruction.sourceAddressHandle, scope, sourceValueEvaluator);
      if (multiAttrInterpolated != null) {
        return multiAttrInterpolated;
      }
      sawDynamic = true;
      const reason = dynamicBindingReason(store, instruction.expressionProductHandle, scope, sourceValueEvaluator);
      dynamicReason ??= reason?.summary ?? null;
      dynamicReasonKinds = compactOpenSeamReasonKinds([...dynamicReasonKinds, ...(reason?.reasonKinds ?? [])]);
      continue;
    }
    if (instruction instanceof PropertyBindingInstruction && instruction.targetProperty === property) {
      const propertyBound = expressionStringValue(store, instruction.expressionProductHandle, instruction.sourceAddressHandle, scope, sourceValueEvaluator);
      if (propertyBound != null) {
        return propertyBound;
      }
      sawDynamic = true;
      const reason = dynamicBindingReason(store, instruction.expressionProductHandle, scope, sourceValueEvaluator);
      dynamicReason ??= reason?.summary ?? null;
      dynamicReasonKinds = compactOpenSeamReasonKinds([...dynamicReasonKinds, ...(reason?.reasonKinds ?? [])]);
      continue;
    }
    if (instruction instanceof InterpolationInstruction && instruction.target === property) {
      const interpolated = interpolatedStringValue(store, instruction.expressionProductHandles[0] ?? null, instruction.sourceAddressHandle, scope, sourceValueEvaluator);
      if (interpolated != null) {
        return interpolated;
      }
      sawDynamic = true;
      const reason = dynamicBindingReason(store, instruction.expressionProductHandles[0] ?? null, scope, sourceValueEvaluator);
      dynamicReason ??= reason?.summary ?? null;
      dynamicReasonKinds = compactOpenSeamReasonKinds([...dynamicReasonKinds, ...(reason?.reasonKinds ?? [])]);
    }
  }
  return sawDynamic ? { state: 'dynamic', reason: dynamicReason, reasonKinds: dynamicReasonKinds } : { state: 'missing' };
}

function expressionStringValue(
  store: KernelStore,
  expressionProductHandle: ProductHandle | null,
  sourceAddressHandle: AddressHandle | null,
  scope: BindingScope | null = null,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null = null,
): StaticStringBindingValue | null {
  if (expressionProductHandle == null) {
    return null;
  }
  const parse = store.productDetails.read(TemplateProductDetails.ExpressionParse, expressionProductHandle);
  if (parse == null) {
    return null;
  }
  const expression = runtimeAcceptedBindingExpressionAstForParse(parse);
  if (expression == null) {
    return null;
  }
  switch (expression.$kind) {
    case 'PrimitiveLiteral':
      return typeof expression.value === 'string'
        ? {
            state: 'closed',
            value: expression.value,
            sourceAddressHandle,
            dynamicPartCount: 0,
          }
        : null;
    case 'Template':
      return dynamicRouteStringValue(expression.cooked, expression.expressions.length, sourceAddressHandle);
    default:
      return evaluatedStringValue(expression, scope, sourceValueEvaluator, sourceAddressHandle);
  }
}

function interpolatedStringValue(
  store: KernelStore,
  expressionProductHandle: ProductHandle | null,
  sourceAddressHandle: AddressHandle | null,
  scope: BindingScope | null = null,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null = null,
): StaticStringBindingValue | null {
  if (expressionProductHandle == null) {
    return null;
  }
  const parse = store.productDetails.read(TemplateProductDetails.ExpressionParse, expressionProductHandle);
  if (parse == null) {
    return null;
  }
  const expression = runtimeAcceptedBindingExpressionAstForParse(parse);
  if (expression?.$kind !== 'Interpolation') {
    return null;
  }
  return dynamicRouteStringValue(expression.parts, expression.expressions.length, sourceAddressHandle)
    ?? evaluatedStringValue(expression, scope, sourceValueEvaluator, sourceAddressHandle);
}

function evaluatedStringValue(
  expression: ReturnType<typeof runtimeAcceptedBindingExpressionAstForParse>,
  scope: BindingScope | null,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
  sourceAddressHandle: AddressHandle | null,
): StaticStringBindingValue | null {
  if (expression == null || scope == null || sourceValueEvaluator == null) {
    return null;
  }
  const evaluation = sourceValueEvaluator.evaluate(expression, scope);
  if (
    evaluation.kind === RuntimeBindingSourceValueEvaluationKind.Value
    && evaluation.value?.kind === EvaluationValueKind.String
  ) {
    return {
      state: 'closed',
      value: evaluation.value.value,
      sourceAddressHandle,
      dynamicPartCount: 0,
    };
  }
  return null;
}

function dynamicBindingReason(
  store: KernelStore,
  expressionProductHandle: ProductHandle | null,
  scope: BindingScope | null,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
): { readonly summary: string | null; readonly reasonKinds: readonly OpenSeamReasonKind[] } | null {
  if (expressionProductHandle == null || scope == null || sourceValueEvaluator == null) {
    return null;
  }
  const parse = store.productDetails.read(TemplateProductDetails.ExpressionParse, expressionProductHandle);
  const expression = parse == null ? null : runtimeAcceptedBindingExpressionAstForParse(parse);
  if (expression == null) {
    return null;
  }
  const evaluation = sourceValueEvaluator.evaluate(expression, scope);
  if (evaluation.kind === RuntimeBindingSourceValueEvaluationKind.Open) {
    return {
      summary: evaluation.openReason,
      reasonKinds: evaluation.openReasonKinds,
    };
  }
  return evaluation.value?.kind === EvaluationValueKind.String
    ? null
    : {
        summary: `Binding source value reduced to '${evaluation.value?.kind ?? 'unknown'}' instead of a string.`,
        reasonKinds: [],
      };
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
    state: 'closed',
    value: parts.map((part, index) =>
      index < dynamicPartCount ? `${part}__au_dynamic_${index}__` : part
    ).join(''),
    sourceAddressHandle,
    dynamicPartCount,
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

function hrefStaticStringIsExternal(
  store: KernelStore,
  site: RouterResourceInstructionSite,
  value: StaticStringBindingValue,
): boolean {
  if (hasHostAttribute(store, site.host, 'external') || hasHostAttribute(store, site.host, 'data-external')) {
    return true;
  }
  if (value.state !== 'closed') {
    return false;
  }
  return hrefStringIsExternal(value.value);
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
  kind: RouterResourceInstructionKind,
  property: string,
  reason: string | null,
): string {
  const closure = kind === RouterResourceInstructionKind.Href
    ? 'ViewportInstructionTree materialization needs a static string value before it can close or prove the href is external.'
    : 'ViewportInstructionTree materialization needs a static string value before it can close.';
  return `${kind} router resource has a dynamic '${property}' binding; ${closure}${reason == null ? '' : ` ${reason}`}`;
}

function dynamicRouterInstructionReasonKinds(
  kind: RouterResourceInstructionKind,
  reasonKinds: readonly OpenSeamReasonKind[],
): readonly OpenSeamReasonKind[] {
  return compactOpenSeamReasonKinds([
    OpenSeamReasonKind.RouterInstructionNeedsStaticValue,
    ...(kind === RouterResourceInstructionKind.Href ? [OpenSeamReasonKind.RouterHrefExternalityOpen] : []),
    ...reasonKinds,
  ]);
}

function htmlElementForInstruction(
  store: KernelStore,
  instruction: HydrateAttributeInstruction,
): HtmlElement | null {
  const productHandle = instruction.node.productHandle;
  if (productHandle == null) {
    return null;
  }
  const node = store.productDetails.read(TemplateProductDetails.HtmlNode, productHandle);
  return node instanceof HtmlElement ? node : null;
}

function hasHostAttribute(
  store: KernelStore,
  host: HtmlElement | null,
  attributeName: string,
): boolean {
  if (host == null) {
    return false;
  }
  return host.attributes.some((attributeReference) => {
    const attribute = attributeReference.productHandle == null
      ? null
      : store.productDetails.read(TemplateProductDetails.HtmlAttribute, attributeReference.productHandle);
    return attribute instanceof HtmlAttribute
      && attribute.rawName.toLowerCase() === attributeName;
  });
}

function recordOpenSeam(
  store: KernelStore,
  site: RouterResourceInstructionSite,
  summary: string,
  reasonKinds: readonly OpenSeamReasonKind[],
  openSeams: OpenSeam[],
  records: KernelStoreRecord[],
): void {
  const routeContextIdentity = site.routeContext?.identityHandle ?? 'unowned-route-context';
  const local = `router-instruction-open:${routeContextIdentity}:${site.kind}:${site.controller.productHandle}:${localKeyPart(summary)}`;
  const emission = routerOpenSeamRecords(store, {
    local,
    seamKindKey: KernelVocabulary.Router.OpenInstruction.key,
    ownerHandle: site.controller.identityHandle,
    summary,
    sourceAddressHandle: site.sourceAddressHandle,
    reasonKinds: compactOpenSeamReasonKinds(reasonKinds),
    evidenceKind: EvidenceKind.SemanticObservation,
    evidenceRoles: [EvidenceRole.TransformInput],
  });
  openSeams.push(emission.openSeam);
  records.push(...emission.records);
}

function compactOpenSeamReasonKinds(
  values: readonly OpenSeamReasonKind[],
): readonly OpenSeamReasonKind[] {
  return [...new Set(values)];
}

function typedInstructionFieldProvenance(
  provenanceHandle: ProvenanceHandle,
): readonly FieldProvenance<RouterInstructionField>[] {
  return fieldProvenanceEntries<RouterInstructionField>([
    'instructionKind',
    'value',
    'source',
  ], provenanceHandle);
}

function viewportInstructionFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  instruction: ParsedViewportInstruction,
): readonly FieldProvenance<RouterInstructionField>[] {
  return fieldProvenanceEntries<RouterInstructionField>([
    'component',
    instruction.viewport == null ? null : 'viewport',
    instruction.parameterCount === 0 ? null : 'parameterCount',
    instruction.children.length === 0 ? null : 'children',
    instruction.open === 0 ? null : 'open',
    instruction.close === 0 ? null : 'close',
    'source',
  ], provenanceHandle);
}

function viewportInstructionTreeFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  hasOptions: boolean,
): readonly FieldProvenance<RouterInstructionField>[] {
  return fieldProvenanceEntries<RouterInstructionField>([
    'routeContext',
    'children',
    hasOptions ? 'options' : null,
    'isAbsolute',
    'queryParamCount',
    'fragment',
    'source',
  ], provenanceHandle);
}
