export type OverlayReadyPayload = {
  uri?: string;
  overlayPath?: string;
  calls?: number;
  overlayLen?: number;
  diags?: number;
  meta?: unknown;
};

export interface MappingSpan {
  start: number;
  end: number;
}

export interface MappingEntry {
  exprId?: string;
  overlaySpan?: MappingSpan | null;
  htmlSpan?: MappingSpan | null;
}

export interface OverlayCallSite {
  exprId: string;
  overlayStart: number;
  overlayEnd: number;
  htmlSpan: MappingSpan;
}

export interface OverlaySnapshot {
  path: string;
  text: string;
  baseName?: string;
}

export interface OverlayBuildArtifactShape {
  overlay: OverlaySnapshot;
  mapping?: { entries?: readonly MappingEntry[] };
  calls?: readonly OverlayCallSite[];
}

export interface OverlayResponse {
  fingerprint?: string;
  artifact?: OverlayBuildArtifactShape | null;
  overlay?: OverlayBuildArtifactShape | null;
}

export interface MappingResponse {
  overlayPath: string;
  mapping: { entries: readonly MappingEntry[] };
}

export interface TemplateInfoResponse {
  expr?: { exprId?: string | number | null } | null;
  node?: { kind?: string | null } | null;
  controller?: { kind?: string | null } | null;
  bindables?: readonly unknown[] | null;
  mappingSize?: number;
}

export interface SsrArtifactShape {
  html: { text: string; path: string };
  manifest: { text: string; path: string };
}

export interface SsrResponse {
  fingerprint?: string;
  artifact?: SsrArtifactShape | null;
  ssr?: SsrArtifactShape | null;
}

export interface CapabilitiesResponse {
  schema?: "aurelia.capabilities/1";
  server?: {
    version?: string;
    workspaceVersion?: string;
  };
  contracts?: {
    query?: { version?: string };
    refactor?: { version?: string };
    diagnostics?: { version?: string; taxonomy?: string };
    semanticTokens?: { version?: string; legendHash?: string };
    presentation?: { version?: string };
    mapping?: { version?: string };
  };
  workspace?: {
    meta?: {
      fingerprint?: string;
      configHash?: string;
      docCount?: number;
    };
    artifacts?: {
      semantics?: boolean;
      catalog?: boolean;
      syntax?: boolean;
      resourceGraph?: boolean;
      provenance?: boolean;
      semanticSnapshot?: boolean;
      apiSurface?: boolean;
      featureUsage?: boolean;
      registrationPlan?: boolean;
    };
    indexes?: {
      resourceIndex?: boolean;
      symbolGraph?: boolean;
      usageIndex?: boolean;
      scopeIndex?: boolean;
      templateIndex?: boolean;
    };
  };
  lsp?: {
    optional?: {
      documentSymbol?: boolean;
      workspaceSymbol?: boolean;
      documentHighlight?: boolean;
      selectionRange?: boolean;
      linkedEditingRange?: boolean;
      foldingRange?: boolean;
      inlayHint?: boolean;
      codeLens?: boolean;
      documentLink?: boolean;
      callHierarchy?: boolean;
      documentColor?: boolean;
      semanticTokensDelta?: boolean;
    };
  };
  custom?: {
    overlay?: boolean;
    mapping?: boolean;
    queryAtPosition?: boolean;
    ssr?: boolean;
    dumpState?: boolean;
  };
  notifications?: {
    overlayReady?: boolean;
  };
}
