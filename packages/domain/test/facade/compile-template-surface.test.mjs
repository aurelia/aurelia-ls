import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getExpressionParser, DEFAULT_SYNTAX } from "../../out/index.js";
import { compileMarkup, vmStub } from "../_helpers/facade-harness.mjs";

const fixtureBase = new URL("../../../../fixtures/overlays/kitchen-sink/", import.meta.url);

test("compileTemplate wires the full pipeline and matches golden overlay", async () => {
  const htmlUrl = new URL("./template.html", fixtureBase);
  const overlayUrl = new URL("./template.__au.ttc.overlay.ts", fixtureBase);
  const htmlPath = path.resolve(fileURLToPath(htmlUrl));

  const html = await readFile(htmlUrl, "utf8");
  const expectedOverlay = await readFile(overlayUrl, "utf8");

  const result = compileMarkup(html, htmlPath, {
    vm: vmStub({ getRootVmTypeExpr: () => "any" }),
    attrParser: DEFAULT_SYNTAX,
    exprParser: getExpressionParser(),
  });

  assert.ok(result.overlay.overlayPath.endsWith("template.__au.ttc.overlay.ts"));
  assert.strictEqual(result.overlay.text, expectedOverlay, "overlay text should match golden");
  assert.ok(result.overlayPlan.templates.length > 0, "plan should include templates");
  assert.ok(result.mapping.entries.length > 0, "mapping should be produced");
  assert.equal(result.mapping.entries.length, result.overlay.calls.length, "calls and mapping entries should align");

  const firstSegmented = result.mapping.entries.find((e) => e.segments?.length);
  assert.ok(firstSegmented, "expected at least one mapping entry with segments");
  const seg = firstSegmented.segments?.[0];
  assert.ok(seg?.overlaySpan.end > seg?.overlaySpan.start, "segment overlay span must be non-empty");
  const snippet = result.overlay.text.slice(seg.overlaySpan.start, seg.overlaySpan.end);
  assert.ok(snippet.length > 0, "segment slice should produce text");
});

test("overlay filename respects overlayBaseName override", () => {
  const html = `<div>\${msg}</div>`;
  const res = compileMarkup(html, "C:/mem/override.html", {
    overlayBaseName: "custom.overlay",
    vm: vmStub(),
  });
  assert.ok(res.overlay.overlayPath.endsWith("custom.overlay.ts"));
});
