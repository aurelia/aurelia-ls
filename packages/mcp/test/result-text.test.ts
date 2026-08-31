import { describe, expect, test } from 'vitest';

import { aureliaMcpResultText } from '../src/result-text.js';

describe('MCP result text', () => {
  test('reports the app depth, entrypoint policy, and template analysis breadth used', () => {
    const text = aureliaMcpResultText({
      tool: 'aurelia_app_query',
      value: {
        summary: 'Answered template completion.',
        result: 'answered',
        selection: 'selected',
        coverage: 'complete',
        analysisDepth: 'binding-observation',
        applicationEntrypointPolicy: 'aggregate-independent-graphs',
        templateAnalysisBreadth: 'resource-local',
        value: { displayText: 'Template completion candidates.' },
      },
    });

    expect(text).toContain('Analysis depth used: binding-observation.');
    expect(text).toContain('Application entrypoint policy used: aggregate-independent-graphs.');
    expect(text).toContain('Template analysis breadth used: resource-local.');
  });
});
