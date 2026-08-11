import type {
  SemanticProjectCandidateSummary,
  SemanticResourceInventoryNavigationRole,
  SemanticResourceInventoryRow,
  SemanticRuntimeAnswer,
  SemanticSourceReference,
  SemanticTemplateResourceAvailabilityRow,
  SemanticTemplateResourceScopeCandidate,
} from "@aurelia-ls/semantic-runtime";
import { semanticExactSourceReference } from "@aurelia-ls/semantic-runtime";
import { TextDocument } from "vscode-languageserver-textdocument";
import type {
  ResourceInventoryItem,
  ResourceLocationRole,
  ResourceNavigationTarget,
  ResourceProject,
  ResourceSourceUnavailableReason,
  ResourceSourceTarget,
  RuntimeAnswerTransport,
  TemplateResourceAvailabilityItem,
  TemplateResourceScopeCandidate,
} from "../protocol.js";
import { ResourceLocationRoles } from "../protocol.js";
import type { WorkspaceDocumentUris } from "../utils/document-uri.js";
import { languageIdForSource } from "../utils/document-kind.js";
import {
  semanticSourceRangeForDocument,
  semanticSourceReferenceUri,
} from "./source-locations.js";

export interface ResourceDiscoveryMappingContext {
  readonly documentUris: WorkspaceDocumentUris;
  readonly lookupText: (uri: string) => string | null;
}

export function mapResourceProject(
  project: SemanticProjectCandidateSummary,
  documentUris: WorkspaceDocumentUris,
): ResourceProject {
  return {
    projectKey: project.projectKey,
    rootUri: documentUris.uriForHostPath(project.rootDir),
    sourceFiles: project.sourceFiles,
    shapeKind: `${project.shapeKind}`,
    analysisKind: `${project.analysisKind}`,
  };
}

export function mapResourceInventoryItem(
  row: SemanticResourceInventoryRow,
  context: ResourceDiscoveryMappingContext,
): ResourceInventoryItem {
  const navigation = mapNavigationTarget(
    row.sources.navigation,
    mapNavigationRole(row.sources.navigationRole),
    row.sources.navigationUnavailableReason ?? "no-authored-source",
    context,
  );
  return {
    identityKey: row.identityKey,
    projectKey: row.projectKey,
    kind: `${row.resourceKind}`,
    name: row.name,
    registrationKey: row.registrationKey,
    aliases: row.aliases.map((alias) => ({
      identityKey: alias.identityKey,
      registrationKey: alias.registrationKey,
      name: alias.name,
      source: mapSourceTarget(alias.source, ResourceLocationRoles.Alias, context),
      navigation: mapNavigationTarget(alias.source, ResourceLocationRoles.Alias, "no-authored-source", context),
    })),
    bindables: row.bindables.map((bindable) => ({
      identityKey: bindable.identityKey,
      name: bindable.name,
      attribute: bindable.attribute,
      mode: `${bindable.mode}`,
      nullable: bindable.nullable,
      valueType: bindable.valueType,
      primary: bindable.primary,
      sources: {
        name: mapSourceTarget(bindable.nameSource, ResourceLocationRoles.BindableName, context),
        attribute: mapSourceTarget(bindable.attributeSource, ResourceLocationRoles.BindableAttribute, context),
        property: mapSourceTarget(bindable.propertySource, ResourceLocationRoles.BindableProperty, context),
        declaration: mapSourceTarget(bindable.source, ResourceLocationRoles.BindableDeclaration, context),
      },
      navigation: mapNavigationTarget(
        bindable.navigationSource,
        mapNavigationRole(bindable.navigationRole),
        "no-authored-source",
        context,
      ),
    })),
    declarationModes: row.declarationModes,
    metadataState: `${row.metadataState}`,
    origin: {
      ...row.origin,
      kind: `${row.origin.kind}`,
    },
    locality: {
      kind: `${row.locality.kind}`,
      ownerIdentityKey: row.locality.ownerIdentityKey,
      ownerName: row.locality.ownerName,
      ownerSource: mapSourceTarget(row.locality.ownerSource, ResourceLocationRoles.LocalOwner, context),
    },
    sources: {
      publicName: mapSourceTarget(row.sources.publicName, ResourceLocationRoles.PublicName, context),
      declaration: mapSourceTarget(row.sources.declaration, ResourceLocationRoles.Declaration, context),
      implementation: mapSourceTarget(row.sources.implementation, ResourceLocationRoles.Implementation, context),
    },
    navigation,
  };
}

function mapNavigationRole(
  role: SemanticResourceInventoryNavigationRole | `${SemanticResourceInventoryNavigationRole}` | null,
): ResourceLocationRole | null {
  switch (role) {
    case "public-name": return ResourceLocationRoles.PublicName;
    case "implementation": return ResourceLocationRoles.Implementation;
    case "bindable-name": return ResourceLocationRoles.BindableName;
    case "bindable-attribute": return ResourceLocationRoles.BindableAttribute;
    case "bindable-property": return ResourceLocationRoles.BindableProperty;
    case "bindable-declaration": return ResourceLocationRoles.BindableDeclaration;
    case null: return null;
    default: throw new Error(`Unknown semantic resource navigation role '${String(role)}'.`);
  }
}

export function mapTemplateResourceScopeCandidate(
  candidate: SemanticTemplateResourceScopeCandidate,
  context: ResourceDiscoveryMappingContext,
): TemplateResourceScopeCandidate {
  return {
    templateIdentityKey: candidate.templateIdentityKey,
    scopeIdentityKey: candidate.scopeIdentityKey,
    definitionName: candidate.definitionName,
    compilationLane: candidate.compilationLane,
    source: mapSourceTarget(candidate.source, ResourceLocationRoles.Template, context),
  };
}

export function mapTemplateResourceAvailabilityItem(
  row: SemanticTemplateResourceAvailabilityRow,
  context: ResourceDiscoveryMappingContext,
): TemplateResourceAvailabilityItem {
  return {
    resource: mapResourceInventoryItem(row.resource, context),
    state: `${row.state}`,
    visibilityKind: `${row.visibilityKind}`,
    availabilitySource: mapSourceTarget(row.availabilitySource, ResourceLocationRoles.Availability, context),
  };
}

export function mapRuntimeAnswer(answer: SemanticRuntimeAnswer<unknown>): RuntimeAnswerTransport {
  return {
    schemaVersion: answer.schemaVersion,
    result: `${answer.result}`,
    selection: `${answer.selection}`,
    coverage: `${answer.coverage}`,
    summary: answer.summary,
    ...(answer.analysisBasis == null ? {} : { analysisBasis: answer.analysisBasis }),
    page: answer.page,
    ...(answer.analysisDepth == null ? {} : { analysisDepth: answer.analysisDepth }),
    ...(answer.continuations == null ? {} : { continuations: answer.continuations }),
  };
}

function mapNavigationTarget(
  source: SemanticSourceReference | null,
  role: ResourceLocationRole | null,
  absentReason: ResourceSourceUnavailableReason,
  context: ResourceDiscoveryMappingContext,
): ResourceNavigationTarget {
  if (source == null) {
    return { state: "unavailable", reason: absentReason };
  }
  if (role == null) {
    throw new Error("Semantic resource navigation source is missing its source role.");
  }
  const mapped = mapSourceTarget(source, role, context);
  if (mapped.state === "available") {
    return mapped;
  }
  return {
    state: "unavailable",
    reason: mapped.state === "unavailable" ? mapped.reason : absentReason,
  };
}

function mapSourceTarget(
  source: SemanticSourceReference | null,
  role: ResourceLocationRole,
  context: ResourceDiscoveryMappingContext,
): ResourceSourceTarget {
  if (source == null) {
    return { state: "absent" };
  }
  const exact = semanticExactSourceReference(source);
  if (exact == null) {
    return { state: "unavailable", reason: "source-range-unavailable" };
  }
  const uri = semanticSourceReferenceUri(exact, context.documentUris);
  if (uri == null) {
    return { state: "unavailable", reason: "source-uri-unavailable" };
  }
  const text = context.lookupText(uri);
  if (text == null) {
    return { state: "unavailable", reason: "source-text-unavailable" };
  }
  const document = TextDocument.create(uri, languageIdForSource(uri), 0, text);
  const range = semanticSourceRangeForDocument(exact, document);
  if (range == null) {
    return { state: "unavailable", reason: "source-range-unavailable" };
  }
  return {
    state: "available",
    location: {
      uri,
      range,
      role,
      label: exact.label,
    },
  };
}
