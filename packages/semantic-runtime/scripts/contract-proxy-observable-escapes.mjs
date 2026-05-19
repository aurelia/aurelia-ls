import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSemanticRuntime } from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/proxy-observable-escapes');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'proxy-observable-escapes-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const escapes = app.ask({
  kind: 'proxy-observable-escapes',
  page: { size: 100 },
}).value.rows;

const failures = [
  countExpectation(escapes, 2),
  escapeExpectation(
    'ProxyObservable.getRaw should be published as a source-level proxy escape fact.',
    escapes,
    'getRaw',
    'this',
    'this.state.schema',
  ),
  escapeExpectation(
    'ProxyObservable.unwrap should be published as a source-level proxy escape fact.',
    escapes,
    'unwrap',
    'this',
    'this.state.selected',
  ),
].filter(Boolean);

const summary = {
  fixture: 'proxy-observable-escapes',
  escapes: escapes.map((row) => ({
    escapeKind: row.escapeKind,
    argumentRootName: row.argumentRootName,
    argumentSourceName: row.argumentSourceName,
    source: row.source?.label ?? null,
  })),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

function countExpectation(rows, count) {
  return rows.length === count
    ? null
    : `Expected ${count} ProxyObservable escape rows; observed ${rows.length}.`;
}

function escapeExpectation(summary, rows, escapeKind, argumentRootName, argumentSourceName) {
  const row = rows.find((candidate) =>
    candidate.escapeKind === escapeKind
    && candidate.argumentRootName === argumentRootName
    && candidate.argumentSourceName === argumentSourceName
  );
  return row == null
    ? `${summary}: missing ${escapeKind}/${argumentRootName}/${argumentSourceName}.`
    : null;
}
