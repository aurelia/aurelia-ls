import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  SemanticAppQueryKind,
  SemanticRuntimeDetail,
} from '../src/api/contracts.js';
import type { SemanticApplicationTopologyResult } from '../src/api/app-topology.js';
import {
  createSemanticRuntime,
  type SemanticApp,
  type SemanticRuntime,
} from '../src/api/runtime.js';
import { CustomElementDefinition } from '../src/resources/custom-element-definition.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('assigned define result app roots', () => {
  let workspaceRoot: string;
  let runtime: SemanticRuntime;
  let app: SemanticApp;
  let topology: SemanticApplicationTopologyResult;

  beforeAll(async () => {
    workspaceRoot = await mkdtemp(path.join(packageRoot, '.assigned-define-app-root-'));
    await writeWorkspace(workspaceRoot);
    runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: `contract:assigned-define-app-root:${path.basename(workspaceRoot)}`,
    });
    app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    topology = (await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.AppTopology,
      analysisDepth: 'binding-observation',
      detail: SemanticRuntimeDetail.Handles,
      appRetention: 'retain-app',
    })).value as SemanticApplicationTopologyResult;
  }, 30_000);

  afterAll(async () => {
    await rm(workspaceRoot, { force: true, recursive: true });
  });

  test('connects same-file and imported immutable anonymous define results to public app topology', () => {
    expect(publicRoot('local-anonymous-root').component).toMatchObject({
      className: 'LocalAnonymousRoot',
      elementName: 'local-anonymous-root',
    });
    expect(publicRoot('imported-anonymous-root').component).toMatchObject({
      className: 'ImportedAnonymousRoot',
      elementName: 'imported-anonymous-root',
    });

    expectRootIdentity('LocalAnonymousRoot', 'local-anonymous-root');
    expectRootIdentity('ImportedAnonymousRoot', 'imported-anonymous-root');
  });

  test('retains a differently named immutable define-result alias for an explicit target', () => {
    expect(publicRoot('different-explicit-root').component).toMatchObject({
      className: 'DifferentlyNamedTarget',
      elementName: 'different-explicit-root',
    });
    expectRootIdentity('DifferentDefinition', 'different-explicit-root');
  });

  test('joins effective and superseded immutable define-result aliases to the effective definition', () => {
    const superseded = publicRoots('effective-root');
    expect(superseded).toHaveLength(2);
    expect(superseded.map((root) => root.component?.className)).toEqual([
      'SupersededTarget',
      'SupersededTarget',
    ]);

    expectRootIdentity('SupersededDefinition', 'effective-root');
    expectRootIdentity('EffectiveDefinition', 'effective-root');
    expect(app.emission.resourceIndex.lookupByModuleLocal(moduleKey('src/main.ts'), 'SupersededDefinition'))
      .toBe(app.emission.resourceIndex.lookupByModuleLocal(moduleKey('src/main.ts'), 'EffectiveDefinition'));
  });

  test('refuses a TypeChecker carrier fallback through a mutable reassigned binding', () => {
    const unresolved = topology.appRoots.filter((root) => root.component == null);
    expect(unresolved).toHaveLength(1);

    const internal = internalRoot('MutableDefinition');
    expect(internal.component.identityHandle).toBeNull();
    expect(app.emission.resourceIndex.lookupByTargetReference(internal.component)).toBeNull();
  });

  function publicRoot(elementName: string): SemanticApplicationTopologyResult['appRoots'][number] {
    const roots = publicRoots(elementName);
    if (roots.length !== 1) {
      throw new Error(`Expected one public app root for '${elementName}', received ${roots.length}.`);
    }
    return roots[0]!;
  }

  function publicRoots(elementName: string): readonly SemanticApplicationTopologyResult['appRoots'][number][] {
    return topology.appRoots.filter((root) => root.component?.elementName === elementName);
  }

  function expectRootIdentity(localName: string, elementName: string): void {
    const root = internalRoot(localName);
    const definition = app.emission.resourceIndex.lookupByTargetReference(root.component);
    expect(definition).toBeInstanceOf(CustomElementDefinition);
    expect(definition).toMatchObject({ name: elementName });
    expect(root.component.identityHandle).toBe(definition?.target.identityHandle);
  }

  function internalRoot(localName: string) {
    const root = app.emission.configuration.readConfiguration().appRoots.find((candidate) =>
      candidate.component?.localName === localName
    );
    if (root == null || root.component == null) {
      throw new Error(`Expected internal app root '${localName}'.`);
    }
    return root;
  }

  function moduleKey(projectPath: string): string {
    const source = app.emission.project.sourceFiles.find((candidate) => candidate.path === projectPath);
    if (source == null) throw new Error(`Expected source '${projectPath}'.`);
    const sourceFile = app.emission.typeSystem.readProgramSourceFileByProjectPath(source.path);
    const key = sourceFile == null ? null : app.emission.typeSystem.readModuleKeyForSourceFile(sourceFile);
    if (key == null) throw new Error(`Expected module key for '${projectPath}'.`);
    return key;
  }
});

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
    writeFile(path.join(workspaceRoot, 'src', 'imported-root.ts'), [
      "import { CustomElement } from 'aurelia';",
      '',
      'export const ImportedAnonymousRoot = CustomElement.define({',
      "  name: 'imported-anonymous-root',",
      "  template: '<template>imported</template>',",
      '});',
    ].join('\n')),
    writeFile(path.join(workspaceRoot, 'src', 'main.ts'), [
      "import Aurelia, { CustomElement } from 'aurelia';",
      "import { ImportedAnonymousRoot } from './imported-root';",
      '',
      'const LocalAnonymousRoot = CustomElement.define({',
      "  name: 'local-anonymous-root',",
      "  template: '<template>local</template>',",
      '}, class {});',
      '',
      'class DifferentlyNamedTarget {}',
      'const DifferentDefinition = CustomElement.define({',
      "  name: 'different-explicit-root',",
      "  template: '<template>different</template>',",
      '}, DifferentlyNamedTarget);',
      '',
      'class SupersededTarget {}',
      'const SupersededDefinition = CustomElement.define({',
      "  name: 'superseded-root',",
      "  template: '<template>superseded</template>',",
      '}, SupersededTarget);',
      'const EffectiveDefinition = CustomElement.define({',
      "  name: 'effective-root',",
      "  template: '<template>effective</template>',",
      '}, SupersededTarget);',
      '',
      'let MutableDefinition = CustomElement.define({',
      "  name: 'mutable-root',",
      "  template: '<template>mutable</template>',",
      '});',
      'class ReplacementRoot {}',
      'MutableDefinition = ReplacementRoot;',
      '',
      'Aurelia.app(LocalAnonymousRoot).start();',
      'Aurelia.app(ImportedAnonymousRoot).start();',
      'Aurelia.app(DifferentDefinition).start();',
      'Aurelia.app(SupersededDefinition).start();',
      'Aurelia.app(EffectiveDefinition).start();',
      'Aurelia.app(MutableDefinition).start();',
    ].join('\n')),
  ]);
}
