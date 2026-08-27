import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import {
  TemplateCompilerReadView,
  TemplateCompilerWorldAuthority,
} from '../src/template/compiler-read-view.js';
import type { TemplateResourceCompilationEmission } from '../src/template/template-compilation-project-pass.js';
import {
  TemplateCompilerExecutionSession,
  TemplateCompilerInvocationPhase,
  TemplateCompilerOperationCompletionKind,
  TemplateCompilerOperationExecutionMechanism,
  TemplateCompilerOperationKind,
} from '../src/template/template-compiler-execution.js';
import { executeTemplateCompilerHookBootstrap } from '../src/template/template-compiler-hook-bootstrap.js';
import { executeTemplateCompilerLocalExtraction } from '../src/template/template-compiler-local-extraction.js';
import {
  TemplateCompilerElementOccurrence,
  TemplateCompilerOccurrenceEdgeKind,
  TemplateCompilerOccurrenceForest,
  type TemplateCompilerNodeOccurrence,
} from '../src/template/template-compiler-occurrence.js';
import {
  executeTemplateCompilerProcessContent,
  planTemplateCompilerProcessContent,
  TemplateCompilerProcessContentOpenReasonKind,
  TemplateCompilerProcessContentPlanState,
  type TemplateCompilerProcessContentSiteAuthority,
} from '../src/template/template-compiler-process-content.js';
import { runtimeElementLookupName } from '../src/template/runtime-dom-name.js';
import { BrowserEffectiveTemplateFixture } from './browser-effective-template-fixture.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('template compiler processContent', () => {
  let fixture: ProcessContentFixture;

  beforeAll(async () => {
    fixture = await ProcessContentFixture.create();
  }, 30_000);

  afterAll(() => {
    fixture.dispose();
  });

  test('plans absent, empty, and named AuSlot metadata without admitting a site driver', () => {
    const run = fixture.run(
      'projection-receiver',
      '<au-slot></au-slot><au-slot name=""></au-slot><au-slot name="heading"></au-slot>',
    );
    try {
      const hosts = run.elements('au-slot');
      const plans = hosts.map((host) => run.plan(host));

      expect(plans.map((plan) => ({
        state: plan.state,
        name: plan.metadata?.name,
        carrier: plan.nameCarrier?.value ?? null,
        scalarExact: plan.nameScalar?.isExact() ?? null,
        strictFalse: plan.strictFalse,
      }))).toEqual([
        {
          state: TemplateCompilerProcessContentPlanState.Exact,
          name: 'default',
          carrier: null,
          scalarExact: null,
          strictFalse: false,
        },
        {
          state: TemplateCompilerProcessContentPlanState.Exact,
          name: '',
          carrier: '',
          scalarExact: true,
          strictFalse: false,
        },
        {
          state: TemplateCompilerProcessContentPlanState.Exact,
          name: 'heading',
          carrier: 'heading',
          scalarExact: true,
          strictFalse: false,
        },
      ]);
      expect(run.execution.invocationPhase(run.closure.lane)).toBe(TemplateCompilerInvocationPhase.BootstrapClosed);
      expect(run.execution.siteExecutionContext(run.closure.lane)).toBeNull();
    } finally {
      run.dispose();
    }
  });

  test('executes one exact built-in operation and removes mixed direct children in forward live order', () => {
    const run = fixture.run(
      'projection-receiver',
      '<au-slot name="heading">lead<span au-slot="x"></span><em au-slot></em><b></b>tail</au-slot>',
    );
    try {
      const host = run.requiredElement('au-slot');
      const plan = run.plan(host);
      expect(plan.auSlot?.removedChildren.map(nodeLabel)).toEqual(['span', 'em']);

      const driver = run.execution.beginSiteExecutionDriver(plan.frontier);
      const result = executeTemplateCompilerProcessContent({ plan, driver });

      expect(result.isModuleConstructed()).toBe(true);
      expect(result.metadata.name).toBe('heading');
      expect(result.nameCarrier?.value).toBe('heading');
      expect(result.nameScalar).toBe(plan.nameScalar);
      expect(result.nameScalar?.currentValue).toBe('heading');
      expect(result.nameScalar?.isExact()).toBe(true);
      expect(result.strictFalse).toBe(false);
      expect(result.operation).toMatchObject({
        operationKind: TemplateCompilerOperationKind.ProcessContent,
        executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
        completion: { completionKind: TemplateCompilerOperationCompletionKind.Complete },
      });
      expect(result.removals.map((removal) => [nodeLabel(removal.occurrence), removal.liveOrdinal]))
        .toEqual([['span', 1], ['em', 1]]);
      expect(result.removedOccurrences.every((occurrence) =>
        occurrence.parent == null && occurrence.parentEdgeKind === TemplateCompilerOccurrenceEdgeKind.Detached
      )).toBe(true);
      expect(result.removedSiteOccurrences.length).toBeGreaterThan(0);
      expect(result.removedSiteOccurrences.every((occurrence) =>
        result.authorizesRemovedSiteOccurrence(occurrence)
      )).toBe(true);
      expect(host.readChildren().map(nodeLabel)).toEqual(['lead', 'b', 'tail']);
      expect(result.operation.mutationBatch.nodeDetachmentMutations.map((mutation) => mutation.previousOrdinal))
        .toEqual([1, 1]);

      run.execution.finishSiteExecutionDriver(driver);
    } finally {
      run.dispose();
    }
  });

  test('keeps a directly rewritten pre-bootstrap name scalar Open without admitting an operation', () => {
    const run = fixture.run(
      'projection-receiver',
      '<au-slot name="authored"></au-slot>',
      (forest) => {
        const host = forest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
          node instanceof TemplateCompilerElementOccurrence && node.tagName.toLowerCase() === 'au-slot'
        );
        const name = host?.readAttributes().find((attribute) => qualifiedName(attribute) === 'name') ?? null;
        if (name == null) throw new Error('Expected pre-bootstrap AuSlot name carrier.');
        forest.rewriteAttributeValue(name, 'direct-rewrite');
      },
    );
    try {
      const plan = run.plan(run.requiredElement('au-slot'));

      expect(plan).toMatchObject({
        state: TemplateCompilerProcessContentPlanState.Open,
        planningDriver: null,
        openReason: { reasonKind: TemplateCompilerProcessContentOpenReasonKind.InputScalarOpen },
        nameCarrier: { value: 'direct-rewrite' },
        nameScalar: { currentValue: 'direct-rewrite' },
      });
      expect(plan.nameScalar?.isExact()).toBe(false);
      expect(run.execution.sequence.readOperations()).toHaveLength(run.closure.laneOperationCount);
      expect(run.execution.siteExecutionContext(run.closure.lane)).toBeNull();
    } finally {
      run.dispose();
    }
  });

  test('executes multiple no-removal AuSlots under one advancing site driver', () => {
    const run = fixture.run(
      'projection-receiver',
      '<au-slot></au-slot><au-slot name="second"></au-slot><au-slot name="third"></au-slot>',
    );
    try {
      const hosts = run.elements('au-slot');
      const firstPlan = run.plan(hosts[0]!);
      const driver = run.execution.beginSiteExecutionDriver(firstPlan.frontier);
      const results = [executeTemplateCompilerProcessContent({ plan: firstPlan, driver })];
      for (const host of hosts.slice(1)) {
        const plan = run.plan(host, driver);
        expect(plan.planningDriver).toBe(driver);
        results.push(executeTemplateCompilerProcessContent({ plan, driver }));
      }

      expect(results.map((result) => result.metadata.name)).toEqual(['default', 'second', 'third']);
      expect(results.every((result) => result.removals.length === 0)).toBe(true);
      expect(run.execution.sequence.readLaneOperations(run.closure.lane)).toHaveLength(
        run.closure.laneOperationCount + 3,
      );
      expect(driver.expectedLaneOperationCount).toBe(run.closure.laneOperationCount + 3);
      run.execution.finishSiteExecutionDriver(driver);
    } finally {
      run.dispose();
    }
  });

  test('keeps an arbitrary hook Open after exact execution and rejects its finished driver', () => {
    const run = fixture.run(
      'content-projection-topology-app',
      '<au-slot></au-slot><opaque-content-shell><span></span></opaque-content-shell>',
    );
    try {
      const auSlotPlan = run.plan(run.requiredElement('au-slot'));
      const driver = run.execution.beginSiteExecutionDriver(auSlotPlan.frontier);
      executeTemplateCompilerProcessContent({ plan: auSlotPlan, driver });
      const opaqueHost = run.requiredElement('opaque-content-shell');
      const plan = run.plan(opaqueHost, driver);

      expect(plan).toMatchObject({
        state: TemplateCompilerProcessContentPlanState.Open,
        openReason: { reasonKind: TemplateCompilerProcessContentOpenReasonKind.ArbitraryHook },
        planningDriver: null,
      });
      expect(run.execution.sequence.readContextOperations(driver.context)).toHaveLength(1);
      run.execution.finishSiteExecutionDriver(driver);
      expect(() => run.plan(opaqueHost, driver)).toThrow(/foreign, stale, or no longer active/);
    } finally {
      run.dispose();
    }
  });

  test('rejects foreign and stale site drivers before beginning an operation', () => {
    const left = fixture.run('projection-receiver', '<au-slot name="left"><span au-slot></span></au-slot>');
    const right = fixture.run('projection-receiver', '<au-slot name="right"><span au-slot></span></au-slot>');
    try {
      const leftHost = left.requiredElement('au-slot');
      const leftPlan = left.plan(leftHost);
      const rightPlan = right.plan(right.requiredElement('au-slot'));
      const rightDriver = right.execution.beginSiteExecutionDriver(rightPlan.frontier);

      expect(() => executeTemplateCompilerProcessContent({ plan: leftPlan, driver: rightDriver }))
        .toThrow(/another family|foreign, stale, or no longer current/);
      expect(left.execution.sequence.readOperations()).toHaveLength(left.closure.laneOperationCount);

      const leftDriver = left.execution.beginSiteExecutionDriver(leftPlan.frontier);
      const name = leftHost.readAttributes().find((attribute) => qualifiedName(attribute) === 'name')!;
      left.execution.forest.rewriteAttributeValue(name, 'stale');
      expect(() => executeTemplateCompilerProcessContent({ plan: leftPlan, driver: leftDriver }))
        .toThrow(/foreign, stale, or no longer (?:active|current)/);
      expect(left.execution.sequence.readOperations()).toHaveLength(left.closure.laneOperationCount);
    } finally {
      left.dispose();
      right.dispose();
    }
  });
});

class ProcessContentFixture {
  private nextRunOrdinal = 0;

  private constructor(
    readonly runtime: Awaited<ReturnType<typeof createSemanticRuntime>>,
    readonly compilations: readonly TemplateResourceCompilationEmission[],
  ) {}

  static async create(): Promise<ProcessContentFixture> {
    const runtime = await createSemanticRuntime({
      workspaceRoot: path.join(packageRoot, 'fixtures/pressure/content-projection-topology'),
      storeKey: 'contract:template-compiler-process-content',
    });
    const app = await runtime.openApp({ telemetry: { inquiryProfile: 'aot' } });
    return new ProcessContentFixture(runtime, [
      ...app.emission.templates.frontDoor.appCompilations,
      ...app.emission.templates.frontDoor.authoringCompilations,
    ]);
  }

  run(
    definitionName: string,
    markup: string,
    prepareForest: ((forest: TemplateCompilerOccurrenceForest) => void) | null = null,
  ): ProcessContentRun {
    const compilation = this.compilations.find((candidate) => candidate.definition.name === definitionName);
    if (compilation == null) throw new Error(`Expected processContent compilation '${definitionName}'.`);
    return ProcessContentRun.create(
      this.runtime,
      compilation,
      `process-content:${this.nextRunOrdinal++}`,
      markup,
      prepareForest,
    );
  }

  dispose(): void {
    this.runtime.retireWorkspaceIncarnation();
  }
}

class ProcessContentRun {
  private constructor(
    readonly browser: BrowserEffectiveTemplateFixture,
    readonly execution: TemplateCompilerExecutionSession,
    readonly closure: ReturnType<TemplateCompilerExecutionSession['closeInvocationBootstrap']>,
    readonly reads: TemplateCompilerReadView,
  ) {}

  static create(
    runtime: Awaited<ReturnType<typeof createSemanticRuntime>>,
    compilation: TemplateResourceCompilationEmission,
    localKey: string,
    markup: string,
    prepareForest: ((forest: TemplateCompilerOccurrenceForest) => void) | null,
  ): ProcessContentRun {
    const browser = new BrowserEffectiveTemplateFixture(localKey);
    const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(
      browser.materialize(localKey, markup).emission,
    );
    prepareForest?.(forest);
    const execution = TemplateCompilerExecutionSession.createForForest(localKey, forest);
    const lane = execution.admitRootInvocation(compilation.localKey);
    const hook = executeTemplateCompilerHookBootstrap({
      execution,
      lane,
      compilerWorld: compilation.compilerWorld,
      executionOpenSeamHandle: browser.run.handles.openSeam(`${localKey}:hook-open`),
    });
    const ownerCause = compilation.definition.productHandle;
    if (ownerCause == null) throw new Error(`Compilation '${compilation.definition.name}' has no definition product.`);
    const local = executeTemplateCompilerLocalExtraction({
      execution,
      lane,
      hookBootstrap: hook,
      ownerName: compilation.definition.name,
      ownerCauseHandles: [ownerCause],
      reserveDefinition: () => {
        throw new Error(`ProcessContent fixture '${localKey}' unexpectedly requested local definition reservation.`);
      },
    });
    const closure = execution.closeInvocationBootstrap(hook, local);
    return new ProcessContentRun(
      browser,
      execution,
      closure,
      new TemplateCompilerReadView(
        runtime.workspace.store,
        TemplateCompilerWorldAuthority.fixed(compilation.compilerWorld),
      ),
    );
  }

  elements(tagName: string): readonly TemplateCompilerElementOccurrence[] {
    return this.execution.forest.readNodes().filter((node): node is TemplateCompilerElementOccurrence =>
      node instanceof TemplateCompilerElementOccurrence && node.tagName.toLowerCase() === tagName
    );
  }

  requiredElement(tagName: string): TemplateCompilerElementOccurrence {
    const matches = this.elements(tagName);
    if (matches.length !== 1) throw new Error(`Expected one '${tagName}' occurrence, found ${matches.length}.`);
    return matches[0]!;
  }

  plan(
    host: TemplateCompilerElementOccurrence,
    siteAuthority: TemplateCompilerProcessContentSiteAuthority = this.closure,
  ) {
    const asElement = host.readAttributes().find((attribute) => qualifiedName(attribute) === 'as-element');
    const lookupName = runtimeElementLookupName(host.tagName, host.namespace, asElement?.value ?? null);
    return planTemplateCompilerProcessContent({
      execution: this.execution,
      siteAuthority,
      compilerReads: this.reads,
      elementRead: this.reads.readElement(lookupName),
      host,
    });
  }

  dispose(): void {
    this.browser.dispose();
  }
}

function qualifiedName(attribute: { readonly name: string; readonly prefix: string | null }): string {
  return attribute.prefix == null ? attribute.name : `${attribute.prefix}:${attribute.name}`;
}

function nodeLabel(node: TemplateCompilerNodeOccurrence): string {
  if (node instanceof TemplateCompilerElementOccurrence) return node.tagName.toLowerCase();
  return 'text' in node ? node.text : node.nodeKind;
}
