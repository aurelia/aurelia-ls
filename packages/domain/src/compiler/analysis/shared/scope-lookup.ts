import { exprIdMapGet, toExprIdMap, type ExprIdMap } from "../../model/identity.js";
import type { ExprId } from "../../model/ir.js";
import type { FrameId, ScopeFrame, ScopeTemplate } from "../../model/symbols.js";

export interface ScopeLookup {
  readonly template: ScopeTemplate;
  readonly frames: readonly ScopeFrame[];
  readonly root: FrameId;
  readonly byId: ReadonlyMap<FrameId, ScopeFrame>;
  readonly exprToFrame: ExprIdMap<FrameId>;
  frameOfExpr(exprId: ExprId | null | undefined): FrameId;
  parentOf(frameId: FrameId | null): FrameId | null;
  ancestorOf(frameId: FrameId | null, depth: number): FrameId | null;
}

/** Normalize frame/expr lookups for a ScopeTemplate (shared by multiple phases). */
export function buildScopeLookup(template: ScopeTemplate): ScopeLookup {
  const byId = new Map<FrameId, ScopeFrame>();
  for (const f of template.frames) byId.set(f.id, f);

  const exprToFrame = toExprIdMap(template.exprToFrame);
  const root = template.root ?? template.frames[0]?.id;
  if (root == null) throw new Error("ScopeTemplate is missing a root frame.");

  const parentOf = (frameId: FrameId | null): FrameId | null => {
    if (frameId == null) return null;
    return byId.get(frameId)?.parent ?? null;
  };

  const ancestorOf = (frameId: FrameId | null, depth: number): FrameId | null => {
    let current = frameId;
    let steps = depth;
    while (steps > 0 && current != null) {
      current = parentOf(current);
      steps -= 1;
    }
    return current ?? null;
  };

  const frameOfExpr = (exprId: ExprId | null | undefined): FrameId => {
    if (!exprId) return root;
    return exprIdMapGet(exprToFrame, exprId) ?? root;
  };

  return { template, frames: template.frames, root, byId, exprToFrame, frameOfExpr, parentOf, ancestorOf };
}
