import path from 'node:path';
import ts from 'typescript';
import type { KernelStore } from '../kernel/store.js';
import { TypeSystemProductDetails } from './product-details.js';
import type { CheckerTypeMember, CheckerTypeShape } from './type-shape.js';
import {
  CheckerTypeShapeKind,
  type CheckerTypeReference,
} from './type-shape.js';

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

/** Produces a generated TypeScript type expression for a checker reference when it has a stable source-level spelling. */
export function checkerTypeReferenceTypeExpression(
  store: KernelStore,
  reference: CheckerTypeReference,
  context: GeneratedTypeScriptSourceContext,
): string | null {
  const shape = reference.productHandle == null
    ? null
    : store.productDetails.read(TypeSystemProductDetails.TypeShape, reference.productHandle);
  const typeShapeExpression = shape == null
    ? null
    : checkerTypeShapeTypeExpression(shape, context);
  if (typeShapeExpression != null) {
    return typeShapeExpression;
  }
  const globalTypeExpression = shape == null
    ? null
    : checkerGlobalTypeShapeExpression(shape);
  if (globalTypeExpression != null) {
    return globalTypeExpression;
  }
  const structuralTypeExpression = shape == null
    ? null
    : checkerStructuralTypeExpression(shape, context);
  if (structuralTypeExpression != null) {
    return structuralTypeExpression;
  }
  return primitiveCheckerTypeExpression(reference);
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

function primitiveCheckerTypeExpression(reference: CheckerTypeReference): string | null {
  if (
    reference.shapeKind !== CheckerTypeShapeKind.Any
    && reference.shapeKind !== CheckerTypeShapeKind.Unknown
    && reference.shapeKind !== CheckerTypeShapeKind.Never
    && reference.shapeKind !== CheckerTypeShapeKind.Primitive
  ) {
    return null;
  }
  const display = reference.display;
  return primitiveDisplayIsSafeTypeExpression(display) ? display : null;
}

function primitiveDisplayIsSafeTypeExpression(display: string | null): boolean {
  return display === 'any'
    || display === 'unknown'
    || display === 'never'
    || display === 'string'
    || display === 'number'
    || display === 'boolean'
    || display === 'bigint'
    || display === 'symbol'
    || display === 'null'
    || display === 'undefined'
    || display === 'void'
    || display === 'true'
    || display === 'false';
}

/** Emits checker-backed structural type nodes with importable source references rewritten for overlay files. */
function checkerStructuralTypeExpression(
  typeShape: CheckerTypeShape,
  context: GeneratedTypeScriptSourceContext,
): string | null {
  const carrier = typeShape.carrier;
  if (carrier == null) {
    return null;
  }
  for (const declaration of carrier.declarations) {
    if (ts.isTypeNode(declaration)) {
      const expression = checkerTypeNodeExpression(
        carrier.checker,
        declaration,
        context,
      );
      if (expression != null) {
        return expression;
      }
    }
  }
  return null;
}

function checkerTypeNodeExpression(
  checker: ts.TypeChecker,
  node: ts.TypeNode,
  context: GeneratedTypeScriptSourceContext,
): string | null {
  if (ts.isFunctionTypeNode(node)) {
    return checkerFunctionTypeNodeExpression(checker, node, context);
  }
  if (ts.isTypeReferenceNode(node)) {
    return checkerTypeReferenceNodeExpression(checker, node, context);
  }
  if (ts.isArrayTypeNode(node)) {
    const element = checkerTypeNodeExpression(checker, node.elementType, context);
    return element == null ? null : `${parenthesizeTypeExpressionForArray(element)}[]`;
  }
  if (ts.isTupleTypeNode(node)) {
    const elements = node.elements.map((element) => checkerTupleElementExpression(checker, element, context));
    return elements.some((element) => element == null) ? null : `[${elements.join(', ')}]`;
  }
  if (ts.isUnionTypeNode(node)) {
    return checkerJoinedTypeNodeExpression(checker, node.types, context, ' | ');
  }
  if (ts.isIntersectionTypeNode(node)) {
    return checkerJoinedTypeNodeExpression(checker, node.types, context, ' & ');
  }
  if (ts.isParenthesizedTypeNode(node)) {
    const expression = checkerTypeNodeExpression(checker, node.type, context);
    return expression == null ? null : `(${expression})`;
  }
  if (ts.isLiteralTypeNode(node)) {
    return literalTypeNodeExpression(node);
  }
  if (ts.isTypeLiteralNode(node)) {
    return checkerTypeLiteralNodeExpression(checker, node, context);
  }
  if (ts.isIndexedAccessTypeNode(node)) {
    const object = checkerTypeNodeExpression(checker, node.objectType, context);
    const index = checkerTypeNodeExpression(checker, node.indexType, context);
    return object == null || index == null ? null : `${object}[${index}]`;
  }
  if (ts.isTypeOperatorNode(node)) {
    const expression = checkerTypeNodeExpression(checker, node.type, context);
    if (expression == null) {
      return null;
    }
    switch (node.operator) {
      case ts.SyntaxKind.KeyOfKeyword:
        return `keyof ${expression}`;
      case ts.SyntaxKind.ReadonlyKeyword:
        return `readonly ${expression}`;
      case ts.SyntaxKind.UniqueKeyword:
        return `unique ${expression}`;
      default:
        return null;
    }
  }
  return keywordTypeNodeExpression(node);
}

function checkerFunctionTypeNodeExpression(
  checker: ts.TypeChecker,
  node: ts.FunctionTypeNode,
  context: GeneratedTypeScriptSourceContext,
): string | null {
  const parameters = node.parameters.map((parameter, index) =>
    checkerParameterTypeNodeExpression(checker, parameter, index, context)
  );
  const returnType = checkerTypeNodeExpression(checker, node.type, context);
  return parameters.some((parameter) => parameter == null) || returnType == null
    ? null
    : `(${parameters.join(', ')}) => ${returnType}`;
}

function checkerParameterTypeNodeExpression(
  checker: ts.TypeChecker,
  parameter: ts.ParameterDeclaration,
  index: number,
  context: GeneratedTypeScriptSourceContext,
): string | null {
  const name = ts.isIdentifier(parameter.name) && isSafeTypeParameterName(parameter.name.text)
    ? parameter.name.text
    : `arg${index}`;
  const type = parameter.type == null
    ? 'unknown'
    : checkerTypeNodeExpression(checker, parameter.type, context);
  if (type == null) {
    return null;
  }
  const rest = parameter.dotDotDotToken == null ? '' : '...';
  const optional = parameter.questionToken == null ? '' : '?';
  return `${rest}${name}${optional}: ${type}`;
}

function checkerTypeReferenceNodeExpression(
  checker: ts.TypeChecker,
  node: ts.TypeReferenceNode,
  context: GeneratedTypeScriptSourceContext,
): string | null {
  const target = typeReferenceTargetExpression(checker, node.typeName, context);
  if (target == null) {
    return null;
  }
  const typeArguments = node.typeArguments?.map((argument) =>
    checkerTypeNodeExpression(checker, argument, context)
  ) ?? [];
  if (typeArguments.some((argument) => argument == null)) {
    return null;
  }
  return typeArguments.length === 0
    ? target
    : `${target}<${typeArguments.join(', ')}>`;
}

function typeReferenceTargetExpression(
  checker: ts.TypeChecker,
  name: ts.EntityName,
  context: GeneratedTypeScriptSourceContext,
): string | null {
  const rawName = name.getText();
  const symbol = checker.getSymbolAtLocation(rightmostEntityName(name)) ?? null;
  const resolved = symbol == null
    ? null
    : (symbol.flags & ts.SymbolFlags.Alias) !== 0
      ? checker.getAliasedSymbol(symbol)
      : symbol;
  const declaration = resolved == null
    ? null
    : namedExportedTypeDeclarationFromDeclarations(resolved.declarations ?? []);
  if (declaration != null) {
    return typeExpressionForExportedDeclaration(declaration, context.generatedFileName);
  }
  return isKnownGlobalTypeReference(rawName, resolved) ? rawName : null;
}

function checkerTupleElementExpression(
  checker: ts.TypeChecker,
  node: ts.TypeNode | ts.NamedTupleMember | ts.OptionalTypeNode | ts.RestTypeNode,
  context: GeneratedTypeScriptSourceContext,
): string | null {
  if (ts.isNamedTupleMember(node)) {
    const type = checkerTypeNodeExpression(checker, node.type, context);
    if (type == null) {
      return null;
    }
    const rest = node.dotDotDotToken == null ? '' : '...';
    const optional = node.questionToken == null ? '' : '?';
    return `${rest}${node.name.text}${optional}: ${type}`;
  }
  if (ts.isOptionalTypeNode(node)) {
    const type = checkerTypeNodeExpression(checker, node.type, context);
    return type == null ? null : `${type}?`;
  }
  if (ts.isRestTypeNode(node)) {
    const type = checkerTypeNodeExpression(checker, node.type, context);
    return type == null ? null : `...${type}`;
  }
  return checkerTypeNodeExpression(checker, node, context);
}

function checkerJoinedTypeNodeExpression(
  checker: ts.TypeChecker,
  nodes: ts.NodeArray<ts.TypeNode>,
  context: GeneratedTypeScriptSourceContext,
  separator: string,
): string | null {
  const expressions = nodes.map((node) => checkerTypeNodeExpression(checker, node, context));
  return expressions.some((expression) => expression == null) ? null : expressions.join(separator);
}

function checkerTypeLiteralNodeExpression(
  checker: ts.TypeChecker,
  node: ts.TypeLiteralNode,
  context: GeneratedTypeScriptSourceContext,
): string | null {
  const members = node.members.map((member) => checkerTypeElementExpression(checker, member, context));
  return members.some((member) => member == null) ? null : `{ ${members.join(' ')} }`;
}

function checkerTypeElementExpression(
  checker: ts.TypeChecker,
  member: ts.TypeElement,
  context: GeneratedTypeScriptSourceContext,
): string | null {
  if (ts.isPropertySignature(member)) {
    const name = propertyNameExpression(member.name);
    const type = member.type == null ? 'unknown' : checkerTypeNodeExpression(checker, member.type, context);
    return name == null || type == null
      ? null
      : `${member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) ? 'readonly ' : ''}${name}${member.questionToken == null ? '' : '?'}: ${type};`;
  }
  if (ts.isMethodSignature(member)) {
    const name = propertyNameExpression(member.name);
    const parameters = member.parameters.map((parameter, index) =>
      checkerParameterTypeNodeExpression(checker, parameter, index, context)
    );
    const returnType = member.type == null ? 'unknown' : checkerTypeNodeExpression(checker, member.type, context);
    return name == null || parameters.some((parameter) => parameter == null) || returnType == null
      ? null
      : `${name}${member.questionToken == null ? '' : '?'}(${parameters.join(', ')}): ${returnType};`;
  }
  if (ts.isCallSignatureDeclaration(member)) {
    const parameters = member.parameters.map((parameter, index) =>
      checkerParameterTypeNodeExpression(checker, parameter, index, context)
    );
    const returnType = member.type == null ? 'unknown' : checkerTypeNodeExpression(checker, member.type, context);
    return parameters.some((parameter) => parameter == null) || returnType == null
      ? null
      : `(${parameters.join(', ')}): ${returnType};`;
  }
  if (ts.isIndexSignatureDeclaration(member)) {
    const parameters = member.parameters.map((parameter, index) =>
      checkerParameterTypeNodeExpression(checker, parameter, index, context)
    );
    const returnType = member.type == null ? 'unknown' : checkerTypeNodeExpression(checker, member.type, context);
    return parameters.some((parameter) => parameter == null) || returnType == null
      ? null
      : `[${parameters.join(', ')}]: ${returnType};`;
  }
  return null;
}

function typeExpressionForExportedDeclaration(
  declaration: NamedExportedOwnerDeclaration,
  generatedFileName: string,
): string {
  const typeName = declaration.name?.text ?? 'unknown';
  const moduleSpecifier = moduleSpecifierForGeneratedTypeScriptSource(
    generatedFileName,
    declaration.getSourceFile().fileName,
  );
  return `import(${quotedTypeScriptStringLiteral(moduleSpecifier)}).${typeName}`;
}

function rightmostEntityName(name: ts.EntityName): ts.Identifier {
  return ts.isIdentifier(name) ? name : rightmostEntityName(name.right);
}

function propertyNameExpression(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) {
    return name.text;
  }
  if (ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return quotedTypeScriptStringLiteral(name.text);
  }
  return null;
}

function literalTypeNodeExpression(node: ts.LiteralTypeNode): string | null {
  const literal = node.literal;
  if (ts.isStringLiteral(literal)) {
    return quotedTypeScriptStringLiteral(literal.text);
  }
  if (ts.isNumericLiteral(literal) || literal.kind === ts.SyntaxKind.TrueKeyword || literal.kind === ts.SyntaxKind.FalseKeyword) {
    return literal.getText();
  }
  if (literal.kind === ts.SyntaxKind.NullKeyword) {
    return 'null';
  }
  return null;
}

function keywordTypeNodeExpression(node: ts.TypeNode): string | null {
  switch (node.kind) {
    case ts.SyntaxKind.AnyKeyword:
      return 'any';
    case ts.SyntaxKind.UnknownKeyword:
      return 'unknown';
    case ts.SyntaxKind.NeverKeyword:
      return 'never';
    case ts.SyntaxKind.StringKeyword:
      return 'string';
    case ts.SyntaxKind.NumberKeyword:
      return 'number';
    case ts.SyntaxKind.BooleanKeyword:
      return 'boolean';
    case ts.SyntaxKind.BigIntKeyword:
      return 'bigint';
    case ts.SyntaxKind.SymbolKeyword:
      return 'symbol';
    case ts.SyntaxKind.VoidKeyword:
      return 'void';
    case ts.SyntaxKind.UndefinedKeyword:
      return 'undefined';
    case ts.SyntaxKind.NullKeyword:
      return 'null';
    case ts.SyntaxKind.ObjectKeyword:
      return 'object';
    default:
      return null;
  }
}

function parenthesizeTypeExpressionForArray(expression: string): string {
  return expression.includes('|') || expression.includes('&') || expression.includes('=>')
    ? `(${expression})`
    : expression;
}

function isSafeTypeParameterName(name: string): boolean {
  return /^[$A-Z_a-z][$\w]*$/u.test(name);
}

function namedExportedTypeDeclarationFromDeclarations(
  declarations: readonly ts.Declaration[],
): NamedExportedOwnerDeclaration | null {
  for (const declaration of declarations) {
    if (isNamedExportedTypeLikeDeclaration(declaration)) {
      return declaration;
    }
  }
  return null;
}

function isKnownGlobalTypeReference(name: string, symbol: ts.Symbol | null): boolean {
  if (knownGlobalTypeReferenceNames.has(name)) {
    return true;
  }
  const declarations = symbol?.declarations ?? [];
  return declarations.length > 0 && declarations.every((declaration) => {
    const sourceFile = declaration.getSourceFile();
    return sourceFile.isDeclarationFile && !ts.isExternalModule(sourceFile);
  });
}

const knownGlobalTypeReferenceNames = new Set([
  'Array',
  'ReadonlyArray',
  'Record',
  'Partial',
  'Required',
  'Readonly',
  'Pick',
  'Omit',
  'Exclude',
  'Extract',
  'NonNullable',
  'Parameters',
  'ConstructorParameters',
  'ReturnType',
  'InstanceType',
  'Awaited',
  'Promise',
  'Iterable',
  'Iterator',
  'Map',
  'ReadonlyMap',
  'Set',
  'ReadonlySet',
  'WeakMap',
  'WeakSet',
]);

type NamedExportedOwnerDeclaration =
  | ts.ClassDeclaration
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration;

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

/** Produces a stable unqualified type expression for checker globals such as DOM lib interfaces. */
function checkerGlobalTypeShapeExpression(typeShape: CheckerTypeShape): string | null {
  for (const declaration of typeShape.carrier?.declarations ?? []) {
    if (isNamedGlobalTypeLikeDeclaration(declaration)) {
      const name = declaration.name;
      return name == null ? null : name.text;
    }
  }
  return null;
}

function isNamedExportedTypeLikeDeclaration(node: ts.Node | undefined): node is NamedExportedOwnerDeclaration {
  if (node == null || !hasExportModifier(node) || hasDefaultModifier(node)) {
    return false;
  }
  return (
    (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node))
    && node.name != null
    && ts.isIdentifier(node.name)
  );
}

function isNamedGlobalTypeLikeDeclaration(node: ts.Node | undefined): node is NamedExportedOwnerDeclaration {
  if (
    node == null
    || !(
      ts.isClassDeclaration(node)
      || ts.isInterfaceDeclaration(node)
      || ts.isTypeAliasDeclaration(node)
      || ts.isEnumDeclaration(node)
    )
    || node.name == null
    || !ts.isIdentifier(node.name)
  ) {
    return false;
  }
  const sourceFile = node.getSourceFile();
  return sourceFile.isDeclarationFile && !ts.isExternalModule(sourceFile);
}

function hasExportModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node)
    && (ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false);
}

function hasDefaultModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node)
    && (ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword) ?? false);
}
