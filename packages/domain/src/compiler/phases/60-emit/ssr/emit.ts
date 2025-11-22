import type { LinkedSemanticsModule, LinkedTemplate, LinkedRow } from "../../20-resolve-host/types.js";
import type { TemplateNode, DOMNode, Attr, NodeId, ExprId } from "../../../model/ir.js";
import { idFromKey, type HydrationId } from "../../../model/identity.js";
import type { SsrPlanModule, SsrTemplatePlan, SsrManifest, SsrBinding, SsrController } from "../../50-plan/ssr/types.js";

/** Emit SSR HTML + JSON manifest. */
export function emitSsr(
  plan: SsrPlanModule,
  linked: LinkedSemanticsModule,
  opts?: { eol?: "\n" | "\r\n" }
): { html: string; manifest: string } {
  const eol = opts?.eol ?? "\n";
  const tPlan = plan.templates[0];
  const tLinked = linked.templates[0];
  if (!tPlan || !tLinked) return { html: "", manifest: JSON.stringify(emptyManifest(), null, 2) };

  const idToRow = indexRows(tLinked);
  const html = renderTemplate(tLinked.dom, tPlan, idToRow, eol).join("");
  const manifest = makeManifest(tPlan, tLinked).join("");

  return { html, manifest };

  function emptyManifest(): SsrManifest {
    return { version: "aurelia-ssr-manifest@0", templates: [] };
  }
}

function indexRows(t: LinkedTemplate): Map<NodeId, LinkedRow> {
  const idToRow: Map<NodeId, LinkedRow> = new Map();
  for (const row of t.rows) idToRow.set(row.target, row);
  return idToRow;
}

/** Render a template's DOM skeleton with markers. */
function renderTemplate(
  dom: TemplateNode,
  plan: SsrTemplatePlan,
  idToRow: Map<NodeId, LinkedRow>,
  eol: string,
): string[] {
  const out: string[] = [];
  for (const child of dom.children) renderNode(child, plan, idToRow, out, eol);
  return out;
}

function renderNode(
  n: DOMNode,
  plan: SsrTemplatePlan,
  idToRow: Map<NodeId, LinkedRow>,
  out: string[],
  eol: string,
): void {
  const nodeKey = n.id;
  const hid = plan.hidByNode[nodeKey] ?? plan.textBindings.find(tb => tb.target === nodeKey)?.hid;

  const row = idToRow.get(nodeKey);
  const ctrls = hid ? plan.controllersByHid[hid] : undefined;

  switch (n.kind) {
    case "element": {
      if (ctrls && ctrls.length) {
        for (const c of ctrls) {
          out.push(`<!--au:ctrl ${hid} ${c.res} start-->${eol}`);
          if (c.defLinked) {
            const nestedRowMap = indexRows(c.defLinked as LinkedTemplate);
            out.push(...renderTemplate((c.defLinked as LinkedTemplate).dom, c.def as SsrTemplatePlan, nestedRowMap, eol));
          } else {
            out.push(`<!--au:ctrl ${hid} ${c.res} def:rendered-by-runtime-->${eol}`);
          }
          out.push(`<!--au:ctrl ${hid} end-->${eol}`);
        }
        return;
      }

      const attrs: string[] = [];
      if (hid) attrs.push(`data-au-hid="${hid}"`);
      const staticOnHid = hid ? plan.staticAttrsByHid[hid] : undefined;
      const staticAttrs = staticOnHid ?? attrsFromDom(n.attrs ?? []);
      for (const [k, v] of Object.entries(staticAttrs)) {
        if (v == null) attrs.push(`${k}`);
        else attrs.push(`${k}="${escapeHtml(String(v))}"`);
      }

      out.push(`<${n.tag}${attrs.length ? " " + attrs.join(" ") : ""}>`);
      for (const c of n.children) renderNode(c, plan, idToRow, out, eol);
      out.push(`</${n.tag}>`);
      return;
    }

    case "text": {
      const tb = plan.textBindings.find(x => x.target === nodeKey);
      if (tb) {
        const tbHid = plan.hidByNode[nodeKey] ?? tb.hid;
        for (let i = 0; i < tb.parts.length; i++) {
          out.push(escapeHtml(tb.parts[i] ?? ""));
          if (i < tb.exprIds.length) {
            const exprId = tb.exprIds[i]!;
            out.push(`<!--au:tb ${tbHid}@${i} expr=${exprId}-->`);
          }
        }
        return;
      }
      out.push(escapeHtml(n.text));
      return;
    }

    case "template": {
      if (ctrls && ctrls.length) {
        for (const c of ctrls) {
          out.push(`<!--au:ctrl ${hid} ${c.res} start-->${eol}`);
          if (c.defLinked) {
            const nestedRowMap = indexRows(c.defLinked as LinkedTemplate);
            out.push(...renderTemplate((c.defLinked as LinkedTemplate).dom, c.def as SsrTemplatePlan, nestedRowMap, eol));
          } else {
            out.push(`<!--au:ctrl ${hid} ${c.res} def:rendered-by-runtime-->${eol}`);
          }
          out.push(`<!--au:ctrl ${hid} end-->${eol}`);
        }
        return;
      }
      for (const c of n.children) renderNode(c, plan, idToRow, out, eol);
      return;
    }

    case "comment": {
      return;
    }
  }
}

/** Build JSON manifest text. */
function makeManifest(tPlan: SsrTemplatePlan, tLinked: LinkedTemplate): string[] {
  const nodes: Array<{
    hid: HydrationId;
    nodeId: NodeId;
    tag?: string;
    text?: boolean;
    staticAttrs?: Record<string, string | null>;
    bindings?: SsrBinding[];
    controllers?: Omit<SsrController, "def" | "defLinked">[];
    lets?: { toBindingContext: boolean; locals: Array<{ name: string; exprId: ExprId }> };
  }> = [];
  const tagByNode = new Map<NodeId, string | undefined>();
  indexDomTags(tLinked.dom, tagByNode);
  for (const ctrls of Object.values(tPlan.controllersByHid)) {
    for (const c of ctrls ?? []) {
      const linked = c.defLinked;
      if (linked) indexDomTags(linked.dom, tagByNode);
    }
  }

  const seen = new Set<HydrationId>();
  for (const [nodeKey, hid] of Object.entries(tPlan.hidByNode)) {
    if (seen.has(hid)) continue;
    seen.add(hid);
    const nodeId = idFromKey<"NodeId">(nodeKey);
    const nodeRecord: {
      hid: HydrationId;
      nodeId: NodeId;
      tag?: string;
      text?: boolean;
      staticAttrs?: Record<string, string | null>;
      bindings?: SsrBinding[];
      controllers?: Omit<SsrController, "def" | "defLinked">[];
      lets?: { toBindingContext: boolean; locals: Array<{ name: string; exprId: ExprId }> };
    } = { hid, nodeId };
    const tag = tagByNode.get(nodeId);
    if (tag) nodeRecord.tag = tag;
    nodeRecord.text = nodeKey.includes("#text");
    const staticAttrs = tPlan.staticAttrsByHid[hid];
    if (staticAttrs) nodeRecord.staticAttrs = staticAttrs;
    const bindings = tPlan.bindingsByHid[hid];
    if (bindings) nodeRecord.bindings = bindings;
    const controllers = tPlan.controllersByHid[hid];
    nodeRecord.controllers = (controllers ?? []).map(stripDef);
    const lets = tPlan.letsByHid[hid];
    if (lets) nodeRecord.lets = lets;
    nodes.push(nodeRecord);
  }
  const manifest = {
    version: "aurelia-ssr-manifest@0",
    templates: [{ name: tPlan.name, nodes }],
  };
  return [JSON.stringify(manifest, null, 2)];

  function stripDef(c: SsrController) {
    const { def, defLinked, ...rest } = c;
    return rest;
  }
}

function indexDomTags(n: DOMNode, out: Map<NodeId, string | undefined>) {
  const tag = n.kind === "element" ? n.tag : undefined;
  out.set(n.id, tag);
  if (n.kind === "element" || n.kind === "template") for (const c of n.children) indexDomTags(c, out);
}

function attrsFromDom(attrs: readonly Attr[]): Record<string, string | null> {
  const out: Record<string, string | null> = Object.create(null);
  for (const a of attrs) out[a.name] = a.value;
  return out;
}

/** Minimal HTML escaper for attribute/text contexts. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
