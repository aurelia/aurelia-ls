import { runVectorTests, getDirname, lowerOpts } from "../../_helpers/vector-runner.js";
import { noopModuleResolver } from "../../_helpers/test-utils.js";

import { lowerDocument, resolveHost, bindScopes, planOverlay, emitOverlay } from "@aurelia-ls/compiler";

// --- Types ---

interface EmitExpect {
  mapping?: number;
  textIncludes?: string[];
}

interface EmitIntent {
  mappingCount: number;
  textIncludes: string[];
  text: string;
}

interface EmitDiff {
  missingMapping: string[];
  extraMapping: string[];
  missingTextIncludes: string[];
  extraTextIncludes: string[];
}

const RESOLVE_OPTS = { moduleResolver: noopModuleResolver, templateFilePath: "mem.html" };

runVectorTests<EmitExpect, EmitIntent, EmitDiff>({
  dirname: getDirname(import.meta.url),
  suiteName: "Emit Overlay (60)",
  execute: (v, ctx) => {
    const ir = lowerDocument(v.markup, lowerOpts(ctx));
    const linked = resolveHost(ir, ctx.sem, RESOLVE_OPTS);
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

interface VmReflection {
  getRootVmTypeExpr(): string;
  getSyntheticPrefix(): string;
}

function mockVm(): VmReflection {
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

interface EmitOutput {
  mapping: unknown[];
  text: string;
}

function reduceEmitIntent(emit: EmitOutput, expectHints: EmitExpect | undefined): EmitIntent {
  return {
    mappingCount: emit.mapping.length,
    textIncludes: (expectHints?.textIncludes ?? []).filter((snippet) => emit.text.includes(snippet)),
    text: emit.text,
  };
}

// --- Intent Comparison ---

function compareEmitIntent(actual: EmitIntent, expected: EmitExpect): EmitDiff {
  const missingMapping: string[] = [];
  const extraMapping: string[] = [];
  const missingTextIncludes: string[] = [];
  const extraTextIncludes: string[] = [];

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
