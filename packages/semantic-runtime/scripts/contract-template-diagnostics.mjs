import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AuthoringVerificationRequest,
  createSemanticRuntime,
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
  readAuthoringVerificationSnapshot,
  verifyAuthoringEffects,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const weakOwnerFixtureRoot = path.join(packageRoot, 'fixtures/pressure/weak-owner-repair-planning');
const mixedFormFixtureRoot = path.join(packageRoot, 'fixtures/pressure/mixed-form-surfaces');
const syntheticWritebackFixtureRoot = path.join(packageRoot, 'fixtures/pressure/synthetic-writeback-local');
const viewFactoryProviderFixtureRoot = path.join(packageRoot, 'fixtures/pressure/runtime-html-view-factory-provider-errors');

const contracts = [
  await verifyFixture(
    weakOwnerFixtureRoot,
    'template-diagnostics-contract:weak-owner',
    [
      ExpectedSemanticEffect.exactly(
        'Weak repeat-local owner typing should surface as two template diagnostic rows.',
        'template-diagnostic',
        'template',
        2,
        null,
        [
          effectFilter('diagnosticKind', 'weak-expression-member-owner'),
          effectFilter('missingInput', 'expression-member-owner-type:missing-slot-type'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'Missing repeat-local slot type diagnostics should propose declaring the scope slot type.',
        'template-diagnostic',
        'template',
        2,
        null,
        [
          effectFilter('suggestion.suggestionKind', 'declare-scope-slot-type'),
          effectFilter('suggestion.actionKind', 'declare-scope-slot'),
          effectFilter('suggestion.actionTarget.targetKind', 'scope-slot'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'Any-typed member owners should target the authored type annotation when that source is known.',
        'template-diagnostic',
        'template',
        2,
        null,
        [
          effectFilter('diagnosticKind', 'weak-expression-member-owner'),
          effectFilter('missingInput', 'expression-member-owner-type:any'),
          effectFilter('selectedMemberName', 'label'),
          effectFilter('suggestion.suggestionKind', 'replace-any-owner'),
          effectFilter('suggestion.actionKind', 'replace-owner-type'),
          effectFilter('suggestion.actionTarget.targetKind', 'owner-type'),
          effectFilter('suggestion.actionTarget.source.path', 'src/weak-owner-repair-app.ts'),
          effectFilter('suggestion.actionTarget.source.role', 'type'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'Any-typed repeat locals should preserve the iterable owner source as the repair target.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'weak-expression-member-owner'),
          effectFilter('missingInput', 'expression-member-owner-type:any'),
          effectFilter('selectedMemberName', 'name'),
          effectFilter('suggestion.suggestionKind', 'replace-any-owner'),
          effectFilter('suggestion.actionKind', 'replace-owner-type'),
          effectFilter('suggestion.actionTarget.targetKind', 'owner-type'),
          effectFilter('suggestion.actionTarget.source.path', 'src/weak-owner-repair-app.ts'),
          effectFilter('suggestion.actionTarget.source.role', 'type'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.atLeast(
        'Binding observed dependencies for any-typed member reads should preserve the owner source route.',
        'binding-observed-dependency',
        'template',
        1,
        null,
        [
          effectFilter('sourceName', 'untypedRow.label'),
          effectFilter('observedMemberKind', 'property'),
          effectFilter('observedMemberSource.path', 'src/weak-owner-repair-app.ts'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'Index-signature-only owners should target the TypeScript owner surface instead of the template expression.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'weak-expression-member-owner'),
          effectFilter('missingInput', 'expression-member-owner-type:index-signature-only'),
          effectFilter('selectedMemberName', 'status'),
          effectFilter('suggestion.suggestionKind', 'declare-explicit-member'),
          effectFilter('suggestion.actionKind', 'declare-member'),
          effectFilter('suggestion.actionTarget.targetKind', 'owner-type'),
          effectFilter('suggestion.actionTarget.source.path', 'src/weak-owner-repair-app.ts'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.absent(
        'Weak missing-slot diagnostics should not masquerade as a missing concrete label member.',
        'template-diagnostic',
        'template',
        null,
        [
          effectFilter('diagnosticKind', 'missing-expression-member'),
          effectFilter('selectedMemberName', 'label'),
        ],
      ),
      ExpectedSemanticEffect.absent(
        'Weak missing-slot diagnostics should not masquerade as a missing concrete status member.',
        'template-diagnostic',
        'template',
        null,
        [
          effectFilter('diagnosticKind', 'missing-expression-member'),
          effectFilter('selectedMemberName', 'status'),
        ],
      ),
      ExpectedSemanticEffect.exactly(
        'A typed non-weak owner with a missing member should suggest inspecting the owner expression instead of replacing a weak owner type.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'missing-expression-member'),
          effectFilter('selectedMemberName', 'missing'),
          effectFilter('suggestion.suggestionKind', 'inspect-owner-type'),
          effectFilter('suggestion.actionKind', 'inspect-owner-type'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'Weak owner repair clustering should preserve one scope-slot target with both observed member hints.',
        'authoring-repair',
        'authoring',
        1,
        null,
        [
          effectFilter('planKind', 'template-scope-slot-typing'),
          effectFilter('actionTargetKind', 'scope-slot'),
          effectFilter('targetMemberNames', 'label'),
          effectFilter('targetMemberNames', 'status'),
        ],
        'signature',
      ),
    ],
  ),
  await verifyFixture(
    mixedFormFixtureRoot,
    'template-diagnostics-contract:mixed-form',
    [
      ExpectedSemanticEffect.exactly(
        'Target-to-source type mismatches should surface as assignment strictness diagnostics.',
        'template-diagnostic',
        'template',
        2,
        null,
        [
          effectFilter('diagnosticKind', 'binding-source-assignment-strictness'),
          effectFilter('missingInput', 'binding-source-assignment:target-to-source-type-mismatch'),
          effectFilter('suggestion.actionKind', 'change-member-type'),
          effectFilter('suggestion.actionTarget.targetKind', 'owner-type'),
          effectFilter('suggestion.actionTarget.source.path', 'src/components/ticket-editor.ts'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.atLeast(
        'Binding data-flow rows should preserve the declaration source for assignment repair targets.',
        'binding-data-flow',
        'template',
        2,
        null,
        [
          effectFilter('sourceAssignmentReasonKinds', 'target-to-source-type-mismatch'),
          effectFilter('sourceAssignmentTargetSource.path', 'src/components/ticket-editor.ts'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'The fulfillment setter diagnostic should target the authored fulfillmentMethod accessor.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'binding-source-assignment-strictness'),
          effectFilter('selectedMemberName', 'fulfillmentMethod'),
          effectFilter('suggestion.actionTarget.source.path', 'src/components/ticket-editor.ts'),
        ],
        'signature',
      ),
      ExpectedSemanticEffect.exactly(
        'The number input diagnostic should target the authored priority accessor.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'binding-source-assignment-strictness'),
          effectFilter('selectedMemberName', 'priority'),
          effectFilter('suggestion.actionTarget.source.path', 'src/components/ticket-editor.ts'),
        ],
        'signature',
      ),
    ],
  ),
  await verifyFixture(
    syntheticWritebackFixtureRoot,
    'template-diagnostics-contract:synthetic-writeback-local',
    [
      ExpectedSemanticEffect.absent(
        'Typed synthetic writeback locals should not surface missing slot-type diagnostics after the assigning binding.',
        'template-diagnostic',
        'template',
        null,
        [
          effectFilter('missingInput', 'expression-member-owner-type:missing-slot-type'),
        ],
      ),
      ExpectedSemanticEffect.atLeast(
        'Synthetic writeback repeat locals should retain the bindable member type for nested member reads.',
        'binding-data-flow',
        'template',
        1,
        null,
        [
          effectFilter('sourceName', 'row.label'),
          effectFilter('sourceType', 'string'),
        ],
        'signature',
      ),
    ],
  ),
  await verifyFixture(
    viewFactoryProviderFixtureRoot,
    'template-diagnostics-contract:view-factory-provider',
    [
      ExpectedSemanticEffect.exactly(
        'Only activation-time IViewFactory resolution on ordinary resources should claim AUR0755.',
        'template-diagnostic',
        'template',
        1,
        null,
        [
          effectFilter('diagnosticKind', 'runtime-controller-framework-error'),
          effectFilter('frameworkErrorCode', 'AUR0755'),
          effectFilter('missingInput', 'runtime-controller:AUR0755'),
        ],
        'signature',
      ),
    ],
  ),
];

const failures = contracts.flatMap((contract) => contract.verification.effectResults
  .filter((result) => result.outcome !== 'satisfied')
  .map((result) => `${contract.fixture}: ${result.summary}`)
  .concat(contract.repairClusterKeyFailures.map((failure) => `${contract.fixture}: ${failure}`)));

const summary = {
  contracts: contracts.map((contract) => ({
    fixture: contract.fixture,
    expectedEffects: contract.expectedEffects,
    repairClusterKeyFailures: contract.repairClusterKeyFailures,
    verification: contract.verification.effectResults.map((result) => ({
      effectKind: result.expectedEffect.effectKind,
      outcome: result.outcome,
      summary: result.summary,
    })),
  })),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

function effectFilter(field, value) {
  return new ExpectedSemanticEffectFilter(field, value);
}

async function verifyFixture(fixtureRoot, storeKey, expectedEffects) {
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    storeKey,
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  const snapshot = readAuthoringVerificationSnapshot(app);
  const verification = verifyAuthoringEffects(
    new AuthoringVerificationRequest(null, expectedEffects),
    snapshot,
  );
  return {
    fixture: path.basename(fixtureRoot),
    expectedEffects: expectedEffects.length,
    verification,
    repairClusterKeyFailures: repairClusterKeyContractFailures(snapshot.authoringOrientation.repairClusters),
  };
}

function repairClusterKeyContractFailures(repairClusters) {
  const failures = [];
  for (const cluster of repairClusters) {
    if (typeof cluster.key !== 'string' || cluster.key.length === 0) {
      failures.push('Repair cluster keys should be non-empty strings.');
      continue;
    }
    if (cluster.key.length > 180) {
      failures.push(`Repair cluster key should stay compact. Observed ${cluster.key.length} characters.`);
    }
    if (/[\\/]|%2f|%5c|\.ts|sourceAddress|source-span/i.test(cluster.key)) {
      failures.push(`Repair cluster key should not transport source paths or encoded source spans: ${cluster.key}`);
    }
    if (!Array.isArray(cluster.actionTargets) || cluster.actionTargets.length === 0) {
      failures.push(`Repair cluster ${cluster.key} should carry structured action targets instead of encoding the target in the key.`);
    }
  }
  return failures;
}
