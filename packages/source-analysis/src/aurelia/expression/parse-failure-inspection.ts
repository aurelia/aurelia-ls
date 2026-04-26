import {
  isParseCompanionFailure,
} from './parse-failure.js';
import type {
  ParseCompanionFailure,
  ParseFailure,
} from './parse-failure.js';
import type { ClosedSubtreeRef, ExpressionExpectedContinuationClass, ExpressionFrontierKind, ExpressionGapDescriptor } from './parse-result-algebra.js';
import type { SourceSpan } from '../source-address.js';

/**
 * Parser-local inspection helpers over retained failure state.
 *
 * Keep these internal to the parser subsystem. They are about parser-owned
 * companion truth, not about the public result algebra.
 */
export class ParseFailureInspector {
  static companion(failure: ParseFailure): ParseCompanionFailure | null {
    return isParseCompanionFailure(failure) ? failure : null;
  }

  static frontierKind(
    failure: ParseFailure,
    fallback: ExpressionFrontierKind,
  ): ExpressionFrontierKind {
    return this.companion(failure)?.companion.frontierKind ?? fallback;
  }

  static expectedContinuationClasses(
    failure: ParseFailure,
    fallback: readonly ExpressionExpectedContinuationClass[],
  ): readonly ExpressionExpectedContinuationClass[] {
    const expected = this.companion(failure)?.companion.expectedContinuationClasses ?? [];
    return expected.length > 0 ? expected : fallback;
  }

  static closedSubtreeRefs(
    failure: ParseFailure,
  ): readonly ClosedSubtreeRef[] {
    return this.companion(failure)?.companion.closedSubtreeRefs ?? [];
  }

  static gapDescriptors(
    failure: ParseFailure,
  ): readonly ExpressionGapDescriptor[] {
    return this.companion(failure)?.companion.gapDescriptors ?? [];
  }

  static preservedSpan(
    failure: ParseFailure,
  ): SourceSpan | null {
    return this.companion(failure)?.companion.preservedSpan ?? null;
  }
}
