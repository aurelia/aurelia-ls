import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildGeneratedAuthoringFixturePlan,
  generatedAuthoringFixturePlanRequests,
} from '../out/authoring/generated-fixture-plan.js';
import { writeAuthoringSourcePlan } from './authoring-source-plan-writer.mjs';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/authoring');

for (const fixture of generatedAuthoringFixturePlanRequests()) {
  const rootDir = path.join(fixtureRoot, fixture.folderName);
  const plan = buildGeneratedAuthoringFixturePlan(rootDir, fixture);
  await materializeFixturePlan(fixture.folderName, plan);
}

async function materializeFixturePlan(folderName, plan) {
  if (plan.sourcePlan == null) {
    console.log(`${folderName}: skipped, no source plan`);
    return;
  }
  await resetGeneratedFixtureRoot(plan.sourcePlan.rootDir, folderName);
  await writeAuthoringSourcePlan(plan.sourcePlan, folderName);
  console.log(`${folderName}: source=${plan.sourcePlan?.files.length ?? 0}, tooling=${plan.sourcePlan?.projectTooling?.files.length ?? 0}`);
}

async function resetGeneratedFixtureRoot(rootDir, folderName) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedFixtureRoot = path.resolve(fixtureRoot);
  const expectedPrefix = `${resolvedFixtureRoot}${path.sep}`;
  if (!folderName.startsWith('generated-') || !resolvedRoot.startsWith(expectedPrefix)) {
    throw new Error(`Refusing to reset non-generated authoring fixture root: ${rootDir}`);
  }
  await rm(resolvedRoot, { recursive: true, force: true });
}
