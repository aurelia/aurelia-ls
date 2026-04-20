import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import type { HelperCall } from '../configurations/index.js';
import { SourceFileRef, SourceNodeRef, SourceSpan } from '../refs.js';
import type { FrameworkApiCatalog } from './framework-api-catalog.js';
import { FrameworkApiIngress, FrameworkApiRouteStep } from './framework-api-ingress.js';

export interface FrameworkApiIngressScannerOptions {
  readonly catalog: FrameworkApiCatalog;
}

export interface FrameworkApiIngressScannerState {
  readonly parsedFileCount: number;
}

type ImportPathResolution = {
  readonly kind: 'import-path';
  readonly moduleSpecifier: string;
  readonly exportName: string;
  readonly memberPath: readonly string[];
  readonly route: readonly FrameworkApiRouteStep[];
};

type DeclarationPathResolution = {
  readonly kind: 'declaration-path';
  readonly declaredInFile: string;
  readonly exportName: string;
  readonly memberPath: readonly string[];
  readonly route: readonly FrameworkApiRouteStep[];
};

type OpenResolution = {
  readonly kind: 'open';
  readonly route: readonly FrameworkApiRouteStep[];
  readonly note: string;
};

type ExpressionResolution =
  | ImportPathResolution
  | DeclarationPathResolution
  | OpenResolution;

export class FrameworkApiIngressScanner {
  private readonly catalogValue: FrameworkApiCatalog;
  private readonly parsedFiles = new Map<string, ts.SourceFile | null>();

  constructor(
    options: FrameworkApiIngressScannerOptions,
  ) {
    this.catalogValue = options.catalog;
  }

  readIngress(
    call: HelperCall,
  ): FrameworkApiIngress {
    const sourceFile = this.readParsedSourceFile(call.source.file);
    if (sourceFile == null) {
      return new FrameworkApiIngress(
        `${call.id}:framework-api-ingress`,
        call.source,
        'miss',
        null,
        [],
        'Could not parse the source file for this helper call.',
      );
    }

    const callExpression = findNodeBySpan(
      sourceFile,
      call.source.span.start,
      call.source.span.end,
      ts.isCallExpression,
    );
    if (callExpression == null) {
      return new FrameworkApiIngress(
        `${call.id}:framework-api-ingress`,
        call.source,
        'miss',
        null,
        [],
        'Could not rehydrate the call expression from its source ref.',
      );
    }

    const resolution = this.resolveExpression(
      callExpression.expression,
      sourceFile,
      call.source.file,
      0,
      [
        new FrameworkApiRouteStep(
          'call-expression',
          call.source,
          'Start from helper-call syntax witness.',
        ),
      ],
    );

    if (resolution.kind === 'import-path') {
      const api = this.catalogValue.findByImportPath(
        resolution.moduleSpecifier,
        resolution.exportName,
        resolution.memberPath,
      );
      if (api != null) {
        return new FrameworkApiIngress(
          `${call.id}:framework-api-ingress`,
          call.source,
          'closed',
          api,
          resolution.route,
          `Resolved ${call.calleeName} to canonical framework API ${api.id}.`,
        );
      }

      return new FrameworkApiIngress(
        `${call.id}:framework-api-ingress`,
        call.source,
        'open',
        null,
        resolution.route,
        `No canonical framework API catalog entry matched ${resolution.moduleSpecifier}:${resolution.exportName}${formatMemberPath(resolution.memberPath)}.`,
      );
    }

    if (resolution.kind === 'declaration-path') {
      const api = this.catalogValue.findByDeclaredPath(
        resolution.declaredInFile,
        resolution.exportName,
        resolution.memberPath,
      );
      if (api != null) {
        return new FrameworkApiIngress(
          `${call.id}:framework-api-ingress`,
          call.source,
          'closed',
          api,
          resolution.route,
          `Resolved ${call.calleeName} to canonical framework API ${api.id}.`,
        );
      }

      return new FrameworkApiIngress(
        `${call.id}:framework-api-ingress`,
        call.source,
        'open',
        null,
        resolution.route,
        `No canonical framework API catalog entry matched ${resolution.declaredInFile}:${resolution.exportName}${formatMemberPath(resolution.memberPath)}.`,
      );
    }

    return new FrameworkApiIngress(
      `${call.id}:framework-api-ingress`,
      call.source,
      'open',
      null,
      resolution.route,
      resolution.note,
    );
  }

  inspectState(): FrameworkApiIngressScannerState {
    return {
      parsedFileCount: this.parsedFiles.size,
    };
  }

  private resolveExpression(
    expression: ts.Expression,
    sourceFile: ts.SourceFile,
    file: SourceFileRef,
    depth: number,
    route: readonly FrameworkApiRouteStep[],
  ): ExpressionResolution {
    if (depth > 8) {
      return {
        kind: 'open',
        route,
        note: 'Framework API ingress exceeded the current bounded alias-depth ceiling.',
      };
    }

    if (ts.isPropertyAccessExpression(expression)) {
      const base = this.resolveExpression(
        expression.expression,
        sourceFile,
        file,
        depth + 1,
        [
          ...route,
          new FrameworkApiRouteStep(
            'member-access',
            createNodeRef(file, expression),
            expression.name.text,
          ),
        ],
      );
      if (base.kind === 'import-path') {
        return {
          kind: 'import-path',
          moduleSpecifier: base.moduleSpecifier,
          exportName: base.exportName,
          memberPath: [...base.memberPath, expression.name.text],
          route: base.route,
        };
      }
      if (base.kind === 'declaration-path') {
        return {
          kind: 'declaration-path',
          declaredInFile: base.declaredInFile,
          exportName: base.exportName,
          memberPath: [...base.memberPath, expression.name.text],
          route: base.route,
        };
      }
      return base;
    }

    if (ts.isIdentifier(expression)) {
      const importBinding = findImportedBinding(sourceFile, expression.text);
      if (importBinding != null) {
        if (isRelativeModuleSpecifier(importBinding.moduleSpecifier)) {
          // TODO: relative-import following is intentionally limited to direct
          // export aliases and variable initializers. Richer module evaluation,
          // namespace imports, and tsconfig path mapping belong in a later
          // ingress-expansion seam.
          const imported = this.resolveRelativeImportBinding(
            file,
            importBinding.moduleSpecifier,
            importBinding.exportName,
            depth + 1,
            [
              ...route,
              new FrameworkApiRouteStep(
                'relative-import-follow',
                createNodeRef(file, expression),
                `${importBinding.moduleSpecifier}:${importBinding.exportName}`,
              ),
            ],
          );
          if (imported != null) {
            return imported;
          }
        }

        return {
          kind: 'import-path',
          moduleSpecifier: importBinding.moduleSpecifier,
          exportName: importBinding.exportName,
          memberPath: [],
          route: [
            ...route,
            new FrameworkApiRouteStep(
              'import-binding',
              createNodeRef(file, expression),
              `${importBinding.moduleSpecifier}:${importBinding.exportName}`,
            ),
          ],
        };
      }

      const declaration = findTopLevelBinding(sourceFile, expression.text);
      if (declaration == null) {
        return {
          kind: 'open',
          route: [
            ...route,
            new FrameworkApiRouteStep(
              'unsupported-shape',
              createNodeRef(file, expression),
              `Unresolved identifier ${expression.text}`,
            ),
          ],
          note: `Could not resolve identifier ${expression.text} to a framework API ingress path.`,
        };
      }

      const declaredInFile = normalizeFilePath(file);
      const directDeclaredApi = this.catalogValue.findByDeclaredPath(
        declaredInFile,
        expression.text,
      );
      if (directDeclaredApi != null || this.catalogValue.hasDeclaredRoot(declaredInFile, expression.text)) {
        return {
          kind: 'declaration-path',
          declaredInFile,
          exportName: expression.text,
          memberPath: [],
          route: [
            ...route,
            new FrameworkApiRouteStep(
              'local-alias',
              createNodeRef(file, declaration),
              expression.text,
            ),
          ],
        };
      }

      if (ts.isVariableDeclaration(declaration) && declaration.initializer != null) {
        return this.resolveExpression(
          declaration.initializer,
          sourceFile,
          file,
          depth + 1,
          [
            ...route,
            new FrameworkApiRouteStep(
              'local-alias',
              createNodeRef(file, declaration),
              expression.text,
            ),
          ],
        );
      }

      return {
        kind: 'open',
        route: [
          ...route,
          new FrameworkApiRouteStep(
            'unsupported-shape',
            createNodeRef(file, declaration),
            ts.SyntaxKind[declaration.kind],
          ),
        ],
        note: `Binding ${expression.text} currently resolves to an unsupported declaration shape for framework API ingress.`,
      };
    }

    return {
      kind: 'open',
      route: [
        ...route,
        new FrameworkApiRouteStep(
          'unsupported-shape',
          createNodeRef(file, expression),
          ts.SyntaxKind[expression.kind],
        ),
      ],
      note: `Expression kind ${ts.SyntaxKind[expression.kind]} is not yet part of the bounded framework API ingress ceiling.`,
    };
  }

  private resolveRelativeImportBinding(
    file: SourceFileRef,
    moduleSpecifier: string,
    exportName: string,
    depth: number,
    route: readonly FrameworkApiRouteStep[],
  ): ExpressionResolution | null {
    const importedFile = this.resolveImportedSourceFile(file, moduleSpecifier);
    if (importedFile == null) {
      return null;
    }

    const sourceFile = this.readParsedSourceFile(importedFile);
    if (sourceFile == null) {
      return null;
    }

    const exportDeclaration = findExportedBinding(sourceFile, exportName);
    if (exportDeclaration != null) {
      const declaredInFile = normalizeFilePath(importedFile);
      const directDeclaredApi = this.catalogValue.findByDeclaredPath(
        declaredInFile,
        exportName,
      );
      if (directDeclaredApi != null || this.catalogValue.hasDeclaredRoot(declaredInFile, exportName)) {
        return {
          kind: 'declaration-path',
          declaredInFile,
          exportName,
          memberPath: [],
          route: [
            ...route,
            new FrameworkApiRouteStep(
              'export-alias',
              createNodeRef(importedFile, exportDeclaration),
              exportName,
            ),
          ],
        };
      }

      if (ts.isVariableDeclaration(exportDeclaration) && exportDeclaration.initializer != null) {
        return this.resolveExpression(
          exportDeclaration.initializer,
          sourceFile,
          importedFile,
          depth,
          [
            ...route,
            new FrameworkApiRouteStep(
              'export-alias',
              createNodeRef(importedFile, exportDeclaration),
              exportName,
            ),
          ],
        );
      }
    }

    const forwarded = findForwardedExport(sourceFile, exportName);
    if (forwarded != null) {
      if (!isRelativeModuleSpecifier(forwarded.moduleSpecifier)) {
        return {
          kind: 'import-path',
          moduleSpecifier: forwarded.moduleSpecifier,
          exportName: forwarded.exportName,
          memberPath: [],
          route: [
            ...route,
            new FrameworkApiRouteStep(
              'export-alias',
              null,
              `${forwarded.moduleSpecifier}:${forwarded.exportName}`,
            ),
          ],
        };
      }

      return this.resolveRelativeImportBinding(
        importedFile,
        forwarded.moduleSpecifier,
        forwarded.exportName,
        depth + 1,
        [
          ...route,
          new FrameworkApiRouteStep(
            'export-alias',
            null,
            `${forwarded.moduleSpecifier}:${forwarded.exportName}`,
          ),
        ],
      );
    }

    return null;
  }

  private readParsedSourceFile(
    file: SourceFileRef,
  ): ts.SourceFile | null {
    const resolvedPath = path.isAbsolute(file.path)
      ? file.path
      : path.join(file.program.repoRoot, file.path);
    const normalized = resolvedPath.replace(/\\/g, '/');
    const cached = this.parsedFiles.get(normalized);
    if (cached !== undefined) {
      return cached;
    }

    if (!fs.existsSync(resolvedPath)) {
      this.parsedFiles.set(normalized, null);
      return null;
    }

    const text = fs.readFileSync(resolvedPath, 'utf8');
    const sourceFile = ts.createSourceFile(
      resolvedPath,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    this.parsedFiles.set(normalized, sourceFile);
    return sourceFile;
  }

  private resolveImportedSourceFile(
    from: SourceFileRef,
    moduleSpecifier: string,
  ): SourceFileRef | null {
    const fromPath = path.isAbsolute(from.path)
      ? from.path
      : path.join(from.program.repoRoot, from.path);
    const candidateBase = path.resolve(path.dirname(fromPath), moduleSpecifier);
    const candidates = [
      candidateBase,
      `${candidateBase}.ts`,
      `${candidateBase}.tsx`,
      path.join(candidateBase, 'index.ts'),
      path.join(candidateBase, 'index.tsx'),
    ];

    for (const current of candidates) {
      if (!fs.existsSync(current)) {
        continue;
      }

      const normalized = path.isAbsolute(current)
        ? path.relative(from.program.repoRoot, current).replace(/\\/g, '/')
        : current.replace(/\\/g, '/');
      return new SourceFileRef(
        `file:${normalized}`,
        from.program,
        normalized,
      );
    }

    return null;
  }
}

function findImportedBinding(
  sourceFile: ts.SourceFile,
  localName: string,
): {
  readonly moduleSpecifier: string;
  readonly exportName: string;
} | null {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }

    const clause = statement.importClause;
    if (clause == null) {
      continue;
    }

    if (clause.name?.text === localName) {
      return {
        moduleSpecifier: statement.moduleSpecifier.text,
        exportName: 'default',
      };
    }

    const bindings = clause.namedBindings;
    if (bindings != null && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        const boundName = element.name.text;
        if (boundName !== localName) {
          continue;
        }

        return {
          moduleSpecifier: statement.moduleSpecifier.text,
          exportName: element.propertyName?.text ?? element.name.text,
        };
      }
    }
  }

  return null;
}

function findTopLevelBinding(
  sourceFile: ts.SourceFile,
  name: string,
): ts.Declaration | null {
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
          return declaration;
        }
      }
      continue;
    }

    if (
      (ts.isFunctionDeclaration(statement)
        || ts.isClassDeclaration(statement)
        || ts.isEnumDeclaration(statement)
        || ts.isInterfaceDeclaration(statement)
        || ts.isTypeAliasDeclaration(statement))
      && statement.name?.text === name
    ) {
      return statement;
    }
  }

  return null;
}

function findExportedBinding(
  sourceFile: ts.SourceFile,
  exportName: string,
): ts.Declaration | null {
  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement)) {
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === exportName) {
          return declaration;
        }
      }
      continue;
    }

    if (
      (ts.isFunctionDeclaration(statement)
        || ts.isClassDeclaration(statement)
        || ts.isEnumDeclaration(statement)
        || ts.isInterfaceDeclaration(statement)
        || ts.isTypeAliasDeclaration(statement))
      && statement.name?.text === exportName
    ) {
      return statement;
    }
  }

  return null;
}

function findForwardedExport(
  sourceFile: ts.SourceFile,
  exportName: string,
): {
  readonly moduleSpecifier: string;
  readonly exportName: string;
} | null {
  for (const statement of sourceFile.statements) {
    if (
      !ts.isExportDeclaration(statement)
      || statement.exportClause == null
      || !ts.isNamedExports(statement.exportClause)
      || statement.moduleSpecifier == null
      || !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      continue;
    }

    for (const element of statement.exportClause.elements) {
      if (element.name.text !== exportName) {
        continue;
      }

      return {
        moduleSpecifier: statement.moduleSpecifier.text,
        exportName: element.propertyName?.text ?? element.name.text,
      };
    }
  }

  return null;
}

function hasExportModifier(
  node: ts.Node,
): boolean {
  const modifiers = ts.canHaveModifiers(node)
    ? ts.getModifiers(node)
    : undefined;
  return modifiers?.some((current) => current.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function findNodeBySpan<T extends ts.Node>(
  root: ts.Node,
  start: number,
  end: number,
  guard: (node: ts.Node) => node is T,
): T | null {
  let match: T | null = null;

  const visit = (node: ts.Node): void => {
    if (match != null) {
      return;
    }

    if (guard(node) && node.getStart() === start && node.end === end) {
      match = node;
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(root);
  return match;
}

function createNodeRef(
  file: SourceFileRef,
  node: ts.Node,
): SourceNodeRef {
  return new SourceNodeRef(
    `${file.id}:${ts.SyntaxKind[node.kind]}:${node.getStart()}-${node.end}`,
    file,
    ts.SyntaxKind[node.kind],
    new SourceSpan(node.getStart(), node.end),
  );
}

function isRelativeModuleSpecifier(
  moduleSpecifier: string,
): boolean {
  return moduleSpecifier.startsWith('./') || moduleSpecifier.startsWith('../');
}

function normalizeFilePath(
  file: SourceFileRef,
): string {
  return file.path.replace(/\\/g, '/');
}

function formatMemberPath(
  memberPath: readonly string[],
): string {
  return memberPath.length === 0
    ? ''
    : `.${memberPath.join('.')}`;
}
