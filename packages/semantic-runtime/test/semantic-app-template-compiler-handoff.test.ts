import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
} from '../src/kernel/project-input.js';
import {
  materializeSemanticAppTemplateCompilerHandoffs,
  TEMPLATE_COMPILER_COMPILED_HANDOFF_VERSION,
  TemplateCompilerFrameworkInstructionType,
  TemplateCompilerCompiledHandoffState,
  RuntimeRegistrationRequirementReasonKind,
  RuntimeRegistrationRequirementSelectionKind,
  type TemplateCompilerCompiledHandoffInstructionValue,
} from '../src/template/browser-template.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-convention-minimal-app');
const templateFileName = path.join(fixtureRoot, 'src/my-app.html');
const componentFileName = path.join(fixtureRoot, 'src/my-app.ts');

describe('semantic app template compiler handoff', () => {
  test('detaches a real paired-file compilation before its run-local compiler world retires', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      projectDiscovery: 'single-root',
      storeKey: 'semantic-app-template-compiler-handoff',
    });

    const app = await runtime.openApp({
      analysisDepth: 'runtime-topology',
      telemetry: { inquiryProfile: 'aot' },
    });
    const batch = materializeSemanticAppTemplateCompilerHandoffs({
      app,
      templateSourcePaths: ['src/my-app.html', templateFileName],
    });

    expect(batch.unmatchedTemplateSourcePaths).toEqual([]);
    expect(batch.resources).toHaveLength(1);
    const resource = batch.resources[0]!;
    expect(resource.state).toBe(TemplateCompilerCompiledHandoffState.Exact);
    if (resource.state !== TemplateCompilerCompiledHandoffState.Exact) {
      throw new Error(resource.reasons.map((reason) => reason.summary).join(' '));
    }
    expect(resource.source?.path).toMatch(/src\/my-app\.html$/u);
    expect(resource.value).toMatchObject({
      schemaVersion: TEMPLATE_COMPILER_COMPILED_HANDOFF_VERSION,
      address: {
        definitionProductHandle: expect.any(String),
        definitionIdentityHandle: expect.any(String),
        compilerWorldProductHandle: expect.any(String),
        compilerWorldIdentityHandle: expect.any(String),
        sourceAttachment: {
          carrierKind: 'convention',
          owningModuleKey: 'src/my-app.ts',
          carrier: {
            oldText: expect.stringContaining('export class MyApp'),
          },
          templateSource: {
            oldText: '<main>\n  <h1>${message}</h1>\n</main>\n',
          },
        },
      },
      resourceName: 'my-app',
      rootDefinitionId: 'definition:0',
      source: {
        markup: '<main>\n  <h1>${message}</h1>\n</main>\n',
      },
    });
    expect(resource.value.definitions).toHaveLength(1);
    const definition = resource.value.definitions[0]!;
    expect(definition).toMatchObject({
      definitionId: 'definition:0',
      owner: { ownerKind: 'root' },
      header: {
        headerKind: 'root-resource-overlay',
        name: 'my-app',
        needsCompile: false,
      },
    });
    expect(definition.header.target).toMatchObject({ localName: 'MyApp' });
    expect(definition.tree.nodes.some((node) => node.nodeKind === 'element' && node.tagName === 'main')).toBe(true);
    expect(definition.tree.nodes.some((node) => node.nodeId === definition.tree.compilerContentNodeId)).toBe(true);
    expect(definition.rows.flat()).not.toHaveLength(0);
    expect(definition.rows.flat().every((instruction) => instruction.source != null)).toBe(true);
    expect(resource.value.source.source?.path).toMatch(/src\/my-app\.html$/u);

    const serializedBeforeRetirement = JSON.stringify(resource.value);
    runtime.retireWorkspaceIncarnation();
    expect(JSON.stringify(resource.value)).toBe(serializedBeforeRetirement);
    expect(JSON.parse(serializedBeforeRetirement)).toMatchObject({
      schemaVersion: TEMPLATE_COMPILER_COMPILED_HANDOFF_VERSION,
      definitions: [{ definitionId: 'definition:0' }],
    });
  });

  test('reports unmatched source selections without compiling unrelated app resources', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      projectDiscovery: 'single-root',
      storeKey: 'semantic-app-template-compiler-handoff-unmatched',
    });
    try {
      const app = await runtime.openApp({ telemetry: { inquiryProfile: 'aot' } });
      const batch = materializeSemanticAppTemplateCompilerHandoffs({
        app,
        templateSourcePaths: ['src/not-a-template.html'],
      });
      expect(batch.resources).toEqual([]);
      expect(batch.unmatchedTemplateSourcePaths).toEqual(['src/not-a-template.html']);
      expect(batch.runtimeRegistrationRequirements.resources.selectionKind)
        .toBe(RuntimeRegistrationRequirementSelectionKind.ConservativeGroup);
      expect(batch.runtimeRegistrationRequirements.resources.reasons.map((reason) => reason.reasonKind)).toContain(
        RuntimeRegistrationRequirementReasonKind.CompilerCohortIncomplete,
      );
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  });

  test('carries ordinary attribute, style, and repeat option wires through the detached value', async () => {
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(templateFileName, [
      '<main>',
      '  <div data-id.attr="id" width.style="width"></div>',
      '  <div repeat.for="item of items; key.bind: item.id; contextual: true">${item.name}</div>',
      '</main>',
    ].join('\n'));
    overlay.write(componentFileName, [
      'export class MyApp {',
      "  id = 'one';",
      "  width = '10px';",
      "  items = [{ id: 'one', name: 'One' }];",
      '}',
    ].join('\n'));
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      projectDiscovery: 'single-root',
      storeKey: 'semantic-app-template-compiler-handoff-ordinary-wires',
      projectInputAuthority: new SemanticRuntimeProjectInputAuthority(
        new NodeSemanticRuntimeProjectInputHost(overlay),
      ),
    });
    try {
      const app = await runtime.openApp({ telemetry: { inquiryProfile: 'aot' } });
      const batch = materializeSemanticAppTemplateCompilerHandoffs({
        app,
        templateSourcePaths: [templateFileName],
      });
      const resource = batch.resources[0];
      if (resource?.state !== TemplateCompilerCompiledHandoffState.Exact) {
        throw new Error(resource?.reasons.map((reason) => reason.summary).join(' ') ?? 'No handoff resource.');
      }
      const values = flattenInstructionValues(resource.value.definitions.flatMap((definition) =>
        definition.rows.flat().map((instruction) => instruction.value)
      ));
      expect(values).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: TemplateCompilerFrameworkInstructionType.AttributeBinding,
          attr: 'data-id',
          to: 'data-id',
        }),
        expect.objectContaining({
          type: TemplateCompilerFrameworkInstructionType.AttributeBinding,
          attr: 'style',
          to: 'width',
        }),
      ]));
      const templateController = resource.value.definitions[0]?.rows.flat()
        .find((instruction) =>
          instruction.value.type === TemplateCompilerFrameworkInstructionType.HydrateTemplateController
        )?.value;
      expect(templateController).toMatchObject({
        type: TemplateCompilerFrameworkInstructionType.HydrateTemplateController,
        props: [{
          type: TemplateCompilerFrameworkInstructionType.IteratorBinding,
          props: [{
            type: TemplateCompilerFrameworkInstructionType.MultiAttr,
            to: 'key',
            command: 'bind',
          }, {
            type: TemplateCompilerFrameworkInstructionType.MultiAttr,
            to: 'contextual',
            command: null,
          }],
        }],
      });
      if (
        templateController?.type !== TemplateCompilerFrameworkInstructionType.HydrateTemplateController
      ) {
        throw new Error('Expected one repeat template-controller instruction.');
      }
      expect(templateController.props).toHaveLength(1);
      const iterator = values.find((value) => value.type === TemplateCompilerFrameworkInstructionType.IteratorBinding);
      expect(iterator?.props).toEqual([
        expect.objectContaining({
          type: TemplateCompilerFrameworkInstructionType.MultiAttr,
          to: 'key',
          command: 'bind',
        }),
        expect.objectContaining({
          type: TemplateCompilerFrameworkInstructionType.MultiAttr,
          to: 'contextual',
          command: null,
          value: 'true',
        }),
      ]);
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  });
});

function flattenInstructionValues(
  values: readonly TemplateCompilerCompiledHandoffInstructionValue[],
): readonly TemplateCompilerCompiledHandoffInstructionValue[] {
  return values.flatMap((value) => [
    value,
    ...('props' in value ? flattenInstructionValues(value.props) : []),
    ...('instructions' in value ? flattenInstructionValues(value.instructions) : []),
  ]);
}
