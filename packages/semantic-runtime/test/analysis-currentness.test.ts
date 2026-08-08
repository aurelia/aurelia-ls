import { describe, expect, test } from 'vitest';

import {
  SEMANTIC_RUNTIME_ANALYSIS_CURRENTNESS_ERROR_CODE,
  SemanticRuntimeAnalysisCurrentnessError,
  isSemanticRuntimeAnalysisCurrentnessError,
  semanticRuntimeAnalysisCurrentnessFailure,
} from '../src/api/index.js';
import {
  GenerationCurrentnessChangedError,
  GenerationCurrentnessClock,
  requireGenerationCurrentness,
} from '../src/kernel/generation-authority.js';

describe('semantic analysis currentness errors', () => {
  test('projects stable JSON-safe semantic facts in canonical order', () => {
    const error = new SemanticRuntimeAnalysisCurrentnessError({
      message: 'The answer changed while it was being projected.',
      reason: 'computation-inputs-changed',
      answerLeaseKind: 'semantic-runtime-analysis-receipt/1',
      invalidGenerationKeys: ['generation:b', 'generation:a', 'generation:b'],
      changedReadKeys: ['read:b', 'read:a'],
      changedFacets: ['text', 'existence', 'text'],
      changedSemanticFactKeys: [
        'static-project-evaluation-profile:static-project-evaluation-profile:b',
        'project-compiler-options-environment:project-compiler-options-environment',
        'static-project-evaluation-profile:static-project-evaluation-profile:b',
      ],
    });
    const reassignedSemanticFactKeys = [
      'static-project-evaluation-profile:static-project-evaluation-profile:b',
      'project-compiler-options-environment:project-compiler-options-environment',
      'static-project-evaluation-profile:static-project-evaluation-profile:b',
    ];
    (error as unknown as { changedSemanticFactKeys: string[] }).changedSemanticFactKeys =
      reassignedSemanticFactKeys;

    const failure = semanticRuntimeAnalysisCurrentnessFailure(error);

    expect(failure).toEqual({
      code: SEMANTIC_RUNTIME_ANALYSIS_CURRENTNESS_ERROR_CODE,
      reason: 'computation-inputs-changed',
      message: 'The answer changed while it was being projected.',
      answerLeaseKind: 'semantic-runtime-analysis-receipt/1',
      invalidGenerationKeys: ['generation:a', 'generation:b'],
      changedReadKeys: ['read:a', 'read:b'],
      changedFacets: ['existence', 'text'],
      changedSemanticFactKeys: [
        'project-compiler-options-environment:project-compiler-options-environment',
        'static-project-evaluation-profile:static-project-evaluation-profile:b',
      ],
    });
    expect(JSON.parse(JSON.stringify(failure))).toEqual(failure);
    expect(Object.isFrozen(failure)).toBe(true);
    expect(Object.isFrozen(failure.invalidGenerationKeys)).toBe(true);
    expect(Object.isFrozen(failure.changedSemanticFactKeys)).toBe(true);
    expect(failure.changedSemanticFactKeys).not.toBe(reassignedSemanticFactKeys);
  });

  test('recognizes only the nominal error and never infers currentness through arbitrary wrappers', () => {
    const currentness = new SemanticRuntimeAnalysisCurrentnessError({
      message: 'Lease changed.',
      reason: 'query-answer-lease-changed',
    });

    expect(isSemanticRuntimeAnalysisCurrentnessError(currentness)).toBe(true);
    expect(isSemanticRuntimeAnalysisCurrentnessError(new Error('mapping failed', { cause: currentness }))).toBe(false);
    expect(isSemanticRuntimeAnalysisCurrentnessError(new AggregateError([currentness], 'mapping failed'))).toBe(false);
    expect(isSemanticRuntimeAnalysisCurrentnessError({
      code: SEMANTIC_RUNTIME_ANALYSIS_CURRENTNESS_ERROR_CODE,
      reason: currentness.reason,
    })).toBe(false);
  });

  test('keeps generation proof failure as the narrow nominal subclass', () => {
    const clock = new GenerationCurrentnessClock();
    const witness = clock.capture('project-input-generation:app');
    clock.advance();

    let failure: unknown;
    try {
      requireGenerationCurrentness(witness);
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(GenerationCurrentnessChangedError);
    expect(failure).toBeInstanceOf(SemanticRuntimeAnalysisCurrentnessError);
    expect(failure).toMatchObject({
      reason: 'generation-changed',
      invalidKeys: ['project-input-generation:app'],
      invalidGenerationKeys: ['project-input-generation:app'],
    });
  });
});
