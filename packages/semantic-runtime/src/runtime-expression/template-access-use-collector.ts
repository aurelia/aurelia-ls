import type {
  AccessKeyedExpression,
  AccessMemberExpression,
  AccessScopeExpression,
  AccessThisExpression,
  ArrowFunction,
  BindingIdentifier,
  CallMemberExpression,
  CallScopeExpression,
  ExpressionAstNode,
} from '../expression/ast.js';
import { aureliaArrayMethodSemanticsFor } from '../expression/array-method-semantics.js';
import {
  AuthoredScopePathKind,
  expressionHasOptionalChain,
} from '../expression/ast.js';
import {
  RuntimeExpressionAccessCoverage,
  RuntimeExpressionAccessForm,
  RuntimeExpressionAccessOrigin,
  RuntimeExpressionAccessRole,
  RuntimeExpressionExecutionMaximum,
  RuntimeExpressionExecutionMinimum,
  RuntimeExpressionExecutionQualifierKind,
} from './runtime-expression-access-use.js';
import type {
  RuntimeExpressionAccessDraft,
  RuntimeExpressionExecutionQualifierDraft,
} from './runtime-expression-access-draft.js';

export type RuntimeTemplateArrayMethodPolicy = (
  expression: CallMemberExpression,
  rootExpression: ExpressionAstNode,
) => boolean;

export interface RuntimeTemplateAccessUseCollectionRequest {
  readonly expression: ExpressionAstNode;
  readonly canUseRuntimeArrayMethod?: RuntimeTemplateArrayMethodPolicy | null;
  readonly rootRole?: RuntimeExpressionAccessRole;
}

interface AccessCollectionContext {
  readonly callbackLocalDeclarations: ReadonlyMap<string, BindingIdentifier>;
  readonly callbackScopeDepth: number;
  readonly qualifiers: readonly RuntimeExpressionExecutionQualifierDraft[];
  readonly minimumExecutions: RuntimeExpressionExecutionMinimum;
  readonly maximumExecutions: RuntimeExpressionExecutionMaximum;
  readonly coverage: RuntimeExpressionAccessCoverage;
  readonly coverageReason: string | null;
  readonly rootExpression: ExpressionAstNode;
  readonly canUseRuntimeArrayMethod: RuntimeTemplateArrayMethodPolicy | null;
}

/** Collect every authored named/keyed access in one already-separated Aurelia expression operation. */
export function collectRuntimeTemplateAccessUseDrafts(
  request: RuntimeTemplateAccessUseCollectionRequest,
): readonly RuntimeExpressionAccessDraft[] {
  const rows: RuntimeExpressionAccessDraft[] = [];
  collectAccessUses(request.expression, rows, {
    callbackLocalDeclarations: new Map<string, BindingIdentifier>(),
    callbackScopeDepth: 0,
    qualifiers: [],
    minimumExecutions: RuntimeExpressionExecutionMinimum.One,
    maximumExecutions: RuntimeExpressionExecutionMaximum.One,
    coverage: RuntimeExpressionAccessCoverage.Complete,
    coverageReason: null,
    rootExpression: request.expression,
    canUseRuntimeArrayMethod: request.canUseRuntimeArrayMethod ?? null,
  }, request.rootRole ?? RuntimeExpressionAccessRole.Read);
  return rows;
}

function collectAccessUses(
  expression: ExpressionAstNode,
  rows: RuntimeExpressionAccessDraft[],
  context: AccessCollectionContext,
  role: RuntimeExpressionAccessRole = RuntimeExpressionAccessRole.Read,
): void {
  switch (expression.$kind) {
    case 'Identifier':
    case 'PrimitiveLiteral':
    case 'AccessBoundary':
    case 'BindingIdentifier':
    case 'BindingPatternHole':
    case 'Custom':
      return;
    case 'AccessThis':
      addAccess(rows, expression, context, role, RuntimeExpressionAccessForm.This, {
        scopeLookupAncestor: expression.ancestor,
        ...authoredScopeDepth(expression, context.callbackScopeDepth),
        lexicalLocal: false,
        lexicalDeclarationSpan: null,
      });
      return;
    case 'AccessGlobal':
      addAccess(rows, expression, context, role, RuntimeExpressionAccessForm.Global, {
        scopeLookupAncestor: null,
        authoredScopeAncestor: null,
        callbackScopeDepth: null,
        lexicalLocal: false,
        lexicalDeclarationSpan: null,
      });
      return;
    case 'AccessScope':
      addScopeAccess(rows, expression, context, role, RuntimeExpressionAccessForm.Scope);
      return;
    case 'AccessMember': {
      collectAccessUses(expression.object, rows, context);
      addMemberAccess(rows, expression, context, role, RuntimeExpressionAccessForm.Member);
      return;
    }
    case 'AccessKeyed': {
      collectAccessUses(expression.object, rows, context);
      const keyedContext = optionalContext(
        context,
        expression.optional || expressionHasOptionalChain(expression.object),
        expression,
      );
      collectAccessUses(expression.key, rows, keyedContext);
      addKeyedAccess(rows, expression, context, role);
      return;
    }
    case 'Paren':
      collectAccessUses(expression.expression, rows, context, role);
      return;
    case 'Unary':
      collectAccessUses(
        expression.expression,
        rows,
        context,
        expression.operation === '++' || expression.operation === '--'
          ? RuntimeExpressionAccessRole.ReadWriteTarget
          : role,
      );
      return;
    case 'BindingBehavior':
      // Resource arguments are separate runtime operation slots and are collected by the source-context projector.
      collectAccessUses(expression.expression, rows, context, role);
      return;
    case 'ValueConverter':
      // Converter arguments are separate source-evaluation operation slots.
      collectAccessUses(expression.expression, rows, context, role);
      return;
    case 'Assign':
      collectAccessUses(
        expression.target,
        rows,
        context,
        expression.op === '='
          ? RuntimeExpressionAccessRole.WriteTarget
          : RuntimeExpressionAccessRole.ReadWriteTarget,
      );
      collectAccessUses(expression.value, rows, context);
      return;
    case 'Conditional':
      collectAccessUses(expression.condition, rows, context);
      collectAccessUses(
        expression.yes,
        rows,
        qualifiedContext(
          context,
          RuntimeExpressionExecutionQualifierKind.ConditionalTrueArm,
          expression.condition,
          null,
          false,
        ),
      );
      collectAccessUses(
        expression.no,
        rows,
        qualifiedContext(
          context,
          RuntimeExpressionExecutionQualifierKind.ConditionalFalseArm,
          expression.condition,
          null,
          false,
        ),
      );
      return;
    case 'Binary':
      collectAccessUses(expression.left, rows, context);
      collectAccessUses(
        expression.right,
        rows,
        expression.operation === '&&' || expression.operation === '||' || expression.operation === '??'
          ? qualifiedContext(
              context,
              RuntimeExpressionExecutionQualifierKind.ShortCircuitRightHandSide,
              expression.left,
              expression.operation,
              false,
            )
          : context,
      );
      return;
    case 'ArrayLiteral':
      expression.elements.forEach((element) => collectAccessUses(element, rows, context));
      return;
    case 'ObjectLiteral':
      expression.values.forEach((value) => collectAccessUses(value, rows, context));
      return;
    case 'Template':
    case 'Interpolation':
      expression.expressions.forEach((part) => collectAccessUses(part, rows, context));
      return;
    case 'TaggedTemplate':
      collectAccessUses(expression.func, rows, context, RuntimeExpressionAccessRole.Call);
      expression.expressions.forEach((part) => collectAccessUses(part, rows, context));
      return;
    case 'New':
      collectAccessUses(expression.func, rows, context, RuntimeExpressionAccessRole.Call);
      expression.args.forEach((arg) => collectAccessUses(arg, rows, context));
      return;
    case 'CallScope':
      addScopeAccess(
        rows,
        expression,
        optionalContext(context, expression.optionalAccess, expression),
        RuntimeExpressionAccessRole.Call,
        RuntimeExpressionAccessForm.ScopeCall,
      );
      expression.args.forEach((arg) => collectCallArgument(
        arg,
        rows,
        optionalContext(context, expression.optional || expression.optionalAccess, expression),
        null,
      ));
      return;
    case 'CallMember':
      collectCallMemberAccessUses(expression, rows, context);
      return;
    case 'CallFunction':
      collectAccessUses(expression.func, rows, context, RuntimeExpressionAccessRole.Call);
      expression.args.forEach((arg) => collectCallArgument(
        arg,
        rows,
        optionalContext(context, expression.optional, expression),
        null,
      ));
      return;
    case 'CallGlobal':
      addAccess(rows, expression, context, RuntimeExpressionAccessRole.Call, RuntimeExpressionAccessForm.Global, {
        scopeLookupAncestor: null,
        authoredScopeAncestor: null,
        callbackScopeDepth: null,
        lexicalLocal: false,
        lexicalDeclarationSpan: null,
      });
      expression.args.forEach((arg) => collectCallArgument(arg, rows, context, null));
      return;
    case 'ForOfStatement':
      collectAccessUses(expression.iterable, rows, context);
      collectBindingPatternDefaults(expression.declaration, rows, context);
      return;
    case 'BindingPatternDefault':
      collectBindingPatternDefaults(expression.target, rows, context);
      collectAccessUses(expression.default, rows, context);
      return;
    case 'ArrayBindingPattern':
      expression.elements.forEach((element) => collectBindingPatternDefaults(element, rows, context));
      if (expression.rest != null) {
        collectBindingPatternDefaults(expression.rest, rows, context);
      }
      return;
    case 'ObjectBindingPattern':
      expression.properties.forEach((property) => collectBindingPatternDefaults(property.value, rows, context));
      if (expression.rest != null) {
        collectBindingPatternDefaults(expression.rest, rows, context);
      }
      return;
    case 'DestructuringAssignment':
      collectBindingPatternDefaults(expression.pattern, rows, context);
      collectAccessUses(expression.source, rows, context);
      return;
    case 'ArrowFunction':
      collectArrowFunctionBody(expression, rows, openInvocationContext(context, null, expression));
      return;
  }
  const exhaustive: never = expression;
  return exhaustive;
}

function collectCallMemberAccessUses(
  expression: CallMemberExpression,
  rows: RuntimeExpressionAccessDraft[],
  context: AccessCollectionContext,
): void {
  collectAccessUses(expression.object, rows, context);
  addMemberAccess(
    rows,
    expression,
    optionalContext(
      context,
      expression.optionalMember || expressionHasOptionalChain(expression.object),
      expression,
    ),
    RuntimeExpressionAccessRole.Call,
    RuntimeExpressionAccessForm.MemberCall,
  );

  const semantics = aureliaArrayMethodSemanticsFor(expression.name.name);
  const canUseRuntimeArrayMethod = semantics?.callbackParameterShape != null
    && (context.canUseRuntimeArrayMethod?.(expression, context.rootExpression) ?? true);

  expression.args.forEach((arg) => collectCallArgument(
    arg,
    rows,
    optionalContext(context, expression.optionalMember || expression.optionalCall, expression),
    canUseRuntimeArrayMethod && semantics?.callbackParameterShape != null
      ? expression.name.name
      : null,
  ));
}

function collectCallArgument(
  expression: ExpressionAstNode,
  rows: RuntimeExpressionAccessDraft[],
  context: AccessCollectionContext,
  synchronousMethodName: string | null,
): void {
  if (expression.$kind !== 'ArrowFunction') {
    collectAccessUses(expression, rows, context);
    return;
  }
  const callbackContext = synchronousMethodName == null
    ? openInvocationContext(context, null, expression)
    : qualifiedContext(
        context,
        RuntimeExpressionExecutionQualifierKind.SynchronousCallback,
        expression,
        synchronousMethodName,
        true,
      );
  collectArrowFunctionBody(expression, rows, callbackContext);
}

function collectArrowFunctionBody(
  expression: ArrowFunction,
  rows: RuntimeExpressionAccessDraft[],
  context: AccessCollectionContext,
): void {
  const callbackLocalDeclarations = new Map(context.callbackLocalDeclarations);
  for (const parameter of expression.args) {
    callbackLocalDeclarations.set(parameter.name.name, parameter);
  }
  collectAccessUses(expression.body, rows, {
    ...context,
    callbackLocalDeclarations,
    callbackScopeDepth: context.callbackScopeDepth + 1,
  });
}

function collectBindingPatternDefaults(
  expression: ExpressionAstNode,
  rows: RuntimeExpressionAccessDraft[],
  context: AccessCollectionContext,
): void {
  switch (expression.$kind) {
    case 'BindingPatternDefault':
      collectBindingPatternDefaults(expression.target, rows, context);
      collectAccessUses(expression.default, rows, context);
      return;
    case 'ArrayBindingPattern':
      expression.elements.forEach((element) => collectBindingPatternDefaults(element, rows, context));
      if (expression.rest != null) {
        collectBindingPatternDefaults(expression.rest, rows, context);
      }
      return;
    case 'ObjectBindingPattern':
      expression.properties.forEach((property) => collectBindingPatternDefaults(property.value, rows, context));
      if (expression.rest != null) {
        collectBindingPatternDefaults(expression.rest, rows, context);
      }
      return;
    case 'BindingIdentifier':
    case 'BindingPatternHole':
      return;
    default:
      collectAccessUses(expression, rows, context);
  }
}

function addScopeAccess(
  rows: RuntimeExpressionAccessDraft[],
  expression: AccessScopeExpression | CallScopeExpression,
  context: AccessCollectionContext,
  role: RuntimeExpressionAccessRole,
  accessForm: RuntimeExpressionAccessForm,
): void {
  const lexicalDeclaration = rootCallbackLocalDeclaration(
    expression,
    context.callbackLocalDeclarations,
  );
  addAccess(rows, expression, context, role, accessForm, {
    scopeLookupAncestor: expression.ancestor,
    ...authoredScopeDepth(expression, context.callbackScopeDepth),
    lexicalLocal: lexicalDeclaration != null,
    lexicalDeclarationSpan: lexicalDeclaration?.name.span ?? null,
  });
}

function addMemberAccess(
  rows: RuntimeExpressionAccessDraft[],
  expression: AccessMemberExpression | CallMemberExpression,
  context: AccessCollectionContext,
  role: RuntimeExpressionAccessRole,
  accessForm: RuntimeExpressionAccessForm,
): void {
  if ('accessGlobal' in expression && expression.accessGlobal) {
    return;
  }
  const memberContext = expression.$kind === 'AccessMember'
    ? optionalContext(context, expression.optional || expressionHasOptionalChain(expression.object), expression)
    : context;
  const lexicalDeclaration = rootCallbackLocalDeclaration(
    expression,
    context.callbackLocalDeclarations,
  );
  addAccess(rows, expression, memberContext, role, accessForm, {
    scopeLookupAncestor: observedScopeLookupAncestor(expression),
    ...observedAuthoredScopeDepth(expression, context.callbackScopeDepth),
    lexicalLocal: lexicalDeclaration != null,
    lexicalDeclarationSpan: null,
  });
}

function addKeyedAccess(
  rows: RuntimeExpressionAccessDraft[],
  expression: AccessKeyedExpression,
  context: AccessCollectionContext,
  role: RuntimeExpressionAccessRole,
): void {
  if (expression.accessGlobal) {
    return;
  }
  addAccess(
    rows,
    expression,
    optionalContext(context, expression.optional || expressionHasOptionalChain(expression.object), expression),
    role,
    RuntimeExpressionAccessForm.Keyed,
    {
      scopeLookupAncestor: observedScopeLookupAncestor(expression),
      ...observedAuthoredScopeDepth(expression, context.callbackScopeDepth),
      lexicalLocal: rootCallbackLocalDeclaration(
        expression,
        context.callbackLocalDeclarations,
      ) != null,
      lexicalDeclarationSpan: null,
    },
  );
}

function addAccess(
  rows: RuntimeExpressionAccessDraft[],
  expression: ExpressionAstNode,
  context: AccessCollectionContext,
  role: RuntimeExpressionAccessRole,
  accessForm: RuntimeExpressionAccessForm,
  shape: {
    readonly scopeLookupAncestor: number | null;
    readonly authoredScopeAncestor: number | null;
    readonly callbackScopeDepth: number | null;
    readonly lexicalLocal: boolean;
    readonly lexicalDeclarationSpan: ExpressionAstNode['span'] | null;
  },
): void {
  const memberSpan = memberNameSpanForExpression(expression);
  rows.push({
    expression,
    origin: RuntimeExpressionAccessOrigin.Authored,
    accessForm,
    role,
    scopeLookupAncestor: shape.scopeLookupAncestor,
    authoredScopeAncestor: shape.authoredScopeAncestor,
    callbackScopeDepth: shape.callbackScopeDepth,
    lexicalLocal: shape.lexicalLocal,
    executionQualifiers: context.qualifiers,
    minimumExecutions: context.minimumExecutions,
    maximumExecutions: context.maximumExecutions,
    coverage: context.coverage,
    coverageReason: context.coverageReason,
    sourceSpan: expression.span,
    nameSourceSpan: memberSpan,
    lexicalDeclarationSpan: shape.lexicalDeclarationSpan,
  });
}

function optionalContext(
  context: AccessCollectionContext,
  optional: boolean,
  source: ExpressionAstNode,
): AccessCollectionContext {
  return optional
    ? qualifiedContext(
        context,
        RuntimeExpressionExecutionQualifierKind.OptionalContinuation,
        source,
        null,
        false,
      )
    : context;
}

function openInvocationContext(
  context: AccessCollectionContext,
  operationName: string | null,
  source: ExpressionAstNode,
): AccessCollectionContext {
  return {
    ...qualifiedContext(
      context,
      RuntimeExpressionExecutionQualifierKind.OpenInvocation,
      source,
      operationName,
      true,
    ),
    coverage: RuntimeExpressionAccessCoverage.Open,
    coverageReason: 'The callback invocation timing and active observation context are not statically closed.',
  };
}

function qualifiedContext(
  context: AccessCollectionContext,
  kind: RuntimeExpressionExecutionQualifierKind,
  source: ExpressionAstNode,
  operationName: string | null,
  many: boolean,
): AccessCollectionContext {
  return {
    ...context,
    qualifiers: [...context.qualifiers, {
      kind,
      sourceSpan: source.span,
      operationName,
    }],
    minimumExecutions: RuntimeExpressionExecutionMinimum.Zero,
    maximumExecutions: many
      ? RuntimeExpressionExecutionMaximum.Many
      : context.maximumExecutions,
  };
}

function memberNameSpanForExpression(
  expression: ExpressionAstNode,
): ExpressionAstNode['span'] | null {
  switch (expression.$kind) {
    case 'AccessThis':
      return expression.span;
    case 'AccessGlobal':
    case 'AccessMember':
    case 'CallGlobal':
    case 'CallMember':
    case 'AccessScope':
    case 'CallScope':
      return expression.name.span;
    case 'AccessKeyed':
      return expression.key.span;
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

function observedAuthoredScopeDepth(
  expression: ExpressionAstNode,
  callbackScopeDepth: number,
): {
  readonly authoredScopeAncestor: number | null;
  readonly callbackScopeDepth: number | null;
} {
  switch (expression.$kind) {
    case 'AccessScope':
    case 'CallScope':
    case 'AccessThis':
      return authoredScopeDepth(expression, callbackScopeDepth);
    case 'AccessMember':
    case 'AccessKeyed':
    case 'CallMember':
      return observedAuthoredScopeDepth(expression.object, callbackScopeDepth);
    case 'Paren':
    case 'BindingBehavior':
    case 'ValueConverter':
      return observedAuthoredScopeDepth(expression.expression, callbackScopeDepth);
    default:
      return {
        authoredScopeAncestor: null,
        callbackScopeDepth: null,
      };
  }
}

function authoredScopeDepth(
  expression: AccessScopeExpression | CallScopeExpression | AccessThisExpression,
  callbackScopeDepth: number,
): {
  readonly authoredScopeAncestor: number | null;
  readonly callbackScopeDepth: number | null;
} {
  const path = expression.authoredScopePath;
  if (path == null) {
    return {
      authoredScopeAncestor: null,
      callbackScopeDepth,
    };
  }
  const authoredScopeAncestor = path.pathKind === AuthoredScopePathKind.CurrentBindingContext
    ? 0
    : path.qualifierSpans.length;
  return {
    authoredScopeAncestor,
    callbackScopeDepth,
  };
}

function rootCallbackLocalDeclaration(
  expression: ExpressionAstNode,
  callbackLocalDeclarations: ReadonlyMap<string, BindingIdentifier>,
): BindingIdentifier | null {
  switch (expression.$kind) {
    case 'AccessScope':
    case 'CallScope':
      return expression.ancestor === 0
        && expression.authoredScopePath == null
        ? callbackLocalDeclarations.get(expression.name.name) ?? null
        : null;
    case 'AccessMember':
    case 'AccessKeyed':
    case 'CallMember':
      return rootCallbackLocalDeclaration(expression.object, callbackLocalDeclarations);
    case 'Paren':
    case 'BindingBehavior':
    case 'ValueConverter':
      return rootCallbackLocalDeclaration(expression.expression, callbackLocalDeclarations);
    default:
      return null;
  }
}
