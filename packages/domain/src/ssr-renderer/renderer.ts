/**
 * Core Rendering Engine
 *
 * Processes SSR HTML skeleton directly (simple string-based approach).
 * Evaluates text binding markers and produces rendered HTML.
 */

import { evaluateSimpleExpression, toHtmlString } from "./evaluator.js";

export interface RenderResult {
  html: string;
  hydrationState: {
    bindings: Array<{
      hid: string;
      kind: string;
      exprIds: string[];
    }>;
  };
}

/**
 * Render HTML skeleton with expression evaluation.
 *
 * Simple string-based approach that finds text binding markers
 * in the HTML and evaluates the referenced expressions.
 *
 * @param htmlSkeleton - Raw HTML skeleton (from SSR emit)
 * @param exprCodeById - Map of ExprId → expression code
 * @param viewModel - View model for expression context
 * @returns Rendered HTML and hydration metadata
 */
export function renderNodes(
  htmlSkeleton: string,
  exprCodeById: Map<string, string>,
  viewModel: Record<string, unknown>,
): RenderResult {
  const htmlParts: string[] = [];
  const bindings: Array<{ hid: string; kind: string; exprIds: string[] }> =
    [];

  // Process text binding markers
  // Format: <!--au:tb HID@INDEX expr=EXPRID-->
  let lastPos = 0;
  const textBindingRegex =
    /<!--au:tb\s+(\d+)@(\d+)\s+expr=([\w_]+)-->/g;
  let match;

  while ((match = textBindingRegex.exec(htmlSkeleton)) !== null) {
    // Emit HTML before marker
    if (match.index > lastPos) {
      htmlParts.push(htmlSkeleton.slice(lastPos, match.index));
    }

    // Evaluate expression
    const hid = match[1];
    const exprId = match[3]!;
    const exprCode = exprCodeById.get(exprId);

    if (exprCode !== undefined) {
      const value = evaluateSimpleExpression(exprCode, viewModel);
      htmlParts.push(toHtmlString(value));
    } else {
      // Expression code not found, emit empty
      htmlParts.push("");
    }

    // Track binding metadata
    if (!bindings.find((b) => b.hid === hid)) {
      bindings.push({
        hid: hid ?? "",
        kind: "textBinding",
        exprIds: [exprId],
      });
    }

    lastPos = match.index + match[0].length;
  }

  // Emit remaining HTML
  if (lastPos < htmlSkeleton.length) {
    htmlParts.push(htmlSkeleton.slice(lastPos));
  }

  return {
    html: htmlParts.join(""),
    hydrationState: { bindings },
  };
}

/**
 * Escape HTML special characters in text content.
 */
function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Escape HTML special characters in attribute values.
 */
function escapeAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
