import ts from "typescript";

import { uniqueSortedStrings } from "../../collections.js";
import {
  hasModifier,
  propertyNameText,
} from "./ast.js";

/** Normalized TypeScript member slot kind across class, interface, and type-literal declarations. */
export type TypeScriptMemberSlotKindId =
  | "constructor"
  | "method"
  | "property"
  | "accessor"
  | "index"
  | "call";

/** Normalized declaration form for a TypeScript member surface. */
export type TypeScriptMemberDeclarationKindId =
  | TypeScriptMemberSlotKindId
  | "parameter-property"
  | "unknown";

/** Publicness lane for class/interface member surfaces. */
export type TypeScriptMemberAccessKindId =
  | "public"
  | "protected"
  | "private"
  | "convention-private";

export const TypeScriptMemberSlotKind = {
  Constructor: "constructor",
  Method: "method",
  Property: "property",
  Accessor: "accessor",
  Index: "index",
  Call: "call",
} as const satisfies Readonly<Record<string, TypeScriptMemberSlotKindId>>;

export interface TypeScriptMemberSurface {
  readonly node: ts.ClassElement | ts.TypeElement | ts.ParameterDeclaration;
  readonly name: string;
  readonly slotKind: TypeScriptMemberSlotKindId;
  readonly declarationKind: TypeScriptMemberDeclarationKindId;
  readonly accessKind: TypeScriptMemberAccessKindId;
}

export interface TypeScriptClassDeclarationSurface {
  readonly name: string;
  readonly exported: boolean;
  readonly abstract: boolean;
  readonly extendsType: string | null;
  readonly implementsTypes: readonly string[];
  readonly methods: readonly string[];
  readonly staticMethods: readonly string[];
  readonly accessors: readonly string[];
  readonly properties: readonly string[];
  readonly constructorCount: number;
  readonly methodCount: number;
  readonly propertyCount: number;
}

export function classDeclarationSurface(
  declaration: ts.ClassDeclaration,
  sourceFile: ts.SourceFile = declaration.getSourceFile(),
): TypeScriptClassDeclarationSurface {
  const memberSurfaces = memberSurfacesForDeclaration(declaration);
  const methods = uniqueSortedStrings(
    declaration.members
      .filter(ts.isMethodDeclaration)
      .filter((member) => !hasModifier(member, ts.SyntaxKind.StaticKeyword))
      .flatMap((member) => propertyNameText(member.name, sourceFile) ?? []),
  );
  const staticMethods = uniqueSortedStrings(
    declaration.members
      .filter(ts.isMethodDeclaration)
      .filter((member) => hasModifier(member, ts.SyntaxKind.StaticKeyword))
      .flatMap((member) => propertyNameText(member.name, sourceFile) ?? []),
  );
  const accessors = uniqueSortedStrings(
    memberSurfaces
      .filter((member) => member.slotKind === TypeScriptMemberSlotKind.Accessor)
      .map((member) => member.name),
  );
  const properties = uniqueSortedStrings(
    memberSurfaces
      .filter((member) => member.slotKind === TypeScriptMemberSlotKind.Property)
      .map((member) => member.name),
  );
  const constructorCount = declaration.members.filter(
    ts.isConstructorDeclaration,
  ).length;
  const methodCount = methods.length + staticMethods.length;
  const propertyCount = properties.length + accessors.length;
  return {
    name: declaration.name?.text ?? "<anonymous>",
    exported: hasModifier(declaration, ts.SyntaxKind.ExportKeyword),
    abstract: hasModifier(declaration, ts.SyntaxKind.AbstractKeyword),
    extendsType: heritageTypeTexts(
      declaration,
      ts.SyntaxKind.ExtendsKeyword,
      sourceFile,
    )[0] ?? null,
    implementsTypes: heritageTypeTexts(
      declaration,
      ts.SyntaxKind.ImplementsKeyword,
      sourceFile,
    ),
    methods,
    staticMethods,
    accessors,
    properties,
    constructorCount,
    methodCount,
    propertyCount,
  };
}

export function memberSurfacesForDeclaration(
  declaration: ts.Declaration,
): readonly TypeScriptMemberSurface[] {
  return memberNodes(declaration)
    .map((node) => {
      const name = memberName(node);
      const slotKind = memberSlotKindForDeclaration(node);
      if (name === null || slotKind === null) {
        return null;
      }
      return {
        node,
        name,
        slotKind,
        declarationKind: memberDeclarationKind(node),
        accessKind: memberAccessKind(node, name),
      };
    })
    .filter((row): row is TypeScriptMemberSurface => row !== null);
}

export function memberNodes(
  declaration: ts.Declaration,
): readonly (ts.ClassElement | ts.TypeElement | ts.ParameterDeclaration)[] {
  if (ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration)) {
    return [
      ...declaration.members,
      ...declaration.members.flatMap((member) =>
        ts.isConstructorDeclaration(member)
          ? member.parameters.filter(isParameterProperty)
          : [],
      ),
    ];
  }
  if (ts.isInterfaceDeclaration(declaration)) {
    return [...declaration.members];
  }
  if (ts.isTypeAliasDeclaration(declaration) && ts.isTypeLiteralNode(declaration.type)) {
    return [...declaration.type.members];
  }
  return [];
}

export function memberName(member: ts.Node): string | null {
  if (ts.isParameter(member)) {
    return ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)
      ? member.name.text
      : null;
  }
  if (ts.isConstructorDeclaration(member) || ts.isConstructSignatureDeclaration(member)) {
    return "constructor";
  }
  if (ts.isCallSignatureDeclaration(member)) {
    return "<call>";
  }
  return propertyNameText(
    (member as { readonly name?: ts.PropertyName }).name,
    member.getSourceFile(),
  );
}

export function heritageTypeTexts(
  node: ts.ClassDeclaration | ts.ClassExpression | ts.InterfaceDeclaration,
  token: ts.SyntaxKind.ExtendsKeyword | ts.SyntaxKind.ImplementsKeyword,
  sourceFile: ts.SourceFile = node.getSourceFile(),
): readonly string[] {
  return uniqueSortedStrings(
    (node.heritageClauses ?? [])
      .filter((clause) => clause.token === token)
      .flatMap((clause) =>
        clause.types.map((type) => type.expression.getText(sourceFile)),
      ),
  );
}

export function memberSlotKindForDeclaration(
  declaration: ts.Node,
): TypeScriptMemberSlotKindId | null {
  if (ts.isConstructorDeclaration(declaration) || ts.isConstructSignatureDeclaration(declaration)) {
    return TypeScriptMemberSlotKind.Constructor;
  }
  if (ts.isMethodDeclaration(declaration) || ts.isMethodSignature(declaration)) {
    return TypeScriptMemberSlotKind.Method;
  }
  if (ts.isParameter(declaration) || ts.isPropertyDeclaration(declaration) || ts.isPropertySignature(declaration)) {
    return TypeScriptMemberSlotKind.Property;
  }
  if (ts.isGetAccessorDeclaration(declaration) || ts.isSetAccessorDeclaration(declaration)) {
    return TypeScriptMemberSlotKind.Accessor;
  }
  if (ts.isIndexSignatureDeclaration(declaration)) {
    return TypeScriptMemberSlotKind.Index;
  }
  if (ts.isCallSignatureDeclaration(declaration)) {
    return TypeScriptMemberSlotKind.Call;
  }
  return null;
}

export function memberDeclarationKind(
  member: ts.Node,
): TypeScriptMemberDeclarationKindId {
  if (ts.isParameter(member)) {
    return "parameter-property";
  }
  return memberSlotKindForDeclaration(member) ?? "unknown";
}

export function memberAccessKind(
  member: ts.Node,
  name: string,
): TypeScriptMemberAccessKindId {
  const flags = ts.getCombinedModifierFlags(member as ts.Declaration);
  if ((flags & ts.ModifierFlags.Private) !== 0) {
    return "private";
  }
  if ((flags & ts.ModifierFlags.Protected) !== 0) {
    return "protected";
  }
  if (name.startsWith("_")) {
    return "convention-private";
  }
  return "public";
}

export function isParameterProperty(parameter: ts.ParameterDeclaration): boolean {
  const flags = ts.getCombinedModifierFlags(parameter);
  return (
    (flags & ts.ModifierFlags.Public) !== 0 ||
    (flags & ts.ModifierFlags.Private) !== 0 ||
    (flags & ts.ModifierFlags.Protected) !== 0 ||
    (flags & ts.ModifierFlags.Readonly) !== 0
  );
}
