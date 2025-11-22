import test from "node:test";
import assert from "node:assert/strict";

import { compileMarkup, vmStub } from "../../_helpers/facade-harness.mjs";
import { createProgramFromMemory } from "../../_helpers/ts-harness.mjs";
import { PRELUDE_TS } from "../../../out/index.js";

test("TS diagnostics map back to HTML spans via mapping artifact", () => {
  const html = `<template><input value.bind="user.name" /><input value.bind="missing" /></template>`;
  const vm = vmStub({ getRootVmTypeExpr: () => "({ user: { name: string } })" });
  const compilation = compileMarkup(html, "C:/mem/ts-ls.html", { vm });
  const overlayPath = "/mem/overlay.ts";

  const files = {
    "/mem/__prelude.d.ts": PRELUDE_TS,
    [overlayPath]: compilation.overlay.text,
  };

  const { ts, program } = createProgramFromMemory(files, Object.keys(files));
  const overlaySf = program.getSourceFile(overlayPath);
  assert.ok(overlaySf, "overlay source should exist");

  const diags = ts.getPreEmitDiagnostics(program, overlaySf);
  assert.ok(diags.length > 0, "expected at least one diagnostic");

  const missingDiag = diags.find((d) => String(d.messageText).includes("missing"));
  assert.ok(missingDiag?.start !== undefined, "should find diagnostic for 'missing'");

  const hit = compilation.mapping.entries.find(
    (m) => missingDiag.start >= m.overlaySpan.start && missingDiag.start <= m.overlaySpan.end
  );
  assert.ok(hit, "diagnostic should map to a mapping entry");

  const htmlOffset = html.indexOf("missing");
  assert.ok(htmlOffset >= 0, "fixture should contain 'missing'");
  assert.ok(hit.htmlSpan.start <= htmlOffset && hit.htmlSpan.end >= htmlOffset, "html span should cover missing expr");
  const overlayCall = compilation.overlay.calls.find((c) =>
    htmlOffset >= c.htmlSpan.start && htmlOffset <= c.htmlSpan.end
  );
  assert.equal(hit.exprId, overlayCall?.exprId, "mapping should align with overlay call html span");
});

test("multiple TS diagnostics map back to distinct HTML spans", () => {
  const html = `<template><input value.bind="a.missing" /><input value.bind="b.missingToo" /></template>`;
  const vm = vmStub({ getRootVmTypeExpr: () => "({ a: { missing: number }, b: {} })" });
  const compilation = compileMarkup(html, "C:/mem/ts-ls-multi.html", { vm });
  const files = {
    "/mem/__prelude.d.ts": PRELUDE_TS,
    "/mem/overlay.ts": compilation.overlay.text,
  };
  const { ts, program } = createProgramFromMemory(files, Object.keys(files));
  const diags = ts.getPreEmitDiagnostics(program);
  const misses = diags.filter((d) => String(d.messageText).includes("missing"));
  assert.ok(misses.length >= 1, "expected diagnostics for missing properties");
  for (const d of misses) {
    const hit = compilation.mapping.entries.find(
      (m) => d.start !== undefined && d.start >= m.overlaySpan.start && d.start <= m.overlaySpan.end
    );
    assert.ok(hit, "diagnostic should map to html");
    const htmlSlice = html.slice(hit.htmlSpan.start, hit.htmlSpan.end);
    assert.ok(htmlSlice.includes("missing"), "html slice should include offending identifier");
  }
});
