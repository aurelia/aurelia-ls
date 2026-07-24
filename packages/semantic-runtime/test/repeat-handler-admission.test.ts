import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import {
  FrameworkIntrinsicDiKey,
  frameworkIntrinsicDiKeyLocal,
} from '../src/di/framework-intrinsic-di-key.js';
import { DiProviderActivationView } from '../src/di/provider-activation.js';
import { runtimeRepeatableHandlerAdmission } from '../src/template/repeatable-handler-admission.js';
import { CheckerRepeatableHandlerCapability } from '../src/type-system/checker-related-types.js';

describe('repeat-handler admission', () => {
  let resolverSlotCount = 0;
  let capabilities = CheckerRepeatableHandlerCapability.None;
  let customContractCount = 0;
  let customSourceType = '';

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
    resolverSlotCount = root.readResolverSlots(keyHandle).length;
    const admission = runtimeRepeatableHandlerAdmission(
      runtime.workspace.store,
      root,
      app.emission.typeSystem,
      new DiProviderActivationView(
        runtime.workspace.store,
        app.emission.evaluation,
        app.emission.typeSystem,
        app.emission.appWorld.configuration,
        app.emission.appWorld.diWorld,
      ),
    );
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
  });
});
