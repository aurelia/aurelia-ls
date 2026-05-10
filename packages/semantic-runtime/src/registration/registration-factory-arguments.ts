import ts from 'typescript';
import type { OpenSeamKindKey } from '../kernel/vocabulary.js';
import {
  readReferenceName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  RegistrationRecognitionOpen,
  RegistrationValueObservation,
} from './registration-observation.js';
import { RegistrationValueKind } from './registration-reference.js';

export interface RegistrationFactoryImportedBindings {
  readonly identifiers: ReadonlySet<string>;
  readonly namespaces: ReadonlySet<string>;
}

export function readRegistrationFactoryNameFromExpression(
  expression: ts.Expression,
  bindings: RegistrationFactoryImportedBindings,
): string | null {
  const call = unwrapExpression(expression);
  return ts.isCallExpression(call)
    ? readRegistrationFactoryNameFromCall(call, bindings)
    : null;
}

export function readRegistrationFactoryNameFromCall(
  call: ts.CallExpression,
  bindings: RegistrationFactoryImportedBindings,
): string | null {
  const expression = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(expression)) {
    return null;
  }
  const receiver = unwrapExpression(expression.expression);
  if (ts.isIdentifier(receiver) && bindings.identifiers.has(receiver.text)) {
    return expression.name.text;
  }
  if (
    ts.isPropertyAccessExpression(receiver)
    && receiver.name.text === 'Registration'
    && ts.isIdentifier(unwrapExpression(receiver.expression))
    && bindings.namespaces.has((unwrapExpression(receiver.expression) as ts.Identifier).text)
  ) {
    return expression.name.text;
  }
  return null;
}

export function readRequiredRegistrationFactoryArgument(
  call: ts.CallExpression,
  index: number,
  openKind: OpenSeamKindKey,
  missingSummary: string,
  openSeams: RegistrationRecognitionOpen[],
): ts.Expression | null {
  const argument = call.arguments[index] ?? null;
  if (argument == null || ts.isSpreadElement(argument)) {
    openSeams.push(new RegistrationRecognitionOpen(openKind, missingSummary, argument ?? call));
    return null;
  }
  return argument;
}

export function readDeferredRegistryParameters(
  call: ts.CallExpression,
  isDeclarationExpression: (expression: ts.Expression) => boolean,
): readonly RegistrationValueObservation[] {
  return call.arguments.slice(1).map((argument) => new RegistrationValueObservation(
    RegistrationValueKind.Unknown,
    readReferenceName(argument),
    argument,
    isDeclarationExpression(argument),
  ));
}
