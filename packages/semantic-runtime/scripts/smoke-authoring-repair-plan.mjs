import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AuthoringVerificationRequest,
  buildAuthoringRepairPlan,
  createSemanticRuntime,
  expectedSemanticEffectsForPlan,
  readAuthoringVerificationSnapshot,
  verifyAuthoringEffects,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const fixtureRoot = 'packages/semantic-runtime/fixtures/pressure/mixed-form-surfaces';

const runtime = await createSemanticRuntime({
  workspaceRoot,
  storeKey: 'mixed-form-repair-plan-smoke',
  projects: [{
    rootDir: fixtureRoot,
    projectKey: 'mixed-form-surfaces',
  }],
});

const app = await runtime.openApp({ projectKey: 'mixed-form-surfaces' });
const orientation = app.ask({ kind: 'authoring-orientation' }).value;
const clusters = orientation.repairClusters;
const plan = buildAuthoringRepairPlan({
  summary: 'Repair mixed form semantic pressure.',
  clusters,
});
const expectedEffects = expectedSemanticEffectsForPlan(plan);
const snapshot = readAuthoringVerificationSnapshot(app);
const verification = verifyAuthoringEffects(
  new AuthoringVerificationRequest(plan.expectedTopology, expectedEffects),
  snapshot,
);

const failures = [];
if (clusters.length === 0) {
  failures.push('Expected mixed fixture to produce repair clusters.');
}
if (plan.steps.length !== clusters.length) {
  failures.push(`Expected ${clusters.length} repair steps, received ${plan.steps.length}.`);
}
if (expectedEffects.length !== clusters.length) {
  failures.push(`Expected ${clusters.length} repair closure effects, received ${expectedEffects.length}.`);
}
if (plan.steps.some((step) => step.operation.kind !== 'repair-app')) {
  failures.push('Every repair-plan step should use repair-app operations.');
}
const preRepairFailures = verification.effectResults.filter((result) => result.outcome === 'failed').length;
if (preRepairFailures !== clusters.length) {
  failures.push(`Expected every repair effect to fail before repair, received ${preRepairFailures} failed effect(s).`);
}

const summary = {
  fixtureRoot,
  repairClusters: clusters.length,
  repairSteps: plan.steps.length,
  expectedEffects: expectedEffects.length,
  preRepairFailures,
  planKinds: countBy(clusters, (cluster) => cluster.planKind),
  changeDomains: countBy(clusters, (cluster) => cluster.changeDomain),
  planReadiness: countBy(clusters, (cluster) => cluster.planReadiness),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

function countBy(values, readKey) {
  const counts = {};
  for (const value of values) {
    const key = readKey(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
