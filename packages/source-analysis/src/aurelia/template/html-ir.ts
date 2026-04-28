import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';

export const enum HtmlIrNodeKind {
  Document = 'document',
  Fragment = 'fragment',
  Element = 'element',
  Text = 'text',
  Comment = 'comment',
  Doctype = 'doctype',
}

export const enum HtmlNamespaceKind {
  Html = 'html',
  Svg = 'svg',
  Math = 'math',
  Unknown = 'unknown',
}

export const enum HtmlCommentSemanticKind {
  Plain = 'plain',
  RenderLocation = 'render-location',
  CompilerMarker = 'compiler-marker',
  Open = 'open',
}

export const enum HtmlRecoveryKind {
  MissingEndTag = 'missing-end-tag',
  UnexpectedEndTag = 'unexpected-end-tag',
  UnterminatedComment = 'unterminated-comment',
  UnterminatedAttribute = 'unterminated-attribute',
  DuplicateAttribute = 'duplicate-attribute',
  InvalidDoctype = 'invalid-doctype',
  Open = 'open',
}

export type HtmlDocumentField =
  | 'rootNodes'
  | 'source'
  | 'recovery';

export type HtmlElementField =
  | 'tagName'
  | 'namespace'
  | 'attributes'
  | 'children'
  | 'selfClosing'
  | 'source'
  | 'recovery';

export type HtmlAttributeField =
  | 'name'
  | 'value'
  | 'source'
  | 'recovery';

export type HtmlTextField =
  | 'text'
  | 'source';

export type HtmlCommentField =
  | 'text'
  | 'semanticKind'
  | 'source'
  | 'recovery';

/** Reference to one authored HTML IR node. */
export class HtmlNodeReference {
  constructor(
    /** Node kind represented by this reference. */
    readonly nodeKind: HtmlIrNodeKind,
    /** Identity for this node, when materialized. */
    readonly identityHandle: IdentityHandle | null,
    /** Product handle for this node, when emitted. */
    readonly productHandle: ProductHandle | null,
    /** Source address for the node span. */
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Reference to one authored HTML attribute. */
export class HtmlAttributeReference {
  constructor(
    /** Product handle for this attribute, when emitted. */
    readonly productHandle: ProductHandle | null,
    /** Source address for the attribute name/value span. */
    readonly addressHandle: AddressHandle | null,
    /** Raw attribute name, when known. */
    readonly rawName: string | null,
  ) {}
}

/** HTML parser recovery observation attached to a node or attribute. */
export class HtmlRecovery {
  constructor(
    /** Parser recovery lane. */
    readonly recoveryKind: HtmlRecoveryKind,
    /** Short explanation suitable for IDE/MCP projections. */
    readonly summary: string,
    /** Source address for the malformed syntax or recovery insertion point. */
    readonly addressHandle: AddressHandle | null,
    /** Provenance for the recovery observation. */
    readonly provenanceHandle: ProvenanceHandle | null,
  ) {}
}

/** Authored HTML document or template fragment before Aurelia attribute classification. */
export class HtmlDocument {
  readonly nodeKind = HtmlIrNodeKind.Document;

  constructor(
    /** Product handle for the materialized-product envelope that represents this document. */
    readonly productHandle: ProductHandle,
    /** Identity for this authored HTML document. */
    readonly identityHandle: IdentityHandle,
    /** Root nodes in authored order. */
    readonly rootNodes: readonly HtmlNodeReference[],
    /** Parser recoveries that apply to the document as a whole. */
    readonly recoveries: readonly HtmlRecovery[],
    /** Source address for the full template/document. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<HtmlDocumentField>[] = [],
  ) {}
}

/** Authored HTML fragment inside a template-controller, projection, or synthetic view. */
export class HtmlFragment {
  readonly nodeKind = HtmlIrNodeKind.Fragment;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly children: readonly HtmlNodeReference[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly recoveries: readonly HtmlRecovery[] = [],
  ) {}
}

/** Authored element node before resource lookup or lowering. */
export class HtmlElement {
  readonly nodeKind = HtmlIrNodeKind.Element;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly tagName: string,
    readonly namespace: HtmlNamespaceKind,
    readonly attributes: readonly HtmlAttributeReference[],
    readonly children: readonly HtmlNodeReference[],
    readonly selfClosing: boolean,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly recoveries: readonly HtmlRecovery[] = [],
    readonly fieldProvenance: readonly FieldProvenance<HtmlElementField>[] = [],
  ) {}
}

/** Authored attribute before Aurelia attribute-pattern parsing. */
export class HtmlAttribute {
  constructor(
    readonly productHandle: ProductHandle,
    readonly rawName: string,
    readonly rawValue: string,
    readonly nameAddressHandle: AddressHandle | null,
    readonly valueAddressHandle: AddressHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly recoveries: readonly HtmlRecovery[] = [],
    readonly fieldProvenance: readonly FieldProvenance<HtmlAttributeField>[] = [],
  ) {}
}

/** Authored text node before interpolation parsing. */
export class HtmlText {
  readonly nodeKind = HtmlIrNodeKind.Text;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly text: string,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<HtmlTextField>[] = [],
  ) {}
}

/** Authored comment node, including compiler-owned marker comments when they are re-read. */
export class HtmlComment {
  readonly nodeKind = HtmlIrNodeKind.Comment;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly text: string,
    readonly semanticKind: HtmlCommentSemanticKind,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly recoveries: readonly HtmlRecovery[] = [],
    readonly fieldProvenance: readonly FieldProvenance<HtmlCommentField>[] = [],
  ) {}
}

/** Authored doctype node. Usually preserved for diagnostics rather than template lowering. */
export class HtmlDoctype {
  readonly nodeKind = HtmlIrNodeKind.Doctype;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly name: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly recoveries: readonly HtmlRecovery[] = [],
  ) {}
}

export type HtmlIrNode =
  | HtmlDocument
  | HtmlFragment
  | HtmlElement
  | HtmlText
  | HtmlComment
  | HtmlDoctype;
