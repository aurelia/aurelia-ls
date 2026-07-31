import type {
  CallMemberExpression,
  ExpressionAstNode,
} from '../expression/ast.js';
import {
  expressionSourceName,
  expressionSourceRootName,
  primitiveExpressionDisplay,
} from '../expression/expression-source-name.js';
import {
  aureliaArrayMethodSemanticsFor,
} from '../expression/array-method-semantics.js';
import type { RuntimeExpressionAccessDraft } from '../runtime-expression/runtime-expression-access-draft.js';
import {
  collectRuntimeTemplateAccessUseDrafts,
} from '../runtime-expression/template-access-use-collector.js';
import {
  RuntimeExpressionAccessForm,
  RuntimeExpressionAccessRole,
} from '../runtime-expression/runtime-expression-access-use.js';
import { RuntimeObservedDependencyKind } from './runtime-observed-dependency.js';

export interface RuntimeConnectableObservedDependencyDraft {
  readonly dependencyKind: RuntimeObservedDependencyKind;
  readonly expressionKind: string;
  readonly sourceName: string | null;
  readonly sourceRootName: string | null;
  readonly memberName: string | null;
  readonly keyExpression: string | null;
  readonly methodName: string | null;
  readonly memberNameSpanStart: number | null;
  readonly memberNameSpanEnd: number | null;
  readonly scopeLookupAncestor: number | null;
  readonly spanStart: number | null;
  readonly spanEnd: number | null;
}

export type RuntimeTemplateArrayMethodPolicy = (
  expression: CallMemberExpression,
  rootExpression: ExpressionAstNode,
) => boolean;

export interface RuntimeConnectableObservedAccessUseDraft {
  readonly accessUse: RuntimeExpressionAccessDraft;
  readonly dependency: RuntimeConnectableObservedDependencyDraft;
}

/** Derive connectable observation effects from already-conserved access occurrences. */
export function runtimeConnectableObservedAccessUseDrafts(
  accessUses: readonly RuntimeExpressionAccessDraft[],
  canUseRuntimeArrayMethod: RuntimeTemplateArrayMethodPolicy | null = null,
  rootExpression: ExpressionAstNode | null = null,
): readonly RuntimeConnectableObservedAccessUseDraft[] {
  const rows: RuntimeConnectableObservedAccessUseDraft[] = [];
  const root = rootExpression ?? accessUses[0]?.expression ?? null;
  for (const accessUse of accessUses) {
    if (
      accessUse.role === RuntimeExpressionAccessRole.WriteTarget
      || accessUse.accessForm === RuntimeExpressionAccessForm.Global
      || accessUse.accessForm === RuntimeExpressionAccessForm.This
    ) {
      continue;
    }
    const expression = accessUse.expression;
    switch (accessUse.accessForm) {
      case RuntimeExpressionAccessForm.Scope:
      case RuntimeExpressionAccessForm.ScopeCall:
        if (!accessUse.lexicalLocal) {
          const scopeName = expression.$kind === 'CallScope'
            ? expression.name.name
            : expressionSourceName(expression);
          rows.push({
            accessUse,
            dependency: observedDependencyDraft(
              RuntimeObservedDependencyKind.TemplateExpressionRead,
              expression.$kind,
              scopeName,
              expressionSourceRootName(expression),
              null,
              null,
              expression.$kind === 'CallScope' ? expression.name.name : null,
              expression,
            ),
          });
        }
        break;
      case RuntimeExpressionAccessForm.Member:
      case RuntimeExpressionAccessForm.Keyed:
        rows.push({
          accessUse,
          dependency: observedDependencyDraft(
            RuntimeObservedDependencyKind.TemplateExpressionRead,
            expression.$kind,
            expressionSourceName(expression),
            expressionSourceRootName(expression),
            expression.$kind === 'AccessMember' ? expression.name.name : null,
            expression.$kind === 'AccessKeyed'
              ? expressionSourceName(expression.key) ?? primitiveExpressionDisplay(expression.key)
              : null,
            null,
            expression,
          ),
        });
        break;
      case RuntimeExpressionAccessForm.MemberCall:
        if (expression.$kind === 'CallMember') {
          const semantics = aureliaArrayMethodSemanticsFor(expression.name.name);
          const canUseMethod = semantics?.astEvaluateAutoObserved === true
            && root != null
            && (canUseRuntimeArrayMethod?.(expression, root) ?? true);
          if (canUseMethod) {
            rows.push({
              // Aurelia's CallMember evaluation performs collection observation while spending this call. The receiver
              // can be a temporary call result with no independent authored access, so the call occurrence is the
              // stable owner for both direct and derived collection reads.
              accessUse,
              dependency: observedDependencyDraft(
                RuntimeObservedDependencyKind.TemplateCollectionRead,
                expression.$kind,
                expressionSourceName(expression.object),
                expressionSourceRootName(expression.object),
                observedCollectionOwnerMemberName(expression.object),
                null,
                expression.name.name,
                expression,
                expression.object,
              ),
            });
          }
        }
        break;
      case RuntimeExpressionAccessForm.FunctionCall:
      case RuntimeExpressionAccessForm.Declarative:
        break;
    }
  }
  return rows;
}

export function collectRuntimeConnectableObservedDependencyDrafts(
  expression: ExpressionAstNode,
  canUseRuntimeArrayMethod: RuntimeTemplateArrayMethodPolicy | null = null,
): readonly RuntimeConnectableObservedDependencyDraft[] {
  const accessUses = collectRuntimeTemplateAccessUseDrafts({
    expression,
    canUseRuntimeArrayMethod,
  });
  return runtimeConnectableObservedAccessUseDrafts(
    accessUses,
    canUseRuntimeArrayMethod,
    expression,
  ).map((row) => row.dependency);
}

function observedDependencyDraft(
  dependencyKind: RuntimeObservedDependencyKind,
  expressionKind: string,
  sourceName: string | null,
  sourceRootName: string | null,
  memberName: string | null,
  keyExpression: string | null,
  methodName: string | null,
  expression: ExpressionAstNode,
  observedExpression: ExpressionAstNode = expression,
): RuntimeConnectableObservedDependencyDraft {
  const memberNameSpan = observedMemberNameSpan(observedExpression);
  return {
    dependencyKind,
    expressionKind,
    sourceName,
    sourceRootName,
    memberName,
    keyExpression,
    methodName,
    memberNameSpanStart: memberNameSpan?.start ?? null,
    memberNameSpanEnd: memberNameSpan?.end ?? null,
    scopeLookupAncestor: observedScopeLookupAncestor(observedExpression),
    spanStart: expression.span.start,
    spanEnd: expression.span.end,
  };
}

function observedCollectionOwnerMemberName(
  expression: ExpressionAstNode,
): string | null {
  switch (expression.$kind) {
    case 'AccessMember':
      return expression.accessGlobal ? null : expression.name.name;
    case 'Paren':
      return observedCollectionOwnerMemberName(expression.expression);
    case 'BindingBehavior':
    case 'ValueConverter':
      return observedCollectionOwnerMemberName(expression.expression);
    default:
      return null;
  }
}

function observedMemberNameSpan(
  expression: ExpressionAstNode,
): { readonly start: number; readonly end: number } | null {
  switch (expression.$kind) {
    case 'AccessMember':
    case 'CallMember':
    // Scope reads carry the name token too so `$parent.title`-style lowerings keep a token-granular
    // address distinct from the whole scope-access span.
    case 'AccessScope':
    case 'CallScope':
      return { start: expression.name.span.start, end: expression.name.span.end };
    default:
      return null;
  }
}

function observedScopeLookupAncestor(
  expression: ExpressionAstNode,
): number | null {
  switch (expression.$kind) {
    case 'AccessScope':
    case 'CallScope':
      return expression.ancestor;
    case 'AccessMember':
    case 'AccessKeyed':
      return observedScopeLookupAncestor(expression.object);
    case 'CallMember':
      return observedScopeLookupAncestor(expression.object);
    case 'Paren':
    case 'BindingBehavior':
    case 'ValueConverter':
      return observedScopeLookupAncestor(expression.expression);
    default:
      return null;
  }
}
