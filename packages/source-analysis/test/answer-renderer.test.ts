import { describe, expect, it } from 'vitest';

import { createSourceAnalysisAuditAnswer } from '../src/audit.js';
import { loadCurrentSourceAnalysisSnapshots } from '../src/current-snapshots.js';
import {
  renderSourceAnalysisAnswerDocumentToJson,
  renderSourceAnalysisAnswerDocumentToPlainText,
} from '../src/answer-renderer.js';
import { resolveSourceAnalysisInquiryPolicy } from '../src/inquiry-policy.js';
import { createSourceAnalysisRouteWitnessAnswer } from '../src/route-witness.js';

function loadSnapshotsForStructuredAnswers() {
  try {
    return loadCurrentSourceAnalysisSnapshots();
  } catch (error) {
    throw new Error(
      `Current source-analysis snapshots are required for structured answer tests. Run "pnpm source-analysis refresh all".\n\n${(error as Error).message}`,
    );
  }
}

describe('Source-analysis structured answer rendering', () => {
  it('renders one live audit document into compact and expanded views from policy', () => {
    const snapshots = loadSnapshotsForStructuredAnswers();
    const answer = createSourceAnalysisAuditAnswer({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
    }, snapshots);

    const document = answer.outcome.value?.document;
    expect(document).toBeTruthy();

    const compactPolicy = resolveSourceAnalysisInquiryPolicy({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
      readMode: 'summary-card',
    }, {
      focusKind: 'package',
      inquiryEpisode: 'inventory-and-audit-sweep',
      readMode: 'summary-card',
    });
    const expandedPolicy = resolveSourceAnalysisInquiryPolicy({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
      readMode: 'supporting-evidence',
    }, {
      focusKind: 'package',
      inquiryEpisode: 'inventory-and-audit-sweep',
      readMode: 'summary-card',
    });

    const compact = renderSourceAnalysisAnswerDocumentToPlainText(document!, compactPolicy);
    const expanded = renderSourceAnalysisAnswerDocumentToPlainText(document!, expandedPolicy);
    const expandedJson = renderSourceAnalysisAnswerDocumentToJson(document!, expandedPolicy);

    expect(compact.summaryLines.length).toBeLessThanOrEqual(compactPolicy.limits.summaryLineCount);
    expect(expanded.lines.length).toBeGreaterThan(compact.lines.length);
    expect(expandedJson.blocks.some((block) => block.kind === 'finding-list')).toBe(true);
  });

  it('keeps route witnesses as a structured block that survives machine rendering', () => {
    const snapshots = loadSnapshotsForStructuredAnswers();
    const answer = createSourceAnalysisRouteWitnessAnswer({
      focusRef: { kind: 'file', value: 'packages/source-analysis/src/refresh.ts' },
      questionRoute: 'route',
      readMode: 'supporting-evidence',
    }, snapshots);

    const document = answer.outcome.value?.document;
    expect(document).toBeTruthy();
    expect(answer.query.readMode).toBe('supporting-evidence');

    const policy = resolveSourceAnalysisInquiryPolicy(answer.query, {
      focusKind: 'file',
      inquiryEpisode: 'bounded-closure-explanation',
      readMode: 'focus-card',
    });
    const rendered = renderSourceAnalysisAnswerDocumentToJson(document!, policy);
    const witnessBlock = rendered.blocks.find((block) => block.kind === 'witness-list');

    expect(witnessBlock).toBeTruthy();
    if (!witnessBlock || witnessBlock.kind !== 'witness-list') {
      throw new Error('Expected a witness-list block.');
    }
    expect(witnessBlock.witnesses[0]?.summary).toContain('manifest-bin/qualified');
  });
});
