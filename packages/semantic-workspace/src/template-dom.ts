import type { NodeId } from "@aurelia-ls/compiler/model/identity.js";
import type {
  Attr,
  DOMNode,
  ElementNode,
  TemplateIR,
  TemplateNode,
} from "@aurelia-ls/compiler/model/ir.js";
import type { SourceSpan } from "@aurelia-ls/compiler/model/span.js";
import { spanContainsOffset, spanLength } from "@aurelia-ls/compiler/model/span.js";
export type DomIndex = Map<string, DOMNode>;

export function domKey(templateIndex: number, nodeId: NodeId): string {
  return `${templateIndex}:${nodeId}`;
}

export function buildDomIndex(templates: readonly TemplateIR[]): DomIndex {
  const index = new Map<string, DOMNode>();
  for (let ti = 0; ti < templates.length; ti += 1) {
    const template = templates[ti];
    if (!template) continue;
    const stack: DOMNode[] = [template.dom];
    while (stack.length) {
      const node = stack.pop()!;
      index.set(domKey(ti, node.id), node);
      if (node.kind === "element" || node.kind === "template") {
        for (let i = node.children.length - 1; i >= 0; i -= 1) {
          stack.push(node.children[i]!);
        }
      }
    }
  }
  return index;
}

export function findDomNode(index: DomIndex, templateIndex: number, nodeId: NodeId): DOMNode | null {
  return index.get(domKey(templateIndex, nodeId)) ?? null;
}

export function findAttrForSpan(node: ElementNode | TemplateNode, loc: SourceSpan): Attr | null {
  let best: Attr | null = null;
  let bestLen = Number.POSITIVE_INFINITY;
  for (const attr of node.attrs ?? []) {
    const span = attr.loc ?? null;
    if (!span) continue;
    if (!spanContainsOffset(span, loc.start)) continue;
    const len = spanLength(span);
    if (len < bestLen) {
      bestLen = len;
      best = attr;
    }
  }
  return best;
}

export function elementTagSpanAtOffset(node: ElementNode, offset: number): SourceSpan | null {
  if (node.tagLoc && spanContainsOffset(node.tagLoc, offset)) return node.tagLoc;
  if (node.closeTagLoc && spanContainsOffset(node.closeTagLoc, offset)) return node.closeTagLoc;
  return null;
}

export function elementTagSpans(node: ElementNode): SourceSpan[] {
  const spans: SourceSpan[] = [];
  if (node.tagLoc) spans.push(node.tagLoc);
  if (node.closeTagLoc) spans.push(node.closeTagLoc);
  return spans;
}
