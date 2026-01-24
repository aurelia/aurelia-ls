/**
 * Registration Analysis Data Model
 *
 * This module defines the output types for the registration analysis phase.
 *
 * ## The Three-Phase Model
 *
 * Resource availability in Aurelia is determined by three distinct phases:
 *
 * ```
 * Declaration → Registration → Usage
 *   (exists)     (available)    (consumed)
 * ```
 *
 * 1. **Declaration** (pattern matching layer): What resources exist in the project?
 *    - Input: Source files (FileFacts)
 *    - Output: ResourceDef[]
 *    - Complexity: Low — pattern matching (decorators, static $au, define, conventions)
 *
 * 2. **Registration** (this module): What scope(s) is each resource available in?
 *    - Input: ResourceDef[], FileFacts
 *    - Output: RegistrationAnalysis
 *    - Complexity: Medium — requires import graph traversal
 *
 * 3. **Usage** (compiler): What resources are actually consumed by templates?
 *    - Input: Compiled templates
 *    - Output: UsageManifest
 *    - Complexity: High — requires template analysis
 *
 * ## Key Design Decisions
 *
 * 1. **Sites are first-class**: One RegistrationSite per registration occurrence.
 *    A resource appearing in three `dependencies` arrays = three sites.
 *
 * 2. **ResourceRef can fail**: An identifier like `Foo` in `dependencies: [Foo]`
 *    might not resolve to a known ResourceDef. We model this explicitly
 *    rather than silently dropping it.
 *
 * 3. **Scope is structured**: `{ kind: "local"; owner: NormalizedPath }` not just a path.
 *    Makes the semantics explicit and enables type-safe pattern matching.
 *
 * 4. **Evidence is singular per site**: Each site has exactly one reason it exists.
 *    Multiple evidence types = multiple sites (e.g., registered globally AND locally).
 *
 * 5. **Provenance everywhere**: Every site has a SourceSpan pointing to where
 *    in the source code this registration was declared.
 *
 * @module
 */

import type { NormalizedPath, ResourceDef, SourceSpan, Sourced } from '../compiler.js';
import type { PluginManifest } from "../plugins/types.js";

// =============================================================================
// Core Output Type
// =============================================================================

/**
 * The complete output of registration analysis.
 *
 * - Separates sites (found registrations) from orphans (no registrations)
 * - Tracks unresolved patterns separately with diagnostics
 * - Enables efficient queries like "what can template T use?"
 */
export interface RegistrationAnalysis {
  /**
   * All discovered registration sites.
   *
   * One site per registration occurrence. A resource registered in three places
   * produces three sites. Query by resource, scope, or evidence type as needed.
   */
  readonly sites: readonly RegistrationSite[];

  /**
   * Resources with zero registration sites.
   *
   * These are declared (have @customElement, static $au, etc.) but never
   * registered via Aurelia.register(), dependencies arrays, or plugins.
   *
   * This is often a bug (forgot to register) or dead code (can be tree-shaken).
   */
  readonly orphans: readonly OrphanResource[];

  /**
   * Registration patterns we couldn't fully analyze.
   *
   * Examples:
   * - `Aurelia.register(getPlugins())` — function call
   * - `dependencies: dynamicArray` — variable reference
   * - `Aurelia.register(dev ? A : B)` — conditional
   *
   * These get diagnostics so users understand analysis limitations.
   */
  readonly unresolved: readonly UnresolvedRegistration[];

  /**
   * Plugins that were detected as registered.
   *
   * When a plugin is registered (e.g., `Aurelia.register(RouterConfiguration)`),
   * its package is "activated". Resources from DEFAULT_SEMANTICS with matching
   * `package` field should be included in the ResourceGraph.
   *
   * This enables conditional resource availability:
   * - RouterConfiguration registered → au-viewport, load, href available
   * - RouterConfiguration NOT registered → those elements/attributes are errors
   *
   * The scope builder uses this to filter DEFAULT_SEMANTICS by package.
   */
  readonly activatedPlugins: readonly PluginManifest[];
}

// =============================================================================
// Registration Sites
// =============================================================================

/**
 * A single registration site — one place where a resource is made available.
 *
 * ## Examples
 *
 * ```typescript
 * // Site 1: Global via Aurelia.register()
 * Aurelia.register(MyElement)
 *
 * // Site 2: Local via static dependencies
 * class Parent {
 *   static dependencies = [MyElement];
 * }
 *
 * // Site 3: Local via decorator
 * @customElement({ dependencies: [MyElement] })
 * class Other { }
 * ```
 *
 * Each of the above produces a separate RegistrationSite for MyElement.
 * The resource is available in multiple scopes simultaneously.
 */
export interface RegistrationSite {
  /**
   * What's being registered.
   *
   * Can be resolved (we found the ResourceDef) or unresolved
   * (identifier doesn't map to a known resource).
   */
  readonly resourceRef: ResourceRef;

  /**
   * Where this resource is available.
   *
   * - Global: Available in all templates
   * - Local: Available only in the owner component's template
   */
  readonly scope: RegistrationScope;

  /**
   * How we determined this registration exists.
   *
   * Singular per site — if a resource is registered both globally and locally,
   * that's two sites with different evidence, not one site with two evidences.
   */
  readonly evidence: RegistrationEvidence;

  /**
   * Source location where this registration is declared.
   *
   * Points to the identifier in the registration call or dependencies array.
   * Enables: diagnostics, go-to-definition, refactoring.
   */
  readonly span: SourceSpan;

  /**
   * Optional alias name for template import registrations.
   *
   * Example: `<import from="./foo" as="bar">` => alias "bar".
   * Only present when the registration introduces a local alias.
   */
  readonly alias?: Sourced<string> | null;
}

/**
 * Reference to a resource, which may or may not resolve.
 *
 * ## Why can resolution fail?
 *
 * An identifier in a dependencies array might not map to a known resource:
 *
 * ```typescript
 * import { NotAResource } from "./utils";
 *
 * @customElement({ dependencies: [NotAResource] })
 * class Foo { }
 * ```
 *
 * `NotAResource` is a valid identifier, but if it's not a custom element,
 * attribute, etc., we can't resolve it to a ResourceDef.
 *
 * We still record the site (it's a registration attempt) but mark the
 * resource reference as unresolved with a reason.
 */
export type ResourceRef =
  | {
      readonly kind: "resolved";
      readonly resource: ResourceDef;
    }
  | {
      readonly kind: "unresolved";
      /** The identifier name as written in source */
      readonly name: string;
      /** Why we couldn't resolve it */
      readonly reason: string;
    };

/**
 * The scope in which a registered resource is available.
 *
 * ## Scope Types
 *
 * **Global**: Available in every template in the application.
 * Created by `Aurelia.register()`, `container.register()`, or plugins.
 *
 * **Local**: Available only in one component's template.
 * Created by `static dependencies = [...]`, decorator dependencies,
 * or `static $au = { dependencies: [...] }`.
 *
 * ## Why structured instead of just a path?
 *
 * Makes the distinction explicit and enables type-safe pattern matching:
 *
 * ```typescript
 * if (scope.kind === "local") {
 *   // TypeScript knows scope.owner exists
 *   console.log(`Available in ${scope.owner}`);
 * }
 * ```
 */
export type RegistrationScope =
  | { readonly kind: "global" }
  | {
      readonly kind: "local";
      /**
       * The component whose template can use this resource.
       *
       * This is the file path of the component class, not the template.
       * The template is determined by convention (sibling .html) or
       * inline template in the class definition.
       */
      readonly owner: NormalizedPath;
    };

/**
 * Evidence for why a registration site exists.
 *
 * Each variant corresponds to a different registration pattern.
 * Provides semantic context about WHERE the registration was found.
 *
 * Note: The exact source location (span) is on RegistrationSite, not here.
 * Evidence describes the registration pattern; the site's span points to
 * the specific identifier being registered.
 */
export type RegistrationEvidence =
  | {
      readonly kind: "aurelia-register";
      /** File containing the Aurelia.register() call */
      readonly file: NormalizedPath;
    }
  | {
      readonly kind: "container-register";
      /** File containing the container.register() call */
      readonly file: NormalizedPath;
    }
  | {
      readonly kind: "static-dependencies";
      /** Component class that declares this dependency */
      readonly component: NormalizedPath;
      /** Class name of the component */
      readonly className: string;
    }
  | {
      readonly kind: "decorator-dependencies";
      /** Component class that declares this dependency */
      readonly component: NormalizedPath;
      /** Class name of the component */
      readonly className: string;
    }
  | {
      readonly kind: "static-au-dependencies";
      /** Component class that declares this dependency */
      readonly component: NormalizedPath;
      /** Class name of the component */
      readonly className: string;
    }
  | {
      readonly kind: "plugin";
      /** Name of the plugin (e.g., "RouterConfiguration") */
      readonly pluginName: string;
      /** File where the plugin is registered */
      readonly file: NormalizedPath;
    }
  | {
      readonly kind: "template-import";
      /** Component class that owns this template */
      readonly component: NormalizedPath;
      /** Class name of the component */
      readonly className: string;
      /** Template file containing the <import> element */
      readonly templateFile: NormalizedPath;
    };

// =============================================================================
// Orphans and Unresolved
// =============================================================================

/**
 * A resource that exists but has no registration sites.
 *
 * This is often a bug — someone defined a custom element but forgot
 * to register it. It could also be intentional dead code.
 *
 * Diagnostics should warn: "Resource 'my-element' is defined but never registered."
 */
export interface OrphanResource {
  /** The resource that has no registrations */
  readonly resource: ResourceDef;

  /**
   * Where the resource is defined.
   *
   * For diagnostics: "my-element defined at src/components/my-element.ts:15
   * is never registered."
   */
  readonly definitionSpan: SourceSpan;
}

/**
 * A registration pattern we couldn't statically analyze.
 *
 * These are Tier 3 patterns that require expression evaluation:
 * - Function calls: `getPlugins()`
 * - Variable references: `...dynamicArray`
 * - Conditionals: `dev ? A : B`
 *
 * We record these so we can:
 * 1. Emit diagnostics explaining the limitation
 * 2. Know that our analysis is incomplete
 * 3. Suggest alternatives (e.g., "use direct identifiers")
 */
export interface UnresolvedRegistration {
  /**
   * What kind of unresolvable pattern this is.
   *
   * Enables targeted diagnostics and suggestions.
   */
  readonly pattern: UnresolvedPattern;

  /** File containing the unresolved registration */
  readonly file: NormalizedPath;

  /** Location of the unresolvable expression */
  readonly span: SourceSpan;

  /**
   * Human-readable explanation for diagnostics.
   *
   * Examples:
   * - "Cannot statically analyze function call 'getPlugins()'"
   * - "Variable 'resources' requires runtime evaluation"
   */
  readonly reason: string;
}

/**
 * Classification of unresolvable patterns.
 *
 * Used to generate appropriate diagnostics and suggestions.
 */
export type UnresolvedPattern =
  | { readonly kind: "function-call"; readonly functionName: string }
  | { readonly kind: "variable-reference"; readonly variableName: string }
  | { readonly kind: "conditional" }
  | { readonly kind: "spread-variable"; readonly variableName: string }
  | { readonly kind: "property-access"; readonly expression: string }
  | { readonly kind: "other"; readonly description: string };

// =============================================================================
// Query Helpers (Optional — can be implemented as functions)
// =============================================================================

/**
 * Helper type for filtering sites by scope.
 *
 * Usage:
 * ```typescript
 * const localSites: LocalRegistrationSite[] = sites.filter(isLocalSite);
 * // TypeScript knows each has scope.kind === "local"
 * ```
 */
export interface LocalRegistrationSite extends RegistrationSite {
  readonly scope: { readonly kind: "local"; readonly owner: NormalizedPath };
}

/**
 * Helper type for filtering sites by resolved resource.
 *
 * Usage:
 * ```typescript
 * const resolved: ResolvedRegistrationSite[] = sites.filter(isResolvedSite);
 * // TypeScript knows each has resourceRef.kind === "resolved"
 * ```
 */
export interface ResolvedRegistrationSite extends RegistrationSite {
  readonly resourceRef: { readonly kind: "resolved"; readonly resource: ResourceDef };
}

// =============================================================================
// Type Guards
// =============================================================================

/** Type guard for local registration sites */
export function isLocalSite(site: RegistrationSite): site is LocalRegistrationSite {
  return site.scope.kind === "local";
}

/** Type guard for global registration sites */
export function isGlobalSite(site: RegistrationSite): boolean {
  return site.scope.kind === "global";
}

/** Type guard for resolved registration sites */
export function isResolvedSite(site: RegistrationSite): site is ResolvedRegistrationSite {
  return site.resourceRef.kind === "resolved";
}

/** Type guard for unresolved registration sites */
export function isUnresolvedSite(site: RegistrationSite): boolean {
  return site.resourceRef.kind === "unresolved";
}
