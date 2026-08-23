import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test } from 'vitest';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  type SemanticAppDiagnosticRow,
} from '../src/index.js';
import {
  MAX_HTML_ELEMENT_NESTING_DEPTH,
  parseHtmlDocumentDraft,
  type ParsedHtmlNodeDraft,
} from '../src/template/html-parse-materializer.js';
import {
  HtmlAttribute,
  HtmlDoctype,
  HtmlDocument,
  HtmlElement,
  HtmlRecoveryKind,
} from '../src/template/html-ir.js';
import { KernelVocabulary } from '../src/kernel/vocabulary.js';
import { KernelPublicationSurface } from '../src/kernel/publication-surface.js';
import { TemplateProductDetails } from '../src/template/product-details.js';
import { TemplateRecoveryPolicy } from '../src/template/parse-context.js';

const repoRoot = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const helloWorldFixture = path.join(repoRoot, 'fixtures/hello-world');
const i18nBindingErrorsFixture = path.join(
  repoRoot,
  'packages/semantic-runtime/fixtures/pressure/i18n-translation-binding-errors',
);
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('HTML recovery diagnostics', () => {
  test('returns an ancestor closing tag to its owner instead of cascading missing tags', () => {
    const markup = '<div><span></div>';
    const draft = parseHtmlDocumentDraft(markup, TemplateRecoveryPolicy.Strict);

    expect(draftRecoveries(draft.rootNodes, draft.recoveries)).toEqual([{
      recoveryKind: HtmlRecoveryKind.MissingEndTag,
      summary: 'Missing closing tag </span>.',
      start: markup.indexOf('span'),
      end: markup.indexOf('span') + 'span'.length,
    }]);
    expect(draftRecoveries(
      parseHtmlDocumentDraft('${left < right}', TemplateRecoveryPolicy.Strict).rootNodes,
      [],
    )).toEqual([]);
  });

  test.each([
    ['script', "if(a<b){run('<fake>')}"] as const,
    ['style', '.a{--probe:<fake>}'] as const,
    ['title', 'before <fake> after'] as const,
    ['textarea', 'before <fake> after'] as const,
  ])('keeps <%s> raw text in one child and preserves the following sibling', (tagName, content) => {
    const draft = parseHtmlDocumentDraft(
      `<${tagName}>${content}</${tagName}><div></div>`,
      TemplateRecoveryPolicy.Strict,
    );

    expect(draft.recoveries).toEqual([]);
    expect(draft.rootNodes).toHaveLength(2);
    expect(draft.rootNodes[0]).toMatchObject({
      tagName,
      recoveries: [],
      children: [{ text: content, recoveries: [] }],
    });
    expect(draft.rootNodes[1]).toMatchObject({ tagName: 'div', recoveries: [] });
  });

  test('bounds pathological element nesting as one source-backed recovery', async () => {
    const exactMarkup = nestedElementSpine(MAX_HTML_ELEMENT_NESTING_DEPTH);
    const exact = await openRecoveryApp(exactMarkup);
    const exactHtml = exact.app.emission.templates.resources[0]!.compilation.html;
    expect(exactHtml.nodes.filter((node) => node instanceof HtmlElement && node.tagName === 'div'))
      .toHaveLength(MAX_HTML_ELEMENT_NESTING_DEPTH);
    expect(exactHtml.recoveries.filter((recovery) =>
      recovery.recoveryKind === HtmlRecoveryKind.NestingLimitExceeded
    )).toEqual([]);

    const prefix = [
      '<template as-custom-element="ignored-prefix"><span></span></template>',
      '<p>${missingPrefix}</p>',
    ].join('');
    const ignoredLocalTemplate = '<template as-custom-element="ignored-tail"><span></span></template>';
    const pathologicalDepth = 2_048;
    const pathologicalMarkup = [
      prefix,
      '<div>'.repeat(pathologicalDepth),
      ignoredLocalTemplate,
      '</div>'.repeat(pathologicalDepth),
    ].join('');
    const pathological = await openRecoveryApp(pathologicalMarkup);
    const html = pathological.app.emission.templates.resources[0]!.compilation.html;
    const nestingRecoveries = html.recoveries.filter((recovery) =>
      recovery.recoveryKind === HtmlRecoveryKind.NestingLimitExceeded
    );
    expect(html.nodes.filter((node) => node instanceof HtmlElement && node.tagName === 'div'))
      .toHaveLength(MAX_HTML_ELEMENT_NESTING_DEPTH);
    expect(nestingRecoveries).toHaveLength(1);
    expect(html.recoveries.some((recovery) => recovery.recoveryKind === HtmlRecoveryKind.MissingEndTag))
      .toBe(false);
    const compiledResourceNames = [
      ...pathological.app.emission.templates.resources,
      ...pathological.app.emission.templates.authoringResources,
    ].map((resource) => resource.compilation.definition.name);
    expect(compiledResourceNames).not.toContain('ignored-prefix');
    expect(compiledResourceNames).not.toContain('ignored-tail');

    const diagnostics = pathological.app.ask({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      sourceFile: { filePath: 'src/my-app.html' },
      page: { size: 300 },
    }).value.rows;
    const nestingDiagnostics = diagnostics.filter((row) =>
      row.missingInput === `html-recovery:${HtmlRecoveryKind.NestingLimitExceeded}`
    );
    const expectedNameStart = prefix.length + '<div>'.length * MAX_HTML_ELEMENT_NESTING_DEPTH + 1;
    expect(nestingDiagnostics).toEqual([
      expect.objectContaining({
        diagnosticKind: 'html-syntax-recovery',
        severity: 'error',
        source: expect.objectContaining({
          start: expectedNameStart,
          end: expectedNameStart + 'div'.length,
        }),
        suggestion: expect.objectContaining({
          suggestionKind: 'fix-template-syntax',
          actionKind: 'rewrite-template-syntax',
          summary: expect.stringMatching(/reduce element nesting.*extract nested markup into a child component/iu),
        }),
      }),
    ]);
    expect(diagnostics.some((row) => row.selectedMemberName === 'missingPrefix')).toBe(true);
  }, 30_000);

  test.each([
    {
      label: 'mismatched HTML tag',
      markup: '<template><div><span></div></template>',
      missingInput: `html-recovery:${HtmlRecoveryKind.MissingEndTag}`,
      sourceToken: 'span',
      severity: 'warning',
    },
    {
      label: 'unexpected closing tag',
      markup: '<template></orphan><div></div></template>',
      missingInput: `html-recovery:${HtmlRecoveryKind.UnexpectedEndTag}`,
      sourceToken: 'orphan',
      severity: 'error',
    },
    {
      label: 'empty closing tag',
      markup: '<template></><div></div></template>',
      missingInput: `html-recovery:${HtmlRecoveryKind.UnexpectedEndTag}`,
      sourceToken: '</>',
      severity: 'error',
    },
    {
      label: 'unterminated start tag',
      markup: '<template><section',
      missingInput: `html-recovery:${HtmlRecoveryKind.UnterminatedStartTag}`,
      sourceToken: '<section',
      severity: 'error',
    },
    {
      label: 'unterminated start tag with trailing whitespace',
      markup: '<template><section \n',
      missingInput: `html-recovery:${HtmlRecoveryKind.UnterminatedStartTag}`,
      sourceToken: '<section \n',
      severity: 'error',
    },
    {
      label: 'bare markup opener inside an attribute name',
      markup: '<template><div <span></div></template>',
      missingInput: `html-recovery:${HtmlRecoveryKind.InvalidAttribute}`,
      sourceToken: '<',
      sourceMarker: ' <span',
      sourceMarkerOffset: 1,
      severity: 'error',
    },
    {
      label: 'markup opener inside an attribute name',
      markup: '<template><div title="x" <span></span></div></template>',
      missingInput: `html-recovery:${HtmlRecoveryKind.InvalidAttribute}`,
      sourceToken: '<',
      sourceMarker: ' <span',
      sourceMarkerOffset: 1,
      severity: 'error',
    },
    {
      label: 'unterminated end tag',
      markup: '<template><section></section></template',
      missingInput: `html-recovery:${HtmlRecoveryKind.UnterminatedEndTag}`,
      sourceToken: '</template',
      severity: 'error',
    },
    {
      label: 'empty unterminated closing tag',
      markup: '<template><div></',
      missingInput: `html-recovery:${HtmlRecoveryKind.UnterminatedEndTag}`,
      sourceToken: '</',
      severity: 'error',
    },
    {
      label: 'self-closing non-void HTML element',
      markup: '<template><my-card/><span></span></template>',
      missingInput: `html-recovery:${HtmlRecoveryKind.NonVoidSelfClosing}`,
      sourceToken: '/>',
      severity: 'warning',
    },
    {
      label: 'duplicate mixed-case attribute',
      markup: '<template><div title.bind="heading" TITLE.BIND="missingMember"></div></template>',
      missingInput: `html-recovery:${HtmlRecoveryKind.DuplicateAttribute}`,
      sourceToken: 'TITLE.BIND',
      severity: 'warning',
    },
    {
      label: 'missing attribute value',
      markup: '<template><div title.bind=></div></template>',
      missingInput: `html-recovery:${HtmlRecoveryKind.MissingAttributeValue}`,
      sourceToken: '=',
      severity: 'error',
    },
    {
      label: 'invalid attribute name',
      markup: '<template><div =value></div></template>',
      missingInput: `html-recovery:${HtmlRecoveryKind.InvalidAttribute}`,
      sourceToken: '=',
      severity: 'error',
    },
    {
      label: 'quote inside an attribute name',
      markup: '<template><div bad"name></div></template>',
      missingInput: `html-recovery:${HtmlRecoveryKind.InvalidAttribute}`,
      sourceToken: '"',
      severity: 'error',
    },
    {
      label: 'backtick inside an attribute name',
      markup: '<template><div bad`name></div></template>',
      missingInput: `html-recovery:${HtmlRecoveryKind.InvalidAttribute}`,
      sourceToken: '`',
      severity: 'error',
    },
    {
      label: 'NUL inside an attribute name',
      markup: '<template><div bad\0name></div></template>',
      missingInput: `html-recovery:${HtmlRecoveryKind.InvalidAttribute}`,
      sourceToken: '\0',
      severity: 'error',
    },
    {
      label: 'unterminated quote',
      markup: '<template><div title.bind="missingMember></div></template>',
      missingInput: `html-recovery:${HtmlRecoveryKind.UnterminatedAttribute}`,
      sourceToken: '"missingMember></div></template>',
      severity: 'error',
    },
    {
      label: 'unterminated comment',
      markup: '<template><div><!-- open comment</div></template>',
      missingInput: `html-recovery:${HtmlRecoveryKind.UnterminatedComment}`,
      sourceToken: '<!-- open comment</div></template>',
      severity: 'error',
    },
    {
      label: 'malformed but closed comment',
      markup: '<template><!-- closed --!><div></div></template>',
      missingInput: `html-recovery:${HtmlRecoveryKind.MalformedComment}`,
      sourceToken: '--!>',
      severity: 'warning',
    },
    {
      label: 'SVG ancestor close',
      markup: '<template><svg><g></svg></template>',
      missingInput: `html-recovery:${HtmlRecoveryKind.MissingEndTag}`,
      sourceToken: 'g',
      sourceMarker: '<g>',
      sourceMarkerOffset: 1,
      severity: 'warning',
    },
    {
      label: 'foreignObject HTML ancestor close',
      markup: '<template><svg><foreignObject><div></foreignObject></svg></template>',
      missingInput: `html-recovery:${HtmlRecoveryKind.MissingEndTag}`,
      sourceToken: 'div',
      severity: 'warning',
    },
    {
      label: 'foreignObject HTML self-close',
      markup: '<template><svg><foreignObject><div/></foreignObject></svg></template>',
      missingInput: `html-recovery:${HtmlRecoveryKind.NonVoidSelfClosing}`,
      sourceToken: '/>',
      severity: 'warning',
    },
    {
      label: 'unterminated foreign CDATA',
      markup: '<template><svg><![CDATA[open</svg></template>',
      missingInput: `html-recovery:${HtmlRecoveryKind.UnterminatedCdata}`,
      sourceToken: '<![CDATA[open</svg></template>',
      severity: 'error',
    },
    {
      label: 'unterminated declaration',
      markup: '<template><!DOCTYPE html',
      missingInput: `html-recovery:${HtmlRecoveryKind.InvalidDoctype}`,
      sourceToken: '<!DOCTYPE html',
      severity: 'error',
    },
  ] as const)('publishes one exact actionable row for $label without semantic cascades', async (testCase) => {
    const { markup, missingInput, sourceToken, severity } = testCase;
    const rows = await appDiagnostics(markup);
    const recoveryRows = rows.filter((row) => row.diagnosticKind === 'html-syntax-recovery');
    const marker = 'sourceMarker' in testCase ? testCase.sourceMarker : sourceToken;
    const markerOffset = 'sourceMarkerOffset' in testCase ? testCase.sourceMarkerOffset : 0;
    const start = markup.indexOf(marker) + markerOffset;

    expect(
      recoveryRows,
      JSON.stringify(recoveryRows.map((row) => ({
        missingInput: row.missingInput,
        source: row.source,
      }))),
    ).toHaveLength(1);
    expect(recoveryRows[0]).toMatchObject({
      diagnosticAuthority: 'semantic-authoring-policy',
      frameworkErrorCode: null,
      severity,
      missingInput,
      source: { start, end: start + sourceToken.length },
      suggestion: {
        suggestionKind: 'fix-template-syntax',
        actionKind: 'rewrite-template-syntax',
      },
    });
    expect(rows.filter((row) => row.summary.includes('missingMember'))).toEqual([]);
    expect(recoveryRows[0]?.handles?.productHandle).not.toBeNull();
    expect(recoveryRows[0]?.handles?.identityHandle).not.toBeNull();
    expect(recoveryRows[0]?.handles?.sourceAddressHandle).not.toBeNull();
  });

  test('gives multiple recoveries on one authored carrier independent semantic identities', async () => {
    const rows = (await appDiagnostics('<template><div x=1 X=></div></template>'))
      .filter((row) => row.diagnosticKind === 'html-syntax-recovery');

    expect(rows.map((row) => row.missingInput).sort()).toEqual([
      `html-recovery:${HtmlRecoveryKind.DuplicateAttribute}`,
      `html-recovery:${HtmlRecoveryKind.MissingAttributeValue}`,
    ]);
    expect(new Set(rows.map((row) => row.handles?.productHandle)).size).toBe(2);
    expect(new Set(rows.map((row) => row.handles?.identityHandle)).size).toBe(2);
    expect(new Set(rows.map((row) => row.handles?.sourceAddressHandle)).size).toBe(2);
  });

  test('defers a duplicate-attribute recovery when a framework diagnostic owns the exact malformed carrier', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: i18nBindingErrorsFixture,
      storeKey: 'html-recovery-framework-precedence',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const rows = app.ask({
      kind: SemanticAppQueryKind.AppDiagnostics,
      sourceFile: { filePath: 'src/i18n-translation-binding-errors-app.html' },
      diagnosticProjection: 'type-projection',
      page: { size: 300 },
    }).value.rows;

    expect(rows.some((row) => row.frameworkErrorCode === 'AUR4001')).toBe(true);
    expect(rows.some((row) =>
      row.diagnosticKind === 'html-syntax-recovery'
      && row.missingInput === `html-recovery:${HtmlRecoveryKind.DuplicateAttribute}`
    )).toBe(false);
  });

  test('bounds an unterminated ancestor close without cascading to the document root', async () => {
    const markup = '<template><div><span></div';
    const rows = (await appDiagnostics(markup))
      .filter((row) => row.diagnosticKind === 'html-syntax-recovery');

    expect(rows.map((row) => ({
      missingInput: row.missingInput,
      source: row.source == null ? null : { start: row.source.start, end: row.source.end },
    }))).toEqual([
      {
        missingInput: `html-recovery:${HtmlRecoveryKind.UnterminatedEndTag}`,
        source: { start: markup.indexOf('</div'), end: markup.length },
      },
    ]);
  });

  test.each([
    '<template><p><div></div></template>',
    '<template><ul><li>one<li>two</li></ul></template>',
    '<template>${heading < heading}</template>',
    '<template><script>if(a<b){run()}</script><style>@media(width<big){}</style></template>',
    '<template><input /><svg><g /></svg></template>',
    '<template><ruby><rb>a<rt>b</ruby></template>',
    '<template><ruby><rtc><rt>a<rt>b</ruby></template>',
  ])('does not publish recovery noise for browser-valid or expression text: %s', async (markup) => {
    const rows = await appDiagnostics(markup);
    expect(rows.filter((row) => row.diagnosticKind === 'html-syntax-recovery')).toEqual([]);
  });

  test('retains exact recovery products, owners, and one-way structural references', async () => {
    const { runtime, app } = await openRecoveryApp(
      '<template></orphan><my-card/><div x=1 X=2></div></template>',
    );
    const html = app.emission.templates.resources[0]!.compilation.html;
    const store = runtime.workspace.store;
    const expectedOwners = new Map([
      [HtmlRecoveryKind.UnexpectedEndTag, html.document.identityHandle],
      [HtmlRecoveryKind.NonVoidSelfClosing, html.nodes.find((node) =>
        node instanceof HtmlElement && node.tagName === 'my-card'
      )!.identityHandle],
      [HtmlRecoveryKind.DuplicateAttribute, html.attributes.find((attribute) =>
        attribute.rawName === 'X'
      )!.identityHandle],
    ]);

    const ownedRecoveries = html.recoveries.filter((candidate) => expectedOwners.has(candidate.recoveryKind));
    expect(ownedRecoveries.map((recovery) => recovery.recoveryKind).sort()).toEqual([
      HtmlRecoveryKind.DuplicateAttribute,
      HtmlRecoveryKind.NonVoidSelfClosing,
      HtmlRecoveryKind.UnexpectedEndTag,
    ]);
    for (const recovery of ownedRecoveries) {
      expect(store.read(recovery.productHandle)).toMatchObject({
        kind: 'materialized-product',
        productKindKey: KernelVocabulary.Template.HtmlRecovery.key,
        identityHandle: recovery.identityHandle,
        addressHandle: recovery.addressHandle,
      });
      expect(store.read(recovery.identityHandle)).toEqual(expect.objectContaining({
        kind: 'compiler-identity',
        productKindKey: KernelVocabulary.Template.HtmlRecovery.key,
        ownerHandle: expectedOwners.get(recovery.recoveryKind),
      }));
      expect(store.productDetails.read(TemplateProductDetails.HtmlRecovery, recovery.productHandle)).toBe(recovery);
      expect(TemplateProductDetails.HtmlRecovery.referencesFor(recovery).some((reference) =>
        reference.surface === KernelPublicationSurface.ProductDetail
      )).toBe(false);

      const owner = recovery.recoveryKind === HtmlRecoveryKind.UnexpectedEndTag
        ? html.document
        : recovery.recoveryKind === HtmlRecoveryKind.NonVoidSelfClosing
          ? html.nodes.find((node) => node instanceof HtmlElement && node.tagName === 'my-card')!
          : html.attributes.find((attribute) => attribute.rawName === 'X')!;
      const ownerReferences = owner instanceof HtmlDocument
        ? TemplateProductDetails.HtmlDocument.referencesFor(owner)
        : owner instanceof HtmlElement
          ? TemplateProductDetails.HtmlNode.referencesFor(owner)
          : owner instanceof HtmlAttribute
            ? TemplateProductDetails.HtmlAttribute.referencesFor(owner)
            : [];
      expect(ownerReferences).toContainEqual(expect.objectContaining({
        surface: KernelPublicationSurface.ProductDetail,
        handle: recovery.productHandle,
        detailKind: TemplateProductDetails.HtmlRecovery.descriptor.detailKind,
      }));
    }
  });

  test('parents matched end-tag and declaration recoveries to their exact authored nodes', async () => {
    const matched = await openRecoveryApp('<template><div></div></template');
    const matchedHtml = matched.app.emission.templates.resources[0]!.compilation.html;
    const endRecovery = matchedHtml.recoveries.find((recovery) =>
      recovery.recoveryKind === HtmlRecoveryKind.UnterminatedEndTag
    )!;
    const template = matchedHtml.nodes.find((node) =>
      node instanceof HtmlElement && node.tagName === 'template'
    )!;
    expect(template.recoveries).toContain(endRecovery);
    expect(matchedHtml.document.recoveries).not.toContain(endRecovery);
    expect(matched.runtime.workspace.store.read(endRecovery.identityHandle)).toEqual(expect.objectContaining({
      kind: 'compiler-identity',
      ownerHandle: template.identityHandle,
    }));

    const declaration = await openRecoveryApp('<!DOCTYPE html');
    const declarationHtml = declaration.app.emission.templates.resources[0]!.compilation.html;
    const doctype = declarationHtml.nodes.find((node): node is HtmlDoctype => node instanceof HtmlDoctype)!;
    const declarationRecovery = doctype.recoveries.find((recovery) =>
      recovery.recoveryKind === HtmlRecoveryKind.InvalidDoctype
    )!;
    expect(declaration.runtime.workspace.store.read(declarationRecovery.identityHandle)).toEqual(expect.objectContaining({
      kind: 'compiler-identity',
      ownerHandle: doctype.identityHandle,
    }));
  });
});

async function appDiagnostics(markup: string): Promise<readonly SemanticAppDiagnosticRow[]> {
  const { app } = await openRecoveryApp(markup);
  return app.ask({
    kind: SemanticAppQueryKind.AppDiagnostics,
    detail: 'handles',
    sourceFile: { filePath: 'src/my-app.html' },
    diagnosticProjection: 'type-projection',
    page: { size: 300 },
  }).value.rows;
}

async function openRecoveryApp(markup: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aurelia-html-recovery-'));
  temporaryRoots.push(root);
  fs.cpSync(helloWorldFixture, root, { recursive: true });
  fs.writeFileSync(path.join(root, 'src/my-app.html'), markup, 'utf8');
  const runtime = await createSemanticRuntime({
    workspaceRoot: root,
    storeKey: `html-recovery-${temporaryRoots.length}-${markup.length}`,
  });
  const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
  return { runtime, app };
}

function nestedElementSpine(depth: number): string {
  return '<div>'.repeat(depth) + '</div>'.repeat(depth);
}

function draftRecoveries(
  nodes: readonly ParsedHtmlNodeDraft[],
  documentRecoveries: readonly { recoveryKind: HtmlRecoveryKind; summary: string; start: number; end: number }[],
) {
  const recoveries = [...documentRecoveries];
  const visit = (node: ParsedHtmlNodeDraft): void => {
    recoveries.push(...node.recoveries);
    for (const attribute of node.attributes) {
      recoveries.push(...attribute.recoveries);
    }
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return recoveries;
}
