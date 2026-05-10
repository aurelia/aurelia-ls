import type { ProjectBootFrame } from '../boot/frames.js';
import {
  EvidenceKind,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  EvidenceHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  compactFieldProvenance,
  FieldProvenance,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  ConfigurableRouteModel,
  DynamicSegmentModel,
  EndpointModel,
  ParameterModel,
  RouteRecognizerModelKind,
  RouteRecognizerReference,
  RouteRecognizerSegmentKind,
  RouteRecognizerStateKind,
  StateModel,
  type RouteRecognizerSegmentModel,
  StarSegmentModel,
  StaticSegmentModel,
  type ConfigurableRouteField,
  type RouteRecognizerField,
  type RouteConfigContextModel,
  type RouteConfigModel,
} from './model.js';
import type { RouteConfigContextMaterializationProjectResult } from './route-context-materialization.js';
import {
  requiredRouteConfigForContext,
  routeConfigContextIndex,
  routeConfigIndex,
} from './route-topology-index.js';
import { routeRecognizerProductRecords } from './router-product-records.js';

const RESIDUE = '$$residue';
const ROUTE_PARAMETER_PATTERN = /^:(?<name>[^?\s{}]+)(?:\{\{(?<constraint>.+)\}\})?(?<optional>\?)?$/;

class ConfigurableRouteEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly routeConfigContext: RouteConfigContextModel,
    readonly configurableRoute: ConfigurableRouteModel,
    readonly endpoints: readonly EndpointModel[],
  ) {}
}

interface ConfigurableRoutePathSite {
  readonly local: string;
  readonly evidenceHandle: EvidenceHandle;
  readonly provenanceHandle: ProvenanceHandle;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly parse: ConfigurableRouteParse;
  readonly configurableRoute: ConfigurableRouteModel;
}

/** Route-recognizer products materialized for one project without running navigation. */
export class RouteRecognizerMaterializationProjectResult {
  constructor(
    readonly project: ProjectBootFrame,
    readonly configurableRoutes: readonly ConfigurableRouteModel[],
    readonly endpoints: readonly EndpointModel[],
    readonly states: readonly StateModel[],
  ) {}

  readConfigurableRoutes(): readonly ConfigurableRouteModel[] {
    return this.configurableRoutes;
  }

  readEndpoints(): readonly EndpointModel[] {
    return this.endpoints;
  }

  readStates(): readonly StateModel[] {
    return this.states;
  }
}

/** Parse authored route-config paths into ConfigurableRoute facts before State/Endpoint graph materialization. */
export class RouteRecognizerMaterializationProjectPass {
  materializeAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    routeContexts: RouteConfigContextMaterializationProjectResult,
  ): RouteRecognizerMaterializationProjectResult {
    const routeConfigsByIdentity = routeConfigIndex(routeContexts);
    const routeConfigContexts = routeContexts.readRouteConfigContexts();
    const routeConfigContextsByIdentity = routeConfigContextIndex(routeContexts);
    const routeEmissions = routeConfigContexts
      .flatMap((routeConfigContext) =>
        this.materializeRouteConfigContext(
          store,
          routeConfigContext,
          routeConfigContextsByIdentity,
          routeConfigsByIdentity,
          routeContexts.usesEagerLoading(),
        )
      );
    const stateGraphs = materializeStateGraphs(store, routeEmissions);
    const records = [
      ...routeEmissions.flatMap((emission) => emission.records),
      ...stateGraphs.flatMap((stateGraph) => stateGraph.records),
    ];
    if (records.length > 0) {
      store.commit(new KernelStoreBatch(records, `route-recognizer:${project.projectKey}`));
    }
    return new RouteRecognizerMaterializationProjectResult(
      project,
      routeEmissions.map((emission) => emission.configurableRoute),
      routeEmissions.flatMap((emission) => emission.endpoints),
      stateGraphs.flatMap((stateGraph) => stateGraph.states),
    );
  }

  private materializeRouteConfigContext(
    store: KernelStore,
    routeConfigContext: RouteConfigContextModel,
    routeConfigContextsByIdentity: ReadonlyMap<RouteConfigContextModel['identityHandle'], RouteConfigContextModel>,
    routeConfigIndex: ReadonlyMap<RouteConfigModel['identityHandle'], RouteConfigModel>,
    useEagerLoading: boolean,
  ): readonly ConfigurableRouteEmission[] {
    const parentPaths = useEagerLoading
      ? eagerParentPaths(routeConfigContext, routeConfigContextsByIdentity, routeConfigIndex)
      : [null];
    return routeConfigContext.childRoutes.flatMap((childRoute) => {
      const routeConfig = childRoute.identityHandle == null
        ? null
        : routeConfigIndex.get(childRoute.identityHandle) ?? null;
      if (routeConfig == null) {
        return [];
      }
      return routeConfig.paths.flatMap((path, index) =>
        parentPaths.map((parentPath, parentPathIndex) =>
          this.materializeConfigurableRoute(
            store,
            routeConfigContext,
            routeConfig,
            path,
            index,
            parentPath,
            parentPathIndex,
          )
        )
      );
    });
  }

  private materializeConfigurableRoute(
    store: KernelStore,
    routeConfigContext: RouteConfigContextModel,
    routeConfig: RouteConfigModel,
    path: string,
    index: number,
    parentPath: string | null,
    parentPathIndex: number,
  ): ConfigurableRouteEmission {
    const routeSite = this.configurableRoutePathSite(
      store,
      routeConfigContext,
      routeConfig,
      path,
      parentPath,
      index,
      parentPathIndex,
    );
    const endpointEmission = this.materializeEndpoints(
      store,
      routeConfigContext,
      routeSite.configurableRoute,
      routeSite.parse,
      routeSite.local,
      routeSite.sourceAddressHandle,
    );
    return new ConfigurableRouteEmission(
      recordsForConfigurableRoute(
        store,
        routeSite.local,
        routeSite.configurableRoute,
        routeConfigContext,
        routeSite.evidenceHandle,
        routeSite.provenanceHandle,
        endpointEmission.records,
      ),
      routeConfigContext,
      routeSite.configurableRoute,
      endpointEmission.endpoints,
    );
  }

  private configurableRoutePathSite(
    store: KernelStore,
    routeConfigContext: RouteConfigContextModel,
    routeConfig: RouteConfigModel,
    path: string,
    parentPath: string | null,
    index: number,
    parentPathIndex: number,
  ): ConfigurableRoutePathSite {
    const local = `route-recognizer-configurable-route:${routeConfigContext.identityHandle}:route:${routeConfig.identityHandle}:path:${index}:parent:${parentPathIndex}`;
    const sourceAddressHandle = routeConfig.pathSourceAddressHandle;
    const parse = parseConfigurableRoutePath(path, routeConfig.caseSensitive === true);
    const provenanceHandle = store.handles.provenance(local);
    return {
      local,
      evidenceHandle: store.handles.evidence(local),
      provenanceHandle,
      sourceAddressHandle,
      parse,
      configurableRoute: configurableRouteModel(
        store.handles.product(local),
        store.handles.identity(local),
        path,
        parentPath,
        routeConfig,
        routeConfigContext,
        parse,
        sourceAddressHandle,
        provenanceHandle,
      ),
    };
  }

  private materializeEndpoints(
    store: KernelStore,
    routeConfigContext: RouteConfigContextModel,
    configurableRoute: ConfigurableRouteModel,
    parse: ConfigurableRouteParse,
    configurableRouteLocal: string,
    sourceAddressHandle: RouteConfigModel['sourceAddressHandle'],
  ): ConfigurableRouteEndpointEmission {
    const primaryPath = recognizerPathFor(configurableRoute);
    const hasResidualEndpoint = shouldAddResidualEndpoint(parse.parameters);
    const primaryLocal = `${configurableRouteLocal}:endpoint:primary`;
    const residualLocal = `${configurableRouteLocal}:endpoint:residual`;
    const primaryEndpoint = endpointModel(
      store,
      primaryLocal,
      routeConfigContext.recognizer,
      configurableRoute.toReference(),
      primaryPath,
      false,
      parse.parameters,
      null,
      hasResidualEndpoint ? endpointReference(
        store,
        residualLocal,
        `${primaryPath}/*${RESIDUE}`,
        sourceAddressHandle,
      ) : null,
      sourceAddressHandle,
    );
    const primaryRecords = recordsForEndpointPublication(store, primaryLocal, primaryEndpoint, routeConfigContext, 'primary');

    if (!hasResidualEndpoint) {
      return new ConfigurableRouteEndpointEmission(primaryRecords, [primaryEndpoint]);
    }

    const residualEndpoint = endpointModel(
      store,
      residualLocal,
      routeConfigContext.recognizer,
      configurableRoute.toReference(),
      `${primaryPath}/*${RESIDUE}`,
      true,
      residualEndpointParameters(parse.parameters),
      primaryEndpoint.toReference(),
      null,
      sourceAddressHandle,
    );
    return new ConfigurableRouteEndpointEmission(
      [
        ...primaryRecords,
        ...recordsForEndpointPublication(store, residualLocal, residualEndpoint, routeConfigContext, 'residual'),
      ],
      [primaryEndpoint, residualEndpoint],
    );
  }
}

function configurableRouteModel(
  productHandle: ProductHandle,
  identityHandle: IdentityHandle,
  path: string,
  parentPath: string | null,
  routeConfig: RouteConfigModel,
  routeConfigContext: RouteConfigContextModel,
  parse: ConfigurableRouteParse,
  sourceAddressHandle: RouteConfigModel['sourceAddressHandle'],
  provenanceHandle: ProvenanceHandle,
): ConfigurableRouteModel {
  return new ConfigurableRouteModel(
    productHandle,
    identityHandle,
    routeConfigContext.recognizer,
    routeConfigContext.toReference(),
    routeConfig.toReference(),
    parentPath,
    path,
    routeConfig.caseSensitive === true,
    parse.segments,
    parse.parameters,
    sourceAddressHandle,
    configurableRouteFieldProvenance(provenanceHandle, parse, parentPath),
  );
}

function recordsForConfigurableRoute(
  store: KernelStore,
  local: string,
  configurableRoute: ConfigurableRouteModel,
  routeConfigContext: RouteConfigContextModel,
  evidenceHandle: EvidenceHandle,
  provenanceHandle: ProvenanceHandle,
  endpointRecords: readonly KernelStoreRecord[],
): readonly KernelStoreRecord[] {
  return [
    ...routeRecognizerProductRecords(store, {
      local,
      evidenceHandle,
      provenanceHandle,
      productHandle: configurableRoute.productHandle,
      identityHandle: configurableRoute.identityHandle,
      productKindKey: KernelVocabulary.RouteRecognizer.ConfigurableRoute.key,
      ownerHandle: routeConfigContext.recognizer.identityHandle ?? routeConfigContext.identityHandle,
      sourceAddressHandle: configurableRoute.sourceAddressHandle,
      localName: configurableRoute.path,
      evidenceKind: EvidenceKind.ConfigurationFlow,
      evidenceRoles: [EvidenceRole.Configuration],
      evidenceSummary: 'RouteConfigContext child route registered as route-recognizer configurable route path.',
    }),
    ...endpointRecords,
  ];
}

function materializeStateGraphs(
  store: KernelStore,
  routeEmissions: readonly ConfigurableRouteEmission[],
): readonly RouteRecognizerStateGraphEmission[] {
  const emissionsByRecognizer = new Map<string, ConfigurableRouteEmission[]>();
  for (const emission of routeEmissions) {
    const recognizerIdentityHandle = emission.configurableRoute.recognizer.identityHandle;
    if (recognizerIdentityHandle == null) {
      throw new Error(`ConfigurableRoute '${emission.configurableRoute.identityHandle}' is missing its RouteRecognizer identity reference.`);
    }
    const emissions = emissionsByRecognizer.get(recognizerIdentityHandle);
    if (emissions == null) {
      emissionsByRecognizer.set(recognizerIdentityHandle, [emission]);
    } else {
      emissions.push(emission);
    }
  }
  return [...emissionsByRecognizer.values()].map((emissions) => {
    const owner = emissions[0]!.routeConfigContext;
    return new RouteRecognizerStateGraphBuilder(store, owner)
      .materialize(
        emissions.flatMap((emission) => emission.endpoints),
        emissions.map((emission) => emission.configurableRoute),
      );
  });
}

function eagerParentPaths(
  routeConfigContext: RouteConfigContextModel,
  routeConfigContextsByIdentity: ReadonlyMap<RouteConfigContextModel['identityHandle'], RouteConfigContextModel>,
  routeConfigIndex: ReadonlyMap<RouteConfigModel['identityHandle'], RouteConfigModel>,
): readonly (string | null)[] {
  let parentPaths: string[] = [''];
  let current: RouteConfigContextModel | null = routeConfigContext;
  while (current.parent != null) {
    const routeConfig = requiredRouteConfigForContext(current, routeConfigIndex);
    parentPaths = routeConfig.paths.flatMap((path) =>
      parentPaths.map((parentPath) => parentPath.length === 0 ? path : `${path}/${parentPath}`)
    );
    current = requiredParentContext(current, routeConfigContextsByIdentity);
  }
  const nonEmptyParentPaths = parentPaths.filter(isNotEmpty);
  return nonEmptyParentPaths.length === 0 ? [null] : nonEmptyParentPaths;
}

function requiredParentContext(
  routeConfigContext: RouteConfigContextModel,
  routeConfigContextsByIdentity: ReadonlyMap<RouteConfigContextModel['identityHandle'], RouteConfigContextModel>,
): RouteConfigContextModel {
  const identityHandle = routeConfigContext.parent?.identityHandle ?? null;
  if (identityHandle == null) {
    throw new Error(`RouteConfigContext '${routeConfigContext.identityHandle}' is missing its parent RouteConfigContext identity reference.`);
  }
  const parent = routeConfigContextsByIdentity.get(identityHandle);
  if (parent == null) {
    throw new Error(`RouteConfigContext '${routeConfigContext.identityHandle}' references unmaterialized parent RouteConfigContext '${identityHandle}'.`);
  }
  return parent;
}

function recognizerPathFor(
  configurableRoute: ConfigurableRouteModel,
): string {
  return configurableRoute.parentPath == null
    ? configurableRoute.path
    : `${configurableRoute.parentPath}/${configurableRoute.path}`;
}

function residualEndpointParameters(
  parameters: readonly ParameterModel[],
): readonly ParameterModel[] {
  return [
    ...parameters,
    new ParameterModel(RESIDUE, true, true, null),
  ];
}

function endpointModel(
  store: KernelStore,
  local: string,
  recognizer: RouteRecognizerReference,
  configurableRoute: RouteRecognizerReference,
  path: string,
  isResidual: boolean,
  parameters: readonly ParameterModel[],
  primaryEndpoint: RouteRecognizerReference | null,
  residualEndpoint: RouteRecognizerReference | null,
  sourceAddressHandle: RouteConfigModel['sourceAddressHandle'],
): EndpointModel {
  return new EndpointModel(
    store.handles.product(local),
    store.handles.identity(local),
    recognizer,
    configurableRoute,
    path,
    isResidual,
    parameters,
    primaryEndpoint,
    residualEndpoint,
    sourceAddressHandle,
    endpointFieldProvenance(store.handles.provenance(local), parameters, isResidual, residualEndpoint != null),
  );
}

function endpointReference(
  store: KernelStore,
  local: string,
  path: string,
  sourceAddressHandle: RouteConfigModel['sourceAddressHandle'],
): RouteRecognizerReference {
  return new RouteRecognizerReference(
    store.handles.product(local),
    store.handles.identity(local),
    RouteRecognizerModelKind.Endpoint,
    sourceAddressHandle,
    path,
  );
}

function recordsForEndpointPublication(
  store: KernelStore,
  local: string,
  endpoint: EndpointModel,
  routeConfigContext: RouteConfigContextModel,
  endpointKind: 'primary' | 'residual',
): readonly KernelStoreRecord[] {
  return endpointRecords(
    store,
    local,
    endpoint,
    routeConfigContext,
    store.handles.evidence(local),
    store.handles.provenance(local),
    endpointKind === 'primary'
      ? 'RouteRecognizer.add materialized the primary Endpoint for a configurable route path.'
      : 'RouteRecognizer.add materialized the residual Endpoint for a configurable route path.',
  );
}

class ConfigurableRouteEndpointEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly endpoints: readonly EndpointModel[],
  ) {}
}

function endpointRecords(
  store: KernelStore,
  local: string,
  endpoint: EndpointModel,
  routeConfigContext: RouteConfigContextModel,
  evidenceHandle: EvidenceHandle,
  provenanceHandle: ProvenanceHandle,
  summary: string,
): readonly KernelStoreRecord[] {
  return routeRecognizerProductRecords(store, {
    local,
    evidenceHandle,
    provenanceHandle,
    productHandle: endpoint.productHandle,
    identityHandle: endpoint.identityHandle,
    productKindKey: KernelVocabulary.RouteRecognizer.Endpoint.key,
    ownerHandle: routeConfigContext.recognizer.identityHandle ?? routeConfigContext.identityHandle,
    sourceAddressHandle: endpoint.sourceAddressHandle,
    localName: endpoint.path,
    evidenceKind: EvidenceKind.ConfigurationFlow,
    evidenceRoles: [EvidenceRole.Configuration],
    evidenceSummary: summary,
  });
}

class RouteRecognizerStateGraphEmission {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly states: readonly StateModel[],
  ) {}
}

class RouteRecognizerStateGraphBuilder {
  private readonly states: MutableRouteRecognizerState[] = [];
  private readonly statesByTransition = new Map<string, MutableRouteRecognizerState>();
  private readonly root: MutableRouteRecognizerState;

  constructor(
    readonly store: KernelStore,
    readonly routeConfigContext: RouteConfigContextModel,
  ) {
    this.root = this.createState(
      null,
      RouteRecognizerStateKind.Separator,
      null,
      null,
      '',
      0,
      false,
      null,
    );
  }

  materialize(
    endpoints: readonly EndpointModel[],
    configurableRoutes: readonly ConfigurableRouteModel[],
  ): RouteRecognizerStateGraphEmission {
    const routesByIdentity = new Map(
      configurableRoutes.map((route) => [route.identityHandle, route] as const),
    );
    for (const endpoint of endpoints) {
      const configurableRoute = requiredConfigurableRouteForEndpoint(endpoint, routesByIdentity);
      this.addEndpoint(endpoint, configurableRoute.caseSensitive);
    }
    const states = this.states.map((state) => state.toModel(this.routeConfigContext.recognizer));
    return new RouteRecognizerStateGraphEmission(
      this.states.flatMap((mutable, index) =>
        stateRecords(this.store, this.routeConfigContext, states[index]!, mutable)
      ),
      states,
    );
  }

  private addEndpoint(endpoint: EndpointModel, caseSensitive: boolean): void {
    const parse = parseConfigurableRoutePath(endpoint.path, caseSensitive);
    let state = this.root;
    for (const segment of parse.segments) {
      state = this.appendSeparator(state, endpoint.sourceAddressHandle);
      switch (segment.segmentKind) {
        case RouteRecognizerSegmentKind.Static:
          state = this.appendStaticSegment(state, segment, endpoint.sourceAddressHandle);
          break;
        case RouteRecognizerSegmentKind.Dynamic:
          state = this.appendDynamicSegment(state, segment, endpoint.sourceAddressHandle);
          break;
        case RouteRecognizerSegmentKind.Star:
        case RouteRecognizerSegmentKind.Residue:
          state = this.appendStarSegment(state, segment, endpoint.sourceAddressHandle);
          break;
      }
    }
    this.setEndpoint(state, endpoint.toReference());
  }

  private appendSeparator(
    previous: MutableRouteRecognizerState,
    sourceAddressHandle: RouteConfigModel['sourceAddressHandle'],
  ): MutableRouteRecognizerState {
    return this.append(
      previous,
      'separator',
      RouteRecognizerStateKind.Separator,
      null,
      null,
      '/',
      previous.length,
      false,
      sourceAddressHandle,
    );
  }

  private appendStaticSegment(
    previous: MutableRouteRecognizerState,
    segment: StaticSegmentModel,
    sourceAddressHandle: RouteConfigModel['sourceAddressHandle'],
  ): MutableRouteRecognizerState {
    let state = previous;
    for (const ch of segment.value) {
      state = this.append(
        state,
        `static:${segment.value}:${segment.caseSensitive}`,
        RouteRecognizerStateKind.Static,
        segment.value,
        null,
        segment.caseSensitive ? ch : ch.toUpperCase() + ch.toLowerCase(),
        state.length + 1,
        false,
        sourceAddressHandle,
      );
    }
    return state;
  }

  private appendDynamicSegment(
    previous: MutableRouteRecognizerState,
    segment: DynamicSegmentModel,
    sourceAddressHandle: RouteConfigModel['sourceAddressHandle'],
  ): MutableRouteRecognizerState {
    return this.append(
      previous,
      `dynamic:${segment.name}:${segment.optional}`,
      RouteRecognizerStateKind.Dynamic,
      segment.name,
      segment.pattern,
      '/',
      previous.length + 1,
      segment.optional,
      sourceAddressHandle,
      segment.pattern != null,
    );
  }

  private appendStarSegment(
    previous: MutableRouteRecognizerState,
    segment: StarSegmentModel,
    sourceAddressHandle: RouteConfigModel['sourceAddressHandle'],
  ): MutableRouteRecognizerState {
    return this.append(
      previous,
      `${segment.segmentKind}:${segment.name}`,
      segment.segmentKind === RouteRecognizerSegmentKind.Residue
        ? RouteRecognizerStateKind.Residue
        : RouteRecognizerStateKind.Star,
      segment.name,
      null,
      '',
      previous.length + 1,
      false,
      sourceAddressHandle,
    );
  }

  private append(
    previous: MutableRouteRecognizerState,
    segmentKey: string,
    stateKind: RouteRecognizerStateKind,
    segmentName: string | null,
    pattern: string | null,
    value: string,
    length: number,
    isOptional: boolean,
    sourceAddressHandle: RouteConfigModel['sourceAddressHandle'],
    isConstrained: boolean = false,
  ): MutableRouteRecognizerState {
    const transitionKey = `${previous.identityHandle}\0${segmentKey}\0${value}`;
    const existing = this.statesByTransition.get(transitionKey);
    if (existing != null) {
      return existing;
    }
    const state = this.createState(
      previous,
      stateKind,
      segmentName,
      pattern,
      value,
      length,
      isOptional,
      sourceAddressHandle,
      isConstrained,
    );
    previous.nextStates.push(state);
    this.statesByTransition.set(transitionKey, state);
    return state;
  }

  private createState(
    previous: MutableRouteRecognizerState | null,
    stateKind: RouteRecognizerStateKind,
    segmentName: string | null,
    pattern: string | null,
    value: string,
    length: number,
    isOptional: boolean,
    sourceAddressHandle: RouteConfigModel['sourceAddressHandle'],
    isConstrained: boolean = false,
  ): MutableRouteRecognizerState {
    const local = `${this.routeConfigContext.recognizer.identityHandle}:state:${this.states.length}`;
    const state = new MutableRouteRecognizerState(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      previous,
      stateKind,
      segmentName,
      pattern,
      value,
      length,
      isOptional,
      isConstrained,
      sourceAddressHandle,
      this.store.handles.provenance(local),
      this.store.handles.evidence(local),
      local,
    );
    this.states.push(state);
    return state;
  }

  private setEndpoint(
    state: MutableRouteRecognizerState,
    endpoint: RouteRecognizerReference,
  ): void {
    if (state.endpoint == null) {
      state.endpoint = endpoint;
    }
    if (!state.isOptional || state.previous == null) {
      return;
    }
    this.setEndpoint(state.previous, endpoint);
    if (state.previous.isSeparator && state.previous.previous != null) {
      this.setEndpoint(state.previous.previous, endpoint);
    }
  }
}

class MutableRouteRecognizerState {
  endpoint: RouteRecognizerReference | null = null;
  readonly nextStates: MutableRouteRecognizerState[] = [];

  constructor(
    readonly productHandle: StateModel['productHandle'],
    readonly identityHandle: StateModel['identityHandle'],
    readonly previous: MutableRouteRecognizerState | null,
    readonly stateKind: RouteRecognizerStateKind,
    readonly segmentName: string | null,
    readonly pattern: string | null,
    readonly value: string,
    readonly length: number,
    readonly isOptional: boolean,
    readonly isConstrained: boolean,
    readonly sourceAddressHandle: StateModel['sourceAddressHandle'],
    readonly provenanceHandle: ProvenanceHandle,
    readonly evidenceHandle: EvidenceHandle,
    readonly local: string,
  ) {}

  get isSeparator(): boolean {
    return this.stateKind === RouteRecognizerStateKind.Separator;
  }

  get isDynamic(): boolean {
    return this.stateKind === RouteRecognizerStateKind.Dynamic
      || this.stateKind === RouteRecognizerStateKind.Star
      || this.stateKind === RouteRecognizerStateKind.Residue;
  }

  toReference(): RouteRecognizerReference {
    return new RouteRecognizerReference(
      this.productHandle,
      this.identityHandle,
      RouteRecognizerModelKind.State,
      this.sourceAddressHandle,
      `${this.stateKind}:${this.value}:${this.length}`,
    );
  }

  toModel(recognizer: RouteRecognizerReference): StateModel {
    return new StateModel(
      this.productHandle,
      this.identityHandle,
      recognizer,
      this.previous?.toReference() ?? null,
      this.nextStates.map((state) => state.toReference()),
      this.endpoint,
      this.stateKind,
      this.segmentName,
      this.pattern,
      this.value,
      this.length,
      this.isSeparator,
      this.isDynamic,
      this.isOptional,
      this.isConstrained,
      this.sourceAddressHandle,
      stateFieldProvenance(this.provenanceHandle, this),
    );
  }
}

function requiredConfigurableRouteForEndpoint(
  endpoint: EndpointModel,
  routesByIdentity: ReadonlyMap<ConfigurableRouteModel['identityHandle'], ConfigurableRouteModel>,
): ConfigurableRouteModel {
  const identityHandle = endpoint.configurableRoute.identityHandle;
  if (identityHandle == null) {
    throw new Error(`Route endpoint '${endpoint.identityHandle}' is missing its ConfigurableRoute identity reference.`);
  }
  const configurableRoute = routesByIdentity.get(identityHandle);
  if (configurableRoute == null) {
    throw new Error(`Route endpoint '${endpoint.identityHandle}' references unmaterialized ConfigurableRoute '${identityHandle}'.`);
  }
  return configurableRoute;
}

function stateRecords(
  store: KernelStore,
  routeConfigContext: RouteConfigContextModel,
  state: StateModel,
  mutable: MutableRouteRecognizerState,
): readonly KernelStoreRecord[] {
  return routeRecognizerProductRecords(store, {
    local: mutable.local,
    evidenceHandle: mutable.evidenceHandle,
    provenanceHandle: mutable.provenanceHandle,
    productHandle: state.productHandle,
    identityHandle: state.identityHandle,
    productKindKey: KernelVocabulary.RouteRecognizer.State.key,
    ownerHandle: routeConfigContext.recognizer.identityHandle ?? routeConfigContext.identityHandle,
    sourceAddressHandle: state.sourceAddressHandle,
    localName: state.toReference().localName,
    evidenceKind: EvidenceKind.ConfigurationFlow,
    evidenceRoles: [EvidenceRole.Configuration],
    evidenceSummary: 'RouteRecognizer.$add materialized a State node while appending a route endpoint path.',
  });
}

interface ConfigurableRouteParse {
  readonly segments: readonly RouteRecognizerSegmentModel[];
  readonly parameters: readonly ParameterModel[];
}

function parseConfigurableRoutePath(
  path: string,
  caseSensitive: boolean,
): ConfigurableRouteParse {
  const parts = path === '' ? [''] : path.split('/').filter(isNotEmpty);
  const segments: RouteRecognizerSegmentModel[] = [];
  const parameters: ParameterModel[] = [];

  for (const part of parts) {
    if (part.startsWith(':')) {
      const match = ROUTE_PARAMETER_PATTERN.exec(part);
      ROUTE_PARAMETER_PATTERN.lastIndex = 0;
      const name = match?.groups?.name ?? part.slice(1);
      const optional = match?.groups?.optional === '?';
      const pattern = match?.groups?.constraint ?? null;
      if (name !== RESIDUE) {
        parameters.push(new ParameterModel(name, optional, false, pattern));
      }
      segments.push(new DynamicSegmentModel(
        part,
        name,
        optional,
        pattern,
      ));
      continue;
    }

    if (part.startsWith('*')) {
      const name = part.slice(1);
      const segmentKind = name === RESIDUE
        ? RouteRecognizerSegmentKind.Residue
        : RouteRecognizerSegmentKind.Star;
      parameters.push(new ParameterModel(name, true, true, null));
      segments.push(new StarSegmentModel(
        segmentKind,
        part,
        name,
      ));
      continue;
    }

    segments.push(new StaticSegmentModel(
      part,
      part,
      caseSensitive,
    ));
  }

  return { segments, parameters };
}

function isNotEmpty(segment: string): boolean {
  return segment.length > 0;
}

function shouldAddResidualEndpoint(parameters: readonly ParameterModel[]): boolean {
  return parameters[parameters.length - 1]?.isStar !== true;
}

function configurableRouteFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  parse: ConfigurableRouteParse,
  parentPath: string | null,
): readonly FieldProvenance<ConfigurableRouteField>[] {
  return compactFieldProvenance<ConfigurableRouteField>([
    new FieldProvenance('routeConfig', provenanceHandle),
    parentPath == null ? null : new FieldProvenance('parentPath', provenanceHandle),
    new FieldProvenance('path', provenanceHandle),
    new FieldProvenance('caseSensitive', provenanceHandle),
    parse.segments.length === 0 ? null : new FieldProvenance('segments', provenanceHandle),
    parse.parameters.length === 0 ? null : new FieldProvenance('parameters', provenanceHandle),
    new FieldProvenance('source', provenanceHandle),
  ]);
}

function endpointFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  parameters: readonly ParameterModel[],
  isResidual: boolean,
  hasResidualEndpoint: boolean,
): readonly FieldProvenance<RouteRecognizerField>[] {
  return compactFieldProvenance<RouteRecognizerField>([
    new FieldProvenance('configurableRoute', provenanceHandle),
    new FieldProvenance('path', provenanceHandle),
    new FieldProvenance('isResidual', provenanceHandle),
    parameters.length === 0 ? null : new FieldProvenance('parameters', provenanceHandle),
    isResidual ? new FieldProvenance('primaryEndpoint', provenanceHandle) : null,
    hasResidualEndpoint ? new FieldProvenance('residualEndpoint', provenanceHandle) : null,
    new FieldProvenance('source', provenanceHandle),
  ]);
}

function stateFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  state: MutableRouteRecognizerState,
): readonly FieldProvenance<RouteRecognizerField>[] {
  return compactFieldProvenance<RouteRecognizerField>([
    state.previous == null ? null : new FieldProvenance('previousState', provenanceHandle),
    state.nextStates.length === 0 ? null : new FieldProvenance('nextStates', provenanceHandle),
    state.endpoint == null ? null : new FieldProvenance('endpoint', provenanceHandle),
    new FieldProvenance('stateKind', provenanceHandle),
    state.segmentName == null ? null : new FieldProvenance('segmentName', provenanceHandle),
    state.pattern == null ? null : new FieldProvenance('pattern', provenanceHandle),
    new FieldProvenance('value', provenanceHandle),
    new FieldProvenance('length', provenanceHandle),
    new FieldProvenance('isSeparator', provenanceHandle),
    new FieldProvenance('isDynamic', provenanceHandle),
    new FieldProvenance('isOptional', provenanceHandle),
    new FieldProvenance('isConstrained', provenanceHandle),
    new FieldProvenance('source', provenanceHandle),
  ]);
}
