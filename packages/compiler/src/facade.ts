import type { ExprIdMap } from "./model/identity.js";
import type { ExprTableEntry, IrModule } from "./model/ir.js";
import type { SourceSpan } from "./model/span.js";
import type { ScopeModule } from "./model/symbols.js";
import type { LinkModule } from "./analysis/20-link/types.js";
import type { TypecheckModule } from "./analysis/40-typecheck/typecheck.js";
import type { TemplateContext } from "./schema/snapshot.js";
import type { FeatureUsageSet } from "./schema/types.js";
import type { AttributeParser } from "./parsing/attribute-parser.js";
import type { IExpressionParser } from "./parsing/expression-parser.js";
import type { CompilerDiagnostic } from "./model/diagnostics.js";
import type { ModuleResolver } from "./shared/module-resolver.js";
import { NOOP_TRACE, type CompileTrace } from "./shared/trace.js";
import type { VmReflection } from "./shared/vm-reflection.js";
// Pipeline imports
import { runFullPipeline } from "./pipeline/stages.js";
import type { StageKey, StageArtifactMeta } from "./pipeline/engine.js";
import type { TemplateMappingArtifact } from "./synthesis/overlay/mapping.js";
import { computeOverlayBaseName } from "./synthesis/overlay/paths.js";
import { buildOverlayProductFromStages, type OverlayProductResult } from "./synthesis/overlay/product.js";
import type { TemplateQueryFacade } from "./synthesis/overlay/query.js";
import type { OverlayPlanModule } from "./synthesis/overlay/types.js";
import type { SemanticModelQuery } from "./schema/model.js";

// ============================================================================
// Compile Options
// ============================================================================

export interface CompileOptions {
  html: string;
  templateFilePath: string;
  isJs: boolean;
  vm: VmReflection;
  /** Semantic authority — the query IS the model. */
  query: SemanticModelQuery;
  templateContext?: TemplateContext;
  attrParser?: AttributeParser;
  exprParser?: IExpressionParser;
  moduleResolver: ModuleResolver;
  overlayBaseName?: string;
  /** Trace context for per-stage timing instrumentation. */
  trace?: CompileTrace;
  /** Pre-computed IR to skip the lower stage (per-stage caching). */
  seededIr?: IrModule;
}

// ============================================================================
// Compilation Result Types
// ============================================================================

export type CompileOverlayResult = OverlayProductResult;

export interface TemplateDiagnostics {
  all: CompilerDiagnostic[];
  byStage: Partial<Record<CompilerDiagnostic["stage"], CompilerDiagnostic[]>>;
}

export type StageMetaSnapshot = Partial<Record<StageKey, StageArtifactMeta>>;

export interface TemplateCompilation {
  ir: IrModule;
  linked: LinkModule;
  scope: ScopeModule;
  typecheck: TypecheckModule;
  usage: FeatureUsageSet;
  overlayPlan: OverlayPlanModule;
  overlay: CompileOverlayResult;
  mapping: TemplateMappingArtifact;
  query: TemplateQueryFacade;
  exprTable: readonly ExprTableEntry[];
  exprSpans: ExprIdMap<SourceSpan>;
  diagnostics: TemplateDiagnostics;
  meta: StageMetaSnapshot;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Compile a template.
 *
 * Pure function: query + html + options → TemplateCompilation.
 * No engine, no session. Delegates to runFullPipeline.
 */
export function compileTemplate(opts: CompileOptions): TemplateCompilation {
  const trace = opts.trace ?? NOOP_TRACE;
  const overlayBase = computeOverlayBaseName(opts.templateFilePath, opts.overlayBaseName);

  const result = trace.span("facade:pipeline", () => runFullPipeline({
    html: opts.html,
    templateFilePath: opts.templateFilePath,
    query: opts.query,
    moduleResolver: opts.moduleResolver,
    vm: opts.vm,
    templateContext: opts.templateContext,
    depGraph: opts.query.model.deps,
    attrParser: opts.attrParser,
    exprParser: opts.exprParser,
    trace,
    seededIr: opts.seededIr,
    overlay: {
      isJs: opts.isJs,
      filename: overlayBase,
      syntheticPrefix: opts.vm.getSyntheticPrefix?.() ?? "__AU_TTC_",
    },
  }));

  // Build overlay product from stage results
  const overlayArtifacts = trace.span("facade:overlay-product", () => buildOverlayProductFromStages(
    result.ir,
    result.linked,
    result.scope,
    result.overlayPlan,
    result.overlayEmit,
    { templateFilePath: opts.templateFilePath },
  ));

  return {
    ir: result.ir,
    linked: result.linked,
    scope: result.scope,
    typecheck: result.typecheck,
    usage: result.usage,
    overlayPlan: result.overlayPlan,
    overlay: overlayArtifacts.overlay,
    mapping: overlayArtifacts.mapping,
    query: overlayArtifacts.query,
    exprTable: overlayArtifacts.exprTable,
    exprSpans: overlayArtifacts.exprSpans,
    diagnostics: buildDiagnostics(result.diagnostics.all),
    meta: {},
  };
}

// ============================================================================
// Helpers
// ============================================================================

function buildDiagnostics(diagnostics: readonly CompilerDiagnostic[]): TemplateDiagnostics {
  const byStage: Partial<Record<CompilerDiagnostic["stage"], CompilerDiagnostic[]>> = {};
  for (const d of diagnostics) {
    if (!byStage[d.stage]) byStage[d.stage] = [];
    byStage[d.stage]!.push(d);
  }
  return { all: [...diagnostics], byStage };
}

