import { TokenType, type Token } from './expression-scanner.js';
import {
  AccessGlobalExpression,
  AccessScopeExpression,
  ArrowFunction,
  BindingIdentifier,
} from './ast.js';
import type {
  ConditionalExpression,
  Identifier,
  IsAssign,
  IsBinary,
} from './ast.js';
import {
  ExpressionCompanionFrameKind,
  ExpressionExpectedContinuationClass,
  MatchedDelimiterKind,
} from './parse-result-algebra.js';
import { CompletedInputCompanionBuilder } from './completed-input-companion-builder.js';
import { CompletedInputParserState } from './completed-input-parser-state.js';
import { ExpressionFrameworkErrorCode } from './framework-error-code.js';
import { ParseHardFailure, isParseCompanionFailure, isParseFailure } from './parse-failure.js';
import type { ParseOutcome } from './parse-failure.js';

interface CompletedInputArrowCorridorDependencies {
  readonly state: CompletedInputParserState;
  readonly companionBuilder: CompletedInputCompanionBuilder;
  readonly parseAssignExpr: () => ParseOutcome<IsAssign>;
  readonly bindingIdentifierFromToken: (token: Token) => ParseOutcome<BindingIdentifier>;
}

const enum ParenthesizedArrowHeadStep {
  Continue = 'continue',
}

const enum InvalidParenthesizedArrowHeadKind {
  Invalid = 'invalid',
  DefaultParameter = 'default-parameter',
  DestructuringParameter = 'destructuring-parameter',
}

type ParsedParenthesizedArrowHeadStep =
  | ParseOutcome<ArrowFunction>
  | ParenthesizedArrowHeadStep
  | null;

class ParenthesizedArrowHeadState {
  readonly params: BindingIdentifier[] = [];
  rest = false;
  committedByHeadShape = false;
  pendingParameterAnchor: Token | null = null;

  constructor(readonly openParen: Token) {}

  get start(): number {
    return this.openParen.start;
  }

  commitByHeadShape(): void {
    this.committedByHeadShape = true;
  }

  markRest(): void {
    this.rest = true;
    this.commitByHeadShape();
  }

  addParameter(parameter: BindingIdentifier): void {
    this.params.push(parameter);
    this.pendingParameterAnchor = null;
  }

  expectParameterAfter(comma: Token): void {
    this.commitByHeadShape();
    this.pendingParameterAnchor = comma;
  }
}

/**
 * Completed-input arrow-function corridor.
 *
 * This corridor owns the arrow-specific law that hangs off the ordinary
 * precedence pipeline:
 * - identifier-bodied `value => expr`
 * - reversible parenthesized arrow-head attempts
 * - committed-invalid parenthesized head detection
 * - arrow-owned body-gap publication
 *
 * Keeping this here lets `CompletedInputParser` stay focused on precedence and
 * operator law instead of also carrying the arrow mini-language.
 *
 * TODO: If later work widens arrow parameter grammar beyond the current
 * identifier/rest corridor, split head scanning from body publication here
 * rather than loosening grouped-expression fallback piecemeal.
 */
export class CompletedInputArrowCorridor {
  private readonly state: CompletedInputParserState;
  private readonly companionBuilder: CompletedInputCompanionBuilder;

  constructor(
    private readonly deps: CompletedInputArrowCorridorDependencies,
  ) {
    this.state = deps.state;
    this.companionBuilder = deps.companionBuilder;
  }

  parseFromLeft(left: IsBinary | ConditionalExpression): ParseOutcome<ArrowFunction> {
    let identifier: Identifier | null = null;
    if (
      (left as Partial<AccessScopeExpression>).$kind === 'AccessScope' ||
      (left as Partial<AccessGlobalExpression>).$kind === 'AccessGlobal'
    ) {
      identifier = (left as AccessScopeExpression | AccessGlobalExpression).name;
    }

    if (identifier == null) {
      return this.state.failures.error(
        'Invalid arrow parameter list',
        this.state.peekToken(),
        ExpressionFrameworkErrorCode.ParseInvalidArrowParams,
      );
    }

    const arrowTok = this.state.peekToken();
    if (arrowTok.type !== TokenType.EqualsGreaterThan) {
      return this.state.failures.error("Expected '=>'", arrowTok);
    }
    this.state.nextToken();

    const bodyStart = this.state.peekToken();
    if (bodyStart.type === TokenType.OpenBrace) {
      return this.state.failures.error(
        'Arrow function bodies are not supported',
        bodyStart,
        ExpressionFrameworkErrorCode.ParseNoArrowFnBody,
      );
    }

    const arg = new BindingIdentifier(
      identifier.span,
      identifier,
    );

    const body = this.deps.parseAssignExpr();
    if (isParseFailure(body)) {
      if (isParseCompanionFailure(body)) {
        return this.companionBuilder.widenArrowFunctionFailure(
          body,
          this.state.localStart(arg),
          [this.state.prefixRefs.root(arg)],
        );
      }
      return this.companionBuilder.missingExpressionGapFailure(
        body,
        arrowTok,
        ExpressionCompanionFrameKind.ArrowFunction,
        this.state.span(this.state.localStart(arg), arrowTok.end),
        [this.state.prefixRefs.root(arg)],
      );
    }

    return new ArrowFunction(
      this.state.spanFrom({ span: identifier.span }, body),
      [arg],
      body,
      false,
    );
  }

  tryParseParenthesized(openParen: Token): ParseOutcome<ArrowFunction> | null {
    const checkpoint = this.state.createCheckpoint(openParen.start);
    const outcome = this.parseParenthesized(openParen);
    if (outcome !== null) {
      return outcome;
    }

    this.state.restoreCheckpoint(checkpoint);
    const invalidHead = this.tryParseCommittedInvalidParenthesizedHead();
    if (invalidHead !== null) {
      return invalidHead;
    }

    this.state.restoreCheckpoint(checkpoint);
    return null;
  }

  /**
   * Parse a parenthesized arrow head when the leading '(' makes that plausible.
   *
   * This method intentionally distinguishes:
   * - committed arrow-head prefixes such as `()`, `(a,`, `(...rest`
   * - single-parameter grouped expressions like `(a)` / `(a + b)`
   *
   * If the text has not committed to arrow-head shape yet, this returns `null`
   * so the ordinary parenthesized-expression lane can own it.
   */
  private parseParenthesized(openParen: Token): ParseOutcome<ArrowFunction> | null {
    this.state.nextToken();
    this.state.delimiters.push(MatchedDelimiterKind.Paren, openParen);

    const head = new ParenthesizedArrowHeadState(openParen);
    const emptyHead = this.tryParseEmptyParenthesizedHead(head);
    if (emptyHead !== null) {
      return emptyHead;
    }

    while (true) {
      const param = this.parseParenthesizedHeadParameter(head);
      if (param === null || isParseFailure(param)) {
        return param;
      }
      head.addParameter(param);

      const step = this.parseParenthesizedHeadSeparator(head, param);
      if (step !== ParenthesizedArrowHeadStep.Continue) {
        return step;
      }
    }
  }

  private tryParseEmptyParenthesizedHead(
    head: ParenthesizedArrowHeadState,
  ): ParseOutcome<ArrowFunction> | null {
    const token = this.state.peekToken();
    if (token.type !== TokenType.CloseParen) {
      return null;
    }
    head.commitByHeadShape();
    return this.closeAndFinishParenthesizedHead(head);
  }

  private parseParenthesizedHeadParameter(
    head: ParenthesizedArrowHeadState,
  ): ParseOutcome<BindingIdentifier> | null {
    const token = this.state.peekToken();
    if (token.type === TokenType.Ellipsis) {
      return this.parseRestParenthesizedHeadParameter(head);
    }
    if (token.type === TokenType.Identifier) {
      return this.parseIdentifierParenthesizedHeadParameter(token);
    }
    if (token.type === TokenType.OpenBracket || token.type === TokenType.OpenBrace) {
      if (!head.committedByHeadShape || head.pendingParameterAnchor == null) {
        return null;
      }
      return this.state.failures.error(
        'Arrow function destructuring parameters are not supported',
        token,
        ExpressionFrameworkErrorCode.ParseNoArrowParamDestructuring,
      );
    }
    if (!head.committedByHeadShape || head.pendingParameterAnchor == null) {
      return null;
    }
    return this.companionBuilder.missingArrowParameterFailure(
      'Expected binding declaration in arrow parameter list',
      token,
      head.pendingParameterAnchor,
      head.start,
      head.params,
    );
  }

  private parseRestParenthesizedHeadParameter(
    head: ParenthesizedArrowHeadState,
  ): ParseOutcome<BindingIdentifier> {
    head.markRest();
    const ellipsis = this.state.nextToken();
    const idTok = this.state.peekToken();
    if (idTok.type !== TokenType.Identifier) {
      return this.companionBuilder.missingArrowParameterFailure(
        "Expected binding declaration after '...' in arrow parameter list",
        idTok,
        ellipsis,
        head.start,
        head.params,
      );
    }
    return this.parseIdentifierParenthesizedHeadParameter(idTok);
  }

  private parseIdentifierParenthesizedHeadParameter(
    token: Token,
  ): ParseOutcome<BindingIdentifier> {
    this.state.nextToken();
    return this.deps.bindingIdentifierFromToken(token);
  }

  private parseParenthesizedHeadSeparator(
    head: ParenthesizedArrowHeadState,
    param: BindingIdentifier,
  ): ParsedParenthesizedArrowHeadStep {
    const token = this.state.peekToken();
    if (token.type === TokenType.Comma) {
      return this.parseParenthesizedHeadComma(head);
    }
    if (token.type === TokenType.CloseParen) {
      return this.closeAndFinishParenthesizedHead(head);
    }
    if (token.type === TokenType.Equals) {
      if (!head.committedByHeadShape) {
        return null;
      }
      return this.state.failures.error(
        'Arrow function default parameters are not supported',
        token,
        ExpressionFrameworkErrorCode.ParseNoArrowParamDefaultValue,
      );
    }
    if (!head.committedByHeadShape) {
      return null;
    }
    return this.companionBuilder.missingClosingDelimiterFailure(
      "Expected ')' in arrow parameter list",
      token,
      ExpressionCompanionFrameKind.ArrowParameterList,
      ExpressionExpectedContinuationClass.CloseParen,
      this.state.span(head.start, this.state.localEnd(param)),
      this.companionBuilder.arrowParameterRefs(head.params),
    );
  }

  private parseParenthesizedHeadComma(
    head: ParenthesizedArrowHeadState,
  ): ParsedParenthesizedArrowHeadStep {
    const comma = this.state.nextToken();
    if (head.rest) {
      return this.state.failures.error(
        'Rest parameter must be last in arrow parameter list',
        comma,
        ExpressionFrameworkErrorCode.ParseRestMustBeLast,
      );
    }
    head.expectParameterAfter(comma);
    const next = this.state.peekToken();
    if (next.type === TokenType.CloseParen) {
      return this.companionBuilder.missingArrowParameterFailure(
        "Expected binding declaration after ',' in arrow parameter list",
        next,
        comma,
        head.start,
        head.params,
      );
    }
    return ParenthesizedArrowHeadStep.Continue;
  }

  private closeAndFinishParenthesizedHead(
    head: ParenthesizedArrowHeadState,
  ): ParseOutcome<ArrowFunction> | null {
    const closeParen = this.state.nextToken();
    this.state.delimiters.pop(MatchedDelimiterKind.Paren);
    return this.finishParenthesized(
      head.openParen,
      closeParen,
      head.params,
      head.rest,
      head.committedByHeadShape,
    );
  }

  private tryParseCommittedInvalidParenthesizedHead(): ParseHardFailure | null {
    this.state.nextToken();
    let parenDepth = 1;
    const headTokens: Token[] = [];

    while (true) {
      const token = this.state.peekToken();
      if (token.type === TokenType.EOF) {
        return null;
      }

      this.state.nextToken();
      headTokens.push(token);

      if (token.type === TokenType.OpenParen) {
        parenDepth++;
        continue;
      }

      if (token.type !== TokenType.CloseParen) {
        continue;
      }

      parenDepth--;
      if (parenDepth !== 0) {
        continue;
      }

      const arrowTok = this.state.peekToken();
      if (arrowTok.type === TokenType.EqualsGreaterThan) {
        const failure = this.invalidParenthesizedArrowHeadFailure(arrowTok, this.classifyInvalidParenthesizedArrowHead(headTokens));
        return failure instanceof ParseHardFailure ? failure : null;
      }

      return null;
    }
  }

  private classifyInvalidParenthesizedArrowHead(
    tokens: readonly Token[],
  ): InvalidParenthesizedArrowHeadKind {
    let parenDepth = 1;
    let bracketDepth = 0;
    let braceDepth = 0;
    for (const token of tokens) {
      switch (token.type) {
        case TokenType.OpenParen:
          parenDepth++;
          continue;
        case TokenType.CloseParen:
          parenDepth--;
          continue;
        case TokenType.OpenBracket:
          if (parenDepth === 1 && bracketDepth === 0 && braceDepth === 0) {
            return InvalidParenthesizedArrowHeadKind.DestructuringParameter;
          }
          bracketDepth++;
          continue;
        case TokenType.CloseBracket:
          bracketDepth = Math.max(0, bracketDepth - 1);
          continue;
        case TokenType.OpenBrace:
          if (parenDepth === 1 && bracketDepth === 0 && braceDepth === 0) {
            return InvalidParenthesizedArrowHeadKind.DestructuringParameter;
          }
          braceDepth++;
          continue;
        case TokenType.CloseBrace:
          braceDepth = Math.max(0, braceDepth - 1);
          continue;
        case TokenType.Equals:
          if (parenDepth === 1 && bracketDepth === 0 && braceDepth === 0) {
            return InvalidParenthesizedArrowHeadKind.DefaultParameter;
          }
          continue;
        default:
          continue;
      }
    }
    return InvalidParenthesizedArrowHeadKind.Invalid;
  }

  private invalidParenthesizedArrowHeadFailure(
    token: Token,
    kind: InvalidParenthesizedArrowHeadKind,
  ): ParseHardFailure {
    switch (kind) {
      case InvalidParenthesizedArrowHeadKind.DefaultParameter:
        return this.state.failures.error(
          'Arrow function default parameters are not supported',
          token,
          ExpressionFrameworkErrorCode.ParseNoArrowParamDefaultValue,
        ) as ParseHardFailure;
      case InvalidParenthesizedArrowHeadKind.DestructuringParameter:
        return this.state.failures.error(
          'Arrow function destructuring parameters are not supported',
          token,
          ExpressionFrameworkErrorCode.ParseNoArrowParamDestructuring,
        ) as ParseHardFailure;
      case InvalidParenthesizedArrowHeadKind.Invalid:
        return this.state.failures.error(
          'Invalid arrow parameter list',
          token,
          ExpressionFrameworkErrorCode.ParseInvalidArrowParams,
        ) as ParseHardFailure;
    }
  }

  private finishParenthesized(
    openParen: Token,
    closeParen: Token,
    params: readonly BindingIdentifier[],
    rest: boolean,
    committedByHeadShape: boolean,
  ): ParseOutcome<ArrowFunction> | null {
    const arrowTok = this.state.peekToken();
    if (arrowTok.type !== TokenType.EqualsGreaterThan) {
      if (!committedByHeadShape && params.length === 1 && !rest) {
        return null;
      }
      return this.companionBuilder.missingArrowSeparatorFailure(openParen, closeParen, params);
    }
    this.state.nextToken();

    const bodyStart = this.state.peekToken();
    if (bodyStart.type === TokenType.OpenBrace) {
      return this.state.failures.error(
        'Arrow function bodies are not supported',
        bodyStart,
        ExpressionFrameworkErrorCode.ParseNoArrowFnBody,
      );
    }

    const body = this.deps.parseAssignExpr();
    if (isParseFailure(body)) {
      if (isParseCompanionFailure(body)) {
        return this.companionBuilder.widenArrowFunctionFailure(
          body,
          openParen.start,
          this.companionBuilder.arrowParameterRefs(params),
        );
      }
      return this.companionBuilder.missingExpressionGapFailure(
        body,
        arrowTok,
        ExpressionCompanionFrameKind.ArrowFunction,
        this.state.span(openParen.start, arrowTok.end),
        this.companionBuilder.arrowParameterRefs(params),
      );
    }

    return new ArrowFunction(
      this.state.spanFrom(openParen.start, body),
      [...params],
      body,
      rest,
    );
  }
}
