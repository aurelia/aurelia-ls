import { htmlAsciiLowercase } from './html-ascii.js';
import { HtmlElement, HtmlIrNodeKind, HtmlNamespaceKind, type HtmlIrNode } from './html-ir.js';
import type { HtmlParseEmission, ParsedHtmlNodeDraft } from './html-parse-materializer.js';

export function compilerRootTemplateElement(html: HtmlParseEmission): HtmlElement | null {
  const nodesByProduct = new Map(html.nodes.map((node) => [node.productHandle, node]));
  const rootNodes = html.document.rootNodes
    .map((root) => root.productHandle == null ? null : nodesByProduct.get(root.productHandle) ?? null)
    .filter((node) => node != null);
  const selected = authoredRootTemplateElement(rootNodes);
  return selected instanceof HtmlElement ? selected : null;
}

/** Apply TemplateElementFactory's string-input rule to the authored markup nodes. */
export function authoredRootTemplateElement<T extends HtmlIrNode | ParsedHtmlNodeDraft>(roots: readonly T[]): T | null {
  // A browser ignores doctype declarations while parsing an HTML fragment. Comments remain siblings.
  const nodes = roots.filter((node) => node.nodeKind !== HtmlIrNodeKind.Doctype);
  const index = nodes.findIndex((node) => node.nodeKind === HtmlIrNodeKind.Element);
  const element = nodes[index];
  if (element?.nodeKind !== HtmlIrNodeKind.Element || element.namespace !== HtmlNamespaceKind.Html
    || htmlAsciiLowercase(element.tagName ?? '') !== 'template'
    || nodes.slice(index + 1).some((node) => node.nodeKind === HtmlIrNodeKind.Element)) {
    return null;
  }
  // The framework checks an immediately preceding text sibling first, otherwise the following one.
  const previous = nodes[index - 1];
  const sibling = previous?.nodeKind === HtmlIrNodeKind.Text ? previous : nodes[index + 1];
  return sibling?.nodeKind === HtmlIrNodeKind.Text && sibling.text?.trim() ? null : element;
}
