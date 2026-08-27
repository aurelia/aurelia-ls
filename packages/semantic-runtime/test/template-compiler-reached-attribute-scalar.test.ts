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
  type TemplateCompilerLocalDefinitionReservation,
  executeTemplateCompilerLocalExtraction,
} from '../src/template/template-compiler-local-extraction.js';
import {
  TemplateCompilerCallableReference,
  type TemplateCompilerExecutionLaneReference,
  TemplateCompilerExecutionSession,
  TemplateCompilerHookOperationStage,
  TemplateCompilerOperationCompletion,
  TemplateCompilerOperationCompletionKind,
  TemplateCompilerOperationExecutionMechanism,
  TemplateCompilerOperationKind,
  TemplateCompilerReachedAttributeScalarState,
} from '../src/template/template-compiler-execution.js';
import {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerOccurrenceForest,
  TemplateCompilerTextOccurrence,
} from '../src/template/template-compiler-occurrence.js';
import {
  TemplateCompilerHookBootstrapResult,
  TemplateCompilerHookBootstrapState,
} from '../src/template/template-compiler-hook-bootstrap.js';
import { BrowserEffectiveTemplateFixture } from './browser-effective-template-fixture.js';

describe('template compiler reached attribute scalar', () => {
  test('retains parent-hook and child-hook transitions in family-global order', () => {
    const fixture = new ReachedAttributeFixture(
      'reached-attribute-transitions',
      [
        '<template as-custom-element="child">',
        '  <div class="before"></div>',
        '</template>',
        '<main></main>',
      ].join(''),
    );
    try {
      const classAttribute = fixture.requiredAttribute('class');
      const rootHook = fixture.rewriteHook(fixture.rootLane, classAttribute, 'parent-mapped', 'parent');
      const rootExtraction = fixture.extract(fixture.rootLane, rootHook);
      const rootClosure = fixture.execution.closeInvocationBootstrap(rootHook, rootExtraction);
      const childLane = rootExtraction.completedExtractions[0]?.invocationLane ?? null;
      if (childLane == null) throw new Error('Expected one extracted child lane.');

      const childHook = fixture.rewriteHook(childLane, classAttribute, 'child-mapped', 'child');
      const childExtraction = fixture.extract(childLane, childHook);
      const childClosure = fixture.execution.closeInvocationBootstrap(childHook, childExtraction);
      const owner = classAttribute.owner;
      if (owner == null) throw new Error('Expected the class attribute to remain live in its child owner.');
      const receipt = fixture.execution.captureReachedAttributeScalar(
        childClosure,
        owner,
        classAttribute,
        0,
      );

      expect(rootClosure.childLaneTransfers.map((transfer) => transfer.childLane)).toEqual([childLane]);
      expect(receipt.isExact()).toBe(true);
      expect(receipt).toMatchObject({
        state: TemplateCompilerReachedAttributeScalarState.Exact,
        lane: childLane,
        bootstrapClosure: childClosure,
        owner,
        attribute: classAttribute,
        liveOrdinal: 0,
        qualifiedName: 'class',
        inputIdentityKey: classAttribute.inputIdentityKey,
        inputReference: classAttribute.inputReference,
        generation: null,
        initialValue: 'before',
        replayedValue: 'child-mapped',
        currentValue: 'child-mapped',
        forestMutationRevision: fixture.forest.mutationRevision,
        globalOperationCount: fixture.execution.sequence.readOperations().length,
      });
      expect(receipt.transitions.map((transition) => ({
        lane: transition.operation.lane,
        previousValue: transition.mutation.previousValue,
        nextValue: transition.mutation.nextValue,
      }))).toEqual([
        { lane: fixture.rootLane, previousValue: 'before', nextValue: 'parent-mapped' },
        { lane: childLane, previousValue: 'parent-mapped', nextValue: 'child-mapped' },
      ]);
    } finally {
      fixture.dispose();
    }
  });

  test('captures a qualified seeded input without scans and falsifies unledgered same-value writes', () => {
    const attributes = Array.from({ length: 256 }, (_, index) => `data-${index}="${index}"`).join(' ');
    const fixture = new ReachedAttributeFixture(
      'reached-attribute-cost',
      `<svg ${attributes} xlink:href="#probe"></svg>`,
    );
    try {
      const owner = fixture.requiredElement('svg');
      const attribute = owner.readAttributes().find((candidate) => candidate.prefix === 'xlink') ?? null;
      if (attribute == null) throw new Error('Expected one live xlink attribute.');
      const liveOrdinal = owner.readAttributes().length - 1;
      const hook = fixture.rewriteHook(fixture.rootLane, attribute, '#probe', 'authorized-no-op');
      const extraction = fixture.extract(fixture.rootLane, hook);
      const closure = fixture.execution.closeInvocationBootstrap(hook, extraction);
      expect(hook.operations[0]?.mutationBatch.attributeValueMutations).toEqual([]);
      const readOwnerAttributes = vi.spyOn(owner, 'readAttributes');
      const readOwnerOrdinal = vi.spyOn(attribute, 'readOwnerOrdinal');
      const readForestAttributes = vi.spyOn(fixture.forest, 'readAttributes');
      const readFamilyOperations = vi.spyOn(fixture.execution.sequence, 'readOperations');

      const receipt = fixture.execution.captureReachedAttributeScalar(
        closure,
        owner,
        attribute,
        liveOrdinal,
      );

      expect(receipt).toMatchObject({
        state: TemplateCompilerReachedAttributeScalarState.Exact,
        qualifiedName: 'xlink:href',
        namespaceUri: 'http://www.w3.org/1999/xlink',
        prefix: 'xlink',
        inputIdentityKey: attribute.inputIdentityKey,
        inputReference: attribute.inputReference,
        generation: null,
        initialValue: '#probe',
        replayedValue: '#probe',
        currentValue: '#probe',
        scalarWriteRevision: 0,
        transitions: [],
        globalOperationCount: 1,
      });
      expect(readOwnerAttributes).toHaveBeenCalledTimes(1);
      expect(readOwnerOrdinal).not.toHaveBeenCalled();
      expect(readForestAttributes).not.toHaveBeenCalled();
      expect(readFamilyOperations).not.toHaveBeenCalled();

      fixture.forest.rewriteAttributeValue(attribute, '#probe');
      const sameValueWrite = fixture.execution.captureReachedAttributeScalar(
        closure,
        owner,
        attribute,
        liveOrdinal,
      );
      expect(sameValueWrite).toMatchObject({
        state: TemplateCompilerReachedAttributeScalarState.UnledgeredScalarWriteRevision,
        initialValue: '#probe',
        replayedValue: '#probe',
        currentValue: '#probe',
        scalarWriteRevision: 1,
      });
      expect(sameValueWrite.isExact()).toBe(false);

      fixture.forest.rewriteAttributeValue(attribute, '#middle');
      fixture.forest.rewriteAttributeValue(attribute, '#probe');
      const roundTripWrites = fixture.execution.captureReachedAttributeScalar(
        closure,
        owner,
        attribute,
        liveOrdinal,
      );
      expect(roundTripWrites).toMatchObject({
        state: TemplateCompilerReachedAttributeScalarState.UnledgeredScalarWriteRevision,
        replayedValue: '#probe',
        currentValue: '#probe',
        scalarWriteRevision: 3,
      });
      const targetPlan = createRootTargetPlan(fixture.browser, fixture.rootLane.localKey);
      recordReachableCompilerInputs(targetPlan, fixture.forest);
      const structural = fixture.execution.createStructuralExecution(targetPlan);
      targetPlan.seal();
      fixture.execution.attachTargetPlan(fixture.rootLane, targetPlan);
      fixture.execution.admitContext(fixture.rootLane, targetPlan.root);
      structural.assertCoherent();
      expect(() => fixture.execution.assertCoherent()).toThrow(/unledgered scalar-write revision/);
    } finally {
      fixture.dispose();
    }
  });

  test('rejects capture immediately after target admission and audits the pre-target transition index', () => {
    const fixture = new ReachedAttributeFixture(
      'reached-attribute-stale-lane',
      '<div title="before"></div>',
    );
    try {
      const attribute = fixture.requiredAttribute('title');
      const owner = attribute.owner;
      if (owner == null) throw new Error('Expected one live title attribute.');
      const hook = fixture.rewriteHook(fixture.rootLane, attribute, 'hooked', 'pre-target');
      const extraction = fixture.extract(fixture.rootLane, hook);
      const closure = fixture.execution.closeInvocationBootstrap(hook, extraction);
      expect(fixture.execution.captureReachedAttributeScalar(closure, owner, attribute, 0).isExact()).toBe(true);
      const targetPlan = createRootTargetPlan(fixture.browser, fixture.rootLane.localKey);
      recordReachableCompilerInputs(targetPlan, fixture.forest);
      const structural = fixture.execution.createStructuralExecution(targetPlan);
      targetPlan.seal();
      fixture.execution.attachTargetPlan(fixture.rootLane, targetPlan);

      expect(() => fixture.execution.captureReachedAttributeScalar(closure, owner, attribute, 0))
        .toThrow(/cannot run after target admission/);
      fixture.execution.admitContext(fixture.rootLane, targetPlan.root);
      structural.assertCoherent();
      expect(() => fixture.execution.assertCoherent()).not.toThrow();
    } finally {
      fixture.dispose();
    }
  });
});

class ReachedAttributeFixture {
  readonly browser: BrowserEffectiveTemplateFixture;
  readonly forest: TemplateCompilerOccurrenceForest;
  readonly execution: TemplateCompilerExecutionSession;
  readonly rootLane: TemplateCompilerExecutionLaneReference;
  private readonly reservations = new Map<string, TemplateCompilerLocalDefinitionReservation>();

  constructor(localKey: string, markup: string) {
    this.browser = new BrowserEffectiveTemplateFixture(localKey);
    this.forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(
      this.browser.materialize('root', markup).emission,
    );
    this.execution = TemplateCompilerExecutionSession.createForForest(`${localKey}:family`, this.forest);
    this.rootLane = this.execution.admitRootInvocation(`${localKey}:root`);
  }

  extract(
    lane: TemplateCompilerExecutionLaneReference,
    hookBootstrap: TemplateCompilerHookBootstrapResult,
  ) {
    return executeTemplateCompilerLocalExtraction({
      execution: this.execution,
      lane,
      hookBootstrap,
      ownerName: 'owner-element',
      ownerCauseHandles: [this.browser.run.handles.product('owner-definition')],
      reserveDefinition: (invocationKey) => {
        let reservation = this.reservations.get(invocationKey);
        if (reservation == null) {
          reservation = {
            invocationKey,
            productHandle: this.browser.run.handles.product(`definition:${invocationKey}`),
            identityHandle: this.browser.run.handles.identity(`definition:${invocationKey}`),
          };
          this.reservations.set(invocationKey, reservation);
        }
        return reservation;
      },
    });
  }

  rewriteHook(
    lane: TemplateCompilerExecutionLaneReference,
    attribute: TemplateCompilerAttributeOccurrence,
    nextValue: string,
    localKey: string,
  ): TemplateCompilerHookBootstrapResult {
    const driver = this.execution.beginHookBootstrapDriver(lane);
    try {
      const context = this.execution.bootstrapContext(lane);
      const cause = new TemplateCompilerHookEntryCause(
        TemplateCompilerHookEntryCauseKind.ResolverSlot,
        this.browser.run.handles.product(`${localKey}:hook-provider`),
        this.browser.run.handles.identity(`${localKey}:hook-provider`),
        this.browser.run.handles.address(`${localKey}:hook-provider`),
      );
      const callableIdentityHandle = this.browser.run.handles.identity(`${localKey}:hook-callable`);
      const callableAddressHandle = this.browser.run.handles.address(`${localKey}:hook-callable`);
      const entry = new TemplateCompilerHookEntry(
        TemplateCompilerHookLane.Leaf,
        0,
        0,
        TemplateCompilerHookKind.Registered,
        cause,
        new TemplateCompilerHookProviderAuthority(TemplateCompilerHookProviderResolutionKind.Value),
        new TemplateCompilerHookCallableAuthority(
          TemplateCompilerHookCallableAuthorityKind.StaticCallable,
          callableIdentityHandle,
          callableAddressHandle,
          `${localKey}:hook-callable`,
        ),
      );
      const hookSet = new TemplateCompilerHookSet(
        this.browser.run.handles.product(`${localKey}:hook-set`),
        this.browser.run.handles.identity(`${localKey}:hook-set`),
        TemplateCompilerHookMembershipState.ExactList,
        [entry],
        [],
        this.browser.run.handles.address(`${localKey}:hook-set`),
      );
      const callable = new TemplateCompilerCallableReference(
        cause.productHandle,
        callableIdentityHandle,
        callableAddressHandle,
      );
      const attempt = this.execution.beginOperation({
        operationKey: `${lane.localKey}:hook:${localKey}`,
        context,
        operationKind: TemplateCompilerOperationKind.CompilerHook,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.StaticCallable,
        target: this.execution.compilerHookTarget(
          context,
          hookSet,
          TemplateCompilerHookOperationStage.Invocation,
          0,
          callable,
        ),
        causeHandles: [hookSet.productHandle, cause.productHandle!],
        bootstrapDriver: driver,
      });
      this.execution.rewriteAttributeValue(attempt, attribute, nextValue);
      const operation = this.execution.completeOperation(
        attempt,
        new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete),
      );
      return new TemplateCompilerHookBootstrapResult(
        lane,
        TemplateCompilerHookBootstrapState.Exact,
        [operation],
        null,
        null,
      );
    } finally {
      this.execution.finishBootstrapDriver(driver);
    }
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

  dispose(): void {
    this.browser.dispose();
  }
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
