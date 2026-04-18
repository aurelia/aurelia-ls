import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from './test-harness.js';

import { resolveAnalysisProfile } from '../out/analysis-profile.js';
import {
  collectBindingSeams,
  collectSubsystemBindingPressure,
} from '../out/public/structural.js';
import type { DepsOutput } from '../out/deps/schema.js';
import { loadCurrentLiveAnalysisViews } from './live-analysis-views.js';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('Source-analysis subsystem coupling helpers', () => {
  it('keeps the source-area compatibility view available through the structural public API', () => {
    const repoPath = createSubsystemFixtureRepo();
    const profile = resolveAnalysisProfile({ repoPath });
    const deps = createDepsOutput(repoPath);

    const seams = collectBindingSeams(deps, 'packages/demo/src/', profile);
    expect(seams.map((seam) => [seam.from.partitionId, seam.to.partitionId])).toEqual([
      ['packages/demo/src/host', 'packages/demo/src/model'],
      ['packages/demo/src/model', 'packages/demo/src/service'],
    ]);

    const pressure = collectSubsystemBindingPressure(deps, 'packages/demo/src/', profile);
    expect(pressure[0]?.partition.partitionId).toBe('packages/demo/src/model');
    expect(pressure[0]?.incomingCounterparts[0]?.partitionId).toBe('packages/demo/src/host');
  });

  it('keeps the semantic export kernel one-way from the compatibility projection', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const seams = collectBindingSeams(analysis.deps, 'packages/source-analysis/src/');

    const exportToSemantic = seams.find((seam) =>
      seam.from.partitionId === 'packages/source-analysis/src/exports'
      && seam.to.partitionId === 'packages/source-analysis/src/semantic',
    );
    const semanticToExport = seams.find((seam) =>
      seam.from.partitionId === 'packages/source-analysis/src/semantic'
      && seam.to.partitionId === 'packages/source-analysis/src/exports',
    );

    expect(exportToSemantic).toBeDefined();
    expect(semanticToExport).toBeUndefined();
  });

  it('keeps answer rendering one-way from inquiry policy', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const rendererToInquiry = analysis.deps.edges.find((edge) =>
      edge.source === 'packages/source-analysis/src/answer-renderer.ts'
      && edge.target === 'packages/source-analysis/src/inquiry-policy.ts',
    );
    const cardToInquiry = analysis.deps.edges.find((edge) =>
      edge.source === 'packages/source-analysis/src/answer-card.ts'
      && edge.target === 'packages/source-analysis/src/inquiry-policy.ts',
    );
    const inquiryToRenderPolicy = analysis.deps.edges.find((edge) =>
      edge.source === 'packages/source-analysis/src/inquiry-policy.ts'
      && edge.target === 'packages/source-analysis/src/answer-render-policy.ts',
    );
    const renderPolicyToInquiry = analysis.deps.edges.find((edge) =>
      edge.source === 'packages/source-analysis/src/answer-render-policy.ts'
      && edge.target === 'packages/source-analysis/src/inquiry-policy.ts',
    );

    expect(rendererToInquiry).toBeUndefined();
    expect(cardToInquiry).toBeUndefined();
    expect(inquiryToRenderPolicy).toBeDefined();
    expect(renderPolicyToInquiry).toBeUndefined();
  });

  it('keeps answer refs as a shared model instead of a card-document cycle', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const documentToCard = analysis.deps.edges.find((edge) =>
      edge.source === 'packages/source-analysis/src/answer-document.ts'
      && edge.target === 'packages/source-analysis/src/answer-card.ts',
    );
    const cardToRef = analysis.deps.edges.find((edge) =>
      edge.source === 'packages/source-analysis/src/answer-card.ts'
      && edge.target === 'packages/source-analysis/src/answer-ref.ts',
    );
    const documentToRef = analysis.deps.edges.find((edge) =>
      edge.source === 'packages/source-analysis/src/answer-document.ts'
      && edge.target === 'packages/source-analysis/src/answer-ref.ts',
    );
    const refToCard = analysis.deps.edges.find((edge) =>
      edge.source === 'packages/source-analysis/src/answer-ref.ts'
      && edge.target === 'packages/source-analysis/src/answer-card.ts',
    );

    expect(documentToCard).toBeUndefined();
    expect(cardToRef).toBeDefined();
    expect(documentToRef).toBeDefined();
    expect(refToCard).toBeUndefined();
  });

  it('keeps analysis views neutral from snapshot loading', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const viewsToCurrentSnapshots = analysis.deps.edges.find((edge) =>
      edge.source === 'packages/source-analysis/src/analysis-views.ts'
      && edge.target === 'packages/source-analysis/src/current-snapshots.ts',
    );
    const viewsToSnapshotContract = analysis.deps.edges.find((edge) =>
      edge.source === 'packages/source-analysis/src/analysis-views.ts'
      && edge.target === 'packages/source-analysis/src/snapshot-contract.ts',
    );
    const snapshotAdapterToViews = analysis.deps.edges.find((edge) =>
      edge.source === 'packages/source-analysis/src/snapshot-analysis-views.ts'
      && edge.target === 'packages/source-analysis/src/analysis-views.ts',
    );
    const snapshotAdapterToCurrentSnapshots = analysis.deps.edges.find((edge) =>
      edge.source === 'packages/source-analysis/src/snapshot-analysis-views.ts'
      && edge.target === 'packages/source-analysis/src/current-snapshots.ts',
    );

    expect(viewsToCurrentSnapshots).toBeUndefined();
    expect(viewsToSnapshotContract).toBeUndefined();
    expect(snapshotAdapterToViews).toBeDefined();
    expect(snapshotAdapterToCurrentSnapshots).toBeDefined();
  });

  it('keeps snapshot contract types separate from the current snapshot loader', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const currentSnapshotsToContract = analysis.deps.edges.find((edge) =>
      edge.source === 'packages/source-analysis/src/current-snapshots.ts'
      && edge.target === 'packages/source-analysis/src/snapshot-contract.ts',
    );
    const contractToCurrentSnapshots = analysis.deps.edges.find((edge) =>
      edge.source === 'packages/source-analysis/src/snapshot-contract.ts'
      && edge.target === 'packages/source-analysis/src/current-snapshots.ts',
    );

    expect(currentSnapshotsToContract).toBeDefined();
    expect(contractToCurrentSnapshots).toBeUndefined();
  });

  it('keeps typerefs query on shared export helpers instead of the exports projection files', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const queryToExportsInspect = analysis.deps.edges.find((edge) =>
      edge.source === 'packages/source-analysis/src/typerefs/query.ts'
      && edge.target === 'packages/source-analysis/src/exports/inspect.ts',
    );
    const queryToExportsSchema = analysis.deps.edges.find((edge) =>
      edge.source === 'packages/source-analysis/src/typerefs/query.ts'
      && edge.target === 'packages/source-analysis/src/exports/schema.ts',
    );
    const queryToExportInspection = analysis.deps.edges.find((edge) =>
      edge.source === 'packages/source-analysis/src/typerefs/query.ts'
      && edge.target === 'packages/source-analysis/src/export-inspection.ts',
    );
    const queryToExportsContract = analysis.deps.edges.find((edge) =>
      edge.source === 'packages/source-analysis/src/typerefs/query.ts'
      && edge.target === 'packages/source-analysis/src/exports-contract.ts',
    );

    expect(queryToExportsInspect).toBeUndefined();
    expect(queryToExportsSchema).toBeUndefined();
    expect(queryToExportInspection).toBeDefined();
    expect(queryToExportsContract).toBeDefined();
  });
});

function createSubsystemFixtureRepo(): string {
  const repoPath = mkdtempSync(join(tmpdir(), 'source-analysis-subsystem-'));
  tempDirs.push(repoPath);

  mkdirSync(join(repoPath, 'packages', 'demo', 'src', 'host'), { recursive: true });
  mkdirSync(join(repoPath, 'packages', 'demo', 'src', 'model'), { recursive: true });
  mkdirSync(join(repoPath, 'packages', 'demo', 'src', 'service'), { recursive: true });
  writeFileSync(
    join(repoPath, 'package.json'),
    JSON.stringify({ name: '@fixture/root', type: 'module' }, null, 2),
  );
  writeFileSync(
    join(repoPath, 'packages', 'demo', 'package.json'),
    JSON.stringify({ name: '@fixture/demo', type: 'module' }, null, 2),
  );

  return repoPath;
}

function createDepsOutput(repoPath: string): DepsOutput {
  return {
    root: repoPath.replace(/\\/g, '/'),
    generated_at: new Date(0).toISOString(),
    source_commit: 'fixture',
    analyzer_commit: 'fixture',
    profile: fixtureProfile(),
    frontiers: fixtureFrontiers(),
    tsconfigs: [],
    summary: {
      files_analyzed: 3,
      internal_edges: 2,
      external_imports: 0,
      unresolved: 0,
      uncovered_files: 0,
    },
    edges: [
      {
        source: 'packages/demo/src/host/runtime.ts',
        target: 'packages/demo/src/model/types.ts',
        specifier: '../model/types.js',
        line: 1,
        bindings: ['DemoType'],
        type_only: true,
      },
      {
        source: 'packages/demo/src/model/types.ts',
        target: 'packages/demo/src/service/container.ts',
        specifier: '../service/container.js',
        line: 2,
        bindings: ['ServiceHandle'],
        type_only: false,
      },
    ],
    external_imports: [],
    unresolved_imports: [],
    cycles: [],
    uncovered_files: [],
    directory_profiles: [],
    directory_crossings: [],
    orphans: {
      no_inbound: [],
      no_outbound: [],
    },
    coupling_matrices: [],
  };
}

function fixtureProfile() {
  return {
    profileId: 'fixture-profile',
    profilePath: null,
    target: 'fixture-target',
    excludedRepoRelativePrefixes: [],
    packageDiscoveryRoots: [],
    includeRepoRootPackage: true,
    pathMappings: [],
    exercisePatterns: [],
    partitionSchemes: [],
  } as const;
}

function fixtureFrontiers() {
  return {
    excluded_frontiers: [],
    warnings: [],
  } as const;
}
