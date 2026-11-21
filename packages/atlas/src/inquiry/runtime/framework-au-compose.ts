import ts from "typescript";

import type { SourceProject } from "../../source/index.js";

import { admittedFrameworkSourceFile } from "./framework-support.js";

export function auComposeCompositionDeclarations(
  sourceProject: SourceProject,
): readonly (ts.ClassDeclaration | ts.InterfaceDeclaration)[] {
  const sourceFile = admittedFrameworkSourceFile(
    sourceProject, "runtime-html", "aurelia/packages/runtime-html/src/resources/custom-elements/au-compose.ts",
  );
  if (sourceFile === null) {
    return [];
  }
  const names = new Set([
    "CompositionContext",
    "CompositionController",
    "ICompositionController",
  ]);
  return sourceFile.statements.filter(
    (statement): statement is ts.ClassDeclaration | ts.InterfaceDeclaration =>
      (ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement)) &&
      statement.name !== undefined &&
      names.has(statement.name.text),
  );
}
