import type { ObjectBindingPattern } from './ast.js';
import { ExpressionFrameworkErrorCode } from './framework-error-code.js';
import type { SourceSpan } from './source-span.js';

const reservedRepeatObjectBindingLocalNames = new Set([
  ...Object.getOwnPropertyNames(Object.prototype),
  '$index',
  '$length',
  '$odd',
  '$even',
  '$first',
  '$middle',
  '$last',
  '$previous',
  '$item',
  '__items__',
]);

export interface RepeatObjectBindingPatternProjection {
  readonly admitted: true;
  /** Source properties observed by Repeat, aligned with `localNames`. */
  readonly sourceKeys: readonly (string | number)[];
  /** Writable row-local names updated one-way from the aligned source properties. */
  readonly localNames: readonly string[];
}

export interface RepeatObjectBindingPatternRejection {
  readonly admitted: false;
  readonly span: SourceSpan;
  readonly message: string;
  readonly frameworkErrorCode: string;
}

export type RepeatObjectBindingPatternAdmission =
  | RepeatObjectBindingPatternProjection
  | RepeatObjectBindingPatternRejection;

/**
 * Applies the RC2 Repeat admission rule after the ordinary object-pattern
 * grammar has closed. Repeat supports only a shallow source-key-to-local
 * projection; defaults, nested targets, duplicate locals, and names shadowed
 * by Repeat/override-context lookup are rejected.
 */
export function admitRepeatObjectBindingPattern(
  pattern: ObjectBindingPattern,
): RepeatObjectBindingPatternAdmission {
  if (pattern.rest != null) {
    return {
      admitted: false,
      span: pattern.rest.span,
      message: 'Object binding pattern rest is not supported',
      frameworkErrorCode: ExpressionFrameworkErrorCode.ParseInvalidIdentifierObjectLiteralKey,
    };
  }

  const sourceKeys: (string | number)[] = [];
  const localNames: string[] = [];
  const seenLocalNames = new Set<string>();
  for (const property of pattern.properties) {
    const value = property.value;
    if (value.$kind !== 'BindingIdentifier') {
      return unsupportedObjectBindingPattern(value.span);
    }
    const localName = value.name.name;
    if (seenLocalNames.has(localName) || reservedRepeatObjectBindingLocalNames.has(localName)) {
      return unsupportedObjectBindingPattern(value.span);
    }
    seenLocalNames.add(localName);
    sourceKeys.push(property.key);
    localNames.push(localName);
  }

  return { admitted: true, sourceKeys, localNames };
}

function unsupportedObjectBindingPattern(span: SourceSpan): RepeatObjectBindingPatternRejection {
  return {
    admitted: false,
    span,
    message: 'Object binding patterns only support identifiers and aliases with unique, non-reserved local names',
    frameworkErrorCode: ExpressionFrameworkErrorCode.ParseUnsupportedObjectBindingPattern,
  };
}
