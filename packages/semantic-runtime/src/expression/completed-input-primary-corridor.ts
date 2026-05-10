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
  ClosedSubtreeRef,
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
type ParsedArrayLiteralStep = ParseOutcome<ArrayLiteralStep>;
type ParsedObjectLiteralStep = ParseOutcome<ObjectLiteralStep>;

const enum ArrayLiteralStep {
  Continue = 'continue',
  Closed = 'closed',
}

const enum ObjectLiteralStep {
  Continue = 'continue',
  Closed = 'closed',
}

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
    const open = this.state.nextToken();
    this.state.pushDelimiter(MatchedDelimiterKind.Bracket, open);
    const start = open.start;

    const elements: IsAssign[] = [];
    while (true) {
      const step = this.parseArrayLiteralEntry(open, start, elements);
      if (isParseFailure(step)) {
        return step;
      }
      if (step === ArrayLiteralStep.Closed) {
        break;
      }
    }

    return new ArrayLiteralExpression(
      this.state.span(start, this.state.consumedEnd),
      elements,
    );
  }

  private parseArrayLiteralEntry(
    open: Token,
    start: number,
    elements: IsAssign[],
  ): ParsedArrayLiteralStep {
    const token = this.state.peekToken();
    if (token.type === TokenType.EOF) {
      return this.arrayLiteralOpeningFrontier(open, start, token, elements);
    }
    if (token.type === TokenType.Comma) {
      this.consumeArrayLiteralHole(token, elements);
      return ArrayLiteralStep.Continue;
    }
    if (token.type === TokenType.CloseBracket) {
      this.closeArrayLiteral();
      return ArrayLiteralStep.Closed;
    }

    const expr = this.parseArrayLiteralElement(start, elements);
    if (isParseFailure(expr)) {
      return expr;
    }
    elements.push(expr);
    return this.parseArrayLiteralSeparator(start, elements);
  }

  private parseArrayLiteralElement(
    start: number,
    elements: readonly IsAssign[],
  ): ParseOutcome<IsAssign> {
    const expr = this.deps.parseAssignExpr();
    if (!isParseFailure(expr)) {
      return expr;
    }
    if (isParseCompanionFailure(expr)) {
      return this.companionBuilder.widenFailureToFrame(
        expr,
        ExpressionCompanionFrameKind.ArrayLiteral,
        this.state.span(start, this.state.failurePreservedEnd(expr)),
        this.arrayLiteralPrefixRefs(start, elements),
      );
    }
    return expr;
  }

  private parseArrayLiteralSeparator(
    start: number,
    elements: readonly IsAssign[],
  ): ParsedArrayLiteralStep {
    const sep = this.state.peekToken();
    if (sep.type === TokenType.Comma) {
      this.state.nextToken();
      const next = this.state.peekToken();
      if (next.type === TokenType.CloseBracket) {
        this.closeArrayLiteral();
        return ArrayLiteralStep.Closed;
      }
      return ArrayLiteralStep.Continue;
    }

    if (sep.type === TokenType.CloseBracket) {
      this.closeArrayLiteral();
      return ArrayLiteralStep.Closed;
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
        this.arrayLiteralPrefixRefs(start, elements),
      );
    }

    return this.state.error("Expected ',' or ']' in array literal", sep);
  }

  private arrayLiteralOpeningFrontier(
    open: Token,
    start: number,
    token: Token,
    elements: readonly IsAssign[],
  ): ParsedArrayLiteralStep {
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
      this.arrayLiteralPrefixRefs(start, elements),
    );
  }

  private consumeArrayLiteralHole(
    token: Token,
    elements: IsAssign[],
  ): void {
    this.state.nextToken();
    elements.push(
      new PrimitiveLiteralExpression(
        this.state.spanFromToken(token),
        undefined,
      ),
    );
  }

  private closeArrayLiteral(): void {
    this.state.nextToken();
    this.state.popDelimiter(MatchedDelimiterKind.Bracket);
  }

  private arrayLiteralPrefixRefs(
    start: number,
    elements: readonly IsAssign[],
  ): readonly ClosedSubtreeRef[] {
    return this.state.withOptionalPrefixRef(this.state.arrayPrefixRef(start, elements));
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
      const step = this.parseObjectLiteralEntry(open, start, keys, values);
      if (isParseFailure(step)) {
        return step;
      }
      if (step === ObjectLiteralStep.Closed) {
        break;
      }
    }

    return new ObjectLiteralExpression(
      this.state.span(start, this.state.consumedEnd),
      keys,
      values,
    );
  }

  private parseObjectLiteralEntry(
    open: Token,
    start: number,
    keys: (number | string)[],
    values: IsAssign[],
  ): ParsedObjectLiteralStep {
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
      this.closeObjectLiteral();
      return ObjectLiteralStep.Closed;
    }
    if (!this.isObjectLiteralKeyToken(keyTok)) {
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

    const value = this.parseObjectLiteralValue(colon, start, keys, values);
    if (isParseFailure(value)) {
      return value;
    }
    keys.push(key);
    values.push(value);
    return this.parseObjectLiteralSeparator(start, keys, values);
  }

  private parseObjectLiteralValue(
    colon: Token,
    start: number,
    keys: readonly (number | string)[],
    values: readonly IsAssign[],
  ): ParseOutcome<IsAssign> {
    const value = this.deps.parseAssignExpr();
    if (!isParseFailure(value)) {
      return value;
    }
    const prefix = this.state.withOptionalPrefixRef(this.state.objectPrefixRef(start, keys, values));
    if (isParseCompanionFailure(value)) {
      return this.companionBuilder.widenFailureToFrame(
        value,
        ExpressionCompanionFrameKind.ObjectLiteral,
        this.state.span(start, this.state.failurePreservedEnd(value)),
        prefix,
      );
    }
    return this.companionBuilder.missingExpressionGapFailure(
      value,
      colon,
      ExpressionCompanionFrameKind.ObjectLiteral,
      this.state.span(start, colon.end),
      prefix,
    );
  }

  private parseObjectLiteralSeparator(
    start: number,
    keys: readonly (number | string)[],
    values: readonly IsAssign[],
  ): ParsedObjectLiteralStep {
    const sep = this.state.peekToken();
    if (sep.type === TokenType.Comma) {
      this.state.nextToken();
      const next = this.state.peekToken();
      if (next.type === TokenType.CloseBrace) {
        this.closeObjectLiteral();
        return ObjectLiteralStep.Closed;
      }
      return ObjectLiteralStep.Continue;
    }
    if (sep.type === TokenType.CloseBrace) {
      this.closeObjectLiteral();
      return ObjectLiteralStep.Closed;
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

  private closeObjectLiteral(): void {
    this.state.nextToken();
    this.state.popDelimiter(MatchedDelimiterKind.Brace);
  }

  private isObjectLiteralKeyToken(token: Token): boolean {
    return token.type === TokenType.Identifier
      || token.type === TokenType.StringLiteral
      || token.type === TokenType.NumericLiteral;
  }
}
