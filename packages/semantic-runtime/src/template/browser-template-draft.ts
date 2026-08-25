import type { HtmlNamespaceKind } from './html-ir.js';

export const BROWSER_TEMPLATE_DRAFT_SCHEMA_VERSION = 'semantic-runtime/browser-template-draft/v1' as const;

export const enum BrowserTemplateDraftNodeKind {
  Fragment = 'fragment',
  Element = 'element',
  Text = 'text',
  Comment = 'comment',
  Doctype = 'doctype',
}

export const enum BrowserTemplateDraftLocationKind {
  ParserLocated = 'parser-located',
  ParserUnlocated = 'parser-unlocated',
}

/** Association with parse5's retained attribute-location table; this is not authored-product lineage. */
export const enum BrowserTemplateAttributeLocationJoinKind {
  OrdinalExactName = 'ordinal-exact-name',
  OrdinalAdjustedName = 'ordinal-adjusted-name',
  ImpliedOwner = 'implied-owner',
  Unresolved = 'unresolved',
}

export type BrowserTemplateDraftPathSegment = number | 'template-content';

/**
 * Copied parser token envelope. Lines/columns are one-based; offsets are zero-based UTF-16 code units.
 * Recovery can merge discontiguous source runs or reuse one envelope for multiple effective nodes, so this is not an
 * authored semantic span or lineage edge.
 */
export class BrowserTemplateSourceLocation {
  constructor(
    readonly startLine: number,
    readonly startColumn: number,
    readonly startOffset: number,
    readonly endLine: number,
    readonly endColumn: number,
    readonly endOffset: number,
  ) {}
}

/** Exact parser profile used for this run-local draft; it is not a universal browser authority. */
export class BrowserTemplateDraftAuthority {
  readonly schemaVersion = BROWSER_TEMPLATE_DRAFT_SCHEMA_VERSION;

  constructor(
    readonly parser: 'parse5',
    readonly parserVersion: string,
    readonly context: 'html-template-fragment',
    readonly scriptingEnabled: false,
  ) {}
}

export class BrowserTemplateParseIssue {
  constructor(
    readonly code: string,
    readonly location: BrowserTemplateSourceLocation,
  ) {}
}

export class BrowserTemplateAttributeDraft {
  constructor(
    readonly name: string,
    readonly value: string,
    readonly namespaceUri: string | null,
    readonly prefix: string | null,
    readonly locationJoinKind: BrowserTemplateAttributeLocationJoinKind,
    readonly parserLocationKey: string | null,
    readonly sourceTokenName: string | null,
    readonly sourceLocation: BrowserTemplateSourceLocation | null,
  ) {}
}

interface BrowserTemplateNodeBase {
  readonly nodeKind: BrowserTemplateDraftNodeKind;
  readonly path: readonly BrowserTemplateDraftPathSegment[];
  readonly locationKind: BrowserTemplateDraftLocationKind;
  readonly sourceLocation: BrowserTemplateSourceLocation | null;
}

export class BrowserTemplateFragmentDraft {
  readonly nodeKind = BrowserTemplateDraftNodeKind.Fragment;

  constructor(
    readonly path: readonly BrowserTemplateDraftPathSegment[],
    readonly children: readonly BrowserTemplateNodeDraft[],
  ) {}
}

export class BrowserTemplateElementDraft implements BrowserTemplateNodeBase {
  readonly nodeKind = BrowserTemplateDraftNodeKind.Element;

  constructor(
    readonly path: readonly BrowserTemplateDraftPathSegment[],
    readonly tagName: string,
    readonly namespace: HtmlNamespaceKind,
    readonly namespaceUri: string,
    readonly attributes: readonly BrowserTemplateAttributeDraft[],
    readonly children: readonly BrowserTemplateNodeDraft[],
    readonly templateContent: BrowserTemplateFragmentDraft | null,
    readonly locationKind: BrowserTemplateDraftLocationKind,
    readonly sourceLocation: BrowserTemplateSourceLocation | null,
    readonly startTagSourceLocation: BrowserTemplateSourceLocation | null,
    readonly endTagSourceLocation: BrowserTemplateSourceLocation | null,
  ) {}
}

export class BrowserTemplateTextDraft implements BrowserTemplateNodeBase {
  readonly nodeKind = BrowserTemplateDraftNodeKind.Text;

  constructor(
    readonly path: readonly BrowserTemplateDraftPathSegment[],
    readonly text: string,
    readonly locationKind: BrowserTemplateDraftLocationKind,
    readonly sourceLocation: BrowserTemplateSourceLocation | null,
  ) {}
}

export class BrowserTemplateCommentDraft implements BrowserTemplateNodeBase {
  readonly nodeKind = BrowserTemplateDraftNodeKind.Comment;

  constructor(
    readonly path: readonly BrowserTemplateDraftPathSegment[],
    readonly text: string,
    readonly locationKind: BrowserTemplateDraftLocationKind,
    readonly sourceLocation: BrowserTemplateSourceLocation | null,
  ) {}
}

export class BrowserTemplateDoctypeDraft implements BrowserTemplateNodeBase {
  readonly nodeKind = BrowserTemplateDraftNodeKind.Doctype;

  constructor(
    readonly path: readonly BrowserTemplateDraftPathSegment[],
    readonly name: string,
    readonly publicId: string,
    readonly systemId: string,
    readonly locationKind: BrowserTemplateDraftLocationKind,
    readonly sourceLocation: BrowserTemplateSourceLocation | null,
  ) {}
}

export type BrowserTemplateNodeDraft =
  | BrowserTemplateElementDraft
  | BrowserTemplateTextDraft
  | BrowserTemplateCommentDraft
  | BrowserTemplateDoctypeDraft;

/** Product-free run-local template tree-builder result. */
export class BrowserTemplateDraftResult {
  constructor(
    readonly authority: BrowserTemplateDraftAuthority,
    readonly markup: string,
    readonly fragment: BrowserTemplateFragmentDraft,
    /** Diagnostic serialization witness only; structural equality must use `browserTemplateStructure`. */
    readonly serialized: string,
    readonly issues: readonly BrowserTemplateParseIssue[],
  ) {}
}

export interface BrowserTemplateStructureAttribute {
  readonly name: string;
  readonly value: string;
  readonly namespaceUri: string | null;
  readonly prefix: string | null;
}

export type BrowserTemplateStructureNode =
  | {
      readonly kind: 'element';
      readonly tagName: string;
      readonly namespaceUri: string;
      readonly attributes: readonly BrowserTemplateStructureAttribute[];
      readonly children: readonly BrowserTemplateStructureNode[];
      readonly content: readonly BrowserTemplateStructureNode[] | null;
    }
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'comment'; readonly value: string }
  | { readonly kind: 'doctype'; readonly name: string; readonly publicId: string; readonly systemId: string };

/** Location-free structural normal form used by an independent browser oracle. */
export function browserTemplateStructure(
  fragment: BrowserTemplateFragmentDraft,
): readonly BrowserTemplateStructureNode[] {
  return fragment.children.map(structureNode);
}

function structureNode(node: BrowserTemplateNodeDraft): BrowserTemplateStructureNode {
  switch (node.nodeKind) {
    case BrowserTemplateDraftNodeKind.Text:
      return { kind: 'text', value: node.text };
    case BrowserTemplateDraftNodeKind.Comment:
      return { kind: 'comment', value: node.text };
    case BrowserTemplateDraftNodeKind.Doctype:
      return { kind: 'doctype', name: node.name, publicId: node.publicId, systemId: node.systemId };
    case BrowserTemplateDraftNodeKind.Element:
      return {
        kind: 'element',
        tagName: node.tagName,
        namespaceUri: node.namespaceUri,
        attributes: node.attributes.map((attribute) => ({
          name: attribute.name,
          value: attribute.value,
          namespaceUri: attribute.namespaceUri,
          prefix: attribute.prefix,
        })),
        children: node.children.map(structureNode),
        content: node.templateContent == null ? null : node.templateContent.children.map(structureNode),
      };
  }
}
