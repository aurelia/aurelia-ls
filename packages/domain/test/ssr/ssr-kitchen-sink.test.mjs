import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compileTemplateToSSR, getExpressionParser, DEFAULT_SYNTAX } from "../../out/index.js";

const fixtureBase = new URL("../../../../fixtures/overlays/kitchen-sink/", import.meta.url);
const htmlUrl = new URL("./template.html", fixtureBase);
const ssrHtmlUrl = new URL("./template.__au.ssr.html", fixtureBase);
const ssrManifestUrl = new URL("./template.__au.ssr.json", fixtureBase);

const VM = {
  getRootVmTypeExpr: () => "any",
  getSyntheticPrefix: () => "__AU_TTC_",
};

test("ssr golden - kitchen sink", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const expectedHtml = await readFile(ssrHtmlUrl, "utf8");
  const expectedManifest = await readFile(ssrManifestUrl, "utf8");

  const res = compileTemplateToSSR({
    html,
    templateFilePath: path.resolve(fileURLToPath(htmlUrl)),
    isJs: false,
    vm: VM,
    attrParser: DEFAULT_SYNTAX,
    exprParser: getExpressionParser(),
  });

  assert.ok(res.htmlPath.endsWith("template.__au.ssr.html"));
  assert.ok(res.manifestPath.endsWith("template.__au.ssr.json"));
  assert.strictEqual(res.htmlText, expectedHtml);
  assert.strictEqual(res.manifestText, expectedManifest);
});
