import type { DOMNode, TemplateNode, NodeId, SourceSpan } from "../../model/ir.js";
import type { P5Element, P5Node, P5Template, ProjectionMap } from "./lower-shared.js";
import type { DomIdAllocator } from "./lower-shared.js";
import { attrLoc, attrNameLoc, attrValueLoc, isComment, isElement, isText, toSpan } from "./lower-shared.js";
import type { SourceFile } from "../../model/source.js";
import { spanFromOffsets } from "../../model/source.js";

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
  sourceText: string,
  idMap?: WeakMap<P5Node, NodeId>,
  skipTags?: Set<string>,
  projectionMap?: ProjectionMap,
): TemplateNode {
  return {
    kind: "template",
    id: ids.current(),
    ns: "html",
    attrs: [],
    children: buildDomChildren(rootLike, ids, file, sourceText, idMap, skipTags, projectionMap),
    loc: null,
  };
}

export function buildDomChildren(
  p: { childNodes?: P5Node[] },
  ids: DomIdAllocator,
  file: SourceFile,
  sourceText: string,
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
          out.push(...buildDomChildren(n, ids, file, sourceText, idMap, skipTags, projectionMap));
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
            attrs: mapStaticAttrs(n, file, sourceText),
            children: buildDomChildren(t.content, ids, file, sourceText, idMap, skipTags, projectionMap),
            loc: toSpan(n.sourceCodeLocation, file),
            tagLoc: tagNameSpan(n, file, sourceText, false),
            closeTagLoc: tagNameSpan(n, file, sourceText, true),
            openTagEnd: openTagEndSpan(n, file),
          });
        } else {
          out.push({
            kind: "element",
            id,
            ns: toNs(n),
            tag,
            attrs: mapStaticAttrs(n, file, sourceText),
            children: projectionMap?.has(n)
              ? []
              : buildDomChildren(n, ids, file, sourceText, idMap, skipTags, projectionMap),
            selfClosed: false,
            loc: toSpan(n.sourceCodeLocation, file),
            tagLoc: tagNameSpan(n, file, sourceText, false),
            closeTagLoc: tagNameSpan(n, file, sourceText, true),
            openTagEnd: openTagEndSpan(n, file),
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
  el: P5Element,
  source: SourceFile,
  sourceText: string,
): { name: string; value: string | null; caseSensitive?: boolean; loc?: SourceSpan | null; nameLoc?: SourceSpan | null; valueLoc?: SourceSpan | null }[] {
  const out: { name: string; value: string | null; caseSensitive?: boolean; loc?: SourceSpan | null; nameLoc?: SourceSpan | null; valueLoc?: SourceSpan | null }[] = [];
  for (const a of el.attrs ?? []) {
    const loc = attrLoc(el, a.name);
    const nameLoc = attrNameLoc(el, a.name, sourceText);
    const valueLoc = attrValueLoc(el, a.name, sourceText);
    out.push({
      name: a.name,
      value: a.value ?? null,
      loc: toSpan(loc, source),
      nameLoc: toSpan(nameLoc, source),
      valueLoc: toSpan(valueLoc, source),
    });
  }
  return out;
}

function tagNameSpan(
  el: P5Element,
  source: SourceFile,
  sourceText: string,
  isEndTag: boolean,
): SourceSpan | null {
  const loc = el.sourceCodeLocation;
  const tagLoc = isEndTag ? loc?.endTag : loc?.startTag;
  if (!tagLoc) return null;
  return tagNameSpanFromOffsets(tagLoc.startOffset, tagLoc.endOffset, sourceText, source);
}

function tagNameSpanFromOffsets(
  startOffset: number,
  endOffset: number,
  sourceText: string,
  source: SourceFile,
): SourceSpan | null {
  if (startOffset == null || endOffset == null) return null;
  const text = sourceText.slice(startOffset, endOffset);
  let i = text.indexOf("<");
  if (i === -1) i = 0;
  i += 1;
  if (text[i] === "/") i += 1;
  while (i < text.length && /\s/.test(text[i]!)) i += 1;
  const nameStart = i;
  while (i < text.length) {
    const ch = text[i]!;
    if (ch === ">" || ch === "/" || /\s/.test(ch)) break;
    i += 1;
  }
  const nameEnd = i;
  if (nameEnd <= nameStart) return null;
  return spanFromOffsets({ start: startOffset + nameStart, end: startOffset + nameEnd }, source);
}

function openTagEndSpan(el: P5Element, source: SourceFile): SourceSpan | null {
  const endOffset = el.sourceCodeLocation?.startTag?.endOffset;
  if (endOffset == null) return null;
  return spanFromOffsets({ start: endOffset, end: endOffset }, source);
}
