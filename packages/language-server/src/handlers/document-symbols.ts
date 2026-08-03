/**
 * Document symbols for source-backed Aurelia resource declarations.
 *
 * The outline is intentionally conservative: it only emits symbols when
 * semantic-runtime can point at authored TypeScript source.
 */
import {
  SymbolKind,
  type DocumentSymbol,
  type DocumentSymbolParams,
  type Range,
} from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type {
  SemanticResourceDefinitionBindableRow,
  SemanticResourceDefinitionRow,
} from "@aurelia-ls/semantic-runtime";
import {
  canonicalTypeSystemPath,
  semanticExactSourceReference,
  type SemanticSourceReference,
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import type { WorkspaceDocumentUris } from "../utils/document-uri.js";
import {
  semanticSourceRangeForDocument,
  semanticSourceReferenceFilePath,
} from "../mapping/source-locations.js";
import type { SemanticRuntimeLspRequestGuard } from "../runtime/semantic-runtime-session.js";
import { isScriptDocument } from "../utils/document-kind.js";

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
  const uri = params.textDocument.uri;
  const doc = ctx.openDocument(uri);
  if (doc == null || !isScriptDocument(doc)) return null;

  const requestedPath = ctx.documentUris.authoredHostPath(uri);
  if (requestedPath == null) return null;
  const requested = canonicalTypeSystemPath(requestedPath);
  const definitions = await ctx.semanticRuntime.resourceDefinitions(guard);
  const symbols: DocumentSymbol[] = [];

  for (const definition of definitions.value.rows) {
    const symbol = documentSymbolForResource(ctx.documentUris, requested, doc, definition);
    if (symbol) symbols.push(symbol);
  }

  return symbols.length > 0
    ? symbols.sort((left, right) => compareRanges(left.range, right.range))
    : null;
}

function documentSymbolForResource(
  documentUris: WorkspaceDocumentUris,
  requested: string,
  doc: Pick<TextDocument, "getText" | "positionAt">,
  definition: SemanticResourceDefinitionRow,
): DocumentSymbol | null {
  if (definition.name == null || !DOCUMENT_SYMBOL_RESOURCE_KINDS.has(definition.resourceKind)) {
    return null;
  }
  const selectionSource = semanticExactSourceReference(definition.targetSource ?? definition.source);
  const declarationSource = semanticExactSourceReference(definition.targetDeclarationSource);
  if (!sourceMatches(documentUris, requested, selectionSource)) {
    return null;
  }
  const selectionRange = semanticSourceRangeForDocument(selectionSource, doc);
  const declarationRange = sourceMatches(documentUris, requested, declarationSource)
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
    children: bindableSymbols(documentUris, requested, doc, definition.bindables),
  };
}

function bindableSymbols(
  documentUris: WorkspaceDocumentUris,
  requested: string,
  doc: Pick<TextDocument, "getText" | "positionAt">,
  bindables: readonly SemanticResourceDefinitionBindableRow[],
): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];
  for (const bindable of bindables) {
    const source = semanticExactSourceReference(
      bindable.propertySource ?? bindable.nameSource ?? bindable.source,
    );
    if (!sourceMatches(documentUris, requested, source)) {
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
  documentUris: WorkspaceDocumentUris,
  requested: string,
  source: SemanticSourceReference | null,
): boolean {
  const filePath = semanticSourceReferenceFilePath(source, documentUris);
  return filePath != null && canonicalTypeSystemPath(filePath) === requested;
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
