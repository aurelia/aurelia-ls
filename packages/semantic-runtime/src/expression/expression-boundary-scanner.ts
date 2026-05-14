import { CharCode } from './expression-scanner.js';

/** True when the source contains an unescaped interpolation/template hole opener. */
export function hasInterpolationStart(source: string): boolean {
  for (let i = 0; i < source.length - 1; i++) {
    if (isInterpolationStart(source, i)) {
      return true;
    }
  }
  return false;
}

/** True when `source[index]` begins an unescaped `${...}` hole opener. */
export function isInterpolationStart(source: string, index: number): boolean {
  return source.charCodeAt(index) === CharCode.Dollar &&
    source.charCodeAt(index + 1) === CharCode.OpenBrace &&
    !isEscapedInterpolationStart(source, index);
}

/**
 * Find the `}` that closes a `${...}` expression hole.
 *
 * This is a boundary lookahead, not expression parsing. It owns only delimiter
 * balance across strings, comments, object literals, and nested template
 * literals so callers can hand the completed-input parser an exact expression
 * slice instead of asking EOF to stand in for "maybe closed".
 */
export function findTemplateExpressionClose(
  source: string,
  expressionStart: number,
): number | null {
  let depth = 1;
  let i = expressionStart;

  while (i < source.length) {
    const ch = source.charCodeAt(i);

    if (ch === CharCode.SingleQuote || ch === CharCode.DoubleQuote) {
      const after = skipStringLiteral(source, i, ch);
      if (after == null) return null;
      i = after;
      continue;
    }

    if (ch === CharCode.Backtick) {
      const after = findTemplateLiteralEnd(source, i);
      if (after == null) return null;
      i = after;
      continue;
    }

    if (ch === CharCode.Slash && source.charCodeAt(i + 1) === CharCode.Slash) {
      i = skipLineComment(source, i + 2);
      continue;
    }

    if (ch === CharCode.Slash && source.charCodeAt(i + 1) === CharCode.Asterisk) {
      const after = skipBlockComment(source, i + 2);
      if (after == null) return null;
      i = after;
      continue;
    }

    if (ch === CharCode.OpenBrace) {
      depth++;
      i++;
      continue;
    }

    if (ch === CharCode.CloseBrace) {
      depth--;
      if (depth === 0) return i;
      i++;
      continue;
    }

    i++;
  }

  return null;
}

export function findTemplateLiteralEnd(
  source: string,
  startBacktick: number,
): number | null {
  let i = startBacktick + 1;

  while (i < source.length) {
    const ch = source.charCodeAt(i);

    if (ch === CharCode.Backslash) {
      i += 2;
      continue;
    }

    if (ch === CharCode.Backtick) {
      return i + 1;
    }

    if (ch === CharCode.Dollar && source.charCodeAt(i + 1) === CharCode.OpenBrace) {
      const close = findTemplateExpressionClose(source, i + 2);
      if (close == null) return null;
      i = close + 1;
      continue;
    }

    i++;
  }

  return null;
}

function isEscapedInterpolationStart(source: string, dollarIndex: number): boolean {
  return dollarIndex > 0 && source.charCodeAt(dollarIndex - 1) === CharCode.Backslash;
}

function skipStringLiteral(
  source: string,
  start: number,
  quote: number,
): number | null {
  let i = start + 1;

  while (i < source.length) {
    const ch = source.charCodeAt(i);

    if (ch === CharCode.Backslash) {
      i += 2;
      continue;
    }

    if (ch === quote) {
      return i + 1;
    }

    i++;
  }

  return null;
}

function skipLineComment(source: string, start: number): number {
  let i = start;

  while (i < source.length) {
    const ch = source.charCodeAt(i);
    if (ch === CharCode.LineFeed || ch === CharCode.CarriageReturn) {
      return i;
    }
    i++;
  }

  return i;
}

function skipBlockComment(source: string, start: number): number | null {
  let i = start;

  while (i < source.length - 1) {
    if (source.charCodeAt(i) === CharCode.Asterisk && source.charCodeAt(i + 1) === CharCode.Slash) {
      return i + 2;
    }
    i++;
  }

  return null;
}
