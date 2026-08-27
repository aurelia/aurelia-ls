import { describe, expect, test } from 'vitest';

import { TemplateCompilerIssueKind } from '../src/template/compiler-issue.js';
import { TemplateCompilerFrameworkErrorCode } from '../src/template/framework-error-code.js';
import {
  executeTemplateCompilerLocalExtraction,
  type TemplateCompilerLocalDefinitionReservation,
  TemplateCompilerLocalExtractionState,
} from '../src/template/template-compiler-local-extraction.js';
import {
  type TemplateCompilerExecutionLaneReference,
  TemplateCompilerExecutionSession,
  TemplateCompilerInvocationPhase,
  TemplateCompilerOperationCompletion,
  TemplateCompilerOperationCompletionKind,
  TemplateCompilerOperationExecutionMechanism,
  TemplateCompilerOperationKind,
} from '../src/template/template-compiler-execution.js';
import {
  TemplateCompilerElementOccurrence,
  TemplateCompilerOccurrenceEdgeKind,
  TemplateCompilerOccurrenceForest,
} from '../src/template/template-compiler-occurrence.js';
import {
  TemplateCompilerHookBootstrapResult,
  TemplateCompilerHookBootstrapState,
} from '../src/template/template-compiler-hook-bootstrap.js';
import { BrowserEffectiveTemplateFixture } from './browser-effective-template-fixture.js';

describe('template compiler local extraction', () => {
  test('extracts siblings in snapshot order without crossing nested template content', () => {
    const fixture = new LocalExtractionFixture(
      'local-extraction-success',
      [
        '<template as-custom-element="first">',
        '  <bindable name="fooBar" data-extra></bindable>',
        '  <template><bindable name="nested"></bindable><span></span></template>',
        '</template>',
        '<div id="owner-content"></div>',
        '<template as-custom-element="second">',
        '  <bindable name="" attribute=""></bindable>',
        '</template>',
      ].join(''),
    );
    try {
      const result = fixture.execute();

      expect(result.state).toBe(TemplateCompilerLocalExtractionState.Extracted);
      expect(result.lane).toBe(fixture.lane);
      expect(result.forestMutationRevision).toBe(fixture.forest.mutationRevision);
      expect(result.failure).toBeNull();
      expect(result.handoff?.isFullSuccessReceipt()).toBe(true);
      expect(result.completedExtractions.map((entry) => entry.name)).toEqual(['first', 'second']);
      expect(result.completedExtractions.map((entry) => entry.invocationKey)).toEqual([
        `${fixture.lane.localKey}:local-template:first`,
        `${fixture.lane.localKey}:local-template:second`,
      ]);
      expect(result.completedExtractions.every((entry) => entry.invocationLane != null)).toBe(true);
      expect(fixture.execution.sequence.readLanes()).toHaveLength(3);
      expect(fixture.execution.invocationPhase(fixture.lane))
        .toBe(TemplateCompilerInvocationPhase.LocalTemplateExtraction);
      expect(result.operations).toHaveLength(6);
      expect(result.operations.every((operation) =>
        operation.completion.completionKind === TemplateCompilerOperationCompletionKind.Complete
      )).toBe(true);

      const closure = fixture.execution.closeInvocationBootstrap(fixture.hookBootstrap, result);
      expect(closure).toMatchObject({
        lane: fixture.lane,
        forestMutationRevision: result.forestMutationRevision,
        laneOperationCount: result.operations.length,
      });
      expect(closure.childLaneTransfers.map((transfer) => transfer.extraction.name))
        .toEqual(['first', 'second']);
      expect(closure.childLaneTransfers.map((transfer) => transfer.childLane))
        .toEqual(result.completedExtractions.map((entry) => entry.invocationLane));
      expect(fixture.execution.bootstrapClosure(fixture.lane)).toBe(closure);
      expect(fixture.execution.invocationPhase(fixture.lane))
        .toBe(TemplateCompilerInvocationPhase.BootstrapClosed);

      const first = result.completedExtractions[0]!;
      const second = result.completedExtractions[1]!;
      expect(() => fixture.execution.admitExtractedInvocation(
        `${fixture.lane.localKey}:duplicate-transfer`,
        first.carrier,
        first.content,
        first.carrierDetachmentOperation,
      )).toThrow(/already transferred/);
      expect(first.carrier.parentEdgeKind).toBe(TemplateCompilerOccurrenceEdgeKind.Detached);
      expect(first.declarationAttribute.owner).toBeNull();
      expect(first.bindables).toHaveLength(1);
      expect(first.bindables[0]).toMatchObject({
        propertyName: 'fooBar',
        explicitAttributeName: null,
        ignoredAttributes: [expect.objectContaining({ name: 'data-extra' })],
      });
      expect(first.bindables[0]?.element.parentEdgeKind).toBe(TemplateCompilerOccurrenceEdgeKind.Detached);
      const nestedTemplate = first.content.readChildren().find((node): node is TemplateCompilerElementOccurrence =>
        node instanceof TemplateCompilerElementOccurrence && node.tagName === 'template'
      );
      expect(nestedTemplate?.templateContent?.readChildren().some((node) =>
        node instanceof TemplateCompilerElementOccurrence && node.tagName === 'bindable'
      )).toBe(true);
      expect(second.bindables[0]).toMatchObject({
        propertyName: '',
        explicitAttributeName: '',
      });
      expect(liveRootElementTags(fixture.forest)).toEqual(['div']);
    } finally {
      fixture.dispose();
    }
  });

  test('returns no-local without entering extraction phase', () => {
    const fixture = new LocalExtractionFixture('local-extraction-none', '<div></div>');
    try {
      const result = fixture.execute();
      expect(result).toMatchObject({
        lane: fixture.lane,
        state: TemplateCompilerLocalExtractionState.NoLocalTemplates,
        forestMutationRevision: fixture.forest.mutationRevision,
        operations: [],
        completedExtractions: [],
        handoff: null,
        failure: null,
      });
      expect(fixture.execution.invocationPhase(fixture.lane))
        .toBe(TemplateCompilerInvocationPhase.CompilerHooks);
      const closure = fixture.execution.closeInvocationBootstrap(fixture.hookBootstrap, result);
      expect(closure.childLaneTransfers).toEqual([]);
      expect(closure.laneOperationCount).toBe(0);
      expect(fixture.execution.invocationPhase(fixture.lane))
        .toBe(TemplateCompilerInvocationPhase.BootstrapClosed);
      expect(() => fixture.execute()).toThrow(/does not start before target admission/);
    } finally {
      fixture.dispose();
    }
  });

  test('refuses to close a no-local result after its forest epoch changes', () => {
    const fixture = new LocalExtractionFixture(
      'local-extraction-stale-no-local',
      '<div title="before"></div>',
    );
    try {
      const result = fixture.execute();
      const title = fixture.forest.readAttributes().find((attribute) => attribute.name === 'title')!;
      fixture.forest.rewriteAttributeValue(title, 'after');

      expect(result.forestMutationRevision).not.toBe(fixture.forest.mutationRevision);
      expect(() => fixture.execution.closeInvocationBootstrap(fixture.hookBootstrap, result))
        .toThrow(/not current and exact/);
      expect(fixture.execution.invocationPhase(fixture.lane))
        .toBe(TemplateCompilerInvocationPhase.CompilerHooks);
    } finally {
      fixture.dispose();
    }
  });

  test('refuses a local compiler carrier before descendant discovery', () => {
    const fixture = new LocalExtractionFixture(
      'local-extraction-root-local',
      '<template as-custom-element="root-local"><template as-custom-element="nested"></template></template>',
    );
    try {
      const result = fixture.execute();
      expect(result.state).toBe(TemplateCompilerLocalExtractionState.Refused);
      expect(result.failure).toMatchObject({
        issueKind: TemplateCompilerIssueKind.RootTemplateCannotBeLocal,
        frameworkErrorCode: TemplateCompilerFrameworkErrorCode.CompilerRootIsLocal,
      });
      expect(result.operations).toHaveLength(1);
      expect(result.operations[0]?.completion.completionKind)
        .toBe(TemplateCompilerOperationCompletionKind.Refused);
      expect(() => fixture.execution.closeInvocationBootstrap(fixture.hookBootstrap, result))
        .toThrow(/ended with 'refused'/);
      expect(fixture.execution.seal()).toBe(fixture.execution.sequence);
    } finally {
      fixture.dispose();
    }
  });

  test('preserves JIT only-local precedence before direct-parent validation', () => {
    const fixture = new LocalExtractionFixture(
      'local-extraction-only-local-precedence',
      '<div><template as-custom-element="nested"></template></div>',
    );
    try {
      const result = fixture.execute();
      expect(result.failure).toMatchObject({
        issueKind: TemplateCompilerIssueKind.OnlyLocalTemplates,
        frameworkErrorCode: TemplateCompilerFrameworkErrorCode.CompilerTemplateOnlyLocalTemplate,
      });
      expect(result.completedExtractions).toEqual([]);
      expect(liveRootElementTags(fixture.forest)).toEqual(['div']);
    } finally {
      fixture.dispose();
    }
  });

  test('reaches not-under-root when another direct element defeats only-local precedence', () => {
    const fixture = new LocalExtractionFixture(
      'local-extraction-not-under-root',
      '<div><template as-custom-element="nested"></template></div><p></p>',
    );
    try {
      const result = fixture.execute();
      expect(result.failure).toMatchObject({
        issueKind: TemplateCompilerIssueKind.LocalTemplateNotUnderRoot,
        frameworkErrorCode: TemplateCompilerFrameworkErrorCode.CompilerLocalElementNotUnderRoot,
      });
      expect(result.operations).toHaveLength(1);
    } finally {
      fixture.dispose();
    }
  });

  test('validates direct ownership against browser foster parenting', () => {
    const fixture = new LocalExtractionFixture(
      'local-extraction-browser-foster',
      '<table><div><template as-custom-element="fostered"></template></div><tr><td></td></tr></table><p></p>',
    );
    try {
      const carrier = localCarriers(fixture.forest)[0]!;
      expect(carrier.parent).toBeInstanceOf(TemplateCompilerElementOccurrence);
      expect((carrier.parent as TemplateCompilerElementOccurrence).tagName).toBe('div');
      expect(carrier.parent?.parent).toBe(fixture.forest.compilerContent);

      const result = fixture.execute();
      expect(result.failure?.issueKind).toBe(TemplateCompilerIssueKind.LocalTemplateNotUnderRoot);
      expect(liveRootElementTags(fixture.forest)).toEqual(['div', 'table', 'p']);
    } finally {
      fixture.dispose();
    }
  });

  test('accepts a bindable foster-parented to direct local content by the browser', () => {
    const fixture = new LocalExtractionFixture(
      'local-extraction-fostered-bindable',
      [
        '<template as-custom-element="local">',
        '  <table><bindable name="value"></bindable><tr><td></td></tr></table>',
        '</template>',
        '<div></div>',
      ].join(''),
    );
    try {
      const carrier = localCarriers(fixture.forest)[0]!;
      const bindable = carrier.templateContent?.readChildren().find((node): node is TemplateCompilerElementOccurrence =>
        node instanceof TemplateCompilerElementOccurrence && node.tagName === 'bindable'
      );
      expect(bindable?.parent).toBe(carrier.templateContent);

      const result = fixture.execute();
      expect(result.state).toBe(TemplateCompilerLocalExtractionState.Extracted);
      expect(result.completedExtractions[0]?.bindables[0]?.propertyName).toBe('value');
      expect(result.completedExtractions[0]?.bindables[0]?.element).toBe(bindable);
    } finally {
      fixture.dispose();
    }
  });

  test('retains earlier extraction mutations but admits no child lane after a later duplicate', () => {
    const fixture = new LocalExtractionFixture(
      'local-extraction-late-duplicate',
      [
        '<template as-custom-element="same"><bindable name="value"></bindable></template>',
        '<template as-custom-element="same"></template>',
        '<div></div>',
      ].join(''),
    );
    try {
      const candidates = localCarriers(fixture.forest);
      const result = fixture.execute();

      expect(result.failure).toMatchObject({
        issueKind: TemplateCompilerIssueKind.LocalTemplateNameDuplicate,
        frameworkErrorCode: TemplateCompilerFrameworkErrorCode.CompilerDuplicateLocalName,
      });
      expect(result.completedExtractions).toHaveLength(1);
      expect(result.completedExtractions[0]?.invocationLane).toBeNull();
      expect(result.handoff).toBeNull();
      expect(fixture.execution.sequence.readLanes()).toEqual([fixture.lane]);
      expect(candidates[0]?.parentEdgeKind).toBe(TemplateCompilerOccurrenceEdgeKind.Detached);
      expect(candidates[0]?.readAttributes().some((attribute) => attribute.name === 'as-custom-element')).toBe(false);
      expect(candidates[1]?.parent).toBe(fixture.forest.compilerContent);
      expect(candidates[1]?.readAttributes().some((attribute) => attribute.name === 'as-custom-element')).toBe(true);
      expect(result.operations.at(-1)?.completion.completionKind)
        .toBe(TemplateCompilerOperationCompletionKind.Refused);
      expect(fixture.execution.seal()).toBe(fixture.execution.sequence);
    } finally {
      fixture.dispose();
    }
  });

  test('retains name and earlier bindable removals before a later bindable refusal', () => {
    const fixture = new LocalExtractionFixture(
      'local-extraction-late-bindable-refusal',
      [
        '<template as-custom-element="local">',
        '  <bindable name="first"></bindable>',
        '  <div><bindable name="nested"></bindable></div>',
        '</template>',
        '<p></p>',
      ].join(''),
    );
    try {
      const carrier = localCarriers(fixture.forest)[0]!;
      const bindables = carrier.templateContent == null
        ? []
        : carrier.templateContent.readChildren().flatMap((node) =>
            node instanceof TemplateCompilerElementOccurrence && node.tagName === 'bindable' ? [node] : []
          );
      const result = fixture.execute();

      expect(result.failure).toMatchObject({
        issueKind: TemplateCompilerIssueKind.LocalTemplateBindableNotUnderRoot,
        frameworkErrorCode: TemplateCompilerFrameworkErrorCode.CompilerLocalElementBindableNotUnderRoot,
      });
      expect(carrier.parent).toBe(fixture.forest.compilerContent);
      expect(carrier.readAttributes().some((attribute) => attribute.name === 'as-custom-element')).toBe(false);
      expect(bindables[0]?.parentEdgeKind).toBe(TemplateCompilerOccurrenceEdgeKind.Detached);
      expect(result.completedExtractions).toEqual([]);
      expect(result.operations.map((operation) => operation.completion.completionKind)).toEqual([
        TemplateCompilerOperationCompletionKind.Complete,
        TemplateCompilerOperationCompletionKind.Complete,
        TemplateCompilerOperationCompletionKind.Refused,
      ]);
    } finally {
      fixture.dispose();
    }
  });

  test('allows foreign-lane interleaving while keeping the subject driver receipt exact', () => {
    const fixture = new LocalExtractionFixture(
      'local-extraction-lane-local-receipt',
      [
        '<template as-custom-element="subject">',
        '  <template as-custom-element="nested"></template><div></div>',
        '</template>',
        '<template as-custom-element="sibling"><span></span></template>',
        '<div></div>',
      ].join(''),
    );
    try {
      const rootResult = fixture.execute();
      const rootClosure = fixture.execution.closeInvocationBootstrap(fixture.hookBootstrap, rootResult);
      const [subject, sibling] = rootResult.completedExtractions;
      const subjectLane = subject?.invocationLane ?? null;
      const siblingLane = sibling?.invocationLane ?? null;
      if (subjectLane == null || siblingLane == null) throw new Error('Expected two extracted child lanes.');
      const subjectHook = new TemplateCompilerHookBootstrapResult(
        subjectLane,
        TemplateCompilerHookBootstrapState.Exact,
        [],
        null,
        null,
      );
      const siblingContext = fixture.execution.bootstrapContext(siblingLane);
      const siblingTarget = sibling.content.readChildren()[0]!;

      const result = fixture.executeLane(subjectLane, subjectHook, () => {
        const attempt = fixture.execution.beginOperation({
          operationKey: `${siblingLane.localKey}:reentrant-unrelated`,
          context: siblingContext,
          operationKind: TemplateCompilerOperationKind.LocalTemplateExtraction,
          executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
          target: fixture.execution.occurrenceTarget(siblingContext, siblingTarget),
          causeHandles: [fixture.browser.run.handles.product('foreign-reentrant-cause')],
        });
        fixture.execution.completeOperation(
          attempt,
          new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete),
        );
      });

      expect(result.state).toBe(TemplateCompilerLocalExtractionState.Extracted);
      expect(result.operations).toHaveLength(2);
      expect(result.operations.every((operation) => operation.lane === subjectLane)).toBe(true);
      expect(fixture.execution.sequence.readLaneOperations(siblingLane)).toHaveLength(1);
      expect(result.forestMutationRevision).toBe(fixture.forest.mutationRevision);
      const subjectClosure = fixture.execution.closeInvocationBootstrap(subjectHook, result);
      expect(rootClosure.childLaneTransfers.map((transfer) => transfer.childLane))
        .toEqual([subjectLane, siblingLane]);
      expect(subjectClosure.lane).toBe(subjectLane);
    } finally {
      fixture.dispose();
    }
  });

  test('blocks a re-entrant same-lane operation before extraction mutates', () => {
    const fixture = new LocalExtractionFixture(
      'local-extraction-driver-owned-receipt',
      '<template as-custom-element="subject"></template><div></div>',
    );
    try {
      const context = fixture.execution.bootstrapContext(fixture.lane);
      const carrier = localCarriers(fixture.forest)[0]!;
      expect(() => fixture.execute(() => {
        const attempt = fixture.execution.beginOperation({
          operationKey: `${fixture.lane.localKey}:reentrant-unrelated`,
          context,
          operationKind: TemplateCompilerOperationKind.LocalTemplateExtraction,
          executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
          target: fixture.execution.occurrenceTarget(context, carrier),
          causeHandles: [fixture.browser.run.handles.product('same-lane-reentrant-cause')],
        });
        fixture.execution.completeOperation(
          attempt,
          new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete),
        );
      })).toThrow(/outside its active 'local-template-extraction' driver/);
      expect(fixture.execution.sequence.readLaneOperations(fixture.lane)).toEqual([]);
      expect(carrier.parent).toBe(fixture.forest.compilerContent);
      expect(carrier.readAttributes().some((attribute) => attribute.name === 'as-custom-element')).toBe(true);
    } finally {
      fixture.dispose();
    }
  });
});

class LocalExtractionFixture {
  readonly browser: BrowserEffectiveTemplateFixture;
  readonly forest: TemplateCompilerOccurrenceForest;
  readonly execution: TemplateCompilerExecutionSession;
  readonly lane;
  readonly hookBootstrap: TemplateCompilerHookBootstrapResult;
  private readonly reservations = new Map<string, TemplateCompilerLocalDefinitionReservation>();

  constructor(localKey: string, markup: string) {
    this.browser = new BrowserEffectiveTemplateFixture(localKey);
    this.forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(
      this.browser.materialize('root', markup).emission,
    );
    this.execution = TemplateCompilerExecutionSession.createForForest(`${localKey}:family`, this.forest);
    this.lane = this.execution.admitRootInvocation(`${localKey}:root`);
    this.hookBootstrap = new TemplateCompilerHookBootstrapResult(
      this.lane,
      TemplateCompilerHookBootstrapState.Exact,
      [],
      null,
      null,
    );
  }

  execute(onReserve?: (invocationKey: string) => void) {
    return this.executeLane(this.lane, this.hookBootstrap, onReserve);
  }

  executeLane(
    lane: TemplateCompilerExecutionLaneReference,
    hookBootstrap: TemplateCompilerHookBootstrapResult,
    onReserve?: (invocationKey: string) => void,
  ) {
    return executeTemplateCompilerLocalExtraction({
      execution: this.execution,
      lane,
      hookBootstrap,
      ownerName: 'owner-element',
      ownerCauseHandles: [this.browser.run.handles.product('owner-definition')],
      reserveDefinition: (invocationKey) => {
        onReserve?.(invocationKey);
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

  dispose(): void {
    this.browser.dispose();
  }
}

function localCarriers(forest: TemplateCompilerOccurrenceForest): readonly TemplateCompilerElementOccurrence[] {
  return forest.readNodes().filter((node): node is TemplateCompilerElementOccurrence =>
    node instanceof TemplateCompilerElementOccurrence
    && node.tagName === 'template'
    && node !== forest.compilerCarrier
    && node.readAttributes().some((attribute) => attribute.name === 'as-custom-element')
  );
}

function liveRootElementTags(forest: TemplateCompilerOccurrenceForest): readonly string[] {
  return forest.compilerContent.readChildren().flatMap((node) =>
    node instanceof TemplateCompilerElementOccurrence ? [node.tagName] : []
  );
}
