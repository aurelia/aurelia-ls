import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import {
  createSemanticRuntime, NodeSemanticRuntimeProjectInputHost, SemanticAppQueryKind, SemanticRuntimeProjectInputAuthority,
} from '../src/index.js';
import type { SemanticTemplateCursorInfoResult, SemanticTemplateDiagnosticsResult } from '../src/api/contracts.js';

test('uses the selected TypeScript predicate in controller, nested iterable and expression branches', async () => {
  const root = fileURLToPath(new URL('../fixtures/pressure/template-controller-built-ins', import.meta.url));
  const file = path.join(root, 'src/template-controller-built-ins-app.html');
  const script = path.join(root, 'src/template-controller-built-ins-app.ts');
  const lines = [
    '<main><template repeat.for="row of rows">',
    '  <div if.bind="isFolder(row)"><p repeat.for="child of row.items">${child.label}</p></div>',
    '  <span else>${row.name}</span>',
    '  <span>${isFolder(row) ? row.items.length : row.name}</span>',
    '  <span>${guards.folder(row) && row.items.length}</span>',
    '  <span if.bind="kind(row, true)">${row.items.length}</span>',
    '  <span if.bind="plain(row)">${row.items.length}</span>',
    '  <span if.bind="isFolder(row)">${row.misspelled}</span>',
    '</template></main>',
  ];
  const markup = lines.join('\n');
  const files = new Map([
    [file, markup],
    [script, [
      "import { customElement } from 'aurelia'; import template from './template-controller-built-ins-app.html';",
      "type Folder = {kind:'folder', items:{label:string}[]}; type Row = Folder | {kind:'entry', name:string};",
      "@customElement({ name: 'template-controller-built-ins-app', template }) export class TemplateControllerBuiltInsApp {",
      "  rows: Row[] = []; isFolder(r: Row): r is Folder { return r.kind === 'folder' }",
      "  guards = { folder: (r: Row): r is Folder => this.isFolder(r) };",
      "  kind(r: Row, f: true): r is Folder; kind(r: Row, f: false): boolean;",
      "  kind(r: Row, f: boolean): boolean { return f && this.isFolder(r) }",
      "  plain(r: Row): boolean { return this.isFolder(r) }",
      '}',
    ].join('\n')],
  ]);
  const runtime = await createSemanticRuntime({ workspaceRoot: root,
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost({
      readFile: name => files.get(path.resolve(name)), fileExists: name => files.has(path.resolve(name)) || undefined,
    })),
  });
  try {
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const answer = app.ask({ kind: SemanticAppQueryKind.TemplateDiagnostics, sourceFile: { filePath: file }, page: { size: 100 } });
    const diagnoses = (answer.value as SemanticTemplateDiagnosticsResult).rows.filter(r => r.source?.start != null);
    const markers = diagnoses.map(r => [markup.slice(0, r.source!.start!).split('\n').length - 1, r.diagnosticKind, markup.slice(r.source!.start!, r.source!.end!)]);
    expect(markers.filter(([line]) => Number(line) < 6)).toEqual([]);
    expect(markers).toContainEqual([6, 'missing-expression-member', 'items']);
    expect(markers).toContainEqual([7, 'missing-expression-member', 'misspelled']);
    for (const [line, token] of [[1, 'label'], [2, 'name']] as const) {
      const character = lines[line]!.lastIndexOf(token) + 1;
      const offset = lines.slice(0, line).reduce((n, s) => n + s.length + 1, character);
      const cursor = app.ask({ kind: SemanticAppQueryKind.TemplateCursorInfo, cursor: { filePath: file, line, character, offset } });
      expect((cursor.value as SemanticTemplateCursorInfoResult).selectedMember?.typeDisplay).toBe('string');
    }
  } finally {
    runtime.retireWorkspaceIncarnation();
  }
});
