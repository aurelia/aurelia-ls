import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

import {
  createSemanticRuntime,
  NodeSemanticRuntimeProjectInputHost,
  SemanticAppQueryKind,
  SemanticRuntimeProjectInputAuthority,
  type SemanticAppDiagnosticsResult,
  type SemanticTemplateCodeActionsResult,
} from '../src/index.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

test('relates missing scope producers to consumers and keeps independent repairs', async () => {
  const root = fileURLToPath(new URL('../fixtures/pressure/app-pattern-minimal-app/', import.meta.url));
  const html = [
    '<let order.bind="badLet"></let>',
    '<p>${order.profile.name}</p>',
    '<let next.bind="order.profile"></let><p>${next.address}</p>',
    '<div repeat.for="item of badRepeat">${item.profile.name}</div>',
    '<div with.bind="badWith"><p>${profile.name}</p><p>${amount}</p><p>${$parent.parentTypo}</p></div>',
    '<div repeat.for="order of orders">${order.realTypo}</div>',
    '<p>${unrelated}</p>',
    '<div with.bind="badFlag ? orders[0] : orders[0]">${separateTypo}</div>',
  ].join('\n');
  const overlay = new MutableProjectSourceOverlay();
  const filePath = 'src/app.html';
  overlay.write(path.join(root, filePath), html);
  const component = path.join(root, 'src/app.ts');
  overlay.write(component, fs.readFileSync(component, 'utf8').replace(
    "message = 'Hello semantic runtime';",
    "orders = [{ profile: { name: 'Pat' }, amount: 42 }];",
  ));
  const runtime = await createSemanticRuntime({
    workspaceRoot: root,
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay)),
  });
  try {
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const result = app.ask({ kind: SemanticAppQueryKind.AppDiagnostics, sourceFile: { filePath }, page: { size: 100 } })
      .value as SemanticAppDiagnosticsResult;
    const token = (index: number) => {
      const source = result.rows[index]!.source;
      return html.slice(source?.start ?? -1, source?.end ?? -1);
    };
    const groups = result.presentation!.groups.map(group => ({
      name: token(group.primary.rowIndex),
      children: group.related.filter(r => r.relation === 'derived-consequence').map(r => token(r.rowIndex)).sort(),
    }));
    expect(groups).toEqual([
      { name: 'badLet', children: ['address', 'name', 'profile', 'profile'] },
      { name: 'badRepeat', children: ['name', 'profile'] },
      { name: 'badWith', children: ['amount', 'profile'] },
      { name: 'parentTypo', children: [] },
      { name: 'realTypo', children: [] },
      { name: 'unrelated', children: [] },
      { name: 'badFlag', children: [] },
      { name: 'separateTypo', children: [] },
    ]);
    const actionsAt = (offset: number) => (app.ask({
      kind: SemanticAppQueryKind.TemplateCodeActions, cursor: { filePath, offset },
    }).value as SemanticTemplateCodeActionsResult).rows.map(action => action.title);
    expect(actionsAt(html.indexOf('profile.name', html.indexOf('with.bind')))).toEqual([]);
    expect(actionsAt(html.indexOf('unrelated'))).toContain("Declare member 'unrelated' on App");
  } finally {
    runtime.retireWorkspaceIncarnation();
  }
});
