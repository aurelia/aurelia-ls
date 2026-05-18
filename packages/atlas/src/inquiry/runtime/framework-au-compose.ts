import ts from "typescript";

import type { SourceProject } from "../../source/index.js";

export function auComposeCompositionDeclarations(
  sourceProject: SourceProject,
): readonly (ts.ClassDeclaration | ts.InterfaceDeclaration)[] {
  const sourceFile = sourceProject
    .ownedSourceFiles()
    .find((file) =>
      file.fileName
        .replace(/\\/gu, "/")
        .endsWith("aurelia/packages/runtime-html/src/resources/custom-elements/au-compose.ts"),
    );
  if (sourceFile === undefined) {
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
