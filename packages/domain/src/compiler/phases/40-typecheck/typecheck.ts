import type {
  BindingSourceIR,
  ExprId,
  ExprRef,
  ExprTableEntry,
  InterpIR,
  IrModule,
  SourceSpan,
} from "../../model/ir.js";
import type { ScopeModule, ScopeFrame, FrameId } from "../../model/symbols.js";
import type {
  LinkedInstruction,
  LinkedSemanticsModule,
  TargetSem,
  LinkedElementBindable,
} from "../20-resolve-host/types.js";
import type { TypeRef } from "../../language/registry.js";
import { collectExprSpans } from "../../expr-utils.js";
import { buildFrameAnalysis, typeFromExprAst } from "../shared/type-analysis.js";

export interface TypecheckDiagnostic {
  code: "AU1301";
  message: string;
  exprId?: ExprId;
  span?: SourceSpan | null;
  expected?: string;
  actual?: string;
}

export interface TypecheckModule {
  version: "aurelia-typecheck@1";
  inferredByExpr: Map<ExprId, string>;
  expectedByExpr: Map<ExprId, string>;
  diags: TypecheckDiagnostic[];
}

export interface TypecheckOptions {
  linked: LinkedSemanticsModule;
  scope: ScopeModule;
  ir: IrModule;
  rootVmType: string;
}

/** Phase 40: derive expected + inferred types and surface lightweight diagnostics. */
export function typecheck(opts: TypecheckOptions): TypecheckModule {
  const expectedByExpr = collectExpectedTypes(opts.linked);
  const inferredByExpr = collectInferredTypes(opts);
  const diags = collectDiagnostics(expectedByExpr, inferredByExpr, collectExprSpans(opts.ir));

  return { version: "aurelia-typecheck@1", inferredByExpr, expectedByExpr, diags };
}

function collectExpectedTypes(linked: LinkedSemanticsModule): Map<ExprId, string> {
  const expectedByExpr = new Map<ExprId, string>();
  for (const t of linked.templates ?? []) {
    for (const row of t.rows ?? []) {
      for (const ins of row.instructions ?? []) {
        visitInstruction(ins, expectedByExpr);
      }
    }
  }
  return expectedByExpr;
}

function collectInferredTypes(opts: TypecheckOptions): Map<ExprId, string> {
  const inferred = new Map<ExprId, string>();
  const exprIndex = indexExprTable(opts.linked.exprTable as readonly ExprTableEntry[] | undefined);
  const scopeTemplate = opts.scope.templates[0];
  if (!scopeTemplate) return inferred;

  const analysis = buildFrameAnalysis(scopeTemplate, exprIndex, opts.rootVmType);
  const frameById = new Map<FrameId, ScopeFrame>();
  for (const f of scopeTemplate.frames) frameById.set(f.id, f);

  const resolveEnv = (frameId: FrameId, depth: number) => {
    let id: FrameId | null = frameId;
    let steps = depth;
    while (steps > 0 && id != null) {
      id = frameById.get(id!)?.parent ?? null;
      steps--;
    }
    return id != null ? analysis.envs.get(id) : undefined;
  };

  for (const [exprIdStr, frameId] of Object.entries(scopeTemplate.exprToFrame)) {
    const exprId = exprIdStr as ExprId;
    const entry = exprIndex.get(exprId);
    if (!entry) continue;
    if (entry.expressionType !== "IsProperty" && entry.expressionType !== "IsFunction") continue;
    const type = typeFromExprAst(entry.ast as any, {
      rootVm: opts.rootVmType,
      resolveEnv: (depth: number) => resolveEnv(frameId, depth),
    });
    inferred.set(exprId, type);
  }

  return inferred;
}

function collectDiagnostics(
  expected: Map<ExprId, string>,
  inferred: Map<ExprId, string>,
  spans: Map<ExprId, SourceSpan>,
): TypecheckDiagnostic[] {
  const diags: TypecheckDiagnostic[] = [];
  for (const [id, expectedType] of expected.entries()) {
    const actual = inferred.get(id);
    if (!actual) continue;
    if (!shouldReportMismatch(expectedType, actual)) continue;
    diags.push({
      code: "AU1301",
      message: `Type mismatch: expected ${expectedType}, got ${actual}`,
      exprId: id,
      span: spans.get(id) ?? null,
      expected: expectedType,
      actual,
    });
  }
  return diags;
}

function shouldReportMismatch(expected: string, actual: string): boolean {
  const e = normalizeType(expected);
  const a = normalizeType(actual);
  if (e === "unknown" || e === "any" || a === "unknown" || a === "any") return false;
  return e !== a;
}

function normalizeType(t: string): string {
  return t.replace(/[\s()]/g, "");
}

function visitInstruction(ins: LinkedInstruction, expected: Map<ExprId, string>): void {
  switch (ins.kind) {
    case "propertyBinding":
    case "attributeBinding":
    case "stylePropertyBinding":
      recordExpected(ins.from, targetType(ins.target), expected);
      break;
    case "listenerBinding":
      recordExpected(ins.from, "Function", expected);
      break;
    case "textBinding":
      recordExpected(ins.from, "unknown", expected);
      break;
    case "hydrateElement":
    case "hydrateAttribute":
      for (const p of ins.props ?? []) recordLinkedBindable(p, expected);
      break;
    case "hydrateTemplateController": {
      for (const p of ins.props ?? []) {
        if (p.kind === "iteratorBinding") {
          expected.set(p.forOf.astId, "Iterable<unknown>");
          for (const aux of p.aux) recordExpected(aux.from, targetType(aux.spec?.type), expected);
        } else {
          recordExpected(p.from, targetType(p.target), expected);
        }
      }
      break;
    }
    case "hydrateLetElement":
      for (const lb of ins.instructions ?? []) recordExpected(lb.from, "unknown", expected);
      break;
    default:
      break;
  }
}

function recordLinkedBindable(b: LinkedElementBindable, expected: Map<ExprId, string>): void {
  switch (b.kind) {
    case "propertyBinding":
    case "attributeBinding":
    case "stylePropertyBinding":
      recordExpected(b.from, targetType(b.target), expected);
      break;
    default:
      break;
  }
}

function recordExpected(src: BindingSourceIR | ExprRef | InterpIR, type: string | null | undefined, expected: Map<ExprId, string>): void {
  if (!type) return;
  const ids = exprIdsOf(src);
  for (const id of ids) expected.set(id, type);
}

function exprIdsOf(src: BindingSourceIR | ExprRef | InterpIR): readonly ExprId[] {
  if ((src as InterpIR).kind === "interp") return (src as InterpIR).exprs.map((e) => e.id);
  return [(src as ExprRef).id];
}

function targetType(target: TargetSem | TypeRef | { kind: "style" } | undefined): string | null {
  if (!target) return null;
  if (isTypeRef(target)) return typeRefToString(target);
  switch (target.kind) {
    case "element.bindable":
      return typeRefToString(target.bindable.type);
    case "attribute.bindable":
      return typeRefToString(target.bindable.type);
    case "controller.prop":
      return typeRefToString(target.bindable.type);
    case "element.nativeProp":
      return typeRefToString(target.prop.type);
    case "style":
      return "string";
    default:
      return "unknown";
  }
}

function isTypeRef(x: unknown): x is TypeRef {
  if (!x || typeof x !== "object") return false;
  const k = (x as { kind?: unknown }).kind;
  return k === "ts" || k === "any" || k === "unknown";
}

function typeRefToString(t: TypeRef | undefined): string {
  if (!t) return "unknown";
  switch (t.kind) {
    case "ts": return t.name;
    case "any": return "any";
    case "unknown": return "unknown";
    default: return "unknown";
  }
}

function indexExprTable(table: readonly ExprTableEntry[] | undefined): ReadonlyMap<ExprId, ExprTableEntry> {
  const m = new Map<ExprId, ExprTableEntry>();
  if (!table) return m;
  for (const e of table) m.set(e.id, e);
  return m;
}
