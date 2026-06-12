import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
} from '../out/index.js';
import { FrameworkProductDetails } from '../out/framework/product-details.js';
import { KernelVocabulary } from '../out/kernel/vocabulary.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/service-root-candidate-rollup');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'service-root-candidate-rollup-contract',
});
await runtime.openApp({
  analysisDepth: 'binding-targets',
});

const serviceRoots = runtime.workspace.store.productDetails
  .readBySlot(FrameworkProductDetails.ServiceRoot)
  .map((entry) => entry.detail);
const candidateSeams = runtime.workspace.store.readOpenSeams()
  .filter((seam) => seam.seamKindKey === KernelVocabulary.Framework.OpenServiceRootCandidate.key);
const rollupSeams = candidateSeams.filter((seam) =>
  seam.summary.includes('additional framework service-root candidate seam(s)')
);
const detailedSeams = candidateSeams.filter((seam) =>
  !seam.summary.includes('additional framework service-root candidate seam(s)')
);

const failures = [];
if (candidateSeams.length !== 9) {
  failures.push(`Expected eight detailed candidate seams plus one rollup seam, observed ${candidateSeams.length}.`);
}
if (detailedSeams.length !== 8) {
  failures.push(`Expected eight detailed candidate seams before capping, observed ${detailedSeams.length}.`);
}
if (rollupSeams.length !== 1) {
  failures.push(`Expected one capped candidate rollup seam, observed ${rollupSeams.length}.`);
}
if (!rollupSeams.some((seam) => seam.summary.startsWith('2 additional framework service-root candidate seam(s)'))) {
  failures.push(`Expected rollup seam to preserve the suppressed candidate count, observed ${rollupSeams.map((seam) => seam.summary).join(' | ') || '<none>'}.`);
}
if (candidateSeams.some((seam) => !seam.reasonKinds.includes('framework-service-root-candidate-open'))) {
  failures.push('Expected detailed and rollup service-root candidate seams to carry framework-service-root-candidate-open.');
}
if (serviceRoots.some((root) => root.serviceKeyName === 'IDialogService')) {
  failures.push('Resolver-wrapped IDialogService candidates should not become positive framework.service-root products.');
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    candidateSeams: candidateSeams.map((seam) => ({
      summary: seam.summary,
      reasonKinds: seam.reasonKinds,
    })),
    serviceRoots,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      detailedCandidateSeams: detailedSeams.length,
      rollupSeams: rollupSeams.length,
      serviceRoots: serviceRoots.length,
    },
  }, null, 2));
}
