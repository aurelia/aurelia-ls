import {
  SourcePlanFileRole,
  SourcePlanLanguage,
  SourcePlanOperationKind,
  type SourcePlanFileArtifact,
} from '../source-plan/source-plan.js';
import type { AppBuilderPartSourceFragment } from './part-source-invocation.js';
import { appBuilderPartSourceFragmentsContributions } from './source-plan-contributions.js';

/** Authored HTML plus source-lowering fragments that participated in that HTML. */
export interface AppBuilderHtmlTemplateSource {
  readonly text: string;
  readonly fragments: readonly AppBuilderPartSourceFragment[];
}

/** Convert app-builder HTML plus source fragments into a source-plan template artifact. */
export function appBuilderHtmlTemplateFileArtifact(
  path: string,
  source: AppBuilderHtmlTemplateSource,
): SourcePlanFileArtifact {
  return {
    path,
    role: SourcePlanFileRole.Template,
    language: SourcePlanLanguage.Html,
    operationKind: SourcePlanOperationKind.CreateComponentTemplate,
    text: source.text,
    contributions: appBuilderPartSourceFragmentsContributions(source.fragments, SourcePlanLanguage.Html),
  };
}
