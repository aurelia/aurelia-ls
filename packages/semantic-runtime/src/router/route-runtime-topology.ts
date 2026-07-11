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
import type { OpenSeam } from '../kernel/open-seam.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import type {
  EvidenceHandle,
  IdentityHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  FieldProvenance,
  ProvenanceRecord,
  readFieldProvenance,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  HydrateElementInstruction,
  InterpolationInstruction,
  PropertyBindingInstruction,
  SetPropertyInstruction,
} from '../template/instruction-ir.js';
import { TemplateProductDetails } from '../template/product-details.js';
import type { TemplateCompilationProjectEmission } from '../template/template-compilation-project-pass.js';
import {
  RuntimeControllerCreationKind,
  type RuntimeControllerFrame,
} from '../template/runtime-controller.js';
import {
  BuiltInTemplateControllerChildViewCardinality,
  frameworkTemplateControllerSemanticsForName,
} from '../template/template-controller-semantics.js';
import { RuntimeBindingSourceValueEvaluator } from '../observation/binding-source-value-evaluator.js';
import { RuntimeBindingSourceValueEvaluationKind } from '../observation/binding-source-value-evaluation.js';
import { EvaluationValueKind } from '../evaluation/values.js';
import {
  RouteConfigContextModel,
  RouteConfigKind,
  RouteContextModel,
  RouterRealizationStageKind,
  RouterModelKind,
  RouterReference,
  ViewportAgentCandidateResolutionKind,
  ViewportAgentModel,
  ViewportCustomElementModel,
  ViewportFieldState,
  ViewportFieldStateKind,
  ViewportRequestModel,
  resolvedRouteableComponentName,
  type RouteConfigModel,
  type ViewportField,
  type ViewportValueField,
} from './model.js';
import type { RouteConfigContextMaterializationProjectResult } from './route-context-materialization.js';
import {
  requiredRouteConfigForContext,
  routeConfigContextsByComponentDefinition,
  routeConfigIndex,
} from './route-topology-index.js';
import {
  routerIdentityProductRecords,
  routerOpenSeamRecords,
  routerProductRecords,
  type RouterOpenSeamRecordEmission,
} from './router-product-records.js';

const DEFAULT_VIEWPORT_NAME = 'default';

interface RouteRuntimeContextEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly routeConfigContext: RouteConfigContextModel;
  readonly routeContext: RouteContextModel;
  readonly container: Container | null;
}

interface ViewportRuntimeEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly openSeams: readonly OpenSeam[];
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

  readOpenSeams(): readonly OpenSeam[] {
    return this.viewports.flatMap((emission) => emission.openSeams);
  }
}

interface ViewportProperties {
  readonly name: string | null;
  readonly usedBy: readonly string[] | null;
  readonly defaultComponent: string | null;
  readonly fallback: string | null;
  readonly fieldStates: readonly ViewportFieldState[];
  readonly fieldProvenance: readonly FieldProvenance<ViewportField>[];
}

interface ViewportDraft {
  readonly ownerRouteConfigContext: RouteConfigContextModel;
  readonly localKey: string;
  readonly controller: RuntimeControllerFrame;
  readonly properties: ViewportProperties;
  readonly presenceCardinality: BuiltInTemplateControllerChildViewCardinality;
  readonly index: number;
}

const enum ViewportAgentCandidateMatchKind {
  Match = 'match',
  Mismatch = 'mismatch',
  Open = 'open',
}

export class ViewportAgentCandidateResolution {
  constructor(
    readonly resolutionKind: ViewportAgentCandidateResolutionKind,
    readonly candidate: ViewportAgentModel | null,
    readonly definiteCandidates: readonly ViewportAgentModel[],
    readonly openCandidates: readonly ViewportAgentModel[],
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
    readonly openSeams: readonly OpenSeam[],
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

  routeContextForRouteConfigContextAndViewportAgentCandidate(
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

  resolveViewportAgentCandidates(
    routeContextIdentity: IdentityHandle | null,
    request: ViewportRequestModel,
  ): ViewportAgentCandidateResolution {
    if (routeContextIdentity == null) {
      return new ViewportAgentCandidateResolution(ViewportAgentCandidateResolutionKind.None, null, [], []);
    }
    const agents = this.viewportAgentsByRouteContextIdentity.get(routeContextIdentity) ?? [];
    const definiteCandidates: ViewportAgentModel[] = [];
    const openCandidates: ViewportAgentModel[] = [];
    for (const agent of agents) {
      const viewportIdentity = agent.viewport.identityHandle;
      const viewport = viewportIdentity == null
        ? null
        : this.viewportsByIdentity.get(viewportIdentity) ?? null;
      if (viewport == null) {
        continue;
      }
      const match = viewportAgentCandidateMatch(viewport, request);
      if (match === ViewportAgentCandidateMatchKind.Match) {
        definiteCandidates.push(agent);
      } else if (match === ViewportAgentCandidateMatchKind.Open) {
        openCandidates.push(agent);
      }
    }
    if (openCandidates.length > 0) {
      return new ViewportAgentCandidateResolution(
        ViewportAgentCandidateResolutionKind.Open,
        null,
        definiteCandidates,
        openCandidates,
      );
    }
    if (definiteCandidates.length === 1) {
      return new ViewportAgentCandidateResolution(
        ViewportAgentCandidateResolutionKind.Sole,
        definiteCandidates[0]!,
        definiteCandidates,
        [],
      );
    }
    return new ViewportAgentCandidateResolution(
      definiteCandidates.length === 0
        ? ViewportAgentCandidateResolutionKind.None
        : ViewportAgentCandidateResolutionKind.Multiple,
      null,
      definiteCandidates,
      [],
    );
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
    sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
  ): RouteRuntimeTopologyProjectResult {
    const state = new RouteRuntimeTopologyFrame(
      this.store,
      this.childContainerMaterializer,
      routeConfigContexts,
      templates,
      sourceValueEvaluator,
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
      state.readOpenSeams(),
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
    sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
  ) {
    const contexts = routeConfigContexts.readRouteConfigContexts();
    this.configs = routeConfigIndex(routeConfigContexts);
    this.childrenByParent = routeConfigContextChildrenByParent(contexts);
    this.viewportDraftsByOwner = viewportDraftsByOwnerContext(
      store,
      routeConfigContexts,
      templates,
      sourceValueEvaluator,
    );
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
    const viewportAgent = materializedViewportAgent(this.store, agentLocal, routeContext, draft, viewport);
    const topologyOpenSeams = viewportTopologyOpenSeams(this.store, local, routeContext, draft);
    return {
      records: [
        ...viewportRuntimeRecords(this.store, local, agentLocal, owner, draft, viewport, viewportAgent),
        ...topologyOpenSeams.flatMap((emission) => emission.records),
      ],
      openSeams: topologyOpenSeams.map((emission) => emission.openSeam),
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
    RouterRealizationStageKind.Potential,
    parent?.routeContext.toReference() ?? null,
    parent?.routeContext.root ?? selfReference,
    container?.toReference() ?? null,
    null,
    routeConfigContext.toReference(),
    hostingViewport?.viewportAgent.toReference() ?? null,
    routeConfigContext.friendlyPath,
    routeConfigContext.sourceAddressHandle,
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
    RouterRealizationStageKind.Potential,
    draft.presenceCardinality,
    routeContext,
    draft.controller.productHandle,
    draft.properties.name,
    draft.properties.usedBy,
    draft.properties.defaultComponent,
    draft.properties.fallback,
    draft.properties.fieldStates,
    draft.controller.sourceAddressHandle,
    draft.properties.fieldProvenance,
  );
}

function materializedViewportAgent(
  store: KernelStore,
  agentLocal: string,
  routeContext: RouterReference,
  draft: ViewportDraft,
  viewport: ViewportCustomElementModel,
): ViewportAgentModel {
  return new ViewportAgentModel(
    store.handles.product(agentLocal),
    store.handles.identity(agentLocal),
    RouterRealizationStageKind.Potential,
    draft.presenceCardinality,
    viewport.toReference(),
    routeContext,
    viewport.name,
    draft.controller.productHandle,
    draft.controller.sourceAddressHandle,
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

function viewportTopologyOpenSeams(
  store: KernelStore,
  local: string,
  routeContext: RouterReference,
  draft: ViewportDraft,
): readonly RouterOpenSeamRecordEmission[] {
  const ownerHandle = routeContext.identityHandle;
  if (ownerHandle == null) {
    throw new Error(`Potential viewport '${local}' is missing its RouteContext identity owner.`);
  }
  const valueSeams = draft.properties.fieldStates.flatMap((state) => {
    if (
      state.stateKind !== ViewportFieldStateKind.Referential
      && state.stateKind !== ViewportFieldStateKind.Open
    ) {
      return [];
    }
    const summary = state.openReason
      ?? `au-viewport ${state.field} requires a runtime value before static topology can close.`;
    return [routerOpenSeamRecords(store, {
      local: `${local}:open-field:${state.field}`,
      seamKindKey: KernelVocabulary.Router.OpenTopology.key,
      ownerHandle,
      summary,
      sourceAddressHandle: state.sourceAddressHandle ?? draft.controller.sourceAddressHandle,
      reasonKinds: [OpenSeamReasonKind.RouterViewportValueOpen, ...state.openReasonKinds],
      evidenceKind: EvidenceKind.SemanticObservation,
      evidenceRoles: [EvidenceRole.TransformInput],
    })];
  });
  if (draft.presenceCardinality === BuiltInTemplateControllerChildViewCardinality.Single) {
    return valueSeams;
  }
  return [
    ...valueSeams,
    routerOpenSeamRecords(store, {
      local: `${local}:open-presence:${draft.presenceCardinality}`,
      seamKindKey: KernelVocabulary.Router.OpenTopology.key,
      ownerHandle,
      summary: `au-viewport presence is '${draft.presenceCardinality}' under its template-controller ancestry; live availability cannot be selected statically.`,
      sourceAddressHandle: draft.controller.sourceAddressHandle,
      reasonKinds: [OpenSeamReasonKind.RouterViewportPresenceOpen],
      evidenceKind: EvidenceKind.SemanticObservation,
      evidenceRoles: [EvidenceRole.TransformInput],
    }),
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
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
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
          properties: viewportPropertiesFromController(store, controller, sourceValueEvaluator),
          presenceCardinality: viewportPresenceCardinality(controller),
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
      routeContextViewportAgentKey(
        routeConfigContextIdentity,
        routeContext.hostingViewportAgentCandidate?.identityHandle ?? null,
      ),
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
  const requestedComponent = resolvedRouteableComponentName(routeConfig.component) ?? '';
  const request = new ViewportRequestModel(routeConfig.viewport ?? DEFAULT_VIEWPORT_NAME, requestedComponent);
  return viewports.filter((emission) =>
    viewportAgentCandidateMatch(emission.viewport, request) !== ViewportAgentCandidateMatchKind.Mismatch
  );
}

function viewportAgentCandidateMatch(
  viewport: ViewportCustomElementModel,
  request: ViewportRequestModel,
): ViewportAgentCandidateMatchKind {
  let open = false;
  const nameState = viewportFieldState(viewport, 'name');
  if (request.viewportName !== DEFAULT_VIEWPORT_NAME) {
    if (viewportFieldIsOpen(nameState) || viewport.name == null) {
      open = true;
    } else if (viewport.name !== request.viewportName) {
      return ViewportAgentCandidateMatchKind.Mismatch;
    }
  }
  const usedByState = viewportFieldState(viewport, 'usedBy');
  if (viewportFieldIsOpen(usedByState) || viewport.usedBy == null) {
    open = true;
  } else if (viewport.usedBy.length > 0 && !viewport.usedBy.includes(request.componentName)) {
    return ViewportAgentCandidateMatchKind.Mismatch;
  }
  if (viewport.presenceCardinality !== BuiltInTemplateControllerChildViewCardinality.Single) {
    open = true;
  }
  return open ? ViewportAgentCandidateMatchKind.Open : ViewportAgentCandidateMatchKind.Match;
}

function viewportFieldState(
  viewport: ViewportCustomElementModel,
  field: ViewportValueField,
): ViewportFieldState {
  const state = viewport.fieldStates.find((candidate) => candidate.field === field) ?? null;
  if (state == null) {
    throw new Error(`Potential au-viewport '${viewport.identityHandle}' is missing ${field} field state.`);
  }
  return state;
}

function viewportFieldIsOpen(state: ViewportFieldState): boolean {
  return state.stateKind === ViewportFieldStateKind.Referential
    || state.stateKind === ViewportFieldStateKind.Open;
}

function isViewportController(controller: RuntimeControllerFrame): boolean {
  return controller.creationKind === RuntimeControllerCreationKind.CustomElement
    && controller.name === 'au-viewport';
}

function viewportPropertiesFromController(
  store: KernelStore,
  controller: RuntimeControllerFrame,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
): ViewportProperties {
  const instruction = controller.instructionProductHandle == null
    ? null
    : store.productDetails.read(TemplateProductDetails.Instruction, controller.instructionProductHandle);
  const bindableInstructions = new Map<string, SetPropertyInstruction | PropertyBindingInstruction | InterpolationInstruction>();
  if (instruction instanceof HydrateElementInstruction) {
    for (const handle of instruction.bindableInstructionProductHandles) {
      const bindableInstruction = store.productDetails.read(TemplateProductDetails.Instruction, handle);
      if (
        bindableInstruction instanceof SetPropertyInstruction
        || bindableInstruction instanceof PropertyBindingInstruction
        || bindableInstruction instanceof InterpolationInstruction
      ) {
        const target = viewportBindableInstructionTarget(bindableInstruction);
        if (target != null && !bindableInstructions.has(target)) {
          bindableInstructions.set(target, bindableInstruction);
        }
      }
    }
  }
  const fields = [
    viewportStringField(controller, 'name', DEFAULT_VIEWPORT_NAME, bindableInstructions.get('name') ?? null, sourceValueEvaluator),
    viewportStringField(controller, 'usedBy', '', bindableInstructions.get('usedBy') ?? null, sourceValueEvaluator),
    viewportStringField(controller, 'default', '', bindableInstructions.get('default') ?? null, sourceValueEvaluator),
    viewportStringField(controller, 'fallback', '', bindableInstructions.get('fallback') ?? null, sourceValueEvaluator),
  ] as const;
  const [name, usedBy, defaultComponent, fallback] = fields;
  return {
    name: name.value,
    usedBy: usedBy.value == null ? null : splitList(usedBy.value),
    defaultComponent: nonEmpty(defaultComponent.value),
    fallback: nonEmpty(fallback.value),
    fieldStates: fields.map((field) => field.state),
    fieldProvenance: fields.flatMap((field) =>
      field.provenanceHandle == null
        ? []
        : [new FieldProvenance<ViewportField>(field.state.field, field.provenanceHandle)]
    ),
  };
}

interface ViewportStringField {
  readonly value: string | null;
  readonly state: ViewportFieldState;
  readonly provenanceHandle: ProvenanceHandle | null;
}

function viewportStringField(
  controller: RuntimeControllerFrame,
  field: ViewportValueField,
  defaultValue: string,
  instruction: SetPropertyInstruction | PropertyBindingInstruction | InterpolationInstruction | null,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
): ViewportStringField {
  const bound = sourceValueEvaluator.boundControllerValues.readExactControllerProperty(
    controller.productHandle,
    field,
  );
  if (bound != null) {
    const evaluated = sourceValueEvaluator.evaluateBoundControllerPropertyValue(bound);
    if (
      evaluated.kind === RuntimeBindingSourceValueEvaluationKind.Value
      && evaluated.value?.kind === EvaluationValueKind.String
    ) {
      return {
        value: evaluated.value.value,
        state: new ViewportFieldState(field, ViewportFieldStateKind.Closed, bound.sourceAddressHandle),
        provenanceHandle: bound.sourceProvenanceHandle,
      };
    }
    if (evaluated.kind === RuntimeBindingSourceValueEvaluationKind.Value && evaluated.value != null) {
      return {
        value: null,
        state: new ViewportFieldState(
          field,
          ViewportFieldStateKind.Referential,
          bound.sourceAddressHandle,
          `au-viewport ${field} binding closed to '${evaluated.value.kind}', not a concrete string.`,
        ),
        provenanceHandle: bound.sourceProvenanceHandle,
      };
    }
    return {
      value: null,
      state: new ViewportFieldState(
        field,
        ViewportFieldStateKind.Open,
        bound.sourceAddressHandle,
        evaluated.openReason,
        evaluated.openReasonKinds,
      ),
      provenanceHandle: bound.sourceProvenanceHandle,
    };
  }
  if (instruction instanceof SetPropertyInstruction) {
    return {
      value: instruction.value,
      state: new ViewportFieldState(field, ViewportFieldStateKind.Closed, instruction.sourceAddressHandle),
      provenanceHandle: readFieldProvenance(instruction.fieldProvenance, 'value')
        ?? readFieldProvenance(instruction.fieldProvenance, 'source'),
    };
  }
  if (instruction != null) {
    return {
      value: null,
      state: new ViewportFieldState(
        field,
        ViewportFieldStateKind.Open,
        instruction.sourceAddressHandle,
        `au-viewport ${field} has an authored binding without a retained bound-controller source value.`,
        [OpenSeamReasonKind.BindingSourceNeedsRuntimeValue],
      ),
      provenanceHandle: readFieldProvenance(instruction.fieldProvenance, 'expression')
        ?? readFieldProvenance(instruction.fieldProvenance, 'source'),
    };
  }
  return {
    value: defaultValue,
    state: new ViewportFieldState(field, ViewportFieldStateKind.Defaulted, null),
    provenanceHandle: null,
  };
}

function viewportBindableInstructionTarget(
  instruction: SetPropertyInstruction | PropertyBindingInstruction | InterpolationInstruction,
): string | null {
  if (instruction instanceof SetPropertyInstruction || instruction instanceof PropertyBindingInstruction) {
    return instruction.targetProperty;
  }
  return instruction instanceof InterpolationInstruction ? instruction.target : null;
}

function viewportPresenceCardinality(
  controller: RuntimeControllerFrame,
): BuiltInTemplateControllerChildViewCardinality {
  let cardinality = BuiltInTemplateControllerChildViewCardinality.Single;
  let current = controller.parent;
  while (current != null) {
    if (current.creationKind === RuntimeControllerCreationKind.TemplateController) {
      const semantics = current.name == null ? null : frameworkTemplateControllerSemanticsForName(current.name);
      if (semantics == null) {
        return BuiltInTemplateControllerChildViewCardinality.Open;
      }
      if (semantics.childViewCardinality === BuiltInTemplateControllerChildViewCardinality.Open) {
        return BuiltInTemplateControllerChildViewCardinality.Open;
      }
      if (semantics.childViewCardinality === BuiltInTemplateControllerChildViewCardinality.Many) {
        cardinality = BuiltInTemplateControllerChildViewCardinality.Many;
      } else if (
        semantics.childViewCardinality === BuiltInTemplateControllerChildViewCardinality.Optional
        && cardinality === BuiltInTemplateControllerChildViewCardinality.Single
      ) {
        cardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
      }
    }
    current = current.parent;
  }
  return cardinality;
}

function splitList(value: string): readonly string[] {
  return value.length === 0 ? [] : value.split(',').filter((entry) => entry.length > 0);
}

function nonEmpty(value: string | null): string | null {
  return value == null || value.length === 0 ? null : value;
}
