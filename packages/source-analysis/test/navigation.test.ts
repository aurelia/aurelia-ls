import { describe, expect, it } from 'vitest';

import { loadCurrentSourceAnalysisSnapshots } from '../src/current-snapshots.js';
import { createSourceAnalysisNavigationEpisode } from '../src/navigation.js';

function loadSnapshotsForNavigation() {
  try {
    return loadCurrentSourceAnalysisSnapshots();
  } catch (error) {
    throw new Error(
      `Current source-analysis snapshots are required for live navigation tests. Run "pnpm source-analysis refresh all".\n\n${(error as Error).message}`,
    );
  }
}

describe('Source-analysis live navigation', () => {
  it('orients an AI to the source-analysis package entrypoints and orchestration seams', () => {
    const snapshots = loadSnapshotsForNavigation();
    const episode = createSourceAnalysisNavigationEpisode({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'join',
    }, snapshots);

    expect(episode.answer.outcome.tag).toBe('hit');
    expect(episode.answer.outcome.value?.primaryRef.value).toBe('@aurelia-ls/source-analysis');
    expect(episode.answer.outcome.value?.summaryLines.some((line) => line.includes('host -> deps'))).toBe(true);
    expect(episode.answer.outcome.value?.relatedRefs.some((ref) => ref.value === 'packages/source-analysis/src/index.ts')).toBe(true);
    expect(episode.answer.outcome.value?.relatedRefs.some((ref) => ref.value === 'createSourceAnalysisHostRuntime')).toBe(true);
    expect(episode.answer.slots.closure_basis?.some((basis) => basis.kind === 'substrate')).toBe(true);
  });

  it('routes a public export to its owning implementation file in the live workspace', () => {
    const snapshots = loadSnapshotsForNavigation();
    const episode = createSourceAnalysisNavigationEpisode({
      focusRef: { kind: 'export', value: 'createSourceAnalysisHostRuntime' },
      questionRoute: 'route',
    }, snapshots);

    expect(episode.answer.outcome.tag).toBe('reroute');
    expect(episode.answer.outcome.value?.summaryLines.some((line) => line.includes('packages/source-analysis/src/host/runtime.ts'))).toBe(true);
    expect(episode.answer.outcome.value?.summaryLines.some((line) => line.includes('index.ts:named-reexport'))).toBe(true);
    expect(episode.answer.outcome.value?.relatedRefs.some((ref) => ref.value === '@aurelia-ls/source-analysis')).toBe(true);
    expect(episode.answer.outcome.continuations.some((step) => step.targetFocusRef === 'packages/source-analysis/src/host/runtime.ts')).toBe(true);
  });

  it('shows the hosted runtime type neighborhood and next inspection steps', () => {
    const snapshots = loadSnapshotsForNavigation();
    const episode = createSourceAnalysisNavigationEpisode({
      focusRef: { kind: 'type', value: 'SourceAnalysisHostRuntime' },
      questionRoute: 'join',
    }, snapshots);

    expect(episode.answer.outcome.tag).toBe('hit');
    expect(episode.answer.outcome.value?.summaryLines.some((line) => line.includes('packages/source-analysis/src/host/runtime.ts:'))).toBe(true);
    expect(episode.answer.outcome.value?.summaryLines.some((line) => line.includes('SourceAnalysisHostEnvelope'))).toBe(true);
    expect(episode.answer.outcome.value?.relatedRefs.some((ref) => ref.value === 'packages/source-analysis/src/host/runtime.ts')).toBe(true);
    expect(episode.answer.outcome.value?.relatedRefs.some((ref) => ref.value === 'SourceAnalysisHostEnvelope')).toBe(true);
    expect(episode.answer.outcome.continuations.some((step) => step.targetFocusRef === 'packages/source-analysis/src/host/runtime.ts')).toBe(true);
  });
});
