import ts from 'typescript';

import {
  checkerIterableElementType,
} from './checker-related-types.js';
import {
  checkerRawTypeAssignable,
} from './checker-type-assignability.js';
import {
  checkerUnionType,
} from './checker-type-union.js';

export interface CheckerSignatureCandidateBasis {
  readonly signature: ts.Signature;
  readonly signatureIndex: number;
}

export interface CheckerSignatureParameterType {
  readonly symbol: ts.Symbol;
  readonly type: ts.Type;
}

/** Runtime argument type fact used when Aurelia calls a checker-backed function outside authored call syntax. */
export interface CheckerRuntimeArgumentType {
  readonly type: ts.Type | null;
}

/** Checker signature return projection paired with the signature index that produced it. */
export interface CheckerSignatureReturnType {
  readonly signature: ts.Signature;
  readonly signatureIndex: number;
  readonly type: ts.Type;
}

/** Creates runtime argument facts whose concrete values exist but whose static value types are intentionally unknown. */
export function checkerRuntimeUnknownArguments(
  checker: ts.TypeChecker,
  count: number,
): readonly CheckerRuntimeArgumentType[] {
  return Array.from({ length: count }, () => ({ type: checker.getUnknownType() }));
}

/** Returns call signatures for a possibly nullable callable, matching Aurelia's non-nullish call lane. */
export function checkerCallableContextSignatures(
  checker: ts.TypeChecker,
  type: ts.Type,
): readonly ts.Signature[] {
  const direct = type.getCallSignatures();
  if (direct.length > 0) {
    return direct;
  }
  const nonNullable = checker.getNonNullableType(type);
  return nonNullable === type ? direct : nonNullable.getCallSignatures();
}

/** Selects overload candidates by runtime argument count before falling back to every signature. */
export function checkerSignatureCandidateBasis(
  signatures: readonly ts.Signature[],
  argumentCount: number,
): readonly CheckerSignatureCandidateBasis[] {
  const arityCandidates = signatures
    .map((signature, signatureIndex) => ({ signature, signatureIndex }))
    .filter((candidate) => checkerSignatureAcceptsArgumentCount(candidate.signature, argumentCount));
  return arityCandidates.length > 0
    ? arityCandidates
    : signatures.map((signature, signatureIndex) => ({ signature, signatureIndex }));
}

/** Selects overload candidates from runtime argument count plus any checker-visible runtime argument types. */
export function checkerSignatureCandidateBasisForRuntimeArguments(
  checker: ts.TypeChecker,
  signatures: readonly ts.Signature[],
  args: readonly CheckerRuntimeArgumentType[],
): readonly CheckerSignatureCandidateBasis[] {
  const basis = checkerSignatureCandidateBasis(signatures, args.length);
  const assignableCandidates = basis.filter((candidate) =>
    checkerSignatureAcceptsRuntimeArgumentTypes(checker, candidate.signature, args)
  );
  return assignableCandidates.length > 0 ? assignableCandidates : basis;
}

/** Projects callable return types after runtime argument based overload narrowing. */
export function checkerCallableReturnTypesForRuntimeArguments(
  checker: ts.TypeChecker,
  type: ts.Type,
  args: readonly CheckerRuntimeArgumentType[],
): readonly CheckerSignatureReturnType[] {
  return checkerSignatureCandidateBasisForRuntimeArguments(
    checker,
    checkerCallableContextSignatures(checker, type),
    args,
  ).map((candidate) => ({
    signature: candidate.signature,
    signatureIndex: candidate.signatureIndex,
    type: checker.getReturnTypeOfSignature(candidate.signature),
  }));
}

/** Returns construct signatures for a possibly nullable constructor, matching TypeScript's instanceof lane. */
export function checkerConstructContextSignatures(
  checker: ts.TypeChecker,
  type: ts.Type,
): readonly ts.Signature[] {
  const direct = type.getConstructSignatures();
  if (direct.length > 0) {
    return direct;
  }
  const nonNullable = checker.getNonNullableType(type);
  return nonNullable === type ? direct : nonNullable.getConstructSignatures();
}

/** Returns the union of all construct-signature instance types for non-call-site constructor semantics. */
export function checkerConstructReturnTypeUnion(
  checker: ts.TypeChecker,
  type: ts.Type,
): ts.Type | null {
  const returns = checkerConstructContextSignatures(checker, type)
    .map((signature) => checker.getReturnTypeOfSignature(signature));
  return checkerUnionType(checker, returns);
}

/** Reads the parameter type that receives a runtime argument, unwrapping rest parameters to their element type. */
export function checkerSignatureParameterType(
  checker: ts.TypeChecker,
  signature: ts.Signature,
  argumentIndex: number,
): CheckerSignatureParameterType | null {
  const parameter = checkerParameterForArgumentIndex(signature, argumentIndex);
  if (parameter == null) {
    return null;
  }
  const declaration = parameter.valueDeclaration ?? parameter.declarations?.[0] ?? null;
  if (declaration == null) {
    return null;
  }
  const rawParameterType = checker.getTypeOfSymbolAtLocation(parameter, declaration);
  return {
    symbol: parameter,
    type: checkerSymbolIsRestParameter(parameter)
      ? checkerIterableElementType(checker, rawParameterType) ?? rawParameterType
      : rawParameterType,
  };
}

/** Returns whether a signature can receive the runtime argument count without relying on JS excess arguments. */
export function checkerSignatureAcceptsArgumentCount(
  signature: ts.Signature,
  argumentCount: number,
): boolean {
  const parameters = signature.getParameters();
  if (argumentCount < checkerRequiredParameterCount(signature)) {
    return false;
  }
  if (parameters.length === 0) {
    return argumentCount === 0;
  }
  return checkerSignatureHasRestParameter(signature) || argumentCount <= parameters.length;
}

/** Counts required parameters before the first optional or rest parameter. */
export function checkerRequiredParameterCount(signature: ts.Signature): number {
  let count = 0;
  for (const parameter of signature.getParameters()) {
    if (checkerSymbolIsRestParameter(parameter) || checkerSymbolIsOptionalParameter(parameter)) {
      break;
    }
    count += 1;
  }
  return count;
}

/** Returns the parameter that receives a positional runtime argument, including the trailing rest parameter. */
export function checkerParameterForArgumentIndex(
  signature: ts.Signature,
  argumentIndex: number,
): ts.Symbol | null {
  const parameters = signature.getParameters();
  if (parameters.length === 0) {
    return null;
  }
  return parameters[argumentIndex] ?? parameters[parameters.length - 1] ?? null;
}

/** Returns whether the signature ends in a rest parameter. */
export function checkerSignatureHasRestParameter(signature: ts.Signature): boolean {
  const last = signature.getParameters().at(-1) ?? null;
  return last != null && checkerSymbolIsRestParameter(last);
}

/** Returns whether a parameter symbol came from a rest parameter declaration. */
export function checkerSymbolIsRestParameter(parameter: ts.Symbol): boolean {
  const declaration = parameter.valueDeclaration ?? parameter.declarations?.[0] ?? null;
  return declaration != null
    && ts.isParameter(declaration)
    && declaration.dotDotDotToken != null;
}

/** Returns whether a parameter symbol came from an optional or defaulted parameter declaration. */
export function checkerSymbolIsOptionalParameter(parameter: ts.Symbol): boolean {
  const declaration = parameter.valueDeclaration ?? parameter.declarations?.[0] ?? null;
  return declaration != null
    && ts.isParameter(declaration)
    && (declaration.questionToken != null || declaration.initializer != null);
}

/** Returns whether every call signature is a type-predicate callback, which cannot contextually type ordinary lambdas. */
export function checkerCallableRequiresTypePredicate(
  checker: ts.TypeChecker,
  type: ts.Type,
): boolean {
  const signatures = checkerCallableContextSignatures(checker, type);
  return signatures.length > 0
    && signatures.every((signature) => checker.getTypePredicateOfSignature(signature) != null);
}

/** Produces a compact parameter surface for overload comparison without retaining checker objects in callers. */
export function checkerCallableParameterSurface(
  checker: ts.TypeChecker,
  type: ts.Type,
): string | null {
  const signatures = checkerCallableContextSignatures(checker, type);
  if (signatures.length === 0) {
    return null;
  }
  return signatures.map((signature) => checkerCallableSignatureParameterSurface(
    checker,
    signature,
  )).join(';;');
}

function checkerSignatureAcceptsRuntimeArgumentTypes(
  checker: ts.TypeChecker,
  signature: ts.Signature,
  args: readonly CheckerRuntimeArgumentType[],
): boolean {
  return args.every((arg, argumentIndex) => {
    if (arg.type == null) {
      return true;
    }
    const parameter = checkerSignatureParameterType(checker, signature, argumentIndex);
    return parameter == null || checkerRawTypeAssignable(checker, arg.type, parameter.type);
  });
}

function checkerCallableSignatureParameterSurface(
  checker: ts.TypeChecker,
  signature: ts.Signature,
): string {
  const parameters = signature.getParameters().map((parameter, index) => {
    const parameterType = checkerSignatureParameterType(checker, signature, index);
    return `${checkerSymbolIsRestParameter(parameter) ? '...' : ''}${checkerSymbolIsOptionalParameter(parameter) ? '?' : ''}${parameter.getName()}:${parameterType == null ? 'unknown' : checker.typeToString(parameterType.type)}`;
  });
  return `${checkerRequiredParameterCount(signature)}:${checkerSignatureHasRestParameter(signature) ? 'rest' : 'fixed'}:${parameters.join(',')}`;
}
