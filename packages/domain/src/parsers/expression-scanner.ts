/**
 * Token kinds produced by the expression Scanner.
 *
 * This is intentionally small and JS-ish, but tailored to Aurelia's
 * expression language (e.g. dedicated tokens for 'new', 'typeof', 'in', 'of',
 * '$this', '$parent', etc.).
 */
export enum TokenType {
  EOF = "EOF",

  // Identifiers & specials
  Identifier = "Identifier",
  KeywordNew = "KeywordNew",
  KeywordTypeof = "KeywordTypeof",
  KeywordVoid = "KeywordVoid",
  KeywordInstanceof = "KeywordInstanceof",
  KeywordIn = "KeywordIn",
  KeywordOf = "KeywordOf",
  KeywordThis = "KeywordThis",
  KeywordDollarThis = "KeywordDollarThis",
  KeywordDollarParent = "KeywordDollarParent",

  BooleanLiteral = "BooleanLiteral",
  NullLiteral = "NullLiteral",
  UndefinedLiteral = "UndefinedLiteral",
  NumericLiteral = "NumericLiteral",
  StringLiteral = "StringLiteral",

  // Punctuation / grouping
  OpenParen = "OpenParen",       // (
  CloseParen = "CloseParen",     // )
  OpenBracket = "OpenBracket",   // [
  CloseBracket = "CloseBracket", // ]
  OpenBrace = "OpenBrace",       // {
  CloseBrace = "CloseBrace",     // }
  Comma = "Comma",               // ,
  Colon = "Colon",               // :
  Semicolon = "Semicolon",       // ;
  Dot = "Dot",                   // .
  Ellipsis = "Ellipsis",         // ...
  Question = "Question",         // ?
  QuestionDot = "QuestionDot",   // ?.
  Backtick = "Backtick",         // `

  // Core operators
  Plus = "Plus",                 // +
  Minus = "Minus",               // -
  Asterisk = "Asterisk",         // *
  Slash = "Slash",               // /
  Percent = "Percent",           // %
  StarStar = "StarStar",         // **

  Exclamation = "Exclamation",   // !
  Ampersand = "Ampersand",       // &
  Bar = "Bar",                   // |

  AmpersandAmpersand = "AmpersandAmpersand", // &&
  BarBar = "BarBar",                         // ||
  QuestionQuestion = "QuestionQuestion",     // ??

  LessThan = "LessThan",         // <
  LessThanOrEqual = "LessThanOrEqual", // <=
  GreaterThan = "GreaterThan",   // >
  GreaterThanOrEqual = "GreaterThanOrEqual", // >=

  Equals = "Equals",             // =
  PlusEquals = "PlusEquals",     // +=
  MinusEquals = "MinusEquals",   // -=
  AsteriskEquals = "AsteriskEquals", // *=
  SlashEquals = "SlashEquals",   // /=

  EqualsEquals = "EqualsEquals",                 // ==
  EqualsEqualsEquals = "EqualsEqualsEquals",     // ===
  ExclamationEquals = "ExclamationEquals",       // !=
  ExclamationEqualsEquals = "ExclamationEqualsEquals", // !==

  PlusPlus = "PlusPlus",         // ++
  MinusMinus = "MinusMinus",     // --

  EqualsGreaterThan = "EqualsGreaterThan", // =>

  // Fallback for unexpected characters
  Unknown = "Unknown",
}

/** Value payload for tokens; primitives only. */
export type TokenValue = string | number | boolean | null | undefined;

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
export interface Token {
  type: TokenType;
  value: TokenValue;
  start: number;
  end: number;
  /** Marked true for unterminated string literals (e.g. reached EOF without closing quote). */
  unterminated?: boolean;
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
      return this.makeToken(TokenType.EOF, start, start, undefined);
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

    switch (ch) {
      // Grouping / punctuation
      case CharCode.OpenParen: {
        this.index++;
        return this.makeToken(TokenType.OpenParen, start, this.index, undefined);
      }
      case CharCode.CloseParen: {
        this.index++;
        return this.makeToken(TokenType.CloseParen, start, this.index, undefined);
      }
      case CharCode.OpenBracket: {
        this.index++;
        return this.makeToken(TokenType.OpenBracket, start, this.index, undefined);
      }
      case CharCode.CloseBracket: {
        this.index++;
        return this.makeToken(TokenType.CloseBracket, start, this.index, undefined);
      }
      case CharCode.OpenBrace: {
        this.index++;
        return this.makeToken(TokenType.OpenBrace, start, this.index, undefined);
      }
      case CharCode.CloseBrace: {
        this.index++;
        return this.makeToken(TokenType.CloseBrace, start, this.index, undefined);
      }
      case CharCode.Comma: {
        this.index++;
        return this.makeToken(TokenType.Comma, start, this.index, undefined);
      }
      case CharCode.Colon: {
        this.index++;
        return this.makeToken(TokenType.Colon, start, this.index, undefined);
      }
      case CharCode.Semicolon: {
        this.index++;
        return this.makeToken(TokenType.Semicolon, start, this.index, undefined);
      }
      case CharCode.Dot: {
        const next = this.charCodeAt(this.index + 1);
        const next2 = this.charCodeAt(this.index + 2);
        // Leading-dot numeric literals are handled earlier; so here we either
        // produce an ellipsis or a plain Dot.
        if (next === CharCode.Dot && next2 === CharCode.Dot) {
          this.index += 3;
          return this.makeToken(TokenType.Ellipsis, start, this.index, undefined);
        }
        this.index++;
        return this.makeToken(TokenType.Dot, start, this.index, undefined);
      }
      case CharCode.Backtick: {
        this.index++;
        return this.makeToken(TokenType.Backtick, start, this.index, undefined);
      }

      // ?  ??  ?.
      case CharCode.Question: {
        const next = this.charCodeAt(this.index + 1);
        if (next === CharCode.Question) {
          this.index += 2;
          return this.makeToken(TokenType.QuestionQuestion, start, this.index, undefined);
        }
        if (next === CharCode.Dot) {
          this.index += 2;
          return this.makeToken(TokenType.QuestionDot, start, this.index, undefined);
        }
        this.index++;
        return this.makeToken(TokenType.Question, start, this.index, undefined);
      }

      // +  ++  +=
      case CharCode.Plus: {
        const next = this.charCodeAt(this.index + 1);
        if (next === CharCode.Plus) {
          this.index += 2;
          return this.makeToken(TokenType.PlusPlus, start, this.index, undefined);
        }
        if (next === CharCode.Equals) {
          this.index += 2;
          return this.makeToken(TokenType.PlusEquals, start, this.index, undefined);
        }
        this.index++;
        return this.makeToken(TokenType.Plus, start, this.index, undefined);
      }

      // -  --  -=
      case CharCode.Minus: {
        const next = this.charCodeAt(this.index + 1);
        if (next === CharCode.Minus) {
          this.index += 2;
          return this.makeToken(TokenType.MinusMinus, start, this.index, undefined);
        }
        if (next === CharCode.Equals) {
          this.index += 2;
          return this.makeToken(TokenType.MinusEquals, start, this.index, undefined);
        }
        this.index++;
        return this.makeToken(TokenType.Minus, start, this.index, undefined);
      }

      // *  **  *=
      case CharCode.Asterisk: {
        const next = this.charCodeAt(this.index + 1);
        if (next === CharCode.Asterisk) {
          this.index += 2;
          return this.makeToken(TokenType.StarStar, start, this.index, undefined);
        }
        if (next === CharCode.Equals) {
          this.index += 2;
          return this.makeToken(TokenType.AsteriskEquals, start, this.index, undefined);
        }
        this.index++;
        return this.makeToken(TokenType.Asterisk, start, this.index, undefined);
      }

      // /  /=
      case CharCode.Slash: {
        const next = this.charCodeAt(this.index + 1);
        if (next === CharCode.Equals) {
          this.index += 2;
          return this.makeToken(TokenType.SlashEquals, start, this.index, undefined);
        }
        this.index++;
        return this.makeToken(TokenType.Slash, start, this.index, undefined);
      }

      // %
      case CharCode.Percent: {
        this.index++;
        return this.makeToken(TokenType.Percent, start, this.index, undefined);
      }

      // !  !=  !==
      case CharCode.Exclamation: {
        const next = this.charCodeAt(this.index + 1);
        if (next === CharCode.Equals) {
          const next2 = this.charCodeAt(this.index + 2);
          if (next2 === CharCode.Equals) {
            this.index += 3;
            return this.makeToken(TokenType.ExclamationEqualsEquals, start, this.index, undefined);
          }
          this.index += 2;
          return this.makeToken(TokenType.ExclamationEquals, start, this.index, undefined);
        }
        this.index++;
        return this.makeToken(TokenType.Exclamation, start, this.index, undefined);
      }

      // &  &&
      case CharCode.Ampersand: {
        const next = this.charCodeAt(this.index + 1);
        if (next === CharCode.Ampersand) {
          this.index += 2;
          return this.makeToken(TokenType.AmpersandAmpersand, start, this.index, undefined);
        }
        this.index++;
        return this.makeToken(TokenType.Ampersand, start, this.index, undefined);
      }

      // |  ||
      case CharCode.Bar: {
        const next = this.charCodeAt(this.index + 1);
        if (next === CharCode.Bar) {
          this.index += 2;
          return this.makeToken(TokenType.BarBar, start, this.index, undefined);
        }
        this.index++;
        return this.makeToken(TokenType.Bar, start, this.index, undefined);
      }

      // <  <=
      case CharCode.LessThan: {
        const next = this.charCodeAt(this.index + 1);
        if (next === CharCode.Equals) {
          this.index += 2;
          return this.makeToken(TokenType.LessThanOrEqual, start, this.index, undefined);
        }
        this.index++;
        return this.makeToken(TokenType.LessThan, start, this.index, undefined);
      }

      // >  >=
      case CharCode.GreaterThan: {
        const next = this.charCodeAt(this.index + 1);
        if (next === CharCode.Equals) {
          this.index += 2;
          return this.makeToken(TokenType.GreaterThanOrEqual, start, this.index, undefined);
        }
        this.index++;
        return this.makeToken(TokenType.GreaterThan, start, this.index, undefined);
      }

      // =  ==  ===  =>
      case CharCode.Equals: {
        const next = this.charCodeAt(this.index + 1);
        if (next === CharCode.GreaterThan) {
          this.index += 2;
          return this.makeToken(TokenType.EqualsGreaterThan, start, this.index, undefined);
        }
        if (next === CharCode.Equals) {
          const next2 = this.charCodeAt(this.index + 2);
          if (next2 === CharCode.Equals) {
            this.index += 3;
            return this.makeToken(TokenType.EqualsEqualsEquals, start, this.index, undefined);
          }
          this.index += 2;
          return this.makeToken(TokenType.EqualsEquals, start, this.index, undefined);
        }
        this.index++;
        return this.makeToken(TokenType.Equals, start, this.index, undefined);
      }

      default: {
        // Fallback unknown token for any character we don't recognize.
        this.index++;
        return this.makeToken(
          TokenType.Unknown,
          start,
          this.index,
          this.source.slice(start, this.index),
        );
      }
    }
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
        return this.makeToken(TokenType.KeywordNew, start, end, text);
      case "typeof":
        return this.makeToken(TokenType.KeywordTypeof, start, end, text);
      case "void":
        return this.makeToken(TokenType.KeywordVoid, start, end, text);
      case "instanceof":
        return this.makeToken(TokenType.KeywordInstanceof, start, end, text);
      case "in":
        return this.makeToken(TokenType.KeywordIn, start, end, text);
      case "of":
        return this.makeToken(TokenType.KeywordOf, start, end, text);
      case "this":
        return this.makeToken(TokenType.KeywordThis, start, end, text);
      case "$this":
        return this.makeToken(TokenType.KeywordDollarThis, start, end, text);
      case "$parent":
        return this.makeToken(TokenType.KeywordDollarParent, start, end, text);
      case "true":
        return this.makeToken(TokenType.BooleanLiteral, start, end, true);
      case "false":
        return this.makeToken(TokenType.BooleanLiteral, start, end, false);
      case "null":
        return this.makeToken(TokenType.NullLiteral, start, end, null);
      case "undefined":
        // Note: we use `undefined` as the runtime value here to match JS.
        return this.makeToken(TokenType.UndefinedLiteral, start, end, undefined);
      default:
        return this.makeToken(TokenType.Identifier, start, end, text);
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
    return this.makeToken(TokenType.NumericLiteral, start, end, value);
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
    const tok: Token = this.makeToken(TokenType.StringLiteral, start, end, result);
    if (!closed) {
      tok.unterminated = true;
    }
    return tok;
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
    // ASCII letters + $ + _
    if (
      (ch >= CharCode.UppercaseA && ch <= CharCode.UppercaseZ) ||
      (ch >= CharCode.LowercaseA && ch <= CharCode.LowercaseZ) ||
      ch === CharCode.Dollar ||
      ch === CharCode.Underscore
    ) {
      return true;
    }

    // TODO: Extend to full IdentifierStart_BMP from the spec (IdentifierStart_BMP ranges).
    return false;
  }

  private isIdentifierPart(ch: number): boolean {
    if (this.isIdentifierStart(ch)) return true;
    if (this.isDigit(ch)) return true;

    // TODO: Extend to IdentifierPart_BMP (IdentifierStart_BMP ∪ DecimalNumber) from the spec.
    return false;
  }

  private makeToken(type: TokenType, start: number, end: number, value: TokenValue): Token {
    return { type, value, start, end };
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

