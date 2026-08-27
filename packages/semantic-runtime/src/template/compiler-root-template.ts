import { HtmlElement, HtmlText } from './html-ir.js';
import type { HtmlParseEmission } from './html-parse-materializer.js';

/** Existing authored-front-door root-template carrier predicate; browser carrier selection may later disagree. */
export function compilerRootTemplateElement(html: HtmlParseEmission): HtmlElement | null {
  const nodesByProduct = new Map(html.nodes.map((node) => [node.productHandle, node]));
  const rootNodes = html.document.rootNodes
    .map((root) => root.productHandle == null ? null : nodesByProduct.get(root.productHandle) ?? null)
    .filter((node): node is HtmlElement | HtmlText => node instanceof HtmlElement || node instanceof HtmlText);
  const rootElements = rootNodes.filter((node): node is HtmlElement => node instanceof HtmlElement);
  return rootNodes.every((node) => node instanceof HtmlElement || node.text.trim().length === 0)
      && rootElements.length === 1
      && rootElements[0]?.tagName.toLowerCase() === 'template'
    ? rootElements[0]
    : null;
}
