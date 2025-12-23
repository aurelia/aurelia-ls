import type { NormalizedPath } from "@aurelia-ls/domain";

/**
 * Route configuration extracted from a single class.
 */
export interface ExtractedRouteConfig {
  /** Route path or path aliases */
  readonly path?: string | readonly string[];

  /** Route identifier */
  readonly id?: string;

  /** Route title */
  readonly title?: string;

  /** Redirect target */
  readonly redirectTo?: string;

  /** Target viewport name */
  readonly viewport?: string;

  /** Child routes defined in this config */
  readonly routes: readonly ExtractedChildRoute[];

  /** Fallback component for unmatched child routes */
  readonly fallback?: ComponentRef;

  /** Route data */
  readonly data?: Readonly<Record<string, unknown>>;

  /** How this config was defined */
  readonly definitionType: "decorator" | "static-property";

  /** Path parameters extracted from path */
  readonly params?: readonly string[];
}

/**
 * A child route in a route configuration.
 */
export interface ExtractedChildRoute {
  /** Route path segment */
  readonly path: string;

  /** Component to render */
  readonly component?: ComponentRef;

  /** Route identifier */
  readonly id?: string;

  /** Route title */
  readonly title?: string;

  /** Redirect target */
  readonly redirectTo?: string;

  /** Target viewport name */
  readonly viewport?: string;

  /** Nested child routes */
  readonly children?: readonly ExtractedChildRoute[];

  /** Route data */
  readonly data?: Readonly<Record<string, unknown>>;
}

/**
 * How a component is referenced in a route.
 */
export type ComponentRef =
  | { readonly kind: "class"; readonly className: string }
  | { readonly kind: "string"; readonly name: string }
  | { readonly kind: "import"; readonly importPath: string }
  | { readonly kind: "inline"; readonly name: string; readonly template?: string }
  | { readonly kind: "unknown"; readonly raw: string };

/**
 * Complete route tree for an application.
 */
export interface RouteTree {
  /** Entry point class names (components with <au-viewport>) */
  readonly entryPoints: readonly string[];

  /** Root routes */
  readonly roots: readonly RouteNode[];

  /** Components with getRouteConfig() - need runtime discovery */
  readonly dynamicComponents: readonly DynamicRouteComponent[];

  /** Routes with parameters needing getStaticPaths() */
  readonly parameterizedRoutes: readonly ParameterizedRoute[];

  /** Flattened list of all static paths */
  readonly allStaticPaths: readonly string[];
}

/**
 * A node in the route tree (resolved from ExtractedChildRoute).
 */
export interface RouteNode {
  /** Route path segment(s) */
  readonly path: string | readonly string[];

  /** Full path from root */
  readonly fullPath: string;

  /** Component reference */
  readonly component?: ComponentRef;

  /** Route metadata */
  readonly id?: string;
  readonly title?: string;
  readonly viewport?: string;
  readonly data?: Readonly<Record<string, unknown>>;

  /** Child routes */
  readonly children: readonly RouteNode[];

  /** Redirect target */
  readonly redirectTo?: string;

  /** Path parameters */
  readonly params?: readonly string[];

  /** Source location for diagnostics */
  readonly source?: RouteSource;
}

/**
 * Source location of a route definition.
 */
export interface RouteSource {
  readonly filePath: NormalizedPath;
  readonly definitionType: "decorator" | "static-property";
  readonly line: number;
}

/**
 * A route with URL parameters.
 */
export interface ParameterizedRoute {
  /** Full path with parameters */
  readonly fullPath: string;

  /** Parameter names */
  readonly params: readonly string[];

  /** Whether component has static getStaticPaths() */
  readonly hasStaticPaths: boolean;
}

/**
 * Component with runtime route discovery.
 */
export interface DynamicRouteComponent {
  readonly className: string;
  readonly filePath: NormalizedPath;
  readonly method: "getRouteConfig";
}
