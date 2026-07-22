import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import {
  SemanticApp,
  SemanticRuntime,
  createSemanticRuntime,
} from '../../src/api/runtime.js';
import type { OpenSemanticAppOptions } from '../../src/api/contracts.js';
import {
  readFixtureVerificationSnapshot,
  type FixtureVerificationSnapshot,
} from '../../src/fixture-verification/verification.js';
import {
  ComputationChildTransitionKind,
  computationOutputReadKey,
  type ComputationChildState,
  type ComputationState,
  type ComputationTransition,
} from '../../src/kernel/computation-lifecycle.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
  type SemanticRuntimeSourceTextOverlay,
} from '../../src/kernel/project-input.js';
import type { KernelPublicationDecisionKind } from '../../src/kernel/publication.js';
import { TemplateCompilationLocus } from '../../src/template/template-compilation-cohort.js';

/** Mutable in-memory project source used by production-runtime replacement tests. */
export class MutableProjectSourceOverlay implements SemanticRuntimeSourceTextOverlay {
  private readonly valuesByFileName: Map<string, string | null>;
  private failedFileName: string | null = null;

  constructor(values: ReadonlyMap<string, string | null> = new Map()) {
    this.valuesByFileName = new Map(values);
  }

  write(fileName: string, sourceText: string): void {
    this.valuesByFileName.set(path.resolve(fileName), sourceText);
  }

  remove(fileName: string): void {
    this.valuesByFileName.set(path.resolve(fileName), null);
  }

  fail(fileName: string): void {
    this.failedFileName = path.resolve(fileName);
  }

  resume(): void {
    this.failedFileName = null;
  }

  clone(): MutableProjectSourceOverlay {
    const clone = new MutableProjectSourceOverlay(this.valuesByFileName);
    clone.failedFileName = this.failedFileName;
    return clone;
  }

  readFile(fileName: string): string | undefined {
    const resolved = path.resolve(fileName);
    if (resolved === this.failedFileName) {
      throw new Error('Injected project-source failure.');
    }
    return this.valuesByFileName.get(resolved) ?? undefined;
  }

  fileExists(fileName: string): boolean | undefined {
    const value = this.valuesByFileName.get(path.resolve(fileName));
    return value === undefined ? undefined : value !== null;
  }
}

export interface IncrementalConformanceOptions {
  readonly fixtureRoot: string;
  readonly scenarioKey: string;
  readonly openApp?: OpenSemanticAppOptions;
}

export interface IncrementalConformanceTiming {
  readonly appMilliseconds: number;
  readonly snapshotMilliseconds: number;
}

export interface IncrementalConformanceChildDecisionCount {
  readonly kind: KernelPublicationDecisionKind;
  readonly count: number;
}

/** Compact operational row; it describes work and publication, not semantic correctness. */
export interface IncrementalConformanceChildTrace {
  readonly childId: string;
  readonly locusKind: string;
  readonly locusKey: string;
  readonly summary: string;
  readonly subject: string | null;
  readonly transition: ComputationChildTransitionKind;
  readonly hadPreviousState: boolean;
  readonly dependencyChildIds: readonly string[];
  readonly reads: number;
  readonly candidateReads: number;
  readonly structuralDependencies: number;
  readonly openReads: number;
  readonly openReadKinds: readonly string[];
  readonly outputs: number;
  readonly publicationDecisions: readonly IncrementalConformanceChildDecisionCount[];
}

export interface IncrementalConformanceTrace {
  readonly transition: ComputationTransition;
  readonly state: ComputationState;
  readonly children: readonly IncrementalConformanceChildTrace[];
}

export interface IncrementalConformanceStep {
  readonly label: string;
  readonly incrementalSnapshot: FixtureVerificationSnapshot;
  readonly coldSnapshot: FixtureVerificationSnapshot;
  readonly equivalent: boolean;
  readonly trace: IncrementalConformanceTrace;
  readonly incrementalTiming: IncrementalConformanceTiming;
  readonly coldTiming: IncrementalConformanceTiming;
}

/**
 * Long-lived production runtime compared after each source mutation with a fresh runtime over the same authored state.
 * Semantic snapshots are the correctness oracle; lifecycle traces measure how that answer was obtained.
 */
export class IncrementalConformanceHarness {
  private currentApp: SemanticApp;
  private currentState: ComputationState;

  private constructor(
    private readonly options: IncrementalConformanceOptions,
    private readonly overlay: MutableProjectSourceOverlay,
    private readonly inputAuthority: SemanticRuntimeProjectInputAuthority,
    private readonly runtime: SemanticRuntime,
    app: SemanticApp,
    state: ComputationState,
  ) {
    this.currentApp = app;
    this.currentState = state;
  }

  static async open(
    options: IncrementalConformanceOptions,
  ): Promise<IncrementalConformanceHarness> {
    const overlay = new MutableProjectSourceOverlay();
    const inputAuthority = projectInputAuthority(overlay);
    const runtime = await createSemanticRuntime({
      workspaceRoot: options.fixtureRoot,
      storeKey: incrementalConformanceStoreKey(options.scenarioKey),
      projectInputAuthority: inputAuthority,
    });
    const app = await runtime.openApp(options.openApp ?? { analysisDepth: 'binding-observation' });
    return new IncrementalConformanceHarness(
      options,
      overlay,
      inputAuthority,
      runtime,
      app,
      currentComputationState(runtime, app),
    );
  }

  async advance(
    label: string,
    mutate: (overlay: MutableProjectSourceOverlay) => void,
  ): Promise<IncrementalConformanceStep> {
    mutate(this.overlay);
    this.inputAuthority.advance();

    const previousState = this.currentState;
    const incremental = await this.openAndSnapshot(this.runtime);
    const nextState = currentComputationState(this.runtime, incremental.app);
    const transition = latestTransition(this.runtime, incremental.app);

    const coldOverlay = this.overlay.clone();
    const coldRuntime = await createSemanticRuntime({
      workspaceRoot: this.options.fixtureRoot,
      storeKey: incrementalConformanceStoreKey(this.options.scenarioKey),
      projectInputAuthority: projectInputAuthority(coldOverlay),
    });
    if (coldRuntime.workspace.store === this.runtime.workspace.store) {
      throw new Error('Cold conformance runtime unexpectedly shares the incremental kernel store.');
    }
    const cold = await this.openAndSnapshot(coldRuntime);

    this.currentApp = incremental.app;
    this.currentState = nextState;
    return {
      label,
      incrementalSnapshot: incremental.snapshot,
      coldSnapshot: cold.snapshot,
      equivalent: isDeepStrictEqual(incremental.snapshot, cold.snapshot),
      trace: {
        transition,
        state: nextState,
        children: childTrace(previousState, nextState, transition, incremental.app),
      },
      incrementalTiming: incremental.timing,
      coldTiming: cold.timing,
    };
  }

  private async openAndSnapshot(runtime: SemanticRuntime): Promise<{
    readonly app: SemanticApp;
    readonly snapshot: FixtureVerificationSnapshot;
    readonly timing: IncrementalConformanceTiming;
  }> {
    const appStarted = performance.now();
    const app = await runtime.openApp(this.options.openApp ?? { analysisDepth: 'binding-observation' });
    const appMilliseconds = performance.now() - appStarted;
    const snapshotStarted = performance.now();
    const snapshot = readFixtureVerificationSnapshot(app);
    return {
      app,
      snapshot,
      timing: {
        appMilliseconds,
        snapshotMilliseconds: performance.now() - snapshotStarted,
      },
    };
  }
}

function projectInputAuthority(
  overlay: MutableProjectSourceOverlay,
): SemanticRuntimeProjectInputAuthority {
  return new SemanticRuntimeProjectInputAuthority(
    new NodeSemanticRuntimeProjectInputHost(overlay),
  );
}

function incrementalConformanceStoreKey(scenarioKey: string): string {
  return `incremental-conformance:${scenarioKey}`;
}

function currentComputationState(runtime: SemanticRuntime, app: SemanticApp): ComputationState {
  const generation = runtime.appAnalysisComputations.authorityFor(app.project.projectKey).current();
  if (generation == null) {
    throw new Error(`Expected a current app generation for ${app.project.projectKey}.`);
  }
  const state = runtime.computationLifecycle.readState(generation.computationId);
  if (state == null) {
    throw new Error(`Expected computation state for ${generation.computationId}.`);
  }
  return state;
}

function latestTransition(runtime: SemanticRuntime, app: SemanticApp): ComputationTransition {
  const generation = runtime.appAnalysisComputations.authorityFor(app.project.projectKey).current();
  if (generation == null) {
    throw new Error(`Expected a current app generation for ${app.project.projectKey}.`);
  }
  const transition = runtime.computationLifecycle.readTransitions(generation.computationId).at(-1) ?? null;
  if (transition == null) {
    throw new Error(`Expected a computation transition for ${generation.computationId}.`);
  }
  return transition;
}

function childTrace(
  previous: ComputationState,
  current: ComputationState,
  transition: ComputationTransition,
  app: SemanticApp,
): readonly IncrementalConformanceChildTrace[] {
  const previousById = new Map(previous.children.map((child) => [child.childId, child]));
  const currentById = new Map(current.children.map((child) => [child.childId, child]));
  const subjectByLocusKey = new Map(app.emission.templates.frontDoor.plan.cohortPlan.ownerPlans.map((owner) => [
    new TemplateCompilationLocus(app.project.projectKey, owner.ownerHandle).reconciliationKey,
    owner.definition.name,
  ]));
  const decisionsByReadKey = new Map(transition.publications.map((decision) => [
    computationOutputReadKey(decision.surface, decision.handle),
    decision,
  ]));
  return transition.children.map((childTransition) => {
    const child = currentById.get(childTransition.childId)
      ?? previousById.get(childTransition.childId)
      ?? missingChildState(childTransition.childId);
    return {
      childId: childTransition.childId,
      locusKind: child.locus.kind,
      locusKey: child.locus.reconciliationKey,
      summary: child.locus.summary,
      subject: subjectByLocusKey.get(child.locus.reconciliationKey) ?? null,
      transition: childTransition.kind,
      hadPreviousState: childTransition.hadPreviousState,
      dependencyChildIds: computationChildDependencyIds(child),
      reads: child.reads.length,
      candidateReads: child.candidateReads.length,
      structuralDependencies: child.structuralDependencies.length,
      openReads: child.openReads.length,
      openReadKinds: [...new Set(child.openReads.map((read) => read.kind))].sort(),
      outputs: child.outputs.length,
      publicationDecisions: decisionCounts(child, decisionsByReadKey),
    };
  });
}

function computationChildDependencyIds(child: ComputationChildState): readonly string[] {
  return [...new Set([
    ...child.candidateReads.flatMap((read) => read.producerChildId == null ? [] : [read.producerChildId]),
    ...child.structuralDependencies.flatMap((dependency) =>
      dependency.producerChildId == null ? [] : [dependency.producerChildId]),
  ])]
    .filter((childId) => childId !== child.childId)
    .sort((left, right) => left.localeCompare(right));
}

function decisionCounts(
  child: ComputationChildState,
  decisionsByReadKey: ReadonlyMap<string, { readonly decision: KernelPublicationDecisionKind }>,
): readonly IncrementalConformanceChildDecisionCount[] {
  const counts = new Map<KernelPublicationDecisionKind, number>();
  for (const output of child.outputs) {
    const kind = decisionsByReadKey.get(output.readKey)?.decision;
    if (kind != null) {
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([kind, count]) => ({ kind, count }));
}

function missingChildState(childId: string): never {
  throw new Error(`Computation transition names unknown child ${childId}.`);
}
