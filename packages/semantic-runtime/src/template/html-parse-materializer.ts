import {
  SourceSpanAddress,
  SourceSpanRole,
  TemplateNodeAddress,
} from '../kernel/address.js';
import { SemanticClaim, claimsForProduct } from '../kernel/claim.js';
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
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
} from '../kernel/vocabulary.js';
import {
  TemplateCompilationUnit,
  TemplateSource,
} from './compilation-unit.js';
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
  TemplateParseContext,
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

class ParsedHtmlAttributeDraft {
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

class ParsedHtmlNodeDraft {
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
  ) {}
}

class ParsedHtmlDocumentDraft {
  constructor(
    readonly rootNodes: readonly ParsedHtmlNodeDraft[],
    readonly recoveries: readonly HtmlRecoveryDraft[],
  ) {}
}

class HtmlRecoveryDraft {
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
    readonly store: KernelStore,
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
    readonly valueAddressHandle: AddressHandle | null,
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
    readonly store: KernelStore,
  ) {
    this.treeMaterializer = new HtmlParseTreeMaterializer(store);
  }

  parse(input: HtmlParseRequest): HtmlParseEmission {
    const emission = this.recordsForParse(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `html-parse:${input.localKey}`));
    }
    this.registerProductDetails(emission);
    return emission;
  }

  private registerProductDetails(emission: HtmlParseEmission): void {
    this.store.productDetails.add(TemplateProductDetails.HtmlDocument, emission.document.productHandle, emission.document);
    this.store.productDetails.addAll(TemplateProductDetails.HtmlNode, emission.nodes);
    this.store.productDetails.addAll(TemplateProductDetails.HtmlAttribute, emission.attributes);
  }

  private recordsForParse(input: HtmlParseRequest): HtmlParseEmission {
    const source = this.recordsForSource(input);
    const state = new HtmlMaterializationState(input.localKey, input.templateSource, source, this.store);
    state.records.push(...source.records);

    const draft = this.parseDocumentDraft(input);
    const handles = this.documentHandles(input);
    const rootNodes = this.treeMaterializer.materializeRootNodes(input, state, draft.rootNodes, handles.productHandle);
    const documentRecoveries = this.treeMaterializer.materializeDocumentRecoveries(state, draft);
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
    return new HtmlScanner(input.templateSource.markup, input.parseContext.recoveryPolicy).parseDocument();
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

class HtmlParseTreeMaterializer {
  constructor(
    private readonly store: KernelStore,
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
  ): readonly HtmlRecovery[] {
    return draft.recoveries.map((recovery, index) =>
      this.materializeRecovery(state, recovery, `document-recovery:${index}`)
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
    const recoveries = draft.recoveries.map((recovery, index) =>
      this.materializeRecovery(state, recovery, `${local}:recovery:${index}`)
    );
    state.recoveries.push(...recoveries);
    return new HtmlNodeMaterializationFrame(
      local,
      pathKey,
      this.store.handles.product(local),
      this.store.handles.identity(local),
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
    return this.bindHtmlNodeProduct(new HtmlElement(
      draft.tagName ?? '',
      draft.namespace,
      attributes,
      children,
      draft.selfClosing,
      frame.recoveries,
      [],
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
    const recoveries = draft.recoveries.map((recovery, index) =>
      this.materializeRecovery(state, recovery, `${local}:recovery:${index}`)
    );
    state.recoveries.push(...recoveries);
    return new HtmlAttributeMaterializationFrame(
      local,
      this.store.handles.product(local),
      this.store.handles.identity(local),
      this.sourceSpanAddress(state, `${local}:source`, draft.start, draft.end, SourceSpanRole.Range),
      this.sourceSpanAddress(state, `${local}:name`, draft.nameStart, draft.nameEnd, SourceSpanRole.Name),
      draft.valueStart == null || draft.valueEnd == null
        ? null
        : this.sourceSpanAddress(state, `${local}:value`, draft.valueStart, draft.valueEnd, SourceSpanRole.Value),
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
      [],
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
  ): HtmlRecovery {
    const addressHandle = this.sourceSpanAddress(state, `html-recovery:${state.localKey}:${local}`, draft.start, draft.end, SourceSpanRole.Range);
    return new HtmlRecovery(
      draft.recoveryKind,
      draft.summary,
      addressHandle,
      state.source.provenanceHandle,
    );
  }

  private sourceSpanAddress(
    state: HtmlMaterializationState,
    local: string,
    start: number,
    end: number,
    role: SourceSpanRole,
  ): AddressHandle | null {
    if (state.source.sourceAddressHandle == null) {
      return null;
    }
    const sourceAddress = this.store.readAddress(state.source.sourceAddressHandle);
    if (!(sourceAddress instanceof SourceSpanAddress)) {
      return null;
    }
    const mapped = mapTemplateSourceSpan(state.templateSource.sourceMap, start, end);
    if (state.templateSource.sourceMap != null && mapped == null) {
      return null;
    }
    const sourceStart = mapped?.start ?? sourceAddress.start + start;
    const sourceEnd = mapped?.end ?? sourceAddress.start + end;
    const handle = this.store.handles.address(local);
    state.records.push(new SourceSpanAddress(
      handle,
      sourceAddress.fileHandle,
      sourceStart,
      sourceEnd,
      role,
    ));
    return handle;
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

  constructor(
    private readonly text: string,
    private readonly recoveryPolicy: TemplateRecoveryPolicy,
  ) {}

  parseDocument(): ParsedHtmlDocumentDraft {
    const rootNodes = this.parseNodes(null, HtmlNamespaceKind.Html, []);
    return new ParsedHtmlDocumentDraft(rootNodes, this.recoveries);
  }

  private parseNodes(
    parentTag: string | null,
    namespace: HtmlNamespaceKind,
    pathPrefix: readonly number[],
  ): ParsedHtmlNodeDraft[] {
    const nodes: ParsedHtmlNodeDraft[] = [];
    while (!this.eof()) {
      if (this.startsWith('</')) {
        const endStart = this.pos;
        const tag = this.readEndTag();
        if (parentTag != null && tag.toLowerCase() === parentTag.toLowerCase()) {
          return nodes;
        }
        this.recoveries.push(new HtmlRecoveryDraft(
          HtmlRecoveryKind.UnexpectedEndTag,
          `Unexpected closing tag ${tag.length === 0 ? '</>' : `</${tag}>`}.`,
          endStart,
          this.pos,
        ));
        if (this.recoveryPolicy === TemplateRecoveryPolicy.Strict && parentTag != null) {
          return nodes;
        }
        continue;
      }

      const path = [...pathPrefix, nodes.length];
      if (this.startsWith('<!--')) {
        nodes.push(this.parseComment(path));
        continue;
      }
      if (this.startsWith('<!')) {
        nodes.push(this.parseDoctype(path));
        continue;
      }
      if (this.peek() === '<') {
        const element = this.parseElement(namespace, path);
        nodes.push(element);
        continue;
      }
      nodes.push(this.parseText(path));
    }

    return nodes;
  }

  private parseText(path: readonly number[]): ParsedHtmlNodeDraft {
    const start = this.pos;
    while (!this.eof() && this.peek() !== '<') {
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
    const end = this.text.indexOf('-->', this.pos);
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
    this.pos = end + 3;
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
      [],
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

  private parseElement(parentNamespace: HtmlNamespaceKind, path: readonly number[]): ParsedHtmlNodeDraft {
    const start = this.pos;
    this.pos++;
    const tagStart = this.pos;
    const tagName = this.readName();
    if (tagName.length === 0) {
      const recovery = new HtmlRecoveryDraft(HtmlRecoveryKind.Open, 'Expected an element name after <.', start, Math.min(start + 1, this.text.length));
      return new ParsedHtmlNodeDraft(HtmlIrNodeKind.Text, start, this.pos, path, null, HtmlNamespaceKind.Html, [], [], false, '<', [recovery]);
    }

    const namespace = namespaceForElement(tagName, parentNamespace);
    const attributes: ParsedHtmlAttributeDraft[] = [];
    const recoveries: HtmlRecoveryDraft[] = [];
    const seenAttributes = new Set<string>();
    let selfClosing = false;
    while (!this.eof()) {
      this.skipWhitespace();
      if (this.startsWith('/>')) {
        selfClosing = true;
        this.pos += 2;
        break;
      }
      if (this.peek() === '>') {
        this.pos++;
        break;
      }
      const attribute = this.parseAttribute();
      if (seenAttributes.has(attribute.rawName)) {
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
        seenAttributes.add(attribute.rawName);
        attributes.push(attribute);
      }
    }

    const children = selfClosing || isVoidElement(tagName)
      ? []
      : this.parseNodes(tagName, namespace, path);
    const end = this.pos;
    if (!selfClosing && !isVoidElement(tagName) && this.eof() && !this.endsWithEndTag(tagName)) {
      recoveries.push(new HtmlRecoveryDraft(HtmlRecoveryKind.MissingEndTag, `Missing closing tag </${tagName}>.`, tagStart, end));
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
    );
  }

  private parseAttribute(): ParsedHtmlAttributeDraft {
    const start = this.pos;
    const nameStart = this.pos;
    const rawName = this.readName();
    const nameEnd = this.pos;
    if (rawName.length === 0) {
      this.pos++;
      return new ParsedHtmlAttributeDraft('', '', start, this.pos, nameStart, nameEnd, null, null, [
        new HtmlRecoveryDraft(HtmlRecoveryKind.Open, 'Expected an attribute name.', start, this.pos),
      ]);
    }

    this.skipWhitespace();
    if (this.peek() !== '=') {
      return new ParsedHtmlAttributeDraft(rawName, '', start, this.pos, nameStart, nameEnd, null, null, []);
    }
    this.pos++;
    this.skipWhitespace();

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
        return new ParsedHtmlAttributeDraft(rawName, rawValue, start, this.pos, nameStart, nameEnd, valueStart, valueEnd, []);
      }
      return new ParsedHtmlAttributeDraft(rawName, rawValue, start, this.pos, nameStart, nameEnd, valueStart, valueEnd, [
        new HtmlRecoveryDraft(HtmlRecoveryKind.UnterminatedAttribute, `Unterminated value for attribute ${rawName}.`, valueStart, valueEnd),
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
      [],
    );
  }

  private readEndTag(): string {
    this.pos += 2;
    this.skipWhitespace();
    const tag = this.readName();
    while (!this.eof() && this.peek() !== '>') {
      this.pos++;
    }
    if (this.peek() === '>') {
      this.pos++;
    }
    return tag;
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

  private endsWithEndTag(tagName: string): boolean {
    return this.text.slice(0, this.pos).toLowerCase().endsWith(`</${tagName.toLowerCase()}>`);
  }

  private peek(): string {
    return this.text[this.pos] ?? '';
  }

  private eof(): boolean {
    return this.pos >= this.text.length;
  }
}

function namespaceForElement(tagName: string, parentNamespace: HtmlNamespaceKind): HtmlNamespaceKind {
  const lower = tagName.toLowerCase();
  if (lower === 'svg') {
    return HtmlNamespaceKind.Svg;
  }
  if (lower === 'math') {
    return HtmlNamespaceKind.Math;
  }
  return parentNamespace;
}

function isVoidElement(tagName: string): boolean {
  switch (tagName.toLowerCase()) {
    case 'area':
    case 'base':
    case 'br':
    case 'col':
    case 'embed':
    case 'hr':
    case 'img':
    case 'input':
    case 'link':
    case 'meta':
    case 'param':
    case 'source':
    case 'track':
    case 'wbr':
      return true;
    default:
      return false;
  }
}

function isNameCharacter(value: string): boolean {
  return value !== ''
    && !isHtmlSpaceCharacter(value)
    && value !== '/'
    && value !== '>'
    && value !== '=';
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
