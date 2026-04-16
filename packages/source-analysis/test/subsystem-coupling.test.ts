import { describe, expect, it } from 'vitest';

import { loadCurrentSnapshots } from '../src/current-snapshots.js';
import {
  collectBindingSeams,
  collectSubsystemBindingPressure,
} from '../src/subsystem-coupling.js';

function loadSnapshotsForSubsystemCoupling() {
  try {
    return loadCurrentSnapshots();
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
      seam.from.partitionId === 'packages/source-analysis/src/host'
      && seam.to.partitionId === 'packages/source-analysis/src/deps',
    )).toBe(true);

    const pressure = collectSubsystemBindingPressure(snapshots.deps, 'packages/source-analysis/src/');
    expect(pressure.some((entry) => entry.partition.partitionId === 'packages/source-analysis/src/host')).toBe(true);
  });
});
