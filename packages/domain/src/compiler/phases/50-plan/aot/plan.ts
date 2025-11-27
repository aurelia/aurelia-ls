import type { IrModule } from "../../../model/ir.js";
import type { ScopeModule } from "../../../model/symbols.js";
import { exprIdMapGet } from "../../../model/identity.js";
import { indexExprTable } from "../../../expr-utils.js";
import { emitMappedExpression } from "../overlay/mapped-emitter.js";
import type { AotPlanModule, AotPlanExpression, AotPlanSegment } from "./types.js";

export function planAot(ir: IrModule, scope: ScopeModule): AotPlanModule {
  const exprIndex = indexExprTable(ir.exprTable ?? []);
  const exprToFrame = scope.templates?.[0]?.exprToFrame ?? null;
  const expressions: AotPlanExpression[] = [];

  for (const [exprId, entry] of exprIndex) {
    const frameId = exprIdMapGet(exprToFrame, exprId) as AotPlanExpression["frameId"];
    switch (entry.expressionType) {
      case "IsProperty":
      case "IsFunction":
      case "Interpolation": {
        try {
          const emitted = emitMappedExpression(entry.ast as never);
          expressions.push({
            exprId,
            code: emitted.code,
            exprSpan: emitted.span,
            segments: toSegments(emitted.segments),
            ...(frameId !== undefined ? { frameId } : {}),
          });
        } catch {
          // Ignore expressions we cannot emit for now; diagnostics already exist upstream.
        }
        break;
      }
      default:
        break;
    }
  }

  return { version: "aurelia-aot-plan@0", expressions };
}

function toSegments(segments: readonly { kind: "member"; path: string; span: { start: number; end: number } }[]): readonly AotPlanSegment[] | undefined {
  if (!segments || segments.length === 0) return undefined;
  return segments.map((s) => ({ kind: "member", path: s.path, span: s.span }));
}
