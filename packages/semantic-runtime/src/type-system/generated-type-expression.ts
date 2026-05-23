import path from 'node:path';
import ts from 'typescript';
import type { CheckerTypeMember, CheckerTypeShape } from './type-shape.js';

export interface GeneratedTypeScriptSourceContext {
  readonly generatedFileName: string;
}

export function checkerMemberValueTypeExpression(
  member: CheckerTypeMember,
  context: GeneratedTypeScriptSourceContext,
): string | null {
  const owner = namedExportedOwnerDeclaration(member);
  if (owner == null) {
    return null;
  }
  const ownerName = owner.name?.text;
  if (ownerName == null) {
    return null;
  }
  const moduleSpecifier = moduleSpecifierForGeneratedTypeScriptSource(
    context.generatedFileName,
    owner.getSourceFile().fileName,
  );
  return `import(${quotedTypeScriptStringLiteral(moduleSpecifier)}).${ownerName}[${quotedTypeScriptStringLiteral(member.name)}]`;
}

export function checkerTypeShapeTypeExpression(
  typeShape: CheckerTypeShape,
  context: GeneratedTypeScriptSourceContext,
): string | null {
  const declaration = namedExportedTypeDeclaration(typeShape);
  const typeName = declaration?.name?.text;
  if (declaration == null || typeName == null) {
    return null;
  }
  const moduleSpecifier = moduleSpecifierForGeneratedTypeScriptSource(
    context.generatedFileName,
    declaration.getSourceFile().fileName,
  );
  return `import(${quotedTypeScriptStringLiteral(moduleSpecifier)}).${typeName}`;
}

export function moduleSpecifierForGeneratedTypeScriptSource(
  generatedFileName: string,
  targetFileName: string,
): string {
  const relative = path.relative(path.dirname(generatedFileName), targetFileName)
    .replace(/\\/g, '/')
    .replace(/\.[cm]?[tj]sx?$/, '');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

export function quotedTypeScriptStringLiteral(value: string): string {
  return JSON.stringify(value);
}

type NamedExportedOwnerDeclaration =
  | ts.ClassDeclaration
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration;

function namedExportedOwnerDeclaration(member: CheckerTypeMember): NamedExportedOwnerDeclaration | null {
  for (const declaration of member.carrier?.declarations ?? []) {
    const owner = declaration.parent;
    if (isNamedExportedTypeLikeDeclaration(owner)) {
      return owner;
    }
  }
  return null;
}

function namedExportedTypeDeclaration(typeShape: CheckerTypeShape): NamedExportedOwnerDeclaration | null {
  for (const declaration of typeShape.carrier?.declarations ?? []) {
    if (isNamedExportedTypeLikeDeclaration(declaration)) {
      return declaration;
    }
  }
  return null;
}

function isNamedExportedTypeLikeDeclaration(node: ts.Node | undefined): node is NamedExportedOwnerDeclaration {
  if (node == null || !hasExportModifier(node) || hasDefaultModifier(node)) {
    return false;
  }
  return (
    (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node))
    && node.name != null
    && ts.isIdentifier(node.name)
  );
}

function hasExportModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node)
    && (ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false);
}

function hasDefaultModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node)
    && (ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword) ?? false);
}
