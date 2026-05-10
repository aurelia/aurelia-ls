import type { ProjectBootFrame } from '../boot/frames.js';
import { Container } from '../di/container.js';
import {
  type ContainerChildMaterializationEmission,
  ContainerChildMaterializationRequest,
  ContainerChildMaterializer,
  ContainerContextResolverSlotRequest,
} from '../di/container-materializer.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  EvidenceHandle,
  IdentityHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  fieldProvenanceEntries,
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  HydrateElementInstruction,
  SetPropertyInstruction,
} from '../template/instruction-ir.js';
import { TemplateProductDetails } from '../template/product-details.js';
import type { TemplateCompilationProjectEmission } from '../template/template-compilation-project-pass.js';
import {
  RuntimeControllerCreationKind,
  type RuntimeControllerFrame,
} from '../template/runtime-controller.js';
import {
  RouteConfigContextModel,
  RouteConfigKind,
  RouteContextModel,
  RouterModelKind,
  RouterReference,
  ViewportAgentModel,
  ViewportCustomElementModel,
  ViewportRequestModel,
  type RouteConfigModel,
  type RouteContextField,
  type ViewportAgentField,
  type ViewportField,
} from './model.js';
import type { RouteConfigContextMaterializationProjectResult } from './route-context-materialization.js';
import {
  requiredRouteConfigForContext,
  routeConfigContextsByComponentDefinition,
  routeConfigIndex,
} from './route-topology-index.js';
import { routerIdentityProductRecords, routerProductRecords } from './router-product-records.js';

const DEFAULT_VIEWPORT_NAME = 'default';

interface RouteRuntimeContextEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly routeConfigContext: RouteConfigContextModel;
  readonly routeContext: RouteContextModel;
  readonly container: Container | null;
}

interface ViewportRuntimeEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly draft: ViewportDraft;
  readonly viewport: ViewportCustomElementModel;
  readonly viewportAgent: ViewportAgentModel;
}

class RouteRuntimeTopologyState {
  readonly routeContexts: RouteRuntimeContextEmission[] = [];
  readonly viewports: ViewportRuntimeEmission[] = [];

  addRouteContext(emission: RouteRuntimeContextEmission): void {
    this.routeContexts.push(emission);
  }

  addViewports(emissions: readonly ViewportRuntimeEmission[]): void {
    this.viewports.push(...emissions);
  }

  readRecords(): readonly KernelStoreRecord[] {
    return [
      ...this.routeContexts.flatMap((emission) => emission.records),
      ...this.viewports.flatMap((emission) => emission.records),
    ];
  }
}

interface ViewportProperties {
  readonly name: string;
  readonly usedBy: readonly string[];
  readonly defaultComponent: string | null;
  readonly fallback: string | null;
}

interface ViewportDraft {
  readonly ownerRouteConfigContext: RouteConfigContextModel;
  readonly localKey: string;
  readonly controller: RuntimeControllerFrame;
  readonly properties: ViewportProperties;
  readonly index: number;
}

/** RouteContext, au-viewport, and ViewportAgent products materialized from static router/rendering topology. */
export class RouteRuntimeTopologyProjectResult {
  private readonly routeContextsByRouteConfigContextIdentity: ReadonlyMap<IdentityHandle, readonly RouteContextModel[]>;
  private readonly routeContextByRouteConfigContextAndViewportAgentIdentity: ReadonlyMap<string, RouteContextModel>;
  private readonly viewportsByIdentity: ReadonlyMap<IdentityHandle, ViewportCustomElementModel>;
  private readonly viewportAgentsByRouteContextIdentity: ReadonlyMap<IdentityHandle, readonly ViewportAgentModel[]>;
  private readonly containerByRouteContextIdentity: ReadonlyMap<IdentityHandle, Container>;

  constructor(
    readonly project: ProjectBootFrame,
    readonly routeContexts: readonly RouteContextModel[],
    readonly viewports: readonly ViewportCustomElementModel[],
    readonly viewportAgents: readonly ViewportAgentModel[],
    routeContextContainers: ReadonlyMap<IdentityHandle, Container> = new Map(),
  ) {
    this.routeContextsByRouteConfigContextIdentity = routeContextsByRouteConfigContextIdentity(routeContexts);
    this.routeContextByRouteConfigContextAndViewportAgentIdentity = routeContextsByRouteConfigContextAndViewportAgentIdentity(routeContexts);
    this.viewportsByIdentity = new Map(viewports.map((viewport) => [viewport.identityHandle, viewport] as const));
    this.viewportAgentsByRouteContextIdentity = viewportAgentsByRouteContextIdentity(viewportAgents);
    this.containerByRouteContextIdentity = routeContextContainers;
  }

  readRouteContexts(): readonly RouteContextModel[] {
    return this.routeContexts;
  }

  readViewports(): readonly ViewportCustomElementModel[] {
    return this.viewports;
  }

  readViewportAgents(): readonly ViewportAgentModel[] {
    return this.viewportAgents;
  }

  routeContextsForRouteConfigContext(identityHandle: IdentityHandle | null): readonly RouteContextModel[] {
    return identityHandle == null
      ? []
      : this.routeContextsByRouteConfigContextIdentity.get(identityHandle) ?? [];
  }

  routeContextForRouteConfigContextAndViewportAgent(
    routeConfigContextIdentity: IdentityHandle | null,
    viewportAgentIdentity: IdentityHandle | null,
  ): RouteContextModel | null {
    if (routeConfigContextIdentity == null) {
      return null;
    }
    return this.routeContextByRouteConfigContextAndViewportAgentIdentity.get(
      routeContextViewportAgentKey(routeConfigContextIdentity, viewportAgentIdentity),
    ) ?? null;
  }

  resolveViewportAgent(
    routeContextIdentity: IdentityHandle | null,
    request: ViewportRequestModel,
  ): ViewportAgentModel | null {
    if (routeContextIdentity == null) {
      return null;
    }
    const agents = this.viewportAgentsByRouteContextIdentity.get(routeContextIdentity) ?? [];
    return agents.find((agent) => {
      const viewportIdentity = agent.viewport.identityHandle;
      const viewport = viewportIdentity == null
        ? null
        : this.viewportsByIdentity.get(viewportIdentity) ?? null;
      return viewport != null && viewportHandles(viewport, request);
    }) ?? null;
  }

  containerForRouteContext(identityHandle: IdentityHandle | null): Container | null {
    return identityHandle == null
      ? null
      : this.containerByRouteContextIdentity.get(identityHandle) ?? null;
  }
}

/** Materialize the static RouteContext/ViewportAgent topology without running navigation or activating components. */
export class RouteRuntimeTopologyProjectPass {
  private readonly childContainerMaterializer: ContainerChildMaterializer;

  constructor(
    readonly store: KernelStore,
  ) {
    this.childContainerMaterializer = new ContainerChildMaterializer(store);
  }

  materializeAndEmit(
    project: ProjectBootFrame,
    routeConfigContexts: RouteConfigContextMaterializationProjectResult,
    templates: TemplateCompilationProjectEmission,
  ): RouteRuntimeTopologyProjectResult {
    const state = new RouteRuntimeTopologyFrame(
      this.store,
      this.childContainerMaterializer,
      routeConfigContexts,
      templates,
    ).materialize();
    const records = state.readRecords();
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `router-runtime-topology:${project.projectKey}`));
    }
    return new RouteRuntimeTopologyProjectResult(
      project,
      state.routeContexts.map((emission) => emission.routeContext),
      state.viewports.map((emission) => emission.viewport),
      state.viewports.map((emission) => emission.viewportAgent),
      routeContextContainersByIdentity(state.routeContexts),
    );
  }
}

class RouteRuntimeTopologyFrame {
  private readonly configs: ReadonlyMap<IdentityHandle, RouteConfigModel>;
  private readonly childrenByParent: ReadonlyMap<IdentityHandle, readonly RouteConfigContextModel[]>;
  private readonly viewportDraftsByOwner: ReadonlyMap<IdentityHandle, readonly ViewportDraft[]>;
  private readonly rootContexts: readonly RouteConfigContextModel[];
  private readonly state = new RouteRuntimeTopologyState();

  constructor(
    private readonly store: KernelStore,
    private readonly childContainerMaterializer: ContainerChildMaterializer,
    routeConfigContexts: RouteConfigContextMaterializationProjectResult,
    private readonly templates: TemplateCompilationProjectEmission,
  ) {
    const contexts = routeConfigContexts.readRouteConfigContexts();
    this.configs = routeConfigIndex(routeConfigContexts);
    this.childrenByParent = routeConfigContextChildrenByParent(contexts);
    this.viewportDraftsByOwner = viewportDraftsByOwnerContext(store, routeConfigContexts, templates);
    this.rootContexts = contexts.filter((context) => context.parent == null);
  }

  materialize(): RouteRuntimeTopologyState {
    for (const root of this.rootContexts) {
      this.materializeRouteContextTree(root, null, null);
    }
    return this.state;
  }

  private materializeRouteContextTree(
    routeConfigContext: RouteConfigContextModel,
    parentRouteContext: RouteRuntimeContextEmission | null,
    hostingViewport: ViewportRuntimeEmission | null,
  ): void {
    const routeConfig = requiredRouteConfigForContext(routeConfigContext, this.configs);
    const parentContainer = parentContainerForRouteContext(routeConfig, hostingViewport, this.templates);
    const routeContext = this.materializeRouteContext(
      routeConfigContext,
      parentRouteContext,
      hostingViewport,
      parentContainer,
    );
    this.state.addRouteContext(routeContext);

    const viewports = this.materializeViewports(
      routeConfigContext,
      routeContext.routeContext.toReference(),
      this.viewportDraftsByOwner.get(routeConfigContext.identityHandle) ?? [],
    );
    this.state.addViewports(viewports);

    const children = this.childrenByParent.get(routeConfigContext.identityHandle) ?? [];
    for (const child of children) {
      const childRouteConfig = requiredRouteConfigForContext(child, this.configs);
      for (const childHostingViewport of selectHostingViewports(viewports, childRouteConfig)) {
        this.materializeRouteContextTree(
          child,
          routeContext,
          childHostingViewport,
        );
      }
    }
  }

  private materializeRouteContext(
    routeConfigContext: RouteConfigContextModel,
    parent: RouteRuntimeContextEmission | null,
    hostingViewport: ViewportRuntimeEmission | null,
    parentContainer: Container | null,
  ): RouteRuntimeContextEmission {
    const local = `router-route-context:${routeConfigContext.identityHandle}:${hostingViewport?.viewportAgent.identityHandle ?? 'root'}`;
    const containerEmission = materializedRouteContextContainer(
      this.childContainerMaterializer,
      local,
      routeConfigContext,
      parentContainer,
    );
    const routeContext = materializedRouteContext(
      this.store,
      local,
      routeConfigContext,
      parent,
      hostingViewport,
      containerEmission?.container ?? null,
    );
    return {
      records: [
        ...(containerEmission?.records ?? []),
        ...routeContextRecords(this.store, local, routeConfigContext, routeContext),
      ],
      routeConfigContext,
      routeContext,
      container: containerEmission?.container ?? null,
    };
  }

  private materializeViewports(
    owner: RouteConfigContextModel,
    routeContext: RouterReference,
    drafts: readonly ViewportDraft[],
  ): readonly ViewportRuntimeEmission[] {
    return drafts.map((draft, index) =>
      this.materializeViewport(owner, routeContext, draft, index)
    );
  }

  private materializeViewport(
    owner: RouteConfigContextModel,
    routeContext: RouterReference,
    draft: ViewportDraft,
    index: number,
  ): ViewportRuntimeEmission {
    const local = `router-viewport:${routeContext.identityHandle}:${draft.localKey}:${index}:${draft.controller.productHandle}`;
    const agentLocal = `${local}:agent`;
    const viewport = materializedViewport(this.store, local, routeContext, draft);
    const viewportAgent = materializedViewportAgent(this.store, agentLocal, local, routeContext, draft, viewport);
    return {
      records: viewportRuntimeRecords(this.store, local, agentLocal, owner, draft, viewport, viewportAgent),
      draft,
      viewport,
      viewportAgent,
    };
  }
}

function materializedRouteContextContainer(
  materializer: ContainerChildMaterializer,
  local: string,
  routeConfigContext: RouteConfigContextModel,
  parentContainer: Container | null,
): ContainerChildMaterializationEmission | null {
  if (parentContainer == null) {
    return null;
  }
  const sourceAddressHandle = routeConfigContext.sourceAddressHandle;
  return materializer.materializeChild(new ContainerChildMaterializationRequest(
    `${local}:container`,
    parentContainer,
    sourceAddressHandle,
    `${routeConfigContext.friendlyPath}:route-context-container`,
    [
      new ContainerContextResolverSlotRequest('IController', sourceAddressHandle),
      new ContainerContextResolverSlotRequest('IRouteContext', sourceAddressHandle),
      new ContainerContextResolverSlotRequest('IContextRouter', sourceAddressHandle),
    ],
  ));
}

function materializedRouteContext(
  store: KernelStore,
  local: string,
  routeConfigContext: RouteConfigContextModel,
  parent: RouteRuntimeContextEmission | null,
  hostingViewport: ViewportRuntimeEmission | null,
  container: Container | null,
): RouteContextModel {
  const selfReference = new RouterReference(
    store.handles.product(local),
    store.handles.identity(local),
    RouterModelKind.RouteContext,
    routeConfigContext.sourceAddressHandle,
    routeConfigContext.friendlyPath,
  );
  return new RouteContextModel(
    store.handles.product(local),
    store.handles.identity(local),
    parent?.routeContext.toReference() ?? null,
    parent?.routeContext.root ?? selfReference,
    container?.toReference() ?? null,
    null,
    routeConfigContext.toReference(),
    hostingViewport?.viewportAgent.toReference() ?? null,
    routeConfigContext.friendlyPath,
    routeConfigContext.sourceAddressHandle,
    routeContextFieldProvenance(store.handles.provenance(local), parent, container, hostingViewport),
  );
}

function routeContextRecords(
  store: KernelStore,
  local: string,
  routeConfigContext: RouteConfigContextModel,
  routeContext: RouteContextModel,
): readonly KernelStoreRecord[] {
  const evidenceHandle = store.handles.evidence(local);
  const provenanceHandle = store.handles.provenance(local);
  return routerProductRecords(store, {
    local,
    evidenceHandle,
    provenanceHandle,
    productHandle: routeContext.productHandle,
    identityHandle: routeContext.identityHandle,
    productKindKey: KernelVocabulary.Router.RouteContext.key,
    ownerHandle: routeConfigContext.identityHandle,
    sourceAddressHandle: routeConfigContext.sourceAddressHandle,
    localName: routeConfigContext.friendlyPath,
    evidenceKind: EvidenceKind.ConfigurationFlow,
    evidenceRoles: [EvidenceRole.Configuration],
    evidenceSummary: 'RouteContext topology materialized from RouteConfigContext and static viewport/controller boundaries.',
  });
}

function materializedViewport(
  store: KernelStore,
  local: string,
  routeContext: RouterReference,
  draft: ViewportDraft,
): ViewportCustomElementModel {
  return new ViewportCustomElementModel(
    store.handles.product(local),
    store.handles.identity(local),
    routeContext,
    draft.controller.productHandle,
    draft.properties.name,
    draft.properties.usedBy,
    draft.properties.defaultComponent,
    draft.properties.fallback,
    draft.controller.sourceAddressHandle,
    viewportFieldProvenance(store.handles.provenance(local), draft.properties),
  );
}

function materializedViewportAgent(
  store: KernelStore,
  agentLocal: string,
  provenanceLocal: string,
  routeContext: RouterReference,
  draft: ViewportDraft,
  viewport: ViewportCustomElementModel,
): ViewportAgentModel {
  return new ViewportAgentModel(
    store.handles.product(agentLocal),
    store.handles.identity(agentLocal),
    viewport.toReference(),
    routeContext,
    draft.controller.productHandle,
    draft.controller.sourceAddressHandle,
    viewportAgentFieldProvenance(store.handles.provenance(provenanceLocal)),
  );
}

function viewportRuntimeRecords(
  store: KernelStore,
  local: string,
  agentLocal: string,
  owner: RouteConfigContextModel,
  draft: ViewportDraft,
  viewport: ViewportCustomElementModel,
  viewportAgent: ViewportAgentModel,
): readonly KernelStoreRecord[] {
  const evidenceHandle = store.handles.evidence(local);
  const provenanceHandle = store.handles.provenance(local);
  return [
    ...viewportRuntimeSourceRecords(evidenceHandle, provenanceHandle, draft),
    ...viewportProductRecords(store, local, owner, draft, viewport, provenanceHandle),
    ...viewportAgentProductRecords(store, agentLocal, draft, viewport, viewportAgent, provenanceHandle),
  ];
}

function viewportRuntimeSourceRecords(
  evidenceHandle: EvidenceHandle,
  provenanceHandle: ProvenanceHandle,
  draft: ViewportDraft,
): readonly KernelStoreRecord[] {
  return [
    new EvidenceRecord(
      evidenceHandle,
      EvidenceKind.SemanticObservation,
      [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
      'Router au-viewport and ViewportAgent topology materialized from runtime controller hydration.',
      draft.controller.sourceAddressHandle,
    ),
    new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
  ];
}

function viewportProductRecords(
  store: KernelStore,
  local: string,
  owner: RouteConfigContextModel,
  draft: ViewportDraft,
  viewport: ViewportCustomElementModel,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return routerIdentityProductRecords(store, {
    local,
    productHandle: viewport.productHandle,
    identityHandle: viewport.identityHandle,
    productKindKey: KernelVocabulary.Router.Viewport.key,
    ownerHandle: owner.identityHandle,
    sourceAddressHandle: draft.controller.sourceAddressHandle,
    localName: draft.properties.name,
    provenanceHandle,
  });
}

function viewportAgentProductRecords(
  store: KernelStore,
  local: string,
  draft: ViewportDraft,
  viewport: ViewportCustomElementModel,
  viewportAgent: ViewportAgentModel,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return routerIdentityProductRecords(store, {
    local,
    productHandle: viewportAgent.productHandle,
    identityHandle: viewportAgent.identityHandle,
    productKindKey: KernelVocabulary.Router.ViewportAgent.key,
    ownerHandle: viewport.identityHandle,
    sourceAddressHandle: draft.controller.sourceAddressHandle,
    localName: draft.properties.name,
    provenanceHandle,
  });
}

function routeConfigContextChildrenByParent(
  contexts: readonly RouteConfigContextModel[],
): ReadonlyMap<IdentityHandle, readonly RouteConfigContextModel[]> {
  const childrenByParent = new Map<IdentityHandle, RouteConfigContextModel[]>();
  for (const context of contexts) {
    const parentIdentity = context.parent?.identityHandle ?? null;
    if (parentIdentity == null) {
      continue;
    }
    const children = childrenByParent.get(parentIdentity);
    if (children == null) {
      childrenByParent.set(parentIdentity, [context]);
    } else {
      children.push(context);
    }
  }
  return childrenByParent;
}

function viewportDraftsByOwnerContext(
  store: KernelStore,
  routeConfigContexts: RouteConfigContextMaterializationProjectResult,
  templates: TemplateCompilationProjectEmission,
): ReadonlyMap<IdentityHandle, readonly ViewportDraft[]> {
  const routeContextByDefinition = routeConfigContextsByComponentDefinition(routeConfigContexts);
  const draftsByOwner = new Map<IdentityHandle, ViewportDraft[]>();
  for (const resource of templates.resources) {
    const ownerRouteConfigContext = resource.compilation.definition.target.identityHandle == null
      ? null
      : routeContextByDefinition.get(resource.compilation.definition.target.identityHandle) ?? null;
    if (ownerRouteConfigContext == null || ownerRouteConfigContext.length === 0) {
      continue;
    }
    const controllers = resource.runtimeAnalysis.runtimeRendering.controllers.filter(isViewportController);
    for (const owner of ownerRouteConfigContext) {
      controllers.forEach((controller, index) => {
        const draft: ViewportDraft = {
          ownerRouteConfigContext: owner,
          localKey: resource.compilation.localKey,
          controller,
          properties: viewportPropertiesFromController(store, controller),
          index,
        };
        const drafts = draftsByOwner.get(owner.identityHandle);
        if (drafts == null) {
          draftsByOwner.set(owner.identityHandle, [draft]);
        } else {
          drafts.push(draft);
        }
      });
    }
  }
  return draftsByOwner;
}

function parentContainerForRouteContext(
  routeConfig: RouteConfigModel,
  hostingViewport: ViewportRuntimeEmission | null,
  templates: TemplateCompilationProjectEmission,
): Container | null {
  if (hostingViewport != null) {
    return hostingViewport.draft.controller.containerFrame;
  }
  return rootControllerForRouteConfig(routeConfig, templates)?.containerFrame ?? null;
}

function routeContextContainersByIdentity(
  contexts: readonly RouteRuntimeContextEmission[],
): ReadonlyMap<IdentityHandle, Container> {
  return new Map(contexts.flatMap((context) =>
    context.container == null
      ? []
      : [[context.routeContext.identityHandle, context.container] as const]
  ));
}

function rootControllerForRouteConfig(
  routeConfig: RouteConfigModel,
  templates: TemplateCompilationProjectEmission,
): RuntimeControllerFrame | null {
  const definitionProductHandle = routeConfig.component?.resolvedProductHandle ?? null;
  if (definitionProductHandle == null) {
    return null;
  }
  for (const resource of templates.resources) {
    if (resource.compilation.definition.productHandle !== definitionProductHandle) {
      continue;
    }
    return resource.runtimeAnalysis.runtimeRendering.controllers.find((controller) =>
      controller.creationKind === RuntimeControllerCreationKind.RootCustomElement
    ) ?? null;
  }
  return null;
}

function routeContextsByRouteConfigContextIdentity(
  routeContexts: readonly RouteContextModel[],
): ReadonlyMap<IdentityHandle, readonly RouteContextModel[]> {
  const byContext = new Map<IdentityHandle, RouteContextModel[]>();
  for (const routeContext of routeContexts) {
    const routeConfigContextIdentity = routeContext.routeConfigContext?.identityHandle ?? null;
    if (routeConfigContextIdentity == null) {
      continue;
    }
    const existing = byContext.get(routeConfigContextIdentity);
    if (existing == null) {
      byContext.set(routeConfigContextIdentity, [routeContext]);
    } else {
      existing.push(routeContext);
    }
  }
  return byContext;
}

function routeContextsByRouteConfigContextAndViewportAgentIdentity(
  routeContexts: readonly RouteContextModel[],
): ReadonlyMap<string, RouteContextModel> {
  return new Map(routeContexts.flatMap((routeContext) => {
    const routeConfigContextIdentity = routeContext.routeConfigContext?.identityHandle ?? null;
    if (routeConfigContextIdentity == null) {
      return [];
    }
    return [[
      routeContextViewportAgentKey(routeConfigContextIdentity, routeContext.viewportAgent?.identityHandle ?? null),
      routeContext,
    ] as const];
  }));
}

function viewportAgentsByRouteContextIdentity(
  viewportAgents: readonly ViewportAgentModel[],
): ReadonlyMap<IdentityHandle, readonly ViewportAgentModel[]> {
  const byRouteContext = new Map<IdentityHandle, ViewportAgentModel[]>();
  for (const agent of viewportAgents) {
    const routeContextIdentity = agent.routeContext?.identityHandle ?? null;
    if (routeContextIdentity == null) {
      continue;
    }
    const existing = byRouteContext.get(routeContextIdentity);
    if (existing == null) {
      byRouteContext.set(routeContextIdentity, [agent]);
    } else {
      existing.push(agent);
    }
  }
  return byRouteContext;
}

function routeContextViewportAgentKey(
  routeConfigContextIdentity: IdentityHandle,
  viewportAgentIdentity: IdentityHandle | null,
): string {
  return `${routeConfigContextIdentity}:${viewportAgentIdentity ?? 'root'}`;
}

function selectHostingViewports(
  viewports: readonly ViewportRuntimeEmission[],
  routeConfig: RouteConfigModel,
): readonly ViewportRuntimeEmission[] {
  if (routeConfig.routeKind === RouteConfigKind.Redirect) {
    return [];
  }
  const requestedComponent = routeConfig.component?.localName ?? '';
  const request = new ViewportRequestModel(routeConfig.viewport ?? DEFAULT_VIEWPORT_NAME, requestedComponent);
  return viewports.filter((emission) => viewportHandles(emission.viewport, request));
}

function viewportHandles(
  viewport: ViewportCustomElementModel,
  request: ViewportRequestModel,
): boolean {
  if (request.viewportName !== DEFAULT_VIEWPORT_NAME && viewport.name !== request.viewportName) {
    return false;
  }
  if (viewport.usedBy.length > 0 && !viewport.usedBy.includes(request.componentName)) {
    return false;
  }
  return true;
}

function isViewportController(controller: RuntimeControllerFrame): boolean {
  return controller.creationKind === RuntimeControllerCreationKind.CustomElement
    && controller.name === 'au-viewport';
}

function viewportPropertiesFromController(
  store: KernelStore,
  controller: RuntimeControllerFrame,
): ViewportProperties {
  const instruction = controller.instructionProductHandle == null
    ? null
    : store.productDetails.read(TemplateProductDetails.Instruction, controller.instructionProductHandle);
  const staticValues = new Map<string, string>();
  if (instruction instanceof HydrateElementInstruction) {
    for (const handle of instruction.bindableInstructionProductHandles) {
      const bindableInstruction = store.productDetails.read(TemplateProductDetails.Instruction, handle);
      if (bindableInstruction instanceof SetPropertyInstruction) {
        staticValues.set(bindableInstruction.targetProperty, bindableInstruction.value);
      }
    }
  }
  return {
    name: nonEmpty(staticValues.get('name')) ?? DEFAULT_VIEWPORT_NAME,
    usedBy: splitList(staticValues.get('usedBy')),
    defaultComponent: nonEmpty(staticValues.get('default')),
    fallback: nonEmpty(staticValues.get('fallback')),
  };
}

function routeContextFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  parent: RouteRuntimeContextEmission | null,
  container: Container | null,
  hostingViewport: ViewportRuntimeEmission | null,
): readonly FieldProvenance<RouteContextField>[] {
  return fieldProvenanceEntries<RouteContextField>([
    parent == null ? null : 'parent',
    'root',
    container == null ? null : 'container',
    'routeConfigContext',
    hostingViewport == null ? null : 'viewportAgent',
    'source',
  ], provenanceHandle);
}

function viewportFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  properties: ViewportProperties,
): readonly FieldProvenance<ViewportField>[] {
  return fieldProvenanceEntries<ViewportField>([
    'routeContext',
    'controller',
    'name',
    properties.usedBy.length === 0 ? null : 'usedBy',
    properties.defaultComponent == null ? null : 'default',
    properties.fallback == null ? null : 'fallback',
    'source',
  ], provenanceHandle);
}

function viewportAgentFieldProvenance(
  provenanceHandle: ProvenanceHandle,
): readonly FieldProvenance<ViewportAgentField>[] {
  return fieldProvenanceEntries<ViewportAgentField>([
    'viewport',
    'routeContext',
    'hostController',
    'source',
  ], provenanceHandle);
}

function splitList(value: string | undefined): readonly string[] {
  return value == null
    ? []
    : value.split(',').filter((entry) => entry.length > 0);
}

function nonEmpty(value: string | undefined): string | null {
  return value == null || value.length === 0 ? null : value;
}
