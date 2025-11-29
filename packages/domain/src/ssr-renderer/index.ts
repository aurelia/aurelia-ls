/**
 * SSR Server String Renderer
 *
 * Simple proof-of-concept server-side string renderer for Aurelia 2 SSR.
 *
 * Given a compiled SSR skeleton (HTML), manifest (metadata + expressions),
 * and a view model instance, produces fully rendered HTML with interpolations
 * and bindings evaluated server-side.
 *
 * Limitations:
 * - No repeat/if/else controller evaluation (left for client-side)
 * - No complex scope chain (only top-level properties)
 * - No binding behaviors, converters, or validation
 * - No async expressions or promises
 */

import type { SsrManifest } from "../compiler/phases/50-plan/ssr/types.js";
import { evaluateSimpleExpression } from "./evaluator.js";
import { renderNodes } from "./renderer.js";

export interface RenderToStringOptions {
  /** View model instance providing context for expression evaluation */
  viewModel: Record<string, unknown>;
  /** Optional output formatting (for debugging) */
  pretty?: boolean;
}

export interface RenderToStringResult {
  /** Fully rendered HTML with expressions evaluated */
  html: string;
  /** Hydration metadata for client-side attachment */
  hydrationState: HydrationState;
}

export interface HydrationState {
  /** Bindings that need client-side attachment */
  bindings: Array<{
    hid: string;
    kind: string;
    exprIds: string[];
  }>;
}

/**
 * Render SSR template to HTML string with expressions evaluated.
 *
 * @param htmlSkeleton - HTML skeleton from SSR compilation (with markers)
 * @param manifestText - JSON manifest from SSR compilation
 * @param options - Rendering options (view model, formatting)
 * @returns Rendered HTML and hydration metadata
 *
 * @example
 * ```typescript
 * const result = renderToString(
 *   htmlSkeleton,
 *   manifestText,
 *   { viewModel: { name: "John", age: 30 } }
 * );
 * console.log(result.html); // Fully rendered HTML
 * ```
 */
export function renderToString(
  htmlSkeleton: string,
  manifestText: string,
  options: RenderToStringOptions,
): RenderToStringResult {
  const manifest: SsrManifest = JSON.parse(manifestText);

  // Build expression lookup table
  const exprCodeById = new Map<string, string>();
  if (manifest.expressions) {
    for (const expr of manifest.expressions) {
      exprCodeById.set(String(expr.id), expr.code);
    }
  }

  // Render HTML with expression evaluation
  const { html, hydrationState } = renderNodes(
    htmlSkeleton,
    exprCodeById,
    options.viewModel,
  );

  return { html, hydrationState };
}

export { evaluateSimpleExpression };
