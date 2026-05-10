/**
 * Token kinds produced by the expression Scanner.
 *
 * This is intentionally small and JS-ish, but tailored to Aurelia's
 * expression language (e.g. dedicated tokens for 'new', 'typeof', 'in', 'of',
 * '$this', '$parent', etc.).
 */
export enum TokenType {
  EOF = 1,

  // Identifiers & specials
  Identifier,
  KeywordNew,
  KeywordTypeof,
  KeywordVoid,
  KeywordInstanceof,
  KeywordIn,
  KeywordOf,
  KeywordThis,
  KeywordDollarThis,
  KeywordDollarParent,

  BooleanLiteral,
  NullLiteral,
  UndefinedLiteral,
  NumericLiteral,
  StringLiteral,

  // Punctuation / grouping
  OpenParen,       // (
  CloseParen,      // )
  OpenBracket,     // [
  CloseBracket,    // ]
  OpenBrace,       // {
  CloseBrace,      // }
  Comma,           // ,
  Colon,           // :
  Semicolon,       // ;
  Dot,             // .
  Ellipsis,        // ...
  Question,        // ?
  QuestionDot,     // ?.
  Backtick,        // `

  // Core operators
  Plus,             // +
  Minus,            // -
  Asterisk,         // *
  Slash,            // /
  Percent,          // %
  StarStar,         // **

  Exclamation,      // !
  Ampersand,        // &
  Bar,              // |

  AmpersandAmpersand, // &&
  BarBar,             // ||
  QuestionQuestion,   // ??

  LessThan,            // <
  LessThanOrEqual,     // <=
  GreaterThan,         // >
  GreaterThanOrEqual,  // >=

  Equals,          // =
  PlusEquals,      // +=
  MinusEquals,     // -=
  AsteriskEquals,  // *=
  SlashEquals,     // /=

  EqualsEquals,             // ==
  EqualsEqualsEquals,       // ===
  ExclamationEquals,        // !=
  ExclamationEqualsEquals,  // !==

  PlusPlus,        // ++
  MinusMinus,      // --

  EqualsGreaterThan, // =>

  // Fallback for unexpected characters
  Unknown,
}

/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */

/** Value payload for tokens; primitives only. */
export type TokenValue = string | number | boolean | null | undefined;

export enum TokenFlags {
  None = 0,
  Literal = 1 << 0,
  IdentifierName = 1 << 1,
  PrimaryStart = 1 << 2,
  BindingPatternStart = 1 << 3,
  AssignmentOperator = 1 << 4,
  PrefixUnaryOperator = 1 << 5,
}

export function tokenFlags(type: TokenType): TokenFlags {
  switch (type) {
    case TokenType.Identifier:
      return TokenFlags.IdentifierName | TokenFlags.PrimaryStart | TokenFlags.BindingPatternStart;
    case TokenType.KeywordNew:
    case TokenType.KeywordInstanceof:
    case TokenType.KeywordIn:
    case TokenType.KeywordOf:
      return TokenFlags.IdentifierName;
    case TokenType.KeywordThis:
    case TokenType.KeywordDollarThis:
    case TokenType.KeywordDollarParent:
      return TokenFlags.IdentifierName | TokenFlags.PrimaryStart;
    case TokenType.KeywordTypeof:
    case TokenType.KeywordVoid:
      return TokenFlags.IdentifierName | TokenFlags.PrefixUnaryOperator;
    case TokenType.BooleanLiteral:
    case TokenType.NullLiteral:
    case TokenType.UndefinedLiteral:
    case TokenType.NumericLiteral:
    case TokenType.StringLiteral:
      return TokenFlags.Literal | TokenFlags.PrimaryStart;
    case TokenType.OpenParen:
    case TokenType.Backtick:
      return TokenFlags.PrimaryStart;
    case TokenType.OpenBracket:
    case TokenType.OpenBrace:
      return TokenFlags.PrimaryStart | TokenFlags.BindingPatternStart;
    case TokenType.Equals:
    case TokenType.PlusEquals:
    case TokenType.MinusEquals:
    case TokenType.AsteriskEquals:
    case TokenType.SlashEquals:
      return TokenFlags.AssignmentOperator;
    case TokenType.Plus:
    case TokenType.Minus:
    case TokenType.Exclamation:
    case TokenType.PlusPlus:
    case TokenType.MinusMinus:
      return TokenFlags.PrefixUnaryOperator;
    default:
      return TokenFlags.None;
  }
}

export function hasTokenFlag(type: TokenType, flag: TokenFlags): boolean {
  return (tokenFlags(type) & flag) !== 0;
}

export function tokenTypeName(type: TokenType): string {
  return TokenType[type] ?? 'Unknown';
}

/**
 * Single lexical token.
 *
 * - `type`   : TokenType discriminator
 * - `value`  : decoded primitive for literals (number/boolean/null/string),
 *              identifier/keyword text for name-like tokens, or undefined when not applicable
 * - `start`  : inclusive UTF-16 offset in the source string
 * - `end`    : exclusive UTF-16 offset in the source string
 * - `unterminated` : optional flag, used for unterminated string literals
 */
export class Token {
  constructor(
    readonly type: TokenType,
    readonly value: TokenValue,
    readonly start: number,
    readonly end: number,
    /** Marked true for unterminated string literals (e.g. reached EOF without closing quote). */
    readonly unterminated = false,
  ) {}
}

/**
 * Scanner for the Aurelia expression language.
 *
 * - Construct with the full expression string.
 * - Call `next()` to consume tokens (skips whitespace & comments).
 * - Call `peek()` to look ahead without consuming.
 *
 * Offsets are 0-based UTF-16 code units into the original string.
 */
export class Scanner {
  private readonly source: string;
  private readonly length: number;
  private index = 0;
  private lookahead: Token | null = null;

  constructor(source: string) {
    this.source = source;
    this.length = source.length;
  }

  /** Current scanning position (0‑based UTF‑16 offset). */
  get position(): number {
    return this.index;
  }

  /** Reset the scanner to an arbitrary position (default 0). */
  reset(position = 0): void {
    if (position < 0 || position > this.length) {
      throw new RangeError(`Scanner.reset: position ${position} is out of range 0..${this.length}`);
    }
    this.index = position;
    this.lookahead = null;
  }

  /**
   * Peek the next token without consuming it.
   * Always returns the same Token instance until `next()` is called.
   */
  peek(): Token {
    if (this.lookahead == null) {
      this.lookahead = this.scanToken();
    }
    return this.lookahead;
  }

  /**
   * Consume and return the next token.
   */
  next(): Token {
    const t = this.peek();
    this.lookahead = null;
    return t;
  }

  // --------------------------------------------------------------------------------------
  // Core scanning
  // --------------------------------------------------------------------------------------

  private scanToken(): Token {
    this.skipWhitespaceAndComments();

    const start = this.index;

    if (start >= this.length) {
      return new Token(TokenType.EOF, undefined, start, start);
    }

    const ch = this.charCodeAt(this.index);

    // Identifiers / keywords / specials
    if (this.isIdentifierStart(ch)) {
      return this.scanIdentifierOrKeyword();
    }

    // Numbers: decimal integer/float/exponent, with optional leading dot
    if (this.isDigit(ch) || (ch === CharCode.Dot && this.isDigit(this.charCodeAt(this.index + 1)))) {
      return this.scanNumber(ch === CharCode.Dot);
    }

    // Strings
    if (ch === CharCode.SingleQuote || ch === CharCode.DoubleQuote) {
      return this.scanString();
    }

    return this.scanPunctuationOrOperator(ch, start);
  }

  private scanPunctuationOrOperator(ch: number, start: number): Token {
    switch (ch) {
      case CharCode.OpenParen:
        return this.scanOneChar(TokenType.OpenParen, start);
      case CharCode.CloseParen:
        return this.scanOneChar(TokenType.CloseParen, start);
      case CharCode.OpenBracket:
        return this.scanOneChar(TokenType.OpenBracket, start);
      case CharCode.CloseBracket:
        return this.scanOneChar(TokenType.CloseBracket, start);
      case CharCode.OpenBrace:
        return this.scanOneChar(TokenType.OpenBrace, start);
      case CharCode.CloseBrace:
        return this.scanOneChar(TokenType.CloseBrace, start);
      case CharCode.Comma:
        return this.scanOneChar(TokenType.Comma, start);
      case CharCode.Colon:
        return this.scanOneChar(TokenType.Colon, start);
      case CharCode.Semicolon:
        return this.scanOneChar(TokenType.Semicolon, start);
      case CharCode.Backtick:
        return this.scanOneChar(TokenType.Backtick, start);
      case CharCode.Percent:
        return this.scanOneChar(TokenType.Percent, start);
      case CharCode.Dot:
        return this.scanDot(start);
      case CharCode.Question:
        return this.scanQuestion(start);
      case CharCode.Plus:
        return this.scanPlus(start);
      case CharCode.Minus:
        return this.scanMinus(start);
      case CharCode.Asterisk:
        return this.scanAsterisk(start);
      case CharCode.Slash:
        return this.scanSlash(start);
      case CharCode.Exclamation:
        return this.scanExclamation(start);
      case CharCode.Ampersand:
        return this.scanAmpersand(start);
      case CharCode.Bar:
        return this.scanBar(start);
      case CharCode.LessThan:
        return this.scanLessThan(start);
      case CharCode.GreaterThan:
        return this.scanGreaterThan(start);
      case CharCode.Equals:
        return this.scanEquals(start);
      default:
        return this.scanUnknown(start);
    }
  }

  private scanOneChar(type: TokenType, start: number): Token {
    this.index++;
    return new Token(type, undefined, start, this.index);
  }

  private scanDot(start: number): Token {
    const next = this.charCodeAt(this.index + 1);
    const next2 = this.charCodeAt(this.index + 2);
    // Leading-dot numeric literals are handled before punctuation scanning.
    if (next === CharCode.Dot && next2 === CharCode.Dot) {
      this.index += 3;
      return new Token(TokenType.Ellipsis, undefined, start, this.index);
    }
    return this.scanOneChar(TokenType.Dot, start);
  }

  private scanQuestion(start: number): Token {
    const next = this.charCodeAt(this.index + 1);
    if (next === CharCode.Question) {
      this.index += 2;
      return new Token(TokenType.QuestionQuestion, undefined, start, this.index);
    }
    if (next === CharCode.Dot) {
      this.index += 2;
      return new Token(TokenType.QuestionDot, undefined, start, this.index);
    }
    return this.scanOneChar(TokenType.Question, start);
  }

  private scanPlus(start: number): Token {
    const next = this.charCodeAt(this.index + 1);
    if (next === CharCode.Plus) {
      this.index += 2;
      return new Token(TokenType.PlusPlus, undefined, start, this.index);
    }
    if (next === CharCode.Equals) {
      this.index += 2;
      return new Token(TokenType.PlusEquals, undefined, start, this.index);
    }
    return this.scanOneChar(TokenType.Plus, start);
  }

  private scanMinus(start: number): Token {
    const next = this.charCodeAt(this.index + 1);
    if (next === CharCode.Minus) {
      this.index += 2;
      return new Token(TokenType.MinusMinus, undefined, start, this.index);
    }
    if (next === CharCode.Equals) {
      this.index += 2;
      return new Token(TokenType.MinusEquals, undefined, start, this.index);
    }
    return this.scanOneChar(TokenType.Minus, start);
  }

  private scanAsterisk(start: number): Token {
    const next = this.charCodeAt(this.index + 1);
    if (next === CharCode.Asterisk) {
      this.index += 2;
      return new Token(TokenType.StarStar, undefined, start, this.index);
    }
    if (next === CharCode.Equals) {
      this.index += 2;
      return new Token(TokenType.AsteriskEquals, undefined, start, this.index);
    }
    return this.scanOneChar(TokenType.Asterisk, start);
  }

  private scanSlash(start: number): Token {
    const next = this.charCodeAt(this.index + 1);
    if (next === CharCode.Equals) {
      this.index += 2;
      return new Token(TokenType.SlashEquals, undefined, start, this.index);
    }
    return this.scanOneChar(TokenType.Slash, start);
  }

  private scanExclamation(start: number): Token {
    const next = this.charCodeAt(this.index + 1);
    if (next === CharCode.Equals) {
      const next2 = this.charCodeAt(this.index + 2);
      if (next2 === CharCode.Equals) {
        this.index += 3;
        return new Token(TokenType.ExclamationEqualsEquals, undefined, start, this.index);
      }
      this.index += 2;
      return new Token(TokenType.ExclamationEquals, undefined, start, this.index);
    }
    return this.scanOneChar(TokenType.Exclamation, start);
  }

  private scanAmpersand(start: number): Token {
    const next = this.charCodeAt(this.index + 1);
    if (next === CharCode.Ampersand) {
      this.index += 2;
      return new Token(TokenType.AmpersandAmpersand, undefined, start, this.index);
    }
    return this.scanOneChar(TokenType.Ampersand, start);
  }

  private scanBar(start: number): Token {
    const next = this.charCodeAt(this.index + 1);
    if (next === CharCode.Bar) {
      this.index += 2;
      return new Token(TokenType.BarBar, undefined, start, this.index);
    }
    return this.scanOneChar(TokenType.Bar, start);
  }

  private scanLessThan(start: number): Token {
    const next = this.charCodeAt(this.index + 1);
    if (next === CharCode.Equals) {
      this.index += 2;
      return new Token(TokenType.LessThanOrEqual, undefined, start, this.index);
    }
    return this.scanOneChar(TokenType.LessThan, start);
  }

  private scanGreaterThan(start: number): Token {
    const next = this.charCodeAt(this.index + 1);
    if (next === CharCode.Equals) {
      this.index += 2;
      return new Token(TokenType.GreaterThanOrEqual, undefined, start, this.index);
    }
    return this.scanOneChar(TokenType.GreaterThan, start);
  }

  private scanEquals(start: number): Token {
    const next = this.charCodeAt(this.index + 1);
    if (next === CharCode.GreaterThan) {
      this.index += 2;
      return new Token(TokenType.EqualsGreaterThan, undefined, start, this.index);
    }
    if (next === CharCode.Equals) {
      const next2 = this.charCodeAt(this.index + 2);
      if (next2 === CharCode.Equals) {
        this.index += 3;
        return new Token(TokenType.EqualsEqualsEquals, undefined, start, this.index);
      }
      this.index += 2;
      return new Token(TokenType.EqualsEquals, undefined, start, this.index);
    }
    return this.scanOneChar(TokenType.Equals, start);
  }

  private scanUnknown(start: number): Token {
    this.index++;
    return new Token(
      TokenType.Unknown,
      this.source.slice(start, this.index),
      start,
      this.index,
    );
  }

  // --------------------------------------------------------------------------------------
  // Helpers: whitespace, comments, identifiers, numbers, strings
  // --------------------------------------------------------------------------------------

  private skipWhitespaceAndComments(): void {
    while (this.index < this.length) {
      const ch = this.charCodeAt(this.index);

      // Whitespace
      if (this.isWhitespace(ch)) {
        this.index++;
        continue;
      }

      // Line comment: // ...
      if (ch === CharCode.Slash && this.charCodeAt(this.index + 1) === CharCode.Slash) {
        this.index += 2;
        while (this.index < this.length) {
          const c = this.charCodeAt(this.index);
          if (c === CharCode.LineFeed || c === CharCode.CarriageReturn) break;
          this.index++;
        }
        continue;
      }

      // Block comment: /* ... */
      if (ch === CharCode.Slash && this.charCodeAt(this.index + 1) === CharCode.Asterisk) {
        this.index += 2;
        while (this.index < this.length) {
          const c = this.charCodeAt(this.index);
          if (c === CharCode.Asterisk && this.charCodeAt(this.index + 1) === CharCode.Slash) {
            this.index += 2;
            break;
          }
          this.index++;
        }
        continue;
      }

      break;
    }
  }

  private scanIdentifierOrKeyword(): Token {
    const start = this.index;
    this.index++; // consume first char

    while (this.index < this.length && this.isIdentifierPart(this.charCodeAt(this.index))) {
      this.index++;
    }

    const end = this.index;
    const text = this.source.slice(start, end);

    // Keyword / literal classification
    switch (text) {
      case "new":
        return new Token(TokenType.KeywordNew, text, start, end);
      case "typeof":
        return new Token(TokenType.KeywordTypeof, text, start, end);
      case "void":
        return new Token(TokenType.KeywordVoid, text, start, end);
      case "instanceof":
        return new Token(TokenType.KeywordInstanceof, text, start, end);
      case "in":
        return new Token(TokenType.KeywordIn, text, start, end);
      case "of":
        return new Token(TokenType.KeywordOf, text, start, end);
      case "this":
        return new Token(TokenType.KeywordThis, text, start, end);
      case "$this":
        return new Token(TokenType.KeywordDollarThis, text, start, end);
      case "$parent":
        return new Token(TokenType.KeywordDollarParent, text, start, end);
      case "true":
        return new Token(TokenType.BooleanLiteral, true, start, end);
      case "false":
        return new Token(TokenType.BooleanLiteral, false, start, end);
      case "null":
        return new Token(TokenType.NullLiteral, null, start, end);
      case "undefined":
        // Note: we use `undefined` as the runtime value here to match JS.
        return new Token(TokenType.UndefinedLiteral, undefined, start, end);
      default:
        return new Token(TokenType.Identifier, text, start, end);
    }
  }

  private scanNumber(startsWithDot: boolean): Token {
    const start = this.index;

    if (startsWithDot) {
      // Leading '.' is part of the number; we've already ensured the next char is a digit.
      this.index++; // consume '.'
    }

    // Integer part
    while (this.index < this.length && this.isDigit(this.charCodeAt(this.index))) {
      this.index++;
    }

    // Fractional part ('.' digits)
    if (!startsWithDot && this.charCodeAt(this.index) === CharCode.Dot && this.isDigit(this.charCodeAt(this.index + 1))) {
      this.index++; // consume '.'
      while (this.index < this.length && this.isDigit(this.charCodeAt(this.index))) {
        this.index++;
      }
    }

    // Exponent part (e/E [+-]? digits)
    const e = this.charCodeAt(this.index);
    if (e === CharCode.LowercaseE || e === CharCode.UppercaseE) {
      const sign = this.charCodeAt(this.index + 1);
      const afterSign = sign === CharCode.Plus || sign === CharCode.Minus ? this.charCodeAt(this.index + 2) : this.charCodeAt(this.index + 1);
      if (this.isDigit(afterSign)) {
        this.index++; // consume 'e' / 'E'
        if (sign === CharCode.Plus || sign === CharCode.Minus) {
          this.index++; // consume sign
        }
        while (this.index < this.length && this.isDigit(this.charCodeAt(this.index))) {
          this.index++;
        }
      }
    }

    const end = this.index;
    const raw = this.source.slice(start, end);
    const value = Number(raw);
    return new Token(TokenType.NumericLiteral, value, start, end);
  }

  private scanString(): Token {
    const quote = this.charCodeAt(this.index); // ' or "
    const start = this.index;
    this.index++; // consume opening quote

    let result = "";
    let closed = false;

    while (this.index < this.length) {
      const ch = this.charCodeAt(this.index);

      if (ch === quote) {
        this.index++; // consume closing quote
        closed = true;
        break;
      }

      if (ch === CharCode.Backslash) {
        // Escape sequence
        const next = this.charCodeAt(this.index + 1);
        if (next < 0) {
          // Backslash at end of input; treat as unterminated
          this.index++;
          break;
        }

        switch (next) {
          case CharCode.SingleQuote:
            result += "'";
            this.index += 2;
            break;
          case CharCode.DoubleQuote:
            result += "\"";
            this.index += 2;
            break;
          case CharCode.Backslash:
            result += "\\";
            this.index += 2;
            break;
          case CharCode.LowercaseN:
            result += "\n";
            this.index += 2;
            break;
          case CharCode.LowercaseR:
            result += "\r";
            this.index += 2;
            break;
          case CharCode.LowercaseT:
            result += "\t";
            this.index += 2;
            break;
          case CharCode.LowercaseB:
            result += "\b";
            this.index += 2;
            break;
          case CharCode.LowercaseF:
            result += "\f";
            this.index += 2;
            break;
          case CharCode.LowercaseV:
            result += "\v";
            this.index += 2;
            break;
          case CharCode.Zero:
            result += "\0";
            this.index += 2;
            break;
          default: {
            // Simple escape: just take the escaped char as-is.
            result += String.fromCharCode(next);
            this.index += 2;
            break;
          }
        }
        continue;
      }

      // Regular character
      result += String.fromCharCode(ch);
      this.index++;
    }

    const end = this.index;
    return new Token(TokenType.StringLiteral, result, start, end, !closed);
  }

  // --------------------------------------------------------------------------------------
  // Char helpers
  // --------------------------------------------------------------------------------------

  private charCodeAt(index: number): number {
    if (index < 0 || index >= this.length) return -1;
    return this.source.charCodeAt(index);
  }

  private isWhitespace(ch: number): boolean {
    return (
      ch === CharCode.Space ||
      ch === CharCode.Tab ||
      ch === CharCode.CarriageReturn ||
      ch === CharCode.LineFeed ||
      ch === CharCode.VerticalTab ||
      ch === CharCode.FormFeed ||
      ch === CharCode.NonBreakingSpace
    );
  }

  private isDigit(ch: number): boolean {
    return ch >= CharCode.Zero && ch <= CharCode.Nine;
  }

  private isIdentifierStart(ch: number): boolean {
    if (ch < 0) return false;
    if (
      (ch >= CharCode.UppercaseA && ch <= CharCode.UppercaseZ) ||
      (ch >= CharCode.LowercaseA && ch <= CharCode.LowercaseZ) ||
      ch === CharCode.Dollar ||
      ch === CharCode.Underscore
    ) {
      return true;
    }
    return isInRanges(ch, IdentifierStartBmpRanges);
  }

  private isIdentifierPart(ch: number): boolean {
    if (this.isIdentifierStart(ch)) return true;
    if (this.isDigit(ch)) return true;
    return false;
  }

}

// ----------------------------------------------------------------------------------------
// CharCode constants
// ----------------------------------------------------------------------------------------

export const enum CharCode {
  // ASCII control & whitespace
  Tab = 0x0009,
  LineFeed = 0x000a,
  VerticalTab = 0x000b,
  FormFeed = 0x000c,
  CarriageReturn = 0x000d,
  Space = 0x0020,
  NonBreakingSpace = 0x00a0,

  // Digits
  Zero = 0x0030,
  Nine = 0x0039,

  // Letters
  UppercaseA = 0x0041,
  UppercaseZ = 0x005a,
  LowercaseA = 0x0061,
  LowercaseZ = 0x007a,

  // Symbols / operators / punctuation
  Dollar = 0x0024,           // $
  Percent = 0x0025,          // %
  Ampersand = 0x0026,        // &
  OpenParen = 0x0028,        // (
  CloseParen = 0x0029,       // )
  Asterisk = 0x002a,         // *
  Plus = 0x002b,             // +
  Comma = 0x002c,            // ,
  Minus = 0x002d,            // -
  Dot = 0x002e,              // .
  Slash = 0x002f,            // /
  Colon = 0x003a,            // :
  Semicolon = 0x003b,        // ;
  LessThan = 0x003c,         // <
  Equals = 0x003d,           // =
  GreaterThan = 0x003e,      // >
  Question = 0x003f,         // ?
  At = 0x0040,               // @
  OpenBracket = 0x005b,      // [
  Backslash = 0x005c,        // \
  CloseBracket = 0x005d,     // ]
  Caret = 0x005e,            // ^
  Underscore = 0x005f,       // _
  Backtick = 0x0060,         // `
  OpenBrace = 0x007b,        // {
  Bar = 0x007c,              // |
  CloseBrace = 0x007d,       // }
  Tilde = 0x007e,            // ~

  SingleQuote = 0x0027,      // '
  DoubleQuote = 0x0022,      // "
  Exclamation = 0x0021,      // !

  // Escape helpers
  LowercaseN = 0x006e,       // n
  LowercaseR = 0x0072,       // r
  LowercaseT = 0x0074,       // t
  LowercaseB = 0x0062,       // b
  LowercaseF = 0x0066,       // f
  LowercaseV = 0x0076,       // v
  LowercaseE = 0x0065,       // e
  UppercaseE = 0x0045,       // E
}

// IdentifierStart_BMP ranges.
const IdentifierStartBmpRanges: ReadonlyArray<readonly [number, number]> = [
  [0x0024, 0x0024], // $
  [0x0041, 0x005a], // A-Z
  [0x005f, 0x005f], // _
  [0x0061, 0x007a], // a-z
  [0x00aa, 0x00aa],
  [0x00ba, 0x00ba],
  [0x00c0, 0x00d6],
  [0x00d8, 0x00f6],
  [0x00f8, 0x02b8],
  [0x02e0, 0x02e4],
  [0x1d00, 0x1d25],
  [0x1d2c, 0x1d5c],
  [0x1d62, 0x1d65],
  [0x1d6b, 0x1d77],
  [0x1d79, 0x1dbe],
  [0x1e00, 0x1eff],
  [0x2071, 0x2071],
  [0x207f, 0x207f],
  [0x2090, 0x209c],
  [0x212a, 0x212b],
  [0x2132, 0x2132],
  [0x214e, 0x214e],
  [0x2160, 0x2188],
  [0x2c60, 0x2c7f],
  [0xa722, 0xa787],
  [0xa78b, 0xa7ae],
  [0xa7b0, 0xa7b7],
  [0xa7f7, 0xa7ff],
  [0xab30, 0xab5a],
  [0xab5c, 0xab64],
  [0xfb00, 0xfb06],
  [0xff21, 0xff3a],
  [0xff41, 0xff5a],
];

function isInRanges(ch: number, ranges: ReadonlyArray<readonly [number, number]>): boolean {
  for (let i = 0; i < ranges.length; i++) {
    const [start, end] = ranges[i]!;
    if (ch >= start && ch <= end) return true;
  }
  return false;
}

