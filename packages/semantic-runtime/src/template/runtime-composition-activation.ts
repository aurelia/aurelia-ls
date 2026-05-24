import ts from 'typescript';

import type {
  AddressHandle,
  IdentityHandle,
} from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
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
  store: KernelStore,
  definition: CustomElementDefinition,
  model: CompositionModelEvaluation,
  localKey: string,
): CompositionActivationModelHandoff {
  return activationModelHandoffForType(
    store,
    definition.target.targetType,
    model,
    localKey,
    definition.sourceAddressHandle,
    definition.target.identityHandle,
    'Resolved component target type was not available for AuCompose activate(model) analysis.',
  );
}

export function activationModelHandoffForType(
  store: KernelStore,
  targetType: CheckerTypeReference | null,
  model: CompositionModelEvaluation,
  localKey: string,
  sourceAddressHandle: AddressHandle | null,
  ownerIdentityHandle: IdentityHandle | null,
  missingTypeReason: string,
): CompositionActivationModelHandoff {
  const targetTypeShape = readCheckerTypeShape(store, targetType);
  const targetCarrier = targetTypeShape?.carrier ?? null;
  if (targetCarrier == null) {
    return openActivationHandoff(
      CompositionActivateMethodKind.Open,
      CompositionActivationModelHandoffKind.Open,
      model.sourceType,
      missingTypeReason,
    );
  }

  const activationTarget = activationTargetForCarrier(targetCarrier);
  const activate = activationTarget.activate;
  if (activate == null) {
    return new CompositionActivationModelHandoff(
      CompositionActivateMethodKind.Absent,
      CompositionActivationModelHandoffKind.ActivateAbsent,
      null,
      model.sourceType,
      null,
      null,
    );
  }

  const location = activate.valueDeclaration
    ?? activate.declarations?.[0]
    ?? activationTarget.declarations[0]
    ?? null;
  if (location == null) {
    return openActivationHandoff(
      CompositionActivateMethodKind.Open,
      CompositionActivationModelHandoffKind.Open,
      model.sourceType,
      'Resolved component activate member had no declaration location for callable type analysis.',
    );
  }

  const activateType = checkerSymbolValueType(targetCarrier.checker, activate, location);
  if (activateType == null) {
    return openActivationHandoff(
      CompositionActivateMethodKind.Open,
      CompositionActivationModelHandoffKind.ActivationParameterOpen,
      model.sourceType,
      'Resolved component activate member had no readable value type.',
    );
  }
  const signature = activateType.getCallSignatures()[0] ?? null;
  if (signature == null) {
    return openActivationHandoff(
      CompositionActivateMethodKind.Open,
      CompositionActivationModelHandoffKind.ActivationParameterOpen,
      model.sourceType,
      'Resolved component activate member was not callable.',
    );
  }

  const parameter = signature.getParameters()[0] ?? null;
  if (parameter == null) {
    return new CompositionActivationModelHandoff(
      CompositionActivateMethodKind.Present,
      CompositionActivationModelHandoffKind.ParameterlessActivate,
      null,
      model.sourceType,
      null,
      null,
    );
  }

  const parameterLocation = parameter.valueDeclaration
    ?? parameter.declarations?.[0]
    ?? location;
  const parameterType = checkerSymbolValueType(targetCarrier.checker, parameter, parameterLocation);
  if (parameterType == null) {
    return openActivationHandoff(
      CompositionActivateMethodKind.Present,
      CompositionActivationModelHandoffKind.ActivationParameterOpen,
      model.sourceType,
      'Resolved component activate parameter had no readable value type.',
    );
  }
  const parameterShape = new CheckerTypeProjector(store).ensureProjection({
    localKey: `${localKey}:activate-parameter`,
    checker: targetCarrier.checker,
    type: parameterType,
    origin: CheckerTypeProjectionOrigin.TypeChecker,
    sourceNode: parameterLocation,
    sourceAddressHandle,
    ownerIdentityHandle,
    display: targetCarrier.checker.typeToString(parameterType),
    memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
  } satisfies CheckerTypeProjectionRequest);
  const parameterReference = parameterShape.toReference();

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

  const assignable = checkerTypeReferenceAssignable(store, model.sourceType, parameterReference);
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
