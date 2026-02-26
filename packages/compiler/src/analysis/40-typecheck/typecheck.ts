import type {
  BindingSourceIR,
  ExprId,
  ExprRef,
  ExprTableEntry,
  InterpIR,
} from "../../model/ir.js";
import type { ScopeModule } from "../../model/symbols.js";
import type {
  LinkedInstruction,
  LinkModule,
  TargetSem,
  LinkedElementBindable,
} from "../20-link/types.js";
import type { TypeRef } from "../../schema/registry.js";
import { exprIdsOf, indexExprTable } from "../../shared/expr-utils.js";
import type { ExprIdMap } from "../../model/identity.js";
import { isStub } from "../../shared/diagnosed.js";
import {
  type TypecheckConfig,
  type TypecheckSeverity,
  type BindingContext,
  resolveTypecheckConfig,
} from "./config.js";
import { NOOP_TRACE, CompilerAttributes, type CompileTrace } from "../../shared/trace.js";
import { debug } from "../../shared/debug.js";

// Re-export config types for consumers
export type { TypecheckConfig, TypecheckSeverity, BindingContext, TypeCompatibilityResult } from "./config.js";
export { resolveTypecheckConfig, DEFAULT_TYPECHECK_CONFIG, TYPECHECK_PRESETS, checkTypeCompatibility } from "./config.js";

/**
 * A binding contract: what type does a binding target expect, and in what context?
 *
 * Binding contracts are extracted from linked semantics during compilation.
 * They are validated against TS-resolved types at diagnostic collection time.
 *
 * For literal expressions, `literalType` carries the compile-time known type
 * (no TS service needed). For non-literals, the language service queries TS.
 */
export interface BindingContract {
  type: string;
  context: BindingContext;
  /** For primitive literal expressions, the known type (string/number/boolean/null). */
  literalType?: string;
}

export interface TypecheckModule {
  version: "aurelia-typecheck@2";
  /** Binding contracts: ExprId → expected type + binding context. */
  contracts: ExprIdMap<BindingContract>;
  /** Expected types by expression (derived from contracts, for backward compat). */
  expectedByExpr: ExprIdMap<string>;
  /** The resolved config used for this typecheck run */
  config: TypecheckConfig;
}

export interface TypecheckOptions {
  linked: LinkModule;
  scope: ScopeModule;
  rootVmType: string;
  /** Optional typecheck configuration. Uses lenient defaults if not provided. */
  config?: Partial<TypecheckConfig>;
  /** Optional trace for instrumentation. Defaults to NOOP_TRACE. */
  trace?: CompileTrace;
  /** Dependency recorder for tracking type-state reads during type checking. */
  deps?: import("../../schema/dependency-graph.js").DepRecorder;
  /** Template file path — used to record type-state dependency. */
  templateFilePath?: import("../../model/ir.js").NormalizedPath;
  /** Semantic model for confidence cascade and definition index building. */
  model?: import("../../schema/model.js").SemanticModelQuery;
}

/**
 * Phase 40: extract binding contracts from linked semantics.
 *
 * Binding contracts record what type each binding target expects and in what
 * context (DOM property, component bindable, style, etc.). Type validation
 * against TS-resolved types happens later, at diagnostic collection time.
 */
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
        version: "aurelia-typecheck@2" as const,
        contracts: new Map(),
        expectedByExpr: new Map(),
        config,
      };
    }

    debug.typecheck("start", { rootVmType: opts.rootVmType });

    // Record type-state dependency for incremental invalidation.
    if (opts.deps && opts.templateFilePath) {
      opts.deps.readTypeState(opts.templateFilePath);
    }

    // Collect binding contracts from linked semantics
    trace.event("typecheck.collectContracts.start");
    const exprIndex = indexExprTable(opts.linked.exprTable as readonly ExprTableEntry[] | undefined);
    const contracts = collectBindingContracts(opts.linked, exprIndex);
    trace.event("typecheck.collectContracts.complete", { count: contracts.size });
    debug.typecheck("contracts.collected", { count: contracts.size });

    // Derive expectedByExpr view for backward compat (query facade uses it)
    const expectedByExpr: ExprIdMap<string> = new Map();
    for (const [id, contract] of contracts.entries()) {
      expectedByExpr.set(id, contract.type);
    }

    trace.setAttributes({
      "typecheck.contractCount": contracts.size,
    });

    return { version: "aurelia-typecheck@2" as const, contracts, expectedByExpr, config };
  });
}

type ExprIndex = ReturnType<typeof indexExprTable>;

function collectBindingContracts(linked: LinkModule, exprIndex: ExprIndex): ExprIdMap<BindingContract> {
  const contracts: ExprIdMap<BindingContract> = new Map();
  for (const t of linked.templates ?? []) {
    for (const row of t.rows ?? []) {
      for (const ins of row.instructions ?? []) {
        visitInstruction(ins, contracts);
      }
    }
  }
  // Populate literalType for primitive literal expressions
  for (const [id, contract] of contracts.entries()) {
    const entry = exprIndex.get(id);
    if (!entry) continue;
    const ast = entry.ast;
    if (ast && ast.$kind === "PrimitiveLiteral") {
      const v = (ast as { value?: unknown }).value;
      switch (typeof v) {
        case "string": contract.literalType = "string"; break;
        case "number": contract.literalType = "number"; break;
        case "boolean": contract.literalType = "boolean"; break;
        default: if (v === null) contract.literalType = "null"; break;
      }
    }
  }
  return contracts;
}

function visitInstruction(ins: LinkedInstruction, expected: ExprIdMap<BindingContract>): void {
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

function recordLinkedBindable(b: LinkedElementBindable, expected: ExprIdMap<BindingContract>): void {
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
  contracts: ExprIdMap<BindingContract>,
  target?: TargetSem | TypeRef | { kind: "style" },
): void {
  // Skip if no type info
  if (!type) return;

  // Cascade suppression: skip stubbed sources (earlier phase error)
  if (isStub(src)) return;

  // Cascade suppression: skip if target resolution failed
  if (isUnknownTarget(target)) return;

  const ids = exprIdsOf(src);
  for (const id of ids) contracts.set(id, { type, context });
}

/**
 * Check if a target represents a failed resolution (cascade suppression).
 * When target.kind === "unknown", the link phase already emitted a diagnostic.
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
