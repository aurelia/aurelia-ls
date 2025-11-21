import type { DOMNode, TemplateNode, NodeId } from "../../model/ir.js";
import type { P5Element, P5Node, P5Template } from "./lower-shared.js";
import { NodeIdGen, isComment, isElement, isText, toSpan } from "./lower-shared.js";

export function buildDomRoot(
  rootLike: { childNodes?: P5Node[] },
  ids: NodeIdGen,
  idMap?: WeakMap<P5Node, NodeId>,
  file?: string
): TemplateNode {
  return {
    kind: "template",
    id: "0" as NodeId,
    ns: "html",
    attrs: [],
    children: buildDomChildren(rootLike, ids, idMap, file),
    loc: null,
  };
}

export function buildDomChildren(
  p: { childNodes?: P5Node[] },
  ids: NodeIdGen,
  idMap?: WeakMap<P5Node, NodeId>,
  file?: string
): DOMNode[] {
  const out: DOMNode[] = [];
  const kids = p.childNodes ?? [];
  let elIdx = 0;
  let textIdx = 0;
  let commentIdx = 0;

  for (const n of kids) {
    if (isElement(n)) {
      const id = ids.pushElement(elIdx++) as NodeId;
      idMap?.set(n, id);

      if (n.nodeName === "template") {
        const t = n as P5Template;
        out.push({
          kind: "template",
          id,
          ns: toNs(n),
          attrs: mapStaticAttrs(n),
          children: buildDomChildren(t.content, ids, idMap, file),
          loc: toSpan(n.sourceCodeLocation, file),
        });
      } else {
        out.push({
          kind: "element",
          id,
          ns: toNs(n),
          tag: n.nodeName.toLowerCase(),
          attrs: mapStaticAttrs(n),
          children: buildDomChildren(n, ids, idMap, file),
          selfClosed: false,
          loc: toSpan(n.sourceCodeLocation, file),
        });
      }
      ids.pop();
      continue;
    }

    if (isText(n)) {
      const id = `${ids.current()}#text@${textIdx++}` as NodeId;
      idMap?.set(n, id);
      out.push({
        kind: "text",
        id,
        ns: "html",
        text: n.value ?? "",
        loc: toSpan(n.sourceCodeLocation, file),
      });
      continue;
    }

    if (isComment(n)) {
      const id = `${ids.current()}#comment@${commentIdx++}` as NodeId;
      idMap?.set(n, id);
      out.push({
        kind: "comment",
        id,
        ns: "html",
        text: n.data ?? "",
        loc: toSpan(n.sourceCodeLocation, file),
      });
      continue;
    }
  }
  return out;
}

function toNs(_el: P5Element): "html" | "svg" | "mathml" {
  return "html";
}

function mapStaticAttrs(
  el: P5Element
): { name: string; value: string | null; caseSensitive?: boolean }[] {
  const out: { name: string; value: string | null; caseSensitive?: boolean }[] = [];
  for (const a of el.attrs ?? []) out.push({ name: a.name, value: a.value ?? null });
  return out;
}
