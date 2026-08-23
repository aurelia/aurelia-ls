import {
  SourceSpanAddress,
  SourceSpanRole,
  TemplateNodeAddress,
} from '../kernel/address.js';
import { SemanticClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  CompilerIdentity,
  TemplateNodeIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  bindProductDetailEnvelope,
  requireProductDetailEnvelope,
} from '../kernel/product-details.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  sourceSpanAddressForSite,
  sourceSpanEvidenceForSite,
  type SourceSpanSite,
  type SourceSpanEvidencePublication,
} from '../kernel/source-address.js';
import {
  KernelStoreBatch,
  type KernelStoreReadView,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  type KernelPublicationContext,
  KernelPublicationPlan,
  publishProductDetail,
  publishProductDetails,
} from '../kernel/publication.js';
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import type {
  TemplateCompilationUnit,
  TemplateSource,
} from './compilation-unit.js';
import { isHtmlVoidElement } from './html-elements.js';
import { htmlAsciiLowercase } from './html-ascii.js';
import {
  HtmlAttribute,
  HtmlComment,
  HtmlCommentSemanticKind,
  HtmlDocument,
  HtmlDoctype,
  HtmlElement,
  type HtmlIrNode,
  HtmlIrNodeKind,
  HtmlNamespaceKind,
  type HtmlNodeReference,
  HtmlRecovery,
  HtmlRecoveryKind,
  HtmlText,
} from './html-ir.js';
import {
  type TemplateParseContext,
  TemplateRecoveryPolicy,
} from './parse-context.js';
import { TemplateProductDetails } from './product-details.js';

export interface HtmlParseRequest {
  /** Store-local key for the parsed HTML document. */
  readonly localKey: string;
  /** Authored template source to parse. */
  readonly templateSource: TemplateSource;
  /** Compiler-front-door unit that owns the parse. */
  readonly compilationUnit: TemplateCompilationUnit;
  /** Inquiry pressure for recovery/frontier preservation. */
  readonly parseContext: TemplateParseContext;
}

export class HtmlParseEmission {
  constructor(
    readonly document: HtmlDocument,
    readonly nodes: readonly HtmlIrNode[],
    readonly attributes: readonly HtmlAttribute[],
    readonly recoveries: readonly HtmlRecovery[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class HtmlParseSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly provenanceHandle: ProvenanceHandle,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

export class ParsedHtmlAttributeDraft {
  constructor(
    readonly rawName: string,
    readonly rawValue: string,
    readonly start: number,
    readonly end: number,
    readonly nameStart: number,
    readonly nameEnd: number,
    readonly valueStart: number | null,
    readonly valueEnd: number | null,
    readonly recoveries: readonly HtmlRecoveryDraft[],
  ) {}
}

export class ParsedHtmlNodeDraft {
  constructor(
    readonly nodeKind: HtmlIrNodeKind,
    readonly start: number,
    readonly end: number,
    readonly path: readonly number[],
    readonly tagName: string | null,
    readonly namespace: HtmlNamespaceKind,
    readonly attributes: readonly ParsedHtmlAttributeDraft[],
    readonly children: readonly ParsedHtmlNodeDraft[],
    readonly selfClosing: boolean,
    readonly text: string | null,
    readonly recoveries: readonly HtmlRecoveryDraft[],
    readonly tagNames: ParsedHtmlElementTagNamesDraft | null = null,
  ) {}
}

export class ParsedHtmlElementTagNamesDraft {
  constructor(
    readonly openingStart: number,
    readonly openingEnd: number,
    readonly closingStart: number | null,
    readonly closingEnd: number | null,
  ) {}
}

class ParsedHtmlEndTagDraft {
  constructor(
    readonly name: string,
    readonly start: number,
    readonly end: number,
    readonly terminated: boolean,
    readonly recoveries: readonly HtmlRecoveryDraft[],
  ) {}
}

class ParsedHtmlNodeSequenceDraft {
  constructor(
    readonly nodes: readonly ParsedHtmlNodeDraft[],
    readonly closingTag: ParsedHtmlEndTagDraft | null,
  ) {}
}

export class ParsedHtmlDocumentDraft {
  constructor(
    readonly rootNodes: readonly ParsedHtmlNodeDraft[],
    readonly recoveries: readonly HtmlRecoveryDraft[],
  ) {}
}

export class HtmlRecoveryDraft {
  constructor(
    readonly recoveryKind: HtmlRecoveryKind,
    readonly summary: string,
    readonly start: number,
    readonly end: number,
  ) {}
}

class HtmlMaterializationState {
  readonly records: KernelStoreRecord[] = [];
  readonly nodes: HtmlIrNode[] = [];
  readonly attributes: HtmlAttribute[] = [];
  readonly recoveries: HtmlRecovery[] = [];
  readonly claims: SemanticClaim[] = [];

  constructor(
    readonly localKey: string,
    readonly templateSource: TemplateSource,
    readonly source: HtmlParseSourceSet,
    readonly store: KernelStoreReadView,
  ) {}
}

class HtmlNodeMaterializationFrame {
  constructor(
    readonly local: string,
    readonly pathKey: string,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly nodeAddressHandle: AddressHandle,
    readonly recoveries: readonly HtmlRecovery[],
  ) {}
}

class HtmlAttributeMaterializationFrame {
  constructor(
    readonly local: string,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly nameAddressHandle: AddressHandle | null,
    readonly nameProvenanceHandle: ProvenanceHandle | null,
    readonly valueAddressHandle: AddressHandle | null,
    readonly valueProvenanceHandle: ProvenanceHandle | null,
    readonly recoveries: readonly HtmlRecovery[],
  ) {}
}

class HtmlDocumentHandles {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

/** Parses authored template markup into HTML IR records without performing Aurelia syntax classification. */
export class HtmlParseMaterializer {
  private readonly treeMaterializer: HtmlParseTreeMaterializer;

  constructor(
    /** Hot analysis store that receives HTML IR records. */
    readonly store: KernelPublicationContext,
  ) {
    this.treeMaterializer = new HtmlParseTreeMaterializer(store);
  }

  parse(input: HtmlParseRequest): HtmlParseEmission {
    const emission = this.recordsForParse(input);
    this.store.publish(new KernelPublicationPlan(
      new KernelStoreBatch(emission.records, `html-parse:${input.localKey}`),
      [
        publishProductDetail(TemplateProductDetails.HtmlDocument, emission.document.productHandle, emission.document),
        ...publishProductDetails(TemplateProductDetails.HtmlNode, emission.nodes),
        ...publishProductDetails(TemplateProductDetails.HtmlAttribute, emission.attributes),
        ...publishProductDetails(TemplateProductDetails.HtmlRecovery, emission.recoveries),
      ],
    ));
    return emission;
  }

  private recordsForParse(input: HtmlParseRequest): HtmlParseEmission {
    const source = this.recordsForSource(input);
    const state = new HtmlMaterializationState(input.localKey, input.templateSource, source, this.store);
    state.records.push(...source.records);

    const draft = this.parseDocumentDraft(input);
    const handles = this.documentHandles(input);
    const rootNodes = this.treeMaterializer.materializeRootNodes(input, state, draft.rootNodes, handles.productHandle);
    const documentRecoveries = this.treeMaterializer.materializeDocumentRecoveries(
      state,
      draft,
      handles.identityHandle,
    );
    state.recoveries.push(...documentRecoveries);

    const document = this.createDocument(handles, source, rootNodes, documentRecoveries);
    const sourceClaim = this.sourceClaimForDocument(input, source, document);
    state.claims.push(sourceClaim);
    state.records.push(...this.recordsForDocument(input, state, document, sourceClaim));

    return new HtmlParseEmission(
      document,
      state.nodes,
      state.attributes,
      state.recoveries,
      state.records,
    );
  }

  private parseDocumentDraft(input: HtmlParseRequest): ParsedHtmlDocumentDraft {
    if (input.templateSource.markup == null) {
      return new ParsedHtmlDocumentDraft(
        [],
        [new HtmlRecoveryDraft(HtmlRecoveryKind.Open, 'Template source did not carry closed markup text.', 0, 0)],
      );
    }
    return parseHtmlDocumentDraft(input.templateSource.markup, input.parseContext.recoveryPolicy);
  }

  private documentHandles(input: HtmlParseRequest): HtmlDocumentHandles {
    return new HtmlDocumentHandles(
      this.store.handles.product(`html-document:${input.localKey}`),
      this.store.handles.identity(`html-document:${input.localKey}`),
    );
  }

  private createDocument(
    handles: HtmlDocumentHandles,
    source: HtmlParseSourceSet,
    rootNodes: readonly HtmlNodeReference[],
    recoveries: readonly HtmlRecovery[],
  ): HtmlDocument {
    return bindProductDetailEnvelope(new HtmlDocument(
      rootNodes,
      recoveries,
      [],
    ), new MaterializedProduct(
      handles.productHandle,
      KernelVocabulary.Template.HtmlDocument.key,
      handles.identityHandle,
      source.sourceAddressHandle,
      source.provenanceHandle,
    ));
  }

  private sourceClaimForDocument(
    input: HtmlParseRequest,
    source: HtmlParseSourceSet,
    document: HtmlDocument,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`html-document:${input.localKey}:source-parses-to-document`),
      input.templateSource.productHandle,
      KernelVocabulary.Template.ParsesToHtmlDocument.key,
      document.productHandle,
      source.provenanceHandle,
    );
  }

  private recordsForDocument(
    input: HtmlParseRequest,
    state: HtmlMaterializationState,
    document: HtmlDocument,
    sourceClaim: SemanticClaim,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        document.identityHandle,
        KernelVocabulary.Template.HtmlDocument.key,
        input.templateSource.identityHandle,
        state.source.sourceAddressHandle,
        input.compilationUnit.unitKind,
      ),
      requireProductDetailEnvelope(document, 'template.html-document'),
      sourceClaim,
      ...state.claims.filter((claim) => claim !== sourceClaim),
      new MaterializationRecord(
        this.store.handles.materialization(`html-parse:${input.localKey}`),
        document.identityHandle,
        htmlParseMaterializedProductHandles(document, state),
        state.claims.map((claim) => claim.handle),
      ),
    ];
  }

  private recordsForSource(input: HtmlParseRequest): HtmlParseSourceSet {
    const evidenceHandle = this.store.handles.evidence(`html-parse:${input.localKey}`);
    const provenanceHandle = this.store.handles.provenance(`html-parse:${input.localKey}`);
    const records: KernelStoreRecord[] = [
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SemanticObservation,
        [EvidenceRole.TransformInput, EvidenceRole.Scope],
        'HTML parser consumed an authored template source and parse context.',
        input.templateSource.sourceAddressHandle,
      ),
      new ProvenanceRecord(
        provenanceHandle,
        [evidenceHandle],
      ),
    ];
    return new HtmlParseSourceSet(records, provenanceHandle, input.templateSource.sourceAddressHandle);
  }
}

/** Parse source-shaped HTML without allocating kernel products so compiler orchestration can plan source views. */
export function parseHtmlDocumentDraft(
  markup: string,
  recoveryPolicy: TemplateRecoveryPolicy,
): ParsedHtmlDocumentDraft {
  return new HtmlScanner(markup, recoveryPolicy).parseDocument();
}

/** Maximum authored element ancestry retained by the parser and every recursive compiler consumer. */
export const MAX_HTML_ELEMENT_NESTING_DEPTH = 128;

class HtmlParseTreeMaterializer {
  constructor(
    private readonly store: KernelStoreReadView,
  ) {}

  materializeRootNodes(
    input: HtmlParseRequest,
    state: HtmlMaterializationState,
    drafts: readonly ParsedHtmlNodeDraft[],
    documentProductHandle: ProductHandle,
  ): readonly HtmlNodeReference[] {
    return drafts.map((node) => this.materializeNode(input, state, node, documentProductHandle));
  }

  materializeDocumentRecoveries(
    state: HtmlMaterializationState,
    draft: ParsedHtmlDocumentDraft,
    ownerIdentityHandle: IdentityHandle,
  ): readonly HtmlRecovery[] {
    return draft.recoveries.map((recovery, index) =>
      this.materializeRecovery(state, recovery, `document-recovery:${index}`, ownerIdentityHandle)
    );
  }

  private materializeNode(
    input: HtmlParseRequest,
    state: HtmlMaterializationState,
    draft: ParsedHtmlNodeDraft,
    parentProductHandle: ProductHandle,
  ): HtmlNodeReference {
    const frame = this.materializeNodeFrame(input, state, draft);
    const node = this.htmlNodeForDraft(input, state, draft, frame);
    this.recordMaterializedNode(state, draft, frame, parentProductHandle, node);
    return node.toReference();
  }

  private materializeNodeFrame(
    input: HtmlParseRequest,
    state: HtmlMaterializationState,
    draft: ParsedHtmlNodeDraft,
  ): HtmlNodeMaterializationFrame {
    const pathKey = draft.path.join('.');
    const local = `html-node:${input.localKey}:${pathKey}`;
    const sourceAddressHandle = this.sourceSpanAddress(state, `${local}:source`, draft.start, draft.end, SourceSpanRole.Range);
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const recoveries = draft.recoveries.map((recovery, index) =>
      this.materializeRecovery(state, recovery, `${local}:recovery:${index}`, identityHandle)
    );
    state.recoveries.push(...recoveries);
    return new HtmlNodeMaterializationFrame(
      local,
      pathKey,
      productHandle,
      identityHandle,
      sourceAddressHandle,
      this.templateNodeAddress(state, `${local}:node`, draft.path, sourceAddressHandle),
      recoveries,
    );
  }

  private htmlNodeForDraft(
    input: HtmlParseRequest,
    state: HtmlMaterializationState,
    draft: ParsedHtmlNodeDraft,
    frame: HtmlNodeMaterializationFrame,
  ): HtmlElement | HtmlText | HtmlComment | HtmlDoctype {
    switch (draft.nodeKind) {
      case HtmlIrNodeKind.Element:
        return this.htmlElementForDraft(input, state, draft, frame);
      case HtmlIrNodeKind.Comment:
        return this.htmlCommentForDraft(state, draft, frame);
      case HtmlIrNodeKind.Doctype:
        return this.bindHtmlNodeProduct(new HtmlDoctype(
          draft.text,
          frame.recoveries,
        ), state, frame);
      case HtmlIrNodeKind.Text:
      default:
        return this.bindHtmlNodeProduct(new HtmlText(
          draft.text ?? '',
          frame.recoveries,
          [],
        ), state, frame);
    }
  }

  private htmlElementForDraft(
    input: HtmlParseRequest,
    state: HtmlMaterializationState,
    draft: ParsedHtmlNodeDraft,
    frame: HtmlNodeMaterializationFrame,
  ): HtmlElement {
    const attributes = draft.attributes.map((attribute, index) =>
      this.materializeAttribute(input, state, attribute, frame.productHandle, frame.identityHandle, `${frame.pathKey}:attr:${index}`)
    );
    const children = draft.children.map((child) => this.materializeNode(input, state, child, frame.productHandle));
    const tagNameSource = draft.tagNames == null
      ? null
      : this.sourceSpanEvidence(
          state,
          `${frame.local}:tag-name`,
          draft.tagNames.openingStart,
          draft.tagNames.openingEnd,
          SourceSpanRole.Name,
          'Authored HTML opening-tag name.',
        );
    const closingTagNameSource = draft.tagNames?.closingStart == null || draft.tagNames.closingEnd == null
      ? null
      : this.sourceSpanEvidence(
          state,
          `${frame.local}:closing-tag-name`,
          draft.tagNames.closingStart,
          draft.tagNames.closingEnd,
          SourceSpanRole.Name,
          'Authored HTML closing-tag name.',
        );
    return this.bindHtmlNodeProduct(new HtmlElement(
      draft.tagName ?? '',
      draft.namespace,
      attributes,
      children,
      draft.selfClosing,
      tagNameSource?.addressHandle ?? null,
      closingTagNameSource?.addressHandle ?? null,
      frame.recoveries,
      compactFieldProvenance([
        tagNameSource == null ? null : new FieldProvenance('tagName', tagNameSource.provenanceHandle),
        closingTagNameSource == null
          ? null
          : new FieldProvenance('closingTagName', closingTagNameSource.provenanceHandle),
      ]),
    ), state, frame);
  }

  private htmlCommentForDraft(
    state: HtmlMaterializationState,
    draft: ParsedHtmlNodeDraft,
    frame: HtmlNodeMaterializationFrame,
  ): HtmlComment {
    return this.bindHtmlNodeProduct(new HtmlComment(
      draft.text ?? '',
      HtmlCommentSemanticKind.Plain,
      frame.recoveries,
      [],
    ), state, frame);
  }

  private bindHtmlNodeProduct<TNode extends HtmlElement | HtmlText | HtmlComment | HtmlDoctype>(
    node: TNode,
    state: HtmlMaterializationState,
    frame: HtmlNodeMaterializationFrame,
  ): TNode {
    return bindProductDetailEnvelope(node, new MaterializedProduct(
      frame.productHandle,
      KernelVocabulary.Template.HtmlNode.key,
      frame.identityHandle,
      frame.sourceAddressHandle,
      state.source.provenanceHandle,
    ));
  }

  private recordMaterializedNode(
    state: HtmlMaterializationState,
    draft: ParsedHtmlNodeDraft,
    frame: HtmlNodeMaterializationFrame,
    parentProductHandle: ProductHandle,
    node: HtmlElement | HtmlText | HtmlComment | HtmlDoctype,
  ): void {
    const claim = new SemanticClaim(
      this.store.handles.claim(`${frame.local}:contained-by-parent`),
      parentProductHandle,
      KernelVocabulary.Template.ContainsHtmlNode.key,
      frame.productHandle,
      state.source.provenanceHandle,
    );
    state.claims.push(claim);
    state.nodes.push(node);
    state.records.push(
      new TemplateNodeIdentity(
        frame.identityHandle,
        state.templateSource.identityHandle,
        nodeKey(draft, frame.sourceAddressHandle),
        frame.nodeAddressHandle,
      ),
      requireProductDetailEnvelope(node, 'template.html-node'),
    );
  }

  private materializeAttribute(
    input: HtmlParseRequest,
    state: HtmlMaterializationState,
    draft: ParsedHtmlAttributeDraft,
    parentProductHandle: ProductHandle,
    parentIdentityHandle: IdentityHandle,
    pathKey: string,
  ) {
    const frame = this.materializeAttributeFrame(input, state, draft, pathKey);
    const attribute = this.htmlAttributeForDraft(state, draft, frame);
    this.recordMaterializedAttribute(state, draft, frame, parentProductHandle, parentIdentityHandle, attribute);
    return attribute.toReference();
  }

  private materializeAttributeFrame(
    input: HtmlParseRequest,
    state: HtmlMaterializationState,
    draft: ParsedHtmlAttributeDraft,
    pathKey: string,
  ): HtmlAttributeMaterializationFrame {
    const local = `html-attribute:${input.localKey}:${pathKey}`;
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const recoveries = draft.recoveries.map((recovery, index) =>
      this.materializeRecovery(state, recovery, `${local}:recovery:${index}`, identityHandle)
    );
    state.recoveries.push(...recoveries);
    const nameSource = this.sourceSpanEvidence(
      state,
      `${local}:name`,
      draft.nameStart,
      draft.nameEnd,
      SourceSpanRole.Name,
      'Authored HTML attribute name.',
    );
    const valueSource = draft.valueStart == null || draft.valueEnd == null
      ? null
      : this.sourceSpanEvidence(
          state,
          `${local}:value`,
          draft.valueStart,
          draft.valueEnd,
          SourceSpanRole.Value,
          'Authored HTML attribute value.',
        );
    return new HtmlAttributeMaterializationFrame(
      local,
      productHandle,
      identityHandle,
      this.sourceSpanAddress(state, `${local}:source`, draft.start, draft.end, SourceSpanRole.Range),
      nameSource?.addressHandle ?? null,
      nameSource?.provenanceHandle ?? null,
      valueSource?.addressHandle ?? null,
      valueSource?.provenanceHandle ?? null,
      recoveries,
    );
  }

  private htmlAttributeForDraft(
    state: HtmlMaterializationState,
    draft: ParsedHtmlAttributeDraft,
    frame: HtmlAttributeMaterializationFrame,
  ): HtmlAttribute {
    return bindProductDetailEnvelope(new HtmlAttribute(
      draft.rawName,
      draft.rawValue,
      frame.nameAddressHandle,
      frame.valueAddressHandle,
      frame.recoveries,
      compactFieldProvenance([
        frame.nameProvenanceHandle == null
          ? null
          : new FieldProvenance('name', frame.nameProvenanceHandle),
        frame.valueProvenanceHandle == null
          ? null
          : new FieldProvenance('value', frame.valueProvenanceHandle),
      ]),
    ), new MaterializedProduct(
      frame.productHandle,
      KernelVocabulary.Template.HtmlAttribute.key,
      frame.identityHandle,
      frame.sourceAddressHandle,
      state.source.provenanceHandle,
    ));
  }

  private recordMaterializedAttribute(
    state: HtmlMaterializationState,
    draft: ParsedHtmlAttributeDraft,
    frame: HtmlAttributeMaterializationFrame,
    parentProductHandle: ProductHandle,
    parentIdentityHandle: IdentityHandle,
    attribute: HtmlAttribute,
  ): void {
    const claim = this.attributeContainmentClaim(state, frame, parentProductHandle);
    state.claims.push(claim);
    state.attributes.push(attribute);
    state.records.push(
      new CompilerIdentity(
        frame.identityHandle,
        KernelVocabulary.Template.HtmlAttribute.key,
        parentIdentityHandle,
        frame.sourceAddressHandle,
        draft.rawName,
      ),
      requireProductDetailEnvelope(attribute, 'template.html-attribute'),
    );
  }

  private attributeContainmentClaim(
    state: HtmlMaterializationState,
    frame: HtmlAttributeMaterializationFrame,
    parentProductHandle: ProductHandle,
  ): SemanticClaim {
    return new SemanticClaim(
      this.store.handles.claim(`${frame.local}:contained-by-element`),
      parentProductHandle,
      KernelVocabulary.Template.ContainsHtmlAttribute.key,
      frame.productHandle,
      state.source.provenanceHandle,
    );
  }

  private materializeRecovery(
    state: HtmlMaterializationState,
    draft: HtmlRecoveryDraft,
    local: string,
    ownerIdentityHandle: IdentityHandle,
  ): HtmlRecovery {
    const addressHandle = this.sourceSpanAddress(state, `html-recovery:${state.localKey}:${local}`, draft.start, draft.end, SourceSpanRole.Range);
    const productHandle = this.store.handles.product(`html-recovery:${state.localKey}:${local}`);
    const identityHandle = this.store.handles.identity(`html-recovery:${state.localKey}:${local}`);
    const recovery = bindProductDetailEnvelope(new HtmlRecovery(
      draft.recoveryKind,
      draft.summary,
      addressHandle,
      state.source.provenanceHandle,
    ), new MaterializedProduct(
      productHandle,
      KernelVocabulary.Template.HtmlRecovery.key,
      identityHandle,
      addressHandle,
      state.source.provenanceHandle,
    ));
    state.records.push(
      new CompilerIdentity(
        identityHandle,
        KernelVocabulary.Template.HtmlRecovery.key,
        ownerIdentityHandle,
        addressHandle,
        draft.recoveryKind,
      ),
      requireProductDetailEnvelope(recovery, 'template.html-recovery'),
    );
    return recovery;
  }

  private sourceSpanAddress(
    state: HtmlMaterializationState,
    local: string,
    start: number,
    end: number,
    role: SourceSpanRole,
  ): AddressHandle | null {
    const site = this.sourceSpanSite(state, start, end);
    if (site == null) return null;
    const publication = sourceSpanAddressForSite(this.store, local, site, role);
    state.records.push(...publication.records);
    return publication.handle;
  }

  private sourceSpanEvidence(
    state: HtmlMaterializationState,
    local: string,
    start: number,
    end: number,
    role: SourceSpanRole,
    summary: string,
  ): SourceSpanEvidencePublication | null {
    const site = this.sourceSpanSite(state, start, end);
    if (site == null) return null;
    const publication = sourceSpanEvidenceForSite(
      this.store,
      local,
      site,
      role,
      [EvidenceRole.TransformInput],
      summary,
    );
    state.records.push(...publication.records);
    return publication;
  }

  private sourceSpanSite(
    state: HtmlMaterializationState,
    start: number,
    end: number,
  ): SourceSpanSite | null {
    if (state.source.sourceAddressHandle == null) {
      return null;
    }
    const sourceAddress = this.store.read(state.source.sourceAddressHandle);
    if (!(sourceAddress instanceof SourceSpanAddress)) {
      return null;
    }
    const mapped = mapTemplateSourceSpan(state.templateSource.sourceMap, start, end);
    if (state.templateSource.sourceMap != null && mapped == null) {
      return null;
    }
    const sourceStart = mapped?.start ?? sourceAddress.start + start;
    const sourceEnd = mapped?.end ?? sourceAddress.start + end;
    return {
      sourceFileAddressHandle: sourceAddress.fileHandle,
      start: sourceStart,
      end: sourceEnd,
    };
  }

  private templateNodeAddress(
    state: HtmlMaterializationState,
    local: string,
    path: readonly number[],
    sourceAddressHandle: AddressHandle | null,
  ): AddressHandle {
    const handle = this.store.handles.address(local);
    state.records.push(new TemplateNodeAddress(
      handle,
      state.templateSource.templateAddressHandle,
      path,
      sourceAddressHandle,
    ));
    return handle;
  }
}

function mapTemplateSourceSpan(
  map: TemplateSource['sourceMap'],
  start: number,
  end: number,
): { readonly start: number; readonly end: number } | null {
  if (map == null) {
    return null;
  }
  if (
    start < 0
    || end < start
    || end > map.decodedLength
    || start >= map.decodedToSourceOffsets.length
    || end >= map.decodedToSourceOffsets.length
  ) {
    return null;
  }
  const mappedStart = map.decodedToSourceOffsets[start];
  const mappedEnd = map.decodedToSourceOffsets[end];
  return typeof mappedStart === 'number' && typeof mappedEnd === 'number'
    ? { start: mappedStart, end: mappedEnd }
    : null;
}

class HtmlScanner {
  private pos = 0;
  private readonly recoveries: HtmlRecoveryDraft[] = [];
  private nestingLimitReached = false;

  constructor(
    private readonly text: string,
    private readonly recoveryPolicy: TemplateRecoveryPolicy,
  ) {}

  parseDocument(): ParsedHtmlDocumentDraft {
    const root = this.parseNodes(null, HtmlNamespaceKind.Html, [], [], []);
    return new ParsedHtmlDocumentDraft(root.nodes, this.recoveries);
  }

  private parseNodes(
    parentTag: string | null,
    namespace: HtmlNamespaceKind,
    parentAttributes: readonly ParsedHtmlAttributeDraft[],
    ancestorTags: readonly string[],
    pathPrefix: readonly number[],
  ): ParsedHtmlNodeSequenceDraft {
    const nodes: ParsedHtmlNodeDraft[] = [];
    while (!this.eof()) {
      if (this.startsWith('</')) {
        const endStart = this.pos;
        const pendingName = this.peekEndTagName();
        if (
          parentTag != null
          && htmlAsciiLowercase(pendingName) !== htmlAsciiLowercase(parentTag)
          && ancestorTags.some((ancestor) => htmlAsciiLowercase(ancestor) === htmlAsciiLowercase(pendingName))
        ) {
          // Leave an ancestor's closing tag for the owning parse frame. Consuming
          // it here makes every ancestor look unclosed and creates a diagnostic cascade.
          return new ParsedHtmlNodeSequenceDraft(nodes, null);
        }
        const tag = this.readEndTag();
        if (parentTag != null && htmlAsciiLowercase(tag.name) === htmlAsciiLowercase(parentTag)) {
          return new ParsedHtmlNodeSequenceDraft(nodes, tag);
        }
        this.recoveries.push(...tag.recoveries);
        if (tag.terminated) {
          this.recoveries.push(new HtmlRecoveryDraft(
            this.recoveryPolicy === TemplateRecoveryPolicy.Frontier
              ? HtmlRecoveryKind.Open
              : HtmlRecoveryKind.UnexpectedEndTag,
            `Unexpected closing tag ${tag.name.length === 0 ? '</>' : `</${tag.name}>`}.`,
            tag.name.length === 0 ? endStart : tag.start,
            tag.name.length === 0 ? this.pos : tag.end,
          ));
        }
        continue;
      }

      if (
        this.startsStartTag()
        && pathPrefix.length >= MAX_HTML_ELEMENT_NESTING_DEPTH
      ) {
        this.stopAtNestingLimit();
        return new ParsedHtmlNodeSequenceDraft(nodes, null);
      }

      const path = [...pathPrefix, nodes.length];
      if (this.startsWith('<!--')) {
        nodes.push(this.parseComment(path));
        continue;
      }
      if (namespace !== HtmlNamespaceKind.Html && this.startsWith('<![CDATA[')) {
        nodes.push(this.parseCdata(namespace, path));
        continue;
      }
      if (this.startsWith('<!')) {
        nodes.push(this.parseDoctype(path));
        continue;
      }
      if (this.startsStartTag()) {
        const element = this.parseElement(parentTag, namespace, parentAttributes, ancestorTags, path);
        nodes.push(element);
        continue;
      }
      nodes.push(this.parseText(path));
    }

    return new ParsedHtmlNodeSequenceDraft(nodes, null);
  }

  private parseText(path: readonly number[]): ParsedHtmlNodeDraft {
    const start = this.pos;
    while (!this.eof() && !this.startsMarkupToken()) {
      this.pos++;
    }
    return new ParsedHtmlNodeDraft(
      HtmlIrNodeKind.Text,
      start,
      this.pos,
      path,
      null,
      HtmlNamespaceKind.Html,
      [],
      [],
      false,
      this.text.slice(start, this.pos),
      [],
    );
  }

  private parseComment(path: readonly number[]): ParsedHtmlNodeDraft {
    const start = this.pos;
    this.pos += 4;
    const abruptLength = this.peek() === '>'
      ? 1
      : this.startsWith('->')
        ? 2
        : 0;
    if (abruptLength > 0) {
      const end = this.pos + abruptLength;
      const recovery = new HtmlRecoveryDraft(
        HtmlRecoveryKind.MalformedComment,
        'Malformed empty HTML comment closing delimiter.',
        start,
        end,
      );
      this.pos = end;
      return new ParsedHtmlNodeDraft(
        HtmlIrNodeKind.Comment,
        start,
        end,
        path,
        null,
        HtmlNamespaceKind.Html,
        [],
        [],
        false,
        '',
        [recovery],
      );
    }
    const ordinaryEnd = this.text.indexOf('-->', this.pos);
    const malformedEnd = this.text.indexOf('--!>', this.pos);
    const end = ordinaryEnd < 0
      ? malformedEnd
      : malformedEnd < 0
        ? ordinaryEnd
        : Math.min(ordinaryEnd, malformedEnd);
    if (end < 0) {
      const value = this.text.slice(this.pos);
      const recovery = new HtmlRecoveryDraft(
        HtmlRecoveryKind.UnterminatedComment,
        'Unterminated HTML comment.',
        start,
        this.text.length,
      );
      this.pos = this.text.length;
      return new ParsedHtmlNodeDraft(
        HtmlIrNodeKind.Comment,
        start,
        this.pos,
        path,
        null,
        HtmlNamespaceKind.Html,
        [],
        [],
        false,
        value,
        [recovery],
      );
    }

    const value = this.text.slice(this.pos, end);
    const malformed = end === malformedEnd;
    this.pos = end + (malformed ? 4 : 3);
    return new ParsedHtmlNodeDraft(
      HtmlIrNodeKind.Comment,
      start,
      this.pos,
      path,
      null,
      HtmlNamespaceKind.Html,
      [],
      [],
      false,
      value,
      malformed
        ? [new HtmlRecoveryDraft(
            HtmlRecoveryKind.MalformedComment,
            'Malformed HTML comment closing delimiter; use -->.',
            end,
            this.pos,
          )]
        : [],
    );
  }

  private parseCdata(namespace: HtmlNamespaceKind, path: readonly number[]): ParsedHtmlNodeDraft {
    const declarationStart = this.pos;
    this.pos += '<![CDATA['.length;
    const contentStart = this.pos;
    const close = this.text.indexOf(']]>', contentStart);
    const contentEnd = close < 0 ? this.text.length : close;
    const value = this.text.slice(contentStart, contentEnd);
    const recoveries = close < 0
      ? [new HtmlRecoveryDraft(
          HtmlRecoveryKind.UnterminatedCdata,
          'Unterminated foreign-content CDATA section.',
          declarationStart,
          this.text.length,
        )]
      : [];
    this.pos = close < 0 ? this.text.length : close + ']]>'.length;
    return new ParsedHtmlNodeDraft(
      HtmlIrNodeKind.Text,
      contentStart,
      contentEnd,
      path,
      null,
      namespace,
      [],
      [],
      false,
      value,
      recoveries,
    );
  }

  private parseDoctype(path: readonly number[]): ParsedHtmlNodeDraft {
    const start = this.pos;
    const close = this.text.indexOf('>', this.pos + 2);
    if (close < 0) {
      const value = this.text.slice(this.pos + 2).trim() || null;
      const recovery = new HtmlRecoveryDraft(HtmlRecoveryKind.InvalidDoctype, 'Unterminated doctype declaration.', start, this.text.length);
      this.pos = this.text.length;
      return new ParsedHtmlNodeDraft(HtmlIrNodeKind.Doctype, start, this.pos, path, null, HtmlNamespaceKind.Html, [], [], false, value, [recovery]);
    }
    const raw = this.text.slice(this.pos + 2, close).trim();
    this.pos = close + 1;
    return new ParsedHtmlNodeDraft(HtmlIrNodeKind.Doctype, start, this.pos, path, null, HtmlNamespaceKind.Html, [], [], false, raw || null, []);
  }

  private parseElement(
    parentTag: string | null,
    parentNamespace: HtmlNamespaceKind,
    parentAttributes: readonly ParsedHtmlAttributeDraft[],
    ancestorTags: readonly string[],
    path: readonly number[],
  ): ParsedHtmlNodeDraft {
    const start = this.pos;
    this.pos++;
    const tagStart = this.pos;
    const tagName = this.readName();
    if (tagName.length === 0) {
      const recovery = new HtmlRecoveryDraft(HtmlRecoveryKind.Open, 'Expected an element name after <.', start, Math.min(start + 1, this.text.length));
      return new ParsedHtmlNodeDraft(HtmlIrNodeKind.Text, start, this.pos, path, null, HtmlNamespaceKind.Html, [], [], false, '<', [recovery]);
    }

    const namespace = namespaceForElement(tagName, parentTag, parentNamespace, parentAttributes);
    const attributes: ParsedHtmlAttributeDraft[] = [];
    const recoveries: HtmlRecoveryDraft[] = [];
    const seenAttributes = new Set<string>();
    let selfClosing = false;
    let startTagTerminated = false;
    while (!this.eof()) {
      this.skipWhitespace();
      if (this.eof()) {
        // The loop condition is evaluated before whitespace. Re-check here so a trailing space cannot become a
        // phantom attribute with an out-of-document recovery range.
        break;
      }
      if (this.startsWith('/>')) {
        selfClosing = namespace !== HtmlNamespaceKind.Html || isHtmlVoidElement(tagName);
        startTagTerminated = true;
        this.pos += 2;
        if (!selfClosing) {
          recoveries.push(new HtmlRecoveryDraft(
            HtmlRecoveryKind.NonVoidSelfClosing,
            `Self-closing syntax is ignored for non-void HTML element <${tagName}>.`,
            Math.max(start, this.pos - 2),
            this.pos,
          ));
        }
        break;
      }
      if (this.peek() === '>') {
        startTagTerminated = true;
        this.pos++;
        break;
      }
      const attribute = this.parseAttribute();
      const attributeKey = htmlAsciiLowercase(attribute.rawName);
      if (seenAttributes.has(attributeKey)) {
        attributes.push(new ParsedHtmlAttributeDraft(
          attribute.rawName,
          attribute.rawValue,
          attribute.start,
          attribute.end,
          attribute.nameStart,
          attribute.nameEnd,
          attribute.valueStart,
          attribute.valueEnd,
          [
            ...attribute.recoveries,
            new HtmlRecoveryDraft(HtmlRecoveryKind.DuplicateAttribute, `Duplicate attribute ${attribute.rawName}.`, attribute.nameStart, attribute.nameEnd),
          ],
        ));
      } else {
        seenAttributes.add(attributeKey);
        attributes.push(attribute);
      }
    }
    if (!startTagTerminated) {
      recoveries.push(new HtmlRecoveryDraft(
        HtmlRecoveryKind.UnterminatedStartTag,
        `Unterminated start tag <${tagName}>.`,
        start,
        this.pos,
      ));
    }

    const htmlVoidElement = namespace === HtmlNamespaceKind.Html && isHtmlVoidElement(tagName);
    const childSequence = selfClosing || htmlVoidElement
      ? new ParsedHtmlNodeSequenceDraft([], null)
      : namespace === HtmlNamespaceKind.Html && isHtmlRawTextElement(tagName)
        ? this.parseRawTextElement(tagName, namespace, path)
        : this.parseNodes(
            tagName,
            namespace,
            attributes,
            parentTag == null ? ancestorTags : [...ancestorTags, parentTag],
            path,
          );
    const children = childSequence.nodes;
    const end = this.pos;
    recoveries.push(...(childSequence.closingTag?.recoveries ?? []));
    if (
      !selfClosing
      && !htmlVoidElement
      && childSequence.closingTag == null
      && !this.nestingLimitReached
    ) {
      recoveries.push(new HtmlRecoveryDraft(
        HtmlRecoveryKind.MissingEndTag,
        `Missing closing tag </${tagName}>.`,
        tagStart,
        tagStart + tagName.length,
      ));
    }

    return new ParsedHtmlNodeDraft(
      HtmlIrNodeKind.Element,
      start,
      end,
      path,
      tagName,
      namespace,
      attributes,
      children,
      selfClosing,
      null,
      recoveries,
      new ParsedHtmlElementTagNamesDraft(
        tagStart,
        tagStart + tagName.length,
        childSequence.closingTag?.start ?? null,
        childSequence.closingTag?.end ?? null,
      ),
    );
  }

  private stopAtNestingLimit(): void {
    this.pos++;
    const nameStart = this.pos;
    const tagName = this.readName();
    const nameEnd = this.pos;
    this.recoveries.push(new HtmlRecoveryDraft(
      HtmlRecoveryKind.NestingLimitExceeded,
      `HTML element nesting exceeds the supported maximum of ${MAX_HTML_ELEMENT_NESTING_DEPTH} levels at <${tagName}>; remaining template markup was not analyzed.`,
      nameStart,
      nameEnd,
    ));
    this.nestingLimitReached = true;
    this.pos = this.text.length;
  }

  private parseRawTextElement(
    tagName: string,
    namespace: HtmlNamespaceKind,
    path: readonly number[],
  ): ParsedHtmlNodeSequenceDraft {
    const start = this.pos;
    const closingStart = this.findRawTextEndTag(tagName);
    const end = closingStart < 0 ? this.text.length : closingStart;
    const nodes = end === start
      ? []
      : [new ParsedHtmlNodeDraft(
          HtmlIrNodeKind.Text,
          start,
          end,
          [...path, 0],
          null,
          namespace,
          [],
          [],
          false,
          this.text.slice(start, end),
          [],
        )];
    this.pos = end;
    if (closingStart < 0) {
      return new ParsedHtmlNodeSequenceDraft(nodes, null);
    }
    const closingTag = this.readEndTag();
    return new ParsedHtmlNodeSequenceDraft(nodes, closingTag);
  }

  private findRawTextEndTag(tagName: string): number {
    const lowerText = this.text.toLowerCase();
    const needle = `</${tagName.toLowerCase()}`;
    let candidate = lowerText.indexOf(needle, this.pos);
    while (candidate >= 0) {
      const delimiter = this.text[candidate + needle.length] ?? '';
      if (delimiter === '' || delimiter === '>' || delimiter === '/' || isHtmlSpaceCharacter(delimiter)) {
        return candidate;
      }
      candidate = lowerText.indexOf(needle, candidate + needle.length);
    }
    return -1;
  }

  private parseAttribute(): ParsedHtmlAttributeDraft {
    const start = this.pos;
    const nameStart = this.pos;
    const rawName = this.readName();
    const nameEnd = this.pos;
    if (rawName.length === 0) {
      this.pos++;
      return new ParsedHtmlAttributeDraft('', '', start, this.pos, nameStart, nameEnd, null, null, [
        new HtmlRecoveryDraft(HtmlRecoveryKind.InvalidAttribute, 'Expected an attribute name.', start, this.pos),
      ]);
    }
    const invalidNameOffset = invalidHtmlAttributeNameCharacterOffset(rawName);
    const nameRecoveries = invalidNameOffset < 0
      ? []
      : [new HtmlRecoveryDraft(
          HtmlRecoveryKind.InvalidAttribute,
          `Invalid character in attribute name ${rawName}.`,
          nameStart + invalidNameOffset,
          nameStart + invalidNameOffset + 1,
        )];

    this.skipWhitespace();
    if (this.peek() !== '=') {
      return new ParsedHtmlAttributeDraft(
        rawName,
        '',
        start,
        this.pos,
        nameStart,
        nameEnd,
        null,
        null,
        nameRecoveries,
      );
    }
    const equalsStart = this.pos;
    this.pos++;
    this.skipWhitespace();

    if (this.eof() || this.peek() === '>' || this.startsWith('/>')) {
      return new ParsedHtmlAttributeDraft(rawName, '', start, this.pos, nameStart, nameEnd, null, null, [
        ...nameRecoveries,
        new HtmlRecoveryDraft(
          HtmlRecoveryKind.MissingAttributeValue,
          `Missing value for attribute ${rawName}.`,
          equalsStart,
          Math.min(this.text.length, equalsStart + 1),
        ),
      ]);
    }

    if (this.peek() === '"' || this.peek() === "'") {
      const quote = this.peek();
      this.pos++;
      const valueStart = this.pos;
      while (!this.eof() && this.peek() !== quote) {
        this.pos++;
      }
      const valueEnd = this.pos;
      const rawValue = this.text.slice(valueStart, valueEnd);
      if (this.peek() === quote) {
        this.pos++;
        return new ParsedHtmlAttributeDraft(
          rawName,
          rawValue,
          start,
          this.pos,
          nameStart,
          nameEnd,
          valueStart,
          valueEnd,
          nameRecoveries,
        );
      }
      return new ParsedHtmlAttributeDraft(rawName, rawValue, start, this.pos, nameStart, nameEnd, valueStart, valueEnd, [
        ...nameRecoveries,
        new HtmlRecoveryDraft(
          HtmlRecoveryKind.UnterminatedAttribute,
          `Unterminated value for attribute ${rawName}.`,
          Math.max(start, valueStart - 1),
          valueEnd,
        ),
      ]);
    }

    const valueStart = this.pos;
    while (!this.eof() && !isHtmlSpaceCharacter(this.peek()) && this.peek() !== '>' && !this.startsWith('/>')) {
      this.pos++;
    }
    const valueEnd = this.pos;
    return new ParsedHtmlAttributeDraft(
      rawName,
      this.text.slice(valueStart, valueEnd),
      start,
      this.pos,
      nameStart,
      nameEnd,
      valueStart,
      valueEnd,
      nameRecoveries,
    );
  }

  private readEndTag(): ParsedHtmlEndTagDraft {
    const start = this.pos;
    this.pos += 2;
    this.skipWhitespace();
    const nameStart = this.pos;
    const name = this.readName();
    const nameEnd = this.pos;
    while (!this.eof() && this.peek() !== '>') {
      this.pos++;
    }
    const terminated = this.peek() === '>';
    if (terminated) {
      this.pos++;
    }
    return new ParsedHtmlEndTagDraft(
      name,
      nameStart,
      nameEnd,
      terminated,
      terminated
        ? []
        : [new HtmlRecoveryDraft(
            HtmlRecoveryKind.UnterminatedEndTag,
            name.length === 0
              ? 'Unterminated closing tag; expected a tag name and >.'
              : `Unterminated closing tag </${name}>.`,
            start,
            this.pos,
          )],
    );
  }

  private peekEndTagName(): string {
    const current = this.pos;
    const tag = this.readEndTag();
    this.pos = current;
    return tag.name;
  }

  private readName(): string {
    const start = this.pos;
    while (!this.eof() && isNameCharacter(this.peek())) {
      this.pos++;
    }
    return this.text.slice(start, this.pos);
  }

  private skipWhitespace(): void {
    while (!this.eof() && isHtmlSpaceCharacter(this.peek())) {
      this.pos++;
    }
  }

  private startsWith(value: string): boolean {
    return this.text.startsWith(value, this.pos);
  }

  private startsEndTag(): boolean {
    return this.startsWith('</') && isHtmlTagNameStart(this.text[this.pos + 2] ?? '');
  }

  private startsStartTag(): boolean {
    return this.peek() === '<' && isHtmlTagNameStart(this.text[this.pos + 1] ?? '');
  }

  private startsMarkupToken(): boolean {
    return this.startsWith('<!--')
      || this.startsWith('<!')
      || this.startsWith('</')
      || this.startsStartTag();
  }

  private peek(): string {
    return this.text[this.pos] ?? '';
  }

  private eof(): boolean {
    return this.pos >= this.text.length;
  }
}

function namespaceForElement(
  tagName: string,
  parentTag: string | null,
  parentNamespace: HtmlNamespaceKind,
  parentAttributes: readonly ParsedHtmlAttributeDraft[],
): HtmlNamespaceKind {
  // This source-shaped scanner preserves well-nested foreign-content namespace transitions. Browser recovery that
  // reparents malformed HTML breakout tags belongs to a future tree-builder recovery layer, not namespace inference.
  const childName = htmlAsciiLowercase(tagName);
  if (!parsesChildInHtmlNamespace(childName, parentTag, parentNamespace, parentAttributes)) {
    if (
      parentNamespace === HtmlNamespaceKind.Math
      && (parentTag == null ? null : htmlAsciiLowercase(parentTag)) === 'annotation-xml'
      && childName === 'svg'
    ) {
      return HtmlNamespaceKind.Svg;
    }
    return parentNamespace;
  }

  if (childName === 'svg') {
    return HtmlNamespaceKind.Svg;
  }
  if (childName === 'math') {
    return HtmlNamespaceKind.Math;
  }
  return HtmlNamespaceKind.Html;
}

function parsesChildInHtmlNamespace(
  childName: string,
  parentTag: string | null,
  parentNamespace: HtmlNamespaceKind,
  parentAttributes: readonly ParsedHtmlAttributeDraft[],
): boolean {
  if (parentNamespace === HtmlNamespaceKind.Html) {
    return true;
  }

  const parentName = parentTag == null ? '' : htmlAsciiLowercase(parentTag);
  if (
    parentNamespace === HtmlNamespaceKind.Svg
    && (parentName === 'foreignobject' || parentName === 'desc' || parentName === 'title')
  ) {
    return true;
  }

  if (parentNamespace !== HtmlNamespaceKind.Math) {
    return false;
  }

  if (
    (parentName === 'mi' || parentName === 'mo' || parentName === 'mn' || parentName === 'ms' || parentName === 'mtext')
    && childName !== 'mglyph'
    && childName !== 'malignmark'
  ) {
    return true;
  }

  if (parentName !== 'annotation-xml') {
    return false;
  }
  const encoding = parentAttributes.find((attribute) => htmlAsciiLowercase(attribute.rawName) === 'encoding')?.rawValue;
  return encoding != null
    && isHtmlIntegrationEncoding(encoding);
}

function isHtmlIntegrationEncoding(rawValue: string): boolean {
  const decoded = rawValue.replace(
    /&#(?:[xX]([0-9a-fA-F]+)|([0-9]+));?|&(sol|plus);/gu,
    (reference, hexadecimal: string | undefined, decimal: string | undefined, named: string | undefined) => {
      if (named != null) {
        return named === 'sol' ? '/' : '+';
      }
      const codePoint = Number.parseInt(hexadecimal ?? decimal ?? '', hexadecimal == null ? 10 : 16);
      return Number.isSafeInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10_FFFF
        ? String.fromCodePoint(codePoint)
        : reference;
    },
  );
  const normalized = htmlAsciiLowercase(decoded);
  return normalized === 'text/html' || normalized === 'application/xhtml+xml';
}

function isNameCharacter(value: string): boolean {
  return value !== ''
    && !isHtmlSpaceCharacter(value)
    && value !== '/'
    && value !== '>'
    && value !== '=';
}

function isHtmlTagNameStart(value: string): boolean {
  return (value >= 'A' && value <= 'Z') || (value >= 'a' && value <= 'z');
}

function invalidHtmlAttributeNameCharacterOffset(value: string): number {
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]!;
    if (
      character === '<'
      || character === '"'
      || character === "'"
      || character === '`'
      || character === '\0'
    ) {
      return index;
    }
  }
  return -1;
}

function isHtmlRawTextElement(tagName: string): boolean {
  switch (htmlAsciiLowercase(tagName)) {
    case 'script':
    case 'style':
    case 'title':
    case 'textarea':
    case 'xmp':
    case 'iframe':
    case 'noembed':
    case 'noframes':
      return true;
    default:
      return false;
  }
}

function isHtmlSpaceCharacter(value: string): boolean {
  return value === ' ' || value === '\t' || value === '\r' || value === '\n' || value === '\f';
}

function htmlParseMaterializedProductHandles(
  document: HtmlDocument,
  state: HtmlMaterializationState,
): readonly ProductHandle[] {
  return [
    document.productHandle,
    ...state.nodes.map((node) => node.productHandle),
    ...state.attributes.map((attribute) => attribute.productHandle),
    ...state.recoveries.map((recovery) => recovery.productHandle),
  ];
}

function nodeLocalName(draft: ParsedHtmlNodeDraft): string | null {
  switch (draft.nodeKind) {
    case HtmlIrNodeKind.Element:
      return draft.tagName;
    case HtmlIrNodeKind.Comment:
      return '#comment';
    case HtmlIrNodeKind.Doctype:
      return '#doctype';
    case HtmlIrNodeKind.Text:
      return '#text';
    default:
      return null;
  }
}

function nodeKey(draft: ParsedHtmlNodeDraft, sourceAddressHandle: AddressHandle | null): string {
  const name = nodeLocalName(draft) ?? 'node';
  return sourceAddressHandle == null
    ? `${name}:path:${draft.path.join('.')}`
    : `${name}:source:${draft.start}-${draft.end}`;
}
