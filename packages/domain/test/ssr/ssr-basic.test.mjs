import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { compileTemplateToSSR, getExpressionParser, DEFAULT_SYNTAX } from "../../out/index.js";

const VM = {
  getRootVmTypeExpr: () => "MyApp",
  getSyntheticPrefix: () => "__AU_TTC_",
};

test("SSR basic – markers and manifest shape", async () => {
  const html = await readFile(new URL("../../../../fixtures/ssr-basic/src/my-app.html", import.meta.url), "utf8");
  const res = compileTemplateToSSR({
    html,
    templateFilePath: "/abs/fixtures/ssr-basic/src/my-app.html",
    isJs: false,
    vm: VM,
    attrParser: DEFAULT_SYNTAX,
    exprParser: getExpressionParser(),
    overlayBaseName: "my-app"
  });

  // HTML goldens: contains HIDs and text-binding markers
  assert.ok(res.htmlText.includes('data-au-hid="'), "should mark dynamic hosts with data-au-hid");
  assert.ok(res.htmlText.includes("<!--au:tb "), "should insert text-binding markers");

  // Manifest is parsable and lists nodes
  const manifest = JSON.parse(res.manifestText);
  assert.strictEqual(manifest.version, "aurelia-ssr-manifest@0");
  assert.ok(Array.isArray(manifest.templates) && manifest.templates.length === 1);
  assert.ok(Array.isArray(manifest.templates[0].nodes) && manifest.templates[0].nodes.length > 0);

  // Sanity: at least one listener binding present for @input
  const anyNode = manifest.templates[0].nodes.find(n => Array.isArray(n.bindings));
  const listeners = manifest.templates[0].nodes.flatMap(n => (n.bindings ?? []).filter(b => b.kind === "listener"));
  assert.ok(listeners.length >= 1, "should surface listener bindings in manifest");
});
