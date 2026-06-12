import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';
import {
  HydrateElementInstruction,
} from '../out/template/instruction-ir.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/app-builder-part-source-gallery');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'template-content-projection-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});
const openSeams = app.ask({
  kind: SemanticAppQueryKind.OpenSeams,
  page: { size: 20 },
}).value.rows;
const instructions = app.emission.templates.resources
  .flatMap((resource) => resource.compilation.compiledTemplate.instructions);
const instructionSequences = app.emission.templates.resources
  .flatMap((resource) => resource.compilation.compiledTemplate.instructionSequences);
const sampleCardInstructions = instructions.filter((instruction) =>
  instruction instanceof HydrateElementInstruction
  && instruction.elementName === 'sample-card'
);
const projectedSampleCardInstructions = sampleCardInstructions.filter((instruction) =>
  instruction.projectionInstructionSequences.some((projection) => projection.slotName === 'default')
);
const projectedSequenceHandles = new Set(
  projectedSampleCardInstructions.flatMap((instruction) =>
    instruction.projectionInstructionSequences.map((projection) => projection.instructionSequenceProductHandle)
  ),
);
const materializedProjectionSequences = instructionSequences.filter((sequence) =>
  projectedSequenceHandles.has(sequence.productHandle)
);

const failures = [];
if (openSeams.some((row) => row.seamKindKey === 'compiler.open-content-projection')) {
  failures.push('Expected custom-element child projection compilation to close without compiler.open-content-projection seams.');
}
if (projectedSampleCardInstructions.length < 2) {
  failures.push(`Expected both sample-card usages to carry default projection sequences, observed ${projectedSampleCardInstructions.length}.`);
}
if (materializedProjectionSequences.length !== projectedSequenceHandles.size) {
  failures.push(
    `Expected every HydrateElement projection sequence handle to materialize an instruction sequence; ` +
    `observed ${materializedProjectionSequences.length}/${projectedSequenceHandles.size}.`,
  );
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      sampleCardInstructions: sampleCardInstructions.length,
      projectedSampleCardInstructions: projectedSampleCardInstructions.length,
      projectionSequences: materializedProjectionSequences.length,
    },
  }, null, 2));
}
