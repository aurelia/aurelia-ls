import { describe, expect, it } from './test-harness.js';

import { createAuditAnswer } from '../src/audit.js';
import {
  renderAnswerDocumentToJson,
  renderAnswerDocumentToPlainText,
} from '../src/answer-renderer.js';
import { resolveInquiryPolicy } from '../src/inquiry-policy.js';
import { createRouteWitnessAnswer } from '../src/route-witness.js';
import { loadCurrentLiveAnalysisViews } from './live-analysis-views.js';

describe('Source-analysis structured answer rendering', () => {
  it('renders one live audit document into compact and expanded views from policy', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const answer = createAuditAnswer({
      focusRef: { kind: 'package', value: '@aurelia-ls/source-analysis' },
      questionRoute: 'inventory',
    }, analysis);

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
    const compactJson = renderAnswerDocumentToJson(document!, compactPolicy);
    const expandedJson = renderAnswerDocumentToJson(document!, expandedPolicy);
    const findingCount = answer.outcome.value?.findings.length ?? 0;

    expect(compact.summaryLines.length).toBeLessThanOrEqual(compactPolicy.limits.summaryLineCount);
    expect(expanded.lines.length).toBeGreaterThanOrEqual(compact.lines.length);
    expect(expandedJson.blocks.length).toBeGreaterThanOrEqual(compactJson.blocks.length);
    expect(expandedJson.blocks.some((block) => block.kind === 'key-fact-list')).toBe(true);
    expect(expandedJson.blocks.some((block) => block.kind === 'finding-list')).toBe(findingCount > 0);
  });

  it('keeps route witnesses as a structured block that survives machine rendering', () => {
    const analysis = loadCurrentLiveAnalysisViews();
    const answer = createRouteWitnessAnswer({
      focusRef: { kind: 'file', value: 'packages/source-analysis/src/refresh.ts' },
      questionRoute: 'route',
      readMode: 'supporting-evidence',
    }, analysis);

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
