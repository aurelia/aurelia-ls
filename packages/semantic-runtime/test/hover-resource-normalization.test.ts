import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  createSemanticRuntime,
  NodeSemanticRuntimeProjectInputHost,
  SemanticAppQueryKind,
  SemanticRuntimeProjectInputAuthority,
  type SemanticFrameworkCapabilityDemandsResult,
  type SemanticTemplateCursorInfoResult,
  type SemanticTemplateReferencesResult,
} from '../src/index.js';
import { semanticTemplateCursorSourcesMatchExactly } from '../src/api/template-completion.js';
import type { SemanticSourceReference } from '../src/api/source-reference.js';
import { TemplateSourceOffsetMap } from '../src/resources/custom-element-definition.js';
import { exactTemplateSourceTextForSourceSpan } from '../src/resources/template-source-text.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('hover resource normalization', () => {
  test('separates authored HTML casing from browser-normalized resource identity', async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-completion-member-metadata');
    const templatePath = path.join(fixtureRoot, 'src/app.html');
    const scriptPath = path.join(fixtureRoot, 'src/app.ts');
    const originalScriptText = readFileSync(scriptPath, 'utf8');
    const scriptText = originalScriptText
      .replace(
        "import { customElement } from 'aurelia';",
        "import { bindable, bindingBehavior, customAttribute, customElement, valueConverter } from 'aurelia';",
      )
      .replace('@customElement({', [
        "@customElement({ name: 'product-card', aliases: ['PRODUCT-CARD', 'catalog-card'], template: '<template></template>' })",
        'class ProductCard { @bindable item = null; }',
        "@customAttribute({ name: 'focus-ring', aliases: ['FOCUS-RING', 'focus'] })",
        'class FocusRing {}',
        "@customAttribute({ name: 'viewBox' })",
        'class SvgViewBox {}',
        "@customAttribute({ name: 'definitionURL' })",
        'class MathDefinitionUrl {}',
        "@valueConverter({ name: 'formatName', aliases: ['formatname', 'FormatName'] })",
        'class FormatNameValueConverter { toView(value: unknown) { return value; } }',
        "@bindingBehavior({ name: 'trackEdit', aliases: ['trackedit', 'TrackEdit'] })",
        'class TrackEditBindingBehavior { bind() {} unbind() {} }',
        '',
        '@customElement({',
      ].join('\n'))
      .replace(
        '  template,',
        '  template,\n  dependencies: [ProductCard, FocusRing, SvgViewBox, MathDefinitionUrl, FormatNameValueConverter, TrackEditBindingBehavior],',
      );
    const templateText = [
      '<template>',
      '  <PRODUCT-CARD ITEM.BIND="title"></PrOdUcT-CaRd>',
      '  <CATALOG-CARD></catalog-card>',
      '  <div FOCUS></div>',
      '  <div focus-ring="value.BIND: title; value.bind: title"></div>',
      '  <div REPEAT.FOR="entry of [title]">${entry}</div>',
      '  <input VALUE.BIND="title">',
      '  <input VALUE>',
      '  <div AS-ELEMENT="PRODUCT-CARD"></div>',
      '  <div AS-ELEMENT="CATALOG-CARD"></div>',
      '  <let TO-BINDING-CONTEXT alias.bind="title"></let><span>${alias}</span><span>${toBindingContext}</span>',
      '  <section PROMISE.RESOLVE="Promise.resolve(title)"><span THEN="value">${value}</span><span CATCH="error">${error}</span></section>',
      '  <svg VIEWBOX="0 0 1 1" VIEWBOX.BIND="title"><g FOCUS></g><PRODUCT-CARD></PRODUCT-CARD></svg>',
      '  <math DEFINITIONURL="urn:test" DEFINITIONURL.BIND="title"></math>',
      '  <p>${title | formatName}</p>',
      '  <p>${title | formatname}</p>',
      '  <p>${title | FormatName}</p>',
      '  <p>${title | FORMATNAME}</p>',
      '  <p>${title & trackEdit}</p>',
      '  <p>${title & trackedit}</p>',
      '  <p>${title & TrackEdit}</p>',
      '  <p>${title & TRACKEDIT}</p>',
      '</template>',
    ].join('\n');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'hover-browser-normalized-resource-identity',
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
    const cursorInfo = (marker: string, needle: string): SemanticTemplateCursorInfoResult => app.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      detail: 'handles',
      cursor: cursorAtMarker(templateText, marker, needle, 'src/app.html'),
    }).value as SemanticTemplateCursorInfoResult;
    const referenceRows = (marker: string, needle: string) => (app.ask({
      kind: SemanticAppQueryKind.TemplateReferences,
      cursor: cursorAtMarker(templateText, marker, needle, 'src/app.html'),
      includeDeclaration: false,
      page: { size: 100 },
    }).value as SemanticTemplateReferencesResult).rows.filter((row) =>
      row.source?.path?.replace(/\\/gu, '/').endsWith('/src/app.html')
      || row.source?.path === 'src/app.html'
    );

    const opening = cursorInfo('<PRODUCT-CARD ITEM.BIND', 'PRODUCT-CARD');
    expect(opening.html.namespace).toBe('html');
    expect(opening.selectedDefinition).toMatchObject({
      resourceKind: 'custom-element',
      matchedName: 'product-card',
      authoredMatchedName: 'PRODUCT-CARD',
      runtimeMatchedName: 'product-card',
    });
    expect(opening.selectedDefinition?.matchedNameSource).toEqual(opening.selectedDefinition?.nameSource);
    const closing = cursorInfo('</PrOdUcT-CaRd>', 'PrOdUcT-CaRd');
    expect(closing.selectedDefinition).toMatchObject({
      matchedName: 'product-card',
      authoredMatchedName: 'PrOdUcT-CaRd',
      runtimeMatchedName: 'product-card',
    });
    expect(sourceTextAt(templateText, closing.activeSource)).toBe('PrOdUcT-CaRd');
    const alias = cursorInfo('<CATALOG-CARD>', 'CATALOG-CARD');
    expect(alias.selectedDefinition).toMatchObject({
      matchedName: 'catalog-card',
      authoredMatchedName: 'CATALOG-CARD',
      runtimeMatchedName: 'catalog-card',
    });
    const customAttribute = cursorInfo('<div FOCUS>', 'FOCUS');
    expect(customAttribute.selectedDefinition).toMatchObject({
      resourceKind: 'custom-attribute',
      matchedName: 'focus',
      authoredMatchedName: 'FOCUS',
      runtimeMatchedName: 'focus',
    });
    const canonicalCustomAttribute = cursorInfo('focus-ring="value.BIND', 'focus-ring');
    expect(canonicalCustomAttribute.selectedDefinition).toMatchObject({
      resourceKind: 'custom-attribute',
      matchedName: 'focus-ring',
    });
    expect(canonicalCustomAttribute.selectedDefinition?.matchedNameSource)
      .toEqual(canonicalCustomAttribute.selectedDefinition?.nameSource);
    expect(cursorInfo('value.BIND: title', 'BIND').selectedDefinition?.resourceKind)
      .not.toBe('binding-command');
    expect(cursorInfo('value.bind: title', 'bind').selectedDefinition).toMatchObject({
      resourceKind: 'binding-command',
      authoredMatchedName: 'bind',
      runtimeMatchedName: 'bind',
    });
    const controller = cursorInfo('REPEAT.FOR="entry', 'REPEAT');
    expect(controller.selectedDefinition).toMatchObject({
      resourceKind: 'template-controller',
      matchedName: 'repeat',
      authoredMatchedName: 'REPEAT',
      runtimeMatchedName: 'repeat',
    });
    const command = cursorInfo('VALUE.BIND="title"', 'BIND');
    expect(command.selectedDefinition).toMatchObject({
      resourceKind: 'binding-command',
      matchedName: 'bind',
      authoredMatchedName: 'BIND',
      runtimeMatchedName: 'bind',
    });
    const valueCompletions = app.ask({
      kind: SemanticAppQueryKind.TemplateCompletions,
      detail: 'handles',
      cursor: cursorAtInsertion(templateText, '<input VALUE>', 'VALUE', 'src/app.html'),
    }).value;
    expect(valueCompletions.candidates.some((candidate) => candidate.edit.newText === 'repeat.for')).toBe(true);
    const bindable = cursorInfo('ITEM.BIND="title"', 'ITEM');
    expect(bindable.selectedBindable).toMatchObject({ name: 'item', attribute: 'item' });
    expect(bindable.selectedDefinition?.authoredMatchedName).toBeNull();
    const asElement = cursorInfo('AS-ELEMENT="PRODUCT-CARD"', 'PRODUCT-CARD');
    expect(asElement.selectedDefinition).toMatchObject({
      resourceKind: 'custom-element',
      authoredMatchedName: 'PRODUCT-CARD',
      runtimeMatchedName: 'product-card',
    });
    const asElementAlias = cursorInfo('AS-ELEMENT="CATALOG-CARD"', 'CATALOG-CARD');
    expect(asElementAlias.selectedDefinition).toMatchObject({
      resourceKind: 'custom-element',
      matchedName: 'catalog-card',
      authoredMatchedName: 'CATALOG-CARD',
      runtimeMatchedName: 'catalog-card',
    });
    expect(sourceTextAt(scriptText, asElementAlias.selectedDefinition?.matchedNameSource ?? null))
      .toBe('catalog-card');
    expect(cursorInfo('${alias}', 'alias').selectedMember).toMatchObject({
      name: 'alias',
      scopeRole: 'let-local',
    });
    expect(cursorInfo('${toBindingContext}', 'toBindingContext').selectedMember).toBeNull();
    expect(cursorInfo('PROMISE.RESOLVE=', 'PROMISE').selectedDefinition).toMatchObject({
      resourceKind: 'attribute-pattern',
      authoredMatchedName: 'PROMISE.RESOLVE',
      runtimeMatchedName: 'promise.resolve',
    });
    expect(cursorInfo('<span THEN=', 'THEN').selectedDefinition).toMatchObject({
      resourceKind: 'attribute-pattern',
      authoredMatchedName: 'THEN',
      runtimeMatchedName: 'then',
    });
    expect(cursorInfo('<span CATCH=', 'CATCH').selectedDefinition).toMatchObject({
      resourceKind: 'attribute-pattern',
      authoredMatchedName: 'CATCH',
      runtimeMatchedName: 'catch',
    });
    const svgAdjustedAttribute = cursorInfo('VIEWBOX="0 0 1 1"', 'VIEWBOX');
    expect(svgAdjustedAttribute.selectedDefinition).toMatchObject({
      resourceKind: 'custom-attribute',
      matchedName: 'viewBox',
      authoredMatchedName: 'VIEWBOX',
      runtimeMatchedName: 'viewBox',
    });
    const svgCompoundTarget = cursorInfo('VIEWBOX.BIND="title"', 'VIEWBOX');
    expect(svgCompoundTarget.selectedDefinition).toBeNull();
    const svgCompoundCommand = cursorInfo('VIEWBOX.BIND="title"', 'BIND');
    expect(svgCompoundCommand.selectedDefinition).toMatchObject({
      resourceKind: 'binding-command',
      authoredMatchedName: 'BIND',
      runtimeMatchedName: 'bind',
    });
    const svgAttribute = cursorInfo('<g FOCUS>', 'FOCUS');
    expect(svgAttribute.html.namespace).toBe('svg');
    expect(svgAttribute.selectedDefinition).toMatchObject({
      resourceKind: 'custom-attribute',
      authoredMatchedName: 'FOCUS',
      runtimeMatchedName: 'focus',
    });
    const svgElement = cursorInfo('<PRODUCT-CARD></PRODUCT-CARD></svg>', 'PRODUCT-CARD');
    expect(svgElement.html.namespace).toBe('svg');
    expect(svgElement.selectedDefinition).toMatchObject({
      resourceKind: 'custom-element',
      authoredMatchedName: 'PRODUCT-CARD',
      runtimeMatchedName: 'product-card',
    });
    const mathAdjustedAttribute = cursorInfo('DEFINITIONURL="urn:test"', 'DEFINITIONURL');
    expect(mathAdjustedAttribute.html.namespace).toBe('math');
    expect(mathAdjustedAttribute.selectedDefinition).toMatchObject({
      resourceKind: 'custom-attribute',
      matchedName: 'definitionURL',
      authoredMatchedName: 'DEFINITIONURL',
      runtimeMatchedName: 'definitionURL',
    });
    expect(cursorInfo('DEFINITIONURL.BIND="title"', 'DEFINITIONURL').selectedDefinition).toBeNull();
    expect(cursorInfo('${title | formatName}', 'formatName').selectedDefinition).toMatchObject({
      resourceKind: 'value-converter',
      matchedName: 'formatName',
      authoredMatchedName: 'formatName',
      runtimeMatchedName: 'formatName',
    });
    const lowercaseConverterAlias = cursorInfo('${title | formatname}', 'formatname');
    expect(lowercaseConverterAlias.selectedDefinition).toMatchObject({
      resourceKind: 'value-converter',
      matchedName: 'formatname',
      authoredMatchedName: 'formatname',
      runtimeMatchedName: 'formatname',
    });
    expect(sourceTextAt(scriptText, lowercaseConverterAlias.selectedDefinition?.matchedNameSource ?? null))
      .toBe('formatname');
    expect(cursorInfo('${title | FormatName}', 'FormatName').selectedDefinition).toMatchObject({
      resourceKind: 'value-converter',
      matchedName: 'FormatName',
      authoredMatchedName: 'FormatName',
      runtimeMatchedName: 'FormatName',
    });
    const exactConverterAlias = cursorInfo('${title | FormatName}', 'FormatName');
    expect(sourceTextAt(scriptText, exactConverterAlias.selectedDefinition?.matchedNameSource ?? null))
      .toBe('FormatName');
    expect(cursorInfo('${title | FORMATNAME}', 'FORMATNAME').selectedDefinition).toBeNull();
    expect(cursorInfo('${title & trackEdit}', 'trackEdit').selectedDefinition).toMatchObject({
      resourceKind: 'binding-behavior',
      matchedName: 'trackEdit',
      authoredMatchedName: 'trackEdit',
      runtimeMatchedName: 'trackEdit',
    });
    const lowercaseBehaviorAlias = cursorInfo('${title & trackedit}', 'trackedit');
    expect(lowercaseBehaviorAlias.selectedDefinition).toMatchObject({
      resourceKind: 'binding-behavior',
      matchedName: 'trackedit',
      authoredMatchedName: 'trackedit',
      runtimeMatchedName: 'trackedit',
    });
    expect(sourceTextAt(scriptText, lowercaseBehaviorAlias.selectedDefinition?.matchedNameSource ?? null))
      .toBe('trackedit');
    expect(cursorInfo('${title & TrackEdit}', 'TrackEdit').selectedDefinition).toMatchObject({
      resourceKind: 'binding-behavior',
      matchedName: 'TrackEdit',
      authoredMatchedName: 'TrackEdit',
      runtimeMatchedName: 'TrackEdit',
    });
    const exactBehaviorAlias = cursorInfo('${title & TrackEdit}', 'TrackEdit');
    expect(sourceTextAt(scriptText, exactBehaviorAlias.selectedDefinition?.matchedNameSource ?? null))
      .toBe('TrackEdit');
    expect(cursorInfo('${title & TRACKEDIT}', 'TRACKEDIT').selectedDefinition).toBeNull();

    for (const [marker, needle] of [
      ['<PRODUCT-CARD ITEM.BIND', 'PRODUCT-CARD'],
      ['<div FOCUS>', 'FOCUS'],
      ['REPEAT.FOR="entry', 'REPEAT'],
      ['VALUE.BIND="title"', 'BIND'],
      ['VIEWBOX="0 0 1 1"', 'VIEWBOX'],
      ['PROMISE.RESOLVE=', 'PROMISE'],
    ] as const) {
      const rows = referenceRows(marker, needle);
      expect(rows.length, `expected template reference rows for ${marker}`).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.name).toBe(sourceTextAt(templateText, row.source));
      }
    }
    expect(referenceRows('<PRODUCT-CARD ITEM.BIND', 'PRODUCT-CARD').map((row) => row.name))
      .toEqual(expect.arrayContaining(['PRODUCT-CARD', 'PrOdUcT-CaRd']));
  }, 120_000);

  test('keeps configured i18n and state pattern spelling distinct from runtime identity', async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/registered-plugin-capabilities');
    const templatePath = path.join(fixtureRoot, 'src/registered-plugin-capabilities-app.html');
    const templateText = [
      '<h1 T="dashboard.title"></h1>',
      '<p T.BIND="titleKey"></p>',
      '<div T-PARAMS.BIND="{ name: titleKey }"></div>',
      '<button CLICK.DISPATCH:MAIN="{ type: \'queue\' }">Dispatch</button>',
      '<input VALUE.STATE:MAIN="queued">',
      '<p>${titleKey | t}</p>',
      '<p>${titleKey | T}</p>',
      '<p>${titleKey & t}</p>',
      '<p>${titleKey & T}</p>',
    ].join('\n');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'hover-configured-specialized-pattern-identity',
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
    const cursorInfo = (marker: string, needle: string): SemanticTemplateCursorInfoResult => app.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      detail: 'handles',
      cursor: cursorAtMarker(templateText, marker, needle, 'src/registered-plugin-capabilities-app.html'),
    }).value as SemanticTemplateCursorInfoResult;

    expect(cursorInfo('<h1 T=', 'T').selectedDefinition).toMatchObject({
      resourceKind: 'binding-command',
      authoredMatchedName: 'T',
      runtimeMatchedName: 't',
    });
    expect(cursorInfo('T.BIND=', 'BIND').selectedDefinition).toMatchObject({
      resourceKind: 'binding-command',
      authoredMatchedName: 'BIND',
      runtimeMatchedName: 't.bind',
    });
    expect(cursorInfo('T-PARAMS.BIND=', 'BIND').selectedDefinition).toMatchObject({
      resourceKind: 'binding-command',
      authoredMatchedName: 'T-PARAMS.BIND',
      runtimeMatchedName: 't-params.bind',
    });
    expect(cursorInfo('CLICK.DISPATCH:MAIN=', 'DISPATCH').selectedDefinition).toMatchObject({
      authoredMatchedName: 'DISPATCH',
      runtimeMatchedName: 'dispatch',
    });
    expect(cursorInfo('VALUE.STATE:MAIN=', 'STATE').selectedDefinition).toMatchObject({
      authoredMatchedName: 'STATE',
      runtimeMatchedName: 'state',
    });
    expect(cursorInfo('| t}', 't').selectedDefinition).toMatchObject({
      resourceKind: 'value-converter',
      authoredMatchedName: 't',
      runtimeMatchedName: 't',
    });
    expect(cursorInfo('| T}', 'T').selectedDefinition).toBeNull();
    expect(cursorInfo('& t}', 't').selectedDefinition).toMatchObject({
      resourceKind: 'binding-behavior',
      authoredMatchedName: 't',
      runtimeMatchedName: 't',
    });
    expect(cursorInfo('& T}', 'T').selectedDefinition).toBeNull();

    const demands = (app.ask({
      kind: SemanticAppQueryKind.FrameworkCapabilityDemands,
      page: { size: 100 },
    }).value as SemanticFrameworkCapabilityDemandsResult).rows;
    const lowerConverterSource = cursorInfo('| t}', 't').activeSource;
    const upperConverterSource = cursorInfo('| T}', 'T').activeSource;
    const lowerBehaviorSource = cursorInfo('& t}', 't').activeSource;
    const upperBehaviorSource = cursorInfo('& T}', 'T').activeSource;
    expect(demands.some((row) => semanticTemplateCursorSourcesMatchExactly(row.source, lowerConverterSource)))
      .toBe(true);
    expect(demands.some((row) => semanticTemplateCursorSourcesMatchExactly(row.source, upperConverterSource)))
      .toBe(false);
    expect(demands.some((row) => semanticTemplateCursorSourcesMatchExactly(row.source, lowerBehaviorSource)))
      .toBe(true);
    expect(demands.some((row) => semanticTemplateCursorSourcesMatchExactly(row.source, upperBehaviorSource)))
      .toBe(false);
  }, 120_000);

  test('publishes an exact authored literal for a selected custom attribute pattern', async () => {
    const fixtureRoot = path.join(
      packageRoot,
      'fixtures/pressure/resource-registration-effective-definitions',
    );
    const templatePath = path.join(fixtureRoot, 'src/effective-definitions-app.html');
    const templateText = readFileSync(templatePath, 'utf8').replace(
      'title.data="message"',
      'TITLE.DATA="message"',
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'hover-custom-attribute-pattern-authored-literal',
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
    const info = app.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      detail: 'handles',
      cursor: cursorAtMarker(
        templateText,
        'TITLE.DATA="message"',
        'DATA',
        'src/effective-definitions-app.html',
      ),
    }).value as SemanticTemplateCursorInfoResult;

    expect(info.selectedDefinition).toMatchObject({
      resourceKind: 'attribute-pattern',
      matchedName: null,
      authoredMatchedName: 'DATA',
      runtimeMatchedName: 'PART.data',
    });
    expect(sourceTextAt(templateText, info.activeSource)).toBe('DATA');
  }, 120_000);

  test('infers missing plugin syntax capabilities from browser-normalized authored names', async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/unregistered-plugin-syntax');
    const templatePath = path.join(fixtureRoot, 'src/unregistered-plugin-syntax-app.html');
    const templateText = readFileSync(templatePath, 'utf8')
      .replace('<h1 t=', '<h1 T=')
      .replace('<p t.bind=', '<p T.BIND=')
      .replace('click.dispatch:main=', 'CLICK.DISPATCH:MAIN=');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'hover-browser-normalized-missing-plugin-syntax',
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
    const demands = (app.ask({
      kind: SemanticAppQueryKind.FrameworkCapabilityDemands,
      page: { size: 100 },
    }).value as SemanticFrameworkCapabilityDemandsResult).rows.filter((row) =>
      row.source?.path?.replace(/\\/gu, '/').endsWith('/src/unregistered-plugin-syntax-app.html')
      || row.source?.path === 'src/unregistered-plugin-syntax-app.html'
    );

    expect(demands.filter((row) => row.requiredCapability === 'i18n.translation-syntax')
      .map((row) => row.authoredName)).toEqual(expect.arrayContaining(['T', 'T.BIND']));
    expect(demands.filter((row) => row.requiredCapability === 'state.binding-syntax')
      .map((row) => row.authoredName)).toContain('CLICK.DISPATCH:MAIN');
  }, 120_000);

  test('admits exact mapped slices after shifts and rejects non-bijective token boundaries', () => {
    expect(exactTemplateSourceTextForSourceSpan(
      'xCARDy',
      null,
      100,
      101,
      105,
    )).toBe('CARD');
    expect(exactTemplateSourceTextForSourceSpan(
      'xCARD',
      new TemplateSourceOffsetMap(5, [20, 23, 24, 25, 26, 27]),
      20,
      23,
      27,
    ), 'token after a line-continuation shift').toBe('CARD');
    for (const [lineEnding, offsets, sourceEnd] of [
      ['LF', [10, 13, 14], 14],
      ['CRLF', [20, 24, 25], 25],
    ] as const) {
      expect(exactTemplateSourceTextForSourceSpan(
        'AB',
        new TemplateSourceOffsetMap(2, offsets),
        offsets[0],
        offsets[0],
        sourceEnd,
      ), `${lineEnding} continuation inside a token`).toBeNull();
    }
    expect(exactTemplateSourceTextForSourceSpan(
      '😀',
      new TemplateSourceOffsetMap(2, [30, 30, 39]),
      30,
      30,
      39,
    ), 'duplicate astral decoded boundaries').toBeNull();
  });

  test('recovers inline resource names after an escaped token while failing closed on that token', async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/route-config-execution-order');
    const scriptPath = path.join(fixtureRoot, 'src/main.ts');
    const originalScriptText = readFileSync(scriptPath, 'utf8');
    const scriptText = originalScriptText.replace(
      "template: '<template><configured-route></configured-route></template>',",
      "template: '<template><configured-route></configured-route><configured\\x2droute></configured\\x2droute><configured-route title=\"after\"></configured-route></template>',",
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'hover-mapped-inline-authored-resource-name',
      projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost({
        readFile(fileName) {
          return samePath(fileName, scriptPath) ? scriptText : undefined;
        },
        fileExists(fileName) {
          return samePath(fileName, scriptPath) ? true : undefined;
        },
      })),
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const cursorInfo = (marker: string, needle: string): SemanticTemplateCursorInfoResult => app.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      detail: 'handles',
      cursor: cursorAtMarker(scriptText, marker, needle, scriptPath),
    }).value as SemanticTemplateCursorInfoResult;

    expect(cursorInfo('<configured-route>', 'configured-route').selectedDefinition).toMatchObject({
      resourceKind: 'custom-element',
      authoredMatchedName: 'configured-route',
      runtimeMatchedName: 'configured-route',
    });
    const escapedOpening = cursorInfo('<configured\\x2droute>', 'route');
    expect(escapedOpening.selectedDefinition).toMatchObject({
      resourceKind: 'custom-element',
      authoredMatchedName: null,
      runtimeMatchedName: 'configured-route',
    });
    expect(sourceTextAt(scriptText, escapedOpening.activeSource)).toBe('configured\\x2droute');
    expect(cursorInfo('</configured\\x2droute>', 'route').selectedDefinition).toMatchObject({
      resourceKind: 'custom-element',
      authoredMatchedName: null,
      runtimeMatchedName: 'configured-route',
    });
    expect(cursorInfo('<configured-route title="after">', 'configured-route').selectedDefinition).toMatchObject({
      resourceKind: 'custom-element',
      authoredMatchedName: 'configured-route',
      runtimeMatchedName: 'configured-route',
    });

    const references = (app.ask({
      kind: SemanticAppQueryKind.TemplateReferences,
      cursor: cursorAtMarker(scriptText, 'class ConfiguredRoute', 'ConfiguredRoute', scriptPath),
      includeDeclaration: false,
      page: { size: 100 },
    }).value as SemanticTemplateReferencesResult).rows.filter((row) =>
      row.referenceKind === 'resource-usage'
      && (
        row.source?.path?.replace(/\\/gu, '/').endsWith('/src/main.ts')
        || row.source?.path === 'src/main.ts'
      )
    );
    expect(references.length).toBeGreaterThanOrEqual(4);
    expect(references.every((row) => row.name === sourceTextAt(scriptText, row.source))).toBe(true);
    expect(references.some((row) => row.name.includes('\\x2d'))).toBe(false);
  }, 120_000);
});

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

function cursorAtInsertion(
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
  const cursorOffset = needleOffset + needle.length;
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
