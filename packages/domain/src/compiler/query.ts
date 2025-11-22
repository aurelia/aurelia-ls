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
import { idKey } from "./model/identity.js";
import { pickNarrowestContaining, spanContainsOffset } from "./model/span.js";

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
  const controllers = indexControllers(linked);

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
  return `${templateIndex}:${idKey(id)}`;
}

function indexRowsAll(linked: LinkedSemanticsModule): Map<string, LinkedRow> {
  const map = new Map<string, LinkedRow>();
  linked.templates?.forEach((t, ti) => {
    for (const row of t.rows ?? []) map.set(rowKey(ti, row.target), row);
  });
  return map;
}

type ControllerIndex = { kind: TemplateControllerInfo["kind"]; span: SourceSpan | null };

function indexControllers(linked: LinkedSemanticsModule): ControllerIndex[] {
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

function pickNodeAt(nodes: NodeIndex[], rows: Map<string, LinkedRow>, offset: number): TemplateNodeInfo | null {
  const best = pickNarrowestContaining(nodes, offset, (n) => n.span ?? null);
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
  const best = pickNarrowestContaining(segmentPairs(entries), htmlOffset, (pair) => pair.segment.htmlSpan);
  if (!best) return null;
  const { entry, segment } = best;
  const result: { exprId: ExprId; span: SourceSpan; frameId?: FrameId; memberPath?: string } = {
    exprId: entry.exprId,
    span: segment.htmlSpan,
  };
  if (entry.frameId !== undefined) result.frameId = entry.frameId;
  if (segment.path !== undefined) result.memberPath = segment.path;
  return result;
}

function* segmentPairs(entries: readonly TemplateMappingEntry[]) {
  for (const entry of entries) {
    for (const segment of entry.segments ?? []) {
      yield { entry, segment };
    }
  }
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

function buildPendingQueryFacade(mapping: TemplateMappingArtifact, typecheck: TypecheckModule): TemplateQueryFacade {
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
        return typecheck.expectedByExpr.get(exprOrBindable.exprId) ?? null;
      }
      if ("type" in exprOrBindable) return exprOrBindable.type ?? null;
      return null;
    },
    controllerAt(_htmlOffset) { return null; },
  };
}
