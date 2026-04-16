import type { SourceAnalysisIssueSeverity, SourceAnalysisTrustKind } from './outcome-algebra.js';

import type { SourceAnalysisAnswerRef } from './answer-card.js';

export const SOURCE_ANALYSIS_ANSWER_DOCUMENT_SCHEMA_VERSION = 'v1alpha1' as const;

export const SOURCE_ANALYSIS_ANSWER_BLOCK_KINDS = [
  'paragraph',
  'bullet-list',
  'finding-list',
  'witness-list',
  'ref-list',
  'key-fact-list',
] as const;

export const SOURCE_ANALYSIS_ANSWER_BLOCK_IMPORTANCE = [
  'primary',
  'supporting',
  'detail',
] as const;

export type SourceAnalysisAnswerBlockKind =
  typeof SOURCE_ANALYSIS_ANSWER_BLOCK_KINDS[number];

export type SourceAnalysisAnswerBlockImportance =
  typeof SOURCE_ANALYSIS_ANSWER_BLOCK_IMPORTANCE[number];

export interface SourceAnalysisAnswerDocumentFinding<
  TRef extends SourceAnalysisAnswerRef = SourceAnalysisAnswerRef,
> {
  readonly code: string;
  readonly title: string;
  readonly summary: string;
  readonly severity?: SourceAnalysisIssueSeverity;
  readonly trust?: SourceAnalysisTrustKind;
  readonly primaryRef?: TRef;
  readonly relatedRefs?: readonly TRef[];
  readonly evidence?: readonly string[];
}

export interface SourceAnalysisAnswerDocumentWitness<
  TRef extends SourceAnalysisAnswerRef = SourceAnalysisAnswerRef,
> {
  readonly label: string;
  readonly summary: string;
  readonly trust?: SourceAnalysisTrustKind;
  readonly routeClass?: string;
  readonly refs?: readonly TRef[];
}

export interface SourceAnalysisAnswerDocumentFact {
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
}

interface SourceAnalysisAnswerBlockBase {
  readonly kind: SourceAnalysisAnswerBlockKind;
  readonly title?: string;
  readonly importance?: SourceAnalysisAnswerBlockImportance;
}

export interface SourceAnalysisAnswerParagraphBlock extends SourceAnalysisAnswerBlockBase {
  readonly kind: 'paragraph';
  readonly lines: readonly string[];
}

export interface SourceAnalysisAnswerBulletListBlock extends SourceAnalysisAnswerBlockBase {
  readonly kind: 'bullet-list';
  readonly items: readonly string[];
}

export interface SourceAnalysisAnswerFindingListBlock<
  TRef extends SourceAnalysisAnswerRef = SourceAnalysisAnswerRef,
> extends SourceAnalysisAnswerBlockBase {
  readonly kind: 'finding-list';
  readonly findings: readonly SourceAnalysisAnswerDocumentFinding<TRef>[];
}

export interface SourceAnalysisAnswerWitnessListBlock<
  TRef extends SourceAnalysisAnswerRef = SourceAnalysisAnswerRef,
> extends SourceAnalysisAnswerBlockBase {
  readonly kind: 'witness-list';
  readonly witnesses: readonly SourceAnalysisAnswerDocumentWitness<TRef>[];
}

export interface SourceAnalysisAnswerRefListBlock<
  TRef extends SourceAnalysisAnswerRef = SourceAnalysisAnswerRef,
> extends SourceAnalysisAnswerBlockBase {
  readonly kind: 'ref-list';
  readonly refs: readonly TRef[];
}

export interface SourceAnalysisAnswerKeyFactListBlock extends SourceAnalysisAnswerBlockBase {
  readonly kind: 'key-fact-list';
  readonly facts: readonly SourceAnalysisAnswerDocumentFact[];
}

export type SourceAnalysisAnswerDocumentBlock<
  TRef extends SourceAnalysisAnswerRef = SourceAnalysisAnswerRef,
> =
  | SourceAnalysisAnswerParagraphBlock
  | SourceAnalysisAnswerBulletListBlock
  | SourceAnalysisAnswerFindingListBlock<TRef>
  | SourceAnalysisAnswerWitnessListBlock<TRef>
  | SourceAnalysisAnswerRefListBlock<TRef>
  | SourceAnalysisAnswerKeyFactListBlock;

export interface SourceAnalysisAnswerDocument<
  TRef extends SourceAnalysisAnswerRef = SourceAnalysisAnswerRef,
> {
  readonly schemaVersion: typeof SOURCE_ANALYSIS_ANSWER_DOCUMENT_SCHEMA_VERSION;
  readonly blocks: readonly SourceAnalysisAnswerDocumentBlock<TRef>[];
}

export function createSourceAnalysisAnswerDocument<
  TRef extends SourceAnalysisAnswerRef = SourceAnalysisAnswerRef,
>(
  blocks: readonly SourceAnalysisAnswerDocumentBlock<TRef>[],
): SourceAnalysisAnswerDocument<TRef> {
  return {
    schemaVersion: SOURCE_ANALYSIS_ANSWER_DOCUMENT_SCHEMA_VERSION,
    blocks,
  };
}
