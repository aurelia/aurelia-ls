import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  FrameworkCapabilityConfigurationState,
  FrameworkDiEffectCoverageState,
  FrameworkRegistrationEffectKind,
  standardConfigurationRegistrationEffectsForAppWorld,
} from '../src/api/index.js';
import {
  type FrameworkConfigurationRegistrationEffect,
  type StandardConfigurationRegistrationEffects,
} from '../src/di/framework-registration-effects.js';
import { RegistrationAdmissionKind } from '../src/registration/registration-admission.js';
import {
  createSemanticRuntime,
  type SemanticRuntime,
} from '../src/api/runtime.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('StandardConfiguration registration effects', () => {
  let workspaceRoot: string;
  let runtime: SemanticRuntime;
  let effects: readonly StandardConfigurationRegistrationEffects[];

  beforeAll(async () => {
    workspaceRoot = await mkdtemp(path.join(packageRoot, '.standard-configuration-effects-'));
    await writeWorkspace(workspaceRoot);
    runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: `test:standard-configuration-effects:${path.basename(workspaceRoot)}`,
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    effects = standardConfigurationRegistrationEffectsForAppWorld(
      runtime.workspace.store,
      app.emission.appWorld,
    );
  }, 30_000);

  afterAll(async () => {
    runtime.retireWorkspaceIncarnation();
    await rm(workspaceRoot, { force: true, recursive: true });
  });

  test('retains explicit and browser-facade StandardConfiguration occurrences', () => {
    const browserDefault = effects.find((effect) =>
      effect.operation.admission.admissionKind === RegistrationAdmissionKind.AureliaFacadeDefault
    ) ?? null;
    expect(effects).toHaveLength(4);
    if (browserDefault == null) {
      throw new Error('Expected the browser facade to admit StandardConfiguration.');
    }
    expect(coercionEffect(browserDefault).configuration).toMatchObject({
      enableCoercion: {
        state: FrameworkCapabilityConfigurationState.Default,
        recoveryValue: false,
      },
      coerceNullish: {
        state: FrameworkCapabilityConfigurationState.Default,
        recoveryValue: false,
      },
    });
    expect(effects.filter((effect) =>
      effect.operation.admission.admissionKind !== RegistrationAdmissionKind.AureliaFacadeDefault
    )).toHaveLength(3);
  });

  test('converges default, customized, and open coercion callbacks per admitted registry value', () => {
    const configurations = effects.map(coercionEffect).map((effect) => effect.configuration);

    expect(configurations.filter((configuration) =>
      configuration.enableCoercion.state === FrameworkCapabilityConfigurationState.Default
      && configuration.coerceNullish.state === FrameworkCapabilityConfigurationState.Default
    )).toHaveLength(2);
    expect(configurations).toContainEqual(expect.objectContaining({
      enableCoercion: expect.objectContaining({
        state: FrameworkCapabilityConfigurationState.Closed,
        recoveryValue: true,
      }),
      coerceNullish: expect.objectContaining({
        state: FrameworkCapabilityConfigurationState.Closed,
        recoveryValue: true,
      }),
    }));
    const openEffects = effects.find((effect) =>
      coercionEffect(effect).configuration.enableCoercion.state === FrameworkCapabilityConfigurationState.Open
    ) ?? null;
    const open = openEffects == null ? null : coercionEffect(openEffects).configuration;
    expect(openEffects?.openSummary).toContain('coercion customization retains open');
    expect(openEffects?.openSummary).not.toContain('nested resource and syntax groups');
    expect(open?.enableCoercion.openSeamHandles.length).toBeGreaterThan(0);
    expect(open?.coerceNullish).toMatchObject({
      state: FrameworkCapabilityConfigurationState.Open,
      recoveryValue: false,
    });
  });

  test('closes whole-group replay while preserving nested DI partiality, order, and multiplicity', () => {
    expect(effects[0]).toMatchObject({
      coverageState: FrameworkDiEffectCoverageState.Closed,
      openSummary: null,
      nestedDiCoverageState: FrameworkDiEffectCoverageState.Partial,
    });
    expect(effects[0]?.nestedDiOpenSummary).toContain('nested resource and syntax groups');
    expect(effects[0]?.effects.map(effectKey)).toEqual([
      'configuration:ICoercionConfiguration',
      'resolver:ExpressionParser:ExpressionParser',
      'resolver:IExpressionParser:ExpressionParser',
      'resolver:TemplateCompiler:TemplateCompiler',
      'resolver:ITemplateCompiler:TemplateCompiler',
      'resolver:AttrMapper:AttrMapper',
      'resolver:IAttrMapper:AttrMapper',
      'resolver:ResourceResolver:ResourceResolver',
      'resolver:IResourceResolver:ResourceResolver',
      'resolver:DirtyChecker:DirtyChecker',
      'resolver:IDirtyChecker:DirtyChecker',
      'resolver:NodeObserverLocator:NodeObserverLocator',
      'resolver:INodeObserverLocator:NodeObserverLocator',
      'capability:DefaultResources',
      'capability:DefaultBindingSyntax',
      'resolver:IEventModifier:EventModifier',
      'resolver:IModifiedEventHandlerCreator:ModifiedMouseEventHandler',
      'resolver:IModifiedEventHandlerCreator:ModifiedKeyboardEventHandler',
      'resolver:IModifiedEventHandlerCreator:ModifiedEventHandler',
      'capability:DefaultBindingLanguage',
      'capability:DefaultRenderers',
    ]);
  });
});

function coercionEffect(
  effects: StandardConfigurationRegistrationEffects,
): FrameworkConfigurationRegistrationEffect {
  const effect = effects.effects.find((candidate) =>
    candidate.effectKind === FrameworkRegistrationEffectKind.Configuration
  );
  if (effect?.effectKind !== FrameworkRegistrationEffectKind.Configuration) {
    throw new Error('Expected a StandardConfiguration coercion effect.');
  }
  return effect;
}

function effectKey(
  effect: StandardConfigurationRegistrationEffects['effects'][number],
): string {
  switch (effect.effectKind) {
    case FrameworkRegistrationEffectKind.Configuration:
      return `configuration:${effect.keyName}`;
    case FrameworkRegistrationEffectKind.Resolver:
      return `resolver:${effect.resolver.keyName}:${effect.resolver.valueName ?? ''}`;
    case FrameworkRegistrationEffectKind.Capability:
      return `capability:${effect.exportName}`;
  }
}

async function writeWorkspace(workspaceRoot: string): Promise<void> {
  await mkdir(path.join(workspaceRoot, 'src'), { recursive: true });
  await Promise.all([
    writeFile(path.join(workspaceRoot, 'package.json'), JSON.stringify({ type: 'module' })),
    writeFile(path.join(workspaceRoot, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        skipLibCheck: true,
        noEmit: true,
      },
      include: ['src'],
    })),
    writeFile(path.join(workspaceRoot, 'src', 'main.ts'), [
      "import BrowserAurelia from 'aurelia';",
      "import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';",
      '',
      'const explicit = new Aurelia().register(StandardConfiguration);',
      'const customized = new Aurelia().register(StandardConfiguration.customize((options) => {',
      '  options.coercingOptions.enableCoercion = true;',
      '  options.coercingOptions.coerceNullish = true;',
      '}));',
      'declare const dynamicFlag: boolean;',
      'const open = new Aurelia().register(StandardConfiguration.customize((options) => {',
      '  if (dynamicFlag) {',
      '    options.coercingOptions.enableCoercion = true;',
      '  }',
      '}));',
      'const browserDefault = new BrowserAurelia();',
      'void [explicit, customized, open, browserDefault];',
    ].join('\n')),
  ]);
}
