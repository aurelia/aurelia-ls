import path from "node:path";

// Phases
import { lowerDocument } from "./phases/10-lower/lower.js";
import { resolveHost } from "./phases/20-resolve-host/resolve.js";
import { bindScopes } from "./phases/30-bind/bind.js";
import { plan } from "./phases/50-plan/plan.js";
import { emitOverlayFile } from "./phases/60-emit/overlay.js";

// Types
import type { SourceSpan, ExprId, BindingSourceIR, InterpIR, ExprRef, DOMNode, TemplateIR, NodeId } from "./model/ir.js";
import type { FrameId } from "./model/symbols.js";
import type { VmReflection, OverlayPlanModule } from "./phases/50-plan/types.js";
import type { TemplateMappingArtifact, TemplateMappingEntry, TemplateQueryFacade, TemplateNodeInfo, TemplateBindableInfo, TemplateControllerInfo } from "../contracts.js";
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

// Parsers
import { getExpressionParser } from "../parsers/expression-parser.js";
import type { IExpressionParser } from "../parsers/expression-api.js";
import type { BuildIrOptions } from "./phases/10-lower/lower.js";

import { DEFAULT as SEM_DEFAULT } from "./language/registry.js";
import { DEFAULT_SYNTAX, type AttributeParser } from "./language/syntax.js";

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

  // 4) ScopeGraph -> Overlay plan
  const overlayBase = opts.overlayBaseName ?? `${path.basename(opts.templateFilePath, path.extname(opts.templateFilePath))}.__au.ttc.overlay`;
  const syntheticPrefix = opts.vm.getSyntheticPrefix?.() ?? "__AU_TTC_";
  const planOut: OverlayPlanModule = plan(linked, scope, { isJs: opts.isJs, vm: opts.vm, syntheticPrefix });

  // 5) Plan -> overlay text
  const overlayPath = path.join(path.dirname(opts.templateFilePath), `${overlayBase}${opts.isJs ? ".js" : ".ts"}`);
  const { text, mapping: overlayMapping } = emitOverlayFile(planOut, { isJs: !!opts.isJs, filename: overlayBase });

  // 6) Mapping
  const exprSpans = collectExprSpansFromIr(ir);
  const exprToFrame = scope.templates?.[0]?.exprToFrame as ExprToFrameMap | undefined;
  const mapping = buildMappingArtifact(overlayMapping, exprSpans, opts.templateFilePath, exprToFrame ?? null);
  const calls = overlayMapping.map((m) => ({
    exprId: m.exprId,
    overlayStart: m.start,
    overlayEnd: m.end,
    htmlSpan: exprSpans.get(m.exprId) ?? { start: 0, end: 0, file: opts.templateFilePath },
  }));
  const query = buildQueryFacade(ir.templates[0], linked, scope, mapping);

  return {
    ir,
    linked,
    scope,
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
  fallbackFile: string,
  exprToFrame?: ExprToFrameMap | null,
): TemplateMappingArtifact {
  const entries: TemplateMappingEntry[] = overlayMapping.map((m) => ({
    exprId: m.exprId,
    htmlSpan: exprSpans.get(m.exprId) ?? { start: 0, end: 0, file: fallbackFile },
    overlayRange: [m.start, m.end],
    frameId: exprToFrame?.[m.exprId] ?? undefined,
  }));
  return { kind: "mapping", entries };
}

function buildQueryFacade(ir: TemplateIR | undefined, linked: LinkedSemanticsModule, scope: any, mapping: TemplateMappingArtifact): TemplateQueryFacade {
  if (!ir) return buildPendingQueryFacade(mapping);
  const nodes = indexDom(ir);
  const rowsByTarget = indexRows(linked);

  return {
    nodeAt(htmlOffset) {
      return pickNodeAt(nodes, rowsByTarget, htmlOffset);
    },
    bindablesFor(node) {
      const row = rowsByTarget.get(node.id);
      if (!row) return null;
      const bindables = collectBindables(row);
      return bindables.length > 0 ? bindables : null;
    },
    exprAt(htmlOffset) {
      const hit = mapping.entries.find((entry) => htmlOffset >= entry.htmlSpan.start && htmlOffset <= entry.htmlSpan.end);
      if (!hit) return null;
      return { exprId: hit.exprId, span: hit.htmlSpan, frameId: hit.frameId };
    },
    expectedTypeOf(_exprOrBindable) {
      // TODO: feed Phase 40 typing hints when implemented
      return null;
    },
    controllerAt(htmlOffset) {
      const node = pickNodeAt(nodes, rowsByTarget, htmlOffset);
      if (!node) return null;
      const row = rowsByTarget.get(node.id);
      if (!row) return null;
      const ctrl = findControllerAt(row, htmlOffset);
      return ctrl;
    },
  };
}

type NodeIndex = { id: NodeId; node: DOMNode; span?: SourceSpan | null; kind: "element" | "template" | "text" | "comment"; hostKind: "custom" | "native" | "none" };

function indexDom(ir: TemplateIR): NodeIndex[] {
  const out: NodeIndex[] = [];
  const stack: DOMNode[] = [ir.dom];
  while (stack.length) {
    const n = stack.pop()!;
    out.push({ id: n.id, node: n, span: n.loc ?? null, kind: n.kind, hostKind: "none" });
    switch (n.kind) {
      case "element":
      case "template":
        for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]!);
        break;
      default:
        break;
    }
  }
  return out;
}

function indexRows(linked: LinkedSemanticsModule): Map<NodeId, LinkedRow> {
  const map = new Map<NodeId, LinkedRow>();
  const t = linked.templates?.[0];
  if (!t) return map;
  for (const row of t.rows ?? []) map.set(row.target, row);
  return map;
}

function pickNodeAt(nodes: NodeIndex[], rows: Map<NodeId, LinkedRow>, offset: number): TemplateNodeInfo | null {
  let best: NodeIndex | null = null;
  for (const n of nodes) {
    if (n.span == null) continue;
    if (offset < n.span.start || offset > n.span.end) continue;
    if (!best || (best.span && (n.span!.end - n.span!.start) <= (best.span.end! - best.span.start!))) {
      best = n;
    }
  }
  if (!best || !best.span) return null;
  const row = rows.get(best.id);
  const hostKind = row ? resolveHostKind(row.node) : "none";
  const mappedKind = mapNodeKind(best.kind);
  if (!mappedKind) return null;
  return { id: best.id, kind: mappedKind, hostKind, span: best.span };
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

function collectBindables(row: LinkedRow): TemplateBindableInfo[] {
  const out: TemplateBindableInfo[] = [];
  for (const instr of row.instructions ?? []) {
    switch (instr.kind) {
      case "propertyBinding":
        out.push({
          name: instr.to,
          mode: instr.effectiveMode,
          source: targetSource(instr.target),
        });
        break;
      case "attributeBinding":
      case "stylePropertyBinding":
        out.push({ name: instr.to, source: "native" });
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
        out.push({ name: b.to, mode: b.effectiveMode, source: targetSource(b.target) });
        break;
      case "attributeBinding":
        out.push({ name: b.to, source: targetSource(b.target) });
        break;
      case "stylePropertyBinding":
        out.push({ name: b.to, source: "native" });
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
function buildPendingQueryFacade(mapping: TemplateMappingArtifact): TemplateQueryFacade {
  return {
    nodeAt(_htmlOffset) { return null; },
    bindablesFor(_node) { return null; },
    exprAt(htmlOffset) {
      const hit = mapping.entries.find((entry) => htmlOffset >= entry.htmlSpan.start && htmlOffset <= entry.htmlSpan.end);
      if (!hit) return null;
      return { exprId: hit.exprId, span: hit.htmlSpan, frameId: hit.frameId };
    },
    expectedTypeOf(_exprOrBindable) { return null; },
    controllerAt(_htmlOffset) { return null; },
  };
}

/* =======================================================================================
 * Mapping helpers
 * ======================================================================================= */

function collectExprSpansFromIr(ir: { templates: any[] }): Map<ExprId, SourceSpan> {
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


