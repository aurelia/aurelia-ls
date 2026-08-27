import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { ComputationCommitState } from '../src/kernel/computation-lifecycle.js';
import {
  BrowserEffectiveTemplateMaterializer,
} from '../src/template/browser-effective-template-materializer.js';
import { parseBrowserTemplateFragmentDraft } from '../src/template/browser-template-parser.js';
import { selectBrowserTemplateCompilerCarrier } from '../src/template/browser-template-selection.js';
import {
  TemplateCompilationUnitKind,
  TemplateSourceKind,
} from '../src/template/compilation-unit.js';
import {
  TemplateCompilationIngressPreparationRequest,
  TemplateCompilationUnitCompletionRequest,
  TemplateCompilationUnitConstructionRequest,
  TemplateCompilationUnitMaterializer,
} from '../src/template/compilation-unit-materializer.js';
import { HtmlParseMaterializer } from '../src/template/html-parse-materializer.js';
import { TemplateProductDetails } from '../src/template/product-details.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-minimal-app');

describe('template compilation ingress', () => {
  test('feeds authored and browser parsing before publishing the unchanged complete unit closure', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'test:template-compilation-ingress:prepared-browser',
    });
    const app = await runtime.openApp();
    const compilerWorld = app.emission.appWorld.compilerWorlds[0];
    if (compilerWorld == null) throw new Error('Expected one compiler world for ingress characterization.');

    const localKey = 'test:template-compilation-ingress:unit';
    const markup = '<table><tr><td>${message}</td></tr></table>';
    const legacyRun = runtime.computationLifecycle.begin({
      kind: 'template-compilation-ingress-legacy',
      reconciliationKey: 'template-compilation-ingress-legacy',
      summary: 'Capture the existing combined compilation-unit closure.',
    });
    const legacy = new TemplateCompilationUnitMaterializer(legacyRun).construct(
      new TemplateCompilationUnitConstructionRequest(
        localKey,
        TemplateCompilationUnitKind.CustomElement,
        compilerWorld,
        null,
        TemplateSourceKind.Markup,
        markup,
        null,
        null,
        ['local-card'],
        [],
      ),
    );
    const legacyRecordClosure = recordClosure(legacy.records);
    legacyRun.abort();

    const preparedRun = runtime.computationLifecycle.begin({
      kind: 'template-compilation-ingress-prepared',
      reconciliationKey: 'template-compilation-ingress-prepared',
      summary: 'Stage browser products before completing the compilation unit.',
    });
    const preparedRecordCount = preparedRun.readKernelCountSnapshot().totalRecords;
    const units = new TemplateCompilationUnitMaterializer(preparedRun);
    const ingress = units.prepareIngress(new TemplateCompilationIngressPreparationRequest(
      localKey,
      TemplateCompilationUnitKind.CustomElement,
      null,
      TemplateSourceKind.Markup,
      markup,
      null,
      null,
    ));
    expect(preparedRun.readKernelCountSnapshot().totalRecords).toBe(preparedRecordCount);
    expect(ingress.templateSource.productHandle).toBe(legacy.templateSource.productHandle);
    expect(ingress.parseContext.productHandle).toBe(legacy.parseContext.productHandle);

    const authoredHtml = new HtmlParseMaterializer(preparedRun).parse({
      localKey: `${localKey}:authored-html`,
      templateSource: ingress.templateSource,
      compilationUnit: ingress,
      parseContext: ingress.parseContext,
      retainDraftBindings: true,
    });
    if (authoredHtml.draft == null) throw new Error('Expected retained authored draft bindings.');
    const browser = parseBrowserTemplateFragmentDraft(markup);
    const browserTemplate = new BrowserEffectiveTemplateMaterializer(preparedRun).materialize({
      localKey: `${localKey}:browser`,
      sourceRevision: 'test:template-compilation-ingress:v1',
      templateSource: ingress.templateSource,
      authoredHtml,
      browser,
      carrierSelection: selectBrowserTemplateCompilerCarrier(browser.fragment),
    });
    const completed = units.constructPrepared(ingress, new TemplateCompilationUnitCompletionRequest(
      compilerWorld,
      ['local-card'],
      [],
    ));

    expect(recordClosure(completed.records)).toEqual(legacyRecordClosure);
    expect(completed.templateSource).toBe(ingress.templateSource);
    expect(completed.parseContext).toBe(ingress.parseContext);
    expect(completed.compilationUnit.productHandle).toBe(legacy.compilationUnit.productHandle);
    expect(completed.rootContext.productHandle).toBe(legacy.rootContext.productHandle);
    expect(browserTemplate.tree.templateSource.productHandle).toBe(completed.templateSource.productHandle);
    expect(() => units.constructPrepared(
      ingress,
      new TemplateCompilationUnitCompletionRequest(compilerWorld, [], []),
    )).toThrow(/already completed/);

    const commit = preparedRun.commit();
    expect(commit.state).toBe(ComputationCommitState.Committed);
    expect(runtime.workspace.store.readProductDetail(
      TemplateProductDetails.Source,
      completed.templateSource.productHandle,
    )).toBe(completed.templateSource);
    expect(runtime.workspace.store.readProductDetail(
      TemplateProductDetails.CompilationUnit,
      completed.compilationUnit.productHandle,
    )).toBe(completed.compilationUnit);
    expect(runtime.workspace.store.readProductDetail(
      TemplateProductDetails.StructuralTree,
      browserTemplate.tree.productHandle,
    )).toBe(browserTemplate.tree);
  }, 30_000);

  test('does not publish preparation state and rejects completion after its computation is superseded', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'test:template-compilation-ingress:currentness',
    });
    const app = await runtime.openApp();
    const compilerWorld = app.emission.appWorld.compilerWorlds[0];
    if (compilerWorld == null) throw new Error('Expected one compiler world for ingress currentness.');
    const baselineRecords = runtime.workspace.store.readAllRecords().length;
    const locus = {
      kind: 'template-compilation-ingress-currentness',
      reconciliationKey: 'template-compilation-ingress-currentness',
      summary: 'Prepared compilation ingress currentness.',
    };
    const staleRun = runtime.computationLifecycle.begin(locus);
    const units = new TemplateCompilationUnitMaterializer(staleRun);
    const ingress = units.prepareIngress(new TemplateCompilationIngressPreparationRequest(
      'test:template-compilation-ingress:stale',
      TemplateCompilationUnitKind.CustomElement,
      null,
      TemplateSourceKind.Markup,
      '<div></div>',
      null,
      null,
    ));
    const replacementRun = runtime.computationLifecycle.begin(locus);

    expect(() => units.constructPrepared(
      ingress,
      new TemplateCompilationUnitCompletionRequest(compilerWorld, [], []),
    )).toThrow(/superseded/);
    staleRun.abort();
    replacementRun.abort();
    expect(runtime.workspace.store.readAllRecords()).toHaveLength(baselineRecords);
  }, 30_000);
});

function recordClosure(records: readonly { readonly kind: string; readonly handle: string }[]): readonly string[] {
  return records.map((record) => `${record.kind}:${record.handle}`);
}
