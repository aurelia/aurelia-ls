import {
  CustomElementTemplateModuleRole,
  TemplateCompilerCompiledHandoffState,
  type SemanticAppTemplateCompilerHandoffResource,
} from '@aurelia-ls/semantic-runtime/browser-template';
import { describe, expect, it } from 'vitest';
import { planSemanticAotCompilation } from '../src/semantic-artifact-provider.js';

describe('application-wide compatible realization', () => {
  it('preserves all definitions for an unsupported hook and keeps strict refusal', () => {
    const resources = [resource('fallback', 'unsupported'), resource('sibling', 'exact')];
    const compatible = planSemanticAotCompilation(resources, 'compatible');
    expect(compatible.fallbackScope).toBe('application');
    expect(compatible.compiled).toEqual([]);
    expect(names(compatible.preserved)).toEqual(['fallback', 'sibling']);
    expect(compatible.unavailable).toEqual([]);
    const strict = planSemanticAotCompilation(resources, 'strict');
    expect(strict.fallbackScope).toBe('none');
    expect(strict.preserved).toEqual([]);
    expect(names(strict.unavailable)).toEqual(['fallback']);
  });

  it('does not depend on shared carriers or template identities to preserve otherwise exact code', () => {
    const resources = [
      resource('fallback', 'unsupported', 'carrier-a', 'view-a.html'),
      resource('same-carrier', 'exact', 'carrier-a', 'view-b.html'),
      resource('same-view', 'exact', 'carrier-b', 'view-b.html'),
      resource('independent', 'exact', 'carrier-c', 'view-c.html'),
    ];
    const plan = planSemanticAotCompilation(resources, 'compatible');
    expect(names(plan.preserved)).toEqual(['fallback', 'same-carrier', 'same-view', 'independent']);
    expect(plan.compiled).toEqual([]);
  });

  it('preserves open sibling analysis but does not hide abrupt execution', () => {
    const resources = [
      resource('fallback', 'unsupported', 'shared'),
      resource('invalid', 'abrupt', 'shared'),
      resource('unknown', 'open', 'separate'),
    ];
    expect(names(planSemanticAotCompilation(resources, 'compatible').unavailable)).toEqual(['invalid']);
  });

  it('keeps compatible builds fully compiled when no fallback is required', () => {
    const plan = planSemanticAotCompilation([resource('exact', 'exact')], 'compatible');
    expect(plan.fallbackScope).toBe('none');
    expect(names(plan.compiled)).toEqual(['exact']);
    expect(plan.preserved).toEqual([]);
    expect(plan.unavailable).toEqual([]);
  });

  it('does not require an AOT source carrier to leave the application unmodified', () => {
    const missing = { ...resource('missing', 'unsupported'), address: null };
    const plan = planSemanticAotCompilation([missing], 'compatible');
    expect(plan.fallbackScope).toBe('application');
    expect(names(plan.preserved)).toEqual(['missing']);
    expect(plan.unavailable).toEqual([]);
  });

  it('does not turn unidentified open analysis into an application fallback trigger', () => {
    const plan = planSemanticAotCompilation([resource('unknown', 'open')], 'compatible');
    expect(plan.fallbackScope).toBe('none');
    expect(names(plan.unavailable)).toEqual(['unknown']);
  });

  it.each([TemplateCompilerCompiledHandoffState.Pending, TemplateCompilerCompiledHandoffState.Ineligible])(
    'keeps %s compiler outcomes visible even when another hook requires JIT', (state) => {
      const blocked = { ...resource('blocked', 'open'), state } as SemanticAppTemplateCompilerHandoffResource;
      const plan = planSemanticAotCompilation([resource('fallback', 'unsupported'), blocked], 'compatible');
      expect(names(plan.unavailable)).toEqual(['blocked']);
    },
  );

  it('keeps an issue-backed frontier visible rather than classifying its message', () => {
    const issue = {
      ...resource('issue', 'open'), reasons: [{ frontierCause: { issue: { issueKind: 'test-issue' } } }],
    } as unknown as SemanticAppTemplateCompilerHandoffResource;
    const plan = planSemanticAotCompilation([resource('fallback', 'unsupported'), issue], 'compatible');
    expect(names(plan.unavailable)).toEqual(['issue']);
  });
});

function names(resources: readonly SemanticAppTemplateCompilerHandoffResource[]): readonly string[] {
  return resources.map((resource) => resource.resourceName);
}

function resource(
  name: string,
  outcome: 'exact' | 'unsupported' | 'open' | 'abrupt',
  carrier = name,
  template = `${name}.html`,
  targetIdentity: string | null = null,
): SemanticAppTemplateCompilerHandoffResource {
  // Admission consumes shared outcome/issue authority; compiler payload geometry is intentionally absent.
  return {
    resourceName: name,
    source: { path: `C:/fixture/${template}` },
    address: {
      sourceAttachment: {
        carrier: { sourceFilePath: `C:/fixture/${carrier}.ts`, start: 0, end: 10 },
        templateModuleRole: CustomElementTemplateModuleRole.TemplateValue,
        targetIdentityHandle: targetIdentity,
      },
    },
    state: outcome === 'exact' ? TemplateCompilerCompiledHandoffState.Exact
      : outcome === 'abrupt' ? TemplateCompilerCompiledHandoffState.Abrupt : TemplateCompilerCompiledHandoffState.Open,
    value: outcome === 'exact' ? {} : null,
    reasons: [],
    runtimeFallback: outcome === 'unsupported' ? 'process-content-unsupported' : null,
  } as unknown as SemanticAppTemplateCompilerHandoffResource;
}
