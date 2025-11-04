import type { LinkedSemanticsModule, LinkedTemplate, LinkedRow } from "../20-resolve-host/types.js";
import type { TemplateNode, DOMNode } from "../../model/ir.js";
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

  const hidByNode = tPlan.hidByNode;

  // Render HTML skeleton by traversing Linked DOM with row context.
  const idToRow: Map<string, LinkedRow> = new Map();
  for (const row of tLinked.rows) idToRow.set(row.target as unknown as string, row);
  const html = renderTemplate(tLinked.dom, tPlan, idToRow, eol).join("");

  // Assemble manifest
  const manifest = makeManifest(tPlan, tLinked).join("");

  return { html, manifest: manifest };

  function emptyManifest(): SsrManifest {
    return { version: "aurelia-ssr-manifest@0", templates: [] };
  }
}

/** Render a template's DOM skeleton with markers. */
function renderTemplate(
  dom: TemplateNode,
  tPlan: SsrTemplatePlan,
  idToRow: Map<string, LinkedRow>,
  eol: string,
): string[] {
  const out: string[] = [];
  for (const child of dom.children) renderNode(child, tPlan, idToRow, out, eol);
  return out;
}

function renderNode(
  n: DOMNode,
  tPlan: SsrTemplatePlan,
  idToRow: Map<string, LinkedRow>,
  out: string[],
  eol: string,
): void {
  const nodeKey = n.id as unknown as string;
  const hid = tPlan.hidByNode[nodeKey]; // undefined unless dynamic work on this node

  // If the row has template controllers, we render their nested view instead of the authored host
  const row = idToRow.get(nodeKey);
  const ctrls = hid ? tPlan.controllersByHid[hid] : undefined;

  switch (n.kind) {
    case "element": {
      if (ctrls && ctrls.length) {
        // Controller anchoring (no authored element output; expand nested def)
        for (const c of ctrls) {
          out.push(`<!--au:ctrl ${hid} ${c.res} start-->${eol}`);
          // Render nested plan directly (it is a plan, not linked; we need a parallel rendering for nested)
          // We do not have LinkedTemplate for nested in this renderer; but plan carries no DOM.
          // For goldens, we insert a self-descriptive stub to avoid coupling:
          out.push(`<!--au:ctrl ${hid} ${c.res} def:rendered-by-runtime-->${eol}`);
          out.push(`<!--au:ctrl ${hid} end-->${eol}`);
        }
        return;
      }

      // Render normal element with static attributes + data-au-hid
      const attrs: string[] = [];
      if (hid) attrs.push(`data-au-hid="${hid}"`);
      const staticOnHid = hid ? tPlan.staticAttrsByHid[hid] : undefined;
      if (staticOnHid) {
        for (const [k, v] of Object.entries(staticOnHid)) {
          if (v == null) attrs.push(`${k}`);
          else attrs.push(`${k}="${escapeHtml(String(v))}"`);
        }
      }
      // Serialize tag
      out.push(`<${n.tag}${attrs.length ? " " + attrs.join(" ") : ""}>`);

      // Children
      for (const c of n.children) renderNode(c, tPlan, idToRow, out, eol);

      out.push(`</${n.tag}>`);
      return;
    }

    case "text": {
      // Text interpolation marker rewrite when present
      if (hid) {
        const tb = tPlan.textBindings.find(x => x.hid === hid);
        if (tb) {
          for (let i = 0; i < tb.parts.length; i++) {
            out.push(escapeHtml(tb.parts[i] ?? ""));
            if (i < tb.exprIds.length) {
              const exprId = tb.exprIds[i]!;
              out.push(`<!--au:tb ${hid}@${i} expr=${exprId}-->`);
            }
          }
          return;
        }
      }
      // Pure static text
      out.push(escapeHtml(n.text));
      return;
    }

    case "template": {
      // Template node is a fragment container: render children
      for (const c of n.children) renderNode(c, tPlan, idToRow, out, eol);
      return;
    }

    case "comment": {
      // skip authored comments in SSR skeleton
      return;
    }

    default:
      return;
  }
}

/** Build JSON manifest text. */
function makeManifest(tPlan: SsrTemplatePlan, tLinked: LinkedTemplate): string[] {
  const nodes: any[] = [];
  // Index tag name per NodeId for display
  const tagByNode = new Map<string, string>();
  indexDomTags(tLinked.dom, tagByNode);

  const seen = new Set<number>();
  for (const [nodeKey, hid] of Object.entries(tPlan.hidByNode)) {
    if (seen.has(hid)) continue;
    seen.add(hid);
    const nodeId = nodeKey as any;
    nodes.push({
      hid,
      nodeId,
      tag: tagByNode.get(nodeKey) ?? undefined,
      text: tagByNode.get(nodeKey) === undefined, // crude: non-element nodes have no tag
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
    const { def, ...rest } = c;
    return rest;
  }
}

function indexDomTags(n: DOMNode, out: Map<string, string>) {
  out.set(n.id as any, (n as any).tag ?? undefined);
  if (n.kind === "element" || n.kind === "template") for (const c of n.children) indexDomTags(c, out);
}

/** Minimal HTML escaper for attribute/text contexts. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
