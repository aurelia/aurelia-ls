import type { ExprId, SourceSpan, NodeId } from "../../../model/ir.js";
import type { FrameId, HydrationId } from "../../../model/identity.js";
import type { LinkedTemplate } from "../../20-resolve-host/types.js";

/** Module-level SSR planning artifact. */
export interface SsrPlanModule {
  version: "aurelia-ssr-plan@0";
  templates: SsrTemplatePlan[];
}

/** Per-template plan. We index by NodeId and expose stable HIDs for HTML markers. */
export interface SsrTemplatePlan {
  name?: string | undefined;
  /** NodeId → HID (hydration id). Assigned only to nodes with dynamic work. */
  hidByNode: Record<NodeId, HydrationId>;
  /** Text nodes with interpolations, (one HID per text node occurrence). */
  textBindings: Array<{
    hid: HydrationId;
    target: NodeId;
    parts: string[];
    exprIds: ExprId[];
    span?: SourceSpan | null;
  }>;
  /** Element/template nodes: static attributes we will actually render. */
  staticAttrsByHid: Record<HydrationId, Record<string, string | null>>;
  /** Dynamic bindings/listeners/refs grouped by HID. */
  bindingsByHid: Record<HydrationId, SsrBinding[]>;
  /** Template controllers (repeat/with/promise/if/switch/portal). */
  controllersByHid: Record<HydrationId, SsrController[]>;
  /** <let> locals on that HID (hosted on the <let> node). */
  letsByHid: Record<HydrationId, { toBindingContext: boolean; locals: Array<{ name: string; exprId: ExprId }> }>;
}

/** Dynamic op variants we care about for SSR/hydration. */
export type SsrBinding =
  | { kind: "prop"; to: string; exprId: ExprId; frame: FrameId; mode: "default" | "oneTime" | "toView" | "fromView" | "twoWay" }
  | { kind: "styleProp"; to: string; exprId: ExprId; frame: FrameId }
  | { kind: "attrInterp"; attr: string; to: string; parts: string[]; exprIds: ExprId[]; frames: FrameId[] }
  | { kind: "attr"; attr: string; to: string; exprId: ExprId; frame: FrameId }
  | { kind: "listener"; name: string; exprId: ExprId; frame: FrameId; capture?: boolean; modifier?: string | null }
  | { kind: "ref"; to: string; exprId: ExprId; frame: FrameId };

/** Controller shape for SSR. We carry nested `def` as another template plan. */
export interface SsrController {
  res: "repeat" | "with" | "promise" | "if" | "switch" | "portal";
  /** `repeat`: header ExprId + optional tail props (future). */
  forOfExprId?: ExprId;
  /** Value controllers: `with`/`promise`/`if`/`switch`/`portal` → value expr id. */
  valueExprId?: ExprId;
  /** switch/case & promise branches for hydration cues. */
  branch?: { kind: "then" | "catch" | "case" | "default"; exprId?: ExprId | null } | null;
  /** Nested view compiled as its own plan. */
  def: SsrTemplatePlan;
  /** Linked template for render-time DOM traversal (not emitted in manifest). */
  defLinked?: LinkedTemplate;
  /** Frame where the controlling expr evaluates. */
  frame: FrameId;
}

/** Compact manifest we emit alongside HTML for "server emits". */
export interface SsrManifest {
  version: "aurelia-ssr-manifest@0";
  /** Expression table: maps ExprId to source code for server-side evaluation. */
  expressions?: Array<{
    id: ExprId;
    code: string; // exact authored expression source
    loc?: SourceSpan | null;
  }>;
  templates: Array<{
    name?: string;
    nodes: Array<{
      hid: HydrationId;
      nodeId: NodeId;
      tag?: string; // when element
      text?: boolean;
      bindings?: SsrBinding[];
      controllers?: Omit<SsrController, "def" | "defLinked">[]; // def is expanded in HTML, not needed here
      lets?: { toBindingContext: boolean; locals: Array<{ name: string; exprId: ExprId }> };
      staticAttrs?: Record<string, string | null>;
    }>;
  }>;
}
