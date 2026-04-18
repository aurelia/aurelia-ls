import { describe, expect, it } from './test-harness.js';

import {
  composeWorldFrame,
  selectMaintenanceQuestionRoute,
  selectQuestionRoute,
} from '../src/inquiry-model.js';
import {
  toWireContinuationBasis,
  toWireDeltaDescriptor,
} from '../src/inquiry-wire.js';

describe('Source-analysis inquiry wire adapters', () => {
  it('flattens split route and world slices at the wire boundary', () => {
    const wireBasis = toWireContinuationBasis({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: selectQuestionRoute('route'),
      readMode: 'focus-card',
      worldTargeting: {
        repoPath: 'C:/projects/aurelia-ls2',
        target: 'workspace',
        profilePath: 'profiles/framework-core.json',
      },
      executionPosture: {
        regimeAnchor: 'hosted',
        partiality: 'complete',
        freshness: 'live',
      },
      governingAnchorRefs: ['claim:1'],
    });

    expect(wireBasis).toEqual({
      focus_ref: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      question_route: 'route',
      read_mode: 'focus-card',
      world_frame: composeWorldFrame(
        {
          repoPath: 'C:/projects/aurelia-ls2',
          target: 'workspace',
          profilePath: 'profiles/framework-core.json',
        },
        {
          regimeAnchor: 'hosted',
          partiality: 'complete',
          freshness: 'live',
        },
      ),
      governing_anchor_refs: ['claim:1'],
    });

    const compatBasis = toWireContinuationBasis({
      focusRef: { kind: 'type', value: 'WorkspaceAuthority' },
      questionRoute: 'join',
      readMode: 'supporting-evidence',
      worldFrame: composeWorldFrame(
        { repoPath: 'C:/projects/aurelia-ls2' },
        { regimeAnchor: 'batch', freshness: 'snapshot' },
      ),
    });

    expect(compatBasis).toMatchObject({
      question_route: 'join',
      read_mode: 'supporting-evidence',
      world_frame: {
        repoPath: 'C:/projects/aurelia-ls2',
        regimeAnchor: 'batch',
        freshness: 'snapshot',
      },
    });
  });

  it('keeps reread floors on maintenance routes before flattening to wire payloads', () => {
    const wireDelta = toWireDeltaDescriptor({
      kind: 'project',
      count: 2,
      affectedRefs: ['packages/source-analysis/src/inquiry-wire.ts'],
      rereadFloorSelection: selectMaintenanceQuestionRoute('refresh'),
    });

    expect(wireDelta).toEqual({
      kind: 'project',
      count: 2,
      affected_refs: ['packages/source-analysis/src/inquiry-wire.ts'],
      reread_floor: 'refresh',
    });
  });
});
