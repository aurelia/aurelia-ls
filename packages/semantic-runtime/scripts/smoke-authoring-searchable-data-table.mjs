import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeAuthoringSourcePlan } from './authoring-source-plan-writer.mjs';
import {
  AuthoringVerificationRequest,
  buildSearchableDataTablePlan,
  createSemanticRuntime,
  expectedSemanticEffectsForPlan,
  readAuthoringVerificationSnapshot,
  verifyAuthoringEffects,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'aurelia-ls-searchable-data-table-'));
const plan = buildSearchableDataTablePlan({
  rootDir: tempRoot,
  appName: 'Generated Searchable Data Table',
});
await writeAuthoringSourcePlan(plan.sourcePlan, 'Searchable data table');

const runtime = await createSemanticRuntime({
  workspaceRoot,
  storeKey: 'generated-searchable-data-table-smoke',
  projects: [{
    rootDir: tempRoot,
    projectKey: 'generated-searchable-data-table',
  }],
});
const app = await runtime.openApp({
  projectKey: 'generated-searchable-data-table',
  analysisDepth: 'binding-observation',
});

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
  plannedServices: plan.expectedTopology?.services.length ?? 0,
  stateCompositions: snapshot.topology.stateCompositions.length,
  serviceInteractions: snapshot.topology.serviceInteractions.length,
  serviceInteractionBindings: snapshot.topology.serviceInteractionBindings.length,
  expectedEffects: expectedEffects.length,
  verification: verification.effectResults.map((result) => ({
    effectKind: result.expectedEffect.effectKind,
    outcome: result.outcome,
    summary: result.summary,
  })),
  openSeams: snapshot.openSeams.length,
  bindingTargetAccesses: snapshot.bindingTargetAccesses?.length ?? 0,
  bindingValueChannels: snapshot.bindingValueChannels?.length ?? 0,
  bindingBehaviorApplications: snapshot.bindingBehaviorApplications?.length ?? 0,
  bindingDataFlows: snapshot.bindingDataFlows?.length ?? 0,
  computedObserverSources: snapshot.computedObserverSources?.length ?? 0,
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

await rm(tempRoot, { recursive: true, force: true });
