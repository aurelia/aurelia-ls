import * as ts from 'typescript';

import type {
  ApiDetection,
  ApiId,
  ApiDetectionKind,
} from './api-detection-contract.js';
import type { SymbolLocation } from './surface-types.js';
import {
  declarationSite,
  findValueDeclaration,
  resolveAliasedSymbol,
  symbolForExpression,
  unwrapExpression,
} from './ts-analysis-utils.js';

type KnownNamespace = 'DI' | 'Registration' | 'AppTask';

const REGISTRATION_MEMBER_API_IDS = {
  instance: 'registration.instance',
  singleton: 'registration.singleton',
  transient: 'registration.transient',
  callback: 'registration.callback',
  cachedCallback: 'registration.cachedCallback',
  aliasTo: 'registration.aliasTo',
} satisfies Record<string, ApiId>;

const APP_TASK_MEMBER_API_IDS = {
  creating: 'app-task.creating',
  hydrating: 'app-task.hydrating',
  hydrated: 'app-task.hydrated',
  activating: 'app-task.activating',
  activated: 'app-task.activated',
  deactivating: 'app-task.deactivating',
  deactivated: 'app-task.deactivated',
} satisfies Record<string, ApiId>;

const KERNEL_PRIMITIVE_SYMBOLS = {
  createInterface: {
    apiId: 'di.createInterface',
    sourceFile: 'packages/kernel/src/di.ts',
    fileSuffixes: [
      '/packages/kernel/src/di.ts',
      '/packages/kernel/dist/types/di.d.ts',
    ],
  },
  instanceRegistration: {
    apiId: 'registration.instance',
    sourceFile: 'packages/kernel/src/di.registration.ts',
    fileSuffixes: [
      '/packages/kernel/src/di.registration.ts',
      '/packages/kernel/dist/types/di.registration.d.ts',
    ],
  },
  singletonRegistration: {
    apiId: 'registration.singleton',
    sourceFile: 'packages/kernel/src/di.registration.ts',
    fileSuffixes: [
      '/packages/kernel/src/di.registration.ts',
      '/packages/kernel/dist/types/di.registration.d.ts',
    ],
  },
  transientRegistation: {
    apiId: 'registration.transient',
    sourceFile: 'packages/kernel/src/di.registration.ts',
    fileSuffixes: [
      '/packages/kernel/src/di.registration.ts',
      '/packages/kernel/dist/types/di.registration.d.ts',
    ],
  },
  callbackRegistration: {
    apiId: 'registration.callback',
    sourceFile: 'packages/kernel/src/di.registration.ts',
    fileSuffixes: [
      '/packages/kernel/src/di.registration.ts',
      '/packages/kernel/dist/types/di.registration.d.ts',
    ],
  },
  cachedCallbackRegistration: {
    apiId: 'registration.cachedCallback',
    sourceFile: 'packages/kernel/src/di.registration.ts',
    fileSuffixes: [
      '/packages/kernel/src/di.registration.ts',
      '/packages/kernel/dist/types/di.registration.d.ts',
    ],
  },
  aliasToRegistration: {
    apiId: 'registration.aliasTo',
    sourceFile: 'packages/kernel/src/di.registration.ts',
    fileSuffixes: [
      '/packages/kernel/src/di.registration.ts',
      '/packages/kernel/dist/types/di.registration.d.ts',
    ],
  },
  createImplementationRegister: {
    apiId: 'createImplementationRegister',
    sourceFile: 'packages/kernel/src/di.registration.ts',
    fileSuffixes: [
      '/packages/kernel/src/di.registration.ts',
      '/packages/kernel/dist/types/di.registration.d.ts',
    ],
  },
} as const satisfies Record<string, { readonly apiId: ApiId; readonly sourceFile: string; readonly fileSuffixes: readonly string[] }>;

interface NamespaceDetection {
  readonly namespace: KnownNamespace;
  readonly detectionKind: ApiDetectionKind;
  readonly aliasPath: readonly string[];
  readonly resolvedAt: SymbolLocation | null;
}

export function detectApiCall(
  checker: ts.TypeChecker,
  callExpression: ts.CallExpression,
): ApiDetection | null {
  return detectApiExpression(checker, callExpression.expression);
}

export function detectApiExpression(
  checker: ts.TypeChecker,
  expression: ts.Expression,
  visitedSymbols = new Set<ts.Symbol>(),
): ApiDetection | null {
  const unwrapped = unwrapExpression(expression);
  if (ts.isPropertyAccessExpression(unwrapped)) {
    return detectPropertyAccessApi(checker, unwrapped, visitedSymbols);
  }
  if (ts.isIdentifier(unwrapped)) {
    return detectIdentifierApi(checker, unwrapped, visitedSymbols);
  }
  return null;
}

function detectPropertyAccessApi(
  checker: ts.TypeChecker,
  expression: ts.PropertyAccessExpression,
  visitedSymbols: Set<ts.Symbol>,
): ApiDetection | null {
  const owner = unwrapExpression(expression.expression);
  if (!ts.isIdentifier(owner)) {
    return null;
  }

  const ownerDetection = detectKnownNamespace(checker, owner, visitedSymbols);
  if (!ownerDetection) {
    return null;
  }

  if (ownerDetection.namespace === 'DI' && expression.name.text === 'createInterface') {
    return {
      apiId: 'di.createInterface',
      detectionKind: ownerDetection.detectionKind,
      aliasPath: ownerDetection.aliasPath,
      resolvedAt: ownerDetection.resolvedAt,
    };
  }

  if (ownerDetection.namespace === 'Registration') {
    const apiId = REGISTRATION_MEMBER_API_IDS[expression.name.text as keyof typeof REGISTRATION_MEMBER_API_IDS];
    if (apiId) {
      return {
        apiId,
        detectionKind: ownerDetection.detectionKind,
        aliasPath: ownerDetection.aliasPath,
        resolvedAt: ownerDetection.resolvedAt,
      };
    }
  }

  if (ownerDetection.namespace === 'AppTask') {
    const apiId = APP_TASK_MEMBER_API_IDS[expression.name.text as keyof typeof APP_TASK_MEMBER_API_IDS];
    if (apiId) {
      return {
        apiId,
        detectionKind: ownerDetection.detectionKind,
        aliasPath: ownerDetection.aliasPath,
        resolvedAt: ownerDetection.resolvedAt,
      };
    }
  }

  return null;
}

function detectIdentifierApi(
  checker: ts.TypeChecker,
  identifier: ts.Identifier,
  visitedSymbols: Set<ts.Symbol>,
): ApiDetection | null {
  const symbol = checker.getSymbolAtLocation(identifier);
  if (!symbol) {
    return null;
  }

  return detectKnownApiFromSymbol(checker, symbol, identifier.text, visitedSymbols);
}

function detectKnownNamespace(
  checker: ts.TypeChecker,
  identifier: ts.Identifier,
  visitedSymbols: Set<ts.Symbol>,
): NamespaceDetection | null {
  const symbol = checker.getSymbolAtLocation(identifier);
  if (!symbol) {
    return null;
  }

  return detectKnownNamespaceFromSymbol(checker, symbol, identifier.text, visitedSymbols);
}

function detectKnownNamespaceFromSymbol(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  localName: string,
  visitedSymbols: Set<ts.Symbol>,
): NamespaceDetection | null {
  const target = resolveAliasedSymbol(checker, symbol);
  const directNamespace = identifyKnownNamespaceSymbol(target);
  if (directNamespace) {
    return {
      namespace: directNamespace.namespace,
      detectionKind: directNamespace.detectionKind,
      aliasPath: directNamespace.detectionKind === 'direct-member' ? [] : [localName],
      resolvedAt: directNamespace.resolvedAt,
    };
  }

  if (visitedSymbols.has(target)) {
    return null;
  }
  visitedSymbols.add(target);

  const declaration = findValueDeclaration(target);
  if (!declaration) {
    return null;
  }

  if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
    const initializer = unwrapExpression(declaration.initializer);
    if (ts.isIdentifier(initializer)) {
      const next = detectKnownNamespaceFromSymbol(
        checker,
        checker.getSymbolAtLocation(initializer) ?? target,
        localName,
        visitedSymbols,
      );
      if (!next) {
        return null;
      }
      return {
        ...next,
        detectionKind: 'simple-alias',
        aliasPath: [localName, ...next.aliasPath],
      };
    }
  }

  return null;
}

function detectKnownApiFromSymbol(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  localName: string,
  visitedSymbols: Set<ts.Symbol>,
): ApiDetection | null {
  const target = resolveAliasedSymbol(checker, symbol);
  const primitive = identifyKernelPrimitive(target);
  if (primitive) {
    return {
      apiId: primitive.apiId,
      detectionKind: primitive.detectionKind,
      aliasPath: primitive.detectionKind === 'kernel-primitive' ? [] : [localName],
      resolvedAt: primitive.resolvedAt,
    };
  }

  if (visitedSymbols.has(target)) {
    return null;
  }
  visitedSymbols.add(target);

  for (const declaration of target.declarations ?? []) {
    if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
      const nested = detectApiExpression(
        checker,
        declaration.initializer,
        visitedSymbols,
      );
      if (nested) {
        return {
          ...nested,
          detectionKind: 'simple-alias',
          aliasPath: [localName, ...nested.aliasPath],
        };
      }
      continue;
    }

    if (ts.isBindingElement(declaration)) {
      const nested = detectApiFromBindingElement(
        checker,
        declaration,
        localName,
        visitedSymbols,
      );
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function detectApiFromBindingElement(
  checker: ts.TypeChecker,
  bindingElement: ts.BindingElement,
  localName: string,
  visitedSymbols: Set<ts.Symbol>,
): ApiDetection | null {
  const localIdentifier = ts.isIdentifier(bindingElement.name)
    ? bindingElement.name.text
    : localName;
  const propertyName = bindingElement.propertyName && ts.isIdentifier(bindingElement.propertyName)
    ? bindingElement.propertyName.text
    : ts.isIdentifier(bindingElement.name)
      ? bindingElement.name.text
      : null;
  if (!propertyName) {
    return null;
  }

  const objectPattern = bindingElement.parent;
  const variableDeclaration = objectPattern.parent;
  if (!ts.isVariableDeclaration(variableDeclaration) || !variableDeclaration.initializer) {
    return null;
  }

  const initializer = unwrapExpression(variableDeclaration.initializer);
  if (!ts.isIdentifier(initializer)) {
    return null;
  }

  const namespace = detectKnownNamespace(checker, initializer, visitedSymbols);
  if (!namespace || namespace.namespace !== 'Registration') {
    return null;
  }

  const apiId = REGISTRATION_MEMBER_API_IDS[propertyName as keyof typeof REGISTRATION_MEMBER_API_IDS];
  if (!apiId) {
    return null;
  }

  return {
    apiId,
    detectionKind: 'destructured-alias',
    aliasPath: [localIdentifier, ...namespace.aliasPath],
    resolvedAt: namespace.resolvedAt,
  };
}

function identifyKnownNamespaceSymbol(
  symbol: ts.Symbol,
): NamespaceDetection | null {
  if (symbol.getName() === 'DI' && hasDeclarationInFile(symbol, '/packages/kernel/src/di.ts')) {
    return {
      namespace: 'DI',
      detectionKind: 'direct-member',
      aliasPath: [],
      resolvedAt: knownSourceSite(symbol, 'packages/kernel/src/di.ts'),
    };
  }

  if (symbol.getName() === 'DI' && hasDeclarationInAnyFile(symbol, [
    '/packages/kernel/dist/types/di.d.ts',
  ])) {
    return {
      namespace: 'DI',
      detectionKind: 'direct-member',
      aliasPath: [],
      resolvedAt: knownSourceSite(symbol, 'packages/kernel/src/di.ts'),
    };
  }

  if (symbol.getName() === 'Registration' && hasDeclarationInFile(symbol, '/packages/kernel/src/di.registration.ts')) {
    return {
      namespace: 'Registration',
      detectionKind: 'direct-member',
      aliasPath: [],
      resolvedAt: knownSourceSite(symbol, 'packages/kernel/src/di.registration.ts'),
    };
  }

  if (symbol.getName() === 'Registration' && hasDeclarationInAnyFile(symbol, [
    '/packages/kernel/dist/types/di.registration.d.ts',
  ])) {
    return {
      namespace: 'Registration',
      detectionKind: 'direct-member',
      aliasPath: [],
      resolvedAt: knownSourceSite(symbol, 'packages/kernel/src/di.registration.ts'),
    };
  }

  if (symbol.getName() === 'AppTask' && hasDeclarationInFile(symbol, '/packages/runtime-html/src/app-task.ts')) {
    return {
      namespace: 'AppTask',
      detectionKind: 'direct-member',
      aliasPath: [],
      resolvedAt: knownSourceSite(symbol, 'packages/runtime-html/src/app-task.ts'),
    };
  }

  if (symbol.getName() === 'AppTask' && hasDeclarationInAnyFile(symbol, [
    '/packages/runtime-html/dist/types/app-task.d.ts',
  ])) {
    return {
      namespace: 'AppTask',
      detectionKind: 'direct-member',
      aliasPath: [],
      resolvedAt: knownSourceSite(symbol, 'packages/runtime-html/src/app-task.ts'),
    };
  }

  return null;
}

function identifyKernelPrimitive(
  symbol: ts.Symbol,
): { readonly apiId: ApiId; readonly detectionKind: ApiDetectionKind; readonly resolvedAt: SymbolLocation | null } | null {
  const spec = KERNEL_PRIMITIVE_SYMBOLS[symbol.getName() as keyof typeof KERNEL_PRIMITIVE_SYMBOLS];
  if (!spec) {
    return null;
  }

  if (!hasDeclarationInAnyFile(symbol, spec.fileSuffixes)) {
    return null;
  }

  return {
    apiId: spec.apiId,
    detectionKind: 'kernel-primitive',
    resolvedAt: knownSourceSite(symbol, spec.sourceFile),
  };
}

function hasDeclarationInFile(
  symbol: ts.Symbol,
  fileSuffix: string,
): boolean {
  return hasDeclarationInAnyFile(symbol, [fileSuffix]);
}

function hasDeclarationInAnyFile(
  symbol: ts.Symbol,
  fileSuffixes: readonly string[],
): boolean {
  return (symbol.declarations ?? []).some((declaration) =>
    fileSuffixes.some((fileSuffix) =>
      declaration.getSourceFile().fileName.replace(/\\/g, '/').endsWith(fileSuffix)));
}

function firstDeclarationSite(
  symbol: ts.Symbol,
): SymbolLocation | null {
  const declaration = preferredDeclaration(symbol);
  if (!declaration) {
    return null;
  }

  const sourceFileName = declaration.getSourceFile().fileName.replace(/\\/g, '/');
  if (declaration.getSourceFile().isDeclarationFile && sourceFileName.includes('/dist/types/')) {
    return {
      name: declarationSite(declaration).name,
      file: sourceFileName
        .replace('/dist/types/', '/src/')
        .replace(/\.d\.ts$/, '.ts'),
      line: null,
    };
  }

  return declarationSite(declaration);
}

function knownSourceSite(
  symbol: ts.Symbol,
  repoRelativeSourceFile: string,
): SymbolLocation | null {
  const declarations = symbol.declarations ?? [];
  const preferred = declarations.find((declaration) =>
    !declaration.getSourceFile().isDeclarationFile
    && declaration.getSourceFile().fileName.replace(/\\/g, '/').endsWith(`/${repoRelativeSourceFile}`));
  if (preferred) {
    return declarationSite(preferred);
  }

  const fallback = firstDeclarationSite(symbol);
  if (!fallback) {
    return null;
  }

  return {
    ...fallback,
    file: repoRelativeSourceFile,
  };
}

function preferredDeclaration(
  symbol: ts.Symbol,
): ts.Declaration | null {
  const declarations = symbol.declarations ?? [];
  if (declarations.length === 0) {
    return null;
  }

  const sorted = declarations
    .slice()
    .sort((left, right) => Number(left.getSourceFile().isDeclarationFile) - Number(right.getSourceFile().isDeclarationFile));
  return sorted[0] ?? null;
}
