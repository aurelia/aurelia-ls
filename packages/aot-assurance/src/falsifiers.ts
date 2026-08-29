import assert from 'node:assert/strict';

import type { AotBuildEvidence, LaneTranscript, SemanticTranscript } from './contract.js';
import { assertAotBuildEvidence, assertProbePolicy, assertSemanticParity } from './evidence.js';

function transcript(text: string): SemanticTranscript {
  return {
    checkpoints: [{
      label: 'initial',
      observation: {
        dom: [{ kind: 'text', value: text }],
        live: [],
        focus: null,
        model: { text },
        events: [],
        browserStructure: { parentId: null, nextElementId: null },
        svgNamespace: null,
      },
    }],
    teardownEvents: [],
    console: [],
    pageErrors: [],
  };
}

function lane(kind: 'jit' | 'aot', compiler: number, parser: number): LaneTranscript {
  return {
    lane: kind,
    semantic: transcript('same'),
    probes: {
      compilerCompile: compiler,
      compilerCompileSpread: 0,
      compilerNullTemplateBypass: 0,
      parserParse: parser,
    },
  };
}

function evidence(needsCompile: boolean, artifacts = 2): AotBuildEvidence {
  return {
    analysisCount: 1,
    artifacts: Array.from({ length: artifacts }, (_, index) => ({
      generation: 'generation-1',
      sourceId: `/src/component-${index}.html`,
      moduleId: `virtual:aot/component-${index}`,
      definitionName: `component-${index}`,
      needsCompile: needsCompile as false,
      sourceMap: {
        generatedFile: `component-${index}.js`,
        sources: [`/src/component-${index}.html`],
      },
    })),
  };
}

/** Proves the local measuring instrument rejects its principal false greens. */
export function proveLocalFalsifiers(): void {
  assert.throws(
    () => assertSemanticParity(transcript('control'), transcript('mutated')),
    /different semantic transcripts/,
  );
  assert.throws(
    () => assertProbePolicy(lane('jit', 0, 0), lane('aot', 0, 0)),
    /compiler probe is live/,
  );
  assert.throws(
    () => assertProbePolicy(lane('jit', 1, 1), lane('aot', 1, 0)),
    /AOT invoked ITemplateCompiler\.compile/,
  );
  assert.throws(() => assertAotBuildEvidence(evidence(false, 0)), /no compiler-final artifacts/);
  assert.throws(() => assertAotBuildEvidence(evidence(true)), /not a compiled definition/);
}
