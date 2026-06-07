import type { AppBuilderAffordanceRow } from './affordance.js';
import type { AppBuilderApplicationPatternRow } from './application-pattern.js';
import type { AppBuilderEffectContractRow } from './effect.js';
import type { AppBuilderControlDescriptor } from '../control-catalog.js';
import {
  APP_BUILDER_CONTROL_MANIFEST_FIELD_DESCRIPTOR_ROWS,
  type AppBuilderControlManifestFieldDescriptorRow,
} from './control-manifest-field.js';
import {
  APP_BUILDER_CONTROL_MANIFEST_ROWS,
  AppBuilderControlManifestRowId,
  type AppBuilderControlManifestRow,
  type AppBuilderControlPatternRow,
  type AppBuilderControlRealizationPolicyRow,
} from './control.js';
import {
  appBuilderAffordancesForApplicationPatterns,
  appBuilderApplicationPatternsForControlManifest,
  appBuilderControlDescriptorsForControlPatterns,
  appBuilderDirectEffectContractsForControlManifests,
  appBuilderControlPatternsForApplicationPatterns,
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

/** Detail request for selected app-builder control/component manifest rows. */
export interface AppBuilderControlManifestDetailRequest {
  /** Include only these control manifest rows; omitted returns compact base rows unless a detail include flag is true. */
  readonly controlManifestIds?: readonly AppBuilderControlManifestRowId[] | null;
  /** Input markers already supplied by caller, AI, app facts, policy, or public presets. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles expanded into supplied input markers before readiness is evaluated. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Include full input-readiness rows for each control manifest; defaults to true only for selected manifests. */
  readonly includeInputReadiness?: boolean | null;
  /** Include input contract payload/detail rows for each control manifest; defaults to true only for selected manifests. */
  readonly includeInputContractDetail?: boolean | null;
  /** Include concrete payload schemas in input contract detail rows; defaults to true only for selected manifests. */
  readonly includePayloadSchemas?: boolean | null;
  /** Include application patterns that coordinate each control manifest; defaults to true only for selected manifests. */
  readonly includeApplicationPatterns?: boolean | null;
  /** Include control patterns coordinated through those application patterns; defaults to true only for selected manifests. */
  readonly includeControlPatterns?: boolean | null;
  /** Include concrete native leaf-control descriptors from coordinated control patterns; defaults to true only for selected manifests. */
  readonly includeControlDescriptors?: boolean | null;
  /** Include source-realization policy rows from coordinated control patterns; defaults to true only for selected manifests. */
  readonly includeRealizationPolicies?: boolean | null;
  /** Include manifest field descriptor rows for selected manifest rows; defaults to true only for selected manifests. */
  readonly includeManifestFieldDescriptors?: boolean | null;
  /** Include effect contracts associated with selected manifest rows; defaults to true only for selected manifests. */
  readonly includeEffectContracts?: boolean | null;
  /** Include styling mechanism rows coordinated through those application patterns; defaults to true only for selected manifests. */
  readonly includeStylingMechanisms?: boolean | null;
  /** Include visual policy rows coordinated through those application patterns; defaults to true only for selected manifests. */
  readonly includeVisualPolicies?: boolean | null;
  /** Include affordance rows associated with those application patterns; defaults to true only for selected manifests. */
  readonly includeAffordances?: boolean | null;
}

/** Read-only detail row for one control/component manifest contract row. */
export interface AppBuilderControlManifestDetailRow {
  /** Selected control/component manifest row. */
  readonly controlManifest: AppBuilderControlManifestRow;
  /** Input readiness for this manifest row when requested. */
  readonly inputReadiness?: AppBuilderInputReadinessTargetRow;
  /** Payload/schema detail for this manifest row's input contracts when requested. */
  readonly inputContractDetails?: readonly AppBuilderInputContractDetailRow[];
  /** Application patterns that coordinate this manifest row when requested. */
  readonly applicationPatterns?: readonly AppBuilderApplicationPatternRow[];
  /** Control patterns coordinated through those application patterns when requested. */
  readonly controlPatterns?: readonly AppBuilderControlPatternRow[];
  /** Concrete native leaf-control descriptors from coordinated control patterns when requested. */
  readonly controlDescriptors?: readonly AppBuilderControlDescriptor[];
  /** Source-realization policy rows from coordinated control patterns when requested. */
  readonly realizationPolicies?: readonly AppBuilderControlRealizationPolicyRow[];
  /** Canonical field descriptors for this manifest row when requested. */
  readonly manifestFieldDescriptors?: readonly AppBuilderControlManifestFieldDescriptorRow[];
  /** Effect contracts associated with this manifest row when requested. */
  readonly effectContracts?: readonly AppBuilderEffectContractRow[];
  /** Styling mechanisms coordinated by those application patterns when requested. */
  readonly stylingMechanisms?: readonly AppBuilderStylingMechanismRow[];
  /** Visual policies coordinated by those application patterns when requested. */
  readonly visualPolicies?: readonly AppBuilderVisualPolicyRow[];
  /** App-building moves associated with those application patterns when requested. */
  readonly affordances?: readonly AppBuilderAffordanceRow[];
}

/** Read-only selected-manifest detail for AI workflow negotiation. */
export interface AppBuilderControlManifestDetail {
  /** Compact display text suitable for MCP/IDE answer envelopes. */
  readonly displayText: string;
  /** Selected control/component manifest detail rows. */
  readonly rows: readonly AppBuilderControlManifestDetailRow[];
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
  /** Whether coordinated control pattern rows were included. */
  readonly controlPatternsIncluded: boolean;
  /** Whether concrete native leaf-control descriptors were included. */
  readonly controlDescriptorsIncluded: boolean;
  /** Whether source-realization policy rows were included. */
  readonly realizationPoliciesIncluded: boolean;
  /** Whether manifest field descriptor rows were included. */
  readonly manifestFieldDescriptorsIncluded: boolean;
  /** Whether associated effect contract rows were included. */
  readonly effectContractsIncluded: boolean;
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

/** Selection and include flags for one control-manifest detail projection. */
interface AppBuilderControlManifestDetailSelectionFrame {
  /** Selected control/component manifest rows after id filtering. */
  readonly controlManifests: readonly AppBuilderControlManifestRow[];
  /** Whether input-readiness rows should be included. */
  readonly includeInputReadiness: boolean;
  /** Whether manifest input contract details should be included. */
  readonly includeInputContractDetail: boolean;
  /** Whether payload schemas should be included in input contract details. */
  readonly includePayloadSchemas: boolean;
  /** Whether coordinating application patterns should be included. */
  readonly includeApplicationPatterns: boolean;
  /** Whether coordinated control patterns should be included. */
  readonly includeControlPatterns: boolean;
  /** Whether concrete native leaf-control descriptors should be included. */
  readonly includeControlDescriptors: boolean;
  /** Whether source-realization policy rows should be included. */
  readonly includeRealizationPolicies: boolean;
  /** Whether manifest field descriptor rows should be included. */
  readonly includeManifestFieldDescriptors: boolean;
  /** Whether direct manifest-witness effect contracts should be included. */
  readonly includeEffectContracts: boolean;
  /** Whether coordinated styling mechanisms should be included. */
  readonly includeStylingMechanisms: boolean;
  /** Whether coordinated visual policies should be included. */
  readonly includeVisualPolicies: boolean;
  /** Whether associated affordances should be included. */
  readonly includeAffordances: boolean;
}

/** Input-readiness lookup frame for selected control manifest targets. */
interface AppBuilderControlManifestDetailReadinessFrame {
  /** Readiness result when requested. */
  readonly inputReadiness: AppBuilderInputReadinessResult | null;
  /** Readiness rows keyed by control manifest id. */
  readonly readinessByControlManifestId: ReadonlyMap<string, AppBuilderInputReadinessTargetRow>;
}

/** Rendered control-manifest rows before summary counts are computed. */
interface AppBuilderControlManifestDetailRowsFrame {
  /** Selected control/component manifest detail rows. */
  readonly rows: readonly AppBuilderControlManifestDetailRow[];
}

/** Count summary for the control-manifest detail answer display text. */
interface AppBuilderControlManifestDetailSummaryFrame {
  readonly inputContractDetailCount: number;
  readonly applicationPatternCount: number;
  readonly controlPatternCount: number;
  readonly controlDescriptorCount: number;
  readonly realizationPolicyCount: number;
  readonly manifestFieldDescriptorCount: number;
  readonly effectContractCount: number;
  readonly stylingMechanismCount: number;
  readonly visualPolicyCount: number;
  readonly affordanceCount: number;
  readonly issueCount: number;
}

/** Return selected control/component manifests joined to readiness, input detail, coordinating patterns, and style facts. */
export function appBuilderControlManifestDetail(
  request: AppBuilderControlManifestDetailRequest = {},
): AppBuilderControlManifestDetail {
  const selection = controlManifestDetailSelectionFrame(request);
  const readiness = controlManifestDetailReadinessFrame(selection, request);
  const rowFrame = controlManifestDetailRowsFrame(selection, readiness);
  const summary = controlManifestDetailSummaryFrame(rowFrame, readiness);
  const inputCounts = appBuilderDecisionBundleInputCounts(request.suppliedInputs, request.decisionBundles);
  return {
    rows: rowFrame.rows,
    issues: readiness.inputReadiness?.issues ?? [],
    inputReadinessIncluded: selection.includeInputReadiness,
    inputContractDetailIncluded: selection.includeInputContractDetail,
    payloadSchemasIncluded: selection.includePayloadSchemas,
    applicationPatternsIncluded: selection.includeApplicationPatterns,
    controlPatternsIncluded: selection.includeControlPatterns,
    controlDescriptorsIncluded: selection.includeControlDescriptors,
    realizationPoliciesIncluded: selection.includeRealizationPolicies,
    manifestFieldDescriptorsIncluded: selection.includeManifestFieldDescriptors,
    effectContractsIncluded: selection.includeEffectContracts,
    stylingMechanismsIncluded: selection.includeStylingMechanisms,
    visualPoliciesIncluded: selection.includeVisualPolicies,
    affordancesIncluded: selection.includeAffordances,
    ...inputCounts,
    displayText: controlManifestDetailDisplayText(rowFrame, selection, summary),
  };
}

function controlManifestDetailSelectionFrame(
  request: AppBuilderControlManifestDetailRequest,
): AppBuilderControlManifestDetailSelectionFrame {
  const hasExplicitSelection = appBuilderHasExplicitSelection(request.controlManifestIds);
  const includeInputReadiness = appBuilderIncludeDetail(request.includeInputReadiness, hasExplicitSelection);
  const includeInputContractDetail = appBuilderIncludeDetail(request.includeInputContractDetail, hasExplicitSelection);
  const includePayloadSchemas = appBuilderIncludeDetail(request.includePayloadSchemas, hasExplicitSelection);
  const includeApplicationPatterns = appBuilderIncludeDetail(request.includeApplicationPatterns, hasExplicitSelection);
  const includeControlPatterns = appBuilderIncludeDetail(request.includeControlPatterns, hasExplicitSelection);
  const includeControlDescriptors = appBuilderIncludeDetail(request.includeControlDescriptors, hasExplicitSelection);
  const includeRealizationPolicies = appBuilderIncludeDetail(request.includeRealizationPolicies, hasExplicitSelection);
  const includeManifestFieldDescriptors = appBuilderIncludeDetail(
    request.includeManifestFieldDescriptors,
    hasExplicitSelection,
  );
  const includeEffectContracts = appBuilderIncludeDetail(request.includeEffectContracts, hasExplicitSelection);
  const includeStylingMechanisms = appBuilderIncludeDetail(request.includeStylingMechanisms, hasExplicitSelection);
  const includeVisualPolicies = appBuilderIncludeDetail(request.includeVisualPolicies, hasExplicitSelection);
  const includeAffordances = appBuilderIncludeDetail(request.includeAffordances, hasExplicitSelection);
  const controlManifestIds = request.controlManifestIds == null || request.controlManifestIds.length === 0
    ? null
    : new Set(request.controlManifestIds);
  const controlManifests = APP_BUILDER_CONTROL_MANIFEST_ROWS.filter((row) =>
    controlManifestIds == null || controlManifestIds.has(row.id)
  );
  return {
    controlManifests,
    includeInputReadiness,
    includeInputContractDetail,
    includePayloadSchemas,
    includeApplicationPatterns,
    includeControlPatterns,
    includeControlDescriptors,
    includeRealizationPolicies,
    includeManifestFieldDescriptors,
    includeEffectContracts,
    includeStylingMechanisms,
    includeVisualPolicies,
    includeAffordances,
  };
}

function controlManifestDetailReadinessFrame(
  selection: AppBuilderControlManifestDetailSelectionFrame,
  request: AppBuilderControlManifestDetailRequest,
): AppBuilderControlManifestDetailReadinessFrame {
  const inputReadiness = selection.includeInputReadiness
    ? appBuilderInputReadiness({
      targetRefs: selection.controlManifests.map((row) => appBuilderOntologyRowRef(
        AppBuilderOntologyRowKind.ControlManifest,
        row.id,
      )),
      suppliedInputs: request.suppliedInputs ?? [],
      decisionBundles: request.decisionBundles ?? [],
    })
    : null;
  const readinessByControlManifestId = new Map(
    inputReadiness?.targets.map((row) => [row.targetRef.id, row]) ?? [],
  );
  return { inputReadiness, readinessByControlManifestId };
}

function controlManifestDetailRowsFrame(
  selection: AppBuilderControlManifestDetailSelectionFrame,
  readiness: AppBuilderControlManifestDetailReadinessFrame,
): AppBuilderControlManifestDetailRowsFrame {
  return {
    rows: selection.controlManifests.map((controlManifest) =>
      controlManifestDetailRow(controlManifest, selection, readiness)
    ),
  };
}

function controlManifestDetailRow(
  controlManifest: AppBuilderControlManifestRow,
  selection: AppBuilderControlManifestDetailSelectionFrame,
  readiness: AppBuilderControlManifestDetailReadinessFrame,
): AppBuilderControlManifestDetailRow {
  const applicationPatterns = appBuilderApplicationPatternsForControlManifest(controlManifest);
  const controlPatterns = appBuilderControlPatternsForApplicationPatterns(applicationPatterns);
  return {
    controlManifest,
    ...(selection.includeInputReadiness
      ? { inputReadiness: readiness.readinessByControlManifestId.get(controlManifest.id) }
      : {}),
    ...(selection.includeInputContractDetail
      ? { inputContractDetails: inputContractDetailsForControlManifest(controlManifest, selection) }
      : {}),
    ...(selection.includeApplicationPatterns ? { applicationPatterns } : {}),
    ...(selection.includeControlPatterns ? { controlPatterns } : {}),
    ...(selection.includeControlDescriptors
      ? {
        controlDescriptors: appBuilderControlDescriptorsForControlPatterns(controlPatterns),
      }
      : {}),
    ...(selection.includeRealizationPolicies
      ? {
        realizationPolicies: appBuilderControlRealizationPoliciesForControlPatterns(controlPatterns),
      }
      : {}),
    ...(selection.includeManifestFieldDescriptors
      ? {
        manifestFieldDescriptors: APP_BUILDER_CONTROL_MANIFEST_FIELD_DESCRIPTOR_ROWS.filter((row) =>
          row.manifestRowId === controlManifest.id
        ),
      }
      : {}),
    ...(selection.includeEffectContracts
      ? {
        effectContracts: appBuilderDirectEffectContractsForControlManifests([controlManifest]),
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

function inputContractDetailsForControlManifest(
  controlManifest: AppBuilderControlManifestRow,
  selection: AppBuilderControlManifestDetailSelectionFrame,
): readonly AppBuilderInputContractDetailRow[] {
  const inputContractIds = appBuilderInputContractIdsForDependency(controlManifest);
  if (inputContractIds.length === 0) {
    return [];
  }
  return appBuilderInputContractDetail({
    inputContractIds,
    inputFacetSelections: appBuilderInputFacetSelectionsForDependency(controlManifest),
    includePayloadSchemas: selection.includePayloadSchemas,
  }).rows;
}

function controlManifestDetailSummaryFrame(
  rowFrame: AppBuilderControlManifestDetailRowsFrame,
  readiness: AppBuilderControlManifestDetailReadinessFrame,
): AppBuilderControlManifestDetailSummaryFrame {
  const rows = rowFrame.rows;
  return {
    inputContractDetailCount: rows.reduce((sum, row) =>
      sum + (row.inputContractDetails?.length ?? 0), 0),
    applicationPatternCount: rows.reduce((sum, row) =>
      sum + (row.applicationPatterns?.length ?? 0), 0),
    controlPatternCount: rows.reduce((sum, row) =>
      sum + (row.controlPatterns?.length ?? 0), 0),
    controlDescriptorCount: rows.reduce((sum, row) =>
      sum + (row.controlDescriptors?.length ?? 0), 0),
    realizationPolicyCount: rows.reduce((sum, row) =>
      sum + (row.realizationPolicies?.length ?? 0), 0),
    manifestFieldDescriptorCount: rows.reduce((sum, row) =>
      sum + (row.manifestFieldDescriptors?.length ?? 0), 0),
    effectContractCount: rows.reduce((sum, row) =>
      sum + (row.effectContracts?.length ?? 0), 0),
    stylingMechanismCount: rows.reduce((sum, row) =>
      sum + (row.stylingMechanisms?.length ?? 0), 0),
    visualPolicyCount: rows.reduce((sum, row) =>
      sum + (row.visualPolicies?.length ?? 0), 0),
    affordanceCount: rows.reduce((sum, row) =>
      sum + (row.affordances?.length ?? 0), 0),
    issueCount: readiness.inputReadiness?.issues.length ?? 0,
  };
}

function controlManifestDetailDisplayText(
  rowFrame: AppBuilderControlManifestDetailRowsFrame,
  selection: AppBuilderControlManifestDetailSelectionFrame,
  summary: AppBuilderControlManifestDetailSummaryFrame,
): string {
  return `App-builder control manifest detail: ${rowFrame.rows.length} control manifest row(s), inputReadiness=${selection.includeInputReadiness}, inputContractDetails=${summary.inputContractDetailCount}, applicationPatterns=${summary.applicationPatternCount}, controlPatterns=${summary.controlPatternCount}, controlDescriptors=${summary.controlDescriptorCount}, realizationPolicies=${summary.realizationPolicyCount}, manifestFieldDescriptors=${summary.manifestFieldDescriptorCount}, effectContracts=${summary.effectContractCount}, stylingMechanisms=${summary.stylingMechanismCount}, visualPolicies=${summary.visualPolicyCount}, affordances=${summary.affordanceCount}, issues=${summary.issueCount}.`;
}
