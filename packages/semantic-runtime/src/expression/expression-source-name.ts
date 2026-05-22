import type { ExpressionAstNode } from './ast.js';

export function expressionSourceName(expression: ExpressionAstNode): string | null {
  switch (expression.$kind) {
    case 'Identifier':
      return expression.name;
    case 'AccessScope':
      return expression.name.name;
    case 'AccessThis':
      return expression.ancestor === 0 ? '$this' : `$parent:${expression.ancestor}`;
    case 'AccessGlobal':
      return expression.name.name;
    case 'AccessMember': {
      const object = expressionSourceName(expression.object);
      return object == null ? expression.name.name : `${object}.${expression.name.name}`;
    }
    case 'AccessKeyed': {
      const object = expressionSourceName(expression.object);
      const key = expressionSourceName(expression.key) ?? primitiveExpressionDisplay(expression.key) ?? '?';
      return object == null ? `[${key}]` : `${object}[${key}]`;
    }
    case 'CallScope':
      return `${expression.name.name}(${expressionSourceArgumentList(expression.args)})`;
    case 'CallGlobal':
      return `${expression.name.name}(${expressionSourceArgumentList(expression.args)})`;
    case 'CallMember': {
      const object = expressionSourceName(expression.object);
      const args = expressionSourceArgumentList(expression.args);
      return object == null ? `${expression.name.name}(${args})` : `${object}.${expression.name.name}(${args})`;
    }
    case 'CallFunction': {
      const func = expressionSourceName(expression.func);
      return func == null ? null : `${func}(${expressionSourceArgumentList(expression.args)})`;
    }
    case 'PrimitiveLiteral':
      return primitiveExpressionDisplay(expression);
    case 'Paren':
    case 'Unary':
      return expressionSourceName(expression.expression);
    case 'ValueConverter':
    case 'BindingBehavior':
      return expressionSourceName(expression.expression);
    case 'Binary':
      return infixExpressionSourceName(
        expressionSourceName(expression.left),
        expression.operation,
        expressionSourceName(expression.right),
      ) ?? compactExpressionSourceNames([
        expressionSourceName(expression.left),
        expressionSourceName(expression.right),
      ]);
    case 'Conditional':
      return conditionalExpressionSourceName(
        expressionSourceName(expression.condition),
        expressionSourceName(expression.yes),
        expressionSourceName(expression.no),
      ) ?? compactExpressionSourceNames([
        expressionSourceName(expression.condition),
        expressionSourceName(expression.yes),
        expressionSourceName(expression.no),
      ]);
    case 'Template':
    case 'Interpolation':
      return compactExpressionSourceNames(expression.expressions.map((part) => expressionSourceName(part)));
    case 'TaggedTemplate':
      return expressionSourceName(expression.func);
    default:
      return null;
  }
}

export function expressionSourceRootName(expression: ExpressionAstNode): string | null {
  switch (expression.$kind) {
    case 'Identifier':
      return expression.name;
    case 'AccessScope':
      return expression.name.name;
    case 'AccessThis':
      return expression.ancestor === 0 ? '$this' : `$parent:${expression.ancestor}`;
    case 'AccessGlobal':
      return expression.name.name;
    case 'AccessMember':
    case 'AccessKeyed':
    case 'CallMember':
      return expressionSourceRootName(expression.object);
    case 'CallScope':
    case 'CallGlobal':
      return expression.name.name;
    case 'CallFunction':
      return expressionSourceRootName(expression.func);
    case 'Paren':
    case 'Unary':
      return expressionSourceRootName(expression.expression);
    case 'ValueConverter':
    case 'BindingBehavior':
      return expressionSourceRootName(expression.expression);
    case 'Binary':
      return compactExpressionSourceNames([
        expressionSourceRootName(expression.left),
        expressionSourceRootName(expression.right),
      ]);
    case 'Conditional':
      return compactExpressionSourceNames([
        expressionSourceRootName(expression.condition),
        expressionSourceRootName(expression.yes),
        expressionSourceRootName(expression.no),
      ]);
    case 'Template':
    case 'Interpolation':
      return compactExpressionSourceNames(expression.expressions.map((part) => expressionSourceRootName(part)));
    case 'TaggedTemplate':
      return expressionSourceRootName(expression.func);
    default:
      return null;
  }
}

export function primitiveExpressionDisplay(expression: ExpressionAstNode): string | null {
  return expression.$kind === 'PrimitiveLiteral'
    ? JSON.stringify(expression.value)
    : null;
}

function expressionSourceArgumentList(
  expressions: readonly ExpressionAstNode[],
): string {
  const parts: string[] = [];
  for (const argument of expressions) {
    const display = expressionSourceName(argument) ?? primitiveExpressionDisplay(argument);
    if (display == null) {
      return '';
    }
    parts.push(display);
  }
  return parts.join(', ');
}

function infixExpressionSourceName(
  left: string | null,
  operation: string,
  right: string | null,
): string | null {
  return left == null || right == null ? null : `${left} ${operation} ${right}`;
}

function conditionalExpressionSourceName(
  condition: string | null,
  yes: string | null,
  no: string | null,
): string | null {
  return condition == null || yes == null || no == null ? null : `${condition} ? ${yes} : ${no}`;
}

export function compactExpressionSourceNames(
  names: readonly (string | null)[],
): string | null {
  const compact = names.filter((name): name is string => name != null);
  return compact.length === 0 ? null : [...new Set(compact)].join(', ');
}
