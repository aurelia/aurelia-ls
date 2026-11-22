import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';

/** Qualify project selection and retention through the installed server, using stageReleaseWorkspace's authored files. */
export async function probeWorkspaceTopology(client, workspaceRoot, { conventionRoot, inlineRoot, libraryRoot }) {
  async function call(name, args) {
    return client.callTool({ name, arguments: args }, undefined, { timeout: 120_000 });
  }
  async function value(name, args) {
    const reply = await call(name, args);
    assert(!reply.isError, reply.content?.[0]?.text);
    assert.equal(reply.structuredContent?.tool, name);
    return reply.structuredContent.value;
  }
  async function answer(name, args, expected = 'answered') {
    const result = await value(name, args);
    assert.equal(result.result, expected, result.summary);
    return result;
  }
  const overview = (descriptor) => answer('aurelia_workspace_overview', { ...descriptor, projectPage: { size: 50 } });
  const { value: discovered } = await overview({ workspaceRoot });
  const project = (root) => {
    const row = discovered.projects.find(p => path.resolve(p.rootDir) === path.resolve(root));
    assert(row, `Did not discover ${path.relative(workspaceRoot, root)}`);
    return row.projectKey;
  };
  const convention = project(conventionRoot);
  const inline = project(inlineRoot);
  const kit = project(libraryRoot);
  assert.deepEqual(discovered.appCandidates.map(p => p.projectKey).sort(), [convention, inline].sort());

  // Use a separate, explicitly scoped session for the retention check so earlier authoring probes can stay warm.
  const workspace = { workspaceRoot, projectRootHints: [conventionRoot, inlineRoot, libraryRoot] };
  const query = (projectKey, queryKind, options = {}, expected) =>
    answer('aurelia_app_query', { ...workspace, projectKey, queryKind, ...options }, expected);
  const sources = (projectKey, size, cursor, expected) => query(projectKey, 'source-files', { page: { size, cursor } }, expected);

  // "start" formerly collided with a missing cursor. Exercise both orders in independent project claims.
  assert.equal((await sources(convention, 1, 'start', 'invalid')).page.cursorProblem.kind, 'malformed');
  const first = await sources(convention, 1);
  assert.equal(first.value.rows.length, 1);
  assert.equal(typeof first.page.nextCursor, 'string');
  const rest = await sources(convention, 50, first.page.nextCursor);
  assert.equal(rest.page.exhausted, true);
  const all = await sources(convention, 50);
  assert.deepEqual([...first.value.rows, ...rest.value.rows], all.value.rows);
  assert.equal(new Set(all.value.rows.map(row => row.path)).size, all.page.totalRows);
  assert(all.value.rows.every(row => row.projectKey === convention));
  assert(all.value.rows.some(row => row.path === 'src/my-app.html'));
  const inlineFiles = await sources(inline, 50);
  assert(inlineFiles.value.rows.every(row => row.projectKey === inline));
  assert(inlineFiles.value.rows.some(row => row.path === 'src/app.ts'));
  assert(!inlineFiles.value.rows.some(row => row.path === 'src/my-app.html'));
  const inlineFirst = await sources(inline, 1);
  assert.equal((await sources(inline, 1, 'start', 'invalid')).page.cursorProblem.kind, 'malformed');
  assert.deepEqual((await sources(inline, 1)).value.rows, inlineFirst.value.rows);
  assert.equal((await sources(inline, 1, first.page.nextCursor, 'invalid')).page.cursorProblem.kind, 'query-mismatch');

  const retained = await query(convention, 'resource-definitions', { detail: 'handles', appRetention: 'retain-app', page: { size: 50 } });
  assert(retained.value.rows.some(row => row.name === 'my-app' && row.source?.path === 'apps/convention/src/my-app.ts'
    && row.handles?.definitionProductHandle));
  assert(!retained.value.rows.some(row => row.name === 'release-card' || row.name === 'inline-app'));
  const other = await query(inline, 'resource-definitions', { page: { size: 50 } });
  assert(other.value.rows.some(row => row.name === 'inline-app' && row.source?.path === 'apps/inline/src/app.ts'));
  const vendor = other.value.rows.find(row => row.name === 'release-card');
  assert.equal(vendor?.targetName, 'ReleaseCard');
  assert.equal(vendor.source?.path, 'vendor/card-kit/src/index.js');
  assert(!other.value.rows.some(row => row.name === 'my-app'));
  const cache = await value('aurelia_analysis_cache_overview', { workspace });
  assert.deepEqual(cache.sessions.flatMap(s => s.analysisCache.value.cachedApps.map(app => app.projectKey)), [convention],
    'A one-off resource query on the inline app should leave only its explicitly retained neighbor cached.');

  const excluded = { workspaceRoot, excludedWorkspaceRoots: [inlineRoot] };
  const restricted = await overview(excluded);
  assert.deepEqual(restricted.value.appCandidates.map(p => p.projectKey), [convention]);
  assert(restricted.value.projects.some(p => p.projectKey === kit));
  assert(!restricted.value.projects.some(p => p.projectKey === inline));
  const denied = await call('aurelia_app_query', { ...excluded, projectKey: inline, queryKind: 'source-files' });
  assert.equal(denied.isError, true);
  assert(denied.structuredContent?.value?.error?.message?.includes(inline));

  const standalone = await probeStandaloneLibrary(workspaceRoot, conventionRoot, call, answer, overview);
  return { appProjects: [convention, inline], vendorSource: vendor.source.path, pagedSources: all.page.totalRows,
    retainedProject: convention, excludedProject: inline, standalone };
}

async function probeStandaloneLibrary(workspaceRoot, conventionRoot, call, answer, overview) {
  // Reuse the authored Vite component package with its bootstrap entry removed. The parent provides npm dependencies.
  const parent = path.resolve(workspaceRoot);
  const library = await mkdtemp(path.join(parent, '.mcp-library-'));
  assert.equal(path.dirname(library), parent);
  try {
    for (const entry of ['src', 'package.json', 'tsconfig.json', 'vite.config.ts']) {
      await cp(path.join(conventionRoot, entry), path.join(library, entry), {
        recursive: true, filter: file => path.resolve(file) !== path.resolve(conventionRoot, 'src/main.ts'),
      });
    }
    const { value: workspace } = await overview({ workspaceRoot: library });
    const [row] = workspace.projects;
    assert.equal(workspace.projects.length, 1);
    assert.equal(row.shapeKind, 'aurelia-resource-library');
    assert.equal(row.analysisKind, 'resource-library-authoring');
    assert.equal(workspace.defaultAppProjectKey, null);
    assert.equal(workspace.appCandidates.length, 0);
    const noApp = await call('aurelia_app_overview', { workspaceRoot: library });
    assert.equal(noApp.isError, true);
    assert.match(noApp.structuredContent?.value?.error?.message, /no aurelia-app project was found/i);

    const file = 'src/my-app.html';
    const markup = await readFile(path.join(library, file), 'utf8');
    const start = markup.indexOf('message');
    assert(start >= 0 && start === markup.lastIndexOf('message'));
    const lines = markup.slice(0, start).split('\n');
    const cursor = { filePath: file, line: lines.length - 1, character: lines.at(-1).length + 1 };
    const selected = await answer('aurelia_app_query', {
      workspaceRoot: library, projectKey: row.projectKey, includeAuthoringTemplates: true,
      authoringTemplateSourceFiles: [file], queryKind: 'template-cursor-info', cursor,
    });
    assert.equal(selected.selection, 'exact');
    assert.equal(selected.value.selectedMember?.name, 'message');
    assert.equal(selected.value.selectedMember.source?.path, 'src/my-app.ts');
    assert.equal(selected.value.activeSource?.start, start);
    assert.equal(selected.value.activeSource?.end, start + 'message'.length);
    return { shape: row.shapeKind, authoringMember: selected.value.selectedMember.name, declaration: selected.value.selectedMember.source.path };
  } finally {
    await rm(library, { recursive: true, force: true });
  }
}
