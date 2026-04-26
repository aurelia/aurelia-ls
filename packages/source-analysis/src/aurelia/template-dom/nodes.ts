import type { TemplateNodeRef, TemplateRef } from '../refs.js';
import {
  createTemplateCommentMarker,
  type RenderLocationMarkerPair,
  type TemplateCommentMarker,
} from './markers.js';
import {
  readTemplateDomProvenance,
  type TemplateDomPhaseKind,
  type TemplateDomProvenance,
  type TemplateDomProvenanceFieldKind,
} from './provenance.js';

export const TEMPLATE_DOM_NODE_KINDS = [
  'document',
  'fragment',
  'element',
  'attribute',
  'text',
  'comment',
] as const;

export type TemplateDomNodeKind =
  typeof TEMPLATE_DOM_NODE_KINDS[number];

export const TEMPLATE_DOM_ATTRIBUTE_QUOTE_KINDS = [
  'none',
  'single',
  'double',
  'unquoted',
  'open',
] as const;

export type TemplateDomAttributeQuoteKind =
  typeof TEMPLATE_DOM_ATTRIBUTE_QUOTE_KINDS[number];

export class TemplateDomDocument {
  readonly kind = 'document' as const;

  constructor(
    readonly id: string,
    readonly template: TemplateRef | null,
    readonly phase: TemplateDomPhaseKind,
    readonly children: readonly TemplateDomChildNode[] = [],
    readonly provenance: readonly TemplateDomProvenance[] = [],
    readonly nodeRef: TemplateNodeRef | null = null,
  ) {}

  readProvenance(
    field: TemplateDomProvenanceFieldKind,
  ): TemplateDomProvenance | null {
    return readTemplateDomProvenance(this.provenance, field);
  }
}

export class TemplateDomFragment {
  readonly kind = 'fragment' as const;

  constructor(
    readonly id: string,
    readonly template: TemplateRef | null,
    readonly phase: TemplateDomPhaseKind,
    readonly children: readonly TemplateDomChildNode[] = [],
    readonly provenance: readonly TemplateDomProvenance[] = [],
    readonly nodeRef: TemplateNodeRef | null = null,
  ) {}

  readProvenance(
    field: TemplateDomProvenanceFieldKind,
  ): TemplateDomProvenance | null {
    return readTemplateDomProvenance(this.provenance, field);
  }
}

export class TemplateDomElement {
  readonly kind = 'element' as const;

  constructor(
    readonly id: string,
    readonly tagName: string,
    readonly namespace: string | null = null,
    readonly attributes: readonly TemplateDomAttribute[] = [],
    readonly children: readonly TemplateDomChildNode[] = [],
    readonly selfClosing: boolean = false,
    readonly provenance: readonly TemplateDomProvenance[] = [],
    readonly nodeRef: TemplateNodeRef | null = null,
  ) {}

  readAttribute(
    name: string,
  ): TemplateDomAttribute | null {
    return this.attributes.find((attribute) => attribute.name === name) ?? null;
  }

  readProvenance(
    field: TemplateDomProvenanceFieldKind,
  ): TemplateDomProvenance | null {
    return readTemplateDomProvenance(this.provenance, field);
  }
}

export class TemplateDomAttribute {
  readonly kind = 'attribute' as const;

  constructor(
    readonly id: string,
    readonly name: string,
    readonly value: string | null = null,
    readonly namespace: string | null = null,
    readonly quote: TemplateDomAttributeQuoteKind = 'double',
    readonly provenance: readonly TemplateDomProvenance[] = [],
    readonly nodeRef: TemplateNodeRef | null = null,
  ) {}

  readProvenance(
    field: TemplateDomProvenanceFieldKind,
  ): TemplateDomProvenance | null {
    return readTemplateDomProvenance(this.provenance, field);
  }
}

export class TemplateDomText {
  readonly kind = 'text' as const;

  constructor(
    readonly id: string,
    readonly text: string,
    readonly provenance: readonly TemplateDomProvenance[] = [],
    readonly nodeRef: TemplateNodeRef | null = null,
  ) {}

  readProvenance(
    field: TemplateDomProvenanceFieldKind,
  ): TemplateDomProvenance | null {
    return readTemplateDomProvenance(this.provenance, field);
  }
}

export class TemplateDomComment {
  readonly kind = 'comment' as const;
  readonly marker: TemplateCommentMarker;

  constructor(
    readonly id: string,
    readonly text: string,
    marker: TemplateCommentMarker | null = null,
    readonly provenance: readonly TemplateDomProvenance[] = [],
    readonly nodeRef: TemplateNodeRef | null = null,
  ) {
    this.marker = marker ?? createTemplateCommentMarker(text, provenance);
  }

  readProvenance(
    field: TemplateDomProvenanceFieldKind,
  ): TemplateDomProvenance | null {
    return readTemplateDomProvenance(this.provenance, field);
  }
}

export class TemplateDomTree {
  readonly kind = 'template-dom-tree' as const;

  constructor(
    readonly id: string,
    readonly phase: TemplateDomPhaseKind,
    readonly root: TemplateDomDocument | TemplateDomFragment,
    readonly renderLocations: readonly RenderLocationMarkerPair[] = [],
    readonly provenance: readonly TemplateDomProvenance[] = [],
  ) {}

  readProvenance(
    field: TemplateDomProvenanceFieldKind,
  ): TemplateDomProvenance | null {
    return readTemplateDomProvenance(this.provenance, field);
  }
}

export type TemplateDomContainerNode =
  | TemplateDomDocument
  | TemplateDomFragment
  | TemplateDomElement;

export type TemplateDomChildNode =
  | TemplateDomElement
  | TemplateDomText
  | TemplateDomComment;

export type TemplateDomNode =
  | TemplateDomDocument
  | TemplateDomFragment
  | TemplateDomElement
  | TemplateDomAttribute
  | TemplateDomText
  | TemplateDomComment;
