import { describe, expect, test } from 'vitest';

import { TemplateCompilationContextKind, TemplateCompilationContextReference } from '../src/template/compilation-unit.js';
import { CompiledTemplateReference } from '../src/template/compiled-template.js';
import { TemplateCompilerTargetPlan } from '../src/template/compiler-target-plan.js';
import {
  TemplateCompilerCallableEffectOperationTarget,
  TemplateCompilerCallableReference,
  TemplateCompilerExecutionSession,
  TemplateCompilerInstructionOperationTarget,
  TemplateCompilerOperationCompletion,
  TemplateCompilerOperationCompletionKind,
  TemplateCompilerOperationExecutionMechanism,
  TemplateCompilerOperationKind,
  TemplateCompilerResourceOperationTarget,
  type TemplateCompilerOperation,
  type TemplateCompilerOperationAttemptRequest,
} from '../src/template/template-compiler-execution.js';
import {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerOccurrenceEdgeKind,
  TemplateCompilerOccurrenceForest,
  TemplateCompilerTextOccurrence,
} from '../src/template/template-compiler-occurrence.js';
import { TemplateCompilerStructuralExecutionSession } from '../src/template/template-compiler-structural-execution.js';
import { BrowserEffectiveTemplateFixture } from './browser-effective-template-fixture.js';

describe('template compiler execution sequence', () => {
  test('binds one global operation order to exact structural target-plan lanes', () => {
    const fixture = new ExecutionFamilyFixture('compiler-execution-order');

    try {
      const local = fixture.addRootLane('local-template');
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
        operationKind: TemplateCompilerOperationKind.LocalTemplateExtraction,
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
          operationKind: TemplateCompilerOperationKind.LocalTemplateExtraction,
          executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
          target: foreignTarget,
          completion: fixture.completion(TemplateCompilerOperationCompletionKind.Complete),
          causeHandles: [fixture.product('cause:foreign-target')],
        })).toThrow(/another structural family context/);
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

      const processContent = fixture.recordOperation({
        operationKey: 'process-content:declined',
        context: fixture.rootContext,
        operationKind: TemplateCompilerOperationKind.ProcessContent,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.StaticCallable,
        target: effectTarget,
        completion: fixture.completion(TemplateCompilerOperationCompletionKind.Declined),
        causeHandles: [fixture.product('cause:process-content')],
      });
      const hookTarget = fixture.execution.callableEffectTarget(
        fixture.rootContext,
        fixture.callable('callable:hook'),
        fixture.forest.compilerCarrier,
      );
      fixture.recordOperation({
        operationKey: 'compiler-hook:complete',
        context: fixture.rootContext,
        operationKind: TemplateCompilerOperationKind.CompilerHook,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.AuthorizedHost,
        target: hookTarget,
        completion: fixture.completion(TemplateCompilerOperationCompletionKind.Complete),
        causeHandles: [fixture.product('cause:hook')],
      });

      expect(processContent.target).toBeInstanceOf(TemplateCompilerCallableEffectOperationTarget);
      expect((processContent.target as TemplateCompilerCallableEffectOperationTarget).callable).toBe(callable);
      expect((processContent.target as TemplateCompilerCallableEffectOperationTarget).actedOn.occurrence).toBe(div);
      expect(hookTarget.actedOn.occurrence).toBe(fixture.forest.compilerCarrier);
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
    const visit = (node: ReturnType<TemplateCompilerOccurrenceForest['readNodes']>[number]): void => {
      if (node instanceof TemplateCompilerElementOccurrence || node instanceof TemplateCompilerTextOccurrence) {
        const productHandle = this.forest.exactAuthoredNodeOrigin(node)?.authored.productHandle;
        if (productHandle != null) this.rootPlan.root.recordCompilerReachableNode(productHandle);
      }
      for (const child of node.readChildren()) visit(child);
    };
    for (const child of this.forest.compilerContent.readChildren()) visit(child);
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
    const rootContext = new TemplateCompilationContextReference(
      this.product(`${localKey}:root-context`),
      this.browser.run.handles.identity(`${localKey}:root-context`),
      TemplateCompilationContextKind.Root,
      null,
    );
    const rootCompiledTemplate = new CompiledTemplateReference(
      this.product(`${localKey}:compiled-template`),
      this.browser.run.handles.identity(`${localKey}:compiled-template`),
    );
    return new TemplateCompilerTargetPlan(
      `${this.localKey}:${localKey}:target-plan`,
      rootContext,
      rootCompiledTemplate,
    );
  }
}
