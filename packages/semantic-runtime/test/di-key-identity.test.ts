import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { AppTaskCallbackKind } from '../src/configuration/app-task.js';
import {
  FrameworkIntrinsicDiKey,
  frameworkIntrinsicDiKeyLocal,
} from '../src/di/framework-intrinsic-di-key.js';
import type { IdentityHandle } from '../src/kernel/handles.js';
import {
  DiKeyIdentityKind,
  DiResolverKeyKind,
  ResolverDiKeyIdentity,
} from '../src/kernel/identity.js';
import { RegistrationStrategy } from '../src/registration/registration-admission.js';

describe('DI key identity', () => {
  let keyForValue: (localName: string) => IdentityHandle;
  let addressForValue: (localName: string) => string;
  let kindForValue: (localName: string) => DiKeyIdentityKind | null;
  let aliasTargetIdentity: IdentityHandle | null;
  let aliasTargetKind: DiKeyIdentityKind | null;
  let wrapperTargetIdentity: IdentityHandle | null;
  let wrapperTarget: ResolverDiKeyIdentity | null;
  let appTaskKeyIdentity: IdentityHandle | null;
  let canonicalCompilerHooksKeyIdentity: IdentityHandle;

  beforeAll(async () => {
    const fixtureRoot = path.resolve(fileURLToPath(new URL(
      '../fixtures/pressure/di-key-identity',
      import.meta.url,
    )));
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'test:di-key-identity',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    canonicalCompilerHooksKeyIdentity = runtime.workspace.store.handles.identity(
      frameworkIntrinsicDiKeyLocal(FrameworkIntrinsicDiKey.ITemplateCompilerHooks),
    );
    const configuration = app.emission.configuration.readConfiguration();
    const registrations = configuration.registrationAdmissions;
    const instances = registrations.filter((admission) => admission.strategy === RegistrationStrategy.Instance);
    const registrationForValue = (localName: string) => {
      const registration = instances.find((admission) => admission.registeredValue?.localName === localName);
      if (registration == null) {
        throw new Error(`Expected an admitted registration for ${localName}.`);
      }
      return registration;
    };
    keyForValue = (localName: string) => {
      const key = registrationForValue(localName).targetKey?.identityHandle ?? null;
      if (key == null) {
        throw new Error(`Expected an admitted key for ${localName}.`);
      }
      return key;
    };
    addressForValue = (localName: string) => {
      const address = registrationForValue(localName).targetKey?.addressHandle ?? null;
      if (address == null) {
        throw new Error(`Expected an authored key address for ${localName}.`);
      }
      return address;
    };
    kindForValue = (localName: string) => registrationForValue(localName).targetKey?.keyKind ?? null;
    const publicInterfaceAlias = registrations.find((admission) =>
      admission.strategy === RegistrationStrategy.AliasTo
      && admission.targetKey?.localName === 'public-interface'
    ) ?? null;
    aliasTargetIdentity = publicInterfaceAlias?.registeredValue?.identityHandle ?? null;
    aliasTargetKind = publicInterfaceAlias?.registeredValue?.keyKind ?? null;
    wrapperTargetIdentity = registrations.find((admission) =>
      admission.strategy === RegistrationStrategy.AliasTo
      && admission.targetKey?.localName === 'fresh-class'
    )?.registeredValue?.identityHandle ?? null;
    const wrapperIdentity = wrapperTargetIdentity == null
      ? null
      : runtime.workspace.store.read(wrapperTargetIdentity);
    wrapperTarget = wrapperIdentity instanceof ResolverDiKeyIdentity ? wrapperIdentity : null;
    appTaskKeyIdentity = configuration.appTasks.find((task) => task.callbackKind === AppTaskCallbackKind.ResolvedKey)
      ?.key?.identityHandle ?? null;
  });

  test('joins equal string values across registration occurrences', () => {
    expect(keyForValue('stringFirstValue')).toBe(keyForValue('stringSecondValue'));
    expect(addressForValue('stringFirstValue')).not.toBe(addressForValue('stringSecondValue'));
    expect(kindForValue('stringFirstValue')).toBe(DiKeyIdentityKind.String);
  });

  test('joins direct and reexported constructable declarations', () => {
    expect(keyForValue('directClassValue')).toBe(keyForValue('reexportedClassValue'));
    expect(kindForValue('directClassValue')).toBe(DiKeyIdentityKind.Constructable);
  });

  test('joins direct and reexported interface values', () => {
    expect(keyForValue('directInterfaceValue')).toBe(keyForValue('reexportedInterfaceValue'));
    expect(kindForValue('directInterfaceValue')).toBe(DiKeyIdentityKind.Interface);
  });

  test('keeps distinct interface objects separate despite equal friendly names', () => {
    expect(keyForValue('directInterfaceValue')).not.toBe(keyForValue('secondInterfaceValue'));
  });

  test('recognizes published Aurelia InterfaceSymbol declarations without source initializers', () => {
    expect(kindForValue('frameworkInterfaceValue')).toBe(DiKeyIdentityKind.Interface);
  });

  test('canonicalizes the direct and umbrella compiler-hooks exports without trusting friendly-name lookalikes', () => {
    const direct = keyForValue('directCompilerHooksInterfaceValue');
    const reexported = keyForValue('reexportedCompilerHooksInterfaceValue');
    const lookalike = keyForValue('localCompilerHooksLookalikeValue');

    expect(direct).toBe(canonicalCompilerHooksKeyIdentity);
    expect(reexported).toBe(direct);
    expect(lookalike).not.toBe(direct);
    expect(kindForValue('directCompilerHooksInterfaceValue')).toBe(DiKeyIdentityKind.Interface);
    expect(kindForValue('localCompilerHooksLookalikeValue')).toBe(DiKeyIdentityKind.Interface);
  });

  test('keeps constructable identity distinct from the registry JIT branch', () => {
    expect(kindForValue('registryConstructableValue')).toBe(DiKeyIdentityKind.Constructable);
  });

  test('joins object key aliases while keeping distinct object creation sites separate', () => {
    expect(keyForValue('directObjectValue')).toBe(keyForValue('reexportedObjectValue'));
    expect(keyForValue('directObjectValue')).not.toBe(keyForValue('secondObjectValue'));
    expect(kindForValue('directObjectValue')).toBe(DiKeyIdentityKind.Object);
  });

  test('joins local symbol aliases while keeping equal descriptions separate', () => {
    expect(keyForValue('directLocalSymbolValue')).toBe(keyForValue('reexportedLocalSymbolValue'));
    expect(keyForValue('directLocalSymbolValue')).not.toBe(keyForValue('secondLocalSymbolValue'));
    expect(kindForValue('directLocalSymbolValue')).toBe(DiKeyIdentityKind.Symbol);
  });

  test('joins Symbol.for keys by their global registry key', () => {
    expect(keyForValue('firstGlobalSymbolValue')).toBe(keyForValue('secondGlobalSymbolValue'));
    expect(kindForValue('firstGlobalSymbolValue')).toBe(DiKeyIdentityKind.Symbol);
  });

  test('joins numeric property keys by value', () => {
    expect(keyForValue('firstNumberValue')).toBe(keyForValue('secondNumberValue'));
    expect(kindForValue('firstNumberValue')).toBe(DiKeyIdentityKind.Primitive);
  });

  test('reuses the same identity for alias targets and keyed AppTasks', () => {
    expect(aliasTargetIdentity).toBe(keyForValue('directInterfaceValue'));
    expect(aliasTargetKind).toBe(DiKeyIdentityKind.Interface);
    expect(appTaskKeyIdentity).toBe(keyForValue('directInterfaceValue'));
  });

  test('retains resolver-wrapper semantics and canonical inner key identity', () => {
    expect(wrapperTargetIdentity).not.toBeNull();
    expect(wrapperTarget?.resolverKind).toBe(DiResolverKeyKind.NewInstanceOf);
    expect(wrapperTarget?.innerKeyHandle).toBe(keyForValue('directClassValue'));
  });
});
