/**
 * Resource Annotation — Pairing Green + Red Layers
 *
 * Functions that create provenance (red) from resource data (green)
 * for known-origin resources. Builtins have uniform provenance.
 * Manifest-sourced resources have uniform provenance per manifest.
 * Source-analyzed resources have per-field provenance from the
 * interpreter — those are constructed by the graph projection,
 * not by these helpers.
 */

import type {
  ResourceGreen,
  CustomElementGreen,
  CustomAttributeGreen,
  TemplateControllerGreen,
  ValueConverterGreen,
  BindingBehaviorGreen,
  FieldValue,
  EvidenceOrigin,
  DeclarationForm,
  ResourceKind,
} from './types.js';

import type {
  ResourceProvenance,
  FieldProvenance,
  AnnotatedResource,
  SourceLocation,
} from './provenance.js';

// =============================================================================
// Uniform Provenance (builtins, manifests)
// =============================================================================

/**
 * Create a ResourceProvenance with uniform origin on every field.
 *
 * Used for builtins (origin: 'builtin', no location) and manifest
 * entries (origin: 'manifest', location from manifest file).
 *
 * Source-analyzed resources have per-field provenance — they use
 * the graph's per-conclusion Sourced<T> values, not this function.
 */
export function uniformProvenance(
  green: ResourceGreen,
  origin: EvidenceOrigin,
  opts?: {
    declarationForm?: DeclarationForm;
    file?: string;
    package?: string;
    location?: SourceLocation;
  },
): ResourceProvenance {
  const fieldProv: FieldProvenance = {
    origin,
    ...(opts?.location ? { location: opts.location } : {}),
  };

  const fields: Record<string, FieldProvenance> = {};

  // Identity fields are always present
  fields['kind'] = fieldProv;
  fields['name'] = fieldProv;
  fields['className'] = fieldProv;

  // Walk per-kind fields and add provenance for known + unknown fields
  // (absent fields don't get provenance — there's nothing to explain)
  for (const [path, fv] of iterateFields(green)) {
    if (fv.state !== 'absent') {
      fields[path] = fieldProv;
    }
  }

  // Bindable sub-fields
  const bindableRecord = getBindables(green);
  if (bindableRecord) {
    for (const [propName, b] of Object.entries(bindableRecord)) {
      const prefix = `bindable:${propName}`;
      fields[`${prefix}:property`] = fieldProv;
      if (b.attribute.state !== 'absent') fields[`${prefix}:attribute`] = fieldProv;
      if (b.mode.state !== 'absent') fields[`${prefix}:mode`] = fieldProv;
      if (b.primary.state !== 'absent') fields[`${prefix}:primary`] = fieldProv;
      if (b.type.state !== 'absent') fields[`${prefix}:type`] = fieldProv;
    }
  }

  return {
    kind: green.kind,
    name: green.name,
    origin,
    declarationForm: opts?.declarationForm,
    file: opts?.file,
    package: opts?.package,
    fields,
    gaps: {}, // uniform-origin resources have no gaps (builtins are complete)
  };
}

/**
 * Create an AnnotatedResource pairing green + red for a uniform-origin
 * resource.
 */
export function annotate<T extends ResourceGreen>(
  green: T,
  origin: EvidenceOrigin,
  opts?: {
    declarationForm?: DeclarationForm;
    file?: string;
    package?: string;
    location?: SourceLocation;
  },
): AnnotatedResource<T> {
  return {
    green,
    provenance: uniformProvenance(green, origin, opts),
  };
}

/**
 * Annotate all resources in a collection with uniform provenance.
 */
export function annotateAll(
  resources: readonly ResourceGreen[],
  origin: EvidenceOrigin,
  opts?: {
    declarationForm?: DeclarationForm;
    package?: string;
  },
): readonly AnnotatedResource<ResourceGreen>[] {
  return resources.map(r => annotate(r, origin, opts));
}

// =============================================================================
// Field Iteration Helpers
// =============================================================================

/**
 * Iterate all FieldValue fields on a resource green, yielding
 * (fieldPath, fieldValue) pairs.
 */
function* iterateFields(
  green: ResourceGreen,
): Iterable<[string, FieldValue<unknown>]> {
  switch (green.kind) {
    case 'custom-element':
      yield* iterateCEFields(green);
      break;
    case 'custom-attribute':
      yield* iterateCAFields(green);
      break;
    case 'template-controller':
      yield* iterateTCFields(green);
      break;
    case 'value-converter':
      yield* iterateVCFields(green);
      break;
    case 'binding-behavior':
      yield* iterateBBFields(green);
      break;
  }
}

function* iterateCEFields(g: CustomElementGreen): Iterable<[string, FieldValue<unknown>]> {
  yield ['containerless', g.containerless];
  yield ['capture', g.capture];
  yield ['processContent', g.processContent];
  yield ['shadowOptions', g.shadowOptions];
  yield ['template', g.template];
  yield ['enhance', g.enhance];
  yield ['strict', g.strict];
  yield ['aliases', g.aliases];
  yield ['dependencies', g.dependencies];
  yield ['watches', g.watches];
}

function* iterateCAFields(g: CustomAttributeGreen): Iterable<[string, FieldValue<unknown>]> {
  yield ['noMultiBindings', g.noMultiBindings];
  yield ['defaultProperty', g.defaultProperty];
  yield ['aliases', g.aliases];
  yield ['dependencies', g.dependencies];
  yield ['watches', g.watches];
}

function* iterateTCFields(g: TemplateControllerGreen): Iterable<[string, FieldValue<unknown>]> {
  yield ['noMultiBindings', g.noMultiBindings];
  yield ['defaultProperty', g.defaultProperty];
  yield ['containerStrategy', g.containerStrategy];
  yield ['aliases', g.aliases];
  yield ['dependencies', g.dependencies];
  yield ['watches', g.watches];
  if (g.semantics) {
    yield ['semantics', { state: 'known', value: g.semantics } as FieldValue<unknown>];
  }
}

function* iterateVCFields(g: ValueConverterGreen): Iterable<[string, FieldValue<unknown>]> {
  yield ['aliases', g.aliases];
  yield ['fromType', g.fromType];
  yield ['toType', g.toType];
  yield ['hasFromView', g.hasFromView];
  yield ['signals', g.signals];
}

function* iterateBBFields(g: BindingBehaviorGreen): Iterable<[string, FieldValue<unknown>]> {
  yield ['aliases', g.aliases];
  yield ['isFactory', g.isFactory];
}

function getBindables(
  green: ResourceGreen,
): Readonly<Record<string, { property: string; attribute: FieldValue<unknown>; mode: FieldValue<unknown>; primary: FieldValue<unknown>; type: FieldValue<unknown> }>> | null {
  if (green.kind === 'custom-element' || green.kind === 'custom-attribute' || green.kind === 'template-controller') {
    return green.bindables as any;
  }
  return null;
}
