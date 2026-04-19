import * as ts from 'typescript';

import type { ApiId } from './api-detection-contract.js';
import type {
  Registration,
  RegistrationKind,
  RegistrationTargetMode,
} from './di-interface-contract.js';
import { firstReturnedExpression, unwrapExpression } from './ts-analysis-utils.js';

export function extractBuilderRegistration(
  callExpression: ts.CallExpression,
): Registration | null {
  const builderExpression = findBuilderExpression(callExpression);
  if (!builderExpression) {
    return null;
  }

  const returned = unwrapExpression(builderExpression);
  if (!ts.isCallExpression(returned)) {
    return createUnknownRegistration(returned);
  }

  const registration = buildRegistrationFromCall(
    returned,
    resolveRegistrationApiId(returned.expression),
    'implicit-interface-self',
  );
  return registration ?? createUnknownRegistration(returned);
}

export function buildRegistrationFromCall(
  callExpression: ts.CallExpression,
  apiId: ApiId | null,
  targetMode: RegistrationTargetMode,
): Registration | null {
  if (!apiId || !apiId.startsWith('registration.')) {
    return null;
  }

  const args = callExpression.arguments.map((argument) =>
    argument.getText(callExpression.getSourceFile()));
  const registrationKind = apiId.replace('registration.', '') as RegistrationKind;

  switch (registrationKind) {
    case 'instance':
    case 'singleton':
    case 'transient':
      return {
        kind: registrationKind,
        targetMode,
        args,
      };
    case 'callback':
    case 'cachedCallback':
      return {
        kind: registrationKind,
        targetMode,
        args,
      };
    case 'aliasTo':
      return {
        kind: registrationKind,
        targetMode,
        args,
      };
    default:
      return {
        kind: 'unknown',
        targetMode: 'unknown',
        args: [callExpression.getText(callExpression.getSourceFile())],
      };
  }
}

function createUnknownRegistration(
  expression: ts.Expression,
): Registration {
  return {
    kind: 'unknown',
    targetMode: 'unknown',
    args: [expression.getText(expression.getSourceFile())],
  };
}

export function getRegistrationTargetExpression(
  registration: Registration,
): string | null {
  return registration.targetMode === 'explicit-first-arg'
    ? (registration.args[0] ?? null)
    : null;
}

export function getRegistrationValueExpression(
  registration: Registration,
): string | null {
  if (registration.kind === 'aliasTo') {
    return null;
  }
  return registration.targetMode === 'explicit-first-arg'
    ? (registration.args[1] ?? null)
    : (registration.args[0] ?? null);
}

export function getRegistrationAliasTargetExpression(
  registration: Registration,
): string | null {
  if (registration.kind !== 'aliasTo') {
    return null;
  }
  return registration.targetMode === 'explicit-first-arg'
    ? (registration.args[1] ?? null)
    : (registration.args[0] ?? null);
}

export function getRegistrationPrimaryExpression(
  registration: Registration,
): string | null {
  return getRegistrationValueExpression(registration)
    ?? getRegistrationAliasTargetExpression(registration)
    ?? (registration.args[0] ?? null);
}

function findBuilderExpression(
  callExpression: ts.CallExpression,
): ts.Expression | null {
  const builderArgument = callExpression.arguments.find((arg) =>
    ts.isArrowFunction(arg) || ts.isFunctionExpression(arg));
  if (!builderArgument) {
    return null;
  }

  if (ts.isArrowFunction(builderArgument)) {
    if (ts.isBlock(builderArgument.body)) {
      return firstReturnedExpression(builderArgument.body);
    }
    return builderArgument.body;
  }

  return firstReturnedExpression(builderArgument.body);
}

function resolveRegistrationApiId(
  expression: ts.Expression,
): ApiId | null {
  const unwrapped = unwrapExpression(expression);
  if (!ts.isPropertyAccessExpression(unwrapped)) {
    return null;
  }

  switch (unwrapped.name.text) {
    case 'instance':
      return 'registration.instance';
    case 'singleton':
      return 'registration.singleton';
    case 'transient':
      return 'registration.transient';
    case 'callback':
      return 'registration.callback';
    case 'cachedCallback':
      return 'registration.cachedCallback';
    case 'aliasTo':
      return 'registration.aliasTo';
    default:
      return null;
  }
}
