import type {
  AccessMemberExpression,
  AccessScopeExpression,
  BindingIdentifier,
  CallScopeExpression,
  CallFunctionExpression,
  CallGlobalExpression,
  CallMemberExpression,
  ExpressionAstNode,
  ExpressionType,
  Identifier,
  NewExpression,
  ObjectLiteralExpression,
} from './ast.js';
import {
  AccessThisExpression,
  AuthoredScopePath,
  AuthoredScopePathKind,
} from './ast.js';
import {
  ExpressionCompanionFrameKind,
  ExpressionExpectedContinuationClass,
  ExpressionParseResultFlags,
  ExpressionParseResultKind,
  InterpolationActiveHoleCompanion,
  MatchedDelimiterKind,
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
  MatchedDelimiterEntry,
  OpaqueSuccess,
  PropertyLikeDegradedPublication,
  PropertyLikeFrontierPublication,
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
    const frontier = activePropertyOrInterpolationFrontier(result);
    if (frontier != null && frontierExpectsMemberName(frontier)) {
      return frontier.closedSubtreeRefs.at(-1)?.node ?? null;
    }

    const ast = this.hasCanonicalAst(result) ? result.ast : null;
    if (ast?.$kind === 'AccessMember') {
      return ast.object;
    }

    return ast == null ? null : firstMemberOwnerExpression(ast);
  }

  static memberOwnerAtOffset(
    result: ExpressionParseResult,
    offset: number,
  ): ExpressionAstNode | null {
    for (const expression of stableExpressionRoots(result)) {
      const access = memberAccessExpressionForNodeOffset(expression, offset, isMemberOwnerOffset);
      if (access != null) {
        return access.object;
      }
    }
    const frontier = activePropertyOrInterpolationFrontier(result);
    return frontier != null && frontierExpectsMemberName(frontier)
      ? frontier.closedSubtreeRefs.at(-1)?.node ?? null
      : null;
  }

  static memberNameAtOffset(
    result: ExpressionParseResult,
    offset: number,
  ): string | null {
    for (const expression of stableExpressionRoots(result)) {
      const access = memberAccessExpressionForNodeOffset(expression, offset, isMemberNameOffset);
      if (access != null) {
        return access.name.name;
      }
    }
    return null;
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

  /** Authored scope-root syntax. Semantic local/ambient classification belongs to runtime access-use products. */
  static scopeAccesses(
    result: ExpressionParseResult,
  ): readonly ExpressionScopeAccess[] {
    const accesses: ExpressionScopeAccess[] = [];
    for (const expression of stableExpressionRoots(result)) {
      collectScopeAccesses(expression, accesses);
    }
    return accesses;
  }

  static scopeAccessAtOffset(
    result: ExpressionParseResult,
    offset: number,
  ): ExpressionScopeAccess | null {
    for (const expression of stableExpressionRoots(result)) {
      const access = scopeAccessExpressionForNodeOffset(expression, offset);
      if (access != null) {
        return access;
      }
    }
    return null;
  }

  /** Exact named call whose authored callee token contains the cursor. */
  static namedCallAtOffset(
    result: ExpressionParseResult,
    offset: number,
  ): ExpressionNamedCall | null {
    return this.hasCanonicalAst(result)
      ? namedCallExpressionForNodeOffset(result.ast, offset)
      : null;
  }

  /** Exact authored `$this` occurrence selecting the current binding context. */
  static currentBindingContextAccessAtOffset(
    result: ExpressionParseResult,
    offset: number,
  ): AccessThisExpression | null {
    return this.hasCanonicalAst(result)
      ? currentBindingContextAccessExpressionForNodeOffset(result.ast, offset)
      : null;
  }

  /** Exact authored `$this` / `$parent` qualifier prefix selected by the cursor. */
  static bindingContextAccessAtOffset(
    result: ExpressionParseResult,
    offset: number,
  ): ExpressionBindingContextAccess | null {
    return this.hasCanonicalAst(result)
      ? bindingContextAccessForNodeOffset(result.ast, offset)
      : null;
  }

  static bindingIdentifierAtOffset(
    result: ExpressionParseResult,
    offset: number,
  ): BindingIdentifier | null {
    return this.hasCanonicalAst(result)
      ? bindingIdentifierForNodeOffset(result.ast, offset)
      : null;
  }

  /** Exact authored identifier-like token selected by a cursor without allocating per-token kernel addresses. */
  static authoredTokenSpanAtOffset(
    result: ExpressionParseResult,
    offset: number,
  ): SourceSpan | null {
    for (const expression of stableExpressionRoots(result)) {
      const span = authoredTokenSpanForExpressionAtOffset(expression, offset);
      if (span != null) {
        return span;
      }
    }
    return null;
  }

  static objectLiteralKeyContextAtOffset(
    result: ExpressionParseResult,
    offset: number,
  ): ExpressionObjectLiteralKeyContext | null {
    for (const expression of stableExpressionRoots(result)) {
      const context = objectLiteralKeyContextForExpression(expression, offset, 0);
      if (context != null) {
        return context;
      }
    }

    const frontier = activePropertyOrInterpolationFrontier(result);
    if (
      frontier?.surroundingFrameKind !== ExpressionCompanionFrameKind.ObjectLiteral
      || !frontier.expectedContinuationClasses.includes(ExpressionExpectedContinuationClass.ObjectLiteralKey)
    ) {
      return null;
    }
    const prefix = [...frontier.closedSubtreeRefs]
      .reverse()
      .find((reference) => reference.node.$kind === 'ObjectLiteral')?.node;
    const matchedDelimiterStack = activeFrontierMatchedDelimiterStack(frontier);
    const objectDepth = Math.max(
      0,
      matchedDelimiterStack.filter((entry) =>
        entry.kind === MatchedDelimiterKind.Brace && entry.closeSpan == null
      ).length - 1,
    );
    return prefix?.$kind === 'ObjectLiteral'
      ? objectLiteralKeyContext(prefix, offset, objectDepth)
      : { keys: [], keySpans: [], activeKey: null, objectDepth };
  }
}

export interface ExpressionObjectLiteralKeyContext {
  readonly keys: readonly (number | string)[];
  readonly keySpans: readonly SourceSpan[];
  readonly activeKey: number | string | null;
  readonly objectDepth: number;
}

/** Exact authored binding-context qualifier selected inside one parser-owned scope path. */
export class ExpressionBindingContextAccess {
  constructor(
    /** AccessThis-shaped expression for the selected qualifier prefix and its exact runtime Scope depth. */
    readonly expression: AccessThisExpression,
    /** Canonical AST node whose authored scope path owns the selected qualifier. */
    readonly ownerExpression: AccessThisExpression | AccessScopeExpression | CallScopeExpression,
    /** Authored `$parent` count through this token, with zero for `$this`. */
    readonly authoredScopeAncestor: number,
    /** Runtime Scope ancestor argument after parser lowering for this exact qualifier prefix. */
    readonly scopeLookupAncestor: number,
    /** Exact individual authored `$this` or `$parent` token span. */
    readonly qualifierSpan: SourceSpan,
  ) {}
}

type ActivePropertyOrInterpolationFrontier =
  | PropertyLikeDegradedPublication
  | PropertyLikeFrontierPublication
  | InterpolationActiveHoleCompanion;

function activePropertyOrInterpolationFrontier(
  result: ExpressionParseResult,
): ActivePropertyOrInterpolationFrontier | null {
  switch (result.kind) {
    case ExpressionParseResultKind.PropertyLikeDegradedPublication:
    case ExpressionParseResultKind.PropertyLikeFrontierPublication:
      return result;
    case ExpressionParseResultKind.InterpolationDegradedPublication:
    case ExpressionParseResultKind.InterpolationFrontierPublication:
      return result.activeHole;
    case ExpressionParseResultKind.ExpressionSuccess:
    case ExpressionParseResultKind.EmptyExpressionSuccess:
    case ExpressionParseResultKind.IteratorSuccess:
    case ExpressionParseResultKind.InterpolationSuccess:
    case ExpressionParseResultKind.InterpolationAbsent:
    case ExpressionParseResultKind.OpaqueSuccess:
    case ExpressionParseResultKind.CompleteInputParseError:
    case ExpressionParseResultKind.IteratorDegradedPublication:
    case ExpressionParseResultKind.IteratorFrontierPublication:
      return null;
  }
}

function activeFrontierMatchedDelimiterStack(
  frontier: ActivePropertyOrInterpolationFrontier,
): readonly MatchedDelimiterEntry[] {
  return frontier instanceof InterpolationActiveHoleCompanion
    ? frontier.bodyMatchedDelimiterStack
    : frontier.matchedDelimiterStack;
}

function frontierExpectsMemberName(
  frontier: { readonly expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[] },
): boolean {
  return frontier.expectedContinuationClasses.includes(ExpressionExpectedContinuationClass.MemberName);
}

export interface ExpressionMemberAccessSpan {
  readonly subjectKind: 'template-member-access' | 'template-member-call';
  readonly subjectSpan: SourceSpan;
  readonly nameSpan: SourceSpan;
}

export type ExpressionScopeAccess = AccessScopeExpression | CallScopeExpression;
/** Parser-owned descriptor for one named call/construct locus under an exact authored callee token. */
export interface ExpressionNamedCall {
  readonly expression: CallScopeExpression | CallMemberExpression | CallGlobalExpression | CallFunctionExpression | NewExpression;
  readonly callKind: 'scope' | 'member' | 'global' | 'function' | 'construct';
  readonly name: Identifier;
  readonly args: readonly ExpressionAstNode[];
  readonly span: SourceSpan;
  readonly optionalChain: boolean;
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

function objectLiteralKeyContextForExpression(
  expression: ExpressionAstNode,
  offset: number,
  objectDepth: number,
): ExpressionObjectLiteralKeyContext | null {
  if (!expressionSpanContainsOffset(expression.span, offset)) {
    return null;
  }
  const childObjectDepth = expression.$kind === 'ObjectLiteral' ? objectDepth + 1 : objectDepth;
  const nested = findInExpressionChildren(expression, (child) =>
    objectLiteralKeyContextForExpression(child, offset, childObjectDepth)
  );
  if (nested != null) {
    return nested;
  }
  return expression.$kind === 'ObjectLiteral'
    ? objectLiteralKeyContext(expression, offset, objectDepth)
    : null;
}

function objectLiteralKeyContext(
  expression: ObjectLiteralExpression,
  offset: number,
  objectDepth: number,
): ExpressionObjectLiteralKeyContext | null {
  const activeKeyIndex = expression.keySpans.findIndex((span) => expressionSpanContainsOffset(span, offset));
  if (activeKeyIndex >= 0) {
    return {
      keys: expression.keys,
      keySpans: expression.keySpans,
      activeKey: expression.keys[activeKeyIndex] ?? null,
      objectDepth,
    };
  }
  for (let index = 0; index < expression.values.length; index += 1) {
    const keySpan = expression.keySpans[index] ?? null;
    const value = expression.values[index] ?? null;
    if (keySpan != null && value != null && keySpan.end < offset && offset <= value.span.end) {
      return null;
    }
  }
  return {
    keys: expression.keys,
    keySpans: expression.keySpans,
    activeKey: null,
    objectDepth,
  };
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

function collectScopeAccesses(
  expression: ExpressionAstNode,
  accesses: ExpressionScopeAccess[],
): void {
  findInExpression(expression, (candidate) => {
    if (isScopeAccessExpression(candidate) && candidate.name.name.length > 0) {
      accesses.push(candidate);
    }
    return null;
  });
}

type MemberAccessExpression =
  | AccessMemberExpression
  | CallMemberExpression;

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
): ExpressionScopeAccess | null {
  return findInExpressionAtOffset(expression, offset, (candidate) =>
    isScopeAccessExpression(candidate) && (
      (candidate.name.name.length > 0 && expressionSpanContainsOffset(candidate.name.span, offset))
      || scopeQualifierSpanAtOffset(candidate.authoredScopePath, offset) != null
    )
      ? candidate
      : null
  );
}

function namedCallExpressionForNodeOffset(
  expression: ExpressionAstNode,
  offset: number,
): ExpressionNamedCall | null {
  if (!expressionSpanContainsOffset(expression.span, offset)) {
    return null;
  }
  const child = findInExpressionChildren(expression, (candidate) =>
    namedCallExpressionForNodeOffset(candidate, offset)
  );
  if (child != null) {
    return child;
  }
  const descriptor = namedCallDescriptor(expression);
  return descriptor != null && expressionSpanContainsOffset(descriptor.name.span, offset)
    ? descriptor
    : null;
}

function namedCallDescriptor(expression: ExpressionAstNode): ExpressionNamedCall | null {
  switch (expression.$kind) {
    case 'CallScope':
      return {
        expression,
        callKind: 'scope',
        name: expression.name,
        args: expression.args,
        span: expression.span,
        optionalChain: expression.optional || expression.optionalAccess,
      };
    case 'CallMember':
      return {
        expression,
        callKind: 'member',
        name: expression.name,
        args: expression.args,
        span: expression.span,
        optionalChain: expression.optionalCall || expression.optionalMember,
      };
    case 'CallGlobal':
      return {
        expression,
        callKind: 'global',
        name: expression.name,
        args: expression.args,
        span: expression.span,
        optionalChain: false,
      };
    case 'CallFunction': {
      const name = terminalCalleeIdentifier(expression.func);
      return name == null
        ? null
        : {
            expression,
            callKind: 'function',
            name,
            args: expression.args,
            span: expression.span,
            optionalChain: expression.optional,
          };
    }
    case 'New': {
      const name = terminalCalleeIdentifier(expression.func);
      return name == null
        ? null
        : {
            expression,
            callKind: 'construct',
            name,
            args: expression.args,
            span: expression.span,
            optionalChain: false,
          };
    }
    default:
      return null;
  }
}

function terminalCalleeIdentifier(expression: ExpressionAstNode): Identifier | null {
  switch (expression.$kind) {
    case 'Identifier':
      return expression;
    case 'AccessScope':
    case 'AccessGlobal':
    case 'AccessMember':
    case 'CallScope':
    case 'CallGlobal':
    case 'CallMember':
      return expression.name;
    case 'Paren':
      return terminalCalleeIdentifier(expression.expression);
    case 'CallFunction':
    case 'New':
      return terminalCalleeIdentifier(expression.func);
    default:
      return null;
  }
}

function currentBindingContextAccessExpressionForNodeOffset(
  expression: ExpressionAstNode,
  offset: number,
): AccessThisExpression | null {
  return findInExpressionAtOffset(expression, offset, (candidate) => {
    return candidate.$kind === 'AccessThis'
      && candidate.authoredScopePath?.pathKind === AuthoredScopePathKind.CurrentBindingContext
      && scopeQualifierSpanAtOffset(candidate.authoredScopePath, offset) != null
        ? candidate
        : null;
  });
}

function bindingContextAccessForNodeOffset(
  expression: ExpressionAstNode,
  offset: number,
): ExpressionBindingContextAccess | null {
  return findInExpressionAtOffset(expression, offset, (candidate) => {
    if (
      candidate.$kind !== 'AccessThis'
      && candidate.$kind !== 'AccessScope'
      && candidate.$kind !== 'CallScope'
    ) {
      return null;
    }
    const path = candidate.authoredScopePath;
    if (path == null) {
      return null;
    }
    const qualifierIndex = path.qualifierSpans.findIndex((span) =>
      expressionSpanContainsOffset(span, offset)
    );
    if (qualifierIndex < 0) {
      return null;
    }
    const qualifierSpan = path.qualifierSpans[qualifierIndex];
    const firstQualifierSpan = path.qualifierSpans[0];
    if (qualifierSpan == null || firstQualifierSpan == null) {
      return null;
    }

    if (path.pathKind === AuthoredScopePathKind.CurrentBindingContext) {
      if (qualifierIndex !== 0) {
        return null;
      }
      const expressionForQualifier = candidate.$kind === 'AccessThis'
        ? candidate
        : new AccessThisExpression(
            qualifierSpan,
            candidate.ancestor,
            new AuthoredScopePath(AuthoredScopePathKind.CurrentBindingContext, [qualifierSpan]),
          );
      return new ExpressionBindingContextAccess(
        expressionForQualifier,
        candidate,
        0,
        candidate.ancestor,
        qualifierSpan,
      );
    }

    const authoredScopeAncestor = qualifierIndex + 1;
    // The parser stores one collapsed lookup depth for the full path: callback depth plus every authored qualifier.
    // Ordered parser-owned qualifier spans therefore prove the exact prefix depth without reconstructing source text.
    const callbackScopeDepth = candidate.ancestor - path.qualifierSpans.length;
    if (callbackScopeDepth < 0) {
      return null;
    }
    const scopeLookupAncestor = callbackScopeDepth + authoredScopeAncestor;
    const selectedQualifierSpans = path.qualifierSpans.slice(0, authoredScopeAncestor);
    const selectedPathSpan = sourceSpanFromBounds(
      firstQualifierSpan.start,
      qualifierSpan.end,
      firstQualifierSpan.file ?? null,
    );
    const expressionForQualifier = candidate.$kind === 'AccessThis'
      && authoredScopeAncestor === path.qualifierSpans.length
      ? candidate
      : new AccessThisExpression(
          selectedPathSpan,
          scopeLookupAncestor,
          new AuthoredScopePath(
            AuthoredScopePathKind.AncestorBindingContext,
            selectedQualifierSpans,
          ),
        );
    return new ExpressionBindingContextAccess(
      expressionForQualifier,
      candidate,
      authoredScopeAncestor,
      scopeLookupAncestor,
      qualifierSpan,
    );
  });
}

function bindingIdentifierForNodeOffset(
  expression: ExpressionAstNode,
  offset: number,
): BindingIdentifier | null {
  if (!expressionSpanContainsOffset(expression.span, offset)) {
    return null;
  }
  if (expression.$kind === 'ArrowFunction') {
    for (const parameter of expression.args) {
      const selected = bindingIdentifierForNodeOffset(parameter, offset);
      if (selected != null) {
        return selected;
      }
    }
    return bindingIdentifierForNodeOffset(expression.body, offset);
  }
  if (expression.$kind === 'ForOfStatement') {
    return bindingIdentifierForNodeOffset(expression.declaration, offset)
      ?? bindingIdentifierForNodeOffset(expression.iterable, offset);
  }
  if (expression.$kind === 'BindingIdentifier') {
    return expressionSpanContainsOffset(expression.name.span, offset)
      ? expression
      : null;
  }
  return findInExpressionChildren(
    expression,
    (child) => bindingIdentifierForNodeOffset(child, offset),
  );
}

function authoredTokenSpanForExpressionAtOffset(
  expression: ExpressionAstNode,
  offset: number,
): SourceSpan | null {
  return findInExpressionAtOffset(expression, offset, (candidate) => {
    switch (candidate.$kind) {
      case 'AccessMember':
      case 'CallMember':
        return expressionSpanContainsOffset(candidate.name.span, offset)
          ? candidate.name.span
          : null;
      case 'AccessScope':
      case 'CallScope':
        return expressionSpanContainsOffset(candidate.name.span, offset)
          ? candidate.name.span
          : scopeQualifierSpanAtOffset(candidate.authoredScopePath, offset);
      case 'AccessGlobal':
      case 'CallGlobal':
      case 'BindingBehavior':
      case 'ValueConverter':
      case 'BindingIdentifier':
        return expressionSpanContainsOffset(candidate.name.span, offset)
          ? candidate.name.span
          : null;
      case 'AccessThis':
        return scopeQualifierSpanAtOffset(candidate.authoredScopePath, offset)
          ?? (expressionSpanContainsOffset(candidate.span, offset) ? candidate.span : null);
      case 'AccessBoundary':
        return expressionSpanContainsOffset(candidate.span, offset)
          ? candidate.span
          : null;
      case 'ObjectLiteral': {
        const keyIndex = candidate.keySpans.findIndex((span) => expressionSpanContainsOffset(span, offset));
        return keyIndex < 0 ? null : candidate.keySpans[keyIndex] ?? null;
      }
      default:
        return null;
    }
  });
}

function scopeQualifierSpanAtOffset(
  path: AuthoredScopePath | null,
  offset: number,
): SourceSpan | null {
  return path?.qualifierSpans.find((span) => expressionSpanContainsOffset(span, offset)) ?? null;
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
): expression is ExpressionScopeAccess {
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
