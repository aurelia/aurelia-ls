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
const targetAccesses = app.ask({
  kind: 'binding-target-accesses',
  page: { size: 100 },
}).value.rows;
const templateDiagnostics = app.ask({
  kind: 'template-diagnostics',
  diagnosticProjection: 'type-projection',
  sourceFile: { filePath: 'src/class-style-interpolation-boundaries-app.html' },
  page: { size: 100 },
}).value.rows;
const appDiagnostics = app.ask({
  kind: 'app-diagnostics',
  diagnosticProjection: 'type-projection',
  sourceFile: { filePath: 'src/class-style-interpolation-boundaries-app.html' },
  page: { size: 100 },
}).value.rows;

const failures = [];

expectValueChannelCount(
  'Class interpolation attributes should lower to class token channels, not generic attribute channels.',
  'class-attribute-tokens',
  'class',
  3,
);
expectValueChannelCount(
  'Style interpolation attributes should lower to style rule channels, preserving the style-specific value domain.',
  'style-attribute-rules',
  'style',
  3,
);
expectValueChannelCount(
  'The css alias should use the same whole-style rule channel as style.',
  'style-attribute-rules',
  'css',
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
expectDataFlow(
  'CSS punctuation and units surrounding several Aurelia holes should stay static text around one style-rule string flow.',
  {
    sourceName: 'progress, accentColor, offset, imageUrl',
    valueChannelKind: 'style-attribute-rules',
    targetProperty: 'style',
  },
);
expectDataFlow(
  'Native global attribute interpolation should type the complete runtime value as a string.',
  {
    sourceName: 'itemId',
    valueChannelKind: 'attribute-value',
    targetProperty: 'title',
  },
);
expectDataFlow(
  'Data attribute interpolation should preserve attribute-string semantics.',
  {
    sourceName: 'itemId',
    valueChannelKind: 'attribute-value',
    targetProperty: 'data-item-id',
  },
);
expectDataFlow(
  'ARIA interpolation should preserve attribute-string semantics even when static text contains a percent unit.',
  {
    sourceName: 'progress',
    valueChannelKind: 'attribute-value',
    targetProperty: 'aria-label',
  },
);
expectDataFlow(
  'SVG viewBox interpolation should preserve one complete attribute string rather than projecting numeric holes onto a DOM property.',
  {
    sourceName: 'viewWidth, viewHeight',
    valueChannelKind: 'attribute-value',
    targetProperty: 'viewBox',
  },
);
expectDataFlow(
  'Namespaced SVG href interpolation should preserve exact attribute-string semantics.',
  {
    sourceName: 'iconHref',
    valueChannelKind: 'attribute-value',
    targetProperty: 'xlink:href',
  },
);
expectTargetAccess(
  'SVG foreignObject should re-enter HTML before projecting native input targets.',
  'HTMLInputElement',
  'value',
);
expectTargetAccess(
  'Nested SVG inside foreignObject should re-enter the SVG DOM type map.',
  'SVGCircleElement',
  'r',
);
expectBindingCommandFlow(
  'style.bind should retain the framework whole-style object channel.',
  'styleRules',
  'style',
  'style-attribute-rules',
);
expectBindingCommandFlow(
  'css.bind should retain the framework whole-style object channel.',
  'styleRules',
  'css',
  'style-attribute-rules',
);
expectBindingCommandFlow(
  'The production PROP.style form should retain the single CSS-property value channel.',
  'widthStyle',
  'width',
  'style-property-value',
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
expectObservedDependencyCount(
  'HTML text, SVG CDATA, and HTML re-entry should each retain their authored title dependency.',
  'title',
  3,
);

const openRows = [
  ...valueChannels.filter((row) => row.openReason != null),
  ...dataFlows.filter((row) => row.openReason != null),
];
if (openRows.length !== 0) {
  failures.push(`Expected class/style interpolation fixture to have no open value-channel or data-flow rows, found ${openRows.length}.`);
}
if (templateDiagnostics.length !== 0 || appDiagnostics.length !== 0) {
  failures.push(
    `Expected valid class/style/css/native/data/ARIA/SVG/namespaced attribute forms to produce no template diagnostics, `
      + `found template=${templateDiagnostics.length}, app=${appDiagnostics.length}.`,
  );
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

function expectBindingCommandFlow(summary, sourceName, targetProperty, valueChannelKind) {
  const row = dataFlows.find((candidate) =>
    candidate.definitionName === 'class-style-interpolation-boundaries-app'
    && candidate.sourceName === sourceName
    && candidate.targetProperty === targetProperty
    && candidate.valueChannelKind === valueChannelKind
    && candidate.valueSiteKind === 'binding-command-value'
  );
  if (row == null) {
    failures.push(`${summary} Missing binding-command flow ${sourceName} -> ${targetProperty}.`);
    return;
  }
  if (row.direction !== 'source-to-target' || row.sourceToTargetAssignable !== true || row.openReason != null) {
    failures.push(
      `${summary} Expected a closed assignable source-to-target flow, found direction=${row.direction}, `
        + `assignable=${row.sourceToTargetAssignable}, open=${row.openReason ?? 'none'}.`,
    );
  }
}

function expectObservedDependency(summary, sourceName) {
  const row = observedDependencies.find((candidate) =>
    candidate.definitionName === 'class-style-interpolation-boundaries-app'
    && candidate.occurrence.dependencyKind === 'template-expression-read'
    && candidate.occurrence.sourceName === sourceName
  );
  if (row == null) {
    failures.push(`${summary} Missing observed dependency for ${sourceName}.`);
  }
}

function expectObservedDependencyCount(summary, sourceName, count) {
  const matches = observedDependencies.filter((candidate) =>
    candidate.definitionName === 'class-style-interpolation-boundaries-app'
    && candidate.occurrence.dependencyKind === 'template-expression-read'
    && candidate.occurrence.sourceName === sourceName
  );
  if (matches.length !== count) {
    failures.push(`${summary} Expected ${count}, found ${matches.length}.`);
  }
}

function expectTargetAccess(summary, targetType, targetProperty) {
  const row = targetAccesses.find((candidate) =>
    candidate.definitionName === 'class-style-interpolation-boundaries-app'
    && candidate.targetType === targetType
    && candidate.targetProperty === targetProperty
  );
  if (row == null) {
    failures.push(`${summary} Missing target-access row ${targetType}.${targetProperty}.`);
    return;
  }
  if (row.openReason != null || row.frameworkErrorCode != null) {
    failures.push(
      `${summary} Expected a closed target access, found open=${row.openReason ?? 'none'}, `
        + `frameworkError=${row.frameworkErrorCode ?? 'none'}.`,
    );
  }
}

function contractSummary() {
  return {
    fixture: 'class-style-interpolation-boundaries',
    valueChannels: valueChannels.length,
    dataFlows: dataFlows.length,
    observedDependencies: observedDependencies.length,
    targetAccesses: targetAccesses.length,
    templateDiagnostics: templateDiagnostics.length,
    appDiagnostics: appDiagnostics.length,
    classChannelCount: valueChannels.filter((row) => row.channelKind === 'class-attribute-tokens').length,
    styleChannelCount: valueChannels.filter((row) => row.channelKind === 'style-attribute-rules').length,
  };
}
