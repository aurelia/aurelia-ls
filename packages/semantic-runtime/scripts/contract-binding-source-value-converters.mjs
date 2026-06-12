import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/value-converter-source-value');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'binding-source-value-converters-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const resource = app.emission.templates.resources[0] ?? null;
const featuredSlot = resource == null ? null : repeatLocalSlot(resource, 'featured');
const featuredId = featuredSlot?.staticValue == null ? null : readStaticProperty(featuredSlot.staticValue, 'id');
const featuredLabel = featuredSlot?.staticValue == null ? null : readStaticProperty(featuredSlot.staticValue, 'label');
const dynamicFeaturedSlot = resource == null ? null : repeatLocalSlot(resource, 'dynamicFeatured');
const fallbackProductSlot = resource == null ? null : repeatLocalSlot(resource, 'fallbackProduct');
const fallbackProductId = fallbackProductSlot?.staticValue == null ? null : readStaticProperty(fallbackProductSlot.staticValue, 'id');
const fallbackProductLabel = fallbackProductSlot?.staticValue == null ? null : readStaticProperty(fallbackProductSlot.staticValue, 'label');
const templateDiagnosticRows = app.ask({ kind: 'template-diagnostics', page: { size: 50 } }).value.rows;

const failures = [];
const assert = (condition, message) => {
  if (!condition) {
    failures.push(message);
  }
};

assert(resource != null, 'Expected the value-converter source-value fixture to compile one app resource.');
assert(featuredSlot != null, 'Expected repeat local `featured` to materialize a binding-context slot.');
assert(
  featuredSlot?.staticValue != null,
  'Expected repeat local `featured` to carry a static representative value after value-converter toView reduction.',
);
assert(
  featuredId === 'featured',
  `Expected converter-filtered repeat local id to be 'featured', observed ${featuredId ?? 'missing'}.`,
);
assert(
  featuredLabel === 'Featured',
  `Expected converter-filtered repeat local label to be 'Featured', observed ${featuredLabel ?? 'missing'}.`,
);
assert(dynamicFeaturedSlot != null, 'Expected dynamic withContext repeat local `dynamicFeatured` to materialize a binding-context slot.');
assert(
  dynamicFeaturedSlot?.targetType?.display === 'SourceValueProduct',
  `Expected dynamic withContext repeat local to keep its checker element type, observed ${dynamicFeaturedSlot?.targetType?.display ?? 'missing'}.`,
);
assert(
  dynamicFeaturedSlot?.staticValue == null,
  'Expected dynamic withContext source-value reduction to stay open instead of choosing one concrete value-converter arity.',
);
assert(fallbackProductSlot != null, 'Expected non-strict nullish fallback repeat local `fallbackProduct` to materialize a binding-context slot.');
assert(
  fallbackProductSlot?.targetType?.display === 'SourceValueProduct',
  `Expected non-strict nullish fallback repeat local to keep its checker element type, observed ${fallbackProductSlot?.targetType?.display ?? 'missing'}.`,
);
assert(
  fallbackProductId === 'fallback',
  `Expected non-strict nullish member access to reduce to undefined and let || choose the singleton fallback source, observed id ${fallbackProductId ?? 'missing'}.`,
);
assert(
  fallbackProductLabel === 'Fallback',
  `Expected fallback repeat local label to be 'Fallback', observed ${fallbackProductLabel ?? 'missing'}.`,
);
assert(
  templateDiagnosticRows.length === 0,
  `Expected strict:false overlay projection to avoid raw TypeScript nullish diagnostics, observed ${templateDiagnosticRows.map((row) => row.summary).join('; ') || 'none'}.`,
);

const summary = {
  fixtureRoot,
  hasResource: resource != null,
  slotStaticValueKind: featuredSlot?.staticValue?.kind ?? null,
  featuredId,
  featuredLabel,
  dynamicFeaturedType: dynamicFeaturedSlot?.targetType?.display ?? null,
  dynamicFeaturedHasStaticValue: dynamicFeaturedSlot?.staticValue != null,
  fallbackProductType: fallbackProductSlot?.targetType?.display ?? null,
  fallbackProductId,
  fallbackProductLabel,
  templateDiagnosticRows: templateDiagnosticRows.length,
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

function repeatLocalSlot(resource, name) {
  for (const scope of resource.runtimeAnalysis.scopes.readScopes()) {
    if (scope.ownerKind !== 'repeated-item') {
      continue;
    }
    const slot = scope.bindingContext.slots.find((candidate) => candidate.name === name) ?? null;
    if (slot != null) {
      return slot;
    }
  }
  return null;
}

function readStaticProperty(value, propertyName) {
  if (value.kind !== 'object' && value.kind !== 'instance' && value.kind !== 'boundary-object') {
    return null;
  }
  const property = value.properties.get(propertyName)?.value ?? null;
  return property?.kind === 'string' ? property.value : null;
}
