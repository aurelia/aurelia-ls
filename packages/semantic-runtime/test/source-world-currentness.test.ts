import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  createSemanticRuntime,
  resolveSemanticProjectFindingRulePolicy,
  SemanticAppQueryKind,
  SemanticProjectFindingRuleId,
  SemanticRuntimeProjectInputAuthority,
  SemanticRuntimeProjectInputChange,
  SemanticRuntimeProjectInputChangeKind,
  SemanticRuntimeProjectInputCurrentnessMode,
  SemanticRuntimeProjectInputReadKind,
  SemanticSourceWorldCurrentnessKind,
  SemanticSourceWorldInputReceipt,
  resolveSemanticSourceWorld,
} from '../src/index.js';
import { bootWorkspaceFromSourceWorld } from '../src/boot/boot-workspace.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(temporaryRoots.splice(0).map((root) =>
    rm(root, { force: true, recursive: true })));
});

describe('semantic source-world currentness', () => {
  test('re-resolves marker ownership on project creation and deletion', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/root.ts', 'export const root = true;\n');
    const authority = new SemanticRuntimeProjectInputAuthority(undefined, {
      authorityForRead: () => ({ mode: SemanticRuntimeProjectInputCurrentnessMode.PushObserved }),
    });
    const baseline = resolveSemanticSourceWorld({
      rootDir: workspaceRoot,
      projectInputAuthority: authority,
    });
    expect(baseline.projects).toHaveLength(1);

    const nestedRoot = path.join(workspaceRoot, 'packages', 'feature');
    const markerFile = await writeWorkspaceFile(nestedRoot, 'package.json', '{"name":"feature"}');
    await writeWorkspaceFile(nestedRoot, 'src/feature.ts', 'export const feature = true;\n');
    authority.advance([
      new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.StructuralMembership,
        markerFile,
      ),
    ]);

    const created = baseline.resolveCurrent();
    expect(created.kind).toBe(SemanticSourceWorldCurrentnessKind.FreshBootRequired);
    expect(created.sourceWorld.projects.map((project) => project.rootDir)).toContain(path.normalize(nestedRoot));
    expect(projectForRoot(created.sourceWorld, nestedRoot).sourceFiles.map((source) => source.path))
      .toContain('src/feature.ts');

    await rm(nestedRoot, { force: true, recursive: true });
    authority.advance([
      new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.StructuralMembership,
        markerFile,
      ),
    ]);
    const removed = created.sourceWorld.resolveCurrent();
    expect(removed.kind).toBe(SemanticSourceWorldCurrentnessKind.FreshBootRequired);
    expect(removed.sourceWorld.projects).toHaveLength(1);
    expect(removed.sourceWorld.sourceWorldRevision).toBe(baseline.sourceWorldRevision);
  });

  test('distinguishes irrelevant directory churn, source membership, and source text changes', async () => {
    const workspaceRoot = await createWorkspace();
    const sourceFile = await writeWorkspaceFile(
      workspaceRoot,
      'src/main.ts',
      'export const value = 1;\n',
    );
    const authority = new SemanticRuntimeProjectInputAuthority();
    const baseline = resolveSemanticSourceWorld({
      rootDir: workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
      projectInputAuthority: authority,
    });
    const boot = bootWorkspaceFromSourceWorld(baseline, 'source-world-equivalent-store');

    await writeWorkspaceFile(workspaceRoot, 'README.md', '# Irrelevant to source membership\n');
    const irrelevant = baseline.resolveCurrent();
    expect(irrelevant.kind).toBe(SemanticSourceWorldCurrentnessKind.EquivalentPlan);
    expect(irrelevant.sourceWorld.sourceWorldRevision).toBe(baseline.sourceWorldRevision);
    const rebound = boot.forEquivalentSourceWorld(irrelevant.sourceWorld);
    expect(rebound.store).toBe(boot.store);
    expect(rebound.projects[0]?.inputGeneration).not.toBe(boot.projects[0]?.inputGeneration);

    const addedSource = await writeWorkspaceFile(
      workspaceRoot,
      'src/added.ts',
      'export const added = true;\n',
    );
    authority.advance([
      new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.StructuralMembership,
        addedSource,
      ),
    ]);
    const admitted = irrelevant.sourceWorld.resolveCurrent();
    expect(admitted.kind).toBe(SemanticSourceWorldCurrentnessKind.FreshBootRequired);
    expect(admitted.sourceWorld.projects[0]?.sourceFiles.map((source) => source.path))
      .toContain('src/added.ts');

    await rm(addedSource);
    authority.advance([
      new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.StructuralMembership,
        addedSource,
      ),
    ]);
    const removed = admitted.sourceWorld.resolveCurrent();
    expect(removed.kind).toBe(SemanticSourceWorldCurrentnessKind.FreshBootRequired);
    expect(removed.sourceWorld.sourceWorldRevision).toBe(baseline.sourceWorldRevision);

    await writeFile(sourceFile, 'export const value = 2;\n');
    authority.advance([
      new SemanticRuntimeProjectInputChange(SemanticRuntimeProjectInputChangeKind.FileValue, sourceFile),
    ]);
    const contentOnly = removed.sourceWorld.resolveCurrent();
    expect(contentOnly.kind).toBe(SemanticSourceWorldCurrentnessKind.Current);
    expect(contentOnly.sourceWorld).toBe(removed.sourceWorld);
  });

  test('treats effective native exclusions as semantic and formatting-only edits as equivalent', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    await writeWorkspaceFile(workspaceRoot, 'golden/output.ts', 'export const generated = true;\n');
    const authority = new SemanticRuntimeProjectInputAuthority();
    const baseline = resolveSemanticSourceWorld({
      rootDir: workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
      projectInputAuthority: authority,
    });
    expect(baseline.projects[0]?.sourceFiles.map((source) => source.path)).toContain('golden/output.ts');

    const configurationFile = await writeWorkspaceFile(
      workspaceRoot,
      'aurelia.project.json',
      '{"version":1,"authoredSources":{"excludedRoots":["golden"]}}',
    );
    authority.advance([
      new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.StructuralMembership,
        configurationFile,
      ),
    ]);
    const excluded = baseline.resolveCurrent();
    expect(excluded.kind).toBe(SemanticSourceWorldCurrentnessKind.FreshBootRequired);
    expect(excluded.sourceWorld.projects[0]?.effectiveExcludedSourceRootDirs)
      .toContain(path.join(workspaceRoot, 'golden'));
    expect(excluded.sourceWorld.projects[0]?.sourceFiles.map((source) => source.path))
      .not.toContain('golden/output.ts');

    await writeFile(configurationFile, `{
      // Equivalent policy, expressed as JSONC.
      "version": 1,
      "authoredSources": { "excludedRoots": ["golden",], },
    }`);
    authority.advance([
      new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.FileValue,
        configurationFile,
      ),
    ]);
    const reformatted = excluded.sourceWorld.resolveCurrent();
    expect(reformatted.kind).toBe(SemanticSourceWorldCurrentnessKind.EquivalentPlan);
    expect(reformatted.sourceWorld.sourceWorldRevision).toBe(excluded.sourceWorld.sourceWorldRevision);
  });

  test('treats an explicit project gaining an empty native configuration as an equivalent plan', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const authority = new SemanticRuntimeProjectInputAuthority();
    const baseline = resolveSemanticSourceWorld({
      rootDir: workspaceRoot,
      projects: [{
        rootDir: workspaceRoot,
        sourceFiles: [{ path: 'src/main.ts' }],
      }],
      projectInputAuthority: authority,
    });
    const boot = bootWorkspaceFromSourceWorld(baseline, 'source-world-empty-config-rebind');
    const absentConfiguration = baseline.projects[0]!.projectConfiguration;
    expect(absentConfiguration.applicationState).toBe('absent');

    const configurationFile = await writeWorkspaceFile(
      workspaceRoot,
      'aurelia.project.json',
      '{"version":1}',
    );
    authority.advance([
      new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.StructuralMembership,
        configurationFile,
      ),
    ]);
    const configured = baseline.resolveCurrent();
    const appliedConfiguration = configured.sourceWorld.projects[0]!.projectConfiguration;

    expect(configured.kind).toBe(SemanticSourceWorldCurrentnessKind.EquivalentPlan);
    expect(configured.sourceWorld.sourceWorldRevision).toBe(baseline.sourceWorldRevision);
    expect(appliedConfiguration.revision).not.toBe(absentConfiguration.revision);
    expect(appliedConfiguration).toMatchObject({
      exists: true,
      acceptedVersion: 1,
      applicationState: 'applied',
      excludedSourceRootDirs: [],
    });
    const rebound = boot.forEquivalentSourceWorld(configured.sourceWorld);
    expect(rebound.store).toBe(boot.store);
    expect(rebound.projects[0]?.projectConfiguration).toBe(appliedConfiguration);
  });

  test('rebinds finding policy and exact provenance without changing source-world topology', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const configurationFile = await writeWorkspaceFile(
      workspaceRoot,
      'aurelia.project.json',
      '{"version":1,"findings":{"aurelia.analysis.dynamic-registration-spread":"warning"}}',
    );
    const authority = new SemanticRuntimeProjectInputAuthority();
    const baseline = resolveSemanticSourceWorld({
      rootDir: workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
      projectInputAuthority: authority,
    });
    const boot = bootWorkspaceFromSourceWorld(baseline, 'source-world-finding-policy-rebind');
    const baselineConfiguration = baseline.projects[0]!.projectConfiguration;
    const baselinePolicy = resolveSemanticProjectFindingRulePolicy(
      baselineConfiguration.findingPolicy,
      SemanticProjectFindingRuleId.DynamicRegistrationSpread,
    );

    await writeFile(configurationFile, `{
      "version": 1,
      "findings": {
        "aurelia.analysis.dynamic-registration-spread": "warning"
      }
    }`);
    authority.advance([
      new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.FileValue,
        configurationFile,
      ),
    ]);
    const reformatted = baseline.resolveCurrent();
    const reformattedConfiguration = reformatted.sourceWorld.projects[0]!.projectConfiguration;
    const reformattedPolicy = resolveSemanticProjectFindingRulePolicy(
      reformattedConfiguration.findingPolicy,
      SemanticProjectFindingRuleId.DynamicRegistrationSpread,
    );

    expect(reformatted.kind).toBe(SemanticSourceWorldCurrentnessKind.EquivalentPlan);
    expect(reformatted.sourceWorld.sourceWorldRevision).toBe(baseline.sourceWorldRevision);
    expect(reformattedConfiguration.revision).not.toBe(baselineConfiguration.revision);
    expect(reformattedPolicy).toMatchObject({ disposition: 'warning', authority: 'project-configuration' });
    expect(reformattedPolicy.source?.start).not.toBe(baselinePolicy.source?.start);
    const rebound = boot.forEquivalentSourceWorld(reformatted.sourceWorld);
    expect(rebound.store).toBe(boot.store);
    expect(rebound.projects[0]?.projectConfiguration).toBe(reformattedConfiguration);

    await writeFile(configurationFile, '{"version":1,"findings":{"aurelia.analysis.dynamic-registration-spread":"off"}}');
    authority.advance([
      new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.FileValue,
        configurationFile,
      ),
    ]);
    const policyChanged = reformatted.sourceWorld.resolveCurrent();
    const changedConfiguration = policyChanged.sourceWorld.projects[0]!.projectConfiguration;

    expect(policyChanged.kind).toBe(SemanticSourceWorldCurrentnessKind.EquivalentPlan);
    expect(policyChanged.sourceWorld.sourceWorldRevision).toBe(baseline.sourceWorldRevision);
    expect(resolveSemanticProjectFindingRulePolicy(
      changedConfiguration.findingPolicy,
      SemanticProjectFindingRuleId.DynamicRegistrationSpread,
    )).toMatchObject({ disposition: 'off', authority: 'project-configuration' });
    const policyRebound = rebound.forEquivalentSourceWorld(policyChanged.sourceWorld);
    expect(policyRebound.store).toBe(boot.store);
    expect(policyRebound.projects[0]?.projectConfiguration).toBe(changedConfiguration);
  });

  test('rebinds rejected configuration as applied when host exclusions keep topology unchanged', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    await writeWorkspaceFile(workspaceRoot, 'golden/output.ts', 'export const generated = true;\n');
    const configurationFile = await writeWorkspaceFile(
      workspaceRoot,
      'aurelia.project.json',
      '{"version":2,"authoredSources":{"excludedRoots":["golden"]}}',
    );
    const authority = new SemanticRuntimeProjectInputAuthority();
    const baseline = resolveSemanticSourceWorld({
      rootDir: workspaceRoot,
      projects: [{ rootDir: workspaceRoot, excludedSourceRoots: ['golden'] }],
      projectInputAuthority: authority,
    });
    const boot = bootWorkspaceFromSourceWorld(baseline, 'source-world-masked-config-rebind');
    const rejectedConfiguration = baseline.projects[0]!.projectConfiguration;
    expect(rejectedConfiguration).toMatchObject({
      acceptedVersion: null,
      applicationState: 'rejected',
      excludedSourceRootDirs: [],
    });

    await writeFile(
      configurationFile,
      '{"version":1,"authoredSources":{"excludedRoots":["golden"]}}',
    );
    authority.advance([
      new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.FileValue,
        configurationFile,
      ),
    ]);
    const applied = baseline.resolveCurrent();
    const appliedConfiguration = applied.sourceWorld.projects[0]!.projectConfiguration;

    expect(applied.kind).toBe(SemanticSourceWorldCurrentnessKind.EquivalentPlan);
    expect(applied.sourceWorld.sourceWorldRevision).toBe(baseline.sourceWorldRevision);
    expect(appliedConfiguration.revision).not.toBe(rejectedConfiguration.revision);
    expect(appliedConfiguration).toMatchObject({
      acceptedVersion: 1,
      applicationState: 'applied',
      diagnostics: [],
    });
    expect(appliedConfiguration.excludedSourceRootDirs).toEqual([path.join(workspaceRoot, 'golden')]);
    const rebound = boot.forEquivalentSourceWorld(applied.sourceWorld);
    expect(rebound.store).toBe(boot.store);
    expect(rebound.projects[0]?.projectConfiguration).toBe(appliedConfiguration);
  });

  test('leaves tsconfig-only changes to project and answer currentness', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const tsconfigFile = await writeWorkspaceFile(
      workspaceRoot,
      'tsconfig.json',
      '{"compilerOptions":{"strict":false}}',
    );
    const authority = new SemanticRuntimeProjectInputAuthority(undefined, {
      authorityForRead: () => ({ mode: SemanticRuntimeProjectInputCurrentnessMode.PushObserved }),
    });
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      storeKey: 'source-world-tsconfig-currentness',
      projects: [{ rootDir: workspaceRoot }],
      projectInputAuthority: authority,
    });
    const sourceWorld = runtime.workspace.sourceWorld;
    const firstProject = runtime.workspace.projects[0]!;
    const firstAnswerBasis = (await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.TypeScriptDiagnostics,
      projectKey: firstProject.projectKey,
    })).analysisBasis!;
    expect(firstProject.compilerOptions.options.strict).toBe(false);

    await writeFile(tsconfigFile, '{"compilerOptions":{"strict":true}}');
    authority.advance([
      new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.FileValue,
        tsconfigFile,
      ),
    ]);

    const sourceAdmissionCurrentness = sourceWorld.resolveCurrent();
    expect(sourceAdmissionCurrentness.kind).toBe(SemanticSourceWorldCurrentnessKind.Current);
    const nextGeneration = authority.capture(firstProject);
    const nextProject = firstProject.forInputGeneration(nextGeneration);
    const nextAnswerBasis = (await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.TypeScriptDiagnostics,
      projectKey: firstProject.projectKey,
    })).analysisBasis!;
    expect(nextProject.inputGeneration).not.toBe(firstProject.inputGeneration);
    expect(nextProject.compilerOptions.options.strict).toBe(true);
    expect(nextAnswerBasis.revision).not.toBe(firstAnswerBasis.revision);
  });

  test('keeps revisions portable across store namespaces and pull/push currentness policy', async () => {
    const workspaceRoot = await createWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export const main = true;\n');
    const pullAuthority = new SemanticRuntimeProjectInputAuthority();
    const pushAuthority = new SemanticRuntimeProjectInputAuthority(undefined, {
      authorityForRead: () => ({ mode: SemanticRuntimeProjectInputCurrentnessMode.PushObserved }),
    });
    const options = {
      rootDir: workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
    } as const;
    const pulled = resolveSemanticSourceWorld({ ...options, projectInputAuthority: pullAuthority });
    const pushed = resolveSemanticSourceWorld({ ...options, projectInputAuthority: pushAuthority });
    expect(pushed.sourceWorldRevision).toBe(pulled.sourceWorldRevision);

    const firstBoot = bootWorkspaceFromSourceWorld(pulled, 'consumer-one');
    const secondBoot = bootWorkspaceFromSourceWorld(pushed, 'consumer-two');
    expect(firstBoot.workspaceKey).not.toBe(secondBoot.workspaceKey);
    expect(firstBoot.semanticWorkspaceKey).toBe(secondBoot.semanticWorkspaceKey);
    expect(firstBoot.semanticWorkspaceKey).toMatch(/^semantic-workspace:[A-Za-z0-9_-]{43}$/);
    expect(firstBoot.semanticWorkspaceKey).not.toBe(pulled.descriptorKey);
    expect(firstBoot.sourceWorld.sourceWorldRevision).toBe(secondBoot.sourceWorld.sourceWorldRevision);
    expect(() => firstBoot.forEquivalentSourceWorld(pushed)).toThrow(/another project-input authority/);

    const addedSource = await writeWorkspaceFile(
      workspaceRoot,
      'src/added.ts',
      'export const added = true;\n',
    );
    pushAuthority.advance([
      new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.StructuralMembership,
        addedSource,
      ),
    ]);
    const pullChanged = pulled.resolveCurrent();
    const pushChanged = pushed.resolveCurrent();
    expect(pullChanged.kind).toBe(SemanticSourceWorldCurrentnessKind.FreshBootRequired);
    expect(pushChanged.kind).toBe(SemanticSourceWorldCurrentnessKind.FreshBootRequired);
    expect(pushChanged.sourceWorld.sourceWorldRevision).toBe(pullChanged.sourceWorld.sourceWorldRevision);
  });

  test('rejects a relevant event raised by a later exact-read validation callback', async () => {
    const workspaceRoot = await createWorkspace();
    const pushFile = await writeWorkspaceFile(workspaceRoot, 'a-push.ts', 'export const pushed = true;\n');
    const pullFile = await writeWorkspaceFile(workspaceRoot, 'z-pull.ts', 'export const pulled = true;\n');
    const authority = new SemanticRuntimeProjectInputAuthority(undefined, {
      authorityForRead: (descriptor) =>
        descriptor.kind === SemanticRuntimeProjectInputReadKind.FileContent
          && path.normalize(descriptor.fileName).toLowerCase() === path.normalize(pushFile).toLowerCase()
          ? { mode: SemanticRuntimeProjectInputCurrentnessMode.PushObserved }
          : null,
    });
    const pushRead = authority.captureExactFileContentRead(pushFile);
    const pullRead = authority.captureExactFileContentRead(pullFile);
    expect(pushRead.currentnessAuthority.mode).toBe(SemanticRuntimeProjectInputCurrentnessMode.PushObserved);
    const receipt = new SemanticSourceWorldInputReceipt(authority, [pushRead, pullRead]);
    expect(receipt.reads.map((read) => read.readKey)).toEqual([pushRead.readKey, pullRead.readKey]);
    const validatePull = pullRead.validateObservedValue.bind(pullRead);
    vi.spyOn(pullRead, 'validateObservedValue').mockImplementation(() => {
      const validation = validatePull();
      authority.advance([
        new SemanticRuntimeProjectInputChange(
          SemanticRuntimeProjectInputChangeKind.FileValue,
          pushFile,
        ),
      ]);
      return validation;
    });

    expect(receipt.validate()).toMatchObject({
      isCurrent: false,
      changedReadKeys: [pushRead.readKey],
      changedFacets: [SemanticRuntimeProjectInputReadKind.FileContent],
    });
  });
});

async function createWorkspace(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'aurelia-source-world-'));
  temporaryRoots.push(root);
  return root;
}

async function writeWorkspaceFile(rootDir: string, relativePath: string, text: string): Promise<string> {
  const fileName = path.join(rootDir, relativePath);
  await mkdir(path.dirname(fileName), { recursive: true });
  await writeFile(fileName, text);
  return fileName;
}

function projectForRoot(
  sourceWorld: ReturnType<typeof resolveSemanticSourceWorld>,
  rootDir: string,
) {
  const normalized = path.normalize(rootDir);
  const project = sourceWorld.projects.find((candidate) => path.normalize(candidate.rootDir) === normalized);
  if (project == null) {
    throw new Error(`Expected source-world project '${normalized}'.`);
  }
  return project;
}
