import ts from 'typescript';

import type {
  AddressHandle,
  IdentityHandle,
} from '../kernel/handles.js';
import type { EvaluationValue } from '../evaluation/values.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import {
  CheckerTypeMemberProjectionPolicy,
  CheckerTypeProjector,
  type CheckerTypeProjectionRequest,
} from '../type-system/checker-projector.js';
import {
  checkerTypeReferenceAssignable,
} from '../type-system/checker-type-assignability.js';
import {
  checkerBackedUnionTypeForReferences,
} from '../type-system/checker-type-union.js';
import {
  readCheckerTypeShape,
} from '../type-system/checker-type-shape-access.js';
import {
  checkerPropertySymbol,
  checkerSymbolValueType,
} from '../type-system/checker-node-helpers.js';
import {
  type CheckerTypeReference,
  type CheckerTypeShape,
  CheckerTypeProjectionOrigin,
} from '../type-system/type-shape.js';
import {
  commonTypeReference,
} from '../type-system/expression-type-synthesis.js';
import {
  checkerSignatureCandidateBasis,
  checkerSignatureParameterType,
  checkerValueCallability,
  CheckerValueCallabilityKind,
} from '../type-system/checker-signature-parameters.js';
import type { RuntimeBinding } from './runtime-binding.js';
import {
  CompositionActivateMethodKind,
  CompositionActivationModelHandoff,
  CompositionActivationModelHandoffKind,
} from './runtime-composition.js';

export interface CompositionModelEvaluation {
  readonly binding: RuntimeBinding | null;
  readonly value: EvaluationValue | null;
  readonly sourceType: CheckerTypeReference | null;
}

export function activationModelHandoff(
  projector: CheckerTypeProjector,
  definition: CustomElementDefinition,
  model: CompositionModelEvaluation,
  localKey: string,
): CompositionActivationModelHandoff {
  return activationModelHandoffForType(
    projector,
    definition.target.targetType,
    model,
    localKey,
    definition.sourceAddressHandle,
    definition.target.identityHandle,
    'Resolved component target type was not available for AuCompose activate(model) analysis.',
  );
}

export function activationModelHandoffForType(
  projector: CheckerTypeProjector,
  targetType: CheckerTypeReference | null,
  model: CompositionModelEvaluation,
  localKey: string,
  sourceAddressHandle: AddressHandle | null,
  ownerIdentityHandle: IdentityHandle | null,
  missingTypeReason: string,
): CompositionActivationModelHandoff {
  const targetTypeShape = readCheckerTypeShape(projector.publication, targetType);
  const targetCarrier = targetTypeShape?.carrier ?? null;
  if (targetCarrier == null) {
    return openActivationHandoff(
      CompositionActivateMethodKind.Open,
      CompositionActivationModelHandoffKind.Open,
      model.sourceType,
      missingTypeReason,
    );
  }

  const activate = activateMethodProjection(targetCarrier);
  if (activate.kind === 'absent') {
    return new CompositionActivationModelHandoff(
      CompositionActivateMethodKind.Absent,
      CompositionActivationModelHandoffKind.ActivateAbsent,
      null,
      model.sourceType,
      null,
      null,
    );
  }

  if (activate.kind === 'open') {
    return openActivationHandoff(
      CompositionActivateMethodKind.Open,
      activate.handoffKind,
      model.sourceType,
      activate.openReason,
    );
  }
  if (activate.kind === 'non-callable') {
    return new CompositionActivationModelHandoff(
      CompositionActivateMethodKind.NonCallable,
      CompositionActivationModelHandoffKind.ActivateNonCallable,
      null,
      model.sourceType,
      null,
      null,
    );
  }

  const parameterProjection = activationParameterTypeReference(
    projector,
    activate.checker,
    activate.signatures,
    localKey,
    sourceAddressHandle,
    ownerIdentityHandle,
    activate.location,
  );
  return activationModelHandoffForParameterProjection(projector, model, parameterProjection);
}

function activationModelHandoffForParameterProjection(
  projector: CheckerTypeProjector,
  model: CompositionModelEvaluation,
  parameterProjection: ActivationParameterProjection,
): CompositionActivationModelHandoff {
  if (parameterProjection.kind === 'open') {
    return openActivationHandoff(
      CompositionActivateMethodKind.Present,
      CompositionActivationModelHandoffKind.ActivationParameterOpen,
      model.sourceType,
      parameterProjection.openReason,
    );
  }
  if (parameterProjection.kind === 'parameterless') {
    return new CompositionActivationModelHandoff(
      CompositionActivateMethodKind.Present,
      CompositionActivationModelHandoffKind.ParameterlessActivate,
      null,
      model.sourceType,
      null,
      null,
    );
  }
  const parameterReference = parameterProjection.parameterType;

  if (model.binding == null && model.value == null) {
    return new CompositionActivationModelHandoff(
      CompositionActivateMethodKind.Present,
      CompositionActivationModelHandoffKind.ModelAbsent,
      parameterReference,
      null,
      null,
      null,
    );
  }

  if (model.sourceType == null) {
    return openActivationHandoff(
      CompositionActivateMethodKind.Present,
      CompositionActivationModelHandoffKind.ModelTypeOpen,
      null,
      'AuCompose model binding source type was not available for activate(model) assignability.',
      parameterReference,
    );
  }

  const assignable = checkerTypeReferenceAssignable(projector.publication, model.sourceType, parameterReference);
  return new CompositionActivationModelHandoff(
    CompositionActivateMethodKind.Present,
    assignable === true
      ? CompositionActivationModelHandoffKind.ModelAssignable
      : assignable === false
        ? CompositionActivationModelHandoffKind.ModelUnassignable
        : CompositionActivationModelHandoffKind.Open,
    parameterReference,
    model.sourceType,
    assignable,
    assignable == null
      ? 'AuCompose model and activate parameter types did not share enough checker identity for assignability.'
      : null,
  );
}

type ActivationParameterProjection =
  | {
    readonly kind: 'parameterless';
  }
  | {
    readonly kind: 'parameter';
    readonly parameterType: CheckerTypeReference;
  }
  | {
    readonly kind: 'open';
    readonly openReason: string;
  };

type ActivateMethodProjection =
  | {
    readonly kind: 'absent';
  }
  | {
    readonly kind: 'open';
    readonly handoffKind: CompositionActivationModelHandoffKind;
    readonly openReason: string;
  }
  | {
    readonly kind: 'non-callable';
  }
  | {
    readonly kind: 'present';
    readonly checker: ts.TypeChecker;
    readonly signatures: readonly ts.Signature[];
    readonly location: ts.Node;
  };

interface ActivationParameterProjectionFrame {
  readonly candidates: ReturnType<typeof checkerSignatureCandidateBasis>;
  readonly parameterReferences: readonly CheckerTypeReference[];
}

function activateMethodProjection(
  targetCarrier: NonNullable<CheckerTypeShape['carrier']>,
): ActivateMethodProjection {
  const activationTarget = activationTargetForCarrier(targetCarrier);
  const activate = activationTarget.activate;
  if (activate == null) {
    return { kind: 'absent' };
  }

  const location = activate.valueDeclaration
    ?? activate.declarations?.[0]
    ?? activationTarget.declarations[0]
    ?? null;
  if (location == null) {
    return {
      kind: 'open',
      handoffKind: CompositionActivationModelHandoffKind.Open,
      openReason: 'Resolved component activate member had no declaration location for callable type analysis.',
    };
  }

  const activateType = checkerSymbolValueType(targetCarrier.checker, activate, location);
  if (activateType == null) {
    return {
      kind: 'open',
      handoffKind: CompositionActivationModelHandoffKind.Open,
      openReason: 'Resolved component activate member had no readable value type.',
    };
  }

  const callability = checkerValueCallability(targetCarrier.checker, activateType);
  if (callability.kind === CheckerValueCallabilityKind.NonCallable) {
    return {
      kind: 'non-callable',
    };
  }
  if (callability.kind === CheckerValueCallabilityKind.Open) {
    return {
      kind: 'open',
      handoffKind: CompositionActivationModelHandoffKind.Open,
      openReason: 'Resolved component activate member callability remained open.',
    };
  }

  return {
    kind: 'present',
    checker: targetCarrier.checker,
    signatures: callability.signatures,
    location,
  };
}

function activationParameterTypeReference(
  projector: CheckerTypeProjector,
  checker: ts.TypeChecker,
  signatures: readonly ts.Signature[],
  localKey: string,
  sourceAddressHandle: AddressHandle | null,
  ownerIdentityHandle: IdentityHandle | null,
  fallbackLocation: ts.Node,
): ActivationParameterProjection {
  const frame = activationParameterProjectionFrame(
    projector,
    checker,
    signatures,
    localKey,
    sourceAddressHandle,
    ownerIdentityHandle,
    fallbackLocation,
  );
  const issue = activationParameterProjectionIssue(frame);
  if (issue != null) {
    return issue;
  }

  const parameterReferences = frame.parameterReferences;
  const common = commonTypeReference(parameterReferences, parameterReferences.length);
  if (common != null) {
    return {
      kind: 'parameter',
      parameterType: common,
    };
  }

  const checkerUnion = checkerBackedUnionTypeForReferences(projector.publication, parameterReferences);
  if (checkerUnion == null) {
    return {
      kind: 'open',
      openReason: 'Resolved component activate overload parameters did not share enough checker identity for assignability.',
    };
  }

  const unionReference = projector.ensureProjection({
    localKey: `${localKey}:activate-parameter-union`,
    checker: checkerUnion.checker,
    type: checkerUnion.type,
    origin: CheckerTypeProjectionOrigin.TypeChecker,
    sourceNode: fallbackLocation,
    sourceAddressHandle,
    ownerIdentityHandle,
    display: checkerUnion.checker.typeToString(checkerUnion.type),
    memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
  } satisfies CheckerTypeProjectionRequest).toReference();
  return {
    kind: 'parameter',
    parameterType: unionReference,
  };
}

function activationParameterProjectionFrame(
  projector: CheckerTypeProjector,
  checker: ts.TypeChecker,
  signatures: readonly ts.Signature[],
  localKey: string,
  sourceAddressHandle: AddressHandle | null,
  ownerIdentityHandle: IdentityHandle | null,
  fallbackLocation: ts.Node,
): ActivationParameterProjectionFrame {
  const candidates = checkerSignatureCandidateBasis(signatures, 1);
  const parameterReferences = candidates
    .map((candidate) => activateParameterReference(
      projector,
      checker,
      candidate.signature,
      candidate.signatureIndex,
      localKey,
      sourceAddressHandle,
      ownerIdentityHandle,
      fallbackLocation,
    ))
    .filter((reference): reference is CheckerTypeReference => reference != null);
  return {
    candidates,
    parameterReferences,
  };
}

function activationParameterProjectionIssue(
  frame: ActivationParameterProjectionFrame,
): ActivationParameterProjection | null {
  if (frame.parameterReferences.length === 0) {
    return frame.candidates.every((candidate) => candidate.signature.getParameters().length === 0)
      ? { kind: 'parameterless' }
      : {
        kind: 'open',
        openReason: 'Resolved component activate parameter had no readable value type.',
      };
  }
  if (frame.parameterReferences.length !== frame.candidates.length) {
    return {
      kind: 'open',
      openReason: 'Resolved component activate overloads were only partially readable.',
    };
  }
  return null;
}

function activateParameterReference(
  projector: CheckerTypeProjector,
  checker: ts.TypeChecker,
  signature: ts.Signature,
  signatureIndex: number,
  localKey: string,
  sourceAddressHandle: AddressHandle | null,
  ownerIdentityHandle: IdentityHandle | null,
  fallbackLocation: ts.Node,
): CheckerTypeReference | null {
  const parameter = checkerSignatureParameterType(checker, signature, 0);
  if (parameter == null) {
    return null;
  }
  const parameterLocation = parameter.symbol.valueDeclaration
    ?? parameter.symbol.declarations?.[0]
    ?? fallbackLocation;
  const parameterShape = projector.ensureProjection({
    localKey: `${localKey}:activate-parameter:${signatureIndex}`,
    checker,
    type: parameter.type,
    origin: CheckerTypeProjectionOrigin.TypeChecker,
    sourceNode: parameterLocation,
    sourceAddressHandle,
    ownerIdentityHandle,
    display: checker.typeToString(parameter.type),
    memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
  } satisfies CheckerTypeProjectionRequest);
  return parameterShape.toReference();
}

function activationTargetForCarrier(
  carrier: NonNullable<CheckerTypeShape['carrier']>,
): {
  readonly activate: ts.Symbol | null;
  readonly declarations: readonly ts.Declaration[];
} {
  const direct = activateSymbolForType(carrier.checker, carrier.type);
  if (direct != null) {
    return {
      activate: direct,
      declarations: carrier.declarations,
    };
  }
  for (const signature of carrier.type.getConstructSignatures()) {
    const instanceType = signature.getReturnType();
    const instanceActivate = activateSymbolForType(carrier.checker, instanceType);
    if (instanceActivate != null) {
      return {
        activate: instanceActivate,
        declarations: instanceType.symbol?.declarations ?? carrier.declarations,
      };
    }
  }
  return {
    activate: null,
    declarations: carrier.declarations,
  };
}

function activateSymbolForType(checker: ts.TypeChecker, type: ts.Type): ts.Symbol | null {
  return checkerPropertySymbol(checker, type, 'activate');
}

function openActivationHandoff(
  methodKind: CompositionActivateMethodKind,
  handoffKind: CompositionActivationModelHandoffKind,
  modelType: CheckerTypeReference | null,
  openReason: string,
  parameterType: CheckerTypeReference | null = null,
): CompositionActivationModelHandoff {
  return new CompositionActivationModelHandoff(
    methodKind,
    handoffKind,
    parameterType,
    modelType,
    null,
    openReason,
  );
}
