import type {
  AttrRes,
  AttributePatternConfig,
  AttributePatternDef,
  Bindable,
  BindableDef,
  BindingBehaviorDef,
  BindingBehaviorSig,
  BindingCommandConfig,
  BindingCommandDef,
  ControllerConfig,
  CustomAttributeDef,
  CustomElementDef,
  ElementRes,
  ResourceCollections,
  ResourceGapSummary,
  ProjectSemantics,
  Sourced,
  TemplateControllerDef,
  TypeRef,
  ValueConverterDef,
  ValueConverterSig,
} from "../schema/types.js";
import { unwrapSourced as unwrapSourcedValue } from "../schema/sourced.js";

// ── Gap counting ────────────────────────────────────────────────────────
//
// Counts gapped fields on resource defs by walking Sourced<T> fields.
// A field is gapped when origin: 'source' and state: 'unknown'.
// Intrinsic gaps are fields beyond the B+C operating tier — their values
// can only come from manifests/declarations, not source analysis.

function isGapped(field: Sourced<unknown> | undefined): boolean {
  if (!field) return false; // absent field — not a gap (field not applicable)
  return 'state' in field && field.state === 'unknown';
}

/** Fields on CustomElementDef that are beyond B+C tier (mandatory-declaration). */
const CE_INTRINSIC_FIELDS = new Set(['capture', 'processContent', 'boundary']);

function countElementGaps(def: CustomElementDef): ResourceGapSummary {
  const fields: [string, Sourced<unknown> | undefined][] = [
    ['name', def.name],
    ['containerless', def.containerless],
    ['shadowOptions', def.shadowOptions],
    ['capture', def.capture],
    ['processContent', def.processContent],
    ['boundary', def.boundary],
  ];
  let total = 0;
  let intrinsic = 0;
  for (const [name, field] of fields) {
    if (isGapped(field)) {
      total++;
      if (CE_INTRINSIC_FIELDS.has(name)) intrinsic++;
    }
  }
  // Count gapped bindable defs
  for (const bindable of Object.values(def.bindables)) {
    if (isGapped(bindable.property)) total++;
  }
  return { total, intrinsic };
}

function countAttributeGaps(def: CustomAttributeDef): ResourceGapSummary {
  const fields: Sourced<unknown>[] = [def.name, def.noMultiBindings];
  let total = 0;
  for (const field of fields) {
    if (isGapped(field)) total++;
  }
  for (const bindable of Object.values(def.bindables)) {
    if (isGapped(bindable.property)) total++;
  }
  // CA has no intrinsic fields at B+C tier
  return { total, intrinsic: 0 };
}

function countValueConverterGaps(def: ValueConverterDef): ResourceGapSummary {
  let total = 0;
  if (isGapped(def.name)) total++;
  // VC type signatures (fromType, toType) are source-derivable at tier C
  if (def.fromType && isGapped(def.fromType)) total++;
  if (def.toType && isGapped(def.toType)) total++;
  return { total, intrinsic: 0 };
}

function countBindingBehaviorGaps(def: BindingBehaviorDef): ResourceGapSummary {
  let total = 0;
  if (isGapped(def.name)) total++;
  return { total, intrinsic: 0 };
}

export function unwrapSourced<T>(value: Sourced<T> | undefined): T | undefined {
  return unwrapSourcedValue(value);
}

export function toTypeRefOptional(typeName: string | undefined): TypeRef | undefined {
  if (!typeName) return undefined;
  const trimmed = typeName.trim();
  if (!trimmed) return undefined;
  if (trimmed === "any") return { kind: "any" };
  if (trimmed === "unknown") return { kind: "unknown" };
  return { kind: "ts", name: trimmed };
}

export function toTypeRef(typeName: string | undefined): TypeRef {
  return toTypeRefOptional(typeName) ?? { kind: "unknown" };
}

export function toBindable(def: BindableDef, fallbackName: string): Bindable {
  const name = unwrapSourced(def.property) ?? fallbackName;
  const attribute = unwrapSourced(def.attribute);
  const mode = unwrapSourced(def.mode);
  const primary = unwrapSourced(def.primary);
  const type = toTypeRefOptional(unwrapSourced(def.type));
  const doc = unwrapSourced(def.doc);

  return {
    name,
    ...(attribute ? { attribute } : {}),
    ...(mode ? { mode } : {}),
    ...(primary !== undefined ? { primary } : {}),
    ...(type ? { type } : {}),
    ...(doc ? { doc } : {}),
  };
}

export function toBindableRecord(defs: Readonly<Record<string, BindableDef>>): Record<string, Bindable> {
  const record: Record<string, Bindable> = {};
  for (const [key, def] of Object.entries(defs)) {
    const bindable = toBindable(def, key);
    record[bindable.name] = bindable;
  }
  return record;
}

export function findPrimaryBindableName(defs: Readonly<Record<string, BindableDef>>): string | null {
  for (const [key, def] of Object.entries(defs)) {
    const isPrimary = unwrapSourced(def.primary);
    if (isPrimary) return unwrapSourced(def.property) ?? key;
  }
  return null;
}

export function toElementRes(def: CustomElementDef): ElementRes {
  const name = unwrapSourced(def.name) ?? "";
  const aliases = def.aliases
    .map(a => unwrapSourced(a))
    .filter((a): a is string => !!a);

  const containerless = unwrapSourced(def.containerless);
  const shadowOptions = unwrapSourced(def.shadowOptions);
  const capture = unwrapSourced(def.capture);
  const processContent = unwrapSourced(def.processContent);
  const boundary = unwrapSourced(def.boundary);
  const deps = def.dependencies
    .map(d => unwrapSourced(d))
    .filter((d): d is string => !!d);
  const className = unwrapSourced(def.className);
  return {
    kind: "element",
    name,
    bindables: toBindableRecord(def.bindables),
    ...(aliases.length > 0 ? { aliases } : {}),
    ...(containerless !== undefined ? { containerless } : {}),
    ...(shadowOptions !== undefined ? { shadowOptions } : {}),
    ...(capture !== undefined ? { capture } : {}),
    ...(processContent !== undefined ? { processContent } : {}),
    ...(boundary !== undefined ? { boundary } : {}),
    ...(deps.length > 0 ? { dependencies: deps } : {}),
    ...(className ? { className } : {}),
    ...(def.file ? { file: def.file } : {}),
    ...(def.package ? { package: def.package } : {}),
    origin: def.className.origin,
    ...(def.declarationForm ? { declarationForm: def.declarationForm } : {}),
    gaps: countElementGaps(def),
  };
}

export function toAttrRes(def: CustomAttributeDef): AttrRes {
  const name = unwrapSourced(def.name) ?? "";
  const aliases = def.aliases
    .map(a => unwrapSourced(a))
    .filter((a): a is string => !!a);
  const primary = unwrapSourced(def.primary) ?? findPrimaryBindableName(def.bindables) ?? undefined;

  const noMultiBindings = unwrapSourced(def.noMultiBindings);
  const deps = def.dependencies
    .map(d => unwrapSourced(d))
    .filter((d): d is string => !!d);
  const className = unwrapSourced(def.className);
  return {
    kind: "attribute",
    name,
    bindables: toBindableRecord(def.bindables),
    ...(aliases.length > 0 ? { aliases } : {}),
    ...(primary ? { primary } : {}),
    ...(noMultiBindings !== undefined ? { noMultiBindings } : {}),
    ...(deps.length > 0 ? { dependencies: deps } : {}),
    ...(className ? { className } : {}),
    ...(def.file ? { file: def.file } : {}),
    ...(def.package ? { package: def.package } : {}),
    origin: def.className.origin,
    ...(def.declarationForm ? { declarationForm: def.declarationForm } : {}),
    gaps: countAttributeGaps(def),
  };
}

export function toTemplateControllerAttrRes(def: TemplateControllerDef): AttrRes {
  const name = unwrapSourced(def.name) ?? "";
  const aliases = (unwrapSourced(def.aliases) ?? [])
    .filter((a): a is string => !!a);
  const primary = findPrimaryBindableName(def.bindables) ?? undefined;
  const noMultiBindings = unwrapSourced(def.noMultiBindings);
  const className = unwrapSourced(def.className);
  return {
    kind: "attribute",
    name,
    bindables: toBindableRecord(def.bindables),
    ...(aliases.length > 0 ? { aliases } : {}),
    ...(primary ? { primary } : {}),
    ...(noMultiBindings !== undefined ? { noMultiBindings } : {}),
    isTemplateController: true,
    ...(className ? { className } : {}),
    ...(def.file ? { file: def.file } : {}),
    ...(def.package ? { package: def.package } : {}),
    origin: def.className.origin,
    ...(def.declarationForm ? { declarationForm: def.declarationForm } : {}),
  };
}

export function toControllerConfig(def: TemplateControllerDef): ControllerConfig {
  const name = unwrapSourced(def.name) ?? "";
  const bindables = toBindableRecord(def.bindables);
  const primary = findPrimaryBindableName(def.bindables) ?? "value";
  const semantics = def.semantics;

  const trigger = semantics?.trigger ?? { kind: "value", prop: primary };
  const scope = semantics?.scope ?? "overlay";

  return {
    name,
    trigger,
    scope,
    cardinality: semantics?.cardinality,
    placement: semantics?.placement,
    branches: semantics?.branches,
    linksTo: semantics?.linksTo,
    injects: semantics?.injects,
    tailProps: semantics?.tailProps,
    props: bindables,
  };
}

export function toValueConverterSig(def: ValueConverterDef): ValueConverterSig {
  const name = unwrapSourced(def.name) ?? "";
  const className = unwrapSourced(def.className);
  return {
    name,
    in: toTypeRef(unwrapSourced(def.fromType)),
    out: toTypeRef(unwrapSourced(def.toType)),
    ...(className ? { className } : {}),
    ...(def.file ? { file: def.file } : {}),
    ...(def.package ? { package: def.package } : {}),
    origin: def.className.origin,
    ...(def.declarationForm ? { declarationForm: def.declarationForm } : {}),
    gaps: countValueConverterGaps(def),
  };
}

export function toBindingBehaviorSig(def: BindingBehaviorDef): BindingBehaviorSig {
  const name = unwrapSourced(def.name) ?? "";
  const className = unwrapSourced(def.className);
  return {
    name,
    ...(className ? { className } : {}),
    ...(def.file ? { file: def.file } : {}),
    ...(def.package ? { package: def.package } : {}),
    origin: def.className.origin,
    ...(def.declarationForm ? { declarationForm: def.declarationForm } : {}),
    gaps: countBindingBehaviorGaps(def),
  };
}

export function toBindingCommandConfig(def: BindingCommandDef): BindingCommandConfig {
  const name = unwrapSourced(def.name) ?? "";
  const mode = unwrapSourced(def.mode);
  const capture = unwrapSourced(def.capture);
  const forceAttribute = unwrapSourced(def.forceAttribute);
  const pkg = unwrapSourced(def.package);
  return {
    name,
    kind: unwrapSourced(def.commandKind) ?? "property",
    ...(mode ? { mode } : {}),
    ...(capture !== undefined ? { capture } : {}),
    ...(forceAttribute ? { forceAttribute } : {}),
    ...(pkg ? { package: pkg } : {}),
  };
}

export function toAttributePatternConfig(def: AttributePatternDef): AttributePatternConfig {
  const pattern = unwrapSourced(def.pattern) ?? "";
  const symbols = unwrapSourced(def.symbols) ?? "";
  const interpret = unwrapSourced(def.interpret) ?? { kind: "target-command" };
  const pkg = unwrapSourced(def.package);
  return {
    pattern,
    symbols,
    interpret,
    ...(pkg ? { package: pkg } : {}),
  };
}

export function normalizeResourceCollections(resources?: Partial<ResourceCollections>): ResourceCollections {
  return {
    elements: { ...(resources?.elements ?? {}) },
    attributes: { ...(resources?.attributes ?? {}) },
    controllers: { ...(resources?.controllers ?? {}) },
    valueConverters: { ...(resources?.valueConverters ?? {}) },
    bindingBehaviors: { ...(resources?.bindingBehaviors ?? {}) },
  };
}

export function buildResourceCollectionsFromSemantics(sem: ProjectSemantics): ResourceCollections {
  const elements = Object.fromEntries(
    Object.entries(sem.elements).map(([key, def]) => [key, toElementRes(def)]),
  );
  const attributes = Object.fromEntries(
    Object.entries(sem.attributes).map(([key, def]) => [key, toAttrRes(def)]),
  );
  const controllers = Object.fromEntries(
    Object.entries(sem.controllers).map(([key, def]) => [key, toControllerConfig(def)]),
  );

  // Template controllers are modeled as attributes with an explicit flag.
  for (const [key, def] of Object.entries(sem.controllers)) {
    if (!attributes[key]) {
      attributes[key] = toTemplateControllerAttrRes(def);
      continue;
    }
    attributes[key] = { ...attributes[key], isTemplateController: true };
  }

  return {
    elements,
    attributes,
    controllers,
    valueConverters: Object.fromEntries(
      Object.entries(sem.valueConverters).map(([key, def]) => [key, toValueConverterSig(def)]),
    ),
    bindingBehaviors: Object.fromEntries(
      Object.entries(sem.bindingBehaviors).map(([key, def]) => [key, toBindingBehaviorSig(def)]),
    ),
  };
}

// ── Builtin staleness detection ──────────────────────────────────────
//
// Computes discrepancies between the builtin encoding and analysis
// observations for framework resources. A derived comparison — not a
// carried property. See deflection-builtin-staleness-detection.md.

import type { BuiltinDiscrepancy, ResourceDef } from "../schema/types.js";

/** Walk a resource def's Sourced<T> fields and find those where analysis won over builtin. */
function computeFieldsFromAnalysis(def: ResourceDef): string[] {
  const fields: string[] = [];
  const check = (name: string, field: Sourced<unknown> | undefined) => {
    if (field && 'origin' in field && field.origin !== 'builtin') {
      fields.push(name);
    }
  };

  check('className', def.className);
  check('name', def.name);

  if (def.kind === 'custom-element') {
    check('containerless', def.containerless);
    check('shadowOptions', def.shadowOptions);
    check('capture', def.capture);
    check('processContent', def.processContent);
    check('boundary', def.boundary);
    if (def.inlineTemplate) check('inlineTemplate', def.inlineTemplate);
    // Check bindables — each bindable's property field
    for (const [key, bindable] of Object.entries(def.bindables)) {
      if (bindable.property && 'origin' in bindable.property && bindable.property.origin !== 'builtin') {
        fields.push(`bindables.${key}`);
      }
    }
  } else if (def.kind === 'custom-attribute') {
    check('noMultiBindings', def.noMultiBindings);
    if (def.primary) check('primary', def.primary);
    for (const [key, bindable] of Object.entries(def.bindables)) {
      if (bindable.property && 'origin' in bindable.property && bindable.property.origin !== 'builtin') {
        fields.push(`bindables.${key}`);
      }
    }
  } else if (def.kind === 'template-controller') {
    for (const [key, bindable] of Object.entries(def.bindables)) {
      if (bindable.property && 'origin' in bindable.property && bindable.property.origin !== 'builtin') {
        fields.push(`bindables.${key}`);
      }
    }
  } else if (def.kind === 'value-converter') {
    if (def.fromType) check('fromType', def.fromType);
    if (def.toType) check('toType', def.toType);
  }

  return fields;
}

/** Check if a resource def has any builtin-origin observation (is a framework builtin). */
function isBuiltinResource(def: ResourceDef): boolean {
  // A resource is builtin if its className came from the builtin registry.
  // After convergence, analysis may have won some fields, but className.origin
  // tracks the original source of the identity.
  return def.className.origin === 'builtin';
}

/**
 * Compute builtin discrepancies for all resources in a ProjectSemantics.
 * Returns a map from resource key to discrepancy. Only includes resources
 * that ARE builtins and HAVE discrepancies (fieldsFromAnalysis > 0).
 */
export function computeBuiltinDiscrepancies(sem: ProjectSemantics): Map<string, BuiltinDiscrepancy> {
  const result = new Map<string, BuiltinDiscrepancy>();

  const check = (key: string, def: ResourceDef) => {
    if (!isBuiltinResource(def)) return;
    const fieldsFromAnalysis = computeFieldsFromAnalysis(def);
    if (fieldsFromAnalysis.length === 0) return;
    result.set(key, {
      fieldsFromAnalysis,
      membersNotInSemantics: [], // Requires TS reflection — not yet implemented
    });
  };

  for (const [key, def] of Object.entries(sem.elements)) check(key, def);
  for (const [key, def] of Object.entries(sem.attributes)) check(key, def);
  for (const [key, def] of Object.entries(sem.controllers)) check(key, def);
  for (const [key, def] of Object.entries(sem.valueConverters)) check(key, def);
  for (const [key, def] of Object.entries(sem.bindingBehaviors)) check(key, def);

  return result;
}

export function buildBindingCommandConfigs(sem: ProjectSemantics): Record<string, BindingCommandConfig> {
  return Object.fromEntries(
    Object.entries(sem.commands).map(([key, def]) => [key, toBindingCommandConfig(def)]),
  );
}

export function buildAttributePatternConfigs(sem: ProjectSemantics): AttributePatternConfig[] {
  return sem.patterns.map((def) => toAttributePatternConfig(def));
}
