import type {
  ApplicationFileRole,
  SemanticResourceDeclarationMode,
  SemanticResourceDefinitionAliasRow,
  SemanticResourceDefinitionBindableRow,
  SemanticResourceDefinitionRow,
  SemanticResourceVisibilityRow,
  SemanticRuntimeAnswer,
  SemanticRuntimeSummary,
  SemanticSourceReference,
} from "@aurelia-ls/semantic-runtime";
import type { Position, Range, WorkspaceEdit } from "vscode-languageserver/node";

export const AureliaProtocolRequest = {
  Resources: "aurelia/getResources",
  ScopeResources: "aurelia/getScopeResources",
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
}

/** Exact semantic-runtime project-shape answer used to confirm one LSP workspace ownership root. */
export type WorkspaceStatusResponse = SemanticRuntimeAnswer<SemanticRuntimeSummary>;

/** A newer semantic-runtime generation has settled and should replace cached client views. */
export interface AnalysisChangedPayload {
  readonly fingerprint: string;
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
type RuntimeAnswerTransport = Omit<
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

export type ResourceExplorerAnswer = RuntimeAnswerTransport;

/** JSON transport form of semantic-runtime's author-facing resource taxonomy. */
export type ResourceExplorerResourceKind = `${SemanticResourceDefinitionRow["resourceKind"]}`;

/** JSON transport form of compiler-world visibility. */
export type ResourceExplorerVisibilityKind = `${SemanticResourceVisibilityRow["visibilityKind"]}`;

export type ResourceExplorerBindable = SemanticResourceDefinitionBindableRow & {
  readonly primary: boolean;
};

export type ResourceExplorerDefinition = Pick<
  SemanticResourceDefinitionRow,
  | "projectKey"
  | "key"
  | "targetName"
  | "defaultProperty"
  | "source"
  | "nameSource"
  | "targetSource"
  | "targetDeclarationSource"
  | "handles"
> & {
  readonly declarationModes: readonly SemanticResourceDeclarationMode[];
};

export type ResourceExplorerOrigin = "project" | "package" | "framework" | "external" | "unknown";

export type ResourceExplorerVisibility = Omit<
  SemanticResourceVisibilityRow,
  "resourceKind" | "visibilityKind"
> & {
  readonly resourceKind: ResourceExplorerResourceKind;
  readonly visibilityKind: ResourceExplorerVisibilityKind;
  readonly uri: string | null;
};

export type ResourceExplorerItem = {
  /** Exact within the response generation and stable when the owning semantic source remains stable. */
  readonly id: string;
  readonly name: string;
  readonly kind: ResourceExplorerResourceKind;
  readonly aliases: readonly SemanticResourceDefinitionAliasRow[];
  readonly bindables: readonly ResourceExplorerBindable[];
  readonly definition: ResourceExplorerDefinition | null;
  readonly visibility: readonly ResourceExplorerVisibility[];
  readonly source: SemanticSourceReference | null;
  readonly uri: string | null;
  readonly package: string | null;
  readonly origin: ResourceExplorerOrigin;
};

export type ResourceExplorerResponse = {
  readonly fingerprint: string;
  readonly resources: readonly ResourceExplorerItem[];
  readonly templateCount: number;
  readonly inlineTemplateCount: number;
  readonly evidence: {
    readonly definitions: ResourceExplorerAnswer;
    readonly visibility: ResourceExplorerAnswer;
    readonly compilations: ResourceExplorerAnswer;
  };
};

export type ScopeResourcesResponse = {
  readonly compilerWorlds: readonly string[];
  readonly scopeLabel: string;
  readonly resources: readonly ResourceExplorerItem[];
  readonly evidence: ResourceExplorerResponse["evidence"];
} | null;

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
