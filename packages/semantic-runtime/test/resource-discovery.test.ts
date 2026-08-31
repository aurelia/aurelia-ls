import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  createSemanticRuntime,
  SEMANTIC_RESOURCE_INVENTORY_KINDS,
  SemanticAppQueryKind,
  SemanticResourceInventoryCatalogOwnerKind,
  SemanticResourceInventoryLocalityKind,
  SemanticResourceInventoryNavigationRole,
  SemanticResourceInventoryOriginKind,
  SemanticResourceNavigationUnavailableReason,
  SemanticRuntimeAnswerCoverage,
  SemanticRuntimeAnswerResult,
  SemanticRuntimeAnswerSelection,
  SemanticRuntimeDetail,
  type SemanticResourceDefinitionsResult,
  type SemanticResourceInventoryResult,
  type SemanticRuntimeAnswer,
  type SemanticRuntimePageInput,
  type SemanticRuntimePagePolicy,
  type SemanticTemplateResourceAvailabilityResult,
} from '../src/index.js';
import { CheckerTypeShapeAccess } from '../src/type-system/checker-type-shape-access.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

afterEach(() => vi.restoreAllMocks());

describe('resource discovery', () => {
  test('projects stable resource identity, exact source roles, local ownership, and framework provenance', async () => {
    const fixtureRoot = pressureFixtureRoot('resource-registration-local-templates');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'resource-discovery-inventory',
    });
    await runtime.openApp({
      analysisDepth: 'runtime-topology',
      templateAnalysisBreadth: 'resource-local',
      includeAuthoringTemplates: true,
    });
    const memberValueAccess = vi.spyOn(CheckerTypeShapeAccess.prototype, 'memberValueAccess');
    const first = await resourceInventory(runtime);
    const firstRows = first.value.rows;

    expect(first.selection).toBe(SemanticRuntimeAnswerSelection.NotApplicable);
    expect(first.value.typeSurfacesIncluded).toBe(false);
    expect(memberValueAccess).not.toHaveBeenCalled();
    expect(firstRows.every((row) => row.bindables.every(hasEmptyTypeSurface))).toBe(true);
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
      catalogOwnerKind: null,
    });
    expect(app.sources.publicName).toMatchObject({
      path: 'src/local-templates-app.ts',
      role: 'name',
    });
    expect(app.sources.implementation).toMatchObject({
      path: 'src/local-templates-app.ts',
      role: 'name',
    });
    expect(app.sources.navigation).toEqual(app.sources.publicName);
    expect(app.sources.navigationRole).toBe(SemanticResourceInventoryNavigationRole.PublicName);

    const repeat = requireInventoryRow(first.value, 'template-controller', 'repeat');
    expect(repeat.origin).toMatchObject({
      kind: SemanticResourceInventoryOriginKind.Framework,
      packageName: '@aurelia/runtime-html',
      catalogGroup: 'default-resources',
      catalogOwnerKind: SemanticResourceInventoryCatalogOwnerKind.CoreFramework,
    });
    expect(repeat.sources.publicName).toBeNull();
    expect(repeat.sources.navigationRole).toBeNull();
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
    expect(localChips.every((row) =>
      row.origin.kind === SemanticResourceInventoryOriginKind.Project
      && row.origin.catalogOwnerKind == null
    )).toBe(true);
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
        navigationSource: expect.objectContaining({ start: 75, end: 80 }),
        navigationRole: SemanticResourceInventoryNavigationRole.BindableName,
      }),
    ]));

    const firstIdentityBySemanticLocus = inventoryIdentityBySemanticLocus(first.value);
    const compactSemanticFacts = inventoryFactsWithoutTypeSurfaces(first.value);
    memberValueAccess.mockClear();
    const rich = await resourceInventory(runtime, true);
    const richAccessKeys = memberValueAccess.mock.calls.map((call) => call[2]);
    expect(rich.value.typeSurfacesIncluded).toBe(true);
    expect(richAccessKeys.length).toBeGreaterThan(0);
    expect(richAccessKeys).toHaveLength(new Set(richAccessKeys).size);
    expect(rich.value.rows.some((row) => row.bindables.some((bindable) => bindable.valueType != null))).toBe(true);
    expect(inventoryFactsWithoutTypeSurfaces(rich.value)).toEqual(compactSemanticFacts);
    memberValueAccess.mockRestore();

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

  test('classifies core framework and official plugin resource catalogs at the semantic owner', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: pressureFixtureRoot('registered-plugin-capabilities'),
      storeKey: 'resource-discovery-catalog-owner-kind',
    });
    await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.Summary,
      includeAuthoringTemplates: true,
      appRetention: 'retain-app',
    });

    const inventory = await resourceInventory(runtime);
    const catalogRows = inventory.value.rows.filter((row) =>
      row.origin.kind === SemanticResourceInventoryOriginKind.Framework
    );
    const runtimeHtmlRows = catalogRows.filter((row) => row.origin.packageName === '@aurelia/runtime-html');
    const pluginRows = catalogRows.filter((row) => row.origin.packageName !== '@aurelia/runtime-html');

    expect(runtimeHtmlRows.length).toBeGreaterThan(0);
    expect(runtimeHtmlRows.every((row) =>
      row.origin.catalogOwnerKind === SemanticResourceInventoryCatalogOwnerKind.CoreFramework
    )).toBe(true);
    expect(new Set(pluginRows.map((row) => row.origin.packageName))).toEqual(new Set([
      '@aurelia/i18n',
      '@aurelia/router',
      '@aurelia/state',
      '@aurelia/ui-virtualization',
      '@aurelia/validation-html',
    ]));
    expect(pluginRows.every((row) =>
      row.origin.catalogOwnerKind === SemanticResourceInventoryCatalogOwnerKind.OfficialPlugin
    )).toBe(true);
    expect(inventory.value.rows.every((row) =>
      row.origin.kind === SemanticResourceInventoryOriginKind.Framework
      || row.origin.catalogOwnerKind == null
    )).toBe(true);

    runtime.clearAnalysisCache();
  }, 60_000);

  test('keeps the effective TypeScript owner identity and disambiguates shadowed declaration variants', async () => {
    const fixtureRoot = pressureFixtureRoot('resource-registration-effective-definitions');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'resource-discovery-declaration-owner-collisions',
    });
    const collisionPairs = [
      {
        effective: 'decorator-behavior-effective',
        effectiveIdentityKey: 'typescript-resource:v1:N_9wQxcFLJ9PKt90tj7VZl',
        shadowed: 'static-behavior-shadowed',
        shadowedIdentityKey: 'typescript-resource:v1:ahqNZkgGAXtlgKb6VZsI8o',
      },
      {
        effective: 'decorator-attribute-effective',
        effectiveIdentityKey: 'typescript-resource:v1:C71wZs_MhwBRNSeOLk8diE',
        shadowed: 'static-attribute-shadowed',
        shadowedIdentityKey: 'typescript-resource:v1:qshVIO8dHafENTaYiJmgSS',
      },
      {
        effective: 'define-effective',
        effectiveIdentityKey: 'typescript-resource:v1:p-p3Cna6ld25MyfG1Ot0eD',
        shadowed: 'decorator-shadowed',
        shadowedIdentityKey: 'typescript-resource:v1:6qp6kgu_xTcvz2o1sP_oZw',
      },
      {
        effective: 'decorator-effective',
        effectiveIdentityKey: 'typescript-resource:v1:imSEIe47wln7ThE4LiIbJW',
        shadowed: 'static-shadowed',
        shadowedIdentityKey: 'typescript-resource:v1:kyzNhiwNhvi7qRi3goTXRS',
      },
      {
        effective: 'define-converter-effective',
        effectiveIdentityKey: 'typescript-resource:v1:HKLmzgoo_HEg3E40z6iRPu',
        shadowed: 'decorator-converter-shadowed',
        shadowedIdentityKey: 'typescript-resource:v1:SLJq20eOFgfO6LMYQoUgVf',
      },
    ] as const;
    const collisionFacts = (rows: SemanticResourceInventoryResult['rows']) => collisionPairs.map((pair) => ({
      effective: rows.find((row) => row.name === pair.effective)?.identityKey,
      shadowed: rows.find((row) => row.name === pair.shadowed)?.identityKey,
    }));
    const expectedFacts = collisionPairs.map((pair) => ({
      effective: pair.effectiveIdentityKey,
      shadowed: pair.shadowedIdentityKey,
    }));

    const first = await resourceInventory(runtime);
    expect(first.value.rows).toHaveLength(49);
    expect(new Set(first.value.rows.map((row) => row.identityKey)).size).toBe(49);
    expect(collisionFacts(first.value.rows)).toEqual(expectedFacts);
    expect(collisionFacts(first.value.rows).every((pair) => pair.effective !== pair.shadowed)).toBe(true);

    runtime.clearAnalysisCache();
    const repeated = await resourceInventory(runtime);
    expect(repeated.value.rows).toHaveLength(49);
    expect(new Set(repeated.value.rows.map((row) => row.identityKey)).size).toBe(49);
    expect(collisionFacts(repeated.value.rows)).toEqual(expectedFacts);
  }, 60_000);

  test('keeps same-owner same-name TypeScript variants unique', async () => {
    const workspaceRoot = await mkdtemp(path.join(packageRoot, '.resource-discovery-same-name-'));
    const sourceRoot = path.join(workspaceRoot, 'src');
    try {
      await mkdir(sourceRoot, { recursive: true });
      await writeFile(path.join(sourceRoot, 'main.ts'), [
        "import Aurelia, { customElement } from 'aurelia';",
        '',
        "@customElement('same-name-app')",
        'class SameNameApp {',
        '  static readonly $au = {',
        "    type: 'custom-element',",
        "    name: 'same-name-app',",
        "    template: '<template>same name</template>',",
        '  } as const;',
        '}',
        '',
        'Aurelia.app(SameNameApp).start();',
        '',
      ].join('\n'));
      const runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: 'resource-discovery-same-owner-same-name',
      });

      const inventory = await resourceInventory(runtime);
      const sameNameRows = inventory.value.rows.filter((row) => row.name === 'same-name-app');
      expect(sameNameRows).toHaveLength(2);
      expect(new Set(sameNameRows.map((row) => row.identityKey)).size).toBe(2);
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  }, 60_000);

  test('keeps ordinary TypeScript resource identity across public-name, source-offset, and workspace-root changes', async () => {
    const firstRoot = await mkdtemp(path.join(packageRoot, '.resource-discovery-rename-first-'));
    const secondRoot = await mkdtemp(path.join(packageRoot, '.resource-discovery-rename-second-'));
    const writeWorkspace = async (workspaceRoot: string, name: string, prefix: readonly string[]) => {
      const sourceRoot = path.join(workspaceRoot, 'src');
      await mkdir(sourceRoot, { recursive: true });
      await writeFile(path.join(sourceRoot, 'main.ts'), [
        ...prefix,
        "import Aurelia, { customElement } from 'aurelia';",
        '',
        `@customElement('${name}')`,
        'export class StableResourceOwner {}',
        '',
        'Aurelia.app(StableResourceOwner).start();',
        '',
      ].join('\n'));
    };
    try {
      await writeWorkspace(firstRoot, 'before-rename', []);
      await writeWorkspace(secondRoot, 'after-rename', ['// source shifted', '']);
      const firstRuntime = await createSemanticRuntime({
        workspaceRoot: firstRoot,
        storeKey: 'resource-discovery-rename-first',
      });
      const secondRuntime = await createSemanticRuntime({
        workspaceRoot: secondRoot,
        storeKey: 'resource-discovery-rename-second',
      });

      const first = requireInventoryRow((await resourceInventory(firstRuntime)).value, 'custom-element', 'before-rename');
      const second = requireInventoryRow((await resourceInventory(secondRuntime)).value, 'custom-element', 'after-rename');
      expect(second.identityKey).toBe(first.identityKey);
      expect(second.sources.publicName?.start).not.toBe(first.sources.publicName?.start);
    } finally {
      await Promise.all([
        rm(firstRoot, { recursive: true, force: true }),
        rm(secondRoot, { recursive: true, force: true }),
      ]);
    }
  }, 60_000);

  test('keeps equal-authority TypeScript variants stable across public-name and source-offset changes', async () => {
    const firstRoot = await mkdtemp(path.join(packageRoot, '.resource-discovery-variants-first-'));
    const secondRoot = await mkdtemp(path.join(packageRoot, '.resource-discovery-variants-second-'));
    const writeWorkspace = async (
      workspaceRoot: string,
      names: { readonly decorator: string; readonly static: string; readonly effective: string },
      prefix: readonly string[],
    ) => {
      const sourceRoot = path.join(workspaceRoot, 'src');
      await mkdir(sourceRoot, { recursive: true });
      await writeFile(path.join(sourceRoot, 'main.ts'), [
        ...prefix,
        "import Aurelia, { CustomElement, customElement } from 'aurelia';",
        '',
        `@customElement('${names.decorator}')`,
        'export class StableVariantOwner {',
        '  static readonly $au = {',
        "    type: 'custom-element',",
        `    name: '${names.static}',`,
        "    template: '<template>static</template>',",
        '  } as const;',
        '}',
        '',
        'CustomElement.define({',
        `  name: '${names.effective}',`,
        "  template: '<template>effective</template>',",
        '}, StableVariantOwner);',
        '',
        'Aurelia.app(StableVariantOwner).start();',
        '',
      ].join('\n'));
    };
    const firstNames = {
      decorator: 'a-decorator-before',
      static: 'z-static-before',
      effective: 'effective-before',
    } as const;
    const secondNames = {
      decorator: 'z-decorator-after',
      static: 'a-static-after',
      effective: 'effective-after',
    } as const;
    try {
      await writeWorkspace(firstRoot, firstNames, []);
      await writeWorkspace(secondRoot, secondNames, ['// both lower-authority variants shifted', '']);
      const firstRuntime = await createSemanticRuntime({
        workspaceRoot: firstRoot,
        storeKey: 'resource-discovery-variants-first',
      });
      const secondRuntime = await createSemanticRuntime({
        workspaceRoot: secondRoot,
        storeKey: 'resource-discovery-variants-second',
      });
      const firstRows = (await resourceInventory(firstRuntime)).value.rows;
      const secondRows = (await resourceInventory(secondRuntime)).value.rows;
      const identities = (
        rows: SemanticResourceInventoryResult['rows'],
        names: typeof firstNames | typeof secondNames,
      ) => ({
        effective: requireInventoryRowByName(rows, names.effective).identityKey,
        decorator: requireInventoryRowByName(rows, names.decorator).identityKey,
        static: requireInventoryRowByName(rows, names.static).identityKey,
      });

      const firstIdentities = identities(firstRows, firstNames);
      const secondIdentities = identities(secondRows, secondNames);
      expect(new Set(Object.values(firstIdentities)).size).toBe(3);
      expect(secondIdentities).toEqual(firstIdentities);
    } finally {
      await Promise.all([
        rm(firstRoot, { recursive: true, force: true }),
        rm(secondRoot, { recursive: true, force: true }),
      ]);
    }
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
    expect(primary.value.typeSurfacesIncluded).toBe(false);
    expect(primary.value.rows.every((row) => row.resource.bindables.every(hasEmptyTypeSurface))).toBe(true);
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
    expect(primary.value.rows.map((row) => row.resource.name).slice(0, 5)).toEqual([
      'local-chip',
      'local-icon',
      'outer-local',
      'global-helper',
      'secondary-host',
    ]);

    const memberValueAccess = vi.spyOn(CheckerTypeShapeAccess.prototype, 'memberValueAccess');
    const richPrimary = await templateAvailability(
      runtime,
      primaryTemplate,
      '<local-chip public-label',
      undefined,
      true,
    );
    expect(richPrimary.value.typeSurfacesIncluded).toBe(true);
    expect(richPrimary.value.rows.some((row) =>
      row.resource.bindables.some((bindable) => bindable.valueType != null)
    )).toBe(true);
    expect(availabilityFactsWithoutTypeSurfaces(richPrimary.value)).toEqual(
      availabilityFactsWithoutTypeSurfaces(primary.value),
    );
    const availabilityAccessKeys = memberValueAccess.mock.calls.map((call) => call[2]);
    expect(availabilityAccessKeys).toHaveLength(new Set(availabilityAccessKeys).size);

    memberValueAccess.mockClear();
    const inventory = await resourceInventory(runtime, true);
    const inventoryAccessKeys = memberValueAccess.mock.calls.map((call) => call[2]);
    const inventoryAccessKeySet = new Set(inventoryAccessKeys);
    expect(availabilityAccessKeys.every((key) => inventoryAccessKeySet.has(key))).toBe(true);
    expect(availabilityAccessKeys.length).toBeLessThan(inventoryAccessKeys.length);
    expect(primary.value.completeness).toEqual(inventory.value.completeness);
    memberValueAccess.mockRestore();

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
    await runtime.openApp({
      analysisDepth: 'runtime-topology',
      templateAnalysisBreadth: 'resource-local',
      includeAuthoringTemplates: true,
    });

    const answer = await templateAvailability(runtime, templateFile, '<template>');

    expect(answer.selection).toBe(SemanticRuntimeAnswerSelection.Ambiguous);
    expect(answer.value.selectedTemplate).toBeNull();
    expect(answer.value.rows).toEqual([]);
    expect(answer.value.candidates).toHaveLength(2);
    expect(new Set(answer.value.candidates.map((candidate) => candidate.scopeIdentityKey)).size).toBe(2);
    expect(new Set(answer.value.candidates.map((candidate) => candidate.templateIdentityKey)).size).toBe(1);

    const memberValueAccess = vi.spyOn(CheckerTypeShapeAccess.prototype, 'memberValueAccess');
    const richAmbiguous = await templateAvailability(runtime, templateFile, '<template>', undefined, true);
    expect(richAmbiguous.selection).toBe(SemanticRuntimeAnswerSelection.Ambiguous);
    expect(richAmbiguous.value.typeSurfacesIncluded).toBe(true);
    expect(memberValueAccess).not.toHaveBeenCalled();

    memberValueAccess.mockClear();
    const richMissingCursor = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.TemplateResourceAvailability,
      templateAnalysisBreadth: 'resource-local',
      includeTypeSurfaces: true,
      includeAuthoringTemplates: true,
      appRetention: 'retain-app',
    }) as SemanticRuntimeAnswer<SemanticTemplateResourceAvailabilityResult>;
    expect(richMissingCursor.selection).toBe(SemanticRuntimeAnswerSelection.Absent);
    expect(richMissingCursor.value.typeSurfacesIncluded).toBe(true);
    expect(memberValueAccess).not.toHaveBeenCalled();
    memberValueAccess.mockRestore();

    const selected = await templateAvailability(
      runtime,
      templateFile,
      '<template>',
      answer.value.candidates[0]!.scopeIdentityKey,
    );
    expect(selected.selection).toBe(SemanticRuntimeAnswerSelection.Exact);
    expect(selected.value.selectedTemplate?.scopeIdentityKey).toBe(answer.value.candidates[0]!.scopeIdentityKey);
    expect(selected.value.rows).not.toHaveLength(0);

    const unsupported = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.ResourceInventory,
      templateResourceScopeIdentityKey: answer.value.candidates[0]!.scopeIdentityKey,
    });
    expect(unsupported.result).toBe(SemanticRuntimeAnswerResult.Unsupported);
  }, 60_000);

  test('reports source-discovery guardrails as truncated resource coverage', async () => {
    const workspaceRoot = await mkdtemp(path.join(packageRoot, '.resource-discovery-guardrail-'));
    const sourceRoot = path.join(workspaceRoot, 'src');
    const appFile = path.join(sourceRoot, 'a-app.ts');
    try {
      await mkdir(sourceRoot, { recursive: true });
      await writeFile(appFile, [
        "import Aurelia, { customElement } from 'aurelia';",
        '',
        "@customElement({ name: 'guardrail-app', template: '<div>guardrail</div>' })",
        'class GuardrailApp {}',
        '',
        'Aurelia.app(GuardrailApp).start();',
        '',
      ].join('\n'));
      await writeFile(path.join(sourceRoot, 'z-over-limit.ts'), [
        "import { customElement } from 'aurelia';",
        '',
        "@customElement('over-limit')",
        'export class OverLimit {}',
        '',
      ].join('\n'));

      const runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: 'resource-discovery-source-guardrail',
        projects: [{
          rootDir: workspaceRoot,
          projectKey: 'guardrail-app',
          sourceDiscoveryOptions: {
            extensions: new Set(['.ts']),
            maxFiles: 1,
          },
        }],
      });
      const inventory = await resourceInventory(runtime);

      expect(inventory.result).toBe(SemanticRuntimeAnswerResult.Answered);
      expect(inventory.selection).toBe(SemanticRuntimeAnswerSelection.NotApplicable);
      expect(inventory.coverage).toBe(SemanticRuntimeAnswerCoverage.Truncated);
      expect(inventory.value.rows.length).toBeGreaterThan(0);
      expect(inventory.value.rows.some((row) => row.name === 'over-limit')).toBe(false);
      expect(inventory.summary).toContain('Source discovery stopped at its configured file guardrail');
      expect(inventory.value.displayText).toContain('Coverage was truncated by the source-discovery guardrail');

      const templateOffset = readFileSync(appFile, 'utf8').indexOf('guardrail</div>');
      expect(templateOffset).toBeGreaterThanOrEqual(0);
      const availability = await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TemplateResourceAvailability,
        cursor: { filePath: appFile, offset: templateOffset },
        includeAuthoringTemplates: true,
      }) as SemanticRuntimeAnswer<SemanticTemplateResourceAvailabilityResult>;
      expect(availability.result).toBe(SemanticRuntimeAnswerResult.Answered);
      expect(availability.selection).toBe(SemanticRuntimeAnswerSelection.Exact);
      expect(availability.coverage).toBe(SemanticRuntimeAnswerCoverage.Truncated);
      expect(availability.value.rows.length).toBeGreaterThan(0);

      const missingCursor = await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TemplateResourceAvailability,
        includeAuthoringTemplates: true,
      }) as SemanticRuntimeAnswer<SemanticTemplateResourceAvailabilityResult>;
      expect(missingCursor.selection).toBe(SemanticRuntimeAnswerSelection.Absent);
      expect(missingCursor.coverage).toBe(SemanticRuntimeAnswerCoverage.Truncated);

      const staleScope = await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TemplateResourceAvailability,
        cursor: { filePath: appFile, offset: templateOffset },
        templateResourceScopeIdentityKey: 'stale-scope',
        includeAuthoringTemplates: true,
      }) as SemanticRuntimeAnswer<SemanticTemplateResourceAvailabilityResult>;
      expect(staleScope.selection).toBe(SemanticRuntimeAnswerSelection.Absent);
      expect(staleScope.coverage).toBe(SemanticRuntimeAnswerCoverage.Truncated);

      const templateDiagnostics = await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TemplateDiagnostics,
        includeAuthoringTemplates: true,
      });
      expect(templateDiagnostics.coverage).toBe(SemanticRuntimeAnswerCoverage.Truncated);

      const appDiagnostics = await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.AppDiagnostics,
        includeAuthoringTemplates: true,
      });
      expect(appDiagnostics.coverage).toBe(SemanticRuntimeAnswerCoverage.Truncated);

      const appDiagnosticSummary = await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.AppDiagnosticSummary,
        includeAuthoringTemplates: true,
      });
      expect(appDiagnosticSummary.coverage).toBe(SemanticRuntimeAnswerCoverage.Truncated);
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  }, 60_000);

  test('pages compact and rich resource inventory without projecting discarded type surfaces', async () => {
    const fixtureRoot = pressureFixtureRoot('resource-registration-local-templates');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'resource-discovery-inventory-paging',
    });
    await runtime.openApp({
      analysisDepth: 'runtime-topology',
      templateAnalysisBreadth: 'resource-local',
      includeAuthoringTemplates: true,
    });
    const memberValueAccess = vi.spyOn(CheckerTypeShapeAccess.prototype, 'memberValueAccess');

    const richZero = await resourceInventory(runtime, true, { size: 0 });
    expect(richZero.value.typeSurfacesIncluded).toBe(true);
    expect(richZero.value.rows).toEqual([]);
    expect(richZero.page).toMatchObject({
      returnedRows: 0,
      totalRows: 36,
      exhausted: false,
    });
    expect(memberValueAccess).not.toHaveBeenCalled();

    memberValueAccess.mockClear();
    const richMalformed = await resourceInventory(runtime, true, {
      size: 1,
      cursor: 'not-a-semantic-runtime-page-cursor',
    });
    expect(richMalformed.result).toBe(SemanticRuntimeAnswerResult.Invalid);
    expect(richMalformed.value.rows).toEqual([]);
    expect(richMalformed.page).toMatchObject({
      returnedRows: 0,
      totalRows: 36,
      cursorProblem: { kind: 'malformed' },
    });
    expect(memberValueAccess).not.toHaveBeenCalled();

    memberValueAccess.mockClear();
    const compactFull = await resourceInventory(runtime);
    const compactDrain = await drainResourceInventory(runtime, 5);
    expect(compactDrain.rows.map((row) => row.identityKey)).toEqual(
      compactFull.value.rows.map((row) => row.identityKey),
    );
    expect(compactDrain.completeness).toEqual(compactFull.value.completeness);
    expect(compactDrain.pageCompleteness.every((value) =>
      JSON.stringify(value) === JSON.stringify(compactFull.value.completeness)
    )).toBe(true);
    expect(memberValueAccess).not.toHaveBeenCalled();

    const compactPage = await resourceInventory(runtime, false, { size: 5 });
    memberValueAccess.mockClear();
    const richPage = await resourceInventory(runtime, true, { size: 5 });
    const richPageAccessKeys = memberValueAccess.mock.calls.map((call) => call[2]);
    const richPageBindableCount = richPage.value.rows.reduce(
      (count, row) => count + row.bindables.length,
      0,
    );
    expect(richPage.value.typeSurfacesIncluded).toBe(true);
    expect(compactPage.value.typeSurfacesIncluded).toBe(false);
    expect(inventoryFactsWithoutTypeSurfaces(richPage.value)).toEqual(
      inventoryFactsWithoutTypeSurfaces(compactPage.value),
    );
    expect(richPage.value.completeness).toEqual(compactPage.value.completeness);
    expect(richPageAccessKeys).toHaveLength(new Set(richPageAccessKeys).size);
    expect(richPageAccessKeys.length).toBeLessThanOrEqual(richPageBindableCount);

    memberValueAccess.mockClear();
    await resourceInventory(runtime, true);
    expect(richPageAccessKeys.length).toBeLessThan(memberValueAccess.mock.calls.length);
  }, 60_000);

  test('projects only paged resource-definition bindables and one byte-budget lookahead', async () => {
    const fixtureRoot = pressureFixtureRoot('bindable-contracts-lab');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'resource-definitions-projection-lazy-paging',
    });
    await runtime.openApp({
      analysisDepth: 'runtime-topology',
      templateAnalysisBreadth: 'resource-local',
      includeAuthoringTemplates: false,
    });
    const memberValueAccess = vi.spyOn(CheckerTypeShapeAccess.prototype, 'memberValueAccess');

    const zero = await resourceDefinitions(runtime, { size: 0 });
    expect(zero.value.rows).toEqual([]);
    expect(zero.page).toMatchObject({
      returnedRows: 0,
      totalRows: 15,
      exhausted: false,
      estimatedRowsJsonBytes: 2,
    });
    expect(memberValueAccess).not.toHaveBeenCalled();

    memberValueAccess.mockClear();
    const malformed = await resourceDefinitions(runtime, {
      size: 1,
      cursor: 'not-a-semantic-runtime-page-cursor',
    });
    expect(malformed.result).toBe(SemanticRuntimeAnswerResult.Invalid);
    expect(malformed.value.rows).toEqual([]);
    expect(malformed.page).toMatchObject({
      returnedRows: 0,
      totalRows: 15,
      cursorProblem: { kind: 'malformed' },
    });
    expect(memberValueAccess).not.toHaveBeenCalled();

    memberValueAccess.mockClear();
    const first = await resourceDefinitions(runtime, { size: 1 });
    expect(first.value.rows.map((row) => [row.name, row.bindables.length])).toEqual([
      ['active-state', 0],
    ]);
    expect(first.page?.nextCursor).not.toBeNull();
    expect(memberValueAccess).not.toHaveBeenCalled();

    memberValueAccess.mockClear();
    const second = await resourceDefinitions(runtime, {
      size: 1,
      cursor: first.page?.nextCursor,
    });
    expect(second.value.rows.map((row) => [row.name, row.bindables.length])).toEqual([
      ['display-hint', 3],
    ]);
    expect(memberValueAccess).toHaveBeenCalledTimes(3);

    memberValueAccess.mockClear();
    const byteClamped = await resourceDefinitions(
      runtime,
      { size: 500 },
      { maxRowsJsonBytes: 3_000 },
    );
    expect(byteClamped.value.rows.map((row) => [row.name, row.bindables.length])).toEqual([
      ['active-state', 0],
    ]);
    expect(byteClamped.page).toMatchObject({
      returnedRows: 1,
      totalRows: 15,
      exhausted: false,
      maxRowsJsonBytes: 3_000,
      byteClamped: true,
    });
    expect(byteClamped.page?.estimatedRowsJsonBytes).toBeGreaterThan(0);
    expect(byteClamped.page?.estimatedRowsJsonBytes).toBeLessThanOrEqual(3_000);
    expect(memberValueAccess).toHaveBeenCalledTimes(3);

    memberValueAccess.mockClear();
    const full = await resourceDefinitions(runtime, { size: 500 });
    expect(full.value.rows).toHaveLength(15);
    expect(full.value.rows.reduce((count, row) => count + row.bindables.length, 0)).toBe(28);
    expect(memberValueAccess).toHaveBeenCalledTimes(28);
  }, 60_000);
});

async function resourceInventory(
  runtime: Awaited<ReturnType<typeof createSemanticRuntime>>,
  includeTypeSurfaces = false,
  page: SemanticRuntimePageInput = { size: 500 },
): Promise<SemanticRuntimeAnswer<SemanticResourceInventoryResult>> {
  return await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.ResourceInventory,
    includeTypeSurfaces,
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
    page,
  }) as SemanticRuntimeAnswer<SemanticResourceInventoryResult>;
}

async function drainResourceInventory(
  runtime: Awaited<ReturnType<typeof createSemanticRuntime>>,
  pageSize: number,
): Promise<{
  readonly rows: SemanticResourceInventoryResult['rows'];
  readonly completeness: SemanticResourceInventoryResult['completeness'];
  readonly pageCompleteness: readonly SemanticResourceInventoryResult['completeness'][];
}> {
  const rows: SemanticResourceInventoryResult['rows'][number][] = [];
  const pageCompleteness: SemanticResourceInventoryResult['completeness'][] = [];
  let cursor: string | null | undefined;
  let completeness: SemanticResourceInventoryResult['completeness'] | null = null;
  do {
    const page = await resourceInventory(runtime, false, { size: pageSize, cursor });
    rows.push(...page.value.rows);
    pageCompleteness.push(page.value.completeness);
    completeness ??= page.value.completeness;
    cursor = page.page?.nextCursor;
  } while (cursor != null);
  if (completeness == null) {
    throw new Error('Expected at least one resource inventory page.');
  }
  return { rows, completeness, pageCompleteness };
}

async function resourceDefinitions(
  runtime: Awaited<ReturnType<typeof createSemanticRuntime>>,
  page: SemanticRuntimePageInput,
  pagePolicy?: SemanticRuntimePagePolicy,
): Promise<SemanticRuntimeAnswer<SemanticResourceDefinitionsResult>> {
  return await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.ResourceDefinitions,
    page,
    pagePolicy,
    appRetention: 'retain-app',
  }) as SemanticRuntimeAnswer<SemanticResourceDefinitionsResult>;
}

async function templateAvailability(
  runtime: Awaited<ReturnType<typeof createSemanticRuntime>>,
  filePath: string,
  marker: string,
  templateResourceScopeIdentityKey?: string,
  includeTypeSurfaces = false,
): Promise<SemanticRuntimeAnswer<SemanticTemplateResourceAvailabilityResult>> {
  const offset = readFileSync(filePath, 'utf8').indexOf(marker);
  expect(offset).toBeGreaterThanOrEqual(0);
  return await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.TemplateResourceAvailability,
    cursor: { filePath, offset },
    templateResourceScopeIdentityKey,
    includeTypeSurfaces,
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

function requireInventoryRowByName(
  rows: SemanticResourceInventoryResult['rows'],
  name: string,
): SemanticResourceInventoryResult['rows'][number] {
  const row = rows.find((candidate) => candidate.name === name);
  if (row == null) {
    throw new Error(`Expected resource inventory row named ${name}.`);
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

function inventoryFactsWithoutTypeSurfaces(result: SemanticResourceInventoryResult): readonly unknown[] {
  return result.rows.map(inventoryRowWithoutTypeSurfaces);
}

function availabilityFactsWithoutTypeSurfaces(result: SemanticTemplateResourceAvailabilityResult): unknown {
  return {
    displayText: result.displayText,
    projectKey: result.projectKey,
    projectRoot: result.projectRoot,
    selectedTemplate: result.selectedTemplate,
    candidates: result.candidates,
    completeness: result.completeness,
    rows: result.rows.map((row) => ({
      ...row,
      resource: inventoryRowWithoutTypeSurfaces(row.resource),
    })),
  };
}

function inventoryRowWithoutTypeSurfaces(
  row: SemanticResourceInventoryResult['rows'][number],
): unknown {
  const typeSurfaceFields = new Set([
    'valueType',
    'valueTypeShapeKind',
    'effectiveValueTypeShapeKind',
    'valueTypeHasCallSignature',
    'valueTypeHasMembers',
    'valueTypeIsWeak',
  ]);
  return {
    ...row,
    bindables: row.bindables.map((bindable) => Object.fromEntries(
      Object.entries(bindable).filter(([field]) => !typeSurfaceFields.has(field)),
    )),
  };
}

function hasEmptyTypeSurface(bindable: SemanticResourceInventoryResult['rows'][number]['bindables'][number]): boolean {
  return bindable.valueType == null
    && bindable.valueTypeShapeKind == null
    && bindable.effectiveValueTypeShapeKind == null
    && bindable.valueTypeHasCallSignature == null
    && bindable.valueTypeHasMembers == null
    && bindable.valueTypeIsWeak == null;
}

function localTemplateOwners(result: SemanticTemplateResourceAvailabilityResult): ReadonlySet<string | null> {
  return new Set(result.rows
    .filter((row) => row.resource.locality.kind === SemanticResourceInventoryLocalityKind.LocalTemplate)
    .map((row) => row.resource.locality.ownerName));
}

function pressureFixtureRoot(fixtureName: string): string {
  return path.join(packageRoot, 'fixtures/pressure', fixtureName);
}
