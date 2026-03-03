/**
 * Scope-Visibility Evaluation — Tier 4 Node Layer
 *
 * Determines which resources are visible in which template scopes.
 * Consumes tier 3 conclusions (resource definitions) and registration
 * observations (dependencies, root registrations, template imports)
 * to produce per-scope visibility sets and completeness claims.
 *
 * Two-level lookup (from F5 scope-model §Resource Visibility):
 * Container.find() checks local container → root container only.
 * No intermediate ancestor traversal. A resource is either local
 * (registered in the CE's own container) or global (root container).
 *
 * Completeness (from L1 claim-model §Negative assertions require completeness):
 * A scope is complete when all registration paths are analyzed and
 * deterministic. Positive claims don't need completeness. Negative
 * claims ("resource X is absent") need completeness to be safe.
 * Root incompleteness propagates to all scopes (two-level lookup
 * always checks root).
 */

import type { GreenValue } from '../../value/green.js';
import type { Sourced } from '../../value/sourced.js';
import type { NormalizedPath } from '../../model/identity.js';
import type {
  ProjectDepGraph,
  ProjectDepNodeId,
  EvidenceSource,
} from './types.js';
import { conclusionNodeId } from './types.js';

// =============================================================================
// Scope-Visibility Green Value
// =============================================================================

/**
 * Structural content for a scope-visibility node.
 * Internable for O(1) cutoff via pointer equality.
 */
export interface ScopeVisibilityGreen {
  /** Resources visible in this scope, keyed by resource name */
  readonly visible: ReadonlyMap<string, VisibilityEntry>;
  /** Whether the scope's resource set is exhaustively known */
  readonly completeness: ScopeCompleteness;
}

export interface VisibilityEntry {
  readonly resourceKey: string;
  readonly lookupLevel: 'local' | 'root';
}

export type ScopeCompleteness =
  | { readonly state: 'complete' }
  | { readonly state: 'incomplete'; readonly gaps: readonly RegistrationGap[] };

export interface RegistrationGap {
  readonly site: string;
  readonly reason: string;
}

// =============================================================================
// Scope-Visibility Red Value (provenance)
// =============================================================================

export interface ScopeVisibilityRed {
  /** The CE that owns this scope */
  readonly scopeOwner: string;
  /** Per-resource registration provenance */
  readonly registrations: ReadonlyMap<string, RegistrationProvenance>;
}

export interface RegistrationProvenance {
  readonly mechanism: string;
  readonly source: EvidenceSource;
}

// =============================================================================
// Scope-Visibility Evaluation
// =============================================================================

/**
 * Build scope-visibility claims for all recognized CEs in the project.
 *
 * This is the tier 4 evaluation callback. It:
 * 1. Collects all recognized CEs from conclusions (kind = 'custom-element')
 * 2. For each CE, resolves its local registrations (dependencies + template imports + local elements)
 * 3. Collects root registrations (Aurelia.register + builtins)
 * 4. Produces a ScopeVisibilityGreen per CE scope
 *
 * Returns a map from scope owner name to visibility result.
 */
export function evaluateScopeVisibility(
  graph: ProjectDepGraph,
): Map<string, { green: ScopeVisibilityGreen; red: ScopeVisibilityRed }> {
  const results = new Map<string, { green: ScopeVisibilityGreen; red: ScopeVisibilityRed }>();

  // Step 1: Collect all recognized resources and their identities
  const resourceIndex = buildResourceIndex(graph);

  // Step 2: Build className → resourceKey index for dependency resolution
  const classNameIndex = buildClassNameIndex(graph, resourceIndex);

  // Step 3: Collect root registrations
  const rootResult = collectRootRegistrations(graph, classNameIndex);

  // Step 4: For each CE, build scope visibility
  for (const resourceKey of resourceIndex.keys()) {
    if (!resourceKey.startsWith('custom-element:')) continue;

    const ceName = resourceKey.slice('custom-element:'.length);
    const scopeResult = buildScopeVisibility(
      graph, resourceKey, classNameIndex, rootResult,
    );

    results.set(ceName, scopeResult);
  }

  return results;
}

// =============================================================================
// Resource Index
// =============================================================================

interface ResourceIdentity {
  kind: string;
  name: string;
  className: string;
}

/**
 * Build an index of all recognized resources from conclusion nodes.
 */
function buildResourceIndex(graph: ProjectDepGraph): Map<string, ResourceIdentity> {
  const index = new Map<string, ResourceIdentity>();
  const conclusionNodes = graph.nodesByKind('conclusion');

  // Group conclusions by resource key (strip field path)
  const resourceKeys = new Set<string>();
  for (const id of conclusionNodes) {
    // conclusion:custom-element:my-comp::name → custom-element:my-comp
    const match = id.match(/^conclusion:([^:]+:[^:]+)::/);
    if (match) resourceKeys.add(match[1]!);
  }

  for (const resourceKey of resourceKeys) {
    const kind = pullConclusionValue(graph, resourceKey, 'kind') as string | undefined;
    const name = pullConclusionValue(graph, resourceKey, 'name') as string | undefined;
    const className = pullConclusionValue(graph, resourceKey, 'className') as string | undefined;

    if (kind && name) {
      index.set(resourceKey, { kind, name, className: className ?? '' });
    }
  }

  return index;
}

/**
 * Build className → resourceKey index for resolving class references
 * in dependencies arrays.
 */
function buildClassNameIndex(
  graph: ProjectDepGraph,
  resourceIndex: Map<string, ResourceIdentity>,
): Map<string, string> {
  const index = new Map<string, string>();
  for (const [resourceKey, identity] of resourceIndex) {
    if (identity.className) {
      index.set(identity.className, resourceKey);
    }
  }
  return index;
}

// =============================================================================
// Root Registrations
// =============================================================================

interface RootRegistrationResult {
  /** Resources registered at root level, keyed by resource name */
  resources: Map<string, VisibilityEntry>;
  /** Completeness of the root scope */
  completeness: ScopeCompleteness;
}

/**
 * Collect root-level registrations from Aurelia.register() observations
 * and builtin fixtures.
 */
function collectRootRegistrations(
  graph: ProjectDepGraph,
  classNameIndex: Map<string, string>,
): RootRegistrationResult {
  const resources = new Map<string, VisibilityEntry>();
  const gaps: RegistrationGap[] = [];

  // Pull root registration observations
  const rootRegs = pullConclusionValue(graph, 'root-registrations', 'registrations');
  if (Array.isArray(rootRegs)) {
    for (const ref of rootRegs) {
      if (typeof ref === 'string' && ref.startsWith('class:')) {
        const className = ref.slice(6);
        const resourceKey = classNameIndex.get(className);
        if (resourceKey) {
          // Extract the resource name from the key
          const colonIdx = resourceKey.indexOf(':');
          const name = colonIdx >= 0 ? resourceKey.slice(colonIdx + 1) : resourceKey;
          resources.set(name, { resourceKey, lookupLevel: 'root' });
        }
        // If className not found in index, it might be a non-resource registration
        // (e.g., a service, plugin config object) — skip silently
      } else if (typeof ref === 'object' && ref !== null && 'kind' in ref && ref.kind === 'unknown') {
        // Gap from unresolvable registration
        gaps.push({ site: 'root', reason: (ref as any).reasonKind ?? 'opaque-registration' });
      }
    }
  }

  // Pull builtin resources (injected via injectFixture with tier='builtin')
  // Builtins are recognized resources with origin='builtin'
  const conclusionNodes = graph.nodesByKind('conclusion');
  const builtinResources = new Set<string>();
  for (const id of conclusionNodes) {
    const source = graph.observationSource(id);
    if (source?.tier === 'builtin') {
      const match = id.match(/^conclusion:([^:]+:[^:]+)::name$/);
      if (match) builtinResources.add(match[1]!);
    }
  }

  // Check observation nodes for builtin tier (observations feed conclusions)
  const observationNodes = graph.nodesByKind('observation');
  for (const id of observationNodes) {
    const source = graph.observationSource(id);
    if (source?.tier === 'builtin') {
      // Extract resource key from observation id: obs:resourceKey:fieldPath:evalNode
      const parts = id.split(':');
      if (parts.length >= 4) {
        const resourceKey = `${parts[1]}:${parts[2]}`;
        builtinResources.add(resourceKey);
      }
    }
  }

  for (const resourceKey of builtinResources) {
    const colonIdx = resourceKey.indexOf(':');
    const name = colonIdx >= 0 ? resourceKey.slice(colonIdx + 1) : resourceKey;
    if (!resources.has(name)) {
      resources.set(name, { resourceKey, lookupLevel: 'root' });
    }
  }

  const completeness: ScopeCompleteness = gaps.length > 0
    ? { state: 'incomplete', gaps }
    : { state: 'complete' };

  return { resources, completeness };
}

// =============================================================================
// Per-Scope Visibility
// =============================================================================

/**
 * Build scope visibility for a single CE.
 *
 * Two-level lookup:
 * 1. Local: CE's dependencies + template imports + local elements
 * 2. Root: Aurelia.register() + builtins
 *
 * Local takes precedence over root (shadowing).
 */
function buildScopeVisibility(
  graph: ProjectDepGraph,
  ceResourceKey: string,
  classNameIndex: Map<string, string>,
  rootResult: RootRegistrationResult,
): { green: ScopeVisibilityGreen; red: ScopeVisibilityRed } {
  const visible = new Map<string, VisibilityEntry>();
  const registrations = new Map<string, RegistrationProvenance>();
  const localGaps: RegistrationGap[] = [];
  const ceName = ceResourceKey.slice('custom-element:'.length);

  // Step 1: Collect local registrations from dependencies field
  const deps = pullConclusionValue(graph, ceResourceKey, 'dependencies');
  if (Array.isArray(deps)) {
    for (const ref of deps) {
      if (typeof ref === 'string' && ref.startsWith('class:')) {
        const className = ref.slice(6);
        const resourceKey = classNameIndex.get(className);
        if (resourceKey) {
          const colonIdx = resourceKey.indexOf(':');
          const name = colonIdx >= 0 ? resourceKey.slice(colonIdx + 1) : resourceKey;
          visible.set(name, { resourceKey, lookupLevel: 'local' });
          registrations.set(name, { mechanism: 'dependencies-array', source: { tier: 'analysis-explicit', form: 'dependencies-array' } });
        }
      }
      // Gaps from unresolvable deps
      if (typeof ref === 'string' && ref.startsWith('<unresolvable:')) {
        localGaps.push({ site: ceResourceKey, reason: ref });
      }
    }
  }

  // Check dependencies:completeness for partial gaps
  const depsCompleteness = pullConclusionValue(graph, ceResourceKey, 'dependencies:completeness');
  if (depsCompleteness !== undefined) {
    localGaps.push({ site: ceResourceKey, reason: 'partial-opaque-dependencies' });
  }

  // Step 2: Collect local registrations from template imports
  const templateImports = pullConclusionValue(graph, ceResourceKey, 'template-imports');
  if (Array.isArray(templateImports)) {
    for (const importPath of templateImports) {
      if (typeof importPath === 'string') {
        // Template imports reference file paths — resolve to resource
        // For now, record as import-based local registration
        // The scope-visibility callback will match these to resources
        // when the full module resolution is available
        registrations.set(`import:${importPath}`, {
          mechanism: 'import-element',
          source: { tier: 'analysis-explicit', form: 'import-element' },
        });
      }
    }
  }

  // Step 3: Collect local elements (as-custom-element)
  const localElements = pullConclusionValue(graph, ceResourceKey, 'local-elements');
  if (Array.isArray(localElements)) {
    for (const name of localElements) {
      if (typeof name === 'string') {
        visible.set(name, {
          resourceKey: `custom-element:${name}`,
          lookupLevel: 'local',
        });
        registrations.set(name, {
          mechanism: 'as-custom-element',
          source: { tier: 'analysis-explicit', form: 'as-custom-element' },
        });
      }
    }
  }

  // Step 4: Add root registrations (local takes precedence — shadowing)
  for (const [name, entry] of rootResult.resources) {
    if (!visible.has(name)) {
      visible.set(name, entry);
      registrations.set(name, {
        mechanism: 'root-registration',
        source: { tier: 'analysis-explicit', form: 'root-registration' },
      });
    }
  }

  // Step 5: Compute completeness
  // Scope is complete iff:
  //   1. Local registrations have no gaps
  //   2. Root is complete (root gaps propagate to all scopes)
  const allGaps = [...localGaps];
  if (rootResult.completeness.state === 'incomplete') {
    allGaps.push(...rootResult.completeness.gaps.map(g => ({
      ...g,
      site: `root → ${g.site}`,
    })));
  }

  const completeness: ScopeCompleteness = allGaps.length > 0
    ? { state: 'incomplete', gaps: allGaps }
    : { state: 'complete' };

  const green: ScopeVisibilityGreen = { visible, completeness };
  const red: ScopeVisibilityRed = { scopeOwner: ceName, registrations };

  return { green, red };
}

// =============================================================================
// Conclusion Pull Helper
// =============================================================================

/**
 * Pull a conclusion value from the graph, triggering lazy evaluation.
 */
function pullConclusionValue(
  graph: ProjectDepGraph,
  resourceKey: string,
  fieldPath: string,
): unknown {
  const concId = conclusionNodeId(resourceKey, fieldPath);
  const sourced = graph.evaluation.pull<unknown>(concId);
  if (!sourced) return undefined;
  if (sourced.origin === 'source') {
    return sourced.state === 'known' ? sourced.value : undefined;
  }
  return sourced.value;
}
