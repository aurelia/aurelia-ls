import path from "node:path";
import ts from "typescript";

import { propertyNameText, repoRelativePath } from "../../source/index.js";
import { HandleKind } from "../handle.js";
import { LocusKind, type Locus } from "../locus.js";

export const semanticRuntimeSourceRoot = "packages/semantic-runtime/src";

/** Product architecture and vocabulary read this cohort. A null result means the locus cannot select a product source. */
export function productSourceLocusPath(locus: Locus | undefined, repoRoot?: string): string | null {
  if (locus === undefined || locus.kind === LocusKind.Repo) {
    return semanticRuntimeSourceRoot;
  }
  switch (locus.kind) {
    case LocusKind.RepoArea:
      return locus.areaId === "semantic-runtime" ? semanticRuntimeSourceRoot : null;
    case LocusKind.Package:
      if ((locus.packageId !== undefined && locus.packageId !== "semantic-runtime")
        || (locus.packageName !== undefined && locus.packageName !== "@aurelia-ls/semantic-runtime")) {
        return null;
      }
      if (locus.relativePath === undefined) {
        return locus.packageId !== undefined || locus.packageName !== undefined ? semanticRuntimeSourceRoot : null;
      }
      return productSourcePath(locus.relativePath, repoRoot);
    case LocusKind.SourceFile:
      return productSourcePath(locus.filePath, repoRoot);
    case LocusKind.SourceRange:
      return productSourcePath(locus.range.filePath, repoRoot);
    case LocusKind.Symbol:
      if (locus.packageName !== undefined && locus.packageName !== "@aurelia-ls/semantic-runtime") {
        return null;
      }
      return locus.filePath === undefined ? null : productSourcePath(locus.filePath, repoRoot);
    case LocusKind.Handle:
      if (locus.handle.kind === HandleKind.Package) {
        return locus.handle.id === "semantic-runtime" ? semanticRuntimeSourceRoot : null;
      }
      return "filePath" in locus.handle && typeof locus.handle.filePath === "string"
        ? productSourcePath(locus.handle.filePath, repoRoot) : null;
    default:
      return null;
  }
}

function productSourcePath(value: string, repoRoot?: string): string | null {
  const normalized = repoRoot === undefined
    ? normalizeInquiryPath(value).replace(/\/+$/u, "")
    : repoRelativePath(repoRoot, path.resolve(repoRoot, value));
  if (normalized === "packages/semantic-runtime") return semanticRuntimeSourceRoot;
  return normalized === semanticRuntimeSourceRoot || normalized?.startsWith(`${semanticRuntimeSourceRoot}/`) ? normalized : null;
}

export function matchesProductPathPrefix(value: string, prefix: string | undefined): boolean {
  if (prefix === undefined) return true;
  const path = normalizeInquiryPath(value);
  const root = normalizeInquiryPath(prefix).replace(/\/+$/u, "");
  return path === root || path.startsWith(`${root}/`);
}

function normalizeInquiryPath(value: string): string {
  const normalized = value.replace(/\\/gu, "/").replace(/^\.\//u, "");
  const marker = `/${semanticRuntimeSourceRoot}`;
  const index = normalized.indexOf(marker);
  return index < 0 ? normalized : normalized.slice(index + 1);
}

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
