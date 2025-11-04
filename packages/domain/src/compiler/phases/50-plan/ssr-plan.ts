import type { LinkedSemanticsModule, LinkedTemplate, LinkedRow, LinkedHydrateTemplateController } from "../20-resolve-host/types.js";
import type { ScopeModule, ScopeTemplate } from "../../model/symbols.js";
import type { ExprId, InterpIR, NodeId } from "../../model/ir.js";
import { type SsrPlanModule, type SsrTemplatePlan, type SsrBinding, type SsrController } from "./ssr-types.js";

/** Build SSR plan from Linked+Scoped (tap point: after Phase 30 bind). */
export function planSsr(linked: LinkedSemanticsModule, scope: ScopeModule): SsrPlanModule {
  const rootLinked: LinkedTemplate | undefined = linked.templates[0];
  if (!rootLinked) return { version: "aurelia-ssr-plan@0", templates: [] };

  // Single ScopeTemplate models the whole module incl. nested defs (see bind.ts).
  const st: ScopeTemplate | undefined = scope.templates[0];
  const exprToFrame = st?.exprToFrame ?? Object.create(null);

  // Map raw TemplateIR roots → LinkedTemplate for nested controller defs
  const domToLinked = new WeakMap<any, LinkedTemplate>();
  for (const t of linked.templates) domToLinked.set(t.dom, t);

  const plan = buildTemplatePlan(rootLinked, exprToFrame, domToLinked);
  return { version: "aurelia-ssr-plan@0", templates: [plan] };
}

function buildTemplatePlan(t: LinkedTemplate, exprToFrame: Record<string, number>, domToLinked: WeakMap<any, LinkedTemplate>): SsrTemplatePlan {
  let hidCounter = 1;
  const hidByNode: Record<string, number> = Object.create(null);
  const bindingsByHid: Record<number, SsrBinding[]> = Object.create(null);
  const controllersByHid: Record<number, SsrController[]> = Object.create(null);
  const letsByHid: Record<number, { toBindingContext: boolean; locals: Array<{ name: string; exprId: ExprId }> }> = Object.create(null);
  const staticAttrsByHid: Record<number, Record<string, string | null>> = Object.create(null);
  const textBindings: SsrTemplatePlan["textBindings"] = [];

  // Collect per-row dynamic/static work and assign HIDs.
  for (const row of t.rows) {
    const nodeId = row.target as NodeId;

    // Classify row: any dynamic?
    let hasDyn = false;
    const staticAttrs: Record<string, string | null> = Object.create(null);
    const rowBindings: SsrBinding[] = [];
    const rowControllers: SsrController[] = [];

    for (const ins of row.instructions) {
      switch (ins.kind) {
        case "textBinding": {
          // Text nodes: one HID per occurrence; expand parts + exprIds from InterpIR
          const inter = ins.from as InterpIR;
          const hid = ensureHid(nodeId, hidByNode, () => hidCounter++);
          textBindings.push({ hid, target: nodeId, parts: inter.parts, exprIds: inter.exprs.map(e => e.id), span: ins.loc ?? null });
          hasDyn = true;
          break;
        }

        case "attributeBinding": {
          // Attribute interpolation → dynamic attr
          const from = ins.from as InterpIR;
          const frames = from.exprs.map(e => frameOf(exprToFrame, e.id));
          rowBindings.push({
            kind: "attrInterp",
            attr: ins.attr,
            to: ins.to,
            parts: from.parts,
            exprIds: from.exprs.map(e => e.id),
            frames,
          });
          hasDyn = true;
          break;
        }

        case "propertyBinding": {
          const exprId = (ins.from as any).id as ExprId;
          rowBindings.push({ kind: "prop", to: ins.to, exprId, frame: frameOf(exprToFrame, exprId), mode: ins.mode });
          hasDyn = true;
          break;
        }

        case "stylePropertyBinding": {
          const exprId = (ins.from as any).id as ExprId;
          rowBindings.push({ kind: "styleProp", to: ins.to, exprId, frame: frameOf(exprToFrame, exprId) });
          hasDyn = true;
          break;
        }

        case "listenerBinding": {
          const exprId = ins.from.id as ExprId;
          rowBindings.push({ kind: "listener", name: ins.to, exprId, frame: frameOf(exprToFrame, exprId), capture: ins.capture ?? false, modifier: ins.modifier ?? null });
          hasDyn = true;
          break;
        }

        case "refBinding": {
          const exprId = ins.from.id as ExprId;
          rowBindings.push({ kind: "ref", to: ins.to, exprId, frame: frameOf(exprToFrame, exprId) });
          hasDyn = true;
          break;
        }

        case "setAttribute": {
          staticAttrs[ins.to] = ins.value;
          break;
        }
        case "setClassAttribute": {
          staticAttrs["class"] = ins.value;
          break;
        }
        case "setStyleAttribute": {
          staticAttrs["style"] = ins.value;
          break;
        }
        case "setProperty":
          // static property set; for SSR HTML we do not serialize DOM prop (non-attr)
          break;

        case "hydrateLetElement": {
          const hid = ensureHid(nodeId, hidByNode, () => hidCounter++);
          const locals: Array<{ name: string; exprId: ExprId }> = [];
          for (const lb of ins.instructions) {
            const from = lb.from as any;
            const exprId: ExprId = from?.id ?? (from?.exprs?.[0]?.id) ?? undefined;
            if (exprId) locals.push({ name: lb.to, exprId });
          }
          letsByHid[hid] = { toBindingContext: ins.toBindingContext, locals };
          hasDyn = true;
          break;
        }

        case "hydrateTemplateController": {
          const hid = ensureHid(nodeId, hidByNode, () => hidCounter++);
          const ctrl = ins as LinkedHydrateTemplateController;
          const nestedLinked = domToLinked.get(ctrl.def.dom);
          const nestedPlan = nestedLinked ? buildTemplatePlan(nestedLinked, exprToFrame, domToLinked) : emptyPlan();

          /** repeat header or value prop */
          let forOfExprId: ExprId | undefined;
          let valueExprId: ExprId | undefined;
          for (const p of ctrl.props) {
            if (p.kind === "iteratorBinding") {
              forOfExprId = p.forOf.astId;
            } else if (p.kind === "propertyBinding" && p.to === "value") {
              valueExprId = (p.from as any).id as ExprId;
            }
          }

          /** branch meta */
          let branch: SsrController["branch"] = null;
          if (ctrl.branch) {
            if (ctrl.branch.kind === "case") {
              branch = { kind: "case", exprId: ctrl.branch.expr.id as ExprId };
            } else {
              branch = { kind: ctrl.branch.kind, exprId: null };
            }
          }

          rowControllers.push({
            res: ctrl.res,
            def: nestedPlan,
            forOfExprId: forOfExprId!,
            valueExprId: valueExprId!,
            branch,
            frame: // controlling expr frame (header/value)
              forOfExprId ? frameOf(exprToFrame, forOfExprId) :
              valueExprId ? frameOf(exprToFrame, valueExprId) : (0 as any),
          });
          hasDyn = true;
          break;
        }

        default:
          // ignore other kinds here
          break;
      }
    }

    if (hasDyn) {
      const hid = ensureHid(nodeId, hidByNode, () => hidCounter++);
      if (rowBindings.length) (bindingsByHid[hid] ??= []).push(...rowBindings);
      if (rowControllers.length) (controllersByHid[hid] ??= []).push(...rowControllers);
      if (Object.keys(staticAttrs).length) staticAttrsByHid[hid] = staticAttrs;
    } else if (Object.keys(staticAttrs).length) {
      // purely static row – we don't assign a HID; emitter will still use these attrs via NodeId lookup when some *other* dyn op on same node gives it a HID.
      // (No-op here.)
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

function frameOf(map: Record<string, number>, id: ExprId): number {
  const f = map[id as unknown as string];
  return typeof f === "number" ? f : 0;
}
function ensureHid(node: NodeId, memo: Record<string, number>, next: () => number): number {
  const k = node as unknown as string;
  let v = memo[k];
  if (!v) { v = next(); memo[k] = v; }
  return v;
}
