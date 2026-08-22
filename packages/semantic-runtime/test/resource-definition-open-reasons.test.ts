import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { OpenSeamReasonKind } from '../src/kernel/open-seam.js';
import { KernelVocabulary } from '../src/kernel/vocabulary.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('resource definition open reasons', () => {
  let workspaceRoot: string;

  beforeAll(async () => {
    workspaceRoot = await mkdtemp(path.join(packageRoot, '.resource-definition-open-reasons-'));
    await writeWorkspaceFiles(workspaceRoot, {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
        },
        include: ['src'],
      }),
      'src/main.ts': [
        "import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';",
        "import { OpenReasonApp } from './open-reason-app.js';",
        'new Aurelia()',
        '  .register(StandardConfiguration)',
        '  .app({ host: document.body, component: OpenReasonApp })',
        '  .start();',
      ].join('\n'),
      'src/open-reason-app.ts': [
        "import { customElement } from '@aurelia/runtime-html';",
        'declare function runtimeTemplate(): unknown;',
        '@customElement({',
        "  name: 'open-reason-app',",
        '  template: 42,',
        '  capture: 42,',
        '  shadowOptions: 42,',
        "  strict: 'yes',",
        '})',
        'export class OpenReasonApp {}',
        '@customElement({',
        "  name: 'dynamic-template-app',",
        '  template: runtimeTemplate(),',
        '})',
        'export class DynamicTemplateApp {}',
      ].join('\n'),
    });
  });

  afterAll(async () => {
    if (workspaceRoot != null) {
      await rm(workspaceRoot, { force: true, recursive: true });
    }
  });

  test('retains a typed framework-semantic cause for closed wrong-shaped metadata fields', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: `test:resource-definition-open-reasons:${path.basename(workspaceRoot)}`,
    });

    await expect(runtime.openApp({ analysisDepth: 'binding-observation' })).resolves.toBeDefined();
    const seams = runtime.workspace.store.readOpenSeams().filter((seam) =>
      seam.seamKindKey === KernelVocabulary.Resource.OpenDefinitionField.key
      && seam.summary.startsWith('Custom element ')
    );

    const closedShapeSeams = seams.filter((seam) =>
      seam.reasonKinds.includes(OpenSeamReasonKind.ResourceDefinitionFieldOpen)
    );
    expect(closedShapeSeams.map((seam) => seam.summary)).toEqual(expect.arrayContaining([
      'Custom element capture metadata did not close to a boolean or predicate.',
      'Custom element template metadata did not close to markup or an imported template.',
      'Custom element shadowOptions did not close to an object.',
      'Custom element strict metadata did not close to a boolean.',
    ]));
    expect(seams.every((seam) => seam.reasonKinds.length > 0)).toBe(true);
    expect(closedShapeSeams.every((seam) =>
      seam.reasonKinds.length === 1
      && seam.reasonKinds[0] === OpenSeamReasonKind.ResourceDefinitionFieldOpen
    )).toBe(true);
    const dynamicTemplate = seams.find((seam) =>
      seam.summary === 'Custom element template metadata did not close to markup or an imported template.'
      && !seam.reasonKinds.includes(OpenSeamReasonKind.ResourceDefinitionFieldOpen)
    );
    expect(dynamicTemplate?.reasonKinds).toEqual([OpenSeamReasonKind.HostEnvironmentValue]);
  }, 30_000);
});

async function writeWorkspaceFiles(
  root: string,
  files: Readonly<Record<string, string>>,
): Promise<void> {
  for (const [relativePath, contents] of Object.entries(files)) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents, 'utf8');
  }
}
