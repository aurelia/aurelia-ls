import type { BuiltInResourcePackage } from '../resources/built-in-resources.js';
import type { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { RuntimeBindingValueChannelKind } from '../observation/runtime-binding-observation.js';
import { uniqueStrings } from '../kernel/collections.js';
import type {
  AppBuilderPartApplicationSiteKind,
  AppBuilderPartOperationKind,
  AppBuilderPartSlotKind,
  AppBuilderPartValueChannelResolutionKind,
  AppBuilderPartSlotValueLanguage,
} from './part-application.js';
import {
  type AppBuilderPartSlotExpectation,
  appBuilderPartOptionalSlotExpectations,
  appBuilderPartRequiredSlotExpectations,
  appBuilderPartSlotExpectation,
} from './part-slot-expectation.js';
import {
  APP_BUILDER_PARTS,
  AppBuilderPartAuthoringTier,
  type AppBuilderPartDescriptor,
  type AppBuilderPartId,
  type AppBuilderPartKind,
} from './part-catalog.js';

/** Why an app-builder part menu accepted its authoring-tier set. */
export enum AppBuilderPartAuthoringTierPolicyKind {
  /** No caller capability intent was present, so the menu stays on preferred source forms. */
  DefaultPreferred = 'default-preferred',
  /** The caller supplied authoringTiers explicitly. */
  ExplicitAuthoringTiers = 'explicit-authoring-tiers',
  /** The caller named exact parts, resource packages, or package dependencies. */
  ExplicitCapabilityIntent = 'explicit-capability-intent',
}

/** Stable value list for transports that expose authoring-tier policy rows. */
export const APP_BUILDER_PART_AUTHORING_TIER_POLICY_KINDS = [
  AppBuilderPartAuthoringTierPolicyKind.DefaultPreferred,
  AppBuilderPartAuthoringTierPolicyKind.ExplicitAuthoringTiers,
  AppBuilderPartAuthoringTierPolicyKind.ExplicitCapabilityIntent,
] as const;

/** Filter for the neutral app-builder part menu. */
export interface AppBuilderPartMenuRequest {
  /** Restrict to coarse part categories such as control, structural part, or value converter. */
  readonly partKinds?: readonly AppBuilderPartKind[];
  /** Restrict to AI authoring posture tiers; broad menus default to the preferred tier only. */
  readonly authoringTiers?: readonly AppBuilderPartAuthoringTier[];
  /** Restrict to exact part identities within their categories. */
  readonly partIds?: readonly AppBuilderPartId[];
  /** Restrict to parts that can attach at any of these source loci. */
  readonly applicationSites?: readonly AppBuilderPartApplicationSiteKind[];
  /** Restrict to parts that lower through any of these source-operation families. */
  readonly operationKinds?: readonly AppBuilderPartOperationKind[];
  /** Restrict to parts backed by any of these resource kinds. */
  readonly resourceKinds?: readonly ResourceDefinitionKind[];
  /** Restrict to parts backed by any of these built-in resource packages. */
  readonly resourcePackageIds?: readonly BuiltInResourcePackage[];
  /** Restrict to parts that require any of these package/module specifiers, such as @aurelia/i18n. */
  readonly packageDependencies?: readonly string[];
  /** Restrict to parts whose value-channel shape is part-owned, target-observer-resolved, or not applicable. */
  readonly valueChannelResolutionKinds?: readonly AppBuilderPartValueChannelResolutionKind[];
  /** Restrict to parts whose required slots are all available to the caller. */
  readonly availableSlotKinds?: readonly AppBuilderPartSlotKind[];
  /** Restrict to parts that require or accept at least one of these slot kinds. */
  readonly relevantSlotKinds?: readonly AppBuilderPartSlotKind[];
  /** Restrict to parts whose required slot value languages are all available to the caller. */
  readonly availableSlotValueLanguages?: readonly AppBuilderPartSlotValueLanguage[];
  /** Restrict to parts that require or accept at least one slot with any of these value languages. */
  readonly relevantSlotValueLanguages?: readonly AppBuilderPartSlotValueLanguage[];
  /** Include full category-specific descriptors; omit for compact AI menu rows. */
  readonly includePartDetails?: boolean | null;
}

/** Compact slot contract carried per part row without repeating the global slot prose. */
export interface AppBuilderPartMenuSlotRef {
  readonly slotKind: AppBuilderPartSlotKind;
  readonly valueLanguage: AppBuilderPartSlotValueLanguage;
  readonly refinedByPartSyntax: boolean;
}

/** Compact AI-facing part row for choosing an invocation target. */
export interface AppBuilderPartMenuPart {
  readonly kind: AppBuilderPartKind;
  readonly id: AppBuilderPartId;
  readonly title: string;
  readonly summary: string;
  readonly authoringTier: AppBuilderPartAuthoringTier;
  readonly syntaxCues: readonly string[];
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  readonly operationKind: AppBuilderPartOperationKind;
  readonly valueChannelResolution: AppBuilderPartValueChannelResolutionKind;
  readonly valueChannels: readonly RuntimeBindingValueChannelKind[];
  readonly resourceName: string | null;
  readonly resourceKind: ResourceDefinitionKind | null;
  readonly resourcePackageId: BuiltInResourcePackage | null;
  readonly syntaxCommandName: string | null;
  readonly frameworkSyntaxName: string | null;
  readonly frameworkApiName: string | null;
  readonly resourceMetadataName: string | null;
  readonly componentLifecycleHookName: string | null;
  readonly requiredPackageSpecifier: string | null;
  readonly requiredSlots: readonly AppBuilderPartMenuSlotRef[];
  readonly optionalSlots: readonly AppBuilderPartMenuSlotRef[];
}

/** Full part menu detail row with category-specific descriptors and slot prose. */
export type AppBuilderPartMenuPartDetail = AppBuilderPartDescriptor & {
  /** Required slot contracts for this part after framework syntax refinement. */
  readonly requiredSlotExpectations: readonly AppBuilderPartSlotExpectation[];
  /** Optional slot contracts for this part after framework syntax refinement. */
  readonly optionalSlotExpectations: readonly AppBuilderPartSlotExpectation[];
};

/** Authoring-tier gate applied to a part menu or source-lowering preview request. */
export interface AppBuilderPartAuthoringTierPolicy {
  readonly kind: AppBuilderPartAuthoringTierPolicyKind;
  /** Tiers admitted by the policy; null means all tiers because the caller supplied exact capability intent. */
  readonly acceptedAuthoringTiers: readonly AppBuilderPartAuthoringTier[] | null;
  /** Compact explanation intended for AI callers that need to decide whether to widen the menu. */
  readonly summary: string;
}

/** Descriptor filter result before transport rows are projected. */
export interface AppBuilderPartMenuDescriptorFilter {
  readonly parts: readonly AppBuilderPartDescriptor[];
  readonly authoringTierPolicy: AppBuilderPartAuthoringTierPolicy;
  readonly authoringTierFilteredOutCount: number;
  readonly authoringTierFilteredOutTiers: readonly AppBuilderPartAuthoringTier[];
  readonly authoringTierFilteredOutSummary: string | null;
}

interface AppBuilderPartMenuAxisSummary {
  readonly partKinds: readonly AppBuilderPartKind[];
  readonly authoringTiers: readonly AppBuilderPartAuthoringTier[];
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  readonly operationKinds: readonly AppBuilderPartOperationKind[];
  readonly valueChannelResolutionKinds: readonly AppBuilderPartValueChannelResolutionKind[];
  readonly requiredSlotKinds: readonly AppBuilderPartSlotKind[];
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
  readonly requiredSlotValueLanguages: readonly AppBuilderPartSlotValueLanguage[];
  readonly optionalSlotValueLanguages: readonly AppBuilderPartSlotValueLanguage[];
  readonly requiredSlots: readonly AppBuilderPartSlotExpectation[];
  readonly optionalSlots: readonly AppBuilderPartSlotExpectation[];
  readonly resourceKinds: readonly ResourceDefinitionKind[];
  readonly resourcePackageIds: readonly BuiltInResourcePackage[];
  readonly packageDependencies: readonly string[];
}

/** App-builder part menu plus the compact axes represented by its rows. */
export interface AppBuilderPartMenu {
  readonly displayText: string;
  readonly parts: readonly AppBuilderPartMenuPart[];
  readonly partDetails?: readonly AppBuilderPartMenuPartDetail[];
  readonly authoringTierPolicy: AppBuilderPartAuthoringTierPolicy;
  readonly authoringTierFilteredOutCount: number;
  readonly authoringTierFilteredOutTiers: readonly AppBuilderPartAuthoringTier[];
  readonly authoringTierFilteredOutSummary: string | null;
  readonly partKinds: readonly AppBuilderPartKind[];
  readonly authoringTiers: readonly AppBuilderPartAuthoringTier[];
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  readonly operationKinds: readonly AppBuilderPartOperationKind[];
  readonly valueChannelResolutionKinds: readonly AppBuilderPartValueChannelResolutionKind[];
  readonly requiredSlotKinds: readonly AppBuilderPartSlotKind[];
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
  readonly requiredSlotValueLanguages: readonly AppBuilderPartSlotValueLanguage[];
  readonly optionalSlotValueLanguages: readonly AppBuilderPartSlotValueLanguage[];
  /** Required slot contracts after part-specific syntax refines generic slot kinds such as binding-expression. */
  readonly requiredSlots: readonly AppBuilderPartSlotExpectation[];
  /** Optional slot contracts after part-specific syntax refines generic slot kinds such as binding-expression. */
  readonly optionalSlots: readonly AppBuilderPartSlotExpectation[];
  readonly resourceKinds: readonly ResourceDefinitionKind[];
  readonly resourcePackageIds: readonly BuiltInResourcePackage[];
  readonly packageDependencies: readonly string[];
}

/** Read the AI-facing part menu without exposing category-specific catalog shapes. */
export function appBuilderPartMenu(
  request: AppBuilderPartMenuRequest = {},
): AppBuilderPartMenu {
  const filter = appBuilderPartMenuDescriptorFilter(request);
  const matchedParts = filter.parts;
  const authoringTierPolicy = filter.authoringTierPolicy;
  const parts = matchedParts.map(appBuilderPartMenuPart);
  const axisSummary = appBuilderPartMenuAxisSummary(matchedParts);
  return {
    displayText: appBuilderPartMenuDisplayText(parts.length, axisSummary, filter, request.includePartDetails === true),
    parts,
    ...(request.includePartDetails === true ? { partDetails: matchedParts.map(appBuilderPartMenuPartDetail) } : {}),
    authoringTierPolicy,
    authoringTierFilteredOutCount: filter.authoringTierFilteredOutCount,
    authoringTierFilteredOutTiers: filter.authoringTierFilteredOutTiers,
    authoringTierFilteredOutSummary: filter.authoringTierFilteredOutSummary,
    ...axisSummary,
  };
}

/** Read full app-builder part descriptors for internal source-lowering code that needs category-specific detail. */
export function appBuilderPartMenuDescriptors(
  request: AppBuilderPartMenuRequest = {},
): readonly AppBuilderPartDescriptor[] {
  return appBuilderPartMenuDescriptorFilter(request).parts;
}

/** Filter full app-builder part descriptors and report recommendation-tier exclusions. */
export function appBuilderPartMenuDescriptorFilter(
  request: AppBuilderPartMenuRequest = {},
): AppBuilderPartMenuDescriptorFilter {
  const authoringTierPolicy = appBuilderPartAuthoringTierPolicy(request);
  const partsBeforeTier = APP_BUILDER_PARTS.filter((part) => partMatchesPartMenuRequest(part, request, false));
  const parts = partsBeforeTier.filter((part) => partMatchesAuthoringTierPolicy(part, authoringTierPolicy));
  const filteredOut = partsBeforeTier.filter((part) => !partMatchesAuthoringTierPolicy(part, authoringTierPolicy));
  const filteredOutTiers = uniqueStrings(filteredOut.map((part) => part.authoringTier), 'sorted');
  return {
    parts,
    authoringTierPolicy,
    authoringTierFilteredOutCount: filteredOut.length,
    authoringTierFilteredOutTiers: filteredOutTiers,
    authoringTierFilteredOutSummary: authoringTierFilteredOutSummary(filteredOut.length, filteredOutTiers, authoringTierPolicy),
  };
}

/** Determine whether a menu request stays preferred-only or intentionally widens capability coverage. */
export function appBuilderPartAuthoringTierPolicy(
  request: AppBuilderPartMenuRequest = {},
): AppBuilderPartAuthoringTierPolicy {
  if (request.authoringTiers != null) {
    return {
      kind: AppBuilderPartAuthoringTierPolicyKind.ExplicitAuthoringTiers,
      acceptedAuthoringTiers: request.authoringTiers,
      summary: 'Caller supplied authoringTiers; app-builder will use that set exactly.',
    };
  }
  if (requestHasExplicitPartCapabilityIntent(request)) {
    return {
      kind: AppBuilderPartAuthoringTierPolicyKind.ExplicitCapabilityIntent,
      acceptedAuthoringTiers: null,
      summary: 'Exact part, package, or resource-package intent supplied; app-builder may return preferred, intent-scoped, or advanced rows that match the concrete capability request.',
    };
  }
  return {
    kind: AppBuilderPartAuthoringTierPolicyKind.DefaultPreferred,
    acceptedAuthoringTiers: [AppBuilderPartAuthoringTier.Preferred],
    summary: 'No exact capability intent supplied; shape filters narrow the preferred subset instead of widening into every supported Aurelia form.',
  };
}

function appBuilderPartMenuPart(
  part: AppBuilderPartDescriptor,
): AppBuilderPartMenuPart {
  return {
    kind: part.kind,
    id: part.id,
    title: part.title,
    summary: part.summary,
    authoringTier: part.authoringTier,
    syntaxCues: part.syntaxCues,
    applicationSites: part.applicationSites,
    operationKind: part.operationKind,
    valueChannelResolution: part.valueChannelResolution,
    valueChannels: part.valueChannels,
    resourceName: part.resourceName,
    resourceKind: part.resourceKind,
    resourcePackageId: part.resourcePackageId,
    syntaxCommandName: part.syntaxCommandName,
    frameworkSyntaxName: part.frameworkSyntaxName,
    frameworkApiName: part.frameworkApiName,
    resourceMetadataName: part.resourceMetadataName,
    componentLifecycleHookName: part.componentLifecycleHookName,
    requiredPackageSpecifier: part.requiredPackageSpecifier,
    requiredSlots: appBuilderPartRequiredSlotExpectations(part).map(appBuilderPartMenuSlotRef),
    optionalSlots: appBuilderPartOptionalSlotExpectations(part).map(appBuilderPartMenuSlotRef),
  };
}

function appBuilderPartMenuPartDetail(
  part: AppBuilderPartDescriptor,
): AppBuilderPartMenuPartDetail {
  return {
    ...part,
    requiredSlotExpectations: appBuilderPartRequiredSlotExpectations(part),
    optionalSlotExpectations: appBuilderPartOptionalSlotExpectations(part),
  };
}

function appBuilderPartMenuSlotRef(
  slot: AppBuilderPartSlotExpectation,
): AppBuilderPartMenuSlotRef {
  return {
    slotKind: slot.slotKind,
    valueLanguage: slot.valueLanguage,
    refinedByPartSyntax: slot.refinedByPartSyntax,
  };
}

function partMatchesPartMenuRequest(
  part: AppBuilderPartDescriptor,
  request: AppBuilderPartMenuRequest,
  includeAuthoringTier: boolean = true,
): boolean {
  return (
    valueMatches(part.kind, request.partKinds)
    && (!includeAuthoringTier || partMatchesAuthoringTierPolicy(part, appBuilderPartAuthoringTierPolicy(request)))
    && valueMatches(part.id, request.partIds)
    && intersects(part.applicationSites, request.applicationSites)
    && valueMatches(part.operationKind, request.operationKinds)
    && valueMatches(part.resourceKind, request.resourceKinds)
    && valueMatches(part.resourcePackageId, request.resourcePackageIds)
    && valueMatches(part.requiredPackageSpecifier, request.packageDependencies)
    && valueMatches(part.valueChannelResolution, request.valueChannelResolutionKinds)
    && requiredSlotsAreAvailable(part.requiredSlotKinds, request.availableSlotKinds)
    && slotsAreRelevant(part, request.relevantSlotKinds)
    && requiredSlotValueLanguagesAreAvailable(part, request.availableSlotValueLanguages)
    && slotValueLanguagesAreRelevant(part, request.relevantSlotValueLanguages)
  );
}

function partMatchesAuthoringTierPolicy(
  part: AppBuilderPartDescriptor,
  policy: AppBuilderPartAuthoringTierPolicy,
): boolean {
  return valueMatches(part.authoringTier, policy.acceptedAuthoringTiers ?? undefined);
}

function requestHasExplicitPartCapabilityIntent(
  request: AppBuilderPartMenuRequest,
): boolean {
  return hasValues(request.partIds)
    || hasValues(request.resourcePackageIds)
    || hasValues(request.packageDependencies);
}

function hasValues<T>(
  values: readonly T[] | undefined,
): boolean {
  return values !== undefined && values.length > 0;
}

function valueMatches<T extends string>(
  value: T | null,
  accepted: readonly T[] | undefined,
): boolean {
  return accepted == null || (value != null && accepted.includes(value));
}

function intersects<T extends string>(
  values: readonly T[],
  accepted: readonly T[] | undefined,
): boolean {
  return accepted == null || values.some((value) => accepted.includes(value));
}

function requiredSlotsAreAvailable(
  required: readonly AppBuilderPartSlotKind[],
  available: readonly AppBuilderPartSlotKind[] | undefined,
): boolean {
  return available == null || required.every((slot) => available.includes(slot));
}

function slotsAreRelevant(
  part: AppBuilderPartDescriptor,
  relevant: readonly AppBuilderPartSlotKind[] | undefined,
): boolean {
  return relevant == null
    || [...part.requiredSlotKinds, ...part.optionalSlotKinds].some((slot) => relevant.includes(slot));
}

function requiredSlotValueLanguagesAreAvailable(
  part: AppBuilderPartDescriptor,
  available: readonly AppBuilderPartSlotValueLanguage[] | undefined,
): boolean {
  return available == null
    || part.requiredSlotKinds.every((slotKind) => available.includes(appBuilderPartSlotExpectation(part, slotKind).valueLanguage));
}

function slotValueLanguagesAreRelevant(
  part: AppBuilderPartDescriptor,
  relevant: readonly AppBuilderPartSlotValueLanguage[] | undefined,
): boolean {
  return relevant == null
    || [...part.requiredSlotKinds, ...part.optionalSlotKinds].some((slotKind) =>
      relevant.includes(appBuilderPartSlotExpectation(part, slotKind).valueLanguage),
    );
}

function uniqueSlotExpectations(
  slots: readonly AppBuilderPartSlotExpectation[],
): readonly AppBuilderPartSlotExpectation[] {
  const seen = new Set<string>();
  const unique: AppBuilderPartSlotExpectation[] = [];
  for (const slot of slots) {
    const key = `${slot.slotKind}\0${slot.valueLanguage}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(slot);
    }
  }
  return unique.sort((left, right) =>
    left.slotKind.localeCompare(right.slotKind) || left.valueLanguage.localeCompare(right.valueLanguage),
  );
}

function appBuilderPartMenuAxisSummary(
  matchedParts: readonly AppBuilderPartDescriptor[],
): AppBuilderPartMenuAxisSummary {
  const requiredSlots = uniqueSlotExpectations(matchedParts.flatMap((part) => appBuilderPartRequiredSlotExpectations(part)));
  const optionalSlots = uniqueSlotExpectations(matchedParts.flatMap((part) => appBuilderPartOptionalSlotExpectations(part)));
  return {
    partKinds: uniqueStrings(matchedParts.map((part) => part.kind), 'sorted'),
    authoringTiers: uniqueStrings(matchedParts.map((part) => part.authoringTier), 'sorted'),
    applicationSites: uniqueStrings(matchedParts.flatMap((part) => part.applicationSites), 'sorted'),
    operationKinds: uniqueStrings(matchedParts.map((part) => part.operationKind), 'sorted'),
    valueChannelResolutionKinds: uniqueStrings(matchedParts.map((part) => part.valueChannelResolution), 'sorted'),
    requiredSlotKinds: uniqueStrings(matchedParts.flatMap((part) => part.requiredSlotKinds), 'sorted'),
    optionalSlotKinds: uniqueStrings(matchedParts.flatMap((part) => part.optionalSlotKinds), 'sorted'),
    requiredSlotValueLanguages: uniqueStrings(requiredSlots.map((slot) => slot.valueLanguage), 'sorted'),
    optionalSlotValueLanguages: uniqueStrings(optionalSlots.map((slot) => slot.valueLanguage), 'sorted'),
    requiredSlots,
    optionalSlots,
    resourceKinds: uniqueStrings(matchedParts.flatMap((part) => part.resourceKind == null ? [] : [part.resourceKind]), 'sorted'),
    resourcePackageIds: uniqueStrings(matchedParts.flatMap((part) => part.resourcePackageId == null ? [] : [part.resourcePackageId]), 'sorted'),
    packageDependencies: uniqueStrings(matchedParts.flatMap((part) =>
      part.requiredPackageSpecifier == null ? [] : [part.requiredPackageSpecifier]
    ), 'sorted'),
  };
}

function appBuilderPartMenuDisplayText(
  partCount: number,
  axisSummary: AppBuilderPartMenuAxisSummary,
  filter: AppBuilderPartMenuDescriptorFilter,
  includesDetails: boolean,
): string {
  const authoringTierPolicy = filter.authoringTierPolicy;
  return [
    `App-builder part menu: ${partCount} part(s), detail=${includesDetails ? 'descriptors' : 'compact'}.`,
    `Authoring tier policy: ${authoringTierPolicy.kind}. ${authoringTierPolicy.summary}`,
    `Kinds: ${displayPartMenuAxisValues(axisSummary.partKinds)}.`,
    `Authoring tiers: ${displayPartMenuAxisValues(axisSummary.authoringTiers)}.`,
    `Operations: ${displayPartMenuAxisValues(axisSummary.operationKinds)}.`,
    `Required slots: ${displayPartMenuAxisValues(axisSummary.requiredSlotKinds)}.`,
    `Optional slots: ${displayPartMenuAxisValues(axisSummary.optionalSlotKinds)}.`,
    `Package dependencies: ${displayPartMenuAxisValues(axisSummary.packageDependencies)}.`,
    ...(filter.authoringTierFilteredOutSummary == null ? [] : [filter.authoringTierFilteredOutSummary]),
    nextPartMenuStep(filter),
  ].join('\n');
}

function displayPartMenuAxisValues(
  values: readonly string[],
): string {
  return values.length === 0 ? 'none' : values.join(', ');
}

function authoringTierFilteredOutSummary(
  count: number,
  tiers: readonly AppBuilderPartAuthoringTier[],
  policy: AppBuilderPartAuthoringTierPolicy,
): string | null {
  if (count === 0) {
    return null;
  }
  const tierText = tiers.length === 0 ? 'none' : tiers.join(', ');
  const hint = policy.kind === AppBuilderPartAuthoringTierPolicyKind.DefaultPreferred
    ? 'Supply an exact part id, package/resource-package intent, or explicit authoringTiers to widen deliberately.'
    : 'Adjust authoringTiers if those rows are the intended source form.';
  return `Authoring-tier gate filtered out ${count} matching part(s) from tier(s): ${tierText}. ${hint}`;
}

function nextPartMenuStep(
  filter: AppBuilderPartMenuDescriptorFilter,
): string {
  if (filter.parts.length === 0 && filter.authoringTierFilteredOutCount > 0) {
    return 'Next: widen authoringTiers or supply exact capability intent if the filtered rows are truly desired.';
  }
  return 'Next: pick partKind/partId and call part-source-invocation with required slotAssignments, or call part-source-lowering-preview for generated examples.';
}
