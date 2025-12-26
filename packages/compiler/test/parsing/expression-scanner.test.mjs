import test, { describe }  from "node:test";
import assert from "node:assert/strict";

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

    assert.deepEqual(types, [
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
    assert.equal(textOf(src, tokens[0]), "foo");
    assert.equal(textOf(src, tokens[1]), "new");
    assert.equal(textOf(src, tokens[2]), "typeof");
    assert.equal(textOf(src, tokens[3]), "void");
    assert.equal(textOf(src, tokens[4]), "instanceof");
    assert.equal(textOf(src, tokens[8]), "$this");
    assert.equal(textOf(src, tokens[9]), "$parent");
    assert.equal(textOf(src, tokens[10]), "true");
    assert.equal(textOf(src, tokens[11]), "false");
    assert.equal(textOf(src, tokens[14]), "bar");
  });

  test("numeric literals (ints, decimals, leading dot)", () => {
    const src = "0 42 3.14 .5 10e2 .5e1 2e-3";
    const tokens = scanAll(src);
    const types = tokens.map((t) => t.type);

    assert.deepEqual(types, [
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
    assert.equal(textOf(src, tokens[0]), "0");
    assert.equal(textOf(src, tokens[1]), "42");
    assert.equal(textOf(src, tokens[2]), "3.14");
    assert.equal(textOf(src, tokens[3]), ".5");
    assert.equal(textOf(src, tokens[4]), "10e2");
    assert.equal(textOf(src, tokens[5]), ".5e1");
    assert.equal(textOf(src, tokens[6]), "2e-3");

    // And values are decoded numerically
    assert.equal(tokens[2].value, 3.14);
    assert.equal(tokens[3].value, 0.5);
    assert.equal(tokens[4].value, 10e2);
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
    assert.equal(types.length, stringCount + 1);
    for (let i = 0; i < stringCount; i++) assert.equal(types[i], TokenType.StringLiteral);
    assert.equal(types[stringCount], TokenType.EOF);

    // Spans -> raw text (including quotes) for a couple of tokens
    assert.equal(textOf(src, tokens[0]), s1);
    assert.equal(textOf(src, tokens[1]), s2);
    assert.equal(textOf(src, tokens[2]), s3);
    assert.equal(textOf(src, tokens[4]), s5);

    // Decoded values (quotes stripped, escapes handled)
    assert.equal(tokens[0].value, "foo");
    assert.equal(tokens[1].value, "bar");
    assert.equal(tokens[2].value, "a'b");
    assert.equal(tokens[3].value, 'c"d');
    assert.equal(tokens[4].value, "\n");
    assert.equal(tokens[5].value, "\t");
    assert.equal(tokens[6].value, "\v");
    assert.equal(tokens[7].value, "\0");
    assert.equal(tokens[8].value, "q"); // default escape path
    assert.equal(tokens[9].value, "\r");
    assert.equal(tokens[10].value, "\b");
    assert.equal(tokens[11].value, "\\");
    assert.equal(tokens[12].value, "\f");

    // Unterminated string: should be marked and not crash
    const unterSrc = "'abc";
    const unterTokens = scanAll(unterSrc);

    assert.equal(unterTokens[0].type, TokenType.StringLiteral);
    assert.equal(unterTokens[0].unterminated, true);
    assert.equal(textOf(unterSrc, unterTokens[0]), "'abc");
    assert.equal(unterTokens[1].type, TokenType.EOF);
  });

  test("operators", () => {
    const src = "+ - * / % ** == === != !== < <= > >= && || ?? = += -= *= /= => ++ -- & |";
    const tokens = scanAll(src);
    const types = tokens.map((t) => t.type);

    assert.deepEqual(types, [
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
    assert.equal(textOf(src, tokens[5]), "**");
    assert.equal(textOf(src, tokens[6]), "==");
    assert.equal(textOf(src, tokens[7]), "===");
    assert.equal(textOf(src, tokens[8]), "!=");
    assert.equal(textOf(src, tokens[9]), "!==");
    assert.equal(textOf(src, tokens[15]), "||");
    assert.equal(textOf(src, tokens[16]), "??");
    assert.equal(textOf(src, tokens[18]), "+=");
    assert.equal(textOf(src, tokens[22]), "=>");
  });

  test("punctuation and question mark", () => {
    const src = "()[]{},:;.?";
    const tokens = scanAll(src);
    const types = tokens.map((t) => t.type);

    assert.deepEqual(types, [
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
    assert.equal(textOf(src, tokens[0]), "(");
    assert.equal(textOf(src, tokens[1]), ")");
    assert.equal(textOf(src, tokens[2]), "[");
    assert.equal(textOf(src, tokens[3]), "]");
    assert.equal(textOf(src, tokens[9]), ".");
    assert.equal(textOf(src, tokens[10]), "?");
  });

  test("BMP identifier start/part (non-ASCII) is accepted", () => {
    const src = "\u00C9foo \u00AA\u00AAbaz";
    const tokens = scanAll(src);
    assert.equal(tokens[0].type, TokenType.Identifier);
    assert.equal(tokens[0].value, "\u00C9foo");
    assert.equal(tokens[1].type, TokenType.Identifier); // whitespace skipped by scanner
    assert.equal(tokens[1].value, "\u00AA\u00AAbaz");
  });

  test("unknown token fallback", () => {
    const src = "@";
    const tokens = scanAll(src);
    assert.equal(tokens[0].type, TokenType.Unknown);
    assert.equal(tokens[0].value, "@");
    assert.equal(tokens[1].type, TokenType.EOF);
  });

  test("unterminated block comment reaches EOF", () => {
    const src = "/* unclosed";
    const s = new Scanner(src);
    const t = s.next();
    assert.equal(t.type, TokenType.EOF);
  });

  test("line/block comments are skipped", () => {
    const src = "// line\n/* block */foo";
    const tokens = scanAll(src);
    assert.equal(tokens[0].type, TokenType.Identifier);
    assert.equal(tokens[0].value, "foo");
  });

  test("backslash at end of string marks unterminated", () => {
    const s = new Scanner("'abc\\\\");
    const tok = s.next();
    assert.equal(tok.type, TokenType.StringLiteral);
    assert.equal(tok.value, "abc\\");
    assert.equal(tok.unterminated, true);
  });

  test("backslash as final char in empty string body", () => {
    const s = new Scanner("'\\\\");
    const tok = s.next();
    assert.equal(tok.type, TokenType.StringLiteral);
    assert.equal(tok.value, "\\");
    assert.equal(tok.unterminated, true);
  });

  test("position getter and reset range guard", () => {
    const s = new Scanner("abc");
    assert.equal(s.position, 0);
    s.next();
    assert.ok(s.position > 0);
    assert.throws(() => s.reset(-1), /out of range/);
  });

  test("backticks are tokenized consistently", () => {
    const src = "`foo` `bar`";
    const tokens = scanAll(src);
    const types = tokens.map((t) => t.type);

    assert.deepEqual(types, [
      TokenType.Backtick,
      TokenType.Identifier,
      TokenType.Backtick,
      TokenType.Backtick,
      TokenType.Identifier,
      TokenType.Backtick,
      TokenType.EOF,
    ]);

    // Backtick spans should be exactly "`"
    assert.equal(textOf(src, tokens[0]), "`");
    assert.equal(textOf(src, tokens[2]), "`");
    assert.equal(textOf(src, tokens[3]), "`");
    assert.equal(textOf(src, tokens[5]), "`");

    // Identifier spans inside the backticks
    assert.equal(textOf(src, tokens[1]), "foo");
    assert.equal(textOf(src, tokens[4]), "bar");
  });
});

