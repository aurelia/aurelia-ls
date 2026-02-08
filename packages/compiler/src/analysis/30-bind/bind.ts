/* =============================================================================
 * PHASE 30 — BIND (Scope Graph)
 * LinkModule -> ScopeModule (pure, deterministic)
 * - Map each expression occurrence to the frame where it is evaluated
 * - Introduce frames for overlay controllers (repeat/with/promise)
 * - Materialize locals: <let>, iterator declaration, contextuals, aliases
 * - Record provenance to aid later typing/planning
 *
 * ## Config-Driven Controller Handling
 *
 * This phase is ENTIRELY config-driven for template controllers. Instead of
 * switching on controller names (repeat, with, promise), we switch on config
 * properties (trigger.kind, scope, injects). This enables:
 *
 * 1. **Userland TC Support**: A custom `virtual-repeat` with the same config
 *    shape as `repeat` gets identical scope/typing behavior automatically.
 *
 * 2. **Single Source of Truth**: Controller behavior is defined in ControllerConfig.
 *    This phase just reads the config — no hardcoded controller knowledge.
 *
 * 3. **Pattern-Based Origins**: FrameOrigin kinds are generic (iterator, valueOverlay)
 *    so type-analysis can handle any controller with matching semantics.
 *
 * See symbols.ts header comment for the full design rationale.
 * ============================================================================= */

import type {
  SourceSpan, ExprId,
  BindingSourceIR, ExprRef,
  TemplateNode,
  ForOfStatement,
  BindingIdentifierOrPattern,
  DestructuringAssignmentExpression,
  BadExpression,
  ExprTableEntry,
} from "../../model/ir.js";

import type {
  LinkModule, LinkedTemplate, LinkedRow,
  LinkedHydrateTemplateController, LinkedIteratorBinding, LinkedHydrateLetElement, LinkedElementBindable,
  LinkedPropertyBinding,
} from "../20-link/types.js";

import type {
  ScopeModule, ScopeTemplate, ScopeFrame, FrameId, ScopeSymbol, ScopeDiagCode, OverlayBase, FrameOrigin,
} from "../../model/symbols.js";

import type { ControllerConfig } from "../../schema/registry.js";

import { FrameIdAllocator, type ExprIdMap, type ReadonlyExprIdMap } from "../../model/identity.js";
import { preferOrigin, provenanceFromSpan, provenanceSpan } from "../../model/origin.js";
import { diagnosticsCatalog } from "../../diagnostics/catalog/index.js";
import type { DiagnosticEmitter } from "../../diagnostics/emitter.js";
import { reportDiagnostic } from "../../diagnostics/report.js";
import { exprIdsOf, collectBindingNames, findBadInPattern } from "../../shared/expr-utils.js";
import { normalizeSpanMaybe } from "../../model/span.js";
import type { Origin, Provenance } from "../../model/origin.js";
import { isStub } from "../../shared/diagnosed.js";
import { NOOP_TRACE, CompilerAttributes, type CompileTrace } from "../../shared/trace.js";
import { debug } from "../../shared/debug.js";
import {
  isPromiseParentController,
  resolvePromiseBranchKind,
} from "../shared/controller-decisions.js";

function assertUnreachable(_x: never): never { throw new Error("unreachable"); }

type BindDiagnosticEmitter = DiagnosticEmitter<typeof diagnosticsCatalog, ScopeDiagCode>;

/* =============================================================================
 * Options
 * ============================================================================= */

export interface BindScopesOptions {
  /** Optional trace for instrumentation. Defaults to NOOP_TRACE. */
  trace?: CompileTrace;
  diagnostics: BindDiagnosticEmitter;
}

/* =============================================================================
 * Public API
 * ============================================================================= */

export function bindScopes(linked: LinkModule, opts?: BindScopesOptions): ScopeModule {
  const trace = opts?.trace ?? NOOP_TRACE;
  const diagEmitter = opts?.diagnostics;
  if (!diagEmitter) {
    throw new Error("bindScopes requires diagnostics emitter; missing emitter is a wiring error.");
  }

  return trace.span("bind.scopes", () => {
    trace.setAttributes({
      [CompilerAttributes.TEMPLATE]: linked.templates[0]?.name ?? "<unknown>",
      "bind.templateCount": linked.templates.length,
      "bind.exprCount": linked.exprTable?.length ?? 0,
    });

    let diagCount = 0;
    const emitter: BindDiagnosticEmitter = {
      emit: (code, input) => {
        const diag = diagEmitter.emit(code, input);
        diagCount += 1;
        return diag;
      },
    };
    const templates: ScopeTemplate[] = [];

    // Index ForOf entries once
    trace.event("bind.indexExprs.start");
    const exprIndex: ExprIdMap<ExprTableEntry> = new Map();
    const forOfIndex: ExprIdMap<ForOfStatement | BadExpression> = new Map();
    for (const e of linked.exprTable ?? []) {
      exprIndex.set(e.id, e);
      if (e.expressionType === 'IsIterator') {
        forOfIndex.set(e.id, e.ast);
      }
    }
    trace.event("bind.indexExprs.complete", { exprCount: exprIndex.size, forOfCount: forOfIndex.size });
    const reportedBadExprs = new Set<ExprId>();

    // Map raw TemplateIR roots → LinkedTemplate (identity preserved by link)
    const domToLinked = new WeakMap<TemplateNode, LinkedTemplate>();
    for (const t of linked.templates) domToLinked.set(t.dom, t);

    // Only the module's *root template* produces a ScopeTemplate; nested templates
    // are traversed via controller defs while staying inside the same frame tree.
    trace.event("bind.buildScopes.start");
    const roots: LinkedTemplate[] = linked.templates.length > 0 ? [linked.templates[0]!] : [];
    for (const t of roots) {
      templates.push(buildTemplateScopes(t, emitter, domToLinked, forOfIndex, exprIndex, reportedBadExprs));
    }
    trace.event("bind.buildScopes.complete");

    // Count frames and symbols
    let frameCount = 0;
    let symbolCount = 0;
    let exprMappingCount = 0;
    for (const t of templates) {
      frameCount += t.frames.length;
      for (const f of t.frames) {
        symbolCount += f.symbols.length;
      }
      exprMappingCount += t.exprToFrame.size;
    }

    // Record output metrics
    trace.setAttributes({
      "bind.frameCount": frameCount,
      "bind.symbolCount": symbolCount,
      "bind.exprMappingCount": exprMappingCount,
      [CompilerAttributes.DIAG_COUNT]: diagCount,
    });

    return { version: "aurelia-scope@1", templates };
  });
}

/* =============================================================================
 * Template traversal
 * ============================================================================= */

function buildTemplateScopes(
  t: LinkedTemplate,
  diagEmitter: BindDiagnosticEmitter,
  domToLinked: WeakMap<TemplateNode, LinkedTemplate>,
  forOfIndex: ReadonlyExprIdMap<ForOfStatement | BadExpression>,
  exprIndex: ReadonlyExprIdMap<ExprTableEntry>,
  reportedBadExprs: Set<ExprId>,
): ScopeTemplate {
  const frames: ScopeFrame[] = [];
  const frameIds = new FrameIdAllocator();
  const exprToFrame: ExprIdMap<FrameId> = new Map();

  // Root frame (component root)
  const rootId = frameIds.allocate();
  frames.push({
    id: rootId,
    parent: null,
    kind: "root",
    overlay: null,
    symbols: [],
    origin: null,
    letValueExprs: null,
  });

  // Walk rows at the root template
  walkRows(t.rows, rootId, frames, frameIds, exprToFrame, diagEmitter, domToLinked, forOfIndex, exprIndex, reportedBadExprs, /*allowLets*/ true);

  return { name: t.name!, frames, root: rootId, exprToFrame };
}

function walkRows(
  rows: LinkedRow[],
  currentFrame: FrameId,
  frames: ScopeFrame[],
  frameIds: FrameIdAllocator,
  exprToFrame: ExprIdMap<FrameId>,
  diagEmitter: BindDiagnosticEmitter,
  domToLinked: WeakMap<TemplateNode, LinkedTemplate>,
  forOfIndex: ReadonlyExprIdMap<ForOfStatement | BadExpression>,
  exprIndex: ReadonlyExprIdMap<ExprTableEntry>,
  reportedBadExprs: Set<ExprId>,
  allowLets: boolean,
): void {
  const badCtx: BadExprContext = { exprIndex, reported: reportedBadExprs, emitter: diagEmitter };
  for (const r of rows) {
    for (const ins of r.instructions) {
      switch (ins.kind) {
        // ---- Bindings with expressions evaluated in the *current* frame ----
        case "propertyBinding":
          mapBindingSource(ins.from, currentFrame, exprToFrame, badCtx);
          break;
        case "attributeBinding":
          mapBindingSource(ins.from, currentFrame, exprToFrame, badCtx);
          break;
        case "stylePropertyBinding":
          mapBindingSource(ins.from, currentFrame, exprToFrame, badCtx);
          break;
        case "listenerBinding":
          reportBadExpression(ins.from, badCtx);
          exprToFrame.set(idOf(ins.from), currentFrame);
          break;
        case "refBinding":
          reportBadExpression(ins.from, badCtx);
          exprToFrame.set(idOf(ins.from), currentFrame);
          break;
        case "textBinding":
          mapBindingSource(ins.from, currentFrame, exprToFrame, badCtx);
          break;
        case "translationBinding":
          // Only map expression source when it's t.bind (not literal t="key")
          if (ins.from) mapBindingSource(ins.from, currentFrame, exprToFrame, badCtx);
          break;

        // ---- Setters (no expressions) ----
        case "setAttribute":
        case "setClassAttribute":
        case "setStyleAttribute":
        case "setProperty":
          break;

        // ---- <let> introduces locals in the current frame ----
        case "hydrateLetElement":
          // Only materialize <let> names into the env when the current traversal context allows it.
          // Reuse-scoped nested templates (if/switch/portal) should not leak their <let> names to the whole frame.
          materializeLetSymbols(ins, currentFrame, frames, exprToFrame, diagEmitter, badCtx, /*publishEnv*/ allowLets);
          break;

        // ---- Standalone iteratorBinding should not appear (repeat packs it as a prop) ----
        case "iteratorBinding":
          // Header evaluated in the outer frame: record the ForOfStatement id.
          exprToFrame.set(ins.forOf.astId, currentFrame);
          // Tail options (aux) also evaluate in the outer frame.
          for (const a of ins.aux) mapBindingSource(a.from, currentFrame, exprToFrame, badCtx);
          break;

        // ---- Template controllers ----
        case "hydrateTemplateController": {
          // For linking controllers (then/catch/pending/else/case/default-case), props are forwarded
          // from parent and should be evaluated in the grandparent frame (parent's outer frame).
          const isLinkingController = !!ins.controller.config.linksTo;
          const propFrame = isLinkingController
            ? frames[currentFrame]?.parent ?? currentFrame
            : currentFrame;

          // 1) Map controller prop expressions at the appropriate frame.
          for (const p of ins.props) {
            switch (p.kind) {
              case "propertyBinding":
                mapBindingSource(p.from, propFrame, exprToFrame, badCtx);
                break;
              case "iteratorBinding":
                exprToFrame.set(p.forOf.astId, propFrame); // header evaluated in outer frame
                for (const a of p.aux) mapBindingSource(a.from, propFrame, exprToFrame, badCtx);
                break;
              case "setProperty":
                // Literal value - no expressions to map
                break;
              case "attributeBinding":
                // Interpolation binding on controller prop
                mapBindingSource(p.from, propFrame, exprToFrame, badCtx);
                break;
              /* c8 ignore next 2 -- type exhaustiveness guard */
              default:
                assertUnreachable(p);
            }
          }
          // Switch branches evaluate in outer frame too
          if (ins.branch && ins.branch.kind === "case") {
            exprToFrame.set(idOf(ins.branch.expr), propFrame);
          }

          // 2) Enter the controller's frame according to semantics.scope
          const nextFrame = enterControllerFrame(ins, currentFrame, frames, frameIds);

          // 3) Populate locals / overlays + record origin metadata
          //    This is CONFIG-DRIVEN: we switch on config properties, not controller names.
          //    This allows userland TCs to get the same behavior as built-ins.
          const config = ins.controller.config;
          const controllerName = ins.res;

          populateControllerFrame(
            ins, config, controllerName, nextFrame, frames, frameIds,
            forOfIndex, diagEmitter
          );

          // 4) Recurse into nested template view using the chosen frame
          const linkedNested = domToLinked.get(ins.def.dom);
          if (linkedNested) {
            // For nested views:
            // - overlay scope (repeat/with/promise): their <let> belong to that overlay frame
            // - reuse scope (if/switch/portal): their <let> must not leak to the whole frame
            const childAllowsLets = ins.controller.config.scope === "overlay";
            walkRows(linkedNested.rows, nextFrame, frames, frameIds, exprToFrame, diagEmitter, domToLinked, forOfIndex, exprIndex, reportedBadExprs, childAllowsLets);
          }
          break;
        }
        case "hydrateElement": {
          for (const p of ins.props) mapLinkedBindable(p, currentFrame, exprToFrame, badCtx);
          if (ins.projections) {
            for (const projection of ins.projections) {
              const linkedProjection = domToLinked.get(projection.def.dom);
              if (linkedProjection) {
                walkRows(
                  linkedProjection.rows,
                  currentFrame,
                  frames,
                  frameIds,
                  exprToFrame,
                  diagEmitter,
                  domToLinked,
                  forOfIndex,
                  exprIndex,
                  reportedBadExprs,
                  allowLets,
                );
              }
            }
          }
          break;
        }
        case "hydrateAttribute": {
          for (const p of ins.props) mapLinkedBindable(p, currentFrame, exprToFrame, badCtx);
          break;
        }
        /* c8 ignore next 2 -- type exhaustiveness guard */
        default:
          assertUnreachable(ins);
      }
    }
  }
}

function enterControllerFrame(
  ctrl: LinkedHydrateTemplateController,
  current: FrameId,
  frames: ScopeFrame[],
  frameIds: FrameIdAllocator,
): FrameId {
  const scope = ctrl.controller.config.scope;
  debug.bind("frame.enter", { controller: ctrl.res, scope, currentFrame: current });

  switch (scope) {
    case "overlay": {
      const id = frameIds.allocate();
      debug.bind("frame.create", { controller: ctrl.res, frameId: id, parent: current });
      frames.push({ id, parent: current, kind: "overlay", overlay: null, symbols: [], origin: null, letValueExprs: null });
      return id;
    }
    case "reuse":
      debug.bind("frame.reuse", { controller: ctrl.res, frameId: current });
      return current;
    default:
      // Future scopes (e.g., 'isolate') — keep traversal alive in MVP.
      return current;
  }
}

/**
 * Populate a controller's frame with locals, contextuals, aliases, and origin metadata.
 *
 * This is ENTIRELY CONFIG-DRIVEN. We switch on config properties (trigger.kind, scope,
 * injects, linksTo), NOT controller names. This enables userland template controllers
 * to get the same scope/typing behavior as built-ins by using matching configs.
 *
 * ## Pattern Mapping
 *
 * | Config Pattern                              | Frame Origin       | Symbols Added                |
 * |---------------------------------------------|--------------------|------------------------------|
 * | trigger.kind="iterator" + scope="overlay"  | iterator           | iteratorLocal, contextual    |
 * | trigger.kind="value" + scope="overlay"     | valueOverlay       | alias (if injects.alias)     |
 * | trigger.kind="value" + linksTo="promise"   | promiseValue       | (parent for branches)        |
 * | trigger.kind="branch" + linksTo="promise"  | promiseBranch      | alias (then/catch)           |
 * | trigger.kind="branch" (non-promise)        | (none)             | (none)                       |
 * | scope="reuse"                              | (none)             | (none)                       |
 */
function populateControllerFrame(
  ins: LinkedHydrateTemplateController,
  config: ControllerConfig,
  controllerName: string,
  targetFrame: FrameId,
  frames: ScopeFrame[],
  _frameIds: FrameIdAllocator,
  forOfIndex: ReadonlyExprIdMap<ForOfStatement | BadExpression>,
  diagEmitter: BindDiagnosticEmitter,
): void {
  // === Stub Propagation ===
  // If the controller config is a stub (from aurelia/unknown-controller in link),
  // we can't reliably extract iterator/value bindings or set up scope correctly.
  // Skip gracefully — the root cause diagnostic was already emitted in link.
  if (isStub(config)) {
    return;
  }

  const span = ins.loc ?? null;

  // === Iterator Pattern ===
  // Controllers with trigger.kind="iterator" (e.g., repeat, virtual-repeat)
  if (config.trigger.kind === "iterator" && config.scope === "overlay") {
    const iter = findIteratorBinding(ins);
    if (!iter) return; // Shouldn't happen if config is correct

    const forOfAstId = iter.forOf.astId;
    const originSpan = normalizeSpanMaybe(iter.forOf.loc ?? span);

    // Set origin for type inference
    setFrameOrigin(targetFrame, frames, {
      kind: "iterator",
      forOfAstId,
      controller: controllerName,
      ...provenanceFromSpan("bind", originSpan, `${controllerName} controller`),
    });

    // Extract locals from ForOfStatement destructuring
    const forOfAst = forOfIndex.get(forOfAstId);
    if (!forOfAst) return;
    if (forOfAst.$kind === "BadExpression") {
      reportDiagnostic(diagEmitter, "aurelia/invalid-binding-pattern", forOfAst.message ?? "Invalid or unsupported iterator header.", {
        span: forOfAst.span,
      });
      return;
    }
    const badPattern = findBadInPattern(forOfAst.declaration);
    if (badPattern) {
      reportDiagnostic(diagEmitter, "aurelia/invalid-binding-pattern", badPattern.message ?? "Invalid or unsupported iterator header.", {
        span: badPattern.span,
      });
      return;
    }

    // Add iterator locals (loop variables)
    const names = bindingNamesFromDeclaration(forOfAst.declaration);
    addUniqueSymbols(
      targetFrame,
      frames,
      names.map(n => ({ kind: "iteratorLocal" as const, name: n, span: iter.forOf.loc ?? null })),
      diagEmitter,
    );

    // Add contextuals from config ($index, $first, etc.)
    for (const c of config.injects?.contextuals ?? []) {
      addUniqueSymbols(targetFrame, frames, [{ kind: "contextual", name: c, span: iter.forOf.loc ?? null }], diagEmitter);
    }
    return;
  }

  // === Promise Branch Pattern ===
  // Controllers that are branches of promise (then, catch)
  const promiseBranchKind = resolvePromiseBranchKind(config);
  if (promiseBranchKind && promiseBranchKind !== "pending" && config.scope === "overlay") {
    const valueProp = findValueBinding(ins);
    const valueExprId = valueProp ? exprIdsOf(valueProp.from)[0] : undefined;
    const originSpan = normalizeSpanMaybe(valueProp?.loc ?? span);

    const branch = ins.branch;
    const authoredAlias = branch && (branch.kind === "then" || branch.kind === "catch")
      ? branch.local
      : null;
    setFrameOrigin(targetFrame, frames, {
      kind: "promiseBranch",
      branch: promiseBranchKind,
      valueExprId,
      controller: controllerName,
      ...provenanceFromSpan("bind", originSpan, `${controllerName} controller`),
    });

    // Add alias symbol (the variable that receives the resolved/rejected value)
    const defaultAlias = config.injects?.alias?.defaultName ?? promiseBranchKind;
    const aliasName = authoredAlias && authoredAlias.length > 0 ? authoredAlias : defaultAlias;
    addUniqueSymbols(targetFrame, frames, [{
      kind: "alias",
      name: aliasName,
      aliasKind: promiseBranchKind,
      span,
    }], diagEmitter);
    return;
  }

  // === Promise Value Pattern ===
  // The promise controller itself (parent of then/catch branches)
  // Identified by: has branches with relationship="child" AND branches include promise-related controllers
  if (config.trigger.kind === "value" && config.scope === "overlay" && isPromiseParentController(config)) {
    const valueProp = findValueBinding(ins);
    const valueExprId = valueProp ? exprIdsOf(valueProp.from)[0] : undefined;
    if (valueExprId) {
      const originSpan = normalizeSpanMaybe(valueProp?.loc ?? span);
      setFrameOrigin(targetFrame, frames, {
        kind: "promiseValue",
        valueExprId,
        controller: controllerName,
        ...provenanceFromSpan("bind", originSpan, `${controllerName} controller`),
      });
    }
    return;
  }

  // === Value Overlay Pattern ===
  // Controllers with trigger.kind="value" + scope="overlay" + injects.alias (e.g., with)
  if (config.trigger.kind === "value" && config.scope === "overlay" && config.injects?.alias) {
    const valueProp = findValueBinding(ins);
    if (!valueProp) return;

    const valueExprId = exprIdsOf(valueProp.from)[0];
    const originSpan = normalizeSpanMaybe(valueProp.loc ?? span);

    // Set overlay base (the value becomes implicit scope)
    setOverlayBase(targetFrame, frames, { kind: "value", from: valueProp.from, span: valueProp.loc ?? null });

    // Set origin for type inference
    if (valueExprId) {
      setFrameOrigin(targetFrame, frames, {
        kind: "valueOverlay",
        valueExprId,
        controller: controllerName,
        ...provenanceFromSpan("bind", originSpan, `${controllerName} controller`),
      });
    }

    // Add alias symbol if configured
    // Note: For 'with', the alias is optional and comes from the authored syntax
    // For now, we don't add an explicit symbol - the overlay base handles scope resolution
    return;
  }

  // === Reuse Scope Pattern ===
  // Controllers with scope="reuse" (if, else, switch, case, default-case, portal)
  // These don't create new frames or add symbols - nothing to do.
}

/** Find the iterator binding in a controller's props. */
function findIteratorBinding(ctrl: LinkedHydrateTemplateController): LinkedIteratorBinding | null {
  for (const p of ctrl.props) {
    if (p.kind === "iteratorBinding") return p;
  }
  return null;
}

/** Find the value property binding in a controller's props. */
function findValueBinding(ctrl: LinkedHydrateTemplateController): LinkedPropertyBinding | null {
  for (const p of ctrl.props) {
    if (p.kind === "propertyBinding" && p.to === "value") return p;
  }
  return null;
}

function setOverlayBase(targetFrame: FrameId, frames: ScopeFrame[], overlay: OverlayBase | null): void {
  const f = frames[targetFrame]!;
  const nextFrame: ScopeFrame = { ...f, overlay };
  frames[targetFrame] = nextFrame;
}

function setFrameOrigin(targetFrame: FrameId, frames: ScopeFrame[], origin: FrameOrigin | null): void {
  const f = frames[targetFrame]!;
  const nextFrame: ScopeFrame = { ...f, origin };
  frames[targetFrame] = nextFrame;
}

function addUniqueSymbols(
  targetFrame: FrameId,
  frames: ScopeFrame[],
  symbols: ScopeSymbol[],
  diagEmitter: BindDiagnosticEmitter,
): void {
  if (symbols.length === 0) return;
  const f = frames[targetFrame]!;
  const existing = new Set(f.symbols.map(s => s.name));
  for (const s of symbols) {
    if (existing.has(s.name)) {
      reportDiagnostic(diagEmitter, "aurelia/invalid-binding-pattern", `Duplicate local '${s.name}' in the same scope.`, {
        span: s.span ?? null,
      });
      continue;
    }
    f.symbols.push(s);
    existing.add(s.name);
  }
}

/* =============================================================================
 * Instruction helpers
 * ============================================================================= */

function materializeLetSymbols(
  ins: LinkedHydrateLetElement,
  currentFrame: FrameId,
  frames: ScopeFrame[],
  exprToFrame: ExprIdMap<FrameId>,
  diagEmitter: BindDiagnosticEmitter,
  badCtx: BadExprContext,
  publishEnv: boolean,
): void {
  // Record each <let> value expr in the current frame and surface names as locals.
  const f = frames[currentFrame]!;
  let map: Record<string, ExprId> = f.letValueExprs ?? createLetValueMap();

  for (const lb of ins.instructions) {
    mapBindingSource(lb.from, currentFrame, exprToFrame, badCtx);
    if (publishEnv) {
      const ids = exprIdsOf(lb.from);
      if (ids.length > 0) {
        map = { ...map, [lb.to]: ids[0]! }; // if interpolation, take first expr id as representative
      }
    }
  }
  if (publishEnv) {
    const nextFrame: ScopeFrame = { ...f, letValueExprs: map };
    frames[currentFrame] = nextFrame;
  }

  // Surface all <let> names as locals in the current frame.
  if (publishEnv) {
    const symbols = ins.instructions.map((lb) => ({
      kind: "let" as const,
      name: lb.to,
      span: normalizeSpanMaybe(lb.loc ?? null),
    }));
    addUniqueSymbols(currentFrame, frames, symbols, diagEmitter);
  }
}

function createLetValueMap(): Record<string, ExprId> {
  const map: Record<string, ExprId> = {};
  Object.setPrototypeOf(map, null);
  return map;
}

/* =============================================================================
 * Expression → Frame mapping
 * ============================================================================= */

function mapLinkedBindable(b: LinkedElementBindable, frame: FrameId, out: ExprIdMap<FrameId>, badCtx: BadExprContext): void {
  switch (b.kind) {
    case "propertyBinding":
    case "attributeBinding":
    case "stylePropertyBinding":
      mapBindingSource(b.from, frame, out, badCtx);
      return;
    case "setProperty":
      return;
    /* c8 ignore next 2 -- type exhaustiveness guard */
    default:
      assertUnreachable(b);
  }
}
function mapBindingSource(src: BindingSourceIR, frame: FrameId, out: ExprIdMap<FrameId>, badCtx: BadExprContext): void {
  forEachExprRef(src, (ref) => reportBadExpression(ref, badCtx));
  for (const id of exprIdsOf(src)) out.set(id, frame);
}

/** Extract all ExprIds from a BindingSourceIR (ExprRef | InterpIR). */
/** Single ExprId from ExprRef. */
function idOf(e: ExprRef): ExprId { return e.id; }

function forEachExprRef(src: BindingSourceIR, cb: (ref: ExprRef) => void): void {
  if (isInterpolation(src)) {
    for (const ref of src.exprs) {
      cb(ref);
    }
    return;
  }
  cb(src);
}

function isInterpolation(src: BindingSourceIR): src is Extract<BindingSourceIR, { kind: "interp" }> {
  return "exprs" in src;
}

type BadExprContext = {
  exprIndex: ReadonlyExprIdMap<ExprTableEntry>;
  reported: Set<ExprId>;
  emitter: BindDiagnosticEmitter;
};

function reportBadExpression(ref: ExprRef, ctx: BadExprContext): void {
  if (ctx.reported.has(ref.id)) return;
  const entry = ctx.exprIndex.get(ref.id);
  if (!entry || entry.expressionType === "IsIterator") return; // repeat headers have bespoke diagnostics
  const ast = entry.ast as { $kind?: string; message?: string; origin?: Origin | Provenance | null } | undefined;
  if (ast?.$kind !== "BadExpression") return;

  ctx.reported.add(ref.id);
  const bad = ast as BadExpression;
  const span = badExpressionSpan(bad, ref);
  const message = bad.message ?? "Invalid or unsupported expression.";
  const parseOrigin = unwrapOrigin(bad.origin ?? null);
  const bindOrigin = preferOrigin(parseOrigin, provenanceFromSpan("bind", span ?? ref.loc ?? null, "invalid expression surfaced during bind").origin ?? null);
  reportDiagnostic(ctx.emitter, "aurelia/expr-parse-error", message, {
    span: span ?? ref.loc ?? null,
    origin: bindOrigin,
    data: { recovery: true },
  });
}

/* =============================================================================
 * repeat.for declaration → local names
 * Uses shared collectBindingNames from expr-utils.ts
 * ============================================================================= */

function bindingNamesFromDeclaration(
  decl: BindingIdentifierOrPattern | DestructuringAssignmentExpression | BadExpression,
): string[] {
  if (decl.$kind === "BadExpression") return [];
  if (decl.$kind === "DestructuringAssignment") {
    return collectBindingNames(decl.pattern);
  }
  return collectBindingNames(decl);
}

// Note: findBadInPattern is now imported from expr-utils.ts

function badExpressionSpan(ast: BadExpression, ref: ExprRef): SourceSpan | null {
  const span = provenanceSpan(ast.origin ?? null) ?? ast.span ?? ref.loc ?? null;
  return normalizeSpanMaybe(span);
}

function unwrapOrigin(source: Origin | Provenance | null): Origin | null {
  if (!source) return null;
  return (source as Origin).kind ? (source as Origin) : (source as Provenance).origin ?? null;
}
