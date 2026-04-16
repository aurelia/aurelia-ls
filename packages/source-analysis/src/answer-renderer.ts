import type { SourceAnalysisAnswerRef } from './answer-card.js';
import type {
  SourceAnalysisAnswerBulletListBlock,
  SourceAnalysisAnswerDocument,
  SourceAnalysisAnswerDocumentBlock,
  SourceAnalysisAnswerFindingListBlock,
  SourceAnalysisAnswerKeyFactListBlock,
  SourceAnalysisAnswerParagraphBlock,
  SourceAnalysisAnswerRefListBlock,
  SourceAnalysisAnswerWitnessListBlock,
} from './answer-document.js';
import type { SourceAnalysisInquiryPolicy } from './inquiry-policy.js';
import { compareByPrecedence } from './inquiry-policy.js';

export interface SourceAnalysisRenderedPlainText {
  readonly summaryLines: readonly string[];
  readonly lines: readonly string[];
}

export function projectSourceAnalysisAnswerDocument<
  TRef extends SourceAnalysisAnswerRef = SourceAnalysisAnswerRef,
>(
  document: SourceAnalysisAnswerDocument<TRef>,
  policy: SourceAnalysisInquiryPolicy,
): SourceAnalysisAnswerDocument<TRef> {
  const blocks = document.blocks
    .slice()
    .sort((left, right) =>
      compareByPrecedence(
        policy.ordering.blockImportance,
        left.importance ?? 'supporting',
        right.importance ?? 'supporting',
      ),
    )
    .slice(0, policy.limits.blockCount)
    .map((block) => projectBlock(block, policy))
    .filter((block): block is SourceAnalysisAnswerDocumentBlock<TRef> => block !== null);

  return {
    schemaVersion: document.schemaVersion,
    blocks,
  };
}

export function renderSourceAnalysisAnswerDocumentToPlainText<
  TRef extends SourceAnalysisAnswerRef = SourceAnalysisAnswerRef,
>(
  document: SourceAnalysisAnswerDocument<TRef>,
  policy: SourceAnalysisInquiryPolicy,
): SourceAnalysisRenderedPlainText {
  const projected = projectSourceAnalysisAnswerDocument(document, policy);
  const lines = projected.blocks.flatMap((block) => renderBlockToText(block));
  return {
    summaryLines: lines.slice(0, policy.limits.summaryLineCount),
    lines,
  };
}

export function renderSourceAnalysisAnswerDocumentToJson<
  TRef extends SourceAnalysisAnswerRef = SourceAnalysisAnswerRef,
>(
  document: SourceAnalysisAnswerDocument<TRef>,
  policy: SourceAnalysisInquiryPolicy,
): SourceAnalysisAnswerDocument<TRef> {
  return projectSourceAnalysisAnswerDocument(document, policy);
}

function projectBlock<
  TRef extends SourceAnalysisAnswerRef = SourceAnalysisAnswerRef,
>(
  block: SourceAnalysisAnswerDocumentBlock<TRef>,
  policy: SourceAnalysisInquiryPolicy,
): SourceAnalysisAnswerDocumentBlock<TRef> | null {
  switch (block.kind) {
    case 'paragraph':
      return projectParagraphBlock(block, policy);
    case 'bullet-list':
      return projectBulletListBlock(block, policy);
    case 'finding-list':
      return projectFindingListBlock(block, policy);
    case 'witness-list':
      return projectWitnessListBlock(block, policy);
    case 'ref-list':
      return projectRefListBlock(block, policy);
    case 'key-fact-list':
      return projectKeyFactListBlock(block, policy);
    default:
      return assertNever(block);
  }
}

function projectParagraphBlock(
  block: SourceAnalysisAnswerParagraphBlock,
  policy: SourceAnalysisInquiryPolicy,
): SourceAnalysisAnswerParagraphBlock | null {
  const lines = block.lines.slice(0, policy.limits.listItemCount);
  if (lines.length === 0) return null;
  return { ...block, lines };
}

function projectBulletListBlock(
  block: SourceAnalysisAnswerBulletListBlock,
  policy: SourceAnalysisInquiryPolicy,
): SourceAnalysisAnswerBulletListBlock | null {
  const items = block.items.slice(0, policy.limits.listItemCount);
  if (items.length === 0) return null;
  return { ...block, items };
}

function projectFindingListBlock<
  TRef extends SourceAnalysisAnswerRef = SourceAnalysisAnswerRef,
>(
  block: SourceAnalysisAnswerFindingListBlock<TRef>,
  policy: SourceAnalysisInquiryPolicy,
): SourceAnalysisAnswerFindingListBlock<TRef> | null {
  const findings = block.findings
    .slice(0, policy.limits.findingCount)
    .map((finding) => ({
      ...finding,
      evidence: finding.evidence?.slice(0, policy.limits.findingEvidenceCount),
      relatedRefs: finding.relatedRefs?.slice(0, policy.limits.refListCount),
    }));
  if (findings.length === 0) return null;
  return { ...block, findings };
}

function projectWitnessListBlock<
  TRef extends SourceAnalysisAnswerRef = SourceAnalysisAnswerRef,
>(
  block: SourceAnalysisAnswerWitnessListBlock<TRef>,
  policy: SourceAnalysisInquiryPolicy,
): SourceAnalysisAnswerWitnessListBlock<TRef> | null {
  const witnesses = block.witnesses
    .slice(0, policy.limits.witnessCount)
    .map((witness) => ({
      ...witness,
      refs: witness.refs?.slice(0, policy.limits.refListCount),
    }));
  if (witnesses.length === 0) return null;
  return { ...block, witnesses };
}

function projectRefListBlock<
  TRef extends SourceAnalysisAnswerRef = SourceAnalysisAnswerRef,
>(
  block: SourceAnalysisAnswerRefListBlock<TRef>,
  policy: SourceAnalysisInquiryPolicy,
): SourceAnalysisAnswerRefListBlock<TRef> | null {
  const refs = block.refs.slice(0, policy.limits.refListCount);
  if (refs.length === 0) return null;
  return { ...block, refs };
}

function projectKeyFactListBlock(
  block: SourceAnalysisAnswerKeyFactListBlock,
  policy: SourceAnalysisInquiryPolicy,
): SourceAnalysisAnswerKeyFactListBlock | null {
  const facts = block.facts.slice(0, policy.limits.factCount);
  if (facts.length === 0) return null;
  return { ...block, facts };
}

function renderBlockToText<
  TRef extends SourceAnalysisAnswerRef = SourceAnalysisAnswerRef,
>(
  block: SourceAnalysisAnswerDocumentBlock<TRef>,
): readonly string[] {
  switch (block.kind) {
    case 'paragraph':
      return block.lines;
    case 'bullet-list':
      return block.items;
    case 'finding-list':
      return block.findings.flatMap((finding) => [
        `${finding.title}: ${finding.summary}`,
        ...(finding.evidence ?? []).map((evidence) => `Evidence: ${evidence}`),
      ]);
    case 'witness-list':
      return block.witnesses.map((witness) => `${witness.label}: ${witness.summary}`);
    case 'ref-list':
      return block.refs.map((ref) => `Related: ${ref.label}${ref.detail ? ` (${ref.detail})` : ''}`);
    case 'key-fact-list':
      return block.facts.map((fact) =>
        `${fact.label}: ${fact.value}${fact.detail ? ` (${fact.detail})` : ''}`,
      );
    default:
      return assertNever(block);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected answer document block: ${JSON.stringify(value)}`);
}
