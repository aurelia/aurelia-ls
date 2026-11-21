import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import {
  createSemanticRuntime, NodeSemanticRuntimeProjectInputHost, SemanticRuntimeProjectInputAuthority,
  type SemanticStateIssuesResult,
} from '../src/index.js';

test('reports only reached state lookups and mutations after framework registration', async () => {
  const workspaceRoot = fileURLToPath(new URL('../fixtures/pressure/i18n-translation-binding-errors', import.meta.url));
  const main = path.join(workspaceRoot, 'src/main.ts');
  const template = path.join(workspaceRoot, 'src/i18n-translation-binding-errors-app.html');
  const program = readFileSync(main, 'utf8') + `
    const stores = StateDefaultConfiguration.init({ count: 1 });
    const local = { register(_item: unknown) {} };
    function notCalled() { new Aurelia().register(stores); }
    local.register(stores);
    stores.withStore('early', { count: 2 });
    new Aurelia().register(stores);
    { stores.withStore('late', { count: 3 }); }
  `;
  const html = `<p t.bind="customerName & state:'only-evaluated'"></p>
    <input value.bind="customerName & state:'actually-bound'">`;
  const inputs = new Map([[main, program], [template, html]]);
  const runtime = await createSemanticRuntime({
    workspaceRoot, projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost({
      readFile: file => inputs.get(path.resolve(file)),
      fileExists: file => inputs.has(path.resolve(file)) ? true : undefined,
    })),
  });
  const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
  const { rows } = app.ask({ kind: 'state-issues' }).value as SemanticStateIssuesResult;
  expect(rows.filter(row => row.issueKind === 'store-not-found').map(row => row.storeName)).toEqual(['actually-bound']);
  const mutations = rows.filter(row => row.issueKind === 'with-store-after-registration');
  expect(mutations).toHaveLength(1);
  const source = mutations[0]!.source!;
  expect(program.slice(source.start!, source.end!)).toBe("stores.withStore('late', { count: 3 })");
});
