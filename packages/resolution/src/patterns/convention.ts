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

import type {
  BindingBehaviorDef,
  CustomAttributeDef,
  CustomElementDef,
  ValueConverterDef,
  TemplateControllerDef,
  ResourceDef,
} from '@aurelia-ls/compiler';
import type { AnalysisGap } from '../analysis/types.js';
import type { ClassValue, BindableMember } from '../analysis/value/types.js';
import { extractStringProp, extractBooleanProp } from '../analysis/value/types.js';
import type { FileContext } from '../extraction/file-facts.js';
import type { BindableInput } from '../semantics/resource-def.js';
import {
  buildBindableDefs,
  buildBindingBehaviorDef,
  buildCustomAttributeDef,
  buildCustomElementDef,
  buildTemplateControllerDef,
  buildValueConverterDef,
} from '../semantics/resource-def.js';
import {
  canonicalElementName,
  canonicalAttrName,
  canonicalSimpleName,
} from '../util/naming.js';

// =============================================================================
// Main Export
// =============================================================================

export interface ConventionMatchResult {
  resource: ResourceDef | null;
  gaps: AnalysisGap[];
}

/**
 * Match a class against naming convention patterns.
 *
 * Looks for conventional suffixes and sibling templates.
 *
 * @param cls - The enriched ClassValue to match
 * @param context - File context with sibling information
 * @returns Match result with resource (or null) and any gaps
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
      const resource = buildElementDef(cls, name);
      return { resource, gaps };
    }
  }

  // Custom attribute
  if (className.endsWith('CustomAttribute')) {
    const baseName = className.slice(0, -'CustomAttribute'.length);
    const name = canonicalAttrName(baseName);
    if (name) {
      const resource = buildAttributeDef(cls, name);
      return { resource, gaps };
    }
  }

  // Value converter
  if (className.endsWith('ValueConverter')) {
    const baseName = className.slice(0, -'ValueConverter'.length);
    const name = canonicalSimpleName(baseName);
    if (name) {
      const resource = buildValueConverterDefFromConvention(cls, name);
      return { resource, gaps };
    }
  }

  // Binding behavior
  if (className.endsWith('BindingBehavior')) {
    const baseName = className.slice(0, -'BindingBehavior'.length);
    const name = canonicalSimpleName(baseName);
    if (name) {
      const resource = buildBindingBehaviorDefFromConvention(cls, name);
      return { resource, gaps };
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
        const resource = buildElementDef(cls, name);
        return { resource, gaps };
      }
    }
  }

  // No convention match
  return { resource: null, gaps };
}

// =============================================================================
// Definition Building
// =============================================================================

function buildElementDef(
  cls: ClassValue,
  name: string
): CustomElementDef {
  const bindables = buildBindableInputs(cls.bindableMembers);

  return buildCustomElementDef({
    name,
    className: cls.className,
    file: cls.filePath,
    span: cls.span,
    bindables: buildBindableDefs(bindables, cls.filePath, cls.span),
    containerless: false,
    boundary: true,
  });
}

function buildAttributeDef(
  cls: ClassValue,
  name: string
): CustomAttributeDef | TemplateControllerDef {
  const bindables = buildBindableInputs(cls.bindableMembers);
  const primary = findPrimaryBindable(bindables);

  return buildCustomAttributeDef({
    name,
    className: cls.className,
    file: cls.filePath,
    span: cls.span,
    bindables: buildBindableDefs(bindables, cls.filePath, cls.span),
    primary,
    noMultiBindings: false,
  });
}

function buildValueConverterDefFromConvention(
  cls: ClassValue,
  name: string
): ValueConverterDef {
  return buildValueConverterDef({
    name,
    className: cls.className,
    file: cls.filePath,
    span: cls.span,
  });
}

function buildBindingBehaviorDefFromConvention(
  cls: ClassValue,
  name: string
): BindingBehaviorDef {
  return buildBindingBehaviorDef({
    name,
    className: cls.className,
    file: cls.filePath,
    span: cls.span,
  });
}

// =============================================================================
// Bindable Building
// =============================================================================

/**
 * Build bindable inputs from @bindable members only.
 * (Convention resources don't have decorator-level bindables config)
 */
function buildBindableInputs(
  members: readonly BindableMember[]
): BindableInput[] {
  const result: BindableInput[] = [];

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
      mode: mode as BindableInput['mode'],
      primary,
      type: member.type,
      span: member.span,
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Find the primary bindable name.
 */
function findPrimaryBindable(bindables: BindableInput[]): string | undefined {
  for (const b of bindables) {
    if (b.primary) return b.name;
  }
  if (bindables.length === 1) {
    return bindables[0]?.name;
  }
  return undefined;
}

