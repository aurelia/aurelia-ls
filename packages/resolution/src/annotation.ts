/**
 * Resource Annotation Types
 *
 * Unified output types for resource resolution.
 * Replaces separate ResourceCandidate and ExtractedResource.
 *
 * Design principles (from resolution-principles.md):
 * - Evidence is two-level: Analyzed (Explicit|Inferred) vs Declared
 * - Confidence is derived from Evidence × Gaps, not stored
 * - Source uses NormalizedPath (canonical) for identity
 */

import type { NormalizedPath, TextSpan, BindingMode } from '@aurelia-ls/compiler';

// =============================================================================
// Core Types
// =============================================================================

/**
 * A resolved Aurelia resource annotation.
 *
 * This is the unified output of resource resolution - the answer to
 * "WHAT is this class?" from the Declaration axis.
 */
export interface ResourceAnnotation {
  /** What kind of Aurelia resource */
  readonly kind: ResourceKind;

  /** Template name (kebab-case for elements/attributes, camelCase for VC/BB) */
  readonly name: string;

  /** Original class name in source */
  readonly className: string;

  /** Canonical path to source file */
  readonly source: NormalizedPath;

  /** Location in source file */
  readonly span?: TextSpan;

  /** Alternate names this resource responds to */
  readonly aliases: readonly string[];

  /** Bindable properties */
  readonly bindables: readonly BindableAnnotation[];

  /** How we determined this is a resource */
  readonly evidence: AnnotationEvidence;

  /** Element-specific properties (present when kind is 'custom-element') */
  readonly element?: ElementAnnotation;

  /** Attribute-specific properties (present when kind is 'custom-attribute' or 'template-controller') */
  readonly attribute?: AttributeAnnotation;
}

/**
 * Resource kinds in Aurelia.
 * Uses kebab-case to match Aurelia runtime terminology.
 */
export type ResourceKind =
  | 'custom-element'
  | 'custom-attribute'
  | 'template-controller'  // Attribute subtype, but worth distinguishing
  | 'value-converter'
  | 'binding-behavior';

/**
 * Element-specific annotation properties.
 */
export interface ElementAnnotation {
  /** Whether element renders without a wrapping element */
  readonly containerless: boolean;

  /** Whether element creates a scope boundary */
  readonly boundary: boolean;

  /** Inline template content (from decorator or static $au) */
  readonly inlineTemplate?: string;
}

/**
 * Attribute-specific annotation properties.
 */
export interface AttributeAnnotation {
  /** Whether this is a template controller */
  readonly isTemplateController: boolean;

  /** Whether multi-binding syntax is disabled */
  readonly noMultiBindings: boolean;

  /** Primary bindable property name */
  readonly primary?: string;
}

/**
 * Bindable property annotation.
 */
export interface BindableAnnotation {
  /** Property name on the class */
  readonly name: string;

  /** Attribute name in templates (kebab-case, if different from name) */
  readonly attribute?: string;

  /** Binding mode */
  readonly mode?: BindingMode;

  /** Whether this is the primary bindable */
  readonly primary?: boolean;

  /** TypeScript type (if available) */
  readonly type?: string;

  /** How we determined this is bindable */
  readonly evidence: BindableEvidence;
}

// =============================================================================
// Evidence Types (from resolution-principles.md)
// =============================================================================

/**
 * Evidence for how we determined something is a resource.
 *
 * Two-level hierarchy:
 * - Analyzed: We read the source and recognized a pattern
 *   - Explicit: Decorator, static $au, .define() call
 *   - Inferred: Convention (naming suffix, sibling template)
 * - Declared: From a manifest or hard-coded configuration
 *
 * Analyzed evidence has provenance (source location).
 * Declared evidence doesn't (it's external data).
 */
export type AnnotationEvidence =
  | AnalyzedEvidence
  | DeclaredEvidence;

/**
 * Evidence from source analysis.
 */
export interface AnalyzedEvidence {
  readonly source: 'analyzed';
  readonly kind: 'explicit' | 'inferred';

  /** Which pattern matched (decorator, static-au, define, convention) */
  readonly pattern: string;

  /** Source location of the evidence (decorator, static property, etc.) */
  readonly span?: TextSpan;
}

/**
 * Evidence from external declaration (manifest, config).
 */
export interface DeclaredEvidence {
  readonly source: 'declared';

  /** Where the declaration came from */
  readonly origin: string;  // manifest path, or 'hard-coded' for built-ins
}

/**
 * Evidence for how we determined a property is bindable.
 */
export type BindableEvidence =
  | { readonly source: 'analyzed'; readonly pattern: 'decorator' | 'static-au' | 'define' }
  | { readonly source: 'declared'; readonly origin: string };

// =============================================================================
// Constructors
// =============================================================================

/**
 * Create a custom element annotation.
 */
export function elementAnnotation(
  name: string,
  className: string,
  source: NormalizedPath,
  evidence: AnnotationEvidence,
  options: {
    aliases?: readonly string[];
    bindables?: readonly BindableAnnotation[];
    containerless?: boolean;
    boundary?: boolean;
    inlineTemplate?: string;
    span?: TextSpan;
  } = {}
): ResourceAnnotation {
  return {
    kind: 'custom-element',
    name,
    className,
    source,
    evidence,
    aliases: options.aliases ?? [],
    bindables: options.bindables ?? [],
    span: options.span,
    element: {
      containerless: options.containerless ?? false,
      boundary: options.boundary ?? true,
      inlineTemplate: options.inlineTemplate,
    },
  };
}

/**
 * Create a custom attribute annotation.
 */
export function attributeAnnotation(
  name: string,
  className: string,
  source: NormalizedPath,
  evidence: AnnotationEvidence,
  options: {
    aliases?: readonly string[];
    bindables?: readonly BindableAnnotation[];
    isTemplateController?: boolean;
    noMultiBindings?: boolean;
    primary?: string;
    span?: TextSpan;
  } = {}
): ResourceAnnotation {
  const isTC = options.isTemplateController ?? false;
  return {
    kind: isTC ? 'template-controller' : 'custom-attribute',
    name,
    className,
    source,
    evidence,
    aliases: options.aliases ?? [],
    bindables: options.bindables ?? [],
    span: options.span,
    attribute: {
      isTemplateController: isTC,
      noMultiBindings: options.noMultiBindings ?? false,
      primary: options.primary,
    },
  };
}

/**
 * Create a value converter annotation.
 */
export function valueConverterAnnotation(
  name: string,
  className: string,
  source: NormalizedPath,
  evidence: AnnotationEvidence,
  options: {
    aliases?: readonly string[];
    span?: TextSpan;
  } = {}
): ResourceAnnotation {
  return {
    kind: 'value-converter',
    name,
    className,
    source,
    evidence,
    aliases: options.aliases ?? [],
    bindables: [],
    span: options.span,
  };
}

/**
 * Create a binding behavior annotation.
 */
export function bindingBehaviorAnnotation(
  name: string,
  className: string,
  source: NormalizedPath,
  evidence: AnnotationEvidence,
  options: {
    aliases?: readonly string[];
    span?: TextSpan;
  } = {}
): ResourceAnnotation {
  return {
    kind: 'binding-behavior',
    name,
    className,
    source,
    evidence,
    aliases: options.aliases ?? [],
    bindables: [],
    span: options.span,
  };
}

/**
 * Create explicit (analyzed) evidence.
 */
export function explicitEvidence(pattern: string, span?: TextSpan): AnalyzedEvidence {
  return { source: 'analyzed', kind: 'explicit', pattern, span };
}

/**
 * Create inferred (analyzed) evidence.
 */
export function inferredEvidence(pattern: string): AnalyzedEvidence {
  return { source: 'analyzed', kind: 'inferred', pattern };
}

/**
 * Create declared evidence.
 */
export function declaredEvidence(origin: string): DeclaredEvidence {
  return { source: 'declared', origin };
}

// =============================================================================
// Type Guards
// =============================================================================

/** Check if evidence is from analysis (has provenance) */
export function isAnalyzedEvidence(e: AnnotationEvidence): e is AnalyzedEvidence {
  return e.source === 'analyzed';
}

/** Check if evidence is from declaration (external) */
export function isDeclaredEvidence(e: AnnotationEvidence): e is DeclaredEvidence {
  return e.source === 'declared';
}

/** Check if annotation is for an element */
export function isElementAnnotation(a: ResourceAnnotation): boolean {
  return a.kind === 'custom-element';
}

/** Check if annotation is for an attribute */
export function isAttributeAnnotation(a: ResourceAnnotation): boolean {
  return a.kind === 'custom-attribute' || a.kind === 'template-controller';
}

/** Check if annotation is for a template controller */
export function isTemplateControllerAnnotation(a: ResourceAnnotation): boolean {
  return a.kind === 'template-controller';
}
