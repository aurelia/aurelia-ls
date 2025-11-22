import type { DOMNode, TemplateNode, NodeId } from "../../model/ir.js";
import type { P5Element, P5Node, P5Template } from "./lower-shared.js";
import { DomIdAllocator, isComment, isElement, isText, toSpan } from "./lower-shared.js";
import type { SourceFile } from "../../model/source.js";

export function buildDomRoot(
  rootLike: { childNodes?: P5Node[] },
  ids: DomIdAllocator,
  file: SourceFile,
  idMap?: WeakMap<P5Node, NodeId>,
): TemplateNode {
  return {
    kind: "template",
    id: ids.current(),
    ns: "html",
    attrs: [],
    children: buildDomChildren(rootLike, ids, file, idMap),
    loc: null,
  };
}

export function buildDomChildren(
  p: { childNodes?: P5Node[] },
  ids: DomIdAllocator,
  file: SourceFile,
  idMap?: WeakMap<P5Node, NodeId>,
): DOMNode[] {
  return ids.withinChildren(() => {
    const out: DOMNode[] = [];
    const kids = p.childNodes ?? [];

    for (const n of kids) {
      if (isElement(n)) {
        const id = ids.nextElement();
        idMap?.set(n, id);

        if (n.nodeName === "template") {
          const t = n as P5Template;
          out.push({
            kind: "template",
            id,
            ns: toNs(n),
            attrs: mapStaticAttrs(n),
            children: buildDomChildren(t.content, ids, file, idMap),
            loc: toSpan(n.sourceCodeLocation, file),
          });
        } else {
          out.push({
            kind: "element",
            id,
            ns: toNs(n),
            tag: n.nodeName.toLowerCase(),
            attrs: mapStaticAttrs(n),
            children: buildDomChildren(n, ids, file, idMap),
            selfClosed: false,
            loc: toSpan(n.sourceCodeLocation, file),
          });
        }
        ids.exitElement();
        continue;
      }

      if (isText(n)) {
        const id = ids.nextText();
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
        const id = ids.nextComment();
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
  });
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
