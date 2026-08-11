import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';
import {
  EMPTY_SEMANTIC_PROJECT_FINDING_POLICY,
  SemanticProjectFindingRuleId,
} from '../out/findings/analysis-limitation-policy.js';
import {
  projectSemanticAnalysisLimitations,
} from '../out/findings/analysis-limitation-projection.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const pressureRoot = path.join(packageRoot, 'fixtures/pressure');
const fixtureRoot = path.join(pressureRoot, 'service-root-open-spread-local');

const app = await openFixture('service-root-open-spread-local', 'analysis-limitations:default');
const limitations = app.ask({
  kind: SemanticAppQueryKind.AnalysisLimitations,
  page: { size: 20 },
});
const [limitation] = limitations.value.rows;

assert.equal(limitations.value.projectKey, 'service-root-open-spread-local');
assert.equal(limitations.value.policyFile.exists, false);
assert.ok(limitations.value.policyFile.filePath.endsWith('/aurelia.project.json'));
assert.equal(limitations.value.candidateCount, 1);
assert.equal(limitations.value.suppressedCandidateCount, 0);
assert.equal(limitations.value.rows.length, 1);
assert.deepEqual(limitations.value.effectivePolicies, [{
  ruleId: SemanticProjectFindingRuleId.DynamicRegistrationSpread,
  disposition: 'information',
  authority: 'default',
  source: null,
}]);
assert.equal(
  limitation.findingKey,
  'analysis-limitation:["aurelia.analysis.dynamic-registration-spread","service-root-open-spread-local","src/main.ts",619,640]',
);
assert.equal(limitation.ruleId, SemanticProjectFindingRuleId.DynamicRegistrationSpread);
assert.equal(limitation.authority, 'semantic-runtime-rule');
assert.equal(limitation.currentCoverage, 'open');
assert.equal(limitation.source.path, 'src/main.ts');
assert.equal(limitation.source.start, 619);
assert.equal(limitation.source.end, 640);
assert.deepEqual(limitation.sourceRange, {
  start: { line: 22, character: 4 },
  end: { line: 22, character: 25 },
});
assert.deepEqual(limitation.reason.seamKindKeys, ['registration.open-spread']);
assert.deepEqual(limitation.reason.boundaryKinds, ['runtime-execution-boundary']);
assert.deepEqual(limitation.reason.reasonKinds, ['static-evaluation-dynamic-call']);
assert.deepEqual(
  limitation.evidence.products.map((product) => product.productKindKey),
  ['configuration.sequence'],
);
assert.equal('severity' in limitation, false, 'Semantic limitation rows must remain neutral; policy disposition is not a severity field.');

const rawSeams = app.ask({
  kind: SemanticAppQueryKind.OpenSeams,
  page: { size: 20 },
}).value.rows;
assert.equal(rawSeams.length, 2, 'The finding projection must conserve both raw seam facts.');
assert.deepEqual(
  [...new Set(rawSeams.map((row) => row.pressureKind))].sort(),
  ['evidence-only', 'product-pressure'],
  'Evidence-only and product-pressure remain distinct raw evidence dimensions.',
);
assert.deepEqual(limitation.evidence.seamKeys, [
  rawSeams.find((row) => row.pressureKind === 'product-pressure').seamKey,
]);

const sourceFilteredAnswer = app.ask({
  kind: SemanticAppQueryKind.AnalysisLimitations,
  sourceFile: { filePath: 'src/main.ts' },
  page: { size: 20 },
});
const sourceFiltered = sourceFilteredAnswer.value;
const otherSourceFiltered = app.ask({
  kind: SemanticAppQueryKind.AnalysisLimitations,
  sourceFile: { filePath: 'src/app.ts' },
  page: { size: 20 },
}).value;
assert.equal(sourceFiltered.rows.length, 1);
assert.equal(otherSourceFiltered.candidateCount, 0);
assert.equal(otherSourceFiltered.rows.length, 0);
for (const targetKind of [SemanticAppQueryKind.AppDiagnostics, SemanticAppQueryKind.OpenSeamSites]) {
  const continuation = sourceFilteredAnswer.continuations.find((row) => row.targetQueryKind === targetKind);
  assert.ok(continuation, `Expected analysis limitations to continue to ${targetKind}.`);
  assert.equal(
    continuation.targetQuery.sourceFile.filePath,
    'src/main.ts',
    `Expected ${targetKind} audit/presentation continuation to retain the source-file locus.`,
  );
}

const overview = app.ask({ kind: SemanticAppQueryKind.AppOverview }).value;
assert.equal(overview.analysisLimitations.value.rows.length, 1);
assert.equal(overview.openSeams.value.rows.length, 0, 'Normal overview must retain raw seam audit data without sampling rows.');
assert.match(overview.displayText, /including 1 configured analysis limitation/);
assert.match(overview.displayText, /Analysis limitation samples:/);
assert.doesNotMatch(overview.displayText, /raw derivation|Open seam samples|open seam site\(s\)/);

const explicitAuditOverview = app.ask({
  kind: SemanticAppQueryKind.AppOverview,
  analysisLimitationPageSize: 0,
  openSeamPageSize: 5,
}).value;
assert.equal(explicitAuditOverview.analysisLimitations.value.rows.length, 0);
assert.equal(explicitAuditOverview.openSeams.value.rows.length, 1);

const diagnostics = app.ask({
  kind: SemanticAppQueryKind.AppDiagnostics,
  page: { size: 100 },
}).value.rows;
const limitationDiagnostic = diagnostics.find((row) =>
  row.diagnosticKind === SemanticProjectFindingRuleId.DynamicRegistrationSpread
);
assert.ok(limitationDiagnostic);
assert.equal(limitationDiagnostic.diagnosticDomain, 'analysis');
assert.equal(limitationDiagnostic.diagnosticAuthority, 'semantic-authoring-policy');
assert.equal(limitationDiagnostic.severity, 'information');
assert.equal(limitationDiagnostic.relatedQueryKind, SemanticAppQueryKind.AnalysisLimitations);
assert.equal(limitationDiagnostic.source.start, 619);

for (const fixtureName of ['observer-setup-selection', 'di-custom-template-compiler']) {
  const excludedApp = await openFixture(fixtureName, `analysis-limitations:excluded:${fixtureName}`);
  const excludedRaw = excludedApp.ask({
    kind: SemanticAppQueryKind.OpenSeams,
    page: { size: 200 },
  }).value.rows;
  const excluded = excludedApp.ask({
    kind: SemanticAppQueryKind.AnalysisLimitations,
    page: { size: 20 },
  }).value;
  assert.ok(
    excludedRaw.some((row) => row.pressureKind === 'product-pressure'),
    `${fixtureName} must retain unrelated product-pressure evidence for the adversarial exclusion.`,
  );
  assert.equal(excluded.candidateCount, 0, `${fixtureName} product pressure is not an admitted limitation rule.`);
  assert.equal(excluded.rows.length, 0);
}

const syntheticProjection = projectSemanticAnalysisLimitations(
  syntheticAdversarialFacts(),
  EMPTY_SEMANTIC_PROJECT_FINDING_POLICY,
  () => ({
    start: { line: 2, character: 4 },
    end: { line: 2, character: 12 },
  }),
);
assert.equal(syntheticProjection.candidateCount, 1, 'Only the explicit rule predicate may admit a synthetic candidate.');
assert.equal(syntheticProjection.rows.length, 1);
assert.equal(syntheticProjection.rows[0].evidence.seamKeys.length, 2, 'Repeated derivations at one exact site must remain one finding with conserved evidence.');

await withConfiguredFixture('off', async (configuredApp) => {
  const suppressed = configuredApp.ask({
    kind: SemanticAppQueryKind.AnalysisLimitations,
    page: { size: 20 },
  }).value;
  assert.equal(suppressed.policyFile.exists, true);
  assert.equal(suppressed.candidateCount, 1);
  assert.equal(suppressed.suppressedCandidateCount, 1);
  assert.equal(suppressed.rows.length, 0);
  assert.equal(suppressed.effectivePolicies[0].authority, 'project-configuration');
  assert.equal(suppressed.effectivePolicies[0].disposition, 'off');
  assert.ok(suppressed.effectivePolicies[0].source.filePath.endsWith('/aurelia.project.json'));

  const stillRaw = configuredApp.ask({
    kind: SemanticAppQueryKind.OpenSeams,
    page: { size: 20 },
  }).value.rows;
  assert.equal(stillRaw.length, 2, 'Policy suppression must not delete either underlying seam fact.');

  const configuredDiagnostics = configuredApp.ask({
    kind: SemanticAppQueryKind.AppDiagnostics,
    page: { size: 100 },
  }).value.rows;
  assert.equal(
    configuredDiagnostics.some((row) => row.diagnosticKind === SemanticProjectFindingRuleId.DynamicRegistrationSpread),
    false,
    'Off candidates must never enter AppDiagnostics.',
  );
});

await withConfiguredFixture('warning', async (configuredApp) => {
  const configured = configuredApp.ask({
    kind: SemanticAppQueryKind.AnalysisLimitations,
    page: { size: 20 },
  }).value;
  assert.equal(configured.rows[0].effectivePolicy.disposition, 'warning');
  assert.equal(configured.rows[0].effectivePolicy.authority, 'project-configuration');
  const configuredDiagnostics = configuredApp.ask({
    kind: SemanticAppQueryKind.AppDiagnostics,
    page: { size: 100 },
  }).value.rows;
  assert.equal(
    configuredDiagnostics.find((row) => row.diagnosticKind === SemanticProjectFindingRuleId.DynamicRegistrationSpread)?.severity,
    'warning',
  );
});

console.log(JSON.stringify({
  ok: true,
  ruleId: limitation.ruleId,
  findingKey: limitation.findingKey,
  affectedProductKinds: limitation.evidence.products.map((product) => product.productKindKey),
  rawSeamsConserved: rawSeams.length,
  unrelatedProductPressureFixtures: 2,
  configuredPolicies: ['off', 'warning'],
}, null, 2));

async function openFixture(fixtureName, storeKey) {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(pressureRoot, fixtureName),
    storeKey,
  });
  return runtime.openApp({ analysisDepth: 'binding-observation' });
}

async function withConfiguredFixture(disposition, callback) {
  const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), 'aurelia-ls-analysis-limitations-'));
  const tempRoot = path.join(tempParent, 'configured-app');
  try {
    fs.cpSync(fixtureRoot, tempRoot, { recursive: true });
    fs.writeFileSync(path.join(tempRoot, 'aurelia.project.json'), `${JSON.stringify({
      version: 2,
      findings: {
        [SemanticProjectFindingRuleId.DynamicRegistrationSpread]: disposition,
      },
    }, null, 2)}\n`);
    const runtime = await createSemanticRuntime({
      workspaceRoot: tempRoot,
      storeKey: `analysis-limitations:configured:${disposition}`,
    });
    const configuredApp = await runtime.openApp({ analysisDepth: 'binding-observation' });
    await callback(configuredApp);
  } finally {
    fs.rmSync(tempParent, { recursive: true, force: true });
  }
}

function syntheticAdversarialFacts() {
  const source = syntheticSource('app-source');
  const match = syntheticFact({ seamKey: 'seam:match-a', source });
  return [
    match,
    syntheticFact({ seamKey: 'seam:match-b', impactKey: 'impact:match-b', productKey: 'product:match-b', source }),
    syntheticFact({ seamKey: 'seam:evidence-only', pressureKind: 'evidence-only', source }),
    syntheticFact({ seamKey: 'seam:external', source: syntheticSource('external-source') }),
    syntheticFact({ seamKey: 'seam:tool-coverage', boundaryKinds: ['unsupported-substrate'], source }),
    syntheticFact({ seamKey: 'seam:unrelated-product', productKindKey: 'binding.data-flow', source }),
  ];
}

function syntheticFact({
  seamKey,
  impactKey = 'impact:match',
  productKey = 'product:match',
  productKindKey = 'configuration.sequence',
  pressureKind = 'product-pressure',
  boundaryKinds = ['runtime-execution-boundary'],
  source,
}) {
  return {
    seam: null,
    seamKey,
    siteKey: 'source-site:["synthetic-project","src/main.ts",20,28]',
    seamKindKey: 'registration.open-spread',
    summary: 'Synthetic dynamic registration spread.',
    boundaryKinds,
    reasonKinds: ['static-evaluation-dynamic-call'],
    reasonSources: [],
    pressureKind,
    impacts: [{
      impactKey,
      outcome: 'open-with-product',
      owner: { ownerKey: 'owner:configuration', recordKind: 'identity', label: 'configuration', source },
      products: [{
        productKey,
        product: { productKindKey },
        source,
      }],
    }],
    source,
    sourceRole: source.sourceFileRole,
  };
}

function syntheticSource(sourceFileRole) {
  return {
    kind: 'source-span-address',
    label: 'src/main.ts@20..28',
    path: 'src/main.ts',
    start: 20,
    end: 28,
    sourceWorkspaceKey: 'synthetic-project',
    sourceFileRole,
  };
}
