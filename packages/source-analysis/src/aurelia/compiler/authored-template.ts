import type {
  SourceSpan,
  TemplateNodeRef,
  TemplateRef,
} from '../refs.js';

export const AUTHORED_TEMPLATE_NODE_KINDS = [
  'fragment',
  'element',
  'text',
] as const;

export type AuthoredTemplateNodeKind =
  typeof AUTHORED_TEMPLATE_NODE_KINDS[number];

export const AUTHORED_TEMPLATE_OPEN_SEAM_KINDS = [
  'mismatched-close-tag',
  'unclosed-element',
  'unterminated-comment',
  'unterminated-tag',
  'unsupported-markup-declaration',
  'attribute-parse-open',
  'invalid-tag-open',
] as const;

export type AuthoredTemplateOpenSeamKind =
  typeof AUTHORED_TEMPLATE_OPEN_SEAM_KINDS[number];

export class AuthoredTemplateOpenSeam {
  constructor(
    readonly kind: AuthoredTemplateOpenSeamKind,
    readonly span: SourceSpan | null = null,
    readonly note: string | null = null,
  ) {}
}

export class AuthoredTemplateNodeProvenance {
  constructor(
    readonly ref: TemplateNodeRef | null,
    readonly span: SourceSpan,
    readonly note: string | null = null,
  ) {}
}

export class AuthoredTemplateAttribute {
  readonly kind = 'attribute' as const;

  constructor(
    readonly id: string,
    readonly rawName: string,
    readonly rawValue: string,
    readonly provenance: AuthoredTemplateNodeProvenance,
    readonly note: string | null = null,
  ) {}
}

export class AuthoredTemplateFragment {
  readonly kind = 'fragment' as const;

  constructor(
    readonly id: string,
    readonly provenance: AuthoredTemplateNodeProvenance,
    readonly children: readonly AuthoredTemplateNode[] = [],
    readonly note: string | null = null,
  ) {}
}

export class AuthoredElementNode {
  readonly kind = 'element' as const;

  constructor(
    readonly id: string,
    readonly tagName: string,
    readonly provenance: AuthoredTemplateNodeProvenance,
    readonly attributes: readonly AuthoredTemplateAttribute[] = [],
    readonly children: readonly AuthoredTemplateNode[] = [],
    readonly selfClosing: boolean = false,
    readonly note: string | null = null,
  ) {}
}

export class AuthoredTextNode {
  readonly kind = 'text' as const;

  constructor(
    readonly id: string,
    readonly value: string,
    readonly provenance: AuthoredTemplateNodeProvenance,
    readonly note: string | null = null,
  ) {}
}

export type AuthoredTemplateNode =
  | AuthoredTemplateFragment
  | AuthoredElementNode
  | AuthoredTextNode;

export class AuthoredTemplate {
  constructor(
    readonly ref: TemplateRef,
    readonly rawText: string,
    readonly root: AuthoredTemplateFragment,
    readonly openSeams: readonly AuthoredTemplateOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}
