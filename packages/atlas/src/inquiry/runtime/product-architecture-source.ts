import ts from "typescript";

import { propertyNameText } from "../../source/index.js";

/** Semantic-runtime source reference with editor-friendly one-based coordinates. */
export interface ProductArchitectureSourceReference {
  /** Repository-relative source file path when Atlas can identify it. */
  readonly filePath: string;
  /** One-based line at the start of the source span. */
  readonly startLine: number;
  /** One-based character at the start of the source span. */
  readonly startCharacter: number;
  /** One-based line at the end of the source span. */
  readonly endLine: number;
  /** One-based character at the end of the source span. */
  readonly endCharacter: number;
}

/** Minimal source-file carrier used by product-architecture provenance helpers. */
export interface ProductArchitectureSourceFileCarrier {
  readonly sourceFile: ts.SourceFile;
  readonly filePath: string;
}

/** Minimal span carrier used when provenance came from source-layer rows. */
export interface ProductArchitectureSpanCarrier {
  readonly startLine: number;
  readonly startCharacter: number;
  readonly endLine: number;
  readonly endCharacter: number;
}

export function sourceReferenceForFile(
  entry: ProductArchitectureSourceFileCarrier,
): ProductArchitectureSourceReference {
  const endPosition = entry.sourceFile.getLineAndCharacterOfPosition(
    entry.sourceFile.text.length,
  );
  return {
    filePath: entry.filePath,
    startLine: 1,
    startCharacter: 1,
    endLine: endPosition.line + 1,
    endCharacter: endPosition.character + 1,
  };
}

export function sourceReferenceFromSpan(
  filePath: string,
  span: ProductArchitectureSpanCarrier,
): ProductArchitectureSourceReference {
  return {
    filePath,
    startLine: span.startLine,
    startCharacter: span.startCharacter,
    endLine: span.endLine,
    endCharacter: span.endCharacter,
  };
}

export function sourceReferenceForEntryNode(
  entry: ProductArchitectureSourceFileCarrier,
  node: ts.Node,
): ProductArchitectureSourceReference {
  const start = node.getStart(entry.sourceFile);
  const end = node.getEnd();
  const startPosition = entry.sourceFile.getLineAndCharacterOfPosition(start);
  const endPosition = entry.sourceFile.getLineAndCharacterOfPosition(end);
  return {
    filePath: entry.filePath,
    startLine: startPosition.line + 1,
    startCharacter: startPosition.character + 1,
    endLine: endPosition.line + 1,
    endCharacter: endPosition.character + 1,
  };
}

export function lineCountForSource(
  source: ProductArchitectureSourceReference,
): number {
  return Math.max(1, source.endLine - source.startLine + 1);
}

export function nestedFunctionName(
  parentFunctionName: string | null,
  localName: string,
): string {
  return parentFunctionName === null ? localName : `${parentFunctionName}.${localName}`;
}

export interface ProductArchitectureFunctionContext {
  readonly className: string | null;
  readonly functionName: string | null;
}

export function functionNameForProductArchitectureContext(
  node: ts.Node,
  context: ProductArchitectureFunctionContext,
  sourceFile: ts.SourceFile,
): string | null {
  if (ts.isConstructorDeclaration(node)) {
    return `${context.className ?? "anonymous"}.constructor`;
  }
  if (ts.isMethodDeclaration(node) || ts.isGetAccessor(node) || ts.isSetAccessor(node)) {
    const name = propertyNameText(node.name, sourceFile);
    if (name === null) {
      return null;
    }
    return context.className === null ? name : `${context.className}.${name}`;
  }
  if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
    return nestedFunctionName(context.functionName, node.name.text);
  }
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    const parent = node.parent;
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      return nestedFunctionName(context.functionName, parent.name.text);
    }
    if (ts.isPropertyDeclaration(parent)) {
      const name = propertyNameText(parent.name, sourceFile);
      if (name === null) {
        return null;
      }
      return context.className === null ? name : `${context.className}.${name}`;
    }
  }
  return null;
}

export function productArchitectureContextForNode<TContext extends ProductArchitectureFunctionContext>(
  node: ts.Node,
  context: TContext,
  sourceFile: ts.SourceFile,
): TContext {
  if (ts.isClassDeclaration(node) && node.name !== undefined) {
    return {
      ...context,
      className: node.name.text,
    };
  }
  const functionName = functionNameForProductArchitectureContext(node, context, sourceFile);
  if (functionName === null) {
    return context;
  }
  return {
    ...context,
    functionName,
  };
}
