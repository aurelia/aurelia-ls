import type { ExprId, SourceSpan, NodeId, BindingMode } from "./compiler/model/ir.js";
import type { FrameId } from "./compiler/model/symbols.js";

type Brand<T extends string> = { readonly __brand: T };

export type AbsPath = string & Brand<"AbsPath">;
export type OverlayPath = string & Brand<"OverlayPath">;
export type HtmlPath = string & Brand<"HtmlPath">;

export type Range = readonly [start: number, end: number];

export interface RangeMap {
  kind: "interpolation";
  html: Range;
  ts: Range;
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
  overlayRange: Range;
  frameId?: FrameId | undefined;
}

export interface TemplateMappingArtifact {
  kind: "mapping";
  entries: readonly TemplateMappingEntry[];
}

export interface TemplateNodeInfo {
  id: NodeId;
  kind: "element" | "attribute" | "text" | "comment";
  hostKind: "custom" | "native" | "none";
  span: SourceSpan;
}

export interface TemplateBindableInfo {
  name: string;
  mode?: BindingMode;
  source: "component" | "custom-attribute" | "native" | "controller";
}

export interface TemplateExpressionInfo {
  exprId: ExprId;
  span: SourceSpan;
  frameId?: FrameId | undefined;
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
