import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';
import { FrameworkProductDetails } from '../out/framework/product-details.js';

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
  detail: 'handles',
  page: { size: 20 },
}).value;
const serviceRootDetails = runtime.workspace.store.productDetails
  .readBySlot(FrameworkProductDetails.ServiceRoot)
  .map((entry) => entry.detail);

const failures = [];
const frameworkCodes = countBy(fetchClientIssues.rows, (row) => row.frameworkErrorCode);
const expectedCodes = new Map([
  ['AUR5001', 1],
  ['AUR5002', 2],
  ['AUR5003', 1],
  ['AUR5004', 1],
  ['AUR5005', 1],
  ['AUR5007', 1],
  ['AUR5008', 1],
]);

const expectedIssueCount = [...expectedCodes.values()].reduce((sum, count) => sum + count, 0);

if (fetchClientIssues.rows.length !== expectedIssueCount) {
  failures.push(`Expected ${expectedIssueCount} source-backed fetch-client issues, observed ${fetchClientIssues.rows.length}.`);
}

for (const [code, expectedCount] of expectedCodes) {
  const count = frameworkCodes.get(code) ?? 0;
  if (count !== expectedCount) {
    failures.push(`Expected ${expectedCount} ${code} row(s), observed ${count}.`);
  }
}

if (fetchClientIssues.rows.some((row) => row.source?.path !== 'src/fetch-client-config-errors-app.ts')) {
  failures.push('Expected every fetch-client issue to retain an exact app source file span.');
}
const ownerRows = fetchClientIssues.rows.filter((row) => row.handles?.ownerIdentityHandle != null);
if (ownerRows.length !== expectedIssueCount) {
  failures.push(`Expected every fetch-client source issue to carry a framework.service-root owner handle, observed ${ownerRows.length}.`);
}
if (!serviceRootDetails.some((root) => root.rootKind === 'service' && root.serviceKeyName === 'HttpClient' && root.basis === 'direct-constructor')) {
  failures.push('Expected a direct-constructor HttpClient framework.service-root product.');
}
if (!serviceRootDetails.some((root) => root.rootKind === 'service' && root.serviceKeyName === 'IHttpClient' && root.basis === 'container-get-backed')) {
  failures.push('Expected a container-get-backed IHttpClient framework.service-root product.');
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
      serviceRoots: serviceRootDetails.length,
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
