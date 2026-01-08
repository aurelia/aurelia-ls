/**
 * Convention Pattern Matcher
 *
 * Recognizes Aurelia resources from naming conventions:
 *
 * - Class suffix: `FooCustomElement` → custom element `foo`
 * - Class suffix: `FooCustomAttribute` → custom attribute `foo`
 * - Class suffix: `FooValueConverter` → value converter `foo`
 * - Class suffix: `FooBindingBehavior` → binding behavior `foo`
 *
 * Combined with sibling template: `foo.ts` + `foo.html` → custom element
 *
 * This is the lowest-priority pattern matcher (after decorators, static $au, define).
 * Convention matching is deterministic in-project but lower confidence for npm.
 */

import type { AnalysisGap } from '../extraction/types.js';
import type { ClassValue, BindableMember } from '../npm/value/types.js';
import { extractStringProp, extractBooleanProp } from '../npm/value/types.js';
import type { FileContext } from '../file-facts.js';
import type {
  ResourceAnnotation,
  BindableAnnotation,
} from '../annotation.js';
import {
  elementAnnotation,
  attributeAnnotation,
  valueConverterAnnotation,
  bindingBehaviorAnnotation,
  inferredEvidence,
} from '../annotation.js';
import {
  canonicalElementName,
  canonicalAttrName,
  canonicalSimpleName,
} from '../util/naming.js';

// =============================================================================
// Main Export
// =============================================================================

export interface ConventionMatchResult {
  annotation: ResourceAnnotation | null;
  gaps: AnalysisGap[];
}

/**
 * Match a class against naming convention patterns.
 *
 * Looks for conventional suffixes and sibling templates.
 *
 * @param cls - The enriched ClassValue to match
 * @param context - File context with sibling information
 * @returns Match result with annotation (or null) and any gaps
 */
export function matchConvention(
  cls: ClassValue,
  context?: FileContext
): ConventionMatchResult {
  const gaps: AnalysisGap[] = [];
  const className = cls.className;

  // Try each convention in order
  // Custom element (with or without sibling template)
  if (className.endsWith('CustomElement')) {
    const baseName = className.slice(0, -'CustomElement'.length);
    const name = canonicalElementName(baseName);
    if (name) {
      const annotation = buildElementAnnotation(cls, name, 'suffix');
      return { annotation, gaps };
    }
  }

  // Custom attribute
  if (className.endsWith('CustomAttribute')) {
    const baseName = className.slice(0, -'CustomAttribute'.length);
    const name = canonicalAttrName(baseName);
    if (name) {
      const annotation = buildAttributeAnnotation(cls, name, 'suffix');
      return { annotation, gaps };
    }
  }

  // Value converter
  if (className.endsWith('ValueConverter')) {
    const baseName = className.slice(0, -'ValueConverter'.length);
    const name = canonicalSimpleName(baseName);
    if (name) {
      const annotation = buildValueConverterAnnotation(cls, name, 'suffix');
      return { annotation, gaps };
    }
  }

  // Binding behavior
  if (className.endsWith('BindingBehavior')) {
    const baseName = className.slice(0, -'BindingBehavior'.length);
    const name = canonicalSimpleName(baseName);
    if (name) {
      const annotation = buildBindingBehaviorAnnotation(cls, name, 'suffix');
      return { annotation, gaps };
    }
  }

  // Sibling template convention: foo.ts + foo.html = custom element
  // Only if no suffix match and we have context
  if (context) {
    const hasSiblingHtml = context.siblings.some(s => s.extension === '.html');
    if (hasSiblingHtml) {
      // Derive element name from class name
      const name = canonicalElementName(className);
      if (name) {
        const annotation = buildElementAnnotation(cls, name, 'sibling-template');
        return { annotation, gaps };
      }
    }
  }

  // No convention match
  return { annotation: null, gaps };
}

// =============================================================================
// Annotation Building
// =============================================================================

function buildElementAnnotation(
  cls: ClassValue,
  name: string,
  convention: string
): ResourceAnnotation {
  const evidence = inferredEvidence(convention);
  const bindables = buildBindableAnnotations(cls.bindableMembers);

  return elementAnnotation(name, cls.className, cls.filePath, evidence, {
    bindables,
    containerless: false,
    boundary: true,
    span: cls.span,
  });
}

function buildAttributeAnnotation(
  cls: ClassValue,
  name: string,
  convention: string
): ResourceAnnotation {
  const evidence = inferredEvidence(convention);
  const bindables = buildBindableAnnotations(cls.bindableMembers);
  const primary = findPrimaryBindable(bindables);

  return attributeAnnotation(name, cls.className, cls.filePath, evidence, {
    bindables,
    isTemplateController: false,
    noMultiBindings: false,
    primary,
    span: cls.span,
  });
}

function buildValueConverterAnnotation(
  cls: ClassValue,
  name: string,
  convention: string
): ResourceAnnotation {
  const evidence = inferredEvidence(convention);

  return valueConverterAnnotation(name, cls.className, cls.filePath, evidence, {
    span: cls.span,
  });
}

function buildBindingBehaviorAnnotation(
  cls: ClassValue,
  name: string,
  convention: string
): ResourceAnnotation {
  const evidence = inferredEvidence(convention);

  return bindingBehaviorAnnotation(name, cls.className, cls.filePath, evidence, {
    span: cls.span,
  });
}

// =============================================================================
// Bindable Building
// =============================================================================

/**
 * Build bindable annotations from @bindable members only.
 * (Convention resources don't have decorator-level bindables config)
 */
function buildBindableAnnotations(
  members: readonly BindableMember[]
): BindableAnnotation[] {
  const result: BindableAnnotation[] = [];

  for (const member of members) {
    // Extract mode/primary from @bindable(...) args if present
    let mode: string | undefined;
    let primary: boolean | undefined;

    if (member.args.length > 0) {
      const arg = member.args[0];
      if (arg?.kind === 'object') {
        mode = extractStringProp(arg, 'mode');
        primary = extractBooleanProp(arg, 'primary');
      }
    }

    result.push({
      name: member.name,
      mode: mode as BindableAnnotation['mode'],
      primary,
      type: member.type,
      evidence: { source: 'analyzed', pattern: 'decorator' },
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Find the primary bindable name.
 */
function findPrimaryBindable(bindables: BindableAnnotation[]): string | undefined {
  for (const b of bindables) {
    if (b.primary) return b.name;
  }
  if (bindables.length === 1) {
    return bindables[0]?.name;
  }
  return undefined;
}
