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
  version?: string;
  features?: Record<string, boolean>;
  data?: Record<string, unknown>;
}
