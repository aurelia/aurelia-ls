import type { AppBuilderAffordanceRow } from './affordance.js';
import type { AppBuilderControlDescriptor } from '../control-catalog.js';
import type { AppBuilderApplicationPatternRow } from './application-pattern.js';
import {
  APP_BUILDER_CONTROL_PATTERN_ROWS,
  AppBuilderControlRealizationPolicyId,
  AppBuilderControlPatternId,
  type AppBuilderControlManifestRow,
  type AppBuilderControlPatternRow,
  type AppBuilderControlRealizationPolicyRow,
} from './control.js';
import {
  appBuilderAffordancesForApplicationPatterns,
  appBuilderApplicationPatternsForControlPattern,
  appBuilderControlDescriptorsForControlPatterns,
  appBuilderControlManifestsForApplicationPatterns,
  appBuilderControlRealizationPoliciesForControlPatterns,
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

/** Detail request for selected app-builder control patterns. */
export interface AppBuilderControlPatternDetailRequest {
  /** Include only these control patterns; omitted returns compact base rows unless a detail include flag is true. */
  readonly controlPatternIds?: readonly AppBuilderControlPatternId[] | null;
  /** Include control patterns that can use these realization policies; omitted does not filter by realization. */
  readonly controlRealizationPolicyIds?: readonly AppBuilderControlRealizationPolicyId[] | null;
  /** Input markers already supplied by caller, AI, app facts, policy, or public presets. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles expanded into supplied input markers before readiness is evaluated. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Include full input-readiness rows for each control pattern; defaults to true only for selected/filtered controls. */
  readonly includeInputReadiness?: boolean | null;
  /** Include input contract payload/detail rows for each control pattern; defaults to true only for selected/filtered controls. */
  readonly includeInputContractDetail?: boolean | null;
  /** Include concrete payload schemas in input contract detail rows; defaults to true only for selected/filtered controls. */
  readonly includePayloadSchemas?: boolean | null;
  /** Include application patterns that coordinate each control pattern; defaults to true only for selected/filtered controls. */
  readonly includeApplicationPatterns?: boolean | null;
  /** Include concrete native leaf-control descriptors coordinated by each control pattern; defaults to true only for selected/filtered controls. */
  readonly includeControlDescriptors?: boolean | null;
  /** Include source-realization policy rows coordinated by each control pattern; defaults to true only for selected/filtered controls. */
  readonly includeRealizationPolicies?: boolean | null;
  /** Include control/component manifest rows coordinated through those application patterns; defaults to true only for selected/filtered controls. */
  readonly includeControlManifests?: boolean | null;
  /** Include styling mechanism rows coordinated through those application patterns; defaults to true only for selected/filtered controls. */
  readonly includeStylingMechanisms?: boolean | null;
  /** Include visual policy rows coordinated through those application patterns; defaults to true only for selected/filtered controls. */
  readonly includeVisualPolicies?: boolean | null;
  /** Include affordance rows associated with those application patterns; defaults to true only for selected/filtered controls. */
  readonly includeAffordances?: boolean | null;
}

/** Read-only detail row for one native-first or deferred rich control pattern. */
export interface AppBuilderControlPatternDetailRow {
  /** Selected control pattern row. */
  readonly controlPattern: AppBuilderControlPatternRow;
  /** Input readiness for this control pattern when requested. */
  readonly inputReadiness?: AppBuilderInputReadinessTargetRow;
  /** Payload/schema detail for this control pattern's input contracts when requested. */
  readonly inputContractDetails?: readonly AppBuilderInputContractDetailRow[];
  /** Application patterns that coordinate this control pattern when requested. */
  readonly applicationPatterns?: readonly AppBuilderApplicationPatternRow[];
  /** Concrete native leaf-control descriptors coordinated by this control pattern when requested. */
  readonly controlDescriptors?: readonly AppBuilderControlDescriptor[];
  /** Source-realization policies coordinated by this control pattern when requested. */
  readonly realizationPolicies?: readonly AppBuilderControlRealizationPolicyRow[];
  /** Control/component manifest rows coordinated by those application patterns when requested. */
  readonly controlManifests?: readonly AppBuilderControlManifestRow[];
  /** Styling mechanisms coordinated by those application patterns when requested. */
  readonly stylingMechanisms?: readonly AppBuilderStylingMechanismRow[];
  /** Visual policies coordinated by those application patterns when requested. */
  readonly visualPolicies?: readonly AppBuilderVisualPolicyRow[];
  /** App-building moves associated with those application patterns when requested. */
  readonly affordances?: readonly AppBuilderAffordanceRow[];
}

/** Read-only selected-control detail for AI workflow negotiation. */
export interface AppBuilderControlPatternDetail {
  /** Compact display text suitable for MCP/IDE answer envelopes. */
  readonly displayText: string;
  /** Selected control pattern detail rows. */
  readonly rows: readonly AppBuilderControlPatternDetailRow[];
  /** Issues found while projecting supplied-input readiness. */
  readonly issues: readonly AppBuilderInputReadinessIssue[];
  /** Whether input-readiness rows were included. */
  readonly inputReadinessIncluded: boolean;
  /** Whether input contract detail rows were included. */
  readonly inputContractDetailIncluded: boolean;
  /** Whether modeled payload schemas were included inside input contract detail rows. */
  readonly payloadSchemasIncluded: boolean;
  /** Whether associated application pattern rows were included. */
  readonly applicationPatternsIncluded: boolean;
  /** Whether concrete native leaf-control descriptors were included. */
  readonly controlDescriptorsIncluded: boolean;
  /** Whether source-realization policy rows were included. */
  readonly realizationPoliciesIncluded: boolean;
  /** Whether coordinated control/component manifest rows were included. */
  readonly controlManifestsIncluded: boolean;
  /** Whether coordinated styling mechanism rows were included. */
  readonly stylingMechanismsIncluded: boolean;
  /** Whether coordinated visual policy rows were included. */
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

/** Selection and include flags for one control-pattern detail projection. */
interface AppBuilderControlPatternDetailSelectionFrame {
  /** Selected control patterns after id and realization-policy filtering. */
  readonly controlPatterns: readonly AppBuilderControlPatternRow[];
  /** Whether input-readiness rows should be included. */
  readonly includeInputReadiness: boolean;
  /** Whether input contract details should be included. */
  readonly includeInputContractDetail: boolean;
  /** Whether payload schemas should be included in input contract detail. */
  readonly includePayloadSchemas: boolean;
  /** Whether coordinating application patterns should be included. */
  readonly includeApplicationPatterns: boolean;
  /** Whether concrete native leaf-control descriptors should be included. */
  readonly includeControlDescriptors: boolean;
  /** Whether source-realization policy rows should be included. */
  readonly includeRealizationPolicies: boolean;
  /** Whether coordinated control/component manifest rows should be included. */
  readonly includeControlManifests: boolean;
  /** Whether coordinated styling mechanisms should be included. */
  readonly includeStylingMechanisms: boolean;
  /** Whether coordinated visual policies should be included. */
  readonly includeVisualPolicies: boolean;
  /** Whether associated affordance rows should be included. */
  readonly includeAffordances: boolean;
}

/** Input-readiness lookup frame for selected control-pattern targets. */
interface AppBuilderControlPatternDetailReadinessFrame {
  /** Readiness result when requested. */
  readonly inputReadiness: AppBuilderInputReadinessResult | null;
  /** Readiness rows keyed by control pattern id. */
  readonly readinessByControlPatternId: ReadonlyMap<string, AppBuilderInputReadinessTargetRow>;
}

/** Rendered control-pattern rows before summary counts are computed. */
interface AppBuilderControlPatternDetailRowsFrame {
  /** Selected control-pattern detail rows. */
  readonly rows: readonly AppBuilderControlPatternDetailRow[];
}

/** Count summary for the control-pattern detail answer display text. */
interface AppBuilderControlPatternDetailSummaryFrame {
  readonly inputContractDetailCount: number;
  readonly applicationPatternCount: number;
  readonly controlDescriptorCount: number;
  readonly realizationPolicyCount: number;
  readonly controlManifestCount: number;
  readonly stylingMechanismCount: number;
  readonly visualPolicyCount: number;
  readonly affordanceCount: number;
  readonly issueCount: number;
}

/** Return selected control patterns joined to readiness, input detail, coordinating patterns, and manifest/style facts. */
export function appBuilderControlPatternDetail(
  request: AppBuilderControlPatternDetailRequest = {},
): AppBuilderControlPatternDetail {
  const selection = controlPatternDetailSelectionFrame(request);
  const readiness = controlPatternDetailReadinessFrame(selection, request);
  const rowFrame = controlPatternDetailRowsFrame(selection, readiness);
  const summary = controlPatternDetailSummaryFrame(rowFrame, readiness);
  const inputCounts = appBuilderDecisionBundleInputCounts(request.suppliedInputs, request.decisionBundles);
  return {
    rows: rowFrame.rows,
    issues: readiness.inputReadiness?.issues ?? [],
    inputReadinessIncluded: selection.includeInputReadiness,
    inputContractDetailIncluded: selection.includeInputContractDetail,
    payloadSchemasIncluded: selection.includePayloadSchemas,
    applicationPatternsIncluded: selection.includeApplicationPatterns,
    controlDescriptorsIncluded: selection.includeControlDescriptors,
    realizationPoliciesIncluded: selection.includeRealizationPolicies,
    controlManifestsIncluded: selection.includeControlManifests,
    stylingMechanismsIncluded: selection.includeStylingMechanisms,
    visualPoliciesIncluded: selection.includeVisualPolicies,
    affordancesIncluded: selection.includeAffordances,
    ...inputCounts,
    displayText: controlPatternDetailDisplayText(rowFrame, selection, summary),
  };
}

function controlPatternDetailSelectionFrame(
  request: AppBuilderControlPatternDetailRequest,
): AppBuilderControlPatternDetailSelectionFrame {
  const hasExplicitSelection = appBuilderHasExplicitSelection(
    request.controlPatternIds,
    request.controlRealizationPolicyIds,
  );
  const includeInputReadiness = appBuilderIncludeDetail(request.includeInputReadiness, hasExplicitSelection);
  const includeInputContractDetail = appBuilderIncludeDetail(request.includeInputContractDetail, hasExplicitSelection);
  const includePayloadSchemas = appBuilderIncludeDetail(request.includePayloadSchemas, hasExplicitSelection);
  const includeApplicationPatterns = appBuilderIncludeDetail(request.includeApplicationPatterns, hasExplicitSelection);
  const includeControlDescriptors = appBuilderIncludeDetail(request.includeControlDescriptors, hasExplicitSelection);
  const includeRealizationPolicies = appBuilderIncludeDetail(request.includeRealizationPolicies, hasExplicitSelection);
  const includeControlManifests = appBuilderIncludeDetail(request.includeControlManifests, hasExplicitSelection);
  const includeStylingMechanisms = appBuilderIncludeDetail(request.includeStylingMechanisms, hasExplicitSelection);
  const includeVisualPolicies = appBuilderIncludeDetail(request.includeVisualPolicies, hasExplicitSelection);
  const includeAffordances = appBuilderIncludeDetail(request.includeAffordances, hasExplicitSelection);
  const controlPatternIds = request.controlPatternIds == null || request.controlPatternIds.length === 0
    ? null
    : new Set(request.controlPatternIds);
  const controlRealizationPolicyIds = request.controlRealizationPolicyIds == null || request.controlRealizationPolicyIds.length === 0
    ? null
    : new Set(request.controlRealizationPolicyIds);
  const controlPatterns = APP_BUILDER_CONTROL_PATTERN_ROWS.filter((row) =>
    (controlPatternIds == null || controlPatternIds.has(row.id))
    && (controlRealizationPolicyIds == null || row.realizationPolicyIds.some((id) => controlRealizationPolicyIds.has(id)))
  );
  return {
    controlPatterns,
    includeInputReadiness,
    includeInputContractDetail,
    includePayloadSchemas,
    includeApplicationPatterns,
    includeControlDescriptors,
    includeRealizationPolicies,
    includeControlManifests,
    includeStylingMechanisms,
    includeVisualPolicies,
    includeAffordances,
  };
}

function controlPatternDetailReadinessFrame(
  selection: AppBuilderControlPatternDetailSelectionFrame,
  request: AppBuilderControlPatternDetailRequest,
): AppBuilderControlPatternDetailReadinessFrame {
  const inputReadiness = selection.includeInputReadiness
    ? appBuilderInputReadiness({
      targetRefs: selection.controlPatterns.map((row) => appBuilderOntologyRowRef(
        AppBuilderOntologyRowKind.ControlPattern,
        row.id,
      )),
      suppliedInputs: request.suppliedInputs ?? [],
      decisionBundles: request.decisionBundles ?? [],
    })
    : null;
  const readinessByControlPatternId = new Map(
    inputReadiness?.targets.map((row) => [row.targetRef.id, row]) ?? [],
  );
  return { inputReadiness, readinessByControlPatternId };
}

function controlPatternDetailRowsFrame(
  selection: AppBuilderControlPatternDetailSelectionFrame,
  readiness: AppBuilderControlPatternDetailReadinessFrame,
): AppBuilderControlPatternDetailRowsFrame {
  return {
    rows: selection.controlPatterns.map((controlPattern) =>
      controlPatternDetailRow(controlPattern, selection, readiness)
    ),
  };
}

function controlPatternDetailRow(
  controlPattern: AppBuilderControlPatternRow,
  selection: AppBuilderControlPatternDetailSelectionFrame,
  readiness: AppBuilderControlPatternDetailReadinessFrame,
): AppBuilderControlPatternDetailRow {
  const applicationPatterns = appBuilderApplicationPatternsForControlPattern(controlPattern);
  return {
    controlPattern,
    ...(selection.includeInputReadiness
      ? { inputReadiness: readiness.readinessByControlPatternId.get(controlPattern.id) }
      : {}),
    ...(selection.includeInputContractDetail
      ? { inputContractDetails: inputContractDetailsForControlPattern(controlPattern, selection) }
      : {}),
    ...(selection.includeApplicationPatterns ? { applicationPatterns } : {}),
    ...(selection.includeControlDescriptors
      ? {
        controlDescriptors: appBuilderControlDescriptorsForControlPatterns([controlPattern]),
      }
      : {}),
    ...(selection.includeRealizationPolicies
      ? {
        realizationPolicies: appBuilderControlRealizationPoliciesForControlPatterns([controlPattern]),
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

function inputContractDetailsForControlPattern(
  controlPattern: AppBuilderControlPatternRow,
  selection: AppBuilderControlPatternDetailSelectionFrame,
): readonly AppBuilderInputContractDetailRow[] {
  const inputContractIds = appBuilderInputContractIdsForDependency(controlPattern);
  if (inputContractIds.length === 0) {
    return [];
  }
  return appBuilderInputContractDetail({
    inputContractIds,
    inputFacetSelections: appBuilderInputFacetSelectionsForDependency(controlPattern),
    includePayloadSchemas: selection.includePayloadSchemas,
  }).rows;
}

function controlPatternDetailSummaryFrame(
  rowFrame: AppBuilderControlPatternDetailRowsFrame,
  readiness: AppBuilderControlPatternDetailReadinessFrame,
): AppBuilderControlPatternDetailSummaryFrame {
  const rows = rowFrame.rows;
  return {
    inputContractDetailCount: rows.reduce((sum, row) =>
      sum + (row.inputContractDetails?.length ?? 0), 0),
    applicationPatternCount: rows.reduce((sum, row) =>
      sum + (row.applicationPatterns?.length ?? 0), 0),
    controlDescriptorCount: rows.reduce((sum, row) =>
      sum + (row.controlDescriptors?.length ?? 0), 0),
    realizationPolicyCount: rows.reduce((sum, row) =>
      sum + (row.realizationPolicies?.length ?? 0), 0),
    controlManifestCount: rows.reduce((sum, row) =>
      sum + (row.controlManifests?.length ?? 0), 0),
    stylingMechanismCount: rows.reduce((sum, row) =>
      sum + (row.stylingMechanisms?.length ?? 0), 0),
    visualPolicyCount: rows.reduce((sum, row) =>
      sum + (row.visualPolicies?.length ?? 0), 0),
    affordanceCount: rows.reduce((sum, row) =>
      sum + (row.affordances?.length ?? 0), 0),
    issueCount: readiness.inputReadiness?.issues.length ?? 0,
  };
}

function controlPatternDetailDisplayText(
  rowFrame: AppBuilderControlPatternDetailRowsFrame,
  selection: AppBuilderControlPatternDetailSelectionFrame,
  summary: AppBuilderControlPatternDetailSummaryFrame,
): string {
  return `App-builder control pattern detail: ${rowFrame.rows.length} control pattern(s), inputReadiness=${selection.includeInputReadiness}, inputContractDetails=${summary.inputContractDetailCount}, applicationPatterns=${summary.applicationPatternCount}, controlDescriptors=${summary.controlDescriptorCount}, realizationPolicies=${summary.realizationPolicyCount}, controlManifests=${summary.controlManifestCount}, stylingMechanisms=${summary.stylingMechanismCount}, visualPolicies=${summary.visualPolicyCount}, affordances=${summary.affordanceCount}, issues=${summary.issueCount}.`;
}
