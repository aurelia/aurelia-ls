import { runVectorTests, getDirname, lowerOpts } from "../../_helpers/vector-runner.mjs";

import { lowerDocument, resolveHost, bindScopes, planOverlay, emitOverlay } from "../../../out/compiler/index.js";

runVectorTests({
  dirname: getDirname(import.meta.url),
  suiteName: "Emit Overlay (60)",
  execute: (v, ctx) => {
    const ir = lowerDocument(v.markup, lowerOpts(ctx));
    const linked = resolveHost(ir, ctx.sem);
    const scope = bindScopes(linked);
    const plan = planOverlay(linked, scope, { isJs: false, vm: mockVm() });
    const emit = emitOverlay(plan, { isJs: false });
    return reduceEmitIntent(emit, v.expect);
  },
  compare: compareEmitIntent,
  categories: ["mapping", "textIncludes"],
  normalizeExpect: (expect) => ({
    mapping: expect?.mapping,
    textIncludes: expect?.textIncludes ?? [],
  }),
});

// --- Helpers ---

function mockVm() {
  return {
    getRootVmTypeExpr() {
      return "RootVm";
    },
    getSyntheticPrefix() {
      return "__AU_TTC_";
    },
  };
}

// --- Intent Reduction ---

function reduceEmitIntent(emit, expectHints) {
  return {
    mappingCount: emit.mapping.length,
    textIncludes: (expectHints?.textIncludes ?? []).filter((snippet) => emit.text.includes(snippet)),
    text: emit.text,
  };
}

// --- Intent Comparison ---

function compareEmitIntent(actual, expected) {
  const missingMapping = [];
  const extraMapping = [];
  const missingTextIncludes = [];
  const extraTextIncludes = [];

  // Check mapping count if specified
  if (expected.mapping != null && actual.mappingCount !== expected.mapping) {
    missingMapping.push(`expected ${expected.mapping} mappings, got ${actual.mappingCount}`);
  }

  // Check text includes
  for (const snippet of expected.textIncludes ?? []) {
    if (!actual.textIncludes.includes(snippet)) {
      missingTextIncludes.push(snippet);
    }
  }

  return { missingMapping, extraMapping, missingTextIncludes, extraTextIncludes };
}
