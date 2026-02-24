import { test, expect } from "vitest";

import {
  DefaultTemplateProgram,
} from "@aurelia-ls/compiler";
import { createTestQuery, noopModuleResolver } from "../_helpers/test-utils.js";

function createProgram() {
  return new DefaultTemplateProgram({
    vm: {
      getRootVmTypeExpr() {
        return "TestVm";
      },
      getSyntheticPrefix() {
        return "__AU_TTC_";
      },
    },
    isJs: false,
    query: createTestQuery(),
    moduleResolver: noopModuleResolver,
  });
}

test("nodeAt prefers branch templates for promise branch content", () => {
  const program = createProgram();
  const uri = "/app/branch-origin.html";
  const markup = [
    `<template>`,
    `  <div promise.bind="task">`,
    `    <template then="value">`,
    `      <span foo.bind="value"></span>`,
    `    </template>`,
    `    <template catch="err">`,
    `      <span foo.bind="err"></span>`,
    `    </template>`,
    `  </div>`,
    `</template>`,
  ].join("\n");

  program.upsertTemplate(uri, markup);
  const compilation = program.getCompilation(uri);
  const offset = markup.indexOf("<span foo.bind=\"value\"") + 2;
  const node = compilation.query.nodeAt(offset);
  expect(node).toBeTruthy();

  const template = node ? compilation.ir.templates[node.templateIndex] : null;
  expect(template?.origin.kind).toBe("branch");
  if (template?.origin.kind === "branch") {
    expect(template.origin.branch).toBe("then");
  }
});

test("nodeAt prefers controller templates for stacked controllers", () => {
  const program = createProgram();
  const uri = "/app/controller-origin.html";
  const markup = "<template><div if.bind=\"cond\" repeat.for=\"item of items\" foo.bind=\"item.foo\"></div></template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const offset = markup.indexOf("<div") + 1;
  const node = compilation.query.nodeAt(offset);
  expect(node).toBeTruthy();

  const template = node ? compilation.ir.templates[node.templateIndex] : null;
  expect(template?.origin.kind).toBe("controller");
  if (template?.origin.kind === "controller") {
    expect(template.origin.controller).toBe("repeat");
  }
});

test("nodeAt prefers controller templates for switch case/default-case", () => {
  const program = createProgram();
  const uri = "/app/switch-origin.html";
  const markup = [
    `<template>`,
    `  <div switch.bind="value">`,
    `    <div case.bind="1"><span foo.bind="value"></span></div>`,
    `    <div default-case><span bar.bind="value"></span></div>`,
    `  </div>`,
    `</template>`,
  ].join("\n");
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const caseOffset = markup.indexOf("<span foo.bind=\"value\"") + 2;
  const caseNode = compilation.query.nodeAt(caseOffset);
  expect(caseNode).toBeTruthy();

  const caseTemplate = caseNode ? compilation.ir.templates[caseNode.templateIndex] : null;
  expect(caseTemplate?.origin.kind).toBe("controller");
  if (caseTemplate?.origin.kind === "controller") {
    expect(caseTemplate.origin.controller).toBe("case");
  }

  const defaultOffset = markup.indexOf("<span bar.bind=\"value\"") + 2;
  const defaultNode = compilation.query.nodeAt(defaultOffset);
  expect(defaultNode).toBeTruthy();

  const defaultTemplate = defaultNode ? compilation.ir.templates[defaultNode.templateIndex] : null;
  expect(defaultTemplate?.origin.kind).toBe("controller");
  if (defaultTemplate?.origin.kind === "controller") {
    expect(defaultTemplate.origin.controller).toBe("default-case");
  }
});

test("nodeAt prefers branch templates for element-based promise branches", () => {
  const program = createProgram();
  const uri = "/app/promise-branch-element.html";
  const markup = [
    `<template>`,
    `  <div promise.bind="p">`,
    `    <div then="data"><span foo.bind="data"></span></div>`,
    `  </div>`,
    `</template>`,
  ].join("\n");
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const offset = markup.indexOf("<span foo.bind=\"data\"") + 2;
  const node = compilation.query.nodeAt(offset);
  expect(node).toBeTruthy();

  const template = node ? compilation.ir.templates[node.templateIndex] : null;
  expect(template?.origin.kind).toBe("branch");
  if (template?.origin.kind === "branch") {
    expect(template.origin.branch).toBe("then");
  }
});

test("nodeAt prefers controller templates for template-hosted if", () => {
  const program = createProgram();
  const uri = "/app/template-hosted-if.html";
  const markup = [
    `<template>`,
    `  <template if.bind="cond">`,
    `    <span foo.bind="cond"></span>`,
    `  </template>`,
    `</template>`,
  ].join("\n");
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const offset = markup.indexOf("<span foo.bind=\"cond\"") + 2;
  const node = compilation.query.nodeAt(offset);
  expect(node).toBeTruthy();

  const template = node ? compilation.ir.templates[node.templateIndex] : null;
  expect(template?.origin.kind).toBe("controller");
  if (template?.origin.kind === "controller") {
    expect(template.origin.controller).toBe("if");
  }
});
