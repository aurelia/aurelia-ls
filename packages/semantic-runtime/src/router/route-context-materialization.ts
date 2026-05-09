import type { ProjectBootFrame } from '../boot/frames.js';
import type { AppRoot } from '../configuration/app-root.js';
import type { ConfigurationRecognitionProjectResult } from '../configuration/configuration-recognition-project-pass.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  IdentityHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { RouteRecognizerIdentity, RouterIdentity } from '../kernel/identity.js';
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

class RouteConfigContextEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly context: RouteConfigContextModel,
    readonly recognizer: RouteRecognizerModel | null,
  ) {}
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
    const appRoots = configuration?.readConfiguration().appRoots ?? [];
    const rootRouteConfigs = appRoots.length === 0
      ? graph.roots()
      : graph.rootsForAppRoots(appRoots);
    const emitted = new Set<IdentityHandle>();
    const emissions = rootRouteConfigs
      .flatMap((routeConfig) => this.materializeContextTree(
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
    const evidenceHandle = store.handles.evidence(contextLocal);
    const provenanceHandle = store.handles.provenance(contextLocal);
    const contextProductHandle = store.handles.product(contextLocal);
    const contextIdentityHandle = store.handles.identity(contextLocal);
    const recognizerProductHandle = ownsRecognizer
      ? store.handles.product(recognizerLocal)
      : parent!.recognizer.productHandle;
    const recognizerIdentityHandle = ownsRecognizer
      ? store.handles.identity(recognizerLocal)
      : parent!.recognizer.identityHandle;
    const sourceAddressHandle = routeConfig.sourceAddressHandle;
    const contextReference = new RouterReference(
      contextProductHandle,
      contextIdentityHandle,
      RouterModelKind.RouteConfigContext,
      sourceAddressHandle,
      friendlyPath,
    );
    const recognizerReference = ownsRecognizer
      ? new RouteRecognizerReference(
        recognizerProductHandle,
        recognizerIdentityHandle,
        RouteRecognizerModelKind.RouteRecognizer,
        sourceAddressHandle,
        friendlyPath,
      )
      : parent!.recognizer;
    const context = new RouteConfigContextModel(
      contextProductHandle,
      contextIdentityHandle,
      parent?.toReference() ?? null,
      root?.toReference() ?? contextReference,
      routeConfig.toReference(),
      recognizerReference,
      children.map((child) => child.toReference()),
      depth,
      friendlyPath,
      children.length > 0 ? true : null,
      sourceAddressHandle,
      routeConfigContextFieldProvenance(provenanceHandle, parent, root, children),
    );
    const routeRecognizer = ownsRecognizer
      ? new RouteRecognizerModel(
        recognizerProductHandle!,
        recognizerIdentityHandle!,
        contextReference,
        RouteRecognizerOwnershipKind.Own,
        sourceAddressHandle,
        routeRecognizerFieldProvenance(provenanceHandle),
      )
      : null;
    return new RouteConfigContextEmission(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.ConfigurationFlow,
          [EvidenceRole.Configuration],
          'Router RouteConfigContext topology materialized from normalized RouteConfig.',
          sourceAddressHandle,
        ),
        new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
        new RouterIdentity(
          contextIdentityHandle,
          KernelVocabulary.Router.RouteConfigContext.key,
          parent?.identityHandle ?? routeConfig.identityHandle,
          sourceAddressHandle,
          friendlyPath,
        ),
        new MaterializedProduct(
          contextProductHandle,
          KernelVocabulary.Router.RouteConfigContext.key,
          contextIdentityHandle,
          sourceAddressHandle,
          provenanceHandle,
        ),
        new MaterializationRecord(
          store.handles.materialization(contextLocal),
          routeConfig.identityHandle,
          [contextProductHandle],
          [],
          [],
        ),
        ...(ownsRecognizer
          ? [
            new RouteRecognizerIdentity(
              recognizerIdentityHandle!,
              KernelVocabulary.RouteRecognizer.RouteRecognizer.key,
              contextIdentityHandle,
              sourceAddressHandle,
              friendlyPath,
            ),
            new MaterializedProduct(
              recognizerProductHandle!,
              KernelVocabulary.RouteRecognizer.RouteRecognizer.key,
              recognizerIdentityHandle!,
              sourceAddressHandle,
              provenanceHandle,
            ),
            new MaterializationRecord(
              store.handles.materialization(recognizerLocal),
              contextIdentityHandle,
              [recognizerProductHandle!],
              [],
              [],
            ),
          ]
          : []),
      ],
      context,
      routeRecognizer,
    );
  }
}

function routeConfigContextName(routeConfig: RouteConfigModel): string {
  return routeConfig.component?.localName
    ?? routeConfig.id
    ?? routeConfig.paths.find((path) => path.length > 0)
    ?? '(anonymous-route)';
}

function routeConfigContextFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  parent: RouteConfigContextModel | null,
  _root: RouteConfigContextModel | null,
  children: readonly RouteConfigModel[],
): readonly FieldProvenance<RouteConfigContextField>[] {
  return compactFieldProvenance<RouteConfigContextField>([
    parent == null ? null : new FieldProvenance('parent', provenanceHandle),
    new FieldProvenance('root', provenanceHandle),
    new FieldProvenance('config', provenanceHandle),
    new FieldProvenance('recognizer', provenanceHandle),
    children.length === 0 ? null : new FieldProvenance('childRoutes', provenanceHandle),
    new FieldProvenance('depth', provenanceHandle),
    new FieldProvenance('friendlyPath', provenanceHandle),
    children.length === 0 ? null : new FieldProvenance('childRoutesConfigured', provenanceHandle),
    new FieldProvenance('source', provenanceHandle),
  ]);
}

function routeRecognizerFieldProvenance(
  provenanceHandle: ProvenanceHandle,
): readonly FieldProvenance<RouteRecognizerField>[] {
  return [
    new FieldProvenance('routeConfigContext', provenanceHandle),
    new FieldProvenance('ownership', provenanceHandle),
    new FieldProvenance('source', provenanceHandle),
  ];
}
