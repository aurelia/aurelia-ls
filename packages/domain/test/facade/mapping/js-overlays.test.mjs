import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_SYNTAX, getExpressionParser } from "../../../out/index.js";
import { compileMarkup, vmStub } from "../../_helpers/facade-harness.mjs";

test("JS overlays still surface mapping with member segments", () => {
  const html = `<template><div>\${user?.profile?.name}</div></template>`;

  const compilation = compileMarkup(html, "C:/mem/js-template.js", {
    isJs: true,
    vm: vmStub({ getRootVmTypeExpr: () => "({ user?: { profile?: { name: string } } })" }),
    attrParser: DEFAULT_SYNTAX,
    exprParser: getExpressionParser(),
  });

  assert.ok(compilation.overlay.overlayPath.endsWith(".js"), "overlay path should honor JS input");
  assert.equal(
    compilation.overlay.calls.length,
    compilation.mapping.entries.length,
    "calls and mapping entries should align"
  );

  const entry = compilation.mapping.entries.find((m) => m.segments?.some((s) => s.path.endsWith("profile.name")));
  assert.ok(entry, "expected mapping entry with member segments for optional chain");

  const member = entry?.segments?.find((s) => s.path.endsWith("profile.name"));
  assert.ok(member?.overlaySpan.end > member?.overlaySpan.start, "member overlay span should be non-empty");
  assert.ok(member?.htmlSpan.end > member?.htmlSpan.start, "member html span should be non-empty");
});
