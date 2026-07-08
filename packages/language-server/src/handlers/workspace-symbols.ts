/**
 * Workspace symbols for source-backed Aurelia resources.
 *
 * This projects semantic-runtime ResourceDefinitions into VS Code's native
 * "Go to Symbol in Workspace" surface without adding a custom command.
 */
import path from "node:path";
import {
  SymbolKind,
  type SymbolInformation,
  type WorkspaceSymbolParams,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import type {
  SemanticResourceDefinitionRow,
  SemanticSourceReference,
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import { canonicalDocumentUri, toFileUri } from "../utils/document-uri.js";
import {
  logIfSemanticRuntimeRequestAborted,
} from "./request-guard.js";
import type { SemanticRuntimeLspRequestGuard } from "../runtime/semantic-runtime-session.js";

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
  guard: SemanticRuntimeLspRequestGuard,
): Promise<SymbolInformation[] | null> {
  try {
    const query = params.query.trim().toLowerCase();
    const definitions = await ctx.semanticRuntime.resourceDefinitions(guard);
    const symbols: SymbolInformation[] = [];

    for (const definition of definitions.value.rows) {
      const symbol = workspaceSymbolForResource(ctx, query, definition);
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
  } catch (e) {
    if (logIfSemanticRuntimeRequestAborted(ctx, "workspaceSymbol", e)) {
      return null;
    }
    const message = e instanceof Error ? e.stack ?? e.message : String(e);
    ctx.logger.error(`[workspaceSymbol] failed: ${message}`);
    return null;
  }
}

function workspaceSymbolForResource(
  ctx: ServerContext,
  query: string,
  definition: SemanticResourceDefinitionRow,
): SymbolInformation | null {
  if (definition.name == null || !WORKSPACE_SYMBOL_RESOURCE_KINDS.has(definition.resourceKind)) {
    return null;
  }
  if (!matchesQuery(definition, query)) {
    return null;
  }

  const source = exactSource(definition.targetSource ?? definition.source);
  if (source == null) return null;

  const uri = sourceReferenceUri(ctx.workspaceRoot, source);
  if (uri == null) return null;

  const canonicalUri = canonicalDocumentUri(uri).uri;
  const text = ctx.lookupText(canonicalUri);
  if (text == null) return null;

  const document = TextDocument.create(canonicalUri, guessLanguage(canonicalUri), 0, text);
  const range = rangeForSource(document, source);
  if (range == null) return null;

  return {
    name: definition.targetName ?? definition.name,
    kind: RESOURCE_SYMBOL_KIND[definition.resourceKind] ?? SymbolKind.Class,
    location: { uri: canonicalUri, range },
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
    ...definition.aliases,
  ].some((value) => value != null && value.toLowerCase().includes(query));
}

function resourceContainer(definition: SemanticResourceDefinitionRow): string {
  return definition.name == null
    ? definition.resourceKind
    : `${definition.resourceKind}: ${definition.name}`;
}

function rangeForSource(
  doc: { positionAt(offset: number): { line: number; character: number } },
  source: SemanticSourceReference,
) {
  if (source.start == null || source.end == null) return null;
  return {
    start: doc.positionAt(source.start),
    end: doc.positionAt(source.end),
  };
}

function sourceReferenceUri(
  workspaceRoot: string | null,
  source: SemanticSourceReference,
): string | null {
  const sourcePath = sourceReferencePath(source);
  if (sourcePath == null) return null;
  if (sourcePath.startsWith("file://")) {
    return sourcePath;
  }
  if (path.isAbsolute(sourcePath)) {
    return toFileUri(sourcePath);
  }
  if (workspaceRoot == null) {
    return null;
  }
  return toFileUri(path.resolve(workspaceRoot, sourcePath));
}

function sourceReferencePath(source: SemanticSourceReference | null): string | null {
  if (source == null) return null;
  return source.path ?? sourceReferencePath(source.anchor ?? null);
}

function exactSource(source: SemanticSourceReference | null): SemanticSourceReference | null {
  if (source == null) return null;
  if (source.start != null && source.end != null) return source;
  return exactSource(source.anchor ?? null);
}

function guessLanguage(uri: string): string {
  const fsPath = uri.startsWith("file:") ? URI.parse(uri).fsPath : uri;
  if (fsPath.endsWith(".ts") || fsPath.endsWith(".js")) return "typescript";
  if (fsPath.endsWith(".json")) return "json";
  return "html";
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
