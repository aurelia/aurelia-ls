import type { SourceSpan } from '../source-address.js';
import type { BindingIdentifier } from './ast.js';
import type { CompletedInputExpressionNode } from './parse-result-algebra.js';
import {
  ClosedSubtreeRef,
  ExpressionCompanionFrameKind,
  ExpressionExpectedContinuationClass,
  ExpressionFrontierKind,
  ExpressionGapDescriptor,
  ExpressionGapKind,
  MatchedDelimiterEntry,
  MatchedDelimiterKind,
} from './parse-result-algebra.js';
import { ParseFailureInspector } from './parse-failure-inspection.js';
import {
  type ParseCompanionFailure,
  type ParseFailure,
} from './parse-failure.js';
import { CompletedInputParserState } from './completed-input-parser-state.js';
import type { Token } from './expression-scanner.js';

/**
 * Companion publication and frame-widening builder for completed-input parsing.
 *
 * `CompletedInputParser` and sibling corridors own grammar and cursor movement.
 * This class owns the parser-local law that turns hard or companion failures
 * into richer companion truth:
 * - gap descriptors
 * - frontier shaping
 * - frame widening
 * - local preserved-prefix provenance
 *
 * Keeping that here prevents the precedence pipeline from also becoming the
 * place where every family-specific recovery/publication rule accumulates.
 *
 * TODO: If template-specific or later family-specific companion shaping grows
 * a second axis beyond the current shared helpers, split those into narrower
 * family-local builders rather than letting this class become a replacement
 * monolith for the old parser lower half.
 */
export class CompletedInputCompanionBuilder {
  constructor(
    private readonly state: CompletedInputParserState,
  ) {}

  degradedFailure(
    message: string,
    blocked: Token,
    frontierKind: ExpressionFrontierKind,
    expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[],
    surroundingFrameKind: ExpressionCompanionFrameKind,
    preservedSpan: SourceSpan | null,
    closedSubtreeRefs: readonly ClosedSubtreeRef[],
    gapDescriptors: readonly ExpressionGapDescriptor[],
  ): ParseCompanionFailure {
    return this.state.degradedFailure(
      message,
      blocked,
      frontierKind,
      expectedContinuationClasses,
      surroundingFrameKind,
      preservedSpan,
      closedSubtreeRefs,
      gapDescriptors,
    );
  }

  degradedFailureAt(
    span: SourceSpan,
    message: string,
    text: string | null,
    frontierKind: ExpressionFrontierKind,
    expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[],
    surroundingFrameKind: ExpressionCompanionFrameKind,
    preservedSpan: SourceSpan | null,
    closedSubtreeRefs: readonly ClosedSubtreeRef[],
    gapDescriptors: readonly ExpressionGapDescriptor[],
    matchedDelimiterStack: readonly MatchedDelimiterEntry[],
  ): ParseCompanionFailure {
    return this.state.degradedFailureAt(
      span,
      message,
      text,
      frontierKind,
      expectedContinuationClasses,
      surroundingFrameKind,
      preservedSpan,
      closedSubtreeRefs,
      gapDescriptors,
      matchedDelimiterStack,
    );
  }

  frontierOnlyFailure(
    message: string,
    blocked: Token,
    frontierKind: ExpressionFrontierKind,
    expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[],
    surroundingFrameKind: ExpressionCompanionFrameKind,
    preservedSpan: SourceSpan | null,
    closedSubtreeRefs: readonly ClosedSubtreeRef[] = [],
  ): ParseCompanionFailure {
    return this.state.frontierOnlyFailure(
      message,
      blocked,
      frontierKind,
      expectedContinuationClasses,
      surroundingFrameKind,
      preservedSpan,
      closedSubtreeRefs,
    );
  }

  frontierOnlyFailureAt(
    span: SourceSpan,
    message: string,
    text: string | null,
    frontierKind: ExpressionFrontierKind,
    expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[],
    surroundingFrameKind: ExpressionCompanionFrameKind,
    preservedSpan: SourceSpan | null,
    matchedDelimiterStack: readonly MatchedDelimiterEntry[],
    closedSubtreeRefs: readonly ClosedSubtreeRef[] = [],
  ): ParseCompanionFailure {
    return this.state.frontierOnlyFailureAt(
      span,
      message,
      text,
      frontierKind,
      expectedContinuationClasses,
      surroundingFrameKind,
      preservedSpan,
      matchedDelimiterStack,
      closedSubtreeRefs,
    );
  }

  missingExpressionGapFailure(
    failure: ParseFailure,
    anchor: Token,
    surroundingFrameKind: ExpressionCompanionFrameKind,
    preservedSpan: SourceSpan,
    closedSubtreeRefs: readonly ClosedSubtreeRef[],
    expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[] = [ExpressionExpectedContinuationClass.Expression],
  ): ParseCompanionFailure {
    return this.degradedFailure(
      failure.message,
      this.state.peekToken(),
      ParseFailureInspector.frontierKind(failure, ExpressionFrontierKind.AwaitingExpression),
      ParseFailureInspector.expectedContinuationClasses(failure, expectedContinuationClasses),
      surroundingFrameKind,
      preservedSpan,
      [
        ...closedSubtreeRefs,
        ...ParseFailureInspector.closedSubtreeRefs(failure),
      ],
      [
        this.state.gapDescriptor(
          ExpressionGapKind.MissingExpression,
          this.state.spanFromToken(anchor),
          surroundingFrameKind,
          expectedContinuationClasses,
        ),
        ...ParseFailureInspector.gapDescriptors(failure),
      ],
    );
  }

  missingBindingDeclarationFailure(
    failure: ParseFailure,
    anchor: Token,
    preservedSpan: SourceSpan,
    closedSubtreeRefs: readonly ClosedSubtreeRef[],
  ): ParseCompanionFailure {
    return this.degradedFailure(
      failure.message,
      this.state.peekToken(),
      ParseFailureInspector.frontierKind(failure, ExpressionFrontierKind.AwaitingBindingDeclaration),
      ParseFailureInspector.expectedContinuationClasses(failure, [ExpressionExpectedContinuationClass.BindingDeclaration]),
      ExpressionCompanionFrameKind.IteratorDeclaration,
      preservedSpan,
      [
        ...closedSubtreeRefs,
        ...ParseFailureInspector.closedSubtreeRefs(failure),
      ],
      [
        this.state.gapDescriptor(
          ExpressionGapKind.MissingBindingDeclaration,
          this.state.spanFromToken(anchor),
          ExpressionCompanionFrameKind.IteratorDeclaration,
          [ExpressionExpectedContinuationClass.BindingDeclaration],
        ),
        ...ParseFailureInspector.gapDescriptors(failure),
      ],
    );
  }

  missingArrowParameterFailure(
    message: string,
    blocked: Token,
    anchor: Token,
    start: number,
    params: readonly BindingIdentifier[],
  ): ParseCompanionFailure {
    return this.degradedFailure(
      message,
      blocked,
      ExpressionFrontierKind.AwaitingBindingDeclaration,
      [ExpressionExpectedContinuationClass.BindingDeclaration],
      ExpressionCompanionFrameKind.ArrowParameterList,
      this.state.span(start, anchor.end),
      this.arrowParameterRefs(params),
      [
        this.state.gapDescriptor(
          ExpressionGapKind.MissingBindingDeclaration,
          this.state.spanFromToken(anchor),
          ExpressionCompanionFrameKind.ArrowParameterList,
          [ExpressionExpectedContinuationClass.BindingDeclaration],
        ),
      ],
    );
  }

  missingArrowSeparatorFailure(
    openParen: Token,
    closeParen: Token,
    params: readonly BindingIdentifier[],
  ): ParseCompanionFailure {
    const closeSpan = this.state.spanFromToken(closeParen);
    return this.degradedFailureAt(
      closeSpan,
      "Expected '=>' after arrow parameter list",
      null,
      ExpressionFrontierKind.AwaitingSeparator,
      [ExpressionExpectedContinuationClass.ArrowToken],
      ExpressionCompanionFrameKind.ArrowParameterList,
      this.state.span(openParen.start, closeParen.end),
      this.arrowParameterRefs(params),
      [
        this.state.gapDescriptor(
          ExpressionGapKind.MissingArrowSeparator,
          closeSpan,
          ExpressionCompanionFrameKind.ArrowParameterList,
          [ExpressionExpectedContinuationClass.ArrowToken],
        ),
      ],
      [
        new MatchedDelimiterEntry(
          MatchedDelimiterKind.Paren,
          this.state.spanFromToken(openParen),
          closeSpan,
        ),
      ],
    );
  }

  missingCallArgumentFailure(
    failure: ParseFailure,
    anchor: Token,
    preservedSpan: SourceSpan,
    closedSubtreeRefs: readonly ClosedSubtreeRef[],
  ): ParseCompanionFailure {
    return this.degradedFailure(
      failure.message,
      this.state.peekToken(),
      ParseFailureInspector.frontierKind(failure, ExpressionFrontierKind.AwaitingExpression),
      ParseFailureInspector.expectedContinuationClasses(failure, [ExpressionExpectedContinuationClass.Expression]),
      ExpressionCompanionFrameKind.CallArguments,
      preservedSpan,
      [
        ...closedSubtreeRefs,
        ...ParseFailureInspector.closedSubtreeRefs(failure),
      ],
      [
        this.state.gapDescriptor(
          ExpressionGapKind.MissingCallArgument,
          this.state.spanFromToken(anchor),
          ExpressionCompanionFrameKind.CallArguments,
          [ExpressionExpectedContinuationClass.Expression],
        ),
        ...ParseFailureInspector.gapDescriptors(failure),
      ],
    );
  }

  missingMemberNameFailure(
    message: string,
    blocked: Token,
    anchor: Token,
    receiver: CompletedInputExpressionNode,
  ): ParseCompanionFailure {
    return this.degradedFailure(
      message,
      blocked,
      ExpressionFrontierKind.AwaitingMemberName,
      [ExpressionExpectedContinuationClass.MemberName],
      ExpressionCompanionFrameKind.MemberAccess,
      this.state.span(this.state.localStart(receiver), anchor.end),
      [this.state.rootPrefix(receiver)],
      [
        this.state.gapDescriptor(
          ExpressionGapKind.MissingMemberName,
          this.state.spanFromToken(anchor),
          ExpressionCompanionFrameKind.MemberAccess,
          [ExpressionExpectedContinuationClass.MemberName],
        ),
      ],
    );
  }

  optionalChainContinuationFailure(
    message: string,
    blocked: Token,
    anchor: Token,
    receiver: CompletedInputExpressionNode,
  ): ParseCompanionFailure {
    return this.frontierOnlyFailure(
      message,
      blocked,
      ExpressionFrontierKind.AwaitingChainSegment,
      [
        ExpressionExpectedContinuationClass.MemberName,
        ExpressionExpectedContinuationClass.OpenBracket,
        ExpressionExpectedContinuationClass.OpenParen,
      ],
      ExpressionCompanionFrameKind.OptionalChain,
      this.state.span(this.state.localStart(receiver), anchor.end),
      [this.state.rootPrefix(receiver)],
    );
  }

  scopePathContinuationFailure(
    message: string,
    blocked: Token,
    anchor: Token,
    receiver: CompletedInputExpressionNode,
  ): ParseCompanionFailure {
    return this.frontierOnlyFailure(
      message,
      blocked,
      ExpressionFrontierKind.AwaitingChainSegment,
      [
        ExpressionExpectedContinuationClass.MemberName,
        ExpressionExpectedContinuationClass.ParentScopeKeyword,
      ],
      ExpressionCompanionFrameKind.ScopePath,
      this.state.span(this.state.localStart(receiver), anchor.end),
      [this.state.rootPrefix(receiver)],
    );
  }

  missingTailNameFailure(
    message: string,
    blocked: Token,
    anchor: Token,
    receiver: CompletedInputExpressionNode,
    surroundingFrameKind: ExpressionCompanionFrameKind.ValueConverterTail | ExpressionCompanionFrameKind.BindingBehaviorTail,
    expectedName: ExpressionExpectedContinuationClass.ValueConverterName | ExpressionExpectedContinuationClass.BindingBehaviorName,
  ): ParseCompanionFailure {
    return this.degradedFailure(
      message,
      blocked,
      ExpressionFrontierKind.AwaitingTailSegment,
      [expectedName],
      surroundingFrameKind,
      this.state.span(this.state.localStart(receiver), anchor.end),
      [this.state.rootPrefix(receiver)],
      [
        this.state.gapDescriptor(
          ExpressionGapKind.MissingTailName,
          this.state.spanFromToken(anchor),
          surroundingFrameKind,
          [expectedName],
        ),
      ],
    );
  }

  missingTernaryArmFailure(
    failure: ParseFailure,
    anchor: Token,
    preservedSpan: SourceSpan,
    closedSubtreeRefs: readonly ClosedSubtreeRef[],
  ): ParseCompanionFailure {
    return this.degradedFailure(
      failure.message,
      this.state.peekToken(),
      ParseFailureInspector.frontierKind(failure, ExpressionFrontierKind.AwaitingExpression),
      ParseFailureInspector.expectedContinuationClasses(failure, [ExpressionExpectedContinuationClass.Expression]),
      ExpressionCompanionFrameKind.ConditionalExpression,
      preservedSpan,
      [
        ...closedSubtreeRefs,
        ...ParseFailureInspector.closedSubtreeRefs(failure),
      ],
      [
        this.state.gapDescriptor(
          ExpressionGapKind.MissingTernaryArm,
          this.state.spanFromToken(anchor),
          ExpressionCompanionFrameKind.ConditionalExpression,
          [ExpressionExpectedContinuationClass.Expression],
        ),
        ...ParseFailureInspector.gapDescriptors(failure),
      ],
    );
  }

  missingClosingDelimiterFailure(
    message: string,
    blocked: Token,
    surroundingFrameKind: ExpressionCompanionFrameKind,
    expectedDelimiter: ExpressionExpectedContinuationClass,
    preservedSpan: SourceSpan,
    closedSubtreeRefs: readonly ClosedSubtreeRef[],
  ): ParseCompanionFailure {
    return this.degradedFailure(
      message,
      blocked,
      ExpressionFrontierKind.AwaitingClosingDelimiter,
      [expectedDelimiter],
      surroundingFrameKind,
      preservedSpan,
      closedSubtreeRefs,
      [
        this.state.gapDescriptor(
          ExpressionGapKind.MissingClosingDelimiter,
          this.state.tokenSpan(blocked),
          surroundingFrameKind,
          [expectedDelimiter],
        ),
      ],
    );
  }

  missingObjectValueSeparatorFailure(
    message: string,
    blocked: Token,
    keyToken: Token,
    preservedSpan: SourceSpan,
    closedSubtreeRefs: readonly ClosedSubtreeRef[],
  ): ParseCompanionFailure {
    return this.degradedFailure(
      message,
      blocked,
      ExpressionFrontierKind.AwaitingSeparator,
      [ExpressionExpectedContinuationClass.Colon],
      ExpressionCompanionFrameKind.ObjectLiteral,
      preservedSpan,
      closedSubtreeRefs,
      [
        this.state.gapDescriptor(
          ExpressionGapKind.MissingObjectValueSeparator,
          this.state.spanFromToken(keyToken),
          ExpressionCompanionFrameKind.ObjectLiteral,
          [ExpressionExpectedContinuationClass.Colon],
        ),
      ],
    );
  }

  widenFailureToFrame(
    failure: ParseCompanionFailure,
    surroundingFrameKind: ExpressionCompanionFrameKind,
    preservedSpan: SourceSpan,
    leadingClosedSubtreeRefs: readonly ClosedSubtreeRef[],
  ): ParseCompanionFailure {
    return failure.withCompanion(
      failure.companion.withFrame(
        surroundingFrameKind,
        preservedSpan,
        leadingClosedSubtreeRefs,
      ),
    );
  }

  widenCallArgumentsFailure(
    failure: ParseCompanionFailure,
    callee: CompletedInputExpressionNode,
  ): ParseCompanionFailure {
    const preservedSpan = failure.companion.preservedSpan
      ? this.state.span(this.state.localStart(callee), this.state.toLocal(failure.companion.preservedSpan.end))
      : callee.span;
    return this.widenFailureToFrame(
      failure,
      ExpressionCompanionFrameKind.CallArguments,
      preservedSpan,
      [this.state.rootPrefix(callee)],
    );
  }

  widenNewExpressionFailure(
    failure: ParseCompanionFailure,
    newKeyword: Token,
    leadingClosedSubtreeRefs: readonly ClosedSubtreeRef[] = [],
  ): ParseCompanionFailure {
    return this.widenFailureToFrame(
      failure,
      ExpressionCompanionFrameKind.NewExpression,
      this.state.span(newKeyword.start, this.state.failurePreservedEnd(failure)),
      leadingClosedSubtreeRefs,
    );
  }

  widenArrowFunctionFailure(
    failure: ParseCompanionFailure,
    start: number,
    leadingClosedSubtreeRefs: readonly ClosedSubtreeRef[],
  ): ParseCompanionFailure {
    return this.widenFailureToFrame(
      failure,
      ExpressionCompanionFrameKind.ArrowFunction,
      this.state.span(start, this.state.failurePreservedEnd(failure)),
      leadingClosedSubtreeRefs,
    );
  }

  arrowParameterRefs(
    params: readonly BindingIdentifier[],
  ): readonly ClosedSubtreeRef[] {
    return params.map((param, index) => (
      index === 0
        ? this.state.rootPrefix(param)
        : this.state.siblingRef(param)
    ));
  }
}
