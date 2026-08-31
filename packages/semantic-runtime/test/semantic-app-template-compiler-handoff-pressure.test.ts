import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import {
  materializeSemanticAppTemplateCompilerHandoffs,
  TemplateCompilerCompiledHandoffState,
  TemplateCompilerFrameworkInstructionType,
  type TemplateCompilerCompiledHandoffDefinition,
  type TemplateCompilerCompiledHandoffInstructionValue,
  type TemplateCompilerCompiledHandoffValue,
} from '../src/template/browser-template.js';
import {
  HydrateElementInstruction,
  HydrateTemplateControllerInstruction,
  type TemplateInstruction,
} from '../src/template/instruction-ir.js';
import { readRuntimeControllerRows } from '../src/api/controller-projections.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const pressureRoot = path.join(packageRoot, 'fixtures/pressure');

describe('semantic app template compiler handoff pressure', () => {
  test('detaches scoped sibling and nested locals into their nearest source-owned handoffs', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureRoot, 'resource-registration-local-templates'),
      storeKey: 'contract:template-compiler-local-family-handoff',
    });
    try {
      const app = await runtime.openApp({
        analysisDepth: 'runtime-topology',
        includeCompilerOccurrencePrecedents: true,
        telemetry: { inquiryProfile: 'aot' },
      });
      const batch = materializeSemanticAppTemplateCompilerHandoffs({ app });
      const root = requireExactHandoff(batch, 'local-templates-app');
      const localDefinitions = root.definitions.filter((definition) => definition.owner.ownerKind === 'local-template');
      expect(localDefinitions.map((definition) => definition.header.name)).toEqual([
        'local-chip',
        'local-icon',
        'outer-local',
        'nested-local',
      ]);
      expect(localDefinitions.map((definition) => definition.owner.ownerKind === 'local-template'
        ? definition.owner.declarationOrdinal
        : null
      )).toEqual([0, 1, 2, 0]);
      const rootId = root.rootDefinitionId;
      const outer = localDefinitions.find((definition) => definition.header.name === 'outer-local');
      const nested = localDefinitions.find((definition) => definition.header.name === 'nested-local');
      expect(localDefinitions.slice(0, 3).every((definition) =>
        definition.owner.ownerKind === 'local-template' && definition.owner.parentDefinitionId === rootId
      )).toBe(true);
      expect(nested?.owner).toMatchObject({
        ownerKind: 'local-template',
        parentDefinitionId: outer?.definitionId,
      });
      expect(new Set(localDefinitions.map((definition) =>
        definition.owner.ownerKind === 'local-template' ? definition.owner.definitionIdentityHandle : null
      )).size).toBe(4);
      const controllerTemplateHandles = new Set(readRuntimeControllerRows(
        app.emission,
        runtime.workspace.store,
        true,
      ).flatMap((row) => [
        row.handles?.compiledTemplateProductHandle,
        row.handles?.viewFactoryCompiledTemplateProductHandle,
      ].filter((handle): handle is string => handle != null)));
      expect(localDefinitions.every((definition) =>
        controllerTemplateHandles.has(definition.sourceCompiledTemplate.productHandle)
      )).toBe(true);

      const secondary = requireExactHandoff(batch, 'secondary-host');
      const secondaryLocal = secondary.definitions.find((definition) =>
        definition.owner.ownerKind === 'local-template'
      );
      expect(secondaryLocal?.header.name).toBe('local-chip');
      expect(secondaryLocal?.owner).not.toEqual(localDefinitions[0]?.owner);
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 30_000);

  test('detaches the broad compiler-fidelity substrate through the production family', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureRoot, 'template-compiler-fidelity'),
      storeKey: 'contract:template-compiler-production-fidelity',
    });
    try {
      const app = await runtime.openApp({
        analysisDepth: 'runtime-topology',
        telemetry: { inquiryProfile: 'aot' },
      });
      const batch = materializeSemanticAppTemplateCompilerHandoffs({ app });
      const names = [
        'static-context-probe',
        'static-projection-probe',
        'projection-whitespace-probe',
        'projection-explicit-slot-probe',
        'static-object-repeat-probe',
        'native-containerless-probe',
        'au-slot-removal-probe',
        'containerless-usage-probe',
        'slot-under-template-controller-probe',
      ] as const;
      const values = new Map(names.map((name) => [name, requireExactHandoff(batch, name)]));
      const semanticResources = new Map([
        ...app.emission.templates.resources,
        ...app.emission.templates.authoringResources,
      ].map((resource) => [resource.compilation.definition.name, resource] as const));

      const staticContext = values.get('static-context-probe')!;
      expect(staticContext.definitions.map((definition) => definition.owner.ownerKind)).toEqual([
        'root',
        'template-controller',
      ]);
      const staticContextSource = semanticResources.get('static-context-probe')?.compilation.compiledTemplate;
      if (staticContextSource == null) throw new Error('Expected static-context-probe compiler-front-door products.');
      const sourceTemplateController = staticContextSource.instructions.filter(
        (instruction): instruction is HydrateTemplateControllerInstruction =>
          instruction instanceof HydrateTemplateControllerInstruction,
      );
      expect(sourceTemplateController).toHaveLength(1);
      expect(staticContext.definitions.map((definition) => definition.sourceCompiledTemplate)).toEqual([
        staticContextSource.compiledTemplate.toReference(),
        sourceTemplateController[0]!.childCompiledTemplate,
      ]);
      expect(contentShape(rootDefinition(staticContext))).toEqual([
        'comment:compiler-marker',
        'comment:render-location-start',
        'comment:render-location-end',
      ]);
      expect(contentShape(staticContext.definitions[1]!)).toEqual([
        ['element:div', [['element:span', ['text:static child']]]],
      ]);

      const staticProjection = values.get('static-projection-probe')!;
      expect(staticProjection.definitions.map((definition) => definition.owner.ownerKind)).toEqual([
        'root',
        'projection',
        'projection',
      ]);
      const staticProjectionSource = semanticResources.get('static-projection-probe')?.compilation.compiledTemplate;
      if (staticProjectionSource == null) throw new Error('Expected static-projection-probe compiler-front-door products.');
      const sourceHydrateElement = staticProjectionSource.instructions.find(
        (instruction): instruction is HydrateElementInstruction => instruction instanceof HydrateElementInstruction,
      );
      if (sourceHydrateElement == null) throw new Error('Expected the source projection HydrateElement instruction.');
      expect(staticProjection.definitions.map((definition) => definition.sourceCompiledTemplate)).toEqual([
        staticProjectionSource.compiledTemplate.toReference(),
        ...sourceHydrateElement.projections.map((projection) => projection.compiledTemplate),
      ]);
      expect(new Set(staticProjection.definitions.map((definition) =>
        definition.sourceCompiledTemplate.productHandle
      )).size).toBe(3);
      expect(contentShape(rootDefinition(staticProjection))).toEqual([
        'comment:compiler-marker',
        ['element:projection-card', []],
      ]);
      expect(staticProjection.definitions.slice(1).map(contentShape)).toEqual([
        [['element:span', ['text:static default']]],
        [['element:b', ['text:static named']]],
      ]);
      expect(requireHydrateElement(staticProjection).projections?.map((projection) => projection.slotName))
        .toEqual(['default', 'named']);

      const whitespaceProjection = values.get('projection-whitespace-probe')!;
      expect(whitespaceProjection.definitions).toHaveLength(1);
      expect(requireHydrateElement(whitespaceProjection).projections).toBeNull();
      expect(contentShape(rootDefinition(whitespaceProjection))).toEqual([
        'comment:compiler-marker',
        ['element:projection-card', []],
      ]);

      const explicitSlot = values.get('projection-explicit-slot-probe')!;
      expect(requireHydrateElement(explicitSlot).projections?.map((projection) => projection.slotName))
        .toEqual(['default']);
      expect(contentShape(rootDefinition(explicitSlot))).toEqual([
        'comment:compiler-marker',
        ['element:projection-card', []],
      ]);
      expect(contentShape(explicitSlot.definitions[1]!)).toEqual([
        ['element:em', ['text:bare']],
        ['element:i', ['text:empty']],
      ]);
      expect(explicitSlot.definitions[1]!.tree.attributes).toEqual([]);

      const objectRepeat = values.get('static-object-repeat-probe')!;
      const objectIterator = recursiveInstructionValues(objectRepeat).find((value) =>
        value.type === TemplateCompilerFrameworkInstructionType.IteratorBinding
      );
      expect(objectIterator?.type).toBe(TemplateCompilerFrameworkInstructionType.IteratorBinding);
      if (objectIterator?.type !== TemplateCompilerFrameworkInstructionType.IteratorBinding) {
        throw new Error('Expected object-repeat IteratorBinding instruction.');
      }
      expect(objectIterator.forOf).toEqual({
        $kind: 'ForOfStatement',
        declaration: {
          $kind: 'ObjectBindingPattern',
          keys: ['id', 'name'],
          values: [
            { $kind: 'AccessScope', name: 'id', ancestor: 0 },
            { $kind: 'AccessScope', name: 'label', ancestor: 0 },
          ],
        },
        iterable: { $kind: 'AccessScope', name: 'items', ancestor: 0 },
        semiIdx: -1,
      });

      const nativeContainerless = values.get('native-containerless-probe')!;
      expect(instructionValues(nativeContainerless).map((value) => [value.type, targetOf(value)])).toEqual([
        [TemplateCompilerFrameworkInstructionType.PropertyBinding, 'title'],
      ]);
      expect(contentShape(rootDefinition(nativeContainerless))).toEqual([
        'comment:compiler-marker',
        ['element:div', []],
      ]);
      expect(rootDefinition(nativeContainerless).tree.attributes).toEqual([]);

      const usageContainerless = values.get('containerless-usage-probe')!;
      expect(requireHydrateElement(usageContainerless).containerless).toBe(true);
      expect(contentShape(rootDefinition(usageContainerless))).toEqual([
        'comment:compiler-marker',
        'comment:render-location-start',
        'comment:render-location-end',
      ]);

      const auSlot = values.get('au-slot-removal-probe')!;
      expect(requireHydrateElement(auSlot)).toMatchObject({
        res: 'au-slot',
        data: { dataKind: 'au-slot', name: 'default' },
        projections: [{ slotName: 'default' }],
      });
      expect(contentShape(rootDefinition(auSlot))).toEqual([
        'comment:compiler-marker',
        'comment:render-location-start',
        'comment:render-location-end',
      ]);
      expect(contentShape(auSlot.definitions[1]!)).toEqual([
        ['element:span', ['text:fallback']],
      ]);

      const slotUnderController = values.get('slot-under-template-controller-probe')!;
      expect(rootDefinition(slotUnderController).header.hasSlots).toBe(true);
      expect(slotUnderController.definitions[1]!.header.hasSlots).toBe(false);
      expect(contentShape(rootDefinition(slotUnderController))).toEqual([
        'comment:compiler-marker',
        'comment:render-location-start',
        'comment:render-location-end',
      ]);
      expect(contentShape(slotUnderController.definitions[1]!)).toEqual([
        ['element:div', [['element:slot', []]]],
      ]);

      const appResource = batch.resources.find((resource) => sourcePath(resource).endsWith('src/app.html'));
      expect(appResource?.state).toBe(TemplateCompilerCompiledHandoffState.Open);
      expect(appResource?.reasons).not.toHaveLength(0);
      expect(appResource?.reasons).toEqual(expect.arrayContaining([
        expect.objectContaining({ stage: 'context-family' }),
      ]));
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 20_000);

  test('preserves broad ordinary-root outcomes through the production family', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureRoot, 'template-compiler-site-cursor'),
      storeKey: 'contract:template-compiler-production-ordinary-roots',
    });
    const selected = [
      'cursor-ten-hole',
      'cursor-containerless-order',
      'cursor-native-containerless',
      'cursor-surrogate-dynamic',
      'cursor-live-multi-binding',
      'cursor-live-duplicate',
      'cursor-live-nonsingular',
      'cursor-row-interleave',
    ] as const;
    try {
      const app = await runtime.openApp({ telemetry: { inquiryProfile: 'aot' } });
      const batch = materializeSemanticAppTemplateCompilerHandoffs({
        app,
        templateSourcePaths: selected.map((name) => `src/${name}.html`),
      });
      expect(batch.unmatchedTemplateSourcePaths).toEqual([]);
      const values = new Map(selected.map((name) => [name, requireExactHandoff(batch, name)]));

      const tenHole = values.get('cursor-ten-hole')!;
      const textBindings = instructionValues(tenHole).filter((value) =>
        value.type === TemplateCompilerFrameworkInstructionType.TextBinding
      );
      expect(textBindings.map(accessScopeName)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']);
      expect(contentShape(rootDefinition(tenHole))).toEqual([
        ['element:p', Array.from({ length: 10 }, () => ['comment:compiler-marker', 'text: ']).flat()],
        'text:\n',
      ]);

      const containerlessOrder = values.get('cursor-containerless-order')!;
      const orderValues = instructionValues(containerlessOrder);
      expect(orderValues.map((value) => value.type)).toEqual([
        TemplateCompilerFrameworkInstructionType.HydrateElement,
        TemplateCompilerFrameworkInstructionType.HydrateElement,
        TemplateCompilerFrameworkInstructionType.HydrateElement,
        TemplateCompilerFrameworkInstructionType.PropertyBinding,
      ]);
      expect(orderValues.slice(0, 3).map((value) =>
        value.type === TemplateCompilerFrameworkInstructionType.HydrateElement ? value.containerless : null
      )).toEqual([false, true, true]);
      expect(contentShape(rootDefinition(containerlessOrder))).toEqual([
        'comment:compiler-marker', 'comment:render-location-start', 'comment:render-location-end',
        'comment:compiler-marker', 'comment:render-location-start', 'comment:render-location-end',
        'comment:compiler-marker', 'comment:render-location-start', 'comment:render-location-end',
        'comment:compiler-marker',
        ['element:div', []],
        'text:\n',
      ]);

      const nativeContainerless = values.get('cursor-native-containerless')!;
      expect(instructionValues(nativeContainerless)).toEqual([]);
      expect(contentShape(rootDefinition(nativeContainerless))).toEqual([
        ['element:section', []],
        'text:\n',
      ]);
      expect(rootDefinition(nativeContainerless).tree.attributes).toEqual([]);

      const surrogate = values.get('cursor-surrogate-dynamic')!;
      expect(instructionValues(surrogate).map((value) => [targetOf(value), accessScopeName(value)])).toEqual([
        ['title', 'inside'],
      ]);
      expect(rootDefinition(surrogate).surrogates.map((instruction) => [
        targetOf(instruction.value),
        accessScopeName(instruction.value),
      ])).toEqual([['class', 'rootClass']]);
      expect(contentShape(rootDefinition(surrogate))).toEqual([
        'comment:compiler-marker',
        ['element:div', []],
      ]);
      expect(rootDefinition(surrogate).tree.attributes).toEqual([]);

      const multiBinding = values.get('cursor-live-multi-binding')!;
      const hydrateAttributes = instructionValues(multiBinding).filter((value) =>
        value.type === TemplateCompilerFrameworkInstructionType.HydrateAttribute
      );
      expect(hydrateAttributes.map((value) => value.type === TemplateCompilerFrameworkInstructionType.HydrateAttribute
        ? value.props.map((prop) => [targetOf(prop), literalOf(prop), accessScopeName(prop)])
        : []
      )).toEqual([
        [['first', 'literal', null], ['second', null, 'message']],
        [['first', 'left\\;middle\\:right', null], ['second', 'tail', null]],
        [['first', 'okay', null], ['second', null, 'later']],
        [['first', 'okay', null], ['second', 'later', null]],
      ]);
      expect(rootDefinition(multiBinding).tree.attributes.map((attribute) => [attribute.name, attribute.value]))
        .toEqual([
          ['id', 'plain-command'],
          ['id', 'escaped'],
          ['id', 'first-invalid'],
          ['id', 'unknown-command'],
        ]);
      expect(contentShape(rootDefinition(multiBinding))).toEqual(Array.from(
        { length: 4 },
        () => ['comment:compiler-marker', ['element:div', []], 'text:\n'],
      ).flat());

      const duplicate = values.get('cursor-live-duplicate')!;
      expect(instructionValues(duplicate).map(targetOf)).toEqual(['title', 'contentEditable', 'textContent']);
      expect(rootDefinition(duplicate).tree.attributes).toEqual([]);
      expect(contentShape(rootDefinition(duplicate))).toEqual([
        'comment:compiler-marker', ['element:div', []], 'text:\n',
        'comment:compiler-marker', ['element:div', []], 'text:\n',
      ]);

      const nonSingular = values.get('cursor-live-nonsingular')!;
      expect(instructionValues(nonSingular).map((value) => [targetOf(value), accessScopeName(value)]))
        .toEqual([['title', 'title'], ['title', 'title']]);
      expect(contentShape(rootDefinition(nonSingular))).toEqual([
        ['element:b', ['comment:compiler-marker', ['element:i', ['text:one']]]],
        'comment:compiler-marker',
        ['element:i', ['text:two']],
        'text:\n',
      ]);

      const interleaved = values.get('cursor-row-interleave')!;
      expect(instructionValues(interleaved).map((value) => [value.type, targetOf(value), accessScopeName(value)]))
        .toEqual([
          [TemplateCompilerFrameworkInstructionType.TextBinding, null, 'a'],
          [TemplateCompilerFrameworkInstructionType.TextBinding, null, 'b'],
          [TemplateCompilerFrameworkInstructionType.PropertyBinding, 'title', 'b'],
          [TemplateCompilerFrameworkInstructionType.TextBinding, null, 'c'],
          [TemplateCompilerFrameworkInstructionType.PropertyBinding, 'textContent', 'd'],
          [TemplateCompilerFrameworkInstructionType.TextBinding, null, 'e'],
        ]);
      expect(contentShape(rootDefinition(interleaved))).toEqual([
        'text:before ', 'comment:compiler-marker', 'text: ', 'text: middle ',
        'comment:compiler-marker', 'text: ', 'text: end', 'comment:compiler-marker',
        ['element:div', [
          'text:inner ', 'comment:compiler-marker', 'text: ', 'text: tail',
        ]],
        'comment:compiler-marker', ['element:span', []], 'text:after ',
        'comment:compiler-marker', 'text: ', 'text: done\n',
      ]);
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 20_000);

  test('detaches one causal frontier while preserving exact sibling resources', async () => {
    const spreadRuntime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureRoot, 'template-spread-capture-semantics'),
      storeKey: 'contract:template-compiler-production-spread-frontier',
    });
    try {
      const app = await spreadRuntime.openApp({
        analysisDepth: 'runtime-topology',
        telemetry: { inquiryProfile: 'aot' },
      });
      const batch = materializeSemanticAppTemplateCompilerHandoffs({ app });
      const resource = batch.resources.find((candidate) =>
        sourcePath(candidate).endsWith('src/template-spread-capture-semantics-app.html')
      );

      expect(batch.resources.filter((candidate) => candidate.state === TemplateCompilerCompiledHandoffState.Exact))
        .toHaveLength(6);
      expect(resource?.state).toBe(TemplateCompilerCompiledHandoffState.Ineligible);
      expect(resource?.reasons).toHaveLength(1);
      const reason = resource?.reasons[0];
      expect(reason).toMatchObject({
        stage: 'context-family',
        reasonKind: 'family-completion:reserved-spread-syntax',
        summary: 'Spreading syntax "...xxx" is reserved. Encountered "...$element".',
        frontierCause: {
          frontierKind: 'reached-live-attribute-invalid',
          nodeOccurrenceKey: expect.any(String),
          attributeOccurrenceKey: expect.any(String),
          issue: {
            productHandle: expect.any(String),
            identityHandle: expect.any(String),
            issueKind: 'reserved-spread-syntax',
            frameworkErrorCode: 'AUR0720',
          },
          source: {
            path: 'src/template-spread-capture-semantics-app.html',
            start: 1521,
            end: 1532,
          },
        },
      });
      expect(reason?.stableKeys).toEqual(expect.arrayContaining([
        reason?.frontierCause?.nodeOccurrenceKey,
        reason?.frontierCause?.attributeOccurrenceKey,
        reason?.frontierCause?.issue?.productHandle,
      ]));
    } finally {
      spreadRuntime.retireWorkspaceIncarnation();
    }

    const projectionRuntime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureRoot, 'content-projection-topology'),
      storeKey: 'contract:template-compiler-production-projection-frontier',
    });
    try {
      const app = await projectionRuntime.openApp({
        analysisDepth: 'runtime-topology',
        telemetry: { inquiryProfile: 'aot' },
      });
      const batch = materializeSemanticAppTemplateCompilerHandoffs({ app });
      const resource = batch.resources.find((candidate) =>
        sourcePath(candidate).endsWith('src/content-projection-topology-app.html')
      );

      expect(batch.resources.filter((candidate) => candidate.state === TemplateCompilerCompiledHandoffState.Exact))
        .toHaveLength(7);
      expect(resource?.state).toBe(TemplateCompilerCompiledHandoffState.Pending);
      expect(resource?.reasons).toEqual([expect.objectContaining({
        stage: 'context-family',
        reasonKind: 'family-completion:after-attributes-before-projection',
        summary: 'Explicit-shadow projection retains residual host children that require same-context selected traversal.',
        frontierCause: {
          frontierKind: 'after-attributes-before-projection',
          nodeOccurrenceKey: expect.any(String),
          attributeOccurrenceKey: null,
          issue: null,
          source: null,
        },
      })]);
    } finally {
      projectionRuntime.retireWorkspaceIncarnation();
    }
  }, 30_000);

  test('keeps an ambiguous source compiled-template join resource-local and typed', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureRoot, 'template-compiler-fidelity'),
      storeKey: 'contract:template-compiler-source-template-ambiguity',
    });
    try {
      const app = await runtime.openApp({
        analysisDepth: 'runtime-topology',
        telemetry: { inquiryProfile: 'aot' },
      });
      const source = app.emission.templates.resources.find((resource) =>
        resource.compilation.definition.name === 'static-context-probe'
      );
      const instruction = source?.compilation.compiledTemplate.instructions.find(
        (candidate): candidate is HydrateTemplateControllerInstruction =>
          candidate instanceof HydrateTemplateControllerInstruction,
      );
      if (source == null || instruction == null) throw new Error('Expected static-context source controller instruction.');
      (source.compilation.compiledTemplate.instructions as TemplateInstruction[]).push(instruction);

      const batch = materializeSemanticAppTemplateCompilerHandoffs({ app });
      const ambiguous = batch.resources.filter((resource) => resource.reasons.some((reason) =>
        reason.reasonKind === 'template-controller-source-compiled-template-unavailable'
      ));
      expect(ambiguous).toHaveLength(1);
      expect(ambiguous[0]?.state).toBe(TemplateCompilerCompiledHandoffState.Ineligible);
      expect(requireExactHandoff(batch, 'static-projection-probe')).not.toBeNull();
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 30_000);

  test('detaches built-in template controllers with exact array repeat declarations', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureRoot, 'template-controller-built-ins'),
      storeKey: 'contract:template-compiler-production-built-in-template-controllers',
    });
    try {
      const app = await runtime.openApp({
        analysisDepth: 'runtime-topology',
        telemetry: { inquiryProfile: 'aot' },
      });
      const batch = materializeSemanticAppTemplateCompilerHandoffs({ app });
      const value = requireExactHandoff(batch, 'template-controller-built-ins-app');
      expect(batch.resources).toHaveLength(1);

      const arrayDeclarations = recursiveInstructionValues(value).flatMap((instruction) => {
        if (
          instruction.type !== TemplateCompilerFrameworkInstructionType.IteratorBinding
          || instruction.forOf.$kind !== 'ForOfStatement'
          || instruction.forOf.declaration.$kind !== 'ArrayDestructuring'
        ) {
          return [];
        }
        return [instruction.forOf.declaration];
      });
      expect(arrayDeclarations.map((declaration) => declaration.list.map((leaf) => {
        if (
          leaf.$kind !== 'DestructuringAssignmentLeaf'
          || leaf.target.$kind !== 'AccessMember'
          || leaf.source.$kind !== 'AccessKeyed'
          || leaf.source.key.$kind !== 'PrimitiveLiteral'
          || typeof leaf.source.key.value !== 'number'
        ) {
          throw new Error('Expected RC2 array-destructuring assignment leaf.');
        }
        return [leaf.target.name, leaf.source.key.value];
      }))).toEqual([
        [['key', 0], ['product', 1]],
        [['tripleKey', 0], ['tripleProduct', 2]],
        [['contextualEnabled', 0], ['contextualProduct', 1]],
      ]);
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 20_000);

  test('reports reached local-template invalidity at the production boundary', async () => {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(pressureRoot, 'resource-registration-local-template-errors'),
      storeKey: 'contract:template-compiler-production-local-invalidity',
    });
    try {
      const app = await runtime.openApp({ telemetry: { inquiryProfile: 'aot' } });
      const batch = materializeSemanticAppTemplateCompilerHandoffs({
        app,
        templateSourcePaths: ['src/duplicate-local-bindable-attribute.html'],
      });
      const resource = batch.resources[0];
      expect(resource?.state).toBe(TemplateCompilerCompiledHandoffState.Ineligible);
      expect(resource?.reasons).toEqual([expect.objectContaining({
        stage: 'context-family',
        reasonKind: 'root-site-run:local-template-bindable-duplicate',
      })]);
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 20_000);
});

type HandoffBatch = ReturnType<typeof materializeSemanticAppTemplateCompilerHandoffs>;

function requireExactHandoff(batch: HandoffBatch, resourceName: string): TemplateCompilerCompiledHandoffValue {
  const resource = batch.resources.find((candidate) => candidate.value?.resourceName === resourceName);
  if (resource?.state !== TemplateCompilerCompiledHandoffState.Exact || resource.value == null) {
    throw new Error(
      `Expected exact handoff '${resourceName}': ${resource?.reasons.map((reason) => reason.summary).join(' ') ?? 'missing'}`,
    );
  }
  return resource.value;
}

function sourcePath(resource: HandoffBatch['resources'][number]): string {
  return resource.source?.path?.replaceAll('\\', '/') ?? '';
}

function rootDefinition(value: TemplateCompilerCompiledHandoffValue): TemplateCompilerCompiledHandoffDefinition {
  const definition = value.definitions.find((candidate) => candidate.definitionId === value.rootDefinitionId);
  if (definition == null) throw new Error(`Handoff '${value.resourceName}' lost its root definition.`);
  return definition;
}

function instructionValues(
  value: TemplateCompilerCompiledHandoffValue,
): readonly TemplateCompilerCompiledHandoffInstructionValue[] {
  return value.definitions.flatMap((definition) => definition.rows.flat().map((instruction) => instruction.value));
}

function recursiveInstructionValues(
  value: TemplateCompilerCompiledHandoffValue,
): readonly TemplateCompilerCompiledHandoffInstructionValue[] {
  return value.definitions.flatMap((definition) => [
    ...definition.rows.flat(),
    ...definition.surrogates,
  ]).flatMap((instruction) => recursiveInstructionValue(instruction.value));
}

function recursiveInstructionValue(
  value: TemplateCompilerCompiledHandoffInstructionValue,
): readonly TemplateCompilerCompiledHandoffInstructionValue[] {
  const nested: TemplateCompilerCompiledHandoffInstructionValue[] = [];
  if ('props' in value) nested.push(...value.props);
  if ('instructions' in value) nested.push(...value.instructions);
  if ('instruction' in value) nested.push(value.instruction);
  return [value, ...nested.flatMap(recursiveInstructionValue)];
}

function requireHydrateElement(value: TemplateCompilerCompiledHandoffValue) {
  const instruction = rootDefinition(value).rows.flat().map((candidate) => candidate.value).find((candidate) =>
    candidate.type === TemplateCompilerFrameworkInstructionType.HydrateElement
  );
  if (instruction?.type !== TemplateCompilerFrameworkInstructionType.HydrateElement) {
    throw new Error(`Handoff '${value.resourceName}' has no HydrateElement instruction.`);
  }
  return instruction;
}

function contentShape(definition: TemplateCompilerCompiledHandoffDefinition): readonly unknown[] {
  const nodes = new Map(definition.tree.nodes.map((node) => [node.nodeId, node] as const));
  const nodeShape = (nodeId: string): unknown => {
    const node = nodes.get(nodeId);
    if (node == null) throw new Error(`Definition '${definition.definitionId}' lost child '${nodeId}'.`);
    switch (node.nodeKind) {
      case 'comment': return `comment:${node.semanticKind}`;
      case 'text': return `text:${node.text}`;
      case 'element': {
        const content = node.templateContentNodeId == null ? null : nodeShape(node.templateContentNodeId);
        return content == null
          ? [`element:${node.tagName}`, node.children.map(nodeShape)]
          : [`element:${node.tagName}`, node.children.map(nodeShape), ['template-content', content]];
      }
      case 'fragment': return node.children.map(nodeShape);
    }
  };
  const content = nodes.get(definition.tree.compilerContentNodeId);
  if (content?.nodeKind !== 'fragment') {
    throw new Error(`Definition '${definition.definitionId}' lost its compiler-content fragment.`);
  }
  return content.children.map(nodeShape);
}

function targetOf(value: TemplateCompilerCompiledHandoffInstructionValue): string | null {
  return 'to' in value && typeof value.to === 'string' ? value.to : null;
}

function literalOf(value: TemplateCompilerCompiledHandoffInstructionValue): string | null {
  return 'value' in value && typeof value.value === 'string' ? value.value : null;
}

function accessScopeName(value: TemplateCompilerCompiledHandoffInstructionValue): string | null {
  if (!('from' in value) || value.from == null || typeof value.from !== 'object') return null;
  return value.from.$kind === 'AccessScope' ? value.from.name : null;
}
