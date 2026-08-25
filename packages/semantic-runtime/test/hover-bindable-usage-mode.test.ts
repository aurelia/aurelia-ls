import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  createSemanticRuntime,
  NodeSemanticRuntimeProjectInputHost,
  SemanticAppQueryKind,
  SemanticRuntimeProjectInputAuthority,
  SemanticRuntimeProjectInputChange,
  SemanticRuntimeProjectInputChangeKind,
  type SemanticTemplateCursorBindableRow,
  type SemanticTemplateCursorInfoResult,
  type SemanticTemplateDiagnosticsResult,
} from '../src/index.js';
import type { SemanticSourceReference } from '../src/api/source-reference.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('hover bindable usage-effective mode', () => {
  test('keeps compact hello-world valueless bindable current without inventing a value span', async () => {
    const fixtureRoot = path.resolve(packageRoot, '../../fixtures/hello-world');
    const templatePath = path.join(fixtureRoot, 'src/my-app.html');
    const original = readFileSync(templatePath, 'utf8');
    const templateText = original.replace(
      'selected.bind="item.sku === state.selectedSku"',
      'selected',
    );
    const overlay = new MutableSourceOverlay();
    overlay.write(templatePath, templateText);
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'hover-bindable-valueless-hello-world',
      projectInputAuthority: new SemanticRuntimeProjectInputAuthority(
        new NodeSemanticRuntimeProjectInputHost(overlay),
      ),
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const info = app.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      cursor: cursorAtMarker(
        templateText,
        'selected\n          click.trigger',
        'selected',
        'src/my-app.html',
      ),
    }).value as SemanticTemplateCursorInfoResult;

    expect(info).toMatchObject({
      siteKind: 'attribute-value',
      missingInputs: [],
      valueSite: {
        siteKind: 'bindable-value',
        rawValue: '',
        bindingCommandName: null,
        bindableAttribute: 'selected',
      },
      html: {
        attributeName: 'selected',
        attributeValue: '',
        attributeValueSource: null,
      },
      selectedBindable: {
        name: 'selected',
        mode: 'toView',
        usageEffectiveMode: null,
        usageModeAuthority: 'plain-literal',
        usagePresentationKind: 'bindable-attribute',
        usageModeLocus: 'attribute',
        usageModeCommand: null,
        usageModeCommandKind: null,
        usageModeCommandSource: null,
        usageModeOpenReason: null,
      },
    });
    expect(sourceTextAt(templateText, info.activeSource)).toBe('selected');
    expect(sourceTextAt(templateText, info.selectedBindable?.usageModeTargetSource ?? null)).toBe('selected');
    expect(sourceTextAt(templateText, info.selectedBindable?.usageModeSource ?? null)).toContain('selected');
    expect(info.displayText).toContain('default=toView; static (no binding mode)');
  }, 120_000);

  test('conserves exact CE/CA usage modes, authorities, grammar loci, and open runtime pressure', async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/bindable-contracts-lab');
    const templatePath = path.join(fixtureRoot, 'src/bindable-lab-app.html');
    const appScriptPath = path.join(fixtureRoot, 'src/bindable-lab-app.ts');
    const mainPath = path.join(fixtureRoot, 'src/main.ts');
    const staticCardPath = path.join(fixtureRoot, 'src/static-card.ts');
    const originalTemplate = readFileSync(templatePath, 'utf8');
    const originalAppScript = readFileSync(appScriptPath, 'utf8');
    const originalStaticCard = readFileSync(staticCardPath, 'utf8');
    const mainText = readFileSync(mainPath, 'utf8')
      .replace("import Aurelia from 'aurelia';", "import Aurelia, { ShortHandBindingSyntax } from 'aurelia';")
      .replace('void Aurelia.app({', 'void Aurelia.register(...ShortHandBindingSyntax).app({');
    let templateText = bindableUsageTemplate(originalTemplate);
    const appScriptText = customModeResourcesScript(originalAppScript);
    let staticCardText = originalStaticCard;
    const overlay = new MutableSourceOverlay();
    overlay.write(templatePath, templateText);
    overlay.write(appScriptPath, appScriptText);
    overlay.write(staticCardPath, staticCardText);
    overlay.write(mainPath, mainText);
    const authority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'hover-bindable-usage-mode',
      projectInputAuthority: authority,
    });
    let app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const info = (marker: string, token: string): SemanticTemplateCursorInfoResult => app.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      detail: 'handles',
      cursor: cursorAtMarker(templateText, marker, token),
    }).value as SemanticTemplateCursorInfoResult;
    const bindable = (marker: string, token: string): SemanticTemplateCursorBindableRow => {
      const row = info(marker, token).selectedBindable;
      if (row == null) {
        throw new Error(`Expected one selected bindable for ${marker}.`);
      }
      return row;
    };

    expectUsage(bindable('title.bind="titleText"', 'title'), {
      mode: 'toView',
      usageEffectiveMode: 'toView',
      usageModeAuthority: 'framework-fallback',
      usageModeCommand: 'bind',
      usageModeCommandKind: 'built-in',
      usageModeLocus: 'attribute',
      usagePresentationKind: 'bindable-attribute',
    }, templateText, 'title', 'bind');
    expect(info('title.bind="titleText"', 'title').displayText).toContain(
      'Selected bindable: title (default=toView; effective=toView via framework-fallback).',
    );
    expect(sourceTextAt(templateText, info('title.bind="titleText"', 'title').html.attributeValueSource))
      .toBe('titleText');
    expectUsage(bindable('display-label.bind="aliasLabel"', 'display-label'), {
      attribute: 'display-label',
      usageEffectiveMode: 'toView',
      usageModeAuthority: 'framework-fallback',
    }, templateText, 'display-label', 'bind');
    expectUsage(bindable('title.BIND="titleText"', 'title'), {
      usageEffectiveMode: 'toView',
      usageModeAuthority: 'framework-fallback',
      usageModeCommand: 'bind',
      usageModeCommandKind: 'built-in',
      usageModeLocus: 'attribute',
    }, templateText, 'title', 'BIND');

    const colonElement = bindable(':DISPLAY-LABEL="aliasLabel"', 'DISPLAY-LABEL');
    expect(colonElement).toMatchObject({
      name: 'labelText',
      attribute: 'display-label',
      usageEffectiveMode: 'toView',
      usageModeAuthority: 'framework-fallback',
      usageModeCommand: 'bind',
      usageModeCommandKind: 'built-in',
      usageModeLocus: 'attribute-pattern',
      usagePresentationKind: 'bindable-attribute',
    });
    expect(sourceTextAt(templateText, colonElement.usageModeTargetSource)).toBe('DISPLAY-LABEL');
    expect(sourceTextAt(templateText, colonElement.usageModeCommandSource)).toBe(':');
    expect(sourceTextAt(templateText, colonElement.usageModeSource)).toBe(':');

    const colonAttribute = bindable(':two-way-state="twoWayValue"', 'two-way-state');
    expect(colonAttribute).toMatchObject({
      mode: 'twoWay',
      usageEffectiveMode: 'twoWay',
      usageModeAuthority: 'bindable-default',
      usageModeCommand: 'bind',
      usageModeLocus: 'attribute-pattern',
      usagePresentationKind: 'resource-primary',
    });
    expect(sourceTextAt(templateText, colonAttribute.usageModeTargetSource)).toBe('two-way-state');
    expect(sourceTextAt(templateText, colonAttribute.usageModeCommandSource)).toBe(':');

    for (const [marker, token, mode, command] of [
      ['count.one-time="count"', 'count', 'oneTime', 'one-time'],
      ['quantity.to-view="quantity"', 'quantity', 'toView', 'to-view'],
      ['strict-quantity.from-view="strictQuantity"', 'strict-quantity', 'fromView', 'from-view'],
      ['normalized-label.two-way="normalizedLabel"', 'normalized-label', 'twoWay', 'two-way'],
    ] as const) {
      expectUsage(bindable(marker, token), {
        usageEffectiveMode: mode,
        usageModeAuthority: 'explicit-command',
        usageModeCommand: command,
        usageModeCommandKind: 'built-in',
        usageModeLocus: 'attribute',
      }, templateText, token, command);
    }

    const declarationDefault = bindable('display-headline.bind="headline"', 'display-headline');
    expect(declarationDefault).toMatchObject({
      mode: 'oneTime',
      usageEffectiveMode: 'oneTime',
      usageModeAuthority: 'bindable-default',
      usageModeCommand: 'bind',
      usageModeCommandKind: 'built-in',
    });
    expect(sourceTextFor(declarationDefault.usageModeSource, new Map([
      [templatePath, templateText],
      [staticCardPath, staticCardText],
    ]))).toContain('BindingMode.oneTime');
    expect(sourceTextAt(templateText, declarationDefault.usageModeCommandSource)).toBe('bind');

    expectUsage(bindable('message.bind: statusMessage', 'message'), {
      usageEffectiveMode: 'toView',
      usageModeAuthority: 'framework-fallback',
      usageModeCommand: 'bind',
      usageModeCommandKind: 'built-in',
      usageModeLocus: 'multi-binding',
      usagePresentationKind: 'bindable-attribute',
    }, templateText, 'message', 'bind');
    expectUsage(bindable('display-label.bind: aliasLabel', 'display-label'), {
      name: 'labelText',
      attribute: 'display-label',
      usageEffectiveMode: 'toView',
      usageModeAuthority: 'framework-fallback',
      usageModeLocus: 'multi-binding',
    }, templateText, 'display-label', 'bind');
    expectUsage(bindable('message.one-time: statusMessage', 'message'), {
      usageEffectiveMode: 'oneTime',
      usageModeAuthority: 'explicit-command',
      usageModeCommand: 'one-time',
      usageModeLocus: 'multi-binding',
    }, templateText, 'message', 'one-time');

    const literal = bindable('message: Literal status', 'message');
    expect(literal).toMatchObject({
      usageEffectiveMode: null,
      usageModeAuthority: 'plain-literal',
      usageModeCommand: null,
      usageModeCommandKind: null,
      usageModeLocus: 'multi-binding',
      usageModeOpenReason: null,
    });
    expect(sourceTextAt(templateText, literal.usageModeTargetSource)).toBe('message');
    expect(sourceTextAt(templateText, literal.usageModeSource)).toBe('Literal status');
    expect(info('message: Literal status', 'message').displayText).toContain(
      'Selected bindable: message (default=toView; static (no binding mode)).',
    );

    const valueless = bindable('<profile-card data-case="valueless" title>', 'title');
    expect(valueless).toMatchObject({
      usageEffectiveMode: null,
      usageModeAuthority: 'plain-literal',
      usageModeCommand: null,
      usageModeOpenReason: null,
    });
    expect(sourceTextAt(templateText, valueless.usageModeTargetSource)).toBe('title');
    expect(sourceTextAt(templateText, valueless.usageModeSource)).toBe('title');
    expect(info('<profile-card data-case="valueless" title>', 'title').html.attributeValueSource).toBeNull();

    const quotedEmpty = bindable('<profile-card data-case="quoted-empty" title="">', 'title');
    expect(quotedEmpty).toMatchObject({
      usageEffectiveMode: null,
      usageModeAuthority: 'plain-literal',
      usageModeOpenReason: null,
    });
    expect(sourceTextAt(templateText, quotedEmpty.usageModeTargetSource)).toBe('title');
    expect(sourceTextAt(templateText, quotedEmpty.usageModeSource)).toBe('');
    expect(sourceTextAt(
      templateText,
      info('<profile-card data-case="quoted-empty" title="">', 'title').html.attributeValueSource,
    )).toBe('');

    const valuelessAttribute = bindable('<section data-case="valueless-ca" display-hint>', 'display-hint');
    expect(valuelessAttribute).toMatchObject({
      usageEffectiveMode: null,
      usageModeAuthority: 'open',
      usageModeCommand: null,
    });
    expect(valuelessAttribute.usageModeOpenReason).toContain('instruction');

    const emptyAttribute = bindable('<section data-case="empty-ca" display-hint="">', 'display-hint');
    expect(emptyAttribute).toMatchObject({
      usageEffectiveMode: null,
      usageModeAuthority: 'open',
      usagePresentationKind: 'resource-primary',
    });
    expect(emptyAttribute.usageModeOpenReason).toContain('Valueless custom-attribute');

    const interpolation = bindable('tone: ${accentTone}', 'tone');
    expect(interpolation).toMatchObject({
      usageEffectiveMode: 'toView',
      usageModeAuthority: 'interpolation',
      usageModeCommand: null,
      usageModeLocus: 'multi-binding',
      usageModeOpenReason: null,
    });
    expect(sourceTextAt(templateText, interpolation.usageModeSource)).toBe('${accentTone}');

    const twoWayInterpolation = bindable('selected-id="${selectedId}"', 'selected-id');
    expect(twoWayInterpolation.usageModeOpenReason).toBeNull();
    expect(twoWayInterpolation).toMatchObject({
      mode: 'twoWay',
      usageEffectiveMode: 'toView',
      usageModeAuthority: 'interpolation',
      usageModeCommand: null,
    });
    expect(sourceTextAt(templateText, twoWayInterpolation.usageModeSource)).toBe('${selectedId}');

    const caDefault = bindable('two-way-state.bind="twoWayValue"', 'two-way-state');
    expect(caDefault).toMatchObject({
      mode: 'twoWay',
      usageEffectiveMode: 'twoWay',
      usageModeAuthority: 'bindable-default',
      usageModeCommand: 'bind',
      usageModeLocus: 'attribute',
      usagePresentationKind: 'resource-primary',
    });
    expect(sourceTextAt(templateText, caDefault.usageModeCommandSource)).toBe('bind');
    expectDefinitionOwnsBindable(info('two-way-state.bind="twoWayValue"', 'two-way-state'));

    const inlineBehaviorInfo = info('message.bind: statusMessage & twoWay', 'message');
    const inlineBehavior = inlineBehaviorInfo.selectedBindable;
    expect(inlineBehavior).toMatchObject({
      usageEffectiveMode: 'twoWay',
      usageModeAuthority: 'binding-behavior',
      usageModeCommand: 'bind',
      usageModeLocus: 'multi-binding',
    });
    expect(sourceTextAt(templateText, inlineBehavior?.usageModeSource ?? null)).toBe('twoWay');
    expect(sourceTextAt(templateText, inlineBehavior?.usageModeCommandSource ?? null)).toBe('bind');

    const outerMultiInfo = info('message.bind: statusMessage', 'message');
    expect(outerMultiInfo.valueSite).toMatchObject({
      siteKind: 'multi-binding-value',
      bindingCommandName: null,
    });
    expect(sourceTextAt(templateText, outerMultiInfo.valueSite?.source ?? null)).toContain('message.bind: statusMessage');
    expect(outerMultiInfo.selectedBindable?.usageModeSource).not.toEqual(outerMultiInfo.valueSite?.source);
    expectDefinitionOwnsBindable(outerMultiInfo);

    const secondaryMultiInfo = info('display-label.bind: aliasLabel', 'display-label');
    expect(secondaryMultiInfo.valueSite).toMatchObject({
      siteKind: 'multi-binding-value',
      bindingCommandName: null,
      bindableAttribute: 'message',
    });
    expect(secondaryMultiInfo.selectedBindable).toMatchObject({ attribute: 'display-label' });
    expectDefinitionOwnsBindable(secondaryMultiInfo);

    const behavior = bindable('title.bind="titleText & twoWay"', 'title');
    expect(behavior).toMatchObject({
      usageEffectiveMode: 'twoWay',
      usageModeAuthority: 'binding-behavior',
      usageModeCommand: 'bind',
      usageModeCommandKind: 'built-in',
      usageModeOpenReason: null,
    });
    expect(sourceTextAt(templateText, behavior.usageModeSource)).toBe('twoWay');
    expect(sourceTextAt(templateText, behavior.usageModeCommandSource)).toBe('bind');

    for (const [marker, reasonFragment] of [
      ['title.bind="titleText & customMode"', 'Custom binding behavior'],
      ['title="${titleText & twoWay}"', 'Interpolation mode'],
      ['title="${titleText & fromView}"', 'Interpolation mode'],
      ['title.custom-mode="titleText"', 'lowering'],
    ] as const) {
      const row = bindable(marker, 'title');
      expect(row).toMatchObject({
        usageEffectiveMode: null,
        usageModeAuthority: 'open',
      });
      expect(row.usageModeOpenReason).toContain(reasonFragment);
      expect(info(marker, 'title').missingInputs).toContain('bindable-usage-mode:open');
      expect(info(marker, 'title').displayText).toContain('effective=open');
    }
    expect(info('title.unknown-mode="titleText"', 'title').selectedBindable).toMatchObject({
      usageEffectiveMode: null,
      usageModeAuthority: 'open',
      usageModeCommand: 'unknown-mode',
      usageModeCommandKind: null,
      usageModeOpenReason: expect.stringContaining('lowering'),
    });

    const invalidFromView = bindable('strict-quantity.from-view="42"', 'strict-quantity');
    expect(invalidFromView).toMatchObject({
      usageEffectiveMode: 'fromView',
      usageModeAuthority: 'explicit-command',
      usageModeOpenReason: null,
    });
    expect(sourceTextAt(templateText, invalidFromView.usageModeCommandSource)).toBe('from-view');

    const diagnostics = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      sourceFilePath: templatePath,
      sourceFile: { filePath: templatePath },
      analysisDepth: 'binding-observation',
      diagnosticProjection: 'type-projection',
      appRetention: 'retain-app',
    });
    const diagnosticValue = diagnostics.value as SemanticTemplateDiagnosticsResult;
    expect(diagnosticValue.rows.flatMap((row) => row.missingInputs))
      .not.toContain('bindable-usage-mode:open');
    const invalidMarkerOffset = templateText.indexOf('strict-quantity.from-view="42"');
    const invalidOffset = templateText.indexOf('42', invalidMarkerOffset);
    expect(diagnosticValue.rows).toContainEqual(expect.objectContaining({
      diagnosticKind: expect.stringContaining('assignment'),
      source: expect.objectContaining({
        start: expect.any(Number),
        end: expect.any(Number),
      }),
    }));
    expect(diagnosticValue.rows.some((row) =>
      row.source?.start != null
      && row.source.end != null
      && row.source.start <= invalidOffset
      && invalidOffset <= row.source.end
    )).toBe(true);

    const firstProjectKey = app.project.projectKey;
    templateText = templateText.replace('title.bind="titleText"', 'title.from-view="titleText"');
    overlay.write(templatePath, templateText);
    authority.advance([new SemanticRuntimeProjectInputChange(
      SemanticRuntimeProjectInputChangeKind.FileValue,
      templatePath,
    )]);
    app = await runtime.openApp({ projectKey: firstProjectKey, analysisDepth: 'binding-observation' });
    expectUsage(bindable('title.from-view="titleText"', 'title'), {
      usageEffectiveMode: 'fromView',
      usageModeAuthority: 'explicit-command',
      usageModeCommand: 'from-view',
    }, templateText, 'title', 'from-view');

    staticCardText = staticCardText.replace('BindingMode.oneTime', 'BindingMode.twoWay');
    overlay.write(staticCardPath, staticCardText);
    authority.advance([new SemanticRuntimeProjectInputChange(
      SemanticRuntimeProjectInputChangeKind.FileValue,
      staticCardPath,
    )]);
    app = await runtime.openApp({ projectKey: firstProjectKey, analysisDepth: 'binding-observation' });
    const refreshedDefault = bindable('display-headline.bind="headline"', 'display-headline');
    expect(refreshedDefault).toMatchObject({
      mode: 'twoWay',
      usageEffectiveMode: 'twoWay',
      usageModeAuthority: 'bindable-default',
    });
    expect(sourceTextFor(refreshedDefault.usageModeSource, new Map([
      [templatePath, templateText],
      [staticCardPath, staticCardText],
    ]))).toContain('BindingMode.twoWay');
  }, 120_000);

  test('keeps local-template declaration defaults separate from exact usage-effective modes', async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-local-template-semantics');
    const templatePath = path.join(fixtureRoot, 'src/template-local-template-semantics-app.html');
    const mainPath = path.join(fixtureRoot, 'src/main.ts');
    const templateText = readFileSync(templatePath, 'utf8').replace('</template>', [
      '  <mode-panel :one-time-value="oneTimeValue"></mode-panel>',
      '</template>',
    ].join('\n'));
    const unregisteredOverlay = new MutableSourceOverlay();
    unregisteredOverlay.write(templatePath, templateText);
    const unregisteredRuntime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'hover-local-bindable-usage-mode-unregistered-shorthand',
      projectInputAuthority: new SemanticRuntimeProjectInputAuthority(
        new NodeSemanticRuntimeProjectInputHost(unregisteredOverlay),
      ),
    });
    const unregisteredApp = await unregisteredRuntime.openApp({ analysisDepth: 'binding-observation' });
    const unregistered = unregisteredApp.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      cursor: cursorAtMarker(
        templateText,
        ':one-time-value="oneTimeValue"',
        'one-time-value',
        'src/template-local-template-semantics-app.html',
      ),
    }).value as SemanticTemplateCursorInfoResult;
    expect(unregistered.selectedBindable).toBeNull();
    const unregisteredDiagnostics = await unregisteredRuntime.answerAppQuery({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      sourceFilePath: templatePath,
      sourceFile: { filePath: templatePath },
      analysisDepth: 'binding-observation',
      diagnosticProjection: 'type-projection',
      appRetention: 'retain-app',
    });
    expect((unregisteredDiagnostics.value as SemanticTemplateDiagnosticsResult).rows).toContainEqual(
      expect.objectContaining({
        diagnosticKind: 'framework-capability-not-registered',
        missingInput: 'runtime-html.short-hand-binding-syntax',
      }),
    );

    const overlay = new MutableSourceOverlay();
    overlay.write(templatePath, templateText);
    overlay.write(
      mainPath,
      readFileSync(mainPath, 'utf8')
        .replace('  StandardConfiguration,', '  ShortHandBindingSyntax,\n  StandardConfiguration,')
        .replace('.register(StandardConfiguration)', '.register(StandardConfiguration, ...ShortHandBindingSyntax)'),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'hover-local-bindable-usage-mode',
      projectInputAuthority: new SemanticRuntimeProjectInputAuthority(
        new NodeSemanticRuntimeProjectInputHost(overlay),
      ),
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const info = (marker: string, token: string): SemanticTemplateCursorInfoResult => app.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      detail: 'handles',
      cursor: cursorAtMarker(
        templateText,
        marker,
        token,
        'src/template-local-template-semantics-app.html',
      ),
    }).value as SemanticTemplateCursorInfoResult;

    const oneTime = info('one-time-value.bind="oneTimeValue"', 'one-time-value').selectedBindable;
    expect(oneTime).toMatchObject({
      mode: 'oneTime',
      usageEffectiveMode: 'oneTime',
      usageModeAuthority: 'bindable-default',
      usageModeCommand: 'bind',
      usageModeLocus: 'attribute',
    });
    expect(sourceTextAt(templateText, oneTime?.usageModeSource ?? null)).toBe('oneTime');
    expect(sourceTextAt(templateText, oneTime?.usageModeCommandSource ?? null)).toBe('bind');

    const explicitDefault = info('default-value.bind="defaultValue"', 'default-value').selectedBindable;
    expect(explicitDefault).toMatchObject({
      mode: 'default',
      usageEffectiveMode: 'toView',
      usageModeAuthority: 'framework-fallback',
      usageModeCommand: 'bind',
    });
    expect(sourceTextAt(templateText, explicitDefault?.usageModeSource ?? null)).toBe('bind');

    const colonLocal = info(':one-time-value="oneTimeValue"', 'one-time-value').selectedBindable;
    expect(colonLocal?.usageModeOpenReason).toBeNull();
    expect(colonLocal).toMatchObject({
      mode: 'oneTime',
      usageEffectiveMode: 'oneTime',
      usageModeAuthority: 'bindable-default',
      usageModeCommand: 'bind',
      usageModeLocus: 'attribute-pattern',
    });
    expect(sourceTextAt(templateText, colonLocal?.usageModeTargetSource ?? null)).toBe('one-time-value');
    expect(sourceTextAt(templateText, colonLocal?.usageModeCommandSource ?? null)).toBe(':');

    const declaration = info(
      '<bindable name="twoWayValue" attribute="two-way-value" mode="twoWay">',
      'twoWayValue',
    ).selectedBindable;
    expect(declaration).toMatchObject({
      mode: 'twoWay',
      usageEffectiveMode: null,
      usageModeAuthority: null,
      usageModeCommand: null,
      usageModeLocus: null,
      usagePresentationKind: null,
      usageModeCommandKind: null,
      usageModeCommandSource: null,
      usageModeTargetSource: null,
      usageModeSource: null,
      usageModeOpenReason: null,
    });
    expect(info(
      '<bindable name="twoWayValue" attribute="two-way-value" mode="twoWay">',
      'twoWayValue',
    ).displayText).toContain('Selected bindable: two-way-value (default=twoWay).');
  }, 120_000);
});

class MutableSourceOverlay {
  private readonly sourceTextByFileName = new Map<string, string>();

  write(fileName: string, sourceText: string): void {
    this.sourceTextByFileName.set(path.resolve(fileName), sourceText);
  }

  readFile(fileName: string): string | undefined {
    return this.sourceTextByFileName.get(path.resolve(fileName));
  }

  fileExists(fileName: string): boolean | undefined {
    return this.sourceTextByFileName.has(path.resolve(fileName)) ? true : undefined;
  }
}

function bindableUsageTemplate(original: string): string {
  return original.replace('</template>', [
    '  <profile-card title.BIND="titleText"></profile-card>',
    '  <profile-card :DISPLAY-LABEL="aliasLabel"></profile-card>',
    '  <section :two-way-state="twoWayValue"></section>',
    '  <profile-card data-case="valueless" title></profile-card>',
    '  <profile-card data-case="quoted-empty" title=""></profile-card>',
    '  <section data-case="valueless-ca" display-hint></section>',
    '  <section data-case="empty-ca" display-hint=""></section>',
    '  <profile-card selected-id="${selectedId}"></profile-card>',
    '  <profile-card',
    '    count.one-time="count"',
    '    quantity.to-view="quantity"',
    '    strict-quantity.from-view="strictQuantity"',
    '    normalized-label.two-way="normalizedLabel">',
    '  </profile-card>',
    '  <profile-card title.bind="titleText & twoWay"></profile-card>',
    '  <profile-card title.bind="titleText & customMode"></profile-card>',
    '  <profile-card title="${titleText & twoWay}"></profile-card>',
    '  <profile-card title="${titleText & fromView}"></profile-card>',
    '  <profile-card title.custom-mode="titleText"></profile-card>',
    '  <profile-card title.unknown-mode="titleText"></profile-card>',
    '  <profile-card strict-quantity.from-view="42"></profile-card>',
    '  <section display-hint="message.bind: statusMessage & twoWay"></section>',
    '</template>',
  ].join('\n'));
}

function customModeResourcesScript(original: string): string {
  return original
    .replace(
      "import { customElement } from 'aurelia';",
      "import { bindingBehavior, bindingCommand, customElement } from 'aurelia';",
    )
    .replace('@customElement({', [
      "@bindingBehavior('customMode')",
      'class CustomModeBindingBehavior {}',
      '',
      "@bindingCommand('custom-mode')",
      'class CustomModeBindingCommand {}',
      '',
      '@customElement({',
    ].join('\n'))
    .replace('dependencies: [', 'dependencies: [CustomModeBindingBehavior, CustomModeBindingCommand, ');
}

function expectUsage(
  row: SemanticTemplateCursorBindableRow,
  expected: Partial<SemanticTemplateCursorBindableRow>,
  templateText: string,
  targetText: string,
  authoritySourceText: string,
): void {
  expect(row).toMatchObject({
    usageModeOpenReason: null,
    ...expected,
  });
  expect(sourceTextAt(templateText, row.usageModeTargetSource)).toBe(targetText);
  expect(sourceTextAt(templateText, row.usageModeSource)).toBe(authoritySourceText);
  if (row.usageModeCommand != null) {
    expect(sourceTextAt(templateText, row.usageModeCommandSource)).toBe(authoritySourceText);
  } else {
    expect(row.usageModeCommandSource).toBeNull();
  }
}

function expectDefinitionOwnsBindable(info: SemanticTemplateCursorInfoResult): void {
  expect(info.selectedDefinition).toMatchObject({ resourceKind: 'custom-attribute' });
  expect(info.selectedBindable?.ownerDefinitionProductHandle).not.toBeNull();
  expect(info.selectedBindable?.ownerDefinitionProductHandle)
    .toBe(info.selectedDefinition?.handles?.definitionProductHandle);
}

function cursorAtMarker(
  sourceText: string,
  marker: string,
  token: string,
  filePath = 'src/bindable-lab-app.html',
) {
  const markerStart = sourceText.indexOf(marker);
  if (markerStart < 0) {
    throw new Error(`Expected marker ${marker}.`);
  }
  const tokenStart = sourceText.indexOf(token, markerStart);
  if (tokenStart < markerStart || tokenStart + token.length > markerStart + marker.length) {
    throw new Error(`Expected ${token} inside ${marker}.`);
  }
  const offset = tokenStart + Math.min(1, token.length - 1);
  const lines = sourceText.slice(0, offset).split(/\r?\n/u);
  return {
    filePath,
    line: lines.length - 1,
    character: lines.at(-1)?.length ?? 0,
    offset,
  };
}

function sourceTextAt(
  sourceText: string,
  source: SemanticSourceReference | null,
): string | null {
  return source?.start == null || source.end == null
    ? null
    : sourceText.slice(source.start, source.end);
}

function sourceTextFor(
  source: SemanticSourceReference | null,
  sourceByPath: ReadonlyMap<string, string>,
): string {
  if (source?.path == null || source.start == null || source.end == null) {
    return '';
  }
  const normalizedSourcePath = source.path.replace(/\\/gu, '/').toLowerCase();
  const sourceText = [...sourceByPath].find(([fileName]) => {
    const normalizedFileName = path.resolve(fileName).replace(/\\/gu, '/').toLowerCase();
    return path.isAbsolute(source.path)
      ? normalizedFileName === path.resolve(source.path).replace(/\\/gu, '/').toLowerCase()
      : normalizedFileName.endsWith(`/${normalizedSourcePath}`);
  })?.[1] ?? '';
  return sourceText.slice(source.start, source.end);
}
