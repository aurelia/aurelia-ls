import type {
  BadExpression,
  Interpolation,
  IsBindingBehavior,
  TextSpan,
} from "../compiler/model/ir.js";

/**
 * Result of splitting an interpolation string into literal parts and
 * embedded expression spans.
 *
 * - parts.length === exprSpans.length + 1
 * - exprSpans[i] is a [start,end) range into the original `text`
 *   for the `${...}` expression between parts[i] and parts[i+1]
 */
export interface InterpolationSplitResult {
  parts: string[];
  exprSpans: TextSpan[];
}

/**
 * Split a string containing `${...}` interpolations into literal parts and
 * expression spans.
 *
 * This is a direct port of the `splitInterpolation` helper that previously
 * lived in the lowerer, with the same observable behavior for valid inputs:
 *
 *   "Hello ${name}"  →  parts ["Hello ", ""],  expr span for "name"
 *   "${a}${b}"       →  parts ["", "", ""],    spans for "a" and "b"
 *
 * If the string contains **no complete `${...}` pairs**, the function
 * returns `null`:
 *
 *   "no interpolation"        → null
 *   "broken ${interpolation"  → null   (unterminated `${`)
 *
 * Offsets in the returned spans are 0‑based and relative to `text`.
 */
export function splitInterpolationText(text: string): InterpolationSplitResult | null {
  let i = 0;
  let depth = 0;
  let start = 0;
  let str: '"' | "'" | "`" | null = null;

  const parts: string[] = [];
  const exprSpans: TextSpan[] = [];

  while (i < text.length) {
    const ch = text[i];

    // Track outer string literals so `${` inside them is ignored.
    if (str) {
      if (ch === "\\") {
        // Skip escaped character inside string.
        i += 2;
        continue;
      }
      if (ch === str) {
        str = null;
      }
      i++;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      str = ch;
      i++;
      continue;
    }

    // Start of an interpolation block: ${ ... }
    if (ch === "$" && text[i + 1] === "{") {
      // Literal part before this interpolation.
      parts.push(text.slice(start, i));

      // Skip the "${"
      i += 2;
      depth = 1;

      const exprStart = i;
      let innerStr: '"' | "'" | "`" | null = null;

      // Scan until matching '}' (respecting nested braces and strings).
      while (i < text.length) {
        const c = text[i];

        if (innerStr) {
          if (c === "\\") {
            i += 2;
            continue;
          }
          if (c === innerStr) {
            innerStr = null;
            i++;
            continue;
          }
          i++;
          continue;
        }

        if (c === '"' || c === "'" || c === "`") {
          innerStr = c;
          i++;
          continue;
        }

        if (c === "{") {
          depth++;
          i++;
          continue;
        }

        if (c === "}" && --depth === 0) {
          const exprEnd = i;
          exprSpans.push({ start: exprStart, end: exprEnd });
          i++;        // consume the closing '}'
          start = i;  // next literal part starts after the interpolation
          break;
        }

        i++;
      }

      // Either we successfully consumed an interpolation (depth==0 and we
      // broke out via the '}' clause), or we reached the end of the string
      // with an unterminated `${...}`. In the latter case we simply fall
      // through to the outer loop and ultimately return `null`.
      continue;
    }

    i++;
  }

  if (exprSpans.length === 0) {
    return null;
  }

  // Trailing literal after the last interpolation (possibly empty).
  parts.push(text.slice(start));

  return { parts, exprSpans };
}

/**
 * Build an `Interpolation` AST node for the given text.
 *
 * The caller supplies a `parseExpr` delegate that parses each `${...}`
 * segment (without the surrounding `${` / `}`) and is responsible for
 * adjusting spans to be relative to the **full** interpolation string.
 */
export function parseInterpolationAst(
  text: string,
  parseExpr: (segment: string, baseOffset: number) => IsBindingBehavior | BadExpression,
): Interpolation {
  const split = splitInterpolationText(text);

  const parts: string[] = split ? split.parts : [text];
  const expressions: IsBindingBehavior[] = [];

  if (split) {
    for (const span of split.exprSpans) {
      const segment = text.slice(span.start, span.end);
      const expr = parseExpr(segment, span.start);
      expressions.push(expr as IsBindingBehavior);
    }
  }

  const span: TextSpan = { start: 0, end: text.length };

  return {
    $kind: "Interpolation",
    span,
    parts,
    expressions,
  };
}
