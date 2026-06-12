import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import { symbolForExpression } from '../type-system/checker-node-helpers.js';
import type { TypeSystemProject } from '../type-system/project.js';

export interface DiInterfaceKeyDeclarationInfo {
  readonly name: string;
  readonly sourcePath: string;
  readonly hasDefaultRegistration: boolean;
}

export function readDiInterfaceKeyDeclarations(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly DiInterfaceKeyDeclarationInfo[] {
  const declarations: DiInterfaceKeyDeclarationInfo[] = [];
  for (const source of project.sourceFiles) {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    if (sourceFile == null) {
      continue;
    }
    readSourceFileDiInterfaceKeyDeclarations(source.path, sourceFile, typeSystem.checker, declarations);
  }
  return declarations;
}

function readSourceFileDiInterfaceKeyDeclarations(
  sourcePath: string,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  declarations: DiInterfaceKeyDeclarationInfo[],
): void {
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.initializer != null
    ) {
      const call = unwrapExpression(node.initializer);
      if (ts.isCallExpression(call) && isAureliaCreateInterfaceCallee(checker, unwrapExpression(call.expression))) {
        declarations.push({
          name: node.name.text,
          sourcePath,
          hasDefaultRegistration: createInterfaceConfigureExpression(call) != null,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function createInterfaceConfigureExpression(
  call: ts.CallExpression,
): ts.Expression | null {
  const first = call.arguments[0] ?? null;
  if (first != null && functionLikeExpression(first)) {
    return first;
  }
  const second = call.arguments[1] ?? null;
  return second != null && functionLikeExpression(second)
    ? second
    : null;
}

function functionLikeExpression(
  expression: ts.Expression,
): boolean {
  const current = unwrapExpression(expression);
  return ts.isFunctionExpression(current) || ts.isArrowFunction(current);
}

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

function isAureliaCreateInterfaceDeclaration(
  declaration: ts.Declaration,
): boolean {
  const sourcePath = declaration.getSourceFile().fileName.replace(/\\/g, '/');
  return sourcePath.includes('/aurelia/packages/kernel/src/di.ts')
    || sourcePath.includes('/aurelia/packages/kernel/dist/types/di.d.ts')
    || sourcePath.includes('/@aurelia/kernel/')
    || sourcePath.includes('/@aurelia+kernel/');
}
