import type {
  ApplicationFileRole,
  SemanticProjectAnalysisCount,
  SemanticResourceDeclarationMode,
  SemanticProjectCandidateSummary,
  SemanticResourceInventoryCompleteness,
  SemanticResourceInventoryKind,
  SemanticResourceInventoryLocalityKind,
  SemanticResourceInventoryMetadataState,
  SemanticResourceInventoryOrigin,
  SemanticResourceNavigationUnavailableReason,
  SemanticRuntimeAnswer,
  SourceFileRole,
  SemanticTemplateResourceAvailabilityState,
  SemanticTemplateResourceAvailabilityRow,
} from "@aurelia-ls/semantic-runtime";
import type { Position, Range, WorkspaceEdit } from "vscode-languageserver/node";

export const AureliaProtocolRequest = {
  SourceOwnership: "aurelia/sourceOwnership",
  ResourceInventory: "aurelia/resourceInventory",
  TemplateResourceAvailability: "aurelia/templateResourceAvailability",
  RelatedFiles: "aurelia/getRelatedFiles",
  WorkspaceStatus: "aurelia/workspaceStatus",
  RenameFromTypeScript: "aurelia/renameFromTs",
} as const;

export const AureliaProtocolNotification = {
  AnalysisChanged: "aurelia/analysisChanged",
} as const;

export const AURELIA_TEMPLATE_CODE_ACTION_RESOLVE_SCHEMA = "aurelia.template-code-action-resolve/1" as const;

/** Client-owned workspace topology supplied before the server admits documents or projects. */
export interface AureliaInitializeOptions {
  readonly excludedWorkspaceRootUris: readonly string[];
  /** Existing workspace project roots offered to semantic-runtime discovery as host evidence. */
  readonly projectRootHintUris: readonly string[];
}

export interface WorkspaceNativeProjectConfiguration {
  readonly projectKey: string;
  readonly projectRootUri: string;
  readonly sourceUri: string;
  readonly appliedExcludedSourceRootUris: readonly string[];
  readonly diagnosticCount: number;
}

/** Candidate native configurations whose exact semantic recognition should be projected into workspace status. */
export interface WorkspaceStatusParams {
  readonly nativeProjectConfigurationUris?: readonly string[];
}

/** URI-safe projection of the shared semantic workspace/configuration authority. */
export interface WorkspaceStatusResponse {
  readonly fingerprint: string;
  readonly answer: RuntimeAnswerTransport;
  readonly projectAnalysisCounts: readonly SemanticProjectAnalysisCount[];
  readonly nativeProjectConfigurations: {
    readonly answer: RuntimeAnswerTransport;
    readonly rows: readonly WorkspaceNativeProjectConfiguration[];
  };
}

/** A newer semantic-runtime generation has settled and should replace cached client views. */
export interface AnalysisChangedPayload {
  readonly fingerprint: string;
  readonly changeKind: "source-text" | "topology";
}

export type TemplateCodeActionResolveData = {
  readonly schema: typeof AURELIA_TEMPLATE_CODE_ACTION_RESOLVE_SCHEMA;
  readonly textDocument: { readonly uri: string };
  readonly position: { readonly line: number; readonly character: number };
  /** Stable repair-plan identity; exact edit coordinates are deliberately re-planned at resolve time. */
  readonly actionIdentity: string;
};

type RuntimeAnswerTransportFields = Pick<
  SemanticRuntimeAnswer<unknown>,
  "schemaVersion" | "result" | "selection" | "coverage" | "summary" | "page" | "analysisDepth" | "continuations"
>;

/** JSON transport form of semantic-runtime's const-enum answer vocabulary. */
export type RuntimeAnswerTransport = Omit<
  RuntimeAnswerTransportFields,
  "result" | "selection" | "coverage"
> & {
  readonly result: `${RuntimeAnswerTransportFields["result"]}`;
  readonly selection: `${RuntimeAnswerTransportFields["selection"]}`;
  readonly coverage: `${RuntimeAnswerTransportFields["coverage"]}`;
};

export type ProtocolWorkspaceEdit = WorkspaceEdit;
export type ProtocolRange = Range;

export type DocumentUriParams = { uri: string };

export interface SourceOwnershipParams {
  readonly uri: string;
}

/** One exact boot-authored project admission, expressed only in URI-safe transport vocabulary. */
export interface SourceOwnershipOwner {
  readonly projectKey: string;
  readonly rootUri: string;
  readonly projectPath: string;
  readonly role: `${SourceFileRole}`;
}

export interface SourceOwnershipResponse {
  readonly fingerprint: string;
  readonly sourceUri: string;
  readonly answer: RuntimeAnswerTransport;
  readonly owners: readonly SourceOwnershipOwner[];
}

/** JSON transport form of semantic-runtime's author-facing resource taxonomy. */
export type ResourceInventoryKind = `${SemanticResourceInventoryKind}`;

/** Source roles are wire vocabulary, not labels inferred by the client. */
export const ResourceLocationRole = {
  PublicName: "public-name",
  Declaration: "declaration",
  Implementation: "implementation",
  Alias: "alias",
  BindableName: "bindable-name",
  BindableAttribute: "bindable-attribute",
  BindableProperty: "bindable-property",
  BindableDeclaration: "bindable-declaration",
  LocalOwner: "local-owner",
  Availability: "availability",
  Template: "template",
} as const;

export type ResourceLocationRole = typeof ResourceLocationRole[keyof typeof ResourceLocationRole];

export interface ResourceSourceLocation {
  readonly uri: string;
  readonly range: Range;
  readonly role: ResourceLocationRole;
  readonly label: string;
}

export type ResourceSourceUnavailableReason =
  | `${SemanticResourceNavigationUnavailableReason}`
  | "source-uri-unavailable"
  | "source-text-unavailable"
  | "source-range-unavailable";

/** Lossless source mapping: semantic absence and transport failure are observably different. */
export type ResourceSourceTarget =
  | { readonly state: "available"; readonly location: ResourceSourceLocation }
  | { readonly state: "absent" }
  | { readonly state: "unavailable"; readonly reason: ResourceSourceUnavailableReason };

export type ResourceNavigationTarget =
  | { readonly state: "available"; readonly location: ResourceSourceLocation }
  | { readonly state: "unavailable"; readonly reason: ResourceSourceUnavailableReason };

export interface ResourceInventoryAlias {
  readonly identityKey: string;
  readonly registrationKey: string | null;
  readonly name: string;
  readonly source: ResourceSourceTarget;
  readonly navigation: ResourceNavigationTarget;
}

export interface ResourceInventoryBindable {
  readonly identityKey: string;
  readonly name: string;
  readonly attribute: string;
  readonly mode: string;
  readonly nullable: boolean | null;
  readonly valueType: string | null;
  readonly primary: boolean;
  readonly sources: {
    readonly name: ResourceSourceTarget;
    readonly attribute: ResourceSourceTarget;
    readonly property: ResourceSourceTarget;
    readonly declaration: ResourceSourceTarget;
  };
  readonly navigation: ResourceNavigationTarget;
}

export interface ResourceInventoryItem {
  /** Stable semantic identity. Kernel/product handles never cross this boundary. */
  readonly identityKey: string;
  readonly projectKey: string;
  readonly kind: ResourceInventoryKind;
  readonly name: string;
  readonly registrationKey: string | null;
  readonly aliases: readonly ResourceInventoryAlias[];
  readonly bindables: readonly ResourceInventoryBindable[];
  readonly declarationModes: readonly SemanticResourceDeclarationMode[];
  readonly metadataState: `${SemanticResourceInventoryMetadataState}`;
  readonly origin: Omit<SemanticResourceInventoryOrigin, "kind"> & {
    readonly kind: `${SemanticResourceInventoryOrigin["kind"]}`;
  };
  readonly locality: {
    readonly kind: `${SemanticResourceInventoryLocalityKind}`;
    readonly ownerIdentityKey: string | null;
    readonly ownerName: string | null;
    readonly ownerSource: ResourceSourceTarget;
  };
  readonly sources: {
    readonly publicName: ResourceSourceTarget;
    readonly declaration: ResourceSourceTarget;
    readonly implementation: ResourceSourceTarget;
  };
  readonly navigation: ResourceNavigationTarget;
}

export interface ResourceProject {
  readonly projectKey: string;
  readonly rootUri: string;
  readonly sourceFiles: number;
  readonly shapeKind: `${SemanticProjectCandidateSummary["shapeKind"]}`;
  readonly analysisKind: `${SemanticProjectCandidateSummary["analysisKind"]}`;
}

export type ResourceInventoryProjectResult =
  | {
      readonly status: "ready";
      readonly project: ResourceProject;
      readonly answer: RuntimeAnswerTransport;
      readonly resources: readonly ResourceInventoryItem[];
      readonly completeness: SemanticResourceInventoryCompleteness;
    }
  | {
      readonly status: "error";
      readonly project: ResourceProject;
      readonly message: string;
    };

export interface ResourceInventoryResponse {
  readonly fingerprint: string;
  readonly projects: readonly ResourceInventoryProjectResult[];
}

export interface TemplateResourceAvailabilityParams {
  readonly uri: string;
  readonly position: Position;
  readonly projectKey?: string;
  readonly templateResourceScopeIdentityKey?: string;
}

export interface TemplateResourceScopeCandidate {
  readonly templateIdentityKey: string;
  readonly scopeIdentityKey: string;
  readonly definitionName: string;
  readonly compilationLane: "app-runtime" | "authoring";
  readonly source: ResourceSourceTarget;
}

export interface TemplateResourceAvailabilityItem {
  readonly resource: ResourceInventoryItem;
  readonly state: `${SemanticTemplateResourceAvailabilityState}`;
  readonly visibilityKind: `${SemanticTemplateResourceAvailabilityRow["visibilityKind"]}`;
  readonly availabilitySource: ResourceSourceTarget;
}

export type TemplateResourceProjectSelection =
  | {
      readonly status: "absent";
      readonly candidates: readonly ResourceProject[];
    }
  | {
      readonly status: "ambiguous";
      readonly candidates: readonly ResourceProject[];
    }
  | {
      readonly status: "exact";
      readonly project: ResourceProject;
      readonly answer: RuntimeAnswerTransport;
      readonly selectedTemplate: TemplateResourceScopeCandidate | null;
      readonly templateCandidates: readonly TemplateResourceScopeCandidate[];
      readonly resources: readonly TemplateResourceAvailabilityItem[];
      readonly completeness: SemanticResourceInventoryCompleteness;
    };

export interface TemplateResourceAvailabilityResponse {
  readonly fingerprint: string;
  readonly projectSelection: TemplateResourceProjectSelection;
}

export type RelatedFileRole = Extract<ApplicationFileRole, "component-source" | "component-template">;

export interface RelatedFileCandidate {
  readonly uri: string;
  readonly role: RelatedFileRole;
  readonly elementName: string;
  readonly className: string | null;
}

export type RelatedFilesResponse = readonly RelatedFileCandidate[];

export type RenameFromTsParams = {
  uri: string;
  position: Position;
  newName?: string;
};

export type RenameFromTsResponse = {
  status: "available";
  range: ProtocolRange;
  placeholder: string;
  message: string;
  templateReferenceCount: number;
  typeScriptReferenceCount: number;
  candidateCount: number;
} | {
  status: "success";
  workspaceEdit: ProtocolWorkspaceEdit;
  message: string;
  templateReferenceCount: number;
  typeScriptReferenceCount: number;
  candidateCount: number;
} | {
  status: "not-applicable";
  reason: string;
  message: string;
  templateReferenceCount: number;
  typeScriptReferenceCount: number;
  candidateCount: number;
} | {
  status: "refused";
  reason: string;
  message: string;
  templateReferenceCount: number;
  typeScriptReferenceCount: number;
  candidateCount: number;
} | {
  status: "blocked";
  reason: string;
  message: string;
  failures?: readonly string[];
  templateReferenceCount?: number;
  typeScriptReferenceCount?: number;
  candidateCount?: number;
};
