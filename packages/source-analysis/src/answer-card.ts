import type { SourceAnalysisFocusKind } from './query-model.js';
import type { SourceAnalysisAnswerDocument } from './answer-document.js';
import type { SourceAnalysisInquiryPolicy } from './inquiry-policy.js';
import { renderSourceAnalysisAnswerDocumentToPlainText } from './answer-renderer.js';

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
  readonly document?: SourceAnalysisAnswerDocument<TRef>;
}

export function createSourceAnalysisAnswerCard<
  TRef extends SourceAnalysisAnswerRef,
  TExtra extends object = {},
>(
  value: SourceAnalysisAnswerCard<TRef> & TExtra,
): SourceAnalysisAnswerCard<TRef> & TExtra {
  return value;
}

export interface CreateStructuredSourceAnalysisAnswerCardOptions<
  TRef extends SourceAnalysisAnswerRef,
  TExtra extends object = {},
> {
  readonly title: string;
  readonly primaryRef: TRef;
  readonly relatedRefs: readonly TRef[];
  readonly document: SourceAnalysisAnswerDocument<TRef>;
  readonly policy: SourceAnalysisInquiryPolicy;
  readonly extra?: TExtra;
}

export function createStructuredSourceAnalysisAnswerCard<
  TRef extends SourceAnalysisAnswerRef,
  TExtra extends object = {},
>(
  options: CreateStructuredSourceAnalysisAnswerCardOptions<TRef, TExtra>,
): SourceAnalysisAnswerCard<TRef> & TExtra {
  const rendered = renderSourceAnalysisAnswerDocumentToPlainText(options.document, options.policy);
  const extra = (options.extra ?? {}) as TExtra;
  return {
    title: options.title,
    summaryLines: rendered.summaryLines,
    primaryRef: options.primaryRef,
    relatedRefs: options.relatedRefs.slice(0, options.policy.limits.relatedRefCount),
    document: options.document,
    ...extra,
  };
}
