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
  BindingSourceIR, InterpIR, ExprRef,
  TemplateNode,
  ForOfStatement,
  BindingIdentifierOrPattern,
  DestructuringAssignmentExpression,
  BadExpression,
} from "../../model/ir.js";

import type {
  LinkedSemanticsModule, LinkedTemplate, LinkedRow,
  LinkedHydrateTemplateController, LinkedIteratorBinding, LinkedHydrateLetElement, LinkedHydrateElement, LinkedHydrateAttribute, LinkedElementBindable,
} from "../20-resolve-host/types.js";

import type {
  ScopeModule, ScopeTemplate, ScopeFrame, FrameId, ScopeSymbol, ScopeDiagnostic, ScopeDiagCode,
} from "../../model/symbols.js";

import type { RepeatController } from "../../language/registry.js";
import { FrameIdAllocator, type ExprIdMap } from "../../model/identity.js";
import { originFromSpan, provenanceFromSpan } from "../../model/origin.js";

function assertUnreachable(x: never): never { throw new Error("unreachable"); }

/* =============================================================================
 * Public API
 * ============================================================================= */

export function bindScopes(linked: LinkedSemanticsModule): ScopeModule {
  const diags: ScopeDiagnostic[] = [];
  const templates: ScopeTemplate[] = [];

  // Index ForOf entries once
  const forOfIndex = new Map<ExprId, ForOfStatement | BadExpression>();
  for (const e of linked.exprTable ?? []) {
    if (e.expressionType === 'IsIterator') {
      forOfIndex.set(e.id, e.ast);
    }
  }

  // Map raw TemplateIR roots → LinkedTemplate (identity preserved by resolve-host)
  const domToLinked = new WeakMap<TemplateNode, LinkedTemplate>();
  for (const t of linked.templates) domToLinked.set(t.dom, t);

  // Only the module's *root template* produces a ScopeTemplate; nested templates
  // are traversed via controller defs while staying inside the same frame tree.
  const roots: LinkedTemplate[] = linked.templates.length > 0 ? [linked.templates[0]!] : [];
  for (const t of roots) {
    templates.push(buildTemplateScopes(t, diags, domToLinked, forOfIndex));
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
  forOfIndex: ReadonlyMap<ExprId, ForOfStatement | BadExpression>,
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
  walkRows(t.rows, rootId, frames, frameIds, exprToFrame, diags, domToLinked, forOfIndex, /*allowLets*/ true);

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
  forOfIndex: ReadonlyMap<ExprId, ForOfStatement | BadExpression>,
  allowLets: boolean,
): void {
  for (const r of rows) {
    for (const ins of r.instructions) {
      switch (ins.kind) {
        // ---- Bindings with expressions evaluated in the *current* frame ----
        case "propertyBinding":
          mapBindingSource(ins.from, currentFrame, exprToFrame);
          break;
        case "attributeBinding":
          mapBindingSource(ins.from, currentFrame, exprToFrame);
          break;
        case "stylePropertyBinding":
          mapBindingSource(ins.from, currentFrame, exprToFrame);
          break;
        case "listenerBinding":
          exprToFrame.set(idOf(ins.from), currentFrame);
          break;
        case "refBinding":
          exprToFrame.set(idOf(ins.from), currentFrame);
          break;
        case "textBinding":
          mapBindingSource(ins.from, currentFrame, exprToFrame);
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
          materializeLetSymbols(ins, currentFrame, frames, exprToFrame, diags, /*publishEnv*/ allowLets);
          break;

        // ---- Standalone iteratorBinding should not appear (repeat packs it as a prop) ----
        case "iteratorBinding":
          // Header evaluated in the outer frame: record the ForOfStatement id.
          exprToFrame.set(ins.forOf.astId, currentFrame);
          // Tail options (aux) also evaluate in the outer frame.
          for (const a of ins.aux) mapBindingSource(a.from, currentFrame, exprToFrame);
          break;

        // ---- Template controllers ----
        case "hydrateTemplateController": {
          const isPromiseBranch = ins.res === "promise" && !!ins.branch;
          const propFrame = isPromiseBranch ? frames[currentFrame]?.parent ?? currentFrame : currentFrame;

          // 1) Map controller prop expressions at the *outer* frame.
          for (const p of ins.props) {
            switch (p.kind) {
              case "propertyBinding":
                mapBindingSource(p.from, propFrame, exprToFrame);
                break;
              case "iteratorBinding":
                exprToFrame.set(p.forOf.astId, propFrame); // header evaluated in outer frame
                for (const a of p.aux) mapBindingSource(a.from, propFrame, exprToFrame);
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
              const repeatSpan = iter.forOf.loc ?? ins.loc ?? null;
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
                const originSpan = valueProp.loc ?? ins.loc ?? null;
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
                  const originSpan = valueProp.loc ?? ins.loc ?? null;
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
            case "switch":
            case "portal":
              // scope === 'reuse' → keep current frame; no overlay / locals.
              break;

            default:
              assertUnreachable(ins as never);
          }

          // 4) Recurse into nested template view using the chosen frame
          const linkedNested = domToLinked.get(ins.def.dom);
          if (linkedNested) {
            // For nested views:
            // - overlay scope (repeat/with/promise): their <let> belong to that overlay frame
            // - reuse scope (if/switch/portal): their <let> must not leak to the whole frame
            const childAllowsLets = ins.controller.spec.scope === "overlay";
            walkRows(linkedNested.rows, nextFrame, frames, frameIds, exprToFrame, diags, domToLinked, forOfIndex, childAllowsLets);
          }
          break;
        }
        case "hydrateElement": {
          for (const p of ins.props) mapLinkedBindable(p, currentFrame, exprToFrame);
          break;
        }
        case "hydrateAttribute": {
          for (const p of ins.props) mapLinkedBindable(p, currentFrame, exprToFrame);
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

function setOverlayBase(targetFrame: FrameId, frames: ScopeFrame[], overlay: ScopeFrame["overlay"]): void {
  const f = frames[targetFrame];
  frames[targetFrame] = { ...f, overlay } as ScopeFrame;
}

function setFrameOrigin(targetFrame: FrameId, frames: ScopeFrame[], origin: ScopeFrame["origin"]): void {
  const f = frames[targetFrame];
  frames[targetFrame] = { ...f, origin } as ScopeFrame;
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
  publishEnv: boolean,
): void {
  // Record each <let> value expr in the current frame and surface names as locals.
  const f = frames[currentFrame]!;
  let map = f.letValueExprs ?? (Object.create(null) as Record<string, ExprId>);

  for (const lb of ins.instructions) {
    mapBindingSource(lb.from, currentFrame, exprToFrame);
    if (publishEnv) {
      const ids = exprIdsOf(lb.from);
      if (ids.length > 0) {
        map = { ...map, [lb.to]: ids[0]! }; // if interpolation, take first expr id as representative
      }
    }
  }
  if (publishEnv) {
    frames[currentFrame] = { ...f, letValueExprs: map } as ScopeFrame;
  }

  // Surface all <let> names as locals in the current frame.
  if (publishEnv) {
    const names = ins.instructions.map(lb => lb.to);
    addUniqueSymbols(currentFrame, frames, names.map(n => ({ kind: "let" as const, name: n, span: spanOfLet(ins, n)! })), diags);
  }
}

function spanOfLet(ins: LinkedHydrateLetElement, _name: string): SourceSpan | null | undefined {
  // TODO(linker-carry): Thread per-let SourceSpan through LinkedHydrateLetElement if needed.
  return ins.loc ?? null;
}

function getIteratorProp(ctrl: LinkedHydrateTemplateController): LinkedIteratorBinding {
  for (const p of ctrl.props) {
    if (p.kind === "iteratorBinding") return p;
  }
  // Semantics enforces iteratorProp presence on 'repeat'
  throw new Error("repeat controller missing iteratorBinding");
}

type _LinkedValueProp = Extract<LinkedHydrateTemplateController["props"][number], { kind: "propertyBinding" }>;

function getValueProp(ctrl: LinkedHydrateTemplateController): _LinkedValueProp {
  for (const p of ctrl.props) {
    if (p.kind === "propertyBinding" && p.to === "value") return p as _LinkedValueProp;
  }
  throw new Error(`${ctrl.res} controller missing 'value' property`);
}

/* =============================================================================
 * Expression → Frame mapping
 * ============================================================================= */

function mapLinkedBindable(b: LinkedElementBindable, frame: FrameId, out: ExprIdMap<FrameId>): void {
  switch (b.kind) {
    case "propertyBinding":
    case "attributeBinding":
    case "stylePropertyBinding":
      mapBindingSource(b.from, frame, out);
      return;
    case "setProperty":
      return;
    default:
      assertUnreachable(b as never);
  }
}
function mapBindingSource(src: BindingSourceIR, frame: FrameId, out: ExprIdMap<FrameId>): void {
  for (const id of exprIdsOf(src)) out.set(id, frame);
}

/** Extract all ExprIds from a BindingSourceIR (ExprRef | InterpIR). */
function exprIdsOf(src: BindingSourceIR): readonly ExprId[] {
  return isInterp(src) ? src.exprs.map(e => e.id) : [ (src as ExprRef).id ];
}
function isInterp(x: BindingSourceIR): x is InterpIR {
  return (x as InterpIR).kind === "interp";
}

/** Single ExprId from ExprRef. */
function idOf(e: ExprRef): ExprId { return e.id; }

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
      return assertUnreachable(pattern as never);
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
      return assertUnreachable(pattern as never);
  }
}

function addDiag(diags: ScopeDiagnostic[], code: ScopeDiagCode, message: string, span?: SourceSpan | null): void {
  diags.push({ code, message, span: span ?? null, origin: originFromSpan("bind", span ?? null), source: "bind", severity: "error" });
}
