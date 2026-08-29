import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  isSemanticRuntimeAnalysisCurrentnessError,
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
  SemanticRuntimeProjectInputChange,
  SemanticRuntimeProjectInputChangeKind,
  type SemanticRuntime,
} from '../src/api/index.js';
import {
  materializeSemanticAppStandardConfigurationSourceAttachments,
  StandardConfigurationSourceCarrierKind,
  StandardConfigurationSourceNonReplaceableReasonKind,
} from '../src/template/browser-template.js';
import {
  FrameworkCapabilityConfigurationState,
} from '../src/configuration/framework-capability-configuration.js';
import {
  standardConfigurationRegistrationEffectsForAppWorld,
} from '../src/di/framework-registration-effects.js';
import { RegistrationAdmissionKind } from '../src/registration/registration-admission.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('StandardConfiguration source attachment', () => {
  const temporaryDirectories: string[] = [];
  const runtimes: SemanticRuntime[] = [];

  afterEach(async () => {
    for (const runtime of runtimes.splice(0)) {
      runtime.retireWorkspaceIncarnation();
    }
    await Promise.all(temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true })
    ));
  });

  test('detaches direct replacement expressions, effect order, coercion, and the browser default refusal', async () => {
    const fixture = await createFixture();
    temporaryDirectories.push(fixture.root);
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixture.root,
      storeKey: `test:standard-configuration-source-attachment:${path.basename(fixture.root)}`,
    });
    runtimes.push(runtime);
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const expectedEffects = standardConfigurationRegistrationEffectsForAppWorld(
      runtime.workspace.store,
      app.emission.appWorld,
    );
    const attachments = materializeSemanticAppStandardConfigurationSourceAttachments(app);

    expect(attachments).toHaveLength(4);
    expect(attachments.map((attachment) => ({
      operationProductHandle: attachment.operationProductHandle,
      operationIdentityHandle: attachment.operationIdentityHandle,
      operationOrdinal: attachment.operationOrdinal,
      admissionProductHandle: attachment.admissionProductHandle,
      admissionIdentityHandle: attachment.admissionIdentityHandle,
      effects: attachment.effects,
    }))).toEqual(expectedEffects.map((effects) => ({
      operationProductHandle: effects.operation.productHandle,
      operationIdentityHandle: effects.operation.identityHandle,
      operationOrdinal: effects.operation.ordinal,
      admissionProductHandle: effects.operation.admission.productHandle,
      admissionIdentityHandle: effects.operation.admission.identityHandle,
      effects: effects.effects,
    })));

    const explicit = attachments.filter((attachment) =>
      attachment.carrier.carrierKind === StandardConfigurationSourceCarrierKind.ExplicitRegistrationValue
    );
    expect(explicit).toHaveLength(3);
    expect(explicit.map((attachment) =>
      attachment.carrier.carrierKind === StandardConfigurationSourceCarrierKind.ExplicitRegistrationValue
        ? attachment.carrier.valueExpression.oldText
        : null
    )).toEqual([
      'StandardConfiguration',
      [
        'StandardConfiguration.customize((options) => {',
        '  options.coercingOptions.enableCoercion = true;',
        '  options.coercingOptions.coerceNullish = true;',
        '})',
      ].join('\n'),
      'StandardConfiguration',
    ]);
    for (const attachment of explicit) {
      if (attachment.carrier.carrierKind !== StandardConfigurationSourceCarrierKind.ExplicitRegistrationValue) {
        throw new Error('Expected an explicit StandardConfiguration source carrier.');
      }
      expect(attachment.carrier.replaceable).toBe(true);
      expect(normalize(attachment.carrier.valueExpression.moduleKey)).toBe('src/main.ts');
      expect(normalize(attachment.carrier.valueExpression.sourcePath)).toBe('src/main.ts');
      await expectOldTextAtRange(attachment.carrier.valueExpression);
    }
    expect(explicit.map((attachment) => attachment.coercion)).toEqual([
      expect.objectContaining({
        enableCoercion: expect.objectContaining({
          state: FrameworkCapabilityConfigurationState.Default,
          recoveryValue: false,
        }),
        coerceNullish: expect.objectContaining({
          state: FrameworkCapabilityConfigurationState.Default,
          recoveryValue: false,
        }),
      }),
      expect.objectContaining({
        enableCoercion: expect.objectContaining({
          state: FrameworkCapabilityConfigurationState.Closed,
          recoveryValue: true,
        }),
        coerceNullish: expect.objectContaining({
          state: FrameworkCapabilityConfigurationState.Closed,
          recoveryValue: true,
        }),
      }),
      expect.objectContaining({
        enableCoercion: expect.objectContaining({
          state: FrameworkCapabilityConfigurationState.Default,
          recoveryValue: false,
        }),
        coerceNullish: expect.objectContaining({
          state: FrameworkCapabilityConfigurationState.Default,
          recoveryValue: false,
        }),
      }),
    ]);

    const browserDefault = attachments.find((attachment) =>
      attachment.admissionKind === RegistrationAdmissionKind.AureliaFacadeDefault
    ) ?? null;
    expect(browserDefault?.carrier).toMatchObject({
      carrierKind: StandardConfigurationSourceCarrierKind.BrowserFacadeDefault,
      replaceable: false,
      reason: {
        reasonKind: StandardConfigurationSourceNonReplaceableReasonKind.BrowserFacadeDefault,
      },
      source: {
        moduleKey: 'src/main.ts',
        sourcePath: 'src/main.ts',
        oldText: 'new BrowserAurelia()',
      },
    });
    if (browserDefault?.carrier.carrierKind !== StandardConfigurationSourceCarrierKind.BrowserFacadeDefault) {
      throw new Error('Expected the implicit browser-facade StandardConfiguration carrier.');
    }
    if (browserDefault.carrier.source != null) {
      await expectOldTextAtRange(browserDefault.carrier.source);
    }
  }, 30_000);

  test('refuses stale materialization while previously detached values survive generation retirement', async () => {
    const fixture = await createFixture();
    temporaryDirectories.push(fixture.root);
    const authority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixture.root,
      storeKey: `test:standard-configuration-source-currentness:${path.basename(fixture.root)}`,
      projectInputAuthority: authority,
    });
    runtimes.push(runtime);
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const detached = materializeSemanticAppStandardConfigurationSourceAttachments(app);
    const serialized = JSON.stringify(detached);

    await writeFile(fixture.mainFile, `${fixture.mainText}\n`, 'utf8');
    authority.advance([new SemanticRuntimeProjectInputChange(
      SemanticRuntimeProjectInputChangeKind.FileValue,
      fixture.mainFile,
    )]);
    expect(app.isCurrent()).toBe(false);
    let failure: unknown = null;
    try {
      materializeSemanticAppStandardConfigurationSourceAttachments(app);
    } catch (error) {
      failure = error;
    }
    expect(isSemanticRuntimeAnalysisCurrentnessError(failure)).toBe(true);

    runtime.retireWorkspaceIncarnation();
    expect(JSON.stringify(detached)).toBe(serialized);
  }, 30_000);
});

async function createFixture(): Promise<{
  readonly root: string;
  readonly mainFile: string;
  readonly mainText: string;
}> {
  const root = await mkdtemp(path.join(packageRoot, '.standard-configuration-source-'));
  const sourceRoot = path.join(root, 'src');
  const mainFile = path.join(sourceRoot, 'main.ts');
  const mainText = [
    "import BrowserAurelia from 'aurelia';",
    "import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';",
    '',
    'const first = new Aurelia().register(StandardConfiguration);',
    'const customized = new Aurelia().register(StandardConfiguration.customize((options) => {',
    '  options.coercingOptions.enableCoercion = true;',
    '  options.coercingOptions.coerceNullish = true;',
    '}));',
    'const last = new Aurelia().register(StandardConfiguration);',
    'const browserDefault = new BrowserAurelia();',
    'void [first, customized, last, browserDefault];',
  ].join('\n');
  await mkdir(sourceRoot, { recursive: true });
  await Promise.all([
    writeFile(path.join(root, 'package.json'), JSON.stringify({ type: 'module' }), 'utf8'),
    writeFile(path.join(root, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        skipLibCheck: true,
        noEmit: true,
      },
      include: ['src'],
    }), 'utf8'),
    writeFile(mainFile, mainText, 'utf8'),
  ]);
  return { root, mainFile, mainText };
}

async function expectOldTextAtRange(source: {
  readonly sourceFilePath: string;
  readonly start: number;
  readonly end: number;
  readonly oldText: string;
}): Promise<void> {
  const text = await readFile(source.sourceFilePath, 'utf8');
  expect(text.slice(source.start, source.end)).toBe(source.oldText);
}

function normalize(value: string): string {
  return value.replaceAll('\\', '/');
}
