import path from 'node:path';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import {
  createSemanticRuntime, NodeSemanticRuntimeProjectInputHost, SemanticAppQueryKind, SemanticRuntimeProjectInputAuthority,
  type SemanticTemplateRenameResult,
} from '../src/index.js';

test('renaming a TypeScript member or template local preserves bound names at edited and untouched sites', async () => {
  const root = path.resolve(import.meta.dirname, '../fixtures/pressure/app-pattern-minimal-app');
  const html = path.join(root, 'src/app.html');
  const ts = path.join(root, 'src/app.ts');
  const markup = [
    '<p>${title}</p>',
    '<p repeat.for="item of items">${title}|${item}</p>',
    '<p>${items.map(x => title + x)}</p>',
    '<p>${$this.qualifiedOnly}</p>',
    '<p repeat.for="item of items">${$parent.parentOnly}</p>',
    '<p>${other}</p>',
    '<p>${model.key}</p>',
  ].join('\n');
  const script = readFileSync(ts, 'utf8').replace("message = 'Hello semantic runtime';",
    "title = 'ROOT'; items = ['ROW']; qualifiedOnly = 'Q'; parentOnly = 'P'; other = 'NEIGHBOR'; model!: Named & Coded;")
    + '\ninterface Named { key: string }\ninterface Coded { code: string }\n';
  const inputs = new Map([[html, markup], [ts, script]]);
  const runtime = await createSemanticRuntime({
    workspaceRoot: root,
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost({
      readFile: file => inputs.get(path.resolve(file)),
      fileExists: file => inputs.has(path.resolve(file)) || undefined,
    })),
  });
  try {
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    function rename(file: string, marker: string, newName: string): SemanticTemplateRenameResult {
      const offset = inputs.get(file)!.indexOf(marker);
      if (offset < 0) throw new Error(`Missing rename fixture marker: ${marker}`);
      return app.ask({
        kind: file === ts ? SemanticAppQueryKind.TemplateRenameFromTypeScript : SemanticAppQueryKind.TemplateRename,
        cursor: { filePath: file, offset, line: 0, character: 0 },
        newName,
      }).value as SemanticTemplateRenameResult;
    }
    for (const name of ['item', 'x', 'items', 'Math', '$this']) {
      for (const origin of [html, ts]) {
        expect(rename(origin, 'title', name), `${path.basename(origin)} → ${name}`)
          .toMatchObject({ status: 'not-available', reason: 'name-conflict', edits: [] });
      }
    }
    // The use of title inside the repeat or arrow isn't edited in these directions.
    for (const declaration of ['item of items', 'x =>']) {
      expect(rename(html, declaration, 'title')).toMatchObject({ status: 'not-available', reason: 'name-conflict', edits: [] });
      expect(rename(html, declaration, 'entry')).toMatchObject({ status: 'available' });
    }
    // A same-spelled repeat or arrow local in a sibling must not block an unrelated edit.
    expect(rename(html, 'other', 'item')).toMatchObject({ status: 'available' });
    expect(rename(html, 'other', 'x')).toMatchObject({ status: 'available' });
    expect(rename(html, 'qualifiedOnly', 'Math')).toMatchObject({ status: 'available' });
    expect(rename(html, 'qualifiedOnly', '$parent')).toMatchObject({ status: 'available' });
    expect(rename(html, 'parentOnly', '$parent')).toMatchObject({ status: 'not-available', reason: 'name-conflict', edits: [] });
    for (const [file, marker] of [[ts, 'key: string'], [html, 'key}']] as const) {
      expect(rename(file, marker, 'code')).toMatchObject({ status: 'not-available', reason: 'name-conflict', edits: [] });
    }
    for (const origin of [ts, html]) {
      const plan = rename(origin, 'title', 'café');
      expect(plan.status).toBe('available');
      expect(plan.edits.filter(edit => edit.newText === 'café')).toHaveLength(4);
    }
  } finally {
    runtime.retireWorkspaceIncarnation();
  }
});
