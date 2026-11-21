import assert from 'node:assert/strict';
import path from 'node:path';

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
}
