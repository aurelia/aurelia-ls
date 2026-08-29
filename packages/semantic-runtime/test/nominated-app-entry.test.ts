import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  SEMANTIC_APP_ENTRY_ACTIVATION_ERROR_CODE,
  SemanticAppEntryActivationError,
  type SemanticAppEntryArgument,
} from '../src/configuration/nominated-app-entry.js';
import { StaticProjectEvaluationSourceIndex } from '../src/evaluation/project-source-index.js';
import { EvaluationValueKind } from '../src/evaluation/values.js';
import {
  createSemanticRuntime,
  type SemanticApp,
  type SemanticRuntime,
} from '../src/api/runtime.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('nominated synchronous app entry activation', () => {
  let workspaceRoot: string;
  let runtime: SemanticRuntime;

  beforeAll(async () => {
    workspaceRoot = await mkdtemp(path.join(packageRoot, '.nominated-app-entry-'));
    await writeWorkspace(workspaceRoot);
    runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: `contract:nominated-app-entry:${path.basename(workspaceRoot)}`,
    });
  }, 30_000);

  afterAll(async () => {
    await rm(workspaceRoot, { force: true, recursive: true });
  });

  test('leaves a benchmark-shaped exported start dormant unless it is explicitly nominated', async () => {
    const ordinary = await runtime.openApp({ analysisDepth: 'runtime-topology' });
    expect(ordinary.emission.configuration.readConfiguration().appRoots).toHaveLength(0);

    const nominated = await openBenchmarkEntry(runtime);
    const roots = nominated.emission.configuration.readConfiguration().appRoots;
    expect(roots).toHaveLength(1);
    expect(roots[0]?.component?.localName).toBe('BenchmarkApp');
  });

  test('routes imported-helper effects to their owning source while retaining one activation order', async () => {
    const app = await openBenchmarkEntry(runtime);
    const evaluation = app.emission.evaluation;
    const main = evaluatedSource(app, 'src/main.ts');
    const helper = evaluatedSource(app, 'src/helper.ts');
    const mainActivation = main.evaluation.invocations.filter((invocation) =>
      invocation.node.getStart(main.sourceFile) >= main.sourceFile.text.indexOf('runApp(host)')
    );
    const helperActivation = helper.evaluation.invocations.filter((invocation) =>
      invocation.node.getStart(helper.sourceFile) >= helper.sourceFile.text.indexOf('new Aurelia()')
    );

    expect(mainActivation.map((invocation) => invocation.node.getText(main.sourceFile)))
      .toEqual(['runApp(host)']);
    expect(helperActivation.map((invocation) => invocation.node.getText(helper.sourceFile)))
      .toEqual([
        'new Aurelia()',
        'new Aurelia().app({ host, component: BenchmarkApp })',
        'new Aurelia().app({ host, component: BenchmarkApp }).start()',
      ]);
    expect(main.evaluation.invocations.some((invocation) =>
      invocation.node.getSourceFile() === helper.sourceFile
    )).toBe(false);

    const sourceIndex = new StaticProjectEvaluationSourceIndex(evaluation);
    const activationOrdinals = [...mainActivation, ...helperActivation]
      .map((invocation) => sourceIndex.executionOrdinalForInvocation(invocation));
    expect(activationOrdinals.every((ordinal) => ordinal != null)).toBe(true);
    expect(activationOrdinals).toEqual([...activationOrdinals].sort((left, right) => left! - right!));

    const appCall = helperActivation.find((invocation) =>
      invocation.node.getText(helper.sourceFile).endsWith('.app({ host, component: BenchmarkApp })')
    );
    const config = appCall?.argumentList.elements[0]?.value;
    expect(config?.kind).toBe(EvaluationValueKind.Object);
    if (config?.kind !== EvaluationValueKind.Object) {
      throw new Error('Expected the activated app config argument to retain an evaluator object.');
    }
    expect(config.properties.get('host')?.value).toMatchObject({
      kind: EvaluationValueKind.BoundaryObject,
      boundaryKind: 'host-environment',
      path: "document.querySelector('#app')",
    });
  });

  test('supports exact local selectors without treating local functions as implicit entries', async () => {
    const ordinary = await runtime.openApp({ analysisDepth: 'runtime-topology' });
    expect(ordinary.emission.configuration.readConfiguration().appRoots).toHaveLength(0);
    const local = await runtime.openApp({
      analysisDepth: 'runtime-topology',
      nominatedEntry: {
        sourceFilePath: 'src/main.ts',
        callable: { kind: 'local', name: 'localStart' },
        arguments: [{ kind: 'host-environment', path: '#local-host' }],
      },
    });
    expect(local.emission.configuration.readConfiguration().appRoots).toHaveLength(1);
  });

  test('refuses missing, noncallable, async, abrupt, and conditional entries causally', async () => {
    await expectRefusal('missing', /does not resolve to a local binding/);
    await expectRefusal('notCallable', /not a statically executable function/);
    await expectRefusal('asyncStart', /is async/);
    await expectRefusal('abruptStart', /completed abruptly/);
    await expectRefusal(
      'conditionalStart',
      /unsupported execution pressure|conditional execution topology/,
      [{ kind: 'host-environment', path: 'window.dynamicFlag' }],
    );
  }, 60_000);

  test('segregates app-cache identity by the exact normalized activation descriptor', async () => {
    const first = await openBenchmarkEntry(runtime);
    const same = await openBenchmarkEntry(runtime);
    expect(same).toBe(first);

    const nestedItems: readonly SemanticAppEntryArgument[] = [{
      kind: 'array',
      elements: [
        { kind: 'primitive', value: 'row' },
        { kind: 'undefined' },
        { kind: 'host-environment', path: 'window.externalRow' },
      ],
    }];
    const differentArgument = await openBenchmarkEntry(runtime, nestedItems);
    expect(differentArgument).not.toBe(first);
    expect(differentArgument.emission.configuration.readConfiguration().appRoots).toHaveLength(1);
    expect(await openBenchmarkEntry(runtime, nestedItems)).toBe(differentArgument);

    const ordinary = await runtime.openApp({ analysisDepth: 'runtime-topology' });
    expect(ordinary).not.toBe(differentArgument);
    expect(ordinary.emission.configuration.readConfiguration().appRoots).toHaveLength(0);
  });

  async function expectRefusal(
    name: string,
    message: RegExp,
    arguments_: readonly ({ readonly kind: 'host-environment'; readonly path: string })[] = [],
  ): Promise<void> {
    let refusal: unknown = null;
    try {
      await runtime.openApp({
        analysisDepth: 'runtime-topology',
        nominatedEntry: {
          sourceFilePath: 'src/refusals.ts',
          callable: { kind: 'export', name },
          arguments: arguments_,
        },
      });
    } catch (error) {
      refusal = error;
    }
    if (!(refusal instanceof SemanticAppEntryActivationError)) {
      const summary = refusal instanceof Error ? `${refusal.name}: ${refusal.message}` : String(refusal);
      throw new Error(`Expected '${name}' activation refusal, received ${summary}.`);
    }
    expect(refusal.code).toBe(SEMANTIC_APP_ENTRY_ACTIVATION_ERROR_CODE);
    expect(refusal.message).toMatch(message);
  }
});

async function openBenchmarkEntry(
  runtime: SemanticRuntime,
  items: readonly SemanticAppEntryArgument[] = [],
): Promise<SemanticApp> {
  return runtime.openApp({
    analysisDepth: 'runtime-topology',
    nominatedEntry: {
      sourceFilePath: 'src/main.ts',
      callable: { kind: 'export', name: 'start' },
      arguments: [
        { kind: 'host-environment', path: "document.querySelector('#app')" },
        { kind: 'array', elements: items },
      ],
    },
  });
}

function evaluatedSource(app: SemanticApp, projectPath: string) {
  const source = app.emission.evaluation.sources.find((candidate) => candidate.admission.path === projectPath);
  if (source?.sourceFile == null || source.evaluation == null) {
    throw new Error(`Expected evaluated source '${projectPath}'.`);
  }
  return source;
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
    writeFile(path.join(workspaceRoot, 'src', 'helper.ts'), [
      "import Aurelia from 'aurelia';",
      "import { BenchmarkApp } from './app';",
      '',
      'export function runApp(host: HTMLElement): void {',
      '  new Aurelia().app({ host, component: BenchmarkApp }).start();',
      '}',
    ].join('\n')),
    writeFile(path.join(workspaceRoot, 'src', 'app.ts'), [
      "import { CustomElement } from 'aurelia';",
      '',
      'export const BenchmarkApp = CustomElement.define({',
      "  name: 'benchmark-app',",
      "  template: '<template>benchmark</template>',",
      '});',
    ].join('\n')),
    writeFile(path.join(workspaceRoot, 'src', 'main.ts'), [
      "import { runApp } from './helper';",
      '',
      'export function start(host: HTMLElement, items: unknown[]): void {',
      '  if (Array.isArray(items)) {',
      '    runApp(host);',
      '  }',
      '}',
      '',
      'function localStart(host: HTMLElement): void {',
      '  runApp(host);',
      '}',
    ].join('\n')),
    writeFile(path.join(workspaceRoot, 'src', 'refusals.ts'), [
      "import Aurelia from 'aurelia';",
      "import { BenchmarkApp } from './app';",
      '',
      'export const notCallable = 42;',
      'export async function asyncStart(): Promise<void> {}',
      "export function abruptStart(): void { throw new Error('boom'); }",
      'export function conditionalStart(environment: { enabled: boolean }): void {',
      '  environment.enabled ? new Aurelia().app(BenchmarkApp).start() : undefined;',
      '}',
    ].join('\n')),
  ]);
}
