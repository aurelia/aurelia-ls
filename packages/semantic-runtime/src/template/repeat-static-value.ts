import {
  RuntimeBindingSourceValueEvaluator,
} from '../observation/binding-source-value-evaluator.js';
import {
  bindingSourceValueEvaluationWithPressure,
  openBindingSourceSlotNoStaticValue,
  RuntimeBindingSourceValueEvaluation,
} from '../configuration/binding-source-value-evaluation.js';
import {
  projectRuntimeBindingSourceValueContextInScope,
} from '../observation/binding-source-value-evaluation-context.js';
import type { BindingScope } from '../configuration/scope.js';
import type { TemplateResourceScope } from './compiler-world.js';
import {
  type RuntimeBindingExpressionScopeProjectionReader,
} from '../observation/runtime-binding-expression-scope.js';
import {
  expressionProductHandleForBinding,
  type RuntimeExpressionBinding,
} from '../observation/runtime-binding-expression.js';
import type { RuntimeRenderingEmission } from './runtime-rendering-materializer.js';
import type { RuntimeExpressionResourcePlan } from './runtime-expression-resource-plan.js';
import {
  EvaluationArrayValue,
  EvaluationKeyedCollectionEntryState,
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
  binding: RuntimeExpressionBinding | null = null,
  runtimeBindings: RuntimeRenderingEmission | null = null,
  bindingExpressionScopes: RuntimeBindingExpressionScopeProjectionReader | null = null,
  expressionResourcePlan: RuntimeExpressionResourcePlan | null = null,
  resourceScope: TemplateResourceScope | null = null,
): RuntimeBindingSourceValueEvaluation | null {
  if (sourceValueEvaluator == null || parse?.result.kind !== ExpressionParseResultKind.IteratorSuccess) {
    return null;
  }
  const contextProjection = projectRuntimeBindingSourceValueContextInScope({
    runtimeBindings,
    bindingExpressionScopes,
    expressionResourcePlan,
    binding,
    expressionProductHandle: binding == null ? null : expressionProductHandleForBinding(binding),
    expressionChainIndex: 0,
    expression: parse.result.ast.iterable,
    localKey: `repeat-static-local:${effect.productHandle}:${localName}:iterable`,
    sourceScope: parent,
    resourceScope,
  });
  if (contextProjection.context == null) {
    return null;
  }
  const evaluation = sourceValueEvaluator.evaluate(contextProjection.context);
  const item = evaluation.value == null
    ? null
    : repeatItemRepresentativeValue(
        evaluation.value,
        `repeat.${localName}`,
        effect.sourceAddressHandle == null ? null : localName,
      );
  if (item == null) {
    return bindingSourceValueEvaluationWithPressure(
      openBindingSourceSlotNoStaticValue(
        `Repeat source did not expose a representative value for local '${localName}'.`,
      ),
      [evaluation],
    );
  }
  const localIndex = effect.localNames.indexOf(localName);
  const objectBindingSourceKey = localIndex < 0
    ? undefined
    : effect.objectBindingSourceKeys[localIndex];
  const localValue = objectBindingSourceKey === undefined
    ? effect.localNames.length === 1
      ? item
      : readRepresentativeProperty(item, localName)
    : readRepresentativeProperty(item, String(objectBindingSourceKey));
  return localValue == null
    ? bindingSourceValueEvaluationWithPressure(
        openBindingSourceSlotNoStaticValue(
          `Repeat representative value did not expose destructured local '${localName}'.`,
        ),
        [evaluation],
      )
    : bindingSourceValueEvaluationWithPressure(
        RuntimeBindingSourceValueEvaluation.value(localValue),
        [evaluation],
      );
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
    if (
      value.mayHaveUnknownElements
      || value.mayHaveUnknownOrder
      || value.elements.some((element) =>
        element.state !== EvaluationKeyedCollectionEntryState.Present
        || element.openSeams.length > 0
        || element.presenceOpenSeams.length > 0
      )
    ) {
      return null;
    }
    return representativeEvaluationValues(
      value.elements
        .filter((element) => element.state === EvaluationKeyedCollectionEntryState.Present)
        .map((element) => element.value),
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
