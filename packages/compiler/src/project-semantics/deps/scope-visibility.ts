/**
 * Scope-Visibility Evaluation
 *
 * Determines which resources are visible in which template scopes.
 * Consumes resource conclusions (definitions) and registration
 * observations (dependencies, root registrations, template imports)
 * to produce per-scope visibility sets and completeness claims.
 *
 * Two-level lookup (Container.find() semantics, verified from
 * di.container.ts:556-570):
 *   1. Check local container (the CE's own resource map)
 *   2. Check root container (the application-level resource map)
 *   3. No intermediate ancestor containers are checked
 *
 * Completeness: a scope is complete when all registration paths are
 * analyzed and deterministic. Positive claims don't need completeness.
 * Negative claims ("resource X is absent") require completeness to be
 * safe for diagnostics. Root incompleteness propagates to all scopes
 * because two-level lookup always checks root.
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
// Public Types
// =============================================================================

export interface ScopeVisibilityGreen {
  readonly visible: ReadonlyMap<string, VisibilityEntry>;
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

export interface ScopeVisibilityRed {
  readonly scopeOwner: string;
  readonly registrations: ReadonlyMap<string, RegistrationProvenance>;
}

export interface RegistrationProvenance {
  readonly mechanism: string;
  readonly source: EvidenceSource;
}

// =============================================================================
// Standard Builtins — Product Postulates (L3 §7.1)
// =============================================================================

/**
 * Framework resources that are always present in the root container
 * when StandardConfiguration is registered (which happens implicitly
 * via `new Aurelia()` or explicitly via `Aurelia.register(StandardConfiguration)`).
 *
 * These are product postulates — the compiler knows they exist without
 * tracing the 5-hop cross-package StandardConfiguration.register() chain.
 */
const STANDARD_BUILTINS: readonly { name: string; kind: string }[] = [
  // Template controllers
  { name: 'if', kind: 'template-controller' },
  { name: 'else', kind: 'template-controller' },
  { name: 'repeat', kind: 'template-controller' },
  { name: 'with', kind: 'template-controller' },
  { name: 'switch', kind: 'template-controller' },
  { name: 'case', kind: 'template-controller' },
  { name: 'default-case', kind: 'template-controller' },
  { name: 'promise', kind: 'template-controller' },
  { name: 'pending', kind: 'template-controller' },
  { name: 'then', kind: 'template-controller' },
  { name: 'catch', kind: 'template-controller' },
  { name: 'portal', kind: 'template-controller' },
  // Custom attributes
  { name: 'focus', kind: 'custom-attribute' },
  { name: 'show', kind: 'custom-attribute' },
  { name: 'portal', kind: 'custom-attribute' },
  // Value converters
  { name: 'sanitize', kind: 'value-converter' },
  { name: 'json', kind: 'value-converter' },
  // Binding behaviors
  { name: 'attr', kind: 'binding-behavior' },
  { name: 'self', kind: 'binding-behavior' },
  { name: 'updateTrigger', kind: 'binding-behavior' },
  { name: 'oneTime', kind: 'binding-behavior' },
  { name: 'toView', kind: 'binding-behavior' },
  { name: 'fromView', kind: 'binding-behavior' },
  { name: 'twoWay', kind: 'binding-behavior' },
  { name: 'signal', kind: 'binding-behavior' },
  { name: 'debounce', kind: 'binding-behavior' },
  { name: 'throttle', kind: 'binding-behavior' },
  // Custom elements
  { name: 'au-slot', kind: 'custom-element' },
  { name: 'au-compose', kind: 'custom-element' },
];

// =============================================================================
// Known Plugin Resource Contributions
// =============================================================================

/**
 * Plugins that register known resources when detected in root registrations.
 * Similar to vocabulary's KNOWN_PLUGINS but for resource-level contributions.
 */
interface KnownPluginResources {
  readonly identifiers: readonly string[];
  readonly resources: readonly { name: string; kind: string }[];
}

const KNOWN_PLUGIN_RESOURCES: readonly KnownPluginResources[] = [
  {
    // @aurelia/router registers the 'href' CA, 'load' CA, 'viewport' CE,
    // and several TCs. The 'href' CA is the most commonly tested.
    identifiers: ['RouterConfiguration'],
    resources: [
      { name: 'href', kind: 'custom-attribute' },
      { name: 'load', kind: 'custom-attribute' },
      { name: 'viewport', kind: 'custom-element' },
      { name: 'au-viewport', kind: 'custom-element' },
    ],
  },
];

// =============================================================================
// Entry Point
// =============================================================================

export function evaluateScopeVisibility(
  graph: ProjectDepGraph,
): Map<string, { green: ScopeVisibilityGreen; red: ScopeVisibilityRed }> {
  const results = new Map<string, { green: ScopeVisibilityGreen; red: ScopeVisibilityRed }>();

  // Build indexes used by all scope evaluations
  const resourceIndex = buildResourceIndex(graph);
  const classNameIndex = buildClassNameIndex(graph);
  const fileResourceIndex = buildFileResourceIndex(graph);

  // Collect root-level registrations (shared by all scopes)
  const rootResult = collectRootRegistrations(graph, classNameIndex, resourceIndex);

  // Evaluate visibility for each CE scope
  for (const resourceKey of resourceIndex.keys()) {
    if (!resourceKey.startsWith('custom-element:')) continue;

    const ceName = resourceKey.slice('custom-element:'.length);
    const scopeResult = buildScopeVisibility(
      graph, resourceKey, classNameIndex, fileResourceIndex, rootResult,
    );

    results.set(ceName, scopeResult);
  }

  return results;
}

// =============================================================================
// Indexes
// =============================================================================

interface ResourceIdentity {
  kind: string;
  name: string;
  className: string;
  file?: string;
}

/**
 * Build an index of all recognized resources from conclusion nodes.
 */
function buildResourceIndex(graph: ProjectDepGraph): Map<string, ResourceIdentity> {
  const index = new Map<string, ResourceIdentity>();
  const conclusionNodes = graph.nodesByKind('conclusion');

  const resourceKeys = new Set<string>();
  for (const id of conclusionNodes) {
    const match = id.match(/^conclusion:([^:]+:[^:]+)::/);
    if (match) resourceKeys.add(match[1]!);
  }

  for (const resourceKey of resourceKeys) {
    if (resourceKey === 'root-registrations') continue;
    const kind = pullConclusionValue(graph, resourceKey, 'kind') as string | undefined;
    const name = pullConclusionValue(graph, resourceKey, 'name') as string | undefined;
    const className = pullConclusionValue(graph, resourceKey, 'className') as string | undefined;
    const file = pullConclusionValue(graph, resourceKey, 'file') as string | undefined;

    if (kind && name) {
      index.set(resourceKey, { kind, name, className: className ?? '', file });
    }
  }

  return index;
}

/**
 * Build className → resourceKey index from ALL observation nodes.
 *
 * This is critical: when two classes produce the same resource name
 * (e.g., SharedEl and LocalSharedEl both declare name: 'shared-el'),
 * convergence picks one className as the winner for the conclusion.
 * But dependency arrays reference class names (class:LocalSharedEl),
 * not resource names. Both classNames must map to the resourceKey.
 *
 * Strategy: parse observation node IDs to extract (className, resourceKey)
 * pairs. Observation IDs encode the resource key and the source eval node.
 * We extract the eval unit key (which is typically the className) and
 * the resource key from the observation ID structure.
 */
function buildClassNameIndex(graph: ProjectDepGraph): Map<string, string> {
  const index = new Map<string, string>();

  // Approach: className observations have IDs like:
  //   obs:custom-element:shared-el:className:eval:/src/local-shared-el.ts#LocalSharedEl
  // The eval node key after '#' is the className, and the resource key
  // is between 'obs:' and ':className:'.
  const observationNodes = graph.nodesByKind('observation');

  for (const id of observationNodes) {
    if (!id.includes(':className:')) continue;

    // Find the eval node reference — it contains the className
    const evalPrefix = ':eval:';
    const evalIdx = id.indexOf(evalPrefix);
    if (evalIdx === -1) continue;

    const evalPart = id.slice(evalIdx + evalPrefix.length);
    const hashIdx = evalPart.indexOf('#');
    if (hashIdx === -1) continue;

    const className = evalPart.slice(hashIdx + 1);
    if (!className) continue;

    // Extract resourceKey: between 'obs:' and ':className:'
    const classNameFieldIdx = id.indexOf(':className:');
    const resourceKey = id.slice(4, classNameFieldIdx); // skip 'obs:'

    if (resourceKey && className) {
      index.set(className, resourceKey);
    }
  }

  // Also add from conclusions (catches resources whose observations
  // don't follow the standard pattern, e.g., builtin fixtures)
  const conclusionNodes = graph.nodesByKind('conclusion');
  for (const id of conclusionNodes) {
    if (!id.endsWith('::className')) continue;
    const resourceKey = id.slice(11, -11); // strip 'conclusion:' and '::className'
    const className = pullConclusionValue(graph, resourceKey, 'className');
    if (typeof className === 'string' && className && !index.has(className)) {
      index.set(className, resourceKey);
    }
  }

  return index;
}

/**
 * Build file path → resource keys index.
 * Used to resolve <import from="./path"> elements to the resources
 * defined in the imported file.
 */
function buildFileResourceIndex(graph: ProjectDepGraph): Map<string, string[]> {
  const index = new Map<string, string[]>();
  const evalNodes = graph.nodesByKind('evaluation');

  for (const id of evalNodes) {
    // eval:/src/foo.ts#ClassName → file=/src/foo.ts
    if (!id.startsWith('eval:')) continue;
    const rest = id.slice(5);
    const hashIdx = rest.indexOf('#');
    if (hashIdx === -1) continue;

    const file = rest.slice(0, hashIdx);
    const unitKey = rest.slice(hashIdx + 1);

    // Check if this evaluation produced a recognized resource
    // by looking for observation nodes from this eval
    const obsPrefix = `obs:`;
    const obsNodes = graph.nodesByPrefix(obsPrefix);
    for (const obsId of obsNodes) {
      if (obsId.endsWith(`:${id}`)) {
        // Extract resourceKey from observation
        const inner = obsId.slice(4); // strip 'obs:'
        const lastColonBeforeEval = inner.lastIndexOf(`:${id}`);
        const beforeEval = inner.slice(0, lastColonBeforeEval);
        // beforeEval is "resourceKey:fieldPath"
        const fieldSep = beforeEval.lastIndexOf(':');
        if (fieldSep > 0) {
          const resourceKey = beforeEval.slice(0, fieldSep);
          if (resourceKey.includes(':') && !resourceKey.startsWith('root-registrations')) {
            let fileResources = index.get(file);
            if (!fileResources) {
              fileResources = [];
              index.set(file, fileResources);
            }
            if (!fileResources.includes(resourceKey)) {
              fileResources.push(resourceKey);
            }
          }
        }
      }
    }
  }

  return index;
}

// =============================================================================
// Root Registrations
// =============================================================================

interface RootRegistrationResult {
  resources: Map<string, VisibilityEntry>;
  completeness: ScopeCompleteness;
}

function collectRootRegistrations(
  graph: ProjectDepGraph,
  classNameIndex: Map<string, string>,
  resourceIndex: Map<string, ResourceIdentity>,
): RootRegistrationResult {
  const resources = new Map<string, VisibilityEntry>();
  const gaps: RegistrationGap[] = [];

  // 1. Root registration observations from Aurelia.register() scanning
  const rootRegs = pullConclusionValue(graph, 'root-registrations', 'registrations');
  if (Array.isArray(rootRegs)) {
    for (const ref of rootRegs) {
      if (typeof ref === 'string' && ref.startsWith('class:')) {
        const className = ref.slice(6);
        const resourceKey = classNameIndex.get(className);
        if (resourceKey) {
          const name = resourceKey.slice(resourceKey.indexOf(':') + 1);
          resources.set(name, { resourceKey, lookupLevel: 'root' });
        } else {
          // className not found as a recognized resource.
          // This could be a non-resource registration (service, plugin object)
          // which constitutes a registration gap — we can't determine what
          // resources the registration produces.
          gaps.push({
            site: 'root',
            reason: `opaque-class-ref:${className}`,
          });
        }
      } else if (typeof ref === 'string' && ref.startsWith('gap:')) {
        gaps.push({ site: 'root', reason: ref.slice(4) });
      }
    }
  }

  // 1b. Detect known plugins and add their resource contributions
  if (Array.isArray(rootRegs)) {
    for (const plugin of KNOWN_PLUGIN_RESOURCES) {
      const isRegistered = rootRegs.some((ref: unknown) => {
        if (typeof ref === 'string' && ref.startsWith('class:')) {
          return plugin.identifiers.includes(ref.slice(6));
        }
        return false;
      });

      if (isRegistered) {
        for (const res of plugin.resources) {
          const resourceKey = `${res.kind}:${res.name}`;
          if (!resources.has(res.name)) {
            resources.set(res.name, { resourceKey, lookupLevel: 'root' });
          }
        }
      }
    }
  }

  // 2. Check for root registration gaps from the observation layer
  const rootGaps = pullConclusionValue(graph, 'root-registrations', 'gaps');
  if (Array.isArray(rootGaps)) {
    for (const gap of rootGaps) {
      if (typeof gap === 'string') {
        gaps.push({ site: 'root', reason: gap });
      }
    }
  }

  // 3. Builtin resources from injected fixtures (tier='builtin')
  const observationNodes = graph.nodesByKind('observation');
  const builtinResourceKeys = new Set<string>();
  for (const id of observationNodes) {
    const source = graph.observationSource(id);
    if (source?.tier === 'builtin') {
      // obs:{resourceKey}:{field}:{evalNode}
      // Find the resourceKey by looking for conclusion nodes
      if (id.includes(':name:')) {
        const inner = id.slice(4); // strip 'obs:'
        const nameIdx = inner.indexOf(':name:');
        if (nameIdx > 0) {
          builtinResourceKeys.add(inner.slice(0, nameIdx));
        }
      }
    }
  }

  for (const resourceKey of builtinResourceKeys) {
    const name = resourceKey.slice(resourceKey.indexOf(':') + 1);
    if (!resources.has(name)) {
      resources.set(name, { resourceKey, lookupLevel: 'root' });
    }
  }

  // 4. Standard builtins (product postulates) — always present in root
  for (const builtin of STANDARD_BUILTINS) {
    if (!resources.has(builtin.name)) {
      resources.set(builtin.name, {
        resourceKey: `${builtin.kind}:${builtin.name}`,
        lookupLevel: 'root',
      });
    }
  }

  // 5. Register aliases for all root-registered resources
  const aliasedEntries: [string, VisibilityEntry][] = [];
  for (const [, entry] of resources) {
    const aliases = pullConclusionValue(graph, entry.resourceKey, 'aliases');
    if (Array.isArray(aliases)) {
      for (const alias of aliases) {
        if (typeof alias === 'string' && !resources.has(alias)) {
          aliasedEntries.push([alias, { resourceKey: entry.resourceKey, lookupLevel: 'root' }]);
        }
      }
    }
  }
  for (const [alias, entry] of aliasedEntries) {
    resources.set(alias, entry);
  }

  const completeness: ScopeCompleteness = gaps.length > 0
    ? { state: 'incomplete', gaps }
    : { state: 'complete' };

  return { resources, completeness };
}

// =============================================================================
// Per-Scope Visibility
// =============================================================================

function buildScopeVisibility(
  graph: ProjectDepGraph,
  ceResourceKey: string,
  classNameIndex: Map<string, string>,
  fileResourceIndex: Map<string, string[]>,
  rootResult: RootRegistrationResult,
): { green: ScopeVisibilityGreen; red: ScopeVisibilityRed } {
  const visible = new Map<string, VisibilityEntry>();
  const registrations = new Map<string, RegistrationProvenance>();
  const localGaps: RegistrationGap[] = [];
  const ceName = ceResourceKey.slice('custom-element:'.length);

  // 1. Local registrations from dependencies field
  resolveDependencies(graph, ceResourceKey, classNameIndex, visible, registrations, localGaps);

  // 2. Local registrations from <import from="..."> elements
  resolveTemplateImports(graph, ceResourceKey, fileResourceIndex, visible, registrations);

  // 3. Local registrations from <template as-custom-element="...">
  resolveLocalElements(graph, ceResourceKey, visible, registrations);

  // 4. Root registrations (local takes precedence — shadowing)
  for (const [name, entry] of rootResult.resources) {
    if (!visible.has(name)) {
      visible.set(name, entry);
      registrations.set(name, {
        mechanism: 'root-registration',
        source: { tier: 'analysis-explicit', form: 'root-registration' },
      });
    }
  }

  // 5. Compute completeness
  const allGaps = [...localGaps];
  if (rootResult.completeness.state === 'incomplete') {
    for (const g of rootResult.completeness.gaps) {
      allGaps.push({ site: `root → ${g.site}`, reason: g.reason });
    }
  }

  const completeness: ScopeCompleteness = allGaps.length > 0
    ? { state: 'incomplete', gaps: allGaps }
    : { state: 'complete' };

  return {
    green: { visible, completeness },
    red: { scopeOwner: ceName, registrations },
  };
}

function resolveDependencies(
  graph: ProjectDepGraph,
  ceResourceKey: string,
  classNameIndex: Map<string, string>,
  visible: Map<string, VisibilityEntry>,
  registrations: Map<string, RegistrationProvenance>,
  gaps: RegistrationGap[],
): void {
  const deps = pullConclusionValue(graph, ceResourceKey, 'dependencies');
  if (!Array.isArray(deps)) return;

  for (const ref of deps) {
    if (typeof ref === 'string' && ref.startsWith('class:')) {
      const className = ref.slice(6);
      const resourceKey = classNameIndex.get(className);
      if (resourceKey) {
        const name = resourceKey.slice(resourceKey.indexOf(':') + 1);
        visible.set(name, { resourceKey, lookupLevel: 'local' });
        registrations.set(name, {
          mechanism: 'dependencies-array',
          source: { tier: 'analysis-explicit', form: 'dependencies-array' },
        });
        // Also register aliases — CEs/CAs may have alias names that
        // template tags/attributes reference instead of the primary name
        registerAliases(graph, resourceKey, 'local', visible, registrations);
      }
      // If className not in index: the class wasn't recognized as a resource.
      // Not a gap — it might be a service, DI registration, etc.
    }
  }

  // Check for gaps in the dependencies observation
  const depsCompleteness = pullConclusionValue(graph, ceResourceKey, 'dependencies:completeness');
  if (depsCompleteness !== undefined) {
    gaps.push({ site: ceResourceKey, reason: 'partial-opaque-dependencies' });
  }
}

/**
 * Register a resource's aliases into the visibility map.
 * Aliases point to the same resourceKey as the primary name.
 */
function registerAliases(
  graph: ProjectDepGraph,
  resourceKey: string,
  lookupLevel: 'local' | 'root',
  visible: Map<string, VisibilityEntry>,
  registrations: Map<string, RegistrationProvenance>,
): void {
  const aliases = pullConclusionValue(graph, resourceKey, 'aliases');
  if (!Array.isArray(aliases)) return;

  for (const alias of aliases) {
    if (typeof alias === 'string' && !visible.has(alias)) {
      visible.set(alias, { resourceKey, lookupLevel });
      registrations.set(alias, {
        mechanism: 'alias',
        source: { tier: 'analysis-explicit', form: 'alias' },
      });
    }
  }
}

function resolveTemplateImports(
  graph: ProjectDepGraph,
  ceResourceKey: string,
  fileResourceIndex: Map<string, string[]>,
  visible: Map<string, VisibilityEntry>,
  registrations: Map<string, RegistrationProvenance>,
): void {
  const templateImports = pullConclusionValue(graph, ceResourceKey, 'template-imports');
  if (!Array.isArray(templateImports)) return;

  // Find the CE's own file to resolve relative import paths
  const ceFile = findCeFile(graph, ceResourceKey);

  for (const importPath of templateImports) {
    if (typeof importPath !== 'string') continue;

    // Resolve relative path
    const resolvedPath = ceFile ? resolveRelativePath(ceFile, importPath) : importPath;

    // Find resources defined in the imported file
    const fileResources = fileResourceIndex.get(resolvedPath)
      ?? fileResourceIndex.get(resolvedPath + '.ts')
      ?? fileResourceIndex.get(resolvedPath.replace(/\.ts$/, ''));

    if (fileResources) {
      for (const resourceKey of fileResources) {
        const name = resourceKey.slice(resourceKey.indexOf(':') + 1);
        visible.set(name, { resourceKey, lookupLevel: 'local' });
        registrations.set(name, {
          mechanism: 'import-element',
          source: { tier: 'analysis-explicit', form: 'import-element' },
        });
      }
    }
  }
}

function resolveLocalElements(
  graph: ProjectDepGraph,
  ceResourceKey: string,
  visible: Map<string, VisibilityEntry>,
  registrations: Map<string, RegistrationProvenance>,
): void {
  const localElements = pullConclusionValue(graph, ceResourceKey, 'local-elements');
  if (!Array.isArray(localElements)) return;

  for (const name of localElements) {
    if (typeof name !== 'string') continue;
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

// =============================================================================
// Helpers
// =============================================================================

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

function findCeFile(graph: ProjectDepGraph, ceResourceKey: string): string | undefined {
  // Look for an evaluation node that produced observations for this CE
  const evalNodes = graph.nodesByKind('evaluation');
  for (const id of evalNodes) {
    if (!id.startsWith('eval:')) continue;
    const rest = id.slice(5);
    const hashIdx = rest.indexOf('#');
    if (hashIdx === -1) continue;
    const file = rest.slice(0, hashIdx);

    // Check if this evaluation has observation edges to this resource
    const obsPrefix = `obs:${ceResourceKey}:`;
    const obs = graph.nodesByPrefix(obsPrefix);
    for (const obsId of obs) {
      if (obsId.endsWith(`:${id}`)) return file;
    }
  }
  return undefined;
}

function resolveRelativePath(fromFile: string, importPath: string): string {
  if (!importPath.startsWith('.')) return importPath;

  const fromDir = fromFile.slice(0, fromFile.lastIndexOf('/'));
  const parts = importPath.split('/');
  const resultParts = fromDir.split('/');

  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') { resultParts.pop(); continue; }
    resultParts.push(part);
  }

  return resultParts.join('/');
}
