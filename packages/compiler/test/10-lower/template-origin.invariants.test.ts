import { describe, it, expect } from "vitest";

import {
  lowerDocument,
  BUILTIN_SEMANTICS,
  DEFAULT_SYNTAX,
  getExpressionParser,
  DiagnosticsRuntime,
  toSourceFileId,
  prepareProjectSemantics,
  type CustomElementDef,
  type DOMNode,
  type NodeId,
  type TemplateIR,
  type TemplateId,
} from "@aurelia-ls/compiler";
import { deepMergeSemantics } from "../_helpers/semantics-merge.js";

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

function lowerWithSemantics(html: string, sem: typeof BUILTIN_SEMANTICS) {
  const diagnostics = new DiagnosticsRuntime();
  return lowerDocument(html, {
    attrParser: DEFAULT_SYNTAX,
    exprParser: getExpressionParser(),
    file: "test.html",
    name: "test",
    catalog: sem.catalog,
    diagnostics: diagnostics.forSource("lower"),
  });
}

function builtin<T>(value: T) {
  return { origin: "builtin" as const, value };
}

function createElementDef(name: string, shadow: boolean): CustomElementDef {
  return {
    kind: "custom-element",
    className: builtin(name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()).replace(/^./, (c) => c.toUpperCase())),
    name: builtin(name),
    aliases: [],
    containerless: builtin(false),
    shadowOptions: builtin(shadow ? { mode: "open" } : undefined),
    capture: builtin(false),
    processContent: builtin(false),
    boundary: builtin(false),
    bindables: {},
    dependencies: [],
  };
}

function createSemanticsWithElements(elements: CustomElementDef[]) {
  const { resources, bindingCommands, attributePatterns, catalog, ...base } = BUILTIN_SEMANTICS;
  void resources;
  void bindingCommands;
  void attributePatterns;
  void catalog;
  const elementMap: Record<string, CustomElementDef> = {};
  for (const el of elements) {
    const key = el.name.value ?? "";
    if (!key) {
      throw new Error("Custom element definition is missing a name value.");
    }
    elementMap[key] = el;
  }
  const patch = { elements: elementMap };
  const merged = deepMergeSemantics(base, patch);
  return prepareProjectSemantics(merged);
}

function createShadowHostSemantics() {
  const shadowHost = createElementDef("shadow-host", true);
  return createSemanticsWithElements([shadowHost]);
}

function createProjectionHostSemantics() {
  const myCard = createElementDef("my-card", false);
  return createSemanticsWithElements([myCard]);
}

function buildDomMaps(templates: readonly TemplateIR[]): Map<TemplateId, Map<NodeId, DOMNode>> {
  const maps = new Map<TemplateId, Map<NodeId, DOMNode>>();
  for (const template of templates) {
    const domMap = new Map<NodeId, DOMNode>();
    const stack: DOMNode[] = [template.dom];
    while (stack.length) {
      const node = stack.pop()!;
      domMap.set(node.id, node);
      if (node.kind === "element" || node.kind === "template") {
        for (let i = node.children.length - 1; i >= 0; i -= 1) {
          stack.push(node.children[i]!);
        }
      }
    }
    maps.set(template.id, domMap);
  }
  return maps;
}

describe("Template origins invariants", () => {
  it("assigns origin + id for every template and validates host references", () => {
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
    const domMaps = buildDomMaps(templates);

    const expectedKinds = new Set(["root", "controller", "branch", "projection", "synthetic"]);
    for (const kind of expectedKinds) {
      expect(templates.some((t) => t.origin.kind === kind)).toBe(true);
    }

    for (const template of templates) {
      expect(template.id).toBeTruthy();
      expect(template.origin).toBeTruthy();

      switch (template.origin.kind) {
        case "root":
          expect(template.origin.file).toBe(toSourceFileId("test.html"));
          break;
        case "controller": {
          const host = template.origin.host;
          const domMap = domMaps.get(host.templateId);
          expect(domMap).toBeTruthy();
          const hostNode = domMap?.get(host.nodeId);
          expect(hostNode).toBeTruthy();
          expect(hostNode && (hostNode.kind === "element" || hostNode.kind === "template")).toBe(true);
          expect(template.origin.controller.length).toBeGreaterThan(0);
          break;
        }
        case "branch": {
          const host = template.origin.host;
          const domMap = domMaps.get(host.templateId);
          expect(domMap).toBeTruthy();
          const hostNode = domMap?.get(host.nodeId);
          expect(hostNode).toBeTruthy();
          expect(hostNode && (hostNode.kind === "element" || hostNode.kind === "template")).toBe(true);
          expect(["then", "catch", "pending", "case", "default"]).toContain(template.origin.branch);
          break;
        }
        case "projection": {
          const host = template.origin.host;
          const domMap = domMaps.get(host.templateId);
          expect(domMap).toBeTruthy();
          const hostNode = domMap?.get(host.nodeId);
          expect(hostNode?.kind).toBe("element");
          break;
        }
        case "synthetic":
          expect(template.origin.reason.length).toBeGreaterThan(0);
          break;
      }
    }

    const projection = templates.find(
      (t) => t.origin.kind === "projection" && t.origin.slot === "main",
    );
    expect(projection).toBeTruthy();
  });

  it("tracks controller origins for template-hosted controllers", () => {
    const markup = [
      `<template>`,
      `  <template if.bind="cond">`,
      `    <span foo.bind="cond"></span>`,
      `  </template>`,
      `</template>`,
    ].join("\n");

    const ir = lower(markup);
    const templates = ir.templates;
    const domMaps = buildDomMaps(templates);
    const controller = templates.find((t) => t.origin.kind === "controller");
    expect(controller).toBeTruthy();

    if (controller?.origin.kind === "controller") {
      expect(controller.origin.controller).toBe("if");
      const domMap = domMaps.get(controller.origin.host.templateId);
      const hostNode = domMap?.get(controller.origin.host.nodeId);
      expect(hostNode?.kind).toBe("template");
    }
  });

  it("tracks controller origins for switch case/default-case templates", () => {
    const markup = [
      `<template>`,
      `  <div switch.bind="value">`,
      `    <div case.bind="1"><span foo.bind="value"></span></div>`,
      `    <div default-case><span bar.bind="value"></span></div>`,
      `  </div>`,
      `</template>`,
    ].join("\n");

    const ir = lower(markup);
    const controllers = ir.templates.filter((t) => t.origin.kind === "controller");
    const names = controllers.map((t) => (t.origin.kind === "controller" ? t.origin.controller : ""));
    expect(names).toContain("case");
    expect(names).toContain("default-case");
  });

  it("assigns projection origins for shadow-dom elements with au-slot", () => {
    const sem = createShadowHostSemantics();
    const markup = [
      `<shadow-host>`,
      `  <div au-slot="main"><span></span></div>`,
      `  <div>kept</div>`,
      `</shadow-host>`,
    ].join("\n");

    const ir = lowerWithSemantics(markup, sem);
    const projection = ir.templates.find(
      (t) => t.origin.kind === "projection" && t.origin.slot === "main",
    );
    expect(projection).toBeTruthy();

    if (projection?.origin.kind === "projection") {
      const domMaps = buildDomMaps(ir.templates);
      const domMap = domMaps.get(projection.origin.host.templateId);
      const hostNode = domMap?.get(projection.origin.host.nodeId);
      expect(hostNode?.kind).toBe("element");
    }
  });

  it("assigns default + named projection origins (vector LP-01)", () => {
    const sem = createProjectionHostSemantics();
    const markup = `<my-card><input value.bind="query"><template au-slot="header">Hello \${title}</template></my-card>`;
    const ir = lowerWithSemantics(markup, sem);

    const projections = ir.templates.filter((t) => t.origin.kind === "projection");
    const slots = projections.map((t) => (t.origin.kind === "projection" ? t.origin.slot : null));
    expect(slots).toContain("default");
    expect(slots).toContain("header");
  });

  it("tracks branch origins for element and template promise branches", () => {
    const markup = [
      `<template>`,
      `  <div promise.bind="p">`,
      `    <div then="data"><span>\${data}</span></div>`,
      `    <template catch="err"><span>\${err}</span></template>`,
      `  </div>`,
      `</template>`,
    ].join("\n");

    const ir = lower(markup);
    const branches = ir.templates.filter((t) => t.origin.kind === "branch");
    const domMaps = buildDomMaps(ir.templates);

    const elementBranch = branches.find((t) => t.origin.kind === "branch" && t.origin.branch === "then");
    const templateBranch = branches.find((t) => t.origin.kind === "branch" && t.origin.branch === "catch");
    expect(elementBranch).toBeTruthy();
    expect(templateBranch).toBeTruthy();

    if (elementBranch?.origin.kind === "branch") {
      const domMap = domMaps.get(elementBranch.origin.host.templateId);
      const hostNode = domMap?.get(elementBranch.origin.host.nodeId);
      expect(hostNode?.kind).toBe("element");
    }

    if (templateBranch?.origin.kind === "branch") {
      const domMap = domMaps.get(templateBranch.origin.host.templateId);
      const hostNode = domMap?.get(templateBranch.origin.host.nodeId);
      expect(hostNode?.kind).toBe("template");
    }
  });

  it("tracks controller origins inside branch templates (AOT-PR-07)", () => {
    const markup = `<div promise.bind="fetchItems"><template then="items"><ul repeat.for="item of items"><li>\${item}</li></ul></template></div>`;
    const ir = lower(markup);
    const branches = ir.templates.filter((t) => t.origin.kind === "branch");
    const branchIds = new Set(branches.map((t) => t.id));

    const repeat = ir.templates.find(
      (t) => t.origin.kind === "controller" && t.origin.controller === "repeat" && branchIds.has(t.origin.host.templateId),
    );
    expect(repeat).toBeTruthy();
  });
});
