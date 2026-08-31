import type { IdentityHandle, ProductHandle } from '../kernel/handles.js';
import type { ComputationRun } from '../kernel/computation-lifecycle.js';
import type { CustomElementDefinition } from '../resources/custom-element-definition.js';
import type { BrowserEffectiveTemplateEmission } from './browser-effective-template-materializer.js';
import { TemplateCompilerInvocationWorldMaterializer } from './compiler-invocation-world-materializer.js';
import { LocalTemplateDefinitionMaterializer } from './local-template-definition-materializer.js';
import {
  freezeTemplateCompilerContextFamilyTargetExecution,
  prepareTemplateCompilerContextFamilyTarget,
  TemplateCompilerContextFamilyCompilationReason,
  TemplateCompilerContextFamilyCompilationStage,
  TemplateCompilerContextFamilyCompilationState,
  type TemplateCompilerContextFamilyCompilationResult,
} from './template-compiler-context-family-compilation.js';
import { prepareTemplateCompilerContextFamilyStructuralSchedule } from './template-compiler-context-family-structural-schedule.js';
import { executeTemplateCompilerContextFamilyTarget } from './template-compiler-context-family-target-execution.js';
import type { TemplateCompilerContextFamilyValue } from './template-compiler-context-family-value.js';
import {
  TemplateCompilerExecutionSession,
} from './template-compiler-execution.js';
import {
  executeTemplateCompilerHookBootstrap,
  TemplateCompilerHookBootstrapState,
} from './template-compiler-hook-bootstrap.js';
import {
  executeTemplateCompilerLocalExtraction,
  TemplateCompilerLocalExtractionState,
} from './template-compiler-local-extraction.js';
import { TemplateCompilerOccurrenceCompilationIngressMaterializer } from './template-compiler-occurrence-compilation-ingress.js';
import { TemplateCompilerOccurrenceForest } from './template-compiler-occurrence.js';
import {
  type TemplateCompilerOccurrenceChildHookParentWorldTransfer,
  type TemplateCompilerOccurrenceTraversalWorldProjection,
  TemplateCompilerOccurrenceWorldClosureMaterializer,
} from './template-compiler-occurrence-world-closure.js';
import {
  createTemplateCompilerNormalizedSiteLaneFamily,
  TemplateCompilerNormalizedSiteLaneResultState,
  type TemplateCompilerNormalizedSiteLanePartition,
  type TemplateCompilerNormalizedSiteLaneView,
} from './template-compiler-normalized-site-lane-view.js';
import { TemplateCompilerPreWalkRemainderAuthority } from './template-compiler-prewalk-remainder.js';
import {
  executeTemplateCompilerRootSiteCursor,
  TemplateCompilerSiteCursorResultState,
  TemplateCompilerSiteCursorTraversalMode,
} from './template-compiler-site-cursor.js';
import {
  bindTemplateCompilerOccurrenceSiteInvocation,
  bindTemplateCompilerRootOccurrencePrecedentInvocation,
  TemplateCompilerOccurrencePrecedentInvocationBindingState,
  TemplateCompilerSiteInvocationBindingState,
  type TemplateCompilerFrontDoorCurrentnessAuthority,
} from './template-compiler-site-invocation.js';
import { TemplateCompilerLocalSiteExclusionAuthority } from './template-compiler-site-spend-ledger.js';
import type {
  TemplateCompilationFrontDoorEmission,
  TemplateCompilationFamilyFrontDoorEmission,
  TemplateCompilerOccurrencePrecedentEmission,
} from './template-compilation-project-pass.js';
import { TemplateCompilerReadView, TemplateCompilerWorldAuthority } from './compiler-read-view.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';

export interface TemplateCompilerOccurrenceFamilyCompilationRequest {
  readonly compilationKey: string;
  readonly appCurrentness: TemplateCompilerFrontDoorCurrentnessAuthority;
  readonly occurrencePrecedent: TemplateCompilerOccurrencePrecedentEmission;
  readonly browserEmission: BrowserEffectiveTemplateEmission;
  readonly currentFrontDoor: TemplateCompilationFrontDoorEmission;
  readonly currentFamily: TemplateCompilationFamilyFrontDoorEmission;
  readonly appRootDefinitionProductHandle: ProductHandle | null;
  readonly publication: ComputationRun;
}

/** One scoped generated local definition and the compiler-final family produced for its exact browser carrier. */
export class TemplateCompilerOccurrenceLocalDefinitionValue {
  constructor(
    readonly definition: CustomElementDefinition,
    readonly parentDefinitionProductHandle: ProductHandle,
    readonly parentLocalDefinitionIdentityHandle: IdentityHandle | null,
    readonly declarationOrdinal: number,
    /** Ordered position in the parent's compiler-added dependency tail, before any optimization. */
    readonly compilerAddedDependencyOrdinal: number,
    /** Existing compiler-front-door source product for the same detached local carrier. */
    readonly sourceTemplateProductHandle: ProductHandle,
    readonly family: TemplateCompilerContextFamilyValue,
  ) {
    if (
      definition.productHandle == null
      || definition.identityHandle == null
      || family.rootDefinition !== definition
      || declarationOrdinal !== compilerAddedDependencyOrdinal
      || sourceTemplateProductHandle.length === 0
    ) {
      throw new Error('Occurrence local-definition value lost definition, parent, order, or compiled-family authority.');
    }
  }

  get localDefinitionProductHandle(): ProductHandle {
    return this.definition.productHandle!;
  }

  get localDefinitionIdentityHandle(): IdentityHandle {
    return this.definition.identityHandle!;
  }
}

/** One compiler-final root plus its complete scoped local-Type forest, all closed in one occurrence execution. */
export class TemplateCompilerOccurrenceFamilyValue {
  constructor(
    readonly rootFamily: TemplateCompilerContextFamilyValue,
    readonly locals: readonly TemplateCompilerOccurrenceLocalDefinitionValue[],
  ) {
    const rootProduct = rootFamily.rootDefinition.productHandle;
    const byIdentity = new Map<IdentityHandle, TemplateCompilerOccurrenceLocalDefinitionValue>();
    const products = new Set<ProductHandle>();
    const nextOrdinalByParent = new Map<ProductHandle, number>();
    for (const local of locals) {
      const parent = local.parentLocalDefinitionIdentityHandle == null
        ? null
        : byIdentity.get(local.parentLocalDefinitionIdentityHandle) ?? null;
      const expectedParentProduct = parent?.localDefinitionProductHandle ?? rootProduct;
      const expectedOrdinal = nextOrdinalByParent.get(local.parentDefinitionProductHandle) ?? 0;
      if (
        rootProduct == null
        || byIdentity.has(local.localDefinitionIdentityHandle)
        || local.localDefinitionProductHandle === rootProduct
        || products.has(local.localDefinitionProductHandle)
        || (local.parentLocalDefinitionIdentityHandle != null && parent == null)
        || local.parentDefinitionProductHandle !== expectedParentProduct
        || local.declarationOrdinal !== expectedOrdinal
      ) {
        throw new Error('Occurrence family value lost unique local identity, recursive parent, or sibling order.');
      }
      byIdentity.set(local.localDefinitionIdentityHandle, local);
      products.add(local.localDefinitionProductHandle);
      nextOrdinalByParent.set(local.parentDefinitionProductHandle, expectedOrdinal + 1);
    }
  }
}

export class TemplateCompilerOccurrenceFamilyCompilationResult {
  constructor(
    readonly state: TemplateCompilerContextFamilyCompilationState,
    readonly value: TemplateCompilerOccurrenceFamilyValue | null,
    readonly reasons: readonly TemplateCompilerContextFamilyCompilationReason[],
  ) {
    const exact = state === TemplateCompilerContextFamilyCompilationState.Exact;
    if (exact !== (value != null && reasons.length === 0) || !exact !== (value == null && reasons.length > 0)) {
      throw new Error('Occurrence family compilation lost exact or unavailable ownership.');
    }
  }
}

interface PendingLocalLane {
  readonly view: TemplateCompilerNormalizedSiteLaneView;
  readonly definition: CustomElementDefinition;
  readonly parentDefinition: CustomElementDefinition;
  readonly parentLocalDefinitionIdentityHandle: IdentityHandle | null;
  readonly declarationOrdinal: number;
  readonly sourceTemplateProductHandle: ProductHandle;
  readonly hookParentTransfer: TemplateCompilerOccurrenceChildHookParentWorldTransfer;
}

interface ExecutedLane {
  readonly definition: CustomElementDefinition;
  readonly parentDefinition: CustomElementDefinition | null;
  readonly parentLocalDefinitionIdentityHandle: IdentityHandle | null;
  readonly declarationOrdinal: number | null;
  readonly sourceTemplateProductHandle: ProductHandle | null;
  readonly execution: ReturnType<typeof executeTemplateCompilerContextFamilyTarget>;
}

/** Execute an occurrence-first local family from raw source through one shared multi-lane seal. */
export function compileTemplateCompilerOccurrenceFamily(
  request: TemplateCompilerOccurrenceFamilyCompilationRequest,
): TemplateCompilerOccurrenceFamilyCompilationResult {
  const precedent = request.occurrencePrecedent;
  const rootDefinition = precedent.compilation.definition;
  const runtimeRootMatches = [
    ...request.currentFamily.appCompilations,
    ...request.currentFamily.authoringCompilations,
  ].filter((compilation) =>
    compilation.definition.productHandle === rootDefinition.productHandle
  );
  if (runtimeRootMatches.length !== 1) {
    return unavailable(
      TemplateCompilerContextFamilyCompilationState.Ineligible,
      'runtime-root-compilation-unavailable',
      'Occurrence family requires one exact current runtime root compilation for stable local identities.',
    );
  }
  const runtimeRoot = runtimeRootMatches[0]!;
  const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(request.browserEmission);
  const execution = TemplateCompilerExecutionSession.createForForest(
    `occurrence-context-family:${request.compilationKey}`,
    forest,
  );
  const rootLane = execution.admitRootInvocation(runtimeRoot.localKey);
  if (request.browserEmission.publication !== request.publication) {
    throw new Error('Occurrence family compilation browser input belongs to another publication candidate.');
  }
  const definitions = new LocalTemplateDefinitionMaterializer(request.publication);
  const ingresses = new TemplateCompilerOccurrenceCompilationIngressMaterializer(request.publication);
  const worldClosures = new TemplateCompilerOccurrenceWorldClosureMaterializer(request.publication);
  const worlds = TemplateCompilerInvocationWorldMaterializer.candidateStrict(request.publication);

  const rootHook = executeTemplateCompilerHookBootstrap({
    execution,
    lane: rootLane,
    compilerWorld: precedent.preLocalCompilerWorld,
    executionOpenSeamHandle: request.publication.handles.openSeam(
      `${request.compilationKey}:root-hook-open`,
    ),
  });
  if (rootHook.state !== TemplateCompilerHookBootstrapState.Exact) {
    return unavailable(
      rootHook.state === TemplateCompilerHookBootstrapState.Abrupt
        ? TemplateCompilerContextFamilyCompilationState.Abrupt
        : TemplateCompilerContextFamilyCompilationState.Open,
      'root-hook-bootstrap',
      `Occurrence root hook bootstrap ended as '${rootHook.state}'.`,
    );
  }
  const rootLocal = executeTemplateCompilerLocalExtraction({
    execution,
    lane: rootLane,
    hookBootstrap: rootHook,
    ownerName: rootDefinition.name,
    ownerCauseHandles: [rootDefinition.productHandle ?? precedent.compilation.unit.templateSource.productHandle],
    reserveDefinition: (invocationKey) => definitions.reserveOccurrenceDefinition(invocationKey),
  });
  if (rootLocal.state !== TemplateCompilerLocalExtractionState.Extracted) {
    return unavailable(
      rootLocal.state === TemplateCompilerLocalExtractionState.Abrupt
        ? TemplateCompilerContextFamilyCompilationState.Abrupt
        : rootLocal.state === TemplateCompilerLocalExtractionState.Refused
          ? TemplateCompilerContextFamilyCompilationState.Ineligible
          : TemplateCompilerContextFamilyCompilationState.Pending,
      'root-local-extraction',
      rootLocal.failure?.summary ?? `Occurrence root local extraction ended as '${rootLocal.state}'.`,
    );
  }
  const rootClosure = execution.closeInvocationBootstrap(rootHook, rootLocal);
  const rawBinding = bindTemplateCompilerRootOccurrencePrecedentInvocation({
    appCurrentness: request.appCurrentness,
    execution,
    bootstrapClosure: rootClosure,
    browserEmission: request.browserEmission,
    occurrencePrecedent: precedent,
    currentFrontDoor: request.currentFrontDoor,
    currentFamily: request.currentFamily,
  });
  if (
    rawBinding.state !== TemplateCompilerOccurrencePrecedentInvocationBindingState.Exact
    || rawBinding.binding == null
  ) {
    return unavailable(
      rawBinding.state === TemplateCompilerOccurrencePrecedentInvocationBindingState.Open
        ? TemplateCompilerContextFamilyCompilationState.Open
        : TemplateCompilerContextFamilyCompilationState.Ineligible,
      'occurrence-precedent-binding',
      rawBinding.reasons.map((reason) => reason.summary).join(' '),
    );
  }
  const laneFamilyResult = createTemplateCompilerNormalizedSiteLaneFamily(rawBinding.binding);
  if (
    laneFamilyResult.state !== TemplateCompilerNormalizedSiteLaneResultState.Exact
    || laneFamilyResult.family == null
  ) {
    return unavailable(
      laneFamilyResult.state === TemplateCompilerNormalizedSiteLaneResultState.Open
        ? TemplateCompilerContextFamilyCompilationState.Open
        : TemplateCompilerContextFamilyCompilationState.Ineligible,
      'normalized-site-lane-family',
      laneFamilyResult.reasons.map((reason) => reason.summary).join(' '),
    );
  }
  const laneFamily = laneFamilyResult.family;
  const rootPartitionResult = laneFamily.partition(
    laneFamily.rootView,
    rootClosure,
    TemplateCompilerLocalSiteExclusionAuthority.capture(execution, rootClosure),
  );
  if (rootPartitionResult.partition == null) {
    return partitionUnavailable(rootPartitionResult.state, rootPartitionResult.reasons.map((reason) => reason.summary));
  }

  const rootCohort = prepareCohort(
    definitions,
    ingresses,
    worldClosures,
    rootPartitionResult.partition,
  );
  const pending: PendingLocalLane[] = rootCohort.definitionMaterialization.entries.map((entry, ordinal) => ({
    view: rootCohort.ingressCohort.entries[ordinal]!.childView,
    definition: entry.definition,
    parentDefinition: rootDefinition,
    parentLocalDefinitionIdentityHandle: null,
    declarationOrdinal: ordinal,
    sourceTemplateProductHandle: rootCohort.ingressCohort.entries[ordinal]!.unitIngress.templateSource.productHandle,
    hookParentTransfer: rootCohort.childHookParentClaim.transfers[ordinal]!,
  }));
  const executed: ExecutedLane[] = [];

  const rootExecution = executeLane(
    request,
    execution,
    rawBinding.binding,
    rootPartitionResult.partition,
    rootDefinition,
    rootCohort.worldClosure.postLocalWorld,
    rootCohort.worldClosure.traversalProjection,
    true,
  );
  if (rootExecution.result != null) return rootExecution.result;
  executed.push({
    definition: rootDefinition,
    parentDefinition: null,
    parentLocalDefinitionIdentityHandle: null,
    declarationOrdinal: null,
    sourceTemplateProductHandle: null,
    execution: rootExecution.execution!,
  });

  for (let pendingIndex = 0; pendingIndex < pending.length; pendingIndex++) {
    const current = pending[pendingIndex]!;
    const definition = current.definition;
    const lane = current.view.lane;
    if (!current.hookParentTransfer.isPendingCurrent() || current.hookParentTransfer.lane !== lane) {
      return unavailable(
        TemplateCompilerContextFamilyCompilationState.Ineligible,
        'local-hook-parent-transfer-stale',
        `Local definition '${definition.name}' lost its claimed hook-parent world frontier.`,
        [definition.identityHandle ?? lane.localKey],
      );
    }
    const hookWorld = worlds.projectDefinitionHookWorld(
      current.hookParentTransfer.world,
      definition,
      request.appRootDefinitionProductHandle,
      lane.localKey,
      definition.template?.addressHandle ?? definition.sourceAddressHandle,
    );
    const hook = executeTemplateCompilerHookBootstrap({
      execution,
      lane,
      compilerWorld: hookWorld,
      executionOpenSeamHandle: request.publication.handles.openSeam(`${lane.localKey}:hook-open`),
    });
    if (hook.state !== TemplateCompilerHookBootstrapState.Exact) {
      return unavailable(
        hook.state === TemplateCompilerHookBootstrapState.Abrupt
          ? TemplateCompilerContextFamilyCompilationState.Abrupt
          : TemplateCompilerContextFamilyCompilationState.Open,
        'local-hook-bootstrap',
        `Local definition '${definition.name}' hook bootstrap ended as '${hook.state}'.`,
        [definition.identityHandle ?? lane.localKey],
      );
    }
    const local = executeTemplateCompilerLocalExtraction({
      execution,
      lane,
      hookBootstrap: hook,
      ownerName: definition.name,
      ownerCauseHandles: [definition.productHandle!],
      reserveDefinition: (invocationKey) => definitions.reserveOccurrenceDefinition(invocationKey),
    });
    if (!local.isExact()) {
      return unavailable(
        local.state === TemplateCompilerLocalExtractionState.Abrupt
          ? TemplateCompilerContextFamilyCompilationState.Abrupt
          : TemplateCompilerContextFamilyCompilationState.Ineligible,
        'local-extraction',
        local.failure?.summary ?? `Local definition '${definition.name}' extraction ended as '${local.state}'.`,
        [definition.identityHandle ?? lane.localKey],
      );
    }
    const closure = execution.closeInvocationBootstrap(hook, local);
    const partitionResult = laneFamily.partition(
      current.view,
      closure,
      TemplateCompilerLocalSiteExclusionAuthority.capture(execution, closure),
    );
    if (partitionResult.partition == null) {
      return partitionUnavailable(
        partitionResult.state,
        partitionResult.reasons.map((reason) => reason.summary),
        definition.identityHandle == null ? [] : [definition.identityHandle],
      );
    }
    const partition = partitionResult.partition;
    let activeWorld = hookWorld;
    let postLocalWorldProjection: TemplateCompilerOccurrenceTraversalWorldProjection | null = null;
    if (local.state === TemplateCompilerLocalExtractionState.Extracted) {
      const cohort = prepareCohort(definitions, ingresses, worldClosures, partition);
      activeWorld = cohort.worldClosure.postLocalWorld;
      postLocalWorldProjection = cohort.worldClosure.traversalProjection;
      pending.push(...cohort.definitionMaterialization.entries.map((entry, ordinal) => ({
        view: cohort.ingressCohort.entries[ordinal]!.childView,
        definition: entry.definition,
        parentDefinition: definition,
        parentLocalDefinitionIdentityHandle: definition.identityHandle,
        declarationOrdinal: ordinal,
        sourceTemplateProductHandle: cohort.ingressCohort.entries[ordinal]!.unitIngress.templateSource.productHandle,
        hookParentTransfer: cohort.childHookParentClaim.transfers[ordinal]!,
      })));
    }
    const laneExecution = executeLane(
      request,
      execution,
      rawBinding.binding,
      partition,
      definition,
      activeWorld,
      postLocalWorldProjection,
      false,
    );
    if (laneExecution.result != null) return laneExecution.result;
    executed.push({
      definition,
      parentDefinition: current.parentDefinition,
      parentLocalDefinitionIdentityHandle: current.parentLocalDefinitionIdentityHandle,
      declarationOrdinal: current.declarationOrdinal,
      sourceTemplateProductHandle: current.sourceTemplateProductHandle,
      execution: laneExecution.execution!,
    });
  }

  execution.seal();
  const frozen: TemplateCompilerContextFamilyCompilationResult[] = executed.map((entry) =>
    freezeTemplateCompilerContextFamilyTargetExecution(entry.execution, request.publication.domainReadProjection)
  );
  const unavailableFrozen = frozen.find((result) => result.value == null) ?? null;
  if (unavailableFrozen != null) {
    return new TemplateCompilerOccurrenceFamilyCompilationResult(
      unavailableFrozen.state,
      null,
      unavailableFrozen.reasons,
    );
  }
  const rootFamily = frozen[0]?.value;
  if (rootFamily == null) {
    throw new Error('Exact occurrence family compilation lost its root family value.');
  }
  const locals = executed.slice(1).map((entry, index) => {
    const family = frozen[index + 1]!.value!;
    if (
      entry.parentDefinition?.productHandle == null
      || entry.declarationOrdinal == null
      || entry.sourceTemplateProductHandle == null
    ) {
      throw new Error('Exact occurrence local family lost its parent or declaration order.');
    }
    return new TemplateCompilerOccurrenceLocalDefinitionValue(
      entry.definition,
      entry.parentDefinition.productHandle,
      entry.parentLocalDefinitionIdentityHandle,
      entry.declarationOrdinal,
      entry.declarationOrdinal,
      entry.sourceTemplateProductHandle,
      family,
    );
  });
  return new TemplateCompilerOccurrenceFamilyCompilationResult(
    TemplateCompilerContextFamilyCompilationState.Exact,
    new TemplateCompilerOccurrenceFamilyValue(rootFamily, locals),
    [],
  );
}

function prepareCohort(
  definitions: LocalTemplateDefinitionMaterializer,
  ingresses: TemplateCompilerOccurrenceCompilationIngressMaterializer,
  worlds: TemplateCompilerOccurrenceWorldClosureMaterializer,
  partition: TemplateCompilerNormalizedSiteLanePartition,
) {
  const definitionPreparation = definitions.prepareOccurrenceHandoff(partition);
  const ingressCohort = ingresses.prepareChildren(definitionPreparation);
  const definitionMaterialization = definitions.publishOccurrenceHandoff(definitionPreparation);
  const worldClosure = worlds.projectCohort(definitionMaterialization, ingressCohort);
  const childHookParentClaim = worlds.claimChildHookParents(worldClosure);
  return { definitionMaterialization, ingressCohort, worldClosure, childHookParentClaim };
}

function executeLane(
  request: TemplateCompilerOccurrenceFamilyCompilationRequest,
  execution: TemplateCompilerExecutionSession,
  rawBinding: Parameters<typeof bindTemplateCompilerOccurrenceSiteInvocation>[0]['occurrenceBinding'],
  partition: TemplateCompilerNormalizedSiteLanePartition,
  definition: CustomElementDefinition,
  compilerWorld: TemplateCompilerWorldEmission,
  postLocalWorldProjection: TemplateCompilerOccurrenceTraversalWorldProjection | null,
  root: boolean,
): {
  readonly execution: ReturnType<typeof executeTemplateCompilerContextFamilyTarget> | null;
  readonly result: TemplateCompilerOccurrenceFamilyCompilationResult | null;
} {
  const binding = bindTemplateCompilerOccurrenceSiteInvocation({
    occurrenceBinding: rawBinding,
    partition,
    definition,
    compilerWorld,
    postLocalWorldProjection,
  });
  if (binding.state !== TemplateCompilerSiteInvocationBindingState.Exact || binding.binding == null) {
    return {
      execution: null,
      result: unavailable(
        TemplateCompilerContextFamilyCompilationState.Ineligible,
        'occurrence-site-binding',
        binding.reasons.map((reason) => reason.summary).join(' '),
        definition.identityHandle == null ? [] : [definition.identityHandle],
      ),
    };
  }
  const compilerReads = new TemplateCompilerReadView(
    request.publication.domainReadProjection,
    TemplateCompilerWorldAuthority.fixed(compilerWorld),
  );
  const cursor = executeTemplateCompilerRootSiteCursor({
    binding: binding.binding,
    compilerReads,
    preWalkAuthority: TemplateCompilerPreWalkRemainderAuthority.capture(binding.binding),
    traversalMode: TemplateCompilerSiteCursorTraversalMode.ClosedContextFamily,
  });
  if (cursor.state !== TemplateCompilerSiteCursorResultState.Transcript || cursor.transcript == null) {
    return {
      execution: null,
      result: unavailable(
        TemplateCompilerContextFamilyCompilationState.Ineligible,
        'occurrence-site-cursor',
        cursor.reasons.map((reason) => reason.summary).join(' '),
        definition.identityHandle == null ? [] : [definition.identityHandle],
      ),
    };
  }
  const target = prepareTemplateCompilerContextFamilyTarget(cursor);
  if (target.target == null) {
    const stableKey = definition.identityHandle ?? definition.productHandle ?? definition.name;
    return {
      execution: null,
      result: new TemplateCompilerOccurrenceFamilyCompilationResult(
        target.state,
        null,
        target.reasons.map((reason) => new TemplateCompilerContextFamilyCompilationReason(
          reason.stage,
          reason.reasonKind,
          `Local-family lane '${definition.name}': ${reason.summary}`,
          [...reason.stableKeys, stableKey],
          reason.role,
          reason.frontierCause,
        )),
      ),
    };
  }
  const schedule = prepareTemplateCompilerContextFamilyStructuralSchedule(target.target);
  if (!root && schedule.processContentExecutionOrder.length > 0) {
    return {
      execution: null,
      result: unavailable(
        TemplateCompilerContextFamilyCompilationState.Open,
        'local-process-content-target-execution-open',
        `Local definition '${definition.name}' requires processContent adoption across the extracted-lane boundary.`,
        definition.identityHandle == null ? [] : [definition.identityHandle],
      ),
    };
  }
  const attachment = root
    ? execution.commitPreparedContextFamilyTargetAttachment(
        execution.prepareContextFamilyTargetAttachment(target.target, schedule),
      )
    : execution.commitAdditionalContextFamilyTargetAttachment(target.target, schedule);
  return {
    execution: executeTemplateCompilerContextFamilyTarget(attachment),
    result: null,
  };
}

function partitionUnavailable(
  state: TemplateCompilerNormalizedSiteLaneResultState,
  summaries: readonly string[],
  stableKeys: readonly string[] = [],
): TemplateCompilerOccurrenceFamilyCompilationResult {
  return unavailable(
    state === TemplateCompilerNormalizedSiteLaneResultState.Open
      ? TemplateCompilerContextFamilyCompilationState.Open
      : TemplateCompilerContextFamilyCompilationState.Ineligible,
    'normalized-site-partition',
    summaries.join(' '),
    stableKeys,
  );
}

function unavailable(
  state: Exclude<TemplateCompilerContextFamilyCompilationState, TemplateCompilerContextFamilyCompilationState.Exact>,
  reasonKind: string,
  summary: string,
  stableKeys: readonly string[] = [],
): TemplateCompilerOccurrenceFamilyCompilationResult {
  return new TemplateCompilerOccurrenceFamilyCompilationResult(
    state,
    null,
    [new TemplateCompilerContextFamilyCompilationReason(
      TemplateCompilerContextFamilyCompilationStage.RootSiteRun,
      reasonKind,
      summary.length > 0 ? summary : reasonKind,
      stableKeys,
    )],
  );
}
