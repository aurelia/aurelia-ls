import ts from "typescript";

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
  const name = (member as { readonly name?: ts.Node }).name;
  return name === undefined ? null : name.getText(member.getSourceFile());
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

export function isParameterProperty(parameter: ts.ParameterDeclaration): boolean {
  const flags = ts.getCombinedModifierFlags(parameter);
  return (
    (flags & ts.ModifierFlags.Public) !== 0 ||
    (flags & ts.ModifierFlags.Private) !== 0 ||
    (flags & ts.ModifierFlags.Protected) !== 0 ||
    (flags & ts.ModifierFlags.Readonly) !== 0
  );
}
