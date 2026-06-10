import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/resource-import-meta-dependencies');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'resource-import-meta-dependencies-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const seamSites = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  openSeamKindKey: 'resource.open-definition-field',
  page: { size: 20 },
}).value;
const allSeams = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  page: { size: 50 },
}).value;

const resourceDependencySite = seamSites.rows.find((row) =>
  row.reasonKinds.includes('resource-definition-dependencies-open')
);
const evaluatorNoise = allSeams.rows.filter((row) =>
  row.seamKindKey === 'evaluation.unsupported-expression'
);

const failures = [
  resourceDependencySite == null
    ? 'Expected import.meta-dependent dependencies spread to publish a resource dependency reason kind.'
    : null,
  resourceDependencySite?.sampleSummary.includes('import.meta.env.DEV')
    ? null
    : 'Expected import.meta-dependent dependencies spread to retain the host environment condition in the resource seam summary.',
  evaluatorNoise.length === 0
    ? null
    : 'Expected import.meta dependency spread to avoid evaluator unsupported-expression seam noise.',
].filter(Boolean);

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    seamSites,
    allSeams,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    resourceDependencySite: {
      seamKindKey: resourceDependencySite.seamKindKey,
      reasonKinds: resourceDependencySite.reasonKinds,
      sampleSummary: resourceDependencySite.sampleSummary,
      source: resourceDependencySite.source?.label,
    },
    totalOpenSeamSites: allSeams.totalOpenSeamSites,
  }, null, 2));
}
