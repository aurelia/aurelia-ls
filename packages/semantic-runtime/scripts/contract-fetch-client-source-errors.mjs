import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/fetch-client-config-errors');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'fetch-client-source-errors-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-targets',
});
const fetchClientIssues = app.ask({
  kind: SemanticAppQueryKind.FetchClientIssues,
  page: { size: 20 },
}).value;

const failures = [];
const frameworkCodes = countBy(fetchClientIssues.rows, (row) => row.frameworkErrorCode);
const expectedCodes = ['AUR5001', 'AUR5002', 'AUR5003', 'AUR5004', 'AUR5005', 'AUR5007', 'AUR5008'];

if (fetchClientIssues.rows.length !== expectedCodes.length) {
  failures.push(`Expected ${expectedCodes.length} source-backed fetch-client issues, observed ${fetchClientIssues.rows.length}.`);
}

for (const code of expectedCodes) {
  const count = frameworkCodes.get(code) ?? 0;
  if (count !== 1) {
    failures.push(`Expected exactly one ${code} row, observed ${count}.`);
  }
}

if (fetchClientIssues.rows.some((row) => row.source?.path !== 'src/fetch-client-config-errors-app.ts')) {
  failures.push('Expected every fetch-client issue to retain an exact app source file span.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    fetchClientIssues,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      fetchClientIssues: fetchClientIssues.rows.length,
      frameworkCodes: Object.fromEntries(frameworkCodes),
    },
  }, null, 2));
}

function countBy(rows, read) {
  const counts = new Map();
  for (const row of rows) {
    const key = read(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
