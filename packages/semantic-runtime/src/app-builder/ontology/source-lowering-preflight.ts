import {
  appBuilderEffectContractIdsForTargetRef,
} from './effect-target.js';
import type {
  AppBuilderEffectContractId,
} from './effect.js';
import {
  AppBuilderInputReadinessState,
  appBuilderInputReadiness,
  type AppBuilderInputReadinessDependencyRow,
  type AppBuilderInputReadinessIssue,
  type AppBuilderInputReadinessTargetRow,
  type AppBuilderSuppliedInput,
  AppBuilderSuppliedInputPayloadValidationState,
} from './input-readiness.js';
import {
  AppBuilderInputFacetId,
  appBuilderUniqueInputFacetIds,
} from './input.js';
import {
  AppBuilderOntologyRowKind,
  type AppBuilderOntologyRowRef,
} from './relation.js';
import {
  APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS,
  appBuilderOntologyRowDescriptor,
  appBuilderOntologyRowRefKey,
  type AppBuilderOntologyRowDescriptor,
} from './row-descriptor.js';
import {
  AppBuilderOntologyTargetSelectionIssueKind,
  appBuilderNormalizeOntologyTargetSelection,
  type AppBuilderOntologyTargetSelectionIssue,
  type AppBuilderOntologyTargetSelector,
} from './target-selector.js';
import type { AppBuilderOntologyStatus } from './status.js';
import type {
  AppBuilderOntologyDomain,
} from './status.js';
import {
  appBuilderSourceLoweringSurfaceKindsForTarget,
  type AppBuilderSourceLoweringSurfaceKind,
} from './source-lowering-surface.js';
import {
  AppBuilderControlPatternId,
} from './control.js';
import {
  AppBuilderApplicationPatternId,
} from './application-pattern.js';
import {
  AppBuilderCollectionFeatureId,
  AppBuilderCollectionIdentityMode,
  AppBuilderCollectionIdentityUse,
} from './collection.js';
import {
  appBuilderSourceLoweringCollectionIdentityPolicyPayloads,
  appBuilderSourceLoweringCollectionQueryFeaturePayloads,
  appBuilderSourceLoweringCollectionTableColumnPayloads,
  appBuilderSourceLoweringDomainEntityPayloads,
  appBuilderSourceLoweringDomainRelationshipPayloads,
  appBuilderUnsupportedCollectionTableQueryFeatures,
  appBuilderSourceLoweringDomainFieldPayloads,
  appBuilderSourceLoweringDomainValueSetPayloads,
} from './source-lowering-inputs.js';
import {
  appBuilderDomainFieldSourceModels,
} from '../domain-field-source.js';
import {
  appBuilderRangeConstraintPreflightIssue,
  type AppBuilderNumericControlConstraintIssue,
} from './source-lowering-numeric-constraints.js';
import {
  appBuilderSourceLoweringRequestFieldSummary,
  appBuilderSourceLoweringRequestFieldsForTarget,
  type AppBuilderSourceLoweringRequestFieldSummary,
  type AppBuilderSourceLoweringRequestFieldRequirement,
} from './source-lowering-request-field.js';
import {
  appBuilderDecisionBundleDecisionCount,
  appBuilderDecisionBundleExpansionRows,
  appBuilderSuppliedInputsForTarget,
  appBuilderSuppliedInputsWithDecisionBundles,
  type AppBuilderDecisionBundle,
  type AppBuilderDecisionBundleExpansionRow,
} from '../policy/decision-bundle.js';
import {
  AppBuilderPolicySatisfactionState,
  AppBuilderPolicySatisfactionSource,
  appBuilderPolicySatisfactionForTarget,
  type AppBuilderPolicySatisfactionRow,
} from '../policy/policy-satisfaction.js';
import {
  uniqueStrings,
} from '../../kernel/collections.js';
import { normalizedSourceInputText } from '../../source-plan/source-template.js';

/** Source-lowering availability for one app-builder ontology target without pretending evidence is implementation. */
export enum AppBuilderSourceLoweringAvailability {
  /** The app-builder ontology row has an executable source lowerer that can own generation. */
  SourceLoweringImplemented = 'source-lowering-implemented',
  /** The row is modeled but no source lowerer currently owns source generation. */
  NotImplemented = 'not-implemented',
  /** The requested target row is not admitted into the app-builder ontology. */
  UnknownTarget = 'unknown-target',
}

/** Stable value list for app-builder source-lowering availability transport schemas. */
export const APP_BUILDER_SOURCE_LOWERING_AVAILABILITIES = [
  AppBuilderSourceLoweringAvailability.SourceLoweringImplemented,
  AppBuilderSourceLoweringAvailability.NotImplemented,
  AppBuilderSourceLoweringAvailability.UnknownTarget,
] as const;

/** Input gate state for source-lowering preflight after supplied inputs and payloads are considered. */
export enum AppBuilderSourceLoweringInputGateState {
  /** Required inputs and modeled payloads are sufficient for source-lowering consideration. */
  Ready = 'ready',
  /** At least one required input dependency is still absent. */
  MissingRequiredInput = 'missing-required-input',
  /** At least one supplied facet payload failed its modeled schema. */
  InvalidSuppliedPayload = 'invalid-supplied-payload',
  /** The requested target row is not admitted into the app-builder ontology. */
  UnknownTarget = 'unknown-target',
}

/** Stable value list for app-builder source-lowering input-gate transport schemas. */
export const APP_BUILDER_SOURCE_LOWERING_INPUT_GATE_STATES = [
  AppBuilderSourceLoweringInputGateState.Ready,
  AppBuilderSourceLoweringInputGateState.MissingRequiredInput,
  AppBuilderSourceLoweringInputGateState.InvalidSuppliedPayload,
  AppBuilderSourceLoweringInputGateState.UnknownTarget,
] as const;

/** Default target-set strategy used when a preflight request omits exact target refs. */
export enum AppBuilderSourceLoweringPreflightDefaultTargetReason {
  /** The omitted target set was filled from rows with app-builder source-lowering support. */
  SourceLoweringImplemented = 'source-lowering-implemented',
  /** No default target rows were available. */
  None = 'none',
}

/** Stable value list for source-lowering preflight default-target reason transport schemas. */
export const APP_BUILDER_SOURCE_LOWERING_PREFLIGHT_DEFAULT_TARGET_REASONS = [
  AppBuilderSourceLoweringPreflightDefaultTargetReason.SourceLoweringImplemented,
  AppBuilderSourceLoweringPreflightDefaultTargetReason.None,
] as const;

/** Issue kind produced by app-builder source-lowering preflight. */
export enum AppBuilderSourceLoweringPreflightIssueKind {
  /** The caller requested a target row that the app-builder ontology does not admit. */
  UnknownTarget = 'unknown-target',
  /** A compact target selector supplied a domain that does not match its row kind. */
  TargetSelectorDomainMismatch = 'target-selector-domain-mismatch',
  /** Input-readiness surfaced an issue that blocks or informs source-lowering preflight. */
  InputReadinessIssue = 'input-readiness-issue',
  /** A contextual executable target was reached without explicit target-selection policy. */
  PolicySatisfactionRequirement = 'policy-satisfaction-requirement',
  /** Target-specific source facts are absent or invalid even though the coarse input facet exists. */
  TargetPayloadRequirement = 'target-payload-requirement',
}

/** Stable value list for source-lowering preflight issue transport schemas. */
export const APP_BUILDER_SOURCE_LOWERING_PREFLIGHT_ISSUE_KINDS = [
  AppBuilderSourceLoweringPreflightIssueKind.UnknownTarget,
  AppBuilderSourceLoweringPreflightIssueKind.TargetSelectorDomainMismatch,
  AppBuilderSourceLoweringPreflightIssueKind.InputReadinessIssue,
  AppBuilderSourceLoweringPreflightIssueKind.PolicySatisfactionRequirement,
  AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
] as const;

/** Request for checking source-lowering feasibility against app-builder ontology targets. */
export interface AppBuilderSourceLoweringPreflightRequest {
  /** Ontology targets to inspect; omitted means current source-lowerable targets. */
  readonly targetRefs?: readonly AppBuilderOntologyRowRef[] | null;
  /** Compact kind/id target selectors; normalized to exact targetRefs before graph operations. */
  readonly targetSelectors?: readonly AppBuilderOntologyTargetSelector[] | null;
  /** Input markers and facet payloads already supplied by caller, AI, app facts, policy, or public presets. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles expanded into supplied input markers before preflight checks. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Include full input dependency rows on each target; defaults to false. */
  readonly includeInputDependencies?: boolean | null;
  /** Include full source-lowering request-field rows on each target; defaults to false because summaries keep counts and names. */
  readonly includeSourceLoweringRequestFields?: boolean | null;
  /** Include decision-bundle expansion rows; defaults to false so compact answers keep counts only. */
  readonly includeDecisionBundleExpansionRows?: boolean | null;
}

/** Compact source-lowering input-readiness summary for one target row. */
export interface AppBuilderSourceLoweringPreflightInputSummary {
  /** Number of input dependencies inspected for this target. */
  readonly inputDependencyCount: number;
  /** Number of dependencies satisfied by supplied input. */
  readonly satisfiedCount: number;
  /** Number of required dependencies still missing. */
  readonly missingRequiredCount: number;
  /** Number of recommended dependencies still missing. */
  readonly missingRecommendedCount: number;
  /** Number of deferred dependencies on this target. */
  readonly deferredCount: number;
  /** Number of invalid supplied facet payload rows tied to this target. */
  readonly invalidPayloadCount: number;
  /** Required input contracts still missing for this target. */
  readonly missingRequiredInputContractIds: readonly string[];
  /** Required input facets still missing for this target. */
  readonly missingRequiredInputFacetIds: readonly AppBuilderInputFacetId[];
}

/** Source-lowering preflight issue suitable for public answer surfaces. */
export interface AppBuilderSourceLoweringPreflightIssue {
  /** Stable issue category. */
  readonly issueKind: AppBuilderSourceLoweringPreflightIssueKind;
  /** Target row involved in the issue when applicable. */
  readonly targetRef?: AppBuilderOntologyRowRef;
  /** Compact target selector involved in the issue when applicable. */
  readonly targetSelector?: AppBuilderOntologyTargetSelector;
  /** Derived target domain when a compact selector supplied an inconsistent domain. */
  readonly expectedDomain?: AppBuilderOntologyDomain;
  /** Input-readiness issue bridged into this preflight answer when applicable. */
  readonly inputReadinessIssue?: AppBuilderInputReadinessIssue;
  /** Target-neutral numeric-control requirement issue when applicable. */
  readonly numericConstraintIssue?: AppBuilderNumericControlConstraintIssue;
  /** Policy-satisfaction row involved in a contextual target gate when applicable. */
  readonly policySatisfaction?: AppBuilderPolicySatisfactionRow;
  /** Domain fields involved in a target-specific requirement issue. */
  readonly fieldNames?: readonly string[];
  /** Collection table headers involved in a target-specific requirement issue. */
  readonly columnHeaders?: readonly string[];
  /** Collection query features involved in a target-specific requirement issue. */
  readonly collectionFeatureIds?: readonly AppBuilderCollectionFeatureId[];
  /** Fine-grained input facet that should be supplied or corrected for this target-specific requirement. */
  readonly inputFacetId?: AppBuilderInputFacetId;
  /** Compact explanation suitable for MCP/IDE display. */
  readonly summary: string;
}

/** One ontology target checked for source-lowering feasibility. */
export interface AppBuilderSourceLoweringPreflightRow {
  /** Stable target row reference. */
  readonly targetRef: AppBuilderOntologyRowRef;
  /** Short display title. */
  readonly title: string;
  /** Compact row explanation. */
  readonly summary: string;
  /** Honest modeling/implementation/recommendation status for this target. */
  readonly status: AppBuilderOntologyStatus;
  /** Whether source-lowering exists in the source-lowering model, only as old evidence, or not at all. */
  readonly sourceLoweringAvailability: AppBuilderSourceLoweringAvailability;
  /** App-builder source-lowering surfaces that can spend this target row. */
  readonly sourceLoweringSurfaceKinds: readonly AppBuilderSourceLoweringSurfaceKind[];
  /** Per-call source-lowering request fields still needed after durable input readiness passes when explicitly requested. */
  readonly sourceLoweringRequestFields?: readonly AppBuilderSourceLoweringRequestFieldRequirement[];
  /** Compact count/field-name summary for per-call source-lowering request fields. */
  readonly sourceLoweringRequestFieldSummary: AppBuilderSourceLoweringRequestFieldSummary;
  /** Effect contracts associated with the selected target through app-builder affordance/pattern rows. */
  readonly effectContractIds: readonly AppBuilderEffectContractId[];
  /** Whether supplied inputs are ready enough for source-lowering consideration. */
  readonly inputGateState: AppBuilderSourceLoweringInputGateState;
  /** True when a source lowerer is eligible after durable inputs, policy gates, and target-specific facts; per-call request fields may still be required. */
  readonly canRequestSourceLowering: boolean;
  /** Explicit target-selection policy gate for contextual executable source-lowering rows. */
  readonly policySatisfaction: AppBuilderPolicySatisfactionRow;
  /** Policy gate issues for contextual targets reached through a broad/default target set. */
  readonly policySatisfactionIssues: readonly AppBuilderSourceLoweringPreflightIssue[];
  /** Compact input readiness summary for this target. */
  readonly inputReadiness: AppBuilderSourceLoweringPreflightInputSummary;
  /** Full input dependency rows when explicitly requested. */
  readonly inputDependencies?: readonly AppBuilderInputReadinessDependencyRow[];
  /** Target-specific source requirement issues for this row. */
  readonly targetRequirementIssues: readonly AppBuilderSourceLoweringPreflightIssue[];
  /** Compact source-lowering decision text for this target. */
  readonly decisionText: string;
}

/** Read-only preflight result for app-builder source-lowering feasibility. */
export interface AppBuilderSourceLoweringPreflight {
  /** Compact display text suitable for MCP/IDE answer envelopes. */
  readonly displayText: string;
  /** Whether omitted target refs caused a default source-target set to be used. */
  readonly defaultTargetSetUsed: boolean;
  /** Why the default target set was chosen. */
  readonly defaultTargetReason: AppBuilderSourceLoweringPreflightDefaultTargetReason;
  /** Target rows checked by the preflight. */
  readonly rows: readonly AppBuilderSourceLoweringPreflightRow[];
  /** Unknown-target and bridged input-readiness issues. */
  readonly issues: readonly AppBuilderSourceLoweringPreflightIssue[];
  /** Number of supplied input markers considered. */
  readonly suppliedInputCount: number;
  /** Number of supplied input markers explicitly present before decision-bundle expansion. */
  readonly explicitSuppliedInputCount: number;
  /** Number of request-local decision bundles considered. */
  readonly decisionBundleCount: number;
  /** Number of decisions carried by request-local decision bundles. */
  readonly decisionBundleDecisionCount: number;
  /** Expansion rows showing which decision-bundle decisions became supplied inputs when explicitly requested. */
  readonly decisionBundleExpansionRows?: readonly AppBuilderDecisionBundleExpansionRow[];
  /** Number of rows that can request app-builder source lowering now. */
  readonly canRequestSourceLoweringCount: number;
  /** Number of rows that still advertise required per-call source-lowering request fields. */
  readonly requiredRequestFieldTargetCount: number;
  /** Number of required per-call source-lowering request fields across all returned rows. */
  readonly requiredSourceLoweringRequestFieldCount: number;
  /** Number of rows with no app-builder source lowerer. */
  readonly notImplementedCount: number;
  /** Number of rows blocked by missing required input. */
  readonly missingRequiredInputCount: number;
  /** Number of rows blocked by invalid supplied payloads. */
  readonly invalidPayloadTargetCount: number;
  /** Number of rows whose contextual source-lowering policy gate applies. */
  readonly policySatisfactionRequiredCount: number;
  /** Number of contextual source-lowering rows still blocked by missing exact target selection. */
  readonly policySatisfactionMissingCount: number;
  /** Number of contextual source-lowering rows whose policy gate is satisfied. */
  readonly policySatisfactionSatisfiedCount: number;
}

interface AppBuilderSourceLoweringPreflightDescriptorEntry {
  readonly targetRef: AppBuilderOntologyRowRef;
  readonly descriptor: AppBuilderOntologyRowDescriptor | null;
}

interface AppBuilderSourceLoweringPreflightSelectionFrame {
  readonly explicitSuppliedInputs: readonly AppBuilderSuppliedInput[];
  readonly suppliedInputs: readonly AppBuilderSuppliedInput[];
  readonly selectionProvided: boolean;
  readonly defaultTargetSetUsed: boolean;
  readonly defaultTargetReason: AppBuilderSourceLoweringPreflightDefaultTargetReason;
  readonly includeInputDependencies: boolean;
  readonly includeSourceLoweringRequestFields: boolean;
  readonly includeDecisionBundleExpansionRows: boolean;
  readonly descriptors: readonly AppBuilderSourceLoweringPreflightDescriptorEntry[];
  readonly knownTargetRefs: readonly AppBuilderOntologyRowRef[];
  readonly issues: readonly AppBuilderSourceLoweringPreflightIssue[];
}

interface AppBuilderSourceLoweringPreflightReadinessFrame {
  readonly readinessByTargetKey: ReadonlyMap<string, AppBuilderInputReadinessTargetRow>;
  readonly issues: readonly AppBuilderSourceLoweringPreflightIssue[];
}

interface AppBuilderSourceLoweringPreflightRowsFrame {
  readonly rows: readonly AppBuilderSourceLoweringPreflightRow[];
  readonly issues: readonly AppBuilderSourceLoweringPreflightIssue[];
}

interface AppBuilderSourceLoweringPreflightSummaryFrame {
  readonly canRequestSourceLoweringCount: number;
  readonly requiredRequestFieldTargetCount: number;
  readonly requiredSourceLoweringRequestFieldCount: number;
  readonly sourceLoweringRequestFieldCount: number;
  readonly notImplementedCount: number;
  readonly missingRequiredInputCount: number;
  readonly invalidPayloadTargetCount: number;
  readonly policySatisfactionRequiredCount: number;
  readonly policySatisfactionMissingCount: number;
  readonly policySatisfactionSatisfiedCount: number;
}

/** Check source-lowering feasibility without lowering source. */
export function appBuilderSourceLoweringPreflight(
  request: AppBuilderSourceLoweringPreflightRequest = {},
): AppBuilderSourceLoweringPreflight {
  const selection = sourceLoweringPreflightSelectionFrame(request);
  const readiness = sourceLoweringPreflightReadinessFrame(selection, request);
  const rowFrame = sourceLoweringPreflightRowsFrame(selection, readiness);
  return sourceLoweringPreflightResult(request, selection, readiness, rowFrame);
}

function sourceLoweringPreflightSelectionFrame(
  request: AppBuilderSourceLoweringPreflightRequest,
): AppBuilderSourceLoweringPreflightSelectionFrame {
  const explicitSuppliedInputs = request.suppliedInputs ?? [];
  const suppliedInputs = appBuilderSuppliedInputsWithDecisionBundles(explicitSuppliedInputs, request.decisionBundles);
  const targetSelection = appBuilderNormalizeOntologyTargetSelection(request);
  const defaultTargetSetUsed = !targetSelection.selectionProvided;
  const defaultTargets = defaultTargetSetUsed ? defaultTargetRefs() : null;
  const targetRefs = defaultTargets?.targetRefs ?? targetSelection.targetRefs;
  const issues = [
    ...targetSelection.issues.map(sourceLoweringPreflightIssueForTargetSelectionIssue),
  ];
  const descriptors = targetRefs.map((targetRef): AppBuilderSourceLoweringPreflightDescriptorEntry => {
    const descriptor = appBuilderOntologyRowDescriptor(targetRef) ?? null;
    if (descriptor == null) {
      issues.push({
        issueKind: AppBuilderSourceLoweringPreflightIssueKind.UnknownTarget,
        targetRef,
        summary: `App-builder source-lowering preflight does not know ontology target '${targetRef.kind}:${targetRef.id}'.`,
      });
    }
    return { targetRef, descriptor };
  });
  return {
    explicitSuppliedInputs,
    suppliedInputs,
    selectionProvided: targetSelection.selectionProvided,
    defaultTargetSetUsed,
    defaultTargetReason: defaultTargets?.reason ?? AppBuilderSourceLoweringPreflightDefaultTargetReason.None,
    includeInputDependencies: request.includeInputDependencies === true,
    includeSourceLoweringRequestFields: request.includeSourceLoweringRequestFields === true,
    includeDecisionBundleExpansionRows: request.includeDecisionBundleExpansionRows === true,
    descriptors,
    knownTargetRefs: descriptors
      .filter((entry): entry is { readonly targetRef: AppBuilderOntologyRowRef; readonly descriptor: AppBuilderOntologyRowDescriptor } =>
        entry.descriptor != null
      )
      .map((entry) => entry.targetRef),
    issues,
  };
}

function sourceLoweringPreflightReadinessFrame(
  selection: AppBuilderSourceLoweringPreflightSelectionFrame,
  request: AppBuilderSourceLoweringPreflightRequest,
): AppBuilderSourceLoweringPreflightReadinessFrame {
  const readiness = appBuilderInputReadiness({
    targetRefs: selection.knownTargetRefs,
    suppliedInputs: selection.explicitSuppliedInputs,
    decisionBundles: request.decisionBundles ?? [],
  });
  return {
    readinessByTargetKey: new Map<string, AppBuilderInputReadinessTargetRow>(
      readiness.targets.map((target) => [appBuilderOntologyRowRefKey(target.targetRef), target]),
    ),
    issues: readiness.issues.map((issue): AppBuilderSourceLoweringPreflightIssue => ({
      issueKind: AppBuilderSourceLoweringPreflightIssueKind.InputReadinessIssue,
      targetRef: issue.targetRef,
      inputReadinessIssue: issue,
      summary: issue.summary,
    })),
  };
}

function sourceLoweringPreflightRowsFrame(
  selection: AppBuilderSourceLoweringPreflightSelectionFrame,
  readinessFrame: AppBuilderSourceLoweringPreflightReadinessFrame,
): AppBuilderSourceLoweringPreflightRowsFrame {
  const issues: AppBuilderSourceLoweringPreflightIssue[] = [];
  const rows = selection.descriptors.flatMap((entry): readonly AppBuilderSourceLoweringPreflightRow[] => {
    if (entry.descriptor == null) {
      return [];
    }
    const key = appBuilderOntologyRowRefKey(entry.targetRef);
    const readiness = readinessFrame.readinessByTargetKey.get(key) ?? emptyTargetReadiness(entry.descriptor);
    const sourceLoweringAvailability = availabilityForTarget(entry.descriptor);
    const sourceLoweringSurfaceKinds = appBuilderSourceLoweringSurfaceKindsForTarget(entry.targetRef);
    const sourceLoweringRequestFields = appBuilderSourceLoweringRequestFieldsForTarget(entry.targetRef);
    const sourceLoweringRequestFieldSummary = appBuilderSourceLoweringRequestFieldSummary(sourceLoweringRequestFields, {
      includeRequestFieldNames: selection.includeSourceLoweringRequestFields,
    });
    const policySatisfaction = appBuilderPolicySatisfactionForTarget({
      recommendationStatus: entry.descriptor.status.recommendationStatus,
      sourceLoweringImplemented: sourceLoweringAvailability === AppBuilderSourceLoweringAvailability.SourceLoweringImplemented
        && sourceLoweringSurfaceKinds.length > 0,
    }, {
      sourceId: selection.selectionProvided
        ? AppBuilderPolicySatisfactionSource.ExplicitTargetSelection
        : null,
    });
    const policySatisfactionIssues = policySatisfaction.state === AppBuilderPolicySatisfactionState.MissingExplicitSelection
      ? [policySatisfactionIssue(entry.targetRef, policySatisfaction)]
      : [];
    const inputReadiness = inputSummary(readiness);
    const inputGateState = inputGateStateForSummary(inputReadiness);
    const targetSuppliedInputs = appBuilderSuppliedInputsForTarget(selection.suppliedInputs, entry.targetRef);
    const targetRequirementIssues = inputGateState === AppBuilderSourceLoweringInputGateState.Ready
      ? targetRequirementIssuesForPreflight(entry.targetRef, targetSuppliedInputs)
      : [];
    issues.push(...targetRequirementIssues);
    const canRequestSourceLowering = sourceLoweringAvailability === AppBuilderSourceLoweringAvailability.SourceLoweringImplemented
      && sourceLoweringSurfaceKinds.length > 0
      && policySatisfaction.state !== AppBuilderPolicySatisfactionState.MissingExplicitSelection
      && inputGateState === AppBuilderSourceLoweringInputGateState.Ready
      && targetRequirementIssues.length === 0;
    return [{
      targetRef: entry.targetRef,
      title: entry.descriptor.title,
      summary: entry.descriptor.summary,
      status: entry.descriptor.status,
      sourceLoweringAvailability,
      sourceLoweringSurfaceKinds,
      sourceLoweringRequestFieldSummary,
      effectContractIds: appBuilderEffectContractIdsForTargetRef(entry.targetRef),
      inputGateState,
      canRequestSourceLowering,
      policySatisfaction,
      policySatisfactionIssues,
      inputReadiness,
      ...(selection.includeSourceLoweringRequestFields ? { sourceLoweringRequestFields } : {}),
      ...(selection.includeInputDependencies ? { inputDependencies: readiness.inputDependencies } : {}),
      targetRequirementIssues,
      decisionText: decisionText(sourceLoweringAvailability, policySatisfaction, inputGateState, targetRequirementIssues, sourceLoweringSurfaceKinds, sourceLoweringRequestFieldSummary),
    }];
  });
  return { rows, issues };
}

function sourceLoweringPreflightResult(
  request: AppBuilderSourceLoweringPreflightRequest,
  selection: AppBuilderSourceLoweringPreflightSelectionFrame,
  readiness: AppBuilderSourceLoweringPreflightReadinessFrame,
  rowFrame: AppBuilderSourceLoweringPreflightRowsFrame,
): AppBuilderSourceLoweringPreflight {
  const rows = rowFrame.rows;
  const summary = sourceLoweringPreflightSummaryFrame(rows);
  const issues = [
    ...selection.issues,
    ...readiness.issues,
    ...rowFrame.issues,
  ];
  const decisionBundleCount = request.decisionBundles?.length ?? 0;
  const decisionBundleDecisionCount = appBuilderDecisionBundleDecisionCount(request.decisionBundles);
  return {
    displayText: sourceLoweringPreflightDisplayText(rows, issues, selection, summary, decisionBundleCount),
    defaultTargetSetUsed: selection.defaultTargetSetUsed,
    defaultTargetReason: selection.defaultTargetReason,
    rows,
    issues,
    suppliedInputCount: selection.suppliedInputs.length,
    explicitSuppliedInputCount: selection.explicitSuppliedInputs.length,
    decisionBundleCount,
    decisionBundleDecisionCount,
    ...(selection.includeDecisionBundleExpansionRows ? {
      decisionBundleExpansionRows: appBuilderDecisionBundleExpansionRows(request.decisionBundles),
    } : {}),
    canRequestSourceLoweringCount: summary.canRequestSourceLoweringCount,
    requiredRequestFieldTargetCount: summary.requiredRequestFieldTargetCount,
    requiredSourceLoweringRequestFieldCount: summary.requiredSourceLoweringRequestFieldCount,
    notImplementedCount: summary.notImplementedCount,
    missingRequiredInputCount: summary.missingRequiredInputCount,
    invalidPayloadTargetCount: summary.invalidPayloadTargetCount,
    policySatisfactionRequiredCount: summary.policySatisfactionRequiredCount,
    policySatisfactionMissingCount: summary.policySatisfactionMissingCount,
    policySatisfactionSatisfiedCount: summary.policySatisfactionSatisfiedCount,
  };
}

function sourceLoweringPreflightSummaryFrame(
  rows: readonly AppBuilderSourceLoweringPreflightRow[],
): AppBuilderSourceLoweringPreflightSummaryFrame {
  const sourceLoweringRequestFieldCount = rows.reduce((sum, row) =>
    sum + row.sourceLoweringRequestFieldSummary.requestFieldCount, 0);
  return {
    canRequestSourceLoweringCount: rows.filter((row) => row.canRequestSourceLowering).length,
    requiredRequestFieldTargetCount: rows.filter((row) =>
      row.sourceLoweringRequestFieldSummary.hasRequiredRequestFields
    ).length,
    requiredSourceLoweringRequestFieldCount: rows.reduce((sum, row) =>
      sum + row.sourceLoweringRequestFieldSummary.requiredCount, 0),
    sourceLoweringRequestFieldCount,
    notImplementedCount: rows.filter((row) =>
      row.sourceLoweringAvailability === AppBuilderSourceLoweringAvailability.NotImplemented
    ).length,
    missingRequiredInputCount: rows.filter((row) =>
      row.inputGateState === AppBuilderSourceLoweringInputGateState.MissingRequiredInput
    ).length,
    invalidPayloadTargetCount: rows.filter((row) =>
      row.inputGateState === AppBuilderSourceLoweringInputGateState.InvalidSuppliedPayload
    ).length,
    policySatisfactionRequiredCount: rows.filter((row) =>
      row.policySatisfaction.required
    ).length,
    policySatisfactionMissingCount: rows.filter((row) =>
      row.policySatisfaction.state === AppBuilderPolicySatisfactionState.MissingExplicitSelection
    ).length,
    policySatisfactionSatisfiedCount: rows.filter((row) =>
      row.policySatisfaction.state === AppBuilderPolicySatisfactionState.Satisfied
    ).length,
  };
}

function sourceLoweringPreflightDisplayText(
  rows: readonly AppBuilderSourceLoweringPreflightRow[],
  issues: readonly AppBuilderSourceLoweringPreflightIssue[],
  selection: AppBuilderSourceLoweringPreflightSelectionFrame,
  summary: AppBuilderSourceLoweringPreflightSummaryFrame,
  decisionBundleCount: number,
): string {
  return `App-builder source-lowering preflight: ${rows.length} target row(s), sourceLoweringGateReady=${summary.canRequestSourceLoweringCount}, requiredRequestFieldTargets=${summary.requiredRequestFieldTargetCount}, requiredSourceLoweringRequestFields=${summary.requiredSourceLoweringRequestFieldCount}, notImplemented=${summary.notImplementedCount}, missingRequired=${summary.missingRequiredInputCount}, invalidPayloadTargets=${summary.invalidPayloadTargetCount}, policyGateRequired=${summary.policySatisfactionRequiredCount}, policyGateMissing=${summary.policySatisfactionMissingCount}, policyGateSatisfied=${summary.policySatisfactionSatisfiedCount}, sourceLoweringRequestFieldRows=${selection.includeSourceLoweringRequestFields}, sourceLoweringRequestFields=${summary.sourceLoweringRequestFieldCount}, decisionBundles=${decisionBundleCount}, issues=${issues.length}${selection.defaultTargetSetUsed ? `; defaultTargets=${selection.defaultTargetReason}` : ''}.`;
}

function sourceLoweringPreflightIssueForTargetSelectionIssue(
  issue: AppBuilderOntologyTargetSelectionIssue,
): AppBuilderSourceLoweringPreflightIssue {
  return {
    issueKind: issue.issueKind === AppBuilderOntologyTargetSelectionIssueKind.TargetSelectorDomainMismatch
      ? AppBuilderSourceLoweringPreflightIssueKind.TargetSelectorDomainMismatch
      : AppBuilderSourceLoweringPreflightIssueKind.UnknownTarget,
    targetRef: issue.targetRef,
    targetSelector: issue.targetSelector,
    expectedDomain: issue.expectedDomain,
    summary: issue.summary,
  };
}

function defaultTargetRefs(): {
  readonly targetRefs: readonly AppBuilderOntologyRowRef[];
  readonly reason: AppBuilderSourceLoweringPreflightDefaultTargetReason;
} {
  const implementedTargets = APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS
    .filter((descriptor) => descriptor.status.sourceLoweringImplemented)
    .map((descriptor) => descriptor.ref);
  if (implementedTargets.length > 0) {
    return {
      targetRefs: implementedTargets,
      reason: AppBuilderSourceLoweringPreflightDefaultTargetReason.SourceLoweringImplemented,
    };
  }
  return {
    targetRefs: [],
    reason: AppBuilderSourceLoweringPreflightDefaultTargetReason.None,
  };
}

function availabilityForTarget(
  descriptor: AppBuilderOntologyRowDescriptor,
): AppBuilderSourceLoweringAvailability {
  if (descriptor.status.sourceLoweringImplemented) {
    return AppBuilderSourceLoweringAvailability.SourceLoweringImplemented;
  }
  return AppBuilderSourceLoweringAvailability.NotImplemented;
}

function inputSummary(
  readiness: AppBuilderInputReadinessTargetRow,
): AppBuilderSourceLoweringPreflightInputSummary {
  const missingRequiredDependencies = readiness.inputDependencies.filter((row) =>
    row.state === AppBuilderInputReadinessState.MissingRequired
  );
  return {
    inputDependencyCount: readiness.inputDependencies.length,
    satisfiedCount: readiness.satisfiedCount,
    missingRequiredCount: readiness.missingRequiredCount,
    missingRecommendedCount: readiness.missingRecommendedCount,
    deferredCount: readiness.deferredCount,
    invalidPayloadCount: readiness.inputDependencies.reduce((sum, row) =>
      sum + row.payloadValidations.filter((payload) =>
        payload.state === AppBuilderSuppliedInputPayloadValidationState.Invalid
      ).length, 0),
    missingRequiredInputContractIds: uniqueStrings(missingRequiredDependencies.map((row) => row.inputContract.id)),
    missingRequiredInputFacetIds: appBuilderUniqueInputFacetIds(missingRequiredDependencies.flatMap((row) => row.missingInputFacetIds)),
  };
}

function inputGateStateForSummary(
  inputReadiness: AppBuilderSourceLoweringPreflightInputSummary,
): AppBuilderSourceLoweringInputGateState {
  if (inputReadiness.invalidPayloadCount > 0) {
    return AppBuilderSourceLoweringInputGateState.InvalidSuppliedPayload;
  }
  if (inputReadiness.missingRequiredCount > 0) {
    return AppBuilderSourceLoweringInputGateState.MissingRequiredInput;
  }
  return AppBuilderSourceLoweringInputGateState.Ready;
}

function policySatisfactionIssue(
  targetRef: AppBuilderOntologyRowRef,
  policySatisfaction: AppBuilderPolicySatisfactionRow,
): AppBuilderSourceLoweringPreflightIssue {
  return {
    issueKind: AppBuilderSourceLoweringPreflightIssueKind.PolicySatisfactionRequirement,
    targetRef,
    policySatisfaction,
    summary: policySatisfaction.summary,
  };
}

function targetRequirementIssuesForPreflight(
  targetRef: AppBuilderOntologyRowRef,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderSourceLoweringPreflightIssue[] {
  if (targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && targetRef.id === AppBuilderApplicationPatternId.RouterBackedListDetail) {
    return domainIdentityRequirementIssuesForPreflight(
      targetRef,
      suppliedInputs,
      'Router-backed list/detail',
      true,
    );
  }
  if (targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && targetRef.id === AppBuilderApplicationPatternId.DiStateClass) {
    return domainIdentityRequirementIssuesForPreflight(
      targetRef,
      suppliedInputs,
      'DI state-class',
    );
  }
  if (targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && targetRef.id === AppBuilderApplicationPatternId.CollectionTable) {
    return collectionTableRequirementIssuesForPreflight(targetRef, suppliedInputs);
  }
  if (targetRef.kind === AppBuilderOntologyRowKind.ControlPattern
    && targetRef.id === AppBuilderControlPatternId.NativeRangeInput) {
    const fields = appBuilderDomainFieldSourceModels(appBuilderSourceLoweringDomainFieldPayloads(suppliedInputs), {
      valueSets: appBuilderSourceLoweringDomainValueSetPayloads(suppliedInputs),
    });
    const issue = appBuilderRangeConstraintPreflightIssue(fields);
    return issue == null
      ? []
      : [{
          issueKind: AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
          targetRef,
          numericConstraintIssue: issue,
          fieldNames: issue.fieldNames,
          summary: issue.summary,
        }];
  }
  return [];
}

function domainIdentityRequirementIssuesForPreflight(
  targetRef: AppBuilderOntologyRowRef,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  targetTitle: string,
  allowRelationshipPrimaryEntity = false,
): readonly AppBuilderSourceLoweringPreflightIssue[] {
  const entities = appBuilderSourceLoweringDomainEntityPayloads(suppliedInputs);
  if (entities.length === 0) {
    return [{
      issueKind: AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
      targetRef,
      inputFacetId: AppBuilderInputFacetId.DomainEntities,
      summary: `${targetTitle} source lowering requires exactly one modeled DomainEntities payload with entityTitle and explicit identityValueKind before source can type entity constructors, seed records, and lookup code.`,
    }];
  }
  if (entities.length > 1) {
    if (allowRelationshipPrimaryEntity) {
      const relationships = appBuilderSourceLoweringDomainRelationshipPayloads(suppliedInputs);
      const fromEntityNames = [...new Set(relationships
        .map((relationship) => relationship.fromEntityName)
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
      const primaryEntity = fromEntityNames.length === 1
        ? entities.find((entity) => (entity.entityTypeName ?? entity.entityTitle) === fromEntityNames[0]) ?? null
        : null;
      if (primaryEntity != null && primaryEntity.identityValueKind != null) {
        return [];
      }
      if (primaryEntity != null) {
        return [{
          issueKind: AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
          targetRef,
          inputFacetId: AppBuilderInputFacetId.DomainEntities,
          summary: `${targetTitle} relationship-aware source lowering requires the primary DomainEntities payload '${fromEntityNames[0]}' to include identityValueKind.`,
        }];
      }
    }
    return [{
      issueKind: AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
      targetRef,
      inputFacetId: AppBuilderInputFacetId.DomainEntities,
      summary: allowRelationshipPrimaryEntity
        ? `${targetTitle} source lowering received ${entities.length} DomainEntities payloads; supply exactly one entity, or provide DomainRelationships with exactly one fromEntityName that identifies the primary entity.`
        : `${targetTitle} source lowering received ${entities.length} DomainEntities payloads; supply exactly one for this first-ring source plan.`,
    }];
  }
  if (entities[0]?.identityValueKind == null) {
    return [{
      issueKind: AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
      targetRef,
      inputFacetId: AppBuilderInputFacetId.DomainEntities,
      summary: `${targetTitle} source lowering requires DomainEntities.identityValueKind so app-builder does not infer identity type from seed records.`,
    }];
  }
  return [];
}

function collectionTableRequirementIssuesForPreflight(
  targetRef: AppBuilderOntologyRowRef,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderSourceLoweringPreflightIssue[] {
  const unsupportedFeatures = appBuilderUnsupportedCollectionTableQueryFeatures(suppliedInputs);
  const issues: AppBuilderSourceLoweringPreflightIssue[] = unsupportedFeatures.map((feature) => ({
    issueKind: AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
    targetRef,
    collectionFeatureIds: [feature.featureId],
    fieldNames: feature.fieldNames,
    summary: `Collection Table source lowering cannot yet spend collection query feature '${feature.featureId}'; omit it or wait for the selection/service-query lowerer rung.`,
  }));
  const queryFeatures = appBuilderSourceLoweringCollectionQueryFeaturePayloads(suppliedInputs);
  const localSortingSelected = queryFeatures.some((feature) =>
    feature.featureId === AppBuilderCollectionFeatureId.LocalSorting
  );
  const tableColumns = appBuilderSourceLoweringCollectionTableColumnPayloads(suppliedInputs);
  if (localSortingSelected) {
    const sortableColumns = tableColumns.filter((column) => column.sortable === true && column.fieldName != null);
    if (sortableColumns.length === 0) {
      issues.push({
        issueKind: AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
        targetRef,
        collectionFeatureIds: [AppBuilderCollectionFeatureId.LocalSorting],
        summary: `Collection Table local sorting was selected, but no field-backed table column is marked sortable; add sortable CollectionTableColumns rows before requesting source lowering.`,
      });
    }
  }
  const localFilteringSelected = queryFeatures.some((feature) =>
    feature.featureId === AppBuilderCollectionFeatureId.LocalFiltering
  );
  if (localFilteringSelected) {
    const filterableColumns = tableColumns.filter((column) => column.filterable === true && column.fieldName != null);
    if (filterableColumns.length === 0) {
      issues.push({
        issueKind: AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
        targetRef,
        collectionFeatureIds: [AppBuilderCollectionFeatureId.LocalFiltering],
        summary: `Collection Table local filtering was selected, but no field-backed table column is marked filterable; add filterable CollectionTableColumns rows before requesting source lowering.`,
      });
    }
  }
  const localPaginationFeatures = queryFeatures.filter((feature) =>
    feature.featureId === AppBuilderCollectionFeatureId.LocalPagination
  );
  if (localPaginationFeatures.length > 1) {
    issues.push({
      issueKind: AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.LocalPagination],
      summary: `Collection Table local pagination received ${localPaginationFeatures.length} CollectionQueryFeatures rows; supply exactly one local pagination row for this first-ring source lowering surface.`,
    });
  } else if (localPaginationFeatures.length === 1 && localPaginationFeatures[0]!.pageSize == null) {
    issues.push({
      issueKind: AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.LocalPagination],
      summary: 'Collection Table local pagination needs CollectionQueryFeatures.pageSize; app-builder will not invent page size.',
    });
  }
  const rowSelectionFeatures = queryFeatures.filter((feature) =>
    feature.featureId === AppBuilderCollectionFeatureId.RowSelection
  );
  if (rowSelectionFeatures.length > 1) {
    issues.push({
      issueKind: AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.RowSelection],
      summary: `Collection Table row selection received ${rowSelectionFeatures.length} CollectionQueryFeatures rows; supply exactly one local row-selection row for this first-ring source lowering surface.`,
    });
  } else if (rowSelectionFeatures.length === 1) {
      const identityPolicies = appBuilderSourceLoweringCollectionIdentityPolicyPayloads(suppliedInputs)
        .filter((identityPolicy) =>
          identityPolicy.requiredBy == null
          || identityPolicy.requiredBy.length === 0
          || identityPolicy.requiredBy.includes(AppBuilderCollectionIdentityUse.RowSelection)
        );
    if (identityPolicies.length !== 1) {
      issues.push({
        issueKind: AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
        targetRef,
        inputFacetId: AppBuilderInputFacetId.CollectionIdentityPolicy,
        collectionFeatureIds: [AppBuilderCollectionFeatureId.RowSelection],
        summary: identityPolicies.length === 0
          ? 'Collection Table row selection needs one CollectionIdentityPolicy payload with mode scalar-field; app-builder will not infer a stable key for selection.'
          : `Collection Table row selection received ${identityPolicies.length} applicable CollectionIdentityPolicy payloads; supply exactly one for this first-ring source lowering surface.`,
      });
    } else {
      const identityPolicy = identityPolicies[0]!;
      const domainEntity = appBuilderSourceLoweringDomainEntityPayloads(suppliedInputs)[0] ?? null;
      const policyFieldName = normalizedSourceInputText(identityPolicy.fieldName);
      if (identityPolicy.mode !== AppBuilderCollectionIdentityMode.ScalarField) {
        issues.push({
          issueKind: AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
          targetRef,
          inputFacetId: AppBuilderInputFacetId.CollectionIdentityPolicy,
          collectionFeatureIds: [AppBuilderCollectionFeatureId.RowSelection],
          summary: `Collection Table row selection currently lowers only scalar-field identity; '${identityPolicy.mode}' remains deferred for richer selection policy.`,
        });
      } else if (domainEntity != null && policyFieldName != null && policyFieldName !== domainEntity.identityMemberName) {
        issues.push({
          issueKind: AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
          targetRef,
          inputFacetId: AppBuilderInputFacetId.CollectionIdentityPolicy,
          fieldNames: [policyFieldName, domainEntity.identityMemberName].filter((fieldName): fieldName is string => fieldName != null),
          collectionFeatureIds: [AppBuilderCollectionFeatureId.RowSelection],
          summary: `Collection Table row selection currently lowers only the domain identity member '${domainEntity.identityMemberName}'; custom scalar field '${policyFieldName}' remains deferred.`,
        });
      }
    }
  }
  const batchActionFeatures = queryFeatures.filter((feature) =>
    feature.featureId === AppBuilderCollectionFeatureId.BatchActions
  );
  if (batchActionFeatures.length > 1) {
    issues.push({
      issueKind: AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
      targetRef,
      collectionFeatureIds: [AppBuilderCollectionFeatureId.BatchActions],
      summary: `Collection Table batch actions received ${batchActionFeatures.length} CollectionQueryFeatures rows; supply exactly one local batch-actions row for this first-ring source lowering surface.`,
    });
  } else if (batchActionFeatures.length === 1) {
    if (rowSelectionFeatures.length !== 1) {
      issues.push({
        issueKind: AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
        targetRef,
        collectionFeatureIds: [AppBuilderCollectionFeatureId.BatchActions, AppBuilderCollectionFeatureId.RowSelection],
        summary: 'Collection Table batch actions build on explicit row selection; include exactly one RowSelection feature row before requesting batch action source lowering.',
      });
    }
    const batchIdentityPolicies = appBuilderSourceLoweringCollectionIdentityPolicyPayloads(suppliedInputs)
      .filter((identityPolicy) =>
        identityPolicy.requiredBy == null
        || identityPolicy.requiredBy.length === 0
        || identityPolicy.requiredBy.includes(AppBuilderCollectionIdentityUse.BatchAction)
      );
    if (batchIdentityPolicies.length !== 1) {
      issues.push({
        issueKind: AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
        targetRef,
        inputFacetId: AppBuilderInputFacetId.CollectionIdentityPolicy,
        collectionFeatureIds: [AppBuilderCollectionFeatureId.BatchActions],
        summary: batchIdentityPolicies.length === 0
          ? 'Collection Table batch actions need one CollectionIdentityPolicy payload that applies to batch-action; app-builder will not infer stable selection identity.'
          : `Collection Table batch actions received ${batchIdentityPolicies.length} applicable CollectionIdentityPolicy payloads; supply exactly one for this first-ring source lowering surface.`,
      });
    } else {
      const identityPolicy = batchIdentityPolicies[0]!;
      const domainEntity = appBuilderSourceLoweringDomainEntityPayloads(suppliedInputs)[0] ?? null;
      const policyFieldName = normalizedSourceInputText(identityPolicy.fieldName);
      if (identityPolicy.mode !== AppBuilderCollectionIdentityMode.ScalarField) {
        issues.push({
          issueKind: AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
          targetRef,
          inputFacetId: AppBuilderInputFacetId.CollectionIdentityPolicy,
          collectionFeatureIds: [AppBuilderCollectionFeatureId.BatchActions],
          summary: `Collection Table batch actions currently lower only scalar-field identity; '${identityPolicy.mode}' remains deferred for richer selection policy.`,
        });
      } else if (domainEntity != null && policyFieldName != null && policyFieldName !== domainEntity.identityMemberName) {
        issues.push({
          issueKind: AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement,
          targetRef,
          inputFacetId: AppBuilderInputFacetId.CollectionIdentityPolicy,
          fieldNames: [policyFieldName, domainEntity.identityMemberName].filter((fieldName): fieldName is string => fieldName != null),
          collectionFeatureIds: [AppBuilderCollectionFeatureId.BatchActions],
          summary: `Collection Table batch actions currently lower only the domain identity member '${domainEntity.identityMemberName}'; custom scalar field '${policyFieldName}' remains deferred.`,
        });
      }
    }
  }
  return issues;
}

function emptyTargetReadiness(
  descriptor: AppBuilderOntologyRowDescriptor,
): AppBuilderInputReadinessTargetRow {
  return {
    targetRef: descriptor.ref,
    title: descriptor.title,
    summary: descriptor.summary,
    inputDependencies: [],
    satisfiedCount: 0,
    missingRequiredCount: 0,
    missingRecommendedCount: 0,
    deferredCount: 0,
  };
}

function decisionText(
  availability: AppBuilderSourceLoweringAvailability,
  policySatisfaction: AppBuilderPolicySatisfactionRow,
  inputGateState: AppBuilderSourceLoweringInputGateState,
  targetRequirementIssues: readonly AppBuilderSourceLoweringPreflightIssue[],
  surfaceKinds: readonly AppBuilderSourceLoweringSurfaceKind[],
  sourceLoweringRequestFieldSummary: AppBuilderSourceLoweringRequestFieldSummary,
): string {
  if (availability === AppBuilderSourceLoweringAvailability.SourceLoweringImplemented) {
    if (surfaceKinds.length === 0) {
      return 'App-builder source lowering is marked implemented but no public source-lowering surface is registered for this target.';
    }
    if (policySatisfaction.state === AppBuilderPolicySatisfactionState.MissingExplicitSelection) {
      return `App-builder source lowering is implemented through ${surfaceKinds.join(', ')} but policy satisfaction is missing: ${policySatisfaction.summary}`;
    }
    if (targetRequirementIssues.length > 0) {
      return `App-builder source lowering is implemented through ${surfaceKinds.join(', ')} but target-specific source facts are missing or invalid: ${targetRequirementIssues.map((issue) => issue.summary).join(' ')}`;
    }
    const requiredRequestFieldText = requiredRequestFieldSummary(sourceLoweringRequestFieldSummary);
    return inputGateState === AppBuilderSourceLoweringInputGateState.Ready
      ? `App-builder source lowering is implemented through ${surfaceKinds.join(', ')} and supplied inputs are ready${requiredRequestFieldText == null ? '' : `; required request fields must still be supplied by surface: ${requiredRequestFieldText}`}.`
      : `App-builder source lowering is implemented through ${surfaceKinds.join(', ')} but input gate is '${inputGateState}'.`;
  }
  if (availability === AppBuilderSourceLoweringAvailability.NotImplemented) {
    return 'No app-builder source lowerer owns this row yet.';
  }
  return 'The requested target is not admitted into the app-builder ontology.';
}

function requiredRequestFieldSummary(
  sourceLoweringRequestFieldSummary: AppBuilderSourceLoweringRequestFieldSummary,
): string | null {
  if (!sourceLoweringRequestFieldSummary.hasRequiredRequestFields) {
    return null;
  }
  return sourceLoweringRequestFieldSummary.surfaces
    .filter((surface) => surface.requiredCount > 0)
    .map((surface) => {
      const names = surface.requiredRequestFieldNames ?? [];
      return names.length === 0
        ? `${surface.surfaceKind}(${surface.requiredCount} required)`
        : `${surface.surfaceKind}(${names.join(', ')})`;
    })
    .join('; ');
}
