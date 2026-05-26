import {
  appBuilderAureliaLoweringChoiceIds,
  appBuilderAureliaLoweringSelectionSatisfies,
  AppBuilderResourceDeclarationMode,
  type AppBuilderAureliaLoweringChoiceDescriptor,
  type AppBuilderAureliaLoweringSelection,
  mergeAppBuilderAureliaLoweringSelections,
} from './aurelia-lowering-option.js';
import {
  APP_BUILDER_AURELIA_LOWERING_CHOICES,
  APP_BUILDER_DOMAIN_PRESETS,
  APP_BUILDER_SEED_DATA_SETS,
  APP_BUILDER_SEED_PROFILES,
  APP_BUILDER_STARTER_INTENTS,
  appBuilderDomainPresetDescriptor,
  appBuilderSeedProfileDescriptor,
  appBuilderSeedDataSetDescriptor,
  appBuilderStarterIntentDescriptor,
} from './catalog.js';
import { appBuilderCollectionListSourcePlan } from './collection-list-source.js';
import { APP_BUILDER_STARTER_COMPOSITIONS } from './composition-catalog.js';
import type { AppBuilderPatternComposition } from './composition.js';
import type { AppBuilderDomainSlot } from './domain-model.js';
import type { AppBuilderDomainPresetDescriptor } from './domain-preset.js';
import type { AppBuilderStarterIntentDescriptor } from './intent.js';
import type { AppBuilderSeedDataSetDescriptor } from './seed-data.js';
import { appBuilderMinimalAppSourcePlan } from './minimal-app-source.js';
import type { AppBuilderSeedProfileDescriptor } from './seed-profile.js';
import type { ExpectedSemanticEffectKind } from '../fixture-verification/expected-effect.js';
import type { SourcePlan, SourcePlanFile } from '../source-plan/source-plan.js';
import { AppBuilderMenuStageId, AppBuilderWorkflowId, type AppBuilderStarterSelection } from './workflow.js';

/** Options that affect source lowering but not menu compatibility. */
export interface AppBuilderStarterLoweringOptions {
  /** Project root for generated source paths. */
  readonly rootDir?: string;
  /** User-facing app name used by the lowered source plan. */
  readonly appName?: string;
}

/** Progressive menu response for the first "no app yet" app-builder workflow. */
export interface AppBuilderNewStarterMenu {
  readonly workflowId: AppBuilderWorkflowId.NewAppStarter;
  readonly stageId: AppBuilderMenuStageId;
  readonly nextStageId: AppBuilderMenuStageId | null;
  readonly selection: AppBuilderStarterSelection;
  readonly seedProfiles: readonly AppBuilderSeedProfileDescriptor[];
  readonly starterIntents: readonly AppBuilderStarterIntentDescriptor[];
  readonly compositions: readonly AppBuilderPatternComposition[];
  readonly domainPresets: readonly AppBuilderDomainPresetDescriptor[];
  readonly seedDataSets: readonly AppBuilderSeedDataSetDescriptor[];
  readonly aureliaLoweringChoiceDescriptors: readonly AppBuilderAureliaLoweringChoiceDescriptor[];
  readonly requiredDomainSlots: readonly AppBuilderDomainSlot[];
}

/** Preview of the concrete lowering chosen by profile, intent, composition, slots, and Aurelia lowering axes. */
export interface AppBuilderStarterLoweringPreview {
  readonly workflowId: AppBuilderWorkflowId.NewAppStarter;
  readonly stageId: AppBuilderMenuStageId.LoweringPreview;
  readonly nextStageId: AppBuilderMenuStageId.GenerateStarter;
  readonly selection: AppBuilderStarterSelection;
  readonly seedProfile: AppBuilderSeedProfileDescriptor;
  readonly starterIntent: AppBuilderStarterIntentDescriptor;
  readonly composition: AppBuilderPatternComposition;
  readonly domainPreset: AppBuilderDomainPresetDescriptor | null;
  readonly seedDataSet: AppBuilderSeedDataSetDescriptor | null;
  readonly aureliaLoweringChoiceDescriptors: readonly AppBuilderAureliaLoweringChoiceDescriptor[];
  readonly sourcePolicy: AppBuilderPatternComposition['sourcePolicy'];
  readonly sourceFiles: readonly AppBuilderGeneratedSourceFilePreview[];
  readonly expectedEffectKinds: readonly ExpectedSemanticEffectKind[];
}

/** File-level source preview that avoids returning large source text until generation is requested. */
export interface AppBuilderGeneratedSourceFilePreview {
  readonly path: string;
  readonly role: SourcePlanFile['role'];
  readonly language: SourcePlanFile['language'];
  readonly editKind: SourcePlanFile['editKind'];
  readonly hasText: boolean;
}

/** Generated starter source plus the shared source plan. */
export interface AppBuilderGeneratedStarter {
  readonly workflowId: AppBuilderWorkflowId.NewAppStarter;
  readonly stageId: AppBuilderMenuStageId.GenerateStarter;
  readonly selection: AppBuilderStarterSelection;
  readonly preview: AppBuilderStarterLoweringPreview;
  readonly sourcePlan: SourcePlan;
}

/** Return the current menu stage and compatible choices for the "new app starter" workflow. */
export function appBuilderNewStarterMenu(
  selection: AppBuilderStarterSelection = { workflowId: AppBuilderWorkflowId.NewAppStarter },
): AppBuilderNewStarterMenu {
  assertNewStarterWorkflow(selection);

  if (selection.seedProfileId == null) {
    return {
      workflowId: AppBuilderWorkflowId.NewAppStarter,
      stageId: AppBuilderMenuStageId.SeedProfileMenu,
      nextStageId: AppBuilderMenuStageId.StarterIntentMenu,
      selection,
      seedProfiles: APP_BUILDER_SEED_PROFILES,
      starterIntents: [],
      compositions: [],
      domainPresets: [],
      seedDataSets: [],
      aureliaLoweringChoiceDescriptors: [],
      requiredDomainSlots: [],
    };
  }

  const seedProfile = appBuilderSeedProfileDescriptor(selection.seedProfileId);
  const starterIntents = starterIntentsForSeedProfile(seedProfile);

  if (selection.intentId == null) {
    return {
      workflowId: AppBuilderWorkflowId.NewAppStarter,
      stageId: AppBuilderMenuStageId.StarterIntentMenu,
      nextStageId: AppBuilderMenuStageId.PatternCompositionMenu,
      selection,
      seedProfiles: [seedProfile],
      starterIntents,
      compositions: [],
      domainPresets: [],
      seedDataSets: [],
      aureliaLoweringChoiceDescriptors: selectedAureliaLoweringChoiceDescriptors(selection, seedProfile, null, null),
      requiredDomainSlots: [],
    };
  }

  const starterIntent = appBuilderStarterIntentDescriptor(selection.intentId);
  assertIntentSupportsSeedProfile(starterIntent, seedProfile);
  const compositions = appBuilderStarterCompositionOptions(selection);
  const selectedComposition = explicitStarterCompositionOrNull(selection, compositions, seedProfile);
  const requiredDomainSlots = selectedComposition == null ? [] : selectedComposition.domainSlots.filter((slot) => slot.required);
  const domainPresets = selectedComposition == null ? [] : appBuilderDomainPresetOptionsForComposition(selectedComposition);
  const selectedDomainPreset = selectedComposition == null ? null : selectedDomainPresetOrNull(selection, selectedComposition);
  const seedDataSets = selectedDomainPreset == null ? [] : appBuilderSeedDataSetOptionsForDomainPreset(selectedDomainPreset);
  const selectedSeedDataSet = selectedDomainPreset == null ? null : selectedSeedDataSetOrNull(selection, selectedDomainPreset);
  const stageId = selectedComposition == null
    ? AppBuilderMenuStageId.PatternCompositionMenu
    : selectedDomainPreset == null && requiredDomainSlots.length > 0
      ? AppBuilderMenuStageId.DomainSlotMenu
      : selectedSeedDataSet == null && seedDataSets.length > 0
        ? AppBuilderMenuStageId.SeedDataMenu
      : AppBuilderMenuStageId.LoweringPreview;
  const nextStageId = nextStarterMenuStageId(stageId, compositions, domainPresets);

  return {
    workflowId: AppBuilderWorkflowId.NewAppStarter,
    stageId,
    nextStageId,
    selection,
    seedProfiles: [seedProfile],
    starterIntents: [starterIntent],
    compositions,
    domainPresets,
    seedDataSets,
    aureliaLoweringChoiceDescriptors: selectedAureliaLoweringChoiceDescriptors(selection, seedProfile, starterIntent, selectedComposition),
    requiredDomainSlots,
  };
}

function nextStarterMenuStageId(
  stageId: AppBuilderMenuStageId,
  compositions: readonly AppBuilderPatternComposition[],
  domainPresets: readonly AppBuilderDomainPresetDescriptor[],
): AppBuilderMenuStageId {
  if (stageId === AppBuilderMenuStageId.PatternCompositionMenu) {
    return compositions.some((composition) => composition.domainSlots.some((slot) => slot.required))
      ? AppBuilderMenuStageId.DomainSlotMenu
      : AppBuilderMenuStageId.LoweringPreview;
  }
  if (stageId === AppBuilderMenuStageId.DomainSlotMenu) {
    return domainPresets.length > 0
      ? AppBuilderMenuStageId.SeedDataMenu
      : AppBuilderMenuStageId.LoweringPreview;
  }
  if (stageId === AppBuilderMenuStageId.SeedDataMenu) {
    return AppBuilderMenuStageId.LoweringPreview;
  }
  return AppBuilderMenuStageId.GenerateStarter;
}

/** Return candidate pattern compositions for a starter selection after profile and intent are known. */
export function appBuilderStarterCompositionOptions(
  selection: AppBuilderStarterSelection,
): readonly AppBuilderPatternComposition[] {
  assertNewStarterWorkflow(selection);
  if (selection.seedProfileId == null || selection.intentId == null) {
    return [];
  }

  return APP_BUILDER_STARTER_COMPOSITIONS.filter((composition) => (
    includesOptional(composition.seedProfileIds, selection.seedProfileId)
    && includesOptional(composition.starterIntentIds, selection.intentId)
  ));
}

/** Resolve the current selection into a source-lowering preview without returning source text. */
export function previewAppBuilderStarterLowering(
  selection: AppBuilderStarterSelection,
  options: AppBuilderStarterLoweringOptions = {},
): AppBuilderStarterLoweringPreview {
  const lowered = lowerAppBuilderStarterSelection(selection, options);
  return buildStarterLoweringPreview(selection, lowered.seedProfile, lowered.starterIntent, lowered.composition, lowered.domainPreset, lowered.seedDataSet, lowered.sourcePlan);
}

/** Generate the starter by lowering app-builder selection into a shared source plan. */
export function buildAppBuilderStarter(
  selection: AppBuilderStarterSelection,
  options: AppBuilderStarterLoweringOptions = {},
): AppBuilderGeneratedStarter {
  const lowered = lowerAppBuilderStarterSelection(selection, options);
  const preview = buildStarterLoweringPreview(selection, lowered.seedProfile, lowered.starterIntent, lowered.composition, lowered.domainPreset, lowered.seedDataSet, lowered.sourcePlan);

  return {
    workflowId: AppBuilderWorkflowId.NewAppStarter,
    stageId: AppBuilderMenuStageId.GenerateStarter,
    selection,
    preview,
    sourcePlan: lowered.sourcePlan,
  };
}

function lowerAppBuilderStarterSelection(
  selection: AppBuilderStarterSelection,
  options: AppBuilderStarterLoweringOptions,
): {
  readonly seedProfile: AppBuilderSeedProfileDescriptor;
  readonly starterIntent: AppBuilderStarterIntentDescriptor;
  readonly composition: AppBuilderPatternComposition;
  readonly sourcePlan: SourcePlan;
  readonly domainPreset: AppBuilderDomainPresetDescriptor | null;
  readonly seedDataSet: AppBuilderSeedDataSetDescriptor | null;
} {
  assertNewStarterWorkflow(selection);
  if (selection.seedProfileId == null) {
    throw new Error('App-builder starter lowering requires a seed profile.');
  }
  if (selection.intentId == null) {
    throw new Error('App-builder starter lowering requires a starter intent.');
  }

  const seedProfile = appBuilderSeedProfileDescriptor(selection.seedProfileId);
  const starterIntent = appBuilderStarterIntentDescriptor(selection.intentId);
  assertIntentSupportsSeedProfile(starterIntent, seedProfile);
  const composition = selectStarterComposition(selection, seedProfile, starterIntent);
  const domainPreset = selectStarterDomainPreset(selection, composition);
  const seedDataSet = selectStarterSeedDataSet(selection, domainPreset);
  const sourcePlan = lowerStarterCompositionToSourcePlan(composition, {
    rootDir: options.rootDir ?? '.',
    appName: options.appName ?? 'Aurelia Starter',
    domainPreset,
    seedDataSet,
  });

  return {
    seedProfile,
    starterIntent,
    composition,
    sourcePlan,
    domainPreset,
    seedDataSet,
  };
}

function lowerStarterCompositionToSourcePlan(
  composition: AppBuilderPatternComposition,
  options: Required<AppBuilderStarterLoweringOptions> & {
    readonly domainPreset: AppBuilderDomainPresetDescriptor | null;
    readonly seedDataSet: AppBuilderSeedDataSetDescriptor | null;
  },
): SourcePlan {
  const declarationMode = declarationModeForComposition(composition);
  if (composition.id === 'state-backed-collection-list.convention') {
    if (options.domainPreset == null) {
      throw new Error(`App-builder composition '${composition.id}' requires a domain preset before source can be lowered.`);
    }
    if (options.seedDataSet == null) {
      throw new Error(`App-builder composition '${composition.id}' requires a seed data set before source can be lowered.`);
    }
    if (declarationMode !== AppBuilderResourceDeclarationMode.ConventionResource) {
      throw new Error(`App-builder composition '${composition.id}' currently requires convention resource lowering.`);
    }
    return appBuilderCollectionListSourcePlan({
      rootDir: options.rootDir,
      appName: options.appName,
      declarationMode,
      domainPreset: options.domainPreset,
      seedDataSet: options.seedDataSet,
    });
  }
  return appBuilderMinimalAppSourcePlan({
    rootDir: options.rootDir,
    appName: options.appName,
    declarationMode,
  });
}

function declarationModeForComposition(
  composition: AppBuilderPatternComposition,
): AppBuilderResourceDeclarationMode {
  const declarationMode = composition.aureliaLowering?.resourceDeclaration;
  if (declarationMode != null) {
    return declarationMode;
  }
  throw new Error(`App-builder composition '${composition.id}' does not choose a resource declaration lowering mode.`);
}

function buildStarterLoweringPreview(
  selection: AppBuilderStarterSelection,
  seedProfile: AppBuilderSeedProfileDescriptor,
  starterIntent: AppBuilderStarterIntentDescriptor,
  composition: AppBuilderPatternComposition,
  domainPreset: AppBuilderDomainPresetDescriptor | null,
  seedDataSet: AppBuilderSeedDataSetDescriptor | null,
  sourcePlan: SourcePlan,
): AppBuilderStarterLoweringPreview {
  return {
    workflowId: AppBuilderWorkflowId.NewAppStarter,
    stageId: AppBuilderMenuStageId.LoweringPreview,
    nextStageId: AppBuilderMenuStageId.GenerateStarter,
    selection,
    seedProfile,
    starterIntent,
    composition,
    domainPreset,
    seedDataSet,
    aureliaLoweringChoiceDescriptors: selectedAureliaLoweringChoiceDescriptors(selection, seedProfile, starterIntent, composition),
    sourcePolicy: composition.sourcePolicy,
    sourceFiles: sourcePlan.files.map(sourceFilePreview),
    expectedEffectKinds: composition.verificationEffectKinds,
  };
}

function appBuilderSeedDataSetOptionsForDomainPreset(
  domainPreset: AppBuilderDomainPresetDescriptor,
): readonly AppBuilderSeedDataSetDescriptor[] {
  return APP_BUILDER_SEED_DATA_SETS.filter((seedDataSet) => (
    seedDataSet.domainPresetId == null || seedDataSet.domainPresetId === domainPreset.id
  ));
}

function appBuilderDomainPresetOptionsForComposition(
  composition: AppBuilderPatternComposition,
): readonly AppBuilderDomainPresetDescriptor[] {
  const requiredSlotKinds = composition.domainSlots.filter((slot) => slot.required).map((slot) => slot.kind);
  if (requiredSlotKinds.length === 0) {
    return [];
  }

  return APP_BUILDER_DOMAIN_PRESETS.filter((preset) => (
    includesAll(preset.slotKinds, requiredSlotKinds)
    && overlapsOptional(composition.solutionSpaceIds, preset.solutionSpaceIds)
    && overlapsOptional(composition.referenceScenarioIds, preset.referenceScenarioIds)
  ));
}

function selectStarterDomainPreset(
  selection: AppBuilderStarterSelection,
  composition: AppBuilderPatternComposition,
): AppBuilderDomainPresetDescriptor | null {
  const requiredSlotCount = composition.domainSlots.filter((slot) => slot.required).length;
  const domainPreset = selectedDomainPresetOrNull(selection, composition);
  if (domainPreset == null && requiredSlotCount > 0) {
    throw new Error(`App-builder composition '${composition.id}' requires a domain preset or future caller-supplied domain slot values.`);
  }
  return domainPreset;
}

function selectStarterSeedDataSet(
  selection: AppBuilderStarterSelection,
  domainPreset: AppBuilderDomainPresetDescriptor | null,
): AppBuilderSeedDataSetDescriptor | null {
  if (domainPreset == null) {
    if (selection.seedDataSetId != null) {
      throw new Error(`Seed data set '${selection.seedDataSetId}' requires a domain preset.`);
    }
    return null;
  }

  const seedDataSet = selectedSeedDataSetOrNull(selection, domainPreset);
  if (seedDataSet == null && appBuilderSeedDataSetOptionsForDomainPreset(domainPreset).length > 0) {
    throw new Error(`Domain preset '${domainPreset.id}' requires an explicit seed data set before source can be lowered.`);
  }
  return seedDataSet;
}

function selectedSeedDataSetOrNull(
  selection: AppBuilderStarterSelection,
  domainPreset: AppBuilderDomainPresetDescriptor,
): AppBuilderSeedDataSetDescriptor | null {
  if (selection.seedDataSetId == null) {
    return null;
  }

  const seedDataSet = appBuilderSeedDataSetDescriptor(selection.seedDataSetId);
  const compatibleSeedDataSets = appBuilderSeedDataSetOptionsForDomainPreset(domainPreset);
  if (!compatibleSeedDataSets.some((candidate) => candidate.id === seedDataSet.id)) {
    throw new Error(`Seed data set '${seedDataSet.id}' is not compatible with domain preset '${domainPreset.id}'.`);
  }
  return seedDataSet;
}

function selectedDomainPresetOrNull(
  selection: AppBuilderStarterSelection,
  composition: AppBuilderPatternComposition,
): AppBuilderDomainPresetDescriptor | null {
  if (selection.domainPresetId == null) {
    return null;
  }

  const preset = appBuilderDomainPresetDescriptor(selection.domainPresetId);
  const compatiblePresets = appBuilderDomainPresetOptionsForComposition(composition);
  if (!compatiblePresets.some((candidate) => candidate.id === preset.id)) {
    throw new Error(`Domain preset '${preset.id}' is not compatible with app-builder composition '${composition.id}'.`);
  }
  return preset;
}

function sourceFilePreview(
  file: SourcePlanFile,
): AppBuilderGeneratedSourceFilePreview {
  return {
    path: file.path,
    role: file.role,
    language: file.language,
    editKind: file.editKind,
    hasText: file.text != null,
  };
}

function starterIntentsForSeedProfile(
  seedProfile: AppBuilderSeedProfileDescriptor,
): readonly AppBuilderStarterIntentDescriptor[] {
  return APP_BUILDER_STARTER_INTENTS.filter((intent) => intent.supportedSeedProfileIds.includes(seedProfile.id));
}

function selectStarterComposition(
  selection: AppBuilderStarterSelection,
  seedProfile: AppBuilderSeedProfileDescriptor,
  starterIntent: AppBuilderStarterIntentDescriptor,
): AppBuilderPatternComposition {
  const compositions = appBuilderStarterCompositionOptions(selection);
  const selectedComposition = selectedStarterCompositionOrNull(selection, compositions, seedProfile, starterIntent);
  if (selectedComposition == null) {
    throw new Error(`No app-builder starter composition matches profile '${seedProfile.id}' and intent '${starterIntent.id}'.`);
  }
  return selectedComposition;
}

function selectedStarterCompositionOrNull(
  selection: AppBuilderStarterSelection,
  compositions: readonly AppBuilderPatternComposition[],
  seedProfile: AppBuilderSeedProfileDescriptor,
  starterIntent: AppBuilderStarterIntentDescriptor,
): AppBuilderPatternComposition | null {
  const explicitComposition = explicitStarterCompositionOrNull(selection, compositions, seedProfile);
  if (explicitComposition != null) {
    return explicitComposition;
  }

  if (selection.compositionId != null) {
    throw new Error(`App-builder composition '${selection.compositionId}' is not compatible with profile '${seedProfile.id}' and intent '${starterIntent.id}'.`);
  }

  const firstComposition = compositions[0] ?? null;
  if (compositions.length === 1) {
    return firstComposition;
  }

  if (selection.patternIds != null && selection.patternIds.length > 0) {
    const composition = compositions.find((candidate) => includesAll(candidate.patternIds, selection.patternIds ?? []));
    if (composition != null) {
      return composition;
    }
  }

  const desiredLowering = defaultStarterAureliaLoweringSelection(seedProfile, starterIntent, selection.aureliaLowering);
  const loweringMatchedComposition = compositions.find((candidate) => (
    appBuilderAureliaLoweringSelectionSatisfies(candidate.aureliaLowering ?? {}, desiredLowering)
  ));
  if (loweringMatchedComposition == null && hasExplicitAureliaLoweringSelection(selection.aureliaLowering)) {
    throw new Error(`No app-builder starter composition matches the requested Aurelia lowering selection for profile '${seedProfile.id}' and intent '${starterIntent.id}'.`);
  }
  return loweringMatchedComposition ?? firstComposition;
}

function explicitStarterCompositionOrNull(
  selection: AppBuilderStarterSelection,
  compositions: readonly AppBuilderPatternComposition[],
  seedProfile: AppBuilderSeedProfileDescriptor,
): AppBuilderPatternComposition | null {
  if (selection.compositionId == null) {
    return compositions.length === 1 ? compositions[0] ?? null : null;
  }
  const composition = compositions.find((candidate) => candidate.id === selection.compositionId);
  if (composition == null) {
    throw new Error(`App-builder composition '${selection.compositionId}' is not compatible with profile '${seedProfile.id}'.`);
  }
  return composition;
}

function selectedAureliaLoweringChoiceDescriptors(
  selection: AppBuilderStarterSelection,
  seedProfile: AppBuilderSeedProfileDescriptor,
  starterIntent: AppBuilderStarterIntentDescriptor | null,
  composition: AppBuilderPatternComposition | null,
): readonly AppBuilderAureliaLoweringChoiceDescriptor[] {
  const loweringSelection = effectiveStarterAureliaLoweringSelection(seedProfile, starterIntent, composition, selection.aureliaLowering);
  const choiceIds = appBuilderAureliaLoweringChoiceIds(loweringSelection);
  return APP_BUILDER_AURELIA_LOWERING_CHOICES.filter((descriptor) => choiceIds.includes(descriptor.id));
}

function defaultStarterAureliaLoweringSelection(
  seedProfile: AppBuilderSeedProfileDescriptor,
  starterIntent: AppBuilderStarterIntentDescriptor,
  requestedLowering: AppBuilderAureliaLoweringSelection | undefined,
): AppBuilderAureliaLoweringSelection {
  return mergeAppBuilderAureliaLoweringSelections(
    seedProfile.defaultAureliaLowering,
    starterIntent.defaultAureliaLowering,
    requestedLowering,
  );
}

function effectiveStarterAureliaLoweringSelection(
  seedProfile: AppBuilderSeedProfileDescriptor,
  starterIntent: AppBuilderStarterIntentDescriptor | null,
  composition: AppBuilderPatternComposition | null,
  requestedLowering: AppBuilderAureliaLoweringSelection | undefined,
): AppBuilderAureliaLoweringSelection {
  return mergeAppBuilderAureliaLoweringSelections(
    seedProfile.defaultAureliaLowering,
    starterIntent?.defaultAureliaLowering,
    composition?.aureliaLowering,
    requestedLowering,
  );
}

function hasExplicitAureliaLoweringSelection(
  selection: AppBuilderAureliaLoweringSelection | undefined,
): boolean {
  return selection != null && appBuilderAureliaLoweringChoiceIds(selection).length > 0;
}

function assertNewStarterWorkflow(
  selection: AppBuilderStarterSelection,
): void {
  if (selection.workflowId !== AppBuilderWorkflowId.NewAppStarter) {
    throw new Error(`App-builder starter workflow expected '${AppBuilderWorkflowId.NewAppStarter}'.`);
  }
}

function assertIntentSupportsSeedProfile(
  starterIntent: AppBuilderStarterIntentDescriptor,
  seedProfile: AppBuilderSeedProfileDescriptor,
): void {
  if (!starterIntent.supportedSeedProfileIds.includes(seedProfile.id)) {
    throw new Error(`Starter intent '${starterIntent.id}' does not support seed profile '${seedProfile.id}'.`);
  }
}

function includesOptional<TValue>(
  values: readonly TValue[] | undefined,
  value: TValue,
): boolean {
  return values == null || values.includes(value);
}

function includesAll<TValue>(
  values: readonly TValue[],
  requiredValues: readonly TValue[],
): boolean {
  for (const requiredValue of requiredValues) {
    if (!values.includes(requiredValue)) {
      return false;
    }
  }
  return true;
}

function overlapsOptional<TValue>(
  first: readonly TValue[] | undefined,
  second: readonly TValue[] | undefined,
): boolean {
  if (first == null || first.length === 0 || second == null || second.length === 0) {
    return true;
  }
  return first.some((value) => second.includes(value));
}
