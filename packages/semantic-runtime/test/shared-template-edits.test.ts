import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from 'vitest';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  type SemanticTemplateCodeActionsResult,
  type SemanticTemplateCursorInfoResult,
  type SemanticTemplateDiagnosticsResult,
  type SemanticTemplateRenameResult,
} from '../src/index.js';

test('edits shared markup only when its component contexts agree on the declaration', async () => {
  const tempParent = path.resolve(import.meta.dirname, '../.temp');
  await mkdir(tempParent, { recursive: true });
  const root = await mkdtemp(path.join(tempParent, 'shared-template-edits-'));
  const markup = '<p>${label}</p>';
  const script = [
    "import { customElement } from '@aurelia/runtime-html';",
    "import healthy from './healthy.html'; import partial from './partial.html'; import inherited from './inherited.html';",
    "import { View as MissingA } from './missing-a'; import { View as MissingB } from './missing-b';",
    "@customElement({name:'alpha-item',template:healthy}) export class Alpha { label = 'alpha'; }",
    "@customElement({name:'bravo-item',template:healthy}) export class Bravo { label = 'bravo'; }",
    "@customElement({name:'working-item',template:partial}) export class Working { label = 'ok'; }",
    "@customElement({name:'unfinished-item',template:partial}) export class Unfinished {}",
    "export class Base { label = 'common'; }",
    "@customElement({name:'inherited-a',template:inherited}) export class InheritedA extends Base {}",
    "@customElement({name:'inherited-b',template:inherited}) export class InheritedB extends Base {}",
    "@customElement({name:'app-root',",
    "  dependencies: [Alpha, Bravo, Unfinished, Working, MissingA, MissingB, InheritedA, InheritedB],",
    "  template: '<alpha-item></alpha-item><bravo-item></bravo-item><unfinished-item></unfinished-item><working-item></working-item>'",
    "    + '<missing-a></missing-a><missing-b></missing-b><inherited-a></inherited-a><inherited-b></inherited-b>'",
    "}) export class App {}",
  ].join('\n');
  function cursor(filePath: string, offset = markup.indexOf('label') + 1) {
    const text = filePath === 'model.ts' ? script : markup;
    const prefix = text.slice(0, offset).split('\n');
    return { filePath, line: prefix.length - 1, character: prefix.at(-1)!.length, offset };
  }
  try {
    for (const view of ['healthy', 'partial', 'missing', 'inherited']) {
      await writeFile(path.join(root, `${view}.html`), markup);
    }
    for (const name of ['missing-a', 'missing-b']) {
      await writeFile(path.join(root, `${name}.ts`), [
        "import { customElement } from '@aurelia/runtime-html';",
        "import template from './missing.html';",
        `@customElement({ name: '${name}', template }) export class View {}`,
      ].join('\n'));
    }
    await writeFile(path.join(root, 'model.ts'), script);
    await writeFile(path.join(root, 'main.ts'), [
      "import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';",
      "import { App } from './model';",
      "new Aurelia().register(StandardConfiguration).app({ component: App, host: document.body }).start();",
    ].join('\n'));
    await writeFile(path.join(root, 'package.json'), JSON.stringify({
      type: 'module', dependencies: { '@aurelia/runtime-html': '^2.0.0-rc.2' },
    }));
    await writeFile(path.join(root, 'assets.d.ts'), "declare module '*.html' { const template: string; export default template; }");
    await writeFile(path.join(root, 'tsconfig.json'), JSON.stringify({
      compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', noEmit: true },
    }));

    const runtime = await createSemanticRuntime({ workspaceRoot: root });
    try {
      const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
      const actions = (filePath: string) =>
        (app.ask({ kind: SemanticAppQueryKind.TemplateCodeActions, cursor: cursor(filePath) }).value as SemanticTemplateCodeActionsResult).rows;

      const edits = actions('partial.html');
      expect(edits.map(row => row.diagnostics[0]?.template.owner?.name)).toEqual(['Unfinished']);
      const fix = edits[0]!.edits[0]!;
      const fixed = script.slice(0, fix.source.start!) + fix.newText + script.slice(fix.source.end!);
      expect(fixed).toMatch(/class Unfinished \{\s*label!: unknown;/u);

      const missingActions = actions('missing.html');
      expect(missingActions.map(row => row.title).sort()).toEqual([
        "Declare member 'label' on View (<missing-a>)",
        "Declare member 'label' on View (<missing-b>)",
      ]);
      for (const action of missingActions) {
        const owner = action.diagnostics[0]!.template.owner!;
        expect(action.edits).toHaveLength(1);
        expect(path.resolve(root, action.edits[0]!.source.path!)).toBe(path.join(root, `${owner.resourceName}.ts`));
      }
      const diagnostics = app.ask({
        kind: SemanticAppQueryKind.TemplateDiagnostics, sourceFile: { filePath: 'partial.html' },
      }).value as SemanticTemplateDiagnosticsResult;
      const missing = diagnostics.rows.filter(row => row.diagnosticKind === 'missing-expression-member');
      expect(missing).toHaveLength(1);
      expect(missing[0]!.summary).toContain('unfinished-item');

      const selected = app.ask({
        kind: SemanticAppQueryKind.TemplateCursorInfo, cursor: cursor('healthy.html'),
      }).value as SemanticTemplateCursorInfoResult;
      expect(selected.sharedOwnerContexts?.map(owner => owner.ownerName).sort()).toEqual(['Alpha', 'Bravo']);

      const htmlRename = (filePath: string) => app.ask({
        kind: SemanticAppQueryKind.TemplateRename, cursor: cursor(filePath), newName: 'caption',
      }).value as SemanticTemplateRenameResult;
      const scriptRename = (declaration: string) => app.ask({
        kind: SemanticAppQueryKind.TemplateRenameFromTypeScript,
        cursor: cursor('model.ts', script.indexOf(declaration) + 1), newName: 'caption',
      }).value as SemanticTemplateRenameResult;
      for (const result of [htmlRename('healthy.html'), scriptRename("label = 'alpha'"), scriptRename("label = 'bravo'")]) {
        expect(result.reason).toBe('shared-template-targets');
        expect(result.edits).toEqual([]);
      }
      for (const result of [htmlRename('inherited.html'), scriptRename("label = 'common'")]) {
        expect(result.status).toBe('available');
        expect(result.edits.map(edit => edit.source?.path).sort()).toEqual(['inherited.html', 'model.ts']);
      }
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
