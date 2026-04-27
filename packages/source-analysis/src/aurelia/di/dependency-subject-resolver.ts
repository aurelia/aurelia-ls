import ts from 'typescript';
import { findExportedBinding, findForwardedExport, findImportedBinding, findTopLevelBinding, isRelativeModuleSpecifier, readParsedSourceFile, resolveImportedSourceFile } from '../analysis/source-module-linking.js';
import { readCallCalleeText, readStringLiteralValue, unwrapExpression } from '../analysis/ts-ast-helpers.js';
import type { SourceFileRef } from '../source-address.js';
import {
  KeyRef,
  SymbolRef,
  sourceNodeRefFromTsNode,
  type SourceNodeRef,
} from '../refs.js';
import { DependencyResolution, DependencyResolvedSubject } from './dependency-resolution.js';
import { DependencyRequest } from './dependency-request.js';
import {
  findKnownImportedInterfaceKey,
  InterfaceKey,
  InterfaceKeyDefaultRegistration,
  InterfaceKeyResolverBuilder,
} from './interface-key.js';
export class DependencySubjectResolver {
  private readonly parsedFiles = new Map<string, ts.SourceFile | null>();

  resolveInSourceFile(
    request: DependencyRequest,
    file: SourceFileRef,
    sourceFile: ts.SourceFile,
  ): DependencyResolution {
    return this.resolveRequestInSourceFile(request, file, sourceFile, 0);
  }

  private resolveRequestInSourceFile(
    request: DependencyRequest,
    file: SourceFileRef,
    sourceFile: ts.SourceFile,
    depth: number,
  ): DependencyResolution {
    if (depth > 8) {
      return new DependencyResolution(
        new DependencyResolvedSubject(
          'open',
          null,
          request.source,
          null,
          'Dependency request exceeded the current bounded import-following ceiling.',
        ),
      );
    }

    // TODO: widen this through exports/import alias recovery once the ordinary
    // DI subject basis needs richer package-export closure. This pass now
    // follows bounded same-file and relative-import aliasing plus known
    // framework package interface exports, but it does not yet solve general
    // package export or tsconfig-path symbol flow.
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

    const importBinding = findImportedBinding(sourceFile, request.candidateName);
    if (importBinding != null) {
      const imported = this.resolveImportedBinding(request, file, importBinding, depth + 1);
      if (imported != null) {
        return imported;
      }
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
      return resolveConstructableDeclaration(file, sourceFile, declaration, request.candidateName);
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
        return resolveConstructableDeclaration(file, sourceFile, current, request.candidateName, declaration);
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

  private resolveImportedBinding(
    request: DependencyRequest,
    file: SourceFileRef,
    binding: {
      readonly moduleSpecifier: string;
      readonly exportName: string;
    },
    depth: number,
  ): DependencyResolution | null {
    if (isRelativeModuleSpecifier(binding.moduleSpecifier)) {
      const importedFile = resolveImportedSourceFile(file, binding.moduleSpecifier);
      if (importedFile == null) {
        return null;
      }

      const importedSourceFile = readParsedSourceFile(this.parsedFiles, importedFile);
      if (importedSourceFile == null) {
        return null;
      }

      return this.resolveExportedBinding(
        request,
        importedFile,
        importedSourceFile,
        binding.exportName,
        depth,
      );
    }

    const knownInterface = findKnownImportedInterfaceKey(binding.moduleSpecifier, binding.exportName);
    if (knownInterface != null) {
      return new DependencyResolution(
        new DependencyResolvedSubject(
          'interface-symbol',
          knownInterface.key,
          knownInterface.owner,
          knownInterface,
          `Dependency request closed to known imported interface key ${binding.moduleSpecifier}:${binding.exportName}.`,
        ),
      );
    }

    return new DependencyResolution(
      new DependencyResolvedSubject(
        'open',
        null,
        request.source,
        null,
        `Dependency request ${binding.exportName} is imported from ${binding.moduleSpecifier}, but package-export interface-key closure is still open for that path.`,
      ),
    );
  }

  private resolveExportedBinding(
    request: DependencyRequest,
    file: SourceFileRef,
    sourceFile: ts.SourceFile,
    exportName: string,
    depth: number,
  ): DependencyResolution {
    const declaration = findExportedBinding(sourceFile, exportName);
    if (declaration != null) {
      return this.resolveDeclarationLike(request, file, sourceFile, declaration, exportName, depth);
    }

    const forwarded = findForwardedExport(sourceFile, exportName);
    if (forwarded != null) {
      return this.resolveImportedBinding(request, file, forwarded, depth + 1) ?? new DependencyResolution(
        new DependencyResolvedSubject(
          'open',
          null,
          request.source,
          null,
          `Dependency request ${exportName} followed a forwarded export, but the forwarded path stayed open.`,
        ),
      );
    }

    return new DependencyResolution(
      new DependencyResolvedSubject(
        'open',
        null,
        request.source,
        null,
        `Dependency request ${exportName} followed a relative import, but the exported binding did not close in the imported file.`,
      ),
    );
  }

  private resolveDeclarationLike(
    request: DependencyRequest,
    file: SourceFileRef,
    sourceFile: ts.SourceFile,
    declaration: ts.Declaration,
    fallbackName: string,
    depth: number,
  ): DependencyResolution {
    if (ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration)) {
      return resolveConstructableDeclaration(file, sourceFile, declaration, fallbackName);
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
            `Dependency request ${fallbackName} matched a declaration without an initializer, so key identity is still open.`,
          ),
        );
      }

      const current = unwrapExpression(initializer);
      if (ts.isClassExpression(current)) {
        return resolveConstructableDeclaration(file, sourceFile, current, fallbackName, declaration);
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

      if (ts.isIdentifier(current)) {
        const importedBinding = findImportedBinding(sourceFile, current.text);
        if (importedBinding != null) {
          return this.resolveImportedBinding(request, file, importedBinding, depth + 1) ?? new DependencyResolution(
            new DependencyResolvedSubject(
              'open',
              null,
              request.source,
              null,
              `Dependency request ${current.text} aliases an imported key, but that imported path stayed open.`,
            ),
          );
        }

        const aliased = findTopLevelBinding(sourceFile, current.text);
        if (aliased != null) {
          return this.resolveDeclarationLike(request, file, sourceFile, aliased, current.text, depth + 1);
        }
      }
    }

    return new DependencyResolution(
      new DependencyResolvedSubject(
        'open',
        null,
        request.source,
        null,
        `Dependency request ${fallbackName} matched a declaration shape that this bounded subject-resolution pass does not yet interpret.`,
      ),
    );
  }
}

function resolveConstructableDeclaration(
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
  const defaultRegistrationBuilder = readInterfaceDefaultRegistrationBuilder(expression, file, sourceFile);

  return new InterfaceKey(
    `interface-key:${declaration.name.text}`,
    owner,
    key,
    friendlyName,
    defaultRegistrationBuilder?.producedRegistration ?? null,
    defaultRegistrationBuilder,
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

function readInterfaceDefaultRegistrationBuilder(
  expression: ts.CallExpression,
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
): InterfaceKeyResolverBuilder | null {
  const configure = expression.arguments.find(isFunctionExpressionLike);
  if (configure == null) {
    return null;
  }

  const bodyExpression = readReturnedExpression(configure);
  const builderSource = createNodeRef(file, sourceFile, bodyExpression ?? configure);
  if (bodyExpression == null || !ts.isCallExpression(bodyExpression)) {
    return new InterfaceKeyResolverBuilder(
      builderSource,
      null,
      'Interface default-registration callback did not return a builder method call that this pass can close.',
    );
  }

  const callee = readCallCalleeText(bodyExpression.expression);
  const kind = callee == null
    ? null
    : readDefaultRegistrationKind(callee);
  if (kind == null) {
    return new InterfaceKeyResolverBuilder(
      builderSource,
      null,
      'Interface default-registration callback returned a call outside the currently recognized ResolverBuilder surface.',
    );
  }

  return new InterfaceKeyResolverBuilder(
    builderSource,
    new InterfaceKeyDefaultRegistration(
      kind,
      builderSource,
      null,
      kind === 'alias'
        ? 'Default alias registration target is not yet resolved in this first same-file interface-key reader.'
        : null,
    ),
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
  const declaration = findTopLevelBinding(sourceFile, name);
  return declaration != null
    && (ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration) || ts.isVariableDeclaration(declaration))
    ? declaration
    : null;
}

function createNodeRef(
  file: SourceFileRef,
  sourceFile: ts.SourceFile,
  node: ts.Node,
): SourceNodeRef {
  return sourceNodeRefFromTsNode(file, node, sourceFile);
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
