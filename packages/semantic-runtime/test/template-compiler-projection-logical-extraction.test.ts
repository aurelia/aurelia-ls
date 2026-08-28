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
import { TemplateCompilerTargetRowPlacementKind } from '../src/template/compiler-target-plan.js';
import {
  TemplateCompilerExecutionSession,
  type TemplateCompilerSiteExecutionEndpointReceipt,
} from '../src/template/template-compiler-execution.js';
import {
  completeTemplateCompilerContextFamily,
  TemplateCompilerContextFamilyCompletionReasonKind,
  TemplateCompilerContextFamilyCompletionState,
} from '../src/template/template-compiler-context-family-completion.js';
import { executeTemplateCompilerHookBootstrap } from '../src/template/template-compiler-hook-bootstrap.js';
import {
  TemplateCompilerHydrateElementBlockerKind,
  type TemplateCompilerHydrateElementEnvelopeDraft,
} from '../src/template/template-compiler-hydrate-element-staging.js';
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
