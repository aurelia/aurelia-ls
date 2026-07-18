import ts from 'typescript';

import {
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import { symbolForExpression } from '../type-system/checker-node-helpers.js';
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

const templateCompilerInterfaceSource = frameworkDeclarationSourceSpec(
  new Set(['ITemplateCompiler']),
  ['@aurelia/template-compiler'],
  [
    '/aurelia/packages/template-compiler/src/interfaces-template-compiler.ts',
    '/aurelia/packages/template-compiler/dist/types/interfaces-template-compiler.d.ts',
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
  checker: ts.TypeChecker,
  expression: ts.Expression,
): boolean {
  const name = ts.isPropertyAccessExpression(expression)
    ? expression.name
    : ts.isIdentifier(expression)
      ? expression
      : null;
  if (name == null || name.text !== 'createInterface') {
    return false;
  }
  return (symbolForExpression(checker, name)?.declarations ?? []).some(isAureliaCreateInterfaceDeclaration);
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
  if (!ts.isVariableDeclaration(declaration)) {
    return false;
  }
  const initializer = declaration.initializer == null
    ? null
    : unwrapExpression(declaration.initializer);
  if (
    initializer != null
    && ts.isCallExpression(initializer)
    && isAureliaCreateInterfaceCallee(checker, unwrapExpression(initializer.expression))
  ) {
    return true;
  }

  // Published declarations erase createInterface initializers but retain the nominal kernel InterfaceSymbol type.
  const declaredType = typeSystem.readProgramTypeAtLocation(declaration.name);
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
  if (key === FrameworkIntrinsicDiKey.ITemplateCompiler) {
    return declarationMatchesFrameworkSource(declaration, new Map(), templateCompilerInterfaceSource);
  }
  return isAureliaKernelDiDeclaration(declaration);
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
