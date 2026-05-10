import type { ProjectBootFrame } from '../boot/frames.js';
import type { AppRoot } from '../configuration/app-root.js';
import type { ConfigurationRecognitionProjectResult } from '../configuration/configuration-recognition-project-pass.js';
import {
  EvidenceKind,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  IdentityHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
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
  RouteConfigContextModel,
  RouteConfigKind,
  RouterModelKind,
  RouterReference,
  RouteRecognizerModelKind,
  RouteRecognizerReference,
  RouteRecognizerModel,
  RouteRecognizerOwnershipKind,
  type RouteConfigContextField,
  type RouteConfigModel,
  type RouteRecognizerField,
} from './model.js';
import type { RouteConfigRecognitionProjectResult } from './route-config-recognition.js';
import type { RouterOptionsMaterializationProjectResult } from './router-options-materialization.js';
import { routeRecognizerProductRecords, routerProductRecords } from './router-product-records.js';

interface RouteConfigContextEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly context: RouteConfigContextModel;
  readonly recognizer: RouteRecognizerModel | null;
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
      if (routeConfig.routeKind === RouteConfigKind.Route && routeConfig.component?.resolvedIdentityHandle != null) {
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

  rootsForAppRoots(appRoots: readonly AppRoot[]): readonly RouteConfigModel[] {
    const roots: RouteConfigModel[] = [];
    const seen = new Set<IdentityHandle>();
    for (const appRoot of appRoots) {
      const componentIdentity = appRoot.component?.identityHandle ?? null;
      if (componentIdentity == null) {
        continue;
      }
      const routeConfig = this.configsByComponentIdentity.get(componentIdentity);
      if (routeConfig == null || seen.has(routeConfig.identityHandle)) {
        continue;
      }
      seen.add(routeConfig.identityHandle);
      roots.push(routeConfig);
    }
    return roots;
  }

  childrenOf(routeConfig: RouteConfigModel): readonly RouteConfigModel[] {
    const directChildren = routeConfig.childRoutes
      .map((child) => child.identityHandle == null ? null : this.configsByIdentity.get(child.identityHandle) ?? null)
      .filter((child): child is RouteConfigModel => child != null);
    if (directChildren.length > 0) {
      return directChildren;
    }
    const componentRouteConfig = this.componentRouteConfigFor(routeConfig);
    if (componentRouteConfig == null || componentRouteConfig.identityHandle === routeConfig.identityHandle) {
      return [];
    }
    return this.childrenOf(componentRouteConfig);
  }

  private componentRouteConfigFor(routeConfig: RouteConfigModel): RouteConfigModel | null {
    const componentIdentity = routeConfig.component?.resolvedIdentityHandle ?? null;
    return componentIdentity == null
      ? null
      : this.configsByComponentIdentity.get(componentIdentity) ?? null;
  }
}

/** RouteConfigContext products materialized for one project without running navigation. */
export class RouteConfigContextMaterializationProjectResult {
  constructor(
    readonly project: ProjectBootFrame,
    readonly routeConfigs: readonly RouteConfigModel[],
    readonly routeConfigContexts: readonly RouteConfigContextModel[],
    readonly routeRecognizers: readonly RouteRecognizerModel[],
    readonly useEagerLoading: boolean,
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

  usesEagerLoading(): boolean {
    return this.useEagerLoading;
  }
}

/** Materialize the RouteConfigContext topology that owns child route registration and recognizer instances. */
export class RouteConfigContextMaterializationProjectPass {
  materializeAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    routes: RouteConfigRecognitionProjectResult,
    routerOptions: RouterOptionsMaterializationProjectResult | null = null,
    configuration: ConfigurationRecognitionProjectResult | null = null,
  ): RouteConfigContextMaterializationProjectResult {
    const graph = new RouteConfigGraph(routes.readRouteConfigs());
    const useEagerLoading = routerOptions?.readEffectiveRouterOptions()?.useEagerLoading === true;
    const rootRouteConfigs = rootRouteConfigsForContextMaterialization(graph, configuration);
    const emissions = this.materializeRootContextTrees(store, graph, rootRouteConfigs, useEagerLoading);
    const records = emissions.flatMap((emission) => emission.records);
    if (records.length > 0) {
      store.commit(new KernelStoreBatch(records, `router-route-config-context:${project.projectKey}`));
    }
    return new RouteConfigContextMaterializationProjectResult(
      project,
      graph.routeConfigs,
      emissions.map((emission) => emission.context),
      emissions.flatMap((emission) => emission.recognizer == null ? [] : [emission.recognizer]),
      useEagerLoading,
    );
  }

  private materializeRootContextTrees(
    store: KernelStore,
    graph: RouteConfigGraph,
    rootRouteConfigs: readonly RouteConfigModel[],
    useEagerLoading: boolean,
  ): readonly RouteConfigContextEmission[] {
    const emitted = new Set<IdentityHandle>();
    return rootRouteConfigs.flatMap((routeConfig) => this.materializeContextTree(
      store,
      graph,
      routeConfig,
      null,
      null,
      0,
      routeConfigContextName(routeConfig),
      useEagerLoading,
      emitted,
    ));
  }

  private materializeContextTree(
    store: KernelStore,
    graph: RouteConfigGraph,
    routeConfig: RouteConfigModel,
    parent: RouteConfigContextModel | null,
    root: RouteConfigContextModel | null,
    depth: number,
    friendlyPath: string,
    useEagerLoading: boolean,
    emitted: Set<IdentityHandle>,
  ): readonly RouteConfigContextEmission[] {
    if (routeConfig.routeKind === RouteConfigKind.Redirect || emitted.has(routeConfig.identityHandle)) {
      return [];
    }
    const children = graph.childrenOf(routeConfig);
    const emission = this.materializeRouteConfigContext(
      store,
      routeConfig,
      parent,
      root,
      children,
      depth,
      friendlyPath,
      useEagerLoading,
    );
    emitted.add(routeConfig.identityHandle);
    const currentRoot = root ?? emission.context;
    return [
      emission,
      ...children.flatMap((child) => this.materializeContextTree(
        store,
        graph,
        child,
        emission.context,
        currentRoot,
        depth + 1,
        `${friendlyPath}/${routeConfigContextName(child)}`,
        useEagerLoading,
        emitted,
      )),
    ];
  }

  private materializeRouteConfigContext(
    store: KernelStore,
    routeConfig: RouteConfigModel,
    parent: RouteConfigContextModel | null,
    root: RouteConfigContextModel | null,
    children: readonly RouteConfigModel[],
    depth: number,
    friendlyPath: string,
    useEagerLoading: boolean,
  ): RouteConfigContextEmission {
    const contextLocal = `router-route-config-context:${routeConfig.identityHandle}`;
    const ownsRecognizer = parent == null || !useEagerLoading;
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
  store: KernelStore,
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
  store: KernelStore,
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
  store: KernelStore,
  contextLocal: string,
  routeConfig: RouteConfigModel,
  parent: RouteConfigContextModel | null,
  root: RouteConfigContextModel | null,
  children: readonly RouteConfigModel[],
  depth: number,
  friendlyPath: string,
  contextReference: RouterReference,
  recognizerReference: RouteRecognizerReference,
): RouteConfigContextModel {
  const provenanceHandle = store.handles.provenance(contextLocal);
  return new RouteConfigContextModel(
    store.handles.product(contextLocal),
    store.handles.identity(contextLocal),
    parent?.toReference() ?? null,
    root?.toReference() ?? contextReference,
    routeConfig.toReference(),
    recognizerReference,
    children.map((child) => child.toReference()),
    depth,
    friendlyPath,
    children.length > 0 ? true : null,
    routeConfig.sourceAddressHandle,
    routeConfigContextFieldProvenance(provenanceHandle, parent, children),
  );
}

function ownedRouteRecognizer(
  store: KernelStore,
  recognizerLocal: string,
  routeConfig: RouteConfigModel,
  contextReference: RouterReference,
): RouteRecognizerModel {
  const provenanceHandle = store.handles.provenance(recognizerLocal);
  return new RouteRecognizerModel(
    store.handles.product(recognizerLocal),
    store.handles.identity(recognizerLocal),
    contextReference,
    RouteRecognizerOwnershipKind.Own,
    routeConfig.sourceAddressHandle,
    routeRecognizerFieldProvenance(provenanceHandle),
  );
}

function routeConfigContextRecords(
  store: KernelStore,
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
    ownerHandle: parent?.identityHandle ?? routeConfig.identityHandle,
    materializationOwnerHandle: routeConfig.identityHandle,
    sourceAddressHandle: routeConfig.sourceAddressHandle,
    localName: context.friendlyPath,
    evidenceKind: EvidenceKind.ConfigurationFlow,
    evidenceRoles: [EvidenceRole.Configuration],
    evidenceSummary: 'Router RouteConfigContext topology materialized from normalized RouteConfig.',
  });
}

function routeRecognizerRecords(
  store: KernelStore,
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
  return routeConfig.component?.localName
    ?? routeConfig.id
    ?? routeConfig.paths.find((path) => path.length > 0)
    ?? '(anonymous-route)';
}

function rootRouteConfigsForContextMaterialization(
  graph: RouteConfigGraph,
  configuration: ConfigurationRecognitionProjectResult | null,
): readonly RouteConfigModel[] {
  const appRoots = configuration?.readConfiguration().appRoots ?? [];
  return appRoots.length === 0
    ? graph.roots()
    : graph.rootsForAppRoots(appRoots);
}

function routeConfigContextFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  parent: RouteConfigContextModel | null,
  children: readonly RouteConfigModel[],
): readonly FieldProvenance<RouteConfigContextField>[] {
  return fieldProvenanceEntries<RouteConfigContextField>([
    parent == null ? null : 'parent',
    'root',
    'config',
    'recognizer',
    children.length === 0 ? null : 'childRoutes',
    'depth',
    'friendlyPath',
    children.length === 0 ? null : 'childRoutesConfigured',
    'source',
  ], provenanceHandle);
}

function routeRecognizerFieldProvenance(
  provenanceHandle: ProvenanceHandle,
): readonly FieldProvenance<RouteRecognizerField>[] {
  return fieldProvenanceEntries<RouteRecognizerField>([
    'routeConfigContext',
    'ownership',
    'source',
  ], provenanceHandle);
}
