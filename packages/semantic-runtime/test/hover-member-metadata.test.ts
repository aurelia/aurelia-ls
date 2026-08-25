import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, test } from 'vitest';
import {
  createSemanticRuntime,
  isAureliaExpressionIdentifierName,
  NodeSemanticRuntimeProjectInputHost,
  SemanticAppQueryKind,
  SemanticRuntimeProjectInputAuthority,
  SemanticRuntimeProjectInputChange,
  SemanticRuntimeProjectInputChangeKind,
  type SemanticTemplateCursorInfoResult,
} from '../src/index.js';
import {
  checkerDeclarationsVisibilityKind,
  checkerJSDocCommentPlaintext,
  checkerSymbolMemberDocumentation,
  CHECKER_MEMBER_DOCUMENTATION_MAX_CODE_POINTS,
  CHECKER_MEMBER_DOCUMENTATION_MAX_LINES,
} from '../src/type-system/checker-member-surface.js';
import { CheckerTypeMemberVisibilityKind } from '../src/type-system/type-shape.js';
import type { SemanticSourceReference } from '../src/api/source-reference.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('hover member metadata carriers', () => {
  test('folds declaration visibility conservatively and withholds prose without exact JSDoc provenance', () => {
    expect(isAureliaExpressionIdentifierName('#hashPrivate')).toBe(false);
    expect(isAureliaExpressionIdentifierName('privateValue')).toBe(true);
    const publicDeclaration = propertyWithVisibility(ts.SyntaxKind.PublicKeyword);
    const protectedDeclaration = propertyWithVisibility(ts.SyntaxKind.ProtectedKeyword);
    const privateDeclaration = propertyWithVisibility(ts.SyntaxKind.PrivateKeyword);

    expect(checkerDeclarationsVisibilityKind([publicDeclaration, protectedDeclaration]))
      .toBe(CheckerTypeMemberVisibilityKind.Protected);
    expect(checkerDeclarationsVisibilityKind([protectedDeclaration, publicDeclaration]))
      .toBe(CheckerTypeMemberVisibilityKind.Protected);
    expect(checkerDeclarationsVisibilityKind([publicDeclaration, privateDeclaration]))
      .toBe(CheckerTypeMemberVisibilityKind.Private);
    expect(checkerDeclarationsVisibilityKind([privateDeclaration, publicDeclaration]))
      .toBe(CheckerTypeMemberVisibilityKind.Private);

    const sourceLessSymbol = {
      getDocumentationComment: () => [{ kind: 'text', text: 'Unproven documentation.' }],
    } as unknown as ts.Symbol;
    expect(checkerSymbolMemberDocumentation(
      {} as ts.TypeChecker,
      sourceLessSymbol,
      [ts.factory.createPropertyDeclaration(undefined, 'ghost', undefined, undefined, undefined)],
    )).toBeNull();
    expect(checkerSymbolMemberDocumentation(
      {} as ts.TypeChecker,
      sourceLessSymbol,
      [publicDeclaration, protectedDeclaration],
    )).toBeNull();
    expect(checkerJSDocCommentPlaintext(
      'Use {@link Replacement human label}; keep {@link Replacement}; omit {@link command:evil}; choose {@link https://example.test Safe label}.',
    )).toBe('Use human label; keep Replacement; omit; choose Safe label.');
  });

  test('projects only bounded, plaintext, exact selected-member metadata and refreshes after an unsaved edit', async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-completion-member-metadata');
    const templatePath = path.join(fixtureRoot, 'src/app.html');
    const scriptPath = path.join(fixtureRoot, 'src/app.ts');
    const templateText = memberMetadataTemplate();
    let scriptText = memberMetadataScript('Plain property documentation.');
    const overlay = new MutableSourceOverlay();
    overlay.write(templatePath, templateText);
    overlay.write(scriptPath, scriptText);
    const authority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'hover-member-metadata-carriers',
      projectInputAuthority: authority,
    });
    const firstApp = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const firstChecker = firstApp.emission.typeSystem.checker;
    const info = (
      app: typeof firstApp,
      marker: string,
      needle: string,
    ): SemanticTemplateCursorInfoResult => app.ask({
        kind: SemanticAppQueryKind.TemplateCursorInfo,
        detail: 'handles',
        cursor: cursorAtMarker(templateText, marker, needle),
      }).value as SemanticTemplateCursorInfoResult;

    const plain = info(firstApp, '${plain}', 'plain');
    expect(plain.selectedMember).toMatchObject({
      name: 'plain',
      memberKind: 'property',
      visibilityKind: 'public',
      isDeprecated: false,
      documentation: {
        format: 'plaintext',
        text: 'Plain property documentation.',
        isTruncated: false,
        sourceCount: 1,
      },
      deprecationReason: null,
    });
    expectExactDocumentationSources(scriptText, plain.selectedMember?.documentation?.sources ?? [], [
      '/** Plain property documentation. */',
    ]);

    const multiline = info(firstApp, '${multiline}', 'multiline');
    expect(multiline.selectedMember?.documentation).toMatchObject({
      format: 'plaintext',
      text: 'First paragraph.\n\nSecond paragraph on two\nlines.',
      isTruncated: false,
      sourceCount: 1,
    });

    const method = info(firstApp, '${documentedMethod()}', 'documentedMethod');
    expect(method.selectedMember).toMatchObject({
      memberKind: 'method',
      visibilityKind: 'public',
      documentation: { text: 'Documented method.', isTruncated: false },
    });

    const internal = info(firstApp, '${internalValue}', 'internalValue');
    expect(internal.selectedMember).toMatchObject({
      visibilityKind: 'public',
      isDeprecated: false,
      documentation: { text: 'Internal annotation does not hide this runtime property.' },
    });
    expect(internal.selectedMember?.documentation?.text).not.toContain('@internal');

    expect(info(firstApp, '${publicValue}', 'publicValue').selectedMember).toMatchObject({
      visibilityKind: 'public',
    });
    expect(info(firstApp, '${protectedValue}', 'protectedValue').selectedMember).toMatchObject({
      visibilityKind: 'protected',
    });
    expect(info(firstApp, '${privateValue}', 'privateValue').selectedMember).toMatchObject({
      visibilityKind: 'private',
    });

    const noDocs = info(firstApp, '${noDocs}', 'noDocs');
    expect(noDocs.selectedMember).toMatchObject({
      visibilityKind: 'public',
      isDeprecated: false,
      documentation: null,
      deprecationReason: null,
    });

    const deprecated = info(firstApp, '${oldValue}', 'oldValue');
    expect(deprecated.selectedMember).toMatchObject({
      isDeprecated: true,
      documentation: null,
      deprecationReason: {
        format: 'plaintext',
        text: 'Use currentValue.',
        isTruncated: false,
        sourceCount: 1,
      },
    });
    expectExactDocumentationSources(scriptText, deprecated.selectedMember?.deprecationReason?.sources ?? [], [
      '@deprecated Use currentValue.',
    ]);
    expect(info(firstApp, '${deprecatedWithoutReason}', 'deprecatedWithoutReason').selectedMember).toMatchObject({
      isDeprecated: true,
      deprecationReason: null,
    });
    expect(info(firstApp, '${duplicateDifferentDeprecated}', 'duplicateDifferentDeprecated').selectedMember).toMatchObject({
      isDeprecated: true,
      deprecationReason: null,
    });
    const duplicateSame = info(firstApp, '${duplicateSameDeprecated}', 'duplicateSameDeprecated').selectedMember;
    expect(duplicateSame).toMatchObject({
      isDeprecated: true,
      deprecationReason: { text: 'Use duplicateReplacement.', sourceCount: 2 },
    });
    expect(duplicateSame?.deprecationReason?.sources).toHaveLength(2);

    const linkedDeprecation = info(firstApp, '${linkedDeprecated}', 'linkedDeprecated');
    expect(linkedDeprecation.selectedMember).toMatchObject({
      isDeprecated: true,
      deprecationReason: {
        text: 'Use Replacement; omit; labeled Safe command label; other JS replacement; drop; choose App.',
      },
    });
    expect(linkedDeprecation.selectedMember?.deprecationReason?.text)
      .not.toMatch(/[a-z][a-z0-9+.-]*:|\{@link/iu);

    const sameDeprecated = info(firstApp, '${sameDeprecated(1)}', 'sameDeprecated');
    expect(sameDeprecated.selectedMember).toMatchObject({
      memberKind: 'method',
      isDeprecated: true,
      documentation: null,
      deprecationReason: {
        text: 'Use replacementMethod.',
        sourceCount: 3,
      },
    });
    expect(sameDeprecated.selectedMember?.deprecationReason?.sources).toHaveLength(3);
    expect(info(firstApp, '${differentDeprecated(1)}', 'differentDeprecated').selectedMember).toMatchObject({
      isDeprecated: true,
      documentation: null,
      deprecationReason: null,
    });
    expect(info(firstApp, '${mixedDeprecated(1)}', 'mixedDeprecated').selectedMember).toMatchObject({
      isDeprecated: false,
      documentation: null,
      deprecationReason: null,
    });

    const overload = info(firstApp, '${overloaded(1)}', 'overloaded');
    expect(overload.selectedMember).toMatchObject({
      memberKind: 'method',
      isDeprecated: false,
      documentation: null,
    });
    const accessor = info(firstApp, '${groupedAccessor}', 'groupedAccessor');
    expect(accessor.selectedMember).toMatchObject({
      memberKind: 'accessor',
      documentation: null,
    });
    expect(info(firstApp, '${singleAccessor}', 'singleAccessor').selectedMember).toMatchObject({
      memberKind: 'accessor',
      documentation: { text: 'Single accessor documentation.' },
    });

    const hostile = info(firstApp, '${hostile}', 'hostile').selectedMember?.documentation;
    expect(hostile).toMatchObject({ format: 'plaintext', isTruncated: false, sourceCount: 1 });
    expect(hostile?.text).toContain('**bold** [run](command:workbench.action.openSettings) <script>alert(1)</script>.');
    expect(hostile?.text).toContain('Labeled Human label.');
    expect(hostile?.text).toContain('Internal App.');
    expect(hostile?.text).toContain('Command label Safe command label; bare.');
    expect(hostile?.text).toContain('Other schemes FTP label; omitted; JS label; Custom label.');
    expect(hostile?.text).not.toMatch(/(?:ftp|vscode|data|javascript|custom\+tool):|https?:\/\/|\{@link|@example|\u0000|\u202e/iu);

    const bounded = info(firstApp, '${bounded}', 'bounded').selectedMember?.documentation;
    expect(bounded).toMatchObject({ format: 'plaintext', isTruncated: true, sourceCount: 1 });
    expect([...(bounded?.text ?? '')].length).toBeLessThanOrEqual(CHECKER_MEMBER_DOCUMENTATION_MAX_CODE_POINTS);
    expect(bounded?.text.split('\n').length).toBeLessThanOrEqual(CHECKER_MEMBER_DOCUMENTATION_MAX_LINES);

    const local = info(firstApp, '${localPlain}', 'localPlain');
    expect(local.selectedMember).toMatchObject({
      scopeRole: 'let-local',
      visibilityKind: null,
      isDeprecated: null,
      documentation: null,
      deprecationReason: null,
    });

    scriptText = memberMetadataScript('Unsaved replacement documentation.');
    overlay.write(scriptPath, scriptText);
    authority.advance([new SemanticRuntimeProjectInputChange(
      SemanticRuntimeProjectInputChangeKind.FileValue,
      scriptPath,
    )]);
    const secondApp = await runtime.openApp({
      projectKey: firstApp.project.projectKey,
      analysisDepth: 'binding-observation',
    });
    expect(firstApp.isCurrent()).toBe(false);
    expect(secondApp.emission.typeSystem.checker).not.toBe(firstChecker);
    const refreshed = info(secondApp, '${plain}', 'plain');
    expect(refreshed.selectedMember?.documentation).toMatchObject({
      text: 'Unsaved replacement documentation.',
      isTruncated: false,
      sourceCount: 1,
    });
    expect(refreshed.selectedMember?.documentation?.text).not.toBe(
      plain.selectedMember?.documentation?.text,
    );
    expectExactDocumentationSources(scriptText, refreshed.selectedMember?.documentation?.sources ?? [], [
      '/** Unsaved replacement documentation. */',
    ]);
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

function propertyWithVisibility(
  visibility: ts.SyntaxKind.PublicKeyword | ts.SyntaxKind.ProtectedKeyword | ts.SyntaxKind.PrivateKeyword,
): ts.PropertyDeclaration {
  return ts.factory.createPropertyDeclaration(
    [ts.factory.createModifier(visibility)],
    'value',
    undefined,
    undefined,
    undefined,
  );
}

function memberMetadataTemplate(): string {
  return [
    '<template>',
    '  <let local-plain.bind="plain"></let>',
    '  <p>${plain}</p>',
    '  <p>${multiline}</p>',
    '  <p>${documentedMethod()}</p>',
    '  <p>${internalValue}</p>',
    '  <p>${publicValue}</p>',
    '  <p>${protectedValue}</p>',
    '  <p>${privateValue}</p>',
    '  <p>${noDocs}</p>',
    '  <p>${oldValue}</p>',
    '  <p>${deprecatedWithoutReason}</p>',
    '  <p>${duplicateDifferentDeprecated}</p>',
    '  <p>${duplicateSameDeprecated}</p>',
    '  <p>${linkedDeprecated}</p>',
    '  <p>${sameDeprecated(1)}</p>',
    '  <p>${differentDeprecated(1)}</p>',
    '  <p>${mixedDeprecated(1)}</p>',
    '  <p>${overloaded(1)}</p>',
    '  <p>${groupedAccessor}</p>',
    '  <p>${singleAccessor}</p>',
    '  <p>${hostile}</p>',
    '  <p>${bounded}</p>',
    '  <p>${localPlain}</p>',
    '</template>',
  ].join('\n');
}

function memberMetadataScript(plainDocumentation: string): string {
  const boundedLines = Array.from({ length: 12 }, (_, index) =>
    `Bounded line ${index + 1}: ${'documentation '.repeat(18).trim()}.`
  );
  return [
    "import { customElement } from 'aurelia';",
    "import template from './app.html';",
    '',
    "@customElement({ name: 'app', template })",
    'export class App {',
    `  /** ${plainDocumentation} */`,
    "  public plain = 'plain';",
    '',
    '  /**',
    '   * First paragraph.',
    '   *',
    '   * Second paragraph on two',
    '   * lines.',
    '   */',
    "  multiline = 'multiline';",
    '',
    '  /** Documented method. */',
    "  documentedMethod(): string { return 'method'; }",
    '',
    '  /**',
    '   * Internal annotation does not hide this runtime property.',
    '   * @internal',
    '   */',
    "  internalValue = 'internal';",
    '',
    "  public publicValue = 'public';",
    "  protected protectedValue = 'protected';",
    "  private privateValue = 'private';",
    "  #hashPrivate = 'hash-private';",
    "  noDocs = 'none';",
    "  currentValue = 'current';",
    '',
    '  /** @deprecated Use currentValue. */',
    "  oldValue = 'old';",
    '  /** @deprecated */',
    "  deprecatedWithoutReason = 'old-no-reason';",
    '  /**',
    '   * @deprecated Use firstDuplicateReplacement.',
    '   * @deprecated Use secondDuplicateReplacement.',
    '   */',
    "  duplicateDifferentDeprecated = 'duplicate-different';",
    '  /**',
    '   * @deprecated Use duplicateReplacement.',
    '   * @deprecated Use duplicateReplacement.',
    '   */',
    "  duplicateSameDeprecated = 'duplicate-same';",
    '  /** @deprecated Use {@link https://example.test Replacement}; omit {@link command:evil}; labeled {@link command:evil Safe command label}; other {@link javascript:evil JS replacement}; drop {@link data:text/plain,evil}; choose {@link App}. */',
    "  linkedDeprecated = 'linked';",
    '',
    '  /** @deprecated Use replacementMethod. */',
    '  sameDeprecated(value: string): string;',
    '  /** @deprecated Use   replacementMethod. */',
    '  sameDeprecated(value: number): number;',
    '  /**',
    '   * @deprecated Use',
    '   * replacementMethod.',
    '   */',
    '  sameDeprecated(value: string | number): string | number { return value; }',
    '',
    '  /** @deprecated Use firstReplacement. */',
    '  differentDeprecated(value: string): string;',
    '  /** @deprecated Use secondReplacement. */',
    '  differentDeprecated(value: number): number;',
    '  /** @deprecated Use firstReplacement. */',
    '  differentDeprecated(value: string | number): string | number { return value; }',
    '',
    '  /** @deprecated Use current overload. */',
    '  mixedDeprecated(value: string): string;',
    '  mixedDeprecated(value: number): number;',
    '  mixedDeprecated(value: string | number): string | number { return value; }',
    '',
    '  /** First overload documentation. */',
    '  overloaded(value: string): string;',
    '  /** Second overload documentation. */',
    '  overloaded(value: number): number;',
    '  overloaded(value: string | number): string | number { return value; }',
    '',
    '  /** Getter documentation must not represent the accessor group alone. */',
    "  get groupedAccessor(): string { return this.plain; }",
    '  /** Setter documentation must not represent the accessor group alone. */',
    '  set groupedAccessor(value: string) { this.plain = value; }',
    '  /** Single accessor documentation. */',
    "  get singleAccessor(): string { return this.plain; }",
    '',
    '  /**',
    '   * Literal **bold** [run](command:workbench.action.openSettings) <script>alert(1)</script>.',
    '   * Labeled {@link https://example.test Human label}.',
    '   * Unlabeled {@link https://danger.test}.',
    '   * Command label {@link command:evil Safe command label}; bare {@link command:evil}.',
    '   * Other schemes {@link ftp://example.test FTP label}; omitted {@link vscode:evil}; {@link javascript:evil JS label}; {@link custom+tool:run Custom label}.',
    '   * Internal {@link App}.',
    '   * Control \u0000 and bidi \u202e are removed.',
    '   * @example doNotExposeThisTag()',
    '   */',
    "  hostile = 'hostile';",
    '',
    '  /**',
    ...boundedLines.map((line) => `   * ${line}`),
    '   */',
    "  bounded = 'bounded';",
    '}',
  ].join('\n');
}

function cursorAtMarker(
  sourceText: string,
  marker: string,
  needle: string,
  filePath = 'src/app.html',
) {
  const markerStart = sourceText.indexOf(marker);
  if (markerStart < 0) {
    throw new Error(`Expected marker ${marker}.`);
  }
  const tokenStart = sourceText.indexOf(needle, markerStart);
  if (tokenStart < markerStart || tokenStart + needle.length > markerStart + marker.length) {
    throw new Error(`Expected ${needle} inside ${marker}.`);
  }
  const offset = tokenStart + Math.min(1, needle.length - 1);
  const lines = sourceText.slice(0, offset).split(/\r?\n/u);
  return {
    filePath,
    line: lines.length - 1,
    character: lines.at(-1)?.length ?? 0,
    offset,
  };
}

function expectExactDocumentationSources(
  sourceText: string,
  sources: readonly SemanticSourceReference[],
  expectedFragments: readonly string[],
): void {
  expect(sources).toHaveLength(expectedFragments.length);
  for (const [index, source] of sources.entries()) {
    expect(source.start).not.toBeNull();
    expect(source.end).not.toBeNull();
    expect(samePath(source.path, path.join(packageRoot, 'fixtures/pressure/template-completion-member-metadata/src/app.ts')))
      .toBe(true);
    expect(sourceText.slice(source.start ?? 0, source.end ?? 0)).toContain(expectedFragments[index]);
  }
}

function samePath(left: string, right: string): boolean {
  return path.resolve(left).replace(/\\/gu, '/').toLowerCase()
    === path.resolve(right).replace(/\\/gu, '/').toLowerCase();
}
