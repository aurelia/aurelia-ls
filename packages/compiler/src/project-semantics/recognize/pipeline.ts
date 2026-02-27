/**
 * Pattern Matching Pipeline
 *
 * Runs pattern matchers in priority order:
 * 1. Decorator (@customElement, etc.)
 * 2. Static $au property
 * 3. Define call (CustomElement.define, etc.)
 * 4. Naming convention (suffix, sibling template)
 *
 * First match wins. Gaps from all matchers are accumulated.
 */

import type { NormalizedPath, ResourceDef } from '../compiler.js';
import type { AnalysisGap } from '../evaluate/types.js';
import type { ClassValue } from '../evaluate/value/types.js';
import type { FileContext, FileFacts, DefineCall } from '../extract/file-facts.js';
import { matchDecorator } from './decorator.js';
import { matchStaticAu } from './static-au.js';
import { matchConvention } from './convention.js';
import { matchDefine } from './define.js';
import type {
  RecognizedAttributePattern,
  RecognizedBindingCommand,
} from './extensions.js';
import {
  sortAndDedupeAttributePatterns,
  sortAndDedupeBindingCommands,
} from './extensions.js';

// =============================================================================
// Types
// =============================================================================

/** Which pattern matcher produced a resource match. */
export type MatchSource = "decorator" | "static-au" | "define" | "convention";
export type {
  RecognizedBindingCommand,
  RecognizedAttributePattern,
} from './extensions.js';

/**
 * Result of pattern matching on a single class.
 */
export interface MatchResult {
  /** The matched resource definition, or null if no match */
  resource: ResourceDef | null;

  /** Binding-command identities recognized from this class */
  bindingCommands: RecognizedBindingCommand[];

  /** Attribute-pattern identities recognized from this class */
  attributePatterns: RecognizedAttributePattern[];

  /** All gaps encountered during matching */
  gaps: AnalysisGap[];

  /** Which matcher produced the resource, if any */
  matchSource?: MatchSource;
}

/**
 * Result of matching all classes in a file.
 */
export interface FileMatchResult {
  /** Successfully matched resource definitions */
  resources: ResourceDef[];

  /** Recognized binding-command identities */
  bindingCommands: RecognizedBindingCommand[];

  /** Recognized attribute-pattern identities */
  attributePatterns: RecognizedAttributePattern[];

  /** All gaps encountered */
  gaps: AnalysisGap[];

  /** Per-resource match source tracking */
  matchSources: ReadonlyMap<ResourceDef, MatchSource>;
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Run all pattern matchers on a class.
 *
 * Tries matchers in priority order. First match wins.
 * Gaps from failing matchers are accumulated.
 *
 * @param cls - The enriched ClassValue to match
 * @param context - File context (for convention matching)
 * @returns Match result with resource (or null) and all gaps
 */
export function matchAll(cls: ClassValue, context?: FileContext): MatchResult {
  const gaps: AnalysisGap[] = [];

  // 1. Try decorator pattern (highest priority)
  const decoratorResult = matchDecorator(cls);
  const bindingCommands = [...decoratorResult.bindingCommands];
  const attributePatterns = [...decoratorResult.attributePatterns];
  gaps.push(...decoratorResult.gaps);
  if (decoratorResult.resource) {
    return {
      resource: decoratorResult.resource,
      bindingCommands,
      attributePatterns,
      gaps,
      matchSource: "decorator",
    };
  }

  // 2. Try static $au pattern
  const staticAuResult = matchStaticAu(cls);
  gaps.push(...staticAuResult.gaps);
  if (staticAuResult.resource) {
    return {
      resource: staticAuResult.resource,
      bindingCommands,
      attributePatterns,
      gaps,
      matchSource: "static-au",
    };
  }

  // 3. Try convention pattern (lowest priority)
  const conventionResult = matchConvention(cls, context);
  gaps.push(...conventionResult.gaps);
  if (conventionResult.resource) {
    return {
      resource: conventionResult.resource,
      bindingCommands,
      attributePatterns,
      gaps,
      matchSource: "convention",
    };
  }

  // No match
  return { resource: null, bindingCommands, attributePatterns, gaps };
}

/**
 * Run pattern matching on all classes in a file.
 *
 * @param classes - Classes from FileFacts
 * @param context - File context
 * @returns All matched resources and gaps
 */
export function matchFile(
  classes: readonly ClassValue[],
  context?: FileContext
): FileMatchResult {
  const resources: ResourceDef[] = [];
  const bindingCommands: RecognizedBindingCommand[] = [];
  const attributePatterns: RecognizedAttributePattern[] = [];
  const gaps: AnalysisGap[] = [];
  const matchSources = new Map<ResourceDef, MatchSource>();

  for (const cls of classes) {
    // Propagate class-level extraction gaps
    gaps.push(...cls.gaps);

    const result = matchAll(cls, context);
    gaps.push(...result.gaps);
    bindingCommands.push(...result.bindingCommands);
    attributePatterns.push(...result.attributePatterns);

    if (result.resource) {
      resources.push(result.resource);
      if (result.matchSource) {
        matchSources.set(result.resource, result.matchSource);
      }
    }
  }

  return {
    resources,
    bindingCommands: sortAndDedupeBindingCommands(bindingCommands),
    attributePatterns: sortAndDedupeAttributePatterns(attributePatterns),
    gaps,
    matchSources,
  };
}

/**
 * Match a single class expecting a result.
 *
 * Convenience wrapper that throws if no match found.
 * Use in contexts where you expect the class to be a resource.
 *
 * @param cls - The enriched ClassValue to match
 * @param context - File context
 * @returns The matched resource
 * @throws If no pattern matches
 */
export function matchExpected(cls: ClassValue, context?: FileContext): ResourceDef {
  const result = matchAll(cls, context);
  if (!result.resource) {
    throw new Error(
      `Class ${cls.className} does not match any Aurelia resource pattern. ` +
      `Expected decorator, static $au, or naming convention.`
    );
  }
  return result.resource;
}

// =============================================================================
// Define Call Matching
// =============================================================================

/**
 * Match all define calls in a file.
 *
 * @param defineCalls - Define calls from FileFacts.defineCalls
 * @param filePath - File path where the define calls are located
 * @returns All matched resources and gaps
 */
export function matchDefineCalls(
  defineCalls: readonly DefineCall[],
  filePath: NormalizedPath,
  classes: readonly ClassValue[] = []
): FileMatchResult {
  const resources: ResourceDef[] = [];
  const bindingCommands: RecognizedBindingCommand[] = [];
  const attributePatterns: RecognizedAttributePattern[] = [];
  const gaps: AnalysisGap[] = [];
  const matchSources = new Map<ResourceDef, MatchSource>();

  for (const call of defineCalls) {
    const result = matchDefine(call, filePath, classes);
    gaps.push(...result.gaps);
    bindingCommands.push(...result.bindingCommands);
    attributePatterns.push(...result.attributePatterns);

    if (result.resource) {
      resources.push(result.resource);
      matchSources.set(result.resource, "define");
    }
  }

  return {
    resources,
    bindingCommands: sortAndDedupeBindingCommands(bindingCommands),
    attributePatterns: sortAndDedupeAttributePatterns(attributePatterns),
    gaps,
    matchSources,
  };
}

// =============================================================================
// Unified File Matching
// =============================================================================

/**
 * Match all resources in a FileFacts.
 *
 * This is the primary entry point for pattern matching.
 * Processes both class-based patterns and define calls.
 *
 * @param facts - FileFacts containing classes and defineCalls
 * @param context - File context (for convention matching)
 * @returns All matched resources and gaps
 */
export function matchFileFacts(
  facts: FileFacts,
  context?: FileContext
): FileMatchResult {
  const resources: ResourceDef[] = [];
  const bindingCommands: RecognizedBindingCommand[] = [];
  const attributePatterns: RecognizedAttributePattern[] = [];
  const gaps: AnalysisGap[] = [];
  const matchSources = new Map<ResourceDef, MatchSource>();

  // 1. Match class-based patterns (decorator, static $au, convention)
  const classResult = matchFile(facts.classes, context);
  resources.push(...classResult.resources);
  bindingCommands.push(...classResult.bindingCommands);
  attributePatterns.push(...classResult.attributePatterns);
  gaps.push(...classResult.gaps);
  for (const [resource, source] of classResult.matchSources) {
    matchSources.set(resource, source);
  }

  // 2. Match define calls
  const defineResult = matchDefineCalls(facts.defineCalls, facts.path, facts.classes);
  resources.push(...defineResult.resources);
  bindingCommands.push(...defineResult.bindingCommands);
  attributePatterns.push(...defineResult.attributePatterns);
  gaps.push(...defineResult.gaps);
  for (const [resource, source] of defineResult.matchSources) {
    matchSources.set(resource, source);
  }

  // 3. Include file-level gaps
  gaps.push(...facts.gaps);

  return {
    resources,
    bindingCommands: sortAndDedupeBindingCommands(bindingCommands),
    attributePatterns: sortAndDedupeAttributePatterns(attributePatterns),
    gaps,
    matchSources,
  };
}
