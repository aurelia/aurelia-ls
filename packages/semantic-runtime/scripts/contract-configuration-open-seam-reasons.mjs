import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/configuration-open-seam-reasons');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'configuration-open-seam-reasons-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'runtime-topology',
});

const sites = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  openSeamKindKey: 'configuration.open-configuration-option',
  page: { size: 20 },
}).value;

const reasonSite = sites.rows.find((row) =>
  row.reasonKinds.includes('static-evaluation-identifier-not-in-environment')
);
const attributeMapperSite = sites.rows.find((row) =>
  row.reasonKinds.includes('host-environment-value')
  && row.sampleSummary.includes('Attribute-mapper global mappings may contain additional attributes')
);

const failures = [
  reasonSite == null
    ? `Expected configuration option seam to preserve evaluator unresolved-identifier reason, observed ${JSON.stringify(sites.rows.map((row) => ({ seamKindKey: row.seamKindKey, reasonKinds: row.reasonKinds, sampleSummary: row.sampleSummary })))}.`
    : null,
  reasonSite?.source?.path?.endsWith('src/main.ts') === true
    ? null
    : `Expected reason-preserving seam to point at src/main.ts, observed ${JSON.stringify(reasonSite?.source)}.`,
  reasonSite?.sourceRange?.start?.line != null
    ? null
    : `Expected reason-preserving seam to expose source range, observed ${JSON.stringify(reasonSite?.sourceRange)}.`,
  attributeMapperSite == null
    ? `Expected the attribute-mapper domain seam to retain its host-environment evaluator cause, observed ${JSON.stringify(sites.rows.map((row) => ({ reasonKinds: row.reasonKinds, sampleSummary: row.sampleSummary })))}.`
    : null,
].filter(Boolean);

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    sites,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    reasonSite: {
      seamKindKey: reasonSite.seamKindKey,
      reasonKinds: reasonSite.reasonKinds,
      source: reasonSite.source?.label,
      sourceRange: reasonSite.sourceRange,
    },
    attributeMapperSite: {
      reasonKinds: attributeMapperSite.reasonKinds,
      source: attributeMapperSite.source?.label,
      sampleSummary: attributeMapperSite.sampleSummary,
    },
  }, null, 2));
}
