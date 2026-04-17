import { describe, expect, it } from 'vitest';

import { createRouteWitnessAnswer } from '../src/route-witness.js';
import { loadCurrentLiveAnalysisViews } from './live-analysis-views.js';

describe('Source-analysis route witnesses', () => {
  it('explains refresh.ts through the manifest-backed CLI route', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const answer = createRouteWitnessAnswer({
      focusRef: { kind: 'file', value: 'packages/source-analysis/src/refresh.ts' },
      questionRoute: 'route',
    }, analysis);

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

  it('explains SnapshotHostRuntime from the public package surface', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const answer = createRouteWitnessAnswer({
      focusRef: { kind: 'type', value: 'SnapshotHostRuntime' },
      questionRoute: 'route',
    }, analysis);

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
