/**
 * Graph Conclusions -> ResourceCatalogGreen
 *
 * STATUS: promoted from test harness (harness.ts:1495-1696)
 * DEPENDS ON: core/graph/types, core/resource/types, core/resource/builtins
 * CONSUMED BY: core/project/discovery
 *
 * Reads per-field conclusion nodes from the reactive graph and assembles
 * them into ResourceGreen types. This is the projection from the graph's
 * internal representation (node IDs, GreenValue, Sourced<T>) to the
 * consumer-facing green resource types (ResourceCatalogGreen).
 *
 * NOT YET ADDRESSED:
 * - Incremental rebuild (currently full scan of all conclusions)
 * - TC semantics sourcing (currently falls back to builtin catalog)
 */

import type { ProjectDepGraph } from '../graph/types.js';
import { conclusionNodeId } from '../graph/types.js';
import type { Sourced } from '../../value/sourced.js';
import type { BindingMode } from '../../model/ir.js';
import type {
  ResourceKind,
  ResourceGreen,
  ResourceCatalogGreen,
  FieldValue,
  BindableGreen,
  CustomElementGreen,
  CustomAttributeGreen,
  TemplateControllerGreen,
  ValueConverterGreen,
  BindingBehaviorGreen,
  CaptureValue,
  ProcessContentValue,
  ShadowOptions,
  DependencyRef,
  WatchDefinition,
} from './types.js';
import { buildCatalog } from './catalog.js';
import { BUILTIN_RESOURCES } from './builtins.js';

// =============================================================================
// Entry Point
// =============================================================================

export function graphToResourceCatalog(
  graph: ProjectDepGraph,
): ResourceCatalogGreen {
  // Step 1: Find all resources by scanning conclusion nodes
  const resourceKeys = new Set<string>();
  const conclusionNodes = graph.nodesByPrefix('conclusion:');

  for (const nodeId of conclusionNodes) {
    const afterConclusion = nodeId.slice('conclusion:'.length);
    const separatorIdx = afterConclusion.indexOf('::');
    if (separatorIdx > 0) {
      resourceKeys.add(afterConclusion.slice(0, separatorIdx));
    }
  }

  // Step 2: For each resource, assemble a ResourceGreen
  const resources: ResourceGreen[] = [];

  for (const resourceKey of resourceKeys) {
    if (!resourceKey.includes(':')) continue;

    const colonIdx = resourceKey.indexOf(':');
    const kindStr = resourceKey.slice(0, colonIdx);
    const name = resourceKey.slice(colonIdx + 1);

    if (!isResourceKind(kindStr)) continue;

    const green = assembleResourceGreen(graph, resourceKey, kindStr, name);
    if (green) resources.push(green);
  }

  // Step 3: Merge with builtins using per-field lattice join.
  // Resource model L1: absent < unknown < known. When source has a
  // field as absent (not observed), the builtin's value survives.
  // When source has known or unknown, source wins (higher evidence tier).
  const builtinCatalog = buildCatalog(BUILTIN_RESOURCES);
  const sourceCatalog = buildCatalog(resources);

  return {
    elements: mergeCatalogSection(builtinCatalog.elements, sourceCatalog.elements),
    attributes: mergeCatalogSection(builtinCatalog.attributes, sourceCatalog.attributes),
    controllers: mergeCatalogSection(builtinCatalog.controllers, sourceCatalog.controllers),
    valueConverters: mergeCatalogSection(builtinCatalog.valueConverters, sourceCatalog.valueConverters),
    bindingBehaviors: mergeCatalogSection(builtinCatalog.bindingBehaviors, sourceCatalog.bindingBehaviors),
  };
}

// =============================================================================
// Helpers
// =============================================================================

function isResourceKind(s: string): s is ResourceKind {
  return s === 'custom-element' || s === 'custom-attribute' ||
    s === 'template-controller' || s === 'value-converter' ||
    s === 'binding-behavior';
}

function pullRed(
  graph: ProjectDepGraph,
  resourceKey: string,
  fieldPath: string,
): Sourced<unknown> | undefined {
  const concId = conclusionNodeId(resourceKey, fieldPath);
  return graph.evaluation.pull<unknown>(concId);
}

function extractValue<T>(sourced: Sourced<T> | undefined): T | undefined {
  if (!sourced) return undefined;
  if (sourced.origin === 'source') {
    return sourced.state === 'known' ? sourced.value : undefined;
  }
  return sourced.value;
}

function readField<T>(
  graph: ProjectDepGraph,
  resourceKey: string,
  fieldPath: string,
): FieldValue<T> {
  const sourced = pullRed(graph, resourceKey, fieldPath);
  if (!sourced) return { state: 'absent' };

  if (sourced.origin === 'source' && sourced.state === 'unknown') {
    return { state: 'unknown', reasonKind: 'opaque-expression' };
  }

  const value = sourced.origin === 'source'
    ? (sourced.state === 'known' ? sourced.value : undefined)
    : sourced.value;

  if (value === undefined) return { state: 'absent' };
  return { state: 'known', value: value as T };
}

function readBindables(
  graph: ProjectDepGraph,
  resourceKey: string,
): Readonly<Record<string, BindableGreen>> {
  const prefix = `conclusion:${resourceKey}::bindable:`;
  const nodes = graph.nodesByPrefix(prefix);
  const bindableNames = new Set<string>();

  for (const nodeId of nodes) {
    const afterPrefix = nodeId.slice(prefix.length);
    const colonIdx = afterPrefix.indexOf(':');
    if (colonIdx > 0) {
      bindableNames.add(afterPrefix.slice(0, colonIdx));
    }
  }

  const result: Record<string, BindableGreen> = {};
  for (const propName of bindableNames) {
    const property = extractValue(pullRed(graph, resourceKey, `bindable:${propName}:property`));
    const attribute = readField<string>(graph, resourceKey, `bindable:${propName}:attribute`);
    const mode = readField<BindingMode>(graph, resourceKey, `bindable:${propName}:mode`);
    const primary = readField<boolean>(graph, resourceKey, `bindable:${propName}:primary`);
    const type = readField<string>(graph, resourceKey, `bindable:${propName}:type`);

    // Preserve absent for all bindable fields — the lattice join with
    // builtins fills in defaults where they exist. Turning absent into
    // known(defaultValue) here conflates "not observed" with "observed
    // as the default," which is semantically wrong per resource model L1
    // and prevents builtin values from surviving the merge.
    result[propName] = {
      property: typeof property === 'string' ? property : propName,
      attribute,
      mode,
      primary,
      type,
    };
  }
  return result;
}

// =============================================================================
// Per-Kind Assembly
// =============================================================================

function assembleResourceGreen(
  graph: ProjectDepGraph,
  resourceKey: string,
  kind: ResourceKind,
  name: string,
): ResourceGreen | null {
  const className = extractValue(pullRed(graph, resourceKey, 'className'));
  if (typeof className !== 'string') return null;

  switch (kind) {
    case 'custom-element': {
      const bindables = readBindables(graph, resourceKey);
      return {
        kind: 'custom-element',
        name,
        className,
        containerless: readField<boolean>(graph, resourceKey, 'containerless'),
        capture: readField<CaptureValue>(graph, resourceKey, 'capture'),
        processContent: readField<ProcessContentValue>(graph, resourceKey, 'processContent'),
        shadowOptions: readField<ShadowOptions | null>(graph, resourceKey, 'shadowOptions'),
        template: readField<string>(graph, resourceKey, 'inlineTemplate'),
        enhance: readField<boolean>(graph, resourceKey, 'enhance'),
        strict: readField<boolean | undefined>(graph, resourceKey, 'strict'),
        aliases: readField<readonly string[]>(graph, resourceKey, 'aliases'),
        dependencies: readField<readonly DependencyRef[]>(graph, resourceKey, 'dependencies'),
        watches: readField<readonly WatchDefinition[]>(graph, resourceKey, 'watches'),
        bindables,
      } satisfies CustomElementGreen;
    }

    case 'custom-attribute': {
      const bindables = readBindables(graph, resourceKey);
      return {
        kind: 'custom-attribute',
        name,
        className,
        noMultiBindings: readField<boolean>(graph, resourceKey, 'noMultiBindings'),
        defaultProperty: readField<string>(graph, resourceKey, 'defaultProperty'),
        aliases: readField<readonly string[]>(graph, resourceKey, 'aliases'),
        dependencies: readField<readonly DependencyRef[]>(graph, resourceKey, 'dependencies'),
        watches: readField<readonly WatchDefinition[]>(graph, resourceKey, 'watches'),
        bindables,
      } satisfies CustomAttributeGreen;
    }

    case 'template-controller': {
      const bindables = readBindables(graph, resourceKey);
      const builtinCatalog = buildCatalog(BUILTIN_RESOURCES);
      const builtinTc = builtinCatalog.controllers[name];
      return {
        kind: 'template-controller',
        name,
        className,
        noMultiBindings: readField<boolean>(graph, resourceKey, 'noMultiBindings'),
        defaultProperty: readField<string>(graph, resourceKey, 'defaultProperty'),
        containerStrategy: readField<'reuse' | 'new'>(graph, resourceKey, 'containerStrategy'),
        aliases: readField<readonly string[]>(graph, resourceKey, 'aliases'),
        dependencies: readField<readonly DependencyRef[]>(graph, resourceKey, 'dependencies'),
        watches: readField<readonly WatchDefinition[]>(graph, resourceKey, 'watches'),
        bindables,
        semantics: builtinTc?.semantics ?? null,
      } satisfies TemplateControllerGreen;
    }

    case 'value-converter':
      return {
        kind: 'value-converter',
        name,
        className,
        aliases: readField<readonly string[]>(graph, resourceKey, 'aliases'),
        fromType: readField<string>(graph, resourceKey, 'fromType'),
        toType: readField<string>(graph, resourceKey, 'toType'),
        hasFromView: readField<boolean>(graph, resourceKey, 'hasFromView'),
        signals: readField<readonly string[]>(graph, resourceKey, 'signals'),
      } satisfies ValueConverterGreen;

    case 'binding-behavior':
      return {
        kind: 'binding-behavior',
        name,
        className,
        aliases: readField<readonly string[]>(graph, resourceKey, 'aliases'),
        isFactory: readField<boolean>(graph, resourceKey, 'isFactory'),
      } satisfies BindingBehaviorGreen;

    default:
      return null;
  }
}

// =============================================================================
// Per-Field Lattice Merge (Resource Model L1 §Information Lattice)
// =============================================================================

/**
 * Lattice join for a single FieldValue.
 *
 * The information lattice: absent < unknown < known.
 * join(absent, x) = x — absent is bottom, any information wins.
 * join(x, absent) = x — symmetric.
 * join(known_source, known_builtin) = known_source — source has higher
 * evidence tier than builtin.
 */
function joinField<T>(source: FieldValue<T>, builtin: FieldValue<T>): FieldValue<T> {
  if (source.state === 'absent') return builtin;
  return source;
}

/**
 * Merge per-bindable records using per-field lattice join.
 */
function joinBindables(
  source: Readonly<Record<string, BindableGreen>>,
  builtin: Readonly<Record<string, BindableGreen>>,
): Readonly<Record<string, BindableGreen>> {
  const result: Record<string, BindableGreen> = { ...builtin };
  for (const [name, srcB] of Object.entries(source)) {
    const builtinB = builtin[name];
    if (builtinB) {
      result[name] = {
        property: srcB.property,
        attribute: joinField(srcB.attribute, builtinB.attribute),
        mode: joinField(srcB.mode, builtinB.mode),
        primary: joinField(srcB.primary, builtinB.primary),
        type: joinField(srcB.type, builtinB.type),
        ...(srcB.doc !== undefined ? { doc: srcB.doc } : builtinB.doc !== undefined ? { doc: builtinB.doc } : {}),
      };
    } else {
      result[name] = srcB;
    }
  }
  return result;
}

/**
 * Merge two ResourceGreen of the same kind using per-field lattice join.
 * Source fields override builtin fields except when source is absent.
 */
function joinResourceFields(source: ResourceGreen, builtin: ResourceGreen): ResourceGreen {
  if (source.kind !== builtin.kind) return source;

  switch (source.kind) {
    case 'custom-element': {
      const b = builtin as CustomElementGreen;
      return {
        ...source,
        containerless: joinField(source.containerless, b.containerless),
        capture: joinField(source.capture, b.capture),
        processContent: joinField(source.processContent, b.processContent),
        shadowOptions: joinField(source.shadowOptions, b.shadowOptions),
        template: joinField(source.template, b.template),
        enhance: joinField(source.enhance, b.enhance),
        strict: joinField(source.strict, b.strict),
        aliases: joinField(source.aliases, b.aliases),
        dependencies: joinField(source.dependencies, b.dependencies),
        watches: joinField(source.watches, b.watches),
        bindables: joinBindables(source.bindables, b.bindables),
      };
    }

    case 'custom-attribute': {
      const b = builtin as CustomAttributeGreen;
      return {
        ...source,
        noMultiBindings: joinField(source.noMultiBindings, b.noMultiBindings),
        defaultProperty: joinField(source.defaultProperty, b.defaultProperty),
        aliases: joinField(source.aliases, b.aliases),
        dependencies: joinField(source.dependencies, b.dependencies),
        watches: joinField(source.watches, b.watches),
        bindables: joinBindables(source.bindables, b.bindables),
      };
    }

    case 'template-controller': {
      const b = builtin as TemplateControllerGreen;
      return {
        ...source,
        noMultiBindings: joinField(source.noMultiBindings, b.noMultiBindings),
        defaultProperty: joinField(source.defaultProperty, b.defaultProperty),
        containerStrategy: joinField(source.containerStrategy, b.containerStrategy),
        aliases: joinField(source.aliases, b.aliases),
        dependencies: joinField(source.dependencies, b.dependencies),
        watches: joinField(source.watches, b.watches),
        bindables: joinBindables(source.bindables, b.bindables),
        semantics: source.semantics ?? b.semantics,
      };
    }

    case 'value-converter': {
      const b = builtin as ValueConverterGreen;
      return {
        ...source,
        aliases: joinField(source.aliases, b.aliases),
        fromType: joinField(source.fromType, b.fromType),
        toType: joinField(source.toType, b.toType),
        hasFromView: joinField(source.hasFromView, b.hasFromView),
        signals: joinField(source.signals, b.signals),
      };
    }

    case 'binding-behavior': {
      const b = builtin as BindingBehaviorGreen;
      return {
        ...source,
        aliases: joinField(source.aliases, b.aliases),
        isFactory: joinField(source.isFactory, b.isFactory),
      };
    }

    default:
      return source;
  }
}

/**
 * Merge a catalog section using per-field lattice join.
 * Source entries override builtin entries. For resources that exist in
 * both, per-field join preserves builtin values where source is absent.
 */
function mergeCatalogSection<T extends ResourceGreen>(
  builtins: Readonly<Record<string, T>>,
  source: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> {
  const result: Record<string, T> = { ...builtins };
  for (const [name, srcRes] of Object.entries(source)) {
    const builtinRes = builtins[name];
    if (builtinRes) {
      result[name] = joinResourceFields(srcRes, builtinRes) as T;
    } else {
      result[name] = srcRes;
    }
  }
  return result;
}
