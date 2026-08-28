import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
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
import {
  TemplateCompilerTargetContextRole,
  TemplateCompilerTargetRowPlacementKind,
  TemplateCompilerTargetRowSourceKind,
} from '../src/template/compiler-target-plan.js';
import {
  TemplateCompilerExecutionSession,
  type TemplateCompilerSiteExecutionEndpointReceipt,
} from '../src/template/template-compiler-execution.js';
import {
  completeTemplateCompilerContextFamily,
  TemplateCompilerContextFamilyCompletionReasonKind,
  TemplateCompilerContextFamilyCompletionState,
} from '../src/template/template-compiler-context-family-completion.js';
import {
  prepareTemplateCompilerContextFamilyAllocation,
  TemplateCompilerContextFamilyAllocationReasonKind,
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
  type TemplateCompilerFamilyContextExecutionBand,
  TemplateCompilerFamilyLoweredElementExecutionBand,
  TemplateCompilerFamilyLoweredElementScheduleEntry,
  TemplateCompilerFamilyReachedElementExecutionBand,
  TemplateCompilerFamilyReachedElementScheduleEntry,
  TemplateCompilerFamilyTemplateControllerScheduleEntry,
  TemplateCompilerFamilyTextScheduleEntry,
} from '../src/template/template-compiler-context-family-structural-schedule.js';
import {
  assembleTemplateCompilerContextFamilyRows,
  TemplateCompilerContextFamilyRowAssemblyState,
  TemplateCompilerFamilyOccurrenceArrivalPosture,
  TemplateCompilerFamilyTemplateControllerTransitionRowDraft,
} from '../src/template/template-compiler-context-family-row-assembly.js';
import {
  prepareTemplateCompilerFamilyWireFunding,
  TemplateCompilerFamilyWireFundingState,
  TemplateCompilerFamilyWireResolution,
  TemplateCompilerFamilyWireRole,
} from '../src/template/template-compiler-family-wire-funding.js';
import { executeTemplateCompilerHookBootstrap } from '../src/template/template-compiler-hook-bootstrap.js';
import {
  TemplateCompilerHydrateElementBlockerKind,
  type TemplateCompilerHydrateElementEnvelopeDraft,
} from '../src/template/template-compiler-hydrate-element-staging.js';
import { TemplateInstructionKind } from '../src/template/instruction-ir.js';
import {
  TemplateCompilerLiveAllocationLedgerState,
  TemplateCompilerLiveProductReservationRole,
} from '../src/template/template-compiler-live-allocation.js';
import { TemplateCompilerLiveAttributeTargetLane } from '../src/template/template-compiler-live-attribute-assembly.js';
import { executeTemplateCompilerLocalExtraction } from '../src/template/template-compiler-local-extraction.js';
import {
  buildTemplateCompilerNormalizedSiteIndex,
  TemplateCompilerNormalizedSiteIndexState,
} from '../src/template/template-compiler-normalized-site-index.js';
import {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerFragmentOccurrence,
  type TemplateCompilerNodeOccurrence,
  TemplateCompilerOccurrenceForest,
  TemplateCompilerTextOccurrence,
} from '../src/template/template-compiler-occurrence.js';
import {
  TemplateCompilerPreWalkBrowserOriginState,
  TemplateCompilerPreWalkRemainderAuthority,
} from '../src/template/template-compiler-prewalk-remainder.js';
import {
  prepareTemplateCompilerProjectionLogicalExtraction,
  realizeTemplateCompilerProjectionLogicalExtraction,
  type TemplateCompilerProjectionLogicalExtractionPreparation,
} from '../src/template/template-compiler-projection-logical-extraction.js';
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
  type TemplateCompilerSiteCursorEvent,
  TemplateCompilerSiteCursorFrontierKind,
  TemplateCompilerSiteCursorProjectionExtractionEvent,
  TemplateCompilerSiteCursorResultState,
  TemplateCompilerSiteCursorTaskSession,
  TemplateCompilerSiteCursorTemplateControllerTransitionEvent,
  TemplateCompilerSiteCursorTraversalMode,
  TemplateCompilerTemplateControllerTransitionEdgeReceipt,
  type TemplateCompilerSiteCursorTaskSelection,
  type TemplateCompilerSiteCursorTranscript,
} from '../src/template/template-compiler-site-cursor.js';
import {
  TemplateCompilerOrdinaryRootCompletionRefusalKind,
  type TemplateCompilerOrdinaryRootCompletionResult,
} from '../src/template/template-compiler-root-completion.js';
import type {
  TemplateCompilationFamilyFrontDoorEmission,
  TemplateCompilationFrontDoorEmission,
  TemplateResourceCompilationEmission,
} from '../src/template/template-compilation-project-pass.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
type CandidateRun = ReturnType<
  Awaited<ReturnType<typeof createSemanticRuntime>>['computationLifecycle']['begin']
>;

describe('template compiler projection logical extraction', () => {
  let fixture: ProjectionLogicalExtractionFixture;

  beforeAll(async () => {
    fixture = await ProjectionLogicalExtractionFixture.create();
  }, 30_000);

  afterAll(() => {
    fixture?.dispose();
  });

  test('prepares mixed-parent, empty, discarded, and slot-consumption plans from the attested transcript', () => {
    const run = fixture.run('projection-logical-host');
    expect(run.transcript.traversalMode).toBe(TemplateCompilerSiteCursorTraversalMode.CompatibilityStop);
    const startRevision = run.binding.forest.mutationRevision;
    const startOperationCount = run.binding.execution.sequence.readOperations().length;
    const schedulerCapture = vi.spyOn(
      TemplateCompilerSiteCursorTaskSession.prototype,
      'capturePhysicalChildren',
    );
    let preparation: TemplateCompilerProjectionLogicalExtractionPreparation;
    try {
      preparation = run.prepare();
    } finally {
      expect(schedulerCapture).not.toHaveBeenCalled();
      schedulerCapture.mockRestore();
    }

    expect(preparation.isModuleConstructed()).toBe(true);
    expect(preparation.isCurrent()).toBe(true);
    expect(preparation.reachedElement).toBe(run.envelope.reachedElement);
    expect(preparation.reachedSelectionEvent).toBe(run.envelope.reachedElement.reachedSelectionEvent);
    expect(preparation.taskSession).toBe(run.envelope.reachedElement.reachedSelectionEvent.session);
    expect(preparation.sourceSelection).toBe(run.envelope.reachedElement.reachedSelectionEvent.selection);
    expect(preparation.elementEvent).toBe(run.envelope.reachedElement.elementEvent);
    expect(preparation.plannedEntrantBands.map((band) => [
      band.group.slotName,
      band.entrants.map((entrant) => occurrenceLabel(entrant.node)),
    ])).toEqual([
      ['default', ['span']],
      ['named', ['b', 'i']],
      ['empty', []],
    ]);

    const named = preparation.plannedEntrantBands[1]!;
    expect(named.entrants.map((entrant) => [
      occurrenceLabel(entrant.source.parent),
      entrant.source.sourceOrdinal,
      entrant.source.capturedSuccessor == null ? null : occurrenceLabel(entrant.source.capturedSuccessor),
      entrant.logicalOrdinal,
      entrant.logicalSuccessor == null ? null : occurrenceLabel(entrant.logicalSuccessor),
    ])).toEqual([
      ['projection-logical-leaf', 2, 'template', 0, 'i'],
      ['#fragment', 0, null, 1, null],
    ]);
    expect(preparation.discardedWhitespace.map((receipt) => [
      occurrenceLabel(receipt.source.parent),
      receipt.source.sourceOrdinal,
      occurrenceLabel(receipt.source.capturedSuccessor!),
      receipt.source.origin.browserOriginState,
    ])).toEqual([[
      'projection-logical-leaf',
      1,
      'b',
      TemplateCompilerPreWalkBrowserOriginState.Singular,
    ]]);
    expect(preparation.unwrappedWrappers.map((receipt) => [
      receipt.contributor.slotName,
      receipt.contentSource.children.map(occurrenceLabel),
      receipt.wrapperSource.sourceOrdinal,
      receipt.wrapperSource.capturedSuccessor == null
        ? null
        : occurrenceLabel(receipt.wrapperSource.capturedSuccessor),
    ])).toEqual([
      ['named', ['i'], 3, 'template'],
      ['empty', [], 4, null],
    ]);
    expect(preparation.slotConsumptions.map((receipt) => [
      receipt.element.tagName,
      receipt.attribute.value,
      receipt.physicalOrdinal,
      receipt.origin.browserOriginState,
    ])).toEqual([
      ['b', 'named', 0, TemplateCompilerPreWalkBrowserOriginState.Singular],
      ['template', 'named', 0, TemplateCompilerPreWalkBrowserOriginState.Singular],
      ['template', 'empty', 0, TemplateCompilerPreWalkBrowserOriginState.Singular],
    ]);
    expect(preparation.residuals).toEqual([]);
    expect(run.binding.forest.mutationRevision).toBe(startRevision);
    expect(run.binding.execution.sequence.readOperations()).toHaveLength(startOperationCount);
  });

  test('retains explicit-shadow residual order without turning residuals into entrants', () => {
    const preparation = fixture.run('projection-logical-shadow-host').prepare();

    expect(preparation.plannedEntrantBands.map((band) => [
      band.group.slotName,
      band.entrants.map((entrant) => occurrenceLabel(entrant.node)),
    ])).toEqual([['named', ['b']]]);
    expect(preparation.residuals.map((receipt) => [
      occurrenceLabel(receipt.source.node),
      occurrenceLabel(receipt.source.parent),
      receipt.source.sourceOrdinal,
      occurrenceLabel(receipt.source.capturedSuccessor!),
    ])).toEqual([['span', 'projection-logical-shadow-leaf', 0, 'b']]);
    expect(preparation.discardedWhitespace).toEqual([]);
  });

  test('keeps explicit-shadow residual traversal at its named closed-family frontier', () => {
    const run = fixture.run(
      'projection-logical-shadow-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );

    expect(run.transcript.frontier?.frontierKind)
      .toBe(TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeProjection);
    expect(run.transcript.taskSnapshot.contexts).toHaveLength(1);
    expect(eventsOf(run.transcript, TemplateCompilerSiteCursorProjectionExtractionEvent)).toEqual([]);
  });

  test('traverses non-TC projection groups and resumes the following source sibling in closed-family mode', () => {
    const run = fixture.run(
      'projection-logical-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const transcript = run.transcript;
    const tasks = transcript.taskSnapshot;
    const contexts = tasks.contexts.map((task) => task.context);
    const projectionEvent = eventsOf(transcript, TemplateCompilerSiteCursorProjectionExtractionEvent)[0];
    const elements = eventsOf(transcript, TemplateCompilerSiteCursorElementEvent);

    expect(transcript.frontier).toBeNull();
    expect(transcript.traversalMode).toBe(TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily);
    expect(contexts.map((context) => context.contextKind)).toEqual([
      TemplateCompilerSiteCursorContextKind.Root,
      TemplateCompilerSiteCursorContextKind.Projection,
      TemplateCompilerSiteCursorContextKind.Projection,
      TemplateCompilerSiteCursorContextKind.Projection,
    ]);
    expect(contexts.slice(1).every((context) => context.parent === tasks.rootContext)).toBe(true);
    expect(tasks.contexts.every((task) => task.state === TemplateCompilerSiteCursorContextTaskState.Drained)).toBe(true);
    expect(projectionEvent?.preparation.plannedEntrantBands.map((band) => band.group.slotName))
      .toEqual(['default', 'named', 'empty']);
    expect(projectionEvent?.entrantBandStagings.map((staging) => [
      staging.band.planned.group.slotName,
      staging.works.length,
    ])).toEqual([
      ['default', 1],
      ['named', 2],
      ['empty', 0],
    ]);
    for (const staging of projectionEvent?.entrantBandStagings ?? []) {
      expect(staging.works.map((work) => [work.context, work.entrantAuthority])).toEqual(
        staging.band.entrants.map((entrant) => [staging.band.context, entrant]),
      );
    }
    expect(tasks.contextForEvent(projectionEvent!)).toBe(tasks.rootContext);
    expect(contextForElement(tasks, elements, 'span')).toBe(contexts[1]);
    expect(contextForElement(tasks, elements, 'b')).toBe(contexts[2]);
    expect(contextForElement(tasks, elements, 'i')).toBe(contexts[2]);
    expect(contextForElement(tasks, elements, 'div')).toBe(tasks.rootContext);
    expect(eventsOf(transcript, TemplateCompilerSiteCursorAttributeEvent)
      .filter((event) => event.attribute.name === 'au-slot')).toEqual([]);
    expect(eventsOf(transcript, TemplateCompilerSiteCursorTemplateControllerTransitionEvent)).toEqual([]);
    expect(tasks.taskForContext(contexts[3]!)?.events).toEqual([]);
    expect(run.completion.refusals.map((refusal) => refusal.refusalKind))
      .toContain(TemplateCompilerOrdinaryRootCompletionRefusalKind.ContextFamilyTraversal);
  });

  test('places a logically empty projected containerless host after group traversal', () => {
    const run = fixture.run(
      'projection-logical-containerless-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const transcript = run.transcript;
    const extraction = eventsOf(transcript, TemplateCompilerSiteCursorProjectionExtractionEvent)[0];
    const placement = eventsOf(transcript, TemplateCompilerSiteCursorContainerlessPlacementEvent)[0];

    expect(transcript.frontier).toBeNull();
    expect(extraction).toBeDefined();
    expect(placement).toBeDefined();
    expect(placement?.projectionExtraction).toBe(extraction);
    expect(extraction!.ordinal).toBeLessThan(placement!.ordinal);
    expect(transcript.taskSnapshot.contextForEvent(extraction!)).toBe(transcript.taskSnapshot.rootContext);
    expect(transcript.taskSnapshot.contextForEvent(placement!)).toBe(transcript.taskSnapshot.rootContext);
    expect(contextForElement(
      transcript.taskSnapshot,
      eventsOf(transcript, TemplateCompilerSiteCursorElementEvent),
      'div',
    )).toBe(transcript.taskSnapshot.rootContext);
  });

  test('traverses authored template content in the terminal TC leaf', () => {
    const run = fixture.run(
      'projection-logical-tc-only-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const transcript = run.transcript;
    const tasks = transcript.taskSnapshot;
    const contexts = tasks.contexts.map((task) => task.context);
    const elements = eventsOf(transcript, TemplateCompilerSiteCursorElementEvent);
    const transition = eventsOf(transcript, TemplateCompilerSiteCursorTemplateControllerTransitionEvent)[0];
    if (transition == null) throw new Error('Expected one TC-only transition event.');

    expect(transcript.frontier).toBeNull();
    expect(contexts.map((context) => context.contextKind)).toEqual([
      TemplateCompilerSiteCursorContextKind.Root,
      TemplateCompilerSiteCursorContextKind.TemplateController,
      TemplateCompilerSiteCursorContextKind.TemplateController,
    ]);
    expect(contexts[1]?.parent).toBe(tasks.rootContext);
    expect(contexts[2]?.parent).toBe(contexts[1]);
    expect(contextForElement(tasks, elements, 'template')).toBe(tasks.rootContext);
    expect(contextForElement(tasks, elements, 'div')).toBe(contexts[2]);
    expect(contextForElement(tasks, elements, 'span')).toBe(tasks.rootContext);
    expect(eventsOf(transcript, TemplateCompilerSiteCursorProjectionExtractionEvent)).toEqual([]);
    expect(transition).toBeDefined();
    expect(tasks.contextForEvent(transition!)).toBe(tasks.rootContext);
    expect(transition.preparation.request.reachedElement.elementEvent.ordinal).toBeLessThan(transition.ordinal);
    expect(transition?.preparation.drafts)
      .toBe(transition?.preparation.request.owner.instructionStaging.templateControllers);
    expect(transition?.preparation.drafts.map((draft) => draft.controllerName))
      .toEqual(['projection-logical-outer', 'projection-logical-inner']);
    expect(transition?.realization.contexts).toEqual(contexts.slice(1));
    expect(transition?.realization.edges.map((edge) => [
      edge.rowContext,
      edge.childContext,
      edge.placementKind,
    ])).toEqual([
      [tasks.rootContext, contexts[1], TemplateCompilerTargetRowPlacementKind.TemplateControllerSourceReplacement],
      [contexts[1], contexts[2], TemplateCompilerTargetRowPlacementKind.TemplateControllerGeneratedAppend],
    ]);
    expect(transition?.realization.terminalLeaf).toBe(contexts[2]);
    expect(transition?.realization.leafRehoming).toMatchObject({
      host: transition.preparation.host,
      sourceContext: tasks.rootContext,
      terminalLeaf: contexts[2],
      owner: transition.preparation.request.owner,
      hydrateElement: transition.preparation.request.hydrateElement,
      directRowTail: transition.preparation.directRowTail,
      projectionRealization: null,
    });
    const family = completeTemplateCompilerContextFamily(run.transcript, run.endpoint);
    expect(family.state).toBe(TemplateCompilerContextFamilyCompletionState.Complete);
    expect(family.traversal?.contexts.filter((context) =>
      context.context.contextKind === TemplateCompilerSiteCursorContextKind.TemplateController
    ).every((context, ordinal) =>
      context.templateControllerOwner?.edge === transition.realization.edges[ordinal]
    )).toBe(true);
    expect(family.traversal?.templateControllerLeafRehomings[0]?.receipt)
      .toBe(transition.realization.leafRehoming);
    expect(run.completion.refusals.map((refusal) => refusal.refusalKind))
      .toContain(TemplateCompilerOrdinaryRootCompletionRefusalKind.ContextFamilyTraversal);
  });

  test('stops native TC leaf traversal when a child still carries projection syntax', () => {
    const run = fixture.run(
      'projection-logical-native-tc-slot-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const transcript = run.transcript;
    const transition = eventsOf(transcript, TemplateCompilerSiteCursorTemplateControllerTransitionEvent)[0];

    expect(transcript.frontier?.frontierKind)
      .toBe(TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeProjection);
    expect(transition).toBeDefined();
    expect(transcript.taskSnapshot.contextForEvent(transition!)).toBe(transcript.taskSnapshot.rootContext);
    expect(eventsOf(transcript, TemplateCompilerSiteCursorElementEvent).map((event) => event.element.tagName))
      .not.toContain('span');
    expect(transcript.taskSnapshot.contexts.map((task) => task.state)).toEqual([
      TemplateCompilerSiteCursorContextTaskState.Waiting,
      TemplateCompilerSiteCursorContextTaskState.Stopped,
    ]);
    expect(completeTemplateCompilerContextFamily(transcript, run.endpoint).state)
      .toBe(TemplateCompilerContextFamilyCompletionState.Ineligible);
  });

  test('enters the terminal TC leaf, runs projection fan-out, and returns to the root sibling', () => {
    const run = fixture.run(
      'projection-logical-tc-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const transcript = run.transcript;
    const tasks = transcript.taskSnapshot;
    const contexts = tasks.contexts.map((task) => task.context);
    const elements = eventsOf(transcript, TemplateCompilerSiteCursorElementEvent);
    const projectionEvent = eventsOf(transcript, TemplateCompilerSiteCursorProjectionExtractionEvent)[0];
    const transition = eventsOf(transcript, TemplateCompilerSiteCursorTemplateControllerTransitionEvent)[0];
    if (transition == null) throw new Error('Expected one TC plus projection transition event.');

    expect(transcript.frontier).toBeNull();
    expect(contexts.map((context) => context.contextKind)).toEqual([
      TemplateCompilerSiteCursorContextKind.Root,
      TemplateCompilerSiteCursorContextKind.TemplateController,
      TemplateCompilerSiteCursorContextKind.TemplateController,
      TemplateCompilerSiteCursorContextKind.Projection,
      TemplateCompilerSiteCursorContextKind.Projection,
    ]);
    expect(contexts[1]?.parent).toBe(tasks.rootContext);
    expect(contexts[2]?.parent).toBe(contexts[1]);
    expect(contexts[3]?.parent).toBe(contexts[2]);
    expect(contexts[4]?.parent).toBe(contexts[2]);
    expect(transition).toBeDefined();
    expect(tasks.contextForEvent(transition!)).toBe(tasks.rootContext);
    expect(transition.ordinal).toBeLessThan(projectionEvent!.ordinal);
    expect(transition?.preparation.drafts)
      .toBe(transition?.preparation.request.owner.instructionStaging.templateControllers);
    expect(transition?.preparation.drafts.map((draft) => draft.controllerName))
      .toEqual(['projection-logical-outer', 'projection-logical-inner']);
    expect(transition?.realization.contexts).toEqual(contexts.slice(1, 3));
    expect(transition?.realization.edges.map((edge) => [
      edge.draft,
      edge.rowContext,
      edge.childContext,
      edge.placementKind,
    ])).toEqual([
      [
        transition?.preparation.drafts[0],
        tasks.rootContext,
        contexts[1],
        TemplateCompilerTargetRowPlacementKind.TemplateControllerSourceReplacement,
      ],
      [
        transition?.preparation.drafts[1],
        contexts[1],
        contexts[2],
        TemplateCompilerTargetRowPlacementKind.TemplateControllerGeneratedAppend,
      ],
    ]);
    expect(transition?.realization.terminalLeaf).toBe(contexts[2]);
    expect(transition?.realization.leafRehoming.host).toBe(transition?.preparation.host);
    expect(transition?.realization.leafRehoming.owner).toBe(transition?.preparation.request.owner);
    expect(transition?.realization.leafRehoming.hydrateElement)
      .toBe(transition?.preparation.request.hydrateElement);
    expect(transition?.realization.leafRehoming.directRowTail).toBe(transition?.preparation.directRowTail);
    expect(transition?.realization.leafRehoming.projectionRealization).toBe(projectionEvent?.realization);
    expect(transition?.realization.request.terminalLeafContinuation.context).toBe(contexts[2]);
    expect(transition?.realization.request.terminalLeafContinuation.sourceSelection)
      .toBe(transition?.preparation.sourceSelection);
    expect(tasks.contextForEvent(projectionEvent!)).toBe(tasks.rootContext);
    expect(contextForElement(tasks, elements, 'projection-logical-leaf')).toBe(tasks.rootContext);
    expect(contextForElement(tasks, elements, 'span')).toBe(contexts[3]);
    expect(contextForElement(tasks, elements, 'b')).toBe(contexts[4]);
    expect(contextForElement(tasks, elements, 'div')).toBe(tasks.rootContext);
    const attributes = eventsOf(transcript, TemplateCompilerSiteCursorAttributeEvent);
    expect(attributes.filter((event) => event.attribute.name === 'au-slot')).toEqual([]);
    const namedTitle = attributes.find((event) =>
      event.owner.tagName === 'b' && event.scalar.qualifiedName === 'title.bind'
    );
    const followingTitle = attributes.find((event) =>
      event.owner.tagName === 'div' && event.scalar.qualifiedName === 'title.bind'
    );
    expect(namedTitle).toBeDefined();
    expect(followingTitle).toBeDefined();
    expect(tasks.contextForEvent(namedTitle!)).toBe(contexts[4]);
    expect(tasks.contextForEvent(followingTitle!)).toBe(tasks.rootContext);
    expect(run.completion.refusals.map((refusal) => refusal.refusalKind))
      .toContain(TemplateCompilerOrdinaryRootCompletionRefusalKind.ContextFamilyTraversal);
  });

  test('completes a drained projection-only context family without claiming target lowering', () => {
    const run = fixture.run(
      'projection-logical-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const result = completeTemplateCompilerContextFamily(run.transcript, run.endpoint);

    expect(result.state).toBe(TemplateCompilerContextFamilyCompletionState.Complete);
    expect(result.reasons).toEqual([]);
    expect(result.receipt?.isCurrent()).toBe(true);
    expect(result.traversal?.templateControllerTransitions).toEqual([]);
    expect(result.traversal?.templateControllerLeafRehomings).toEqual([]);
    expect(result.traversal?.contexts.every((context) => context.templateControllerOwner == null)).toBe(true);
    expect(result.traversal?.contexts.map((context) => [
      context.context.contextKind,
      context.projectionOwner?.staging.band.planned.group.slotName ?? null,
      context.projectionOwner?.staging.works.length ?? null,
    ])).toEqual([
      [TemplateCompilerSiteCursorContextKind.Root, null, null],
      [TemplateCompilerSiteCursorContextKind.Projection, 'default', 1],
      [TemplateCompilerSiteCursorContextKind.Projection, 'named', 2],
      [TemplateCompilerSiteCursorContextKind.Projection, 'empty', 0],
    ]);
    const host = result.traversal?.hydrateElements.find((entry) =>
      entry.staging.element.tagName === 'projection-logical-leaf'
    );
    expect(host?.projectionExtraction).toBeDefined();
    expect(host?.dischargedBlockers.map((blocker) => blocker.blockerKind))
      .toContain(TemplateCompilerHydrateElementBlockerKind.ProjectionExtractionPending);
    expect(host?.forwardedBlockers.map((blocker) => blocker.blockerKind))
      .toContain(TemplateCompilerHydrateElementBlockerKind.TargetRowPlacementPending);
  });

  test('completes an all-whitespace extraction with an intentionally root-only family', () => {
    const run = fixture.run(
      'projection-logical-whitespace-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const extraction = eventsOf(run.transcript, TemplateCompilerSiteCursorProjectionExtractionEvent)[0];
    const result = completeTemplateCompilerContextFamily(run.transcript, run.endpoint);

    expect(run.transcript.taskSnapshot.contexts).toHaveLength(1);
    expect(extraction?.preparation.discardedWhitespace).toHaveLength(1);
    expect(extraction?.entrantBandStagings).toEqual([]);
    expect(result.state).toBe(TemplateCompilerContextFamilyCompletionState.Complete);
    expect(result.traversal?.contexts).toHaveLength(1);
    expect(result.traversal?.projectionExtractions).toEqual([extraction]);
  });

  test('completes TC plus projection through exact edge owners and leaf rehoming', () => {
    const run = fixture.run(
      'projection-logical-tc-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const transition = eventsOf(run.transcript, TemplateCompilerSiteCursorTemplateControllerTransitionEvent)[0]!;
    const projection = eventsOf(run.transcript, TemplateCompilerSiteCursorProjectionExtractionEvent)[0]!;
    const result = completeTemplateCompilerContextFamily(run.transcript, run.endpoint);

    expect(result.state).toBe(TemplateCompilerContextFamilyCompletionState.Complete);
    expect(result.receipt?.isCurrent()).toBe(true);
    expect(result.traversal?.isCurrent()).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.traversal?.hasTemplateControllerContexts).toBe(true);
    expect(result.traversal?.templateControllerTransitions).toHaveLength(1);
    expect(result.traversal?.templateControllerTransitions[0]).toBe(transition);
    const sourceTransitions = result.traversal?.contexts.find((context) =>
      context.context === transition.preparation.sourceContext
    )?.templateControllerTransitions;
    expect(sourceTransitions).toHaveLength(1);
    expect(sourceTransitions?.[0]).toBe(transition);
    expect(result.traversal?.contexts.filter((context) =>
      context.context.contextKind === TemplateCompilerSiteCursorContextKind.TemplateController
    ).every((context, ordinal) =>
      context.templateControllerOwner?.edge === transition.realization.edges[ordinal]
    )).toBe(true);
    for (const [ordinal, edge] of transition.realization.edges.entries()) {
      expect(edge.contribution).toBe(transition.preparation.request.owner.templateControllers[ordinal]);
    }
    expect(result.traversal?.templateControllerLeafRehomings[0]?.event).toBe(transition);
    expect(result.traversal?.templateControllerLeafRehomings[0]?.receipt)
      .toBe(transition.realization.leafRehoming);
    expect(transition.ordinal).toBeLessThan(projection.ordinal);
    expect(transition.realization.request.projectionRealization).toBe(projection.realization);
    expect(projection.realization.request.contexts.every((input) =>
      input.context.parent === transition.realization.terminalLeaf
    )).toBe(true);
    const host = result.traversal?.hydrateElements.find((entry) =>
      entry.staging === transition.preparation.request.hydrateElement
    );
    expect(host?.templateControllerTransition).toBe(transition);
    expect(host?.dischargedBlockers.map((blocker) => blocker.blockerKind))
      .toContain(TemplateCompilerHydrateElementBlockerKind.TemplateControllerPlacementPending);
  });

  test('lowers projection-only reaches into context-local ordinary rows and incoming memberships', () => {
    const run = fixture.run(
      'projection-logical-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const completion = completeTemplateCompilerContextFamily(run.transcript, run.endpoint);
    if (completion.receipt == null) throw new Error('Expected a projection family receipt.');
    const result = assembleTemplateCompilerContextFamilyRows(completion.receipt);
    const assembly = result.assembly;
    if (assembly == null) throw new Error('Expected projection family row characterization.');
    const [root, defaultContext, namedContext, emptyContext] = assembly.contexts;

    expect(result.state).toBe(TemplateCompilerContextFamilyRowAssemblyState.Pending);
    expect(root?.templateControllerRows).toEqual([]);
    expect(root?.ordinaryRows.map((row) =>
      row.site.siteKind === 'element' ? row.site.event.element.tagName : '#text'
    )).toEqual(['projection-logical-leaf', 'div']);
    expect(defaultContext?.memberships.map((membership) => occurrenceLabel(membership.occurrence)))
      .toEqual(['span', '#text']);
    expect(namedContext?.memberships.map((membership) => occurrenceLabel(membership.occurrence)))
      .toEqual(['b', '#text', 'i', '#text']);
    expect(namedContext?.memberships.every((membership) =>
      membership.arrivalPosture === TemplateCompilerFamilyOccurrenceArrivalPosture.IncomingTransfer
    )).toBe(true);
    expect(emptyContext).toMatchObject({ rows: [], memberships: [] });
    expect(root?.memberships.every((membership) =>
      membership.arrivalPosture === TemplateCompilerFamilyOccurrenceArrivalPosture.Initial
    )).toBe(true);
    expect(assembly.contexts.map((context) => context.sourceAvailability.sourceArrivalPosture)).toEqual([
      TemplateCompilerFamilyOccurrenceArrivalPosture.Initial,
      TemplateCompilerFamilyOccurrenceArrivalPosture.IncomingTransfer,
      TemplateCompilerFamilyOccurrenceArrivalPosture.IncomingTransfer,
      TemplateCompilerFamilyOccurrenceArrivalPosture.IncomingTransfer,
    ]);
  });

  test('splits two TC rows, rehomes the host solely to the adopted leaf, and preserves following root order', () => {
    const run = fixture.run(
      'projection-logical-tc-only-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const completion = completeTemplateCompilerContextFamily(run.transcript, run.endpoint);
    if (completion.receipt == null) throw new Error('Expected a TC-only family receipt.');
    const result = assembleTemplateCompilerContextFamilyRows(completion.receipt);
    const assembly = result.assembly;
    if (assembly == null) throw new Error('Expected TC-only family row characterization.');
    const [root, outer, leaf] = assembly.contexts;
    const rootTransition = root?.rows[0];
    const outerTransition = outer?.rows[0];

    expect(result.state).toBe(TemplateCompilerContextFamilyRowAssemblyState.Pending);
    expect(rootTransition).toBeInstanceOf(TemplateCompilerFamilyTemplateControllerTransitionRowDraft);
    expect(rootTransition).toMatchObject({
      ordinal: 0,
      placementKind: TemplateCompilerTargetRowPlacementKind.TemplateControllerSourceReplacement,
      occurrence: expect.objectContaining({ tagName: 'template' }),
    });
    expect(root?.ordinaryRows.map((row) =>
      row.site.siteKind === 'element' ? row.site.event.element.tagName : '#text'
    )).toEqual(['span']);
    expect(root?.rows.map((row) => row.ordinal)).toEqual([0, 1]);
    expect(outerTransition).toBeInstanceOf(TemplateCompilerFamilyTemplateControllerTransitionRowDraft);
    expect(outerTransition).toMatchObject({
      ordinal: 0,
      placementKind: TemplateCompilerTargetRowPlacementKind.TemplateControllerGeneratedAppend,
      occurrence: null,
    });
    expect(outer?.memberships).toEqual([]);
    const hostMemberships = assembly.contexts.flatMap((context) => context.memberships).filter((membership) =>
      membership.occurrence instanceof TemplateCompilerElementOccurrence
      && membership.occurrence.tagName === 'template'
    );
    expect(hostMemberships).toHaveLength(1);
    expect(hostMemberships[0]?.context).toBe(leaf?.context);
    expect(hostMemberships[0]?.arrivalPosture).toBe(TemplateCompilerFamilyOccurrenceArrivalPosture.AdoptedInput);
    expect(leaf?.memberships.every((membership) =>
      membership.arrivalPosture === TemplateCompilerFamilyOccurrenceArrivalPosture.AdoptedInput
    )).toBe(true);
    expect(leaf?.ordinaryRows.map((row) =>
      row.site.siteKind === 'element' ? row.site.event.element.tagName : '#text'
    )).toEqual(['div']);
    expect(assembly.contexts.map((context) => context.sourceAvailability.sourceArrivalPosture)).toEqual([
      TemplateCompilerFamilyOccurrenceArrivalPosture.Initial,
      null,
      TemplateCompilerFamilyOccurrenceArrivalPosture.AdoptedInput,
    ]);
    expect(root?.attributeDispositions.some((disposition) =>
      disposition.site.event.element.tagName === 'template'
    )).toBe(true);
  });

  test('lowers a TC plus projection host in the leaf and retains incoming projection ownership', () => {
    const run = fixture.run(
      'projection-logical-tc-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const completion = completeTemplateCompilerContextFamily(run.transcript, run.endpoint);
    if (completion.receipt == null) throw new Error('Expected a TC plus projection family receipt.');
    const result = assembleTemplateCompilerContextFamilyRows(completion.receipt);
    const assembly = result.assembly;
    if (assembly == null) throw new Error('Expected TC plus projection row characterization.');
    const [root, outer, leaf, defaultContext, namedContext] = assembly.contexts;

    expect(result.state).toBe(TemplateCompilerContextFamilyRowAssemblyState.Pending);
    expect(root?.templateControllerRows).toHaveLength(1);
    expect(outer?.templateControllerRows).toHaveLength(1);
    expect(assembly.contexts.map((context) => context.sourceAvailability.sourceArrivalPosture)).toEqual([
      TemplateCompilerFamilyOccurrenceArrivalPosture.Initial,
      null,
      TemplateCompilerFamilyOccurrenceArrivalPosture.IncomingTransfer,
      TemplateCompilerFamilyOccurrenceArrivalPosture.IncomingTransfer,
      TemplateCompilerFamilyOccurrenceArrivalPosture.IncomingTransfer,
    ]);
    expect(leaf?.ordinaryRows.map((row) =>
      row.site.siteKind === 'element' ? row.site.event.element.tagName : '#text'
    )).toEqual(['projection-logical-leaf']);
    const hostMembership = leaf?.memberships.find((membership) =>
      membership.occurrence instanceof TemplateCompilerElementOccurrence
      && membership.occurrence.tagName === 'projection-logical-leaf'
    );
    expect(hostMembership?.arrivalPosture).toBe(TemplateCompilerFamilyOccurrenceArrivalPosture.IncomingTransfer);
    expect(defaultContext?.memberships.every((membership) =>
      membership.arrivalPosture === TemplateCompilerFamilyOccurrenceArrivalPosture.IncomingTransfer
    )).toBe(true);
    expect(namedContext?.memberships.every((membership) =>
      membership.arrivalPosture === TemplateCompilerFamilyOccurrenceArrivalPosture.IncomingTransfer
    )).toBe(true);
    expect(defaultContext?.traversal.projectionOwner?.context).toBe(defaultContext?.context);
    expect(namedContext?.traversal.projectionOwner?.context).toBe(namedContext?.context);
    expect(root?.attributeDispositions.some((disposition) =>
      disposition.site.event.element.tagName === 'projection-logical-leaf'
    )).toBe(true);
    expect(leaf?.attributeDispositions.some((disposition) =>
      disposition.site.event.element.tagName === 'projection-logical-leaf'
    )).toBe(false);
  });

  test('recovers exact HE, TC, contributor, slot, and nonempty value-span wires by occurrence', () => {
    const run = fixture.run(
      'projection-logical-tc-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const completion = completeTemplateCompilerContextFamily(run.transcript, run.endpoint);
    if (completion.receipt == null) throw new Error('Expected an exact wire family receipt.');
    const rows = assembleTemplateCompilerContextFamilyRows(completion.receipt).assembly;
    if (rows == null) throw new Error('Expected an exact wire row characterization.');
    const result = prepareTemplateCompilerFamilyWireFunding(rows);
    const funding = result.funding;
    if (funding == null) throw new Error('Expected exact family wire funding.');
    const transition = completion.traversal?.templateControllerTransitions[0];
    const extraction = completion.traversal?.projectionExtractions[0];
    if (transition == null || extraction == null) throw new Error('Expected TC and projection wire owners.');

    expect(result.state).toBe(TemplateCompilerFamilyWireFundingState.Exact);
    for (const edge of transition.realization.edges) {
      expect(funding.draftForOwner(edge, TemplateCompilerFamilyWireRole.TemplateControllerNode))
        .toMatchObject({
          resolution: TemplateCompilerFamilyWireResolution.ExactAuthored,
          wireReference: edge.draft.node,
        });
      expect(funding.draftForOwner(edge, TemplateCompilerFamilyWireRole.TemplateControllerAttribute))
        .toMatchObject({
          resolution: TemplateCompilerFamilyWireResolution.ExactAuthored,
          wireReference: edge.draft.attribute,
        });
    }
    const host = transition.preparation.host;
    expect(funding.draftsForOccurrence(host, TemplateCompilerFamilyWireRole.TemplateControllerNode)).toHaveLength(2);
    const hydrateHead = rows.contexts.flatMap((context) => context.ordinaryRows)
      .find((row) => row.hydrateElement != null)?.hydrateElement;
    if (hydrateHead == null) throw new Error('Expected one HE wire owner.');
    expect(funding.draftForOwner(hydrateHead, TemplateCompilerFamilyWireRole.HydrateElementNode))
      .toMatchObject({
        resolution: TemplateCompilerFamilyWireResolution.ExactAuthored,
        wireReference: hydrateHead.instructionNode,
      });
    for (const contributor of extraction.preparation.contributorReceipts) {
      expect(funding.draftForOwner(contributor, TemplateCompilerFamilyWireRole.ProjectionContributorNode))
        .toMatchObject({ resolution: TemplateCompilerFamilyWireResolution.ExactAuthored });
    }
    const slot = extraction.preparation.slotConsumptions[0];
    if (slot == null) throw new Error('Expected one named projection slot wire.');
    expect(funding.draftForOwner(slot, TemplateCompilerFamilyWireRole.ProjectionSlotAttribute)).toMatchObject({
      resolution: TemplateCompilerFamilyWireResolution.ExactAuthored,
      valueSpanRequired: true,
    });
    expect(funding.draftForOwner(slot, TemplateCompilerFamilyWireRole.ProjectionSlotAttribute)?.valueAddressHandle)
      .not.toBeNull();
  });

  test('keeps a valueless projection slot exact without inventing a value span', () => {
    const run = fixture.run(
      'projection-logical-valueless-slot-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const completion = completeTemplateCompilerContextFamily(run.transcript, run.endpoint);
    if (completion.receipt == null) throw new Error('Expected a valueless-slot family receipt.');
    const rows = assembleTemplateCompilerContextFamilyRows(completion.receipt).assembly;
    if (rows == null) throw new Error('Expected valueless-slot rows.');
    const result = prepareTemplateCompilerFamilyWireFunding(rows);
    const consumption = completion.traversal?.projectionExtractions[0]?.preparation.slotConsumptions[0];
    if (consumption == null || result.funding == null) throw new Error('Expected valueless slot ownership.');
    const draft = result.funding.draftForOwner(consumption, TemplateCompilerFamilyWireRole.ProjectionSlotAttribute);

    expect(result.state).toBe(TemplateCompilerFamilyWireFundingState.Exact);
    expect(draft).toMatchObject({
      resolution: TemplateCompilerFamilyWireResolution.ExactAuthored,
      valueSpanRequired: false,
      valueAddressHandle: null,
    });
  });

  test('prepares TC and projection definitions in topological row order without exposing handles', () => {
    const run = fixture.run(
      'projection-logical-tc-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const completion = completeTemplateCompilerContextFamily(run.transcript, run.endpoint);
    if (completion.receipt == null) throw new Error('Expected a TC plus projection family receipt.');
    const rows = assembleTemplateCompilerContextFamilyRows(completion.receipt).assembly;
    if (rows == null) throw new Error('Expected TC plus projection family rows.');
    const wires = prepareTemplateCompilerFamilyWireFunding(rows).funding;
    if (wires == null) throw new Error('Expected TC plus projection family wires.');
    const namespace = run.transcript.allocationSnapshot.ledger.namespace;
    const countsBefore = namespace.readReservationCounts();
    const result = prepareTemplateCompilerContextFamilyAllocation(rows, wires);
    const preparation = result.preparation;
    if (preparation == null) {
      throw new Error(`Expected prepared TC plus projection allocation: ${result.reasons[0]?.summary ?? 'unknown'}`);
    }
    const hydrateElement = preparation.hydrateElements[0]?.instruction;
    const transition = completion.traversal?.templateControllerTransitions[0];
    const extraction = completion.traversal?.projectionExtractions[0];
    if (hydrateElement == null || transition == null || extraction == null) {
      throw new Error('Expected one funded HE with exact TC and projection owners.');
    }

    expect(result.state).toBe(TemplateCompilerContextFamilyAllocationState.Exact);
    expect(preparation.isCurrent()).toBe(true);
    expect(preparation.preparedAllocation.ledger.state).toBe(TemplateCompilerLiveAllocationLedgerState.Prepared);
    expect(namespace.readReservationCounts()).toEqual(countsBefore);
    expect(preparation.contextDefinitions.map((definition) => definition.ownerKind)).toEqual([
      TemplateCompilerFundedContextDefinitionOwnerKind.Root,
      TemplateCompilerFundedContextDefinitionOwnerKind.TemplateController,
      TemplateCompilerFundedContextDefinitionOwnerKind.TemplateController,
      TemplateCompilerFundedContextDefinitionOwnerKind.Projection,
      TemplateCompilerFundedContextDefinitionOwnerKind.Projection,
    ]);
    const expectedOwners = [
      rows.rootMembership,
      ...transition.realization.edges,
      ...extraction.realization.entrantBands,
    ];
    for (const [ordinal, definition] of preparation.contextDefinitions.entries()) {
      expect(definition.contextAssembly).toBe(rows.contexts[ordinal]);
      expect(definition.owner).toBe(expectedOwners[ordinal]);
    }
    expect(preparation.contextDefinitions.map((definition) => definition.reservation.role)).toEqual([
      TemplateCompilerLiveProductReservationRole.RootCompiledTemplate,
      TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
      TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
      TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
      TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
    ]);
    expect(preparation.fundedInstructions.map((funded) => funded.instruction.instructionKind)).toEqual([
      TemplateInstructionKind.HydrateTemplateController,
      TemplateInstructionKind.HydrateTemplateController,
      TemplateInstructionKind.HydrateElement,
    ]);
    expect(preparation.preparedAllocation.instructionAllocations)
      .toHaveLength(preparation.fundedInstructions.length);
    for (const [ordinal, allocation] of preparation.preparedAllocation.instructionAllocations.entries()) {
      expect(allocation.instruction).toBe(preparation.fundedInstructions[ordinal]?.instruction);
    }
    expect(preparation.preparedAllocation.productReservations.map((reservation) => reservation.role))
      .toEqual(preparation.contextDefinitions.map((definition) => definition.reservation.role));
    expect(preparation.preparedAllocation.expressionAllocations).toEqual([]);
    expect(preparation.preparedAllocation.sourceAllocations).toEqual([]);
    expect(hydrateElement.projections.map((projection) => projection.slotName)).toEqual(['default', 'named']);
    expect(preparation.hydrateTemplateControllers.every((funded) =>
      preparation.definitionForContext(funded.draft.childContext)?.compiledTemplate
        === funded.instruction.childCompiledTemplate
    )).toBe(true);
    const projectionDefinitions = preparation.contextDefinitions.filter((definition) =>
      definition.ownerKind === TemplateCompilerFundedContextDefinitionOwnerKind.Projection
    );
    expect(projectionDefinitions).toHaveLength(hydrateElement.projections.length);
    for (const [ordinal, definition] of projectionDefinitions.entries()) {
      expect(definition.compiledTemplate).toBe(hydrateElement.projections[ordinal]?.compiledTemplate);
    }
  });

  test('prepares a TC-only context chain without inventing a HydrateElement allocation', () => {
    const run = fixture.run(
      'projection-logical-tc-only-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const completion = completeTemplateCompilerContextFamily(run.transcript, run.endpoint);
    if (completion.receipt == null) throw new Error('Expected a TC-only family receipt.');
    const rows = assembleTemplateCompilerContextFamilyRows(completion.receipt).assembly;
    if (rows == null) throw new Error('Expected TC-only family rows.');
    const wires = prepareTemplateCompilerFamilyWireFunding(rows).funding;
    if (wires == null) throw new Error('Expected TC-only family wires.');
    const namespace = run.transcript.allocationSnapshot.ledger.namespace;
    const countsBefore = namespace.readReservationCounts();
    const result = prepareTemplateCompilerContextFamilyAllocation(rows, wires);
    const preparation = result.preparation;
    if (preparation == null) {
      throw new Error(`Expected TC-only allocation: ${result.reasons[0]?.summary ?? 'unknown'}`);
    }
    const targetResult = prepareTemplateCompilerContextFamilyTargetPlan(preparation);
    const target = targetResult.preparation;
    if (target == null) throw new Error('Expected TC-only target plan.');

    expect(result.state).toBe(TemplateCompilerContextFamilyAllocationState.Exact);
    expect(targetResult.state).toBe(TemplateCompilerContextFamilyTargetPlanState.Exact);
    expect(namespace.readReservationCounts()).toEqual(countsBefore);
    expect(preparation.contextDefinitions.map((definition) => definition.ownerKind)).toEqual([
      TemplateCompilerFundedContextDefinitionOwnerKind.Root,
      TemplateCompilerFundedContextDefinitionOwnerKind.TemplateController,
      TemplateCompilerFundedContextDefinitionOwnerKind.TemplateController,
    ]);
    expect(preparation.fundedInstructions.map((funded) => funded.instruction.instructionKind)).toEqual([
      TemplateInstructionKind.HydrateTemplateController,
      TemplateInstructionKind.HydrateTemplateController,
    ]);
    expect(preparation.hydrateTemplateControllers).toHaveLength(2);
    expect(preparation.hydrateElements).toEqual([]);
    expect(preparation.preparedAllocation.productReservations.map((reservation) => reservation.role)).toEqual([
      TemplateCompilerLiveProductReservationRole.RootCompiledTemplate,
      TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
      TemplateCompilerLiveProductReservationRole.GeneratedCompiledTemplate,
    ]);
    expect(target.targetPlan.readContexts()[1]?.readRows()[0]?.sourceKind)
      .toBe(TemplateCompilerTargetRowSourceKind.GeneratedContextBoundary);
    expect(target.targetPlan.readContexts()[2]?.readOccurrenceMemberships().every((membership) =>
      membership.arrivalPosture === TemplateCompilerFamilyOccurrenceArrivalPosture.AdoptedInput
    )).toBe(true);
  });

  test('seals a TC plus projection target plan without committing family allocation', () => {
    const run = fixture.run(
      'projection-logical-tc-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const completion = completeTemplateCompilerContextFamily(run.transcript, run.endpoint);
    if (completion.receipt == null) throw new Error('Expected target-plan family completion.');
    const rows = assembleTemplateCompilerContextFamilyRows(completion.receipt).assembly;
    if (rows == null) throw new Error('Expected target-plan family rows.');
    const wires = prepareTemplateCompilerFamilyWireFunding(rows).funding;
    if (wires == null) throw new Error('Expected target-plan family wires.');
    const allocation = prepareTemplateCompilerContextFamilyAllocation(rows, wires).preparation;
    if (allocation == null) throw new Error('Expected target-plan family allocation.');
    const namespace = run.transcript.allocationSnapshot.ledger.namespace;
    const countsBefore = namespace.readReservationCounts();
    const result = prepareTemplateCompilerContextFamilyTargetPlan(allocation);
    const preparation = result.preparation;
    if (preparation == null) {
      throw new Error(`Expected sealed family target plan: ${result.reasons[0]?.summary ?? 'unknown'}`);
    }
    const contexts = preparation.targetPlan.readContexts();
    const sourceRow = contexts[0]?.readRows()[0];
    const host = rows.contexts[2]?.memberships.find((membership) =>
      membership.occurrence instanceof TemplateCompilerElementOccurrence
      && membership.occurrence.tagName === 'projection-logical-leaf'
    )?.occurrence;
    if (host == null) throw new Error('Expected terminal TC host membership.');
    const schedule = prepareTemplateCompilerContextFamilyStructuralSchedule(preparation);

    expect(result.state).toBe(TemplateCompilerContextFamilyTargetPlanState.Exact);
    expect(schedule.isCurrent()).toBe(true);
    expect(schedule.contexts.map((context) => context.initialization.initializationKind)).toEqual([
      TemplateCompilerFamilyContextInitializationKind.RootBound,
      TemplateCompilerFamilyContextInitializationKind.Generated,
      TemplateCompilerFamilyContextInitializationKind.Generated,
      TemplateCompilerFamilyContextInitializationKind.Generated,
      TemplateCompilerFamilyContextInitializationKind.Generated,
    ]);
    expect(preparation.isCurrent()).toBe(true);
    expect(preparation.targetPlan.isSealed).toBe(true);
    expect(allocation.preparedAllocation.ledger.state).toBe(TemplateCompilerLiveAllocationLedgerState.Prepared);
    expect(namespace.readReservationCounts()).toEqual(countsBefore);
    expect(contexts.map((context) => context.role)).toEqual([
      TemplateCompilerTargetContextRole.Root,
      TemplateCompilerTargetContextRole.TemplateController,
      TemplateCompilerTargetContextRole.TemplateController,
      TemplateCompilerTargetContextRole.Projection,
      TemplateCompilerTargetContextRole.Projection,
    ]);
    expect(contexts.map((context) => context.readRows().map((row) => row.sourceKind))).toEqual([
      [
        TemplateCompilerTargetRowSourceKind.TemplateControllerTransitionSource,
        TemplateCompilerTargetRowSourceKind.RetainedOccurrence,
      ],
      [TemplateCompilerTargetRowSourceKind.GeneratedContextBoundary],
      [TemplateCompilerTargetRowSourceKind.RetainedOccurrence],
      [TemplateCompilerTargetRowSourceKind.TextHole],
      [TemplateCompilerTargetRowSourceKind.RetainedOccurrence],
    ]);
    expect(sourceRow?.transitionSourceAuthority?.sourceArrivalPosture)
      .toBe(TemplateCompilerFamilyOccurrenceArrivalPosture.Initial);
    expect(sourceRow?.transitionSourceAuthority?.destinationContext).toBe(contexts[2]);
    expect(sourceRow?.transitionSourceAuthority?.destinationMembership)
      .toBe(contexts[2]?.occurrenceMembershipFor(host));
    expect(schedule.contexts[0]?.entries.some((entry) =>
      entry instanceof TemplateCompilerFamilyReachedElementScheduleEntry
      && entry.templateController != null
    )).toBe(true);
    expect(schedule.contexts[2]?.entries.some((entry) =>
      entry instanceof TemplateCompilerFamilyLoweredElementScheduleEntry
      && entry.projection != null
      && entry.targetRow != null
    )).toBe(true);
    const sourceHostSchedule = schedule.contexts[0]?.entries.find((entry) =>
      entry instanceof TemplateCompilerFamilyReachedElementScheduleEntry
      && entry.disposition.site.event.element.tagName === 'projection-logical-leaf'
    );
    const loweringHostSchedule = schedule.contexts[2]?.entries.find((entry) =>
      entry instanceof TemplateCompilerFamilyLoweredElementScheduleEntry
      && entry.disposition.site.event.element.tagName === 'projection-logical-leaf'
    );
    expect(sourceHostSchedule instanceof TemplateCompilerFamilyReachedElementScheduleEntry
      ? sourceHostSchedule.attributes.every((attribute) =>
          attribute.contextMapping === schedule.contexts[0]?.contextMapping
        )
      : false).toBe(true);
    expect(loweringHostSchedule instanceof TemplateCompilerFamilyLoweredElementScheduleEntry
      ? loweringHostSchedule.contextMapping
      : null).toBe(schedule.contexts[2]?.contextMapping);
    expect(schedule.contexts[3]?.entries.some((entry) =>
      entry instanceof TemplateCompilerFamilyTextScheduleEntry
      && entry.expansion != null
      && entry.rows.length === 1
    )).toBe(true);
    const structuralTrace = familyStructuralTrace(schedule.rootExecution);
    const requiredTrace = [
      'reach:projection-logical-leaf',
      'tc:enter:projection-logical-leaf',
      'init:generated:template-controller:1',
      'init:generated:template-controller:2',
      'projection:default:enter',
      'init:generated:projection:3',
      'projection:default:return',
      'projection:named:enter',
      'init:generated:projection:4',
      'projection:named:return',
      'target:projection-logical-leaf',
      'tc:return:projection-logical-leaf',
      'reach:div',
    ];
    let previousTraceOrdinal = -1;
    for (const label of requiredTrace) {
      const ordinal = structuralTrace.indexOf(label);
      expect(ordinal, label).toBeGreaterThan(previousTraceOrdinal);
      previousTraceOrdinal = ordinal;
    }
    const templateControllerDispositions = preparation.attributeDispositionMappings.filter((mapping) =>
      mapping.draft.contribution.targetLane === TemplateCompilerLiveAttributeTargetLane.TemplateController
    );
    expect(templateControllerDispositions).toHaveLength(2);
    for (const mapping of templateControllerDispositions) {
      const funded = allocation.hydrateTemplateControllers.find((candidate) =>
        candidate.draft.row.edge.contribution === mapping.draft.contribution
      );
      expect(mapping.causeHandles).toContain(funded?.instruction.productHandle);
    }
  });

  test('inherits adopted source availability for a nested TC transition', () => {
    const run = fixture.run(
      'projection-logical-nested-tc-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const completion = completeTemplateCompilerContextFamily(run.transcript, run.endpoint);
    if (completion.receipt == null) {
      throw new Error(
        `Expected nested TC family completion: ${completion.reasons.map((reason) => reason.summary).join(' ')}`,
      );
    }
    const rows = assembleTemplateCompilerContextFamilyRows(completion.receipt).assembly;
    if (rows == null) throw new Error('Expected nested TC family rows.');
    const wires = prepareTemplateCompilerFamilyWireFunding(rows).funding;
    if (wires == null) throw new Error('Expected nested TC family wires.');
    const allocation = prepareTemplateCompilerContextFamilyAllocation(rows, wires).preparation;
    if (allocation == null) throw new Error('Expected nested TC family allocation.');
    const result = prepareTemplateCompilerContextFamilyTargetPlan(allocation);
    const preparation = result.preparation;
    if (preparation == null) throw new Error('Expected nested TC target plan.');
    const schedule = prepareTemplateCompilerContextFamilyStructuralSchedule(preparation);
    const namespace = run.transcript.allocationSnapshot.ledger.namespace;
    const countsBefore = namespace.readReservationCounts();
    const attachmentPreparation = run.binding.execution.prepareContextFamilyTargetAttachment(
      preparation,
      schedule,
    );
    const contexts = preparation.targetPlan.readContexts();
    const sourceRows = preparation.rowMappings.filter((mapping) =>
      mapping.row.sourceKind === TemplateCompilerTargetRowSourceKind.TemplateControllerTransitionSource
    );

    expect(result.state).toBe(TemplateCompilerContextFamilyTargetPlanState.Exact);
    expect(rows.contexts.map((context) => context.sourceAvailability.sourceArrivalPosture)).toEqual([
      TemplateCompilerFamilyOccurrenceArrivalPosture.Initial,
      TemplateCompilerFamilyOccurrenceArrivalPosture.AdoptedInput,
      TemplateCompilerFamilyOccurrenceArrivalPosture.IncomingTransfer,
    ]);
    expect(contexts.map((context) => context.role)).toEqual([
      TemplateCompilerTargetContextRole.Root,
      TemplateCompilerTargetContextRole.TemplateController,
      TemplateCompilerTargetContextRole.TemplateController,
    ]);
    expect(schedule.contexts.map((context) => context.initialization.initializationKind)).toEqual([
      TemplateCompilerFamilyContextInitializationKind.RootBound,
      TemplateCompilerFamilyContextInitializationKind.AdoptedInput,
      TemplateCompilerFamilyContextInitializationKind.Generated,
    ]);
    expect(schedule.contexts[1]?.initialization.inputCarrier).toBeInstanceOf(TemplateCompilerElementOccurrence);
    expect(schedule.contexts[1]?.initialization.inputCarrier?.tagName).toBe('template');
    expect(schedule.contexts[1]?.initialization.inputContent)
      .toBe(schedule.contexts[1]?.initialization.inputCarrier?.templateContent);
    expect(schedule.contexts[1]?.initialization.adoptionOwner?.receipt.terminalLeaf)
      .toBe(schedule.contexts[1]?.contextMapping.cursorContext);
    expect(schedule.incomingOwnerByContext.get(schedule.contexts[1]!.contextMapping))
      .toBeInstanceOf(TemplateCompilerFamilyTemplateControllerScheduleEntry);
    expect(sourceRows).toHaveLength(2);
    expect(sourceRows.map((mapping) => mapping.row.transitionSourceAuthority?.sourceArrivalPosture)).toEqual([
      TemplateCompilerFamilyOccurrenceArrivalPosture.Initial,
      TemplateCompilerFamilyOccurrenceArrivalPosture.AdoptedInput,
    ]);
    expect(contexts[1]?.readOccurrenceMemberships().some((membership) =>
      membership.arrivalPosture === TemplateCompilerFamilyOccurrenceArrivalPosture.AdoptedInput
    )).toBe(true);
    expect(contexts[2]?.readOccurrenceMemberships().some((membership) =>
      membership.arrivalPosture === TemplateCompilerFamilyOccurrenceArrivalPosture.IncomingTransfer
    )).toBe(true);
    expect(attachmentPreparation.isCurrent()).toBe(true);
    expect(allocation.preparedAllocation.ledger.state).toBe(TemplateCompilerLiveAllocationLedgerState.Prepared);
    expect(namespace.readReservationCounts()).toEqual(countsBefore);
    const forestRevision = run.binding.forest.mutationRevision;
    const attachment = run.binding.execution.commitPreparedContextFamilyTargetAttachment(
      attachmentPreparation,
    );
    expect(attachment.isCurrent()).toBe(true);
    expect(attachmentPreparation.isCurrent()).toBe(false);
    expect(attachment.committedAllocation.prepared).toBe(allocation.preparedAllocation);
    expect(allocation.preparedAllocation.ledger.state).toBe(TemplateCompilerLiveAllocationLedgerState.Committed);
    expect(run.binding.execution.structuralExecution).toBe(attachment.structuralExecution);
    expect(attachment.contexts.map((context) => context.targetContext)).toEqual(contexts);
    expect(run.binding.forest.mutationRevision).toBe(forestRevision);
    expect(namespace.readReservationCounts().semanticSlots).toBeGreaterThan(countsBefore.semanticSlots);
    run.binding.execution.assertCoherent();
  });

  test('funds empty projection definitions while leaving whitespace-only groups definition-free', () => {
    const cases = [
      {
        name: 'projection-logical-host',
        ownerKinds: [
          TemplateCompilerFundedContextDefinitionOwnerKind.Root,
          TemplateCompilerFundedContextDefinitionOwnerKind.Projection,
          TemplateCompilerFundedContextDefinitionOwnerKind.Projection,
          TemplateCompilerFundedContextDefinitionOwnerKind.Projection,
        ],
        slots: ['default', 'named', 'empty'],
        contributorCounts: [1, 2, 1],
        discarded: 1,
      },
      {
        name: 'projection-logical-whitespace-host',
        ownerKinds: [TemplateCompilerFundedContextDefinitionOwnerKind.Root],
        slots: [],
        contributorCounts: [],
        discarded: 1,
      },
    ] as const;
    for (const expected of cases) {
      const run = fixture.run(expected.name, TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily);
      const completion = completeTemplateCompilerContextFamily(run.transcript, run.endpoint);
      if (completion.receipt == null) throw new Error(`Expected family receipt for '${expected.name}'.`);
      const rows = assembleTemplateCompilerContextFamilyRows(completion.receipt).assembly;
      if (rows == null) throw new Error(`Expected family rows for '${expected.name}'.`);
      const wires = prepareTemplateCompilerFamilyWireFunding(rows).funding;
      if (wires == null) throw new Error(`Expected family wires for '${expected.name}'.`);
      const namespace = run.transcript.allocationSnapshot.ledger.namespace;
      const countsBefore = namespace.readReservationCounts();
      const result = prepareTemplateCompilerContextFamilyAllocation(rows, wires);
      const preparation = result.preparation;
      if (preparation == null) {
        throw new Error(`Expected family allocation for '${expected.name}': ${result.reasons[0]?.summary ?? 'unknown'}`);
      }
      const hydrateElement = preparation.hydrateElements[0]?.instruction;
      if (hydrateElement == null) throw new Error(`Expected funded HE for '${expected.name}'.`);
      const targetResult = prepareTemplateCompilerContextFamilyTargetPlan(preparation);
      const target = targetResult.preparation;
      if (target == null) throw new Error(`Expected target plan for '${expected.name}'.`);
      const schedule = prepareTemplateCompilerContextFamilyStructuralSchedule(target);

      expect(result.state, expected.name).toBe(TemplateCompilerContextFamilyAllocationState.Exact);
      expect(targetResult.state, expected.name).toBe(TemplateCompilerContextFamilyTargetPlanState.Exact);
      expect(schedule.isCurrent(), expected.name).toBe(true);
      expect(namespace.readReservationCounts(), expected.name).toEqual(countsBefore);
      expect(preparation.contextDefinitions.map((definition) => definition.ownerKind), expected.name)
        .toEqual(expected.ownerKinds);
      expect(hydrateElement.projections.map((projection) => projection.slotName), expected.name)
        .toEqual(expected.slots);
      expect(hydrateElement.projections.map((projection) => projection.contributors.length), expected.name)
        .toEqual(expected.contributorCounts);
      expect(hydrateElement.discardedProjectionContributors, expected.name).toHaveLength(expected.discarded);
      expect(preparation.preparedAllocation.productReservations, expected.name)
        .toHaveLength(expected.ownerKinds.length);
      expect(target.targetPlan.readContexts().map((context) => context.role), expected.name).toEqual([
        TemplateCompilerTargetContextRole.Root,
        ...expected.ownerKinds.slice(1).map(() => TemplateCompilerTargetContextRole.Projection),
      ]);
      if (expected.name === 'projection-logical-host') {
        expect(target.targetPlan.readContexts().at(-1)?.readRows()).toEqual([]);
        expect(schedule.contexts.at(-1)?.entries).toEqual([]);
        const projectionEntry = schedule.contexts[0]?.entries.find((entry) =>
          entry instanceof TemplateCompilerFamilyLoweredElementScheduleEntry
          && entry.projection != null
        );
        expect(projectionEntry instanceof TemplateCompilerFamilyLoweredElementScheduleEntry
          ? projectionEntry.projection?.groups.map((group) => [
              group.projection.slotName,
              group.contributors.length,
              group.band.entrants.length,
            ])
          : []).toEqual([
          ['default', 1, 1],
          ['named', 2, 2],
          ['empty', 1, 0],
        ]);
        expect(projectionEntry instanceof TemplateCompilerFamilyLoweredElementScheduleEntry
          ? projectionEntry.projection?.discardedContributors.length
          : null).toBe(1);
        const trace = familyStructuralTrace(schedule.rootExecution);
        expect(trace.indexOf('projection:empty:enter'))
          .toBeLessThan(trace.indexOf('target:projection-logical-leaf'));
        expect(trace.indexOf('init:generated:projection:3'))
          .toBeGreaterThan(trace.indexOf('projection:empty:enter'));
      }
    }
  });

  test('rejects a foreign family wire inventory before opening an allocation phase', () => {
    const sourceRun = fixture.run(
      'projection-logical-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const foreignRun = fixture.run(
      'projection-logical-whitespace-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const sourceCompletion = completeTemplateCompilerContextFamily(sourceRun.transcript, sourceRun.endpoint);
    const foreignCompletion = completeTemplateCompilerContextFamily(foreignRun.transcript, foreignRun.endpoint);
    if (sourceCompletion.receipt == null || foreignCompletion.receipt == null) {
      throw new Error('Expected source and foreign family receipts.');
    }
    const sourceRows = assembleTemplateCompilerContextFamilyRows(sourceCompletion.receipt).assembly;
    const foreignRows = assembleTemplateCompilerContextFamilyRows(foreignCompletion.receipt).assembly;
    if (sourceRows == null || foreignRows == null) throw new Error('Expected source and foreign family rows.');
    const foreignWires = prepareTemplateCompilerFamilyWireFunding(foreignRows).funding;
    if (foreignWires == null) throw new Error('Expected foreign family wires.');
    const namespace = sourceRun.transcript.allocationSnapshot.ledger.namespace;
    const countsBefore = namespace.readReservationCounts();
    const result = prepareTemplateCompilerContextFamilyAllocation(sourceRows, foreignWires);

    expect(result.state).toBe(TemplateCompilerContextFamilyAllocationState.Ineligible);
    expect(result.preparation).toBeNull();
    expect(result.reasons.map((reason) => reason.reasonKind))
      .toEqual([TemplateCompilerContextFamilyAllocationReasonKind.ForeignWires]);
    expect(namespace.readReservationCounts()).toEqual(countsBefore);
  });

  test('keeps allocation and structural ownership uncommitted when attachment currentness advances', () => {
    const run = fixture.run(
      'projection-logical-valueless-slot-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const completion = completeTemplateCompilerContextFamily(run.transcript, run.endpoint);
    if (completion.receipt == null) throw new Error('Expected attachment collision family completion.');
    const rows = assembleTemplateCompilerContextFamilyRows(completion.receipt).assembly;
    if (rows == null) throw new Error('Expected attachment collision family rows.');
    const wires = prepareTemplateCompilerFamilyWireFunding(rows).funding;
    if (wires == null) throw new Error('Expected attachment collision family wires.');
    const allocation = prepareTemplateCompilerContextFamilyAllocation(rows, wires).preparation;
    if (allocation == null) throw new Error('Expected attachment collision family allocation.');
    const target = prepareTemplateCompilerContextFamilyTargetPlan(allocation).preparation;
    if (target == null) throw new Error('Expected attachment collision target plan.');
    const schedule = prepareTemplateCompilerContextFamilyStructuralSchedule(target);
    const attachment = run.binding.execution.prepareContextFamilyTargetAttachment(target, schedule);
    const namespace = run.transcript.allocationSnapshot.ledger.namespace;
    const phaseKey = allocation.preparedAllocation.ledger.rootSiteKey;
    const collisionPhaseKey = `${phaseKey}:collision`;
    const eager = namespace.beginPhase(collisionPhaseKey);
    eager.reserveProduct(
      `${collisionPhaseKey}:root`,
      'compiled-template:root-collision',
      TemplateCompilerLiveProductReservationRole.RootCompiledTemplate,
      null,
      `${phaseKey}:compiled-template:root`,
    );
    eager.finish();

    expect(attachment.isCurrent()).toBe(false);
    expect(() => run.binding.execution.commitPreparedContextFamilyTargetAttachment(attachment))
      .toThrow(/foreign or stale/u);
    expect(allocation.preparedAllocation.ledger.state).toBe(TemplateCompilerLiveAllocationLedgerState.Prepared);
    expect(run.binding.execution.structuralExecution).toBeNull();
    expect(run.binding.lane.targetPlan).toBeNull();
  });

  test('classifies a real non-singular TC attribute as Pending without losing semantic ownership', () => {
    const run = fixture.run(
      'projection-logical-nonsingular-tc-wire-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const completion = completeTemplateCompilerContextFamily(run.transcript, run.endpoint);
    if (completion.receipt == null) throw new Error('Expected a non-singular-TC family receipt.');
    const rows = assembleTemplateCompilerContextFamilyRows(completion.receipt).assembly;
    if (rows == null) throw new Error('Expected non-singular-TC rows.');
    const result = prepareTemplateCompilerFamilyWireFunding(rows);
    if (result.funding == null) throw new Error('Expected non-singular TC wire ownership.');
    const namespace = run.transcript.allocationSnapshot.ledger.namespace;
    const countsBefore = namespace.readReservationCounts();
    const allocation = prepareTemplateCompilerContextFamilyAllocation(rows, result.funding);
    const draft = result.drafts.find((candidate) =>
      candidate.role === TemplateCompilerFamilyWireRole.TemplateControllerAttribute
      && candidate.resolution === TemplateCompilerFamilyWireResolution.NonSingular
    );
    if (draft == null) throw new Error('Expected one non-singular TC attribute draft.');

    expect(result.state).toBe(TemplateCompilerFamilyWireFundingState.Pending);
    expect(draft).toMatchObject({
      resolution: TemplateCompilerFamilyWireResolution.NonSingular,
      wireReference: null,
    });
    expect(draft.semanticOwner).toBeInstanceOf(TemplateCompilerTemplateControllerTransitionEdgeReceipt);
    expect(completion.traversal?.templateControllerTransitions.some((event) =>
      draft.semanticOwner instanceof TemplateCompilerTemplateControllerTransitionEdgeReceipt
      && event.realization.edges.includes(draft.semanticOwner)
    )).toBe(true);
    expect(result.reasons.some((reason) => reason.draft === draft)).toBe(true);
    expect(allocation.state).toBe(TemplateCompilerContextFamilyAllocationState.Pending);
    expect(allocation.preparation).toBeNull();
    expect(allocation.reasons.map((reason) => reason.reasonKind))
      .toEqual([TemplateCompilerContextFamilyAllocationReasonKind.WireFundingPending]);
    expect(namespace.readReservationCounts()).toEqual(countsBefore);
  });

  test('refuses compatibility traversal mode instead of treating its frontier as a family', () => {
    const run = fixture.run('projection-logical-host');
    const result = completeTemplateCompilerContextFamily(run.transcript, run.endpoint);

    expect(result.state).toBe(TemplateCompilerContextFamilyCompletionState.Ineligible);
    expect(result.receipt).toBeNull();
    expect(result.reasons.map((reason) => reason.reasonKind))
      .toContain(TemplateCompilerContextFamilyCompletionReasonKind.TraversalModeMismatch);
  });

  test('closes projected containerless placement only after the drained projection contexts', () => {
    const run = fixture.run(
      'projection-logical-containerless-host',
      TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
    );
    const result = completeTemplateCompilerContextFamily(run.transcript, run.endpoint);
    const host = result.traversal?.hydrateElements.find((entry) =>
      entry.staging.element.tagName === 'projection-logical-containerless-leaf'
    );

    expect(result.state).toBe(TemplateCompilerContextFamilyCompletionState.Complete);
    expect(host?.containerlessPlacement?.projectionExtraction).toBe(host?.projectionExtraction);
    expect(host?.dischargedBlockers.map((blocker) => blocker.blockerKind))
      .toContain(TemplateCompilerHydrateElementBlockerKind.ContainerlessPlacementPending);
  });

  test('rejects realization replay through a fresh task session', () => {
    const run = fixture.run('projection-logical-host');
    const preparation = run.prepare();
    const session = TemplateCompilerSiteCursorTaskSession.createRoot(run.binding.lane.localKey);
    const forest = run.binding.forest;
    session.startRoot(forest.compilerContent, forest.compilerContent.readChildren());
    const selection = requireHostSelection(session, run.envelope.element);
    const continuation = session.pushStagedElementContinuation(
      session.rootContext,
      selection.visit,
      preparation,
    );
    const contexts = preparation.plannedEntrantBands.map((band, ordinal) => ({
      group: band.group,
      context: session.createChildContext(
        session.rootContext,
        `fresh-replay:projection:${ordinal}`,
        TemplateCompilerSiteCursorContextKind.Projection,
      ),
    }));

    expect(() => realizeTemplateCompilerProjectionLogicalExtraction({
      preparation,
      continuation,
      contexts,
    })).toThrow(/attested continuation/u);
  });

});

class ProjectionFixtureRun {
  constructor(
    readonly fixture: ProjectionLogicalExtractionFixture,
    readonly compilation: TemplateResourceCompilationEmission,
    readonly binding: TemplateCompilerSiteInvocationBinding,
    readonly preWalk: TemplateCompilerPreWalkRemainderAuthority,
    readonly transcript: TemplateCompilerSiteCursorTranscript,
    readonly endpoint: TemplateCompilerSiteExecutionEndpointReceipt,
    readonly completion: TemplateCompilerOrdinaryRootCompletionResult,
  ) {}

  get envelope(): TemplateCompilerHydrateElementEnvelopeDraft {
    const envelope = this.transcript.hydrateElementEnvelopes[0]?.draft ?? null;
    if (envelope == null) throw new Error(`Expected projection envelope for '${this.compilation.definition.name}'.`);
    return envelope;
  }

  prepare(): TemplateCompilerProjectionLogicalExtractionPreparation {
    return prepareTemplateCompilerProjectionLogicalExtraction({
      forest: this.binding.forest,
      preWalk: this.preWalk,
      envelope: this.envelope,
    });
  }
}

class ProjectionLogicalExtractionFixture {
  private readonly runs = new Map<string, ProjectionFixtureRun>();

  private constructor(
    readonly runtime: Awaited<ReturnType<typeof createSemanticRuntime>>,
    readonly candidate: CandidateRun,
    readonly frontDoor: TemplateCompilationFrontDoorEmission,
  ) {}

  static async create(): Promise<ProjectionLogicalExtractionFixture> {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, 'fixtures/pressure/template-compiler-projection-logical-extraction'),
      storeKey: 'contract:template-compiler-projection-logical-extraction',
    });
    const app = await runtime.openApp({ telemetry: { inquiryProfile: 'aot' } });
    const candidate = runtime.computationLifecycle.begin({
      kind: 'template-compiler-projection-logical-extraction-test',
      reconciliationKey: app.project.projectKey,
      summary: 'Minimal live projection extraction fixture.',
    });
    return new ProjectionLogicalExtractionFixture(runtime, candidate, app.emission.templates.frontDoor);
  }

  run(
    name: string,
    traversalMode: TemplateCompilerSiteCursorTraversalMode = TemplateCompilerSiteCursorTraversalMode.CompatibilityStop,
  ): ProjectionFixtureRun {
    const runKey = `${name}:${traversalMode}`;
    const existing = this.runs.get(runKey);
    if (existing != null) return existing;
    const compilation = compilationFor(this.frontDoor, name);
    const family = this.frontDoor.familyForOwner(compilation.familyOwnerHandle);
    if (family == null) throw new Error(`Expected current projection family '${name}'.`);
    const binding = bindProjectionFixture(
      compilation,
      family,
      this.frontDoor,
      this.candidate,
      `projection-logical-extraction:${name}:${traversalMode}`,
    );
    const preWalk = TemplateCompilerPreWalkRemainderAuthority.capture(binding);
    const result = executeTemplateCompilerRootSiteCursor({
      binding,
      compilerReads: new TemplateCompilerReadView(
        this.runtime.workspace.store,
        TemplateCompilerWorldAuthority.fixed(compilation.compilerWorld),
      ),
      preWalkAuthority: preWalk,
      traversalMode,
    });
    if (
      result.state !== TemplateCompilerSiteCursorResultState.Transcript
      || result.transcript == null
      || result.siteEndpoint == null
      || result.completion == null
    ) {
      throw new Error(`Expected projection transcript: ${result.reasons.map((reason) => reason.summary).join(' ')}`);
    }
    const run = new ProjectionFixtureRun(
      this,
      compilation,
      binding,
      preWalk,
      result.transcript,
      result.siteEndpoint,
      result.completion,
    );
    this.runs.set(runKey, run);
    return run;
  }

  dispose(): void {
    this.candidate.abort();
    this.runtime.retireWorkspaceIncarnation();
  }
}

function requireHostSelection(
  session: TemplateCompilerSiteCursorTaskSession,
  host: TemplateCompilerElementOccurrence,
): TemplateCompilerSiteCursorTaskSelection {
  const selection = session.next();
  if (selection == null || selection.visit.node !== host) throw new Error('Expected projection host selection.');
  return selection;
}

function bindProjectionFixture(
  compilation: TemplateResourceCompilationEmission,
  family: TemplateCompilationFamilyFrontDoorEmission,
  frontDoor: TemplateCompilationFrontDoorEmission,
  candidate: CandidateRun,
  localKey: string,
): TemplateCompilerSiteInvocationBinding {
  const browserEmission = materializeBrowserFixture(compilation, localKey, candidate);
  const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(browserEmission);
  const execution = TemplateCompilerExecutionSession.createForForest(localKey, forest);
  const lane = execution.admitRootInvocation(compilation.localKey);
  const hook = executeTemplateCompilerHookBootstrap({
    execution,
    lane,
    compilerWorld: compilation.compilerWorld,
    executionOpenSeamHandle: candidate.handles.openSeam(`${localKey}:hook-open`),
  });
  const local = executeTemplateCompilerLocalExtraction({
    execution,
    lane,
    hookBootstrap: hook,
    ownerName: compilation.definition.name,
    ownerCauseHandles: [compilation.definition.productHandle!],
    reserveDefinition: () => {
      throw new Error('No-local projection extraction fixture requested a definition reservation.');
    },
  });
  const closure = execution.closeInvocationBootstrap(hook, local);
  const graphExact = buildTemplateCompilerNormalizedSiteIndex(compilation);
  if (graphExact.state !== TemplateCompilerNormalizedSiteIndexState.GraphExact) {
    throw new Error('Expected GraphExact projection extraction precedent.');
  }
  const result = bindTemplateCompilerRootSiteInvocation({
    execution,
    bootstrapClosure: closure,
    browserEmission,
    graphExact,
    currentFrontDoor: frontDoor,
    currentFamily: family,
  });
  if (result.state !== TemplateCompilerSiteInvocationBindingState.Exact || result.binding == null) {
    throw new Error(`Expected exact projection binding: ${result.reasons.map((reason) => reason.summary).join(' ')}`);
  }
  return result.binding;
}

function materializeBrowserFixture(
  compilation: TemplateResourceCompilationEmission,
  localKey: string,
  candidate: CandidateRun,
): BrowserEffectiveTemplateEmission {
  const markup = compilation.unit.templateSource.markup;
  if (markup == null || compilation.html.draft == null) {
    throw new Error('Projection extraction fixture has no retained markup/draft.');
  }
  const browser = parseBrowserTemplateFragmentDraft(markup);
  return new BrowserEffectiveTemplateMaterializer(candidate).materialize({
    localKey,
    sourceRevision: compilation.definition.template?.authoredSourceRevision ?? `test:${localKey}`,
    templateSource: compilation.unit.templateSource,
    authoredHtml: compilation.html,
    browser,
    carrierSelection: selectBrowserTemplateCompilerCarrier(browser.fragment),
  });
}

function compilationFor(
  frontDoor: TemplateCompilationFrontDoorEmission,
  name: string,
): TemplateResourceCompilationEmission {
  const compilation = [...frontDoor.appCompilations, ...frontDoor.authoringCompilations].find(
    (candidate) => candidate.definition.name === name,
  );
  if (compilation == null) throw new Error(`Expected projection fixture compilation '${name}'.`);
  return compilation;
}

function familyStructuralTrace(
  band: TemplateCompilerFamilyContextExecutionBand,
  trace: string[] = [],
): readonly string[] {
  const context = band.schedule.contextMapping.cursorContext;
  trace.push(
    `init:${band.schedule.initialization.initializationKind}:${context.contextKind}:${context.ordinal}`,
  );
  for (const entry of band.entries) {
    if (entry instanceof TemplateCompilerFamilyReachedElementExecutionBand) {
      const tagName = entry.schedule.disposition.site.event.element.tagName;
      trace.push(`reach:${tagName}`);
      for (const attribute of entry.schedule.attributes) {
        trace.push(`attribute:${tagName}:${attribute.draft.qualifiedName}:${attribute.requiresConsumption}`);
      }
      if (entry.templateController != null) {
        trace.push(`tc:enter:${tagName}`);
        for (const child of entry.templateController.contextChain) familyStructuralTrace(child, trace);
        trace.push(`tc:return:${tagName}`);
      }
      continue;
    }
    if (entry instanceof TemplateCompilerFamilyLoweredElementExecutionBand) {
      const tagName = entry.schedule.disposition.site.event.element.tagName;
      trace.push(`lower:${tagName}`);
      for (const processContent of entry.schedule.processContent) {
        trace.push(`process:${tagName}:${processContent.removalOrdinal}`);
      }
      for (const projection of entry.projectionGroups) {
        trace.push(`projection:${projection.schedule.projection.slotName}:enter`);
        familyStructuralTrace(projection.context, trace);
        trace.push(`projection:${projection.schedule.projection.slotName}:return`);
      }
      if (entry.schedule.targetRow != null) trace.push(`target:${tagName}`);
      continue;
    }
    trace.push(`text:${entry.expansion == null ? 'static' : 'expansion'}`);
  }
  trace.push(`return:${context.contextKind}:${context.ordinal}`);
  return trace;
}

function occurrenceLabel(occurrence: TemplateCompilerNodeOccurrence): string {
  if (occurrence instanceof TemplateCompilerElementOccurrence) return occurrence.tagName;
  if (occurrence instanceof TemplateCompilerFragmentOccurrence) return '#fragment';
  if (occurrence instanceof TemplateCompilerTextOccurrence) return '#text';
  return occurrence.nodeKind;
}

function eventsOf<TEvent extends TemplateCompilerSiteCursorEvent>(
  transcript: TemplateCompilerSiteCursorTranscript,
  eventType: abstract new (...args: never[]) => TEvent,
): readonly TEvent[] {
  return transcript.events.filter((event): event is TEvent => event instanceof eventType);
}

function contextForElement(
  tasks: TemplateCompilerSiteCursorTranscript['taskSnapshot'],
  events: readonly TemplateCompilerSiteCursorElementEvent[],
  tagName: string,
) {
  const event = events.find((candidate) => candidate.element.tagName === tagName);
  if (event == null) throw new Error(`Expected reached element '${tagName}'.`);
  return tasks.contextForEvent(event);
}
