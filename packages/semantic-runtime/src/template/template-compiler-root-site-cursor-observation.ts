import { createHash } from 'node:crypto';

import type { KernelPublicationContext } from '../kernel/publication.js';
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
import { LocalTemplateDefinitionMaterializer } from './local-template-definition-materializer.js';
import { TemplateCompilerReadView, TemplateCompilerWorldAuthority } from './compiler-read-view.js';
import { TemplateCompilerExecutionSession } from './template-compiler-execution.js';
import {
  executeTemplateCompilerHookBootstrap,
  TemplateCompilerHookBootstrapState,
} from './template-compiler-hook-bootstrap.js';
import {
  executeTemplateCompilerLocalExtraction,
  TemplateCompilerLocalExtractionState,
} from './template-compiler-local-extraction.js';
import {
  buildTemplateCompilerNormalizedSiteIndex,
  TemplateCompilerNormalizedSiteIndexState,
} from './template-compiler-normalized-site-index.js';
import {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerOccurrenceForest,
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
import { TemplateCompilerPreWalkRemainderAuthority } from './template-compiler-prewalk-remainder.js';
import { templateInstructionSemanticSignature } from './instruction-ir.js';
import {
  bindTemplateCompilerRootSiteInvocation,
  TemplateCompilerSiteInvocationBindingState,
} from './template-compiler-site-invocation.js';
import {
  executeTemplateCompilerRootSiteCursor,
  type TemplateCompilerSiteCursorTranscript,
  TemplateCompilerSiteCursorResultState,
} from './template-compiler-site-cursor.js';
import {
  TemplateCompilerSiteCursorAttributeEvent,
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
  readonly occurrenceTextExpansionCount: number;
  readonly occurrenceTextExpansionOutputCount: number;
  readonly occurrencePrePlanEffectState: string | null;
  readonly occurrenceRowDigest: string | null;
  readonly occurrenceTargetPlanState: string;
  readonly occurrenceTargetPlanReasonKinds: readonly string[];
  readonly occurrenceTargetPlanRowCount: number;
  readonly occurrenceTargetPlanMembershipCount: number;
  readonly occurrenceTargetPlanStableRowKeys: readonly string[];
  readonly occurrenceTargetPlanFreshRoot: boolean | null;
  readonly occurrenceTargetPlanDigest: string | null;
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
  /** Candidate-local publication context revoked with the caller's enclosing computation. */
  readonly publication: KernelPublicationContext;
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
  const graphExact = buildTemplateCompilerNormalizedSiteIndex(request.compilation);
  if (graphExact.state !== TemplateCompilerNormalizedSiteIndexState.GraphExact || graphExact.index == null) {
    return unavailable(
      TemplateCompilerRootSiteCursorObservationAdmissionState.GraphMismatch,
      graphExact.mismatches.map((mismatch) => mismatch.mismatchKind),
      graphExact.state,
      null,
      null,
      null,
      0,
    );
  }
  const authoredBundleCount = graphExact.index.attributeSites.length + graphExact.index.textSites.length;
  const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(request.browserEmission);
  const execution = TemplateCompilerExecutionSession.createForForest(
    `root-site-cursor-observation:${request.observationKey}`,
    forest,
  );
  const lane = execution.admitRootInvocation(request.compilation.localKey);
  const hook = executeTemplateCompilerHookBootstrap({
    execution,
    lane,
    compilerWorld: request.compilation.compilerWorld,
    executionOpenSeamHandle: request.publication.handles.openSeam(
      `root-site-cursor-observation:${request.observationKey}:hook-open`,
    ),
  });
  if (hook.state !== TemplateCompilerHookBootstrapState.Exact) {
    const admissionState = hook.state === TemplateCompilerHookBootstrapState.Abrupt
      ? TemplateCompilerRootSiteCursorObservationAdmissionState.HookAbrupt
      : TemplateCompilerRootSiteCursorObservationAdmissionState.HookOpen;
    return unavailable(
      admissionState,
      [admissionState],
      graphExact.state,
      hook.state,
      null,
      null,
      authoredBundleCount,
      null,
      null,
      hook.boundaryEntryOrdinal,
    );
  }

  const definitions = new LocalTemplateDefinitionMaterializer(request.publication);
  const local = executeTemplateCompilerLocalExtraction({
    execution,
    lane,
    hookBootstrap: hook,
    ownerName: request.compilation.definition.name,
    ownerCauseHandles: [
      request.compilation.definition.productHandle ?? request.compilation.unit.templateSource.productHandle,
    ],
    reserveDefinition: (invocationKey) => definitions.reserveOccurrenceDefinition(invocationKey),
  });
  if (!local.isExact()) {
    const admissionState = local.state === TemplateCompilerLocalExtractionState.Abrupt
      ? TemplateCompilerRootSiteCursorObservationAdmissionState.LocalAbrupt
      : TemplateCompilerRootSiteCursorObservationAdmissionState.LocalRefused;
    const failure = local.failure;
    return unavailable(
      admissionState,
      [failure?.issueKind ?? admissionState],
      graphExact.state,
      hook.state,
      local.state,
      null,
      authoredBundleCount,
      failure?.issueKind ?? null,
      failure?.frameworkErrorCode ?? null,
      hook.boundaryEntryOrdinal,
      local.completedExtractions.length,
      0,
    );
  }
  const closure = execution.closeInvocationBootstrap(hook, local);
  if (local.state === TemplateCompilerLocalExtractionState.Extracted) {
    const admissionState = TemplateCompilerRootSiteCursorObservationAdmissionState.LocalExtractedUnsupported;
    return unavailable(
      admissionState,
      [admissionState],
      graphExact.state,
      hook.state,
      local.state,
      null,
      authoredBundleCount,
      null,
      null,
      hook.boundaryEntryOrdinal,
      local.completedExtractions.length,
      local.completedExtractions.length,
    );
  }

  const family = request.currentFrontDoor.familyForOwner(request.compilation.familyOwnerHandle);
  if (family == null) {
    const admissionState = TemplateCompilerRootSiteCursorObservationAdmissionState.FamilyMissing;
    return unavailable(
      admissionState,
      [admissionState],
      graphExact.state,
      hook.state,
      local.state,
      null,
      authoredBundleCount,
      null,
      null,
      hook.boundaryEntryOrdinal,
      local.completedExtractions.length,
      0,
    );
  }
  const binding = bindTemplateCompilerRootSiteInvocation({
    execution,
    bootstrapClosure: closure,
    browserEmission: request.browserEmission,
    graphExact,
    currentFrontDoor: request.currentFrontDoor,
    currentFamily: family,
  });
  if (binding.state !== TemplateCompilerSiteInvocationBindingState.Exact || binding.binding == null) {
    return unavailable(
      TemplateCompilerRootSiteCursorObservationAdmissionState.RootBindingMismatch,
      binding.reasons.map((entry) => entry.reasonKind),
      graphExact.state,
      hook.state,
      local.state,
      binding.state,
      authoredBundleCount,
      null,
      null,
      hook.boundaryEntryOrdinal,
      local.completedExtractions.length,
      0,
    );
  }

  const compilerReads = new TemplateCompilerReadView(
    request.compilerReadStore,
    TemplateCompilerWorldAuthority.fixed(request.compilation.compilerWorld),
  );
  const cursor = executeTemplateCompilerRootSiteCursor({
    binding: binding.binding,
    compilerReads,
    preWalkAuthority: TemplateCompilerPreWalkRemainderAuthority.capture(binding.binding),
  });
  if (cursor.state !== TemplateCompilerSiteCursorResultState.Transcript || cursor.transcript == null) {
    return unavailable(
      TemplateCompilerRootSiteCursorObservationAdmissionState.CursorAdmissionMismatch,
      cursor.reasons.map((entry) => entry.reasonKind),
      graphExact.state,
      hook.state,
      local.state,
      binding.state,
      authoredBundleCount,
      null,
      null,
      hook.boundaryEntryOrdinal,
      local.completedExtractions.length,
      0,
    );
  }

  const transcript = cursor.transcript;
  const completion = cursor.completion;
  if (completion == null) {
    throw new Error('Cursor transcript observation lost its ordinary-root completion decision.');
  }
  const completionReceipt = completion.receipt;
  const occurrenceRows = completionReceipt == null
    ? null
    : assembleTemplateCompilerOrdinaryRootRows(completionReceipt);
  const occurrenceAssembly = occurrenceRows?.assembly ?? null;
  const occurrenceTargetPlan = occurrenceAssembly == null
    ? null
    : allocateTemplateCompilerOccurrenceTargetPlan(occurrenceAssembly);
  const targetPlanAssembly = occurrenceTargetPlan?.assembly ?? null;
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
    occurrenceMembershipCount: occurrenceAssembly?.occurrenceMemberships.length ?? 0,
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
    occurrenceTextExpansionCount: occurrenceAssembly?.textExpansions.length ?? 0,
    occurrenceTextExpansionOutputCount: occurrenceAssembly?.textExpansions.reduce(
      (count, expansion) => count + expansion.outputs.length,
      0,
    ) ?? 0,
    occurrencePrePlanEffectState: occurrenceAssembly?.prePlanEffectState ?? null,
    occurrenceRowDigest: occurrenceAssembly == null ? null : occurrenceRowDigest(occurrenceAssembly),
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
    ],
    assembly.occurrenceMemberships.map((membership) => [
      membership.stableSlotKey,
      membership.occurrence.occurrenceKey,
      membership.authoredNode?.productHandle ?? null,
      membership.sourcePosture,
    ]),
    assembly.rows.map((row) => [
      row.stableSlotKey,
      row.ordinal,
      row.projectedTargetOrdinal,
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
      row.sourceKind,
      row.expressionChainIndex,
      row.inputNode?.productHandle ?? null,
      row.node?.productHandle ?? null,
      row.instructions.map(templateInstructionSemanticSignature),
    ]),
  ]);
  return `sha256:${createHash('sha256').update(encoded).digest('hex')}`;
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
