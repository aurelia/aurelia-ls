import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSemanticRuntime } from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/class-style-interpolation-boundaries');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'class-style-value-channels-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const valueChannels = app.ask({
  kind: 'binding-value-channels',
  page: { size: 100 },
}).value.rows;
const dataFlows = app.ask({
  kind: 'binding-data-flows',
  page: { size: 100 },
}).value.rows;
const observedDependencies = app.ask({
  kind: 'binding-observed-dependencies',
  page: { size: 100 },
}).value.rows;

const failures = [];

expectValueChannelCount(
  'Class interpolation attributes should lower to class token channels, not generic attribute channels.',
  'class-attribute-tokens',
  'class',
  2,
);
expectValueChannelCount(
  'Style interpolation attributes should lower to style rule channels, preserving the style-specific value domain.',
  'style-attribute-rules',
  'style',
  1,
);
expectDataFlow(
  'Multi-hole class interpolation should stay one source-to-target class-token flow for the attribute.',
  {
    sourceName: 'availabilityClass, featured ? tone : ""',
    valueChannelKind: 'class-attribute-tokens',
    targetProperty: 'class',
  },
);
expectDataFlow(
  'Nested template expressions inside class interpolation holes should stay part of the class-token flow.',
  {
    sourceName: 'stockCount > 0 ? "in-stock" : "sold-out", tone',
    valueChannelKind: 'class-attribute-tokens',
    targetProperty: 'class',
  },
);
expectDataFlow(
  'Multi-hole style interpolation should stay one source-to-target style-rule flow for the attribute.',
  {
    sourceName: 'accentColor, hidden ? "display: none;" : ""',
    valueChannelKind: 'style-attribute-rules',
    targetProperty: 'style',
  },
);
expectObservedDependency(
  'Class interpolation should observe the direct class token source.',
  'availabilityClass',
);
expectObservedDependency(
  'Class interpolation should observe conditional branch sources inside a template-expression hole.',
  'featured',
);
expectObservedDependency(
  'Style interpolation should observe conditional branch sources inside a template-expression hole.',
  'hidden',
);

const openRows = [
  ...valueChannels.filter((row) => row.openReason != null),
  ...dataFlows.filter((row) => row.openReason != null),
];
if (openRows.length !== 0) {
  failures.push(`Expected class/style interpolation fixture to have no open value-channel or data-flow rows, found ${openRows.length}.`);
}

if (failures.length !== 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    summary: contractSummary(),
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  summary: contractSummary(),
}, null, 2));

function expectValueChannelCount(summary, channelKind, targetProperty, count) {
  const matches = valueChannels.filter((row) =>
    row.definitionName === 'class-style-interpolation-boundaries-app'
    && row.channelKind === channelKind
    && row.targetProperty === targetProperty
  );
  if (matches.length !== count) {
    failures.push(`${summary} Expected ${count}, found ${matches.length}.`);
  }
}

function expectDataFlow(summary, expected) {
  const row = dataFlows.find((candidate) =>
    candidate.definitionName === 'class-style-interpolation-boundaries-app'
    && candidate.sourceName === expected.sourceName
    && candidate.valueChannelKind === expected.valueChannelKind
    && candidate.targetProperty === expected.targetProperty
  );
  if (row == null) {
    failures.push(`${summary} Missing data-flow row for ${expected.sourceName}.`);
    return;
  }
  if (row.direction !== 'source-to-target') {
    failures.push(`${summary} Expected source-to-target, found ${row.direction}.`);
  }
  if (row.valueSiteKind !== 'plain-attribute-interpolation') {
    failures.push(`${summary} Expected plain-attribute-interpolation, found ${row.valueSiteKind}.`);
  }
  if (row.targetValueType !== 'string' || row.sourceType !== 'string' || row.sourceToTargetAssignable !== true) {
    failures.push(`${summary} Expected string-to-string assignable flow, found ${row.sourceType} -> ${row.targetValueType}.`);
  }
}

function expectObservedDependency(summary, sourceName) {
  const row = observedDependencies.find((candidate) =>
    candidate.definitionName === 'class-style-interpolation-boundaries-app'
    && candidate.dependencyKind === 'template-expression-read'
    && candidate.sourceName === sourceName
  );
  if (row == null) {
    failures.push(`${summary} Missing observed dependency for ${sourceName}.`);
  }
}

function contractSummary() {
  return {
    fixture: 'class-style-interpolation-boundaries',
    valueChannels: valueChannels.length,
    dataFlows: dataFlows.length,
    observedDependencies: observedDependencies.length,
    classChannelCount: valueChannels.filter((row) => row.channelKind === 'class-attribute-tokens').length,
    styleChannelCount: valueChannels.filter((row) => row.channelKind === 'style-attribute-rules').length,
  };
}
