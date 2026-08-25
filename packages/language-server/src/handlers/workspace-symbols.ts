/**
 * Workspace symbols for source-backed Aurelia resources.
 *
 * This projects semantic-runtime ResourceDefinitions into VS Code's native
 * "Go to Symbol in Workspace" surface without adding a custom command.
 */
import {
  LSPErrorCodes,
  ResponseError,
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
import {
  resourceSymbolAnswerFailure,
  resourceSymbolDetail,
  resourceSymbolKind,
  resourceSymbolName,
  resourceSymbolQueryTerms,
} from "../mapping/resource-symbol-policy.js";

const MAX_WORKSPACE_SYMBOLS = 100;

interface WorkspaceSymbolProjection {
  readonly value: SymbolInformation | null;
  readonly failures: readonly string[];
}

export async function handleWorkspaceSymbols(
  ctx: ServerContext,
  params: WorkspaceSymbolParams,
  operation: SemanticRuntimeLspOperation,
): Promise<SymbolInformation[] | null> {
  const query = params.query.trim().toLowerCase();
  const definitions = await operation.resourceDefinitions();
  const answerFailure = resourceSymbolAnswerFailure(definitions);
  if (answerFailure != null) {
    throw new ResponseError(
      LSPErrorCodes.RequestFailed,
      `Cannot map Aurelia workspace symbols: ${answerFailure}.`,
    );
  }
  const symbols: SymbolInformation[] = [];
  const failures: string[] = [];

  for (const definition of definitions.value.rows) {
    const projection = workspaceSymbolForResource(ctx, operation, query, definition);
    if (projection.value != null) symbols.push(projection.value);
    failures.push(...projection.failures);
  }

  if (failures.length > 0) {
    throw new ResponseError(
      LSPErrorCodes.RequestFailed,
      `Cannot map Aurelia workspace symbols: ${failures.join(" ")}`,
    );
  }

  return symbols.length > 0
    ? symbols.sort(compareWorkspaceSymbols).slice(0, MAX_WORKSPACE_SYMBOLS)
    : null;
}

function workspaceSymbolForResource(
  ctx: ServerContext,
  operation: SemanticRuntimeLspOperation,
  query: string,
  definition: SemanticResourceDefinitionRow,
): WorkspaceSymbolProjection {
  const name = resourceSymbolName(definition);
  if (name == null) return { value: null, failures: [] };
  if (!matchesQuery(definition, query)) {
    return { value: null, failures: [] };
  }

  const sourceCandidate = definition.targetSource ?? definition.source;
  if (sourceCandidate == null) return { value: null, failures: [] };

  const candidateUri = semanticSourceReferenceUri(sourceCandidate, ctx.documentUris);
  if (candidateUri == null || ctx.documentUris.workspaceHostPath(candidateUri) == null) {
    return { value: null, failures: [] };
  }
  const source = semanticExactSourceReference(sourceCandidate);
  if (source == null) {
    return {
      value: null,
      failures: [`Resource '${name}' has no exact target span in the workspace.`],
    };
  }

  const uri = semanticSourceReferenceUri(source, ctx.documentUris);
  if (uri == null) {
    return {
      value: null,
      failures: [`Resource '${name}' target cannot be projected into the workspace URI space.`],
    };
  }

  const canonicalUri = ctx.documentUris.resolve(uri).uri;
  const snapshot = operation.documents.lookupWorkspaceDocumentSnapshot(canonicalUri);
  if (snapshot == null) {
    return {
      value: null,
      failures: [`Resource '${name}' target document is unavailable in the current operation.`],
    };
  }

  const document = TextDocument.create(
    snapshot.uri,
    snapshot.languageId,
    snapshot.version ?? 0,
    snapshot.text,
  );
  const range = semanticSourceRangeForDocument(source, document);
  if (range == null) {
    return {
      value: null,
      failures: [`Resource '${name}' has a target span outside its current document text.`],
    };
  }

  return {
    value: {
      name,
      kind: resourceSymbolKind(definition),
      location: { uri: snapshot.uri, range },
      containerName: resourceSymbolDetail(definition),
    },
    failures: [],
  };
}

function matchesQuery(definition: SemanticResourceDefinitionRow, query: string): boolean {
  if (query.length === 0) return true;
  return resourceSymbolQueryTerms(definition)
    .some((value) => value.toLowerCase().includes(query));
}

function compareRanges(
  left: { start: { line: number; character: number }; end: { line: number; character: number } },
  right: { start: { line: number; character: number }; end: { line: number; character: number } },
): number {
  return comparePositions(left.start, right.start) || comparePositions(left.end, right.end);
}

function compareWorkspaceSymbols(left: SymbolInformation, right: SymbolInformation): number {
  return left.location.uri.localeCompare(right.location.uri)
    || compareRanges(left.location.range, right.location.range)
    || left.name.localeCompare(right.name)
    || left.kind - right.kind
    || (left.containerName ?? "").localeCompare(right.containerName ?? "");
}

function comparePositions(
  left: { line: number; character: number },
  right: { line: number; character: number },
): number {
  return left.line - right.line || left.character - right.character;
}
