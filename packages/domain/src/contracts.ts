import type { ExprId, NodeId, BindingMode, TextSpan } from "./compiler/model/ir.js";
import type { FrameId } from "./compiler/model/symbols.js";
import type { Brand, HydrationId } from "./compiler/model/identity.js";
import type { SourceSpan } from "./compiler/model/span.js";

export type AbsPath = string & Brand<"AbsPath">;
export type OverlayPath = string & Brand<"OverlayPath">;
export type HtmlPath = string & Brand<"HtmlPath">;

export interface RangeMap {
  kind: "interpolation";
  html: TextSpan;
  ts: TextSpan;
}

export interface OverlayArtifact {
  overlayPath: OverlayPath;
  overlayText: string;
  maps: readonly RangeMap[];
  /** Placeholder for a first-class mapping artifact once emitted by Phase 60. */
  mapping?: TemplateMappingArtifact;
}

export interface TemplateMappingEntry {
  exprId: ExprId;
  htmlSpan: SourceSpan;
  overlaySpan: TextSpan;
  frameId?: FrameId | undefined;
  segments?: readonly TemplateMappingSegment[] | undefined;
}

export interface TemplateMappingArtifact {
  kind: "mapping";
  entries: readonly TemplateMappingEntry[];
}

export interface TemplateMappingSegment {
  kind: "member";
  path: string;
  htmlSpan: SourceSpan;
  overlaySpan: TextSpan;
}

export interface SsrMappingEntry {
  nodeId: NodeId;
  /** Hydration id for correlation/debugging (optional). */
  hid?: HydrationId;
  templateSpan: SourceSpan | null;
  htmlSpan?: SourceSpan | null;
  manifestSpan?: SourceSpan | null;
}

export interface SsrMappingArtifact {
  kind: "ssr-mapping";
  entries: readonly SsrMappingEntry[];
}

export interface TemplateNodeInfo {
  id: NodeId;
  kind: "element" | "attribute" | "text" | "comment";
  hostKind: "custom" | "native" | "none";
  span: SourceSpan;
  templateIndex: number;
}

export interface TemplateBindableInfo {
  name: string;
  mode?: BindingMode;
  source: "component" | "custom-attribute" | "native" | "controller";
  type?: string;
}

export interface TemplateExpressionInfo {
  exprId: ExprId;
  span: SourceSpan;
  frameId?: FrameId | undefined;
  memberPath?: string;
}

export interface TemplateControllerInfo {
  kind: "repeat" | "with" | "if" | "switch" | "promise" | "portal";
  span: SourceSpan;
}

export interface TemplateQueryFacade {
  nodeAt(htmlOffset: number): TemplateNodeInfo | null;
  bindablesFor(node: TemplateNodeInfo): TemplateBindableInfo[] | null;
  exprAt(htmlOffset: number): TemplateExpressionInfo | null;
  expectedTypeOf(expr: TemplateExpressionInfo | TemplateBindableInfo): string | null;
  controllerAt(htmlOffset: number): TemplateControllerInfo | null;
}
