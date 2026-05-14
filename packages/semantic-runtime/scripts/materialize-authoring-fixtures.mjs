import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AuthoringRecipeDescriptors,
  buildAuthoringRecipePlan,
} from '../out/authoring/recipe.js';
import { writeAuthoringSourcePlan } from './authoring-source-plan-writer.mjs';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/authoring');

for (const descriptor of Object.values(AuthoringRecipeDescriptors)) {
  const folderName = `generated-${descriptor.key}`;
  const rootDir = path.join(fixtureRoot, folderName);
  const plan = buildAuthoringRecipePlan(descriptor.key, rootDir, folderName);
  if (plan.sourcePlan == null) {
    console.log(`${folderName}: skipped, no source plan`);
    continue;
  }
  await resetGeneratedFixtureRoot(rootDir, folderName);
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
