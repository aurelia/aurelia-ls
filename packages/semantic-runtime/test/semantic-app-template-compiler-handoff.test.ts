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
import {
  runtimeSpreadCompilationHandoffCaseKey,
  runtimeSpreadCompilationHandoffCasesEquivalent,
} from '../src/template/runtime-spread-compilation-handoff.js';
import { RuntimeSpreadCompilation } from '../src/template/runtime-spread-compilation.js';
import { RuntimeRendererSpreadCompileState } from '../src/template/runtime-renderer.js';
import {
  HydrateElementInstruction,
  SpreadTransferedBindingInstruction,
} from '../src/template/instruction-ir.js';
import { resourceLocalRuntimeSpreadCompilations } from '../src/template/runtime-resource-ownership.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-convention-minimal-app');
const templateFileName = path.join(fixtureRoot, 'src/my-app.html');
const componentFileName = path.join(fixtureRoot, 'src/my-app.ts');
const stateBackedFormRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-state-backed-form');
const fieldShellTemplateFileName = path.join(stateBackedFormRoot, 'src/components/field-shell.html');

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

  test('detaches two exact state-backed form spread cases onto their capture owners', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: stateBackedFormRoot,
      projectDiscovery: 'single-root',
      storeKey: 'semantic-app-template-compiler-handoff-state-backed-form-spread',
    });
    let retired = false;
    try {
      const app = await runtime.openApp({
        analysisDepth: 'runtime-topology',
        includeAuthoringTemplates: true,
        telemetry: { inquiryProfile: 'aot' },
      });
      const semanticResource = app.emission.templates.resources.find((candidate) =>
        candidate.compilation.definition.name === 'state-backed-form'
      );
      if (semanticResource == null) throw new Error('Expected the state-backed form semantic resource.');
      const resourcesByDefinition = new Map([
        ...app.emission.templates.resources,
        ...app.emission.templates.authoringResources,
      ].flatMap((candidate) => candidate.compilation.definition.productHandle == null
        ? []
        : [[candidate.compilation.definition.productHandle, candidate] as const]
      ));
      const expectedOwners = semanticResource.compilation.compiledTemplate.instructions
        .filter((instruction): instruction is HydrateElementInstruction => {
          if (!(instruction instanceof HydrateElementInstruction)
            || instruction.captureSyntaxProductHandles.length === 0
            || instruction.definitionProductHandle == null) {
            return false;
          }
          return resourcesByDefinition.get(instruction.definitionProductHandle)?.compilation.compiledTemplate.instructions
            .some((candidate) => candidate instanceof SpreadTransferedBindingInstruction) ?? false;
        });
      const observedCompilations = resourceLocalRuntimeSpreadCompilations(semanticResource)
        .filter((compilation) => compilation.state !== RuntimeRendererSpreadCompileState.NoCapturedAttributes);
      expect(expectedOwners).toHaveLength(2);
      expect(observedCompilations).toHaveLength(2);
      expect(new Set(observedCompilations.map((compilation) =>
        compilation.capturedAttributeContextInstructionProductHandle
      ))).toEqual(new Set(expectedOwners.map((owner) => owner.productHandle)));
      const batch = materializeSemanticAppTemplateCompilerHandoffs({
        app,
        includeAuthoringResources: true,
      });
      const resource = batch.resources.find((candidate) =>
        candidate.source?.path.replaceAll('\\', '/').endsWith('src/components/state-backed-form.html') === true
      );
      if (resource?.state !== TemplateCompilerCompiledHandoffState.Exact) {
        throw new Error(resource?.reasons.map((reason) => reason.summary).join(' ') ?? 'No state-backed form handoff.');
      }
      expect(resource.value.spreadClosure).toEqual({ state: 'exact', reasons: [] });
      const owners = resource.value.definitions.flatMap((definition) => definition.rows.flat())
        .map((instruction) => instruction.value)
        .filter((value) =>
          value.type === TemplateCompilerFrameworkInstructionType.HydrateElement
          && value.spreadPlan != null
        );
      expect(owners).toHaveLength(2);
      const cases = owners.flatMap((owner) => owner.type === TemplateCompilerFrameworkInstructionType.HydrateElement
        ? owner.spreadPlan?.cases ?? []
        : []
      );
      expect(cases).toHaveLength(2);
      expect(cases.map((entry) => ({
        requestorName: entry.requestorName,
        requestorKey: entry.requestorKey,
        target: entry.target,
        instructions: entry.instructions,
        residualExpressions: entry.residualExpressions,
      }))).toEqual([
        {
          requestorName: 'field-shell',
          requestorKey: 'au:resource:custom-element:field-shell',
          target: {
            namespaceKind: 'html',
            namespaceUri: 'http://www.w3.org/1999/xhtml',
            localName: 'input',
            targetDefinitionMatch: 'structural',
            definitionName: null,
            definitionKey: null,
          },
          instructions: [
            { type: TemplateCompilerFrameworkInstructionType.SetAttribute, value: 'text', to: 'type' },
            expect.objectContaining({
              type: TemplateCompilerFrameworkInstructionType.PropertyBinding,
              from: expect.objectContaining({
                $kind: 'AccessMember',
                object: expect.objectContaining({ $kind: 'AccessScope', name: 'request', ancestor: 0 }),
                name: 'customerName',
              }),
              to: 'value',
              mode: 6,
            }),
          ],
          residualExpressions: [],
        },
        {
          requestorName: 'field-shell',
          requestorKey: 'au:resource:custom-element:field-shell',
          target: {
            namespaceKind: 'html',
            namespaceUri: 'http://www.w3.org/1999/xhtml',
            localName: 'input',
            targetDefinitionMatch: 'structural',
            definitionName: null,
            definitionKey: null,
          },
          instructions: [
            { type: TemplateCompilerFrameworkInstructionType.SetAttribute, value: 'email', to: 'type' },
            expect.objectContaining({
              type: TemplateCompilerFrameworkInstructionType.PropertyBinding,
              from: expect.objectContaining({
                $kind: 'AccessMember',
                object: expect.objectContaining({ $kind: 'AccessScope', name: 'request', ancestor: 0 }),
                name: 'email',
              }),
              to: 'value',
              mode: 6,
            }),
          ],
          residualExpressions: [],
        },
      ]);
      const structuralA = {
        ...cases[0]!,
        target: {
          ...cases[0]!.target,
          targetDefinitionMatch: 'structural' as const,
          definitionName: 'effective-a',
          definitionKey: 'effective-key-a',
        },
      };
      const structuralB = {
        ...structuralA,
        target: { ...structuralA.target, definitionName: 'effective-b', definitionKey: 'effective-key-b' },
      };
      expect(runtimeSpreadCompilationHandoffCaseKey(structuralA))
        .toBe(runtimeSpreadCompilationHandoffCaseKey(structuralB));
      expect(runtimeSpreadCompilationHandoffCaseKey(structuralA)).toBe(
        runtimeSpreadCompilationHandoffCaseKey({
          ...structuralA,
          target: { ...structuralA.target, namespaceKind: 'svg' },
        }),
      );
      expect(runtimeSpreadCompilationHandoffCasesEquivalent(structuralA, {
        ...structuralA,
        target: { ...structuralA.target, namespaceKind: 'svg' },
      })).toBe(true);
      expect(runtimeSpreadCompilationHandoffCaseKey(structuralA)).not.toBe(
        runtimeSpreadCompilationHandoffCaseKey({ ...structuralA, requestorName: 'other-field-shell' }),
      );
      expect(runtimeSpreadCompilationHandoffCaseKey(structuralA)).not.toBe(
        runtimeSpreadCompilationHandoffCaseKey({
          ...structuralA,
          target: {
            ...structuralA.target,
            targetDefinitionMatch: 'explicit-definition',
            definitionName: null,
            definitionKey: null,
          },
        }),
      );
      expect(runtimeSpreadCompilationHandoffCasesEquivalent(structuralA, structuralB)).toBe(true);
      const explicitA = {
        ...structuralA,
        target: { ...structuralA.target, targetDefinitionMatch: 'explicit-definition' },
      } as const;
      const explicitB = {
        ...structuralB,
        target: { ...structuralB.target, targetDefinitionMatch: 'explicit-definition' },
      } as const;
      expect(runtimeSpreadCompilationHandoffCaseKey(explicitA))
        .not.toBe(runtimeSpreadCompilationHandoffCaseKey(explicitB));
      expect(runtimeSpreadCompilationHandoffCasesEquivalent(explicitA, explicitB)).toBe(false);
      expect(runtimeSpreadCompilationHandoffCasesEquivalent(structuralA, {
        ...structuralB,
        instructions: structuralB.instructions.slice(1),
      })).toBe(false);
      const serialized = JSON.stringify(cases);
      runtime.retireWorkspaceIncarnation();
      retired = true;
      expect(JSON.stringify(cases)).toBe(serialized);
    } finally {
      if (!retired) runtime.retireWorkspaceIncarnation();
    }
  }, 45_000);

  test('keeps one static state-form handoff across open, missing, and duplicate spread coverage', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: stateBackedFormRoot,
      projectDiscovery: 'single-root',
      storeKey: 'semantic-app-template-compiler-handoff-state-backed-form-nonexact-spread',
    });
    try {
      const app = await runtime.openApp({
        analysisDepth: 'runtime-topology',
        includeAuthoringTemplates: true,
        telemetry: { inquiryProfile: 'aot' },
      });
      const semanticResource = app.emission.templates.resources.find((candidate) =>
        candidate.compilation.definition.name === 'state-backed-form'
      );
      if (semanticResource == null) throw new Error('Expected the state-backed form semantic resource.');
      const spreadCompilations = semanticResource.runtimeAnalysis.runtimeRendering
        .spreadCompilations as RuntimeSpreadCompilation[];
      const original = spreadCompilations.find((compilation) =>
        compilation.state === RuntimeRendererSpreadCompileState.Compiled
      );
      if (original == null) throw new Error('Expected one compiled spread invocation coverage carrier.');
      const originals = [...spreadCompilations];
      const restore = (): void => {
        spreadCompilations.splice(0, spreadCompilations.length, ...originals);
      };
      const assertOutcome = (
        mutate: () => void,
        expectedState: 'open' | 'ineligible',
        expectedReasonKind: string,
      ): void => {
        restore();
        try {
          mutate();
          const batch = materializeSemanticAppTemplateCompilerHandoffs({
            app,
            includeAuthoringResources: true,
          });
          const resource = stateBackedFormHandoff(batch.resources);
          expect(resource.state).toBe(TemplateCompilerCompiledHandoffState.Exact);
          expect(resource.reasons).toEqual([]);
          expect(resource.value.spreadClosure).toMatchObject({
            state: expectedState,
            reasons: [expect.objectContaining({ reasonKind: expectedReasonKind })],
          });
          expect(spreadCases(resource.value.definitions)).toEqual([]);
        } finally {
          restore();
        }
      };

      assertOutcome(() => {
        const index = spreadCompilations.indexOf(original);
        spreadCompilations.splice(index, 1, openSpreadCompilation(original));
      }, 'open', 'spread-compilation-open');
      assertOutcome(() => {
        spreadCompilations.splice(spreadCompilations.indexOf(original), 1);
      }, 'open', 'spread-invocation-coverage-incomplete');
      assertOutcome(() => {
        spreadCompilations.push(original);
      }, 'ineligible', 'spread-invocation-coverage-ambiguous');
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 45_000);

  test('normalizes an uppercase HTML runtime spread target against the browser-final element', async () => {
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(fieldShellTemplateFileName, [
      '<label for.bind="inputId">${label}</label>',
      '<INPUT id.bind="inputId" ...$attrs>',
    ].join('\n'));
    const runtime = await createSemanticRuntime({
      workspaceRoot: stateBackedFormRoot,
      projectDiscovery: 'single-root',
      storeKey: 'semantic-app-template-compiler-handoff-uppercase-spread-target',
      projectInputAuthority: new SemanticRuntimeProjectInputAuthority(
        new NodeSemanticRuntimeProjectInputHost(overlay),
      ),
    });
    try {
      const app = await runtime.openApp({
        analysisDepth: 'runtime-topology',
        includeAuthoringTemplates: true,
        telemetry: { inquiryProfile: 'aot' },
      });
      const batch = materializeSemanticAppTemplateCompilerHandoffs({
        app,
        includeAuthoringResources: true,
      });
      const resource = stateBackedFormHandoff(batch.resources);
      expect(resource.value.spreadClosure).toEqual({ state: 'exact', reasons: [] });
      const cases = spreadCases(resource.value.definitions);
      expect(cases).toHaveLength(2);
      expect(cases.every((entry) =>
        entry.target.namespaceKind === 'html'
        && entry.target.namespaceUri === 'http://www.w3.org/1999/xhtml'
        && entry.target.localName === 'input'
      )).toBe(true);
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 45_000);

  test('keeps static handoff exact but refuses an SVG-to-HTML browser breakout spread target', async () => {
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(fieldShellTemplateFileName, [
      '<label for.bind="inputId">${label}</label>',
      '<svg><div id.bind="inputId" ...$attrs></div></svg>',
    ].join('\n'));
    const runtime = await createSemanticRuntime({
      workspaceRoot: stateBackedFormRoot,
      projectDiscovery: 'single-root',
      storeKey: 'semantic-app-template-compiler-handoff-svg-breakout-spread-target',
      projectInputAuthority: new SemanticRuntimeProjectInputAuthority(
        new NodeSemanticRuntimeProjectInputHost(overlay),
      ),
    });
    try {
      const app = await runtime.openApp({
        analysisDepth: 'runtime-topology',
        includeAuthoringTemplates: true,
        telemetry: { inquiryProfile: 'aot' },
      });
      const batch = materializeSemanticAppTemplateCompilerHandoffs({
        app,
        includeAuthoringResources: true,
      });
      const resource = stateBackedFormHandoff(batch.resources);
      expect(resource.state).toBe(TemplateCompilerCompiledHandoffState.Exact);
      expect(resource.value.spreadClosure).toMatchObject({
        state: 'open',
        reasons: [expect.objectContaining({ reasonKind: 'spread-target-browser-divergence' })],
      });
      expect(spreadCases(resource.value.definitions)).toEqual([]);
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 45_000);
});

function openSpreadCompilation(original: RuntimeSpreadCompilation): RuntimeSpreadCompilation {
  return new RuntimeSpreadCompilation({
    state: RuntimeRendererSpreadCompileState.Open,
    requestorDefinitionProductHandle: original.requestorDefinitionProductHandle,
    requestorDefinitionIdentityHandle: original.requestorDefinitionIdentityHandle,
    spreadInstructionProductHandle: original.spreadInstructionProductHandle,
    spreadInstructionIdentityHandle: original.spreadInstructionIdentityHandle,
    capturedAttributeContextInstructionProductHandle: original.capturedAttributeContextInstructionProductHandle,
    capturedAttributeContextInstructionIdentityHandle: original.capturedAttributeContextInstructionIdentityHandle,
    capturedAttributeContextControllerProductHandle: original.capturedAttributeContextControllerProductHandle,
    capturedAttributeContextControllerIdentityHandle: original.capturedAttributeContextControllerIdentityHandle,
    hydrationContextProductHandle: original.hydrationContextProductHandle,
    hydrationContextIdentityHandle: original.hydrationContextIdentityHandle,
    targetRenderTargetProductHandle: original.targetRenderTargetProductHandle,
    targetRenderTargetIdentityHandle: original.targetRenderTargetIdentityHandle,
    targetHtmlNodeProductHandle: original.targetHtmlNodeProductHandle,
    targetHtmlNodeIdentityHandle: original.targetHtmlNodeIdentityHandle,
    targetDefinitionExplicit: original.targetDefinitionExplicit,
    targetDefinitionProductHandle: original.targetDefinitionProductHandle,
    targetDefinitionIdentityHandle: original.targetDefinitionIdentityHandle,
    capturedSyntaxProductHandles: original.capturedSyntaxProductHandles,
    rootInstructionProductHandles: [],
    createdInstructionProductHandles: [],
    expressionParseProductHandles: [],
    summary: 'Preserved runtime compiler must handle this spread invocation.',
    reasonKinds: ['feature-not-yet-modeled'],
  });
}

function stateBackedFormHandoff(
  resources: ReturnType<typeof materializeSemanticAppTemplateCompilerHandoffs>['resources'],
): Extract<(typeof resources)[number], { readonly state: TemplateCompilerCompiledHandoffState.Exact }> {
  const resource = resources.find((candidate) =>
    candidate.source?.path.replaceAll('\\', '/').endsWith('src/components/state-backed-form.html') === true
  );
  if (resource?.state !== TemplateCompilerCompiledHandoffState.Exact) {
    throw new Error(resource?.reasons.map((reason) => reason.summary).join(' ') ?? 'No state-backed form handoff.');
  }
  return resource;
}

function spreadCases(
  definitions: Extract<
    (ReturnType<typeof materializeSemanticAppTemplateCompilerHandoffs>['resources'])[number],
    { readonly state: TemplateCompilerCompiledHandoffState.Exact }
  >['value']['definitions'],
) {
  return definitions.flatMap((definition) => definition.rows.flat())
    .map((instruction) => instruction.value)
    .flatMap((value) => value.type === TemplateCompilerFrameworkInstructionType.HydrateElement
      ? value.spreadPlan?.cases ?? []
      : []
    );
}

function flattenInstructionValues(
  values: readonly TemplateCompilerCompiledHandoffInstructionValue[],
): readonly TemplateCompilerCompiledHandoffInstructionValue[] {
  return values.flatMap((value) => [
    value,
    ...('props' in value ? flattenInstructionValues(value.props) : []),
    ...('instructions' in value ? flattenInstructionValues(value.instructions) : []),
  ]);
}
