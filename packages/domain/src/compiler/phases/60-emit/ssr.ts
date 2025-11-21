import type { LinkedSemanticsModule, LinkedTemplate, LinkedRow } from "../20-resolve-host/types.js";
import type { TemplateNode, DOMNode, Attr } from "../../model/ir.js";
import type { SsrPlanModule, SsrTemplatePlan, SsrManifest, SsrBinding, SsrController } from "../50-plan/ssr-types.js";

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
  const html = renderTemplate(tLinked.dom, tPlan, idToRow, eol, tPlan).join("");
  const manifest = makeManifest(tPlan, tLinked).join("");

  return { html, manifest };

  function emptyManifest(): SsrManifest {
    return { version: "aurelia-ssr-manifest@0", templates: [] };
  }
}

function indexRows(t: LinkedTemplate): Map<string, LinkedRow> {
  const idToRow: Map<string, LinkedRow> = new Map();
  for (const row of t.rows) idToRow.set(row.target as unknown as string, row);
  return idToRow;
}

/** Render a template's DOM skeleton with markers. */
function renderTemplate(
  dom: TemplateNode,
  plan: SsrTemplatePlan,
  idToRow: Map<string, LinkedRow>,
  eol: string,
  planRoot: SsrTemplatePlan,
): string[] {
  const out: string[] = [];
  for (const child of dom.children) renderNode(child, plan, idToRow, out, eol, planRoot);
  return out;
}

function renderNode(
  n: DOMNode,
  plan: SsrTemplatePlan,
  idToRow: Map<string, LinkedRow>,
  out: string[],
  eol: string,
  planRoot: SsrTemplatePlan,
): void {
  const nodeKey = n.id as unknown as string;
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
            out.push(...renderTemplate((c.defLinked as LinkedTemplate).dom, c.def as SsrTemplatePlan, nestedRowMap, eol, planRoot));
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
      for (const c of n.children) renderNode(c, planRoot, idToRow, out, eol, planRoot);
      out.push(`</${n.tag}>`);
      return;
    }

    case "text": {
      const tb = planRoot.textBindings.find(x => x.target === nodeKey);
      if (tb) {
        const tbHid = planRoot.hidByNode[nodeKey] ?? tb.hid;
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
      for (const c of n.children) renderNode(c, planRoot, idToRow, out, eol, planRoot);
      return;
    }

    case "comment": {
      return;
    }
  }
}

/** Build JSON manifest text. */
function makeManifest(tPlan: SsrTemplatePlan, tLinked: LinkedTemplate): string[] {
  const nodes: any[] = [];
  const tagByNode = new Map<string, string>();
  indexDomTags(tLinked.dom, tagByNode);
  for (const ctrls of Object.values(tPlan.controllersByHid)) {
    for (const c of ctrls ?? []) {
      const linked = (c as any).defLinked as LinkedTemplate | undefined;
      if (linked) indexDomTags(linked.dom, tagByNode);
    }
  }

  const seen = new Set<number>();
  for (const [nodeKey, hid] of Object.entries(tPlan.hidByNode)) {
    if (seen.has(hid)) continue;
    seen.add(hid);
    const nodeId = nodeKey as any;
    nodes.push({
      hid,
      nodeId,
      tag: tagByNode.get(nodeKey) ?? undefined,
      text: tagByNode.get(nodeKey) === undefined,
      staticAttrs: tPlan.staticAttrsByHid[hid],
      bindings: tPlan.bindingsByHid[hid],
      controllers: (tPlan.controllersByHid[hid] ?? []).map(stripDef),
      lets: tPlan.letsByHid[hid],
    });
  }
  const manifest = {
    version: "aurelia-ssr-manifest@0",
    templates: [{ name: tPlan.name, nodes }],
  };
  return [JSON.stringify(manifest, null, 2)];

  function stripDef(c: SsrController) {
    const { def, defLinked, ...rest } = c as any;
    return rest;
  }
}

function indexDomTags(n: DOMNode, out: Map<string, string>) {
  out.set(n.id as any, (n as any).tag ?? undefined);
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
