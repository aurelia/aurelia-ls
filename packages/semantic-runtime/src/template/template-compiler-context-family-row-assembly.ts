import { TemplateRenderTargetKind } from './compiled-template.js';
import {
  TemplateCompilerCompletedContextTraversal,
  type TemplateCompilerCompletedFamilyElementReach,
  type TemplateCompilerCompletedFamilyReach,
  type TemplateCompilerCompletedFamilyTextReach,
  TemplateCompilerCompletedProjectionContext,
  TemplateCompilerCompletedTemplateControllerLeafRehoming,
  type TemplateCompilerContextFamilyCompletionReceipt,
} from './template-compiler-context-family-completion.js';
import {
  TemplateCompilerHydrateElementBlockerKind,
} from './template-compiler-hydrate-element-staging.js';
import type { HtmlElement, HtmlText } from './html-ir.js';
import type {
  TemplateCompilerElementOccurrence,
  TemplateCompilerTextOccurrence,
} from './template-compiler-occurrence.js';
import { TemplateCompilerOccurrenceMembershipArrivalPosture } from './template-compiler-occurrence-membership.js';
export {
  TemplateCompilerOccurrenceMembershipArrivalPosture as TemplateCompilerFamilyOccurrenceArrivalPosture,
} from './template-compiler-occurrence-membership.js';
import {
  lowerTemplateCompilerElementSite,
  lowerTemplateCompilerTextSite,
  TemplateCompilerCaptureSyntaxDecisionKind,
  type TemplateCompilerElementLoweringContinuationAuthority,
  type TemplateCompilerElementLoweringSite,
  TemplateCompilerOccurrenceAttributeDispositionDraft,
  TemplateCompilerOccurrenceMembership,
  type TemplateCompilerOccurrenceRowAssemblyReason,
  TemplateCompilerOccurrenceSourcePosture,
  type TemplateCompilerOccurrenceStaticSite,
  type TemplateCompilerOccurrenceTargetRowDraft,
  type TemplateCompilerTextExpansionDraft,
  type TemplateCompilerTextLoweringSite,
} from './template-compiler-occurrence-row-assembly.js';
import {
  TemplateCompilerSiteCursorContextKind,
  type TemplateCompilerSiteCursorContextReference,
} from './template-compiler-site-cursor-task.js';
import { TemplateCompilerTargetRowPlacementKind } from './compiler-target-plan.js';
import type { TemplateCompilerTemplateControllerTransitionEdgeReceipt } from './template-compiler-template-controller-transition.js';

const familyRowAssemblyAuthority = {};

export const enum TemplateCompilerContextFamilyRowAssemblyState {
  Exact = 'exact',
  Pending = 'pending',
  Ineligible = 'ineligible',
}

export const enum TemplateCompilerContextFamilyRowAssemblyReasonKind {
  ForeignReceipt = 'foreign-receipt',
  StaleReceipt = 'stale-receipt',
  ContextOwnershipMismatch = 'context-ownership-mismatch',
  LoweringLawMismatch = 'lowering-law-mismatch',
  ForwardedBlocker = 'forwarded-blocker',
  RootCompiledTemplatePending = 'root-compiled-template-pending',
  GeneratedCompiledTemplatePending = 'generated-compiled-template-pending',
  InstructionWirePending = 'instruction-wire-pending',
  SourceWireReferencePending = 'source-wire-reference-pending',
  OpenSourcePosture = 'open-source-posture',
}

export class TemplateCompilerContextFamilyRowAssemblyReason {
  constructor(
    readonly reasonKind: TemplateCompilerContextFamilyRowAssemblyReasonKind,
    readonly summary: string,
  ) {}
}

export const enum TemplateCompilerFamilyTargetRowDraftKind {
  Ordinary = 'ordinary',
  TemplateControllerTransition = 'template-controller-transition',
}

/** Family-compatible element site; reached ownership and final lowering ownership deliberately remain separate. */
export class TemplateCompilerFamilyElementLoweringSite implements TemplateCompilerElementLoweringSite {
  readonly siteKind = 'element' as const;
  readonly rowSlotKey: string;
  readonly event;
  readonly owner;
  readonly hydrateElement;
  readonly containerlessPlacement;

  constructor(
    readonly reach: TemplateCompilerCompletedFamilyElementReach,
    readonly reachedContext: TemplateCompilerSiteCursorContextReference,
    readonly loweringContext: TemplateCompilerSiteCursorContextReference,
    readonly rehoming: TemplateCompilerCompletedTemplateControllerLeafRehoming | null,
  ) {
    this.rowSlotKey = `element:${reach.event.element.occurrenceKey}:direct-row`;
    this.event = reach.event;
    this.owner = reach.owner;
    this.hydrateElement = reach.hydrateElement.staging;
    this.containerlessPlacement = reach.hydrateElement.containerlessPlacement;
    if (
      this.owner.element !== this.event.element
      || this.hydrateElement.element !== this.event.element
      || (rehoming != null && (
        rehoming.receipt.terminalLeaf !== loweringContext
        || (rehoming.receipt.host === this.event.element
          ? rehoming.receipt.sourceContext !== reachedContext
          : reachedContext !== loweringContext)
      ))
    ) {
      throw new Error('Family element lowering site lost reached, lowering, or TC rehoming authority.');
    }
  }
}

/** Nominal family permission to discharge only the exact TC/projection continuation evidence of one element site. */
export class TemplateCompilerFamilyElementContinuationAuthority
  implements TemplateCompilerElementLoweringContinuationAuthority {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly site: TemplateCompilerFamilyElementLoweringSite,
  ) {
    if (
      authority !== familyRowAssemblyAuthority
      || site.reach.owner !== site.owner
      || site.reach.hydrateElement.staging !== site.hydrateElement
    ) {
      throw new Error('Family element continuation authority lost its exact completed lowering site.');
    }
    this.#authority = authority;
  }

  authorizesTemplateControllerContext(site: TemplateCompilerElementLoweringSite): boolean {
    const transition = this.site.reach.hydrateElement.templateControllerTransition;
    return this.#authority === familyRowAssemblyAuthority
      && site === this.site
      && transition != null
      && transition.preparation.request.owner === this.site.owner
      && transition.preparation.request.hydrateElement === this.site.hydrateElement
      && transition.realization.leafRehoming.terminalLeaf === this.site.loweringContext;
  }

  authorizesProjectionExtraction(site: TemplateCompilerElementLoweringSite): boolean {
    const extraction = this.site.reach.hydrateElement.projectionExtraction;
    return this.#authority === familyRowAssemblyAuthority
      && site === this.site
      && extraction != null
      && extraction.preparation.request.envelope === this.site.hydrateElement.draft
      && extraction.preparation.elementEvent === this.site.event;
  }
}

/** Family-compatible text site with stable parser-hole slots. */
export class TemplateCompilerFamilyTextLoweringSite implements TemplateCompilerTextLoweringSite {
  readonly siteKind = 'text' as const;
  readonly holeSlotKeys: readonly string[];
  readonly event;

  constructor(
    readonly reach: TemplateCompilerCompletedFamilyTextReach,
    readonly reachedContext: TemplateCompilerSiteCursorContextReference,
    readonly loweringContext: TemplateCompilerSiteCursorContextReference,
    readonly rehoming: TemplateCompilerCompletedTemplateControllerLeafRehoming | null,
  ) {
    this.event = reach.event;
    this.holeSlotKeys = reach.event.instructionStaging?.holes.map((hole) =>
      `text:${reach.event.text.occurrenceKey}:hole:${hole.expressionChainIndex}`
    ) ?? [];
    if (
      rehoming != null
      && rehoming.receipt.terminalLeaf !== loweringContext
    ) {
      throw new Error('Family text lowering site lost its TC leaf adoption authority.');
    }
  }
}

export type TemplateCompilerFamilyLoweringSite =
  | TemplateCompilerFamilyElementLoweringSite
  | TemplateCompilerFamilyTextLoweringSite;

export type TemplateCompilerFamilyOccurrenceSemanticOwner =
  | TemplateCompilerCompletedContextTraversal
  | TemplateCompilerCompletedProjectionContext
  | TemplateCompilerCompletedTemplateControllerLeafRehoming;

/** Exact immutable movement from event-time reach ownership to final compiler row/membership ownership. */
export class TemplateCompilerFamilyReachDisposition {
  constructor(
    readonly reach: TemplateCompilerCompletedFamilyReach,
    readonly site: TemplateCompilerFamilyLoweringSite,
    readonly reachedContext: TemplateCompilerSiteCursorContextReference,
    readonly loweringContext: TemplateCompilerSiteCursorContextReference,
    readonly rehoming: TemplateCompilerCompletedTemplateControllerLeafRehoming | null,
    readonly arrivalPosture: TemplateCompilerOccurrenceMembershipArrivalPosture,
    readonly semanticOwner: TemplateCompilerFamilyOccurrenceSemanticOwner,
  ) {
    const ownerIsExact = loweringContext.contextKind === TemplateCompilerSiteCursorContextKind.Root
      ? semanticOwner instanceof TemplateCompilerCompletedContextTraversal
        && semanticOwner.context === loweringContext
        && rehoming == null
        && arrivalPosture === TemplateCompilerOccurrenceMembershipArrivalPosture.Initial
      : loweringContext.contextKind === TemplateCompilerSiteCursorContextKind.Projection
        ? semanticOwner instanceof TemplateCompilerCompletedProjectionContext
          && semanticOwner.context === loweringContext
          && rehoming == null
          && arrivalPosture === TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer
        : semanticOwner instanceof TemplateCompilerCompletedTemplateControllerLeafRehoming
          && semanticOwner === rehoming
          && semanticOwner.receipt.terminalLeaf === loweringContext
          && arrivalPosture === (semanticOwner.receipt.host.templateContent == null
            ? TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer
            : TemplateCompilerOccurrenceMembershipArrivalPosture.AdoptedInput);
    if (
      site.reach !== reach
      || site.reachedContext !== reachedContext
      || site.loweringContext !== loweringContext
      || site.rehoming !== rehoming
      || (rehoming != null && rehoming.receipt.terminalLeaf !== loweringContext)
      || !ownerIsExact
    ) {
      throw new Error('Family reach disposition lost site, context, or semantic-owner authority.');
    }
  }
}

/** One final lowered occurrence membership; generated compiler carriers are intentionally absent. */
export class TemplateCompilerFamilyOccurrenceMembershipDraft {
  readonly membership: TemplateCompilerOccurrenceMembership;

  constructor(
    readonly disposition: TemplateCompilerFamilyReachDisposition,
    readonly context: TemplateCompilerSiteCursorContextReference,
    readonly arrivalPosture: TemplateCompilerOccurrenceMembershipArrivalPosture,
    readonly semanticOwner: TemplateCompilerFamilyOccurrenceSemanticOwner,
  ) {
    this.membership = new TemplateCompilerOccurrenceMembership(disposition.site);
    if (
      disposition.loweringContext !== context
      || disposition.arrivalPosture !== arrivalPosture
      || disposition.semanticOwner !== semanticOwner
    ) {
      throw new Error('Family occurrence membership lost lowering context or arrival authority.');
    }
  }

  get stableSlotKey(): string {
    return this.membership.stableSlotKey;
  }

  get occurrence(): TemplateCompilerElementOccurrence | TemplateCompilerTextOccurrence {
    return this.membership.occurrence;
  }

  get authoredNode(): HtmlElement | HtmlText | null {
    return this.membership.authoredNode;
  }

  get sourcePosture(): TemplateCompilerOccurrenceSourcePosture {
    return this.membership.sourcePosture;
  }
}

export const enum TemplateCompilerFamilyTemplateControllerRowSourceKind {
  SourceReplacement = 'source-replacement',
  GeneratedContextBoundary = 'generated-context-boundary',
}

/** Product-free HTC row slot; instruction and placement objects remain future allocation products. */
export class TemplateCompilerFamilyTemplateControllerTransitionRowDraft {
  readonly rowKind = TemplateCompilerFamilyTargetRowDraftKind.TemplateControllerTransition;
  readonly targetKind = TemplateRenderTargetKind.RenderLocation;
  readonly projectedTargetCount = 1 as const;
  readonly stableSlotKey: string;
  readonly sourceKind: TemplateCompilerFamilyTemplateControllerRowSourceKind;
  readonly occurrence: TemplateCompilerElementOccurrence | null;
  readonly authoredNode: HtmlElement | null;
  readonly sourceEventOrdinal: number;

  constructor(
    readonly edge: TemplateCompilerTemplateControllerTransitionEdgeReceipt,
    readonly ordinal: number,
    readonly projectedTargetOrdinal: number,
  ) {
    const event = edge.preparation.request.reachedElement.elementEvent;
    this.stableSlotKey = `element:${event.element.occurrenceKey}:template-controller:${edge.ordinal}`;
    this.sourceKind = edge.ordinal === 0
      ? TemplateCompilerFamilyTemplateControllerRowSourceKind.SourceReplacement
      : TemplateCompilerFamilyTemplateControllerRowSourceKind.GeneratedContextBoundary;
    this.occurrence = edge.ordinal === 0 ? event.element : null;
    this.authoredNode = edge.ordinal === 0 ? event.authoredElement : null;
    this.sourceEventOrdinal = event.ordinal;
    if (
      !edge.isModuleConstructed()
      || !Number.isSafeInteger(ordinal)
      || ordinal < 0
      || projectedTargetOrdinal !== ordinal
      || (edge.ordinal === 0) !== (
        edge.placementKind === TemplateCompilerTargetRowPlacementKind.TemplateControllerSourceReplacement
      )
      || (edge.ordinal > 0) !== (
        edge.placementKind === TemplateCompilerTargetRowPlacementKind.TemplateControllerGeneratedAppend
      )
    ) {
      throw new Error('Family TC row draft lost edge, row order, or placement semantics.');
    }
  }

  get placementKind(): TemplateCompilerTargetRowPlacementKind {
    return this.edge.placementKind;
  }

  get draft() {
    return this.edge.draft;
  }

  get rowContext(): TemplateCompilerSiteCursorContextReference {
    return this.edge.rowContext;
  }

  get childContext(): TemplateCompilerSiteCursorContextReference {
    return this.edge.childContext;
  }
}

export type TemplateCompilerFamilyTargetRowDraft =
  | TemplateCompilerOccurrenceTargetRowDraft
  | TemplateCompilerFamilyTemplateControllerTransitionRowDraft;

/** Exact compiler-carrier membership for the root context only. */
export class TemplateCompilerFamilyRootMembershipDraft {
  readonly stableSlotKey: string;
  readonly authoredNode: HtmlElement | null;

  constructor(readonly receipt: TemplateCompilerContextFamilyCompletionReceipt) {
    const transcript = receipt.traversal.audit.transcript;
    const carrier = receipt.endpoint.lane.compilerCarrier;
    this.stableSlotKey = `root:${carrier.occurrenceKey}:membership`;
    const origin = transcript.binding.forest.exactAuthoredNodeOrigin(carrier);
    this.authoredNode = origin == null
      ? null
      : transcript.binding.index.elementForProduct(origin.authored.productHandle);
    if (origin != null && this.authoredNode == null) {
      throw new Error('Family root membership lost its exact authored carrier lineage.');
    }
  }

  get compilerCarrier() {
    return this.receipt.endpoint.lane.compilerCarrier;
  }

  get compilerContent() {
    return this.receipt.endpoint.lane.compilerContent;
  }
}

export const enum TemplateCompilerFamilyContextSourceAvailabilityKind {
  SourceBearing = 'source-bearing',
  GeneratedOnly = 'generated-only',
}

/** Bind-time source availability, or an explicit generated-only intermediate TC context. */
export class TemplateCompilerFamilyContextSourceAvailability {
  readonly #authority: object;
  readonly availabilityKind: TemplateCompilerFamilyContextSourceAvailabilityKind;
  readonly sourceArrivalPosture: TemplateCompilerOccurrenceMembershipArrivalPosture | null;

  constructor(
    authority: object,
    readonly traversal: TemplateCompilerCompletedContextTraversal,
  ) {
    const context = traversal.context;
    const terminalTemplateController = traversal.templateControllerOwner?.event.realization.terminalLeaf === context;
    this.sourceArrivalPosture = context.contextKind === TemplateCompilerSiteCursorContextKind.Root
      ? TemplateCompilerOccurrenceMembershipArrivalPosture.Initial
      : context.contextKind === TemplateCompilerSiteCursorContextKind.Projection
        ? TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer
        : !terminalTemplateController
          ? null
          : traversal.templateControllerOwner?.edge.preparation.host.templateContent == null
            ? TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer
            : TemplateCompilerOccurrenceMembershipArrivalPosture.AdoptedInput;
    this.availabilityKind = this.sourceArrivalPosture == null
      ? TemplateCompilerFamilyContextSourceAvailabilityKind.GeneratedOnly
      : TemplateCompilerFamilyContextSourceAvailabilityKind.SourceBearing;
    if (
      authority !== familyRowAssemblyAuthority
      || (context.contextKind === TemplateCompilerSiteCursorContextKind.Root)
        !== (traversal.projectionOwner == null && traversal.templateControllerOwner == null)
      || (context.contextKind === TemplateCompilerSiteCursorContextKind.Projection)
        !== (traversal.projectionOwner != null)
      || (context.contextKind === TemplateCompilerSiteCursorContextKind.TemplateController)
        !== (traversal.templateControllerOwner != null)
      || (context.contextKind === TemplateCompilerSiteCursorContextKind.TemplateController
        && terminalTemplateController !== (
          this.availabilityKind === TemplateCompilerFamilyContextSourceAvailabilityKind.SourceBearing
        ))
    ) {
      throw new Error(`Family context '${context.localKey}' lost source-availability ownership.`);
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === familyRowAssemblyAuthority;
  }

  get isSourceBearing(): boolean {
    return this.availabilityKind === TemplateCompilerFamilyContextSourceAvailabilityKind.SourceBearing;
  }
}

/** One context-local non-allocated row and membership characterization. */
export class TemplateCompilerFamilyContextRowAssembly {
  readonly context: TemplateCompilerSiteCursorContextReference;

  constructor(
    readonly traversal: TemplateCompilerCompletedContextTraversal,
    readonly parent: TemplateCompilerSiteCursorContextReference | null,
    readonly sourceAvailability: TemplateCompilerFamilyContextSourceAvailability,
    readonly reachedDispositions: readonly TemplateCompilerFamilyReachDisposition[],
    readonly loweredDispositions: readonly TemplateCompilerFamilyReachDisposition[],
    readonly memberships: readonly TemplateCompilerFamilyOccurrenceMembershipDraft[],
    readonly rows: readonly TemplateCompilerFamilyTargetRowDraft[],
    readonly ordinaryRows: readonly TemplateCompilerOccurrenceTargetRowDraft[],
    readonly templateControllerRows: readonly TemplateCompilerFamilyTemplateControllerTransitionRowDraft[],
    readonly staticSites: readonly TemplateCompilerOccurrenceStaticSite[],
    readonly textExpansions: readonly TemplateCompilerTextExpansionDraft[],
    readonly attributeDispositions: readonly TemplateCompilerOccurrenceAttributeDispositionDraft[],
  ) {
    this.context = traversal.context;
    const rowSet = new Set(rows);
    const ordinaryRowSet = new Set<TemplateCompilerFamilyTargetRowDraft>(ordinaryRows);
    const templateControllerRowSet = new Set<TemplateCompilerFamilyTargetRowDraft>(templateControllerRows);
    if (
      parent !== this.context.parent
      || !sourceAvailability.isModuleConstructed()
      || sourceAvailability.traversal !== traversal
      || reachedDispositions.some((disposition) => disposition.reachedContext !== this.context)
      || loweredDispositions.some((disposition) => disposition.loweringContext !== this.context)
      || memberships.length !== loweredDispositions.length
      || memberships.some((membership, ordinal) => membership.disposition !== loweredDispositions[ordinal])
      || new Set(memberships.map((membership) => membership.stableSlotKey)).size !== memberships.length
      || rows.some((row, ordinal) => row.ordinal !== ordinal || row.projectedTargetOrdinal !== ordinal)
      || rowSet.size !== rows.length
      || new Set(rows.map((row) => row.stableSlotKey)).size !== rows.length
      || rows.length !== ordinaryRows.length + templateControllerRows.length
      || ordinaryRowSet.size !== ordinaryRows.length
      || templateControllerRowSet.size !== templateControllerRows.length
      || ordinaryRows.some((row) => !rowSet.has(row) || templateControllerRowSet.has(row))
      || templateControllerRows.some((row) => !rowSet.has(row) || ordinaryRowSet.has(row))
      || new Set(staticSites).size !== staticSites.length
      || new Set(textExpansions).size !== textExpansions.length
      || new Set(attributeDispositions.map((disposition) => disposition.stableSlotKey)).size
        !== attributeDispositions.length
      || (traversal.context.contextKind === TemplateCompilerSiteCursorContextKind.Projection)
        !== (traversal.projectionOwner != null)
      || (traversal.context.contextKind === TemplateCompilerSiteCursorContextKind.TemplateController)
        !== (traversal.templateControllerOwner != null)
    ) {
      throw new Error('Family context row assembly lost local order, membership, or generated-context ownership.');
    }
  }
}

/** Complete context-family characterization before any instruction/context/structural allocation. */
export class TemplateCompilerContextFamilyRowAssembly {
  readonly #authority: object;
  readonly contextByReference: ReadonlyMap<
    TemplateCompilerSiteCursorContextReference,
    TemplateCompilerFamilyContextRowAssembly
  >;

  constructor(
    authority: object,
    readonly receipt: TemplateCompilerContextFamilyCompletionReceipt,
    readonly rootMembership: TemplateCompilerFamilyRootMembershipDraft,
    readonly contexts: readonly TemplateCompilerFamilyContextRowAssembly[],
    readonly reachDispositions: readonly TemplateCompilerFamilyReachDisposition[],
  ) {
    this.contextByReference = new Map(contexts.map((context) => [context.context, context] as const));
    const occurrences = reachDispositions.map((disposition) =>
      disposition.site.siteKind === 'element' ? disposition.site.event.element : disposition.site.event.text
    );
    if (
      authority !== familyRowAssemblyAuthority
      || rootMembership.receipt !== receipt
      || contexts.length !== receipt.traversal.contexts.length
      || contexts.some((context, ordinal) => context.traversal !== receipt.traversal.contexts[ordinal])
      || this.contextByReference.size !== contexts.length
      || reachDispositions.length !== receipt.traversal.contexts.reduce(
        (count, context) => count + context.reachedSites.length,
        0,
      )
      || new Set(occurrences).size !== occurrences.length
      || reachDispositions.some((disposition) => !this.contextByReference.has(disposition.loweringContext))
    ) {
      throw new Error('Context-family row assembly lost receipt, context, reach, or occurrence coverage.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === familyRowAssemblyAuthority;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed() && this.receipt.isCurrent();
  }
}

export class TemplateCompilerContextFamilyRowAssemblyResult {
  constructor(
    readonly state: TemplateCompilerContextFamilyRowAssemblyState,
    readonly assembly: TemplateCompilerContextFamilyRowAssembly | null,
    readonly reasons: readonly TemplateCompilerContextFamilyRowAssemblyReason[],
  ) {
    if (
      (state === TemplateCompilerContextFamilyRowAssemblyState.Exact)
        !== (assembly != null && reasons.length === 0)
      || (state === TemplateCompilerContextFamilyRowAssemblyState.Pending)
        !== (assembly != null && reasons.length > 0)
      || (state === TemplateCompilerContextFamilyRowAssemblyState.Ineligible)
        !== (assembly == null && reasons.length > 0)
    ) {
      throw new Error('Context-family row assembly result lost exact, pending, or ineligible ownership.');
    }
  }
}

type LoweringCandidate =
  | { readonly candidateKind: 'site'; readonly disposition: TemplateCompilerFamilyReachDisposition }
  | { readonly candidateKind: 'template-controller'; readonly edge: TemplateCompilerTemplateControllerTransitionEdgeReceipt };

export function assembleTemplateCompilerContextFamilyRows(
  receipt: TemplateCompilerContextFamilyCompletionReceipt,
): TemplateCompilerContextFamilyRowAssemblyResult {
  if (!receipt.isModuleConstructed()) {
    return ineligible(
      'Context-family row assembly requires one module-constructed completion receipt.',
      TemplateCompilerContextFamilyRowAssemblyReasonKind.ForeignReceipt,
    );
  }
  if (!receipt.isCurrent()) {
    return new TemplateCompilerContextFamilyRowAssemblyResult(
      TemplateCompilerContextFamilyRowAssemblyState.Ineligible,
      null,
      [new TemplateCompilerContextFamilyRowAssemblyReason(
        TemplateCompilerContextFamilyRowAssemblyReasonKind.StaleReceipt,
        'Context-family completion receipt is no longer current.',
      )],
    );
  }

  const traversal = receipt.traversal;
  const contextTraversalByReference = new Map(
    traversal.contexts.map((context) => [context.context, context] as const),
  );
  const rehomingByHost = new Map(
    traversal.templateControllerLeafRehomings.map((rehoming) => [rehoming.receipt.host, rehoming] as const),
  );
  const rehomingByLeaf = new Map(
    traversal.templateControllerLeafRehomings.map((rehoming) => [rehoming.receipt.terminalLeaf, rehoming] as const),
  );
  if (
    contextTraversalByReference.size !== traversal.contexts.length
    || rehomingByHost.size !== traversal.templateControllerLeafRehomings.length
    || rehomingByLeaf.size !== traversal.templateControllerLeafRehomings.length
  ) {
    return ineligible('Context-family lowering ownership is duplicated or incoherent.');
  }

  const dispositions: TemplateCompilerFamilyReachDisposition[] = [];
  const dispositionsByReachedContext = new Map<
    TemplateCompilerSiteCursorContextReference,
    TemplateCompilerFamilyReachDisposition[]
  >();
  const dispositionsByLoweringContext = new Map<
    TemplateCompilerSiteCursorContextReference,
    TemplateCompilerFamilyReachDisposition[]
  >();
  for (const reachedContext of traversal.contexts) {
    for (const reach of reachedContext.reachedSites) {
      const directRehoming = reach.reachKind === 'element'
        ? rehomingByHost.get(reach.event.element) ?? null
        : null;
      const loweringContext = directRehoming?.receipt.terminalLeaf ?? reachedContext.context;
      const leafRehoming = directRehoming ?? rehomingByLeaf.get(loweringContext) ?? null;
      const loweringTraversal = contextTraversalByReference.get(loweringContext) ?? null;
      if (loweringTraversal == null) return ineligible('One reached site names an absent lowering context.');
      const site = reach.reachKind === 'element'
        ? new TemplateCompilerFamilyElementLoweringSite(
            reach,
            reachedContext.context,
            loweringContext,
            leafRehoming,
          )
        : new TemplateCompilerFamilyTextLoweringSite(
            reach,
            reachedContext.context,
            loweringContext,
            leafRehoming,
          );
      const semanticOwner = semanticOwnerFor(loweringTraversal, leafRehoming);
      if (semanticOwner == null) return ineligible('Generated lowering context has no exact semantic owner evidence.');
      const arrivalPosture = arrivalPostureFor(loweringTraversal, leafRehoming);
      const disposition = new TemplateCompilerFamilyReachDisposition(
        reach,
        site,
        reachedContext.context,
        loweringContext,
        leafRehoming,
        arrivalPosture,
        semanticOwner,
      );
      dispositions.push(disposition);
      appendMap(dispositionsByReachedContext, reachedContext.context, disposition);
      appendMap(dispositionsByLoweringContext, loweringContext, disposition);
    }
  }

  const transitionEdgesByRowContext = new Map<
    TemplateCompilerSiteCursorContextReference,
    TemplateCompilerTemplateControllerTransitionEdgeReceipt[]
  >();
  for (const event of traversal.templateControllerTransitions) {
    for (const edge of event.realization.edges) appendMap(transitionEdgesByRowContext, edge.rowContext, edge);
  }

  const pendingReasons: TemplateCompilerContextFamilyRowAssemblyReason[] = [];
  pendingReasons.push(new TemplateCompilerContextFamilyRowAssemblyReason(
    TemplateCompilerContextFamilyRowAssemblyReasonKind.RootCompiledTemplatePending,
    'Root context still requires its compiled-template wire reservation.',
  ));
  const contextAssemblies: TemplateCompilerFamilyContextRowAssembly[] = [];
  for (const contextTraversal of traversal.contexts) {
    const context = contextTraversal.context;
    const reachedDispositions = dispositionsByReachedContext.get(context) ?? [];
    const loweredDispositions = [...dispositionsByLoweringContext.get(context) ?? []]
      .sort((left, right) => left.reach.event.ordinal - right.reach.event.ordinal);
    const memberships = loweredDispositions.map((disposition) => new TemplateCompilerFamilyOccurrenceMembershipDraft(
      disposition,
      context,
      disposition.arrivalPosture,
      disposition.semanticOwner,
    ));
    for (const membership of memberships) {
      if (membership.sourcePosture === TemplateCompilerOccurrenceSourcePosture.Open) {
        pendingReasons.push(new TemplateCompilerContextFamilyRowAssemblyReason(
          TemplateCompilerContextFamilyRowAssemblyReasonKind.OpenSourcePosture,
          `Occurrence '${membership.occurrence.occurrenceKey}' has no closed compiler source posture.`,
        ));
      }
    }

    const candidates: LoweringCandidate[] = [
      ...loweredDispositions.map((disposition) => ({ candidateKind: 'site', disposition } as const)),
      ...(transitionEdgesByRowContext.get(context) ?? []).map((edge) => ({
        candidateKind: 'template-controller',
        edge,
      } as const)),
    ].sort((left, right) => {
      const leftOrdinal = candidateEventOrdinal(left);
      const rightOrdinal = candidateEventOrdinal(right);
      return leftOrdinal - rightOrdinal
        || Number(left.candidateKind === 'site') - Number(right.candidateKind === 'site');
    });
    const rows: TemplateCompilerFamilyTargetRowDraft[] = [];
    const ordinaryRows: TemplateCompilerOccurrenceTargetRowDraft[] = [];
    const templateControllerRows: TemplateCompilerFamilyTemplateControllerTransitionRowDraft[] = [];
    const staticSites: TemplateCompilerOccurrenceStaticSite[] = [];
    const textExpansions: TemplateCompilerTextExpansionDraft[] = [];
    for (const candidate of candidates) {
      if (candidate.candidateKind === 'template-controller') {
        const row = new TemplateCompilerFamilyTemplateControllerTransitionRowDraft(
          candidate.edge,
          rows.length,
          rows.length,
        );
        rows.push(row);
        templateControllerRows.push(row);
        continue;
      }
      const disposition = candidate.disposition;
      const before = ordinaryRows.length;
      let loweringReasons: readonly TemplateCompilerOccurrenceRowAssemblyReason[] = [];
      if (disposition.site.siteKind === 'element') {
        loweringReasons = lowerTemplateCompilerElementSite(
          disposition.site,
          ordinaryRows,
          staticSites,
          rows.length,
          new TemplateCompilerFamilyElementContinuationAuthority(
            familyRowAssemblyAuthority,
            disposition.site,
          ),
        );
      } else {
        const reason = lowerTemplateCompilerTextSite(
          disposition.site,
          ordinaryRows,
          staticSites,
          textExpansions,
          rows.length,
        );
        loweringReasons = reason == null ? [] : [reason];
      }
      if (loweringReasons.length > 0) {
        return new TemplateCompilerContextFamilyRowAssemblyResult(
          TemplateCompilerContextFamilyRowAssemblyState.Ineligible,
          null,
          loweringReasons.map((reason) => new TemplateCompilerContextFamilyRowAssemblyReason(
            TemplateCompilerContextFamilyRowAssemblyReasonKind.LoweringLawMismatch,
            reason.summary,
          )),
        );
      }
      rows.push(...ordinaryRows.slice(before));
    }

    const attributeDispositions = reachedDispositions.flatMap((disposition) => {
      const site = disposition.site;
      return site.siteKind === 'element'
        ? site.owner.contributions.map((contribution) =>
            new TemplateCompilerOccurrenceAttributeDispositionDraft(site, contribution)
          )
        : [];
    });
    contextAssemblies.push(new TemplateCompilerFamilyContextRowAssembly(
      contextTraversal,
      context.parent,
      new TemplateCompilerFamilyContextSourceAvailability(
        familyRowAssemblyAuthority,
        contextTraversal,
      ),
      reachedDispositions,
      loweredDispositions,
      memberships,
      rows,
      ordinaryRows,
      templateControllerRows,
      staticSites,
      textExpansions,
      attributeDispositions,
    ));

    if (context.contextKind !== TemplateCompilerSiteCursorContextKind.Root) {
      pendingReasons.push(new TemplateCompilerContextFamilyRowAssemblyReason(
        TemplateCompilerContextFamilyRowAssemblyReasonKind.GeneratedCompiledTemplatePending,
        `Generated context '${context.localKey}' still requires one compiled-template wire reservation.`,
      ));
    }
    for (const row of templateControllerRows) {
      pendingReasons.push(new TemplateCompilerContextFamilyRowAssemblyReason(
        TemplateCompilerContextFamilyRowAssemblyReasonKind.InstructionWirePending,
        `Template-controller draft '${row.draft.localKey}' still requires its HTC instruction wire.`,
      ));
      if (row.draft.node.productHandle == null || row.draft.attribute.productHandle == null) {
        pendingReasons.push(new TemplateCompilerContextFamilyRowAssemblyReason(
          TemplateCompilerContextFamilyRowAssemblyReasonKind.SourceWireReferencePending,
          `Template-controller draft '${row.draft.localKey}' lacks an exact authored node or attribute wire.`,
        ));
      }
    }
    for (const row of ordinaryRows) {
      if (row.hydrateElement != null) {
        pendingReasons.push(new TemplateCompilerContextFamilyRowAssemblyReason(
          TemplateCompilerContextFamilyRowAssemblyReasonKind.InstructionWirePending,
          `HydrateElement row '${row.stableSlotKey}' still requires its instruction wire.`,
        ));
        if (row.hydrateElement.instructionNode.productHandle == null) {
          pendingReasons.push(new TemplateCompilerContextFamilyRowAssemblyReason(
            TemplateCompilerContextFamilyRowAssemblyReasonKind.SourceWireReferencePending,
            `HydrateElement row '${row.stableSlotKey}' lacks an exact authored instruction-node wire.`,
          ));
        }
      }
      if (row.hydrateElement?.captures.some((capture) =>
        capture.decisionKind === TemplateCompilerCaptureSyntaxDecisionKind.EffectiveSyntaxRequired
      )) {
        pendingReasons.push(new TemplateCompilerContextFamilyRowAssemblyReason(
          TemplateCompilerContextFamilyRowAssemblyReasonKind.ForwardedBlocker,
          `HydrateElement row '${row.stableSlotKey}' still requires effective capture syntax publication.`,
        ));
      }
    }
  }

  for (const hydrateElement of traversal.hydrateElements) {
    for (const blocker of hydrateElement.forwardedBlockers) {
      if (
        blocker.blockerKind === TemplateCompilerHydrateElementBlockerKind.TargetRowPlacementPending
        || blocker.blockerKind === TemplateCompilerHydrateElementBlockerKind.TemplateControllerPlacementPending
      ) continue;
      pendingReasons.push(new TemplateCompilerContextFamilyRowAssemblyReason(
        TemplateCompilerContextFamilyRowAssemblyReasonKind.ForwardedBlocker,
        blocker.summary,
      ));
    }
    const extraction = hydrateElement.projectionExtraction;
    if (extraction != null) {
      for (const contributor of extraction.preparation.contributorReceipts) {
        if (contributor.source.origin.exactAuthoredOrigin == null) {
          pendingReasons.push(new TemplateCompilerContextFamilyRowAssemblyReason(
            TemplateCompilerContextFamilyRowAssemblyReasonKind.SourceWireReferencePending,
            `Projection contributor '${contributor.source.node.occurrenceKey}' lacks an exact authored node wire.`,
          ));
        }
        if (
          contributor.slotConsumption != null
          && contributor.slotConsumption.origin.exactAuthoredOrigin == null
        ) {
          pendingReasons.push(new TemplateCompilerContextFamilyRowAssemblyReason(
            TemplateCompilerContextFamilyRowAssemblyReasonKind.SourceWireReferencePending,
            `Projection slot '${contributor.slotConsumption.attribute.occurrenceKey}' lacks an exact authored attribute wire.`,
          ));
        }
        if (
          contributor.contributor.slotAttribute != null
          && contributor.contributor.slotAttribute.value.length > 0
          && contributor.contributor.slotNameSourceAddressHandle == null
        ) {
          pendingReasons.push(new TemplateCompilerContextFamilyRowAssemblyReason(
            TemplateCompilerContextFamilyRowAssemblyReasonKind.SourceWireReferencePending,
            `Projection slot '${contributor.contributor.slotName}' lacks an exact value-span wire.`,
          ));
        }
      }
    }
    for (const removed of hydrateElement.staging.draft?.processContent.result?.removedOccurrences ?? []) {
      if (receipt.traversal.audit.transcript.binding.forest.exactAuthoredNodeOrigin(removed) == null) {
        pendingReasons.push(new TemplateCompilerContextFamilyRowAssemblyReason(
          TemplateCompilerContextFamilyRowAssemblyReasonKind.SourceWireReferencePending,
          `processContent removal '${removed.occurrenceKey}' lacks an exact authored audit wire.`,
        ));
      }
    }
  }

  const assembly = new TemplateCompilerContextFamilyRowAssembly(
    familyRowAssemblyAuthority,
    receipt,
    new TemplateCompilerFamilyRootMembershipDraft(receipt),
    contextAssemblies,
    dispositions,
  );
  const uniquePendingReasons = [...new Map(pendingReasons.map((reason) => [
    `${reason.reasonKind}:${reason.summary}`,
    reason,
  ] as const)).values()];
  return new TemplateCompilerContextFamilyRowAssemblyResult(
    uniquePendingReasons.length === 0
      ? TemplateCompilerContextFamilyRowAssemblyState.Exact
      : TemplateCompilerContextFamilyRowAssemblyState.Pending,
    assembly,
    uniquePendingReasons,
  );
}

function semanticOwnerFor(
  loweringContext: TemplateCompilerCompletedContextTraversal,
  leafRehoming: TemplateCompilerCompletedTemplateControllerLeafRehoming | null,
): TemplateCompilerFamilyOccurrenceSemanticOwner | null {
  switch (loweringContext.context.contextKind) {
    case TemplateCompilerSiteCursorContextKind.Root:
      return loweringContext;
    case TemplateCompilerSiteCursorContextKind.Projection:
      return loweringContext.projectionOwner;
    case TemplateCompilerSiteCursorContextKind.TemplateController:
      return leafRehoming;
  }
}

function arrivalPostureFor(
  loweringContext: TemplateCompilerCompletedContextTraversal,
  leafRehoming: TemplateCompilerCompletedTemplateControllerLeafRehoming | null,
): TemplateCompilerOccurrenceMembershipArrivalPosture {
  if (loweringContext.context.contextKind === TemplateCompilerSiteCursorContextKind.Root) {
    return TemplateCompilerOccurrenceMembershipArrivalPosture.Initial;
  }
  if (
    loweringContext.context.contextKind === TemplateCompilerSiteCursorContextKind.TemplateController
    && leafRehoming?.receipt.host.templateContent != null
  ) {
    return TemplateCompilerOccurrenceMembershipArrivalPosture.AdoptedInput;
  }
  return TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer;
}

function candidateEventOrdinal(candidate: LoweringCandidate): number {
  return candidate.candidateKind === 'site'
    ? candidate.disposition.reach.event.ordinal
    : candidate.edge.preparation.request.reachedElement.elementEvent.ordinal;
}

function appendMap<TKey, TValue>(map: Map<TKey, TValue[]>, key: TKey, value: TValue): void {
  const bucket = map.get(key);
  if (bucket == null) map.set(key, [value]);
  else bucket.push(value);
}

function ineligible(
  summary: string,
  reasonKind = TemplateCompilerContextFamilyRowAssemblyReasonKind.ContextOwnershipMismatch,
): TemplateCompilerContextFamilyRowAssemblyResult {
  return new TemplateCompilerContextFamilyRowAssemblyResult(
    TemplateCompilerContextFamilyRowAssemblyState.Ineligible,
    null,
    [new TemplateCompilerContextFamilyRowAssemblyReason(
      reasonKind,
      summary,
    )],
  );
}
