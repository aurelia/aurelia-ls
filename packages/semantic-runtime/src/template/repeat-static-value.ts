import {
  RuntimeBindingSourceValueEvaluationKind,
  RuntimeBindingSourceValueEvaluator,
} from '../observation/binding-source-value-evaluator.js';
import type { BindingScope } from '../configuration/scope.js';
import {
  EvaluationArrayValue,
  EvaluationValueKind,
  type EvaluationValue,
} from '../evaluation/values.js';
import { representativeEvaluationValues } from '../evaluation/representative-values.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import type { IteratorBindingScopeEffect } from './runtime-binding.js';
import type { TemplateExpressionParse } from './value-site.js';

/**
 * Projects the value-side shape of Aurelia Repeat's `BindingContext(local, item)`.
 *
 * The scope/type projector already owns the TypeChecker element type. This helper keeps the evaluator-local value
 * carrier separate: when the repeat source is a small static collection, nested bindings can still see an item-shaped
 * value without pretending that semantic-runtime rendered every repeated view instance.
 */
export function repeatStaticLocalValue(
  parse: TemplateExpressionParse | null,
  parent: BindingScope,
  effect: IteratorBindingScopeEffect,
  localName: string,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
): EvaluationValue | null {
  if (sourceValueEvaluator == null || parse?.result.kind !== ExpressionParseResultKind.IteratorSuccess) {
    return null;
  }
  const evaluation = sourceValueEvaluator.evaluate(parse.result.ast.iterable, parent);
  if (evaluation.kind !== RuntimeBindingSourceValueEvaluationKind.Value || evaluation.value == null) {
    return null;
  }
  const item = repeatItemRepresentativeValue(evaluation.value, `repeat.${localName}`, effect.sourceAddressHandle == null ? null : localName);
  if (item == null) {
    return null;
  }
  if (effect.localNames.length === 1) {
    return item;
  }
  return readRepresentativeProperty(item, localName) ?? null;
}

function repeatItemRepresentativeValue(
  value: EvaluationValue,
  path: string,
  sourceLabel: string | null,
): EvaluationValue | null {
  if (value.kind === EvaluationValueKind.Array) {
    return representativeFromArray(value, path, sourceLabel);
  }
  if (value.kind === EvaluationValueKind.Set && !value.weak) {
    return representativeEvaluationValues(
      value.elements.map((element) => element.value),
      path,
      sourceLabel,
    );
  }
  return null;
}

function representativeFromArray(
  value: EvaluationArrayValue,
  path: string,
  sourceLabel: string | null,
): EvaluationValue | null {
  if (value.mayHaveUnknownElements || value.mayHaveUnknownOrder || value.elements.length === 0) {
    return null;
  }
  return representativeEvaluationValues(
    value.elements.map((element) => element.value),
    path,
    sourceLabel,
  );
}

function readRepresentativeProperty(
  value: EvaluationValue,
  name: string,
): EvaluationValue | null {
  if (
    value.kind === EvaluationValueKind.Object
    || value.kind === EvaluationValueKind.BoundaryObject
    || value.kind === EvaluationValueKind.Instance
  ) {
    return value.properties.get(name)?.value ?? null;
  }
  return null;
}
