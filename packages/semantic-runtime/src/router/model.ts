import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { ContainerReference } from '../di/container-reference.js';

export const enum RouterModelKind {
  Registration = 'registration',
  Configuration = 'configuration',
  ServiceToken = 'service-token',
  Options = 'options',
  Router = 'router',
  ContextRouter = 'context-router',
  CurrentRoute = 'current-route',
  RouteContext = 'route-context',
  RouteConfigContext = 'route-config-context',
  RouteConfig = 'route-config',
  RouteableComponent = 'routeable-component',
  Viewport = 'viewport',
  ViewportAgent = 'viewport-agent',
  ComponentAgent = 'component-agent',
  RouteNode = 'route-node',
  RouteTree = 'route-tree',
  ViewportRequest = 'viewport-request',
  ViewportInstruction = 'viewport-instruction',
  ViewportInstructionTree = 'viewport-instruction-tree',
  NavigationInstruction = 'navigation-instruction',
}

export const enum RouterServiceTokenKind {
  RouterOptions = 'router-options',
  Router = 'router',
  ContextRouter = 'context-router',
  CurrentRoute = 'current-route',
  RouteContext = 'route-context',
}

export const enum RouteConfigKind {
  Route = 'route',
  ChildRoute = 'child-route',
  Redirect = 'redirect',
  Open = 'open',
}

export const enum NavigationInstructionKind {
  String = 'string',
  ViewportInstruction = 'viewport-instruction',
  CustomElementDefinition = 'custom-element-definition',
  Promise = 'promise',
  RouteViewModel = 'route-view-model',
  NavigationStrategy = 'navigation-strategy',
  Unknown = 'unknown',
}

export const enum RouteableComponentKind {
  CustomElementName = 'custom-element-name',
  ClassReference = 'class-reference',
  ResourceDefinition = 'resource-definition',
  Promise = 'promise',
  NavigationStrategy = 'navigation-strategy',
  Open = 'open',
}

export const enum RouteRecognizerModelKind {
  RouteRecognizer = 'route-recognizer',
  ConfigurableRoute = 'configurable-route',
  Endpoint = 'endpoint',
  State = 'state',
  RecognizedRoute = 'recognized-route',
}

export const enum RouteRecognizerSegmentKind {
  Static = 'static',
  Dynamic = 'dynamic',
  Star = 'star',
  Residue = 'residue',
}

export const enum RouteRecognizerStateKind {
  Separator = 'separator',
  Static = 'static',
  Dynamic = 'dynamic',
  Star = 'star',
  Residue = 'residue',
}

export const enum RouteRecognizerOwnershipKind {
  Own = 'own',
  InheritedFromParent = 'inherited-from-parent',
}

export type RouterField =
  | 'container'
  | 'options'
  | 'routeContext'
  | 'routeConfigContext'
  | 'source';

export type RouterOptionsField =
  | 'basePath'
  | 'useUrlFragmentHash'
  | 'useHref'
  | 'historyStrategy'
  | 'useNavigationModel'
  | 'activeClass'
  | 'restorePreviousRouteTreeOnError'
  | 'treatQueryAsParameters'
  | 'useEagerLoading'
  | 'source';

export type RouterServiceTokenField =
  | 'friendlyName'
  | 'defaultRegistration'
  | 'source';

export type RouteConfigField =
  | 'id'
  | 'path'
  | 'title'
  | 'component'
  | 'redirectTo'
  | 'caseSensitive'
  | 'transitionPlan'
  | 'viewport'
  | 'data'
  | 'children'
  | 'fallback'
  | 'nav'
  | 'source';

export type RouteableComponentField =
  | 'componentKind'
  | 'resolvedResource'
  | 'source';

export type RouteConfigContextField =
  | 'parent'
  | 'root'
  | 'config'
  | 'recognizer'
  | 'childRoutes'
  | 'depth'
  | 'friendlyPath'
  | 'childRoutesConfigured'
  | 'source';

export type RouteContextField =
  | 'parent'
  | 'root'
  | 'container'
  | 'router'
  | 'routeConfigContext'
  | 'viewportAgent'
  | 'source';

export type RouteNodeField =
  | 'routeContext'
  | 'config'
  | 'parent'
  | 'children'
  | 'instruction'
  | 'originalInstruction'
  | 'recognizedRoute'
  | 'params'
  | 'queryParams'
  | 'fragment'
  | 'data'
  | 'viewport'
  | 'residue'
  | 'path'
  | 'finalPath'
  | 'component'
  | 'title'
  | 'source';

export type RouteTreeField =
  | 'rootNode'
  | 'instructionTree'
  | 'options'
  | 'nodeCount'
  | 'queryParamCount'
  | 'fragment'
  | 'source';

export type ConfigurableRouteField =
  | 'recognizer'
  | 'routeConfigContext'
  | 'routeConfig'
  | 'parentPath'
  | 'path'
  | 'caseSensitive'
  | 'segments'
  | 'parameters'
  | 'source';

export type RouteRecognizerField =
  | 'recognizer'
  | 'routeConfigContext'
  | 'ownership'
  | 'configurableRoute'
  | 'path'
  | 'isResidual'
  | 'parameters'
  | 'primaryEndpoint'
  | 'residualEndpoint'
  | 'previousState'
  | 'nextStates'
  | 'endpoint'
  | 'stateKind'
  | 'segmentName'
  | 'pattern'
  | 'value'
  | 'length'
  | 'isSeparator'
  | 'isDynamic'
  | 'isOptional'
  | 'isConstrained'
  | 'recognizedPath'
  | 'residue'
  | 'parameterCount'
  | 'redirectDepth'
  | 'viewportInstruction'
  | 'viewportInstructionTree'
  | 'source';

export type ViewportField =
  | 'routeContext'
  | 'controller'
  | 'name'
  | 'usedBy'
  | 'default'
  | 'fallback'
  | 'source';

export type ViewportAgentField =
  | 'viewport'
  | 'routeContext'
  | 'hostController'
  | 'source';

export type ComponentAgentField =
  | 'routeContext'
  | 'routeNode'
  | 'viewportAgent'
  | 'controller'
  | 'component'
  | 'source';

export type RouterInstructionField =
  | 'instructionKind'
  | 'value'
  | 'routeContext'
  | 'component'
  | 'viewport'
  | 'parameters'
  | 'parameterCount'
  | 'children'
  | 'open'
  | 'close'
  | 'options'
  | 'isAbsolute'
  | 'queryParamCount'
  | 'fragment'
  | 'recognizedRoute'
  | 'source';

/** Runtime ViewportRequest used by RouteContext._resolveViewportAgent before RouteContext creation. */
@auLink('router:ViewportRequest')
export class ViewportRequestModel {
  readonly routerKind = RouterModelKind.ViewportRequest;

  constructor(
    readonly viewportName: string,
    readonly componentName: string,
  ) {}
}

/** Reference to a modeled router product without expanding route trees or instructions. */
export class RouterReference {
  constructor(
    /** Product handle for this router product, when materialized. */
    readonly productHandle: ProductHandle | null,
    /** Identity for this router product, when known. */
    readonly identityHandle: IdentityHandle | null,
    /** Router lane represented by this product. */
    readonly routerKind: RouterModelKind,
    /** Source address for the source shape, configuration call, or runtime owner. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Trace label while identity is still open. */
    readonly localName: string | null,
  ) {}
}

/** Router registration value that installs router services and default router resources. */
@auLink('router:RouterRegistration')
export class RouterRegistrationModel {
  readonly routerKind = RouterModelKind.Registration;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterField>[] = [],
  ) {}

  toReference(): RouterReference {
    return new RouterReference(this.productHandle, this.identityHandle, this.routerKind, this.sourceAddressHandle, null);
  }
}

/** Runtime RouterConfiguration registry facade, including customize(...) option pressure. */
@auLink('router:RouterConfiguration')
export class RouterConfigurationModel {
  readonly routerKind = RouterModelKind.Configuration;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly options: RouterOptionsReference | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterField>[] = [],
  ) {}

  toReference(): RouterReference {
    return new RouterReference(this.productHandle, this.identityHandle, this.routerKind, this.sourceAddressHandle, null);
  }
}

/** Reference to router options without expanding every option contribution. */
export class RouterOptionsReference {
  constructor(
    readonly productHandle: ProductHandle | null,
    readonly identityHandle: IdentityHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly localName: string | null,
  ) {}
}

/** Reference to a router-owned DI interface symbol without conflating the token with the service implementation. */
export class RouterServiceTokenReference {
  constructor(
    readonly productHandle: ProductHandle | null,
    readonly identityHandle: IdentityHandle | null,
    readonly tokenKind: RouterServiceTokenKind,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly localName: string | null,
  ) {}
}

/** Runtime IRouterOptions interface symbol, used as the DI key for router option registration. */
@auLink('router:IRouterOptions')
export class RouterOptionsInterfaceToken {
  readonly routerKind = RouterModelKind.ServiceToken;
  readonly tokenKind = RouterServiceTokenKind.RouterOptions;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly friendlyName: 'RouterOptions',
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterServiceTokenField>[] = [],
  ) {}

  toReference(): RouterServiceTokenReference {
    return new RouterServiceTokenReference(
      this.productHandle,
      this.identityHandle,
      this.tokenKind,
      this.sourceAddressHandle,
      this.friendlyName,
    );
  }
}

/** Runtime IRouter interface symbol, including its default singleton Router registration pressure. */
@auLink('router:IRouter')
export class RouterInterfaceToken {
  readonly routerKind = RouterModelKind.ServiceToken;
  readonly tokenKind = RouterServiceTokenKind.Router;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly friendlyName: 'IRouter',
    readonly defaultRegistration: RouterReference | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterServiceTokenField>[] = [],
  ) {}

  toReference(): RouterServiceTokenReference {
    return new RouterServiceTokenReference(
      this.productHandle,
      this.identityHandle,
      this.tokenKind,
      this.sourceAddressHandle,
      this.friendlyName,
    );
  }
}

/** Runtime IContextRouter interface symbol for context-local router facade lookup. */
@auLink('router:IContextRouter')
export class ContextRouterInterfaceToken {
  readonly routerKind = RouterModelKind.ServiceToken;
  readonly tokenKind = RouterServiceTokenKind.ContextRouter;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly friendlyName: 'IContextRouter',
    readonly defaultRegistration: RouterReference | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterServiceTokenField>[] = [],
  ) {}

  toReference(): RouterServiceTokenReference {
    return new RouterServiceTokenReference(
      this.productHandle,
      this.identityHandle,
      this.tokenKind,
      this.sourceAddressHandle,
      this.friendlyName,
    );
  }
}

/** Runtime ICurrentRoute interface symbol, including its default singleton CurrentRoute registration pressure. */
@auLink('router:ICurrentRoute')
export class CurrentRouteInterfaceToken {
  readonly routerKind = RouterModelKind.ServiceToken;
  readonly tokenKind = RouterServiceTokenKind.CurrentRoute;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly friendlyName: 'ICurrentRoute',
    readonly defaultRegistration: RouterReference | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterServiceTokenField>[] = [],
  ) {}

  toReference(): RouterServiceTokenReference {
    return new RouterServiceTokenReference(
      this.productHandle,
      this.identityHandle,
      this.tokenKind,
      this.sourceAddressHandle,
      this.friendlyName,
    );
  }
}

/** Runtime IRouteContext interface symbol for route-context lookup. */
@auLink('router:IRouteContext')
export class RouteContextInterfaceToken {
  readonly routerKind = RouterModelKind.ServiceToken;
  readonly tokenKind = RouterServiceTokenKind.RouteContext;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly friendlyName: 'IRouteContext',
    readonly defaultRegistration: RouterReference | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterServiceTokenField>[] = [],
  ) {}

  toReference(): RouterServiceTokenReference {
    return new RouterServiceTokenReference(
      this.productHandle,
      this.identityHandle,
      this.tokenKind,
      this.sourceAddressHandle,
      this.friendlyName,
    );
  }
}

/** Runtime RouterOptions model after option contribution convergence has enough facts. */
@auLink('router:RouterOptions')
export class RouterOptionsModel {
  readonly routerKind = RouterModelKind.Options;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly basePath: string | null,
    readonly useUrlFragmentHash: boolean | null,
    readonly useHref: boolean | null,
    readonly historyStrategy: string | null,
    readonly useNavigationModel: boolean | null,
    readonly activeClass: string | null,
    readonly restorePreviousRouteTreeOnError: boolean | null,
    readonly treatQueryAsParameters: boolean | null,
    readonly useEagerLoading: boolean | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterOptionsField>[] = [],
  ) {}

  toReference(): RouterOptionsReference {
    return new RouterOptionsReference(this.productHandle, this.identityHandle, this.sourceAddressHandle, null);
  }
}

/** Runtime IRouter/Router service model as seen through DI world construction. */
@auLink('router:Router')
export class RouterModel {
  readonly routerKind = RouterModelKind.Router;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly container: ContainerReference,
    readonly options: RouterOptionsReference | null,
    readonly routeContext: RouterReference | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterField>[] = [],
  ) {}

  toReference(): RouterReference {
    return new RouterReference(this.productHandle, this.identityHandle, this.routerKind, this.sourceAddressHandle, null);
  }
}

/** Context-local router facade registered for a RouteContext. */
@auLink('router:ContextRouter')
export class ContextRouterModel {
  readonly routerKind = RouterModelKind.ContextRouter;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly router: RouterReference,
    readonly routeContext: RouterReference,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterField>[] = [],
  ) {}

  toReference(): RouterReference {
    return new RouterReference(this.productHandle, this.identityHandle, this.routerKind, this.sourceAddressHandle, null);
  }
}

/** CurrentRoute service model exposed by router state. */
@auLink('router:CurrentRoute')
export class CurrentRouteModel {
  readonly routerKind = RouterModelKind.CurrentRoute;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly router: RouterReference | null,
    readonly routeContext: RouterReference | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterField>[] = [],
  ) {}

  toReference(): RouterReference {
    return new RouterReference(this.productHandle, this.identityHandle, this.routerKind, this.sourceAddressHandle, null);
  }
}

/** Runtime RouteContext model that owns context routers, route config context, and route tree state. */
@auLink('router:RouteContext')
export class RouteContextModel {
  readonly routerKind = RouterModelKind.RouteContext;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly parent: RouterReference | null,
    readonly root: RouterReference,
    readonly container: ContainerReference | null,
    readonly router: RouterReference | null,
    readonly routeConfigContext: RouterReference | null,
    readonly viewportAgent: RouterReference | null,
    readonly localName: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouteContextField>[] = [],
  ) {}

  toReference(): RouterReference {
    return new RouterReference(this.productHandle, this.identityHandle, this.routerKind, this.sourceAddressHandle, this.localName);
  }
}

/** Runtime RouteConfigContext model that stores configured route records. */
@auLink('router:RouteConfigContext')
export class RouteConfigContextModel {
  readonly routerKind = RouterModelKind.RouteConfigContext;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly parent: RouterReference | null,
    readonly root: RouterReference,
    readonly config: RouteConfigReference,
    readonly recognizer: RouteRecognizerReference,
    readonly childRoutes: readonly RouteConfigReference[],
    readonly depth: number,
    readonly friendlyPath: string,
    readonly childRoutesConfigured: boolean | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouteConfigContextField>[] = [],
  ) {}

  toReference(): RouterReference {
    return new RouterReference(this.productHandle, this.identityHandle, this.routerKind, this.sourceAddressHandle, this.friendlyPath);
  }
}

/** Reference to a route-recognizer product without expanding state graphs or endpoints. */
export class RouteRecognizerReference {
  constructor(
    readonly productHandle: ProductHandle | null,
    readonly identityHandle: IdentityHandle | null,
    readonly recognizerKind: RouteRecognizerModelKind,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly localName: string | null,
  ) {}
}

/** Runtime RouteRecognizer model owned by or inherited into a RouteConfigContext. */
@auLink('route-recognizer:RouteRecognizer')
export class RouteRecognizerModel {
  readonly recognizerKind = RouteRecognizerModelKind.RouteRecognizer;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly routeConfigContext: RouterReference,
    readonly ownership: RouteRecognizerOwnershipKind,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouteRecognizerField>[] = [],
  ) {}

  toReference(): RouteRecognizerReference {
    return new RouteRecognizerReference(
      this.productHandle,
      this.identityHandle,
      this.recognizerKind,
      this.sourceAddressHandle,
      null,
    );
  }
}

/** Reference to a modeled route config without expanding child config trees. */
export class RouteConfigReference {
  constructor(
    readonly productHandle: ProductHandle | null,
    readonly identityHandle: IdentityHandle | null,
    readonly routeKind: RouteConfigKind,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly localName: string | null,
  ) {}
}

/** Source-level routeable component reference before route-context resolution turns it into a component agent. */
export class RouteableComponentReference {
  constructor(
    readonly productHandle: ProductHandle | null,
    readonly identityHandle: IdentityHandle | null,
    readonly componentKind: RouteableComponentKind,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly localName: string | null,
    readonly resolvedProductHandle: ProductHandle | null = null,
    readonly resolvedIdentityHandle: IdentityHandle | null = null,
  ) {}
}

/** Converged router RouteableComponent source input before RouteConfigContext resolves it into a component definition. */
@auLink('router:RouteableComponent')
export class RouteableComponentModel {
  readonly routerKind = RouterModelKind.RouteableComponent;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly componentKind: RouteableComponentKind,
    readonly resolvedProductHandle: ProductHandle | null,
    readonly resolvedIdentityHandle: IdentityHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly localName: string | null,
    readonly fieldProvenance: readonly FieldProvenance<RouteableComponentField>[] = [],
  ) {}

  toReference(): RouteableComponentReference {
    return new RouteableComponentReference(
      this.productHandle,
      this.identityHandle,
      this.componentKind,
      this.sourceAddressHandle,
      this.localName,
      this.resolvedProductHandle,
      this.resolvedIdentityHandle,
    );
  }
}

/** Parsed route-recognizer parameter fact produced from one authored path segment. */
@auLink('route-recognizer:Parameter')
export class ParameterModel {
  constructor(
    readonly name: string,
    readonly isOptional: boolean,
    readonly isStar: boolean,
    readonly pattern: string | null,
  ) {}
}

/** Parsed static path segment before StaticSegment.appendTo(...) materializes state transitions. */
@auLink('route-recognizer:StaticSegment')
export class StaticSegmentModel {
  readonly segmentKind = RouteRecognizerSegmentKind.Static;
  readonly name = null;
  readonly optional = null;
  readonly pattern = null;

  constructor(
    readonly raw: string,
    readonly value: string,
    readonly caseSensitive: boolean,
  ) {}
}

/** Parsed dynamic parameter segment before DynamicSegment.appendTo(...) materializes a state transition. */
@auLink('route-recognizer:DynamicSegment')
export class DynamicSegmentModel {
  readonly segmentKind = RouteRecognizerSegmentKind.Dynamic;
  readonly value = null;
  readonly caseSensitive = null;

  constructor(
    readonly raw: string,
    readonly name: string,
    readonly optional: boolean,
    readonly pattern: string | null,
  ) {}
}

/** Parsed star or residual segment before StarSegment.appendTo(...) materializes a state transition. */
@auLink('route-recognizer:StarSegment')
export class StarSegmentModel {
  readonly value = null;
  readonly optional = false;
  readonly pattern = null;
  readonly caseSensitive = null;

  constructor(
    readonly segmentKind: RouteRecognizerSegmentKind.Star | RouteRecognizerSegmentKind.Residue,
    readonly raw: string,
    readonly name: string,
  ) {}
}

export type RouteRecognizerSegmentModel =
  | StaticSegmentModel
  | DynamicSegmentModel
  | StarSegmentModel;

/** Source-backed ConfigurableRoute path before RouteRecognizer.$add(...) builds endpoint/state products. */
@auLink('route-recognizer:ConfigurableRoute')
export class ConfigurableRouteModel {
  readonly recognizerKind = RouteRecognizerModelKind.ConfigurableRoute;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly recognizer: RouteRecognizerReference,
    readonly routeConfigContext: RouterReference,
    readonly routeConfig: RouteConfigReference,
    readonly parentPath: string | null,
    readonly path: string,
    readonly caseSensitive: boolean,
    readonly segments: readonly RouteRecognizerSegmentModel[],
    readonly parameters: readonly ParameterModel[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<ConfigurableRouteField>[] = [],
  ) {}

  toReference(): RouteRecognizerReference {
    return new RouteRecognizerReference(
      this.productHandle,
      this.identityHandle,
      this.recognizerKind,
      this.sourceAddressHandle,
      this.path,
    );
  }
}

/** Route-recognizer Endpoint model created from one configurable route. */
@auLink('route-recognizer:Endpoint')
export class EndpointModel {
  readonly recognizerKind = RouteRecognizerModelKind.Endpoint;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly recognizer: RouteRecognizerReference,
    readonly configurableRoute: RouteRecognizerReference,
    readonly path: string,
    readonly isResidual: boolean,
    readonly parameters: readonly ParameterModel[],
    readonly primaryEndpoint: RouteRecognizerReference | null,
    readonly residualEndpoint: RouteRecognizerReference | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouteRecognizerField>[] = [],
  ) {}

  toReference(): RouteRecognizerReference {
    return new RouteRecognizerReference(
      this.productHandle,
      this.identityHandle,
      this.recognizerKind,
      this.sourceAddressHandle,
      this.path,
    );
  }
}

/** Route-recognizer State node created while RouteRecognizer.$add(...) appends path segments. */
@auLink('route-recognizer:State')
export class StateModel {
  readonly recognizerKind = RouteRecognizerModelKind.State;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly recognizer: RouteRecognizerReference,
    readonly previousState: RouteRecognizerReference | null,
    readonly nextStates: readonly RouteRecognizerReference[],
    readonly endpoint: RouteRecognizerReference | null,
    readonly stateKind: RouteRecognizerStateKind,
    readonly segmentName: string | null,
    readonly pattern: string | null,
    readonly value: string,
    readonly length: number,
    readonly isSeparator: boolean,
    readonly isDynamic: boolean,
    readonly isOptional: boolean,
    readonly isConstrained: boolean,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouteRecognizerField>[] = [],
  ) {}

  toReference(): RouteRecognizerReference {
    return new RouteRecognizerReference(
      this.productHandle,
      this.identityHandle,
      this.recognizerKind,
      this.sourceAddressHandle,
      `${this.stateKind}:${this.value}:${this.length}`,
    );
  }
}

/** Route-recognizer RecognizedRoute produced from a concrete navigation path. */
@auLink('route-recognizer:RecognizedRoute')
export class RecognizedRouteModel {
  readonly recognizerKind = RouteRecognizerModelKind.RecognizedRoute;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly recognizer: RouteRecognizerReference,
    readonly endpoint: RouteRecognizerReference,
    readonly viewportInstruction: RouterReference,
    readonly viewportInstructionTree: RouterReference,
    readonly routeContext: RouterReference | null,
    readonly path: string,
    readonly residue: string | null,
    readonly parameterCount: number,
    readonly redirectDepth: number,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouteRecognizerField>[] = [],
  ) {}

  toReference(): RouteRecognizerReference {
    return new RouteRecognizerReference(
      this.productHandle,
      this.identityHandle,
      this.recognizerKind,
      this.sourceAddressHandle,
      this.path,
    );
  }
}

/** Runtime au-viewport custom element instance semantics discovered from template/controller hydration. */
@auLink('router:ViewportCustomElement', { facet: 'router-runtime-model' })
export class ViewportCustomElementModel {
  readonly routerKind = RouterModelKind.Viewport;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly routeContext: RouterReference | null,
    readonly controllerProductHandle: ProductHandle | null,
    readonly name: string,
    readonly usedBy: readonly string[],
    readonly defaultComponent: string | null,
    readonly fallback: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<ViewportField>[] = [],
  ) {}

  toReference(): RouterReference {
    return new RouterReference(this.productHandle, this.identityHandle, this.routerKind, this.sourceAddressHandle, this.name);
  }
}

/** Runtime ViewportAgent created when au-viewport.hydrated registers itself with the active RouteContext. */
@auLink('router:ViewportAgent')
export class ViewportAgentModel {
  readonly routerKind = RouterModelKind.ViewportAgent;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly viewport: RouterReference,
    readonly routeContext: RouterReference | null,
    readonly hostControllerProductHandle: ProductHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<ViewportAgentField>[] = [],
  ) {}

  toReference(): RouterReference {
    return new RouterReference(this.productHandle, this.identityHandle, this.routerKind, this.sourceAddressHandle, null);
  }
}

/** Runtime ComponentAgent created when a routed component is loaded into a viewport. */
@auLink('router:ComponentAgent')
export class ComponentAgentModel {
  readonly routerKind = RouterModelKind.ComponentAgent;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly routeContext: RouterReference,
    readonly routeNode: RouterReference,
    readonly viewportAgent: RouterReference | null,
    readonly controllerProductHandle: ProductHandle | null,
    readonly component: RouteableComponentReference | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<ComponentAgentField>[] = [],
  ) {}

  toReference(): RouterReference {
    return new RouterReference(this.productHandle, this.identityHandle, this.routerKind, this.sourceAddressHandle, this.routeContext.localName);
  }
}

/** Runtime RouteConfig model preserving normalized route metadata and child route references. */
@auLink('router:RouteConfig')
export class RouteConfigModel {
  readonly routerKind = RouterModelKind.RouteConfig;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly routeKind: RouteConfigKind,
    readonly id: string | null,
    readonly paths: readonly string[],
    readonly title: string | null,
    readonly component: RouteableComponentReference | null,
    readonly redirectTo: string | null,
    readonly caseSensitive: boolean | null,
    readonly transitionPlan: string | null,
    readonly viewport: string | null,
    readonly hasData: boolean | null,
    readonly childRoutes: readonly RouteConfigReference[],
    readonly fallback: RouteableComponentReference | null,
    readonly nav: boolean | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly pathSourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouteConfigField>[] = [],
  ) {}

  toReference(): RouteConfigReference {
    return new RouteConfigReference(
      this.productHandle,
      this.identityHandle,
      this.routeKind,
      this.sourceAddressHandle,
      this.id,
    );
  }
}

export interface RouteNodeModelFields {
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
  readonly routeContext: RouterReference;
  readonly config: RouteConfigReference | null;
  readonly parent: RouterReference | null;
  readonly children: readonly RouterReference[];
  readonly instruction: RouterReference | null;
  readonly originalInstruction: RouterReference | null;
  readonly recognizedRoute: RouteRecognizerReference | null;
  readonly parameterCount: number;
  readonly queryParamCount: number;
  readonly fragment: string | null;
  readonly hasData: boolean | null;
  readonly viewport: string | null;
  readonly residueInstructionCount: number;
  readonly path: string;
  readonly finalPath: string;
  readonly component: RouteableComponentReference | null;
  readonly title: string | null;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly fieldProvenance?: readonly FieldProvenance<RouteNodeField>[];
}

/** Runtime RouteNode model used for recognized route state. */
@auLink('router:RouteNode')
export class RouteNodeModel {
  readonly routerKind = RouterModelKind.RouteNode;
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
  readonly routeContext: RouterReference;
  readonly config: RouteConfigReference | null;
  readonly parent: RouterReference | null;
  readonly children: readonly RouterReference[];
  readonly instruction: RouterReference | null;
  readonly originalInstruction: RouterReference | null;
  readonly recognizedRoute: RouteRecognizerReference | null;
  readonly parameterCount: number;
  readonly queryParamCount: number;
  readonly fragment: string | null;
  readonly hasData: boolean | null;
  readonly viewport: string | null;
  readonly residueInstructionCount: number;
  readonly path: string;
  readonly finalPath: string;
  readonly component: RouteableComponentReference | null;
  readonly title: string | null;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly fieldProvenance: readonly FieldProvenance<RouteNodeField>[];

  constructor(fields: RouteNodeModelFields) {
    this.productHandle = fields.productHandle;
    this.identityHandle = fields.identityHandle;
    this.routeContext = fields.routeContext;
    this.config = fields.config;
    this.parent = fields.parent;
    this.children = fields.children;
    this.instruction = fields.instruction;
    this.originalInstruction = fields.originalInstruction;
    this.recognizedRoute = fields.recognizedRoute;
    this.parameterCount = fields.parameterCount;
    this.queryParamCount = fields.queryParamCount;
    this.fragment = fields.fragment;
    this.hasData = fields.hasData;
    this.viewport = fields.viewport;
    this.residueInstructionCount = fields.residueInstructionCount;
    this.path = fields.path;
    this.finalPath = fields.finalPath;
    this.component = fields.component;
    this.title = fields.title;
    this.sourceAddressHandle = fields.sourceAddressHandle;
    this.fieldProvenance = fields.fieldProvenance ?? [];
  }

  toReference(): RouterReference {
    return new RouterReference(this.productHandle, this.identityHandle, this.routerKind, this.sourceAddressHandle, this.routeContext.localName);
  }
}

/** Runtime RouteTree model that groups route nodes for navigation state. */
@auLink('router:RouteTree')
export class RouteTreeModel {
  readonly routerKind = RouterModelKind.RouteTree;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly rootNode: RouterReference | null,
    readonly instructionTree: RouterReference | null,
    readonly options: RouterOptionsReference | null,
    readonly nodeCount: number,
    readonly queryParamCount: number,
    readonly fragment: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouteTreeField>[] = [],
  ) {}

  toReference(): RouterReference {
    return new RouterReference(this.productHandle, this.identityHandle, this.routerKind, this.sourceAddressHandle, null);
  }
}

/** Runtime ViewportInstruction model before route-tree realization. */
@auLink('router:ViewportInstruction')
export class ViewportInstructionModel {
  readonly routerKind = RouterModelKind.ViewportInstruction;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly component: RouterReference | null,
    readonly viewport: string | null,
    readonly parametersProductHandle: ProductHandle | null,
    readonly parameterCount: number,
    readonly children: readonly RouterReference[],
    readonly open: number,
    readonly close: number,
    readonly recognizedRoute: RouteRecognizerReference | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterInstructionField>[] = [],
  ) {}

  toReference(): RouterReference {
    return new RouterReference(this.productHandle, this.identityHandle, this.routerKind, this.sourceAddressHandle, null);
  }
}

/** Runtime ViewportInstructionTree model. */
@auLink('router:ViewportInstructionTree')
export class ViewportInstructionTreeModel {
  readonly routerKind = RouterModelKind.ViewportInstructionTree;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly routeContext: RouterReference | null,
    readonly instructions: readonly RouterReference[],
    readonly options: RouterOptionsReference | null,
    readonly isAbsolute: boolean,
    readonly queryParamCount: number,
    readonly fragment: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterInstructionField>[] = [],
  ) {}

  toReference(): RouterReference {
    return new RouterReference(this.productHandle, this.identityHandle, this.routerKind, this.sourceAddressHandle, null);
  }
}

/** Runtime TypedNavigationInstruction model. */
@auLink('router:TypedNavigationInstruction')
export class TypedNavigationInstructionModel {
  readonly routerKind = RouterModelKind.NavigationInstruction;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly instructionKind: NavigationInstructionKind,
    readonly value: string | null,
    readonly component: RouterReference | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterInstructionField>[] = [],
  ) {}

  toReference(): RouterReference {
    return new RouterReference(this.productHandle, this.identityHandle, this.routerKind, this.sourceAddressHandle, null);
  }
}
