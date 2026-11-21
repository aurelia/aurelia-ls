import type { SemanticTemplateDiagnosticsResult, SemanticTemplateSemanticTokensResult } from '../src/api/contracts.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from 'vitest';
import {
  createSemanticRuntime,
  NodeSemanticRuntimeProjectInputHost,
  SemanticAppQueryKind,
  SemanticRuntimeProjectInputAuthority,
} from '../src/index.js';

const fixtures = path.resolve(import.meta.dirname, '../fixtures/pressure');

function openWithSource(workspaceRoot: string, filePath: string, text: string) {
  return createSemanticRuntime({
    workspaceRoot,
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost({
      fileExists: file => path.resolve(file) === filePath ? true : undefined,
      readFile: file => path.resolve(file) === filePath ? text : undefined,
    })),
  });
}

test('reports rejected attribute holes at reached sites and preserves native-accepted recovery', async () => {
  const root = path.join(fixtures, 'content-projection-topology');
  const file = path.join(root, 'src/content-projection-topology-app.html');
  const lines = [
    '<p title="before ${#}"></p>',
    '<p title="before ${message.}"></p>',
    '<p title="before ${message /* comment */}"></p>',
    '<p title="before ${message"></p>',
    '<p title="before ${ message } and ${8 / 2}"></p>',
    '<opaque-content-shell><span title="${#}"></span></opaque-content-shell>',
    '<p title.bind="#"></p>',
  ];
  const text = lines.join('\n');
  const runtime = await openWithSource(root, file, text);
  const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
  const diagnostics = app.ask({ kind: SemanticAppQueryKind.TemplateDiagnostics, sourceFile: { filePath: file }, page: { size: 100 } });
  expect(diagnostics.result).toBe('answered');
  const rows = (diagnostics.value as SemanticTemplateDiagnosticsResult).rows.filter(row => row.diagnosticKind === 'expression-parse-error');
  expect(rows.map(row => [
    text.slice(0, row.source!.start!).split('\n').length,
    row.frameworkErrorCode,
  ]).sort()).toEqual([[1, 'AUR0168'], [2, 'AUR0153'], [3, 'AUR0156'], [4, null], [7, 'AUR0168']]);
  const missingClose = text.indexOf('"></p>', text.indexOf(lines[3]!));
  expect(rows.find(row => row.frameworkErrorCode == null)?.source).toMatchObject({ start: missingClose, end: missingClose });

  const tokens = app.ask({ kind: SemanticAppQueryKind.TemplateSemanticTokens, sourceFile: { filePath: file }, page: { size: 200 } });
  const start = text.indexOf(lines[4]!);
  expect((tokens.value as SemanticTemplateSemanticTokensResult).rows.filter(row => row.tokenType === 'aureliaExpression' && row.source.start! >= start
    && row.source.start! < start + lines[4]!.length).map(row => text.slice(row.source.start!, row.source.end!)))
    .toEqual(['${', '}', '${', '}']);
}, 60_000);

test('maps the delimiters of an escaped inline interpolation to the authored TypeScript', async () => {
  const root = path.join(fixtures, 'template-completion-member-metadata');
  const file = path.join(root, 'src/app.ts');
  const text = (await readFile(file, 'utf8')).replace("import template from './app.html';",
    "const template = '<p>\\u0024{  title  }</p>';");
  const runtime = await openWithSource(root, file, text);
  const tokens = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.TemplateSemanticTokens, sourceFile: { filePath: file }, page: { size: 200 },
  });
  expect((tokens.value as SemanticTemplateSemanticTokensResult).rows.filter(row => row.tokenType === 'aureliaExpression')
    .map(row => text.slice(row.source.start!, row.source.end!))).toEqual(['\\u0024{', '}']);
}, 60_000);
