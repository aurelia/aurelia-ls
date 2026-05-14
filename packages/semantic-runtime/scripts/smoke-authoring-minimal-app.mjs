import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeAuthoringSourcePlan } from './authoring-source-plan-writer.mjs';
import {
  AuthoringVerificationRequest,
  buildMinimalAppPlan,
  createSemanticRuntime,
  expectedSemanticEffectsForPlan,
  readAuthoringVerificationSnapshot,
  verifyAuthoringEffects,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'aurelia-ls-minimal-app-'));

const plan = buildMinimalAppPlan({
  rootDir: tempRoot,
  appName: 'Generated Minimal App',
});
await writeAuthoringSourcePlan(plan.sourcePlan, 'Minimal app');

const runtime = await createSemanticRuntime({
  workspaceRoot,
  storeKey: 'minimal-app-smoke',
  projects: [{
    rootDir: tempRoot,
    projectKey: 'minimal-app',
  }],
});
const app = await runtime.openApp({ projectKey: 'minimal-app' });

const expectedEffects = expectedSemanticEffectsForPlan(plan);
const snapshot = readAuthoringVerificationSnapshot(app);
const verification = verifyAuthoringEffects(
  new AuthoringVerificationRequest(plan.expectedTopology, expectedEffects),
  snapshot,
);

const failures = verification.effectResults
  .filter((result) => result.outcome !== 'satisfied')
  .map((result) => result.summary);

const summary = {
  generatedRoot: tempRoot,
  planSteps: plan.steps.length,
  sourceFiles: plan.sourcePlan?.files.length ?? 0,
  projectToolingFiles: plan.sourcePlan?.projectTooling?.files.length ?? 0,
  sourcePlanComplete: plan.sourcePlan?.hasCompleteFileText ?? false,
  plannedFiles: plan.expectedTopology?.files.length ?? 0,
  plannedComponents: plan.expectedTopology?.components.length ?? 0,
  expectedEffects: expectedEffects.length,
  verification: verification.effectResults.map((result) => ({
    effectKind: result.expectedEffect.effectKind,
    outcome: result.outcome,
    summary: result.summary,
  })),
  openSeams: snapshot.openSeams.length,
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}
