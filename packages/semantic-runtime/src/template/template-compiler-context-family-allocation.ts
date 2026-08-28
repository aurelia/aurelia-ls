import { localKeyPart } from '../kernel/local-key.js';
import { CompiledTemplateReference } from './compiled-template.js';
import {
  TemplateCompilerFamilyElementLoweringSite,
  type TemplateCompilerContextFamilyRowAssembly,
  type TemplateCompilerFamilyContextRowAssembly,
  TemplateCompilerFamilyRootMembershipDraft,
  TemplateCompilerFamilyTemplateControllerTransitionRowDraft,
} from './template-compiler-context-family-row-assembly.js';
import {
  type TemplateCompilerFamilyWireFunding,
  type TemplateCompilerFamilyWireFundingDraft,
  TemplateCompilerFamilyWireReferenceKind,
  TemplateCompilerFamilyWireResolution,
  TemplateCompilerFamilyWireRole,
} from './template-compiler-family-wire-funding.js';
import {
  fundTemplateCompilerHydrateElements,
  TemplateCompilerFundedHydrateElementHead,
  type TemplateCompilerHydrateElementFundingRow,
  TemplateCompilerHydrateElementFundingDraft,
  TemplateCompilerHydrateElementProjectionFunding,
  type TemplateCompilerHydrateElementProjectionFundingPlan,
} from './template-compiler-hydrate-element-funding.js';
import {
  fundTemplateCompilerHydrateTemplateControllers,
  TemplateCompilerFundedHydrateTemplateControllerEdge,
  TemplateCompilerHydrateTemplateControllerChildFunding,
  type TemplateCompilerHydrateTemplateControllerChildFundingPlan,
  TemplateCompilerHydrateTemplateControllerFundingDraft,
} from './template-compiler-hydrate-template-controller-funding.js';
import {
  TemplateCompilerHydrateElementBlockerKind,
} from './template-compiler-hydrate-element-staging.js';
import type { HtmlAttributeReference, HtmlNodeReference } from './html-ir.js';
import {
  HydrateElementProjectionContributor,
  HydrateElementProjectionDefinition,
  type TemplateInstruction,
} from './instruction-ir.js';
import {
  TemplateCompilerLiveAllocationLedgerState,
  TemplateCompilerLiveAllocationSnapshotState,
  type TemplateCompilerLiveAllocationLedger,
  type TemplateCompilerLiveAllocationNamespaceCounts,
  type TemplateCompilerLiveAllocationSnapshot,
  type TemplateCompilerLivePreparedAllocationSnapshot,
  type TemplateCompilerLiveProductReservation,
  TemplateCompilerLiveProductReservationRole,
} from './template-compiler-live-allocation.js';
import {
  TemplateCompilerOccurrenceSourcePosture,
  type TemplateCompilerOccurrenceTargetRowDraft,
} from './template-compiler-occurrence-row-assembly.js';
import { TemplateCompilerPreparedInstructionFundingAuthority } from './template-compiler-prepared-instruction-funding.js';
import {
  type TemplateCompilerProjectionContributorReceipt,
  TemplateCompilerProjectionRealizedEntrantBand,
} from './template-compiler-projection-logical-extraction.js';
import type {
  TemplateCompilerProcessContentResult,
} from './template-compiler-process-content.js';
import {
  TemplateCompilerSiteCursorContextKind,
  type TemplateCompilerSiteCursorContextReference,
} from './template-compiler-site-cursor-task.js';
import { TemplateCompilerTemplateControllerTransitionEdgeReceipt } from './template-compiler-template-controller-transition.js';

const contextFamilyAllocationAuthority = {};

export const enum TemplateCompilerContextFamilyAllocationState {
  Exact = 'exact',
  Pending = 'pending',
  Ineligible = 'ineligible',
}

export const enum TemplateCompilerContextFamilyAllocationReasonKind {
  ForeignRows = 'foreign-rows',
  StaleRows = 'stale-rows',
  ForeignWires = 'foreign-wires',
  WireFundingPending = 'wire-funding-pending',
  ParentAllocationOpen = 'parent-allocation-open',
  SourcePostureOpen = 'source-posture-open',
  ForwardedBlocker = 'forwarded-blocker',
  InstructionAllocationMismatch = 'instruction-allocation-mismatch',
  InstructionOwnerMissing = 'instruction-owner-missing',
  WireCoverageMismatch = 'wire-coverage-mismatch',
  RootReservationCollision = 'root-reservation-collision',
}

export class TemplateCompilerContextFamilyAllocationReason {
  constructor(
    readonly reasonKind: TemplateCompilerContextFamilyAllocationReasonKind,
    readonly summary: string,
    readonly stableSlotKeys: readonly string[] = [],
  ) {}
}

export const enum TemplateCompilerFundedContextDefinitionOwnerKind {
  Root = 'root',
  TemplateController = 'template-controller',
  Projection = 'projection',
}

export type TemplateCompilerFundedContextDefinitionOwner =
  | TemplateCompilerFamilyRootMembershipDraft
  | TemplateCompilerTemplateControllerTransitionEdgeReceipt
  | TemplateCompilerProjectionRealizedEntrantBand;

/** One prospective compiled-template identity for one exact cursor context. */
export class TemplateCompilerFundedContextDefinition {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly contextAssembly: TemplateCompilerFamilyContextRowAssembly,
    readonly reservation: TemplateCompilerLiveProductReservation,
    readonly compiledTemplate: CompiledTemplateReference,
    readonly ownerKind: TemplateCompilerFundedContextDefinitionOwnerKind,
    readonly owner: TemplateCompilerFundedContextDefinitionOwner,
  ) {
    const context = contextAssembly.context;
    const ownerMatches = ownerKind === TemplateCompilerFundedContextDefinitionOwnerKind.Root
      ? context.contextKind === TemplateCompilerSiteCursorContextKind.Root
        && owner instanceof TemplateCompilerFamilyRootMembershipDraft
        && owner.receipt.traversal.audit.transcript.taskSnapshot.rootContext === context
        && owner.receipt.traversal.contexts[0] === contextAssembly.traversal
      : ownerKind === TemplateCompilerFundedContextDefinitionOwnerKind.TemplateController
        ? context.contextKind === TemplateCompilerSiteCursorContextKind.TemplateController
          && owner instanceof TemplateCompilerTemplateControllerTransitionEdgeReceipt
          && owner.childContext === context
          && contextAssembly.traversal.templateControllerOwner?.edge === owner
        : context.contextKind === TemplateCompilerSiteCursorContextKind.Projection
          && owner instanceof TemplateCompilerProjectionRealizedEntrantBand
          && owner.context === context
          && contextAssembly.traversal.projectionOwner?.staging.band === owner;
    const expectedRole = ownerKind === TemplateCompilerFundedContextDefinitionOwnerKind.Root
      ? TemplateCompilerLiveProductReservationRole.RootCompiledTemplate
      : TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate;
    if (
      authority !== contextFamilyAllocationAuthority
      || compiledTemplate.productHandle !== reservation.productHandle
      || compiledTemplate.identityHandle !== reservation.identityHandle
      || reservation.role !== expectedRole
      || !ownerMatches
    ) {
      throw new Error(`Funded context definition '${context.localKey}' lost owner or reservation authority.`);
    }
    this.#authority = authority;
  }

  get context(): TemplateCompilerSiteCursorContextReference {
    return this.contextAssembly.context;
  }

  isModuleConstructed(): boolean {
    return this.#authority === contextFamilyAllocationAuthority;
  }
}

export type TemplateCompilerContextFamilyFundedInstruction =
  | TemplateCompilerFundedHydrateTemplateControllerEdge
  | TemplateCompilerFundedHydrateElementHead<object, TemplateCompilerHydrateElementFundingRow<object>>;

/** Complete family funding frozen locally while every proposed handle remains namespace-invisible. */
export class TemplateCompilerContextFamilyAllocationPreparation {
  readonly #authority: object;
  readonly definitionByContext: ReadonlyMap<
    TemplateCompilerSiteCursorContextReference,
    TemplateCompilerFundedContextDefinition
  >;
  readonly hydrateTemplateControllers: readonly TemplateCompilerFundedHydrateTemplateControllerEdge[];
  readonly hydrateElements: readonly TemplateCompilerFundedHydrateElementHead<
    object,
    TemplateCompilerHydrateElementFundingRow<object>
  >[];

  constructor(
    authority: object,
    readonly rows: TemplateCompilerContextFamilyRowAssembly,
    readonly wires: TemplateCompilerFamilyWireFunding,
    readonly parentAllocation: TemplateCompilerLiveAllocationSnapshot,
    readonly preparedAllocation: TemplateCompilerLivePreparedAllocationSnapshot,
    readonly contextDefinitions: readonly TemplateCompilerFundedContextDefinition[],
    readonly fundedInstructions: readonly TemplateCompilerContextFamilyFundedInstruction[],
    readonly namespaceCountsBefore: TemplateCompilerLiveAllocationNamespaceCounts,
  ) {
    this.definitionByContext = new Map(contextDefinitions.map((definition) => [
      definition.context,
      definition,
    ] as const));
    this.hydrateTemplateControllers = fundedInstructions.filter(
      (funded): funded is TemplateCompilerFundedHydrateTemplateControllerEdge =>
        funded instanceof TemplateCompilerFundedHydrateTemplateControllerEdge,
    );
    this.hydrateElements = fundedInstructions.filter(
      (funded): funded is TemplateCompilerFundedHydrateElementHead<
        object,
        TemplateCompilerHydrateElementFundingRow<object>
      > => funded instanceof TemplateCompilerFundedHydrateElementHead,
    );
    const contextReservations = new Set(contextDefinitions.map((definition) => definition.reservation));
    const effectiveCaptures = this.hydrateElements.flatMap((head) => head.captures)
      .flatMap((capture) => capture.effectiveReservation == null ? [] : [capture.effectiveReservation]);
    const expectedReservations = new Set([
      ...contextReservations,
      ...effectiveCaptures,
    ]);
    const expectedReservationOrder: TemplateCompilerLiveProductReservation[] = [
      contextDefinitions[0]!.reservation,
    ];
    for (const funded of fundedInstructions) {
      if (funded instanceof TemplateCompilerFundedHydrateTemplateControllerEdge) {
        expectedReservationOrder.push(funded.childFunding.reservation);
      } else {
        expectedReservationOrder.push(...funded.productReservations);
      }
    }
    const expectedRows = rows.contexts.flatMap((context) => context.rows).filter((row) =>
      row instanceof TemplateCompilerFamilyTemplateControllerTransitionRowDraft
      || row.hydrateElement != null
    );
    const currentCounts = preparedAllocation.ledger.namespace.readReservationCounts();
    if (
      authority !== contextFamilyAllocationAuthority
      || wires.assembly !== rows
      || parentAllocation !== rows.receipt.traversal.audit.transcript.allocationSnapshot
      || preparedAllocation.ledger.namespace !== parentAllocation.ledger.namespace
      || preparedAllocation.ledger.state !== TemplateCompilerLiveAllocationLedgerState.Prepared
      || preparedAllocation.state !== TemplateCompilerLiveAllocationSnapshotState.Complete
      || preparedAllocation.expressionAllocations.length !== 0
      || preparedAllocation.sourceAllocations.length !== 0
      || contextDefinitions.length !== rows.contexts.length
      || this.definitionByContext.size !== contextDefinitions.length
      || contextDefinitions.some((definition, ordinal) =>
        !definition.isModuleConstructed()
        || definition.contextAssembly !== rows.contexts[ordinal]
      )
      || fundedInstructions.length !== expectedRows.length
      || fundedInstructions.some((funded, ordinal) => funded.draft.row !== expectedRows[ordinal])
      || !sameObjects(
        fundedInstructions.map((funded) => funded.instructionAllocation),
        preparedAllocation.instructionAllocations,
      )
      || preparedAllocation.productReservations.length !== contextDefinitions.length + effectiveCaptures.length
      || contextReservations.size !== contextDefinitions.length
      || expectedReservations.size !== contextDefinitions.length + effectiveCaptures.length
      || preparedAllocation.productReservations[0] !== contextDefinitions[0]?.reservation
      || !sameObjects(expectedReservationOrder, preparedAllocation.productReservations)
      || preparedAllocation.productReservations.some((reservation) =>
        !expectedReservations.has(reservation)
      )
      || !sameCounts(namespaceCountsBefore, currentCounts)
    ) {
      throw new Error('Prepared context-family allocation lost context, instruction, or invisible inventory coverage.');
    }
    this.#authority = authority;
  }

  get rootDefinition(): TemplateCompilerFundedContextDefinition {
    return this.contextDefinitions[0]!;
  }

  isModuleConstructed(): boolean {
    return this.#authority === contextFamilyAllocationAuthority;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed()
      && this.rows.isCurrent()
      && this.wires.isCurrent()
      && this.parentAllocation.isCurrent()
      && this.preparedAllocation.isCurrent();
  }

  definitionForContext(
    context: TemplateCompilerSiteCursorContextReference,
  ): TemplateCompilerFundedContextDefinition | null {
    return this.definitionByContext.get(context) ?? null;
  }
}

export class TemplateCompilerContextFamilyAllocationResult {
  constructor(
    readonly state: TemplateCompilerContextFamilyAllocationState,
    readonly preparation: TemplateCompilerContextFamilyAllocationPreparation | null,
    readonly reasons: readonly TemplateCompilerContextFamilyAllocationReason[],
  ) {
    if (
      (state === TemplateCompilerContextFamilyAllocationState.Exact)
        !== (preparation != null && reasons.length === 0)
      || (state === TemplateCompilerContextFamilyAllocationState.Pending
        || state === TemplateCompilerContextFamilyAllocationState.Ineligible)
        !== (preparation == null && reasons.length > 0)
    ) {
      throw new Error('Context-family allocation result lost exact, pending, or ineligible ownership.');
    }
  }
}

interface TemplateControllerPreflight {
  readonly node: HtmlNodeReference;
  readonly attribute: HtmlAttributeReference;
}

interface ProjectionDefinitionPreflight {
  readonly band: TemplateCompilerProjectionRealizedEntrantBand;
  readonly contributors: readonly HydrateElementProjectionContributor[];
  readonly sourceAddressHandle: TemplateInstruction['sourceAddressHandle'];
}

interface HydrateElementPreflight {
  readonly site: TemplateCompilerFamilyElementLoweringSite;
  readonly instructionNode: HtmlNodeReference;
  readonly instructionOwnerIdentityHandle: NonNullable<HtmlNodeReference['identityHandle']>;
  readonly projection: readonly ProjectionDefinitionPreflight[];
  readonly discardedProjectionContributors: readonly HydrateElementProjectionContributor[];
  readonly processContentRemovedChildNodes: readonly HtmlNodeReference[];
}

interface FamilyAllocationPreflight {
  readonly templateControllers: ReadonlyMap<
    TemplateCompilerFamilyTemplateControllerTransitionRowDraft,
    TemplateControllerPreflight
  >;
  readonly hydrateElements: ReadonlyMap<TemplateCompilerOccurrenceTargetRowDraft, HydrateElementPreflight>;
}

/** Prepare every family definition and new HTC/HE instruction without committing the shared allocation phase. */
export function prepareTemplateCompilerContextFamilyAllocation(
  rows: TemplateCompilerContextFamilyRowAssembly,
  wires: TemplateCompilerFamilyWireFunding,
): TemplateCompilerContextFamilyAllocationResult {
  const admission = familyAllocationAdmission(rows, wires);
  if (admission != null) return admission;
  const parentAllocation = rows.receipt.traversal.audit.transcript.allocationSnapshot;
  const preflight = prepareFamilyAllocationInputs(rows, wires, parentAllocation);
  if (preflight instanceof TemplateCompilerContextFamilyAllocationResult) return preflight;

  const lane = rows.receipt.endpoint.lane;
  const phaseKey = `${lane.localKey}:context-family-allocation`;
  const rootAllocationLocal = `${phaseKey}:compiled-template:root`;
  const authoredRoot = rows.receipt.traversal.audit.transcript.binding.compilation.compiledTemplate.compiledTemplate;
  const proposedRootProduct = parentAllocation.ledger.namespace.handles.product(rootAllocationLocal);
  const proposedRootIdentity = parentAllocation.ledger.namespace.handles.identity(rootAllocationLocal);
  if (
    proposedRootProduct === authoredRoot.productHandle
    || proposedRootIdentity === authoredRoot.identityHandle
  ) {
    return unavailable(
      TemplateCompilerContextFamilyAllocationState.Ineligible,
      TemplateCompilerContextFamilyAllocationReasonKind.RootReservationCollision,
      'Context-family root reservation collides with the authored compiled output.',
    );
  }

  const namespace = parentAllocation.ledger.namespace;
  const namespaceCountsBefore = namespace.readReservationCounts();
  const ledger = namespace.preparePhase(phaseKey);
  const registry = new ContextDefinitionRegistry(rows);
  const rootReservation = ledger.reserveProduct(
    `${phaseKey}:root`,
    'compiled-template:root',
    TemplateCompilerLiveProductReservationRole.RootCompiledTemplate,
    rows.receipt.traversal.audit.transcript.binding.unit.rootContext.sourceAddressHandle,
    rootAllocationLocal,
  );
  registry.register(
    rows.contexts[0]!,
    rootReservation,
    new CompiledTemplateReference(rootReservation.productHandle, rootReservation.identityHandle),
    TemplateCompilerFundedContextDefinitionOwnerKind.Root,
    rows.rootMembership,
  );
  const instructionAuthority = TemplateCompilerPreparedInstructionFundingAuthority.create(ledger, phaseKey);
  const fundedInstructions: TemplateCompilerContextFamilyFundedInstruction[] = [];

  for (const context of rows.contexts) {
    registry.requireRegistered(context.context);
    for (const row of context.rows) {
      if (row instanceof TemplateCompilerFamilyTemplateControllerTransitionRowDraft) {
        const input = preflight.templateControllers.get(row)!;
        const funding = fundTemplateCompilerHydrateTemplateControllers(instructionAuthority, [
          new TemplateCompilerHydrateTemplateControllerFundingDraft(
            row,
            row.edge,
            row.rowContext,
            row.childContext,
            row.draft.siteKey,
            row.draft.localKey,
            input.node,
            input.attribute,
            row.draft.controllerName,
            row.draft.resource,
            row.draft.props,
            row.draft.sourceAddressHandle,
            new FamilyTemplateControllerChildFundingPlan(registry, row),
          ),
        ]);
        fundedInstructions.push(funding.edges[0]!);
        continue;
      }
      const input = preflight.hydrateElements.get(row) ?? null;
      if (input == null) continue;
      const head = row.hydrateElement!;
      const funding = fundTemplateCompilerHydrateElements(instructionAuthority, [
        new TemplateCompilerHydrateElementFundingDraft<
          object,
          TemplateCompilerHydrateElementFundingRow<object>
        >(
          row,
          input.site,
          head.instructionSlotKey,
          row.occurrence.occurrenceKey,
          input.instructionNode,
          input.instructionOwnerIdentityHandle,
          head.envelope.elementName,
          head.envelope.resourceLookupName,
          head.envelope.resource,
          new FamilyProjectionFundingPlan(registry, input.projection),
          input.discardedProjectionContributors,
          head.envelope.processContent.metadata,
          input.processContentRemovedChildNodes,
          head.envelope.bindableInstructions,
          head.captures,
          head.envelope.containerless.fromUsage,
          head.envelope.source.sourceAddressHandle,
        ),
      ]);
      fundedInstructions.push(funding.heads[0]!);
    }
  }

  const contextDefinitions = registry.finish();
  const preparedAllocation = ledger.prepareSnapshot();
  const preparation = new TemplateCompilerContextFamilyAllocationPreparation(
    contextFamilyAllocationAuthority,
    rows,
    wires,
    parentAllocation,
    preparedAllocation,
    contextDefinitions,
    fundedInstructions,
    namespaceCountsBefore,
  );
  return new TemplateCompilerContextFamilyAllocationResult(
    TemplateCompilerContextFamilyAllocationState.Exact,
    preparation,
    [],
  );
}

class ContextDefinitionRegistry {
  readonly #definitions = new Map<TemplateCompilerSiteCursorContextReference, TemplateCompilerFundedContextDefinition>();

  constructor(readonly rows: TemplateCompilerContextFamilyRowAssembly) {}

  register(
    contextAssembly: TemplateCompilerFamilyContextRowAssembly,
    reservation: TemplateCompilerLiveProductReservation,
    compiledTemplate: CompiledTemplateReference,
    ownerKind: TemplateCompilerFundedContextDefinitionOwnerKind,
    owner: TemplateCompilerFundedContextDefinitionOwner,
  ): TemplateCompilerFundedContextDefinition {
    const context = contextAssembly.context;
    if (
      this.rows.contextByReference.get(context) !== contextAssembly
      || this.#definitions.has(context)
      || (context.parent != null && !this.#definitions.has(context.parent))
    ) {
      throw new Error(`Context definition '${context.localKey}' lost unique topological registration.`);
    }
    const definition = new TemplateCompilerFundedContextDefinition(
      contextFamilyAllocationAuthority,
      contextAssembly,
      reservation,
      compiledTemplate,
      ownerKind,
      owner,
    );
    this.#definitions.set(context, definition);
    return definition;
  }

  requireRegistered(context: TemplateCompilerSiteCursorContextReference): TemplateCompilerFundedContextDefinition {
    const definition = this.#definitions.get(context) ?? null;
    if (definition == null) throw new Error(`Context '${context.localKey}' has no funded definition.`);
    return definition;
  }

  finish(): readonly TemplateCompilerFundedContextDefinition[] {
    return this.rows.contexts.map((context) => this.requireRegistered(context.context));
  }
}

class FamilyTemplateControllerChildFundingPlan
  implements TemplateCompilerHydrateTemplateControllerChildFundingPlan {
  constructor(
    private readonly registry: ContextDefinitionRegistry,
    private readonly row: TemplateCompilerFamilyTemplateControllerTransitionRowDraft,
  ) {}

  fund(
    instructionLocal: string,
    ledger: TemplateCompilerLiveAllocationLedger,
  ): TemplateCompilerHydrateTemplateControllerChildFunding {
    const allocationLocal = `${instructionLocal}:child-compiled-template`;
    const reservation = ledger.reserveProduct(
      `${instructionLocal}:child`,
      'child-compiled-template',
      TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
      this.row.draft.sourceAddressHandle,
      allocationLocal,
    );
    const compiledTemplate = new CompiledTemplateReference(reservation.productHandle, reservation.identityHandle);
    this.registry.register(
      this.registry.rows.contextByReference.get(this.row.childContext)!,
      reservation,
      compiledTemplate,
      TemplateCompilerFundedContextDefinitionOwnerKind.TemplateController,
      this.row.edge,
    );
    return TemplateCompilerHydrateTemplateControllerChildFunding.create(
      instructionLocal,
      this.row.childContext,
      reservation,
      compiledTemplate,
    );
  }
}

class FamilyProjectionFundingPlan implements TemplateCompilerHydrateElementProjectionFundingPlan {
  constructor(
    private readonly registry: ContextDefinitionRegistry,
    private readonly definitions: readonly ProjectionDefinitionPreflight[],
  ) {}

  fund(
    instructionLocal: string,
    ledger: TemplateCompilerLiveAllocationLedger,
  ): TemplateCompilerHydrateElementProjectionFunding {
    const reservations: TemplateCompilerLiveProductReservation[] = [];
    const definitions = this.definitions.map((input) => {
      const local = `${instructionLocal}:projection:${localKeyPart(input.band.planned.group.slotName)}`;
      const reservation = ledger.reserveProduct(
        local,
        'compiled-template',
        TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
        input.sourceAddressHandle,
        `${local}:compiled-template`,
      );
      reservations.push(reservation);
      const compiledTemplate = new CompiledTemplateReference(reservation.productHandle, reservation.identityHandle);
      this.registry.register(
        this.registry.rows.contextByReference.get(input.band.context)!,
        reservation,
        compiledTemplate,
        TemplateCompilerFundedContextDefinitionOwnerKind.Projection,
        input.band,
      );
      return new HydrateElementProjectionDefinition(
        input.band.planned.group.slotName,
        compiledTemplate,
        input.contributors,
        input.sourceAddressHandle,
      );
    });
    return TemplateCompilerHydrateElementProjectionFunding.create(definitions, reservations);
  }
}

function familyAllocationAdmission(
  rows: TemplateCompilerContextFamilyRowAssembly,
  wires: TemplateCompilerFamilyWireFunding,
): TemplateCompilerContextFamilyAllocationResult | null {
  if (!rows.isModuleConstructed()) {
    return unavailable(
      TemplateCompilerContextFamilyAllocationState.Ineligible,
      TemplateCompilerContextFamilyAllocationReasonKind.ForeignRows,
      'Context-family allocation requires one module-constructed row assembly.',
    );
  }
  if (!rows.isCurrent()) {
    return unavailable(
      TemplateCompilerContextFamilyAllocationState.Ineligible,
      TemplateCompilerContextFamilyAllocationReasonKind.StaleRows,
      'Context-family allocation requires one current row assembly.',
    );
  }
  if (!wires.isModuleConstructed() || wires.assembly !== rows || !wires.isCurrent()) {
    return unavailable(
      TemplateCompilerContextFamilyAllocationState.Ineligible,
      TemplateCompilerContextFamilyAllocationReasonKind.ForeignWires,
      'Context-family allocation requires the exact current wire funding for its row assembly.',
    );
  }
  const pendingWires = wires.drafts.filter((draft) => !draft.isWireReady);
  if (pendingWires.length > 0) {
    return unavailable(
      TemplateCompilerContextFamilyAllocationState.Pending,
      TemplateCompilerContextFamilyAllocationReasonKind.WireFundingPending,
      'One or more family instruction wires remain non-exact.',
      pendingWires.map((draft) => draft.stableSlotKey),
    );
  }
  const openMemberships = rows.contexts.flatMap((context) => context.memberships)
    .filter((membership) => membership.sourcePosture === TemplateCompilerOccurrenceSourcePosture.Open);
  if (openMemberships.length > 0) {
    return unavailable(
      TemplateCompilerContextFamilyAllocationState.Pending,
      TemplateCompilerContextFamilyAllocationReasonKind.SourcePostureOpen,
      'One or more family occurrence memberships retain an open source posture.',
      openMemberships.map((membership) => membership.stableSlotKey),
    );
  }
  const allowedBlockers = new Set([
    TemplateCompilerHydrateElementBlockerKind.CaptureSyntaxPublicationPending,
    TemplateCompilerHydrateElementBlockerKind.TargetRowPlacementPending,
  ]);
  const unsupportedBlockers = rows.receipt.traversal.hydrateElements.flatMap((hydrateElement) =>
    hydrateElement.forwardedBlockers.filter((blocker) => !allowedBlockers.has(blocker.blockerKind))
  );
  if (unsupportedBlockers.length > 0) {
    return unavailable(
      TemplateCompilerContextFamilyAllocationState.Pending,
      TemplateCompilerContextFamilyAllocationReasonKind.ForwardedBlocker,
      unsupportedBlockers.map((blocker) => blocker.summary).join(' '),
    );
  }
  const parentAllocation = rows.receipt.traversal.audit.transcript.allocationSnapshot;
  if (
    parentAllocation.state !== TemplateCompilerLiveAllocationSnapshotState.Complete
    || !parentAllocation.isCurrent()
  ) {
    return unavailable(
      TemplateCompilerContextFamilyAllocationState.Pending,
      TemplateCompilerContextFamilyAllocationReasonKind.ParentAllocationOpen,
      'Context-family allocation requires the complete current live-site allocation inventory.',
    );
  }
  return null;
}

function prepareFamilyAllocationInputs(
  rows: TemplateCompilerContextFamilyRowAssembly,
  wires: TemplateCompilerFamilyWireFunding,
  parentAllocation: TemplateCompilerLiveAllocationSnapshot,
): FamilyAllocationPreflight | TemplateCompilerContextFamilyAllocationResult {
  const allocatedInstructions = new Map(parentAllocation.instructionAllocations.flatMap((allocation) =>
    allocation.instruction == null ? [] : [[allocation.productHandle, allocation.instruction] as const]
  ));
  const requiredExistingInstructions: TemplateInstruction[] = [];
  requiredExistingInstructions.push(...rows.surrogateInstructions);
  for (const context of rows.contexts) {
    for (const row of context.ordinaryRows) {
      requiredExistingInstructions.push(...row.instructions);
      if (row.hydrateElement != null) {
        requiredExistingInstructions.push(...row.hydrateElement.envelope.bindableInstructions);
      }
    }
    for (const row of context.templateControllerRows) requiredExistingInstructions.push(...row.draft.props);
  }
  const missingInstructions = requiredExistingInstructions.filter((instruction) =>
    allocatedInstructions.get(instruction.productHandle) !== instruction
  );
  if (missingInstructions.length > 0) {
    return unavailable(
      TemplateCompilerContextFamilyAllocationState.Ineligible,
      TemplateCompilerContextFamilyAllocationReasonKind.InstructionAllocationMismatch,
      'Family row instructions do not belong to the completed live-site allocation inventory.',
    );
  }

  const templateControllers = new Map<
    TemplateCompilerFamilyTemplateControllerTransitionRowDraft,
    TemplateControllerPreflight
  >();
  const hydrateElements = new Map<TemplateCompilerOccurrenceTargetRowDraft, HydrateElementPreflight>();
  try {
    for (const context of rows.contexts) {
      for (const row of context.templateControllerRows) {
        templateControllers.set(row, {
          node: requiredNodeWire(wires, row.edge, TemplateCompilerFamilyWireRole.TemplateControllerNode),
          attribute: requiredAttributeWire(
            wires,
            row.edge,
            TemplateCompilerFamilyWireRole.TemplateControllerAttribute,
          ),
        });
      }
      for (const row of context.ordinaryRows) {
        const head = row.hydrateElement;
        if (head == null) continue;
        if (!(row.site instanceof TemplateCompilerFamilyElementLoweringSite)) {
          throw new WireCoverageError(row.stableSlotKey, 'Family HE row lost its family element lowering site.');
        }
        const instructionNode = requiredNodeWire(
          wires,
          head,
          TemplateCompilerFamilyWireRole.HydrateElementNode,
        );
        const instructionOwnerIdentityHandle = head.envelope.definition.identityHandle
          ?? instructionNode.identityHandle;
        if (instructionOwnerIdentityHandle == null) {
          return unavailable(
            TemplateCompilerContextFamilyAllocationState.Ineligible,
            TemplateCompilerContextFamilyAllocationReasonKind.InstructionOwnerMissing,
            `HydrateElement row '${row.stableSlotKey}' has no instruction-owner identity.`,
            [row.stableSlotKey],
          );
        }
        const projection = projectionPreflight(row.site, wires);
        hydrateElements.set(row, {
          site: row.site,
          instructionNode,
          instructionOwnerIdentityHandle,
          projection: projection.definitions,
          discardedProjectionContributors: projection.discarded,
          processContentRemovedChildNodes: processContentRemovedChildWires(head.envelope.processContent.result, wires),
        });
      }
    }
  } catch (error) {
    if (!(error instanceof WireCoverageError)) throw error;
    return unavailable(
      TemplateCompilerContextFamilyAllocationState.Ineligible,
      TemplateCompilerContextFamilyAllocationReasonKind.WireCoverageMismatch,
      error.message,
      [error.stableSlotKey],
    );
  }
  return { templateControllers, hydrateElements };
}

function projectionPreflight(
  site: TemplateCompilerFamilyElementLoweringSite,
  wires: TemplateCompilerFamilyWireFunding,
): {
  readonly definitions: readonly ProjectionDefinitionPreflight[];
  readonly discarded: readonly HydrateElementProjectionContributor[];
} {
  const extraction = site.reach.hydrateElement.projectionExtraction;
  if (extraction == null) return { definitions: [], discarded: [] };
  const realization = extraction.realization;
  const definitions = realization.entrantBands.map((band) => ({
    band,
    contributors: band.planned.contributors.map((receipt) => projectionContributorWire(receipt, wires)),
    sourceAddressHandle: band.planned.group.sourceAddressHandle,
  }));
  const discarded = extraction.preparation.discardedWhitespace.map((receipt) =>
    projectionContributorWire(
      extraction.preparation.contributorReceiptFor(receipt.contributor)!,
      wires,
    )
  );
  if (
    definitions.length !== extraction.preparation.grouping.definitionGroups.length
    || definitions.some((definition, ordinal) =>
      definition.band.planned.group !== extraction.preparation.grouping.definitionGroups[ordinal]
    )
  ) {
    throw new WireCoverageError(site.rowSlotKey, 'Projection definition groups lost realized context order.');
  }
  return { definitions, discarded };
}

function projectionContributorWire(
  receipt: TemplateCompilerProjectionContributorReceipt,
  wires: TemplateCompilerFamilyWireFunding,
): HydrateElementProjectionContributor {
  const node = requiredNodeWire(wires, receipt, TemplateCompilerFamilyWireRole.ProjectionContributorNode);
  const slot = receipt.slotConsumption == null
    ? null
    : requiredAttributeWireDraft(
        wires,
        receipt.slotConsumption,
        TemplateCompilerFamilyWireRole.ProjectionSlotAttribute,
      );
  return new HydrateElementProjectionContributor(
    node,
    receipt.contributor.slotName,
    slot?.wireReference as HtmlAttributeReference | null,
    slot?.valueAddressHandle ?? null,
    receipt.contributor.disposition,
  );
}

function processContentRemovedChildWires(
  result: TemplateCompilerProcessContentResult | null,
  wires: TemplateCompilerFamilyWireFunding,
): readonly HtmlNodeReference[] {
  if (result == null) return [];
  const drafts = wires.draftsForOwner(result, TemplateCompilerFamilyWireRole.ProcessContentRemovedChild);
  if (
    drafts.length !== result.removedOccurrences.length
    || drafts.some((draft, ordinal) => draft.occurrence !== result.removedOccurrences[ordinal])
  ) {
    throw new WireCoverageError(
      result.plan.host.occurrenceKey,
      'processContent removed-child wires lost direct removal order.',
    );
  }
  return drafts.map((draft) => requiredNodeReference(draft));
}

function requiredNodeWire(
  wires: TemplateCompilerFamilyWireFunding,
  owner: Parameters<TemplateCompilerFamilyWireFunding['draftsForOwner']>[0],
  role: TemplateCompilerFamilyWireRole,
): HtmlNodeReference {
  return requiredNodeReference(requiredWire(wires, owner, role));
}

function requiredAttributeWire(
  wires: TemplateCompilerFamilyWireFunding,
  owner: Parameters<TemplateCompilerFamilyWireFunding['draftsForOwner']>[0],
  role: TemplateCompilerFamilyWireRole,
): HtmlAttributeReference {
  return requiredAttributeWireDraft(wires, owner, role).wireReference as HtmlAttributeReference;
}

function requiredAttributeWireDraft(
  wires: TemplateCompilerFamilyWireFunding,
  owner: Parameters<TemplateCompilerFamilyWireFunding['draftsForOwner']>[0],
  role: TemplateCompilerFamilyWireRole,
): TemplateCompilerFamilyWireFundingDraft {
  const draft = requiredWire(wires, owner, role);
  if (
    draft.referenceKind !== TemplateCompilerFamilyWireReferenceKind.Attribute
    || draft.wireReference == null
  ) {
    throw new WireCoverageError(draft.stableSlotKey, `Family wire '${draft.stableSlotKey}' is not an attribute.`);
  }
  return draft;
}

function requiredNodeReference(draft: TemplateCompilerFamilyWireFundingDraft): HtmlNodeReference {
  if (
    draft.referenceKind !== TemplateCompilerFamilyWireReferenceKind.Node
    || draft.wireReference == null
  ) {
    throw new WireCoverageError(draft.stableSlotKey, `Family wire '${draft.stableSlotKey}' is not a node.`);
  }
  return draft.wireReference as HtmlNodeReference;
}

function requiredWire(
  wires: TemplateCompilerFamilyWireFunding,
  owner: Parameters<TemplateCompilerFamilyWireFunding['draftsForOwner']>[0],
  role: TemplateCompilerFamilyWireRole,
): TemplateCompilerFamilyWireFundingDraft {
  const drafts = wires.draftsForOwner(owner, role);
  const draft = drafts.length === 1 ? drafts[0]! : null;
  if (draft == null || draft.resolution !== TemplateCompilerFamilyWireResolution.ExactAuthored) {
    throw new WireCoverageError(
      drafts[0]?.stableSlotKey ?? role,
      `Family owner requires exactly one '${role}' wire.`,
    );
  }
  return draft;
}

class WireCoverageError extends Error {
  constructor(readonly stableSlotKey: string, message: string) {
    super(message);
  }
}

function unavailable(
  state: TemplateCompilerContextFamilyAllocationState.Pending
    | TemplateCompilerContextFamilyAllocationState.Ineligible,
  reasonKind: TemplateCompilerContextFamilyAllocationReasonKind,
  summary: string,
  stableSlotKeys: readonly string[] = [],
): TemplateCompilerContextFamilyAllocationResult {
  return new TemplateCompilerContextFamilyAllocationResult(
    state,
    null,
    [new TemplateCompilerContextFamilyAllocationReason(reasonKind, summary, stableSlotKeys)],
  );
}

function sameObjects<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, ordinal) => right[ordinal] === value);
}

function sameCounts(
  left: TemplateCompilerLiveAllocationNamespaceCounts,
  right: TemplateCompilerLiveAllocationNamespaceCounts,
): boolean {
  return left.semanticSlots === right.semanticSlots
    && left.productHandles === right.productHandles
    && left.identityHandles === right.identityHandles
    && left.addressHandles === right.addressHandles;
}
