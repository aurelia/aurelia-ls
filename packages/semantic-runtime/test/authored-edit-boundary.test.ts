import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  SemanticAppQueryKind,
  semanticTemplateDocumentOwnershipOwnsSource,
  SemanticTemplateRenameStatus,
  SemanticTemplateRenameUnavailableReason,
  type SemanticApplicationTopologyResult,
  type SemanticResourceDefinitionsResult,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeAppQueryRequest,
  type SemanticTemplateCodeActionsResult,
  type SemanticTemplateCompletionResult,
  type SemanticTemplateDiagnosticsResult,
  type SemanticTemplateDocumentOwnershipResult,
  type SemanticTemplateReferencesResult,
  type SemanticTemplateRenameResult,
} from '../src/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('authored edit boundary', () => {
  let workspaceRoot: string;
  let excludedRoot: string;
  let projectKey: string;
  let runtime: Awaited<ReturnType<typeof createSemanticRuntime>>;
  let appTemplatePath: string;
  let appTemplateText: string;
  let appSourcePath: string;
  let unrelatedHtmlPath: string;
  let rootDocumentPath: string;
  let externalWidgetTemplatePath: string;
  let externalWidgetTemplateText: string;
  let externalHostTemplatePath: string;
  let externalHostTemplateText: string;
  let ownedWidgetPath: string;
  let externalWidgetPath: string;
  let externalHostPath: string;
  let bootstrapPath: string;

  beforeAll(async () => {
    workspaceRoot = await mkdtemp(path.join(packageRoot, '.authored-edit-boundary-'));
    excludedRoot = path.join(workspaceRoot, 'excluded');
    appTemplatePath = path.join(workspaceRoot, 'src/app.html');
    appSourcePath = path.join(workspaceRoot, 'src/app.ts');
    unrelatedHtmlPath = path.join(workspaceRoot, 'src/unrelated.html');
    rootDocumentPath = path.join(workspaceRoot, 'index.html');
    externalWidgetTemplatePath = path.join(workspaceRoot, 'src/external-widget.html');
    externalHostTemplatePath = path.join(excludedRoot, 'external-host.html');
    ownedWidgetPath = path.join(workspaceRoot, 'src/owned-widget.ts');
    externalWidgetPath = path.join(excludedRoot, '.aurelia-artifacts/external-widget.ts');
    externalHostPath = path.join(excludedRoot, 'external-host.ts');
    bootstrapPath = path.join(excludedRoot, 'bootstrap.ts');

    appTemplateText = [
      '<input :value="value">',
      '<owned-widget></owned-widget>',
      '<external-widget></external-widget>',
      '<external-host></external-host>',
    ].join('\n');
    externalWidgetTemplateText = '<p>${missingMember}</p>';
    externalHostTemplateText = [
      '<owned-widget></owned-widget>',
      '<p>${externalLa}</p>',
    ].join('\n');

    await writeWorkspaceFiles(workspaceRoot, {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
        },
        include: ['src/**/*.ts', 'excluded/**/*.ts'],
      }),
      'src/aurelia-assets.d.ts': "declare module '*.html' { const markup: string; export default markup; }\n",
      'index.html': '<body><boundary-app></boundary-app></body>\n',
      'src/entry.ts': "import '../excluded/bootstrap.js';\n",
      'src/app.ts': [
        "import { customElement } from '@aurelia/runtime-html';",
        "import template from './app.html';",
        "import { OwnedWidget } from './owned-widget.js';",
        "import { ExternalWidget } from '../excluded/.aurelia-artifacts/external-widget.js';",
        "import { ExternalHost } from '../excluded/external-host.js';",
        '',
        '@customElement({',
        "  name: 'boundary-app',",
        '  template,',
        '  dependencies: [OwnedWidget, ExternalWidget, ExternalHost],',
        '})',
        'export class BoundaryApp {',
        "  value = 'draft';",
        '}',
      ].join('\n'),
      'src/app.html': appTemplateText,
      'src/unrelated.html': '<main>${notAnAureliaTemplate}</main>\n',
      'src/owned-widget.ts': [
        "import { customElement } from '@aurelia/runtime-html';",
        '',
        "@customElement({ name: 'owned-widget', template: '<span>owned</span>' })",
        'export class OwnedWidget {}',
      ].join('\n'),
      'src/external-widget.html': externalWidgetTemplateText,
      'excluded/bootstrap.ts': [
        "import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';",
        "import { BoundaryApp } from '../src/app.js';",
        '',
        'new Aurelia()',
        '  .register(StandardConfiguration)',
        '  .app({ host: document.body, component: BoundaryApp })',
        '  .start();',
      ].join('\n'),
      'excluded/.aurelia-artifacts/external-widget.ts': [
        "import { customElement } from '@aurelia/runtime-html';",
        "import template from '../../src/external-widget.html';",
        '',
        "@customElement({ name: 'external-widget', template })",
        'export class ExternalWidget {',
        "  existingMember = 'readable';",
        '}',
      ].join('\n'),
      'excluded/external-host.ts': [
        "import { customElement } from '@aurelia/runtime-html';",
        "import template from './external-host.html';",
        "import { OwnedWidget } from '../src/owned-widget.js';",
        '',
        "@customElement({ name: 'external-host', template, dependencies: [OwnedWidget] })",
        'export class ExternalHost {',
        "  externalLabel = 'linked';",
        '}',
      ].join('\n'),
      'excluded/external-host.html': externalHostTemplateText,
    });

    runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: `test:authored-edit-boundary:${path.basename(workspaceRoot)}`,
      excludedWorkspaceRoots: [excludedRoot],
    });
    projectKey = runtime.workspace.projects[0]!.projectKey;
  }, 30_000);

  afterAll(async () => {
    runtime?.clearAnalysisCache();
    if (workspaceRoot != null) {
      await rm(workspaceRoot, { force: true, recursive: true });
    }
  });

  test('refuses completion edits for an excluded evaluator-linked template', async () => {
    const definitions = await resourceDefinitions();
    const externalHost = definitions.value.rows.find((row) => row.name === 'external-host');
    expect(externalHost).toBeDefined();
    expect(sourceMatches(externalHost?.source, externalHostPath)).toBe(true);
    expect(externalHost?.source?.sourceFileRole).toBe('external-source');
    expect(sourceMatches(externalHost?.template?.source, externalHostTemplatePath)).toBe(true);
    expectSourceOwned(externalHostTemplatePath, false);

    const completion = await answerQuery<SemanticTemplateCompletionResult>({
      kind: SemanticAppQueryKind.TemplateCompletions,
      projectKey,
      sourceFilePath: externalHostTemplatePath,
      cursor: cursorInside(externalHostTemplateText, externalHostTemplatePath, 'externalLa', 'externalLa'.length),
      page: { size: 20 },
      analysisDepth: 'binding-observation',
      appRetention: 'retain-app',
    });

    expect(completion.result).toBe('answered');
    expect(completion.selection).toBe('absent');
    expect(completion.coverage).toBe('complete');
    expect(completion.value.siteKind).toBe('unknown');
    expect(completion.value.candidates).toEqual([]);
    expect(completion.value.missingInputs).toEqual(['editable-template-source']);
    expect(completion.summary).toContain('not an editable authored template');
  }, 30_000);

  test('projects the exact template-edit boundary in authored source ownership', () => {
    const template = runtime.authoredSourceOwnership({ sourceFilePath: appTemplatePath }).value;
    const appSource = runtime.authoredSourceOwnership({ sourceFilePath: appSourcePath }).value;
    const rootDocument = runtime.authoredSourceOwnership({ sourceFilePath: rootDocumentPath }).value;
    const external = runtime.authoredSourceOwnership({ sourceFilePath: externalHostTemplatePath }).value;

    expect(template).toMatchObject({ templateOwned: true, owners: [expect.objectContaining({ role: 'template' })] });
    expect(appSource).toMatchObject({ templateOwned: true, owners: [expect.objectContaining({ role: 'app-source' })] });
    expect(rootDocument).toMatchObject({
      templateOwned: false,
      owners: [expect.objectContaining({ role: 'root-document' })],
    });
    expect(external).toMatchObject({ templateOwned: false, owners: [] });
  });

  test('distinguishes converged custom-element templates from unrelated admitted HTML', async () => {
    const lspOwnership = await answerQuery<SemanticTemplateDocumentOwnershipResult>({
      kind: SemanticAppQueryKind.TemplateDocumentOwnership,
      projectKey,
      analysisDepth: 'runtime-topology',
      includeAuthoringTemplates: false,
      appRetention: 'retain-app',
    });
    const authoringOwnership = await answerQuery<SemanticTemplateDocumentOwnershipResult>({
      kind: SemanticAppQueryKind.TemplateDocumentOwnership,
      projectKey,
      analysisDepth: 'runtime-topology',
      includeAuthoringTemplates: true,
      appRetention: 'retain-app',
    });

    expect(templateOwnershipOwnsDocument(lspOwnership.value, appTemplatePath)).toBe(true);
    expect(templateOwnershipOwnsDocument(lspOwnership.value, externalWidgetTemplatePath)).toBe(true);
    expect(templateOwnershipOwnsDocument(lspOwnership.value, unrelatedHtmlPath)).toBe(false);
    expect(templateOwnershipOwnsDocument(lspOwnership.value, externalHostTemplatePath)).toBe(true);

    const topology = await answerQuery<SemanticApplicationTopologyResult>({
      kind: SemanticAppQueryKind.AppTopology,
      projectKey,
      analysisDepth: 'runtime-topology',
      includeAuthoringTemplates: true,
      appRetention: 'retain-app',
    });
    const ownershipPaths = lspOwnership.value.sources
      .flatMap((source) => source.path == null ? [] : [normalizedPath(path.resolve(workspaceRoot, source.path))])
      .sort();
    const authoringOwnershipPaths = authoringOwnership.value.sources
      .flatMap((source) => source.path == null ? [] : [normalizedPath(path.resolve(workspaceRoot, source.path))])
      .sort();
    const topologyPaths = topology.value.files
      .filter((file) => file.roles.includes('component-template'))
      .map((file) => normalizedPath(path.resolve(workspaceRoot, file.path)))
      .sort();
    expect(ownershipPaths).toEqual(authoringOwnershipPaths);
    expect(ownershipPaths).toEqual(topologyPaths);

    const diagnostics = await answerQuery<SemanticTemplateDiagnosticsResult>({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      projectKey,
      sourceFilePath: unrelatedHtmlPath,
      sourceFile: { filePath: unrelatedHtmlPath },
      analysisDepth: 'binding-observation',
      diagnosticProjection: 'type-projection',
      appRetention: 'retain-app',
    });
    expect(diagnostics.value.rows).toEqual([]);
  }, 30_000);

  test('refuses resource rename atomically when its declaration or an affected template is excluded', async () => {
    const declarationReferences = await resourceReferences(
      '<external-widget>',
      'external-widget',
    );
    const excludedDeclaration = declarationReferences.value.rows.find((row) =>
      row.referenceKind === 'declaration' && sourceMatches(row.source, externalWidgetPath)
    );
    expect(excludedDeclaration).toBeDefined();
    expect(excludedDeclaration?.source?.sourceFileRole).toBe('generated');
    expectSourceOwned(externalWidgetPath, false);

    await expectRenameRefused('<external-widget>', 'external-widget');

    const affectedTemplateReferences = await resourceReferences(
      '<owned-widget>',
      'owned-widget',
    );
    expect(affectedTemplateReferences.value.rows.some((row) =>
      row.referenceKind === 'resource-usage' && sourceMatches(row.source, externalHostTemplatePath)
    )).toBe(true);
    expect(affectedTemplateReferences.value.rows.some((row) =>
      row.referenceKind === 'declaration' && sourceMatches(row.source, ownedWidgetPath)
    )).toBe(true);
    expectSourceOwned(ownedWidgetPath, true);

    await expectRenameRefused('<owned-widget>', 'owned-widget');
  }, 30_000);

  test('omits declare-member actions when the target view-model source is excluded', async () => {
    const definitions = await resourceDefinitions();
    const externalWidget = definitions.value.rows.find((row) => row.name === 'external-widget');
    expect(externalWidget).toBeDefined();
    expect(sourceMatches(externalWidget?.targetDeclarationSource, externalWidgetPath)).toBe(true);
    expect(externalWidget?.targetDeclarationSource?.sourceFileRole).toBe('generated');
    expect(sourceMatches(externalWidget?.template?.source, externalWidgetTemplatePath)).toBe(true);
    expectSourceOwned(externalWidgetTemplatePath, true);
    expectSourceOwned(externalWidgetPath, false);

    const diagnostics = await answerQuery<SemanticTemplateDiagnosticsResult>({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      projectKey,
      sourceFilePath: externalWidgetTemplatePath,
      sourceFile: { filePath: externalWidgetTemplatePath },
      analysisDepth: 'binding-observation',
      diagnosticProjection: 'type-projection',
      appRetention: 'retain-app',
    });
    const diagnostic = diagnostics.value.rows.find((row) =>
      row.diagnosticKind === 'missing-expression-member'
      && row.selectedMemberName === 'missingMember'
    );
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.missingInput).toBe('expression-member:selected-member-missing');
    expect(diagnostic?.suggestion?.actionKind).toBe('declare-member');
    expect(sourceMatches(diagnostic?.source, externalWidgetTemplatePath)).toBe(true);

    const actions = await answerQuery<SemanticTemplateCodeActionsResult>({
      kind: SemanticAppQueryKind.TemplateCodeActions,
      projectKey,
      sourceFilePath: externalWidgetTemplatePath,
      cursor: cursorInside(externalWidgetTemplateText, externalWidgetTemplatePath, 'missingMember', 1),
      analysisDepth: 'binding-observation',
      diagnosticProjection: 'type-projection',
      appRetention: 'retain-app',
    });
    expect(actions.value.rows).toEqual([]);
  }, 30_000);

  test('omits framework-registration actions when the bootstrap source is excluded', async () => {
    const topology = await answerQuery<SemanticApplicationTopologyResult>({
      kind: SemanticAppQueryKind.AppTopology,
      projectKey,
      analysisDepth: 'binding-observation',
      appRetention: 'retain-app',
    });
    const externalAppRoot = topology.value.appRoots.find((root) => sourceMatches(root.source, bootstrapPath));
    expect(externalAppRoot).toBeDefined();
    expect(externalAppRoot?.source?.sourceFileRole).toBe('external-source');
    expectSourceOwned(appTemplatePath, true);
    expectSourceOwned(bootstrapPath, false);

    const shorthandOffset = appTemplateText.indexOf(':value');
    const diagnostics = await answerQuery<SemanticTemplateDiagnosticsResult>({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      projectKey,
      sourceFilePath: appTemplatePath,
      sourceFile: { filePath: appTemplatePath },
      analysisDepth: 'binding-observation',
      diagnosticProjection: 'type-projection',
      appRetention: 'retain-app',
    });
    const diagnostic = diagnostics.value.rows.find((row) =>
      row.diagnosticKind === 'framework-capability-not-registered'
      && row.missingInput === 'runtime-html.short-hand-binding-syntax'
    );
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.suggestion?.actionKind).toBe('register-framework-capability');
    expect(sourceMatches(diagnostic?.source, appTemplatePath)).toBe(true);

    const actions = await answerQuery<SemanticTemplateCodeActionsResult>({
      kind: SemanticAppQueryKind.TemplateCodeActions,
      projectKey,
      sourceFilePath: appTemplatePath,
      cursor: cursorAt(appTemplateText, appTemplatePath, shorthandOffset + 1),
      analysisDepth: 'binding-observation',
      diagnosticProjection: 'type-projection',
      appRetention: 'retain-app',
    });
    expect(actions.value.rows).toEqual([]);
  }, 30_000);

  async function resourceDefinitions(): Promise<SemanticRuntimeAnswer<SemanticResourceDefinitionsResult>> {
    return answerQuery<SemanticResourceDefinitionsResult>({
      kind: SemanticAppQueryKind.ResourceDefinitions,
      projectKey,
      page: { size: 100 },
      analysisDepth: 'binding-observation',
      appRetention: 'retain-app',
    });
  }

  async function resourceReferences(
    marker: string,
    name: string,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateReferencesResult>> {
    return answerQuery<SemanticTemplateReferencesResult>({
      kind: SemanticAppQueryKind.TemplateReferences,
      projectKey,
      sourceFilePath: appTemplatePath,
      cursor: cursorInside(appTemplateText, appTemplatePath, marker, 1, name),
      includeDeclaration: true,
      page: { size: 100 },
      analysisDepth: 'binding-observation',
      appRetention: 'retain-app',
    });
  }

  async function expectRenameRefused(marker: string, name: string): Promise<void> {
    for (const newName of [null, `${name}-renamed`]) {
      const rename = await answerQuery<SemanticTemplateRenameResult>({
        kind: SemanticAppQueryKind.TemplateRename,
        projectKey,
        sourceFilePath: appTemplatePath,
        cursor: cursorInside(appTemplateText, appTemplatePath, marker, 1, name),
        ...(newName == null ? {} : { newName }),
        analysisDepth: 'binding-observation',
        diagnosticProjection: 'type-projection',
        appRetention: 'retain-app',
      });
      expect(rename.value.status).toBe(SemanticTemplateRenameStatus.NotAvailable);
      expect(rename.value.reason).toBe(SemanticTemplateRenameUnavailableReason.SourceNotEditable);
      expect(rename.value.edits).toEqual([]);
    }
  }

  function answerQuery<TValue>(
    request: SemanticRuntimeAppQueryRequest,
  ): Promise<SemanticRuntimeAnswer<TValue>> {
    return runtime.answerAppQuery(request) as Promise<SemanticRuntimeAnswer<TValue>>;
  }

  function expectSourceOwned(filePath: string, owned: boolean): void {
    const ownership = runtime.authoredSourceOwnership({ sourceFilePath: filePath });
    expect(ownership.value.owners.length > 0).toBe(owned);
  }

  function sourceMatches(
    source: { readonly path?: string | null } | null | undefined,
    expectedPath: string,
  ): boolean {
    if (source?.path == null) return false;
    const sourcePath = path.isAbsolute(source.path)
      ? source.path
      : path.join(workspaceRoot, source.path);
    return normalizedPath(sourcePath) === normalizedPath(expectedPath);
  }

  function templateOwnershipOwnsDocument(
    ownership: SemanticTemplateDocumentOwnershipResult,
    expectedPath: string,
  ): boolean {
    return semanticTemplateDocumentOwnershipOwnsSource(
      ownership,
      (source) => sourceMatches(source, expectedPath),
    );
  }
});

function cursorInside(
  text: string,
  filePath: string,
  marker: string,
  delta: number,
  needle: string = marker,
) {
  const markerOffset = text.indexOf(marker);
  if (markerOffset < 0) throw new Error(`Missing marker '${marker}'.`);
  const needleOffset = text.indexOf(needle, markerOffset);
  if (needleOffset < 0) throw new Error(`Missing needle '${needle}' after '${marker}'.`);
  return cursorAt(text, filePath, needleOffset + delta);
}

function cursorAt(text: string, filePath: string, offset: number) {
  const before = text.slice(0, offset);
  const lines = before.split(/\r?\n/u);
  return {
    filePath,
    line: lines.length - 1,
    character: lines.at(-1)!.length,
    offset,
  };
}

function normalizedPath(fileName: string): string {
  return path.resolve(fileName).replace(/\\/g, '/').toLowerCase();
}

async function writeWorkspaceFiles(rootDir: string, files: Readonly<Record<string, string>>): Promise<void> {
  await Promise.all(Object.entries(files).map(async ([relativePath, text]) => {
    const fileName = path.join(rootDir, relativePath);
    await mkdir(path.dirname(fileName), { recursive: true });
    await writeFile(fileName, text, 'utf8');
  }));
}
