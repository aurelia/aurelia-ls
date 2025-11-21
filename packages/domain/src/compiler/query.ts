import type {
  TemplateBindableInfo,
  TemplateControllerInfo,
  TemplateMappingArtifact,
  TemplateMappingEntry,
  TemplateMappingSegment,
  TemplateNodeInfo,
  TemplateQueryFacade,
} from "../contracts.js";
import type { TypecheckModule } from "./phases/40-typecheck/typecheck.js";
import type {
  LinkedAttributeBinding,
  LinkedElementBindable,
  LinkedHydrateTemplateController,
  LinkedPropertyBinding,
  LinkedRow,
  LinkedSemanticsModule,
  LinkedStylePropertyBinding,
  NodeSem,
  TargetSem,
} from "./phases/20-resolve-host/types.js";
import type { TypeRef } from "./language/registry.js";
import type { DOMNode, ExprId, IrModule, NodeId, SourceSpan, TemplateIR } from "./model/ir.js";
import type { FrameId } from "./model/symbols.js";

export function buildTemplateQuery(
  irModule: IrModule | undefined,
  linked: LinkedSemanticsModule,
  mapping: TemplateMappingArtifact,
  typecheck: TypecheckModule,
): TemplateQueryFacade {
  if (!irModule) return buildPendingQueryFacade(mapping, typecheck);
  const nodes = indexDomAll(irModule);
  const rowsByTarget = indexRowsAll(linked);
  const expectedByExpr = typecheck.expectedByExpr;

  return {
    nodeAt(htmlOffset) {
      return pickNodeAt(nodes, rowsByTarget, htmlOffset);
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
      const hit = mapping.entries.find((entry) => htmlOffset >= entry.htmlSpan.start && htmlOffset <= entry.htmlSpan.end);
      if (!hit) return null;
      return { exprId: hit.exprId, span: hit.htmlSpan, frameId: hit.frameId };
    },
    expectedTypeOf(exprOrBindable) {
      if ("exprId" in exprOrBindable) {
        const key = exprOrBindable.exprId as ExprId;
        return expectedByExpr.get(key) ?? null;
      }
      if ("type" in exprOrBindable) {
        return exprOrBindable.type ?? null;
      }
      return null;
    },
    controllerAt(htmlOffset) {
      const node = pickNodeAt(nodes, rowsByTarget, htmlOffset);
      if (!node) return null;
      const row = rowsByTarget.get(rowKey(node.templateIndex, node.id));
      if (!row) return null;
      return findControllerAt(row, htmlOffset);
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

function indexDomAll(ir: { templates: TemplateIR[] }): NodeIndex[] {
  const out: NodeIndex[] = [];
  ir.templates?.forEach((t, ti) => {
    const stack: DOMNode[] = [t.dom];
    while (stack.length) {
      const n = stack.pop()!;
      out.push({ id: n.id, node: n, templateIndex: ti, span: n.loc ?? null, kind: n.kind, hostKind: "none" });
      switch (n.kind) {
        case "element":
        case "template":
          for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]!);
          break;
        default:
          break;
      }
    }
  });
  return out;
}

function rowKey(templateIndex: number, id: NodeId): string {
  return `${templateIndex}:${id}`;
}

function indexRowsAll(linked: LinkedSemanticsModule): Map<string, LinkedRow> {
  const map = new Map<string, LinkedRow>();
  linked.templates?.forEach((t, ti) => {
    for (const row of t.rows ?? []) map.set(rowKey(ti, row.target), row);
  });
  return map;
}

function pickNodeAt(nodes: NodeIndex[], rows: Map<string, LinkedRow>, offset: number): TemplateNodeInfo | null {
  let best: NodeIndex | null = null;
  for (const n of nodes) {
    if (n.span == null) continue;
    if (offset < n.span.start || offset > n.span.end) continue;
    if (!best || (best.span && (n.span!.end - n.span!.start) <= (best.span.end! - best.span.start!))) {
      best = n;
    }
  }
  if (!best || !best.span) return null;
  const mappedKind = mapNodeKind(best.kind);
  if (!mappedKind) return null;
  const row = rows.get(rowKey(best.templateIndex, best.id));
  const hostKind = row ? resolveHostKind(row.node) : mappedKind === "element" ? "native" : "none";
  return { id: best.id, kind: mappedKind, hostKind, span: best.span, templateIndex: best.templateIndex };
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
  let segmentHit: { entry: TemplateMappingEntry; segment: TemplateMappingSegment } | null = null;
  for (const entry of entries) {
    for (const seg of entry.segments ?? []) {
      if (htmlOffset >= seg.htmlSpan.start && htmlOffset <= seg.htmlSpan.end) {
        if (!segmentHit || spanSize(seg.htmlSpan) < spanSize(segmentHit.segment.htmlSpan)) {
          segmentHit = { entry, segment: seg };
        }
      }
    }
  }
  if (!segmentHit) return null;
  const { entry, segment } = segmentHit;
  const result: { exprId: ExprId; span: SourceSpan; frameId?: FrameId; memberPath?: string } = {
    exprId: entry.exprId,
    span: segment.htmlSpan,
  };
  if (entry.frameId !== undefined) result.frameId = entry.frameId;
  if (segment.path !== undefined) result.memberPath = segment.path;
  return result;
}

function spanSize(span: SourceSpan): number {
  return (span.end ?? 0) - (span.start ?? 0);
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

function typeRefToString(t: TypeRef | undefined | null): string | undefined {
  if (!t) return undefined;
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

function findControllerAt(row: LinkedRow, htmlOffset: number): TemplateControllerInfo | null {
  for (const instr of row.instructions ?? []) {
    if (instr.kind !== "hydrateTemplateController") continue;
    if (instr.loc && (htmlOffset < instr.loc.start || htmlOffset > instr.loc.end)) continue;
    const span = instr.loc ?? { start: 0, end: 0 };
    return { kind: instr.res, span };
  }
  return null;
}

function buildPendingQueryFacade(mapping: TemplateMappingArtifact, typecheck: TypecheckModule): TemplateQueryFacade {
  return {
    nodeAt(_htmlOffset) { return null; },
    bindablesFor(_node) { return null; },
    exprAt(htmlOffset) {
      const hit = mapping.entries.find((entry) => htmlOffset >= entry.htmlSpan.start && htmlOffset <= entry.htmlSpan.end);
      if (!hit) return null;
      return { exprId: hit.exprId, span: hit.htmlSpan, frameId: hit.frameId };
    },
    expectedTypeOf(exprOrBindable) {
      if ("exprId" in exprOrBindable) {
        return typecheck.expectedByExpr.get(exprOrBindable.exprId) ?? null;
      }
      if ("type" in exprOrBindable) return exprOrBindable.type ?? null;
      return null;
    },
    controllerAt(_htmlOffset) { return null; },
  };
}
