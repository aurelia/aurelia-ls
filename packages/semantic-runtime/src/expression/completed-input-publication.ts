import type { BindingPattern } from './ast.js';
import {
  CompleteInputParseError,
  ExpressionCompanionFrameKind,
  ExpressionParseResultKind,
  IteratorActiveRegionKind,
  IteratorDegradedPublication,
  IteratorFrontierPublication,
  PropertyLikeDegradedPublication,
  PropertyLikeFrontierPublication,
} from './parse-result-algebra.js';
import type {
  CompletedInputPropertyLikeExpression,
  IteratorParseResult,
  IteratorTrailingSplitState,
  IteratorOfSeparatorState,
  PropertyLikeEntryFamily,
  PropertyLikeParseResult,
} from './parse-result-algebra.js';

import {
  ParseCompanionPublicationKind,
} from './parse-companion-state.js';
import {
  isParseCompanionFailure,
} from './parse-failure.js';
import type {
  ParseFailure,
} from './parse-failure.js';
import type { ClosedSubtreeRef } from './parse-result-algebra.js';

/**
 * Family-native publication law for completed-input parsing.
 *
 * `CompletedInputParser` owns grammar and parser-local failure construction.
 * This class owns the final lift from parser-local failures into the public
 * result algebra for property-like and iterator entry families.
 *
 * TODO: If property-like and iterator publication keep diverging, split this
 * into family-local publishers rather than letting one internal class become
 * another monolith beside the grammar core.
 */
export class CompletedInputPublication {
  static toPropertyLikeResult(
    entryFamily: PropertyLikeEntryFamily,
    failure: ParseFailure,
  ): PropertyLikeParseResult {
    if (!isParseCompanionFailure(failure)) {
      return this.toParseError(entryFamily, failure);
    }

    switch (failure.companion.publicationKind) {
      case ParseCompanionPublicationKind.DegradedCarrier:
        return new PropertyLikeDegradedPublication(
          entryFamily,
          failure.span,
          ExpressionParseResultKind.ExpressionSuccess,
          failure.companion.frontierKind,
          failure.companion.expectedContinuationClasses,
          failure.companion.matchedDelimiterStack,
          failure.companion.surroundingFrameKind,
          failure.companion.preservedSpan,
          failure.companion.closedSubtreeRefs,
          failure.companion.gapDescriptors,
          failure.frameworkErrorCode,
          failure.message,
        );
      case ParseCompanionPublicationKind.FrontierOnly:
        return new PropertyLikeFrontierPublication(
          entryFamily,
          failure.span,
          ExpressionParseResultKind.ExpressionSuccess,
          failure.companion.frontierKind,
          failure.companion.expectedContinuationClasses,
          failure.companion.matchedDelimiterStack,
          failure.companion.surroundingFrameKind,
          failure.companion.preservedSpan,
          failure.companion.closedSubtreeRefs,
          failure.frameworkErrorCode,
          failure.message,
        );
    }
  }

  static toIteratorResult(
    failure: ParseFailure,
    activeRegionKind: IteratorActiveRegionKind,
    declaration: BindingPattern | null,
    declarationClosedSubtreeRefs: readonly ClosedSubtreeRef[],
    ofSeparator: IteratorOfSeparatorState,
    iterable: CompletedInputPropertyLikeExpression | null,
    iterableClosedSubtreeRefs: readonly ClosedSubtreeRef[],
    trailingSplit: IteratorTrailingSplitState | null,
  ): IteratorParseResult {
    if (!isParseCompanionFailure(failure)) {
      return this.toParseError('IsIterator', failure);
    }

    switch (failure.companion.publicationKind) {
      case ParseCompanionPublicationKind.DegradedCarrier:
        return new IteratorDegradedPublication(
          failure.span,
          activeRegionKind,
          failure.companion.frontierKind,
          failure.companion.expectedContinuationClasses,
          failure.companion.matchedDelimiterStack,
          failure.companion.preservedSpan,
          declaration,
          declarationClosedSubtreeRefs,
          ofSeparator,
          iterable,
          iterableClosedSubtreeRefs,
          failure.companion.gapDescriptors,
          trailingSplit,
          failure.frameworkErrorCode,
          failure.message,
        );
      case ParseCompanionPublicationKind.FrontierOnly:
        return new IteratorFrontierPublication(
          failure.span,
          activeRegionKind,
          failure.companion.frontierKind,
          failure.companion.expectedContinuationClasses,
          failure.companion.matchedDelimiterStack,
          failure.companion.preservedSpan,
          declaration,
          declarationClosedSubtreeRefs,
          ofSeparator,
          iterable,
          iterableClosedSubtreeRefs,
          trailingSplit,
          failure.frameworkErrorCode,
          failure.message,
        );
    }
  }

  static toParseError(
    entryFamily: PropertyLikeEntryFamily | 'IsIterator',
    failure: ParseFailure,
  ): CompleteInputParseError {
    return new CompleteInputParseError(
      entryFamily,
      failure.span,
      failure.message,
      failure.text,
      failure.frameworkErrorCode,
    );
  }

  static iteratorRegionToFrameKind(
    activeRegionKind: IteratorActiveRegionKind,
  ): ExpressionCompanionFrameKind {
    switch (activeRegionKind) {
      case IteratorActiveRegionKind.Declaration:
        return ExpressionCompanionFrameKind.IteratorDeclaration;
      case IteratorActiveRegionKind.Separator:
        return ExpressionCompanionFrameKind.IteratorHeader;
      case IteratorActiveRegionKind.Iterable:
        return ExpressionCompanionFrameKind.IteratorIterable;
      case IteratorActiveRegionKind.TrailingSplit:
        return ExpressionCompanionFrameKind.IteratorTrailingSplit;
      default:
        return ExpressionCompanionFrameKind.IteratorHeader;
    }
  }
}
