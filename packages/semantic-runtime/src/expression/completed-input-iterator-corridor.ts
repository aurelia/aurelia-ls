import { TokenType, type Token } from './expression-scanner.js';
import {
  ForOfStatement,
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
} from './parse-result-algebra.js';
import type {
  CompletedInputPropertyLikeExpression,
  IteratorParseResult,
} from './parse-result-algebra.js';
import { CompletedInputPublication } from './completed-input-publication.js';
import {
  CompletedInputBindingPatternCorridor,
  type CompletedInputBindingPatternCorridorDependencies,
} from './completed-input-binding-pattern-corridor.js';
import { CompletedInputParserState } from './completed-input-parser-state.js';
import { ParseFailureInspector } from './parse-failure-inspection.js';
import {
  isParseCompanionFailure,
  isParseFailure,
  type ParseFailure,
  type ParseOutcome,
} from './parse-failure.js';
import { ExpressionFrameworkErrorCode } from './framework-error-code.js';

interface ParsedIteratorTailSplit {
  readonly semiIdx: number;
  readonly semicolonToken: Token | null;
  readonly rawTailText: string;
  readonly tailSpan: SourceSpan | null;
  readonly unexpectedTrailingToken: boolean;
}

interface CompletedInputIteratorCorridorDependencies {
  readonly state: CompletedInputParserState;
  readonly companionBuilder: CompletedInputBindingPatternCorridorDependencies['companionBuilder'];
  readonly parseAssignExpr: () => ParseOutcome<IsAssign>;
  readonly parseTails: (core: IsAssign) => ParseOutcome<IsBindingBehavior>;
  readonly bindingIdentifierFromToken: CompletedInputBindingPatternCorridorDependencies['bindingIdentifierFromToken'];
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
  private readonly bindingPattern: CompletedInputBindingPatternCorridor;

  constructor(
    private readonly deps: CompletedInputIteratorCorridorDependencies,
  ) {
    this.state = deps.state;
    this.bindingPattern = new CompletedInputBindingPatternCorridor({
      state: deps.state,
      companionBuilder: deps.companionBuilder,
      parseAssignExpr: deps.parseAssignExpr,
      bindingIdentifierFromToken: deps.bindingIdentifierFromToken,
    });
  }

  parseHeader(): IteratorParseResult {
    const opening = this.iteratorOpeningPublication();
    if (opening != null) {
      return opening;
    }

    const declaration = this.bindingPattern.parseLhsBinding();
    if (isParseFailure(declaration)) {
      return this.iteratorDeclarationFailurePublication(declaration);
    }
    return this.parseHeaderAfterDeclaration(declaration);
  }

  private iteratorOpeningPublication(): IteratorParseResult | null {
    const first = this.state.peekToken();
    if (first.type === TokenType.EOF) {
      return this.iteratorDeclarationFrontier('Expected iterator declaration', first);
    }
    if (this.canStartIteratorDeclaration(first)) {
      return null;
    }
    if (first.type === TokenType.KeywordOf) {
      return this.iteratorDeclarationFrontier("Expected iterator declaration before 'of' in iterator header", first);
    }
    return CompletedInputPublication.toParseError(
      'IsIterator',
      this.state.failures.error(
        'Invalid repeat.for left-hand side; expected identifier, array pattern, or object pattern',
        first,
        ExpressionFrameworkErrorCode.ParseInvalidIdentifierInForOf,
      ),
    );
  }

  private canStartIteratorDeclaration(token: Token): boolean {
    return token.type === TokenType.Identifier
      || token.type === TokenType.OpenBracket
      || token.type === TokenType.OpenBrace;
  }

  private iteratorDeclarationFrontier(
    message: string,
    token: Token,
  ): IteratorParseResult {
    return this.iteratorFrontierPublication(
      message,
      token,
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

  private iteratorDeclarationFailurePublication(
    declaration: ParseFailure,
  ): IteratorParseResult {
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

  private parseHeaderAfterDeclaration(
    declaration: BindingPattern,
  ): IteratorParseResult {
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
          this.state.failures.gapDescriptor(
            ExpressionGapKind.MissingIteratorOf,
            this.state.spanFromToken(ofTok),
            ExpressionCompanionFrameKind.IteratorHeader,
            [ExpressionExpectedContinuationClass.Of],
          ),
        ],
        null,
        ExpressionFrameworkErrorCode.ParseInvalidIdentifierInForOf,
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
      return this.iteratorIterableFailurePublication(
        iterable,
        declaration,
        ofTok,
        ofSeparator,
        unexpectedTrailingToken,
      );
    }

    if (semicolonToken && rawTailText.length === 0) {
      return this.iteratorEmptyTrailingSplitPublication(declaration, ofSeparator, iterable, semicolonToken);
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

    if (this.state.failures.retainedFailure) {
      return CompletedInputPublication.toParseError('IsIterator', this.state.failures.retainedFailure);
    }

    return new IteratorSuccess(node.span, node, trailingSplit);
  }

  private iteratorIterableFailurePublication(
    iterable: ParseFailure,
    declaration: BindingPattern,
    ofTok: Token,
    ofSeparator: IteratorOfSeparatorState,
    unexpectedTrailingToken: boolean,
  ): IteratorParseResult {
    if (unexpectedTrailingToken) {
      return CompletedInputPublication.toParseError('IsIterator', iterable);
    }

    const iteratorIterableFailure = isParseCompanionFailure(iterable)
      ? iterable
      : this.state.failures.degradedFailure(
          iterable.message,
          this.state.peekToken(),
          ExpressionFrontierKind.AwaitingExpression,
          [ExpressionExpectedContinuationClass.Expression],
          ExpressionCompanionFrameKind.IteratorIterable,
          this.state.span(this.state.localStart(declaration), ofTok.end),
          [],
          [
            this.state.failures.gapDescriptor(
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

  private iteratorEmptyTrailingSplitPublication(
    declaration: BindingPattern,
    ofSeparator: IteratorOfSeparatorState,
    iterable: IsBindingBehavior,
    semicolonToken: Token,
  ): IteratorParseResult {
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
        this.state.failures.gapDescriptor(
          ExpressionGapKind.MissingIteratorTailSegment,
          this.state.spanFromToken(semicolonToken),
          ExpressionCompanionFrameKind.IteratorTrailingSplit,
          [ExpressionExpectedContinuationClass.IteratorTailSegment],
        ),
      ],
      trailingSplit,
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
        expr: this.state.failures.hardError(
          "Unexpected token after iterator iterable; expected ';' or end of header",
          trailing,
          trailing.type === TokenType.KeywordOf
            ? ExpressionFrameworkErrorCode.ParseUnexpectedKeywordOf
            : null,
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
    frameworkErrorCode: string | null = null,
  ): IteratorParseResult {
    return CompletedInputPublication.toIteratorResult(
      this.state.failures.degradedFailure(
        message,
        blocked,
        frontierKind,
        expectedContinuationClasses,
        CompletedInputPublication.iteratorRegionToFrameKind(activeRegionKind),
        preservedSpan,
        [],
        [...gapDescriptors],
        frameworkErrorCode,
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
      this.state.failures.frontierOnlyFailure(
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
