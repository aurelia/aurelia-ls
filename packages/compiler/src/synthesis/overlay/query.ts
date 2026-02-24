// Analysis imports (via barrel)
import type {
  TypecheckModule,
  LinkedAttributeBinding,
  LinkedElementBindable,
  LinkedPropertyBinding,
  LinkedRow,
  LinkModule,
  LinkedStylePropertyBinding,
  NodeSem,
  TargetSem,
} from "../../analysis/index.js";

// Language imports
import type { TypeRef } from "../../schema/registry.js";

// Model imports
import type { BindingMode, DOMNode, ExprId, IrModule, NodeId, SourceSpan, TemplateIR, TemplateId } from "../../model/ir.js";
import type { FrameId } from "../../model/symbols.js";
import { idKey } from "../../model/identity.js";
import { pickNarrowestContaining, spanContainsOffset } from "../../model/span.js";

// Local imports
import type { TemplateMappingArtifact, TemplateMappingEntry, TemplateMappingSegment } from "./mapping.js";

export interface TemplateNodeInfo {
  id: NodeId;
  kind: "element" | "attribute" | "text" | "comment";
  hostKind: "custom" | "native" | "none";
  span: SourceSpan;
  /** Tag name span for the opening tag (elements only). */
  tagLoc?: SourceSpan | null;
  templateIndex: number;
}

export interface TemplateBindableInfo {
  name: string;
  mode?: BindingMode;
  source: "component" | "custom-attribute" | "native" | "controller";
  type?: string;
}

export interface TemplateExpressionInfo {
  exprId: ExprId;
  span: SourceSpan;
  frameId?: FrameId | undefined;
  memberPath?: string;
}

export interface TemplateControllerInfo {
  /** Controller name (built-in or custom). */
  kind: "repeat" | "with" | "if" | "else" | "switch" | "case" | "default-case" | "promise" | "portal" | (string & {});
  span: SourceSpan;
}

export interface TemplateQueryFacade {
  nodeAt(htmlOffset: number): TemplateNodeInfo | null;
  bindablesFor(node: TemplateNodeInfo): TemplateBindableInfo[] | null;
  exprAt(htmlOffset: number): TemplateExpressionInfo | null;
  expectedTypeOf(expr: TemplateExpressionInfo | TemplateBindableInfo): string | null;
  controllerAt(htmlOffset: number): TemplateControllerInfo | null;
}

export function buildTemplateQuery(
  irModule: IrModule | undefined,
  linked: LinkModule,
  mapping: TemplateMappingArtifact,
  typecheck: TypecheckModule | null | undefined,
): TemplateQueryFacade {
  if (!irModule) return buildPendingQueryFacade(mapping, typecheck ?? null);
  const domIndex = indexDomAll(irModule.templates);
  const originCandidates = indexTemplateOrigins(irModule.templates, domIndex.templateIndexById, domIndex.domByTemplate);
  const rowsByTarget = indexRowsAll(linked);
  const expectedByExpr = typecheck?.expectedByExpr ?? new Map();
  const controllers = indexControllers(linked);

  return {
    nodeAt(htmlOffset) {
      const origin = pickOriginTemplateAt(originCandidates, htmlOffset);
      if (origin) {
        const originNodes = domIndex.nodesByTemplate.get(origin.templateIndex);
        const hit = originNodes ? pickNodeAt(originNodes, rowsByTarget, htmlOffset) : null;
        if (hit) return hit;
      }
      return pickNodeAt(domIndex.nodes, rowsByTarget, htmlOffset);
    },
    bindablesFor(node) {
      const row = rowsByTarget.get(rowKey(node.templateIndex, node.id));
      if (!row) return null;
      const bindables = collectBindables(row, targetTypeToString);
      return bindables.length > 0 ? bindables : null;
    },
    exprAt(htmlOffset) {
      const bestSegment = findSegmentAt(mapping.entries, htmlOffset);
      if (bestSegment) return bestSegment;
      const hit = mapping.entries.find((entry) => spanContainsOffset(entry.htmlSpan, htmlOffset));
      if (!hit) return null;
      return { exprId: hit.exprId, span: hit.htmlSpan, frameId: hit.frameId };
    },
    expectedTypeOf(exprOrBindable) {
      if ("exprId" in exprOrBindable) {
        return expectedByExpr.get(exprOrBindable.exprId) ?? null;
      }
      if ("type" in exprOrBindable) {
        return exprOrBindable.type ?? null;
      }
      return null;
    },
    controllerAt(htmlOffset) {
      const hit = pickNarrowestContaining(controllers, htmlOffset, (c) => c.span);
      return hit ? { kind: hit.kind, span: hit.span! } : null;
    },
  };
}

type NodeIndex = {
  id: NodeId;
  node: DOMNode;
  span?: SourceSpan | null;
  templateIndex: number;
  kind: "element" | "template" | "text" | "comment";
  hostKind: "custom" | "native" | "none";
};

type TemplateDomIndex = {
  nodes: NodeIndex[];
  nodesByTemplate: Map<number, NodeIndex[]>;
  domByTemplate: Map<number, Map<string, DOMNode>>;
  templateIdByIndex: TemplateId[];
  templateIndexById: Map<TemplateId, number>;
};

function indexDomAll(templates: TemplateIR[]): TemplateDomIndex {
  const nodes: NodeIndex[] = [];
  const nodesByTemplate = new Map<number, NodeIndex[]>();
  const domByTemplate = new Map<number, Map<string, DOMNode>>();
  const templateIdByIndex: TemplateId[] = [];
  const templateIndexById = new Map<TemplateId, number>();

  templates?.forEach((t, ti) => {
    const templateId = t.id;
    templateIdByIndex[ti] = templateId;
    templateIndexById.set(templateId, ti);

    const templateNodes: NodeIndex[] = [];
    const domMap = new Map<string, DOMNode>();
    const stack: DOMNode[] = [t.dom];
    while (stack.length) {
      const n = stack.pop()!;
      templateNodes.push({ id: n.id, node: n, templateIndex: ti, span: n.loc ?? null, kind: n.kind, hostKind: "none" });
      domMap.set(idKey(n.id), n);
      switch (n.kind) {
        case "element":
        case "template":
          for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]!);
          break;
        default:
          break;
      }
    }
    nodes.push(...templateNodes);
    nodesByTemplate.set(ti, templateNodes);
    domByTemplate.set(ti, domMap);
  });
  return { nodes, nodesByTemplate, domByTemplate, templateIdByIndex, templateIndexById };
}

function rowKey(templateIndex: number, id: NodeId): string {
  return `${templateIndex}:${idKey(id)}`;
}

function indexRowsAll(linked: LinkModule): Map<string, LinkedRow> {
  const map = new Map<string, LinkedRow>();
  linked.templates?.forEach((t, ti) => {
    for (const row of t.rows ?? []) map.set(rowKey(ti, row.target), row);
  });
  return map;
}

type ControllerIndex = { kind: TemplateControllerInfo["kind"]; span: SourceSpan | null };

function indexControllers(linked: LinkModule): ControllerIndex[] {
  const out: ControllerIndex[] = [];
  for (const t of linked.templates ?? []) {
    for (const row of t.rows ?? []) {
      for (const instr of row.instructions ?? []) {
        if (instr.kind !== "hydrateTemplateController") continue;
        if (!instr.loc) continue;
        out.push({ kind: instr.res, span: instr.loc });
      }
    }
  }
  return out;
}

type OriginCandidate = {
  templateIndex: number;
  hostSpan: SourceSpan;
};

function indexTemplateOrigins(
  templates: TemplateIR[],
  templateIndexById: Map<TemplateId, number>,
  domByTemplate: Map<number, Map<string, DOMNode>>,
): OriginCandidate[] {
  const out: OriginCandidate[] = [];
  for (let i = 0; i < templates.length; i += 1) {
    const template = templates[i];
    if (!template) continue;
    const origin = template.origin;
    if (origin.kind !== "controller" && origin.kind !== "branch") continue;
    const hostTemplateIndex = templateIndexById.get(origin.host.templateId);
    if (hostTemplateIndex == null) continue;
    const domMap = domByTemplate.get(hostTemplateIndex);
    const hostNode = domMap?.get(idKey(origin.host.nodeId));
    const hostSpan = hostNode?.loc ?? null;
    if (!hostSpan) continue;
    out.push({ templateIndex: i, hostSpan });
  }
  return out;
}

function pickOriginTemplateAt(candidates: OriginCandidate[], offset: number): OriginCandidate | null {
  let best: OriginCandidate | null = null;
  let bestLen = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    if (!spanContainsOffset(candidate.hostSpan, offset)) continue;
    const len = candidate.hostSpan.end - candidate.hostSpan.start;
    if (len < bestLen) {
      bestLen = len;
      best = candidate;
    }
  }
  return best;
}

function pickNodeAt(nodes: NodeIndex[], rows: Map<string, LinkedRow>, offset: number): TemplateNodeInfo | null {
  const best = pickNarrowestContaining(nodes, offset, (n) => n.span ?? null);
  if (!best || !best.span) return null;
  const mappedKind = mapNodeKind(best.kind);
  if (!mappedKind) return null;
  const row = rows.get(rowKey(best.templateIndex, best.id));
  const hostKind = row ? resolveHostKind(row.node) : mappedKind === "element" ? "native" : "none";
  const tagLoc = best.node.kind === "element" ? (best.node as { tagLoc?: SourceSpan | null }).tagLoc ?? null : null;
  return { id: best.id, kind: mappedKind, hostKind, span: best.span, tagLoc, templateIndex: best.templateIndex };
}

function mapNodeKind(k: NodeIndex["kind"]): TemplateNodeInfo["kind"] | null {
  switch (k) {
    case "element": return "element";
    case "text": return "text";
    case "comment": return "comment";
    case "template": return "element";
    default: return null;
  }
}

function resolveHostKind(node: NodeSem): "custom" | "native" | "none" {
  if (node.kind === "element") {
    if (node.custom) return "custom";
    if (node.native) return "native";
  }
  return "none";
}

function findSegmentAt(
  entries: readonly TemplateMappingEntry[],
  htmlOffset: number,
): { exprId: ExprId; span: SourceSpan; frameId?: FrameId; memberPath?: string } | null {
  let bestEntry: TemplateMappingEntry | null = null;
  let bestSegment: TemplateMappingSegment | null = null;
  let bestLen = Number.POSITIVE_INFINITY;
  for (const entry of entries) {
    for (const segment of entry.segments ?? []) {
      if (!spanContainsOffset(segment.htmlSpan, htmlOffset)) continue;
      const len = segment.htmlSpan.end - segment.htmlSpan.start;
      if (len < bestLen) {
        bestLen = len;
        bestEntry = entry;
        bestSegment = segment;
      }
    }
  }
  if (!bestEntry || !bestSegment) return null;
  const entry = bestEntry;
  const segment = bestSegment;
  const result: { exprId: ExprId; span: SourceSpan; frameId?: FrameId; memberPath?: string } = {
    exprId: entry.exprId,
    span: segment.htmlSpan,
  };
  if (entry.frameId !== undefined) result.frameId = entry.frameId;
  if (segment.path !== undefined) result.memberPath = segment.path;
  return result;
}

function collectBindables(row: LinkedRow, typeResolver: (target?: TargetSem | { kind: "style" }) => string | undefined): TemplateBindableInfo[] {
  const out: TemplateBindableInfo[] = [];
  for (const instr of row.instructions ?? []) {
    switch (instr.kind) {
      case "propertyBinding":
        out.push(addType({
          name: instr.to,
          mode: instr.effectiveMode,
          source: targetSource(instr.target),
        }, typeResolver(instr.target)));
        break;
      case "attributeBinding":
      case "stylePropertyBinding":
        out.push(addType({ name: instr.to, source: "native" }, instr.kind === "stylePropertyBinding" ? "string" : typeResolver(instr.target)));
        break;
      case "hydrateElement":
      case "hydrateAttribute":
        for (const p of instr.props ?? []) addBindableFromLinked(p);
        break;
      case "hydrateTemplateController":
        for (const p of instr.props ?? []) {
          if (p.kind === "iteratorBinding") continue;
          addBindableFromLinked(p);
        }
        break;
      default:
        break;
    }
  }
  return out;

  function addBindableFromLinked(bindable: LinkedElementBindable | LinkedPropertyBinding | LinkedAttributeBinding | LinkedStylePropertyBinding) {
    switch (bindable.kind) {
      case "propertyBinding":
        out.push(addType({ name: bindable.to, mode: bindable.effectiveMode, source: targetSource(bindable.target) }, typeResolver(bindable.target)));
        break;
      case "attributeBinding":
        out.push(addType({ name: bindable.to, source: targetSource(bindable.target) }, typeResolver(bindable.target)));
        break;
      case "stylePropertyBinding":
        out.push(addType({ name: bindable.to, source: "native" }, "string"));
        break;
      default:
        break;
    }
  }
}

function targetSource(target: TargetSem | undefined): TemplateBindableInfo["source"] {
  if (!target) return "native";
  switch (target.kind) {
    case "element.bindable": return "component";
    case "attribute.bindable": return "custom-attribute";
    case "controller.prop": return "controller";
    case "element.nativeProp": return "native";
    default: return "native";
  }
}

function targetTypeToString(target: TargetSem | { kind: "style" } | undefined): string | undefined {
  if (!target) return undefined;
  switch (target.kind) {
    case "element.bindable":
    case "attribute.bindable":
    case "controller.prop":
      return typeRefToString(target.bindable.type);
    case "element.nativeProp":
      return typeRefToString(target.prop.type);
    case "style":
      return "string";
    default:
      return undefined;
  }
}

function typeRefToString(t: TypeRef | string | undefined | null): string | undefined {
  if (!t) return undefined;
  if (typeof t === "string") return t;
  switch (t.kind) {
    case "ts": return t.name;
    case "any": return "any";
    case "unknown": return "unknown";
    default: return undefined;
  }
}

type BindableBase = Pick<TemplateBindableInfo, "name" | "source"> & Partial<Pick<TemplateBindableInfo, "mode" | "type">>;

function addType<T extends BindableBase>(base: T, type: string | undefined): T {
  if (!type) return base;
  return { ...base, type };
}

function buildPendingQueryFacade(mapping: TemplateMappingArtifact, typecheck: TypecheckModule | null): TemplateQueryFacade {
  return {
    nodeAt(_htmlOffset) { return null; },
    bindablesFor(_node) { return null; },
    exprAt(htmlOffset) {
      const hit = mapping.entries.find((entry) => spanContainsOffset(entry.htmlSpan, htmlOffset));
      if (!hit) return null;
      return { exprId: hit.exprId, span: hit.htmlSpan, frameId: hit.frameId };
    },
    expectedTypeOf(exprOrBindable) {
      if ("exprId" in exprOrBindable) {
        return typecheck?.expectedByExpr.get(exprOrBindable.exprId) ?? null;
      }
      if ("type" in exprOrBindable) return exprOrBindable.type ?? null;
      return null;
    },
    controllerAt(_htmlOffset) { return null; },
  };
}
