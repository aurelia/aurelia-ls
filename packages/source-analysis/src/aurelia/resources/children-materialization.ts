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
  ChildrenCallbackTarget,
  ChildrenDeclaration,
  ChildrenQueryPlan,
  ChildrenSurface,
  ChildrenTransformPlan,
} from './children-support.js';

export function readChildrenSurface(
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): ChildrenSurface {
  // TODO: this closes declaration-local @children metadata only. Runtime
  // hydrating still installs ChildrenBinding, readonly getter/getObserver
  // plumbing, and controller.addBinding(...) later; that observation spend
  // belongs to a follow-on controller/runtime slice.
  const declarations: ChildrenDeclaration[] = [];

  for (const member of declarationNode.members) {
    if (
      !ts.isPropertyDeclaration(member)
      || member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword)
    ) {
      continue;
    }

    const decorators = ts.canHaveDecorators(member)
      ? ts.getDecorators(member) ?? []
      : [];
    for (const decorator of decorators) {
      const declaration = readChildrenDeclaration(
        decorator,
        member,
        declarationNode,
        file,
        sourceFile,
      );
      if (declaration != null) {
        declarations.push(declaration);
      }
    }
  }

  return new ChildrenSurface(
    declarations,
    declarations.length === 0
      ? 'No @children declarations were recovered from the current class carrier.'
      : 'Children declarations recovered directly from field decorators on the current class carrier.',
  );
}

export function mergeChildrenSurface(
  existing: ChildrenSurface,
  derived: ChildrenSurface,
): ChildrenSurface {
  const seen = new Set<string>();
  const declarations: ChildrenDeclaration[] = [];

  for (const declaration of [...existing.declarations, ...derived.declarations]) {
    const key = [
      declaration.origin,
      declaration.source?.id ?? '<none>',
      declaration.propertyName ?? '<none>',
      declaration.query.kind,
      declaration.query.selectorText ?? declaration.query.referenceName ?? '<none>',
      declaration.callback.kind,
      declaration.callback.name ?? declaration.callback.referenceName ?? '<none>',
      declaration.filter.kind,
      declaration.filter.referenceName ?? '<none>',
      declaration.map.kind,
      declaration.map.referenceName ?? '<none>',
    ].join(':');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    declarations.push(declaration);
  }

  return new ChildrenSurface(
    declarations,
    existing.note ?? derived.note,
  );
}

function readChildrenDeclaration(
  decorator: ts.Decorator,
  member: ts.PropertyDeclaration,
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): ChildrenDeclaration | null {
  const parsed = parseChildrenDecorator(decorator);
  if (parsed == null) {
    return null;
  }

  const propertyName = readPropertyName(member.name);
  return new ChildrenDeclaration(
    'field-decorator',
    toNodeRef(decorator, file, sourceFile),
    propertyName,
    toNodeRef(member, file, sourceFile),
    readChildrenQueryPlan(parsed.queryExpression, file, sourceFile),
    readChildrenCallbackTarget(
      parsed.callbackExpression,
      propertyName,
      declarationNode,
      file,
      sourceFile,
    ),
    readChildrenTransformPlan('filter', parsed.filterExpression, file, sourceFile),
    readChildrenTransformPlan('map', parsed.mapExpression, file, sourceFile),
    parsed.note,
  );
}

function parseChildrenDecorator(
  decorator: ts.Decorator,
): {
  readonly queryExpression: ts.Expression | null;
  readonly callbackExpression: ts.Expression | null;
  readonly filterExpression: ts.Expression | null;
  readonly mapExpression: ts.Expression | null;
  readonly note: string | null;
} | null {
  const expression = decorator.expression;

  if (ts.isIdentifier(expression) && expression.text === 'children') {
    return {
      queryExpression: null,
      callbackExpression: null,
      filterExpression: null,
      mapExpression: null,
      note: 'Children declaration recovered from a bare @children field decorator.',
    };
  }

  if (!ts.isCallExpression(expression) || readDecoratorCalleeText(expression.expression) !== 'children') {
    return null;
  }

  const arg0 = expression.arguments[0] ?? null;
  if (arg0 == null) {
    return {
      queryExpression: null,
      callbackExpression: null,
      filterExpression: null,
      mapExpression: null,
      note: 'Children declaration recovered from an invoked @children() field decorator.',
    };
  }

  const current = unwrapExpression(arg0);
  if (ts.isObjectLiteralExpression(current)) {
    return {
      queryExpression: readObjectLiteralPropertyInitializer(current, 'query'),
      callbackExpression: readObjectLiteralPropertyInitializer(current, 'callback'),
      filterExpression: readObjectLiteralPropertyInitializer(current, 'filter'),
      mapExpression: readObjectLiteralPropertyInitializer(current, 'map'),
      note: 'Children declaration recovered from an object-configured @children({...}) field decorator.',
    };
  }

  return {
    queryExpression: current,
    callbackExpression: null,
    filterExpression: null,
    mapExpression: null,
    note: 'Children declaration recovered from a selector-configured @children(query) field decorator.',
  };
}

function readChildrenQueryPlan(
  expression: ts.Expression | null,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): ChildrenQueryPlan {
  const current = expression == null ? null : unwrapExpression(expression);
  if (current == null) {
    return new ChildrenQueryPlan(
      'default-elements',
      null,
      '*',
      null,
      'Children query defaults to `*`, which means direct child elements only.',
    );
  }

  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    if (current.text === '$all') {
      return new ChildrenQueryPlan(
        'all-nodes',
        toNodeRef(current, file, sourceFile),
        current.text,
        null,
        'Children query closes to `$all`, which includes non-element child nodes.',
      );
    }

    return new ChildrenQueryPlan(
      'selector-string',
      toNodeRef(current, file, sourceFile),
      current.text,
      null,
      /[\s>]/.test(current.text)
        ? 'Runtime ChildrenLifecycleHooks rejects queries containing whitespace or `>`; this selector may fail during hydrating.'
        : 'Children query closes to a direct selector string over immediate child elements.',
    );
  }

  const seed = readReferenceSeed(current);
  return new ChildrenQueryPlan(
    'open',
    toNodeRef(current, file, sourceFile),
    null,
    seed.candidateName,
    'Children query stayed open under the current bounded decorator reader.',
  );
}

function readChildrenCallbackTarget(
  expression: ts.Expression | null,
  propertyName: string | null,
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): ChildrenCallbackTarget {
  const current = expression == null ? null : unwrapExpression(expression);
  if (current == null) {
    if (propertyName == null) {
      return new ChildrenCallbackTarget(
        'open',
        null,
        null,
        null,
        'Children callback stayed open because the decorated field name did not close.',
      );
    }

    const callbackName = `${propertyName}Changed`;
    const method = findInstanceMethod(declarationNode, callbackName);
    return new ChildrenCallbackTarget(
      'default-name',
      method == null ? null : toNodeRef(method, file, sourceFile),
      callbackName,
      null,
      method == null
        ? 'Children callback defaults to `${propertyName}Changed`, but no matching instance method was found on the current class carrier.'
        : 'Children callback default resolved to an instance method on the current class carrier.',
    );
  }

  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    const method = findInstanceMethod(declarationNode, current.text);
    return new ChildrenCallbackTarget(
      'named-method',
      method == null ? null : toNodeRef(method, file, sourceFile),
      current.text,
      null,
      method == null
        ? 'Children callback currently closes by method name only; no matching instance method was found on the current class carrier.'
        : 'Children callback resolved to a named instance method on the current class carrier.',
    );
  }

  if (
    ts.isIdentifier(current)
    || ts.isPropertyAccessExpression(current)
    || ts.isElementAccessExpression(current)
    || ts.isCallExpression(current)
  ) {
    const seed = readReferenceSeed(current);
    return new ChildrenCallbackTarget(
      seed.kind === 'open-expression' ? 'open' : 'property-key-reference',
      toNodeRef(current, file, sourceFile),
      null,
      seed.candidateName,
      seed.kind === 'open-expression'
        ? 'Children callback property key stayed open under the current bounded reader.'
        : 'Children callback currently closes as a property-key reference seed.',
    );
  }

  return new ChildrenCallbackTarget(
    'open',
    toNodeRef(current, file, sourceFile),
    null,
    null,
    'Children callback stayed open under the current bounded reader.',
  );
}

function readChildrenTransformPlan(
  role: 'filter' | 'map',
  expression: ts.Expression | null,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): ChildrenTransformPlan {
  const current = expression == null ? null : unwrapExpression(expression);
  if (current == null) {
    return new ChildrenTransformPlan(
      role,
      'none',
      null,
      null,
      `Children ${role} uses runtime default behavior because no explicit ${role} function was declared.`,
    );
  }

  if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
    return new ChildrenTransformPlan(
      role,
      'inline-function',
      toNodeRef(current, file, sourceFile),
      null,
      `Children ${role} closes as an inline function carried directly from decorator configuration.`,
    );
  }

  if (
    ts.isIdentifier(current)
    || ts.isPropertyAccessExpression(current)
    || ts.isElementAccessExpression(current)
    || ts.isCallExpression(current)
  ) {
    const seed = readReferenceSeed(current);
    return new ChildrenTransformPlan(
      role,
      seed.kind === 'open-expression' ? 'open' : 'function-reference',
      toNodeRef(current, file, sourceFile),
      seed.candidateName,
      seed.kind === 'open-expression'
        ? `Children ${role} stayed open under the current bounded reader.`
        : `Children ${role} currently closes as a function-reference seed.`,
    );
  }

  return new ChildrenTransformPlan(
    role,
    'open',
    toNodeRef(current, file, sourceFile),
    null,
    `Children ${role} stayed open under the current bounded reader.`,
  );
}

function findInstanceMethod(
  declarationNode: ts.ClassLikeDeclarationBase,
  name: string,
): ts.MethodDeclaration | null {
  for (const member of declarationNode.members) {
    if (
      !ts.isMethodDeclaration(member)
      || member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword)
    ) {
      continue;
    }
    if (readPropertyName(member.name) === name) {
      return member;
    }
  }
  return null;
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

function toNodeRef(
  node: ts.Node,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): SourceNodeRef {
  return new SourceNodeRef(
    `node:${node.kind}:${node.getStart(sourceFile)}-${node.getEnd()}`,
    file,
    ts.SyntaxKind[node.kind] ?? 'Node',
    new SourceSpan(node.getStart(sourceFile), node.getEnd()),
  );
}
