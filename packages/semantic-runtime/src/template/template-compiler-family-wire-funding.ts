import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import type { TemplateCompilerExactAuthoredOrigin } from './template-compiler-authored-origin-index.js';
import { TemplateCompilerBrowserOriginRouteKind } from './template-compiler-authored-origin-index.js';
import type {
  TemplateCompilerContextFamilyRowAssembly,
} from './template-compiler-context-family-row-assembly.js';
import type { TemplateCompilerOccurrenceHydrateElementRowDraft } from './template-compiler-occurrence-row-assembly.js';
import {
  HtmlAttribute,
  type HtmlAttributeReference,
  HtmlDocument,
  type HtmlIrNode,
  type HtmlNodeReference,
} from './html-ir.js';
import type {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerNodeOccurrence,
} from './template-compiler-occurrence.js';
import { TemplateCompilerPreWalkBrowserOriginState } from './template-compiler-prewalk-remainder.js';
import type {
  TemplateCompilerProjectionContributorReceipt,
  TemplateCompilerProjectionLogicalOriginReceipt,
  TemplateCompilerProjectionSlotConsumptionReceipt,
} from './template-compiler-projection-logical-extraction.js';
import type { TemplateCompilerProcessContentResult } from './template-compiler-process-content.js';
import type { TemplateCompilerTemplateControllerTransitionEdgeReceipt } from './template-compiler-template-controller-transition.js';

const familyWireFundingAuthority = {};

export const enum TemplateCompilerFamilyWireRole {
  HydrateElementNode = 'hydrate-element-node',
  TemplateControllerNode = 'template-controller-node',
  TemplateControllerAttribute = 'template-controller-attribute',
  ProjectionContributorNode = 'projection-contributor-node',
  ProjectionSlotAttribute = 'projection-slot-attribute',
  ProcessContentRemovedChild = 'process-content-removed-child',
}

export const enum TemplateCompilerFamilyWireReferenceKind {
  Node = 'node',
  Attribute = 'attribute',
}

export const enum TemplateCompilerFamilyWireResolution {
  ExactAuthored = 'exact-authored',
  GeneratedWithOrigin = 'generated-with-origin',
  NonSingular = 'non-singular',
  BrowserAbsent = 'browser-absent',
  Open = 'open',
  InvariantMismatch = 'invariant-mismatch',
}

export const enum TemplateCompilerFamilyWireFundingState {
  Exact = 'exact',
  Pending = 'pending',
  Ineligible = 'ineligible',
}

export type TemplateCompilerFamilyWireOccurrence =
  | TemplateCompilerNodeOccurrence
  | TemplateCompilerAttributeOccurrence;

export type TemplateCompilerFamilyWireSemanticOwner =
  | TemplateCompilerOccurrenceHydrateElementRowDraft
  | TemplateCompilerTemplateControllerTransitionEdgeReceipt
  | TemplateCompilerProjectionContributorReceipt
  | TemplateCompilerProjectionSlotConsumptionReceipt
  | TemplateCompilerProcessContentResult;

export type TemplateCompilerFamilyAuthoredWireObject = HtmlIrNode | HtmlAttribute;
export type TemplateCompilerFamilyWireReference = HtmlNodeReference | HtmlAttributeReference;

/** One semantic occurrence plus its optional singular authored framework wire. */
export class TemplateCompilerFamilyWireFundingDraft {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly stableSlotKey: string,
    readonly role: TemplateCompilerFamilyWireRole,
    readonly referenceKind: TemplateCompilerFamilyWireReferenceKind,
    readonly occurrence: TemplateCompilerFamilyWireOccurrence,
    readonly semanticOwner: TemplateCompilerFamilyWireSemanticOwner,
    readonly exactOrigin: TemplateCompilerExactAuthoredOrigin | null,
    readonly authoredObject: TemplateCompilerFamilyAuthoredWireObject | null,
    readonly wireReference: TemplateCompilerFamilyWireReference | null,
    readonly valueAddressHandle: AddressHandle | null,
    readonly valueSpanRequired: boolean,
    /** Structural correspondence posture remains independent from exact source-carrier wire identity. */
    readonly browserOriginState: TemplateCompilerPreWalkBrowserOriginState,
    readonly resolution: TemplateCompilerFamilyWireResolution,
    readonly summary: string,
  ) {
    const exact = resolution === TemplateCompilerFamilyWireResolution.ExactAuthored;
    const nodeKind = referenceKind === TemplateCompilerFamilyWireReferenceKind.Node;
    if (
      authority !== familyWireFundingAuthority
      || stableSlotKey.length === 0
      || summary.length === 0
      || (occurrenceKind(occurrence) === TemplateCompilerFamilyWireReferenceKind.Node) !== nodeKind
      || (wireReference != null && isNodeReference(wireReference) !== nodeKind)
      || (authoredObject != null && isAuthoredNode(authoredObject) !== nodeKind)
      || (exact && (
        exactOrigin == null
        || authoredObject == null
        || wireReference == null
        || (valueSpanRequired && valueAddressHandle == null)
        || (
          browserOriginState !== TemplateCompilerPreWalkBrowserOriginState.Singular
          && browserOriginState !== TemplateCompilerPreWalkBrowserOriginState.CorrespondenceOpen
        )
      ))
      || (!nodeKind && !valueSpanRequired && valueAddressHandle != null)
      || (nodeKind && (valueSpanRequired || valueAddressHandle != null))
    ) {
      throw new Error(`Family wire draft '${stableSlotKey}' lost occurrence, reference, or resolution authority.`);
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === familyWireFundingAuthority;
  }

  get isWireReady(): boolean {
    return this.resolution === TemplateCompilerFamilyWireResolution.ExactAuthored;
  }
}

export class TemplateCompilerFamilyWireFundingReason {
  constructor(
    readonly draft: TemplateCompilerFamilyWireFundingDraft | null,
    readonly summary: string,
  ) {}
}

/** Complete occurrence-aware wire inventory with O(1) owner/occurrence/role lookup. */
export class TemplateCompilerFamilyWireFunding {
  readonly #authority: object;
  readonly #draftByStableSlot: ReadonlyMap<string, TemplateCompilerFamilyWireFundingDraft>;
  readonly #draftsByOwner: ReadonlyMap<
    TemplateCompilerFamilyWireSemanticOwner,
    ReadonlyMap<TemplateCompilerFamilyWireRole, readonly TemplateCompilerFamilyWireFundingDraft[]>
  >;
  readonly #draftsByOccurrence: ReadonlyMap<
    TemplateCompilerFamilyWireOccurrence,
    ReadonlyMap<TemplateCompilerFamilyWireRole, readonly TemplateCompilerFamilyWireFundingDraft[]>
  >;

  constructor(
    authority: object,
    readonly assembly: TemplateCompilerContextFamilyRowAssembly,
    readonly drafts: readonly TemplateCompilerFamilyWireFundingDraft[],
  ) {
    this.#draftByStableSlot = new Map(drafts.map((draft) => [draft.stableSlotKey, draft] as const));
    this.#draftsByOwner = indexDrafts(drafts, (draft) => draft.semanticOwner);
    this.#draftsByOccurrence = indexDrafts(drafts, (draft) => draft.occurrence);
    if (
      authority !== familyWireFundingAuthority
      || !assembly.isModuleConstructed()
      || this.#draftByStableSlot.size !== drafts.length
      || drafts.some((draft) => !draft.isModuleConstructed())
    ) {
      throw new Error('Family wire funding lost assembly, stable slots, or nominal draft coverage.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === familyWireFundingAuthority;
  }

  isCurrent(): boolean {
    return this.isModuleConstructed() && this.assembly.isCurrent();
  }

  draftForStableSlot(stableSlotKey: string): TemplateCompilerFamilyWireFundingDraft | null {
    return this.#draftByStableSlot.get(stableSlotKey) ?? null;
  }

  draftsForOwner(
    owner: TemplateCompilerFamilyWireSemanticOwner,
    role: TemplateCompilerFamilyWireRole,
  ): readonly TemplateCompilerFamilyWireFundingDraft[] {
    return this.#draftsByOwner.get(owner)?.get(role) ?? [];
  }

  draftForOwner(
    owner: TemplateCompilerFamilyWireSemanticOwner,
    role: TemplateCompilerFamilyWireRole,
  ): TemplateCompilerFamilyWireFundingDraft | null {
    const drafts = this.draftsForOwner(owner, role);
    return drafts.length === 1 ? drafts[0]! : null;
  }

  draftsForOccurrence(
    occurrence: TemplateCompilerFamilyWireOccurrence,
    role: TemplateCompilerFamilyWireRole,
  ): readonly TemplateCompilerFamilyWireFundingDraft[] {
    return this.#draftsByOccurrence.get(occurrence)?.get(role) ?? [];
  }

  draftForOccurrence(
    occurrence: TemplateCompilerFamilyWireOccurrence,
    role: TemplateCompilerFamilyWireRole,
  ): TemplateCompilerFamilyWireFundingDraft | null {
    const drafts = this.draftsForOccurrence(occurrence, role);
    return drafts.length === 1 ? drafts[0]! : null;
  }
}

export class TemplateCompilerFamilyWireFundingResult {
  constructor(
    readonly state: TemplateCompilerFamilyWireFundingState,
    readonly funding: TemplateCompilerFamilyWireFunding | null,
    readonly drafts: readonly TemplateCompilerFamilyWireFundingDraft[],
    readonly reasons: readonly TemplateCompilerFamilyWireFundingReason[],
  ) {
    if (
      (state === TemplateCompilerFamilyWireFundingState.Exact)
        !== (funding != null && reasons.length === 0 && drafts.every((draft) => draft.isWireReady))
      || (state === TemplateCompilerFamilyWireFundingState.Pending)
        !== (funding != null && reasons.length > 0
          && drafts.every((draft) => draft.resolution !== TemplateCompilerFamilyWireResolution.InvariantMismatch))
      || (state === TemplateCompilerFamilyWireFundingState.Ineligible)
        !== (funding == null && reasons.length > 0)
      || (funding != null && funding.drafts !== drafts)
    ) {
      throw new Error('Family wire funding result lost exact, pending, or ineligible ownership.');
    }
  }
}

interface AuthoredWireBasis {
  readonly nodesByProduct: ReadonlyMap<ProductHandle, HtmlIrNode>;
  readonly attributesByProduct: ReadonlyMap<ProductHandle, HtmlAttribute>;
}

interface ResolvedWire {
  readonly exactOrigin: TemplateCompilerExactAuthoredOrigin | null;
  readonly authoredObject: TemplateCompilerFamilyAuthoredWireObject | null;
  readonly wireReference: TemplateCompilerFamilyWireReference | null;
  readonly resolution: TemplateCompilerFamilyWireResolution;
  readonly summary: string;
}

/** Recover every family framework wire without allocating, publishing, or mutating semantic inputs. */
export function prepareTemplateCompilerFamilyWireFunding(
  assembly: TemplateCompilerContextFamilyRowAssembly,
): TemplateCompilerFamilyWireFundingResult {
  if (!assembly.isModuleConstructed()) {
    return unavailable('Family wire funding requires one module-constructed row assembly.');
  }
  if (!assembly.isCurrent()) {
    return unavailable('Family wire funding requires one current row assembly.');
  }
  const transcript = assembly.receipt.traversal.audit.transcript;
  const compilation = transcript.binding.compilation;
  const basis: AuthoredWireBasis = {
    nodesByProduct: new Map(compilation.html.nodes.map((node) => [node.productHandle, node] as const)),
    attributesByProduct: new Map(compilation.html.attributes.map((attribute) => [
      attribute.productHandle,
      attribute,
    ] as const)),
  };
  if (
    basis.nodesByProduct.size !== compilation.html.nodes.length
    || basis.attributesByProduct.size !== compilation.html.attributes.length
  ) {
    return unavailable('Current GraphExact authored products are not uniquely indexable.');
  }

  const drafts: TemplateCompilerFamilyWireFundingDraft[] = [];
  const appendNode = (
    stableSlotKey: string,
    role: TemplateCompilerFamilyWireRole,
    occurrence: TemplateCompilerNodeOccurrence,
    semanticOwner: TemplateCompilerFamilyWireSemanticOwner,
    expectedOrigin: TemplateCompilerProjectionLogicalOriginReceipt | null = null,
    expectedWire: HtmlNodeReference | null = null,
  ): void => {
    const resolved = resolveNode(assembly, basis, occurrence, expectedOrigin);
    const browserOriginState = expectedOrigin?.browserOriginState ?? occurrenceOriginState(assembly, occurrence);
    const stagingMismatch = resolved.resolution === TemplateCompilerFamilyWireResolution.ExactAuthored
      && expectedWire != null
      && !sameNodeReference(resolved.wireReference as HtmlNodeReference, expectedWire);
    const resolution = stagingMismatch
      ? TemplateCompilerFamilyWireResolution.InvariantMismatch
      : resolved.resolution;
    drafts.push(new TemplateCompilerFamilyWireFundingDraft(
      familyWireFundingAuthority,
      stableSlotKey,
      role,
      TemplateCompilerFamilyWireReferenceKind.Node,
      occurrence,
      semanticOwner,
      resolved.exactOrigin,
      resolved.authoredObject,
      resolved.wireReference,
      null,
      false,
      browserOriginState,
      resolution,
      stagingMismatch
        ? `Recovered node wire for '${occurrence.occurrenceKey}' diverges from retained staging in ${
            nodeReferenceMismatchFields(resolved.wireReference as HtmlNodeReference, expectedWire).join(', ')
          }.`
        : resolved.summary,
    ));
  };
  const appendAttribute = (
    stableSlotKey: string,
    role: TemplateCompilerFamilyWireRole,
    occurrence: TemplateCompilerAttributeOccurrence,
    semanticOwner: TemplateCompilerFamilyWireSemanticOwner,
    expectedOrigin: TemplateCompilerProjectionLogicalOriginReceipt | null = null,
    expectedWire: HtmlAttributeReference | null = null,
    valueSpanRequired = false,
    expectedRawValue: string | null = null,
  ): void => {
    const resolved = resolveAttribute(assembly, basis, occurrence, expectedOrigin);
    const browserOriginState = expectedOrigin?.browserOriginState ?? occurrenceOriginState(assembly, occurrence);
    const authored = resolved.authoredObject instanceof HtmlAttribute ? resolved.authoredObject : null;
    let resolution = resolved.resolution;
    let summary = resolved.summary;
    if (
      resolution === TemplateCompilerFamilyWireResolution.ExactAuthored
      && expectedWire != null
      && !sameAttributeReference(resolved.wireReference as HtmlAttributeReference, expectedWire)
    ) {
      resolution = TemplateCompilerFamilyWireResolution.InvariantMismatch;
      summary = `Recovered attribute wire for '${occurrence.occurrenceKey}' diverges from retained staging.`;
    } else if (
      resolution === TemplateCompilerFamilyWireResolution.ExactAuthored
      && expectedRawValue != null
      && authored?.rawValue !== expectedRawValue
    ) {
      resolution = TemplateCompilerFamilyWireResolution.InvariantMismatch;
      summary = `Recovered attribute scalar for '${occurrence.occurrenceKey}' diverges from projection grouping.`;
    } else if (
      resolution === TemplateCompilerFamilyWireResolution.ExactAuthored
      && valueSpanRequired
      && authored?.valueAddressHandle == null
    ) {
      resolution = TemplateCompilerFamilyWireResolution.Open;
      summary = `Nonempty attribute '${occurrence.occurrenceKey}' has no exact authored value span.`;
    }
    drafts.push(new TemplateCompilerFamilyWireFundingDraft(
      familyWireFundingAuthority,
      stableSlotKey,
      role,
      TemplateCompilerFamilyWireReferenceKind.Attribute,
      occurrence,
      semanticOwner,
      resolved.exactOrigin,
      resolved.authoredObject,
      resolved.wireReference,
      valueSpanRequired ? authored?.valueAddressHandle ?? null : null,
      valueSpanRequired,
      browserOriginState,
      resolution,
      summary,
    ));
  };

  for (const context of assembly.contexts) {
    for (const row of context.ordinaryRows) {
      const head = row.hydrateElement;
      if (head == null) continue;
      appendNode(
        `${row.stableSlotKey}:wire:hydrate-element-node`,
        TemplateCompilerFamilyWireRole.HydrateElementNode,
        row.occurrence,
        head,
        null,
        head.instructionNode,
      );
    }
    for (const row of context.templateControllerRows) {
      const edge = row.edge;
      const host = edge.preparation.host;
      const attribute = transcript.binding.forest.attributeForOccurrenceKey(edge.draft.localKey);
      appendNode(
        `${row.stableSlotKey}:wire:template-controller-node`,
        TemplateCompilerFamilyWireRole.TemplateControllerNode,
        host,
        edge,
        null,
        edge.draft.node,
      );
      if (attribute == null || !edge.preparation.request.owner.contributions.some((contribution) =>
        contribution.frame.attribute === attribute
      )) {
        return unavailable(`Template-controller draft '${edge.draft.localKey}' lost its live attribute occurrence.`);
      }
      appendAttribute(
        `${row.stableSlotKey}:wire:template-controller-attribute`,
        TemplateCompilerFamilyWireRole.TemplateControllerAttribute,
        attribute,
        edge,
        null,
        edge.draft.attribute,
      );
    }
  }

  for (const extraction of assembly.receipt.traversal.projectionExtractions) {
    for (const contributor of extraction.preparation.contributorReceipts) {
      appendNode(
        `projection:${extraction.host.occurrenceKey}:${contributor.source.node.occurrenceKey}:wire:contributor`,
        TemplateCompilerFamilyWireRole.ProjectionContributorNode,
        contributor.source.node,
        contributor,
        contributor.source.origin,
      );
      const consumption = contributor.slotConsumption;
      if (consumption == null) continue;
      appendAttribute(
        `projection:${extraction.host.occurrenceKey}:${consumption.attribute.occurrenceKey}:wire:slot`,
        TemplateCompilerFamilyWireRole.ProjectionSlotAttribute,
        consumption.attribute,
        consumption,
        consumption.origin,
        null,
        consumption.attribute.value.length > 0,
        consumption.attribute.value,
      );
    }
  }

  const seenProcessContent = new Set<TemplateCompilerProcessContentResult>();
  for (const hydrateElement of assembly.receipt.traversal.hydrateElements) {
    const result = hydrateElement.staging.draft?.processContent.result ?? null;
    if (result == null || seenProcessContent.has(result)) continue;
    seenProcessContent.add(result);
    for (const removed of result.removedOccurrences) {
      appendNode(
        `process-content:${result.plan.host.occurrenceKey}:${removed.occurrenceKey}:wire:removed-child`,
        TemplateCompilerFamilyWireRole.ProcessContentRemovedChild,
        removed,
        result,
      );
    }
  }

  const mismatch = drafts.filter((draft) =>
    draft.resolution === TemplateCompilerFamilyWireResolution.InvariantMismatch
  );
  if (mismatch.length > 0) {
    return new TemplateCompilerFamilyWireFundingResult(
      TemplateCompilerFamilyWireFundingState.Ineligible,
      null,
      drafts,
      mismatch.map((draft) => new TemplateCompilerFamilyWireFundingReason(draft, draft.summary)),
    );
  }
  const funding = new TemplateCompilerFamilyWireFunding(familyWireFundingAuthority, assembly, drafts);
  const pending = drafts.filter((draft) => !draft.isWireReady);
  return new TemplateCompilerFamilyWireFundingResult(
    pending.length === 0
      ? TemplateCompilerFamilyWireFundingState.Exact
      : TemplateCompilerFamilyWireFundingState.Pending,
    funding,
    drafts,
    pending.map((draft) => new TemplateCompilerFamilyWireFundingReason(draft, draft.summary)),
  );
}

function resolveNode(
  assembly: TemplateCompilerContextFamilyRowAssembly,
  basis: AuthoredWireBasis,
  occurrence: TemplateCompilerNodeOccurrence,
  expectedOrigin: TemplateCompilerProjectionLogicalOriginReceipt | null,
): ResolvedWire {
  const forest = assembly.receipt.traversal.audit.transcript.binding.forest;
  const exactOrigin = forest.exactAuthoredNodeOrigin(occurrence);
  const mismatch = expectedOrigin != null && (
    expectedOrigin.occurrence !== occurrence
    || !sameExactOrigin(expectedOrigin.exactAuthoredOrigin, exactOrigin)
  );
  if (mismatch) return mismatchWire('Projection node origin diverges from the current occurrence forest.');
  let posture = resolutionPosture(assembly, occurrence, expectedOrigin, exactOrigin);
  if (exactOrigin == null) return unresolvedWire(posture, occurrence.occurrenceKey);
  const originState = expectedOrigin?.browserOriginState ?? occurrenceOriginState(assembly, occurrence);
  const rawRoute = occurrence.inputReference == null
    ? null
    : assembly.receipt.traversal.audit.transcript.preWalkAuthority
      .originRouteForBrowserProduct(occurrence.inputReference.productHandle);
  const exactCarrierThroughOpenCorrespondence = occurrence.generation == null
    && originState === TemplateCompilerPreWalkBrowserOriginState.CorrespondenceOpen
    && rawRoute?.routeKind === TemplateCompilerBrowserOriginRouteKind.Singular
    && sameExactOrigin(rawRoute.exactOrigin, exactOrigin);
  if (exactCarrierThroughOpenCorrespondence) posture = TemplateCompilerFamilyWireResolution.ExactAuthored;
  if (originState !== TemplateCompilerPreWalkBrowserOriginState.Singular && !exactCarrierThroughOpenCorrespondence) {
    return mismatchWire(
      `Exact authored node origin contradicts retained '${originState}' browser-origin posture.`,
    );
  }
  const authored = basis.nodesByProduct.get(exactOrigin.authored.productHandle) ?? null;
  if (authored == null || authored instanceof HtmlDocument || !('toReference' in authored)) {
    return mismatchWire(`Exact authored node '${exactOrigin.authored.productHandle}' is absent from GraphExact HTML.`);
  }
  const reference = authored.toReference();
  if (
    reference.productHandle !== exactOrigin.authored.productHandle
    || reference.identityHandle !== exactOrigin.authored.identityHandle
    || reference.addressHandle !== exactOrigin.authored.addressHandle
    || reference.nodeKind !== occurrence.nodeKind
  ) {
    return mismatchWire('Exact authored node reference diverges from retained origin identity.');
  }
  return {
    exactOrigin,
    authoredObject: authored,
    wireReference: reference,
    resolution: posture,
    summary: occurrence.generation == null
      ? `Occurrence '${occurrence.occurrenceKey}' has one exact authored node wire.`
      : `Generated occurrence '${occurrence.occurrenceKey}' retains origin but needs generation-aware wire policy.`,
  };
}

function resolveAttribute(
  assembly: TemplateCompilerContextFamilyRowAssembly,
  basis: AuthoredWireBasis,
  occurrence: TemplateCompilerAttributeOccurrence,
  expectedOrigin: TemplateCompilerProjectionLogicalOriginReceipt | null,
): ResolvedWire {
  const forest = assembly.receipt.traversal.audit.transcript.binding.forest;
  const exactOrigin = forest.exactAuthoredAttributeOrigin(occurrence);
  const mismatch = expectedOrigin != null && (
    expectedOrigin.occurrence !== occurrence
    || !sameExactOrigin(expectedOrigin.exactAuthoredOrigin, exactOrigin)
  );
  if (mismatch) return mismatchWire('Projection attribute origin diverges from the current occurrence forest.');
  let posture = resolutionPosture(assembly, occurrence, expectedOrigin, exactOrigin);
  if (exactOrigin == null) return unresolvedWire(posture, occurrence.occurrenceKey);
  const originState = expectedOrigin?.browserOriginState ?? occurrenceOriginState(assembly, occurrence);
  const rawRoute = occurrence.inputReference == null
    ? null
    : assembly.receipt.traversal.audit.transcript.preWalkAuthority
      .originRouteForBrowserProduct(occurrence.inputReference.productHandle);
  const exactCarrierThroughOpenCorrespondence = occurrence.generation == null
    && originState === TemplateCompilerPreWalkBrowserOriginState.CorrespondenceOpen
    && rawRoute?.routeKind === TemplateCompilerBrowserOriginRouteKind.Singular
    && sameExactOrigin(rawRoute.exactOrigin, exactOrigin);
  if (exactCarrierThroughOpenCorrespondence) posture = TemplateCompilerFamilyWireResolution.ExactAuthored;
  if (originState !== TemplateCompilerPreWalkBrowserOriginState.Singular && !exactCarrierThroughOpenCorrespondence) {
    return mismatchWire(
      `Exact authored attribute origin contradicts retained '${originState}' browser-origin posture.`,
    );
  }
  const authored = basis.attributesByProduct.get(exactOrigin.authored.productHandle) ?? null;
  if (authored == null) {
    return mismatchWire(`Exact authored attribute '${exactOrigin.authored.productHandle}' is absent from GraphExact HTML.`);
  }
  const reference = authored.toReference();
  if (
    reference.productHandle !== exactOrigin.authored.productHandle
    || authored.identityHandle !== exactOrigin.authored.identityHandle
    || reference.addressHandle !== exactOrigin.authored.addressHandle
  ) {
    return mismatchWire('Exact authored attribute reference diverges from retained origin identity.');
  }
  return {
    exactOrigin,
    authoredObject: authored,
    wireReference: reference,
    resolution: posture,
    summary: occurrence.generation == null
      ? `Attribute '${occurrence.occurrenceKey}' has one exact authored wire.`
      : `Generated attribute '${occurrence.occurrenceKey}' retains origin but needs generation-aware wire policy.`,
  };
}

function resolutionPosture(
  assembly: TemplateCompilerContextFamilyRowAssembly,
  occurrence: TemplateCompilerFamilyWireOccurrence,
  expectedOrigin: TemplateCompilerProjectionLogicalOriginReceipt | null,
  exactOrigin: TemplateCompilerExactAuthoredOrigin | null,
): TemplateCompilerFamilyWireResolution {
  if (occurrence.generation != null) {
    return TemplateCompilerFamilyWireResolution.GeneratedWithOrigin;
  }
  const state = expectedOrigin?.browserOriginState ?? occurrenceOriginState(assembly, occurrence);
  switch (state) {
    case TemplateCompilerPreWalkBrowserOriginState.Singular:
      return exactOrigin == null
        ? TemplateCompilerFamilyWireResolution.InvariantMismatch
        : TemplateCompilerFamilyWireResolution.ExactAuthored;
    case TemplateCompilerPreWalkBrowserOriginState.NonSingular:
      return TemplateCompilerFamilyWireResolution.NonSingular;
    case TemplateCompilerPreWalkBrowserOriginState.Absent:
      return TemplateCompilerFamilyWireResolution.BrowserAbsent;
    case TemplateCompilerPreWalkBrowserOriginState.CorrespondenceOpen:
    case TemplateCompilerPreWalkBrowserOriginState.Unknown:
      return TemplateCompilerFamilyWireResolution.Open;
  }
}

function occurrenceOriginState(
  assembly: TemplateCompilerContextFamilyRowAssembly,
  occurrence: TemplateCompilerFamilyWireOccurrence,
): TemplateCompilerPreWalkBrowserOriginState {
  const reference = occurrence.inputReference;
  return reference == null
    ? TemplateCompilerPreWalkBrowserOriginState.Absent
    : assembly.receipt.traversal.audit.transcript.preWalkAuthority
      .originStateForBrowserProduct(reference.productHandle);
}

function unresolvedWire(
  resolution: TemplateCompilerFamilyWireResolution,
  occurrenceKey: string,
): ResolvedWire {
  return {
    exactOrigin: null,
    authoredObject: null,
    wireReference: null,
    resolution,
    summary: `Occurrence '${occurrenceKey}' has ${resolution} authored wire posture.`,
  };
}

function mismatchWire(summary: string): ResolvedWire {
  return {
    exactOrigin: null,
    authoredObject: null,
    wireReference: null,
    resolution: TemplateCompilerFamilyWireResolution.InvariantMismatch,
    summary,
  };
}

function occurrenceKind(
  occurrence: TemplateCompilerFamilyWireOccurrence,
): TemplateCompilerFamilyWireReferenceKind {
  return 'owner' in occurrence
    ? TemplateCompilerFamilyWireReferenceKind.Attribute
    : TemplateCompilerFamilyWireReferenceKind.Node;
}

function isAuthoredNode(value: TemplateCompilerFamilyAuthoredWireObject): value is HtmlIrNode {
  return !(value instanceof HtmlAttribute);
}

function isNodeReference(reference: TemplateCompilerFamilyWireReference): reference is HtmlNodeReference {
  return 'nodeKind' in reference;
}

function sameNodeReference(left: HtmlNodeReference, right: HtmlNodeReference): boolean {
  return left.nodeKind === right.nodeKind
    && left.productHandle === right.productHandle
    && left.identityHandle === right.identityHandle
    && left.addressHandle === right.addressHandle;
}

function nodeReferenceMismatchFields(left: HtmlNodeReference, right: HtmlNodeReference): readonly string[] {
  return [
    ...(left.nodeKind === right.nodeKind ? [] : ['node-kind']),
    ...(left.productHandle === right.productHandle ? [] : ['product']),
    ...(left.identityHandle === right.identityHandle ? [] : ['identity']),
    ...(left.addressHandle === right.addressHandle ? [] : ['address']),
  ];
}

function sameAttributeReference(left: HtmlAttributeReference, right: HtmlAttributeReference): boolean {
  return left.productHandle === right.productHandle
    && left.addressHandle === right.addressHandle
    && left.rawName === right.rawName;
}

function sameExactOrigin(
  left: TemplateCompilerExactAuthoredOrigin | null,
  right: TemplateCompilerExactAuthoredOrigin | null,
): boolean {
  return left == null || right == null
    ? left === right
    : left.derivationProductHandle === right.derivationProductHandle
      && left.authored.productHandle === right.authored.productHandle
      && left.authored.identityHandle === right.authored.identityHandle
      && left.authored.addressHandle === right.authored.addressHandle
      && left.browserOutput.productHandle === right.browserOutput.productHandle
      && left.browserOutput.identityHandle === right.browserOutput.identityHandle
      && left.browserOutput.addressHandle === right.browserOutput.addressHandle;
}

function indexDrafts<TKey extends object>(
  drafts: readonly TemplateCompilerFamilyWireFundingDraft[],
  keyFor: (draft: TemplateCompilerFamilyWireFundingDraft) => TKey,
): ReadonlyMap<TKey, ReadonlyMap<TemplateCompilerFamilyWireRole, readonly TemplateCompilerFamilyWireFundingDraft[]>> {
  const index = new Map<TKey, Map<TemplateCompilerFamilyWireRole, TemplateCompilerFamilyWireFundingDraft[]>>();
  for (const draft of drafts) {
    const key = keyFor(draft);
    let roles = index.get(key);
    if (roles == null) {
      roles = new Map();
      index.set(key, roles);
    }
    const bucket = roles.get(draft.role);
    if (bucket == null) roles.set(draft.role, [draft]);
    else bucket.push(draft);
  }
  return index;
}

function unavailable(summary: string): TemplateCompilerFamilyWireFundingResult {
  return new TemplateCompilerFamilyWireFundingResult(
    TemplateCompilerFamilyWireFundingState.Ineligible,
    null,
    [],
    [new TemplateCompilerFamilyWireFundingReason(null, summary)],
  );
}
