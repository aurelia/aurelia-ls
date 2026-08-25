import ts from 'typescript';

import {
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  declarationMatchesFrameworkSource,
  frameworkDeclarationSourceSpec,
  typeMatchesFrameworkDeclarationSource,
} from '../type-system/framework-declaration-source.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  FrameworkIntrinsicDiKey,
  frameworkIntrinsicDiKeyForName,
} from './framework-intrinsic-di-key.js';

const kernelIntrinsicDiKeySource = frameworkDeclarationSourceSpec(
  new Set(['IContainer']),
  ['@aurelia/kernel', 'aurelia'],
  [
    '/aurelia/packages/kernel/src/',
    '/aurelia/packages/kernel/dist/types/',
  ],
);

const runtimeHtmlIntrinsicDiKeySource = frameworkDeclarationSourceSpec(
  new Set([
    'IAurelia',
    'IAppRoot',
    'INode',
    'IController',
    'IRenderLocation',
    'IViewFactory',
    'IAuSlotsInfo',
    'IHydrationContext',
    'IRepeatableHandler',
  ]),
  ['@aurelia/runtime-html', 'aurelia'],
  [
    '/aurelia/packages/runtime-html/src/',
    '/aurelia/packages/runtime-html/dist/types/',
  ],
);

const templateCompilerIntrinsicDiKeySource = frameworkDeclarationSourceSpec(
  new Set(['IInstruction', 'ITemplateCompiler']),
  ['@aurelia/template-compiler'],
  [
    '/aurelia/packages/template-compiler/src/',
    '/aurelia/packages/template-compiler/dist/types/',
  ],
);

const routerIntrinsicDiKeySource = frameworkDeclarationSourceSpec(
  new Set(['IRouteContext', 'IContextRouter']),
  ['@aurelia/router'],
  [
    '/aurelia/packages/router/src/',
    '/aurelia/packages/router/dist/types/',
  ],
);

const interfaceSymbolSource = frameworkDeclarationSourceSpec(
  new Set(['InterfaceSymbol']),
  ['@aurelia/kernel'],
  [
    '/aurelia/packages/kernel/src/di.ts',
    '/aurelia/packages/kernel/dist/types/di.d.ts',
  ],
);

export function isAureliaCreateInterfaceCallee(
  typeSystem: TypeSystemProject,
  expression: ts.Expression,
): boolean {
  const programExpression = typeSystem.readProgramExpression(expression);
  const name = programExpression != null && ts.isPropertyAccessExpression(programExpression)
    ? programExpression.name
    : programExpression != null && ts.isIdentifier(programExpression)
      ? programExpression
      : null;
  if (name == null || name.text !== 'createInterface') {
    return false;
  }
  return (typeSystem.readProgramAliasedSymbolAtLocation(name)?.declarations ?? [])
    .some(isAureliaCreateInterfaceDeclaration);
}

/** Whether a runtime value declaration denotes an Aurelia InterfaceSymbol DI key. */
export function isAureliaInterfaceKeyDeclaration(
  typeSystem: TypeSystemProject,
  declaration: ts.Declaration,
): boolean {
  const checker = typeSystem.checker;
  if (aureliaFrameworkIntrinsicDiKeyForDeclaration(declaration) != null) {
    return true;
  }
  const programDeclaration = typeSystem.readProgramDeclaration(declaration);
  if (programDeclaration == null || !ts.isVariableDeclaration(programDeclaration)) {
    return false;
  }
  const initializer = programDeclaration.initializer == null
    ? null
    : unwrapExpression(programDeclaration.initializer);
  if (
    initializer != null
    && ts.isCallExpression(initializer)
    && isAureliaCreateInterfaceCallee(typeSystem, unwrapExpression(initializer.expression))
  ) {
    return true;
  }

  // Published declarations erase createInterface initializers but retain the nominal kernel InterfaceSymbol type.
  const declaredType = typeSystem.readProgramTypeAtLocation(programDeclaration.name);
  return declaredType != null && typeMatchesFrameworkDeclarationSource(
    declaredType,
    checker,
    new Map(),
    interfaceSymbolSource,
  );
}

function isAureliaCreateInterfaceDeclaration(
  declaration: ts.Declaration,
): boolean {
  return isAureliaKernelDiDeclaration(declaration);
}

/** Whether a declaration comes from Aurelia's DI implementation or its published kernel package. */
export function isAureliaKernelDiDeclaration(
  declaration: ts.Declaration,
): boolean {
  const sourcePath = declaration.getSourceFile().fileName.replace(/\\/g, '/');
  return sourcePath.includes('/aurelia/packages/kernel/src/di.ts')
    || sourcePath.includes('/aurelia/packages/kernel/dist/types/di.d.ts')
    || sourcePath.includes('/@aurelia/kernel/')
    || sourcePath.includes('/@aurelia+kernel/');
}

/** Prove that a named intrinsic key came from the framework package that owns that key. */
export function isAureliaFrameworkIntrinsicDiKeyDeclaration(
  key: FrameworkIntrinsicDiKey,
  declaration: ts.Declaration,
): boolean {
  switch (key) {
    case FrameworkIntrinsicDiKey.IContainer:
      return declarationMatchesFrameworkSource(declaration, new Map(), kernelIntrinsicDiKeySource);
    case FrameworkIntrinsicDiKey.IAurelia:
    case FrameworkIntrinsicDiKey.IAppRoot:
    case FrameworkIntrinsicDiKey.INode:
    case FrameworkIntrinsicDiKey.IController:
    case FrameworkIntrinsicDiKey.IRenderLocation:
    case FrameworkIntrinsicDiKey.IViewFactory:
    case FrameworkIntrinsicDiKey.IAuSlotsInfo:
    case FrameworkIntrinsicDiKey.IHydrationContext:
    case FrameworkIntrinsicDiKey.IRepeatableHandler:
      return declarationMatchesFrameworkSource(declaration, new Map(), runtimeHtmlIntrinsicDiKeySource);
    case FrameworkIntrinsicDiKey.IInstruction:
    case FrameworkIntrinsicDiKey.ITemplateCompiler:
      return declarationMatchesFrameworkSource(declaration, new Map(), templateCompilerIntrinsicDiKeySource);
    case FrameworkIntrinsicDiKey.IRouteContext:
    case FrameworkIntrinsicDiKey.IContextRouter:
      return declarationMatchesFrameworkSource(declaration, new Map(), routerIntrinsicDiKeySource);
  }
}

/** Recover a framework intrinsic key from its declaration even when published types omit the source initializer. */
export function aureliaFrameworkIntrinsicDiKeyForDeclaration(
  declaration: ts.Declaration,
  declaredName: string | null = null,
): FrameworkIntrinsicDiKey | null {
  const name = declaredName ?? ts.getNameOfDeclaration(declaration)?.getText() ?? null;
  const key = name == null ? null : frameworkIntrinsicDiKeyForName(name);
  return key != null && isAureliaFrameworkIntrinsicDiKeyDeclaration(key, declaration)
    ? key
    : null;
}
