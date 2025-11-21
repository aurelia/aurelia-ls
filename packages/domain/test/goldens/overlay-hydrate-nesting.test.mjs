import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compileTemplateToOverlay, getExpressionParser, DEFAULT_SYNTAX } from "../../out/index.js";

const fixtureBase = new URL("../../../../fixtures/overlays/hydrate-nesting/", import.meta.url);
const htmlUrl = new URL("./template.html", fixtureBase);
const overlayUrl = new URL("./template.__au.ttc.overlay.ts", fixtureBase);

const VM = {
  getRootVmTypeExpr: () => "AppVm",
  getSyntheticPrefix: () => "__AU_TTC_",
};

test("overlay golden - hydrate nesting", async () => {
  const html = await readFile(htmlUrl, "utf8");
  const expectedOverlay = await readFile(overlayUrl, "utf8");

  const res = compileTemplateToOverlay({
    html,
    templateFilePath: path.resolve(fileURLToPath(htmlUrl)),
    isJs: false,
    vm: VM,
    attrParser: DEFAULT_SYNTAX,
    exprParser: getExpressionParser(),
  });

  assert.ok(res.overlayPath.endsWith("template.__au.ttc.overlay.ts"));
  assert.strictEqual(res.text, expectedOverlay);
});
