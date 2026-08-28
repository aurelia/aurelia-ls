import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { KernelHandleFactory } from '../src/kernel/handles.js';
import { CustomAttributeDefinition } from '../src/resources/custom-attribute-definition.js';
import { BindingCommandInstructionAllocation } from '../src/template/binding-command-execution.js';
import {
  BrowserEffectiveTemplateMaterializer,
  type BrowserEffectiveTemplateEmission,
} from '../src/template/browser-effective-template-materializer.js';
import { parseBrowserTemplateFragmentDraft } from '../src/template/browser-template-parser.js';
import { selectBrowserTemplateCompilerCarrier } from '../src/template/browser-template-selection.js';
import {
  TemplateCompilerObservedValue,
  TemplateCompilerReadView,
  TemplateCompilerScopeClosureState,
  TemplateCompilerWorldAuthority,
} from '../src/template/compiler-read-view.js';
import type { TemplateCompilerReadObservation } from '../src/template/compiler-read-view.js';
import {
  HydrateAttributeInstruction,
  InterpolationInstruction,
  PropertyBindingInstruction,
  SetPropertyInstruction,
  SpreadValueBindingInstruction,
  TemplateBindingMode,
} from '../src/template/instruction-ir.js';
import { TemplateCompilerExecutionSession } from '../src/template/template-compiler-execution.js';
import { executeTemplateCompilerHookBootstrap } from '../src/template/template-compiler-hook-bootstrap.js';
import {
  assembleTemplateCompilerLiveAttributeOwner,
  TemplateCompilerLiveAttributeCompletion,
  TemplateCompilerLiveAttributeOpenReasonKind,
  TemplateCompilerLiveAttributeSourceKind,
  TemplateCompilerLiveAttributeStructuralEffectKind,
  type TemplateCompilerLiveAttributeOwnerResult,
} from '../src/template/template-compiler-live-attribute-assembly.js';
import {
  TemplateCompilerLiveAttributeDisposition,
  TemplateCompilerLiveAttributeOwnerInput,
  type TemplateCompilerLiveAttributeSuppressionAuthority,
} from '../src/template/template-compiler-live-attribute-owner.js';
import {
  TemplateCompilerLiveAllocationNamespace,
  type TemplateCompilerLiveAllocationLedger,
} from '../src/template/template-compiler-live-allocation.js';
import { executeTemplateCompilerLocalExtraction } from '../src/template/template-compiler-local-extraction.js';
import {
  buildTemplateCompilerNormalizedSiteIndex,
  TemplateCompilerNormalizedSiteIndexState,
} from '../src/template/template-compiler-normalized-site-index.js';
import {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerOccurrenceForest,
} from '../src/template/template-compiler-occurrence.js';
import {
  TemplateCompilerPreWalkRemainderAuthority,
  TemplateCompilerPreWalkRemainderKind,
} from '../src/template/template-compiler-prewalk-remainder.js';
import { TemplateCompilerReachedSiteSemanticResolver } from '../src/template/template-compiler-reached-site-semantics.js';
import {
  bindTemplateCompilerRootSiteInvocation,
  TemplateCompilerSiteInvocationBindingState,
  type TemplateCompilerSiteInvocationBinding,
} from '../src/template/template-compiler-site-invocation.js';
import { runtimeElementLookupName } from '../src/template/runtime-dom-name.js';
import type {
  TemplateCompilationFamilyFrontDoorEmission,
  TemplateCompilationFrontDoorEmission,
  TemplateResourceCompilationEmission,
} from '../src/template/template-compilation-project-pass.js';
import { ExpressionParseResultKind } from '../src/expression/parse-result-algebra.js';
import {
  HtmlAttributeReference,
  HtmlIrNodeKind,
  HtmlNodeReference,
} from '../src/template/html-ir.js';
import type { TemplateAttributeBindablesInfo } from '../src/template/compiler-world.js';
import {
  TemplateCompilerLiveMultiBindingCompletion,
  type TemplateCompilerLiveMultiBindingHandleAuthority,
  TemplateCompilerLiveMultiBindingReasonKind,
  TemplateCompilerLiveMultiBindingRequest,
  executeTemplateCompilerLiveMultiBinding,
} from '../src/template/template-compiler-live-multi-binding.js';
import type { ParsedMultiBindingSegment } from '../src/template/multi-binding-segments.js';
import type {
  TemplateCompilerLiveBindingCommandHandleFactory,
  TemplateCompilerLiveExpressionHandleRequest,
  TemplateCompilerLiveInstructionHandleRequest,
} from '../src/template/template-compiler-live-binding-command.js';
import { TemplateCompilerElementInstructionStagingState } from '../src/template/template-compiler-instruction-staging.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('template compiler live attribute owner assembly', () => {
  let fixture: LiveAttributeAssemblyFixture;

  beforeAll(async () => {
    fixture = await LiveAttributeAssemblyFixture.create();
  }, 30_000);

  afterAll(() => {
    fixture?.dispose();
  });

  test('reassembles browser duplicate survivors against the reached owner instead of authored owner shape', () => {
    const run = fixture.run('cursor-live-duplicate');
    const [canonical, ownerSensitive] = elements(run.binding.execution.forest, 'div');
    if (canonical == null || ownerSensitive == null) throw new Error('Expected duplicate-pressure divs.');

    const canonicalResult = run.assemble(canonical);
    expect(canonicalResult.completion).toBe(TemplateCompilerLiveAttributeCompletion.Complete);
    expect(canonicalResult.contributions).toHaveLength(1);
    expect(canonicalResult.contributions[0]?.frame.source.sourceKind)
      .toBe(TemplateCompilerLiveAttributeSourceKind.AuthoredExact);
    expect(canonicalResult.contributions[0]?.instructions).toEqual([
      expect.objectContaining({
        instructionKind: 'property-binding',
        targetProperty: 'title',
        bindingMode: TemplateBindingMode.ToView,
      }),
    ]);
    const dropped = run.preWalk.readAll().filter((receipt) =>
      receipt.remainderKind === TemplateCompilerPreWalkRemainderKind.HtmlTreeBuilderDropped
    );
    expect(dropped).toHaveLength(2);
    expect(dropped.every((receipt) => receipt.retainedPredecessorProductHandle != null)).toBe(true);

    const ownerResult = run.assemble(ownerSensitive);
    expect(ownerResult.completion).toBe(TemplateCompilerLiveAttributeCompletion.Complete);
    expect(ownerResult.contributions.map((entry) => entry.disposition)).toEqual([
      TemplateCompilerLiveAttributeDisposition.Removed,
      TemplateCompilerLiveAttributeDisposition.Removed,
    ]);
    const textContent = ownerResult.contributions[1]!;
    const liveInstruction = textContent.instructions[0];
    expect(liveInstruction).toBeInstanceOf(PropertyBindingInstruction);
    expect(liveInstruction).toMatchObject({
      targetProperty: 'textContent',
      bindingMode: TemplateBindingMode.ToView,
    });
    expect(textContent.frame.liveSite.ownerView.hasAttribute('contenteditable')).toBe(false);
    expect(textContent.frame.source.authoredPrecedent?.command?.instructions[0]).toMatchObject({
      bindingMode: TemplateBindingMode.TwoWay,
    });
    expect(ownerResult.compilerReadsAreClosedAndCurrent()).toBe(true);
  });

  test('records empty template-controller no-binding policy without suppressing the JIT parser call', () => {
    const run = fixture.run('cursor-live-empty');
    const element = elements(run.binding.execution.forest, 'div')[0];
    if (element == null) throw new Error('Expected empty template-controller host.');

    const result = run.assemble(element);
    const contribution = result.contributions[0]!;
    expect(result.completion).toBe(TemplateCompilerLiveAttributeCompletion.Complete);
    expect(contribution.valueSelection).toMatchObject({
      siteKind: 'template-controller-value',
      emptyValueBindingPolicy: 'no-binding',
    });
    expect(contribution.valueParse?.read.value.kind).toBe(ExpressionParseResultKind.InterpolationAbsent);
    expect(contribution.instructions).toEqual([]);
    expect(contribution.disposition).toBe(TemplateCompilerLiveAttributeDisposition.Removed);
    expect(result.instructionStaging).toMatchObject({
      state: TemplateCompilerElementInstructionStagingState.Complete,
      directRowTail: [],
    });
    expect(result.instructionStaging.templateControllers).toHaveLength(1);
    expect(result.instructionStaging.templateControllers[0]?.props).toEqual([]);
  });

  test('keeps non-exact scalar history terminally open before parser or classifier execution', () => {
    const run = fixture.run('cursor-progression', (forest) => {
      const attribute = forest.readAttributes().find((candidate) => candidate.name === 'contenteditable');
      if (attribute == null) throw new Error('Expected contenteditable occurrence.');
      forest.rewriteAttributeValue(attribute, `${attribute.value}:unledgered`);
    });
    const element = elements(run.binding.execution.forest, 'div')[0];
    if (element == null) throw new Error('Expected progression div.');

    const result = run.assemble(element);
    expect(result.completion).toBe(TemplateCompilerLiveAttributeCompletion.Open);
    expect(result.contributions).toHaveLength(1);
    expect(result.terminalContribution?.reason?.reasonKind)
      .toBe(TemplateCompilerLiveAttributeOpenReasonKind.SourceAuthorityOpen);
    expect(result.terminalContribution?.syntax).toBeNull();
    expect(result.terminalContribution?.frame.source.sourceKind)
      .toBe(TemplateCompilerLiveAttributeSourceKind.Open);
  });

  test('lowers each non-singular browser reconstruction without selecting an arbitrary authored bundle', () => {
    const run = fixture.run('cursor-live-nonsingular');
    const reconstructed = elements(run.binding.execution.forest, 'i');
    expect(reconstructed).toHaveLength(2);

    const results = reconstructed.map((element) => run.assemble(element));
    expect(results.map((result) => result.completion)).toEqual([
      TemplateCompilerLiveAttributeCompletion.Complete,
      TemplateCompilerLiveAttributeCompletion.Complete,
    ]);
    expect(results.map((result) => result.contributions[0]?.frame.source.sourceKind)).toEqual([
      TemplateCompilerLiveAttributeSourceKind.AuthoredNonSingular,
      TemplateCompilerLiveAttributeSourceKind.AuthoredNonSingular,
    ]);
    expect(results.map((result) => result.contributions[0]?.frame.source.authoredPrecedent)).toEqual([null, null]);
    expect(results.map((result) => result.contributions[0]?.instructions[0])).toEqual([
      expect.objectContaining({ targetProperty: 'title', bindingMode: TemplateBindingMode.ToView }),
      expect.objectContaining({ targetProperty: 'title', bindingMode: TemplateBindingMode.ToView }),
    ]);
    expect(results[0]?.contributions[0]?.frame.attribute).not.toBe(results[1]?.contributions[0]?.frame.attribute);
  });

  test('preserves special-attribute effects without invoking the attribute parser', () => {
    const run = fixture.run('cursor-as-element-empty');
    const element = elements(run.binding.execution.forest, 'div')[0];
    if (element == null) throw new Error('Expected as-element div.');

    const result = run.assemble(element);
    expect(result.completion).toBe(TemplateCompilerLiveAttributeCompletion.Complete);
    expect(result.lookupName).toBe('');
    expect(result.contributions[0]).toMatchObject({
      syntax: null,
      structuralEffects: [TemplateCompilerLiveAttributeStructuralEffectKind.AsElementLookup],
      disposition: TemplateCompilerLiveAttributeDisposition.Removed,
    });
  });

  test('assembles only the exact logically visible owner sequence without mutating the forest', () => {
    const run = fixture.run('cursor-live-staging');
    const element = elements(run.binding.execution.forest, 'cursor-staging-capture')[0];
    if (element == null) throw new Error('Expected capture custom element.');
    const physicalBefore = [...element.readAttributes()];
    const suppressed = physicalBefore[0]!;
    const revision = run.binding.execution.forest.mutationRevision;
    const ownerInput = TemplateCompilerLiveAttributeOwnerInput.capture(
      run.binding.execution.forest,
      element,
      revision,
      testSuppressionAuthority(
        run.binding.execution.forest,
        element,
        [suppressed],
      ),
    );

    const result = run.assemble(element, ownerInput);

    expect(result.ownerInput).toBe(ownerInput);
    expect(result.contributions.map((entry) => entry.frame.attribute)).toEqual(physicalBefore.slice(1));
    expect(result.contributions[0]?.frame.liveSite).toMatchObject({
      originalForestOrdinal: 1,
      simulatedLiveOrdinal: 0,
    });
    expect(result.contributions.every((entry) => !entry.frame.liveSite.ownerView.hasAttribute(suppressed.name)))
      .toBe(true);
    expect(result.finalOwnerView.hasAttribute(suppressed.name)).toBe(false);
    expect(element.readAttributes()).toEqual(physicalBefore);
    expect(run.binding.execution.forest.mutationRevision).toBe(revision);
  });

  test('keeps a wide reached owner linear and command-complete', () => {
    const ordinal = vi.spyOn(TemplateCompilerAttributeOccurrence.prototype, 'readOwnerOrdinal');
    try {
      const run = fixture.run('cursor-wide');
      const element = elements(run.binding.execution.forest, 'div')[0];
      if (element == null) throw new Error('Expected wide div.');
      const result = run.assemble(element);

      expect(result.completion).toBe(TemplateCompilerLiveAttributeCompletion.Complete);
      expect(result.contributions).toHaveLength(128);
      expect(result.contributions.every((entry) =>
        entry.frame.liveSite.simulatedLiveOrdinal === 0
        && entry.instructions[0] instanceof PropertyBindingInstruction
      )).toBe(true);
      expect(ordinal).not.toHaveBeenCalled();
    } finally {
      ordinal.mockRestore();
    }
  }, 30_000);

  test('keeps a wide logically suppressed assembly linear without consulting owner ordinals', () => {
    const ordinal = vi.spyOn(TemplateCompilerAttributeOccurrence.prototype, 'readOwnerOrdinal');
    try {
      const run = fixture.run('cursor-wide');
      const element = elements(run.binding.execution.forest, 'div')[0];
      if (element == null) throw new Error('Expected wide div occurrence.');
      const suppressed = element.readAttributes()[64]!;
      const revision = run.binding.execution.forest.mutationRevision;
      const input = TemplateCompilerLiveAttributeOwnerInput.capture(
        run.binding.execution.forest,
        element,
        revision,
        testSuppressionAuthority(
          run.binding.execution.forest,
          element,
          [suppressed],
        ),
      );
      const result = run.assemble(element, input);

      expect(result.completion).toBe(TemplateCompilerLiveAttributeCompletion.Complete);
      expect(result.contributions).toHaveLength(127);
      expect(result.contributions.some((entry) => entry.frame.attribute === suppressed)).toBe(false);
      expect(ordinal).not.toHaveBeenCalled();
    } finally {
      ordinal.mockRestore();
    }
  }, 30_000);

  test('keeps an open bindables receipt terminal before segment parsing or staged allocation', () => {
    const parsedAttribute = vi.fn();
    const compilerReads = {
      readBindables: () => new TemplateCompilerObservedValue(
        {} as TemplateAttributeBindablesInfo,
        {
          closure: { state: TemplateCompilerScopeClosureState.Open },
          validate: () => ({ isCurrent: true }),
        } as unknown as TemplateCompilerReadObservation,
      ),
      readParsedAttribute: parsedAttribute,
    } as unknown as TemplateCompilerReadView;
    const handles: TemplateCompilerLiveMultiBindingHandleAuthority = {
      segment() {
        throw new Error('Open bindables must prevent staged allocation.');
      },
    };
    const result = executeTemplateCompilerLiveMultiBinding(new TemplateCompilerLiveMultiBindingRequest(
      compilerReads,
      { tagName: 'div' },
      new HtmlNodeReference(HtmlIrNodeKind.Element, null, null, null),
      new HtmlAttributeReference(null, null, 'open-attr'),
      { name: 'open-attr' } as CustomAttributeDefinition,
      'value: message',
      handles,
    ));

    expect(result.completion).toBe(TemplateCompilerLiveMultiBindingCompletion.Open);
    expect(result.reason?.reasonKind).toBe(TemplateCompilerLiveMultiBindingReasonKind.BindablesOpen);
    expect(result.segments).toEqual([]);
    expect(result.remainder?.text).toBe('value: message');
    expect(parsedAttribute).not.toHaveBeenCalled();
  });

  test('executes plain and commanded inline segments in source order', () => {
    const run = fixture.run('cursor-live-multi-binding');
    const element = elementWithId(run.binding.execution.forest, 'plain-command');
    const result = run.assemble(element);
    const contribution = multiBindingContribution(result);
    const multiBinding = contribution.multiBinding!;

    expect(result.completion).toBe(TemplateCompilerLiveAttributeCompletion.Complete);
    expect(multiBinding.completion).toBe(TemplateCompilerLiveMultiBindingCompletion.Complete);
    expect(multiBinding.segments.map((segment) => ({
      name: segment.segment.rawName,
      value: segment.segment.rawValue,
      command: segment.syntax.command,
      bindable: segment.selection.bindable?.definition.name,
    }))).toEqual([
      { name: 'first', value: 'literal', command: null, bindable: 'first' },
      { name: 'second.bind', value: 'message', command: 'bind', bindable: 'second' },
    ]);
    expect(multiBinding.instructions).toEqual([
      expect.objectContaining({
        instructionKind: 'set-property',
        targetProperty: 'first',
        value: 'literal',
      }),
      expect.objectContaining({
        instructionKind: 'property-binding',
        targetProperty: 'second',
        bindingMode: TemplateBindingMode.ToView,
      }),
    ]);
    expect(multiBinding.instructions[0]).toBeInstanceOf(SetPropertyInstruction);
    expect(multiBinding.instructions[1]).toBeInstanceOf(PropertyBindingInstruction);
    expect(multiBinding.segments[0]?.valueParse?.read.value.kind)
      .toBe(ExpressionParseResultKind.InterpolationAbsent);
    expect(multiBinding.segments[0]?.valueSelection?.siteKind).toBe('custom-attribute-value');
    expect(multiBinding.segments[1]?.command?.expressionParses[0]).toMatchObject({
      expression: 'message',
      entryFamily: 'IsProperty',
    });
    expect(multiBinding.remainder).toBeNull();
    expect(contribution.instructions).toEqual(multiBinding.instructions);
    expect(result.instructionStaging.hydrateAttributes).toHaveLength(1);
    expect(result.instructionStaging.hydrateAttributes[0]).toBeInstanceOf(HydrateAttributeInstruction);
    expect(result.instructionStaging.hydrateAttributes[0]?.bindingInstructionProductHandles)
      .toEqual(multiBinding.instructions.map((instruction) => instruction.productHandle));
    expect(result.instructionStaging.directRowTail).toEqual(result.instructionStaging.hydrateAttributes);
    expect(result.compilerReadsAreClosedAndCurrent()).toBe(true);
  });

  test('stages live CE bindables, captures, spread, CA hydration, and native order in neutral buckets', () => {
    const run = fixture.run('cursor-live-staging');

    const capture = run.assemble(elementWithId(run.binding.execution.forest, 'capture'));
    expect(capture.instructionStaging.state).toBe(TemplateCompilerElementInstructionStagingState.Complete);
    expect(capture.instructionStaging.elementBindableInstructions).toEqual([
      expect.objectContaining({ instructionKind: 'set-property', targetProperty: 'title', value: 'literal' }),
    ]);
    expect(capture.instructionStaging.captures.map((entry) => entry.syntax.target)).toEqual([
      'id',
      'data-extra',
      'data-upper',
    ]);
    expect(capture.instructionStaging.directRowTail).toEqual([]);

    const spread = run.assemble(elementWithId(run.binding.execution.forest, 'spread'));
    expect(spread.instructionStaging.elementBindableInstructions).toHaveLength(1);
    expect(spread.instructionStaging.elementBindableInstructions[0]).toBeInstanceOf(SpreadValueBindingInstruction);
    expect(spread.instructionStaging.elementBindableInstructions[0]).toMatchObject({
      target: '$bindables',
      value: 'spread',
    });

    const customAttribute = run.assemble(elementWithId(run.binding.execution.forest, 'custom-attribute'));
    expect(customAttribute.instructionStaging.hydrateAttributes).toHaveLength(1);
    expect(customAttribute.instructionStaging.hydrateAttributes[0]).toMatchObject({
      resourceLookupName: 'cursor-staging-ca',
      resourceName: 'cursor-staging-ca',
      resourceAlias: null,
    });
    expect(customAttribute.instructionStaging.instructions).toEqual(expect.arrayContaining([
      expect.objectContaining({ instructionKind: 'set-property', targetProperty: 'value', value: 'static' }),
      expect.objectContaining({ instructionKind: 'hydrate-attribute' }),
    ]));

    const nativeOrder = run.assemble(elementWithId(run.binding.execution.forest, 'native-order'));
    expect(nativeOrder.instructionStaging.plainInstructions.map(instructionTarget)).toEqual(['value', 'multiple']);
    expect(nativeOrder.instructionStaging.orderedPlainInstructions.map(instructionTarget)).toEqual(['multiple', 'value']);
    expect(nativeOrder.instructionStaging.directRowTail).toEqual(nativeOrder.instructionStaging.orderedPlainInstructions);
    expect(nativeOrder.instructionStaging.finalOwnerView).toBe(nativeOrder.finalOwnerView);
  });

  test('keeps escaped multi-binding delimiters inside their original segment values', () => {
    const run = fixture.run('cursor-live-multi-binding');
    const result = run.assemble(elementWithId(run.binding.execution.forest, 'escaped'));
    const multiBinding = multiBindingContribution(result).multiBinding!;

    expect(result.completion).toBe(TemplateCompilerLiveAttributeCompletion.Complete);
    expect(multiBinding.segments.map((segment) => segment.segment.rawValue)).toEqual([
      'left\\;middle\\:right',
      'tail',
    ]);
    expect(multiBinding.instructions).toEqual([
      expect.objectContaining({ targetProperty: 'first', value: 'left\\;middle\\:right' }),
      expect.objectContaining({ targetProperty: 'second', value: 'tail' }),
    ]);
    expect(multiBinding.segments.every((segment) =>
      segment.valueParse?.read.value.kind === ExpressionParseResultKind.InterpolationAbsent
    )).toBe(true);
  });

  test('terminates at the first non-bindable segment and retains later text only as remainder', () => {
    const run = fixture.run('cursor-live-multi-binding');
    const site = reachedMultiBindingSite(run, 'first-invalid');
    const parsedAttribute = vi.spyOn(run.reads, 'readParsedAttribute');
    const parsedExpression = vi.spyOn(run.reads, 'readParsedExpression');
    const multiBinding = executeReachedMultiBinding(
      run,
      site,
      'first: okay; missing.bind: nope; second.bind: later',
      'first-invalid',
    );

    expect(multiBinding.completion).toBe(TemplateCompilerLiveMultiBindingCompletion.Invalid);
    expect(multiBinding.segments.map((segment) => segment.segment.rawName)).toEqual([
      'first',
      'missing.bind',
    ]);
    expect(multiBinding.terminalSegment).toBe(multiBinding.segments[1]);
    expect(multiBinding.reason?.reasonKind).toBe(TemplateCompilerLiveMultiBindingReasonKind.BindingToNonBindable);
    expect(multiBinding.compilerIssue).toMatchObject({
      issueKind: 'binding-to-non-bindable',
      frameworkErrorCode: 'AUR0707',
    });
    expect(multiBinding.instructions).toEqual([]);
    expect(multiBinding.stagedInstructions).toEqual([
      expect.objectContaining({ instructionKind: 'set-property', targetProperty: 'first', value: 'okay' }),
    ]);
    expect(multiBinding.remainder).toMatchObject({
      text: '; second.bind: later',
    });
    expect(multiBinding.remainder?.start).toBe(multiBinding.terminalSegment?.segment.end);
    expect(parsedAttribute.mock.calls.map(([name, value]) => [name, value])).toEqual([
      ['first', 'okay'],
      ['missing.bind', 'nope'],
    ]);
    expect(parsedExpression.mock.calls.map(([value, entry]) => [value, entry])).toEqual([
      ['okay', 'Interpolation'],
    ]);
  });

  test('classifies an absent segment command as compiler-invalid without committing prefix output', () => {
    const run = fixture.run('cursor-live-multi-binding');
    const site = reachedMultiBindingSite(run, 'unknown-command');
    const parsedAttribute = vi.spyOn(run.reads, 'readParsedAttribute');
    const parsedExpression = vi.spyOn(run.reads, 'readParsedExpression');
    const multiBinding = executeReachedMultiBinding(
      run,
      site,
      'first.unknown-command: nope; second: later',
      'unknown-command',
    );

    expect(multiBinding.completion).toBe(TemplateCompilerLiveMultiBindingCompletion.Invalid);
    expect(multiBinding.terminalSegment?.syntax.command).toBe('unknown-command');
    expect(multiBinding.reason).toMatchObject({
      reasonKind: TemplateCompilerLiveMultiBindingReasonKind.UnknownBindingCommand,
      compilerIssue: {
        issueKind: 'unknown-binding-command',
        frameworkErrorCode: 'AUR0713',
      },
    });
    expect(multiBinding.instructions).toEqual([]);
    expect(multiBinding.stagedInstructions).toEqual([]);
    expect(multiBinding.remainder?.text).toBe('; second: later');
    expect(parsedAttribute.mock.calls.map(([name, value]) => [name, value])).toEqual([
      ['first.unknown-command', 'nope'],
    ]);
    expect(parsedExpression).not.toHaveBeenCalled();
  });

  test('retains the terminal parser result when a commanded segment is invalid', () => {
    const run = fixture.run('cursor-live-multi-binding');
    const site = reachedMultiBindingSite(run, 'unknown-command');
    const parsedAttribute = vi.spyOn(run.reads, 'readParsedAttribute');
    const parsedExpression = vi.spyOn(run.reads, 'readParsedExpression');
    const multiBinding = executeReachedMultiBinding(
      run,
      site,
      'first.for: { id, id } of items; second: later',
      'parser-invalid',
    );

    expect(multiBinding.completion).toBe(TemplateCompilerLiveMultiBindingCompletion.Invalid);
    expect(multiBinding.reason?.reasonKind).toBe(TemplateCompilerLiveMultiBindingReasonKind.CommandInvalid);
    expect(multiBinding.instructions).toEqual([]);
    expect(multiBinding.stagedInstructions).toHaveLength(1);
    expect(multiBinding.terminalExpressionParseResults).toEqual([
      expect.objectContaining({ kind: ExpressionParseResultKind.CompleteInputParseError }),
    ]);
    expect(multiBinding.abruptCommandFailure).toBeNull();
    expect(multiBinding.remainder?.text).toBe('; second: later');
    expect(parsedAttribute.mock.calls.map(([name, value]) => [name, value])).toEqual([
      ['first.for', '{ id, id } of items'],
    ]);
    expect(parsedExpression.mock.calls.map(([value, entry]) => [value, entry])).toEqual([
      ['{ id, id } of items', 'IsIterator'],
    ]);
  });
});

class LiveAttributeAssemblyRun {
  readonly preWalk: TemplateCompilerPreWalkRemainderAuthority;
  readonly reads: TemplateCompilerReadView;
  readonly allocations: TemplateCompilerLiveAllocationLedger;

  constructor(
    readonly fixture: LiveAttributeAssemblyFixture,
    readonly compilation: TemplateResourceCompilationEmission,
    readonly binding: TemplateCompilerSiteInvocationBinding,
    readonly localKey: string,
  ) {
    this.preWalk = TemplateCompilerPreWalkRemainderAuthority.capture(binding);
    this.reads = new TemplateCompilerReadView(
      fixture.runtime.workspace.store,
      TemplateCompilerWorldAuthority.fixed(binding.compilerWorld),
    );
    this.allocations = new TemplateCompilerLiveAllocationNamespace(fixture.browserRun).beginPhase(localKey);
  }

  assemble(
    element: TemplateCompilerElementOccurrence,
    ownerInput: TemplateCompilerLiveAttributeOwnerInput | null = null,
  ): TemplateCompilerLiveAttributeOwnerResult {
    const reached = new TemplateCompilerReachedSiteSemanticResolver({
      execution: this.binding.execution,
      bootstrapClosure: this.binding.bootstrapClosure,
      compilerReads: this.reads,
      preWalk: this.preWalk,
      index: this.binding.index,
    });
    const asElement = reached.readAsElementScalar(element);
    const lookupName = runtimeElementLookupName(
      element.tagName,
      element.namespace,
      asElement?.scalar.currentValue ?? null,
    );
    return assembleTemplateCompilerLiveAttributeOwner({
      localKey: `${this.localKey}:${element.occurrenceKey}`,
      execution: this.binding.execution,
      bootstrapClosure: this.binding.bootstrapClosure,
      compilerReads: this.reads,
      preWalk: this.preWalk,
      element,
      lookupName,
      allocations: this.allocations,
      ownerInput,
    });
  }
}

class LiveAttributeAssemblyFixture {
  private runOrdinal = 0;

  private constructor(
    readonly runtime: Awaited<ReturnType<typeof createSemanticRuntime>>,
    readonly browserRun: ReturnType<Awaited<ReturnType<typeof createSemanticRuntime>>['computationLifecycle']['begin']>,
    readonly frontDoor: TemplateCompilationFrontDoorEmission,
  ) {}

  static async create(): Promise<LiveAttributeAssemblyFixture> {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, 'fixtures/pressure/template-compiler-site-cursor'),
      storeKey: 'contract:template-compiler-live-attribute-assembly',
    });
    const app = await runtime.openApp({ telemetry: { inquiryProfile: 'aot' } });
    const browserRun = runtime.computationLifecycle.begin({
      kind: 'template-compiler-live-attribute-assembly-test',
      reconciliationKey: app.project.projectKey,
      summary: 'Candidate-local live attribute assembly fixtures.',
    });
    return new LiveAttributeAssemblyFixture(runtime, browserRun, app.emission.templates.frontDoor);
  }

  run(
    name: string,
    prepareForest: ((forest: TemplateCompilerOccurrenceForest) => void) | null = null,
  ): LiveAttributeAssemblyRun {
    const compilation = [...this.frontDoor.appCompilations, ...this.frontDoor.authoringCompilations].find(
      (candidate) => candidate.definition.name === name,
    );
    if (compilation == null) throw new Error(`Expected assembly compilation '${name}'.`);
    const family = this.frontDoor.familyForOwner(compilation.familyOwnerHandle);
    if (family == null) throw new Error(`Expected current assembly family '${name}'.`);
    const localKey = `live-attribute:${name}:${this.runOrdinal++}`;
    return new LiveAttributeAssemblyRun(
      this,
      compilation,
      this.bind(compilation, family, localKey, prepareForest),
      localKey,
    );
  }

  dispose(): void {
    this.browserRun.abort();
    this.runtime.retireWorkspaceIncarnation();
  }

  private bind(
    compilation: TemplateResourceCompilationEmission,
    family: TemplateCompilationFamilyFrontDoorEmission,
    localKey: string,
    prepareForest: ((forest: TemplateCompilerOccurrenceForest) => void) | null,
  ): TemplateCompilerSiteInvocationBinding {
    const browserEmission = this.materializeBrowser(compilation, localKey);
    const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(browserEmission);
    prepareForest?.(forest);
    const execution = TemplateCompilerExecutionSession.createForForest(localKey, forest);
    const lane = execution.admitRootInvocation(compilation.localKey);
    const hook = executeTemplateCompilerHookBootstrap({
      execution,
      lane,
      compilerWorld: compilation.compilerWorld,
      executionOpenSeamHandle: this.browserRun.handles.openSeam(`${localKey}:hook-open`),
    });
    const local = executeTemplateCompilerLocalExtraction({
      execution,
      lane,
      hookBootstrap: hook,
      ownerName: compilation.definition.name,
      ownerCauseHandles: [compilation.definition.productHandle!],
      reserveDefinition: () => {
        throw new Error(`No-local assembly fixture '${compilation.definition.name}' requested a definition reservation.`);
      },
    });
    const closure = execution.closeInvocationBootstrap(hook, local);
    const graphExact = buildTemplateCompilerNormalizedSiteIndex(compilation);
    if (graphExact.state !== TemplateCompilerNormalizedSiteIndexState.GraphExact) {
      throw new Error(`Expected GraphExact assembly precedent '${compilation.definition.name}'.`);
    }
    const result = bindTemplateCompilerRootSiteInvocation({
      execution,
      bootstrapClosure: closure,
      browserEmission,
      graphExact,
      currentFrontDoor: this.frontDoor,
      currentFamily: family,
    });
    if (result.state !== TemplateCompilerSiteInvocationBindingState.Exact || result.binding == null) {
      throw new Error(`Expected exact assembly binding: ${result.reasons.map((reason) => reason.summary).join(' ')}`);
    }
    return result.binding;
  }

  private materializeBrowser(
    compilation: TemplateResourceCompilationEmission,
    localKey: string,
  ): BrowserEffectiveTemplateEmission {
    const markup = compilation.unit.templateSource.markup;
    if (markup == null || compilation.html.draft == null) {
      throw new Error(`Assembly compilation '${compilation.definition.name}' has no retained markup/draft.`);
    }
    const browser = parseBrowserTemplateFragmentDraft(markup);
    return new BrowserEffectiveTemplateMaterializer(this.browserRun).materialize({
      localKey: `browser:${localKey}`,
      sourceRevision: compilation.definition.template?.authoredSourceRevision ?? `test:${localKey}`,
      templateSource: compilation.unit.templateSource,
      authoredHtml: compilation.html,
      browser,
      carrierSelection: selectBrowserTemplateCompilerCarrier(browser.fragment),
    });
  }
}

function elements(
  forest: TemplateCompilerOccurrenceForest,
  tagName: string,
): readonly TemplateCompilerElementOccurrence[] {
  return forest.readNodes().filter((node): node is TemplateCompilerElementOccurrence =>
    node instanceof TemplateCompilerElementOccurrence && node.tagName === tagName
  );
}

function elementWithId(
  forest: TemplateCompilerOccurrenceForest,
  id: string,
): TemplateCompilerElementOccurrence {
  const element = forest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
    node instanceof TemplateCompilerElementOccurrence
    && node.readAttributes().some((attribute) => attribute.name === 'id' && attribute.value === id)
  );
  if (element == null) throw new Error(`Expected element #${id}.`);
  return element;
}

function multiBindingContribution(result: TemplateCompilerLiveAttributeOwnerResult) {
  const contribution = result.contributions.find((entry) => entry.multiBinding != null);
  if (contribution?.multiBinding == null) {
    throw new Error(`Expected one live multi-binding contribution: ${JSON.stringify(result.contributions.map((entry) => ({
      name: entry.frame.scalar.qualifiedName,
      source: entry.frame.source.sourceKind,
      completion: entry.completion,
      reason: entry.reason?.summary ?? null,
      value: entry.frame.scalar.currentValue,
    })))}`);
  }
  return contribution;
}

function testSuppressionAuthority(
  forest: TemplateCompilerOccurrenceForest,
  element: TemplateCompilerElementOccurrence,
  suppressedAttributes: readonly TemplateCompilerAttributeOccurrence[],
): TemplateCompilerLiveAttributeSuppressionAuthority {
  const forestMutationRevision = forest.mutationRevision;
  return {
    forest,
    element,
    forestMutationRevision,
    suppressedAttributes: [...suppressedAttributes],
    isCurrent: () => forest.mutationRevision === forestMutationRevision,
  };
}

function instructionTarget(instruction: PropertyBindingInstruction | InterpolationInstruction | object): string | null {
  return instruction instanceof PropertyBindingInstruction
    ? instruction.targetProperty
    : instruction instanceof InterpolationInstruction
      ? instruction.target
      : null;
}

function reachedMultiBindingSite(
  run: LiveAttributeAssemblyRun,
  elementId: string,
) {
  return multiBindingContribution(run.assemble(elementWithId(run.binding.execution.forest, elementId)));
}

function executeReachedMultiBinding(
  run: LiveAttributeAssemblyRun,
  site: ReturnType<typeof multiBindingContribution>,
  rawValue: string,
  local: string,
) {
  const definition = site.classification.resolvedDefinition;
  if (!(definition instanceof CustomAttributeDefinition)) {
    throw new Error('Expected exact custom-attribute definition for live multi-binding execution.');
  }
  const node = site.frame.source.authoredElement?.toReference();
  const attribute = site.frame.source.authoredAttribute?.toReference();
  if (node == null || attribute == null) throw new Error('Expected exact authored references for the reached site.');
  return executeTemplateCompilerLiveMultiBinding(new TemplateCompilerLiveMultiBindingRequest(
    run.reads,
    site.frame.liveSite.ownerView,
    node,
    attribute,
    definition,
    rawValue,
    new TestMultiBindingHandleAuthority(local),
  ));
}

class TestMultiBindingHandleAuthority implements TemplateCompilerLiveMultiBindingHandleAuthority {
  private readonly handles: KernelHandleFactory;

  constructor(local: string) {
    this.handles = new KernelHandleFactory(`contract:live-multi-binding:${local}`);
  }

  segment(segment: ParsedMultiBindingSegment): TemplateCompilerLiveBindingCommandHandleFactory {
    return new TestSegmentHandleAuthority(this.handles, segment.segmentIndex);
  }
}

class TestSegmentHandleAuthority implements TemplateCompilerLiveBindingCommandHandleFactory {
  constructor(
    private readonly handles: KernelHandleFactory,
    private readonly segmentIndex: number,
  ) {}

  instruction(request: TemplateCompilerLiveInstructionHandleRequest): BindingCommandInstructionAllocation {
    const local = `segment:${this.segmentIndex}:instruction:${request.ordinal}:${request.local}`;
    return new BindingCommandInstructionAllocation(
      this.handles.product(local),
      this.handles.identity(local),
    );
  }

  expression(request: TemplateCompilerLiveExpressionHandleRequest) {
    return this.handles.product(`segment:${this.segmentIndex}:expression:${request.ordinal}:${request.entryFamily}`);
  }
}
