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
} from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import type {
  SemanticResourceDefinitionBindableRow,
  SemanticResourceDefinitionRow,
} from "@aurelia-ls/semantic-runtime";
import {
  semanticExactSourceReference,
  type SemanticSourceReference,
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import {
  semanticSourceRangeForDocument,
  semanticSourceReferenceFilePath,
} from "../mapping/source-locations.js";
import {
  logIfSemanticRuntimeRequestAborted,
} from "./request-guard.js";
import type { SemanticRuntimeLspRequestGuard } from "../runtime/semantic-runtime-session.js";

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
  guard: SemanticRuntimeLspRequestGuard,
): Promise<DocumentSymbol[] | null> {
  try {
    const uri = params.textDocument.uri;
    if (!uri.endsWith(".ts") && !uri.endsWith(".js")) return null;

    const doc = ctx.documents.get(uri);
    if (!doc) return null;

    const requested = normalizedFilePath(URI.parse(uri).fsPath);
    const definitions = await ctx.semanticRuntime.resourceDefinitions(guard);
    const symbols: DocumentSymbol[] = [];

    for (const definition of definitions.value.rows) {
      const symbol = documentSymbolForResource(ctx.workspaceRoot, requested, doc, definition);
      if (symbol) symbols.push(symbol);
    }

    return symbols.length > 0
      ? symbols.sort((left, right) => compareRanges(left.range, right.range))
      : null;
  } catch (e) {
    if (logIfSemanticRuntimeRequestAborted(ctx, "documentSymbol", e, params.textDocument.uri)) {
      return null;
    }
    const message = e instanceof Error ? e.stack ?? e.message : String(e);
    ctx.logger.error(`[documentSymbol] failed for ${params.textDocument.uri}: ${message}`);
    return null;
  }
}

function documentSymbolForResource(
  workspaceRoot: string | null,
  requested: string,
  doc: Pick<TextDocument, "getText" | "positionAt">,
  definition: SemanticResourceDefinitionRow,
): DocumentSymbol | null {
  if (definition.name == null || !DOCUMENT_SYMBOL_RESOURCE_KINDS.has(definition.resourceKind)) {
    return null;
  }
  const selectionSource = semanticExactSourceReference(definition.targetSource ?? definition.source);
  const declarationSource = semanticExactSourceReference(definition.targetDeclarationSource);
  if (!sourceMatches(workspaceRoot, requested, selectionSource)) {
    return null;
  }
  const selectionRange = semanticSourceRangeForDocument(selectionSource, doc);
  const declarationRange = sourceMatches(workspaceRoot, requested, declarationSource)
    ? semanticSourceRangeForDocument(declarationSource, doc)
    : null;
  const className = definition.targetName ?? definition.name;
  if (selectionRange == null) {
    return null;
  }

  return {
    name: className,
    detail: resourceDetail(definition),
    kind: RESOURCE_SYMBOL_KIND[definition.resourceKind] ?? SymbolKind.Class,
    range: declarationRange ?? selectionRange,
    selectionRange,
    children: bindableSymbols(workspaceRoot, requested, doc, definition.bindables),
  };
}

function bindableSymbols(
  workspaceRoot: string | null,
  requested: string,
  doc: Pick<TextDocument, "getText" | "positionAt">,
  bindables: readonly SemanticResourceDefinitionBindableRow[],
): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];
  for (const bindable of bindables) {
    const source = semanticExactSourceReference(
      bindable.propertySource ?? bindable.nameSource ?? bindable.source,
    );
    if (!sourceMatches(workspaceRoot, requested, source)) {
      continue;
    }
    const range = semanticSourceRangeForDocument(source, doc);
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
  const filePath = semanticSourceReferenceFilePath(source, workspaceRoot);
  return filePath != null && normalizedFilePath(filePath) === requested;
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

function normalizedFilePath(filePath: string): string {
  return path.normalize(filePath).toLowerCase();
}
