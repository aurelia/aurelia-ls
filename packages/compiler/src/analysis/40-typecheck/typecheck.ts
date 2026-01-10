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
} from "../20-resolve/types.js";
import type { TypeRef } from "../../language/registry.js";
import { buildExprSpanIndex, exprIdsOf, indexExprTable } from "../../shared/expr-utils.js";
import { buildFrameAnalysis, typeFromExprAst } from "../shared/type-analysis.js";
import type { CompilerDiagnostic } from "../../shared/diagnostics.js";
import { buildDiagnostic } from "../../shared/diagnostics.js";
import { exprIdMapGet, type ExprIdMap, type ReadonlyExprIdMap } from "../../model/identity.js";
import { buildScopeLookup } from "../shared/scope-lookup.js";
import { isStub } from "../../shared/diagnosed.js";
import {
  type TypecheckConfig,
  type TypecheckSeverity,
  type BindingContext,
  resolveTypecheckConfig,
  checkTypeCompatibility,
} from "./config.js";
import { NOOP_TRACE, CompilerAttributes, type CompileTrace } from "../../shared/trace.js";
import { debug } from "../../shared/debug.js";

// Re-export config types for consumers
export type { TypecheckConfig, TypecheckSeverity, BindingContext, TypeCompatibilityResult } from "./config.js";
export { resolveTypecheckConfig, DEFAULT_TYPECHECK_CONFIG, TYPECHECK_PRESETS, checkTypeCompatibility } from "./config.js";

/** Diagnostic codes for typecheck phase */
export type TypecheckDiagCode = "AU1301" | "AU1302" | "AU1303";

export type TypecheckDiagnostic = CompilerDiagnostic<TypecheckDiagCode> & {
  exprId?: ExprId;
  expected?: string;
  actual?: string;
  severity: TypecheckSeverity;
};

export interface TypecheckModule {
  version: "aurelia-typecheck@1";
  inferredByExpr: ExprIdMap<string>;
  expectedByExpr: ExprIdMap<string>;
  diags: TypecheckDiagnostic[];
  /** The resolved config used for this typecheck run */
  config: TypecheckConfig;
}

export interface TypecheckOptions {
  linked: LinkedSemanticsModule;
  scope: ScopeModule;
  ir: IrModule;
  rootVmType: string;
  /** Optional typecheck configuration. Uses lenient defaults if not provided. */
  config?: Partial<TypecheckConfig>;
  /** Optional trace for instrumentation. Defaults to NOOP_TRACE. */
  trace?: CompileTrace;
}

/** Phase 40: derive expected + inferred types and surface lightweight diagnostics. */
export function typecheck(opts: TypecheckOptions): TypecheckModule {
  const trace = opts.trace ?? NOOP_TRACE;

  return trace.span("typecheck", () => {
    const config = resolveTypecheckConfig(opts.config);

    trace.setAttributes({
      [CompilerAttributes.TEMPLATE]: opts.linked.templates[0]?.name ?? "<unknown>",
      "typecheck.enabled": config.enabled,
      "typecheck.rootVm": opts.rootVmType,
    });

    // Early exit if type checking is disabled
    if (!config.enabled) {
      debug.typecheck("disabled", { reason: "config.enabled=false" });
      trace.event("typecheck.disabled");
      return {
        version: "aurelia-typecheck@1",
        inferredByExpr: new Map(),
        expectedByExpr: new Map(),
        diags: [],
        config,
      };
    }

    debug.typecheck("start", { rootVmType: opts.rootVmType });

    // Collect expected types from linked semantics
    trace.event("typecheck.collectExpected.start");
    const expectedInfo = collectExpectedTypes(opts.linked);
    trace.event("typecheck.collectExpected.complete", { count: expectedInfo.size });
    debug.typecheck("expected.collected", { count: expectedInfo.size });

    // Collect inferred types from expression ASTs
    trace.event("typecheck.collectInferred.start");
    const inferredByExpr = collectInferredTypes(opts);
    trace.event("typecheck.collectInferred.complete", { count: inferredByExpr.size });
    debug.typecheck("inferred.collected", { count: inferredByExpr.size });

    // Build span index and collect diagnostics
    trace.event("typecheck.diagnostics.start");
    const exprSpanIndex = buildExprSpanIndex(opts.ir);
    const diags = collectDiagnostics(expectedInfo, inferredByExpr, exprSpanIndex.spans, config);
    trace.event("typecheck.diagnostics.complete", { count: diags.length });

    // Extract just the types for the module output (without context)
    const expectedByExpr: ExprIdMap<string> = new Map();
    for (const [id, info] of expectedInfo.entries()) {
      expectedByExpr.set(id, info.type);
    }

    // Record output metrics
    trace.setAttributes({
      "typecheck.expectedCount": expectedByExpr.size,
      "typecheck.inferredCount": inferredByExpr.size,
      [CompilerAttributes.DIAG_COUNT]: diags.length,
      [CompilerAttributes.DIAG_ERROR_COUNT]: diags.filter(d => d.severity === "error").length,
      [CompilerAttributes.DIAG_WARNING_COUNT]: diags.filter(d => d.severity === "warning").length,
    });

    return { version: "aurelia-typecheck@1", inferredByExpr, expectedByExpr, diags, config };
  });
}

/** Expected type info with binding context for coercion rules. */
interface ExpectedTypeInfo {
  type: string;
  context: BindingContext;
}

function collectExpectedTypes(linked: LinkedSemanticsModule): ExprIdMap<ExpectedTypeInfo> {
  const expectedByExpr: ExprIdMap<ExpectedTypeInfo> = new Map();
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
    const type = typeFromExprAst(entry.ast, {
      rootVm: opts.rootVmType,
      resolveEnv: (depth: number) => resolveEnv(frameId, depth),
    });
    inferred.set(exprId, type);
  }

  return inferred;
}

function collectDiagnostics(
  expected: ReadonlyExprIdMap<ExpectedTypeInfo>,
  inferred: ReadonlyExprIdMap<string>,
  spans: ReadonlyExprIdMap<SourceSpan>,
  config: TypecheckConfig,
): TypecheckDiagnostic[] {
  const diags: TypecheckDiagnostic[] = [];

  for (const [id, expectedInfo] of expected.entries()) {
    const actual = exprIdMapGet(inferred, id);
    if (!actual) continue;

    const result = checkTypeCompatibility(
      actual,
      expectedInfo.type,
      expectedInfo.context,
      config,
    );

    // Skip if compatible or severity is off
    if (result.compatible || result.severity === "off") continue;

    debug.typecheck("mismatch", {
      exprId: id,
      expected: expectedInfo.type,
      actual,
      severity: result.severity,
      context: expectedInfo.context,
    });

    const span = exprIdMapGet(spans, id) ?? null;
    const code = severityToCode(result.severity);
    const message = result.reason ?? `Type mismatch: expected ${expectedInfo.type}, got ${actual}`;

    const diag = buildDiagnostic({
      code,
      message,
      span,
      source: "typecheck",
      severity: result.severity,
    });

    diags.push({
      ...diag,
      exprId: id,
      expected: expectedInfo.type,
      actual,
      severity: result.severity,
    });
  }

  return diags;
}

/**
 * Map severity to diagnostic code.
 * AU1301 = error, AU1302 = warning, AU1303 = info
 */
function severityToCode(severity: TypecheckSeverity): TypecheckDiagCode {
  switch (severity) {
    case "error": return "AU1301";
    case "warning": return "AU1302";
    case "info": return "AU1303";
    default: return "AU1301";
  }
}

function visitInstruction(ins: LinkedInstruction, expected: ExprIdMap<ExpectedTypeInfo>): void {
  switch (ins.kind) {
    case "propertyBinding":
      recordExpected(ins.from, targetType(ins.target), contextFromTarget(ins.target), expected, ins.target);
      break;
    case "attributeBinding":
      recordExpected(ins.from, targetType(ins.target), "dom.attribute", expected, ins.target);
      break;
    case "stylePropertyBinding":
      recordExpected(ins.from, targetType(ins.target), "style.property", expected, ins.target);
      break;
    case "listenerBinding":
      // Listeners don't have a resolvable target type - just check function
      recordExpected(ins.from, "Function", "dom.property", expected);
      break;
    case "textBinding":
      // Text bindings accept anything (coerced to string) - no type constraint
      recordExpected(ins.from, "unknown", "dom.property", expected);
      break;
    case "hydrateElement":
    case "hydrateAttribute":
      for (const p of ins.props ?? []) recordLinkedBindable(p, expected);
      break;
    case "hydrateTemplateController": {
      for (const p of ins.props ?? []) {
        switch (p.kind) {
          case "iteratorBinding":
            // Iterator source must be iterable (skip if stubbed)
            if (!isStub(p.forOf)) {
              expected.set(p.forOf.astId, { type: "Iterable<unknown>", context: "component.bindable" });
            }
            for (const aux of p.aux) {
              recordExpected(aux.from, targetType(aux.spec?.type ?? undefined), "component.bindable", expected);
            }
            break;
          case "propertyBinding":
          case "attributeBinding":
            recordExpected(p.from, targetType(p.target), "component.bindable", expected, p.target);
            break;
          case "setProperty":
            // Literal value - no expression to type-check
            break;
        }
      }
      break;
    }
    case "hydrateLetElement":
      // Let bindings are inferred - no expected type constraint
      for (const lb of ins.instructions ?? []) recordExpected(lb.from, "unknown", "template.local", expected);
      break;
    default:
      break;
  }
}

function recordLinkedBindable(b: LinkedElementBindable, expected: ExprIdMap<ExpectedTypeInfo>): void {
  switch (b.kind) {
    case "propertyBinding":
      recordExpected(b.from, targetType(b.target), contextFromTarget(b.target), expected, b.target);
      break;
    case "attributeBinding":
      recordExpected(b.from, targetType(b.target), "dom.attribute", expected, b.target);
      break;
    case "stylePropertyBinding":
      recordExpected(b.from, targetType(b.target), "style.property", expected, b.target);
      break;
    default:
      break;
  }
}

/**
 * Record expected type for an expression, with cascade suppression.
 *
 * Skips recording if:
 * - No type information available
 * - Source expression is stubbed (parser/earlier phase error)
 * - Target is degraded (resolution failed)
 */
function recordExpected(
  src: BindingSourceIR | ExprRef | InterpIR,
  type: string | null | undefined,
  context: BindingContext,
  expected: ExprIdMap<ExpectedTypeInfo>,
  target?: TargetSem | TypeRef | { kind: "style" },
): void {
  // Skip if no type info
  if (!type) return;

  // Cascade suppression: skip stubbed sources (earlier phase error)
  if (isStub(src)) return;

  // Cascade suppression: skip if target resolution failed
  if (isUnknownTarget(target)) return;

  const ids = exprIdsOf(src);
  for (const id of ids) expected.set(id, { type, context });
}

/**
 * Check if a target represents a failed resolution (cascade suppression).
 * When target.kind === "unknown", the resolve phase already emitted a diagnostic.
 */
function isUnknownTarget(target: TargetSem | TypeRef | { kind: "style" } | undefined): boolean {
  if (!target) return false;
  if (typeof target !== "object") return false;
  return (target as { kind?: string }).kind === "unknown";
}

/**
 * Determine binding context from the target semantic.
 */
function contextFromTarget(target: TargetSem | TypeRef | { kind: "style" } | undefined): BindingContext {
  if (!target) return "unknown";
  if (isTypeRef(target)) return "unknown";
  switch (target.kind) {
    case "element.bindable":
    case "attribute.bindable":
    case "controller.prop":
      return "component.bindable";
    case "element.nativeProp":
      return "dom.property";
    case "style":
      return "style.property";
    default:
      return "unknown";
  }
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

function typeRefToString(t: TypeRef | string | undefined | null): string {
  if (!t) return "unknown";
  if (typeof t === "string") return t;
  switch (t.kind) {
    case "ts": return t.name;
    case "any": return "any";
    case "unknown": return "unknown";
    default: return "unknown";
  }
}
