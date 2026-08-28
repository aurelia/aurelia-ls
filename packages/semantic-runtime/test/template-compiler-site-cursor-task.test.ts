import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import {
  TemplateCompilerElementOccurrence,
  TemplateCompilerOccurrenceForest,
} from '../src/template/template-compiler-occurrence.js';
import {
  TemplateCompilerSiteCursorFrontier,
  TemplateCompilerSiteCursorFrontierKind,
  TemplateCompilerSiteCursorPhaseEvent,
  TemplateCompilerSiteCursorPhaseKind,
} from '../src/template/template-compiler-site-cursor-event.js';
import {
  TemplateCompilerSiteCursorContextKind,
  TemplateCompilerSiteCursorContextTaskState,
  TemplateCompilerSiteCursorSelectionKind,
  TemplateCompilerSiteCursorTaskSession,
  TemplateCompilerSiteCursorTaskStopKind,
} from '../src/template/template-compiler-site-cursor-task.js';
import { BrowserEffectiveTemplateFixture } from './browser-effective-template-fixture.js';

const eventAuthority = {};
const familyMarkup = '<main><section><i></i><u></u></section><aside><b></b><em></em></aside></main><footer></footer>';

describe('template compiler site cursor task scheduler', () => {
  let fixture: BrowserEffectiveTemplateFixture;
  let fixtureOrdinal = 0;

  beforeAll(() => {
    fixture = new BrowserEffectiveTemplateFixture('template-compiler-site-cursor-task');
  });

  afterAll(() => {
    fixture.dispose();
  });

  test('runs ordered child tasks in LIFO source order and returns through an opaque parent continuation', () => {
    const forest = materializeForest(fixture, `ordered-${fixtureOrdinal++}`, familyMarkup);
    const elements = elementsByTag(forest);
    const section = elements.get('section')!;
    const aside = elements.get('aside')!;
    const session = startSession('ordered', forest);
    const rootVisit = session.next()!;
    const continuationPayload = { stage: 'after-generated-contexts' };
    const continuation = session.pushStagedElementContinuation(
      session.rootContext,
      rootVisit.visit,
      continuationPayload,
    );
    const first = session.createChildContext(
      session.rootContext,
      'ordered:child:first',
      TemplateCompilerSiteCursorContextKind.TemplateController,
    );
    const second = session.createChildContext(
      session.rootContext,
      'ordered:child:second',
      TemplateCompilerSiteCursorContextKind.Projection,
    );
    session.stageContextLogicalEntrantBand(first, [{
      source: session.capturePhysicalChildren(section, section.readChildren()),
      sourceOrdinal: 0,
      authority: { key: 'ordered:first' },
    }]);
    session.stageContextLogicalEntrantBand(second, [{
      source: session.capturePhysicalChildren(aside, aside.readChildren()),
      sourceOrdinal: 0,
      authority: { key: 'ordered:second' },
    }]);

    session.scheduleChildContexts(session.rootContext, [first, second]);
    const selections = [session.next()!, session.next()!, session.next()!];

    expect(selections.map((selection) => selection.context)).toEqual([first, second, session.rootContext]);
    expect(selections.map((selection) => selection.selectionKind)).toEqual([
      TemplateCompilerSiteCursorSelectionKind.LogicalEntrant,
      TemplateCompilerSiteCursorSelectionKind.LogicalEntrant,
      TemplateCompilerSiteCursorSelectionKind.StagedElementContinuation,
    ]);
    expect(selections.map((selection) => occurrenceLabel(selection.visit.node))).toEqual(['i', 'b', 'main']);
    expect(selections[2]?.work).toBe(continuation);
    expect(continuation.continuation).toBe(continuationPayload);
    expect(session.next()).toMatchObject({
      context: session.rootContext,
      selectionKind: TemplateCompilerSiteCursorSelectionKind.PhysicalNode,
      visit: { node: elements.get('footer') },
    });
    expect(session.next()).toBeNull();

    const snapshot = session.finish(null);
    expect(snapshot.contexts.map((task) => task.context)).toEqual([session.rootContext, first, second]);
    expect(snapshot.contexts.every((task) => task.state === TemplateCompilerSiteCursorContextTaskState.Drained))
      .toBe(true);
    expect(snapshot.taskStack).toEqual([]);
  });

  test('runs an already-staged host continuation in the leaf of a serial context chain', () => {
    const forest = materializeForest(fixture, `chain-${fixtureOrdinal++}`, familyMarkup);
    const session = startSession('chain', forest);
    const rootVisit = session.next()!;
    const outer = session.createChildContext(
      session.rootContext,
      'chain:outer',
      TemplateCompilerSiteCursorContextKind.TemplateController,
    );
    const leaf = session.createChildContext(
      outer,
      'chain:leaf',
      TemplateCompilerSiteCursorContextKind.TemplateController,
    );
    const payload = { stage: 'after-template-controllers' };
    const continuation = session.pushStagedElementContinuation(leaf, rootVisit.visit, payload);

    session.scheduleContextChain(session.rootContext, [outer, leaf]);

    const leafSelection = session.next();
    expect(leafSelection).toMatchObject({
      context: leaf,
      selectionKind: TemplateCompilerSiteCursorSelectionKind.StagedElementContinuation,
      visit: rootVisit.visit,
      work: continuation,
    });
    expect(continuation.continuation).toBe(payload);
    expect(continuation.sourceSelection).toBe(rootVisit);
    expect(continuation.sourceContext).toBe(session.rootContext);
    expect(session.next()).toMatchObject({
      context: session.rootContext,
      selectionKind: TemplateCompilerSiteCursorSelectionKind.PhysicalNode,
      visit: { node: expect.objectContaining({ tagName: 'footer' }) },
    });
    expect(session.next()).toBeNull();

    const snapshot = session.finish(null);
    expect(snapshot.contexts.map((task) => [task.context, task.state])).toEqual([
      [session.rootContext, TemplateCompilerSiteCursorContextTaskState.Drained],
      [outer, TemplateCompilerSiteCursorContextTaskState.Drained],
      [leaf, TemplateCompilerSiteCursorContextTaskState.Drained],
    ]);
  });

  test('retains distinct physical placements for one mixed-parent logical entrant band', () => {
    const forest = materializeForest(fixture, `mixed-${fixtureOrdinal++}`, familyMarkup);
    const elements = elementsByTag(forest);
    const section = elements.get('section')!;
    const aside = elements.get('aside')!;
    const italic = elements.get('i')!;
    const underline = elements.get('u')!;
    const bold = elements.get('b')!;
    const emphasis = elements.get('em')!;
    const session = startSession('mixed', forest);
    const child = session.createChildContext(
      session.rootContext,
      'mixed:projection',
      TemplateCompilerSiteCursorContextKind.Projection,
    );
    const sectionSource = session.capturePhysicalChildren(section, section.readChildren());
    const asideSource = session.capturePhysicalChildren(aside, aside.readChildren());
    const sectionAuthority = { key: 'mixed:section' };
    const asideAuthority = { key: 'mixed:aside' };
    expect(() => session.stageContextLogicalEntrantBand(session.rootContext, [
      { source: sectionSource, sourceOrdinal: 0, authority: { key: 'mixed:root' } },
    ])).toThrow(/unscheduled pending generated context/u);
    expect(() => session.stageContextLogicalEntrantBand(child, [
      { source: sectionSource, sourceOrdinal: 0, authority: sectionAuthority },
      { source: sectionSource, sourceOrdinal: 0, authority: { key: 'mixed:duplicate' } },
    ])).toThrow(/repeats one source occurrence/u);
    const entrants = session.stageContextLogicalEntrantBand(child, [
      { source: sectionSource, sourceOrdinal: 0, authority: sectionAuthority },
      { source: asideSource, sourceOrdinal: 0, authority: asideAuthority },
    ]);
    expect(() => session.stageContextLogicalEntrantBand(child, [
      { source: sectionSource, sourceOrdinal: 1, authority: { key: 'mixed:duplicate-band' } },
    ])).toThrow(/one complete logical entrant band/u);
    session.scheduleChildContext(session.rootContext, child);

    const first = session.next()!;
    const second = session.next()!;

    expect(first).toMatchObject({
      context: child,
      selectionKind: TemplateCompilerSiteCursorSelectionKind.LogicalEntrant,
      visit: {
        parent: section,
        node: italic,
        parentOrdinal: 0,
        capturedSuccessor: underline,
        logicalOrdinal: 0,
        logicalSuccessor: bold,
      },
    });
    expect(second).toMatchObject({
      context: child,
      selectionKind: TemplateCompilerSiteCursorSelectionKind.LogicalEntrant,
      visit: {
        parent: aside,
        node: bold,
        parentOrdinal: 0,
        capturedSuccessor: emphasis,
        logicalOrdinal: 1,
        logicalSuccessor: null,
      },
    });
    expect(first.work).toBe(entrants[0]);
    expect(second.work).toBe(entrants[1]);
    expect(entrants.map((entrant) => entrant.entrantAuthority)).toEqual([sectionAuthority, asideAuthority]);
    while (session.next() != null) {
      // Drain the retained root frame without introducing compiler semantics into this scheduler test.
    }
    session.finish(null);
  });

  test('drains a zero-work child before selecting the next parent node', () => {
    const forest = materializeForest(fixture, `zero-${fixtureOrdinal++}`, familyMarkup);
    const session = startSession('zero', forest);
    const empty = session.createChildContext(
      session.rootContext,
      'zero:empty-child',
      TemplateCompilerSiteCursorContextKind.Projection,
    );
    expect(session.stageContextLogicalEntrantBand(empty, [])).toEqual([]);
    session.scheduleChildContext(session.rootContext, empty);

    const selected = session.next();
    expect(selected).toMatchObject({
      context: session.rootContext,
      selectionKind: TemplateCompilerSiteCursorSelectionKind.PhysicalNode,
      visit: { node: expect.objectContaining({ tagName: 'main' }) },
    });
    while (session.next() != null) {
      // Drain.
    }
    const snapshot = session.finish(null);
    expect(snapshot.taskForContext(empty)).toMatchObject({
      state: TemplateCompilerSiteCursorContextTaskState.Drained,
      logicalEntrantBandStaged: true,
    });
  });

  test('preserves child creation order across separate scheduling calls', () => {
    const forest = materializeForest(fixture, `child-order-${fixtureOrdinal++}`, familyMarkup);
    const session = startSession('child-order', forest);
    const first = session.createChildContext(
      session.rootContext,
      'child-order:first',
      TemplateCompilerSiteCursorContextKind.Projection,
    );
    const second = session.createChildContext(
      session.rootContext,
      'child-order:second',
      TemplateCompilerSiteCursorContextKind.Projection,
    );

    expect(() => session.scheduleChildContext(session.rootContext, second))
      .toThrow(/creation order/u);
    session.scheduleChildContext(session.rootContext, first);
    expect(session.next()?.context).toBe(session.rootContext);
    session.scheduleChildContext(session.rootContext, second);
    while (session.next() != null) {
      // Drain.
    }

    expect(session.finish(null).contexts.map((task) => task.state))
      .toEqual([
        TemplateCompilerSiteCursorContextTaskState.Drained,
        TemplateCompilerSiteCursorContextTaskState.Drained,
        TemplateCompilerSiteCursorContextTaskState.Drained,
      ]);
  });

  test('binds root-child-root events in global order and contiguous context-local order', () => {
    const forest = materializeForest(fixture, `events-${fixtureOrdinal++}`, familyMarkup);
    const section = elementsByTag(forest).get('section')!;
    const session = startSession('events', forest);
    const rootFirst = session.next()!;
    const firstEvent = phaseEvent(0);
    session.appendEvent(firstEvent);
    const child = session.createChildContext(
      session.rootContext,
      'events:child',
      TemplateCompilerSiteCursorContextKind.Projection,
    );
    session.stageContextLogicalEntrantBand(child, [{
      source: session.capturePhysicalChildren(section, section.readChildren()),
      sourceOrdinal: 0,
      authority: { key: 'events:child' },
    }]);
    session.scheduleChildContext(session.rootContext, child);
    const childSelection = session.next()!;
    const childEvent = phaseEvent(1);
    session.appendEvent(childEvent);
    const rootSecond = session.next()!;
    const finalEvent = phaseEvent(2);
    session.appendEvent(finalEvent);
    expect(session.next()).toBeNull();

    const snapshot = session.finish(null);
    expect([rootFirst, childSelection, rootSecond].map((selection) => occurrenceLabel(selection.visit.node)))
      .toEqual(['main', 'i', 'footer']);
    expect(snapshot.eventBindings.map((binding) => [
      binding.ordinal,
      binding.contextOrdinal,
      binding.context,
      binding.visit?.node ?? null,
      binding.work,
    ])).toEqual([
      [0, 0, session.rootContext, rootFirst.visit.node, null],
      [1, 0, child, childSelection.visit.node, childSelection.work],
      [2, 1, session.rootContext, rootSecond.visit.node, null],
    ]);
    expect(snapshot.taskForContext(session.rootContext)?.events).toEqual([firstEvent, finalEvent]);
    expect(snapshot.taskForContext(child)?.events).toEqual([childEvent]);
    expect(snapshot.bindingForEvent(childEvent)?.work).toBe(childSelection.work);
  });

  test('attests one exact reached selection/event binding as durable history', () => {
    const forest = materializeForest(fixture, `attestation-${fixtureOrdinal++}`, familyMarkup);
    const session = startSession('attestation', forest);
    const selection = session.next()!;
    const reachedEvent = phaseEvent(0);
    session.appendEvent(reachedEvent);

    const attestation = session.attestReachedSelectionEvent(selection, reachedEvent);

    expect(attestation.isModuleConstructed()).toBe(true);
    expect(attestation).toMatchObject({
      session,
      selection,
      event: reachedEvent,
      binding: {
        ordinal: 0,
        contextOrdinal: 0,
        context: selection.context,
        event: reachedEvent,
        visit: selection.visit,
        work: selection.work,
      },
    });

    const foreignSession = startSession('attestation-foreign', forest);
    const foreignSelection = foreignSession.next()!;
    const foreignEvent = phaseEvent(0);
    foreignSession.appendEvent(foreignEvent);
    expect(() => session.attestReachedSelectionEvent(foreignSelection, reachedEvent))
      .toThrow(/exact current task selection/u);
    expect(() => session.attestReachedSelectionEvent(selection, foreignEvent))
      .toThrow(/already-appended event/u);
    expect(() => session.attestReachedSelectionEvent(selection, phaseEvent(1)))
      .toThrow(/already-appended event/u);

    const laterSelection = session.next()!;
    expect(attestation.isModuleConstructed()).toBe(true);
    expect(attestation.selection).toBe(selection);
    expect(attestation.binding.visit).toBe(selection.visit);
    expect(laterSelection).not.toBe(selection);
    expect(session.next()).toBeNull();
    const rootTail = phaseEvent(1);
    session.appendRootEvent(rootTail);
    expect(() => session.attestReachedSelectionEvent(laterSelection, rootTail))
      .toThrow(/does not carry a reached selection/u);
    session.finish(null);

    while (foreignSession.next() != null) {
      // Drain the independent task session.
    }
    foreignSession.finish(null);
  });

  test('publishes drained, waiting, pending, and stopped historical task states without resumability', () => {
    const forest = materializeForest(fixture, `states-${fixtureOrdinal++}`, familyMarkup);
    const elements = elementsByTag(forest);
    const section = elements.get('section')!;
    const session = startSession('states', forest);
    const empty = session.createChildContext(
      session.rootContext,
      'states:empty',
      TemplateCompilerSiteCursorContextKind.TemplateController,
    );
    session.scheduleChildContext(session.rootContext, empty);
    const rootSelection = session.next()!;
    session.pushStagedElementContinuation(session.rootContext, rootSelection.visit, { stage: 'retained' });
    const stopped = session.createChildContext(
      session.rootContext,
      'states:stopped',
      TemplateCompilerSiteCursorContextKind.Projection,
    );
    const pending = session.createChildContext(
      session.rootContext,
      'states:pending',
      TemplateCompilerSiteCursorContextKind.TemplateController,
    );
    session.stageContextLogicalEntrantBand(stopped, [{
      source: session.capturePhysicalChildren(section, section.readChildren()),
      sourceOrdinal: 0,
      authority: { key: 'states:stopped' },
    }]);
    const pendingContinuation = session.pushStagedElementContinuation(
      pending,
      rootSelection.visit,
      { stage: 'pending-leaf' },
    );
    session.scheduleChildContexts(session.rootContext, [stopped, pending]);
    const stoppedSelection = session.next()!;
    const frontier = new TemplateCompilerSiteCursorFrontier(
      eventAuthority,
      0,
      TemplateCompilerSiteCursorPhaseKind.ContentStart,
      TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeProjection,
      stoppedSelection.visit.node,
      null,
      null,
      stoppedSelection.visit.capturedSuccessor,
      0,
      0,
      0,
      'Direct scheduler stop.',
    );
    session.appendEvent(frontier);

    const snapshot = session.finish(frontier);
    expect(snapshot.contexts.map((task) => [task.context, task.state])).toEqual([
      [session.rootContext, TemplateCompilerSiteCursorContextTaskState.Waiting],
      [empty, TemplateCompilerSiteCursorContextTaskState.Drained],
      [stopped, TemplateCompilerSiteCursorContextTaskState.Stopped],
      [pending, TemplateCompilerSiteCursorContextTaskState.Pending],
    ]);
    expect(snapshot.taskStack).toEqual([session.rootContext, pending, stopped]);
    expect(snapshot.taskForContext(stopped)).toMatchObject({
      frontier,
      stopKind: TemplateCompilerSiteCursorTaskStopKind.StructuralFrontier,
      lastVisit: stoppedSelection.visit,
      lastWork: stoppedSelection.work,
    });
    expect(snapshot.taskForContext(pending)?.remainingWork).toEqual([pendingContinuation]);
    expect(() => session.next()).toThrow(/not active/u);
  });

  test('walks one wide physical frame from a single captured child sequence', () => {
    const width = 512;
    const markup = Array.from({ length: width }, (_, ordinal) => `<i data-i="${ordinal}"></i>`).join('');
    const forest = materializeForest(fixture, `wide-${fixtureOrdinal++}`, markup);
    const children = forest.compilerContent.readChildren();
    const readChildren = vi.spyOn(forest.compilerContent, 'readChildren');
    const session = TemplateCompilerSiteCursorTaskSession.createRoot('wide');
    session.startRoot(forest.compilerContent, children);

    let count = 0;
    while (session.nextRootVisit() != null) count++;

    expect(count).toBe(width);
    expect(readChildren).toHaveBeenCalledTimes(1);
    expect(session.finish(null).contexts[0]).toMatchObject({
      state: TemplateCompilerSiteCursorContextTaskState.Drained,
      remainingFrames: [],
    });
  });
});

function startSession(
  localKey: string,
  forest: TemplateCompilerOccurrenceForest,
): TemplateCompilerSiteCursorTaskSession {
  const session = TemplateCompilerSiteCursorTaskSession.createRoot(localKey);
  session.startRoot(forest.compilerContent, forest.compilerContent.readChildren());
  return session;
}

function materializeForest(
  fixture: BrowserEffectiveTemplateFixture,
  key: string,
  markup: string,
): TemplateCompilerOccurrenceForest {
  return TemplateCompilerOccurrenceForest.fromBrowserEffective(fixture.materialize(key, markup).emission);
}

function elementsByTag(
  forest: TemplateCompilerOccurrenceForest,
): ReadonlyMap<string, TemplateCompilerElementOccurrence> {
  return new Map(forest.readNodes().flatMap((node) =>
    node instanceof TemplateCompilerElementOccurrence ? [[node.tagName, node] as const] : []
  ));
}

function occurrenceLabel(node: { readonly nodeKind: string }): string {
  return node instanceof TemplateCompilerElementOccurrence ? node.tagName : node.nodeKind;
}

function phaseEvent(ordinal: number): TemplateCompilerSiteCursorPhaseEvent {
  return new TemplateCompilerSiteCursorPhaseEvent(
    eventAuthority,
    ordinal,
    TemplateCompilerSiteCursorPhaseKind.ContentStart,
  );
}
