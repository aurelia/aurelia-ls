import ts from 'typescript';

import type { EvaluationArgumentList } from '../evaluation/argument-list.js';
import type { StaticInvocationIdentity } from '../evaluation/invocation.js';
import {
  readReferenceName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  EvaluationValueKind,
  type EvaluationValue,
} from '../evaluation/values.js';
import type { AddressHandle } from '../kernel/handles.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  RegistrationAdmissionKind,
} from './registration-admission.js';
import type { RegistrationFactoryShape } from './registration-factory-shapes.js';
import {
  readRequiredRegistrationFactoryArgument,
} from './registration-factory-arguments.js';
import {
  RegistrationAdmissionObservation,
  RegistrationCarrierKind,
  EvaluatedRegistrationKeyDeclarationSource,
  RegistrationKeyObservation,
  RegistrationKeyObservationKind,
  RegistrationRecognitionOpen,
  RegistrationValueObservation,
} from './registration-observation.js';
import { RegistrationValueKind } from './registration-reference.js';

/** Evaluator metadata required to recover one exact runtime `Registration.*(...)` result. */
export interface EvaluatedRegistrationFactory {
  readonly invocationIdentity: StaticInvocationIdentity;
  readonly factoryName: string;
  readonly shape: RegistrationFactoryShape;
  readonly sourceNode: ts.CallExpression;
  readonly argumentList: EvaluationArgumentList;
}

/** Source/key services shared by configuration recognition and candidate-local DI refinement. */
export interface EvaluatedRegistrationFactoryContext {
  sourceFileAddressHandleForNode(node: ts.Node): AddressHandle | null;
  registrationKeyObservationForValue(
    expression: ts.Expression,
    value: EvaluationValue | null,
  ): RegistrationKeyObservation;
}

/** Build one key observation from an already-evaluated value without replaying its source expression. */
export function registrationKeyObservationForEvaluatedValue(
  expression: ts.Expression,
  value: EvaluationValue | null,
  sourceFileAddressHandleForNode: (node: ts.Node) => AddressHandle | null,
): RegistrationKeyObservation {
  const constructable = value?.kind === EvaluationValueKind.Class || value?.kind === EvaluationValueKind.Function
    ? new EvaluatedRegistrationKeyDeclarationSource(
        value.declaration,
        value.environment.moduleKey,
        sourceFileAddressHandleForNode(value.declaration),
      )
    : null;
  const declarationName = constructable == null
    ? null
    : ts.getNameOfDeclaration(constructable.declaration)?.getText(constructable.declaration.getSourceFile()) ?? null;
  return new RegistrationKeyObservation(
    declarationName ?? readReferenceName(expression),
    expression,
    constructable == null ? RegistrationKeyObservationKind.Expression : RegistrationKeyObservationKind.Constructable,
    constructable,
    value,
    sourceFileAddressHandleForNode(expression),
  );
}

/**
 * Project an exact evaluated factory result through the same registration observation vocabulary used by source
 * configuration. The caller decides whether that observation is a source admission or support for a runtime value.
 */
export function registrationAdmissionForEvaluatedFactory(
  context: EvaluatedRegistrationFactoryContext,
  carrier: ts.Expression,
  registrationValue: EvaluationValue,
  evaluation: EvaluatedRegistrationFactory,
  admissionKind: RegistrationAdmissionKind,
): RegistrationAdmissionObservation {
  const openSeams = evaluatedRegistrationFactoryOpenSeams(evaluation);
  const keyArgument = evaluatedRegistrationFactoryArgumentExpression(
    evaluation,
    evaluation.shape.keyArgumentIndex,
  );
  if (keyArgument == null) {
    openSeams.push(new RegistrationRecognitionOpen(
      KernelVocabulary.Registration.OpenKeyExpression.key,
      `Registration.${evaluation.factoryName}(...) did not expose a positionally closed target key.`,
      evaluation.sourceNode,
    ));
  }
  const valueArgument = evaluation.shape.value == null
    ? null
    : evaluatedRegistrationFactoryArgumentExpression(
        evaluation,
        evaluation.shape.value.argumentIndex,
      );
  if (evaluation.shape.value != null && valueArgument == null) {
    openSeams.push(new RegistrationRecognitionOpen(
      evaluation.shape.value.missingOpenKind,
      `Registration.${evaluation.factoryName}(...) did not expose a positionally closed registered value.`,
      evaluation.sourceNode,
    ));
  }
  return new RegistrationAdmissionObservation(
    RegistrationCarrierKind.RegistrationFactoryCall,
    admissionKind,
    evaluation.shape.strategy,
    evaluation.shape.keyRole,
    carrier,
    keyArgument == null
      ? null
      : context.registrationKeyObservationForValue(
          keyArgument,
          evaluatedRegistrationFactoryArgument(evaluation, evaluation.shape.keyArgumentIndex),
        ),
    valueArgument == null || evaluation.shape.value == null
      ? null
      : evaluatedRegistrationValueObservation(
          context,
          evaluation.shape.value.valueKind,
          valueArgument,
          evaluatedRegistrationFactoryArgument(evaluation, evaluation.shape.value.argumentIndex),
        ),
    evaluation.factoryName === 'defer'
      ? evaluatedDeferredRegistryParameters(context, evaluation)
      : [],
    openSeams,
    null,
    registrationValue,
  );
}

/** Candidate-local factory value support uses the factory call itself as its path-proven source carrier. */
export function registrationFactoryValueObservation(
  context: EvaluatedRegistrationFactoryContext,
  registrationValue: EvaluationValue,
  evaluation: EvaluatedRegistrationFactory,
): RegistrationAdmissionObservation {
  return registrationAdmissionForEvaluatedFactory(
    context,
    evaluation.sourceNode,
    registrationValue,
    evaluation,
    RegistrationAdmissionKind.RegistrationFactory,
  );
}

export function evaluatedRegistrationValueObservation(
  context: EvaluatedRegistrationFactoryContext,
  valueKind: RegistrationValueKind,
  expression: ts.Expression,
  value: EvaluationValue | null,
): RegistrationValueObservation {
  if (valueKind === RegistrationValueKind.AliasTarget) {
    return new RegistrationValueObservation(
      valueKind,
      readReferenceName(expression),
      expression,
      false,
      null,
      null,
      context.sourceFileAddressHandleForNode(expression),
      null,
      null,
      context.registrationKeyObservationForValue(expression, value),
      value,
    );
  }
  if (
    valueKind === RegistrationValueKind.Constructable
    && value != null
    && (value.kind === EvaluationValueKind.Class || value.kind === EvaluationValueKind.Function)
  ) {
    const declarationHandle = context.sourceFileAddressHandleForNode(value.declaration);
    const sourceNode = declarationHandle == null ? expression : value.declaration;
    return new RegistrationValueObservation(
      valueKind,
      declarationName(value.declaration) ?? readReferenceName(expression),
      sourceNode,
      declarationHandle != null,
      null,
      null,
      declarationHandle,
      declarationHandle == null ? null : value.environment.moduleKey,
      null,
      null,
      value,
    );
  }
  return new RegistrationValueObservation(
    valueKind,
    readReferenceName(expression),
    expression,
    isDeclarationExpression(expression),
    null,
    null,
    context.sourceFileAddressHandleForNode(expression),
    null,
    null,
    null,
    value,
  );
}

function evaluatedDeferredRegistryParameters(
  context: EvaluatedRegistrationFactoryContext,
  evaluation: EvaluatedRegistrationFactory,
): readonly RegistrationValueObservation[] {
  return evaluation.argumentList.elements
    .filter((element) => element.runtimeIndex != null && element.runtimeIndex >= 1)
    .sort((left, right) => left.runtimeIndex! - right.runtimeIndex!)
    .map((element) => new RegistrationValueObservation(
    RegistrationValueKind.Unknown,
    element.expression == null ? null : readReferenceName(element.expression),
    element.expression ?? evaluation.sourceNode,
    element.expression != null && isDeclarationExpression(element.expression),
    null,
    null,
    context.sourceFileAddressHandleForNode(element.expression ?? evaluation.sourceNode),
    null,
    null,
    null,
    element.openSeams.length === 0 ? element.value : null,
  ));
}

export function evaluatedRegistrationFactoryArgument(
  evaluation: EvaluatedRegistrationFactory,
  index: number,
): EvaluationValue | null {
  const element = evaluation.argumentList.elements.find((candidate) => candidate.runtimeIndex === index) ?? null;
  return element == null || element.openSeams.length > 0
    ? null
    : element.value;
}

function evaluatedRegistrationFactoryArgumentExpression(
  evaluation: EvaluatedRegistrationFactory,
  index: number,
): ts.Expression | null {
  return evaluation.argumentList.elements.find((candidate) => candidate.runtimeIndex === index)?.expression ?? null;
}

function evaluatedRegistrationFactoryOpenSeams(
  evaluation: EvaluatedRegistrationFactory,
): RegistrationRecognitionOpen[] {
  return evaluation.argumentList.aggregateOpenSeams.map((seam) => new RegistrationRecognitionOpen(
    KernelVocabulary.Registration.OpenValueExpression.key,
    seam.summary,
    seam.node,
    seam.reasonKinds,
  ));
}

function declarationName(declaration: ts.Declaration): string | null {
  const name = ts.getNameOfDeclaration(declaration);
  return name != null && (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name))
    ? name.text
    : null;
}

function isDeclarationExpression(expression: ts.Expression): boolean {
  const current = unwrapExpression(expression);
  return ts.isClassExpression(current) || ts.isFunctionExpression(current);
}
