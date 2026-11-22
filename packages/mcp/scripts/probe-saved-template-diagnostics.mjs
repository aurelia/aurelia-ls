import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

// Read from the real connection. A tool error can itself contain structuredContent.value.
async function answer(client, name, args) {
  const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 120_000 });
  assert(!result.isError, result.content?.[0]?.text);
  const value = result.structuredContent?.value;
  assert.equal(value?.result, 'answered', value?.summary);
  assert.equal(value.coverage, 'complete', value.summary);
  return value;
}

async function templateFile(root, filePath) {
  const hostPath = path.join(root, filePath);
  const original = await readFile(hostPath, 'utf8');
  const marker = '${message}';
  const markerStart = original.indexOf(marker);
  assert(markerStart >= 0 && markerStart === original.lastIndexOf(marker), `Expected a unique ${marker} in ${filePath}`);
  const start = markerStart + 2;
  const wrong = 'mesage';
  const changed = original.slice(0, start) + wrong + original.slice(start + 'message'.length);
  const position = original.slice(0, start + 1).split('\n');
  return {
    root, filePath, hostPath, original, changed, wrong, start,
    cursor: { filePath, line: position.length - 1, character: position.at(-1).length },
  };
}

async function checkCursor(client, file) {
  const result = await answer(client, 'aurelia_template_cursor_info', { workspaceRoot: file.root, cursor: file.cursor });
  assert.equal(result.selection, 'exact');
  assert.equal(result.value.selectedMemberName, 'message');
  const { path: filePath, start, end } = result.value.activeSource;
  assert.deepEqual({ filePath, start, end }, { filePath: file.filePath, start: file.start, end: file.start + 'message'.length });
}

async function checkDiagnostics(client, file, hasTypo, { summary = false } = {}) {
  const params = { workspaceRoot: file.root, sourceFilePath: file.filePath, page: { size: 100 } };
  const started = performance.now();
  const diagnostics = await answer(client, 'aurelia_app_query', { ...params, queryKind: 'app-diagnostics' });
  const queryMilliseconds = Math.round(performance.now() - started);
  assert(diagnostics.page.exhausted, `Incomplete diagnostics in ${file.filePath}`);
  const rows = diagnostics.value.rows.map(row => ({
    kind: row.diagnosticKind, path: row.source?.path, start: row.source?.start, end: row.source?.end,
  }));
  const expected = hasTypo ? [{
    kind: 'missing-expression-member', path: file.filePath, start: file.start, end: file.start + file.wrong.length,
  }] : [];
  assert.deepEqual(rows, expected, `Default app diagnostics for ${file.filePath}`);
  if (summary) {
    const clusters = await answer(client, 'aurelia_app_query', { ...params, queryKind: 'app-diagnostic-summary' });
    assert.equal(clusters.value.totalDiagnosticRows, expected.length);
    assert.deepEqual(clusters.value.rows.map(row => row.diagnosticKind), expected.map(row => row.kind));
  }
  return { rows, queryMilliseconds };
}

/** Compare a Vite convention template with the identical member spelling in another app's inline template. */
export async function probeSavedTemplateDiagnostics(client, roots, withFreshClient) {
  const external = await templateFile(roots.conventionRoot, 'src/my-app.html');
  const inline = await templateFile(roots.inlineRoot, 'src/app.ts');
  const states = [];
  for (const [file, other] of [[external, inline], [inline, external]]) {
    await checkCursor(client, file);
    const clean = await checkDiagnostics(client, file, false);
    try {
      await writeFile(file.hostPath, file.changed, 'utf8');
      const changed = await checkDiagnostics(client, file, true, { summary: true });
      const warm = await checkDiagnostics(client, file, true);
      await checkDiagnostics(client, other, false);
      const cold = await withFreshClient(fresh => checkDiagnostics(fresh, file, true));
      assert.deepEqual(cold.rows, warm.rows);
      states.push({ file: file.filePath, clean, changed, warm, cold });
    } finally {
      await writeFile(file.hostPath, file.original, 'utf8');
    }
    states.at(-1).restored = await checkDiagnostics(client, file, false, { summary: true });
    await checkCursor(client, file);
  }
  return states;
}
