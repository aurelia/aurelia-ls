import ts from "typescript";
import type { NormalizedPath } from "@aurelia-ls/domain";
import type {
  RouteTree,
  RouteNode,
  ExtractedRouteConfig,
  ExtractedChildRoute,
  ComponentRef,
  ParameterizedRoute,
  DynamicRouteComponent,
} from "./types.js";
import { extractRouteConfig, extractPathParams, hasGetRouteConfigMethod } from "./extract.js";
import { canonicalPath } from "../util/naming.js";

/**
 * Options for building the route tree.
 */
export interface RouteTreeOptions {
  /**
   * Entry point class names to start discovery from.
   * If not provided, attempts to find components with <au-viewport> in templates.
   */
  entryPoints?: string[];

  /**
   * Maximum depth for nested route discovery.
   * Prevents infinite loops in deeply nested or circular references.
   * @default 20
   */
  maxDepth?: number;

  /**
   * Whether to follow dynamic imports.
   * @default true
   */
  resolveDynamicImports?: boolean;
}

/**
 * Context for route tree building.
 */
interface BuildContext {
  program: ts.Program;
  options: Required<RouteTreeOptions>;
  /** Tracks visited class+file combinations to prevent infinite loops */
  visited: Set<string>;
  /** Accumulated dynamic components */
  dynamicComponents: DynamicRouteComponent[];
  /** Maps className to file path for quick lookup */
  classLocations: Map<string, NormalizedPath>;
  /** Maps file path to its imports (className -> resolved path) */
  fileImports: Map<NormalizedPath, Map<string, NormalizedPath>>;
}

/**
 * Build a complete route tree from a TypeScript program.
 */
export function buildRouteTree(
  program: ts.Program,
  options?: RouteTreeOptions
): RouteTree {
  const opts: Required<RouteTreeOptions> = {
    entryPoints: options?.entryPoints ?? [],
    maxDepth: options?.maxDepth ?? 20,
    resolveDynamicImports: options?.resolveDynamicImports ?? true,
  };

  const ctx: BuildContext = {
    program,
    options: opts,
    visited: new Set(),
    dynamicComponents: [],
    classLocations: new Map(),
    fileImports: new Map(),
  };

  // Pre-index all classes and their locations
  indexClasses(ctx);

  // Pre-index all imports
  indexImports(ctx);

  // Find entry points (classes with route configs that have routes arrays)
  const entryPoints = opts.entryPoints.length > 0
    ? opts.entryPoints
    : findEntryPoints(ctx);

  // Build route nodes from each entry point
  const roots: RouteNode[] = [];

  for (const entryClassName of entryPoints) {
    const filePath = ctx.classLocations.get(entryClassName);
    if (!filePath) continue;

    const sourceFile = getSourceFile(ctx.program, filePath);
    if (!sourceFile) continue;

    const classDecl = findClassInFile(sourceFile, entryClassName);
    if (!classDecl) continue;

    // Check for dynamic routes
    if (hasGetRouteConfigMethod(classDecl)) {
      ctx.dynamicComponents.push({
        className: entryClassName,
        filePath,
        method: "getRouteConfig",
      });
      continue;
    }

    const config = extractRouteConfig(classDecl);
    if (!config) continue;

    // Build nodes from the routes array
    const nodes = buildNodesFromConfig(config, "", filePath, ctx, 0);
    roots.push(...nodes);
  }

  // Collect all static paths and parameterized routes
  const allStaticPaths: string[] = [];
  const parameterizedRoutes: ParameterizedRoute[] = [];
  collectPaths(roots, allStaticPaths, parameterizedRoutes, ctx);

  return {
    entryPoints,
    roots,
    dynamicComponents: ctx.dynamicComponents,
    parameterizedRoutes,
    allStaticPaths,
  };
}

/**
 * Index all classes in the program for quick lookup.
 */
function indexClasses(ctx: BuildContext): void {
  for (const sf of ctx.program.getSourceFiles()) {
    if (sf.isDeclarationFile) continue;

    const filePath = canonicalPath(sf.fileName);

    for (const stmt of sf.statements) {
      if (ts.isClassDeclaration(stmt) && stmt.name) {
        ctx.classLocations.set(stmt.name.text, filePath);
      }
    }
  }
}

/**
 * Index all imports in the program.
 */
function indexImports(ctx: BuildContext): void {
  for (const sf of ctx.program.getSourceFiles()) {
    if (sf.isDeclarationFile) continue;

    const filePath = canonicalPath(sf.fileName);
    const imports = new Map<string, NormalizedPath>();

    for (const stmt of sf.statements) {
      if (!ts.isImportDeclaration(stmt)) continue;
      if (!stmt.importClause) continue;

      const specifier = stmt.moduleSpecifier;
      if (!ts.isStringLiteral(specifier)) continue;

      const resolvedPath = resolveModulePath(specifier.text, sf.fileName, ctx.program);
      if (!resolvedPath) continue;

      // Named imports: import { Foo, Bar } from './module'
      if (stmt.importClause.namedBindings && ts.isNamedImports(stmt.importClause.namedBindings)) {
        for (const el of stmt.importClause.namedBindings.elements) {
          const localName = el.name.text;
          imports.set(localName, resolvedPath);
        }
      }

      // Default import: import Foo from './module'
      if (stmt.importClause.name) {
        imports.set(stmt.importClause.name.text, resolvedPath);
      }
    }

    ctx.fileImports.set(filePath, imports);
  }
}

/**
 * Find entry points - classes that have route configs with routes arrays.
 */
function findEntryPoints(ctx: BuildContext): string[] {
  const entryPoints: string[] = [];

  for (const sf of ctx.program.getSourceFiles()) {
    if (sf.isDeclarationFile) continue;

    for (const stmt of sf.statements) {
      if (!ts.isClassDeclaration(stmt) || !stmt.name) continue;

      const config = extractRouteConfig(stmt);
      if (config && config.routes.length > 0) {
        entryPoints.push(stmt.name.text);
      }
    }
  }

  return entryPoints;
}

/**
 * Build route nodes from an extracted config.
 */
function buildNodesFromConfig(
  config: ExtractedRouteConfig,
  parentPath: string,
  currentFile: NormalizedPath,
  ctx: BuildContext,
  depth: number
): RouteNode[] {
  if (depth > ctx.options.maxDepth) {
    return [];
  }

  const nodes: RouteNode[] = [];

  for (const childRoute of config.routes) {
    const node = buildNodeFromChildRoute(childRoute, parentPath, currentFile, ctx, depth);
    if (node) nodes.push(node);
  }

  return nodes;
}

/**
 * Result of resolving a class component.
 */
interface ResolvedComponent {
  children: RouteNode[];
  pathAliases?: readonly string[];
}

/**
 * Build a single route node from a child route.
 */
function buildNodeFromChildRoute(
  route: ExtractedChildRoute,
  parentPath: string,
  currentFile: NormalizedPath,
  ctx: BuildContext,
  depth: number
): RouteNode | null {
  const fullPath = joinPaths(parentPath, route.path);
  const params = extractPathParams(route.path);

  // Build children from explicit children in route config
  let children: RouteNode[] = [];
  let pathAliases: readonly string[] | undefined;

  if (route.children && route.children.length > 0) {
    for (const childRoute of route.children) {
      const childNode = buildNodeFromChildRoute(childRoute, fullPath, currentFile, ctx, depth + 1);
      if (childNode) children.push(childNode);
    }
  }

  // If component is a class reference, try to follow it and get its routes
  if (route.component?.kind === "class") {
    const resolved = resolveClassComponent(
      route.component.className,
      fullPath,
      currentFile,
      ctx,
      depth + 1
    );
    children = [...children, ...resolved.children];
    pathAliases = resolved.pathAliases;
  }

  // Check if this is a redirect-only route
  if (route.redirectTo !== undefined && !route.component) {
    return {
      path: route.path,
      fullPath,
      redirectTo: route.redirectTo,
      children: [],
      ...(params.length > 0 ? { params } : {}),
    };
  }

  // Determine final path - use aliases if component had them
  const finalPath = pathAliases && pathAliases.length > 1
    ? pathAliases
    : route.path;

  return {
    path: finalPath,
    fullPath,
    component: route.component,
    ...(route.id ? { id: route.id } : {}),
    ...(route.title ? { title: route.title } : {}),
    ...(route.viewport ? { viewport: route.viewport } : {}),
    ...(route.data ? { data: route.data } : {}),
    children,
    ...(params.length > 0 ? { params } : {}),
  };
}

/**
 * Resolve a class component reference to get its child routes and path aliases.
 */
function resolveClassComponent(
  className: string,
  parentPath: string,
  currentFile: NormalizedPath,
  ctx: BuildContext,
  depth: number
): ResolvedComponent {
  if (depth > ctx.options.maxDepth) {
    return { children: [] };
  }

  // Try to find where this class is defined
  let targetFile: NormalizedPath | undefined;

  // First check imports in the current file
  const currentFileImports = ctx.fileImports.get(currentFile);
  if (currentFileImports?.has(className)) {
    targetFile = currentFileImports.get(className);
  }

  // If not found in imports, check if it's defined in the same file
  if (!targetFile) {
    const sourceFile = getSourceFile(ctx.program, currentFile);
    if (sourceFile) {
      const classDecl = findClassInFile(sourceFile, className);
      if (classDecl) {
        targetFile = currentFile;
      }
    }
  }

  // If still not found, try the global class index
  if (!targetFile) {
    targetFile = ctx.classLocations.get(className);
  }

  if (!targetFile) {
    return { children: [] };
  }

  // Check for circular reference
  const visitKey = `${targetFile}:${className}`;
  if (ctx.visited.has(visitKey)) {
    return { children: [] };
  }
  ctx.visited.add(visitKey);

  // Get the source file and class
  const sourceFile = getSourceFile(ctx.program, targetFile);
  if (!sourceFile) {
    return { children: [] };
  }

  const classDecl = findClassInFile(sourceFile, className);
  if (!classDecl) {
    return { children: [] };
  }

  // Check for dynamic routes
  if (hasGetRouteConfigMethod(classDecl)) {
    ctx.dynamicComponents.push({
      className,
      filePath: targetFile,
      method: "getRouteConfig",
    });
    return { children: [] };
  }

  // Extract route config from the class
  const config = extractRouteConfig(classDecl);
  if (!config) {
    return { children: [] };
  }

  // Extract path aliases from the component's own route config
  let pathAliases: readonly string[] | undefined;
  if (config.path !== undefined) {
    if (Array.isArray(config.path)) {
      pathAliases = config.path;
    } else if (typeof config.path === "string") {
      // Single path, not an alias
    }
  }

  // Build nodes from its routes
  const children = buildNodesFromConfig(config, parentPath, targetFile, ctx, depth);

  return { children, pathAliases };
}

/**
 * Collect all static paths and parameterized routes from the tree.
 */
function collectPaths(
  nodes: readonly RouteNode[],
  staticPaths: string[],
  parameterizedRoutes: ParameterizedRoute[],
  ctx: BuildContext
): void {
  for (const node of nodes) {
    // Check if path has parameters
    const params = extractPathParams(
      typeof node.path === "string" ? node.path : (node.path[0] ?? "")
    );

    if (params.length > 0) {
      // Check if component has getStaticPaths
      const hasStaticPaths = checkHasStaticPaths(node.component, ctx);

      parameterizedRoutes.push({
        fullPath: node.fullPath,
        params,
        hasStaticPaths,
      });
    } else if (!node.redirectTo) {
      // Static path (not a redirect)
      staticPaths.push(node.fullPath);

      // Handle path aliases
      if (Array.isArray(node.path)) {
        for (let i = 1; i < node.path.length; i++) {
          const aliasPath = node.fullPath.replace(
            new RegExp(`${node.path[0]}$`),
            node.path[i]!
          );
          if (aliasPath !== node.fullPath) {
            staticPaths.push(aliasPath);
          }
        }
      }
    }

    // Recurse into children
    collectPaths(node.children, staticPaths, parameterizedRoutes, ctx);
  }
}

/**
 * Check if a component has a static getStaticPaths method.
 */
function checkHasStaticPaths(
  component: ComponentRef | undefined,
  ctx: BuildContext
): boolean {
  if (!component || component.kind !== "class") {
    return false;
  }

  const filePath = ctx.classLocations.get(component.className);
  if (!filePath) return false;

  const sourceFile = getSourceFile(ctx.program, filePath);
  if (!sourceFile) return false;

  const classDecl = findClassInFile(sourceFile, component.className);
  if (!classDecl) return false;

  // Look for static getStaticPaths method
  for (const member of classDecl.members) {
    if (!ts.isMethodDeclaration(member)) continue;
    if (!member.name || !ts.isIdentifier(member.name)) continue;
    if (member.name.text !== "getStaticPaths") continue;

    // Check if it's static
    const modifiers = ts.canHaveModifiers(member) ? ts.getModifiers(member) : undefined;
    const isStatic = modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) ?? false;

    if (isStatic) return true;
  }

  return false;
}

/**
 * Join path segments, handling empty paths correctly.
 */
function joinPaths(parent: string, child: string): string {
  if (parent === "" || parent === "/") {
    return child === "" ? "/" : `/${child}`;
  }
  if (child === "") {
    return parent;
  }
  return `${parent}/${child}`;
}

/**
 * Get a source file from the program by path.
 */
function getSourceFile(program: ts.Program, filePath: NormalizedPath): ts.SourceFile | undefined {
  for (const sf of program.getSourceFiles()) {
    if (canonicalPath(sf.fileName) === filePath) {
      return sf;
    }
  }
  return undefined;
}

/**
 * Find a class declaration in a source file by name.
 */
function findClassInFile(
  sourceFile: ts.SourceFile,
  className: string
): ts.ClassDeclaration | undefined {
  for (const stmt of sourceFile.statements) {
    if (ts.isClassDeclaration(stmt) && stmt.name?.text === className) {
      return stmt;
    }
  }
  return undefined;
}

/**
 * Resolve a module specifier to a file path.
 */
function resolveModulePath(
  specifier: string,
  containingFile: string,
  program: ts.Program
): NormalizedPath | null {
  const result = ts.resolveModuleName(
    specifier,
    containingFile,
    program.getCompilerOptions(),
    ts.sys
  );

  if (result.resolvedModule?.resolvedFileName) {
    return canonicalPath(result.resolvedModule.resolvedFileName);
  }

  return null;
}
