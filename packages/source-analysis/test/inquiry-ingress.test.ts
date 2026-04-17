import { describe, expect, it } from 'vitest';

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
});
