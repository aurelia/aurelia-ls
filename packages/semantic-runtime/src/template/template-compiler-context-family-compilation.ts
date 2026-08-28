import type { ProductDetailReadView } from '../kernel/product-details.js';
import type {
  KernelMaterializationReadView,
  KernelReadProjectionRevisionView,
} from '../kernel/store.js';
import type { BrowserEffectiveTemplateEmission } from './browser-effective-template-materializer.js';
import {
  prepareTemplateCompilerContextFamilyAllocation,
  TemplateCompilerContextFamilyAllocationState,
  type TemplateCompilerContextFamilyAllocationReason,
} from './template-compiler-context-family-allocation.js';
import {
  completeTemplateCompilerContextFamily,
  TemplateCompilerContextFamilyCompletionMode,
  TemplateCompilerContextFamilyCompletionState,
  type TemplateCompilerContextFamilyCompletionReason,
} from './template-compiler-context-family-completion.js';
import { TemplateCompilerTraversalCompletionAuditReasonKind } from './template-compiler-completion-audit.js';
import {
  materializeTemplateCompilerContextFamilyFrozenValue,
  type TemplateCompilerContextFamilyFrozenValueReason,
  TemplateCompilerContextFamilyFrozenValueState,
} from './template-compiler-context-family-frozen-value.js';
import {
  projectTemplateCompilerContextFamilyValue,
  type TemplateCompilerContextFamilyValue,
} from './template-compiler-context-family-value.js';
import {
  prepareTemplateCompilerContextFamilyFreeze,
  type TemplateCompilerContextFamilyFreezeReason,
  TemplateCompilerContextFamilyFreezePreparationState,
} from './template-compiler-context-family-freeze.js';
import {
  assembleTemplateCompilerContextFamilyRows,
  type TemplateCompilerContextFamilyRowAssemblyReason,
} from './template-compiler-context-family-row-assembly.js';
import { prepareTemplateCompilerContextFamilyStructuralSchedule } from './template-compiler-context-family-structural-schedule.js';
import { executeTemplateCompilerContextFamilyTarget } from './template-compiler-context-family-target-execution.js';
import {
  prepareTemplateCompilerContextFamilyTargetPlan,
  type TemplateCompilerContextFamilyTargetPlanReason,
  TemplateCompilerContextFamilyTargetPlanState,
} from './template-compiler-context-family-target-plan.js';
import {
  prepareTemplateCompilerFamilyWireFunding,
  type TemplateCompilerFamilyWireFundingReason,
  TemplateCompilerFamilyWireFundingState,
} from './template-compiler-family-wire-funding.js';
import {
  executeTemplateCompilerRootSiteRun,
  type TemplateCompilerRootSiteRunReason,
  TemplateCompilerRootSiteRunState,
} from './template-compiler-root-site-run.js';
import { TemplateCompilerSiteCursorTraversalMode } from './template-compiler-site-cursor.js';
import { TemplateCompilerSiteCursorFrontierKind } from './template-compiler-site-cursor-event.js';
import type {
  TemplateCompilationFrontDoorEmission,
  TemplateResourceCompilationEmission,
} from './template-compilation-project-pass.js';

export const enum TemplateCompilerContextFamilyCompilationState {
  Exact = 'exact',
  Pending = 'pending',
  Ineligible = 'ineligible',
  Open = 'open',
  Abrupt = 'abrupt',
}

export const enum TemplateCompilerContextFamilyCompilationStage {
  RootSiteRun = 'root-site-run',
  FamilyCompletion = 'family-completion',
  RowAssembly = 'row-assembly',
  WireFunding = 'wire-funding',
  Allocation = 'allocation',
  TargetPlan = 'target-plan',
  Freeze = 'freeze',
  FrozenValue = 'frozen-value',
}

export class TemplateCompilerContextFamilyCompilationReason {
  constructor(
    readonly stage: TemplateCompilerContextFamilyCompilationStage,
    readonly reasonKind: string,
    readonly summary: string,
    readonly stableKeys: readonly string[] = [],
  ) {}
}

export interface TemplateCompilerContextFamilyCompilationRequest {
  readonly compilationKey: string;
  readonly compilation: TemplateResourceCompilationEmission;
  readonly browserEmission: BrowserEffectiveTemplateEmission;
  readonly currentFrontDoor: TemplateCompilationFrontDoorEmission;
  readonly compilerReadStore: Pick<KernelMaterializationReadView, 'readMaterializationsByOwner'>
    & ProductDetailReadView
    & KernelReadProjectionRevisionView;
}

/** Generation-bound result of the complete semantic compiler pipeline; it is not a portable wire value. */
export class TemplateCompilerContextFamilyCompilationResult {
  constructor(
    readonly state: TemplateCompilerContextFamilyCompilationState,
    readonly stage: TemplateCompilerContextFamilyCompilationStage,
    readonly value: TemplateCompilerContextFamilyValue | null,
    readonly reasons: readonly TemplateCompilerContextFamilyCompilationReason[],
  ) {
    const exact = state === TemplateCompilerContextFamilyCompilationState.Exact;
    const unavailable = !exact;
    if (
      exact !== (
        stage === TemplateCompilerContextFamilyCompilationStage.FrozenValue
        && value != null
        && reasons.length === 0
      )
      || unavailable !== (value == null && reasons.length > 0)
    ) {
      throw new Error('Context-family compilation result lost exact or unavailable ownership.');
    }
  }

  isExact(): boolean {
    return this.state === TemplateCompilerContextFamilyCompilationState.Exact;
  }
}

/**
 * Execute one browser-effective template through the closed-context compiler and construct its final in-process family.
 *
 * Typed semantic uncertainty is returned at its owning stage. Internal invariant failures remain exceptions.
 */
export function compileTemplateCompilerContextFamily(
  request: TemplateCompilerContextFamilyCompilationRequest,
): TemplateCompilerContextFamilyCompilationResult {
  const root = executeTemplateCompilerRootSiteRun({
    runKey: `context-family-compilation:${request.compilationKey}`,
    compilation: request.compilation,
    browserEmission: request.browserEmission,
    currentFrontDoor: request.currentFrontDoor,
    compilerReadStore: request.compilerReadStore,
    traversalMode: TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
  });
  if (!root.isTranscript()) {
    return unavailable(
      rootRunState(root.state),
      TemplateCompilerContextFamilyCompilationStage.RootSiteRun,
      root.reasons.map(rootRunReason),
    );
  }
  const cursor = root.cursor!;
  const completion = completeTemplateCompilerContextFamily(
    cursor.transcript!,
    cursor.siteEndpoint,
    TemplateCompilerContextFamilyCompletionMode.RootInclusiveFamily,
  );
  if (completion.state !== TemplateCompilerContextFamilyCompletionState.Complete || completion.receipt == null) {
    return unavailable(
      completionOutcome(completion),
      TemplateCompilerContextFamilyCompilationStage.FamilyCompletion,
      completion.reasons.map(completionReason),
    );
  }
  const rows = assembleTemplateCompilerContextFamilyRows(completion.receipt);
  // Pending row assemblies deliberately carry the obligations closed by the following allocation phase.
  if (rows.assembly == null) {
    return unavailable(
      TemplateCompilerContextFamilyCompilationState.Ineligible,
      TemplateCompilerContextFamilyCompilationStage.RowAssembly,
      rows.reasons.map(rowAssemblyReason),
    );
  }
  const wires = prepareTemplateCompilerFamilyWireFunding(rows.assembly);
  if (wires.state !== TemplateCompilerFamilyWireFundingState.Exact || wires.funding == null) {
    return unavailable(
      wires.state === TemplateCompilerFamilyWireFundingState.Pending
        ? TemplateCompilerContextFamilyCompilationState.Pending
        : TemplateCompilerContextFamilyCompilationState.Ineligible,
      TemplateCompilerContextFamilyCompilationStage.WireFunding,
      wires.reasons.map(wireFundingReason),
    );
  }
  const allocation = prepareTemplateCompilerContextFamilyAllocation(rows.assembly, wires.funding);
  if (allocation.state !== TemplateCompilerContextFamilyAllocationState.Exact || allocation.preparation == null) {
    return unavailable(
      allocation.state === TemplateCompilerContextFamilyAllocationState.Pending
        ? TemplateCompilerContextFamilyCompilationState.Pending
        : TemplateCompilerContextFamilyCompilationState.Ineligible,
      TemplateCompilerContextFamilyCompilationStage.Allocation,
      allocation.reasons.map(allocationReason),
    );
  }
  const target = prepareTemplateCompilerContextFamilyTargetPlan(allocation.preparation);
  if (target.state !== TemplateCompilerContextFamilyTargetPlanState.Exact || target.preparation == null) {
    return unavailable(
      target.state === TemplateCompilerContextFamilyTargetPlanState.Pending
        ? TemplateCompilerContextFamilyCompilationState.Pending
        : TemplateCompilerContextFamilyCompilationState.Ineligible,
      TemplateCompilerContextFamilyCompilationStage.TargetPlan,
      target.reasons.map(targetPlanReason),
    );
  }
  const execution = root.execution!;
  const schedule = prepareTemplateCompilerContextFamilyStructuralSchedule(target.preparation);
  const attachment = execution.commitPreparedContextFamilyTargetAttachment(
    execution.prepareContextFamilyTargetAttachment(target.preparation, schedule),
  );
  const targetExecution = executeTemplateCompilerContextFamilyTarget(attachment);
  execution.seal();
  const freeze = prepareTemplateCompilerContextFamilyFreeze(targetExecution);
  if (freeze.state !== TemplateCompilerContextFamilyFreezePreparationState.Exact || freeze.preparation == null) {
    return unavailable(
      TemplateCompilerContextFamilyCompilationState.Ineligible,
      TemplateCompilerContextFamilyCompilationStage.Freeze,
      freeze.reasons.map(freezeReason),
    );
  }
  const frozen = materializeTemplateCompilerContextFamilyFrozenValue(freeze.preparation);
  if (frozen.state !== TemplateCompilerContextFamilyFrozenValueState.Exact || frozen.value == null) {
    return unavailable(
      frozen.state === TemplateCompilerContextFamilyFrozenValueState.Pending
        ? TemplateCompilerContextFamilyCompilationState.Pending
        : TemplateCompilerContextFamilyCompilationState.Ineligible,
      TemplateCompilerContextFamilyCompilationStage.FrozenValue,
      frozen.reasons.map(frozenValueReason),
    );
  }
  return new TemplateCompilerContextFamilyCompilationResult(
    TemplateCompilerContextFamilyCompilationState.Exact,
    TemplateCompilerContextFamilyCompilationStage.FrozenValue,
    projectTemplateCompilerContextFamilyValue(frozen.value),
    [],
  );
}

function completionOutcome(
  completion: ReturnType<typeof completeTemplateCompilerContextFamily>,
): Exclude<
  TemplateCompilerContextFamilyCompilationState,
  TemplateCompilerContextFamilyCompilationState.Exact
> {
  if (completion.state === TemplateCompilerContextFamilyCompletionState.Pending) {
    return TemplateCompilerContextFamilyCompilationState.Pending;
  }
  const reasonKinds = new Set(completion.reasons.map((reason) => reason.reasonKind));
  const frontier = completion.audit.transcript.frontier?.frontierKind ?? null;
  if (reasonKinds.has(TemplateCompilerTraversalCompletionAuditReasonKind.RootStateInvalid)) {
    return TemplateCompilerContextFamilyCompilationState.Ineligible;
  }
  const frontierState = frontierOutcome(frontier);
  if (frontierState != null) return frontierState;
  if (
    reasonKinds.has(TemplateCompilerTraversalCompletionAuditReasonKind.RootStateOpen)
    || reasonKinds.has(TemplateCompilerTraversalCompletionAuditReasonKind.CompilerReadOpen)
    || reasonKinds.has(TemplateCompilerTraversalCompletionAuditReasonKind.LiveSiteIncomplete)
    || reasonKinds.has(TemplateCompilerTraversalCompletionAuditReasonKind.AllocationOpen)
  ) {
    return TemplateCompilerContextFamilyCompilationState.Open;
  }
  return TemplateCompilerContextFamilyCompilationState.Ineligible;
}

function frontierOutcome(
  frontier: TemplateCompilerSiteCursorFrontierKind | null,
): Exclude<
  TemplateCompilerContextFamilyCompilationState,
  TemplateCompilerContextFamilyCompilationState.Exact
> | null {
  switch (frontier) {
    case null:
      return null;
    case TemplateCompilerSiteCursorFrontierKind.AsElementScalarOpen:
    case TemplateCompilerSiteCursorFrontierKind.ElementResolutionOpen:
    case TemplateCompilerSiteCursorFrontierKind.NativeSlotRootOpen:
    case TemplateCompilerSiteCursorFrontierKind.BeforeProcessContent:
    case TemplateCompilerSiteCursorFrontierKind.ReachedLiveAttributeOpen:
    case TemplateCompilerSiteCursorFrontierKind.HydrateElementEnvelopeOpen:
    case TemplateCompilerSiteCursorFrontierKind.ReachedNormalizedOpen:
    case TemplateCompilerSiteCursorFrontierKind.SurrogateValidationOpen:
      return TemplateCompilerContextFamilyCompilationState.Open;
    case TemplateCompilerSiteCursorFrontierKind.GeneratedSiteNeedsLowering:
    case TemplateCompilerSiteCursorFrontierKind.NonSingularBrowserOrigin:
    case TemplateCompilerSiteCursorFrontierKind.AuthoredPrecedentMismatch:
    case TemplateCompilerSiteCursorFrontierKind.AtLiveAttributeRelowering:
    case TemplateCompilerSiteCursorFrontierKind.LetElementLoweringRequired:
    case TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeTemplateController:
    case TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeProjection:
    case TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeContainerless:
    case TemplateCompilerSiteCursorFrontierKind.TextReloweringRequired:
    case TemplateCompilerSiteCursorFrontierKind.SurrogateClassificationRequired:
      return TemplateCompilerContextFamilyCompilationState.Pending;
    case TemplateCompilerSiteCursorFrontierKind.CurrentnessLost:
    case TemplateCompilerSiteCursorFrontierKind.NativeSlotWithoutShadowDomInvalid:
    case TemplateCompilerSiteCursorFrontierKind.ReachedLiveAttributeInvalid:
    case TemplateCompilerSiteCursorFrontierKind.HydrateElementEnvelopeInvalid:
    case TemplateCompilerSiteCursorFrontierKind.ReachedNormalizedInvalid:
    case TemplateCompilerSiteCursorFrontierKind.AuthoredCompilerMarkerReserved:
    case TemplateCompilerSiteCursorFrontierKind.InvalidSurrogateAttribute:
    case TemplateCompilerSiteCursorFrontierKind.AccountingMismatch:
      return TemplateCompilerContextFamilyCompilationState.Ineligible;
  }
}

function rootRunState(
  state: TemplateCompilerRootSiteRunState,
): Exclude<
  TemplateCompilerContextFamilyCompilationState,
  TemplateCompilerContextFamilyCompilationState.Exact
> {
  switch (state) {
    case TemplateCompilerRootSiteRunState.HookOpen:
      return TemplateCompilerContextFamilyCompilationState.Open;
    case TemplateCompilerRootSiteRunState.HookAbrupt:
    case TemplateCompilerRootSiteRunState.LocalAbrupt:
      return TemplateCompilerContextFamilyCompilationState.Abrupt;
    case TemplateCompilerRootSiteRunState.LocalExtractedUnsupported:
      return TemplateCompilerContextFamilyCompilationState.Pending;
    case TemplateCompilerRootSiteRunState.GraphMismatch:
    case TemplateCompilerRootSiteRunState.LocalRefused:
    case TemplateCompilerRootSiteRunState.FamilyMissing:
    case TemplateCompilerRootSiteRunState.BindingMismatch:
    case TemplateCompilerRootSiteRunState.CursorMismatch:
      return TemplateCompilerContextFamilyCompilationState.Ineligible;
    case TemplateCompilerRootSiteRunState.CursorTranscript:
      throw new Error('Exact root-site run cannot be projected as an unavailable compilation.');
  }
}

function rootRunReason(reason: TemplateCompilerRootSiteRunReason): TemplateCompilerContextFamilyCompilationReason {
  return reasonFor(TemplateCompilerContextFamilyCompilationStage.RootSiteRun, reason.reasonKind, reason.summary);
}

function completionReason(
  reason: TemplateCompilerContextFamilyCompletionReason,
): TemplateCompilerContextFamilyCompilationReason {
  return reasonFor(TemplateCompilerContextFamilyCompilationStage.FamilyCompletion, reason.reasonKind, reason.summary);
}

function rowAssemblyReason(
  reason: TemplateCompilerContextFamilyRowAssemblyReason,
): TemplateCompilerContextFamilyCompilationReason {
  return reasonFor(TemplateCompilerContextFamilyCompilationStage.RowAssembly, reason.reasonKind, reason.summary);
}

function wireFundingReason(
  reason: TemplateCompilerFamilyWireFundingReason,
): TemplateCompilerContextFamilyCompilationReason {
  return reasonFor(
    TemplateCompilerContextFamilyCompilationStage.WireFunding,
    reason.draft?.resolution ?? 'wire-funding-unavailable',
    reason.summary,
    reason.draft == null ? [] : [reason.draft.stableSlotKey],
  );
}

function allocationReason(
  reason: TemplateCompilerContextFamilyAllocationReason,
): TemplateCompilerContextFamilyCompilationReason {
  return reasonFor(
    TemplateCompilerContextFamilyCompilationStage.Allocation,
    reason.reasonKind,
    reason.summary,
    reason.stableSlotKeys,
  );
}

function targetPlanReason(
  reason: TemplateCompilerContextFamilyTargetPlanReason,
): TemplateCompilerContextFamilyCompilationReason {
  return reasonFor(
    TemplateCompilerContextFamilyCompilationStage.TargetPlan,
    reason.reasonKind,
    reason.summary,
    reason.stableSlotKeys,
  );
}

function freezeReason(reason: TemplateCompilerContextFamilyFreezeReason): TemplateCompilerContextFamilyCompilationReason {
  return reasonFor(
    TemplateCompilerContextFamilyCompilationStage.Freeze,
    reason.reasonKind,
    reason.summary,
    reason.occurrenceKey == null ? [] : [reason.occurrenceKey],
  );
}

function frozenValueReason(
  reason: TemplateCompilerContextFamilyFrozenValueReason,
): TemplateCompilerContextFamilyCompilationReason {
  return reasonFor(
    TemplateCompilerContextFamilyCompilationStage.FrozenValue,
    reason.reasonKind,
    reason.summary,
    reason.stableKeys,
  );
}

function reasonFor(
  stage: TemplateCompilerContextFamilyCompilationStage,
  reasonKind: string,
  summary: string,
  stableKeys: readonly string[] = [],
): TemplateCompilerContextFamilyCompilationReason {
  return new TemplateCompilerContextFamilyCompilationReason(stage, reasonKind, summary, stableKeys);
}

function unavailable(
  state: Exclude<
    TemplateCompilerContextFamilyCompilationState,
    TemplateCompilerContextFamilyCompilationState.Exact
  >,
  stage: TemplateCompilerContextFamilyCompilationStage,
  reasons: readonly TemplateCompilerContextFamilyCompilationReason[],
): TemplateCompilerContextFamilyCompilationResult {
  return new TemplateCompilerContextFamilyCompilationResult(
    state,
    stage,
    null,
    reasons.length > 0
      ? reasons
      : [reasonFor(stage, `${stage}-${state}`, `Context-family compilation ended as '${state}' at '${stage}'.`)],
  );
}
