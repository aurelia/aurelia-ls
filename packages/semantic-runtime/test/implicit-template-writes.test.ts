import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import {
  createSemanticRuntime, NodeSemanticRuntimeProjectInputHost, SemanticAppQueryKind, SemanticRuntimeProjectInputAuthority,
} from '../src/index.js';
import type { SemanticTemplateCursorInfoResult, SemanticTemplateDiagnosticsResult } from '../src/api/contracts.js';

test('projects framework writes onto live reads in their owning binding context, including before a writer', async () => {
  const root = fileURLToPath(new URL('../fixtures/pressure/router-active-link-state', import.meta.url));
  const file = path.join(root, 'src/router-active-link-state-app.html');
  const script = path.join(root, 'src/router-active-link-state-app.ts');
  const component = readFileSync(script, 'utf8')
    .replace('@route({', "@customElement({name: 'foreign-ref', template: '<input ref=neverWritten>'}) class ForeignRef {}\n@route({")
    .replace("name: 'router-active-link-state-app', template", "name: 'router-active-link-state-app', template, dependencies: [ForeignRef]")
    .replace('class RouterActiveLinkStateApp {', 'class RouterActiveLinkStateApp { acceptCount(value: number) { return value; }');
  const lines = [
    '<main><output>${field?.tagName}</output>',
    '  <input ref="field"><output>${field.tagName}</output>',
    '  <div if.bind="homeActive"><input ref="conditionalField"></div><output>${conditionalField?.value}</output>',
    '  <li active.class="_current"><a load="route: home; active.bind: _current">Home</a></li>',
    '  <output>${_current}</output>',
    '  <div if.bind="homeActive"><input ref="shared"></div><div else><textarea ref="shared"></textarea></div><output>${shared?.tagName}</output>',
    '  <foreign-ref></foreign-ref><span>${neverWritten}</span><output>${acceptCount(\'wrong\')}</output><au-viewport></au-viewport></main>',
  ];
  const markup = lines.join('\n');
  const files = new Map([[file, markup], [script, component]]);
  const runtime = await createSemanticRuntime({
    workspaceRoot: root,
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost({
      readFile: f => files.get(path.resolve(f)),
      fileExists: f => files.has(path.resolve(f)) || undefined,
    })),
  });
  try {
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const rows = (app.ask({ kind: SemanticAppQueryKind.TemplateDiagnostics, sourceFile: { filePath: file },
      page: { size: 100 } }).value as SemanticTemplateDiagnosticsResult).rows;
    expect(rows.filter(r => r.source?.start != null && r.source.start < markup.indexOf('<foreign-ref>'))).toEqual([]);
    expect(rows.filter(r => r.diagnosticKind === 'missing-expression-member')
      .map(r => markup.slice(r.source?.start ?? 0, r.source?.end ?? 0))).toEqual(['neverWritten']);
    expect(rows.filter(r => r.typeScriptDiagnosticCode === 2345)
      .map(r => markup.slice(r.source?.start ?? 0, r.source?.end ?? 0))).toEqual(["'wrong'"]);
    const selected = (line: number, character: number) => {
      const offset = lines.slice(0, line).reduce((s, text) => s + text.length + 1, character);
      const result = app.ask({ kind: SemanticAppQueryKind.TemplateCursorInfo, cursor: { filePath: file, line, character, offset } });
      return (result.value as SemanticTemplateCursorInfoResult).selectedMember;
    };
    const early = selected(0, lines[0]!.indexOf('field') + 1);
    expect(early?.typeDisplay).toContain('HTMLInputElement');
    expect(early?.typeDisplay).toContain('undefined');
    expect(early?.typeDisplay).toContain('null');
    expect(selected(1, lines[1]!.lastIndexOf('field') + 1)?.typeDisplay).toBe('HTMLInputElement');
    const conditional = selected(2, lines[2]!.lastIndexOf('conditionalField') + 1);
    expect(conditional?.typeDisplay).toBe(early?.typeDisplay);
    const beforeFlag = selected(3, lines[3]!.indexOf('_current') + 1);
    expect(beforeFlag?.typeDisplay).toContain('boolean');
    expect(beforeFlag?.typeDisplay).toContain('undefined');
    expect(selected(4, lines[4]!.indexOf('_current') + 1)?.typeDisplay).toBe('boolean');
    const shared = selected(5, lines[5]!.lastIndexOf('shared') + 1);
    expect(shared?.typeDisplay).toContain('HTMLInputElement');
    expect(shared?.typeDisplay).toContain('HTMLTextAreaElement');
    expect(shared?.source).toBeNull();
  } finally {
    runtime.retireWorkspaceIncarnation();
  }
});
