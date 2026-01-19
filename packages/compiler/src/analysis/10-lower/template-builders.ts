import type { AttributeParser } from "../../parsing/attribute-parser.js";
import type { ResourceCatalog } from "../../language/registry.js";
import type {
  HydrateTemplateControllerIR,
  InstructionRow,
  TemplateIR,
  TemplateNode,
  NodeId,
  TemplateId,
  TemplateOrigin,
} from "../../model/ir.js";
import type { TemplateIdAllocator } from "../../model/identity.js";
import { buildDomChildren } from "./dom-builder.js";
import { isControllerAttr } from "./element-lowering.js";
import { resolveElementDef } from "./resource-utils.js";
import type {
  ExprTable,
  P5Element,
  P5Node,
  P5Template,
  ProjectionDef,
  ProjectionMap,
} from "./lower-shared.js";
import { DomIdAllocator, findAttr, isElement, isText } from "./lower-shared.js";

export type RowCollector = (
  rootLike: { childNodes?: P5Node[] },
  ids: DomIdAllocator,
  attrParser: AttributeParser,
  table: ExprTable,
  nestedTemplates: TemplateIR[],
  rows: InstructionRow[],
  catalog: ResourceCatalog,
  ctx: TemplateBuildContext,
  skipTags?: Set<string>,
  projectionMap?: ProjectionMap,
) => void;

export type TemplateBuildContext = {
  templateId: TemplateId;
  templateIds: TemplateIdAllocator;
};

const DEFAULT_SLOT_NAME = "default";

export function buildProjectionMap(
  rootLike: { childNodes?: P5Node[] },
  attrParser: AttributeParser,
  table: ExprTable,
  nestedTemplates: TemplateIR[],
  catalog: ResourceCatalog,
  collectRows: RowCollector,
  ctx: TemplateBuildContext,
  skipTags?: Set<string>,
): ProjectionMap {
  const projectionMap: ProjectionMap = new WeakMap();
  extractProjections(
    rootLike,
    attrParser,
    table,
    nestedTemplates,
    catalog,
    collectRows,
    ctx,
    projectionMap,
    skipTags,
  );
  return projectionMap;
}

export function templateOfElementChildren(
  el: P5Element,
  attrParser: AttributeParser,
  table: ExprTable,
  nestedTemplates: TemplateIR[],
  catalog: ResourceCatalog,
  collectRows: RowCollector,
  ctx: TemplateBuildContext,
  origin?: TemplateOrigin,
): TemplateIR {
  const ids = new DomIdAllocator();
  const idMap = new WeakMap<P5Node, NodeId>();
  const host = stripControllerAttrsFromElement(el, attrParser, catalog);
  const syntheticRoot: { childNodes: P5Node[] } = { childNodes: [host as P5Node] };
  return buildTemplateFrom(
    syntheticRoot,
    ids,
    idMap,
    attrParser,
    table,
    nestedTemplates,
    catalog,
    collectRows,
    ctx,
    origin,
  );
}

export function templateOfElementChildrenWithMap(
  el: P5Element,
  attrParser: AttributeParser,
  table: ExprTable,
  nestedTemplates: TemplateIR[],
  catalog: ResourceCatalog,
  collectRows: RowCollector,
  ctx: TemplateBuildContext,
  origin?: TemplateOrigin,
): { def: TemplateIR; idMap: WeakMap<P5Node, NodeId> } {
  const ids = new DomIdAllocator();
  const idMap = new WeakMap<P5Node, NodeId>();
  const host = stripControllerAttrsFromElement(el, attrParser, catalog);
  const syntheticRoot: { childNodes: P5Node[] } = { childNodes: [host as P5Node] };

  const def = buildTemplateFrom(
    syntheticRoot,
    ids,
    idMap,
    attrParser,
    table,
    nestedTemplates,
    catalog,
    collectRows,
    ctx,
    origin,
  );
  return { def, idMap };
}

export function stripControllerAttrsFromElement(
  el: P5Element,
  attrParser: AttributeParser,
  catalog: ResourceCatalog
): P5Element {
  const filteredAttrs = (el.attrs ?? []).filter(
    (a) => !isControllerAttr(attrParser.parse(a.name, a.value ?? ""), catalog)
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
  catalog: ResourceCatalog,
  collectRows: RowCollector,
  ctx: TemplateBuildContext,
  origin?: TemplateOrigin,
): TemplateIR {
  const ids = new DomIdAllocator();
  return buildTemplateFrom(
    t.content,
    ids,
    undefined,
    attrParser,
    table,
    nestedTemplates,
    catalog,
    collectRows,
    ctx,
    origin,
  );
}

export function makeWrapperTemplate(
  inner: HydrateTemplateControllerIR,
  nestedTemplates: TemplateIR[],
  ctx: TemplateBuildContext,
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
  const t: TemplateIR = { id: ctx.templateIds.allocate(), dom, rows };
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
  catalog: ResourceCatalog,
  collectRows: RowCollector,
  ctx: TemplateBuildContext,
  origin?: TemplateOrigin,
): TemplateIR {
  const templateId = ctx.templateIds.allocate();
  const templateCtx: TemplateBuildContext = { templateId, templateIds: ctx.templateIds };

  const projectionMap = buildProjectionMap(
    rootLike as { childNodes?: P5Node[] },
    attrParser,
    table,
    nestedTemplates,
    catalog,
    collectRows,
    templateCtx,
  );
  const dom: TemplateNode = {
    kind: "template",
    id: ids.current(),
    ns: "html",
    attrs: [],
    children: buildDomChildren(
      rootLike as { childNodes?: P5Node[] },
      ids,
      table.source,
      table.sourceText,
      idMap,
      undefined,
      projectionMap,
    ),
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
    catalog,
    templateCtx,
    undefined,
    projectionMap,
  );
  const t: TemplateIR = { id: templateId, dom, rows, ...(origin ? { origin } : {}) };
  nestedTemplates.push(t);
  return t;
}

function extractProjections(
  rootLike: { childNodes?: P5Node[] },
  attrParser: AttributeParser,
  table: ExprTable,
  nestedTemplates: TemplateIR[],
  catalog: ResourceCatalog,
  collectRows: RowCollector,
  ctx: TemplateBuildContext,
  projectionMap: ProjectionMap,
  skipTags?: Set<string>,
): void {
  const kids = rootLike.childNodes ?? [];
  for (const kid of kids) {
    if (!isElement(kid)) continue;

    const tag = kid.nodeName.toLowerCase();
    if (skipTags?.has(tag)) {
      extractProjections(
        kid,
        attrParser,
        table,
        nestedTemplates,
        catalog,
        collectRows,
        ctx,
        projectionMap,
        skipTags,
      );
      continue;
    }

    const projections = extractElementProjections(
      kid,
      attrParser,
      table,
      nestedTemplates,
      catalog,
      collectRows,
      ctx,
    );
    if (projections && projections.length > 0) {
      projectionMap.set(kid, projections);
    }

    const childRoot = kid.nodeName === "template"
      ? (kid as P5Template).content
      : kid;
    extractProjections(
      childRoot,
      attrParser,
      table,
      nestedTemplates,
      catalog,
      collectRows,
      ctx,
      projectionMap,
      skipTags,
    );
  }
}

function extractElementProjections(
  el: P5Element,
  attrParser: AttributeParser,
  table: ExprTable,
  nestedTemplates: TemplateIR[],
  catalog: ResourceCatalog,
  collectRows: RowCollector,
  ctx: TemplateBuildContext,
): ProjectionDef[] | null {
  const authoredTag = el.nodeName.toLowerCase();
  const asElement = findAttr(el, "as-element");
  const effectiveTag = (asElement?.value ?? authoredTag).toLowerCase();
  const elementDef = resolveElementDef(effectiveTag, catalog);
  if (!elementDef) return null;

  const isShadowDom = elementDef.shadowOptions != null;
  const children = el.childNodes ?? [];
  const slotMap = new Map<string, P5Node[]>();
  const kept: P5Node[] = [];

  for (const child of children) {
    let slotName: string | null = null;
    if (isElement(child)) {
      const slotAttr = findAttr(child, "au-slot");
      if (slotAttr) {
        slotName = (slotAttr.value ?? "").trim() || DEFAULT_SLOT_NAME;
        child.attrs = (child.attrs ?? []).filter((attr) => attr.name !== "au-slot");
      }
    }

    const isProjected = slotName !== null || (!isShadowDom);
    if (!isProjected) {
      kept.push(child);
      continue;
    }

    if (slotName === null) slotName = DEFAULT_SLOT_NAME;

    if (isText(child) && child.value?.trim() === "") {
      continue;
    }

    const list = slotMap.get(slotName) ?? [];
    list.push(child);
    slotMap.set(slotName, list);
  }

  if (slotMap.size === 0) return null;

  el.childNodes = kept;

  const defs: ProjectionDef[] = [];
  for (const [slotName, nodes] of slotMap.entries()) {
    const normalizedNodes: P5Node[] = [];
    for (const node of nodes) {
      if (isElement(node) && node.nodeName === "template") {
        const templateNode = node as P5Template;
        const attrs = templateNode.attrs ?? [];
        if (attrs.length === 0) {
          normalizedNodes.push(...(templateNode.content.childNodes ?? []));
          continue;
        }
      }
      normalizedNodes.push(node);
    }

    const ids = new DomIdAllocator();
    const def = buildTemplateFrom(
      { childNodes: normalizedNodes },
      ids,
      undefined,
      attrParser,
      table,
      nestedTemplates,
      catalog,
      collectRows,
      ctx,
    );
    defs.push({ slot: slotName, def });
  }

  return defs;
}
