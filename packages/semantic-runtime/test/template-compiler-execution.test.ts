import { describe, expect, test, vi } from 'vitest';

import { TemplateCompilationContextKind, TemplateCompilationContextReference } from '../src/template/compilation-unit.js';
import { CompiledTemplateReference } from '../src/template/compiled-template.js';
import { TemplateCompilerTargetPlan } from '../src/template/compiler-target-plan.js';
import {
  TemplateCompilerHookCallableAuthority,
  TemplateCompilerHookCallableAuthorityKind,
  TemplateCompilerHookEntry,
  TemplateCompilerHookEntryCause,
  TemplateCompilerHookEntryCauseKind,
  TemplateCompilerHookKind,
  TemplateCompilerHookLane,
  TemplateCompilerHookMembershipState,
  TemplateCompilerHookProviderAuthority,
  TemplateCompilerHookProviderResolutionKind,
  TemplateCompilerHookSet,
} from '../src/template/compiler-hook-world.js';
import {
  TemplateCompilerBootstrapDriverKind,
  TemplateCompilerBootstrapDriverReference,
  TemplateCompilerCallableEffectOperationTarget,
  TemplateCompilerCallableReference,
  TemplateCompilerExecutionSession,
  TemplateCompilerHookOperationTarget,
  TemplateCompilerHookOperationStage,
  TemplateCompilerInstructionOperationTarget,
  TemplateCompilerInvocationPhase,
  TemplateCompilerMutationBatchState,
  TemplateCompilerOperationCompletion,
  TemplateCompilerOperationCompletionKind,
  TemplateCompilerOperationExecutionMechanism,
  TemplateCompilerOperationKind,
  TemplateCompilerResourceOperationTarget,
  type TemplateCompilerOperation,
  type TemplateCompilerOperationAttemptRequest,
} from '../src/template/template-compiler-execution.js';
import {
  TemplateCompilerHookBootstrapResult,
  TemplateCompilerHookBootstrapState,
} from '../src/template/template-compiler-hook-bootstrap.js';
import {
  TemplateCompilerLocalExtractionResult,
  TemplateCompilerLocalExtractionState,
} from '../src/template/template-compiler-local-extraction.js';
import {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerGeneratedOccurrenceRole,
  TemplateCompilerOccurrenceEdgeKind,
  TemplateCompilerOccurrenceForest,
  TemplateCompilerTextOccurrence,
} from '../src/template/template-compiler-occurrence.js';
import { TemplateCompilerCompletedMutationBatchKind } from '../src/template/template-compiler-mutation-authority.js';
import { TemplateCompilerStructuralExecutionSession } from '../src/template/template-compiler-structural-execution.js';
import { BrowserEffectiveTemplateFixture } from './browser-effective-template-fixture.js';

describe('template compiler execution sequence', () => {
  test('opens and commits a pending mutation batch without scanning forest inventory', () => {
    const browser = new BrowserEffectiveTemplateFixture('compiler-execution-mutation-batch-cost');

    try {
      const markup = `<div>${'<span>item</span>'.repeat(256)}</div>`;
      const input = browser.materialize('root', markup);
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
      const execution = TemplateCompilerExecutionSession.createForForest(
        'compiler-execution-mutation-batch-cost:family',
        forest,
      );
      const lane = execution.admitRootInvocation('compiler-execution-mutation-batch-cost:lane');
      const bootstrap = execution.bootstrapContext(lane);
      const hookSet = compilerHookSet(browser, 'mutation-batch-cost:hook-set');
      const readNodes = vi.spyOn(forest, 'readNodes');
      const readAttributes = vi.spyOn(forest, 'readAttributes');
      const readRoots = vi.spyOn(forest, 'readRoots');

      const attempt = execution.beginOperation({
        operationKey: 'mutation-batch-cost:resolution',
        context: bootstrap,
        operationKind: TemplateCompilerOperationKind.CompilerHook,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: execution.compilerHookTarget(
          bootstrap,
          hookSet,
          TemplateCompilerHookOperationStage.HookSetResolution,
          null,
        ),
        causeHandles: [hookSet.productHandle],
      });
      execution.completeOperation(
        attempt,
        new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete),
      );

      expect(readNodes).not.toHaveBeenCalled();
      expect(readAttributes).not.toHaveBeenCalled();
      expect(readRoots).not.toHaveBeenCalled();
    } finally {
      browser.dispose();
    }
  });

  test('begins from an invocation carrier without exposing legacy structural planning', () => {
    const browser = new BrowserEffectiveTemplateFixture('compiler-execution-bootstrap');

    try {
      const input = browser.materialize('root', '<div title="hello">content</div>');
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
      const execution = TemplateCompilerExecutionSession.createForForest(
        'compiler-execution-bootstrap:family',
        forest,
      );
      const lane = execution.admitRootInvocation('compiler-execution-bootstrap:target-plan');
      const bootstrap = execution.bootstrapContext(lane);
      const callable = new TemplateCompilerCallableReference(
        browser.run.handles.product('bootstrap:hook'),
        browser.run.handles.identity('bootstrap:hook'),
        browser.run.handles.address('bootstrap:hook'),
      );
      const hookSet = compilerHookSet(browser, 'bootstrap:hook-set');
      const resolutionTarget = execution.compilerHookTarget(
        bootstrap,
        hookSet,
        TemplateCompilerHookOperationStage.HookSetResolution,
        null,
      );
      const resolution = execution.completeOperation(execution.beginOperation({
        operationKey: 'bootstrap:hook-set-resolution',
        context: bootstrap,
        operationKind: TemplateCompilerOperationKind.CompilerHook,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: resolutionTarget,
        causeHandles: [hookSet.productHandle],
      }), new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete));
      const hookTarget = execution.compilerHookTarget(
        bootstrap,
        hookSet,
        TemplateCompilerHookOperationStage.Invocation,
        0,
        callable,
      );
      const title = forest.readAttributes().find((attribute) => attribute.name === 'title');
      if (title == null) throw new Error('Expected bootstrap scalar-mutation attribute.');
      const attempt = execution.beginOperation({
        operationKey: 'bootstrap:hook:0',
        context: bootstrap,
        operationKind: TemplateCompilerOperationKind.CompilerHook,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.StaticCallable,
        target: hookTarget,
        causeHandles: [hookSet.productHandle],
      });
      expect(() => execution.detachAttribute(attempt, title))
        .toThrow(/cannot perform local-extraction topology mutations/);
      expect(title.owner).not.toBeNull();
      expect(execution.readAttributeValue(attempt, title)).toBe('hello');
      execution.rewriteAttributeValue(attempt, title, 'mapped');
      expect(execution.readAttributeValue(attempt, title)).toBe('mapped');
      expect(title.value).toBe('hello');
      const hook = execution.completeOperation(
        attempt,
        new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete),
      );

      expect(execution.structuralExecution).toBeNull();
      expect(lane.targetPlan).toBeNull();
      expect(execution.sequence.readBootstrapContexts()).toEqual([bootstrap]);
      expect(execution.sequence.readContextOperations(bootstrap)).toEqual([resolution, hook]);
      expect(resolutionTarget.entryOrdinal).toBeNull();
      expect(hookTarget).toBeInstanceOf(TemplateCompilerHookOperationTarget);
      expect(hookTarget.entryOrdinal).toBe(0);
      expect(hookTarget.callable).toBe(callable);
      expect(hook.mutationBatch).toMatchObject({
        state: TemplateCompilerMutationBatchState.Committed,
        attributeValueMutations: [{ attribute: title, previousValue: 'hello', nextValue: 'mapped' }],
      });
      expect(title.value).toBe('mapped');
      expect(execution.invocationPhase(lane)).toBe(TemplateCompilerInvocationPhase.CompilerHooks);
      expect(() => execution.seal()).toThrow(/no target plan or terminal bootstrap outcome/);

      const targetPlan = createRootTargetPlan(browser, lane.localKey);
      recordReachableCompilerInputs(targetPlan, forest);
      expect(() => execution.createStructuralExecution(targetPlan))
        .toThrow(/forest-first compiler execution before nominal site completion authority/);
      expect(() => execution.attachTargetPlan(lane, targetPlan))
        .toThrow(/forest-first compiler execution before nominal site completion authority/);
      expect(() => execution.admitTargetPlan(targetPlan))
        .toThrow(/forest-first compiler execution before nominal site completion authority/);
      expect(execution.structuralExecution).toBeNull();
      expect(lane.targetPlan).toBeNull();
      expect(() => TemplateCompilerExecutionSession.createForForest('duplicate', forest)).toThrow(/already owns/);
    } finally {
      browser.dispose();
    }
  });

  test('keeps a zero-operation site frontier repeatable without fabricating execution closure', () => {
    const browser = new BrowserEffectiveTemplateFixture('compiler-execution-site-zero');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(
        browser.materialize('root', '<main><span>content</span></main>').emission,
      );
      const execution = TemplateCompilerExecutionSession.createForForest('site-zero:family', forest);
      const lane = execution.admitRootInvocation('site-zero:plan');
      const bootstrapClosure = closeExactNoLocalBootstrap(browser, execution, lane, 'site-zero');

      const first = execution.captureSiteExecutionFrontier(bootstrapClosure);
      const second = execution.captureSiteExecutionFrontier(bootstrapClosure);
      expect(second).not.toBe(first);
      expect(second).toMatchObject({
        lane,
        bootstrapClosure,
        forestMutationRevision: first.forestMutationRevision,
        globalOperationCount: first.globalOperationCount,
        laneOperationCount: first.laneOperationCount,
      });
      expect(execution.invocationPhase(lane)).toBe(TemplateCompilerInvocationPhase.BootstrapClosed);
      expect(execution.sequence.readSiteContexts()).toEqual([]);
      expect(execution.siteExecutionContext(lane)).toBeNull();
    } finally {
      browser.dispose();
    }
  });

  test('executes mutating processContent before planning under one lazy site context', () => {
    const browser = new BrowserEffectiveTemplateFixture('compiler-execution-site-process-content');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(
        browser.materialize('root', '<div title="before">content</div>').emission,
      );
      const execution = TemplateCompilerExecutionSession.createForForest('site-process:family', forest);
      const lane = execution.admitRootInvocation('site-process:plan');
      const bootstrapClosure = closeExactNoLocalBootstrap(browser, execution, lane, 'site-process');
      const frontier = execution.captureSiteExecutionFrontier(bootstrapClosure);
      expect(execution.sequence.readSiteContexts()).toEqual([]);

      const driver = execution.beginSiteExecutionDriver(frontier);
      const context = driver.context;
      const element = forest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
        node instanceof TemplateCompilerElementOccurrence && node.tagName === 'div'
      );
      const attribute = element?.readAttributes().find((candidate) => candidate.name === 'title') ?? null;
      if (element == null || attribute == null) throw new Error('Expected processContent site occurrences.');
      const callable = new TemplateCompilerCallableReference(
        browser.run.handles.product('site-process:callable'),
        browser.run.handles.identity('site-process:callable'),
        browser.run.handles.address('site-process:callable'),
      );
      expect(() => execution.beginOperation({
        operationKey: 'site-process:unsupported-attribute',
        context,
        operationKind: TemplateCompilerOperationKind.AttributeDisposition,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: execution.occurrenceTarget(context, attribute),
        causeHandles: [browser.run.handles.product('site-process:definition')],
        siteExecutionDriver: driver,
      })).toThrow(/currently admits only processContent/);
      const attempt = execution.beginOperation({
        operationKey: 'site-process:invoke',
        context,
        operationKind: TemplateCompilerOperationKind.ProcessContent,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.StaticCallable,
        target: execution.callableEffectTarget(context, callable, element),
        causeHandles: [browser.run.handles.product('site-process:definition')],
        siteExecutionDriver: driver,
      });
      expect(() => execution.assertCurrentSiteExecutionDriver(driver)).toThrow(/operation.*pending/);
      const content = element.readChildren()[0];
      if (content == null) throw new Error('Expected processContent child.');
      expect(() => execution.detachDirectChild(attempt, element, 0, content))
        .toThrow(/cannot perform built-in site direct-child detachment/);
      execution.rewriteAttributeValue(attempt, attribute, 'after');
      const operation = execution.completeOperation(
        attempt,
        new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Declined),
      );
      expect(() => execution.assertCurrentSiteExecutionDriver(driver)).not.toThrow();
      const scalar = execution.captureReachedAttributeScalar(driver, element, attribute, 0);

      expect(execution.sequence.readSiteContexts()).toEqual([context]);
      expect(execution.sequence.readContextOperations(context)).toEqual([operation]);
      expect(operation).toMatchObject({
        context,
        startForestMutationRevision: frontier.forestMutationRevision,
        endForestMutationRevision: forest.mutationRevision,
        laneOperationOrdinal: frontier.laneOperationCount,
      });
      expect(scalar).toMatchObject({
        bootstrapClosure,
        siteExecutionContext: context,
        currentValue: 'after',
        replayedValue: 'after',
        laneOperationCount: frontier.laneOperationCount + 1,
      });
      expect(scalar.isExact()).toBe(true);
      expect(() => execution.captureReachedAttributeScalar(bootstrapClosure, element, attribute, 0))
        .toThrow(/bootstrap closure no longer owns/);

      execution.finishSiteExecutionDriver(driver);
      expect(execution.invocationPhase(lane)).toBe(TemplateCompilerInvocationPhase.SiteExecution);
      expect(() => execution.beginOperation({
        operationKey: 'site-process:after-close',
        context,
        operationKind: TemplateCompilerOperationKind.ProcessContent,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.StaticCallable,
        target: execution.callableEffectTarget(context, callable, element),
        causeHandles: [browser.run.handles.product('site-process:definition')],
        siteExecutionDriver: driver,
      })).toThrow(/currently admits only processContent/);

      const targetPlan = createRootTargetPlan(browser, lane.localKey);
      recordReachableCompilerInputs(targetPlan, forest);
      expect(() => execution.createStructuralExecution(targetPlan))
        .toThrow(/forest-first compiler execution before nominal site completion authority/);
      targetPlan.seal();
      expect(() => execution.attachTargetPlan(lane, targetPlan))
        .toThrow(/forest-first compiler execution before nominal site completion authority/);
      expect(() => execution.admitTargetPlan(targetPlan))
        .toThrow(/forest-first compiler execution before nominal site completion authority/);
      expect(lane.targetPlan).toBeNull();
      expect(() => execution.seal()).toThrow(/no target plan or terminal bootstrap outcome/);
    } finally {
      browser.dispose();
    }
  });

  test('commits built-in processContent child detachments in caller-proven order', () => {
    const browser = new BrowserEffectiveTemplateFixture('compiler-execution-site-detachment');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(
        browser.materialize(
          'root',
          '<div title="before"><i id="a"><u></u></i><i id="b"></i><i id="c"></i></div>',
        ).emission,
      );
      const execution = TemplateCompilerExecutionSession.createForForest('site-detachment:family', forest);
      const lane = execution.admitRootInvocation('site-detachment:plan');
      const bootstrapClosure = closeExactNoLocalBootstrap(browser, execution, lane, 'site-detachment');
      const driver = execution.beginSiteExecutionDriver(
        execution.captureSiteExecutionFrontier(bootstrapClosure),
      );
      const parent = forest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
        node instanceof TemplateCompilerElementOccurrence && node.tagName === 'div'
      );
      const title = parent?.readAttributes().find((attribute) => attribute.name === 'title') ?? null;
      if (parent == null || title == null) throw new Error('Expected built-in processContent parent.');
      const [first, second, third] = parent.readChildren();
      if (first == null || second == null || third == null) throw new Error('Expected three direct children.');
      const callable = new TemplateCompilerCallableReference(
        browser.run.handles.product('site-detachment:callable'),
        browser.run.handles.identity('site-detachment:callable'),
        browser.run.handles.address('site-detachment:callable'),
      );
      const attempt = execution.beginOperation({
        operationKey: 'site-detachment:process-content',
        context: driver.context,
        operationKind: TemplateCompilerOperationKind.ProcessContent,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: execution.callableEffectTarget(driver.context, callable, parent),
        causeHandles: [browser.run.handles.product('site-detachment:definition')],
        siteExecutionDriver: driver,
      });

      if (!(first instanceof TemplateCompilerElementOccurrence)) {
        throw new Error('Expected descendant processContent parent candidate.');
      }
      const unrelatedChild = first.readChildren()[0];
      if (unrelatedChild == null) throw new Error('Expected unrelated descendant child.');
      expect(() => execution.detachDirectChild(attempt, first, 0, unrelatedChild))
        .toThrow(/only from its exact processContent host/);
      expect(first.readChildren()).toEqual([unrelatedChild]);
      execution.detachDirectChild(attempt, parent, 1, second);
      execution.detachDirectChild(attempt, parent, 1, third);
      execution.rewriteAttributeValue(attempt, title, 'after');
      const operation = execution.completeOperation(
        attempt,
        new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete),
      );

      expect(parent.readChildren()).toEqual([first]);
      expect(operation.mutationBatch.nodeDetachmentMutations.map((mutation) => ({
        eventOrdinal: mutation.eventOrdinal,
        node: mutation.node,
        previousParent: mutation.previousParent,
        previousOrdinal: mutation.previousOrdinal,
      }))).toEqual([
        { eventOrdinal: 0, node: second, previousParent: parent, previousOrdinal: 1 },
        { eventOrdinal: 1, node: third, previousParent: parent, previousOrdinal: 1 },
      ]);
      expect(operation.endForestMutationRevision - operation.startForestMutationRevision).toBe(3);
      expect(execution.captureReachedAttributeScalar(driver, parent, title, 0)).toMatchObject({
        currentValue: 'after',
        replayedValue: 'after',
      });
      execution.finishSiteExecutionDriver(driver);
      forest.assertCoherentTopology();
    } finally {
      browser.dispose();
    }
  });

  test('rejects discarded built-in processContent topology without blessing the pending attempt', () => {
    const browser = new BrowserEffectiveTemplateFixture('compiler-execution-site-detachment-discard');
    try {
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(
        browser.materialize('root', '<div><i></i></div>').emission,
      );
      const execution = TemplateCompilerExecutionSession.createForForest('site-detachment-discard:family', forest);
      const lane = execution.admitRootInvocation('site-detachment-discard:plan');
      const closure = closeExactNoLocalBootstrap(browser, execution, lane, 'site-detachment-discard');
      const driver = execution.beginSiteExecutionDriver(execution.captureSiteExecutionFrontier(closure));
      const parent = forest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
        node instanceof TemplateCompilerElementOccurrence && node.tagName === 'div'
      );
      const child = parent?.readChildren()[0] ?? null;
      if (parent == null || child == null) throw new Error('Expected discarded direct child.');
      const callable = new TemplateCompilerCallableReference(
        browser.run.handles.product('site-detachment-discard:callable'),
        browser.run.handles.identity('site-detachment-discard:callable'),
        browser.run.handles.address('site-detachment-discard:callable'),
      );
      const attempt = execution.beginOperation({
        operationKey: 'site-detachment-discard:process-content',
        context: driver.context,
        operationKind: TemplateCompilerOperationKind.ProcessContent,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: execution.callableEffectTarget(driver.context, callable, parent),
        causeHandles: [browser.run.handles.product('site-detachment-discard:definition')],
        siteExecutionDriver: driver,
      });
      execution.detachDirectChild(attempt, parent, 0, child);

      expect(() => execution.completeOperation(
        attempt,
        new TemplateCompilerOperationCompletion(
          TemplateCompilerOperationCompletionKind.Open,
          [browser.run.handles.openSeam('site-detachment-discard:open')],
        ),
      )).toThrow(/cannot discard generated or topological output until forest rollback exists/);
      expect(execution.readPendingAttempt()).toBe(attempt);
      expect(execution.sequence.readContextOperations(driver.context)).toEqual([]);
    } finally {
      browser.dispose();
    }
  });

  test('records a wide built-in direct-child detachment batch without ordinal scans', () => {
    const browser = new BrowserEffectiveTemplateFixture('compiler-execution-site-detachment-wide');
    const readParentOrdinal = vi.spyOn(TemplateCompilerElementOccurrence.prototype, 'readParentOrdinal');
    try {
      const markup = `<div>${'<i></i>'.repeat(256)}</div>`;
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(
        browser.materialize('root', markup).emission,
      );
      const execution = TemplateCompilerExecutionSession.createForForest('site-detachment-wide:family', forest);
      const lane = execution.admitRootInvocation('site-detachment-wide:plan');
      const closure = closeExactNoLocalBootstrap(browser, execution, lane, 'site-detachment-wide');
      const driver = execution.beginSiteExecutionDriver(execution.captureSiteExecutionFrontier(closure));
      const parent = forest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
        node instanceof TemplateCompilerElementOccurrence && node.tagName === 'div'
      );
      if (parent == null) throw new Error('Expected wide processContent parent.');
      const children = [...parent.readChildren()];
      const callable = new TemplateCompilerCallableReference(
        browser.run.handles.product('site-detachment-wide:callable'),
        browser.run.handles.identity('site-detachment-wide:callable'),
        browser.run.handles.address('site-detachment-wide:callable'),
      );
      const attempt = execution.beginOperation({
        operationKey: 'site-detachment-wide:process-content',
        context: driver.context,
        operationKind: TemplateCompilerOperationKind.ProcessContent,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: execution.callableEffectTarget(driver.context, callable, parent),
        causeHandles: [browser.run.handles.product('site-detachment-wide:definition')],
        siteExecutionDriver: driver,
      });
      readParentOrdinal.mockClear();
      for (let ordinal = children.length - 1; ordinal >= 0; ordinal--) {
        execution.detachDirectChild(attempt, parent, ordinal, children[ordinal]!);
      }
      const operation = execution.completeOperation(
        attempt,
        new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete),
      );

      expect(operation.mutationBatch.nodeDetachmentMutations).toHaveLength(256);
      expect(operation.mutationBatch.nodeDetachmentMutations.map((mutation) => mutation.eventOrdinal))
        .toEqual(Array.from({ length: 256 }, (_, ordinal) => ordinal));
      expect(operation.mutationBatch.nodeDetachmentMutations.map((mutation) => mutation.previousOrdinal))
        .toEqual(Array.from({ length: 256 }, (_, ordinal) => 255 - ordinal));
      expect(readParentOrdinal).not.toHaveBeenCalled();
      execution.finishSiteExecutionDriver(driver);
      forest.assertCoherentTopology();
    } finally {
      readParentOrdinal.mockRestore();
      browser.dispose();
    }
  });

  test('rejects foreign, stale, and interleaved site execution authority', () => {
    const left = new BrowserEffectiveTemplateFixture('compiler-execution-site-authority-left');
    const right = new BrowserEffectiveTemplateFixture('compiler-execution-site-authority-right');
    try {
      const leftForest = TemplateCompilerOccurrenceForest.fromBrowserEffective(
        left.materialize('root', '<div title="left"></div>').emission,
      );
      const rightForest = TemplateCompilerOccurrenceForest.fromBrowserEffective(
        right.materialize('root', '<div title="right"></div>').emission,
      );
      const leftExecution = TemplateCompilerExecutionSession.createForForest('site-authority:left', leftForest);
      const rightExecution = TemplateCompilerExecutionSession.createForForest('site-authority:right', rightForest);
      const leftLane = leftExecution.admitRootInvocation('site-authority:left:lane');
      const rightLane = rightExecution.admitRootInvocation('site-authority:right:lane');
      const leftClosure = closeExactNoLocalBootstrap(left, leftExecution, leftLane, 'site-authority:left');
      const rightClosure = closeExactNoLocalBootstrap(right, rightExecution, rightLane, 'site-authority:right');
      const leftFrontier = leftExecution.captureSiteExecutionFrontier(leftClosure);
      const rightFrontier = rightExecution.captureSiteExecutionFrontier(rightClosure);

      expect(() => leftExecution.beginSiteExecutionDriver(rightFrontier)).toThrow(/another family/);
      const rightAttribute = rightForest.readAttributes().find((candidate) => candidate.name === 'title');
      if (rightAttribute == null) throw new Error('Expected stale-frontier attribute.');
      rightForest.rewriteAttributeValue(rightAttribute, 'stale');
      expect(() => rightExecution.beginSiteExecutionDriver(rightFrontier)).toThrow(/foreign, stale, or no longer pre-plan/);

      const driver = leftExecution.beginSiteExecutionDriver(leftFrontier);
      expect(() => leftExecution.beginHookBootstrapDriver(leftLane))
        .toThrow(/while compiler site driver/);
      expect(() => leftExecution.finishBootstrapDriver(new TemplateCompilerBootstrapDriverReference(
        {},
        leftLane,
        TemplateCompilerBootstrapDriverKind.CompilerHooks,
      ))).toThrow(/while compiler site driver/);
      expect(() => leftExecution.closeInvocationBootstrap(
        leftClosure.hookBootstrap,
        leftClosure.localExtraction,
      )).toThrow(/while compiler site driver/);
      expect(() => leftExecution.admitRootInvocation('site-authority:interleaved-root'))
        .toThrow(/while compiler site driver/);
      const bootstrap = leftExecution.bootstrapContext(leftLane);
      const hooks = compilerHookSet(left, 'site-authority:interleaved-hook');
      expect(() => leftExecution.beginOperation({
        operationKey: 'site-authority:interleaved',
        context: bootstrap,
        operationKind: TemplateCompilerOperationKind.CompilerHook,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: leftExecution.compilerHookTarget(
          bootstrap,
          hooks,
          TemplateCompilerHookOperationStage.HookSetResolution,
          null,
        ),
        causeHandles: [hooks.productHandle],
      })).toThrow(/cannot interleave with active site driver/);

      const element = leftForest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
        node instanceof TemplateCompilerElementOccurrence && node.tagName === 'div'
      );
      if (element == null) throw new Error('Expected active-driver element.');
      const callable = new TemplateCompilerCallableReference(
        left.run.handles.product('site-authority:callable'),
        left.run.handles.identity('site-authority:callable'),
        left.run.handles.address('site-authority:callable'),
      );
      const attempt = leftExecution.beginOperation({
        operationKey: 'site-authority:owned',
        context: driver.context,
        operationKind: TemplateCompilerOperationKind.ProcessContent,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.StaticCallable,
        target: leftExecution.callableEffectTarget(driver.context, callable, element),
        causeHandles: [left.run.handles.product('site-authority:definition')],
        siteExecutionDriver: driver,
      });
      expect(() => leftExecution.createGeneration(
        attempt,
        TemplateCompilerGeneratedOccurrenceRole.Clone,
        0,
      )).toThrow(/does not admit generated structure/);
      const leftAttribute = element.readAttributes()[0]!;
      leftForest.rewriteAttributeValue(leftAttribute, 'unledgered-during-attempt');
      expect(() => leftExecution.completeOperation(
        attempt,
        new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete),
      )).toThrow(/unledgered or unsupported forest mutation before scalar commit/);
      expect(leftExecution.readPendingAttempt()).toBe(attempt);
      expect(leftExecution.sequence.readContextOperations(driver.context)).toEqual([]);
    } finally {
      left.dispose();
      right.dispose();
    }
  });

  test('retains an exact hook prefix and seals a terminal pre-plan lane without fabricating a plan', () => {
    const browser = new BrowserEffectiveTemplateFixture('compiler-execution-bootstrap-terminal');

    try {
      const input = browser.materialize('root', '<div class="before">content</div>');
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
      const execution = TemplateCompilerExecutionSession.createForForest(
        'compiler-execution-bootstrap-terminal:family',
        forest,
      );
      const lane = execution.admitRootInvocation('compiler-execution-bootstrap-terminal:lane');
      const bootstrap = execution.bootstrapContext(lane);
      const callable = new TemplateCompilerCallableReference(
        browser.run.handles.product('terminal:hook'),
        browser.run.handles.identity('terminal:hook'),
        browser.run.handles.address('terminal:hook'),
      );
      const hookSet = compilerHookSet(browser, 'terminal:hook-set', 2);
      const classAttribute = forest.readAttributes().find((attribute) => attribute.name === 'class');
      if (classAttribute == null) throw new Error('Expected terminal scalar-mutation attribute.');
      const firstTarget = execution.compilerHookTarget(
        bootstrap,
        hookSet,
        TemplateCompilerHookOperationStage.Invocation,
        0,
        callable,
      );
      const firstAttempt = execution.beginOperation({
        operationKey: 'terminal:hook:exact-prefix',
        context: bootstrap,
        operationKind: TemplateCompilerOperationKind.CompilerHook,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.StaticCallable,
        target: firstTarget,
        causeHandles: [hookSet.productHandle],
      });
      execution.rewriteAttributeValue(firstAttempt, classAttribute, 'exact-prefix');
      const sourceText = forest.readNodes().find((node): node is TemplateCompilerTextOccurrence =>
        node instanceof TemplateCompilerTextOccurrence && node.text === 'content'
      ) ?? null;
      if (sourceText?.inputReference == null) throw new Error('Expected bootstrap generation source text.');
      const bootstrapGeneration = execution.createGeneration(
        firstAttempt,
        TemplateCompilerGeneratedOccurrenceRole.Clone,
        0,
      );
      const generated = forest.createGeneratedText(
        bootstrapGeneration,
        'content-copy',
        sourceText.inputReference,
      );
      expect(() => execution.mutationAuthority.assertGeneratedInventory())
        .toThrow(/no completed mutation authority/);
      const first = execution.completeOperation(
        firstAttempt,
        new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete),
      );
      expect(generated.generation).toBe(bootstrapGeneration);
      expect(execution.mutationAuthority.completedBatchForGeneration(bootstrapGeneration)?.batchKind)
        .toBe(TemplateCompilerCompletedMutationBatchKind.Execution);
      const terminalAttempt = execution.beginOperation({
        operationKey: 'terminal:hook:open',
        context: bootstrap,
        operationKind: TemplateCompilerOperationKind.CompilerHook,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.StaticCallable,
        target: execution.compilerHookTarget(
          bootstrap,
          hookSet,
          TemplateCompilerHookOperationStage.Invocation,
          1,
          callable,
        ),
        causeHandles: [hookSet.productHandle],
      });
      const terminalForestRevision = forest.mutationRevision;
      execution.rewriteAttributeValue(terminalAttempt, classAttribute, 'discarded-open-write');
      const discardedReservation = execution.createGeneration(
        terminalAttempt,
        TemplateCompilerGeneratedOccurrenceRole.Clone,
        0,
      );
      const terminal = execution.completeOperation(terminalAttempt, new TemplateCompilerOperationCompletion(
        TemplateCompilerOperationCompletionKind.Open,
        [browser.run.handles.openSeam('terminal:hook-open')],
      ));
      expect(terminal.mutationBatch.occurrenceGenerationReservations).toEqual([discardedReservation]);
      expect(execution.mutationAuthority.completedBatchForGeneration(discardedReservation)).toBeNull();
      expect(forest.mutationRevision).toBe(terminalForestRevision);
      expect(() => execution.createGeneration(
        terminalAttempt,
        TemplateCompilerGeneratedOccurrenceRole.Clone,
        0,
      )).toThrow(/exact pending mutation batch/);

      expect(execution.sequence.readLaneOperations(lane)).toEqual([first, terminal]);
      expect(first.mutationBatch.state).toBe(TemplateCompilerMutationBatchState.Committed);
      expect(terminal.mutationBatch.state).toBe(TemplateCompilerMutationBatchState.Discarded);
      expect(classAttribute.value).toBe('exact-prefix');
      expect(execution.seal()).toBe(execution.sequence);
      expect(lane.targetPlan).toBeNull();
      expect(execution.structuralExecution).toBeNull();
    } finally {
      browser.dispose();
    }
  });

  test('rejects Open completion after pending generated topology escapes before rollback exists', () => {
    const browser = new BrowserEffectiveTemplateFixture('compiler-execution-generation-rollback-boundary');

    try {
      const input = browser.materialize('root', '<div>content</div>');
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
      const execution = TemplateCompilerExecutionSession.createForForest(
        'compiler-execution-generation-rollback-boundary:family',
        forest,
      );
      const lane = execution.admitRootInvocation('compiler-execution-generation-rollback-boundary:lane');
      const bootstrap = execution.bootstrapContext(lane);
      const hookSet = compilerHookSet(browser, 'generation-rollback:hook-set');
      const sourceText = forest.readNodes().find((node): node is TemplateCompilerTextOccurrence =>
        node instanceof TemplateCompilerTextOccurrence && node.text === 'content'
      ) ?? null;
      if (sourceText?.inputReference == null) throw new Error('Expected rollback-boundary source text.');
      const attempt = execution.beginOperation({
        operationKey: 'generation-rollback:hook',
        context: bootstrap,
        operationKind: TemplateCompilerOperationKind.CompilerHook,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: execution.compilerHookTarget(
          bootstrap,
          hookSet,
          TemplateCompilerHookOperationStage.Invocation,
          0,
          new TemplateCompilerCallableReference(
            browser.run.handles.product('generation-rollback:callable'),
            browser.run.handles.identity('generation-rollback:callable'),
            browser.run.handles.address('generation-rollback:callable'),
          ),
        ),
        causeHandles: [hookSet.productHandle],
      });
      const pendingForestRevision = forest.mutationRevision;
      const generation = execution.createGeneration(
        attempt,
        TemplateCompilerGeneratedOccurrenceRole.Clone,
        0,
      );
      forest.createGeneratedText(generation, 'escaped', sourceText.inputReference);
      expect(forest.mutationRevision).toBeGreaterThan(pendingForestRevision);

      expect(() => execution.completeOperation(attempt, new TemplateCompilerOperationCompletion(
        TemplateCompilerOperationCompletionKind.Open,
        [browser.run.handles.openSeam('generation-rollback:open')],
      ))).toThrow(/cannot discard generated or topological output until forest rollback exists/);
      expect(execution.readPendingAttempt()).toBe(attempt);
      expect(execution.mutationAuthority.completedBatchForGeneration(generation)).toBeNull();
    } finally {
      browser.dispose();
    }
  });

  test('rejects Open local extraction after a typed topology detachment escapes', () => {
    const browser = new BrowserEffectiveTemplateFixture('compiler-execution-topology-rollback-boundary');

    try {
      const input = browser.materialize(
        'root',
        '<template as-custom-element="local-card"><span>local</span></template><div>owner</div>',
      );
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
      const execution = TemplateCompilerExecutionSession.createForForest(
        'compiler-execution-topology-rollback-boundary:family',
        forest,
      );
      const lane = execution.admitRootInvocation('compiler-execution-topology-rollback-boundary:lane');
      const bootstrap = execution.bootstrapContext(lane);
      const localCarrier = forest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
        node instanceof TemplateCompilerElementOccurrence
        && node.tagName === 'template'
        && node !== forest.compilerCarrier
      ) ?? null;
      if (localCarrier == null) throw new Error('Expected rollback-boundary local carrier.');
      const attempt = execution.beginOperation({
        operationKey: 'topology-rollback:extract',
        context: bootstrap,
        operationKind: TemplateCompilerOperationKind.LocalTemplateExtraction,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: execution.occurrenceTarget(bootstrap, localCarrier),
        causeHandles: [browser.run.handles.product('topology-rollback:definition')],
      });
      execution.detachNode(attempt, localCarrier);

      expect(() => execution.completeOperation(attempt, new TemplateCompilerOperationCompletion(
        TemplateCompilerOperationCompletionKind.Open,
        [browser.run.handles.openSeam('topology-rollback:open')],
      ))).toThrow(/cannot discard generated or topological output until forest rollback exists/);
      expect(execution.readPendingAttempt()).toBe(attempt);
      expect(localCarrier.parentEdgeKind).toBe(TemplateCompilerOccurrenceEdgeKind.Detached);
    } finally {
      browser.dispose();
    }
  });

  test('admits an extracted local carrier as a second pre-plan invocation in the same forest', () => {
    const browser = new BrowserEffectiveTemplateFixture('compiler-execution-local-bootstrap');

    try {
      const input = browser.materialize(
        'root',
        '<template as-custom-element="local-card"><span>local</span></template><div>owner</div>',
      );
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
      const execution = TemplateCompilerExecutionSession.createForForest(
        'compiler-execution-local-bootstrap:family',
        forest,
      );
      const rootLane = execution.admitRootInvocation('compiler-execution-local-bootstrap:root');
      const rootBootstrap = execution.bootstrapContext(rootLane);
      const localCarrier = forest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
        node instanceof TemplateCompilerElementOccurrence
        && node.tagName === 'template'
        && node !== forest.compilerCarrier
      );
      const localContent = localCarrier?.templateContent ?? null;
      const localSpan = localContent?.readChildren().find((node): node is TemplateCompilerElementOccurrence =>
        node instanceof TemplateCompilerElementOccurrence && node.tagName === 'span'
      );
      if (localCarrier == null || localContent == null || localSpan == null) {
        throw new Error('Expected one local-template carrier and its content.');
      }
      const declarationAttribute = localCarrier.readAttributes().find((attribute) =>
        attribute.name === 'as-custom-element'
      ) ?? null;
      if (declarationAttribute == null) throw new Error('Expected local-template declaration attribute.');
      const declarationTarget = execution.occurrenceTarget(rootBootstrap, declarationAttribute);
      const declarationAttempt = execution.beginOperation({
        operationKey: 'local-bootstrap:remove-name',
        context: rootBootstrap,
        operationKind: TemplateCompilerOperationKind.LocalTemplateExtraction,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: declarationTarget,
        causeHandles: [browser.run.handles.product('local-bootstrap:definition')],
      });
      execution.detachAttribute(declarationAttempt, declarationAttribute);
      const declarationRemoval = execution.completeOperation(
        declarationAttempt,
        new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete),
      );
      const extractionTarget = execution.occurrenceTarget(rootBootstrap, localCarrier);
      const extractionAttempt = execution.beginOperation({
        operationKey: 'local-bootstrap:extract',
        context: rootBootstrap,
        operationKind: TemplateCompilerOperationKind.LocalTemplateExtraction,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: extractionTarget,
        causeHandles: [browser.run.handles.product('local-bootstrap:definition')],
      });
      execution.detachNode(extractionAttempt, localCarrier);
      const extraction = execution.completeOperation(
        extractionAttempt,
        new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete),
      );
      const localLane = execution.admitExtractedInvocation(
        'compiler-execution-local-bootstrap:local-card',
        localCarrier,
        localContent,
        extraction,
      );
      const localBootstrap = execution.bootstrapContext(localLane);

      expect(localCarrier.parent).toBeNull();
      expect(declarationAttribute.owner).toBeNull();
      expect(declarationRemoval.mutationBatch.topologyMutations).toEqual([
        expect.objectContaining({
          eventOrdinal: 0,
          attribute: declarationAttribute,
          previousOwner: localCarrier,
          previousOrdinal: 0,
        }),
      ]);
      expect(extraction.mutationBatch.topologyMutations).toEqual([
        expect.objectContaining({
          eventOrdinal: 0,
          node: localCarrier,
          previousParent: forest.compilerContent,
          previousEdgeKind: TemplateCompilerOccurrenceEdgeKind.Child,
          previousOrdinal: 0,
        }),
      ]);
      expect(declarationRemoval.mutationBatch.attributeDetachmentMutations).toHaveLength(1);
      expect(extraction.mutationBatch.attributeDetachmentMutations).toHaveLength(0);
      expect(extraction.mutationBatch.nodeDetachmentMutations).toHaveLength(1);
      expect(localLane.compilerCarrier).toBe(localCarrier);
      expect(localLane.compilerContent).toBe(localContent);
      expect(execution.occurrenceTarget(localBootstrap, localSpan).occurrence).toBe(localSpan);
      expect(() => execution.occurrenceTarget(rootBootstrap, localSpan)).toThrow(/does not belong to bootstrap context/);
      expect(execution.sequence.readLanes()).toEqual([rootLane, localLane]);
      expect(execution.sequence.readBootstrapContexts()).toEqual([rootBootstrap, localBootstrap]);
      expect(execution.invocationPhase(rootLane)).toBe(TemplateCompilerInvocationPhase.LocalTemplateExtraction);
      expect(execution.invocationPhase(localLane)).toBe(TemplateCompilerInvocationPhase.CompilerHooks);
    } finally {
      browser.dispose();
    }
  });

  test('binds one global operation order to exact structural target-plan lanes', () => {
    const fixture = new ExecutionFamilyFixture('compiler-execution-order');

    try {
      const local = fixture.addRootLane('local-template');
      const normalizedGeneration = fixture.structural.readContextStructure(local.plan.root)
        ?.compilerCarrier.generation ?? null;
      if (normalizedGeneration == null) throw new Error('Expected normalized replay generation authority.');
      expect(fixture.execution.mutationAuthority.completedBatchForGeneration(normalizedGeneration)?.batchKind)
        .toBe(TemplateCompilerCompletedMutationBatchKind.NormalizedReplay);
      const causes = [fixture.product('cause:syntax'), fixture.product('cause:resource')];
      const produced = [fixture.product('produced:instruction')];
      const rootOperation = fixture.recordOperation({
        operationKey: 'root:projection-extraction',
        context: fixture.rootContext,
        operationKind: TemplateCompilerOperationKind.ProjectionExtraction,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: fixture.resourceTarget('resource:x-card'),
        completion: fixture.completion(TemplateCompilerOperationCompletionKind.Complete),
        causeHandles: causes,
        producedProductHandles: produced,
        sourceAddressHandle: fixture.address('source:root'),
      });
      const localOperation = fixture.recordOperation({
        operationKey: 'local:hydration-target',
        context: local.context,
        operationKind: TemplateCompilerOperationKind.HydrationTargetCreation,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: fixture.instructionTarget('instruction:local'),
        completion: fixture.completion(TemplateCompilerOperationCompletionKind.Complete),
        causeHandles: [fixture.product('cause:local')],
      });
      const rootTail = fixture.recordOperation({
        operationKey: 'root:hydration-target',
        context: fixture.rootContext,
        operationKind: TemplateCompilerOperationKind.HydrationTargetCreation,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: fixture.instructionTarget('instruction:root-tail'),
        completion: fixture.completion(TemplateCompilerOperationCompletionKind.Complete),
        causeHandles: [fixture.product('cause:root-tail')],
      });

      causes.reverse();
      produced.push(fixture.product('produced:caller-only'));
      expect(fixture.execution.sequence.readOperations()).toEqual([rootOperation, localOperation, rootTail]);
      expect(fixture.execution.sequence.readOperations().map((operation) => operation.executionOrdinal)).toEqual([0, 1, 2]);
      expect(fixture.execution.sequence.readLaneOperations(fixture.rootLane)).toEqual([rootOperation, rootTail]);
      expect(fixture.execution.sequence.readContextOperations(local.context)).toEqual([localOperation]);
      expect(rootOperation.causeHandles).toEqual([
        fixture.product('cause:syntax'),
        fixture.product('cause:resource'),
      ]);
      expect(rootOperation.producedProductHandles).toEqual([fixture.product('produced:instruction')]);

      const foreign = new ExecutionFamilyFixture('compiler-execution-order-foreign');
      try {
        expect(() => fixture.execution.admitTargetPlan(foreign.rootPlan)).toThrow(/another structural family/);
        expect(() => fixture.execution.sequence.readLaneOperations(foreign.rootLane)).toThrow(/another family sequence/);
        expect(() => fixture.execution.sequence.readContextOperations(foreign.rootContext)).toThrow(/another family sequence/);
      } finally {
        foreign.dispose();
      }

      fixture.assertCoherentAndSeal();
      expect(fixture.execution.isSealed).toBe(true);
      expect(() => fixture.execution.admitTargetPlan(fixture.rootPlan)).toThrow(/sealed/);
    } finally {
      fixture.dispose();
    }
  });

  test('issues occurrence targets only from the same forest and exact live or consumed context', () => {
    const fixture = new ExecutionFamilyFixture('compiler-execution-occurrence');

    try {
      const local = fixture.addRootLane('local-template');
      const div = fixture.requiredElement('div');
      const title = fixture.requiredAttribute('title');
      const target = fixture.execution.occurrenceTarget(fixture.rootContext, div);

      expect(target.occurrence).toBe(div);
      expect(target.context).toBe(fixture.rootContext);
      expect(() => fixture.execution.occurrenceTarget(local.context, div)).toThrow(/does not belong/);
      expect(() => fixture.execution.occurrenceTarget(
        fixture.rootContext,
        new TemplateCompilerTextOccurrence(
          'alien:text',
          null,
          null,
          null,
          TemplateCompilerOccurrenceEdgeKind.Detached,
          'alien',
        ),
      )).toThrow(/another forest/);

      const sourceParent = div.parent;
      const sourceOrdinal = div.readParentOrdinal();
      const localContent = fixture.structural.readContextStructure(local.plan.root)?.compilerContent;
      if (sourceParent == null || sourceOrdinal == null || localContent == null) {
        throw new Error('Expected exact source and destination structure for the move falsifier.');
      }
      const movingAttempt = fixture.execution.beginOperation({
        operationKey: 'root:move-across-contexts',
        context: fixture.rootContext,
        operationKind: TemplateCompilerOperationKind.ProjectionExtraction,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target,
        causeHandles: [fixture.product('cause:move-across-contexts')],
      });
      fixture.forest.moveNode(
        div,
        localContent,
        TemplateCompilerOccurrenceEdgeKind.Child,
        0,
      );
      expect(fixture.structural.contextForOccurrence(div)).toBe(local.plan.root);
      const movedOperation = fixture.execution.completeOperation(
        movingAttempt,
        fixture.completion(TemplateCompilerOperationCompletionKind.Complete),
      );
      expect(movedOperation.target).toBe(target);
      fixture.forest.moveNode(
        div,
        sourceParent,
        TemplateCompilerOccurrenceEdgeKind.Child,
        sourceOrdinal,
      );

      fixture.structural.consumeAttributeForContext(
        title,
        fixture.rootPlan.root,
        [fixture.product('cause:consume-title')],
      );
      const consumedTarget = fixture.execution.occurrenceTarget(fixture.rootContext, title);
      const operation = fixture.recordOperation({
        operationKey: 'root:title-disposition',
        context: fixture.rootContext,
        operationKind: TemplateCompilerOperationKind.AttributeDisposition,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: consumedTarget,
        completion: fixture.completion(TemplateCompilerOperationCompletionKind.Complete),
        causeHandles: [fixture.product('cause:consume-title')],
      });
      expect(operation.target).toBe(consumedTarget);

      const foreign = new ExecutionFamilyFixture('compiler-execution-occurrence-foreign');
      try {
        const foreignTarget = foreign.execution.occurrenceTarget(
          foreign.rootContext,
          foreign.requiredElement('div'),
        );
        expect(() => fixture.recordOperation({
          operationKey: 'foreign-occurrence-target',
          context: fixture.rootContext,
          operationKind: TemplateCompilerOperationKind.ProjectionExtraction,
          executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
          target: foreignTarget,
          completion: fixture.completion(TemplateCompilerOperationCompletionKind.Complete),
          causeHandles: [fixture.product('cause:foreign-target')],
        })).toThrow(/another compiler family context/);
      } finally {
        foreign.dispose();
      }

      fixture.assertCoherentAndSeal();
    } finally {
      fixture.dispose();
    }
  });

  test('retains callable and acted-on structure together for hooks and processContent', () => {
    const fixture = new ExecutionFamilyFixture('compiler-execution-callable-effect');

    try {
      const div = fixture.requiredElement('div');
      const callable = fixture.callable('callable:process-content');
      const effectTarget = fixture.execution.callableEffectTarget(
        fixture.rootContext,
        callable,
        div,
      );
      const bareTarget = fixture.execution.occurrenceTarget(fixture.rootContext, div);

      expect(() => fixture.recordOperation({
        operationKey: 'process-content:bare-target',
        context: fixture.rootContext,
        operationKind: TemplateCompilerOperationKind.ProcessContent,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.StaticCallable,
        target: bareTarget,
        completion: fixture.completion(TemplateCompilerOperationCompletionKind.Complete),
        causeHandles: [fixture.product('cause:bare-process-content')],
      })).toThrow(/requires a callable-effect target/);
      expect(() => fixture.recordOperation({
        operationKey: 'projection:callable-target',
        context: fixture.rootContext,
        operationKind: TemplateCompilerOperationKind.ProjectionExtraction,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: effectTarget,
        completion: fixture.completion(TemplateCompilerOperationCompletionKind.Complete),
        causeHandles: [fixture.product('cause:callable-projection')],
      })).toThrow(/cannot use a callable-effect target/);

      const hookSet = compilerHookSet(fixture.browser, 'callable-effect:hook-set');
      const hookCallable = fixture.callable('callable:hook');
      const hookTarget = fixture.execution.compilerHookTarget(
        fixture.execution.bootstrapContext(fixture.rootLane),
        hookSet,
        TemplateCompilerHookOperationStage.Invocation,
        0,
        hookCallable,
      );
      fixture.recordOperation({
        operationKey: 'compiler-hook:complete',
        context: fixture.execution.bootstrapContext(fixture.rootLane),
        operationKind: TemplateCompilerOperationKind.CompilerHook,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.AuthorizedHost,
        target: hookTarget,
        completion: fixture.completion(TemplateCompilerOperationCompletionKind.Complete),
        causeHandles: [hookSet.productHandle],
      });
      const processContent = fixture.recordOperation({
        operationKey: 'process-content:declined',
        context: fixture.rootContext,
        operationKind: TemplateCompilerOperationKind.ProcessContent,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.StaticCallable,
        target: effectTarget,
        completion: fixture.completion(TemplateCompilerOperationCompletionKind.Declined),
        causeHandles: [fixture.product('cause:process-content')],
      });
      expect(fixture.execution.invocationPhase(fixture.rootLane))
        .toBe(TemplateCompilerInvocationPhase.TargetExecution);
      expect(() => fixture.recordOperation({
        operationKey: 'compiler-hook:too-late',
        context: fixture.execution.bootstrapContext(fixture.rootLane),
        operationKind: TemplateCompilerOperationKind.CompilerHook,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.AuthorizedHost,
        target: hookTarget,
        completion: fixture.completion(TemplateCompilerOperationCompletionKind.Complete),
        causeHandles: [fixture.product('cause:late-hook')],
      })).toThrow(/cannot run after lane.*target-execution/);

      expect(processContent.target).toBeInstanceOf(TemplateCompilerCallableEffectOperationTarget);
      expect((processContent.target as TemplateCompilerCallableEffectOperationTarget).callable).toBe(callable);
      expect((processContent.target as TemplateCompilerCallableEffectOperationTarget).actedOn.occurrence).toBe(div);
      expect(hookTarget.actedOn.occurrence).toBe(fixture.forest.compilerCarrier);
      expect(hookTarget.callable).toBe(hookCallable);
      fixture.assertCoherentAndSeal();
    } finally {
      fixture.dispose();
    }
  });

  test('terminates only the exact lane after open, refused, or abrupt completion', () => {
    const terminals = [
      {
        key: 'open',
        mechanism: TemplateCompilerOperationExecutionMechanism.StaticCallable,
        completion: (fixture: ExecutionFamilyFixture) => fixture.completion(
          TemplateCompilerOperationCompletionKind.Open,
          [fixture.openSeam('seam:attempted-static-call')],
        ),
      },
      {
        key: 'refused',
        mechanism: TemplateCompilerOperationExecutionMechanism.NotAttempted,
        completion: (fixture: ExecutionFamilyFixture) => fixture.completion(
          TemplateCompilerOperationCompletionKind.Refused,
          [],
          'Build policy refused callable execution.',
        ),
      },
      {
        key: 'abrupt',
        mechanism: TemplateCompilerOperationExecutionMechanism.AuthorizedHost,
        completion: (fixture: ExecutionFamilyFixture) => fixture.completion(
          TemplateCompilerOperationCompletionKind.Abrupt,
          [],
          'Callable threw during compiler execution.',
        ),
      },
    ] as const;

    for (const terminal of terminals) {
      const fixture = new ExecutionFamilyFixture(`compiler-execution-terminal-${terminal.key}`);
      try {
        const surviving = fixture.addRootLane('surviving-root');
        const effect = fixture.execution.callableEffectTarget(
          fixture.rootContext,
          fixture.callable(`callable:${terminal.key}`),
          fixture.requiredElement('div'),
        );
        const terminalOperation = fixture.recordOperation({
          operationKey: `root:${terminal.key}`,
          context: fixture.rootContext,
          operationKind: TemplateCompilerOperationKind.ProcessContent,
          executionMechanism: terminal.mechanism,
          target: effect,
          completion: terminal.completion(fixture),
          causeHandles: [fixture.product(`cause:${terminal.key}`)],
        });

        expect(() => fixture.recordOperation({
          operationKey: `root:after-${terminal.key}`,
          context: fixture.rootContext,
          operationKind: TemplateCompilerOperationKind.HydrationTargetCreation,
          executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
          target: fixture.instructionTarget(`instruction:after-${terminal.key}`),
          completion: fixture.completion(TemplateCompilerOperationCompletionKind.Complete),
          causeHandles: [fixture.product(`cause:after-${terminal.key}`)],
        })).toThrow(new RegExp(`ended with '${terminal.key}'`));

        const survivingOperation = fixture.recordOperation({
          operationKey: `surviving:${terminal.key}`,
          context: surviving.context,
          operationKind: TemplateCompilerOperationKind.HydrationTargetCreation,
          executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
          target: fixture.instructionTarget(`instruction:surviving-${terminal.key}`),
          completion: fixture.completion(TemplateCompilerOperationCompletionKind.Complete),
          causeHandles: [fixture.product(`cause:surviving-${terminal.key}`)],
        });
        expect(survivingOperation.executionOrdinal).toBe(1);
        expect(fixture.execution.sequence.readLaneOperations(fixture.rootLane)).toEqual([terminalOperation]);
        expect(fixture.execution.sequence.readLaneOperations(surviving.lane)).toEqual([survivingOperation]);
        fixture.assertCoherentAndSeal();
      } finally {
        fixture.dispose();
      }
    }
  });

  test('keeps execution-attempt mechanism distinct from completion and appends atomically', () => {
    const fixture = new ExecutionFamilyFixture('compiler-execution-mechanism');

    try {
      const surviving = fixture.addRootLane('surviving-root');
      const target = fixture.instructionTarget('instruction:mechanism');
      const notAttempted = fixture.execution.beginOperation({
        operationKey: 'not-attempted-complete',
        context: fixture.rootContext,
        operationKind: TemplateCompilerOperationKind.HydrationTargetCreation,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.NotAttempted,
        target,
        causeHandles: [fixture.product('cause:not-attempted-complete')],
      });
      expect(fixture.execution.readPendingAttempt()).toBe(notAttempted);
      expect(() => fixture.execution.completeOperation(
        notAttempted,
        fixture.completion(TemplateCompilerOperationCompletionKind.Complete),
      )).toThrow(/incoherent execution mechanism/);
      expect(fixture.execution.readPendingAttempt()).toBe(notAttempted);
      expect(fixture.execution.sequence.readOperations()).toEqual([]);
      expect(() => fixture.execution.beginOperation({
        operationKey: 'interleaved-attempt',
        context: surviving.context,
        operationKind: TemplateCompilerOperationKind.HydrationTargetCreation,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target,
        causeHandles: [fixture.product('cause:interleaved')],
      })).toThrow(/while compiler operation.*pending/);
      expect(() => fixture.execution.seal()).toThrow(/while compiler operation.*pending/);
      expect(() => fixture.execution.admitTargetPlan(fixture.rootPlan)).toThrow(/while compiler operation.*pending/);
      expect(() => fixture.execution.admitContext(
        surviving.lane,
        surviving.plan.root,
      )).toThrow(/while compiler operation.*pending/);
      const refused = fixture.execution.completeOperation(
        notAttempted,
        fixture.completion(
          TemplateCompilerOperationCompletionKind.Refused,
          [],
          'No execution mechanism was admitted.',
        ),
      );
      expect(fixture.execution.readPendingAttempt()).toBeNull();

      const produced = fixture.product('produced:shared');
      const builtIn = fixture.execution.beginOperation({
        operationKey: 'built-in-refused',
        context: surviving.context,
        operationKind: TemplateCompilerOperationKind.HydrationTargetCreation,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target,
        causeHandles: [fixture.product('cause:built-in-refused')],
        producedProductHandles: [produced],
      });
      expect(() => fixture.execution.completeOperation(
        builtIn,
        fixture.completion(
          TemplateCompilerOperationCompletionKind.Refused,
          [],
          'Built-in execution cannot be policy-refused.',
        ),
      )).toThrow(/incoherent execution mechanism/);
      const first = fixture.execution.completeOperation(
        builtIn,
        fixture.completion(TemplateCompilerOperationCompletionKind.Complete),
      );
      expect(() => fixture.completion(
        TemplateCompilerOperationCompletionKind.Open,
        [fixture.openSeam('seam:detail')],
        'Duplicated explanation.',
      )).toThrow(/explanation from open seams/);

      expect(() => fixture.execution.beginOperation({
        operationKey: 'duplicate-producer',
        context: surviving.context,
        operationKind: TemplateCompilerOperationKind.HydrationTargetCreation,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        target: fixture.instructionTarget('instruction:duplicate'),
        causeHandles: [fixture.product('cause:duplicate')],
        producedProductHandles: [produced],
      })).toThrow(/produced by both/);
      expect(fixture.execution.readPendingAttempt()).toBeNull();
      expect(fixture.execution.sequence.readOperations()).toEqual([refused, first]);
      expect(() => TemplateCompilerExecutionSession.create('duplicate-session', fixture.structural)).toThrow(/already owns/);
      fixture.assertCoherentAndSeal();
    } finally {
      fixture.dispose();
    }
  });
});

function closeExactNoLocalBootstrap(
  browser: BrowserEffectiveTemplateFixture,
  execution: TemplateCompilerExecutionSession,
  lane: ReturnType<TemplateCompilerExecutionSession['admitRootInvocation']>,
  localKey: string,
) {
  const driver = execution.beginHookBootstrapDriver(lane);
  const context = execution.bootstrapContext(lane);
  const hooks = compilerHookSet(browser, `${localKey}:hooks`);
  let operation: TemplateCompilerOperation | null = null;
  try {
    operation = execution.completeOperation(execution.beginOperation({
      operationKey: `${localKey}:hooks:resolve`,
      context,
      operationKind: TemplateCompilerOperationKind.CompilerHook,
      executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
      target: execution.compilerHookTarget(
        context,
        hooks,
        TemplateCompilerHookOperationStage.HookSetResolution,
        null,
      ),
      causeHandles: [hooks.productHandle],
      bootstrapDriver: driver,
    }), new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete));
  } finally {
    execution.finishBootstrapDriver(driver);
  }
  const hook = new TemplateCompilerHookBootstrapResult(
    lane,
    TemplateCompilerHookBootstrapState.Exact,
    [operation!],
    null,
    null,
  );
  const local = new TemplateCompilerLocalExtractionResult(
    lane,
    TemplateCompilerLocalExtractionState.NoLocalTemplates,
    execution.forest.mutationRevision,
    [],
    [],
    null,
    null,
  );
  return execution.closeInvocationBootstrap(hook, local);
}

function compilerHookSet(
  browser: BrowserEffectiveTemplateFixture,
  localKey: string,
  entryCount = 1,
): TemplateCompilerHookSet {
  const entries = Array.from({ length: entryCount }, (_, ordinal) => new TemplateCompilerHookEntry(
    TemplateCompilerHookLane.Leaf,
    ordinal,
    ordinal,
    TemplateCompilerHookKind.Registered,
    new TemplateCompilerHookEntryCause(
      TemplateCompilerHookEntryCauseKind.ResolverSlot,
      browser.run.handles.product(`${localKey}:slot:${ordinal}`),
      browser.run.handles.identity(`${localKey}:resolver:${ordinal}`),
      browser.run.handles.address(`${localKey}:slot:${ordinal}`),
    ),
    new TemplateCompilerHookProviderAuthority(TemplateCompilerHookProviderResolutionKind.Value),
    new TemplateCompilerHookCallableAuthority(
      TemplateCompilerHookCallableAuthorityKind.StaticCallable,
      browser.run.handles.identity(`${localKey}:callable:${ordinal}`),
      browser.run.handles.address(`${localKey}:callable:${ordinal}`),
      `${localKey}:callable:${ordinal}`,
    ),
  ));
  return new TemplateCompilerHookSet(
    browser.run.handles.product(localKey),
    browser.run.handles.identity(localKey),
    TemplateCompilerHookMembershipState.ExactList,
    entries,
    [],
    browser.run.handles.address(localKey),
  );
}

function createRootTargetPlan(
  browser: BrowserEffectiveTemplateFixture,
  localKey: string,
): TemplateCompilerTargetPlan {
  return new TemplateCompilerTargetPlan(
    localKey,
    new TemplateCompilationContextReference(
      browser.run.handles.product(`${localKey}:root-context`),
      browser.run.handles.identity(`${localKey}:root-context`),
      TemplateCompilationContextKind.Root,
      null,
    ),
    new CompiledTemplateReference(
      browser.run.handles.product(`${localKey}:compiled-template`),
      browser.run.handles.identity(`${localKey}:compiled-template`),
    ),
  );
}

function recordReachableCompilerInputs(
  targetPlan: TemplateCompilerTargetPlan,
  forest: TemplateCompilerOccurrenceForest,
): void {
  const visit = (node: ReturnType<TemplateCompilerOccurrenceForest['readNodes']>[number]): void => {
    if (node instanceof TemplateCompilerElementOccurrence || node instanceof TemplateCompilerTextOccurrence) {
      const productHandle = forest.exactAuthoredNodeOrigin(node)?.authored.productHandle;
      if (productHandle != null) targetPlan.root.recordCompilerReachableNode(productHandle);
    }
    for (const child of node.readChildren()) visit(child);
  };
  for (const child of forest.compilerContent.readChildren()) visit(child);
}

class ExecutionFamilyFixture {
  readonly browser: BrowserEffectiveTemplateFixture;
  readonly forest: TemplateCompilerOccurrenceForest;
  readonly rootPlan: TemplateCompilerTargetPlan;
  readonly structural: TemplateCompilerStructuralExecutionSession;
  readonly execution: TemplateCompilerExecutionSession;
  readonly rootLane: ReturnType<TemplateCompilerExecutionSession['admitTargetPlan']>;
  readonly rootContext: ReturnType<TemplateCompilerExecutionSession['admitContext']>;

  constructor(readonly localKey: string) {
    this.browser = new BrowserEffectiveTemplateFixture(localKey);
    const input = this.browser.materialize(
      'root',
      '<div title="hello"><span>content</span></div>',
    );
    this.forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
    this.rootPlan = this.createTargetPlan('root');
    recordReachableCompilerInputs(this.rootPlan, this.forest);
    this.structural = TemplateCompilerStructuralExecutionSession.create(this.forest, this.rootPlan);
    this.rootPlan.seal();
    this.execution = TemplateCompilerExecutionSession.create(`${localKey}:family`, this.structural);
    this.rootLane = this.execution.admitTargetPlan(this.rootPlan);
    this.rootContext = this.execution.admitContext(this.rootLane, this.rootPlan.root);
  }

  product(localKey: string) {
    return this.browser.run.handles.product(localKey);
  }

  address(localKey: string) {
    return this.browser.run.handles.address(localKey);
  }

  openSeam(localKey: string) {
    return this.browser.run.handles.openSeam(localKey);
  }

  completion(
    completionKind: TemplateCompilerOperationCompletionKind,
    openSeamHandles = [] as ReturnType<ExecutionFamilyFixture['openSeam']>[],
    detail: string | null = null,
  ): TemplateCompilerOperationCompletion {
    return new TemplateCompilerOperationCompletion(completionKind, openSeamHandles, detail);
  }

  callable(localKey: string): TemplateCompilerCallableReference {
    return new TemplateCompilerCallableReference(
      this.product(localKey),
      this.browser.run.handles.identity(localKey),
      this.address(localKey),
    );
  }

  resourceTarget(localKey: string): TemplateCompilerResourceOperationTarget {
    return new TemplateCompilerResourceOperationTarget(
      this.product(localKey),
      this.browser.run.handles.identity(localKey),
    );
  }

  instructionTarget(localKey: string): TemplateCompilerInstructionOperationTarget {
    return new TemplateCompilerInstructionOperationTarget(
      this.product(localKey),
      this.browser.run.handles.identity(localKey),
    );
  }

  recordOperation(
    request: TemplateCompilerOperationAttemptRequest & {
      readonly completion: TemplateCompilerOperationCompletion;
    },
  ): TemplateCompilerOperation {
    const { completion, ...attemptRequest } = request;
    const attempt = this.execution.beginOperation(attemptRequest);
    return this.execution.completeOperation(attempt, completion);
  }

  requiredElement(tagName: string): TemplateCompilerElementOccurrence {
    const element = this.forest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
      node instanceof TemplateCompilerElementOccurrence && node.tagName === tagName
    );
    if (element == null) throw new Error(`Expected compiler occurrence <${tagName}>.`);
    return element;
  }

  requiredAttribute(name: string): TemplateCompilerAttributeOccurrence {
    const attribute = this.forest.readAttributes().find((candidate) => candidate.name === name);
    if (attribute == null) throw new Error(`Expected compiler occurrence attribute '${name}'.`);
    return attribute;
  }

  addRootLane(localKey: string) {
    const plan = this.createTargetPlan(localKey);
    plan.seal();
    this.structural.admitTargetPlan(plan);
    this.structural.createGeneratedContextStructure(plan.root);
    const lane = this.execution.admitTargetPlan(plan);
    const context = this.execution.admitContext(lane, plan.root);
    return { plan, lane, context };
  }

  assertCoherentAndSeal(): void {
    this.structural.assertCoherent();
    expect(this.execution.seal()).toBe(this.execution.sequence);
    this.execution.assertCoherent();
  }

  dispose(): void {
    this.browser.dispose();
  }

  private createTargetPlan(localKey: string): TemplateCompilerTargetPlan {
    return createRootTargetPlan(this.browser, `${this.localKey}:${localKey}:target-plan`);
  }
}
