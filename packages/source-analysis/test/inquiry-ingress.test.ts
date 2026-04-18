import { describe, expect, it } from './test-harness.js';

import { createInquiryIngress } from '../out/inquiry-ingress.js';

describe('InquiryIngress', () => {
  it('describes inquiry families and keeps kernel coverage closed', () => {
    const ingress = createInquiryIngress();

    const answer = ingress.createDiscoveryAnswer({
      question: 'What can this tool do for package tech debt?',
    });

    expect(answer.outcome.tag).toBe('hit');
    expect(answer.outcome.value?.inquiries.some((inquiry) => inquiry.id === 'package-audit')).toBe(true);
    expect(answer.outcome.value?.diagnostics.uncoveredCommands).toEqual([]);
  });

  it('plans package audit as a public inquiry with a transient session step', () => {
    const ingress = createInquiryIngress();

    const answer = ingress.createPlanAnswer({
      question: 'Audit @aurelia-ls/source-analysis for tech debt.',
      repoPath: 'C:/projects/aurelia-ls2',
    });

    expect(answer.outcome.tag).toBe('hit');
    expect(answer.outcome.value?.status).toBe('ready');
    expect(answer.outcome.value?.inquiry?.id).toBe('package-audit');
    expect(answer.outcome.value?.steps.map((step) => step.command)).toEqual([
      'session.open',
      'query.audit.package',
    ]);
    expect(answer.outcome.value?.primaryStep?.command).toBe('query.audit.package');
  });

  it('routes repo orientation questions toward workspace-orientation instead of raw session commands', () => {
    const ingress = createInquiryIngress();

    const answer = ingress.createPlanAnswer({
      question: 'I want to understand the repo before editing it.',
      repoPath: 'C:/projects/aurelia-ls2',
    });

    expect(answer.outcome.value?.inquiry?.id).toBe('workspace-orientation');
    expect(answer.outcome.value?.status).toBe('ready');
    expect(answer.outcome.value?.primaryStep?.command).toBe('query.deps.summary');
  });

  it('plans export-oriented workspace navigation when the question names a public export', () => {
    const ingress = createInquiryIngress();

    const answer = ingress.createPlanAnswer({
      question: 'Show the public export route for createSnapshotHostRuntime.',
      repoPath: 'C:/projects/aurelia-ls2',
    });

    expect(answer.outcome.tag).toBe('hit');
    expect(answer.outcome.value?.status).toBe('ready');
    expect(answer.outcome.value?.inquiry?.id).toBe('workspace-orientation');
    expect(answer.outcome.value?.primaryStep?.command).toBe('query.navigate');
    expect(answer.outcome.value?.primaryStep?.args).toEqual({
      sessionId: '$session.open',
      focusKind: 'export',
      focusValue: 'createSnapshotHostRuntime',
      questionRoute: 'join',
    });
  });

  it('plans symbol-oriented workspace navigation for implementation-location questions', () => {
    const ingress = createInquiryIngress();

    const answer = ingress.createPlanAnswer({
      question: 'Where is createAnalysisViews implemented?',
      repoPath: 'C:/projects/aurelia-ls2',
    });

    expect(answer.outcome.tag).toBe('hit');
    expect(answer.outcome.value?.status).toBe('ready');
    expect(answer.outcome.value?.inquiry?.id).toBe('workspace-orientation');
    expect(answer.outcome.value?.primaryStep?.command).toBe('query.navigate');
    expect(answer.outcome.value?.primaryStep?.args).toEqual({
      sessionId: '$session.open',
      focusKind: 'symbol',
      focusValue: 'createAnalysisViews',
      questionRoute: 'join',
    });
  });

  it('plans package audit for source-area cycle seam questions without asking for another narrowing move', () => {
    const ingress = createInquiryIngress();

    const answer = ingress.createPlanAnswer({
      question: 'Which package-internal dependency seams keep @aurelia-ls/source-analysis in a source-area cycle?',
      repoPath: 'C:/projects/aurelia-ls2',
    });

    expect(answer.outcome.tag).toBe('hit');
    expect(answer.outcome.value?.status).toBe('ready');
    expect(answer.outcome.value?.inquiry?.id).toBe('package-audit');
    expect(answer.outcome.value?.primaryStep?.command).toBe('query.audit.package');
  });

  it('keeps sentence-leading words out of type captures when routing why-alive questions', () => {
    const ingress = createInquiryIngress();

    const answer = ingress.createDiscoveryAnswer({
      question: 'Why is packages/source-analysis/src/refresh.ts alive?',
    });

    expect(answer.outcome.value?.inquiries[0]?.id).toBe('route-explanation');
    expect(answer.outcome.value?.matches[0]?.captures.some((capture) => capture.value === 'Why')).toBe(false);
    expect(answer.outcome.value?.matches[0]?.captures.some((capture) =>
      capture.kind === 'file-path' && capture.value === 'packages/source-analysis/src/refresh.ts',
    )).toBe(true);
    expect(answer.outcome.value?.matches.find((match) =>
      match.inquiry.id === 'workspace-orientation',
    )?.confusionMatches).toContain('alive');
  });

  it('plans snapshot materialization as a maintenance intent instead of a presentation read', () => {
    const ingress = createInquiryIngress();

    const answer = ingress.createPlanAnswer({
      question: 'Materialize the current snapshots to disk.',
      repoPath: 'C:/projects/aurelia-ls2',
    });

    expect(answer.outcome.tag).toBe('hit');
    expect(answer.outcome.value?.inquiry?.id).toBe('snapshot-maintenance');
    expect(answer.outcome.value?.steps.map((step) => step.command)).toEqual([
      'session.open',
      'materializeSnapshots',
    ]);
    expect(answer.outcome.value?.primaryStep?.command).toBe('materializeSnapshots');
  });

  it('plans file invalidation as a session-maintenance intent with file-scoped args', () => {
    const ingress = createInquiryIngress();

    const answer = ingress.createPlanAnswer({
      question: 'Invalidate this dirty file in the current source-analysis session.',
      repoPath: 'C:/projects/aurelia-ls2',
      focusKind: 'file',
      focusValue: 'packages/source-analysis/src/inquiry-ingress.ts',
    });

    expect(answer.outcome.tag).toBe('hit');
    expect(answer.outcome.value?.inquiry?.id).toBe('snapshot-maintenance');
    expect(answer.outcome.value?.primaryStep?.command).toBe('session.invalidate');
    expect(answer.outcome.value?.primaryStep?.args).toEqual({
      sessionId: '$session.open',
      scope: 'files',
      files: ['packages/source-analysis/src/inquiry-ingress.ts'],
    });
  });
});
