import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  RouterNavigationTargetKind,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

const storefront = await openFixture('app-pattern-routed-catalog-storefront');
assertRouteTarget(storefront, {
  marker: 'load="items"',
  needle: 'items',
  targetKind: RouterNavigationTargetKind.RoutePath,
  matchedName: 'items',
  targetText: "'items'",
});
assertRouteTarget(storefront, {
  marker: 'items/item-1?ref=featured#details',
  needle: 'item-1',
  targetKind: RouterNavigationTargetKind.RoutePath,
  matchedName: 'items/:itemId',
  targetText: "'items/:itemId'",
});
assertNoRouteTarget(storefront, 'items/item-1?ref=featured#details', 'ref');
assertNoRouteTarget(storefront, 'items/item-1?ref=featured#details', 'details');

const routeRows = storefront.app.ask({
  kind: SemanticAppQueryKind.Routes,
  detail: 'handles',
  page: { size: 100 },
}).value.rows;
const itemsRoute = routeRows.find((row) => row.id === 'items' && row.stage === 'applied');
assert.ok(itemsRoute, 'Expected the applied items RouteConfig row.');
assert.equal(sourceTextAt(storefront.root, itemsRoute.idSource), "'items'");
assert.deepEqual(itemsRoute.pathSources.map((source) => sourceTextAt(storefront.root, source)), ["'items'"]);
assert.ok(itemsRoute.handles?.idSourceAddressHandle != null, 'Expected the exact id source handle.');
assert.equal(itemsRoute.handles?.pathSourceAddressHandles.length, 1);
assert.ok(itemsRoute.handles?.pathSourceAddressHandles[0] != null, 'Expected the exact path source handle.');

const parameters = await openFixture('router-parameter-completion', 'src/routes/parameter-workspace.html');
assertRouteTarget(parameters, {
  marker: 'route: product-detail; params.bind',
  needle: 'product-detail',
  targetKind: RouterNavigationTargetKind.RouteId,
  matchedName: 'product-detail',
  targetText: "'product-detail'",
});
assertRouteTarget(parameters, {
  marker: "route.bind: 'product-detail'",
  needle: 'product-detail',
  targetKind: RouterNavigationTargetKind.RouteId,
  matchedName: 'product-detail',
  targetText: "'product-detail'",
});
assertRouteTarget(parameters, {
  marker: 'route.bind: productRoute',
  needle: 'productRoute',
  targetKind: RouterNavigationTargetKind.RouteId,
  matchedName: 'product-detail',
  targetText: "'product-detail'",
});
assertNoRouteTarget(parameters, 'route.bind: selectedRoute', 'selectedRoute');

console.log(JSON.stringify({
  storefront: {
    routeTargets: 2,
    nonPathCursorRefusals: 2,
    exactRouteConfigSources: true,
  },
  parameterWorkspace: {
    routeIdTargets: 3,
    openRouteRefusals: 1,
  },
}, null, 2));

async function openFixture(name, filePath = 'src/app.html') {
  const root = path.join(packageRoot, 'fixtures/pressure', name);
  const sourceText = fs.readFileSync(path.join(root, filePath), 'utf8');
  const runtime = await createSemanticRuntime({
    workspaceRoot: root,
    storeKey: `contract:template-route-definition:${name}`,
  });
  const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
  return { root, filePath, sourceText, app };
}

function assertRouteTarget(fixture, expected) {
  const target = cursorInfo(fixture, expected.marker, expected.needle).value.selectedRouteTarget;
  assert.ok(target, `Expected ${expected.targetKind} target at ${expected.marker}.`);
  assert.equal(target.targetKind, expected.targetKind);
  assert.equal(target.matchedName, expected.matchedName);
  assert.equal(sourceTextAt(fixture.root, target.targetSource), expected.targetText);
  assert.ok(target.source != null, 'Expected the enclosing RouteConfig declaration carrier.');
  assert.ok(target.handles?.routeConfigProductHandle != null, 'Expected the selected RouteConfig handle.');
  assert.ok(target.handles?.targetSourceAddressHandle != null, 'Expected the exact selected target source handle.');
}

function assertNoRouteTarget(fixture, marker, needle) {
  assert.equal(cursorInfo(fixture, marker, needle).value.selectedRouteTarget, null);
}

function cursorInfo(fixture, marker, needle) {
  const markerOffset = fixture.sourceText.indexOf(marker);
  assert.notEqual(markerOffset, -1, `Expected marker: ${marker}`);
  const needleOffset = fixture.sourceText.indexOf(needle, markerOffset);
  assert.notEqual(needleOffset, -1, `Expected needle ${needle} after ${marker}.`);
  const offset = needleOffset + Math.min(1, needle.length - 1);
  const lines = fixture.sourceText.slice(0, offset).split(/\r?\n/u);
  return fixture.app.ask({
    kind: SemanticAppQueryKind.TemplateCursorInfo,
    detail: 'handles',
    cursor: {
      filePath: fixture.filePath,
      line: lines.length - 1,
      character: lines.at(-1).length,
      offset,
    },
  });
}

function sourceTextAt(fixtureRoot, source) {
  if (source == null || source.path == null || source.start == null || source.end == null) {
    return null;
  }
  const sourcePath = path.isAbsolute(source.path)
    ? source.path
    : path.join(fixtureRoot, source.path);
  return fs.readFileSync(sourcePath, 'utf8').slice(source.start, source.end);
}
