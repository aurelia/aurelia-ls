import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime, type SemanticApp } from '../src/api/runtime.js';
import type { KernelPublicationContext } from '../src/kernel/publication.js';
import { BrowserEffectiveTemplateMaterializer } from '../src/template/browser-effective-template-materializer.js';
import { parseBrowserTemplateFragmentDraft } from '../src/template/browser-template-parser.js';
import { selectBrowserTemplateCompilerCarrier } from '../src/template/browser-template-selection.js';
import {
  TemplateCompilerExecutionSession,
  TemplateCompilerHookOperationStage,
  TemplateCompilerHookOperationTarget,
  TemplateCompilerMutationBatchState,
  TemplateCompilerOperationCompletionKind,
} from '../src/template/template-compiler-execution.js';
import {
  executeTemplateCompilerHookBootstrap,
  TemplateCompilerHookBootstrapState,
} from '../src/template/template-compiler-hook-bootstrap.js';
import {
  TemplateCompilerElementOccurrence,
  TemplateCompilerOccurrenceForest,
} from '../src/template/template-compiler-occurrence.js';
import type { TemplateResourceCompilationEmission } from '../src/template/template-compilation-project-pass.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('template compiler hook bootstrap', () => {
  test('executes repeated CSS hooks across nested template content and stops before an open mapping', async () => {
    const workspaceRoot = await mkdtemp(path.join(packageRoot, '.template-compiler-hook-bootstrap-'));
    try {
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
          "import { Registration } from '@aurelia/kernel';",
          "import { Aurelia, cssModules, customElement, StandardConfiguration } from '@aurelia/runtime-html';",
          "import { ITemplateCompilerHooks, TemplateCompilerHooks } from '@aurelia/template-compiler';",
          "import generatedClasses from './classes.module.css';",
          '',
          '@customElement({',
          "  name: 'exact-css-host',",
          '  template: `<section class="a"><template><span class="a b stable"></span></template><div class=" a "></div></section>`,',
          "  dependencies: [cssModules({ a: 'b' }), cssModules({ b: 'c' })],",
          '})',
          'class ExactCssHost {}',
          '',
          '@customElement({',
          "  name: 'open-css-host',",
          "  template: '<div class=\"generated stable\"></div>',",
          '  dependencies: [cssModules(generatedClasses)],',
          '})',
          'class OpenCssHost {}',
          '',
          'class ProviderHook { compiling(): void {} }',
          '',
          '@customElement({',
          "  name: 'provider-open-host',",
          "  template: '<div class=\"a\"></div>',",
          "  dependencies: [cssModules({ a: 'mapped' }), TemplateCompilerHooks.define(ProviderHook)],",
          '})',
          'class ProviderOpenHost {}',
          '',
          '@customElement({',
          "  name: 'hook-bootstrap-app',",
          "  template: '<exact-css-host></exact-css-host><open-css-host></open-css-host><provider-open-host></provider-open-host>',",
          '  dependencies: [ExactCssHost, OpenCssHost, ProviderOpenHost],',
          '})',
          'class HookBootstrapApp {}',
          '',
          'new Aurelia()',
          '  .register(',
          '    StandardConfiguration,',
          '    Registration.instance(ITemplateCompilerHooks, {}),',
          '  )',
          '  .app({ host: document.body, component: HookBootstrapApp });',
        ].join('\n'),
        'src/classes.module.css': '.generated { color: rebeccapurple; }\n',
        'src/style-assets.d.ts': [
          "declare module '*.module.css' {",
          '  const classes: Record<string, string>;',
          '  export default classes;',
          '}',
        ].join('\n'),
      });
      const runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: `test:template-compiler-hook-bootstrap:${path.basename(workspaceRoot)}`,
      });
      try {
        const app = await runtime.openApp({
          analysisDepth: 'runtime-topology',
          telemetry: { inquiryProfile: 'aot' },
        });
        const exactCompilation = requireCompilation(app, 'exact-css-host');
        const openCompilation = requireCompilation(app, 'open-css-host');
        const providerOpenCompilation = requireCompilation(app, 'provider-open-host');
        const browserRun = runtime.computationLifecycle.begin({
          kind: 'template-compiler-hook-bootstrap-test',
          reconciliationKey: 'template-compiler-hook-bootstrap-test',
          summary: 'Execute exact and open compiler-hook bootstrap worlds.',
        });
        try {
          const exact = executeHookBootstrap(browserRun, exactCompilation, 'exact');
          expect(exact.result.state).toBe(TemplateCompilerHookBootstrapState.Exact);
          expect(exact.result.compilerWorld).toBe(exactCompilation.compilerWorld);
          expect(exact.result.boundaryEntryOrdinal).toBeNull();
          expect(exact.result.operations.map((operation) => ({
            stage: (operation.target as TemplateCompilerHookOperationTarget).operationStage,
            completion: operation.completion.completionKind,
            mutations: operation.mutationBatch.attributeValueMutations.length,
          }))).toEqual([
            {
              stage: TemplateCompilerHookOperationStage.HookSetResolution,
              completion: TemplateCompilerOperationCompletionKind.Complete,
              mutations: 0,
            },
            {
              stage: TemplateCompilerHookOperationStage.Invocation,
              completion: TemplateCompilerOperationCompletionKind.Complete,
              mutations: 3,
            },
            {
              stage: TemplateCompilerHookOperationStage.Invocation,
              completion: TemplateCompilerOperationCompletionKind.Complete,
              mutations: 3,
            },
            {
              stage: TemplateCompilerHookOperationStage.CallableInspection,
              completion: TemplateCompilerOperationCompletionKind.Complete,
              mutations: 0,
            },
          ]);
          expect(classValuesByTag(exact.forest)).toEqual({
            section: ['c'],
            span: ['c c stable'],
            div: [' c '],
          });
          expect(exact.result.operations.every((operation) =>
            operation.mutationBatch.state === TemplateCompilerMutationBatchState.Committed
          )).toBe(true);

          const open = executeHookBootstrap(browserRun, openCompilation, 'open');
          expect(open.result.compilerWorld).toBe(openCompilation.compilerWorld);
          expect(open.result).toMatchObject({
            state: TemplateCompilerHookBootstrapState.Open,
            boundaryEntryOrdinal: 0,
            summary: expect.stringContaining("class 'generated' remains open"),
          });
          expect(open.result.operations.map((operation) => ({
            stage: (operation.target as TemplateCompilerHookOperationTarget).operationStage,
            completion: operation.completion.completionKind,
            batch: operation.mutationBatch.state,
          }))).toEqual([
            {
              stage: TemplateCompilerHookOperationStage.HookSetResolution,
              completion: TemplateCompilerOperationCompletionKind.Complete,
              batch: TemplateCompilerMutationBatchState.Committed,
            },
            {
              stage: TemplateCompilerHookOperationStage.Invocation,
              completion: TemplateCompilerOperationCompletionKind.Open,
              batch: TemplateCompilerMutationBatchState.Discarded,
            },
          ]);
          expect(classValuesByTag(open.forest)).toEqual({ div: ['generated stable'] });
          expect(open.execution.seal()).toBe(open.execution.sequence);

          const providerOpen = executeHookBootstrap(browserRun, providerOpenCompilation, 'provider-open');
          expect(providerOpen.result.compilerWorld).toBe(providerOpenCompilation.compilerWorld);
          expect(providerOpen.result).toMatchObject({
            state: TemplateCompilerHookBootstrapState.Open,
            boundaryEntryOrdinal: 1,
            summary: expect.stringContaining('provider construction'),
          });
          expect(providerOpen.result.operations).toHaveLength(1);
          expect(providerOpen.result.operations[0]?.target).toMatchObject({
            operationStage: TemplateCompilerHookOperationStage.ProviderResolution,
            entryOrdinal: 1,
          });
          expect(classValuesByTag(providerOpen.forest)).toEqual({ div: ['a'] });
          expect(providerOpen.execution.seal()).toBe(providerOpen.execution.sequence);
        } finally {
          browserRun.abort();
        }
      } finally {
        runtime.retireWorkspaceIncarnation();
      }
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test('commits leaf built-ins before the first receiver-bearing root hook execution boundary', async () => {
    const workspaceRoot = await mkdtemp(path.join(packageRoot, '.template-compiler-root-hook-bootstrap-'));
    try {
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
          "import { Aurelia, cssModules, customElement, StandardConfiguration } from '@aurelia/runtime-html';",
          "import { TemplateCompilerHooks } from '@aurelia/template-compiler';",
          '',
          'class RootHook { compiling(): void {} }',
          '',
          '@customElement({',
          "  name: 'root-hook-css-host',",
          "  template: '<div class=\"a\"></div>',",
          "  dependencies: [cssModules({ a: 'b' }), cssModules({ b: 'c' })],",
          '})',
          'class RootHookCssHost {}',
          '',
          '@customElement({',
          "  name: 'root-hook-app',",
          "  template: '<root-hook-css-host></root-hook-css-host>',",
          '  dependencies: [RootHookCssHost],',
          '})',
          'class RootHookApp {}',
          '',
          'new Aurelia()',
          '  .register(StandardConfiguration, TemplateCompilerHooks.define(RootHook))',
          '  .app({ host: document.body, component: RootHookApp });',
        ].join('\n'),
      });
      const runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: `test:template-compiler-root-hook-bootstrap:${path.basename(workspaceRoot)}`,
      });
      try {
        const app = await runtime.openApp({
          analysisDepth: 'runtime-topology',
          telemetry: { inquiryProfile: 'aot' },
        });
        const compilation = requireCompilation(app, 'root-hook-css-host');
        const browserRun = runtime.computationLifecycle.begin({
          kind: 'template-compiler-root-hook-bootstrap-test',
          reconciliationKey: 'template-compiler-root-hook-bootstrap-test',
          summary: 'Retain the exact CSS prefix before a root static-callable hook boundary.',
        });
        try {
          const execution = executeHookBootstrap(browserRun, compilation, 'root-static');
          expect(execution.result.compilerWorld).toBe(compilation.compilerWorld);
          expect(execution.result).toMatchObject({
            state: TemplateCompilerHookBootstrapState.Open,
            boundaryEntryOrdinal: 2,
            summary: expect.stringContaining('no compiler-DOM execution host'),
          });
          expect(execution.result.operations.map((operation) => ({
            stage: (operation.target as TemplateCompilerHookOperationTarget).operationStage,
            completion: operation.completion.completionKind,
            batch: operation.mutationBatch.state,
          }))).toEqual([
            {
              stage: TemplateCompilerHookOperationStage.HookSetResolution,
              completion: TemplateCompilerOperationCompletionKind.Complete,
              batch: TemplateCompilerMutationBatchState.Committed,
            },
            {
              stage: TemplateCompilerHookOperationStage.Invocation,
              completion: TemplateCompilerOperationCompletionKind.Complete,
              batch: TemplateCompilerMutationBatchState.Committed,
            },
            {
              stage: TemplateCompilerHookOperationStage.Invocation,
              completion: TemplateCompilerOperationCompletionKind.Complete,
              batch: TemplateCompilerMutationBatchState.Committed,
            },
            {
              stage: TemplateCompilerHookOperationStage.Invocation,
              completion: TemplateCompilerOperationCompletionKind.Open,
              batch: TemplateCompilerMutationBatchState.Discarded,
            },
          ]);
          expect(classValuesByTag(execution.forest)).toEqual({ div: ['c'] });
          expect(execution.execution.seal()).toBe(execution.execution.sequence);
        } finally {
          browserRun.abort();
        }
      } finally {
        runtime.retireWorkspaceIncarnation();
      }
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  }, 30_000);
});

function executeHookBootstrap(
  browserRun: KernelPublicationContext,
  compilation: TemplateResourceCompilationEmission,
  localKey: string,
) {
  const markup = compilation.unit.templateSource.markup;
  if (markup == null || compilation.html.draft == null) {
    throw new Error(`Expected hook-bootstrap markup/draft for '${compilation.definition.name}'.`);
  }
  const browser = parseBrowserTemplateFragmentDraft(markup);
  const browserTemplate = new BrowserEffectiveTemplateMaterializer(browserRun).materialize({
    localKey: `hook-bootstrap:${localKey}`,
    sourceRevision: compilation.definition.template?.authoredSourceRevision ?? `test:${localKey}`,
    templateSource: compilation.unit.templateSource,
    authoredHtml: compilation.html,
    browser,
    carrierSelection: selectBrowserTemplateCompilerCarrier(browser.fragment),
  });
  const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(browserTemplate);
  const execution = TemplateCompilerExecutionSession.createForForest(`hook-bootstrap:${localKey}:family`, forest);
  const lane = execution.admitRootInvocation(`hook-bootstrap:${localKey}:lane`);
  const result = executeTemplateCompilerHookBootstrap({
    execution,
    lane,
    compilerWorld: compilation.compilerWorld,
    executionOpenSeamHandle: browserRun.handles.openSeam(`hook-bootstrap:${localKey}:execution-open`),
  });
  return { forest, execution, lane, result };
}

function classValuesByTag(
  forest: TemplateCompilerOccurrenceForest,
): Readonly<Record<string, readonly string[]>> {
  const result: Record<string, string[]> = {};
  for (const node of forest.readNodes()) {
    if (!(node instanceof TemplateCompilerElementOccurrence)) continue;
    const classAttribute = node.readAttributes().find((attribute) => attribute.name === 'class') ?? null;
    if (classAttribute == null) continue;
    (result[node.tagName] ??= []).push(classAttribute.value);
  }
  return result;
}

function requireCompilation(
  app: SemanticApp,
  name: string,
): TemplateResourceCompilationEmission {
  const compilation = app.emission.templates.resources.find((resource) =>
    resource.compilation.definition.name === name
  )?.compilation ?? null;
  if (compilation == null) throw new Error(`Expected template compilation '${name}'.`);
  return compilation;
}

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
