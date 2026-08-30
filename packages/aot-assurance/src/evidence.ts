import assert from 'node:assert/strict';

import type {
  AotBuildEvidence,
  LaneTranscript,
  SemanticTranscript,
} from './contract.js';

export function assertAotBuildEvidence(evidence: AotBuildEvidence): void {
  assert.equal(evidence.analysisCount, 1, 'the AOT lane must perform exactly one application analysis');
  assert.ok(evidence.artifacts.length > 0, 'the AOT lane produced no compiler-final artifacts');
  assert.equal(evidence.runtimeConfiguration.mode, 'require-replaceable');
  assert.ok(evidence.runtimeConfiguration.occurrences.length > 0, 'the AOT lane found no runtime configuration');
  assert.ok(
    evidence.runtimeConfiguration.occurrences.every((occurrence) => occurrence.disposition === 'replaced'),
    'the AOT lane preserved or refused a runtime configuration occurrence',
  );
  assert.ok(evidence.runtimeConfiguration.modules.length > 0, 'the AOT lane emitted no runtime configuration module');

  const moduleIds = new Set<string>();
  const generations = new Set<string>();
  for (const artifact of evidence.artifacts) {
    assert.equal(artifact.needsCompile, false, `${artifact.sourceId} is not a compiled definition`);
    assert.ok(artifact.sourceId.length > 0, 'artifact sourceId is empty');
    assert.ok(artifact.moduleId.length > 0, `artifact moduleId is empty for ${artifact.sourceId}`);
    assert.ok(artifact.definitionName.length > 0, `artifact definitionName is empty for ${artifact.sourceId}`);
    assert.ok(artifact.sourceMap.generatedFile.length > 0, `artifact map has no generated file for ${artifact.sourceId}`);
    assert.ok(
      artifact.sourceMap.sources.includes(artifact.sourceId),
      `artifact map for ${artifact.sourceId} does not point back to its authored source`,
    );
    assert.equal(moduleIds.has(artifact.moduleId), false, `duplicate AOT module ${artifact.moduleId}`);
    moduleIds.add(artifact.moduleId);
    generations.add(artifact.generation);
  }
  assert.equal(generations.size, 1, 'artifacts from more than one semantic generation entered one build');
}

export function assertProbePolicy(jit: LaneTranscript, aot: LaneTranscript): void {
  assert.equal(jit.lane, 'jit');
  assert.equal(aot.lane, 'aot');
  assert.ok(jit.probes != null, 'JIT runtime probe is absent');
  assert.ok(aot.probes != null, 'AOT runtime probe is absent');
  assert.ok(jit.probes.compilerCompile > 0, 'JIT control did not prove the compiler probe is live');
  assert.ok(jit.probes.parserParse > 0, 'JIT control did not prove the parser probe is live');
  assert.equal(aot.probes.compilerCompile, 0, 'AOT invoked ITemplateCompiler.compile');
  assert.equal(aot.probes.compilerCompileSpread, 0, 'AOT invoked ITemplateCompiler.compileSpread');
  assert.equal(aot.probes.parserParse, 0, 'AOT parsed an expression string at runtime');
  assert.ok(
    aot.probes.compilerNullTemplateBypass > 0,
    'AOT did not exercise its explicit null-template compiler-interface bypass',
  );
}

export function assertSemanticParity(jit: SemanticTranscript, aot: SemanticTranscript): void {
  assert.deepEqual(aot, jit, 'JIT and AOT produced different semantic transcripts');
}
