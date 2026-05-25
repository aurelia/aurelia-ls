import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/arrow-callback-source-value');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'binding-source-arrow-callbacks-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});
const projectKey = app.project.projectKey;

const resource = app.emission.templates.resources[0] ?? null;
const featuredSlot = resource == null ? null : repeatLocalSlot(resource, 'featured');
const lastFeaturedSlot = resource == null ? null : repeatLocalSlot(resource, 'lastFeatured');
const reducedFeaturedSlot = resource == null ? null : repeatLocalSlot(resource, 'reducedFeatured');
const slicedProductSlot = resource == null ? null : repeatLocalSlot(resource, 'slicedProduct');
const reversedProductSlot = resource == null ? null : repeatLocalSlot(resource, 'reversedProduct');
const sortedProductSlot = resource == null ? null : repeatLocalSlot(resource, 'sortedProduct');
const splicedProductSlot = resource == null ? null : repeatLocalSlot(resource, 'splicedProduct');
const withProductSlot = resource == null ? null : repeatLocalSlot(resource, 'withProduct');
const flatProductSlot = resource == null ? null : repeatLocalSlot(resource, 'flatProduct');
const joinedIdsSlot = resource == null ? null : repeatLocalSlot(resource, 'joinedIds');
const featuredIndexSlot = resource == null ? null : repeatLocalSlot(resource, 'featuredIndex');
const getterFeaturedSlot = resource == null ? null : repeatLocalSlot(resource, 'getterFeatured');
const getterJoinedIdsSlot = resource == null ? null : repeatLocalSlot(resource, 'getterJoinedIds');
const callScopeProductSlot = resource == null ? null : repeatLocalSlot(resource, 'callScopeProduct');
const thisCallProductSlot = resource == null ? null : repeatLocalSlot(resource, 'thisCallProduct');
const featuredId = featuredSlot?.staticValue == null ? null : readStaticProperty(featuredSlot.staticValue, 'id');
const featuredLabel = featuredSlot?.staticValue == null ? null : readStaticProperty(featuredSlot.staticValue, 'label');
const lastFeaturedId = lastFeaturedSlot?.staticValue == null ? null : readStaticProperty(lastFeaturedSlot.staticValue, 'id');
const reducedFeaturedId = reducedFeaturedSlot?.staticValue == null ? null : readStaticProperty(reducedFeaturedSlot.staticValue, 'id');
const slicedProductId = slicedProductSlot?.staticValue == null ? null : readStaticProperty(slicedProductSlot.staticValue, 'id');
const reversedProductId = reversedProductSlot?.staticValue == null ? null : readStaticProperty(reversedProductSlot.staticValue, 'id');
const sortedProductId = sortedProductSlot?.staticValue == null ? null : readStaticProperty(sortedProductSlot.staticValue, 'id');
const splicedProductId = splicedProductSlot?.staticValue == null ? null : readStaticProperty(splicedProductSlot.staticValue, 'id');
const withProductId = withProductSlot?.staticValue == null ? null : readStaticProperty(withProductSlot.staticValue, 'id');
const flatProductId = flatProductSlot?.staticValue == null ? null : readStaticProperty(flatProductSlot.staticValue, 'id');
const flatProductType = flatProductSlot?.targetType?.display ?? null;
const joinedIds = joinedIdsSlot?.staticValue?.kind === 'string' ? joinedIdsSlot.staticValue.value : null;
const featuredIndex = featuredIndexSlot?.staticValue?.kind === 'number' ? featuredIndexSlot.staticValue.value : null;
const getterFeaturedId = getterFeaturedSlot?.staticValue == null ? null : readStaticProperty(getterFeaturedSlot.staticValue, 'id');
const getterJoinedIds = getterJoinedIdsSlot?.staticValue?.kind === 'string' ? getterJoinedIdsSlot.staticValue.value : null;
const callScopeProductId = callScopeProductSlot?.staticValue == null ? null : readStaticProperty(callScopeProductSlot.staticValue, 'id');
const thisCallProductId = thisCallProductSlot?.staticValue == null ? null : readStaticProperty(thisCallProductSlot.staticValue, 'id');

const failures = [];
const assert = (condition, message) => {
  if (!condition) {
    failures.push(message);
  }
};

assert(resource != null, 'Expected the arrow-callback source-value fixture to compile one app resource.');
assert(featuredSlot != null, 'Expected repeat local `featured` to materialize a binding-context slot.');
assert(
  featuredSlot?.staticValue != null,
  'Expected repeat local `featured` to carry a static representative value after Array.filter arrow reduction.',
);
assert(
  featuredId === 'featured',
  `Expected arrow-filtered repeat local id to be 'featured', observed ${featuredId ?? 'missing'}.`,
);
assert(
  featuredLabel === 'Featured',
  `Expected arrow-filtered repeat local label to be 'Featured', observed ${featuredLabel ?? 'missing'}.`,
);
assert(lastFeaturedSlot?.staticValue != null, 'Expected Array.findLast repeat local to carry a static representative value.');
assert(
  lastFeaturedId === 'featured',
  `Expected Array.findLast repeat local id to be 'featured', observed ${lastFeaturedId ?? 'missing'}.`,
);
assert(reducedFeaturedSlot?.staticValue != null, 'Expected Array.reduce repeat local to carry a static representative value.');
assert(
  reducedFeaturedId === 'featured',
  `Expected Array.reduce repeat local id to be 'featured', observed ${reducedFeaturedId ?? 'missing'}.`,
);
assert(
  slicedProductId === 'featured',
  `Expected Array.slice repeat local id to be 'featured', observed ${slicedProductId ?? 'missing'}.`,
);
assert(
  reversedProductId === 'archived',
  `Expected Array.toReversed().slice repeat local id to be 'archived', observed ${reversedProductId ?? 'missing'}.`,
);
assert(
  sortedProductId === 'archived',
  `Expected Array.toSorted(...).slice repeat local id to be 'archived', observed ${sortedProductId ?? 'missing'}.`,
);
assert(
  splicedProductId === 'archived',
  `Expected Array.toSpliced(...).slice repeat local id to be 'archived', observed ${splicedProductId ?? 'missing'}.`,
);
assert(
  withProductId === 'archived',
  `Expected Array.with(...).slice repeat local id to be 'archived', observed ${withProductId ?? 'missing'}.`,
);
assert(
  flatProductId === 'featured',
  `Expected Array.flat repeat local id to be 'featured', observed ${flatProductId ?? 'missing'}.`,
);
assert(
  flatProductType === 'ArrowCallbackProduct',
  `Expected Array.flat repeat local type to stay ArrowCallbackProduct, observed ${flatProductType ?? 'missing'}.`,
);
assert(
  joinedIds === 'featured|archived',
  `Expected Array.join repeat local value to be 'featured|archived', observed ${joinedIds ?? 'missing'}.`,
);
assert(
  featuredIndex === 0,
  `Expected Array.lastIndexOf repeat local value to be 0, observed ${featuredIndex ?? 'missing'}.`,
);
assert(
  getterFeaturedId === 'featured',
  `Expected state getter-backed repeat local id to be 'featured', observed ${getterFeaturedId ?? 'missing'}.`,
);
assert(
  getterJoinedIds === 'featured|archived',
  `Expected state getter-backed joined ids to be 'featured|archived', observed ${getterJoinedIds ?? 'missing'}.`,
);
assert(
  callScopeProductId === 'featured',
  `Expected CallScope method source-value receiver to read view-model state, observed ${callScopeProductId ?? 'missing'}.`,
);
assert(
  thisCallProductId === 'featured',
  `Expected $this CallMember source-value receiver to read view-model state, observed ${thisCallProductId ?? 'missing'}.`,
);

const templateDiagnostics = await runtime.templateDiagnostics({
  projectKey,
  page: { size: 200, cursor: null },
});
const templateDiagnosticRows = templateDiagnostics.value?.rows ?? [];
const missingSyntheticArrayMethods = templateDiagnosticRows.filter((row) =>
  row.diagnosticKind === 'missing-expression-member'
  && ['flat', 'join', 'lastIndexOf', 'toSorted', 'toSpliced', 'with'].includes(row.selectedMemberName)
);
assert(
  missingSyntheticArrayMethods.length === 0,
  `Expected synthetic Array methods to be present in the public member surface, observed missing diagnostics for ${missingSyntheticArrayMethods.map((row) => row.selectedMemberName).join(', ') || 'none'}.`,
);
const templatePath = path.join(fixtureRoot, 'src/arrow-callback-source-value-app.html');
const templateText = readFileSync(templatePath, 'utf8');
for (const methodName of ['flat', 'join', 'lastIndexOf', 'toSorted', 'toSpliced', 'with']) {
  const methodOffset = templateText.indexOf(`.${methodName}`);
  assert(methodOffset >= 0, `Expected fixture template to contain Array.${methodName}.`);
  if (methodOffset < 0) {
    continue;
  }
  const completion = await runtime.templateCompletions({
    projectKey,
    cursor: cursorForSourceOffset(templatePath, templateText, methodOffset + 1),
    page: { size: 40, cursor: null },
  });
  assert(
    completion.outcome === 'hit',
    `Expected completion after diagnostics at Array.${methodName} to stay a hit, observed ${completion.outcome}.`,
  );
  assert(
    completion.value.missingInputs.length === 0,
    `Expected completion after diagnostics at Array.${methodName} to keep type details, missing ${completion.value.missingInputs.join(', ') || 'none'}.`,
  );
  assert(
    completion.value.candidates.length > 0,
    `Expected completion after diagnostics at Array.${methodName} to return type-member candidates.`,
  );
}

const summary = {
  fixtureRoot,
  hasResource: resource != null,
  slotStaticValueKind: featuredSlot?.staticValue?.kind ?? null,
  featuredId,
  featuredLabel,
  lastFeaturedId,
  reducedFeaturedId,
  slicedProductId,
  reversedProductId,
  sortedProductId,
  splicedProductId,
  withProductId,
  flatProductId,
  flatProductType,
  joinedIds,
  featuredIndex,
  getterFeaturedId,
  getterJoinedIds,
  callScopeProductId,
  thisCallProductId,
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

function cursorForSourceOffset(filePath, source, offset) {
  let line = 0;
  let lineStart = 0;
  for (let index = 0; index < offset; index += 1) {
    const code = source.charCodeAt(index);
    if (code === 13 || code === 10) {
      if (code === 13 && source.charCodeAt(index + 1) === 10) {
        index += 1;
      }
      line += 1;
      lineStart = index + 1;
    }
  }
  return {
    filePath,
    line,
    character: offset - lineStart,
    offset,
  };
}
