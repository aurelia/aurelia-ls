import type { AnswerDocument } from './answer-document.js';
import type { AnswerRef } from './answer-ref.js';
import type { AnswerRenderPolicy } from './answer-render-policy.js';
import { renderAnswerDocumentToPlainText } from './answer-renderer.js';

export interface AnswerCard<
  TRef extends AnswerRef = AnswerRef,
> {
  readonly title: string;
  readonly summaryLines: readonly string[];
  readonly primaryRef: TRef;
  readonly relatedRefs: readonly TRef[];
  readonly document?: AnswerDocument<TRef>;
}

export function createAnswerCard<
  TRef extends AnswerRef,
  TExtra extends object = {},
>(
  value: AnswerCard<TRef> & TExtra,
): AnswerCard<TRef> & TExtra {
  return value;
}

export interface CreateStructuredAnswerCardOptions<
  TRef extends AnswerRef,
  TExtra extends object = {},
> {
  readonly title: string;
  readonly primaryRef: TRef;
  readonly relatedRefs: readonly TRef[];
  readonly document: AnswerDocument<TRef>;
  readonly policy: AnswerRenderPolicy;
  readonly extra?: TExtra;
}

export function createStructuredAnswerCard<
  TRef extends AnswerRef,
  TExtra extends object = {},
>(
  options: CreateStructuredAnswerCardOptions<TRef, TExtra>,
): AnswerCard<TRef> & TExtra {
  const rendered = renderAnswerDocumentToPlainText(options.document, options.policy);
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
