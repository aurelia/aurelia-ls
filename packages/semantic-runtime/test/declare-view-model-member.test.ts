import type { SemanticTemplateCodeActionsResult, SemanticTemplateDiagnosticsResult } from '../src/api/contracts.js';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from 'vitest';
import { createSemanticRuntime, SemanticAppQueryKind } from '../src/index.js';

test.each(['js', 'ts'])('applies the missing-member fix to the selected .%s class', async (extension) => {
  const tempParent = path.resolve(import.meta.dirname, '../.temp');
  await mkdir(tempParent, { recursive: true });
  const workspaceRoot = await mkdtemp(path.join(tempParent, 'declare-member-'));
  const helper = 'function helper() { class App { keep = 1; } return new App(); }';
  const model = [
    "import { CustomElement } from '@aurelia/runtime-html';",
    "import template from './app.html';",
    helper,
    "export class App { title = 'ok'; }",
    "CustomElement.define({name: 'app', template}, App);",
  ].join('\n');
  const modelPath = path.join(workspaceRoot, 'app.' + extension);
  const markup = '<p>${title} ${missingTitle}</p>';
  const file = path.join(workspaceRoot, 'app.html');
  const offset = markup.indexOf('missingTitle');
  try {
    await Promise.all([
      writeFile(modelPath, model),
      writeFile(file, markup),
      writeFile(path.join(workspaceRoot, 'package.json'), '{"type":"module","dependencies":{"aurelia":"^2.0.0-rc.2"}}'),
      writeFile(path.join(workspaceRoot, 'tsconfig.json'), JSON.stringify({
        compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', allowJs: true, checkJs: true, noEmit: true },
      })),
      writeFile(path.join(workspaceRoot, 'assets.d.ts'), "declare module '*.html' { const template: string; export default template; }"),
      writeFile(path.join(workspaceRoot, 'main.' + extension), [
        "import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';",
        "import { App } from './app';",
        "new Aurelia().register(StandardConfiguration).app({ component: App, host: document.body }).start();",
      ].join('\n')),
    ]);
    const runtime = await createSemanticRuntime({ workspaceRoot });
    const result = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.TemplateCodeActions,
      cursor: { filePath: file, offset, line: 0, character: offset },
    });
    const fix = (result.value as SemanticTemplateCodeActionsResult).rows.find(row => row.title === "Declare member 'missingTitle' on App");
    expect(fix?.edits).toHaveLength(1);
    const edit = fix!.edits[0]!;
    expect(path.resolve(workspaceRoot, edit.source.path!)).toBe(modelPath);
    const edited = model.slice(0, edit.source.start!) + edit.newText + model.slice(edit.source.end!);
    expect(edited).toContain(helper);
    if (extension === 'js') execFileSync(process.execPath, ['--input-type=module', '--check'], { input: edited });
    await writeFile(modelPath, edited);
    const fresh = await createSemanticRuntime({ workspaceRoot });
    const diagnostics = await fresh.answerAppQuery({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      sourceFile: { filePath: file },
    });
    expect(diagnostics.result).toBe('answered');
    expect((diagnostics.value as SemanticTemplateDiagnosticsResult).rows.filter(row => row.diagnosticKind === 'missing-expression-member')).toEqual([]);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
}, 60_000);

test('declares a missing member only after the complete class hierarchy is known', async () => {
  const tempParent = path.resolve(import.meta.dirname, '../.temp');
  await mkdir(tempParent, { recursive: true });
  const root = await mkdtemp(path.join(tempParent, 'declare-inherited-member-'));
  const file = path.join(root, 'app.html');
  const markup = '<p>${message} ${formatLabel()} ${realTypo}</p>';
  try {
    await Promise.all([
      writeFile(file, markup),
      writeFile(path.join(root, 'package.json'), '{"dependencies":{"aurelia":"^2.0.0-rc.2"}}'),
      writeFile(path.join(root, 'middle.ts'), "import { Base } from './base'; export class Middle extends Base {}"),
      writeFile(path.join(root, 'app.ts'), [
        "import { customElement } from 'aurelia';",
        "import template from './app.html';",
        "import { Middle } from './middle';",
        "@customElement({name: 'my-app', template}) export class MyApp extends Middle {}",
      ].join('\n')),
      writeFile(path.join(root, 'main.ts'), [
        "import Aurelia from 'aurelia';",
        "import { MyApp } from './app';",
        "Aurelia.app(MyApp).start();",
      ].join('\n')),
    ]);
    const runtime = await createSemanticRuntime({ workspaceRoot: root });
    try {
      const missing = async () => {
        const result = await runtime.answerAppQuery({
          kind: SemanticAppQueryKind.TemplateDiagnostics, sourceFile: { filePath: file },
        });
        expect(result.result).toBe('answered');
        return (result.value as SemanticTemplateDiagnosticsResult).rows
          .filter(row => row.diagnosticKind === 'missing-expression-member').map(row => row.selectedMemberName);
      };
      const declarations = async (name: string) => {
        const offset = markup.indexOf(name) + 1;
        const result = await runtime.answerAppQuery({
          kind: SemanticAppQueryKind.TemplateCodeActions, cursor: { filePath: file, offset, line: 0, character: offset },
        });
        return (result.value as SemanticTemplateCodeActionsResult).rows.filter(row => row.title.startsWith('Declare member'));
      };
      expect(await missing()).toEqual([]);
      expect(await declarations('message')).toEqual([]);
      expect(await declarations('realTypo')).toEqual([]);
      await writeFile(path.join(root, 'base.ts'), "export class Base { message = 'Hello'; formatLabel() { return this.message; } }");
      expect(await missing()).toEqual(['realTypo']);
      expect(await declarations('message')).toEqual([]);
      expect(await declarations('realTypo')).toHaveLength(1);
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60_000);
