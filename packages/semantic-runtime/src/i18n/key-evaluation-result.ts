import { auLink } from '../kernel/au-link.js';
import { ExpressionParser } from '../expression/expression-parser.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';

export type I18nTranslationTargetKind =
  | 'attribute-or-property'
  | 'text-content'
  | 'html-content'
  | 'prepend-content'
  | 'append-content';

export class I18nTranslationTarget {
  constructor(
    readonly property: string,
    readonly targetKind: I18nTranslationTargetKind,
  ) {}
}

const I18N_KEY_EXPRESSION_PARSER = new ExpressionParser();

/** Static mirror of Aurelia i18n's `I18nKeyEvaluationResult` key/attribute parsing. */
@auLink('i18n:I18nKeyEvaluationResult')
export class I18nKeyEvaluationResult {
  readonly key: string;
  readonly attributes: readonly string[];

  constructor(keyExpr: string) {
    const matches = /\[([a-z\-, ]*)\]/ig.exec(keyExpr);
    if (matches == null) {
      this.key = keyExpr;
      this.attributes = [];
      return;
    }
    this.key = keyExpr.replace(matches[0], '');
    this.attributes = matches[1]!.split(',');
  }
}

export function i18nKeyEvaluationResults(keyExpr: string): readonly I18nKeyEvaluationResult[] {
  return keyExpr.split(';').map((part) => new I18nKeyEvaluationResult(part));
}

/** Validate static i18n `t` command source before TranslationBinding reparses it as interpolation. */
export function i18nTranslationKeyExpressionValidationSummary(keyExpr: string): string | null {
  if (keyExpr.length === 0 || /[\r\n]/.test(keyExpr)) {
    return `value '${keyExpr}' is not a non-empty single-line i18n translation key expression.`;
  }
  const interpolation = I18N_KEY_EXPRESSION_PARSER.parse(keyExpr, 'Interpolation');
  switch (interpolation.kind) {
    case ExpressionParseResultKind.InterpolationSuccess:
      return null;
    case ExpressionParseResultKind.InterpolationAbsent:
      return i18nStaticKeySegmentsValidationSummary(keyExpr);
    default:
      return `value '${keyExpr}' did not parse as i18n translation interpolation syntax: ${interpolation.kind}.`;
  }
}

function i18nStaticKeySegmentsValidationSummary(keyExpr: string): string | null {
  const segments = i18nKeyEvaluationResults(keyExpr);
  const emptyIndex = segments.findIndex((segment) => segment.key.length === 0);
  if (emptyIndex >= 0) {
    return `value '${keyExpr}' contains an empty translation key segment at index ${emptyIndex}.`;
  }
  const emptyAttribute = segments.find((segment) => segment.attributes.some((attribute) => attribute.trim().length === 0));
  return emptyAttribute == null
    ? null
    : `value '${keyExpr}' contains an empty i18n target attribute segment.`;
}

export function i18nTranslationTargetsForKeyEvaluation(
  evaluation: I18nKeyEvaluationResult,
  tagName: string | null,
): readonly I18nTranslationTarget[] {
  return preprocessI18nTranslationAttributes(evaluation.attributes, tagName)
    .map((property) => new I18nTranslationTarget(property, i18nTranslationTargetKind(property)));
}

function preprocessI18nTranslationAttributes(
  attributes: readonly string[],
  tagName: string | null,
): readonly string[] {
  const normalized = attributes.length === 0
    ? [tagName?.toLowerCase() === 'img' ? 'src' : 'textContent']
    : [...attributes];
  return normalized.map((attribute) => i18nTranslationAttributeAlias(attribute) ?? attribute);
}

function i18nTranslationAttributeAlias(attribute: string): string | null {
  switch (attribute) {
    case 'text':
      return 'textContent';
    case 'html':
      return 'innerHTML';
    default:
      return null;
  }
}

function i18nTranslationTargetKind(property: string): I18nTranslationTargetKind {
  switch (property) {
    case 'textContent':
      return 'text-content';
    case 'innerHTML':
      return 'html-content';
    case 'prepend':
      return 'prepend-content';
    case 'append':
      return 'append-content';
    default:
      return 'attribute-or-property';
  }
}
