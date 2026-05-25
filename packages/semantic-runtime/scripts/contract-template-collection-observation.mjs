import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AuthoringVerificationRequest,
  createSemanticRuntime,
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
  readAuthoringVerificationSnapshot,
  verifyAuthoringEffects,
} from '../out/index.js';
import { exactSourceSpanFailures } from './contract-source-span-assertions.mjs';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-collection-observation');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'template-collection-observation-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const expectedEffects = [
  ExpectedSemanticEffect.fact(
    'Array member calls should publish template collection reads because astEvaluate observes runtime arrays.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-collection-read'),
      effectFilter('sourceName', 'products'),
      effectFilter('methodName', 'map'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Derived array result calls should continue publishing template collection reads on the temporary result route.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-collection-read'),
      effectFilter('sourceName', 'products.filter()'),
      effectFilter('methodName', 'map'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Nested derived array result calls should keep the full temporary result route.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-collection-read'),
      effectFilter('sourceName', 'products.filter().map()'),
      effectFilter('methodName', 'join'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Nested array callbacks should keep observing callback-local collection owners reached from an outer callback local.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-collection-read'),
      effectFilter('sourceName', 'product.tags'),
      effectFilter('methodName', 'map'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Nested array callbacks should observe inner callback-local member reads without losing the outer callback scope.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('sourceName', 'tag.length'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.absent(
    'Nested callbacks should not re-observe an outer callback parameter as a template scope property.',
    'binding-observed-dependency',
    'template',
    null,
    [
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('sourceName', 'product'),
    ],
  ),
  ExpectedSemanticEffect.fact(
    'Non-callback array methods such as includes should publish collection reads without implying callback-body observation.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-collection-read'),
      effectFilter('sourceName', 'products'),
      effectFilter('methodName', 'includes'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.absent(
    'Callable callback locals should not publish a template scope read for the callback-local function name.',
    'binding-observed-dependency',
    'template',
    null,
    [
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('sourceName', 'format'),
    ],
  ),
  ExpectedSemanticEffect.fact(
    'Callback-executing array methods such as forEach should still publish callback-local expression reads.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('sourceName', 'eachProduct.name'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.absent(
    'Array methods outside Aurelia auto-observed collection reads should not publish collection rows merely because they execute callbacks.',
    'binding-observed-dependency',
    'template',
    null,
    [
      effectFilter('dependencyKind', 'template-collection-read'),
      effectFilter('sourceName', 'products'),
      effectFilter('methodName', 'forEach'),
    ],
  ),
  ExpectedSemanticEffect.fact(
    'Newer callback-executing array methods should publish callback-local expression reads even when Aurelia does not auto-observe their collection owner.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('sourceName', 'lastProduct.name'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.absent(
    'Array callback methods outside Aurelia autoObserveArrayMethods should not become collection reads.',
    'binding-observed-dependency',
    'template',
    null,
    [
      effectFilter('dependencyKind', 'template-collection-read'),
      effectFilter('sourceName', 'products'),
      effectFilter('methodName', 'findLast'),
    ],
  ),
  ExpectedSemanticEffect.fact(
    'Template array reduce publishes the auto-observed collection row from astEvaluate.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-collection-read'),
      effectFilter('sourceName', 'products'),
      effectFilter('methodName', 'reduce'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Template array reduce callback arguments remain observable member owners for the accumulator.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('sourceName', 'selected.name'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Template array reduce callback arguments remain observable member owners for the iterated value.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('sourceName', 'product.name'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.absent(
    'Reduce callback locals should not re-observe the accumulator as a template scope property.',
    'binding-observed-dependency',
    'template',
    null,
    [
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('sourceName', 'selected'),
    ],
  ),
  ExpectedSemanticEffect.fact(
    'Template array sort still publishes the auto-observed collection row from astEvaluate.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-collection-read'),
      effectFilter('sourceName', 'products'),
      effectFilter('methodName', 'sort'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Template array sort callbacks execute the Aurelia arrow function under the active connectable.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('sourceName', 'left.id'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Template array sort callback arguments remain observable member owners when the arrow body reads the right side.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('sourceName', 'right.id'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Callback-local array members should publish collection reads when the callback-local member is array-shaped.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-collection-read'),
      effectFilter('sourceName', 'product.tags'),
      effectFilter('methodName', 'includes'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.absent(
    'String member calls should not publish template collection reads merely because the method name matches an array method.',
    'binding-observed-dependency',
    'template',
    null,
    [
      effectFilter('dependencyKind', 'template-collection-read'),
      effectFilter('sourceName', 'label'),
      effectFilter('methodName', 'includes'),
    ],
  ),
  ExpectedSemanticEffect.absent(
    'String member calls inside array callbacks should still use the callback-local type instead of method-name collection heuristics.',
    'binding-observed-dependency',
    'template',
    null,
    [
      effectFilter('dependencyKind', 'template-collection-read'),
      effectFilter('sourceName', 'product.name'),
      effectFilter('methodName', 'includes'),
    ],
  ),
  ExpectedSemanticEffect.absent(
    'Ordinary object member calls should not publish template collection reads for Map-like method names without an array receiver.',
    'binding-observed-dependency',
    'template',
    null,
    [
      effectFilter('dependencyKind', 'template-collection-read'),
      effectFilter('sourceName', 'lookup'),
      effectFilter('methodName', 'get'),
    ],
  ),
  ExpectedSemanticEffect.absent(
    'Non-array methods named like array methods should not execute callback body observation by method-name alone.',
    'binding-observed-dependency',
    'template',
    null,
    [
      effectFilter('sourceName', 'ghost.name'),
    ],
  ),
  ExpectedSemanticEffect.absent(
    'Non-array methods named like array methods should not publish template collection reads by method-name alone.',
    'binding-observed-dependency',
    'template',
    null,
    [
      effectFilter('dependencyKind', 'template-collection-read'),
      effectFilter('sourceName', 'nonArrayMapper'),
      effectFilter('methodName', 'map'),
    ],
  ),
  ExpectedSemanticEffect.fact(
    'Dynamic array keyed template reads should preserve the authored key expression and owner source route.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('sourceName', 'products[selectedProductIndex]'),
      effectFilter('keyExpression', 'selectedProductIndex'),
      effectFilter('observedMemberSource.path', 'src/template-collection-observation-app.ts'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Dynamic keyed template data-flow source names should keep the key expression rather than collapsing to an anonymous element.',
    'binding-data-flow',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('sourceName', 'products[selectedProductIndex].name'),
      effectFilter('sourceRootName', 'products'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Dynamic object keyed template reads should preserve the authored key expression and owner source route.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('sourceName', 'productLookup[selectedProductId]'),
      effectFilter('keyExpression', 'selectedProductId'),
      effectFilter('observedMemberSource.path', 'src/template-collection-observation-app.ts'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Collection reads reached through a dynamic keyed object should preserve the full source route.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-collection-read'),
      effectFilter('sourceName', 'productLookup[selectedProductId].tags'),
      effectFilter('methodName', 'includes'),
      effectFilter('observedMemberSource.path', 'src/template-collection-observation-app.ts'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.absent(
    'Contextual callback typing and derived collection calls should not produce weak-owner or missing-member diagnostics.',
    'template-diagnostic',
    'template',
    null,
    [],
  ),
];

const snapshot = readAuthoringVerificationSnapshot(app);
const verification = verifyAuthoringEffects(
  new AuthoringVerificationRequest(null, expectedEffects),
  snapshot,
);
const failures = verification.effectResults
  .filter((result) => result.outcome !== 'satisfied')
  .map((result) => result.summary);
failures.push(...exactSourceSpanFailures(snapshot.bindingObservedDependencies, [
  {
    summary: 'Template sort collection dependency should publish its own expression source span, not the enclosing binding value.',
    path: 'src/template-collection-observation-app.html',
    sourceName: 'products',
    methodName: 'sort',
  },
  {
    summary: 'Template sort left comparator dependency should publish the exact left.id source span.',
    path: 'src/template-collection-observation-app.html',
    sourceName: 'left.id',
  },
  {
    summary: 'Template sort right comparator dependency should publish the exact right.id source span.',
    path: 'src/template-collection-observation-app.html',
    sourceName: 'right.id',
  },
]));

const summary = {
  fixture: 'template-collection-observation',
  expectedEffects: expectedEffects.length,
  verification: verification.effectResults.map((result) => ({
    effectKind: result.expectedEffect.effectKind,
    outcome: result.outcome,
    summary: result.summary,
  })),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

function effectFilter(field, value) {
  return new ExpectedSemanticEffectFilter(field, value);
}
