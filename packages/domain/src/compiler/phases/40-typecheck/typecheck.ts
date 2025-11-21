import type { BindingSourceIR, ExprId, ExprRef, InterpIR } from "../../model/ir.js";
import type {
  LinkedInstruction,
  LinkedSemanticsModule,
  TargetSem,
  LinkedElementBindable,
} from "../20-resolve-host/types.js";
import type { TypeRef } from "../../language/registry.js";

export interface TypecheckModule {
  /** Expected type hints keyed by ExprId. */
  expectedByExpr: Map<ExprId, string>;
}

/** Phase 40 stub: compute expected types from binding targets (best-effort). */
export function typecheck(linked: LinkedSemanticsModule): TypecheckModule {
  const expectedByExpr = new Map<ExprId, string>();

  for (const t of linked.templates ?? []) {
    for (const row of t.rows ?? []) {
      for (const ins of row.instructions ?? []) {
        visitInstruction(ins, expectedByExpr);
      }
    }
  }

  return { expectedByExpr };
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
  for (const id of ids) {
    expected.set(id, type);
  }
}

function exprIdsOf(src: BindingSourceIR | ExprRef | InterpIR): readonly ExprId[] {
  if ((src as InterpIR).kind === "interp") {
    return (src as InterpIR).exprs.map((e) => e.id);
  }
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
