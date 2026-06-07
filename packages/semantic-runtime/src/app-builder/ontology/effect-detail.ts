import type { AppBuilderAffordanceRow } from './affordance.js';
import type { AppBuilderApplicationPatternRow } from './application-pattern.js';
import {
  APP_BUILDER_EFFECT_CONTRACT_ROWS,
  AppBuilderEffectContractId,
  AppBuilderEffectWitnessKind,
  appBuilderEffectWitnessDescriptorsForKinds,
  type AppBuilderEffectContractRow,
  type AppBuilderEffectWitnessDescriptorRow,
} from './effect.js';
import {
  APP_BUILDER_CONTROL_MANIFEST_FIELD_DESCRIPTOR_ROWS,
  type AppBuilderControlManifestFieldDescriptorRow,
} from './control-manifest-field.js';
import {
  APP_BUILDER_CONTROL_MANIFEST_ROWS,
  AppBuilderControlManifestRowId,
  type AppBuilderControlManifestRow,
} from './control.js';
import {
  EXPECTED_SEMANTIC_EFFECT_KIND_DESCRIPTOR_ROWS,
  type ExpectedSemanticEffectKindDescriptorRow,
} from '../../fixture-verification/effect-kind-descriptor.js';
import { semanticAppQueryCatalogRowsForKinds } from '../../api/app-query-catalog.js';
import {
  SemanticAppQueryKind,
  type SemanticAppQueryCatalogRow,
} from '../../api/contracts.js';
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
  appBuilderSelectRows,
  appBuilderUniqueIds,
} from './detail-helpers.js';
import {
  AppBuilderOntologyRowKind,
  appBuilderOntologyRowRef,
} from './relation.js';
import {
  appBuilderAffordancesForEffectContracts,
  appBuilderApplicationPatternsForAffordances,
  appBuilderControlManifestsForApplicationPatterns,
} from './detail-joins.js';
import {
  appBuilderDirectControlManifestIdsForEffectContract,
} from './effect-target.js';

/** Detail request for selected app-builder effect contracts. */
export interface AppBuilderEffectContractDetailRequest {
  /** Include only these effect contracts; omitted returns compact base rows unless a detail include flag is true. */
  readonly effectContractIds?: readonly AppBuilderEffectContractId[] | null;
  /** Input markers already supplied by caller, AI, app facts, policy, or public presets. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles expanded into supplied input markers before readiness is evaluated. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Include affordances that promise each effect contract; defaults to true only for selected contracts. */
  readonly includePromisingAffordances?: boolean | null;
  /** Include input-readiness rows for promising affordances; defaults to true only for selected contracts. */
  readonly includeAffordanceInputReadiness?: boolean | null;
  /** Include input contract payload/detail rows for promising affordances; defaults to true only for selected contracts. */
  readonly includeAffordanceInputContractDetail?: boolean | null;
  /** Include concrete payload schemas in input contract detail rows; defaults to true only for selected contracts. */
  readonly includePayloadSchemas?: boolean | null;
  /** Include application pattern rows associated with promising affordances; defaults to true only for selected contracts. */
  readonly includeApplicationPatterns?: boolean | null;
  /** Include witness descriptors for each effect contract; defaults to true only for selected contracts. */
  readonly includeWitnessDescriptors?: boolean | null;
  /** Include witness descriptor fields and enum value sets; defaults to true only for selected contracts. */
  readonly includeWitnessFields?: boolean | null;
  /** Include semantic effect kind descriptors for ExpectedSemanticEffect witnesses; defaults to true only for selected contracts. */
  readonly includeSemanticEffectDescriptors?: boolean | null;
  /** Include public semantic-runtime app-query rows for SemanticRuntimeQueryRow witnesses; defaults to true only for selected contracts. */
  readonly includeSemanticRuntimeQueryRows?: boolean | null;
  /** Include control/component manifest rows for manifest witnesses; defaults to true only for selected contracts. */
  readonly includeControlManifestRows?: boolean | null;
  /** Include manifest field descriptors for manifest witnesses; defaults to true only for selected contracts. */
  readonly includeControlManifestFieldDescriptors?: boolean | null;
}

/** Read-only detail for one affordance that promises an effect contract. */
export interface AppBuilderEffectContractAffordanceDetailRow {
  /** App-building move that declares the selected effect as a promise. */
  readonly affordance: AppBuilderAffordanceRow;
  /** Input readiness for the promising affordance when requested. */
  readonly inputReadiness?: AppBuilderInputReadinessTargetRow;
  /** Payload/schema detail for the promising affordance's input contracts when requested. */
  readonly inputContractDetails?: readonly AppBuilderInputContractDetailRow[];
  /** Application patterns coordinated by the promising affordance when requested. */
  readonly applicationPatterns?: readonly AppBuilderApplicationPatternRow[];
}

/** Read-only detail row for one app-builder effect contract. */
export interface AppBuilderEffectContractDetailRow {
  /** Selected effect contract row. */
  readonly effectContract: AppBuilderEffectContractRow;
  /** Concrete witness families that can inspect or prove this effect when requested. */
  readonly witnessDescriptors?: readonly AppBuilderEffectWitnessDescriptorRow[];
  /** Semantic-runtime product/query families that ExpectedSemanticEffect rows can observe. */
  readonly semanticEffectDescriptors?: readonly ExpectedSemanticEffectKindDescriptorRow[];
  /** Public semantic-runtime app queries that can inspect or prove query-row witnesses. */
  readonly semanticRuntimeQueryRows?: readonly SemanticAppQueryCatalogRow[];
  /** Manifest rows involved in component/control manifest witnesses when requested. */
  readonly controlManifests?: readonly AppBuilderControlManifestRow[];
  /** Field descriptors for those component/control manifest witnesses when requested. */
  readonly controlManifestFieldDescriptors?: readonly AppBuilderControlManifestFieldDescriptorRow[];
  /** App-building moves that promise this effect contract when requested. */
  readonly promisingAffordances?: readonly AppBuilderEffectContractAffordanceDetailRow[];
}

/** Read-only selected-effect detail for source-plan and verification negotiation. */
export interface AppBuilderEffectContractDetail {
  /** Compact display text suitable for MCP/IDE answer envelopes. */
  readonly displayText: string;
  /** Selected effect-contract detail rows. */
  readonly rows: readonly AppBuilderEffectContractDetailRow[];
  /** Issues found while projecting promising-affordance input readiness. */
  readonly issues: readonly AppBuilderInputReadinessIssue[];
  /** Whether promising affordance rows were included. */
  readonly promisingAffordancesIncluded: boolean;
  /** Whether affordance input-readiness rows were included. */
  readonly affordanceInputReadinessIncluded: boolean;
  /** Whether affordance input contract detail rows were included. */
  readonly affordanceInputContractDetailIncluded: boolean;
  /** Whether modeled payload schemas were included inside input contract detail rows. */
  readonly payloadSchemasIncluded: boolean;
  /** Whether associated application pattern rows were included. */
  readonly applicationPatternsIncluded: boolean;
  /** Whether witness descriptor rows were included. */
  readonly witnessDescriptorsIncluded: boolean;
  /** Whether witness descriptor field/value-set rows were included. */
  readonly witnessFieldsIncluded: boolean;
  /** Whether semantic effect kind descriptor rows were included. */
  readonly semanticEffectDescriptorsIncluded: boolean;
  /** Whether public semantic-runtime app-query catalog rows were included. */
  readonly semanticRuntimeQueryRowsIncluded: boolean;
  /** Whether component/control manifest rows were included. */
  readonly controlManifestRowsIncluded: boolean;
  /** Whether component/control manifest field descriptors were included. */
  readonly controlManifestFieldDescriptorsIncluded: boolean;
  /** Number of supplied input markers considered by readiness. */
  readonly suppliedInputCount: number;
  /** Number of supplied input markers explicitly present before decision-bundle expansion. */
  readonly explicitSuppliedInputCount: number;
  /** Number of request-local decision bundles considered. */
  readonly decisionBundleCount: number;
  /** Number of decisions carried by request-local decision bundles. */
  readonly decisionBundleDecisionCount: number;
}

const CONTROL_MANIFESTS_BY_ID = new Map(
  APP_BUILDER_CONTROL_MANIFEST_ROWS.map((row) => [row.id, row]),
);

/** Selection and include flags for one effect-contract detail projection. */
interface AppBuilderEffectContractDetailSelectionFrame {
  /** Selected effect contracts after id filtering. */
  readonly effectContracts: readonly AppBuilderEffectContractRow[];
  /** Whether promising affordance rows should be included. */
  readonly includePromisingAffordances: boolean;
  /** Whether promising-affordance input readiness should be included. */
  readonly includeAffordanceInputReadiness: boolean;
  /** Whether promising-affordance input contract detail should be included. */
  readonly includeAffordanceInputContractDetail: boolean;
  /** Whether payload schemas should be included in input contract detail. */
  readonly includePayloadSchemas: boolean;
  /** Whether application patterns for promising affordances should be included. */
  readonly includeApplicationPatterns: boolean;
  /** Whether witness descriptor rows should be included. */
  readonly includeWitnessDescriptors: boolean;
  /** Whether witness descriptor fields should be included. */
  readonly includeWitnessFields: boolean;
  /** Whether semantic effect descriptor rows should be included. */
  readonly includeSemanticEffectDescriptors: boolean;
  /** Whether semantic-runtime app-query catalog rows should be included. */
  readonly includeSemanticRuntimeQueryRows: boolean;
  /** Whether control/component manifest rows should be included. */
  readonly includeControlManifestRows: boolean;
  /** Whether manifest field descriptor rows should be included. */
  readonly includeControlManifestFieldDescriptors: boolean;
}

/** Promising-affordance readiness frame shared by all selected effect rows. */
interface AppBuilderEffectContractDetailReadinessFrame {
  /** Promising affordances considered for readiness. */
  readonly promisingAffordances: readonly AppBuilderAffordanceRow[];
  /** Input-readiness result when requested. */
  readonly inputReadiness: AppBuilderInputReadinessResult | null;
  /** Readiness rows keyed by affordance id. */
  readonly readinessByAffordanceId: ReadonlyMap<string, AppBuilderInputReadinessTargetRow>;
}

/** Rendered effect-contract rows before summary counts are computed. */
interface AppBuilderEffectContractDetailRowsFrame {
  /** Selected effect-contract detail rows. */
  readonly rows: readonly AppBuilderEffectContractDetailRow[];
}

/** Count summary for the effect-contract detail answer display text. */
interface AppBuilderEffectContractDetailSummaryFrame {
  readonly promisingAffordanceCount: number;
  readonly inputContractDetailCount: number;
  readonly applicationPatternCount: number;
  readonly issueCount: number;
  readonly witnessDescriptorCount: number;
  readonly witnessFieldCount: number;
  readonly semanticEffectDescriptorCount: number;
  readonly semanticRuntimeQueryRowCount: number;
  readonly controlManifestCount: number;
  readonly controlManifestFieldDescriptorCount: number;
}

/** Return selected effect contracts joined to promising moves, their inputs, and nearby patterns. */
export function appBuilderEffectContractDetail(
  request: AppBuilderEffectContractDetailRequest = {},
): AppBuilderEffectContractDetail {
  const selection = effectContractDetailSelectionFrame(request);
  const readiness = effectContractDetailReadinessFrame(selection, request);
  const rowFrame = effectContractDetailRowsFrame(selection, readiness);
  const summary = effectContractDetailSummaryFrame(rowFrame, readiness);
  const inputCounts = appBuilderDecisionBundleInputCounts(request.suppliedInputs, request.decisionBundles);
  return {
    rows: rowFrame.rows,
    issues: readiness.inputReadiness?.issues ?? [],
    promisingAffordancesIncluded: selection.includePromisingAffordances,
    affordanceInputReadinessIncluded: selection.includePromisingAffordances
      && selection.includeAffordanceInputReadiness,
    affordanceInputContractDetailIncluded: selection.includePromisingAffordances
      && selection.includeAffordanceInputContractDetail,
    payloadSchemasIncluded: selection.includePayloadSchemas,
    applicationPatternsIncluded: selection.includePromisingAffordances
      && selection.includeApplicationPatterns,
    witnessDescriptorsIncluded: selection.includeWitnessDescriptors,
    witnessFieldsIncluded: selection.includeWitnessDescriptors && selection.includeWitnessFields,
    semanticEffectDescriptorsIncluded: selection.includeSemanticEffectDescriptors,
    semanticRuntimeQueryRowsIncluded: selection.includeSemanticRuntimeQueryRows,
    controlManifestRowsIncluded: selection.includeControlManifestRows,
    controlManifestFieldDescriptorsIncluded: selection.includeControlManifestFieldDescriptors,
    ...inputCounts,
    displayText: effectContractDetailDisplayText(rowFrame, selection, summary),
  };
}

function effectContractDetailSelectionFrame(
  request: AppBuilderEffectContractDetailRequest,
): AppBuilderEffectContractDetailSelectionFrame {
  const hasExplicitSelection = appBuilderHasExplicitSelection(request.effectContractIds);
  const includePromisingAffordances = appBuilderIncludeDetail(
    request.includePromisingAffordances,
    hasExplicitSelection,
  );
  const includeAffordanceInputReadiness = appBuilderIncludeDetail(
    request.includeAffordanceInputReadiness,
    hasExplicitSelection,
  );
  const includeAffordanceInputContractDetail = appBuilderIncludeDetail(
    request.includeAffordanceInputContractDetail,
    hasExplicitSelection,
  );
  const includePayloadSchemas = appBuilderIncludeDetail(request.includePayloadSchemas, hasExplicitSelection);
  const includeApplicationPatterns = appBuilderIncludeDetail(request.includeApplicationPatterns, hasExplicitSelection);
  const includeWitnessDescriptors = appBuilderIncludeDetail(request.includeWitnessDescriptors, hasExplicitSelection);
  const includeWitnessFields = appBuilderIncludeDetail(request.includeWitnessFields, hasExplicitSelection);
  const includeSemanticEffectDescriptors = appBuilderIncludeDetail(
    request.includeSemanticEffectDescriptors,
    hasExplicitSelection,
  );
  const includeSemanticRuntimeQueryRows = appBuilderIncludeDetail(
    request.includeSemanticRuntimeQueryRows,
    hasExplicitSelection,
  );
  const includeControlManifestRows = appBuilderIncludeDetail(
    request.includeControlManifestRows,
    hasExplicitSelection,
  );
  const includeControlManifestFieldDescriptors = appBuilderIncludeDetail(
    request.includeControlManifestFieldDescriptors,
    hasExplicitSelection,
  );
  const effectContractIds = request.effectContractIds == null || request.effectContractIds.length === 0
    ? null
    : new Set(request.effectContractIds);
  const effectContracts = APP_BUILDER_EFFECT_CONTRACT_ROWS.filter((row) =>
    effectContractIds == null || effectContractIds.has(row.id)
  );
  return {
    effectContracts,
    includePromisingAffordances,
    includeAffordanceInputReadiness,
    includeAffordanceInputContractDetail,
    includePayloadSchemas,
    includeApplicationPatterns,
    includeWitnessDescriptors,
    includeWitnessFields,
    includeSemanticEffectDescriptors,
    includeSemanticRuntimeQueryRows,
    includeControlManifestRows,
    includeControlManifestFieldDescriptors,
  };
}

function effectContractDetailReadinessFrame(
  selection: AppBuilderEffectContractDetailSelectionFrame,
  request: AppBuilderEffectContractDetailRequest,
): AppBuilderEffectContractDetailReadinessFrame {
  const promisingAffordances = selection.includePromisingAffordances
    ? appBuilderAffordancesForEffectContracts(selection.effectContracts)
    : [];
  const inputReadiness = selection.includePromisingAffordances && selection.includeAffordanceInputReadiness
    ? appBuilderInputReadiness({
      targetRefs: promisingAffordances.map((row) => appBuilderOntologyRowRef(
        AppBuilderOntologyRowKind.Affordance,
        row.id,
      )),
      suppliedInputs: request.suppliedInputs ?? [],
      decisionBundles: request.decisionBundles ?? [],
    })
    : null;
  const readinessByAffordanceId = new Map<string, AppBuilderInputReadinessTargetRow>(
    inputReadiness?.targets.map((row) => [row.targetRef.id, row]) ?? [],
  );
  return { promisingAffordances, inputReadiness, readinessByAffordanceId };
}

function effectContractDetailRowsFrame(
  selection: AppBuilderEffectContractDetailSelectionFrame,
  readiness: AppBuilderEffectContractDetailReadinessFrame,
): AppBuilderEffectContractDetailRowsFrame {
  return {
    rows: selection.effectContracts.map((effectContract) =>
      effectContractDetailRow(effectContract, selection, readiness)
    ),
  };
}

function effectContractDetailRow(
  effectContract: AppBuilderEffectContractRow,
  selection: AppBuilderEffectContractDetailSelectionFrame,
  readiness: AppBuilderEffectContractDetailReadinessFrame,
): AppBuilderEffectContractDetailRow {
  const controlManifestIds = controlManifestIdsForEffectContract(effectContract);
  const controlManifests = appBuilderSelectRows(controlManifestIds, CONTROL_MANIFESTS_BY_ID);
  return {
    effectContract,
    ...(selection.includeWitnessDescriptors
      ? {
        witnessDescriptors: appBuilderEffectWitnessDescriptorsForKinds(effectContract.witnessKinds)
          .map((row) => selection.includeWitnessFields ? row : { ...row, fields: [] }),
      }
      : {}),
    ...(selection.includeSemanticEffectDescriptors
      && effectContract.witnessKinds.includes(AppBuilderEffectWitnessKind.ExpectedSemanticEffect)
      ? { semanticEffectDescriptors: EXPECTED_SEMANTIC_EFFECT_KIND_DESCRIPTOR_ROWS }
      : {}),
    ...(selection.includeSemanticRuntimeQueryRows
      && effectContract.witnessKinds.includes(AppBuilderEffectWitnessKind.SemanticRuntimeQueryRow)
      ? { semanticRuntimeQueryRows: semanticAppQueryCatalogRowsForKinds(
        semanticRuntimeQueryKindsForEffectContract(effectContract.id),
      ) }
      : {}),
    ...(selection.includeControlManifestRows
      && effectContract.witnessKinds.includes(AppBuilderEffectWitnessKind.ComponentControlManifestRow)
      ? { controlManifests }
      : {}),
    ...(selection.includeControlManifestFieldDescriptors
      && effectContract.witnessKinds.includes(AppBuilderEffectWitnessKind.ComponentControlManifestRow)
      ? {
        controlManifestFieldDescriptors: APP_BUILDER_CONTROL_MANIFEST_FIELD_DESCRIPTOR_ROWS.filter((descriptor) =>
          controlManifestIds.includes(descriptor.manifestRowId)
        ),
      }
      : {}),
    ...(selection.includePromisingAffordances
      ? { promisingAffordances: promisingAffordanceRows(effectContract, selection, readiness) }
      : {}),
  };
}

function promisingAffordanceRows(
  effectContract: AppBuilderEffectContractRow,
  selection: AppBuilderEffectContractDetailSelectionFrame,
  readiness: AppBuilderEffectContractDetailReadinessFrame,
): readonly AppBuilderEffectContractAffordanceDetailRow[] {
  return appBuilderAffordancesForEffectContracts([effectContract])
    .map((affordance): AppBuilderEffectContractAffordanceDetailRow => ({
      affordance,
      ...(selection.includeAffordanceInputReadiness
        ? { inputReadiness: readiness.readinessByAffordanceId.get(affordance.id) }
        : {}),
      ...(selection.includeAffordanceInputContractDetail
        ? { inputContractDetails: inputContractDetailsForAffordance(affordance, selection) }
        : {}),
      ...(selection.includeApplicationPatterns
        ? { applicationPatterns: appBuilderApplicationPatternsForAffordances([affordance]) }
        : {}),
    }));
}

function inputContractDetailsForAffordance(
  affordance: AppBuilderAffordanceRow,
  selection: AppBuilderEffectContractDetailSelectionFrame,
): readonly AppBuilderInputContractDetailRow[] {
  const inputContractIds = appBuilderInputContractIdsForDependency(affordance);
  if (inputContractIds.length === 0) {
    return [];
  }
  return appBuilderInputContractDetail({
    inputContractIds,
    inputFacetSelections: appBuilderInputFacetSelectionsForDependency(affordance),
    includePayloadSchemas: selection.includePayloadSchemas,
  }).rows;
}

function effectContractDetailSummaryFrame(
  rowFrame: AppBuilderEffectContractDetailRowsFrame,
  readiness: AppBuilderEffectContractDetailReadinessFrame,
): AppBuilderEffectContractDetailSummaryFrame {
  const rows = rowFrame.rows;
  const witnessDescriptorCount = rows.reduce((sum, row) =>
    sum + (row.witnessDescriptors?.length ?? 0), 0);
  const witnessFieldCount = rows.reduce((sum, row) =>
    sum + (row.witnessDescriptors?.reduce((fieldSum, descriptor) =>
      fieldSum + descriptor.fields.length, 0) ?? 0), 0);
  const semanticEffectDescriptorCount = rows.reduce((sum, row) =>
    sum + (row.semanticEffectDescriptors?.length ?? 0), 0);
  const semanticRuntimeQueryRowCount = rows.reduce((sum, row) =>
    sum + (row.semanticRuntimeQueryRows?.length ?? 0), 0);
  const controlManifestCount = rows.reduce((sum, row) =>
    sum + (row.controlManifests?.length ?? 0), 0);
  const controlManifestFieldDescriptorCount = rows.reduce((sum, row) =>
    sum + (row.controlManifestFieldDescriptors?.length ?? 0), 0);
  return {
    promisingAffordanceCount: rows.reduce((sum, row) =>
      sum + (row.promisingAffordances?.length ?? 0), 0),
    inputContractDetailCount: rows.reduce((sum, row) =>
      sum + (row.promisingAffordances?.reduce((affordanceSum, affordance) =>
        affordanceSum + (affordance.inputContractDetails?.length ?? 0), 0) ?? 0), 0),
    applicationPatternCount: rows.reduce((sum, row) =>
      sum + (row.promisingAffordances?.reduce((affordanceSum, affordance) =>
        affordanceSum + (affordance.applicationPatterns?.length ?? 0), 0) ?? 0), 0),
    issueCount: readiness.inputReadiness?.issues.length ?? 0,
    witnessDescriptorCount,
    witnessFieldCount,
    semanticEffectDescriptorCount,
    semanticRuntimeQueryRowCount,
    controlManifestCount,
    controlManifestFieldDescriptorCount,
  };
}

function effectContractDetailDisplayText(
  rowFrame: AppBuilderEffectContractDetailRowsFrame,
  selection: AppBuilderEffectContractDetailSelectionFrame,
  summary: AppBuilderEffectContractDetailSummaryFrame,
): string {
  return `App-builder effect contract detail: ${rowFrame.rows.length} effect contract(s), witnessDescriptors=${summary.witnessDescriptorCount}, witnessFields=${summary.witnessFieldCount}, semanticEffectDescriptors=${summary.semanticEffectDescriptorCount}, semanticRuntimeQueryRows=${summary.semanticRuntimeQueryRowCount}, controlManifests=${summary.controlManifestCount}, controlManifestFieldDescriptors=${summary.controlManifestFieldDescriptorCount}, promisingAffordances=${summary.promisingAffordanceCount}, affordanceInputReadiness=${selection.includePromisingAffordances && selection.includeAffordanceInputReadiness}, affordanceInputContractDetails=${summary.inputContractDetailCount}, applicationPatterns=${summary.applicationPatternCount}, issues=${summary.issueCount}.`;
}

function controlManifestIdsForEffectContract(
  effectContract: AppBuilderEffectContractRow,
): readonly AppBuilderControlManifestRowId[] {
  if (!effectContract.witnessKinds.includes(AppBuilderEffectWitnessKind.ComponentControlManifestRow)) {
    return [];
  }
  const directIds = appBuilderDirectControlManifestIdsForEffectContract(effectContract.id);
  const promisingPatterns = appBuilderApplicationPatternsForAffordances(
    appBuilderAffordancesForEffectContracts([effectContract]),
  );
  const patternManifestIds = appBuilderControlManifestsForApplicationPatterns(promisingPatterns)
    .map((row) => row.id);
  return appBuilderUniqueIds([...directIds, ...patternManifestIds]);
}

function semanticRuntimeQueryKindsForEffectContract(
  id: AppBuilderEffectContractId,
): readonly SemanticAppQueryKind[] {
  switch (id) {
    case AppBuilderEffectContractId.SemanticRuntimeReopen:
      return [
        SemanticAppQueryKind.AppOverview,
        SemanticAppQueryKind.AppDiagnostics,
        SemanticAppQueryKind.OpenSeamSummary,
        SemanticAppQueryKind.ResourceDefinitions,
        SemanticAppQueryKind.TemplateCompilations,
        SemanticAppQueryKind.BindingValueChannelSummary,
        SemanticAppQueryKind.BindingDataFlowSummary,
      ];
    case AppBuilderEffectContractId.ComponentManifestPublication:
      return [
        SemanticAppQueryKind.ResourceDefinitions,
        SemanticAppQueryKind.ResourceVisibility,
        SemanticAppQueryKind.BindingTargetOperations,
        SemanticAppQueryKind.BindingValueChannels,
      ];
    case AppBuilderEffectContractId.ControlUseInventory:
      return [
        SemanticAppQueryKind.ControlUseInventory,
        SemanticAppQueryKind.TemplateCompilations,
        SemanticAppQueryKind.BindingTargetAccesses,
        SemanticAppQueryKind.TargetOperations,
        SemanticAppQueryKind.BindingValueChannels,
        SemanticAppQueryKind.BindingDataFlows,
      ];
    case AppBuilderEffectContractId.ExistingAppFactRead:
      return [
        SemanticAppQueryKind.SourceFiles,
        SemanticAppQueryKind.AppTopology,
        SemanticAppQueryKind.ResourceDefinitions,
        SemanticAppQueryKind.RouterOverview,
        SemanticAppQueryKind.Routes,
        SemanticAppQueryKind.StateStores,
        SemanticAppQueryKind.I18nTranslationKeys,
        SemanticAppQueryKind.AppDiagnosticSummary,
      ];
    case AppBuilderEffectContractId.SourcePlanPreview:
      return [];
  }
}
