import ts from 'typescript';
import type { StaticInvocationFrame } from '../invocation.js';
import { EvaluationOpenSeamKind } from '../seams.js';
import {
  EvaluationUnknownValue,
  EvaluationValueKind,
  type EvaluationValue,
} from '../values.js';
import type { StaticIntrinsicEvaluationHost } from './contracts.js';
import { evaluatePositionalIntrinsicArguments } from './shared.js';

export function evaluateCommonJsRequire(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const specifier = moduleInvocationSpecifier(
    frame,
    host,
    'CommonJS require(...) argument list did not close.',
    'CommonJS require(...) specifier retained open pressure.',
  );
  if (specifier.kind === 'open') {
    return specifier.value;
  }
  if (specifier.value == null) {
    return host.unknown('CommonJS require(...) did not expose a static string specifier.', call, moduleKey, EvaluationOpenSeamKind.DynamicImport);
  }
  return host.resolveCommonJsRequire(moduleKey, specifier.value, call)
    ?? host.unknown(`CommonJS require('${specifier.value}') did not resolve to a local module value.`, call, moduleKey, EvaluationOpenSeamKind.DynamicImport);
}

export function evaluateDynamicImport(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const { node: call, moduleKey } = frame;
  const specifier = moduleInvocationSpecifier(
    frame,
    host,
    'Dynamic import argument list did not close.',
    'Dynamic import specifier retained open pressure.',
  );
  if (specifier.kind === 'open') {
    return specifier.value;
  }
  if (specifier.value == null) {
    return host.unknown('Dynamic import did not expose a static string specifier.', call, moduleKey, EvaluationOpenSeamKind.DynamicImport);
  }
  return host.resolveDynamicImport(moduleKey, specifier.value, call)
    ?? host.unknown(`Dynamic import '${specifier.value}' from ${moduleKey} did not resolve to a local module value.`, call, moduleKey, EvaluationOpenSeamKind.DynamicImport);
}

function moduleInvocationSpecifier(
  frame: StaticInvocationFrame<ts.CallExpression>,
  host: StaticIntrinsicEvaluationHost,
  argumentOpenReason: string,
  specifierOpenReason: string,
): { readonly kind: 'known'; readonly value: string | null }
  | { readonly kind: 'open'; readonly value: EvaluationUnknownValue } {
  const argumentRead = evaluatePositionalIntrinsicArguments(
    frame.argumentList,
    frame.node,
    frame.moduleKey,
    host,
    argumentOpenReason,
  );
  if (argumentRead.kind === 'open') {
    return argumentRead;
  }
  for (const evidence of argumentRead.evidence) {
    host.replayOpenSeams(evidence.openSeams);
  }
  const specifier = argumentRead.evidence[0] ?? null;
  if (specifier?.openSeams.length) {
    return {
      kind: 'open',
      value: new EvaluationUnknownValue(specifierOpenReason, frame.node, true),
    };
  }
  return {
    kind: 'known',
    value: specifier?.value.kind === EvaluationValueKind.String
      ? specifier.value.value
      : null,
  };
}
