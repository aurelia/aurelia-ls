import type { AppBuilderAureliaLoweringSelection } from './aurelia-lowering-option.js';
import type { AppBuilderDomainSlot } from './domain-model.js';
import type { AppBuilderDomainPresetId } from './domain-preset.js';
import type { AppBuilderStarterIntentId } from './intent.js';
import type { AppBuilderPatternId } from './pattern.js';
import type { AppBuilderReferenceScenarioId } from './reference-scenario.js';
import type { AppBuilderSeedDataSetId } from './seed-data.js';
import type { AppBuilderSeedProfileId } from './seed-profile.js';

/** App-builder workflow family; starter generation is the first workflow to make concrete. */
export enum AppBuilderWorkflowId {
  /** No app exists yet; select a starter profile and generate initial source. */
  NewAppStarter = 'new-app-starter',
  /** Existing app is reopened first; menus are filtered by observed taste/capability evidence. */
  ExistingAppExtension = 'existing-app-extension',
}

/** Progressive menu stage. Each stage should return typed IDs usable by the next request. */
export enum AppBuilderMenuStageId {
  /** Choose scale, data posture, architecture depth, routing depth, presentation posture, and code economy. */
  SeedProfileMenu = 'seed-profile-menu',
  /** Choose the starter job after the seed profile is known. */
  StarterIntentMenu = 'starter-intent-menu',
  /** Choose public scenario pressure when it helps narrow pattern choices. */
  ScenarioMenu = 'scenario-menu',
  /** Choose or inspect a compatible pattern composition. */
  PatternCompositionMenu = 'pattern-composition-menu',
  /** Supply domain/source slots needed before lowering can emit source. */
  DomainSlotMenu = 'domain-slot-menu',
  /** Choose seed data density/audience after a domain preset or domain slots are known. */
  SeedDataMenu = 'seed-data-menu',
  /** Choose Aurelia-specific lowering axes and stackable policies. */
  AureliaLoweringMenu = 'aurelia-lowering-menu',
  /** Preview generated source plan and semantic verification promises before source is emitted. */
  LoweringPreview = 'lowering-preview',
  /** Generate starter source from the selected profile, intent, slots, patterns, and lowering axes. */
  GenerateStarter = 'generate-starter',
}

/** Current typed selection carried between app-builder menu stages. */
export interface AppBuilderStarterSelection {
  readonly workflowId: AppBuilderWorkflowId.NewAppStarter;
  readonly seedProfileId?: AppBuilderSeedProfileId;
  readonly intentId?: AppBuilderStarterIntentId;
  /** Selected compact composition identity; this is the bridge from menus to lowering. */
  readonly compositionId?: string;
  readonly scenarioIds?: readonly AppBuilderReferenceScenarioId[];
  readonly patternIds?: readonly AppBuilderPatternId[];
  readonly domainPresetId?: AppBuilderDomainPresetId;
  readonly seedDataSetId?: AppBuilderSeedDataSetId;
  readonly domainSlots?: readonly AppBuilderDomainSlot[];
  readonly aureliaLowering?: AppBuilderAureliaLoweringSelection;
}
