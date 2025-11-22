import type {
  BindingSourceIR,
  ExprId,
  ExprRef,
  ExprTableEntry,
  InterpIR,
  IrModule,
  SourceSpan,
} from "../../model/ir.js";
import type { ScopeModule, FrameId } from "../../model/symbols.js";
import type {
  LinkedInstruction,
  LinkedSemanticsModule,
  TargetSem,
  LinkedElementBindable,
} from "../20-resolve-host/types.js";
import type { TypeRef } from "../../language/registry.js";
import { buildExprSpanIndex, exprIdsOf, indexExprTable } from "../../expr-utils.js";
import { buildFrameAnalysis, typeFromExprAst } from "../shared/type-analysis.js";
import type { CompilerDiagnostic } from "../../diagnostics.js";
import { buildDiagnostic } from "../../diagnostics.js";
import { exprIdMapGet, type ExprIdMap, type ReadonlyExprIdMap } from "../../model/identity.js";
import { buildScopeLookup } from "../shared/scope-lookup.js";

export type TypecheckDiagnostic = CompilerDiagnostic<"AU1301"> & {
  exprId?: ExprId;
  expected?: string;
  actual?: string;
};

export interface TypecheckModule {
  version: "aurelia-typecheck@1";
  inferredByExpr: ExprIdMap<string>;
  expectedByExpr: ExprIdMap<string>;
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
  const exprSpanIndex = buildExprSpanIndex(opts.ir);
  const diags = collectDiagnostics(expectedByExpr, inferredByExpr, exprSpanIndex.spans);

  return { version: "aurelia-typecheck@1", inferredByExpr, expectedByExpr, diags };
}

function collectExpectedTypes(linked: LinkedSemanticsModule): ExprIdMap<string> {
  const expectedByExpr: ExprIdMap<string> = new Map();
  for (const t of linked.templates ?? []) {
    for (const row of t.rows ?? []) {
      for (const ins of row.instructions ?? []) {
        visitInstruction(ins, expectedByExpr);
      }
    }
  }
  return expectedByExpr;
}

function collectInferredTypes(opts: TypecheckOptions): ExprIdMap<string> {
  const inferred: ExprIdMap<string> = new Map();
  const exprIndex = indexExprTable(opts.linked.exprTable as readonly ExprTableEntry[] | undefined);
  const scopeTemplate = opts.scope.templates[0];
  if (!scopeTemplate) return inferred;

  const scope = buildScopeLookup(scopeTemplate);
  const analysis = buildFrameAnalysis(scopeTemplate, exprIndex, opts.rootVmType);

  const resolveEnv = (frameId: FrameId, depth: number) => {
    const ancestor = scope.ancestorOf(frameId, depth);
    return ancestor != null ? analysis.envs.get(ancestor) : undefined;
  };

  for (const [exprId, frameId] of scope.exprToFrame.entries()) {
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
  expected: ReadonlyExprIdMap<string>,
  inferred: ReadonlyExprIdMap<string>,
  spans: ReadonlyExprIdMap<SourceSpan>,
): TypecheckDiagnostic[] {
  const diags: TypecheckDiagnostic[] = [];
  for (const [id, expectedType] of expected.entries()) {
    const actual = exprIdMapGet(inferred, id);
    if (!actual) continue;
    if (!shouldReportMismatch(expectedType, actual)) continue;
    const span = exprIdMapGet(spans as ReadonlyExprIdMap<SourceSpan>, id) ?? null;
    diags.push({
      exprId: id,
      expected: expectedType,
      actual,
      ...buildDiagnostic({
        code: "AU1301",
        message: `Type mismatch: expected ${expectedType}, got ${actual}`,
        span,
        source: "typecheck",
      }),
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

function visitInstruction(ins: LinkedInstruction, expected: ExprIdMap<string>): void {
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
          for (const aux of p.aux) recordExpected(aux.from, targetType(aux.spec?.type ?? undefined), expected);
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

function recordLinkedBindable(b: LinkedElementBindable, expected: ExprIdMap<string>): void {
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

function recordExpected(src: BindingSourceIR | ExprRef | InterpIR, type: string | null | undefined, expected: ExprIdMap<string>): void {
  if (!type) return;
  const ids = exprIdsOf(src);
  for (const id of ids) expected.set(id, type);
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
