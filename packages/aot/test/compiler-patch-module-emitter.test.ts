import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { CustomElement } from '@aurelia/runtime-html';
import { createSemanticRuntime } from '@aurelia-ls/semantic-runtime';
import {
  materializeSemanticAppTemplateCompilerHandoffs,
  TemplateCompilerCompiledHandoffState,
  type TemplateCompilerCompiledHandoffValue,
} from '@aurelia-ls/semantic-runtime/browser-template';
import { JSDOM } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';

import { AotCompilerPatchModuleEmitter } from '../src/compiler-patch-module-emitter.js';
import {
  AOT_COMPILER_PATCH_RUNTIME_MODULE_ID,
  AOT_COMPILER_PATCH_RUNTIME_MODULE_SOURCE,
} from '../src/compiler-patch-runtime-module.js';
import { AOT_RUNTIME_MODULE_SPECIFIER } from '../src/source-transform.js';
import { AotTemplateModuleEmitter } from '../src/template-module-emitter.js';

const repositoryRoot = path.resolve(import.meta.dirname, '../../..');
const fixtureRoot = path.resolve(repositoryRoot, 'packages/aot-assurance/fixtures/g0');
const templatePath = path.resolve(fixtureRoot, 'src/g0-app.html');
let handoff: TemplateCompilerCompiledHandoffValue;
let sourceText: string;

beforeAll(async () => {
  const runtime = await createSemanticRuntime({
    workspaceRoot: fixtureRoot,
    projectDiscovery: 'single-root',
    storeKey: 'aot-compiler-patch-module-emitter',
  });
  try {
    const app = await runtime.openApp({
      analysisDepth: 'runtime-topology',
      includeAuthoringTemplates: true,
      telemetry: { inquiryProfile: 'aot' },
    });
    const batch = materializeSemanticAppTemplateCompilerHandoffs({
      app,
      templateSourcePaths: [templatePath],
      includeAuthoringResources: true,
    });
    const resource = batch.resources[0];
    if (resource?.state !== TemplateCompilerCompiledHandoffState.Exact) {
      throw new Error(resource?.reasons.map((reason) => reason.summary).join(' ') ?? 'No compiler handoff.');
    }
    handoff = resource.value;
    sourceText = await readFile(templatePath, 'utf8');
    app.requireCurrent();
  } finally {
    runtime.retireWorkspaceIncarnation();
  }
}, 20_000);

describe('AOT compiler patch module emitter', () => {
  it('shares the carrier transform runtime module contract', () => {
    expect(AOT_COMPILER_PATCH_RUNTIME_MODULE_ID).toBe(AOT_RUNTIME_MODULE_SPECIFIER);
    expect(AOT_COMPILER_PATCH_RUNTIME_MODULE_SOURCE).toContain('export function applyCompiledCustomElement');
  });

  it('emits only compiler-owned root fields while retaining complete generated definitions', async () => {
    const pressuredHandoff = withAuthoredExecutableMetadata(handoff);
    const request = {
      handoff: pressuredHandoff,
      projectRoot: fixtureRoot,
      sourcePath: templatePath,
      sourceText,
    };

    expect(() => new AotTemplateModuleEmitter().emit(request)).toThrowError(
      expect.objectContaining({ code: 'AOT_ARTIFACT_UNSUPPORTED_HEADER' }),
    );

    const artifact = new AotCompilerPatchModuleEmitter().emit(request);
    expect(artifact.address).toBe(pressuredHandoff.address);
    expect(artifact.digest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(artifact.code).not.toContain('import ');
    expect(artifact.code).not.toContain('AuthoredLocalDependency');
    expect(artifact.code).not.toContain('authoredCapturePredicate');
    expect(artifact.code).not.toContain('authoredBindableSetter');
    expect(artifact.code).not.toContain('authoredWatchCallback');
    expect(artifact.code).not.toContain('authoredProcessContent');

    const imported = await importPatchModule(artifact.code, artifact.digest);
    expect(Object.keys(imported).sort()).toEqual([
      'compilerAddedDependencies',
      'default',
      'hasSlots',
      'instructions',
      'needsCompile',
      'surrogates',
      'template',
    ]);
    expect(Object.keys(imported.default).sort()).toEqual([
      'compilerAddedDependencies',
      'hasSlots',
      'instructions',
      'needsCompile',
      'surrogates',
      'template',
    ]);
    expect(imported.compilerAddedDependencies).toEqual([]);
    expect(imported.needsCompile).toBe(false);
    expect(imported.default.template).toBe(imported.template);
    expect(imported.default.instructions).toBe(imported.instructions);

    const generatedDefinitions = collectGeneratedDefinitions(imported.instructions);
    expect(generatedDefinitions).toHaveLength(3);
    for (const definition of generatedDefinitions) {
      expect(Object.keys(definition).sort()).toEqual([
        'aliases',
        'bindables',
        'capture',
        'containerless',
        'dependencies',
        'enhance',
        'hasSlots',
        'instructions',
        'name',
        'needsCompile',
        'shadowOptions',
        'strict',
        'surrogates',
        'template',
        'type',
      ]);
      expect(definition).toMatchObject({
        type: 'custom-element',
        dependencies: [],
        needsCompile: false,
      });
      expect(definition.template.nodeName).toBe('TEMPLATE');
      expect(Array.isArray(definition.instructions)).toBe(true);
    }
  }, 20_000);

  it('patches the existing framework definition without replacing authored executable metadata', async () => {
    const artifact = new AotCompilerPatchModuleEmitter().emit({
      handoff,
      projectRoot: fixtureRoot,
      sourcePath: templatePath,
      sourceText,
    });
    const imported = await importPatchModule(artifact.code, artifact.digest);
    const helper = await importRuntimeHelper();
    const authoredDependency = class AuthoredDependency {};
    const authoredCapture = (attribute: string): boolean => attribute.startsWith('data-');
    const authoredSetter = (value: unknown): string => String(value).trim();
    const authoredWatchCallback = (): void => { };
    const authoredWatch = {
      expression: 'value',
      callback: authoredWatchCallback,
      flush: 'sync' as const,
    };
    const authoredProcessContent = (): boolean => true;
    class CarrierComponent {}
    const Type = CustomElement.define({
      name: 'aot-patch-carrier',
      template: '<p>authored</p>',
      dependencies: [authoredDependency],
      capture: authoredCapture,
      bindables: { value: { set: authoredSetter } },
      watches: [authoredWatch],
      processContent: authoredProcessContent,
    }, CarrierComponent);
    const definition = CustomElement.getDefinition(Type);

    const returnedType = helper.applyCompiledCustomElement(Type, imported.default);
    const patched = CustomElement.getDefinition(Type);
    expect(returnedType).toBe(Type);
    expect(patched).toBe(definition);
    expect(patched.template).toBe(imported.template);
    expect(patched.instructions).toBe(imported.instructions);
    expect(patched.surrogates).toBe(imported.surrogates);
    expect(patched.hasSlots).toBe(imported.hasSlots);
    expect(patched.needsCompile).toBe(false);
    expect(patched.dependencies).toEqual([authoredDependency]);
    expect(patched.capture).toBe(authoredCapture);
    expect(patched.bindables.value?.set).toBe(authoredSetter);
    expect(patched.watches).toEqual([authoredWatch]);
    expect(patched.processContent).toBe(authoredProcessContent);
  }, 20_000);
});

interface RuntimeCompilerPatch {
  readonly template: HTMLTemplateElement;
  readonly instructions: readonly (readonly RuntimeInstruction[])[];
  readonly surrogates: readonly RuntimeInstruction[];
  readonly hasSlots: boolean;
  readonly needsCompile: false;
  readonly compilerAddedDependencies: readonly unknown[];
}

interface RuntimeCompilerPatchModule extends RuntimeCompilerPatch {
  readonly default: RuntimeCompilerPatch;
}

interface RuntimeInstruction extends Record<string, unknown> {
  readonly def?: RuntimeGeneratedDefinition;
  readonly projections?: Readonly<Record<string, RuntimeGeneratedDefinition>> | null;
  readonly props?: readonly RuntimeInstruction[];
  readonly instructions?: readonly RuntimeInstruction[];
}

interface RuntimeGeneratedDefinition extends Record<string, unknown> {
  readonly template: HTMLTemplateElement;
  readonly instructions: readonly (readonly RuntimeInstruction[])[];
}

async function importPatchModule(code: string, digest: string): Promise<RuntimeCompilerPatchModule> {
  const outputRoot = await mkdtemp(path.resolve(repositoryRoot, 'packages/aot/.tmp-compiler-patch-'));
  const outputPath = path.resolve(outputRoot, 'compiler-patch.mjs');
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  const previousDocument = globalThis.document;
  try {
    await writeFile(outputPath, code, 'utf8');
    Object.defineProperty(globalThis, 'document', { configurable: true, value: dom.window.document });
    return await import(`${pathToFileURL(outputPath).href}?digest=${digest}`) as RuntimeCompilerPatchModule;
  } finally {
    Object.defineProperty(globalThis, 'document', { configurable: true, value: previousDocument });
    dom.window.close();
    await rm(outputRoot, { recursive: true, force: true });
  }
}

async function importRuntimeHelper(): Promise<{
  readonly applyCompiledCustomElement: (Type: Function, patch: RuntimeCompilerPatch) => Function;
}> {
  const outputRoot = await mkdtemp(path.resolve(repositoryRoot, 'packages/aot/.tmp-compiler-patch-runtime-'));
  const outputPath = path.resolve(outputRoot, 'runtime.mjs');
  try {
    await writeFile(outputPath, AOT_COMPILER_PATCH_RUNTIME_MODULE_SOURCE, 'utf8');
    return await import(`${pathToFileURL(outputPath).href}?source=compiler-patch`) as {
      readonly applyCompiledCustomElement: (Type: Function, patch: RuntimeCompilerPatch) => Function;
    };
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
}

function collectGeneratedDefinitions(rows: readonly (readonly RuntimeInstruction[])[]): RuntimeGeneratedDefinition[] {
  const definitions: RuntimeGeneratedDefinition[] = [];
  const visit = (instruction: RuntimeInstruction): void => {
    if (instruction.def != null) definitions.push(instruction.def);
    if (instruction.projections != null) definitions.push(...Object.values(instruction.projections));
    instruction.props?.forEach(visit);
    instruction.instructions?.forEach(visit);
  };
  rows.flat().forEach(visit);
  return definitions;
}

function withAuthoredExecutableMetadata(
  value: TemplateCompilerCompiledHandoffValue,
): TemplateCompilerCompiledHandoffValue {
  const root = value.definitions.find((definition) => definition.definitionId === value.rootDefinitionId);
  if (root == null || root.header.target == null || root.header.dependencies[0] == null) {
    throw new Error('Expected a real root target and dependency for metadata pressure.');
  }
  const target = root.header.target;
  const targetNamed = (localName: string) => ({ ...target, localName });
  return {
    ...value,
    definitions: value.definitions.map((definition) => definition !== root ? definition : {
      ...definition,
      header: {
        ...definition.header,
        capture: {
          kind: 'predicate',
          predicateTarget: targetNamed('authoredCapturePredicate'),
        },
        dependencies: [{
          ...definition.header.dependencies[0]!,
          keyName: 'AuthoredLocalDependency',
          localName: 'AuthoredLocalDependency',
        }],
        bindables: [{
          attribute: 'value',
          callback: 'valueChanged',
          mode: 2,
          name: 'value',
          setter: {
            kind: 'function',
            target: targetNamed('authoredBindableSetter'),
            nullable: false,
          },
          source: target.source,
          propertyTarget: targetNamed('value'),
          callbackTarget: targetNamed('valueChanged'),
          fieldProvenance: [],
        }],
        watches: [{
          expression: {
            kind: 'expression',
            propertyKey: null,
            target: targetNamed('authoredWatchExpression'),
          },
          callback: {
            kind: 'function',
            methodName: null,
            target: targetNamed('authoredWatchCallback'),
          },
          flush: 'sync',
          fieldProvenance: [],
        }],
        processContent: targetNamed('authoredProcessContent'),
      },
    }),
  } as unknown as TemplateCompilerCompiledHandoffValue;
}
