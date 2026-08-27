import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime, type SemanticApp, type SemanticRuntime } from '../src/api/runtime.js';
import { SourceSpanAddress } from '../src/kernel/address.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
} from '../src/kernel/project-input.js';
import {
  TemplateCompilerIssueKind,
  TemplateCompilerIssuePhase,
  type TemplateCompilerIssue,
} from '../src/template/compiler-issue.js';
import { HtmlComment, HtmlCommentSemanticKind } from '../src/template/html-ir.js';
import { TemplateProductDetails } from '../src/template/product-details.js';
import {
  buildTemplateCompilerNormalizedSiteIndex,
  TemplateCompilerNormalizedSiteIndexState,
} from '../src/template/template-compiler-normalized-site-index.js';
import type { TemplateResourceCompilationEmission } from '../src/template/template-compilation-project-pass.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-minimal-app');
const templateFileName = path.join(fixtureRoot, 'src/app.html');

const initialTemplate = `<section>
  <!--au-->
  <!-- au -->
  <!--au-start-->
  <!--au-end-->
  <!--aU-->
  <p>\${message}</p>
  <template><div><!--au--></div></template>
</section>`;

describe('authored compiler marker diagnostics', () => {
  test('publishes exact broad issues and replaces them with the current authored inventory', async () => {
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(templateFileName, initialTemplate);
    const inputAuthority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:authored-compiler-marker',
      projectInputAuthority: inputAuthority,
    });

    try {
      const baseline = await runtime.openApp();
      const baselineCompilation = rootCompilation(baseline);
      const baselineIssues = markerIssues(baselineCompilation);
      const exactComments = baselineCompilation.html.nodes.filter((node): node is HtmlComment =>
        node instanceof HtmlComment
          && node.semanticKind === HtmlCommentSemanticKind.Plain
          && node.text === 'au'
      );

      expect(exactComments).toHaveLength(2);
      expect(baselineIssues).toHaveLength(2);
      expect(new Set(baselineIssues.map((issue) => issue.productHandle)).size).toBe(2);
      expect(new Set(baselineIssues.map((issue) => issue.sourceAddressHandle))).toEqual(
        new Set(exactComments.map((comment) => comment.sourceAddressHandle)),
      );
      expect(baselineIssues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          phase: TemplateCompilerIssuePhase.CompiledTemplate,
          issueKind: TemplateCompilerIssueKind.AuthoredCompilerMarker,
          frameworkErrorCode: null,
          severity: 'error',
        }),
      ]));
      expect(issueSourceTexts(runtime, initialTemplate, baselineIssues)).toEqual([
        '<!--au-->',
        '<!--au-->',
      ]);
      const normalized = buildTemplateCompilerNormalizedSiteIndex(baselineCompilation);
      expect(normalized.state).toBe(TemplateCompilerNormalizedSiteIndexState.GraphExact);
      expect(normalized.index?.outcomes.issues.filter((issue) =>
        issue.issueKind === TemplateCompilerIssueKind.AuthoredCompilerMarker
      )).toEqual(baselineIssues);
      expect(baselineCompilation.html.nodes.filter((node): node is HtmlComment =>
        node instanceof HtmlComment && node.text !== 'au'
      ).map((comment) => comment.text)).toEqual(expect.arrayContaining([
        ' au ',
        'au-start',
        'au-end',
        'aU',
      ]));

      const topLevelIssue = baselineIssues.find((issue) =>
        sourceText(runtime, initialTemplate, issue) === '<!--au-->'
        && sourceSpan(runtime, issue)?.start === initialTemplate.indexOf('<!--au-->')
      );
      const nestedIssue = baselineIssues.find((issue) => issue !== topLevelIssue);
      if (topLevelIssue == null || nestedIssue == null) throw new Error('Expected top-level and nested marker issues.');

      const changedTemplate = initialTemplate.replace('<!--au-->', '<!--not-au-->');
      overlay.write(templateFileName, changedTemplate);
      inputAuthority.advance();
      const changed = await runtime.openApp({ projectKey: baseline.project.projectKey });
      const changedIssues = markerIssues(rootCompilation(changed));

      expect(changedIssues).toHaveLength(1);
      expect(changedIssues[0]?.productHandle).toBe(nestedIssue.productHandle);
      expect(issueSourceTexts(runtime, changedTemplate, changedIssues)).toEqual(['<!--au-->']);
      expect(runtime.workspace.store.productDetails.read(
        TemplateProductDetails.CompilerIssue,
        topLevelIssue.productHandle,
      )).toBeNull();
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 30_000);
});

function rootCompilation(app: SemanticApp): TemplateResourceCompilationEmission {
  const compilation = app.emission.templates.resources.find((resource) =>
    resource.compilation.definition.name === 'app-root'
  )?.compilation;
  if (compilation == null) throw new Error('Expected app-root compilation.');
  return compilation;
}

function markerIssues(compilation: TemplateResourceCompilationEmission): readonly TemplateCompilerIssue[] {
  return compilation.compiledTemplate.issues.filter((issue) =>
    issue.issueKind === TemplateCompilerIssueKind.AuthoredCompilerMarker
  );
}

function issueSourceTexts(
  runtime: SemanticRuntime,
  template: string,
  issues: readonly TemplateCompilerIssue[],
): readonly string[] {
  return issues.map((issue) => sourceText(runtime, template, issue));
}

function sourceText(
  runtime: SemanticRuntime,
  template: string,
  issue: TemplateCompilerIssue,
): string {
  const span = sourceSpan(runtime, issue);
  if (span == null) throw new Error('Expected compiler issue source span.');
  return template.slice(span.start, span.end);
}

function sourceSpan(
  runtime: SemanticRuntime,
  issue: TemplateCompilerIssue,
): SourceSpanAddress | null {
  const address = issue.sourceAddressHandle == null
    ? null
    : runtime.workspace.store.read(issue.sourceAddressHandle);
  return address instanceof SourceSpanAddress ? address : null;
}
