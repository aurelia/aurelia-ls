import type { AddressHandle } from '../kernel/handles.js';
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
  TemplateCompilerContextFamilyCompletionReasonKind,
  TemplateCompilerContextFamilyCompletionState,
  type TemplateCompilerContextFamilyCompletionReason,
} from './template-compiler-context-family-completion.js';
import { TemplateCompilerTraversalCompletionAuditReasonKind } from './template-compiler-completion-audit.js';
import type { TemplateCompilerIssue } from './compiler-issue.js';
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
  type TemplateCompilerContextFamilyTargetPlanPreparation,
  type TemplateCompilerContextFamilyTargetPlanReason,
  TemplateCompilerContextFamilyTargetPlanState,
} from './template-compiler-context-family-target-plan.js';
import {
  prepareTemplateCompilerFamilyWireFunding,
  type TemplateCompilerFamilyWireFundingReason,
  type TemplateCompilerFamilyWireFundingResult,
  TemplateCompilerFamilyWireResolution,
  TemplateCompilerFamilyWireFundingState,
} from './template-compiler-family-wire-funding.js';
import {
  executeTemplateCompilerRootSiteRun,
  type TemplateCompilerRootSiteRunReason,
  TemplateCompilerRootSiteRunState,
} from './template-compiler-root-site-run.js';
import {
  TemplateCompilerSiteCursorTraversalMode,
  type TemplateCompilerSiteCursorResult,
} from './template-compiler-site-cursor.js';
import {
  TemplateCompilerSiteCursorAttributeEvent,
  TemplateCompilerSiteCursorFrontierKind,
} from './template-compiler-site-cursor-event.js';
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

export const enum TemplateCompilerContextFamilyCompilationReasonRole {
  Independent = 'independent',
  PrimaryFrontier = 'primary-frontier',
  FrontierDerivative = 'frontier-derivative',
}

/** Exact reached frontier and existing compiler issue that caused one family compilation to stop. */
export class TemplateCompilerContextFamilyFrontierCause {
  constructor(
    readonly frontierKind: TemplateCompilerSiteCursorFrontierKind,
    readonly nodeOccurrenceKey: string | null,
    readonly attributeOccurrenceKey: string | null,
    readonly issue: TemplateCompilerIssue | null,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

export class TemplateCompilerContextFamilyCompilationReason {
  constructor(
    readonly stage: TemplateCompilerContextFamilyCompilationStage,
    readonly reasonKind: string,
    readonly summary: string,
    readonly stableKeys: readonly string[] = [],
    readonly role: TemplateCompilerContextFamilyCompilationReasonRole =
      TemplateCompilerContextFamilyCompilationReasonRole.Independent,
    readonly frontierCause: TemplateCompilerContextFamilyFrontierCause | null = null,
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

/** Exact pre-allocation target plan for one invocation lane, or its owning typed frontier. */
export class TemplateCompilerContextFamilyTargetPreparationResult {
  constructor(
    readonly state: TemplateCompilerContextFamilyCompilationState,
    readonly stage: TemplateCompilerContextFamilyCompilationStage,
    readonly target: TemplateCompilerContextFamilyTargetPlanPreparation | null,
    readonly reasons: readonly TemplateCompilerContextFamilyCompilationReason[],
  ) {
    const exact = state === TemplateCompilerContextFamilyCompilationState.Exact;
    if (exact !== (target != null && reasons.length === 0) || !exact !== (target == null && reasons.length > 0)) {
      throw new Error('Context-family target preparation lost exact or unavailable ownership.');
    }
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
  const prepared = prepareTemplateCompilerContextFamilyTarget(root.cursor!);
  if (prepared.target == null) {
    if (prepared.state === TemplateCompilerContextFamilyCompilationState.Exact) {
      throw new Error('Exact context-family target preparation lost its target.');
    }
    return unavailable(prepared.state, prepared.stage, prepared.reasons);
  }
  const target = prepared.target;
  const execution = root.execution!;
  const schedule = prepareTemplateCompilerContextFamilyStructuralSchedule(target);
  const attachment = execution.commitPreparedContextFamilyTargetAttachment(
    execution.prepareContextFamilyTargetAttachment(target, schedule),
  );
  const targetExecution = executeTemplateCompilerContextFamilyTarget(attachment);
  execution.seal();
  return freezeTemplateCompilerContextFamilyTargetExecution(targetExecution, request.compilerReadStore);
}

/** Prepare one exact cursor transcript through completion, rows, wires, allocation, and target planning. */
export function prepareTemplateCompilerContextFamilyTarget(
  cursor: TemplateCompilerSiteCursorResult,
): TemplateCompilerContextFamilyTargetPreparationResult {
  if (cursor.transcript == null || cursor.siteEndpoint == null) {
    return unavailableTarget(
      TemplateCompilerContextFamilyCompilationState.Ineligible,
      TemplateCompilerContextFamilyCompilationStage.FamilyCompletion,
      [new TemplateCompilerContextFamilyCompilationReason(
        TemplateCompilerContextFamilyCompilationStage.FamilyCompletion,
        'cursor-transcript-unavailable',
        'Context-family target preparation requires one exact cursor transcript and endpoint.',
      )],
    );
  }
  const completion = completeTemplateCompilerContextFamily(
    cursor.transcript,
    cursor.siteEndpoint,
    TemplateCompilerContextFamilyCompletionMode.RootInclusiveFamily,
  );
  if (completion.state !== TemplateCompilerContextFamilyCompletionState.Complete || completion.receipt == null) {
    return unavailableTarget(
      completionOutcome(completion),
      TemplateCompilerContextFamilyCompilationStage.FamilyCompletion,
      completionReasons(completion),
    );
  }
  const rows = assembleTemplateCompilerContextFamilyRows(completion.receipt);
  // Pending row assemblies deliberately carry the obligations closed by the following allocation phase.
  if (rows.assembly == null) {
    return unavailableTarget(
      TemplateCompilerContextFamilyCompilationState.Ineligible,
      TemplateCompilerContextFamilyCompilationStage.RowAssembly,
      rows.reasons.map(rowAssemblyReason),
    );
  }
  const wires = prepareTemplateCompilerFamilyWireFunding(rows.assembly);
  if (wires.state !== TemplateCompilerFamilyWireFundingState.Exact || wires.funding == null) {
    return unavailableTarget(
      wireFundingOutcome(wires),
      TemplateCompilerContextFamilyCompilationStage.WireFunding,
      wires.reasons.map(wireFundingReason),
    );
  }
  const allocation = prepareTemplateCompilerContextFamilyAllocation(rows.assembly, wires.funding);
  if (allocation.state !== TemplateCompilerContextFamilyAllocationState.Exact || allocation.preparation == null) {
    return unavailableTarget(
      allocation.state === TemplateCompilerContextFamilyAllocationState.Pending
        ? TemplateCompilerContextFamilyCompilationState.Pending
        : TemplateCompilerContextFamilyCompilationState.Ineligible,
      TemplateCompilerContextFamilyCompilationStage.Allocation,
      allocation.reasons.map(allocationReason),
    );
  }
  const target = prepareTemplateCompilerContextFamilyTargetPlan(allocation.preparation);
  if (target.state !== TemplateCompilerContextFamilyTargetPlanState.Exact || target.preparation == null) {
    return unavailableTarget(
      target.state === TemplateCompilerContextFamilyTargetPlanState.Pending
        ? TemplateCompilerContextFamilyCompilationState.Pending
        : TemplateCompilerContextFamilyCompilationState.Ineligible,
      TemplateCompilerContextFamilyCompilationStage.TargetPlan,
      target.reasons.map(targetPlanReason),
    );
  }
  return new TemplateCompilerContextFamilyTargetPreparationResult(
    TemplateCompilerContextFamilyCompilationState.Exact,
    TemplateCompilerContextFamilyCompilationStage.TargetPlan,
    target.preparation,
    [],
  );
}

/** Freeze and project one already-executed lane after its shared execution session reached one global seal. */
export function freezeTemplateCompilerContextFamilyTargetExecution(
  targetExecution: ReturnType<typeof executeTemplateCompilerContextFamilyTarget>,
  compilerReadStore: TemplateCompilerContextFamilyCompilationRequest['compilerReadStore'],
): TemplateCompilerContextFamilyCompilationResult {
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
    projectTemplateCompilerContextFamilyValue(frozen.value, compilerReadStore),
    [],
  );
}

function unavailableTarget(
  state: Exclude<TemplateCompilerContextFamilyCompilationState, TemplateCompilerContextFamilyCompilationState.Exact>,
  stage: TemplateCompilerContextFamilyCompilationStage,
  reasons: readonly TemplateCompilerContextFamilyCompilationReason[],
): TemplateCompilerContextFamilyTargetPreparationResult {
  return new TemplateCompilerContextFamilyTargetPreparationResult(state, stage, null, reasons);
}

function wireFundingOutcome(
  result: TemplateCompilerFamilyWireFundingResult,
): Exclude<
  TemplateCompilerContextFamilyCompilationState,
  TemplateCompilerContextFamilyCompilationState.Exact
> {
  if (result.state === TemplateCompilerFamilyWireFundingState.Ineligible) {
    return TemplateCompilerContextFamilyCompilationState.Ineligible;
  }
  return result.reasons.some((reason) => reason.draft?.resolution === TemplateCompilerFamilyWireResolution.Open)
    ? TemplateCompilerContextFamilyCompilationState.Open
    : TemplateCompilerContextFamilyCompilationState.Pending;
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
    case TemplateCompilerSiteCursorFrontierKind.SurrogateClassificationOpen:
    case TemplateCompilerSiteCursorFrontierKind.LetElementOpen:
      return TemplateCompilerContextFamilyCompilationState.Open;
    case TemplateCompilerSiteCursorFrontierKind.GeneratedSiteNeedsLowering:
    case TemplateCompilerSiteCursorFrontierKind.NonSingularBrowserOrigin:
    case TemplateCompilerSiteCursorFrontierKind.AuthoredPrecedentMismatch:
    case TemplateCompilerSiteCursorFrontierKind.AtLiveAttributeRelowering:
    case TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeTemplateController:
    case TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeProjection:
    case TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeContainerless:
    case TemplateCompilerSiteCursorFrontierKind.TextReloweringRequired:
    case TemplateCompilerSiteCursorFrontierKind.SurrogateStructuralMutationPending:
      return TemplateCompilerContextFamilyCompilationState.Pending;
    case TemplateCompilerSiteCursorFrontierKind.CurrentnessLost:
    case TemplateCompilerSiteCursorFrontierKind.NativeSlotWithoutShadowDomInvalid:
    case TemplateCompilerSiteCursorFrontierKind.ReachedLiveAttributeInvalid:
    case TemplateCompilerSiteCursorFrontierKind.HydrateElementEnvelopeInvalid:
    case TemplateCompilerSiteCursorFrontierKind.ReachedNormalizedInvalid:
    case TemplateCompilerSiteCursorFrontierKind.AuthoredCompilerMarkerReserved:
    case TemplateCompilerSiteCursorFrontierKind.InvalidSurrogateAttribute:
    case TemplateCompilerSiteCursorFrontierKind.SurrogateClassificationInvalid:
    case TemplateCompilerSiteCursorFrontierKind.InvalidSurrogateTemplateController:
    case TemplateCompilerSiteCursorFrontierKind.InvalidLetCommand:
    case TemplateCompilerSiteCursorFrontierKind.UnknownLetBindingCommand:
    case TemplateCompilerSiteCursorFrontierKind.InvalidLetExpression:
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
  role: TemplateCompilerContextFamilyCompilationReasonRole =
    TemplateCompilerContextFamilyCompilationReasonRole.Independent,
): TemplateCompilerContextFamilyCompilationReason {
  return reasonFor(
    TemplateCompilerContextFamilyCompilationStage.FamilyCompletion,
    reason.reasonKind,
    reason.summary,
    [],
    role,
  );
}

function completionReasons(
  completion: ReturnType<typeof completeTemplateCompilerContextFamily>,
): readonly TemplateCompilerContextFamilyCompilationReason[] {
  const primary = primaryFrontierReason(completion);
  const reasons = completion.reasons.map((reason) => completionReason(
    reason,
    primary != null && isFrontierDerivative(reason.reasonKind)
      ? TemplateCompilerContextFamilyCompilationReasonRole.FrontierDerivative
      : TemplateCompilerContextFamilyCompilationReasonRole.Independent,
  ));
  return primary == null ? reasons : [primary, ...reasons];
}

function primaryFrontierReason(
  completion: ReturnType<typeof completeTemplateCompilerContextFamily>,
): TemplateCompilerContextFamilyCompilationReason | null {
  const transcript = completion.audit.transcript;
  const frontier = transcript.frontier;
  if (frontier == null) return null;

  const attributeEvent = frontier.attribute == null
    ? null
    : transcript.events.find((event): event is TemplateCompilerSiteCursorAttributeEvent =>
        event instanceof TemplateCompilerSiteCursorAttributeEvent
        && event.attribute === frontier.attribute
      ) ?? null;
  const decisionIssue = attributeEvent?.liveContribution?.classification.issue ?? null;
  const bundle = attributeEvent?.bundle ?? null;
  const sourceCandidates = bundle == null
    ? []
    : [
        bundle.syntax.targetSourceAddressHandle,
        bundle.syntax.commandSourceAddressHandle,
        bundle.classification.sourceAddressHandle,
        bundle.syntax.sourceAddressHandle,
      ].filter((handle): handle is AddressHandle => handle != null);
  const issue = decisionIssue == null || bundle == null
    ? null
    : bundle.outcomeRoute.attributeClassificationAuthority.issues.find((candidate) =>
        candidate.issueKind === decisionIssue.issueKind
        && candidate.frameworkErrorCode === decisionIssue.frameworkErrorCode
        && candidate.message === decisionIssue.message
        && candidate.sourceAddressHandle != null
        && sourceCandidates.includes(candidate.sourceAddressHandle)
      ) ?? null;
  const cause = new TemplateCompilerContextFamilyFrontierCause(
    frontier.frontierKind,
    frontier.node?.occurrenceKey ?? null,
    frontier.attribute?.occurrenceKey ?? null,
    issue,
    issue?.sourceAddressHandle ?? bundle?.syntax.sourceAddressHandle ?? null,
  );
  return reasonFor(
    TemplateCompilerContextFamilyCompilationStage.FamilyCompletion,
    issue?.issueKind ?? frontier.frontierKind,
    issue?.message ?? frontier.summary,
    [
      frontier.frontierKind,
      ...(cause.nodeOccurrenceKey == null ? [] : [cause.nodeOccurrenceKey]),
      ...(cause.attributeOccurrenceKey == null ? [] : [cause.attributeOccurrenceKey]),
      ...(bundle == null ? [] : [bundle.attributeProductHandle]),
      ...(issue == null ? [] : [issue.productHandle]),
    ],
    TemplateCompilerContextFamilyCompilationReasonRole.PrimaryFrontier,
    cause,
  );
}

const frontierDerivativeReasonKinds = new Set<string>([
  TemplateCompilerTraversalCompletionAuditReasonKind.CursorFrontier,
  TemplateCompilerTraversalCompletionAuditReasonKind.RootPhaseIncomplete,
  TemplateCompilerTraversalCompletionAuditReasonKind.LiveSiteIncomplete,
  TemplateCompilerContextFamilyCompletionReasonKind.ContextTaskIncomplete,
]);

function isFrontierDerivative(reasonKind: string): boolean {
  return frontierDerivativeReasonKinds.has(reasonKind);
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
  role: TemplateCompilerContextFamilyCompilationReasonRole =
    TemplateCompilerContextFamilyCompilationReasonRole.Independent,
  frontierCause: TemplateCompilerContextFamilyFrontierCause | null = null,
): TemplateCompilerContextFamilyCompilationReason {
  return new TemplateCompilerContextFamilyCompilationReason(
    stage,
    reasonKind,
    summary,
    stableKeys,
    role,
    frontierCause,
  );
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
