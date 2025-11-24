import type { LinkedSemanticsModule, LinkedTemplate, LinkedRow } from "../../20-resolve-host/types.js";
import type { TemplateNode, DOMNode, Attr, NodeId, ExprId } from "../../../model/ir.js";
import type { SourceSpan } from "../../../model/span.js";
import { idFromKey, type HydrationId } from "../../../model/identity.js";
import type { SsrPlanModule, SsrTemplatePlan, SsrManifest, SsrBinding, SsrController } from "../../50-plan/ssr/types.js";

export interface SsrNodeMapping {
  nodeId: NodeId;
  hid: HydrationId;
  templateSpan: SourceSpan | null;
  htmlSpan?: SourceSpan | null;
  manifestSpan?: SourceSpan | null;
}

export interface SsrEmitResult {
  html: string;
  manifest: string;
  mappings: SsrNodeMapping[];
}

/** Emit SSR HTML + JSON manifest. */
export function emitSsr(
  plan: SsrPlanModule,
  linked: LinkedSemanticsModule,
  opts?: { eol?: "\n" | "\r\n" },
): SsrEmitResult {
  const eol = opts?.eol ?? "\n";
  const tPlan = plan.templates[0];
  const tLinked = linked.templates[0];
  if (!tPlan || !tLinked) return { html: "", manifest: JSON.stringify(emptyManifest(), null, 2), mappings: [] };

  const idToRow = indexRows(tLinked);
  const templateSpans = indexTemplateSpans(tLinked.dom);
  const mappings = new Map<NodeId, MutableMapping>();

  const htmlChunks: string[] = [];
  let htmlOffset = 0;

  const pushHtml = (chunk: string) => {
    htmlChunks.push(chunk);
    htmlOffset += chunk.length;
  };

  for (const child of tLinked.dom.children) renderNode(child, tPlan, idToRow, pushHtml, eol, mappings, templateSpans, () => htmlOffset);

  const html = htmlChunks.join("");
  const manifest = makeManifest(tPlan, tLinked, mappings, templateSpans);

  return { html, manifest, mappings: Array.from(mappings.values()) };

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
function renderNode(
  n: DOMNode,
  plan: SsrTemplatePlan,
  idToRow: Map<NodeId, LinkedRow>,
  push: (chunk: string) => void,
  eol: string,
  mappings: Map<NodeId, MutableMapping>,
  templateSpans: Map<NodeId, SourceSpan | null>,
  currentOffset: () => number,
): void {
  const nodeKey = n.id;
  const hid = plan.hidByNode[nodeKey] ?? plan.textBindings.find(tb => tb.target === nodeKey)?.hid;
  const startOffset = currentOffset();

  const ctrls = hid ? plan.controllersByHid[hid] : undefined;

  switch (n.kind) {
    case "element": {
      if (ctrls && ctrls.length) {
        for (const c of ctrls) {
          push(`<!--au:ctrl ${hid} ${c.res} start-->${eol}`);
          if (c.defLinked) {
            const nestedRowMap = indexRows(c.defLinked as LinkedTemplate);
            for (const child of (c.defLinked as LinkedTemplate).dom.children) {
              renderNode(child, c.def as SsrTemplatePlan, nestedRowMap, push, eol, mappings, templateSpans, currentOffset);
            }
          } else {
            push(`<!--au:ctrl ${hid} ${c.res} def:rendered-by-runtime-->${eol}`);
          }
          push(`<!--au:ctrl ${hid} end-->${eol}`);
        }
        break;
      }

      const attrs: string[] = [];
      if (hid) attrs.push(`data-au-hid="${hid}"`);
      const staticOnHid = hid ? plan.staticAttrsByHid[hid] : undefined;
      const staticAttrs = staticOnHid ?? attrsFromDom(n.attrs ?? []);
      for (const [k, v] of Object.entries(staticAttrs)) {
        if (v == null) attrs.push(`${k}`);
        else attrs.push(`${k}="${escapeHtml(String(v))}"`);
      }

      push(`<${n.tag}${attrs.length ? " " + attrs.join(" ") : ""}>`);
      for (const c of n.children) renderNode(c, plan, idToRow, push, eol, mappings, templateSpans, currentOffset);
      push(`</${n.tag}>`);
      break;
    }

    case "text": {
      const tb = plan.textBindings.find(x => x.target === nodeKey);
      if (tb) {
        const tbHid = plan.hidByNode[nodeKey] ?? tb.hid;
        for (let i = 0; i < tb.parts.length; i++) {
          push(escapeHtml(tb.parts[i] ?? ""));
          if (i < tb.exprIds.length) {
            const exprId = tb.exprIds[i]!;
            push(`<!--au:tb ${tbHid}@${i} expr=${exprId}-->`);
          }
        }
        break;
      }
      push(escapeHtml(n.text));
      break;
    }

    case "template": {
      if (ctrls && ctrls.length) {
        for (const c of ctrls) {
          push(`<!--au:ctrl ${hid} ${c.res} start-->${eol}`);
          if (c.defLinked) {
            const nestedRowMap = indexRows(c.defLinked as LinkedTemplate);
            for (const child of (c.defLinked as LinkedTemplate).dom.children) {
              renderNode(child, c.def as SsrTemplatePlan, nestedRowMap, push, eol, mappings, templateSpans, currentOffset);
            }
          } else {
            push(`<!--au:ctrl ${hid} ${c.res} def:rendered-by-runtime-->${eol}`);
          }
          push(`<!--au:ctrl ${hid} end-->${eol}`);
        }
        break;
      }
      for (const c of n.children) renderNode(c, plan, idToRow, push, eol, mappings, templateSpans, currentOffset);
      break;
    }

    case "comment": {
      break;
    }
  }

  if (hid != null) {
    const endOffset = currentOffset();
    if (endOffset > startOffset) {
      const entry = ensureMapping(mappings, nodeKey, hid, templateSpans);
      entry.htmlSpan = { start: startOffset, end: endOffset };
    }
  }
}

/** Build JSON manifest text. */
function makeManifest(
  tPlan: SsrTemplatePlan,
  tLinked: LinkedTemplate,
  mappings: Map<NodeId, MutableMapping>,
  templateSpans: Map<NodeId, SourceSpan | null>,
): string {
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
  const { text, spans } = buildManifestText(tPlan.name, nodes);
  const hidByNodeId = new Map<NodeId, HydrationId>();
  for (const node of nodes) hidByNodeId.set(node.nodeId, node.hid);
  for (const [nodeId, span] of spans) {
    const hid = hidByNodeId.get(nodeId);
    if (!hid) continue;
    const entry = ensureMapping(mappings, nodeId, hid, templateSpans);
    entry.manifestSpan = span;
  }
  return text;

  function stripDef(c: SsrController) {
    const { def, defLinked, ...rest } = c;
    return rest;
  }
}

function buildManifestText(
  name: string | undefined,
  nodes: Array<{
    hid: HydrationId;
    nodeId: NodeId;
    tag?: string;
    text?: boolean;
    staticAttrs?: Record<string, string | null>;
    bindings?: SsrBinding[];
    controllers?: Omit<SsrController, "def" | "defLinked">[];
    lets?: { toBindingContext: boolean; locals: Array<{ name: string; exprId: ExprId }> };
  }>,
): { text: string; spans: Map<NodeId, SourceSpan> } {
  const parts: string[] = [];
  let offset = 0;
  const spans = new Map<NodeId, SourceSpan>();

  const push = (chunk: string) => {
    parts.push(chunk);
    offset += chunk.length;
  };

  push("{\n");
  push(`  "version": "aurelia-ssr-manifest@0",\n`);
  push(`  "templates": [\n`);
  push("    {\n");
  if (name !== undefined) push(`      "name": ${JSON.stringify(name)},\n`);
  if (nodes.length === 0) {
    push(`      "nodes": []\n`);
    push("    }\n");
    push("  ]\n");
    push("}");
    return { text: parts.join(""), spans };
  }

  push(`      "nodes": [\n`);
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const nodeText = JSON.stringify(node, null, 2);
    const indented = indent(nodeText, "        ");
    const start = offset;
    push(indented);
    push(i < nodes.length - 1 ? ",\n" : "\n");
    const end = offset;
    spans.set(node.nodeId, { start, end });
  }
  push("      ]\n");
  push("    }\n");
  push("  ]\n");
  push("}");

  return { text: parts.join(""), spans };
}

function indexDomTags(n: DOMNode, out: Map<NodeId, string | undefined>) {
  const tag = n.kind === "element" ? n.tag : undefined;
  out.set(n.id, tag);
  if (n.kind === "element" || n.kind === "template") for (const c of n.children) indexDomTags(c, out);
}

function indexTemplateSpans(n: DOMNode, out: Map<NodeId, SourceSpan | null> = new Map()): Map<NodeId, SourceSpan | null> {
  out.set(n.id, n.loc ?? null);
  if (n.kind === "element" || n.kind === "template") for (const c of n.children) indexTemplateSpans(c, out);
  return out;
}

function attrsFromDom(attrs: readonly Attr[]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
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

function indent(text: string, prefix: string): string {
  return text
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

function ensureMapping(
  mappings: Map<NodeId, MutableMapping>,
  nodeId: NodeId,
  hid: HydrationId,
  templateSpans: Map<NodeId, SourceSpan | null>,
): MutableMapping {
  let entry = mappings.get(nodeId);
  if (!entry) {
    entry = { nodeId, hid, templateSpan: templateSpans.get(nodeId) ?? null };
    mappings.set(nodeId, entry);
  } else if (entry.hid !== hid) {
    // Keep the first HID we saw; duplicates only arise if nested plans share a node id (should not happen).
  }
  return entry;
}

interface MutableMapping extends SsrNodeMapping {}
