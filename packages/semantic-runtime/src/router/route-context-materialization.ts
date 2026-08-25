import type { ProjectBootFrame } from '../boot/frames.js';
import type { AppRoot } from '../configuration/app-root.js';
import type { ConfigurationRecognitionProjectResult } from '../configuration/configuration-recognition-project-pass.js';
import {
  EvidenceKind,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  IdentityHandle,
} from '../kernel/handles.js';
import {
  KernelPublicationPlan,
  KernelStoreBatch,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import type {
  KernelStoreReadView,
  KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  RouteConfigContextModel,
  RouteConfigKind,
  RouteConfigStageKind,
  RouterModelKind,
  RouterReference,
  RouteRecognizerModelKind,
  RouteRecognizerReference,
  RouteRecognizerModel,
  RouteRecognizerOwnershipKind,
  type RouteConfigModel,
  type RouterOptionsModel,
  resolvedRouteableComponentName,
} from './model.js';
import type { RouteConfigConvergenceProjectResult } from './route-config-convergence.js';
import { RouterOptionsMaterializationProjectResult } from './router-options-materialization.js';
import { routeRecognizerProductRecords, routerProductRecords } from './router-product-records.js';

interface RouteConfigContextEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly context: RouteConfigContextModel;
  readonly recognizer: RouteRecognizerModel | null;
}

interface RootRouteConfigUse {
  readonly appRoot: AppRoot | null;
  readonly routeConfig: RouteConfigModel;
  readonly options: RouterOptionsModel | null;
}

class RouteConfigGraph {
  private readonly configsByIdentity = new Map<IdentityHandle, RouteConfigModel>();
  private readonly configsByComponentIdentity = new Map<IdentityHandle, RouteConfigModel>();
  private readonly childIdentityHandles = new Set<IdentityHandle>();

  constructor(
    readonly routeConfigs: readonly RouteConfigModel[],
  ) {
    for (const routeConfig of routeConfigs) {
      this.configsByIdentity.set(routeConfig.identityHandle, routeConfig);
      if (
        routeConfig.stage === RouteConfigStageKind.Definition
        && routeConfig.routeKind === RouteConfigKind.Route
        && routeConfig.component?.resolvedIdentityHandle != null
      ) {
        this.configsByComponentIdentity.set(routeConfig.component.resolvedIdentityHandle, routeConfig);
      }
    }
    for (const routeConfig of routeConfigs) {
      for (const child of routeConfig.childRoutes) {
        if (child.identityHandle != null) {
          this.childIdentityHandles.add(child.identityHandle);
        }
      }
    }
  }

  roots(): readonly RouteConfigModel[] {
    return this.routeConfigs.filter((routeConfig) => !this.childIdentityHandles.has(routeConfig.identityHandle));
  }

  rootsForAppRoots(
    appRoots: readonly AppRoot[],
    routerOptions: RouterOptionsMaterializationProjectResult,
  ): readonly RootRouteConfigUse[] {
    const roots: RootRouteConfigUse[] = [];
    for (const appRoot of appRoots) {
      const componentIdentity = appRoot.component?.identityHandle ?? null;
      if (componentIdentity == null) {
        continue;
      }
      const routeConfig = this.configsByComponentIdentity.get(componentIdentity);
      const options = routerOptions.readRouterOptionsForAppRoot(appRoot);
      if (routeConfig == null || options == null) {
        continue;
      }
      roots.push({ appRoot, routeConfig, options });
    }
    return roots;
  }

  childrenOf(routeConfig: RouteConfigModel): readonly RouteConfigModel[] {
    return routeConfig.childRoutes
      .map((child) => child.identityHandle == null ? null : this.configsByIdentity.get(child.identityHandle) ?? null)
      .filter((child): child is RouteConfigModel => child != null);
  }
}

/** RouteConfigContext products materialized for one project without running navigation. */
export class RouteConfigContextMaterializationProjectResult {
  constructor(
    readonly project: ProjectBootFrame,
    readonly routeConfigs: readonly RouteConfigModel[],
    readonly routeConfigContexts: readonly RouteConfigContextModel[],
    readonly routeRecognizers: readonly RouteRecognizerModel[],
    readonly routerOptions: RouterOptionsMaterializationProjectResult,
  ) {}

  readRouteConfigs(): readonly RouteConfigModel[] {
    return this.routeConfigs;
  }

  readRouteConfigContexts(): readonly RouteConfigContextModel[] {
    return this.routeConfigContexts;
  }

  readRouteRecognizers(): readonly RouteRecognizerModel[] {
    return this.routeRecognizers;
  }

  usesEagerLoading(context: RouteConfigContextModel): boolean {
    return this.routerOptions.readRouterOptionsForReference(context.options)?.useEagerLoading === true;
  }
}

/** Materialize the RouteConfigContext topology that owns child route registration and recognizer instances. */
export class RouteConfigContextMaterializationProjectPass {
  materializeAndEmit(
    publication: KernelPublicationContext,
    project: ProjectBootFrame,
    routes: RouteConfigConvergenceProjectResult,
    routerOptions: RouterOptionsMaterializationProjectResult,
    configuration: ConfigurationRecognitionProjectResult,
  ): RouteConfigContextMaterializationProjectResult {
    const graph = new RouteConfigGraph(routes.readRouteConfigs());
    const rootRouteConfigs = rootRouteConfigsForContextMaterialization(graph, configuration, routerOptions);
    const emissions = this.materializeRootContextTrees(publication, graph, rootRouteConfigs);
    const records = emissions.flatMap((emission) => emission.records);
    publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(records, `router-route-config-context:${project.projectKey}`),
    ));
    return new RouteConfigContextMaterializationProjectResult(
      project,
      graph.routeConfigs,
      emissions.map((emission) => emission.context),
      emissions.flatMap((emission) => emission.recognizer == null ? [] : [emission.recognizer]),
      routerOptions,
    );
  }

  private materializeRootContextTrees(
    store: KernelStoreReadView,
    graph: RouteConfigGraph,
    rootRouteConfigs: readonly RootRouteConfigUse[],
  ): readonly RouteConfigContextEmission[] {
    return rootRouteConfigs.flatMap((rootUse) => this.materializeContextTree(
      store,
      graph,
      rootUse.routeConfig,
      rootUse.appRoot,
      rootUse.options,
      null,
      null,
      0,
      routeConfigContextName(rootUse.routeConfig),
      new Set(),
    ));
  }

  private materializeContextTree(
    store: KernelStoreReadView,
    graph: RouteConfigGraph,
    routeConfig: RouteConfigModel,
    appRoot: AppRoot | null,
    options: RouterOptionsModel | null,
    parent: RouteConfigContextModel | null,
    root: RouteConfigContextModel | null,
    depth: number,
    friendlyPath: string,
    emitted: Set<IdentityHandle>,
  ): readonly RouteConfigContextEmission[] {
    if (routeConfig.routeKind === RouteConfigKind.Redirect || emitted.has(routeConfig.identityHandle)) {
      return [];
    }
    const children = graph.childrenOf(routeConfig);
    const emission = this.materializeRouteConfigContext(
      store,
      routeConfig,
      appRoot,
      options,
      parent,
      root,
      children,
      depth,
      friendlyPath,
    );
    emitted.add(routeConfig.identityHandle);
    const currentRoot = root ?? emission.context;
    return [
      emission,
      ...children.flatMap((child) => this.materializeContextTree(
        store,
        graph,
        child,
        appRoot,
        options,
        emission.context,
        currentRoot,
        depth + 1,
        `${friendlyPath}/${routeConfigContextName(child)}`,
        emitted,
      )),
    ];
  }

  private materializeRouteConfigContext(
    store: KernelStoreReadView,
    routeConfig: RouteConfigModel,
    appRoot: AppRoot | null,
    options: RouterOptionsModel | null,
    parent: RouteConfigContextModel | null,
    root: RouteConfigContextModel | null,
    children: readonly RouteConfigModel[],
    depth: number,
    friendlyPath: string,
  ): RouteConfigContextEmission {
    const contextLocal = `router-route-config-context:${appRoot?.identityHandle ?? 'unrooted'}:${routeConfig.identityHandle}`;
    const ownsRecognizer = parent == null || options?.useEagerLoading !== true;
    const recognizerLocal = `${contextLocal}:recognizer`;
    const contextReference = routeConfigContextReference(store, contextLocal, routeConfig, friendlyPath);
    const recognizerReference = routeConfigContextRecognizerReference(
      store,
      recognizerLocal,
      routeConfig,
      parent,
      ownsRecognizer,
      friendlyPath,
    );
    const context = materializedRouteConfigContext(
      store,
      contextLocal,
      routeConfig,
      appRoot,
      options,
      parent,
      root,
      children,
      depth,
      friendlyPath,
      contextReference,
      recognizerReference,
    );
    const routeRecognizer = ownsRecognizer
      ? ownedRouteRecognizer(store, recognizerLocal, routeConfig, contextReference)
      : null;
    return {
      records: [
        ...routeConfigContextRecords(store, contextLocal, routeConfig, parent, context),
        ...routeRecognizerRecords(store, recognizerLocal, context, routeRecognizer),
      ],
      context,
      recognizer: routeRecognizer,
    };
  }
}

function routeConfigContextReference(
  store: KernelStoreReadView,
  contextLocal: string,
  routeConfig: RouteConfigModel,
  friendlyPath: string,
): RouterReference {
  return new RouterReference(
    store.handles.product(contextLocal),
    store.handles.identity(contextLocal),
    RouterModelKind.RouteConfigContext,
    routeConfig.sourceAddressHandle,
    friendlyPath,
  );
}

function routeConfigContextRecognizerReference(
  store: KernelStoreReadView,
  recognizerLocal: string,
  routeConfig: RouteConfigModel,
  parent: RouteConfigContextModel | null,
  ownsRecognizer: boolean,
  friendlyPath: string,
): RouteRecognizerReference {
  return ownsRecognizer
    ? new RouteRecognizerReference(
      store.handles.product(recognizerLocal),
      store.handles.identity(recognizerLocal),
      RouteRecognizerModelKind.RouteRecognizer,
      routeConfig.sourceAddressHandle,
      friendlyPath,
    )
    : parent!.recognizer;
}

function materializedRouteConfigContext(
  store: KernelStoreReadView,
  contextLocal: string,
  routeConfig: RouteConfigModel,
  appRoot: AppRoot | null,
  options: RouterOptionsModel | null,
  parent: RouteConfigContextModel | null,
  root: RouteConfigContextModel | null,
  children: readonly RouteConfigModel[],
  depth: number,
  friendlyPath: string,
  contextReference: RouterReference,
  recognizerReference: RouteRecognizerReference,
): RouteConfigContextModel {
  return new RouteConfigContextModel(
    store.handles.product(contextLocal),
    store.handles.identity(contextLocal),
    appRoot?.toReference() ?? null,
    options?.toReference() ?? null,
    parent?.toReference() ?? null,
    root?.toReference() ?? contextReference,
    routeConfig.toReference(),
    recognizerReference,
    children.map((child) => child.toReference()),
    depth,
    friendlyPath,
    children.length > 0 ? true : null,
    routeConfig.sourceAddressHandle,
  );
}

function ownedRouteRecognizer(
  store: KernelStoreReadView,
  recognizerLocal: string,
  routeConfig: RouteConfigModel,
  contextReference: RouterReference,
): RouteRecognizerModel {
  return new RouteRecognizerModel(
    store.handles.product(recognizerLocal),
    store.handles.identity(recognizerLocal),
    contextReference,
    RouteRecognizerOwnershipKind.Own,
    routeConfig.sourceAddressHandle,
  );
}

function routeConfigContextRecords(
  store: KernelStoreReadView,
  contextLocal: string,
  routeConfig: RouteConfigModel,
  parent: RouteConfigContextModel | null,
  context: RouteConfigContextModel,
): readonly KernelStoreRecord[] {
  const evidenceHandle = store.handles.evidence(contextLocal);
  const provenanceHandle = store.handles.provenance(contextLocal);
  return routerProductRecords(store, {
    local: contextLocal,
    evidenceHandle,
    provenanceHandle,
    productHandle: context.productHandle,
    identityHandle: context.identityHandle,
    productKindKey: KernelVocabulary.Router.RouteConfigContext.key,
    ownerHandle: parent?.identityHandle ?? context.appRoot?.identityHandle ?? routeConfig.identityHandle,
    materializationOwnerHandle: routeConfig.identityHandle,
    sourceAddressHandle: routeConfig.sourceAddressHandle,
    localName: context.friendlyPath,
    evidenceKind: EvidenceKind.ConfigurationFlow,
    evidenceRoles: [EvidenceRole.Configuration],
    evidenceSummary: 'Router RouteConfigContext topology materialized from normalized RouteConfig.',
  });
}

function routeRecognizerRecords(
  store: KernelStoreReadView,
  recognizerLocal: string,
  context: RouteConfigContextModel,
  recognizer: RouteRecognizerModel | null,
): readonly KernelStoreRecord[] {
  if (recognizer == null) {
    return [];
  }
  return routeRecognizerProductRecords(store, {
    local: recognizerLocal,
    evidenceHandle: store.handles.evidence(recognizerLocal),
    provenanceHandle: store.handles.provenance(recognizerLocal),
    productHandle: recognizer.productHandle,
    identityHandle: recognizer.identityHandle,
    productKindKey: KernelVocabulary.RouteRecognizer.RouteRecognizer.key,
    ownerHandle: context.identityHandle,
    sourceAddressHandle: recognizer.sourceAddressHandle,
    localName: context.friendlyPath,
    evidenceKind: EvidenceKind.ConfigurationFlow,
    evidenceRoles: [EvidenceRole.Configuration],
    evidenceSummary: 'RouteConfigContext materialization created an owned RouteRecognizer instance.',
  });
}

function routeConfigContextName(routeConfig: RouteConfigModel): string {
  return resolvedRouteableComponentName(routeConfig.component)
    ?? routeConfig.id
    ?? routeConfig.paths.find((path) => path.length > 0)
    ?? '(anonymous-route)';
}

function rootRouteConfigsForContextMaterialization(
  graph: RouteConfigGraph,
  configuration: ConfigurationRecognitionProjectResult,
  routerOptions: RouterOptionsMaterializationProjectResult,
): readonly RootRouteConfigUse[] {
  const appRoots = configuration.readConfiguration().appRoots;
  return appRoots.length === 0
    ? graph.roots().map((routeConfig) => ({ appRoot: null, routeConfig, options: null }))
    : graph.rootsForAppRoots(appRoots, routerOptions);
}
