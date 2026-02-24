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

test("nodeAt prefers controller-derived templates for element bindings", () => {
  const program = createProgram();
  const uri = "/app/controller-node-at.html";
  const markup = "<template><div if.bind=\"cond\" repeat.for=\"item of items\" foo.bind=\"item.foo\"></div></template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const offset = markup.indexOf("<div") + 1;
  const node = compilation.query.nodeAt(offset);
  expect(node).toBeTruthy();

  const bindables = node ? compilation.query.bindablesFor(node) : null;
  const names = bindables?.map((b) => b.name) ?? [];
  expect(names).toContain("foo");
  expect(node?.templateIndex).toBeGreaterThan(0);
});
