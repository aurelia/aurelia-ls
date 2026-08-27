import { createHash } from 'node:crypto';

import {
  BrowserTemplateDraftLocationKind,
  BrowserTemplateDraftNodeKind,
  type BrowserTemplateAttributeDraft,
  type BrowserTemplateDraftPathSegment,
  type BrowserTemplateDraftResult,
  type BrowserTemplateElementDraft,
  type BrowserTemplateNodeDraft,
} from './browser-template-draft.js';
import {
  BrowserTemplateCarrierKind,
  selectBrowserTemplateCompilerCarrier,
  type BrowserTemplateCarrierSelectionDraft,
} from './browser-template-selection.js';
import {
  type ParsedHtmlAttributeDraft,
  type ParsedHtmlDocumentDraft,
  type ParsedHtmlNodeDraft,
} from './html-parse-materializer.js';
import { htmlAsciiLowercase } from './html-ascii.js';
import { HtmlIrNodeKind, HtmlRecoveryKind } from './html-ir.js';
import type { TemplateRecoveryPolicy } from './parse-context.js';

export const BROWSER_TEMPLATE_CORRESPONDENCE_SCHEMA_VERSION =
  'semantic-runtime/browser-template-correspondence/v2' as const;

export type BrowserTemplateCorrespondencePathSegment = number | 'template-content';

export class AuthoredNodeDraftReference {
  constructor(
    readonly occurrenceKey: string,
    readonly path: readonly number[],
    readonly nodeKind: HtmlIrNodeKind,
    readonly start: number,
    readonly end: number,
    readonly tagName: string | null,
  ) {}
}

export class BrowserNodeOccurrenceDraftReference {
  constructor(
    readonly occurrenceKey: string,
    readonly path: readonly BrowserTemplateDraftPathSegment[],
    readonly nodeKind: BrowserTemplateDraftNodeKind,
    readonly tagName: string | null,
  ) {}
}

export class AuthoredAttributeDraftReference {
  constructor(
    readonly occurrenceKey: string,
    readonly owner: AuthoredNodeDraftReference,
    readonly ordinal: number,
    readonly start: number,
    readonly end: number,
    readonly rawName: string,
  ) {}
}

export class BrowserAttributeOccurrenceDraftReference {
  constructor(
    readonly occurrenceKey: string,
    readonly owner: BrowserNodeOccurrenceDraftReference,
    readonly ordinal: number,
    readonly name: string,
    readonly prefix: string | null,
  ) {}
}

export class AuthoredBrowserNodeDerivationDraft {
  constructor(
    readonly authored: AuthoredNodeDraftReference,
    readonly browser: BrowserNodeOccurrenceDraftReference,
    /** Exact token/range association; placement and value fidelity are deliberately separate. */
    readonly association: 'opening-token' | 'exact-range',
    readonly extent: 'identical' | 'divergent',
    readonly placement: 'retained' | 'wrapped-by-implied-node' | 'reparented',
    readonly value: 'not-applicable' | 'identical' | 'normalized',
  ) {}
}

export class AuthoredBrowserAttributeDerivationDraft {
  constructor(
    readonly authored: AuthoredAttributeDraftReference,
    readonly browser: BrowserAttributeOccurrenceDraftReference,
    readonly name: 'identical' | 'adjusted',
    readonly value: 'identical' | 'normalized',
  ) {}
}

export class BrowserImpliedNodeDerivationDraft {
  constructor(
    readonly browser: BrowserNodeOccurrenceDraftReference,
    readonly causeCandidates: readonly AuthoredNodeDraftReference[],
    readonly reason: 'implied-table-section' | 'implied-paragraph' | 'parser-unlocated',
  ) {}
}

export class BrowserReconstructionCohortDraft {
  constructor(
    readonly cohortKey: string,
    readonly authored: AuthoredNodeDraftReference,
    readonly browserOccurrences: readonly BrowserNodeOccurrenceDraftReference[],
  ) {}
}

export class BrowserMovedNodeDerivationDraft {
  constructor(
    readonly authored: AuthoredNodeDraftReference,
    readonly browser: BrowserNodeOccurrenceDraftReference,
    readonly authoredParent: AuthoredNodeDraftReference | null,
    readonly effectiveAuthoredParent: AuthoredNodeDraftReference | null,
    readonly reason: 'reparented' | 'wrapped-by-implied-node',
  ) {}
}

export class AuthoredNodeDropDerivationDraft {
  constructor(
    readonly authored: AuthoredNodeDraftReference,
    readonly reason: 'fragment-doctype',
  ) {}
}

export class AuthoredAttributeDropDerivationDraft {
  constructor(
    readonly authored: AuthoredAttributeDraftReference,
    readonly retainedPredecessor: AuthoredAttributeDraftReference | null,
    readonly reason: 'duplicate-attribute',
  ) {}
}

export class CorrespondenceUnresolvedPartitionDraft {
  constructor(
    readonly partitionKey: string,
    readonly kind:
      | 'composite-text'
      | 'partial-text'
      | 'partial-node-extent'
      | 'implied-node-cause'
      | 'unresolved-implied-origin'
      | 'normalized-node-value'
      | 'normalized-attribute-value'
      | 'profile-divergent-customizable-select'
      | 'unmatched-authored-node'
      | 'unmatched-authored-attribute'
      | 'unmatched-browser-node'
      | 'unresolved-browser-attribute',
    readonly authoredNodes: readonly AuthoredNodeDraftReference[],
    readonly browserNodes: readonly BrowserNodeOccurrenceDraftReference[],
    readonly authoredAttributes: readonly AuthoredAttributeDraftReference[],
    readonly browserAttributes: readonly BrowserAttributeOccurrenceDraftReference[],
    readonly summary: string,
  ) {}
}

export class GeneratedCompilerCarrierDraftReference {
  readonly tagName = 'template';
  readonly namespaceUri = 'http://www.w3.org/1999/xhtml';

  constructor(
    readonly occurrenceKey: string,
    readonly generationOrdinal: 0,
  ) {}
}

export class CompilerCarrierDerivationDraft {
  constructor(
    readonly derivation: '1-to-1-selected-template' | '0-to-1-synthesized-wrapper',
    readonly compilerCarrier: BrowserNodeOccurrenceDraftReference | GeneratedCompilerCarrierDraftReference,
  ) {}
}

export class FactoryDiscardDerivationDraft {
  readonly derivation = '1-to-0' as const;

  constructor(
    readonly browser: BrowserNodeOccurrenceDraftReference,
    readonly reason: 'carrier-selection-discard',
  ) {}
}

export class BrowserTemplateCorrespondenceDraft {
  readonly schemaVersion = BROWSER_TEMPLATE_CORRESPONDENCE_SCHEMA_VERSION;

  constructor(
    /** Stable prefix for authored/browser occurrence identity within one template. */
    readonly occurrenceIdentityKey: string,
    /** Exact caller-owned template identity used to derive occurrence identity. */
    readonly templateIdentity: string,
    /** Exact source epoch supplied by the current authored-source authority. */
    readonly sourceRevision: string,
    /** Currentness receipt for the exact source, parser, recovery, and planner authorities used by this run. */
    readonly correspondenceKey: string,
    readonly markupDigest: string,
    readonly nodeDerivations: readonly AuthoredBrowserNodeDerivationDraft[],
    readonly attributeDerivations: readonly AuthoredBrowserAttributeDerivationDraft[],
    readonly impliedNodes: readonly BrowserImpliedNodeDerivationDraft[],
    readonly reconstructionCohorts: readonly BrowserReconstructionCohortDraft[],
    readonly movedNodes: readonly BrowserMovedNodeDerivationDraft[],
    readonly droppedAuthoredNodes: readonly AuthoredNodeDropDerivationDraft[],
    readonly droppedAuthoredAttributes: readonly AuthoredAttributeDropDerivationDraft[],
    readonly unresolvedPartitions: readonly CorrespondenceUnresolvedPartitionDraft[],
    readonly compilerCarrier: CompilerCarrierDerivationDraft | null,
    readonly factoryDiscards: readonly FactoryDiscardDerivationDraft[],
  ) {}
}

export interface BrowserTemplateCorrespondenceRequest {
  /**
   * Caller-owned product-free template identity prevents equal markup from aliasing across resources. This is a plain
   * string intentionally: the planner may run before a TemplateSource has a kernel IdentityHandle.
   */
  readonly templateIdentity: string;
  /** Exact source epoch/revision supplied by the source authority. */
  readonly sourceRevision: string;
  readonly markup: string;
  readonly authored: ParsedHtmlDocumentDraft;
  readonly browser: BrowserTemplateDraftResult;
  /** Separate Aurelia factory authority; browser correspondence does not infer these drops. */
  readonly carrierSelection?: BrowserTemplateCarrierSelectionDraft;
}

interface AuthoredNodeEntry {
  readonly draft: ParsedHtmlNodeDraft;
  readonly ref: AuthoredNodeDraftReference;
  readonly parent: AuthoredNodeEntry | null;
  readonly attributes: readonly AuthoredAttributeEntry[];
}

interface AuthoredAttributeEntry {
  readonly draft: ParsedHtmlAttributeDraft;
  readonly ref: AuthoredAttributeDraftReference;
  readonly owner: AuthoredNodeEntry;
}

interface BrowserNodeEntry {
  readonly draft: BrowserTemplateNodeDraft;
  readonly ref: BrowserNodeOccurrenceDraftReference;
  readonly parent: BrowserNodeEntry | null;
  readonly attributes: readonly BrowserAttributeEntry[];
  readonly throughTemplateContent: boolean;
}

interface BrowserAttributeEntry {
  readonly draft: BrowserTemplateAttributeDraft;
  readonly ref: BrowserAttributeOccurrenceDraftReference;
  readonly owner: BrowserNodeEntry;
}

interface MatchedNode {
  readonly authored: AuthoredNodeEntry;
  readonly browser: BrowserNodeEntry;
  readonly association: 'opening-token' | 'exact-range';
}

/** Product-free conservative planner. It never treats a parse5 location envelope as lineage by itself. */
export function planBrowserTemplateCorrespondence(
  request: BrowserTemplateCorrespondenceRequest,
): BrowserTemplateCorrespondenceDraft {
  if (request.markup !== request.browser.markup || request.markup !== request.authored.markup) {
    throw new Error('Authored/browser correspondence requires one exact markup input for both parser drafts.');
  }
  const markupDigest = browserTemplateCorrespondenceMarkupDigest(request.markup);
  const carrierSelectionAuthority = request.carrierSelection == null
    ? 'no-carrier-selection'
    : carrierSelectionFingerprint(request.carrierSelection);
  if (request.carrierSelection != null) {
    const canonicalSelection = selectBrowserTemplateCompilerCarrier(request.browser.fragment);
    if (carrierSelectionFingerprint(canonicalSelection) !== carrierSelectionAuthority) {
      throw new Error('Browser correspondence requires the canonical compiler-carrier selection for its browser draft.');
    }
  }
  const occurrenceIdentityKey = browserTemplateCorrespondenceOccurrenceIdentityKey(request.templateIdentity);
  const correspondenceKey = correspondenceReceiptKey(
    occurrenceIdentityKey,
    request.sourceRevision,
    request.authored.recoveryPolicy,
    markupDigest,
    request.browser,
    carrierSelectionAuthority,
  );
  const authoredEntries = authoredNodeEntries(request.authored, occurrenceIdentityKey);
  const browserEntries = browserNodeEntries(request.browser.fragment.children, occurrenceIdentityKey);
  const authoredByElementStart = new Map<number, AuthoredNodeEntry[]>();
  const authoredTextLike = authoredEntries.filter((entry) => entry.draft.nodeKind !== HtmlIrNodeKind.Element);
  for (const entry of authoredEntries) {
    if (entry.draft.nodeKind === HtmlIrNodeKind.Element) {
      appendMap(authoredByElementStart, entry.draft.start, entry);
    }
  }

  const matches: MatchedNode[] = [];
  const unresolved: CorrespondenceUnresolvedPartitionDraft[] = [];
  const implied: BrowserImpliedNodeDerivationDraft[] = [];
  const matchedBrowserKeys = new Set<string>();
  const matchedAuthoredKeys = new Set<string>();

  for (const browser of browserEntries) {
    if (browser.draft.locationKind === BrowserTemplateDraftLocationKind.ParserUnlocated) {
      const derivation = impliedNode(browser, authoredEntries);
      const grounded = derivation.reason === 'implied-paragraph'
        || (derivation.reason === 'implied-table-section' && derivation.causeCandidates.length > 0);
      if (grounded) {
        implied.push(derivation);
      } else {
        unresolved.push(unresolvedNodes(
          occurrenceIdentityKey,
          'unresolved-implied-origin',
          derivation.causeCandidates,
          [browser.ref],
          derivation.reason === 'implied-table-section'
            ? 'The parser inserted a table section, but no exact authored descendant establishes its tree-builder cause.'
            : 'The parser inserted a structural node whose exact HTML-tree-builder cause is not yet modeled.',
        ));
      }
      if (derivation.reason === 'implied-paragraph') {
        unresolved.push(unresolvedNodes(
          occurrenceIdentityKey,
          'implied-node-cause',
          authoredEntries
            .filter((candidate) => htmlAsciiLowercase(candidate.draft.tagName ?? '') === 'p')
            .map((candidate) => candidate.ref),
          [browser.ref],
          'The implied paragraph is caused by a stray closing token that has no authored structural product.',
        ));
      }
      continue;
    }
    if (browser.draft.nodeKind === BrowserTemplateDraftNodeKind.Element) {
      const element = browser.draft;
      const start = element.startTagSourceLocation?.startOffset;
      const candidates = start == null ? [] : authoredByElementStart.get(start) ?? [];
      if (candidates.length === 1 && sourceElementTokenMatches(request.markup, candidates[0]!, element)) {
        matches.push({ authored: candidates[0]!, browser, association: 'opening-token' });
        matchedBrowserKeys.add(browser.ref.occurrenceKey);
        matchedAuthoredKeys.add(candidates[0]!.ref.occurrenceKey);
      } else {
        unresolved.push(unresolvedNodes(
          occurrenceIdentityKey,
          'unmatched-browser-node',
          candidates.map((candidate) => candidate.ref),
          [browser.ref],
          'Located browser element had no unique compatible authored opening token.',
        ));
      }
      continue;
    }
    const location = browser.draft.sourceLocation;
    if (location == null) {
      continue;
    }
    const exact = authoredTextLike.filter((candidate) =>
      nodeKindsCompatible(candidate.draft, browser.draft)
      && candidate.draft.start === location.startOffset
      && candidate.draft.end === location.endOffset
    );
    if (exact.length === 1) {
      matches.push({ authored: exact[0]!, browser, association: 'exact-range' });
      matchedBrowserKeys.add(browser.ref.occurrenceKey);
      matchedAuthoredKeys.add(exact[0]!.ref.occurrenceKey);
      continue;
    }
    if (browser.draft.nodeKind === BrowserTemplateDraftNodeKind.Text) {
      const intersecting = authoredEntries.filter((candidate) =>
        candidate.draft.nodeKind === HtmlIrNodeKind.Text
        && rangesIntersect(candidate.draft.start, candidate.draft.end, location.startOffset, location.endOffset)
      );
      const kind = intersecting.length > 1 ? 'composite-text' : 'partial-text';
      unresolved.push(unresolvedNodes(
        occurrenceIdentityKey,
        kind,
        intersecting.map((candidate) => candidate.ref),
        [browser.ref],
        kind === 'composite-text'
          ? 'One browser text occurrence spans several authored text carriers and intervening markup.'
          : 'Browser text retains only part of one authored text carrier.',
      ));
      for (const candidate of intersecting) matchedAuthoredKeys.add(candidate.ref.occurrenceKey);
      matchedBrowserKeys.add(browser.ref.occurrenceKey);
    } else {
      unresolved.push(unresolvedNodes(
        occurrenceIdentityKey,
        'unmatched-browser-node',
        [],
        [browser.ref],
        'Located browser node had no exact authored range.',
      ));
    }
  }

  const matchesByBrowser = new Map(matches.map((match) => [match.browser.ref.occurrenceKey, match]));
  const nodeDerivations = matches.map((match) => nodeDerivation(match, matchesByBrowser));
  for (const derivation of nodeDerivations) {
    if (derivation.extent === 'divergent') {
      unresolved.push(unresolvedNodes(
        occurrenceIdentityKey,
        'partial-node-extent',
        [derivation.authored],
        [derivation.browser],
        'The opening token is exact, but browser recovery changed the effective node extent.',
      ));
    }
    if (derivation.value === 'normalized') {
      unresolved.push(unresolvedNodes(
        occurrenceIdentityKey,
        'normalized-node-value',
        [derivation.authored],
        [derivation.browser],
        'The lexical carrier is exact, but effective text normalization has no authored subspan map.',
      ));
    }
  }
  const reconstructionCohorts = reconstructionCohortsFor(matches, occurrenceIdentityKey);
  const movedNodes = nodeDerivations
    .filter((derivation) => derivation.placement !== 'retained')
    .map((derivation) => movedNodeDerivation(derivation, matches, matchesByBrowser));

  const attributePlan = planAttributes(authoredEntries, matches, occurrenceIdentityKey, unresolved);
  const droppedAuthoredNodes: AuthoredNodeDropDerivationDraft[] = [];
  for (const authored of authoredEntries) {
    if (matchedAuthoredKeys.has(authored.ref.occurrenceKey)) continue;
    if (authored.draft.nodeKind === HtmlIrNodeKind.Doctype) {
      droppedAuthoredNodes.push(new AuthoredNodeDropDerivationDraft(authored.ref, 'fragment-doctype'));
      continue;
    }
    if (inCustomizableSelect(authored) && isPinnedLegacySelectProfile(request.browser)) {
      unresolved.push(unresolvedNodes(
        occurrenceIdentityKey,
        'profile-divergent-customizable-select',
        [authored.ref],
        [],
        'Pinned parse5 omits a node admitted by current Chromium customizable-select parsing; this is not a browser drop.',
      ));
      continue;
    }
    if (!partitionContainsAuthored(unresolved, authored.ref.occurrenceKey)) {
      unresolved.push(unresolvedNodes(
        occurrenceIdentityKey,
        'unmatched-authored-node',
        [authored.ref],
        [],
        'Authored node has no exact browser disposition.',
      ));
    }
  }
  for (const browser of browserEntries) {
    if (
      !matchedBrowserKeys.has(browser.ref.occurrenceKey)
      && !implied.some((candidate) => candidate.browser.occurrenceKey === browser.ref.occurrenceKey)
      && !partitionContainsBrowser(unresolved, browser.ref.occurrenceKey)
    ) {
      unresolved.push(unresolvedNodes(
        occurrenceIdentityKey,
        'unmatched-browser-node',
        [],
        [browser.ref],
        'Browser node has no exact authored origin.',
      ));
    }
  }

  const carrierPlan = planCarrierSelection(
    request.carrierSelection,
    occurrenceIdentityKey,
    new Map(browserEntries.map((entry) => [encodeBrowserTemplatePath(entry.draft.path), entry.ref])),
  );
  return new BrowserTemplateCorrespondenceDraft(
    occurrenceIdentityKey,
    request.templateIdentity,
    request.sourceRevision,
    correspondenceKey,
    markupDigest,
    nodeDerivations,
    attributePlan.derivations,
    implied,
    reconstructionCohorts,
    movedNodes,
    droppedAuthoredNodes,
    attributePlan.drops,
    unresolved,
    carrierPlan.carrier,
    carrierPlan.discards,
  );
}

export function encodeAuthoredTemplatePath(path: readonly number[]): string {
  return path.length === 0 ? 'root' : `root/${path.map((segment) => `i:${segment}`).join('/')}`;
}

export function encodeBrowserTemplatePath(path: readonly BrowserTemplateCorrespondencePathSegment[]): string {
  return path.length === 0
    ? 'root'
    : `root/${path.map((segment) => segment === 'template-content' ? 'template-content' : `i:${segment}`).join('/')}`;
}

export function authoredNodeOccurrenceKey(
  correspondenceKey: string,
  node: Pick<ParsedHtmlNodeDraft, 'path' | 'nodeKind' | 'start' | 'end'>,
): string {
  return `${correspondenceKey}/authored-node/${node.nodeKind}/${encodeAuthoredTemplatePath(node.path)}/${node.start}:${node.end}`;
}

export function browserNodeOccurrenceKey(
  correspondenceKey: string,
  node: Pick<BrowserTemplateNodeDraft, 'path' | 'nodeKind'>,
): string {
  return `${correspondenceKey}/browser-node/${node.nodeKind}/${encodeBrowserTemplatePath(node.path)}`;
}

/** Stable occurrence-identity authority shared by correspondence producers and exact invocation consumers. */
export function browserTemplateCorrespondenceOccurrenceIdentityKey(templateIdentity: string): string {
  return `browser-correspondence/${encodeURIComponent(templateIdentity)}`;
}

/** Exact authored/browser markup fingerprint owned by the correspondence layer. */
export function browserTemplateCorrespondenceMarkupDigest(markup: string): string {
  return createHash('sha256').update(markup).digest('hex');
}

function correspondenceReceiptKey(
  occurrenceIdentityKey: string,
  sourceRevision: string,
  authoredRecoveryPolicy: TemplateRecoveryPolicy,
  markupDigest: string,
  browser: BrowserTemplateDraftResult,
  carrierSelectionAuthority: string,
): string {
  const authority = [
    BROWSER_TEMPLATE_CORRESPONDENCE_SCHEMA_VERSION,
    browser.authority.schemaVersion,
    browser.authority.parser,
    browser.authority.parserVersion,
    browser.authority.context,
    String(browser.authority.scriptingEnabled),
    carrierSelectionAuthority,
  ].join(':');
  return `${occurrenceIdentityKey}/receipt/${encodeURIComponent(sourceRevision)}/${authoredRecoveryPolicy}/${markupDigest}/${encodeURIComponent(authority)}`;
}

function carrierSelectionFingerprint(selection: BrowserTemplateCarrierSelectionDraft): string {
  const semantics = JSON.stringify([
    selection.carrierKind,
    selection.reason,
    selection.authoredCarrier == null ? null : encodeBrowserTemplatePath(selection.authoredCarrier.path),
    encodeBrowserTemplatePath(selection.content.path),
    selection.discardedInputNodes.map((node) => encodeBrowserTemplatePath(node.path)),
  ]);
  const digest = createHash('sha256').update(semantics).digest('hex');
  return `${selection.schemaVersion}:${digest}`;
}

function authoredNodeEntries(
  document: ParsedHtmlDocumentDraft,
  correspondenceKey: string,
): readonly AuthoredNodeEntry[] {
  const result: AuthoredNodeEntry[] = [];
  const visit = (draft: ParsedHtmlNodeDraft, parent: AuthoredNodeEntry | null): void => {
    const ref = new AuthoredNodeDraftReference(
      authoredNodeOccurrenceKey(correspondenceKey, draft),
      draft.path,
      draft.nodeKind,
      draft.start,
      draft.end,
      draft.tagName,
    );
    const entry = { draft, ref, parent, attributes: [] as AuthoredAttributeEntry[] };
    entry.attributes.push(...draft.attributes.map((attribute, ordinal) => ({
      draft: attribute,
      owner: entry,
      ref: new AuthoredAttributeDraftReference(
        `${ref.occurrenceKey}/attribute/i:${ordinal}/${attribute.start}:${attribute.end}`,
        ref,
        ordinal,
        attribute.start,
        attribute.end,
        attribute.rawName,
      ),
    })));
    result.push(entry);
    for (const child of draft.children) visit(child, entry);
  };
  for (const root of document.rootNodes) visit(root, null);
  return result;
}

function browserNodeEntries(
  roots: readonly BrowserTemplateNodeDraft[],
  correspondenceKey: string,
): readonly BrowserNodeEntry[] {
  const result: BrowserNodeEntry[] = [];
  const visit = (
    draft: BrowserTemplateNodeDraft,
    parent: BrowserNodeEntry | null,
    throughTemplateContent: boolean,
  ): void => {
    const ref = new BrowserNodeOccurrenceDraftReference(
      browserNodeOccurrenceKey(correspondenceKey, draft),
      draft.path,
      draft.nodeKind,
      draft.nodeKind === BrowserTemplateDraftNodeKind.Element ? draft.tagName : null,
    );
    const entry = { draft, ref, parent, throughTemplateContent, attributes: [] as BrowserAttributeEntry[] };
    if (draft.nodeKind === BrowserTemplateDraftNodeKind.Element) {
      const element = draft;
      entry.attributes.push(...element.attributes.map((attribute, ordinal) => ({
        draft: attribute,
        owner: entry,
        ref: new BrowserAttributeOccurrenceDraftReference(
          `${ref.occurrenceKey}/attribute/i:${ordinal}`,
          ref,
          ordinal,
          attribute.name,
          attribute.prefix,
        ),
      })));
      result.push(entry);
      for (const child of element.children) visit(child, entry, false);
      for (const child of element.templateContent?.children ?? []) visit(child, entry, true);
      return;
    }
    result.push(entry);
  };
  for (const root of roots) visit(root, null, false);
  return result;
}

function sourceElementTokenMatches(
  markup: string,
  authored: AuthoredNodeEntry,
  browser: BrowserTemplateElementDraft,
): boolean {
  const names = authored.draft.tagNames;
  const location = browser.startTagSourceLocation;
  return names != null
    && location != null
    && names.openingStart >= location.startOffset
    && names.openingEnd <= location.endOffset
    && markup.slice(names.openingStart, names.openingEnd) === authored.draft.tagName;
}

function nodeKindsCompatible(authored: ParsedHtmlNodeDraft, browser: BrowserTemplateNodeDraft): boolean {
  switch (browser.nodeKind) {
    case BrowserTemplateDraftNodeKind.Text:
      return authored.nodeKind === HtmlIrNodeKind.Text;
    case BrowserTemplateDraftNodeKind.Comment:
      return authored.nodeKind === HtmlIrNodeKind.Comment;
    case BrowserTemplateDraftNodeKind.Doctype:
      return authored.nodeKind === HtmlIrNodeKind.Doctype;
    case BrowserTemplateDraftNodeKind.Element:
      return authored.nodeKind === HtmlIrNodeKind.Element;
  }
}

function nodeDerivation(
  match: MatchedNode,
  matchesByBrowser: ReadonlyMap<string, MatchedNode>,
): AuthoredBrowserNodeDerivationDraft {
  const authoredParent = match.authored.parent?.ref.occurrenceKey ?? null;
  const immediateBrowserParent = match.browser.parent;
  let effectiveParent = immediateBrowserParent;
  let skippedImplied = false;
  while (effectiveParent != null && !matchesByBrowser.has(effectiveParent.ref.occurrenceKey)) {
    skippedImplied = true;
    effectiveParent = effectiveParent.parent;
  }
  const effectiveAuthoredParent = effectiveParent == null
    ? null
    : matchesByBrowser.get(effectiveParent.ref.occurrenceKey)?.authored.ref.occurrenceKey ?? null;
  const placement = effectiveAuthoredParent !== authoredParent
    ? 'reparented'
    : skippedImplied
      ? 'wrapped-by-implied-node'
      : 'retained';
  const value = match.association === 'exact-range' && match.authored.draft.text !== null
    ? match.authored.draft.text === ('text' in match.browser.draft ? match.browser.draft.text : null)
      ? 'identical'
      : 'normalized'
    : 'not-applicable';
  return new AuthoredBrowserNodeDerivationDraft(
    match.authored.ref,
    match.browser.ref,
    match.association,
    match.browser.draft.sourceLocation?.startOffset === match.authored.draft.start
      && match.browser.draft.sourceLocation?.endOffset === match.authored.draft.end
      ? 'identical'
      : 'divergent',
    placement,
    value,
  );
}

function reconstructionCohortsFor(
  matches: readonly MatchedNode[],
  correspondenceKey: string,
): readonly BrowserReconstructionCohortDraft[] {
  const grouped = new Map<string, MatchedNode[]>();
  for (const match of matches) appendMap(grouped, match.authored.ref.occurrenceKey, match);
  return [...grouped.values()]
    .filter((group) => group.length > 1)
    .map((group) => new BrowserReconstructionCohortDraft(
      `${correspondenceKey}/reconstruction/${encodeURIComponent(group[0]!.authored.ref.occurrenceKey)}`,
      group[0]!.authored.ref,
      group.map((match) => match.browser.ref),
    ));
}

function movedNodeDerivation(
  derivation: AuthoredBrowserNodeDerivationDraft,
  matches: readonly MatchedNode[],
  matchesByBrowser: ReadonlyMap<string, MatchedNode>,
): BrowserMovedNodeDerivationDraft {
  const match = matches.find((candidate) => candidate.browser.ref.occurrenceKey === derivation.browser.occurrenceKey)!;
  let parent = match.browser.parent;
  while (parent != null && !matchesByBrowser.has(parent.ref.occurrenceKey)) parent = parent.parent;
  return new BrowserMovedNodeDerivationDraft(
    derivation.authored,
    derivation.browser,
    match.authored.parent?.ref ?? null,
    parent == null ? null : matchesByBrowser.get(parent.ref.occurrenceKey)?.authored.ref ?? null,
    derivation.placement === 'reparented' ? 'reparented' : 'wrapped-by-implied-node',
  );
}

function impliedNode(
  browser: BrowserNodeEntry,
  authored: readonly AuthoredNodeEntry[],
): BrowserImpliedNodeDerivationDraft {
  const tag = browser.draft.nodeKind === BrowserTemplateDraftNodeKind.Element
    ? browser.draft.tagName
    : null;
  if (tag === 'tbody') {
    const start = firstLocatedBrowserDescendantStart(browser.draft);
    const cause = start == null ? [] : authored.filter((candidate) => candidate.draft.start === start).map((candidate) => candidate.ref);
    return new BrowserImpliedNodeDerivationDraft(browser.ref, cause, 'implied-table-section');
  }
  if (tag === 'p') {
    return new BrowserImpliedNodeDerivationDraft(browser.ref, [], 'implied-paragraph');
  }
  return new BrowserImpliedNodeDerivationDraft(browser.ref, [], 'parser-unlocated');
}

function firstLocatedBrowserDescendantStart(node: BrowserTemplateNodeDraft): number | null {
  if (node.nodeKind !== BrowserTemplateDraftNodeKind.Element) return null;
  const element = node;
  const candidates = [...element.children, ...(element.templateContent?.children ?? [])];
  for (const child of candidates) {
    if (child.sourceLocation != null) return child.sourceLocation.startOffset;
    const nested = firstLocatedBrowserDescendantStart(child);
    if (nested != null) return nested;
  }
  return null;
}

function planAttributes(
  authoredEntries: readonly AuthoredNodeEntry[],
  matches: readonly MatchedNode[],
  correspondenceKey: string,
  unresolved: CorrespondenceUnresolvedPartitionDraft[],
): {
  readonly derivations: readonly AuthoredBrowserAttributeDerivationDraft[];
  readonly drops: readonly AuthoredAttributeDropDerivationDraft[];
} {
  const derivations: AuthoredBrowserAttributeDerivationDraft[] = [];
  const drops: AuthoredAttributeDropDerivationDraft[] = [];
  const droppedAuthored = new Set<string>();
  const matchedAuthored = new Set<string>();
  for (const match of matches) {
    if (match.authored.draft.nodeKind !== HtmlIrNodeKind.Element || match.browser.draft.nodeKind !== BrowserTemplateDraftNodeKind.Element) continue;
    for (const browser of match.browser.attributes) {
      const location = browser.draft.sourceLocation;
      const candidates = location == null ? [] : match.authored.attributes.filter((authored) =>
        authored.draft.start === location.startOffset
        && authored.draft.end === location.endOffset
        && authored.draft.rawName === browser.draft.sourceTokenName
      );
      if (candidates.length !== 1) {
        unresolved.push(new CorrespondenceUnresolvedPartitionDraft(
          partitionKey(correspondenceKey, 'unresolved-browser-attribute', [browser.ref.occurrenceKey]),
          'unresolved-browser-attribute',
          [],
          [],
          candidates.map((candidate) => candidate.ref),
          [browser.ref],
          'Browser attribute had no unique exact authored lexical carrier.',
        ));
        continue;
      }
      const authored = candidates[0]!;
      matchedAuthored.add(authored.ref.occurrenceKey);
      const effectiveName = browser.draft.prefix == null
        ? browser.draft.name
        : `${browser.draft.prefix}:${browser.draft.name}`;
      const value = authored.draft.rawValue === browser.draft.value ? 'identical' : 'normalized';
      derivations.push(new AuthoredBrowserAttributeDerivationDraft(
        authored.ref,
        browser.ref,
        authored.draft.rawName === effectiveName ? 'identical' : 'adjusted',
        value,
      ));
      if (value === 'normalized') {
        unresolved.push(new CorrespondenceUnresolvedPartitionDraft(
          partitionKey(correspondenceKey, 'normalized-attribute-value', [authored.ref.occurrenceKey, browser.ref.occurrenceKey]),
          'normalized-attribute-value',
          [],
          [],
          [authored.ref],
          [browser.ref],
          'The attribute carrier is exact, but effective value normalization has no authored subspan map.',
        ));
      }
    }
  }
  const seenOwners = new Set(matches.map((match) => match.authored.ref.occurrenceKey));
  for (const match of matches) {
    if (!seenOwners.has(match.authored.ref.occurrenceKey)) continue;
    for (const authored of match.authored.attributes) {
      if (matchedAuthored.has(authored.ref.occurrenceKey)) continue;
      if (authored.draft.recoveries.some((recovery) => recovery.recoveryKind === HtmlRecoveryKind.DuplicateAttribute)) {
        if (droppedAuthored.has(authored.ref.occurrenceKey)) continue;
        const predecessor = match.authored.attributes.find((candidate) =>
          candidate.ref.ordinal < authored.ref.ordinal
          && htmlAsciiLowercase(candidate.draft.rawName) === htmlAsciiLowercase(authored.draft.rawName)
          && !candidate.draft.recoveries.some((recovery) => recovery.recoveryKind === HtmlRecoveryKind.DuplicateAttribute)
        );
        drops.push(new AuthoredAttributeDropDerivationDraft(authored.ref, predecessor?.ref ?? null, 'duplicate-attribute'));
        droppedAuthored.add(authored.ref.occurrenceKey);
      }
    }
  }
  for (const authored of authoredEntries.flatMap((entry) => entry.attributes)) {
    if (matchedAuthored.has(authored.ref.occurrenceKey) || droppedAuthored.has(authored.ref.occurrenceKey)) continue;
    unresolved.push(new CorrespondenceUnresolvedPartitionDraft(
      partitionKey(correspondenceKey, 'unmatched-authored-attribute', [authored.ref.occurrenceKey]),
      'unmatched-authored-attribute',
      [],
      [],
      [authored.ref],
      [],
      'Authored attribute belongs to an unmatched node or has no exact effective occurrence.',
    ));
  }
  return { derivations, drops };
}

function planCarrierSelection(
  selection: BrowserTemplateCarrierSelectionDraft | undefined,
  correspondenceKey: string,
  browserByPath: ReadonlyMap<string, BrowserNodeOccurrenceDraftReference>,
): {
  readonly carrier: CompilerCarrierDerivationDraft | null;
  readonly discards: readonly FactoryDiscardDerivationDraft[];
} {
  if (selection == null) return { carrier: null, discards: [] };
  if (selection.carrierKind === BrowserTemplateCarrierKind.SynthesizedWrapper) {
    return {
      carrier: new CompilerCarrierDerivationDraft(
        '0-to-1-synthesized-wrapper',
        new GeneratedCompilerCarrierDraftReference(`${correspondenceKey}/factory/generated-template/i:0`, 0),
      ),
      discards: [],
    };
  }
  if (selection.authoredCarrier == null) {
    throw new Error('Selected authored-template carrier is absent.');
  }
  const selected = browserByPath.get(encodeBrowserTemplatePath(selection.authoredCarrier.path));
  if (selected == null) throw new Error('Selected compiler carrier is not part of the browser draft.');
  const discards = selection.discardedInputNodes.map((node) => {
    const ref = browserByPath.get(encodeBrowserTemplatePath(node.path));
    if (ref == null) throw new Error('Factory-discarded node is not part of the browser draft.');
    return new FactoryDiscardDerivationDraft(ref, 'carrier-selection-discard');
  });
  return {
    carrier: new CompilerCarrierDerivationDraft('1-to-1-selected-template', selected),
    discards,
  };
}

function inCustomizableSelect(entry: AuthoredNodeEntry): boolean {
  if (entry.draft.tagName == null) return false;
  const tag = htmlAsciiLowercase(entry.draft.tagName);
  if (tag !== 'button' && tag !== 'selectedcontent') return false;
  let parent = entry.parent;
  while (parent != null) {
    if (htmlAsciiLowercase(parent.draft.tagName ?? '') === 'select') return true;
    parent = parent.parent;
  }
  return false;
}

function isPinnedLegacySelectProfile(browser: BrowserTemplateDraftResult): boolean {
  return browser.authority.parser === 'parse5' && browser.authority.parserVersion === '8.0.1';
}

function unresolvedNodes(
  correspondenceKey: string,
  kind: CorrespondenceUnresolvedPartitionDraft['kind'],
  authored: readonly AuthoredNodeDraftReference[],
  browser: readonly BrowserNodeOccurrenceDraftReference[],
  summary: string,
): CorrespondenceUnresolvedPartitionDraft {
  const members = [...authored.map((candidate) => candidate.occurrenceKey), ...browser.map((candidate) => candidate.occurrenceKey)];
  return new CorrespondenceUnresolvedPartitionDraft(
    partitionKey(correspondenceKey, kind, members),
    kind,
    authored,
    browser,
    [],
    [],
    summary,
  );
}

function partitionKey(correspondenceKey: string, kind: string, members: readonly string[]): string {
  const digest = createHash('sha256').update([...members].sort().join('\n')).digest('hex').slice(0, 20);
  return `${correspondenceKey}/unresolved/${kind}/${digest}`;
}

function partitionContainsAuthored(
  partitions: readonly CorrespondenceUnresolvedPartitionDraft[],
  occurrenceKey: string,
): boolean {
  return partitions.some((partition) => partition.authoredNodes.some((candidate) => candidate.occurrenceKey === occurrenceKey));
}

function partitionContainsBrowser(
  partitions: readonly CorrespondenceUnresolvedPartitionDraft[],
  occurrenceKey: string,
): boolean {
  return partitions.some((partition) => partition.browserNodes.some((candidate) => candidate.occurrenceKey === occurrenceKey));
}

function rangesIntersect(leftStart: number, leftEnd: number, rightStart: number, rightEnd: number): boolean {
  return leftStart < rightEnd && rightStart < leftEnd;
}

function appendMap<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const existing = map.get(key);
  if (existing == null) map.set(key, [value]);
  else existing.push(value);
}
