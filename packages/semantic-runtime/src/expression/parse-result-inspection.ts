import type {
  AccessMemberExpression,
  CallMemberExpression,
  ExpressionAstNode,
  ExpressionType,
} from './ast.js';
import {
  ExpressionFrontierKind,
  ExpressionParseResultFlags,
  ExpressionParseResultKind,
  hasExpressionParseResultKindFlag,
} from './parse-result-algebra.js';
import {
  expressionSpanContainsOffset,
  type SourceSpan,
} from './source-span.js';
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

  static memberOwner(result: ExpressionParseResult): ExpressionAstNode | null {
    if (
      'frontierKind' in result
      && 'closedSubtreeRefs' in result
      && result.frontierKind === ExpressionFrontierKind.AwaitingMemberName
    ) {
      return result.closedSubtreeRefs.at(-1)?.node ?? null;
    }

    if (
      'activeHole' in result
      && result.activeHole.frontierKind === ExpressionFrontierKind.AwaitingMemberName
    ) {
      return result.activeHole.closedSubtreeRefs.at(-1)?.node ?? null;
    }

    if ('ast' in result && result.ast.$kind === 'AccessMember') {
      return result.ast.object;
    }

    if ('ast' in result) {
      return firstMemberOwnerExpression(result.ast);
    }

    return null;
  }

  static memberOwnerAtOffset(
    result: ExpressionParseResult,
    offset: number,
  ): ExpressionAstNode | null {
    if ('ast' in result) {
      return memberAccessExpressionForNodeOffset(result.ast, offset, isMemberOwnerOffset)?.object ?? null;
    }
    if (
      'activeHole' in result
      && result.activeHole.frontierKind === ExpressionFrontierKind.AwaitingMemberName
    ) {
      return result.activeHole.closedSubtreeRefs.at(-1)?.node ?? null;
    }
    if (
      'frontierKind' in result
      && 'closedSubtreeRefs' in result
      && result.frontierKind === ExpressionFrontierKind.AwaitingMemberName
    ) {
      return result.closedSubtreeRefs.at(-1)?.node ?? null;
    }
    return null;
  }

  static memberNameAtOffset(
    result: ExpressionParseResult,
    offset: number,
  ): string | null {
    return 'ast' in result
      ? memberAccessExpressionForNodeOffset(result.ast, offset, isMemberNameOffset)?.name.name ?? null
      : null;
  }

  static memberNameSpans(
    result: ExpressionParseResult,
  ): readonly SourceSpan[] {
    const spans: SourceSpan[] = [];
    for (const expression of stableExpressionRoots(result)) {
      collectMemberNameSpans(expression, spans);
    }
    return spans;
  }
}

function stableExpressionRoots(result: ExpressionParseResult): readonly ExpressionAstNode[] {
  switch (result.kind) {
    case ExpressionParseResultKind.ExpressionSuccess:
    case ExpressionParseResultKind.EmptyExpressionSuccess:
    case ExpressionParseResultKind.IteratorSuccess:
    case ExpressionParseResultKind.InterpolationSuccess:
    case ExpressionParseResultKind.OpaqueSuccess:
      return [result.ast];
    case ExpressionParseResultKind.PropertyLikeDegradedPublication:
    case ExpressionParseResultKind.PropertyLikeFrontierPublication:
      return result.closedSubtreeRefs.map((ref) => ref.node);
    case ExpressionParseResultKind.InterpolationDegradedPublication:
    case ExpressionParseResultKind.InterpolationFrontierPublication:
      return [
        ...result.closedHoles.map((hole) => hole.ast),
        ...result.activeHole.closedSubtreeRefs.map((ref) => ref.node),
      ];
    case ExpressionParseResultKind.IteratorDegradedPublication:
    case ExpressionParseResultKind.IteratorFrontierPublication:
      return [
        ...result.declarationClosedSubtreeRefs.map((ref) => ref.node),
        ...(result.iterable == null ? [] : [result.iterable]),
        ...result.iterableClosedSubtreeRefs.map((ref) => ref.node),
      ];
    case ExpressionParseResultKind.InterpolationAbsent:
    case ExpressionParseResultKind.CompleteInputParseError:
      return [];
  }
}

function collectMemberNameSpans(
  expression: ExpressionAstNode,
  spans: SourceSpan[],
): void {
  switch (expression.$kind) {
    case 'AccessMember':
      spans.push(expression.name.span);
      collectMemberNameSpans(expression.object, spans);
      return;
    case 'CallMember':
      spans.push(expression.name.span);
      collectMemberNameSpans(expression.object, spans);
      collectMemberNameSpansInList(expression.args, spans);
      return;
    case 'Paren':
    case 'Unary':
      collectMemberNameSpans(expression.expression, spans);
      return;
    case 'AccessKeyed':
      collectMemberNameSpans(expression.object, spans);
      collectMemberNameSpans(expression.key, spans);
      return;
    case 'CallFunction':
      collectMemberNameSpans(expression.func, spans);
      collectMemberNameSpansInList(expression.args, spans);
      return;
    case 'CallScope':
    case 'CallGlobal':
      collectMemberNameSpansInList(expression.args, spans);
      return;
    case 'New':
      collectMemberNameSpans(expression.func, spans);
      collectMemberNameSpansInList(expression.args, spans);
      return;
    case 'TaggedTemplate':
      collectMemberNameSpans(expression.func, spans);
      collectMemberNameSpansInList(expression.expressions, spans);
      return;
    case 'Binary':
      collectMemberNameSpans(expression.left, spans);
      collectMemberNameSpans(expression.right, spans);
      return;
    case 'Conditional':
      collectMemberNameSpans(expression.condition, spans);
      collectMemberNameSpans(expression.yes, spans);
      collectMemberNameSpans(expression.no, spans);
      return;
    case 'Assign':
      collectMemberNameSpans(expression.target, spans);
      collectMemberNameSpans(expression.value, spans);
      return;
    case 'ArrowFunction':
      collectMemberNameSpans(expression.body, spans);
      return;
    case 'ArrayLiteral':
      collectMemberNameSpansInList(expression.elements, spans);
      return;
    case 'ObjectLiteral':
      collectMemberNameSpansInList(expression.values, spans);
      return;
    case 'Template':
    case 'Interpolation':
      collectMemberNameSpansInList(expression.expressions, spans);
      return;
    case 'ForOfStatement':
      collectMemberNameSpans(expression.iterable, spans);
      return;
    case 'BindingPatternDefault':
      collectMemberNameSpans(expression.target, spans);
      collectMemberNameSpans(expression.default, spans);
      return;
    case 'ArrayBindingPattern':
      collectMemberNameSpansInList(expression.elements, spans);
      if (expression.rest != null) {
        collectMemberNameSpans(expression.rest, spans);
      }
      return;
    case 'ObjectBindingPattern':
      collectMemberNameSpansInList(expression.properties.map((property) => property.value), spans);
      if (expression.rest != null) {
        collectMemberNameSpans(expression.rest, spans);
      }
      return;
    case 'DestructuringAssignment':
      collectMemberNameSpans(expression.pattern, spans);
      collectMemberNameSpans(expression.source, spans);
      return;
    case 'AccessThis':
    case 'AccessBoundary':
    case 'AccessScope':
    case 'AccessGlobal':
    case 'PrimitiveLiteral':
    case 'Identifier':
    case 'BindingIdentifier':
    case 'BindingPatternHole':
    case 'Custom':
      return;
  }
}

function collectMemberNameSpansInList(
  expressions: readonly ExpressionAstNode[],
  spans: SourceSpan[],
): void {
  for (const expression of expressions) {
    collectMemberNameSpans(expression, spans);
  }
}

function firstMemberOwnerExpression(expression: ExpressionAstNode): ExpressionAstNode | null {
  switch (expression.$kind) {
    case 'AccessMember':
    case 'CallMember':
      return expression.object;
    case 'Paren':
    case 'Unary':
      return firstMemberOwnerExpression(expression.expression);
    case 'AccessKeyed':
      return firstMemberOwnerExpression(expression.object)
        ?? firstMemberOwnerExpression(expression.key);
    case 'CallFunction':
      return firstMemberOwnerExpression(expression.func)
        ?? firstMemberOwnerExpressionInList(expression.args);
    case 'CallScope':
    case 'CallGlobal':
      return firstMemberOwnerExpressionInList(expression.args);
    case 'New':
      return firstMemberOwnerExpression(expression.func)
        ?? firstMemberOwnerExpressionInList(expression.args);
    case 'TaggedTemplate':
      return firstMemberOwnerExpression(expression.func)
        ?? firstMemberOwnerExpressionInList(expression.expressions);
    case 'Binary':
      return firstMemberOwnerExpression(expression.left)
        ?? firstMemberOwnerExpression(expression.right);
    case 'Conditional':
      return firstMemberOwnerExpression(expression.condition)
        ?? firstMemberOwnerExpression(expression.yes)
        ?? firstMemberOwnerExpression(expression.no);
    case 'Assign':
      return firstMemberOwnerExpression(expression.target)
        ?? firstMemberOwnerExpression(expression.value);
    case 'ArrowFunction':
      return firstMemberOwnerExpression(expression.body);
    case 'ArrayLiteral':
      return firstMemberOwnerExpressionInList(expression.elements);
    case 'ObjectLiteral':
      return firstMemberOwnerExpressionInList(expression.values);
    case 'Template':
    case 'Interpolation':
      return firstMemberOwnerExpressionInList(expression.expressions);
    case 'ForOfStatement':
      return firstMemberOwnerExpression(expression.iterable);
    case 'BindingPatternDefault':
      return firstMemberOwnerExpression(expression.target)
        ?? firstMemberOwnerExpression(expression.default);
    case 'ArrayBindingPattern':
      return firstMemberOwnerExpressionInList(expression.elements)
        ?? (expression.rest == null ? null : firstMemberOwnerExpression(expression.rest));
    case 'ObjectBindingPattern':
      return firstMemberOwnerExpressionInList(expression.properties.map((property) => property.value))
        ?? (expression.rest == null ? null : firstMemberOwnerExpression(expression.rest));
    case 'DestructuringAssignment':
      return firstMemberOwnerExpression(expression.pattern)
        ?? firstMemberOwnerExpression(expression.source);
    case 'AccessThis':
    case 'AccessBoundary':
    case 'AccessScope':
    case 'AccessGlobal':
    case 'PrimitiveLiteral':
    case 'Identifier':
    case 'BindingIdentifier':
    case 'BindingPatternHole':
    case 'Custom':
      return null;
  }
  return null;
}

function firstMemberOwnerExpressionInList(
  expressions: readonly ExpressionAstNode[],
): ExpressionAstNode | null {
  for (const expression of expressions) {
    const owner = firstMemberOwnerExpression(expression);
    if (owner != null) {
      return owner;
    }
  }
  return null;
}

type MemberAccessExpression =
  | AccessMemberExpression
  | CallMemberExpression;

function memberAccessExpressionForNodeOffset(
  expression: ExpressionAstNode,
  offset: number,
  matchesMember: (expression: MemberAccessExpression, offset: number) => boolean,
): MemberAccessExpression | null {
  switch (expression.$kind) {
    case 'AccessMember':
      return matchesMember(expression, offset)
        ? expression
        : memberAccessExpressionForNodeOffset(expression.object, offset, matchesMember);
    case 'CallMember':
      return matchesMember(expression, offset)
        ? expression
        : memberAccessExpressionForNodeOffset(expression.object, offset, matchesMember)
          ?? memberAccessExpressionForNodeOffsetInList(expression.args, offset, matchesMember);
    case 'Paren':
    case 'Unary':
      return memberAccessExpressionForNodeOffset(expression.expression, offset, matchesMember);
    case 'AccessKeyed':
      return memberAccessExpressionForNodeOffset(expression.object, offset, matchesMember)
        ?? memberAccessExpressionForNodeOffset(expression.key, offset, matchesMember);
    case 'CallFunction':
      return memberAccessExpressionForNodeOffset(expression.func, offset, matchesMember)
        ?? memberAccessExpressionForNodeOffsetInList(expression.args, offset, matchesMember);
    case 'CallScope':
    case 'CallGlobal':
      return memberAccessExpressionForNodeOffsetInList(expression.args, offset, matchesMember);
    case 'New':
      return memberAccessExpressionForNodeOffset(expression.func, offset, matchesMember)
        ?? memberAccessExpressionForNodeOffsetInList(expression.args, offset, matchesMember);
    case 'TaggedTemplate':
      return memberAccessExpressionForNodeOffset(expression.func, offset, matchesMember)
        ?? memberAccessExpressionForNodeOffsetInList(expression.expressions, offset, matchesMember);
    case 'Binary':
      return memberAccessExpressionForNodeOffset(expression.left, offset, matchesMember)
        ?? memberAccessExpressionForNodeOffset(expression.right, offset, matchesMember);
    case 'Conditional':
      return memberAccessExpressionForNodeOffset(expression.condition, offset, matchesMember)
        ?? memberAccessExpressionForNodeOffset(expression.yes, offset, matchesMember)
        ?? memberAccessExpressionForNodeOffset(expression.no, offset, matchesMember);
    case 'Assign':
      return memberAccessExpressionForNodeOffset(expression.target, offset, matchesMember)
        ?? memberAccessExpressionForNodeOffset(expression.value, offset, matchesMember);
    case 'ArrowFunction':
      return memberAccessExpressionForNodeOffset(expression.body, offset, matchesMember);
    case 'ArrayLiteral':
      return memberAccessExpressionForNodeOffsetInList(expression.elements, offset, matchesMember);
    case 'ObjectLiteral':
      return memberAccessExpressionForNodeOffsetInList(expression.values, offset, matchesMember);
    case 'Template':
    case 'Interpolation':
      return memberAccessExpressionForNodeOffsetInList(expression.expressions, offset, matchesMember);
    case 'ForOfStatement':
      return memberAccessExpressionForNodeOffset(expression.iterable, offset, matchesMember);
    case 'BindingPatternDefault':
      return memberAccessExpressionForNodeOffset(expression.target, offset, matchesMember)
        ?? memberAccessExpressionForNodeOffset(expression.default, offset, matchesMember);
    case 'ArrayBindingPattern':
      return memberAccessExpressionForNodeOffsetInList(expression.elements, offset, matchesMember)
        ?? (expression.rest == null ? null : memberAccessExpressionForNodeOffset(expression.rest, offset, matchesMember));
    case 'ObjectBindingPattern':
      return memberAccessExpressionForNodeOffsetInList(expression.properties.map((property) => property.value), offset, matchesMember)
        ?? (expression.rest == null ? null : memberAccessExpressionForNodeOffset(expression.rest, offset, matchesMember));
    case 'DestructuringAssignment':
      return memberAccessExpressionForNodeOffset(expression.pattern, offset, matchesMember)
        ?? memberAccessExpressionForNodeOffset(expression.source, offset, matchesMember);
    case 'AccessThis':
    case 'AccessBoundary':
    case 'AccessScope':
    case 'AccessGlobal':
    case 'PrimitiveLiteral':
    case 'Identifier':
    case 'BindingIdentifier':
    case 'BindingPatternHole':
    case 'Custom':
      return null;
  }
  return null;
}

function memberAccessExpressionForNodeOffsetInList(
  expressions: readonly ExpressionAstNode[],
  offset: number,
  matchesMember: (expression: MemberAccessExpression, offset: number) => boolean,
): MemberAccessExpression | null {
  for (const expression of expressions) {
    if (!expressionSpanContainsOffset(expression.span, offset)) {
      continue;
    }
    const member = memberAccessExpressionForNodeOffset(expression, offset, matchesMember);
    if (member != null) {
      return member;
    }
  }
  return null;
}

function isMemberOwnerOffset(
  expression: MemberAccessExpression,
  offset: number,
): boolean {
  return offset >= expression.object.span.end
    && offset <= expression.name.span.end;
}

function isMemberNameOffset(
  expression: MemberAccessExpression,
  offset: number,
): boolean {
  return expressionSpanContainsOffset(expression.name.span, offset);
}
