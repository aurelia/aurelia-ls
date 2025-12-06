/**
 * Component Loader for Vite SSR
 *
 * Utilities for loading real component classes via Vite's ssrLoadModule.
 * This enables SSR with actual component logic (getters, methods, etc.)
 * instead of fake classes with injected state.
 *
 * IMPORTANT: Components are loaded and patched ONCE per module load, not per request.
 * This aligns with how Aurelia's runtime caches definitions on the class object.
 * HMR invalidation clears the cache to allow re-patching on template/class changes.
 */

import type { ViteDevServer } from "vite";
import { readFile } from "node:fs/promises";
import type { ResolutionContext } from "./types.js";
import { patchComponentDefinition, type ComponentClass } from "../ssr/patch.js";
import { compileWithAot, type AotCompileResult } from "../aot.js";

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
 * Cache for loaded and patched components.
 *
 * Components are cached after first load to ensure:
 * 1. AOT compilation happens once per template
 * 2. $au patching happens once per class
 * 3. Aligns with Aurelia runtime's definition caching
 *
 * The cache is invalidated on HMR when template or class files change.
 */
class ComponentCache {
  /** Cached components keyed by template path (normalized) */
  private cache = new Map<string, LoadedComponent>();

  /** Track which template paths have been patched */
  private patched = new Set<string>();

  /**
   * Get a cached component, or null if not cached.
   */
  get(templatePath: string): LoadedComponent | null {
    return this.cache.get(normalizePath(templatePath)) ?? null;
  }

  /**
   * Cache a component and patch its $au definition.
   * Patching happens exactly once per component.
   */
  set(loaded: LoadedComponent): void {
    const key = normalizePath(loaded.templatePath);

    // Patch $au if not already patched
    if (!this.patched.has(key)) {
      patchComponentDefinition(loaded.ComponentClass, loaded.aot);
      this.patched.add(key);
    }

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
   * Note: We clear the cache entry but the class object may still exist
   * in Vite's module cache. On next load, Vite will return a fresh class
   * (if the module was invalidated) or the same class (if only the template changed).
   */
  invalidate(path: string): boolean {
    const normalized = normalizePath(path);

    // Find and remove any cache entry that matches this path
    // (could be template path or component path)
    let invalidated = false;

    for (const [key, component] of this.cache) {
      if (
        key === normalized ||
        normalizePath(component.componentPath) === normalized
      ) {
        this.cache.delete(key);
        this.patched.delete(key);
        invalidated = true;
      }
    }

    return invalidated;
  }

  /**
   * Clear the entire cache (e.g., on full reload).
   */
  clear(): void {
    this.cache.clear();
    this.patched.clear();
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
 * 2. For cache misses: reads template, compiles AOT, loads class, patches $au
 * 3. Returns all components ready for rendering (already patched)
 *
 * IMPORTANT: Components are patched ONCE when first loaded, not per request.
 * This aligns with Aurelia runtime's definition caching behavior.
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
): Promise<LoadProjectComponentsResult> {
  const components = new Map<string, LoadedComponent>();
  let root: LoadedComponent | null = null;
  const children: LoadedComponent[] = [];

  // Normalize root path for comparison
  const normalizedRootPath = normalizePath(rootTemplatePath);

  // Process all discovered templates
  for (const templateInfo of resolution.result.templates) {
    try {
      // Check cache first
      const cached = componentCache.get(templateInfo.templatePath);
      if (cached) {
        // Use cached component (already patched)
        components.set(templateInfo.resourceName, cached);
        categorizeComponent(cached, normalizedRootPath, (r) => { root = r; }, children);
        continue;
      }

      // Cache miss - load and compile
      // Read template HTML
      const templateHtml = await readFile(templateInfo.templatePath, "utf-8");

      // Compile with AOT using project semantics and scope
      const aot = compileWithAot(templateHtml, {
        templatePath: templateInfo.templatePath,
        name: templateInfo.resourceName,
        semantics: resolution.semantics,
        resourceGraph: resolution.resourceGraph,
        resourceScope: templateInfo.scopeId,
      });

      // Load the component class via Vite's SSR module loader
      const module = await vite.ssrLoadModule(templateInfo.componentPath);

      // Extract the class by name
      let ComponentClass = module[templateInfo.className] as ComponentClass | undefined;

      if (!ComponentClass) {
        // Try default export
        const defaultExport = module.default as ComponentClass | undefined;
        if (defaultExport?.name === templateInfo.className) {
          ComponentClass = defaultExport;
        } else {
          console.warn(
            `[aurelia-ssr] Could not find class "${templateInfo.className}" in module "${templateInfo.componentPath}"`,
          );
          continue;
        }
      }

      const loaded: LoadedComponent = {
        ComponentClass,
        aot,
        templatePath: templateInfo.templatePath,
        componentPath: templateInfo.componentPath,
        name: templateInfo.resourceName,
        className: templateInfo.className,
      };

      // Cache and patch (patching happens inside set())
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
): Promise<LoadedComponent | null> {
  // Check cache first
  const cached = componentCache.get(templatePath);
  if (cached) {
    return cached;
  }

  const normalizedPath = normalizePath(templatePath);

  // Find the template info
  const templateInfo = resolution.result.templates.find(
    (t) => normalizePath(t.templatePath) === normalizedPath,
  );

  if (!templateInfo) {
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
    });

    // Load class
    const module = await vite.ssrLoadModule(templateInfo.componentPath);
    const ComponentClass = (module[templateInfo.className] ?? module.default) as ComponentClass | undefined;

    if (!ComponentClass) {
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

    // Cache and patch
    componentCache.set(loaded);

    return loaded;
  } catch (error) {
    console.error(`[aurelia-ssr] Failed to load component:`, error);
    return null;
  }
}
