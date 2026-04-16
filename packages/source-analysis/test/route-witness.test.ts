import { describe, expect, it } from 'vitest';

import { loadCurrentSourceAnalysisSnapshots } from '../src/current-snapshots.js';
import { createSourceAnalysisRouteWitnessAnswer } from '../src/route-witness.js';

function loadSnapshotsForRouteWitness() {
  try {
    return loadCurrentSourceAnalysisSnapshots();
  } catch (error) {
    throw new Error(
      `Current source-analysis snapshots are required for live route witness tests. Run "pnpm source-analysis refresh all".\n\n${(error as Error).message}`,
    );
  }
}

describe('Source-analysis route witnesses', () => {
  it('explains refresh.ts through the manifest-backed CLI route', () => {
    const snapshots = loadSnapshotsForRouteWitness();
    const answer = createSourceAnalysisRouteWitnessAnswer({
      focusRef: { kind: 'file', value: 'packages/source-analysis/src/refresh.ts' },
      questionRoute: 'route',
    }, snapshots);

    expect(answer.outcome.tag).toBe('hit');
    expect(answer.outcome.trust.kind).toBe('qualified');
    const witness = answer.outcome.value?.witnesses[0];
    expect(witness?.rootKind).toBe('manifest-bin');
    expect(witness?.steps.some((step) =>
      step.kind === 'executable-handoff'
      && step.fromFilePath === 'packages/source-analysis/src/cli.ts'
      && step.toFilePath === 'packages/source-analysis/src/refresh.ts',
    )).toBe(true);
  });

  it('explains SourceAnalysisHostRuntime from the public package surface', () => {
    const snapshots = loadSnapshotsForRouteWitness();
    const answer = createSourceAnalysisRouteWitnessAnswer({
      focusRef: { kind: 'type', value: 'SourceAnalysisHostRuntime' },
      questionRoute: 'route',
    }, snapshots);

    expect(answer.outcome.tag).toBe('hit');
    expect(answer.outcome.trust.kind).toBe('grounded');
    const witness = answer.outcome.value?.witnesses[0];
    expect(witness?.rootKind).toBe('public-api');
    expect(witness?.files).toContain('packages/source-analysis/src/host/runtime.ts');
    expect(answer.outcome.value?.relatedRefs.some((ref) =>
      ref.value === 'packages/source-analysis/src/host/runtime.ts',
    )).toBe(true);
  });
});
