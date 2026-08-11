import type {
  SemanticAnalysisLimitationRow,
  SemanticProjectFindingEffectivePolicy,
  SemanticProjectFindingPolicySourceSpan,
  SemanticSourceRange,
  SemanticSourceReference,
} from "@aurelia-ls/semantic-runtime";
import { semanticExactSourceReference } from "@aurelia-ls/semantic-runtime";
import { TextDocument } from "vscode-languageserver-textdocument";
import type {
  AnalysisLimitationEffectivePolicy,
  AnalysisLimitationItem,
  AnalysisLimitationSourceTarget,
} from "../protocol.js";
import { languageIdForSource } from "../utils/document-kind.js";
import type { WorkspaceDocumentUris } from "../utils/document-uri.js";
import {
  semanticSourceRangeForDocument,
  semanticSourceReferenceUri,
} from "./source-locations.js";

export interface AnalysisLimitationsMappingContext {
  readonly documentUris: WorkspaceDocumentUris;
  readonly lookupText: (uri: string) => string | null;
}

export function mapAnalysisLimitationItem(
  row: SemanticAnalysisLimitationRow,
  context: AnalysisLimitationsMappingContext,
): AnalysisLimitationItem {
  return {
    findingKey: row.findingKey,
    ruleId: row.ruleId,
    authority: row.authority,
    title: row.title,
    explanation: row.explanation,
    action: row.action,
    reason: row.reason,
    source: mapSemanticSourceTarget(row.source, row.sourceRange, context),
    currentCoverage: row.currentCoverage,
    evidence: {
      openSeamSiteKey: row.evidence.openSeamSiteKey,
      seamKeys: row.evidence.seamKeys,
      materializations: row.evidence.materializations,
      products: row.evidence.products.map((product) => ({
        productKey: product.productKey,
        productKindKey: product.productKindKey,
        source: mapSemanticSourceTarget(product.source, null, context),
      })),
    },
    effectivePolicy: mapAnalysisLimitationEffectivePolicy(row.effectivePolicy, context),
  };
}

export function mapAnalysisLimitationEffectivePolicy(
  policy: SemanticProjectFindingEffectivePolicy,
  context: AnalysisLimitationsMappingContext,
): AnalysisLimitationEffectivePolicy {
  return {
    ruleId: policy.ruleId,
    disposition: policy.disposition,
    authority: policy.authority,
    source: mapPolicySourceTarget(policy.source, context),
  };
}

function mapSemanticSourceTarget(
  source: SemanticSourceReference | null,
  expectedRange: SemanticSourceRange | null,
  context: AnalysisLimitationsMappingContext,
): AnalysisLimitationSourceTarget {
  if (source == null) return { state: "absent" };
  const exact = semanticExactSourceReference(source);
  if (exact == null) return { state: "unavailable", reason: "source-range-unavailable" };
  let uri: string | null;
  try {
    uri = semanticSourceReferenceUri(exact, context.documentUris);
  } catch {
    uri = null;
  }
  if (uri == null) return { state: "unavailable", reason: "source-uri-unavailable" };
  const text = context.lookupText(uri);
  if (text == null) return { state: "unavailable", reason: "source-text-unavailable" };
  const document = TextDocument.create(uri, languageIdForSource(uri), 0, text);
  const range = semanticSourceRangeForDocument(exact, document);
  if (range == null) return { state: "unavailable", reason: "source-range-unavailable" };
  if (expectedRange != null && !sameRange(range, expectedRange)) {
    return { state: "unavailable", reason: "source-range-mismatch" };
  }
  return { state: "available", location: { uri, range } };
}

function mapPolicySourceTarget(
  source: SemanticProjectFindingPolicySourceSpan | null,
  context: AnalysisLimitationsMappingContext,
): AnalysisLimitationSourceTarget {
  if (source == null) return { state: "absent" };
  let uri: string;
  try {
    uri = context.documentUris.uriForHostPath(source.filePath);
  } catch {
    return { state: "unavailable", reason: "source-uri-unavailable" };
  }
  const text = context.lookupText(uri);
  if (text == null) return { state: "unavailable", reason: "source-text-unavailable" };
  const document = TextDocument.create(uri, languageIdForSource(uri), 0, text);
  const range = semanticSourceRangeForDocument({
    kind: "project-finding-policy",
    label: source.filePath,
    path: source.filePath,
    start: source.start,
    end: source.end,
  }, document);
  if (range == null) return { state: "unavailable", reason: "source-range-unavailable" };
  const expectedRange = {
    start: source.startPosition,
    end: source.endPosition,
  };
  if (!sameRange(range, expectedRange)) {
    return { state: "unavailable", reason: "source-range-mismatch" };
  }
  return { state: "available", location: { uri, range } };
}

function sameRange(
  left: SemanticSourceRange,
  right: SemanticSourceRange,
): boolean {
  return left.start.line === right.start.line
    && left.start.character === right.start.character
    && left.end.line === right.end.line
    && left.end.character === right.end.character;
}
