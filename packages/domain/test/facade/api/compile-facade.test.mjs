import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  DEFAULT_SYNTAX,
  compileTemplate,
  compileTemplateToOverlay,
  compileTemplateToSSR,
  getExpressionParser,
} from "../../../out/index.js";
import { vmStub } from "../../_helpers/facade-harness.mjs";

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

function compileOverlay(html, templateFilePath, overrides = {}) {
  return compileTemplateToOverlay(buildCompileOpts(html, templateFilePath, overrides));
}

function compileSsr(html, templateFilePath, overrides = {}) {
  return compileTemplateToSSR(buildCompileOpts(html, templateFilePath, overrides));
}

test("compileTemplateToOverlay exposes overlay + mapping aligned to calls", () => {
  const html = `<template>\${msg}</template>`;
  const overlay = compileOverlay(html, "C:/mem/overlay-only.html");

  assert.ok(overlay.mapping, "overlay facade should surface mapping");
  assert.equal(overlay.calls.length, overlay.mapping?.entries.length);
  const call = overlay.calls[0];
  const entry = overlay.mapping?.entries.find((e) => e.exprId === call.exprId);
  assert.ok(entry, "mapping should align with calls by exprId");
  assert.ok(entry?.htmlSpan.file?.includes("overlay-only.html"));
  assert.equal(entry?.overlaySpan.start, call.overlayStart, "overlay span start should match call");
  assert.equal(entry?.overlaySpan.end, call.overlayEnd, "overlay span end should match call");
  assert.deepEqual(entry?.htmlSpan, call.htmlSpan, "html span should stay consistent between mapping and calls");
});

test("compileTemplate and compileTemplateToOverlay stay aligned on overlay text and mapping", () => {
  const html = `<template>\${msg}</template>`;
  const templatePath = "C:/mem/overlay-align.html";

  const compilation = compile(html, templatePath);

  const overlayOnly = compileOverlay(html, templatePath);

  assert.equal(overlayOnly.text, compilation.overlay.text, "overlay text should match across facades");
  assert.equal(overlayOnly.overlayPath, compilation.overlay.overlayPath, "overlay path should match across facades");
  assert.ok(overlayOnly.mapping, "overlay-only facade should include mapping");
  assert.equal(overlayOnly.mapping?.entries.length, compilation.mapping.entries.length, "mapping entry counts should match");
  assert.deepEqual(
    overlayOnly.mapping?.entries.map((e) => e.exprId),
    compilation.mapping.entries.map((e) => e.exprId),
    "exprIds should stay aligned across facades",
  );
});

test("compileTemplate honors overlayBaseName overrides", () => {
  const html = `<div>\${user.name}</div>`;
  const res = compile(html, "C:/mem/base-name.html", { overlayBaseName: "my.overlay" });
  assert.ok(res.overlay.overlayPath.endsWith("my.overlay.ts"));
});

test("compileTemplateToSSR honors custom base names", () => {
  const res = compileSsr(
    `<template>\${msg}</template>`,
    "C:/mem/custom-ssr.html",
    { overlayBaseName: "custom-output.ssr" },
  );

  assert.ok(res.htmlPath.endsWith("custom-output.html"));
  assert.ok(res.manifestPath.endsWith("custom-output.json"));
  assert.ok(res.plan.templates?.length ?? 0);
  assert.ok(res.htmlText.length > 0);
  assert.ok(res.manifestText.length > 0);

  const manifest = JSON.parse(res.manifestText);
  assert.ok(manifest.templates?.[0], "manifest should include at least one template entry");
  assert.equal(manifest.templates[0].name, "custom-ssr.html", "manifest template name should reflect input template");
  assert.equal(
    res.plan.templates?.[0]?.name,
    manifest.templates[0].name,
    "plan templates and manifest templates should stay aligned",
  );
});

test("compileTemplateToSSR derives default base names from template path", () => {
  const templatePath = path.join(process.cwd(), "tmp", "facade-ssr-default.html");
  const res = compileSsr(`<template>\${msg}</template>`, templatePath);

  assert.ok(res.htmlPath.endsWith("facade-ssr-default.__au.ssr.html"));
  assert.ok(res.manifestPath.endsWith("facade-ssr-default.__au.ssr.json"));

  const manifest = JSON.parse(res.manifestText);
  assert.ok(manifest.templates?.[0], "manifest should list templates for default base name");
  assert.equal(manifest.templates[0].name, "facade-ssr-default.html");
});

test.todo("facade SSR compilation should surface overlay/mapping parity for multiple templates");
