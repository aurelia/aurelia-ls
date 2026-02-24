// Template Compilation Facade
//
// Public entry point for template compilation. Delegates to the pure
// pipeline functions in pipeline/stages.ts.

// Model imports
import type { ExprTableEntry, SourceSpan, ExprIdMap } from "./model/index.js";

// Language imports
import type { FeatureUsageSet, TemplateContext } from "./schema/index.js";

// Parsing imports
import type { AttributeParser, IExpressionParser } from "./parsing/index.js";

// Shared imports
import type { VmReflection, CompilerDiagnostic, ModuleResolver } from "./shared/index.js";

// Diagnostics imports
import type { DiagnosticResourceKind } from "./diagnostics/index.js";

// Pipeline imports
import { runFullPipeline } from "./pipeline/stages.js";
import type { StageKey, CacheOptions, FingerprintHints, StageArtifactMeta } from "./pipeline/engine.js";

// Synthesis imports
import {
  buildOverlayProductFromStages,
  computeOverlayBaseName,
  type OverlayProductResult,
  type TemplateMappingArtifact,
  type TemplateQueryFacade,
} from "./synthesis/index.js";

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

export interface TemplateDegradation {
  readonly hasGaps: boolean;
  readonly gapQualifiedCount: number;
  readonly affectedResources: ReadonlyArray<{
    readonly kind: DiagnosticResourceKind;
    readonly name: string;
  }>;
}

export interface TemplateCompilation {
  ir: import("./model/index.js").IrModule;
  linked: import("./analysis/index.js").LinkModule;
  scope: import("./model/index.js").ScopeModule;
  typecheck: import("./analysis/index.js").TypecheckModule;
  usage: FeatureUsageSet;
  overlayPlan: import("./synthesis/index.js").OverlayPlanModule;
  overlay: CompileOverlayResult;
  mapping: TemplateMappingArtifact;
  query: TemplateQueryFacade;
  exprTable: readonly ExprTableEntry[];
  exprSpans: ExprIdMap<SourceSpan>;
  diagnostics: TemplateDiagnostics;
  degradation: TemplateDegradation;
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
  const overlayBase = computeOverlayBaseName(opts.templateFilePath, opts.overlayBaseName);

  const result = runFullPipeline({
    html: opts.html,
    templateFilePath: opts.templateFilePath,
    query: opts.query,
    moduleResolver: opts.moduleResolver,
    vm: opts.vm,
    templateContext: opts.templateContext,
    depGraph: opts.query.model.deps,
    attrParser: opts.attrParser,
    exprParser: opts.exprParser,
    overlay: {
      isJs: opts.isJs,
      filename: overlayBase,
      syntheticPrefix: opts.vm.getSyntheticPrefix?.() ?? "__AU_TTC_",
    },
  });

  // Build overlay product from stage results
  const overlayArtifacts = buildOverlayProductFromStages(
    result.ir,
    result.linked,
    result.scope,
    result.overlayPlan,
    result.overlayEmit,
    { templateFilePath: opts.templateFilePath },
  );

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
    degradation: buildDegradation(result.diagnostics.all),
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

const OWNER_KIND_TO_RESOURCE_KIND: Record<string, DiagnosticResourceKind> = {
  element: "custom-element",
  attribute: "custom-attribute",
  controller: "template-controller",
};

function buildDegradation(diagnostics: readonly CompilerDiagnostic[]): TemplateDegradation {
  const seen = new Map<string, { kind: DiagnosticResourceKind; name: string }>();
  let count = 0;
  for (const d of diagnostics) {
    const data = d.data as Record<string, unknown> | undefined;
    if (data?.confidence === "partial") {
      count++;
      let kind = data.resourceKind as DiagnosticResourceKind | undefined;
      let name = data.name as string | undefined;
      if (!kind && data.bindable) {
        const b = data.bindable as Record<string, unknown>;
        kind = OWNER_KIND_TO_RESOURCE_KIND[b.ownerKind as string];
        name = b.ownerName as string | undefined;
      }
      if (kind && name) {
        const key = `${kind}:${name}`;
        if (!seen.has(key)) seen.set(key, { kind, name });
      }
    }
  }
  return {
    hasGaps: count > 0,
    gapQualifiedCount: count,
    affectedResources: [...seen.values()],
  };
}
