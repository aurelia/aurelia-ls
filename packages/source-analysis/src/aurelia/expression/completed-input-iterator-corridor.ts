import { TokenType, type Token } from './expression-scanner.js';
import {
  ArrayBindingPattern,
  BindingIdentifier,
  BindingPatternDefault,
  BindingPatternHole,
  ForOfStatement,
  Identifier,
  ObjectBindingPattern,
  ObjectBindingPatternProperty,
} from './ast.js';
import type {
  BindingPattern,
  IsAssign,
  IsBindingBehavior,
} from './ast.js';
import type { SourceSpan } from './source-span.js';
import {
  ClosedSubtreeRef,
  ExpressionCompanionFrameKind,
  ExpressionExpectedContinuationClass,
  ExpressionFrontierKind,
  ExpressionGapDescriptor,
  ExpressionGapKind,
  IteratorActiveRegionKind,
  IteratorOfSeparatorState,
  IteratorOfSeparatorStateKind,
  IteratorTrailingSplitKind,
  IteratorTrailingSplitState,
  IteratorSuccess,
  MatchedDelimiterKind,
} from './parse-result-algebra.js';
import type {
  CompletedInputPropertyLikeExpression,
  IteratorParseResult,
} from './parse-result-algebra.js';
import { CompletedInputPublication } from './completed-input-publication.js';
import type { CompletedInputCompanionBuilder } from './completed-input-companion-builder.js';
import { CompletedInputParserState } from './completed-input-parser-state.js';
import { ParseFailureInspector } from './parse-failure-inspection.js';
import {
  isParseCompanionFailure,
  isParseFailure,
  type ParseCompanionFailure,
  type ParseFailure,
  type ParseOutcome,
} from './parse-failure.js';

type ParsedBindingPattern = ParseOutcome<BindingPattern>;
type ParsedBindingIdentifier = ParseOutcome<BindingIdentifier>;

interface ParsedIteratorTailSplit {
  readonly semiIdx: number;
  readonly semicolonToken: Token | null;
  readonly rawTailText: string;
  readonly tailSpan: SourceSpan | null;
  readonly unexpectedTrailingToken: boolean;
}

interface CompletedInputIteratorCorridorDependencies {
  readonly state: CompletedInputParserState;
  readonly companionBuilder: Pick<
    CompletedInputCompanionBuilder,
    | 'widenFailureToFrame'
    | 'missingBindingDeclarationFailure'
    | 'missingExpressionGapFailure'
    | 'missingClosingDelimiterFailure'
  >;
  readonly parseAssignExpr: () => ParseOutcome<IsAssign>;
  readonly parseTails: (core: IsAssign) => ParseOutcome<IsBindingBehavior>;
  readonly bindingIdentifierFromToken: (token: Token) => ParsedBindingIdentifier;
}

// TODO: If the dependency surface keeps growing beyond `state`,
// `companionBuilder`, and the expression-core callbacks, split those into even
// narrower parser facets instead of letting this corridor grow one giant
// constructor bag.

/**
 * Iterator-header-specific grammar corridor for completed-input parsing.
 *
 * This class owns the parts of expression parsing that are structurally
 * specific to `repeat.for`/iterator entry:
 * - declaration pattern grammar
 * - `of` separator law
 * - iterable expression handoff back into the ordinary property-like lane
 * - visible `; tail` split without claiming tail-grammar ownership
 *
 * The shared expression grammar, parser state engine, and family-neutral
 * failure/publication helpers still live elsewhere. The goal here is to keep
 * iterator-family law from accreting inside the ordinary expression parser.
 *
 * TODO: If iterator-tail parsing ever becomes real grammar instead of raw
 * visibility, give it a dedicated iterator-tail carrier/parser beside this
 * class rather than letting `CompletedInputIteratorCorridor` become a second
 * full expression parser.
 */
export class CompletedInputIteratorCorridor {
  private readonly state: CompletedInputParserState;
  private readonly companionBuilder: CompletedInputIteratorCorridorDependencies['companionBuilder'];

  constructor(
    private readonly deps: CompletedInputIteratorCorridorDependencies,
  ) {
    this.state = deps.state;
    this.companionBuilder = deps.companionBuilder;
  }

  parseHeader(): IteratorParseResult {
    const first = this.state.peekToken();
    if (first.type === TokenType.EOF) {
      return this.iteratorFrontierPublication(
        'Expected iterator declaration',
        first,
        IteratorActiveRegionKind.Declaration,
        ExpressionFrontierKind.AwaitingBindingDeclaration,
        [ExpressionExpectedContinuationClass.BindingDeclaration],
        null,
        [],
        this.iteratorSeparatorAbsent(),
        null,
        [],
        null,
      );
    }

    if (
      first.type !== TokenType.Identifier &&
      first.type !== TokenType.OpenBracket &&
      first.type !== TokenType.OpenBrace
    ) {
      if (first.type === TokenType.KeywordOf) {
        return this.iteratorFrontierPublication(
          "Expected iterator declaration before 'of' in iterator header",
          first,
          IteratorActiveRegionKind.Declaration,
          ExpressionFrontierKind.AwaitingBindingDeclaration,
          [ExpressionExpectedContinuationClass.BindingDeclaration],
          null,
          [],
          this.iteratorSeparatorAbsent(),
          null,
          [],
          null,
        );
      }

      return CompletedInputPublication.toParseError(
        'IsIterator',
        this.state.error(
          'Invalid repeat.for left-hand side; expected identifier, array pattern, or object pattern',
          first,
        ),
      );
    }

    const declaration = this.parseLhsBinding();
    if (isParseFailure(declaration)) {
      return CompletedInputPublication.toIteratorResult(
        declaration,
        IteratorActiveRegionKind.Declaration,
        null,
        ParseFailureInspector.closedSubtreeRefs(declaration),
        this.iteratorSeparatorAbsent(),
        null,
        [],
        null,
      );
    }

    const ofTok = this.state.peekToken();
    if (ofTok.type !== TokenType.KeywordOf) {
      return this.iteratorDegradedPublication(
        "Expected 'of' in iterator header",
        ofTok,
        IteratorActiveRegionKind.Separator,
        ExpressionFrontierKind.AwaitingSeparator,
        [ExpressionExpectedContinuationClass.Of],
        declaration.span,
        declaration,
        [],
        this.iteratorSeparatorAbsent(),
        null,
        [],
        [
          this.state.gapDescriptor(
            ExpressionGapKind.MissingIteratorOf,
            this.state.spanFromToken(ofTok),
            ExpressionCompanionFrameKind.IteratorHeader,
            [ExpressionExpectedContinuationClass.Of],
          ),
        ],
        null,
      );
    }
    this.state.nextToken();
    const ofSeparator = this.iteratorSeparatorPresent(ofTok);

    const {
      expr: iterable,
      semiIdx,
      semicolonToken,
      rawTailText,
      tailSpan,
      unexpectedTrailingToken,
    } = this.parseChainableRhs();
    if (isParseFailure(iterable)) {
      if (unexpectedTrailingToken) {
        return CompletedInputPublication.toParseError('IsIterator', iterable);
      }

      const iteratorIterableFailure = isParseCompanionFailure(iterable)
        ? iterable
        : this.state.degradedFailure(
            iterable.message,
            this.state.peekToken(),
            ExpressionFrontierKind.AwaitingExpression,
            [ExpressionExpectedContinuationClass.Expression],
            ExpressionCompanionFrameKind.IteratorIterable,
            this.state.span(this.state.localStart(declaration), ofTok.end),
            [],
            [
              this.state.gapDescriptor(
                ExpressionGapKind.MissingIteratorIterable,
                this.state.spanFromToken(ofTok),
                ExpressionCompanionFrameKind.IteratorIterable,
                [ExpressionExpectedContinuationClass.Expression],
              ),
            ],
          );
      return CompletedInputPublication.toIteratorResult(
        iteratorIterableFailure,
        IteratorActiveRegionKind.Iterable,
        declaration,
        [],
        ofSeparator,
        null,
        iteratorIterableFailure.companion.closedSubtreeRefs,
        null,
      );
    }

    if (semicolonToken && rawTailText.length === 0) {
      const trailingSplit = this.iteratorTrailingSplit(
        semicolonToken,
        IteratorTrailingSplitKind.SemicolonOnly,
        '',
        null,
      );
      return this.iteratorDegradedPublication(
        "Expected tail after ';' in iterator header",
        this.state.peekToken(),
        IteratorActiveRegionKind.TrailingSplit,
        ExpressionFrontierKind.AwaitingTailSegment,
        [ExpressionExpectedContinuationClass.IteratorTailSegment],
        this.state.span(this.state.localStart(declaration), semicolonToken.end),
        declaration,
        [],
        ofSeparator,
        iterable,
        [],
        [
          this.state.gapDescriptor(
            ExpressionGapKind.MissingIteratorTailSegment,
            this.state.spanFromToken(semicolonToken),
            ExpressionCompanionFrameKind.IteratorTrailingSplit,
            [ExpressionExpectedContinuationClass.IteratorTailSegment],
          ),
        ],
        trailingSplit,
      );
    }

    const span = this.state.span(0, this.state.source.length);
    const node = new ForOfStatement(span, declaration, iterable, semiIdx);
    const trailingSplit = semicolonToken
      ? this.iteratorTrailingSplit(
          semicolonToken,
          IteratorTrailingSplitKind.RawTailVisible,
          rawTailText,
          tailSpan,
        )
      : null;

    if (this.state.retainedFailure) {
      return CompletedInputPublication.toParseError('IsIterator', this.state.retainedFailure);
    }

    return new IteratorSuccess(node.span, node, trailingSplit);
  }

  private parseLhsBinding(): ParsedBindingPattern {
    const t = this.state.peekToken();

    switch (t.type) {
      case TokenType.Identifier:
        return this.parseBindingIdentifier();
      case TokenType.OpenBracket:
        return this.parseArrayBindingPattern();
      case TokenType.OpenBrace:
        return this.parseObjectBindingPattern();
      default:
        return this.state.error(
          'Invalid repeat.for left-hand side; expected identifier, array pattern, or object pattern',
          t,
        );
    }
  }

  private parseBindingIdentifier(): ParsedBindingIdentifier {
    const t = this.state.peekToken();
    if (t.type !== TokenType.Identifier) {
      return this.state.error('Expected identifier', t);
    }

    this.state.nextToken();
    return this.deps.bindingIdentifierFromToken(t);
  }

  private parseBindingPatternWithOptionalDefault(): ParsedBindingPattern {
    const pattern = this.parseBindingPatternBase();
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
        [this.state.rootPrefix(pattern)],
      );
    }

    return new BindingPatternDefault(
      this.state.spanFrom(pattern, init),
      pattern,
      init,
    );
  }

  private parseBindingPatternBase(): ParsedBindingPattern {
    const t = this.state.peekToken();
    switch (t.type) {
      case TokenType.Identifier:
        return this.parseBindingIdentifier();
      case TokenType.OpenBracket:
        return this.parseArrayBindingPattern();
      case TokenType.OpenBrace:
        return this.parseObjectBindingPattern();
      default:
        return this.state.error(
          'Invalid binding pattern; expected identifier, array pattern, or object pattern',
          t,
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
        [this.state.rootPrefix(binding)],
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
    this.state.pushDelimiter(MatchedDelimiterKind.Bracket, open);
    const start = open.start;

    const elements: BindingPattern[] = [];
    let rest: BindingPattern | null = null;

    while (true) {
      const t = this.state.peekToken();

      if (t.type === TokenType.CloseBracket) {
        this.state.nextToken();
        this.state.popDelimiter(MatchedDelimiterKind.Bracket);
        break;
      }

      if (t.type === TokenType.EOF) {
        return this.state.frontierOnlyFailure(
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
          this.state.withOptionalPrefixRef(this.state.arrayBindingPatternPrefixRef(start, elements, rest)),
        );
      }

      if (t.type === TokenType.Comma) {
        this.state.nextToken();
        elements.push(new BindingPatternHole(this.state.spanFromToken(t)));
        continue;
      }

      if (t.type === TokenType.Ellipsis) {
        if (rest) {
          return this.state.error('Only one rest element is allowed in an array pattern', t);
        }

        const ellipsis = this.state.nextToken();
        const parsedRest = this.parseBindingPatternBase();
        if (isParseFailure(parsedRest)) {
          if (isParseCompanionFailure(parsedRest)) {
            return this.companionBuilder.widenFailureToFrame(
              parsedRest,
              ExpressionCompanionFrameKind.IteratorDeclaration,
              this.state.span(start, this.state.failurePreservedEnd(parsedRest)),
              this.state.withOptionalPrefixRef(this.state.arrayBindingPatternPrefixRef(start, elements, rest)),
            );
          }

          return this.companionBuilder.missingBindingDeclarationFailure(
            parsedRest,
            ellipsis,
            this.state.span(start, ellipsis.end),
            this.state.withOptionalPrefixRef(this.state.arrayBindingPatternPrefixRef(start, elements, rest)),
          );
        }

        rest = parsedRest;
        const afterRest = this.state.peekToken();
        if (afterRest.type === TokenType.Comma) {
          return this.state.error('Rest element must be in the last position of an array pattern', afterRest);
        }
        if (afterRest.type === TokenType.CloseBracket) {
          this.state.nextToken();
          this.state.popDelimiter(MatchedDelimiterKind.Bracket);
          break;
        }
        if (afterRest.type === TokenType.EOF || afterRest.type === TokenType.KeywordOf) {
      return this.companionBuilder.missingClosingDelimiterFailure(
            "Expected ']' after array pattern rest element",
            afterRest,
            ExpressionCompanionFrameKind.IteratorDeclaration,
            ExpressionExpectedContinuationClass.CloseBracket,
            this.state.span(start, this.state.localEnd(rest)),
            this.state.withOptionalPrefixRef(this.state.arrayBindingPatternPrefixRef(start, elements, rest)),
          );
        }
        return this.state.error("Expected ']' after array pattern rest element", afterRest);
      }

      const element = this.parseBindingPatternWithOptionalDefault();
      if (isParseFailure(element)) {
        if (isParseCompanionFailure(element)) {
          return this.companionBuilder.widenFailureToFrame(
            element,
            ExpressionCompanionFrameKind.IteratorDeclaration,
            this.state.span(start, this.state.failurePreservedEnd(element)),
            this.state.withOptionalPrefixRef(this.state.arrayBindingPatternPrefixRef(start, elements, rest)),
          );
        }
        return element;
      }
      elements.push(element);

      const sep = this.state.peekToken();
      if (sep.type === TokenType.Comma) {
        this.state.nextToken();
        const maybeClose = this.state.peekToken();
        if (maybeClose.type === TokenType.CloseBracket) {
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

      if (sep.type === TokenType.EOF || sep.type === TokenType.KeywordOf) {
        return this.companionBuilder.missingClosingDelimiterFailure(
          "Expected ',' or ']' in array binding pattern",
          sep,
          ExpressionCompanionFrameKind.IteratorDeclaration,
          ExpressionExpectedContinuationClass.CloseBracket,
          this.state.span(start, this.state.localEnd(elements[elements.length - 1]!)),
          this.state.withOptionalPrefixRef(this.state.arrayBindingPatternPrefixRef(start, elements, rest)),
        );
      }

      return this.state.error("Expected ',' or ']' in array binding pattern", sep);
    }

    return new ArrayBindingPattern(
      this.state.span(start, this.state.consumedEnd),
      elements,
      rest,
    );
  }

  private parseObjectBindingPattern(): ParseOutcome<ObjectBindingPattern> {
    const open = this.state.nextToken();
    this.state.pushDelimiter(MatchedDelimiterKind.Brace, open);
    const start = open.start;

    const properties: ObjectBindingPatternProperty[] = [];
    let rest: BindingPattern | null = null;

    while (true) {
      const t = this.state.peekToken();
      if (t.type === TokenType.EOF) {
        return this.state.frontierOnlyFailure(
          "Expected object binding pattern key or '}'",
          t,
          ExpressionFrontierKind.AmbiguousClosure,
          [
            ExpressionExpectedContinuationClass.ObjectLiteralKey,
            ExpressionExpectedContinuationClass.CloseBrace,
          ],
          ExpressionCompanionFrameKind.IteratorDeclaration,
          this.state.span(start, this.state.consumedEnd || open.end),
          this.state.withOptionalPrefixRef(this.state.objectBindingPatternPrefixRef(start, properties, rest)),
        );
      }
      if (t.type === TokenType.CloseBrace) {
        this.state.nextToken();
        this.state.popDelimiter(MatchedDelimiterKind.Brace);
        break;
      }

      if (t.type === TokenType.Ellipsis) {
        if (rest) {
          return this.state.error('Only one rest element is allowed in an object pattern', t);
        }

        const ellipsis = this.state.nextToken();
        const parsedRest = this.parseBindingPatternBase();
        if (isParseFailure(parsedRest)) {
          if (isParseCompanionFailure(parsedRest)) {
            return this.companionBuilder.widenFailureToFrame(
              parsedRest,
              ExpressionCompanionFrameKind.IteratorDeclaration,
              this.state.span(start, this.state.failurePreservedEnd(parsedRest)),
              this.state.withOptionalPrefixRef(this.state.objectBindingPatternPrefixRef(start, properties, rest)),
            );
          }

          return this.companionBuilder.missingBindingDeclarationFailure(
            parsedRest,
            ellipsis,
            this.state.span(start, ellipsis.end),
            this.state.withOptionalPrefixRef(this.state.objectBindingPatternPrefixRef(start, properties, rest)),
          );
        }

        rest = parsedRest;
        const afterRest = this.state.peekToken();
        if (afterRest.type === TokenType.Comma) {
          return this.state.error('Rest element must be in the last position of an object pattern', afterRest);
        }
        if (afterRest.type === TokenType.CloseBrace) {
          this.state.nextToken();
          this.state.popDelimiter(MatchedDelimiterKind.Brace);
          break;
        }
        if (afterRest.type === TokenType.EOF || afterRest.type === TokenType.KeywordOf) {
          return this.companionBuilder.missingClosingDelimiterFailure(
            "Expected '}' after object pattern rest element",
            afterRest,
            ExpressionCompanionFrameKind.IteratorDeclaration,
            ExpressionExpectedContinuationClass.CloseBrace,
            this.state.span(start, this.state.localEnd(rest)),
            this.state.withOptionalPrefixRef(this.state.objectBindingPatternPrefixRef(start, properties, rest)),
          );
        }
        return this.state.error("Expected '}' after object pattern rest element", afterRest);
      }

      const keyTok = this.state.peekToken();
      if (
        keyTok.type !== TokenType.Identifier &&
        keyTok.type !== TokenType.StringLiteral &&
        keyTok.type !== TokenType.NumericLiteral
      ) {
        return this.state.error(
          'Invalid object binding pattern key; expected identifier, string, or number',
          keyTok,
        );
      }
      this.state.nextToken();

      const key: string | number = keyTok.type === TokenType.NumericLiteral
        ? (keyTok.value as number)
        : String(keyTok.value);

      const afterKey = this.state.peekToken();
      let valuePattern: BindingPattern;

      if (afterKey.type === TokenType.Colon) {
        const colon = this.state.nextToken();
        const parsedValuePattern = this.parseBindingPatternWithOptionalDefault();
        if (isParseFailure(parsedValuePattern)) {
          if (isParseCompanionFailure(parsedValuePattern)) {
            return this.companionBuilder.widenFailureToFrame(
              parsedValuePattern,
              ExpressionCompanionFrameKind.IteratorDeclaration,
              this.state.span(start, this.state.failurePreservedEnd(parsedValuePattern)),
              this.state.withOptionalPrefixRef(this.state.objectBindingPatternPrefixRef(start, properties, rest)),
            );
          }

          return this.companionBuilder.missingBindingDeclarationFailure(
            parsedValuePattern,
            colon,
            this.state.span(start, colon.end),
            this.state.withOptionalPrefixRef(this.state.objectBindingPatternPrefixRef(start, properties, rest)),
          );
        }
        valuePattern = parsedValuePattern;
      } else {
        if (keyTok.type !== TokenType.Identifier) {
          return this.state.error('Object binding pattern shorthand requires an identifier key', keyTok);
        }

        const shorthand = this.deps.bindingIdentifierFromToken(keyTok);
        if (isParseFailure(shorthand)) return shorthand;
        const parsedValuePattern = this.parseOptionalDefaultForShorthand(shorthand);
        if (isParseFailure(parsedValuePattern)) {
          if (isParseCompanionFailure(parsedValuePattern)) {
            return this.companionBuilder.widenFailureToFrame(
              parsedValuePattern,
              ExpressionCompanionFrameKind.IteratorDeclaration,
              this.state.span(start, this.state.failurePreservedEnd(parsedValuePattern)),
              this.state.withOptionalPrefixRef(this.state.objectBindingPatternPrefixRef(start, properties, rest)),
            );
          }
          return parsedValuePattern;
        }
        valuePattern = parsedValuePattern;
      }

      properties.push(new ObjectBindingPatternProperty(key, valuePattern));

      const sep = this.state.peekToken();
      if (sep.type === TokenType.Comma) {
        this.state.nextToken();
        const maybeClose = this.state.peekToken();
        if (maybeClose.type === TokenType.CloseBrace) {
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

      if (sep.type === TokenType.EOF || sep.type === TokenType.KeywordOf) {
        return this.companionBuilder.missingClosingDelimiterFailure(
          "Expected ',' or '}' in object binding pattern",
          sep,
          ExpressionCompanionFrameKind.IteratorDeclaration,
          ExpressionExpectedContinuationClass.CloseBrace,
          this.state.span(start, this.state.localEnd(valuePattern)),
          this.state.withOptionalPrefixRef(this.state.objectBindingPatternPrefixRef(start, properties, rest)),
        );
      }

      return this.state.error("Expected ',' or '}' in object binding pattern", sep);
    }

    return new ObjectBindingPattern(
      this.state.span(start, this.state.consumedEnd),
      properties,
      rest,
    );
  }

  private parseChainableRhs(): { expr: ParseOutcome<IsBindingBehavior> } & ParsedIteratorTailSplit {
    const core = this.deps.parseAssignExpr();
    if (isParseFailure(core)) {
      return {
        expr: core,
        semiIdx: -1,
        semicolonToken: null,
        rawTailText: '',
        tailSpan: null,
        unexpectedTrailingToken: false,
      };
    }

    const expr = this.deps.parseTails(core);
    if (isParseFailure(expr)) {
      return {
        expr,
        semiIdx: -1,
        semicolonToken: null,
        rawTailText: '',
        tailSpan: null,
        unexpectedTrailingToken: false,
      };
    }

    let semiIdx = -1;
    let semicolonToken: Token | null = null;
    let rawTailText = '';
    let tailSpan: SourceSpan | null = null;
    const t = this.state.peekToken();

    if (t.type === TokenType.Semicolon) {
      semiIdx = t.start;
      semicolonToken = t;
      this.state.nextToken();

      const rawTailStart = t.end;
      const afterSemi = this.state.peekToken();
      rawTailText = this.state.source.slice(rawTailStart);
      tailSpan = afterSemi.type === TokenType.EOF || rawTailText.length === 0
        ? null
        : this.state.span(rawTailStart, this.state.source.length);
      if (afterSemi.type === TokenType.EOF) {
        return {
          expr,
          semiIdx,
          semicolonToken,
          rawTailText,
          tailSpan,
          unexpectedTrailingToken: false,
        };
      }
    }

    const trailing = this.state.peekToken();
    if (semicolonToken == null && trailing.type !== TokenType.EOF) {
      return {
        expr: this.state.hardError(
          "Unexpected token after iterator iterable; expected ';' or end of header",
          trailing,
        ),
        semiIdx,
        semicolonToken,
        rawTailText,
        tailSpan,
        unexpectedTrailingToken: true,
      };
    }

    return {
      expr,
      semiIdx,
      semicolonToken,
      rawTailText,
      tailSpan,
      unexpectedTrailingToken: false,
    };
  }

  private iteratorDegradedPublication(
    message: string,
    blocked: Token,
    activeRegionKind: IteratorActiveRegionKind,
    frontierKind: ExpressionFrontierKind,
    expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[],
    preservedSpan: SourceSpan | null,
    declaration: BindingPattern | null,
    declarationClosedSubtreeRefs: readonly ClosedSubtreeRef[],
    ofSeparator: IteratorOfSeparatorState,
    iterable: CompletedInputPropertyLikeExpression | null,
    iterableClosedSubtreeRefs: readonly ClosedSubtreeRef[],
    gapDescriptors: readonly ExpressionGapDescriptor[],
    trailingSplit: IteratorTrailingSplitState | null,
  ): IteratorParseResult {
    return CompletedInputPublication.toIteratorResult(
      this.state.degradedFailure(
        message,
        blocked,
        frontierKind,
        expectedContinuationClasses,
        CompletedInputPublication.iteratorRegionToFrameKind(activeRegionKind),
        preservedSpan,
        [],
        [...gapDescriptors],
      ),
      activeRegionKind,
      declaration,
      declarationClosedSubtreeRefs,
      ofSeparator,
      iterable,
      iterableClosedSubtreeRefs,
      trailingSplit,
    );
  }

  private iteratorFrontierPublication(
    message: string,
    blocked: Token,
    activeRegionKind: IteratorActiveRegionKind,
    frontierKind: ExpressionFrontierKind,
    expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[],
    strongestStablePrefixSpan: SourceSpan | null,
    declarationClosedSubtreeRefs: readonly ClosedSubtreeRef[],
    ofSeparator: IteratorOfSeparatorState,
    iterable: CompletedInputPropertyLikeExpression | null,
    iterableClosedSubtreeRefs: readonly ClosedSubtreeRef[],
    trailingSplit: IteratorTrailingSplitState | null,
    declaration: BindingPattern | null = null,
  ): IteratorParseResult {
    return CompletedInputPublication.toIteratorResult(
      this.state.frontierOnlyFailure(
        message,
        blocked,
        frontierKind,
        expectedContinuationClasses,
        CompletedInputPublication.iteratorRegionToFrameKind(activeRegionKind),
        strongestStablePrefixSpan,
      ),
      activeRegionKind,
      declaration,
      declarationClosedSubtreeRefs,
      ofSeparator,
      iterable,
      iterableClosedSubtreeRefs,
      trailingSplit,
    );
  }

  private iteratorSeparatorAbsent(): IteratorOfSeparatorState {
    return new IteratorOfSeparatorState(
      IteratorOfSeparatorStateKind.Absent,
      null,
    );
  }

  private iteratorSeparatorPresent(token: Token): IteratorOfSeparatorState {
    return new IteratorOfSeparatorState(
      IteratorOfSeparatorStateKind.Present,
      this.state.spanFromToken(token),
    );
  }

  private iteratorTrailingSplit(
    semicolonToken: Token,
    kind: IteratorTrailingSplitKind,
    rawTailText: string,
    tailSpan: SourceSpan | null,
  ): IteratorTrailingSplitState {
    return new IteratorTrailingSplitState(
      kind,
      this.state.spanFromToken(semicolonToken),
      tailSpan,
      rawTailText,
    );
  }
}
