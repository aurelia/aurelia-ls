import path from "node:path";
import { describe, it, expect } from "vitest";

import {
  lowerDocument,
  BUILTIN_SEMANTICS,
  DEFAULT_SYNTAX,
  getExpressionParser,
  DiagnosticsRuntime,
  toSourceFileId,
  type DOMNode,
  type NodeId,
  type TemplateIR,
} from "@aurelia-ls/compiler";

function lower(html: string) {
  const diagnostics = new DiagnosticsRuntime();
  return lowerDocument(html, {
    attrParser: DEFAULT_SYNTAX,
    exprParser: getExpressionParser(),
    file: "test.html",
    name: "test",
    catalog: BUILTIN_SEMANTICS.catalog,
    diagnostics: diagnostics.forSource("lower"),
  });
}

function findNode(root: DOMNode, id: NodeId): DOMNode | null {
  const stack: DOMNode[] = [root];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.id === id) return node;
    if (node.kind === "element" || node.kind === "template") {
      for (let i = node.children.length - 1; i >= 0; i -= 1) {
        stack.push(node.children[i]!);
      }
    }
  }
  return null;
}

function byOrigin(templates: readonly TemplateIR[], kind: TemplateIR["origin"]["kind"]) {
  return templates.filter((t) => t.origin.kind === kind);
}

describe("Template origins", () => {
  it("assigns origins for root, controller, branch, projection, and synthetic templates", () => {
    const expectedFile = toSourceFileId(path.resolve(process.cwd(), "test.html"));
    const markup = [
      `<au-compose>`,
      `  <div au-slot="main">`,
      `    <div if.bind="cond" repeat.for="item of items">`,
      `      <div promise.bind="task">`,
      `        <template then="value"><span>\${value}</span></template>`,
      `        <template catch="err"><span>\${err}</span></template>`,
      `        <template pending><span>Loading</span></template>`,
      `      </div>`,
      `    </div>`,
      `  </div>`,
      `</au-compose>`,
    ].join("\n");

    const ir = lower(markup);
    const templates = ir.templates;

    const root = templates[0]!;
    expect(root.origin.kind).toBe("root");
    if (root.origin.kind === "root") {
      expect(root.origin.file).toBe(expectedFile);
    }

    const kinds = new Set(templates.map((t) => t.origin.kind));
    expect(kinds.has("controller")).toBe(true);
    expect(kinds.has("branch")).toBe(true);
    expect(kinds.has("projection")).toBe(true);
    expect(kinds.has("synthetic")).toBe(true);

    const controller = byOrigin(templates, "controller")[0]!;
    expect(controller.origin.kind).toBe("controller");

    const branch = byOrigin(templates, "branch")[0]!;
    expect(branch.origin.kind).toBe("branch");
    const branchHostTemplate = templates.find((t) => t.id === branch.origin.host.templateId);
    expect(branchHostTemplate).toBeTruthy();
    if (branchHostTemplate) {
      const hostNode = findNode(branchHostTemplate.dom, branch.origin.host.nodeId);
      expect(hostNode?.kind).toBe("template");
    }

    const projection = byOrigin(templates, "projection")[0]!;
    expect(projection.origin.kind).toBe("projection");
    const projectionHostTemplate = templates.find((t) => t.id === projection.origin.host.templateId);
    expect(projectionHostTemplate).toBeTruthy();
    if (projectionHostTemplate) {
      const hostNode = findNode(projectionHostTemplate.dom, projection.origin.host.nodeId);
      expect(hostNode?.kind).toBe("element");
    }

    const synthetic = byOrigin(templates, "synthetic")[0]!;
    expect(synthetic.origin.kind).toBe("synthetic");
    expect(synthetic.origin.reason).toBe("controller-wrapper");
  });
});
