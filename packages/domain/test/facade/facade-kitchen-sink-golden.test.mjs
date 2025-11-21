import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_SYNTAX, getExpressionParser } from "../../out/index.js";
import { compileMarkup, vmStub } from "../_helpers/facade-harness.mjs";

const fixtureBase = new URL("../../../../fixtures/overlays/kitchen-sink/", import.meta.url);
const goldenPath = new URL("../goldens/facade-kitchen-sink.json", import.meta.url);

function normalizeFacade(compilation, htmlPath) {
  const fixtureRoot = path.dirname(htmlPath).replace(/\\/g, "/");

  const pick = {
    overlay: { overlayPath: compilation.overlay.overlayPath, calls: compilation.overlay.calls },
    overlayPlan: compilation.overlayPlan,
    mapping: compilation.mapping,
    linked: { templates: compilation.linked.templates, diags: compilation.linked.diags },
    ir: compilation.ir,
  };

  return JSON.parse(JSON.stringify(pick, (key, value) => {
    if (typeof value === "string") {
      const posix = value.replace(/\\/g, "/");
      if (posix.includes(fixtureRoot)) {
        return posix.replaceAll(fixtureRoot, "<FIXTURE>");
      }
    }
    return value;
  }));
}

test("facade products match kitchen-sink golden structure", async () => {
  const htmlUrl = new URL("./template.html", fixtureBase);
  const htmlPath = path.resolve(fileURLToPath(htmlUrl));
  const html = await readFile(htmlUrl, "utf8");

  const compilation = compileMarkup(html, htmlPath, {
    vm: vmStub({ getRootVmTypeExpr: () => "any" }),
    attrParser: DEFAULT_SYNTAX,
    exprParser: getExpressionParser(),
  });

  const snapshot = normalizeFacade(compilation, htmlPath);
  const golden = JSON.parse(await readFile(goldenPath, "utf8"));

  assert.deepEqual(snapshot, golden);
});
