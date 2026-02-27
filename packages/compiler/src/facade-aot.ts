/**
 * AOT Compilation Facade
 *
 * High-level function for ahead-of-time compilation of Aurelia templates.
 * This runs the full analysis + synthesis pipeline and produces output
 * that can be injected into component classes via the transform package.
 *
 * This is SSR-agnostic - it produces serialized instructions that can be:
 * - Written to JS files for CSR-only builds
 * - Fed to the SSR package's instruction translator for server rendering
 *
 * Two semantic authority modes:
 * - Pass `semantics` for standalone compilation (snapshot built internally).
 * - Pass `snapshot` when a workspace or project pipeline already holds
 *   materialized semantics. The snapshot's data is used directly, skipping
 *   re-materialization. Compatible with WorkspaceSnapshot.
 */

import { lowerDocument, linkTemplateSemantics, bindScopes } from "./analysis/index.js";
import { planAot, emitAotCode, emitTemplate, collectNestedTemplateHtmlTree } from "./synthesis/index.js";
import { createAttributeParserFromRegistry, getExpressionParser, type AttributeParser } from "./parsing/index.js";
import {
  buildProjectSnapshot,
  buildSemanticsSnapshotFromProject,
  type SemanticsSnapshot,
  type ResourceCatalog,
  type ProjectSemantics,
  type ResourceGraph,
  type ResourceScopeId,
  type LocalImportDef,
  type TemplateSyntaxRegistry,
} from "./schema/index.js";
import { NOOP_TRACE, CompilerAttributes, type CompileTrace, type ModuleResolver } from "./shared/index.js";
import { DiagnosticsRuntime } from "./diagnostics/runtime.js";
import type { AotPlanModule, AotCodeResult, NestedTemplateHtmlNode } from "./synthesis/index.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Pre-built semantic snapshot for AOT compilation.
 *
 * Structurally compatible with WorkspaceSnapshot from
 * @aurelia-ls/semantic-workspace. When a workspace or project pipeline
 * has already materialized these artifacts, pass them here to avoid
 * redundant re-materialization in the AOT facade.
 */
export interface AotSemanticSnapshot {
  readonly semantics: ProjectSemantics;
  readonly catalog: ResourceCatalog;
  readonly syntax: TemplateSyntaxRegistry;
  readonly resourceGraph?: ResourceGraph | null;
}

export interface CompileAotOptions {
  /** Template file path (for provenance tracking and error messages) */
  templatePath?: string;
  /** Component name (kebab-case, e.g., "my-app") */
  name?: string;
  /** Semantics (built-ins + project-specific resources). Required when no snapshot. */
  semantics: ProjectSemantics;
  /** Module resolver for template meta imports. */
  moduleResolver: ModuleResolver;
  /**
   * Pre-built semantic snapshot from a workspace or project pipeline.
   * When provided, `semantics`, `catalog`, `syntax`, and `resourceGraph`
   * fields are ignored — the snapshot's data is used directly.
   */
  snapshot?: AotSemanticSnapshot;
  /** Precomputed catalog for lowering (scope-specific if provided) */
  catalog?: ResourceCatalog;
  /** Precomputed syntax registry for parsing/emitting */
  syntax?: TemplateSyntaxRegistry;
  /** Resource graph for project-specific components */
  resourceGraph?: ResourceGraph;
  /** Scope to use for resource lookup (defaults to root) */
  resourceScope?: ResourceScopeId | null;
  /** Optional attribute parser override */
  attrParser?: AttributeParser;
  /**
   * Local imports from template `<import>` elements.
   *
   * These are resolved as local element definitions for this template,
   * allowing resolution of elements imported via `<import from="./foo">`.
   */
  localImports?: LocalImportDef[];
  /**
   * Strip source location spans from expression ASTs.
   * Reduces output size for production builds.
   * @default true
   */
  stripSpans?: boolean;
  /**
   * Deduplicate identical expressions.
   * When enabled, expressions with the same AST content share a single entry
   * in the expression table, reducing output size.
   * @default true
   */
  deduplicateExpressions?: boolean;
  /** Optional trace for instrumentation */
  trace?: CompileTrace;
  /** Optional diagnostics runtime (defaults to a new instance per call). */
  diagnostics?: DiagnosticsRuntime;
}

export interface CompileAotResult {
  /** Compiled template HTML with hydration markers (<!--au-->) */
  template: string;
  /** AOT code result containing serialized instructions and expressions */
  codeResult: AotCodeResult;
  /** AOT plan (intermediate representation) */
  plan: AotPlanModule;
  /** Nested template HTML tree (matches structure of codeResult.definition.nestedTemplates) */
  nestedHtmlTree: NestedTemplateHtmlNode[];
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Compile a template using the AOT pipeline.
 *
 * This runs the full compilation pipeline:
 * 1. Parse and lower (10-lower)
 * 2. Resolve semantics (20-link)
 * 3. Bind scopes (30-bind)
 * 4. Build AOT plan
 * 5. Emit serialized instructions and template HTML
 *
 * The output is serialized data that can be written directly to JavaScript.
 * For SSR, use the SSR package's `compileWithAot` which adds instruction
 * translation for server-side execution.
 *
 * @param markup - The Aurelia template markup
 * @param options - Compilation options
 * @returns AOT compilation result with serialized instructions
 *
 * @example
 * ```typescript
 * // Standalone: pass semantics directly
 * const aot = compileAot('<div>${message}</div>', {
 *   name: 'my-component',
 *   semantics: BUILTIN_SEMANTICS,
 *   moduleResolver,
 * });
 *
 * // Workspace-mediated: pass pre-built snapshot
 * const aot = compileAot('<div>${message}</div>', {
 *   name: 'my-component',
 *   snapshot: workspace.snapshot(),
 *   semantics: workspace.snapshot().semantics,
 *   moduleResolver,
 * });
 * ```
 */
export function compileAot(
  markup: string,
  options: CompileAotOptions,
): CompileAotResult {
  const trace = options.trace ?? NOOP_TRACE;

  return trace.span("compiler.compileAot", () => {
    const diagnostics = options.diagnostics ?? new DiagnosticsRuntime();
    const templatePath = options.templatePath ?? "template.html";
    const name = options.name ?? "template";

    // Build the semantics snapshot. When a pre-built snapshot is provided,
    // use its already-materialized data directly. Otherwise, materialize
    // from the raw semantics.
    const snapshot = options.snapshot
      ? buildSnapshotFromAuthority(options.snapshot, options)
      : buildSnapshotFromSemantics(options);

    const catalog = snapshot.catalog;
    const syntax = snapshot.syntax;
    const attrParser = options.attrParser ?? createAttributeParserFromRegistry(syntax);

    trace.setAttributes({
      [CompilerAttributes.TEMPLATE]: templatePath,
      "compiler.aot.name": name,
      "compiler.aot.markupLength": markup.length,
    });

    // 1. Run analysis pipeline
    trace.event("compiler.aot.analysis.start");
    const exprParser = getExpressionParser();

    const ir = lowerDocument(markup, {
      attrParser,
      exprParser,
      file: templatePath,
      name,
      catalog,
      diagnostics: diagnostics.forSource("lower"),
      trace,
    });

    const linked = linkTemplateSemantics(ir, snapshot, {
      moduleResolver: options.moduleResolver,
      templateFilePath: templatePath,
      diagnostics: diagnostics.forSource("link"),
      trace,
    });
    const scoped = bindScopes(linked, { trace, diagnostics: diagnostics.forSource("bind") });
    trace.event("compiler.aot.analysis.done");

    // 2. Build AOT plan
    trace.event("compiler.aot.plan.start");
    const plan = planAot(linked, scoped, {
      templateFilePath: templatePath,
      trace,
      syntax,
      attrParser,
    });
    trace.event("compiler.aot.plan.done");

    // 3. Emit serialized instructions
    trace.event("compiler.aot.emit.start");
    const stripSpans = options.stripSpans ?? true;
    const deduplicateExpressions = options.deduplicateExpressions ?? true;
    const codeResult = emitAotCode(plan, { name, stripSpans, deduplicateExpressions, trace });

    // 4. Emit template HTML with markers
    const templateResult = emitTemplate(plan);

    // 5. Collect nested template HTML (for template controllers)
    const nestedHtmlTree = collectNestedTemplateHtmlTree(plan);
    trace.event("compiler.aot.emit.done");

    trace.setAttributes({
      "compiler.aot.targetCount": codeResult.definition.targetCount,
      "compiler.aot.instructionCount": codeResult.definition.instructions.length,
      "compiler.aot.nestedCount": codeResult.definition.nestedTemplates.length,
    });

    return {
      template: templateResult.html,
      codeResult,
      plan,
      nestedHtmlTree,
    };
  });
}

// =============================================================================
// Snapshot construction (internal)
// =============================================================================

/** Build a SemanticsSnapshot from raw semantics options (standalone path). */
function buildSnapshotFromSemantics(options: CompileAotOptions): SemanticsSnapshot {
  const project = buildProjectSnapshot(options.semantics, {
    resourceGraph: options.resourceGraph ?? null,
    ...(options.resourceScope !== undefined ? { defaultScope: options.resourceScope } : {}),
    catalog: options.catalog,
    syntax: options.syntax,
  });
  return buildSemanticsSnapshotFromProject(project, {
    ...(options.resourceScope !== undefined ? { scopeId: options.resourceScope } : {}),
    ...(options.localImports ? { localImports: options.localImports } : {}),
  });
}

/**
 * Build a SemanticsSnapshot from a pre-built authority snapshot.
 *
 * Routes through buildProjectSnapshot which is idempotent when the
 * authority's semantics are already materialized (the common case for
 * workspace snapshots). The catalog and syntax from the authority are
 * reused directly, avoiding any redundant computation.
 */
function buildSnapshotFromAuthority(
  authority: AotSemanticSnapshot,
  options: CompileAotOptions,
): SemanticsSnapshot {
  const project = buildProjectSnapshot(authority.semantics, {
    resourceGraph: authority.resourceGraph ?? null,
    catalog: authority.catalog,
    syntax: authority.syntax,
    ...(options.resourceScope !== undefined ? { defaultScope: options.resourceScope } : {}),
  });
  return buildSemanticsSnapshotFromProject(project, {
    ...(options.resourceScope !== undefined ? { scopeId: options.resourceScope } : {}),
    ...(options.localImports ? { localImports: options.localImports } : {}),
  });
}
