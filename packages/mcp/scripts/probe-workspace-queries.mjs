import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Exercise semantic answers from the process the client actually started. */
export async function probeWorkspaceQueries(client, workspaceRoot) {
  async function call(name, args) {
    const result = await client.callTool({ name, arguments: { workspaceRoot, ...args } });
    assert(!result.isError, result.content?.[0]?.text);
    const answer = result.structuredContent?.value;
    assert.equal(answer?.result, 'answered', answer?.summary);
    return answer;
  }
  const workspace = await call('aurelia_workspace_overview', { projectPage: { size: 1 } });
  assert(workspace.value.projects.some(row => path.resolve(row.rootDir) === path.resolve(workspaceRoot)));
  const definitions = { kind: 'resource-definitions', page: { size: 50 } };
  const single = await call('aurelia_app_query', { queryKind: definitions.kind, page: definitions.page });
  const batch = await call('aurelia_app_query_batch', { queries: [definitions] });
  const [child] = batch.value.rows;
  for (const answer of [single, child.answer]) {
    assert.equal(answer.result, 'answered', answer.summary);
    assert(answer.value.rows.some(row => row.name === 'app-root' && row.source?.path === 'src/app.ts'));
    assert(answer.continuations.some(row => row.targetQuery?.kind === 'resource-visibility'));
    assert(answer.continuations.every(row => row.targetQuery != null && row.targetAppBuilderQuery == null));
  }

  const diagnosticRoot = fileURLToPath(new URL('../../semantic-runtime/fixtures/pressure/template-overlay-type-errors/', import.meta.url));
  const sourceFilePath = 'src/template-overlay-type-errors-app.html';
  const markup = await readFile(path.join(diagnosticRoot, sourceFilePath), 'utf8');
  const memberStart = markup.indexOf('missingStatus');
  assert(memberStart >= 0, 'the release fixture contains its missing member');
  const diagnostics = await call('aurelia_app_query', {
    workspaceRoot: diagnosticRoot, queryKind: 'app-diagnostics', sourceFilePath, page: { size: 100 },
  });
  assert(diagnostics.value.rows.some(row =>
    row.diagnosticKind === 'missing-expression-member' && row.source?.path === sourceFilePath
    && row.source.start === memberStart && row.source.end === memberStart + 'missingStatus'.length),
  'default app diagnostics locate the missing template member');
}
