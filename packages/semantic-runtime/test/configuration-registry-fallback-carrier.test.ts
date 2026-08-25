import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { afterEach, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { aureliaAppProjectEvaluationProfile } from '../src/configuration/aurelia-project-evaluation.js';
import type { ConfigurationKernelEmission } from '../src/configuration/configuration-kernel-emitter.js';
import {
  ConfigurationRecognitionProjectPass,
  type ConfigurationRecognitionProjectResult,
} from '../src/configuration/configuration-recognition-project-pass.js';
import { ConfigurationSequenceKind } from '../src/configuration/configuration-sequence.js';
import {
  isEvaluatedProjectSource,
  StaticProjectEvaluationResult,
  StaticProjectEvaluationSourceResult,
} from '../src/evaluation/project-evaluation.js';
import {
  SourceFileAddress,
  SourceFileRole,
  SourceSpanAddress,
} from '../src/kernel/address.js';
import {
  StringDiKeyIdentity,
  TypeScriptDeclarationIdentity,
} from '../src/kernel/identity.js';
import type { AddressHandle } from '../src/kernel/handles.js';
import type { KernelStore } from '../src/kernel/store.js';
import { RegistryRegistrationAdmission } from '../src/registration/registration-admission.js';
import { TypeSystemProjectBuilder } from '../src/type-system/project.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('configuration checker-registry fallback carriers', () => {
  test('restores evaluated declaration ownership across a checker-only helper inventory', async () => {
    const root = registryFallbackProject();
    const runtime = await registryFallbackRuntime(root, 'evaluated');
    const app = await runtime.openApp({
      projectKey: 'configuration-registry-fallback',
      analysisDepth: 'binding-observation',
    });
    const configuration = app.emission.configuration.readConfiguration();
    const observation = checkerFallbackObservation(app.emission.configuration);
    const registeredValue = observation.registeredValue!;
    const registrySource = app.emission.evaluation.sources.find((source) =>
      source.admission.path.replace(/\\/g, '/').endsWith('src/registry.ts')
    );
    if (registrySource == null || !isEvaluatedProjectSource(registrySource)) {
      throw new Error('Expected the cross-module registry source to be evaluated.');
    }
    const evaluatorClass = anonymousRegistryClass(registrySource.sourceFile);
    const programClass = app.emission.typeSystem.readProgramNode(evaluatorClass);
    if (programClass == null) {
      throw new Error('Expected the registry class in the TypeScript Program.');
    }

    expect(programClass).not.toBe(evaluatorClass);
    expect(registeredValue.node).toBe(evaluatorClass);
    expect(app.emission.typeSystem.readProgramNode(registeredValue.node)).toBe(programClass);
    expect(registeredValue.moduleKey).toBe(registrySource.moduleKey);
    expect(configuration.evaluationBindings.runtimeValueSourceNodeForProduct(
      registryAdmission(configuration).productHandle,
    )).toBe(evaluatorClass);
    expect(configuration.sequences.some((sequence) =>
      sequence.sequenceKind === ConfigurationSequenceKind.Registry
      && configuration.evaluationBindings.sourceNodeForProduct(sequence.productHandle) === evaluatorClass
    )).toBe(true);

    const admission = registryAdmission(configuration);
    const declarationIdentity = admission.registryValue?.identityHandle == null
      ? null
      : runtime.workspace.store.read(admission.registryValue.identityHandle);
    expect(declarationIdentity).toBeInstanceOf(TypeScriptDeclarationIdentity);
    expect((declarationIdentity as TypeScriptDeclarationIdentity).moduleKey).toBe(registrySource.moduleKey);
    expect(sourcePathForAddress(runtime.workspace.store, admission.registryValue?.addressHandle ?? null))
      .toMatch(/src\/registry\.ts$/);
    expect(app.emission.appWorld.diWorld.resolverSlots.some((slot) => {
      const identity = runtime.workspace.store.read(slot.keyIdentityHandle);
      return identity instanceof StringDiKeyIdentity && identity.value === 'cross-module-body';
    })).toBe(true);
  }, 30_000);

  test('retains a Program carrier but refuses foreign fallback identity when evaluation is unavailable', async () => {
    const root = registryFallbackProject();
    const runtime = await registryFallbackRuntime(root, 'program-only');
    const project = runtime.workspace.projects[0];
    if (project == null) {
      throw new Error('Expected one registry fallback project.');
    }
    const baseline = runtime.projectEvaluations.acquire(
      project,
      aureliaAppProjectEvaluationProfile,
    ).readBaseline();
    const registrySource = baseline.sources.find((source) =>
      source.admission.path.replace(/\\/g, '/').endsWith('src/registry.ts')
    );
    if (registrySource?.sourceFile == null || registrySource.evaluation == null) {
      throw new Error('Expected an evaluated registry source before removing its evaluator epoch.');
    }
    const programOnlyRegistry = new StaticProjectEvaluationSourceResult(
      registrySource.admission,
      registrySource.moduleKey,
      registrySource.sourceFile,
      null,
      registrySource.unresolvedModules,
      registrySource.origins,
      registrySource.packageOrigin,
    );
    const evaluation = new StaticProjectEvaluationResult(
      project,
      baseline.sources.map((source) => source === registrySource ? programOnlyRegistry : source),
      baseline.evaluationOrderModuleKeys,
      baseline.profile,
      baseline.graphOpenValues,
    );
    const typeSystem = new TypeSystemProjectBuilder(runtime.frameworkSupport).build(project, evaluation);
    const publication = runtime.computationLifecycle.begin({
      kind: 'configuration-registry-program-only-test',
      reconciliationKey: project.projectKey,
      summary: 'Program-only registry fallback carrier test',
    });
    const result = new ConfigurationRecognitionProjectPass().recognizeAndEmit(
      runtime.workspace.store,
      project,
      null,
      evaluation,
      typeSystem,
      publication,
    );
    const observation = checkerFallbackObservation(result);
    const registeredValue = observation.registeredValue!;
    const programRegistrySource = typeSystem.readProgramSourceFileByHostPath(
      path.join(root, 'src/registry.ts'),
    );
    if (programRegistrySource == null) {
      throw new Error('Expected the Program-only registry source in the TypeScript Program.');
    }

    expect(registeredValue.node.getSourceFile()).toBe(programRegistrySource);
    expect(typeSystem.readEvaluatedNode(registeredValue.node)).toBeNull();
    expect(registeredValue.moduleKey).toBeNull();

    const configuration = result.readConfiguration();
    const admission = registryAdmission(configuration);
    expect(admission.registryValue?.identityHandle).toBeNull();
    expect(configuration.evaluationBindings.runtimeValueSourceNodeForProduct(admission.productHandle))
      .toBe(registeredValue.node);
    expect(sourcePathForAddress(publication, admission.registryValue?.addressHandle ?? null))
      .toMatch(/src\/registry\.ts$/);
    publication.abort();
  }, 30_000);
});

async function registryFallbackRuntime(root: string, lane: string) {
  return createSemanticRuntime({
    workspaceRoot: root,
    storeKey: `test:configuration-registry-fallback:${lane}:${path.basename(root)}`,
    projects: [{
      projectKey: 'configuration-registry-fallback',
      rootDir: root,
      sourceFiles: [
        { path: 'src/main.ts', role: SourceFileRole.AppSource },
        { path: 'src/registry.ts', role: SourceFileRole.AppSource },
      ],
    }],
  });
}

function registryFallbackProject(): string {
  const root = mkdtempSync(path.join(packageRoot, '.configuration-registry-fallback-'));
  temporaryRoots.push(root);
  writeProjectFile(root, 'tsconfig.json', JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
    },
    files: ['src/main.ts', 'src/registry.ts'],
  }));
  writeProjectFile(root, 'src/registry.ts', [
    "import { Registration, type IContainer } from '@aurelia/kernel';",
    '',
    'export const CrossModuleRegistry = class {',
    '  static register(container: IContainer): void {',
    "    container.register(Registration.instance('cross-module-body', { marker: true }));",
    '  }',
    '};',
    '',
  ].join('\n'));
  writeProjectFile(root, 'src/main.ts', [
    "import { DI, type IContainer } from '@aurelia/kernel';",
    "import { CrossModuleRegistry } from './registry.js';",
    '',
    'function installRegistry(container: IContainer): void {',
    '  container.register(CrossModuleRegistry);',
    '}',
    '',
    'const OuterRegistry = {',
    '  register(container: IContainer): void {',
    '    installRegistry(container);',
    '  },',
    '};',
    '',
    'export const container = DI.createContainer();',
    'container.register(OuterRegistry);',
    '',
  ].join('\n'));
  return root;
}

function writeProjectFile(root: string, relativePath: string, text: string): void {
  const fileName = path.join(root, relativePath);
  mkdirSync(path.dirname(fileName), { recursive: true });
  writeFileSync(fileName, text, 'utf8');
}

function checkerFallbackObservation(
  configuration: ConfigurationRecognitionProjectResult,
) {
  const observation = configuration.readObservations()
    .flatMap((sequence) => sequence.steps)
    .flatMap((step) => step.registrationAdmissions)
    .find((admission) => admission.registeredValue?.localName === 'CrossModuleRegistry');
  if (observation?.registeredValue == null) {
    throw new Error('Expected the checker-only CrossModuleRegistry admission observation.');
  }
  return observation;
}

function registryAdmission(
  configuration: ConfigurationKernelEmission,
): RegistryRegistrationAdmission {
  const admission = configuration.registrationAdmissions.find((candidate) =>
    candidate instanceof RegistryRegistrationAdmission
    && candidate.registryValue?.localName === 'CrossModuleRegistry'
  );
  if (!(admission instanceof RegistryRegistrationAdmission)) {
    throw new Error('Expected the materialized CrossModuleRegistry admission.');
  }
  return admission;
}

function anonymousRegistryClass(sourceFile: ts.SourceFile): ts.ClassExpression {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    const declaration = statement.declarationList.declarations[0];
    if (
      declaration != null
      && ts.isIdentifier(declaration.name)
      && declaration.name.text === 'CrossModuleRegistry'
      && declaration.initializer != null
      && ts.isClassExpression(declaration.initializer)
    ) {
      return declaration.initializer;
    }
  }
  throw new Error('Expected the anonymous CrossModuleRegistry class expression.');
}

function sourcePathForAddress(
  store: Pick<KernelStore, 'read'>,
  addressHandle: AddressHandle | null,
): string | null {
  const address = addressHandle == null ? null : store.read(addressHandle);
  const sourceFileHandle = address instanceof SourceSpanAddress
    ? address.fileHandle
    : address instanceof SourceFileAddress
      ? address.handle
      : null;
  const sourceFile = sourceFileHandle == null ? null : store.read(sourceFileHandle);
  return sourceFile instanceof SourceFileAddress ? sourceFile.path.replace(/\\/g, '/') : null;
}
