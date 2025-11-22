import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTemplateToSSR, getExpressionParser, DEFAULT_SYNTAX } from "../../out/index.js";

const VM = {
  getRootVmTypeExpr: () => "NestedVm",
  getSyntheticPrefix: () => "__AU_TTC_",
};

test("SSR nested controllers - goldens", async () => {
  const fixtureBase = new URL("../../../../fixtures/ssr/nested/", import.meta.url);
  const htmlUrl = new URL("./template.html", fixtureBase);
  const expectedHtmlUrl = new URL("./template.__au.ssr.html", fixtureBase);
  const expectedManifestUrl = new URL("./template.__au.ssr.json", fixtureBase);

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

  assert.strictEqual(res.htmlText, expectedHtml);
  assert.strictEqual(res.manifestText, expectedManifest);
});
