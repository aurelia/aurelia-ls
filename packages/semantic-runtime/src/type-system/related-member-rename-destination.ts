import ts from 'typescript';

import { checkerPropertySymbol, firstSymbolDeclaration } from './checker-node-helpers.js';

/** Check the proposed name against TypeScript receivers that a related-member rename changes. */
export function relatedMemberRenameDestinationConflict(
  checker: ts.TypeChecker,
  editableSources: readonly ts.SourceFile[],
  oldName: string,
  newName: string,
  symbols: readonly ts.Symbol[],
  references: readonly ts.Node[],
): ts.Node | null {
  const declarations = new Set(symbols.flatMap(symbol => symbol.declarations ?? []));
  const checkedTypes = new Set<ts.Type>();
  function occupied(type: ts.Type, site: ts.Node): ts.Node | null {
    const receiver = checker.getNonNullableType(type);
    if (checkedTypes.has(receiver)) return null;
    checkedTypes.add(receiver);
    if (receiver.isUnion()) {
      for (const part of receiver.types) {
        const conflict = occupied(part, site);
        if (conflict != null) return conflict;
      }
      return null;
    }
    const existing = checkerPropertySymbol(checker, receiver, newName);
    return existing == null ? null : firstSymbolDeclaration(existing) ?? site;
  }

  const classSides = new Set<boolean>();
  for (const declaration of declarations) {
    const parameter = ts.isParameter(declaration) && ts.isConstructorDeclaration(declaration.parent);
    if (parameter) {
      const existing = declaration.parent.parameters.find(sibling => ts.isIdentifier(sibling.name) && sibling.name.text === newName);
      if (existing != null) return existing;
    }
    const owner = parameter ? declaration.parent.parent : declaration.parent;
    if (ts.isClassLike(owner) || ts.isInterfaceDeclaration(owner)) {
      const isStatic = ts.canHaveModifiers(declaration)
        && ts.getModifiers(declaration)?.some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword) === true;
      // Both class field syntax and the constructor lifecycle reserve this spelling.
      if (ts.isClassLike(owner) && (newName === 'constructor' || (isStatic && newName === 'prototype'))) return owner;
      classSides.add(isStatic);
      const conflict = occupied(classOrInterfaceType(checker, owner, isStatic), declaration);
      if (conflict != null) return conflict;
    } else if (ts.isTypeLiteralNode(owner) || ts.isObjectLiteralExpression(owner)) {
      const conflict = occupied(checker.getTypeAtLocation(owner), declaration);
      if (conflict != null) return conflict;
    }
  }

  for (const node of references) {
    const parent = node.parent;
    let receiver: ts.Node;
    if ((ts.isPropertyAccessExpression(parent) && parent.name === node)
      || (ts.isElementAccessExpression(parent) && parent.argumentExpression === node)) {
      receiver = parent.expression;
    } else if (ts.isBindingElement(parent) && ts.isObjectBindingPattern(parent.parent)) {
      receiver = parent.parent;
    } else if (ts.isObjectLiteralElementLike(parent) && ts.isObjectLiteralExpression(parent.parent)) {
      receiver = parent.parent;
    } else {
      continue;
    }
    const conflict = occupied(checker.getTypeAtLocation(receiver), node);
    if (conflict != null) return conflict;
  }

  // A derived type need not redeclare or explicitly reference the inherited old member. Its
  // existing destination can still shadow the renamed member when used through the base type.
  if (classSides.size > 0) {
    for (const file of editableSources) {
      const conflict = ts.forEachChild(file, visitDerived);
      if (conflict != null) return conflict;
    }
  }
  return null;

  function visitDerived(node: ts.Node): ts.Node | undefined {
    if ((ts.isClassLike(node) || ts.isInterfaceDeclaration(node)) && node.heritageClauses?.length) {
      // There are separate receiver namespaces for static and instance members.
      for (const isStatic of classSides) {
        if (isStatic && ts.isInterfaceDeclaration(node)) continue;
        const type = classOrInterfaceType(checker, node, isStatic);
        if (checkedTypes.has(type)) continue;
        const inherited = checkerPropertySymbol(checker, type, oldName);
        if (inherited?.declarations?.some(declaration => declarations.has(declaration))) {
          const conflict = occupied(type, node);
          if (conflict != null) return conflict;
        }
      }
    }
    return ts.forEachChild(node, visitDerived);
  }
}

function classOrInterfaceType(
  checker: ts.TypeChecker,
  owner: ts.ClassLikeDeclaration | ts.InterfaceDeclaration,
  isStatic: boolean,
): ts.Type {
  const type = checker.getTypeAtLocation(owner);
  const symbol = type.getSymbol();
  if (symbol == null) return type;
  return isStatic ? checker.getTypeOfSymbolAtLocation(symbol, owner) : checker.getDeclaredTypeOfSymbol(symbol);
}
