import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const tempRoot = await mkdtemp(path.join(packageRoot, '.tmp-external-package-source-admission-'));

try {
  await writeFixture(tempRoot);

  const runtime = await createSemanticRuntime({
    workspaceRoot: tempRoot,
    storeKey: 'external-package-source-admission-contract',
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });

  const definitions = app.ask({
    kind: SemanticAppQueryKind.ResourceDefinitions,
    page: { size: 20 },
  }).value;
  const resourceSeams = app.ask({
    kind: SemanticAppQueryKind.OpenSeamSites,
    openSeamKindKey: 'resource.open-definition-field',
    page: { size: 20 },
  }).value;
  const packageUnresolved = app.ask({
    kind: SemanticAppQueryKind.OpenSeamSites,
    openSeamKindKey: 'evaluation.unresolved-module',
    page: { size: 20 },
  }).value;

  const card = definitions.rows.find((row) => row.name === 'source-admission-card');
  const admitted = card?.bindables.find((row) => row.name === 'admitted');
  const opaque = card?.bindables.find((row) => row.name === 'opaque');
  const bindableBoundarySites = resourceSeams.rows.filter((row) =>
    row.reasonKinds.includes('resource-bindable-configuration-open')
  );
  const admittedBoundarySites = bindableBoundarySites.filter((row) =>
    row.sampleSummary.includes('sourceConfig')
  );
  const opaqueBoundarySites = bindableBoundarySites.filter((row) =>
    row.sampleSummary.includes('opaqueConfig')
  );

  const failures = [
    card == null
      ? 'Expected source-admission-card resource definition.'
      : null,
    admitted?.mode === 'twoWay'
      ? null
      : `Expected admitted source-shipped package bindable mode to stay twoWay, observed ${admitted?.mode ?? 'missing'}.`,
    admitted?.setterKind !== 'open'
      ? null
      : 'Expected admitted source-shipped package bindable setter to close instead of staying open.',
    opaque?.mode === 'twoWay'
      ? null
      : `Expected opaque external package bindable mode to preserve local twoWay override, observed ${opaque?.mode ?? 'missing'}.`,
    opaque?.setterKind === 'open'
      ? null
      : `Expected opaque external package bindable setter to stay open, observed ${opaque?.setterKind ?? 'missing'}.`,
    admittedBoundarySites.length === 0
      ? null
      : `Expected source-shipped package bindable config to avoid resource-boundary seams, observed ${admittedBoundarySites.length}.`,
    opaqueBoundarySites.length === 1
      ? null
      : `Expected exactly one opaque external bindable boundary site, observed ${opaqueBoundarySites.length}.`,
    opaqueBoundarySites.every((row) => row.reasonKinds.includes('external-module-value'))
      ? null
      : `Expected opaque external package boundary to retain external-module-value, observed ${JSON.stringify(opaqueBoundarySites.map((row) => row.reasonKinds))}.`,
    packageUnresolved.totalOpenSeamSites === 0
      ? null
      : `Expected package imports to resolve or become package boundaries, not unresolved modules; observed ${packageUnresolved.totalOpenSeamSites}.`,
  ].filter(Boolean);

  if (failures.length > 0) {
    console.error(JSON.stringify({
      ok: false,
      failures,
      definitions: definitions.rows.map((row) => ({
        name: row.name,
        targetName: row.targetName,
        bindables: row.bindables,
      })),
      resourceSeams,
      packageUnresolved,
    }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({
      ok: true,
      admitted: {
        mode: admitted.mode,
        setterKind: admitted.setterKind,
      },
      opaque: {
        mode: opaque.mode,
        setterKind: opaque.setterKind,
      },
      bindableBoundarySites: bindableBoundarySites.map((row) => ({
        reasonKinds: row.reasonKinds,
        sampleSummary: row.sampleSummary,
        source: row.source?.label,
        sourceRange: row.sourceRange,
      })),
    }, null, 2));
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

async function writeFixture(root) {
  await mkdir(path.join(root, 'src'), { recursive: true });
  await mkdir(path.join(root, 'node_modules', '@acme', 'source-toolkit', 'src'), { recursive: true });
  await mkdir(path.join(root, 'node_modules', '@acme', 'opaque-toolkit', 'dist'), { recursive: true });

  await writeJson(path.join(root, 'package.json'), {
    name: 'external-package-source-admission',
    version: '0.0.0',
    type: 'module',
    dependencies: {
      aurelia: '2.0.0-rc.1',
      '@acme/source-toolkit': '0.0.0',
      '@acme/opaque-toolkit': '0.0.0',
    },
    devDependencies: {
      typescript: '^6.0.3',
    },
  });
  await writeJson(path.join(root, 'tsconfig.json'), {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      strict: true,
      skipLibCheck: true,
      types: [],
      allowJs: true,
      checkJs: false,
    },
    include: [
      'src/**/*.ts',
      'src/**/*.d.ts',
    ],
  });

  await writeFile(path.join(root, 'src', 'main.ts'), [
    "import { Aurelia } from 'aurelia';",
    "import { App } from './app';",
    '',
    'void Aurelia.app({ component: App, host: document.body }).start();',
    '',
  ].join('\n'));
  await writeFile(path.join(root, 'src', 'app.ts'), [
    "import { BindingMode, bindable, customElement } from 'aurelia';",
    "import { sourceConfig } from '@acme/source-toolkit';",
    "import { opaqueConfig } from '@acme/opaque-toolkit';",
    '',
    '@customElement({',
    "  name: 'source-admission-card',",
    "  template: '<span>${admitted}:${opaque}</span>',",
    '})',
    'export class SourceAdmissionCard {',
    '  @bindable({ ...sourceConfig, mode: BindingMode.twoWay })',
    '  admitted = false;',
    '',
    '  @bindable({ ...opaqueConfig, mode: BindingMode.twoWay })',
    '  opaque = false;',
    '}',
    '',
    '@customElement({',
    "  name: 'app-root',",
    "  template: '<source-admission-card admitted.two-way=\"enabled\" opaque.two-way=\"enabled\"></source-admission-card>',",
    '  dependencies: [SourceAdmissionCard],',
    '})',
    'export class App {',
    '  enabled = false;',
    '}',
    '',
  ].join('\n'));

  await writeJson(path.join(root, 'node_modules', '@acme', 'source-toolkit', 'package.json'), {
    name: '@acme/source-toolkit',
    version: '0.0.0',
    type: 'module',
    main: 'src/index.ts',
  });
  await writeFile(path.join(root, 'node_modules', '@acme', 'source-toolkit', 'src', 'index.ts'), [
    'export const sourceConfig = {',
    '  set(value: unknown) {',
    '    return Boolean(value);',
    '  },',
    '};',
    '',
  ].join('\n'));

  await writeJson(path.join(root, 'node_modules', '@acme', 'opaque-toolkit', 'package.json'), {
    name: '@acme/opaque-toolkit',
    version: '0.0.0',
    type: 'module',
    main: 'dist/index.js',
  });
  await writeFile(path.join(root, 'node_modules', '@acme', 'opaque-toolkit', 'dist', 'index.js'), [
    'export const opaqueConfig = {',
    '  set(value) {',
    '    return Boolean(value);',
    '  },',
    '};',
    '',
  ].join('\n'));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
