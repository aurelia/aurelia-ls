import test from "node:test";
import assert from "node:assert/strict";

import { getExpressionParser, DEFAULT_SYNTAX, PRELUDE_TS } from "../../out/index.js";
import { compileMarkup, vmStub } from "../_helpers/facade-harness.mjs";
import { createProgramFromMemory } from "../_helpers/ts-harness.mjs";

test("overlay produces TS diagnostics mapped from __au$access", () => {
  const html = `<div>\${sdf}</div>`;
  const templateFilePath = "C:/mem/my-app.html";
  const exprParser = getExpressionParser();
  const attrParser = DEFAULT_SYNTAX;

  const vm = vmStub({ getRootVmTypeExpr: () => `({ message: string })` });

  const { overlay } = compileMarkup(html, templateFilePath, {
    isJs: false,
    vm,
    attrParser,
    exprParser,
  });

  assert.equal(overlay.calls.length, 1, "should collect exactly one expression");
  assert.match(overlay.text, /type __AU_TTC_[A-Za-z0-9_]*T0_F0 =/);
  assert.match(overlay.text, /__au\$access<[^>]+>\(o => o\.sdf\)/);

  const files = {
    "/mem/__prelude.d.ts": PRELUDE_TS,
    "/mem/overlay.ts": overlay.text,
  };
  const roots = Object.keys(files);

  const { ts, program } = createProgramFromMemory(files, roots);
  const overlaySf = program.getSourceFile("/mem/overlay.ts");
  assert.ok(overlaySf, "overlay source file must exist");

  const diags = ts.getPreEmitDiagnostics(program, overlaySf);
  assert.ok(diags.length > 0, "should have at least one diagnostic");

  const hasPropNotFound = diags.some((d) =>
    String(d.messageText).includes("does not exist") &&
    String(d.messageText).includes("sdf")
  );
  assert.ok(hasPropNotFound, "should report 'Property sdf does not exist...'");
});
