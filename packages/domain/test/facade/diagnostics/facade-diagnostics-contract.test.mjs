import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_SYNTAX,
  PRELUDE_TS,
  compileTemplate,
  diagnosticSpan,
  getExpressionParser,
  mapOverlayOffsetToHtml,
} from "../../../out/index.js";
import { vmStub } from "../../_helpers/facade-harness.mjs";
import { createProgramFromMemory } from "../../_helpers/ts-harness.mjs";

const defaultParsers = { attrParser: DEFAULT_SYNTAX, exprParser: getExpressionParser() };

function buildCompileOpts(html, templateFilePath, overrides = {}) {
  return {
    html,
    templateFilePath,
    isJs: false,
    vm: vmStub(),
    ...defaultParsers,
    ...overrides,
  };
}

function compile(html, templateFilePath, overrides = {}) {
  return compileTemplate(buildCompileOpts(html, templateFilePath, overrides));
}

test("diagnostics are aggregated and grouped by source", () => {
  const html = `
      <template>
        <let foo.bind="message"></let>
        <let foo.bind="'again'"></let>
        <div nope.trigger="doIt()"></div>
        <input value.bind="123" />
      </template>
    `;

  const compilation = compile(html, "C:/mem/facade-diags.html");

  const { all, bySource } = compilation.diagnostics;

  const keyedSources = Object.keys(bySource);
  const stageSources = Array.from(new Set(all.map((d) => d.source)));
  assert.deepEqual(keyedSources.sort(), stageSources.sort(), "bySource keys should mirror diagnostic sources");

  const resolveCodes = (bySource["resolve-host"] ?? []).map((d) => d.code);
  assert.ok(resolveCodes.includes("AU1103") || resolveCodes.includes("AU1104"), "resolve-host diags should surface");

  const bindCodes = (bySource.bind ?? []).map((d) => d.code);
  assert.ok(bindCodes.includes("AU1202"), "bind diags should surface");

  const typecheckCodes = (bySource.typecheck ?? []).map((d) => d.code);
  assert.ok(typecheckCodes.includes("AU1301"), "typecheck diags should surface");

  const groupedCount = Object.values(bySource).reduce((sum, diags) => sum + (diags?.length ?? 0), 0);
  assert.equal(groupedCount, all.length, "grouped diagnostic counts should cover the flat list");

  const diagWithSpan = all.find((d) => d.span);
  assert.ok(diagWithSpan?.span?.file, "diagnostics should carry SourceSpan with file id");
  for (const diag of all) {
    if (diag.span?.file !== undefined) {
      assert.ok(String(diag.span.file).includes("/"), "diagnostic span file ids should be normalized");
    }
  }
});

test("diagnostics carry origin traces for resolve-host, bind, and typecheck", () => {
  const html = `
      <template>
        <let foo.bind="1"></let>
        <let foo.bind="2"></let>
        <div nope.trigger="fn()"></div>
        <input value.bind="user.count" />
      </template>
    `;
  const vm = vmStub({ getRootVmTypeExpr: () => "({ user: { count: number, name: string } })" });
  const compilation = compile(html, "C:/mem/facade-origin.html", { vm });

  const resolveDiag = compilation.diagnostics.bySource["resolve-host"]?.find((d) => d.code === "AU1103");
  assert.ok(resolveDiag?.origin?.trace?.some((t) => t.by === "resolve-host"), "resolve-host diag should have origin trace");

  const bindDiag = compilation.diagnostics.bySource.bind?.find((d) => d.code === "AU1202");
  assert.ok(bindDiag?.origin?.trace?.some((t) => t.by === "bind"), "bind diag should have origin trace");

  const typeDiag = compilation.typecheck.diags.find((d) => d.code === "AU1301");
  assert.ok(typeDiag, "expected AU1301 typecheck diagnostic");
  assert.ok(typeDiag?.origin?.trace?.some((t) => t.by === "typecheck"), "typecheck diagnostic should carry origin trace");
});

test("typecheck diagnostics map to mapping entries by exprId and span", () => {
  const html = `<template><input value.bind="user.count" /><div>\${user.name}</div></template>`;
  const vm = vmStub({ getRootVmTypeExpr: () => "({ user: { count: number, name: string } })" });
  const compilation = compile(html, "C:/mem/diag-map.html", { vm });

  const typeDiag = compilation.typecheck.diags.find((d) => d.code === "AU1301");
  assert.ok(typeDiag, "expected AU1301 typecheck diagnostic");
  assert.ok(typeDiag?.exprId, "typecheck diagnostic should carry exprId");
  assert.ok(typeDiag?.span, "typecheck diagnostic should carry span");

  const entry = compilation.mapping.entries.find((e) => e.exprId === typeDiag?.exprId);
  assert.ok(entry, "mapping entry should exist for diagnostic expr");
  assert.deepEqual(
    { start: typeDiag.span?.start, end: typeDiag.span?.end, file: typeDiag.span?.file },
    { start: entry.htmlSpan.start, end: entry.htmlSpan.end, file: entry.htmlSpan.file },
    "diagnostic span should align with mapping html span",
  );
});

test("resolve-host diagnostics preserve authored span in HTML", () => {
  const html = `<template><div badprop.bind="user.count"></div></template>`;
  const compilation = compile(html, "C:/mem/resolve-span.html", {
    vm: vmStub({ getRootVmTypeExpr: () => "({ user: { count: number } })" }),
  });

  const diag = compilation.diagnostics.bySource["resolve-host"]?.find((d) => d.code === "AU1104");
  assert.ok(diag, "expected resolve-host AU1104 diagnostic");
  assert.ok(diag?.span?.file?.includes("resolve-span.html"), "diag span should include authored file id");
  const snippet = html.slice(diag?.span?.start ?? 0, diag?.span?.end ?? 0);
  assert.ok(snippet.includes("badprop"), "diag span should cover offending attribute");
});

test("diagnosticSpan prefers provenance over flat spans", () => {
  const file = "pref.html";
  const diag = {
    code: "AU0000",
    message: "pref check",
    source: "bind",
    severity: "error",
    span: { start: 0, end: 5, file },
    origin: { kind: "authored", span: { start: 10, end: 15, file } },
  };
  const resolved = diagnosticSpan(diag);
  assert.equal(resolved?.start, 10);
  assert.equal(resolved?.end, 15);
});

test("overlay type diagnostics resolve to HTML spans via provenance", () => {
  const html = `<template><input value.bind="user.missing" /></template>`;
  const templatePath = "C:/mem/source-map.html";
  const compilation = compile(html, templatePath, {
    vm: vmStub({ getRootVmTypeExpr: () => "({ user: { name: string } })" }),
  });

  const files = {
    "/mem/__prelude.d.ts": PRELUDE_TS,
    "/mem/overlay.ts": compilation.overlay.text,
  };
  const { ts, program } = createProgramFromMemory(files, Object.keys(files));
  const overlaySf = program.getSourceFile("/mem/overlay.ts");
  assert.ok(overlaySf, "overlay source should exist");

  const diags = ts.getPreEmitDiagnostics(program, overlaySf);
  const missing = diags.find((d) => String(d.messageText).includes("missing"));
  assert.ok(missing && missing.start !== undefined, "expected TS diagnostic for missing property");
  const overlaySpan = {
    start: missing.start,
    end: missing.start + (missing.length ?? 0),
    file: compilation.overlay.overlayPath,
  };

  const mapped = mapOverlayOffsetToHtml(compilation.mapping, overlaySpan.start);
  assert.ok(mapped, "mapping should translate overlay offsets");
  const htmlSpan = mapped.entry.htmlSpan;
  const htmlSnippet = html.slice(htmlSpan.start, htmlSpan.end);
  assert.ok(htmlSnippet.includes("user.missing"), "mapped entry span should cover authored expression");

  const compilerDiag = {
    code: "TS-overlay",
    message: "missing property",
    source: "overlay-emit",
    severity: "error",
    span: overlaySpan,
    origin: { kind: "authored", span: htmlSpan, trace: [{ by: "overlay-emit", span: htmlSpan }] },
  };

  const resolved = diagnosticSpan(compilerDiag);
  assert.deepEqual(resolved, htmlSpan, "diagnosticSpan should favor mapped HTML provenance");
});
