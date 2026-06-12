import {
  appBuilderUniqueEffectContractIds,
  AppBuilderEffectContractId,
} from './effect.js';
import {
  appBuilderSourceLoweringRequestFieldSummary,
  appBuilderSourceLoweringRequestFieldsForSourcePlanSelection,
} from './source-lowering-request-field.js';
import { appBuilderSourceLoweringEmissionContext } from './source-lowering-context.js';
import { appBuilderSourcePlanHandoffNotes } from './source-lowering-handoff.js';
import { appBuilderSourcePlanWitnessRows } from './source-plan-witness.js';
import {
  appBuilderDecisionBundleExpansionRows,
  appBuilderDecisionBundleInputCounts,
} from '../policy/decision-bundle.js';

export * from './source-lowering-source-plan-contracts.js';

import {
  type AppBuilderSourceLoweringSourcePlan,
  type AppBuilderSourceLoweringSourcePlanIssue,
  type AppBuilderSourceLoweringSourcePlanRequest,
} from './source-lowering-source-plan-contracts.js';
import {
  sourcePlanAllDecisionBundles,
  sourcePlanAllExplicitSuppliedInputs,
  sourcePlanMissingPlacementIssues,
  sourcePlanPlacement,
} from './source-lowering-source-plan-placement.js';
import { appBuilderSourceLoweringSourcePlanFrame } from './source-lowering-source-plan-selection.js';

/** Wrap one app-builder source-lowering invocation or composition in an explicit SourcePlan preview. */
export function appBuilderSourceLoweringSourcePlan(
  request: AppBuilderSourceLoweringSourcePlanRequest = {},
): AppBuilderSourceLoweringSourcePlan {
  const emissionContext = appBuilderSourceLoweringEmissionContext();
  const requiresTemplatePath = request.sourceLoweringInvocation != null
    || request.sourceLoweringComposition != null
    || request.sourceLoweringComponentPair != null;
  const requiresSourceTargetPath = request.sourceLoweringDiStateClass != null
    || request.sourceLoweringLocalViewModelState != null
    || request.sourceLoweringComponentPair != null;
  const placement = sourcePlanPlacement(
    request,
    { requireTemplatePath: requiresTemplatePath, requireSourceTargetPath: requiresSourceTargetPath },
  );
  const rootDir = placement.rootDir;
  const templatePath = placement.templatePath;
  const sourceTargetPath = placement.sourceTargetPath;
  const sourcePlanFrame = appBuilderSourceLoweringSourcePlanFrame(request, placement, emissionContext);
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [
    ...placement.issues,
    ...sourcePlanMissingPlacementIssues(placement),
    ...sourcePlanFrame.selectionIssues,
    ...sourcePlanFrame.lowerLevelIssues,
    ...sourcePlanFrame.fragmentIssues,
  ];
  const sourcePlan = issues.length > 0 || rootDir == null
    ? null
    : sourcePlanFrame.sourcePlan;
  const sourceLoweringTargetRefs = sourcePlanFrame.sourceLoweringTargetRefs;
  const effectContractIds = appBuilderUniqueEffectContractIds([
    AppBuilderEffectContractId.SourcePlanPreview,
    ...sourcePlanFrame.effectContractIds,
  ]);
  const expectedEffectRows = sourcePlanFrame.expectedEffects;
  const expectedEffectKinds = sourcePlanFrame.expectedEffectKinds;
  const controlUseInventoryRows = sourcePlanFrame.controlUseInventoryRows;
  const sourceLoweringRequestFields = appBuilderSourceLoweringRequestFieldsForSourcePlanSelection({
    sourceLoweringAppShell: request.sourceLoweringAppShell != null,
    sourceLoweringApplicationAssembly: request.sourceLoweringApplicationAssembly != null,
    sourceLoweringRouterBackedListDetail: request.sourceLoweringRouterBackedListDetail != null,
    sourceLoweringDiStateClass: request.sourceLoweringDiStateClass != null,
    sourceLoweringLocalViewModelState: request.sourceLoweringLocalViewModelState != null,
    sourceLoweringInvocation: request.sourceLoweringInvocation != null,
    sourceLoweringComposition: request.sourceLoweringComposition != null,
    sourceLoweringComponentPair: request.sourceLoweringComponentPair != null,
  });
  const sourceLoweringRequestFieldSummary = appBuilderSourceLoweringRequestFieldSummary(sourceLoweringRequestFields);
  const sourcePlanWitnessRows = appBuilderSourcePlanWitnessRows(sourcePlan);
  const explicitSuppliedInputs = sourcePlanAllExplicitSuppliedInputs(request);
  const decisionBundles = sourcePlanAllDecisionBundles(request);
  const handoffNotes = appBuilderSourcePlanHandoffNotes(sourcePlan, sourcePlanFrame, explicitSuppliedInputs);
  const inputCounts = appBuilderDecisionBundleInputCounts(
    explicitSuppliedInputs,
    decisionBundles,
  );
  const includeDecisionBundleExpansionRows = request.includeDecisionBundleExpansionRows === true;
  const includeSourcePlanWitnessRows = request.includeSourcePlanWitnessRows === true;
  const includeSourceLoweringResultDetails = request.includeSourceLoweringResultDetails === true;
  const includeControlUseInventoryRows = request.includeControlUseInventoryRows === true;
  const includeExpectedEffectRows = request.includeExpectedEffectRows === true;
  const includeSourceLoweringRequestFields = request.includeSourceLoweringRequestFields === true;
  const sourceLoweringSelectionKind = sourcePlanFrame.sourceLoweringSelectionKind;
  return {
    displayText: `App-builder SourcePlan preview: root=${rootDir ?? 'none'}, template=${templatePath ?? 'none'}, target=${sourceTargetPath ?? 'none'}, source=${sourceLoweringSelectionKind ?? 'none'}, files=${sourcePlan?.files.length ?? 0}, witnesses=${sourcePlanWitnessRows.length}, controlUses=${controlUseInventoryRows.length}, expectedEffects=${expectedEffectRows.length}, handoffNotes=${handoffNotes.length}, decisionBundles=${inputCounts.decisionBundleCount}, issues=${issues.length}.`,
    rootDir,
    templatePath,
    sourceTargetPath,
    sourceLoweringSelectionKind,
    sourceLoweringResultDetailsIncluded: includeSourceLoweringResultDetails,
    ...(includeSourceLoweringResultDetails ? {
      sourceLoweringAppShell: sourcePlanFrame.sourceLoweringAppShell,
      sourceLoweringApplicationAssembly: sourcePlanFrame.sourceLoweringApplicationAssembly,
      sourceLoweringRouterBackedListDetail: sourcePlanFrame.sourceLoweringRouterBackedListDetail,
      sourceLoweringDiStateClass: sourcePlanFrame.sourceLoweringDiStateClass,
      sourceLoweringLocalViewModelState: sourcePlanFrame.sourceLoweringLocalViewModelState,
      sourceLoweringInvocation: sourcePlanFrame.sourceLoweringInvocation,
      sourceLoweringComposition: sourcePlanFrame.sourceLoweringComposition,
      sourceLoweringComponentPair: sourcePlanFrame.sourceLoweringComponentPair,
    } : {}),
    sourceLoweringTargetRefs,
    effectContractIds,
    expectedEffectKinds,
    expectedEffectCount: expectedEffectRows.length,
    ...(includeExpectedEffectRows ? { expectedEffects: expectedEffectRows } : {}),
    controlUseInventoryRowCount: controlUseInventoryRows.length,
    ...(includeControlUseInventoryRows ? { controlUseInventoryRows } : {}),
    sourceLoweringRequestFieldSummary,
    ...(includeSourceLoweringRequestFields ? { sourceLoweringRequestFields } : {}),
    sourcePlanWitnessCount: sourcePlanWitnessRows.length,
    ...(includeSourcePlanWitnessRows ? { sourcePlanWitnessRows } : {}),
    handoffNoteCount: handoffNotes.length,
    handoffNotes,
    sourcePlan,
    suppliedInputCount: inputCounts.suppliedInputCount,
    explicitSuppliedInputCount: inputCounts.explicitSuppliedInputCount,
    decisionBundleCount: inputCounts.decisionBundleCount,
    decisionBundleDecisionCount: inputCounts.decisionBundleDecisionCount,
    ...(includeDecisionBundleExpansionRows ? {
      decisionBundleExpansionRows: appBuilderDecisionBundleExpansionRows(decisionBundles),
    } : {}),
    issues,
  };
}
