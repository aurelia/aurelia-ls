import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/evaluation-open-seam-reasons');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'evaluation-open-seam-reasons-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const sites = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  page: { size: 20 },
}).value;
const summary = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSummary,
  page: { size: 20 },
}).value;

const failures = [];

expectSiteReason(
  'evaluation.unresolved-identifier',
  'static-evaluation-identifier-not-in-environment',
);
expectSiteReason(
  'evaluation.unsupported-statement',
  'static-evaluation-unsupported-loop-statement',
);
expectSiteReason(
  'evaluation.unsupported-statement',
  'static-evaluation-unsupported-statement',
);
expectSiteReason(
  'evaluation.dynamic-mutation',
  'static-evaluation-unsupported-compound-assignment',
);
expectSiteReason(
  'evaluation.dynamic-mutation',
  'static-evaluation-dynamic-mutation',
);

if (summary.rows.some((row) => row.reasonKinds.length === 0)) {
  failures.push('Expected evaluation open-seam summary clusters to carry reasonKinds.');
}

function expectSiteReason(seamKindKey, reasonKind) {
  const row = sites.rows.find((candidate) =>
    candidate.seamKindKey === seamKindKey
    && candidate.reasonKinds.includes(reasonKind)
  );
  if (row == null) {
    failures.push(`Expected ${seamKindKey} seam site to carry reason kind ${reasonKind}.`);
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    sites,
    summary,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    siteReasons: sites.rows.map((row) => ({
      seamKindKey: row.seamKindKey,
      reasonKinds: row.reasonKinds,
      source: row.source?.label,
    })),
    summaryReasons: summary.rows.map((row) => ({
      seamKindKey: row.seamKindKey,
      reasonKinds: row.reasonKinds,
      count: row.count,
    })),
  }, null, 2));
}
