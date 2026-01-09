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
 */

import { lowerDocument, resolveHost, bindScopes } from "./analysis/index.js";
import { planAot, emitAotCode, emitTemplate, collectNestedTemplateHtmlTree } from "./synthesis/index.js";
import { getExpressionParser, DEFAULT_SYNTAX } from "./parsing/index.js";
import {
  DEFAULT as DEFAULT_SEMANTICS,
  materializeSemanticsForScope,
  prepareSemantics,
  type Semantics,
  type ResourceGraph,
  type ResourceScopeId,
  type LocalImportDef,
} from "./language/index.js";
import { NOOP_TRACE, CompilerAttributes, type CompileTrace } from "./shared/index.js";
import type { AotPlanModule, AotCodeResult, NestedTemplateHtmlNode } from "./synthesis/index.js";

// =============================================================================
// Types
// =============================================================================

export interface CompileAotOptions {
  /** Template file path (for provenance tracking and error messages) */
  templatePath?: string;
  /** Component name (kebab-case, e.g., "my-app") */
  name?: string;
  /** Custom semantics (defaults to DEFAULT_SEMANTICS with all built-ins) */
  semantics?: Semantics;
  /** Resource graph for project-specific components */
  resourceGraph?: ResourceGraph;
  /** Scope to use for resource lookup (defaults to root) */
  resourceScope?: ResourceScopeId | null;
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
 * 2. Resolve semantics (20-resolve)
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
 * import { compileAot, DEFAULT_SEMANTICS } from "@aurelia-ls/compiler";
 * import { transform } from "@aurelia-ls/transform";
 *
 * // Compile template
 * const aot = compileAot('<div>${message}</div>', {
 *   name: 'my-component',
 *   semantics: DEFAULT_SEMANTICS,
 * });
 *
 * // Transform TypeScript source to inject $au
 * const result = transform({
 *   source: classSource,
 *   filePath: 'my-component.ts',
 *   aot: aot.codeResult,
 *   template: aot.template,
 *   nestedHtmlTree: aot.nestedHtmlTree,
 *   // ...
 * });
 * ```
 */
export function compileAot(
  markup: string,
  options: CompileAotOptions = {},
): CompileAotResult {
  const trace = options.trace ?? NOOP_TRACE;

  return trace.span("compiler.compileAot", () => {
    const templatePath = options.templatePath ?? "template.html";
    const name = options.name ?? "template";
    const baseSemantics = options.semantics ?? DEFAULT_SEMANTICS;
    const semantics = options.resourceGraph || options.resourceScope !== undefined
      ? materializeSemanticsForScope(baseSemantics, options.resourceGraph ?? null, options.resourceScope ?? null)
      : prepareSemantics(baseSemantics);

    trace.setAttributes({
      [CompilerAttributes.TEMPLATE]: templatePath,
      "compiler.aot.name": name,
      "compiler.aot.markupLength": markup.length,
    });

    // 1. Run analysis pipeline
    trace.event("compiler.aot.analysis.start");
    const exprParser = getExpressionParser();

    const ir = lowerDocument(markup, {
      attrParser: DEFAULT_SYNTAX,
      exprParser,
      file: templatePath,
      name,
      catalog: semantics.catalog,
      trace,
    });

    // Build resolve options for resource graph and local imports
    const resolveOpts = options.resourceGraph || options.localImports
      ? {
          graph: options.resourceGraph ?? null,
          scope: options.resourceScope ?? null,
          localImports: options.localImports,
        }
      : undefined;

    const linked = resolveHost(ir, semantics, { ...resolveOpts, trace });
    const scoped = bindScopes(linked, { trace });
    trace.event("compiler.aot.analysis.done");

    // 2. Build AOT plan
    trace.event("compiler.aot.plan.start");
    const plan = planAot(linked, scoped, {
      templateFilePath: templatePath,
      trace,
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
