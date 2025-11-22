import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTemplateToSSR, getExpressionParser, DEFAULT_SYNTAX } from "../../out/index.js";

const VM = {
  getRootVmTypeExpr: () => "MyApp",
  getSyntheticPrefix: () => "__AU_TTC_",
};

test("SSR basic - markers and manifest shape", async () => {
  const fixtureBase = new URL("../../../../fixtures/ssr/basic/src/", import.meta.url);
  const htmlUrl = new URL("./my-app.html", fixtureBase);
  const expectedHtmlUrl = new URL("./my-app.__au.ssr.html", fixtureBase);
  const expectedManifestUrl = new URL("./my-app.__au.ssr.json", fixtureBase);

  const html = await readFile(htmlUrl, "utf8");
  const expectedHtml = await readFile(expectedHtmlUrl, "utf8");
  const expectedManifest = await readFile(expectedManifestUrl, "utf8");
  const res = compileTemplateToSSR({
    html,
    templateFilePath: path.resolve(fileURLToPath(htmlUrl)),
    isJs: false,
    vm: VM,
    attrParser: DEFAULT_SYNTAX,
    exprParser: getExpressionParser(),
  });

  // Goldens: output equality + path expectations
  const absHtmlPath = path.resolve(fileURLToPath(expectedHtmlUrl));
  const absManifestPath = path.resolve(fileURLToPath(expectedManifestUrl));
  assert.strictEqual(res.htmlPath, absHtmlPath);
  assert.strictEqual(res.manifestPath, absManifestPath);
  assert.strictEqual(res.htmlText, expectedHtml);
  assert.strictEqual(res.manifestText, expectedManifest);

  // HTML goldens: contains HIDs and text-binding markers
  assert.ok(res.htmlText.includes('data-au-hid="'), "should mark dynamic hosts with data-au-hid");
  assert.ok(res.htmlText.includes("<!--au:tb "), "should insert text-binding markers");

  // Manifest is parsable and lists nodes
  const manifest = JSON.parse(res.manifestText);
  assert.strictEqual(manifest.version, "aurelia-ssr-manifest@0");
  assert.ok(Array.isArray(manifest.templates) && manifest.templates.length === 1);
  assert.ok(Array.isArray(manifest.templates[0].nodes) && manifest.templates[0].nodes.length > 0);

  // Sanity: at least one listener binding present for @input
  const listeners = manifest.templates[0].nodes.flatMap(n => (n.bindings ?? []).filter(b => b.kind === "listener"));
  assert.ok(listeners.length >= 1, "should surface listener bindings in manifest");
});
