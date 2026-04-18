import { describe, expect, it } from './test-harness.js';

import {
  SNAPSHOT_KINDS,
  createSnapshotHostRuntime,
  loadCurrentSnapshots,
} from '../out/index.js';
import {
  HOST_RENDER_STYLES,
  SnapshotHostRuntime,
} from '../out/public/host.js';
import {
  inspectAnalyzabilityPosture,
  inspectProfileSnapshotSupport,
  resolveAnalysisProfile,
} from '../out/public/profile.js';
import {
  STRUCTURAL_PATH_EVALUATOR_IDS,
  resolvePartitionRef,
} from '../out/public/structural.js';
import { tryLoadCurrentSnapshots } from '../out/public/snapshots.js';

describe('Source-analysis public API surface', () => {
  it('keeps the root surface minimal around snapshots and the hosted runtime', () => {
    expect(SNAPSHOT_KINDS).toEqual(['deps', 'typerefs', 'exports']);

    const runtime = createSnapshotHostRuntime();
    expect(runtime).toBeInstanceOf(SnapshotHostRuntime);

    const snapshots = tryLoadCurrentSnapshots();
    expect(snapshots.warnings).toBeDefined();
    expect(typeof loadCurrentSnapshots).toBe('function');
  });

  it('exposes named subpaths for host, profile, and structural surfaces', () => {
    expect(HOST_RENDER_STYLES).toContain('plain-text');
    expect(STRUCTURAL_PATH_EVALUATOR_IDS).toContain('file-path-deterministic-ceiling');

    const profile = resolveAnalysisProfile({ repoPath: process.cwd() });
    expect(profile.repoPath.replace(/\\/g, '/')).toBe(process.cwd().replace(/\\/g, '/').replace(/\/+$/g, ''));

    const support = inspectProfileSnapshotSupport(
      {
        toolRootPath: process.cwd(),
        envSnapshotRootPath: null,
        snapshotRootPath: `${process.cwd()}/.source-analysis/snapshots`,
      },
      profile,
    );
    expect(Array.isArray(support.snapshots)).toBe(true);

    const posture = inspectAnalyzabilityPosture(
      {
        toolRootPath: process.cwd(),
        envSnapshotRootPath: null,
        snapshotRootPath: `${process.cwd()}/.source-analysis/snapshots`,
      },
      profile,
    );
    expect(Array.isArray(posture.summaryLines)).toBe(true);

    const partitionRef = resolvePartitionRef(profile, 'source-area', 'src/host/runtime.ts');
    expect(partitionRef?.partitionId).toBe('src/host');
  });
});
