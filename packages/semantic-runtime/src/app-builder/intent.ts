import type { AppBuilderDomainSlotKind } from './domain-model.js';
import type { AppBuilderAureliaLoweringSelection } from './aurelia-lowering-option.js';
import type { AppBuilderPatternId } from './pattern.js';
import type { AppBuilderReferenceScenarioId } from './reference-scenario.js';
import type { AppBuilderSeedProfileId } from './seed-profile.js';

/** Starter intent offered to an AI/user before scenario, pattern, or domain slots are chosen. */
export enum AppBuilderStarterIntentId {
  /** Produce the smallest useful Aurelia app shell. */
  MinimalAppStarter = 'minimal-app-starter',
  /** Produce a routed app shell that can host multiple feature surfaces. */
  RoutedAppStarter = 'routed-app-starter',
  /** Produce a form or multi-step workflow starter. */
  FormWorkflowStarter = 'form-workflow-starter',
  /** Produce a small state-backed collection list with an add-item input. */
  CollectionListStarter = 'collection-list-starter',
  /** Produce a searchable/sortable/filterable collection management starter. */
  CollectionManagementStarter = 'collection-management-starter',
  /** Produce a browse/list plus route/detail starter. */
  BrowseDetailStarter = 'browse-detail-starter',
  /** Produce an overview/dashboard starter. */
  DashboardStarter = 'dashboard-starter',
}

/** Intent descriptor that constrains valid profile/scenario/pattern/lowering-option combinations. */
export interface AppBuilderStarterIntentDescriptor {
  readonly id: AppBuilderStarterIntentId;
  readonly title: string;
  readonly summary: string;
  readonly supportedSeedProfileIds: readonly AppBuilderSeedProfileId[];
  readonly supportedScenarioIds: readonly AppBuilderReferenceScenarioId[];
  readonly primaryPatternIds: readonly AppBuilderPatternId[];
  readonly optionalPatternIds: readonly AppBuilderPatternId[];
  readonly requiredDomainSlotKinds: readonly AppBuilderDomainSlotKind[];
  readonly defaultAureliaLowering: AppBuilderAureliaLoweringSelection;
}
