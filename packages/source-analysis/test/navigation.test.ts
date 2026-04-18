import { describe, expect, it } from './test-harness.js';

import { loadCurrentSnapshots } from '../src/current-snapshots.js';
import { createNavigationEpisode } from '../src/navigation.js';
import { loadCurrentLiveAnalysisViews } from './live-analysis-views.js';

function loadSnapshotsForNavigation() {
  try {
    return loadCurrentSnapshots();
  } catch (error) {
    throw new Error(
      `Current source-analysis snapshots are required for live navigation tests. Run "pnpm source-analysis refresh all".\n\n${(error as Error).message}`,
    );
  }
}

describe('Source-analysis live navigation', () => {
  it('orients an AI to the source-analysis package entrypoints and orchestration seams', () => {
    const snapshots = loadSnapshotsForNavigation();
    const episode = createNavigationEpisode({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'join',
    }, snapshots);

    expect(episode.answer.outcome.tag).toBe('hit');
    expect(episode.answer.outcome.value?.primaryRef.value).toBe('@aurelia-ls/source-analysis');
    expect(episode.answer.outcome.value?.summaryLines.some((line) => line.includes('host -> deps'))).toBe(true);
    expect(episode.answer.outcome.value?.relatedRefs.some((ref) => ref.value === 'packages/source-analysis/src/index.ts')).toBe(true);
    expect(episode.answer.outcome.value?.relatedRefs.some((ref) => ref.kind === 'export')).toBe(true);
    expect(episode.answer.slots.closure_basis?.some((basis) => basis.kind === 'substrate')).toBe(true);
  });

  it('routes a public export to its owning implementation file in the live workspace', () => {
    const snapshots = loadSnapshotsForNavigation();
    const episode = createNavigationEpisode({
      focusRef: { kind: 'export', value: 'createSnapshotHostRuntime' },
      questionRoute: 'route',
    }, snapshots);

    expect(episode.answer.outcome.tag).toBe('reroute');
    expect(episode.answer.outcome.value?.summaryLines.some((line) => line.includes('packages/source-analysis/src/host/runtime.ts'))).toBe(true);
    expect(episode.answer.outcome.value?.summaryLines.some((line) => line.includes('index.ts:named-reexport'))).toBe(true);
    expect(episode.answer.outcome.value?.relatedRefs.some((ref) => ref.value === '@aurelia-ls/source-analysis')).toBe(true);
    expect(episode.answer.outcome.continuations.some((step) => step.targetFocusRef === 'packages/source-analysis/src/host/runtime.ts')).toBe(true);
  });

  it('spends the live semantic export trace surface even when the export snapshot chain is stale', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const staleAnalysis = {
      ...analysis,
      exports: {
        ...analysis.exports,
        exports: analysis.exports.exports.map((record) =>
          record.exported_name === 'createSnapshotHostRuntime'
            ? {
              ...record,
              declaration_file: 'packages/source-analysis/src/fake.ts',
              declaration_line: 99,
              declaration_name: 'FakeHostRuntime',
              chain: [{
                file: 'packages/source-analysis/src/fake.ts',
                line: 99,
                kind: 'fallback' as const,
                exported_name: record.exported_name,
                original_name: record.exported_name,
              }],
            }
            : record,
        ),
      },
    };
    const episode = createNavigationEpisode({
      focusRef: { kind: 'export', value: 'createSnapshotHostRuntime' },
      questionRoute: 'route',
    }, staleAnalysis);

    expect(episode.answer.outcome.tag).toBe('reroute');
    expect(episode.answer.outcome.trust.kind).toBe('grounded');
    expect(episode.answer.outcome.value?.summaryLines.some((line) => line.includes('packages/source-analysis/src/host/runtime.ts'))).toBe(true);
    expect(episode.answer.outcome.value?.summaryLines.some((line) => line.includes('packages/source-analysis/src/fake.ts'))).toBe(false);
    expect(episode.answer.outcome.issues.some((issue) => issue.code === 'export-route-fallback')).toBe(false);
  });

  it('shows the hosted runtime type neighborhood and next inspection steps', () => {
    const snapshots = loadSnapshotsForNavigation();
    const episode = createNavigationEpisode({
      focusRef: { kind: 'type', value: 'SnapshotHostRuntime' },
      questionRoute: 'join',
    }, snapshots);

    expect(episode.answer.outcome.tag).toBe('hit');
    expect(episode.answer.outcome.value?.summaryLines.some((line) => line.includes('packages/source-analysis/src/host/runtime.ts:'))).toBe(true);
    expect(episode.answer.outcome.value?.summaryLines.some((line) => line.includes('HostCommandEnvelope'))).toBe(true);
    expect(episode.answer.outcome.value?.relatedRefs.some((ref) => ref.value === 'packages/source-analysis/src/host/runtime.ts')).toBe(true);
    expect(episode.answer.outcome.value?.relatedRefs.some((ref) => ref.value === 'HostCommandEnvelope')).toBe(true);
    expect(episode.answer.outcome.continuations.some((step) => step.targetFocusRef === 'packages/source-analysis/src/host/runtime.ts')).toBe(true);
  });

  it('locates internal symbol declarations through the live structural declaration surface', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const episode = createNavigationEpisode({
      focusRef: { kind: 'symbol', value: 'createAnalysisViews' },
      questionRoute: 'join',
    }, analysis);

    expect(episode.answer.outcome.tag).toBe('hit');
    expect(episode.answer.outcome.value?.summaryLines.some((line) =>
      line.includes('packages/source-analysis/src/analysis-views.ts:46'),
    )).toBe(true);
    expect(episode.answer.outcome.value?.relatedRefs.some((ref) =>
      ref.kind === 'file' && ref.value === 'packages/source-analysis/src/analysis-views.ts',
    )).toBe(true);
    expect(episode.answer.outcome.continuations.some((step) =>
      step.targetFocusRef === 'packages/source-analysis/src/analysis-views.ts',
    )).toBe(true);
  });

  it('uses the live structural dependency surface for file neighborhoods when deps snapshot edges are stale', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const episode = createNavigationEpisode({
      focusRef: { kind: 'file', value: 'packages/source-analysis/src/host/runtime.ts' },
      questionRoute: 'join',
    }, {
      ...analysis,
      deps: {
        ...analysis.deps,
        edges: [],
      },
    });

    expect(episode.answer.outcome.tag).toBe('hit');
    expect(episode.answer.outcome.value?.summaryLines[0]).toContain('packages/source-analysis/src/host/runtime.ts has ');
    expect(episode.answer.outcome.value?.summaryLines[0]).not.toContain('has 0 outbound imports');
  });
});
