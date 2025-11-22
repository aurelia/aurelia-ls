import type { LinkedSemanticsModule, LinkedTemplate, LinkedRow, LinkedHydrateTemplateController } from "../../20-resolve-host/types.js";
import type { ScopeModule, ScopeTemplate } from "../../../model/symbols.js";
import type { ExprId, InterpIR, NodeId, BindingSourceIR, ExprRef, TemplateNode } from "../../../model/ir.js";
import { brandNumber, idFromKey, idKey, toExprIdMap, HydrationIdAllocator, type FrameId, type HydrationId } from "../../../model/identity.js";
import { type SsrPlanModule, type SsrTemplatePlan, type SsrBinding, type SsrController } from "./types.js";

/** Build SSR plan from Linked+Scoped (tap point: after Phase 30 bind). */
export function planSsr(linked: LinkedSemanticsModule, scope: ScopeModule): SsrPlanModule {
  const rootLinked: LinkedTemplate | undefined = linked.templates[0];
  if (!rootLinked) return { version: "aurelia-ssr-plan@0", templates: [] };

  // Single ScopeTemplate models the whole module incl. nested defs (see bind.ts).
  const st: ScopeTemplate | undefined = scope.templates[0];
  const exprToFrame = toExprIdMap<FrameId>(st?.exprToFrame);

  // Map raw TemplateIR roots → LinkedTemplate for nested controller defs
  const domToLinked = new WeakMap<TemplateNode, LinkedTemplate>();
  for (const t of linked.templates) domToLinked.set(t.dom, t);

  const hidAllocator = new HydrationIdAllocator(1);
  const plan = buildTemplatePlan(rootLinked, exprToFrame, domToLinked, hidAllocator);
  return { version: "aurelia-ssr-plan@0", templates: [plan] };
}

function buildTemplatePlan(
  t: LinkedTemplate,
  exprToFrame: ReadonlyMap<ExprId, FrameId>,
  domToLinked: WeakMap<TemplateNode, LinkedTemplate>,
  hidAllocator: HydrationIdAllocator,
): SsrTemplatePlan {
  const hidByNode: Record<string, HydrationId> = Object.create(null);
  const bindingsByHid: Record<HydrationId, SsrBinding[]> = Object.create(null);
  const controllersByHid: Record<HydrationId, SsrController[]> = Object.create(null);
  const letsByHid: Record<HydrationId, { toBindingContext: boolean; locals: Array<{ name: string; exprId: ExprId }> }> = Object.create(null);
  const staticAttrsByHid: Record<HydrationId, Record<string, string | null>> = Object.create(null);
  const textBindings: SsrTemplatePlan["textBindings"] = [];

  for (const row of t.rows) {
    const nodeId = row.target;

    let hasDyn = false;
    const staticAttrs: Record<string, string | null> = Object.create(null);
    const rowBindings: SsrBinding[] = [];
    const rowControllers: SsrController[] = [];

    for (const ins of row.instructions) {
      switch (ins.kind) {
        case "textBinding": {
          const inter = ins.from as InterpIR;
          const hid = ensureHid(nodeId, hidByNode, hidAllocator);
          textBindings.push({ hid, target: nodeId, parts: inter.parts, exprIds: inter.exprs.map(e => e.id), span: ins.loc ?? null });
          hasDyn = true;
          break;
        }
        case "attributeBinding": {
          const src = ins.from as BindingSourceIR | InterpIR;
          if (isInterp(src)) {
            const frames = src.exprs.map(e => frameOf(exprToFrame, e.id));
            rowBindings.push({
              kind: "attrInterp",
              attr: ins.attr,
              to: ins.to,
              parts: src.parts,
              exprIds: src.exprs.map(e => e.id),
              frames,
            });
          } else {
            const exprId = exprIdFrom(src);
            if (exprId) {
              rowBindings.push({
                kind: "attr",
                attr: ins.attr,
                to: ins.to,
                exprId,
                frame: frameOf(exprToFrame, exprId),
              });
            }
          }
          hasDyn = true;
          break;
        }
        case "propertyBinding": {
          const exprId = exprIdFrom(ins.from);
          if (exprId) {
            rowBindings.push({ kind: "prop", to: ins.to, exprId, frame: frameOf(exprToFrame, exprId), mode: ins.mode });
            hasDyn = true;
          }
          break;
        }
        case "stylePropertyBinding": {
          const exprId = exprIdFrom(ins.from);
          if (exprId) {
            rowBindings.push({ kind: "styleProp", to: ins.to, exprId, frame: frameOf(exprToFrame, exprId) });
            hasDyn = true;
          }
          break;
        }
        case "listenerBinding": {
          const exprId = ins.from.id;
          rowBindings.push({ kind: "listener", name: ins.to, exprId, frame: frameOf(exprToFrame, exprId), capture: ins.capture ?? false, modifier: ins.modifier ?? null });
          hasDyn = true;
          break;
        }
        case "refBinding": {
          const exprId = ins.from.id;
          rowBindings.push({ kind: "ref", to: ins.to, exprId, frame: frameOf(exprToFrame, exprId) });
          hasDyn = true;
          break;
        }
        case "setAttribute":
          staticAttrs[ins.to] = ins.value;
          break;
        case "setClassAttribute":
          staticAttrs["class"] = ins.value;
          break;
        case "setStyleAttribute":
          staticAttrs["style"] = ins.value;
          break;
        case "setProperty":
          break;
        case "hydrateLetElement": {
          const hid = ensureHid(nodeId, hidByNode, hidAllocator);
          const locals: Array<{ name: string; exprId: ExprId }> = [];
          for (const lb of ins.instructions) {
            const exprId = exprIdFrom(lb.from);
            if (exprId) locals.push({ name: lb.to, exprId });
          }
          letsByHid[hid] = { toBindingContext: ins.toBindingContext, locals };
          hasDyn = true;
          break;
        }
        case "hydrateTemplateController": {
          const hid = ensureHid(nodeId, hidByNode, hidAllocator);
          const ctrl = ins;
          const nestedLinked = domToLinked.get(ctrl.def.dom);
          const nestedPlan = nestedLinked ? buildTemplatePlan(nestedLinked, exprToFrame, domToLinked, hidAllocator) : emptyPlan();

          let forOfExprId: ExprId | undefined;
          let valueExprId: ExprId | undefined;
          for (const p of ctrl.props) {
            if (p.kind === "iteratorBinding") {
              forOfExprId = p.forOf.astId;
            } else if (p.kind === "propertyBinding" && p.to === "value") {
              valueExprId = exprIdFrom(p.from);
            }
          }

          let branch: SsrController["branch"] = null;
          if (ctrl.branch) {
            if (ctrl.branch.kind === "case") {
              branch = { kind: "case", exprId: ctrl.branch.expr.id };
            } else if (ctrl.branch.kind === "then" || ctrl.branch.kind === "catch" || ctrl.branch.kind === "default") {
              branch = { kind: ctrl.branch.kind, exprId: null };
            }
          }

          const controllerEntry: SsrController = {
            res: ctrl.res,
            def: nestedPlan,
            forOfExprId: forOfExprId!,
            valueExprId: valueExprId!,
            branch,
            frame: forOfExprId ? frameOf(exprToFrame, forOfExprId) : valueExprId ? frameOf(exprToFrame, valueExprId) : brandNumber<"FrameId">(0),
          };
          if (nestedLinked) controllerEntry.defLinked = nestedLinked;
          rowControllers.push(controllerEntry);

          mergeChildPlanIntoParent(nestedPlan, {
            hidByNode,
            bindingsByHid,
            controllersByHid,
            letsByHid,
            staticAttrsByHid,
            textBindings,
            prefix: `${hid}:${nodeId}`,
          });
          hasDyn = true;
          break;
        }
        default:
          break;
      }
    }

    if (hasDyn) {
      const hid = ensureHid(nodeId, hidByNode, hidAllocator);
      if (rowBindings.length) (bindingsByHid[hid] ??= []).push(...rowBindings);
      if (rowControllers.length) (controllersByHid[hid] ??= []).push(...rowControllers);
      if (Object.keys(staticAttrs).length) staticAttrsByHid[hid] = staticAttrs;
    } else if (Object.keys(staticAttrs).length) {
      const hid = ensureHid(nodeId, hidByNode, hidAllocator);
      staticAttrsByHid[hid] = staticAttrs;
    }
  }

  return {
    name: t.name,
    hidByNode,
    textBindings,
    bindingsByHid,
    controllersByHid,
    letsByHid,
    staticAttrsByHid,
  };

  function emptyPlan(): SsrTemplatePlan {
    return { name: undefined, hidByNode: {}, textBindings: [], bindingsByHid: {}, controllersByHid: {}, letsByHid: {}, staticAttrsByHid: {} };
  }
}

function mergeChildPlanIntoParent(
  child: SsrTemplatePlan,
  parent: {
    hidByNode: Record<string, HydrationId>;
    bindingsByHid: Record<HydrationId, SsrBinding[]>;
    controllersByHid: Record<HydrationId, SsrController[]>;
    letsByHid: Record<HydrationId, { toBindingContext: boolean; locals: Array<{ name: string; exprId: ExprId }> }>;
    staticAttrsByHid: Record<HydrationId, Record<string, string | null>>;
    textBindings: SsrTemplatePlan["textBindings"];
    prefix: string;
  },
): void {
  const keyMap = new Map<string, string>();

  for (const [nodeKey, hid] of Object.entries(child.hidByNode)) {
    const namespaced = parent.prefix ? `${parent.prefix}|${nodeKey}` : nodeKey;
    parent.hidByNode[namespaced] = hid;
    keyMap.set(nodeKey, namespaced);
  }
  Object.assign(parent.bindingsByHid, child.bindingsByHid);
  Object.assign(parent.controllersByHid, child.controllersByHid);
  Object.assign(parent.letsByHid, child.letsByHid);
  Object.assign(parent.staticAttrsByHid, child.staticAttrsByHid);
  parent.textBindings.push(
    ...child.textBindings.map(tb => ({
      ...tb,
      target: nodeIdFromKey(keyMap.get(nodeKeyFromId(tb.target)) ?? nodeKeyFromId(tb.target)),
    }))
  );
}

function frameOf(map: ReadonlyMap<ExprId, FrameId>, id: ExprId): FrameId {
  return map.get(id) ?? brandNumber<"FrameId">(0);
}

function nodeKeyFromId(id: NodeId): string {
  return idKey(id);
}

function nodeIdFromKey(key: string): NodeId {
  return idFromKey<"NodeId">(key);
}

function exprIdFrom(from: BindingSourceIR): ExprId | undefined {
  if (isInterp(from)) return from.exprs[0]?.id;
  const ref = from as ExprRef | undefined;
  return ref?.id;
}

function isInterp(src: BindingSourceIR): src is InterpIR {
  return (src as InterpIR).kind === "interp";
}

function ensureHid(node: NodeId, map: Record<string, HydrationId>, allocator: HydrationIdAllocator): HydrationId {
  const key = idKey(node);
  let hid = map[key];
  if (hid == null) {
    hid = allocator.allocate();
    map[key] = hid;
  }
  return hid;
}
