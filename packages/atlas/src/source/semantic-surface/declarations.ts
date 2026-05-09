import ts from "typescript";

import type { SourceRange } from "../../inquiry/locus.js";
import type { SourceProject } from "../project.js";
import {
  requiredSourceFileIdentity,
  requiredSourceRangeForNode,
} from "./source-ranges.js";
import { declarationNameNode, propertyNameNodeText } from "./ast.js";

export const TYPE_SCRIPT_USAGE_OWNER_KINDS = [
  "class",
  "interface",
  "function",
  "variable",
  "enum",
  "type",
  "source-file",
] as const;

export type TypeScriptUsageOwnerKind =
  typeof TYPE_SCRIPT_USAGE_OWNER_KINDS[number];

export const TYPE_SCRIPT_USAGE_OWNER_MEMBER_KINDS = [
  "constructor",
  "method",
  "property",
  "accessor",
] as const;

export type TypeScriptUsageOwnerMemberKind =
  typeof TYPE_SCRIPT_USAGE_OWNER_MEMBER_KINDS[number];

/** Source-backed declaration owner for one usage site. */
export interface TypeScriptUsageOwner {
  readonly ownerKind: TypeScriptUsageOwnerKind;
  readonly ownerName: string;
  readonly ownerSource?: SourceRange;
  readonly ownerMemberKind?: TypeScriptUsageOwnerMemberKind;
  readonly ownerMemberName?: string;
  readonly ownerMemberSource?: SourceRange;
}

export function sourceDeclarationForDeclarationFileMirror(
  sourceProject: SourceProject,
  declaration: ts.Declaration,
): ts.Declaration {
  const sourceFile = declaration.getSourceFile();
  const file = sourceProject.sourceFileIdentity(sourceFile);
  if (file === null || !file.repoPath.includes("/dist/types/")) {
    return declaration;
  }
  const sourcePath = file.repoPath
    .replace("/dist/types/", "/src/")
    .replace(/\.d\.ts$/u, ".ts");
  const mappedSourceFile = sourceProject.readSourceFile(sourcePath);
  const name = declarationName(declaration);
  if (mappedSourceFile === null || name === null) {
    return declaration;
  }
  const mapped =
    exportedTopLevelDeclarations(mappedSourceFile).find(
      (candidate) =>
        declarationName(candidate) === name &&
        declarationShapeKind(candidate) === declarationShapeKind(declaration),
    ) ??
    exportedTopLevelDeclarations(mappedSourceFile).find(
      (candidate) => declarationName(candidate) === name,
    );
  return mapped ?? declaration;
}

export function isPackageIndexSource(sourceFile: ts.SourceFile): boolean {
  return /[/\\]src[/\\]index\.ts$/u.test(sourceFile.fileName);
}

export function exportedTopLevelDeclarations(sourceFile: ts.SourceFile): readonly ts.Declaration[] {
  const declarations: ts.Declaration[] = [];
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      declarations.push(...statement.declarationList.declarations);
      continue;
    }
    if (
      (ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isFunctionDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      hasExportModifier(statement)
    ) {
      declarations.push(statement);
    }
  }
  return declarations;
}

export function hasExportModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node) &&
    ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true;
}

export function declarationName(declaration: ts.Declaration): string | null {
  const name = declarationNameNode(declaration);
  if (name === undefined) {
    return null;
  }
  return (
    propertyNameNodeText(name, declaration.getSourceFile()) ??
    name.getText(declaration.getSourceFile())
  );
}

export function declarationShapeKind(declaration: ts.Declaration): string {
  if (ts.isClassDeclaration(declaration)) {
    return "class";
  }
  if (ts.isInterfaceDeclaration(declaration)) {
    return "interface";
  }
  if (ts.isVariableDeclaration(declaration)) {
    return "variable";
  }
  if (ts.isFunctionDeclaration(declaration)) {
    return "function";
  }
  if (ts.isTypeAliasDeclaration(declaration)) {
    return "type";
  }
  if (ts.isEnumDeclaration(declaration)) {
    return "enum";
  }
  return ts.SyntaxKind[declaration.kind] ?? "unknown";
}

/** Return the class/function/module-level owner that contains a usage site. */
export function usageOwnerForNode(
  sourceProject: SourceProject,
  node: ts.Node,
): TypeScriptUsageOwner {
  const sourceFile = node.getSourceFile();
  let current: ts.Node | undefined = node;
  let memberDeclaration: ts.Declaration | undefined;

  while (current !== undefined && current !== sourceFile) {
    if (memberDeclaration === undefined && isClassMemberDeclaration(current)) {
      memberDeclaration = current;
    }
    if (isTopLevelOwnerDeclaration(current, sourceFile)) {
      return usageOwnerFromDeclaration(sourceProject, current, memberDeclaration);
    }
    current = current.parent;
  }

  const identity = requiredSourceFileIdentity(sourceProject, sourceFile);
  return {
    ownerKind: "source-file",
    ownerName: identity.repoPath,
  };
}

function usageOwnerFromDeclaration(
  sourceProject: SourceProject,
  declaration: ts.Declaration,
  memberDeclaration: ts.Declaration | undefined,
): TypeScriptUsageOwner {
  const ownerKind = usageOwnerKind(declaration);
  const ownerName = declarationName(declaration) ?? "<anonymous>";
  const ownerSource = requiredSourceRangeForNode(sourceProject, declaration);
  const member = memberDeclaration === undefined
    ? undefined
    : usageOwnerMember(memberDeclaration, sourceProject);
  return {
    ownerKind,
    ownerName,
    ownerSource,
    ...(member === undefined ? {} : member),
  };
}

function usageOwnerMember(
  declaration: ts.Declaration,
  sourceProject: SourceProject,
): Pick<
  TypeScriptUsageOwner,
  "ownerMemberKind" | "ownerMemberName" | "ownerMemberSource"
> {
  const ownerMemberKind = usageOwnerMemberKind(declaration);
  const ownerMemberName = ts.isConstructorDeclaration(declaration)
    ? "constructor"
    : declarationName(declaration) ?? "<anonymous>";
  return {
    ownerMemberKind,
    ownerMemberName,
    ownerMemberSource: requiredSourceRangeForNode(sourceProject, declaration),
  };
}

function usageOwnerKind(declaration: ts.Declaration): TypeScriptUsageOwnerKind {
  if (ts.isClassDeclaration(declaration)) {
    return "class";
  }
  if (ts.isInterfaceDeclaration(declaration)) {
    return "interface";
  }
  if (ts.isFunctionDeclaration(declaration)) {
    return "function";
  }
  if (ts.isVariableDeclaration(declaration)) {
    return "variable";
  }
  if (ts.isEnumDeclaration(declaration)) {
    return "enum";
  }
  return "type";
}

function usageOwnerMemberKind(
  declaration: ts.Declaration,
): TypeScriptUsageOwnerMemberKind {
  if (ts.isConstructorDeclaration(declaration)) {
    return "constructor";
  }
  if (ts.isMethodDeclaration(declaration)) {
    return "method";
  }
  if (ts.isGetAccessorDeclaration(declaration) || ts.isSetAccessorDeclaration(declaration)) {
    return "accessor";
  }
  return "property";
}

function isClassMemberDeclaration(node: ts.Node): node is ts.Declaration {
  return (
    (ts.isConstructorDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isPropertyDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)) &&
    (ts.isClassDeclaration(node.parent) || ts.isClassExpression(node.parent))
  );
}

function isTopLevelOwnerDeclaration(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): node is ts.Declaration {
  if (
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isTypeAliasDeclaration(node)
  ) {
    return isModuleTopLevel(node.parent, sourceFile);
  }
  if (ts.isVariableDeclaration(node)) {
    return (
      ts.isVariableDeclarationList(node.parent) &&
      ts.isVariableStatement(node.parent.parent) &&
      isModuleTopLevel(node.parent.parent.parent, sourceFile)
    );
  }
  return false;
}

function isModuleTopLevel(parent: ts.Node | undefined, sourceFile: ts.SourceFile): boolean {
  return parent === sourceFile || (parent !== undefined && ts.isModuleBlock(parent));
}
