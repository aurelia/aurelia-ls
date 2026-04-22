import type { ExpressionType } from './ast.js';
import {
  ExpressionParseResultFlags,
  ExpressionParseResultKind,
  hasExpressionParseResultKindFlag,
} from './parse-result-algebra.js';
import type {
  CompanionExpressionParseResult,
  CompleteInputParseError,
  CompletedExpressionParseResult,
  CustomParseResult,
  EmptyExpressionSuccess,
  ExpressionSuccess,
  ExpressionParseResult,
  InterpolationSuccess,
  InterpolationParseResult,
  IteratorSuccess,
  IteratorParseResult,
  NonOwningExpressionParseResult,
  OpaqueSuccess,
  PropertyLikeParseResult,
} from './parse-result-algebra.js';

/**
 * Parser-owned result inspection helpers.
 *
 * These keep downstream binding/scope/instruction code from rebuilding local
 * switches over sibling result kinds once parser consumers start growing.
 * Keep them focused on durable family/outcome questions, not on transient
 * convenience aliases that callers can derive from the classes directly.
 */
export class ExpressionParseResultInspector {
  static isCompleted(
    result: ExpressionParseResult,
  ): result is CompletedExpressionParseResult {
    return hasExpressionParseResultKindFlag(result.kind, ExpressionParseResultFlags.Completed);
  }

  static isNonOwning(
    result: ExpressionParseResult,
  ): result is NonOwningExpressionParseResult {
    return hasExpressionParseResultKindFlag(result.kind, ExpressionParseResultFlags.NonOwning);
  }

  static isCompanion(
    result: ExpressionParseResult,
  ): result is CompanionExpressionParseResult {
    return hasExpressionParseResultKindFlag(result.kind, ExpressionParseResultFlags.Companion);
  }

  static isHardParseError(
    result: ExpressionParseResult,
  ): result is CompleteInputParseError {
    return hasExpressionParseResultKindFlag(result.kind, ExpressionParseResultFlags.HardParseError);
  }

  static hasCanonicalAst(
    result: ExpressionParseResult,
  ): result is
    | ExpressionSuccess
    | EmptyExpressionSuccess
    | IteratorSuccess
    | InterpolationSuccess
    | OpaqueSuccess {
    return hasExpressionParseResultKindFlag(result.kind, ExpressionParseResultFlags.HasCanonicalAst);
  }

  static isPropertyLikeFamily(
    result: ExpressionParseResult,
  ): result is PropertyLikeParseResult {
    return hasExpressionParseResultKindFlag(result.kind, ExpressionParseResultFlags.PropertyLikeFamily)
      || (
        result.kind === ExpressionParseResultKind.CompleteInputParseError
        && (result.entryFamily === 'IsProperty' || result.entryFamily === 'IsFunction')
      );
  }

  static isIteratorFamily(
    result: ExpressionParseResult,
  ): result is IteratorParseResult {
    return hasExpressionParseResultKindFlag(result.kind, ExpressionParseResultFlags.IteratorFamily)
      || (
        result.kind === ExpressionParseResultKind.CompleteInputParseError
        && result.entryFamily === 'IsIterator'
      );
  }

  static isInterpolationFamily(
    result: ExpressionParseResult,
  ): result is InterpolationParseResult {
    return hasExpressionParseResultKindFlag(result.kind, ExpressionParseResultFlags.InterpolationFamily)
      || (
        result.kind === ExpressionParseResultKind.CompleteInputParseError
        && result.entryFamily === 'Interpolation'
      );
  }

  static isCustomFamily(
    result: ExpressionParseResult,
  ): result is CustomParseResult {
    return hasExpressionParseResultKindFlag(result.kind, ExpressionParseResultFlags.CustomFamily)
      || (
        result.kind === ExpressionParseResultKind.CompleteInputParseError
        && result.entryFamily === 'IsCustom'
      );
  }

  static entryFamily(result: ExpressionParseResult): ExpressionType {
    return result.entryFamily;
  }

  static secondaryGrammarOwner(result: ExpressionParseResult): string | null {
    switch (result.kind) {
      case ExpressionParseResultKind.OpaqueSuccess:
      case ExpressionParseResultKind.NoExpressionParse:
        return result.secondaryGrammarOwner;
      default:
        return null;
    }
  }
}
