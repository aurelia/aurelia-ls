import ts from 'typescript';
import type { Container } from '../di/container.js';
import {
  ContainerLookupKey,
  ContainerLookupKeyKind,
} from '../di/container-key.js';
import {
  FrameworkIntrinsicDiKey,
  frameworkIntrinsicDiKeyLocal,
} from '../di/framework-intrinsic-di-key.js';
import { ContainerResolverSlot } from '../di/container-slot.js';
import type { DiProviderActivationView } from '../di/provider-activation.js';
import { Resolver } from '../di/resolver.js';
import type { KernelStore } from '../kernel/store.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import {
  CheckerRepeatableHandlerAdmission,
  CheckerRepeatableHandlerCapability,
  CheckerRepeatableHandlerContract,
} from '../type-system/checker-related-types.js';
import {
  checkerPropertySymbol,
} from '../type-system/checker-node-helpers.js';
import {
  checkerCallableContextSignatures,
  checkerSignatureParameterType,
} from '../type-system/checker-signature-parameters.js';
import { checkerUnionType } from '../type-system/checker-type-union.js';
import type { TypeSystemProject } from '../type-system/project.js';

/**
 * Runtime RepeatableHandlerResolver extension capabilities visible from one exact requestor container.
 *
 * `all(IRepeatableHandler)` with its default policy uses the nearest container that owns the key, rather than
 * concatenating every ancestor. Container.getAll already models that lookup and shadowing rule. Resolver-slot products
 * remain the source/provenance authority; this projection only spends their semantic effect while typing one source.
 */
export function runtimeRepeatableHandlerAdmission(
  store: KernelStore,
  container: Container,
  typeSystem: TypeSystemProject | null,
  activationView: DiProviderActivationView | null,
): CheckerRepeatableHandlerAdmission {
  let capabilities = CheckerRepeatableHandlerCapability.None;
  const customContracts: CheckerRepeatableHandlerContract[] = [];
  const key = new ContainerLookupKey(
    store.handles.identity(frameworkIntrinsicDiKeyLocal(FrameworkIntrinsicDiKey.IRepeatableHandler)),
    ContainerLookupKeyKind.Interface,
    FrameworkIntrinsicDiKey.IRepeatableHandler,
  );
  for (const lookup of container.getAll(key, false)) {
    for (const slot of lookup.resolverSlots) {
      if (!(slot instanceof ContainerResolverSlot)) {
        continue;
      }
      const frameworkKind = slot.resolver instanceof Resolver
        ? slot.resolver._state?.frameworkKind ?? null
        : null;
      if (frameworkKind === FrameworkRegistrationKind.RuntimeHtmlArrayLikeHandler) {
        capabilities |= CheckerRepeatableHandlerCapability.ArrayLike;
        continue;
      }
      capabilities |= CheckerRepeatableHandlerCapability.Custom;
      const contracts = customHandlerContracts(slot, typeSystem, activationView);
      customContracts.push(...(
        contracts.length > 0
          ? contracts
          : [new CheckerRepeatableHandlerContract(null, null)]
      ));
    }
  }
  return new CheckerRepeatableHandlerAdmission(capabilities, customContracts);
}

function customHandlerContracts(
  slot: ContainerResolverSlot,
  typeSystem: TypeSystemProject | null,
  activationView: DiProviderActivationView | null,
): readonly CheckerRepeatableHandlerContract[] {
  if (
    typeSystem == null
    || activationView == null
    || !(slot.resolver instanceof Resolver)
  ) {
    return [];
  }
  const classValue = activationView.classValueForReference(slot.resolver._state);
  const handlerType = classValue == null
    ? null
    : typeSystem.readRuntimeTargetType(classValue.declaration);
  if (handlerType == null) {
    return [];
  }

  const checker = typeSystem.checker;
  const iterate = checkerPropertySymbol(checker, handlerType, 'iterate');
  const iterateType = iterate == null || classValue == null
    ? null
    : typeSystem.readProgramTypeOfSymbolAtLocation(iterate, classValue.declaration);
  if (iterateType == null) {
    return [];
  }
  return checkerCallableContextSignatures(checker, iterateType)
    .map((signature) => {
      const sourceType = checkerSignatureParameterType(checker, signature, 0)?.type ?? null;
      const callbackType = checkerSignatureParameterType(checker, signature, 1)?.type ?? null;
      return new CheckerRepeatableHandlerContract(
        checkerRepeatableHandlerSourceType(checker, sourceType),
        checkerRepeatableHandlerElementType(checker, callbackType),
      );
    });
}

function checkerRepeatableHandlerSourceType(
  checker: ts.TypeChecker,
  type: ts.Type | null,
): ts.Type | null {
  if (type == null || (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0) {
    return null;
  }
  if ((type.flags & ts.TypeFlags.TypeParameter) === 0) {
    return type;
  }
  const constraint = checker.getBaseConstraintOfType(type);
  return constraint == null || constraint === type
    ? null
    : checkerRepeatableHandlerSourceType(checker, constraint);
}

function checkerRepeatableHandlerElementType(
  checker: ts.TypeChecker,
  callbackType: ts.Type | null,
): ts.Type | null {
  if (callbackType == null) {
    return null;
  }
  return checkerUnionType(
    checker,
    checkerCallableContextSignatures(checker, callbackType)
      .flatMap((signature) => {
        const parameter = checkerSignatureParameterType(checker, signature, 0);
        return parameter == null ? [] : [parameter.type];
      }),
  );
}
