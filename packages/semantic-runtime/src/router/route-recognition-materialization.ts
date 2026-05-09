import type { ProjectBootFrame } from '../boot/frames.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type { IdentityHandle, ProvenanceHandle } from '../kernel/handles.js';
import { RouteRecognizerIdentity } from '../kernel/identity.js';
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
  NavigationInstructionKind,
  RecognizedRouteModel,
  RouteConfigKind,
  RouteRecognizerModelKind,
  RouteRecognizerStateKind,
  type ConfigurableRouteModel,
  type EndpointModel,
  type RouteConfigModel,
  type RouteConfigContextModel,
  type RouteContextModel,
  type RouteRecognizerField,
  type RouteRecognizerReference,
  type StateModel,
  type TypedNavigationInstructionModel,
  type ViewportInstructionModel,
  type ViewportInstructionTreeModel,
} from './model.js';
import type { RouteConfigContextMaterializationProjectResult } from './route-context-materialization.js';
import type { RouteInstructionMaterializationProjectResult } from './route-instruction-materialization.js';
import type { RouteRecognizerMaterializationProjectResult } from './route-recognizer-materialization.js';
import type { RouteRuntimeTopologyProjectResult } from './route-runtime-topology.js';

const RESIDUE = '$$residue';

interface RouteRecognitionEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly recognizedRoutes: readonly RecognizedRouteModel[];
}

interface RecognizerGraph {
  readonly recognizer: RouteRecognizerReference;
  readonly root: StateModel;
  readonly statesByIdentity: ReadonlyMap<StateModel['identityHandle'], StateModel>;
  readonly endpointsByIdentity: ReadonlyMap<EndpointModel['identityHandle'], EndpointModel>;
  readonly configurableRoutesByIdentity: ReadonlyMap<ConfigurableRouteModel['identityHandle'], ConfigurableRouteModel>;
}

interface RecognizedRouteDraft {
  readonly endpoint: EndpointModel;
  readonly path: string;
  readonly residue: string | null;
  readonly parameters: ReadonlyMap<string, string | undefined>;
  readonly parameterCount: number;
  readonly redirectDepth: number;
}

/** RecognizedRoute products from static ViewportInstruction paths, before RouteNode transition compilation. */
export class RouteRecognitionMaterializationProjectResult {
  constructor(
    readonly project: ProjectBootFrame,
    readonly recognizedRoutes: readonly RecognizedRouteModel[],
  ) {}

  readRecognizedRoutes(): readonly RecognizedRouteModel[] {
    return this.recognizedRoutes;
  }
}

/** Walk route-recognizer state graphs for static ViewportInstruction path strings. */
export class RouteRecognitionMaterializationProjectPass {
  materializeAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    routeConfigContexts: RouteConfigContextMaterializationProjectResult,
    routeRuntime: RouteRuntimeTopologyProjectResult,
    routeRecognizer: RouteRecognizerMaterializationProjectResult,
    routeInstructions: RouteInstructionMaterializationProjectResult,
  ): RouteRecognitionMaterializationProjectResult {
    const routeContextsByIdentity = new Map(
      routeRuntime.readRouteContexts().map((routeContext) => [routeContext.identityHandle, routeContext] as const),
    );
    const routeConfigContextsByIdentity = new Map(
      routeConfigContexts.readRouteConfigContexts().map((routeConfigContext) => [routeConfigContext.identityHandle, routeConfigContext] as const),
    );
    const routeConfigsByIdentity = new Map(
      routeConfigContexts.readRouteConfigs().map((routeConfig) => [routeConfig.identityHandle, routeConfig] as const),
    );
    const viewportInstructionsByIdentity = new Map(
      routeInstructions.readViewportInstructions().map((instruction) => [instruction.identityHandle, instruction] as const),
    );
    const typedInstructionsByIdentity = new Map(
      routeInstructions.readTypedNavigationInstructions().map((instruction) => [instruction.identityHandle, instruction] as const),
    );
    const recognizerGraphs = recognizerGraphsByIdentity(routeRecognizer);

    const emissions = routeInstructions.readViewportInstructionTrees().flatMap((tree) =>
      this.materializeInstructionTreeRecognitions(
        store,
        tree,
        routeContextsByIdentity,
        routeConfigContextsByIdentity,
        viewportInstructionsByIdentity,
        typedInstructionsByIdentity,
        recognizerGraphs,
        routeConfigsByIdentity,
      )
    );
    const records = emissions.flatMap((emission) => emission.records);
    if (records.length > 0) {
      store.commit(new KernelStoreBatch(records, `router-recognition:${project.projectKey}`));
    }
    return new RouteRecognitionMaterializationProjectResult(
      project,
      emissions.flatMap((emission) => emission.recognizedRoutes),
    );
  }

  private materializeInstructionTreeRecognitions(
    store: KernelStore,
    tree: ViewportInstructionTreeModel,
    routeContextsByIdentity: ReadonlyMap<RouteContextModel['identityHandle'], RouteContextModel>,
    routeConfigContextsByIdentity: ReadonlyMap<RouteConfigContextModel['identityHandle'], RouteConfigContextModel>,
    viewportInstructionsByIdentity: ReadonlyMap<ViewportInstructionModel['identityHandle'], ViewportInstructionModel>,
    typedInstructionsByIdentity: ReadonlyMap<TypedNavigationInstructionModel['identityHandle'], TypedNavigationInstructionModel>,
    recognizerGraphs: ReadonlyMap<string, RecognizerGraph>,
    routeConfigsByIdentity: ReadonlyMap<RouteConfigModel['identityHandle'], RouteConfigModel>,
  ): readonly RouteRecognitionEmission[] {
    const routeContext = routeContextForInstructionTree(tree, routeContextsByIdentity);
    const routeConfigContext = routeConfigContextForRouteContext(routeContext, routeConfigContextsByIdentity);
    const recognizerIdentity = routeConfigContext?.recognizer.identityHandle ?? null;
    const graph = recognizerIdentity == null ? null : recognizerGraphs.get(recognizerIdentity) ?? null;
    if (graph == null) {
      return [];
    }

    return tree.instructions.flatMap((instruction, index) => {
      const viewportInstruction = instruction.identityHandle == null
        ? null
        : viewportInstructionsByIdentity.get(instruction.identityHandle) ?? null;
      if (viewportInstruction == null) {
        return [];
      }
      const path = collapsedStringPath(
        viewportInstruction,
        viewportInstructionsByIdentity,
        typedInstructionsByIdentity,
      );
      if (path == null) {
        return [];
      }
      const recognizedRoutes = recognizePath(graph, path);
      if (recognizedRoutes == null) {
        return [];
      }
      const expandedRoutes = expandRedirectTargets(graph, recognizedRoutes, routeConfigsByIdentity);
      return [
        this.materializeRecognizedRoutes(
          store,
          graph,
          tree,
          viewportInstruction,
          expandedRoutes,
          index,
        ),
      ];
    });
  }

  private materializeRecognizedRoutes(
    store: KernelStore,
    graph: RecognizerGraph,
    tree: ViewportInstructionTreeModel,
    viewportInstruction: ViewportInstructionModel,
    routes: readonly RecognizedRouteDraft[],
    instructionIndex: number,
  ): RouteRecognitionEmission {
    const recognizedRoutes = routes.map((route, routeIndex) =>
      recognizedRouteModel(
        store,
        graph,
        tree,
        viewportInstruction,
        route,
        instructionIndex,
        routeIndex,
      )
    );
    return {
      records: recognizedRoutes.flatMap((route, routeIndex) =>
        recognizedRouteRecords(
          store,
          graph,
          tree,
          viewportInstruction,
          route,
          instructionIndex,
          routeIndex,
        )
      ),
      recognizedRoutes,
    };
  }
}

function recognizerGraphsByIdentity(
  result: RouteRecognizerMaterializationProjectResult,
): ReadonlyMap<string, RecognizerGraph> {
  const configurableRoutesByIdentity = new Map(
    result.readConfigurableRoutes().map((route) => [route.identityHandle, route] as const),
  );
  const endpointsByIdentity = new Map(
    result.readEndpoints().map((endpoint) => [endpoint.identityHandle, endpoint] as const),
  );
  const statesByRecognizer = new Map<string, StateModel[]>();
  for (const state of result.readStates()) {
    const recognizerIdentity = state.recognizer.identityHandle;
    if (recognizerIdentity == null) {
      continue;
    }
    const states = statesByRecognizer.get(recognizerIdentity);
    if (states == null) {
      statesByRecognizer.set(recognizerIdentity, [state]);
    } else {
      states.push(state);
    }
  }

  const graphs = new Map<string, RecognizerGraph>();
  for (const [recognizerIdentity, states] of statesByRecognizer) {
    const root = states.find((state) => state.previousState == null);
    if (root == null) {
      continue;
    }
    graphs.set(recognizerIdentity, {
      recognizer: root.recognizer,
      root,
      statesByIdentity: new Map(states.map((state) => [state.identityHandle, state] as const)),
      endpointsByIdentity,
      configurableRoutesByIdentity,
    });
  }
  return graphs;
}

function routeContextForInstructionTree(
  tree: ViewportInstructionTreeModel,
  routeContextsByIdentity: ReadonlyMap<RouteContextModel['identityHandle'], RouteContextModel>,
): RouteContextModel | null {
  const identityHandle = tree.routeContext?.identityHandle ?? null;
  return identityHandle == null ? null : routeContextsByIdentity.get(identityHandle) ?? null;
}

function routeConfigContextForRouteContext(
  routeContext: RouteContextModel | null,
  routeConfigContextsByIdentity: ReadonlyMap<RouteConfigContextModel['identityHandle'], RouteConfigContextModel>,
): RouteConfigContextModel | null {
  const identityHandle = routeContext?.routeConfigContext?.identityHandle ?? null;
  return identityHandle == null ? null : routeConfigContextsByIdentity.get(identityHandle) ?? null;
}

function collapsedStringPath(
  viewportInstruction: ViewportInstructionModel,
  viewportInstructionsByIdentity: ReadonlyMap<ViewportInstructionModel['identityHandle'], ViewportInstructionModel>,
  typedInstructionsByIdentity: ReadonlyMap<TypedNavigationInstructionModel['identityHandle'], TypedNavigationInstructionModel>,
): string | null {
  const component = stringComponent(viewportInstruction, typedInstructionsByIdentity);
  if (component == null) {
    return null;
  }
  let path = component;
  let current = viewportInstruction;
  while (current.children.length === 1) {
    const childRef = current.children[0]!;
    const child = childRef.identityHandle == null
      ? null
      : viewportInstructionsByIdentity.get(childRef.identityHandle) ?? null;
    if (child == null) {
      break;
    }
    const childComponent = stringComponent(child, typedInstructionsByIdentity);
    if (childComponent == null) {
      break;
    }
    path = `${path}/${childComponent}`;
    current = child;
  }
  return path;
}

function stringComponent(
  viewportInstruction: ViewportInstructionModel,
  typedInstructionsByIdentity: ReadonlyMap<TypedNavigationInstructionModel['identityHandle'], TypedNavigationInstructionModel>,
): string | null {
  const componentIdentity = viewportInstruction.component?.identityHandle ?? null;
  const typedInstruction = componentIdentity == null
    ? null
    : typedInstructionsByIdentity.get(componentIdentity) ?? null;
  return typedInstruction?.instructionKind === NavigationInstructionKind.String
    ? typedInstruction.value ?? ''
    : null;
}

function recognizePath(
  graph: RecognizerGraph,
  path: string,
): readonly RecognizedRouteDraft[] | null {
  let normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  const result = new RecognizeResult(graph);
  for (let i = 0; i < normalized.length; ++i) {
    result.advance(normalized.charAt(i));
    if (result.isEmpty) {
      return null;
    }
  }
  return result.getSolution()?.routes() ?? null;
}

class RecognizeResult {
  private readonly candidates: Candidate[] = [];

  constructor(
    readonly graph: RecognizerGraph,
  ) {
    this.candidates.push(new Candidate([''], [graph.root], [], this));
  }

  get isEmpty(): boolean {
    return this.candidates.length === 0;
  }

  add(candidate: Candidate): void {
    this.candidates.push(candidate);
  }

  remove(candidate: Candidate): void {
    this.candidates.splice(this.candidates.indexOf(candidate), 1);
  }

  advance(ch: string): void {
    for (const candidate of this.candidates.slice()) {
      candidate.advance(ch);
    }
  }

  getSolution(): Candidate | null {
    const candidates = this.candidates.filter((candidate) => candidate.hasEndpoint && candidate.finalize());
    if (candidates.length === 0) {
      return null;
    }
    candidates.sort((left, right) => left.compareTo(right));
    return candidates[0]!;
  }
}

class Candidate {
  private endpoint: EndpointModel | null;
  private recognizedRoutes: readonly RecognizedRouteDraft[] | null = null;
  private isConstrained = false;
  private satisfiesConstraints: boolean | null = null;

  constructor(
    private readonly chars: string[],
    private readonly states: StateModel[],
    private readonly skippedStates: StateModel[],
    private readonly result: RecognizeResult,
  ) {
    this.endpoint = endpointForState(states[states.length - 1]!, result.graph);
  }

  get hasEndpoint(): boolean {
    return this.endpoint != null;
  }

  advance(ch: string): void {
    const state = this.states[this.states.length - 1]!;
    const stateToAdd: { value: StateModel | null } = { value: null };
    let matchCount = 0;

    const process = (nextState: StateModel, skippedState: StateModel | null): void => {
      if (stateMatches(nextState, ch)) {
        if (++matchCount === 1) {
          stateToAdd.value = nextState;
        } else {
          this.result.add(new Candidate(
            this.chars.concat(ch),
            this.states.concat(nextState),
            skippedState == null ? this.skippedStates : this.skippedStates.concat(skippedState),
            this.result,
          ));
        }
      }

      if (state.isSeparator && nextState.isOptional && nextState.nextStates.length > 0) {
        const separator = nextState.nextStates.length === 1
          ? stateForReference(nextState.nextStates[0]!, this.result.graph)
          : null;
        if (separator?.isSeparator === true) {
          for (const optionalNext of nextStatesFor(separator, this.result.graph)) {
            process(optionalNext, nextState);
          }
        }
      }
    };

    if (state.isDynamic) {
      process(state, null);
    }
    for (const nextState of nextStatesFor(state, this.result.graph)) {
      process(nextState, null);
    }

    if (stateToAdd.value != null) {
      this.states.push(stateToAdd.value);
      this.chars.push(ch);
      this.isConstrained = this.isConstrained
        || stateToAdd.value.isDynamic && stateToAdd.value.isConstrained;
      const endpoint = endpointForState(stateToAdd.value, this.result.graph);
      if (endpoint != null) {
        this.endpoint = endpoint;
      }
    }

    if (matchCount === 0) {
      this.result.remove(this);
    }
  }

  finalize(): boolean {
    collectSkippedStates(this.skippedStates, this.states[this.states.length - 1]!, this.result.graph);
    if (!this.isConstrained) {
      return true;
    }
    this.routes();
    return this.satisfiesConstraints === true;
  }

  routes(): readonly RecognizedRouteDraft[] | null {
    if (this.recognizedRoutes != null) {
      return this.recognizedRoutes;
    }

    this.satisfiesConstraints = true;
    const routes: RecognizedRouteDraft[] = [];
    let currentRequirement: EndpointRequirement | null = null;

    for (let i = this.states.length - 1; i >= 0; --i) {
      const state = this.states[i]!;
      const endpoint = endpointForState(state, this.result.graph);
      const createNewRoute = endpoint != null
        && (currentRequirement == null
          || currentRequirement.isDifferentEndpoint(endpoint)
          && currentRequirement.isFulfilled());
      if (createNewRoute) {
        if (currentRequirement != null) {
          routes.unshift(currentRequirement.toRecognizedRoute());
        }
        currentRequirement = new EndpointRequirement(endpoint, this.result.graph);
      }

      if (currentRequirement == null) {
        continue;
      }
      this.satisfiesConstraints = this.satisfiesConstraints
        && currentRequirement.consume(state, this.chars[i]!, this.states[i - 1]);
    }

    if (currentRequirement != null && currentRequirement.isDifferentRecognizedRoute(routes[0])) {
      routes.unshift(currentRequirement.toRecognizedRoute());
    }
    this.recognizedRoutes = routes.length > 1 && routes[0]?.path === ''
      ? routes.slice(1)
      : routes;
    return this.satisfiesConstraints ? this.recognizedRoutes : null;
  }

  compareTo(other: Candidate): -1 | 1 | 0 {
    const leftStates = this.states;
    const rightStates = other.states;
    for (let leftIndex = 0, rightIndex = 0, end = Math.max(leftStates.length, rightStates.length); leftIndex < end; ++leftIndex) {
      let leftState = leftStates[leftIndex];
      if (leftState == null) {
        return 1;
      }
      let rightState = rightStates[rightIndex];
      if (rightState == null) {
        return -1;
      }
      let leftRank = segmentRank(leftState);
      let rightRank = segmentRank(rightState);
      if (leftRank == null) {
        if (rightRank == null) {
          ++rightIndex;
          continue;
        }
        leftState = leftStates[++leftIndex];
        if (leftState == null) {
          return 1;
        }
        leftRank = segmentRank(leftState)!;
      } else if (rightRank == null) {
        rightState = rightStates[++rightIndex];
        if (rightState == null) {
          return -1;
        }
        rightRank = segmentRank(rightState)!;
      }
      if (leftRank < rightRank) {
        return 1;
      }
      if (leftRank > rightRank) {
        return -1;
      }
      ++rightIndex;
    }

    if (this.skippedStates.length < other.skippedStates.length) {
      return 1;
    }
    if (this.skippedStates.length > other.skippedStates.length) {
      return -1;
    }
    for (let i = 0; i < this.skippedStates.length; ++i) {
      const left = this.skippedStates[i]!;
      const right = other.skippedStates[i]!;
      if (left.length < right.length) {
        return 1;
      }
      if (left.length > right.length) {
        return -1;
      }
    }
    return 0;
  }
}

class EndpointRequirement {
  private readonly parameters = new Map<string, { value: string | undefined; required: boolean; fulfilled: boolean }>();
  private readonly staticSegments: { name: string; accumulated: string; fulfilled: boolean }[] = [];
  private readonly routeConfigIdentity: IdentityHandle;
  private path = '';

  constructor(
    readonly endpoint: EndpointModel,
    readonly graph: RecognizerGraph,
  ) {
    this.routeConfigIdentity = routeConfigIdentityForEndpoint(endpoint, graph);
    for (const parameter of endpoint.parameters) {
      this.parameters.set(parameter.name, {
        value: undefined,
        required: !parameter.isOptional,
        fulfilled: false,
      });
    }
    for (const part of endpoint.path.split('/').filter((part) => part.length > 0 && !part.startsWith(':') && !part.startsWith('*'))) {
      this.staticSegments.push({
        name: part,
        accumulated: '',
        fulfilled: false,
      });
    }
  }

  consume(
    state: StateModel,
    ch: string,
    previousState: StateModel | undefined,
  ): boolean {
    this.path = ch + this.path;

    if (state.isDynamic) {
      const name = state.segmentName;
      const parameter = name == null ? null : this.parameters.get(name) ?? null;
      if (parameter != null) {
        if (parameter.value === undefined) {
          parameter.value = ch;
          parameter.fulfilled = parameter.required;
        } else {
          parameter.value = ch + parameter.value;
        }
      }
      const checkConstraint = state.isConstrained
        && previousState?.segmentName !== state.segmentName;
      return !checkConstraint || satisfiesPattern(state.pattern, parameter?.value ?? '');
    }

    if (this.staticSegments.length > 0 && ch !== '' && ch !== '/') {
      const segment = [...this.staticSegments].reverse().find((candidate) => !candidate.fulfilled);
      if (segment != null) {
        segment.accumulated = ch + segment.accumulated;
        segment.fulfilled = segment.name.toLowerCase() === segment.accumulated.toLowerCase();
      }
    }
    return true;
  }

  isFulfilled(): boolean {
    for (const parameter of this.parameters.values()) {
      if (parameter.required && !parameter.fulfilled) {
        return false;
      }
    }
    return this.staticSegments.length === 0 || this.staticSegments[0]!.fulfilled;
  }

  isDifferentRecognizedRoute(value: RecognizedRouteDraft | null | undefined): boolean {
    return this.isDifferentEndpoint(value?.endpoint);
  }

  isDifferentEndpoint(value: EndpointModel | null | undefined): boolean {
    return value == null || this.routeConfigIdentity !== routeConfigIdentityForEndpoint(value, this.graph);
  }

  toRecognizedRoute(): RecognizedRouteDraft {
    const params = new Map<string, string | undefined>();
    for (const [key, parameter] of this.parameters) {
      params.set(key, parameter.value);
    }
    const residue = params.get(RESIDUE) ?? null;
    let path = this.path;
    if ((residue?.length ?? 0) > 0 && path.endsWith(residue!)) {
      path = path.slice(0, -residue!.length);
    }
    path = path.startsWith('/') ? path.slice(1) : path;
    path = path.endsWith('/') ? path.slice(0, -1) : path;
    return {
      endpoint: this.endpoint,
      path,
      residue,
      parameters: params,
      parameterCount: [...params].filter(([key, value]) => key !== RESIDUE && value != null).length,
      redirectDepth: 0,
    };
  }
}

function expandRedirectTargets(
  graph: RecognizerGraph,
  routes: readonly RecognizedRouteDraft[],
  routeConfigsByIdentity: ReadonlyMap<RouteConfigModel['identityHandle'], RouteConfigModel>,
): readonly RecognizedRouteDraft[] {
  const expanded: RecognizedRouteDraft[] = [];
  for (const route of routes) {
    expanded.push(route);
    expanded.push(...redirectTargetsFor(graph, route, routeConfigsByIdentity, new Set(), 1));
  }
  return expanded;
}

function redirectTargetsFor(
  graph: RecognizerGraph,
  route: RecognizedRouteDraft,
  routeConfigsByIdentity: ReadonlyMap<RouteConfigModel['identityHandle'], RouteConfigModel>,
  seenRedirects: Set<string>,
  depth: number,
): readonly RecognizedRouteDraft[] {
  const routeConfig = routeConfigForEndpoint(route.endpoint, graph, routeConfigsByIdentity);
  if (routeConfig?.routeKind !== RouteConfigKind.Redirect || routeConfig.redirectTo == null) {
    return [];
  }
  if (seenRedirects.has(routeConfig.identityHandle)) {
    return [];
  }
  seenRedirects.add(routeConfig.identityHandle);
  const redirectPath = redirectPathFor(routeConfig.redirectTo, route.parameters);
  const recognized = recognizePath(graph, redirectPath);
  if (recognized == null) {
    return [];
  }
  const targets = recognized.map((target) => ({
    ...target,
    redirectDepth: depth,
  }));
  return targets.flatMap((target) => [
    target,
    ...redirectTargetsFor(graph, target, routeConfigsByIdentity, seenRedirects, depth + 1),
  ]);
}

function routeConfigForEndpoint(
  endpoint: EndpointModel,
  graph: RecognizerGraph,
  routeConfigsByIdentity: ReadonlyMap<RouteConfigModel['identityHandle'], RouteConfigModel>,
): RouteConfigModel | null {
  const configurableRouteIdentity = endpoint.configurableRoute.identityHandle;
  const configurableRoute = configurableRouteIdentity == null
    ? null
    : graph.configurableRoutesByIdentity.get(configurableRouteIdentity) ?? null;
  const routeConfigIdentity = configurableRoute?.routeConfig.identityHandle ?? null;
  return routeConfigIdentity == null
    ? null
    : routeConfigsByIdentity.get(routeConfigIdentity) ?? null;
}

function redirectPathFor(
  redirectTo: string,
  parameters: ReadonlyMap<string, string | undefined>,
): string {
  return redirectTo
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        return parameters.get(parameterName(segment.slice(1))) ?? '';
      }
      if (segment.startsWith('*')) {
        return parameters.get(parameterName(segment.slice(1))) ?? '';
      }
      return segment;
    })
    .filter((segment) => segment.length > 0)
    .join('/');
}

function parameterName(segment: string): string {
  const constraintIndex = segment.indexOf('{{');
  const optionalIndex = segment.indexOf('?');
  const end = [constraintIndex, optionalIndex]
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0] ?? segment.length;
  return segment.slice(0, end);
}

function stateMatches(state: StateModel, ch: string): boolean {
  switch (state.stateKind) {
    case RouteRecognizerStateKind.Dynamic:
      return !state.value.includes(ch);
    case RouteRecognizerStateKind.Star:
    case RouteRecognizerStateKind.Residue:
      return true;
    case RouteRecognizerStateKind.Static:
    case RouteRecognizerStateKind.Separator:
      return state.value.includes(ch);
  }
}

function nextStatesFor(
  state: StateModel,
  graph: RecognizerGraph,
): readonly StateModel[] {
  return state.nextStates.flatMap((reference) => {
    const nextState = stateForReference(reference, graph);
    return nextState == null ? [] : [nextState];
  });
}

function stateForReference(
  reference: RouteRecognizerReference,
  graph: RecognizerGraph,
): StateModel | null {
  const identityHandle = reference.identityHandle;
  return identityHandle == null ? null : graph.statesByIdentity.get(identityHandle) ?? null;
}

function endpointForState(
  state: StateModel,
  graph: RecognizerGraph,
): EndpointModel | null {
  const identityHandle = state.endpoint?.identityHandle ?? null;
  return identityHandle == null ? null : graph.endpointsByIdentity.get(identityHandle) ?? null;
}

function routeConfigIdentityForEndpoint(
  endpoint: EndpointModel,
  graph: RecognizerGraph,
): IdentityHandle {
  const configurableRouteIdentity = endpoint.configurableRoute.identityHandle;
  if (configurableRouteIdentity == null) {
    throw new Error(`Endpoint '${endpoint.identityHandle}' is missing its ConfigurableRoute identity reference.`);
  }
  const configurableRoute = graph.configurableRoutesByIdentity.get(configurableRouteIdentity);
  const routeConfigIdentity = configurableRoute?.routeConfig.identityHandle ?? null;
  if (routeConfigIdentity == null) {
    throw new Error(`Endpoint '${endpoint.identityHandle}' references an unmaterialized ConfigurableRoute '${configurableRouteIdentity}'.`);
  }
  return routeConfigIdentity;
}

function collectSkippedStates(
  skippedStates: StateModel[],
  state: StateModel,
  graph: RecognizerGraph,
): void {
  const nextStates = nextStatesFor(state, graph);
  if (nextStates.length === 0) {
    return;
  }
  if (nextStates.length === 1 && nextStates[0]!.isSeparator) {
    collectSkippedStates(skippedStates, nextStates[0]!, graph);
    return;
  }
  for (const nextState of nextStates) {
    if (nextState.isOptional && nextState.endpoint != null) {
      skippedStates.push(nextState);
      for (const child of nextStatesFor(nextState, graph)) {
        collectSkippedStates(skippedStates, child, graph);
      }
      break;
    }
  }
}

function segmentRank(state: StateModel): number | null {
  switch (state.stateKind) {
    case RouteRecognizerStateKind.Residue:
      return 1;
    case RouteRecognizerStateKind.Star:
      return 2;
    case RouteRecognizerStateKind.Dynamic:
      return 3;
    case RouteRecognizerStateKind.Static:
      return 4;
    case RouteRecognizerStateKind.Separator:
      return null;
  }
}

function satisfiesPattern(pattern: string | null, value: string): boolean {
  if (pattern == null) {
    return true;
  }
  return new RegExp(pattern).test(value);
}

function recognizedRouteModel(
  store: KernelStore,
  graph: RecognizerGraph,
  tree: ViewportInstructionTreeModel,
  viewportInstruction: ViewportInstructionModel,
  route: RecognizedRouteDraft,
  instructionIndex: number,
  routeIndex: number,
): RecognizedRouteModel {
  const local = recognizedRouteLocal(tree, viewportInstruction, instructionIndex, routeIndex);
  const provenanceHandle = store.handles.provenance(local);
  return new RecognizedRouteModel(
    store.handles.product(local),
    store.handles.identity(local),
    graph.recognizer,
    route.endpoint.toReference(),
    viewportInstruction.toReference(),
    tree.toReference(),
    tree.routeContext,
    route.path,
    route.residue,
    route.parameterCount,
    route.redirectDepth,
    viewportInstruction.sourceAddressHandle,
    recognizedRouteFieldProvenance(provenanceHandle, route),
  );
}

function recognizedRouteRecords(
  store: KernelStore,
  graph: RecognizerGraph,
  tree: ViewportInstructionTreeModel,
  viewportInstruction: ViewportInstructionModel,
  route: RecognizedRouteModel,
  instructionIndex: number,
  routeIndex: number,
): readonly KernelStoreRecord[] {
  const local = recognizedRouteLocal(tree, viewportInstruction, instructionIndex, routeIndex);
  const evidenceHandle = store.handles.evidence(local);
  const provenanceHandle = store.handles.provenance(local);
  const ownerHandle = routeRecognizerOwnerHandle(graph);
  return [
    new EvidenceRecord(
      evidenceHandle,
      EvidenceKind.SemanticObservation,
      [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
      'RouteRecognizer.recognize walked a static ViewportInstruction path into a RecognizedRoute.',
      route.sourceAddressHandle,
    ),
    new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
    new RouteRecognizerIdentity(
      route.identityHandle,
      KernelVocabulary.RouteRecognizer.RecognizedRoute.key,
      ownerHandle,
      route.sourceAddressHandle,
      route.path,
    ),
    new MaterializedProduct(
      route.productHandle,
      KernelVocabulary.RouteRecognizer.RecognizedRoute.key,
      route.identityHandle,
      route.sourceAddressHandle,
      provenanceHandle,
    ),
    new MaterializationRecord(
      store.handles.materialization(local),
      ownerHandle,
      [route.productHandle],
      [],
      [],
    ),
  ];
}

function routeRecognizerOwnerHandle(
  graph: RecognizerGraph,
): NonNullable<RouteRecognizerReference['identityHandle']> {
  const ownerHandle = graph.recognizer.identityHandle;
  if (ownerHandle == null) {
    throw new Error('Cannot materialize RecognizedRoute without a RouteRecognizer identity owner.');
  }
  return ownerHandle;
}

function recognizedRouteLocal(
  tree: ViewportInstructionTreeModel,
  viewportInstruction: ViewportInstructionModel,
  instructionIndex: number,
  routeIndex: number,
): string {
  return `router-recognition:${tree.identityHandle}:instruction:${viewportInstruction.identityHandle}:${instructionIndex}:route:${routeIndex}`;
}

function recognizedRouteFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  route: RecognizedRouteDraft,
): readonly FieldProvenance<RouteRecognizerField>[] {
  return compactFieldProvenance<RouteRecognizerField>([
    new FieldProvenance('recognizer', provenanceHandle),
    new FieldProvenance('endpoint', provenanceHandle),
    new FieldProvenance('viewportInstruction', provenanceHandle),
    new FieldProvenance('viewportInstructionTree', provenanceHandle),
    new FieldProvenance('recognizedPath', provenanceHandle),
    route.residue == null ? null : new FieldProvenance('residue', provenanceHandle),
    route.parameterCount === 0 ? null : new FieldProvenance('parameterCount', provenanceHandle),
    route.redirectDepth === 0 ? null : new FieldProvenance('redirectDepth', provenanceHandle),
    new FieldProvenance('source', provenanceHandle),
  ]);
}
