import { createHash } from 'node:crypto';

import type { ProductDetailReadView } from '../kernel/product-details.js';
import type {
  KernelMaterializationReadView,
  KernelReadProjectionRevisionView,
} from '../kernel/store.js';
import type {
  TemplateCompilationFrontDoorEmission,
  TemplateResourceCompilationEmission,
} from './template-compilation-project-pass.js';
import type { BrowserEffectiveTemplateEmission } from './browser-effective-template-materializer.js';
import {
  TemplateCompilerAttributeDetachmentMutation,
  TemplateCompilerOccurrenceOperationTarget,
} from './template-compiler-execution.js';
import {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerCommentOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerFragmentOccurrence,
  type TemplateCompilerOccurrenceForest,
  TemplateCompilerTextOccurrence,
  type TemplateCompilerNodeOccurrence,
} from './template-compiler-occurrence.js';
import type { TemplateCompilerLiveAttributeOwnerResult } from './template-compiler-live-attribute-assembly.js';
import type { TemplateCompilerHydrateElementStagingResult } from './template-compiler-hydrate-element-staging.js';
import type { TemplateCompilerLiveAllocationSnapshot } from './template-compiler-live-allocation.js';
import {
  assembleTemplateCompilerOrdinaryRootRows,
  TemplateCompilerTextExpansionOutputKind,
  type TemplateCompilerOccurrenceRowAssembly,
} from './template-compiler-occurrence-row-assembly.js';
import {
  allocateTemplateCompilerOccurrenceTargetPlan,
  type TemplateCompilerOccurrenceTargetPlanAssembly,
} from './template-compiler-occurrence-target-plan.js';
import {
  allocateTemplateCompilerOccurrenceHydrateElements,
  type TemplateCompilerOccurrenceHydrateElementAllocationAssembly,
} from './template-compiler-occurrence-hydrate-element-allocation.js';
import {
  executeTemplateCompilerOccurrenceTarget,
  type TemplateCompilerOccurrenceTargetExecution,
} from './template-compiler-occurrence-target-execution.js';
import { templateInstructionSemanticSignature } from './instruction-ir.js';
import {
  executeTemplateCompilerRootSiteRun,
  TemplateCompilerRootSiteRunState,
} from './template-compiler-root-site-run.js';
import {
  type TemplateCompilerSiteCursorTranscript,
  TemplateCompilerSiteCursorTraversalMode,
} from './template-compiler-site-cursor.js';
import {
  TemplateCompilerSiteCursorAttributeEvent,
  TemplateCompilerSiteCursorContainerlessPlacementEvent,
  TemplateCompilerSiteCursorElementEvent,
  type TemplateCompilerSiteCursorEvent,
  TemplateCompilerSiteCursorFrontier,
  TemplateCompilerSiteCursorIgnoredNodeEvent,
  TemplateCompilerSiteCursorPhaseEvent,
  TemplateCompilerSiteCursorProcessContentEvent,
  TemplateCompilerSiteCursorSubtreeExclusionEvent,
  TemplateCompilerSiteCursorSurrogateValidationEvent,
  TemplateCompilerSiteCursorTextEvent,
} from './template-compiler-site-cursor-event.js';

export const enum TemplateCompilerRootSiteCursorObservationAdmissionState {
  GraphMismatch = 'graph-mismatch',
  HookOpen = 'hook-open',
  HookAbrupt = 'hook-abrupt',
  LocalRefused = 'local-refused',
  LocalAbrupt = 'local-abrupt',
  LocalExtractedUnsupported = 'local-extracted-unsupported',
  FamilyMissing = 'family-missing',
  RootBindingMismatch = 'root-binding-mismatch',
  CursorAdmissionMismatch = 'cursor-admission-mismatch',
  CursorTranscript = 'cursor-transcript',
}

export interface TemplateCompilerRootSiteCursorObservationCurrentness {
  readonly authorityScope: 'historical-site-cursor-prefix';
  readonly exact: boolean;
  readonly forestMutationRevisionDelta: number;
  readonly globalOperationCountDelta: number;
  readonly laneOperationCountDelta: number;
  readonly expectedForestMutationRevisionDelta: number;
  readonly expectedGlobalOperationCountDelta: number;
  readonly expectedLaneOperationCountDelta: number;
}

interface TemplateCompilerRootSiteCursorObservationBase {
  readonly admissionState: TemplateCompilerRootSiteCursorObservationAdmissionState;
  readonly reasonKinds: readonly string[];
  readonly graphState: string;
  readonly hookState: string | null;
  readonly hookBoundaryEntryOrdinal: number | null;
  readonly localState: string | null;
  readonly localCompletedExtractionCount: number | null;
  readonly localExtractedTemplateCount: number | null;
  readonly bindingState: string | null;
  readonly localIssueKind: string | null;
  readonly localFrameworkErrorCode: string | null;
  readonly authoredBundleCount: number;
}

export interface TemplateCompilerRootSiteCursorUnavailableObservation
  extends TemplateCompilerRootSiteCursorObservationBase {
  readonly admissionState: Exclude<
    TemplateCompilerRootSiteCursorObservationAdmissionState,
    TemplateCompilerRootSiteCursorObservationAdmissionState.CursorTranscript
  >;
}

export interface TemplateCompilerRootSiteCursorTranscriptObservation
  extends TemplateCompilerRootSiteCursorObservationBase {
  readonly admissionState: TemplateCompilerRootSiteCursorObservationAdmissionState.CursorTranscript;
  readonly reasonKinds: readonly [];
  readonly frontierKind: string | null;
  readonly frontierPhase: string | null;
  readonly eventKindCounts: Readonly<Record<string, number>>;
  readonly phaseKinds: readonly string[];
  readonly phaseCounts: Readonly<Record<string, number>>;
  readonly eventDigest: string;
  readonly rootStateKind: string;
  readonly hasSlots: boolean;
  readonly nativeSlotCount: number;
  readonly allocationState: string;
  readonly instructionAllocationCount: number;
  readonly expressionAllocationCount: number;
  readonly sourceAllocationCount: number;
  readonly completionState: string;
  readonly completionRefusalKinds: readonly string[];
  readonly completionReceiptPresent: boolean;
  readonly completedElementSiteCount: number;
  readonly completedTextSiteCount: number;
  readonly completedTextHoleCount: number;
  readonly completedRowSiteCount: number;
  readonly siteOperationCount: number;
  readonly completionCompilerReadCount: number;
  readonly occurrenceRowAssemblyState: string;
  readonly occurrenceRowAssemblyReasonKinds: readonly string[];
  readonly occurrenceRowCount: number;
  readonly occurrenceStaticSiteCount: number;
  readonly occurrenceMembershipCount: number;
  readonly occurrenceInstructionKindCounts: Readonly<Record<string, number>>;
  readonly occurrenceRowInstructionTargets: readonly (readonly (string | null)[])[];
  readonly occurrenceRowInstructionSignatures: readonly (readonly (readonly unknown[])[])[];
  readonly occurrenceSourcePostureCounts: Readonly<Record<string, number>>;
  readonly occurrenceCaptureDecisionCounts: Readonly<Record<string, number>>;
  readonly occurrenceAttributeDispositionCounts: Readonly<Record<string, number>>;
  readonly occurrenceTextExpansionCount: number;
  readonly occurrenceTextExpansionOutputCount: number;
  readonly occurrencePrePlanEffectState: string | null;
  readonly occurrenceRowDigest: string | null;
  readonly occurrenceHydrateElementAllocationState: string;
  readonly occurrenceHydrateElementAllocationReasonKinds: readonly string[];
  readonly occurrenceHydrateElementHeadCount: number;
  readonly occurrenceHydrateElementReusedCaptureCount: number;
  readonly occurrenceHydrateElementEffectiveCaptureCount: number;
  readonly occurrenceHydrateElementAllocationDigest: string | null;
  readonly occurrenceTargetPlanState: string;
  readonly occurrenceTargetPlanReasonKinds: readonly string[];
  readonly occurrenceTargetPlanRowCount: number;
  readonly occurrenceTargetPlanMembershipCount: number;
  readonly occurrenceTargetPlanStableRowKeys: readonly string[];
  readonly occurrenceTargetPlanFreshRoot: boolean | null;
  readonly occurrenceTargetPlanDigest: string | null;
  readonly occurrenceTargetPublicationPrerequisiteCounts: Readonly<Record<string, number>>;
  readonly occurrenceTargetAttachmentPresent: boolean;
  readonly occurrenceTargetAttachmentContextCount: number;
  readonly occurrenceTargetAttachmentStructuralPlanCount: number;
  readonly occurrenceTargetAttachmentInvocationPhase: string | null;
  readonly occurrenceTargetAttachmentConsumedPrePlanAuthority: boolean | null;
  readonly occurrenceTargetAttachmentCurrentBeforeExecution: boolean | null;
  readonly occurrenceTargetAttachmentCurrentAfterExecution: boolean | null;
  readonly occurrenceTargetAttachmentForestMutationRevisionDelta: number;
  readonly occurrenceTargetAttachmentGlobalOperationCountDelta: number;
  readonly occurrenceTargetAttachmentLaneOperationCountDelta: number;
  readonly occurrenceTargetExecutionPresent: boolean;
  readonly occurrenceTargetExecutionOperationCount: number;
  readonly occurrenceTargetExecutionOperationKindCounts: Readonly<Record<string, number>>;
  readonly occurrenceTargetExecutionAttributeDispositionCount: number;
  readonly occurrenceTargetExecutionTextExpansionCount: number;
  readonly occurrenceTargetExecutionGeometryCount: number;
  readonly occurrenceTargetExecutionInvocationPhase: string | null;
  readonly occurrenceTargetExecutionSealed: boolean;
  readonly occurrenceTargetExecutionForestMutationRevisionDelta: number;
  readonly occurrenceTargetExecutionGlobalOperationCountDelta: number;
  readonly occurrenceTargetExecutionLaneOperationCountDelta: number;
  readonly occurrenceTargetExecutionDigest: string | null;
  readonly ledgerState: string;
  readonly spendDispositionCounts: Readonly<Record<string, number>>;
  readonly remainderKindCounts: Readonly<Record<string, number>>;
  readonly occurrenceOnlyDispositionCounts: Readonly<Record<string, number>>;
  readonly spendCount: number;
  readonly remainderCount: number;
  readonly rawUnspentCount: number;
  readonly blockedByFrontierCount: number;
  readonly conflictCount: number;
  readonly nextTranscriptOrdinal: number;
  readonly nextSiteEventOrdinal: number;
  readonly currentness: TemplateCompilerRootSiteCursorObservationCurrentness;
}

/** Portable plain-data observation; it retains no executable compiler, forest, read, or binding authority. */
export type TemplateCompilerRootSiteCursorObservation =
  | TemplateCompilerRootSiteCursorUnavailableObservation
  | TemplateCompilerRootSiteCursorTranscriptObservation;

export interface TemplateCompilerRootSiteCursorObservationRequest {
  readonly observationKey: string;
  readonly compilation: TemplateResourceCompilationEmission;
  readonly browserEmission: BrowserEffectiveTemplateEmission;
  readonly currentFrontDoor: TemplateCompilationFrontDoorEmission;
  /** Current committed/candidate read authority used by paired compiler-service receipts. */
  readonly compilerReadStore: Pick<KernelMaterializationReadView, 'readMaterializationsByOwner'>
    & ProductDetailReadView
    & KernelReadProjectionRevisionView;
}

/**
 * Run the exact root-only bootstrap/cursor pipeline and project it to portable data before the run context retires.
 *
 * This is compiler-conservation observation, not JIT equivalence, AOT eligibility, or an obligation result.
 */
export function observeTemplateCompilerRootSiteCursor(
  request: TemplateCompilerRootSiteCursorObservationRequest,
): TemplateCompilerRootSiteCursorObservation {
  const run = executeTemplateCompilerRootSiteRun({
    runKey: `root-site-cursor-observation:${request.observationKey}`,
    compilation: request.compilation,
    browserEmission: request.browserEmission,
    currentFrontDoor: request.currentFrontDoor,
    compilerReadStore: request.compilerReadStore,
    traversalMode: TemplateCompilerSiteCursorTraversalMode.CompatibilityStop,
  });
  if (!run.isTranscript()) {
    const admissionState = observationAdmissionState(run.state);
    return unavailable(
      admissionState,
      run.reasons.map((reason) => reason.reasonKind),
      run.graphExact.state,
      run.hook?.state ?? null,
      run.local?.state ?? null,
      run.binding?.state ?? null,
      run.authoredBundleCount,
      run.local?.failure?.issueKind ?? null,
      run.local?.failure?.frameworkErrorCode ?? null,
      run.hook?.boundaryEntryOrdinal ?? null,
      run.local?.completedExtractions.length ?? null,
      run.state === TemplateCompilerRootSiteRunState.LocalExtractedUnsupported
        ? run.local?.completedExtractions.length ?? 0
        : 0,
    );
  }
  const graphExact = run.graphExact;
  const authoredBundleCount = run.authoredBundleCount;
  const forest = run.forest!;
  const execution = run.execution!;
  const lane = run.lane!;
  const hook = run.hook!;
  const local = run.local!;
  const binding = run.binding!;
  const cursor = run.cursor!;

  const transcript = cursor.transcript!;
  const completion = cursor.completion;
  if (completion == null) {
    throw new Error('Cursor transcript observation lost its ordinary-root completion decision.');
  }
  const completionReceipt = completion.receipt;
  const occurrenceRows = completionReceipt == null
    ? null
    : assembleTemplateCompilerOrdinaryRootRows(completionReceipt);
  const occurrenceAssembly = occurrenceRows?.assembly ?? null;
  const occurrenceHydrateElements = occurrenceAssembly == null
    ? null
    : allocateTemplateCompilerOccurrenceHydrateElements(occurrenceAssembly);
  const hydrateElementAssembly = occurrenceHydrateElements?.assembly ?? null;
  const occurrenceTargetPlan = occurrenceAssembly == null
    ? null
    : allocateTemplateCompilerOccurrenceTargetPlan(occurrenceAssembly, hydrateElementAssembly);
  const targetPlanAssembly = occurrenceTargetPlan?.assembly ?? null;
  const attachmentStartForestMutationRevision = forest.mutationRevision;
  const attachmentStartGlobalOperationCount = execution.sequence.readOperations().length;
  const attachmentStartLaneOperationCount = execution.sequence.readLaneOperations(lane).length;
  const occurrenceTargetAttachment = targetPlanAssembly == null
    ? null
    : execution.attachOccurrenceTargetPlan(targetPlanAssembly);
  if (occurrenceTargetAttachment != null) execution.assertCoherent();
  const attachmentEndForestMutationRevision = forest.mutationRevision;
  const attachmentEndGlobalOperationCount = execution.sequence.readOperations().length;
  const attachmentEndLaneOperationCount = execution.sequence.readLaneOperations(lane).length;
  const attachmentInvocationPhase = occurrenceTargetAttachment == null
    ? null
    : execution.invocationPhase(lane);
  const attachmentConsumedPrePlanAuthority = occurrenceTargetAttachment == null
    ? null
    : !completionReceipt!.isCurrent()
      && !execution.siteExecutionEndpointIsCurrent(completionReceipt!.endpoint)
      && !targetPlanAssembly!.isCurrent();
  const attachmentCurrentBeforeExecution = occurrenceTargetAttachment?.isCurrent() ?? null;
  const occurrenceTargetExecution = occurrenceTargetAttachment == null
    ? null
    : executeTemplateCompilerOccurrenceTarget(occurrenceTargetAttachment);
  if (occurrenceTargetExecution != null) execution.seal();
  const attachmentCurrentAfterExecution = occurrenceTargetAttachment?.isCurrent() ?? null;
  const eventKindCounts: Record<string, number> = {};
  const phaseKinds: string[] = [];
  const phaseCounts: Record<string, number> = {};
  for (const event of transcript.events) {
    increment(eventKindCounts, event.eventKind);
    if (event instanceof TemplateCompilerSiteCursorPhaseEvent) {
      phaseKinds.push(event.phaseKind);
      increment(phaseCounts, event.phaseKind);
    }
  }
  const forestMutationRevisionDelta = transcript.endForestMutationRevision
    - transcript.startForestMutationRevision;
  const globalOperationCountDelta = transcript.endGlobalOperationCount
    - transcript.startGlobalOperationCount;
  const laneOperationCountDelta = transcript.endLaneOperationCount
    - transcript.startLaneOperationCount;
  const expectedForestMutationRevisionDelta = transcript.expectedEndForestMutationRevision
    - transcript.startForestMutationRevision;
  const expectedGlobalOperationCountDelta = transcript.expectedEndGlobalOperationCount
    - transcript.startGlobalOperationCount;
  const expectedLaneOperationCountDelta = transcript.expectedEndLaneOperationCount
    - transcript.startLaneOperationCount;
  return {
    admissionState: TemplateCompilerRootSiteCursorObservationAdmissionState.CursorTranscript,
    reasonKinds: [],
    graphState: graphExact.state,
    hookState: hook.state,
    hookBoundaryEntryOrdinal: hook.boundaryEntryOrdinal,
    localState: local.state,
    localCompletedExtractionCount: local.completedExtractions.length,
    localExtractedTemplateCount: 0,
    bindingState: binding.state,
    localIssueKind: null,
    localFrameworkErrorCode: null,
    frontierKind: transcript.frontier?.frontierKind ?? null,
    frontierPhase: transcript.frontier?.phaseKind ?? null,
    eventKindCounts,
    phaseKinds,
    phaseCounts,
    eventDigest: cursorEventDigest(
      transcript.events,
      transcript.attributeOwners,
      transcript.hydrateElementEnvelopes,
      transcript.rootState,
      transcript.allocationSnapshot,
      transcript.binding.forest,
    ),
    rootStateKind: transcript.rootState.stateKind,
    hasSlots: transcript.rootState.hasSlots,
    nativeSlotCount: transcript.rootState.nativeSlots.length,
    allocationState: transcript.allocationSnapshot.state,
    instructionAllocationCount: transcript.allocationSnapshot.instructionAllocations.length,
    expressionAllocationCount: transcript.allocationSnapshot.expressionAllocations.length,
    sourceAllocationCount: transcript.allocationSnapshot.sourceAllocations.length,
    completionState: completion.state,
    completionRefusalKinds: completion.refusals.map((refusal) => refusal.refusalKind),
    completionReceiptPresent: completionReceipt != null,
    completedElementSiteCount: completionReceipt?.elementSites.length ?? 0,
    completedTextSiteCount: completionReceipt?.textSites.length ?? 0,
    completedTextHoleCount: completionReceipt?.textSites.reduce(
      (count, site) => count + site.holeSlotKeys.length,
      0,
    ) ?? 0,
    completedRowSiteCount: completionReceipt == null
      ? 0
      : completionReceipt.elementSites.filter((site) => site.rowRequired).length
        + completionReceipt.textSites.reduce((count, site) => count + site.holeSlotKeys.length, 0),
    siteOperationCount: cursor.siteEndpoint?.siteOperations.length ?? 0,
    completionCompilerReadCount: completionReceipt?.compilerReads.length ?? 0,
    occurrenceRowAssemblyState: occurrenceRows?.state ?? 'not-applicable',
    occurrenceRowAssemblyReasonKinds: occurrenceRows?.reasons.map((reason) => reason.reasonKind) ?? [],
    occurrenceRowCount: occurrenceAssembly?.rows.length ?? 0,
    occurrenceStaticSiteCount: occurrenceAssembly?.staticSites.length ?? 0,
    occurrenceMembershipCount: occurrenceAssembly == null
      ? 0
      : 1 + occurrenceAssembly.occurrenceMemberships.length,
    occurrenceInstructionKindCounts: counts(
      occurrenceAssembly?.rows.flatMap((row) => row.instructionKinds) ?? [],
    ),
    occurrenceRowInstructionTargets: occurrenceAssembly?.rows.map((row) => row.instructionTargets) ?? [],
    occurrenceRowInstructionSignatures: occurrenceAssembly?.rows.map((row) =>
      row.instructionSemanticSignatures
    ) ?? [],
    occurrenceSourcePostureCounts: counts([
      ...(occurrenceAssembly?.rows.map((row) => row.sourcePosture) ?? []),
      ...(occurrenceAssembly?.staticSites.map((site) => site.sourcePosture) ?? []),
    ]),
    occurrenceCaptureDecisionCounts: counts(occurrenceAssembly?.captureSyntaxDecisionKinds ?? []),
    occurrenceAttributeDispositionCounts: counts(
      occurrenceAssembly?.attributeDispositions.map((disposition) => disposition.disposition) ?? [],
    ),
    occurrenceTextExpansionCount: occurrenceAssembly?.textExpansions.length ?? 0,
    occurrenceTextExpansionOutputCount: occurrenceAssembly?.textExpansions.reduce(
      (count, expansion) => count + expansion.outputs.length,
      0,
    ) ?? 0,
    occurrencePrePlanEffectState: occurrenceAssembly?.prePlanEffectState ?? null,
    occurrenceRowDigest: occurrenceAssembly == null ? null : occurrenceRowDigest(occurrenceAssembly),
    occurrenceHydrateElementAllocationState: occurrenceHydrateElements?.state ?? 'not-applicable',
    occurrenceHydrateElementAllocationReasonKinds:
      occurrenceHydrateElements?.reasons.map((reason) => reason.reasonKind) ?? [],
    occurrenceHydrateElementHeadCount: hydrateElementAssembly?.heads.length ?? 0,
    occurrenceHydrateElementReusedCaptureCount: hydrateElementAssembly?.heads.reduce(
      (count, head) => count + head.captures.filter((capture) => capture.effectiveReservation == null).length,
      0,
    ) ?? 0,
    occurrenceHydrateElementEffectiveCaptureCount: hydrateElementAssembly?.heads.reduce(
      (count, head) => count + head.captures.filter((capture) => capture.effectiveReservation != null).length,
      0,
    ) ?? 0,
    occurrenceHydrateElementAllocationDigest: hydrateElementAssembly == null
      ? null
      : occurrenceHydrateElementAllocationDigest(hydrateElementAssembly),
    occurrenceTargetPlanState: occurrenceTargetPlan?.state ?? 'not-applicable',
    occurrenceTargetPlanReasonKinds: occurrenceTargetPlan?.reasons.map((reason) => reason.reasonKind) ?? [],
    occurrenceTargetPlanRowCount: targetPlanAssembly?.targetPlan.root.readRows().length ?? 0,
    occurrenceTargetPlanMembershipCount: targetPlanAssembly?.targetPlan.root.readOccurrenceMemberships().length ?? 0,
    occurrenceTargetPlanStableRowKeys: targetPlanAssembly?.targetPlan.root.readRows().map((row) =>
      row.stableSlotKey
    ) ?? [],
    occurrenceTargetPlanFreshRoot: targetPlanAssembly == null
      ? null
      : targetPlanAssembly.rootCompiledTemplate.productHandle
        !== transcript.binding.compilation.compiledTemplate.compiledTemplate.productHandle,
    occurrenceTargetPlanDigest: targetPlanAssembly == null ? null : occurrenceTargetPlanDigest(targetPlanAssembly),
    occurrenceTargetPublicationPrerequisiteCounts: counts(
      targetPlanAssembly?.publicationPrerequisites.map((entry) => entry.prerequisiteKind) ?? [],
    ),
    occurrenceTargetAttachmentPresent: occurrenceTargetAttachment != null,
    occurrenceTargetAttachmentContextCount: occurrenceTargetAttachment?.contexts.length ?? 0,
    occurrenceTargetAttachmentStructuralPlanCount:
      occurrenceTargetAttachment?.structuralExecution.readTargetPlans().length ?? 0,
    occurrenceTargetAttachmentInvocationPhase: attachmentInvocationPhase,
    occurrenceTargetAttachmentConsumedPrePlanAuthority: attachmentConsumedPrePlanAuthority,
    occurrenceTargetAttachmentCurrentBeforeExecution: attachmentCurrentBeforeExecution,
    occurrenceTargetAttachmentCurrentAfterExecution: attachmentCurrentAfterExecution,
    occurrenceTargetAttachmentForestMutationRevisionDelta:
      attachmentEndForestMutationRevision - attachmentStartForestMutationRevision,
    occurrenceTargetAttachmentGlobalOperationCountDelta:
      attachmentEndGlobalOperationCount - attachmentStartGlobalOperationCount,
    occurrenceTargetAttachmentLaneOperationCountDelta:
      attachmentEndLaneOperationCount - attachmentStartLaneOperationCount,
    occurrenceTargetExecutionPresent: occurrenceTargetExecution != null,
    occurrenceTargetExecutionOperationCount: occurrenceTargetExecution?.operations.length ?? 0,
    occurrenceTargetExecutionOperationKindCounts: counts(
      occurrenceTargetExecution?.operations.map((operation) => operation.operationKind) ?? [],
    ),
    occurrenceTargetExecutionAttributeDispositionCount:
      occurrenceTargetExecution?.attributeDispositions.length ?? 0,
    occurrenceTargetExecutionTextExpansionCount: occurrenceTargetExecution?.textExpansions.length ?? 0,
    occurrenceTargetExecutionGeometryCount: occurrenceTargetExecution?.targetGeometries.length ?? 0,
    occurrenceTargetExecutionInvocationPhase: occurrenceTargetExecution == null
      ? null
      : execution.invocationPhase(lane),
    occurrenceTargetExecutionSealed: occurrenceTargetExecution != null && execution.isSealed,
    occurrenceTargetExecutionForestMutationRevisionDelta:
      forest.mutationRevision - attachmentEndForestMutationRevision,
    occurrenceTargetExecutionGlobalOperationCountDelta:
      execution.sequence.readOperations().length - attachmentEndGlobalOperationCount,
    occurrenceTargetExecutionLaneOperationCountDelta:
      execution.sequence.readLaneOperations(lane).length - attachmentEndLaneOperationCount,
    occurrenceTargetExecutionDigest: occurrenceTargetExecution == null
      ? null
      : occurrenceTargetExecutionDigest(occurrenceTargetExecution),
    ledgerState: transcript.ledger.state,
    spendDispositionCounts: counts(transcript.ledger.spends.map((spend) => spend.disposition)),
    remainderKindCounts: counts(
      transcript.ledger.authoredRemainderEvidence.map((evidence) => evidence.reasonKind),
    ),
    occurrenceOnlyDispositionCounts: counts(
      transcript.ledger.occurrenceOnlyRows.map((row) => row.disposition),
    ),
    authoredBundleCount,
    spendCount: transcript.ledger.spends.length,
    remainderCount: transcript.ledger.authoredRemainderEvidence.length,
    rawUnspentCount: transcript.ledger.rawUnspent.length,
    blockedByFrontierCount: transcript.ledger.blockedByFrontier.length,
    conflictCount: transcript.ledger.conflicts.length,
    nextTranscriptOrdinal: transcript.nextTranscriptOrdinal,
    nextSiteEventOrdinal: transcript.nextSiteEventOrdinal,
    currentness: {
      authorityScope: 'historical-site-cursor-prefix',
      exact: transcript.endForestMutationRevision === transcript.expectedEndForestMutationRevision
        && transcript.endGlobalOperationCount === transcript.expectedEndGlobalOperationCount
        && transcript.endLaneOperationCount === transcript.expectedEndLaneOperationCount,
      forestMutationRevisionDelta,
      globalOperationCountDelta,
      laneOperationCountDelta,
      expectedForestMutationRevisionDelta,
      expectedGlobalOperationCountDelta,
      expectedLaneOperationCountDelta,
    },
  };
}

function occurrenceRowDigest(assembly: TemplateCompilerOccurrenceRowAssembly): string {
  const hash = createHash('sha256');
  const encoded = JSON.stringify([
    assembly.prePlanEffectState,
    [
      assembly.rootMembership.stableSlotKey,
      assembly.rootMembership.compilerCarrier.occurrenceKey,
      assembly.rootMembership.compilerContent.occurrenceKey,
      assembly.rootMembership.authoredNode?.productHandle ?? null,
    ],
    assembly.occurrenceMemberships.map((membership) => [
      membership.stableSlotKey,
      membership.occurrence.occurrenceKey,
      membership.authoredNode?.productHandle ?? null,
      membership.sourcePosture,
    ]),
    assembly.attributeDispositions.map((disposition) => [
      disposition.stableSlotKey,
      disposition.attribute.occurrenceKey,
      disposition.disposition,
      disposition.originalForestOrdinal,
      disposition.simulatedLiveOrdinal,
      disposition.causeHandles,
    ]),
    assembly.rows.map((row) => [
      row.stableSlotKey,
      row.ordinal,
      row.projectedTargetOrdinal,
      row.targetKind,
      row.placementKind,
      row.occurrence.occurrenceKey,
      row.sourcePosture,
      row.instructionSemanticSignatures,
      row.instructionTargets,
    ]),
    assembly.staticSites.map((site) => [
      site.site.siteKind,
      site.site.event.ordinal,
      site.site.siteKind === 'element'
        ? site.site.event.element.occurrenceKey
        : site.site.event.text.occurrenceKey,
      site.sourcePosture,
    ]),
    assembly.textExpansions.map((expansion) => [
      expansion.stableSlotKey,
      expansion.site.event.text.occurrenceKey,
      expansion.outputs.map((output) => output.outputKind === TemplateCompilerTextExpansionOutputKind.Static
        ? [output.outputKind, output.stableSlotKey, output.outputOrdinal, output.partIndex, output.text]
        : [
            output.outputKind,
            output.stableSlotKey,
            output.outputOrdinal,
            output.holeIndex,
            output.hole.expressionChainIndex,
            output.hole.instruction.instructionKind,
          ]),
    ]),
  ]);
  hash.update(encoded);
  return `sha256:${hash.digest('hex')}`;
}

function occurrenceTargetPlanDigest(assembly: TemplateCompilerOccurrenceTargetPlanAssembly): string {
  const encoded = JSON.stringify([
    assembly.targetPlan.localKey,
    assembly.rootReservation.role,
    assembly.targetPlan.root.state,
    assembly.targetPlan.root.projectedTargetCount,
    assembly.targetPlan.root.readOccurrenceMemberships().map((membership) => [
      membership.stableSlotKey,
      membership.ordinal,
      membership.occurrence.occurrenceKey,
      membership.inputNode?.productHandle ?? null,
      membership.authoredNode?.productHandle ?? null,
    ]),
    assembly.targetPlan.root.readRows().map((row) => [
      row.stableSlotKey,
      row.publicationLocalKey,
      row.ordinal,
      row.projectedTargetOrdinal,
      row.projectedTargetCount,
      row.targetKind,
      row.placement.placementKind,
      row.sourceKind,
      row.expressionChainIndex,
      row.inputNode?.productHandle ?? null,
      row.node?.productHandle ?? null,
      row.instructions.map(templateInstructionSemanticSignature),
    ]),
    assembly.attributeDispositionMappings.map((mapping) => [
      mapping.draft.stableSlotKey,
      mapping.causeHandles,
    ]),
    assembly.publicationPrerequisites.map((entry) => [
      entry.prerequisiteKind,
      'capture' in entry ? entry.capture.draft.stableSlotKey : entry.hydrateElement.row.stableSlotKey,
      'capture' in entry ? entry.capture.productHandle : entry.hydrateElement.instruction.productHandle,
    ]),
  ]);
  return `sha256:${createHash('sha256').update(encoded).digest('hex')}`;
}

function occurrenceHydrateElementAllocationDigest(
  assembly: TemplateCompilerOccurrenceHydrateElementAllocationAssembly,
): string {
  const encoded = JSON.stringify([
    assembly.allocation.ledger.rootSiteKey,
    assembly.heads.map((head) => [
      head.row.stableSlotKey,
      head.head.instructionSlotKey,
      head.instructionAllocation.siteKey,
      head.instructionAllocation.local,
      head.instructionAllocation.instructionLocal,
      templateInstructionSemanticSignature(head.instruction),
      head.captures.map((capture) => [
        capture.draft.stableSlotKey,
        capture.draft.decisionKind,
        capture.productHandle,
        capture.draft.authoredSyntax?.productHandle ?? null,
        capture.effectiveReservation?.productHandle ?? null,
        capture.effectiveReservation?.identityHandle ?? null,
      ]),
    ]),
  ]);
  return `sha256:${createHash('sha256').update(encoded).digest('hex')}`;
}

function occurrenceTargetExecutionDigest(execution: TemplateCompilerOccurrenceTargetExecution): string {
  const structural = execution.attachment.structuralExecution;
  const encoded = JSON.stringify([
    execution.operations.map((operation) => [
      operation.operationKey,
      operation.operationKind,
      operation.executionMechanism,
      operation.target instanceof TemplateCompilerOccurrenceOperationTarget
        ? operation.target.occurrence.occurrenceKey
        : operation.target.targetKind,
      operation.causeHandles,
      operation.sourceAddressHandle,
      operation.startForestMutationRevision,
      operation.endForestMutationRevision,
      operation.mutationBatch.occurrenceGenerationReservations.map(generationProjection),
      operation.mutationBatch.topologyMutations.map((mutation) =>
        mutation instanceof TemplateCompilerAttributeDetachmentMutation
          ? ['attribute', mutation.eventOrdinal, mutation.attribute.occurrenceKey,
              mutation.previousOwner.occurrenceKey, mutation.previousOrdinal]
          : ['node', mutation.eventOrdinal, mutation.node.occurrenceKey,
              mutation.previousParent?.occurrenceKey ?? null, mutation.previousEdgeKind, mutation.previousOrdinal]
      ),
    ]),
    execution.attributeDispositions.map((disposition) => [
      disposition.attribute.occurrenceKey,
      disposition.owner.occurrenceKey,
      disposition.ownerOrdinal,
      disposition.eventOrdinal,
      disposition.causeHandles,
    ]),
    execution.textExpansions.map((expansion) => [
      expansion.input.occurrenceKey,
      expansion.sourceParent.occurrenceKey,
      expansion.sourceOrdinal,
      expansion.outputs.map((output) => [
        output.occurrenceKey,
        output.text,
        generationProjection(output.generation),
      ]),
      expansion.causeHandles,
    ]),
    execution.targetGeometries.map((geometry) => [
      geometry.geometryKind,
      geometry.row.stableSlotKey,
      geometry.placement.placementKind,
      geometry.marker.occurrenceKey,
      generationProjection(geometry.marker.generation),
      geometry.logicalTarget.occurrenceKey,
    ]),
    execution.attachment.execution.forest.readRoots().map(occurrenceProjection),
    [
      execution.closure.forestMutationRevision,
      execution.closure.globalOperationCount,
      execution.closure.laneOperationCount,
      structural.readConsumedNodeDispositions().length,
      structural.readInputNodeTransfers().length,
    ],
  ]);
  return `sha256:${createHash('sha256').update(encoded).digest('hex')}`;
}

function generationProjection(
  generation: TemplateCompilerNodeOccurrence['generation'],
): readonly unknown[] | null {
  return generation == null ? null : [
    generation.contextKey,
    generation.operationKey,
    generation.batchOperationKey,
    generation.role,
    generation.causeHandles,
    generation.outputOrdinal,
  ];
}

function occurrenceProjection(node: TemplateCompilerNodeOccurrence): readonly unknown[] {
  const children = node.readChildren().map(occurrenceProjection);
  if (node instanceof TemplateCompilerFragmentOccurrence) {
    return ['fragment', node.occurrenceKey, generationProjection(node.generation), children];
  }
  if (node instanceof TemplateCompilerElementOccurrence) {
    return [
      'element',
      node.occurrenceKey,
      node.tagName,
      node.namespace,
      generationProjection(node.generation),
      node.readAttributes().map((attribute) => [
        attribute.occurrenceKey,
        attribute.name,
        attribute.namespaceUri,
        attribute.prefix,
        attribute.value,
        generationProjection(attribute.generation),
      ]),
      children,
      node.templateContent == null ? null : occurrenceProjection(node.templateContent),
    ];
  }
  if (node instanceof TemplateCompilerTextOccurrence) {
    return ['text', node.occurrenceKey, node.text, generationProjection(node.generation)];
  }
  if (node instanceof TemplateCompilerCommentOccurrence) {
    return ['comment', node.occurrenceKey, node.text, node.semanticKind, generationProjection(node.generation)];
  }
  return ['unknown', node.occurrenceKey, node.nodeKind, generationProjection(node.generation), children];
}

function observationAdmissionState(
  state: TemplateCompilerRootSiteRunState,
): Exclude<
  TemplateCompilerRootSiteCursorObservationAdmissionState,
  TemplateCompilerRootSiteCursorObservationAdmissionState.CursorTranscript
> {
  switch (state) {
    case TemplateCompilerRootSiteRunState.GraphMismatch:
      return TemplateCompilerRootSiteCursorObservationAdmissionState.GraphMismatch;
    case TemplateCompilerRootSiteRunState.HookOpen:
      return TemplateCompilerRootSiteCursorObservationAdmissionState.HookOpen;
    case TemplateCompilerRootSiteRunState.HookAbrupt:
      return TemplateCompilerRootSiteCursorObservationAdmissionState.HookAbrupt;
    case TemplateCompilerRootSiteRunState.LocalRefused:
      return TemplateCompilerRootSiteCursorObservationAdmissionState.LocalRefused;
    case TemplateCompilerRootSiteRunState.LocalAbrupt:
      return TemplateCompilerRootSiteCursorObservationAdmissionState.LocalAbrupt;
    case TemplateCompilerRootSiteRunState.LocalExtractedUnsupported:
      return TemplateCompilerRootSiteCursorObservationAdmissionState.LocalExtractedUnsupported;
    case TemplateCompilerRootSiteRunState.FamilyMissing:
      return TemplateCompilerRootSiteCursorObservationAdmissionState.FamilyMissing;
    case TemplateCompilerRootSiteRunState.BindingMismatch:
      return TemplateCompilerRootSiteCursorObservationAdmissionState.RootBindingMismatch;
    case TemplateCompilerRootSiteRunState.CursorMismatch:
      return TemplateCompilerRootSiteCursorObservationAdmissionState.CursorAdmissionMismatch;
    case TemplateCompilerRootSiteRunState.CursorTranscript:
      throw new Error('Exact root-site run cannot be projected as an unavailable observation.');
  }
}

function unavailable(
  admissionState: Exclude<
    TemplateCompilerRootSiteCursorObservationAdmissionState,
    TemplateCompilerRootSiteCursorObservationAdmissionState.CursorTranscript
  >,
  reasonKinds: readonly string[],
  graphState: string,
  hookState: string | null,
  localState: string | null,
  bindingState: string | null,
  authoredBundleCount: number,
  localIssueKind: string | null = null,
  localFrameworkErrorCode: string | null = null,
  hookBoundaryEntryOrdinal: number | null = null,
  localCompletedExtractionCount: number | null = null,
  localExtractedTemplateCount: number | null = null,
): TemplateCompilerRootSiteCursorUnavailableObservation {
  return {
    admissionState,
    reasonKinds,
    graphState,
    hookState,
    hookBoundaryEntryOrdinal,
    localState,
    localCompletedExtractionCount,
    localExtractedTemplateCount,
    bindingState,
    localIssueKind,
    localFrameworkErrorCode,
    authoredBundleCount,
  };
}

function cursorEventDigest(
  events: readonly TemplateCompilerSiteCursorEvent[],
  attributeOwners: readonly TemplateCompilerLiveAttributeOwnerResult[],
  hydrateElementEnvelopes: readonly TemplateCompilerHydrateElementStagingResult[],
  rootState: TemplateCompilerSiteCursorTranscript['rootState'],
  allocations: TemplateCompilerLiveAllocationSnapshot,
  forest: TemplateCompilerOccurrenceForest,
): string {
  const hash = createHash('sha256');
  const nodeIndexes = new Map(forest.readNodes().map((node, index) => [node, index] as const));
  const attributeIndexes = new Map(
    forest.readAttributes().map((attribute, index) => [attribute, index] as const),
  );
  const nodeIndex = (node: Parameters<typeof nodeIndexes.get>[0] | null): number | null =>
    node == null ? null : nodeIndexes.get(node) ?? null;
  for (const event of events) {
    const parts: readonly unknown[] = event instanceof TemplateCompilerSiteCursorPhaseEvent
      ? [event.eventKind, event.phaseKind, event.remainderReceipts.map((receipt) => receipt.remainderKind)]
      : event instanceof TemplateCompilerSiteCursorElementEvent
        ? [
            event.eventKind,
            nodeIndex(event.element),
            nodeIndex(event.parent),
            event.element.tagName,
            event.parentOrdinal,
            nodeIndex(event.capturedSuccessor),
            event.browserOriginState,
            event.lookupName,
            event.occurrenceOnlyRow?.disposition ?? null,
          ]
        : event instanceof TemplateCompilerSiteCursorAttributeEvent
          ? [
              event.eventKind,
              nodeIndex(event.owner),
              attributeIndexes.get(event.attribute) ?? null,
              event.scalar.qualifiedName,
              event.forestOrdinal,
              event.jitLiveOrdinal,
              event.browserOriginState,
              event.spend?.disposition ?? null,
              event.occurrenceOnlyRow?.disposition ?? null,
              event.siteOutcome,
              event.liveContribution == null
                ? null
                : [
                    event.liveContribution.frame.source.sourceKind,
                    event.liveContribution.completion,
                    event.liveContribution.targetLane,
                    event.liveContribution.disposition,
                    event.liveContribution.reason?.reasonKind ?? null,
                    event.liveContribution.structuralEffects,
                    event.liveContribution.syntax == null
                      ? null
                      : [
                          event.liveContribution.syntax.syntaxKind,
                          event.liveContribution.syntax.runtimeRawName,
                          event.liveContribution.syntax.rawValue,
                          event.liveContribution.syntax.target,
                          event.liveContribution.syntax.command,
                          event.liveContribution.syntax.parts,
                        ],
                    [
                      event.liveContribution.classification.classificationKind,
                      event.liveContribution.classification.resourceKind,
                      event.liveContribution.classification.resource?.name ?? null,
                      event.liveContribution.classification.bindingCommand?.name ?? null,
                      event.liveContribution.classification.bindable?.definition.name ?? null,
                      event.liveContribution.classification.issue?.issueKind ?? null,
                      event.liveContribution.classification.issue?.frameworkErrorCode ?? null,
                    ],
                    event.liveContribution.valueSelection == null
                      ? null
                      : [
                          event.liveContribution.valueSelection.siteKind,
                          event.liveContribution.valueSelection.rawValue,
                          event.liveContribution.valueSelection.entryFamily,
                          event.liveContribution.valueSelection.emptyValueBindingPolicy,
                          event.liveContribution.valueParse?.read.value.kind ?? null,
                        ],
                    event.liveContribution.instructions.map((instruction) => instruction.instructionKind),
                    event.liveContribution.multiBinding == null
                      ? null
                      : [
                          event.liveContribution.multiBinding.completion,
                          event.liveContribution.multiBinding.reason?.reasonKind ?? null,
                          event.liveContribution.multiBinding.segments.map((segment) => [
                            segment.segment.rawName,
                            segment.segment.rawValue,
                            segment.syntax.target,
                            segment.syntax.command,
                            segment.selection.bindable?.definition.name ?? null,
                            segment.completion,
                            segment.instructions.map((instruction) => instruction.instructionKind),
                          ]),
                        ],
                  ],
            ]
          : event instanceof TemplateCompilerSiteCursorProcessContentEvent
            ? [
                event.eventKind,
                nodeIndex(event.host),
                event.plan.state,
                event.result.metadata.name,
                event.result.nameCarrier == null
                  ? null
                  : attributeIndexes.get(event.result.nameCarrier) ?? null,
                event.result.strictFalse,
                event.result.operation.executionOrdinal,
                event.result.removals.map((removal) => [
                  nodeIndex(removal.occurrence),
                  removal.liveOrdinal,
                ]),
                event.removedSpends.map((spend) => [
                  spend.occurrence instanceof TemplateCompilerAttributeOccurrence
                    ? ['attribute', attributeIndexes.get(spend.occurrence) ?? null]
                    : ['text', nodeIndex(spend.occurrence)],
                  spend.disposition,
                  spend.siteEventOrdinal,
                  spend.causeOperation?.executionOrdinal ?? null,
                ]),
              ]
          : event instanceof TemplateCompilerSiteCursorContainerlessPlacementEvent
            ? [
                event.eventKind,
                nodeIndex(event.element),
                nodeIndex(event.parent),
                event.parentOrdinal,
                nodeIndex(event.capturedSuccessor),
                event.envelope.containerless.effective,
                event.envelope.containerless.fromDefinition,
                event.envelope.containerless.fromUsage,
              ]
          : event instanceof TemplateCompilerSiteCursorTextEvent
            ? [
                event.eventKind,
                nodeIndex(event.text),
                nodeIndex(event.parent),
                event.parentOrdinal,
                nodeIndex(event.capturedSuccessor),
                event.browserOriginState,
                event.authoredText?.productHandle ?? null,
                event.spend?.disposition ?? null,
                event.occurrenceOnlyRow?.disposition ?? null,
                event.siteOutcome,
                event.instructionStaging?.holes.map((hole) => [
                  hole.expressionChainIndex,
                  hole.expressionSpan.start,
                  hole.expressionSpan.end,
                  hole.expressionSpan.file?.id ?? null,
                  hole.instruction.instructionKind,
                ]) ?? null,
              ]
            : event instanceof TemplateCompilerSiteCursorIgnoredNodeEvent
              ? [
                  event.eventKind,
                  nodeIndex(event.node),
                  nodeIndex(event.parent),
                  event.parentOrdinal,
                  nodeIndex(event.capturedSuccessor),
                  event.occurrenceOnlyRow.disposition,
                ]
              : event instanceof TemplateCompilerSiteCursorSubtreeExclusionEvent
                ? [
                    event.eventKind,
                    nodeIndex(event.owner),
                    nodeIndex(event.root),
                    event.disposition,
                    event.spends.length,
                  ]
                : event instanceof TemplateCompilerSiteCursorSurrogateValidationEvent
                  ? [
                      event.eventKind,
                      nodeIndex(event.carrier),
                      attributeIndexes.get(event.attribute) ?? null,
                      event.scalar.qualifiedName,
                      event.forestOrdinal,
                      event.parsed.value.execution.target,
                      event.outcome,
                    ]
                  : event instanceof TemplateCompilerSiteCursorFrontier
                    ? [
                        event.eventKind,
                        nodeIndex(event.node),
                        event.attribute == null ? null : attributeIndexes.get(event.attribute) ?? null,
                        nodeIndex(event.capturedSuccessor),
                        event.phaseKind,
                        event.frontierKind,
                        event.nextSiteEventOrdinal,
                      ]
                    : unsupportedCursorEvent(event);
    const encoded = JSON.stringify([event.ordinal, ...parts]);
    hash.update(String(encoded.length));
    hash.update(':');
    hash.update(encoded);
  }
  for (const owner of attributeOwners) {
    const encoded = JSON.stringify([
      'attribute-owner',
      nodeIndex(owner.element),
      owner.lookupName,
      owner.completion,
      owner.reason?.reasonKind ?? null,
      owner.finalOwnerView.attributeStateKey,
      owner.contributions.map((contribution) =>
        attributeIndexes.get(contribution.frame.attribute) ?? null
      ),
      owner.instructionStaging.state,
      owner.instructionStaging.hydrateAttributes.map((instruction) => instruction.resourceLookupName),
      owner.instructionStaging.templateControllers.map((draft) => draft.controllerName),
      owner.instructionStaging.elementBindableInstructions.map((instruction) => instruction.instructionKind),
      owner.instructionStaging.plainInstructions.map((instruction) => instruction.instructionKind),
      owner.instructionStaging.orderedPlainInstructions.map((instruction) => instruction.instructionKind),
      owner.instructionStaging.directRowTail.map((instruction) => instruction.instructionKind),
      owner.instructionStaging.captures.map((capture) => capture.syntax.target),
      owner.instructionStaging.structuralEffects,
    ]);
    hash.update(String(encoded.length));
    hash.update(':');
    hash.update(encoded);
  }
  for (const envelope of hydrateElementEnvelopes) {
    const draft = envelope.draft;
    const encoded = JSON.stringify([
      'hydrate-element-envelope',
      nodeIndex(envelope.element),
      envelope.state,
      envelope.instructionReady,
      envelope.blockers.map((blocker) => [blocker.scope, blocker.blockerKind]),
      draft == null
        ? null
        : [
            draft.siteKey,
            draft.elementName,
            draft.resourceLookupName,
            draft.resource?.name ?? null,
            draft.bindableInstructions.map((instruction) => instruction.instructionKind),
            draft.captures.map((capture) => capture.syntax.target),
            draft.processContent.state,
            draft.processContent.metadata?.name ?? null,
            draft.processContent.result?.removals.length ?? 0,
            draft.projection.state,
            draft.projection.postProcessChildren.map(nodeIndex),
            [
              draft.containerless.effective,
              draft.containerless.fromDefinition,
              draft.containerless.fromUsage,
            ],
            [
              draft.source.authoredElement?.productHandle ?? null,
              draft.source.inputAddressHandle,
              draft.source.sourceAddressHandle,
              draft.source.hasGenerationCause,
            ],
            [
              draft.endpoint.forestMutationRevision,
              draft.endpoint.globalOperationCount,
              draft.endpoint.laneOperationCount,
            ],
          ],
    ]);
    hash.update(String(encoded.length));
    hash.update(':');
    hash.update(encoded);
  }
  const rootStateEncoded = JSON.stringify([
    'root-state',
    rootState.stateKind,
    rootState.hasSlots,
    rootState.nativeSlots.map((slot) => [
      nodeIndex(slot.element),
      slot.decision.decisionKind,
      slot.decision.lookupName,
    ]),
  ]);
  hash.update(String(rootStateEncoded.length));
  hash.update(':');
  hash.update(rootStateEncoded);
  const allocationEncoded = JSON.stringify([
    'live-allocations',
    allocations.state,
    allocations.instructionAllocations.map((entry) => [
      entry.siteKey,
      entry.local,
      entry.instructionKind,
      entry.instruction?.instructionKind ?? null,
    ]),
    allocations.expressionAllocations.map((entry) => [
      entry.siteKey,
      entry.local,
      entry.entryFamily,
      entry.expression,
      entry.ordinal,
      entry.result?.kind ?? null,
    ]),
    allocations.sourceAllocations.map((entry) => [
      entry.siteKey,
      entry.local,
      entry.role,
      entry.expressionChainIndex,
      entry.expressionSpan.start,
      entry.expressionSpan.end,
      entry.source != null,
    ]),
  ]);
  hash.update(String(allocationEncoded.length));
  hash.update(':');
  hash.update(allocationEncoded);
  return `sha256:${hash.digest('hex')}`;
}

function unsupportedCursorEvent(event: TemplateCompilerSiteCursorEvent): never {
  throw new Error(`Unsupported root site cursor event '${event.eventKind}'.`);
}

function counts(values: readonly string[]): Readonly<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const value of values) increment(result, value);
  return result;
}

function increment(countsByValue: Record<string, number>, value: string): void {
  countsByValue[value] = (countsByValue[value] ?? 0) + 1;
}
