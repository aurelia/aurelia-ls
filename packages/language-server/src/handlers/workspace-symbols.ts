/**
 * Workspace symbols for source-backed Aurelia resources.
 *
 * This projects semantic-runtime ResourceDefinitions into VS Code's native
 * "Go to Symbol in Workspace" surface without adding a custom command.
 */
import {
  SymbolKind,
  type SymbolInformation,
  type WorkspaceSymbolParams,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import type {
  SemanticResourceDefinitionRow,
} from "@aurelia-ls/semantic-runtime";
import {
  semanticExactSourceReference,
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import {
  semanticSourceRangeForDocument,
  semanticSourceReferenceUri,
} from "../mapping/source-locations.js";
import type { SemanticRuntimeLspOperation } from "../runtime/semantic-runtime-session.js";

const WORKSPACE_SYMBOL_RESOURCE_KINDS = new Set<string>([
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

const MAX_WORKSPACE_SYMBOLS = 100;

export async function handleWorkspaceSymbols(
  ctx: ServerContext,
  params: WorkspaceSymbolParams,
  operation: SemanticRuntimeLspOperation,
): Promise<SymbolInformation[] | null> {
  const query = params.query.trim().toLowerCase();
  const definitions = await operation.resourceDefinitions();
  const symbols: SymbolInformation[] = [];

  for (const definition of definitions.value.rows) {
    const symbol = workspaceSymbolForResource(ctx, operation, query, definition);
    if (!symbol) continue;
    symbols.push(symbol);
    if (symbols.length >= MAX_WORKSPACE_SYMBOLS) break;
  }

  return symbols.length > 0
    ? symbols.sort((left, right) =>
        left.location.uri.localeCompare(right.location.uri)
        || compareRanges(left.location.range, right.location.range)
      )
    : null;
}

function workspaceSymbolForResource(
  ctx: ServerContext,
  operation: SemanticRuntimeLspOperation,
  query: string,
  definition: SemanticResourceDefinitionRow,
): SymbolInformation | null {
  if (definition.name == null || !WORKSPACE_SYMBOL_RESOURCE_KINDS.has(definition.resourceKind)) {
    return null;
  }
  if (!matchesQuery(definition, query)) {
    return null;
  }

  const source = semanticExactSourceReference(definition.targetSource ?? definition.source);
  if (source == null) return null;

  const uri = semanticSourceReferenceUri(source, ctx.documentUris);
  if (uri == null) return null;

  const canonicalUri = ctx.documentUris.resolve(uri).uri;
  const snapshot = operation.documents.lookupWorkspaceDocumentSnapshot(canonicalUri);
  if (snapshot == null) return null;

  const document = TextDocument.create(
    snapshot.uri,
    snapshot.languageId,
    snapshot.version ?? 0,
    snapshot.text,
  );
  const range = semanticSourceRangeForDocument(source, document);
  if (range == null) return null;

  return {
    name: definition.targetName ?? definition.name,
    kind: RESOURCE_SYMBOL_KIND[definition.resourceKind] ?? SymbolKind.Class,
    location: { uri: snapshot.uri, range },
    containerName: resourceContainer(definition),
  };
}

function matchesQuery(definition: SemanticResourceDefinitionRow, query: string): boolean {
  if (query.length === 0) return true;
  return [
    definition.targetName,
    definition.name,
    definition.key,
    definition.resourceKind,
    ...definition.aliases.map((alias) => alias.name),
  ].some((value) => value != null && value.toLowerCase().includes(query));
}

function resourceContainer(definition: SemanticResourceDefinitionRow): string {
  return definition.name == null
    ? definition.resourceKind
    : `${definition.resourceKind}: ${definition.name}`;
}

function compareRanges(
  left: { start: { line: number; character: number }; end: { line: number; character: number } },
  right: { start: { line: number; character: number }; end: { line: number; character: number } },
): number {
  return comparePositions(left.start, right.start) || comparePositions(left.end, right.end);
}

function comparePositions(
  left: { line: number; character: number },
  right: { line: number; character: number },
): number {
  return left.line - right.line || left.character - right.character;
}
