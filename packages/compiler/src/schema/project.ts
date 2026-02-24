// Resource View Projection — Sourced<T> → Resolved<T>
//
// This module projects internal ResourceDef types (with Sourced<T> fields)
// into consumer-facing ResourceView types (with Resolved<T> fields).
//
// The query interface IS the projection boundary. The model stores Sourced<T>
// internally for provenance tracking. This module converts on read so
// consumers never see Sourced<T> — they get clean values or Stubs.

import type {
  Sourced,
  Resolved,
  Stub,
  GapCategory,
  GapRef,
  ConvergenceRef,
  ResourceView,
  BindableView,
  BindingMode,
  ResourceDef,
  CustomElementDef,
  CustomAttributeDef,
  TemplateControllerDef,
  ValueConverterDef,
  BindingBehaviorDef,
  BindableDef,
  ControllerSemantics,
} from "./types.js";
import type { NormalizedPath } from "../model/index.js";
import { createStub } from "./types.js";

// ============================================================================
// L2 View Types (consumer-facing)
// ============================================================================

export interface CustomElementView extends ResourceView {
  readonly kind: 'custom-element';
  readonly aliases: string[];
  readonly capture: Resolved<boolean>;
  readonly containerless: Resolved<boolean>;
  readonly shadowOptions: Resolved<{ readonly mode: 'open' | 'closed' } | null>;
  readonly processContent: Resolved<boolean>;
  readonly bindables: Readonly<Record<string, BindableView>>;
  readonly dependencies: string[];
}

export interface CustomAttributeView extends ResourceView {
  readonly kind: 'custom-attribute';
  readonly aliases: string[];
  readonly noMultiBindings: Resolved<boolean>;
  readonly defaultProperty: Resolved<string | undefined>;
  readonly bindables: Readonly<Record<string, BindableView>>;
  readonly dependencies: string[];
}

export interface TemplateControllerView extends ResourceView {
  readonly kind: 'template-controller';
  readonly aliases: string[];
  readonly noMultiBindings: Resolved<boolean>;
  readonly bindables: Readonly<Record<string, BindableView>>;
  readonly semantics: ControllerSemantics | undefined;
}

export interface ValueConverterView extends ResourceView {
  readonly kind: 'value-converter';
}

export interface BindingBehaviorView extends ResourceView {
  readonly kind: 'binding-behavior';
}

export type AnyResourceView =
  | CustomElementView
  | CustomAttributeView
  | TemplateControllerView
  | ValueConverterView
  | BindingBehaviorView;

// ============================================================================
// Projection: Sourced<T> → Resolved<T>
// ============================================================================

/**
 * Project a Sourced<T> value to Resolved<T>.
 *
 * - `state: 'unknown'` → Stub<T> with a safe fallback
 * - Otherwise → the unwrapped value
 */
function projectSourced<T>(
  sourced: Sourced<T> | undefined,
  fallback: T,
  resourceKey: string,
  field: string,
): Resolved<T> {
  if (!sourced) return fallback;
  if (sourced.origin === 'source' && sourced.state === 'unknown') {
    return createStub(fallback, 'unknown-source' as GapCategory, resourceKey, field);
  }
  return sourced.value as T;
}

function projectSourcedOptional<T>(
  sourced: Sourced<T> | undefined,
  fallback: T | undefined,
  resourceKey: string,
  field: string,
): Resolved<T | undefined> {
  if (!sourced) return fallback;
  if (sourced.origin === 'source' && sourced.state === 'unknown') {
    return createStub(fallback, 'unknown-source' as GapCategory, resourceKey, field);
  }
  return sourced.value;
}

function unwrapSourcedValue<T>(sourced: Sourced<T> | undefined): T | undefined {
  if (!sourced) return undefined;
  if (sourced.origin === 'source' && sourced.state === 'unknown') return undefined;
  return sourced.value;
}

function unwrapSourcedString(sourced: Sourced<string> | undefined): string {
  if (!sourced) return '';
  if (sourced.origin === 'source' && sourced.state === 'unknown') return '';
  return sourced.value;
}

function unwrapSourcedArray(sourced: readonly Sourced<string>[] | undefined): string[] {
  if (!sourced) return [];
  return sourced
    .map(s => unwrapSourcedValue(s))
    .filter((v): v is string => v !== undefined);
}

// ============================================================================
// Projection: BindableDef → BindableView
// ============================================================================

function projectBindable(def: BindableDef, resourceKey: string, bindableName: string): BindableView {
  const field = `bindables.${bindableName}`;
  return {
    property: unwrapSourcedString(def.property) || bindableName,
    attribute: projectSourced(def.attribute, bindableName, resourceKey, `${field}.attribute`),
    mode: projectSourced(def.mode, 'default' as BindingMode, resourceKey, `${field}.mode`),
    primary: projectSourced(def.primary, false, resourceKey, `${field}.primary`),
    type: unwrapSourcedValue(def.type) ?? undefined,
    doc: unwrapSourcedValue(def.doc) ?? undefined,
  };
}

export function projectBindables(
  defs: Readonly<Record<string, BindableDef>> | undefined,
  resourceKey: string,
): Readonly<Record<string, BindableView>> {
  if (!defs) return {};
  const result: Record<string, BindableView> = {};
  for (const [name, def] of Object.entries(defs)) {
    result[name] = projectBindable(def, resourceKey, name);
  }
  return result;
}

// ============================================================================
// Projection: ResourceDef → ResourceView
// ============================================================================

function baseView(def: ResourceDef, ref: ConvergenceRef, resourceKey: string): Omit<ResourceView, 'kind'> {
  return {
    name: unwrapSourcedString(def.name),
    className: unwrapSourcedString(def.className),
    file: projectSourcedOptional<NormalizedPath | undefined>(
      undefined,  // file is not Sourced<T> on ResourceDefBase — it's plain
      def.file,
      resourceKey,
      'file',
    ) as Resolved<NormalizedPath | undefined>,
    package: def.package as Resolved<string | undefined>,
    ref,
  };
}

export function projectCustomElement(
  def: CustomElementDef,
  ref: ConvergenceRef,
): CustomElementView {
  const key = `custom-element:${unwrapSourcedString(def.name)}`;
  return {
    kind: 'custom-element',
    ...baseView(def, ref, key),
    aliases: unwrapSourcedArray(def.aliases),
    capture: projectSourced(def.capture, false, key, 'capture'),
    containerless: projectSourced(def.containerless, false, key, 'containerless'),
    shadowOptions: projectSourced(def.shadowOptions, null, key, 'shadowOptions') as Resolved<{ readonly mode: 'open' | 'closed' } | null>,
    processContent: projectSourced(def.processContent, false, key, 'processContent'),
    bindables: projectBindables(def.bindables, key),
    dependencies: unwrapSourcedArray(def.dependencies),
  };
}

export function projectCustomAttribute(
  def: CustomAttributeDef,
  ref: ConvergenceRef,
): CustomAttributeView {
  const key = `custom-attribute:${unwrapSourcedString(def.name)}`;
  return {
    kind: 'custom-attribute',
    ...baseView(def, ref, key),
    aliases: unwrapSourcedArray(def.aliases),
    noMultiBindings: projectSourced(def.noMultiBindings, false, key, 'noMultiBindings'),
    defaultProperty: projectSourcedOptional<string | undefined>(def.primary, undefined, key, 'primary') as Resolved<string | undefined>,
    bindables: projectBindables(def.bindables, key),
    dependencies: unwrapSourcedArray(def.dependencies),
  };
}

export function projectTemplateController(
  def: TemplateControllerDef,
  ref: ConvergenceRef,
): TemplateControllerView {
  const key = `template-controller:${unwrapSourcedString(def.name)}`;
  return {
    kind: 'template-controller',
    ...baseView(def, ref, key),
    aliases: Array.isArray(def.aliases)
      ? unwrapSourcedArray(def.aliases as readonly Sourced<string>[])
      : (unwrapSourcedValue(def.aliases as Sourced<readonly string[]>) ?? []) as string[],
    noMultiBindings: projectSourced(def.noMultiBindings, false, key, 'noMultiBindings'),
    bindables: projectBindables(def.bindables, key),
    semantics: def.semantics,
  };
}

export function projectValueConverter(
  def: ValueConverterDef,
  ref: ConvergenceRef,
): ValueConverterView {
  const key = `value-converter:${unwrapSourcedString(def.name)}`;
  return {
    kind: 'value-converter',
    ...baseView(def, ref, key),
  };
}

export function projectBindingBehavior(
  def: BindingBehaviorDef,
  ref: ConvergenceRef,
): BindingBehaviorView {
  const key = `binding-behavior:${unwrapSourcedString(def.name)}`;
  return {
    kind: 'binding-behavior',
    ...baseView(def, ref, key),
  };
}

/**
 * Project any ResourceDef to its corresponding view type.
 */
export function projectResourceDef(
  def: ResourceDef,
  ref: ConvergenceRef,
): AnyResourceView {
  switch (def.kind) {
    case 'custom-element': return projectCustomElement(def, ref);
    case 'custom-attribute': return projectCustomAttribute(def, ref);
    case 'template-controller': return projectTemplateController(def, ref);
    case 'value-converter': return projectValueConverter(def, ref);
    case 'binding-behavior': return projectBindingBehavior(def, ref);
  }
}
