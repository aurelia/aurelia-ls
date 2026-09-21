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
  BrowserTemplateDraftNodeKind,
  BrowserTemplateElementDraft,
  BrowserTemplateFragmentDraft,
  BrowserTemplateParseIssue,
  BrowserTemplateSourceLocation,
  BrowserTemplateTextDraft,
  type BrowserTemplateDraftPathSegment,
  type BrowserTemplateContextualParseResult,
  type BrowserTemplateElementContext,
  type BrowserTemplateFragmentContext,
  type BrowserTemplateNodeDraft,
  type BrowserTemplateStructureAttribute,
  type BrowserTemplateStructureNode,
} from './browser-template-draft.js';
import { HtmlNamespaceKind } from './html-ir.js';
import { isHtmlVoidElement } from './html-elements.js';

export const BROWSER_TEMPLATE_DRAFT_PARSE5_VERSION = '8.0.1' as const;
const htmlNamespaceUri: string = html.NS.HTML;
const mathNamespaceUri: string = html.NS.MATHML;

const parse5Authority = new BrowserTemplateDraftAuthority(
  'parse5',
  BROWSER_TEMPLATE_DRAFT_PARSE5_VERSION,
  'html-template-fragment',
  false,
);

/** Parse one `HTMLTemplateElement.innerHTML` candidate through the pinned parse5 profile. */
export function parseBrowserTemplateFragmentDraft(markup: string): BrowserTemplateDraftResult<typeof parse5Authority> {
  const context = defaultTreeAdapter.createElement('template', html.NS.HTML, []);
  return parseFragmentDraft(markup, context, parse5Authority);
}

/**
 * Parse evaluated hook markup in its current DOM context. Draft locations refer to this string, never authored HTML.
 * The caller owns native-effect admission and supplies actual ancestry, including ancestors outside a hook's scope.
 */
export function parseBrowserTemplateContextualFragmentDraft(
  markup: string,
  request: BrowserTemplateFragmentContext,
): BrowserTemplateContextualParseResult {
  const descriptor = request.element;
  const isHtml = descriptor.namespaceUri === htmlNamespaceUri;
  const scriptingEnabled = isHtml && descriptor.tagName === 'template' ? false : request.scriptingEnabled;
  if (isForeignFormContext(descriptor) || request.ancestors.some(isForeignFormContext)) {
    return {
      kind: 'unsupported', reason: 'foreign-form-context',
      summary: 'Pinned parse5 treats a foreign-namespace form context as an HTML form ancestor.',
    };
  }
  if (isHtml && descriptor.tagName === 'noscript' && !scriptingEnabled) {
    return {
      kind: 'unsupported', reason: 'inert-noscript-context',
      summary: 'Pinned parse5 parses an inert noscript fragment as raw text where the browser parses markup.',
    };
  }
  if (descriptor.namespaceUri === mathNamespaceUri && descriptor.tagName === 'annotation-xml') {
    return {
      kind: 'unsupported', reason: 'mathml-integration-context',
      summary: 'MathML annotation-xml fragment integration has an unresolved pinned-parser/browser namespace difference.',
    };
  }
  if (isHtml && descriptor.tagName === 'select') return customizableSelectRefusal();
  const context = parserContextElement(descriptor);
  let descendant = context;
  for (const ancestor of request.ancestors) {
    const parent = parserContextElement(ancestor);
    defaultTreeAdapter.appendChild(parent, descendant);
    descendant = parent;
  }
  const draft = parseFragmentDraft(markup, context, new BrowserTemplateDraftAuthority(
    'parse5', BROWSER_TEMPLATE_DRAFT_PARSE5_VERSION, 'html-contextual-fragment', scriptingEnabled,
  ));
  // Refuse the select itself, not only surviving children: its discarded tokens are precisely the parser-version gap.
  const pending = [...draft.fragment.children];
  while (pending.length > 0) {
    const node = pending.pop()!;
    if (node.nodeKind !== BrowserTemplateDraftNodeKind.Element) continue;
    if (node.namespace === HtmlNamespaceKind.Html && node.tagName === 'select') return customizableSelectRefusal();
    pending.push(...node.children, ...(node.templateContent?.children ?? []));
  }
  return { kind: 'parsed', draft };
}

function customizableSelectRefusal(): BrowserTemplateContextualParseResult {
  return {
    kind: 'unsupported', reason: 'customizable-select-profile',
    summary: 'Select fragment parsing requires a current customizable-select profile, not pinned parse5 recovery.',
  };
}

function isForeignFormContext(element: BrowserTemplateElementContext): boolean {
  return element.tagName === 'form' && element.namespaceUri !== htmlNamespaceUri;
}

function parserContextElement(descriptor: BrowserTemplateElementContext): DefaultTreeAdapterTypes.Element {
  return defaultTreeAdapter.createElement(descriptor.tagName, descriptor.namespaceUri as html.NS,
    descriptor.attributes.map(attribute => ({
      name: attribute.name, value: attribute.value,
      ...(attribute.namespaceUri == null ? {} : { namespace: attribute.namespaceUri }),
      ...(attribute.prefix == null ? {} : { prefix: attribute.prefix }),
    })));
}

/**
 * Current-state HTML innerHTML serialization, including the May 2025 attribute angle-bracket escaping rule.
 * Callers supply a template root's content children and synthesize a missing creation-time is attribute in this view.
 * A document resolver is needed when nested template content has different scripting state from the root document.
 */
export function serializeBrowserTemplateInnerHtml(
  context: BrowserTemplateElementContext,
  children: readonly BrowserTemplateStructureNode[],
  scriptingEnabled: boolean | ((element: BrowserTemplateElementContext) => boolean),
): string {
  if (context.namespaceUri === htmlNamespaceUri && isSerializedHtmlVoidElement(context.tagName)) return '';
  return children.map(child => serializeStructureNode(child, context, scriptingEnabled)).join('');
}

function serializeStructureNode(
  node: BrowserTemplateStructureNode,
  parent: BrowserTemplateElementContext | null,
  scriptingEnabled: boolean | ((element: BrowserTemplateElementContext) => boolean),
): string {
  switch (node.kind) {
    case 'text': {
      const unescaped = parent != null && parent.namespaceUri === htmlNamespaceUri
        && html.hasUnescapedText(parent.tagName,
          typeof scriptingEnabled === 'boolean' ? scriptingEnabled : scriptingEnabled(parent));
      return unescaped ? node.value : escapeHtmlString(node.value, false);
    }
    case 'comment': return `<!--${node.value}-->`;
    case 'doctype': return `<!DOCTYPE ${node.name}>`;
    case 'element': {
      let result = `<${node.tagName}`;
      for (const attribute of node.attributes) {
        result += ` ${serializedAttributeName(attribute)}="${escapeHtmlString(attribute.value, true)}"`;
      }
      result += '>';
      if (node.namespaceUri === htmlNamespaceUri && isSerializedHtmlVoidElement(node.tagName)) return result;
      const template = node.namespaceUri === htmlNamespaceUri && node.tagName === 'template';
      for (const child of template ? node.content ?? [] : node.children) {
        result += serializeStructureNode(child, template ? null : node, scriptingEnabled);
      }
      return `${result}</${node.tagName}>`;
    }
  }
}

function isSerializedHtmlVoidElement(tagName: string): boolean {
  // Historical void names remain special to HTML serialization, including nodes created through DOM factories.
  return isHtmlVoidElement(tagName) || tagName === 'basefont' || tagName === 'bgsound'
    || tagName === 'frame' || tagName === 'keygen';
}

function serializedAttributeName(attribute: BrowserTemplateStructureAttribute): string {
  switch (attribute.namespaceUri) {
    case html.NS.XML: return `xml:${attribute.name}`;
    case html.NS.XMLNS: return attribute.name === 'xmlns' ? 'xmlns' : `xmlns:${attribute.name}`;
    case html.NS.XLINK: return `xlink:${attribute.name}`;
    default: return attribute.prefix == null ? attribute.name : `${attribute.prefix}:${attribute.name}`;
  }
}

function escapeHtmlString(value: string, attribute: boolean): string {
  return value.replace(attribute ? /[&<>"\u00a0]/g : /[&<>\u00a0]/g, character => {
    switch (character) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&nbsp;';
    }
  });
}

function parseFragmentDraft<Authority extends BrowserTemplateDraftAuthority>(
  markup: string,
  context: DefaultTreeAdapterTypes.Element,
  authority: Authority,
): BrowserTemplateDraftResult<Authority> {
  const errors: ParserError[] = [];
  const parsed = parseFragment(context, markup, {
    scriptingEnabled: authority.scriptingEnabled,
    sourceCodeLocationInfo: true,
    onParseError: (error) => { errors.push(error); },
  });
  const fragment = materializeFragment(parsed, markup, []);
  return new BrowserTemplateDraftResult(
    authority,
    markup,
    fragment,
    serialize(parsed, { scriptingEnabled: authority.scriptingEnabled }),
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
