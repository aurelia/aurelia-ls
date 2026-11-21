import { describe, expect, test } from 'vitest';
import { expectedSemanticEffectFilters, ExpectedSemanticEffect, ExpectedSemanticEffectKind } from '../src/fixture-verification/expected-effect.js';
import { observedCountForExpectedSemanticEffect, type ExpectedSemanticEffectObservationSnapshot } from '../src/fixture-verification/effect-observation.js';

import {
  answer,
  COMPLETE_COLLECTION_ANSWER_OPTIONS,
} from '../src/api/answer-helpers.js';

import type { SemanticApplicationTopologyResult } from '../src/api/app-topology.js';
import {
  SemanticAppQueryKind,
  SemanticRuntimeAnswerResult,
  type SemanticAppQuery,
  type SemanticAppSummary,
} from '../src/api/contracts.js';
import {
  readFixtureVerificationSnapshot,
  type FixtureVerificationAppSnapshotSource,
} from '../src/fixture-verification/verification.js';

test('verifies external template ownership and applies resource-definition filters to actual rows', () => {
  const snapshot = {
    components: [
      { template: { source: { sourceFileRole: 'app-source', path: 'inline.ts' } } },
      { template: { source: { sourceFileRole: 'template', path: 'external.html' } } },
    ],
    resourceDefinitions: 2,
    resourceDefinitionRows: [{ name: 'first' }, { name: 'second' }],
  } as unknown as ExpectedSemanticEffectObservationSnapshot;
  expect(observedCountForExpectedSemanticEffect(
    ExpectedSemanticEffect.fact('external template', ExpectedSemanticEffectKind.ExternalTemplate), snapshot,
  )).toBe(1);
  const count = (name: string, data = snapshot) => observedCountForExpectedSemanticEffect(
    ExpectedSemanticEffect.fact('named resource', ExpectedSemanticEffectKind.ResourceDefinition, undefined, null,
      undefined, null, expectedSemanticEffectFilters(['name', name])), data,
  );
  expect(count('first')).toBe(1);
  expect(count('absent')).toBe(0);
  expect(count('first', { ...snapshot, resourceDefinitionRows: null })).toBeNull();
});

describe('fixture verification', () => {
  test('routes every public projection through the fixture inquiry profile', () => {
    const queries: SemanticAppQuery[] = [];
    const source: FixtureVerificationAppSnapshotSource = {
      summary: () => answer(
        SemanticRuntimeAnswerResult.Answered,
        'Fixture summary.',
        {} as SemanticAppSummary,
        COMPLETE_COLLECTION_ANSWER_OPTIONS,
      ),
      ask: (query) => {
        queries.push(query);
        return query.kind === SemanticAppQueryKind.AppTopology
          ? answer(
              SemanticRuntimeAnswerResult.Answered,
              'Fixture topology.',
              { routes: [] } as unknown as SemanticApplicationTopologyResult,
              COMPLETE_COLLECTION_ANSWER_OPTIONS,
            )
          : answer(
              SemanticRuntimeAnswerResult.Answered,
              `Fixture rows for ${query.kind}.`,
              { rows: [] },
              COMPLETE_COLLECTION_ANSWER_OPTIONS,
            );
      },
    };

    readFixtureVerificationSnapshot(source);

    expect(queries.length).toBeGreaterThan(30);
    expect(queries.every((query) => query.inquiryProfile === 'fixture')).toBe(true);
  });
});
