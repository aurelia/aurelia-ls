import type { SourceAnalysisFocusKind } from './query-model.js';

export interface SourceAnalysisAnswerRef {
  readonly kind: SourceAnalysisFocusKind | 'subsystem';
  readonly value: string;
  readonly label: string;
  readonly detail?: string;
}

export interface SourceAnalysisAnswerCard<
  TRef extends SourceAnalysisAnswerRef = SourceAnalysisAnswerRef,
> {
  readonly title: string;
  readonly summaryLines: readonly string[];
  readonly primaryRef: TRef;
  readonly relatedRefs: readonly TRef[];
}

export function createSourceAnalysisAnswerCard<
  TRef extends SourceAnalysisAnswerRef,
  TExtra extends object = {},
>(
  value: SourceAnalysisAnswerCard<TRef> & TExtra,
): SourceAnalysisAnswerCard<TRef> & TExtra {
  return value;
}
