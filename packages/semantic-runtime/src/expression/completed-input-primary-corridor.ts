import {
  TokenFlags,
  TokenType,
  hasTokenFlag,
  tokenTypeName,
  type Token,
} from './expression-scanner.js';
import {
  AccessBoundaryExpression,
  AccessGlobalExpression,
  AccessScopeExpression,
  AccessThisExpression,
  ArrayLiteralExpression,
  ObjectLiteralExpression,
  ParenExpression,
  PrimitiveLiteralExpression,
} from './ast.js';
import type {
  Identifier,
  IsAssign,
  IsPrimary,
} from './ast.js';
import {
  ExpressionCompanionFrameKind,
  ExpressionExpectedContinuationClass,
  ExpressionFrontierKind,
  MatchedDelimiterKind,
} from './parse-result-algebra.js';
import { isParseCompanionFailure, isParseFailure } from './parse-failure.js';
import type { ParseOutcome } from './parse-failure.js';
import { CompletedInputCompanionBuilder } from './completed-input-companion-builder.js';
import { CompletedInputParserState } from './completed-input-parser-state.js';
import { CompletedInputTemplateCorridor } from './completed-input-template-corridor.js';

type ParsedPrimary = ParseOutcome<IsPrimary>;

interface CompletedInputPrimaryCorridorDependencies {
  readonly state: CompletedInputParserState;
  readonly companionBuilder: CompletedInputCompanionBuilder;
  readonly templateCorridor: CompletedInputTemplateCorridor;
  readonly parseAssignExpr: () => ParseOutcome<IsAssign>;
  readonly identifierFromToken: (token: Token) => Identifier;
  readonly tokenToIdentifierName: (token: Token) => string;
  readonly isIdentifierNameToken: (token: Token) => boolean;
  readonly isGlobalName: (name: string) => boolean;
}

/**
 * Completed-input primary-expression corridor.
 *
 * This corridor owns the property-like grammar that sits beneath the shared
 * precedence pipeline and above raw token/state mechanics:
 * - literal primaries
 * - identifier/global/scope-special classification
 * - parenthesized expressions
 * - array and object literals
 * - template-literal handoff
 *
 * Keeping this here lets `CompletedInputParser` stay focused on the
 * precedence/assignment/arrow pipeline instead of also remaining the owner of
 * the primary-special branches and their companion publication law.
 *
 * TODO: If later work needs collection-literal parsing or scope-special
 * classification to evolve on a meaningfully different axis, split those into
 * narrower primary subcorridors here instead of regrowing a monolithic parser
 * core.
 */
export class CompletedInputPrimaryCorridor {
  private readonly state: CompletedInputParserState;
  private readonly companionBuilder: CompletedInputCompanionBuilder;

  constructor(
    private readonly deps: CompletedInputPrimaryCorridorDependencies,
  ) {
    this.state = deps.state;
    this.companionBuilder = deps.companionBuilder;
  }

  canStartExpression(token: Token): boolean {
    return hasTokenFlag(token.type, TokenFlags.PrimaryStart);
  }

  parse(): ParsedPrimary {
    const token = this.state.peekToken();

    switch (token.type) {
      case TokenType.BooleanLiteral:
      case TokenType.NullLiteral:
      case TokenType.UndefinedLiteral:
      case TokenType.NumericLiteral:
      case TokenType.StringLiteral: {
        if (token.unterminated) {
          return this.state.error('Unterminated string literal', token);
        }
        this.state.nextToken();
        return new PrimitiveLiteralExpression(
          this.state.spanFromToken(token),
          token.value,
        );
      }

      case TokenType.Identifier:
        return this.parseIdentifierPrimary();

      case TokenType.KeywordThis:
        this.state.nextToken();
        return new AccessBoundaryExpression(
          this.state.spanFromToken(token),
        );

      case TokenType.KeywordDollarThis:
      case TokenType.KeywordDollarParent:
        return this.parseScopeSpecialPrimary();

      case TokenType.OpenBracket:
        return this.parseArrayLiteral();

      case TokenType.OpenBrace:
        return this.parseObjectLiteral();

      case TokenType.OpenParen:
        return this.parseParenthesizedExpression();

      case TokenType.Backtick:
        return this.deps.templateCorridor.parseTemplateLiteral();
    }

    return this.state.error(`Unexpected token ${tokenTypeName(token.type)} in primary expression`, token);
  }

  private parseIdentifierPrimary(): ParsedPrimary {
    const token = this.state.peekToken();
    if (token.type !== TokenType.Identifier) {
      return this.state.error('Expected identifier', token);
    }
    this.state.nextToken();

    const name = this.deps.tokenToIdentifierName(token);
    if (name === 'import') {
      return this.state.error("Bare 'import' is not allowed in binding expressions", token);
    }

    const identifier = this.deps.identifierFromToken(token);
    if (this.deps.isGlobalName(name)) {
      return new AccessGlobalExpression(
        this.state.spanFromToken(token),
        identifier,
      );
    }

    return new AccessScopeExpression(
      this.state.spanFromToken(token),
      identifier,
      0,
    );
  }

  /**
   * Scope specials:
   * - $this              → AccessThis(0)
   * - $parent.$parent... → AccessThis(n)
   * - $this.foo          → AccessScope("foo", 0)
   * - $parent.$parent.x  → AccessScope("x", n)
   * - After a dot, $this/$parent tokens are treated as identifier names.
   */
  private parseScopeSpecialPrimary(): ParsedPrimary {
    const first = this.state.peekToken();
    this.state.nextToken();
    const start = first.start;

    if (first.type === TokenType.KeywordDollarThis) {
      const dot = this.state.peekToken();
      if (dot.type === TokenType.Dot) {
        this.state.nextToken();
        const nameTok = this.state.peekToken();
        if (!this.deps.isIdentifierNameToken(nameTok)) {
          return this.companionBuilder.missingMemberNameFailure(
            "Expected identifier after '$this.'",
            nameTok,
            dot,
            new AccessThisExpression(
              this.state.span(start, first.end),
              0,
            ),
          );
        }

        this.state.nextToken();
        return new AccessScopeExpression(
          this.state.span(start, nameTok.end),
          this.deps.identifierFromToken(nameTok),
          0,
        );
      }

      return new AccessThisExpression(
        this.state.span(start, first.end),
        0,
      );
    }

    let ancestor = 1;

    while (true) {
      const dot = this.state.peekToken();
      if (dot.type !== TokenType.Dot) {
        break;
      }
      this.state.nextToken();
      const maybeParent = this.state.peekToken();
      if (maybeParent.type === TokenType.KeywordDollarParent) {
        this.state.nextToken();
        ancestor++;
        continue;
      }

      if (!this.deps.isIdentifierNameToken(maybeParent)) {
        return this.companionBuilder.scopePathContinuationFailure(
          "Expected identifier or '$parent' after '$parent.'",
          maybeParent,
          dot,
          new AccessThisExpression(
            this.state.span(start, dot.start),
            ancestor,
          ),
        );
      }

      this.state.nextToken();
      return new AccessScopeExpression(
        this.state.span(start, maybeParent.end),
        this.deps.identifierFromToken(maybeParent),
        ancestor,
      );
    }

    return new AccessThisExpression(
      this.state.span(start, this.state.consumedEnd || first.end),
      ancestor,
    );
  }

  private parseParenthesizedExpression(): ParsedPrimary {
    const open = this.state.nextToken();
    this.state.pushDelimiter(MatchedDelimiterKind.Paren, open);
    const expr = this.deps.parseAssignExpr();
    if (isParseFailure(expr)) {
      if (isParseCompanionFailure(expr)) {
        return expr;
      }
      return this.companionBuilder.frontierOnlyFailure(
        "Expected expression or ')' after '('",
        this.state.peekToken(),
        ExpressionFrontierKind.AmbiguousClosure,
        [
          ExpressionExpectedContinuationClass.Expression,
          ExpressionExpectedContinuationClass.CloseParen,
        ],
        ExpressionCompanionFrameKind.ParenExpression,
        this.state.span(open.start, open.end),
      );
    }

    const close = this.state.peekToken();
    if (close.type !== TokenType.CloseParen) {
      return this.companionBuilder.missingClosingDelimiterFailure(
        "Expected ')' to close parenthesized expression",
        close,
        ExpressionCompanionFrameKind.ParenExpression,
        ExpressionExpectedContinuationClass.CloseParen,
        this.state.span(open.start, this.state.localEnd(expr)),
        [this.state.childRef(expr)],
      );
    }

    this.state.nextToken();
    this.state.popDelimiter(MatchedDelimiterKind.Paren);
    return new ParenExpression(
      this.state.span(open.start, close.end),
      expr,
    );
  }

  private parseArrayLiteral(): ParseOutcome<ArrayLiteralExpression> {
    const open = this.state.peekToken();
    this.state.nextToken();
    this.state.pushDelimiter(MatchedDelimiterKind.Bracket, open);
    const start = open.start;

    const elements: IsAssign[] = [];
    const first = this.state.peekToken();
    if (first.type === TokenType.CloseBracket) {
      this.state.nextToken();
      this.state.popDelimiter(MatchedDelimiterKind.Bracket);
      return new ArrayLiteralExpression(
        this.state.span(start, this.state.consumedEnd),
        elements,
      );
    }

    while (true) {
      const token = this.state.peekToken();

      if (token.type === TokenType.EOF) {
        return this.companionBuilder.frontierOnlyFailure(
          "Expected array element, ',' or ']' in array literal",
          token,
          ExpressionFrontierKind.AmbiguousClosure,
          [
            ExpressionExpectedContinuationClass.Expression,
            ExpressionExpectedContinuationClass.Comma,
            ExpressionExpectedContinuationClass.CloseBracket,
          ],
          ExpressionCompanionFrameKind.ArrayLiteral,
          this.state.span(start, this.state.consumedEnd || open.end),
          this.state.withOptionalPrefixRef(this.state.arrayPrefixRef(start, elements)),
        );
      }

      if (token.type === TokenType.Comma) {
        this.state.nextToken();
        elements.push(
          new PrimitiveLiteralExpression(
            this.state.spanFromToken(token),
            undefined,
          ),
        );
        continue;
      }

      if (token.type === TokenType.CloseBracket) {
        this.state.nextToken();
        this.state.popDelimiter(MatchedDelimiterKind.Bracket);
        break;
      }

      const expr = this.deps.parseAssignExpr();
      if (isParseFailure(expr)) {
        if (isParseCompanionFailure(expr)) {
          return this.companionBuilder.widenFailureToFrame(
            expr,
            ExpressionCompanionFrameKind.ArrayLiteral,
            this.state.span(start, this.state.failurePreservedEnd(expr)),
            this.state.withOptionalPrefixRef(this.state.arrayPrefixRef(start, elements)),
          );
        }
        return expr;
      }
      elements.push(expr);

      const sep = this.state.peekToken();
      if (sep.type === TokenType.Comma) {
        this.state.nextToken();
        const next = this.state.peekToken();
        if (next.type === TokenType.CloseBracket) {
          this.state.nextToken();
          this.state.popDelimiter(MatchedDelimiterKind.Bracket);
          break;
        }
        continue;
      }

      if (sep.type === TokenType.CloseBracket) {
        this.state.nextToken();
        this.state.popDelimiter(MatchedDelimiterKind.Bracket);
        break;
      }

      if (sep.type === TokenType.EOF) {
        return this.companionBuilder.frontierOnlyFailure(
          "Expected ',' or ']' in array literal",
          sep,
          ExpressionFrontierKind.AmbiguousClosure,
          [
            ExpressionExpectedContinuationClass.Comma,
            ExpressionExpectedContinuationClass.CloseBracket,
          ],
          ExpressionCompanionFrameKind.ArrayLiteral,
          this.state.span(start, this.state.localEnd(elements[elements.length - 1]!)),
          this.state.withOptionalPrefixRef(this.state.arrayPrefixRef(start, elements)),
        );
      }

      return this.state.error("Expected ',' or ']' in array literal", sep);
    }

    return new ArrayLiteralExpression(
      this.state.span(start, this.state.consumedEnd),
      elements,
    );
  }

  private parseObjectLiteral(): ParseOutcome<ObjectLiteralExpression> {
    const open = this.state.peekToken();
    this.state.nextToken();
    this.state.pushDelimiter(MatchedDelimiterKind.Brace, open);
    const start = open.start;

    const keys: (number | string)[] = [];
    const values: IsAssign[] = [];

    const first = this.state.peekToken();
    if (first.type === TokenType.CloseBrace) {
      this.state.nextToken();
      this.state.popDelimiter(MatchedDelimiterKind.Brace);
      return new ObjectLiteralExpression(
        this.state.span(start, this.state.consumedEnd),
        keys,
        values,
      );
    }

    while (true) {
      const keyTok = this.state.peekToken();
      if (keyTok.type === TokenType.EOF) {
        return this.companionBuilder.frontierOnlyFailure(
          "Expected object literal key or '}'",
          keyTok,
          ExpressionFrontierKind.AmbiguousClosure,
          [
            ExpressionExpectedContinuationClass.ObjectLiteralKey,
            ExpressionExpectedContinuationClass.CloseBrace,
          ],
          ExpressionCompanionFrameKind.ObjectLiteral,
          this.state.span(start, this.state.consumedEnd || open.end),
          this.state.withOptionalPrefixRef(this.state.objectPrefixRef(start, keys, values)),
        );
      }
      if (keyTok.type === TokenType.CloseBrace) {
        this.state.nextToken();
        this.state.popDelimiter(MatchedDelimiterKind.Brace);
        break;
      }
      if (
        keyTok.type !== TokenType.Identifier &&
        keyTok.type !== TokenType.StringLiteral &&
        keyTok.type !== TokenType.NumericLiteral
      ) {
        return this.state.error(
          'Invalid object literal key; expected identifier, string, or number',
          keyTok,
        );
      }
      this.state.nextToken();

      const key = keyTok.type === TokenType.NumericLiteral
        ? keyTok.value as number
        : String(keyTok.value);

      const colon = this.state.peekToken();
      if (colon.type !== TokenType.Colon) {
        return this.companionBuilder.missingObjectValueSeparatorFailure(
          "Expected ':' after object literal key",
          colon,
          keyTok,
          this.state.span(start, keyTok.end),
          this.state.withOptionalPrefixRef(this.state.objectPrefixRef(start, keys, values)),
        );
      }
      this.state.nextToken();

      const value = this.deps.parseAssignExpr();
      if (isParseFailure(value)) {
        if (isParseCompanionFailure(value)) {
          return this.companionBuilder.widenFailureToFrame(
            value,
            ExpressionCompanionFrameKind.ObjectLiteral,
            this.state.span(start, this.state.failurePreservedEnd(value)),
            this.state.withOptionalPrefixRef(this.state.objectPrefixRef(start, keys, values)),
          );
        }
        return this.companionBuilder.missingExpressionGapFailure(
          value,
          colon,
          ExpressionCompanionFrameKind.ObjectLiteral,
          this.state.span(start, colon.end),
          this.state.withOptionalPrefixRef(this.state.objectPrefixRef(start, keys, values)),
        );
      }
      keys.push(key);
      values.push(value);

      const sep = this.state.peekToken();
      if (sep.type === TokenType.Comma) {
        this.state.nextToken();
        const next = this.state.peekToken();
        if (next.type === TokenType.CloseBrace) {
          this.state.nextToken();
          this.state.popDelimiter(MatchedDelimiterKind.Brace);
          break;
        }
        continue;
      }

      if (sep.type === TokenType.CloseBrace) {
        this.state.nextToken();
        this.state.popDelimiter(MatchedDelimiterKind.Brace);
        break;
      }

      if (sep.type === TokenType.EOF) {
        return this.companionBuilder.frontierOnlyFailure(
          "Expected ',' or '}' in object literal",
          sep,
          ExpressionFrontierKind.AmbiguousClosure,
          [
            ExpressionExpectedContinuationClass.Comma,
            ExpressionExpectedContinuationClass.CloseBrace,
          ],
          ExpressionCompanionFrameKind.ObjectLiteral,
          this.state.span(start, this.state.localEnd(values[values.length - 1]!)),
          this.state.withOptionalPrefixRef(this.state.objectPrefixRef(start, keys, values)),
        );
      }

      return this.state.error("Expected ',' or '}' in object literal", sep);
    }

    return new ObjectLiteralExpression(
      this.state.span(start, this.state.consumedEnd),
      keys,
      values,
    );
  }
}
