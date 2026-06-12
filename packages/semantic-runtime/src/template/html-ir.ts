import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  productDetailAddressHandle,
  productDetailHandle,
  productDetailIdentityHandle,
} from '../kernel/product-details.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import {
  templateElementLookupNameFromAttributes,
} from './special-attribute-source.js';

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

export interface HtmlAttributeLike {
  readonly rawName: string | null;
  readonly rawValue?: string;
}

export interface HtmlAttributeOwnerLike {
  readonly attributes?: readonly HtmlAttributeLike[];
}

export function normalizeHtmlTagName(tagName: string): string {
  return tagName.toUpperCase();
}

export function htmlAttributeValue(
  owner: HtmlAttributeOwnerLike | null | undefined,
  name: string,
): string | null {
  return owner?.attributes?.find((attribute) => attribute.rawName?.toLowerCase() === name)?.rawValue ?? null;
}

export function hasHtmlAttribute(
  owner: HtmlAttributeOwnerLike | null | undefined,
  name: string,
): boolean {
  return owner?.attributes?.some((attribute) => attribute.rawName?.toLowerCase() === name) ?? false;
}

export type HtmlCommentField =
  | 'text'
  | 'semanticKind'
  | 'source'
  | 'recovery';

const HtmlDocumentDetailKind = 'template.html-document';
const HtmlNodeDetailKind = 'template.html-node';
const HtmlAttributeDetailKind = 'template.html-attribute';

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
    /** Short explanation suitable for IDE/tooling projections. */
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
    /** Root nodes in authored order. */
    readonly rootNodes: readonly HtmlNodeReference[],
    /** Parser recoveries that apply to the document as a whole. */
    readonly recoveries: readonly HtmlRecovery[],
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<HtmlDocumentField>[] = [],
  ) {}

  /** Product handle for the materialized-product envelope that represents this document. */
  get productHandle(): ProductHandle {
    return productDetailHandle(this, HtmlDocumentDetailKind);
  }

  /** Identity for this authored HTML document. */
  get identityHandle(): IdentityHandle {
    return productDetailIdentityHandle(this, HtmlDocumentDetailKind);
  }

  /** Source address for the full template/document. */
  get sourceAddressHandle(): AddressHandle | null {
    return productDetailAddressHandle(this, HtmlDocumentDetailKind);
  }
}

/** Authored HTML fragment inside a template-controller, projection, or synthetic view. */
export class HtmlFragment {
  readonly nodeKind = HtmlIrNodeKind.Fragment;

  constructor(
    readonly children: readonly HtmlNodeReference[],
    readonly recoveries: readonly HtmlRecovery[] = [],
  ) {}

  get productHandle(): ProductHandle {
    return productDetailHandle(this, HtmlNodeDetailKind);
  }

  get identityHandle(): IdentityHandle {
    return productDetailIdentityHandle(this, HtmlNodeDetailKind);
  }

  get sourceAddressHandle(): AddressHandle | null {
    return productDetailAddressHandle(this, HtmlNodeDetailKind);
  }

  toReference(): HtmlNodeReference {
    return new HtmlNodeReference(
      this.nodeKind,
      this.identityHandle,
      this.productHandle,
      this.sourceAddressHandle,
    );
  }
}

/** Authored element node before resource lookup or lowering. */
export class HtmlElement {
  readonly nodeKind = HtmlIrNodeKind.Element;

  constructor(
    readonly tagName: string,
    readonly namespace: HtmlNamespaceKind,
    readonly attributes: readonly HtmlAttributeReference[],
    readonly children: readonly HtmlNodeReference[],
    readonly selfClosing: boolean,
    readonly recoveries: readonly HtmlRecovery[] = [],
    readonly fieldProvenance: readonly FieldProvenance<HtmlElementField>[] = [],
  ) {}

  get productHandle(): ProductHandle {
    return productDetailHandle(this, HtmlNodeDetailKind);
  }

  get identityHandle(): IdentityHandle {
    return productDetailIdentityHandle(this, HtmlNodeDetailKind);
  }

  get sourceAddressHandle(): AddressHandle | null {
    return productDetailAddressHandle(this, HtmlNodeDetailKind);
  }

  toReference(): HtmlNodeReference {
    return new HtmlNodeReference(
      this.nodeKind,
      this.identityHandle,
      this.productHandle,
      this.sourceAddressHandle,
    );
  }
}

/** Authored attribute before Aurelia attribute-pattern parsing. */
export class HtmlAttribute {
  constructor(
    readonly rawName: string,
    readonly rawValue: string,
    readonly nameAddressHandle: AddressHandle | null,
    readonly valueAddressHandle: AddressHandle | null,
    readonly recoveries: readonly HtmlRecovery[] = [],
    readonly fieldProvenance: readonly FieldProvenance<HtmlAttributeField>[] = [],
  ) {}

  get productHandle(): ProductHandle {
    return productDetailHandle(this, HtmlAttributeDetailKind);
  }

  get identityHandle(): IdentityHandle {
    return productDetailIdentityHandle(this, HtmlAttributeDetailKind);
  }

  get sourceAddressHandle(): AddressHandle | null {
    return productDetailAddressHandle(this, HtmlAttributeDetailKind);
  }

  toReference(): HtmlAttributeReference {
    return new HtmlAttributeReference(
      this.productHandle,
      this.sourceAddressHandle,
      this.rawName,
    );
  }
}

/** Authored text node before interpolation parsing. */
export class HtmlText {
  readonly nodeKind = HtmlIrNodeKind.Text;

  constructor(
    readonly text: string,
    readonly fieldProvenance: readonly FieldProvenance<HtmlTextField>[] = [],
  ) {}

  get productHandle(): ProductHandle {
    return productDetailHandle(this, HtmlNodeDetailKind);
  }

  get identityHandle(): IdentityHandle {
    return productDetailIdentityHandle(this, HtmlNodeDetailKind);
  }

  get sourceAddressHandle(): AddressHandle | null {
    return productDetailAddressHandle(this, HtmlNodeDetailKind);
  }

  toReference(): HtmlNodeReference {
    return new HtmlNodeReference(
      this.nodeKind,
      this.identityHandle,
      this.productHandle,
      this.sourceAddressHandle,
    );
  }
}

/** Authored comment node, including compiler-owned marker comments when they are re-read. */
export class HtmlComment {
  readonly nodeKind = HtmlIrNodeKind.Comment;

  constructor(
    readonly text: string,
    readonly semanticKind: HtmlCommentSemanticKind,
    readonly recoveries: readonly HtmlRecovery[] = [],
    readonly fieldProvenance: readonly FieldProvenance<HtmlCommentField>[] = [],
  ) {}

  get productHandle(): ProductHandle {
    return productDetailHandle(this, HtmlNodeDetailKind);
  }

  get identityHandle(): IdentityHandle {
    return productDetailIdentityHandle(this, HtmlNodeDetailKind);
  }

  get sourceAddressHandle(): AddressHandle | null {
    return productDetailAddressHandle(this, HtmlNodeDetailKind);
  }

  toReference(): HtmlNodeReference {
    return new HtmlNodeReference(
      this.nodeKind,
      this.identityHandle,
      this.productHandle,
      this.sourceAddressHandle,
    );
  }
}

/** Authored doctype node. Usually preserved for diagnostics rather than template lowering. */
export class HtmlDoctype {
  readonly nodeKind = HtmlIrNodeKind.Doctype;

  constructor(
    readonly name: string | null,
    readonly recoveries: readonly HtmlRecovery[] = [],
  ) {}

  get productHandle(): ProductHandle {
    return productDetailHandle(this, HtmlNodeDetailKind);
  }

  get identityHandle(): IdentityHandle {
    return productDetailIdentityHandle(this, HtmlNodeDetailKind);
  }

  get sourceAddressHandle(): AddressHandle | null {
    return productDetailAddressHandle(this, HtmlNodeDetailKind);
  }

  toReference(): HtmlNodeReference {
    return new HtmlNodeReference(
      this.nodeKind,
      this.identityHandle,
      this.productHandle,
      this.sourceAddressHandle,
    );
  }
}

export type HtmlIrNode =
  | HtmlDocument
  | HtmlFragment
  | HtmlElement
  | HtmlText
  | HtmlComment
  | HtmlDoctype;

/** Element owner row for an authored attribute in the parsed HTML IR. */
export class HtmlElementAttributeOwner {
  get tagName(): string {
    return this.element.tagName;
  }

  get namespace(): HtmlElement['namespace'] {
    return this.element.namespace;
  }

  constructor(
    readonly element: HtmlElement,
    readonly reference: HtmlNodeReference,
    readonly attributes: readonly HtmlAttribute[],
  ) {}
}

export function htmlElementAttributeOwnersByAttributeProduct(
  nodes: readonly HtmlIrNode[],
  attributes: readonly HtmlAttribute[],
): ReadonlyMap<ProductHandle, HtmlElementAttributeOwner> {
  const owners = htmlElementAttributeOwners(nodes, attributes);
  const ownersByAttribute = new Map<ProductHandle, HtmlElementAttributeOwner>();
  for (const owner of owners) {
    for (const attribute of owner.element.attributes) {
      if (attribute.productHandle != null) {
        ownersByAttribute.set(attribute.productHandle, owner);
      }
    }
  }
  return ownersByAttribute;
}

export function htmlElementAttributeOwnersByElementProduct(
  nodes: readonly HtmlIrNode[],
  attributes: readonly HtmlAttribute[],
): ReadonlyMap<ProductHandle, HtmlElementAttributeOwner> {
  return new Map(htmlElementAttributeOwners(nodes, attributes).map((owner) => [owner.element.productHandle, owner]));
}

export function htmlElementLookupName(
  element: HtmlElement,
  owner: HtmlElementAttributeOwner | null = null,
): string {
  return templateElementLookupNameFromAttributes(
    element.tagName,
    owner?.attributes ?? [],
  );
}

function htmlElementAttributeOwners(
  nodes: readonly HtmlIrNode[],
  attributes: readonly HtmlAttribute[],
): readonly HtmlElementAttributeOwner[] {
  const attributesByProduct = new Map(attributes.map((attribute) => [attribute.productHandle, attribute]));
  const owners: HtmlElementAttributeOwner[] = [];
  for (const node of nodes) {
    if (!(node instanceof HtmlElement)) {
      continue;
    }
    const owner = new HtmlElementAttributeOwner(
      node,
      node.toReference(),
      node.attributes
        .map((reference) => reference.productHandle == null ? null : attributesByProduct.get(reference.productHandle) ?? null)
        .filter((attribute): attribute is HtmlAttribute => attribute != null),
    );
    owners.push(owner);
  }
  return owners;
}
