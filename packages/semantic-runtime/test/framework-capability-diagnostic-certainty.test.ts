import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  type SemanticFrameworkCapabilityDemandsResult,
  type SemanticTemplateDiagnosticsResult,
} from '../src/index.js';
import { ResourceRegistrationAdmission } from '../src/registration/registration-admission.js';
import { ResourceProductDetails } from '../src/resources/product-details.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoots: string[] = [];

describe('framework capability diagnostic certainty', () => {
  afterAll(async () => {
    await Promise.all(workspaceRoots.map((root) => rm(root, { force: true, recursive: true })));
  });

  test('keeps missing capability admission unknown in a standalone authoring compiler world', async () => {
    const workspaceRoot = await createWorkspace({
      'src/authoring-card.ts': [
        "import { customElement } from '@aurelia/runtime-html';",
        "import template from './authoring-card.html';",
        "@customElement({ name: 'authoring-card', template })",
        'export class AuthoringCard {}',
      ].join('\n'),
      'src/authoring-card.html': [
        '<au-viewport default="home"></au-viewport>',
        '<span>${\'home.title\' | t}</span>',
        '<unknown-plugin><template au-slot="item"></template></unknown-plugin>',
      ].join(''),
    });
    const templatePath = path.join(workspaceRoot, 'src/authoring-card.html');
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: `test:framework-capability-authoring-certainty:${path.basename(workspaceRoot)}`,
    });
    const requestBoundary = {
      sourceFilePath: templatePath,
      sourceFile: { filePath: templatePath },
      includeAuthoringTemplates: true,
      authoringTemplateSourceFiles: [templatePath],
      analysisDepth: 'binding-observation' as const,
      appRetention: 'retain-app' as const,
      page: { size: 100 },
    };

    const demands = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.FrameworkCapabilityDemands,
      ...requestBoundary,
    });
    const routerDemands = (demands.value as SemanticFrameworkCapabilityDemandsResult).rows.filter((row) =>
      row.requiredCapability === 'router.default-resources'
    );
    expect(routerDemands).not.toHaveLength(0);
    expect(routerDemands.every((row) =>
      row.admissionState === 'admission-unknown'
      && row.actionability === 'registration-status-unknown'
    )).toBe(true);

    const diagnostics = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      diagnosticProjection: 'type-projection',
      ...requestBoundary,
    });
    expect((diagnostics.value as SemanticTemplateDiagnosticsResult).rows.some((row) =>
      row.diagnosticKind === 'framework-capability-not-registered'
      || row.diagnosticKind === 'runtime-value-converter-framework-error'
      || row.diagnosticKind === 'template-compiler-error'
    )).toBe(false);
    const appDiagnostics = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.AppDiagnostics,
      diagnosticProjection: 'type-projection',
      ...requestBoundary,
    });
    expect(appDiagnostics.value.rows.some((row) =>
      row.diagnosticKind === 'framework-capability-not-registered'
      || row.diagnosticKind === 'runtime-value-converter-framework-error'
      || row.diagnosticKind === 'template-compiler-error'
    )).toBe(false);
  }, 30_000);

  test('scopes arbitrary and resource-only open registrations to their exact app chains', async () => {
    const workspaceRoot = await createWorkspace({
      'src/main.ts': [
        "import { Aurelia, CustomAttribute, StandardConfiguration } from '@aurelia/runtime-html';",
        "import { RouterConfiguration } from '@aurelia/router';",
        "import { Broken } from './broken.js';",
        "import { ClosedRegistrationApp } from './closed-registration-app.js';",
        "import { OpenRegistrationApp } from './open-registration-app.js';",
        'declare function runtimeRegistry(): unknown;',
        'declare function runtimeAttributeDefinition(): any;',
        'declare function runtimeAttributeType(): any;',
        'void RouterConfiguration;',
        'new Aurelia()',
        '  .register(StandardConfiguration, Broken, CustomAttribute.define(runtimeAttributeDefinition(), runtimeAttributeType()))',
        '  .app({ host: document.body, component: ClosedRegistrationApp })',
        '  .start();',
        'new Aurelia()',
        '  .register(StandardConfiguration, runtimeRegistry())',
        '  .app({ host: document.body, component: OpenRegistrationApp })',
        '  .start();',
      ].join('\n'),
      'src/broken.ts': [
        "import { CustomElement } from '@aurelia/runtime-html';",
        'declare function runtimeType(): any;',
        "export const Broken = CustomElement.define({ name: 'broken-card', template: '<template></template>' }, runtimeType());",
      ].join('\n'),
      'src/closed-registration-app.ts': [
        "import { customElement } from '@aurelia/runtime-html';",
        "import template from './closed-registration-app.html';",
        "@customElement({ name: 'closed-registration-app', template })",
        'export class ClosedRegistrationApp {}',
      ].join('\n'),
      'src/closed-registration-app.html': [
        '<au-viewport default="home"></au-viewport>',
        '<unknown-plugin><template au-slot="item"></template></unknown-plugin>',
      ].join(''),
      'src/open-registration-app.ts': [
        "import { customElement } from '@aurelia/runtime-html';",
        "import template from './open-registration-app.html';",
        "@customElement({ name: 'open-registration-app', template })",
        'export class OpenRegistrationApp {}',
      ].join('\n'),
      'src/open-registration-app.html': [
        '<au-viewport default="home"></au-viewport>',
        '<unknown-plugin><template au-slot="item"></template></unknown-plugin>',
      ].join(''),
    });
    const openTemplatePath = path.join(workspaceRoot, 'src/open-registration-app.html');
    const closedTemplatePath = path.join(workspaceRoot, 'src/closed-registration-app.html');
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: `test:framework-capability-open-registration:${path.basename(workspaceRoot)}`,
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const constraintAdmissions = app.emission.appWorld.configuration.registrationAdmissions.filter(
      (admission): admission is ResourceRegistrationAdmission =>
        admission instanceof ResourceRegistrationAdmission
        && admission.registeredValue.valueKind === 'resource-definition-constraint',
    );
    expect(constraintAdmissions).toHaveLength(1);
    const constraintAdmission = constraintAdmissions[0]!;
    expect(constraintAdmission.registeredValue).toMatchObject({
      localName: null,
      resourceKind: 'custom-attribute',
      resourceLookupKeys: [],
    });
    const constraintHandle = constraintAdmission.registeredValue.productHandle;
    expect(constraintHandle).not.toBeNull();
    expect(runtime.workspace.store.productDetails.read(
      ResourceProductDetails.DefinitionHeader,
      constraintHandle!,
    )).toMatchObject({
      resourceKind: 'custom-attribute',
      primaryName: null,
    });
    expect(runtime.workspace.store.readClaimsForSubject(constraintAdmission.productHandle)
      .map((handle) => runtime.workspace.store.read(handle))
      .some((claim) => claim?.kind === 'semantic-claim' && claim.objectHandle === constraintHandle)).toBe(true);
    expect(app.emission.appWorld.diWorld.registrationOpenSeamScopes.some((scope) =>
      scope.operation?.admission === constraintAdmission
      && scope.seam.reasonKinds.includes('di-resource-slot-open')
    )).toBe(true);
    const allDemands = app.ask({
      kind: SemanticAppQueryKind.FrameworkCapabilityDemands,
      page: { size: 100 },
    }).value.rows;
    const openDemands = allDemands.filter((row) =>
      row.requiredCapability === 'router.default-resources'
      && sourcePathEndsWith(row.templateSource?.path, 'src/open-registration-app.html')
    );
    const closedDemands = allDemands.filter((row) =>
      row.requiredCapability === 'router.default-resources'
      && sourcePathEndsWith(row.templateSource?.path, 'src/closed-registration-app.html')
    );

    expect(openDemands).not.toHaveLength(0);
    expect(openDemands.every((row) =>
      row.admissionState === 'admission-unknown'
      && row.blockingOpenSeamCount > 0
      && row.actionability === 'registration-status-unknown'
    )).toBe(true);
    expect(closedDemands).not.toHaveLength(0);
    expect(closedDemands.every((row) =>
      row.admissionState === 'not-admitted'
      && row.blockingOpenSeamCount === 0
      && row.actionability === 'missing-registration'
    )).toBe(true);

    const openDiagnostics = app.ask({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      sourceFile: { filePath: openTemplatePath },
      diagnosticProjection: 'type-projection',
      page: { size: 100 },
    }).value.rows;
    expect(openDiagnostics.some((row) =>
      row.diagnosticKind === 'framework-capability-not-registered'
      || row.diagnosticKind === 'template-compiler-error'
    )).toBe(false);
    const openAppDiagnostics = app.ask({
      kind: SemanticAppQueryKind.AppDiagnostics,
      sourceFile: { filePath: openTemplatePath },
      diagnosticProjection: 'type-projection',
      page: { size: 100 },
    }).value.rows;
    expect(openAppDiagnostics.some((row) =>
      row.diagnosticKind === 'framework-capability-not-registered'
      || row.diagnosticKind === 'template-compiler-error'
    )).toBe(false);

    const closedAppDiagnostics = app.ask({
      kind: SemanticAppQueryKind.AppDiagnostics,
      sourceFile: { filePath: closedTemplatePath },
      diagnosticProjection: 'type-projection',
      page: { size: 100 },
    }).value.rows;
    expect(closedAppDiagnostics.some((row) =>
      row.diagnosticKind === 'framework-capability-not-registered'
      && row.missingInput === 'router.default-resources'
    )).toBe(true);
    expect(closedAppDiagnostics.some((row) =>
      row.diagnosticKind === 'template-compiler-error'
      && row.frameworkErrorCode === 'AUR0706'
    )).toBe(true);
  }, 30_000);

  test('does not launder a nested define-call constraint through an opaque wrapper', async () => {
    const workspaceRoot = await createWorkspace({
      'src/main.ts': [
        "import { Aurelia, CustomAttribute, StandardConfiguration } from '@aurelia/runtime-html';",
        "import { WrappedRegistrationApp } from './wrapped-registration-app.js';",
        'declare function runtimeDefinition(): any;',
        'declare function runtimeType(): any;',
        'declare function choose(value: unknown): unknown;',
        'new Aurelia()',
        '  .register(StandardConfiguration, choose(CustomAttribute.define(runtimeDefinition(), runtimeType())))',
        '  .app({ host: document.body, component: WrappedRegistrationApp })',
        '  .start();',
      ].join('\n'),
      'src/wrapped-registration-app.ts': [
        "import { customElement } from '@aurelia/runtime-html';",
        "import template from './wrapped-registration-app.html';",
        "@customElement({ name: 'wrapped-registration-app', template })",
        'export class WrappedRegistrationApp {}',
      ].join('\n'),
      'src/wrapped-registration-app.html': '<au-viewport default="home"></au-viewport>',
    });
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: `test:framework-capability-wrapper-certainty:${path.basename(workspaceRoot)}`,
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const demands = app.ask({
      kind: SemanticAppQueryKind.FrameworkCapabilityDemands,
      page: { size: 100 },
    }).value.rows.filter((row) => row.requiredCapability === 'router.default-resources');

    expect(demands).not.toHaveLength(0);
    expect(demands.every((row) =>
      row.admissionState === 'admission-unknown'
      && row.blockingOpenSeamCount > 0
    )).toBe(true);
    expect(app.emission.appWorld.configuration.registrationAdmissions.some((admission) =>
      admission instanceof ResourceRegistrationAdmission
      && admission.registeredValue.valueKind === 'resource-definition-constraint'
    )).toBe(false);
  }, 30_000);

  test('does not globalize a targetless standalone registration seam into a closed app container', async () => {
    const workspaceRoot = await createWorkspace({
      'src/main.ts': [
        "import type { IContainer } from '@aurelia/kernel';",
        "import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';",
        "import { ClosedApp } from './closed-app.js';",
        'declare function runtimeContainer(): IContainer;',
        'declare function runtimeRegistry(): unknown;',
        'const container: IContainer = runtimeContainer();',
        'container.register(runtimeRegistry());',
        'new Aurelia()',
        '  .register(StandardConfiguration)',
        '  .app({ host: document.body, component: ClosedApp })',
        '  .start();',
      ].join('\n'),
      'src/closed-app.ts': [
        "import { customElement } from '@aurelia/runtime-html';",
        "import template from './closed-app.html';",
        "@customElement({ name: 'closed-app', template })",
        'export class ClosedApp {}',
      ].join('\n'),
      'src/closed-app.html': [
        '<au-viewport default="home"></au-viewport>',
        '<unknown-plugin><template au-slot="item"></template></unknown-plugin>',
      ].join(''),
    });
    const templatePath = path.join(workspaceRoot, 'src/closed-app.html');
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: `test:framework-capability-targetless-seam:${path.basename(workspaceRoot)}`,
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    expect(app.emission.appWorld.diWorld.registrationOpenSeamScopes.some((scope) =>
      scope.operation == null
      && scope.seam.reasonKinds.includes('di-registration-container-open')
    )).toBe(true);
    const demands = app.ask({
      kind: SemanticAppQueryKind.FrameworkCapabilityDemands,
      page: { size: 100 },
    }).value.rows.filter((row) => row.requiredCapability === 'router.default-resources');
    expect(demands).not.toHaveLength(0);
    expect(demands.every((row) =>
      row.admissionState === 'not-admitted'
      && row.blockingOpenSeamCount === 0
    )).toBe(true);
    const diagnostics = app.ask({
      kind: SemanticAppQueryKind.AppDiagnostics,
      sourceFile: { filePath: templatePath },
      diagnosticProjection: 'type-projection',
      page: { size: 100 },
    }).value.rows;
    expect(diagnostics.some((row) =>
      row.diagnosticKind === 'framework-capability-not-registered'
    )).toBe(true);
    expect(diagnostics.some((row) =>
      row.diagnosticKind === 'template-compiler-error'
      && row.frameworkErrorCode === 'AUR0706'
    )).toBe(true);
  }, 30_000);

  test('keeps configured exclusions open only on the app chain with an unknown registry', async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/validation-html-configured-resources');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'test:framework-capability-configured-open-chain',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const demands = app.ask({
      kind: SemanticAppQueryKind.FrameworkCapabilityDemands,
      page: { size: 300 },
    }).value.rows;
    const coreOnly = demands.filter((row) =>
      row.requiredCapability === 'validation-html.default-resources'
      && sourcePathEndsWith(row.templateSource?.path, 'src/validation-core-only-app.html')
      && (row.authoredName === 'validation-container' || row.authoredName.startsWith('validation-errors'))
    );
    const closedSibling = demands.filter((row) =>
      row.requiredCapability === 'validation-html.default-resources'
      && sourcePathEndsWith(row.templateSource?.path, 'src/validation-null-template-app.html')
      && row.authoredName === 'validation-container'
    );

    expect(coreOnly).toHaveLength(2);
    expect(coreOnly.every((row) =>
      row.admissionState === 'admission-unknown'
      && row.blockingOpenSeamCount > 0
      && row.configurationSources.length > 0
    )).toBe(true);
    expect(closedSibling).not.toHaveLength(0);
    expect(closedSibling.every((row) =>
      row.admissionState === 'configured-out'
      && row.blockingOpenSeamCount === 0
    )).toBe(true);

    const coreDiagnostics = app.ask({
      kind: SemanticAppQueryKind.AppDiagnostics,
      sourceFile: { filePath: 'src/validation-core-only-app.html' },
      diagnosticProjection: 'type-projection',
      page: { size: 300 },
    }).value.rows;
    expect(coreDiagnostics.some((row) =>
      row.diagnosticKind === 'framework-capability-configured-out'
    )).toBe(false);
  }, 30_000);
});

async function createWorkspace(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(path.join(packageRoot, '.framework-capability-certainty-'));
  workspaceRoots.push(root);
  const allFiles = {
    'package.json': JSON.stringify({
      name: 'framework-capability-certainty',
      private: true,
      type: 'module',
      dependencies: {
        '@aurelia/router': '^2.0.0-rc.2',
        '@aurelia/i18n': '^2.0.0-rc.2',
        '@aurelia/runtime-html': '^2.0.0-rc.2',
      },
    }),
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        allowArbitraryExtensions: true,
      },
      include: ['src'],
    }),
    'src/aurelia-assets.d.ts': "declare module '*.html' { const markup: string; export default markup; }\n",
    ...files,
  };
  for (const [relativePath, contents] of Object.entries(allFiles)) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents, 'utf8');
  }
  return root;
}

function sourcePathEndsWith(value: string | null | undefined, suffix: string): boolean {
  const normalized = value?.replaceAll('\\', '/') ?? '';
  return normalized === suffix || normalized.endsWith(`/${suffix}`);
}
