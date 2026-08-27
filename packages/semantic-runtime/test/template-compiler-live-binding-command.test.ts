import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  type SemanticRuntime,
} from '../src/api/runtime.js';
import {
  BindingCommandLoweringState,
  type BindingCommandSyntax,
} from '../src/template/binding-command-execution.js';
import {
  TemplateCompilerReadKind,
  TemplateCompilerReadView,
  TemplateCompilerWorldAuthority,
} from '../src/template/compiler-read-view.js';
import { KernelHandleFactory } from '../src/kernel/handles.js';
import {
  ListenerBindingInstruction,
  PropertyBindingInstruction,
  TemplateBindingMode,
} from '../src/template/instruction-ir.js';
import type { AttributeSyntax } from '../src/template/attribute-syntax.js';
import type { TemplateCompilerAttributeOwnerProgressionSite } from '../src/template/attribute-owner-progression.js';
import type { TemplateResourceCompilationEmission } from '../src/template/template-compilation-project-pass.js';
import {
  executeTemplateCompilerLiveBindingCommand,
  TemplateCompilerLiveBindingCommandOpenReasonKind,
  TemplateCompilerLiveBindingCommandRequest,
  TemplateCompilerLiveBindingCommandState,
  type TemplateCompilerLiveBindingCommandHandleFactory,
  type TemplateCompilerLiveExpressionHandleRequest,
  type TemplateCompilerLiveInstructionHandleRequest,
} from '../src/template/template-compiler-live-binding-command.js';
import { BindingCommandInstructionAllocation } from '../src/template/binding-command-execution.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('live template-compiler binding-command execution', () => {
  let progressionRuntime: SemanticRuntime;
  let progressionCompilation: TemplateResourceCompilationEmission;
  let opaqueRuntime: SemanticRuntime;
  let opaqueCompilation: TemplateResourceCompilationEmission;

  beforeAll(async () => {
    progressionRuntime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, 'fixtures/pressure/attribute-owner-progression'),
      storeKey: 'contract:live-binding-command:progression',
    });
    const progressionApp = await progressionRuntime.openApp();
    progressionCompilation = requiredCompilation(progressionApp.emission.templates.resources, 'attribute-owner-progression-app');

    opaqueRuntime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, 'fixtures/pressure/template-compiler-fidelity'),
      storeKey: 'contract:live-binding-command:opaque',
    });
    const opaqueApp = await opaqueRuntime.openApp();
    opaqueCompilation = requiredCompilation(opaqueApp.emission.templates.resources, 'template-compiler-fidelity-app');
  }, 30_000);

  afterAll(() => {
    progressionRuntime.retireWorkspaceIncarnation();
    opaqueRuntime.retireWorkspaceIncarnation();
  });

  test('executes default binding against the browser-current owner in JIT attribute order', () => {
    const removedFirst = requiredProgressionSite(progressionCompilation, 'removed-first', 'textcontent.bind');
    const bindingFirst = requiredProgressionSite(progressionCompilation, 'binding-first', 'textcontent.bind');

    const execute = (site: TemplateCompilerAttributeOwnerProgressionSite, local: string) => {
      const handles = new DeterministicLiveHandles(local);
      const reads = new TemplateCompilerReadView(
        progressionRuntime.workspace.store,
        TemplateCompilerWorldAuthority.fixed(progressionCompilation.compilerWorld),
      );
      const result = executeTemplateCompilerLiveBindingCommand(new TemplateCompilerLiveBindingCommandRequest(
        reads,
        site.ownerView!,
        site.owner!.element.toReference(),
        site.attribute.toReference(),
        reachedSyntax(site.syntax!),
        'bind',
        handles,
      ));
      return { result, handles };
    };

    const removed = execute(removedFirst, 'removed-first');
    const retained = execute(bindingFirst, 'binding-first');
    expect(removed.result.state).toBe(TemplateCompilerLiveBindingCommandState.Executed);
    expect(retained.result.state).toBe(TemplateCompilerLiveBindingCommandState.Executed);
    if (
      removed.result.state !== TemplateCompilerLiveBindingCommandState.Executed
      || retained.result.state !== TemplateCompilerLiveBindingCommandState.Executed
    ) throw new Error('Expected exact built-in executions.');

    const removedInstruction = removed.result.instructions[0];
    const retainedInstruction = retained.result.instructions[0];
    expect(removedInstruction).toBeInstanceOf(PropertyBindingInstruction);
    expect(retainedInstruction).toBeInstanceOf(PropertyBindingInstruction);
    if (!(removedInstruction instanceof PropertyBindingInstruction) || !(retainedInstruction instanceof PropertyBindingInstruction)) {
      throw new Error('Expected property-binding instructions.');
    }
    expect(removedFirst.ownerView?.hasAttribute('contenteditable')).toBe(false);
    expect(bindingFirst.ownerView?.hasAttribute('contenteditable')).toBe(true);
    expect(removedInstruction.bindingMode).toBe(TemplateBindingMode.ToView);
    expect(retainedInstruction.bindingMode).toBe(TemplateBindingMode.TwoWay);
    expect([removedInstruction.targetProperty, retainedInstruction.targetProperty]).toEqual(['textContent', 'textContent']);

    for (const execution of [removed.result, retained.result]) {
      expect(execution.outcome.state).toBe(BindingCommandLoweringState.Complete);
      expect(execution.expressionParses).toHaveLength(1);
      expect(execution.expressionParses[0]?.expression).toBe('message');
      expect(execution.expressionParses[0]?.compilerRead.readKind).toBe(TemplateCompilerReadKind.ExpressionParser);
      expect(execution.compilerReads).toContain(execution.expressionParses[0]?.compilerRead);
      expect(execution.compilerReads.filter((read) => read.readKind === TemplateCompilerReadKind.AttributeMapper)).toHaveLength(2);
      expect(execution.compilerReads.every((read) => read.validate().isCurrent)).toBe(true);
    }
    expect(removed.handles.instructionRequests).toEqual([
      expect.objectContaining({ local: 'bind', ordinal: 0 }),
    ]);
    expect(removed.handles.expressionRequests).toEqual([
      expect.objectContaining({ entryFamily: 'IsProperty', expression: 'message', ordinal: 0 }),
    ]);
    expect(removedInstruction.expressionProductHandle).toBe(removed.result.expressionParses[0]?.expressionProductHandle);
  });

  test('runs fixed and ignoreAttr handlers from a product-free reached syntax carrier', () => {
    const site = requiredProgressionSite(progressionCompilation, 'binding-first', 'textcontent.bind');
    const fixedSyntax = reachedSyntax(site.syntax!);
    expect('productHandle' in fixedSyntax).toBe(false);

    const fixed = executeTemplateCompilerLiveBindingCommand(new TemplateCompilerLiveBindingCommandRequest(
      new TemplateCompilerReadView(
        progressionRuntime.workspace.store,
        TemplateCompilerWorldAuthority.fixed(progressionCompilation.compilerWorld),
      ),
      site.ownerView!,
      site.owner!.element.toReference(),
      site.attribute.toReference(),
      fixedSyntax,
      'two-way',
      new DeterministicLiveHandles('fixed'),
    ));
    expect(fixed.state).toBe(TemplateCompilerLiveBindingCommandState.Executed);
    if (fixed.state !== TemplateCompilerLiveBindingCommandState.Executed) throw new Error('Expected fixed execution.');
    expect(fixed.instructions[0]).toMatchObject({
      targetProperty: 'textContent',
      bindingMode: TemplateBindingMode.TwoWay,
    });
    expect(fixed.ignoreAttr).toBe(false);

    const triggerSyntax: BindingCommandSyntax = {
      rawValue: 'save()',
      target: 'click',
      targetSourceAddressHandle: null,
      commandSourceAddressHandle: null,
      parts: ['click', 'trigger'],
      patternParts: [],
      sourceAddressHandle: null,
    };
    const triggerHandles = new DeterministicLiveHandles('trigger');
    const trigger = executeTemplateCompilerLiveBindingCommand(new TemplateCompilerLiveBindingCommandRequest(
      new TemplateCompilerReadView(
        progressionRuntime.workspace.store,
        TemplateCompilerWorldAuthority.fixed(progressionCompilation.compilerWorld),
      ),
      site.ownerView!,
      site.owner!.element.toReference(),
      site.attribute.toReference(),
      triggerSyntax,
      'trigger',
      triggerHandles,
    ));
    expect(trigger.state).toBe(TemplateCompilerLiveBindingCommandState.Executed);
    if (trigger.state !== TemplateCompilerLiveBindingCommandState.Executed) throw new Error('Expected trigger execution.');
    expect(trigger.ignoreAttr).toBe(true);
    expect(trigger.instructions[0]).toBeInstanceOf(ListenerBindingInstruction);
    expect(trigger.instructions[0]).toMatchObject({ eventName: 'click' });
    expect(triggerHandles.instructionRequests[0]?.sourceAddressHandle).toBe(site.attribute.sourceAddressHandle);
    expect(trigger.instructions[0]?.sourceAddressHandle).toBe(site.attribute.sourceAddressHandle);
    expect(trigger.expressionParses[0]).toMatchObject({ expression: 'save()', entryFamily: 'IsFunction' });
  });

  test('keeps a resolved custom command body as typed Open without allocating staged handles', () => {
    const site = opaqueCompilation.attributeOwnerProgression.readSites().find((candidate) =>
      candidate.attribute.rawName === 'value.open-command'
    );
    if (site?.ownerView == null || site.owner == null || site.syntax == null) {
      throw new Error('Expected reached custom binding-command site.');
    }
    const handles = new DeterministicLiveHandles('opaque');
    const result = executeTemplateCompilerLiveBindingCommand(new TemplateCompilerLiveBindingCommandRequest(
      new TemplateCompilerReadView(
        opaqueRuntime.workspace.store,
        TemplateCompilerWorldAuthority.fixed(opaqueCompilation.compilerWorld),
      ),
      site.ownerView,
      site.owner.element.toReference(),
      site.attribute.toReference(),
      reachedSyntax(site.syntax),
      'open-command',
      handles,
    ));

    expect(result.state).toBe(TemplateCompilerLiveBindingCommandState.Open);
    if (result.state !== TemplateCompilerLiveBindingCommandState.Open) throw new Error('Expected typed Open result.');
    expect(result.reasonKind).toBe(TemplateCompilerLiveBindingCommandOpenReasonKind.ExecutableBodyOpen);
    expect(result.command?.name).toBe('open-command');
    expect(result.outcome.state).toBe(BindingCommandLoweringState.Open);
    expect(result.commandRead.readKind).toBe(TemplateCompilerReadKind.BindingCommand);
    expect(result.compilerReads).toEqual([result.commandRead]);
    expect(result.expressionParses).toEqual([]);
    expect(handles.instructionRequests).toEqual([]);
    expect(handles.expressionRequests).toEqual([]);
  });
});

class DeterministicLiveHandles implements TemplateCompilerLiveBindingCommandHandleFactory {
  readonly instructionRequests: TemplateCompilerLiveInstructionHandleRequest[] = [];
  readonly expressionRequests: TemplateCompilerLiveExpressionHandleRequest[] = [];
  private readonly handles: KernelHandleFactory;

  constructor(local: string) {
    this.handles = new KernelHandleFactory(`contract:live-binding-command:${local}`);
  }

  instruction(request: TemplateCompilerLiveInstructionHandleRequest): BindingCommandInstructionAllocation {
    this.instructionRequests.push(request);
    const key = `instruction:${request.ordinal}:${request.instructionKind}:${request.local}`;
    return new BindingCommandInstructionAllocation(
      this.handles.product(key),
      this.handles.identity(key),
    );
  }

  expression(request: TemplateCompilerLiveExpressionHandleRequest) {
    this.expressionRequests.push(request);
    return this.handles.product(`expression:${request.ordinal}:${request.entryFamily}`);
  }
}

function reachedSyntax(syntax: AttributeSyntax): BindingCommandSyntax {
  return {
    rawValue: syntax.rawValue,
    target: syntax.target,
    targetSourceAddressHandle: syntax.targetSourceAddressHandle,
    commandSourceAddressHandle: syntax.commandSourceAddressHandle,
    parts: syntax.parts,
    patternParts: syntax.patternParts,
    sourceAddressHandle: syntax.sourceAddressHandle,
  };
}

function requiredProgressionSite(
  compilation: TemplateResourceCompilationEmission,
  elementId: string,
  rawName: string,
): TemplateCompilerAttributeOwnerProgressionSite {
  const site = compilation.attributeOwnerProgression.readSites().find((candidate) =>
    candidate.attribute.rawName === rawName
    && candidate.owner?.attributes.some((attribute) => attribute.rawName === 'id' && attribute.rawValue === elementId) === true
  );
  if (site?.ownerView == null || site.owner == null || site.syntax == null) {
    throw new Error(`Expected reached site '${elementId}:${rawName}'.`);
  }
  return site;
}

function requiredCompilation(
  resources: readonly { readonly compilation: TemplateResourceCompilationEmission }[],
  name: string,
): TemplateResourceCompilationEmission {
  const compilation = resources.find((resource) => resource.compilation.definition.name === name)?.compilation;
  if (compilation == null) throw new Error(`Expected compilation '${name}'.`);
  return compilation;
}
