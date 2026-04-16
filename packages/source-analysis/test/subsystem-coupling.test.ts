import { describe, expect, it } from 'vitest';

import { loadCurrentSourceAnalysisSnapshots } from '../src/current-snapshots.js';
import {
  collectBindingSeams,
  collectSubsystemBindingPressure,
} from '../src/index.js';

function loadSnapshotsForSubsystemCoupling() {
  try {
    return loadCurrentSourceAnalysisSnapshots();
  } catch (error) {
    throw new Error(
      `Current source-analysis snapshots are required for subsystem coupling tests. Run "pnpm source-analysis refresh all".\n\n${(error as Error).message}`,
    );
  }
}

describe('Source-analysis subsystem coupling helpers', () => {
  it('summarizes package-local subsystem binding seams through the public API', () => {
    const snapshots = loadSnapshotsForSubsystemCoupling();
    const seams = collectBindingSeams(snapshots.deps, 'packages/source-analysis/src/');

    expect(seams.some((seam) =>
      seam.from === 'packages/source-analysis/src/host'
      && seam.to === 'packages/source-analysis/src/deps',
    )).toBe(true);

    const pressure = collectSubsystemBindingPressure(snapshots.deps, 'packages/source-analysis/src/');
    expect(pressure.some((entry) => entry.subsystem === 'packages/source-analysis/src/host')).toBe(true);
  });
});
