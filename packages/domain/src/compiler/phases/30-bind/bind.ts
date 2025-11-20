/* =============================================================================
 * PHASE 30 — BIND (Scope Graph)
 * LinkedSemantics → ScopeModule (pure, deterministic)
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
  DestructuringAssignmentSingleExpression,
  DestructuringAssignmentRestExpression,
  IsAssign,
  BadExpression,
  BindingIdentifier,
} from "../../model/ir.js";

import type {
  LinkedSemanticsModule, LinkedTemplate, LinkedRow,
  LinkedHydrateTemplateController, LinkedIteratorBinding, LinkedHydrateLetElement,
} from "../20-resolve-host/types.js";

import type {
  ScopeModule, ScopeTemplate, ScopeFrame, FrameId, ScopeSymbol, ScopeDiagnostic,
} from "../../model/symbols.js";

import type { RepeatController } from "../../language/registry.js";

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
  const exprToFrame: Record<string /* ExprId */, FrameId> = Object.create(null);

  // Root frame (component root)
  const rootId = nextFrameId(frames);
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
  walkRows(t.rows, rootId, frames, exprToFrame, diags, domToLinked, forOfIndex, /*allowLets*/ true);

  return { name: t.name!, frames, root: rootId, exprToFrame };
}

function walkRows(
  rows: LinkedRow[],
  currentFrame: FrameId,
  frames: ScopeFrame[],
  exprToFrame: Record<string, FrameId>,
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
          exprToFrame[idOf(ins.from)] = currentFrame;
          break;
        case "refBinding":
          exprToFrame[idOf(ins.from)] = currentFrame;
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
          exprToFrame[ins.forOf.astId] = currentFrame;
          // Tail options (aux) also evaluate in the outer frame.
          for (const a of ins.aux) mapBindingSource(a.from, currentFrame, exprToFrame);
          break;

        // ---- Template controllers ----
        case "hydrateTemplateController": {
          // 1) Map controller prop expressions at the *outer* frame.
          for (const p of ins.props) {
            switch (p.kind) {
              case "propertyBinding":
                mapBindingSource(p.from, currentFrame, exprToFrame);
                break;
              case "iteratorBinding":
                exprToFrame[p.forOf.astId] = currentFrame; // header evaluated in outer frame
                for (const a of p.aux) mapBindingSource(a.from, currentFrame, exprToFrame);
                break;
              default:
                assertUnreachable(p);
            }
          }
          // Switch branches evaluate in outer frame too
          if (ins.branch && ins.branch.kind === "case") {
            exprToFrame[idOf(ins.branch.expr)] = currentFrame;
          }

          // 2) Enter the controller's frame according to semantics.scope
          const nextFrame = enterControllerFrame(ins, currentFrame, frames);

          // 3) Populate locals / overlays + record origin metadata
          switch (ins.res) {
            case "repeat": {
              const iter = getIteratorProp(ins);

              // provenance for plan/typecheck
              const forOfAstId = iter.forOf.astId;
              frames[nextFrame] = { ...frames[nextFrame], origin: { kind: "repeat", forOfAstId } } as ScopeFrame;

              // locals/contextuals
              const forOfAst = forOfIndex.get(forOfAstId)!;
              if (forOfAst.$kind === 'BadExpression') {
                diags.push({
                  code: "AU1201",
                  message: forOfAst.message ?? "Invalid or unsupported repeat header (could not parse iterator).",
                  span: forOfAst.span
                })
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
              if (ids.length > 0) {
                frames[nextFrame] = { ...frames[nextFrame], origin: { kind: "with", valueExprId: ids[0] } } as ScopeFrame;;
              }
              break;
            }
            case "promise": {
              const valueProp = getValueProp(ins);
              setOverlayBase(nextFrame, frames, { kind: "promise", from: valueProp.from, span: valueProp.loc ?? null });
              const ids = exprIdsOf(valueProp.from);
              const branch = ins.branch && (ins.branch.kind === "then" || ins.branch.kind === "catch") ? ins.branch.kind : undefined;
              if (ids.length > 0) {
                frames[nextFrame] = { ...frames[nextFrame], origin: { kind: "promise", valueExprId: ids[0], branch } } as ScopeFrame;;
              }
              // Promise alias (then/catch): surface as local if present.
              if (ins.branch && (ins.branch.kind === "then" || ins.branch.kind === "catch")) {
                if (ins.branch.local && ins.branch.local.length > 0) {
                  addUniqueSymbols(nextFrame, frames, [{ kind: "promiseAlias", name: ins.branch.local, span: ins.loc ?? null }], diags);
                }
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
            walkRows(linkedNested.rows, nextFrame, frames, exprToFrame, diags, domToLinked, forOfIndex, childAllowsLets);
          }
          break;
        }

        default:
          assertUnreachable(ins);
      }
    }
  }
}

/* =============================================================================
 * Frame management
 * ============================================================================= */

function nextFrameId(frames: ScopeFrame[]): FrameId {
  return frames.length as FrameId;
}

function enterControllerFrame(
  ctrl: LinkedHydrateTemplateController,
  current: FrameId,
  frames: ScopeFrame[],
): FrameId {
  switch (ctrl.controller.spec.scope) {
    case "overlay": {
      const id = nextFrameId(frames);
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
  frames[targetFrame] = { ...f, overlay } as ScopeFrame;;
}

function addUniqueSymbols(targetFrame: FrameId, frames: ScopeFrame[], symbols: ScopeSymbol[], diags: ScopeDiagnostic[]): void {
  if (symbols.length === 0) return;
  const f = frames[targetFrame]!;
  const existing = new Set(f.symbols.map(s => s.name));
  for (const s of symbols) {
    if (existing.has(s.name)) {
      diags.push({ code: "AU1202", message: `Duplicate local '${s.name}' in the same scope.`, span: s.span ?? null });
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
  exprToFrame: Record<string, FrameId>,
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

function mapBindingSource(src: BindingSourceIR, frame: FrameId, out: Record<string, FrameId>): void {
  for (const id of exprIdsOf(src)) out[id] = frame;
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
  decl: BindingIdentifierOrPattern | DestructuringAssignmentExpression,
): string[] {
  switch (decl.$kind) {
    case "BindingIdentifier":
      return [decl.name];

    case "ArrayBindingPattern":
      // Elements are parsed under etNone → IsAssign (AccessScope | Assign | ...)
      return decl.elements.flatMap(bindingNamesFromPatternValue);

    case "ObjectBindingPattern":
      // Keys are irrelevant here; values carry the local names or defaulted locals
      return decl.values.flatMap(bindingNamesFromPatternValue);

    case "ArrayDestructuring":
    case "ObjectDestructuring":
      return namesFromDestructuringAssignment(decl);

    default:
      return assertUnreachable(decl as never);
  }
}

/** Extract a local from a single pattern slot (array/object value). */
function bindingNamesFromPatternValue(v: IsAssign | BindingIdentifier): string[] {
  switch (v.$kind) {
    case "BindingIdentifier":
    case "AccessScope": {
      const name = v.name;
      return name ? [name] : [];
    }
    case "Assign": {
      const a = v;
      return a.target.$kind === "AccessScope" ? [a.target.name] : [];
    }
    // Other IsAssign cases (literals, calls, etc.) do not introduce names
    default:
      return [];
  }
}

/** Flatten nested destructuring assignment lists into target names. */
function namesFromDestructuringAssignment(
  node: DestructuringAssignmentExpression | DestructuringAssignmentSingleExpression | DestructuringAssignmentRestExpression,
): string[] {
  switch (node.$kind) {
    case "ArrayDestructuring":
    case "ObjectDestructuring":
      return node.list.flatMap(namesFromDestructuringAssignment);
    case "DestructuringAssignmentLeaf":
      // Both Single/Rest leaves share this $kind; target is AccessMemberExpression(name)
      return [node.target.name];
    default:
      return assertUnreachable(node as never);
  }
}
