import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  SEMANTIC_RESOURCE_INVENTORY_KINDS,
  SemanticAppQueryKind,
  SemanticResourceInventoryLocalityKind,
  SemanticResourceInventoryOriginKind,
  SemanticResourceNavigationUnavailableReason,
  SemanticRuntimeAnswerSelection,
  SemanticRuntimeDetail,
  type SemanticResourceInventoryResult,
  type SemanticRuntimeAnswer,
  type SemanticTemplateResourceAvailabilityResult,
} from '../src/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('resource discovery', () => {
  test('projects stable resource identity, exact source roles, local ownership, and framework provenance', async () => {
    const fixtureRoot = pressureFixtureRoot('resource-registration-local-templates');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'resource-discovery-inventory',
    });
    const first = await resourceInventory(runtime);
    const firstRows = first.value.rows;

    expect(first.selection).toBe(SemanticRuntimeAnswerSelection.NotApplicable);
    expect(firstRows).not.toHaveLength(0);
    expect(firstRows.every((row) => SEMANTIC_RESOURCE_INVENTORY_KINDS.includes(row.resourceKind))).toBe(true);
    expect(first.value.completeness.excludedCompilerSyntax).toBeGreaterThan(0);
    expect(firstRows.every((row) => row.identityKey.includes(':v1:'))).toBe(true);
    expect(new Set(firstRows.map((row) => row.identityKey)).size).toBe(firstRows.length);

    const app = requireInventoryRow(first.value, 'custom-element', 'local-templates-app');
    expect(app.origin).toMatchObject({
      kind: SemanticResourceInventoryOriginKind.Project,
      projectKey: 'resource-registration-local-templates',
      moduleKey: 'src/local-templates-app.ts',
    });
    expect(app.sources.publicName).toMatchObject({
      path: 'src/local-templates-app.ts',
      role: 'name',
    });
    expect(app.sources.implementation).toMatchObject({
      path: 'src/local-templates-app.ts',
      role: 'name',
    });

    const repeat = requireInventoryRow(first.value, 'template-controller', 'repeat');
    expect(repeat.origin).toMatchObject({
      kind: SemanticResourceInventoryOriginKind.Framework,
      packageName: '@aurelia/runtime-html',
      catalogGroup: 'default-resources',
    });
    expect(repeat.sources.publicName).toBeNull();
    expect(repeat.sources.navigationUnavailableReason).toBe(
      SemanticResourceNavigationUnavailableReason.ExternalCatalog,
    );

    const localChips = firstRows.filter((row) =>
      row.name === 'local-chip'
      && row.locality.kind === SemanticResourceInventoryLocalityKind.LocalTemplate
    );
    expect(localChips).toHaveLength(2);
    expect(new Set(localChips.map((row) => row.identityKey)).size).toBe(2);
    expect(new Set(localChips.map((row) => row.locality.ownerName))).toEqual(
      new Set(['local-templates-app', 'secondary-host']),
    );
    const primaryLocalChip = localChips.find((row) => row.locality.ownerName === 'local-templates-app');
    expect(primaryLocalChip?.sources.publicName).toMatchObject({
      path: 'src/local-templates-app.html',
      start: 42,
      end: 52,
    });
    expect(primaryLocalChip?.bindables).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'label',
        attribute: 'public-label',
        nameSource: expect.objectContaining({ start: 75, end: 80 }),
        attributeSource: expect.objectContaining({ start: 93, end: 105 }),
      }),
    ]));

    const firstIdentityBySemanticLocus = inventoryIdentityBySemanticLocus(first.value);
    runtime.clearAnalysisCache();
    const second = await resourceInventory(runtime);
    expect(inventoryIdentityBySemanticLocus(second.value)).toEqual(firstIdentityBySemanticLocus);

    const visibility = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.ResourceVisibility,
      detail: SemanticRuntimeDetail.Handles,
      includeAuthoringTemplates: true,
      page: { size: 500 },
    });
    const repeatVisibility = visibility.value.rows.find((row) =>
      row.resourceKind === 'template-controller' && row.name === 'repeat'
    );
    expect(repeatVisibility?.handles?.resourceIdentityHandle).not.toBeNull();
  }, 60_000);

  test('selects one exact template compiler scope without unioning local resources', async () => {
    const fixtureRoot = pressureFixtureRoot('resource-registration-local-templates');
    const primaryTemplate = path.join(fixtureRoot, 'src/local-templates-app.html');
    const secondaryTemplate = path.join(fixtureRoot, 'src/secondary-host.html');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'resource-discovery-availability',
    });

    const primary = await templateAvailability(runtime, primaryTemplate, '<local-chip public-label');
    expect(primary.selection).toBe(SemanticRuntimeAnswerSelection.Exact);
    expect(primary.value.selectedTemplate).toMatchObject({
      definitionName: 'local-templates-app',
      compilationLane: 'app-runtime',
    });
    expect(localTemplateOwners(primary.value)).toEqual(new Set(['local-templates-app']));
    const primaryLocalChip = primary.value.rows.find((row) =>
      row.resource.name === 'local-chip'
      && row.resource.locality.kind === SemanticResourceInventoryLocalityKind.LocalTemplate
    );
    expect(primaryLocalChip?.availabilitySource).toMatchObject({
      path: 'src/local-templates-app.html',
      start: 13,
      end: 250,
    });
    const repeat = primary.value.rows.find((row) => row.resource.name === 'repeat');
    expect(repeat?.resource.sources.declaration).toMatchObject({
      kind: 'external-address',
      scheme: 'aurelia-package-catalog',
    });
    expect(repeat?.availabilitySource).toMatchObject({
      path: 'src/main.ts',
      role: 'range',
    });

    const secondary = await templateAvailability(runtime, secondaryTemplate, '<local-chip');
    expect(secondary.selection).toBe(SemanticRuntimeAnswerSelection.Exact);
    expect(secondary.value.selectedTemplate?.definitionName).toBe('secondary-host');
    expect(localTemplateOwners(secondary.value)).toEqual(new Set(['secondary-host']));
  }, 60_000);

  test('reports equally specific app-root scopes as ambiguous instead of selecting or unioning them', async () => {
    const fixtureRoot = pressureFixtureRoot('plugin-capability-app-root-isolation');
    const templateFile = path.join(fixtureRoot, 'src/shared-plugin-app.html');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'resource-discovery-ambiguous-scope',
    });

    const answer = await templateAvailability(runtime, templateFile, '<template>');

    expect(answer.selection).toBe(SemanticRuntimeAnswerSelection.Ambiguous);
    expect(answer.value.selectedTemplate).toBeNull();
    expect(answer.value.rows).toEqual([]);
    expect(answer.value.candidates).toHaveLength(2);
    expect(new Set(answer.value.candidates.map((candidate) => candidate.scopeIdentityKey)).size).toBe(2);
    expect(new Set(answer.value.candidates.map((candidate) => candidate.templateIdentityKey)).size).toBe(1);
  }, 60_000);
});

async function resourceInventory(
  runtime: Awaited<ReturnType<typeof createSemanticRuntime>>,
): Promise<SemanticRuntimeAnswer<SemanticResourceInventoryResult>> {
  return await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.ResourceInventory,
    includeAuthoringTemplates: true,
    page: { size: 500 },
  }) as SemanticRuntimeAnswer<SemanticResourceInventoryResult>;
}

async function templateAvailability(
  runtime: Awaited<ReturnType<typeof createSemanticRuntime>>,
  filePath: string,
  marker: string,
): Promise<SemanticRuntimeAnswer<SemanticTemplateResourceAvailabilityResult>> {
  const offset = readFileSync(filePath, 'utf8').indexOf(marker);
  expect(offset).toBeGreaterThanOrEqual(0);
  return await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.TemplateResourceAvailability,
    cursor: { filePath, offset },
    includeAuthoringTemplates: true,
  }) as SemanticRuntimeAnswer<SemanticTemplateResourceAvailabilityResult>;
}

function requireInventoryRow(
  result: SemanticResourceInventoryResult,
  resourceKind: string,
  name: string,
): SemanticResourceInventoryResult['rows'][number] {
  const row = result.rows.find((candidate) =>
    candidate.resourceKind === resourceKind && candidate.name === name
  );
  if (row == null) {
    throw new Error(`Expected resource inventory row ${resourceKind}:${name}.`);
  }
  return row;
}

function inventoryIdentityBySemanticLocus(result: SemanticResourceInventoryResult): ReadonlyMap<string, string> {
  return new Map(result.rows.map((row) => [
    JSON.stringify([
      row.resourceKind,
      row.name,
      row.origin.kind,
      row.locality.ownerName,
      row.sources.publicName?.path,
      row.sources.publicName?.start,
    ]),
    row.identityKey,
  ]));
}

function localTemplateOwners(result: SemanticTemplateResourceAvailabilityResult): ReadonlySet<string | null> {
  return new Set(result.rows
    .filter((row) => row.resource.locality.kind === SemanticResourceInventoryLocalityKind.LocalTemplate)
    .map((row) => row.resource.locality.ownerName));
}

function pressureFixtureRoot(fixtureName: string): string {
  return path.join(packageRoot, 'fixtures/pressure', fixtureName);
}
