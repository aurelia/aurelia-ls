import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { ContainerReference } from '../di/container.js';

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
  RouteNode = 'route-node',
  RouteTree = 'route-tree',
  ViewportInstruction = 'viewport-instruction',
  ViewportInstructionTree = 'viewport-instruction-tree',
  NavigationInstruction = 'navigation-instruction',
  BuiltInResource = 'built-in-resource',
}

export const enum RouterBuiltInResourceKind {
  ViewportCustomElement = 'viewport-custom-element',
  LoadCustomAttribute = 'load-custom-attribute',
  HrefCustomAttribute = 'href-custom-attribute',
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

export type RouterInstructionField =
  | 'component'
  | 'viewport'
  | 'parameters'
  | 'children'
  | 'options'
  | 'recognizedRoute'
  | 'source';

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
    readonly container: ContainerReference,
    readonly router: RouterReference,
    readonly routeConfigContext: RouterReference | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterField>[] = [],
  ) {}

  toReference(): RouterReference {
    return new RouterReference(this.productHandle, this.identityHandle, this.routerKind, this.sourceAddressHandle, null);
  }
}

/** Runtime RouteConfigContext model that stores configured route records. */
@auLink('router:RouteConfigContext')
export class RouteConfigContextModel {
  readonly routerKind = RouterModelKind.RouteConfigContext;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly routeContext: RouterReference,
    readonly routeConfigs: readonly RouteConfigReference[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterField>[] = [],
  ) {}

  toReference(): RouterReference {
    return new RouterReference(this.productHandle, this.identityHandle, this.routerKind, this.sourceAddressHandle, null);
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

/** Runtime IRouteConfig model preserving authored route metadata and child route references. */
@auLink('router:IRouteConfig')
export class RouteConfigModel {
  readonly routerKind = RouterModelKind.RouteConfig;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly routeKind: RouteConfigKind,
    readonly id: string | null,
    readonly paths: readonly string[],
    readonly title: string | null,
    readonly component: RouterReference | null,
    readonly redirectTo: string | null,
    readonly caseSensitive: boolean | null,
    readonly transitionPlan: string | null,
    readonly viewport: string | null,
    readonly childRoutes: readonly RouteConfigReference[],
    readonly sourceAddressHandle: AddressHandle | null,
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

/** Runtime IChildRouteConfig model with a required component. */
@auLink('router:IChildRouteConfig')
export class ChildRouteConfigModel {
  readonly routerKind = RouterModelKind.RouteConfig;
  readonly routeKind = RouteConfigKind.ChildRoute;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly id: string | null,
    readonly paths: readonly string[],
    readonly component: RouterReference,
    readonly childRoutes: readonly RouteConfigReference[],
    readonly sourceAddressHandle: AddressHandle | null,
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

/** Runtime RouteNode model used for recognized route state. */
@auLink('router:RouteNode')
export class RouteNodeModel {
  readonly routerKind = RouterModelKind.RouteNode;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly config: RouteConfigReference | null,
    readonly parent: RouterReference | null,
    readonly children: readonly RouterReference[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterField>[] = [],
  ) {}

  toReference(): RouterReference {
    return new RouterReference(this.productHandle, this.identityHandle, this.routerKind, this.sourceAddressHandle, null);
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
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterField>[] = [],
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
    readonly children: readonly RouterReference[],
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
    readonly instructions: readonly RouterReference[],
    readonly options: RouterOptionsReference | null,
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
    readonly component: RouterReference | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterInstructionField>[] = [],
  ) {}

  toReference(): RouterReference {
    return new RouterReference(this.productHandle, this.identityHandle, this.routerKind, this.sourceAddressHandle, null);
  }
}

/** Router Viewport custom element, modeled as a router-owned built-in resource anchor. */
@auLink('router:ViewportCustomElement')
export class RouterViewportCustomElementResource {
  readonly routerKind = RouterModelKind.BuiltInResource;
  readonly resourceKind = RouterBuiltInResourceKind.ViewportCustomElement;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterField>[] = [],
  ) {}
}

/** Router load custom attribute, modeled as a router-owned built-in resource anchor. */
@auLink('router:LoadCustomAttribute')
export class RouterLoadCustomAttributeResource {
  readonly routerKind = RouterModelKind.BuiltInResource;
  readonly resourceKind = RouterBuiltInResourceKind.LoadCustomAttribute;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterField>[] = [],
  ) {}
}

/** Router href custom attribute, modeled as a router-owned built-in resource anchor. */
@auLink('router:HrefCustomAttribute')
export class RouterHrefCustomAttributeResource {
  readonly routerKind = RouterModelKind.BuiltInResource;
  readonly resourceKind = RouterBuiltInResourceKind.HrefCustomAttribute;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RouterField>[] = [],
  ) {}
}
