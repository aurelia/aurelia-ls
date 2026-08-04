import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test } from 'vitest';

import { semanticSourceFacetsForReference } from '../src/api/source-reference.js';
import {
  SemanticAppQueryKind,
  type SemanticResourceDefinitionsResult,
  type SemanticRuntimeAnswer,
  type SemanticTemplateCodeActionsResult,
  type SemanticTemplateDiagnosticsResult,
} from '../src/api/contracts.js';
import {
  ProjectSourceOwnershipIndex,
  projectOwnsSourceReference,
} from '../src/boot/source-ownership.js';
import { aureliaAppProjectEvaluationProfile } from '../src/configuration/aurelia-project-evaluation.js';
import { InquirySourceFacet } from '../src/inquiry/continuation-intent.js';
import {
  SourceFileAddress,
  SourceFileRole,
} from '../src/kernel/address.js';
import { externalizeSourceFileRole } from '../src/kernel/source-classification.js';
import { createSemanticRuntime } from '../src/api/runtime.js';
import { ensureSourceFileAddressForCheckerNode } from '../src/type-system/declaration-source.js';
import { isDefaultLibrarySourceFile } from '../src/type-system/source-file-path.js';

const temporaryRoots: string[] = [];
const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('linked source identity and ownership', () => {
  test('externalizes ordinary source roles while preserving physical declaration and generated provenance', () => {
    expect(externalizeSourceFileRole(SourceFileRole.AppSource)).toBe(SourceFileRole.ExternalSource);
    expect(externalizeSourceFileRole(SourceFileRole.Declaration)).toBe(SourceFileRole.Declaration);
    expect(externalizeSourceFileRole(SourceFileRole.Generated)).toBe(SourceFileRole.Generated);
  });

  test('preserves one evaluator/checker identity without granting excluded dependencies editability', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'aurelia-linked-source-'));
    temporaryRoots.push(root);
    const mainFile = path.join(root, 'src/main.ts');
    const excludedRoot = path.join(root, 'excluded');
    const dependencyFile = path.join(excludedRoot, 'dependency.ts');
    mkdirSync(path.dirname(mainFile), { recursive: true });
    mkdirSync(excludedRoot, { recursive: true });
    writeFileSync(mainFile, [
      "import { dependency } from '../excluded/dependency.js';",
      'export const result = dependency;',
    ].join('\n'), 'utf8');
    writeFileSync(dependencyFile, 'export const dependency = 1;\n', 'utf8');
    writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
      },
      include: ['src/**/*.ts', 'excluded/**/*.ts'],
    }), 'utf8');

    const runtime = await createSemanticRuntime({
      workspaceRoot: root,
      storeKey: `test:linked-source-identity:${path.basename(root)}`,
      projects: [{
        projectKey: 'linked-source-project',
        rootDir: root,
        excludedSourceRoots: [excludedRoot],
        sourceFiles: [{ path: 'src/main.ts', role: SourceFileRole.AppSource }],
      }],
    });
    const project = runtime.workspace.projects[0]!;
    const evaluationAccess = runtime.projectEvaluations.acquire(project, aureliaAppProjectEvaluationProfile);
    const evaluation = evaluationAccess.readBaseline();
    const linked = evaluation.sources.find((source) =>
      source.sourceFile != null && path.resolve(source.sourceFile.fileName) === path.resolve(dependencyFile)
    );

    expect(linked?.admission.role).toBe(SourceFileRole.ExternalSource);
    expect(project.sourceFiles.some((source) => source.path.includes('excluded'))).toBe(false);

    const typeSystem = runtime.typeSystemProjects.acquire(project, evaluationAccess.generation).readProject();
    const dependencySource = typeSystem.readProgramSourceFileByHostPath(dependencyFile);
    expect(dependencySource).not.toBeNull();
    expect(typeSystem.readProgramSourceFileRoleByHostPath(dependencyFile)).toBe(SourceFileRole.ExternalSource);
    expect(typeSystem.isProjectEditableProgramSourceFileByHostPath(mainFile)).toBe(true);
    expect(path.normalize(typeSystem.readProjectEditableProgramSourceFileByHostPath(mainFile)!.fileName))
      .toBe(path.normalize(mainFile));
    expect(typeSystem.isProjectEditableProgramSourceFileByHostPath(dependencyFile)).toBe(false);
    expect(typeSystem.readProjectEditableProgramSourceFileByHostPath(dependencyFile)).toBeNull();
    expect(typeSystem.readProjectEditableProgramSourceFiles().map((sourceFile) => path.normalize(sourceFile.fileName)))
      .toEqual([path.normalize(mainFile)]);

    const checkerAddress = ensureSourceFileAddressForCheckerNode(
      runtime.workspace.store,
      typeSystem.checker,
      dependencySource!,
    );
    expect(checkerAddress.handle).toBe(linked?.admission.addressHandle);
    expect(checkerAddress.workspaceKey).toBe(project.projectKey);
    expect(checkerAddress.role).toBe(SourceFileRole.ExternalSource);

    const checkerOnlyLibrary = typeSystem.program.getSourceFiles().find((sourceFile) =>
      isDefaultLibrarySourceFile(sourceFile.fileName)
    );
    expect(checkerOnlyLibrary).toBeDefined();
    const checkerOnlyAddress = ensureSourceFileAddressForCheckerNode(
      runtime.workspace.store,
      typeSystem.checker,
      checkerOnlyLibrary!,
    );
    expect(checkerOnlyAddress.workspaceKey).toBe(runtime.workspace.semanticWorkspaceKey);
    expect(checkerOnlyAddress.role).toBe(SourceFileRole.Declaration);
    expect(evaluation.sources.some((source) => source.admission.addressHandle === checkerOnlyAddress.handle)).toBe(false);

    const linkedStoredAddress = runtime.workspace.store.read(linked!.admission.addressHandle);
    expect(linkedStoredAddress).toBeInstanceOf(SourceFileAddress);
    expect(linkedStoredAddress).toBe(checkerAddress);
  }, 30_000);

  test('keeps an in-boundary graph-only AppSource outside the boot editability authority', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'aurelia-graph-only-source-'));
    temporaryRoots.push(root);
    const mainFile = path.join(root, 'src/main.ts');
    const graphOnlyFile = path.join(root, 'src/graph-only.ts');
    mkdirSync(path.dirname(mainFile), { recursive: true });
    writeFileSync(mainFile, [
      "import { graphValue } from './graph-only.js';",
      'export const result = graphValue;',
    ].join('\n'), 'utf8');
    writeFileSync(graphOnlyFile, 'export const graphValue = 1;\n', 'utf8');
    writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
      },
      include: ['src/**/*.ts'],
    }), 'utf8');

    const runtime = await createSemanticRuntime({
      workspaceRoot: root,
      storeKey: `test:graph-only-source:${path.basename(root)}`,
      projects: [{
        projectKey: 'explicit-project',
        rootDir: root,
        sourceFiles: [{ path: 'src/main.ts', role: SourceFileRole.AppSource }],
      }],
    });
    const project = runtime.workspace.projects[0]!;
    expect(project.authoredSources.contains(graphOnlyFile)).toBe(true);
    expect(project.sourceFiles.some((source) => source.path === 'src/graph-only.ts')).toBe(false);

    const evaluationAccess = runtime.projectEvaluations.acquire(project, aureliaAppProjectEvaluationProfile);
    const linked = evaluationAccess.readBaseline().sources.find((source) =>
      source.sourceFile != null && path.resolve(source.sourceFile.fileName) === path.resolve(graphOnlyFile)
    );
    expect(linked?.admission.role).toBe(SourceFileRole.AppSource);

    const typeSystem = runtime.typeSystemProjects.acquire(project, evaluationAccess.generation).readProject();
    const graphOnlySource = typeSystem.readProgramSourceFileByHostPath(graphOnlyFile);
    expect(graphOnlySource).not.toBeNull();
    expect(typeSystem.readProgramSourceFileRoleByHostPath(graphOnlyFile)).toBe(SourceFileRole.AppSource);
    expect(typeSystem.isProjectEditableProgramSourceFileByHostPath(graphOnlyFile)).toBe(false);
    expect(typeSystem.readProjectEditableProgramSourceFileByHostPath(graphOnlyFile)).toBeNull();
    const graphOnlyAddress = ensureSourceFileAddressForCheckerNode(
      runtime.workspace.store,
      typeSystem.checker,
      graphOnlySource!,
    );
    expect(graphOnlyAddress.handle).toBe(linked?.admission.addressHandle);
    expect(graphOnlyAddress.workspaceKey).toBe(project.projectKey);
  }, 30_000);

  test('gives a shared physical dependency independent linked identities in each project', async () => {
    const workspaceRoot = mkdtempSync(path.join(tmpdir(), 'aurelia-shared-linked-source-'));
    temporaryRoots.push(workspaceRoot);
    const firstRoot = path.join(workspaceRoot, 'apps/first');
    const secondRoot = path.join(workspaceRoot, 'apps/second');
    const firstMainFile = path.join(firstRoot, 'src/main.ts');
    const secondMainFile = path.join(secondRoot, 'src/main.ts');
    const sharedFile = path.join(workspaceRoot, 'shared/dependency.ts');
    mkdirSync(path.dirname(firstMainFile), { recursive: true });
    mkdirSync(path.dirname(secondMainFile), { recursive: true });
    mkdirSync(path.dirname(sharedFile), { recursive: true });
    const mainText = [
      "import { sharedValue } from '../../../shared/dependency.js';",
      'export const result = sharedValue;',
    ].join('\n');
    writeFileSync(firstMainFile, mainText, 'utf8');
    writeFileSync(secondMainFile, mainText, 'utf8');
    writeFileSync(sharedFile, 'export const sharedValue = 1;\n', 'utf8');
    for (const projectRoot of [firstRoot, secondRoot]) {
      writeFileSync(path.join(projectRoot, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
        },
        include: ['src/**/*.ts'],
      }), 'utf8');
    }

    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: `test:shared-linked-source:${path.basename(workspaceRoot)}`,
      projects: [
        {
          projectKey: 'first-project',
          rootDir: firstRoot,
          sourceFiles: [{ path: 'src/main.ts', role: SourceFileRole.AppSource }],
        },
        {
          projectKey: 'second-project',
          rootDir: secondRoot,
          sourceFiles: [{ path: 'src/main.ts', role: SourceFileRole.AppSource }],
        },
      ],
    });
    const linkedAdmissions: { readonly projectKey: string; readonly handle: string }[] = [];
    const checkerAddressHandles: string[] = [];
    for (const project of runtime.workspace.projects) {
      const evaluationAccess = runtime.projectEvaluations.acquire(project, aureliaAppProjectEvaluationProfile);
      const linked = evaluationAccess.readBaseline().sources.find((source) =>
        source.sourceFile != null && path.resolve(source.sourceFile.fileName) === path.resolve(sharedFile)
      );
      expect(linked?.admission.role).toBe(SourceFileRole.ExternalSource);
      expect(linked?.admission.projectKey).toBe(project.projectKey);

      const typeSystem = runtime.typeSystemProjects.acquire(project, evaluationAccess.generation).readProject();
      const sharedSource = typeSystem.readProgramSourceFileByHostPath(sharedFile);
      expect(sharedSource).not.toBeNull();
      expect(typeSystem.readProgramSourceFileRoleByHostPath(sharedFile)).toBe(SourceFileRole.ExternalSource);
      expect(typeSystem.isProjectEditableProgramSourceFileByHostPath(sharedFile)).toBe(false);
      expect(typeSystem.readProjectEditableProgramSourceFileByHostPath(sharedFile)).toBeNull();
      const checkerAddress = ensureSourceFileAddressForCheckerNode(
        runtime.workspace.store,
        typeSystem.checker,
        sharedSource!,
      );
      expect(checkerAddress.handle).toBe(linked?.admission.addressHandle);
      expect(checkerAddress.workspaceKey).toBe(project.projectKey);
      expect(checkerAddress.workspaceKey).not.toBe(runtime.workspace.workspaceKey);
      linkedAdmissions.push({ projectKey: project.projectKey, handle: linked!.admission.addressHandle });
      checkerAddressHandles.push(checkerAddress.handle);
    }

    expect(new Set(linkedAdmissions.map((entry) => entry.projectKey))).toEqual(
      new Set(['first-project', 'second-project']),
    );
    expect(new Set(linkedAdmissions.map((entry) => entry.handle)).size).toBe(2);
    expect(new Set(checkerAddressHandles).size).toBe(2);
  }, 30_000);

  test('keeps external and generated file roles out of authored source facets', () => {
    expect(semanticSourceFacetsForReference({
      kind: 'source-file-address',
      label: 'external dependency',
      path: 'excluded/dependency.ts',
      sourceFileRole: SourceFileRole.ExternalSource,
    })).toEqual([InquirySourceFacet.External]);

    expect(semanticSourceFacetsForReference({
      kind: 'source-file-address',
      label: 'generated dependency',
      path: '.aurelia-artifacts/generated.ts',
      sourceFileRole: SourceFileRole.Generated,
    })).toEqual([InquirySourceFacet.Generated]);

    expect(semanticSourceFacetsForReference({
      kind: 'source-file-address',
      label: 'authored declaration',
      path: 'src/contracts.d.ts',
      sourceFileRole: SourceFileRole.Declaration,
    })).toEqual([
      InquirySourceFacet.AuthoredSource,
      InquirySourceFacet.CarrierSpan,
    ]);
  });

  test('does not reinterpret project-relative admissions against the workspace root', async () => {
    const workspaceRoot = mkdtempSync(path.join(tmpdir(), 'aurelia-nested-source-domain-'));
    temporaryRoots.push(workspaceRoot);
    const projectRoot = path.join(workspaceRoot, 'packages/app');
    const projectMainFile = path.join(projectRoot, 'src/main.ts');
    const workspaceSiblingFile = path.join(workspaceRoot, 'src/main.ts');
    mkdirSync(path.dirname(projectMainFile), { recursive: true });
    mkdirSync(path.dirname(workspaceSiblingFile), { recursive: true });
    writeFileSync(projectMainFile, [
      "import type { WorkspaceContract } from '../../../src/main.js';",
      "export const value: WorkspaceContract = { label: 'project' };",
    ].join('\n'), 'utf8');
    writeFileSync(workspaceSiblingFile, 'export interface WorkspaceContract { label: string; }\n', 'utf8');
    writeFileSync(path.join(projectRoot, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
      },
      include: ['src/**/*.ts'],
    }), 'utf8');

    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: `test:nested-source-domain:${path.basename(workspaceRoot)}`,
      projects: [{
        projectKey: 'nested-project',
        rootDir: projectRoot,
        sourceFiles: [{ path: 'src/main.ts', role: SourceFileRole.AppSource }],
      }],
    });
    const project = runtime.workspace.projects[0]!;
    const evaluationAccess = runtime.projectEvaluations.acquire(project, aureliaAppProjectEvaluationProfile);
    const evaluation = evaluationAccess.readBaseline();
    expect(evaluation.sources.some((source) =>
      source.sourceFile != null && path.resolve(source.sourceFile.fileName) === path.resolve(workspaceSiblingFile)
    )).toBe(false);

    const typeSystem = runtime.typeSystemProjects.acquire(project, evaluationAccess.generation).readProject();
    const projectMainSource = typeSystem.readProgramSourceFileByHostPath(projectMainFile);
    const workspaceSiblingSource = typeSystem.readProgramSourceFileByHostPath(workspaceSiblingFile);
    expect(projectMainSource).not.toBeNull();
    expect(workspaceSiblingSource).not.toBeNull();
    expect(typeSystem.readProgramSourceFileRoleByHostPath(projectMainFile)).toBe(SourceFileRole.AppSource);
    expect(typeSystem.readProgramSourceFileRoleByHostPath(workspaceSiblingFile)).toBe(SourceFileRole.ExternalSource);
    expect(typeSystem.isProjectEditableProgramSourceFileByHostPath(workspaceSiblingFile)).toBe(false);

    const projectAddress = ensureSourceFileAddressForCheckerNode(
      runtime.workspace.store,
      typeSystem.checker,
      projectMainSource!,
    );
    const workspaceSiblingAddress = ensureSourceFileAddressForCheckerNode(
      runtime.workspace.store,
      typeSystem.checker,
      workspaceSiblingSource!,
    );
    expect(projectAddress.workspaceKey).toBe(project.projectKey);
    expect(workspaceSiblingAddress.workspaceKey).toBe(runtime.workspace.semanticWorkspaceKey);
    expect(workspaceSiblingAddress.handle).not.toBe(projectAddress.handle);
    expect(workspaceSiblingAddress.role).toBe(SourceFileRole.ExternalSource);
    expect(path.resolve(typeSystem.readProgramSourceFileByProjectPath('src/main.ts')!.fileName))
      .toBe(path.resolve(projectMainFile));
    expect(path.resolve(typeSystem.readProgramSourceFileForAddress(workspaceSiblingAddress)!.fileName))
      .toBe(path.resolve(workspaceSiblingFile));
    expect(() => typeSystem.readProgramSourceFileByHostPath('src/main.ts'))
      .toThrow(/absolute host path/);
    expect(() => typeSystem.readProgramSourceFileByProjectPath(projectMainFile))
      .toThrow(/relative path/);
  }, 30_000);

  test('does not turn a linked workspace source into an edit against a nested-project path collision', async () => {
    const workspaceRoot = mkdtempSync(path.join(packageRoot, '.nested-edit-path-domain-'));
    temporaryRoots.push(workspaceRoot);
    const projectRoot = path.join(workspaceRoot, 'packages/app');
    const projectMainFile = path.join(projectRoot, 'src/main.ts');
    const externalWidgetFile = path.join(workspaceRoot, 'src/main.ts');
    const externalWidgetTemplateFile = path.join(projectRoot, 'src/external-widget.html');
    const externalWidgetTemplate = '<p>${missingMember}</p>';

    mkdirSync(path.dirname(projectMainFile), { recursive: true });
    mkdirSync(path.dirname(externalWidgetFile), { recursive: true });
    writeFileSync(path.join(projectRoot, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
      },
      include: ['src/**/*.ts'],
    }), 'utf8');
    writeFileSync(path.join(projectRoot, 'src/aurelia-assets.d.ts'),
      "declare module '*.html' { const markup: string; export default markup; }\n", 'utf8');
    writeFileSync(projectMainFile, [
      "import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';",
      "import { BoundaryApp } from './app.js';",
      '',
      '// A matching class name makes a project-first relative lookup a plausible but unsafe edit target.',
      'if (false) { class ExternalWidget {} }',
      '',
      'new Aurelia()',
      '  .register(StandardConfiguration)',
      '  .app({ host: document.body, component: BoundaryApp })',
      '  .start();',
    ].join('\n'), 'utf8');
    writeFileSync(path.join(projectRoot, 'src/app.ts'), [
      "import { customElement } from '@aurelia/runtime-html';",
      "import { ExternalWidget } from '../../../src/main.js';",
      '',
      "@customElement({ name: 'boundary-app', template: '<external-widget></external-widget>', dependencies: [ExternalWidget] })",
      'export class BoundaryApp {}',
    ].join('\n'), 'utf8');
    writeFileSync(externalWidgetFile, [
      "import { customElement } from '@aurelia/runtime-html';",
      "import template from '../packages/app/src/external-widget.html';",
      '',
      "@customElement({ name: 'external-widget', template })",
      'export class ExternalWidget {}',
    ].join('\n'), 'utf8');
    writeFileSync(externalWidgetTemplateFile, externalWidgetTemplate, 'utf8');

    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: `test:nested-edit-path-domain:${path.basename(workspaceRoot)}`,
      projects: [{
        projectKey: 'nested-edit-project',
        rootDir: projectRoot,
        sourceFiles: [
          { path: 'src/main.ts', role: SourceFileRole.AppSource },
          { path: 'src/app.ts', role: SourceFileRole.AppSource },
          { path: 'src/aurelia-assets.d.ts', role: SourceFileRole.Declaration },
          { path: 'src/external-widget.html', role: SourceFileRole.Template },
        ],
      }],
    });
    const markerOffset = externalWidgetTemplate.indexOf('missingMember');
    const queryBase = {
      projectKey: 'nested-edit-project',
      sourceFilePath: externalWidgetTemplateFile,
      cursor: {
        filePath: externalWidgetTemplateFile,
        line: 0,
        character: markerOffset + 1,
        offset: markerOffset + 1,
      },
      analysisDepth: 'binding-observation' as const,
      diagnosticProjection: 'type-projection' as const,
      appRetention: 'retain-app' as const,
    };
    const definitions = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.ResourceDefinitions,
      projectKey: 'nested-edit-project',
      page: { size: 20 },
      analysisDepth: 'binding-observation',
      appRetention: 'retain-app',
    }) as SemanticRuntimeAnswer<SemanticResourceDefinitionsResult>;
    const externalWidget = definitions.value.rows.find((row) => row.name === 'external-widget');
    expect(externalWidget?.targetDeclarationSource?.path).toBe('src/main.ts');

    const diagnostics = await runtime.answerAppQuery({
      ...queryBase,
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      sourceFile: { filePath: externalWidgetTemplateFile },
    }) as SemanticRuntimeAnswer<SemanticTemplateDiagnosticsResult>;
    const diagnostic = diagnostics.value.rows.find((row) =>
      row.diagnosticKind === 'missing-expression-member'
      && row.selectedMemberName === 'missingMember'
    );
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.suggestion?.actionKind).toBe('declare-member');
    expect(runtime.authoredSourceOwnership({ sourceFilePath: projectMainFile }).value.owners).toHaveLength(1);
    expect(runtime.authoredSourceOwnership({ sourceFilePath: externalWidgetFile }).value.owners).toEqual([]);

    const actions = await runtime.answerAppQuery({
      ...queryBase,
      kind: SemanticAppQueryKind.TemplateCodeActions,
    }) as SemanticRuntimeAnswer<SemanticTemplateCodeActionsResult>;
    expect(actions.value.rows).toEqual([]);
  }, 30_000);

  test('uses workspace-relative source carriers with exact project admission ownership', () => {
    const workspaceRootDir = path.resolve('C:/workspace');
    const rootDir = path.join(workspaceRootDir, 'packages/app');
    const sourceFiles = [{ path: 'src/main.ts' }];
    const project = {
      workspaceRootDir,
      rootDir,
      sourceOwnership: new ProjectSourceOwnershipIndex(rootDir, sourceFiles as never),
    };

    expect(projectOwnsSourceReference(project, {
      kind: 'source-file-address',
      label: 'owned source',
      path: 'packages/app/src/main.ts',
    })).toBe(true);
    expect(projectOwnsSourceReference(project, {
      kind: 'source-file-address',
      label: 'linked source',
      path: 'packages/shared/src/dependency.ts',
    })).toBe(false);
    expect(() => project.sourceOwnership.admissionForHostPath('src/main.ts'))
      .toThrow(/absolute host path/);
  });
});
