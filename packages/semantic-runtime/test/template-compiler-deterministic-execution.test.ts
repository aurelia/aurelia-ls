import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import {
  BrowserEffectiveTemplateMaterializer,
} from '../src/template/browser-effective-template-materializer.js';
import { parseBrowserTemplateFragmentDraft } from '../src/template/browser-template-parser.js';
import { selectBrowserTemplateCompilerCarrier } from '../src/template/browser-template-selection.js';
import {
  TemplateCompilerTargetContextRole,
} from '../src/template/compiler-target-plan.js';
import { CompiledTemplateState, TemplateRenderTargetKind } from '../src/template/compiled-template.js';
import { isLocalTemplateAuthoringIssueKind } from '../src/template/compiler-issue.js';
import { HtmlText } from '../src/template/html-ir.js';
import {
  HydrateElementInstruction,
  HydrateTemplateControllerInstruction,
} from '../src/template/instruction-ir.js';
import {
  executeDeterministicTemplateCompiler,
  TemplateCompilerDeterministicExecutionReasonKind,
  TemplateCompilerDeterministicExecutionState,
} from '../src/template/template-compiler-deterministic-execution.js';
import {
  TemplateCompilerCommentOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerGeneratedOccurrenceRole,
  TemplateCompilerTextOccurrence,
} from '../src/template/template-compiler-occurrence.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('deterministic template compiler structural replay', () => {
  test('replays the broad closed structural corridor over real normalized compiler products', async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-compiler-fidelity');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-compiler-deterministic-execution',
    });
    const app = await runtime.openApp({
      analysisDepth: 'runtime-topology',
      telemetry: { inquiryProfile: 'aot' },
    });
    const exactNames = [
      'static-context-probe',
      'static-projection-probe',
      'projection-whitespace-probe',
      'projection-explicit-slot-probe',
      'native-containerless-probe',
      'au-slot-removal-probe',
      'containerless-usage-probe',
      'slot-under-template-controller-probe',
    ] as const;
    const browserRun = runtime.computationLifecycle.begin({
      kind: 'template-compiler-deterministic-execution-test',
      reconciliationKey: 'template-compiler-deterministic-execution-test',
      summary: 'Materialize browser-effective inputs for deterministic compiler execution.',
    });

    try {
      const resources = new Map(app.emission.templates.resources.map((resource) => [
        resource.compilation.definition.name,
        resource.compilation,
      ]));
      const results = exactNames.map((name) => {
        const compilation = resources.get(name);
        if (compilation == null) throw new Error(`Expected compiler fixture resource '${name}'.`);
        const markup = compilation.unit.templateSource.markup;
        if (markup == null || compilation.html.draft == null) {
          throw new Error(`Compiler fixture resource '${name}' has no retained markup/draft authority.`);
        }
        const browser = parseBrowserTemplateFragmentDraft(markup);
        const browserTemplate = new BrowserEffectiveTemplateMaterializer(browserRun).materialize({
          localKey: `deterministic-execution:${name}`,
          sourceRevision: compilation.definition.template?.authoredSourceRevision ?? `test:${name}`,
          templateSource: compilation.unit.templateSource,
          authoredHtml: compilation.html,
          browser,
          carrierSelection: selectBrowserTemplateCompilerCarrier(browser.fragment),
        });
        return [name, executeDeterministicTemplateCompiler({
          browserTemplate,
          compilation,
        })] as const;
      });

      expect(results.map(([name, result]) => [name, result.state, result.reasons])).toEqual(
        exactNames.map((name) => [name, TemplateCompilerDeterministicExecutionState.Exact, []]),
      );
      for (const [, result] of results) {
        expect(result.structuralExecution).not.toBeNull();
        result.structuralExecution?.assertCoherent();
      }

      const contextResult = new Map(results).get('static-context-probe')!;
      expect(contextResult.structuralExecution?.readContexts().map((context) => context.role)).toEqual([
        TemplateCompilerTargetContextRole.Root,
        TemplateCompilerTargetContextRole.TemplateController,
      ]);
      expect(contextResult.forest.readNodes().filter((node) =>
        node instanceof TemplateCompilerCommentOccurrence && node.text === 'au-start'
      )).toHaveLength(1);

      const projectionResult = new Map(results).get('static-projection-probe')!;
      expect(projectionResult.structuralExecution?.readContexts().filter((context) =>
        context.role === TemplateCompilerTargetContextRole.Projection
      )).toHaveLength(2);
      expect(projectionResult.structuralExecution?.readConsumedNodeDispositions()).toHaveLength(1);

      const whitespaceResult = new Map(results).get('projection-whitespace-probe')!;
      expect(whitespaceResult.structuralExecution?.readConsumedNodeDispositions().some((disposition) =>
        disposition.node instanceof TemplateCompilerTextOccurrence
        && disposition.node.text.trim() === ''
      )).toBe(true);

      const explicitSlotResult = new Map(results).get('projection-explicit-slot-probe')!;
      expect(explicitSlotResult.structuralExecution?.readConsumedAttributeDispositions()).toHaveLength(2);

      const nativeContainerlessResult = new Map(results).get('native-containerless-probe')!;
      expect(nativeContainerlessResult.structuralExecution?.readConsumedAttributeDispositions()
        .map((disposition) => disposition.attribute.name)).toEqual([
          'containerless',
          'title.bind',
        ]);

      const auSlotResult = new Map(results).get('au-slot-removal-probe')!;
      expect(auSlotResult.structuralExecution?.readConsumedNodeDispositions().some((disposition) =>
        disposition.node instanceof TemplateCompilerElementOccurrence
        && disposition.node.tagName.toLowerCase() === 'div'
      )).toBe(true);
      expect(auSlotResult.structuralExecution?.readTargetGeometries(
        resources.get('au-slot-removal-probe')!.compiledTemplate.targetPlan.root,
      ).some((geometry) => geometry.row.targetKind === TemplateRenderTargetKind.RenderLocation)).toBe(true);

      const openCompilation = resources.get('template-compiler-fidelity-app');
      if (openCompilation == null) throw new Error('Expected open compiler fixture resource.');
      const openMarkup = openCompilation.unit.templateSource.markup!;
      const openBrowser = parseBrowserTemplateFragmentDraft(openMarkup);
      const openBrowserTemplate = new BrowserEffectiveTemplateMaterializer(browserRun).materialize({
        localKey: 'deterministic-execution:open',
        sourceRevision: openCompilation.definition.template?.authoredSourceRevision ?? 'test:open',
        templateSource: openCompilation.unit.templateSource,
        authoredHtml: openCompilation.html,
        browser: openBrowser,
        carrierSelection: selectBrowserTemplateCompilerCarrier(openBrowser.fragment),
      });
      const openResult = executeDeterministicTemplateCompiler({
        browserTemplate: openBrowserTemplate,
        compilation: openCompilation,
      });
      expect(openResult.state).toBe(TemplateCompilerDeterministicExecutionState.Open);
      expect(openResult.structuralExecution).toBeNull();
      expect(openResult.reasons.map((candidate) => candidate.reasonKind)).toContain(
        TemplateCompilerDeterministicExecutionReasonKind.CompilerEffectOpen,
      );

      const browserOwner = resources.get('static-context-probe')!;
      const foreignCompilation = resources.get('static-projection-probe')!;
      const browserOwnerMarkup = browserOwner.unit.templateSource.markup!;
      const browserOwnerDraft = parseBrowserTemplateFragmentDraft(browserOwnerMarkup);
      const foreignBrowserTemplate = new BrowserEffectiveTemplateMaterializer(browserRun).materialize({
        localKey: 'deterministic-execution:foreign-browser-family',
        sourceRevision: browserOwner.definition.template?.authoredSourceRevision ?? 'test:foreign-browser-family',
        templateSource: browserOwner.unit.templateSource,
        authoredHtml: browserOwner.html,
        browser: browserOwnerDraft,
        carrierSelection: selectBrowserTemplateCompilerCarrier(browserOwnerDraft.fragment),
      });
      const foreignResult = executeDeterministicTemplateCompiler({
        browserTemplate: foreignBrowserTemplate,
        compilation: foreignCompilation,
      });
      expect(foreignResult.state).toBe(TemplateCompilerDeterministicExecutionState.Open);
      expect(foreignResult.structuralExecution).toBeNull();
      expect(foreignResult.reasons.map((candidate) => candidate.reasonKind)).toContain(
        TemplateCompilerDeterministicExecutionReasonKind.ForeignCompilation,
      );

    } finally {
      browserRun.abort();
      runtime.retireWorkspaceIncarnation();
    }
  }, 15_000);

  test('expands every hole of one real text site into an independently targeted placeholder', async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/bindable-contracts-lab');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-compiler-deterministic-text-expansion',
    });
    const app = await runtime.openApp({
      analysisDepth: 'runtime-topology',
      telemetry: { inquiryProfile: 'aot' },
    });
    const compilation = app.emission.templates.resources.find((resource) =>
      resource.compilation.definition.name === 'profile-card'
    )?.compilation;
    if (compilation == null) throw new Error('Expected profile-card compiler products.');
    const markup = compilation.unit.templateSource.markup;
    if (markup == null || compilation.html.draft == null) {
      throw new Error('Expected retained profile-card markup and authored draft bindings.');
    }
    const browserRun = runtime.computationLifecycle.begin({
      kind: 'template-compiler-deterministic-text-test',
      reconciliationKey: 'template-compiler-deterministic-text-test',
      summary: 'Materialize the browser-effective multi-hole text input.',
    });
    try {
      const browser = parseBrowserTemplateFragmentDraft(markup);
      const browserTemplate = new BrowserEffectiveTemplateMaterializer(browserRun).materialize({
        localKey: 'deterministic-execution:profile-card',
        sourceRevision: compilation.definition.template?.authoredSourceRevision ?? 'test:profile-card',
        templateSource: compilation.unit.templateSource,
        authoredHtml: compilation.html,
        browser,
        carrierSelection: selectBrowserTemplateCompilerCarrier(browser.fragment),
      });
      const result = executeDeterministicTemplateCompiler({
        browserTemplate,
        compilation,
      });
      expect(result.state).toBe(TemplateCompilerDeterministicExecutionState.Exact);
      result.structuralExecution?.assertCoherent();

      const sourceText = compilation.html.nodes.find((node): node is HtmlText =>
        node instanceof HtmlText && node.text.includes('${normalizedLabel}')
      );
      if (sourceText == null) throw new Error('Expected authored multi-hole text source.');
      const placeholders = result.forest.readNodes().filter((node): node is TemplateCompilerTextOccurrence =>
        node instanceof TemplateCompilerTextOccurrence
        && node.generation?.role === TemplateCompilerGeneratedOccurrenceRole.BindingPlaceholder
        && result.forest.exactAuthoredNodeOrigin(node)?.authored.productHandle === sourceText.productHandle
      );
      expect(placeholders).toHaveLength(4);
      expect(placeholders.every((placeholder) => placeholder.text === ' ')).toBe(true);
      expect(result.structuralExecution?.readTargetGeometries(
        compilation.compiledTemplate.targetPlan.root,
      ).filter((geometry) => geometry.row.node.productHandle === sourceText.productHandle)).toHaveLength(4);
    } finally {
      browserRun.abort();
      runtime.retireWorkspaceIncarnation();
    }
  }, 15_000);

  test('keeps broad local-template authoring candidates Open until extraction reaches a refusal', async () => {
    const fixtureRoot = path.join(
      packageRoot,
      'fixtures/pressure/resource-registration-local-template-errors',
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-compiler-local-authoring-issue-bridge',
    });
    const app = await runtime.openApp({
      analysisDepth: 'runtime-topology',
      telemetry: { inquiryProfile: 'aot' },
    });
    const compilation = app.emission.templates.resources.find((resource) =>
      resource.compilation.definition.name === 'duplicate-local-bindable-attribute-case'
    )?.compilation;
    if (compilation == null) throw new Error('Expected duplicate local-bindable compiler products.');
    expect(compilation.compiledTemplate.compiledTemplate.state).toBe(CompiledTemplateState.Invalid);
    expect(compilation.compiledTemplate.issues.length).toBeGreaterThan(0);
    expect(compilation.compiledTemplate.issues.every((issue) =>
      isLocalTemplateAuthoringIssueKind(issue.issueKind)
    )).toBe(true);
    const markup = compilation.unit.templateSource.markup;
    if (markup == null || compilation.html.draft == null) {
      throw new Error('Expected retained local-template markup and authored draft bindings.');
    }
    const browserRun = runtime.computationLifecycle.begin({
      kind: 'template-compiler-local-authoring-issue-bridge-test',
      reconciliationKey: 'template-compiler-local-authoring-issue-bridge-test',
      summary: 'Prove broad local diagnostics do not masquerade as reached AOT refusal.',
    });
    try {
      const browser = parseBrowserTemplateFragmentDraft(markup);
      const browserTemplate = new BrowserEffectiveTemplateMaterializer(browserRun).materialize({
        localKey: 'deterministic-execution:local-authoring-issue-bridge',
        sourceRevision: compilation.definition.template?.authoredSourceRevision ?? 'test:local-authoring-issue',
        templateSource: compilation.unit.templateSource,
        authoredHtml: compilation.html,
        browser,
        carrierSelection: selectBrowserTemplateCompilerCarrier(browser.fragment),
      });
      const result = executeDeterministicTemplateCompiler({ browserTemplate, compilation });
      expect(result.state).toBe(TemplateCompilerDeterministicExecutionState.Open);
      expect(result.reasons).toEqual([
        expect.objectContaining({
          reasonKind: TemplateCompilerDeterministicExecutionReasonKind.LocalTemplateOpen,
        }),
      ]);
      expect(result.reasons.some((reason) =>
        reason.reasonKind === TemplateCompilerDeterministicExecutionReasonKind.CompilerRefused
      )).toBe(false);
    } finally {
      browserRun.abort();
      runtime.retireWorkspaceIncarnation();
    }
  }, 20_000);
});
