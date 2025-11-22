import type { AttributeParser } from "../../language/syntax.js";
import type { Semantics } from "../../language/registry.js";
import type {
  HydrateTemplateControllerIR,
  InstructionRow,
  TemplateIR,
  TemplateNode,
  NodeId,
} from "../../model/ir.js";
import { buildDomChildren } from "./dom-builder.js";
import { isControllerAttr } from "./element-lowering.js";
import type { ExprTable, P5Element, P5Node, P5Template } from "./lower-shared.js";
import { DomIdAllocator } from "./lower-shared.js";

export type RowCollector = (
  rootLike: { childNodes?: P5Node[] },
  ids: DomIdAllocator,
  attrParser: AttributeParser,
  table: ExprTable,
  nestedTemplates: TemplateIR[],
  rows: InstructionRow[],
  sem: Semantics
) => void;

export function templateOfElementChildren(
  el: P5Element,
  attrParser: AttributeParser,
  table: ExprTable,
  nestedTemplates: TemplateIR[],
  sem: Semantics,
  collectRows: RowCollector
): TemplateIR {
  const ids = new DomIdAllocator();
  const idMap = new WeakMap<P5Node, NodeId>();
  const host = stripControllerAttrsFromElement(el, attrParser, sem);
  const syntheticRoot: { childNodes: P5Node[] } = { childNodes: [host as P5Node] };
  return buildTemplateFrom(
    syntheticRoot,
    ids,
    idMap,
    attrParser,
    table,
    nestedTemplates,
    sem,
    collectRows
  );
}

export function templateOfElementChildrenWithMap(
  el: P5Element,
  attrParser: AttributeParser,
  table: ExprTable,
  nestedTemplates: TemplateIR[],
  sem: Semantics,
  collectRows: RowCollector
): { def: TemplateIR; idMap: WeakMap<P5Node, NodeId> } {
  const ids = new DomIdAllocator();
  const idMap = new WeakMap<P5Node, NodeId>();
  const host = stripControllerAttrsFromElement(el, attrParser, sem);
  const syntheticRoot: { childNodes: P5Node[] } = { childNodes: [host as P5Node] };

  const def = buildTemplateFrom(
    syntheticRoot,
    ids,
    idMap,
    attrParser,
    table,
    nestedTemplates,
    sem,
    collectRows
  );
  return { def, idMap };
}

export function stripControllerAttrsFromElement(
  el: P5Element,
  attrParser: AttributeParser,
  sem: Semantics
): P5Element {
  const filteredAttrs = (el.attrs ?? []).filter(
    (a) => !isControllerAttr(attrParser.parse(a.name, a.value ?? ""), sem)
  );

  if (el.nodeName.toLowerCase() === "template") {
    const t = el as P5Template;
    const clone: Partial<P5Template> = {
      nodeName: el.nodeName as "template",
      tagName: (el.tagName ?? el.nodeName) as "template",
      attrs: filteredAttrs,
      content: t.content,
      sourceCodeLocation: el.sourceCodeLocation!,
    };
    return clone as P5Element;
  }

  const clone: Partial<P5Element> = {
    nodeName: el.nodeName,
    tagName: el.tagName ?? el.nodeName,
    attrs: filteredAttrs,
    childNodes: el.childNodes ?? [],
    sourceCodeLocation: el.sourceCodeLocation!,
  };
  return clone as P5Element;
}

export function templateOfTemplateContent(
  t: P5Template,
  attrParser: AttributeParser,
  table: ExprTable,
  nestedTemplates: TemplateIR[],
  sem: Semantics,
  collectRows: RowCollector
): TemplateIR {
  const ids = new DomIdAllocator();
  return buildTemplateFrom(
    t.content,
    ids,
    undefined,
    attrParser,
    table,
    nestedTemplates,
    sem,
    collectRows
  );
}

export function makeWrapperTemplate(
  inner: HydrateTemplateControllerIR,
  nestedTemplates: TemplateIR[]
): TemplateIR {
  const ids = new DomIdAllocator();
  const commentId = ids.withinChildren(() => ids.nextComment());
  const dom: TemplateNode = {
    kind: "template",
    id: ids.current(),
    ns: "html",
    attrs: [],
    children: [{ kind: "comment", id: commentId, ns: "html", text: "", loc: null }],
    loc: null,
  };
  const rows: InstructionRow[] = [
    {
      target: commentId,
      instructions: [inner],
    },
  ];
  const t: TemplateIR = { dom, rows };
  nestedTemplates.push(t);
  return t;
}

export function buildTemplateFrom(
  rootLike: { childNodes?: P5Node[] } | P5Template["content"],
  ids: DomIdAllocator,
  idMap: WeakMap<P5Node, NodeId> | undefined,
  attrParser: AttributeParser,
  table: ExprTable,
  nestedTemplates: TemplateIR[],
  sem: Semantics,
  collectRows: RowCollector
): TemplateIR {
  const dom: TemplateNode = {
    kind: "template",
    id: ids.current(),
    ns: "html",
    attrs: [],
    children: buildDomChildren(rootLike as { childNodes?: P5Node[] }, ids, table.source, idMap),
    loc: null,
  };
  const rows: InstructionRow[] = [];
  collectRows(
    rootLike as { childNodes?: P5Node[] },
    ids,
    attrParser,
    table,
    nestedTemplates,
    rows,
    sem
  );
  const t: TemplateIR = { dom, rows };
  nestedTemplates.push(t);
  return t;
}
