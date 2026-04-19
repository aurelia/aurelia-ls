import { resolve } from 'node:path';

import * as ts from 'typescript';

import { createLiveQueryKernel } from '../live-query/runtime.js';
import {
  isAureliaFrameworkPackageName,
} from '../aurelia-framework-goldens.js';
import type { PackageExportsSummary } from '../exports-contract.js';
import type {
  InterfaceRecord,
  Registration,
  RegistrationKind,
  SymbolLocation,
} from './di-interface-contract.js';

export interface CollectAureliaDiInterfaceExportsOptions {
  readonly repoPath: string;
  readonly packageNames?: readonly string[] | null;
}

interface InterfaceOrigin {
  readonly declaredAt: SymbolLocation | null;
  readonly name: string | null;
  readonly exportAliasPath: readonly string[];
  readonly factoryAliasPath: readonly string[];
  readonly registration: Registration | null;
}

interface CreateInterfaceCallInfo {
  readonly factoryAliasPath: readonly string[];
  readonly name: string | null;
  readonly registration: Registration | null;
}

export function collectAureliaDiInterfaceExports(
  options: CollectAureliaDiInterfaceExportsOptions,
): readonly InterfaceRecord[] {
  const repoPath = resolve(options.repoPath);
  const kernel = createLiveQueryKernel({ repoPath });
  const session = kernel.session;
  const outputs = kernel.loadOutputs();
  const explicitPackages = options.packageNames
    ? new Set(options.packageNames)
    : null;

  const selectedPackages = outputs.exports.packages
    .filter((pkg) => explicitPackages
      ? explicitPackages.has(pkg.package_name)
      : isAureliaFrameworkPackageName(pkg.package_name))
    .sort((left, right) => left.package_name.localeCompare(right.package_name));

  const records: InterfaceRecord[] = [];
  for (const pkg of selectedPackages) {
    const program = createPackageProgram(session, repoPath, pkg);
    const checker = program.getTypeChecker();
    const entrypointSourceFile = getSourceFile(program, repoPath, pkg.analysis_entrypoint);
    const entrypointModuleSymbol = entrypointSourceFile
      ? getModuleSymbol(checker, entrypointSourceFile)
      : null;

    if (!entrypointSourceFile || !entrypointModuleSymbol) {
      continue;
    }

    const exportSymbols = checker
      .getExportsOfModule(entrypointModuleSymbol)
      .filter((symbol) => symbol.getName() !== '__esModule')
      .sort((left, right) => left.getName().localeCompare(right.getName()));

    for (const exportSymbol of exportSymbols) {
      const record = classifyInterfaceExport(
        session,
        checker,
        pkg,
        exportSymbol,
      );
      if (record) {
        records.push(record);
      }
    }
  }

  return records.sort(compareRecords);
}

function createPackageProgram(
  session: ReturnType<typeof createLiveQueryKernel>['session'],
  repoPath: string,
  pkg: PackageExportsSummary,
): ts.Program {
  const entrypointAbs = resolve(repoPath, pkg.analysis_entrypoint);
  const tsconfigPath = session.resolveNearestTsconfig(pkg.package_dir);
  if (!tsconfigPath) {
    return createFallbackProgram(entrypointAbs);
  }

  const loaded = session.tryLoadTsconfig(tsconfigPath);
  if (!loaded.snapshot) {
    return createFallbackProgram(entrypointAbs);
  }

  return session.getProgram(loaded.snapshot.absPath, 'analysis', {
    cache: true,
  }) ?? createFallbackProgram(entrypointAbs);
}

function createFallbackProgram(
  entrypointAbs: string,
): ts.Program {
  return ts.createProgram(
    [entrypointAbs],
    {
      allowJs: false,
      checkJs: false,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      noEmit: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
    },
  );
}

function getSourceFile(
  program: ts.Program,
  repoPath: string,
  relPath: string,
): ts.SourceFile | null {
  return program.getSourceFile(resolve(repoPath, relPath)) ?? null;
}

function getModuleSymbol(
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
): ts.Symbol | null {
  const direct = (sourceFile as ts.SourceFile & { symbol?: ts.Symbol }).symbol;
  return direct ?? checker.getSymbolAtLocation(sourceFile) ?? null;
}

function classifyInterfaceExport(
  session: ReturnType<typeof createLiveQueryKernel>['session'],
  checker: ts.TypeChecker,
  pkg: PackageExportsSummary,
  exportSymbol: ts.Symbol,
): InterfaceRecord | null {
  const resolvedExportSymbol = (exportSymbol.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(exportSymbol)
    : exportSymbol;
  const variableDeclaration = findVariableDeclaration(
    exportSymbol,
    resolvedExportSymbol,
  );
  if (!variableDeclaration?.initializer) {
    return null;
  }

  const origin = resolveInterfaceOrigin(
    checker,
    variableDeclaration.initializer,
  );
  if (!origin) {
    return null;
  }

  const exportSite: SymbolLocation = {
    name: exportSymbol.getName(),
    file: toRepoRelative(session, variableDeclaration.getSourceFile().fileName),
    line: lineOfNode(variableDeclaration.getSourceFile(), variableDeclaration),
  };

  return {
    package: {
      name: pkg.package_name,
      dir: pkg.package_dir,
      analysisEntrypoint: pkg.analysis_entrypoint,
    },
    export: exportSite,
    surface: {
      name: origin.name,
      declaredAt: origin.declaredAt == null
        ? null
        : {
          name: origin.declaredAt.name,
          file: origin.declaredAt.file == null
            ? null
            : toRepoRelative(session, origin.declaredAt.file),
          line: origin.declaredAt.line,
        },
      exportAliasPath: origin.exportAliasPath,
      factoryAliasPath: origin.factoryAliasPath,
    },
    registration: origin.registration,
  };
}

function findVariableDeclaration(
  exportSymbol: ts.Symbol,
  resolvedExportSymbol: ts.Symbol,
): ts.VariableDeclaration | null {
  const declarations = [
    ...(resolvedExportSymbol.declarations ?? []),
    ...(exportSymbol.declarations ?? []),
  ];
  for (const declaration of declarations) {
    if (ts.isVariableDeclaration(declaration)) {
      return declaration;
    }
  }
  return null;
}

function resolveInterfaceOrigin(
  checker: ts.TypeChecker,
  expression: ts.Expression,
  visitedSymbols = new Set<ts.Symbol>(),
): InterfaceOrigin | null {
  const unwrapped = unwrapExpression(expression);
  if (ts.isCallExpression(unwrapped)) {
    const callInfo = resolveCreateInterfaceCallInfo(
      checker,
      unwrapped,
      visitedSymbols,
    );
    if (callInfo) {
      return {
        declaredAt: null,
        name: callInfo.name,
        exportAliasPath: [],
        factoryAliasPath: callInfo.factoryAliasPath,
        registration: callInfo.registration,
      };
    }
  }

  const symbol = symbolForExpression(checker, unwrapped);
  if (!symbol) {
    return null;
  }

  return resolveInterfaceSymbolOrigin(
    checker,
    symbol,
    visitedSymbols,
  );
}

function resolveInterfaceSymbolOrigin(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  visitedSymbols: Set<ts.Symbol>,
): InterfaceOrigin | null {
  const target = (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(symbol)
    : symbol;
  if (visitedSymbols.has(target)) {
    return null;
  }
  visitedSymbols.add(target);

  for (const declaration of target.declarations ?? []) {
    if (!ts.isVariableDeclaration(declaration) || !declaration.initializer) {
      continue;
    }

    const declarationSite: SymbolLocation = {
      name: identifierText(declaration.name),
      file: toForwardSlash(declaration.getSourceFile().fileName),
      line: lineOfNode(declaration.getSourceFile(), declaration),
    };

    const directOrigin = resolveInterfaceOrigin(
      checker,
      declaration.initializer,
      visitedSymbols,
    );
    if (!directOrigin) {
      continue;
    }

    return {
      declaredAt: directOrigin.declaredAt ?? declarationSite,
      name: directOrigin.name,
      exportAliasPath: [
        declarationSite.name ?? target.getName(),
        ...directOrigin.exportAliasPath,
      ],
      factoryAliasPath: directOrigin.factoryAliasPath,
      registration: directOrigin.registration,
    };
  }

  return null;
}

function resolveCreateInterfaceCallInfo(
  checker: ts.TypeChecker,
  callExpression: ts.CallExpression,
  visitedSymbols: Set<ts.Symbol>,
): CreateInterfaceCallInfo | null {
  const aliasPath = resolveCreateInterfaceFactoryAliasPath(
    checker,
    callExpression.expression,
    visitedSymbols,
  );
  if (!aliasPath) {
    return null;
  }

  const nameArgument = callExpression.arguments[0];
  const name = nameArgument && ts.isStringLiteralLike(nameArgument)
    ? nameArgument.text
    : '(anonymous)';

  return {
    factoryAliasPath: aliasPath,
    name,
    registration: extractRegistration(callExpression),
  };
}

function resolveCreateInterfaceFactoryAliasPath(
  checker: ts.TypeChecker,
  expression: ts.Expression,
  visitedSymbols: Set<ts.Symbol>,
): readonly string[] | null {
  const unwrapped = unwrapExpression(expression);
  if (isDirectDiCreateInterfaceAccess(checker, unwrapped)) {
    return [];
  }

  if (!ts.isIdentifier(unwrapped)) {
    return null;
  }

  const symbol = checker.getSymbolAtLocation(unwrapped);
  if (!symbol) {
    return null;
  }

  const target = (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(symbol)
    : symbol;
  if (isKernelCreateInterfaceSymbol(target)) {
    return [];
  }

  const aliasPath = resolveCreateInterfaceFactorySymbolAliasPath(
    checker,
    symbol,
    visitedSymbols,
  );
  if (!aliasPath) {
    return null;
  }

  return [unwrapped.text, ...aliasPath];
}

function resolveCreateInterfaceFactorySymbolAliasPath(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  visitedSymbols: Set<ts.Symbol>,
): readonly string[] | null {
  const target = (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(symbol)
    : symbol;
  if (isKernelCreateInterfaceSymbol(target)) {
    return [];
  }
  if (visitedSymbols.has(target)) {
    return null;
  }
  visitedSymbols.add(target);

  for (const declaration of target.declarations ?? []) {
    if (!ts.isVariableDeclaration(declaration) || !declaration.initializer) {
      continue;
    }

    const nestedAliasPath = resolveCreateInterfaceFactoryAliasPath(
      checker,
      declaration.initializer,
      visitedSymbols,
    );
    if (nestedAliasPath) {
      return nestedAliasPath;
    }
  }

  return null;
}

function isKernelCreateInterfaceSymbol(
  symbol: ts.Symbol,
): boolean {
  if (symbol.getName() !== 'createInterface') {
    return false;
  }

  return (symbol.declarations ?? []).some((declaration) =>
    ts.isVariableDeclaration(declaration)
    && toForwardSlash(declaration.getSourceFile().fileName).endsWith('/packages/kernel/src/di.ts'));
}

function isDirectDiCreateInterfaceAccess(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): boolean {
  const unwrapped = unwrapExpression(expression);
  if (!ts.isPropertyAccessExpression(unwrapped)) {
    return false;
  }

  if (unwrapped.name.text !== 'createInterface') {
    return false;
  }

  const owner = unwrapExpression(unwrapped.expression);
  if (!ts.isIdentifier(owner) || owner.text !== 'DI') {
    return false;
  }

  const ownerSymbol = checker.getSymbolAtLocation(owner);
  if (!ownerSymbol) {
    return false;
  }

  return (ownerSymbol.flags & ts.SymbolFlags.Alias) === 0
    ? ownerSymbol.getName() === 'DI'
    : checker.getAliasedSymbol(ownerSymbol).getName() === 'DI';
}

function extractRegistration(
  callExpression: ts.CallExpression,
): Registration | null {
  const builderExpression = findBuilderExpression(callExpression);
  if (!builderExpression) {
    return null;
  }

  const returned = unwrapExpression(builderExpression);
  if (!ts.isCallExpression(returned)) {
    return {
      kind: 'unknown',
      expressionText: returned.getText(returned.getSourceFile()),
    };
  }

  const callee = unwrapExpression(returned.expression);
  if (!ts.isPropertyAccessExpression(callee)) {
    return {
      kind: 'unknown',
      expressionText: returned.getText(returned.getSourceFile()),
    };
  }

  return {
    kind: toRegistrationKind(callee.name.text),
    expressionText: returned.arguments[0]
      ? returned.arguments[0].getText(returned.getSourceFile())
      : null,
  };
}

function findBuilderExpression(
  callExpression: ts.CallExpression,
): ts.Expression | null {
  const builderArgument = callExpression.arguments.find((arg) =>
    ts.isArrowFunction(arg) || ts.isFunctionExpression(arg));
  if (!builderArgument) {
    return null;
  }

  if (ts.isArrowFunction(builderArgument)) {
    if (ts.isBlock(builderArgument.body)) {
      return firstReturnedExpression(builderArgument.body);
    }
    return builderArgument.body;
  }

  return firstReturnedExpression(builderArgument.body);
}

function firstReturnedExpression(
  block: ts.Block,
): ts.Expression | null {
  for (const statement of block.statements) {
    if (ts.isReturnStatement(statement) && statement.expression) {
      return statement.expression;
    }
  }
  return null;
}

function toRegistrationKind(
  value: string,
): RegistrationKind {
  switch (value) {
    case 'instance':
    case 'singleton':
    case 'transient':
    case 'callback':
    case 'cachedCallback':
    case 'aliasTo':
      return value;
    default:
      return 'unknown';
  }
}

function symbolForExpression(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): ts.Symbol | null {
  if (ts.isIdentifier(expression)) {
    return checker.getSymbolAtLocation(expression) ?? null;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return checker.getSymbolAtLocation(expression.name)
      ?? checker.getSymbolAtLocation(expression)
      ?? null;
  }
  return null;
}

function unwrapExpression(
  expression: ts.Expression,
): ts.Expression {
  let current = expression;
  while (true) {
    if (ts.isParenthesizedExpression(current)) {
      current = current.expression;
      continue;
    }
    if (ts.isAsExpression(current) || ts.isTypeAssertionExpression(current)) {
      current = current.expression;
      continue;
    }
    if (ts.isNonNullExpression(current)) {
      current = current.expression;
      continue;
    }
    return current;
  }
}

function identifierText(
  name: ts.BindingName,
): string | null {
  return ts.isIdentifier(name) ? name.text : null;
}

function lineOfNode(
  sourceFile: ts.SourceFile,
  node: ts.Node,
): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function toRepoRelative(
  session: ReturnType<typeof createLiveQueryKernel>['session'],
  absPath: string,
): string {
  const normalizedAbsPath = resolve(absPath.replace(/\//g, '\\'));
  const relPath = session.toRepoRelative(normalizedAbsPath);
  return relPath.startsWith('..') ? toForwardSlash(normalizedAbsPath) : relPath;
}

function toForwardSlash(
  value: string,
): string {
  return value.replace(/\\/g, '/');
}

function compareRecords(
  left: InterfaceRecord,
  right: InterfaceRecord,
): number {
  return left.package.name.localeCompare(right.package.name)
    || (left.export.name ?? '').localeCompare(right.export.name ?? '')
    || (left.export.file ?? '').localeCompare(right.export.file ?? '')
    || (left.surface.declaredAt?.file ?? '').localeCompare(right.surface.declaredAt?.file ?? '');
}
