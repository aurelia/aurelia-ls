import type { ExpressionType } from './ast.js';
import type { ExpressionParseContext } from './expression-parse-support.js';

/**
 * Caller-level ownership/arbitration request for the expression parser.
 *
 * This stays separate from the parse result algebra:
 * - selection/request is caller-owned policy
 * - parse result is parser-owned publication
 *
 * Keeping both explicit prevents `parse(...)` from silently accumulating every
 * ownership policy branch once binding/instruction integration starts routing
 * more authored sites through the parser.
 */
export enum ExpressionParseSelectionKind {
  SelectedEntryFamily = 1,
  NoParse = 2,
}

export class SelectedExpressionEntryFamily {
  readonly kind = ExpressionParseSelectionKind.SelectedEntryFamily;
  readonly secondaryGrammarOwner: string | null;

  constructor(
    readonly entryFamily: ExpressionType,
    secondaryGrammarOwner: string | null = null,
  ) {
    this.secondaryGrammarOwner = entryFamily === 'IsCustom'
      ? secondaryGrammarOwner
      : null;
  }

  static property(): SelectedExpressionEntryFamily {
    return new SelectedExpressionEntryFamily('IsProperty');
  }

  static func(): SelectedExpressionEntryFamily {
    return new SelectedExpressionEntryFamily('IsFunction');
  }

  static iterator(): SelectedExpressionEntryFamily {
    return new SelectedExpressionEntryFamily('IsIterator');
  }

  static interpolation(): SelectedExpressionEntryFamily {
    return new SelectedExpressionEntryFamily('Interpolation');
  }

  static custom(secondaryGrammarOwner: string | null = null): SelectedExpressionEntryFamily {
    return new SelectedExpressionEntryFamily('IsCustom', secondaryGrammarOwner);
  }
}

// TODO: If caller-level arbitration later needs inferred-family candidates or
// ranked ownership choices, add new selection classes here instead of
// widening `SelectedExpressionEntryFamily` with more ad-hoc flags.

export class NoParseSelection {
  readonly kind = ExpressionParseSelectionKind.NoParse;
  readonly secondaryGrammarOwner: string | null;

  constructor(
    readonly entryFamily: ExpressionType,
    readonly reason:
      | 'caller-short-circuit'
      | 'entry-family-not-selected'
      | 'secondary-grammar-transfer',
    secondaryGrammarOwner: string | null = null,
  ) {
    this.secondaryGrammarOwner = reason === 'secondary-grammar-transfer'
      ? secondaryGrammarOwner
      : null;
  }

  static callerShortCircuit(entryFamily: ExpressionType): NoParseSelection {
    return new NoParseSelection(entryFamily, 'caller-short-circuit');
  }

  static entryFamilyNotSelected(entryFamily: ExpressionType): NoParseSelection {
    return new NoParseSelection(entryFamily, 'entry-family-not-selected');
  }

  static secondaryGrammarTransfer(
    entryFamily: ExpressionType,
    secondaryGrammarOwner: string,
  ): NoParseSelection {
    return new NoParseSelection(
      entryFamily,
      'secondary-grammar-transfer',
      secondaryGrammarOwner,
    );
  }
}

// TODO: If later tooling needs to explain why ownership was declined beyond
// the current three stable reasons, add new decline-selection carriers rather
// than growing another stringly reason taxonomy around call sites.

export type ExpressionParseSelection =
  | SelectedExpressionEntryFamily
  | NoParseSelection;

export class ExpressionParseRequest {
  constructor(
    readonly expression: string,
    readonly selection: ExpressionParseSelection,
    readonly context?: ExpressionParseContext,
  ) {}

  static selected(
    expression: string,
    selection: SelectedExpressionEntryFamily,
    context?: ExpressionParseContext,
  ): ExpressionParseRequest {
    return new ExpressionParseRequest(expression, selection, context);
  }

  static noParse(
    expression: string,
    selection: NoParseSelection,
    context?: ExpressionParseContext,
  ): ExpressionParseRequest {
    return new ExpressionParseRequest(expression, selection, context);
  }
}
