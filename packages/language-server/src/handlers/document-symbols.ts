/**
 * Document symbols for source-backed Aurelia resource declarations.
 *
 * The outline is intentionally conservative: it only emits symbols when
 * semantic-runtime can point at authored TypeScript source.
 */
import path from "node:path";
import {
  SymbolKind,
  type DocumentSymbol,
  type DocumentSymbolParams,
  type Range,
} from "vscode-languageserver/node.js";
import { URI } from "vscode-uri";
import type {
  SemanticResourceDefinitionBindableRow,
  SemanticResourceDefinitionRow,
  SemanticSourceReference,
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";

const DOCUMENT_SYMBOL_RESOURCE_KINDS = new Set<string>([
  "custom-element",
  "template-controller",
  "custom-attribute",
  "value-converter",
  "binding-behavior",
]);

const RESOURCE_SYMBOL_KIND: Readonly<Record<string, SymbolKind>> = {
  "custom-element": SymbolKind.Class,
  "template-controller": SymbolKind.Class,
  "custom-attribute": SymbolKind.Class,
  "value-converter": SymbolKind.Function,
  "binding-behavior": SymbolKind.Function,
};

export async function handleDocumentSymbols(
  ctx: ServerContext,
  params: DocumentSymbolParams,
): Promise<DocumentSymbol[] | null> {
  try {
    const uri = params.textDocument.uri;
    if (!uri.endsWith(".ts") && !uri.endsWith(".js")) return null;

    const doc = ctx.documents.get(uri);
    if (!doc) return null;

    const requested = normalizedFilePath(URI.parse(uri).fsPath);
    const definitions = await ctx.semanticRuntime.resourceDefinitions();
    const symbols: DocumentSymbol[] = [];

    for (const definition of definitions.value.rows) {
      const symbol = documentSymbolForResource(ctx.workspaceRoot, requested, doc, definition);
      if (symbol) symbols.push(symbol);
    }

    return symbols.length > 0
      ? symbols.sort((left, right) => compareRanges(left.range, right.range))
      : null;
  } catch (e) {
    const message = e instanceof Error ? e.stack ?? e.message : String(e);
    ctx.logger.error(`[documentSymbol] failed for ${params.textDocument.uri}: ${message}`);
    return null;
  }
}

function documentSymbolForResource(
  workspaceRoot: string | null,
  requested: string,
  doc: { getText(): string; positionAt(offset: number): { line: number; character: number } },
  definition: SemanticResourceDefinitionRow,
): DocumentSymbol | null {
  if (definition.name == null || !DOCUMENT_SYMBOL_RESOURCE_KINDS.has(definition.resourceKind)) {
    return null;
  }
  const source = definition.targetSource ?? definition.source;
  if (!sourceMatches(workspaceRoot, requested, source)) {
    return null;
  }
  const classRange = rangeForSource(doc, exactSource(source));
  const className = definition.targetName ?? definition.name;
  const selectionRange = rangeForClassName(doc, className, classRange) ?? classRange;
  if (classRange == null || selectionRange == null) {
    return null;
  }

  return {
    name: className,
    detail: resourceDetail(definition),
    kind: RESOURCE_SYMBOL_KIND[definition.resourceKind] ?? SymbolKind.Class,
    range: classRange,
    selectionRange,
    children: bindableSymbols(workspaceRoot, requested, doc, definition.bindables),
  };
}

function bindableSymbols(
  workspaceRoot: string | null,
  requested: string,
  doc: { positionAt(offset: number): { line: number; character: number } },
  bindables: readonly SemanticResourceDefinitionBindableRow[],
): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];
  for (const bindable of bindables) {
    if (!sourceMatches(workspaceRoot, requested, bindable.source)) {
      continue;
    }
    const source = exactSource(bindable.source);
    const range = rangeForSource(doc, source);
    if (range == null) continue;
    symbols.push({
      name: bindable.name,
      detail: bindableDetail(bindable),
      kind: SymbolKind.Field,
      range,
      selectionRange: range,
      children: [],
    });
  }
  return symbols.sort((left, right) => compareRanges(left.range, right.range));
}

function resourceDetail(definition: SemanticResourceDefinitionRow): string {
  const parts: string[] = [definition.resourceKind];
  if (definition.name) parts.push(definition.name);
  return parts.join(": ");
}

function bindableDetail(bindable: SemanticResourceDefinitionBindableRow): string {
  const parts = [`@bindable ${bindable.attribute}`];
  if (bindable.mode && bindable.mode !== "default") parts.push(bindable.mode);
  if (bindable.valueType) parts.push(bindable.valueType);
  return parts.join(" | ");
}

function sourceMatches(
  workspaceRoot: string | null,
  requested: string,
  source: SemanticSourceReference | null,
): boolean {
  const filePath = filePathForSource(workspaceRoot, source);
  return filePath != null && normalizedFilePath(filePath) === requested;
}

function rangeForSource(
  doc: { positionAt(offset: number): { line: number; character: number } },
  source: SemanticSourceReference | null,
): Range | null {
  if (source?.start == null || source.end == null) return null;
  return {
    start: doc.positionAt(source.start),
    end: doc.positionAt(source.end),
  };
}

function rangeForClassName(
  doc: { getText(): string; positionAt(offset: number): { line: number; character: number } },
  className: string,
  container: Range | null,
): Range | null {
  const text = doc.getText();
  const match = new RegExp(`\\bclass\\s+${escapeRegExp(className)}\\b`).exec(text);
  if (!match) return null;
  const startOffset = match.index + match[0].lastIndexOf(className);
  const endOffset = startOffset + className.length;
  const range = {
    start: doc.positionAt(startOffset),
    end: doc.positionAt(endOffset),
  };
  if (container == null) return range;
  return rangeWithin(range, container) ? range : null;
}

function rangeWithin(range: Range, container: Range): boolean {
  return comparePositions(container.start, range.start) <= 0
    && comparePositions(range.end, container.end) <= 0;
}

function compareRanges(left: Range, right: Range): number {
  return comparePositions(left.start, right.start) || comparePositions(left.end, right.end);
}

function comparePositions(
  left: { line: number; character: number },
  right: { line: number; character: number },
): number {
  return left.line - right.line || left.character - right.character;
}

function filePathForSource(
  workspaceRoot: string | null,
  source: SemanticSourceReference | null,
): string | undefined {
  const sourcePath = sourceReferencePath(source);
  if (sourcePath == null) {
    return undefined;
  }
  if (sourcePath.startsWith("file://")) {
    return URI.parse(sourcePath).fsPath;
  }
  if (path.isAbsolute(sourcePath)) {
    return sourcePath;
  }
  return workspaceRoot == null ? sourcePath : path.resolve(workspaceRoot, sourcePath);
}

function sourceReferencePath(source: SemanticSourceReference | null): string | null {
  if (source == null) {
    return null;
  }
  return source.path ?? sourceReferencePath(source.anchor ?? null);
}

function exactSource(source: SemanticSourceReference | null): SemanticSourceReference | null {
  if (source == null) return null;
  if (source.start != null && source.end != null) return source;
  return exactSource(source.anchor ?? null);
}

function normalizedFilePath(filePath: string): string {
  return path.normalize(filePath).toLowerCase();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
