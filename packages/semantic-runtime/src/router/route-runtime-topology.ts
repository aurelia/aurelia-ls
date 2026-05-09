import type { ProjectBootFrame } from '../boot/frames.js';
import { Container } from '../di/container.js';
import {
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
  IdentityHandle,
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

const DEFAULT_VIEWPORT_NAME = 'default';

class RouteRuntimeContextEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly routeConfigContext: RouteConfigContextModel,
    readonly routeContext: RouteContextModel,
    readonly container: Container | null,
  ) {}
}

class ViewportRuntimeEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly draft: ViewportDraft,
    readonly viewport: ViewportCustomElementModel,
    readonly viewportAgent: ViewportAgentModel,
  ) {}
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

class ViewportDraft {
  constructor(
    readonly ownerRouteConfigContext: RouteConfigContextModel,
    readonly localKey: string,
    readonly controller: RuntimeControllerFrame,
    readonly properties: ViewportProperties,
    readonly index: number,
  ) {}
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
    const configs = routeConfigIndex(routeConfigContexts);
    const contexts = routeConfigContexts.readRouteConfigContexts();
    const childrenByParent = routeConfigContextChildrenByParent(contexts);
    const viewportDraftsByOwner = viewportDraftsByOwnerContext(this.store, routeConfigContexts, templates);
    const rootContexts = contexts.filter((context) => context.parent == null);
    const state = new RouteRuntimeTopologyState();

    for (const root of rootContexts) {
      this.materializeRouteContextTree(
        root,
        null,
        null,
        configs,
        childrenByParent,
        viewportDraftsByOwner,
        templates,
        state,
      );
    }

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

  private materializeRouteContextTree(
    routeConfigContext: RouteConfigContextModel,
    parentRouteContext: RouteRuntimeContextEmission | null,
    hostingViewport: ViewportRuntimeEmission | null,
    configs: ReadonlyMap<IdentityHandle, RouteConfigModel>,
    childrenByParent: ReadonlyMap<IdentityHandle, readonly RouteConfigContextModel[]>,
    viewportDraftsByOwner: ReadonlyMap<IdentityHandle, readonly ViewportDraft[]>,
    templates: TemplateCompilationProjectEmission,
    state: RouteRuntimeTopologyState,
  ): void {
    const routeConfig = requiredRouteConfigForContext(routeConfigContext, configs);
    const parentContainer = parentContainerForRouteContext(routeConfig, hostingViewport, templates);
    const routeContext = this.materializeRouteContext(
      routeConfigContext,
      parentRouteContext,
      hostingViewport,
      parentContainer,
    );
    state.addRouteContext(routeContext);

    const viewports = this.materializeViewports(
      routeConfigContext,
      routeContext.routeContext.toReference(),
      viewportDraftsByOwner.get(routeConfigContext.identityHandle) ?? [],
    );
    state.addViewports(viewports);

    const children = childrenByParent.get(routeConfigContext.identityHandle) ?? [];
    for (const child of children) {
      const childRouteConfig = requiredRouteConfigForContext(child, configs);
      for (const childHostingViewport of selectHostingViewports(viewports, childRouteConfig)) {
        this.materializeRouteContextTree(
          child,
          routeContext,
          childHostingViewport,
          configs,
          childrenByParent,
          viewportDraftsByOwner,
          templates,
          state,
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
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const sourceAddressHandle = routeConfigContext.sourceAddressHandle;
    const containerEmission = parentContainer == null
      ? null
      : this.childContainerMaterializer.materializeChild(new ContainerChildMaterializationRequest(
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
    const selfReference = new RouterReference(
      productHandle,
      identityHandle,
      RouterModelKind.RouteContext,
      sourceAddressHandle,
      routeConfigContext.friendlyPath,
    );
    const rootReference = parent?.routeContext.root ?? selfReference;
    const routeContext = new RouteContextModel(
      productHandle,
      identityHandle,
      parent?.routeContext.toReference() ?? null,
      rootReference,
      containerEmission?.container.toReference() ?? null,
      null,
      routeConfigContext.toReference(),
      hostingViewport?.viewportAgent.toReference() ?? null,
      routeConfigContext.friendlyPath,
      sourceAddressHandle,
      routeContextFieldProvenance(provenanceHandle, parent, containerEmission?.container ?? null, hostingViewport),
    );
    return new RouteRuntimeContextEmission(
      [
        ...(containerEmission?.records ?? []),
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.ConfigurationFlow,
          [EvidenceRole.Configuration],
          'RouteContext topology materialized from RouteConfigContext and static viewport/controller boundaries.',
          sourceAddressHandle,
        ),
        new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
        new RouterIdentity(
          identityHandle,
          KernelVocabulary.Router.RouteContext.key,
          routeConfigContext.identityHandle,
          sourceAddressHandle,
          routeConfigContext.friendlyPath,
        ),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Router.RouteContext.key,
          identityHandle,
          sourceAddressHandle,
          provenanceHandle,
        ),
        new MaterializationRecord(
          this.store.handles.materialization(local),
          routeConfigContext.identityHandle,
          [productHandle],
          [],
          [],
        ),
      ],
      routeConfigContext,
      routeContext,
      containerEmission?.container ?? null,
    );
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
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    const viewportProductHandle = this.store.handles.product(local);
    const viewportIdentityHandle = this.store.handles.identity(local);
    const agentProductHandle = this.store.handles.product(agentLocal);
    const agentIdentityHandle = this.store.handles.identity(agentLocal);
    const sourceAddressHandle = draft.controller.sourceAddressHandle;
    const viewport = new ViewportCustomElementModel(
      viewportProductHandle,
      viewportIdentityHandle,
      routeContext,
      draft.controller.productHandle,
      draft.properties.name,
      draft.properties.usedBy,
      draft.properties.defaultComponent,
      draft.properties.fallback,
      sourceAddressHandle,
      viewportFieldProvenance(provenanceHandle, draft.properties),
    );
    const viewportAgent = new ViewportAgentModel(
      agentProductHandle,
      agentIdentityHandle,
      viewport.toReference(),
      routeContext,
      draft.controller.productHandle,
      sourceAddressHandle,
      viewportAgentFieldProvenance(provenanceHandle),
    );
    return new ViewportRuntimeEmission(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
          'Router au-viewport and ViewportAgent topology materialized from runtime controller hydration.',
          sourceAddressHandle,
        ),
        new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
        new RouterIdentity(
          viewportIdentityHandle,
          KernelVocabulary.Router.Viewport.key,
          owner.identityHandle,
          sourceAddressHandle,
          draft.properties.name,
        ),
        new MaterializedProduct(
          viewportProductHandle,
          KernelVocabulary.Router.Viewport.key,
          viewportIdentityHandle,
          sourceAddressHandle,
          provenanceHandle,
        ),
        new MaterializationRecord(
          this.store.handles.materialization(local),
          owner.identityHandle,
          [viewportProductHandle],
          [],
          [],
        ),
        new RouterIdentity(
          agentIdentityHandle,
          KernelVocabulary.Router.ViewportAgent.key,
          viewportIdentityHandle,
          sourceAddressHandle,
          draft.properties.name,
        ),
        new MaterializedProduct(
          agentProductHandle,
          KernelVocabulary.Router.ViewportAgent.key,
          agentIdentityHandle,
          sourceAddressHandle,
          provenanceHandle,
        ),
        new MaterializationRecord(
          this.store.handles.materialization(agentLocal),
          viewportIdentityHandle,
          [agentProductHandle],
          [],
          [],
        ),
      ],
      draft,
      viewport,
      viewportAgent,
    );
  }
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
        const draft = new ViewportDraft(
          owner,
          resource.compilation.localKey,
          controller,
          viewportPropertiesFromController(store, controller),
          index,
        );
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
  return compactFieldProvenance<RouteContextField>([
    parent == null ? null : new FieldProvenance('parent', provenanceHandle),
    new FieldProvenance('root', provenanceHandle),
    container == null ? null : new FieldProvenance('container', provenanceHandle),
    new FieldProvenance('routeConfigContext', provenanceHandle),
    hostingViewport == null ? null : new FieldProvenance('viewportAgent', provenanceHandle),
    new FieldProvenance('source', provenanceHandle),
  ]);
}

function viewportFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  properties: ViewportProperties,
): readonly FieldProvenance<ViewportField>[] {
  return compactFieldProvenance<ViewportField>([
    new FieldProvenance('routeContext', provenanceHandle),
    new FieldProvenance('controller', provenanceHandle),
    new FieldProvenance('name', provenanceHandle),
    properties.usedBy.length === 0 ? null : new FieldProvenance('usedBy', provenanceHandle),
    properties.defaultComponent == null ? null : new FieldProvenance('default', provenanceHandle),
    properties.fallback == null ? null : new FieldProvenance('fallback', provenanceHandle),
    new FieldProvenance('source', provenanceHandle),
  ]);
}

function viewportAgentFieldProvenance(
  provenanceHandle: ProvenanceHandle,
): readonly FieldProvenance<ViewportAgentField>[] {
  return compactFieldProvenance<ViewportAgentField>([
    new FieldProvenance('viewport', provenanceHandle),
    new FieldProvenance('routeContext', provenanceHandle),
    new FieldProvenance('hostController', provenanceHandle),
    new FieldProvenance('source', provenanceHandle),
  ]);
}

function splitList(value: string | undefined): readonly string[] {
  return value == null
    ? []
    : value.split(',').filter((entry) => entry.length > 0);
}

function nonEmpty(value: string | undefined): string | null {
  return value == null || value.length === 0 ? null : value;
}
