import test from "node:test";
import assert from "node:assert/strict";
import { createProgramFromMemory } from "../_helpers/ts-harness.mjs";

// Load compiled domain API (built JS)
const domainIndexUrl = new URL("../../out/index.js", import.meta.url);
const { compileTemplateToOverlay, PRELUDE_TS, getExpressionParser, DEFAULT_SYNTAX } = await import(domainIndexUrl.href);

test("E2E: generates overlay and TS reports property-not-found", () => {
  const html = `<div>\${sdf}</div>`;
  const templateFilePath = "C:/mem/my-app.html"; // only affects overlay filename
  const exprParser = getExpressionParser();
  const attrParser = DEFAULT_SYNTAX;

  // Inline VM type keeps this test independent of module resolution
  const vm = {
    getRootVmTypeExpr: () => `({ message: string })`,
    getSyntheticPrefix: () => "__AU_TTC_",
  };

  const result = compileTemplateToOverlay({
    html,
    templateFilePath,
    isJs: false,
    vm,
    attrParser,
    exprParser,
  });

  // Sanity: one expression, one call
  assert.equal(result.calls.length, 1, "should collect exactly one expression");
  assert.match(result.text, /type __AU_TTC_[A-Za-z0-9_]*T0_F0 =/);
  assert.match(result.text, /__au\$access<[^>]+>\(o => o\.sdf\)/);

  // Program in memory: prelude + overlay only
  const files = {
    "/mem/__prelude.d.ts": PRELUDE_TS,
    "/mem/overlay.ts": result.text,
  };
  const roots = Object.keys(files);

  const { ts, program } = createProgramFromMemory(files, roots);
  const overlaySf = program.getSourceFile("/mem/overlay.ts");
  assert.ok(overlaySf, "overlay source file must exist");

  const diags = ts.getPreEmitDiagnostics(program, overlaySf);
  assert.ok(diags.length > 0, "should have at least one diagnostic");

  const hasPropNotFound = diags.some(d =>
    String(d.messageText).includes("does not exist") &&
    String(d.messageText).includes("sdf")
  );
  assert.ok(hasPropNotFound, "should report 'Property sdf does not exist...'");
});
