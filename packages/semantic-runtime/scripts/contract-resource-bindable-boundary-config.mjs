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
  storeKey: 'resource-bindable-boundary-config-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const definitions = app.ask({
  kind: SemanticAppQueryKind.ResourceDefinitions,
  page: { size: 20 },
}).value;
const seamSites = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  openSeamKindKey: 'resource.open-definition-field',
  page: { size: 20 },
}).value;
const allSeams = app.ask({
  kind: SemanticAppQueryKind.OpenSeamSites,
  page: { size: 50 },
}).value;

const boundaryCard = definitions.rows.find((row) => row.name === 'boundary-card');
const boundaryPanel = definitions.rows.find((row) => row.name === 'boundary-panel');
const enabledBindable = boundaryCard?.bindables.find((row) => row.name === 'enabled');
const labelBindable = boundaryCard?.bindables.find((row) => row.name === 'label');
const externalValueBindable = boundaryPanel?.bindables.find((row) => row.name === 'externalValue');
const bindableBoundarySites = seamSites.rows.filter((row) =>
  row.reasonKinds.includes('resource-bindable-configuration-open')
);
const evaluatorNoise = allSeams.rows.filter((row) =>
  row.seamKindKey === 'evaluation.unsupported-expression'
);

const failures = [
  boundaryCard == null
    ? 'Expected boundary-card resource definition.'
    : null,
  boundaryPanel == null
    ? 'Expected boundary-panel resource definition.'
    : null,
  enabledBindable?.mode === 'twoWay'
    ? null
    : `Expected explicitly supplied mode to stay twoWay, observed ${enabledBindable?.mode ?? 'missing'}.`,
  enabledBindable?.setterKind === 'open'
    ? null
    : `Expected open object bindable config to keep setterKind=open, observed ${enabledBindable?.setterKind ?? 'missing'}.`,
  labelBindable?.mode === 'default'
    ? null
    : `Expected open object bindable config without an explicit mode to avoid fabricated toView certainty, observed ${labelBindable?.mode ?? 'missing'}.`,
  labelBindable?.setterKind === 'open'
    ? null
    : `Expected open object bindable config without an explicit setter to keep setterKind=open, observed ${labelBindable?.setterKind ?? 'missing'}.`,
  externalValueBindable?.mode === 'default'
    ? null
    : `Expected class-level open bindable config without an explicit mode to avoid fabricated toView certainty, observed ${externalValueBindable?.mode ?? 'missing'}.`,
  externalValueBindable?.setterKind === 'open'
    ? null
    : `Expected class-level open bindable config without an explicit setter to keep setterKind=open, observed ${externalValueBindable?.setterKind ?? 'missing'}.`,
  bindableBoundarySites.length === 3
    ? null
    : `Expected 3 unique authored bindable boundary sites, observed ${bindableBoundarySites.length}.`,
  bindableBoundarySites.every((row) => row.reasonKinds.includes('host-environment-value'))
    ? null
    : `Expected every bindable boundary site to retain host-environment-value, observed ${JSON.stringify(bindableBoundarySites.map((row) => row.reasonKinds))}.`,
  bindableBoundarySites.every((row) => row.sampleSummary.includes('import.meta.env'))
    ? null
    : `Expected bindable boundary seam summaries to name import.meta.env, observed ${JSON.stringify(bindableBoundarySites.map((row) => row.sampleSummary))}.`,
  bindableBoundarySites.every((row) => row.sourceRange?.start?.line != null)
    ? null
    : 'Expected bindable boundary seam sites to retain authored source ranges.',
  evaluatorNoise.length === 0
    ? null
    : 'Expected open bindable configuration boundaries to avoid evaluator unsupported-expression seam noise.',
].filter(Boolean);

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    definitions: definitions.rows.map((row) => ({
      name: row.name,
      targetName: row.targetName,
      bindables: row.bindables,
    })),
    seamSites,
    allSeams,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    bindables: {
      enabled: {
        mode: enabledBindable.mode,
        setterKind: enabledBindable.setterKind,
      },
      label: {
        mode: labelBindable.mode,
        setterKind: labelBindable.setterKind,
      },
      externalValue: {
        mode: externalValueBindable.mode,
        setterKind: externalValueBindable.setterKind,
      },
    },
    bindableBoundarySites: bindableBoundarySites.map((row) => ({
      reasonKinds: row.reasonKinds,
      sampleSummary: row.sampleSummary,
      source: row.source?.label,
      sourceRange: row.sourceRange,
    })),
    totalOpenSeamSites: allSeams.totalOpenSeamSites,
  }, null, 2));
}
