import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';

import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import { SourceFileAdmission } from '../src/boot/frames.js';
import {
  ProjectSourceOwnershipIndex,
  type ProjectSourcePathResolution,
} from '../src/boot/source-ownership.js';
import { SourceFileRole, SourceLanguage } from '../src/kernel/address.js';
import type {
  AddressHandle,
  EvidenceHandle,
  ProvenanceHandle,
} from '../src/kernel/handles.js';
import { createSemanticRuntime } from '../src/api/runtime.js';
import { semanticAppSourceEpochKey } from '../src/api/app-query-identity.js';
import {
  SemanticAppQueryKind,
  type SemanticBindingObservedDependencyResult,
  type SemanticRuntimeAnswer,
  type SemanticResourceDefinitionsResult,
  type SemanticTemplateCompletionResult,
  type SemanticTemplateCursorInfoResult,
  type SemanticTemplateDiagnosticsResult,
  type SemanticTemplateFoldingRangesResult,
  type SemanticTemplateReferencesResult,
  type SemanticTemplateRenameResult,
  type SemanticTemplateSemanticTokensResult,
  type SemanticTypeScriptDiagnosticsResult,
} from '../src/api/contracts.js';
import { normalizeTypeSystemSourceFileName } from '../src/type-system/source-path-index.js';
import { sameTypeSystemSourcePath } from '../src/type-system/source-file-path.js';
import { ComputationLifecycleRegistry } from '../src/kernel/computation-lifecycle.js';
import { KernelStore } from '../src/kernel/store.js';
import { TypeSystemProgramSourceAuthority } from '../src/type-system/program-source-authority.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('project source identity', () => {
  test('resolves exact path domains and reports project/workspace alias collisions as ambiguous', () => {
    const workspaceRoot = path.resolve('workspace-root');
    const projectRoot = path.join(workspaceRoot, 'packages/app');
    const nested = admission('app', 'src/shared.ts', 'nested');
    const workspace = admission('app', '../../src/shared.ts', 'workspace');
    const index = new ProjectSourceOwnershipIndex(workspaceRoot, projectRoot, [nested, workspace]);

    expectResolved(index.resolvePath(path.join(projectRoot, 'src/shared.ts')), nested, ['absolute-host']);
    expectResolved(index.resolvePath('packages/app/src/shared.ts'), nested, ['workspace-relative']);
    expectResolved(index.resolvePath('../../src/shared.ts'), workspace, ['project-relative']);

    const ambiguous = index.resolvePath('src/shared.ts');
    expect(ambiguous.kind).toBe('ambiguous');
    if (ambiguous.kind !== 'ambiguous') throw new Error('Expected an ambiguous source-path resolution.');
    expect(new Set(ambiguous.candidates.map((candidate) => candidate.admission.addressHandle))).toEqual(new Set([
      nested.addressHandle,
      workspace.addressHandle,
    ]));
    expect(index.resolvePath('shared.ts')).toEqual({ kind: 'absent' });
    expectResolved(index.resolveWorkspacePath('src/shared.ts'), workspace, ['workspace-relative']);
    expectResolved(index.resolveProjectPath('src/shared.ts'), nested, ['project-relative']);
    const canonicalWorkspaceIdentity = index.resolvePath(path.join(workspaceRoot, 'src/shared.ts'));
    expectResolved(canonicalWorkspaceIdentity, workspace, ['absolute-host']);
    if (canonicalWorkspaceIdentity.kind !== 'resolved') throw new Error('Expected absolute workspace source identity.');
    expectResolved(
      index.resolveWorkspacePath(canonicalWorkspaceIdentity.source.workspacePath),
      workspace,
      ['workspace-relative'],
    );
  });

  test('uses the TypeScript host case policy for every exact path domain', () => {
    const workspaceRoot = path.resolve('Workspace');
    const projectRoot = path.join(workspaceRoot, 'Packages/App');
    const source = admission('app', 'src/Widget.ts', 'widget');
    const index = new ProjectSourceOwnershipIndex(workspaceRoot, projectRoot, [source]);
    const variant = 'packages/app/src/widget.ts';
    const resolution = index.resolvePath(variant);

    if (ts.sys.useCaseSensitiveFileNames) {
      expect(resolution).toEqual({ kind: 'absent' });
      expect(normalizeTypeSystemSourceFileName('/workspace/Foo.ts'))
        .not.toBe(normalizeTypeSystemSourceFileName('/workspace/foo.ts'));
    } else {
      expectResolved(resolution, source, ['workspace-relative']);
      expect(normalizeTypeSystemSourceFileName('C:/workspace/Foo.ts'))
        .toBe(normalizeTypeSystemSourceFileName('c:/workspace/foo.ts'));
    }
    expect(sameTypeSystemSourcePath('packages/app/src/Widget.ts', path.join(projectRoot, 'src/Widget.ts')))
      .toBe(false);

    const upperEpoch = semanticAppSourceEpochKey('app', 'Packages/App/src/Widget.ts');
    const lowerEpoch = semanticAppSourceEpochKey('app', 'packages/app/src/widget.ts');
    expect(upperEpoch === lowerEpoch).toBe(!ts.sys.useCaseSensitiveFileNames);

    const store = new KernelStore('program-source-case-identity');
    const programSources = new TypeSystemProgramSourceAuthority(
      store,
      new ComputationLifecycleRegistry(store),
      'workspace',
      workspaceRoot,
    );
    const first = programSources.sourceFile(
      store,
      'app',
      path.join(workspaceRoot, 'Packages/App/src/Widget.ts'),
      SourceFileRole.ExternalSource,
    );
    const second = programSources.sourceFile(
      store,
      'app',
      path.join(workspaceRoot, 'packages/app/src/widget.ts'),
      SourceFileRole.ExternalSource,
    );
    expect(first.address === second.address).toBe(!ts.sys.useCaseSensitiveFileNames);
    const normalizedRole = programSources.sourceFile(
      store,
      'other-project',
      path.join(workspaceRoot, 'Packages/App/src/Widget.ts'),
      SourceFileRole.AppSource,
    );
    expect(normalizedRole.address).toBe(first.address);
    expect(normalizedRole.address.role).toBe(SourceFileRole.ExternalSource);
    expect(() => programSources.sourceFile(
      store,
      'conflicting-project',
      path.join(workspaceRoot, 'Packages/App/src/Widget.ts'),
      SourceFileRole.Declaration,
    )).toThrow(/conflicting project-independent roles/iu);
  });

  test('keeps nested-project cursor, navigation, edit, diagnostic, and token lanes on one workspace source identity', async () => {
    const workspaceRoot = mkdtempSync(path.join(packageRoot, '.source-identity-lanes-'));
    const projectRoot = path.join(workspaceRoot, 'packages/app');
    const nestedSource = path.join(projectRoot, 'src/app.ts');
    const nestedTemplate = path.join(projectRoot, 'src/app.html');
    const checkerOnlySource = path.join(projectRoot, 'src/checker-only.ts');
    const declarationFile = path.join(projectRoot, 'src/aurelia-assets.d.ts');
    const decoyTemplate = path.join(workspaceRoot, 'src/app.html');
    const projectAliasCollisionTemplate = path.join(projectRoot, 'packages/app/src/app.html');
    const otherRoot = path.join(workspaceRoot, 'packages/other');
    const otherSource = path.join(otherRoot, 'src/app.ts');
    const otherTemplate = path.join(otherRoot, 'src/app.html');
    const otherCheckerOnlySource = path.join(otherRoot, 'src/checker-only.ts');
    const otherDeclaration = path.join(otherRoot, 'src/aurelia-assets.d.ts');
    const nestedMarkup = [
      '<template>',
      '  <section>',
      '    <h1>${title}</h1>',
      '    <p>${ti}</p>',
      '  </section>',
      '</template>',
    ].join('\n');
    try {
      mkdirSync(path.dirname(nestedSource), { recursive: true });
      mkdirSync(path.dirname(decoyTemplate), { recursive: true });
      mkdirSync(path.dirname(otherSource), { recursive: true });
      mkdirSync(path.dirname(projectAliasCollisionTemplate), { recursive: true });
      writeFileSync(path.join(projectRoot, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
        },
        include: ['src/**/*.ts'],
      }), 'utf8');
      writeFileSync(declarationFile, "declare module '*.html' { const markup: string; export default markup; }\n", 'utf8');
      writeFileSync(nestedSource, [
        "import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';",
        "import template from './app.html';",
        "import './checker-only.js';",
        '',
        "@customElement({ name: 'identity-app', template })",
        'class IdentityApp {',
        "  title = 'correct';",
        '  useTitle = this.title;',
        '}',
        'const invalidAssignment: string = 1;',
        'void invalidAssignment;',
        '',
        'new Aurelia()',
        '  .register(StandardConfiguration)',
        '  .app({ host: document.body, component: IdentityApp });',
      ].join('\n'), 'utf8');
      writeFileSync(otherCheckerOnlySource, [
        'const otherCheckerOnlyInvalid: string = 2;',
        'void otherCheckerOnlyInvalid;',
      ].join('\n'), 'utf8');
      writeFileSync(checkerOnlySource, [
        'const checkerOnlyInvalid: string = 1;',
        'void checkerOnlyInvalid;',
      ].join('\n'), 'utf8');
      writeFileSync(nestedTemplate, nestedMarkup, 'utf8');
      writeFileSync(decoyTemplate, '<template>${wrongWorkspaceRoot}</template>', 'utf8');
      writeFileSync(projectAliasCollisionTemplate, '<template>${wrongProjectAlias}</template>', 'utf8');
      writeFileSync(
        path.join(workspaceRoot, 'src/checker-only.ts'),
        "const workspaceDecoy: string = 'not-the-project-source';\nvoid workspaceDecoy;\n",
        'utf8',
      );
      writeFileSync(path.join(otherRoot, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
        },
        include: ['src/**/*.ts'],
      }), 'utf8');
      writeFileSync(otherDeclaration, "declare module '*.html' { const markup: string; export default markup; }\n", 'utf8');
      writeFileSync(otherSource, [
        "import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';",
        "import template from './app.html';",
        "import './checker-only.js';",
        '',
        "@customElement({ name: 'other-app', template })",
        "class OtherApp { title = 'other'; }",
        'new Aurelia().register(StandardConfiguration).app({ host: document.body, component: OtherApp });',
      ].join('\n'), 'utf8');
      writeFileSync(otherTemplate, '<template>${title}</template>', 'utf8');

      const runtime = await createSemanticRuntime({
        workspaceRoot,
        storeKey: `test:source-identity-lanes:${path.basename(workspaceRoot)}`,
        projects: [
          {
            projectKey: 'nested-app',
            rootDir: projectRoot,
            sourceFiles: [
              { path: 'src/app.ts', role: SourceFileRole.AppSource },
              { path: 'src/app.html', role: SourceFileRole.Template },
              { path: 'packages/app/src/app.html', role: SourceFileRole.Template },
              { path: 'src/aurelia-assets.d.ts', role: SourceFileRole.Declaration },
            ],
          },
          {
            projectKey: 'other-app',
            rootDir: otherRoot,
            sourceFiles: [
              { path: 'src/app.ts', role: SourceFileRole.AppSource },
              { path: 'src/app.html', role: SourceFileRole.Template },
              { path: 'src/aurelia-assets.d.ts', role: SourceFileRole.Declaration },
            ],
          },
        ],
      });
      const titleOffset = nestedMarkup.indexOf('title');
      const partialOffset = nestedMarkup.indexOf('ti}</p>') + 2;
      const titleCursor = {
        filePath: nestedTemplate,
        line: 0,
        character: titleOffset + 1,
        offset: titleOffset + 1,
      };
      const queryBase = {
        projectKey: 'nested-app',
        includeAuthoringTemplates: true,
        appRetention: 'retain-app' as const,
      };

      const cursorInfo = await runtime.answerAppQuery({
        ...queryBase,
        kind: SemanticAppQueryKind.TemplateCursorInfo,
        cursor: titleCursor,
      }) as SemanticRuntimeAnswer<SemanticTemplateCursorInfoResult>;
      expect(cursorInfo.value.selectedMemberName).toBe('title');
      expect(cursorInfo.value.activeSource?.path).toBe('packages/app/src/app.html');
      expect(cursorInfo.value.selectedMember?.declarationSource?.path).toBe('packages/app/src/app.ts');

      const resourceDefinitions = await runtime.answerAppQuery({
        ...queryBase,
        kind: SemanticAppQueryKind.ResourceDefinitions,
      }) as SemanticRuntimeAnswer<SemanticResourceDefinitionsResult>;
      const appDefinition = resourceDefinitions.value.rows.find((row) => row.name === 'identity-app');
      expect(appDefinition?.source?.path).toBe('packages/app/src/app.ts');
      expect(appDefinition?.template?.source?.path).toBe('packages/app/src/app.html');

      const completions = await runtime.answerAppQuery({
        ...queryBase,
        kind: SemanticAppQueryKind.TemplateCompletions,
        cursor: { ...titleCursor, character: partialOffset, offset: partialOffset },
      }) as SemanticRuntimeAnswer<SemanticTemplateCompletionResult>;
      expect(completions.value.candidates.map((candidate) => candidate.name)).toContain('title');
      expect(completions.value.template.source?.path).toBe('packages/app/src/app.html');

      const references = await runtime.answerAppQuery({
        ...queryBase,
        kind: SemanticAppQueryKind.TemplateReferences,
        cursor: titleCursor,
        includeDeclaration: true,
      }) as SemanticRuntimeAnswer<SemanticTemplateReferencesResult>;
      expect(new Set(references.value.rows.map((row) => row.source?.path))).toEqual(new Set([
        'packages/app/src/app.html',
        'packages/app/src/app.ts',
      ]));

      const rename = await runtime.answerAppQuery({
        ...queryBase,
        kind: SemanticAppQueryKind.TemplateRename,
        cursor: titleCursor,
        newName: 'heading',
      }) as SemanticRuntimeAnswer<SemanticTemplateRenameResult>;
      expect(rename.value.status).toBe('available');
      expect(new Set(rename.value.edits.map((edit) => edit.source?.path))).toEqual(new Set([
        'packages/app/src/app.html',
        'packages/app/src/app.ts',
      ]));

      const diagnostics = await runtime.answerAppQuery({
        ...queryBase,
        kind: SemanticAppQueryKind.TemplateDiagnostics,
        sourceFile: { filePath: nestedTemplate },
      }) as SemanticRuntimeAnswer<SemanticTemplateDiagnosticsResult>;
      expect(diagnostics.value.rows.length).toBeGreaterThan(0);
      expect(diagnostics.value.rows.every((row) => row.source?.path === 'packages/app/src/app.html')).toBe(true);

      const tokens = await runtime.answerAppQuery({
        ...queryBase,
        kind: SemanticAppQueryKind.TemplateSemanticTokens,
        sourceFile: { filePath: nestedTemplate },
      }) as SemanticRuntimeAnswer<SemanticTemplateSemanticTokensResult>;
      expect(tokens.value.rows.length).toBeGreaterThan(0);
      expect(tokens.value.rows.every((row) => row.source?.path === 'packages/app/src/app.html')).toBe(true);

      const folds = await runtime.answerAppQuery({
        ...queryBase,
        kind: SemanticAppQueryKind.TemplateFoldingRanges,
        sourceFile: { filePath: nestedTemplate },
      }) as SemanticRuntimeAnswer<SemanticTemplateFoldingRangesResult>;
      expect(folds.value.rows.length).toBeGreaterThan(0);
      expect(folds.value.rows.every((row) => row.source?.path === 'packages/app/src/app.html')).toBe(true);

      const observedApp = await runtime.openApp({
        projectKey: 'nested-app',
        analysisDepth: 'binding-observation',
        includeAuthoringTemplates: true,
        authoringTemplateSourceFiles: [nestedTemplate],
      });

      const observedBySource = async (filePath: string): Promise<SemanticBindingObservedDependencyResult> => (
        await runtime.answerAppQuery({
          ...queryBase,
          kind: SemanticAppQueryKind.BindingObservedDependencies,
          observedDependencyLocus: { kind: 'source-file', sourceFile: { filePath } },
          page: { size: 400 },
        }) as SemanticRuntimeAnswer<SemanticBindingObservedDependencyResult>
      ).value;
      const observedRelative = observedApp.ask({
        kind: SemanticAppQueryKind.BindingObservedDependencies,
        observedDependencyLocus: {
          kind: 'source-file',
          sourceFile: { filePath: 'packages/app/src/app.html' },
        },
        page: { size: 400 },
      }).value as SemanticBindingObservedDependencyResult;
      const observedAbsolute = await observedBySource(nestedTemplate);
      expect(observedRelative.rows.length).toBeGreaterThan(0);
      expect(observedAbsolute.rows).toEqual(observedRelative.rows);

      const typeScriptDiagnostics = await runtime.answerAppQuery({
        ...queryBase,
        kind: SemanticAppQueryKind.TypeScriptDiagnostics,
        sourceFile: { filePath: nestedSource },
      }) as SemanticRuntimeAnswer<SemanticTypeScriptDiagnosticsResult>;
      const assignmentDiagnostic = typeScriptDiagnostics.value.rows.find((row) => row.code === 2322) ?? null;
      expect(assignmentDiagnostic?.source?.path).toBe('packages/app/src/app.ts');
      expect(assignmentDiagnostic?.source?.sourceWorkspaceKey).toBe('nested-app');

      const checkerOnlyDiagnostics = await runtime.answerAppQuery({
        ...queryBase,
        kind: SemanticAppQueryKind.TypeScriptDiagnostics,
        sourceFile: { filePath: checkerOnlySource },
      }) as SemanticRuntimeAnswer<SemanticTypeScriptDiagnosticsResult>;
      expect(checkerOnlyDiagnostics.value.rows.find((row) => row.code === 2322)?.source?.path)
        .toBe('packages/app/src/checker-only.ts');
      expect(runtime.authoredSourceOwnership({ sourceFilePath: checkerOnlySource }).value.owners).toEqual([]);
      await expect(runtime.answerAppQuery({
        ...queryBase,
        kind: SemanticAppQueryKind.TypeScriptDiagnostics,
        sourceFile: { filePath: 'src/checker-only.ts' },
      })).rejects.toThrow(/multiple exact readable interpretations.*absolute path/iu);

      const app = await runtime.openApp({
        projectKey: 'nested-app',
        analysisDepth: 'binding-observation',
        includeAuthoringTemplates: true,
        authoringTemplateSourceFiles: [nestedTemplate],
      });
      const directTokens = app.ask({
        kind: SemanticAppQueryKind.TemplateSemanticTokens,
        sourceFile: { filePath: nestedTemplate },
      }).value as SemanticTemplateSemanticTokensResult;
      expect(directTokens.rows.length).toBeGreaterThan(0);
      expect(directTokens.rows.every((row) => row.source?.path === 'packages/app/src/app.html')).toBe(true);
      const directAbsoluteCursor = app.ask({
        kind: SemanticAppQueryKind.TemplateCursorInfo,
        cursor: titleCursor,
      }).value as SemanticTemplateCursorInfoResult;
      const canonicalCursorPath = directAbsoluteCursor.activeSource?.path;
      if (canonicalCursorPath == null) throw new Error('Expected canonical direct-app cursor source.');
      const directCanonicalCursor = app.ask({
        kind: SemanticAppQueryKind.TemplateCursorInfo,
        cursor: { ...titleCursor, filePath: canonicalCursorPath },
      }).value as SemanticTemplateCursorInfoResult;
      expect(directAbsoluteCursor.selectedMemberName).toBe('title');
      expect(directCanonicalCursor.selectedMemberName).toBe('title');
      expect(directCanonicalCursor.activeSource?.path).toBe('packages/app/src/app.html');

      await expect(runtime.answerAppQueries({
        queries: [
          { kind: SemanticAppQueryKind.TypeScriptDiagnostics, sourceFile: { filePath: nestedSource } },
          { kind: SemanticAppQueryKind.TypeScriptDiagnostics, sourceFile: { filePath: otherSource } },
        ],
        appRetention: 'retain-app',
      })).rejects.toThrow(/not owned by selected project 'nested-app'.*other-app/iu);
      await expect(runtime.answerAppQueries({
        projectKey: 'nested-app',
        queries: [
          {
            kind: SemanticAppQueryKind.TypeScriptDiagnostics,
            sourceFile: { filePath: 'packages/app/src/checker-only.ts' },
          },
          {
            kind: SemanticAppQueryKind.TypeScriptDiagnostics,
            sourceFile: { filePath: 'packages/other/src/checker-only.ts' },
          },
        ],
        appRetention: 'retain-app',
      })).rejects.toThrow(/not owned by selected project 'nested-app'.*other-app/iu);

      await expect(runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TemplateCursorInfo,
        cursor: { ...titleCursor, filePath: 'src/app.html' },
        includeAuthoringTemplates: true,
        appRetention: 'retain-app',
      })).rejects.toThrow(/admitted by multiple projects.*nested-app.*other-app/iu);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  }, 60_000);

  test('canonicalizes source-file loci nested inside observed-dependency selectors', async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/computed-decorator-contexts');
    const relativeFile = 'src/computed-decorator-contexts-app.html';
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'test:observed-dependency-source-locus-identity',
    });
    const projectKey = runtime.workspace.projects[0]!.projectKey;
    const read = async (filePath: string): Promise<SemanticBindingObservedDependencyResult> => (
      await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.BindingObservedDependencies,
        projectKey,
        observedDependencyLocus: { kind: 'source-file', sourceFile: { filePath } },
        page: { size: 400 },
        analysisDepth: 'binding-observation',
        appRetention: 'retain-app',
      }) as SemanticRuntimeAnswer<SemanticBindingObservedDependencyResult>
    ).value;

    const relative = await read(relativeFile);
    const absolute = await read(path.join(fixtureRoot, relativeFile));
    expect(relative.rows).toHaveLength(4);
    expect(absolute.rows).toEqual(relative.rows);
  }, 30_000);
});

function admission(projectKey: string, sourcePath: string, key: string): SourceFileAdmission {
  return new SourceFileAdmission(
    projectKey,
    sourcePath,
    SourceLanguage.TypeScript,
    SourceFileRole.AppSource,
    `address:${key}` as AddressHandle,
    `evidence:${key}` as EvidenceHandle,
    `provenance:${key}` as ProvenanceHandle,
  );
}

function expectResolved(
  resolution: ProjectSourcePathResolution,
  admission: SourceFileAdmission,
  bases: readonly string[],
): void {
  expect(resolution.kind).toBe('resolved');
  if (resolution.kind !== 'resolved') throw new Error('Expected a resolved source-path identity.');
  expect(resolution.source.admission).toBe(admission);
  expect(resolution.bases).toEqual(bases);
}
