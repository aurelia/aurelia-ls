import ts from 'typescript';

import {
  readCallCalleeText,
  readPropertyName,
  readReferenceSeed,
  readStringLiteralValue,
  unwrapExpression,
} from '../analysis/index.js';
import {
  KeyRef,
  SourceNodeRef,
  SourceSpan,
  SymbolRef,
  type SourceFileRef,
} from '../refs.js';
import { DependencyResolution, DependencyResolvedSubject } from './dependency-resolution.js';
import { DependencyRequest } from './dependency-request.js';
import { InterfaceKey, InterfaceKeyDefaultRegistration } from './interface-key.js';

export class DependencySubjectResolver {
  resolveInSourceFile(
    request: DependencyRequest,
    file: SourceFileRef,
    sourceFile: ts.SourceFile,
  ): DependencyResolution {
    // TODO: widen this through exports/import alias recovery once the ordinary
    // DI subject basis needs cross-file closure. This first pass is purposely
    // same-file and source-literal rather than pretending to solve general
    // symbol flow.
    if (request.candidateName == null) {
      return new DependencyResolution(
        new DependencyResolvedSubject(
          'open',
          null,
          request.source,
          null,
          'Dependency request did not yield a stable candidate name under the current bounded reader.',
        ),
      );
    }

    if (request.seedKind === 'string-key') {
      const owner = request.source;
      const key = owner == null
        ? null
        : new KeyRef(
          `key:property:${request.candidateName}`,
          'property',
          owner,
          request.candidateName,
        );
      return new DependencyResolution(
        new DependencyResolvedSubject(
          'property',
          key,
          owner,
          null,
          'Dependency request closed directly to a property/string key literal.',
        ),
      );
    }

    const declaration = findTopLevelDeclarationByName(sourceFile, request.candidateName);
    if (declaration == null) {
      return new DependencyResolution(
        new DependencyResolvedSubject(
          'open',
          null,
          request.source,
          null,
          `Dependency request ${request.candidateName} did not close within the current source file. Cross-file/import alias resolution is still open.`,
        ),
      );
    }

    if (ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration)) {
      return resolveConstructableDeclaration(request, file, sourceFile, declaration, request.candidateName);
    }

    if (ts.isVariableDeclaration(declaration)) {
      const initializer = declaration.initializer;
      if (initializer == null) {
        return new DependencyResolution(
          new DependencyResolvedSubject(
            'open',
            null,
            request.source,
            null,
            `Dependency request ${request.candidateName} matched a declaration without an initializer, so key identity is still open.`,
          ),
        );
      }

      const current = unwrapExpression(initializer);
      if (ts.isClassExpression(current)) {
        return resolveConstructableDeclaration(request, file, sourceFile, current, request.candidateName, declaration);
      }

      if (ts.isCallExpression(current)) {
        const interfaceKey = readInterfaceKey(current, declaration, file, sourceFile);
        if (interfaceKey != null) {
          return new DependencyResolution(
            new DependencyResolvedSubject(
              'interface-symbol',
              interfaceKey.key,
              interfaceKey.owner,
              interfaceKey,
              'Dependency request closed to a DI.createInterface-style interface key.',
            ),
          );
        }
      }
    }

    return new DependencyResolution(
      new DependencyResolvedSubject(
        'open',
        null,
        request.source,
        null,
        `Dependency request ${request.candidateName} matched a declaration shape that this first subject-resolution pass does not yet interpret.`,
      ),
    );
  }
}

function resolveConstructableDeclaration(
  request: DependencyRequest,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
  declaration: ts.ClassDeclaration | ts.ClassExpression,
  fallbackName: string,
  ownerDeclaration: ts.VariableDeclaration | null = null,
): DependencyResolution {
  const symbol = createSymbolRef(
    file,
    sourceFile,
    ownerDeclaration ?? declaration,
    declaration.name?.text ?? fallbackName,
  );
  const key = new KeyRef(
    `key:constructable:${symbol.name ?? fallbackName}`,
    'constructable',
    symbol,
    symbol.name ?? fallbackName,
  );
  return new DependencyResolution(
    new DependencyResolvedSubject(
      'constructable',
      key,
      symbol,
      null,
      'Dependency request closed to a constructable/class key.',
    ),
  );
}

function readInterfaceKey(
  expression: ts.CallExpression,
  declaration: ts.VariableDeclaration,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): InterfaceKey | null {
  // TODO: route createInterface identity through framework API ingress once DI
  // helper aliasing matters. For now we only close source-literal
  // DI.createInterface(...) / createInterface(...) calls.
  const callee = readCallCalleeText(expression.expression);
  if (callee !== 'DI.createInterface' && callee !== 'createInterface') {
    return null;
  }

  if (!ts.isIdentifier(declaration.name)) {
    return null;
  }

  const owner = createSymbolRef(file, sourceFile, declaration, declaration.name.text);
  const key = new KeyRef(
    `key:interface-symbol:${declaration.name.text}`,
    'interface-symbol',
    owner,
    declaration.name.text,
  );

  const friendlyName = readInterfaceFriendlyName(expression) ?? declaration.name.text;
  const defaultRegistration = readInterfaceDefaultRegistration(expression, file, sourceFile);

  return new InterfaceKey(
    `interface-key:${declaration.name.text}`,
    owner,
    key,
    friendlyName,
    defaultRegistration,
  );
}

function readInterfaceFriendlyName(
  expression: ts.CallExpression,
): string | null {
  const first = expression.arguments[0];
  const second = expression.arguments[1];
  if (first != null && !isFunctionExpressionLike(first)) {
    return readStringLiteralValue(first);
  }

  if (second != null && !isFunctionExpressionLike(second)) {
    return readStringLiteralValue(second);
  }

  return null;
}

function readInterfaceDefaultRegistration(
  expression: ts.CallExpression,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): InterfaceKeyDefaultRegistration | null {
  const configure = expression.arguments.find(isFunctionExpressionLike);
  if (configure == null) {
    return null;
  }

  const bodyExpression = readReturnedExpression(configure);
  if (bodyExpression == null || !ts.isCallExpression(bodyExpression)) {
    return null;
  }

  const callee = readCallCalleeText(bodyExpression.expression);
  const kind = callee == null
    ? null
    : readDefaultRegistrationKind(callee);
  if (kind == null) {
    return null;
  }

  return new InterfaceKeyDefaultRegistration(
    kind,
    createNodeRef(file, sourceFile, bodyExpression),
    null,
    kind === 'alias'
      ? 'Default alias registration target is not yet resolved in this first same-file interface-key reader.'
      : null,
  );
}

function readDefaultRegistrationKind(
  callee: string,
): import('./interface-key.js').InterfaceKeyDefaultRegistrationKind | null {
  switch (callee) {
    case 'builder.instance':
      return 'instance';
    case 'builder.singleton':
      return 'singleton';
    case 'builder.transient':
      return 'transient';
    case 'builder.callback':
      return 'callback';
    case 'builder.cachedCallback':
      return 'cached-callback';
    case 'builder.aliasTo':
      return 'alias';
    default:
      return null;
  }
}

function readReturnedExpression(
  node: ts.Expression,
): ts.Expression | null {
  if (ts.isArrowFunction(node)) {
    if (ts.isBlock(node.body)) {
      for (const statement of node.body.statements) {
        if (ts.isReturnStatement(statement) && statement.expression != null) {
          return unwrapExpression(statement.expression);
        }
      }
      return null;
    }

    return unwrapExpression(node.body);
  }

  if (ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) {
    if (node.body == null) {
      return null;
    }
    for (const statement of node.body.statements) {
      if (ts.isReturnStatement(statement) && statement.expression != null) {
        return unwrapExpression(statement.expression);
      }
    }
  }

  return null;
}

function isFunctionExpressionLike(
  node: ts.Node,
): node is ts.ArrowFunction | ts.FunctionExpression {
  return ts.isArrowFunction(node) || ts.isFunctionExpression(node);
}

function findTopLevelDeclarationByName(
  sourceFile: ts.SourceFile,
  name: string,
): ts.ClassDeclaration | ts.ClassExpression | ts.VariableDeclaration | null {
  for (const statement of sourceFile.statements) {
    if (ts.isClassDeclaration(statement) && statement.name?.text === name) {
      return statement;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
          return declaration;
        }
      }
    }
  }

  return null;
}

function createNodeRef(
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
  node: ts.Node,
): SourceNodeRef {
  const start = node.getStart(sourceFile);
  return new SourceNodeRef(
    `node:${node.kind}:${start}-${node.end}`,
    file,
    ts.SyntaxKind[node.kind] ?? 'Unknown',
    new SourceSpan(start, node.end),
  );
}

function createSymbolRef(
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
  node: ts.Node,
  name: string,
): SymbolRef {
  const declaration = createNodeRef(file, sourceFile, node);
  return new SymbolRef(
    `symbol:${name}:${declaration.span.start}-${declaration.span.end}`,
    file,
    name,
    [name],
    declaration,
  );
}
