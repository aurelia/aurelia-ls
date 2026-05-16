import { TokenType, type Token } from './expression-scanner.js';
import {
  ArrayBindingPattern,
  BindingIdentifier,
  BindingPatternDefault,
  BindingPatternHole,
  ObjectBindingPattern,
  ObjectBindingPatternProperty,
} from './ast.js';
import type {
  BindingPattern,
  IsAssign,
} from './ast.js';
import {
  ExpressionCompanionFrameKind,
  ExpressionExpectedContinuationClass,
  ExpressionFrontierKind,
  MatchedDelimiterKind,
} from './parse-result-algebra.js';
import type { CompletedInputCompanionBuilder } from './completed-input-companion-builder.js';
import { CompletedInputParserState } from './completed-input-parser-state.js';
import {
  isParseCompanionFailure,
  isParseFailure,
  type ParseOutcome,
} from './parse-failure.js';
import { ExpressionFrameworkErrorCode } from './framework-error-code.js';

type ParsedBindingPattern = ParseOutcome<BindingPattern>;
type ParsedBindingIdentifier = ParseOutcome<BindingIdentifier>;
type ParsedArrayBindingPatternStep = ParseOutcome<ArrayBindingPatternStep>;
type ParsedObjectBindingPatternStep = ParseOutcome<ObjectBindingPatternStep>;

const enum ArrayBindingPatternStep {
  Continue = 'continue',
  Closed = 'closed',
}

const enum ObjectBindingPatternStep {
  Continue = 'continue',
  Closed = 'closed',
}

export interface CompletedInputBindingPatternCorridorDependencies {
  readonly state: CompletedInputParserState;
  readonly companionBuilder: Pick<
    CompletedInputCompanionBuilder,
    | 'widenFailureToFrame'
    | 'missingBindingDeclarationFailure'
    | 'missingExpressionGapFailure'
    | 'missingClosingDelimiterFailure'
  >;
  readonly parseAssignExpr: () => ParseOutcome<IsAssign>;
  readonly bindingIdentifierFromToken: (token: Token) => ParsedBindingIdentifier;
}

/**
 * Binding-pattern grammar for iterator declarations.
 *
 * Iterator headers own the `declaration of iterable; tail` law, but array/object
 * binding patterns are reusable ECMAScript grammar. Keep destructuring recovery
 * here so `CompletedInputIteratorCorridor` does not become a second expression
 * parser as iterator features grow.
 */
export class CompletedInputBindingPatternCorridor {
  private readonly state: CompletedInputParserState;
  private readonly companionBuilder: CompletedInputBindingPatternCorridorDependencies['companionBuilder'];

  constructor(private readonly deps: CompletedInputBindingPatternCorridorDependencies) {
    this.state = deps.state;
    this.companionBuilder = deps.companionBuilder;
  }

  parseLhsBinding(): ParsedBindingPattern {
    return this.parseBindingPatternBase(
      null,
      'Invalid repeat.for left-hand side; expected identifier, array pattern, or object pattern',
    );
  }

  private parseBindingIdentifier(): ParsedBindingIdentifier {
    const t = this.state.peekToken();
    if (t.type !== TokenType.Identifier) {
      return this.state.failures.error('Expected identifier', t);
    }

    this.state.nextToken();
    return this.deps.bindingIdentifierFromToken(t);
  }

  private parseBindingPatternWithOptionalDefault(
    frameworkErrorCode: string | null = null,
  ): ParsedBindingPattern {
    const pattern = this.parseBindingPatternBase(frameworkErrorCode);
    if (isParseFailure(pattern)) return pattern;

    const maybeDefault = this.state.peekToken();
    if (maybeDefault.type !== TokenType.Equals) {
      return pattern;
    }

    this.state.nextToken();
    const init = this.deps.parseAssignExpr();
    if (isParseFailure(init)) {
      return this.companionBuilder.missingExpressionGapFailure(
        init,
        maybeDefault,
        ExpressionCompanionFrameKind.IteratorDeclaration,
        this.state.span(this.state.localStart(pattern), maybeDefault.end),
        [this.state.prefixRefs.root(pattern)],
      );
    }

    return new BindingPatternDefault(
      this.state.spanFrom(pattern, init),
      pattern,
      init,
    );
  }

  private parseBindingPatternBase(
    frameworkErrorCode: string | null = null,
    invalidPatternMessage = 'Invalid binding pattern; expected identifier, array pattern, or object pattern',
  ): ParsedBindingPattern {
    const t = this.state.peekToken();
    switch (t.type) {
      case TokenType.Identifier:
        return this.parseBindingIdentifier();
      case TokenType.OpenBracket:
        return this.parseArrayBindingPattern();
      case TokenType.OpenBrace:
        return this.parseObjectBindingPattern();
      default:
        return this.state.failures.error(
          invalidPatternMessage,
          t,
          frameworkErrorCode,
        );
    }
  }

  private parseOptionalDefaultForShorthand(binding: BindingIdentifier): ParsedBindingPattern {
    const maybeDefault = this.state.peekToken();
    if (maybeDefault.type !== TokenType.Equals) {
      return binding;
    }

    this.state.nextToken();
    const init = this.deps.parseAssignExpr();
    if (isParseFailure(init)) {
      return this.companionBuilder.missingExpressionGapFailure(
        init,
        maybeDefault,
        ExpressionCompanionFrameKind.IteratorDeclaration,
        this.state.span(this.state.localStart(binding), maybeDefault.end),
        [this.state.prefixRefs.root(binding)],
      );
    }

    return new BindingPatternDefault(
      this.state.spanFrom(binding, init),
      binding,
      init,
    );
  }

  private parseArrayBindingPattern(): ParseOutcome<ArrayBindingPattern> {
    const open = this.state.nextToken();
    this.state.delimiters.push(MatchedDelimiterKind.Bracket, open);
    const start = open.start;

    const elements: BindingPattern[] = [];
    let rest: BindingPattern | null = null;

    while (true) {
      const t = this.state.peekToken();

      if (t.type === TokenType.CloseBracket) {
        this.state.nextToken();
        this.state.delimiters.pop(MatchedDelimiterKind.Bracket);
        break;
      }

      if (t.type === TokenType.EOF) {
        return this.state.failures.frontierOnlyFailure(
          "Expected binding pattern element, ',' or ']' in array pattern",
          t,
          ExpressionFrontierKind.AmbiguousClosure,
          [
            ExpressionExpectedContinuationClass.BindingDeclaration,
            ExpressionExpectedContinuationClass.Comma,
            ExpressionExpectedContinuationClass.CloseBracket,
          ],
          ExpressionCompanionFrameKind.IteratorDeclaration,
          this.state.span(start, this.state.consumedEnd || open.end),
          this.state.prefixRefs.optional(this.state.prefixRefs.arrayBindingPattern(start, elements, rest)),
        );
      }

      if (t.type === TokenType.Comma) {
        this.state.nextToken();
        elements.push(new BindingPatternHole(this.state.spanFromToken(t)));
        continue;
      }

      if (t.type === TokenType.Ellipsis) {
        if (rest) {
          return this.state.failures.error('Only one rest element is allowed in an array pattern', t);
        }

        const parsedRest = this.parseArrayBindingRest(start, elements, rest);
        if (isParseFailure(parsedRest)) {
          return parsedRest;
        }
        rest = parsedRest;
        break;
      }

      const element = this.parseArrayBindingElement(start, elements, rest);
      if (isParseFailure(element)) {
        return element;
      }
      elements.push(element);

      const step = this.parseArrayBindingSeparator(start, elements, rest, element);
      if (isParseFailure(step)) {
        return step;
      }
      if (step === ArrayBindingPatternStep.Closed) {
        break;
      }
    }

    return new ArrayBindingPattern(
      this.state.span(start, this.state.consumedEnd),
      elements,
      rest,
    );
  }

  private parseArrayBindingRest(
    start: number,
    elements: readonly BindingPattern[],
    rest: BindingPattern | null,
  ): ParsedBindingPattern {
    const ellipsis = this.state.nextToken();
    const parsedRest = this.parseBindingPatternBase(
      ExpressionFrameworkErrorCode.ParseUnexpectedTokenDestructuring,
    );
    if (isParseFailure(parsedRest)) {
      if (isParseCompanionFailure(parsedRest)) {
        return this.companionBuilder.widenFailureToFrame(
          parsedRest,
          ExpressionCompanionFrameKind.IteratorDeclaration,
          this.state.span(start, this.state.failurePreservedEnd(parsedRest)),
          this.state.prefixRefs.optional(this.state.prefixRefs.arrayBindingPattern(start, elements, rest)),
        );
      }

      return this.companionBuilder.missingBindingDeclarationFailure(
        parsedRest,
        ellipsis,
        this.state.span(start, ellipsis.end),
        this.state.prefixRefs.optional(this.state.prefixRefs.arrayBindingPattern(start, elements, rest)),
      );
    }

    const afterRest = this.state.peekToken();
    if (afterRest.type === TokenType.Comma) {
      return this.state.failures.error('Rest element must be in the last position of an array pattern', afterRest);
    }
    if (afterRest.type === TokenType.CloseBracket) {
      this.closeArrayBindingPattern();
      return parsedRest;
    }
    if (afterRest.type === TokenType.EOF || afterRest.type === TokenType.KeywordOf) {
      return this.companionBuilder.missingClosingDelimiterFailure(
        "Expected ']' after array pattern rest element",
        afterRest,
        ExpressionCompanionFrameKind.IteratorDeclaration,
        ExpressionExpectedContinuationClass.CloseBracket,
        this.state.span(start, this.state.localEnd(parsedRest)),
        this.state.prefixRefs.optional(this.state.prefixRefs.arrayBindingPattern(start, elements, parsedRest)),
      );
    }
    return this.state.failures.error(
      "Expected ']' after array pattern rest element",
      afterRest,
      ExpressionFrameworkErrorCode.ParseUnexpectedTokenDestructuring,
    );
  }

  private parseArrayBindingElement(
    start: number,
    elements: readonly BindingPattern[],
    rest: BindingPattern | null,
  ): ParsedBindingPattern {
    const element = this.parseBindingPatternWithOptionalDefault(
      ExpressionFrameworkErrorCode.ParseUnexpectedTokenDestructuring,
    );
    if (!isParseFailure(element)) {
      return element;
    }
    return isParseCompanionFailure(element)
      ? this.companionBuilder.widenFailureToFrame(
          element,
          ExpressionCompanionFrameKind.IteratorDeclaration,
          this.state.span(start, this.state.failurePreservedEnd(element)),
          this.state.prefixRefs.optional(this.state.prefixRefs.arrayBindingPattern(start, elements, rest)),
        )
      : element;
  }

  private parseArrayBindingSeparator(
    start: number,
    elements: readonly BindingPattern[],
    rest: BindingPattern | null,
    element: BindingPattern,
  ): ParsedArrayBindingPatternStep {
    const sep = this.state.peekToken();
    if (sep.type === TokenType.Comma) {
      this.state.nextToken();
      const maybeClose = this.state.peekToken();
      if (maybeClose.type === TokenType.CloseBracket) {
        this.closeArrayBindingPattern();
        return ArrayBindingPatternStep.Closed;
      }
      return ArrayBindingPatternStep.Continue;
    }

    if (sep.type === TokenType.CloseBracket) {
      this.closeArrayBindingPattern();
      return ArrayBindingPatternStep.Closed;
    }

    if (sep.type === TokenType.EOF || sep.type === TokenType.KeywordOf) {
      return this.companionBuilder.missingClosingDelimiterFailure(
        "Expected ',' or ']' in array binding pattern",
        sep,
        ExpressionCompanionFrameKind.IteratorDeclaration,
        ExpressionExpectedContinuationClass.CloseBracket,
        this.state.span(start, this.state.localEnd(element)),
        this.state.prefixRefs.optional(this.state.prefixRefs.arrayBindingPattern(start, elements, rest)),
      );
    }

    return this.state.failures.error(
      "Expected ',' or ']' in array binding pattern",
      sep,
      ExpressionFrameworkErrorCode.ParseUnexpectedTokenDestructuring,
    );
  }

  private closeArrayBindingPattern(): void {
    this.state.nextToken();
    this.state.delimiters.pop(MatchedDelimiterKind.Bracket);
  }

  private parseObjectBindingPattern(): ParseOutcome<ObjectBindingPattern> {
    const open = this.state.nextToken();
    this.state.delimiters.push(MatchedDelimiterKind.Brace, open);
    const start = open.start;

    const properties: ObjectBindingPatternProperty[] = [];
    let rest: BindingPattern | null = null;

    while (true) {
      const t = this.state.peekToken();
      if (t.type === TokenType.EOF) {
        return this.state.failures.frontierOnlyFailure(
          "Expected object binding pattern key or '}'",
          t,
          ExpressionFrontierKind.AmbiguousClosure,
          [
            ExpressionExpectedContinuationClass.ObjectLiteralKey,
            ExpressionExpectedContinuationClass.CloseBrace,
          ],
          ExpressionCompanionFrameKind.IteratorDeclaration,
          this.state.span(start, this.state.consumedEnd || open.end),
          this.state.prefixRefs.optional(this.state.prefixRefs.objectBindingPattern(start, properties, rest)),
        );
      }
      if (t.type === TokenType.CloseBrace) {
        this.state.nextToken();
        this.state.delimiters.pop(MatchedDelimiterKind.Brace);
        break;
      }

      if (t.type === TokenType.Ellipsis) {
        if (rest) {
          return this.state.failures.error('Only one rest element is allowed in an object pattern', t);
        }

        const parsedRest = this.parseObjectBindingRest(start, properties, rest);
        if (isParseFailure(parsedRest)) {
          return parsedRest;
        }
        rest = parsedRest;
        break;
      }

      const property = this.parseObjectBindingProperty(start, properties, rest);
      if (isParseFailure(property)) {
        return property;
      }
      properties.push(property);
      const step = this.parseObjectBindingSeparator(start, properties, rest, property.value);
      if (isParseFailure(step)) {
        return step;
      }
      if (step === ObjectBindingPatternStep.Closed) {
        break;
      }
    }

    return new ObjectBindingPattern(
      this.state.span(start, this.state.consumedEnd),
      properties,
      rest,
    );
  }

  private parseObjectBindingRest(
    start: number,
    properties: readonly ObjectBindingPatternProperty[],
    rest: BindingPattern | null,
  ): ParsedBindingPattern {
    const ellipsis = this.state.nextToken();
    const parsedRest = this.parseBindingPatternBase();
    if (isParseFailure(parsedRest)) {
      if (isParseCompanionFailure(parsedRest)) {
        return this.companionBuilder.widenFailureToFrame(
          parsedRest,
          ExpressionCompanionFrameKind.IteratorDeclaration,
          this.state.span(start, this.state.failurePreservedEnd(parsedRest)),
          this.state.prefixRefs.optional(this.state.prefixRefs.objectBindingPattern(start, properties, rest)),
        );
      }

      return this.companionBuilder.missingBindingDeclarationFailure(
        parsedRest,
        ellipsis,
        this.state.span(start, ellipsis.end),
        this.state.prefixRefs.optional(this.state.prefixRefs.objectBindingPattern(start, properties, rest)),
      );
    }

    const afterRest = this.state.peekToken();
    if (afterRest.type === TokenType.Comma) {
      return this.state.failures.error('Rest element must be in the last position of an object pattern', afterRest);
    }
    if (afterRest.type === TokenType.CloseBrace) {
      this.closeObjectBindingPattern();
      return parsedRest;
    }
    if (afterRest.type === TokenType.EOF || afterRest.type === TokenType.KeywordOf) {
      return this.companionBuilder.missingClosingDelimiterFailure(
        "Expected '}' after object pattern rest element",
        afterRest,
        ExpressionCompanionFrameKind.IteratorDeclaration,
        ExpressionExpectedContinuationClass.CloseBrace,
        this.state.span(start, this.state.localEnd(parsedRest)),
        this.state.prefixRefs.optional(this.state.prefixRefs.objectBindingPattern(start, properties, parsedRest)),
      );
    }
    return this.state.failures.error("Expected '}' after object pattern rest element", afterRest);
  }

  private parseObjectBindingProperty(
    start: number,
    properties: readonly ObjectBindingPatternProperty[],
    rest: BindingPattern | null,
  ): ParseOutcome<ObjectBindingPatternProperty> {
    const keyTok = this.state.peekToken();
    if (!this.isObjectBindingKeyToken(keyTok)) {
      return this.state.failures.error(
        'Invalid object binding pattern key; expected identifier, string, or number',
        keyTok,
      );
    }
    this.state.nextToken();

    const key: string | number = keyTok.type === TokenType.NumericLiteral
      ? (keyTok.value as number)
      : String(keyTok.value);
    const afterKey = this.state.peekToken();
    const valuePattern = afterKey.type === TokenType.Colon
      ? this.parseObjectBindingPropertyValue(start, properties, rest)
      : this.parseObjectBindingShorthand(keyTok, start, properties, rest);
    return isParseFailure(valuePattern)
      ? valuePattern
      : new ObjectBindingPatternProperty(key, valuePattern);
  }

  private parseObjectBindingPropertyValue(
    start: number,
    properties: readonly ObjectBindingPatternProperty[],
    rest: BindingPattern | null,
  ): ParsedBindingPattern {
    const colon = this.state.nextToken();
    const parsedValuePattern = this.parseBindingPatternWithOptionalDefault();
    if (!isParseFailure(parsedValuePattern)) {
      return parsedValuePattern;
    }
    const prefix = this.state.prefixRefs.optional(this.state.prefixRefs.objectBindingPattern(start, properties, rest));
    if (isParseCompanionFailure(parsedValuePattern)) {
      return this.companionBuilder.widenFailureToFrame(
        parsedValuePattern,
        ExpressionCompanionFrameKind.IteratorDeclaration,
        this.state.span(start, this.state.failurePreservedEnd(parsedValuePattern)),
        prefix,
      );
    }

    return this.companionBuilder.missingBindingDeclarationFailure(
      parsedValuePattern,
      colon,
      this.state.span(start, colon.end),
      prefix,
    );
  }

  private parseObjectBindingShorthand(
    keyTok: Token,
    start: number,
    properties: readonly ObjectBindingPatternProperty[],
    rest: BindingPattern | null,
  ): ParsedBindingPattern {
    if (keyTok.type !== TokenType.Identifier) {
      return this.state.failures.error('Object binding pattern shorthand requires an identifier key', keyTok);
    }

    const shorthand = this.deps.bindingIdentifierFromToken(keyTok);
    if (isParseFailure(shorthand)) {
      return shorthand;
    }
    const parsedValuePattern = this.parseOptionalDefaultForShorthand(shorthand);
    if (!isParseFailure(parsedValuePattern)) {
      return parsedValuePattern;
    }
    return isParseCompanionFailure(parsedValuePattern)
      ? this.companionBuilder.widenFailureToFrame(
          parsedValuePattern,
          ExpressionCompanionFrameKind.IteratorDeclaration,
          this.state.span(start, this.state.failurePreservedEnd(parsedValuePattern)),
          this.state.prefixRefs.optional(this.state.prefixRefs.objectBindingPattern(start, properties, rest)),
        )
      : parsedValuePattern;
  }

  private parseObjectBindingSeparator(
    start: number,
    properties: readonly ObjectBindingPatternProperty[],
    rest: BindingPattern | null,
    valuePattern: BindingPattern,
  ): ParsedObjectBindingPatternStep {
    const sep = this.state.peekToken();
    if (sep.type === TokenType.Comma) {
      this.state.nextToken();
      const maybeClose = this.state.peekToken();
      if (maybeClose.type === TokenType.CloseBrace) {
        this.closeObjectBindingPattern();
        return ObjectBindingPatternStep.Closed;
      }
      return ObjectBindingPatternStep.Continue;
    }

    if (sep.type === TokenType.CloseBrace) {
      this.closeObjectBindingPattern();
      return ObjectBindingPatternStep.Closed;
    }

    if (sep.type === TokenType.EOF || sep.type === TokenType.KeywordOf) {
      return this.companionBuilder.missingClosingDelimiterFailure(
        "Expected ',' or '}' in object binding pattern",
        sep,
        ExpressionCompanionFrameKind.IteratorDeclaration,
        ExpressionExpectedContinuationClass.CloseBrace,
        this.state.span(start, this.state.localEnd(valuePattern)),
        this.state.prefixRefs.optional(this.state.prefixRefs.objectBindingPattern(start, properties, rest)),
      );
    }

    return this.state.failures.error("Expected ',' or '}' in object binding pattern", sep);
  }

  private closeObjectBindingPattern(): void {
    this.state.nextToken();
    this.state.delimiters.pop(MatchedDelimiterKind.Brace);
  }

  private isObjectBindingKeyToken(token: Token): boolean {
    return token.type === TokenType.Identifier
      || token.type === TokenType.StringLiteral
      || token.type === TokenType.NumericLiteral;
  }
}
