import type { AppBuilderPartSourceFragment } from '../part-source-invocation.js';
import { AppBuilderPartSourceFragmentKind } from '../part-source-invocation.js';
import type { AppBuilderSourceLoweringComposition } from './source-lowering-composition-contracts.js';
import type { AppBuilderSourceLoweringInvocation } from './source-lowering-invocation.js';
import {
  AppBuilderSourceLoweringSourcePlanIssueKind,
  type AppBuilderSourceLoweringSourcePlanIssue,
} from './source-lowering-source-plan-contracts.js';

export function sourceLoweringInvocationIssues(
  lowering: AppBuilderSourceLoweringInvocation | null,
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  return lowering == null
    ? []
    : lowering.issues.map((issue) => ({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.SourceLoweringInvocationIssue,
        targetRef: issue.targetRef,
        sourceLoweringInvocationIssue: issue,
        summary: `Source-lowering invocation issue blocks SourcePlan preview: ${issue.summary}`,
      }));
}

export function sourceLoweringCompositionIssues(
  lowering: AppBuilderSourceLoweringComposition | null,
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  return lowering == null
    ? []
    : lowering.issues.map((issue) => ({
        issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.SourceLoweringCompositionIssue,
        targetRef: issue.targetRef,
        sourceLoweringCompositionIssue: issue,
        summary: `Source-lowering composition issue blocks SourcePlan preview: ${issue.summary}`,
      }));
}


export function templateFragmentIssues(
  fragments: readonly AppBuilderPartSourceFragment[],
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  if (fragments.length === 0) {
    return [{
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingTemplateFragments,
      summary: 'App-builder SourcePlan preview needs at least one complete HTML-template fragment before it can produce file text.',
    }];
  }
  return fragments.flatMap((fragment): readonly AppBuilderSourceLoweringSourcePlanIssue[] => {
    switch (fragment.kind) {
      case AppBuilderPartSourceFragmentKind.TemplateElement:
      case AppBuilderPartSourceFragmentKind.TextInterpolation:
        return [];
      case AppBuilderPartSourceFragmentKind.TemplateAttribute:
      case AppBuilderPartSourceFragmentKind.BindingExpression:
      case AppBuilderPartSourceFragmentKind.TypeScriptDecorator:
      case AppBuilderPartSourceFragmentKind.TypeScriptObjectProperty:
      case AppBuilderPartSourceFragmentKind.TypeScriptExpression:
      case AppBuilderPartSourceFragmentKind.TypeScriptTopLevelDeclaration:
      case AppBuilderPartSourceFragmentKind.TypeScriptClassMember:
        return [{
          issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedTemplateFragmentKind,
          fragmentKind: fragment.kind,
          summary: `Fragment kind '${fragment.kind}' cannot be emitted as top-level HTML template file text by this SourcePlan preview.`,
        }];
    }
  });
}

export function typeScriptTopLevelFragmentIssues(
  fragments: readonly AppBuilderPartSourceFragment[],
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  return fragments.flatMap((fragment): readonly AppBuilderSourceLoweringSourcePlanIssue[] => {
    if (fragment.kind === AppBuilderPartSourceFragmentKind.TypeScriptTopLevelDeclaration) {
      return [];
    }
    return [{
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedTypeScriptTopLevelFragmentKind,
      fragmentKind: fragment.kind,
      summary: `Fragment kind '${fragment.kind}' cannot be emitted as a TypeScript top-level declaration by this component-pair SourcePlan preview.`,
    }];
  });
}

export function classMemberFragmentIssues(
  fragments: readonly AppBuilderPartSourceFragment[],
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  return fragments.flatMap((fragment): readonly AppBuilderSourceLoweringSourcePlanIssue[] => {
    if (fragment.kind === AppBuilderPartSourceFragmentKind.TypeScriptClassMember) {
      return [];
    }
    return [{
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.UnsupportedClassMemberFragmentKind,
      fragmentKind: fragment.kind,
      summary: `Fragment kind '${fragment.kind}' cannot be emitted as a TypeScript class member by this component-pair SourcePlan preview.`,
    }];
  });
}
