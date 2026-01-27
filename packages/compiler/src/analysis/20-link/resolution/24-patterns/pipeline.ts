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
import type { AnalysisGap } from '../23-partial-eval/types.js';
import type { ClassValue } from '../23-partial-eval/value/types.js';
import type { FileContext, FileFacts, DefineCall } from '../21-extract/file-facts.js';
import { matchDecorator } from './decorator.js';
import { matchStaticAu } from './static-au.js';
import { matchConvention } from './convention.js';
import { matchDefine } from './define.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of pattern matching on a single class.
 */
export interface MatchResult {
  /** The matched resource definition, or null if no match */
  resource: ResourceDef | null;

  /** All gaps encountered during matching */
  gaps: AnalysisGap[];
}

/**
 * Result of matching all classes in a file.
 */
export interface FileMatchResult {
  /** Successfully matched resource definitions */
  resources: ResourceDef[];

  /** All gaps encountered */
  gaps: AnalysisGap[];
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
  gaps.push(...decoratorResult.gaps);
  if (decoratorResult.resource) {
    return { resource: decoratorResult.resource, gaps };
  }

  // 2. Try static $au pattern
  const staticAuResult = matchStaticAu(cls);
  gaps.push(...staticAuResult.gaps);
  if (staticAuResult.resource) {
    return { resource: staticAuResult.resource, gaps };
  }

  // 3. Try convention pattern (lowest priority)
  const conventionResult = matchConvention(cls, context);
  gaps.push(...conventionResult.gaps);
  if (conventionResult.resource) {
    return { resource: conventionResult.resource, gaps };
  }

  // No match
  return { resource: null, gaps };
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
  const gaps: AnalysisGap[] = [];

  for (const cls of classes) {
    // Propagate class-level extraction gaps
    gaps.push(...cls.gaps);

    const result = matchAll(cls, context);
    gaps.push(...result.gaps);

    if (result.resource) {
      resources.push(result.resource);
    }
  }

  return { resources, gaps };
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
  const gaps: AnalysisGap[] = [];

  for (const call of defineCalls) {
    const result = matchDefine(call, filePath, classes);
    gaps.push(...result.gaps);

    if (result.resource) {
      resources.push(result.resource);
    }
  }

  return { resources, gaps };
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
  const gaps: AnalysisGap[] = [];

  // 1. Match class-based patterns (decorator, static $au, convention)
  const classResult = matchFile(facts.classes, context);
  resources.push(...classResult.resources);
  gaps.push(...classResult.gaps);

  // 2. Match define calls
  const defineResult = matchDefineCalls(facts.defineCalls, facts.path, facts.classes);
  resources.push(...defineResult.resources);
  gaps.push(...defineResult.gaps);

  // 3. Include file-level gaps
  gaps.push(...facts.gaps);

  return { resources, gaps };
}

