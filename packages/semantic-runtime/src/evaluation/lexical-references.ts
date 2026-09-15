import ts from 'typescript';
import { staticBindingNames } from './binding-patterns.js';

export interface StaticLexicalReferences {
  readonly names: ReadonlySet<string>;
  readonly hasUnsupportedLexicalMeta: boolean;
  readonly requiresCompleteEnvironment: boolean;
}

const referencesByDeclaration = new WeakMap<ts.Node, StaticLexicalReferences>();

/**
 * Conservative lexical dependencies of a retained callable, including nested bodies and initializers.
 *
 * Callable parameters shadow outer names in their bodies. Other local references are deliberately conservative:
 * the evaluator does not implement every JavaScript lexical-hoisting rule. Property names and type-only syntax
 * contribute no runtime dependency. Lexical reflection keeps the complete environment because identifiers alone
 * cannot describe the cells it could inspect.
 */
export function staticLexicalReferences(node: ts.Node): StaticLexicalReferences {
  const cached = referencesByDeclaration.get(node);
  if (cached != null) return cached;
  const names = new Set<string>();
  let hasUnsupportedLexicalMeta = false;
  let requiresCompleteEnvironment = false;
  const visit = (current: ts.Node, bodyBindings: ReadonlySet<string>): void => {
    // TypeScript classifies this heritage wrapper as a type node, but `extends factory(Base)` executes its expression.
    if (ts.isExpressionWithTypeArguments(current)) {
      visit(current.expression, bodyBindings);
      return;
    }
    if (ts.isTypeNode(current)) return;
    if (isCallableDeclaration(current)) {
      if (current.name != null && ts.isComputedPropertyName(current.name)) {
        visit(current.name.expression, bodyBindings);
      }
      for (const modifier of current.modifiers ?? []) {
        if (ts.isDecorator(modifier)) visit(modifier.expression, bodyBindings);
      }
      const ownBodyBindings = new Set(bodyBindings);
      if (!ts.isArrowFunction(current)) ownBodyBindings.add('this');
      for (const parameter of current.parameters) {
        // The evaluator initializes parameters sequentially and can consult an outer binding from a default.
        // Preserve those reads rather than imposing a separate TDZ model at the snapshot boundary.
        visit(parameter, bodyBindings);
        for (const name of staticBindingNames(parameter.name)) ownBodyBindings.add(name);
      }
      if (current.body != null) visit(current.body, ownBodyBindings);
      return;
    }
    if (ts.isCatchClause(current) && current.variableDeclaration != null) {
      // Catch admission explicitly checks existing bindings for collisions before executing the body.
      for (const name of staticBindingNames(current.variableDeclaration.name)) {
        if (!bodyBindings.has(name)) names.add(name);
      }
    }
    if (current.kind === ts.SyntaxKind.ThisKeyword && !bodyBindings.has('this')) names.add('this');
    if (current.kind === ts.SyntaxKind.SuperKeyword || ts.isMetaProperty(current)) {
      hasUnsupportedLexicalMeta = true;
    }
    if (ts.isWithStatement(current)
      || (ts.isCallExpression(current) && ts.isIdentifier(current.expression) && current.expression.text === 'eval')) {
      requiresCompleteEnvironment = true;
    }
    if (ts.isIdentifier(current) && isLexicalIdentifier(current) && !bodyBindings.has(current.text)) {
      names.add(current.text);
    }
    ts.forEachChild(current, (child) => visit(child, bodyBindings));
  };
  visit(node, new Set());
  // Lazy CommonJS materialization reconnects these two carriers even when only one name is authored in the callable.
  if (names.has('module') || names.has('exports')) {
    names.add('module');
    names.add('exports');
  }
  const references = { names, hasUnsupportedLexicalMeta, requiresCompleteEnvironment };
  referencesByDeclaration.set(node, references);
  return references;
}

function isCallableDeclaration(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)
    || ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)
    || ts.isConstructorDeclaration(node);
}

function isLexicalIdentifier(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (parent == null) return true;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
  if ((ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent)
    || ts.isMethodDeclaration(parent) || ts.isGetAccessorDeclaration(parent) || ts.isSetAccessorDeclaration(parent))
    && parent.name === node) return false;
  if ((ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isBindingElement(parent)
    || ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent)
    || ts.isClassDeclaration(parent) || ts.isClassExpression(parent)) && parent.name === node) return false;
  if (ts.isBindingElement(parent) && parent.propertyName === node) return false;
  if ((ts.isLabeledStatement(parent) || ts.isBreakStatement(parent) || ts.isContinueStatement(parent))
    && parent.label === node) return false;
  return true;
}
