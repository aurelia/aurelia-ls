import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  SemanticTemplateAnalysisBreadth,
  type SemanticRuntimeSourceCursorInput,
  type SemanticRuntime,
} from '../src/index.js';
import { AureliaAppAnalysisPhase } from '../src/configuration/app-world-project-pass.js';
import { ComputationChildTransitionKind } from '../src/kernel/computation-lifecycle.js';
import {
  routedAppQueryBatchTemplateAnalysisBreadth,
  routedAppQueryTemplateAnalysisBreadth,
} from '../src/api/app-query-policy.js';
import { semanticAppQueryCatalogRow } from '../src/api/app-query-catalog.js';
import { resourceLocalRuntimeBindings } from '../src/template/runtime-resource-ownership.js';
import { OpenSeamReasonKind } from '../src/kernel/open-seam.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('template analysis breadth', () => {
  test('routes authored loci locally while preserving aggregate global and topology defaults', () => {
    const cursor = {
      filePath: 'src/app.html',
      line: 0,
      character: 1,
      offset: 1,
    } satisfies SemanticRuntimeSourceCursorInput;
    const completionRow = semanticAppQueryCatalogRow(SemanticAppQueryKind.TemplateCompletions);
    const bindingRows = semanticAppQueryCatalogRow(SemanticAppQueryKind.BindingDataFlows);
    const topologyRow = semanticAppQueryCatalogRow(SemanticAppQueryKind.AppTopology);
    const limitationRow = semanticAppQueryCatalogRow(SemanticAppQueryKind.AnalysisLimitations);
    const inventoryRow = semanticAppQueryCatalogRow(SemanticAppQueryKind.ResourceInventory);

    expect(completionRow.minimumTemplateAnalysisBreadth).toBe('resource-local');
    expect(bindingRows.minimumTemplateAnalysisBreadth).toBe('resource-local');
    expect(topologyRow.minimumTemplateAnalysisBreadth).toBe('app-aggregate');
    expect(bindingRows.defaultTemplateAnalysisBreadth).toBe('app-aggregate');
    expect(inventoryRow.defaultTemplateAnalysisBreadth).toBe('resource-local');
    expect(routedAppQueryTemplateAnalysisBreadth({
      kind: SemanticAppQueryKind.TemplateCompletions,
      cursor,
    }, completionRow.minimumTemplateAnalysisBreadth)).toBe('resource-local');
    expect(routedAppQueryTemplateAnalysisBreadth({
      kind: SemanticAppQueryKind.BindingDataFlows,
      sourceFilePath: 'src/app.html',
    }, bindingRows.minimumTemplateAnalysisBreadth)).toBe('app-aggregate');
    expect(routedAppQueryTemplateAnalysisBreadth({
      kind: SemanticAppQueryKind.ResourceInventory,
    }, inventoryRow.minimumTemplateAnalysisBreadth)).toBe('resource-local');
    expect(routedAppQueryTemplateAnalysisBreadth({
      kind: SemanticAppQueryKind.AppTopology,
      sourceFilePath: 'src/app.html',
    }, topologyRow.minimumTemplateAnalysisBreadth)).toBe('app-aggregate');
    expect(routedAppQueryTemplateAnalysisBreadth({
      kind: SemanticAppQueryKind.AppTopology,
      templateAnalysisBreadth: 'resource-local',
    }, topologyRow.minimumTemplateAnalysisBreadth)).toBe('app-aggregate');
    expect(routedAppQueryTemplateAnalysisBreadth({
      kind: SemanticAppQueryKind.AnalysisLimitations,
      templateAnalysisBreadth: 'resource-local',
    }, limitationRow.minimumTemplateAnalysisBreadth)).toBe('resource-local');
    expect(routedAppQueryBatchTemplateAnalysisBreadth({
      queries: [{
        kind: SemanticAppQueryKind.TemplateCompletions,
        cursor,
      }],
    })).toBe('resource-local');
    expect(routedAppQueryBatchTemplateAnalysisBreadth({
      queries: [
        { kind: SemanticAppQueryKind.TemplateCompletions, cursor },
        { kind: SemanticAppQueryKind.AppTopology },
      ],
    })).toBe('app-aggregate');
  });

  test('keeps projected cursor answers and cross-template references equivalent', async () => {
    const fixtureRoot = pressureFixtureRoot('content-projection-topology');
    const templatePath = path.join(fixtureRoot, 'src/content-projection-topology-app.html');
    const templateText = readFileSync(templatePath, 'utf8');
    const completionCursor = cursorAfter(templateText, templatePath, '${$host.');
    const memberCursor = cursorInside(
      templateText,
      templatePath,
      '${$host.exposedLabel}',
      'exposedLabel',
    );
    const resourceCursor = cursorInside(
      templateText,
      templatePath,
      '<projection-receiver>',
      'projection-receiver',
    );

    const local = await projectedAnswers(
      fixtureRoot,
      templatePath,
      completionCursor,
      memberCursor,
      resourceCursor,
      SemanticTemplateAnalysisBreadth.ResourceLocal,
    );
    const aggregate = await projectedAnswers(
      fixtureRoot,
      templatePath,
      completionCursor,
      memberCursor,
      resourceCursor,
      SemanticTemplateAnalysisBreadth.AppAggregate,
    );

    expect(local.completion.templateAnalysisBreadth).toBe('resource-local');
    expect(local.completion.coverage).toBe('complete');
    expect(local.completion.value.missingInputs).toEqual([]);
    expect(local.completion.value.candidates).toEqual(aggregate.completion.value.candidates);
    expect(local.completion.value.candidates).toContainEqual(expect.objectContaining({
      name: 'exposedLabel',
      candidateKind: 'type-member',
      typeDisplay: 'string',
    }));
    expect({
      siteKind: local.cursor.value.siteKind,
      selectedMember: local.cursor.value.selectedMember,
      missingInputs: local.cursor.value.missingInputs,
      diagnostics: local.cursor.value.diagnostics,
    }).toEqual({
      siteKind: aggregate.cursor.value.siteKind,
      selectedMember: aggregate.cursor.value.selectedMember,
      missingInputs: aggregate.cursor.value.missingInputs,
      diagnostics: aggregate.cursor.value.diagnostics,
    });
    expect(referenceKeys(local.references.value.rows)).toEqual(referenceKeys(aggregate.references.value.rows));
    expect(referenceKeys(local.references.value.rows)).toEqual(expect.arrayContaining([
      'resource-usage:src/content-projection-topology-app.html:14',
      'resource-usage:src/projection-relay.html:14',
      'declaration:src/projection-receiver.ts:735',
    ]));
    expect(local.rename.value).toEqual(aggregate.rename.value);
    expect(local.renameFromTypeScript.value).toEqual(aggregate.renameFromTypeScript.value);
    expect(local.rename.value).toMatchObject({ status: 'available', placeholder: 'message' });
    expect(local.rename.value.edits).toHaveLength(6);
    expect(local.pressure.controllers).toBeLessThan(aggregate.pressure.controllers);
    expect(local.pressure.records).toBeLessThan(aggregate.pressure.records);
    expect(local.pressure.controllers).toBeLessThanOrEqual(100);
    expect(local.pressure.records).toBeLessThanOrEqual(13_000);
  }, 60_000);

  test('preserves parent bindable targets and global public binding rows', async () => {
    const fixtureRoot = pressureFixtureRoot('template-overlay-bound-controller');
    const local = await bindingDataFlows(fixtureRoot, SemanticTemplateAnalysisBreadth.ResourceLocal);
    const aggregate = await bindingDataFlows(fixtureRoot, SemanticTemplateAnalysisBreadth.AppAggregate);

    expect(local.answer.templateAnalysisBreadth).toBe('resource-local');
    expect(local.answer.value.rows).toEqual(aggregate.answer.value.rows);
    const parentRows = local.answer.value.rows.filter((row) =>
      row.definitionName === 'template-overlay-bound-controller-app'
      && (row.targetProperty === 'actions' || row.targetProperty === 'onAction')
    );
    expect(parentRows).toHaveLength(4);
    expect(parentRows.every((row) =>
      row.targetKind === 'controller-view-model'
      && row.sourceEvaluationReachability === 'reached'
      && row.sourceToTargetAssignable === true
      && row.openReason == null
    )).toBe(true);
    expect(parentRows.filter((row) => row.targetProperty === 'actions').map((row) => row.sourceType))
      .toEqual(['readonly OverlayAction[]', 'readonly OverlayAction[]']);
    expect(parentRows.filter((row) => row.targetProperty === 'onAction').map((row) => row.sourceType))
      .toEqual(['(action: OverlayAction) => boolean', '(action: OverlayAction) => boolean']);

    const mixedFixtureRoot = pressureFixtureRoot('mixed-form-surfaces');
    const localMismatch = await mismatchAnswers(
      mixedFixtureRoot,
      SemanticTemplateAnalysisBreadth.ResourceLocal,
    );
    const aggregateMismatch = await mismatchAnswers(
      mixedFixtureRoot,
      SemanticTemplateAnalysisBreadth.AppAggregate,
    );
    expect(withoutOpaqueHandles(localMismatch.diagnostics.value.rows))
      .toEqual(withoutOpaqueHandles(aggregateMismatch.diagnostics.value.rows));
    expect(withoutOpaqueHandles(localMismatch.codeActions.value.rows))
      .toEqual(withoutOpaqueHandles(aggregateMismatch.codeActions.value.rows));
    expect(localMismatch.diagnostics.value.rows.filter((row) =>
      row.diagnosticKind === 'binding-source-assignment-strictness'
    ).map((row) => row.selectedMemberName)).toEqual(['fulfillmentMethod', 'priority']);

    const cycleFixtureRoot = pressureFixtureRoot('template-analysis-breadth-cycle');
    const localCycle = await cycleAnswers(cycleFixtureRoot, SemanticTemplateAnalysisBreadth.ResourceLocal);
    const aggregateCycle = await cycleAnswers(cycleFixtureRoot, SemanticTemplateAnalysisBreadth.AppAggregate);
    expect(localCycle.cursor.value.selectedMember).toEqual(aggregateCycle.cursor.value.selectedMember);
    expect(localCycle.diagnostics.value.rows).toEqual(aggregateCycle.diagnostics.value.rows);
    expect(localCycle.cursor.value.selectedMember?.typeDisplay).toBe('string | number');
    expect(localCycle.pressure.controllers).toBeLessThan(aggregateCycle.pressure.controllers);
  }, 60_000);

  test('isolates cache generations and bounds repeated child-view topology', async () => {
    const fixtureRoot = pressureFixtureRoot('app-pattern-catalog-storefront');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-analysis-breadth:cache',
    });
    const local = await runtime.openApp({
      analysisDepth: 'binding-observation',
      templateAnalysisBreadth: 'resource-local',
    });
    const localAgain = await runtime.openApp({
      analysisDepth: 'binding-observation',
      templateAnalysisBreadth: 'resource-local',
    });
    const localRuntimeRenderings = new Map(local.emission.templates.resources.map((resource) => [
      resource.compilation.definition.name,
      resource.runtimeAnalysis.runtimeRendering,
    ]));
    const aggregate = await runtime.openApp({
      analysisDepth: 'binding-observation',
      templateAnalysisBreadth: 'app-aggregate',
    });
    const aggregateRecomputedRuntime = aggregate.emission.templates.resources.every((resource) =>
      resource.runtimeAnalysis.analysisBreadth === 'app-aggregate'
      && resource.runtimeAnalysis.profile.totalMilliseconds > 0
      && localRuntimeRenderings.get(resource.compilation.definition.name)
        !== resource.runtimeAnalysis.runtimeRendering
    );
    const localSatisfiedByAggregate = await runtime.openApp({
      analysisDepth: 'binding-observation',
      templateAnalysisBreadth: 'resource-local',
    });

    expect(localAgain).toBe(local);
    expect(aggregate).not.toBe(local);
    expect(local.isCurrent()).toBe(false);
    expect(aggregate.isCurrent()).toBe(false);
    expect(localSatisfiedByAggregate).not.toBe(aggregate);
    expect(localSatisfiedByAggregate.isCurrent()).toBe(true);
    expect(localSatisfiedByAggregate.emission.templates.resources.every((resource) =>
      resource.runtimeAnalysis.analysisBreadth === 'resource-local'
    )).toBe(true);
    expect(aggregateRecomputedRuntime).toBe(true);

    const localPressure = await appPressure(fixtureRoot, 'resource-local');
    const aggregatePressure = await appPressure(fixtureRoot, 'app-aggregate');
    expect(localPressure.localBindings).toEqual(aggregatePressure.localBindings);
    expect(localPressure.controllers).toBeLessThan(aggregatePressure.controllers);
    expect(localPressure.bindings).toBeLessThan(aggregatePressure.bindings);
    expect(localPressure.records).toBeLessThan(aggregatePressure.records);
    expect(localPressure.controllers).toBeLessThanOrEqual(60);
    expect(localPressure.records).toBeLessThanOrEqual(11_000);

    const appOwnedAuthoringRuntime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:template-analysis-breadth:app-owned-authoring',
    });
    const topologyWithoutAuthoring = await appOwnedAuthoringRuntime.openApp({
      analysisDepth: 'runtime-topology',
      templateAnalysisBreadth: 'resource-local',
      includeAuthoringTemplates: false,
    });
    const topologyWithAppOwnedAuthoring = await appOwnedAuthoringRuntime.openApp({
      sourceFilePath: path.join(fixtureRoot, 'src/app.html'),
      analysisDepth: 'runtime-topology',
      templateAnalysisBreadth: 'resource-local',
      includeAuthoringTemplates: true,
    });
    expect(topologyWithAppOwnedAuthoring).toBe(topologyWithoutAuthoring);

    const localTemplateRoot = pressureFixtureRoot('resource-registration-local-templates');
    const localTemplateRuntime = await createSemanticRuntime({
      workspaceRoot: localTemplateRoot,
      storeKey: 'contract:template-analysis-breadth:local-templates',
    });
    const localTemplateApp = await localTemplateRuntime.openApp({
      analysisDepth: 'binding-observation',
      templateAnalysisBreadth: 'resource-local',
    });
    expect(localTemplateApp.emission.templates.resources.map((resource) => resource.compilation.definition.name))
      .toEqual(expect.arrayContaining(['local-chip', 'local-icon', 'outer-local', 'nested-local']));

    const zeroTemplateRoot = pressureFixtureRoot('di-authored-app-containers');
    const zeroTemplateRuntime = await createSemanticRuntime({
      workspaceRoot: zeroTemplateRoot,
      storeKey: 'contract:template-analysis-breadth:zero-templates',
    });
    const zeroTemplateApp = await zeroTemplateRuntime.openApp({
      templateAnalysisBreadth: 'resource-local',
    });
    expect(zeroTemplateApp.emission.templates.resources).toEqual([]);
    expect(zeroTemplateApp.emission.templateAnalysisBreadth).toBe('resource-local');
    const zeroTemplateAggregate = await zeroTemplateRuntime.openApp({
      templateAnalysisBreadth: 'app-aggregate',
    });
    expect(zeroTemplateAggregate.emission.templates.resources).toEqual([]);
    expect(zeroTemplateAggregate.emission.templateAnalysisBreadth).toBe('app-aggregate');
    expect(latestTransition(zeroTemplateRuntime, zeroTemplateAggregate.project.projectKey).children)
      .toContainEqual(expect.objectContaining({
        locus: expect.objectContaining({
          reconciliationKey: JSON.stringify([
            zeroTemplateAggregate.project.projectKey,
            AureliaAppAnalysisPhase.TemplateRuntime,
          ]),
        }),
        kind: ComputationChildTransitionKind.Executed,
      }));
  }, 60_000);

  test('bounds deep slot-forwarding chains with explicit guardrail evidence', async () => {
    const smallRoot = createSlotForwardingFixture(12);
    const largeRoot = createSlotForwardingFixture(24);
    try {
      const small = await slotForwardingPressure(smallRoot, 12);
      const large = await slotForwardingPressure(largeRoot, 24);

      expect(small.guardrailSeams).toBeGreaterThan(0);
      expect(large.guardrailSeams).toBeGreaterThan(small.guardrailSeams);
      expect(large.controllers).toBeLessThan(small.controllers * 2.75);
      expect(large.records).toBeLessThan(small.records * 2.75);
    } finally {
      rmSync(smallRoot, { recursive: true, force: true });
      rmSync(largeRoot, { recursive: true, force: true });
    }
  }, 60_000);
});

async function projectedAnswers(
  fixtureRoot: string,
  templatePath: string,
  completionCursor: SemanticRuntimeSourceCursorInput,
  memberCursor: SemanticRuntimeSourceCursorInput,
  resourceCursor: SemanticRuntimeSourceCursorInput,
  templateAnalysisBreadth: SemanticTemplateAnalysisBreadth,
) {
  const templateText = readFileSync(templatePath, 'utf8');
  const viewModelPath = path.join(fixtureRoot, 'src/content-projection-topology-app.ts');
  const viewModelText = readFileSync(viewModelPath, 'utf8');
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    storeKey: `contract:template-analysis-breadth:projection:${templateAnalysisBreadth}`,
  });
  const common = {
    sourceFilePath: templatePath,
    analysisDepth: 'binding-observation' as const,
    templateAnalysisBreadth,
    includeAuthoringTemplates: true,
    appRetention: 'retain-app' as const,
  };
  const completion = await runtime.answerAppQuery({
    ...common,
    kind: SemanticAppQueryKind.TemplateCompletions,
    cursor: completionCursor,
    page: { size: 100 },
  });
  const cursor = await runtime.answerAppQuery({
    ...common,
    kind: SemanticAppQueryKind.TemplateCursorInfo,
    cursor: memberCursor,
  });
  const references = await runtime.answerAppQuery({
    ...common,
    kind: SemanticAppQueryKind.TemplateReferences,
    cursor: resourceCursor,
    includeDeclaration: true,
    page: { size: 100 },
  });
  const rename = await runtime.answerAppQuery({
    ...common,
    kind: SemanticAppQueryKind.TemplateRename,
    cursor: cursorInside(
      templateText,
      templatePath,
      '${message | projectionLabel}',
      'message',
    ),
    newName: 'announcement',
  });
  const renameFromTypeScript = await runtime.answerAppQuery({
    ...common,
    kind: SemanticAppQueryKind.TemplateRenameFromTypeScript,
    sourceFilePath: viewModelPath,
    cursor: cursorInside(
      viewModelText,
      viewModelPath,
      "readonly message = 'declared by the outer app'",
      'message',
    ),
    newName: 'announcement',
  });
  const app = await runtime.openApp({
    sourceFilePath: templatePath,
    analysisDepth: 'binding-observation',
    templateAnalysisBreadth,
    includeAuthoringTemplates: true,
  });
  const resources = app.emission.templates.resources;
  return {
    completion,
    cursor,
    references,
    rename,
    renameFromTypeScript,
    pressure: {
      controllers: resources.reduce(
        (count, resource) => count + resource.runtimeAnalysis.runtimeRendering.controllers.length,
        0,
      ),
      records: runtime.workspace.store.readTelemetrySnapshot().totalRecords,
    },
  };
}

async function bindingDataFlows(
  fixtureRoot: string,
  templateAnalysisBreadth: SemanticTemplateAnalysisBreadth,
) {
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    storeKey: `contract:template-analysis-breadth:binding:${templateAnalysisBreadth}`,
  });
  const answer = await runtime.answerAppQuery({
    kind: SemanticAppQueryKind.BindingDataFlows,
    analysisDepth: 'binding-observation',
    templateAnalysisBreadth,
    page: { size: 100 },
    appRetention: 'retain-app',
  });
  return { runtime, answer };
}

async function mismatchAnswers(
  fixtureRoot: string,
  templateAnalysisBreadth: SemanticTemplateAnalysisBreadth,
) {
  const templatePath = path.join(fixtureRoot, 'src/components/ticket-editor.html');
  const templateText = readFileSync(templatePath, 'utf8');
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    storeKey: `contract:template-analysis-breadth:mismatch:${templateAnalysisBreadth}`,
  });
  const common = {
    sourceFilePath: templatePath,
    analysisDepth: 'binding-observation' as const,
    templateAnalysisBreadth,
    includeAuthoringTemplates: true,
    diagnosticProjection: 'type-projection' as const,
    appRetention: 'retain-app' as const,
  };
  const diagnostics = await runtime.answerAppQuery({
    ...common,
    kind: SemanticAppQueryKind.TemplateDiagnostics,
    sourceFile: { filePath: templatePath },
    page: { size: 200 },
  });
  const codeActions = await runtime.answerAppQuery({
    ...common,
    kind: SemanticAppQueryKind.TemplateCodeActions,
    cursor: cursorInside(templateText, templatePath, 'value.bind="fulfillmentMethod"', 'fulfillmentMethod'),
  });
  return { diagnostics, codeActions };
}

async function cycleAnswers(
  fixtureRoot: string,
  templateAnalysisBreadth: SemanticTemplateAnalysisBreadth,
) {
  const templatePath = path.join(fixtureRoot, 'src/alpha-panel.ts');
  const templateText = readFileSync(templatePath, 'utf8');
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    storeKey: `contract:template-analysis-breadth:cycle:${templateAnalysisBreadth}`,
  });
  const common = {
    sourceFilePath: templatePath,
    analysisDepth: 'binding-observation' as const,
    templateAnalysisBreadth,
    includeAuthoringTemplates: true,
    appRetention: 'retain-app' as const,
  };
  const cursor = await runtime.answerAppQuery({
    ...common,
    kind: SemanticAppQueryKind.TemplateCursorInfo,
    cursor: cursorInside(templateText, templatePath, '${value}', 'value'),
  });
  const diagnostics = await runtime.answerAppQuery({
    ...common,
    kind: SemanticAppQueryKind.TemplateDiagnostics,
    sourceFile: { filePath: templatePath },
    diagnosticProjection: 'type-projection',
    page: { size: 100 },
  });
  const app = await runtime.openApp({
    sourceFilePath: templatePath,
    analysisDepth: 'binding-observation',
    templateAnalysisBreadth,
    includeAuthoringTemplates: true,
  });
  return {
    cursor,
    diagnostics,
    pressure: {
      controllers: app.emission.templates.resources.reduce(
        (count, resource) => count + resource.runtimeAnalysis.runtimeRendering.controllers.length,
        0,
      ),
    },
  };
}

async function appPressure(
  fixtureRoot: string,
  templateAnalysisBreadth: SemanticTemplateAnalysisBreadth | `${SemanticTemplateAnalysisBreadth}`,
) {
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    storeKey: `contract:template-analysis-breadth:pressure:${templateAnalysisBreadth}`,
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
    templateAnalysisBreadth,
  });
  const resources = app.emission.templates.resources;
  return {
    controllers: resources.reduce(
      (count, resource) => count + resource.runtimeAnalysis.runtimeRendering.controllers.length,
      0,
    ),
    bindings: resources.reduce(
      (count, resource) => count + resource.runtimeAnalysis.runtimeRendering.bindings.length,
      0,
    ),
    records: runtime.workspace.store.readTelemetrySnapshot().totalRecords,
    localBindings: Object.fromEntries(resources.map((resource) => [
      resource.compilation.definition.name,
      resourceLocalRuntimeBindings(runtime.workspace.store, resource).length,
    ])),
  };
}

function referenceKeys(
  rows: readonly { readonly referenceKind: string; readonly source?: { readonly path: string; readonly start: number } | null }[],
): readonly string[] {
  return rows.map((row) => `${row.referenceKind}:${row.source?.path ?? 'none'}:${row.source?.start ?? -1}`);
}

function cursorAfter(
  sourceText: string,
  filePath: string,
  marker: string,
): SemanticRuntimeSourceCursorInput {
  const markerStart = sourceText.indexOf(marker);
  if (markerStart < 0) {
    throw new Error(`Expected cursor marker '${marker}'.`);
  }
  return cursorAtOffset(sourceText, filePath, markerStart + marker.length);
}

function cursorInside(
  sourceText: string,
  filePath: string,
  marker: string,
  token: string,
): SemanticRuntimeSourceCursorInput {
  const markerStart = sourceText.indexOf(marker);
  const tokenStart = markerStart < 0 ? -1 : sourceText.indexOf(token, markerStart);
  if (markerStart < 0 || tokenStart < 0 || tokenStart >= markerStart + marker.length) {
    throw new Error(`Expected token '${token}' inside cursor marker '${marker}'.`);
  }
  return cursorAtOffset(sourceText, filePath, tokenStart + Math.min(1, token.length));
}

function cursorAtOffset(
  sourceText: string,
  filePath: string,
  offset: number,
): SemanticRuntimeSourceCursorInput {
  const lines = sourceText.slice(0, offset).split(/\r?\n/);
  return {
    filePath,
    line: lines.length - 1,
    character: lines.at(-1)?.length ?? 0,
    offset,
  };
}

function pressureFixtureRoot(name: string): string {
  return path.join(packageRoot, 'fixtures/pressure', name);
}

function withoutOpaqueHandles<TValue>(value: TValue): unknown {
  return JSON.parse(JSON.stringify(value, (key, nested) =>
    key.endsWith('Handle') || key.endsWith('Handles') ? undefined : nested
  ));
}

function latestTransition(runtime: SemanticRuntime, projectKey: string) {
  const generation = runtime.appAnalysisComputations.authorityFor(projectKey).current();
  if (generation == null) {
    throw new Error(`Expected a current app generation for '${projectKey}'.`);
  }
  const transition = runtime.computationLifecycle.readLatestTransition(generation.computationId);
  if (transition == null) {
    throw new Error(`Expected an app transition for '${projectKey}'.`);
  }
  return transition;
}

function createSlotForwardingFixture(componentCount: number): string {
  const fixtureRoot = mkdtempSync(path.join(packageRoot, '.temp-template-analysis-breadth-'));
  const sourceRoot = path.join(fixtureRoot, 'src');
  mkdirSync(sourceRoot, { recursive: true });
  writeFileSync(path.join(sourceRoot, 'aurelia-assets.d.ts'), [
    "declare module '*.html' {",
    '  const template: string;',
    '  export default template;',
    '}',
    '',
  ].join('\n'));
  writeFileSync(path.join(sourceRoot, 'app.html'), [
    '<template>',
    '  <chain-0>',
    '    <span au-slot="forwarded">${message}</span>',
    '  </chain-0>',
    '</template>',
    '',
  ].join('\n'));
  writeFileSync(path.join(sourceRoot, 'app.ts'), [
    "import { customElement } from '@aurelia/runtime-html';",
    "import template from './app.html';",
    "import { Chain0 } from './chain-0';",
    '',
    '@customElement({',
    "  name: 'slot-forwarding-app',",
    '  template,',
    '  dependencies: [Chain0],',
    '})',
    'export class SlotForwardingApp {',
    "  readonly message = 'forwarded';",
    '}',
    '',
  ].join('\n'));
  writeFileSync(path.join(sourceRoot, 'main.ts'), [
    "import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';",
    "import { SlotForwardingApp } from './app';",
    '',
    'new Aurelia()',
    '  .register(StandardConfiguration)',
    '  .app({ host: document.body, component: SlotForwardingApp })',
    '  .start();',
    '',
  ].join('\n'));
  for (let index = 0; index < componentCount; index += 1) {
    const next = index + 1 < componentCount ? index + 1 : null;
    writeFileSync(path.join(sourceRoot, `chain-${index}.html`), next == null
      ? '<template><au-slot name="forwarded"></au-slot></template>\n'
      : [
        '<template>',
        `  <chain-${next}>`,
        '    <template au-slot="forwarded">',
        '      <au-slot name="forwarded"></au-slot>',
        '    </template>',
        `  </chain-${next}>`,
        '</template>',
        '',
      ].join('\n'));
    writeFileSync(path.join(sourceRoot, `chain-${index}.ts`), [
      "import { customElement } from '@aurelia/runtime-html';",
      `import template from './chain-${index}.html';`,
      ...(next == null ? [] : [`import { Chain${next} } from './chain-${next}';`]),
      '',
      '@customElement({',
      `  name: 'chain-${index}',`,
      '  template,',
      ...(next == null ? [] : [`  dependencies: [Chain${next}],`]),
      '})',
      `export class Chain${index} {}`,
      '',
    ].join('\n'));
  }
  return fixtureRoot;
}

async function slotForwardingPressure(fixtureRoot: string, componentCount: number) {
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    storeKey: `contract:template-analysis-breadth:slot-chain:${componentCount}`,
  });
  const app = await runtime.openApp({
    analysisDepth: 'runtime-topology',
    templateAnalysisBreadth: 'resource-local',
  });
  const resources = app.emission.templates.resources;
  return {
    controllers: resources.reduce(
      (count, resource) => count + resource.runtimeAnalysis.runtimeRendering.controllers.length,
      0,
    ),
    records: runtime.workspace.store.readTelemetrySnapshot().totalRecords,
    guardrailSeams: resources.flatMap((resource) => resource.runtimeAnalysis.runtimeRendering.openSeams)
      .filter((seam) => seam.reasonKinds.includes(OpenSeamReasonKind.TemplateAnalysisBreadthGuardrail))
      .length,
  };
}
