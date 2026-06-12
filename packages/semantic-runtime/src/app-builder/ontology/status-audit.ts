import {
  APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS,
  appBuilderOntologyRowDescriptor,
  appBuilderOntologyRowRefKey,
  type AppBuilderOntologyRowDescriptor,
} from './row-descriptor.js';
import {
  type AppBuilderOntologyRowRef,
} from './relation.js';
import {
  APP_BUILDER_SOURCE_LOWERING_TARGET_ROWS,
  appBuilderSourceLoweringTargetRowForTarget,
  type AppBuilderSourceLoweringSurfaceKind,
} from './source-lowering-surface.js';
import {
  appBuilderSourceLoweringRequestFieldsForTarget,
  AppBuilderSourceLoweringRequestFieldRequirementKind,
} from './source-lowering-request-field.js';
import {
  AppBuilderOntologyReasonAuthority,
  AppBuilderRecommendationStatus,
  type AppBuilderOntologyStatus,
} from './status.js';
import {
  appBuilderDefaultingCandidateForTarget,
  appBuilderDefaultingCandidatePolicyIncludesTarget,
  appBuilderRecommendationAllowsDefaultingCandidate,
} from '../policy/defaulting-candidate-policy.js';

/** Status-audit disposition separating hard catalog drift from review-visible provisional rows. */
export enum AppBuilderStatusAuditDisposition {
  /** The status matrix contradicts registered ontology/source-lowering facts. */
  IntegrityIssue = 'integrity-issue',
  /** The row is intentionally visible but needs later operator/source review. */
  ReviewNeeded = 'review-needed',
}

/** Status-audit finding family for app-builder ontology rows. */
export enum AppBuilderStatusAuditFindingKind {
  /** An admitted descriptor claims it is not modeled. */
  AdmittedRowNotModeled = 'admitted-row-not-modeled',
  /** A row claims source-lowering support but no exact source-lowering surface is registered. */
  SourceLoweringStatusMissingSurface = 'source-lowering-status-missing-surface',
  /** A registered source-lowering surface points at a row whose status does not claim source-lowering support. */
  SourceLoweringSurfaceMissingStatus = 'source-lowering-surface-missing-status',
  /** A defaulting candidate has a recommendation posture that cannot be defaulted. */
  DefaultingCandidateNonDefaultableRecommendation = 'defaulting-candidate-non-defaultable-recommendation',
  /** A row claims no explicit input even though source-lowering request fields are required. */
  RequiredRequestFieldWithoutExplicitInputStatus = 'required-request-field-without-explicit-input-status',
  /** A row still carries to-be-determined status and should remain review-visible. */
  ToBeDeterminedStatus = 'to-be-determined-status',
  /** A to-be-determined row lacks the human note needed to explain why it remains provisional. */
  ToBeDeterminedStatusMissingNote = 'to-be-determined-status-missing-note',
}

/** Stable value list for status-audit finding transport schemas. */
export const APP_BUILDER_STATUS_AUDIT_FINDING_KINDS = [
  AppBuilderStatusAuditFindingKind.AdmittedRowNotModeled,
  AppBuilderStatusAuditFindingKind.SourceLoweringStatusMissingSurface,
  AppBuilderStatusAuditFindingKind.SourceLoweringSurfaceMissingStatus,
  AppBuilderStatusAuditFindingKind.DefaultingCandidateNonDefaultableRecommendation,
  AppBuilderStatusAuditFindingKind.RequiredRequestFieldWithoutExplicitInputStatus,
  AppBuilderStatusAuditFindingKind.ToBeDeterminedStatus,
  AppBuilderStatusAuditFindingKind.ToBeDeterminedStatusMissingNote,
] as const;

/** Stable value list for status-audit disposition transport schemas. */
export const APP_BUILDER_STATUS_AUDIT_DISPOSITIONS = [
  AppBuilderStatusAuditDisposition.IntegrityIssue,
  AppBuilderStatusAuditDisposition.ReviewNeeded,
] as const;

/** One status-matrix audit row over the app-builder ontology. */
export interface AppBuilderStatusAuditRow {
  /** Finding family that explains the status-matrix concern. */
  readonly findingKind: AppBuilderStatusAuditFindingKind;
  /** Whether this is hard catalog drift or a review-visible provisional row. */
  readonly disposition: AppBuilderStatusAuditDisposition;
  /** Exact ontology row, when the concern belongs to one row. */
  readonly targetRef?: AppBuilderOntologyRowRef;
  /** Current status attached to the row, when available. */
  readonly status?: AppBuilderOntologyStatus;
  /** Registered source-lowering surfaces for this exact target, when relevant. */
  readonly sourceLoweringSurfaceKinds?: readonly AppBuilderSourceLoweringSurfaceKind[];
  /** Compact maintainer/AI-facing explanation of the concern. */
  readonly summary: string;
}

/** Compact aggregate over app-builder status-audit rows and status-matrix counts. */
export interface AppBuilderStatusAuditSummary {
  /** Total admitted ontology row descriptors. */
  readonly rowCount: number;
  /** Rows whose status claims source-lowering support. */
  readonly sourceLoweringImplementedCount: number;
  /** Exact targets registered with at least one source-lowering surface. */
  readonly sourceLoweringSurfaceTargetCount: number;
  /** Rows currently admitted as local defaulting candidates. */
  readonly defaultingCandidateCount: number;
  /** Rows with to-be-determined reason authority. */
  readonly toBeDeterminedReasonAuthorityCount: number;
  /** Rows with to-be-determined recommendation posture. */
  readonly toBeDeterminedRecommendationCount: number;
  /** Hard status-audit issues that should make integrity partial. */
  readonly integrityIssueCount: number;
  /** Review-visible provisional rows that should stay discoverable without failing integrity. */
  readonly reviewNeededCount: number;
}

/** Audit the app-builder status matrix against source-lowering registry invariants and provisional rows. */
export function appBuilderStatusAuditRows(): readonly AppBuilderStatusAuditRow[] {
  const rows: AppBuilderStatusAuditRow[] = [];
  const sourceLoweringTargetKeys = new Set(
    APP_BUILDER_SOURCE_LOWERING_TARGET_ROWS.map((row) => appBuilderOntologyRowRefKey(row.targetRef)),
  );

  for (const descriptor of APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS) {
    rows.push(...statusAuditRowsForDescriptor(descriptor, sourceLoweringTargetKeys));
  }

  for (const sourceLoweringTarget of APP_BUILDER_SOURCE_LOWERING_TARGET_ROWS) {
    const descriptor = appBuilderOntologyRowDescriptor(sourceLoweringTarget.targetRef);
    if (descriptor == null || descriptor.declaredStatus.sourceLoweringImplemented) {
      continue;
    }
    rows.push({
      findingKind: AppBuilderStatusAuditFindingKind.SourceLoweringSurfaceMissingStatus,
      disposition: AppBuilderStatusAuditDisposition.IntegrityIssue,
      targetRef: sourceLoweringTarget.targetRef,
      status: descriptor.declaredStatus,
      sourceLoweringSurfaceKinds: sourceLoweringTarget.sourceLoweringSurfaceKinds,
      summary: `Source-lowering target '${sourceLoweringTarget.targetRef.kind}:${sourceLoweringTarget.targetRef.id}' is registered but its status does not claim sourceLoweringImplemented.`,
    });
  }

  return rows;
}

/** Summarize app-builder status-audit rows alongside status-matrix counts. */
export function appBuilderStatusAuditSummary(
  rows: readonly AppBuilderStatusAuditRow[] = appBuilderStatusAuditRows(),
): AppBuilderStatusAuditSummary {
  return {
    rowCount: APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS.length,
    sourceLoweringImplementedCount: APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS.filter((row) =>
      row.status.sourceLoweringImplemented
    ).length,
    sourceLoweringSurfaceTargetCount: APP_BUILDER_SOURCE_LOWERING_TARGET_ROWS.length,
    defaultingCandidateCount: APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS.filter((row) =>
      appBuilderDefaultingCandidateForTarget(row.ref, row.status.recommendationStatus)
    ).length,
    toBeDeterminedReasonAuthorityCount: APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS.filter((row) =>
      row.status.reasonAuthority === AppBuilderOntologyReasonAuthority.ToBeDetermined
    ).length,
    toBeDeterminedRecommendationCount: APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS.filter((row) =>
      row.status.recommendationStatus === AppBuilderRecommendationStatus.ToBeDetermined
    ).length,
    integrityIssueCount: rows.filter((row) => row.disposition === AppBuilderStatusAuditDisposition.IntegrityIssue).length,
    reviewNeededCount: rows.filter((row) => row.disposition === AppBuilderStatusAuditDisposition.ReviewNeeded).length,
  };
}

function statusAuditRowsForDescriptor(
  descriptor: AppBuilderOntologyRowDescriptor,
  sourceLoweringTargetKeys: ReadonlySet<string>,
): readonly AppBuilderStatusAuditRow[] {
  const rows: AppBuilderStatusAuditRow[] = [];
  const targetKey = appBuilderOntologyRowRefKey(descriptor.ref);
  const sourceLoweringTarget = appBuilderSourceLoweringTargetRowForTarget(descriptor.ref);

  if (!descriptor.status.modeled) {
    rows.push({
      findingKind: AppBuilderStatusAuditFindingKind.AdmittedRowNotModeled,
      disposition: AppBuilderStatusAuditDisposition.IntegrityIssue,
      targetRef: descriptor.ref,
      status: descriptor.status,
      summary: `Admitted ontology row '${descriptor.ref.kind}:${descriptor.ref.id}' has modeled=false.`,
    });
  }

  if (descriptor.declaredStatus.sourceLoweringImplemented && !sourceLoweringTargetKeys.has(targetKey)) {
    rows.push({
      findingKind: AppBuilderStatusAuditFindingKind.SourceLoweringStatusMissingSurface,
      disposition: AppBuilderStatusAuditDisposition.IntegrityIssue,
      targetRef: descriptor.ref,
      status: descriptor.declaredStatus,
      summary: `Ontology row '${descriptor.ref.kind}:${descriptor.ref.id}' claims sourceLoweringImplemented but has no registered source-lowering surface.`,
    });
  }

  if (appBuilderDefaultingCandidatePolicyIncludesTarget(descriptor.ref)
    && !appBuilderRecommendationAllowsDefaultingCandidate(descriptor.status.recommendationStatus)) {
    rows.push({
      findingKind: AppBuilderStatusAuditFindingKind.DefaultingCandidateNonDefaultableRecommendation,
      disposition: AppBuilderStatusAuditDisposition.IntegrityIssue,
      targetRef: descriptor.ref,
      status: descriptor.status,
      summary: `Ontology row '${descriptor.ref.kind}:${descriptor.ref.id}' is a defaultingCandidate but recommendationStatus='${descriptor.status.recommendationStatus}'.`,
    });
  }

  const requiredRequestFields = appBuilderSourceLoweringRequestFieldsForTarget(descriptor.ref)
    .filter((field) => field.requirementKind === AppBuilderSourceLoweringRequestFieldRequirementKind.Required);
  if (descriptor.status.sourceLoweringImplemented
    && !descriptor.status.requiresExplicitInput
    && requiredRequestFields.length > 0) {
    rows.push({
      findingKind: AppBuilderStatusAuditFindingKind.RequiredRequestFieldWithoutExplicitInputStatus,
      disposition: AppBuilderStatusAuditDisposition.IntegrityIssue,
      targetRef: descriptor.ref,
      status: descriptor.status,
      sourceLoweringSurfaceKinds: sourceLoweringTarget?.sourceLoweringSurfaceKinds,
      summary: `Ontology row '${descriptor.ref.kind}:${descriptor.ref.id}' claims requiresExplicitInput=false but source lowering has required request fields: ${requiredRequestFields.map((field) => field.requestFieldName).join(', ')}.`,
    });
  }

  if (hasToBeDeterminedStatus(descriptor.status)) {
    const missingNote = descriptor.status.note == null || descriptor.status.note.trim().length === 0;
    rows.push({
      findingKind: missingNote
        ? AppBuilderStatusAuditFindingKind.ToBeDeterminedStatusMissingNote
        : AppBuilderStatusAuditFindingKind.ToBeDeterminedStatus,
      disposition: AppBuilderStatusAuditDisposition.ReviewNeeded,
      targetRef: descriptor.ref,
      status: descriptor.status,
      sourceLoweringSurfaceKinds: sourceLoweringTarget?.sourceLoweringSurfaceKinds,
      summary: missingNote
        ? `Ontology row '${descriptor.ref.kind}:${descriptor.ref.id}' has to-be-determined status without an explanatory status note.`
        : `Ontology row '${descriptor.ref.kind}:${descriptor.ref.id}' still has to-be-determined status and should remain review-visible.`,
    });
  }

  return rows;
}

function hasToBeDeterminedStatus(
  status: AppBuilderOntologyStatus,
): boolean {
  return status.reasonAuthority === AppBuilderOntologyReasonAuthority.ToBeDetermined
    || status.recommendationStatus === AppBuilderRecommendationStatus.ToBeDetermined;
}
