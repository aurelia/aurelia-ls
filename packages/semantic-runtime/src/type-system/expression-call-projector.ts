import ts from 'typescript';
import type { BindingScope } from '../configuration/scope.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  type CheckerTypeProjectionRequest,
} from './checker-projector.js';
import {
  checkerIterableElementType,
} from './checker-related-types.js';
import {
  type CheckerExpressionTypeEvaluation,
  CheckerExpressionTypeEvaluationResultKind,
  CheckerExpressionTypeOpenKind,
} from './expression-type-evaluation.js';
import { commonTypeReference } from './expression-type-synthesis.js';
import { CheckerExpressionTypeSupport } from './expression-type-support.js';
import {
  CheckerTypeProjectionOrigin,
  type CheckerTypeReference,
  type CheckerTypeShape,
  CheckerTypeShapeKind,
} from './type-shape.js';

export interface CheckerExpressionCallArgument {
  readonly expression: ExpressionAstNode;
  readonly localKey: string;
  readonly precomputedEvaluation?: CheckerExpressionTypeEvaluation;
}

export function checkerExpressionCallArguments(
  expressions: readonly ExpressionAstNode[],
  localKey: string,
): readonly CheckerExpressionCallArgument[] {
  return expressions.map((expression, index) => ({
    expression,
    localKey: `${localKey}:${index}`,
  }));
}

export const enum CheckerExpressionCallableParameterKind {
  /** A declared callback parameter receives one runtime argument value. Target rest parameters project to their element type. */
  Positional = 'positional',
  /** A declared callback rest parameter receives an array or tuple of the remaining runtime argument values. */
  Rest = 'rest',
}

export interface CheckerExpressionCallProjectorHost {
  evaluateNode(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    contextualType?: CheckerTypeReference | null,
  ): CheckerExpressionTypeEvaluation;
}

interface CheckerExpressionSignatureCandidate {
  readonly signature: ts.Signature;
  readonly signatureIndex: number;
  readonly hasRejectedArgument: boolean;
  readonly hasOpenArgument: boolean;
}

/** Projects TypeChecker call/construct signatures through Aurelia expression argument semantics. */
export class CheckerExpressionCallProjector {
  constructor(
    private readonly support: CheckerExpressionTypeSupport,
    private readonly host: CheckerExpressionCallProjectorHost,
  ) {}

  evaluateCallReturn(
    expression: ExpressionAstNode,
    calleeType: CheckerTypeShape,
    args: readonly CheckerExpressionCallArgument[],
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionTypeEvaluation {
    if (calleeType.shapeKind === CheckerTypeShapeKind.Any) {
      return this.support.type(calleeType, 'Calling any remains any.');
    }
    if (calleeType.callReturnType?.productHandle != null) {
      return this.support.resolveReference(
        expression,
        calleeType.callReturnType,
        `${localKey}:synthetic-return`,
        CheckerExpressionTypeOpenKind.UnsupportedCallTarget,
        `Call target '${calleeType.display}' carries a return reference that could not be hydrated.`,
      );
    }

    const type = calleeType.carrier?.type ?? null;
    const checker = calleeType.carrier?.checker ?? null;
    if (type == null || checker == null) {
      return this.support.open(
        calleeType.callReturnType == null
          ? CheckerExpressionTypeOpenKind.MissingChecker
          : CheckerExpressionTypeOpenKind.UnsupportedCallTarget,
        expression,
        calleeType.callReturnType == null
          ? `Call target '${calleeType.display}' has no checker carrier for signature projection.`
          : `Call target '${calleeType.display}' has a return type reference without a hydrated product.`,
        calleeType.callReturnType ?? calleeType.toReference(),
      );
    }

    const signatures = type.getCallSignatures();
    if (signatures.length === 0) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.UnsupportedCallTarget,
        expression,
        `Type '${calleeType.display}' has no call signature to project.`,
        calleeType.toReference(),
      );
    }

    const candidates = this.selectSignatureCandidates(checker, signatures, args, scope, localKey, sourceAddressHandle);
    const returns = candidates.map((candidate) =>
      this.support.projectType(
        expression,
        checker,
        checker.getReturnTypeOfSignature(candidate.signature),
        `${localKey}:return:${candidate.signatureIndex}`,
        sourceAddressHandle,
      )
    );
    return this.support.evaluateTypeUnion(
      returns,
      `${localKey}:return`,
      sourceAddressHandle,
      `Projected call return type for '${calleeType.display}'.`,
    );
  }

  contextualCallArgumentType(
    calleeType: CheckerTypeShape,
    signatureArgumentIndex: number,
    runtimeArgumentCount: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerTypeReference | null {
    const type = calleeType.carrier?.type ?? null;
    const checker = calleeType.carrier?.checker ?? null;
    if (type == null || checker == null) {
      return null;
    }
    return this.contextualSignatureParameterType(
      checker,
      type.getCallSignatures(),
      signatureArgumentIndex,
      runtimeArgumentCount,
      localKey,
      sourceAddressHandle,
    );
  }

  evaluateConstructReturn(
    expression: ExpressionAstNode,
    constructorType: CheckerTypeShape,
    args: readonly CheckerExpressionCallArgument[],
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionTypeEvaluation {
    if (constructorType.constructReturnType?.productHandle != null) {
      return this.support.resolveReference(
        expression,
        constructorType.constructReturnType,
        `${localKey}:synthetic-construct-return`,
        CheckerExpressionTypeOpenKind.UnsupportedConstruct,
        `Construct target '${constructorType.display}' carries an instance reference that could not be hydrated.`,
      );
    }

    const type = constructorType.carrier?.type ?? null;
    const checker = constructorType.carrier?.checker ?? null;
    if (type == null || checker == null) {
      return this.support.open(
        constructorType.constructReturnType == null
          ? CheckerExpressionTypeOpenKind.MissingChecker
          : CheckerExpressionTypeOpenKind.UnsupportedConstruct,
        expression,
        constructorType.constructReturnType == null
          ? `Construct target '${constructorType.display}' has no checker carrier for construct-signature projection.`
          : `Construct target '${constructorType.display}' has an instance type reference without a hydrated product.`,
        constructorType.constructReturnType ?? constructorType.toReference(),
      );
    }

    const signatures = type.getConstructSignatures();
    if (signatures.length === 0) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.UnsupportedConstruct,
        expression,
        `Type '${constructorType.display}' has no construct signature to project.`,
        constructorType.toReference(),
      );
    }

    const candidates = this.selectSignatureCandidates(checker, signatures, args, scope, localKey, sourceAddressHandle);
    const returns = candidates.map((candidate) =>
      this.support.projectType(
        expression,
        checker,
        checker.getReturnTypeOfSignature(candidate.signature),
        `${localKey}:return:${candidate.signatureIndex}`,
        sourceAddressHandle,
      )
    );
    return this.support.evaluateTypeUnion(
      returns,
      `${localKey}:construct-return`,
      sourceAddressHandle,
      `Projected construct return type for '${constructorType.display}'.`,
    );
  }

  contextualConstructArgumentType(
    constructorType: CheckerTypeShape,
    argumentIndex: number,
    runtimeArgumentCount: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerTypeReference | null {
    const type = constructorType.carrier?.type ?? null;
    const checker = constructorType.carrier?.checker ?? null;
    if (type == null || checker == null) {
      return null;
    }
    return this.contextualSignatureParameterType(
      checker,
      type.getConstructSignatures(),
      argumentIndex,
      runtimeArgumentCount,
      localKey,
      sourceAddressHandle,
    );
  }

  contextualCallableParameterType(
    callableType: CheckerTypeShape,
    parameterIndex: number,
    runtimeParameterCount: number,
    parameterKind: CheckerExpressionCallableParameterKind,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerTypeReference | null {
    const type = callableType.carrier?.type ?? null;
    const checker = callableType.carrier?.checker ?? null;
    if (type == null || checker == null) {
      return null;
    }
    const signatures = type.getCallSignatures();
    return parameterKind === CheckerExpressionCallableParameterKind.Rest
      ? this.contextualRestBindingParameterType(
        checker,
        signatures,
        parameterIndex,
        runtimeParameterCount,
        localKey,
        sourceAddressHandle,
      )
      : this.contextualSignatureParameterType(
        checker,
        signatures,
        parameterIndex,
        runtimeParameterCount,
        localKey,
        sourceAddressHandle,
      );
  }

  private selectSignatureCandidates(
    checker: ts.TypeChecker,
    signatures: readonly ts.Signature[],
    args: readonly CheckerExpressionCallArgument[],
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): readonly CheckerExpressionSignatureCandidate[] {
    const basis = signatureCandidateBasis(signatures, args.length);
    if (basis.length === 1) {
      const [candidate] = basis;
      return [{
        signature: candidate!.signature,
        signatureIndex: candidate!.signatureIndex,
        hasRejectedArgument: false,
        hasOpenArgument: false,
      }];
    }

    const candidates = basis.map((candidate) =>
      this.signatureCandidate(checker, candidate.signature, candidate.signatureIndex, args, scope, localKey, sourceAddressHandle)
    );
    const fullyTyped = candidates.filter((candidate) =>
      !candidate.hasRejectedArgument && !candidate.hasOpenArgument
    );
    if (fullyTyped.length > 0) {
      return fullyTyped;
    }
    const notRejected = candidates.filter((candidate) => !candidate.hasRejectedArgument);
    return notRejected.length > 0 ? notRejected : candidates;
  }

  private contextualSignatureParameterType(
    checker: ts.TypeChecker,
    signatures: readonly ts.Signature[],
    argumentIndex: number,
    runtimeArgumentCount: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const basis = signatureCandidateBasis(signatures, runtimeArgumentCount);
    const parameterTypes = basis
      .map((candidate) => this.parameterTypeReference(
        checker,
        candidate.signature,
        candidate.signatureIndex,
        argumentIndex,
        `${localKey}:signature:${candidate.signatureIndex}:arg:${argumentIndex}:contextual`,
        sourceAddressHandle,
      ))
      .filter((reference): reference is CheckerTypeReference => reference != null);
    return commonTypeReference(parameterTypes, basis.length);
  }

  private contextualRestBindingParameterType(
    checker: ts.TypeChecker,
    signatures: readonly ts.Signature[],
    parameterIndex: number,
    runtimeParameterCount: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const basis = signatureCandidateBasis(signatures, runtimeParameterCount);
    const parameterTypes = basis
      .map((candidate) => this.restBindingParameterTypeReference(
        checker,
        candidate.signature,
        candidate.signatureIndex,
        parameterIndex,
        `${localKey}:signature:${candidate.signatureIndex}:rest:${parameterIndex}:contextual`,
        sourceAddressHandle,
      ))
      .filter((reference): reference is CheckerTypeReference => reference != null);
    return commonTypeReference(parameterTypes, basis.length);
  }

  private signatureCandidate(
    checker: ts.TypeChecker,
    signature: ts.Signature,
    signatureIndex: number,
    args: readonly CheckerExpressionCallArgument[],
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionSignatureCandidate {
    let hasRejectedArgument = false;
    let hasOpenArgument = false;
    args.forEach((arg, argIndex) => {
      const parameterType = this.parameterTypeReference(
        checker,
        signature,
        signatureIndex,
        argIndex,
        `${localKey}:signature:${signatureIndex}:arg:${argIndex}`,
        sourceAddressHandle,
      );
      const evaluation = arg.precomputedEvaluation ?? this.host.evaluateNode(
        arg.expression,
        scope,
        arg.localKey,
        sourceAddressHandle,
        parameterType,
      );
      if (evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
        hasOpenArgument = true;
        return;
      }
      if (!this.argumentAssignableToParameter(evaluation.typeShape, parameterType)) {
        hasRejectedArgument = true;
      }
    });
    return { signature, signatureIndex, hasRejectedArgument, hasOpenArgument };
  }

  private parameterTypeReference(
    checker: ts.TypeChecker,
    signature: ts.Signature,
    signatureIndex: number,
    argIndex: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const parameter = parameterForArgumentIndex(signature, argIndex);
    if (parameter == null) {
      return null;
    }
    const declaration = parameter.valueDeclaration ?? parameter.declarations?.[0] ?? null;
    if (declaration == null) {
      return null;
    }
    const rawParameterType = checker.getTypeOfSymbolAtLocation(parameter, declaration);
    const parameterType = isRestParameter(parameter)
      ? checkerIterableElementType(checker, rawParameterType) ?? rawParameterType
      : rawParameterType;
    return this.projectParameterTypeReference(checker, parameter, parameterType, localKey, sourceAddressHandle);
  }

  private restBindingParameterTypeReference(
    checker: ts.TypeChecker,
    signature: ts.Signature,
    signatureIndex: number,
    parameterIndex: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const parameters = signature.getParameters();
    const restIndex = parameters.findIndex((parameter) => isRestParameter(parameter));
    if (restIndex === parameterIndex) {
      return this.rawParameterTypeReference(
        checker,
        parameters[restIndex]!,
        `${localKey}:signature:${signatureIndex}:parameter:${parameterIndex}:rest-array`,
        sourceAddressHandle,
      );
    }

    const remainingFixedParameters = restIndex === -1
      ? parameters.slice(parameterIndex)
      : parameters.slice(parameterIndex, restIndex);
    const fixedElements = remainingFixedParameters
      .map((parameter, offset) => {
        const absoluteIndex = parameterIndex + offset;
        const reference = this.rawParameterTypeReference(
          checker,
          parameter,
          `${localKey}:signature:${signatureIndex}:parameter:${absoluteIndex}:fixed`,
          sourceAddressHandle,
        );
        return reference == null
          ? null
          : { name: parameter.getName(), valueType: reference };
      })
      .filter((element): element is { readonly name: string; readonly valueType: CheckerTypeReference } => element != null);
    const restElement = restIndex > parameterIndex
      ? this.rawParameterTypeReference(
        checker,
        parameters[restIndex]!,
        `${localKey}:signature:${signatureIndex}:parameter:${restIndex}:trailing-rest`,
        sourceAddressHandle,
      )
      : null;

    if (fixedElements.length !== remainingFixedParameters.length || (restIndex > parameterIndex && restElement == null)) {
      return null;
    }
    if (fixedElements.length === 0 && restElement == null) {
      return null;
    }

    return this.support.synthesis.tupleType(
      restElement == null
        ? fixedElements
        : [...fixedElements, { name: parameters[restIndex]!.getName(), valueType: restElement, isRest: true }],
      null,
      `${localKey}:remaining`,
      sourceAddressHandle,
    ).toReference();
  }

  private rawParameterTypeReference(
    checker: ts.TypeChecker,
    parameter: ts.Symbol,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const declaration = parameter.valueDeclaration ?? parameter.declarations?.[0] ?? null;
    if (declaration == null) {
      return null;
    }
    const parameterType = checker.getTypeOfSymbolAtLocation(parameter, declaration);
    return this.projectParameterTypeReference(checker, parameter, parameterType, localKey, sourceAddressHandle);
  }

  private projectParameterTypeReference(
    checker: ts.TypeChecker,
    parameter: ts.Symbol,
    parameterType: ts.Type,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference {
    const declaration = parameter.valueDeclaration ?? parameter.declarations?.[0] ?? null;
    return this.support.projector.ensureProjection({
      localKey,
      checker,
      type: parameterType,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode: declaration,
      sourceAddressHandle,
      display: checker.typeToString(parameterType),
    } satisfies CheckerTypeProjectionRequest).toReference();
  }

  private argumentAssignableToParameter(
    argumentType: CheckerTypeShape,
    parameterType: CheckerTypeReference | null,
  ): boolean {
    if (parameterType == null || argumentType.shapeKind === CheckerTypeShapeKind.Any || argumentType.shapeKind === CheckerTypeShapeKind.Unknown) {
      return true;
    }
    const parameterShape = this.support.typeShapeForReference(parameterType);
    const argumentCarrier = argumentType.carrier;
    const parameterCarrier = parameterShape?.carrier ?? null;
    if (argumentCarrier == null || parameterCarrier == null || argumentCarrier.checker !== parameterCarrier.checker) {
      return true;
    }
    return argumentCarrier.checker.isTypeAssignableTo(argumentCarrier.type, parameterCarrier.type);
  }

}

function signatureCandidateBasis(
  signatures: readonly ts.Signature[],
  argumentCount: number,
): readonly { readonly signature: ts.Signature; readonly signatureIndex: number }[] {
  const arityCandidates = signatures
    .map((signature, signatureIndex) => ({ signature, signatureIndex }))
    .filter((candidate) => signatureAcceptsArgumentCount(candidate.signature, argumentCount));
  return arityCandidates.length > 0
    ? arityCandidates
    : signatures.map((signature, signatureIndex) => ({ signature, signatureIndex }));
}

function signatureAcceptsArgumentCount(
  signature: ts.Signature,
  argumentCount: number,
): boolean {
  const parameters = signature.getParameters();
  if (argumentCount < requiredParameterCount(signature)) {
    return false;
  }
  if (parameters.length === 0) {
    return argumentCount === 0;
  }
  return hasRestParameter(signature) || argumentCount <= parameters.length;
}

function requiredParameterCount(signature: ts.Signature): number {
  let count = 0;
  for (const parameter of signature.getParameters()) {
    if (isRestParameter(parameter) || isOptionalParameter(parameter)) {
      break;
    }
    count += 1;
  }
  return count;
}

function parameterForArgumentIndex(
  signature: ts.Signature,
  argumentIndex: number,
): ts.Symbol | null {
  const parameters = signature.getParameters();
  if (parameters.length === 0) {
    return null;
  }
  return parameters[argumentIndex] ?? parameters[parameters.length - 1] ?? null;
}

function hasRestParameter(signature: ts.Signature): boolean {
  const last = signature.getParameters().at(-1) ?? null;
  return last != null && isRestParameter(last);
}

function isRestParameter(parameter: ts.Symbol): boolean {
  const declaration = parameter.valueDeclaration ?? parameter.declarations?.[0] ?? null;
  return declaration != null
    && ts.isParameter(declaration)
    && declaration.dotDotDotToken != null;
}

function isOptionalParameter(parameter: ts.Symbol): boolean {
  const declaration = parameter.valueDeclaration ?? parameter.declarations?.[0] ?? null;
  return declaration != null
    && ts.isParameter(declaration)
    && (declaration.questionToken != null || declaration.initializer != null);
}
