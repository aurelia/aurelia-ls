import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ExpectedSemanticEffect,
  ExpectedSemanticEffectKind,
  ExpectedSemanticEffectScope,
  ExpectedSemanticEffectTopologyNodeKind,
  assertAppBuilderPartCatalogIntegrity,
  assertAppBuilderPartSourceLoweringIntegrity,
  appBuilderSourceLoweringRequestFieldRegistryCoverageRows,
  appBuilderSourceLoweringRequestFieldRegistryCoverageRowsInSummaryScope,
  appBuilderSourceLoweringRequestFieldRegistryCoverageSummary,
  AppBuilderSourceLoweringRequestFieldRegistryOwnerKind,
  AppBuilderSourceLoweringSurfaceKind,
  appBuilderProjectToolingExpectedEffects,
  expectedSemanticEffectFilters,
  sourcePlanHasCompleteText,
} from '../out/index.js';
import {
  appBuilderPartSourceGallerySourcePlan,
  assertAppBuilderPartSourceGalleryCoverage,
} from '../out/app-builder/part-source-gallery.js';
import {
  appBuilderSourceLoweringGalleryPlans,
} from '../out/app-builder/source-lowering-gallery.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const pressureFixtureRoot = path.join(packageRoot, 'fixtures/pressure');

assertAppBuilderPartCatalogIntegrity();
assertAppBuilderPartSourceLoweringIntegrity();

const galleryRoot = path.join(pressureFixtureRoot, 'app-builder-part-source-gallery');
const gallerySourcePlan = appBuilderPartSourceGallerySourcePlan({
  rootDir: galleryRoot,
  appName: 'Aurelia Part Source Gallery',
});
assertAppBuilderPartSourceGalleryCoverage(gallerySourcePlan);
await resetPressureFixtureRoot(galleryRoot);
await writeSourcePlan(galleryRoot, gallerySourcePlan);
await writeSemanticFixtureManifest(galleryRoot, {
  pressureOrigin: 'app-builder-part-source-gallery',
  appPatternKey: 'app-builder-part-source-gallery',
  expectedEffects: appBuilderPartSourceGalleryExpectedEffects(),
});
console.log(`app-builder-part-source-gallery: source=${gallerySourcePlan.files.length}, complete=${sourcePlanHasCompleteText(gallerySourcePlan)}`);

const sourceLoweringGalleryIndexRows = [];
for (const plan of appBuilderSourceLoweringGalleryPlans({
  rootDir: pressureFixtureRoot,
  appName: 'Aurelia Source Gallery',
})) {
  await resetPressureFixtureRoot(plan.sourcePlan.rootDir);
  await writeSourcePlan(plan.sourcePlan.rootDir, plan.sourcePlan);
  await writeSemanticFixtureManifest(plan.sourcePlan.rootDir, {
    pressureOrigin: plan.fixtureId,
    appPatternKey: plan.fixtureId,
    expectedEffects: plan.expectedEffects,
    effectContractIds: plan.effectContractIds,
    sourceLoweringTargetRefs: plan.sourceLoweringTargetRefs,
    sourceLoweringRequestFieldUsageRows: plan.sourceLoweringRequestFieldUsageRows,
  });
  sourceLoweringGalleryIndexRows.push(sourceLoweringGalleryIndexRow(plan));
  console.log(`${plan.fixtureId}: source=${plan.sourcePlan.files.length}, complete=${sourcePlanHasCompleteText(plan.sourcePlan)}`);
}
await writeAppBuilderSourceLoweringPressureIndex(sourceLoweringGalleryIndexRows);

async function resetPressureFixtureRoot(rootDir) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedFixtureRoot = path.resolve(pressureFixtureRoot);
  const expectedPrefix = `${resolvedFixtureRoot}${path.sep}`;
  if (!resolvedRoot.startsWith(expectedPrefix)) {
    throw new Error(`Refusing to reset pressure fixture outside ${pressureFixtureRoot}: ${rootDir}`);
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
  for (const file of sourcePlan.projectTooling?.files ?? []) {
    const filePath = path.join(rootDir, file.path);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, file.text);
  }
}

async function writeSemanticFixtureManifest(rootDir, options) {
  const manifest = {
    schemaVersion: 'semantic-pressure-fixture.v1',
    fixtureRole: 'app-builder-source-lowering-pressure',
    pressureOrigin: options.pressureOrigin,
    appPatternKey: options.appPatternKey,
    expectedEffects: options.expectedEffects,
    ...(options.effectContractIds == null ? {} : { effectContractIds: options.effectContractIds }),
    ...(options.sourceLoweringTargetRefs == null ? {} : { sourceLoweringTargetRefs: options.sourceLoweringTargetRefs }),
    ...(options.sourceLoweringRequestFieldUsageRows == null ? {} : { sourceLoweringRequestFieldUsageRows: options.sourceLoweringRequestFieldUsageRows }),
  };
  await writeFile(
    path.join(rootDir, 'semantic-fixture.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

function sourceLoweringGalleryIndexRow(plan) {
  return {
    fixtureId: plan.fixtureId,
    folderName: plan.folderName,
    semanticFixturePath: `${plan.folderName}/semantic-fixture.json`,
    generatedSourceFiles: plan.sourcePlan.files.map((file) => ({
      path: `${plan.folderName}/${file.path}`,
      role: file.role,
      language: file.language,
      operationKind: file.operationKind,
      textAuthority: file.text?.authority ?? null,
    })),
    generatedProjectToolingFiles: (plan.sourcePlan.projectTooling?.files ?? []).map((file) => ({
      path: `${plan.folderName}/${file.path}`,
      fileKind: file.fileKind,
      language: file.language,
      textAuthority: file.textAuthority,
    })),
    sourceLoweringTargetRefs: plan.sourceLoweringTargetRefs,
    effectContractIds: plan.effectContractIds,
    expectedEffectCount: plan.expectedEffects.length,
    sourceLoweringRequestFieldUsageCount: plan.sourceLoweringRequestFieldUsageRows.length,
    sourceLoweringRequestFieldUsageIds: uniqueSortedStrings(plan.sourceLoweringRequestFieldUsageRows.map((row) => row.fieldId)),
    sourceLoweringRequestFieldUsageRows: plan.sourceLoweringRequestFieldUsageRows,
  };
}

async function writeAppBuilderSourceLoweringPressureIndex(rows) {
  const sourceLoweringRequestFieldCoverageScope = {
    summarizedRegistryOwnerKinds: [AppBuilderSourceLoweringRequestFieldRegistryOwnerKind.SourceLoweringTarget],
    summarizedSurfaceKinds: [
      AppBuilderSourceLoweringSurfaceKind.TargetInvocation,
      AppBuilderSourceLoweringSurfaceKind.FragmentComposition,
    ],
  };
  const allSourceLoweringRequestFieldCoverageRows = appBuilderSourceLoweringRequestFieldRegistryCoverageRows(rows.map((row) => ({
    sourceId: row.fixtureId,
    usageRows: row.sourceLoweringRequestFieldUsageRows,
  })));
  const sourceLoweringRequestFieldCoverageRows = appBuilderSourceLoweringRequestFieldRegistryCoverageRowsInSummaryScope(
    allSourceLoweringRequestFieldCoverageRows,
    sourceLoweringRequestFieldCoverageScope,
  );
  await writeJson(path.join(pressureFixtureRoot, 'app-builder-source-lowering-fixture-index.json'), {
    schemaVersion: 'app-builder-source-lowering-pressure-index.v1',
    fixtureRole: 'app-builder-source-lowering-pressure-index',
    generatedBy: 'packages/semantic-runtime/scripts/materialize-app-builder-fixtures.mjs',
    summary: 'Review index for focused app-builder source-lowering pressure fixtures and source-lowering request-field coverage.',
    fixtureCount: rows.length,
    sourceLoweringRequestFieldRegistryCoverageSummary: appBuilderSourceLoweringRequestFieldRegistryCoverageSummary(
      sourceLoweringRequestFieldCoverageRows,
      sourceLoweringRequestFieldCoverageScope,
    ),
    sourceLoweringRequestFieldRegistryCoverageRows: sourceLoweringRequestFieldCoverageRows,
    fixtures: rows,
  });
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function uniqueSortedStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string'))].sort();
}

function appBuilderPartSourceGalleryExpectedEffects() {
  return [
    ...appBuilderProjectToolingExpectedEffects('App-builder part source gallery'),
    ExpectedSemanticEffect.fact(
      'Part source gallery should reopen as an Aurelia app.',
      ExpectedSemanticEffectKind.ProjectShape,
    ),
    ExpectedSemanticEffect.signatureAtLeast(
      'Part source gallery should compile the generated template and nested controller source.',
      ExpectedSemanticEffectKind.TemplateCompilation,
      ExpectedSemanticEffectScope.Template,
      1,
      ExpectedSemanticEffectTopologyNodeKind.Template,
    ),
    ExpectedSemanticEffect.signatureAtLeast(
      'Part source gallery should hydrate runtime controllers from generated template source.',
      ExpectedSemanticEffectKind.RuntimeController,
      ExpectedSemanticEffectScope.Template,
      1,
      ExpectedSemanticEffectTopologyNodeKind.Component,
    ),
    ExpectedSemanticEffect.signatureAtLeast(
      'Part source gallery should expose generated value-channel facts.',
      ExpectedSemanticEffectKind.BindingValueChannel,
      ExpectedSemanticEffectScope.Template,
      12,
      ExpectedSemanticEffectTopologyNodeKind.TemplateBinding,
    ),
    ExpectedSemanticEffect.signatureAtLeast(
      'Part source gallery should expose generated binding behavior applications.',
      ExpectedSemanticEffectKind.BindingBehaviorApplication,
      ExpectedSemanticEffectScope.Template,
      8,
      ExpectedSemanticEffectTopologyNodeKind.TemplateBinding,
    ),
    ExpectedSemanticEffect.signatureAtLeast(
      'Part source gallery should expose generated binding data-flow facts.',
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectScope.Template,
      12,
      ExpectedSemanticEffectTopologyNodeKind.TemplateBinding,
    ),
    ExpectedSemanticEffect.signatureFact(
      'Part source gallery should register @aurelia/state and materialize the named users store.',
      ExpectedSemanticEffectKind.StateStore,
      ExpectedSemanticEffectScope.App,
      ExpectedSemanticEffectTopologyNodeKind.Plugin,
      undefined,
      undefined,
      expectedSemanticEffectFilters(['name', 'users']),
    ),
    ExpectedSemanticEffect.signatureFact(
      'Part source gallery should admit static i18n resources for generated translation bindings.',
      ExpectedSemanticEffectKind.I18nTranslationKey,
      ExpectedSemanticEffectScope.App,
      ExpectedSemanticEffectTopologyNodeKind.Plugin,
      undefined,
      undefined,
      expectedSemanticEffectFilters(['key', 'app.title']),
    ),
    ExpectedSemanticEffect.signatureAtLeast(
      'Part source gallery should expose generated i18n translation bindings.',
      ExpectedSemanticEffectKind.I18nTranslationBinding,
      ExpectedSemanticEffectScope.Template,
      1,
      ExpectedSemanticEffectTopologyNodeKind.TemplateBinding,
    ),
    ExpectedSemanticEffect.signatureAtLeast(
      'Part source gallery should expose router facts from generated load/href/viewport source.',
      ExpectedSemanticEffectKind.Route,
      ExpectedSemanticEffectScope.Route,
      1,
      ExpectedSemanticEffectTopologyNodeKind.Route,
    ),
    ExpectedSemanticEffect.signatureFact(
      'Part source gallery should expose validation-errors data flow.',
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectScope.Template,
      ExpectedSemanticEffectTopologyNodeKind.TemplateBinding,
      undefined,
      undefined,
      expectedSemanticEffectFilters(['targetProperty', 'errors']),
    ),
    ExpectedSemanticEffect.signatureFact(
      'Part source gallery should expose au-compose runtime composition facts.',
      ExpectedSemanticEffectKind.RuntimeComposition,
      ExpectedSemanticEffectScope.Template,
      ExpectedSemanticEffectTopologyNodeKind.Component,
    ),
  ];
}
