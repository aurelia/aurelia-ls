import { performance } from 'node:perf_hooks';

import type { KernelStore } from '../kernel/store.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import type {
  ProjectBootFrame,
  SourceFileAdmission,
} from '../boot/frames.js';
import type { EvaluationModuleResolutionOpen } from '../evaluation/module-host.js';
import {
  mergeStaticCallableExecutionBindings,
  StaticCallableExecutionBindings,
} from '../evaluation/function-execution.js';
import {
  isEvaluatedProjectSource,
  type StaticProjectEvaluationAccess,
  type StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  ResourceRecognitionContext,
  ResourceRecognitionContextIndex,
} from './resource-recognition-context.js';
import type { ResourceRecognitionObservation } from './resource-observation.js';
import { ResourceRecognitionPass } from './resource-recognition-pass.js';
import type {
  ResourceRecognitionPhaseTiming,
  ResourceRecognitionProfile,
} from './resource-recognition-pass.js';
import {
  ResourceRecognitionKernelEmission,
} from './resource-recognition-kernel-emitter.js';
import type { ResourceDefinitionHeaderEmission } from './resource-definition-header-emission.js';
import {
  ResourceDefinitionConvergenceEmission,
} from './resource-definition-converger.js';
import type { FullResourceDefinition } from './resource-definition.js';
import {
  NamedResourceDefinitionContributionKind,
  registrationResourceKindFor,
} from './resource-kind.js';
import {
  ResourceConventionTransformAdmissionMaterializer,
  type ResourceConventionToolingEvaluationContext,
  type ResourceConventionTransformAdmissionIndex,
} from './resource-convention-transform-admission.js';
import {
  PackageResourceBuildBridgeMaterializer,
  type PackageResourceBuildBridgeIndex,
} from './package-resource-build-bridge.js';
import {
  materializeResourceDefinitionSourceAttachments,
  type ResourceDefinitionSourceAttachment,
} from './resource-definition-source-attachment.js';

/** Resource-recognition result for one boot-admitted source file. */
export class ResourceRecognitionSourceResult {
  constructor(
    /** Source admission that anchored emitted records. */
    readonly admission: SourceFileAdmission,
    /** Module key used by the static evaluator for this source. */
    readonly moduleKey: string,
    /** Resource observations found in the admitted source module. */
    readonly observations: readonly ResourceRecognitionObservation[],
    /** Kernel emission result carrying typed definition-header handles. */
    readonly emission: ResourceRecognitionKernelEmission,
    /** Full definition convergence result for the source. */
    readonly convergence: ResourceDefinitionConvergenceEmission,
    /** Detached authored geometry for the source's converged definitions. */
    readonly definitionSourceAttachments: ReadonlyMap<FullResourceDefinition, ResourceDefinitionSourceAttachment>,
    /** Module edges left unresolved while preparing evaluation for this source. */
    readonly unresolvedModules: readonly EvaluationModuleResolutionOpen[],
    /** Phase timings for this source's recognition work. */
    readonly profile: ResourceRecognitionProfile,
  ) {}
}

export type ResourceRecognitionProjectPhaseName =
  | 'source-file-selection'
  | 'evaluated-source'
  | 'open-source'
  | ResourceRecognitionPhaseTiming['name'];

export interface ResourceRecognitionProjectPhaseTiming {
  readonly name: ResourceRecognitionProjectPhaseName;
  readonly milliseconds: number;
}

export interface ResourceRecognitionProjectProfile {
  readonly totalMilliseconds: number;
  readonly phases: readonly ResourceRecognitionProjectPhaseTiming[];
}

/** One framework-effective resource definition and the observed carrier variants it superseded. */
export class EffectiveResourceDefinitionSelection {
  constructor(
    readonly definition: FullResourceDefinition,
    readonly supersededDefinitions: readonly FullResourceDefinition[],
    readonly sourceAttachment: ResourceDefinitionSourceAttachment | null,
    readonly supersededSourceAttachments: readonly ResourceDefinitionSourceAttachment[],
  ) {}
}

/** Resource-recognition result for one booted project frame. */
export class ResourceRecognitionProjectResult {
  readonly definitionSelections: readonly EffectiveResourceDefinitionSelection[];
  readonly callableBindings: StaticCallableExecutionBindings;

  constructor(
    /** Project frame whose source files were recognized. */
    readonly project: ProjectBootFrame,
    /** Per-source recognition results. */
    readonly sources: readonly ResourceRecognitionSourceResult[],
    /** Aggregate resource-recognition timings for app-world pressure. */
    readonly profile: ResourceRecognitionProjectProfile,
  ) {
    const sourceAttachments = new Map(
      sources.flatMap((source) => [...source.definitionSourceAttachments.entries()]),
    );
    this.definitionSelections = effectiveResourceDefinitionSelections(
      sources.flatMap((source) => source.convergence.definitions),
      sourceAttachments,
    );
    this.callableBindings = mergeStaticCallableExecutionBindings(
      sources.map((source) => source.convergence.callableBindings),
    );
  }

  readObservations(): readonly ResourceRecognitionObservation[] {
    return this.sources.flatMap((source) => source.observations);
  }

  readDefinitionHeaders(): readonly ResourceDefinitionHeaderEmission[] {
    return this.sources.flatMap((source) => source.emission.definitions);
  }

  readDefinitions(): readonly FullResourceDefinition[] {
    return this.definitionSelections.map((selection) => selection.definition);
  }

  readSupersededDefinitions(): readonly FullResourceDefinition[] {
    return this.definitionSelections.flatMap((selection) => selection.supersededDefinitions);
  }

  readDefinitionSourceAttachments(): readonly ResourceDefinitionSourceAttachment[] {
    return this.definitionSelections.flatMap((selection) =>
      selection.sourceAttachment == null ? [] : [selection.sourceAttachment]
    );
  }

  readSupersededDefinitionSourceAttachments(): readonly ResourceDefinitionSourceAttachment[] {
    return this.definitionSelections.flatMap((selection) => selection.supersededSourceAttachments);
  }

  readUnresolvedModules(): readonly EvaluationModuleResolutionOpen[] {
    return this.sources.flatMap((source) => source.unresolvedModules);
  }
}

interface EffectiveResourceDefinitionSelectionFrame {
  definition: FullResourceDefinition;
  readonly candidates: FullResourceDefinition[];
}

function effectiveResourceDefinitionSelections(
  definitions: readonly FullResourceDefinition[],
  sourceAttachments: ReadonlyMap<FullResourceDefinition, ResourceDefinitionSourceAttachment>,
): readonly EffectiveResourceDefinitionSelection[] {
  const selected: EffectiveResourceDefinitionSelectionFrame[] = [];
  const selectedIndexByTarget = new Map<string, number>();
  for (const definition of definitions) {
    const key = effectiveResourceDefinitionKey(definition);
    if (key == null) {
      selected.push({ definition, candidates: [definition] });
      continue;
    }
    const selectedIndex = selectedIndexByTarget.get(key);
    if (selectedIndex == null) {
      selectedIndexByTarget.set(key, selected.length);
      selected.push({ definition, candidates: [definition] });
      continue;
    }
    const selection = selected[selectedIndex]!;
    selection.candidates.push(definition);
    if (resourceDefinitionSupersedes(definition, selection.definition)) {
      selection.definition = definition;
    }
  }
  return selected.map((selection) => new EffectiveResourceDefinitionSelection(
    selection.definition,
    selection.candidates.filter((candidate) => candidate !== selection.definition),
    sourceAttachments.get(selection.definition) ?? null,
    selection.candidates
      .filter((candidate) => candidate !== selection.definition)
      .flatMap((candidate) => {
        const attachment = sourceAttachments.get(candidate);
        return attachment == null ? [] : [attachment];
      }),
  ));
}

function effectiveResourceDefinitionKey(definition: FullResourceDefinition): string | null {
  const registrationKind = registrationResourceKindFor(definition.type);
  if (registrationKind == null) {
    return null;
  }
  const targetKey = definition.target.identityHandle
    ?? (definition.target.moduleKey != null && definition.target.localName != null
      ? `${definition.target.moduleKey}\0${definition.target.localName}`
      : null);
  return targetKey == null ? null : `${registrationKind}\0${targetKey}`;
}

function resourceDefinitionSupersedes(
  candidate: FullResourceDefinition,
  current: FullResourceDefinition,
): boolean {
  const candidateKind = primaryContributionKind(candidate);
  const currentKind = primaryContributionKind(current);
  const candidateRank = resourceDefinitionContributionRank(candidateKind);
  const currentRank = resourceDefinitionContributionRank(currentKind);
  if (candidateRank !== currentRank) {
    return candidateRank > currentRank;
  }
  // Direct define calls execute in source order; class decorator initializers execute bottom-up,
  // making the topmost (first recognized) decorator the final metadata writer.
  return candidateKind === NamedResourceDefinitionContributionKind.DefinitionObject;
}

function primaryContributionKind(
  definition: FullResourceDefinition,
): NamedResourceDefinitionContributionKind | null {
  const contributionKind = definition.contributions[0]?.contributionKind;
  switch (contributionKind) {
    case NamedResourceDefinitionContributionKind.DefinitionObject:
    case NamedResourceDefinitionContributionKind.Annotation:
    case NamedResourceDefinitionContributionKind.TypeStaticProperty:
    case NamedResourceDefinitionContributionKind.Convention:
    case NamedResourceDefinitionContributionKind.LocalTemplate:
    case NamedResourceDefinitionContributionKind.Header:
      return contributionKind;
    default:
      return null;
  }
}

function resourceDefinitionContributionRank(
  kind: NamedResourceDefinitionContributionKind | null,
): number {
  switch (kind) {
    case NamedResourceDefinitionContributionKind.DefinitionObject:
      return 4;
    case NamedResourceDefinitionContributionKind.Annotation:
      return 3;
    case NamedResourceDefinitionContributionKind.TypeStaticProperty:
      return 2;
    case NamedResourceDefinitionContributionKind.Convention:
      return 1;
    case NamedResourceDefinitionContributionKind.LocalTemplate:
      return 0;
    case NamedResourceDefinitionContributionKind.Header:
    case null:
      return 0;
  }
}

/** Run resource recognition over boot-admitted TS/JS sources using graph-linked static evaluation. */
export class ResourceRecognitionProjectPass {
  recognizeAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    evaluation: StaticProjectEvaluationResult,
    conventionToolingEvaluation: StaticProjectEvaluationAccess<ResourceConventionToolingEvaluationContext>,
    typeSystem: TypeSystemProject | null,
    publication: KernelPublicationContext,
  ): ResourceRecognitionProjectResult {
    const started = performance.now();
    const phases: ResourceRecognitionProjectPhaseTiming[] = [];
    const recognition = new ResourceRecognitionPass(project.inputGeneration.host);
    const packageBuildBridges = new PackageResourceBuildBridgeMaterializer()
      .materializeAndEmit(store, project, evaluation, publication);
    const sourceFiles = measureResourceRecognitionProjectPhase(phases, 'source-file-selection', () =>
      resourceRecognitionSourceFiles(project, evaluation, packageBuildBridges)
    );
    const conventionTransforms = new ResourceConventionTransformAdmissionMaterializer()
      .materializeAndEmit(store, project, conventionToolingEvaluation, publication);
    const contexts = evaluatedResourceRecognitionContexts(
      project,
      evaluation,
      typeSystem,
      sourceFiles,
      conventionTransforms,
    );
    const sources = evaluation.sources.map((source) => {
      const sourceStarted = performance.now();
      const result = this.recognizeSource(
        store,
        project,
        publication,
        recognition,
        source,
        contexts,
        packageBuildBridges,
      );
      phases.push({
        name: isEvaluatedProjectSource(source) ? 'evaluated-source' : 'open-source',
        milliseconds: performance.now() - sourceStarted,
      });
      phases.push(...result.profile.phases);
      return result;
    });
    return new ResourceRecognitionProjectResult(
      project,
      sources,
      {
        totalMilliseconds: performance.now() - started,
        phases,
      },
    );
  }

  private recognizeSource(
    store: KernelStore,
    project: ProjectBootFrame,
    publication: KernelPublicationContext,
    recognition: ResourceRecognitionPass,
    source: StaticProjectEvaluationResult['sources'][number],
    contexts: ReadonlyMap<string, ResourceRecognitionContext>,
    packageBuildBridges: PackageResourceBuildBridgeIndex,
  ): ResourceRecognitionSourceResult {
    if (!isEvaluatedProjectSource(source)) {
      return this.openSourceResult(source);
    }
    const context = contexts.get(source.moduleKey);
    if (context == null) {
      return this.openSourceResult(source);
    }
    const result = recognition.recognizeAndEmit(
      store,
      context,
      publication,
      packageBuildBridges.observationsForContext(context),
    );
    const definitionSourceAttachments = materializeResourceDefinitionSourceAttachments(
      project,
      context,
      result.observations,
      result.emission.definitions,
      result.convergence.definitions,
      publication,
    );
    return new ResourceRecognitionSourceResult(
      source.admission,
      source.moduleKey,
      result.observations,
      result.emission,
      result.convergence,
      definitionSourceAttachments,
      source.unresolvedModules,
      result.profile,
    );
  }

  private openSourceResult(
    source: StaticProjectEvaluationResult['sources'][number],
  ): ResourceRecognitionSourceResult {
    return new ResourceRecognitionSourceResult(
      source.admission,
      source.moduleKey,
      [],
      emptyResourceEmission(),
      emptyDefinitionConvergence(),
      new Map(),
      source.unresolvedModules,
      emptyResourceRecognitionProfile(),
    );
  }
}

function evaluatedResourceRecognitionContexts(
  project: ProjectBootFrame,
  evaluation: StaticProjectEvaluationResult,
  typeSystem: TypeSystemProject | null,
  sourceFiles: readonly SourceFileAdmission[],
  conventionTransforms: ResourceConventionTransformAdmissionIndex,
): ReadonlyMap<string, ResourceRecognitionContext> {
  const index = new ResourceRecognitionContextIndex();
  const contexts = new Map<string, ResourceRecognitionContext>();
  for (const source of evaluation.sources) {
    if (!isEvaluatedProjectSource(source)) {
      continue;
    }
    const context = new ResourceRecognitionContext(
      source.sourceFile,
      source.moduleKey,
      source.admission.addressHandle,
      project.projectKey,
      source.evaluation,
      typeSystem,
      project.rootDir,
      sourceFiles,
      conventionTransforms.evidenceHandlesForSource(source.admission),
      index,
    );
    index.add(context);
    contexts.set(source.moduleKey, context);
  }
  return contexts;
}

function resourceRecognitionSourceFiles(
  project: ProjectBootFrame,
  evaluation: StaticProjectEvaluationResult,
  packageBuildBridges: PackageResourceBuildBridgeIndex,
): readonly SourceFileAdmission[] {
  const sourceFiles = new Map(project.sourceFiles.map((source) => [source.addressHandle, source] as const));
  for (const source of evaluation.sources) {
    sourceFiles.set(source.admission.addressHandle, source.admission);
  }
  for (const admission of packageBuildBridges.templateAdmissions) {
    sourceFiles.set(admission.addressHandle, admission);
  }
  return [...sourceFiles.values()];
}

function emptyResourceEmission(): ResourceRecognitionKernelEmission {
  return new ResourceRecognitionKernelEmission([], [], {
    totalMilliseconds: 0,
    phases: [],
  });
}

function emptyDefinitionConvergence(): ResourceDefinitionConvergenceEmission {
  return new ResourceDefinitionConvergenceEmission(
    [],
    [],
    [],
    StaticCallableExecutionBindings.empty,
  );
}

function emptyResourceRecognitionProfile(): ResourceRecognitionProfile {
  return {
    totalMilliseconds: 0,
    phases: [],
  };
}

function measureResourceRecognitionProjectPhase<TValue>(
  phases: ResourceRecognitionProjectPhaseTiming[],
  name: ResourceRecognitionProjectPhaseName,
  read: () => TValue,
): TValue {
  const started = performance.now();
  const value = read();
  phases.push({
    name,
    milliseconds: performance.now() - started,
  });
  return value;
}
