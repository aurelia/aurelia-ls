import { TokenType, type Token } from './expression-scanner.js';
import {
  BindingBehaviorExpression,
  ValueConverterExpression,
} from './ast.js';
import type {
  Identifier,
  IsAssign,
  IsBindingBehavior,
  IsValueConverter,
} from './ast.js';
import {
  ExpressionCompanionFrameKind,
  ExpressionExpectedContinuationClass,
} from './parse-result-algebra.js';
import { isParseCompanionFailure, isParseFailure } from './parse-failure.js';
import type { ParseOutcome } from './parse-failure.js';
import { CompletedInputCompanionBuilder } from './completed-input-companion-builder.js';
import { CompletedInputParserState } from './completed-input-parser-state.js';

type ParsedBindingBehavior = ParseOutcome<IsBindingBehavior>;

interface CompletedInputTailCorridorDependencies {
  readonly state: CompletedInputParserState;
  readonly companionBuilder: CompletedInputCompanionBuilder;
  readonly parseAssignExpr: () => ParseOutcome<IsAssign>;
  readonly identifierFromToken: (token: Token) => Identifier;
}

/**
 * Property-like tail corridor for value converters and binding behaviors.
 *
 * This corridor owns the Aurelia-specific tail families that sit after the
 * ordinary expression grammar:
 * - value converter tails (`| name[:arg]*`)
 * - binding behavior tails (`& name[:arg]*`)
 *
 * TODO: If later work introduces more tail families or family-specific
 * argument law, split this into narrower tail-family facets rather than
 * letting it regrow into a generic post-expression parser.
 */
export class CompletedInputTailCorridor {
  private readonly state: CompletedInputParserState;
  private readonly companionBuilder: CompletedInputCompanionBuilder;

  constructor(
    private readonly deps: CompletedInputTailCorridorDependencies,
  ) {
    this.state = deps.state;
    this.companionBuilder = deps.companionBuilder;
  }

  parse(core: IsAssign): ParsedBindingBehavior {
    let expr: IsValueConverter = core;

    while (this.state.peekToken().type === TokenType.Bar) {
      const pipe = this.state.nextToken();
      const nameTok = this.state.peekToken();
      if (nameTok.type !== TokenType.Identifier) {
        return this.companionBuilder.missingTailNameFailure(
          "Expected identifier after '|'",
          nameTok,
          pipe,
          expr,
          ExpressionCompanionFrameKind.ValueConverterTail,
          ExpressionExpectedContinuationClass.ValueConverterName,
        );
      }

      this.state.nextToken();
      const args = this.parseTailArguments(
        expr,
        ExpressionCompanionFrameKind.ValueConverterTail,
      );
      if (isParseFailure(args)) {
        return args;
      }

      expr = new ValueConverterExpression(
        this.state.spanFrom(expr, this.state.consumedEnd),
        expr,
        this.deps.identifierFromToken(nameTok),
        args,
      );
    }

    let behaviorExpr: IsBindingBehavior = expr;
    while (this.state.peekToken().type === TokenType.Ampersand) {
      const amp = this.state.nextToken();
      const nameTok = this.state.peekToken();
      if (nameTok.type !== TokenType.Identifier) {
        return this.companionBuilder.missingTailNameFailure(
          "Expected identifier after '&'",
          nameTok,
          amp,
          behaviorExpr,
          ExpressionCompanionFrameKind.BindingBehaviorTail,
          ExpressionExpectedContinuationClass.BindingBehaviorName,
        );
      }

      this.state.nextToken();
      const args = this.parseTailArguments(
        behaviorExpr,
        ExpressionCompanionFrameKind.BindingBehaviorTail,
      );
      if (isParseFailure(args)) {
        return args;
      }

      behaviorExpr = new BindingBehaviorExpression(
        this.state.spanFrom(behaviorExpr, this.state.consumedEnd),
        behaviorExpr,
        this.deps.identifierFromToken(nameTok),
        args,
      );
    }

    return behaviorExpr;
  }

  private parseTailArguments(
    receiver: IsValueConverter | IsBindingBehavior,
    surroundingFrameKind: ExpressionCompanionFrameKind.ValueConverterTail | ExpressionCompanionFrameKind.BindingBehaviorTail,
  ): ParseOutcome<IsAssign[]> {
    const args: IsAssign[] = [];
    while (this.state.peekToken().type === TokenType.Colon) {
      const colon = this.state.nextToken();
      const arg = this.deps.parseAssignExpr();
      if (isParseFailure(arg)) {
        if (isParseCompanionFailure(arg)) {
          return arg;
        }

        return this.companionBuilder.missingExpressionGapFailure(
          arg,
          colon,
          surroundingFrameKind,
          this.state.span(this.state.localStart(receiver), colon.end),
          [this.state.rootPrefix(receiver)],
        );
      }

      args.push(arg);
    }

    return args;
  }
}
