import { test, describe, expect } from "vitest";

import { Scanner, TokenType } from "../../out/compiler/index.js";

/**
 * Scan the entire input and return all tokens including EOF.
 */
function scanAll(source) {
  const scanner = new Scanner(source);
  const tokens = [];
  // Always include EOF as the last token
  for (;;) {
    const t = scanner.next();
    tokens.push(t);
    if (t.type === TokenType.EOF) break;
  }
  return tokens;
}

/**
 * Convenience for slicing the original text using a token's span.
 */
function textOf(source, token) {
  return source.slice(token.start, token.end);
}

describe("expression-scanner", () => {
  test("identifiers vs keywords and literals", () => {
    const src = "foo new typeof void instanceof in of this $this $parent true false null undefined bar";
    const tokens = scanAll(src);
    const types = tokens.map((t) => t.type);

    expect(types).toEqual([
      TokenType.Identifier,          // foo
      TokenType.KeywordNew,          // new
      TokenType.KeywordTypeof,       // typeof
      TokenType.KeywordVoid,         // void
      TokenType.KeywordInstanceof,   // instanceof
      TokenType.KeywordIn,           // in
      TokenType.KeywordOf,           // of
      TokenType.KeywordThis,         // this
      TokenType.KeywordDollarThis,   // $this
      TokenType.KeywordDollarParent, // $parent
      TokenType.BooleanLiteral,      // true
      TokenType.BooleanLiteral,      // false
      TokenType.NullLiteral,         // null
      TokenType.UndefinedLiteral,    // undefined
      TokenType.Identifier,          // bar
      TokenType.EOF,
    ]);

    // Check spans by slicing back into the original string
    expect(textOf(src, tokens[0])).toBe("foo");
    expect(textOf(src, tokens[1])).toBe("new");
    expect(textOf(src, tokens[2])).toBe("typeof");
    expect(textOf(src, tokens[3])).toBe("void");
    expect(textOf(src, tokens[4])).toBe("instanceof");
    expect(textOf(src, tokens[8])).toBe("$this");
    expect(textOf(src, tokens[9])).toBe("$parent");
    expect(textOf(src, tokens[10])).toBe("true");
    expect(textOf(src, tokens[11])).toBe("false");
    expect(textOf(src, tokens[14])).toBe("bar");
  });

  test("numeric literals (ints, decimals, leading dot)", () => {
    const src = "0 42 3.14 .5 10e2 .5e1 2e-3";
    const tokens = scanAll(src);
    const types = tokens.map((t) => t.type);

    expect(types).toEqual([
      TokenType.NumericLiteral,
      TokenType.NumericLiteral,
      TokenType.NumericLiteral,
      TokenType.NumericLiteral,
      TokenType.NumericLiteral,
      TokenType.NumericLiteral,
      TokenType.NumericLiteral,
      TokenType.EOF,
    ]);

    // Spans match the original source text
    expect(textOf(src, tokens[0])).toBe("0");
    expect(textOf(src, tokens[1])).toBe("42");
    expect(textOf(src, tokens[2])).toBe("3.14");
    expect(textOf(src, tokens[3])).toBe(".5");
    expect(textOf(src, tokens[4])).toBe("10e2");
    expect(textOf(src, tokens[5])).toBe(".5e1");
    expect(textOf(src, tokens[6])).toBe("2e-3");

    // And values are decoded numerically
    expect(tokens[2].value).toBe(3.14);
    expect(tokens[3].value).toBe(0.5);
    expect(tokens[4].value).toBe(10e2);
  });

  test("string literals, escapes, and unterminated strings", () => {
    const s1 = "'foo'";
    const s2 = "\"bar\"";
    const s3 = "'a\\'b'";
    const s4 = "\"c\\\"d\"";
    const s5 = "'\\n'";
    const s6 = "\"\\t\"";
    const s7 = "'\\v'";
    const s8 = "'\\0'";
    const s9 = "'\\q'";
    const s10 = "'\\r'";
    const s11 = "'\\b'";
    const s12 = "'\\\\'";
    const s13 = "'\\f'";

    const src = [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13].join(" ");
    const tokens = scanAll(src);
    const types = tokens.map((t) => t.type);

    const stringCount = 13;
    expect(types.length).toBe(stringCount + 1);
    for (let i = 0; i < stringCount; i++) expect(types[i]).toBe(TokenType.StringLiteral);
    expect(types[stringCount]).toBe(TokenType.EOF);

    // Spans -> raw text (including quotes) for a couple of tokens
    expect(textOf(src, tokens[0])).toBe(s1);
    expect(textOf(src, tokens[1])).toBe(s2);
    expect(textOf(src, tokens[2])).toBe(s3);
    expect(textOf(src, tokens[4])).toBe(s5);

    // Decoded values (quotes stripped, escapes handled)
    expect(tokens[0].value).toBe("foo");
    expect(tokens[1].value).toBe("bar");
    expect(tokens[2].value).toBe("a'b");
    expect(tokens[3].value).toBe('c"d');
    expect(tokens[4].value).toBe("\n");
    expect(tokens[5].value).toBe("\t");
    expect(tokens[6].value).toBe("\v");
    expect(tokens[7].value).toBe("\0");
    expect(tokens[8].value).toBe("q"); // default escape path
    expect(tokens[9].value).toBe("\r");
    expect(tokens[10].value).toBe("\b");
    expect(tokens[11].value).toBe("\\");
    expect(tokens[12].value).toBe("\f");

    // Unterminated string: should be marked and not crash
    const unterSrc = "'abc";
    const unterTokens = scanAll(unterSrc);

    expect(unterTokens[0].type).toBe(TokenType.StringLiteral);
    expect(unterTokens[0].unterminated).toBe(true);
    expect(textOf(unterSrc, unterTokens[0])).toBe("'abc");
    expect(unterTokens[1].type).toBe(TokenType.EOF);
  });

  test("operators", () => {
    const src = "+ - * / % ** == === != !== < <= > >= && || ?? = += -= *= /= => ++ -- & |";
    const tokens = scanAll(src);
    const types = tokens.map((t) => t.type);

    expect(types).toEqual([
      TokenType.Plus,
      TokenType.Minus,
      TokenType.Asterisk,
      TokenType.Slash,
      TokenType.Percent,
      TokenType.StarStar,
      TokenType.EqualsEquals,
      TokenType.EqualsEqualsEquals,
      TokenType.ExclamationEquals,
      TokenType.ExclamationEqualsEquals,
      TokenType.LessThan,
      TokenType.LessThanOrEqual,
      TokenType.GreaterThan,
      TokenType.GreaterThanOrEqual,
      TokenType.AmpersandAmpersand,
      TokenType.BarBar,
      TokenType.QuestionQuestion,
      TokenType.Equals,
      TokenType.PlusEquals,
      TokenType.MinusEquals,
      TokenType.AsteriskEquals,
      TokenType.SlashEquals,
      TokenType.EqualsGreaterThan,
      TokenType.PlusPlus,
      TokenType.MinusMinus,
      TokenType.Ampersand,
      TokenType.Bar,
      TokenType.EOF,
    ]);

    // Check a few multi-character operator spans
    expect(textOf(src, tokens[5])).toBe("**");
    expect(textOf(src, tokens[6])).toBe("==");
    expect(textOf(src, tokens[7])).toBe("===");
    expect(textOf(src, tokens[8])).toBe("!=");
    expect(textOf(src, tokens[9])).toBe("!==");
    expect(textOf(src, tokens[15])).toBe("||");
    expect(textOf(src, tokens[16])).toBe("??");
    expect(textOf(src, tokens[18])).toBe("+=");
    expect(textOf(src, tokens[22])).toBe("=>");
  });

  test("punctuation and question mark", () => {
    const src = "()[]{},:;.?";
    const tokens = scanAll(src);
    const types = tokens.map((t) => t.type);

    expect(types).toEqual([
      TokenType.OpenParen,
      TokenType.CloseParen,
      TokenType.OpenBracket,
      TokenType.CloseBracket,
      TokenType.OpenBrace,
      TokenType.CloseBrace,
      TokenType.Comma,
      TokenType.Colon,
      TokenType.Semicolon,
      TokenType.Dot,
      TokenType.Question,
      TokenType.EOF,
    ]);

    // Verify a couple of slices
    expect(textOf(src, tokens[0])).toBe("(");
    expect(textOf(src, tokens[1])).toBe(")");
    expect(textOf(src, tokens[2])).toBe("[");
    expect(textOf(src, tokens[3])).toBe("]");
    expect(textOf(src, tokens[9])).toBe(".");
    expect(textOf(src, tokens[10])).toBe("?");
  });

  test("BMP identifier start/part (non-ASCII) is accepted", () => {
    const src = "\u00C9foo \u00AA\u00AAbaz";
    const tokens = scanAll(src);
    expect(tokens[0].type).toBe(TokenType.Identifier);
    expect(tokens[0].value).toBe("\u00C9foo");
    expect(tokens[1].type).toBe(TokenType.Identifier); // whitespace skipped by scanner
    expect(tokens[1].value).toBe("\u00AA\u00AAbaz");
  });

  test("unknown token fallback", () => {
    const src = "@";
    const tokens = scanAll(src);
    expect(tokens[0].type).toBe(TokenType.Unknown);
    expect(tokens[0].value).toBe("@");
    expect(tokens[1].type).toBe(TokenType.EOF);
  });

  test("unterminated block comment reaches EOF", () => {
    const src = "/* unclosed";
    const s = new Scanner(src);
    const t = s.next();
    expect(t.type).toBe(TokenType.EOF);
  });

  test("line/block comments are skipped", () => {
    const src = "// line\n/* block */foo";
    const tokens = scanAll(src);
    expect(tokens[0].type).toBe(TokenType.Identifier);
    expect(tokens[0].value).toBe("foo");
  });

  test("backslash at end of string marks unterminated", () => {
    const s = new Scanner("'abc\\\\");
    const tok = s.next();
    expect(tok.type).toBe(TokenType.StringLiteral);
    expect(tok.value).toBe("abc\\");
    expect(tok.unterminated).toBe(true);
  });

  test("backslash as final char in empty string body", () => {
    const s = new Scanner("'\\\\");
    const tok = s.next();
    expect(tok.type).toBe(TokenType.StringLiteral);
    expect(tok.value).toBe("\\");
    expect(tok.unterminated).toBe(true);
  });

  test("position getter and reset range guard", () => {
    const s = new Scanner("abc");
    expect(s.position).toBe(0);
    s.next();
    expect(s.position).toBeGreaterThan(0);
    expect(() => s.reset(-1)).toThrow(/out of range/);
  });

  test("backticks are tokenized consistently", () => {
    const src = "`foo` `bar`";
    const tokens = scanAll(src);
    const types = tokens.map((t) => t.type);

    expect(types).toEqual([
      TokenType.Backtick,
      TokenType.Identifier,
      TokenType.Backtick,
      TokenType.Backtick,
      TokenType.Identifier,
      TokenType.Backtick,
      TokenType.EOF,
    ]);

    // Backtick spans should be exactly "`"
    expect(textOf(src, tokens[0])).toBe("`");
    expect(textOf(src, tokens[2])).toBe("`");
    expect(textOf(src, tokens[3])).toBe("`");
    expect(textOf(src, tokens[5])).toBe("`");

    // Identifier spans inside the backticks
    expect(textOf(src, tokens[1])).toBe("foo");
    expect(textOf(src, tokens[4])).toBe("bar");
  });
});

