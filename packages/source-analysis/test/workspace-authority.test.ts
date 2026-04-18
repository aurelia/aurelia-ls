import { describe, expect, it } from './test-harness.js';

import { loadCurrentSnapshots } from '../src/current-snapshots.js';
import { createLegacyProjectionWorkspaceAuthority } from '../src/authority/workspace-authority.js';
import { loadCurrentLiveAnalysisViews } from './live-analysis-views.js';

function loadSnapshotsForAuthority() {
  try {
    return loadCurrentSnapshots();
  } catch (error) {
    throw new Error(
      `Current source-analysis snapshots are required for navigation authority tests. Run "pnpm source-analysis refresh all".\n\n${(error as Error).message}`,
    );
  }
}

describe('Source-analysis workspace authority', () => {
  it('adjudicates a unique package locator through the legacy projection adapter', () => {
    const authority = createLegacyProjectionWorkspaceAuthority(loadSnapshotsForAuthority());
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
    const authority = createLegacyProjectionWorkspaceAuthority(loadSnapshotsForAuthority());
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

  it('classifies focused analyzability through the shared evaluator seam', () => {
    const authority = createLegacyProjectionWorkspaceAuthority(loadSnapshotsForAuthority());
    const context = authority.inspectFocusedAnalyzability({
      focusLabel: '@aurelia-ls/source-analysis',
      queryHints: ['@aurelia-ls/source-analysis'],
    });

    expect(context.classification.focusLabel).toBe('@aurelia-ls/source-analysis');
    expect(context.facts.length > 0).toBe(true);
  });

  it('localizes live symbol declarations through the authority seam', () => {
    const authority = createLegacyProjectionWorkspaceAuthority(loadCurrentLiveAnalysisViews());
    const lookup = authority.lookupSymbolDeclaration({
      kind: 'symbol-name',
      value: 'createAnalysisViews',
    });

    expect(lookup.tag).toBe('hit');
    expect(lookup.matches[0]?.declaration.attributes.filePath).toBe('packages/source-analysis/src/analysis-views.ts');
  });

  it('inspects focused file queries through the authority seam', () => {
    const authority = createLegacyProjectionWorkspaceAuthority(loadCurrentLiveAnalysisViews());
    const inspection = authority.inspectFocusedFile({
      kind: 'file-path',
      value: 'packages/source-analysis/src/host/runtime.ts',
    });

    expect(inspection.matches.length).toBe(1);
    expect(inspection.matchedFilePath).toBe('packages/source-analysis/src/host/runtime.ts');
  });
});
