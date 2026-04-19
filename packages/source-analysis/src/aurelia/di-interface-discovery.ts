import * as ts from 'typescript';
import type { PackageExportsSummary } from '../exports-contract.js';
import type {
  InterfaceRecord,
  Registration,
  SymbolLocation,
} from './di-interface-contract.js';
import {
  detectApiCall,
} from './api-detection.js';
import type {
  ApiDetection,
} from './api-detection-contract.js';
import {
  extractBuilderRegistration,
} from './registration-shape.js';
import {
  createLensContext,
  type LensContext,
} from './lens-context.js';
import {
  createPackageProgram,
  getModuleSymbol,
  getSourceFile,
  identifierText,
  lineOfNode,
  symbolForExpression,
  toForwardSlash,
  toRepoRelative,
  unwrapExpression,
} from './ts-analysis-utils.js';

export interface CollectDiInterfaceExportsOptions {
  readonly repoPath: string;
  readonly packageNames?: readonly string[] | null;
}

type Session =
  ReturnType<typeof createLensContext>['session'];

interface InterfaceOrigin {
  readonly declaredAt: SymbolLocation | null;
  readonly name: string | null;
  readonly exportAliasPath: readonly string[];
  readonly factoryAliasPath: readonly string[];
  readonly api: ApiDetection;
  readonly registration: Registration | null;
}

interface CreateInterfaceCallInfo {
  readonly factoryAliasPath: readonly string[];
  readonly name: string | null;
  readonly api: ApiDetection;
  readonly registration: Registration | null;
}

export function collectDiInterfaceExports(
  options: CollectDiInterfaceExportsOptions,
): readonly InterfaceRecord[] {
  return collectDiInterfaceExportsFromContext(
    createLensContext(options),
  );
}

export function collectDiInterfaceExportsFromContext(
  context: LensContext,
): readonly InterfaceRecord[] {
  const { repoPath, session, selectedPackages } = context;
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

function classifyInterfaceExport(
  session: Session,
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
    api: normalizeApiDetection(session, origin.api),
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
    );
    if (callInfo) {
      return {
        declaredAt: null,
        name: callInfo.name,
        exportAliasPath: [],
        factoryAliasPath: callInfo.factoryAliasPath,
        api: callInfo.api,
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
      api: directOrigin.api,
      registration: directOrigin.registration,
    };
  }

  return null;
}

function resolveCreateInterfaceCallInfo(
  checker: ts.TypeChecker,
  callExpression: ts.CallExpression,
): CreateInterfaceCallInfo | null {
  const api = detectApiCall(checker, callExpression);
  if (!api || api.apiId !== 'di.createInterface') {
    return null;
  }

  const nameArgument = callExpression.arguments[0];
  const name = nameArgument && ts.isStringLiteralLike(nameArgument)
    ? nameArgument.text
    : '(anonymous)';

  return {
    factoryAliasPath: api.aliasPath,
    name,
    api,
    registration: extractBuilderRegistration(callExpression),
  };
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

function normalizeApiDetection(
  session: Session,
  api: ApiDetection,
): ApiDetection {
  return {
    ...api,
    resolvedAt: api.resolvedAt == null || api.resolvedAt.file == null
      ? api.resolvedAt
      : {
        ...api.resolvedAt,
        file: toRepoRelative(session, api.resolvedAt.file),
      },
  };
}
