import type { SemanticControlUseInventoryResult, SemanticConfigurationIssuesResult, SemanticAppSummary } from '../src/api/contracts.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { createSemanticRuntime, NodeSemanticRuntimeProjectInputHost, SemanticAppQueryKind, SemanticRuntimeProjectInputAuthority } from '../src/index.js';

test('attributes submitters to their nominated form and counts only genuine framework configuration issues', async () => {
  const root = fileURLToPath(new URL('../fixtures/pressure/app-pattern-minimal-app/', import.meta.url));
  const html = path.join(root, 'src/app.html');
  const component = path.join(root, 'src/app.ts');
  const overlay = new Map([
    [html, [
      '<form id="a" submit.trigger="save()">',
      '  <button>Enclosed</button><button form="b">Moved</button><button form="absent">Orphan</button>',
      '</form>',
      '<form id="b" submit.trigger="cancel()"><button>Neighbor</button></form>',
      '<button form="a">External</button>',
    ].join('\n')],
    [component, fs.readFileSync(component, 'utf8').replace("message = 'Hello semantic runtime';", 'save() {} cancel() {}') + [
      '', "import { Scope } from 'aurelia';",
      'export function real() { return Scope.create(null as any); }',
      'export function unrelated(Scope: { create(v: null): number }) { return Scope.create(null); }',
    ].join('\n')],
  ]);
  const runtime = await createSemanticRuntime({ workspaceRoot: root,
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost({
      readFile: file => overlay.get(path.resolve(file)),
      fileExists: file => overlay.has(path.resolve(file)) ? true : undefined,
    })),
  });
  const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
  const inventory = app.ask({ kind: SemanticAppQueryKind.ControlUseInventory, page: { size: 100 } }).value as SemanticControlUseInventoryResult;
  const buttons = inventory.rows.filter(row => row.buttonText != null);
  expect(Object.fromEntries(buttons.map(row => [row.buttonText, row.handlerExpression]))).toEqual({
    Enclosed: 'save()', Moved: 'cancel()', Neighbor: 'cancel()', External: 'save()',
  });
  const { rows: issues } = app.ask({ kind: SemanticAppQueryKind.ConfigurationIssues }).value as SemanticConfigurationIssuesResult;
  expect(issues.map(issue => issue.frameworkErrorCode)).toEqual(['AUR0204']);
  const summary = app.ask({ kind: SemanticAppQueryKind.Summary }).value as SemanticAppSummary;
  expect(summary.configurationIssues).toBe(issues.length);
});
