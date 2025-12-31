/**
 * AOT Compilation API
 *
 * Provides high-level functions for ahead-of-time compilation of Aurelia templates.
 * This integrates the AOT compiler with the instruction translator to produce
 * output that can be rendered directly by the Aurelia runtime.
 */

import {
  lowerDocument,
  resolveHost,
  bindScopes,
  planAot,
  emitAotCode,
  emitTemplate,
  collectNestedTemplateHtmlTree,
  getExpressionParser,
  DEFAULT_SYNTAX,
  DEFAULT_SEMANTICS,
  NOOP_TRACE,
  CompilerAttributes,
  type AotPlanModule,
  type AotCodeResult,
  type Semantics,
  type ResourceGraph,
  type ResourceScopeId,
  type NestedTemplateHtmlNode,
  type CompileTrace,
} from "@aurelia-ls/compiler";
import type { IInstruction } from "@aurelia/template-compiler";
import { translateInstructions, type NestedDefinition } from "./instruction-translator.js";
import type { SSRProcessOptions } from "./ssr-processor.js";
import type { ISSRManifest } from "@aurelia/runtime-html";
import { render, type ComponentClass, type RenderOptions } from "./render.js";
import { patchComponentDefinition, getComponentName } from "./patch.js";

/* =============================================================================
 * Public API
 * ============================================================================= */

export interface AotCompileOptions {
  /** Template file path (for provenance tracking) */
  templatePath?: string;
  /** Component name */
  name?: string;
  /** Custom semantics (defaults to DEFAULT_SEMANTICS) */
  semantics?: Semantics;
  /** Resource graph for project-specific components */
  resourceGraph?: ResourceGraph;
  /** Scope to use for resource lookup (defaults to root) */
  resourceScope?: ResourceScopeId | null;
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

export interface AotCompileResult {
  /** Compiled template HTML with hydration markers */
  template: string;
  /** Translated Aurelia instructions (ready for runtime) */
  instructions: IInstruction[][];
  /** Nested template definitions (for template controllers) */
  nestedDefs: NestedDefinition[];
  /** Target count for validation */
  targetCount: number;
  /** Raw AOT output (for SSR serialization and debugging) */
  raw: {
    plan: AotPlanModule;
    codeResult: AotCodeResult;
    /** Nested template HTML tree (matches structure of codeResult.definition.nestedTemplates) */
    nestedHtmlTree: NestedTemplateHtmlNode[];
  };
}

/**
 * Compile a template using the AOT compiler AOT pipeline.
 *
 * This runs the full compilation pipeline:
 * 1. Parse and lower (10-lower)
 * 2. Resolve semantics (20-resolve)
 * 3. Bind scopes (30-bind)
 * 4. Build AOT plan
 * 5. Emit instructions and template HTML
 * 6. Translate to Aurelia runtime format
 *
 * @param markup - The Aurelia template markup
 * @param options - Compilation options
 * @returns AOT compilation result ready for rendering
 *
 * @example
 * ```typescript
 * const result = compileWithAot('<div>${message}</div>', {
 *   name: 'my-component',
 * });
 *
 * // Patch a component class and render
 * patchComponentDefinition(MyComponent, result);
 * const rendered = await render(MyComponent);
 * ```
 */
export function compileWithAot(
  markup: string,
  options: AotCompileOptions = {},
): AotCompileResult {
  const trace = options.trace ?? NOOP_TRACE;

  return trace.span("ssr.compileWithAot", () => {
    const templatePath = options.templatePath ?? "template.html";
    const name = options.name ?? "template";
    const semantics = options.semantics ?? DEFAULT_SEMANTICS;

    trace.setAttributes({
      [CompilerAttributes.TEMPLATE]: templatePath,
      "ssr.compile.name": name,
      "ssr.compile.markupLength": markup.length,
    });

    // 1. Run AOT compiler analysis pipeline
    trace.event("ssr.compile.analysis.start");
    const exprParser = getExpressionParser();

    const ir = lowerDocument(markup, {
      attrParser: DEFAULT_SYNTAX,
      exprParser,
      file: templatePath,
      name,
      sem: semantics,
      trace,
    });

    // Build resolve options for resource graph support
    const resolveOpts = options.resourceGraph
      ? { graph: options.resourceGraph, scope: options.resourceScope ?? null }
      : undefined;

    const linked = resolveHost(ir, semantics, { ...resolveOpts, trace });
    const scoped = bindScopes(linked, { trace });
    trace.event("ssr.compile.analysis.done");

    // 2. Build AOT plan
    trace.event("ssr.compile.plan.start");
    const plan = planAot(linked, scoped, {
      templateFilePath: templatePath,
      trace,
    });
    trace.event("ssr.compile.plan.done");

    // 3. Emit serialized instructions
    trace.event("ssr.compile.emit.start");
    const stripSpans = options.stripSpans ?? true; // Default to stripping for smaller output
    const deduplicateExpressions = options.deduplicateExpressions ?? true; // Default to deduplication
    const codeResult = emitAotCode(plan, { name, stripSpans, deduplicateExpressions, trace });

    // 4. Emit template HTML with markers
    const templateResult = emitTemplate(plan);

    // 5. Emit nested template HTML (for template controllers)
    const nestedHtmlTree = collectNestedTemplateHtmlTree(plan);
    trace.event("ssr.compile.emit.done");

    // 6. Translate to Aurelia runtime format
    trace.event("ssr.compile.translate");
    const { instructions, nestedDefs } = translateInstructions(
      codeResult.definition.instructions,
      codeResult.expressions,
      codeResult.definition.nestedTemplates,
      nestedHtmlTree,
    );

    trace.setAttributes({
      "ssr.compile.targetCount": codeResult.definition.targetCount,
      "ssr.compile.instructionCount": instructions.length,
      "ssr.compile.nestedCount": nestedDefs.length,
    });

    return {
      template: templateResult.html,
      instructions,
      nestedDefs,
      targetCount: codeResult.definition.targetCount,
      raw: {
        plan,
        codeResult,
        nestedHtmlTree,
      },
    };
  });
}

/* =============================================================================
 * High-Level Render API
 * ============================================================================= */

export interface CompileAndRenderAotOptions {
  /** Component name */
  name?: string;
  /** Template file path (for source maps) */
  templatePath?: string;
  /** Custom semantics (defaults to DEFAULT_SEMANTICS) */
  semantics?: Semantics;
  /** Resource graph for project-specific components */
  resourceGraph?: ResourceGraph;
  /** Scope to use for resource lookup (defaults to root) */
  resourceScope?: ResourceScopeId | null;
  /** SSR post-processing options */
  ssr?: SSRProcessOptions;
  /** Optional trace for instrumentation */
  trace?: CompileTrace;
}

export interface CompileAndRenderAotResult {
  /** Rendered HTML */
  html: string;
  /** AOT compilation result (for debugging) */
  aot: AotCompileResult;
  /** Tree-based SSR manifest */
  manifest: ISSRManifest;
}

/**
 * Compile a component with AOT and render to HTML.
 *
 * This is a convenience function that:
 * 1. Compiles the component's template with the AOT compiler
 * 2. Patches the component class with the compiled definition
 * 3. Renders using the Aurelia runtime
 *
 * The component uses its natural state - properties defined in the class,
 * initialized in the constructor. No external state injection.
 *
 * @param Component - Component class with template string in $au.template
 * @param options - Compilation and render options
 * @returns Rendered HTML and compilation result
 *
 * @example
 * ```typescript
 * class MyApp {
 *   message = 'Hello World';
 *   static $au = {
 *     type: 'custom-element',
 *     name: 'my-app',
 *     template: '<div>${message}</div>',
 *   };
 * }
 *
 * const result = await compileAndRenderAot(MyApp);
 * console.log(result.html); // '<div>Hello World</div>'
 * ```
 */
export async function compileAndRenderAot(
  ComponentOrMarkup: ComponentClass | string,
  options: CompileAndRenderAotOptions = {},
): Promise<CompileAndRenderAotResult> {
  const trace = options.trace ?? NOOP_TRACE;

  return trace.spanAsync("ssr.compileAndRenderAot", async () => {
    let Component: ComponentClass;

    if (typeof ComponentOrMarkup === "string") {
      // Generate component from markup
      const template = ComponentOrMarkup;
      const name = options.name ?? "generated-app";
      Component = class GeneratedApp {
        static $au = {
          type: "custom-element",
          name,
          template,
        };
      } as unknown as ComponentClass;
      trace.setAttribute("ssr.render.fromMarkup", true);
    } else {
      Component = ComponentOrMarkup;
      trace.setAttribute("ssr.render.fromMarkup", false);
    }

    // Get template from component
    const template = Component.$au?.template;
    if (typeof template !== "string") {
      throw new Error(
        `compileAndRenderAot requires component to have string $au.template. ` +
        `Got: ${typeof template}`
      );
    }

    // Determine component name (kebab-case element name)
    const componentName = Component.$au?.name ?? options.name ?? getComponentName(Component);
    trace.setAttribute("ssr.render.componentName", componentName);

    // Compile with AOT
    trace.event("ssr.render.compile");
    const aot = compileWithAot(template, {
      name: componentName,
      templatePath: options.templatePath,
      semantics: options.semantics,
      resourceGraph: options.resourceGraph,
      resourceScope: options.resourceScope,
      trace,
    });

    // Patch the component with compiled definition
    trace.event("ssr.render.patch");
    patchComponentDefinition(Component, aot, { name: componentName });

    // Render
    trace.event("ssr.render.render");
    const renderOptions: RenderOptions = {
      trace,
    };
    if (options.ssr) {
      renderOptions.ssr = options.ssr;
    }

    const renderResult = await render(Component, renderOptions);

    trace.setAttributes({
      "ssr.render.htmlLength": renderResult.html.length,
    });

    return {
      html: renderResult.html,
      aot,
      manifest: renderResult.manifest,
    };
  });
}
