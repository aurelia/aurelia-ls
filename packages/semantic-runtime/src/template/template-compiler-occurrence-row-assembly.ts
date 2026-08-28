import type { ClaimEndpointHandle } from '../kernel/claim.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { AttributeSyntax } from './attribute-syntax.js';
import { TemplateRenderTargetKind } from './compiled-template.js';
import {
  HtmlIrNodeKind,
  HtmlAttributeReference,
  HtmlNodeReference,
  type HtmlElement,
  type HtmlText,
} from './html-ir.js';
import type { TemplateInstruction } from './instruction-ir.js';
import {
  TemplateInstructionKind,
  templateInstructionSemanticSignature,
  templateInstructionSemanticTarget,
} from './instruction-ir.js';
import {
  TemplateCompilerHydrateElementProjectionState,
  type TemplateCompilerHydrateElementEnvelopeDraft,
} from './template-compiler-hydrate-element-staging.js';
import type {
  TemplateCompilerCompletedElementSite,
  TemplateCompilerCompletedOrdinarySite,
  TemplateCompilerCompletedTextSite,
  TemplateCompilerOrdinaryRootCursorCompletionReceipt,
} from './template-compiler-root-completion.js';
import type { TemplateCompilerCapturedAttributeStaging } from './template-compiler-live-instruction-staging.js';
import {
  TemplateCompilerLiveAttributeTargetLane,
  type TemplateCompilerLiveAttributeContribution,
} from './template-compiler-live-attribute-assembly.js';
import { TemplateCompilerLiveAttributeDisposition } from './template-compiler-live-attribute-owner.js';
import type { TemplateCompilerTextInstructionHole } from './template-compiler-text-instruction-staging.js';
import type {
  TemplateCompilerElementOccurrence,
  TemplateCompilerTextOccurrence,
} from './template-compiler-occurrence.js';

const occurrenceRowAssemblyAuthority = {};

export const enum TemplateCompilerOccurrenceRowAssemblyState {
  Exact = 'exact',
  Ineligible = 'ineligible',
}

export const enum TemplateCompilerOccurrenceRowAssemblyReasonKind {
  ForeignReceipt = 'foreign-receipt',
  StaleReceipt = 'stale-receipt',
  TemplateControllerContextRequired = 'template-controller-context-required',
  ProjectionExtractionRequired = 'projection-extraction-required',
  SiteTokenMismatch = 'site-token-mismatch',
}

export class TemplateCompilerOccurrenceRowAssemblyReason {
  constructor(
    readonly reasonKind: TemplateCompilerOccurrenceRowAssemblyReasonKind,
    readonly summary: string,
  ) {}
}

export const enum TemplateCompilerOccurrenceSourcePosture {
  AuthoredExact = 'authored-exact',
  BrowserEffective = 'browser-effective',
  Generated = 'generated',
  Open = 'open',
}

export const enum TemplateCompilerOccurrencePrePlanEffectState {
  None = 'none',
  RequiresStructuralAdoption = 'requires-structural-adoption',
}

export const enum TemplateCompilerCaptureSyntaxDecisionKind {
  ReuseAuthored = 'reuse-authored',
  EffectiveSyntaxRequired = 'effective-syntax-required',
}

/** Capture syntax publication decision retained without mislabeling live DOM spelling as authored syntax. */
export class TemplateCompilerCapturedSyntaxRowDraft {
  constructor(
    readonly stableSlotKey: string,
    readonly capture: TemplateCompilerCapturedAttributeStaging,
    readonly decisionKind: TemplateCompilerCaptureSyntaxDecisionKind,
    readonly authoredSyntax: AttributeSyntax | null,
    readonly instructionAttribute: HtmlAttributeReference,
  ) {}
}

/** Deferred first row member; allocation/publication will turn this exact envelope into HydrateElement. */
export class TemplateCompilerOccurrenceHydrateElementRowDraft {
  readonly instructionKind = TemplateInstructionKind.HydrateElement;
  readonly instructionSlotKey: string;
  readonly instructionNode: HtmlNodeReference;
  readonly captures: readonly TemplateCompilerCapturedSyntaxRowDraft[];

  constructor(
    readonly site: TemplateCompilerCompletedElementSite,
    readonly envelope: TemplateCompilerHydrateElementEnvelopeDraft,
  ) {
    this.instructionSlotKey = `${site.rowSlotKey}:hydrate-element`;
    this.instructionNode = site.event.authoredElement?.toReference()
      ?? new HtmlNodeReference(HtmlIrNodeKind.Element, null, null, null);
    this.captures = envelope.captures.map((capture) => capturedSyntaxDraft(site, capture));
    if ([...envelope.bindableInstructions, ...site.owner.instructionStaging.directRowTail].some((instruction) =>
      !sameNodeReference(instruction.node, this.instructionNode)
    )) {
      throw new Error(`HydrateElement row '${this.instructionSlotKey}' mixes leaf instruction node sources.`);
    }
  }

  semanticSignature(): readonly unknown[] {
    return [
      this.instructionKind,
      this.instructionSlotKey,
      [
        this.instructionNode.nodeKind,
        this.instructionNode.productHandle,
        this.instructionNode.identityHandle,
        this.instructionNode.addressHandle,
      ],
      this.envelope.elementName,
      this.envelope.resourceLookupName,
      this.envelope.resource?.name ?? null,
      this.envelope.bindableInstructions.map(templateInstructionSemanticSignature),
      this.captures.map((capture) => [
        capture.stableSlotKey,
        capture.decisionKind,
        capture.authoredSyntax?.productHandle ?? null,
        capture.capture.syntax.runtimeRawName,
        capture.capture.syntax.rawValue,
        capture.capture.syntax.target,
        capture.capture.syntax.command,
      ]),
      this.envelope.processContent.state,
      this.envelope.processContent.metadata?.name ?? null,
      this.envelope.projection.state,
      [
        this.envelope.containerless.effective,
        this.envelope.containerless.fromDefinition,
        this.envelope.containerless.fromUsage,
      ],
    ];
  }
}

export type TemplateCompilerOccurrenceRowHead = TemplateCompilerOccurrenceHydrateElementRowDraft | null;

export const enum TemplateCompilerTextExpansionOutputKind {
  Static = 'static',
  Hole = 'hole',
}

export class TemplateCompilerTextStaticOutputDraft {
  readonly outputKind = TemplateCompilerTextExpansionOutputKind.Static;

  constructor(
    readonly stableSlotKey: string,
    readonly outputOrdinal: number,
    readonly partIndex: number,
    readonly text: string,
  ) {}
}

export class TemplateCompilerTextHoleOutputDraft {
  readonly outputKind = TemplateCompilerTextExpansionOutputKind.Hole;

  constructor(
    readonly stableSlotKey: string,
    readonly outputOrdinal: number,
    readonly holeIndex: number,
    readonly hole: TemplateCompilerTextInstructionHole,
  ) {}
}

export type TemplateCompilerTextExpansionOutputDraft =
  | TemplateCompilerTextStaticOutputDraft
  | TemplateCompilerTextHoleOutputDraft;

/** Exact 1→N text output band retained for later structural execution. */
export class TemplateCompilerTextExpansionDraft {
  constructor(
    readonly stableSlotKey: string,
    readonly site: TemplateCompilerCompletedTextSite,
    readonly outputs: readonly TemplateCompilerTextExpansionOutputDraft[],
  ) {
    if (
      outputs.length === 0
      || outputs.some((output, ordinal) => output.outputOrdinal !== ordinal)
      || outputs.filter((output) => output.outputKind === TemplateCompilerTextExpansionOutputKind.Hole).length
        !== site.holeSlotKeys.length
    ) {
      throw new Error(`Text expansion '${stableSlotKey}' lost output-band order or hole coverage.`);
    }
  }
}

/** One occurrence-primary ordinary-root row; ordinal orders rows but never participates in identity. */
export class TemplateCompilerOccurrenceTargetRowDraft {
  readonly projectedTargetCount = 1 as const;

  constructor(
    readonly stableSlotKey: string,
    readonly ordinal: number,
    readonly projectedTargetOrdinal: number,
    readonly targetKind: TemplateRenderTargetKind,
    readonly occurrence: TemplateCompilerElementOccurrence | TemplateCompilerTextOccurrence,
    readonly authoredNode: HtmlElement | HtmlText | null,
    readonly sourcePosture: TemplateCompilerOccurrenceSourcePosture,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly site: TemplateCompilerCompletedOrdinarySite,
    readonly hydrateElement: TemplateCompilerOccurrenceRowHead,
    readonly textOutput: TemplateCompilerTextHoleOutputDraft | null,
    readonly instructions: readonly TemplateInstruction[],
  ) {}

  get instructionKinds(): readonly TemplateInstructionKind[] {
    return [
      ...(this.hydrateElement == null ? [] : [TemplateInstructionKind.HydrateElement]),
      ...this.instructions.map((instruction) => instruction.instructionKind),
    ];
  }

  get instructionSemanticSignatures(): readonly (readonly unknown[])[] {
    return [
      ...(this.hydrateElement == null ? [] : [this.hydrateElement.semanticSignature()]),
      ...this.instructions.map(templateInstructionSemanticSignature),
    ];
  }

  get instructionTargets(): readonly (string | null)[] {
    return [
      ...(this.hydrateElement == null ? [] : [this.hydrateElement.envelope.elementName]),
      ...this.instructions.map(templateInstructionSemanticTarget),
    ];
  }
}

/** Reached ordinary site that contributes final static structure but no target row. */
export class TemplateCompilerOccurrenceStaticSite {
  constructor(
    readonly site: TemplateCompilerCompletedOrdinarySite,
    readonly sourcePosture: TemplateCompilerOccurrenceSourcePosture,
  ) {}
}

/** Exact root carrier/content membership retained independently from authored target rows. */
export class TemplateCompilerOccurrenceRootMembership {
  readonly stableSlotKey: string;
  readonly authoredNode: HtmlElement | null;

  constructor(readonly receipt: TemplateCompilerOrdinaryRootCursorCompletionReceipt) {
    this.stableSlotKey = `root:${receipt.endpoint.lane.compilerCarrier.occurrenceKey}:membership`;
    const origin = receipt.transcript.binding.forest.exactAuthoredNodeOrigin(
      receipt.endpoint.lane.compilerCarrier,
    );
    this.authoredNode = origin == null
      ? null
      : receipt.transcript.binding.index.elementForProduct(origin.authored.productHandle);
    if (origin != null && this.authoredNode == null) {
      throw new Error('Occurrence root membership lost its exact authored element lineage.');
    }
  }

  get compilerCarrier() {
    return this.receipt.endpoint.lane.compilerCarrier;
  }

  get compilerContent() {
    return this.receipt.endpoint.lane.compilerContent;
  }
}

/** Ordered compiler-reachable element/text membership, primary by occurrence and optional by authored lineage. */
export class TemplateCompilerOccurrenceMembership {
  readonly stableSlotKey: string;
  readonly sourcePosture: TemplateCompilerOccurrenceSourcePosture;

  constructor(readonly site: TemplateCompilerCompletedOrdinarySite) {
    this.stableSlotKey = site.siteKind === 'element'
      ? `element:${site.event.element.occurrenceKey}:membership`
      : `text:${site.event.text.occurrenceKey}:membership`;
    this.sourcePosture = site.siteKind === 'element'
      ? sourcePostureForElement(site)
      : sourcePostureForText(site);
  }

  get occurrence(): TemplateCompilerElementOccurrence | TemplateCompilerTextOccurrence {
    return this.site.siteKind === 'element' ? this.site.event.element : this.site.event.text;
  }

  get authoredNode(): HtmlElement | HtmlText | null {
    return this.site.siteKind === 'element' ? this.site.event.authoredElement : this.site.event.authoredText;
  }
}

/** One exact final JIT disposition for a reached browser-effective attribute. */
export class TemplateCompilerOccurrenceAttributeDispositionDraft {
  readonly stableSlotKey: string;
  readonly causeHandles: readonly ClaimEndpointHandle[];
  readonly qualifiedName: string;
  readonly finalValue: string;
  readonly finalOwnerStateKey: string;

  constructor(
    readonly site: TemplateCompilerCompletedElementSite,
    readonly contribution: TemplateCompilerLiveAttributeContribution,
  ) {
    const attribute = contribution.frame.attribute;
    const hydrateAttribute = contribution.targetLane === TemplateCompilerLiveAttributeTargetLane.CustomAttribute
      ? site.owner.instructionStaging.hydrateAttributes.find((instruction) =>
          instruction.attribute.productHandle
            === (contribution.frame.source.authoredAttribute?.productHandle ?? null)
          && instruction.attribute.rawName === contribution.frame.scalar.qualifiedName
        ) ?? null
      : null;
    this.stableSlotKey = `attribute:${attribute.occurrenceKey}:disposition`;
    this.qualifiedName = contribution.frame.scalar.qualifiedName;
    this.finalValue = attribute.value;
    this.finalOwnerStateKey = site.owner.finalOwnerView.attributeStateKey;
    this.causeHandles = [...new Set<ClaimEndpointHandle>([
      ...(attribute.inputReference == null ? [] : [attribute.inputReference.productHandle]),
      ...(hydrateAttribute == null ? [] : [hydrateAttribute.productHandle]),
      ...contribution.instructions.map((instruction) => instruction.productHandle),
    ])];
    if (
      !site.owner.contributions.includes(contribution)
      || contribution.frame.attribute.owner !== site.event.element
      || contribution.frame.liveSite.attribute !== contribution.frame.attribute
      || contribution.frame.liveSite.disposition !== contribution.disposition
      || contribution.disposition === TemplateCompilerLiveAttributeDisposition.Open
      || site.owner.finalOwnerView.hasAttribute(this.qualifiedName)
        !== (contribution.disposition === TemplateCompilerLiveAttributeDisposition.Retained)
      || (contribution.disposition === TemplateCompilerLiveAttributeDisposition.Retained
        && site.owner.finalOwnerView.getAttribute(this.qualifiedName) !== this.finalValue)
      || (contribution.targetLane === TemplateCompilerLiveAttributeTargetLane.CustomAttribute
        && hydrateAttribute == null)
      || this.causeHandles.length === 0
    ) {
      throw new Error(`Attribute disposition '${this.stableSlotKey}' lost owner, outcome, or cause authority.`);
    }
  }

  get attribute() {
    return this.contribution.frame.attribute;
  }

  get disposition(): TemplateCompilerLiveAttributeDisposition {
    return this.contribution.disposition;
  }

  get originalForestOrdinal(): number {
    return this.contribution.frame.liveSite.originalForestOrdinal;
  }

  get simulatedLiveOrdinal(): number {
    return this.contribution.frame.liveSite.simulatedLiveOrdinal;
  }
}

/** Product-free occurrence row input for the later shared target-plan/structural join. */
export class TemplateCompilerOccurrenceRowAssembly {
  readonly #authority: object;
  readonly prePlanEffectState: TemplateCompilerOccurrencePrePlanEffectState;
  readonly captureSyntaxDecisionKinds: readonly TemplateCompilerCaptureSyntaxDecisionKind[];

  constructor(
    authority: object,
    readonly receipt: TemplateCompilerOrdinaryRootCursorCompletionReceipt,
    readonly rootMembership: TemplateCompilerOccurrenceRootMembership,
    readonly occurrenceMemberships: readonly TemplateCompilerOccurrenceMembership[],
    readonly attributeDispositions: readonly TemplateCompilerOccurrenceAttributeDispositionDraft[],
    readonly rows: readonly TemplateCompilerOccurrenceTargetRowDraft[],
    readonly staticSites: readonly TemplateCompilerOccurrenceStaticSite[],
    readonly textExpansions: readonly TemplateCompilerTextExpansionDraft[],
  ) {
    const rowSites = new Set(rows.map((row) => row.site));
    const staticSiteSet = new Set(staticSites.map((site) => site.site));
    const rootAuthoredProduct = receipt.transcript.binding.forest
      .exactAuthoredNodeOrigin(rootMembership.compilerCarrier)?.authored.productHandle ?? null;
    const expectedContributions = receipt.elementSites.flatMap((site) => site.owner.contributions);
    this.prePlanEffectState = receipt.endpoint.siteOperations.length === 0
      ? TemplateCompilerOccurrencePrePlanEffectState.None
      : TemplateCompilerOccurrencePrePlanEffectState.RequiresStructuralAdoption;
    this.captureSyntaxDecisionKinds = rows.flatMap((row) =>
      row.hydrateElement?.captures.map((capture) => capture.decisionKind) ?? []
    );
    if (
      authority !== occurrenceRowAssemblyAuthority
      || rootMembership.receipt !== receipt
      || rootMembership.compilerCarrier !== receipt.endpoint.lane.compilerCarrier
      || rootMembership.compilerContent !== receipt.endpoint.lane.compilerContent
      || (rootMembership.authoredNode?.productHandle ?? null) !== rootAuthoredProduct
      || occurrenceMemberships.length !== receipt.orderedSites.length
      || occurrenceMemberships.some((membership, index) => membership.site !== receipt.orderedSites[index])
      || new Set(occurrenceMemberships.map((membership) => membership.stableSlotKey)).size
        !== occurrenceMemberships.length
      || attributeDispositions.length !== expectedContributions.length
      || attributeDispositions.some((disposition, index) =>
        disposition.contribution !== expectedContributions[index]
      )
      || new Set(attributeDispositions.map((disposition) => disposition.stableSlotKey)).size
        !== attributeDispositions.length
      || rows.some((row, ordinal) =>
        row.ordinal !== ordinal
        || row.projectedTargetOrdinal !== ordinal
        || row.stableSlotKey.length === 0
        || row.instructionKinds.length === 0
      )
      || new Set(rows.map((row) => row.stableSlotKey)).size !== rows.length
      || staticSites.some((site) => rowSites.has(site.site))
      || new Set([...rowSites, ...staticSiteSet]).size !== receipt.orderedSites.length
      || receipt.orderedSites.some((site) => !rowSites.has(site) && !staticSiteSet.has(site))
      || textExpansions.some((expansion) =>
        !rowSites.has(expansion.site)
        || expansion.outputs.some((output) =>
          output.outputKind === TemplateCompilerTextExpansionOutputKind.Hole
          && !rows.some((row) => row.textOutput === output)
        )
      )
    ) {
      throw new Error('Occurrence row assembly lost stable slots, order, or completed-site coverage.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === occurrenceRowAssemblyAuthority;
  }
}

function capturedSyntaxDraft(
  site: TemplateCompilerCompletedElementSite,
  capture: TemplateCompilerCapturedAttributeStaging,
): TemplateCompilerCapturedSyntaxRowDraft {
  const authored = capture.contribution.frame.source.authoredPrecedent?.syntax ?? null;
  const instructionAttribute = capture.contribution.frame.source.authoredAttribute?.toReference()
    ?? new HtmlAttributeReference(null, null, capture.contribution.frame.scalar.qualifiedName);
  const reusable = authored != null
    && capture.contribution.frame.source.hasExactAuthoredScalar
    && authoredSyntaxMatchesLive(authored, capture)
    && sameAttributeReference(authored.attribute, instructionAttribute);
  return new TemplateCompilerCapturedSyntaxRowDraft(
    `${site.rowSlotKey}:capture:${capture.contribution.frame.attribute.occurrenceKey}:syntax`,
    capture,
    reusable
      ? TemplateCompilerCaptureSyntaxDecisionKind.ReuseAuthored
      : TemplateCompilerCaptureSyntaxDecisionKind.EffectiveSyntaxRequired,
    reusable ? authored : null,
    instructionAttribute,
  );
}

function authoredSyntaxMatchesLive(
  authored: AttributeSyntax,
  capture: TemplateCompilerCapturedAttributeStaging,
): boolean {
  const live = capture.syntax;
  const parse = live.parse.parse;
  const authoredAttribute = capture.contribution.frame.source.authoredAttribute;
  return authoredAttribute != null
    && authored.attribute.productHandle === authoredAttribute.productHandle
    && authored.syntaxKind === live.syntaxKind
    && authored.rawName === live.rawName
    && authored.runtimeRawName === live.runtimeRawName
    && authored.nameSourceAddressHandle === authoredAttribute.nameAddressHandle
    && authored.rawValue === live.rawValue
    && authored.target === live.target
    && authored.targetSourceAddressHandle === live.targetSourceAddressHandle
    && authored.command === live.command
    && authored.commandSourceAddressHandle === live.commandSourceAddressHandle
    && sameStrings(authored.parts, live.parts)
    && samePatternParts(
      authored.patternParts,
      live.patternParts,
      parse.interpretation?.parts ?? live.parts,
    )
    && samePattern(authored.pattern, parse.pattern)
    && authored.compiledPatternProductHandle === (parse.interpretation?.compiledPatternProductHandle ?? null)
    && authored.sourceAddressHandle === live.sourceAddressHandle;
}

function samePattern(
  left: AttributeSyntax['pattern'],
  right: AttributeSyntax['pattern'],
): boolean {
  return left === right || (
    left != null
    && right != null
    && left.pattern === right.pattern
    && left.symbols === right.symbols
    && left.addressHandle === right.addressHandle
    && left.provenanceHandle === right.provenanceHandle
  );
}

function sameNodeReference(left: HtmlNodeReference, right: HtmlNodeReference): boolean {
  return left.nodeKind === right.nodeKind
    && left.productHandle === right.productHandle
    && left.identityHandle === right.identityHandle
    && left.addressHandle === right.addressHandle;
}

function sameAttributeReference(left: HtmlAttributeReference, right: HtmlAttributeReference): boolean {
  return left.productHandle === right.productHandle
    && left.addressHandle === right.addressHandle
    && left.rawName === right.rawName;
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function samePatternParts(
  left: AttributeSyntax['patternParts'],
  right: TemplateCompilerCapturedAttributeStaging['syntax']['patternParts'],
  liveParts: readonly string[],
): boolean {
  return left.length === right.length && left.every((part, index) => {
    const candidate = right[index];
    return candidate?.partIndex === part.partIndex
      && candidate.sourceAddressHandle === part.sourceAddressHandle
      && liveParts[part.partIndex] === part.value;
  });
}

export class TemplateCompilerOccurrenceRowAssemblyResult {
  readonly state: TemplateCompilerOccurrenceRowAssemblyState;

  constructor(
    readonly assembly: TemplateCompilerOccurrenceRowAssembly | null,
    readonly reasons: readonly TemplateCompilerOccurrenceRowAssemblyReason[],
  ) {
    this.state = assembly == null
      ? TemplateCompilerOccurrenceRowAssemblyState.Ineligible
      : TemplateCompilerOccurrenceRowAssemblyState.Exact;
    if ((assembly == null) !== (reasons.length > 0)) {
      throw new Error('Occurrence row assembly result lost exact assembly/reason ownership.');
    }
  }
}

/** Assemble ordinary rows from completion-owned tokens without rescanning events or allocating durable products. */
export function assembleTemplateCompilerOrdinaryRootRows(
  receipt: TemplateCompilerOrdinaryRootCursorCompletionReceipt,
): TemplateCompilerOccurrenceRowAssemblyResult {
  if (!receipt.isModuleConstructed()) {
    return ineligible(
      TemplateCompilerOccurrenceRowAssemblyReasonKind.ForeignReceipt,
      'Occurrence row assembly requires one module-constructed ordinary-root receipt.',
    );
  }
  if (!receipt.isCurrent()) {
    return ineligible(
      TemplateCompilerOccurrenceRowAssemblyReasonKind.StaleReceipt,
      'Ordinary-root receipt is no longer current at the pre-plan endpoint.',
    );
  }

  const rows: TemplateCompilerOccurrenceTargetRowDraft[] = [];
  const staticSites: TemplateCompilerOccurrenceStaticSite[] = [];
  const textExpansions: TemplateCompilerTextExpansionDraft[] = [];
  for (const site of receipt.orderedSites) {
    if (site.siteKind === 'element') {
      const refusals = appendElementSite(site, rows, staticSites);
      if (refusals.length > 0) return new TemplateCompilerOccurrenceRowAssemblyResult(null, refusals);
    } else {
      const refusal = appendTextSite(site, rows, staticSites, textExpansions);
      if (refusal != null) return new TemplateCompilerOccurrenceRowAssemblyResult(null, [refusal]);
    }
  }
  return new TemplateCompilerOccurrenceRowAssemblyResult(
    new TemplateCompilerOccurrenceRowAssembly(
      occurrenceRowAssemblyAuthority,
      receipt,
      new TemplateCompilerOccurrenceRootMembership(receipt),
      receipt.orderedSites.map((site) => new TemplateCompilerOccurrenceMembership(site)),
      receipt.elementSites.flatMap((site) => site.owner.contributions.map((contribution) =>
        new TemplateCompilerOccurrenceAttributeDispositionDraft(site, contribution)
      )),
      rows,
      staticSites,
      textExpansions,
    ),
    [],
  );
}

function appendElementSite(
  site: TemplateCompilerCompletedElementSite,
  rows: TemplateCompilerOccurrenceTargetRowDraft[],
  staticSites: TemplateCompilerOccurrenceStaticSite[],
): readonly TemplateCompilerOccurrenceRowAssemblyReason[] {
  const envelope = site.hydrateElement.draft;
  const continuationReasons: TemplateCompilerOccurrenceRowAssemblyReason[] = [];
  if (site.owner.instructionStaging.templateControllers.length > 0) {
    continuationReasons.push(new TemplateCompilerOccurrenceRowAssemblyReason(
      TemplateCompilerOccurrenceRowAssemblyReasonKind.TemplateControllerContextRequired,
      `Element '${site.event.element.occurrenceKey}' requires template-controller context placement.`,
    ));
  }
  if (envelope?.projection.state === TemplateCompilerHydrateElementProjectionState.PendingExtraction) {
    continuationReasons.push(new TemplateCompilerOccurrenceRowAssemblyReason(
      TemplateCompilerOccurrenceRowAssemblyReasonKind.ProjectionExtractionRequired,
      `Element '${site.event.element.occurrenceKey}' requires projection extraction.`,
    ));
  }
  if (continuationReasons.length > 0) return continuationReasons;
  const hydrateElement = envelope == null
    ? null
    : new TemplateCompilerOccurrenceHydrateElementRowDraft(site, envelope);
  const instructions = site.owner.instructionStaging.directRowTail;
  const posture = sourcePostureForElement(site);
  if (hydrateElement == null && instructions.length === 0) {
    staticSites.push(new TemplateCompilerOccurrenceStaticSite(site, posture));
    return [];
  }
  const ordinal = rows.length;
  rows.push(new TemplateCompilerOccurrenceTargetRowDraft(
    site.rowSlotKey,
    ordinal,
    ordinal,
    site.containerlessPlacement != null
      ? TemplateRenderTargetKind.RenderLocation
      : TemplateRenderTargetKind.MarkerTarget,
    site.event.element,
    site.event.authoredElement,
    posture,
    envelope?.source.sourceAddressHandle
      ?? site.event.authoredElement?.sourceAddressHandle
      ?? site.event.element.inputReference?.addressHandle
      ?? null,
    site,
    hydrateElement,
    null,
    instructions,
  ));
  return [];
}

function appendTextSite(
  site: TemplateCompilerCompletedTextSite,
  rows: TemplateCompilerOccurrenceTargetRowDraft[],
  staticSites: TemplateCompilerOccurrenceStaticSite[],
  textExpansions: TemplateCompilerTextExpansionDraft[],
): TemplateCompilerOccurrenceRowAssemblyReason | null {
  const staging = site.event.instructionStaging;
  const posture = sourcePostureForText(site);
  if (staging == null) {
    if (site.holeSlotKeys.length !== 0) {
      return new TemplateCompilerOccurrenceRowAssemblyReason(
        TemplateCompilerOccurrenceRowAssemblyReasonKind.SiteTokenMismatch,
        `Static text '${site.event.text.occurrenceKey}' unexpectedly retains target-row slots.`,
      );
    }
    staticSites.push(new TemplateCompilerOccurrenceStaticSite(site, posture));
    return null;
  }
  if (staging.holes.length !== site.holeSlotKeys.length) {
    return new TemplateCompilerOccurrenceRowAssemblyReason(
      TemplateCompilerOccurrenceRowAssemblyReasonKind.SiteTokenMismatch,
      `Text '${site.event.text.occurrenceKey}' lost interpolation-hole row slots.`,
    );
  }
  const outputs: TemplateCompilerTextExpansionOutputDraft[] = [];
  const appendStatic = (partIndex: number): void => {
    const text = staging.parseResult.ast.parts[partIndex] ?? '';
    if (text.length === 0) return;
    outputs.push(new TemplateCompilerTextStaticOutputDraft(
      `text:${site.event.text.occurrenceKey}:part:${partIndex}`,
      outputs.length,
      partIndex,
      text,
    ));
  };
  appendStatic(0);
  const holeOutputs = staging.holes.map((hole, holeIndex) => {
    const output = new TemplateCompilerTextHoleOutputDraft(
      site.holeSlotKeys[holeIndex]!,
      outputs.length,
      holeIndex,
      hole,
    );
    outputs.push(output);
    appendStatic(holeIndex + 1);
    return output;
  });
  const expansion = new TemplateCompilerTextExpansionDraft(
    `text:${site.event.text.occurrenceKey}:expansion`,
    site,
    outputs,
  );
  textExpansions.push(expansion);
  for (const [holeIndex, hole] of staging.holes.entries()) {
    const ordinal = rows.length;
    rows.push(new TemplateCompilerOccurrenceTargetRowDraft(
      site.holeSlotKeys[holeIndex]!,
      ordinal,
      ordinal,
      TemplateRenderTargetKind.MarkerTarget,
      site.event.text,
      site.event.authoredText,
      posture,
      hole.source.sourceAddressHandle,
      site,
      null,
      holeOutputs[holeIndex]!,
      [hole.instruction],
    ));
  }
  return null;
}

function sourcePostureForElement(
  site: TemplateCompilerCompletedElementSite,
): TemplateCompilerOccurrenceSourcePosture {
  if (site.event.authoredElement != null) return TemplateCompilerOccurrenceSourcePosture.AuthoredExact;
  if (site.event.element.generation != null) return TemplateCompilerOccurrenceSourcePosture.Generated;
  if (site.event.element.inputReference != null) return TemplateCompilerOccurrenceSourcePosture.BrowserEffective;
  return TemplateCompilerOccurrenceSourcePosture.Open;
}

function sourcePostureForText(
  site: TemplateCompilerCompletedTextSite,
): TemplateCompilerOccurrenceSourcePosture {
  if (site.event.authoredText != null) return TemplateCompilerOccurrenceSourcePosture.AuthoredExact;
  if (site.event.text.generation != null) return TemplateCompilerOccurrenceSourcePosture.Generated;
  if (site.event.text.inputReference != null) return TemplateCompilerOccurrenceSourcePosture.BrowserEffective;
  return TemplateCompilerOccurrenceSourcePosture.Open;
}

function ineligible(
  reasonKind: TemplateCompilerOccurrenceRowAssemblyReasonKind,
  summary: string,
): TemplateCompilerOccurrenceRowAssemblyResult {
  return new TemplateCompilerOccurrenceRowAssemblyResult(
    null,
    [new TemplateCompilerOccurrenceRowAssemblyReason(reasonKind, summary)],
  );
}
