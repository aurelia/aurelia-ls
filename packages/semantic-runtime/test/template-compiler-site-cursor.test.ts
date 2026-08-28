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
import { TemplateRenderTargetKind } from '../src/template/compiled-template.js';
import {
  HydrateElementInstruction,
  HydrateElementProjectionContributorDisposition,
  HydrateTemplateControllerInstruction,
  TemplateInstructionKind,
} from '../src/template/instruction-ir.js';
import {
  TemplateCompilerReadView,
  TemplateCompilerWorldAuthority,
} from '../src/template/compiler-read-view.js';
import {
  TemplateCompilerAttributeDetachmentMutation,
  TemplateCompilerExecutionSession,
  TemplateCompilerInvocationPhase,
  TemplateCompilerNodeDetachmentMutation,
  TemplateCompilerOccurrenceOperationTarget,
  TemplateCompilerOperationKind,
} from '../src/template/template-compiler-execution.js';
import {
  completeTemplateCompilerContextFamily,
  TemplateCompilerContextFamilyCompletionState,
} from '../src/template/template-compiler-context-family-completion.js';
import {
  prepareTemplateCompilerContextFamilyAllocation,
  TemplateCompilerContextFamilyAllocationState,
  TemplateCompilerFundedContextDefinitionOwnerKind,
} from '../src/template/template-compiler-context-family-allocation.js';
import {
  prepareTemplateCompilerContextFamilyTargetPlan,
  TemplateCompilerContextFamilyTargetPlanState,
} from '../src/template/template-compiler-context-family-target-plan.js';
import {
  prepareTemplateCompilerContextFamilyStructuralSchedule,
  TemplateCompilerFamilyContextInitializationKind,
  TemplateCompilerFamilyLoweredElementScheduleEntry,
} from '../src/template/template-compiler-context-family-structural-schedule.js';
import {
  assembleTemplateCompilerContextFamilyRows,
} from '../src/template/template-compiler-context-family-row-assembly.js';
import {
  prepareTemplateCompilerFamilyWireFunding,
  TemplateCompilerFamilyWireFundingState,
  TemplateCompilerFamilyWireResolution,
  TemplateCompilerFamilyWireRole,
} from '../src/template/template-compiler-family-wire-funding.js';
import { executeTemplateCompilerHookBootstrap } from '../src/template/template-compiler-hook-bootstrap.js';
import { executeTemplateCompilerLocalExtraction } from '../src/template/template-compiler-local-extraction.js';
import {
  TemplateCompilerLiveAttributeCompletion,
  TemplateCompilerLiveAttributeSourceKind,
  TemplateCompilerLiveAttributeTargetLane,
} from '../src/template/template-compiler-live-attribute-assembly.js';
import { TemplateCompilerLiveAttributeDisposition } from '../src/template/template-compiler-live-attribute-owner.js';
import {
  TemplateCompilerLiveAllocationLedgerState,
  TemplateCompilerLiveAllocationSnapshotState,
  TemplateCompilerLiveProductReservationRole,
} from '../src/template/template-compiler-live-allocation.js';
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
  TemplateCompilerCommentOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerFragmentOccurrence,
  TemplateCompilerGeneratedOccurrenceRole,
  type TemplateCompilerNodeOccurrence,
  TemplateCompilerOccurrenceForest,
  TemplateCompilerTextOccurrence,
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
  TemplateCompilerSiteCursorContainerlessPlacementEvent,
  TemplateCompilerSiteCursorContextKind,
  TemplateCompilerSiteCursorContextTaskState,
  TemplateCompilerSiteCursorElementEvent,
  TemplateCompilerSiteCursorFrontierKind,
  TemplateCompilerSiteCursorPhaseEvent,
  TemplateCompilerSiteCursorPhaseKind,
  TemplateCompilerSiteCursorProcessContentEvent,
  TemplateCompilerSiteCursorResultState,
  TemplateCompilerSiteCursorSubtreeExclusionEvent,
  TemplateCompilerSiteCursorSurrogateValidationEvent,
  TemplateCompilerSiteCursorSurrogateValidationOutcome,
  TemplateCompilerSiteCursorTemplateControllerTransitionEvent,
  TemplateCompilerSiteCursorTextEvent,
  TemplateCompilerSiteCursorTaskStopKind,
  TemplateCompilerSiteCursorTraversalMode,
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
  allocateTemplateCompilerOccurrenceTargetPlan,
  TemplateCompilerOccurrenceTargetPlanReasonKind,
  TemplateCompilerOccurrenceTargetPlanState,
} from '../src/template/template-compiler-occurrence-target-plan.js';
import {
  allocateTemplateCompilerOccurrenceHydrateElements,
  TemplateCompilerOccurrenceHydrateElementAllocationReasonKind,
  TemplateCompilerOccurrenceHydrateElementAllocationState,
} from '../src/template/template-compiler-occurrence-hydrate-element-allocation.js';
import { executeTemplateCompilerOccurrenceTarget } from '../src/template/template-compiler-occurrence-target-execution.js';
import {
  TemplateCompilerContainerlessReplacementPlacement,
  TemplateCompilerMarkerTargetPlacement,
  TemplateCompilerTemplateControllerGeneratedAppendPlacement,
  TemplateCompilerTemplateControllerSourceReplacementPlacement,
  TemplateCompilerTargetContextState,
  TemplateCompilerTargetContextRole,
  TemplateCompilerTargetPlan,
  TemplateCompilerTargetRowPlacementKind,
  TemplateCompilerTargetRowPosture,
  TemplateCompilerTargetRowSourceKind,
} from '../src/template/compiler-target-plan.js';
import {
  TemplateCompilerOccurrenceOnlyDisposition,
  TemplateCompilerSiteSpendDisposition,
} from '../src/template/template-compiler-site-spend-ledger.js';
import { TemplateProductDetails } from '../src/template/product-details.js';
import { TemplateCompilerStructuralExecutionSession } from '../src/template/template-compiler-structural-execution.js';
import type {
  TemplateCompilationFamilyFrontDoorEmission,
  TemplateCompilationFrontDoorEmission,
  TemplateResourceCompilationEmission,
} from '../src/template/template-compilation-project-pass.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
type CursorCandidateRun = ReturnType<
  Awaited<ReturnType<typeof createSemanticRuntime>>['computationLifecycle']['begin']
>;

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
    expect(envelope.draft?.projection.grouping.groups.map((group) => [
      group.slotName,
      group.members.map((member) => [
        member.node instanceof TemplateCompilerElementOccurrence ? member.node.tagName : member.node.nodeKind,
        member.disposition,
      ]),
    ])).toEqual([[
      'default',
      [['span', HydrateElementProjectionContributorDisposition.RetainedNode]],
    ]]);
    expect(envelope.draft?.projection.grouping.residualChildren).toEqual([]);
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

    const hydratePending = new Map([
      ['cursor-live-staging', assemblies.get('cursor-live-staging')!.rows
        .filter((row) => row.hydrateElement != null).map((row) => row.stableSlotKey)],
      ['cursor-row-merged', assemblies.get('cursor-row-merged')!.rows
        .filter((row) => row.hydrateElement != null).map((row) => row.stableSlotKey)],
    ]);
    const targetPlans = new Map<string, NonNullable<ReturnType<typeof allocateTemplateCompilerOccurrenceTargetPlan>['assembly']>>();
    for (const [name, rowAssembly] of assemblies) {
      const namespace = rowAssembly.receipt.transcript.allocationSnapshot.ledger.namespace;
      const reservationsBefore = namespace.readReservationCounts();
      let result = allocateTemplateCompilerOccurrenceTargetPlan(rowAssembly);
      let hydrateElements: NonNullable<
        ReturnType<typeof allocateTemplateCompilerOccurrenceHydrateElements>['assembly']
      > | null = null;
      const pendingSlots = hydratePending.get(name) ?? null;
      if (pendingSlots != null) {
        expect(result.state, name).toBe(TemplateCompilerOccurrenceTargetPlanState.Pending);
        expect(result.assembly, name).toBeNull();
        expect(result.reasons, name).toEqual([expect.objectContaining({
          reasonKind: TemplateCompilerOccurrenceTargetPlanReasonKind.HydrateElementInstructionRequired,
          stableRowSlotKeys: pendingSlots,
        })]);
        expect(allocateTemplateCompilerOccurrenceTargetPlan(rowAssembly).state, name)
          .toBe(TemplateCompilerOccurrenceTargetPlanState.Pending);
        expect(namespace.readReservationCounts(), name).toEqual(reservationsBefore);
        const hydrateResult = allocateTemplateCompilerOccurrenceHydrateElements(rowAssembly);
        expect(hydrateResult.state, name).toBe(TemplateCompilerOccurrenceHydrateElementAllocationState.Exact);
        hydrateElements = hydrateResult.assembly;
        if (hydrateElements == null) throw new Error(`Expected HydrateElement allocation for '${name}'.`);
        const effectiveCaptureCount = hydrateElements.heads.flatMap((head) => head.captures).filter((capture) =>
          capture.effectiveReservation != null
        ).length;
        expect(hydrateElements.heads, name).toHaveLength(pendingSlots.length);
        expect(hydrateElements.allocation.instructionAllocations, name).toHaveLength(pendingSlots.length);
        expect(hydrateElements.allocation.productReservations, name).toHaveLength(effectiveCaptureCount);
        expect(hydrateElements.allocation.expressionAllocations, name).toEqual([]);
        expect(hydrateElements.allocation.sourceAllocations, name).toEqual([]);
        expect(namespace.readReservationCounts(), name).toMatchObject({
          semanticSlots: reservationsBefore.semanticSlots + pendingSlots.length + effectiveCaptureCount,
          productHandles: reservationsBefore.productHandles + pendingSlots.length + effectiveCaptureCount,
          identityHandles: reservationsBefore.identityHandles + pendingSlots.length + effectiveCaptureCount,
          addressHandles: reservationsBefore.addressHandles,
        });
        expect(allocateTemplateCompilerOccurrenceHydrateElements(rowAssembly).assembly, name).toBe(hydrateElements);
        result = allocateTemplateCompilerOccurrenceTargetPlan(rowAssembly, hydrateElements);
      } else {
        expect(allocateTemplateCompilerOccurrenceHydrateElements(rowAssembly).state, name)
          .toBe(TemplateCompilerOccurrenceHydrateElementAllocationState.NotApplicable);
      }
      expect(result.state, name).toBe(TemplateCompilerOccurrenceTargetPlanState.Exact);
      const targetAssembly = result.assembly;
      if (targetAssembly == null) throw new Error(`Expected occurrence target plan for '${name}'.`);
      expect(targetAssembly.isCurrent(), name).toBe(true);
      expect(targetAssembly.targetPlan.isSealed, name).toBe(true);
      expect(targetAssembly.targetPlan.localKey, name).toBe(rowAssembly.receipt.endpoint.lane.localKey);
      expect(targetAssembly.targetPlan.root.state, name).toBe(TemplateCompilerTargetContextState.Complete);
      expect(targetAssembly.targetPlan.root.readFrontiers(), name).toEqual([]);
      expect(targetAssembly.targetPlan.root.readOwnedContexts(), name).toEqual([]);
      expect(targetAssembly.targetPlan.root.projectedTargetCount, name).toBe(rowAssembly.rows.length);
      expect(targetAssembly.targetPlan.root.exactGeometryPrefixEnd, name).toBeNull();
      expect(targetAssembly.targetPlan.root.readOccurrenceMemberships().map((membership) => membership.occurrence), name)
        .toEqual([
          rowAssembly.rootMembership.compilerCarrier,
          ...rowAssembly.occurrenceMemberships.map((membership) => membership.occurrence),
        ]);
      expect(targetAssembly.rootCompiledTemplate.productHandle, name)
        .not.toBe(rowAssembly.receipt.transcript.binding.compilation.compiledTemplate.compiledTemplate.productHandle);
      expect(targetAssembly.targetAllocation.productReservations, name).toEqual([targetAssembly.rootReservation]);
      const reservationsAfterFunding = pendingSlots == null
        ? reservationsBefore
        : {
            semanticSlots: reservationsBefore.semanticSlots
              + hydrateElements!.allocation.instructionAllocations.length
              + hydrateElements!.allocation.productReservations.length,
            productHandles: reservationsBefore.productHandles
              + hydrateElements!.allocation.instructionAllocations.length
              + hydrateElements!.allocation.productReservations.length,
            identityHandles: reservationsBefore.identityHandles
              + hydrateElements!.allocation.instructionAllocations.length
              + hydrateElements!.allocation.productReservations.length,
            addressHandles: reservationsBefore.addressHandles,
          };
      expect(namespace.readReservationCounts().productHandles, name)
        .toBe(reservationsAfterFunding.productHandles + 1);
      expect(targetAssembly.rowMappings.every((mapping) =>
        mapping.row.sourceKind === (mapping.draft.textOutput == null
          ? TemplateCompilerTargetRowSourceKind.RetainedOccurrence
          : TemplateCompilerTargetRowSourceKind.TextHole)
        && mapping.row.posture === TemplateCompilerTargetRowPosture.Complete
        && mapping.row.stableSlotKey === mapping.draft.stableSlotKey
        && mapping.row.publicationLocalKey === mapping.draft.stableSlotKey
        && mapping.row.placement.placementKind === mapping.draft.placementKind
      ), name).toBe(true);
      expect(allocateTemplateCompilerOccurrenceTargetPlan(rowAssembly, hydrateElements).assembly, name)
        .toBe(targetAssembly);
      targetPlans.set(name, targetAssembly);
    }
    expect(targetPlans.size).toBe(14);
    expect([...targetPlans.values()].reduce(
      (count, targetAssembly) => count + targetAssembly.targetPlan.root.readRows().length,
      0,
    )).toBe(26);
    const stagingPlan = targetPlans.get('cursor-live-staging')!;
    expect(stagingPlan.hydrateElements?.heads).toHaveLength(2);
    expect(stagingPlan.publicationPrerequisites).toMatchObject([{
      prerequisiteKind: 'effective-attribute-syntax-materialization',
    }]);
    const captureHead = stagingPlan.hydrateElements?.heads.find((head) => head.captures.length > 0);
    if (captureHead == null) throw new Error('Expected allocated capture HydrateElement head.');
    expect(captureHead?.captures.map((capture) => [
      capture.draft.decisionKind,
      capture.productHandle,
      capture.draft.authoredSyntax?.productHandle ?? null,
      capture.effectiveReservation?.productHandle ?? null,
    ])).toEqual([
      [TemplateCompilerCaptureSyntaxDecisionKind.ReuseAuthored,
        captureHead.captures[0]?.draft.authoredSyntax?.productHandle,
        captureHead.captures[0]?.draft.authoredSyntax?.productHandle, null],
      [TemplateCompilerCaptureSyntaxDecisionKind.ReuseAuthored,
        captureHead.captures[1]?.draft.authoredSyntax?.productHandle,
        captureHead.captures[1]?.draft.authoredSyntax?.productHandle, null],
      [TemplateCompilerCaptureSyntaxDecisionKind.EffectiveSyntaxRequired,
        captureHead.captures[2]?.effectiveReservation?.productHandle,
        null, captureHead.captures[2]?.effectiveReservation?.productHandle],
    ]);
    expect(captureHead?.instruction.containerless).toBe(captureHead?.head.envelope.containerless.fromUsage);
    for (const head of stagingPlan.hydrateElements?.heads ?? []) {
      expect(fixture.runtime.workspace.store.readProductDetail(
        TemplateProductDetails.Instruction,
        head.instruction.productHandle,
      )).toBeNull();
      expect(stagingPlan.rowMappings.find((mapping) => mapping.draft === head.row)?.row.instructions[0])
        .toBe(head.instruction);
      for (const capture of head.captures) {
        if (capture.effectiveReservation != null) {
          expect(fixture.runtime.workspace.store.readProductDetail(
            TemplateProductDetails.AttributeSyntax,
            capture.productHandle,
          )).toBeNull();
        }
        const disposition = stagingPlan.attributeDispositionMappings.find((mapping) =>
          mapping.draft.contribution === capture.draft.capture.contribution
        );
        expect(disposition?.causeHandles).toContain(head.instruction.productHandle);
        expect(disposition?.causeHandles).toContain(capture.productHandle);
      }
      for (const disposition of stagingPlan.attributeDispositionMappings.filter((mapping) =>
        mapping.draft.site === head.row.site
      )) {
        const input = disposition.draft.attribute.inputReference?.productHandle;
        if (input == null) throw new Error('Expected browser attribute cause.');
        const contribution = disposition.draft.contribution;
        if (contribution.targetLane === TemplateCompilerLiveAttributeTargetLane.ElementBindable) {
          expect(disposition.causeHandles).toEqual([
            input,
            head.instruction.productHandle,
            ...head.head.envelope.bindableInstructions.map((instruction) => instruction.productHandle),
          ]);
        } else if (contribution.targetLane === TemplateCompilerLiveAttributeTargetLane.Capture) {
          const capture = head.captures.find((candidate) =>
            candidate.draft.capture.contribution === contribution
          )!;
          expect(disposition.causeHandles).toEqual([
            input,
            head.instruction.productHandle,
            capture.productHandle,
          ]);
        } else {
          expect(disposition.causeHandles).toEqual(disposition.draft.causeHandles);
          expect(disposition.causeHandles).not.toContain(head.instruction.productHandle);
        }
      }
    }
    const mergedPlan = targetPlans.get('cursor-row-merged')!;
    expect(mergedPlan.hydrateElements?.heads).toHaveLength(1);
    expect(mergedPlan.publicationPrerequisites).toEqual([]);
    expect(mergedPlan.rowMappings[0]?.row.instructions.map((instruction) => instruction.instructionKind)).toEqual([
      'hydrate-element',
      'hydrate-attribute',
      'property-binding',
    ]);
    const mergedHead = mergedPlan.hydrateElements!.heads[0]!;
    for (const disposition of mergedPlan.attributeDispositionMappings.filter((mapping) =>
      mapping.draft.site === mergedHead.row.site
    )) {
      const input = disposition.draft.attribute.inputReference?.productHandle;
      if (input == null) throw new Error('Expected merged browser attribute cause.');
      if (disposition.draft.contribution.targetLane === TemplateCompilerLiveAttributeTargetLane.ElementBindable) {
        expect(disposition.causeHandles).toEqual([
          input,
          mergedHead.instruction.productHandle,
          ...mergedHead.head.envelope.bindableInstructions.map((instruction) => instruction.productHandle),
        ]);
      } else {
        expect(disposition.causeHandles).toEqual(disposition.draft.causeHandles);
        expect(disposition.causeHandles).not.toContain(mergedHead.instruction.productHandle);
      }
    }
    const unattached = targetPlans.get('cursor-empty')!;
    expect(() => unattached.rows.receipt.transcript.binding.execution.attachTargetPlan(
      unattached.rows.receipt.endpoint.lane,
      unattached.targetPlan,
    )).toThrow(/nominal site completion authority/u);

    for (const name of ['cursor-as-element-empty', 'cursor-slot-inert']) {
      const targetAssembly = targetPlans.get(name);
      expect(targetAssembly?.targetPlan.root.readRows(), name).toEqual([]);
      expect(targetAssembly?.targetPlan.root.readOccurrenceMemberships().length, name).toBeGreaterThan(0);
    }
    const nonSingularPlan = targetPlans.get('cursor-live-nonsingular');
    expect(nonSingularPlan?.rowMappings.map((mapping) => mapping.row.node)).toEqual([null, null]);
    expect(new Set(nonSingularPlan?.rowMappings.map((mapping) => mapping.row.inputNode?.productHandle)).size).toBe(2);

    const stableDrafts = assemblies.get('cursor-live-duplicate')!.rows;
    const stableB = stableDrafts[1]!;
    const stableA = stableDrafts[0]!;
    const stableReference = targetPlans.get('cursor-live-duplicate')!.rootCompiledTemplate;
    const rootContext = assemblies.get('cursor-live-duplicate')!.receipt.transcript.binding.unit.rootContext;
    const planOne = new TemplateCompilerTargetPlan('stable-key-canary', rootContext, stableReference);
    planOne.root.recordCompilerReachableOccurrence('membership:b', stableB.occurrence, stableB.authoredNode);
    const rowBAtZero = planOne.root.appendOccurrenceRow(
      stableB.stableSlotKey,
      stableB.occurrence,
      stableB.authoredNode,
      stableB.instructions,
      stableB.targetKind,
      stableB.sourceAddressHandle,
    );
    planOne.seal();
    const planTwo = new TemplateCompilerTargetPlan('stable-key-canary', rootContext, stableReference);
    planTwo.root.recordCompilerReachableOccurrence('membership:a', stableA.occurrence, stableA.authoredNode);
    planTwo.root.recordCompilerReachableOccurrence('membership:b', stableB.occurrence, stableB.authoredNode);
    planTwo.root.appendOccurrenceRow(
      stableA.stableSlotKey,
      stableA.occurrence,
      stableA.authoredNode,
      stableA.instructions,
      stableA.targetKind,
      stableA.sourceAddressHandle,
    );
    const rowBAtOne = planTwo.root.appendOccurrenceRow(
      stableB.stableSlotKey,
      stableB.occurrence,
      stableB.authoredNode,
      stableB.instructions,
      stableB.targetKind,
      stableB.sourceAddressHandle,
    );
    expect(rowBAtOne.localKey).toBe(rowBAtZero.localKey);
    expect(rowBAtOne.publicationLocalKey).toBe(rowBAtZero.publicationLocalKey);
    expect(rowBAtOne.targetPublicationLocal('compiled', 1))
      .toBe(rowBAtZero.targetPublicationLocal('compiled', 0));
    expect(rowBAtOne.ordinal).toBe(1);
    expect(rowBAtZero.ordinal).toBe(0);
    expect(() => planTwo.root.appendOccurrenceRow(
      stableB.stableSlotKey,
      stableB.occurrence,
      stableB.authoredNode,
      stableB.instructions,
    )).toThrow();
    planTwo.seal();
  });

  test('never promotes the current typed ordinary-root frontiers into completion receipts', () => {
    const names = [
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
    const rowAssembly = assembleTemplateCompilerOrdinaryRootRows(receipt).assembly;
    if (rowAssembly == null) throw new Error('Expected fresh current row assembly.');
    const targetAssembly = allocateTemplateCompilerOccurrenceTargetPlan(rowAssembly).assembly;
    if (targetAssembly == null) throw new Error('Expected fresh current target-plan assembly.');
    expect(targetAssembly.isCurrent()).toBe(true);

    const attribute = run.binding.forest.readAttributes()[0];
    if (attribute == null) throw new Error('Expected one live attribute for endpoint invalidation.');
    run.binding.forest.rewriteAttributeValue(attribute, `${attribute.value}:after-receipt`);

    expect(run.binding.execution.siteExecutionEndpointIsCurrent(result.siteEndpoint)).toBe(false);
    expect(receipt.isCurrent()).toBe(false);
    expect(assembleTemplateCompilerOrdinaryRootRows(receipt).state)
      .toBe(TemplateCompilerOccurrenceRowAssemblyState.Ineligible);
    expect(targetAssembly.isCurrent()).toBe(false);
    expect(allocateTemplateCompilerOccurrenceTargetPlan(rowAssembly).state)
      .toBe(TemplateCompilerOccurrenceTargetPlanState.Ineligible);
  });

  test('keeps stale HydrateElement allocation refusal side-effect free', () => {
    const run = fixture.freshRun('cursor-live-staging');
    const receipt = run.execute().completion?.receipt;
    if (receipt == null) throw new Error('Expected fresh HydrateElement completion receipt.');
    const rows = assembleTemplateCompilerOrdinaryRootRows(receipt).assembly;
    if (rows == null) throw new Error('Expected fresh HydrateElement row assembly.');
    const namespace = receipt.transcript.allocationSnapshot.ledger.namespace;
    const counts = namespace.readReservationCounts();
    const attribute = run.binding.forest.readAttributes()[0]!;

    run.binding.forest.rewriteAttributeValue(attribute, `${attribute.value}:stale`);

    const result = allocateTemplateCompilerOccurrenceHydrateElements(rows);
    expect(result.state).toBe(TemplateCompilerOccurrenceHydrateElementAllocationState.Ineligible);
    expect(result.assembly).toBeNull();
    expect(result.reasons).toEqual([expect.objectContaining({ reasonKind: 'stale-receipt' })]);
    expect(namespace.readReservationCounts()).toEqual(counts);
  });

  test('commits HydrateElement funding atomically when a later head collides', () => {
    const run = fixture.freshRun('cursor-live-staging');
    const receipt = run.execute().completion?.receipt;
    if (receipt == null) throw new Error('Expected fresh HydrateElement completion receipt.');
    const rows = assembleTemplateCompilerOrdinaryRootRows(receipt).assembly;
    if (rows == null) throw new Error('Expected fresh HydrateElement row assembly.');
    const hydrateRows = rows.rows.filter((row) => row.hydrateElement != null);
    const second = hydrateRows[1];
    if (second?.hydrateElement == null) throw new Error('Expected a second HydrateElement row.');
    const namespace = receipt.transcript.allocationSnapshot.ledger.namespace;
    const phaseKey = `${receipt.endpoint.lane.localKey}:occurrence-hydrate-elements`;
    const instructionSiteKey = `${phaseKey}:${second.hydrateElement.instructionSlotKey}`;
    const instructionLocal = `${instructionSiteKey}:instruction:hydrate-element:${second.occurrence.occurrenceKey}`;
    const collision = namespace.beginPhase(`${receipt.endpoint.lane.localKey}:he-collision`);
    collision.reserveProduct(
      `${receipt.endpoint.lane.localKey}:he-collision:product`,
      'collision',
      TemplateCompilerLiveProductReservationRole.RootCompiledTemplate,
      null,
      instructionLocal,
    );
    collision.finish();
    const counts = namespace.readReservationCounts();

    const result = allocateTemplateCompilerOccurrenceHydrateElements(rows);

    expect(result.state).toBe(TemplateCompilerOccurrenceHydrateElementAllocationState.Ineligible);
    expect(result.assembly).toBeNull();
    expect(result.reasons).toEqual([expect.objectContaining({
      reasonKind: TemplateCompilerOccurrenceHydrateElementAllocationReasonKind.AllocationCollision,
    })]);
    expect(namespace.readReservationCounts()).toEqual(counts);
  });

  test('keeps central structural effects and reached live invalidity distinct', () => {
    const expected = new Map<string, TemplateCompilerSiteCursorFrontierKind>([
      ['cursor-template-controller', TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeTemplateController],
      ['cursor-open', TemplateCompilerSiteCursorFrontierKind.ReachedLiveAttributeInvalid],
    ]);
    for (const [name, frontier] of expected) {
      const transcript = fixture.transcript(name);
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
    const containerlessResult = fixture.run('cursor-containerless').execute();
    const containerless = requireTranscript(containerlessResult);
    expect(containerless.frontier).toBeNull();
    const containerlessReceipt = containerlessResult.completion?.receipt;
    expect(containerlessReceipt).not.toBeNull();
    const placement = eventsOf(containerless, TemplateCompilerSiteCursorContainerlessPlacementEvent)[0]!;
    const elementEvent = eventsOf(containerless, TemplateCompilerSiteCursorElementEvent)[0]!;
    expect(placement).toMatchObject({
      element: elementEvent.element,
      parent: elementEvent.parent,
      parentOrdinal: elementEvent.parentOrdinal,
      capturedSuccessor: elementEvent.capturedSuccessor,
    });
    expect(placement.ordinal).toBe(elementEvent.ordinal + 1);
    expect(containerlessReceipt?.elementSites[0]?.containerlessPlacement).toBe(placement);
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
    const result = fixture.run('cursor-usage-containerless').execute();
    const transcript = requireTranscript(result);
    expect(transcript.frontier).toBeNull();
    const receipt = result.completion?.receipt;
    expect(receipt).not.toBeNull();
    const placement = eventsOf(transcript, TemplateCompilerSiteCursorContainerlessPlacementEvent)[0]!;
    const attributeEvent = eventsOf(transcript, TemplateCompilerSiteCursorAttributeEvent)[0]!;
    expect(placement.ordinal).toBe(attributeEvent.ordinal + 1);
    expect(receipt?.elementSites[0]?.containerlessPlacement).toBe(placement);
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

  test('keeps child-bearing containerless projection-first', () => {
    const result = fixture.run('cursor-containerless-child').execute();
    const transcript = requireTranscript(result);
    expect(transcript.frontier?.frontierKind)
      .toBe(TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeProjection);
    expect(eventsOf(transcript, TemplateCompilerSiteCursorContainerlessPlacementEvent)).toEqual([]);
    expect(result.completion?.receipt).toBeNull();
    expect(result.completion?.refusals.map((refusal) => refusal.refusalKind))
      .not.toContain(TemplateCompilerOrdinaryRootCompletionRefusalKind.ContainerlessPlacementMismatch);
    expect(transcript.hydrateElementEnvelopes[0]?.draft).toMatchObject({
      projection: { state: TemplateCompilerHydrateElementProjectionState.PendingExtraction },
      containerless: { effective: true, fromDefinition: true, fromUsage: false },
    });
  });

  test('rejects usage containerless whenever the custom element requires a native shadow host', () => {
    const cases = [
      ['cursor-shadow-containerless', 'shadow'],
      ['cursor-slots-containerless', 'slots'],
    ] as const;
    for (const [name, cause] of cases) {
      const result = fixture.run(name).execute();
      const transcript = requireTranscript(result);
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
      expect(result.completion?.refusals.map((refusal) => refusal.refusalKind), name)
        .not.toContain(TemplateCompilerOrdinaryRootCompletionRefusalKind.ContainerlessPlacementMismatch);
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
      expect(result.completion?.refusals.map((refusal) => refusal.refusalKind), name)
        .not.toContain(TemplateCompilerOrdinaryRootCompletionRefusalKind.ContainerlessPlacementMismatch);
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

  test('admits a root-only processContent family and funds only direct removed-child wires', () => {
    const rootResult = fixture.freshRun('cursor-process-content-removals').execute(
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const rootTranscript = requireTranscript(rootResult);
    const rootCompletion = completeTemplateCompilerContextFamily(rootTranscript, rootResult.siteEndpoint);
    const rootProcessEvent = eventsOf(rootTranscript, TemplateCompilerSiteCursorProcessContentEvent)[0];
    if (rootCompletion.receipt == null || rootCompletion.traversal == null || rootProcessEvent == null) {
      throw new Error(
        `Expected a closed root-only processContent family: ${rootCompletion.reasons.map((reason) => reason.summary).join(' ')}`,
      );
    }
    const rootRows = assembleTemplateCompilerContextFamilyRows(rootCompletion.receipt).assembly;
    if (rootRows == null) throw new Error('Expected root-only processContent family rows.');
    const rootWires = prepareTemplateCompilerFamilyWireFunding(rootRows);
    const funding = rootWires.funding;
    if (funding == null) throw new Error('Expected root-only processContent family wire funding.');
    const namespace = rootTranscript.allocationSnapshot.ledger.namespace;
    const countsBefore = namespace.readReservationCounts();
    const allocation = prepareTemplateCompilerContextFamilyAllocation(rootRows, funding);
    const preparation = allocation.preparation;
    if (preparation == null) {
      throw new Error(`Expected root-only processContent allocation: ${allocation.reasons[0]?.summary ?? 'unknown'}`);
    }
    const targetResult = prepareTemplateCompilerContextFamilyTargetPlan(preparation);
    const target = targetResult.preparation;
    if (target == null) {
      throw new Error(`Expected root-only processContent target plan: ${targetResult.reasons[0]?.summary ?? 'unknown'}`);
    }
    const schedule = prepareTemplateCompilerContextFamilyStructuralSchedule(target);
    const removed = rootProcessEvent.result.removedOccurrences;
    const removedSet = new Set(removed);
    const removedSiteSet = new Set(rootProcessEvent.result.removedSiteOccurrences);
    const removedDrafts = rootWires.drafts.filter((draft) =>
      draft.role === TemplateCompilerFamilyWireRole.ProcessContentRemovedChild
    );
    const firstCarrier = removed[0];
    if (!(firstCarrier instanceof TemplateCompilerElementOccurrence)) {
      throw new Error('Expected the first direct processContent removal to be one element carrier.');
    }
    const nestedElement = firstCarrier.readChildren().find(
      (child): child is TemplateCompilerElementOccurrence => child instanceof TemplateCompilerElementOccurrence,
    );
    const nestedComment = firstCarrier.readChildren().find(
      (child): child is TemplateCompilerCommentOccurrence => child instanceof TemplateCompilerCommentOccurrence,
    );
    if (nestedElement == null || nestedComment == null) {
      throw new Error('Expected the detached carrier to retain its nested element and comment.');
    }
    const processEffects = rootCompletion.traversal.contexts.flatMap((context) =>
      context.processContentEffects
    );

    expect(rootCompletion.state).toBe(TemplateCompilerContextFamilyCompletionState.Complete);
    expect(rootResult.completion?.state).toBe(TemplateCompilerOrdinaryRootCompletionState.Ineligible);
    expect(rootResult.completion?.refusals.map((refusal) => refusal.refusalKind)).toEqual([
      TemplateCompilerOrdinaryRootCompletionRefusalKind.ContextFamilyTraversal,
    ]);
    expect(rootTranscript.taskSnapshot.contexts).toHaveLength(1);
    expect(processEffects).toHaveLength(1);
    expect(processEffects[0]).toBe(rootProcessEvent);
    expect(eventsOf(rootTranscript, TemplateCompilerSiteCursorContainerlessPlacementEvent))
      .toHaveLength(1);
    expect(rootWires.state).toBe(TemplateCompilerFamilyWireFundingState.Exact);
    expect(allocation.state).toBe(TemplateCompilerContextFamilyAllocationState.Exact);
    expect(targetResult.state).toBe(TemplateCompilerContextFamilyTargetPlanState.Exact);
    expect(schedule.contexts.map((context) => context.initialization.initializationKind)).toEqual([
      TemplateCompilerFamilyContextInitializationKind.RootBound,
    ]);
    const processSchedule = schedule.contexts[0]?.entries.find((entry) =>
      entry instanceof TemplateCompilerFamilyLoweredElementScheduleEntry
      && entry.processContent.length > 0
    );
    expect(processSchedule).toBeInstanceOf(TemplateCompilerFamilyLoweredElementScheduleEntry);
    expect(processSchedule instanceof TemplateCompilerFamilyLoweredElementScheduleEntry
      ? processSchedule.processContent.map((entry) => entry.removal)
      : []).toEqual(rootProcessEvent.result.removals);
    expect(namespace.readReservationCounts()).toEqual(countsBefore);
    expect(preparation.contextDefinitions.map((definition) => definition.ownerKind)).toEqual([
      TemplateCompilerFundedContextDefinitionOwnerKind.Root,
    ]);
    expect(preparation.preparedAllocation.productReservations.map((reservation) => reservation.role)).toEqual([
      TemplateCompilerLiveProductReservationRole.RootCompiledTemplate,
    ]);
    expect(preparation.hydrateElements).toHaveLength(1);
    expect(preparation.hydrateElements[0]?.instruction.auSlotProcessContent)
      .toMatchObject({
        name: rootProcessEvent.result.metadata.name,
        nameSourceAddressHandle: null,
      });
    expect(preparation.hydrateElements[0]?.instruction.auSlotProcessContentRemovedChildNodes)
      .toEqual(removedDrafts.map((draft) => draft.wireReference));
    expect(preparation.hydrateElements[0]?.instruction.containerless).toBe(false);
    expect(target.targetPlan.readContexts()).toHaveLength(1);
    expect(target.targetPlan.root.readRows()).toHaveLength(1);
    expect(target.targetPlan.root.readRows()[0]).toMatchObject({
      sourceKind: TemplateCompilerTargetRowSourceKind.RetainedOccurrence,
      placement: expect.objectContaining({
        placementKind: TemplateCompilerTargetRowPlacementKind.ContainerlessReplacement,
      }),
    });
    expect(target.processContentHydrateElements).toEqual(preparation.hydrateElements);
    expect(target.containerlessHydrateElements).toEqual(preparation.hydrateElements);
    expect(rootProcessEvent.result.metadata.name).toBe('default');
    expect(removed.map((occurrence) =>
      occurrence instanceof TemplateCompilerElementOccurrence ? occurrence.tagName : occurrence.nodeKind
    )).toEqual(['div', 'p']);
    expect(removedDrafts).toHaveLength(removed.length);
    for (const [ordinal, draft] of removedDrafts.entries()) {
      const occurrence = removed[ordinal]!;
      expect(draft.occurrence).toBe(occurrence);
      expect(draft.semanticOwner).toBe(rootProcessEvent.result);
      expect(draft.resolution).toBe(TemplateCompilerFamilyWireResolution.ExactAuthored);
      expect(draft.valueAddressHandle).toBeNull();
      expect(draft.valueSpanRequired).toBe(false);
      expect(draft.wireReference).toMatchObject({
        productHandle: rootTranscript.binding.forest.exactAuthoredNodeOrigin(occurrence)?.authored.productHandle,
        identityHandle: rootTranscript.binding.forest.exactAuthoredNodeOrigin(occurrence)?.authored.identityHandle,
        addressHandle: rootTranscript.binding.forest.exactAuthoredNodeOrigin(occurrence)?.authored.addressHandle,
      });
    }
    expect(rootTranscript.binding.forest.exactAuthoredNodeOrigin(nestedElement)).not.toBeNull();
    expect(rootTranscript.binding.forest.exactAuthoredNodeOrigin(nestedComment)).not.toBeNull();
    expect(funding.draftsForOccurrence(
      nestedElement,
      TemplateCompilerFamilyWireRole.ProcessContentRemovedChild,
    )).toEqual([]);
    expect(funding.draftsForOccurrence(
      nestedComment,
      TemplateCompilerFamilyWireRole.ProcessContentRemovedChild,
    )).toEqual([]);
    for (const occurrence of rootProcessEvent.result.removedSiteOccurrences) {
      expect(funding.draftsForOccurrence(
        occurrence,
        TemplateCompilerFamilyWireRole.ProcessContentRemovedChild,
      )).toEqual([]);
    }
    expect(eventsOf(rootTranscript, TemplateCompilerSiteCursorElementEvent).some((event) =>
      removedSet.has(event.element) || event.element === nestedElement
    )).toBe(false);
    expect(eventsOf(rootTranscript, TemplateCompilerSiteCursorAttributeEvent).some((event) =>
      removedSiteSet.has(event.attribute)
    )).toBe(false);
    expect(eventsOf(rootTranscript, TemplateCompilerSiteCursorTextEvent).some((event) =>
      removedSiteSet.has(event.text)
    )).toBe(false);

    const structural = TemplateCompilerStructuralExecutionSession.prepareBorrowing(
      rootTranscript.binding.forest,
      target.targetPlan,
      rootTranscript.binding.execution.mutationAuthority,
    );
    const fundedHydrateElement = preparation.hydrateElements[0]!;
    const adopted = rootProcessEvent.result.removals.map((removal, ordinal) =>
      structural.adoptCommittedProcessContentRemoval(
        target.targetPlan.root,
        fundedHydrateElement.instruction,
        rootProcessEvent.result,
        removal,
        ordinal,
      )
    );
    expect(adopted.map((disposition) => disposition.node)).toEqual(removed);
    expect(structural.readConsumedNodeDispositions(target.targetPlan.root)).toEqual(adopted);
  });

  test('places a TC-wrapped containerless host after its transition event', () => {
    const result = fixture.freshRun('cursor-context-family-containerless-tc').execute(
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const transcript = requireTranscript(result);
    const completion = completeTemplateCompilerContextFamily(transcript, result.siteEndpoint);
    const transition = eventsOf(transcript, TemplateCompilerSiteCursorTemplateControllerTransitionEvent)[0];
    const placement = eventsOf(transcript, TemplateCompilerSiteCursorContainerlessPlacementEvent)[0];
    if (transition == null || placement == null) {
      throw new Error('Expected one TC transition followed by one containerless placement.');
    }

    expect(completion.state).toBe(TemplateCompilerContextFamilyCompletionState.Complete);
    expect(transcript.taskSnapshot.contexts).toHaveLength(2);
    expect(transition.host).toBe(placement.element);
    expect(placement.ordinal).toBe(transition.ordinal + 1);
    expect(transcript.taskSnapshot.contextForEvent(transition)).toBe(transcript.taskSnapshot.rootContext);
    expect(transcript.taskSnapshot.contextForEvent(placement)?.contextKind)
      .toBe(TemplateCompilerSiteCursorContextKind.TemplateController);
  });

  test('funds an effective capture before its HE projection definition', () => {
    const result = fixture.freshRun('cursor-context-family-capture-projection').execute(
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const transcript = requireTranscript(result);
    const completion = completeTemplateCompilerContextFamily(transcript, result.siteEndpoint);
    if (completion.receipt == null) throw new Error('Expected capture-projection family completion.');
    const rows = assembleTemplateCompilerContextFamilyRows(completion.receipt).assembly;
    if (rows == null) throw new Error('Expected capture-projection family rows.');
    const wires = prepareTemplateCompilerFamilyWireFunding(rows).funding;
    if (wires == null) throw new Error('Expected capture-projection family wires.');
    const namespace = transcript.allocationSnapshot.ledger.namespace;
    const countsBefore = namespace.readReservationCounts();
    const allocation = prepareTemplateCompilerContextFamilyAllocation(rows, wires);
    const preparation = allocation.preparation;
    if (preparation == null) {
      throw new Error(`Expected capture-projection allocation: ${allocation.reasons[0]?.summary ?? 'unknown'}`);
    }
    const head = preparation.hydrateElements[0];
    if (head == null) throw new Error('Expected capture-projection HydrateElement funding.');
    const targetResult = prepareTemplateCompilerContextFamilyTargetPlan(preparation);
    const target = targetResult.preparation;
    if (target == null) {
      throw new Error(`Expected capture-projection target plan: ${targetResult.reasons[0]?.summary ?? 'unknown'}`);
    }
    const schedule = prepareTemplateCompilerContextFamilyStructuralSchedule(target);

    expect(allocation.state).toBe(TemplateCompilerContextFamilyAllocationState.Exact);
    expect(targetResult.state).toBe(TemplateCompilerContextFamilyTargetPlanState.Exact);
    expect(schedule.contexts.map((context) => context.initialization.initializationKind)).toEqual([
      TemplateCompilerFamilyContextInitializationKind.RootBound,
      TemplateCompilerFamilyContextInitializationKind.Generated,
      TemplateCompilerFamilyContextInitializationKind.Generated,
    ]);
    expect(namespace.readReservationCounts()).toEqual(countsBefore);
    expect(preparation.contextDefinitions.map((definition) => definition.ownerKind)).toEqual([
      TemplateCompilerFundedContextDefinitionOwnerKind.Root,
      TemplateCompilerFundedContextDefinitionOwnerKind.TemplateController,
      TemplateCompilerFundedContextDefinitionOwnerKind.Projection,
    ]);
    expect(preparation.fundedInstructions.map((funded) => funded.instruction.instructionKind)).toEqual([
      TemplateInstructionKind.HydrateTemplateController,
      TemplateInstructionKind.HydrateElement,
    ]);
    expect(head.captures.map((capture) => capture.draft.decisionKind)).toEqual([
      TemplateCompilerCaptureSyntaxDecisionKind.EffectiveSyntaxRequired,
    ]);
    expect(head.instruction.projections.map((projection) => projection.slotName)).toEqual(['default']);
    expect(head.productReservations.map((reservation) => reservation.role)).toEqual([
      TemplateCompilerLiveProductReservationRole.EffectiveAttributeSyntax,
      TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
    ]);
    expect(preparation.preparedAllocation.productReservations.map((reservation) => reservation.role)).toEqual([
      TemplateCompilerLiveProductReservationRole.RootCompiledTemplate,
      TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
      TemplateCompilerLiveProductReservationRole.EffectiveAttributeSyntax,
      TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
    ]);
    expect(preparation.preparedAllocation.productReservations[2]).toBe(head.captures[0]?.effectiveReservation);
    expect(preparation.preparedAllocation.productReservations[3]).toBe(head.projectionFunding.reservations[0]);
    const captureDisposition = target.attributeDispositionMappings.find((mapping) =>
      mapping.draft.contribution.targetLane === TemplateCompilerLiveAttributeTargetLane.Capture
    );
    const templateControllerDisposition = target.attributeDispositionMappings.find((mapping) =>
      mapping.draft.contribution.targetLane === TemplateCompilerLiveAttributeTargetLane.TemplateController
    );
    expect(captureDisposition?.causeHandles).toContain(head.instruction.productHandle);
    expect(captureDisposition?.causeHandles).toContain(head.captures[0]?.productHandle);
    expect(templateControllerDisposition?.causeHandles)
      .toContain(preparation.hydrateTemplateControllers[0]?.instruction.productHandle);
    expect(preparation.preparedAllocation.ledger.state).toBe(TemplateCompilerLiveAllocationLedgerState.Prepared);
    expect(namespace.readReservationCounts()).toEqual(countsBefore);
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

  test('drains one session-owned root task and binds every event to its exact context', () => {
    const transcript = fixture.transcript('cursor-row-interleave');
    const tasks = transcript.taskSnapshot;
    const rootTask = tasks.contexts[0];

    expect(tasks.contexts).toHaveLength(1);
    expect(tasks.rootContext.contextKind).toBe(TemplateCompilerSiteCursorContextKind.Root);
    expect(rootTask).toMatchObject({
      context: tasks.rootContext,
      state: TemplateCompilerSiteCursorContextTaskState.Drained,
      stopKind: null,
      frontier: null,
      remainingFrames: [],
    });
    expect(tasks.events).toEqual(transcript.events);
    expect(tasks.eventBindings.map((binding) => binding.event)).toEqual(transcript.events);
    expect(tasks.eventBindings.every((binding) => binding.context === tasks.rootContext)).toBe(true);
    expect(transcript.events.every((event) => tasks.contextForEvent(event) === tasks.rootContext)).toBe(true);

    const terminal = fixture.transcript('cursor-open').taskSnapshot.contexts[0]!;
    expect(terminal.state).toBe(TemplateCompilerSiteCursorContextTaskState.Stopped);
    expect(terminal.stopKind).toBe(TemplateCompilerSiteCursorTaskStopKind.TerminalFrontier);
  });

  test('retains the full nested ancestor continuation at TC and projection structural frontiers', () => {
    const cases = [
      ['cursor-task-nested-tc', TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeTemplateController],
      ['cursor-task-nested-projection', TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeProjection],
    ] as const;
    for (const [name, frontierKind] of cases) {
      const transcript = fixture.transcript(name);
      const task = transcript.taskSnapshot.contexts[0]!;
      const frames = task.remainingFrames;

      expect(transcript.frontier?.frontierKind, name).toBe(frontierKind);
      expect(task.state, name).toBe(TemplateCompilerSiteCursorContextTaskState.Stopped);
      expect(task.stopKind, name).toBe(TemplateCompilerSiteCursorTaskStopKind.StructuralFrontier);
      expect(task.frontier, name).toBe(transcript.frontier);
      expect(task.lastVisit?.node, name).toBe(transcript.frontier?.node);
      expect(task.lastVisit?.capturedSuccessor, name).toBe(transcript.frontier?.capturedSuccessor);
      expect(frames.map((frame) => cursorOccurrenceLabel(frame.parent)), name)
        .toEqual(['#fragment', 'main', 'section']);
      expect(frames.map((frame) => frame.nextOrdinal), name).toEqual([1, 1, 1]);
      expect(frames.map((frame) => frame.readRemainingChildren().map(cursorOccurrenceLabel)), name).toEqual([
        ['aside', '#text'],
        ['footer'],
        ['i'],
      ]);
      expect(frames[0]?.children[frames[0].nextOrdinal - 1], name).toBe(frames[1]?.parent);
      expect(frames[1]?.children[frames[1].nextOrdinal - 1], name).toBe(frames[2]?.parent);
      expect(cursorOccurrenceLabel(transcript.frontier!.capturedSuccessor!), name).toBe('i');
      expect(frames[1]?.readRemainingChildren().map(cursorOccurrenceLabel), name).toContain('footer');
      expect(frames[0]?.readRemainingChildren().map(cursorOccurrenceLabel), name).toContain('aside');
    }
  });

  test('pins the shared generated-context graph before live family scheduling', () => {
    const tcPlan = fixture.run('cursor-context-family-tc').compilation.compiledTemplate.targetPlan;
    const tcContexts = tcPlan.readContexts();
    expect(tcContexts.map((context) => context.role)).toEqual([
      TemplateCompilerTargetContextRole.Root,
      TemplateCompilerTargetContextRole.TemplateController,
      TemplateCompilerTargetContextRole.TemplateController,
    ]);
    expect(tcContexts[0]?.readRows().map((row) => [
      row.targetKind,
      row.node != null && 'tagName' in row.node ? row.node.tagName : null,
      row.instructions.map((instruction) => instruction.instructionKind),
    ])).toEqual([
      [TemplateRenderTargetKind.RenderLocation, 'template', ['hydrate-template-controller']],
      [TemplateRenderTargetKind.MarkerTarget, 'span', ['property-binding']],
    ]);
    expect(tcContexts[1]?.readRows().map((row) => [
      row.targetKind,
      row.instructions.map((instruction) => instruction.instructionKind),
    ])).toEqual([
      [TemplateRenderTargetKind.RenderLocation, ['hydrate-template-controller']],
    ]);
    expect(tcContexts[2]?.readRows().map((row) => [
      row.targetKind,
      row.node != null && 'tagName' in row.node ? row.node.tagName : null,
      row.instructions.map((instruction) => instruction.instructionKind),
    ])).toEqual([
      [TemplateRenderTargetKind.MarkerTarget, 'div', ['property-binding']],
    ]);
    expect(tcContexts.slice(0, 2).map((context) =>
      context.readRows()[0]?.instructions[0]
    ).every((instruction) => instruction instanceof HydrateTemplateControllerInstruction)).toBe(true);
    expect(tcContexts[0]?.readRows()[0]?.placement)
      .toBeInstanceOf(TemplateCompilerTemplateControllerSourceReplacementPlacement);
    expect(tcContexts[1]?.readRows()[0]).toMatchObject({
      sourceKind: TemplateCompilerTargetRowSourceKind.GeneratedContextBoundary,
      node: null,
      occurrence: null,
      inputNode: null,
    });
    expect(tcContexts[1]?.readRows()[0]?.placement)
      .toBeInstanceOf(TemplateCompilerTemplateControllerGeneratedAppendPlacement);

    const projectionPlan = fixture.run('cursor-context-family-projection').compilation.compiledTemplate.targetPlan;
    const projectionContexts = projectionPlan.readContexts();
    expect(projectionContexts.map((context) => [context.role, context.slotName])).toEqual([
      [TemplateCompilerTargetContextRole.Root, null],
      [TemplateCompilerTargetContextRole.Projection, 'default'],
      [TemplateCompilerTargetContextRole.Projection, 'named'],
    ]);
    expect(projectionContexts[0]?.readRows().map((row) => [
      row.targetKind,
      row.node != null && 'tagName' in row.node ? row.node.tagName : null,
      row.instructions.map((instruction) => instruction.instructionKind),
    ])).toEqual([
      [TemplateRenderTargetKind.MarkerTarget, 'cursor-leaf', ['hydrate-element']],
      [TemplateRenderTargetKind.MarkerTarget, 'div', ['property-binding']],
    ]);
    expect(projectionContexts.slice(1).map((context) => context.readRows())).toEqual([[], []]);
    const hydrate = projectionContexts[0]?.readRows()[0]?.instructions[0];
    if (!(hydrate instanceof HydrateElementInstruction)) throw new Error('Expected projection HydrateElement.');
    expect(hydrate.projections.map((projection) => [
      projection.slotName,
      projection.contributors.map((contributor) => contributor.disposition),
    ])).toEqual([
      ['default', [HydrateElementProjectionContributorDisposition.RetainedNode]],
      ['named', [
        HydrateElementProjectionContributorDisposition.RetainedNode,
        HydrateElementProjectionContributorDisposition.UnwrappedTemplateContent,
      ]],
    ]);

    expect(fixture.transcript('cursor-context-family-tc').frontier?.frontierKind)
      .toBe(TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeTemplateController);
    const liveProjectionTranscript = fixture.transcript('cursor-context-family-projection');
    expect(liveProjectionTranscript.frontier?.frontierKind)
      .toBe(TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeProjection);
    expect(liveProjectionTranscript.hydrateElementEnvelopes[0]?.draft?.projection.grouping.groups.map((group) => [
      group.slotName,
      group.members.map((member) => [
        member.node instanceof TemplateCompilerElementOccurrence ? member.node.tagName : member.node.nodeKind,
        member.disposition,
      ]),
    ])).toEqual([
      ['default', [['span', HydrateElementProjectionContributorDisposition.RetainedNode]]],
      ['named', [
        ['b', HydrateElementProjectionContributorDisposition.RetainedNode],
        ['template', HydrateElementProjectionContributorDisposition.UnwrappedTemplateContent],
      ]],
    ]);
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

  test('atomically attaches receipt-bound occurrence plans without using the legacy gate', () => {
    for (const name of [
      'cursor-as-element-empty',
      'cursor-empty',
      'cursor-live-nonsingular',
      'cursor-progression',
    ]) {
      const run = fixture.freshRun(name);
      const result = run.execute();
      const receipt = result.completion?.receipt;
      if (receipt == null) throw new Error(`Expected fresh completion receipt for '${name}'.`);
      const rows = assembleTemplateCompilerOrdinaryRootRows(receipt).assembly;
      if (rows == null) throw new Error(`Expected fresh row assembly for '${name}'.`);
      const target = allocateTemplateCompilerOccurrenceTargetPlan(rows).assembly;
      if (target == null) throw new Error(`Expected fresh target-plan assembly for '${name}'.`);
      const startRevision = run.binding.forest.mutationRevision;

      const attachment = run.binding.execution.attachOccurrenceTargetPlan(target);

      expect(attachment.isModuleConstructed(), name).toBe(true);
      expect(attachment.isCurrent(), name).toBe(true);
      expect(attachment.execution, name).toBe(run.binding.execution);
      expect(attachment.assembly, name).toBe(target);
      expect(attachment.structuralExecution, name).toBe(run.binding.execution.structuralExecution);
      expect(attachment.contexts, name).toHaveLength(1);
      expect(attachment.contexts[0]?.targetContext, name).toBe(target.targetPlan.root);
      expect(attachment.structuralExecution.readContextStructure(target.targetPlan.root), name).toMatchObject({
        compilerCarrier: run.binding.lane.compilerCarrier,
        compilerContent: run.binding.lane.compilerContent,
      });
      expect(run.binding.lane.targetPlan, name).toBe(target.targetPlan);
      expect(run.binding.execution.invocationPhase(run.binding.lane), name).toBe('target-execution');
      expect(run.binding.forest.mutationRevision, name).toBe(startRevision);
      expect(receipt.isCurrent(), name).toBe(false);
      expect(target.isCurrent(), name).toBe(false);
      expect(run.binding.execution.attachOccurrenceTargetPlan(target), name).toBe(attachment);
      expect(() => run.binding.execution.attachTargetPlan(run.binding.lane, target.targetPlan), name)
        .toThrow(/nominal site completion authority/u);
      expect(() => run.binding.execution.closeOccurrenceTargetExecution(attachment), name)
        .toThrow(/incomplete structural disposition coverage/u);
      expect(() => run.binding.execution.seal(), name)
        .toThrow(/has not closed occurrence target execution/u);
      run.binding.execution.assertCoherent();
    }
  });

  test('refuses target execution when the attached forest frontier changes out of band', () => {
    const run = fixture.freshRun('cursor-progression');
    const receipt = run.execute().completion?.receipt;
    if (receipt == null) throw new Error('Expected fresh completion receipt.');
    const rows = assembleTemplateCompilerOrdinaryRootRows(receipt).assembly;
    if (rows == null) throw new Error('Expected fresh row assembly.');
    const target = allocateTemplateCompilerOccurrenceTargetPlan(rows).assembly;
    if (target == null) throw new Error('Expected exact target plan.');
    const attachment = run.binding.execution.attachOccurrenceTargetPlan(target);
    const context = attachment.contexts[0]!;
    const attribute = run.binding.forest.readAttributes()[0]!;
    const startOperations = run.binding.execution.sequence.readOperations().length;

    run.binding.forest.rewriteAttributeValue(attribute, `${attribute.value}:out-of-band`);

    expect(attachment.isCurrent()).toBe(false);
    expect(() => executeTemplateCompilerOccurrenceTarget(attachment))
      .toThrow(/exact current attached root context/u);
    expect(run.binding.execution.sequence.readOperations()).toHaveLength(startOperations);
    expect(run.binding.execution.sequence.readContextOperations(context)).toEqual([]);
    expect(attachment.structuralExecution.readTargetGeometries(context.targetContext)).toEqual([]);
    expect(attachment.structuralExecution.readConsumedAttributeDispositions(context.targetContext)).toEqual([]);
  });

  test('refuses target execution after its candidate allocation authority is revoked', () => {
    const candidate = fixture.runtime.computationLifecycle.begin({
      kind: 'template-compiler-target-revocation-test',
      reconciliationKey: fixture.browserRun.locus.reconciliationKey,
      summary: 'Disposable target-allocation authority.',
    });
    let aborted = false;
    try {
      const run = fixture.freshRunInCandidate('cursor-empty', candidate);
      const receipt = run.execute().completion?.receipt;
      if (receipt == null) throw new Error('Expected fresh completion receipt.');
      const rows = assembleTemplateCompilerOrdinaryRootRows(receipt).assembly;
      if (rows == null) throw new Error('Expected fresh row assembly.');
      const target = allocateTemplateCompilerOccurrenceTargetPlan(rows).assembly;
      if (target == null) throw new Error('Expected exact target plan.');
      const attachment = run.binding.execution.attachOccurrenceTargetPlan(target);
      const startRevision = run.binding.forest.mutationRevision;
      const startOperationCount = run.binding.execution.sequence.readOperations().length;

      candidate.abort();
      aborted = true;

      expect(attachment.isCurrent()).toBe(false);
      expect(() => executeTemplateCompilerOccurrenceTarget(attachment))
        .toThrow(/exact current attached root context/u);
      expect(run.binding.forest.mutationRevision).toBe(startRevision);
      expect(run.binding.execution.sequence.readOperations()).toHaveLength(startOperationCount);
    } finally {
      if (!aborted) candidate.abort();
    }
  });

  test('refuses sealing after a closed target loses candidate allocation authority', () => {
    const candidate = fixture.runtime.computationLifecycle.begin({
      kind: 'template-compiler-target-seal-revocation-test',
      reconciliationKey: fixture.browserRun.locus.reconciliationKey,
      summary: 'Disposable closed target-allocation authority.',
    });
    let aborted = false;
    try {
      const run = fixture.freshRunInCandidate('cursor-authored-carrier-static', candidate);
      const receipt = run.execute().completion?.receipt;
      if (receipt == null) throw new Error('Expected fresh completion receipt.');
      const rows = assembleTemplateCompilerOrdinaryRootRows(receipt).assembly;
      if (rows == null) throw new Error('Expected fresh row assembly.');
      const target = allocateTemplateCompilerOccurrenceTargetPlan(rows).assembly;
      if (target == null) throw new Error('Expected exact target plan.');
      const attachment = run.binding.execution.attachOccurrenceTargetPlan(target);
      executeTemplateCompilerOccurrenceTarget(attachment);

      candidate.abort();
      aborted = true;

      expect(() => run.binding.execution.seal()).toThrow(/lost terminal allocation authority/u);
    } finally {
      if (!aborted) candidate.abort();
    }
  });

  test('admits an authored template carrier as the first occurrence membership', () => {
    for (const [name, expectedMembershipCount] of [
      ['cursor-authored-carrier-empty', 1],
      ['cursor-authored-carrier-static', 2],
    ] as const) {
      const run = fixture.freshRun(name);
      const receipt = run.execute().completion?.receipt;
      if (receipt == null) throw new Error(`Expected fresh completion receipt for '${name}'.`);
      const rows = assembleTemplateCompilerOrdinaryRootRows(receipt).assembly;
      if (rows == null) throw new Error(`Expected fresh row assembly for '${name}'.`);
      const target = allocateTemplateCompilerOccurrenceTargetPlan(rows).assembly;
      if (target == null) throw new Error(`Expected exact target plan for '${name}'.`);

      expect(rows.rootMembership.authoredNode, name).not.toBeNull();
      expect(rows.rows, name).toEqual([]);
      expect(target.targetPlan.root.readOccurrenceMemberships(), name).toHaveLength(expectedMembershipCount);
      expect(target.targetPlan.root.readOccurrenceMemberships()[0]?.occurrence, name)
        .toBe(run.binding.lane.compilerCarrier);
      expect(target.targetPlan.root.readOccurrenceMemberships()[0]?.authoredNode, name)
        .toBe(rows.rootMembership.authoredNode);
      if (name === 'cursor-authored-carrier-static') {
        const child = target.targetPlan.root.readOccurrenceMemberships()[1];
        expect(child?.occurrence).toBe(rows.occurrenceMemberships[0]?.occurrence);
        expect(child?.authoredNode).toBe(rows.occurrenceMemberships[0]?.authoredNode);
      }

      const attachment = run.binding.execution.attachOccurrenceTargetPlan(target);
      const result = executeTemplateCompilerOccurrenceTarget(attachment);
      expect(result.operations, name).toEqual([]);
      expect(result.targetGeometries, name).toEqual([]);
      if (name === 'cursor-authored-carrier-static') {
        expect(run.binding.lane.compilerContent.readChildren()[0]).toMatchObject({ tagName: 'div' });
        expect((run.binding.lane.compilerContent.readChildren()[0] as TemplateCompilerElementOccurrence)
          .readAttributes()).toMatchObject([{ name: 'title', value: 'static' }]);
      }
      expect(run.binding.execution.seal(), name).toBe(run.binding.execution.sequence);
    }
  });

  test('refuses sealing after a closed occurrence target advances out of band', () => {
    const run = fixture.freshRun('cursor-authored-carrier-static');
    const receipt = run.execute().completion?.receipt;
    if (receipt == null) throw new Error('Expected fresh completion receipt.');
    const rows = assembleTemplateCompilerOrdinaryRootRows(receipt).assembly;
    if (rows == null) throw new Error('Expected fresh row assembly.');
    const target = allocateTemplateCompilerOccurrenceTargetPlan(rows).assembly;
    if (target == null) throw new Error('Expected exact target plan.');
    const attachment = run.binding.execution.attachOccurrenceTargetPlan(target);
    executeTemplateCompilerOccurrenceTarget(attachment);
    const retained = run.binding.forest.readAttributes()[0]!;

    run.binding.forest.rewriteAttributeValue(retained, 'changed-after-close');

    expect(() => run.binding.execution.seal()).toThrow(/advanced after occurrence target closure/u);
  });

  test('executes and closes the funded ordinary-root substrate in compiler site order', () => {
    for (const name of [
      'cursor-as-element-empty',
      'cursor-comment-shield',
      'cursor-containerless',
      'cursor-containerless-order',
      'cursor-empty',
      'cursor-foster',
      'cursor-live-duplicate',
      'cursor-live-multi-binding',
      'cursor-live-nonsingular',
      'cursor-live-staging',
      'cursor-native-containerless',
      'cursor-progression',
      'cursor-row-interleave',
      'cursor-row-merged',
      'cursor-slot-inert',
      'cursor-slot-valid',
      'cursor-ten-hole',
      'cursor-usage-containerless',
      'cursor-wide',
    ]) {
      const run = fixture.freshRun(name);
      const cursor = run.execute();
      const receipt = cursor.completion?.receipt;
      if (receipt == null) throw new Error(`Expected fresh completion receipt for '${name}'.`);
      const rows = assembleTemplateCompilerOrdinaryRootRows(receipt).assembly;
      if (rows == null) throw new Error(`Expected fresh row assembly for '${name}'.`);
      const hydrateElements = allocateTemplateCompilerOccurrenceHydrateElements(rows).assembly;
      const target = allocateTemplateCompilerOccurrenceTargetPlan(rows, hydrateElements).assembly;
      if (target == null) throw new Error(`Expected exact target plan for '${name}'.`);
      const attachment = run.binding.execution.attachOccurrenceTargetPlan(target);

      const result = executeTemplateCompilerOccurrenceTarget(attachment);
      const removedCount = rows.attributeDispositions.filter((disposition) =>
        disposition.disposition === TemplateCompilerLiveAttributeDisposition.Removed
      ).length;
      const elementRowCount = rows.rows.filter((row) => row.site.siteKind === 'element').length;
      const containerlessRowCount = rows.rows.filter((row) =>
        row.placementKind === TemplateCompilerTargetRowPlacementKind.ContainerlessReplacement
      ).length;
      const markerElementRowCount = elementRowCount - containerlessRowCount;

      expect(result.isModuleConstructed(), name).toBe(true);
      expect(attachment.isCurrent(), name).toBe(false);
      expect(result.attachment, name).toBe(attachment);
      expect(result.attributeDispositions, name).toHaveLength(removedCount);
      expect(result.textExpansions, name).toHaveLength(rows.textExpansions.length);
      expect(result.targetGeometries, name).toHaveLength(rows.rows.length);
      expect(result.operations, name).toHaveLength(removedCount + elementRowCount + rows.textExpansions.length);
      expect(result.operations.filter((operation) =>
        operation.operationKind === TemplateCompilerOperationKind.AttributeDisposition
      ), name).toHaveLength(removedCount);
      expect(result.operations.filter((operation) =>
        operation.operationKind === TemplateCompilerOperationKind.HydrationTargetCreation
      ), name).toHaveLength(markerElementRowCount);
      expect(result.operations.filter((operation) =>
        operation.operationKind === TemplateCompilerOperationKind.ContainerlessReplacement
      ), name).toHaveLength(containerlessRowCount);
      expect(result.operations.filter((operation) =>
        operation.operationKind === TemplateCompilerOperationKind.TextInterpolationExpansion
      ), name).toHaveLength(rows.textExpansions.length);
      expect(result.operations.every((operation, ordinal) =>
        ordinal === 0
          ? operation.startForestMutationRevision === attachment.forestMutationRevision
          : operation.startForestMutationRevision === result.operations[ordinal - 1]!.endForestMutationRevision
      ), name).toBe(true);
      expect(result.operations.at(-1)?.endForestMutationRevision ?? attachment.forestMutationRevision, name)
        .toBe(result.closure.forestMutationRevision);
      for (const operation of result.operations) {
        if (!(operation.target instanceof TemplateCompilerOccurrenceOperationTarget)) {
          throw new Error(`Expected occurrence target for '${operation.operationKey}'.`);
        }
        if (operation.operationKind === TemplateCompilerOperationKind.AttributeDisposition) {
          expect(operation.mutationBatch.topologyMutations, operation.operationKey).toEqual([
            expect.any(TemplateCompilerAttributeDetachmentMutation),
          ]);
          expect(operation.mutationBatch.attributeDetachmentMutations[0]?.attribute)
            .toBe(operation.target.occurrence);
          expect(operation.mutationBatch.occurrenceGenerationReservations).toEqual([]);
        } else if (operation.operationKind === TemplateCompilerOperationKind.HydrationTargetCreation) {
          expect(operation.mutationBatch.topologyMutations, operation.operationKey).toEqual([]);
          expect(operation.mutationBatch.occurrenceGenerationReservations, operation.operationKey).toMatchObject([{
            role: TemplateCompilerGeneratedOccurrenceRole.CompilerMarker,
            operationKey: operation.operationKey,
            batchOperationKey: operation.operationKey,
            outputOrdinal: 0,
          }]);
        } else if (operation.operationKind === TemplateCompilerOperationKind.ContainerlessReplacement) {
          const mapping = target.rowMappings.find((candidate) =>
            candidate.draft.occurrence === operation.target.occurrence
          )!;
          const geometry = attachment.structuralExecution.readTargetGeometry(mapping.row);
          if (geometry?.geometryKind !== 'render-location') {
            throw new Error(`Expected render-location geometry for '${operation.operationKey}'.`);
          }
          expect(operation.mutationBatch.topologyMutations, operation.operationKey).toEqual([
            expect.any(TemplateCompilerNodeDetachmentMutation),
          ]);
          expect(operation.mutationBatch.nodeDetachmentMutations[0]).toMatchObject({
            node: geometry.replacedNode,
            previousParent: geometry.realizedParent,
            previousOrdinal: geometry.realizedOrdinal + 3,
          });
          expect(operation.mutationBatch.occurrenceGenerationReservations.map((generation) => [
            generation.role,
            generation.operationKey,
            generation.outputOrdinal,
          ])).toEqual([
            [TemplateCompilerGeneratedOccurrenceRole.CompilerMarker, operation.operationKey, 0],
            [TemplateCompilerGeneratedOccurrenceRole.RenderLocationStart, operation.operationKey, 0],
            [TemplateCompilerGeneratedOccurrenceRole.RenderLocationEnd, operation.operationKey, 0],
          ]);
          expect(operation.endForestMutationRevision - operation.startForestMutationRevision).toBe(7);
        } else if (operation.operationKind === TemplateCompilerOperationKind.TextInterpolationExpansion) {
          const expansion = rows.textExpansions.find((candidate) =>
            operation.target instanceof TemplateCompilerOccurrenceOperationTarget
            && candidate.site.event.text === operation.target.occurrence
          )!;
          const holeCount = expansion.outputs.filter((output) => output.outputKind === 'hole').length;
          expect(operation.mutationBatch.topologyMutations, operation.operationKey).toEqual([
            expect.any(TemplateCompilerNodeDetachmentMutation),
          ]);
          expect(operation.mutationBatch.nodeDetachmentMutations[0]?.node).toBe(expansion.site.event.text);
          expect(operation.mutationBatch.occurrenceGenerationReservations, operation.operationKey)
            .toHaveLength(expansion.outputs.length + holeCount);
          expect(operation.mutationBatch.occurrenceGenerationReservations.filter((generation) =>
            generation.role === TemplateCompilerGeneratedOccurrenceRole.BindingPlaceholder
          )).toHaveLength(holeCount);
          expect(operation.mutationBatch.occurrenceGenerationReservations.filter((generation) =>
            generation.role === TemplateCompilerGeneratedOccurrenceRole.CompilerMarker
          )).toHaveLength(holeCount);
        }
      }
      for (const mapping of target.rowMappings.filter((candidate) => candidate.draft.textOutput != null)) {
        const expansion = rows.textExpansions.find((candidate) => candidate.site === mapping.draft.site)!;
        const geometry = attachment.structuralExecution.readTargetGeometry(mapping.row);
        if (geometry?.geometryKind !== 'marker') throw new Error(`Expected text marker geometry for '${name}'.`);
        const rowCauses = mapping.row.instructions.map((instruction) => instruction.productHandle);
        const batchOperationKey = `${attachment.contexts[0]!.localKey}:${expansion.stableSlotKey}`;
        expect(geometry.target.generation, mapping.row.localKey).toMatchObject({
          operationKey: mapping.row.localKey,
          batchOperationKey,
          outputOrdinal: 0,
          causeHandles: rowCauses,
        });
        expect(geometry.marker.generation, mapping.row.localKey).toMatchObject({
          operationKey: mapping.row.localKey,
          batchOperationKey,
          outputOrdinal: 0,
          causeHandles: rowCauses,
        });
      }
      expect(run.binding.execution.invocationPhase(run.binding.lane), name)
        .toBe(TemplateCompilerInvocationPhase.TargetClosed);
      expect(executeTemplateCompilerOccurrenceTarget(attachment), name).toBe(result);
      expect(run.binding.execution.seal(), name).toBe(run.binding.execution.sequence);
      run.binding.execution.assertCoherent();

      if (name === 'cursor-as-element-empty') {
        expect(result.targetGeometries).toEqual([]);
        expect(result.attributeDispositions).toHaveLength(1);
        expect(result.attributeDispositions[0]?.attribute.name).toBe('as-element');
        expect(result.attributeDispositions[0]?.attribute.owner).toBeNull();
      }
      if (name === 'cursor-slot-inert') {
        expect(result.operations).toEqual([]);
        expect(result.targetGeometries).toEqual([]);
      }
      if (name === 'cursor-native-containerless') {
        expect(rows.rows).toEqual([]);
        expect(result.targetGeometries).toEqual([]);
        expect(result.operations.map((operation) => operation.operationKind)).toEqual([
          TemplateCompilerOperationKind.AttributeDisposition,
        ]);
        const disposition = target.attributeDispositionMappings[0]!;
        expect(disposition.draft.attribute.name).toBe('containerless');
        expect(disposition.causeHandles).toEqual([
          disposition.draft.attribute.inputReference?.productHandle,
        ]);
      }
      if (name === 'cursor-live-multi-binding') {
        const customAttribute = rows.attributeDispositions.find((disposition) =>
          disposition.contribution.targetLane === TemplateCompilerLiveAttributeTargetLane.CustomAttribute
        );
        const wrapper = customAttribute?.site.owner.instructionStaging.hydrateAttributes[0] ?? null;
        expect(customAttribute).not.toBeNull();
        expect(wrapper).not.toBeNull();
        expect(customAttribute?.causeHandles[0]).toBe(customAttribute?.attribute.inputReference?.productHandle);
        expect(customAttribute?.causeHandles).toContain(wrapper?.productHandle);
        expect(result.attributeDispositions.find((disposition) =>
          disposition.attribute === customAttribute?.attribute
        )?.causeHandles).toEqual(customAttribute?.causeHandles);
      }
      if (name === 'cursor-live-duplicate') {
        const structure = attachment.structuralExecution.readContextStructure(target.targetPlan.root)!;
        expect(occurrenceShape(structure.compilerContent)).toEqual([
          'comment:au',
          ['element:div', [], []],
          'text:\n',
          'comment:au',
          ['element:div', [], []],
          'text:\n',
        ]);
      }
      if (name === 'cursor-live-nonsingular') {
        expect(new Set(result.targetGeometries.map((geometry) => geometry.logicalTarget)).size).toBe(2);
        expect(result.targetGeometries.map((geometry) => geometry.row.occurrence))
          .toEqual(result.targetGeometries.map((geometry) => geometry.logicalTarget));
      }
      if (name === 'cursor-containerless' || name === 'cursor-usage-containerless') {
        expect(rows.rows).toHaveLength(1);
        expect(rows.rows[0]).toMatchObject({
          targetKind: TemplateRenderTargetKind.RenderLocation,
          instructions: [],
        });
        expect(target.rowMappings[0]?.row.instructions.map((instruction) => instruction.instructionKind))
          .toEqual(['hydrate-element']);
        expect(target.rowMappings[0]?.row.placement)
          .toBeInstanceOf(TemplateCompilerContainerlessReplacementPlacement);
        expect(target.rowMappings[0]?.hydrateElement?.instruction.containerless)
          .toBe(name === 'cursor-usage-containerless');
        expect(target.publicationPrerequisites.map((entry) => entry.prerequisiteKind)).toEqual([
          'containerless-host-requirement',
        ]);
        const geometry = result.targetGeometries[0];
        if (geometry?.geometryKind !== 'render-location') throw new Error('Expected containerless geometry.');
        expect(geometry.replacedNode).toBe(rows.rows[0]?.occurrence);
        expect(geometry.placement).toBe(target.rowMappings[0]?.row.placement);
        expect(geometry.replacedNode?.parent).toBeNull();
        expect(geometry.logicalTarget).toBe(geometry.end);
        expect(attachment.structuralExecution.readConsumedNodeDispositions()).toEqual([]);
        const structure = attachment.structuralExecution.readContextStructure(target.targetPlan.root)!;
        expect(occurrenceShape(structure.compilerContent)).toEqual([
          'comment:au',
          'comment:au-start',
          'comment:au-end',
          'text:\n',
        ]);
        if (name === 'cursor-usage-containerless') {
          const disposition = target.attributeDispositionMappings.find((mapping) =>
            mapping.draft.attribute.name === 'containerless'
          )!;
          expect(disposition.causeHandles).toEqual([
            disposition.draft.attribute.inputReference?.productHandle,
            target.rowMappings[0]?.hydrateElement?.instruction.productHandle,
          ]);
          expect(result.operations.map((operation) => operation.operationKind)).toEqual([
            TemplateCompilerOperationKind.AttributeDisposition,
            TemplateCompilerOperationKind.ContainerlessReplacement,
          ]);
        } else {
          expect(result.operations.map((operation) => operation.operationKind)).toEqual([
            TemplateCompilerOperationKind.ContainerlessReplacement,
          ]);
        }
      }
      if (name === 'cursor-containerless-order') {
        expect(requireTranscript(cursor).events.filter((event) =>
          event.eventKind === 'element'
          || event.eventKind === 'attribute'
          || event.eventKind === 'containerless-placement'
        ).map((event) => event.eventKind)).toEqual([
          'element', 'containerless-placement',
          'element', 'attribute', 'containerless-placement',
          'element', 'attribute', 'containerless-placement',
          'element', 'attribute',
        ]);
        expect(rows.rows.map((row) => row.targetKind)).toEqual([
          TemplateRenderTargetKind.RenderLocation,
          TemplateRenderTargetKind.RenderLocation,
          TemplateRenderTargetKind.RenderLocation,
          TemplateRenderTargetKind.MarkerTarget,
        ]);
        expect(target.rowMappings.slice(0, 3).map((mapping) =>
          mapping.hydrateElement?.instruction.containerless
        )).toEqual([false, true, true]);
        expect(target.publicationPrerequisites.map((entry) => entry.prerequisiteKind)).toEqual([
          'containerless-host-requirement',
          'containerless-host-requirement',
          'containerless-host-requirement',
        ]);
        expect(result.targetGeometries.map((geometry) => geometry.geometryKind)).toEqual([
          'render-location',
          'render-location',
          'render-location',
          'marker',
        ]);
        expect(result.operations.map((operation) => operation.operationKind)).toEqual([
          TemplateCompilerOperationKind.ContainerlessReplacement,
          TemplateCompilerOperationKind.AttributeDisposition,
          TemplateCompilerOperationKind.ContainerlessReplacement,
          TemplateCompilerOperationKind.AttributeDisposition,
          TemplateCompilerOperationKind.ContainerlessReplacement,
          TemplateCompilerOperationKind.AttributeDisposition,
          TemplateCompilerOperationKind.HydrationTargetCreation,
        ]);
        const structure = attachment.structuralExecution.readContextStructure(target.targetPlan.root)!;
        expect(occurrenceShape(structure.compilerContent)).toEqual([
          'comment:au', 'comment:au-start', 'comment:au-end',
          'comment:au', 'comment:au-start', 'comment:au-end',
          'comment:au', 'comment:au-start', 'comment:au-end',
          'comment:au', ['element:div', [], []], 'text:\n',
        ]);
      }
      if (name === 'cursor-row-interleave') {
        expect(target.rowMappings.every((mapping) =>
          mapping.row.placement instanceof TemplateCompilerMarkerTargetPlacement
        )).toBe(true);
        const structure = attachment.structuralExecution.readContextStructure(target.targetPlan.root)!;
        expect(occurrenceShape(structure.compilerContent)).toEqual([
          'text:before ',
          'comment:au',
          'text: ',
          'text: middle ',
          'comment:au',
          'text: ',
          'text: end',
          'comment:au',
          ['element:div', [], [
            'text:inner ',
            'comment:au',
            'text: ',
            'text: tail',
          ]],
          'comment:au',
          ['element:span', [], []],
          'text:after ',
          'comment:au',
          'text: ',
          'text: done\n',
        ]);
      }
      if (name === 'cursor-ten-hole') {
        const structure = attachment.structuralExecution.readContextStructure(target.targetPlan.root)!;
        const paragraph = structure.compilerContent.readChildren().find((node) =>
          node instanceof TemplateCompilerElementOccurrence && node.tagName === 'p'
        );
        if (!(paragraph instanceof TemplateCompilerElementOccurrence)) {
          throw new Error('Expected ten-hole paragraph.');
        }
        expect(rows.rows).toHaveLength(10);
        expect(rows.textExpansions).toHaveLength(1);
        expect(result.operations).toHaveLength(1);
        expect(occurrenceShape(paragraph)).toEqual(Array.from(
          { length: 10 },
          () => ['comment:au', 'text: '],
        ).flat());
      }
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

  execute(
    traversalMode: TemplateCompilerSiteCursorTraversalMode = TemplateCompilerSiteCursorTraversalMode.CompatibilityStop,
  ): TemplateCompilerSiteCursorResult {
    return executeTemplateCompilerRootSiteCursor({
      binding: this.binding,
      compilerReads: this.reads(),
      preWalkAuthority: TemplateCompilerPreWalkRemainderAuthority.capture(this.binding),
      traversalMode,
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

  freshRunInCandidate(
    name: string,
    candidate: CursorCandidateRun,
  ): CursorRun {
    const compilation = this.compilation(name);
    const family = this.frontDoor.familyForOwner(compilation.familyOwnerHandle);
    if (family == null) throw new Error(`Expected current cursor family '${name}'.`);
    const ordinal = this.freshRunOrdinal++;
    return new CursorRun(
      this,
      compilation,
      this.bind(compilation, family, `cursor-browser:${name}:candidate:${ordinal}`, null, candidate),
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
    publication: CursorCandidateRun = this.browserRun,
  ): TemplateCompilerSiteInvocationBinding {
    const browserEmission = this.materializeBrowser(compilation, localKey, publication);
    const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(browserEmission);
    prepareForest?.(forest);
    const execution = TemplateCompilerExecutionSession.createForForest(localKey, forest);
    const lane = execution.admitRootInvocation(compilation.localKey);
    const hook = executeTemplateCompilerHookBootstrap({
      execution,
      lane,
      compilerWorld: compilation.compilerWorld,
      executionOpenSeamHandle: publication.handles.openSeam(`${localKey}:hook-open`),
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
    publication: CursorCandidateRun = this.browserRun,
  ): BrowserEffectiveTemplateEmission {
    const markup = compilation.unit.templateSource.markup;
    if (markup == null || compilation.html.draft == null) {
      throw new Error(`Cursor compilation '${compilation.definition.name}' has no retained markup/draft.`);
    }
    const browser = parseBrowserTemplateFragmentDraft(markup);
    return new BrowserEffectiveTemplateMaterializer(publication).materialize({
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

function cursorOccurrenceLabel(node: TemplateCompilerNodeOccurrence): string {
  if (node instanceof TemplateCompilerElementOccurrence) return node.tagName;
  if (node instanceof TemplateCompilerTextOccurrence) return '#text';
  if (node instanceof TemplateCompilerFragmentOccurrence) return '#fragment';
  if (node instanceof TemplateCompilerCommentOccurrence) return '#comment';
  return node.nodeKind;
}

function occurrenceShape(
  node: TemplateCompilerFragmentOccurrence | TemplateCompilerElementOccurrence,
): readonly unknown[] {
  return node.readChildren().map((child): unknown => {
    if (child instanceof TemplateCompilerCommentOccurrence) return `comment:${child.text}`;
    if (child instanceof TemplateCompilerTextOccurrence) return `text:${child.text}`;
    if (child instanceof TemplateCompilerElementOccurrence) {
      return [
        `element:${child.tagName}`,
        child.readAttributes().map((attribute) => `${attribute.name}=${attribute.value}`),
        occurrenceShape(child),
      ];
    }
    return ['fragment', occurrenceShape(child)];
  });
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
