import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/di-registration-open-reasons');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'di-registration-open-reasons-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const raw = app.ask({
  kind: SemanticAppQueryKind.OpenSeams,
  page: { size: 20 },
}).value;
const sites = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  page: { size: 20 },
}).value;
const summary = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSummary,
  page: { size: 20 },
}).value;

const failures = [];

expectReason(
  sites.rows,
  'registration.open-strategy',
  'registration-strategy-open',
  'unique registration strategy seam site',
);
expectReason(
  raw.rows,
  'registration.open-strategy',
  'registration-strategy-open',
  'raw registration strategy seam row',
);
expectReason(
  summary.rows,
  'registration.open-strategy',
  'registration-strategy-open',
  'registration strategy summary cluster',
);
expectReason(
  sites.rows,
  'di.open-registry-body',
  'di-registry-body-open',
  'StandardConfiguration DI coverage site',
);
expectAbsentReason(sites.rows, 'di-registration-admission-open', 'translated DI admission reason');

for (const row of sites.rows) {
  if (row.source?.path?.endsWith('src/main.ts') !== true) {
    failures.push(`Expected seam site to point at src/main.ts, observed ${JSON.stringify(row.source)}.`);
  }
  if (row.sourceRange?.start?.line == null) {
    failures.push(`Expected seam site to expose source range, observed ${JSON.stringify(row.sourceRange)}.`);
  }
}

function expectReason(rows, seamKindKey, reasonKind, label) {
  const row = rows.find((candidate) =>
    rowHasSeamKind(candidate, seamKindKey)
    && candidate.reasonKinds.includes(reasonKind)
  );
  if (row == null) {
    failures.push(`Expected ${label} to carry ${reasonKind}, observed ${JSON.stringify(rows.map((candidate) => ({
      seamKindKeys: candidate.seamKindKeys ?? [candidate.seamKindKey],
      reasonKinds: candidate.reasonKinds,
      source: candidate.source?.label,
      sampleSummary: candidate.sampleSummary,
      summary: candidate.summary,
    })))}.`);
  }
}

function expectAbsentReason(rows, reasonKind, label) {
  if (rows.some((candidate) => candidate.reasonKinds.includes(reasonKind))) {
    failures.push(`Expected ${label} to be absent, observed ${JSON.stringify(rows)}.`);
  }
}

function rowHasSeamKind(row, seamKindKey) {
  return row.seamKindKey === seamKindKey
    || row.seamKindKeys?.includes(seamKindKey) === true;
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    raw,
    sites,
    summary,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    rawRows: raw.rows.map(rowSummary),
    siteRows: sites.rows.map(rowSummary),
    summaryRows: summary.rows.map(rowSummary),
  }, null, 2));
}

function rowSummary(row) {
  return {
    seamKindKeys: row.seamKindKeys ?? [row.seamKindKey],
    reasonKinds: row.reasonKinds,
    source: row.source?.label,
    sampleSummary: row.sampleSummary,
    summary: row.summary,
  };
}
