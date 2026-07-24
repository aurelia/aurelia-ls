import { describe, expect, test } from 'vitest';

import {
  FrameworkRegistrationCapability,
  aureliaFrameworkRegistrationAdmissionSource,
} from '../src/source-plan/index.js';
import {
  frameworkRegistrationKindForExportName,
  frameworkRegistrationKindsForModule,
} from '../src/registration/framework-registration-manifest.js';
import { FrameworkRegistrationKind } from '../src/registration/registration-reference.js';
import {
  FrameworkDiEffectCoverageState,
  frameworkDiRegistrationEffectsForKind,
} from '../src/di/framework-registration-effects.js';
import { FrameworkIntrinsicDiKey } from '../src/di/framework-intrinsic-di-key.js';

describe('framework registration manifest', () => {
  test('keeps DI effect coverage separate from closed catalog projections', () => {
    expect(frameworkDiRegistrationEffectsForKind(
      FrameworkRegistrationKind.StandardConfiguration,
    ).coverageState).toBe(FrameworkDiEffectCoverageState.Partial);
    expect(frameworkDiRegistrationEffectsForKind(
      FrameworkRegistrationKind.RuntimeHtmlDefaultResources,
    ).coverageState).toBe(FrameworkDiEffectCoverageState.Partial);
    expect(frameworkDiRegistrationEffectsForKind(
      FrameworkRegistrationKind.I18nConfiguration,
    ).coverageState).toBe(FrameworkDiEffectCoverageState.Closed);
    const arrayLike = frameworkDiRegistrationEffectsForKind(
      FrameworkRegistrationKind.RuntimeHtmlArrayLikeHandler,
    );
    expect(arrayLike.coverageState).toBe(FrameworkDiEffectCoverageState.Closed);
    expect(arrayLike.resolvers).toEqual([
      expect.objectContaining({
        capability: FrameworkRegistrationCapability.RuntimeHtmlArrayLikeRepeatHandler,
        keyName: FrameworkIntrinsicDiKey.IRepeatableHandler,
        valueName: 'ArrayLikeHandler',
      }),
    ]);
  });

  test('selects a directly usable dialog configuration for generated registration source', () => {
    const source = aureliaFrameworkRegistrationAdmissionSource({
      capability: FrameworkRegistrationCapability.DialogServiceResolvers,
    });

    expect(source?.entrypointImports).toEqual([expect.objectContaining({
      moduleSpecifier: '@aurelia/dialog',
      namedImports: ['DialogConfigurationStandard'],
    })]);
    expect(source?.registrationExpressions.map((expression) =>
      typeof expression === 'string' ? expression : expression.text
    ))
      .toEqual(['DialogConfigurationStandard']);
  });

  test('distinguishes directly registrable configurations from factory namespaces', () => {
    const localizedValidation = aureliaFrameworkRegistrationAdmissionSource({
      capability: FrameworkRegistrationCapability.ValidationI18nServiceResolvers,
    });

    expect(localizedValidation?.entrypointImports).toEqual([expect.objectContaining({
      moduleSpecifier: '@aurelia/validation-i18n',
      namedImports: ['ValidationI18nConfiguration'],
    })]);
    expect(localizedValidation?.registrationExpressions.map((expression) =>
      typeof expression === 'string' ? expression : expression.text
    )).toEqual(['ValidationI18nConfiguration']);
    expect(aureliaFrameworkRegistrationAdmissionSource({
      capability: FrameworkRegistrationCapability.LoggerServiceResolvers,
    })).toBeNull();
    expect(aureliaFrameworkRegistrationAdmissionSource({
      capability: FrameworkRegistrationCapability.StyleLifecycleTasks,
    })).toBeNull();
  });

  test('resolves duplicate export names inside the owning framework module', () => {
    const runtimeHtmlKinds = frameworkRegistrationKindsForModule('@aurelia/runtime-html');
    const routerKinds = frameworkRegistrationKindsForModule('@aurelia/router');

    expect(runtimeHtmlKinds).not.toBeNull();
    expect(routerKinds).not.toBeNull();
    expect(frameworkRegistrationKindForExportName('DefaultComponents', runtimeHtmlKinds!))
      .toBe(FrameworkRegistrationKind.RuntimeHtmlDefaultComponents);
    expect(frameworkRegistrationKindForExportName('DefaultResources', runtimeHtmlKinds!))
      .toBe(FrameworkRegistrationKind.RuntimeHtmlDefaultResources);
    expect(frameworkRegistrationKindForExportName('DefaultComponents', routerKinds!))
      .toBe(FrameworkRegistrationKind.RouterDefaultComponents);
    expect(frameworkRegistrationKindForExportName('DefaultResources', routerKinds!))
      .toBe(FrameworkRegistrationKind.RouterDefaultResources);
  });
});
