import type { DOMNode, TemplateNode, NodeId } from "../../model/ir.js";
import type { P5Element, P5Node, P5Template, ProjectionMap } from "./lower-shared.js";
import type { DomIdAllocator } from "./lower-shared.js";
import { isComment, isElement, isText, toSpan } from "./lower-shared.js";
import type { SourceFile } from "../../model/source.js";

/** Meta element tags to skip during DOM building */
export const META_ELEMENT_TAGS = new Set([
  "import",
  "require",
  "bindable",
  "use-shadow-dom",
  "containerless",
  "capture",
  "alias",
]);

export function buildDomRoot(
  rootLike: { childNodes?: P5Node[] },
  ids: DomIdAllocator,
  file: SourceFile,
  idMap?: WeakMap<P5Node, NodeId>,
  skipTags?: Set<string>,
  projectionMap?: ProjectionMap,
): TemplateNode {
  return {
    kind: "template",
    id: ids.current(),
    ns: "html",
    attrs: [],
    children: buildDomChildren(rootLike, ids, file, idMap, skipTags, projectionMap),
    loc: null,
  };
}

export function buildDomChildren(
  p: { childNodes?: P5Node[] },
  ids: DomIdAllocator,
  file: SourceFile,
  idMap?: WeakMap<P5Node, NodeId>,
  skipTags?: Set<string>,
  projectionMap?: ProjectionMap,
): DOMNode[] {
  return ids.withinChildren(() => {
    const out: DOMNode[] = [];
    const kids = p.childNodes ?? [];

    for (const n of kids) {
      if (isElement(n)) {
        const tag = n.nodeName.toLowerCase();

        // Skip meta elements (they're extracted separately)
        // But adopt their children - parse5 may have nested content inside them
        if (skipTags?.has(tag)) {
          // Recursively process children and add to output
          out.push(...buildDomChildren(n, ids, file, idMap, skipTags, projectionMap));
          continue;
        }

        const id = ids.nextElement();
        idMap?.set(n, id);

        if (n.nodeName === "template") {
          const t = n as P5Template;
          out.push({
            kind: "template",
            id,
            ns: toNs(n),
            attrs: mapStaticAttrs(n),
            children: buildDomChildren(t.content, ids, file, idMap, skipTags, projectionMap),
            loc: toSpan(n.sourceCodeLocation, file),
          });
        } else {
          out.push({
            kind: "element",
            id,
            ns: toNs(n),
            tag,
            attrs: mapStaticAttrs(n),
            children: projectionMap?.has(n)
              ? []
              : buildDomChildren(n, ids, file, idMap, skipTags, projectionMap),
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
