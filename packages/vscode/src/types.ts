import type {
  AnalysisLimitationItem,
  AnalysisLimitationsResponse,
  AnalysisChangedPayload,
  ProtocolRange,
  ProtocolWorkspaceEdit,
  RelatedFileCandidate,
  RelatedFilesResponse,
  RenameFromTsResponse,
  ResourceInventoryItem,
  ResourceInventoryResponse,
  SourceOwnershipOwner,
  SourceOwnershipResponse,
  TemplateResourceAvailabilityResponse,
} from "@aurelia-ls/language-server/protocol";

export type {
  AnalysisLimitationItem,
  AnalysisLimitationsResponse,
  AnalysisChangedPayload,
  ProtocolRange,
  ProtocolWorkspaceEdit,
  RelatedFileCandidate,
  RelatedFilesResponse,
  RenameFromTsResponse,
  ResourceInventoryItem,
  SourceOwnershipOwner,
  SourceOwnershipResponse,
};

export interface AureliaWorkspaceIdentity {
  readonly key: string;
  readonly name: string;
  readonly uri: string;
}

/** Client-local enrichment added while routing a server notification. */
export type WorkspaceNotificationPayload<T> = T & {
  readonly workspace: AureliaWorkspaceIdentity;
};

export type ResourceInventoryWorkspaceSnapshot = AureliaWorkspaceIdentity & (
  | {
      readonly status: "ready";
      readonly response: ResourceInventoryResponse;
    }
  | {
      readonly status: "error";
      readonly error: string;
    }
);

/** Session snapshots remain separate because their fingerprints are not globally comparable. */
export interface ResourceInventorySnapshot {
  readonly workspaces: readonly ResourceInventoryWorkspaceSnapshot[];
}

export type AnalysisLimitationsWorkspaceSnapshot = AureliaWorkspaceIdentity & (
  | {
      readonly status: "ready";
      readonly response: AnalysisLimitationsResponse;
    }
  | {
      readonly status: "error";
      readonly error: string;
    }
);

/** Session answers remain separate until a consumer proves an exact inventory-generation join. */
export interface AnalysisLimitationsSnapshot {
  readonly workspaces: readonly AnalysisLimitationsWorkspaceSnapshot[];
}

export type TemplateResourceAvailabilitySnapshot = TemplateResourceAvailabilityResponse & {
  readonly workspace: AureliaWorkspaceIdentity;
};

export type SourceOwnershipSnapshot = SourceOwnershipResponse & {
  readonly workspace: AureliaWorkspaceIdentity;
};

export type ResourceNavigationRole = "resource" | "implementation" | "alias" | "bindable";

export type ResourceNavigationPlacement = "preview" | "beside";
export type ResourceNavigationCurrentness = "identity-current" | "strict-snapshot";

/** Stable identity used to re-resolve a current location before every navigation. */
export interface ResourceNavigationRequest {
  readonly workspaceKey: string;
  readonly fingerprint: string;
  readonly projectKey: string;
  readonly resourceIdentityKey: string;
  readonly role: ResourceNavigationRole;
  readonly childIdentityKey?: string;
  readonly placement?: ResourceNavigationPlacement;
  /** Active-template availability requires the exact snapshot it just proved. */
  readonly currentness?: ResourceNavigationCurrentness;
}
