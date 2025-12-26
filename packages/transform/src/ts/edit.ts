/**
 * Transform Package - Source Editing
 *
 * Apply text edits to source code.
 */

import type { Span, TypedSourceEdit, TextEdit, Insertion, Deletion } from "./types.js";

/* =============================================================================
 * PUBLIC API
 * ============================================================================= */

/**
 * Apply multiple edits to source code.
 * Edits are applied in reverse order (bottom to top) to preserve positions.
 */
export function applyEdits(source: string, edits: TypedSourceEdit[]): string {
  // Sort edits by position descending (apply from end to start)
  const sorted = [...edits].sort((a, b) => {
    const posA = getEditPosition(a);
    const posB = getEditPosition(b);
    return posB - posA;
  });

  let result = source;
  for (const edit of sorted) {
    result = applySingleEdit(result, edit);
  }

  return result;
}

/**
 * Apply a single edit to source code.
 */
export function applySingleEdit(source: string, edit: TypedSourceEdit): string {
  switch (edit.type) {
    case "replace":
      return (
        source.slice(0, edit.span.start) +
        edit.newText +
        source.slice(edit.span.end)
      );

    case "insert":
      return (
        source.slice(0, edit.position) +
        edit.text +
        source.slice(edit.position)
      );

    case "delete":
      return source.slice(0, edit.span.start) + source.slice(edit.span.end);
  }
}

/**
 * Create a replace edit.
 */
export function replace(span: Span, newText: string): TypedSourceEdit {
  return { type: "replace", span, newText };
}

/**
 * Create an insert edit.
 */
export function insert(position: number, text: string): TypedSourceEdit {
  return { type: "insert", position, text };
}

/**
 * Create a delete edit.
 */
export function del(span: Span): TypedSourceEdit {
  return { type: "delete", span };
}

/**
 * Extend a span to include surrounding whitespace.
 * Useful for cleanly removing decorators or other constructs.
 *
 * - Extends backward to eat leading spaces/tabs (stops at newline)
 * - Extends forward to eat trailing spaces/tabs and one newline
 */
export function extendSpanWithWhitespace(source: string, span: Span): Span {
  let start = span.start;
  let end = span.end;

  // Extend to include trailing whitespace and newline
  while (end < source.length && (source[end] === " " || source[end] === "\t")) {
    end++;
  }
  if (end < source.length && source[end] === "\n") {
    end++;
  }

  // Extend to include leading whitespace (but stop at newline)
  while (start > 0 && (source[start - 1] === " " || source[start - 1] === "\t")) {
    start--;
  }

  return { start, end };
}

/**
 * Create a delete edit for a span that may include surrounding whitespace.
 */
export function deleteWithWhitespace(
  source: string,
  span: Span
): TypedSourceEdit {
  return { type: "delete", span: extendSpanWithWhitespace(source, span) };
}

/* =============================================================================
 * HELPERS
 * ============================================================================= */

function getEditPosition(edit: TypedSourceEdit): number {
  switch (edit.type) {
    case "replace":
    case "delete":
      return edit.span.start;
    case "insert":
      return edit.position;
  }
}

/**
 * Validate that edits don't overlap.
 */
export function validateEdits(edits: TypedSourceEdit[]): boolean {
  if (edits.length < 2) return true;

  const sorted = [...edits].sort((a, b) => getEditPosition(a) - getEditPosition(b));

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]!;
    const next = sorted[i + 1]!;

    const currentEnd = getEditEnd(current);
    const nextStart = getEditPosition(next);

    if (currentEnd > nextStart) {
      return false;
    }
  }

  return true;
}

function getEditEnd(edit: TypedSourceEdit): number {
  switch (edit.type) {
    case "replace":
    case "delete":
      return edit.span.end;
    case "insert":
      return edit.position;
  }
}

/**
 * Calculate position offset after applying edits.
 * Useful for adjusting positions after transformation.
 */
export function calculateOffset(
  position: number,
  edits: TypedSourceEdit[]
): number {
  let offset = 0;

  for (const edit of edits) {
    const editPos = getEditPosition(edit);

    if (editPos >= position) {
      continue;
    }

    switch (edit.type) {
      case "insert":
        offset += edit.text.length;
        break;

      case "delete":
        if (edit.span.end <= position) {
          offset -= edit.span.end - edit.span.start;
        } else {
          // Position is within deleted span
          offset -= position - edit.span.start;
        }
        break;

      case "replace":
        if (edit.span.end <= position) {
          offset += edit.newText.length - (edit.span.end - edit.span.start);
        } else {
          // Position is within replaced span
          offset -= position - edit.span.start;
        }
        break;
    }
  }

  return offset;
}
