import {
  SourcePlanContributionOriginKind,
  SourcePlanLanguage,
  sourcePlanSourceFragmentContribution,
  sourcePlanTypeScriptImportContribution,
  type SourcePlanContribution,
  type SourcePlanContributionOrigin,
} from '../source-plan/source-plan.js';
import {
  AppBuilderSourceFragmentOriginKind,
  type AppBuilderPartSourceFragment,
  type AppBuilderSourceFragmentOrigin,
} from './part-source-invocation.js';

/** Convert app-builder fragment origin into neutral source-plan contribution origin. */
export function appBuilderPartSourceFragmentOriginForSourcePlan(
  origin: AppBuilderSourceFragmentOrigin | undefined,
): SourcePlanContributionOrigin | null {
  if (origin == null) {
    return null;
  }
  switch (origin.kind) {
    case AppBuilderSourceFragmentOriginKind.PartSourceInvocation:
      return {
        kind: SourcePlanContributionOriginKind.AppBuilderPartSourceInvocation,
        partKind: origin.partKind,
        partId: origin.partId,
        operationKind: origin.operationKind,
        applicationSite: origin.applicationSite,
        slotKinds: origin.slotKinds,
      };
    case AppBuilderSourceFragmentOriginKind.SourceLoweringTarget:
      return {
        kind: SourcePlanContributionOriginKind.AppBuilderSourceLoweringTarget,
        targetKind: origin.targetKind,
        targetId: origin.targetId,
        surfaceKind: origin.surfaceKind,
      };
    case AppBuilderSourceFragmentOriginKind.SourceLoweringInvocation:
      return {
        kind: SourcePlanContributionOriginKind.AppBuilderSourceLoweringInvocation,
        targetKind: origin.targetKind,
        targetId: origin.targetId,
        controlPatternId: origin.controlPatternId,
        controlId: origin.controlId,
        innerControlPatternId: origin.innerControlPatternId,
      };
    case AppBuilderSourceFragmentOriginKind.SourceLoweringComposition:
      return {
        kind: SourcePlanContributionOriginKind.AppBuilderSourceLoweringComposition,
        compositionKind: origin.compositionKind,
        targetKind: origin.targetKind,
        targetId: origin.targetId,
        memberTargetIds: origin.memberTargetIds,
      };
  }
}

/** Convert one app-builder fragment into source-plan contributions for a concrete file language. */
export function appBuilderPartSourceFragmentContributions(
  fragment: AppBuilderPartSourceFragment,
  language: SourcePlanLanguage,
): readonly SourcePlanContribution[] {
  const origin = appBuilderPartSourceFragmentOriginForSourcePlan(fragment.origin);
  return [
    sourcePlanSourceFragmentContribution(language, fragment.text, origin),
    ...(fragment.requiredImports ?? []).map((importRequirement) =>
      sourcePlanTypeScriptImportContribution(importRequirement, origin)
    ),
  ];
}

/** Convert several app-builder fragments into source-plan contributions for a concrete file language. */
export function appBuilderPartSourceFragmentsContributions(
  fragments: readonly AppBuilderPartSourceFragment[],
  language: SourcePlanLanguage,
): readonly SourcePlanContribution[] {
  return fragments.flatMap((fragment) => appBuilderPartSourceFragmentContributions(fragment, language));
}
