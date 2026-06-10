import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FixtureVerificationRequest,
  createSemanticRuntime,
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
  readFixtureVerificationSnapshot,
  verifyFixtureEffects,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/trackable-method-dependencies');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'trackable-method-observation-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const expectedEffects = [
  ExpectedSemanticEffect.fact(
    'Template call-scope binding should still expose the called computed method.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('sourceName', 'featuredProductNames'),
      effectFilter('methodName', 'featuredProductNames'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Deps-omitted trackable method calls should observe the products collection property through proxy execution.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'proxy-property-read'),
      effectFilter('sourceName', 'this.products'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Deps-omitted trackable method calls should observe array filtering through proxy execution.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'proxy-collection-read'),
      effectFilter('sourceName', 'this.products'),
      effectFilter('methodName', 'filter'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Deps-omitted trackable method callback values should observe product tag membership through proxy execution.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'proxy-collection-read'),
      effectFilter('sourceName', 'product.tags'),
      effectFilter('methodName', 'includes'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Deps-omitted trackable for-of methods should observe the iterable collection through proxy execution.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'proxy-collection-read'),
      effectFilter('sourceName', 'this.products'),
      effectFilter('methodName', 'Symbol.iterator'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Deps-omitted trackable for-of loop variables should remain proxy-observable inside the method body.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'proxy-property-read'),
      effectFilter('sourceName', 'product.name'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Explicit trackable method deps should add their configured string dependency without proxy-observing the body.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('sourceName', 'filter'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'AstTrack function deps should add proxy-observed selected label reads.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'proxy-property-read'),
      effectFilter('sourceName', 'vm.selected.label'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.absent(
    'Explicit deps mode should not proxy-observe the method body selected label.',
    'binding-observed-dependency',
    'template',
    null,
    [
      effectFilter('dependencyKind', 'proxy-property-read'),
      effectFilter('sourceName', 'this.selected.label'),
    ],
  ),
  ExpectedSemanticEffect.fact(
    'Nullish @computed method deps should behave like omitted deps and proxy-observe the method body.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'proxy-property-read'),
      effectFilter('sourceName', 'this.nullishCounter.value'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Nullish @astTrack method deps should behave like omitted deps and proxy-observe the method body.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'proxy-property-read'),
      effectFilter('sourceName', 'this.nullishAstTrackCounter.value'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Undecorated method calls should expose the called method as an ordinary template read.',
    'binding-observed-dependency',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('dependencyKind', 'template-expression-read'),
      effectFilter('sourceName', 'ordinaryCounterLabel'),
      effectFilter('methodName', 'ordinaryCounterLabel'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Undecorated method calls with hidden body reads should surface an observation warning.',
    'observation-issue',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('phase', 'binding-observation'),
      effectFilter('issueKind', 'non-trackable-template-method-call'),
      effectFilter('severity', 'warning'),
      effectFilter('subjectName', 'ordinaryCounterLabel'),
      effectFilter('suggestion.suggestionKind', 'make-method-trackable'),
      effectFilter('suggestion.actionTarget.targetKind', 'observer-config'),
      effectFilter('suggestion.actionTarget.memberName', 'ordinaryCounterLabel'),
      effectFilter('message', 'Template method call "ordinaryCounterLabel(...)" reads this.ordinaryCounter.value inside an undecorated method. Aurelia observes the template call and its arguments, but not arbitrary method bodies; add @computed(...), convert the read to a getter, or bind the dependency directly when the result must update with those reads.'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Parameterized undecorated method calls should also warn when their body reads hidden state.',
    'observation-issue',
    'template',
    null,
    'present',
    null,
    [
      effectFilter('phase', 'binding-observation'),
      effectFilter('issueKind', 'non-trackable-template-method-call'),
      effectFilter('severity', 'warning'),
      effectFilter('subjectName', 'someCheck'),
      effectFilter('suggestion.suggestionKind', 'make-method-trackable'),
      effectFilter('suggestion.actionTarget.targetKind', 'observer-config'),
      effectFilter('suggestion.actionTarget.memberName', 'someCheck'),
      effectFilter('message', 'Template method call "someCheck(...)" reads this.comparisonTarget inside an undecorated method. Aurelia observes the template call and its arguments, but not arbitrary method bodies; add @computed(...), convert the read to a getter, or bind the dependency directly when the result must update with those reads.'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.fact(
    'Trackable-method fixture should expose only the two intentionally non-trackable observation warnings.',
    'observation-issue',
    'template',
    null,
    'exactly',
    2,
    [
      effectFilter('phase', 'binding-observation'),
      effectFilter('issueKind', 'non-trackable-template-method-call'),
      effectFilter('severity', 'warning'),
      effectFilter('suggestion.suggestionKind', 'make-method-trackable'),
    ],
    'signature',
  ),
  ExpectedSemanticEffect.absent(
    'Undecorated method calls should not proxy-observe their method body.',
    'binding-observed-dependency',
    'template',
    null,
    [
      effectFilter('dependencyKind', 'proxy-property-read'),
      effectFilter('sourceName', 'this.ordinaryCounter.value'),
    ],
  ),
];

const snapshot = readFixtureVerificationSnapshot(app);
const verification = verifyFixtureEffects(
  new FixtureVerificationRequest(null, expectedEffects),
  snapshot,
);
const failures = verification.effectResults
  .filter((result) => result.outcome !== 'satisfied')
  .map((result) => result.summary);

const summary = {
  fixture: 'trackable-method-dependencies',
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
