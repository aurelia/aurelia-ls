import type { IssueSeverity, TrustKind } from './outcome-algebra.js';

import type { AnswerRef } from './answer-card.js';

export const ANSWER_DOCUMENT_SCHEMA_VERSION = 'v1alpha1' as const;

export const ANSWER_BLOCK_KINDS = [
  'paragraph',
  'bullet-list',
  'finding-list',
  'witness-list',
  'ref-list',
  'key-fact-list',
] as const;

export const ANSWER_BLOCK_IMPORTANCE = [
  'primary',
  'supporting',
  'detail',
] as const;

export type AnswerBlockKind =
  typeof ANSWER_BLOCK_KINDS[number];

export type AnswerBlockImportance =
  typeof ANSWER_BLOCK_IMPORTANCE[number];

export interface AnswerDocumentFinding<
  TRef extends AnswerRef = AnswerRef,
> {
  readonly code: string;
  readonly title: string;
  readonly summary: string;
  readonly severity?: IssueSeverity;
  readonly trust?: TrustKind;
  readonly primaryRef?: TRef;
  readonly relatedRefs?: readonly TRef[];
  readonly evidence?: readonly string[];
}

export interface AnswerDocumentWitness<
  TRef extends AnswerRef = AnswerRef,
> {
  readonly label: string;
  readonly summary: string;
  readonly trust?: TrustKind;
  readonly routeClass?: string;
  readonly refs?: readonly TRef[];
}

export interface AnswerDocumentFact {
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
}

interface AnswerBlockBase {
  readonly kind: AnswerBlockKind;
  readonly title?: string;
  readonly importance?: AnswerBlockImportance;
}

export interface AnswerParagraphBlock extends AnswerBlockBase {
  readonly kind: 'paragraph';
  readonly lines: readonly string[];
}

export interface AnswerBulletListBlock extends AnswerBlockBase {
  readonly kind: 'bullet-list';
  readonly items: readonly string[];
}

export interface AnswerFindingListBlock<
  TRef extends AnswerRef = AnswerRef,
> extends AnswerBlockBase {
  readonly kind: 'finding-list';
  readonly findings: readonly AnswerDocumentFinding<TRef>[];
}

export interface AnswerWitnessListBlock<
  TRef extends AnswerRef = AnswerRef,
> extends AnswerBlockBase {
  readonly kind: 'witness-list';
  readonly witnesses: readonly AnswerDocumentWitness<TRef>[];
}

export interface AnswerRefListBlock<
  TRef extends AnswerRef = AnswerRef,
> extends AnswerBlockBase {
  readonly kind: 'ref-list';
  readonly refs: readonly TRef[];
}

export interface AnswerKeyFactListBlock extends AnswerBlockBase {
  readonly kind: 'key-fact-list';
  readonly facts: readonly AnswerDocumentFact[];
}

export type AnswerDocumentBlock<
  TRef extends AnswerRef = AnswerRef,
> =
  | AnswerParagraphBlock
  | AnswerBulletListBlock
  | AnswerFindingListBlock<TRef>
  | AnswerWitnessListBlock<TRef>
  | AnswerRefListBlock<TRef>
  | AnswerKeyFactListBlock;

export interface AnswerDocument<
  TRef extends AnswerRef = AnswerRef,
> {
  readonly schemaVersion: typeof ANSWER_DOCUMENT_SCHEMA_VERSION;
  readonly blocks: readonly AnswerDocumentBlock<TRef>[];
}

export function createAnswerDocument<
  TRef extends AnswerRef = AnswerRef,
>(
  blocks: readonly AnswerDocumentBlock<TRef>[],
): AnswerDocument<TRef> {
  return {
    schemaVersion: ANSWER_DOCUMENT_SCHEMA_VERSION,
    blocks,
  };
}
