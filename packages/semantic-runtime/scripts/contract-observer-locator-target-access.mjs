import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSemanticRuntime } from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

const targetAccessRows = await targetAccessRowsForFixture(
  'runtime-observer-write-errors',
  'observer-locator-target-access-contract',
);
const nodeStrategyTargetAccessRows = await targetAccessRowsForFixture(
  'node-observer-strategy-errors',
  'observer-locator-node-strategy-contract',
);

const expectations = [
  targetAccessExpectation(
    'getter-only target property should use ComputedObserver',
    targetAccessRows,
    'ReadonlyTarget',
    'computed-observer',
    false,
  ),
  targetAccessExpectation(
    'setter-only target property should use the framework configurable-accessor ComputedObserver branch',
    targetAccessRows,
    'SetterOnlyTarget',
    'computed-observer',
    true,
  ),
  targetAccessExpectation(
    'readonly data field should stay a SetterObserver runtime branch',
    targetAccessRows,
    'ReadonlyFieldTarget',
    'setter-observer',
    false,
  ),
  targetAccessExpectation(
    'map/set size should use CollectionSizeObserver',
    targetAccessRows,
    'MapSizeTarget',
    'collection-size-observer',
    false,
  ),
  targetAccessPropertyExpectation(
    'accessor-time href should use the runtime DataAttributeAccessor lane',
    targetAccessRows,
    'href',
    'data-attribute-accessor',
  ),
  targetAccessPropertyExpectation(
    'xlink namespaced SVG attributes should use AttributeNSAccessor',
    targetAccessRows,
    'xlink:href',
    'attribute-ns-accessor',
  ),
  targetAccessPropertyExpectation(
    'xml namespace attributes in the framework ns table should use AttributeNSAccessor',
    targetAccessRows,
    'xml:lang',
    'attribute-ns-accessor',
  ),
  targetAccessPropertyExpectation(
    'SVG XML attributes outside the namespace accessor table should stay on DataAttributeAccessor',
    targetAccessRows,
    'xml:base',
    'data-attribute-accessor',
  ),
  targetAccessFrameworkErrorExpectation(
    'observer-time href should use NodeObserverLocator dirty-check-disabled strategy failure',
    nodeStrategyTargetAccessRows,
    'href',
    'AUR0652',
  ),
];

const failures = expectations.filter((result) => result != null);
const summary = {
  fixture: 'runtime-observer-write-errors',
  checkedTargets: expectations.length,
  targetAccesses: targetAccessRows.map((row) => ({
    targetType: row.targetType,
    targetProperty: row.targetProperty,
    strategy: row.strategy,
    isWritable: row.isWritable,
    propertyExists: row.propertyExists,
  })),
  nodeStrategyFixture: 'node-observer-strategy-errors',
  nodeStrategyTargetAccesses: nodeStrategyTargetAccessRows.map((row) => ({
    targetType: row.targetType,
    targetProperty: row.targetProperty,
    strategy: row.strategy,
    frameworkErrorCode: row.frameworkErrorCode,
    diagnosticReason: row.diagnosticReason,
    isWritable: row.isWritable,
    propertyExists: row.propertyExists,
  })),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

async function targetAccessRowsForFixture(fixtureName, storeKey) {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(packageRoot, 'fixtures/pressure', fixtureName),
    storeKey,
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  return app.ask({
    kind: 'binding-target-accesses',
    page: { size: 1000 },
  }).value.rows;
}

function targetAccessExpectation(summary, rows, targetType, strategy, requireWritable) {
  const row = rows.find((candidate) =>
    candidate.targetType === targetType
    && candidate.targetProperty === 'value'
  ) ?? rows.find((candidate) =>
    candidate.targetType === targetType
    && candidate.targetProperty === 'size'
  );
  if (row == null) {
    return `${summary}: missing target access for ${targetType}.`;
  }
  if (row.strategy !== strategy) {
    return `${summary}: expected ${strategy}, got ${row.strategy}.`;
  }
  if (requireWritable && row.isWritable !== true) {
    return `${summary}: expected TypeChecker writeability to remain true, got ${row.isWritable}.`;
  }
  return null;
}

function targetAccessPropertyExpectation(summary, rows, targetProperty, strategy) {
  const row = rows.find((candidate) =>
    candidate.targetProperty === targetProperty
  );
  if (row == null) {
    return `${summary}: missing target access for ${targetProperty}.`;
  }
  if (row.strategy !== strategy) {
    return `${summary}: expected ${strategy}, got ${row.strategy}.`;
  }
  return null;
}

function targetAccessFrameworkErrorExpectation(summary, rows, targetProperty, frameworkErrorCode) {
  const row = rows.find((candidate) =>
    candidate.targetProperty === targetProperty
  );
  if (row == null) {
    return `${summary}: missing target access for ${targetProperty}.`;
  }
  if (row.frameworkErrorCode !== frameworkErrorCode) {
    return `${summary}: expected ${frameworkErrorCode}, got ${row.frameworkErrorCode}.`;
  }
  return null;
}
