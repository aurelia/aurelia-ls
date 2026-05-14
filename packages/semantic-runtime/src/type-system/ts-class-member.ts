import ts from 'typescript';

export type ClassMemberWithExpressionChildren =
  | ts.MethodDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration
  | ts.ConstructorDeclaration
  | ts.PropertyDeclaration
  | ts.ClassStaticBlockDeclaration;

export function isClassMemberWithExpressionChildren(
  node: ts.Node,
): node is ClassMemberWithExpressionChildren {
  return ts.isMethodDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node)
    || ts.isConstructorDeclaration(node)
    || ts.isPropertyDeclaration(node)
    || ts.isClassStaticBlockDeclaration(node);
}

export function classElementName(
  node: ts.ClassElement,
  sourceFile: ts.SourceFile,
): string | null {
  if (ts.isClassStaticBlockDeclaration(node)) {
    return 'static';
  }
  if (ts.isConstructorDeclaration(node)) {
    return 'constructor';
  }
  const name = 'name' in node ? node.name : undefined;
  if (name == null) {
    return null;
  }
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return name.getText(sourceFile);
}
