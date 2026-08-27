import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { AttributeClassificationKind } from '../src/template/attribute-syntax.js';
import {
  BrowserEffectiveTemplateMaterializer,
  type BrowserEffectiveTemplateEmission,
} from '../src/template/browser-effective-template-materializer.js';
import { parseBrowserTemplateFragmentDraft } from '../src/template/browser-template-parser.js';
import { selectBrowserTemplateCompilerCarrier } from '../src/template/browser-template-selection.js';
import {
  TemplateCompilerReadView,
  TemplateCompilerWorldAuthority,
} from '../src/template/compiler-read-view.js';
import { TemplateCompilerExecutionSession } from '../src/template/template-compiler-execution.js';
import { executeTemplateCompilerHookBootstrap } from '../src/template/template-compiler-hook-bootstrap.js';
import { executeTemplateCompilerLocalExtraction } from '../src/template/template-compiler-local-extraction.js';
import {
  TemplateCompilerLiveAttributeCompletion,
  TemplateCompilerLiveAttributeSourceKind,
} from '../src/template/template-compiler-live-attribute-assembly.js';
import { TemplateCompilerLiveAttributeDisposition } from '../src/template/template-compiler-live-attribute-owner.js';
import { TemplateCompilerLiveAllocationSnapshotState } from '../src/template/template-compiler-live-allocation.js';
import {
  TemplateCompilerHydrateElementBlockerKind,
  TemplateCompilerHydrateElementBlockerScope,
  TemplateCompilerHydrateElementProcessContentState,
  TemplateCompilerHydrateElementProjectionState,
  TemplateCompilerHydrateElementStagingState,
} from '../src/template/template-compiler-hydrate-element-staging.js';
import { TemplateCompilerRootCompilationStateKind } from '../src/template/template-compiler-root-state.js';
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
import {
  bindTemplateCompilerRootSiteInvocation,
  TemplateCompilerSiteInvocationBindingState,
  type TemplateCompilerSiteInvocationBinding,
} from '../src/template/template-compiler-site-invocation.js';
import {
  executeTemplateCompilerRootSiteCursor,
  TemplateCompilerSiteCursorAttributeEvent,
  TemplateCompilerSiteCursorElementEvent,
  TemplateCompilerSiteCursorFrontierKind,
  TemplateCompilerSiteCursorPhaseEvent,
  TemplateCompilerSiteCursorPhaseKind,
  TemplateCompilerSiteCursorProcessContentEvent,
  TemplateCompilerSiteCursorResultState,
  TemplateCompilerSiteCursorSubtreeExclusionEvent,
  TemplateCompilerSiteCursorSurrogateValidationEvent,
  TemplateCompilerSiteCursorSurrogateValidationOutcome,
  TemplateCompilerSiteCursorTextEvent,
  type TemplateCompilerSiteCursorTranscript,
  type TemplateCompilerSiteCursorResult,
} from '../src/template/template-compiler-site-cursor.js';
import {
  TemplateCompilerOrdinaryRootCompletionRefusalKind,
  TemplateCompilerOrdinaryRootCompletionState,
} from '../src/template/template-compiler-root-completion.js';
import {
  assembleTemplateCompilerOrdinaryRootRows,
  TemplateCompilerCaptureSyntaxDecisionKind,
  TemplateCompilerOccurrenceRowAssemblyState,
  TemplateCompilerOccurrenceSourcePosture,
} from '../src/template/template-compiler-occurrence-row-assembly.js';
import {
  TemplateCompilerOccurrenceOnlyDisposition,
  TemplateCompilerSiteSpendDisposition,
} from '../src/template/template-compiler-site-spend-ledger.js';
import type {
  TemplateCompilationFamilyFrontDoorEmission,
  TemplateCompilationFrontDoorEmission,
  TemplateResourceCompilationEmission,
} from '../src/template/template-compilation-project-pass.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('template compiler root site cursor', () => {
  let fixture: CursorFixture;

  beforeAll(async () => {
    fixture = await CursorFixture.create();
  }, 30_000);

  afterAll(() => {
    fixture?.dispose();
  });

  test('completes a minimal root in exact content-before-surrogate order', () => {
    const transcript = fixture.transcript('cursor-empty');
    expect(transcript.frontier).toBeNull();
    expect(transcript.events.map((event) => event.ordinal))
      .toEqual(transcript.events.map((_, ordinal) => ordinal));
    expect(phaseKinds(transcript)).toEqual([
      TemplateCompilerSiteCursorPhaseKind.PreWalkRemainders,
      TemplateCompilerSiteCursorPhaseKind.ContentStart,
      TemplateCompilerSiteCursorPhaseKind.ContentEnd,
      TemplateCompilerSiteCursorPhaseKind.SurrogateValidationStart,
      TemplateCompilerSiteCursorPhaseKind.SurrogateValidationEnd,
      TemplateCompilerSiteCursorPhaseKind.SurrogateEnd,
    ]);
    expect(elementTags(transcript)).toEqual(['main', 'h1']);
    const texts = eventsOf(transcript, TemplateCompilerSiteCursorTextEvent);
    expect(texts).toHaveLength(2);
    expect(texts.filter((event) => event.bundle != null)).toHaveLength(1);
    const dynamic = texts.find((event) => event.bundle != null);
    const staticText = texts.find((event) => event.bundle == null);
    expect(dynamic?.instructionStaging?.isModuleConstructed()).toBe(true);
    expect(dynamic?.instructionStaging?.holes.map((hole) => hole.expressionChainIndex)).toEqual([0]);
    expect(dynamic?.instructionStaging?.instructions[0]).toMatchObject({
      instructionKind: 'text-binding',
      expressionChainIndex: 0,
      expressionProductHandle: dynamic.bundle?.expressionParse.productHandle,
    });
    expect(staticText?.occurrenceOnlyRow?.disposition).toBe('static-text-pass-through');
    expect(staticText?.instructionStaging).toBeNull();
    expect(transcript.allocationSnapshot.state).toBe(TemplateCompilerLiveAllocationSnapshotState.Complete);
    expect(transcript.allocationSnapshot.instructionAllocations).toHaveLength(1);
    expect(transcript.allocationSnapshot.instructionAllocations[0]?.instruction)
      .toBe(dynamic?.instructionStaging?.instructions[0]);
    expect(transcript.allocationSnapshot.sourceAllocations).toHaveLength(1);
    expect(transcript.allocationSnapshot.sourceAllocations[0]?.source)
      .toBe(dynamic?.instructionStaging?.holes[0]?.source);
    expect(transcript.allocationSnapshot.expressionAllocations).toEqual([]);
    const retainedInstruction = transcript.allocationSnapshot.instructionAllocations[0]!;
    const retainedSource = transcript.allocationSnapshot.sourceAllocations[0]!;
    expect(() => retainedInstruction.bind({}, retainedInstruction.instruction!)).toThrow();
    expect(() => retainedSource.bind({}, retainedSource.source!)).toThrow();
    const laterPhase = transcript.allocationSnapshot.ledger.namespace.beginPhase(
      `${transcript.binding.lane.localKey}:target-plan-test`,
    );
    expect(() => laterPhase.allocateInstruction(
      `${transcript.binding.lane.localKey}:target-plan-test:text`,
      'collision-canary',
      retainedInstruction.instructionKind,
      retainedInstruction.sourceAddressHandle,
      retainedInstruction.instructionLocal,
    )).toThrow();
    expect(transcript.nextTranscriptOrdinal).toBe(transcript.events.length);
    expect(transcript.nextSiteEventOrdinal).toBe(transcript.ledger.completion.nextSiteEventOrdinal);
  });

  test('reuses progressive owner-state bundles in the two mode-sensitive orders', () => {
    const transcript = fixture.transcript('cursor-progression');
    expect(transcript.frontier).toBeNull();
    const attributes = eventsOf(transcript, TemplateCompilerSiteCursorAttributeEvent);
    expect(attributes).toHaveLength(4);
    expect(attributes.map((event) => event.bundle?.classification.classificationKind)).toEqual([
      AttributeClassificationKind.Plain,
      AttributeClassificationKind.BindingCommand,
      AttributeClassificationKind.BindingCommand,
      AttributeClassificationKind.Plain,
    ]);
    expect(attributes.map((event) => event.spend?.disposition)).toEqual([
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
      TemplateCompilerSiteSpendDisposition.BrowserCompatible,
    ]);
    expect(attributes.map((event) => event.jitLiveOrdinal)).toEqual([0, 0, 0, 0]);
    expect(attributes.every((event) =>
      event.liveOwnerSite.disposition === TemplateCompilerLiveAttributeDisposition.Removed
    )).toBe(true);
  });

  test('visits implied table structure, excludes inert content, and stops at let after suppressing its children', () => {
    const transcript = fixture.transcript('cursor-shapes');
    expect(transcript.frontier?.frontierKind)
      .toBe(TemplateCompilerSiteCursorFrontierKind.LetElementLoweringRequired);
    const implied = eventsOf(transcript, TemplateCompilerSiteCursorElementEvent).find((event) =>
      event.element.tagName === 'tbody'
    );
    expect(implied?.occurrenceOnlyRow?.disposition).toBe('browser-implied-element-pass-through');
    const exclusions = eventsOf(transcript, TemplateCompilerSiteCursorSubtreeExclusionEvent);
    expect(exclusions.map((event) => event.disposition)).toEqual([
      TemplateCompilerSiteSpendDisposition.InertTemplateContent,
      TemplateCompilerSiteSpendDisposition.LetContentSuppressed,
    ]);
    expect(exclusions[0]?.spends.length).toBeGreaterThanOrEqual(2);
    expect(exclusions[1]?.spends).toHaveLength(1);
    expect(elementTags(transcript)).not.toContain('span');
  });

  test('uses browser foster order rather than authored preorder', () => {
    const transcript = fixture.transcript('cursor-foster');
    expect(transcript.frontier).toBeNull();
    expect(elementTags(transcript).slice(0, 2)).toEqual(['div', 'table']);
  });

  test('primes comment-shield factory remainders before walking selected carrier content', () => {
    const transcript = fixture.transcript('cursor-comment-shield');
    const prewalk = eventsOf(transcript, TemplateCompilerSiteCursorPhaseEvent)[0]!;
    expect(prewalk.phaseKind).toBe(TemplateCompilerSiteCursorPhaseKind.PreWalkRemainders);
    expect(prewalk.remainderReceipts.map((receipt) => receipt.remainderKind)).toContain(
      TemplateCompilerPreWalkRemainderKind.TemplateElementFactoryDiscarded,
    );
    expect(prewalk.remainderEvidence.every((evidence) => evidence.preWalkReceipt != null)).toBe(true);
    expect(elementTags(transcript)).toEqual(['span']);
  });

  test('validates every surrogate attribute before refusing a later invalid target without spends', () => {
    const transcript = fixture.transcript('cursor-surrogate-invalid');
    expect(transcript.frontier?.frontierKind)
      .toBe(TemplateCompilerSiteCursorFrontierKind.InvalidSurrogateAttribute);
    const validations = eventsOf(transcript, TemplateCompilerSiteCursorSurrogateValidationEvent);
    expect(validations.map((event) => event.outcome)).toEqual([
      TemplateCompilerSiteCursorSurrogateValidationOutcome.Valid,
      TemplateCompilerSiteCursorSurrogateValidationOutcome.Refused,
    ]);
    expect(validations.map((event) => event.parsed.value.execution.target)).toEqual(['data-ok', 'id']);
    expect(transcript.ledger.spends).toHaveLength(0);
  });

  test('preserves present-empty as-element for the exact empty resource read', () => {
    const transcript = fixture.transcript('cursor-as-element-empty');
    expect(transcript.frontier).toBeNull();
    const element = eventsOf(transcript, TemplateCompilerSiteCursorElementEvent).find((event) =>
      event.element.tagName === 'div'
    );
    expect(element?.lookupName).toBe('');
    expect(element?.asElementScalar?.currentValue).toBe('');
    expect(element?.elementRead?.value).toBeNull();
  });

  test('stops after attributes before projection ownership changes', () => {
    const transcript = fixture.transcript('cursor-projection');
    expect(transcript.frontier?.frontierKind)
      .toBe(TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeProjection);
    expect(transcript.frontier?.node).toBeInstanceOf(TemplateCompilerElementOccurrence);
    expect((transcript.frontier?.node as TemplateCompilerElementOccurrence).tagName).toBe('cursor-leaf');
    expect(elementTags(transcript)).not.toContain('span');
    expect(transcript.hydrateElementEnvelopes).toHaveLength(1);
    const envelope = transcript.hydrateElementEnvelopes[0]!;
    expect(envelope.state).toBe(TemplateCompilerHydrateElementStagingState.Pending);
    expect(envelope.instructionReady).toBe(false);
    expect(blockerProjection(envelope)).toEqual([
      [TemplateCompilerHydrateElementBlockerScope.Envelope, TemplateCompilerHydrateElementBlockerKind.ProjectionExtractionPending],
      [TemplateCompilerHydrateElementBlockerScope.Downstream, TemplateCompilerHydrateElementBlockerKind.TargetRowPlacementPending],
    ]);
    expect(envelope.draft?.projection.state).toBe(TemplateCompilerHydrateElementProjectionState.PendingExtraction);
    expect(envelope.draft?.projection.postProcessChildren).toHaveLength(1);
    expect((envelope.draft?.projection.postProcessChildren[0] as TemplateCompilerElementOccurrence).tagName).toBe('span');
    expect(envelope.draft?.processContent.state).toBe(TemplateCompilerHydrateElementProcessContentState.Absent);
    expect(envelope.draft?.containerless.effective).toBe(false);
  });

  test('stops on an exact authored reserved marker without publishing a local issue', () => {
    const transcript = fixture.transcript('cursor-marker');
    expect(transcript.frontier?.frontierKind)
      .toBe(TemplateCompilerSiteCursorFrontierKind.AuthoredCompilerMarkerReserved);
    expect(elementTags(transcript)).not.toContain('span');
  });

  test('accumulates native slot output only from reached shadow-root slots', () => {
    const validResult = fixture.run('cursor-slot-valid').execute();
    const valid = requireTranscript(validResult);
    expect(valid.frontier).toBeNull();
    expect(valid.rootState.stateKind).toBe(TemplateCompilerRootCompilationStateKind.Complete);
    expect(valid.rootState.hasSlots).toBe(true);
    expect(valid.rootState.nativeSlots).toHaveLength(1);
    expect(valid.rootState.nativeSlots[0]?.element.tagName).toBe('slot');
    expect(eventsOf(valid, TemplateCompilerSiteCursorAttributeEvent).map((event) =>
      event.scalar.qualifiedName
    )).toEqual(['name.bind']);
    const completedSlot = validResult.completion?.receipt?.elementSites.find((site) =>
      site.event.lookupName === 'slot'
    );
    expect(completedSlot?.owner.contributions.map((contribution) => contribution.syntax?.target)).toEqual(['name']);
    expect(completedSlot?.owner.instructionStaging.directRowTail).toHaveLength(1);

    const inert = fixture.transcript('cursor-slot-inert');
    expect(inert.frontier).toBeNull();
    expect(inert.rootState.stateKind).toBe(TemplateCompilerRootCompilationStateKind.Complete);
    expect(inert.rootState.hasSlots).toBe(false);
    expect(inert.rootState.nativeSlots).toEqual([]);
    expect(eventsOf(inert, TemplateCompilerSiteCursorSubtreeExclusionEvent)).toHaveLength(1);
  });

  test('rejects a reached native slot before attributes, descendants, and later siblings without Shadow DOM', () => {
    const result = fixture.run('cursor-slot-invalid').execute();
    const transcript = requireTranscript(result);
    expect(transcript.frontier?.frontierKind)
      .toBe(TemplateCompilerSiteCursorFrontierKind.NativeSlotWithoutShadowDomInvalid);
    expect(transcript.rootState.stateKind).toBe(TemplateCompilerRootCompilationStateKind.Invalid);
    expect(transcript.rootState.hasSlots).toBe(false);
    expect(transcript.rootState.nativeSlots).toHaveLength(1);
    expect(elementTags(transcript)).toEqual(['slot']);
    expect(eventsOf(transcript, TemplateCompilerSiteCursorAttributeEvent)).toEqual([]);
    expect(transcript.ledger.spends).toEqual([]);
    expect(transcript.ledger.blockedByFrontier).toHaveLength(3);
    expect(result.completion?.state).toBe(TemplateCompilerOrdinaryRootCompletionState.Ineligible);
    expect(result.completion?.refusals.map((refusal) => refusal.refusalKind)).toEqual([
      TemplateCompilerOrdinaryRootCompletionRefusalKind.CursorFrontier,
      TemplateCompilerOrdinaryRootCompletionRefusalKind.RootStateInvalid,
      TemplateCompilerOrdinaryRootCompletionRefusalKind.RootPhaseIncomplete,
    ]);
    expect(result.completion?.receipt).toBeNull();
  });

  test('mints nominal ordinary-root receipts without using authored accounting openness as the gate', () => {
    const names = [
      'cursor-as-element-empty',
      'cursor-comment-shield',
      'cursor-empty',
      'cursor-foster',
      'cursor-live-duplicate',
      'cursor-live-multi-binding',
      'cursor-live-nonsingular',
      'cursor-live-staging',
      'cursor-progression',
      'cursor-row-interleave',
      'cursor-row-merged',
      'cursor-slot-inert',
      'cursor-slot-valid',
      'cursor-wide',
    ];
    const assemblies = new Map<string, NonNullable<ReturnType<typeof assembleTemplateCompilerOrdinaryRootRows>['assembly']>>();
    for (const name of names) {
      const result = fixture.run(name).execute();
      const transcript = requireTranscript(result);
      const completion = result.completion;
      const receipt = completion?.receipt;
      const completionLabel = `${name}: ${completion?.refusals.map((refusal) => refusal.refusalKind).join(',')}`;
      expect(completion?.state, completionLabel).toBe(TemplateCompilerOrdinaryRootCompletionState.Complete);
      expect(completion?.refusals, name).toEqual([]);
      expect(receipt?.isModuleConstructed(), name).toBe(true);
      expect(receipt?.isCurrent(), name).toBe(true);
      expect(receipt?.transcript, name).toBe(transcript);
      expect(receipt?.endpoint, name).toBe(result.siteEndpoint);
      expect(receipt?.endpoint.laneOperationCount, name).toBe(transcript.endLaneOperationCount);
      expect(receipt?.compilerReads, name).toEqual(transcript.compilerReads.readAll());
      expect(receipt?.elementSites.map((site) => site.event.element), name)
        .toEqual(transcript.attributeOwners.map((owner) => owner.element));
      expect(new Set(receipt?.elementSites.map((site) => site.rowSlotKey)).size, name)
        .toBe(receipt?.elementSites.length);
      const rowResult = assembleTemplateCompilerOrdinaryRootRows(receipt!);
      expect(rowResult.state, name).toBe(TemplateCompilerOccurrenceRowAssemblyState.Exact);
      expect(rowResult.reasons, name).toEqual([]);
      const rowAssembly = rowResult.assembly;
      if (rowAssembly == null) throw new Error(`Expected occurrence row assembly for '${name}'.`);
      expect(new Set([
        ...rowAssembly.rows.map((row) => row.site),
        ...rowAssembly.staticSites.map((site) => site.site),
      ]).size, name).toBe(receipt?.orderedSites.length);
      assemblies.set(name, rowAssembly);
    }

    const duplicate = requireTranscript(fixture.run('cursor-live-duplicate').execute());
    expect(duplicate.ledger.state).toBe('open');
    expect(duplicate.ledger.rawUnspent).toHaveLength(2);

    expect(assemblies.get('cursor-empty')?.rows.map((row) => row.instructionKinds)).toEqual([
      ['text-binding'],
    ]);
    expect(assemblies.get('cursor-live-staging')?.rows.map((row) => row.instructionKinds)).toEqual([
      ['hydrate-element'],
      ['hydrate-element'],
      ['hydrate-attribute'],
      ['property-binding', 'property-binding'],
    ]);
    expect(assemblies.get('cursor-live-staging')?.rows[0]?.hydrateElement?.envelope.captures)
      .toHaveLength(3);
    expect(assemblies.get('cursor-live-staging')?.rows[0]?.hydrateElement?.captures.map((capture) =>
      capture.decisionKind
    )).toEqual([
      TemplateCompilerCaptureSyntaxDecisionKind.ReuseAuthored,
      TemplateCompilerCaptureSyntaxDecisionKind.ReuseAuthored,
      TemplateCompilerCaptureSyntaxDecisionKind.EffectiveSyntaxRequired,
    ]);
    expect(assemblies.get('cursor-live-nonsingular')?.rows.some((row) =>
      row.sourcePosture === TemplateCompilerOccurrenceSourcePosture.BrowserEffective
    )).toBe(true);
    expect(assemblies.get('cursor-foster')?.staticSites.map((site) => [
      site.site.siteKind === 'element' ? site.site.event.element.tagName : 'text',
      site.sourcePosture,
    ])).toEqual([
      ['table', TemplateCompilerOccurrenceSourcePosture.AuthoredExact],
      ['text', TemplateCompilerOccurrenceSourcePosture.AuthoredExact],
    ]);
    expect(assemblies.get('cursor-slot-valid')?.receipt.transcript.rootState.hasSlots).toBe(true);
    expect(assemblies.get('cursor-row-interleave')?.rows.map((row) => [
      row.site.siteKind,
      row.instructionKinds,
    ])).toEqual([
      ['text', ['text-binding']],
      ['text', ['text-binding']],
      ['element', ['property-binding']],
      ['text', ['text-binding']],
      ['element', ['property-binding']],
      ['text', ['text-binding']],
    ]);
    expect(assemblies.get('cursor-row-interleave')?.textExpansions.map((expansion) =>
      expansion.outputs.map((output) => output.outputKind === 'static' ? output.text : 'hole')
    )).toEqual([
      ['before ', 'hole', ' middle ', 'hole', ' end'],
      ['inner ', 'hole', ' tail'],
      ['after ', 'hole', ' done\n'],
    ]);
    expect(assemblies.get('cursor-row-merged')?.rows.map((row) => row.instructionKinds)).toEqual([
      ['hydrate-element', 'hydrate-attribute', 'property-binding'],
    ]);
    expect(assemblies.get('cursor-row-merged')?.rows[0]?.hydrateElement?.envelope.bindableInstructions)
      .toHaveLength(1);
    expect(assemblies.get('cursor-as-element-empty')?.rows).toEqual([]);
    expect(assemblies.get('cursor-slot-inert')?.rows).toEqual([]);

    const duplicateRows = assemblies.get('cursor-live-duplicate')?.rows ?? [];
    expect(duplicateRows.map((row) => row.instructionKinds.length)).toEqual([1, 2]);
    expect(duplicateRows.map((row) => row.instructionTargets)).toEqual([
      ['title'],
      ['contentEditable', 'textContent'],
    ]);

    const nonSingularRows = assemblies.get('cursor-live-nonsingular')?.rows ?? [];
    expect(nonSingularRows).toHaveLength(2);
    expect(nonSingularRows.every((row) =>
      row.sourcePosture === TemplateCompilerOccurrenceSourcePosture.BrowserEffective
      && row.authoredNode == null
    )).toBe(true);
    expect(nonSingularRows.map((row) => row.instructionTargets)).toEqual([['title'], ['title']]);

    const wideRows = assemblies.get('cursor-wide')?.rows ?? [];
    expect(wideRows).toHaveLength(1);
    expect(wideRows[0]?.instructions).toHaveLength(128);
    expect(wideRows[0]?.instructionTargets).toEqual(Array.from({ length: 128 }, (_, index) => `data-${index}`));

    const mergedRow = assemblies.get('cursor-row-merged')?.rows[0];
    if (mergedRow?.site.siteKind !== 'element') throw new Error('Expected merged element row.');
    expect(mergedRow.instructionTargets).toEqual(['cursor-merged-leaf', 'cursor-merged-ca', 'data-extra']);
    expect(mergedRow.hydrateElement?.envelope.bindableInstructions.map((instruction) =>
      'targetProperty' in instruction ? instruction.targetProperty : null
    )).toEqual(['title']);
    const hydrateAttribute = mergedRow.instructions.find((instruction) =>
      instruction.instructionKind === 'hydrate-attribute'
    );
    if (hydrateAttribute == null || !('bindingInstructionProductHandles' in hydrateAttribute)) {
      throw new Error('Expected merged HydrateAttribute instruction.');
    }
    const mergedInstructions = new Map(mergedRow.site.owner.instructionStaging.instructions.map((instruction) => [
      instruction.productHandle,
      instruction,
    ]));
    expect(hydrateAttribute.bindingInstructionProductHandles.map((handle) => {
      const instruction = mergedInstructions.get(handle);
      return instruction != null && 'targetProperty' in instruction ? instruction.targetProperty : null;
    })).toEqual(['value']);

    const allRows = [...assemblies.values()].flatMap((assembly) => assembly.rows);
    expect(allRows).toHaveLength(26);
    expect(allRows.reduce((count, row) => count + row.instructionKinds.length, 0)).toBe(159);
    const instructionKindCounts = Object.fromEntries([...new Set(allRows.flatMap((row) => row.instructionKinds))]
      .map((kind) => [kind, allRows.flatMap((row) => row.instructionKinds).filter((candidate) => candidate === kind).length]));
    expect(instructionKindCounts).toEqual({
      'text-binding': 6,
      'property-binding': 141,
      interpolation: 3,
      'hydrate-attribute': 6,
      'hydrate-element': 3,
    });
  });

  test('never promotes the current typed ordinary-root frontiers into completion receipts', () => {
    const names = [
      'cursor-containerless',
      'cursor-live-empty',
      'cursor-marker',
      'cursor-open',
      'cursor-process-content-arbitrary',
      'cursor-projection',
      'cursor-shadow-containerless',
      'cursor-shapes',
      'cursor-slot-invalid',
      'cursor-slots-containerless',
      'cursor-surrogate-invalid',
      'cursor-surrogate-valid',
      'cursor-template-controller',
      'cursor-usage-containerless',
    ];
    for (const name of names) {
      const result = fixture.run(name).execute();
      expect(requireTranscript(result).frontier, name).not.toBeNull();
      expect(result.completion?.state, name).toBe(TemplateCompilerOrdinaryRootCompletionState.Ineligible);
      expect(result.completion?.receipt, name).toBeNull();
      expect(result.completion?.refusals.map((refusal) => refusal.refusalKind), name)
        .toContain(TemplateCompilerOrdinaryRootCompletionRefusalKind.CursorFrontier);
    }
  });

  test('revokes a completion receipt when its exact pre-plan forest endpoint advances', () => {
    const run = fixture.freshRun('cursor-progression');
    const result = run.execute();
    const receipt = result.completion?.receipt;
    if (receipt == null || result.siteEndpoint == null) throw new Error('Expected fresh current completion receipt.');
    expect(receipt.isCurrent()).toBe(true);

    const attribute = run.binding.forest.readAttributes()[0];
    if (attribute == null) throw new Error('Expected one live attribute for endpoint invalidation.');
    run.binding.forest.rewriteAttributeValue(attribute, `${attribute.value}:after-receipt`);

    expect(run.binding.execution.siteExecutionEndpointIsCurrent(result.siteEndpoint)).toBe(false);
    expect(receipt.isCurrent()).toBe(false);
    expect(assembleTemplateCompilerOrdinaryRootRows(receipt).state)
      .toBe(TemplateCompilerOccurrenceRowAssemblyState.Ineligible);
  });

  test('keeps central structural effects and reached live invalidity distinct', () => {
    const expected = new Map<string, TemplateCompilerSiteCursorFrontierKind>([
      ['cursor-template-controller', TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeTemplateController],
      ['cursor-containerless', TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeContainerless],
      ['cursor-usage-containerless', TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeContainerless],
      ['cursor-open', TemplateCompilerSiteCursorFrontierKind.ReachedLiveAttributeInvalid],
    ]);
    let containerless: TemplateCompilerSiteCursorTranscript | null = null;
    for (const [name, frontier] of expected) {
      const transcript = fixture.transcript(name);
      if (name === 'cursor-containerless') containerless = transcript;
      expect(transcript.frontier?.frontierKind, name).toBe(frontier);
      expect(transcript.frontier?.frontierKind, name)
        .not.toBe(TemplateCompilerSiteCursorFrontierKind.ReachedNormalizedInvalid);
    }
    const invalid = eventsOf(
      fixture.transcript('cursor-open'),
      TemplateCompilerSiteCursorAttributeEvent,
    )[0];
    expect(invalid?.liveContribution?.classification.issue).toMatchObject({
      issueKind: 'unknown-binding-command',
      frameworkErrorCode: 'AUR0713',
    });
    if (containerless == null) throw new Error('Expected containerless transcript.');
    expect(containerless.hydrateElementEnvelopes).toHaveLength(1);
    const envelope = containerless.hydrateElementEnvelopes[0]!;
    expect(envelope.state).toBe(TemplateCompilerHydrateElementStagingState.Exact);
    expect(envelope.instructionReady).toBe(true);
    expect(envelope.draft?.containerless).toMatchObject({
      effective: true,
      fromDefinition: true,
      fromUsage: false,
    });
    expect(blockerProjection(envelope)).toEqual([
      [TemplateCompilerHydrateElementBlockerScope.Downstream, TemplateCompilerHydrateElementBlockerKind.ContainerlessPlacementPending],
      [TemplateCompilerHydrateElementBlockerScope.Downstream, TemplateCompilerHydrateElementBlockerKind.TargetRowPlacementPending],
    ]);
  });

  test('keeps usage-only containerless distinct from effective target placement', () => {
    const transcript = fixture.transcript('cursor-usage-containerless');
    expect(transcript.frontier?.frontierKind)
      .toBe(TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeContainerless);
    expect(transcript.hydrateElementEnvelopes).toHaveLength(1);
    const envelope = transcript.hydrateElementEnvelopes[0]!;
    expect(envelope.state).toBe(TemplateCompilerHydrateElementStagingState.Exact);
    expect(envelope.draft?.containerless).toMatchObject({
      effective: true,
      fromDefinition: false,
      fromUsage: true,
    });
    expect(blockerProjection(envelope)).toEqual([
      [TemplateCompilerHydrateElementBlockerScope.Downstream, TemplateCompilerHydrateElementBlockerKind.ContainerlessPlacementPending],
      [TemplateCompilerHydrateElementBlockerScope.Downstream, TemplateCompilerHydrateElementBlockerKind.TargetRowPlacementPending],
    ]);
  });

  test('rejects usage containerless whenever the custom element requires a native shadow host', () => {
    const cases = [
      ['cursor-shadow-containerless', 'shadow'],
      ['cursor-slots-containerless', 'slots'],
    ] as const;
    for (const [name, cause] of cases) {
      const transcript = fixture.transcript(name);
      expect(transcript.frontier?.frontierKind, name)
        .toBe(TemplateCompilerSiteCursorFrontierKind.HydrateElementEnvelopeInvalid);
      expect(transcript.hydrateElementEnvelopes, name).toHaveLength(1);
      const envelope = transcript.hydrateElementEnvelopes[0]!;
      expect(envelope.state, name).toBe(TemplateCompilerHydrateElementStagingState.Invalid);
      expect(envelope.instructionReady, name).toBe(false);
      if (cause === 'shadow') {
        expect(envelope.draft?.definition.shadowOptions, name).toMatchObject({ mode: 'open' });
      } else {
        expect(envelope.draft?.definition.hasSlots, name).toBe(true);
        expect(envelope.draft?.elementRead.observation.resultParts.slice(-4), name)
          .toEqual(['false', 'false', 'true', 'false']);
      }
      expect(envelope.draft?.containerless, name).toMatchObject({
        effective: true,
        fromDefinition: false,
        fromUsage: true,
      });
      expect(blockerProjection(envelope), name).toEqual([
        [TemplateCompilerHydrateElementBlockerScope.Downstream, TemplateCompilerHydrateElementBlockerKind.ContainerlessPlacementPending],
        [TemplateCompilerHydrateElementBlockerScope.Envelope, TemplateCompilerHydrateElementBlockerKind.ContainerlessShadowHostInvalid],
        [TemplateCompilerHydrateElementBlockerScope.Downstream, TemplateCompilerHydrateElementBlockerKind.TargetRowPlacementPending],
      ]);
    }
  });

  test('executes canonical AuSlot processContent before host attributes with exact removal spending', () => {
    const cases = [
      ['cursor-process-content', 'default', null],
      ['cursor-process-content-empty', '', ''],
      ['cursor-process-content-named', 'heading', 'heading'],
      ['cursor-process-content-duplicate-name', 'first', 'first'],
    ] as const;
    let named: TemplateCompilerSiteCursorTranscript | null = null;
    for (const [name, expectedName, expectedCarrier] of cases) {
      const result = fixture.run(name).execute();
      const transcript = requireTranscript(result);
      if (name === 'cursor-process-content-named') named = transcript;
      const processEvents = eventsOf(transcript, TemplateCompilerSiteCursorProcessContentEvent);
      expect(processEvents, name).toHaveLength(1);
      const event = processEvents[0]!;
      expect(result.siteEndpoint?.siteOperations, name).toEqual([event.result.operation]);
      expect(result.siteEndpoint?.laneOperationCount, name).toBe(transcript.endLaneOperationCount);
      expect(result.completion?.state, name).toBe(TemplateCompilerOrdinaryRootCompletionState.Ineligible);
      expect(result.completion?.receipt, name).toBeNull();
      expect(result.completion?.refusals.map((refusal) => refusal.refusalKind), name)
        .toContain(TemplateCompilerOrdinaryRootCompletionRefusalKind.CursorFrontier);
      expect(event.result.metadata.name, name).toBe(expectedName);
      expect(event.result.nameCarrier?.value ?? null, name).toBe(expectedCarrier);
      expect(event.result.operation.executionOrdinal, name).toBe(transcript.startGlobalOperationCount);
      expect(transcript.endGlobalOperationCount - transcript.startGlobalOperationCount, name).toBe(1);
      expect(transcript.expectedEndGlobalOperationCount, name).toBe(transcript.endGlobalOperationCount);
      expect(transcript.expectedEndForestMutationRevision, name).toBe(transcript.endForestMutationRevision);
      const firstHostAttributeOrdinal = transcript.events.findIndex((candidate) =>
        candidate instanceof TemplateCompilerSiteCursorAttributeEvent && candidate.owner === event.host
      );
      if (firstHostAttributeOrdinal >= 0) expect(event.ordinal, name).toBeLessThan(firstHostAttributeOrdinal);
      if (name === 'cursor-process-content') {
        expect(transcript.hydrateElementEnvelopes).toHaveLength(1);
        const envelope = transcript.hydrateElementEnvelopes[0]!;
        expect(envelope.state).toBe(TemplateCompilerHydrateElementStagingState.Exact);
        expect(envelope.instructionReady).toBe(true);
        expect(envelope.draft).toMatchObject({
          elementName: 'au-slot',
          resourceLookupName: 'au-slot',
        });
        expect(envelope.draft?.processContent.state).toBe(TemplateCompilerHydrateElementProcessContentState.Exact);
        expect(envelope.draft?.processContent.result).toBe(event.result);
        expect(envelope.draft?.processContent.metadata).toMatchObject({
          name: 'default',
          nameSourceAddressHandle: null,
        });
        expect(envelope.draft?.projection.state).toBe(TemplateCompilerHydrateElementProjectionState.None);
        expect(envelope.draft?.projection.postProcessChildren).toEqual([]);
        expect(envelope.draft?.containerless).toMatchObject({
          effective: true,
          fromDefinition: true,
          fromUsage: false,
        });
        expect(envelope.draft?.endpoint).toMatchObject({
          forestMutationRevision: transcript.endForestMutationRevision,
          globalOperationCount: transcript.endGlobalOperationCount,
        });
      } else if (name === 'cursor-process-content-empty') {
        const envelope = transcript.hydrateElementEnvelopes[0]!;
        expect(envelope.state).toBe(TemplateCompilerHydrateElementStagingState.Exact);
        expect(envelope.draft?.processContent.metadata?.name).toBe('');
        expect(envelope.draft?.processContent.metadata?.nameSourceAddressHandle).not.toBeNull();
      } else if (name === 'cursor-process-content-named') {
        const envelope = transcript.hydrateElementEnvelopes[0]!;
        expect(transcript.frontier?.frontierKind)
          .toBe(TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeProjection);
        expect(envelope.state).toBe(TemplateCompilerHydrateElementStagingState.Pending);
        expect(envelope.draft?.processContent.state).toBe(TemplateCompilerHydrateElementProcessContentState.Exact);
        expect(envelope.draft?.projection.state).toBe(TemplateCompilerHydrateElementProjectionState.PendingExtraction);
        expect(envelope.draft?.projection.postProcessChildren.filter((child) =>
          child instanceof TemplateCompilerElementOccurrence
        ).map((child) => child.tagName)).toEqual(['b']);
      } else {
        const envelope = transcript.hydrateElementEnvelopes[0]!;
        expect(transcript.frontier?.frontierKind)
          .toBe(TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeContainerless);
        expect(envelope.state).toBe(TemplateCompilerHydrateElementStagingState.Exact);
        expect(envelope.draft?.processContent.state).toBe(TemplateCompilerHydrateElementProcessContentState.Exact);
        expect(envelope.draft?.processContent.metadata?.name).toBe('first');
        expect(envelope.draft?.processContent.metadata?.nameSourceAddressHandle).not.toBeNull();
        expect(blockerProjection(envelope)).toEqual([
          [TemplateCompilerHydrateElementBlockerScope.Downstream, TemplateCompilerHydrateElementBlockerKind.ContainerlessPlacementPending],
          [TemplateCompilerHydrateElementBlockerScope.Downstream, TemplateCompilerHydrateElementBlockerKind.TargetRowPlacementPending],
        ]);
        expect(transcript.ledger.authoredRemainderEvidence).toHaveLength(1);
        expect(transcript.ledger.rawUnspent).toHaveLength(1);
      }
    }

    if (named == null) throw new Error('Expected named processContent transcript.');
    const event = eventsOf(named, TemplateCompilerSiteCursorProcessContentEvent)[0]!;
    expect(event.result.removals.map((removal) => [
      removal.occurrence instanceof TemplateCompilerElementOccurrence
        ? removal.occurrence.tagName
        : removal.occurrence.nodeKind,
      removal.liveOrdinal,
    ])).toEqual([['span', 1], ['em', 1]]);
    expect(event.result.removedOccurrences.every((occurrence) => occurrence.parent == null)).toBe(true);
    expect(event.host.readChildren().some((child) =>
      child instanceof TemplateCompilerElementOccurrence && child.tagName === 'b'
    )).toBe(true);
    expect(event.removedSpends).toHaveLength(4);
    expect(event.removedSpends.map((spend) => spend.occurrence))
      .toEqual(event.result.removedSiteOccurrences);
    expect(event.removedSpends.every((spend) =>
      spend.disposition === TemplateCompilerSiteSpendDisposition.ProcessContentRemoved
      && spend.siteEventOrdinal == null
      && spend.causeOperation === event.result.operation
      && event.result.authorizesRemovedSiteOccurrence(spend.occurrence)
    )).toBe(true);
    expect(named.endForestMutationRevision - named.startForestMutationRevision).toBe(2);
  });

  test('keeps arbitrary processContent Open without admitting a site driver', () => {
    // Exact AuSlot -> arbitrary-hook chaining remains deferred: AuSlot currently reaches the projection/containerless
    // structural frontier before a later sibling can be visited, so composing that sequence here would fabricate reach.
    const run = fixture.run('cursor-process-content-arbitrary');
    const transcript = run.transcript();
    const repeated = run.transcript();
    expect(transcriptProjection(repeated)).toEqual(transcriptProjection(transcript));
    expect(transcript.frontier?.frontierKind).toBe(TemplateCompilerSiteCursorFrontierKind.BeforeProcessContent);
    expect(eventsOf(transcript, TemplateCompilerSiteCursorProcessContentEvent)).toEqual([]);
    expect(transcript.binding.execution.siteExecutionContext(transcript.binding.lane)).toBeNull();
    expect(transcript.endForestMutationRevision).toBe(transcript.startForestMutationRevision);
    expect(transcript.endGlobalOperationCount).toBe(transcript.startGlobalOperationCount);
    expect(repeated.binding.execution.siteExecutionContext(repeated.binding.lane)).toBeNull();
  });

  test('does not execute AuSlot from an unledgered name scalar', () => {
    const transcript = fixture.transcriptWithUnledgeredRewrite('cursor-process-content-named', 'name');

    expect(transcript.frontier?.frontierKind).toBe(TemplateCompilerSiteCursorFrontierKind.BeforeProcessContent);
    expect(eventsOf(transcript, TemplateCompilerSiteCursorProcessContentEvent)).toEqual([]);
    expect(transcript.endForestMutationRevision).toBe(transcript.startForestMutationRevision);
    expect(transcript.endGlobalOperationCount).toBe(transcript.startGlobalOperationCount);
    expect(transcript.binding.execution.siteExecutionContext(transcript.binding.lane)).toBeNull();
  });

  test('finishes all-valid surrogate validation before the dedicated classification frontier', () => {
    const transcript = fixture.transcript('cursor-surrogate-valid');
    expect(transcript.frontier?.frontierKind)
      .toBe(TemplateCompilerSiteCursorFrontierKind.SurrogateClassificationRequired);
    expect(phaseKinds(transcript)).toContain(TemplateCompilerSiteCursorPhaseKind.SurrogateValidationEnd);
    expect(eventsOf(transcript, TemplateCompilerSiteCursorSurrogateValidationEvent)).toHaveLength(1);
    expect(transcript.ledger.spends).toHaveLength(0);
  });

  test('spends an unledgered pre-bootstrap scalar as live relowering and stops', () => {
    const transcript = fixture.transcriptWithUnledgeredRewrite('cursor-progression', 'contenteditable');
    expect(transcript.frontier?.frontierKind)
      .toBe(TemplateCompilerSiteCursorFrontierKind.AtLiveAttributeRelowering);
    const attribute = eventsOf(transcript, TemplateCompilerSiteCursorAttributeEvent)[0]!;
    expect(attribute.spend?.disposition)
      .toBe(TemplateCompilerSiteSpendDisposition.BrowserReloweringRequired);
    expect(attribute.scalar.isExact()).toBe(false);
  });

  test('continues after successful duplicate-survivor relowering without erasing remainder evidence', () => {
    const transcript = fixture.transcript('cursor-live-duplicate');
    const attributes = eventsOf(transcript, TemplateCompilerSiteCursorAttributeEvent);

    expect(transcript.frontier).toBeNull();
    expect(attributes).toHaveLength(3);
    expect(attributes.every((event) =>
      event.liveContribution?.completion === TemplateCompilerLiveAttributeCompletion.Complete
    )).toBe(true);
    expect(attributes.map((event) => event.spend?.disposition)).toEqual([
      TemplateCompilerSiteSpendDisposition.BrowserReloweringRequired,
      TemplateCompilerSiteSpendDisposition.BrowserReloweringRequired,
      TemplateCompilerSiteSpendDisposition.BrowserReloweringRequired,
    ]);
    expect(transcript.ledger.authoredRemainderEvidence).toHaveLength(2);
    expect(transcript.ledger.rawUnspent).toHaveLength(2);
    expect(transcript.ledger.blockedByFrontier).toEqual([]);
    expect(attributes[2]?.liveContribution?.instructions[0]).toMatchObject({
      targetProperty: 'textContent',
      bindingMode: 'to-view',
    });
  });

  test('compiles non-singular reconstructed attributes as occurrence-owned rows', () => {
    const transcript = fixture.transcript('cursor-live-nonsingular');
    const attributes = eventsOf(transcript, TemplateCompilerSiteCursorAttributeEvent);

    expect(transcript.frontier).toBeNull();
    expect(attributes).toHaveLength(2);
    expect(attributes.every((event) =>
      event.liveContribution?.frame.source.sourceKind === TemplateCompilerLiveAttributeSourceKind.AuthoredNonSingular
      && event.liveContribution.completion === TemplateCompilerLiveAttributeCompletion.Complete
      && event.occurrenceOnlyRow?.disposition === TemplateCompilerOccurrenceOnlyDisposition.NonSingularBrowserOrigin
    )).toBe(true);
    expect(transcript.ledger.authoredRemainderEvidence).toHaveLength(1);
    expect(transcript.ledger.rawUnspent).toHaveLength(1);
  });

  test('carries complete ordered multi-binding contributions through the live cursor', () => {
    const transcript = fixture.transcript('cursor-live-multi-binding');
    const multiBindings = eventsOf(transcript, TemplateCompilerSiteCursorAttributeEvent)
      .flatMap((event) => event.liveContribution?.multiBinding == null ? [] : [event.liveContribution.multiBinding]);

    expect(transcript.frontier).toBeNull();
    expect(multiBindings).toHaveLength(4);
    expect(multiBindings.every((result) => result.completion === 'complete')).toBe(true);
    expect(multiBindings[0]?.instructions.map((instruction) => instruction.instructionKind)).toEqual([
      'set-property',
      'property-binding',
    ]);
    const segmentExpressions = transcript.allocationSnapshot.expressionAllocations.filter((allocation) =>
      allocation.entryFamily === 'Interpolation'
    );
    expect(segmentExpressions.length).toBeGreaterThan(0);
    expect(segmentExpressions.every((allocation) => allocation.sourceSpan != null)).toBe(true);
    const retainedExpression = segmentExpressions[0]!;
    expect(() => retainedExpression.bind(
      {},
      retainedExpression.compilerRead!,
      retainedExpression.result!,
      retainedExpression.sourceSpan,
    )).toThrow();
  });

  test('retains exact owner-scoped instruction staging on the cursor transcript', () => {
    const transcript = fixture.transcript('cursor-live-staging');
    const contributionSet = new Set(transcript.attributeOwners.flatMap((owner) => owner.contributions));
    const attributeEvents = eventsOf(transcript, TemplateCompilerSiteCursorAttributeEvent);
    const select = transcript.attributeOwners.find((owner) => owner.element.tagName === 'select');

    expect(transcript.frontier).toBeNull();
    expect(transcript.attributeOwners).toHaveLength(4);
    expect(attributeEvents.every((event) =>
      event.liveContribution != null && contributionSet.has(event.liveContribution)
    )).toBe(true);
    expect(select?.instructionStaging.finalOwnerView).toBe(select?.finalOwnerView);
    expect(select?.instructionStaging.directRowTail.map((instruction) =>
      'targetProperty' in instruction ? instruction.targetProperty : null
    )).toEqual(['multiple', 'value']);
    expect(transcript.allocationSnapshot.state).toBe(TemplateCompilerLiveAllocationSnapshotState.Complete);
    expect(transcript.allocationSnapshot.instructionAllocations.every((entry) => entry.instruction != null)).toBe(true);
    expect(transcript.allocationSnapshot.expressionAllocations.map((entry) => entry.expression).sort())
      .toEqual(['literal', 'multiple', 'static', 'value']);
    expect(transcript.allocationSnapshot.expressionAllocations.every((entry) =>
      entry.compilerRead != null && entry.result != null
    )).toBe(true);

    expect(transcript.hydrateElementEnvelopes).toHaveLength(4);
    const byTag = new Map(transcript.hydrateElementEnvelopes.map((envelope) => [
      envelope.element.tagName,
      envelope,
    ]));
    const capture = byTag.get('cursor-staging-capture');
    expect(capture?.state).toBe(TemplateCompilerHydrateElementStagingState.Exact);
    expect(capture?.instructionReady).toBe(true);
    expect(capture?.draft?.bindableInstructions.map((instruction) =>
      'targetProperty' in instruction ? instruction.targetProperty : null
    )).toEqual(['title']);
    expect(capture?.draft?.captures.map((entry) => entry.syntax.target)).toEqual([
      'id',
      'data-extra',
      'data-upper',
    ]);
    expect(blockerProjection(capture!)).toEqual([
      [TemplateCompilerHydrateElementBlockerScope.Downstream, TemplateCompilerHydrateElementBlockerKind.TargetRowPlacementPending],
      [TemplateCompilerHydrateElementBlockerScope.Downstream, TemplateCompilerHydrateElementBlockerKind.CaptureSyntaxPublicationPending],
    ]);

    const child = byTag.get('cursor-staging-child');
    expect(child?.state).toBe(TemplateCompilerHydrateElementStagingState.Exact);
    expect(child?.instructionReady).toBe(true);
    expect(child?.draft?.owner).toBe(child?.owner);
    expect(child?.draft?.source.authoredElement).toBe(child?.owner.authoredElement);
    expect(child?.owner.compilerReads().every((read) => child.compilerReads.includes(read))).toBe(true);
    expect(child?.draft?.bindableInstructions).toBe(child?.owner.instructionStaging.elementBindableInstructions);
    expect(child?.draft?.bindableInstructions).toMatchObject([{
      instructionKind: 'spread-value-binding',
      target: '$bindables',
    }]);
    expect(child?.draft?.captures).toEqual([]);
    expect(child?.draft?.projection.state).toBe(TemplateCompilerHydrateElementProjectionState.None);
    expect(child?.draft?.processContent.state).toBe(TemplateCompilerHydrateElementProcessContentState.Absent);
    expect(blockerProjection(child!)).toEqual([
      [TemplateCompilerHydrateElementBlockerScope.Downstream, TemplateCompilerHydrateElementBlockerKind.TargetRowPlacementPending],
    ]);

    for (const tag of ['div', 'select']) {
      const native = byTag.get(tag);
      expect(native?.state, tag).toBe(TemplateCompilerHydrateElementStagingState.NotApplicable);
      expect(native?.draft, tag).toBeNull();
      expect(native?.blockers, tag).toEqual([]);
      expect(native?.compilerReads, tag).toHaveLength(1);
      expect(native?.compilerReads[0], tag).toMatchObject({
        readKind: 'element-resource',
        canonicalKey: tag,
      });
    }
  });

  test('is deterministic and rejects foreign read/prewalk capabilities', () => {
    const run = fixture.run('cursor-empty');
    const first = run.transcript();
    const second = run.transcript();
    expect(transcriptProjection(second)).toEqual(transcriptProjection(first));

    const foreign = fixture.run('cursor-as-element-empty');
    const foreignReads = new TemplateCompilerReadView(
      fixture.runtime.workspace.store,
      TemplateCompilerWorldAuthority.fixed(foreign.compilation.compilerWorld),
    );
    const wrongReads = executeTemplateCompilerRootSiteCursor({
      binding: run.binding,
      compilerReads: foreignReads,
      preWalkAuthority: TemplateCompilerPreWalkRemainderAuthority.capture(run.binding),
    });
    expect(wrongReads.state).toBe(TemplateCompilerSiteCursorResultState.Mismatch);

    const wrongPrewalk = executeTemplateCompilerRootSiteCursor({
      binding: run.binding,
      compilerReads: run.reads(),
      preWalkAuthority: TemplateCompilerPreWalkRemainderAuthority.capture(foreign.binding),
    });
    expect(wrongPrewalk.state).toBe(TemplateCompilerSiteCursorResultState.Mismatch);
  });

  test('keeps a wide attribute walk linear without consulting indexOf-backed ordinals', () => {
    const nodeOrdinal = vi.spyOn(TemplateCompilerElementOccurrence.prototype, 'readParentOrdinal');
    const attributeOrdinal = vi.spyOn(TemplateCompilerAttributeOccurrence.prototype, 'readOwnerOrdinal');
    try {
      const transcript = fixture.transcript('cursor-wide');
      expect(eventsOf(transcript, TemplateCompilerSiteCursorAttributeEvent)).toHaveLength(128);
      expect(nodeOrdinal).not.toHaveBeenCalled();
      expect(attributeOrdinal).not.toHaveBeenCalled();
    } finally {
      nodeOrdinal.mockRestore();
      attributeOrdinal.mockRestore();
    }
  }, 30_000);
});

class CursorRun {
  constructor(
    readonly fixture: CursorFixture,
    readonly compilation: TemplateResourceCompilationEmission,
    readonly binding: TemplateCompilerSiteInvocationBinding,
  ) {}

  reads(): TemplateCompilerReadView {
    return new TemplateCompilerReadView(
      this.fixture.runtime.workspace.store,
      TemplateCompilerWorldAuthority.fixed(this.compilation.compilerWorld),
    );
  }

  execute(): TemplateCompilerSiteCursorResult {
    return executeTemplateCompilerRootSiteCursor({
      binding: this.binding,
      compilerReads: this.reads(),
      preWalkAuthority: TemplateCompilerPreWalkRemainderAuthority.capture(this.binding),
    });
  }

  transcript(): TemplateCompilerSiteCursorTranscript {
    return requireTranscript(this.execute());
  }
}

class CursorFixture {
  private readonly runs = new Map<string, CursorRun>();
  private freshRunOrdinal = 0;

  private constructor(
    readonly runtime: Awaited<ReturnType<typeof createSemanticRuntime>>,
    readonly browserRun: ReturnType<Awaited<ReturnType<typeof createSemanticRuntime>>['computationLifecycle']['begin']>,
    readonly frontDoor: TemplateCompilationFrontDoorEmission,
  ) {}

  static async create(): Promise<CursorFixture> {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, 'fixtures/pressure/template-compiler-site-cursor'),
      storeKey: 'contract:template-compiler-site-cursor',
    });
    const app = await runtime.openApp({ telemetry: { inquiryProfile: 'aot' } });
    const browserRun = runtime.computationLifecycle.begin({
      kind: 'template-compiler-site-cursor-test',
      reconciliationKey: app.project.projectKey,
      summary: 'Candidate-local browser cursor fixtures.',
    });
    return new CursorFixture(runtime, browserRun, app.emission.templates.frontDoor);
  }

  run(name: string): CursorRun {
    const existing = this.runs.get(name);
    if (existing != null) return existing;
    const compilation = [...this.frontDoor.appCompilations, ...this.frontDoor.authoringCompilations].find(
      (candidate) => candidate.definition.name === name,
    );
    if (compilation == null) throw new Error(`Expected cursor compilation '${name}'.`);
    const family = this.frontDoor.familyForOwner(compilation.familyOwnerHandle);
    if (family == null) throw new Error(`Expected current cursor family '${name}'.`);
    const binding = this.bind(compilation, family, `cursor-browser:${name}`);
    const run = new CursorRun(this, compilation, binding);
    this.runs.set(name, run);
    return run;
  }

  transcript(name: string): TemplateCompilerSiteCursorTranscript {
    return this.run(name).transcript();
  }

  freshRun(name: string): CursorRun {
    const compilation = this.compilation(name);
    const family = this.frontDoor.familyForOwner(compilation.familyOwnerHandle);
    if (family == null) throw new Error(`Expected current cursor family '${name}'.`);
    const ordinal = this.freshRunOrdinal++;
    return new CursorRun(
      this,
      compilation,
      this.bind(compilation, family, `cursor-browser:${name}:fresh:${ordinal}`),
    );
  }

  transcriptWithUnledgeredRewrite(name: string, attributeName: string): TemplateCompilerSiteCursorTranscript {
    const compilation = this.compilation(name);
    const family = this.frontDoor.familyForOwner(compilation.familyOwnerHandle);
    if (family == null) throw new Error(`Expected current cursor family '${name}'.`);
    const binding = this.bind(
      compilation,
      family,
      `cursor-browser:${name}:unledgered`,
      (forest) => {
        const attribute = forest.readAttributes().find((candidate) => candidate.name === attributeName);
        if (attribute == null) throw new Error(`Expected live attribute '${attributeName}'.`);
        forest.rewriteAttributeValue(attribute, `${attribute.value}:unledgered`);
      },
    );
    return new CursorRun(this, compilation, binding).transcript();
  }

  dispose(): void {
    this.browserRun.abort();
    this.runtime.retireWorkspaceIncarnation();
  }

  private bind(
    compilation: TemplateResourceCompilationEmission,
    family: TemplateCompilationFamilyFrontDoorEmission,
    localKey: string,
    prepareForest: ((forest: TemplateCompilerOccurrenceForest) => void) | null = null,
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
        throw new Error(`No-local cursor fixture '${compilation.definition.name}' requested a definition reservation.`);
      },
    });
    const closure = execution.closeInvocationBootstrap(hook, local);
    const graphExact = buildTemplateCompilerNormalizedSiteIndex(compilation);
    if (graphExact.state !== TemplateCompilerNormalizedSiteIndexState.GraphExact) {
      throw new Error(`Expected GraphExact cursor precedent '${compilation.definition.name}'.`);
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
      throw new Error(`Expected exact cursor binding: ${result.reasons.map((reason) => reason.summary).join(' ')}`);
    }
    return result.binding;
  }

  private compilation(name: string): TemplateResourceCompilationEmission {
    const compilation = [...this.frontDoor.appCompilations, ...this.frontDoor.authoringCompilations].find(
      (candidate) => candidate.definition.name === name,
    );
    if (compilation == null) throw new Error(`Expected cursor compilation '${name}'.`);
    return compilation;
  }

  private materializeBrowser(
    compilation: TemplateResourceCompilationEmission,
    localKey: string,
  ): BrowserEffectiveTemplateEmission {
    const markup = compilation.unit.templateSource.markup;
    if (markup == null || compilation.html.draft == null) {
      throw new Error(`Cursor compilation '${compilation.definition.name}' has no retained markup/draft.`);
    }
    const browser = parseBrowserTemplateFragmentDraft(markup);
    return new BrowserEffectiveTemplateMaterializer(this.browserRun).materialize({
      localKey,
      sourceRevision: compilation.definition.template?.authoredSourceRevision ?? `test:${localKey}`,
      templateSource: compilation.unit.templateSource,
      authoredHtml: compilation.html,
      browser,
      carrierSelection: selectBrowserTemplateCompilerCarrier(browser.fragment),
    });
  }
}

function eventsOf<TEvent>(
  transcript: TemplateCompilerSiteCursorTranscript,
  Type: abstract new (...args: never[]) => TEvent,
): readonly TEvent[] {
  return transcript.events.filter((event): event is TemplateCompilerSiteCursorEvent & TEvent => event instanceof Type);
}

function requireTranscript(result: TemplateCompilerSiteCursorResult): TemplateCompilerSiteCursorTranscript {
  if (result.state !== TemplateCompilerSiteCursorResultState.Transcript || result.transcript == null) {
    throw new Error(`Expected cursor transcript: ${result.reasons.map((reason) => reason.summary).join(' ')}`);
  }
  return result.transcript;
}

type TemplateCompilerSiteCursorEvent = TemplateCompilerSiteCursorTranscript['events'][number];

function phaseKinds(transcript: TemplateCompilerSiteCursorTranscript): readonly TemplateCompilerSiteCursorPhaseKind[] {
  return eventsOf(transcript, TemplateCompilerSiteCursorPhaseEvent).map((event) => event.phaseKind);
}

function elementTags(transcript: TemplateCompilerSiteCursorTranscript): readonly string[] {
  return eventsOf(transcript, TemplateCompilerSiteCursorElementEvent).map((event) => event.element.tagName);
}

function blockerProjection(
  envelope: TemplateCompilerSiteCursorTranscript['hydrateElementEnvelopes'][number],
): readonly (readonly [TemplateCompilerHydrateElementBlockerScope, TemplateCompilerHydrateElementBlockerKind])[] {
  return envelope.blockers.map((blocker) => [blocker.scope, blocker.blockerKind]);
}

function transcriptProjection(transcript: TemplateCompilerSiteCursorTranscript): unknown {
  return {
    frontier: transcript.frontier?.frontierKind ?? null,
    events: transcript.events.map((event) => ({
      kind: event.eventKind,
      phase: event instanceof TemplateCompilerSiteCursorPhaseEvent ? event.phaseKind : null,
      element: event instanceof TemplateCompilerSiteCursorElementEvent ? event.element.tagName : null,
      attribute: event instanceof TemplateCompilerSiteCursorAttributeEvent ? event.scalar.qualifiedName : null,
    })),
    spends: transcript.ledger.spends.map((spend) => [spend.disposition, spend.siteEventOrdinal]),
  };
}
