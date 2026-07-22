import { describe, expect, test } from 'vitest';

import { answer } from '../src/api/answer-helpers.js';
import type { SemanticApplicationTopologyResult } from '../src/api/app-topology.js';
import {
  SemanticAppQueryKind,
  SemanticRuntimeAnswerOutcome,
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
        SemanticRuntimeAnswerOutcome.Hit,
        'Fixture summary.',
        {} as SemanticAppSummary,
      ),
      ask: (query) => {
        queries.push(query);
        return query.kind === SemanticAppQueryKind.AppTopology
          ? answer(
              SemanticRuntimeAnswerOutcome.Hit,
              'Fixture topology.',
              { routes: [] } as unknown as SemanticApplicationTopologyResult,
            )
          : answer(
              SemanticRuntimeAnswerOutcome.Hit,
              `Fixture rows for ${query.kind}.`,
              { rows: [] },
            );
      },
    };

    readFixtureVerificationSnapshot(source);

    expect(queries.length).toBeGreaterThan(30);
    expect(queries.every((query) => query.inquiryProfile === 'fixture')).toBe(true);
  });
});
