import { describe, expect, it } from 'vitest';

import {
  SNAPSHOT_KINDS,
  createSnapshotHostRuntime,
  loadCurrentSnapshots,
} from '../out/index.js';
import {
  HOST_RENDER_STYLES,
  SnapshotHostRuntime,
} from '../out/public/host.js';
import { createInquiryIngress } from '../out/public/inquiry.js';
import {
  inspectAnalyzabilityPosture,
  inspectProfileSnapshotSupport,
  resolveAnalysisProfile,
} from '../out/public/profile.js';
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

  it('exposes named subpaths for host and inquiry surfaces', () => {
    expect(HOST_RENDER_STYLES).toContain('plain-text');

    const inquiry = createInquiryIngress();
    const answer = inquiry.createDiscoveryAnswer({
      question: 'Audit @aurelia-ls/source-analysis for tech debt.',
    });

    expect(answer.outcome.tag).toBe('hit');
    expect(answer.outcome.value?.inquiries[0]?.id).toBe('package-audit');

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
  });
});
