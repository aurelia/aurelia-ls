/**
 * Field Extraction — Per-Field Observation Emission
 *
 * Given a recognized resource and its evaluated value, extracts
 * per-field values and registers observations with the dep graph.
 *
 * Each field extraction follows the same shape:
 * 1. Find the value in the evaluated unit
 * 2. Extract green (structural content, interned)
 * 3. Wrap in Sourced<T> (provenance)
 * 4. Register observation via ObservationRegistrar
 *
 * Intra-source priority resolution (Definition.create() semantics)
 * is applied within a single unit. Cross-source merging is
 * convergence's job.
 */

import type ts from 'typescript';
import type { NormalizedPath } from '../../model/identity.js';
import type { AnalyzableValue, ClassValue } from '../evaluate/value/types.js';
import {
  extractString,
  extractBoolean,
  extractStringArray,
  extractBindingMode,
  getProperty,
  getResolvedValue,
} from '../evaluate/value/types.js';
import type { GreenValue } from '../../value/green.js';
import { extractGreen } from '../../value/extract-green.js';
import { InternPool } from '../../value/intern.js';
import type { Sourced } from '../../value/sourced.js';
import type { ObservationRegistrar, ProjectDepNodeId } from '../deps/types.js';
import type { RecognizedResource } from './recognize.js';

// Shared intern pool for the interpreter session
const internPool = new InternPool();

// =============================================================================
// Per-Kind Field Schemas (F1: absent observation emission)
// =============================================================================

/**
 * Product-relevant fields per resource kind. After extraction, any field
 * in this schema that was NOT emitted gets an explicit absent observation.
 * This implements the T2005 three-state lattice: absent is a successful
 * evaluation result, distinct from "no data" (unknown/gap).
 *
 * Derived from L3 product.md §2.3-§2.8.
 */
const CE_FIELDS = [
  'containerless', 'capture', 'processContent', 'shadowOptions',
  'enhance', 'strict', 'inlineTemplate', 'aliases', 'dependencies',
] as const;

const CA_FIELDS = [
  'noMultiBindings', 'defaultProperty', 'aliases',
] as const;

const TC_FIELDS = [
  'noMultiBindings', 'defaultProperty', 'containerStrategy', 'aliases',
] as const;

const VC_FIELDS = ['aliases'] as const;
const BB_FIELDS = ['aliases'] as const;

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Extract per-field observations from a recognized resource and register them.
 */
export function extractFieldObservations(
  recognized: RecognizedResource,
  value: AnalyzableValue,
  registrar: ObservationRegistrar,
  evalNode: ProjectDepNodeId,
  checker: ts.TypeChecker,
): void {
  if (value.kind !== 'class') return;

  // Track emitted fields for F1 absent observation emission
  const emittedFields = new Set<string>();
  const trackingRegistrar: ObservationRegistrar = {
    registerObservation(resourceKey, fieldPath, source, green, red, evaluationNode) {
      emittedFields.add(fieldPath);
      return registrar.registerObservation(resourceKey, fieldPath, source, green, red, evaluationNode);
    },
  };

  // Always emit identity observations (kind, name, className)
  emitObservation(trackingRegistrar, recognized, 'name', recognized.name, evalNode, value);
  const className = recognized.className ?? (value.kind === 'class' ? value.className : 'anonymous');
  emitObservation(trackingRegistrar, recognized, 'className', className, evalNode, value);
  emitObservation(trackingRegistrar, recognized, 'kind', recognized.kind, evalNode, value);

  // Kind-specific field extraction
  switch (recognized.kind) {
    case 'custom-element':
      extractCustomElementFields(recognized, value, trackingRegistrar, evalNode);
      break;
    case 'custom-attribute':
    case 'template-controller':
      extractCustomAttributeFields(recognized, value, trackingRegistrar, evalNode);
      break;
    case 'value-converter':
      extractValueConverterFields(recognized, value, trackingRegistrar, evalNode);
      break;
    case 'binding-behavior':
      extractBindingBehaviorFields(recognized, value, trackingRegistrar, evalNode);
      break;
  }

  // Extract bindables (shared across CE, CA, TC)
  if (recognized.kind === 'custom-element' ||
      recognized.kind === 'custom-attribute' ||
      recognized.kind === 'template-controller') {
    extractBindableObservations(recognized, value, trackingRegistrar, evalNode);
  }

  // F1: Emit explicit absent observations for product-schema fields
  // that were evaluated and found not specified. Per T2005: absent is
  // a successful evaluation result, not a gap.
  const schemaFields = getSchemaFields(recognized.kind);
  for (const field of schemaFields) {
    if (!emittedFields.has(field)) {
      registrar.registerObservation(
        recognized.resourceKey,
        field,
        recognized.source,
        { kind: 'literal', value: undefined },
        { origin: 'source', state: 'known', value: undefined } as any,
        evalNode,
      );
    }
  }
}

function getSchemaFields(kind: string): readonly string[] {
  switch (kind) {
    case 'custom-element': return CE_FIELDS;
    case 'custom-attribute': return CA_FIELDS;
    case 'template-controller': return TC_FIELDS;
    case 'value-converter': return VC_FIELDS;
    case 'binding-behavior': return BB_FIELDS;
    default: return [];
  }
}

// =============================================================================
// Per-Kind Field Extraction
// =============================================================================

function extractCustomElementFields(
  recognized: RecognizedResource,
  cls: ClassValue,
  registrar: ObservationRegistrar,
  evalNode: ProjectDepNodeId,
): void {
  const config = recognized.config;

  // Scalar fields: first-defined-wins per Definition.create() priority.
  // Priority: 1. sub-decorators (annotations), 2. definition object, 3. static properties
  const emitted = new Set<string>();

  // Priority 1: sub-decorators (highest for scalars)
  for (const dec of cls.decorators) {
    switch (dec.name) {
      case 'containerless':
        emitScalar(registrar, recognized, 'containerless', true, evalNode, cls, emitted);
        break;
      case 'useShadowDOM':
        emitScalar(registrar, recognized, 'shadowOptions', { mode: 'open' as const }, evalNode, cls, emitted);
        break;
      case 'capture':
        emitScalar(registrar, recognized, 'capture', true, evalNode, cls, emitted);
        break;
      case 'processContent':
        emitScalar(registrar, recognized, 'processContent', true, evalNode, cls, emitted);
        break;
    }
  }

  // Priority 2: definition object (decorator arg / $au / define() arg)
  if (config?.kind === 'object') {
    emitScalarIfPresent(registrar, recognized, 'containerless', extractBoolean(getProperty(config, 'containerless')), evalNode, cls, emitted);
    emitScalarIfPresent(registrar, recognized, 'capture', extractPresence(getProperty(config, 'capture')), evalNode, cls, emitted);
    emitScalarIfPresent(registrar, recognized, 'processContent', extractPresence(getProperty(config, 'processContent')), evalNode, cls, emitted);
    emitScalarIfPresent(registrar, recognized, 'enhance', extractBoolean(getProperty(config, 'enhance')), evalNode, cls, emitted);

    // strict is three-valued: true, false, or undefined (absent).
    // undefined means "not specified" which is distinct from false.
    const strictValue = getProperty(config, 'strict');
    if (strictValue) {
      const strictBool = extractBoolean(strictValue);
      if (strictBool !== undefined) {
        emitScalar(registrar, recognized, 'strict', strictBool, evalNode, cls, emitted);
      }
    }

    const shadowOpts = getProperty(config, 'shadowOptions');
    if (shadowOpts) {
      emitScalar(registrar, recognized, 'shadowOptions', extractShadowOptions(shadowOpts), evalNode, cls, emitted);
    }

    const template = extractString(getProperty(config, 'template'));
    if (template !== undefined) {
      emitScalar(registrar, recognized, 'inlineTemplate', template, evalNode, cls, emitted);
    }
  }

  // Priority 3: static $au fields (if not already from decorator config)
  extractStaticAuScalarFields(recognized, cls, registrar, evalNode, emitted);

  // Array fields: merged from all sources (not first-defined-wins)
  // F2: detect opaque expressions and emit gap observations
  emitCollectionField(registrar, recognized, 'aliases', [
    config?.kind === 'object' ? getProperty(config, 'aliases') : undefined,
    cls.staticMembers.get('$au')?.kind === 'object' ? getProperty(cls.staticMembers.get('$au')!, 'aliases') : undefined,
    cls.staticMembers.get('aliases'),
  ], evalNode, cls);

  extractDependencyReferences(registrar, recognized, [
    config?.kind === 'object' ? getProperty(config, 'dependencies') : undefined,
    cls.staticMembers.get('$au')?.kind === 'object' ? getProperty(cls.staticMembers.get('$au')!, 'dependencies') : undefined,
    cls.staticMembers.get('dependencies'),
  ], evalNode, cls);

  // Parse inline template for <import> and <template as-custom-element> elements
  if (config?.kind === 'object') {
    const template = extractString(getProperty(config, 'template'));
    if (template) {
      extractInlineTemplateRegistrations(registrar, recognized, template, evalNode);
    }
  }
}

function extractCustomAttributeFields(
  recognized: RecognizedResource,
  cls: ClassValue,
  registrar: ObservationRegistrar,
  evalNode: ProjectDepNodeId,
): void {
  const config = recognized.config;
  const emitted = new Set<string>();

  // Priority 2: definition object
  if (config?.kind === 'object') {
    emitScalarIfPresent(registrar, recognized, 'noMultiBindings', extractBoolean(getProperty(config, 'noMultiBindings')), evalNode, cls, emitted);
    emitScalarIfPresent(registrar, recognized, 'defaultProperty', extractString(getProperty(config, 'defaultProperty')), evalNode, cls, emitted);
    // TC-specific: containerStrategy
    if (recognized.kind === 'template-controller') {
      emitScalarIfPresent(registrar, recognized, 'containerStrategy', extractString(getProperty(config, 'containerStrategy')), evalNode, cls, emitted);
    }
  }

  // Priority 3: static $au
  extractStaticAuScalarFields(recognized, cls, registrar, evalNode, emitted);

  // Array fields: merged
  emitCollectionField(registrar, recognized, 'aliases', [
    config?.kind === 'object' ? getProperty(config, 'aliases') : undefined,
    cls.staticMembers.get('$au')?.kind === 'object' ? getProperty(cls.staticMembers.get('$au')!, 'aliases') : undefined,
    cls.staticMembers.get('aliases'),
  ], evalNode, cls);
}

function extractValueConverterFields(
  recognized: RecognizedResource,
  cls: ClassValue,
  registrar: ObservationRegistrar,
  evalNode: ProjectDepNodeId,
): void {
  emitCollectionField(registrar, recognized, 'aliases', [
    recognized.config?.kind === 'object' ? getProperty(recognized.config, 'aliases') : undefined,
    cls.staticMembers.get('$au')?.kind === 'object' ? getProperty(cls.staticMembers.get('$au')!, 'aliases') : undefined,
    cls.staticMembers.get('aliases'),
  ], evalNode, cls);
  // fromType/toType require TypeScript type analysis (tier C)
}

function extractBindingBehaviorFields(
  recognized: RecognizedResource,
  cls: ClassValue,
  registrar: ObservationRegistrar,
  evalNode: ProjectDepNodeId,
): void {
  emitCollectionField(registrar, recognized, 'aliases', [
    recognized.config?.kind === 'object' ? getProperty(recognized.config, 'aliases') : undefined,
    cls.staticMembers.get('$au')?.kind === 'object' ? getProperty(cls.staticMembers.get('$au')!, 'aliases') : undefined,
    cls.staticMembers.get('aliases'),
  ], evalNode, cls);
}

// =============================================================================
// Bindable Extraction
// =============================================================================

/**
 * Extract bindable observations from all available sources.
 *
 * Applies Definition.create() intra-source priority for bindables:
 * last-writer-wins (definition > static > annotations > prototype).
 * Within a single unit, the definition object's bindables override
 * decorator-declared bindables for the same property name.
 */
function extractBindableObservations(
  recognized: RecognizedResource,
  cls: ClassValue,
  registrar: ObservationRegistrar,
  evalNode: ProjectDepNodeId,
): void {
  // Collect bindables from all sources, last-writer-wins
  const bindables = new Map<string, {
    name: string;
    attribute?: string;
    mode?: string;
    type?: string;
  }>();

  // Source 1 (lowest priority): @bindable field decorators
  for (const member of cls.bindableMembers) {
    const entry: typeof bindables extends Map<string, infer V> ? V : never = {
      name: member.name,
    };

    // Extract from @bindable(config) args
    if (member.args.length > 0) {
      const arg = member.args[0]!;
      if (arg.kind === 'object') {
        const attr = extractString(getProperty(arg, 'attribute'));
        if (attr) entry.attribute = attr;
        const mode = extractBindingMode(getProperty(arg, 'mode'));
        if (mode) entry.mode = mode;
      }
    }

    if (member.type) entry.type = member.type;
    bindables.set(member.name, entry);
  }

  // Source 2: static bindables = { ... } or static bindables = ['name', ...]
  const staticBindables = cls.staticMembers.get('bindables');
  if (staticBindables?.kind === 'object') {
    for (const [propName, propValue] of staticBindables.properties) {
      if (propValue.kind === 'literal' && propValue.value === true) {
        // Short form: { propName: true }
        bindables.set(propName, { name: propName, ...(bindables.get(propName) ?? {}) });
      } else if (propValue.kind === 'object') {
        // Config form: { propName: { mode: 'twoWay', ... } }
        const existing = bindables.get(propName) ?? { name: propName };
        const attr = extractString(getProperty(propValue, 'attribute'));
        if (attr) existing.attribute = attr;
        const mode = extractBindingMode(getProperty(propValue, 'mode'));
        if (mode) existing.mode = mode;
        bindables.set(propName, existing);
      }
    }
  } else if (staticBindables?.kind === 'array') {
    // Array shorthand: ['propName', ...] — each string is a bindable name
    for (const el of staticBindables.elements) {
      const name = extractString(el);
      if (name) {
        bindables.set(name, { name, ...(bindables.get(name) ?? {}) });
      }
    }
  }

  // Source 3 (highest priority): definition object bindables
  if (recognized.config?.kind === 'object') {
    const configBindables = getProperty(recognized.config, 'bindables');
    if (configBindables?.kind === 'object') {
      for (const [propName, propValue] of configBindables.properties) {
        if (propValue.kind === 'literal' && propValue.value === true) {
          bindables.set(propName, { name: propName, ...(bindables.get(propName) ?? {}) });
        } else if (propValue.kind === 'object') {
          const existing = bindables.get(propName) ?? { name: propName };
          const attr = extractString(getProperty(propValue, 'attribute'));
          if (attr) existing.attribute = attr;
          const mode = extractBindingMode(getProperty(propValue, 'mode'));
          if (mode) existing.mode = mode;
          bindables.set(propName, existing);
        }
      }
    } else if (configBindables?.kind === 'array') {
      // Array shorthand: ['propName', ...] — each string is a bindable name
      for (const el of configBindables.elements) {
        const name = extractString(el);
        if (name) {
          bindables.set(name, { name, ...(bindables.get(name) ?? {}) });
        }
      }
    }
  }

  // Emit per-bindable field observations
  for (const [propName, bindable] of bindables) {
    const prefix = `bindable:${propName}`;
    emitObservation(registrar, recognized, `${prefix}:property`, bindable.name, evalNode, cls);
    if (bindable.attribute) {
      emitObservation(registrar, recognized, `${prefix}:attribute`, bindable.attribute, evalNode, cls);
    }
    if (bindable.mode) {
      emitObservation(registrar, recognized, `${prefix}:mode`, bindable.mode, evalNode, cls);
    }
    if (bindable.type) {
      emitObservation(registrar, recognized, `${prefix}:type`, bindable.type, evalNode, cls);
    }
  }
}

// =============================================================================
// Static $au Scalar Field Extraction (Priority 3)
// =============================================================================

/**
 * Extract scalar fields from static $au at priority 3 (lowest for scalars).
 * Only emits fields not already set by sub-decorators or definition object.
 */
function extractStaticAuScalarFields(
  recognized: RecognizedResource,
  cls: ClassValue,
  registrar: ObservationRegistrar,
  evalNode: ProjectDepNodeId,
  emitted: Set<string>,
): void {
  const au = cls.staticMembers.get('$au');
  if (!au || au.kind !== 'object') return;

  // $au has the same shape as a decorator definition object
  emitScalarIfPresent(registrar, recognized, 'containerless', extractBoolean(getProperty(au, 'containerless')), evalNode, cls, emitted);
  emitScalarIfPresent(registrar, recognized, 'capture', extractPresence(getProperty(au, 'capture')), evalNode, cls, emitted);
  emitScalarIfPresent(registrar, recognized, 'processContent', extractPresence(getProperty(au, 'processContent')), evalNode, cls, emitted);
  emitScalarIfPresent(registrar, recognized, 'enhance', extractBoolean(getProperty(au, 'enhance')), evalNode, cls, emitted);
  emitScalarIfPresent(registrar, recognized, 'noMultiBindings', extractBoolean(getProperty(au, 'noMultiBindings')), evalNode, cls, emitted);

  // strict: three-valued
  const auStrict = getProperty(au, 'strict');
  if (auStrict && !emitted.has('strict')) {
    const strictBool = extractBoolean(auStrict);
    if (strictBool !== undefined) {
      emitScalar(registrar, recognized, 'strict', strictBool, evalNode, cls, emitted);
    }
  }

  const shadowOpts = getProperty(au, 'shadowOptions');
  if (shadowOpts && !emitted.has('shadowOptions')) {
    emitScalar(registrar, recognized, 'shadowOptions', extractShadowOptions(shadowOpts), evalNode, cls, emitted);
  }

  const template = extractString(getProperty(au, 'template'));
  if (template !== undefined && !emitted.has('inlineTemplate')) {
    emitScalar(registrar, recognized, 'inlineTemplate', template, evalNode, cls, emitted);
  }

  // CA/TC-specific fields from $au
  emitScalarIfPresent(registrar, recognized, 'defaultProperty', extractString(getProperty(au, 'defaultProperty')), evalNode, cls, emitted);
  if (recognized.kind === 'template-controller') {
    emitScalarIfPresent(registrar, recognized, 'containerStrategy', extractString(getProperty(au, 'containerStrategy')), evalNode, cls, emitted);
  }
}

// =============================================================================
// Observation Emission Helpers
// =============================================================================

/**
 * Emit an observation for a field. Does NOT check deduplication —
 * use emitScalar for scalar fields that follow first-defined-wins.
 */
function emitObservation<T>(
  registrar: ObservationRegistrar,
  recognized: RecognizedResource,
  fieldPath: string,
  value: T,
  evalNode: ProjectDepNodeId,
  sourceNode: AnalyzableValue,
): void {
  const green = internPool.intern(valueToGreen(value));
  const red = valueToSourced(value, sourceNode, recognized);

  registrar.registerObservation(
    recognized.resourceKey,
    fieldPath,
    recognized.source,
    green,
    red,
    evalNode,
  );
}

/**
 * Emit a scalar observation with first-defined-wins deduplication.
 * If the field has already been emitted, skip silently.
 */
function emitScalar<T>(
  registrar: ObservationRegistrar,
  recognized: RecognizedResource,
  fieldPath: string,
  value: T,
  evalNode: ProjectDepNodeId,
  sourceNode: AnalyzableValue,
  emitted: Set<string>,
): void {
  if (emitted.has(fieldPath)) return;
  emitted.add(fieldPath);
  emitObservation(registrar, recognized, fieldPath, value, evalNode, sourceNode);
}

/**
 * Emit a scalar observation if the value is defined, with deduplication.
 */
function emitScalarIfPresent<T>(
  registrar: ObservationRegistrar,
  recognized: RecognizedResource,
  fieldPath: string,
  value: T | undefined,
  evalNode: ProjectDepNodeId,
  sourceNode: AnalyzableValue,
  emitted: Set<string>,
): void {
  if (value !== undefined) {
    emitScalar(registrar, recognized, fieldPath, value, evalNode, sourceNode, emitted);
  }
}

/**
 * Extract and emit a collection field from multiple sources.
 *
 * F2 fix: detects opaque expressions (non-array values that represent
 * collection fields the system can't evaluate) and emits gap observations
 * instead of silently returning empty arrays.
 *
 * Three-state outcome per source:
 * - undefined (source doesn't mention this field) → skip
 * - extractable array → collect elements
 * - present but opaque (not an array literal) → emit gap
 */
function emitCollectionField(
  registrar: ObservationRegistrar,
  recognized: RecognizedResource,
  fieldPath: string,
  sources: (AnalyzableValue | undefined)[],
  evalNode: ProjectDepNodeId,
  cls: AnalyzableValue,
): void {
  const allElements: string[] = [];
  let hasGap = false;

  for (const source of sources) {
    if (!source) continue; // source doesn't mention this field
    const resolved = getResolvedValue(source);
    if (resolved.kind === 'array') {
      // Extractable array — collect string elements
      for (const el of resolved.elements) {
        const s = extractString(el);
        if (s !== undefined) allElements.push(s);
      }
    } else if (resolved.kind === 'literal' && resolved.value === undefined) {
      // Explicit undefined — skip
    } else if (resolved.kind === 'unknown') {
      // Already a gap from upstream evaluation
      hasGap = true;
    } else {
      // Present but opaque (function call, reference, etc.) — B+C ceiling hit
      hasGap = true;
    }
  }

  if (hasGap) {
    // At least one source had an opaque value → emit gap observation.
    // Even if other sources had extractable values, the union is
    // incomplete (stable-union semantics: unknown poisons the union).
    registrar.registerObservation(
      recognized.resourceKey, fieldPath, recognized.source,
      { kind: 'unknown', reasonKind: 'opaque-expression' },
      { origin: 'source', state: 'unknown' } as any,
      evalNode,
    );
  } else if (allElements.length > 0) {
    emitObservation(registrar, recognized, fieldPath, allElements, evalNode, cls);
  }
  // If no sources mentioned the field and no gaps → nothing to emit (absent)
}

// =============================================================================
// Inline Template Registration Extraction
// =============================================================================

/**
 * Parse an inline template string for <import> and <template as-custom-element>
 * elements. These produce local registration observations on the owning CE.
 */
function extractInlineTemplateRegistrations(
  registrar: ObservationRegistrar,
  recognized: RecognizedResource,
  template: string,
  evalNode: ProjectDepNodeId,
): void {
  // Extract <import from="./path"> elements
  const importRegex = /<import\s+from\s*=\s*"([^"]+)"\s*(?:\/>|><\/import>|>)/g;
  const imports: string[] = [];
  let match;
  while ((match = importRegex.exec(template)) !== null) {
    imports.push(match[1]!);
  }

  if (imports.length > 0) {
    const green = internPool.intern({
      kind: 'array',
      elements: imports.map(ref => ({ kind: 'literal' as const, value: ref })),
    });
    const red: Sourced<unknown> = { origin: 'source', state: 'known', value: imports };

    registrar.registerObservation(
      recognized.resourceKey,
      'template-imports',
      { tier: 'analysis-explicit', form: 'import-element' },
      green,
      red,
      evalNode,
    );
  }

  // Extract <template as-custom-element="name"> elements
  const localRegex = /<template\s+as-custom-element="([^"]+)"/g;
  const localNames: string[] = [];
  while ((match = localRegex.exec(template)) !== null) {
    localNames.push(match[1]!);
  }

  if (localNames.length > 0) {
    const green = internPool.intern({
      kind: 'array',
      elements: localNames.map(name => ({ kind: 'literal' as const, value: name })),
    });
    const red: Sourced<unknown> = { origin: 'source', state: 'known', value: localNames };

    registrar.registerObservation(
      recognized.resourceKey,
      'local-elements',
      { tier: 'analysis-explicit', form: 'as-custom-element' },
      green,
      red,
      evalNode,
    );
  }
}

// =============================================================================
// Dependency Reference Extraction
// =============================================================================

/**
 * Structured dependency reference produced by resolving class references
 * in a CE's `dependencies` array. Each entry identifies a resource that
 * should be locally registered in the owning CE's container.
 *
 * Three outcomes per array element:
 * - resolved → resource key (kind:name)
 * - class-ref → class was found but not recognized as a resource
 * - unresolvable → opaque expression, gap
 */
export type DependencyRef =
  | { refKind: 'resource'; resourceKey: string }
  | { refKind: 'class-ref'; className: string; filePath?: NormalizedPath }
  | { refKind: 'unresolvable'; reason: string };

/**
 * Extract and resolve dependency references from all sources.
 *
 * Unlike `emitCollectionField` (which extracts strings), this function
 * resolves class references to resource identities by running recognition
 * on each resolved ClassValue. This is the bridge between "what class is
 * in the dependencies array" and "what resource does it represent."
 *
 * Three-state outcome per source:
 * - undefined (source doesn't mention this field) → skip
 * - extractable array of class refs → resolve each
 * - present but opaque → emit gap
 */
function extractDependencyReferences(
  registrar: ObservationRegistrar,
  recognized: RecognizedResource,
  sources: (AnalyzableValue | undefined)[],
  evalNode: ProjectDepNodeId,
  cls: AnalyzableValue,
): void {
  const refs: DependencyRef[] = [];
  let hasGap = false;

  for (const source of sources) {
    if (!source) continue;
    const resolved = getResolvedValue(source);

    if (resolved.kind === 'array') {
      for (const el of resolved.elements) {
        const ref = resolveDependencyElement(el);
        if (ref.refKind === 'unresolvable') {
          hasGap = true;
        }
        refs.push(ref);
      }
    } else if (resolved.kind === 'literal' && resolved.value === undefined) {
      // Explicit undefined — skip
    } else if (resolved.kind === 'unknown') {
      hasGap = true;
    } else {
      // Present but opaque
      hasGap = true;
    }
  }

  if (hasGap && refs.length === 0) {
    // All sources are opaque — emit pure gap
    registrar.registerObservation(
      recognized.resourceKey, 'dependencies', recognized.source,
      { kind: 'unknown', reasonKind: 'opaque-dependencies' },
      { origin: 'source', state: 'unknown' } as any,
      evalNode,
    );
    return;
  }

  if (refs.length === 0) {
    // No sources mentioned dependencies — nothing to emit (absent)
    return;
  }

  // Build green value: array of resource keys (resolved) and unknowns (gaps)
  const elements: GreenValue[] = refs.map(ref => {
    switch (ref.refKind) {
      case 'resource':
        return { kind: 'literal' as const, value: ref.resourceKey };
      case 'class-ref':
        // Class found but not recognized as resource — still a valid dep ref,
        // emit as a class identifier so downstream can attempt resolution
        return { kind: 'literal' as const, value: `class:${ref.className}` };
      case 'unresolvable':
        return { kind: 'unknown' as const, reasonKind: ref.reason };
    }
  });

  const green = internPool.intern({ kind: 'array', elements });
  const redValue = refs.map(ref =>
    ref.refKind === 'resource' ? ref.resourceKey :
    ref.refKind === 'class-ref' ? `class:${ref.className}` :
    `<unresolvable:${ref.reason}>`
  );
  const red: Sourced<unknown> = { origin: 'source', state: 'known', value: redValue };

  registrar.registerObservation(
    recognized.resourceKey, 'dependencies', recognized.source,
    green, red, evalNode,
  );

  // If there were gaps mixed in, also emit a gap marker for completeness tracking
  if (hasGap) {
    registrar.registerObservation(
      recognized.resourceKey, 'dependencies:completeness', recognized.source,
      { kind: 'unknown', reasonKind: 'partial-opaque-dependencies' },
      { origin: 'source', state: 'unknown' } as any,
      evalNode,
    );
  }
}

/**
 * Resolve a single element from a `dependencies` array to a DependencyRef.
 *
 * Follows reference/import chains to find the resolved value.
 * If it's a ClassValue, records its identity as a class-ref. The scope-
 * visibility callback will match these to recognized resources via the graph.
 *
 * Note: We can't run recognizeResource here because file-scope class bindings
 * are skeleton ClassValues (empty decorators/statics). The full extraction
 * happens separately in evaluateUnit. Instead we capture the class identity
 * and let the scope-visibility layer match className → resource.
 */
function resolveDependencyElement(element: AnalyzableValue): DependencyRef {
  const resolved = getResolvedValue(element);

  if (resolved.kind === 'class') {
    // Class found — record identity for downstream matching
    return { refKind: 'class-ref', className: resolved.className, filePath: resolved.filePath };
  }

  // Unresolved reference — the class name is known but value wasn't resolved
  if (element.kind === 'reference' && !element.resolved) {
    return { refKind: 'class-ref', className: element.name };
  }

  // Unresolved import — cross-file dependency couldn't be followed
  if (element.kind === 'import' && !element.resolved) {
    return { refKind: 'unresolvable', reason: 'unresolved-import' };
  }

  // Unknown or opaque expression
  if (resolved.kind === 'unknown') {
    return { refKind: 'unresolvable', reason: resolved.reason.why.kind };
  }

  return { refKind: 'unresolvable', reason: 'opaque-expression' };
}

function valueToGreen(value: unknown): GreenValue {
  if (value === null || value === undefined || typeof value === 'string' ||
      typeof value === 'number' || typeof value === 'boolean') {
    return { kind: 'literal', value: value as string | number | boolean | null | undefined };
  }
  if (Array.isArray(value)) {
    return { kind: 'array', elements: value.map(valueToGreen) };
  }
  if (typeof value === 'object') {
    const props = new Map<string, GreenValue>();
    for (const [k, v] of Object.entries(value)) {
      props.set(k, valueToGreen(v));
    }
    return { kind: 'object', properties: props, methods: new Map() };
  }
  return { kind: 'unknown', reasonKind: 'unsupported-value' };
}

/**
 * Create a Sourced<T> red wrapper with proper file path provenance.
 */
function valueToSourced<T>(
  value: T,
  sourceNode: AnalyzableValue,
  recognized: RecognizedResource,
): Sourced<T> {
  // Use the class's filePath for location provenance
  const filePath = sourceNode.kind === 'class' ? sourceNode.filePath : undefined;
  const location = sourceNode.span && filePath
    ? { file: filePath, pos: sourceNode.span.start, end: sourceNode.span.end }
    : undefined;

  return location
    ? { origin: 'source', state: 'known', value, location }
    : { origin: 'source', state: 'known', value };
}

/**
 * Extract a "presence" boolean: returns true if the value is present and not
 * explicitly false/null/undefined. Used for processContent and capture where
 * the value may be a function reference (tier D opaque) but its presence
 * is still meaningful at tier B.
 */
function extractPresence(value: AnalyzableValue | undefined): boolean | undefined {
  if (!value) return undefined;
  const resolved = getResolvedValue(value);
  // Explicitly false/null/undefined → false
  if (resolved.kind === 'literal') {
    if (resolved.value === false || resolved.value === null || resolved.value === undefined) return undefined;
    return true;
  }
  // Function, reference, class, object, etc. → true (something is there)
  if (resolved.kind === 'unknown') return undefined;
  return true;
}

function extractShadowOptions(value: AnalyzableValue): { mode: 'open' | 'closed' } | undefined {
  if (value.kind === 'object') {
    const mode = extractString(getProperty(value, 'mode'));
    if (mode === 'open' || mode === 'closed') return { mode };
  }
  if (value.kind === 'literal' && value.value === null) return undefined;
  return { mode: 'open' }; // default when shadowOptions is truthy
}
