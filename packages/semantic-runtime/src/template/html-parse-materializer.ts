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
  compactFieldProvenance,
  FieldProvenance,
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
  type HtmlAttributeField,
  HtmlComment,
  type HtmlCommentField,
  HtmlCommentSemanticKind,
  HtmlDocument,
  type HtmlDocumentField,
  HtmlDoctype,
  HtmlElement,
  type HtmlElementField,
  type HtmlIrNode,
  HtmlIrNodeKind,
  HtmlNamespaceKind,
  type HtmlNodeReference,
  HtmlRecovery,
  HtmlRecoveryKind,
  HtmlText,
  type HtmlTextField,
} from './html-ir.js';
import {
  TemplateParseContext,
  TemplateRecoveryPolicy,
} from './parse-context.js';
import { TemplateProductDetails } from './product-details.js';

export class HtmlParseInput {
  constructor(
    /** Store-local key for the parsed HTML document. */
    readonly localKey: string,
    /** Authored template source to parse. */
    readonly templateSource: TemplateSource,
    /** Compiler-front-door unit that owns the parse. */
    readonly compilationUnit: TemplateCompilationUnit,
    /** Inquiry pressure for recovery/frontier preservation. */
    readonly parseContext: TemplateParseContext,
  ) {}
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

/** Parses authored template markup into HTML IR records without performing Aurelia syntax classification. */
export class HtmlParseMaterializer {
  constructor(
    /** Hot analysis store that receives HTML IR records. */
    readonly store: KernelStore,
  ) {}

  parse(input: HtmlParseInput): HtmlParseEmission {
    const emission = this.recordsForParse(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `html-parse:${input.localKey}`));
    }
    this.registerProductDetails(emission);
    return emission;
  }

  private registerProductDetails(emission: HtmlParseEmission): void {
    this.store.productDetails.add(TemplateProductDetails.HtmlDocument, emission.document.productHandle, emission.document);
    for (const node of emission.nodes) {
      this.store.productDetails.add(TemplateProductDetails.HtmlNode, node.productHandle, node);
    }
    for (const attribute of emission.attributes) {
      this.store.productDetails.add(TemplateProductDetails.HtmlAttribute, attribute.productHandle, attribute);
    }
  }

  private recordsForParse(input: HtmlParseInput): HtmlParseEmission {
    const source = this.recordsForSource(input);
    const state = new HtmlMaterializationState(input.localKey, input.templateSource, source, this.store);
    state.records.push(...source.records);

    const text = input.templateSource.markup ?? '';
    const draft = input.templateSource.markup == null
      ? new ParsedHtmlDocumentDraft(
        [],
        [new HtmlRecoveryDraft(HtmlRecoveryKind.Open, 'Template source did not carry closed markup text.', 0, 0)],
      )
      : new HtmlScanner(text, input.parseContext.recoveryPolicy).parseDocument();

    const documentProductHandle = this.store.handles.product(`html-document:${input.localKey}`);
    const documentIdentityHandle = this.store.handles.identity(`html-document:${input.localKey}`);
    const rootNodes = draft.rootNodes.map((node) =>
      this.materializeNode(input, state, node, documentProductHandle)
    );
    const documentRecoveries = draft.recoveries.map((recovery, index) =>
      this.materializeRecovery(state, recovery, `document-recovery:${index}`)
    );
    state.recoveries.push(...documentRecoveries);

    const document = new HtmlDocument(
      documentProductHandle,
      documentIdentityHandle,
      rootNodes,
      documentRecoveries,
      source.sourceAddressHandle,
      compactFieldProvenance<HtmlDocumentField>([
        new FieldProvenance('rootNodes', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
        documentRecoveries.length === 0 ? null : new FieldProvenance('recovery', source.provenanceHandle),
      ]),
    );
    const sourceClaim = new SemanticClaim(
      this.store.handles.claim(`html-document:${input.localKey}:source-parses-to-document`),
      input.templateSource.productHandle,
      KernelVocabulary.Template.ParsesToHtmlDocument.key,
      documentProductHandle,
      source.provenanceHandle,
    );
    state.claims.push(sourceClaim);
    state.records.push(
      new CompilerIdentity(
        documentIdentityHandle,
        KernelVocabulary.Template.HtmlDocument.key,
        input.templateSource.identityHandle,
        source.sourceAddressHandle,
        input.compilationUnit.unitKind,
      ),
      new MaterializedProduct(
        documentProductHandle,
        KernelVocabulary.Template.HtmlDocument.key,
        documentIdentityHandle,
        source.sourceAddressHandle,
        source.provenanceHandle,
      ),
      sourceClaim,
      ...state.claims.filter((claim) => claim !== sourceClaim),
      new MaterializationRecord(
        this.store.handles.materialization(`html-parse:${input.localKey}`),
        documentIdentityHandle,
        [
          documentProductHandle,
          ...state.nodes.map((node) => node.productHandle),
          ...state.attributes.map((attribute) => attribute.productHandle),
        ],
        state.claims.map((claim) => claim.handle),
      ),
    );

    return new HtmlParseEmission(
      document,
      state.nodes,
      state.attributes,
      state.recoveries,
      state.records,
    );
  }

  private recordsForSource(input: HtmlParseInput): HtmlParseSourceSet {
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

  private materializeNode(
    input: HtmlParseInput,
    state: HtmlMaterializationState,
    draft: ParsedHtmlNodeDraft,
    parentProductHandle: ProductHandle,
  ): HtmlNodeReference {
    const pathKey = draft.path.join('.');
    const local = `html-node:${input.localKey}:${pathKey}`;
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const sourceAddressHandle = this.sourceSpanAddress(state, `${local}:source`, draft.start, draft.end, SourceSpanRole.Range);
    const nodeAddressHandle = this.templateNodeAddress(state, `${local}:node`, draft.path, sourceAddressHandle);
    const recoveries = draft.recoveries.map((recovery, index) =>
      this.materializeRecovery(state, recovery, `${local}:recovery:${index}`)
    );
    state.recoveries.push(...recoveries);

    let node: HtmlElement | HtmlText | HtmlComment | HtmlDoctype;
    switch (draft.nodeKind) {
      case HtmlIrNodeKind.Element: {
        const attributes = draft.attributes.map((attribute, index) =>
          this.materializeAttribute(input, state, attribute, productHandle, identityHandle, `${pathKey}:attr:${index}`)
        );
        const children = draft.children.map((child) => this.materializeNode(input, state, child, productHandle));
        node = new HtmlElement(
          productHandle,
          identityHandle,
          draft.tagName ?? '',
          draft.namespace,
          attributes,
          children,
          draft.selfClosing,
          sourceAddressHandle,
          recoveries,
          compactFieldProvenance<HtmlElementField>([
            new FieldProvenance('tagName', state.source.provenanceHandle),
            new FieldProvenance('namespace', state.source.provenanceHandle),
            attributes.length === 0 ? null : new FieldProvenance('attributes', state.source.provenanceHandle),
            children.length === 0 ? null : new FieldProvenance('children', state.source.provenanceHandle),
            new FieldProvenance('selfClosing', state.source.provenanceHandle),
            new FieldProvenance('source', state.source.provenanceHandle),
            recoveries.length === 0 ? null : new FieldProvenance('recovery', state.source.provenanceHandle),
          ]),
        );
        break;
      }
      case HtmlIrNodeKind.Comment:
        node = new HtmlComment(
          productHandle,
          identityHandle,
          draft.text ?? '',
          HtmlCommentSemanticKind.Plain,
          sourceAddressHandle,
          recoveries,
          compactFieldProvenance<HtmlCommentField>([
            new FieldProvenance('text', state.source.provenanceHandle),
            new FieldProvenance('semanticKind', state.source.provenanceHandle),
            new FieldProvenance('source', state.source.provenanceHandle),
            recoveries.length === 0 ? null : new FieldProvenance('recovery', state.source.provenanceHandle),
          ]),
        );
        break;
      case HtmlIrNodeKind.Doctype:
        node = new HtmlDoctype(
          productHandle,
          identityHandle,
          draft.text,
          sourceAddressHandle,
          recoveries,
        );
        break;
      case HtmlIrNodeKind.Text:
      default:
        node = new HtmlText(
          productHandle,
          identityHandle,
          draft.text ?? '',
          sourceAddressHandle,
          compactFieldProvenance<HtmlTextField>([
            new FieldProvenance('text', state.source.provenanceHandle),
            new FieldProvenance('source', state.source.provenanceHandle),
          ]),
        );
        break;
    }

    const claim = new SemanticClaim(
      this.store.handles.claim(`${local}:contained-by-parent`),
      parentProductHandle,
      KernelVocabulary.Template.ContainsHtmlNode.key,
      productHandle,
      state.source.provenanceHandle,
    );
    state.claims.push(claim);
    state.nodes.push(node);
    state.records.push(
      new TemplateNodeIdentity(
        identityHandle,
        state.templateSource.identityHandle,
        nodeKey(draft, sourceAddressHandle),
        nodeAddressHandle,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.HtmlNode.key,
        identityHandle,
        sourceAddressHandle,
        state.source.provenanceHandle,
      ),
    );
    return node.toReference();
  }

  private materializeAttribute(
    input: HtmlParseInput,
    state: HtmlMaterializationState,
    draft: ParsedHtmlAttributeDraft,
    parentProductHandle: ProductHandle,
    parentIdentityHandle: IdentityHandle,
    pathKey: string,
  ) {
    const local = `html-attribute:${input.localKey}:${pathKey}`;
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const sourceAddressHandle = this.sourceSpanAddress(state, `${local}:source`, draft.start, draft.end, SourceSpanRole.Range);
    const nameAddressHandle = this.sourceSpanAddress(state, `${local}:name`, draft.nameStart, draft.nameEnd, SourceSpanRole.Name);
    const valueAddressHandle = draft.valueStart == null || draft.valueEnd == null
      ? null
      : this.sourceSpanAddress(state, `${local}:value`, draft.valueStart, draft.valueEnd, SourceSpanRole.Value);
    const recoveries = draft.recoveries.map((recovery, index) =>
      this.materializeRecovery(state, recovery, `${local}:recovery:${index}`)
    );
    state.recoveries.push(...recoveries);

    const attribute = new HtmlAttribute(
      productHandle,
      identityHandle,
      draft.rawName,
      draft.rawValue,
      nameAddressHandle,
      valueAddressHandle,
      sourceAddressHandle,
      recoveries,
      compactFieldProvenance<HtmlAttributeField>([
        new FieldProvenance('name', state.source.provenanceHandle),
        new FieldProvenance('value', state.source.provenanceHandle),
        new FieldProvenance('source', state.source.provenanceHandle),
        recoveries.length === 0 ? null : new FieldProvenance('recovery', state.source.provenanceHandle),
      ]),
    );
    const claim = new SemanticClaim(
      this.store.handles.claim(`${local}:contained-by-element`),
      parentProductHandle,
      KernelVocabulary.Template.ContainsHtmlAttribute.key,
      productHandle,
      state.source.provenanceHandle,
    );
    state.claims.push(claim);
    state.attributes.push(attribute);
    state.records.push(
      new CompilerIdentity(
        identityHandle,
        KernelVocabulary.Template.HtmlAttribute.key,
        parentIdentityHandle,
        sourceAddressHandle,
        draft.rawName,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Template.HtmlAttribute.key,
        identityHandle,
        sourceAddressHandle,
        state.source.provenanceHandle,
      ),
    );
    return attribute.toReference();
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
    while (!this.eof() && !isWhitespace(this.peek()) && this.peek() !== '>' && !this.startsWith('/>')) {
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
    while (!this.eof() && isWhitespace(this.peek())) {
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
    && !isWhitespace(value)
    && value !== '/'
    && value !== '>'
    && value !== '=';
}

function isWhitespace(value: string): boolean {
  return value === ' ' || value === '\t' || value === '\r' || value === '\n' || value === '\f';
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

function claimsForProduct(
  claims: readonly SemanticClaim[],
  productHandle: ProductHandle,
): readonly SemanticClaim[] {
  return claims.filter((claim) =>
    claim.subjectHandle === productHandle
    || claim.objectHandle === productHandle
  );
}
