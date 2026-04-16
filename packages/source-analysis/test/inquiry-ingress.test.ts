import { describe, expect, it } from 'vitest';

import { createSourceAnalysisInquiryIngress } from '../out/index.js';

describe('SourceAnalysisInquiryIngress', () => {
  it('describes inquiry families and keeps kernel coverage closed', () => {
    const ingress = createSourceAnalysisInquiryIngress();

    const answer = ingress.createDiscoveryAnswer({
      question: 'What can this tool do for package tech debt?',
    });

    expect(answer.outcome.tag).toBe('hit');
    expect(answer.outcome.value?.inquiries.some((inquiry) => inquiry.id === 'package-audit')).toBe(true);
    expect(answer.outcome.value?.diagnostics.uncoveredCommands).toEqual([]);
  });

  it('plans package audit as a public inquiry with a transient session step', () => {
    const ingress = createSourceAnalysisInquiryIngress();

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
    const ingress = createSourceAnalysisInquiryIngress();

    const answer = ingress.createPlanAnswer({
      question: 'I want to understand the repo before editing it.',
      repoPath: 'C:/projects/aurelia-ls2',
    });

    expect(answer.outcome.value?.inquiry?.id).toBe('workspace-orientation');
    expect(answer.outcome.value?.status).toBe('ready');
    expect(answer.outcome.value?.primaryStep?.command).toBe('query.deps.summary');
  });
});
