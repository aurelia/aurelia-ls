import path from "node:path";

// Phases
import { lowerDocument } from "./phases/10-lower/lower.js";
import { resolveHost } from "./phases/20-resolve-host/resolve.js";
import { bindScopes } from "./phases/30-bind/bind.js";
import { plan } from "./phases/50-plan/plan.js";
import { emitOverlayFile } from "./phases/60-emit/overlay.js";

// Types
import type { SourceSpan, ExprId, BindingSourceIR, InterpIR, ExprRef, DOMNode, TemplateIR, NodeId, ExprTableEntry, IsBindingBehavior, IrModule } from "./model/ir.js";
import type { FrameId } from "./model/symbols.js";
import type { VmReflection, OverlayPlanModule } from "./phases/50-plan/types.js";
import type { TemplateMappingArtifact, TemplateMappingEntry, TemplateMappingSegment, TemplateQueryFacade, TemplateNodeInfo, TemplateBindableInfo, TemplateControllerInfo } from "../contracts.js";
import type {
  LinkedSemanticsModule,
  LinkedRow,
  NodeSem,
  LinkedHydrateTemplateController,
  LinkedElementBindable,
  LinkedPropertyBinding,
  LinkedAttributeBinding,
  LinkedStylePropertyBinding,
  TargetSem,
} from "./phases/20-resolve-host/types.js";
import type { OverlayEmitMappingEntry } from "./phases/60-emit/overlay.js";
import type { TypeRef } from "./language/registry.js";
import type { TypecheckModule } from "./phases/40-typecheck/typecheck.js";

// Parsers
import { getExpressionParser } from "../parsers/expression-parser.js";
import type { IExpressionParser } from "../parsers/expression-api.js";
import type { BuildIrOptions } from "./phases/10-lower/lower.js";

import { DEFAULT as SEM_DEFAULT } from "./language/registry.js";
import { DEFAULT_SYNTAX, type AttributeParser } from "./language/syntax.js";
import { typecheck } from "./phases/40-typecheck/typecheck.js";

// SSR
import { planSsr } from "./phases/50-plan/ssr-plan.js";
import { emitSsr } from "./phases/60-emit/ssr.js";
import type { SsrPlanModule } from "./phases/50-plan/ssr-types.js";

/* =======================================================================================
 * Public façade
 * ======================================================================================= */

export interface CompileOptions {
  html: string;
  templateFilePath: string;
  isJs: boolean;
  vm: VmReflection;
  attrParser?: AttributeParser;
  exprParser?: IExpressionParser;
  overlayBaseName?: string;
}

export interface CompileOverlayResult {
  overlayPath: string;
  text: string;
  calls: Array<{ exprId: ExprId; overlayStart: number; overlayEnd: number; htmlSpan: SourceSpan }>;
  /** First-class mapping scaffold (currently mirrors ad-hoc call mapping). */
  mapping?: TemplateMappingArtifact;
}

export interface TemplateCompilation {
  ir: ReturnType<typeof lowerDocument>;
  linked: ReturnType<typeof resolveHost>;
  scope: ReturnType<typeof bindScopes>;
  typecheck: TypecheckModule;
  overlayPlan: OverlayPlanModule;
  overlay: CompileOverlayResult;
  mapping: TemplateMappingArtifact;
  query: TemplateQueryFacade;
}

/** Full pipeline (lower -> link -> bind -> plan -> emit) plus mapping/query scaffolding. */
export function compileTemplate(opts: CompileOptions): TemplateCompilation {
  const exprParser = opts.exprParser ? opts.exprParser : getExpressionParser();
  const attrParser = opts.attrParser ? opts.attrParser : DEFAULT_SYNTAX;

  // 1) HTML -> IR
  const ir = lowerDocument(opts.html, {
    file: opts.templateFilePath,
    name: path.basename(opts.templateFilePath),
    attrParser,
    exprParser,
  } as BuildIrOptions); // lowerer reads both contracts.

  // 2) IR -> Linked
  const linked = resolveHost(ir, SEM_DEFAULT);

  // 3) Linked -> ScopeGraph
  const scope = bindScopes(linked);

  // 4) Type hints (phase 40)
  const typecheckOut = typecheck(linked);

  // 4) ScopeGraph -> Overlay plan
  const overlayBase = opts.overlayBaseName ?? `${path.basename(opts.templateFilePath, path.extname(opts.templateFilePath))}.__au.ttc.overlay`;
  const syntheticPrefix = opts.vm.getSyntheticPrefix?.() ?? "__AU_TTC_";
  const planOut: OverlayPlanModule = plan(linked, scope, { isJs: opts.isJs, vm: opts.vm, syntheticPrefix });

  // 5) Plan -> overlay text
  const overlayPath = path.join(path.dirname(opts.templateFilePath), `${overlayBase}${opts.isJs ? ".js" : ".ts"}`);
  const { text, mapping: overlayMapping } = emitOverlayFile(planOut, { isJs: !!opts.isJs, filename: overlayBase });

  // 6) Mapping
  const exprSpans = collectExprSpansFromIr(ir);
  const memberHtmlSegments = collectExprMemberSegments(ir.exprTable ?? [], exprSpans);
  const exprToFrame = scope.templates?.[0]?.exprToFrame as ExprToFrameMap | undefined;
  const mapping = buildMappingArtifact(overlayMapping, exprSpans, memberHtmlSegments, opts.templateFilePath, exprToFrame ?? null);
  const calls = overlayMapping.map((m) => ({
    exprId: m.exprId,
    overlayStart: m.start,
    overlayEnd: m.end,
    htmlSpan: exprSpans.get(m.exprId) ?? { start: 0, end: 0, file: opts.templateFilePath },
  }));
  const query = buildQueryFacade(ir, linked, scope, mapping, typecheckOut);

  return {
    ir,
    linked,
    scope,
    typecheck: typecheckOut,
    overlayPlan: planOut,
    overlay: { overlayPath, text, calls, mapping },
    mapping,
    query,
  };
}

export function compileTemplateToOverlay(opts: CompileOptions): CompileOverlayResult {
  const compilation = compileTemplate(opts);
  return compilation.overlay;
}

type ExprToFrameMap = Record<ExprId, FrameId>;

function buildMappingArtifact(
  overlayMapping: OverlayEmitMappingEntry[],
  exprSpans: Map<ExprId, SourceSpan>,
  memberHtmlSegments: Map<ExprId, HtmlMemberSegment[]>,
  fallbackFile: string,
  exprToFrame?: ExprToFrameMap | null,
): TemplateMappingArtifact {
  const entries: TemplateMappingEntry[] = overlayMapping.map((m) => {
    const htmlSpan = exprSpans.get(m.exprId) ?? { start: 0, end: 0, file: fallbackFile };
    const htmlSegments = memberHtmlSegments.get(m.exprId) ?? [];
    const segments = buildSegmentPairs(m.segments ?? [], htmlSegments);
    return {
      exprId: m.exprId,
      htmlSpan,
      overlayRange: [m.start, m.end],
      frameId: exprToFrame?.[m.exprId] ?? undefined,
      segments: segments.length > 0 ? segments : undefined,
    };
  });
  return { kind: "mapping", entries };
}

function buildQueryFacade(irModule: IrModule | undefined, linked: LinkedSemanticsModule, _scope: unknown, mapping: TemplateMappingArtifact, typecheck: TypecheckModule): TemplateQueryFacade {
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
      let segmentHit: { entry: TemplateMappingEntry; segment: TemplateMappingSegment } | null = null;
      for (const entry of mapping.entries) {
        for (const seg of entry.segments ?? []) {
          if (htmlOffset >= seg.htmlSpan.start && htmlOffset <= seg.htmlSpan.end) {
            if (!segmentHit || spanSize(seg.htmlSpan) < spanSize(segmentHit.segment.htmlSpan)) {
              segmentHit = { entry, segment: seg };
            }
          }
        }
      }
      if (segmentHit) {
        const { entry, segment } = segmentHit;
        return { exprId: entry.exprId, span: segment.htmlSpan, frameId: entry.frameId, memberPath: segment.path };
      }
      const hit = mapping.entries.find((entry) => htmlOffset >= entry.htmlSpan.start && htmlOffset <= entry.htmlSpan.end);
      if (!hit) return null;
      return { exprId: hit.exprId, span: hit.htmlSpan, frameId: hit.frameId };
    },
    expectedTypeOf(_exprOrBindable) {
      if ("exprId" in _exprOrBindable) {
        const key = _exprOrBindable.exprId as ExprId;
        return expectedByExpr.get(key) ?? null;
      }
      if ("type" in _exprOrBindable) {
        return _exprOrBindable.type ?? null;
      }
      return null;
    },
    controllerAt(htmlOffset) {
      const node = pickNodeAt(nodes, rowsByTarget, htmlOffset);
      if (!node) return null;
      const row = rowsByTarget.get(rowKey(node.templateIndex, node.id));
      if (!row) return null;
      const ctrl = findControllerAt(row, htmlOffset);
      return ctrl;
    },
  };
}

type NodeIndex = { id: NodeId; node: DOMNode; span?: SourceSpan | null; templateIndex: number; kind: "element" | "template" | "text" | "comment"; hostKind: "custom" | "native" | "none" };

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
  const hostKind = row ? resolveHostKind(row.node) : (mappedKind === "element" ? "native" : "none");
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
        out.push(addType({ name: instr.to, source: "native" }, typeResolver(instr.target)));
        break;
      case "hydrateElement":
      case "hydrateAttribute":
        for (const p of instr.props ?? []) {
          addBindableFromLinked(p);
        }
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

  function addBindableFromLinked(b: LinkedElementBindable | LinkedPropertyBinding | LinkedAttributeBinding | LinkedStylePropertyBinding) {
    switch (b.kind) {
      case "propertyBinding":
        out.push(addType({ name: b.to, mode: b.effectiveMode, source: targetSource(b.target) }, typeResolver(b.target)));
        break;
      case "attributeBinding":
        out.push(addType({ name: b.to, source: targetSource(b.target) }, typeResolver(b.target)));
        break;
      case "stylePropertyBinding":
        out.push(addType({ name: b.to, source: "native" }, "string"));
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

// Fallback query facade when IR is missing (should not happen in normal flow).
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

/* =======================================================================================
 * Mapping helpers
 * ======================================================================================= */

function collectExprSpansFromIr(ir: IrModule): Map<ExprId, SourceSpan> {
  const out = new Map<ExprId, SourceSpan>();
  const visitSource = (src: BindingSourceIR) => {
    if (isInterp(src)) {
      for (const r of src.exprs) if (!out.has(r.id) && r.loc) out.set(r.id, r.loc);
    } else {
      const r = src as ExprRef;
      if (!out.has(r.id) && r.loc) out.set(r.id, r.loc);
    }
  };
  for (const t of ir.templates) {
    for (const row of t.rows ?? []) {
      for (const ins of row.instructions ?? []) {
        switch (ins.type) {
          case "propertyBinding":
          case "attributeBinding":
          case "stylePropertyBinding":
          case "textBinding":
            visitSource(ins.from);
            break;
          case "listenerBinding":
          case "refBinding":
            if (ins.from?.loc) out.set(ins.from.id, ins.from.loc);
            break;
          case "hydrateTemplateController":
            for (const p of ins.props ?? []) {
              if (p.type === "iteratorBinding") {
                // header id recorded via ForOfIR.astId (mapped elsewhere)
              } else if (p.type === "propertyBinding") {
                visitSource(p.from);
              }
            }
            if (ins.branch?.kind === "case") {
              if (ins.branch.expr.loc) out.set(ins.branch.expr.id, ins.branch.expr.loc);
            }
            break;
          case "hydrateLetElement":
            for (const lb of ins.instructions ?? []) visitSource(lb.from);
            break;
          default:
            break;
        }
      }
    }
  }
  return out;

  function isInterp(x: BindingSourceIR): x is InterpIR {
    return (x as InterpIR).kind === "interp";
  }
}

type HtmlMemberSegment = { path: string; span: SourceSpan };

function collectExprMemberSegments(table: readonly ExprTableEntry[], exprSpans: Map<ExprId, SourceSpan>): Map<ExprId, HtmlMemberSegment[]> {
  const out = new Map<ExprId, HtmlMemberSegment[]>();
  for (const entry of table) {
    const base = exprSpans.get(entry.id);
    if (!base) continue;
    if (entry.expressionType !== "IsProperty" && entry.expressionType !== "IsFunction") continue;
    const segments: HtmlMemberSegment[] = [];
    walk(entry.ast as IsBindingBehavior, base, segments, undefined);
    if (segments.length > 0) out.set(entry.id, segments);
  }
  return out;

  function walk(node: IsBindingBehavior | undefined, base: SourceSpan, acc: HtmlMemberSegment[], inheritedPath: string | undefined): string | undefined {
    if (!node || !node.$kind) return inheritedPath;
    switch (node.$kind) {
      case "AccessScope": {
        const pathBase = node.ancestor === 0 ? "" : `$parent^${node.ancestor}.`;
        if (node.name) {
          const path = `${pathBase}${node.name}`;
          acc.push({ path, span: toHtmlSpan(node.span, base) });
          return path;
        }
        return pathBase ? pathBase.slice(0, -1) : undefined;
      }
      case "AccessThis": {
        const path = node.ancestor === 0 ? "$this" : `$parent^${node.ancestor}`;
        acc.push({ path, span: toHtmlSpan(node.span, base) });
        return path;
      }
      case "AccessMember": {
        const parentPath = walk(node.object, base, acc, inheritedPath);
        const path = parentPath ? `${parentPath}.${node.name}` : undefined;
        if (path) acc.push({ path, span: toHtmlSpan(node.span, base) });
        return path;
      }
      case "AccessKeyed": {
        const parentPath = walk(node.object, base, acc, inheritedPath);
        walk(node.key, base, acc, undefined);
        if (node.key?.$kind === "PrimitiveLiteral") {
          const key = String(node.key.value ?? "");
          const path = parentPath ? `${parentPath}[${JSON.stringify(key)}]` : undefined;
          if (path) acc.push({ path, span: toHtmlSpan(node.span, base) });
          return path;
        }
        return parentPath;
      }
      case "CallScope":
        for (const a of node.args ?? []) walk(a, base, acc, undefined);
        return walk({ $kind: "AccessScope", name: node.name, ancestor: node.ancestor, span: node.span }, base, acc, inheritedPath);
      case "CallMember":
        for (const a of node.args ?? []) walk(a, base, acc, undefined);
        return walk(node.object, base, acc, inheritedPath);
      case "CallFunction":
        for (const a of node.args ?? []) walk(a, base, acc, inheritedPath);
        return walk(node.func, base, acc, inheritedPath);
      case "Binary":
        walk(node.left, base, acc, inheritedPath);
        walk(node.right, base, acc, inheritedPath);
        return undefined;
      case "Unary":
        walk(node.expression, base, acc, inheritedPath);
        return inheritedPath;
      case "Assign":
        walk(node.target, base, acc, inheritedPath);
        walk(node.value, base, acc, inheritedPath);
        return inheritedPath;
      case "Conditional":
        walk(node.condition, base, acc, inheritedPath);
        walk(node.yes, base, acc, inheritedPath);
        walk(node.no, base, acc, inheritedPath);
        return inheritedPath;
      case "ArrayLiteral":
        for (const el of node.elements ?? []) walk(el, base, acc, inheritedPath);
        return inheritedPath;
      case "ObjectLiteral":
        for (const v of node.values ?? []) walk(v, base, acc, inheritedPath);
        return inheritedPath;
      case "Template":
        for (const e of node.expressions ?? []) walk(e, base, acc, inheritedPath);
        return inheritedPath;
      case "TaggedTemplate":
        walk(node.func, base, acc, inheritedPath);
        for (const e of node.expressions ?? []) walk(e, base, acc, inheritedPath);
        return inheritedPath;
      default:
        return inheritedPath;
    }
  }

  function toHtmlSpan(span: { start: number; end: number } | undefined, base: SourceSpan): SourceSpan {
    if (!span) return base;
    const file = base.file;
    return file ? { start: base.start + span.start, end: base.start + span.end, file } : { start: base.start + span.start, end: base.start + span.end };
  }
}

function buildSegmentPairs(overlaySegments: readonly { path: string; span: readonly [number, number] }[], htmlSegments: readonly HtmlMemberSegment[]): TemplateMappingSegment[] {
  if (overlaySegments.length === 0 || htmlSegments.length === 0) return [];
  const used = new Set<number>();
  const out: TemplateMappingSegment[] = [];
  for (const seg of overlaySegments) {
    const idx = htmlSegments.findIndex((h, i) => !used.has(i) && h.path === seg.path);
    if (idx === -1) continue;
    const h = htmlSegments[idx]!;
    used.add(idx);
    out.push({ kind: "member", path: seg.path, htmlSpan: h.span, overlaySpan: [seg.span[0], seg.span[1]] });
  }
  return out;
}

export interface CompileSsrResult {
  htmlPath: string;
  htmlText: string;
  manifestPath: string;
  manifestText: string;
  plan: SsrPlanModule; // handy for debugging/tests
}

/** Build SSR “server emits” (HTML skeleton + JSON manifest) from a template. */
export function compileTemplateToSSR(opts: CompileOptions): CompileSsrResult {
  const exprParser = opts.exprParser ? opts.exprParser : getExpressionParser();
  const attrParser = opts.attrParser ? opts.attrParser : DEFAULT_SYNTAX;

  // 1) HTML → IR
  const ir = lowerDocument(opts.html, {
    file: opts.templateFilePath,
    name: path.basename(opts.templateFilePath),
    attrParser,
    exprParser,
  } as BuildIrOptions);

  // 2) IR → Linked
  const linked = resolveHost(ir, SEM_DEFAULT);

  // 3) Linked → ScopeGraph
  const scope = bindScopes(linked);

  // 4) Linked+Scoped → SSR plan
  const plan = planSsr(linked, scope);

  // 5) Emit SSR artifacts
  const { html, manifest } = emitSsr(plan, linked, { eol: "\n" });

  // 6) Paths
  const base = opts.overlayBaseName ?? `${path.basename(opts.templateFilePath, path.extname(opts.templateFilePath))}.__au.ssr`;
  const dir = path.dirname(opts.templateFilePath);
  const htmlPath = path.join(dir, `${base}.html`);
  const manifestPath = path.join(dir, `${base}.json`);

  return { htmlPath, htmlText: html, manifestPath, manifestText: manifest, plan };
}


