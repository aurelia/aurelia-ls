/**
 * Pattern Matchers - Resource Recognition
 *
 * Pattern matchers take an enriched ClassValue and determine if it's
 * an Aurelia resource, extracting metadata to produce ResourceDef.
 *
 * Patterns are tried in priority order:
 * 1. Decorator (@customElement, @customAttribute, etc.)
 * 2. Static $au property
 * 3. Define call (CustomElement.define, etc.)
 * 4. Naming convention (suffix + sibling template)
 *
 * First match wins. If no match, class is not a resource.
 */

export { matchDecorator, type DecoratorMatchResult } from './decorator.js';
export { matchStaticAu, type StaticAuMatchResult } from './static-au.js';
export { matchDefine, type DefineMatchResult } from './define.js';
export { matchConvention, type ConventionMatchResult } from './convention.js';
export {
  matchAll,
  matchFile,
  matchExpected,
  matchDefineCalls,
  matchFileFacts,
  type MatchResult,
  type FileMatchResult,
} from './pipeline.js';
