import type { FrameId, ExprId, TextSpan } from "../../model/index.js";

/* ===========================
 * Overlay planning output
 * =========================== */

export interface VmTypeInfo {
  /** Alias injected once per template to keep overlay types readable. */
  alias: string;
  /** Type expression referencing the view-model instance type. */
  typeExpr: string;
  /** Optional display name for diagnostics. */
  displayName?: string;
}

/** Whole-module plan (one per linked+scoped module). */
export interface OverlayPlanModule {
  templates: TemplateOverlayPlan[];
}

/** Per-template overlay plan: type alias(es) and calls grouped by frame. */
export interface TemplateOverlayPlan {
  name?: string;
  vmType?: VmTypeInfo;
  frames: FrameOverlayPlan[];
}

/** Per-frame overlay: one type, many lambdas. */
export interface FrameOverlayPlan {
  frame: FrameId;
  /** Unique alias (TS) or just a display name (JS) for this frame's overlay type. */
  typeName: string; // e.g., "__AU_TTC_T0_F0"
  /** Type expression, e.g. "(App | Admin) & { $index: number } & { u: unknown }". */
  typeExpr: string;
  /** Unique property-path lambdas to validate against this frame's overlay type. */
  lambdas: OverlayLambdaPlan[]; // e.g., [{ exprId, lambda: "o => o.user.name", segments: [...] }]
}

export interface OverlayLambdaPlan {
  exprId: ExprId;
  lambda: string;
  /** Start/end (within `lambda`) of the expression body (after `=>`). */
  exprSpan: TextSpan;
  /**
   * Optional event type for listener expressions.
   * When present, emit augments the lambda context with `$event: <eventType>`.
   */
  eventType?: string;
  /** Optional member segments for rename/refs mapping (relative to `lambda`). */
  segments?: readonly OverlayLambdaSegment[] | undefined;
}

export interface OverlayLambdaSegment {
  kind: "member";
  path: string;
  span: TextSpan;
}
