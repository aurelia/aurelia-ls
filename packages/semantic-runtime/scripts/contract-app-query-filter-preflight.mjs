import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/resource-bindable-boundary-config');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'app-query-filter-preflight-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const unsupportedSourceFileAnswer = app.ask({
  kind: SemanticAppQueryKind.ResourceDefinitions,
  sourceFile: { filePath: 'src/app.ts' },
  page: { size: 20 },
});
const supportedSourceFileAnswer = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  sourceFile: { filePath: 'src/app.ts' },
  page: { size: 20 },
});
const unsupportedOpenSeamFilterAnswer = app.ask({
  kind: SemanticAppQueryKind.ResourceDefinitions,
  openSeamKindKey: 'resource.open-definition-field',
  page: { size: 20 },
});

const failures = [
  unsupportedSourceFileAnswer.outcome === 'unsupported'
    ? null
    : `Expected resource-definitions+sourceFile to be unsupported, observed ${unsupportedSourceFileAnswer.outcome}.`,
  unsupportedSourceFileAnswer.closure === 'unsupported'
    ? null
    : `Expected resource-definitions+sourceFile closure to be unsupported, observed ${unsupportedSourceFileAnswer.closure}.`,
  unsupportedSourceFileAnswer.summary.includes('does not support sourceFile')
    ? null
    : `Expected unsupported sourceFile answer to name the rejected selector, observed: ${unsupportedSourceFileAnswer.summary}`,
  unsupportedSourceFileAnswer.value?.unsupportedFields?.includes('sourceFile')
    ? null
    : `Expected unsupported sourceFile answer to expose unsupportedFields, observed ${JSON.stringify(unsupportedSourceFileAnswer.value)}.`,
  unsupportedSourceFileAnswer.value?.acceptedQueryKinds?.sourceFile?.includes(SemanticAppQueryKind.OpenSeamSites)
    ? null
    : `Expected unsupported sourceFile answer to list accepted sourceFile query kinds, observed ${JSON.stringify(unsupportedSourceFileAnswer.value?.acceptedQueryKinds)}.`,
  supportedSourceFileAnswer.outcome === 'hit'
    ? null
    : `Expected open-seam-sites+sourceFile to remain supported, observed ${supportedSourceFileAnswer.outcome}.`,
  supportedSourceFileAnswer.closure === 'complete'
    ? null
    : `Expected open-seam-sites+sourceFile closure to be complete, observed ${supportedSourceFileAnswer.closure}.`,
  supportedSourceFileAnswer.value?.rows?.length === 3
    ? null
    : `Expected sourceFile-filtered open-seam-sites to return 3 rows, observed ${supportedSourceFileAnswer.value?.rows?.length ?? 'missing'}.`,
  unsupportedOpenSeamFilterAnswer.outcome === 'unsupported'
    ? null
    : `Expected resource-definitions+openSeamKindKey to be unsupported, observed ${unsupportedOpenSeamFilterAnswer.outcome}.`,
  unsupportedOpenSeamFilterAnswer.closure === 'unsupported'
    ? null
    : `Expected resource-definitions+openSeamKindKey closure to be unsupported, observed ${unsupportedOpenSeamFilterAnswer.closure}.`,
  unsupportedOpenSeamFilterAnswer.value?.unsupportedFields?.includes('openSeamKindKey')
    ? null
    : `Expected unsupported open-seam filter answer to expose unsupportedFields, observed ${JSON.stringify(unsupportedOpenSeamFilterAnswer.value)}.`,
].filter(Boolean);

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    unsupportedSourceFileAnswer,
    supportedSourceFileAnswer,
    unsupportedOpenSeamFilterAnswer,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    unsupportedSourceFile: {
      outcome: unsupportedSourceFileAnswer.outcome,
      closure: unsupportedSourceFileAnswer.closure,
      summary: unsupportedSourceFileAnswer.summary,
      unsupportedFields: unsupportedSourceFileAnswer.value.unsupportedFields,
    },
    supportedSourceFile: {
      outcome: supportedSourceFileAnswer.outcome,
      closure: supportedSourceFileAnswer.closure,
      rows: supportedSourceFileAnswer.value.rows.length,
    },
    unsupportedOpenSeamFilter: {
      outcome: unsupportedOpenSeamFilterAnswer.outcome,
      closure: unsupportedOpenSeamFilterAnswer.closure,
      unsupportedFields: unsupportedOpenSeamFilterAnswer.value.unsupportedFields,
    },
  }, null, 2));
}
