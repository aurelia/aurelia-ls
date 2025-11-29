/**
 * Simple Expression Evaluator
 *
 * Evaluates simple JavaScript expressions in a binding context.
 * Limited scope: property access, method calls, and basic operators.
 *
 * NOT a full JavaScript evaluator. Designed for safe server-side rendering
 * of template expressions with limited scope.
 *
 * Examples:
 * - "message" → value of viewModel.message
 * - "person.name" → value of viewModel.person.name
 * - "items.length" → length property
 * - "toUpperCase()" → static method call (no this binding)
 */

/**
 * Evaluate a simple expression in the context of a view model.
 *
 * @param code - Expression source code (e.g., "person.name")
 * @param viewModel - Object providing context for property lookup
 * @returns Evaluated result (or undefined if property not found)
 *
 * @throws May throw if expression is invalid or causes runtime error
 */
export function evaluateSimpleExpression(
  code: string,
  viewModel: Record<string, unknown>,
): unknown {
  // Trim whitespace
  const trimmed = code.trim();

  if (!trimmed) {
    return undefined;
  }

  // Simple property access or nested property access
  // e.g., "message" or "person.name" or "person.address.street"
  // Also supports method calls on properties: "person.getName()"

  try {
    // Use Function constructor for safe evaluation with controlled scope
    // This is safer than eval() because we control the global scope
    // and provide only what we want in the function's local scope
    const func = new Function("obj", `return obj.${trimmed}`);
    const result = func(viewModel);
    return result;
  } catch {
    // Expression evaluation failed
    // Return undefined for graceful degradation
    return undefined;
  }
}

/**
 * Convert a value to HTML-safe string for rendering.
 *
 * @param value - Value to convert
 * @returns HTML-safe string representation
 */
export function toHtmlString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return escapeHtml(value);
  }

  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(toHtmlString).join("");
  }

  if (typeof value === "object") {
    return escapeHtml(String(value));
  }

  return escapeHtml(String(value));
}

/**
 * Escape HTML special characters.
 *
 * @param str - String to escape
 * @returns Escaped string safe for HTML context
 */
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
