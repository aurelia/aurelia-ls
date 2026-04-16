import { describe, expect, it } from 'vitest';

import { createAuditAnswer } from '../src/audit.js';
import { loadCurrentSnapshots } from '../src/current-snapshots.js';
import {
  renderAnswerDocumentToJson,
  renderAnswerDocumentToPlainText,
} from '../src/answer-renderer.js';
import { resolveInquiryPolicy } from '../src/inquiry-policy.js';
import { createRouteWitnessAnswer } from '../src/route-witness.js';

function loadSnapshotsForStructuredAnswers() {
  try {
    return loadCurrentSnapshots();
  } catch (error) {
    throw new Error(
      `Current source-analysis snapshots are required for structured answer tests. Run "pnpm source-analysis refresh all".\n\n${(error as Error).message}`,
    );
  }
}

describe('Source-analysis structured answer rendering', () => {
  it('renders one live audit document into compact and expanded views from policy', () => {
    const snapshots = loadSnapshotsForStructuredAnswers();
    const answer = createAuditAnswer({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
    }, snapshots);

    const document = answer.outcome.value?.document;
    expect(document).toBeTruthy();

    const compactPolicy = resolveInquiryPolicy({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
      readMode: 'summary-card',
    }, {
      focusKind: 'package',
      inquiryEpisode: 'inventory-and-audit-sweep',
      readMode: 'summary-card',
    });
    const expandedPolicy = resolveInquiryPolicy({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
      readMode: 'supporting-evidence',
    }, {
      focusKind: 'package',
      inquiryEpisode: 'inventory-and-audit-sweep',
      readMode: 'summary-card',
    });

    const compact = renderAnswerDocumentToPlainText(document!, compactPolicy);
    const expanded = renderAnswerDocumentToPlainText(document!, expandedPolicy);
    const expandedJson = renderAnswerDocumentToJson(document!, expandedPolicy);

    expect(compact.summaryLines.length).toBeLessThanOrEqual(compactPolicy.limits.summaryLineCount);
    expect(expanded.lines.length).toBeGreaterThan(compact.lines.length);
    expect(expandedJson.blocks.some((block) => block.kind === 'finding-list')).toBe(true);
  });

  it('keeps route witnesses as a structured block that survives machine rendering', () => {
    const snapshots = loadSnapshotsForStructuredAnswers();
    const answer = createRouteWitnessAnswer({
      focusRef: { kind: 'file', value: 'packages/source-analysis/src/refresh.ts' },
      questionRoute: 'route',
      readMode: 'supporting-evidence',
    }, snapshots);

    const document = answer.outcome.value?.document;
    expect(document).toBeTruthy();
    expect(answer.query.readMode).toBe('supporting-evidence');

    const policy = resolveInquiryPolicy(answer.query, {
      focusKind: 'file',
      inquiryEpisode: 'bounded-closure-explanation',
      readMode: 'focus-card',
    });
    const rendered = renderAnswerDocumentToJson(document!, policy);
    const witnessBlock = rendered.blocks.find((block) => block.kind === 'witness-list');

    expect(witnessBlock).toBeTruthy();
    if (!witnessBlock || witnessBlock.kind !== 'witness-list') {
      throw new Error('Expected a witness-list block.');
    }
    expect(witnessBlock.witnesses[0]?.summary).toContain('manifest-bin/qualified');
  });
});
