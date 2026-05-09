import type { ProjectBootFrame } from '../boot/frames.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type { ProvenanceHandle } from '../kernel/handles.js';
import { RouterIdentity } from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import { OpenSeam } from '../kernel/open-seam.js';
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
  RouteNodeModel,
  RecognizedRouteModel,
  RouterModelKind,
  RouterReference,
  RouteConfigKind,
  RouteContextModel,
  RouteTreeModel,
  ViewportAgentModel,
  ViewportInstructionModel,
  ViewportInstructionTreeModel,
  ViewportRequestModel,
  type ConfigurableRouteModel,
  type EndpointModel,
  type RouteConfigContextModel,
  type RouteConfigModel,
  type RouteNodeField,
  type RouteTreeField,
} from './model.js';
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

const DEFAULT_VIEWPORT_NAME = 'default';
const RESIDUE = '$$residue';

class RouteTreeEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly routeTree: RouteTreeModel,
    readonly routeNodes: readonly RouteNodeModel[],
  ) {}
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

interface OpenViewportResolution {
  readonly parentRouteContext: RouteContextModel;
  readonly seed: TransitionRouteNodeSeed;
  readonly request: ViewportRequestModel | null;
  readonly reason: string;
}

class ResolvedTransitionRouteNodeSeedSet {
  constructor(
    readonly seeds: readonly ResolvedTransitionRouteNodeSeed[],
    readonly open: OpenViewportResolution | null,
  ) {}
}

/** RouteTree products materialized for initial state and closed pre-activation transition compilation. */
export class RouteTreeMaterializationProjectResult {
  constructor(
    readonly project: ProjectBootFrame,
    readonly routeTrees: readonly RouteTreeModel[],
    readonly routeNodes: readonly RouteNodeModel[],
  ) {}

  readRouteTrees(): readonly RouteTreeModel[] {
    return this.routeTrees;
  }

  readRouteNodes(): readonly RouteNodeModel[] {
    return this.routeNodes;
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
    const routeConfigsByContext = routeConfigByContextIdentity(routeConfigContexts);
    const openRecords: KernelStoreRecord[] = [];
    const initialEmissions = routeRuntime.readRouteContexts()
      .filter((routeContext) => routeContext.parent == null)
      .flatMap((routeContext, index) => {
        const routeConfigContextIdentity = routeContext.routeConfigContext?.identityHandle ?? null;
        const routeConfig = routeConfigContextIdentity == null
          ? null
          : routeConfigsByContext.get(routeConfigContextIdentity) ?? null;
        return routeConfig == null
          ? []
          : [this.materializeInitialTree(store, routeConfig, routeContext, routerOptions, index)];
      });
    const transitionEmissions = this.materializeTransitionTrees(
      store,
      routeConfigContexts,
      routeRuntime,
      routeRecognizer,
      routeInstructions,
      routeRecognition,
      routerOptions,
      openRecords,
    );
    const emissions = [
      ...initialEmissions,
      ...transitionEmissions,
    ];
    const records = [
      ...emissions.flatMap((emission) => emission.records),
      ...openRecords,
    ];
    if (records.length > 0) {
      store.commit(new KernelStoreBatch(records, `router-route-tree:${project.projectKey}`));
    }
    return new RouteTreeMaterializationProjectResult(
      project,
      emissions.map((emission) => emission.routeTree),
      emissions.flatMap((emission) => emission.routeNodes),
    );
  }

  private materializeInitialTree(
    store: KernelStore,
    routeConfig: RouteConfigModel,
    routeContext: RouteContextModel,
    routerOptions: RouterOptionsMaterializationProjectResult | null,
    index: number,
  ): RouteTreeEmission {
    const treeLocal = `router-route-tree:${routeContext.identityHandle}:${index}`;
    const nodeLocal = `${treeLocal}:root-node`;
    const treeEvidenceHandle = store.handles.evidence(treeLocal);
    const treeProvenanceHandle = store.handles.provenance(treeLocal);
    const treeProductHandle = store.handles.product(treeLocal);
    const treeIdentityHandle = store.handles.identity(treeLocal);
    const nodeEvidenceHandle = store.handles.evidence(nodeLocal);
    const nodeProvenanceHandle = store.handles.provenance(nodeLocal);
    const nodeProductHandle = store.handles.product(nodeLocal);
    const nodeIdentityHandle = store.handles.identity(nodeLocal);
    const sourceAddressHandle = routeContext.sourceAddressHandle;
    const rootNode = new RouteNodeModel(
      nodeProductHandle,
      nodeIdentityHandle,
      routeContext.toReference(),
      routeConfig.toReference(),
      null,
      [],
      null,
      null,
      null,
      0,
      0,
      null,
      routeConfig.hasData,
      null,
      0,
      '',
      '',
      routeConfig.component,
      routeConfig.title,
      sourceAddressHandle,
      routeNodeFieldProvenance(nodeProvenanceHandle, routeConfig),
    );
    const routeTree = new RouteTreeModel(
      treeProductHandle,
      treeIdentityHandle,
      rootNode.toReference(),
      null,
      routerOptions?.readEffectiveRouterOptions()?.toReference() ?? null,
      1,
      0,
      null,
      sourceAddressHandle,
      routeTreeFieldProvenance(treeProvenanceHandle, false, routerOptions != null),
    );
    return new RouteTreeEmission(
      [
        new EvidenceRecord(
          nodeEvidenceHandle,
          EvidenceKind.ConfigurationFlow,
          [EvidenceRole.Configuration],
          'Initial RouteNode materialized from Router.routeTree lazy root creation before navigation.',
          sourceAddressHandle,
        ),
        new ProvenanceRecord(nodeProvenanceHandle, [nodeEvidenceHandle]),
        new RouterIdentity(
          nodeIdentityHandle,
          KernelVocabulary.Router.RouteNode.key,
          routeContext.identityHandle,
          sourceAddressHandle,
          routeContext.localName,
        ),
        new MaterializedProduct(
          nodeProductHandle,
          KernelVocabulary.Router.RouteNode.key,
          nodeIdentityHandle,
          sourceAddressHandle,
          nodeProvenanceHandle,
        ),
        new MaterializationRecord(
          store.handles.materialization(nodeLocal),
          routeContext.identityHandle,
          [nodeProductHandle],
          [],
          [],
        ),
        new EvidenceRecord(
          treeEvidenceHandle,
          EvidenceKind.ConfigurationFlow,
          [EvidenceRole.Configuration],
          'Initial RouteTree materialized from Router.routeTree lazy root creation before navigation.',
          sourceAddressHandle,
        ),
        new ProvenanceRecord(treeProvenanceHandle, [treeEvidenceHandle]),
        new RouterIdentity(
          treeIdentityHandle,
          KernelVocabulary.Router.RouteTree.key,
          routeContext.identityHandle,
          sourceAddressHandle,
          routeContext.localName,
        ),
        new MaterializedProduct(
          treeProductHandle,
          KernelVocabulary.Router.RouteTree.key,
          treeIdentityHandle,
          sourceAddressHandle,
          treeProvenanceHandle,
        ),
        new MaterializationRecord(
          store.handles.materialization(treeLocal),
          routeContext.identityHandle,
          [treeProductHandle],
          [],
          [],
        ),
      ],
      routeTree,
      [rootNode],
    );
  }

  private materializeTransitionTrees(
    store: KernelStore,
    routeConfigContexts: RouteConfigContextMaterializationProjectResult,
    routeRuntime: RouteRuntimeTopologyProjectResult,
    routeRecognizer: RouteRecognizerMaterializationProjectResult,
    routeInstructions: RouteInstructionMaterializationProjectResult,
    routeRecognition: RouteRecognitionMaterializationProjectResult,
    routerOptions: RouterOptionsMaterializationProjectResult | null,
    openRecords: KernelStoreRecord[],
  ): readonly RouteTreeEmission[] {
    const routeConfigsByIdentity = routeConfigIndex(routeConfigContexts);
    const routeConfigContextsByIdentity = routeConfigContextIndex(routeConfigContexts);
    const routeConfigContextsByConfigIdentity = new Map(
      routeConfigContexts.readRouteConfigContexts().flatMap((context) => {
        const configIdentity = context.config.identityHandle;
        return configIdentity == null ? [] : [[configIdentity, context] as const];
      }),
    );
    const routeContextsByIdentity = new Map(
      routeRuntime.readRouteContexts().map((routeContext) => [routeContext.identityHandle, routeContext] as const),
    );
    const endpointsByIdentity = new Map(
      routeRecognizer.readEndpoints().map((endpoint) => [endpoint.identityHandle, endpoint] as const),
    );
    const configurableRoutesByIdentity = new Map(
      routeRecognizer.readConfigurableRoutes().map((route) => [route.identityHandle, route] as const),
    );
    const viewportInstructionsByIdentity = new Map(
      routeInstructions.readViewportInstructions().map((instruction) => [instruction.identityHandle, instruction] as const),
    );
    const viewportInstructionTreesByIdentity = new Map(
      routeInstructions.readViewportInstructionTrees().map((tree) => [tree.identityHandle, tree] as const),
    );

    return recognizedRoutesByInstructionTree(routeRecognition).flatMap((routes, index) => {
      const treeIdentity = routes[0]?.viewportInstructionTree.identityHandle ?? null;
      const tree = treeIdentity == null
        ? null
        : viewportInstructionTreesByIdentity.get(treeIdentity) ?? null;
      const routeContextIdentity = tree?.routeContext?.identityHandle ?? null;
      const updateRouteContext = routeContextIdentity == null
        ? null
        : routeContextsByIdentity.get(routeContextIdentity) ?? null;
      if (tree == null || updateRouteContext == null) {
        return [];
      }
      const updateRouteConfigContextIdentity = updateRouteContext.routeConfigContext?.identityHandle ?? null;
      const updateRouteConfigContext = updateRouteConfigContextIdentity == null
        ? null
        : routeConfigContextsByIdentity.get(updateRouteConfigContextIdentity) ?? null;
      const updateRouteConfig = updateRouteConfigContext?.config.identityHandle == null
        ? null
        : routeConfigsByIdentity.get(updateRouteConfigContext.config.identityHandle) ?? null;
      if (updateRouteConfig == null) {
        return [];
      }

      const seeds = routes.flatMap((recognizedRoute) => {
        const seed = transitionRouteNodeSeed(
          recognizedRoute,
          endpointsByIdentity,
          configurableRoutesByIdentity,
          routeConfigsByIdentity,
          routeConfigContextsByConfigIdentity,
          viewportInstructionsByIdentity,
        );
        return seed == null ? [] : [seed];
      });
      const resolvedSeeds = resolveTransitionRouteNodeSeeds(routeRuntime, updateRouteContext, seeds);
      if (resolvedSeeds.open != null) {
        recordViewportResolutionOpenSeam(store, resolvedSeeds.open, openRecords);
      }
      if (resolvedSeeds.seeds.length === 0) {
        return [];
      }
      return [
        this.materializeTransitionTree(
          store,
          tree,
          updateRouteContext,
          updateRouteConfig,
          resolvedSeeds.seeds,
          routerOptions,
          index,
        ),
      ];
    });
  }

  private materializeTransitionTree(
    store: KernelStore,
    instructionTree: ViewportInstructionTreeModel,
    updateRouteContext: RouteContextModel,
    updateRouteConfig: RouteConfigModel,
    seeds: readonly ResolvedTransitionRouteNodeSeed[],
    routerOptions: RouterOptionsMaterializationProjectResult | null,
    index: number,
  ): RouteTreeEmission {
    const treeLocal = `router-route-tree-transition:${instructionTree.identityHandle}:${index}`;
    const rootLocal = `${treeLocal}:update-root`;
    const treeEvidenceHandle = store.handles.evidence(treeLocal);
    const treeProvenanceHandle = store.handles.provenance(treeLocal);
    const treeProductHandle = store.handles.product(treeLocal);
    const treeIdentityHandle = store.handles.identity(treeLocal);
    const rootProductHandle = store.handles.product(rootLocal);
    const rootIdentityHandle = store.handles.identity(rootLocal);
    const rootReference = new RouterReference(
      rootProductHandle,
      rootIdentityHandle,
      RouterModelKind.RouteNode,
      instructionTree.sourceAddressHandle,
      updateRouteContext.localName,
    );
    const nodeLocals = seeds.map((seed, seedIndex) =>
      `${treeLocal}:node:${seedIndex}:${seed.recognizedRoute.identityHandle}`
    );
    const nodeReferences = seeds.map((seed, seedIndex) =>
      new RouterReference(
        store.handles.product(nodeLocals[seedIndex]!),
        store.handles.identity(nodeLocals[seedIndex]!),
        RouterModelKind.RouteNode,
        seed.recognizedRoute.sourceAddressHandle,
        seed.routeContext.localName,
      )
    );
    const childNodes: TransitionRouteNodeEmission[] = seeds.map((seed, seedIndex) => {
      const local = nodeLocals[seedIndex]!;
      const node = transitionRouteNode(
        store,
        local,
        instructionTree,
        seed,
        seedIndex === 0 ? rootReference : nodeReferences[seedIndex - 1]!,
        seedIndex === seeds.length - 1 ? null : nodeReferences[seedIndex + 1]!,
      );
      return { local, node };
    });
    const childReferences = childNodes.length === 0
      ? []
      : [childNodes[0]!.node.toReference()];

    const rootEvidenceHandle = store.handles.evidence(rootLocal);
    const rootProvenanceHandle = store.handles.provenance(rootLocal);
    const rootNode = new RouteNodeModel(
      rootProductHandle,
      rootIdentityHandle,
      updateRouteContext.toReference(),
      updateRouteConfig.toReference(),
      null,
      childReferences,
      null,
      null,
      null,
      0,
      instructionTree.queryParamCount,
      instructionTree.fragment,
      updateRouteConfig.hasData,
      null,
      0,
      '',
      '',
      updateRouteConfig.component,
      updateRouteConfig.title,
      instructionTree.sourceAddressHandle,
      routeNodeFieldProvenance(rootProvenanceHandle, updateRouteConfig, {
        hasChildren: childReferences.length > 0,
        hasInstruction: false,
        hasOriginalInstruction: false,
        hasRecognizedRoute: false,
        parameterCount: 0,
        queryParamCount: instructionTree.queryParamCount,
        fragment: instructionTree.fragment,
        hasData: updateRouteConfig.hasData,
        viewport: null,
        residueInstructionCount: 0,
        hasParent: false,
      }),
    );
    const routeTree = new RouteTreeModel(
      treeProductHandle,
      treeIdentityHandle,
      rootNode.toReference(),
      instructionTree.toReference(),
      routerOptions?.readEffectiveRouterOptions()?.toReference() ?? null,
      childNodes.length + 1,
      instructionTree.queryParamCount,
      instructionTree.fragment,
      instructionTree.sourceAddressHandle,
      routeTreeFieldProvenance(treeProvenanceHandle, true, routerOptions != null),
    );

    return new RouteTreeEmission(
      [
        new EvidenceRecord(
          rootEvidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
          'RouteTree update root materialized for a ViewportInstructionTree navigation context before viewport activation.',
          instructionTree.sourceAddressHandle,
        ),
        new ProvenanceRecord(rootProvenanceHandle, [rootEvidenceHandle]),
        new RouterIdentity(
          rootNode.identityHandle,
          KernelVocabulary.Router.RouteNode.key,
          updateRouteContext.identityHandle,
          rootNode.sourceAddressHandle,
          updateRouteContext.localName,
        ),
        new MaterializedProduct(
          rootNode.productHandle,
          KernelVocabulary.Router.RouteNode.key,
          rootNode.identityHandle,
          rootNode.sourceAddressHandle,
          rootProvenanceHandle,
        ),
        new MaterializationRecord(
          store.handles.materialization(rootLocal),
          updateRouteContext.identityHandle,
          [rootNode.productHandle],
          [],
          [],
        ),
        ...childNodes.flatMap((emission) =>
          transitionRouteNodeRecords(store, emission.local, emission.node)
        ),
        new EvidenceRecord(
          treeEvidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
          'RouteTree transition materialized from a closed ViewportInstructionTree and its RecognizedRoute chain.',
          instructionTree.sourceAddressHandle,
        ),
        new ProvenanceRecord(treeProvenanceHandle, [treeEvidenceHandle]),
        new RouterIdentity(
          treeIdentityHandle,
          KernelVocabulary.Router.RouteTree.key,
          updateRouteContext.identityHandle,
          instructionTree.sourceAddressHandle,
          instructionTree.toReference().localName,
        ),
        new MaterializedProduct(
          treeProductHandle,
          KernelVocabulary.Router.RouteTree.key,
          treeIdentityHandle,
          instructionTree.sourceAddressHandle,
          treeProvenanceHandle,
        ),
        new MaterializationRecord(
          store.handles.materialization(treeLocal),
          updateRouteContext.identityHandle,
          [treeProductHandle],
          [],
          [],
        ),
      ],
      routeTree,
      [rootNode, ...childNodes.map((emission) => emission.node)],
    );
  }
}

function routeNodeFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  routeConfig: RouteConfigModel,
  facts: {
    readonly hasChildren: boolean;
    readonly hasInstruction: boolean;
    readonly hasOriginalInstruction: boolean;
    readonly hasRecognizedRoute: boolean;
    readonly parameterCount: number;
    readonly queryParamCount: number;
    readonly fragment: string | null;
    readonly hasData: boolean | null;
    readonly viewport: string | null;
    readonly residueInstructionCount: number;
    readonly hasParent: boolean;
  } = {
    hasChildren: false,
    hasInstruction: false,
    hasOriginalInstruction: false,
    hasRecognizedRoute: false,
    parameterCount: 0,
    queryParamCount: 0,
    fragment: null,
    hasData: null,
    viewport: null,
    residueInstructionCount: 0,
    hasParent: false,
  },
): readonly FieldProvenance<RouteNodeField>[] {
  return compactFieldProvenance<RouteNodeField>([
    new FieldProvenance('routeContext', provenanceHandle),
    new FieldProvenance('config', provenanceHandle),
    facts.hasParent ? new FieldProvenance('parent', provenanceHandle) : null,
    facts.hasChildren ? new FieldProvenance('children', provenanceHandle) : null,
    facts.hasInstruction ? new FieldProvenance('instruction', provenanceHandle) : null,
    facts.hasOriginalInstruction ? new FieldProvenance('originalInstruction', provenanceHandle) : null,
    facts.hasRecognizedRoute ? new FieldProvenance('recognizedRoute', provenanceHandle) : null,
    facts.parameterCount === 0 ? null : new FieldProvenance('params', provenanceHandle),
    facts.queryParamCount === 0 ? null : new FieldProvenance('queryParams', provenanceHandle),
    facts.fragment == null ? null : new FieldProvenance('fragment', provenanceHandle),
    facts.hasData == null ? null : new FieldProvenance('data', provenanceHandle),
    facts.viewport == null ? null : new FieldProvenance('viewport', provenanceHandle),
    facts.residueInstructionCount === 0 ? null : new FieldProvenance('residue', provenanceHandle),
    new FieldProvenance('path', provenanceHandle),
    new FieldProvenance('finalPath', provenanceHandle),
    routeConfig.component == null ? null : new FieldProvenance('component', provenanceHandle),
    routeConfig.title == null ? null : new FieldProvenance('title', provenanceHandle),
    new FieldProvenance('source', provenanceHandle),
  ]);
}

function routeTreeFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  hasInstructionTree: boolean,
  hasOptions: boolean,
): readonly FieldProvenance<RouteTreeField>[] {
  return compactFieldProvenance<RouteTreeField>([
    new FieldProvenance('rootNode', provenanceHandle),
    hasInstructionTree ? new FieldProvenance('instructionTree', provenanceHandle) : null,
    hasOptions ? new FieldProvenance('options', provenanceHandle) : null,
    new FieldProvenance('nodeCount', provenanceHandle),
    new FieldProvenance('queryParamCount', provenanceHandle),
    new FieldProvenance('fragment', provenanceHandle),
    new FieldProvenance('source', provenanceHandle),
  ]);
}

function transitionRouteNode(
  store: KernelStore,
  local: string,
  instructionTree: ViewportInstructionTreeModel,
  seed: ResolvedTransitionRouteNodeSeed,
  parent: RouterReference | null,
  child: RouterReference | null,
): RouteNodeModel {
  const provenanceHandle = store.handles.provenance(local);
  const path = configuredPathForEndpoint(seed.endpoint, seed.configurableRoute);
  const viewport = seed.instruction?.viewport ?? seed.routeConfig.viewport ?? DEFAULT_VIEWPORT_NAME;
  const residueInstructionCount = seed.recognizedRoute.residue == null ? 0 : 1;
  return new RouteNodeModel(
    store.handles.product(local),
    store.handles.identity(local),
    seed.routeContext.toReference(),
    seed.routeConfig.toReference(),
    parent,
    child == null ? [] : [child],
    seed.recognizedRoute.viewportInstruction,
    seed.recognizedRoute.viewportInstruction,
    seed.recognizedRoute.toReference(),
    seed.recognizedRoute.parameterCount,
    instructionTree.queryParamCount,
    instructionTree.fragment,
    seed.routeConfig.hasData,
    viewport,
    residueInstructionCount,
    path,
    path,
    seed.routeConfig.component,
    seed.routeConfig.title,
    seed.recognizedRoute.sourceAddressHandle,
    routeNodeFieldProvenance(provenanceHandle, seed.routeConfig, {
      hasChildren: child != null,
      hasInstruction: true,
      hasOriginalInstruction: true,
      hasRecognizedRoute: true,
      parameterCount: seed.recognizedRoute.parameterCount,
      queryParamCount: instructionTree.queryParamCount,
      fragment: instructionTree.fragment,
      hasData: seed.routeConfig.hasData,
      viewport,
      residueInstructionCount,
      hasParent: parent != null,
    }),
  );
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
  return [
    new EvidenceRecord(
      evidenceHandle,
      EvidenceKind.SemanticObservation,
      [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
      'RouteTree.createAndAppendNodes materialized a RouteNode from a recognized viewport instruction path.',
      node.sourceAddressHandle,
    ),
    new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
    new RouterIdentity(
      node.identityHandle,
      KernelVocabulary.Router.RouteNode.key,
      node.routeContext.identityHandle,
      node.sourceAddressHandle,
      node.routeContext.localName,
    ),
    new MaterializedProduct(
      node.productHandle,
      KernelVocabulary.Router.RouteNode.key,
      node.identityHandle,
      node.sourceAddressHandle,
      provenanceHandle,
    ),
    new MaterializationRecord(
      store.handles.materialization(local),
      ownerHandle,
      [node.productHandle],
      [],
      [],
    ),
  ];
}

function transitionRouteNodeSeed(
  recognizedRoute: RecognizedRouteModel,
  endpointsByIdentity: ReadonlyMap<EndpointModel['identityHandle'], EndpointModel>,
  configurableRoutesByIdentity: ReadonlyMap<ConfigurableRouteModel['identityHandle'], ConfigurableRouteModel>,
  routeConfigsByIdentity: ReadonlyMap<RouteConfigModel['identityHandle'], RouteConfigModel>,
  routeConfigContextsByConfigIdentity: ReadonlyMap<RouteConfigModel['identityHandle'], RouteConfigContextModel>,
  viewportInstructionsByIdentity: ReadonlyMap<ViewportInstructionModel['identityHandle'], ViewportInstructionModel>,
): TransitionRouteNodeSeed | null {
  const endpoint = requiredByIdentity(
    endpointsByIdentity,
    recognizedRoute.endpoint.identityHandle,
    `RecognizedRoute '${recognizedRoute.identityHandle}' references an unmaterialized Endpoint.`,
  );
  const configurableRoute = requiredByIdentity(
    configurableRoutesByIdentity,
    endpoint.configurableRoute.identityHandle,
    `Endpoint '${endpoint.identityHandle}' references an unmaterialized ConfigurableRoute.`,
  );
  const routeConfig = requiredByIdentity(
    routeConfigsByIdentity,
    configurableRoute.routeConfig.identityHandle,
    `ConfigurableRoute '${configurableRoute.identityHandle}' references an unmaterialized RouteConfig.`,
  );
  const routeConfigContext = routeConfigContextsByConfigIdentity.get(routeConfig.identityHandle) ?? null;
  if (routeConfigContext == null) {
    if (routeConfig.routeKind === RouteConfigKind.Redirect) {
      // Framework createConfiguredNode rewrites redirects before RouteNode.create; model that target handoff separately.
      return null;
    }
    throw new Error(`RouteConfig '${routeConfig.identityHandle}' has no materialized RouteConfigContext.`);
  }
  const instructionIdentity = recognizedRoute.viewportInstruction.identityHandle;
  const instruction = instructionIdentity == null
    ? null
    : viewportInstructionsByIdentity.get(instructionIdentity) ?? null;
  return {
    recognizedRoute,
    endpoint,
    configurableRoute,
    routeConfig,
    routeConfigContext,
    instruction,
  };
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
      return new ResolvedTransitionRouteNodeSeedSet([], {
        parentRouteContext,
        seed,
        request: null,
        reason: 'resolved route config does not expose a component name for ViewportRequest construction',
      });
    }
    const viewportRequest = new ViewportRequestModel(
      seed.instruction?.viewport ?? seed.routeConfig.viewport ?? DEFAULT_VIEWPORT_NAME,
      componentName,
    );
    const viewportAgent = routeRuntime.resolveViewportAgent(parentRouteContext.identityHandle, viewportRequest);
    if (viewportAgent == null) {
      return new ResolvedTransitionRouteNodeSeedSet([], {
        parentRouteContext,
        seed,
        request: viewportRequest,
        reason: 'parent RouteContext has no matching available ViewportAgent',
      });
    }
    const routeContext = routeRuntime.routeContextForRouteConfigContextAndViewportAgent(
      seed.routeConfigContext.identityHandle,
      viewportAgent.identityHandle,
    );
    if (routeContext == null) {
      return new ResolvedTransitionRouteNodeSeedSet([], {
        parentRouteContext,
        seed,
        request: viewportRequest,
        reason: 'Router._getRouteContext pair is not materialized for the resolved ViewportAgent and RouteConfigContext',
      });
    }
    resolved.push({
      ...seed,
      routeContext,
      viewportAgent,
      viewportRequest,
    });
    parentRouteContext = routeContext;
  }
  return new ResolvedTransitionRouteNodeSeedSet(resolved, null);
}

function recordViewportResolutionOpenSeam(
  store: KernelStore,
  open: OpenViewportResolution,
  records: KernelStoreRecord[],
): void {
  const requestLabel = open.request == null
    ? 'unavailable ViewportRequest'
    : `ViewportRequest(viewport:'${open.request.viewportName}',component:'${open.request.componentName}')`;
  const summary = `RouteTree.createConfiguredNode could not resolve ${requestLabel}: ${open.reason}.`;
  const local = `router-route-tree-open:viewport-request:${open.seed.recognizedRoute.identityHandle}:${encodeLocal(open.reason)}`;
  const evidenceHandle = store.handles.evidence(local);
  const openSeam = new OpenSeam(
    store.handles.openSeam(local),
    KernelVocabulary.Router.OpenInstruction.key,
    summary,
    open.seed.recognizedRoute.sourceAddressHandle,
    evidenceHandle,
  );
  records.push(
    new EvidenceRecord(
      evidenceHandle,
      EvidenceKind.SemanticObservation,
      [EvidenceRole.TransformInput],
      summary,
      open.seed.recognizedRoute.sourceAddressHandle,
    ),
    openSeam,
    new MaterializationRecord(
      store.handles.materialization(local),
      open.parentRouteContext.identityHandle,
      [],
      [],
      [openSeam.handle],
    ),
  );
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

function encodeLocal(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.:-]/g, '_');
}
