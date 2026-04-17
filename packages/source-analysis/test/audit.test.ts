import { describe, expect, it } from 'vitest';

import { loadCurrentSnapshots } from '../src/current-snapshots.js';
import { createAuditAnswer } from '../src/audit.js';

function loadSnapshotsForAudit() {
  try {
    return loadCurrentSnapshots();
  } catch (error) {
    throw new Error(
      `Current source-analysis snapshots are required for live audit tests. Run "pnpm source-analysis refresh all".\n\n${(error as Error).message}`,
    );
  }
}

describe('Source-analysis package audit', () => {
  it('no longer reports package blind spots after the tests gained explicit tsconfig coverage', () => {
    const snapshots = loadSnapshotsForAudit();
    const answer = createAuditAnswer({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
    }, snapshots);

    expect(answer.outcome.tag).toBe('hit');
    const uncoveredFinding = answer.outcome.value?.findings.find((finding) =>
      finding.code === 'package-uncovered-files',
    );
    expect(uncoveredFinding).toBeUndefined();
  });

  it('no longer reports exercise-only structural substrate helpers after they became an intentional public subpath', () => {
    const snapshots = loadSnapshotsForAudit();
    const answer = createAuditAnswer({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
    }, snapshots);

    const exerciseOnlyFinding = answer.outcome.value?.findings.find((finding) =>
      finding.code === 'exercise-only-files',
    );
    expect(exerciseOnlyFinding).toBeUndefined();
  });

  it('no longer reports an under-integrated orphan after the subsystem coupling helper was integrated', () => {
    const snapshots = loadSnapshotsForAudit();
    const answer = createAuditAnswer({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
    }, snapshots);

    const dormantFinding = answer.outcome.value?.findings.find((finding) =>
      finding.code === 'under-integrated-file',
    );
    expect(dormantFinding).toBeUndefined();
  });

  it('no longer reports unanchored candidate roots for the package after the helper integration', () => {
    const snapshots = loadSnapshotsForAudit();
    const answer = createAuditAnswer({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
    }, snapshots);

    const candidateRootsFinding = answer.outcome.value?.findings.find((finding) =>
      finding.code === 'candidate-entry-roots',
    );
    expect(candidateRootsFinding).toBeUndefined();
  });

  it('no longer reports public surface without exercise routes after the helper tests were added', () => {
    const snapshots = loadSnapshotsForAudit();
    const answer = createAuditAnswer({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
    }, snapshots);

    const publicUnexercisedFinding = answer.outcome.value?.findings.find((finding) =>
      finding.code === 'public-surface-unexercised',
    );
    expect(publicUnexercisedFinding).toBeUndefined();
  });

  it('no longer flags fragmented local answer builders after the shared envelope extraction', () => {
    const snapshots = loadSnapshotsForAudit();
    const answer = createAuditAnswer({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
    }, snapshots);

    const coordinationFinding = answer.outcome.value?.findings.find((finding) =>
      finding.code === 'answer-coordination-fragmentation',
    );
    expect(coordinationFinding).toBeUndefined();
  });

  it('no longer flags fragmented local answer carriers after the shared card extraction', () => {
    const snapshots = loadSnapshotsForAudit();
    const answer = createAuditAnswer({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
    }, snapshots);

    const presentationFinding = answer.outcome.value?.findings.find((finding) =>
      finding.code === 'answer-presentation-fragmentation',
    );
    expect(presentationFinding).toBeUndefined();
  });
});
