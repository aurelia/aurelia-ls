/**
 * Transform Package - Emit Formatting Utilities
 *
 * Pretty printing, indentation, and escaping for JavaScript source generation.
 */

/* =============================================================================
 * INDENTATION
 * ============================================================================= */

/**
 * Indent all lines of a string.
 */
export function indent(text: string, indentStr: string = "  ", levels: number = 1): string {
  const prefix = indentStr.repeat(levels);
  return text
    .split("\n")
    .map(line => line.length > 0 ? prefix + line : line)
    .join("\n");
}

/**
 * Remove common leading whitespace from all lines.
 */
export function dedent(text: string): string {
  const lines = text.split("\n");
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  if (nonEmptyLines.length === 0) return text;

  const minIndent = Math.min(
    ...nonEmptyLines.map(line => {
      const match = line.match(/^(\s*)/);
      return match?.[1]?.length ?? 0;
    })
  );

  return lines
    .map(line => line.slice(minIndent))
    .join("\n");
}

/* =============================================================================
 * STRING ESCAPING
 * ============================================================================= */

/**
 * Escape a string for use in a JavaScript string literal.
 */
export function escapeString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\0/g, "\\0");
}

/**
 * Escape a string for use in a JavaScript template literal.
 */
export function escapeTemplateLiteral(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

/* =============================================================================
 * IDENTIFIER FORMATTING
 * ============================================================================= */

/**
 * Convert a name to a valid JavaScript identifier prefix.
 * Handles both kebab-case ("my-app" → "myApp") and
 * PascalCase ("MyApp" → "myApp") inputs.
 */
export function toIdentifierPrefix(name: string): string {
  // If it's kebab-case, convert to camelCase
  if (name.includes("-")) {
    return name
      .split("-")
      .map((part, i) => i === 0 ? part.toLowerCase() : capitalize(part))
      .join("");
  }
  // Otherwise assume PascalCase and convert to camelCase
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Check if a string is a valid JavaScript identifier.
 */
export function isValidIdentifier(str: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str);
}

/* =============================================================================
 * JSON FORMATTING
 * ============================================================================= */

/**
 * Format a value as JavaScript source (not JSON).
 * Handles objects, arrays, strings, numbers, booleans, null, undefined.
 */
export function formatValue(
  value: unknown,
  indentStr: string = "  ",
  currentIndent: string = ""
): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  switch (typeof value) {
    case "string":
      return `"${escapeString(value)}"`;
    case "number":
      return Object.is(value, -0) ? "-0" : String(value);
    case "boolean":
      return String(value);
    case "object":
      if (Array.isArray(value)) {
        return formatArray(value, indentStr, currentIndent);
      }
      return formatObject(value as Record<string, unknown>, indentStr, currentIndent);
    default:
      return String(value);
  }
}

function formatArray(
  arr: unknown[],
  indentStr: string,
  currentIndent: string
): string {
  if (arr.length === 0) return "[]";

  // Simple arrays on one line
  if (arr.length <= 3 && arr.every(v => typeof v !== "object" || v === null)) {
    const items = arr.map(v => formatValue(v, indentStr, currentIndent));
    const oneLine = `[${items.join(", ")}]`;
    if (oneLine.length <= 60) return oneLine;
  }

  // Multi-line array
  const nextIndent = currentIndent + indentStr;
  const items = arr.map(v => formatValue(v, indentStr, nextIndent));
  return `[\n${items.map(item => nextIndent + item).join(",\n")}\n${currentIndent}]`;
}

function formatObject(
  obj: Record<string, unknown>,
  indentStr: string,
  currentIndent: string
): string {
  const entries = Object.entries(obj);
  if (entries.length === 0) return "{}";

  const nextIndent = currentIndent + indentStr;
  const lines = entries.map(([key, value]) => {
    const formattedKey = isValidIdentifier(key) ? key : `"${escapeString(key)}"`;
    const formattedValue = formatValue(value, indentStr, nextIndent);
    return `${nextIndent}${formattedKey}: ${formattedValue}`;
  });

  return `{\n${lines.join(",\n")}\n${currentIndent}}`;
}

/* =============================================================================
 * AST FORMATTING
 * ============================================================================= */

/**
 * Format an expression AST as JavaScript source.
 * Handles the $kind property specially for Aurelia AST nodes.
 */
export function formatAst(
  ast: unknown,
  indentStr: string = "  ",
  currentIndent: string = ""
): string {
  if (ast === null || ast === undefined) {
    return String(ast);
  }

  if (typeof ast !== "object") {
    return formatValue(ast, indentStr, currentIndent);
  }

  if (Array.isArray(ast)) {
    if (ast.length === 0) return "[]";
    const nextIndent = currentIndent + indentStr;
    const items = ast.map(v => formatAst(v, indentStr, nextIndent));
    return `[\n${items.map(item => nextIndent + item).join(",\n")}\n${currentIndent}]`;
  }

  const obj = ast as Record<string, unknown>;
  const entries = Object.entries(obj);
  if (entries.length === 0) return "{}";

  const nextIndent = currentIndent + indentStr;
  const lines = entries.map(([key, value]) => {
    const formattedKey = isValidIdentifier(key) ? key : `"${escapeString(key)}"`;
    const formattedValue = formatAst(value, indentStr, nextIndent);
    return `${nextIndent}${formattedKey}: ${formattedValue}`;
  });

  return `{\n${lines.join(",\n")}\n${currentIndent}}`;
}
