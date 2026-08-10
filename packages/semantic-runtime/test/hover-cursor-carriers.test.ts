import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  createSemanticRuntime,
  NodeSemanticRuntimeProjectInputHost,
  SemanticAppQueryKind,
  SemanticRuntimeProjectInputAuthority,
  type SemanticAppDiagnosticRow,
  type SemanticTemplateCursorInfoResult,
  type SemanticTemplateDiagnosticRow,
} from '../src/index.js';
import { SemanticDiagnosticRelationKind } from '../src/api/contracts.js';
import {
  classifySemanticTemplateCursorUncertainty,
  semanticTemplateCursorDiagnosticPresentation,
  semanticTemplateCursorSourcesMatchExactly,
} from '../src/api/template-completion.js';
import type { IdentityHandle } from '../src/kernel/handles.js';
import type { SemanticSourceReference } from '../src/api/source-reference.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('hover cursor semantic carriers', () => {
  test('admits the complete cursor set before selecting and conserves co-located outcomes', () => {
    const activeSource = source('src/app.html', 10, 12);
    const primaryIdentity = 'hover-primary' as IdentityHandle;
    const rows = [
      diagnostic('missing-expression-member', 'information', activeSource, {
        diagnosticIdentityHandle: primaryIdentity,
        missingInputs: ['expression-member:selected-member-missing'],
      }),
      diagnostic('template-expression-typescript-diagnostic', 'error', source('src/app.html', 40, 45), {
        diagnosticAuthority: 'typescript',
        diagnosticIdentityHandle: 'hover-context' as IdentityHandle,
        diagnosticRelations: [{
          relationKind: SemanticDiagnosticRelationKind.SameOperationEvidence,
          relatedDiagnosticIdentityHandle: primaryIdentity,
        }],
      }),
      diagnostic('expression-parse-error', 'error', source('src/app.html', 5, 20)),
      diagnostic('weak-expression-member-owner', 'warning', activeSource, {
        missingInputs: ['expression-member-owner-type:any'],
      }),
      diagnostic('router-framework-error', 'error', activeSource),
    ] satisfies readonly SemanticTemplateDiagnosticRow[];

    const result = semanticTemplateCursorDiagnosticPresentation(
      rows,
      'hover-carrier-test',
      activeSource,
      11,
    );

    expect(result.diagnostics.map((row) => row.diagnosticKind)).toEqual([
      'missing-expression-member',
      'template-expression-typescript-diagnostic',
      'expression-parse-error',
      'weak-expression-member-owner',
    ]);
    expect(new Set(result.diagnostics).size).toBe(4);
    expect(result.diagnostics.some((row) => row.diagnosticKind === 'router-framework-error')).toBe(false);
    expect(result.diagnostics.some((row) => row.diagnosticKind === 'expression-parse-error')).toBe(true);
    expect(result.diagnostics.some((row) => row.diagnosticKind === 'weak-expression-member-owner')).toBe(true);
    expect(result.diagnosticPresentation).toMatchObject({
      kind: 'presented',
      rawRowCount: 4,
      group: {
        primary: { rowIndex: 0 },
        related: [{ rowIndex: 1 }],
        primarySeverity: 'information',
      },
    });
    if (result.diagnosticPresentation?.kind !== 'presented') {
      throw new Error('Expected one presented cursor diagnostic group.');
    }
    const presentation = result.diagnosticPresentation;
    expect(presentation.rawRowCount).toBe(result.diagnostics.length);
    expect(result.diagnostics[presentation.group.primary.rowIndex]?.severity)
      .toBe(presentation.group.primarySeverity);
    expect(new Set([
      presentation.group.primary.rowIndex,
      ...presentation.group.related.map((row) => row.rowIndex),
    ]).size).toBe(2);
  });

  test('presents one router cursor carrier through its exact AppDiagnostics replacement only', () => {
    const activeSource = source('src/router-app.html', 14, 27);
    const routerIdentity = 'hover-router-owner' as IdentityHandle;
    const repairSuggestion = {
      suggestionKind: 'fix-router-instruction',
      actionKind: 'rewrite-expression',
      actionTarget: {
        targetKind: 'expression',
        source: activeSource,
        memberName: null,
        typeDisplay: 'configured fallback or matching route',
      },
      summary: 'Use a configured route target, or configure a fallback for this route context.',
      targetMemberName: null,
      ownerTypeDisplay: null,
      valueTypeDisplay: 'configured fallback or matching route',
      valueTypeSource: null,
    } as const;
    const proxy = diagnostic('router-framework-error', 'error', activeSource, {
      diagnosticAuthority: 'framework-error-code',
      frameworkErrorCode: 'AUR3401',
      summary: 'No route matched and no fallback is configured.',
      missingInput: 'router:instruction-no-fallback',
      missingInputs: ['router:instruction-no-fallback'],
      diagnosticIdentityHandle: routerIdentity,
      suggestion: repairSuggestion,
    });
    const replacement = {
      projectKey: 'hover-router-replacement',
      diagnosticDomain: 'router',
      phase: 'route-recognition',
      diagnosticKind: 'instruction-no-fallback',
      diagnosticAuthority: 'framework-error-code',
      frameworkErrorCode: 'AUR3401',
      frameworkRawErrorAuthority: null,
      severity: 'error',
      summary: proxy.summary,
      missingInput: proxy.missingInput,
      missingInputs: proxy.missingInputs,
      source: activeSource,
      subject: null,
      diagnosticIdentityHandle: null,
      relatedInformation: [],
      suggestion: repairSuggestion,
      sourceRole: null,
      relatedQueryKind: 'router-issues',
      handles: {
        productHandle: null,
        identityHandle: routerIdentity,
        ownerIdentityHandle: null,
        sourceAddressHandle: null,
        relatedSourceAddressHandles: [],
        templateSourceAddressHandle: null,
        resourceDefinitionProductHandle: null,
        overlayOriginKey: null,
        overlayFileName: null,
        overlaySegmentLabel: null,
      },
    } satisfies SemanticAppDiagnosticRow;
    const wrongIdentityReplacement = {
      ...replacement,
      handles: {
        ...replacement.handles,
        identityHandle: 'hover-router-wrong-owner' as IdentityHandle,
      },
    } satisfies SemanticAppDiagnosticRow;
    const wrongSuggestionReplacement = {
      ...replacement,
      suggestion: {
        ...repairSuggestion,
        summary: 'A different repair must not claim the cursor proxy.',
      },
    } satisfies SemanticAppDiagnosticRow;
    const unrelatedReplacement = {
      ...replacement,
      diagnosticKind: 'invalid-instruction',
      frameworkErrorCode: 'AUR3400',
      summary: 'Unrelated router diagnostic.',
      missingInput: 'router:invalid-instruction',
      missingInputs: ['router:invalid-instruction'],
    } satisfies SemanticAppDiagnosticRow;

    const result = semanticTemplateCursorDiagnosticPresentation(
      [proxy, proxy],
      'hover-router-replacement',
      activeSource,
      20,
      [replacement, wrongIdentityReplacement, wrongSuggestionReplacement, unrelatedReplacement],
    );

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toBe(proxy);
    expect(result.diagnosticPresentation).toMatchObject({
      kind: 'presented',
      rawRowCount: 1,
      group: {
        primary: { rowIndex: 0 },
        related: [],
      },
    });
  });

  test('supplies the router-owned AUR3401 replacement to a real cursor query', async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/router-instruction-errors');
    const templatePath = path.join(fixtureRoot, 'src/router-instruction-errors-app.html');
    const templateText = readFileSync(templatePath, 'utf8');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'hover-router-diagnostic-replacement',
    });
    const answer = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      sourceFilePath: templatePath,
      cursor: cursorAtMarker(
        templateText,
        'load="missing-route"',
        'missing-route',
        templatePath,
      ),
      analysisDepth: 'binding-observation',
      diagnosticProjection: 'type-projection',
      includeAuthoringTemplates: true,
      appRetention: 'retain-app',
    });
    const info = answer.value as SemanticTemplateCursorInfoResult;

    expect(info.diagnostics).toHaveLength(1);
    expect(info.diagnostics[0]).toMatchObject({
      diagnosticKind: 'router-framework-error',
      frameworkErrorCode: 'AUR3401',
      missingInput: 'router:instruction-no-fallback',
      source: {
        path: 'src/router-instruction-errors-app.html',
        start: 14,
        end: 27,
      },
    });
    expect(info.diagnosticPresentation).toMatchObject({
      kind: 'presented',
      rawRowCount: 1,
      group: { primary: { rowIndex: 0 } },
    });
  }, 120_000);

  test('retains every co-located withheld fact while selecting one reindexed withheld state', () => {
    const activeSource = source('src/app.html', 10, 12);
    const result = semanticTemplateCursorDiagnosticPresentation([
      diagnostic('weak-expression-member-owner', 'warning', source('src/app.html', 5, 20), {
        missingInputs: ['expression-member-owner-type:any'],
      }),
      diagnostic('weak-expression-member-owner', 'error', activeSource, {
        missingInputs: ['expression-member-owner-type:no-members:Object'],
      }),
    ], 'hover-withheld-test', activeSource, 11);

    expect(result.diagnostics).toHaveLength(2);
    expect(result.diagnosticPresentation).toMatchObject({
      kind: 'withheld',
      rawRowCount: 2,
      withheld: { rowIndex: 1, reason: 'context-only-weak-owner' },
    });
  });

  test('requires exact canonical public paths for exact-source ranking', () => {
    expect(semanticTemplateCursorSourcesMatchExactly(
      source('src/app.html', 10, 12),
      source('src\\app.html', 10, 12),
    )).toBe(true);
    expect(semanticTemplateCursorSourcesMatchExactly(
      source('feature/src/app.html', 10, 12),
      source('src/app.html', 10, 12),
    )).toBe(false);

    const wrongFile = semanticTemplateCursorDiagnosticPresentation([
      diagnostic('expression-parse-error', 'error', source('feature/src/app.html', 5, 20)),
    ], 'hover-wrong-file-test', source('src/app.html', 10, 12), 11);
    expect(wrongFile).toEqual({ diagnostics: [], diagnosticPresentation: null });
  });

  test('translates only pressure tied to the displayed domain and locus', () => {
    const evidence = {
      selectedDefinition: false,
      selectedBindableValueType: undefined,
      selectedMemberTypeDisplay: undefined,
      selectedExpressionOpen: false,
      selectedScopeSlotTypeOpen: false,
    } as const;
    expect(classifySemanticTemplateCursorUncertainty({
      ...evidence,
      missingInputs: ['router-navigation-target-open'],
    })).toEqual({
      category: 'dynamic-route-target',
      affectedDomain: 'route',
      affectedLocus: 'route-target',
    });
    expect(classifySemanticTemplateCursorUncertainty({
      ...evidence,
      missingInputs: ['router-navigation-target-ambiguous'],
    })).toEqual({
      category: 'route-configuration-ambiguous',
      affectedDomain: 'route',
      affectedLocus: 'route-target',
    });
    expect(classifySemanticTemplateCursorUncertainty({
      ...evidence,
      selectedExpressionOpen: true,
      missingInputs: ['selected-expression-type:missing-context'],
    })).toEqual({
      category: 'type-information-incomplete',
      affectedDomain: 'binding-context',
      affectedLocus: 'selected-expression',
    });
    expect(classifySemanticTemplateCursorUncertainty({
      ...evidence,
      selectedDefinition: true,
      missingInputs: ['router.default-resources'],
    })).toEqual({
      category: 'resource-availability-incomplete',
      affectedDomain: 'resource',
      affectedLocus: 'selected-resource',
    });
    expect(classifySemanticTemplateCursorUncertainty({
      ...evidence,
      selectedMemberTypeDisplay: null,
      missingInputs: [],
    })).toEqual({
      category: 'type-information-incomplete',
      affectedDomain: 'member',
      affectedLocus: 'selected-member',
    });
    expect(classifySemanticTemplateCursorUncertainty({
      ...evidence,
      selectedBindableValueType: null,
      selectedBindableOwnsLocus: true,
      missingInputs: [],
    })).toEqual({
      category: 'type-information-incomplete',
      affectedDomain: 'bindable',
      affectedLocus: 'selected-bindable',
    });
    expect(classifySemanticTemplateCursorUncertainty({
      ...evidence,
      selectedBindableValueType: null,
      selectedBindableOwnsLocus: false,
      missingInputs: [],
    })).toBeNull();
    expect(classifySemanticTemplateCursorUncertainty({
      ...evidence,
      selectedMemberTypeDisplay: 'PartialItem',
      selectedScopeSlotTypeOpen: true,
      missingInputs: ['scope-slot:type-projection-open'],
    })).toEqual({
      category: 'type-information-incomplete',
      affectedDomain: 'member',
      affectedLocus: 'selected-member',
    });
    // A projected TypeScript `unknown` remains a known type display, not absent analysis.
    expect(classifySemanticTemplateCursorUncertainty({
      ...evidence,
      selectedBindableValueType: 'unknown',
      selectedMemberTypeDisplay: 'unknown',
      missingInputs: [],
    })).toBeNull();
    expect(classifySemanticTemplateCursorUncertainty({
      ...evidence,
      missingInputs: ['router.default-resources'],
    })).toBeNull();
    expect(classifySemanticTemplateCursorUncertainty({
      ...evidence,
      missingInputs: ['unmapped-internal-pressure'],
    })).toBeNull();
  });

  test('proves local roles from exact lexical or scope-creator evidence', async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-completion-member-metadata');
    const templatePath = path.join(fixtureRoot, 'src/app.html');
    const scriptPath = path.join(fixtureRoot, 'src/app.ts');
    const originalTemplateText = readFileSync(templatePath, 'utf8');
    const originalScriptText = readFileSync(scriptPath, 'utf8');
    const scriptText = originalScriptText
      .replace(
        "import { customElement } from 'aurelia';",
        "import { customAttribute, customElement } from 'aurelia';",
      )
      .replace(
        '@customElement({',
        [
          "@customAttribute({ name: 'multi-probe', bindables: ['missingValue'] })",
          'class MultiProbe {}',
          '',
          '@customElement({',
        ].join('\n'),
      )
      .replace('  template,', '  template,\n  dependencies: [MultiProbe],')
      .replace(
        'export class App {',
        "export class App {\n  public mystery: unknown = 'mystery';",
      );
    const templateText = originalTemplateText.replace('  <p>${}</p>', [
      '  <let local-title.bind="title"></let>',
      '  <p>${localTitle}</p>',
      '  <div repeat.for="item of [title]">${item}:${$index}</div>',
      "  <p>${[title].map(entry => entry).join(',')}</p>",
      '  <button click.trigger="$event.preventDefault()"></button>',
      '  <div multi-probe="missing-value: "></div>',
      '  <p>${missingLabel}</p>',
      '  <p>${mystery}</p>',
      '  <p>${title}</p>',
    ].join('\n'));
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'hover-cursor-local-role-carriers',
      projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost({
        readFile(fileName) {
          if (samePath(fileName, templatePath)) return templateText;
          if (samePath(fileName, scriptPath)) return scriptText;
          return undefined;
        },
        fileExists(fileName) {
          return samePath(fileName, templatePath) || samePath(fileName, scriptPath)
            ? true
            : undefined;
        },
      })),
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const cursorInfo = (
      needle: string,
      occurrence = 0,
    ): SemanticTemplateCursorInfoResult => app.ask({
        kind: SemanticAppQueryKind.TemplateCursorInfo,
        detail: 'handles',
        cursor: cursorAt(templateText, needle, occurrence),
      }).value as SemanticTemplateCursorInfoResult;

    expect(cursorInfo('local-title').selectedMember?.scopeRole).toBe('let-local');
    expect(cursorInfo('localTitle').selectedMember?.scopeRole).toBe('let-local');
    expect(cursorInfo('item').selectedMember?.scopeRole).toBe('repeat-local');
    expect(cursorInfo('item', 1).selectedMember?.scopeRole).toBe('repeat-local');
    expect(cursorInfo('$index').selectedMember?.scopeRole).toBe('repeat-contextual');
    const callbackDeclaration = cursorInfo('entry');
    const callbackUse = cursorInfo('entry', 1);
    const callbackDeclarationStart = templateText.indexOf('entry');
    const callbackUseStart = templateText.indexOf('entry', callbackDeclarationStart + 1);
    expect(callbackDeclaration.selectedMember).toMatchObject({
      name: 'entry',
      scopeRole: 'callback-parameter',
      typeDisplay: 'string',
    });
    expect(callbackUse.selectedMember).toMatchObject({
      name: 'entry',
      scopeRole: 'callback-parameter',
      typeDisplay: 'string',
    });
    expect(callbackDeclaration.activeSource).toMatchObject({
      path: 'src/app.html',
      start: callbackDeclarationStart,
      end: callbackDeclarationStart + 'entry'.length,
      role: 'name',
    });
    expect(callbackDeclaration.activeSource).toEqual(callbackDeclaration.selectedMember?.source);
    expect(callbackDeclaration.handles?.activeSourceAddressHandle).toBe(
      callbackDeclaration.selectedMember?.handles?.sourceAddressHandle,
    );
    expect(callbackDeclaration.handles?.activeSourceAddressHandle).not.toBeNull();
    expect(callbackUse.activeSource).toMatchObject({
      path: 'src/app.html',
      start: callbackUseStart,
      end: callbackUseStart + 'entry'.length,
    });
    expect(callbackUse.selectedMember?.source).toMatchObject({
      path: 'src/app.html',
      start: callbackDeclarationStart,
      end: callbackDeclarationStart + 'entry'.length,
      role: 'name',
    });
    expect(cursorInfo('$event').selectedMember?.scopeRole).toBe('listener-contextual');
    expect(cursorInfo('title', 3).selectedMember?.scopeRole).toBeNull();
    expect(cursorInfo('mystery').selectedMember).toMatchObject({
      typeDisplay: 'unknown',
      scopeRole: null,
    });
    expect(cursorInfo('mystery').uncertainty).toBeNull();

    const multiBindingTarget = cursorInfo('missing-value');
    expect(multiBindingTarget.selectedBindable).toMatchObject({
      name: 'missingValue',
      attribute: 'missing-value',
      valueType: null,
    });
    expect(multiBindingTarget.uncertainty).toEqual({
      category: 'type-information-incomplete',
      affectedDomain: 'bindable',
      affectedLocus: 'selected-bindable',
    });
    const multiBindingResource = cursorInfo('multi-probe');
    expect(multiBindingResource.selectedDefinition).toMatchObject({
      resourceKind: 'custom-attribute',
      matchedName: 'multi-probe',
    });
    expect(multiBindingResource.selectedBindable).toMatchObject({ valueType: null });
    expect(multiBindingResource.uncertainty).toBeNull();

    const diagnostic = cursorInfo('missingLabel');
    expect(diagnostic.diagnosticPresentation?.kind).toBe('presented');
    expect(diagnostic.diagnosticPresentation?.rawRowCount).toBe(diagnostic.diagnostics.length);
  }, 120_000);

  test('keeps a repeat declaration role stable across LSP store identities', async () => {
    const fixtureRoot = path.resolve(packageRoot, '../../fixtures/hello-world');
    const templatePath = path.join(fixtureRoot, 'src/my-app.html');
    const templateText = readFileSync(templatePath, 'utf8');
    const cursor = cursorAtMarker(
      templateText,
      'repeat.for="item of visibleItems"',
      'item',
      templatePath,
    );

    for (const storeKey of ['repeat-declaration-a', 'repeat-declaration-b']) {
      const runtime = await createSemanticRuntime({ workspaceRoot: fixtureRoot, storeKey });
      const answer = await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TemplateCursorInfo,
        sourceFilePath: templatePath,
        cursor,
        inquiryProfile: 'lsp-cursor',
        diagnosticProjection: 'type-projection',
        analysisDepth: 'binding-observation',
        includeAuthoringTemplates: true,
        appRetention: 'retain-app',
      });
      const info = answer.value as SemanticTemplateCursorInfoResult;

      expect(info.selectedMember).toMatchObject({
        name: 'item',
        typeDisplay: 'CatalogItem',
        scopeRole: 'repeat-local',
      });
      expect(info.activeSource).toEqual(info.selectedMember?.source);
      expect(sourceTextAt(templateText, info.activeSource)).toBe('item');
      expect(info.uncertainty).toBeNull();
    }
  }, 120_000);

  test('projects one exact local-bindable type across declaration name, alias, and mode loci', async () => {
    const fixtureRoot = path.join(
      packageRoot,
      'fixtures/pressure/template-local-template-semantics',
    );
    const filePath = 'src/template-local-template-semantics-app.html';
    const templateText = readFileSync(path.join(fixtureRoot, filePath), 'utf8');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'hover-cursor-local-bindable-type-carriers',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const cursorInfo = (
      marker: string,
      needle: string,
    ): SemanticTemplateCursorInfoResult => app.ask({
        kind: SemanticAppQueryKind.TemplateCursorInfo,
        detail: 'handles',
        cursor: cursorAtMarker(templateText, marker, needle, filePath),
      }).value as SemanticTemplateCursorInfoResult;

    const name = cursorInfo('<bindable name="oneTimeValue"', 'oneTimeValue');
    const attribute = cursorInfo('attribute="one-time-value"', 'one-time-value');
    const mode = cursorInfo('mode="oneTime"', 'oneTime');
    for (const info of [name, attribute, mode]) {
      expect(info.selectedBindable).toMatchObject({
        name: 'oneTimeValue',
        attribute: 'one-time-value',
        mode: 'oneTime',
        valueType: 'string',
        valueTypeShapeKind: 'primitive',
      });
      expect(info.uncertainty).toBeNull();
    }
    expect(name.activeSource).toEqual(name.selectedBindable?.nameSource);
    expect(attribute.activeSource).toEqual(attribute.selectedBindable?.attributeSource);
    expect(mode.activeSource).toEqual(mode.selectedBindable?.modeSource);
    expect(name.selectedMember).toMatchObject({ name: 'oneTimeValue', typeDisplay: 'string' });
    expect(attribute.selectedMember).toBeNull();
    expect(mode.selectedMember).toBeNull();

    const unused = cursorInfo('<bindable name="unusedValue"', 'unusedValue');
    expect(unused.selectedBindable).toMatchObject({
      name: 'unusedValue',
      attribute: 'unused-value',
      mode: 'default',
      valueType: null,
    });
    expect(unused.uncertainty).toEqual({
      category: 'type-information-incomplete',
      affectedDomain: 'bindable',
      affectedLocus: 'selected-bindable',
    });
  }, 120_000);

  test('classifies null bindable types only at exact authored type-owning loci', async () => {
    const fixtureRoot = path.join(
      packageRoot,
      'fixtures/pressure/template-local-template-semantics',
    );
    const filePath = 'src/template-local-template-semantics-app.html';
    const templatePath = path.join(fixtureRoot, filePath);
    const templateText = readFileSync(templatePath, 'utf8')
      .replace(
        '  <template as-custom-element="mode-panel"',
        '  <mode-panel unused-value.bind=""></mode-panel>\n\n  <template as-custom-element="mode-panel"',
      )
      .replace(
        '<bindable name="unusedValue"></bindable>',
        '<bindable name="unusedValue" attribute="unused-value" mode="oneTime"></bindable>',
      );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'hover-cursor-null-bindable-type-loci',
      projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost({
        readFile(fileName) {
          return samePath(fileName, templatePath) ? templateText : undefined;
        },
        fileExists(fileName) {
          return samePath(fileName, templatePath) ? true : undefined;
        },
      })),
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const cursorInfo = (
      marker: string,
      needle: string,
    ): SemanticTemplateCursorInfoResult => app.ask({
        kind: SemanticAppQueryKind.TemplateCursorInfo,
        cursor: cursorAtMarker(templateText, marker, needle, filePath),
      }).value as SemanticTemplateCursorInfoResult;
    const unavailableType = {
      category: 'type-information-incomplete',
      affectedDomain: 'bindable',
      affectedLocus: 'selected-bindable',
    } as const;
    const unusedName = cursorInfo('<bindable name="unusedValue"', 'unusedValue');
    const unusedAttribute = cursorInfo('attribute="unused-value" mode="oneTime"', 'unused-value');
    const unusedMode = cursorInfo(
      '<bindable name="unusedValue" attribute="unused-value" mode="oneTime"',
      'oneTime',
    );
    const unusedUse = cursorInfo('<mode-panel unused-value.bind=""', 'unused-value');
    for (const info of [unusedName, unusedAttribute, unusedUse]) {
      expect(info.selectedBindable).toMatchObject({
        name: 'unusedValue',
        attribute: 'unused-value',
        mode: 'oneTime',
        valueType: null,
      });
      expect(info.uncertainty).toEqual(unavailableType);
    }
    expect(unusedMode.selectedBindable).toMatchObject({
      name: 'unusedValue',
      attribute: 'unused-value',
      mode: 'oneTime',
      valueType: null,
    });
    expect(unusedMode.uncertainty).toBeNull();
  }, 120_000);

  test('does not attach bindable type uncertainty to a custom-attribute alias resource locus', async () => {
    const fixtureRoot = path.join(
      packageRoot,
      'fixtures/pressure/template-ref-listener-semantics',
    );
    const filePath = 'src/template-ref-listener-semantics-app.html';
    const templateText = readFileSync(path.join(fixtureRoot, filePath), 'utf8');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'hover-cursor-resource-alias-bindable-uncertainty',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const info = app.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      cursor: cursorAtMarker(
        templateText,
        '<ref-panel focus focus-ring.ref="aliasFocusRingController"',
        'focus',
        filePath,
      ),
    }).value as SemanticTemplateCursorInfoResult;

    expect(info.selectedDefinition).toMatchObject({
      resourceKind: 'custom-attribute',
      matchedName: 'focus',
    });
    expect(info.selectedBindable).toMatchObject({ valueType: null });
    expect(info.uncertainty).toBeNull();
  }, 120_000);

  test('authenticates route path and id loci without selecting query or fragment text', async () => {
    const routePathFixtureRoot = path.join(
      packageRoot,
      'fixtures/pressure/app-pattern-routed-catalog-storefront',
    );
    const routePathFile = 'src/app.html';
    const routePathText = readFileSync(path.join(routePathFixtureRoot, routePathFile), 'utf8');
    const routePathRuntime = await createSemanticRuntime({
      workspaceRoot: routePathFixtureRoot,
      storeKey: 'hover-cursor-route-path-carriers',
    });
    const routePathApp = await routePathRuntime.openApp({ analysisDepth: 'binding-observation' });
    const routePathInfo = (needle: string): SemanticTemplateCursorInfoResult => routePathApp.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      detail: 'handles',
      cursor: cursorAtMarker(
        routePathText,
        'items/item-1?ref=featured#details',
        needle,
        routePathFile,
      ),
    }).value as SemanticTemplateCursorInfoResult;
    const authoredPath = 'items/item-1';
    const authoredPathStart = routePathText.indexOf('items/item-1?ref=featured#details');
    for (const needle of ['items', 'item-1']) {
      const info = routePathInfo(needle);
      expect(info.selectedRouteTarget).toMatchObject({
        targetKind: 'route-path',
        matchedName: 'items/:itemId',
        routeConfigId: 'item-detail',
      });
      expect(info.activeSource).toMatchObject({
        path: routePathFile,
        start: authoredPathStart,
        end: authoredPathStart + authoredPath.length,
        role: 'route-path',
      });
      expect(sourceTextAt(routePathText, info.activeSource)).toBe(authoredPath);
      expect(info.handles?.activeSourceAddressHandle).toBeNull();
    }
    for (const needle of ['ref', 'details']) {
      const info = routePathInfo(needle);
      expect(info.selectedRouteTarget).toBeNull();
      expect(info.uncertainty).toBeNull();
      expect(sourceTextAt(routePathText, info.activeSource)).not.toBe(authoredPath);
    }

    const routeIdFixtureRoot = path.join(
      packageRoot,
      'fixtures/pressure/router-parameter-completion',
    );
    const routeIdFile = 'src/routes/parameter-workspace.html';
    const routeIdText = readFileSync(path.join(routeIdFixtureRoot, routeIdFile), 'utf8');
    const routeIdRuntime = await createSemanticRuntime({
      workspaceRoot: routeIdFixtureRoot,
      storeKey: 'hover-cursor-route-id-carriers',
    });
    const routeIdApp = await routeIdRuntime.openApp({ analysisDepth: 'binding-observation' });
    const routeIdInfo = (marker: string): SemanticTemplateCursorInfoResult => routeIdApp.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      detail: 'handles',
      cursor: cursorAtMarker(routeIdText, marker, 'product-detail', routeIdFile),
    }).value as SemanticTemplateCursorInfoResult;
    const staticRouteId = routeIdInfo('route: product-detail; params.bind');
    expect(staticRouteId.selectedRouteTarget).toMatchObject({
      targetKind: 'route-id',
      matchedName: 'product-detail',
    });
    expect(staticRouteId.activeSource).toEqual(staticRouteId.valueSite?.source);
    expect(staticRouteId.handles?.activeSourceAddressHandle).toBe(
      staticRouteId.valueSite?.handles?.sourceAddressHandle,
    );
    expect(staticRouteId.handles?.activeSourceAddressHandle).not.toBeNull();
    expect(sourceTextAt(routeIdText, staticRouteId.activeSource)).toBe('product-detail');

    const boundLiteralRouteId = routeIdInfo("route.bind: 'product-detail'");
    expect(boundLiteralRouteId.selectedRouteTarget).toMatchObject({
      targetKind: 'route-id',
      matchedName: 'product-detail',
    });
    expect(boundLiteralRouteId.activeSource).toEqual(boundLiteralRouteId.valueSite?.source);
    expect(boundLiteralRouteId.handles?.activeSourceAddressHandle).toBe(
      boundLiteralRouteId.valueSite?.handles?.sourceAddressHandle,
    );
    expect(boundLiteralRouteId.handles?.activeSourceAddressHandle).not.toBeNull();
    expect(sourceTextAt(routeIdText, boundLiteralRouteId.activeSource)).toBe("'product-detail'");

    const openContextRouteId = routeIdInfo(
      'route: product-detail; context.bind: alternateContext; params.bind',
    );
    expect(openContextRouteId.selectedRouteTarget).toBeNull();
    expect(openContextRouteId.missingInputs).toContain('router-navigation-target-open');
    expect(openContextRouteId.uncertainty).toEqual({
      category: 'dynamic-route-target',
      affectedDomain: 'route',
      affectedLocus: 'route-target',
    });
    expect(openContextRouteId.activeSource).toEqual(openContextRouteId.valueSite?.source);
    expect(openContextRouteId.handles?.activeSourceAddressHandle).toBe(
      openContextRouteId.valueSite?.handles?.sourceAddressHandle,
    );
    expect(openContextRouteId.handles?.activeSourceAddressHandle).not.toBeNull();
    expect(sourceTextAt(routeIdText, openContextRouteId.activeSource)).toBe('product-detail');
  }, 120_000);
});

function source(pathValue: string, start: number, end: number): SemanticSourceReference {
  return {
    kind: 'source-span-address',
    label: `${pathValue}@${start}..${end}`,
    path: pathValue,
    start,
    end,
    role: 'template-expression',
  };
}

function diagnostic(
  diagnosticKind: SemanticTemplateDiagnosticRow['diagnosticKind'],
  severity: SemanticTemplateDiagnosticRow['severity'],
  diagnosticSource: SemanticSourceReference,
  overrides: Partial<SemanticTemplateDiagnosticRow> = {},
): SemanticTemplateDiagnosticRow {
  const missingInputs = overrides.missingInputs ?? [];
  return {
    diagnosticKind,
    diagnosticAuthority: 'semantic-authoring-policy',
    frameworkErrorCode: null,
    severity,
    summary: diagnosticKind,
    missingInput: missingInputs[0] ?? null,
    missingInputs,
    source: diagnosticSource,
    relatedInformation: [],
    selectedMemberName: null,
    ownerTypeDisplay: null,
    ownerTypeShapeKind: null,
    ownerTypeOrigin: null,
    suggestion: null,
    phase: null,
    siteKind: 'expression',
    valueSiteKind: null,
    subject: null,
    diagnosticIdentityHandle: null,
    template: {
      compilationLane: null,
      source: diagnosticSource,
    },
    ...overrides,
  };
}

function cursorAt(sourceText: string, needle: string, occurrence: number, filePath = 'src/app.html'): {
  readonly filePath: string;
  readonly line: number;
  readonly character: number;
  readonly offset: number;
} {
  let offset = -1;
  for (let index = 0; index <= occurrence; index++) {
    offset = sourceText.indexOf(needle, offset + 1);
  }
  if (offset < 0) {
    throw new Error(`Expected occurrence ${occurrence} of ${needle}.`);
  }
  const cursorOffset = offset + Math.min(1, needle.length - 1);
  const lines = sourceText.slice(0, cursorOffset).split(/\r?\n/u);
  return {
    filePath,
    line: lines.length - 1,
    character: lines.at(-1)?.length ?? 0,
    offset: cursorOffset,
  };
}

function cursorAtMarker(
  sourceText: string,
  marker: string,
  needle: string,
  filePath: string,
): ReturnType<typeof cursorAt> {
  const markerOffset = sourceText.indexOf(marker);
  if (markerOffset < 0) {
    throw new Error(`Expected marker ${marker}.`);
  }
  const needleOffset = sourceText.indexOf(needle, markerOffset);
  if (needleOffset < 0 || needleOffset >= markerOffset + marker.length) {
    throw new Error(`Expected ${needle} inside marker ${marker}.`);
  }
  const cursorOffset = needleOffset + Math.min(1, needle.length - 1);
  const lines = sourceText.slice(0, cursorOffset).split(/\r?\n/u);
  return {
    filePath,
    line: lines.length - 1,
    character: lines.at(-1)?.length ?? 0,
    offset: cursorOffset,
  };
}

function sourceTextAt(
  sourceText: string,
  sourceReference: SemanticSourceReference | null,
): string | null {
  return sourceReference?.start == null || sourceReference.end == null
    ? null
    : sourceText.slice(sourceReference.start, sourceReference.end);
}

function samePath(left: string, right: string): boolean {
  return path.resolve(left).replace(/\\/gu, '/').toLowerCase()
    === path.resolve(right).replace(/\\/gu, '/').toLowerCase();
}
