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

  // Always emit identity observation (kind + name)
  emitObservation(registrar, recognized, 'name', recognized.name, evalNode, value);

  // Kind-specific field extraction
  switch (recognized.kind) {
    case 'custom-element':
      extractCustomElementFields(recognized, value, registrar, evalNode);
      break;
    case 'custom-attribute':
    case 'template-controller':
      extractCustomAttributeFields(recognized, value, registrar, evalNode);
      break;
    case 'value-converter':
      extractValueConverterFields(recognized, value, registrar, evalNode);
      break;
    case 'binding-behavior':
      extractBindingBehaviorFields(recognized, value, registrar, evalNode);
      break;
  }

  // Extract bindables (shared across CE, CA, TC)
  if (recognized.kind === 'custom-element' ||
      recognized.kind === 'custom-attribute' ||
      recognized.kind === 'template-controller') {
    extractBindableObservations(recognized, value, registrar, evalNode);
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
    emitScalarIfPresent(registrar, recognized, 'capture', extractBoolean(getProperty(config, 'capture')), evalNode, cls, emitted);
    emitScalarIfPresent(registrar, recognized, 'processContent', extractBoolean(getProperty(config, 'processContent')), evalNode, cls, emitted);

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
  const aliases: string[] = [];
  const deps: string[] = [];
  if (config?.kind === 'object') {
    aliases.push(...extractStringArray(getProperty(config, 'aliases')));
    deps.push(...extractStringArray(getProperty(config, 'dependencies')));
  }
  // Merge from static $au if present
  const au = cls.staticMembers.get('$au');
  if (au?.kind === 'object') {
    aliases.push(...extractStringArray(getProperty(au, 'aliases')));
    deps.push(...extractStringArray(getProperty(au, 'dependencies')));
  }
  if (aliases.length > 0) {
    emitObservation(registrar, recognized, 'aliases', aliases, evalNode, cls);
  }
  if (deps.length > 0) {
    emitObservation(registrar, recognized, 'dependencies', deps, evalNode, cls);
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
  }

  // Priority 3: static $au
  extractStaticAuScalarFields(recognized, cls, registrar, evalNode, emitted);

  // Array fields: merged
  const aliases: string[] = [];
  if (config?.kind === 'object') {
    aliases.push(...extractStringArray(getProperty(config, 'aliases')));
  }
  const au = cls.staticMembers.get('$au');
  if (au?.kind === 'object') {
    aliases.push(...extractStringArray(getProperty(au, 'aliases')));
  }
  if (aliases.length > 0) {
    emitObservation(registrar, recognized, 'aliases', aliases, evalNode, cls);
  }
}

function extractValueConverterFields(
  _recognized: RecognizedResource,
  _cls: ClassValue,
  _registrar: ObservationRegistrar,
  _evalNode: ProjectDepNodeId,
): void {
  // VC has minimal fields (name only, already emitted)
  // fromType/toType require TypeScript type analysis (tier C)
}

function extractBindingBehaviorFields(
  _recognized: RecognizedResource,
  _cls: ClassValue,
  _registrar: ObservationRegistrar,
  _evalNode: ProjectDepNodeId,
): void {
  // BB has minimal fields (name only, already emitted)
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
    primary?: boolean;
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
        const primary = extractBoolean(getProperty(arg, 'primary'));
        if (primary !== undefined) entry.primary = primary;
      }
    }

    if (member.type) entry.type = member.type;
    bindables.set(member.name, entry);
  }

  // Source 2: static bindables = { ... }
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
        const primary = extractBoolean(getProperty(propValue, 'primary'));
        if (primary !== undefined) existing.primary = primary;
        bindables.set(propName, existing);
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
          const primary = extractBoolean(getProperty(propValue, 'primary'));
          if (primary !== undefined) existing.primary = primary;
          bindables.set(propName, existing);
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
    if (bindable.primary !== undefined) {
      emitObservation(registrar, recognized, `${prefix}:primary`, bindable.primary, evalNode, cls);
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
  emitScalarIfPresent(registrar, recognized, 'capture', extractBoolean(getProperty(au, 'capture')), evalNode, cls, emitted);
  emitScalarIfPresent(registrar, recognized, 'processContent', extractBoolean(getProperty(au, 'processContent')), evalNode, cls, emitted);
  emitScalarIfPresent(registrar, recognized, 'noMultiBindings', extractBoolean(getProperty(au, 'noMultiBindings')), evalNode, cls, emitted);

  const shadowOpts = getProperty(au, 'shadowOptions');
  if (shadowOpts && !emitted.has('shadowOptions')) {
    emitScalar(registrar, recognized, 'shadowOptions', extractShadowOptions(shadowOpts), evalNode, cls, emitted);
  }

  const template = extractString(getProperty(au, 'template'));
  if (template !== undefined && !emitted.has('inlineTemplate')) {
    emitScalar(registrar, recognized, 'inlineTemplate', template, evalNode, cls, emitted);
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

function extractShadowOptions(value: AnalyzableValue): { mode: 'open' | 'closed' } | undefined {
  if (value.kind === 'object') {
    const mode = extractString(getProperty(value, 'mode'));
    if (mode === 'open' || mode === 'closed') return { mode };
  }
  if (value.kind === 'literal' && value.value === null) return undefined;
  return { mode: 'open' }; // default when shadowOptions is truthy
}
