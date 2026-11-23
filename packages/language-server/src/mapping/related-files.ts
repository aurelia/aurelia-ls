import { canonicalTypeSystemPath, type SemanticTemplateDocumentOwnershipResult } from "@aurelia-ls/semantic-runtime";
import type { RelatedFileCandidate, RelatedFileRole, RelatedFilesResponse } from "../protocol.js";
import type { WorkspaceDocumentUris } from "../utils/document-uri.js";
import { semanticSourceReferenceFilePath } from "./source-locations.js";

interface RelatedFileEdge {
  readonly from: string;
  readonly to: string;
  readonly role: RelatedFileRole;
  readonly elementName: string;
  readonly className: string | null;
}

/** Directed file destinations from a component's proven class, template and registration anchors. */
function* relatedFileEdges(
  ownership: SemanticTemplateDocumentOwnershipResult,
  documentUris: WorkspaceDocumentUris,
): Iterable<RelatedFileEdge> {
  for (const component of ownership.components) {
    const template = semanticSourceReferenceFilePath(component.templateSource, documentUris);
    if (template == null) continue;
    const declaration = semanticSourceReferenceFilePath(component.targetDeclarationSource, documentUris);
    const registration = semanticSourceReferenceFilePath(component.registrationSource, documentUris);
    const templateKey = canonicalTypeSystemPath(template);
    const declarationKey = declaration == null ? null : canonicalTypeSystemPath(declaration);
    const { elementName, className } = component;
    if (declaration != null && declarationKey !== templateKey) {
      yield { from: template, to: declaration, role: "component-source", elementName, className };
      yield { from: declaration, to: template, role: "component-template", elementName, className };
    }
    if (registration != null) {
      const registrationKey = canonicalTypeSystemPath(registration);
      if (registrationKey !== templateKey && registrationKey !== declarationKey) {
        yield { from: registration, to: template, role: "component-template", elementName, className };
      }
    }
  }
}

/** The command selects files; multiple resource identities can name the same destination. */
export function relatedFileCandidates(
  ownership: SemanticTemplateDocumentOwnershipResult,
  filePath: string,
  documentUris: WorkspaceDocumentUris,
): RelatedFilesResponse {
  const requested = canonicalTypeSystemPath(filePath);
  const candidates = new Map<string, RelatedFileCandidate>();
  for (const edge of relatedFileEdges(ownership, documentUris)) {
    if (canonicalTypeSystemPath(edge.from) !== requested) continue;
    const key = canonicalTypeSystemPath(edge.to);
    if (candidates.has(key)) continue;
    candidates.set(key, {
      uri: documentUris.uriForHostPath(edge.to), role: edge.role,
      elementName: edge.elementName, className: edge.className,
    });
  }
  return [...candidates.values()].sort((left, right) => left.uri.localeCompare(right.uri));
}

/** Exactly the editor documents for which relatedFileCandidates can offer a destination. */
export function relatedFileSourceUris(
  ownership: SemanticTemplateDocumentOwnershipResult,
  documentUris: WorkspaceDocumentUris,
): readonly string[] {
  const origins = new Map<string, string>();
  for (const edge of relatedFileEdges(ownership, documentUris)) {
    origins.set(canonicalTypeSystemPath(edge.from), documentUris.uriForHostPath(edge.from));
  }
  return [...origins.values()].sort();
}
