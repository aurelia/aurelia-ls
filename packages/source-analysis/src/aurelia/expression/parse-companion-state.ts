import type { SourceSpan } from './ast.js';
import {
  ClosedSubtreeRef,
  ExpressionCompanionFrameKind,
  ExpressionExpectedContinuationClass,
  ExpressionFrontierKind,
  ExpressionGapDescriptor,
  MatchedDelimiterEntry,
} from './parse-result-algebra.js';

export enum ParseCompanionPublicationKind {
  DegradedCarrier = 1,
  FrontierOnly = 2,
}

export interface ParseCompanionStateInit {
  readonly frontierKind: ExpressionFrontierKind;
  readonly expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[];
  readonly matchedDelimiterStack: readonly MatchedDelimiterEntry[];
  readonly surroundingFrameKind: ExpressionCompanionFrameKind | null;
  readonly preservedSpan: SourceSpan | null;
  readonly closedSubtreeRefs?: readonly ClosedSubtreeRef[];
  readonly gapDescriptors?: readonly ExpressionGapDescriptor[];
}

/**
 * Parser-local companion publication state.
 *
 * This remains deliberately internal to the expression parser subsystem:
 * - strict completed-input AST stays canonical
 * - partial/frontier truth travels through the grammar core here
 * - public publication still happens through result-algebra classes only
 *
 * TODO: If we later add interpolation scanner residue that sits outside the
 * ordered active/suppressed hole carriers, or a structured iterator-tail
 * carrier, revisit whether this wants one more split between generic frontier
 * metadata and family-specific local scan state.
 */
export class ParseCompanionState {
  constructor(
    readonly publicationKind: ParseCompanionPublicationKind,
    readonly frontierKind: ExpressionFrontierKind,
    readonly expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[],
    readonly matchedDelimiterStack: readonly MatchedDelimiterEntry[],
    readonly surroundingFrameKind: ExpressionCompanionFrameKind | null,
    readonly preservedSpan: SourceSpan | null,
    readonly closedSubtreeRefs: readonly ClosedSubtreeRef[] = [],
    readonly gapDescriptors: readonly ExpressionGapDescriptor[] = [],
  ) {}

  static degraded(init: ParseCompanionStateInit): ParseCompanionState {
    return new ParseCompanionState(
      ParseCompanionPublicationKind.DegradedCarrier,
      init.frontierKind,
      init.expectedContinuationClasses,
      init.matchedDelimiterStack,
      init.surroundingFrameKind,
      init.preservedSpan,
      init.closedSubtreeRefs ?? [],
      init.gapDescriptors ?? [],
    );
  }

  static frontierOnly(init: ParseCompanionStateInit): ParseCompanionState {
    return new ParseCompanionState(
      ParseCompanionPublicationKind.FrontierOnly,
      init.frontierKind,
      init.expectedContinuationClasses,
      init.matchedDelimiterStack,
      init.surroundingFrameKind,
      init.preservedSpan,
      init.closedSubtreeRefs ?? [],
      init.gapDescriptors ?? [],
    );
  }

  withFrame(
    surroundingFrameKind: ExpressionCompanionFrameKind,
    preservedSpan: SourceSpan,
    leadingClosedSubtreeRefs: readonly ClosedSubtreeRef[],
  ): ParseCompanionState {
    // TODO: Outer-frame widening currently preserves any inner `root-prefix`
    // refs as-is. If later spend needs refs normalized relative to the widened
    // outer frame, add a dedicated lifted-subtree carrier instead of mutating
    // the existing relation tags heuristically here.
    return new ParseCompanionState(
      this.publicationKind,
      this.frontierKind,
      this.expectedContinuationClasses,
      this.matchedDelimiterStack,
      surroundingFrameKind,
      preservedSpan,
      [
        ...leadingClosedSubtreeRefs,
        ...this.closedSubtreeRefs,
      ],
      this.gapDescriptors,
    );
  }

  prependMatchedDelimiters(
    leadingEntries: readonly MatchedDelimiterEntry[],
  ): ParseCompanionState {
    if (leadingEntries.length === 0) {
      return this;
    }

    // TODO: This currently only prepends structural delimiter witnesses. If a
    // later family needs delimiter ownership or nesting reasons preserved
    // across widening, add that to a richer companion-state facet instead of
    // letting this generic helper grow family-local semantics.
    return new ParseCompanionState(
      this.publicationKind,
      this.frontierKind,
      this.expectedContinuationClasses,
      [
        ...leadingEntries,
        ...this.matchedDelimiterStack,
      ],
      this.surroundingFrameKind,
      this.preservedSpan,
      this.closedSubtreeRefs,
      this.gapDescriptors,
    );
  }
}
