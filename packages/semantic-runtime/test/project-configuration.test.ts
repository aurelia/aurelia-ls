import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import {
  AURELIA_PROJECT_CONFIGURATION_CATALOG,
  AURELIA_PROJECT_CONFIGURATION_SUPPORTED_VERSIONS,
  AURELIA_PROJECT_CONFIGURATION_VERSION,
  createSemanticRuntime,
  SEMANTIC_PROJECT_FINDING_DISPOSITIONS,
  SEMANTIC_PROJECT_FINDING_RULE_IDS,
  NodeSemanticRuntimeProjectInputHost,
  resolveSemanticProjectFindingRulePolicy,
  SemanticAppQueryKind,
  SemanticProjectConfigurationApplicationState,
  SemanticProjectFindingRuleId,
  SemanticRuntimeProjectInputAuthority,
  SemanticRuntimeProjectInputReadKind,
  type SemanticRuntimeProjectInputHost,
} from '../src/index.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

describe('native project configuration', () => {
  test('retains an exact negative config read when the file is absent', async () => {
    const workspaceRoot = await createProjectWorkspace();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
    });

    const project = runtime.workspace.projects[0]!;
    expect(project.projectConfiguration.exists).toBe(false);
    expect(project.projectConfiguration.acceptedVersion).toBeNull();
    expect(project.projectConfiguration.applicationState)
      .toBe(SemanticProjectConfigurationApplicationState.Absent);
    expect(project.projectConfiguration.diagnostics).toEqual([]);
    expect(project.projectConfiguration.excludedSourceRootDirs).toEqual([]);
    expect(project.projectConfiguration.effectiveFindingPolicies).toEqual([{
      ruleId: SemanticProjectFindingRuleId.DynamicRegistrationSpread,
      disposition: 'information',
      authority: 'default',
      source: null,
    }]);
    expect(project.projectConfiguration.readRegisteredInputs()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: SemanticRuntimeProjectInputReadKind.FileExistence,
        observedRevision: 'absent',
      }),
      expect.objectContaining({
        kind: SemanticRuntimeProjectInputReadKind.FileContent,
        observedRevision: 'absent',
      }),
    ]));
    expect(project.projectConfiguration.readRegisteredInputs()).toHaveLength(2);
    const summary = runtime.summary({ projectPage: { size: 0 } });
    expect(summary.value.nativeProjectConfigurationCount).toBe(0);
    expect(summary.value.nativeProjectConfigurationDiagnosticCount).toBe(0);
    expect(summary.value.projects).toEqual([]);
    const limitationContinuation = summary.continuations?.find((row) =>
      row.targetQueryKind === SemanticAppQueryKind.AnalysisLimitations
    );
    expect(limitationContinuation?.targetQuery).toMatchObject({
      kind: SemanticAppQueryKind.AnalysisLimitations,
      page: { size: 0 },
    });
    expect(summary.continuations?.some((row) =>
      row.targetQueryKind === SemanticAppQueryKind.OpenSeamSummary
    )).toBe(false);
    expect(runtime.nativeProjectConfigurations().value.rows).toEqual([]);
  });

  test.each(AURELIA_PROJECT_CONFIGURATION_SUPPORTED_VERSIONS)(
    'accepts version %s without finding overrides and resolves the deterministic rule default',
    async (version) => {
      const workspaceRoot = await createProjectWorkspace();
      await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', JSON.stringify({ version }));
      const runtime = await createSemanticRuntime({
        workspaceRoot,
        projects: [{ rootDir: workspaceRoot }],
      });
      const policy = runtime.workspace.projects[0]!.projectConfiguration.findingPolicy;
      const configuration = runtime.workspace.projects[0]!.projectConfiguration;

      expect(configuration.acceptedVersion).toBe(version);
      expect(configuration.applicationState).toBe(SemanticProjectConfigurationApplicationState.Applied);
      expect(policy.rules).toEqual([]);
      expect(resolveSemanticProjectFindingRulePolicy(
        policy,
        SemanticProjectFindingRuleId.DynamicRegistrationSpread,
      )).toEqual({
        ruleId: 'aurelia.analysis.dynamic-registration-spread',
        disposition: 'information',
        authority: 'default',
        source: null,
      });
    },
  );

  test.each(SEMANTIC_PROJECT_FINDING_DISPOSITIONS)(
    'accepts the V1 dynamic-registration-spread disposition %s with an exact immutable config trace',
    async (disposition) => {
      const workspaceRoot = await createProjectWorkspace();
      const configText = `{\r\n  "version": 1,\r\n  "findings": {\r\n    "aurelia.analysis.dynamic-registration-spread": "${disposition}"\r\n  }\r\n}`;
      await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', configText);
      const runtime = await createSemanticRuntime({
        workspaceRoot,
        projects: [{ rootDir: workspaceRoot }],
      });
      const policy = runtime.workspace.projects[0]!.projectConfiguration.findingPolicy;
      const effective = resolveSemanticProjectFindingRulePolicy(
        policy,
        SemanticProjectFindingRuleId.DynamicRegistrationSpread,
      );

      expect(runtime.workspace.projects[0]!.projectConfiguration.diagnostics).toEqual([]);
      expect(Object.isFrozen(policy)).toBe(true);
      expect(Object.isFrozen(policy.rules)).toBe(true);
      expect(Object.isFrozen(policy.rules[0])).toBe(true);
      expect(effective).toMatchObject({
        ruleId: 'aurelia.analysis.dynamic-registration-spread',
        disposition,
        authority: 'project-configuration',
      });
      expect(effective.source).not.toBeNull();
      expect(configText.slice(effective.source!.start, effective.source!.end)).toBe(`"${disposition}"`);
      expect(effective.source!.startPosition).toEqual({ line: 3, character: 52 });
      expect(effective.source!.filePath).toBe(
        path.join(workspaceRoot, 'aurelia.project.json').replace(/\\/g, '/'),
      );
    },
  );

  test.each([
    ['an unknown disposition', '"fatal"'],
    ['a non-string disposition', 'true'],
  ])('isolates %s to its known rule and keeps valid authored-source policy applied', async (_label, valueSource) => {
    const workspaceRoot = await createProjectWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'golden/output.ts', 'export const output = true;\n');
    const configText = `{"version":1,"authoredSources":{"excludedRoots":["golden"]},"findings":{"aurelia.analysis.dynamic-registration-spread":${valueSource}}}`;
    await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', configText);
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
    });
    const project = runtime.workspace.projects[0]!;

    expect(project.projectConfiguration.diagnostics).toHaveLength(1);
    expect(project.projectConfiguration.acceptedVersion).toBe(1);
    expect(project.projectConfiguration.applicationState).toBe(SemanticProjectConfigurationApplicationState.Partial);
    expect(project.projectConfiguration.diagnostics[0]?.diagnosticKind)
      .toBe('aurelia-project-config-invalid-finding-rule-disposition');
    expect(project.projectConfiguration.findingPolicy.rules).toEqual([]);
    expect(project.sourceFiles.some((source) => source.path === 'golden/output.ts')).toBe(false);
    expect(resolveSemanticProjectFindingRulePolicy(
      project.projectConfiguration.findingPolicy,
      SemanticProjectFindingRuleId.DynamicRegistrationSpread,
    ).authority).toBe('default');
    expect(runtime.nativeProjectConfigurations().value.rows).toEqual([expect.objectContaining({
      acceptedVersion: 1,
      applicationState: 'partial',
      appliedExcludedSourceRootDirs: [path.resolve(workspaceRoot, 'golden')],
      effectiveFindingPolicies: [{
        ruleId: SemanticProjectFindingRuleId.DynamicRegistrationSpread,
        disposition: 'information',
        authority: 'default',
        source: null,
      }],
      diagnosticCount: 1,
    })]);
  });

  test('warns and ignores a future namespaced finding while applying known findings and authored sources', async () => {
    const workspaceRoot = await createProjectWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'golden/output.ts', 'export const output = true;\n');
    const configText = JSON.stringify({
      version: 1,
      authoredSources: { excludedRoots: ['golden'] },
      findings: {
        'vendor.analysis.future-rule': 'error',
        'aurelia.analysis.dynamic-registration-spread': 'warning',
      },
    });
    await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', configText);
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
    });
    const project = runtime.workspace.projects[0]!;

    expect(project.projectConfiguration.diagnostics).toEqual([
      expect.objectContaining({
        diagnosticKind: 'aurelia-project-config-unknown-finding-rule',
        severity: 'warning',
      }),
    ]);
    expect(project.projectConfiguration.applicationState).toBe(SemanticProjectConfigurationApplicationState.Partial);
    expect(project.sourceFiles.some((source) => source.path === 'golden/output.ts')).toBe(false);
    expect(resolveSemanticProjectFindingRulePolicy(
      project.projectConfiguration.findingPolicy,
      SemanticProjectFindingRuleId.DynamicRegistrationSpread,
    )).toMatchObject({ disposition: 'warning', authority: 'project-configuration' });
  });

  test.each([
    [
      'a duplicate rule ID',
      '{"version":1,"authoredSources":{"excludedRoots":["golden"]},"findings":{"aurelia.analysis.dynamic-registration-spread":"warning","aurelia.analysis.dynamic-registration-spread":"off"}}',
      'aurelia-project-config-duplicate-property',
    ],
    [
      'a non-object findings container',
      '{"version":1,"authoredSources":{"excludedRoots":["golden"]},"findings":[]}',
      'aurelia-project-config-invalid-findings',
    ],
    [
      'a malformed rule ID',
      '{"version":1,"authoredSources":{"excludedRoots":["golden"]},"findings":{"not-namespaced":"warning"}}',
      'aurelia-project-config-invalid-finding-rule-id',
    ],
  ])('isolates %s to findings and keeps valid authored-source policy applied', async (
    _label,
    configText,
    diagnosticKind,
  ) => {
    const workspaceRoot = await createProjectWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'golden/output.ts', 'export const output = true;\n');
    await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', configText);
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
    });
    const project = runtime.workspace.projects[0]!;

    expect(project.projectConfiguration.diagnostics.some((diagnostic) => diagnostic.diagnosticKind === diagnosticKind))
      .toBe(true);
    expect(project.projectConfiguration.applicationState).toBe(SemanticProjectConfigurationApplicationState.Partial);
    expect(project.projectConfiguration.findingPolicy.rules).toEqual([]);
    expect(project.projectConfiguration.excludedSourceRootDirs.map((root) => path.relative(workspaceRoot, root)))
      .toEqual(['golden']);
    expect(project.sourceFiles.some((source) => source.path === 'golden/output.ts')).toBe(false);
  });

  test('validates a future finding disposition without discarding known siblings', async () => {
    const workspaceRoot = await createProjectWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', JSON.stringify({
      version: 1,
      findings: {
        'vendor.analysis.future-rule': 'fatal',
        'aurelia.analysis.dynamic-registration-spread': 'error',
      },
    }));
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
    });
    const project = runtime.workspace.projects[0]!;

    expect(project.projectConfiguration.diagnostics.map((diagnostic) => [
      diagnostic.diagnosticKind,
      diagnostic.severity,
    ])).toEqual([
      ['aurelia-project-config-unknown-finding-rule', 'warning'],
      ['aurelia-project-config-invalid-finding-rule-disposition', 'error'],
    ]);
    expect(resolveSemanticProjectFindingRulePolicy(
      project.projectConfiguration.findingPolicy,
      SemanticProjectFindingRuleId.DynamicRegistrationSpread,
    )).toMatchObject({ disposition: 'error', authority: 'project-configuration' });
  });

  test('ignores duplicate future finding declarations without discarding known siblings', async () => {
    const workspaceRoot = await createProjectWorkspace();
    const configText = '{"version":1,"findings":{"vendor.analysis.future-rule":"warning",'
      + '"vendor.analysis.future-rule":"off","aurelia.analysis.dynamic-registration-spread":"error"}}';
    await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', configText);
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
    });
    const project = runtime.workspace.projects[0]!;

    expect(project.projectConfiguration.diagnostics).toEqual([
      expect.objectContaining({
        diagnosticKind: 'aurelia-project-config-duplicate-property',
        severity: 'error',
      }),
    ]);
    expect(resolveSemanticProjectFindingRulePolicy(
      project.projectConfiguration.findingPolicy,
      SemanticProjectFindingRuleId.DynamicRegistrationSpread,
    )).toMatchObject({ disposition: 'error', authority: 'project-configuration' });
  });

  test.each([
    [
      'a non-object authoredSources section',
      '[]',
      'aurelia-project-config-invalid-authored-sources',
    ],
    [
      'an unknown authoredSources field',
      '{"future":true}',
      'aurelia-project-config-unknown-property',
    ],
    [
      'duplicate excludedRoots fields',
      '{"excludedRoots":["golden"],"excludedRoots":["other"]}',
      'aurelia-project-config-duplicate-property',
    ],
    [
      'a malformed excludedRoots field',
      '{"excludedRoots":true}',
      'aurelia-project-config-invalid-excluded-roots',
    ],
  ])('isolates %s and keeps valid finding policy applied', async (_label, authoredSources, diagnosticKind) => {
    const workspaceRoot = await createProjectWorkspace();
    const configText = `{"version":1,"authoredSources":${authoredSources},"findings":{"aurelia.analysis.dynamic-registration-spread":"warning"}}`;
    await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', configText);
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
    });
    const project = runtime.workspace.projects[0]!;

    expect(project.projectConfiguration.diagnostics).toEqual([
      expect.objectContaining({ diagnosticKind, severity: 'error' }),
    ]);
    expect(project.projectConfiguration.excludedSourceRootDirs).toEqual([]);
    expect(resolveSemanticProjectFindingRulePolicy(
      project.projectConfiguration.findingPolicy,
      SemanticProjectFindingRuleId.DynamicRegistrationSpread,
    )).toMatchObject({ disposition: 'warning', authority: 'project-configuration' });
  });

  test('keeps parser vocabulary and the canonical schema packaged for VS Code in exact parity', async () => {
    const schema = JSON.parse(
      await readFile(new URL('../schema/aurelia.project.schema.json', import.meta.url), 'utf8'),
    ) as AureliaProjectConfigurationSchema;

    expect(AURELIA_PROJECT_CONFIGURATION_VERSION).toBe(1);
    expect(AURELIA_PROJECT_CONFIGURATION_SUPPORTED_VERSIONS).toEqual([1]);
    expect(schema.required).toEqual(['version']);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.version.const).toBe(AURELIA_PROJECT_CONFIGURATION_CATALOG.version);
    expect(Object.keys(schema.properties)).toEqual([...AURELIA_PROJECT_CONFIGURATION_CATALOG.fields.root]);
    expect(Object.keys(schema.properties.authoredSources.properties))
      .toEqual([...AURELIA_PROJECT_CONFIGURATION_CATALOG.fields.authoredSources]);
    expect(schema.properties.authoredSources.additionalProperties).toBe(false);
    expect(Object.keys(schema.properties.findings.properties)).toEqual([...SEMANTIC_PROJECT_FINDING_RULE_IDS]);
    expect(schema.$defs.findingDisposition.enum).toEqual([...SEMANTIC_PROJECT_FINDING_DISPOSITIONS]);
    expect(schema.properties.findings.additionalProperties).toBe(false);
    expect(Object.keys(schema.properties.findings.patternProperties))
      .toEqual([AURELIA_PROJECT_CONFIGURATION_CATALOG.findings.futureRuleIdPattern]);
    expect(schema.$defs.findingDisposition.type).toBe('string');
    const futureRuleIdPattern = new RegExp(
      AURELIA_PROJECT_CONFIGURATION_CATALOG.findings.futureRuleIdPattern,
      'u',
    );
    for (const ruleId of SEMANTIC_PROJECT_FINDING_RULE_IDS) {
      expect(futureRuleIdPattern.test(ruleId)).toBe(true);
      expect(schema.properties.findings.properties[ruleId]?.default)
        .toBe(AURELIA_PROJECT_CONFIGURATION_CATALOG.findings.defaults[ruleId]);
    }
    // This checked-in schema is the canonical byte/parity artifact. Editor association and delivery are separate.
  });

  test('composes JSONC exclusions into discovery and TypeScript roots while keeping dependency reads available', async () => {
    const workspaceRoot = await createProjectWorkspace();
    const generatedFile = await writeWorkspaceFile(workspaceRoot, 'golden/dependency.ts', 'export const dependency = 1;\n');
    await writeWorkspaceFile(
      workspaceRoot,
      'src/main.ts',
      "import { dependency } from '../golden/dependency.js';\nexport const value = dependency;\n",
    );
    await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', `{
      // Generated verification output is readable but is not authored project source.
      "version": 1,
      "authoredSources": {
        "excludedRoots": ["golden", "future-output",],
      },
    }`);

    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
    });
    const project = runtime.workspace.projects[0]!;

    expect(project.projectConfiguration.diagnostics).toEqual([]);
    const summary = runtime.summary({ projectPage: { size: 1 } });
    expect(summary.value.nativeProjectConfigurationCount).toBe(1);
    expect(summary.value.nativeProjectConfigurationDiagnosticCount).toBe(0);
    expect(summary.value.projects[0]?.nativeProjectConfiguration).toEqual({
      filePath: path.join(workspaceRoot, 'aurelia.project.json').replace(/\\/g, '/'),
      diagnosticCount: 0,
    });
    expect(runtime.nativeProjectConfigurations().value.rows).toEqual([{
      projectKey: project.projectKey,
      projectRootDir: workspaceRoot,
      filePath: path.join(workspaceRoot, 'aurelia.project.json').replace(/\\/g, '/'),
      acceptedVersion: 1,
      applicationState: 'applied',
      appliedExcludedSourceRootDirs: [
        path.join(workspaceRoot, 'golden'),
        path.join(workspaceRoot, 'future-output'),
      ].map((entry) => path.resolve(entry)),
      effectiveFindingPolicies: [{
        ruleId: SemanticProjectFindingRuleId.DynamicRegistrationSpread,
        disposition: 'information',
        authority: 'default',
        source: null,
      }],
      diagnosticCount: 0,
    }]);
    expect(project.authoredSources.contains(generatedFile)).toBe(false);
    expect(project.sourceFiles.some((source) => source.path === 'golden/dependency.ts')).toBe(false);
    expect(project.compilerOptions.rootFileNames).not.toContain(generatedFile);
    expect(project.inputGeneration.host.readFile(generatedFile)).toBe('export const dependency = 1;\n');
    expect(runtime.authoredSourceOwnership({ sourceFilePath: generatedFile }).value.owners).toEqual([]);
    expect(runtime.authoredSourceOwnership({ sourceFilePath: path.join(workspaceRoot, 'src/main.ts') }).value.owners)
      .toEqual([expect.objectContaining({ projectKey: project.projectKey, projectPath: 'src/main.ts' })]);
    expect(project.projectConfiguration.excludedSourceRootDirs.map((entry) => path.relative(workspaceRoot, entry))).toEqual([
      'golden',
      'future-output',
    ]);
  });

  test('filters excluded sources from an explicit host source list', async () => {
    const workspaceRoot = await createProjectWorkspace();
    const generatedFile = await writeWorkspaceFile(workspaceRoot, 'golden/output.ts', 'export const output = true;\n');
    await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', JSON.stringify({
      version: 1,
      authoredSources: { excludedRoots: ['golden'] },
    }));

    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{
        rootDir: workspaceRoot,
        sourceFiles: [
          { path: 'src/main.ts' },
          { path: 'golden/output.ts' },
        ],
      }],
    });
    const project = runtime.workspace.projects[0]!;

    expect(project.sourceFiles.map((source) => source.path)).toEqual(['src/main.ts']);
    expect(project.compilerOptions.rootFileNames).not.toContain(generatedFile);
    expect(runtime.authoredSourceOwnership({ sourceFilePath: generatedFile }).value.owners).toEqual([]);
  });

  test('fails the whole native file open when its shape is unknown and reports the exact property span', async () => {
    const workspaceRoot = await createProjectWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'golden/output.ts', 'export const output = true;\n');
    const configText = '{"version":1,"unknown":true,"authoredSources":{"excludedRoots":["golden"]}}';
    await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', configText);

    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
    });
    const project = runtime.workspace.projects[0]!;
    const diagnostic = project.projectConfiguration.diagnostics[0]!;

    expect(project.projectConfiguration.acceptedVersion).toBe(1);
    expect(project.projectConfiguration.applicationState).toBe(SemanticProjectConfigurationApplicationState.Rejected);
    expect(project.projectConfiguration.excludedSourceRootDirs).toEqual([]);
    expect(project.sourceFiles.some((source) => source.path === 'golden/output.ts')).toBe(true);
    expect(diagnostic.diagnosticKind).toBe('aurelia-project-config-unknown-property');
    expect(configText.slice(diagnostic.source.start, diagnostic.source.end)).toBe('"unknown"');
    expect(diagnostic.source.startPosition).toEqual({ line: 0, character: configText.indexOf('"unknown"') });
    expect(runtime.projectConfigurationDiagnostics({
      sourceFilePaths: [path.join(workspaceRoot, 'aurelia.project.json')],
    }).value.rows).toEqual([diagnostic]);
    expect(runtime.nativeProjectConfigurations().value.rows).toEqual([expect.objectContaining({
      acceptedVersion: 1,
      applicationState: 'rejected',
      appliedExcludedSourceRootDirs: [],
      effectiveFindingPolicies: [{
        ruleId: SemanticProjectFindingRuleId.DynamicRegistrationSpread,
        disposition: 'information',
        authority: 'default',
        source: null,
      }],
      diagnosticCount: 1,
    })]);
  });

  test('normalizes escaped property identities and reports duplicate fields at their exact CRLF location', async () => {
    const workspaceRoot = await createProjectWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'golden/output.ts', 'export const output = true;\n');
    const configText = '{\r\n  "ver\\u0073ion": 1,\r\n  "version": 2,\r\n  "authoredSources": { "excludedRoots": ["golden"] }\r\n}';
    await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', configText);

    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
    });
    const project = runtime.workspace.projects[0]!;
    const diagnostic = project.projectConfiguration.diagnostics.find((row) =>
      row.diagnosticKind === 'aurelia-project-config-duplicate-property'
    )!;

    expect(project.projectConfiguration).toMatchObject({
      acceptedVersion: null,
      applicationState: SemanticProjectConfigurationApplicationState.Rejected,
      excludedSourceRootDirs: [],
    });
    expect(project.sourceFiles.some((source) => source.path === 'golden/output.ts')).toBe(true);
    expect(configText.slice(diagnostic.source.start, diagnostic.source.end)).toBe('"version"');
    expect(diagnostic.source.startPosition).toEqual({ line: 2, character: 2 });
    expect(diagnostic.source.endPosition).toEqual({ line: 2, character: 11 });
  });

  test('rejects malformed roots individually while applying valid roots', async () => {
    const workspaceRoot = await createProjectWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'golden/output.ts', 'export const output = true;\n');
    await writeWorkspaceFile(workspaceRoot, 'kept/source.ts', 'export const kept = true;\n');
    await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', JSON.stringify({
      version: 1,
      authoredSources: {
        excludedRoots: ['../outside', 'bad/**', 42, 'golden'],
      },
    }));

    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
    });
    const project = runtime.workspace.projects[0]!;

    expect(project.projectConfiguration.diagnostics).toHaveLength(3);
    expect(project.projectConfiguration.applicationState).toBe(SemanticProjectConfigurationApplicationState.Partial);
    expect(new Set(project.projectConfiguration.diagnostics.map((row) => row.diagnosticKind))).toEqual(
      new Set(['aurelia-project-config-invalid-excluded-root']),
    );
    expect(project.sourceFiles.some((source) => source.path === 'golden/output.ts')).toBe(false);
    expect(project.sourceFiles.some((source) => source.path === 'kept/source.ts')).toBe(true);
  });

  test('rejects existing files and repeated separators while retaining an absent future directory root', async () => {
    const workspaceRoot = await createProjectWorkspace();
    const invalidRoots = [
      'src/main.ts',
      'generated//nested',
      String.raw`generated\\nested`,
      String.raw`generated/\nested`,
    ];
    await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', JSON.stringify({
      version: 1,
      authoredSources: {
        excludedRoots: [...invalidRoots, 'future-output'],
      },
    }));

    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
    });
    const project = runtime.workspace.projects[0]!;
    const diagnostics = project.projectConfiguration.diagnostics;

    expect(diagnostics).toHaveLength(invalidRoots.length);
    expect(diagnostics.every((row) => row.diagnosticKind === 'aurelia-project-config-invalid-excluded-root'))
      .toBe(true);
    expect(diagnostics.some((row) => row.message.includes('names an existing file'))).toBe(true);
    expect(diagnostics.filter((row) => row.message.includes('empty, current-directory, or parent-directory segments')))
      .toHaveLength(3);
    expect(project.projectConfiguration.excludedSourceRootDirs.map((entry) => path.relative(workspaceRoot, entry)))
      .toEqual(['future-output']);
    expect(project.sourceFiles.some((source) => source.path === 'src/main.ts')).toBe(true);

    const configReads = project.projectConfiguration.readRegisteredInputs();
    expect(configReads.filter((read) => read.kind === SemanticRuntimeProjectInputReadKind.DirectoryExistence))
      .toHaveLength(2);
    expect(configReads.filter((read) => read.kind === SemanticRuntimeProjectInputReadKind.FileExistence))
      .toHaveLength(3);
  });

  test('fails open on unsupported versions and syntax errors', async () => {
    const workspaceRoot = await createProjectWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'golden/output.ts', 'export const output = true;\n');
    const configFile = await writeWorkspaceFile(
      workspaceRoot,
      'aurelia.project.json',
      '{"version":2,"authoredSources":{"excludedRoots":["golden"]}}',
    );

    let runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
    });
    expect(runtime.workspace.projects[0]!.projectConfiguration.diagnostics[0]?.diagnosticKind)
      .toBe('aurelia-project-config-unsupported-version');
    expect(runtime.workspace.projects[0]!.projectConfiguration).toMatchObject({
      acceptedVersion: null,
      applicationState: SemanticProjectConfigurationApplicationState.Rejected,
    });
    expect(runtime.workspace.projects[0]!.sourceFiles.some((source) => source.path === 'golden/output.ts')).toBe(true);

    await writeFile(configFile, '{"version":1,,}', 'utf8');
    runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
    });
    expect(runtime.workspace.projects[0]!.projectConfiguration.diagnostics[0]?.diagnosticKind)
      .toBe('aurelia-project-config-syntax');
    expect(runtime.workspace.projects[0]!.sourceFiles.some((source) => source.path === 'golden/output.ts')).toBe(true);
  });

  test.each([
    ['hexadecimal numbers', '{"version":0x1}'],
    ['TypeScript-only string escapes', String.raw`{"version":1,"authoredSources":{"excludedRoots":["\x67olden"]}}`],
    ['unquoted properties', '{version:1}'],
    ['unary plus', '{"version":+1}'],
  ])('rejects %s outside the JSONC dialect', async (_label, configText) => {
    const workspaceRoot = await createProjectWorkspace();
    await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', configText);
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
    });

    expect(runtime.workspace.projects[0]!.projectConfiguration.diagnostics[0]?.diagnosticKind)
      .toBe('aurelia-project-config-syntax');
    expect(runtime.workspace.projects[0]!.projectConfiguration.excludedSourceRootDirs).toEqual([]);
  });

  test('reports a present configuration that the project-input host cannot read', async () => {
    const workspaceRoot = await createProjectWorkspace();
    const configFile = await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', '{"version":1}');
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
      projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new UnreadableConfigHost(configFile)),
    });

    expect(runtime.workspace.projects[0]!.projectConfiguration).toMatchObject({
      exists: true,
      acceptedVersion: null,
      applicationState: SemanticProjectConfigurationApplicationState.Rejected,
      excludedSourceRootDirs: [],
      diagnostics: [{
        diagnosticKind: 'aurelia-project-config-unreadable',
        source: { start: 0, end: 0 },
      }],
    });
    expect(runtime.nativeProjectConfigurations().value.rows).toEqual([
      expect.objectContaining({
        filePath: configFile.replace(/\\/g, '/'),
        diagnosticCount: 1,
      }),
    ]);
  });

  test('rebases equivalent configuration text but refuses changed authored membership', async () => {
    const workspaceRoot = await createProjectWorkspace();
    const configFile = await writeWorkspaceFile(
      workspaceRoot,
      'aurelia.project.json',
      '{"version":1,"authoredSources":{"excludedRoots":["golden"]}}',
    );
    const authority = new SemanticRuntimeProjectInputAuthority();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
      projectInputAuthority: authority,
    });
    const initial = runtime.workspace.projects[0]!;

    await writeFile(configFile, '{ // equivalent\n"version":1,"authoredSources":{"excludedRoots":["golden"]}}', 'utf8');
    const equivalentGeneration = authority.capture(initial);
    const rebased = initial.forInputGeneration(equivalentGeneration);
    expect(rebased.projectConfiguration.revision).not.toBe(initial.projectConfiguration.revision);
    expect(rebased.authoredSources.excludedRootDirs).toEqual(initial.authoredSources.excludedRootDirs);

    await writeFile(configFile, '{"version":1,"authoredSources":{"excludedRoots":["other"]}}', 'utf8');
    const changedGeneration = authority.capture(rebased);
    expect(() => rebased.forInputGeneration(changedGeneration)).toThrow(/fresh workspace boot is required/);
  });

  test('rebases a V1 projection-policy change without changing authored membership', async () => {
    const workspaceRoot = await createProjectWorkspace();
    const configFile = await writeWorkspaceFile(
      workspaceRoot,
      'aurelia.project.json',
      '{"version":1,"findings":{"aurelia.analysis.dynamic-registration-spread":"warning"}}',
    );
    const authority = new SemanticRuntimeProjectInputAuthority();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot }],
      projectInputAuthority: authority,
    });
    const initial = runtime.workspace.projects[0]!;

    await writeFile(
      configFile,
      '{"version":1,"findings":{"aurelia.analysis.dynamic-registration-spread":"off"}}',
      'utf8',
    );
    const rebased = initial.forInputGeneration(authority.capture(initial));
    expect(rebased.projectConfiguration.revision).not.toBe(initial.projectConfiguration.revision);
    expect(rebased.authoredSources.excludedRootDirs).toEqual(initial.authoredSources.excludedRootDirs);
    expect(resolveSemanticProjectFindingRulePolicy(
      rebased.projectConfiguration.findingPolicy,
      SemanticProjectFindingRuleId.DynamicRegistrationSpread,
    )).toMatchObject({ disposition: 'off', authority: 'project-configuration' });
  });

  test('rebases changed native config when host exclusions keep effective membership unchanged', async () => {
    const workspaceRoot = await createProjectWorkspace();
    const configFile = await writeWorkspaceFile(
      workspaceRoot,
      'aurelia.project.json',
      '{"version":3,"authoredSources":{"excludedRoots":["golden"]}}',
    );
    const authority = new SemanticRuntimeProjectInputAuthority();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [{ rootDir: workspaceRoot, excludedSourceRoots: ['golden'] }],
      projectInputAuthority: authority,
    });
    const initial = runtime.workspace.projects[0]!;
    expect(initial.projectConfiguration.diagnostics).toHaveLength(1);

    await writeFile(configFile, '{"version":1,"authoredSources":{"excludedRoots":["golden"]}}', 'utf8');
    const rebased = initial.forInputGeneration(authority.capture(initial));
    expect(rebased.projectConfiguration.diagnostics).toEqual([]);
    expect(rebased.authoredSources.excludedRootDirs).toEqual(initial.authoredSources.excludedRootDirs);
  });

  test('keeps a separately discovered child project when its parent config excludes the child root', async () => {
    const workspaceRoot = await createProjectWorkspace();
    const childRoot = path.join(workspaceRoot, 'packages', 'child');
    const childSource = await writeWorkspaceFile(childRoot, 'src/child.ts', 'export class ChildResource {}\n');
    await writeWorkspaceFile(childRoot, 'package.json', JSON.stringify({ name: 'child' }));
    await writeWorkspaceFile(childRoot, 'tsconfig.json', JSON.stringify({ include: ['src/**/*.ts'] }));
    await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', JSON.stringify({
      version: 1,
      authoredSources: { excludedRoots: ['packages'] },
    }));

    const runtime = await createSemanticRuntime({ workspaceRoot });
    const parent = runtime.workspace.projects.find((project) => project.rootDir === workspaceRoot)!;
    const child = runtime.workspace.projects.find((project) => project.rootDir === childRoot)!;
    expect(parent.authoredSources.contains(childSource)).toBe(false);
    expect(child.sourceFiles.some((source) => source.path === 'src/child.ts')).toBe(true);
    expect(runtime.authoredSourceOwnership({ sourceFilePath: childSource }).value.owners.map((owner) => owner.projectKey))
      .toEqual(['child']);
  });

  test('retains every exact owner when explicit projects overlap', async () => {
    const workspaceRoot = await createProjectWorkspace();
    const mainFile = path.join(workspaceRoot, 'src/main.ts');
    const configFile = await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', '{"version":1}');
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [
        { rootDir: workspaceRoot, projectKey: 'first', sourceFiles: [{ path: 'src/main.ts' }] },
        { rootDir: workspaceRoot, projectKey: 'second', sourceFiles: [{ path: 'src/main.ts' }] },
      ],
    });

    expect(runtime.authoredSourceOwnership({ sourceFilePath: mainFile }).value.owners.map((owner) => owner.projectKey))
      .toEqual(['first', 'second']);
    expect(runtime.nativeProjectConfigurations({ sourceFilePaths: [configFile] }).value.rows.map((row) => row.projectKey))
      .toEqual(['first', 'second']);
    expect(runtime.nativeProjectConfigurations({ sourceFilePaths: [] }).value.rows).toEqual([]);
    expect(runtime.nativeProjectConfigurations({ sourceFilePaths: [path.join(workspaceRoot, 'missing.json')] }).value.rows)
      .toEqual([]);
  });

  test('pages exact configuration inventory', async () => {
    const workspaceRoot = await createProjectWorkspace();
    const childRoot = path.join(workspaceRoot, 'child');
    const rootConfig = await writeWorkspaceFile(workspaceRoot, 'aurelia.project.json', '{"version":1}');
    const childConfig = await writeWorkspaceFile(childRoot, 'aurelia.project.json', '{"version":3}');
    await writeWorkspaceFile(childRoot, 'src/child.ts', 'export const child = true;\n');
    const authority = new SemanticRuntimeProjectInputAuthority();
    const runtime = await createSemanticRuntime({
      workspaceRoot,
      projects: [
        { rootDir: workspaceRoot, projectKey: 'root', excludedSourceRoots: ['child'] },
        { rootDir: childRoot, projectKey: 'child' },
      ],
      projectInputAuthority: authority,
    });

    const first = runtime.nativeProjectConfigurations({
      sourceFilePaths: [childConfig, rootConfig, childConfig],
      page: { size: 1 },
      inquiryProfile: 'lsp-cursor',
    });
    expect(first.value.rows).toHaveLength(1);
    expect(first.page).toMatchObject({ returnedRows: 1, totalRows: 2, exhausted: false });
    expect(first.page?.nextCursor).not.toBeNull();

    const second = runtime.nativeProjectConfigurations({
      sourceFilePaths: [rootConfig, childConfig],
      page: { size: 10, cursor: first.page!.nextCursor },
      pagePolicy: { maxSize: 1 },
      inquiryProfile: 'lsp-cursor',
    });
    expect(second.value.rows).toHaveLength(1);
    expect(second.page).toMatchObject({ requestedSize: 10, size: 1, clamped: true, exhausted: true });

    // Native-configuration mutation is a source-world transition. Cursor behavior across that boundary is exercised
    // through ManagedSemanticWorkspaceSession, which reconciles before asking the replacement runtime.
  });
});

interface AureliaProjectConfigurationSchema {
  readonly additionalProperties: boolean;
  readonly required: readonly string[];
  readonly properties: {
    readonly $schema: { readonly type: string };
    readonly version: { readonly const: number };
    readonly authoredSources: {
      readonly additionalProperties: boolean;
      readonly properties: Readonly<Record<string, unknown>>;
    };
    readonly findings: {
      readonly additionalProperties: boolean;
      readonly properties: Readonly<Record<string, { readonly $ref: string; readonly default: string }>>;
      readonly patternProperties: Readonly<Record<string, { readonly $ref: string }>>;
    };
  };
  readonly $defs: {
    readonly findingDisposition: { readonly type: string; readonly enum: readonly string[] };
  };
}

async function createProjectWorkspace(): Promise<string> {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'aurelia-project-configuration-'));
  temporaryRoots.push(workspaceRoot);
  await writeWorkspaceFile(workspaceRoot, 'package.json', JSON.stringify({ name: 'configured-app' }));
  await writeWorkspaceFile(workspaceRoot, 'tsconfig.json', JSON.stringify({
    compilerOptions: { module: 'esnext', moduleResolution: 'bundler' },
    include: ['**/*.ts'],
  }));
  await writeWorkspaceFile(workspaceRoot, 'src/main.ts', 'export class MyApp {}\n');
  return workspaceRoot;
}

async function writeWorkspaceFile(rootDir: string, relativePath: string, text: string): Promise<string> {
  const fileName = path.join(rootDir, relativePath);
  await mkdir(path.dirname(fileName), { recursive: true });
  await writeFile(fileName, text, 'utf8');
  return fileName;
}

class UnreadableConfigHost implements SemanticRuntimeProjectInputHost {
  private readonly delegate = new NodeSemanticRuntimeProjectInputHost();
  private readonly configFile: string;

  constructor(configFile: string) {
    this.configFile = path.resolve(configFile);
  }

  readFile(fileName: string): string | undefined {
    return path.resolve(fileName) === this.configFile ? undefined : this.delegate.readFile(fileName);
  }

  fileExists(fileName: string): boolean {
    return this.delegate.fileExists(fileName);
  }

  readDirectory(directoryName: string): readonly string[] {
    return this.delegate.readDirectory(directoryName);
  }

  directoryExists(directoryName: string): boolean {
    return this.delegate.directoryExists(directoryName);
  }

  realpath(fileName: string): string {
    return this.delegate.realpath(fileName);
  }

  matchFiles(
    rootDir: string,
    extensions?: readonly string[],
    excludes?: readonly string[],
    includes?: readonly string[],
    depth?: number,
  ): readonly string[] {
    return this.delegate.matchFiles(rootDir, extensions, excludes, includes, depth);
  }
}
