import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { StaticCallableSlot } from '../src/evaluation/function-execution.js';
import { EvaluationValueKind } from '../src/evaluation/values.js';
import {
  TemplateCompilerHookCallableAuthorityKind,
  TemplateCompilerHookMembershipState,
} from '../src/template/compiler-hook-world.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('root template-compiler hook registries', () => {
  let workspaceRoot: string;

  beforeAll(async () => {
    workspaceRoot = await mkdtemp(path.join(packageRoot, '.root-compiler-hook-registries-'));
    await writeWorkspaceFiles(workspaceRoot, {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          experimentalDecorators: false,
          strict: true,
        },
        include: ['src'],
      }),
      'src/hook-barrel.ts': [
        'export { ITemplateCompilerHooks, TemplateCompilerHooks, templateCompilerHooks }',
        "  from '@aurelia/template-compiler';",
      ].join('\n'),
      'src/main.ts': [
        "import { Registration } from '@aurelia/kernel';",
        "import { Aurelia, customElement, StandardConfiguration } from '@aurelia/runtime-html';",
        "import { ITemplateCompilerHooks, TemplateCompilerHooks, templateCompilerHooks } from './hook-barrel.js';",
        'const absentHook = {};',
        'const instanceHook = { compiling(): void {} };',
        'class DefinedHook { compiling(): void {} }',
        '@templateCompilerHooks()',
        'class DecoratedHook { compiling(): void {} }',
        '@templateCompilerHooks',
        'class DecoratedBaseHook { compiling(): void {} }',
        'class InheritedHook extends DecoratedBaseHook {}',
        "@customElement({ name: 'root-hook-app', template: '' })",
        'class RootHookApp {}',
        'new Aurelia()',
        '  .register(',
        '    StandardConfiguration,',
        '    Registration.instance(ITemplateCompilerHooks, absentHook),',
        '    Registration.instance(ITemplateCompilerHooks, instanceHook),',
        '    TemplateCompilerHooks.define(DefinedHook),',
        '    DecoratedHook,',
        '    InheritedHook,',
        '    TemplateCompilerHooks.define(DefinedHook),',
        '  )',
        '  .app({ host: document.body, component: RootHookApp })',
        '  .start();',
      ].join('\n'),
    });
  });

  afterAll(async () => {
    if (workspaceRoot != null) await rm(workspaceRoot, { force: true, recursive: true });
  });

  test('spends define and inherited decorator metadata as ordered singleton providers', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: `test:root-compiler-hook-registries:${path.basename(workspaceRoot)}`,
    });
    const app = await runtime.openApp({ analysisDepth: 'runtime-topology' });
    const world = app.emission.appWorld.compilerWorlds[0];
    if (world == null) throw new Error('Expected one app-root compiler world.');

    expect(world.compilerHooks.membershipState).toBe(TemplateCompilerHookMembershipState.ExactList);
    expect(world.compilerHooks.openReasons).toEqual([]);
    expect(world.compilerHooks.entries.map((entry) => ({
      laneOrdinal: entry.laneOrdinal,
      sourceOrdinal: entry.sourceOrdinal,
      callable: entry.callable.authorityKind,
    }))).toEqual([
      { laneOrdinal: 0, sourceOrdinal: 0, callable: TemplateCompilerHookCallableAuthorityKind.Absent },
      { laneOrdinal: 1, sourceOrdinal: 1, callable: TemplateCompilerHookCallableAuthorityKind.StaticCallable },
      { laneOrdinal: 2, sourceOrdinal: 2, callable: TemplateCompilerHookCallableAuthorityKind.StaticCallable },
      { laneOrdinal: 3, sourceOrdinal: 3, callable: TemplateCompilerHookCallableAuthorityKind.StaticCallable },
      { laneOrdinal: 4, sourceOrdinal: 4, callable: TemplateCompilerHookCallableAuthorityKind.StaticCallable },
      { laneOrdinal: 5, sourceOrdinal: 5, callable: TemplateCompilerHookCallableAuthorityKind.StaticCallable },
    ]);

    const receiverNames = world.compilerHooks.entries.slice(2).map((entry) => {
      const slotKey = entry.callable.callableSlotKey;
      if (slotKey == null) return null;
      const target = world.callableBindings.target(new StaticCallableSlot(slotKey));
      const declaration = target?.receiver?.kind === EvaluationValueKind.Instance
        ? target.receiver.classValue.declaration
        : null;
      return declaration?.name?.getText(declaration.getSourceFile()) ?? null;
    });
    expect(receiverNames).toEqual([
      'DefinedHook',
      'DecoratedHook',
      'DecoratedBaseHook',
      'DefinedHook',
    ]);
  }, 30_000);

  test('keeps a define registry open when its provider target is not an evaluator class', async () => {
    const openRoot = await mkdtemp(path.join(packageRoot, '.root-compiler-hook-open-registry-'));
    try {
      await writeWorkspaceFiles(openRoot, {
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
          "import { Aurelia, customElement, StandardConfiguration } from '@aurelia/runtime-html';",
          "import { TemplateCompilerHooks } from '@aurelia/template-compiler';",
          'class KnownHook { compiling(): void {} }',
          'declare const unresolvedHook: typeof KnownHook;',
          "@customElement({ name: 'open-root-hook-app', template: '' })",
          'class OpenRootHookApp {}',
          'new Aurelia()',
          '  .register(StandardConfiguration, TemplateCompilerHooks.define(unresolvedHook))',
          '  .app({ host: document.body, component: OpenRootHookApp })',
          '  .start();',
        ].join('\n'),
      });
      const runtime = await createSemanticRuntime({
        workspaceRoot: openRoot,
        storeKey: `test:root-compiler-hook-open-registry:${path.basename(openRoot)}`,
      });
      const app = await runtime.openApp({ analysisDepth: 'runtime-topology' });
      const hooks = app.emission.appWorld.compilerWorlds[0]?.compilerHooks;
      if (hooks == null) throw new Error('Expected open app-root compiler hooks.');
      expect(hooks.membershipState).toBe(TemplateCompilerHookMembershipState.Open);
      expect(hooks.entries).toEqual([]);
      expect(hooks.openReasons.map((reason) => reason.summary)).toContainEqual(
        expect.stringContaining('TemplateCompilerHooks.define'),
      );
    } finally {
      await rm(openRoot, { force: true, recursive: true });
    }
  }, 30_000);
});

async function writeWorkspaceFiles(
  root: string,
  files: Readonly<Record<string, string>>,
): Promise<void> {
  for (const [relativePath, contents] of Object.entries(files)) {
    const fileName = path.join(root, relativePath);
    await mkdir(path.dirname(fileName), { recursive: true });
    await writeFile(fileName, contents, 'utf8');
  }
}
