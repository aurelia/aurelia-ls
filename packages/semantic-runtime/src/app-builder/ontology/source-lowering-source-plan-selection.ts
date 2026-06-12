import { appBuilderHtmlTemplateFileArtifact } from '../template-source-plan.js';
import {
  SourcePlan,
  SourcePlanAssembly,
  SourcePlanConflictPolicy,
  SourcePlanFormattingPolicy,
  SourcePlanPackageToolingPolicy,
  SourcePlanPolicy,
  SourcePlanTextAuthority,
} from '../../source-plan/source-plan.js';
import type { AppBuilderPartSourceFragment } from '../part-source-invocation.js';
import type {
  AppBuilderEffectContractId as AppBuilderEffectContractIdValue,
} from './effect.js';
import type { AppBuilderControlUseInventoryRow } from './control-use-inventory.js';
import type { AppBuilderOntologyRowRef } from './relation.js';
import { appBuilderSourceLoweringComposition } from './source-lowering-composition.js';
import type { AppBuilderSourceLoweringComposition } from './source-lowering-composition-contracts.js';
import type { AppBuilderSourceLoweringEmissionContext } from './source-lowering-context.js';
import {
  appBuilderSourceLoweringInvocation,
  type AppBuilderSourceLoweringInvocation,
} from './source-lowering-invocation.js';
import {
  AppBuilderSourceLoweringSourcePlanSelectionKind,
} from './source-lowering-request-field.js';
import {
  lowerApplicationAssemblySourcePlan,
  lowerAppShellSourcePlan,
  lowerDiStateClassSourcePlan,
  lowerLocalViewModelStateSourcePlan,
  lowerRouterBackedListDetailSourcePlan,
} from './source-lowering-source-plan-direct.js';
import { lowerComponentPairSourcePlan } from './source-lowering-source-plan-component-pair.js';
import {
  sourceLoweringCompositionIssues,
  sourceLoweringInvocationIssues,
  templateFragmentIssues,
} from './source-lowering-source-plan-issue-helpers.js';
import { sourcePlanDirectSuppliedInputs, type AppBuilderSourcePlanPlacement } from './source-lowering-source-plan-placement.js';
import {
  AppBuilderSourceLoweringSourcePlanIssueKind,
  type AppBuilderSourceLoweringApplicationAssembly,
  type AppBuilderSourceLoweringAppShell,
  type AppBuilderSourceLoweringComponentPair,
  type AppBuilderSourceLoweringDiStateClass,
  type AppBuilderSourceLoweringLocalViewModelState,
  type AppBuilderSourceLoweringRouterBackedListDetail,
  type AppBuilderSourceLoweringSourcePlanIssue,
  type AppBuilderSourceLoweringSourcePlanRequest,
} from './source-lowering-source-plan-contracts.js';
import type {
  AppBuilderExpectedSemanticEffectPreview,
} from './semantic-effect-witness.js';
import type {
  ExpectedSemanticEffectKind,
} from '../../fixture-verification/expected-effect.js';

/** One selected SourcePlan lowering branch normalized for public answer projection. */
export interface AppBuilderSourceLoweringSourcePlanFrame {
  readonly selectionIssues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
  readonly lowerLevelIssues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
  readonly fragmentIssues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
  readonly sourcePlan: SourcePlan | null;
  readonly sourceLoweringSelectionKind: AppBuilderSourceLoweringSourcePlanSelectionKind | null;
  readonly sourceLoweringTargetRefs: readonly AppBuilderOntologyRowRef[];
  readonly effectContractIds: readonly AppBuilderEffectContractIdValue[];
  readonly expectedEffectKinds: readonly ExpectedSemanticEffectKind[];
  readonly expectedEffects: readonly AppBuilderExpectedSemanticEffectPreview[];
  readonly controlUseInventoryRows: readonly AppBuilderControlUseInventoryRow[];
  readonly sourceLoweringAppShell: AppBuilderSourceLoweringAppShell | null;
  readonly sourceLoweringApplicationAssembly: AppBuilderSourceLoweringApplicationAssembly | null;
  readonly sourceLoweringRouterBackedListDetail: AppBuilderSourceLoweringRouterBackedListDetail | null;
  readonly sourceLoweringDiStateClass: AppBuilderSourceLoweringDiStateClass | null;
  readonly sourceLoweringLocalViewModelState: AppBuilderSourceLoweringLocalViewModelState | null;
  readonly sourceLoweringInvocation: AppBuilderSourceLoweringInvocation | null;
  readonly sourceLoweringComposition: AppBuilderSourceLoweringComposition | null;
  readonly sourceLoweringComponentPair: AppBuilderSourceLoweringComponentPair | null;
}

interface SourcePlanDirectLowerings {
  readonly sourceLoweringAppShell: AppBuilderSourceLoweringAppShell | null;
  readonly sourceLoweringApplicationAssembly: AppBuilderSourceLoweringApplicationAssembly | null;
  readonly sourceLoweringRouterBackedListDetail: AppBuilderSourceLoweringRouterBackedListDetail | null;
  readonly sourceLoweringDiStateClass: AppBuilderSourceLoweringDiStateClass | null;
  readonly sourceLoweringLocalViewModelState: AppBuilderSourceLoweringLocalViewModelState | null;
}

interface SourcePlanTemplateLowering {
  readonly sourceLoweringInvocation: AppBuilderSourceLoweringInvocation | null;
  readonly sourceLoweringComposition: AppBuilderSourceLoweringComposition | null;
  readonly lowering: SourcePlanTemplateFragmentLowering | null;
}

interface SourcePlanTemplateFragmentLowering {
  readonly sourceKind: 'invocation' | 'composition';
  readonly fileTextFragments: readonly AppBuilderPartSourceFragment[];
  readonly contributionFragments: readonly AppBuilderPartSourceFragment[];
  readonly sourceLoweringTargetRefs: readonly AppBuilderOntologyRowRef[];
  readonly effectContractIds: readonly AppBuilderEffectContractIdValue[];
  readonly controlUseInventoryRows: readonly AppBuilderControlUseInventoryRow[];
}

/** Run the one selected app-builder SourcePlan branch without projecting the public answer. */
export function appBuilderSourceLoweringSourcePlanFrame(
  request: AppBuilderSourceLoweringSourcePlanRequest,
  placement: AppBuilderSourcePlanPlacement,
  emissionContext: AppBuilderSourceLoweringEmissionContext,
): AppBuilderSourceLoweringSourcePlanFrame {
  const selectionIssues = sourceLoweringSelectionIssues(request);
  const rootDir = placement.rootDir;
  const templatePath = placement.templatePath;
  const directLowerings = sourcePlanDirectLowerings(request, placement);
  const templateLowering = sourcePlanTemplateLowering(request, emissionContext);
  const sourceLoweringComponentPair = sourcePlanComponentPairLowering(request, placement, emissionContext);
  const lowerLevelIssues = sourcePlanLowerLevelIssues(directLowerings, templateLowering, sourceLoweringComponentPair);
  const fragmentIssues = sourcePlanFragmentIssues(request, selectionIssues, lowerLevelIssues, templateLowering.lowering);
  const sourcePlan = sourcePlanFrameSourcePlan(rootDir, templatePath, directLowerings, sourceLoweringComponentPair, templateLowering.lowering);
  return {
    selectionIssues,
    lowerLevelIssues,
    fragmentIssues,
    sourcePlan,
    sourceLoweringSelectionKind: sourcePlanFrameSelectionKind(directLowerings, templateLowering, sourceLoweringComponentPair),
    sourceLoweringTargetRefs: sourcePlanFrameTargetRefs(directLowerings, sourceLoweringComponentPair, templateLowering.lowering),
    effectContractIds: sourcePlanFrameEffectContractIds(directLowerings, sourceLoweringComponentPair, templateLowering.lowering),
    expectedEffectKinds: sourcePlanFrameExpectedEffectKinds(directLowerings, sourceLoweringComponentPair),
    expectedEffects: sourcePlanFrameExpectedEffects(directLowerings, sourceLoweringComponentPair),
    controlUseInventoryRows: sourceLoweringComponentPair?.controlUseInventoryRows
      ?? templateLowering.lowering?.controlUseInventoryRows
      ?? directLowerings.sourceLoweringApplicationAssembly?.controlUseInventoryRows
      ?? directLowerings.sourceLoweringRouterBackedListDetail?.controlUseInventoryRows
      ?? [],
    ...directLowerings,
    sourceLoweringInvocation: templateLowering.sourceLoweringInvocation,
    sourceLoweringComposition: templateLowering.sourceLoweringComposition,
    sourceLoweringComponentPair,
  };
}

function sourcePlanDirectLowerings(
  request: AppBuilderSourceLoweringSourcePlanRequest,
  placement: AppBuilderSourcePlanPlacement,
): SourcePlanDirectLowerings {
  const rootDir = placement.rootDir;
  const sourceTargetPath = placement.sourceTargetPath;
  return {
    sourceLoweringAppShell: request.sourceLoweringAppShell == null
    ? null
    : lowerAppShellSourcePlan(
        request.sourceLoweringAppShell,
        rootDir,
        sourcePlanDirectSuppliedInputs(
          request,
          rootDir,
          request.sourceLoweringAppShell.targetRef ?? null,
          request.sourceLoweringAppShell.suppliedInputs ?? [],
          request.sourceLoweringAppShell.decisionBundles ?? [],
          'direct AppShell SourcePlan lowering',
        ),
      ),
    sourceLoweringApplicationAssembly: request.sourceLoweringApplicationAssembly == null
    ? null
    : lowerApplicationAssemblySourcePlan(
        request.sourceLoweringApplicationAssembly,
        rootDir,
        sourcePlanDirectSuppliedInputs(
          request,
          rootDir,
          request.sourceLoweringApplicationAssembly.targetRef ?? null,
          request.sourceLoweringApplicationAssembly.suppliedInputs ?? [],
          request.sourceLoweringApplicationAssembly.decisionBundles ?? [],
          'direct application assembly SourcePlan lowering',
        ),
      ),
    sourceLoweringRouterBackedListDetail: request.sourceLoweringRouterBackedListDetail == null
    ? null
    : lowerRouterBackedListDetailSourcePlan(
        request.sourceLoweringRouterBackedListDetail,
        rootDir,
        sourcePlanDirectSuppliedInputs(
          request,
          rootDir,
          request.sourceLoweringRouterBackedListDetail.targetRef ?? null,
          request.sourceLoweringRouterBackedListDetail.suppliedInputs ?? [],
          request.sourceLoweringRouterBackedListDetail.decisionBundles ?? [],
          'direct router-backed list/detail SourcePlan lowering',
        ),
      ),
    sourceLoweringDiStateClass: request.sourceLoweringDiStateClass == null
    ? null
    : lowerDiStateClassSourcePlan(
        request.sourceLoweringDiStateClass,
        rootDir,
        sourceTargetPath,
        sourcePlanDirectSuppliedInputs(
          request,
          rootDir,
          request.sourceLoweringDiStateClass.targetRef ?? null,
          request.sourceLoweringDiStateClass.suppliedInputs ?? [],
          request.sourceLoweringDiStateClass.decisionBundles ?? [],
          'direct DI state-class SourcePlan lowering',
        ),
      ),
    sourceLoweringLocalViewModelState: request.sourceLoweringLocalViewModelState == null
    ? null
    : lowerLocalViewModelStateSourcePlan(
        request.sourceLoweringLocalViewModelState,
        rootDir,
        sourceTargetPath,
        sourcePlanDirectSuppliedInputs(
          request,
          rootDir,
          request.sourceLoweringLocalViewModelState.targetRef ?? null,
          request.sourceLoweringLocalViewModelState.suppliedInputs ?? [],
          request.sourceLoweringLocalViewModelState.decisionBundles ?? [],
          'direct local view-model state SourcePlan lowering',
        ),
        null,
      ),
  };
}

function sourcePlanTemplateLowering(
  request: AppBuilderSourceLoweringSourcePlanRequest,
  emissionContext: AppBuilderSourceLoweringEmissionContext,
): SourcePlanTemplateLowering {
  const sourceLoweringInvocation = request.sourceLoweringInvocation == null
    ? null
    : appBuilderSourceLoweringInvocation({
        ...request.sourceLoweringInvocation,
        emissionContext: request.sourceLoweringInvocation.emissionContext ?? emissionContext,
      });
  const sourceLoweringComposition = request.sourceLoweringComposition == null
    ? null
    : appBuilderSourceLoweringComposition({
        ...request.sourceLoweringComposition,
        emissionContext: request.sourceLoweringComposition.emissionContext ?? emissionContext,
    });
  return {
    sourceLoweringInvocation,
    sourceLoweringComposition,
    lowering: selectedTemplateLowering(sourceLoweringInvocation, sourceLoweringComposition),
  };
}

function sourcePlanComponentPairLowering(
  request: AppBuilderSourceLoweringSourcePlanRequest,
  placement: AppBuilderSourcePlanPlacement,
  emissionContext: AppBuilderSourceLoweringEmissionContext,
): AppBuilderSourceLoweringComponentPair | null {
  return request.sourceLoweringComponentPair == null
    ? null
    : lowerComponentPairSourcePlan(
        request.sourceLoweringComponentPair,
        placement.rootDir,
        placement.templatePath,
        placement.sourceTargetPath,
        sourcePlanDirectSuppliedInputs(
          request,
          placement.rootDir,
          null,
          request.sourceLoweringComponentPair.suppliedInputs ?? [],
          request.sourceLoweringComponentPair.decisionBundles ?? [],
          'component-pair SourcePlan lowering',
        ),
        emissionContext,
      );
}

function sourcePlanLowerLevelIssues(
  directLowerings: SourcePlanDirectLowerings,
  templateLowering: SourcePlanTemplateLowering,
  sourceLoweringComponentPair: AppBuilderSourceLoweringComponentPair | null,
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  const {
    sourceLoweringAppShell,
    sourceLoweringApplicationAssembly,
    sourceLoweringRouterBackedListDetail,
    sourceLoweringDiStateClass,
    sourceLoweringLocalViewModelState,
  } = directLowerings;
  const lowerLevelIssues = [
    ...(sourceLoweringAppShell?.issues ?? []),
    ...(sourceLoweringApplicationAssembly?.issues ?? []),
    ...(sourceLoweringRouterBackedListDetail?.issues ?? []),
    ...(sourceLoweringDiStateClass?.issues ?? []),
    ...(sourceLoweringLocalViewModelState?.issues ?? []),
    ...(sourceLoweringComponentPair?.issues ?? []),
    ...sourceLoweringInvocationIssues(templateLowering.sourceLoweringInvocation),
    ...sourceLoweringCompositionIssues(templateLowering.sourceLoweringComposition),
  ];
  return lowerLevelIssues;
}

function sourcePlanFragmentIssues(
  request: AppBuilderSourceLoweringSourcePlanRequest,
  selectionIssues: readonly AppBuilderSourceLoweringSourcePlanIssue[],
  lowerLevelIssues: readonly AppBuilderSourceLoweringSourcePlanIssue[],
  lowering: SourcePlanTemplateFragmentLowering | null,
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  return request.sourceLoweringAppShell == null
    && request.sourceLoweringApplicationAssembly == null
    && request.sourceLoweringRouterBackedListDetail == null
    && request.sourceLoweringDiStateClass == null
    && request.sourceLoweringLocalViewModelState == null
    && request.sourceLoweringComponentPair == null
    && selectionIssues.length === 0
    && lowerLevelIssues.length === 0
    && lowering != null
    ? templateFragmentIssues(lowering.fileTextFragments)
    : [];
}

function sourcePlanFrameSourcePlan(
  rootDir: string | null,
  templatePath: string | null,
  directLowerings: SourcePlanDirectLowerings,
  sourceLoweringComponentPair: AppBuilderSourceLoweringComponentPair | null,
  lowering: SourcePlanTemplateFragmentLowering | null,
): SourcePlan | null {
  return directLowerings.sourceLoweringAppShell?.sourcePlan
    ?? directLowerings.sourceLoweringApplicationAssembly?.sourcePlan
    ?? directLowerings.sourceLoweringRouterBackedListDetail?.sourcePlan
    ?? directLowerings.sourceLoweringDiStateClass?.sourcePlan
    ?? directLowerings.sourceLoweringLocalViewModelState?.sourcePlan
    ?? sourceLoweringComponentPair?.sourcePlan
    ?? (rootDir == null || templatePath == null || lowering == null
      ? null
      : sourcePlanForTemplateFragments(rootDir, templatePath, lowering));
}

function sourcePlanFrameSelectionKind(
  directLowerings: SourcePlanDirectLowerings,
  templateLowering: SourcePlanTemplateLowering,
  sourceLoweringComponentPair: AppBuilderSourceLoweringComponentPair | null,
): AppBuilderSourceLoweringSourcePlanSelectionKind | null {
  const {
    sourceLoweringAppShell,
    sourceLoweringApplicationAssembly,
    sourceLoweringRouterBackedListDetail,
    sourceLoweringDiStateClass,
    sourceLoweringLocalViewModelState,
  } = directLowerings;
  const lowering = templateLowering.lowering;
  return sourceLoweringAppShell != null
    ? AppBuilderSourceLoweringSourcePlanSelectionKind.AppShell
    : sourceLoweringApplicationAssembly != null
      ? AppBuilderSourceLoweringSourcePlanSelectionKind.ApplicationAssembly
      : sourceLoweringRouterBackedListDetail != null
      ? AppBuilderSourceLoweringSourcePlanSelectionKind.RouterBackedListDetail
      : sourceLoweringDiStateClass != null
        ? AppBuilderSourceLoweringSourcePlanSelectionKind.DiStateClass
        : sourceLoweringLocalViewModelState != null
          ? AppBuilderSourceLoweringSourcePlanSelectionKind.LocalViewModelState
          : sourceLoweringComponentPair != null
            ? AppBuilderSourceLoweringSourcePlanSelectionKind.ComponentPair
            : lowering?.sourceKind === 'invocation'
              ? AppBuilderSourceLoweringSourcePlanSelectionKind.TargetInvocation
              : lowering?.sourceKind === 'composition'
                ? AppBuilderSourceLoweringSourcePlanSelectionKind.FragmentComposition
                : null;
}

function sourcePlanFrameTargetRefs(
  directLowerings: SourcePlanDirectLowerings,
  sourceLoweringComponentPair: AppBuilderSourceLoweringComponentPair | null,
  lowering: SourcePlanTemplateFragmentLowering | null,
): readonly AppBuilderOntologyRowRef[] {
  return directLowerings.sourceLoweringAppShell?.sourceLoweringTargetRefs
    ?? directLowerings.sourceLoweringApplicationAssembly?.sourceLoweringTargetRefs
    ?? directLowerings.sourceLoweringRouterBackedListDetail?.sourceLoweringTargetRefs
    ?? directLowerings.sourceLoweringDiStateClass?.sourceLoweringTargetRefs
    ?? directLowerings.sourceLoweringLocalViewModelState?.sourceLoweringTargetRefs
    ?? sourceLoweringComponentPair?.sourceLoweringTargetRefs
    ?? lowering?.sourceLoweringTargetRefs
    ?? [];
}

function sourcePlanFrameEffectContractIds(
  directLowerings: SourcePlanDirectLowerings,
  sourceLoweringComponentPair: AppBuilderSourceLoweringComponentPair | null,
  lowering: SourcePlanTemplateFragmentLowering | null,
): readonly AppBuilderEffectContractIdValue[] {
  return [
    ...(directLowerings.sourceLoweringAppShell?.effectContractIds ?? []),
    ...(directLowerings.sourceLoweringApplicationAssembly?.effectContractIds ?? []),
    ...(directLowerings.sourceLoweringRouterBackedListDetail?.effectContractIds ?? []),
    ...(directLowerings.sourceLoweringDiStateClass?.effectContractIds ?? []),
    ...(directLowerings.sourceLoweringLocalViewModelState?.effectContractIds ?? []),
    ...(sourceLoweringComponentPair?.effectContractIds ?? []),
    ...(lowering?.effectContractIds ?? []),
  ];
}

function sourcePlanFrameExpectedEffectKinds(
  directLowerings: SourcePlanDirectLowerings,
  sourceLoweringComponentPair: AppBuilderSourceLoweringComponentPair | null,
): readonly ExpectedSemanticEffectKind[] {
  return directLowerings.sourceLoweringAppShell?.expectedEffectKinds
    ?? directLowerings.sourceLoweringApplicationAssembly?.expectedEffectKinds
    ?? directLowerings.sourceLoweringRouterBackedListDetail?.expectedEffectKinds
    ?? directLowerings.sourceLoweringDiStateClass?.expectedEffectKinds
    ?? directLowerings.sourceLoweringLocalViewModelState?.expectedEffectKinds
    ?? sourceLoweringComponentPair?.expectedEffectKinds
    ?? [];
}

function sourcePlanFrameExpectedEffects(
  directLowerings: SourcePlanDirectLowerings,
  sourceLoweringComponentPair: AppBuilderSourceLoweringComponentPair | null,
): readonly AppBuilderExpectedSemanticEffectPreview[] {
  return directLowerings.sourceLoweringAppShell?.expectedEffects
    ?? directLowerings.sourceLoweringApplicationAssembly?.expectedEffects
    ?? directLowerings.sourceLoweringRouterBackedListDetail?.expectedEffects
    ?? directLowerings.sourceLoweringDiStateClass?.expectedEffects
    ?? directLowerings.sourceLoweringLocalViewModelState?.expectedEffects
    ?? sourceLoweringComponentPair?.expectedEffects
    ?? [];
}

function sourceLoweringSelectionIssues(
  request: AppBuilderSourceLoweringSourcePlanRequest,
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  const selections = [
    request.sourceLoweringAppShell == null ? null : 'sourceLoweringAppShell',
    request.sourceLoweringApplicationAssembly == null ? null : 'sourceLoweringApplicationAssembly',
    request.sourceLoweringRouterBackedListDetail == null ? null : 'sourceLoweringRouterBackedListDetail',
    request.sourceLoweringDiStateClass == null ? null : 'sourceLoweringDiStateClass',
    request.sourceLoweringLocalViewModelState == null ? null : 'sourceLoweringLocalViewModelState',
    request.sourceLoweringInvocation == null ? null : 'sourceLoweringInvocation',
    request.sourceLoweringComposition == null ? null : 'sourceLoweringComposition',
    request.sourceLoweringComponentPair == null ? null : 'sourceLoweringComponentPair',
  ].filter((value): value is string => value != null);
  if (selections.length === 0) {
    return [{
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingSourceLoweringSelection,
      summary: 'App-builder SourcePlan preview requires exactly one sourceLoweringAppShell, sourceLoweringApplicationAssembly, sourceLoweringRouterBackedListDetail, sourceLoweringDiStateClass, sourceLoweringLocalViewModelState, sourceLoweringInvocation, sourceLoweringComposition, or sourceLoweringComponentPair payload.',
    }];
  }
  if (selections.length > 1) {
    return [{
      issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MultipleSourceLoweringSelections,
      summary: `App-builder SourcePlan preview received ${selections.join(' and ')}; supply exactly one source-lowering source.`,
    }];
  }
  return [];
}

function selectedTemplateLowering(
  invocation: AppBuilderSourceLoweringInvocation | null,
  composition: AppBuilderSourceLoweringComposition | null,
): {
  readonly sourceKind: 'invocation' | 'composition';
  readonly fileTextFragments: readonly AppBuilderPartSourceFragment[];
  readonly contributionFragments: readonly AppBuilderPartSourceFragment[];
  readonly sourceLoweringTargetRefs: readonly AppBuilderOntologyRowRef[];
  readonly effectContractIds: readonly AppBuilderEffectContractIdValue[];
  readonly controlUseInventoryRows: readonly AppBuilderControlUseInventoryRow[];
} | null {
  if (composition != null && invocation == null) {
    return {
      sourceKind: 'composition',
      fileTextFragments: composition.fragments,
      contributionFragments: composition.contributingFragments,
      sourceLoweringTargetRefs: composition.sourceLoweringTargetRefs,
      effectContractIds: composition.effectContractIds,
      controlUseInventoryRows: composition.controlUseInventoryRows,
    };
  }
  if (invocation != null && composition == null) {
    return {
      sourceKind: 'invocation',
      fileTextFragments: invocation.fragments,
      contributionFragments: invocation.fragments,
      sourceLoweringTargetRefs: invocation.sourceLoweringTargetRefs,
      effectContractIds: invocation.effectContractIds,
      controlUseInventoryRows: invocation.controlUseInventoryRows,
    };
  }
  return null;
}

function sourcePlanForTemplateFragments(
  rootDir: string,
  templatePath: string,
  lowering: {
    readonly fileTextFragments: readonly AppBuilderPartSourceFragment[];
    readonly contributionFragments: readonly AppBuilderPartSourceFragment[];
  },
): SourcePlan {
  return new SourcePlanAssembly(
    rootDir,
    new SourcePlanPolicy(
      SourcePlanConflictPolicy.MustNotExist,
      SourcePlanFormattingPolicy.AppBuilderBaseline,
      SourcePlanPackageToolingPolicy.NotModeled,
    ),
    SourcePlanTextAuthority.AppBuilderGenerated,
  ).addFile(appBuilderHtmlTemplateFileArtifact(templatePath, {
    text: lowering.fileTextFragments.map((fragment) => fragment.text).join('\n'),
    fragments: lowering.contributionFragments,
  })).build();
}
