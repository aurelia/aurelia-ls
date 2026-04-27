import ts from 'typescript';
import { readPropertyName, readReferenceSeed, unwrapExpression } from '../analysis/ts-ast-helpers.js';
import type { SourceFileRef } from '../source-address.js';
import {
  sourceNodeRefFromTsNode,
  type SourceNodeRef,
} from '../refs.js';
import {
  SlottedCallbackTarget,
  SlottedDeclaration,
  SlottedQueryPlan,
  SlottedSlotTarget,
  SlottedSurface,
} from './slotted-support.js';

export function readSlottedSurface(
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): SlottedSurface {
  // TODO: this closes declaration-local @slotted metadata only. Runtime
  // hydrating still creates AuSlotWatcherBinding, installs readonly
  // getter/getObserver plumbing, registers IAuSlotWatcher into the CE child
  // container, and controller.addBinding(...) later. That spend belongs to a
  // follow-on controller/projection slice.
  const declarations: SlottedDeclaration[] = [];

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
      const declaration = readSlottedDeclaration(
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

  return new SlottedSurface(
    declarations,
    declarations.length === 0
      ? 'No @slotted declarations were recovered from the current class carrier.'
      : 'Slotted declarations recovered directly from field decorators on the current class carrier.',
  );
}

export function mergeSlottedSurface(
  existing: SlottedSurface,
  derived: SlottedSurface,
): SlottedSurface {
  const seen = new Set<string>();
  const declarations: SlottedDeclaration[] = [];

  for (const declaration of [...existing.declarations, ...derived.declarations]) {
    const key = [
      declaration.origin,
      declaration.source?.id ?? '<none>',
      declaration.propertyName ?? '<none>',
      declaration.query.kind,
      declaration.query.selectorText ?? declaration.query.referenceName ?? '<none>',
      declaration.slotTarget.kind,
      declaration.slotTarget.name ?? declaration.slotTarget.referenceName ?? '<none>',
      declaration.callback.kind,
      declaration.callback.name ?? declaration.callback.referenceName ?? '<none>',
    ].join(':');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    declarations.push(declaration);
  }

  return new SlottedSurface(
    declarations,
    existing.note ?? derived.note,
  );
}

function readSlottedDeclaration(
  decorator: ts.Decorator,
  member: ts.PropertyDeclaration,
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): SlottedDeclaration | null {
  const parsed = parseSlottedDecorator(decorator);
  if (parsed == null) {
    return null;
  }

  const propertyName = readPropertyName(member.name);
  return new SlottedDeclaration(
    'field-decorator',
    toNodeRef(decorator, file, sourceFile),
    propertyName,
    toNodeRef(member, file, sourceFile),
    readSlottedQueryPlan(parsed.queryExpression, file, sourceFile),
    readSlottedSlotTarget(parsed.slotNameExpression, file, sourceFile),
    readSlottedCallbackTarget(
      parsed.callbackExpression,
      propertyName,
      declarationNode,
      file,
      sourceFile,
    ),
    parsed.note,
  );
}

function parseSlottedDecorator(
  decorator: ts.Decorator,
): {
  readonly queryExpression: ts.Expression | null;
  readonly slotNameExpression: ts.Expression | null;
  readonly callbackExpression: ts.Expression | null;
  readonly note: string | null;
} | null {
  const expression = decorator.expression;
  if (!ts.isCallExpression(expression) || readDecoratorCalleeText(expression.expression) !== 'slotted') {
    return null;
  }

  const arg0 = expression.arguments[0] ?? null;
  const arg1 = expression.arguments[1] ?? null;
  if (arg0 == null) {
    return {
      queryExpression: null,
      slotNameExpression: null,
      callbackExpression: null,
      note: 'Slotted declaration recovered from an invoked @slotted() field decorator.',
    };
  }

  const current = unwrapExpression(arg0);
  if (ts.isObjectLiteralExpression(current)) {
    return {
      queryExpression: readObjectLiteralPropertyInitializer(current, 'query'),
      slotNameExpression: readObjectLiteralPropertyInitializer(current, 'slotName'),
      callbackExpression: readObjectLiteralPropertyInitializer(current, 'callback'),
      note: 'Slotted declaration recovered from an object-configured @slotted({...}) field decorator.',
    };
  }

  return {
    queryExpression: current,
    slotNameExpression: arg1 == null ? null : unwrapExpression(arg1),
    callbackExpression: null,
    note: arg1 == null
      ? 'Slotted declaration recovered from a query-configured @slotted(query) field decorator.'
      : 'Slotted declaration recovered from a query/slot-configured @slotted(query, slotName) field decorator.',
  };
}

function readSlottedQueryPlan(
  expression: ts.Expression | null,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): SlottedQueryPlan {
  const current = expression == null ? null : unwrapExpression(expression);
  if (current == null) {
    return new SlottedQueryPlan(
      'default-elements',
      null,
      '*',
      null,
      'Slotted query defaults to `*`, which means element nodes from the targeted slot.',
    );
  }

  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    if (current.text === '$all') {
      return new SlottedQueryPlan(
        'all-nodes',
        toNodeRef(current, file, sourceFile),
        current.text,
        null,
        'Slotted query closes to `$all`, which includes non-element projected nodes from the targeted slot.',
      );
    }

    return new SlottedQueryPlan(
      'selector-string',
      toNodeRef(current, file, sourceFile),
      current.text,
      null,
      'Slotted query closes to a selector string evaluated against projected element nodes.',
    );
  }

  const seed = readReferenceSeed(current);
  return new SlottedQueryPlan(
    'open',
    toNodeRef(current, file, sourceFile),
    null,
    seed.candidateName,
    'Slotted query stayed open under the current bounded decorator reader.',
  );
}

function readSlottedSlotTarget(
  expression: ts.Expression | null,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): SlottedSlotTarget {
  const current = expression == null ? null : unwrapExpression(expression);
  if (current == null) {
    return new SlottedSlotTarget(
      'default-slot',
      null,
      'default',
      null,
      'Slotted declaration defaults to the `default` <au-slot> target.',
    );
  }

  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    if (current.text === '*') {
      return new SlottedSlotTarget(
        'all-slots',
        toNodeRef(current, file, sourceFile),
        current.text,
        null,
        'Slotted slot target closes to `*`, which means all <au-slot> instances on the current custom element.',
      );
    }

    return new SlottedSlotTarget(
      'named-slot',
      toNodeRef(current, file, sourceFile),
      current.text,
      null,
      'Slotted slot target closes to a named <au-slot> on the current custom element.',
    );
  }

  const seed = readReferenceSeed(current);
  return new SlottedSlotTarget(
    'open',
    toNodeRef(current, file, sourceFile),
    null,
    seed.candidateName,
    'Slotted slot target stayed open under the current bounded decorator reader.',
  );
}

function readSlottedCallbackTarget(
  expression: ts.Expression | null,
  propertyName: string | null,
  declarationNode: ts.ClassLikeDeclarationBase,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): SlottedCallbackTarget {
  const current = expression == null ? null : unwrapExpression(expression);
  if (current == null) {
    if (propertyName == null) {
      return new SlottedCallbackTarget(
        'open',
        null,
        null,
        null,
        'Slotted callback stayed open because the decorated field name did not close.',
      );
    }

    const callbackName = `${propertyName}Changed`;
    const method = findInstanceMethod(declarationNode, callbackName);
    return new SlottedCallbackTarget(
      'default-name',
      method == null ? null : toNodeRef(method, file, sourceFile),
      callbackName,
      null,
      method == null
        ? 'Slotted callback defaults to `${propertyName}Changed`, but no matching instance method was found on the current class carrier.'
        : 'Slotted callback default resolved to an instance method on the current class carrier.',
    );
  }

  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    const method = findInstanceMethod(declarationNode, current.text);
    return new SlottedCallbackTarget(
      'named-method',
      method == null ? null : toNodeRef(method, file, sourceFile),
      current.text,
      null,
      method == null
        ? 'Slotted callback currently closes by method name only; no matching instance method was found on the current class carrier.'
        : 'Slotted callback resolved to a named instance method on the current class carrier.',
    );
  }

  if (
    ts.isIdentifier(current)
    || ts.isPropertyAccessExpression(current)
    || ts.isElementAccessExpression(current)
    || ts.isCallExpression(current)
  ) {
    const seed = readReferenceSeed(current);
    return new SlottedCallbackTarget(
      seed.kind === 'open-expression' ? 'open' : 'property-key-reference',
      toNodeRef(current, file, sourceFile),
      null,
      seed.candidateName,
      seed.kind === 'open-expression'
        ? 'Slotted callback property key stayed open under the current bounded reader.'
        : 'Slotted callback currently closes as a property-key reference seed.',
    );
  }

  return new SlottedCallbackTarget(
    'open',
    toNodeRef(current, file, sourceFile),
    null,
    null,
    'Slotted callback stayed open under the current bounded reader.',
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
  return sourceNodeRefFromTsNode(file, node, sourceFile, { endKind: 'token-end' });
}
