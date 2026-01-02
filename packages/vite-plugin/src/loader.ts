/**
 * Component Loader for Vite SSR
 *
 * Utilities for loading real component classes via Vite's ssrLoadModule.
 * This enables SSR with actual component logic (getters, methods, etc.)
 * instead of fake classes with injected state.
 *
 * NOTE: Component classes are transformed by the Vite plugin's transform hook
 * which injects the AOT-compiled $au definition directly into the source.
 * This loader no longer needs to patch classes - they already have $au set.
 * However, it still compiles templates to get the serialized hydration data
 * that's injected into the HTML for client-side hydration.
 *
 * HMR invalidation clears the cache to allow re-loading on template/class changes.
 */

import type { ViteDevServer } from "vite";
import { readFile } from "node:fs/promises";
import { debug, type CompileTrace } from "@aurelia-ls/compiler";
import type { ResolutionContext } from "./types.js";
import { compileWithAot, type AotCompileResult, type ComponentClass } from "@aurelia-ls/ssr";

/**
 * A loaded component with its class and compiled template.
 */
export interface LoadedComponent {
  /** The loaded component class */
  ComponentClass: ComponentClass;
  /** The AOT-compiled template definition */
  aot: AotCompileResult;
  /** The component's template path */
  templatePath: string;
  /** The component's source file path */
  componentPath: string;
  /** The component name (kebab-case) */
  name: string;
  /** The class name (PascalCase) */
  className: string;
}

/**
 * Result of loading all project components.
 */
export interface LoadProjectComponentsResult {
  /** All loaded components, keyed by resource name */
  components: Map<string, LoadedComponent>;
  /** The root component (if identified) */
  root: LoadedComponent | null;
  /** All child components (non-root) */
  children: LoadedComponent[];
}

// =============================================================================
// Component Cache
// =============================================================================

/**
 * Cache for loaded components.
 *
 * Components are cached after first load to ensure:
 * 1. AOT compilation happens once per template (for hydration data)
 * 2. Class loading happens once per module
 *
 * NOTE: Classes are no longer patched here - the Vite transform hook
 * injects $au directly into the source at compile time.
 *
 * The cache is invalidated on HMR when template or class files change.
 */
class ComponentCache {
  /** Cached components keyed by template path (normalized) */
  private cache = new Map<string, LoadedComponent>();

  /**
   * Get a cached component, or null if not cached.
   */
  get(templatePath: string): LoadedComponent | null {
    return this.cache.get(normalizePath(templatePath)) ?? null;
  }

  /**
   * Cache a loaded component.
   * Classes already have $au injected via the transform hook.
   */
  set(loaded: LoadedComponent): void {
    const key = normalizePath(loaded.templatePath);
    this.cache.set(key, loaded);
  }

  /**
   * Check if a component is cached.
   */
  has(templatePath: string): boolean {
    return this.cache.has(normalizePath(templatePath));
  }

  /**
   * Invalidate a specific component (called on HMR).
   *
   * Note: We clear the cache entry. On next load, Vite will return a fresh
   * class with the updated $au definition from the transform hook.
   */
  invalidate(path: string): boolean {
    const normalized = normalizePath(path);

    // Find and remove any cache entry that matches this path
    // (could be template path or component path)
    let invalidated = false;
    const invalidatedComponents: string[] = [];

    for (const [key, component] of this.cache) {
      if (
        key === normalized ||
        normalizePath(component.componentPath) === normalized
      ) {
        this.cache.delete(key);
        invalidated = true;
        invalidatedComponents.push(component.name);
      }
    }

    if (invalidated) {
      debug.vite("loader.cache.invalidate", {
        path,
        normalized,
        invalidatedComponents,
        remainingCacheSize: this.cache.size,
      });
    }

    return invalidated;
  }

  /**
   * Clear the entire cache (e.g., on full reload).
   */
  clear(): void {
    const previousSize = this.cache.size;
    this.cache.clear();
    if (previousSize > 0) {
      debug.vite("loader.cache.clear", {
        clearedCount: previousSize,
      });
    }
  }

  /**
   * Get all cached components.
   */
  values(): IterableIterator<LoadedComponent> {
    return this.cache.values();
  }

  /**
   * Get cache size for debugging.
   */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Global component cache instance.
 * Exported so the Vite plugin can invalidate on HMR.
 */
export const componentCache = new ComponentCache();

/**
 * Load and compile all element components from the project.
 *
 * This function:
 * 1. Checks the cache for already-loaded components
 * 2. For cache misses: reads template, compiles AOT for hydration data, loads class
 * 3. Returns all components ready for rendering
 *
 * NOTE: Classes already have $au injected via the Vite transform hook.
 * The AOT compilation here is for the hydration data that gets serialized
 * to the client, not for patching classes.
 *
 * @param vite - The Vite dev server instance
 * @param resolution - The resolution context with discovered resources
 * @param rootTemplatePath - Path to the root template (entry point)
 * @returns Loaded components (already patched) ready for SSR
 *
 * @example
 * ```typescript
 * const { root, children } = await loadProjectComponents(
 *   vite,
 *   resolution,
 *   './src/my-app.html'
 * );
 *
 * // Components are already patched - render directly
 * await renderWithComponents(root.ComponentClass, {
 *   childComponents: children.map(c => c.ComponentClass),
 * });
 * ```
 */
export async function loadProjectComponents(
  vite: ViteDevServer,
  resolution: ResolutionContext,
  rootTemplatePath: string,
  trace?: CompileTrace,
): Promise<LoadProjectComponentsResult> {
  const components = new Map<string, LoadedComponent>();
  let root: LoadedComponent | null = null;
  const children: LoadedComponent[] = [];

  // Normalize root path for comparison
  const normalizedRootPath = normalizePath(rootTemplatePath);

  // Debug: Log what we're looking for and what templates are available
  debug.vite("loader.loadComponents", {
    rootTemplatePath,
    normalizedRootPath,
    discoveredTemplates: resolution.result.templates.map(t => ({
      name: t.resourceName,
      templatePath: normalizePath(t.templatePath),
      className: t.className,
    })),
    templateCount: resolution.result.templates.length,
  });

  // Process all discovered templates
  for (const templateInfo of resolution.result.templates) {
    try {
      // Check cache first
      const cached = componentCache.get(templateInfo.templatePath);
      if (cached) {
        // Use cached component (already patched)
        debug.vite("loader.cacheHit", {
          component: templateInfo.resourceName,
          templatePath: templateInfo.templatePath,
        });
        components.set(templateInfo.resourceName, cached);
        categorizeComponent(cached, normalizedRootPath, (r) => { root = r; }, children);
        continue;
      }

      // Cache miss - load and compile
      debug.vite("loader.cacheMiss", {
        component: templateInfo.resourceName,
        templatePath: templateInfo.templatePath,
        componentPath: templateInfo.componentPath,
        className: templateInfo.className,
      });
      trace?.event("loader.compile", { component: templateInfo.resourceName });

      // Read template HTML
      const templateHtml = await readFile(templateInfo.templatePath, "utf-8");

      // Compile with AOT using project semantics and scope
      const aot = compileWithAot(templateHtml, {
        templatePath: templateInfo.templatePath,
        name: templateInfo.resourceName,
        semantics: resolution.semantics,
        resourceGraph: resolution.resourceGraph,
        resourceScope: templateInfo.scopeId,
        trace,
      });

      // Load the component class via Vite's SSR module loader
      const module = await vite.ssrLoadModule(templateInfo.componentPath);

      // Extract the class by name
      let ComponentClass = module[templateInfo.className] as ComponentClass | undefined;
      let extractionMethod: "named" | "default" | null = null;

      if (ComponentClass) {
        extractionMethod = "named";
      } else {
        // Try default export
        const defaultExport = module.default as ComponentClass | undefined;
        if (defaultExport?.name === templateInfo.className) {
          ComponentClass = defaultExport;
          extractionMethod = "default";
        }
      }

      if (!ComponentClass) {
        debug.vite("loader.classNotFound", {
          component: templateInfo.resourceName,
          className: templateInfo.className,
          componentPath: templateInfo.componentPath,
          moduleExports: Object.keys(module),
        });
        console.warn(
          `[aurelia-ssr] Could not find class "${templateInfo.className}" in module "${templateInfo.componentPath}"`,
        );
        continue;
      }

      debug.vite("loader.classLoaded", {
        component: templateInfo.resourceName,
        className: templateInfo.className,
        extractionMethod,
        hasStaticAu: "$au" in ComponentClass,
      });

      const loaded: LoadedComponent = {
        ComponentClass,
        aot,
        templatePath: templateInfo.templatePath,
        componentPath: templateInfo.componentPath,
        name: templateInfo.resourceName,
        className: templateInfo.className,
      };

      // Cache the loaded component (class already has $au from transform hook)
      componentCache.set(loaded);

      components.set(templateInfo.resourceName, loaded);
      categorizeComponent(loaded, normalizedRootPath, (r) => { root = r; }, children);
    } catch (error) {
      console.error(
        `[aurelia-ssr] Failed to load component "${templateInfo.resourceName}":`,
        error,
      );
    }
  }

  // Debug: Log final result
  // Note: root is set via callback so TypeScript doesn't track its mutation
  const finalRoot = root as LoadedComponent | null;
  debug.vite("loader.loadComplete", {
    rootFound: finalRoot !== null,
    rootName: finalRoot?.name ?? null,
    childCount: children.length,
    childNames: children.map(c => c.name),
    totalComponents: components.size,
  });

  return { components, root, children };
}

/**
 * Categorize a loaded component as root or child.
 */
function categorizeComponent(
  loaded: LoadedComponent,
  normalizedRootPath: string,
  setRoot: (r: LoadedComponent) => void,
  children: LoadedComponent[],
): void {
  if (normalizePath(loaded.templatePath) === normalizedRootPath) {
    setRoot(loaded);
  } else {
    children.push(loaded);
  }
}

/**
 * Normalize a path for comparison (forward slashes, lowercase on Windows).
 */
function normalizePath(p: string): string {
  let normalized = p.replace(/\\/g, "/");
  // On Windows, normalize case
  if (process.platform === "win32") {
    normalized = normalized.toLowerCase();
  }
  return normalized;
}

/**
 * Load a single component by its template path.
 *
 * Uses the cache - component is patched once on first load.
 * Useful for loading just the root component when you don't need
 * the full project loading.
 */
export async function loadComponent(
  vite: ViteDevServer,
  resolution: ResolutionContext,
  templatePath: string,
  trace?: CompileTrace,
): Promise<LoadedComponent | null> {
  const normalizedPath = normalizePath(templatePath);

  debug.vite("loader.loadSingle.start", {
    templatePath,
    normalizedPath,
  });

  // Check cache first
  const cached = componentCache.get(templatePath);
  if (cached) {
    debug.vite("loader.loadSingle.cacheHit", {
      component: cached.name,
    });
    return cached;
  }

  // Find the template info
  const templateInfo = resolution.result.templates.find(
    (t) => normalizePath(t.templatePath) === normalizedPath,
  );

  if (!templateInfo) {
    debug.vite("loader.loadSingle.notFound", {
      templatePath,
      normalizedPath,
      availableTemplates: resolution.result.templates.map(t => normalizePath(t.templatePath)),
    });
    console.warn(`[aurelia-ssr] No template info found for "${templatePath}"`);
    return null;
  }

  try {
    // Read and compile
    const templateHtml = await readFile(templateInfo.templatePath, "utf-8");
    const aot = compileWithAot(templateHtml, {
      templatePath: templateInfo.templatePath,
      name: templateInfo.resourceName,
      semantics: resolution.semantics,
      resourceGraph: resolution.resourceGraph,
      resourceScope: templateInfo.scopeId,
      trace,
    });

    // Load class
    const module = await vite.ssrLoadModule(templateInfo.componentPath);
    const ComponentClass = (module[templateInfo.className] ?? module.default) as ComponentClass | undefined;

    if (!ComponentClass) {
      debug.vite("loader.loadSingle.classNotFound", {
        component: templateInfo.resourceName,
        className: templateInfo.className,
        componentPath: templateInfo.componentPath,
        moduleExports: Object.keys(module),
      });
      console.warn(
        `[aurelia-ssr] Could not find class "${templateInfo.className}" in "${templateInfo.componentPath}"`,
      );
      return null;
    }

    const loaded: LoadedComponent = {
      ComponentClass,
      aot,
      templatePath: templateInfo.templatePath,
      componentPath: templateInfo.componentPath,
      name: templateInfo.resourceName,
      className: templateInfo.className,
    };

    // Cache the loaded component
    componentCache.set(loaded);

    debug.vite("loader.loadSingle.success", {
      component: loaded.name,
      className: loaded.className,
      hasStaticAu: "$au" in ComponentClass,
    });

    return loaded;
  } catch (error) {
    console.error(`[aurelia-ssr] Failed to load component:`, error);
    return null;
  }
}
