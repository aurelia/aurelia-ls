import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AuthoringVerificationRequest,
  createSemanticRuntime,
  ExpectedSemanticEffect,
  readAuthoringVerificationSnapshot,
  verifyAuthoringEffects,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const fixtureRoot = 'packages/semantic-runtime/fixtures/pressure/one-hop-forwarding-accessor';

const runtime = await createSemanticRuntime({
  workspaceRoot,
  storeKey: 'one-hop-forwarding-accessor-contract',
  projects: [{
    rootDir: fixtureRoot,
    projectKey: 'one-hop-forwarding-accessor',
  }],
});

const app = await runtime.openApp({
  projectKey: 'one-hop-forwarding-accessor',
  analysisDepth: 'binding-observation',
});

const expectedEffects = [
  ExpectedSemanticEffect.signatureTaste(
    'Authoring orientation should flag one-hop accessors that only forward injected state.',
    'template-model-access',
    'one-hop-forwarding-accessor-pressure',
    'component',
  ),
  ExpectedSemanticEffect.signatureTaste(
    'Authoring orientation should still recognize direct injected state template reads.',
    'template-model-access',
    'direct-state-domain-template-binding',
    'template-binding',
  ),
];

const snapshot = readAuthoringVerificationSnapshot(app);
const verification = verifyAuthoringEffects(
  new AuthoringVerificationRequest(null, expectedEffects),
  snapshot,
);
const failures = verification.effectResults
  .filter((result) => result.outcome === 'failed')
  .map((result) => result.summary);

const modelAccessAxis = snapshot.authoringOrientation.taste.find((axis) =>
  axis.axisKey === 'template-model-access'
);
const modelAccessValues = modelAccessAxis?.values.map((value) => ({
  valueKey: value.valueKey,
  evidenceCount: value.evidence.reduce((total, evidence) => total + (evidence.count ?? 0), 0),
})) ?? [];
const forwardingPressure = modelAccessValues.find((value) =>
  value.valueKey === 'one-hop-forwarding-accessor-pressure'
);
const sourceBackedGetterObservation = modelAccessValues.find((value) =>
  value.valueKey === 'source-backed-getter-observation'
);

if (forwardingPressure?.evidenceCount !== 1) {
  failures.push(`Expected exactly one one-hop forwarding accessor, received ${forwardingPressure?.evidenceCount ?? 0}.`);
}

if (sourceBackedGetterObservation?.evidenceCount !== 2) {
  failures.push(
    `Expected exactly two template-read source-backed getter observations, received ${sourceBackedGetterObservation?.evidenceCount ?? 0}.`
  );
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    fixtureRoot,
    failures,
    modelAccessValues,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    fixtureRoot,
    modelAccessValues,
  }, null, 2));
}
