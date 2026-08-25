import {
  defaultTreeAdapter,
  html,
  parseFragment,
  serialize,
  type DefaultTreeAdapterTypes,
  type ParserError,
} from 'parse5';

import {
  BrowserTemplateAttributeDraft,
  BrowserTemplateAttributeLocationJoinKind,
  BrowserTemplateCommentDraft,
  BrowserTemplateDoctypeDraft,
  BrowserTemplateDraftAuthority,
  BrowserTemplateDraftResult,
  BrowserTemplateDraftLocationKind,
  BrowserTemplateElementDraft,
  BrowserTemplateFragmentDraft,
  BrowserTemplateParseIssue,
  BrowserTemplateSourceLocation,
  BrowserTemplateTextDraft,
  type BrowserTemplateDraftPathSegment,
  type BrowserTemplateNodeDraft,
} from './browser-template-draft.js';
import { HtmlNamespaceKind } from './html-ir.js';

export const BROWSER_TEMPLATE_DRAFT_PARSE5_VERSION = '8.0.1' as const;

const parse5Authority = new BrowserTemplateDraftAuthority(
  'parse5',
  BROWSER_TEMPLATE_DRAFT_PARSE5_VERSION,
  'html-template-fragment',
  false,
);

/** Parse one `HTMLTemplateElement.innerHTML` candidate through the pinned parse5 profile. */
export function parseBrowserTemplateFragmentDraft(markup: string): BrowserTemplateDraftResult {
  const errors: ParserError[] = [];
  const context = defaultTreeAdapter.createElement('template', html.NS.HTML, []);
  const parsed = parseFragment(context, markup, {
    scriptingEnabled: parse5Authority.scriptingEnabled,
    sourceCodeLocationInfo: true,
    onParseError: (error) => { errors.push(error); },
  });
  const fragment = materializeFragment(parsed, markup, []);
  return new BrowserTemplateDraftResult(
    parse5Authority,
    markup,
    fragment,
    serialize(parsed, { scriptingEnabled: parse5Authority.scriptingEnabled }),
    errors.map((error) => new BrowserTemplateParseIssue(error.code, requiredSourceLocation(error))),
  );
}

function materializeFragment(
  fragment: DefaultTreeAdapterTypes.DocumentFragment,
  markup: string,
  path: readonly BrowserTemplateDraftPathSegment[],
): BrowserTemplateFragmentDraft {
  return new BrowserTemplateFragmentDraft(
    path,
    fragment.childNodes.map((node, index) => materializeNode(node, markup, [...path, index])),
  );
}

function materializeNode(
  node: DefaultTreeAdapterTypes.ChildNode,
  markup: string,
  path: readonly BrowserTemplateDraftPathSegment[],
): BrowserTemplateNodeDraft {
  const location = sourceLocation(node.sourceCodeLocation);
  const locationKind = location == null
    ? BrowserTemplateDraftLocationKind.ParserUnlocated
    : BrowserTemplateDraftLocationKind.ParserLocated;
  if (defaultTreeAdapter.isTextNode(node)) {
    return new BrowserTemplateTextDraft(path, node.value, locationKind, location);
  }
  if (defaultTreeAdapter.isCommentNode(node)) {
    return new BrowserTemplateCommentDraft(path, node.data, locationKind, location);
  }
  if (defaultTreeAdapter.isDocumentTypeNode(node)) {
    return new BrowserTemplateDoctypeDraft(
      path,
      node.name,
      node.publicId,
      node.systemId,
      locationKind,
      location,
    );
  }

  const element = node;
  const elementLocation = element.sourceCodeLocation;
  const template = element.tagName === 'template' && 'content' in element
    ? element
    : null;
  return new BrowserTemplateElementDraft(
    path,
    element.tagName,
    namespaceKind(element.namespaceURI),
    element.namespaceURI,
    element.attrs.map((attribute, index) => materializeAttribute(
      attribute,
      index,
      element.attrs.length,
      elementLocation,
      markup,
    )),
    element.childNodes.map((child, index) => materializeNode(child, markup, [...path, index])),
    template == null ? null : materializeFragment(template.content, markup, [...path, 'template-content']),
    locationKind,
    location,
    sourceLocation(elementLocation?.startTag),
    sourceLocation(elementLocation?.endTag),
  );
}

function materializeAttribute(
  attribute: DefaultTreeAdapterTypes.Element['attrs'][number],
  index: number,
  parsedAttributeCount: number,
  elementLocation: DefaultTreeAdapterTypes.Element['sourceCodeLocation'],
  markup: string,
): BrowserTemplateAttributeDraft {
  if (elementLocation == null) {
    return new BrowserTemplateAttributeDraft(
      attribute.name,
      attribute.value,
      attribute.namespace ?? null,
      attribute.prefix ?? null,
      BrowserTemplateAttributeLocationJoinKind.ImpliedOwner,
      null,
      null,
      null,
    );
  }
  const locations = Object.entries(elementLocation.attrs ?? {})
    .sort(([, left], [, right]) => left.startOffset - right.startOffset);
  if (locations.length !== parsedAttributeCount) {
    return unresolvedAttributeLocation(attribute);
  }
  const locationEntry = locations[index];
  if (locationEntry == null) {
    return unresolvedAttributeLocation(attribute);
  }
  const [key, rawLocation] = locationEntry;
  const effectiveName = attribute.prefix == null ? attribute.name : `${attribute.prefix}:${attribute.name}`;
  const location = requiredSourceLocation(rawLocation);
  const sourceTokenName = readSourceTokenName(markup, location);
  const joinKind = sourceTokenName === effectiveName
    ? BrowserTemplateAttributeLocationJoinKind.OrdinalExactName
    : BrowserTemplateAttributeLocationJoinKind.OrdinalAdjustedName;
  return new BrowserTemplateAttributeDraft(
    attribute.name,
    attribute.value,
    attribute.namespace ?? null,
    attribute.prefix ?? null,
    joinKind,
    key,
    sourceTokenName,
    location,
  );
}

function unresolvedAttributeLocation(
  attribute: DefaultTreeAdapterTypes.Element['attrs'][number],
): BrowserTemplateAttributeDraft {
  return new BrowserTemplateAttributeDraft(
    attribute.name,
    attribute.value,
    attribute.namespace ?? null,
    attribute.prefix ?? null,
    BrowserTemplateAttributeLocationJoinKind.Unresolved,
    null,
    null,
    null,
  );
}

function readSourceTokenName(markup: string, location: BrowserTemplateSourceLocation): string | null {
  const source = markup.slice(location.startOffset, location.endOffset);
  let end = 0;
  while (end < source.length && !isHtmlAttributeNameTerminator(source.charCodeAt(end))) {
    ++end;
  }
  return end === 0 ? null : source.slice(0, end);
}

function isHtmlAttributeNameTerminator(code: number): boolean {
  return code === 0x09
    || code === 0x0a
    || code === 0x0c
    || code === 0x0d
    || code === 0x20
    || code === 0x2f
    || code === 0x3d
    || code === 0x3e;
}

function requiredSourceLocation(location: SourceLocationLike): BrowserTemplateSourceLocation {
  return new BrowserTemplateSourceLocation(
    location.startLine,
    location.startCol,
    location.startOffset,
    location.endLine,
    location.endCol,
    location.endOffset,
  );
}

function sourceLocation(
  location: SourceLocationLike | null | undefined,
): BrowserTemplateSourceLocation | null {
  return location == null ? null : requiredSourceLocation(location);
}

interface SourceLocationLike {
  readonly startLine: number;
  readonly startCol: number;
  readonly startOffset: number;
  readonly endLine: number;
  readonly endCol: number;
  readonly endOffset: number;
}

function namespaceKind(namespaceUri: html.NS): HtmlNamespaceKind {
  switch (namespaceUri) {
    case html.NS.HTML:
      return HtmlNamespaceKind.Html;
    case html.NS.SVG:
      return HtmlNamespaceKind.Svg;
    case html.NS.MATHML:
      return HtmlNamespaceKind.Math;
    default:
      return HtmlNamespaceKind.Unknown;
  }
}
