import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  NodeSemanticRuntimeProjectInputHost,
  SemanticAppQueryKind,
  SemanticRuntimeProjectInputAuthority,
  type SemanticTemplateCompletionResult,
} from '../src/index.js';
import {
  isAureliaExpressionIdentifier,
  isAureliaExpressionIdentifierName,
} from '../src/expression/expression-scanner.js';
import { ExpressionParser } from '../src/expression/expression-parser.js';
import { ExpressionParseResultInspector } from '../src/expression/parse-result-inspection.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('Aurelia expression identifier admission', () => {
  test.each([
    ['field', true, true],
    ['$index', true, true],
    ['é', true, true],
    ['default', true, true],
    ['new', false, true],
    ['in', false, true],
    ['of', false, true],
    ['this', false, true],
    ['typeof', false, true],
    ['void', false, true],
    ['true', false, true],
    ['false', false, true],
    ['null', false, true],
    ['undefined', false, true],
    ['import', false, true],
    ['#private', false, false],
    ['__@iterator@14', false, false],
    ['11', false, false],
    ['quoted-key', false, false],
    [' field', false, false],
    ['field ', false, false],
    ['/*comment*/field', false, false],
    ['field/*comment*/', false, false],
    ['', false, false],
  ])('classifies %s across bare and post-dot grammar', (name, bare, member) => {
    expect(isAureliaExpressionIdentifier(name)).toBe(bare);
    expect(isAureliaExpressionIdentifierName(name)).toBe(member);
  });
});

describe('template completion edit ranges', () => {
  test('inserts at an empty member frontier and replaces only a completed partial member', async () => {
    const fixtureRoot = path.resolve(packageRoot, '../../fixtures/hello-world');
    const templatePath = path.join(fixtureRoot, 'src/components/product-card.html');
    const originalTemplate = readFileSync(templatePath, 'utf8');
    const templateText = originalTemplate.replace(
      '  <p if.bind="item">${item.description}</p>',
      [
        '  <p if.bind="item">${item.description} ${item.}</p>',
        '  <p if.bind="item">${item.de}</p>',
        '  <p if.bind="item">${item.</p>',
        '  <p if.bind="item">${item.de</p>',
        '  <span>${lab</span>',
      ].join('\n'),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'template-completion-edit-range',
      projectInputAuthority: new SemanticRuntimeProjectInputAuthority(
        new NodeSemanticRuntimeProjectInputHost({
          readFile(fileName) {
            return samePath(fileName, templatePath) ? templateText : undefined;
          },
          fileExists(fileName) {
            return samePath(fileName, templatePath) ? true : undefined;
          },
        }),
      ),
    });

    const completionAt = async (marker: string, cursorSuffix: string) => {
      const markerStart = templateText.indexOf(marker);
      if (markerStart < 0) throw new Error(`Expected marker ${marker}.`);
      const offset = markerStart + marker.lastIndexOf(cursorSuffix) + cursorSuffix.length;
      const lines = templateText.slice(0, offset).split(/\r?\n/u);
      const answer = await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TemplateCompletions,
        sourceFilePath: templatePath,
        cursor: {
          filePath: templatePath,
          line: lines.length - 1,
          character: lines.at(-1)?.length ?? 0,
          offset,
        },
        inquiryProfile: 'lsp-cursor',
        analysisDepth: 'binding-observation',
        includeAuthoringTemplates: true,
        appRetention: 'retain-app',
      });
      return { answer, value: answer.value as SemanticTemplateCompletionResult, offset };
    };

    const empty = await completionAt(
      '${item.description} ${item.}</p>',
      '${item.',
    );
    expect(empty.answer).toMatchObject({
      result: 'answered',
      selection: 'exact',
      coverage: 'complete',
    });
    expect(empty.value.siteKind).toBe('expression-member');
    expect(empty.value.missingInputs).toEqual([]);
    expect(empty.value.candidates.map((candidate) => candidate.name)).toEqual([
      'description',
      'name',
      'quantity',
      'sku',
      'tags',
      'tone',
    ]);
    for (const candidate of empty.value.candidates) {
      expect(candidate.edit.source).toMatchObject({
        path: 'src/components/product-card.html',
        start: empty.offset,
        end: empty.offset,
        role: 'completion-insertion',
      });
    }

    const partial = await completionAt('${item.de}</p>', '${item.de');
    expect(partial.answer).toMatchObject({
      result: 'answered',
      selection: 'exact',
      coverage: 'complete',
    });
    expect(partial.value.siteKind).toBe('expression-member');
    expect(partial.value.candidates.map((candidate) => candidate.name)).toEqual([
      'description',
      'name',
      'quantity',
      'sku',
      'tags',
      'tone',
    ]);
    for (const candidate of partial.value.candidates) {
      expect(candidate.edit.source).toMatchObject({
        path: 'src/components/product-card.html',
        start: partial.offset - 'de'.length,
        end: partial.offset,
        role: 'completion-replacement',
      });
      const source = candidate.edit.source;
      expect(source.start == null || source.end == null
        ? null
        : templateText.slice(source.start, source.end)).toBe('de');
    }

    const unterminatedEmpty = await completionAt('${item.</p>', '${item.');
    expect(unterminatedEmpty.value.siteKind).toBe('expression-member');
    expect(unterminatedEmpty.value.candidates.map((candidate) => candidate.name))
      .toEqual(empty.value.candidates.map((candidate) => candidate.name));
    for (const candidate of unterminatedEmpty.value.candidates) {
      expect(candidate.edit.source).toMatchObject({
        start: unterminatedEmpty.offset,
        end: unterminatedEmpty.offset,
        role: 'completion-insertion',
      });
    }

    const unterminatedPartial = await completionAt('${item.de</p>', '${item.de');
    expect(unterminatedPartial.value.siteKind).toBe('expression-member');
    expect(unterminatedPartial.value.candidates.map((candidate) => candidate.name))
      .toEqual(empty.value.candidates.map((candidate) => candidate.name));
    for (const candidate of unterminatedPartial.value.candidates) {
      const source = candidate.edit.source;
      expect(source).toMatchObject({
        start: unterminatedPartial.offset - 'de'.length,
        end: unterminatedPartial.offset,
        role: 'completion-replacement',
      });
      expect(source.start == null || source.end == null
        ? null
        : templateText.slice(source.start, source.end)).toBe('de');
    }

    const unterminatedRoot = await completionAt('${lab</span>', '${lab');
    expect(unterminatedRoot.value.siteKind).toBe('expression');
    const labelText = unterminatedRoot.value.candidates.find(
      (candidate) => candidate.name === 'labelText',
    );
    expect(labelText?.edit.source).toMatchObject({
      start: unterminatedRoot.offset - 'lab'.length,
      end: unterminatedRoot.offset,
      role: 'completion-replacement',
    });
    const labelSource = labelText?.edit.source;
    expect(labelSource?.start == null || labelSource.end == null
      ? null
      : templateText.slice(labelSource.start, labelSource.end)).toBe('lab');
  }, 120_000);

  test('filters only non-authorable members and preserves stable typed surfaces across checker epochs', async () => {
    const first = await hostileCompletionSnapshot('template-completion-hostile-surface:first');
    const second = await hostileCompletionSnapshot('template-completion-hostile-surface:second');

    expect(second.labels).toEqual(first.labels);
    expect(first.parseFailures).toEqual([]);

    expect(first.labels.root).toEqual(expect.arrayContaining([
      'rootPrivate',
      'rootProtected',
      'zzzRootCurrent',
      'aaaRootLegacy',
    ]));
    expect(first.labels.root).not.toContain('#rootHashPrivate');
    expect(first.labels.root).not.toContain('new');
    expect(first.labels.root).not.toContain('import');
    expect(first.candidates.root.at(-1)).toMatchObject({
      name: 'aaaRootLegacy',
      memberVisibility: 'public',
      memberIsDeprecated: true,
    });

    expect(first.labels.class).toEqual([
      '__call',
      'computedVisible',
      'inheritedPrivate',
      'inheritedProtected',
      'inheritedPublic',
      'internalButVisible',
      'optionalField',
      'privateField',
      'protectedField',
      'publicAccessor',
      'publicField',
      'publicMethod',
      'readonlyField',
    ]);
    expect(first.candidates.class.find((candidate) => candidate.name === 'privateField'))
      .toMatchObject({ memberVisibility: 'private' });
    expect(first.candidates.class.find((candidate) => candidate.name === 'protectedField'))
      .toMatchObject({ memberVisibility: 'protected' });
    expect(first.candidates.class.find((candidate) => candidate.name === 'internalButVisible'))
      .toMatchObject({ memberIsDeprecated: false });
    expect(first.candidates.class.find((candidate) => candidate.name === '__call'))
      .toMatchObject({ memberIsDeprecated: false });

    expect(first.labels.interface).toEqual([
      'interfaceField',
      'interfaceMethod',
      'optionalInterfaceField',
      'readonlyInterfaceField',
    ]);
    expect(first.labels.keywords).toEqual([
      'default',
      'false',
      'import',
      'in',
      'new',
      'normal',
      'null',
      'of',
      'this',
      'true',
      'typeof',
      'undefined',
      'void',
    ]);
    expect(first.labels.union).toEqual(['common']);
    expect(first.labels.intersection).toEqual(['first', 'second']);
    expect(first.labels.optional).toEqual(['inside']);
    expect(first.labels.nullish).toEqual(['inside']);
    expect(first.labels.indexOnly).toEqual([]);
    expect(first.labels.literalKeys).toEqual(['normal']);

    for (const probe of ['string', 'array', 'tuple', 'promise'] as const) {
      expect(first.labels[probe].some((name) => name.startsWith('__@'))).toBe(false);
    }
    expect(first.labels.tuple).not.toContain('0');
    expect(first.labels.tuple).not.toContain('1');

    const stringAnchor = first.candidates.string.find((candidate) => candidate.name === 'anchor');
    const stringCharAt = first.candidates.string.find((candidate) => candidate.name === 'charAt');
    expect(stringAnchor).toMatchObject({ memberIsDeprecated: true });
    expect(stringCharAt).toMatchObject({ memberIsDeprecated: false });
    expectDeprecatedCandidatesLast(first.candidates.string);

    expect(first.candidates.legacy).toEqual([
      expect.objectContaining({ name: 'mixed', memberIsDeprecated: false }),
      expect.objectContaining({ name: 'zzzCurrent', memberIsDeprecated: false }),
      expect.objectContaining({ name: 'aaaLegacy', memberIsDeprecated: true }),
    ]);
  }, 120_000);
});

type CompletionCandidate = SemanticTemplateCompletionResult['candidates'][number];

interface HostileCompletionSnapshot {
  readonly candidates: Record<string, readonly CompletionCandidate[]>;
  readonly labels: Record<string, readonly string[]>;
  readonly parseFailures: readonly string[];
}

async function hostileCompletionSnapshot(storeKey: string): Promise<HostileCompletionSnapshot> {
  const fixtureRoot = path.resolve(packageRoot, '../../fixtures/hello-world');
  const sourcePath = path.join(fixtureRoot, 'src/components/product-card.ts');
  const templatePath = path.join(fixtureRoot, 'src/components/product-card.html');
  const sourceText = hostileCompletionSourceText();
  const probes = hostileCompletionProbes();
  const templateText = [
    '<template>',
    ...Object.values(probes).map((expression) => `  <p>\${${expression}}</p>`),
    '</template>',
  ].join('\n');
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    storeKey,
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost({
        readFile(fileName) {
          if (samePath(fileName, sourcePath)) return sourceText;
          if (samePath(fileName, templatePath)) return templateText;
          return undefined;
        },
        fileExists(fileName) {
          return samePath(fileName, sourcePath) || samePath(fileName, templatePath) ? true : undefined;
        },
      }),
    ),
  });
  const candidates: Record<string, readonly CompletionCandidate[]> = {};
  const labels: Record<string, readonly string[]> = {};
  const parseFailures: string[] = [];
  const parser = new ExpressionParser();

  for (const [probe, expression] of Object.entries(probes)) {
    const marker = `\${${expression}}`;
    const markerStart = templateText.indexOf(marker);
    if (markerStart < 0) throw new Error(`Expected hostile completion marker ${marker}.`);
    const offset = markerStart + marker.length - 1;
    const lines = templateText.slice(0, offset).split(/\r?\n/u);
    const answer = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.TemplateCompletions,
      sourceFilePath: templatePath,
      cursor: {
        filePath: templatePath,
        line: lines.length - 1,
        character: lines.at(-1)?.length ?? 0,
        offset,
      },
      inquiryProfile: 'lsp-cursor',
      analysisDepth: 'binding-observation',
      includeAuthoringTemplates: true,
      appRetention: 'retain-app',
      page: { size: 1_000 },
    });
    expect(answer).toMatchObject({ result: 'answered', selection: 'exact' });
    const rows = (answer.value as SemanticTemplateCompletionResult).candidates;
    candidates[probe] = rows;
    labels[probe] = rows.map((candidate) => candidate.name);
    expectDeprecatedCandidatesLast(rows);

    for (const candidate of rows) {
      const source = candidate.edit.source;
      if (source.start == null || source.end == null) {
        parseFailures.push(`${probe}:${candidate.name}:missing-edit-range`);
        continue;
      }
      const editedTemplate = templateText.slice(0, source.start)
        + candidate.edit.newText
        + templateText.slice(source.end);
      const editedMarkerStart = editedTemplate.lastIndexOf('${', source.start);
      const editedMarkerEnd = editedTemplate.indexOf('}', source.start + candidate.edit.newText.length);
      const editedExpression = editedMarkerStart < 0 || editedMarkerEnd < 0
        ? null
        : editedTemplate.slice(editedMarkerStart + 2, editedMarkerEnd);
      const parsed = editedExpression == null ? null : parser.parse(editedExpression);
      if (parsed == null || !ExpressionParseResultInspector.hasCanonicalAst(parsed)) {
        parseFailures.push(`${probe}:${candidate.name}:${editedExpression ?? 'missing-expression'}`);
      }
    }
  }
  return { candidates, labels, parseFailures };
}

function hostileCompletionProbes(): Readonly<Record<string, string>> {
  return {
    root: '',
    string: 'stringValue.',
    number: 'numberValue.',
    boolean: 'booleanValue.',
    array: 'arrayValue.',
    tuple: 'tupleValue.',
    promise: 'promiseValue.',
    dom: 'domValue.',
    class: 'userClass.',
    interface: 'userInterface.',
    keywords: 'keywordKeys.',
    union: 'unionValue.',
    intersection: 'intersectionValue.',
    optional: 'optionalValue.',
    nullish: 'nullishValue.',
    indexOnly: 'indexOnly.',
    literalKeys: 'literalKeys.',
    legacy: 'legacySurface.',
  };
}

function hostileCompletionSourceText(): string {
  return [
    "import { customElement } from 'aurelia';",
    "import template from './product-card.html';",
    "const computedName = 'computedVisible' as const;",
    "const uniqueKey: unique symbol = Symbol('uniqueKey');",
    'interface HostileInterface {',
    '  interfaceField: string;',
    '  readonly readonlyInterfaceField: number;',
    '  optionalInterfaceField?: boolean;',
    '  interfaceMethod(value: string): number;',
    "  'interface-literal': string;",
    '  13: string;',
    '  [key: string]: unknown;',
    '}',
    'interface LegacySurface {',
    '  /** @deprecated use zzzCurrent */',
    '  aaaLegacy: string;',
    '  zzzCurrent: string;',
    '  /** @deprecated one overload remains supported */',
    '  mixed(value: string): string;',
    '  mixed(value: number): number;',
    '}',
    'class HostileBase {',
    "  inheritedPublic = 'base';",
    "  protected inheritedProtected = 'protected-base';",
    "  private inheritedPrivate = 'private-base';",
    '}',
    'class HostileClass extends HostileBase {',
    "  __call = 'valid-authored-name';",
    "  publicField = 'public';",
    '  /** @internal still authorable at runtime */',
    "  internalButVisible = 'internal';",
    '  readonly readonlyField = 1;',
    '  optionalField?: string;',
    '  publicMethod(value: number): string { return String(value); }',
    '  get publicAccessor(): string { return this.publicField; }',
    "  protected protectedField = 'protected';",
    "  private privateField = 'private';",
    "  #hashPrivate = 'hash-private';",
    "  ['string-literal'] = 'literal';",
    "  7 = 'numeric';",
    "  [computedName] = 'computed';",
    "  [uniqueKey] = 'unique';",
    "  [Symbol.iterator](): Iterator<string> { return [][Symbol.iterator](); }",
    '}',
    "@customElement({ name: 'product-card', template })",
    'export class ProductCard {',
    "  stringValue: string = 'text';",
    '  numberValue: number = 1;',
    '  booleanValue: boolean = true;',
    '  arrayValue: string[] = [];',
    "  tupleValue: [string, number] = ['x', 1];",
    "  promiseValue: Promise<string> = Promise.resolve('x');",
    '  domValue!: HTMLElement;',
    '  userClass = new HostileClass();',
    '  userInterface!: HostileInterface;',
    "  keywordKeys!: { 'default': string; 'false': string; 'import': string; 'in': string; 'new': string; normal: string; 'null': string; 'of': string; 'this': string; 'true': string; 'typeof': string; 'undefined': string; 'void': string };",
    '  unionValue!: { common: string; left: number } | { common: string; right: boolean };',
    '  intersectionValue!: { first: string } & { second: number };',
    '  optionalValue?: { inside: string };',
    '  nullishValue: { inside: string } | null | undefined;',
    '  indexOnly!: Record<string, number>;',
    "  literalKeys!: { 'quoted-key': string; 11: number; normal: boolean };",
    '  legacySurface!: LegacySurface;',
    '  /** @deprecated use zzzRootCurrent */',
    "  aaaRootLegacy = 'legacy';",
    "  zzzRootCurrent = 'current';",
    "  ['new'] = 'root-keyword';",
    "  ['import'] = 'root-reserved';",
    "  private rootPrivate = 'private-root';",
    "  protected rootProtected = 'protected-root';",
    "  #rootHashPrivate = 'hash-root';",
    '}',
  ].join('\n');
}

function expectDeprecatedCandidatesLast(candidates: readonly CompletionCandidate[]): void {
  let encounteredDeprecated = false;
  for (const candidate of candidates) {
    if (candidate.memberIsDeprecated === true) {
      encounteredDeprecated = true;
    } else if (encounteredDeprecated) {
      throw new Error(`Nondeprecated completion '${candidate.name}' followed a deprecated candidate.`);
    }
  }
}

function samePath(left: string, right: string): boolean {
  return path.resolve(left).replace(/\\/gu, '/').toLowerCase()
    === path.resolve(right).replace(/\\/gu, '/').toLowerCase();
}
