import ts from 'typescript';
import type { ProductDetailReadView } from '../kernel/product-details.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import { checkerMemberForOwnerType, readCheckerTypeShapeByProductHandle } from '../type-system/checker-type-shape-access.js';
import { readVisibleTemplateResourceDefinition } from './compiler-resource-lookup.js';
import type { TemplateVisibleResource } from './compiler-world-reference.js';

/** Static bind-time effects that can be read from a binding-behavior implementation body. */
export class RuntimeBindingBehaviorBindEffects {
  constructor(
    /** Direct top-level calls to `binding.useTargetSubscriber(...)` in the behavior's bind method body. */
    readonly directTargetSubscriberCalls: number,
  ) {}
}

/** Reads framework-relevant bind effects from visible binding-behavior resources. */
export class RuntimeBindingBehaviorBindEffectReader {
  private readonly effectsByResource = new Map<string, RuntimeBindingBehaviorBindEffects>();

  constructor(
    readonly store: ProductDetailReadView,
  ) {}

  readEffects(resource: TemplateVisibleResource | null): RuntimeBindingBehaviorBindEffects {
    if (resource == null) {
      return noBindingBehaviorBindEffects;
    }
    const key = resourceEffectCacheKey(resource);
    const cached = this.effectsByResource.get(key);
    if (cached != null) {
      return cached;
    }
    const effects = this.effectsForResource(resource);
    this.effectsByResource.set(key, effects);
    return effects;
  }

  private effectsForResource(resource: TemplateVisibleResource): RuntimeBindingBehaviorBindEffects {
    const definition = readVisibleTemplateResourceDefinition(this.store, resource);
    if (definition == null || definition.type !== ResourceDefinitionKind.BindingBehavior) {
      return noBindingBehaviorBindEffects;
    }
    const targetType = readCheckerTypeShapeByProductHandle(this.store, definition.target.targetType?.productHandle);
    if (targetType == null) {
      return noBindingBehaviorBindEffects;
    }
    const declarations = targetType.members.find(member => member.name === 'bind')?.carrier?.declarations
      ?? checkerMemberForOwnerType(targetType, 'bind')?.declarations ?? [];
    return new RuntimeBindingBehaviorBindEffects(declarations.reduce(
      (count, declaration) => count + directTargetSubscriberCallsForBindDeclaration(declaration), 0));
  }
}

const noBindingBehaviorBindEffects = new RuntimeBindingBehaviorBindEffects(0);

function resourceEffectCacheKey(resource: TemplateVisibleResource): string {
  return resource.definitionProductHandle
    ?? resource.resourceProductHandle
    ?? `${resource.resourceKind}:${resource.name}`;
}

function directTargetSubscriberCallsForBindDeclaration(declaration: ts.Declaration): number {
  const bind = bindFunctionLike(declaration);
  if (bind == null || bind.body == null || !ts.isBlock(bind.body)) {
    return 0;
  }
  const bindingParameter = bind.parameters[1];
  if (bindingParameter == null || !ts.isIdentifier(bindingParameter.name)) {
    return 0;
  }
  return directTargetSubscriberCallsForStatements(bind.body.statements, bindingParameter.name.text);
}

interface BindingBehaviorBindFunction {
  readonly parameters: ts.NodeArray<ts.ParameterDeclaration>;
  readonly body?: ts.ConciseBody;
}

function bindFunctionLike(declaration: ts.Declaration): BindingBehaviorBindFunction | null {
  if (ts.isMethodDeclaration(declaration)) {
    return declaration;
  }
  if (ts.isPropertyDeclaration(declaration)) {
    const initializer = declaration.initializer;
    return initializer != null && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))
      ? initializer
      : null;
  }
  if (ts.isFunctionDeclaration(declaration) || ts.isFunctionExpression(declaration) || ts.isArrowFunction(declaration)) {
    return declaration;
  }
  return null;
}

function directTargetSubscriberCallsForStatements(
  statements: ts.NodeArray<ts.Statement>,
  bindingParameterName: string,
): number {
  let count = 0;
  const continued = (statement: ts.Statement): boolean => {
    if (ts.isBlock(statement)) return statement.statements.every(continued);
    if (ts.isIfStatement(statement)) {
      const test = unwrapExpressionStatementExpression(statement.expression);
      if (test.kind === ts.SyntaxKind.TrueKeyword) return continued(statement.thenStatement);
      if (test.kind === ts.SyntaxKind.FalseKeyword) return statement.elseStatement == null || continued(statement.elseStatement);
      return false;
    }
    if (ts.isExpressionStatement(statement)
      && isBindingUseTargetSubscriberCall(statement.expression, bindingParameterName)) {
      count += 1;
    }
    return ts.isExpressionStatement(statement) || ts.isVariableStatement(statement) || ts.isEmptyStatement(statement);
  };
  statements.every(continued);
  return count;
}

function isBindingUseTargetSubscriberCall(
  expression: ts.Expression,
  bindingParameterName: string,
): boolean {
  const call = unwrapExpressionStatementExpression(expression);
  if (!ts.isCallExpression(call)) {
    return false;
  }
  const access = call.expression;
  return ts.isPropertyAccessExpression(access)
    && access.name.text === 'useTargetSubscriber'
    && ts.isIdentifier(access.expression)
    && access.expression.text === bindingParameterName;
}

function unwrapExpressionStatementExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) || ts.isTypeAssertionExpression(current)) {
    current = current.expression;
  }
  return current;
}
