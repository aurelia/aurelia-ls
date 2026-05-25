import ts from 'typescript';
import type { ExpressionAstNode } from '../expression/ast.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  type CheckerTypeProjectionRequest,
} from './checker-projector.js';
import {
  checkerCallableContextSignatures,
  checkerCallableParameterSurface,
  checkerCallableRequiresTypePredicate,
  checkerSignatureCandidateBasis,
  checkerSignatureParameterType,
  checkerSymbolIsRestParameter,
} from './checker-signature-parameters.js';
import {
  checkerRawTypeAssignable,
} from './checker-type-assignability.js';
import {
  CheckerExpressionType,
  type CheckerExpressionTypeEvaluation,
  CheckerExpressionTypeEvaluationResultKind,
  CheckerExpressionTypeOpenKind,
} from './expression-type-evaluation.js';
import {
  CheckerExpressionTypeEvaluationContext,
} from './expression-type-context.js';
import { commonTypeReference } from './expression-type-synthesis.js';
import { CheckerExpressionTypeSupport } from './expression-type-support.js';
import {
  CheckerTypeProjectionOrigin,
  checkerTypeReferenceWithSource,
  CheckerTypeReference,
  type CheckerTypeShape,
  CheckerTypeShapeKind,
} from './type-shape.js';

export interface CheckerExpressionCallArgument {
  readonly expression: ExpressionAstNode;
  /** Local-key suffix relative to the call or construct expression context. */
  readonly localSuffix: string;
  readonly precomputedEvaluation?: CheckerExpressionTypeEvaluation;
}

export function checkerExpressionCallArguments(
  expressions: readonly ExpressionAstNode[],
  localSuffix: string,
): readonly CheckerExpressionCallArgument[] {
  return expressions.map((expression, index) => ({
    expression,
    localSuffix: `${localSuffix}:${index}`,
  }));
}

export const enum CheckerExpressionCallableParameterKind {
  /** A declared callback parameter receives one runtime argument value. Target rest parameters project to their element type. */
  Positional = 'positional',
  /** A declared callback rest parameter receives an array or tuple of the remaining runtime argument values. */
  Rest = 'rest',
}

export interface CheckerExpressionCallProjectorHost {
  evaluateNode(context: CheckerExpressionTypeEvaluationContext): CheckerExpressionTypeEvaluation;
}

interface CheckerExpressionSignatureCandidate {
  readonly signature: ts.Signature;
  readonly signatureIndex: number;
  readonly inferences: CheckerExpressionSignatureInferences;
  readonly hasRejectedArgument: boolean;
  readonly hasOpenArgument: boolean;
}

type CheckerExpressionSignatureInferences = ReadonlyMap<ts.Symbol, CheckerTypeReference>;

/** Projects TypeChecker call/construct signatures through Aurelia expression argument semantics. */
export class CheckerExpressionCallProjector {
  constructor(
    private readonly support: CheckerExpressionTypeSupport,
    private readonly host: CheckerExpressionCallProjectorHost,
  ) {}

  evaluateCallReturn(
    context: CheckerExpressionTypeEvaluationContext,
    calleeType: CheckerTypeShape,
    args: readonly CheckerExpressionCallArgument[],
    calleeSourceAddressHandle: AddressHandle | null = calleeType.sourceAddressHandle,
    localSuffix: string = 'call-return',
  ): CheckerExpressionTypeEvaluation {
    const expression = context.expression;
    const localKey = `${context.projectionLocalKey()}:${localSuffix}`;
    const returnSourceAddressHandle = calleeSourceAddressHandle ?? context.sourceAddressHandle;
    if (calleeType.shapeKind === CheckerTypeShapeKind.Any) {
      return this.support.type(calleeType, 'Calling any remains any.', returnSourceAddressHandle);
    }
    const type = calleeType.carrier?.type ?? null;
    const checker = calleeType.carrier?.checker ?? null;
    if (type == null || checker == null) {
      if (calleeType.callReturnType?.productHandle != null) {
        return this.support.resolveReference(
          expression,
          checkerTypeReferenceWithSource(calleeType.callReturnType, returnSourceAddressHandle),
          `${localKey}:synthetic-return`,
          CheckerExpressionTypeOpenKind.UnsupportedCallTarget,
          `Synthetic call target '${calleeType.display}' carries a return reference that could not be hydrated.`,
        );
      }
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

    const candidates = this.selectSignatureCandidates(checker, signatures, args, context, localKey);
    const returns = candidates.map((candidate) =>
      this.projectSignatureReturnType(
        expression,
        checker,
        candidate.signature,
        `${localKey}:return:${candidate.signatureIndex}`,
        returnSourceAddressHandle,
        candidate.inferences,
      )
    );
    return this.support.evaluateTypeUnion(
      returns,
      `${localKey}:return`,
      returnSourceAddressHandle,
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
      checkerCallableContextSignatures(checker, type),
      signatureArgumentIndex,
      runtimeArgumentCount,
      localKey,
      sourceAddressHandle,
    );
  }

  contextualCallArgumentParameterTypes(
    calleeType: CheckerTypeShape,
    signatureArgumentIndex: number,
    args: readonly CheckerExpressionCallArgument[],
    context: CheckerExpressionTypeEvaluationContext,
    parameterKinds: readonly CheckerExpressionCallableParameterKind[],
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): readonly CheckerTypeReference[] | null {
    const type = calleeType.carrier?.type ?? null;
    const checker = calleeType.carrier?.checker ?? null;
    if (type == null || checker == null) {
      return null;
    }
    return this.contextualSignatureCallbackParameterTypes(
      checker,
      checkerCallableContextSignatures(checker, type),
      signatureArgumentIndex,
      args,
      context,
      parameterKinds,
      localKey,
      sourceAddressHandle,
    );
  }

  evaluateConstructReturn(
    context: CheckerExpressionTypeEvaluationContext,
    constructorType: CheckerTypeShape,
    args: readonly CheckerExpressionCallArgument[],
    constructorSourceAddressHandle: AddressHandle | null = constructorType.sourceAddressHandle,
    localSuffix: string = 'construct-return',
  ): CheckerExpressionTypeEvaluation {
    const expression = context.expression;
    const localKey = `${context.projectionLocalKey()}:${localSuffix}`;
    const instanceSourceAddressHandle = constructorSourceAddressHandle ?? context.sourceAddressHandle;
    const type = constructorType.carrier?.type ?? null;
    const checker = constructorType.carrier?.checker ?? null;
    if (type == null || checker == null) {
      if (constructorType.constructReturnType?.productHandle != null) {
        return this.support.resolveReference(
          expression,
          checkerTypeReferenceWithSource(constructorType.constructReturnType, instanceSourceAddressHandle),
          `${localKey}:synthetic-construct-return`,
          CheckerExpressionTypeOpenKind.UnsupportedConstruct,
          `Synthetic construct target '${constructorType.display}' carries an instance reference that could not be hydrated.`,
        );
      }
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

    const candidates = this.selectSignatureCandidates(checker, signatures, args, context, localKey);
    const returns = candidates.map((candidate) =>
      this.projectSignatureReturnType(
        expression,
        checker,
        candidate.signature,
        `${localKey}:return:${candidate.signatureIndex}`,
        instanceSourceAddressHandle,
        candidate.inferences,
      )
    );
    return this.support.evaluateTypeUnion(
      returns,
      `${localKey}:construct-return`,
      instanceSourceAddressHandle,
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

  contextualConstructArgumentParameterTypes(
    constructorType: CheckerTypeShape,
    argumentIndex: number,
    args: readonly CheckerExpressionCallArgument[],
    context: CheckerExpressionTypeEvaluationContext,
    parameterKinds: readonly CheckerExpressionCallableParameterKind[],
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
  ): readonly CheckerTypeReference[] | null {
    const type = constructorType.carrier?.type ?? null;
    const checker = constructorType.carrier?.checker ?? null;
    if (type == null || checker == null) {
      return null;
    }
    return this.contextualSignatureCallbackParameterTypes(
      checker,
      type.getConstructSignatures(),
      argumentIndex,
      args,
      context,
      parameterKinds,
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
    const signatures = checkerCallableContextSignatures(checker, type);
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
    context: CheckerExpressionTypeEvaluationContext,
    localKey: string,
  ): readonly CheckerExpressionSignatureCandidate[] {
    const basis = checkerSignatureCandidateBasis(signatures, args.length);
    if (basis.length === 1) {
      const [candidate] = basis;
      return [{
        signature: candidate!.signature,
        signatureIndex: candidate!.signatureIndex,
        inferences: this.signatureCandidateInferences(
          checker,
          candidate!.signature,
          candidate!.signatureIndex,
          args,
          context,
          localKey,
        ),
        hasRejectedArgument: false,
        hasOpenArgument: false,
      }];
    }

    const candidates = basis.map((candidate) =>
      this.signatureCandidate(checker, candidate.signature, candidate.signatureIndex, args, context, localKey)
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
    inferences: CheckerExpressionSignatureInferences = new Map<ts.Symbol, CheckerTypeReference>(),
  ): CheckerTypeReference | null {
    const basis = checkerSignatureCandidateBasis(signatures, runtimeArgumentCount);
    const parameterTypes = basis
      .map((candidate) => this.parameterTypeReference(
        checker,
        candidate.signature,
        candidate.signatureIndex,
        argumentIndex,
        `${localKey}:signature:${candidate.signatureIndex}:arg:${argumentIndex}:contextual`,
        sourceAddressHandle,
        inferences,
      ))
      .filter((reference): reference is CheckerTypeReference => reference != null);
    return commonTypeReference(parameterTypes, basis.length)
      ?? this.commonCallableParameterContext(parameterTypes, basis.length);
  }

  private contextualRestBindingParameterType(
    checker: ts.TypeChecker,
    signatures: readonly ts.Signature[],
    parameterIndex: number,
    runtimeParameterCount: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    inferences: CheckerExpressionSignatureInferences = new Map<ts.Symbol, CheckerTypeReference>(),
  ): CheckerTypeReference | null {
    const basis = checkerSignatureCandidateBasis(signatures, runtimeParameterCount);
    const parameterTypes = basis
      .map((candidate) => this.restBindingParameterTypeReference(
        checker,
        candidate.signature,
        candidate.signatureIndex,
        parameterIndex,
        `${localKey}:signature:${candidate.signatureIndex}:rest:${parameterIndex}:contextual`,
        sourceAddressHandle,
        inferences,
      ))
      .filter((reference): reference is CheckerTypeReference => reference != null);
    return commonTypeReference(parameterTypes, basis.length);
  }

  private contextualSignatureCallbackParameterTypes(
    checker: ts.TypeChecker,
    signatures: readonly ts.Signature[],
    signatureArgumentIndex: number,
    args: readonly CheckerExpressionCallArgument[],
    context: CheckerExpressionTypeEvaluationContext,
    parameterKinds: readonly CheckerExpressionCallableParameterKind[],
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): readonly CheckerTypeReference[] | null {
    const candidates = this.selectSignatureCandidates(checker, signatures, args, context, localKey);
    if (candidates.length === 0 || parameterKinds.length === 0) {
      return null;
    }

    const references = parameterKinds.map((parameterKind, parameterIndex) => {
      const parameterTypes = candidates
        .map((candidate) => {
          const argumentType = checkerSignatureParameterType(
            checker,
            candidate.signature,
            signatureArgumentIndex,
          );
          if (argumentType == null) {
            return null;
          }
          const callbackSignatures = checkerCallableContextSignatures(checker, argumentType.type);
          return parameterKind === CheckerExpressionCallableParameterKind.Rest
            ? this.contextualRestBindingParameterType(
              checker,
              callbackSignatures,
              parameterIndex,
              parameterKinds.length,
              `${localKey}:signature:${candidate.signatureIndex}:callback-rest:${parameterIndex}`,
              sourceAddressHandle,
              candidate.inferences,
            )
            : this.contextualSignatureParameterType(
              checker,
              callbackSignatures,
              parameterIndex,
              parameterKinds.length,
              `${localKey}:signature:${candidate.signatureIndex}:callback-param:${parameterIndex}`,
              sourceAddressHandle,
              candidate.inferences,
            );
        })
        .filter((reference): reference is CheckerTypeReference => reference != null);
      return this.commonOrUnionTypeReference(
        parameterTypes,
        candidates.length,
        `${localKey}:callback-param:${parameterIndex}`,
        sourceAddressHandle,
      );
    });

    return references.some((reference) => reference == null)
      ? null
      : references as readonly CheckerTypeReference[];
  }

  private signatureCandidate(
    checker: ts.TypeChecker,
    signature: ts.Signature,
    signatureIndex: number,
    args: readonly CheckerExpressionCallArgument[],
    context: CheckerExpressionTypeEvaluationContext,
    localKey: string,
  ): CheckerExpressionSignatureCandidate {
    const inferences = this.signatureCandidateInferences(checker, signature, signatureIndex, args, context, localKey);
    let hasRejectedArgument = false;
    let hasOpenArgument = false;
    args.forEach((arg, argIndex) => {
      const checkerParameterType = checkerSignatureParameterType(checker, signature, argIndex);
      const parameterType = this.parameterTypeReference(
        checker,
        signature,
        signatureIndex,
        argIndex,
        `${localKey}:signature:${signatureIndex}:arg:${argIndex}`,
        context.sourceAddressHandle,
        inferences,
      );
      if (
        checkerParameterType != null
        && arg.expression.$kind === 'ArrowFunction'
        && checkerCallableRequiresTypePredicate(checker, checkerParameterType.type)
      ) {
        hasRejectedArgument = true;
        return;
      }
      const evaluation = arg.precomputedEvaluation
        ?? this.host.evaluateNode(context.child(arg.expression, arg.localSuffix, parameterType));
      if (evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
        hasOpenArgument = true;
        return;
      }
      if (!this.argumentAssignableToParameter(evaluation.typeShape, parameterType)) {
        hasRejectedArgument = true;
      }
    });
    return { signature, signatureIndex, inferences, hasRejectedArgument, hasOpenArgument };
  }

  private signatureCandidateInferences(
    checker: ts.TypeChecker,
    signature: ts.Signature,
    signatureIndex: number,
    args: readonly CheckerExpressionCallArgument[],
    context: CheckerExpressionTypeEvaluationContext,
    localKey: string,
  ): CheckerExpressionSignatureInferences {
    const inferences = new Map<ts.Symbol, CheckerTypeReference>();
    const rejected = new Set<ts.Symbol>();
    args.forEach((arg, argIndex) => {
      if (arg.expression.$kind === 'ArrowFunction') {
        return;
      }
      const checkerParameterType = checkerSignatureParameterType(checker, signature, argIndex);
      const typeParameter = checkerParameterType == null
        ? null
        : directTypeParameterSymbol(checkerParameterType.type);
      if (typeParameter == null || rejected.has(typeParameter)) {
        return;
      }
      const parameterType = this.parameterTypeReference(
        checker,
        signature,
        signatureIndex,
        argIndex,
        `${localKey}:signature:${signatureIndex}:arg:${argIndex}:inference-target`,
        context.sourceAddressHandle,
      );
      const evaluation = arg.precomputedEvaluation
        ?? this.host.evaluateNode(context.child(arg.expression, `${arg.localSuffix}:inference`, parameterType));
      if (evaluation.kind !== CheckerExpressionTypeEvaluationResultKind.Type) {
        return;
      }
      const existing = inferences.get(typeParameter) ?? null;
      const inferred = evaluation.typeShape.toReference();
      if (existing == null) {
        inferences.set(typeParameter, inferred);
        return;
      }
      if (existing.display === inferred.display && existing.shapeKind === inferred.shapeKind) {
        return;
      }
      inferences.delete(typeParameter);
      rejected.add(typeParameter);
    });
    return inferences;
  }

  private parameterTypeReference(
    checker: ts.TypeChecker,
    signature: ts.Signature,
    signatureIndex: number,
    argIndex: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    inferences: CheckerExpressionSignatureInferences = new Map<ts.Symbol, CheckerTypeReference>(),
  ): CheckerTypeReference | null {
    const parameter = checkerSignatureParameterType(checker, signature, argIndex);
    return parameter == null
      ? null
      : this.typeReferenceWithInferences(checker, parameter.symbol, parameter.type, localKey, sourceAddressHandle, inferences);
  }

  private restBindingParameterTypeReference(
    checker: ts.TypeChecker,
    signature: ts.Signature,
    signatureIndex: number,
    parameterIndex: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    inferences: CheckerExpressionSignatureInferences = new Map<ts.Symbol, CheckerTypeReference>(),
  ): CheckerTypeReference | null {
    const parameters = signature.getParameters();
    const restIndex = parameters.findIndex((parameter) => checkerSymbolIsRestParameter(parameter));
    if (restIndex === parameterIndex) {
      return this.rawParameterTypeReference(
        checker,
        parameters[restIndex]!,
        `${localKey}:signature:${signatureIndex}:parameter:${parameterIndex}:rest-array`,
        sourceAddressHandle,
        inferences,
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
          inferences,
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
        inferences,
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
    inferences: CheckerExpressionSignatureInferences = new Map<ts.Symbol, CheckerTypeReference>(),
  ): CheckerTypeReference | null {
    const declaration = parameter.valueDeclaration ?? parameter.declarations?.[0] ?? null;
    if (declaration == null) {
      return null;
    }
    const parameterType = checker.getTypeOfSymbolAtLocation(parameter, declaration);
    return this.typeReferenceWithInferences(checker, parameter, parameterType, localKey, sourceAddressHandle, inferences);
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

  private typeReferenceWithInferences(
    checker: ts.TypeChecker,
    parameter: ts.Symbol,
    parameterType: ts.Type,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    inferences: CheckerExpressionSignatureInferences,
  ): CheckerTypeReference {
    const typeParameter = directTypeParameterSymbol(parameterType);
    const inferred = typeParameter == null ? null : inferences.get(typeParameter) ?? null;
    return inferred == null
      ? this.projectParameterTypeReference(checker, parameter, parameterType, localKey, sourceAddressHandle)
      : checkerTypeReferenceWithSource(inferred, sourceAddressHandle);
  }

  private projectSignatureReturnType(
    expression: ExpressionAstNode,
    checker: ts.TypeChecker,
    signature: ts.Signature,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    inferences: CheckerExpressionSignatureInferences,
  ): CheckerExpressionType {
    const returnType = checker.getReturnTypeOfSignature(signature);
    const typeParameter = directTypeParameterSymbol(returnType);
    const inferred = typeParameter == null ? null : inferences.get(typeParameter) ?? null;
    const inferredShape = inferred == null ? null : this.support.typeShapeForReference(inferred);
    return inferredShape == null
      ? this.support.projectType(
        expression,
        checker,
        returnType,
        localKey,
        sourceAddressHandle,
      )
      : this.support.type(inferredShape, `Projected inferred signature return type for ${localKey}.`, sourceAddressHandle);
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
    return checkerRawTypeAssignable(argumentCarrier.checker, argumentCarrier.type, parameterCarrier.type);
  }

  private commonCallableParameterContext(
    parameterTypes: readonly CheckerTypeReference[],
    expectedCount: number,
  ): CheckerTypeReference | null {
    if (parameterTypes.length !== expectedCount || parameterTypes.length === 0) {
      return null;
    }
    const shapes = parameterTypes
      .map((reference) => this.support.typeShapeForReference(reference))
      .filter((shape): shape is CheckerTypeShape => shape != null);
    if (shapes.length !== parameterTypes.length) {
      return null;
    }

    const surfaces = shapes.map((shape) => callableParameterSurface(shape));
    const firstSurface = surfaces[0] ?? null;
    if (firstSurface == null || !surfaces.every((surface) => surface === firstSurface)) {
      return null;
    }

    const selected = shapes.find((shape) => !checkerCallableRequiresTypePredicate(
      shape.carrier!.checker,
      shape.carrier!.type,
    )) ?? shapes[0] ?? null;
    return selected?.toReference() ?? null;
  }

  private commonOrUnionTypeReference(
    references: readonly CheckerTypeReference[],
    expectedCount: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const common = commonTypeReference(references, expectedCount);
    if (common != null) {
      return common;
    }
    if (references.length !== expectedCount || references.length === 0) {
      return null;
    }
    const shapes = references
      .map((reference) => this.support.typeShapeForReference(reference))
      .filter((shape): shape is CheckerTypeShape => shape != null);
    return shapes.length === references.length
      ? this.support.synthesis.unionType(shapes, localKey, sourceAddressHandle).toReference()
      : null;
  }

}

interface CheckerSignatureParameterType {
  readonly symbol: ts.Symbol;
  readonly type: ts.Type;
}

function callableParameterSurface(
  shape: CheckerTypeShape,
): string | null {
  const carrier = shape.carrier;
  if (carrier == null) {
    return null;
  }
  return checkerCallableParameterSurface(carrier.checker, carrier.type);
}

function directTypeParameterSymbol(type: ts.Type): ts.Symbol | null {
  return (type.flags & ts.TypeFlags.TypeParameter) !== 0
    ? type.symbol ?? null
    : null;
}
