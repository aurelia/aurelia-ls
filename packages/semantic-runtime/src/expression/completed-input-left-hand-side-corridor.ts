import { TokenType, type Token } from './expression-scanner.js';
import {
  AccessGlobalExpression,
  AccessKeyedExpression,
  AccessMemberExpression,
  AccessScopeExpression,
  CallFunctionExpression,
  CallGlobalExpression,
  CallMemberExpression,
  CallScopeExpression,
  NewExpression,
  TaggedTemplateExpression,
} from './ast.js';
import type {
  Identifier,
  IsAssign,
  IsLeftHandSide,
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
import { ExpressionFrameworkErrorCode } from './framework-error-code.js';

type ParsedPrimary = ParseOutcome<IsPrimary>;
type ParsedLeftHandSide = ParseOutcome<IsLeftHandSide>;
type ParsedArguments = ParseOutcome<IsAssign[]>;

interface CompletedInputLeftHandSideCorridorDependencies {
  readonly state: CompletedInputParserState;
  readonly companionBuilder: CompletedInputCompanionBuilder;
  readonly templateCorridor: CompletedInputTemplateCorridor;
  readonly parseAssignExpr: () => ParseOutcome<IsAssign>;
  readonly parsePrimaryExpr: () => ParsedPrimary;
  readonly canStartPrimaryExpression: (token: Token) => boolean;
  readonly identifierFromToken: (token: Token) => Identifier;
  readonly isIdentifierNameToken: (token: Token) => boolean;
}

/**
 * Completed-input left-hand-side corridor.
 *
 * This corridor owns the ordinary property-like grammar that sits between
 * primary expressions and the higher precedence pipeline:
 * - `new` expressions
 * - member / optional-chain / keyed access
 * - call expressions and argument lists
 * - tagged-template handoff over an existing receiver
 *
 * Keeping this here lets `CompletedInputParser` stay focused on the shared
 * precedence pipeline instead of also being the home of member/call/index
 * recovery and publication law.
 *
 * TODO: If later work needs distinct call/index/member subcorridors or richer
 * optional-chain-specific publication, split those here rather than leaking
 * the ownership back into the main parser.
 */
export class CompletedInputLeftHandSideCorridor {
  private readonly state: CompletedInputParserState;
  private readonly companionBuilder: CompletedInputCompanionBuilder;

  constructor(
    private readonly deps: CompletedInputLeftHandSideCorridorDependencies,
  ) {
    this.state = deps.state;
    this.companionBuilder = deps.companionBuilder;
  }

  parse(): ParsedLeftHandSide {
    const t = this.state.peekToken();
    if (t.type === TokenType.KeywordNew) {
      return this.parseNewExpression();
    }
    return this.parseMemberExpression();
  }

  private parseNewExpression(): ParsedLeftHandSide {
    const newTok = this.state.nextToken();
    const targetStart = this.state.peekToken();
    if (!this.deps.canStartPrimaryExpression(targetStart)) {
      return this.companionBuilder.frontierOnlyFailure(
        "Expected constructor target after 'new'",
        targetStart,
        ExpressionFrontierKind.AwaitingExpression,
        [ExpressionExpectedContinuationClass.Expression],
        ExpressionCompanionFrameKind.NewExpression,
        this.state.span(newTok.start, newTok.end),
      );
    }

    const primary = this.deps.parsePrimaryExpr();
    if (isParseFailure(primary)) {
      if (isParseCompanionFailure(primary)) {
        return this.companionBuilder.widenNewExpressionFailure(primary, newTok);
      }
      return primary;
    }

    const func = this.parseLeftHandSideTail(primary, false);
    if (isParseFailure(func)) {
      if (isParseCompanionFailure(func)) {
        return this.companionBuilder.widenNewExpressionFailure(func, newTok);
      }
      return func;
    }

    let args: IsAssign[] = [];
    if (this.state.peekToken().type === TokenType.OpenParen) {
      const parsedArgs = this.parseArguments();
      if (isParseFailure(parsedArgs)) {
        if (isParseCompanionFailure(parsedArgs)) {
          return this.companionBuilder.widenNewExpressionFailure(
            parsedArgs,
            newTok,
            [this.state.prefixRefs.child(func)],
          );
        }
        return parsedArgs;
      }
      args = parsedArgs;
    }

    const expression = new NewExpression(
      this.state.span(newTok.start, this.state.consumedEnd),
      func,
      args,
    );
    return this.parseLeftHandSideTail(expression, true);
  }

  private parseMemberExpression(): ParsedLeftHandSide {
    const primary = this.deps.parsePrimaryExpr();
    if (isParseFailure(primary)) {
      return primary;
    }

    return this.parseLeftHandSideTail(primary, true);
  }

  private parseLeftHandSideTail(
    base: IsLeftHandSide,
    allowCall: boolean,
  ): ParsedLeftHandSide {
    let expr: IsLeftHandSide = base;
    while (true) {
      const t = this.state.peekToken();

      if (t.type === TokenType.Dot) {
        this.state.nextToken();
        const nameTok = this.state.peekToken();
        if (!this.deps.isIdentifierNameToken(nameTok)) {
          return this.companionBuilder.missingMemberNameFailure(
            "Expected member name after '.'",
            nameTok,
            t,
            expr,
          );
        }

        this.state.nextToken();
        expr = new AccessMemberExpression(
          this.state.spanFrom(expr, nameTok.end),
          expr,
          this.deps.identifierFromToken(nameTok),
          false,
        );
        continue;
      }

      if (t.type === TokenType.DotDot || t.type === TokenType.Ellipsis) {
        return this.state.failures.hardError(
          "Expected identifier after '.'",
          t,
          ExpressionFrameworkErrorCode.ParseExpectedIdentifier,
        );
      }

      if (t.type === TokenType.QuestionDot) {
        const optionalExpr = this.parseOptionalChainTail(expr, t);
        if (isParseFailure(optionalExpr)) {
          return optionalExpr;
        }
        expr = optionalExpr;
        continue;
      }

      if (t.type === TokenType.OpenBracket) {
        const keyed = this.parseKeyedAccess(expr, false);
        if (isParseFailure(keyed)) {
          return keyed;
        }
        expr = keyed;
        continue;
      }

      if (t.type === TokenType.OpenParen) {
        if (!allowCall) {
          break;
        }
        const called = this.parseCallExpression(expr, false);
        if (isParseFailure(called)) {
          return called;
        }
        expr = called;
        continue;
      }

      if (t.type === TokenType.Backtick) {
        if (!allowCall) {
          break;
        }
        if (this.hasOptionalChain(expr)) {
          return this.state.failures.hardError(
            'Invalid tagged template on optional chain',
            t,
            ExpressionFrameworkErrorCode.ParseInvalidTagInOptionalChain,
          );
        }

        const tpl = this.deps.templateCorridor.parseTemplateLiteral();
        if (isParseFailure(tpl)) {
          return tpl;
        }

        expr = new TaggedTemplateExpression(
          this.state.spanFrom(expr, tpl),
          tpl.cooked,
          expr,
          tpl.expressions,
        );
        continue;
      }

      break;
    }

    return expr;
  }

  private parseOptionalChainTail(
    expr: IsLeftHandSide,
    questionDot: Token,
  ): ParsedLeftHandSide {
    this.state.nextToken();
    const next = this.state.peekToken();

    if (next.type === TokenType.OpenParen) {
      return this.parseCallExpression(expr, true);
    }

    if (next.type === TokenType.OpenBracket) {
      return this.parseKeyedAccess(expr, true);
    }

    if (next.type === TokenType.Backtick) {
      return this.state.failures.hardError(
        'Invalid tagged template on optional chain',
        next,
        ExpressionFrameworkErrorCode.ParseInvalidTagInOptionalChain,
      );
    }

    if (!this.deps.isIdentifierNameToken(next)) {
      return this.companionBuilder.optionalChainContinuationFailure(
        "Expected member name, '[' or '(' after '?.'",
        next,
        questionDot,
        expr,
        ExpressionFrameworkErrorCode.ParseUnexpectedTokenOptionalChain,
      );
    }

    this.state.nextToken();
    return new AccessMemberExpression(
      this.state.spanFrom(expr, next.end),
      expr,
      this.deps.identifierFromToken(next),
      true,
    );
  }

  private parseCallExpression(
    expr: IsLeftHandSide,
    optional: boolean,
  ): ParseOutcome<IsLeftHandSide> {
    const args = this.parseArguments();
    if (isParseFailure(args)) {
      if (!isParseCompanionFailure(args)) {
        return args;
      }
      return this.companionBuilder.widenCallArgumentsFailure(args, expr);
    }

    const span = this.state.spanFrom(expr, this.state.consumedEnd);
    if (this.isAccessScope(expr)) {
      return new CallScopeExpression(
        span,
        expr.name,
        args,
        expr.ancestor,
        optional,
      );
    }

    if (this.isAccessGlobal(expr)) {
      return new CallGlobalExpression(
        span,
        expr.name,
        args,
      );
    }

    if (this.isAccessMember(expr)) {
      return new CallMemberExpression(
        span,
        expr.object,
        expr.name,
        args,
        expr.optional,
        optional,
      );
    }

    return new CallFunctionExpression(
      span,
      expr,
      args,
      optional,
    );
  }

  private parseKeyedAccess(
    object: IsLeftHandSide,
    optional: boolean,
  ): ParseOutcome<AccessKeyedExpression> {
    const open = this.state.nextToken();
    this.state.delimiters.push(MatchedDelimiterKind.Bracket, open);

    const key = this.deps.parseAssignExpr();
    if (isParseFailure(key)) {
      if (isParseCompanionFailure(key)) {
        return key;
      }

      return this.companionBuilder.missingExpressionGapFailure(
        key,
        open,
        ExpressionCompanionFrameKind.IndexedAccess,
        this.state.span(this.state.localStart(object), open.end),
        [this.state.prefixRefs.root(object)],
        [
          ExpressionExpectedContinuationClass.Expression,
          ExpressionExpectedContinuationClass.CloseBracket,
        ],
      );
    }

    const close = this.state.peekToken();
    if (close.type !== TokenType.CloseBracket) {
      return this.companionBuilder.missingClosingDelimiterFailure(
        "Expected ']' in indexed access",
        close,
        ExpressionCompanionFrameKind.IndexedAccess,
        ExpressionExpectedContinuationClass.CloseBracket,
        this.state.span(this.state.localStart(object), this.state.localEnd(key)),
        [
          this.state.prefixRefs.root(object),
          this.state.prefixRefs.child(key),
        ],
      );
    }

    this.state.nextToken();
    this.state.delimiters.pop(MatchedDelimiterKind.Bracket);

    return new AccessKeyedExpression(
      this.state.spanFrom(object, this.state.consumedEnd),
      object,
      key,
      optional,
    );
  }

  private parseArguments(): ParsedArguments {
    const open = this.state.peekToken();
    if (open.type !== TokenType.OpenParen) {
      return this.state.failures.hardError("Expected '(' for argument list", open);
    }

    this.state.nextToken();
    this.state.delimiters.push(MatchedDelimiterKind.Paren, open);

    const args: IsAssign[] = [];
    let gapAnchor = open;
    const first = this.state.peekToken();
    if (first.type === TokenType.CloseParen) {
      this.state.nextToken();
      this.state.delimiters.pop(MatchedDelimiterKind.Paren);
      return args;
    }

    while (true) {
      const expr = this.deps.parseAssignExpr();
      if (isParseFailure(expr)) {
        if (isParseCompanionFailure(expr)) {
          return expr;
        }

        if (args.length === 0) {
          return this.companionBuilder.frontierOnlyFailure(
            "Expected argument or ')' in argument list",
            this.state.peekToken(),
            ExpressionFrontierKind.AmbiguousClosure,
            [
              ExpressionExpectedContinuationClass.Expression,
              ExpressionExpectedContinuationClass.CloseParen,
            ],
            ExpressionCompanionFrameKind.CallArguments,
            this.state.span(open.start, open.end),
          );
        }

        return this.companionBuilder.missingCallArgumentFailure(
          expr,
          gapAnchor,
          this.state.span(open.start, this.state.consumedEnd),
          args.map((arg, index) => (
            index === 0
              ? this.state.prefixRefs.child(arg)
              : this.state.prefixRefs.sibling(arg)
          )),
        );
      }

      args.push(expr);

      const t = this.state.peekToken();
      if (t.type === TokenType.Comma) {
        this.state.nextToken();
        gapAnchor = t;

        const next = this.state.peekToken();
        if (next.type === TokenType.CloseParen) {
          this.state.nextToken();
          this.state.delimiters.pop(MatchedDelimiterKind.Paren);
          break;
        }
        continue;
      }

      if (t.type === TokenType.CloseParen) {
        this.state.nextToken();
        this.state.delimiters.pop(MatchedDelimiterKind.Paren);
        break;
      }

      return this.companionBuilder.missingClosingDelimiterFailure(
        "Expected ',' or ')' in argument list",
        t,
        ExpressionCompanionFrameKind.CallArguments,
        ExpressionExpectedContinuationClass.CloseParen,
        this.state.span(open.start, this.state.consumedEnd),
        args.map((arg, index) => (
          index === 0
            ? this.state.prefixRefs.child(arg)
            : this.state.prefixRefs.sibling(arg)
        )),
      );
    }

    return args;
  }

  private isAccessScope(expr: IsLeftHandSide): expr is AccessScopeExpression {
    return expr.$kind === 'AccessScope';
  }

  private isAccessGlobal(expr: IsLeftHandSide): expr is AccessGlobalExpression {
    return expr.$kind === 'AccessGlobal';
  }

  private isAccessMember(expr: IsLeftHandSide): expr is AccessMemberExpression {
    return expr.$kind === 'AccessMember';
  }

  private hasOptionalChain(expr: IsLeftHandSide): boolean {
    switch (expr.$kind) {
      case 'AccessMember':
        return expr.optional || this.hasOptionalChain(expr.object);
      case 'AccessKeyed':
        return expr.optional || this.hasOptionalChain(expr.object);
      case 'CallFunction':
        return expr.optional || this.hasOptionalChain(expr.func);
      case 'CallMember':
        return expr.optionalMember || expr.optionalCall || this.hasOptionalChain(expr.object);
      case 'TaggedTemplate':
        return this.hasOptionalChain(expr.func);
      case 'New':
        return this.hasOptionalChain(expr.func);
      default:
        return false;
    }
  }
}
