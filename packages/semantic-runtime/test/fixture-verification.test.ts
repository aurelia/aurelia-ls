import { describe, expect, test } from 'vitest';

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
