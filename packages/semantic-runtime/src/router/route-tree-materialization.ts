import type { ProjectBootFrame } from '../boot/frames.js';
import {
  EvidenceKind,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  IdentityHandle,
} from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  RouteNodeModel,
  RecognizedRouteModel,
  RouterModelKind,
  RouterReference,
  RouteConfigKind,
  RouteContextModel,
  RouteTreeModel,
  RouterIssueKind,
  RouterIssueModel,
  RouterIssuePhase,
  ViewportAgentModel,
  ViewportInstructionModel,
  ViewportInstructionTreeModel,
  ViewportRequestModel,
  type ConfigurableRouteModel,
  type EndpointModel,
  type RouteConfigContextModel,
  type RouteConfigModel,
  type RouteNodeModelFields,
} from './model.js';
import { RouterFrameworkErrorCode } from './framework-error-code.js';
import type { RouteConfigContextMaterializationProjectResult } from './route-context-materialization.js';
import type { RouteInstructionMaterializationProjectResult } from './route-instruction-materialization.js';
import type { RouteRecognitionMaterializationProjectResult } from './route-recognition-materialization.js';
import type { RouteRecognizerMaterializationProjectResult } from './route-recognizer-materialization.js';
import type { RouteRuntimeTopologyProjectResult } from './route-runtime-topology.js';
import type { RouterOptionsMaterializationProjectResult } from './router-options-materialization.js';
import {
  routeConfigByContextIdentity,
  routeConfigContextIndex,
  routeConfigIndex,
} from './route-topology-index.js';
import { redirectMigrationUnsupported } from './route-redirect-migration.js';
import { routerIssueProductRecords } from './router-issue-publication.js';
import { routerOpenSeamRecords, routerProductRecords } from './router-product-records.js';

const DEFAULT_VIEWPORT_NAME = 'default';
const RESIDUE = '$$residue';

const enum OpenViewportResolutionKind {
  MissingComponentName = 'missing-component-name',
  NoAvailableViewportAgent = 'no-available-viewport-agent',
  MissingRouteContextPair = 'missing-route-context-pair',
}

interface RouteTreeEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly routeTree: RouteTreeModel;
  readonly routeNodes: readonly RouteNodeModel[];
}

interface TransitionRouteNodeSeed {
  readonly recognizedRoute: RecognizedRouteModel;
  readonly endpoint: EndpointModel;
  readonly configurableRoute: ConfigurableRouteModel;
  readonly routeConfig: RouteConfigModel;
  readonly routeConfigContext: RouteConfigContextModel;
  readonly instruction: ViewportInstructionModel | null;
}

interface ResolvedTransitionRouteNodeSeed extends TransitionRouteNodeSeed {
  readonly routeContext: RouteContextModel;
  readonly viewportAgent: ViewportAgentModel | null;
  readonly viewportRequest: ViewportRequestModel | null;
}

interface TransitionRouteNodeEmission {
  readonly local: string;
  readonly node: RouteNodeModel;
}

interface TransitionRouteNodeSite {
  readonly seed: ResolvedTransitionRouteNodeSeed;
  readonly local: string;
  readonly reference: RouterReference;
}

interface OpenViewportResolution {
  readonly kind: OpenViewportResolutionKind;
  readonly parentRouteContext: RouteContextModel;
  readonly seed: TransitionRouteNodeSeed;
  readonly request: ViewportRequestModel | null;
  readonly reason: string;
}

interface ResolvedTransitionRouteNodeSeedSet {
  readonly seeds: readonly ResolvedTransitionRouteNodeSeed[];
  readonly open: OpenViewportResolution | null;
}

interface RouteNodeMaterializationFields extends Omit<RouteNodeModelFields, 'productHandle' | 'identityHandle' | 'config' | 'fieldProvenance'> {
  readonly routeConfig: RouteConfigModel;
}

/** RouteTree products materialized for initial state and closed pre-activation transition compilation. */
export class RouteTreeMaterializationProjectResult {
  constructor(
    readonly project: ProjectBootFrame,
    readonly routeTrees: readonly RouteTreeModel[],
    readonly routeNodes: readonly RouteNodeModel[],
    readonly issues: readonly RouterIssueModel[],
  ) {}

  readRouteTrees(): readonly RouteTreeModel[] {
    return this.routeTrees;
  }

  readRouteNodes(): readonly RouteNodeModel[] {
    return this.routeNodes;
  }

  readIssues(): readonly RouterIssueModel[] {
    return this.issues;
  }
}

/** Materialize initial RouteTree roots plus static transition trees that can close before activation. */
export class RouteTreeMaterializationProjectPass {
  materializeAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    routeConfigContexts: RouteConfigContextMaterializationProjectResult,
    routeRuntime: RouteRuntimeTopologyProjectResult,
    routeRecognizer: RouteRecognizerMaterializationProjectResult,
    routeInstructions: RouteInstructionMaterializationProjectResult,
    routeRecognition: RouteRecognitionMaterializationProjectResult,
    routerOptions: RouterOptionsMaterializationProjectResult | null,
  ): RouteTreeMaterializationProjectResult {
    const frame = new RouteTreeMaterializationFrame(
      store,
      routeConfigContexts,
      routeRuntime,
      routeRecognizer,
      routeInstructions,
      routeRecognition,
      routerOptions,
    );
    const emissions = frame.materialize();
    const records = frame.readRecords(emissions);
    if (records.length > 0) {
      store.commit(new KernelStoreBatch(records, `router-route-tree:${project.projectKey}`));
    }
    return new RouteTreeMaterializationProjectResult(
      project,
      emissions.map((emission) => emission.routeTree),
      emissions.flatMap((emission) => emission.routeNodes),
      frame.readIssues(),
    );
  }
}

class RouteTreeMaterializationFrame {
  private readonly routeConfigsByContext: ReadonlyMap<IdentityHandle, RouteConfigModel>;
  private readonly openRecords: KernelStoreRecord[] = [];
  private readonly issueRecords: KernelStoreRecord[] = [];
  private readonly issues: RouterIssueModel[] = [];

  constructor(
    private readonly store: KernelStore,
    private readonly routeConfigContexts: RouteConfigContextMaterializationProjectResult,
    private readonly routeRuntime: RouteRuntimeTopologyProjectResult,
    private readonly routeRecognizer: RouteRecognizerMaterializationProjectResult,
    private readonly routeInstructions: RouteInstructionMaterializationProjectResult,
    private readonly routeRecognition: RouteRecognitionMaterializationProjectResult,
    private readonly routerOptions: RouterOptionsMaterializationProjectResult | null,
  ) {
    this.routeConfigsByContext = routeConfigByContextIdentity(routeConfigContexts);
  }

  materialize(): readonly RouteTreeEmission[] {
    return [
      ...this.materializeInitialTrees(),
      ...this.materializeTransitionTrees(),
    ];
  }

  readRecords(emissions: readonly RouteTreeEmission[]): readonly KernelStoreRecord[] {
    return [
      ...emissions.flatMap((emission) => emission.records),
      ...this.openRecords,
      ...this.issueRecords,
    ];
  }

  readIssues(): readonly RouterIssueModel[] {
    return this.issues;
  }

  private materializeInitialTrees(): readonly RouteTreeEmission[] {
    return this.routeRuntime.readRouteContexts()
      .filter((routeContext) => routeContext.parent == null)
      .flatMap((routeContext, index) => {
        const routeConfigContextIdentity = routeContext.routeConfigContext?.identityHandle ?? null;
        const routeConfig = routeConfigContextIdentity == null
          ? null
          : this.routeConfigsByContext.get(routeConfigContextIdentity) ?? null;
        return routeConfig == null
          ? []
          : [this.materializeInitialTree(routeConfig, routeContext, index)];
      });
  }

  private materializeInitialTree(
    routeConfig: RouteConfigModel,
    routeContext: RouteContextModel,
    index: number,
  ): RouteTreeEmission {
    const treeLocal = `router-route-tree:${routeContext.identityHandle}:${index}`;
    const nodeLocal = `${treeLocal}:root-node`;
    const rootNode = initialRootRouteNode(this.store, nodeLocal, routeConfig, routeContext);
    const routeTree = initialRouteTree(this.store, treeLocal, routeContext, rootNode, this.routerOptions);
    return {
      records: initialRouteTreeRecords(this.store, treeLocal, nodeLocal, routeContext, rootNode, routeTree),
      routeTree,
      routeNodes: [rootNode],
    };
  }

  private materializeTransitionTrees(): readonly RouteTreeEmission[] {
    return new RouteTreeTransitionMaterializationFrame(
      this.store,
      this.routeConfigContexts,
      this.routeRuntime,
      this.routeRecognizer,
      this.routeInstructions,
      this.routeRecognition,
      this.routerOptions,
      this.openRecords,
      this.issueRecords,
      this.issues,
    ).materialize();
  }
}

class RouteTreeTransitionMaterializationFrame {
  private readonly routeConfigsByIdentity: ReadonlyMap<RouteConfigModel['identityHandle'], RouteConfigModel>;
  private readonly routeConfigContextsByIdentity: ReadonlyMap<RouteConfigContextModel['identityHandle'], RouteConfigContextModel>;
  private readonly routeConfigContextsByConfigIdentity: ReadonlyMap<RouteConfigModel['identityHandle'], RouteConfigContextModel>;
  private readonly routeContextsByIdentity: ReadonlyMap<RouteContextModel['identityHandle'], RouteContextModel>;
  private readonly endpointsByIdentity: ReadonlyMap<EndpointModel['identityHandle'], EndpointModel>;
  private readonly configurableRoutesByIdentity: ReadonlyMap<ConfigurableRouteModel['identityHandle'], ConfigurableRouteModel>;
  private readonly viewportInstructionsByIdentity: ReadonlyMap<ViewportInstructionModel['identityHandle'], ViewportInstructionModel>;
  private readonly viewportInstructionTreesByIdentity: ReadonlyMap<ViewportInstructionTreeModel['identityHandle'], ViewportInstructionTreeModel>;
  private readonly redirectIssueRouteConfigIdentities: ReadonlySet<RouteConfigModel['identityHandle']>;

  constructor(
    private readonly store: KernelStore,
    private readonly routeConfigContexts: RouteConfigContextMaterializationProjectResult,
    private readonly routeRuntime: RouteRuntimeTopologyProjectResult,
    private readonly routeRecognizer: RouteRecognizerMaterializationProjectResult,
    private readonly routeInstructions: RouteInstructionMaterializationProjectResult,
    private readonly routeRecognition: RouteRecognitionMaterializationProjectResult,
    private readonly routerOptions: RouterOptionsMaterializationProjectResult | null,
    private readonly openRecords: KernelStoreRecord[],
    private readonly issueRecords: KernelStoreRecord[],
    private readonly issues: RouterIssueModel[],
  ) {
    this.routeConfigsByIdentity = routeConfigIndex(routeConfigContexts);
    this.routeConfigContextsByIdentity = routeConfigContextIndex(routeConfigContexts);
    this.routeConfigContextsByConfigIdentity = new Map(
      routeConfigContexts.readRouteConfigContexts().flatMap((context) => {
        const configIdentity = context.config.identityHandle;
        return configIdentity == null ? [] : [[configIdentity, context] as const];
      }),
    );
    this.routeContextsByIdentity = new Map(
      routeRuntime.readRouteContexts().map((routeContext) => [routeContext.identityHandle, routeContext] as const),
    );
    this.endpointsByIdentity = new Map(
      routeRecognizer.readEndpoints().map((endpoint) => [endpoint.identityHandle, endpoint] as const),
    );
    this.configurableRoutesByIdentity = new Map(
      routeRecognizer.readConfigurableRoutes().map((route) => [route.identityHandle, route] as const),
    );
    this.viewportInstructionsByIdentity = new Map(
      routeInstructions.readViewportInstructions().map((instruction) => [instruction.identityHandle, instruction] as const),
    );
    this.viewportInstructionTreesByIdentity = new Map(
      routeInstructions.readViewportInstructionTrees().map((tree) => [tree.identityHandle, tree] as const),
    );
    this.redirectIssueRouteConfigIdentities = new Set(
      routeRecognition.readIssues().flatMap((issue) => {
        const identityHandle = issue.routeConfig?.identityHandle ?? null;
        return issue.issueKind === RouterIssueKind.InstructionUnknownRedirect && identityHandle != null
          ? [identityHandle]
          : [];
      }),
    );
  }

  materialize(): readonly RouteTreeEmission[] {
    return recognizedRoutesByInstructionTree(this.routeRecognition).flatMap((routes, index) =>
      this.materializeRecognizedRouteGroup(routes, index)
    );
  }

  private materializeRecognizedRouteGroup(
    routes: readonly RecognizedRouteModel[],
    index: number,
  ): readonly RouteTreeEmission[] {
    const instructionTree = this.instructionTreeForRecognizedRouteGroup(routes);
    const updateRouteContext = this.updateRouteContextForInstructionTree(instructionTree);
    const updateRouteConfig = this.updateRouteConfigForRouteContext(updateRouteContext);
    const seeds = routes.flatMap((recognizedRoute) => {
      const seed = this.transitionRouteNodeSeed(recognizedRoute, routes);
      return seed == null ? [] : [seed];
    });
    const resolvedSeeds = resolveTransitionRouteNodeSeeds(this.routeRuntime, updateRouteContext, seeds);
    if (resolvedSeeds.open != null) {
      recordViewportResolutionFailure(this.store, resolvedSeeds.open, this.issues, this.openRecords);
    }
    if (resolvedSeeds.seeds.length === 0) {
      return [];
    }
    return [
      this.materializeTransitionTree(
        instructionTree,
        updateRouteContext,
        updateRouteConfig,
        resolvedSeeds.seeds,
        index,
      ),
    ];
  }

  private instructionTreeForRecognizedRouteGroup(
    routes: readonly RecognizedRouteModel[],
  ): ViewportInstructionTreeModel {
    const first = routes[0];
    if (first == null) {
      throw new Error('RouteTree transition materialization received an empty RecognizedRoute group.');
    }
    return requiredByIdentity(
      this.viewportInstructionTreesByIdentity,
      first.viewportInstructionTree.identityHandle,
      `RecognizedRoute '${first.identityHandle}' references an unmaterialized ViewportInstructionTree.`,
    );
  }

  private updateRouteContextForInstructionTree(
    instructionTree: ViewportInstructionTreeModel,
  ): RouteContextModel {
    return requiredByIdentity(
      this.routeContextsByIdentity,
      instructionTree.routeContext?.identityHandle ?? null,
      `ViewportInstructionTree '${instructionTree.identityHandle}' references an unmaterialized update RouteContext.`,
    );
  }

  private updateRouteConfigForRouteContext(
    updateRouteContext: RouteContextModel,
  ): RouteConfigModel {
    const context = requiredByIdentity(
      this.routeConfigContextsByIdentity,
      updateRouteContext.routeConfigContext?.identityHandle ?? null,
      `RouteContext '${updateRouteContext.identityHandle}' references an unmaterialized RouteConfigContext.`,
    );
    return requiredByIdentity(
      this.routeConfigsByIdentity,
      context.config.identityHandle,
      `RouteConfigContext '${context.identityHandle}' references an unmaterialized RouteConfig.`,
    );
  }

  private materializeTransitionTree(
    instructionTree: ViewportInstructionTreeModel,
    updateRouteContext: RouteContextModel,
    updateRouteConfig: RouteConfigModel,
    seeds: readonly ResolvedTransitionRouteNodeSeed[],
    index: number,
  ): RouteTreeEmission {
    const treeLocal = `router-route-tree-transition:${instructionTree.identityHandle}:${index}`;
    const rootLocal = `${treeLocal}:update-root`;
    const rootReference = transitionRootRouteNodeReference(this.store, rootLocal, instructionTree, updateRouteContext);
    const childSites = transitionRouteNodeSites(this.store, treeLocal, seeds);
    const childNodes = transitionRouteNodeEmissions(this.store, instructionTree, rootReference, childSites);
    const rootNode = transitionRootRouteNode(
      this.store,
      rootLocal,
      instructionTree,
      updateRouteContext,
      updateRouteConfig,
      childNodes,
    );
    const routeTree = transitionRouteTree(
      this.store,
      treeLocal,
      instructionTree,
      rootNode,
      childNodes,
      this.routerOptions,
    );

    return {
      records: transitionRouteTreeRecords(this.store, treeLocal, rootLocal, updateRouteContext, instructionTree, rootNode, childNodes),
      routeTree,
      routeNodes: [rootNode, ...childNodes.map((emission) => emission.node)],
    };
  }

  private transitionRouteNodeSeed(
    recognizedRoute: RecognizedRouteModel,
    routeGroup: readonly RecognizedRouteModel[],
  ): TransitionRouteNodeSeed | null {
    const endpoint = requiredByIdentity(
      this.endpointsByIdentity,
      recognizedRoute.endpoint.identityHandle,
      `RecognizedRoute '${recognizedRoute.identityHandle}' references an unmaterialized Endpoint.`,
    );
    const configurableRoute = requiredByIdentity(
      this.configurableRoutesByIdentity,
      endpoint.configurableRoute.identityHandle,
      `Endpoint '${endpoint.identityHandle}' references an unmaterialized ConfigurableRoute.`,
    );
    const routeConfig = requiredByIdentity(
      this.routeConfigsByIdentity,
      configurableRoute.routeConfig.identityHandle,
      `ConfigurableRoute '${configurableRoute.identityHandle}' references an unmaterialized RouteConfig.`,
    );
    const routeConfigContext = this.routeConfigContextsByConfigIdentity.get(routeConfig.identityHandle) ?? null;
    if (routeConfigContext == null) {
      if (routeConfig.routeKind === RouteConfigKind.Redirect) {
        const hasMigrationIssue = recordRedirectMigrationIssue(
          this.store,
          recognizedRoute,
          configurableRoute,
          routeConfig,
          this.issues,
          this.issueRecords,
        );
        if (
          !hasMigrationIssue
          && !this.redirectIssueRouteConfigIdentities.has(routeConfig.identityHandle)
          && !hasRecognizedRedirectTarget(routeConfig, routeGroup)
        ) {
          recordRedirectTargetOpenSeam(this.store, recognizedRoute, routeConfig, this.openRecords);
        }
        return null;
      }
      throw new Error(`RouteConfig '${routeConfig.identityHandle}' has no materialized RouteConfigContext.`);
    }
    const instructionIdentity = recognizedRoute.viewportInstruction.identityHandle;
    const instruction = instructionIdentity == null
      ? null
      : this.viewportInstructionsByIdentity.get(instructionIdentity) ?? null;
    return {
      recognizedRoute,
      endpoint,
      configurableRoute,
      routeConfig,
      routeConfigContext,
      instruction,
    };
  }
}

function initialRootRouteNode(
  store: KernelStore,
  nodeLocal: string,
  routeConfig: RouteConfigModel,
  routeContext: RouteContextModel,
): RouteNodeModel {
  return materializedRouteNode(store, nodeLocal, {
    routeContext: routeContext.toReference(),
    routeConfig,
    parent: null,
    children: [],
    instruction: null,
    originalInstruction: null,
    recognizedRoute: null,
    parameterCount: 0,
    queryParamCount: 0,
    fragment: null,
    hasData: routeConfig.hasData,
    viewport: null,
    residueInstructionCount: 0,
    path: '',
    finalPath: '',
    component: routeConfig.component,
    title: routeConfig.title,
    sourceAddressHandle: routeContext.sourceAddressHandle,
  });
}

function initialRouteTree(
  store: KernelStore,
  treeLocal: string,
  routeContext: RouteContextModel,
  rootNode: RouteNodeModel,
  routerOptions: RouterOptionsMaterializationProjectResult | null,
): RouteTreeModel {
  const effectiveRouterOptions = routerOptions?.readEffectiveRouterOptions() ?? null;
  return new RouteTreeModel(
    store.handles.product(treeLocal),
    store.handles.identity(treeLocal),
    rootNode.toReference(),
    null,
    effectiveRouterOptions?.toReference() ?? null,
    1,
    0,
    null,
    routeContext.sourceAddressHandle,
  );
}

function initialRouteTreeRecords(
  store: KernelStore,
  treeLocal: string,
  nodeLocal: string,
  routeContext: RouteContextModel,
  rootNode: RouteNodeModel,
  routeTree: RouteTreeModel,
): readonly KernelStoreRecord[] {
  return [
    ...initialRootRouteNodeRecords(store, nodeLocal, routeContext, rootNode),
    ...initialRouteTreeProductRecords(store, treeLocal, routeContext, routeTree),
  ];
}

function initialRootRouteNodeRecords(
  store: KernelStore,
  local: string,
  routeContext: RouteContextModel,
  rootNode: RouteNodeModel,
): readonly KernelStoreRecord[] {
  return routerProductRecords(store, {
    local,
    evidenceHandle: store.handles.evidence(local),
    provenanceHandle: store.handles.provenance(local),
    productHandle: rootNode.productHandle,
    identityHandle: rootNode.identityHandle,
    productKindKey: KernelVocabulary.Router.RouteNode.key,
    ownerHandle: routeContext.identityHandle,
    sourceAddressHandle: rootNode.sourceAddressHandle,
    localName: routeContext.localName,
    evidenceKind: EvidenceKind.ConfigurationFlow,
    evidenceRoles: [EvidenceRole.Configuration],
    evidenceSummary: 'Initial RouteNode materialized from Router.routeTree lazy root creation before navigation.',
  });
}

function initialRouteTreeProductRecords(
  store: KernelStore,
  local: string,
  routeContext: RouteContextModel,
  routeTree: RouteTreeModel,
): readonly KernelStoreRecord[] {
  return routerProductRecords(store, {
    local,
    evidenceHandle: store.handles.evidence(local),
    provenanceHandle: store.handles.provenance(local),
    productHandle: routeTree.productHandle,
    identityHandle: routeTree.identityHandle,
    productKindKey: KernelVocabulary.Router.RouteTree.key,
    ownerHandle: routeContext.identityHandle,
    sourceAddressHandle: routeTree.sourceAddressHandle,
    localName: routeContext.localName,
    evidenceKind: EvidenceKind.ConfigurationFlow,
    evidenceRoles: [EvidenceRole.Configuration],
    evidenceSummary: 'Initial RouteTree materialized from Router.routeTree lazy root creation before navigation.',
  });
}

function materializedRouteNode(
  store: KernelStore,
  local: string,
  fields: RouteNodeMaterializationFields,
): RouteNodeModel {
  const routeConfig = fields.routeConfig;
  return new RouteNodeModel({
    productHandle: store.handles.product(local),
    identityHandle: store.handles.identity(local),
    routeContext: fields.routeContext,
    config: routeConfig.toReference(),
    parent: fields.parent,
    children: fields.children,
    instruction: fields.instruction,
    originalInstruction: fields.originalInstruction,
    recognizedRoute: fields.recognizedRoute,
    parameterCount: fields.parameterCount,
    queryParamCount: fields.queryParamCount,
    fragment: fields.fragment,
    hasData: fields.hasData,
    viewport: fields.viewport,
    residueInstructionCount: fields.residueInstructionCount,
    path: fields.path,
    finalPath: fields.finalPath,
    component: fields.component,
    title: fields.title,
    sourceAddressHandle: fields.sourceAddressHandle,
  });
}

function transitionRootRouteNodeReference(
  store: KernelStore,
  rootLocal: string,
  instructionTree: ViewportInstructionTreeModel,
  routeContext: RouteContextModel,
): RouterReference {
  return new RouterReference(
    store.handles.product(rootLocal),
    store.handles.identity(rootLocal),
    RouterModelKind.RouteNode,
    instructionTree.sourceAddressHandle,
    routeContext.localName,
  );
}

function transitionRouteNodeSites(
  store: KernelStore,
  treeLocal: string,
  seeds: readonly ResolvedTransitionRouteNodeSeed[],
): readonly TransitionRouteNodeSite[] {
  return seeds.map((seed, seedIndex) => {
    const local = `${treeLocal}:node:${seedIndex}:${seed.recognizedRoute.identityHandle}`;
    return {
      seed,
      local,
      reference: new RouterReference(
        store.handles.product(local),
        store.handles.identity(local),
        RouterModelKind.RouteNode,
        seed.recognizedRoute.sourceAddressHandle,
        seed.routeContext.localName,
      ),
    };
  });
}

function transitionRouteNodeEmissions(
  store: KernelStore,
  instructionTree: ViewportInstructionTreeModel,
  rootReference: RouterReference,
  sites: readonly TransitionRouteNodeSite[],
): readonly TransitionRouteNodeEmission[] {
  return sites.map((site, seedIndex) => {
    const node = transitionRouteNode(
      store,
      site.local,
      instructionTree,
      site.seed,
      seedIndex === 0 ? rootReference : sites[seedIndex - 1]!.reference,
      seedIndex === sites.length - 1 ? null : sites[seedIndex + 1]!.reference,
    );
    return { local: site.local, node };
  });
}

function transitionRootRouteNode(
  store: KernelStore,
  rootLocal: string,
  instructionTree: ViewportInstructionTreeModel,
  routeContext: RouteContextModel,
  routeConfig: RouteConfigModel,
  childNodes: readonly TransitionRouteNodeEmission[],
): RouteNodeModel {
  const childReferences = childNodes.length === 0
    ? []
    : [childNodes[0]!.node.toReference()];
  return materializedRouteNode(store, rootLocal, {
    routeContext: routeContext.toReference(),
    routeConfig,
    parent: null,
    children: childReferences,
    instruction: null,
    originalInstruction: null,
    recognizedRoute: null,
    parameterCount: 0,
    queryParamCount: instructionTree.queryParamCount,
    fragment: instructionTree.fragment,
    hasData: routeConfig.hasData,
    viewport: null,
    residueInstructionCount: 0,
    path: '',
    finalPath: '',
    component: routeConfig.component,
    title: routeConfig.title,
    sourceAddressHandle: instructionTree.sourceAddressHandle,
  });
}

function transitionRouteTree(
  store: KernelStore,
  treeLocal: string,
  instructionTree: ViewportInstructionTreeModel,
  rootNode: RouteNodeModel,
  childNodes: readonly TransitionRouteNodeEmission[],
  routerOptions: RouterOptionsMaterializationProjectResult | null,
): RouteTreeModel {
  return new RouteTreeModel(
    store.handles.product(treeLocal),
    store.handles.identity(treeLocal),
    rootNode.toReference(),
    instructionTree.toReference(),
    routerOptions?.readEffectiveRouterOptions()?.toReference() ?? null,
    childNodes.length + 1,
    instructionTree.queryParamCount,
    instructionTree.fragment,
    instructionTree.sourceAddressHandle,
  );
}

function transitionRouteTreeRecords(
  store: KernelStore,
  treeLocal: string,
  rootLocal: string,
  routeContext: RouteContextModel,
  instructionTree: ViewportInstructionTreeModel,
  rootNode: RouteNodeModel,
  childNodes: readonly TransitionRouteNodeEmission[],
): readonly KernelStoreRecord[] {
  return [
    ...transitionRootRouteNodeRecords(store, rootLocal, routeContext, rootNode),
    ...transitionChildRouteNodeRecords(store, childNodes),
    ...transitionRouteTreeProductRecords(store, treeLocal, routeContext, instructionTree),
  ];
}

function transitionRootRouteNodeRecords(
  store: KernelStore,
  local: string,
  routeContext: RouteContextModel,
  rootNode: RouteNodeModel,
): readonly KernelStoreRecord[] {
  return routerProductRecords(store, {
    local,
    evidenceHandle: store.handles.evidence(local),
    provenanceHandle: store.handles.provenance(local),
    productHandle: rootNode.productHandle,
    identityHandle: rootNode.identityHandle,
    productKindKey: KernelVocabulary.Router.RouteNode.key,
    ownerHandle: routeContext.identityHandle,
    sourceAddressHandle: rootNode.sourceAddressHandle,
    localName: routeContext.localName,
    evidenceKind: EvidenceKind.SemanticObservation,
    evidenceRoles: [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
    evidenceSummary: 'RouteTree update root materialized for a ViewportInstructionTree navigation context before viewport activation.',
  });
}

function transitionChildRouteNodeRecords(
  store: KernelStore,
  childNodes: readonly TransitionRouteNodeEmission[],
): readonly KernelStoreRecord[] {
  return childNodes.flatMap((emission) =>
    transitionRouteNodeRecords(store, emission.local, emission.node)
  );
}

function transitionRouteTreeProductRecords(
  store: KernelStore,
  local: string,
  routeContext: RouteContextModel,
  instructionTree: ViewportInstructionTreeModel,
): readonly KernelStoreRecord[] {
  return routerProductRecords(store, {
    local,
    evidenceHandle: store.handles.evidence(local),
    provenanceHandle: store.handles.provenance(local),
    productHandle: store.handles.product(local),
    identityHandle: store.handles.identity(local),
    productKindKey: KernelVocabulary.Router.RouteTree.key,
    ownerHandle: routeContext.identityHandle,
    sourceAddressHandle: instructionTree.sourceAddressHandle,
    localName: instructionTree.toReference().localName,
    evidenceKind: EvidenceKind.SemanticObservation,
    evidenceRoles: [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
    evidenceSummary: 'RouteTree transition materialized from a closed ViewportInstructionTree and its RecognizedRoute chain.',
  });
}

function transitionRouteNode(
  store: KernelStore,
  local: string,
  instructionTree: ViewportInstructionTreeModel,
  seed: ResolvedTransitionRouteNodeSeed,
  parent: RouterReference | null,
  child: RouterReference | null,
): RouteNodeModel {
  const path = configuredPathForEndpoint(seed.endpoint, seed.configurableRoute);
  const viewport = seed.instruction?.viewport ?? seed.routeConfig.viewport ?? DEFAULT_VIEWPORT_NAME;
  const residueInstructionCount = seed.recognizedRoute.residue == null ? 0 : 1;
  return materializedRouteNode(store, local, {
    routeContext: seed.routeContext.toReference(),
    routeConfig: seed.routeConfig,
    parent,
    children: child == null ? [] : [child],
    instruction: seed.recognizedRoute.viewportInstruction,
    originalInstruction: seed.recognizedRoute.viewportInstruction,
    recognizedRoute: seed.recognizedRoute.toReference(),
    parameterCount: seed.recognizedRoute.parameterCount,
    queryParamCount: instructionTree.queryParamCount,
    fragment: instructionTree.fragment,
    hasData: seed.routeConfig.hasData,
    viewport,
    residueInstructionCount,
    path,
    finalPath: path,
    component: seed.routeConfig.component,
    title: seed.routeConfig.title,
    sourceAddressHandle: seed.recognizedRoute.sourceAddressHandle,
  });
}

function transitionRouteNodeRecords(
  store: KernelStore,
  local: string,
  node: RouteNodeModel,
): readonly KernelStoreRecord[] {
  const evidenceHandle = store.handles.evidence(local);
  const provenanceHandle = store.handles.provenance(local);
  const ownerHandle = requiredRouterReferenceIdentity(
    node.routeContext,
    `RouteNode '${node.identityHandle}' is missing its RouteContext identity owner.`,
  );
  return routerProductRecords(store, {
    local,
    evidenceHandle,
    provenanceHandle,
    productHandle: node.productHandle,
    identityHandle: node.identityHandle,
    productKindKey: KernelVocabulary.Router.RouteNode.key,
    ownerHandle,
    sourceAddressHandle: node.sourceAddressHandle,
    localName: node.routeContext.localName,
    evidenceKind: EvidenceKind.SemanticObservation,
    evidenceRoles: [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
    evidenceSummary: 'RouteTree.createAndAppendNodes materialized a RouteNode from a recognized viewport instruction path.',
  });
}

function resolveTransitionRouteNodeSeeds(
  routeRuntime: RouteRuntimeTopologyProjectResult,
  updateRouteContext: RouteContextModel,
  seeds: readonly TransitionRouteNodeSeed[],
): ResolvedTransitionRouteNodeSeedSet {
  const resolved: ResolvedTransitionRouteNodeSeed[] = [];
  let parentRouteContext: RouteContextModel = updateRouteContext;
  for (const seed of seeds) {
    const componentName = seed.routeConfig.component?.localName ?? null;
    if (componentName == null) {
      return {
        seeds: [],
        open: {
          kind: OpenViewportResolutionKind.MissingComponentName,
          parentRouteContext,
          seed,
          request: null,
          reason: 'resolved route config does not expose a component name for ViewportRequest construction',
        },
      };
    }
    const viewportRequest = new ViewportRequestModel(
      seed.instruction?.viewport ?? seed.routeConfig.viewport ?? DEFAULT_VIEWPORT_NAME,
      componentName,
    );
    const viewportAgent = routeRuntime.resolveViewportAgent(parentRouteContext.identityHandle, viewportRequest);
    if (viewportAgent == null) {
      return {
        seeds: [],
        open: {
          kind: OpenViewportResolutionKind.NoAvailableViewportAgent,
          parentRouteContext,
          seed,
          request: viewportRequest,
          reason: 'parent RouteContext has no matching available ViewportAgent',
        },
      };
    }
    const routeContext = routeRuntime.routeContextForRouteConfigContextAndViewportAgent(
      seed.routeConfigContext.identityHandle,
      viewportAgent.identityHandle,
    );
    if (routeContext == null) {
      return {
        seeds: [],
        open: {
          kind: OpenViewportResolutionKind.MissingRouteContextPair,
          parentRouteContext,
          seed,
          request: viewportRequest,
          reason: 'Router._getRouteContext pair is not materialized for the resolved ViewportAgent and RouteConfigContext',
        },
      };
    }
    resolved.push({
      ...seed,
      routeContext,
      viewportAgent,
      viewportRequest,
    });
    parentRouteContext = routeContext;
  }
  return {
    seeds: resolved,
    open: null,
  };
}

function recordViewportResolutionFailure(
  store: KernelStore,
  open: OpenViewportResolution,
  issues: RouterIssueModel[],
  records: KernelStoreRecord[],
): void {
  const requestLabel = viewportResolutionRequestLabel(open);
  if (open.kind === OpenViewportResolutionKind.NoAvailableViewportAgent && open.request != null) {
    recordNoAvailableViewportAgentIssue(store, open, requestLabel, issues, records);
    return;
  }
  recordViewportResolutionOpenSeam(store, open, requestLabel, records);
}

function recordViewportResolutionOpenSeam(
  store: KernelStore,
  open: OpenViewportResolution,
  requestLabel: string,
  records: KernelStoreRecord[],
): void {
  const summary = `RouteTree.createConfiguredNode could not resolve ${requestLabel}: ${open.reason}.`;
  const local = `router-route-tree-open:viewport-request:${open.seed.recognizedRoute.identityHandle}:${localKeyPart(open.reason)}`;
  const emission = routerOpenSeamRecords(store, {
    local,
    seamKindKey: KernelVocabulary.Router.OpenInstruction.key,
    ownerHandle: open.parentRouteContext.identityHandle,
    summary,
    sourceAddressHandle: open.seed.recognizedRoute.sourceAddressHandle,
    reasonKinds: [OpenSeamReasonKind.RouterViewportResolutionOpen],
    evidenceKind: EvidenceKind.SemanticObservation,
    evidenceRoles: [EvidenceRole.TransformInput],
  });
  records.push(...emission.records);
}

function viewportResolutionRequestLabel(open: OpenViewportResolution): string {
  return open.request == null
    ? 'unavailable ViewportRequest'
    : `ViewportRequest(viewport:'${open.request.viewportName}',component:'${open.request.componentName}')`;
}

function recordNoAvailableViewportAgentIssue(
  store: KernelStore,
  open: OpenViewportResolution,
  requestLabel: string,
  issues: RouterIssueModel[],
  records: KernelStoreRecord[],
): void {
  const sourceAddressHandle = open.seed.instruction?.sourceAddressHandle
    ?? open.seed.recognizedRoute.sourceAddressHandle
    ?? open.seed.routeConfig.pathSourceAddressHandle
    ?? open.seed.routeConfig.sourceAddressHandle;
  const local = `router-route-tree-issue:no-available-viewport-agent:${open.seed.recognizedRoute.identityHandle}:${localKeyPart(requestLabel)}`;
  const message = `Failed to resolve ${requestLabel} from RouteContext '${open.parentRouteContext.localName ?? open.parentRouteContext.identityHandle}'.`;
  const issue = new RouterIssueModel(
    store.handles.product(local),
    store.handles.identity(local),
    RouterIssuePhase.RouteTreeViewportResolution,
    RouterIssueKind.NoAvailableViewportAgent,
    message,
    'error',
    RouterFrameworkErrorCode.NoAvailableViewportAgent,
    open.seed.routeConfig.toReference(),
    open.seed.recognizedRoute.toReference(),
    'viewport',
    'matching available ViewportAgent',
    requestLabel,
    open.request?.componentName ?? null,
    open.seed.routeConfig.paths[0] ?? null,
    open.seed.routeConfig.redirectTo,
    null,
    sourceAddressHandle,
  );
  issues.push(issue);
  records.push(...routerIssueProductRecords(store, {
    local,
    issue,
    ownerHandle: open.parentRouteContext.identityHandle,
    sourceAddressHandle,
    localName: open.request?.viewportName ?? open.seed.routeConfig.id ?? open.seed.routeConfig.paths[0] ?? 'viewport',
    evidenceSummary: message,
  }));
}

function recordRedirectMigrationIssue(
  store: KernelStore,
  recognizedRoute: RecognizedRouteModel,
  configurableRoute: ConfigurableRouteModel,
  routeConfig: RouteConfigModel,
  issues: RouterIssueModel[],
  records: KernelStoreRecord[],
): boolean {
  if (routeConfig.redirectTo == null) {
    return false;
  }

  let unsupported: ReturnType<typeof redirectMigrationUnsupported> | null = null;
  try {
    unsupported = redirectMigrationUnsupported(configurableRoute.path, routeConfig.redirectTo);
  } catch {
    return false;
  }
  if (unsupported == null) {
    return false;
  }

  const sourceAddressHandle = unsupported.source === 'redirectTo'
    ? routeConfig.redirectToSourceAddressHandle ?? routeConfig.sourceAddressHandle
    : routeConfig.pathSourceAddressHandle ?? routeConfig.sourceAddressHandle;
  const local = [
    'router-route-tree-issue',
    'redirect-migration',
    recognizedRoute.identityHandle,
    routeConfig.identityHandle,
    localKeyPart(unsupported.source),
    localKeyPart(unsupported.unexpectedKind),
  ].join(':');
  const message = `Unexpected expression kind ${unsupported.unexpectedKind} while migrating redirect route parameters from '${configurableRoute.path}' to '${routeConfig.redirectTo}'.`;
  const issue = new RouterIssueModel(
    store.handles.product(local),
    store.handles.identity(local),
    RouterIssuePhase.RouteTreeRedirectMigration,
    RouterIssueKind.RedirectUnexpectedExpressionKind,
    message,
    'error',
    RouterFrameworkErrorCode.UnexpectedRouteExpressionKind,
    routeConfig.toReference(),
    recognizedRoute.toReference(),
    null,
    null,
    null,
    null,
    configurableRoute.path,
    routeConfig.redirectTo,
    unsupported.unexpectedKind,
    sourceAddressHandle,
  );
  issues.push(issue);
  records.push(...routerIssueProductRecords(store, {
    local,
    issue,
    ownerHandle: routeConfig.identityHandle,
    sourceAddressHandle,
    localName: routeConfig.id ?? configurableRoute.path,
    evidenceSummary: message,
  }));
  return true;
}

function hasRecognizedRedirectTarget(
  routeConfig: RouteConfigModel,
  routeGroup: readonly RecognizedRouteModel[],
): boolean {
  return routeGroup.some((route) =>
    route.redirectSourceRouteConfig?.identityHandle === routeConfig.identityHandle
  );
}

function recordRedirectTargetOpenSeam(
  store: KernelStore,
  recognizedRoute: RecognizedRouteModel,
  routeConfig: RouteConfigModel,
  records: KernelStoreRecord[],
): void {
  const local = `router-route-tree-open:redirect:${recognizedRoute.identityHandle}:${routeConfig.identityHandle}`;
  const summary = 'RouteTree.createConfiguredNode encountered a redirect RouteConfig; redirect target route-tree materialization is not modeled yet.';
  const emission = routerOpenSeamRecords(store, {
    local,
    seamKindKey: KernelVocabulary.Router.OpenInstruction.key,
    ownerHandle: routeConfig.identityHandle,
    summary,
    sourceAddressHandle: recognizedRoute.sourceAddressHandle ?? routeConfig.sourceAddressHandle,
    reasonKinds: [OpenSeamReasonKind.RouterRedirectTargetOpen],
    evidenceKind: EvidenceKind.SemanticObservation,
    evidenceRoles: [EvidenceRole.TransformInput],
  });
  records.push(...emission.records);
}

function recognizedRoutesByInstructionTree(
  routeRecognition: RouteRecognitionMaterializationProjectResult,
): readonly (readonly RecognizedRouteModel[])[] {
  const groups = new Map<string, RecognizedRouteModel[]>();
  for (const recognizedRoute of routeRecognition.readRecognizedRoutes()) {
    const treeIdentity = recognizedRoute.viewportInstructionTree.identityHandle;
    if (treeIdentity == null) {
      continue;
    }
    const existing = groups.get(treeIdentity);
    if (existing == null) {
      groups.set(treeIdentity, [recognizedRoute]);
    } else {
      existing.push(recognizedRoute);
    }
  }
  return [...groups.values()];
}

function configuredPathForEndpoint(
  endpoint: EndpointModel,
  configurableRoute: ConfigurableRouteModel,
): string {
  return endpoint.isResidual
    ? `${configurableRoute.path}/*${RESIDUE}`
    : configurableRoute.path;
}

function requiredByIdentity<TKey extends string, TValue>(
  values: ReadonlyMap<TKey, TValue>,
  identityHandle: TKey | null,
  message: string,
): TValue {
  if (identityHandle == null) {
    throw new Error(message);
  }
  const value = values.get(identityHandle);
  if (value == null) {
    throw new Error(message);
  }
  return value;
}

function requiredRouterReferenceIdentity(
  reference: RouterReference,
  message: string,
): NonNullable<RouterReference['identityHandle']> {
  if (reference.identityHandle == null) {
    throw new Error(message);
  }
  return reference.identityHandle;
}
