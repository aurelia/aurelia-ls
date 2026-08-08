import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, test, vi } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { ContainerResolverSlot } from '../src/di/container-slot.js';
import {
  FrameworkIntrinsicDiKey,
  frameworkIntrinsicDiKeyLocal,
} from '../src/di/framework-intrinsic-di-key.js';
import {
  DiProviderActivationView,
  noDiProviderActivationValues,
} from '../src/di/provider-activation.js';
import { Resolver } from '../src/di/resolver.js';
import { runtimeRepeatableHandlerAdmission } from '../src/template/repeatable-handler-admission.js';
import { CheckerRepeatableHandlerCapability } from '../src/type-system/checker-related-types.js';

describe('repeat-handler admission', () => {
  let resolverSlotCount = 0;
  let capabilities = CheckerRepeatableHandlerCapability.None;
  let customContractCount = 0;
  let customSourceType = '';
  let customDeclarationRemapped = false;
  let checkerUsedProgramDeclaration = false;
  let checkerUsedEvaluatorDeclaration = false;

  beforeAll(async () => {
    const fixtureRoot = path.resolve(fileURLToPath(new URL(
      '../fixtures/pressure/template-controller-scope-lab',
      import.meta.url,
    )));
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'test:repeat-handler-admission',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const root = app.emission.appWorld.diWorld.containers.find((container) => container.parent == null);
    if (root == null) {
      throw new Error('Expected the fixture app DI root container.');
    }
    const keyHandle = runtime.workspace.store.handles.identity(
      frameworkIntrinsicDiKeyLocal(FrameworkIntrinsicDiKey.IRepeatableHandler),
    );
    const resolverSlots = root.readResolverSlots(keyHandle);
    resolverSlotCount = resolverSlots.length;
    const activationView = new DiProviderActivationView(
      runtime.workspace.store,
      app.emission.evaluation,
      app.emission.typeSystem,
      app.emission.appWorld.configuration,
      app.emission.appWorld.diWorld,
      noDiProviderActivationValues,
    );
    const customClassValue = resolverSlots
      .filter((slot): slot is ContainerResolverSlot => slot instanceof ContainerResolverSlot)
      .flatMap((slot) => slot.resolver instanceof Resolver
        ? [activationView.classValueForReference(slot.resolver._state)]
        : [])
      .find((value) => value?.declaration.name?.text === 'TaskWindowHandler') ?? null;
    if (customClassValue == null) {
      throw new Error('Expected the custom repeatable handler class value.');
    }
    const programDeclaration = app.emission.typeSystem.readProgramNode(customClassValue.declaration);
    if (programDeclaration == null) {
      throw new Error('Expected the custom repeatable handler Program declaration.');
    }
    customDeclarationRemapped = programDeclaration !== customClassValue.declaration;
    const checkerLocationSpy = vi.spyOn(app.emission.typeSystem.checker, 'getTypeOfSymbolAtLocation');
    const admission = runtimeRepeatableHandlerAdmission(
      runtime.workspace.store,
      root,
      app.emission.typeSystem,
      activationView,
    );
    checkerUsedProgramDeclaration = checkerLocationSpy.mock.calls.some(([, location]) =>
      location === programDeclaration
    );
    checkerUsedEvaluatorDeclaration = checkerLocationSpy.mock.calls.some(([, location]) =>
      location === customClassValue.declaration
    );
    checkerLocationSpy.mockRestore();
    capabilities = admission.capabilities;
    customContractCount = admission.customContracts.length;
    customSourceType = admission.customContracts[0]?.sourceType == null
      ? ''
      : app.emission.typeSystem.checker.typeToString(admission.customContracts[0].sourceType);
  });

  test('joins framework and app handlers through the canonical interface key', () => {
    expect(resolverSlotCount).toBe(2);
  });

  test('retains exact ArrayLike and open custom handler capabilities', () => {
    expect(capabilities & CheckerRepeatableHandlerCapability.ArrayLike)
      .toBe(CheckerRepeatableHandlerCapability.ArrayLike);
    expect(capabilities & CheckerRepeatableHandlerCapability.Custom)
      .toBe(CheckerRepeatableHandlerCapability.Custom);
    expect(customContractCount).toBe(1);
    expect(customSourceType).toBe('TaskWindow');
    expect(customDeclarationRemapped).toBe(true);
    expect(checkerUsedProgramDeclaration).toBe(true);
    expect(checkerUsedEvaluatorDeclaration).toBe(false);
  });
});
