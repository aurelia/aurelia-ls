import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  createSemanticRuntime,
  NodeSemanticRuntimeProjectInputHost,
  SemanticAppQueryKind,
  SemanticRuntimeProjectInputAuthority,
  type SemanticTemplateCursorInfoResult,
} from '../src/index.js';
import { ExpressionParser } from '../src/expression/expression-parser.js';
import { ExpressionParseResultInspector } from '../src/expression/parse-result-inspection.js';
import { ExpressionParseResultKind } from '../src/expression/parse-result-algebra.js';
import type { SemanticSourceReference } from '../src/api/source-reference.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('hover parent binding-context carriers', () => {
  test('derives each parent prefix from parser-owned qualifier order and collapsed lookup depth', () => {
    const sourceText = 'items.map(entry => $parent.$parent.title)';
    const result = new ExpressionParser().parse(sourceText);
    expect(result.kind).toBe(ExpressionParseResultKind.ExpressionSuccess);
    if (result.kind !== ExpressionParseResultKind.ExpressionSuccess) {
      throw new Error(`Expected expression success, got ${result.kind}.`);
    }

    const firstStart = sourceText.indexOf('$parent');
    const secondStart = sourceText.indexOf('$parent', firstStart + 1);
    const first = ExpressionParseResultInspector.bindingContextAccessAtOffset(result, firstStart + 1);
    const second = ExpressionParseResultInspector.bindingContextAccessAtOffset(result, secondStart + 1);

    expect(first).toMatchObject({
      authoredScopeAncestor: 1,
      scopeLookupAncestor: 2,
      qualifierSpan: { start: firstStart, end: firstStart + '$parent'.length },
      expression: { $kind: 'AccessThis', ancestor: 2 },
    });
    expect(second).toMatchObject({
      authoredScopeAncestor: 2,
      scopeLookupAncestor: 3,
      qualifierSpan: { start: secondStart, end: secondStart + '$parent'.length },
      expression: { $kind: 'AccessThis', ancestor: 3 },
    });
    expect(first?.ownerExpression).toBe(second?.ownerExpression);
    expect(first?.ownerExpression).toMatchObject({
      $kind: 'AccessScope',
      ancestor: 3,
      name: { name: 'title' },
    });

    const specialMemberText = '$parent.$this';
    const specialMemberResult = new ExpressionParser().parse(specialMemberText);
    expect(specialMemberResult.kind).toBe(ExpressionParseResultKind.ExpressionSuccess);
    if (specialMemberResult.kind !== ExpressionParseResultKind.ExpressionSuccess) {
      throw new Error(`Expected expression success, got ${specialMemberResult.kind}.`);
    }
    const specialMemberStart = specialMemberText.indexOf('$this');
    expect(ExpressionParseResultInspector.bindingContextAccessAtOffset(
      specialMemberResult,
      specialMemberStart + 1,
    )).toBeNull();
    expect(ExpressionParseResultInspector.scopeAccessAtOffset(
      specialMemberResult,
      specialMemberStart + 1,
    )).toMatchObject({
      $kind: 'AccessScope',
      ancestor: 1,
      name: { name: '$this' },
    });
  });

  test('selects exact parent tokens without stealing the later named member', async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-completion-member-metadata');
    const templatePath = path.join(fixtureRoot, 'src/app.html');
    const scriptPath = path.join(fixtureRoot, 'src/app.ts');
    const originalScriptText = readFileSync(scriptPath, 'utf8');
    const scriptText = originalScriptText.replace(
      '@customElement({',
      [
        'interface HoverChild {',
        '  description: string;',
        '}',
        '',
        'interface HoverParentItem {',
        '  description: string;',
        '  children: HoverChild[];',
        '}',
        '',
        '@customElement({',
      ].join('\n'),
    ).replace(
      'export class App {',
      [
        'export class App {',
        "  public items: HoverParentItem[] = [{ description: 'outer', children: [{ description: 'inner' }] }];",
      ].join('\n'),
    );
    const templateText = [
      '<template>',
      '  <p class="current">${$this}</p>',
      '  <p class="root">${$parent}</p>',
      '  <let root-copy.bind="title"></let>',
      '  <p class="after-let">${$parent}</p>',
      '  <div if.bind="title"><p class="if-parent">${$parent}</p></div>',
      '  <div with.bind="items[0]"><p class="with-parent">${$parent}</p></div>',
      '  <div repeat.for="item of items">',
      '    <p class="bare">${$parent}</p>',
      '    <p class="member">${$parent.title}</p>',
      '    <p class="call">${$parent.attached()}</p>',
      '    <p class="special-member">${$parent.$this}</p>',
      '    <div repeat.for="child of item.children">',
      '      <p class="chain">${$parent.$parent}</p>',
      '      <p class="override">${$parent.$index}</p>',
      '      <p class="chain-member">${$parent.$parent.title}</p>',
      '    </div>',
      '  </div>',
      '</template>',
    ].join('\n');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'hover-parent-binding-context-carriers',
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
    const info = (
      marker: string,
      needle: string,
      occurrence = 0,
    ): SemanticTemplateCursorInfoResult => app.ask({
        kind: SemanticAppQueryKind.TemplateCursorInfo,
        detail: 'handles',
        cursor: cursorAtMarker(templateText, marker, needle, occurrence),
      }).value as SemanticTemplateCursorInfoResult;

    const current = info('<p class="current">${$this}</p>', '$this');
    expect(current.selectedExpression).toMatchObject({
      expressionKind: 'AccessThis',
      authoredScopeAncestor: 0,
      scopeLookupAncestor: 0,
      typeDisplay: 'App',
      openKind: null,
    });
    expectExactToken(templateText, current.activeSource, '$this');

    const root = info('<p class="root">${$parent}</p>', '$parent');
    expect(root.selectedExpression).toMatchObject({
      expressionKind: 'AccessThis',
      authoredScopeAncestor: 1,
      scopeLookupAncestor: 1,
      typeDisplay: null,
      openKind: 'missing-ancestor',
    });
    expect(root.uncertainty).toEqual({
      category: 'type-information-incomplete',
      affectedDomain: 'binding-context',
      affectedLocus: 'selected-expression',
    });
    expectExactToken(templateText, root.activeSource, '$parent');
    expect(root.selectedExpression?.source).toEqual(root.activeSource);

    for (const sameScope of [
      info('<p class="after-let">${$parent}</p>', '$parent'),
      info('<p class="if-parent">${$parent}</p>', '$parent'),
    ]) {
      expect(sameScope.selectedExpression).toMatchObject({
        authoredScopeAncestor: 1,
        scopeLookupAncestor: 1,
        typeDisplay: null,
        openKind: 'missing-ancestor',
      });
      expectExactToken(templateText, sameScope.activeSource, '$parent');
    }

    const withParent = info('<p class="with-parent">${$parent}</p>', '$parent');
    expect(withParent.selectedExpression).toMatchObject({
      authoredScopeAncestor: 1,
      scopeLookupAncestor: 1,
      typeDisplay: 'App',
      openKind: null,
    });
    expect(withParent.uncertainty).toBeNull();
    expectExactToken(templateText, withParent.activeSource, '$parent');

    const bare = info('<p class="bare">${$parent}</p>', '$parent');
    expect(bare.selectedExpression).toMatchObject({
      expressionKind: 'AccessThis',
      authoredScopeAncestor: 1,
      scopeLookupAncestor: 1,
      typeDisplay: 'App',
      openKind: null,
    });
    expect(bare.uncertainty).toBeNull();
    expectExactToken(templateText, bare.activeSource, '$parent');

    const memberQualifier = info('${$parent.title}', '$parent');
    expect(memberQualifier.selectedExpression).toMatchObject({
      authoredScopeAncestor: 1,
      scopeLookupAncestor: 1,
      typeDisplay: 'App',
    });
    expect(memberQualifier.selectedMemberName).toBeNull();
    expect(memberQualifier.selectedMember).toBeNull();
    expect(memberQualifier.memberOwnerType).toBeNull();
    expectExactToken(templateText, memberQualifier.activeSource, '$parent');

    const memberName = info('${$parent.title}', 'title');
    expect(memberName.selectedExpression).toBeNull();
    expect(memberName.selectedMember).toMatchObject({
      name: 'title',
      typeDisplay: 'string',
    });
    expectExactToken(templateText, memberName.activeSource, 'title');

    const callQualifier = info('${$parent.attached()}', '$parent');
    expect(callQualifier.selectedExpression).toMatchObject({
      authoredScopeAncestor: 1,
      scopeLookupAncestor: 1,
      typeDisplay: 'App',
    });
    expect(callQualifier.selectedMember).toBeNull();
    expectExactToken(templateText, callQualifier.activeSource, '$parent');

    const specialMember = info('${$parent.$this}', '$this');
    expect(specialMember.selectedExpression).toBeNull();
    expect(specialMember.selectedMemberName).toBe('$this');
    expectExactToken(templateText, specialMember.activeSource, '$this');

    const chainFirst = info('${$parent.$parent}', '$parent', 0);
    const chainSecond = info('${$parent.$parent}', '$parent', 1);
    expect(chainFirst.selectedExpression).toMatchObject({
      authoredScopeAncestor: 1,
      scopeLookupAncestor: 1,
      typeDisplay: '{ item: HoverParentItem; }',
      openKind: 'missing-context-type',
    });
    expect(chainSecond.selectedExpression).toMatchObject({
      authoredScopeAncestor: 2,
      scopeLookupAncestor: 2,
      typeDisplay: 'App',
      openKind: null,
    });
    expectExactToken(templateText, chainFirst.activeSource, '$parent');
    expectExactToken(templateText, chainSecond.activeSource, '$parent');
    expect(chainFirst.activeSource?.start).not.toBe(chainSecond.activeSource?.start);

    const overrideQualifier = info('${$parent.$index}', '$parent');
    const overrideMember = info('${$parent.$index}', '$index');
    expect(overrideQualifier.selectedExpression).toMatchObject({
      authoredScopeAncestor: 1,
      scopeLookupAncestor: 1,
      typeDisplay: '{ item: HoverParentItem; }',
    });
    expect(overrideQualifier.selectedMember).toBeNull();
    expect(overrideMember.selectedExpression).toBeNull();
    expect(overrideMember.selectedMember).toMatchObject({
      name: '$index',
      typeDisplay: 'number',
      scopeRole: 'repeat-contextual',
    });

    const chainMemberFirst = info('${$parent.$parent.title}', '$parent', 0);
    const chainMemberSecond = info('${$parent.$parent.title}', '$parent', 1);
    for (const [cursor, authoredScopeAncestor, typeDisplay] of [
      [chainMemberFirst, 1, '{ item: HoverParentItem; }'],
      [chainMemberSecond, 2, 'App'],
    ] as const) {
      expect(cursor.selectedExpression).toMatchObject({ authoredScopeAncestor, typeDisplay });
      expect(cursor.selectedMember).toBeNull();
      expect(cursor.selectedMemberName).toBeNull();
      expectExactToken(templateText, cursor.activeSource, '$parent');
    }
  }, 120_000);
});

function cursorAtMarker(
  sourceText: string,
  marker: string,
  needle: string,
  occurrence: number,
  filePath = 'src/app.html',
) {
  const markerStart = sourceText.indexOf(marker);
  if (markerStart < 0) {
    throw new Error(`Expected marker ${marker}.`);
  }
  let needleStart = markerStart - 1;
  for (let index = 0; index <= occurrence; index++) {
    needleStart = sourceText.indexOf(needle, needleStart + 1);
  }
  if (needleStart < markerStart || needleStart + needle.length > markerStart + marker.length) {
    throw new Error(`Expected occurrence ${occurrence} of ${needle} inside ${marker}.`);
  }
  const offset = needleStart + Math.min(1, needle.length - 1);
  const lines = sourceText.slice(0, offset).split(/\r?\n/u);
  return {
    filePath,
    line: lines.length - 1,
    character: lines.at(-1)?.length ?? 0,
    offset,
  };
}

function expectExactToken(
  sourceText: string,
  source: SemanticSourceReference | null,
  expected: string,
): void {
  expect(source).toMatchObject({
    path: 'src/app.html',
    role: 'active-template-token',
  });
  expect(source?.start).not.toBeNull();
  expect(source?.end).not.toBeNull();
  expect(sourceText.slice(source?.start ?? 0, source?.end ?? 0)).toBe(expected);
  expect((source?.end ?? 0) - (source?.start ?? 0)).toBe(expected.length);
}

function samePath(left: string, right: string): boolean {
  return path.resolve(left).replace(/\\/gu, '/').toLowerCase()
    === path.resolve(right).replace(/\\/gu, '/').toLowerCase();
}
