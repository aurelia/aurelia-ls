import type { AppBuilderAffordanceRow } from './affordance.js';
import type { AppBuilderApplicationPatternRow } from './application-pattern.js';
import type { AppBuilderCollectionConceptRow } from './collection.js';
import type {
  AppBuilderControlManifestRow,
  AppBuilderControlPatternRow,
} from './control.js';
import {
  appBuilderAffordancesForApplicationPatterns,
  appBuilderApplicationPatternsForStylingMechanism,
  appBuilderApplicationPatternsForVisualPolicy,
  appBuilderCollectionConceptsForApplicationPatterns,
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
import {
  APP_BUILDER_STYLING_MECHANISM_ROWS,
  APP_BUILDER_VISUAL_POLICY_ROWS,
  AppBuilderStylingMechanismId,
  AppBuilderVisualPolicyId,
  type AppBuilderStylingMechanismRow,
  type AppBuilderVisualPolicyRow,
} from './style.js';

/** Detail request for selected app-builder style mechanisms and visual policies. */
export interface AppBuilderStyleDetailRequest {
  /** Include only these styling mechanisms; omitted returns compact base rows unless a detail include flag is true. */
  readonly stylingMechanismIds?: readonly AppBuilderStylingMechanismId[] | null;
  /** Include only these visual policies; omitted returns compact base rows unless a detail include flag is true. */
  readonly visualPolicyIds?: readonly AppBuilderVisualPolicyId[] | null;
  /** Input markers already supplied by caller, AI, app facts, policy, or public presets. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles expanded into supplied input markers before readiness is evaluated. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Include full input-readiness rows for each selected style row; defaults to true only for selected style rows. */
  readonly includeInputReadiness?: boolean | null;
  /** Include input contract payload/detail rows for selected visual policies; defaults to true only for selected style rows. */
  readonly includeInputContractDetail?: boolean | null;
  /** Include concrete payload schemas in input contract detail rows; defaults to true only for selected style rows. */
  readonly includePayloadSchemas?: boolean | null;
  /** Include application patterns that coordinate each selected style row; defaults to true only for selected style rows. */
  readonly includeApplicationPatterns?: boolean | null;
  /** Include collection concepts coordinated through those application patterns; defaults to true only for selected style rows. */
  readonly includeCollectionConcepts?: boolean | null;
  /** Include control patterns coordinated through those application patterns; defaults to true only for selected style rows. */
  readonly includeControlPatterns?: boolean | null;
  /** Include control/component manifest rows coordinated through those application patterns; defaults to true only for selected style rows. */
  readonly includeControlManifests?: boolean | null;
  /** Include styling mechanisms coordinated through visual-policy patterns; defaults to true only for selected style rows. */
  readonly includeStylingMechanisms?: boolean | null;
  /** Include visual policies coordinated through styling-mechanism patterns; defaults to true only for selected style rows. */
  readonly includeVisualPolicies?: boolean | null;
  /** Include affordance rows associated with those application patterns; defaults to true only for selected style rows. */
  readonly includeAffordances?: boolean | null;
}

/** Read-only detail row for one framework/tooling styling mechanism. */
export interface AppBuilderStylingMechanismDetailRow {
  /** Selected styling mechanism row. */
  readonly stylingMechanism: AppBuilderStylingMechanismRow;
  /** Input readiness for this styling mechanism when requested. */
  readonly inputReadiness?: AppBuilderInputReadinessTargetRow;
  /** Application patterns that coordinate this styling mechanism when requested. */
  readonly applicationPatterns?: readonly AppBuilderApplicationPatternRow[];
  /** Collection concepts coordinated by those application patterns when requested. */
  readonly collectionConcepts?: readonly AppBuilderCollectionConceptRow[];
  /** Control patterns coordinated by those application patterns when requested. */
  readonly controlPatterns?: readonly AppBuilderControlPatternRow[];
  /** Control/component manifest rows coordinated by those application patterns when requested. */
  readonly controlManifests?: readonly AppBuilderControlManifestRow[];
  /** Visual policies coordinated by those application patterns when requested. */
  readonly visualPolicies?: readonly AppBuilderVisualPolicyRow[];
  /** App-building moves associated with those application patterns when requested. */
  readonly affordances?: readonly AppBuilderAffordanceRow[];
}

/** Read-only detail row for one visual/style responsibility policy. */
export interface AppBuilderVisualPolicyDetailRow {
  /** Selected visual policy row. */
  readonly visualPolicy: AppBuilderVisualPolicyRow;
  /** Input readiness for this visual policy when requested. */
  readonly inputReadiness?: AppBuilderInputReadinessTargetRow;
  /** Payload/schema detail for this visual policy's input contracts when requested. */
  readonly inputContractDetails?: readonly AppBuilderInputContractDetailRow[];
  /** Application patterns that coordinate this visual policy when requested. */
  readonly applicationPatterns?: readonly AppBuilderApplicationPatternRow[];
  /** Collection concepts coordinated by those application patterns when requested. */
  readonly collectionConcepts?: readonly AppBuilderCollectionConceptRow[];
  /** Control patterns coordinated by those application patterns when requested. */
  readonly controlPatterns?: readonly AppBuilderControlPatternRow[];
  /** Control/component manifest rows coordinated by those application patterns when requested. */
  readonly controlManifests?: readonly AppBuilderControlManifestRow[];
  /** Styling mechanisms coordinated by those application patterns when requested. */
  readonly stylingMechanisms?: readonly AppBuilderStylingMechanismRow[];
  /** App-building moves associated with those application patterns when requested. */
  readonly affordances?: readonly AppBuilderAffordanceRow[];
}

/** Read-only selected-style detail for AI workflow negotiation. */
export interface AppBuilderStyleDetail {
  /** Compact display text suitable for MCP/IDE answer envelopes. */
  readonly displayText: string;
  /** Selected styling-mechanism detail rows. */
  readonly stylingMechanismRows: readonly AppBuilderStylingMechanismDetailRow[];
  /** Selected visual-policy detail rows. */
  readonly visualPolicyRows: readonly AppBuilderVisualPolicyDetailRow[];
  /** Issues found while projecting supplied-input readiness. */
  readonly issues: readonly AppBuilderInputReadinessIssue[];
  /** Whether input-readiness rows were included. */
  readonly inputReadinessIncluded: boolean;
  /** Whether input contract detail rows were included for visual-policy rows. */
  readonly inputContractDetailIncluded: boolean;
  /** Whether modeled payload schemas were included inside input contract detail rows. */
  readonly payloadSchemasIncluded: boolean;
  /** Whether associated application pattern rows were included. */
  readonly applicationPatternsIncluded: boolean;
  /** Whether coordinated collection concept rows were included. */
  readonly collectionConceptsIncluded: boolean;
  /** Whether coordinated control pattern rows were included. */
  readonly controlPatternsIncluded: boolean;
  /** Whether coordinated control/component manifest rows were included. */
  readonly controlManifestsIncluded: boolean;
  /** Whether coordinated styling mechanism rows were included on visual policies. */
  readonly stylingMechanismsIncluded: boolean;
  /** Whether coordinated visual policy rows were included on styling mechanisms. */
  readonly visualPoliciesIncluded: boolean;
  /** Whether associated affordance rows were included. */
  readonly affordancesIncluded: boolean;
  /** Number of supplied input markers considered by readiness. */
  readonly suppliedInputCount: number;
  /** Number of supplied input markers explicitly present before decision-bundle expansion. */
  readonly explicitSuppliedInputCount: number;
  /** Number of request-local decision bundles considered. */
  readonly decisionBundleCount: number;
  /** Number of decisions carried by request-local decision bundles. */
  readonly decisionBundleDecisionCount: number;
}

/** Selection and include flags for one style-detail projection. */
interface AppBuilderStyleDetailSelectionFrame {
  /** Whether the caller selected at least one styling mechanism or visual policy. */
  readonly hasExplicitSelection: boolean;
  /** Selected styling mechanisms after id filtering. */
  readonly stylingMechanisms: readonly AppBuilderStylingMechanismRow[];
  /** Selected visual policies after id filtering. */
  readonly visualPolicies: readonly AppBuilderVisualPolicyRow[];
  /** Whether input-readiness rows should be included. */
  readonly includeInputReadiness: boolean;
  /** Whether visual-policy input contract details should be included. */
  readonly includeInputContractDetail: boolean;
  /** Whether payload schemas should be included in input contract details. */
  readonly includePayloadSchemas: boolean;
  /** Whether coordinating application patterns should be included. */
  readonly includeApplicationPatterns: boolean;
  /** Whether coordinated collection concepts should be included. */
  readonly includeCollectionConcepts: boolean;
  /** Whether coordinated control patterns should be included. */
  readonly includeControlPatterns: boolean;
  /** Whether coordinated control/component manifests should be included. */
  readonly includeControlManifests: boolean;
  /** Whether styling mechanisms should be included on visual-policy rows. */
  readonly includeStylingMechanisms: boolean;
  /** Whether visual policies should be included on styling-mechanism rows. */
  readonly includeVisualPolicies: boolean;
  /** Whether associated affordances should be included. */
  readonly includeAffordances: boolean;
}

/** Input-readiness lookup frame for selected style-detail targets. */
interface AppBuilderStyleDetailReadinessFrame {
  /** Readiness result when requested. */
  readonly inputReadiness: AppBuilderInputReadinessResult | null;
  /** Readiness rows keyed by ontology kind and id. */
  readonly readinessByKey: ReadonlyMap<string, AppBuilderInputReadinessTargetRow>;
}

/** Rendered style-detail row families before the answer summary is computed. */
interface AppBuilderStyleDetailRowsFrame {
  /** Selected styling-mechanism detail rows. */
  readonly stylingMechanismRows: readonly AppBuilderStylingMechanismDetailRow[];
  /** Selected visual-policy detail rows. */
  readonly visualPolicyRows: readonly AppBuilderVisualPolicyDetailRow[];
}

/** Count summary for the style-detail answer display text. */
interface AppBuilderStyleDetailSummaryFrame {
  readonly inputContractDetailCount: number;
  readonly applicationPatternCount: number;
  readonly collectionConceptCount: number;
  readonly controlPatternCount: number;
  readonly controlManifestCount: number;
  readonly stylingMechanismCount: number;
  readonly visualPolicyCount: number;
  readonly affordanceCount: number;
  readonly issueCount: number;
}

/** Return selected styling mechanisms and visual policies joined to readiness, input detail, coordinating patterns, and related concept rows. */
export function appBuilderStyleDetail(
  request: AppBuilderStyleDetailRequest = {},
): AppBuilderStyleDetail {
  const selection = styleDetailSelectionFrame(request);
  const readiness = styleDetailReadinessFrame(selection, request);
  const rows = styleDetailRowsFrame(selection, readiness);
  const summary = styleDetailSummaryFrame(rows, readiness);
  const inputCounts = appBuilderDecisionBundleInputCounts(request.suppliedInputs, request.decisionBundles);
  return {
    stylingMechanismRows: rows.stylingMechanismRows,
    visualPolicyRows: rows.visualPolicyRows,
    issues: readiness.inputReadiness?.issues ?? [],
    inputReadinessIncluded: selection.includeInputReadiness,
    inputContractDetailIncluded: selection.includeInputContractDetail,
    payloadSchemasIncluded: selection.includePayloadSchemas,
    applicationPatternsIncluded: selection.includeApplicationPatterns,
    collectionConceptsIncluded: selection.includeCollectionConcepts,
    controlPatternsIncluded: selection.includeControlPatterns,
    controlManifestsIncluded: selection.includeControlManifests,
    stylingMechanismsIncluded: selection.includeStylingMechanisms,
    visualPoliciesIncluded: selection.includeVisualPolicies,
    affordancesIncluded: selection.includeAffordances,
    ...inputCounts,
    displayText: styleDetailDisplayText(rows, selection, summary),
  };
}

function styleDetailSelectionFrame(
  request: AppBuilderStyleDetailRequest,
): AppBuilderStyleDetailSelectionFrame {
  const hasExplicitSelection = appBuilderHasExplicitSelection(
    request.stylingMechanismIds,
    request.visualPolicyIds,
  );
  const includeInputReadiness = appBuilderIncludeDetail(request.includeInputReadiness, hasExplicitSelection);
  const includeInputContractDetail = appBuilderIncludeDetail(request.includeInputContractDetail, hasExplicitSelection);
  const includePayloadSchemas = appBuilderIncludeDetail(request.includePayloadSchemas, hasExplicitSelection);
  const includeApplicationPatterns = appBuilderIncludeDetail(request.includeApplicationPatterns, hasExplicitSelection);
  const includeCollectionConcepts = appBuilderIncludeDetail(request.includeCollectionConcepts, hasExplicitSelection);
  const includeControlPatterns = appBuilderIncludeDetail(request.includeControlPatterns, hasExplicitSelection);
  const includeControlManifests = appBuilderIncludeDetail(request.includeControlManifests, hasExplicitSelection);
  const includeStylingMechanisms = appBuilderIncludeDetail(request.includeStylingMechanisms, hasExplicitSelection);
  const includeVisualPolicies = appBuilderIncludeDetail(request.includeVisualPolicies, hasExplicitSelection);
  const includeAffordances = appBuilderIncludeDetail(request.includeAffordances, hasExplicitSelection);
  const stylingMechanismIds = request.stylingMechanismIds == null || request.stylingMechanismIds.length === 0
    ? null
    : new Set(request.stylingMechanismIds);
  const visualPolicyIds = request.visualPolicyIds == null || request.visualPolicyIds.length === 0
    ? null
    : new Set(request.visualPolicyIds);
  const stylingMechanisms = APP_BUILDER_STYLING_MECHANISM_ROWS.filter((row) =>
    stylingMechanismIds == null || stylingMechanismIds.has(row.id)
  );
  const visualPolicies = APP_BUILDER_VISUAL_POLICY_ROWS.filter((row) =>
    visualPolicyIds == null || visualPolicyIds.has(row.id)
  );
  return {
    hasExplicitSelection,
    stylingMechanisms,
    visualPolicies,
    includeInputReadiness,
    includeInputContractDetail,
    includePayloadSchemas,
    includeApplicationPatterns,
    includeCollectionConcepts,
    includeControlPatterns,
    includeControlManifests,
    includeStylingMechanisms,
    includeVisualPolicies,
    includeAffordances,
  };
}

function styleDetailReadinessFrame(
  selection: AppBuilderStyleDetailSelectionFrame,
  request: AppBuilderStyleDetailRequest,
): AppBuilderStyleDetailReadinessFrame {
  const stylingMechanisms = selection.stylingMechanisms;
  const visualPolicies = selection.visualPolicies;
  const inputReadiness = selection.includeInputReadiness
    ? appBuilderInputReadiness({
      targetRefs: [
        ...stylingMechanisms.map((row) => appBuilderOntologyRowRef(
          AppBuilderOntologyRowKind.StylingMechanism,
          row.id,
        )),
        ...visualPolicies.map((row) => appBuilderOntologyRowRef(
          AppBuilderOntologyRowKind.VisualPolicy,
          row.id,
        )),
      ],
      suppliedInputs: request.suppliedInputs ?? [],
      decisionBundles: request.decisionBundles ?? [],
    })
    : null;
  const readinessByKey = new Map<string, AppBuilderInputReadinessTargetRow>(
    inputReadiness?.targets.map((row) => [`${row.targetRef.kind}\0${row.targetRef.id}`, row]) ?? [],
  );
  return { inputReadiness, readinessByKey };
}

function styleDetailRowsFrame(
  selection: AppBuilderStyleDetailSelectionFrame,
  readiness: AppBuilderStyleDetailReadinessFrame,
): AppBuilderStyleDetailRowsFrame {
  return {
    stylingMechanismRows: selection.stylingMechanisms.map((stylingMechanism) =>
      stylingMechanismDetailRow(stylingMechanism, selection, readiness)
    ),
    visualPolicyRows: selection.visualPolicies.map((visualPolicy) =>
      visualPolicyDetailRow(visualPolicy, selection, readiness)
    ),
  };
}

function stylingMechanismDetailRow(
  stylingMechanism: AppBuilderStylingMechanismRow,
  selection: AppBuilderStyleDetailSelectionFrame,
  readiness: AppBuilderStyleDetailReadinessFrame,
): AppBuilderStylingMechanismDetailRow {
  const applicationPatterns = appBuilderApplicationPatternsForStylingMechanism(stylingMechanism);
  return {
    stylingMechanism,
    ...(selection.includeInputReadiness
      ? { inputReadiness: readiness.readinessByKey.get(readinessKey(AppBuilderOntologyRowKind.StylingMechanism, stylingMechanism.id)) }
      : {}),
    ...(selection.includeApplicationPatterns ? { applicationPatterns } : {}),
    ...(selection.includeCollectionConcepts
      ? {
        collectionConcepts: appBuilderCollectionConceptsForApplicationPatterns(applicationPatterns),
      }
      : {}),
    ...(selection.includeControlPatterns
      ? {
        controlPatterns: appBuilderControlPatternsForApplicationPatterns(applicationPatterns),
      }
      : {}),
    ...(selection.includeControlManifests
      ? {
        controlManifests: appBuilderControlManifestsForApplicationPatterns(applicationPatterns),
      }
      : {}),
    ...(selection.includeVisualPolicies
      ? {
        visualPolicies: appBuilderVisualPoliciesForApplicationPatterns(applicationPatterns),
      }
      : {}),
    ...(selection.includeAffordances
      ? {
        affordances: appBuilderAffordancesForApplicationPatterns(applicationPatterns),
      }
      : {}),
  };
}

function visualPolicyDetailRow(
  visualPolicy: AppBuilderVisualPolicyRow,
  selection: AppBuilderStyleDetailSelectionFrame,
  readiness: AppBuilderStyleDetailReadinessFrame,
): AppBuilderVisualPolicyDetailRow {
  const applicationPatterns = appBuilderApplicationPatternsForVisualPolicy(visualPolicy);
  const inputContractIds = appBuilderInputContractIdsForDependency(visualPolicy);
  return {
    visualPolicy,
    ...(selection.includeInputReadiness
      ? { inputReadiness: readiness.readinessByKey.get(readinessKey(AppBuilderOntologyRowKind.VisualPolicy, visualPolicy.id)) }
      : {}),
    ...(selection.includeInputContractDetail
      ? {
        inputContractDetails: inputContractIds.length === 0
          ? []
          : appBuilderInputContractDetail({
            inputContractIds,
            inputFacetSelections: appBuilderInputFacetSelectionsForDependency(visualPolicy),
            includePayloadSchemas: selection.includePayloadSchemas,
          }).rows,
      }
      : {}),
    ...(selection.includeApplicationPatterns ? { applicationPatterns } : {}),
    ...(selection.includeCollectionConcepts
      ? {
        collectionConcepts: appBuilderCollectionConceptsForApplicationPatterns(applicationPatterns),
      }
      : {}),
    ...(selection.includeControlPatterns
      ? {
        controlPatterns: appBuilderControlPatternsForApplicationPatterns(applicationPatterns),
      }
      : {}),
    ...(selection.includeControlManifests
      ? {
        controlManifests: appBuilderControlManifestsForApplicationPatterns(applicationPatterns),
      }
      : {}),
    ...(selection.includeStylingMechanisms
      ? {
        stylingMechanisms: appBuilderStylingMechanismsForApplicationPatterns(applicationPatterns),
      }
      : {}),
    ...(selection.includeAffordances
      ? {
        affordances: appBuilderAffordancesForApplicationPatterns(applicationPatterns),
      }
      : {}),
  };
}

function styleDetailSummaryFrame(
  rows: AppBuilderStyleDetailRowsFrame,
  readiness: AppBuilderStyleDetailReadinessFrame,
): AppBuilderStyleDetailSummaryFrame {
  const stylingMechanismRows = rows.stylingMechanismRows;
  const visualPolicyRows = rows.visualPolicyRows;
  const inputContractDetailCount = visualPolicyRows.reduce((sum, row) =>
    sum + (row.inputContractDetails?.length ?? 0), 0);
  const applicationPatternCount = stylingMechanismRows.reduce((sum, row) =>
    sum + (row.applicationPatterns?.length ?? 0), 0)
    + visualPolicyRows.reduce((sum, row) => sum + (row.applicationPatterns?.length ?? 0), 0);
  const collectionConceptCount = stylingMechanismRows.reduce((sum, row) =>
    sum + (row.collectionConcepts?.length ?? 0), 0)
    + visualPolicyRows.reduce((sum, row) => sum + (row.collectionConcepts?.length ?? 0), 0);
  const controlPatternCount = stylingMechanismRows.reduce((sum, row) =>
    sum + (row.controlPatterns?.length ?? 0), 0)
    + visualPolicyRows.reduce((sum, row) => sum + (row.controlPatterns?.length ?? 0), 0);
  const controlManifestCount = stylingMechanismRows.reduce((sum, row) =>
    sum + (row.controlManifests?.length ?? 0), 0)
    + visualPolicyRows.reduce((sum, row) => sum + (row.controlManifests?.length ?? 0), 0);
  const stylingMechanismCount = visualPolicyRows.reduce((sum, row) =>
    sum + (row.stylingMechanisms?.length ?? 0), 0);
  const visualPolicyCount = stylingMechanismRows.reduce((sum, row) =>
    sum + (row.visualPolicies?.length ?? 0), 0);
  const affordanceCount = stylingMechanismRows.reduce((sum, row) =>
    sum + (row.affordances?.length ?? 0), 0)
    + visualPolicyRows.reduce((sum, row) => sum + (row.affordances?.length ?? 0), 0);
  return {
    inputContractDetailCount,
    applicationPatternCount,
    collectionConceptCount,
    controlPatternCount,
    controlManifestCount,
    stylingMechanismCount,
    visualPolicyCount,
    affordanceCount,
    issueCount: readiness.inputReadiness?.issues.length ?? 0,
  };
}

function styleDetailDisplayText(
  rows: AppBuilderStyleDetailRowsFrame,
  selection: AppBuilderStyleDetailSelectionFrame,
  summary: AppBuilderStyleDetailSummaryFrame,
): string {
  return `App-builder style detail: ${rows.stylingMechanismRows.length} styling mechanism(s), ${rows.visualPolicyRows.length} visual polic${rows.visualPolicyRows.length === 1 ? 'y' : 'ies'}, inputReadiness=${selection.includeInputReadiness}, inputContractDetails=${summary.inputContractDetailCount}, applicationPatterns=${summary.applicationPatternCount}, collectionConcepts=${summary.collectionConceptCount}, controlPatterns=${summary.controlPatternCount}, controlManifests=${summary.controlManifestCount}, stylingMechanisms=${summary.stylingMechanismCount}, visualPolicies=${summary.visualPolicyCount}, affordances=${summary.affordanceCount}, issues=${summary.issueCount}.`;
}

function readinessKey(
  kind: AppBuilderOntologyRowKind,
  id: string,
): string {
  return `${kind}\0${id}`;
}
