import assert from 'node:assert/strict';

import type {
  AotBuildEvidence,
  LaneTranscript,
  LocalTemplatesObservation,
} from './contract.js';

export function assertLocalTemplatesBuildEvidence(evidence: AotBuildEvidence): void {
  const names = new Set(evidence.artifacts.map((artifact) => artifact.definitionName));
  assert.ok(names.has('local-aot-app'), 'local-template AOT build must emit the compiler-patch root artifact');
  assert.ok(names.has('convention-local-app'), 'local-template AOT build must emit the convention DefinitionModule root');
}

export function assertLocalTemplatesExpectations(transcript: LaneTranscript): void {
  assert.deepEqual(transcript.semantic.pageErrors, []);
  assert.deepEqual(transcript.semantic.console, []);
  assert.equal(transcript.probes, null);
  assert.equal(transcript.semantic.teardownEvents, null);
  const expected: readonly [string, LocalTemplatesObservation][] = [
    ['initial', observation('alpha', ['alpha', 'alpha'], 3, 'peer', 'alpha', 'alpha')],
    ['owner-update-propagation', observation('bravo', ['bravo', 'bravo'], 3, 'peer', 'bravo', 'bravo')],
    ['repeat-growth', observation('bravo', ['bravo', 'bravo', 'bravo'], 4, 'peer', 'bravo', 'bravo')],
    ['nested-hidden', observation('bravo', ['bravo', 'bravo', 'bravo'], 4, 'peer', null, 'bravo')],
    ['nested-restored', observation('bravo', ['bravo', 'bravo', 'bravo'], 4, 'peer', 'bravo', 'bravo')],
  ];
  assert.equal(transcript.semantic.checkpoints.length, expected.length);
  for (const [index, [label, model]] of expected.entries()) {
    const checkpoint = transcript.semantic.checkpoints[index];
    assert.equal(checkpoint?.label, label);
    const observed = checkpoint?.observation;
    assert.equal(observed?.kind, 'local-templates');
    if (observed?.kind !== 'local-templates') throw new Error(`Checkpoint '${label}' is not a local-template observation.`);
    assert.deepEqual(observed.model, model);
  }
}

function observation(
  message: string,
  cardValues: readonly string[],
  ownedDependencyCount: number,
  peerCardValue: string,
  nestedValue: string | null,
  conventionValue: string,
): LocalTemplatesObservation {
  return { message, cardValues, ownedDependencyCount, peerCardValue, nestedValue, conventionValue };
}
