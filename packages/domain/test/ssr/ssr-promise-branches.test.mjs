import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { compileTemplateToSSR, getExpressionParser, DEFAULT_SYNTAX } from "../../out/index.js";

const VM = {
  getRootVmTypeExpr: () => "PromiseBranchesVm",
  getSyntheticPrefix: () => "__AU_TTC_",
};

test("SSR promise branches on element host include host + branches", () => {
  const html = `<template>
  <div promise.bind="task">
    <span then>done \${value}</span>
    <span catch>err \${error}</span>
    <span pending>pending</span>
  </div>
</template>`;
  const res = compileTemplateToSSR({
    html,
    templateFilePath: path.resolve("inline-promise-branches.html"),
    isJs: false,
    vm: VM,
    attrParser: DEFAULT_SYNTAX,
    exprParser: getExpressionParser(),
  });

  // HTML should render the host and both branch blocks with controller markers
  assert.ok(res.htmlText.includes("data-au-hid"), "host should be marked with HID");
  assert.ok(res.htmlText.includes("<!--au:ctrl") && res.htmlText.includes("promise start"), "promise markers should render");
  assert.ok(res.htmlText.includes("then") && res.htmlText.includes("catch"), "then/catch blocks should be present");

  const manifest = JSON.parse(res.manifestText);
  const nodes = manifest.templates[0].nodes;
  const ctrls = nodes.flatMap(n => n.controllers ?? []).filter(c => c.res === "promise");

  // Expect three promise controller entries: root + then + catch
  assert.ok(ctrls.length >= 3, "promise controllers should include root + then + catch");
  const branchKinds = new Set(ctrls.map(c => c.branch?.kind ?? "root"));
  assert.ok(branchKinds.has("then") && branchKinds.has("catch") && branchKinds.has("root"), "branch kinds should cover root/then/catch");

  // Namespaced nodeIds should be unique to avoid collisions across nested plans
  const nodeIds = new Set(nodes.map(n => n.nodeId));
  assert.strictEqual(nodeIds.size, nodes.length, "nodeIds should be unique (namespaced)");
});
