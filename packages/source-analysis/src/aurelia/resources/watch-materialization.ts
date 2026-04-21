import ts from 'typescript';

import {
  readPropertyName,
  readReferenceSeed,
  unwrapExpression,
} from '../analysis/index.js';
import {
  SourceNodeRef,
  SourceSpan,
  type SourceFileRef,
} from '../refs.js';
import {
  WatchCallbackTarget,
  WatchDeclaration,
  WatchExpressionPlan,
  WatchSurface,
  type WatchFlushKind,
} from './watch-support.js';

export function readWatchSurface(
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): WatchSurface {
  const declarations: WatchDeclaration[] = [];

  const classDecorators = ts.canHaveDecorators(declarationNode)
    ? ts.getDecorators(declarationNode) ?? []
    : [];
  for (const decorator of classDecorators) {
    const declaration = readClassDecoratorWatch(decorator, declarationNode, file, sourceFile);
    if (declaration != null) {
      declarations.push(declaration);
    }
  }

  for (const member of declarationNode.members) {
    if (!ts.isMethodDeclaration(member) || member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword)) {
      continue;
    }
    const decorators = ts.canHaveDecorators(member)
      ? ts.getDecorators(member) ?? []
      : [];
    for (const decorator of decorators) {
      const declaration = readMethodDecoratorWatch(decorator, member, file, sourceFile);
      if (declaration != null) {
        declarations.push(declaration);
      }
    }
  }

  return new WatchSurface(
    declarations,
    declarations.length === 0
      ? 'No watch declarations were recovered from the current class carrier.'
      : 'Watch declarations recovered directly from class and method decorators on the current class carrier.',
  );
}

export function mergeWatchSurface(
  existing: WatchSurface,
  derived: WatchSurface,
): WatchSurface {
  const seen = new Set<string>();
  const declarations: WatchDeclaration[] = [];

  for (const declaration of [...existing.declarations, ...derived.declarations]) {
    const key = [
      declaration.origin,
      declaration.source?.id ?? '<none>',
      declaration.callback.kind,
      declaration.callback.name ?? declaration.callback.referenceName ?? '<none>',
      declaration.expression.kind,
      declaration.expression.text ?? declaration.expression.referenceName ?? declaration.expression.dependencyPath.join('.') ?? '<none>',
    ].join(':');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    declarations.push(declaration);
  }

  return new WatchSurface(
    declarations,
    existing.note ?? derived.note,
  );
}

function readClassDecoratorWatch(
  decorator: ts.Decorator,
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): WatchDeclaration | null {
  const call = getDecoratorCall(decorator);
  if (call == null || readDecoratorCalleeText(call.expression) !== 'watch') {
    return null;
  }

  const expressionArg = call.arguments[0] ?? null;
  if (expressionArg == null) {
    return null;
  }

  return new WatchDeclaration(
    'class-decorator',
    toNodeRef(decorator, file, sourceFile),
    readWatchExpressionPlan(expressionArg, file, sourceFile),
    readClassWatchCallbackTarget(call.arguments[1] ?? null, declarationNode, file, sourceFile),
    readWatchFlush(call.arguments[2] ?? null),
    'Watch declaration recovered from a class decorator.',
  );
}

function readMethodDecoratorWatch(
  decorator: ts.Decorator,
  method: ts.MethodDeclaration,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): WatchDeclaration | null {
  const call = getDecoratorCall(decorator);
  if (call == null || readDecoratorCalleeText(call.expression) !== 'watch') {
    return null;
  }

  const expressionArg = call.arguments[0] ?? null;
  if (expressionArg == null) {
    return null;
  }

  const methodName = readPropertyName(method.name);
  return new WatchDeclaration(
    'method-decorator',
    toNodeRef(decorator, file, sourceFile),
    readWatchExpressionPlan(expressionArg, file, sourceFile),
    new WatchCallbackTarget(
      'decorated-method',
      toNodeRef(method, file, sourceFile),
      methodName,
      null,
      'Watch callback target is the decorated instance method itself.',
    ),
    readWatchFlush(call.arguments[1] ?? null),
    'Watch declaration recovered from a method decorator.',
  );
}

function readWatchExpressionPlan(
  expression: ts.Expression,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): WatchExpressionPlan {
  const current = unwrapExpression(expression);
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    return new WatchExpressionPlan(
      'string-expression',
      toNodeRef(current, file, sourceFile),
      current.text,
      null,
      [],
      null,
      'String-based watch expression carried directly from decorator input.',
    );
  }

  if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
    return readDependencyCollectorPlan(current, file, sourceFile);
  }

  if (
    ts.isIdentifier(current)
    || ts.isPropertyAccessExpression(current)
    || ts.isElementAccessExpression(current)
    || ts.isCallExpression(current)
  ) {
    const seed = readReferenceSeed(current);
    return new WatchExpressionPlan(
      seed.kind === 'open-expression' ? 'open' : 'property-key-reference',
      toNodeRef(current, file, sourceFile),
      null,
      seed.candidateName,
      [],
      null,
      seed.kind === 'open-expression'
        ? 'Watch expression reference stayed open under the current bounded expression reader.'
        : 'Watch expression carried as a property-key reference seed.',
    );
  }

  return new WatchExpressionPlan(
    'open',
    toNodeRef(current, file, sourceFile),
    null,
    null,
    [],
    null,
    'Watch expression stayed open under the current bounded reader.',
  );
}

function readDependencyCollectorPlan(
  expression: ts.ArrowFunction | ts.FunctionExpression,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): WatchExpressionPlan {
  // TODO: this first bounded reader only closes direct property-access paths
  // over the view-model parameter. Richer collector bodies, branching, helper
  // calls, and array/object destructuring still belong to a later expression
  // interpretation seam.
  const source = toNodeRef(expression, file, sourceFile);
  const vmParameter = expression.parameters[0]?.name;
  const watcherParameter = expression.parameters[1]?.name;
  if (vmParameter == null || !ts.isIdentifier(vmParameter)) {
    return new WatchExpressionPlan(
      'dependency-collector',
      source,
      null,
      null,
      [],
      watcherParameter != null,
      'Dependency-collector watch expression did not close because the first parameter was not a simple identifier.',
    );
  }

  const bodyExpression = readFunctionBodyExpression(expression.body);
  const dependencyPath = bodyExpression == null
    ? []
    : readPropertyAccessPath(bodyExpression, vmParameter.text);

  return new WatchExpressionPlan(
    'dependency-collector',
    source,
    bodyExpression?.getText(sourceFile) ?? null,
    null,
    dependencyPath,
    watcherParameter != null && ts.isIdentifier(watcherParameter)
      ? containsIdentifier(expression.body, watcherParameter.text)
      : null,
    dependencyPath.length > 0
      ? 'Dependency-collector watch expression closed to a direct property-access path over the view-model parameter.'
      : 'Dependency-collector watch expression was identified, but its dependency path stayed open under the current bounded reader.',
  );
}

function readClassWatchCallbackTarget(
  callbackExpression: ts.Expression | null,
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): WatchCallbackTarget {
  const current = callbackExpression == null ? null : unwrapExpression(callbackExpression);
  if (current == null) {
    return new WatchCallbackTarget(
      'open',
      null,
      null,
      null,
      'Class-level watch callback target did not close from decorator input.',
    );
  }

  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    const method = findInstanceMethod(declarationNode, current.text);
    return new WatchCallbackTarget(
      'named-method',
      method == null ? null : toNodeRef(method, file, sourceFile),
      current.text,
      null,
      method == null
        ? 'Watch callback currently closes as a named method reference only; no matching instance method was found on the current class carrier.'
        : 'Watch callback resolved to a named instance method on the current class carrier.',
    );
  }

  if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
    return new WatchCallbackTarget(
      'inline-callback',
      toNodeRef(current, file, sourceFile),
      null,
      null,
      'Watch callback carried as an inline callback function from the class decorator.',
    );
  }

  return new WatchCallbackTarget(
    'open',
    toNodeRef(current, file, sourceFile),
    null,
    readReferenceSeed(current).candidateName,
    'Watch callback target stayed open under the current bounded reader.',
  );
}

function readWatchFlush(
  optionsExpression: ts.Expression | null,
): WatchFlushKind {
  const current = optionsExpression == null ? null : unwrapExpression(optionsExpression);
  if (current == null || !ts.isObjectLiteralExpression(current)) {
    return 'async';
  }

  const flushProperty = readObjectLiteralPropertyInitializer(current, 'flush');
  return flushProperty != null
    && (ts.isStringLiteral(flushProperty) || ts.isNoSubstitutionTemplateLiteral(flushProperty))
    && (flushProperty.text === 'sync' || flushProperty.text === 'async')
    ? flushProperty.text
    : 'async';
}

function getDecoratorCall(
  decorator: ts.Decorator,
): ts.CallExpression | null {
  return ts.isCallExpression(decorator.expression)
    ? decorator.expression
    : null;
}

function readDecoratorCalleeText(
  expression: ts.LeftHandSideExpression,
): string {
  return ts.isCallExpression(expression)
    ? readDecoratorCalleeText(expression.expression)
    : expression.getText();
}

function readObjectLiteralPropertyInitializer(
  literal: ts.ObjectLiteralExpression,
  propertyName: string,
): ts.Expression | null {
  for (const property of literal.properties) {
    if (ts.isPropertyAssignment(property) && readPropertyName(property.name) === propertyName) {
      return property.initializer;
    }
  }
  return null;
}

function readFunctionBodyExpression(
  body: ts.ConciseBody,
): ts.Expression | null {
  if (ts.isExpression(body)) {
    return unwrapExpression(body);
  }

  if (body.statements.length !== 1) {
    return null;
  }

  const statement = body.statements[0];
  if (statement == null || !ts.isReturnStatement(statement) || statement.expression == null) {
    return null;
  }

  return unwrapExpression(statement.expression);
}

function readPropertyAccessPath(
  expression: ts.Expression,
  rootName: string,
): readonly string[] {
  const segments: string[] = [];
  let current: ts.Expression = expression;

  while (ts.isPropertyAccessExpression(current)) {
    segments.unshift(current.name.text);
    current = unwrapExpression(current.expression);
  }

  if (ts.isIdentifier(current) && current.text === rootName) {
    return segments;
  }

  return [];
}

function containsIdentifier(
  node: ts.Node,
  identifierName: string,
): boolean {
  let found = false;
  const visit = (current: ts.Node): void => {
    if (found) {
      return;
    }
    if (ts.isIdentifier(current) && current.text === identifierName) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

function findInstanceMethod(
  declarationNode: ts.ClassLikeDeclarationBase,
  name: string,
): ts.MethodDeclaration | null {
  for (const member of declarationNode.members) {
    if (!ts.isMethodDeclaration(member)) {
      continue;
    }
    if (member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword)) {
      continue;
    }
    if (readPropertyName(member.name) === name) {
      return member;
    }
  }
  return null;
}

function toNodeRef(
  node: ts.Node,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): SourceNodeRef {
  return new SourceNodeRef(
    `${file.path}:${node.pos}-${node.end}`,
    file,
    ts.SyntaxKind[node.kind] ?? 'Unknown',
    new SourceSpan(node.getStart(sourceFile), node.getEnd()),
  );
}
