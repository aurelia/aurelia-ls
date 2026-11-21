import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { createSemanticRuntime, SemanticAppQueryKind } from '../src/index.js';
import { NodeSemanticRuntimeProjectInputHost, SemanticRuntimeProjectInputAuthority } from '../src/kernel/project-input.js';

test('narrows switch branches only for the owning switch and definite case exclusions', async () => {
  const root = fileURLToPath(new URL('../fixtures/pressure/template-controller-built-ins', import.meta.url));
  const file = path.join(root, 'src/template-controller-built-ins-app.html');
  const script = path.join(root, 'src/template-controller-built-ins-app.ts');
  const lines = [
    '<template switch.bind="mode"><p case="list">first</p>',
    '<template switch.bind="mode"><span case="list">nested</span></template>',
    '<p case="detail">${detailOnly(mode)}</p></template>',
    '<template switch.bind="mode"><p case="value:list; fall-through:${true}">first</p>',
    '<p case="detail">${detailOnly(mode)}</p></template>',
    '<template switch.bind="mode"><p case.bind="allowed"></p><p default-case>${otherOnly(mode)}</p></template>',
    '<template switch.bind="mode"><p case.bind="[\'list\',\'detail\']"></p><p default-case>${otherOnly(mode)}</p></template>',
  ];
  const files = new Map([
    [file, lines.join('\n')],
    [script, [
      "import { customElement } from 'aurelia'; import template from './template-controller-built-ins-app.html';",
      "@customElement({ name: 'template-controller-built-ins-app', template }) export class TemplateControllerBuiltInsApp {",
      "  mode: 'list' | 'detail' | 'other' = 'list'; allowed: ('list' | 'detail')[] = [];",
      "  detailOnly(mode: 'detail') { return mode; } otherOnly(mode: 'other') { return mode; }",
      '}',
    ].join('\n')],
  ]);
  const runtime = await createSemanticRuntime({ workspaceRoot: root,
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost({
      readFile: name => files.get(path.resolve(name)), fileExists: name => files.has(path.resolve(name)) || undefined,
    })),
  });
  try {
    const app = await runtime.openApp({ sourceFilePath: file, analysisDepth: 'binding-observation' });
    const argumentTypes = [2, 4, 5, 6].map(line => {
      const character = lines[line]!.lastIndexOf('(mode)') + 2;
      const offset = lines.slice(0, line).reduce((sum, text) => sum + text.length + 1, character);
      const answer = app.ask({ kind: SemanticAppQueryKind.TemplateCursorInfo, cursor: { filePath: file, offset, line, character } });
      return answer.value.selectedMember?.typeDisplay;
    });
    expect(argumentTypes[0]).toBe('"detail"');
    expect(argumentTypes[1]).toContain('"list"');
    expect(argumentTypes[2]).toContain('"list"');
    expect(argumentTypes[3]).toBe('"other"');
  } finally {
    runtime.retireWorkspaceIncarnation();
  }
});
