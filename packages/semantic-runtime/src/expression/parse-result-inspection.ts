import type {
  AccessMemberExpression,
  AccessScopeExpression,
  BindingIdentifier,
  CallScopeExpression,
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
  sourceSpanFromBounds,
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
    return this.memberAccessSpans(result).map((span) => span.nameSpan);
  }

  static memberAccessSpans(
    result: ExpressionParseResult,
  ): readonly ExpressionMemberAccessSpan[] {
    const accessSpans: ExpressionMemberAccessSpan[] = [];
    for (const expression of stableExpressionRoots(result)) {
      collectMemberAccessSpans(expression, accessSpans);
    }
    return accessSpans;
  }

  static scopeAccessAtOffset(
    result: ExpressionParseResult,
    offset: number,
  ): ScopeAccessExpression | null {
    return 'ast' in result
      ? scopeAccessExpressionForNodeOffset(result.ast, offset)
      : null;
  }

  static bindingIdentifierAtOffset(
    result: ExpressionParseResult,
    offset: number,
  ): BindingIdentifier | null {
    return 'ast' in result
      ? bindingIdentifierForNodeOffset(result.ast, offset)
      : null;
  }
}

export interface ExpressionMemberAccessSpan {
  readonly subjectKind: 'template-member-access' | 'template-member-call';
  readonly subjectSpan: SourceSpan;
  readonly nameSpan: SourceSpan;
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

function collectMemberAccessSpans(
  expression: ExpressionAstNode,
  spans: ExpressionMemberAccessSpan[],
): void {
  findInExpression(expression, (candidate) => {
    if (isMemberAccessExpression(candidate)) {
      spans.push(memberAccessSpan(candidate));
    }
    return null;
  });
}

type MemberAccessExpression =
  | AccessMemberExpression
  | CallMemberExpression;

type ScopeAccessExpression =
  | AccessScopeExpression
  | CallScopeExpression;

function firstMemberOwnerExpression(expression: ExpressionAstNode): ExpressionAstNode | null {
  return findInExpression(expression, (candidate) =>
    isMemberAccessExpression(candidate)
      ? candidate.object
      : null
  );
}

function memberAccessExpressionForNodeOffset(
  expression: ExpressionAstNode,
  offset: number,
  matchesMember: (expression: MemberAccessExpression, offset: number) => boolean,
): MemberAccessExpression | null {
  return findInExpressionAtOffset(expression, offset, (candidate) =>
    isMemberAccessExpression(candidate) && matchesMember(candidate, offset)
      ? candidate
      : null
  );
}

function scopeAccessExpressionForNodeOffset(
  expression: ExpressionAstNode,
  offset: number,
): ScopeAccessExpression | null {
  return findInExpressionAtOffset(expression, offset, (candidate) =>
    isScopeAccessExpression(candidate) && expressionSpanContainsOffset(candidate.name.span, offset)
      ? candidate
      : null
  );
}

function bindingIdentifierForNodeOffset(
  expression: ExpressionAstNode,
  offset: number,
): BindingIdentifier | null {
  return findInExpressionAtOffset(expression, offset, (candidate) =>
    candidate.$kind === 'BindingIdentifier' && expressionSpanContainsOffset(candidate.name.span, offset)
      ? candidate
      : null
  );
}

function findInExpression<T>(
  expression: ExpressionAstNode,
  select: (expression: ExpressionAstNode) => T | null,
): T | null {
  return select(expression)
    ?? findInExpressionChildren(expression, (child) => findInExpression(child, select));
}

/** Walks every parser AST node using parser-owned child semantics shared by feature-level expression consumers. */
export function visitExpressionAstNodes(
  expression: ExpressionAstNode,
  visit: (expression: ExpressionAstNode) => void,
): void {
  findInExpression(expression, (candidate) => {
    visit(candidate);
    return null;
  });
}

export function expressionAstNodeContainsKind(
  expression: ExpressionAstNode,
  kind: ExpressionAstNode['$kind'],
): boolean {
  return findInExpression(expression, (candidate) => candidate.$kind === kind ? true : null) === true;
}

export function unwrapExpressionAstNodeParens(
  expression: ExpressionAstNode,
): ExpressionAstNode {
  return expression.$kind === 'Paren'
    ? unwrapExpressionAstNodeParens(expression.expression)
    : expression;
}

function findInExpressionAtOffset<T>(
  expression: ExpressionAstNode,
  offset: number,
  select: (expression: ExpressionAstNode) => T | null,
): T | null {
  if (!expressionSpanContainsOffset(expression.span, offset)) {
    return null;
  }
  return select(expression)
    ?? findInExpressionChildren(expression, (child) => findInExpressionAtOffset(child, offset, select));
}

function findInExpressionChildren<T>(
  expression: ExpressionAstNode,
  findChild: (expression: ExpressionAstNode) => T | null,
): T | null {
  switch (expression.$kind) {
    case 'AccessMember':
      return findChild(expression.object);
    case 'CallMember':
      return findChild(expression.object)
        ?? findInExpressionList(expression.args, findChild);
    case 'Paren':
    case 'Unary':
      return findChild(expression.expression);
    case 'AccessKeyed':
      return findChild(expression.object)
        ?? findChild(expression.key);
    case 'BindingBehavior':
    case 'ValueConverter':
      return findChild(expression.expression)
        ?? findInExpressionList(expression.args, findChild);
    case 'CallFunction':
      return findChild(expression.func)
        ?? findInExpressionList(expression.args, findChild);
    case 'CallScope':
    case 'CallGlobal':
      return findInExpressionList(expression.args, findChild);
    case 'New':
      return findChild(expression.func)
        ?? findInExpressionList(expression.args, findChild);
    case 'TaggedTemplate':
      return findChild(expression.func)
        ?? findInExpressionList(expression.expressions, findChild);
    case 'Binary':
      return findChild(expression.left)
        ?? findChild(expression.right);
    case 'Conditional':
      return findChild(expression.condition)
        ?? findChild(expression.yes)
        ?? findChild(expression.no);
    case 'Assign':
      return findChild(expression.target)
        ?? findChild(expression.value);
    case 'ArrowFunction':
      return findChild(expression.body);
    case 'ArrayLiteral':
      return findInExpressionList(expression.elements, findChild);
    case 'ObjectLiteral':
      return findInExpressionList(expression.values, findChild);
    case 'Template':
    case 'Interpolation':
      return findInExpressionList(expression.expressions, findChild);
    case 'ForOfStatement':
      return findChild(expression.iterable)
        ?? findChild(expression.declaration);
    case 'BindingPatternDefault':
      return findChild(expression.target)
        ?? findChild(expression.default);
    case 'ArrayBindingPattern':
      return findInExpressionList(expression.elements, findChild)
        ?? findOptionalExpression(expression.rest, findChild);
    case 'ObjectBindingPattern':
      return findInExpressionList(expression.properties.map((property) => property.value), findChild)
        ?? findOptionalExpression(expression.rest, findChild);
    case 'DestructuringAssignment':
      return findChild(expression.pattern)
        ?? findChild(expression.source);
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
  const exhaustive: never = expression;
  return exhaustive;
}

function findInExpressionList<T>(
  expressions: readonly ExpressionAstNode[],
  findChild: (expression: ExpressionAstNode) => T | null,
): T | null {
  for (const expression of expressions) {
    const found = findChild(expression);
    if (found != null) {
      return found;
    }
  }
  return null;
}

function findOptionalExpression<T>(
  expression: ExpressionAstNode | null,
  findChild: (expression: ExpressionAstNode) => T | null,
): T | null {
  return expression == null ? null : findChild(expression);
}

function isMemberAccessExpression(
  expression: ExpressionAstNode,
): expression is MemberAccessExpression {
  return expression.$kind === 'AccessMember' || expression.$kind === 'CallMember';
}

function memberAccessSpan(
  expression: MemberAccessExpression,
): ExpressionMemberAccessSpan {
  if (expression.$kind === 'CallMember') {
    return {
      subjectKind: 'template-member-call',
      subjectSpan: sourceSpanFromBounds(
        expression.object.span.start,
        expression.name.span.end,
        expression.span.file ?? null,
      ),
      nameSpan: expression.name.span,
    };
  }
  return {
    subjectKind: 'template-member-access',
    subjectSpan: expression.span,
    nameSpan: expression.name.span,
  };
}

function isScopeAccessExpression(
  expression: ExpressionAstNode,
): expression is ScopeAccessExpression {
  return expression.$kind === 'AccessScope' || expression.$kind === 'CallScope';
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
