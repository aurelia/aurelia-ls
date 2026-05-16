import ts from 'typescript';
import { EvaluationOpenSeamKind } from '../seams.js';
import type { EvaluationValue } from '../values.js';
import type { StaticIntrinsicEvaluationHost } from './contracts.js';

export function evaluateCommonJsRequire(
  call: ts.CallExpression,
  moduleKey: string,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const specifier = call.arguments[0];
  if (specifier == null || !ts.isStringLiteralLike(specifier)) {
    return host.unknown('CommonJS require(...) did not expose a static string specifier.', call, moduleKey, EvaluationOpenSeamKind.DynamicImport);
  }
  return host.resolveCommonJsRequire(moduleKey, specifier.text, call)
    ?? host.unknown(`CommonJS require('${specifier.text}') did not resolve to a local module value.`, call, moduleKey, EvaluationOpenSeamKind.DynamicImport);
}

export function evaluateDynamicImport(
  call: ts.CallExpression,
  moduleKey: string,
  host: StaticIntrinsicEvaluationHost,
): EvaluationValue {
  const specifier = call.arguments[0];
  if (specifier == null || !ts.isStringLiteralLike(specifier)) {
    return host.unknown('Dynamic import did not expose a static string specifier.', call, moduleKey, EvaluationOpenSeamKind.DynamicImport);
  }
  return host.resolveDynamicImport(moduleKey, specifier.text, call)
    ?? host.unknown(`Dynamic import '${specifier.text}' from ${moduleKey} did not resolve to a local module value.`, call, moduleKey, EvaluationOpenSeamKind.DynamicImport);
}
