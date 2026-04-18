import { describe, expect, it } from './test-harness.js';

import { loadCurrentSnapshots } from '../src/current-snapshots.js';
import { createLegacyProjectionNavigationAuthority } from '../src/authority/navigation-authority.js';

function loadSnapshotsForAuthority() {
  try {
    return loadCurrentSnapshots();
  } catch (error) {
    throw new Error(
      `Current source-analysis snapshots are required for navigation authority tests. Run "pnpm source-analysis refresh all".\n\n${(error as Error).message}`,
    );
  }
}

describe('Source-analysis navigation authority', () => {
  it('adjudicates a unique package locator through the legacy projection adapter', () => {
    const authority = createLegacyProjectionNavigationAuthority(loadSnapshotsForAuthority());
    const outcome = authority.resolvePackage({
      kind: 'package-name',
      value: '@aurelia-ls/source-analysis',
    });

    expect(outcome.kind).toBe('claim');
    if (outcome.kind !== 'claim') {
      throw new Error(`Expected a claim outcome, got ${outcome.kind}.`);
    }
    expect(outcome.value.package_name).toBe('@aurelia-ls/source-analysis');
  });

  it('returns an explicit no-claim outcome for a missing type locator', () => {
    const authority = createLegacyProjectionNavigationAuthority(loadSnapshotsForAuthority());
    const outcome = authority.resolveTypeDeclaration({
      kind: 'type-name',
      value: 'DefinitelyMissingSourceAnalysisType',
    });

    expect(outcome.kind).toBe('no-claim');
    if (outcome.kind !== 'no-claim') {
      throw new Error(`Expected a no-claim outcome, got ${outcome.kind}.`);
    }
    expect(outcome.noClaim.kind).toBe('not-found');
  });
});

