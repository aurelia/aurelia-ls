import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AppBuilderSeedProfileId,
  AppBuilderStarterIntentId,
  AppBuilderWorkflowId,
  AppBuilderDomainPresetId,
  AppBuilderSeedDataSetId,
  sourcePlanHasCompleteText,
  buildAppBuilderStarter,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/app-builder/goldens');

const fixtures = [
  {
    folderName: 'minimal-app-shell-convention',
    selection: {
      workflowId: AppBuilderWorkflowId.NewAppStarter,
      seedProfileId: AppBuilderSeedProfileId.MinimalRunnable,
      intentId: AppBuilderStarterIntentId.MinimalAppStarter,
      compositionId: 'minimal-app-shell.convention',
    },
  },
  {
    folderName: 'minimal-app-shell-decorator',
    selection: {
      workflowId: AppBuilderWorkflowId.NewAppStarter,
      seedProfileId: AppBuilderSeedProfileId.MinimalRunnable,
      intentId: AppBuilderStarterIntentId.MinimalAppStarter,
      compositionId: 'minimal-app-shell.decorator',
    },
  },
  {
    folderName: 'task-list-clean-starter',
    appName: 'Task List',
    selection: {
      workflowId: AppBuilderWorkflowId.NewAppStarter,
      seedProfileId: AppBuilderSeedProfileId.CleanStarter,
      intentId: AppBuilderStarterIntentId.CollectionListStarter,
      compositionId: 'state-backed-collection-list.convention',
      domainPresetId: AppBuilderDomainPresetId.TaskList,
      seedDataSetId: AppBuilderSeedDataSetId.TaskListPublicSmall,
    },
  },
];

for (const fixture of fixtures) {
  const rootDir = path.join(fixtureRoot, fixture.folderName);
  const generated = buildAppBuilderStarter(fixture.selection, {
    rootDir,
    appName: fixture.appName ?? fixture.folderName,
  });
  await resetFixtureRoot(rootDir);
  await writeSourcePlan(rootDir, generated.sourcePlan);
  await writeManifest(rootDir, generated);
  console.log(`${fixture.folderName}: source=${generated.sourcePlan.files.length}, complete=${sourcePlanHasCompleteText(generated.sourcePlan)}`);
}

async function resetFixtureRoot(rootDir) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedFixtureRoot = path.resolve(fixtureRoot);
  const expectedPrefix = `${resolvedFixtureRoot}${path.sep}`;
  if (!resolvedRoot.startsWith(expectedPrefix)) {
    throw new Error(`Refusing to reset app-builder fixture outside ${fixtureRoot}: ${rootDir}`);
  }
  await rm(resolvedRoot, { recursive: true, force: true });
  await mkdir(resolvedRoot, { recursive: true });
}

async function writeSourcePlan(rootDir, sourcePlan) {
  for (const file of sourcePlan.files) {
    if (file.text?.text == null) {
      throw new Error(`Cannot materialize ${file.path}: source text is not present.`);
    }
    const filePath = path.join(rootDir, file.path);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, file.text.text);
  }
}

async function writeManifest(rootDir, generated) {
  const manifest = {
    schemaVersion: 'app-builder-golden.v1',
    workflowId: generated.workflowId,
    stageId: generated.stageId,
    selection: generated.selection,
    preview: {
      seedProfileId: generated.preview.seedProfile.id,
      starterIntentId: generated.preview.starterIntent.id,
      compositionId: generated.preview.composition.id,
      domainPresetId: generated.preview.domainPreset?.id ?? null,
      seedDataSetId: generated.preview.seedDataSet?.id ?? null,
      patternIds: generated.preview.composition.patternIds,
      aureliaLoweringChoiceIds: generated.preview.aureliaLoweringChoiceDescriptors.map((choice) => choice.id),
      sourcePolicy: generated.preview.sourcePolicy,
      sourceFiles: generated.preview.sourceFiles,
      expectedEffectKinds: generated.preview.expectedEffectKinds,
    },
  };
  await writeFile(
    path.join(rootDir, 'app-builder.golden.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}
