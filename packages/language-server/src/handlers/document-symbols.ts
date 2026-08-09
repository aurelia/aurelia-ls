/**
 * Document symbols for source-backed Aurelia resource declarations.
 *
 * The outline is intentionally conservative: it only emits symbols when
 * semantic-runtime can point at authored script source.
 */
import {
  LSPErrorCodes,
  ResponseError,
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
import type { SemanticRuntimeLspOperation } from "../runtime/semantic-runtime-session.js";
import { isScriptDocument } from "../utils/document-kind.js";
import {
  resourceSymbolAnswerFailure,
  resourceSymbolDetail,
  resourceSymbolKind,
  resourceSymbolName,
} from "../mapping/resource-symbol-policy.js";

interface DocumentSymbolProjection {
  readonly value: DocumentSymbol | null;
  readonly failures: readonly string[];
}

interface DocumentSymbolListProjection {
  readonly value: DocumentSymbol[];
  readonly failures: readonly string[];
}

export async function handleDocumentSymbols(
  ctx: ServerContext,
  params: DocumentSymbolParams,
  operation: SemanticRuntimeLspOperation,
): Promise<DocumentSymbol[] | null> {
  const uri = params.textDocument.uri;
  const doc = operation.documents.openDocument(uri);
  if (doc == null || !isScriptDocument(doc)) return null;

  const requestedPath = ctx.documentUris.authoredHostPath(uri);
  if (requestedPath == null) return null;
  const requested = canonicalTypeSystemPath(requestedPath);
  const definitions = await operation.resourceDefinitions();
  const answerFailure = resourceSymbolAnswerFailure(definitions);
  if (answerFailure != null) {
    throw new ResponseError(
      LSPErrorCodes.RequestFailed,
      `Cannot map Aurelia document symbols: ${answerFailure}.`,
    );
  }
  const symbols: DocumentSymbol[] = [];
  const failures: string[] = [];

  for (const definition of definitions.value.rows) {
    const projection = documentSymbolForResource(ctx.documentUris, requested, doc, definition);
    if (projection.value != null) symbols.push(projection.value);
    failures.push(...projection.failures);
  }

  if (failures.length > 0) {
    throw new ResponseError(
      LSPErrorCodes.RequestFailed,
      `Cannot map Aurelia document symbols: ${failures.join(" ")}`,
    );
  }

  return symbols.length > 0
    ? symbols.sort(compareDocumentSymbols)
    : null;
}

function documentSymbolForResource(
  documentUris: WorkspaceDocumentUris,
  requested: string,
  doc: Pick<TextDocument, "getText" | "positionAt">,
  definition: SemanticResourceDefinitionRow,
): DocumentSymbolProjection {
  const name = resourceSymbolName(definition);
  if (name == null) return { value: null, failures: [] };

  const selectionCandidate = definition.targetSource ?? definition.source;
  const selectionSource = semanticExactSourceReference(selectionCandidate);
  if (selectionSource == null) {
    return sourceMatches(documentUris, requested, selectionCandidate)
      ? {
          value: null,
          failures: [`Resource '${name}' has no exact target span in the requesting document.`],
        }
      : { value: null, failures: [] };
  }
  if (!sourceMatches(documentUris, requested, selectionSource)) {
    return { value: null, failures: [] };
  }
  const selectionRange = semanticSourceRangeForDocument(selectionSource, doc);
  if (selectionRange == null) {
    return {
      value: null,
      failures: [`Resource '${name}' has a target span outside the current document text.`],
    };
  }

  let declarationRange: Range | null = null;
  const declarationCandidate = definition.targetDeclarationSource;
  const declarationSource = semanticExactSourceReference(declarationCandidate);
  if (declarationSource == null) {
    if (sourceMatches(documentUris, requested, declarationCandidate)) {
      return {
        value: null,
        failures: [`Resource '${name}' has no exact declaration span in the requesting document.`],
      };
    }
  } else if (sourceMatches(documentUris, requested, declarationSource)) {
    declarationRange = semanticSourceRangeForDocument(declarationSource, doc);
    if (declarationRange == null) {
      return {
        value: null,
        failures: [`Resource '${name}' has a declaration span outside the current document text.`],
      };
    }
  }

  const bindables = bindableSymbols(documentUris, requested, doc, definition.bindables);
  return {
    value: {
      name,
      detail: resourceSymbolDetail(definition),
      kind: resourceSymbolKind(definition),
      range: declarationRange ?? selectionRange,
      selectionRange,
      children: bindables.value,
    },
    failures: bindables.failures,
  };
}

function bindableSymbols(
  documentUris: WorkspaceDocumentUris,
  requested: string,
  doc: Pick<TextDocument, "getText" | "positionAt">,
  bindables: readonly SemanticResourceDefinitionBindableRow[],
): DocumentSymbolListProjection {
  const symbols: DocumentSymbol[] = [];
  const failures: string[] = [];
  for (const bindable of bindables) {
    const candidate = bindable.propertySource ?? bindable.nameSource ?? bindable.source;
    const source = semanticExactSourceReference(candidate);
    if (source == null) {
      if (sourceMatches(documentUris, requested, candidate)) {
        failures.push(`Bindable '${bindable.name}' has no exact declaration span in the requesting document.`);
      }
      continue;
    }
    if (!sourceMatches(documentUris, requested, source)) {
      continue;
    }
    const range = semanticSourceRangeForDocument(source, doc);
    if (range == null) {
      failures.push(`Bindable '${bindable.name}' has a declaration span outside the current document text.`);
      continue;
    }
    symbols.push({
      name: bindable.name,
      detail: bindableDetail(bindable),
      kind: SymbolKind.Field,
      range,
      selectionRange: range,
      children: [],
    });
  }
  return {
    value: symbols.sort(compareDocumentSymbols),
    failures,
  };
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

function compareDocumentSymbols(left: DocumentSymbol, right: DocumentSymbol): number {
  return compareRanges(left.range, right.range)
    || left.name.localeCompare(right.name)
    || left.kind - right.kind;
}

function comparePositions(
  left: { line: number; character: number },
  right: { line: number; character: number },
): number {
  return left.line - right.line || left.character - right.character;
}
