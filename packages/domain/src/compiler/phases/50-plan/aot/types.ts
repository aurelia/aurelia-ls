import type { FrameId } from "../../../model/symbols.js";
import type { ExprId } from "../../../model/ir.js";
import type { TextSpan } from "../../../model/span.js";

export interface AotPlanExpression {
  readonly exprId: ExprId;
  readonly code: string;
  readonly exprSpan: TextSpan;
  readonly segments?: readonly AotPlanSegment[] | undefined;
  readonly frameId?: FrameId;
}

export interface AotPlanSegment {
  readonly kind: "member";
  readonly path: string;
  readonly span: TextSpan;
}

export interface AotPlanModule {
  readonly version: "aurelia-aot-plan@0";
  readonly expressions: readonly AotPlanExpression[];
}
