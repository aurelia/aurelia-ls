import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootWorkspace } from '../out/boot/boot-workspace.js';
import { BootProjectDiscoveryMode } from '../out/boot/frames.js';
import { evaluateAureliaProject } from '../out/configuration/aurelia-project-evaluation.js';
import { StaticProjectEvaluationSourceOriginKind } from '../out/evaluation/project-evaluation.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/router-route-config-identity');
const workspace = bootWorkspace({
  rootDir: fixtureRoot,
  projectDiscovery: BootProjectDiscoveryMode.SingleRoot,
});
const evaluation = evaluateAureliaProject(workspace.projects[0]);
const lazyRouteResults = evaluation.sources.filter((source) => source.moduleKey === 'src/routes/lazy-route.ts');

assert.equal(lazyRouteResults.length, 1, 'A graph dependency later admitted as a root must retain one published source result.');
const lazyRoute = lazyRouteResults[0];
assert.ok(lazyRoute.evaluation != null, 'Root evaluation must replace an earlier graph-only placeholder result.');
assert.deepEqual(
  lazyRoute.origins.map((origin) => origin.kind),
  [
    StaticProjectEvaluationSourceOriginKind.ModuleGraphDependency,
    StaticProjectEvaluationSourceOriginKind.StaticEvaluationRoot,
  ],
  'The replacement result must retain both graph-dependency and root-admission provenance.',
);

console.log(JSON.stringify({
  ok: true,
  moduleKey: lazyRoute.moduleKey,
  originKinds: lazyRoute.origins.map((origin) => origin.kind),
}, null, 2));
