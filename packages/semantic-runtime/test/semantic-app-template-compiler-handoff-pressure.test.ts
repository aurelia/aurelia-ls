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

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const pressureRoot = path.join(packageRoot, 'fixtures/pressure');

describe('semantic app template compiler handoff pressure', () => {
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
        'native-containerless-probe',
        'au-slot-removal-probe',
        'containerless-usage-probe',
        'slot-under-template-controller-probe',
      ] as const;
      const values = new Map(names.map((name) => [name, requireExactHandoff(batch, name)]));

      const staticContext = values.get('static-context-probe')!;
      expect(staticContext.definitions.map((definition) => definition.owner.ownerKind)).toEqual([
        'root',
        'template-controller',
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
