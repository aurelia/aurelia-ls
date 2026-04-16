import { describe, expect, it } from 'vitest';

import { createSourceAnalysisCapabilityIngress } from '../out/index.js';

describe('SourceAnalysisCapabilityIngress', () => {
  it('discovers route-witness as the best fit for why-alive questions', () => {
    const ingress = createSourceAnalysisCapabilityIngress();

    const answer = ingress.createDiscoveryAnswer({
      question: 'Why is packages/source-analysis/src/refresh.ts alive?',
    });

    expect(answer.outcome.tag).toBe('hit');
    expect(answer.outcome.value?.capabilities[0]?.command).toBe('query.route.witness');
  });

  it('plans a package audit invocation from a natural-language question', () => {
    const ingress = createSourceAnalysisCapabilityIngress();

    const answer = ingress.createPlanAnswer({
      question: 'Audit @aurelia-ls/source-analysis for tech debt.',
      sessionId: 'sa-1',
    });

    expect(answer.outcome.tag).toBe('hit');
    expect(answer.outcome.value?.status).toBe('ready');
    expect(answer.outcome.value?.invocation).toEqual({
      command: 'query.audit.package',
      args: {
        sessionId: 'sa-1',
        packageName: '@aurelia-ls/source-analysis',
      },
    });
  });

  it('repairs wrong command labels toward the declared catalog command', () => {
    const ingress = createSourceAnalysisCapabilityIngress();

    const answer = ingress.createRepairAnswer({
      command: 'query.audit.pkg',
      question: 'Audit @aurelia-ls/source-analysis for tech debt.',
      args: {
        sessionId: 'sa-1',
        packageName: '@aurelia-ls/source-analysis',
      },
    });

    expect(answer.outcome.tag).toBe('reroute');
    expect(answer.outcome.value?.status).toBe('repaired');
    expect(answer.outcome.value?.invocation).toEqual({
      command: 'query.audit.package',
      args: {
        sessionId: 'sa-1',
        packageName: '@aurelia-ls/source-analysis',
      },
    });
  });
});
