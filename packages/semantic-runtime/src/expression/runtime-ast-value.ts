import type {
  AssignmentOperator,
  BinaryOperator,
  ExpressionAstNode,
  ExpressionPrimitiveLiteralValue,
  UnaryOperator,
} from './ast.js';

export type RuntimeExpressionAstPath = readonly (string | number)[];

/** Framework-shaped plain AST value; source spans and authoring-only intent never enter this graph. */
export type RuntimeExpressionAstValue =
  | {
      readonly $kind: 'BindingBehavior';
      readonly key: string;
      readonly expression: RuntimeExpressionAstValue;
      readonly name: string;
      readonly args: readonly RuntimeExpressionAstValue[];
    }
  | {
      readonly $kind: 'ValueConverter';
      readonly expression: RuntimeExpressionAstValue;
      readonly name: string;
      readonly args: readonly RuntimeExpressionAstValue[];
    }
  | {
      readonly $kind: 'Assign';
      readonly target: RuntimeExpressionAstValue;
      readonly value: RuntimeExpressionAstValue;
      readonly op: AssignmentOperator;
    }
  | {
      readonly $kind: 'Conditional';
      readonly condition: RuntimeExpressionAstValue;
      readonly yes: RuntimeExpressionAstValue;
      readonly no: RuntimeExpressionAstValue;
    }
  | { readonly $kind: 'AccessGlobal'; readonly name: string }
  | { readonly $kind: 'AccessThis'; readonly ancestor: number }
  | { readonly $kind: 'AccessBoundary' }
  | { readonly $kind: 'AccessScope'; readonly name: string; readonly ancestor: number }
  | {
      readonly $kind: 'AccessMember';
      readonly accessGlobal: boolean;
      readonly object: RuntimeExpressionAstValue;
      readonly name: string;
      readonly optional: boolean;
    }
  | {
      readonly $kind: 'AccessKeyed';
      readonly accessGlobal: boolean;
      readonly object: RuntimeExpressionAstValue;
      readonly key: RuntimeExpressionAstValue;
      readonly optional: boolean;
    }
  | { readonly $kind: 'New'; readonly func: RuntimeExpressionAstValue; readonly args: readonly RuntimeExpressionAstValue[] }
  | {
      readonly $kind: 'CallScope';
      readonly name: string;
      readonly args: readonly RuntimeExpressionAstValue[];
      readonly ancestor: number;
      readonly optional: boolean;
    }
  | {
      readonly $kind: 'CallMember';
      readonly object: RuntimeExpressionAstValue;
      readonly name: string;
      readonly args: readonly RuntimeExpressionAstValue[];
      readonly optionalMember: boolean;
      readonly optionalCall: boolean;
    }
  | {
      readonly $kind: 'CallFunction';
      readonly func: RuntimeExpressionAstValue;
      readonly args: readonly RuntimeExpressionAstValue[];
      readonly optional: boolean;
    }
  | { readonly $kind: 'CallGlobal'; readonly name: string; readonly args: readonly RuntimeExpressionAstValue[] }
  | {
      readonly $kind: 'Binary';
      readonly operation: BinaryOperator;
      readonly left: RuntimeExpressionAstValue;
      readonly right: RuntimeExpressionAstValue;
    }
  | {
      readonly $kind: 'Unary';
      readonly operation: UnaryOperator;
      readonly expression: RuntimeExpressionAstValue;
      readonly pos: 0 | 1;
    }
  | { readonly $kind: 'PrimitiveLiteral'; readonly value: ExpressionPrimitiveLiteralValue }
  | { readonly $kind: 'ArrayLiteral'; readonly elements: readonly RuntimeExpressionAstValue[] }
  | {
      readonly $kind: 'ObjectLiteral';
      readonly keys: readonly (number | string)[];
      readonly values: readonly RuntimeExpressionAstValue[];
    }
  | { readonly $kind: 'Template'; readonly cooked: readonly string[]; readonly expressions: readonly RuntimeExpressionAstValue[] }
  | {
      readonly $kind: 'TaggedTemplate';
      readonly cooked: readonly string[] & { readonly raw?: readonly string[] };
      readonly func: RuntimeExpressionAstValue;
      readonly expressions: readonly RuntimeExpressionAstValue[];
    }
  | { readonly $kind: 'BindingIdentifier'; readonly name: string }
  | {
      readonly $kind: 'ForOfStatement';
      readonly declaration: RuntimeExpressionAstValue;
      readonly iterable: RuntimeExpressionAstValue;
      readonly semiIdx: number;
    }
  | {
      readonly $kind: 'Interpolation';
      readonly isMulti: boolean;
      readonly firstExpression: RuntimeExpressionAstValue;
      readonly parts: readonly string[];
      readonly expressions: readonly RuntimeExpressionAstValue[];
    }
  | {
      readonly $kind: 'ArrowFunction';
      readonly args: readonly RuntimeExpressionAstValue[];
      readonly body: RuntimeExpressionAstValue;
      readonly rest: boolean;
    };

export const enum RuntimeExpressionAstProjectionState {
  Exact = 'exact',
  Pending = 'pending',
}

export const enum RuntimeExpressionAstProjectionReasonKind {
  OptionalScopeAccessUnsupported = 'optional-scope-access-unsupported',
  OptionalAncestorCallAccessUnsupported = 'optional-ancestor-call-access-unsupported',
  GlobalCallOptionalIntentUnavailable = 'global-call-optional-intent-unavailable',
  BindingPatternRepresentationPending = 'binding-pattern-representation-pending',
  DestructuringRepresentationPending = 'destructuring-representation-pending',
  CustomExpressionBehaviorPending = 'custom-expression-behavior-pending',
  IdentifierNotRuntimeExpression = 'identifier-not-runtime-expression',
}

export class RuntimeExpressionAstProjectionReason {
  constructor(
    readonly reasonKind: RuntimeExpressionAstProjectionReasonKind,
    readonly expressionKind: ExpressionAstNode['$kind'],
    readonly path: RuntimeExpressionAstPath,
    readonly summary: string,
  ) {}
}

export class RuntimeExpressionAstProjectionResult {
  constructor(
    readonly state: RuntimeExpressionAstProjectionState,
    readonly value: RuntimeExpressionAstValue | null,
    readonly reasons: readonly RuntimeExpressionAstProjectionReason[],
  ) {
    if (
      (state === RuntimeExpressionAstProjectionState.Exact) !== (value != null && reasons.length === 0)
      || (state === RuntimeExpressionAstProjectionState.Pending) !== (value == null && reasons.length > 0)
    ) {
      throw new Error('Runtime expression AST projection lost exact or pending ownership.');
    }
  }
}

/** Project semantic-runtime's source-rich AST into Aurelia's plain runtime expression value graph. */
export function projectRuntimeExpressionAstValue(
  expression: ExpressionAstNode,
): RuntimeExpressionAstProjectionResult {
  const projector = new RuntimeExpressionAstValueProjector();
  const value = projector.project(expression, []);
  return value == null
    ? new RuntimeExpressionAstProjectionResult(
        RuntimeExpressionAstProjectionState.Pending,
        null,
        projector.reasons,
      )
    : new RuntimeExpressionAstProjectionResult(RuntimeExpressionAstProjectionState.Exact, value, []);
}

class RuntimeExpressionAstValueProjector {
  readonly reasons: RuntimeExpressionAstProjectionReason[] = [];

  project(expression: ExpressionAstNode, path: RuntimeExpressionAstPath): RuntimeExpressionAstValue | null {
    switch (expression.$kind) {
      case 'Identifier':
        return this.pending(
          RuntimeExpressionAstProjectionReasonKind.IdentifierNotRuntimeExpression,
          expression,
          path,
          'Parser Identifier is a semantic child carrier, not an Aurelia runtime expression node.',
        );
      case 'BindingBehavior': {
        const input = this.project(expression.expression, [...path, 'expression']);
        const args = this.projectAll(expression.args, [...path, 'args']);
        return input == null || args == null ? null : {
          $kind: 'BindingBehavior',
          key: expression.key,
          expression: input,
          name: expression.name.name,
          args,
        };
      }
      case 'ValueConverter': {
        const input = this.project(expression.expression, [...path, 'expression']);
        const args = this.projectAll(expression.args, [...path, 'args']);
        return input == null || args == null ? null : {
          $kind: 'ValueConverter',
          expression: input,
          name: expression.name.name,
          args,
        };
      }
      case 'Assign': {
        const target = this.project(expression.target, [...path, 'target']);
        const value = this.project(expression.value, [...path, 'value']);
        return target == null || value == null ? null : { $kind: 'Assign', target, value, op: expression.op };
      }
      case 'Conditional': {
        const condition = this.project(expression.condition, [...path, 'condition']);
        const yes = this.project(expression.yes, [...path, 'yes']);
        const no = this.project(expression.no, [...path, 'no']);
        return condition == null || yes == null || no == null
          ? null
          : { $kind: 'Conditional', condition, yes, no };
      }
      case 'AccessGlobal':
        return { $kind: 'AccessGlobal', name: expression.name.name };
      case 'AccessThis':
        return { $kind: 'AccessThis', ancestor: expression.ancestor };
      case 'AccessBoundary':
        return { $kind: 'AccessBoundary' };
      case 'AccessScope':
        return expression.optional
          ? this.pending(
              RuntimeExpressionAstProjectionReasonKind.OptionalScopeAccessUnsupported,
              expression,
              path,
              'Semantic optional AccessScope intent has no RC2 runtime AST field.',
            )
          : { $kind: 'AccessScope', name: expression.name.name, ancestor: expression.ancestor };
      case 'AccessMember': {
        const object = this.project(expression.object, [...path, 'object']);
        return object == null ? null : {
          $kind: 'AccessMember',
          accessGlobal: expression.accessGlobal,
          object,
          name: expression.name.name,
          optional: expression.optional,
        };
      }
      case 'AccessKeyed': {
        const object = this.project(expression.object, [...path, 'object']);
        const key = this.project(expression.key, [...path, 'key']);
        return object == null || key == null ? null : {
          $kind: 'AccessKeyed',
          accessGlobal: expression.accessGlobal,
          object,
          key,
          optional: expression.optional,
        };
      }
      case 'Paren':
        return this.project(expression.expression, path);
      case 'New': {
        const func = this.project(expression.func, [...path, 'func']);
        const args = this.projectAll(expression.args, [...path, 'args']);
        return func == null || args == null ? null : { $kind: 'New', func, args };
      }
      case 'CallScope': {
        const args = this.projectAll(expression.args, [...path, 'args']);
        if (expression.optionalAccess) {
          this.pending(
            RuntimeExpressionAstProjectionReasonKind.OptionalAncestorCallAccessUnsupported,
            expression,
            path,
            'Semantic optional ancestor CallScope access has no RC2 runtime AST field.',
          );
          return null;
        }
        return args == null ? null : {
          $kind: 'CallScope',
          name: expression.name.name,
          args,
          ancestor: expression.ancestor,
          optional: expression.optional,
        };
      }
      case 'CallMember': {
        const object = this.project(expression.object, [...path, 'object']);
        const args = this.projectAll(expression.args, [...path, 'args']);
        return object == null || args == null ? null : {
          $kind: 'CallMember',
          object,
          name: expression.name.name,
          args,
          optionalMember: expression.optionalMember,
          optionalCall: expression.optionalCall,
        };
      }
      case 'CallFunction': {
        const func = this.project(expression.func, [...path, 'func']);
        const args = this.projectAll(expression.args, [...path, 'args']);
        if (func == null || args == null) return null;
        if (func.$kind === 'AccessScope') {
          return {
            $kind: 'CallScope',
            name: func.name,
            args,
            ancestor: func.ancestor,
            optional: expression.optional,
          };
        }
        if (func.$kind === 'AccessMember') {
          return {
            $kind: 'CallMember',
            object: func.object,
            name: func.name,
            args,
            optionalMember: func.optional,
            optionalCall: expression.optional,
          };
        }
        if (func.$kind === 'AccessGlobal' && !expression.optional) {
          return { $kind: 'CallGlobal', name: func.name, args };
        }
        return { $kind: 'CallFunction', func, args, optional: expression.optional };
      }
      case 'CallGlobal': {
        this.projectAll(expression.args, [...path, 'args']);
        this.pending(
          RuntimeExpressionAstProjectionReasonKind.GlobalCallOptionalIntentUnavailable,
          expression,
          path,
          'Semantic CallGlobal does not retain the RC2 optional-call distinction.',
        );
        return null;
      }
      case 'Binary': {
        const left = this.project(expression.left, [...path, 'left']);
        const right = this.project(expression.right, [...path, 'right']);
        return left == null || right == null
          ? null
          : { $kind: 'Binary', operation: expression.operation, left, right };
      }
      case 'Unary': {
        const input = this.project(expression.expression, [...path, 'expression']);
        return input == null
          ? null
          : { $kind: 'Unary', operation: expression.operation, expression: input, pos: expression.pos };
      }
      case 'PrimitiveLiteral':
        return { $kind: 'PrimitiveLiteral', value: expression.value };
      case 'ArrayLiteral': {
        const elements = this.projectAll(expression.elements, [...path, 'elements']);
        return elements == null ? null : { $kind: 'ArrayLiteral', elements };
      }
      case 'ObjectLiteral': {
        const values = this.projectAll(expression.values, [...path, 'values']);
        return values == null ? null : { $kind: 'ObjectLiteral', keys: [...expression.keys], values };
      }
      case 'Template': {
        const expressions = this.projectAll(expression.expressions, [...path, 'expressions']);
        return expressions == null ? null : { $kind: 'Template', cooked: [...expression.cooked], expressions };
      }
      case 'TaggedTemplate': {
        const func = this.project(expression.func, [...path, 'func']);
        const expressions = this.projectAll(expression.expressions, [...path, 'expressions']);
        if (func == null || expressions == null) return null;
        const cooked: string[] & { raw?: string[] } = [...expression.cooked];
        if (expression.cooked.raw != null) cooked.raw = [...expression.cooked.raw];
        return { $kind: 'TaggedTemplate', cooked, func, expressions };
      }
      case 'BindingIdentifier':
        return { $kind: 'BindingIdentifier', name: expression.name.name };
      case 'ForOfStatement': {
        const iterable = this.project(expression.iterable, [...path, 'iterable']);
        if (expression.declaration.$kind !== 'BindingIdentifier') {
          this.pending(
            RuntimeExpressionAstProjectionReasonKind.BindingPatternRepresentationPending,
            expression.declaration,
            [...path, 'declaration'],
            'Semantic binding-pattern representation needs an explicit RC2 runtime pattern conversion.',
          );
          return null;
        }
        const declaration = this.project(expression.declaration, [...path, 'declaration']);
        return declaration == null || iterable == null ? null : {
          $kind: 'ForOfStatement',
          declaration,
          iterable,
          semiIdx: expression.semiIdx,
        };
      }
      case 'Interpolation': {
        const expressions = this.projectAll(expression.expressions, [...path, 'expressions']);
        if (expressions == null || expressions.length === 0) {
          throw new Error('Runtime Interpolation projection requires its parser-owned nonempty expression band.');
        }
        return {
          $kind: 'Interpolation',
          isMulti: expression.isMulti,
          firstExpression: expressions[0]!,
          parts: [...expression.parts],
          expressions,
        };
      }
      case 'BindingPatternDefault':
      case 'BindingPatternHole':
      case 'ArrayBindingPattern':
      case 'ObjectBindingPattern':
        return this.pending(
          RuntimeExpressionAstProjectionReasonKind.BindingPatternRepresentationPending,
          expression,
          path,
          'Semantic binding-pattern representation needs an explicit RC2 runtime pattern conversion.',
        );
      case 'DestructuringAssignment':
        return this.pending(
          RuntimeExpressionAstProjectionReasonKind.DestructuringRepresentationPending,
          expression,
          path,
          'Semantic destructuring representation differs from RC2 runtime leaf/source graphs.',
        );
      case 'ArrowFunction': {
        const args = this.projectAll(expression.args, [...path, 'args']);
        const body = this.project(expression.body, [...path, 'body']);
        return args == null || body == null ? null : { $kind: 'ArrowFunction', args, body, rest: expression.rest };
      }
      case 'Custom':
        return this.pending(
          RuntimeExpressionAstProjectionReasonKind.CustomExpressionBehaviorPending,
          expression,
          path,
          'CustomExpression requires runtime behavior methods and cannot project as plain data.',
        );
    }
  }

  private projectAll(
    expressions: readonly ExpressionAstNode[],
    path: RuntimeExpressionAstPath,
  ): readonly RuntimeExpressionAstValue[] | null {
    const values = expressions.map((expression, index) => this.project(expression, [...path, index]));
    return values.some((value) => value == null)
      ? null
      : values as readonly RuntimeExpressionAstValue[];
  }

  private pending(
    reasonKind: RuntimeExpressionAstProjectionReasonKind,
    expression: ExpressionAstNode,
    path: RuntimeExpressionAstPath,
    summary: string,
  ): null {
    this.reasons.push(new RuntimeExpressionAstProjectionReason(reasonKind, expression.$kind, path, summary));
    return null;
  }
}
