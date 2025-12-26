/* =============================================================================
 * PHASE 30 — BIND (Scope Graph)
 * LinkedSemantics -> ScopeModule (pure, deterministic)
 * - Map each expression occurrence to the frame where it is evaluated
 * - Introduce frames for overlay controllers (repeat/with/promise)
 * - Materialize locals: <let>, repeat declaration, repeat contextuals, promise alias
 * - Record provenance to aid later typing/planning
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
  LinkedSemanticsModule, LinkedTemplate, LinkedRow,
  LinkedHydrateTemplateController, LinkedIteratorBinding, LinkedHydrateLetElement, LinkedElementBindable,
} from "../20-resolve/types.js";

import type {
  ScopeModule, ScopeTemplate, ScopeFrame, FrameId, ScopeSymbol, ScopeDiagnostic, ScopeDiagCode, OverlayBase, FrameOrigin,
} from "../../model/symbols.js";

import type { RepeatController } from "../../language/registry.js";
import { FrameIdAllocator, type ExprIdMap, type ReadonlyExprIdMap } from "../../model/identity.js";
import { preferOrigin, provenanceFromSpan, provenanceSpan } from "../../model/origin.js";
import { buildDiagnostic } from "../../shared/diagnostics.js";
import { exprIdsOf } from "../../shared/expr-utils.js";
import { normalizeSpanMaybe } from "../../model/span.js";
import type { Origin, Provenance } from "../../model/origin.js";

function assertUnreachable(_x: never): never { throw new Error("unreachable"); }

/* =============================================================================
 * Public API
 * ============================================================================= */

export function bindScopes(linked: LinkedSemanticsModule): ScopeModule {
  const diags: ScopeDiagnostic[] = [];
  const templates: ScopeTemplate[] = [];

  // Index ForOf entries once
  const exprIndex: ExprIdMap<ExprTableEntry> = new Map();
  const forOfIndex: ExprIdMap<ForOfStatement | BadExpression> = new Map();
  for (const e of linked.exprTable ?? []) {
    exprIndex.set(e.id, e);
    if (e.expressionType === 'IsIterator') {
      forOfIndex.set(e.id, e.ast);
    }
  }
  const reportedBadExprs = new Set<ExprId>();

  // Map raw TemplateIR roots → LinkedTemplate (identity preserved by resolve-host)
  const domToLinked = new WeakMap<TemplateNode, LinkedTemplate>();
  for (const t of linked.templates) domToLinked.set(t.dom, t);

  // Only the module's *root template* produces a ScopeTemplate; nested templates
  // are traversed via controller defs while staying inside the same frame tree.
  const roots: LinkedTemplate[] = linked.templates.length > 0 ? [linked.templates[0]!] : [];
  for (const t of roots) {
    templates.push(buildTemplateScopes(t, diags, domToLinked, forOfIndex, exprIndex, reportedBadExprs));
  }

  return { version: "aurelia-scope@1", templates, diags };
}

/* =============================================================================
 * Template traversal
 * ============================================================================= */

function buildTemplateScopes(
  t: LinkedTemplate,
  diags: ScopeDiagnostic[],
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
  walkRows(t.rows, rootId, frames, frameIds, exprToFrame, diags, domToLinked, forOfIndex, exprIndex, reportedBadExprs, /*allowLets*/ true);

  return { name: t.name!, frames, root: rootId, exprToFrame };
}

function walkRows(
  rows: LinkedRow[],
  currentFrame: FrameId,
  frames: ScopeFrame[],
  frameIds: FrameIdAllocator,
  exprToFrame: ExprIdMap<FrameId>,
  diags: ScopeDiagnostic[],
  domToLinked: WeakMap<TemplateNode, LinkedTemplate>,
  forOfIndex: ReadonlyExprIdMap<ForOfStatement | BadExpression>,
  exprIndex: ReadonlyExprIdMap<ExprTableEntry>,
  reportedBadExprs: Set<ExprId>,
  allowLets: boolean,
): void {
  const badCtx: BadExprContext = { exprIndex, reported: reportedBadExprs, diags };
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
          materializeLetSymbols(ins, currentFrame, frames, exprToFrame, diags, badCtx, /*publishEnv*/ allowLets);
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
          const isPromiseBranch = ins.res === "promise" && !!ins.branch;
          const propFrame = isPromiseBranch ? frames[currentFrame]?.parent ?? currentFrame : currentFrame;

          // 1) Map controller prop expressions at the *outer* frame.
          for (const p of ins.props) {
            switch (p.kind) {
              case "propertyBinding":
                mapBindingSource(p.from, propFrame, exprToFrame, badCtx);
                break;
              case "iteratorBinding":
                exprToFrame.set(p.forOf.astId, propFrame); // header evaluated in outer frame
                for (const a of p.aux) mapBindingSource(a.from, propFrame, exprToFrame, badCtx);
                break;
              default:
                assertUnreachable(p);
            }
          }
          // Switch branches evaluate in outer frame too
          if (ins.branch && ins.branch.kind === "case") {
            exprToFrame.set(idOf(ins.branch.expr), propFrame);
          }

          // 2) Enter the controller's frame according to semantics.scope
          const nextFrame = isPromiseBranch ? currentFrame : enterControllerFrame(ins, currentFrame, frames, frameIds);

          // 3) Populate locals / overlays + record origin metadata
          switch (ins.res) {
            case "repeat": {
              const iter = getIteratorProp(ins);

              // provenance for plan/typecheck
              const forOfAstId = iter.forOf.astId;
              const repeatSpan = normalizeSpanMaybe(iter.forOf.loc ?? ins.loc ?? null);
              setFrameOrigin(nextFrame, frames, { kind: "repeat", forOfAstId, ...provenanceFromSpan("bind", repeatSpan, "repeat controller") });

              // locals/contextuals
              const forOfAst = forOfIndex.get(forOfAstId)!;
              if (forOfAst.$kind === 'BadExpression') {
                addDiag(diags, "AU1201", forOfAst.message ?? "Invalid or unsupported repeat header (could not parse iterator).", forOfAst.span);
                break;
              }
              const badPattern = findBadInPattern(forOfAst.declaration);
              if (badPattern) {
                addDiag(diags, "AU1201", badPattern.message ?? "Invalid or unsupported repeat header (could not parse iterator).", badPattern.span);
                break;
              }
              const names = bindingNamesFromDeclaration(forOfAst.declaration);
              addUniqueSymbols(
                nextFrame,
                frames,
                names.map(n => ({ kind: "repeatLocal" as const, name: n, span: iter.forOf.loc ?? null })),
                diags,
              );
              for (const c of (ins.controller.spec as RepeatController).contextuals) {
                addUniqueSymbols(nextFrame, frames, [{ kind: "repeatContextual", name: c, span: iter.forOf.loc ?? null }], diags);
              }
              break;
            }
            case "with": {
              const valueProp = getValueProp(ins);
              setOverlayBase(nextFrame, frames, { kind: "with", from: valueProp.from, span: valueProp.loc ?? null });
              const ids = exprIdsOf(valueProp.from);
              const [valueExprId] = ids;
              if (valueExprId) {
                const originSpan = normalizeSpanMaybe(valueProp.loc ?? ins.loc ?? null);
                setFrameOrigin(nextFrame, frames, { kind: "with", valueExprId, ...provenanceFromSpan("bind", originSpan, "'with' controller") });
              }
              break;
            }
            case "promise": {
              if (!isPromiseBranch) {
                const valueProp = getValueProp(ins);
                const ids = exprIdsOf(valueProp.from);
                const [valueExprId] = ids;
                if (valueExprId) {
                  const originSpan = normalizeSpanMaybe(valueProp.loc ?? ins.loc ?? null);
                  setFrameOrigin(nextFrame, frames, { kind: "promise", valueExprId, ...provenanceFromSpan("bind", originSpan, "promise controller") });
                }
              }
              if (ins.branch && (ins.branch.kind === "then" || ins.branch.kind === "catch")) {
                const aliasName = ins.branch.local && ins.branch.local.length > 0 ? ins.branch.local : ins.branch.kind;
                addUniqueSymbols(nextFrame, frames, [{ kind: "promiseAlias", name: aliasName, branch: ins.branch.kind, span: ins.loc ?? null }], diags);
              }
              break;
            }
            case "if":
            case "else":
            case "switch":
            case "case":
            case "default-case":
            case "portal":
              // scope === 'reuse' → keep current frame; no overlay / locals.
              // 'else' is a linking controller with no value - linked to preceding 'if' at runtime.
              // 'case' and 'default-case' are children of switch, linked at runtime.
              break;

            default:
              assertUnreachable(ins);
          }

          // 4) Recurse into nested template view using the chosen frame
          const linkedNested = domToLinked.get(ins.def.dom);
          if (linkedNested) {
            // For nested views:
            // - overlay scope (repeat/with/promise): their <let> belong to that overlay frame
            // - reuse scope (if/switch/portal): their <let> must not leak to the whole frame
            const childAllowsLets = ins.controller.spec.scope === "overlay";
            walkRows(linkedNested.rows, nextFrame, frames, frameIds, exprToFrame, diags, domToLinked, forOfIndex, exprIndex, reportedBadExprs, childAllowsLets);
          }
          break;
        }
        case "hydrateElement": {
          for (const p of ins.props) mapLinkedBindable(p, currentFrame, exprToFrame, badCtx);
          break;
        }
        case "hydrateAttribute": {
          for (const p of ins.props) mapLinkedBindable(p, currentFrame, exprToFrame, badCtx);
          break;
        }

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
  switch (ctrl.controller.spec.scope) {
    case "overlay": {
      const id = frameIds.allocate();
      frames.push({ id, parent: current, kind: "overlay", overlay: null, symbols: [], origin: null, letValueExprs: null });
      return id;
    }
    case "reuse":
      return current;
    default:
      // Future scopes (e.g., 'isolate') — keep traversal alive in MVP.
      return current;
  }
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

function addUniqueSymbols(targetFrame: FrameId, frames: ScopeFrame[], symbols: ScopeSymbol[], diags: ScopeDiagnostic[]): void {
  if (symbols.length === 0) return;
  const f = frames[targetFrame]!;
  const existing = new Set(f.symbols.map(s => s.name));
  for (const s of symbols) {
    if (existing.has(s.name)) {
      addDiag(diags, "AU1202", `Duplicate local '${s.name}' in the same scope.`, s.span ?? null);
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
  diags: ScopeDiagnostic[],
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
    const names = ins.instructions.map(lb => lb.to);
    addUniqueSymbols(currentFrame, frames, names.map(n => ({ kind: "let" as const, name: n, span: spanOfLet(ins, n)! })), diags);
  }
}

function createLetValueMap(): Record<string, ExprId> {
  const map: Record<string, ExprId> = {};
  Object.setPrototypeOf(map, null);
  return map;
}

function spanOfLet(ins: LinkedHydrateLetElement, _name: string): SourceSpan | null | undefined {
  // TODO(linker-carry): Thread per-let SourceSpan through LinkedHydrateLetElement if needed.
  return normalizeSpanMaybe(ins.loc ?? null);
}

function getIteratorProp(ctrl: LinkedHydrateTemplateController): LinkedIteratorBinding {
  for (const p of ctrl.props) {
    if (p.kind === "iteratorBinding") return p;
  }
  // Semantics enforces iteratorProp presence on 'repeat'
  throw new Error("repeat controller missing iteratorBinding");
}

type _LinkedValueProp = Extract<LinkedHydrateTemplateController["props"][number], { kind: "propertyBinding" }>;
type _LinkedValuePropCandidate = LinkedHydrateTemplateController["props"][number];

function getValueProp(ctrl: LinkedHydrateTemplateController): _LinkedValueProp {
  const valueProp = ctrl.props.find(isValueProp);
  if (valueProp) return valueProp;
  throw new Error(`${ctrl.res} controller missing 'value' property`);
}

function isValueProp(prop: _LinkedValuePropCandidate): prop is _LinkedValueProp {
  return prop.kind === "propertyBinding" && prop.to === "value";
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
  diags: ScopeDiagnostic[];
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
  addDiag(ctx.diags, "AU1203", message, span ?? ref.loc ?? null, bindOrigin);
}

/* =============================================================================
 * repeat.for declaration → local names (AST-based, shallow by design)
 * ============================================================================= */

function bindingNamesFromDeclaration(
  decl: BindingIdentifierOrPattern | DestructuringAssignmentExpression | BadExpression,
): string[] {
  if (decl.$kind === "BadExpression") return [];
  if (decl.$kind === "DestructuringAssignment") {
    return bindingNamesFromPattern(decl.pattern);
  }
  return bindingNamesFromPattern(decl);
}

function bindingNamesFromPattern(pattern: BindingIdentifierOrPattern): string[] {
  switch (pattern.$kind) {
    case "BadExpression":
      return [];
    case "BindingIdentifier":
      return pattern.name ? [pattern.name] : [];
    case "BindingPatternDefault":
      return bindingNamesFromPattern(pattern.target);
    case "BindingPatternHole":
      return [];
    case "ArrayBindingPattern": {
      const names = pattern.elements.flatMap(bindingNamesFromPattern);
      if (pattern.rest) names.push(...bindingNamesFromPattern(pattern.rest));
      return names;
    }
    case "ObjectBindingPattern": {
      const names = pattern.properties.flatMap(p => bindingNamesFromPattern(p.value));
      if (pattern.rest) names.push(...bindingNamesFromPattern(pattern.rest));
      return names;
    }
    default:
      return assertUnreachable(pattern);
  }
}

function findBadInPattern(pattern: BindingIdentifierOrPattern): BadExpression | null {
  switch (pattern.$kind) {
    case "BadExpression":
      return pattern;
    case "BindingIdentifier":
    case "BindingPatternHole":
      return null;
    case "BindingPatternDefault":
      return findBadInPattern(pattern.target);
    case "ArrayBindingPattern": {
      for (const el of pattern.elements) {
        const bad = findBadInPattern(el);
        if (bad) return bad;
      }
      if (pattern.rest) {
        const bad = findBadInPattern(pattern.rest);
        if (bad) return bad;
      }
      return null;
    }
    case "ObjectBindingPattern": {
      for (const prop of pattern.properties) {
        const bad = findBadInPattern(prop.value);
        if (bad) return bad;
      }
      if (pattern.rest) {
        const bad = findBadInPattern(pattern.rest);
        if (bad) return bad;
      }
      return null;
    }
    default:
      return assertUnreachable(pattern);
  }
}

function badExpressionSpan(ast: BadExpression, ref: ExprRef): SourceSpan | null {
  const span = provenanceSpan(ast.origin ?? null) ?? ast.span ?? ref.loc ?? null;
  return normalizeSpanMaybe(span);
}

function unwrapOrigin(source: Origin | Provenance | null): Origin | null {
  if (!source) return null;
  return (source as Origin).kind ? (source as Origin) : (source as Provenance).origin ?? null;
}

function addDiag(diags: ScopeDiagnostic[], code: ScopeDiagCode, message: string, span?: SourceSpan | null, origin?: Origin | null): void {
  diags.push(buildDiagnostic({ code, message, span, origin: origin ?? null, source: "bind" }) as ScopeDiagnostic);
}
