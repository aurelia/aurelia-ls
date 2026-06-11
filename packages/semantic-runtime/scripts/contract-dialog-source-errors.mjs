import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/dialog-source-errors');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'dialog-source-errors-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-targets',
});
const dialogIssues = app.ask({
  kind: SemanticAppQueryKind.DialogIssues,
  page: { size: 20 },
}).value;

const failures = [];
const frameworkCodes = countBy(dialogIssues.rows, (row) => row.frameworkErrorCode);
const settingsInvalidRows = dialogIssues.rows.filter((row) =>
  row.frameworkErrorCode === 'AUR0903'
  && row.issueKind === 'settings-invalid'
);
if (dialogIssues.rows.length !== 4) {
  failures.push(`Expected dialog-source-errors to publish four source-backed dialog issues, observed ${dialogIssues.rows.length}.`);
}
if (frameworkCodes.get('AUR0903') !== 2) {
  failures.push(`Expected two AUR0903 rows: root no-base open plus invalid child-base open, observed ${frameworkCodes.get('AUR0903') ?? 0}.`);
}
if (frameworkCodes.get('AUR0904') !== 1) {
  failures.push(`Expected one AUR0904 row for bare DialogConfiguration, observed ${frameworkCodes.get('AUR0904') ?? 0}.`);
}
if (frameworkCodes.get('AUR0910') !== 1) {
  failures.push(`Expected one AUR0910 row for missing child key, observed ${frameworkCodes.get('AUR0910') ?? 0}.`);
}
if (settingsInvalidRows.some((row) => row.source?.path !== 'src/main.ts')) {
  failures.push('Expected AUR0903 rows to retain exact src/main.ts source spans.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    dialogIssues,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      dialogIssues: dialogIssues.rows.length,
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
