import type { AppBuilderAffordanceRow } from './affordance.js';
import {
  APP_BUILDER_APPLICATION_PATTERN_ROWS,
  AppBuilderApplicationPatternId,
  type AppBuilderApplicationPatternRow,
} from './application-pattern.js';
import {
  expectedSemanticEffectKindDescriptorsForKinds,
  type ExpectedSemanticEffectKindDescriptorRow,
} from '../../fixture-verification/effect-kind-descriptor.js';
import type { AppBuilderCollectionConceptRow } from './collection.js';
import type { AppBuilderCollectionFeatureRow } from './collection.js';
import type {
  AppBuilderControlManifestRow,
  AppBuilderControlPatternRow,
} from './control.js';
import {
  appBuilderAffordancesForApplicationPatterns,
  appBuilderCollectionConceptsForApplicationPatterns,
  appBuilderCollectionFeaturesForApplicationPatterns,
  appBuilderCompanionApplicationPatternsForApplicationPatterns,
  appBuilderControlManifestsForApplicationPatterns,
  appBuilderControlPatternsForApplicationPatterns,
  appBuilderStylingMechanismsForApplicationPatterns,
  appBuilderVisualPoliciesForApplicationPatterns,
} from './detail-joins.js';
import {
  appBuilderInputContractDetail,
  type AppBuilderInputContractDetailRow,
} from './input-contract-detail.js';
import {
  appBuilderInputReadiness,
  type AppBuilderInputReadinessResult,
  type AppBuilderInputReadinessIssue,
  type AppBuilderInputReadinessTargetRow,
  type AppBuilderSuppliedInput,
} from './input-readiness.js';
import {
  appBuilderInputContractIdsForDependency,
  appBuilderInputFacetSelectionsForDependency,
} from './input.js';
import {
  appBuilderDecisionBundleInputCounts,
  type AppBuilderDecisionBundle,
} from '../policy/decision-bundle.js';
import {
  appBuilderHasExplicitSelection,
  appBuilderIncludeDetail,
} from './detail-helpers.js';
import {
  AppBuilderOntologyRowKind,
  appBuilderOntologyRowRef,
} from './relation.js';
import type {
  AppBuilderStylingMechanismRow,
  AppBuilderVisualPolicyRow,
} from './style.js';

/** Detail request for selected app-builder application design patterns. */
export interface AppBuilderApplicationPatternDetailRequest {
  /** Include only these application patterns; omitted returns compact base rows unless a detail include flag is true. */
  readonly applicationPatternIds?: readonly AppBuilderApplicationPatternId[] | null;
  /** Input markers already supplied by caller, AI, app facts, policy, or public presets. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles expanded into supplied input markers before readiness is evaluated. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Include full input-readiness rows for each pattern; defaults to true only for selected patterns. */
  readonly includeInputReadiness?: boolean | null;
  /** Include input contract payload/detail rows for each pattern; defaults to true only for selected patterns. */
  readonly includeInputContractDetail?: boolean | null;
  /** Include concrete payload schemas in input contract detail rows; defaults to true only for selected patterns. */
  readonly includePayloadSchemas?: boolean | null;
  /** Include coordinated collection concept rows; defaults to true only for selected patterns. */
  readonly includeCollectionConcepts?: boolean | null;
  /** Include caller-selectable collection features associated with coordinated concepts; defaults to true only for selected patterns. */
  readonly includeCollectionFeatures?: boolean | null;
  /** Include companion application patterns commonly coordinated with this pattern; defaults to true only for selected patterns. */
  readonly includeCompanionApplicationPatterns?: boolean | null;
  /** Include coordinated control pattern rows; defaults to true only for selected patterns. */
  readonly includeControlPatterns?: boolean | null;
  /** Include coordinated control/component manifest rows; defaults to true only for selected patterns. */
  readonly includeControlManifests?: boolean | null;
  /** Include coordinated styling mechanism rows; defaults to true only for selected patterns. */
  readonly includeStylingMechanisms?: boolean | null;
  /** Include coordinated visual policy rows; defaults to true only for selected patterns. */
  readonly includeVisualPolicies?: boolean | null;
  /** Include affordance rows that declare this pattern as associated; defaults to true only for selected patterns. */
  readonly includeAffordances?: boolean | null;
  /** Include expected-effect descriptors for semantic product families; defaults to true only for selected patterns. */
  readonly includeSemanticEffectDescriptors?: boolean | null;
}

/** Read-only detail row for one application design pattern. */
export interface AppBuilderApplicationPatternDetailRow {
  /** Selected application design pattern row. */
  readonly applicationPattern: AppBuilderApplicationPatternRow;
  /** Input readiness for this pattern when requested. */
  readonly inputReadiness?: AppBuilderInputReadinessTargetRow;
  /** Payload/schema detail for this pattern's input contracts when requested. */
  readonly inputContractDetails?: readonly AppBuilderInputContractDetailRow[];
  /** Collection concepts coordinated by this pattern when requested. */
  readonly collectionConcepts?: readonly AppBuilderCollectionConceptRow[];
  /** Caller-selectable collection features associated with coordinated concepts when requested. */
  readonly collectionFeatures?: readonly AppBuilderCollectionFeatureRow[];
  /** Application patterns commonly coordinated with this pattern when requested. */
  readonly companionApplicationPatterns?: readonly AppBuilderApplicationPatternRow[];
  /** Control patterns coordinated by this pattern when requested. */
  readonly controlPatterns?: readonly AppBuilderControlPatternRow[];
  /** Control/component manifest rows coordinated by this pattern when requested. */
  readonly controlManifests?: readonly AppBuilderControlManifestRow[];
  /** Styling mechanisms coordinated by this pattern when requested. */
  readonly stylingMechanisms?: readonly AppBuilderStylingMechanismRow[];
  /** Visual policies coordinated by this pattern when requested. */
  readonly visualPolicies?: readonly AppBuilderVisualPolicyRow[];
  /** App-building moves that declare this pattern as associated when requested. */
  readonly affordances?: readonly AppBuilderAffordanceRow[];
  /** Expected-effect descriptors for semantic product families this pattern should prove after reopen. */
  readonly semanticEffectDescriptors?: readonly ExpectedSemanticEffectKindDescriptorRow[];
}

/** Read-only selected-pattern detail for AI workflow negotiation. */
export interface AppBuilderApplicationPatternDetail {
  /** Compact display text suitable for MCP/IDE answer envelopes. */
  readonly displayText: string;
  /** Selected application pattern detail rows. */
  readonly rows: readonly AppBuilderApplicationPatternDetailRow[];
  /** Issues found while projecting supplied-input readiness. */
  readonly issues: readonly AppBuilderInputReadinessIssue[];
  /** Whether input-readiness rows were included. */
  readonly inputReadinessIncluded: boolean;
  /** Whether input contract detail rows were included. */
  readonly inputContractDetailIncluded: boolean;
  /** Whether modeled payload schemas were included inside input contract detail rows. */
  readonly payloadSchemasIncluded: boolean;
  /** Whether collection concept rows were included. */
  readonly collectionConceptsIncluded: boolean;
  /** Whether collection feature rows were included. */
  readonly collectionFeaturesIncluded: boolean;
  /** Whether companion application-pattern rows were included. */
  readonly companionApplicationPatternsIncluded: boolean;
  /** Whether control pattern rows were included. */
  readonly controlPatternsIncluded: boolean;
  /** Whether control/component manifest rows were included. */
  readonly controlManifestsIncluded: boolean;
  /** Whether styling mechanism rows were included. */
  readonly stylingMechanismsIncluded: boolean;
  /** Whether visual policy rows were included. */
  readonly visualPoliciesIncluded: boolean;
  /** Whether associated affordance rows were included. */
  readonly affordancesIncluded: boolean;
  /** Whether expected-effect descriptors were included. */
  readonly semanticEffectDescriptorsIncluded: boolean;
  /** Number of supplied input markers considered by readiness. */
  readonly suppliedInputCount: number;
  /** Number of supplied input markers explicitly present before decision-bundle expansion. */
  readonly explicitSuppliedInputCount: number;
  /** Number of request-local decision bundles considered. */
  readonly decisionBundleCount: number;
  /** Number of decisions carried by request-local decision bundles. */
  readonly decisionBundleDecisionCount: number;
}

/** Selection and include flags for one application-pattern detail projection. */
interface AppBuilderApplicationPatternDetailSelectionFrame {
  /** Selected application patterns after id filtering. */
  readonly applicationPatterns: readonly AppBuilderApplicationPatternRow[];
  /** Whether input-readiness rows should be included. */
  readonly includeInputReadiness: boolean;
  /** Whether input contract details should be included. */
  readonly includeInputContractDetail: boolean;
  /** Whether payload schemas should be included in input contract detail. */
  readonly includePayloadSchemas: boolean;
  /** Whether coordinated collection concepts should be included. */
  readonly includeCollectionConcepts: boolean;
  /** Whether coordinated collection features should be included. */
  readonly includeCollectionFeatures: boolean;
  /** Whether companion application patterns should be included. */
  readonly includeCompanionApplicationPatterns: boolean;
  /** Whether coordinated control patterns should be included. */
  readonly includeControlPatterns: boolean;
  /** Whether coordinated control/component manifest rows should be included. */
  readonly includeControlManifests: boolean;
  /** Whether coordinated styling mechanisms should be included. */
  readonly includeStylingMechanisms: boolean;
  /** Whether coordinated visual policies should be included. */
  readonly includeVisualPolicies: boolean;
  /** Whether associated affordances should be included. */
  readonly includeAffordances: boolean;
  /** Whether semantic effect descriptors should be included. */
  readonly includeSemanticEffectDescriptors: boolean;
}

/** Input-readiness lookup frame for selected application-pattern targets. */
interface AppBuilderApplicationPatternDetailReadinessFrame {
  /** Readiness result when requested. */
  readonly inputReadiness: AppBuilderInputReadinessResult | null;
  /** Readiness rows keyed by application pattern id. */
  readonly readinessByPatternId: ReadonlyMap<string, AppBuilderInputReadinessTargetRow>;
}

/** Rendered application-pattern rows before summary counts are computed. */
interface AppBuilderApplicationPatternDetailRowsFrame {
  /** Selected application-pattern detail rows. */
  readonly rows: readonly AppBuilderApplicationPatternDetailRow[];
}

/** Count summary for the application-pattern detail answer display text. */
interface AppBuilderApplicationPatternDetailSummaryFrame {
  readonly inputContractDetailCount: number;
  readonly collectionConceptCount: number;
  readonly collectionFeatureCount: number;
  readonly companionApplicationPatternCount: number;
  readonly controlPatternCount: number;
  readonly controlManifestCount: number;
  readonly stylingMechanismCount: number;
  readonly visualPolicyCount: number;
  readonly affordanceCount: number;
  readonly semanticEffectDescriptorCount: number;
  readonly issueCount: number;
}

/** Return selected application patterns joined to readiness, payload detail, coordinated concepts, and associated moves. */
export function appBuilderApplicationPatternDetail(
  request: AppBuilderApplicationPatternDetailRequest = {},
): AppBuilderApplicationPatternDetail {
  const selection = applicationPatternDetailSelectionFrame(request);
  const readiness = applicationPatternDetailReadinessFrame(selection, request);
  const rowFrame = applicationPatternDetailRowsFrame(selection, readiness);
  const summary = applicationPatternDetailSummaryFrame(rowFrame, readiness);
  const inputCounts = appBuilderDecisionBundleInputCounts(request.suppliedInputs, request.decisionBundles);
  return {
    rows: rowFrame.rows,
    issues: readiness.inputReadiness?.issues ?? [],
    inputReadinessIncluded: selection.includeInputReadiness,
    inputContractDetailIncluded: selection.includeInputContractDetail,
    payloadSchemasIncluded: selection.includePayloadSchemas,
    collectionConceptsIncluded: selection.includeCollectionConcepts,
    collectionFeaturesIncluded: selection.includeCollectionFeatures,
    companionApplicationPatternsIncluded: selection.includeCompanionApplicationPatterns,
    controlPatternsIncluded: selection.includeControlPatterns,
    controlManifestsIncluded: selection.includeControlManifests,
    stylingMechanismsIncluded: selection.includeStylingMechanisms,
    visualPoliciesIncluded: selection.includeVisualPolicies,
    affordancesIncluded: selection.includeAffordances,
    semanticEffectDescriptorsIncluded: selection.includeSemanticEffectDescriptors,
    ...inputCounts,
    displayText: applicationPatternDetailDisplayText(rowFrame, selection, summary),
  };
}

function applicationPatternDetailSelectionFrame(
  request: AppBuilderApplicationPatternDetailRequest,
): AppBuilderApplicationPatternDetailSelectionFrame {
  const hasExplicitSelection = appBuilderHasExplicitSelection(request.applicationPatternIds);
  const includeInputReadiness = appBuilderIncludeDetail(request.includeInputReadiness, hasExplicitSelection);
  const includeInputContractDetail = appBuilderIncludeDetail(request.includeInputContractDetail, hasExplicitSelection);
  const includePayloadSchemas = appBuilderIncludeDetail(request.includePayloadSchemas, hasExplicitSelection);
  const includeCollectionConcepts = appBuilderIncludeDetail(request.includeCollectionConcepts, hasExplicitSelection);
  const includeCollectionFeatures = appBuilderIncludeDetail(request.includeCollectionFeatures, hasExplicitSelection);
  const includeCompanionApplicationPatterns = appBuilderIncludeDetail(
    request.includeCompanionApplicationPatterns,
    hasExplicitSelection,
  );
  const includeControlPatterns = appBuilderIncludeDetail(request.includeControlPatterns, hasExplicitSelection);
  const includeControlManifests = appBuilderIncludeDetail(request.includeControlManifests, hasExplicitSelection);
  const includeStylingMechanisms = appBuilderIncludeDetail(request.includeStylingMechanisms, hasExplicitSelection);
  const includeVisualPolicies = appBuilderIncludeDetail(request.includeVisualPolicies, hasExplicitSelection);
  const includeAffordances = appBuilderIncludeDetail(request.includeAffordances, hasExplicitSelection);
  const includeSemanticEffectDescriptors = appBuilderIncludeDetail(
    request.includeSemanticEffectDescriptors,
    hasExplicitSelection,
  );
  const applicationPatternIds = request.applicationPatternIds == null || request.applicationPatternIds.length === 0
    ? null
    : new Set(request.applicationPatternIds);
  const applicationPatterns = APP_BUILDER_APPLICATION_PATTERN_ROWS.filter((row) =>
    applicationPatternIds == null || applicationPatternIds.has(row.id)
  );
  return {
    applicationPatterns,
    includeInputReadiness,
    includeInputContractDetail,
    includePayloadSchemas,
    includeCollectionConcepts,
    includeCollectionFeatures,
    includeCompanionApplicationPatterns,
    includeControlPatterns,
    includeControlManifests,
    includeStylingMechanisms,
    includeVisualPolicies,
    includeAffordances,
    includeSemanticEffectDescriptors,
  };
}

function applicationPatternDetailReadinessFrame(
  selection: AppBuilderApplicationPatternDetailSelectionFrame,
  request: AppBuilderApplicationPatternDetailRequest,
): AppBuilderApplicationPatternDetailReadinessFrame {
  const inputReadiness = selection.includeInputReadiness
    ? appBuilderInputReadiness({
      targetRefs: selection.applicationPatterns.map((row) => appBuilderOntologyRowRef(
        AppBuilderOntologyRowKind.ApplicationPattern,
        row.id,
      )),
      suppliedInputs: request.suppliedInputs ?? [],
      decisionBundles: request.decisionBundles ?? [],
    })
    : null;
  const readinessByPatternId = new Map(
    inputReadiness?.targets.map((row) => [row.targetRef.id, row]) ?? [],
  );
  return { inputReadiness, readinessByPatternId };
}

function applicationPatternDetailRowsFrame(
  selection: AppBuilderApplicationPatternDetailSelectionFrame,
  readiness: AppBuilderApplicationPatternDetailReadinessFrame,
): AppBuilderApplicationPatternDetailRowsFrame {
  return {
    rows: selection.applicationPatterns.map((applicationPattern) =>
      applicationPatternDetailRow(applicationPattern, selection, readiness)
    ),
  };
}

function applicationPatternDetailRow(
  applicationPattern: AppBuilderApplicationPatternRow,
  selection: AppBuilderApplicationPatternDetailSelectionFrame,
  readiness: AppBuilderApplicationPatternDetailReadinessFrame,
): AppBuilderApplicationPatternDetailRow {
  const applicationPatternRows = [applicationPattern];
  return {
    applicationPattern,
    ...(selection.includeInputReadiness
      ? { inputReadiness: readiness.readinessByPatternId.get(applicationPattern.id) }
      : {}),
    ...(selection.includeInputContractDetail
      ? { inputContractDetails: inputContractDetailsForApplicationPattern(applicationPattern, selection) }
      : {}),
    ...(selection.includeCollectionConcepts
      ? { collectionConcepts: appBuilderCollectionConceptsForApplicationPatterns(applicationPatternRows) }
      : {}),
    ...(selection.includeCollectionFeatures
      ? { collectionFeatures: appBuilderCollectionFeaturesForApplicationPatterns(applicationPatternRows) }
      : {}),
    ...(selection.includeCompanionApplicationPatterns
      ? {
        companionApplicationPatterns:
          appBuilderCompanionApplicationPatternsForApplicationPatterns(applicationPatternRows),
      }
      : {}),
    ...(selection.includeControlPatterns
      ? { controlPatterns: appBuilderControlPatternsForApplicationPatterns(applicationPatternRows) }
      : {}),
    ...(selection.includeControlManifests
      ? { controlManifests: appBuilderControlManifestsForApplicationPatterns(applicationPatternRows) }
      : {}),
    ...(selection.includeStylingMechanisms
      ? { stylingMechanisms: appBuilderStylingMechanismsForApplicationPatterns(applicationPatternRows) }
      : {}),
    ...(selection.includeVisualPolicies
      ? { visualPolicies: appBuilderVisualPoliciesForApplicationPatterns(applicationPatternRows) }
      : {}),
    ...(selection.includeAffordances
      ? { affordances: appBuilderAffordancesForApplicationPatterns(applicationPatternRows) }
      : {}),
    ...(selection.includeSemanticEffectDescriptors
      ? {
        semanticEffectDescriptors: expectedSemanticEffectKindDescriptorsForKinds(
          applicationPattern.semanticEffectKinds,
        ),
      }
      : {}),
  };
}

function inputContractDetailsForApplicationPattern(
  applicationPattern: AppBuilderApplicationPatternRow,
  selection: AppBuilderApplicationPatternDetailSelectionFrame,
): readonly AppBuilderInputContractDetailRow[] {
  const inputContractIds = appBuilderInputContractIdsForDependency(applicationPattern);
  if (inputContractIds.length === 0) {
    return [];
  }
  return appBuilderInputContractDetail({
    inputContractIds,
    inputFacetSelections: appBuilderInputFacetSelectionsForDependency(applicationPattern),
    includePayloadSchemas: selection.includePayloadSchemas,
  }).rows;
}

function applicationPatternDetailSummaryFrame(
  rowFrame: AppBuilderApplicationPatternDetailRowsFrame,
  readiness: AppBuilderApplicationPatternDetailReadinessFrame,
): AppBuilderApplicationPatternDetailSummaryFrame {
  const rows = rowFrame.rows;
  const inputContractDetailCount = rows.reduce((sum, row) =>
    sum + (row.inputContractDetails?.length ?? 0), 0);
  const collectionConceptCount = rows.reduce((sum, row) => sum + (row.collectionConcepts?.length ?? 0), 0);
  const collectionFeatureCount = rows.reduce((sum, row) => sum + (row.collectionFeatures?.length ?? 0), 0);
  const companionApplicationPatternCount = rows.reduce((sum, row) =>
    sum + (row.companionApplicationPatterns?.length ?? 0), 0);
  const controlPatternCount = rows.reduce((sum, row) => sum + (row.controlPatterns?.length ?? 0), 0);
  const controlManifestCount = rows.reduce((sum, row) => sum + (row.controlManifests?.length ?? 0), 0);
  const stylingMechanismCount = rows.reduce((sum, row) => sum + (row.stylingMechanisms?.length ?? 0), 0);
  const visualPolicyCount = rows.reduce((sum, row) => sum + (row.visualPolicies?.length ?? 0), 0);
  const affordanceCount = rows.reduce((sum, row) => sum + (row.affordances?.length ?? 0), 0);
  const semanticEffectDescriptorCount = rows.reduce((sum, row) =>
    sum + (row.semanticEffectDescriptors?.length ?? 0), 0);
  return {
    inputContractDetailCount,
    collectionConceptCount,
    collectionFeatureCount,
    companionApplicationPatternCount,
    controlPatternCount,
    controlManifestCount,
    stylingMechanismCount,
    visualPolicyCount,
    affordanceCount,
    semanticEffectDescriptorCount,
    issueCount: readiness.inputReadiness?.issues.length ?? 0,
  };
}

function applicationPatternDetailDisplayText(
  rowFrame: AppBuilderApplicationPatternDetailRowsFrame,
  selection: AppBuilderApplicationPatternDetailSelectionFrame,
  summary: AppBuilderApplicationPatternDetailSummaryFrame,
): string {
  return `App-builder application pattern detail: ${rowFrame.rows.length} pattern(s), inputReadiness=${selection.includeInputReadiness}, inputContractDetails=${summary.inputContractDetailCount}, collectionConcepts=${summary.collectionConceptCount}, collectionFeatures=${summary.collectionFeatureCount}, companionApplicationPatterns=${summary.companionApplicationPatternCount}, controlPatterns=${summary.controlPatternCount}, controlManifests=${summary.controlManifestCount}, stylingMechanisms=${summary.stylingMechanismCount}, visualPolicies=${summary.visualPolicyCount}, affordances=${summary.affordanceCount}, semanticEffectDescriptors=${summary.semanticEffectDescriptorCount}, issues=${summary.issueCount}.`;
}
