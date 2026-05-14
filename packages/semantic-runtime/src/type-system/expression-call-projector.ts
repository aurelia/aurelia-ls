import ts from 'typescript';
import type { BindingScope } from '../configuration/scope.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  type CheckerTypeProjectionRequest,
  type CheckerTypeProjector,
} from './checker-projector.js';
import {
  checkerIterableElementType,
} from './checker-related-types.js';
import {
  CheckerExpressionType,
  type CheckerExpressionTypeEvaluation,
  CheckerExpressionTypeEvaluationResultKind,
  CheckerExpressionTypeOpen,
  CheckerExpressionTypeOpenKind,
} from './expression-type-evaluation.js';
import {
  CheckerExpressionTypeSynthesizer,
  commonTypeReference,
} from './expression-type-synthesis.js';
import { TypeSystemProductDetails } from './product-details.js';
import { CheckerTypeShapeAccess } from './checker-type-shape-access.js';
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
    private readonly store: KernelStore,
    private readonly projector: CheckerTypeProjector,
    private readonly typeAccess: CheckerTypeShapeAccess,
    private readonly synthesis: CheckerExpressionTypeSynthesizer,
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
      return this.type(calleeType, 'Calling any remains any.');
    }
    if (calleeType.callReturnType?.productHandle != null) {
      return this.resolveReference(
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
      return this.open(
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
      return this.open(
        CheckerExpressionTypeOpenKind.UnsupportedCallTarget,
        expression,
        `Type '${calleeType.display}' has no call signature to project.`,
        calleeType.toReference(),
      );
    }

    const candidates = this.selectSignatureCandidates(checker, signatures, args, scope, localKey, sourceAddressHandle);
    const returns = candidates.map((candidate) =>
      this.projectType(
        expression,
        checker,
        checker.getReturnTypeOfSignature(candidate.signature),
        `${localKey}:return:${candidate.signatureIndex}`,
        sourceAddressHandle,
      )
    );
    return this.evaluateTypeUnion(
      returns,
      `${localKey}:return`,
      sourceAddressHandle,
      `Projected call return type for '${calleeType.display}'.`,
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
      return this.resolveReference(
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
      return this.open(
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
      return this.open(
        CheckerExpressionTypeOpenKind.UnsupportedConstruct,
        expression,
        `Type '${constructorType.display}' has no construct signature to project.`,
        constructorType.toReference(),
      );
    }

    const candidates = this.selectSignatureCandidates(checker, signatures, args, scope, localKey, sourceAddressHandle);
    const returns = candidates.map((candidate) =>
      this.projectType(
        expression,
        checker,
        checker.getReturnTypeOfSignature(candidate.signature),
        `${localKey}:return:${candidate.signatureIndex}`,
        sourceAddressHandle,
      )
    );
    return this.evaluateTypeUnion(
      returns,
      `${localKey}:construct-return`,
      sourceAddressHandle,
      `Projected construct return type for '${constructorType.display}'.`,
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
    const arityCandidates = signatures
      .map((signature, signatureIndex) => ({ signature, signatureIndex }))
      .filter((candidate) => signatureAcceptsArgumentCount(candidate.signature, args.length));
    const basis = arityCandidates.length > 0
      ? arityCandidates
      : signatures.map((signature, signatureIndex) => ({ signature, signatureIndex }));
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
    const declaration = parameter?.valueDeclaration ?? parameter?.declarations?.[0] ?? null;
    if (parameter == null || declaration == null) {
      return null;
    }
    const rawParameterType = checker.getTypeOfSymbolAtLocation(parameter, declaration);
    const parameterType = isRestParameter(parameter)
      ? checkerIterableElementType(checker, rawParameterType) ?? rawParameterType
      : rawParameterType;
    return this.projector.ensureProjection({
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
    const parameterShape = this.typeShapeForReference(parameterType);
    const argumentCarrier = argumentType.carrier;
    const parameterCarrier = parameterShape?.carrier ?? null;
    if (argumentCarrier == null || parameterCarrier == null || argumentCarrier.checker !== parameterCarrier.checker) {
      return true;
    }
    return argumentCarrier.checker.isTypeAssignableTo(argumentCarrier.type, parameterCarrier.type);
  }

  private typeShapeForReference(reference: CheckerTypeReference | null): CheckerTypeShape | null {
    return reference?.productHandle == null
      ? null
      : this.store.productDetails.read(TypeSystemProductDetails.TypeShape, reference.productHandle);
  }

  private resolveReference(
    expression: ExpressionAstNode,
    reference: CheckerTypeReference,
    localKey: string,
    openKind: CheckerExpressionTypeOpenKind,
    openSummary: string,
  ): CheckerExpressionTypeEvaluation {
    if (reference.productHandle == null) {
      return this.open(openKind, expression, openSummary, reference);
    }
    const typeShape = this.typeAccess.resolveReference(reference);
    if (typeShape == null) {
      return this.open(
        CheckerExpressionTypeOpenKind.MissingTypeDetail,
        expression,
        openSummary,
        reference,
      );
    }
    return this.type(typeShape, `Resolved type reference for ${localKey}.`);
  }

  private evaluateTypeUnion(
    alternatives: readonly CheckerExpressionType[],
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    summary: string,
  ): CheckerExpressionTypeEvaluation {
    const commonReference = commonTypeReference(
      alternatives.map((alternative) => alternative.typeReference),
      alternatives.length,
    );
    if (commonReference != null) {
      return alternatives[0]!;
    }

    const typeShape = this.synthesis.unionType(
      alternatives.map((alternative) => alternative.typeShape),
      localKey,
      sourceAddressHandle,
    );
    return this.type(typeShape, summary);
  }

  private projectType(
    expression: ExpressionAstNode,
    checker: ts.TypeChecker,
    type: ts.Type,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
    summary: string = `Projected ${expression.$kind} through the TypeChecker.`,
  ): CheckerExpressionType {
    const typeShape = this.projector.ensureProjection({
      localKey,
      checker,
      type,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceAddressHandle,
      display: checker.typeToString(type),
    } satisfies CheckerTypeProjectionRequest);
    return this.type(typeShape, summary);
  }

  private type(
    typeShape: CheckerTypeShape,
    summary: string,
  ): CheckerExpressionType {
    return new CheckerExpressionType(typeShape, typeShape.toReference(), summary);
  }

  private open(
    openKind: CheckerExpressionTypeOpenKind,
    expression: ExpressionAstNode,
    summary: string,
    partialTypeReference: CheckerTypeReference | null = null,
  ): CheckerExpressionTypeOpen {
    return new CheckerExpressionTypeOpen(openKind, expression.$kind, summary, partialTypeReference);
  }
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
