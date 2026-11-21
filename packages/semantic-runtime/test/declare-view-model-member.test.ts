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
    const fix = result.value.rows.find(row => row.title === "Declare member 'missingTitle' on App");
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
    expect(diagnostics.value.rows.filter(row => row.diagnosticKind === 'missing-expression-member')).toEqual([]);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
}, 60_000);
