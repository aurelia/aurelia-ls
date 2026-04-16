import { describe, expect, it } from 'vitest';

import { loadCurrentSourceAnalysisSnapshots } from '../src/current-snapshots.js';
import { createSourceAnalysisAuditAnswer } from '../src/audit.js';

function loadSnapshotsForAudit() {
  try {
    return loadCurrentSourceAnalysisSnapshots();
  } catch (error) {
    throw new Error(
      `Current source-analysis snapshots are required for live audit tests. Run "pnpm source-analysis refresh all".\n\n${(error as Error).message}`,
    );
  }
}

describe('Source-analysis package audit', () => {
  it('flags blind spots that keep exercise and dead-code closure open', () => {
    const snapshots = loadSnapshotsForAudit();
    const answer = createSourceAnalysisAuditAnswer({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
    }, snapshots);

    expect(answer.outcome.tag).toBe('open-boundary');
    const uncoveredFinding = answer.outcome.value?.findings.find((finding) =>
      finding.code === 'package-uncovered-files',
    );
    expect(uncoveredFinding).toBeTruthy();
    expect(uncoveredFinding?.relatedRefs.some((ref) =>
      ref.value === 'packages/source-analysis/test/navigation.test.ts',
    )).toBe(true);
  });

  it('surfaces semantic-runtime.ts as a likely under-integrated code island', () => {
    const snapshots = loadSnapshotsForAudit();
    const answer = createSourceAnalysisAuditAnswer({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
    }, snapshots);

    const dormantFinding = answer.outcome.value?.findings.find((finding) =>
      finding.code === 'under-integrated-file'
      && finding.primaryRef.value === 'packages/source-analysis/src/semantic-runtime.ts',
    );
    expect(dormantFinding).toBeTruthy();
    expect(dormantFinding?.summary.includes('no inbound imports')).toBe(true);
    expect(answer.outcome.continuations.some((step) =>
      step.targetFocusRef === 'packages/source-analysis/src/semantic-runtime.ts',
    )).toBe(true);
  });
});
