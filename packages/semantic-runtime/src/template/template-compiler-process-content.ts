import type { ClaimEndpointHandle } from '../kernel/claim.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  AU_SLOT_PROCESS_CONTENT_TARGET_NAME,
} from './au-slot-source.js';
import {
  AuSlotCompilerAttributeSnapshot,
  AuSlotCompilerChildSnapshot,
  AuSlotCompilerProcessContentInput,
  type AuSlotCompilerProcessContentPlan,
  isRuntimeHtmlAuSlotBuiltInResource,
  planAuSlotCompilerProcessContent,
} from './au-slot-compiler-semantics.js';
import {
  type TemplateCompilerObservedValue,
  TemplateCompilerReadKind,
  type TemplateCompilerReadView,
  TemplateCompilerScopeClosureState,
} from './compiler-read-view.js';
import {
  TemplateResourceResolutionKind,
  type TemplateResolvedResource,
} from './compiler-world.js';
import { TemplateResourceVisibilityKind } from './compiler-world-reference.js';
import { runtimeElementLookupName } from './runtime-dom-name.js';
import {
  TemplateCompilerCallableEffectOperationTarget,
  TemplateCompilerCallableReference,
  type TemplateCompilerExecutionSession,
  type TemplateCompilerInvocationBootstrapClosure,
  TemplateCompilerInvocationPhase,
  type TemplateCompilerNodeDetachmentMutation,
  TemplateCompilerOperationCompletion,
  TemplateCompilerOperationCompletionKind,
  TemplateCompilerOperationExecutionMechanism,
  TemplateCompilerOperationKind,
  type TemplateCompilerOperation,
  TemplateCompilerSiteExecutionDriverReference,
  type TemplateCompilerSiteExecutionFrontier,
} from './template-compiler-execution.js';
import {
  type TemplateCompilerAttributeOccurrence,
  TemplateCompilerElementOccurrence,
  type TemplateCompilerNodeOccurrence,
} from './template-compiler-occurrence.js';

const processContentPlanAuthority = {};
const processContentResultAuthority = {};

export const enum TemplateCompilerProcessContentPlanState {
  Exact = 'exact',
  Open = 'open',
}

export const enum TemplateCompilerProcessContentOpenReasonKind {
  ResourceReadOpen = 'resource-read-open',
  DefinitionOpen = 'definition-open',
  CallableOpen = 'callable-open',
  ArbitraryHook = 'arbitrary-hook',
}

export class TemplateCompilerProcessContentOpenReason {
  constructor(
    readonly reasonKind: TemplateCompilerProcessContentOpenReasonKind,
    readonly summary: string,
  ) {}
}

/** Runtime instruction metadata produced by the exact built-in AuSlot hook. */
export class TemplateCompilerProcessContentNameMetadata {
  constructor(readonly name: string) {}
}

export type TemplateCompilerProcessContentSiteAuthority =
  | TemplateCompilerInvocationBootstrapClosure
  | TemplateCompilerSiteExecutionDriverReference;

export interface TemplateCompilerProcessContentPlanningRequest {
  readonly execution: TemplateCompilerExecutionSession;
  readonly siteAuthority: TemplateCompilerProcessContentSiteAuthority;
  readonly compilerReads: TemplateCompilerReadView;
  readonly elementRead: TemplateCompilerObservedValue<TemplateResolvedResource | null>;
  readonly host: TemplateCompilerElementOccurrence;
}

/** Nominal event-time plan; Open plans never admit or retain a site driver. */
export class TemplateCompilerProcessContentPlan {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly state: TemplateCompilerProcessContentPlanState,
    readonly execution: TemplateCompilerExecutionSession,
    readonly bootstrapClosure: TemplateCompilerInvocationBootstrapClosure,
    readonly planningDriver: TemplateCompilerSiteExecutionDriverReference | null,
    readonly frontier: TemplateCompilerSiteExecutionFrontier,
    readonly compilerReads: TemplateCompilerReadView,
    readonly elementRead: TemplateCompilerObservedValue<TemplateResolvedResource | null>,
    readonly host: TemplateCompilerElementOccurrence,
    readonly definition: CustomElementDefinition | null,
    readonly callable: TemplateCompilerCallableReference | null,
    readonly auSlot: AuSlotCompilerProcessContentPlan<
      TemplateCompilerNodeOccurrence,
      TemplateCompilerAttributeOccurrence
    > | null,
    readonly metadata: TemplateCompilerProcessContentNameMetadata | null,
    readonly nameCarrier: TemplateCompilerAttributeOccurrence | null,
    readonly strictFalse: false | null,
    readonly openReason: TemplateCompilerProcessContentOpenReason | null,
    readonly forestMutationRevision: number,
    readonly globalOperationCount: number,
    readonly laneOperationCount: number,
  ) {
    if (
      authority !== processContentPlanAuthority
      || (state === TemplateCompilerProcessContentPlanState.Exact)
        !== (definition != null
          && callable != null
          && auSlot != null
          && metadata != null
          && strictFalse === false
          && openReason == null)
      || (state === TemplateCompilerProcessContentPlanState.Open) !== (openReason != null)
    ) {
      throw new Error('Template compiler processContent plan lost nominal exact/open ownership.');
    }
    this.#authority = authority;
  }

  isExact(): boolean {
    return this.#authority === processContentPlanAuthority
      && this.state === TemplateCompilerProcessContentPlanState.Exact;
  }
}

/** One committed direct-child removal in exact framework iteration order. */
export class TemplateCompilerProcessContentRemoval {
  constructor(
    readonly occurrence: TemplateCompilerNodeOccurrence,
    readonly liveOrdinal: number,
    readonly mutation: TemplateCompilerNodeDetachmentMutation,
  ) {}
}

/** Nominal exact execution result for one committed built-in processContent operation. */
export class TemplateCompilerProcessContentResult {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly plan: TemplateCompilerProcessContentPlan,
    readonly driver: TemplateCompilerSiteExecutionDriverReference,
    readonly operation: TemplateCompilerOperation,
    readonly metadata: TemplateCompilerProcessContentNameMetadata,
    readonly nameCarrier: TemplateCompilerAttributeOccurrence | null,
    readonly removals: readonly TemplateCompilerProcessContentRemoval[],
    readonly strictFalse: false,
  ) {
    const target = operation.target;
    const mutations = operation.mutationBatch.nodeDetachmentMutations;
    if (
      authority !== processContentResultAuthority
      || !plan.isExact()
      || plan.metadata !== metadata
      || plan.nameCarrier !== nameCarrier
      || driver.context !== operation.context
      || operation.operationKind !== TemplateCompilerOperationKind.ProcessContent
      || operation.executionMechanism !== TemplateCompilerOperationExecutionMechanism.BuiltIn
      || operation.completion.completionKind !== TemplateCompilerOperationCompletionKind.Complete
      || !(target instanceof TemplateCompilerCallableEffectOperationTarget)
      || target.actedOn.occurrence !== plan.host
      || removals.length !== mutations.length
      || removals.some((removal, ordinal) =>
        removal.mutation !== mutations[ordinal]
        || removal.occurrence !== removal.mutation.node
        || removal.liveOrdinal !== removal.mutation.previousOrdinal
      )
    ) {
      throw new Error('Template compiler processContent result lost operation, metadata, or removal authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === processContentResultAuthority;
  }

  get removedOccurrences(): readonly TemplateCompilerNodeOccurrence[] {
    return this.removals.map((removal) => removal.occurrence);
  }
}

/** Resolve one reached live processContent site without admitting a site driver. */
export function planTemplateCompilerProcessContent(
  request: TemplateCompilerProcessContentPlanningRequest,
): TemplateCompilerProcessContentPlan {
  const temporal = validatePlanningAuthority(request);
  const result = request.elementRead.value;
  const definition = result?.definition instanceof CustomElementDefinition
    ? result.definition
    : null;
  const currentRead = request.elementRead.observation.validate().isCurrent;
  const closedRead = currentRead
    && request.elementRead.observation.closure.state === TemplateCompilerScopeClosureState.Closed
    && result?.resolutionKind === TemplateResourceResolutionKind.Definition
    && result.resource?.visibilityKind !== TemplateResourceVisibilityKind.Open;
  if (!closedRead) {
    return openPlan(
      request,
      temporal,
      definition,
      TemplateCompilerProcessContentOpenReasonKind.ResourceReadOpen,
      'The reached element resource read is not one current closed full definition.',
    );
  }
  if (definition == null) {
    return openPlan(
      request,
      temporal,
      null,
      TemplateCompilerProcessContentOpenReasonKind.DefinitionOpen,
      'The reached processContent site has no full custom-element definition.',
    );
  }
  if (definition.processContent == null) {
    return openPlan(
      request,
      temporal,
      definition,
      TemplateCompilerProcessContentOpenReasonKind.CallableOpen,
      `Custom element '${definition.name}' has no exact processContent callable.`,
    );
  }
  if (!canonicalAuSlotDefinition(result, definition)) {
    return openPlan(
      request,
      temporal,
      definition,
      TemplateCompilerProcessContentOpenReasonKind.ArbitraryHook,
      `Custom element '${definition.name}' has an arbitrary processContent hook outside the exact built-in executor.`,
    );
  }
  if (definition.productHandle == null) {
    return openPlan(
      request,
      temporal,
      definition,
      TemplateCompilerProcessContentOpenReasonKind.DefinitionOpen,
      'Canonical AuSlot definition has no stable product cause for processContent execution.',
    );
  }

  const callable = callableReference(definition);
  if (callable == null) {
    return openPlan(
      request,
      temporal,
      definition,
      TemplateCompilerProcessContentOpenReasonKind.CallableOpen,
      'Canonical AuSlot processContent has no stable callable address or identity.',
    );
  }
  const auSlot = planAuSlotCompilerProcessContent(
    result.builtInResource,
    liveAuSlotInput(request.host),
  );
  if (auSlot == null) {
    throw new Error('Canonical AuSlot resource lost its shared compiler processContent plan.');
  }
  const metadata = new TemplateCompilerProcessContentNameMetadata(auSlot.name);
  return new TemplateCompilerProcessContentPlan(
    processContentPlanAuthority,
    TemplateCompilerProcessContentPlanState.Exact,
    request.execution,
    temporal.bootstrapClosure,
    temporal.driver,
    temporal.frontier,
    request.compilerReads,
    request.elementRead,
    request.host,
    definition,
    callable,
    auSlot,
    metadata,
    auSlot.nameAttribute?.attribute ?? null,
    false,
    null,
    temporal.forestMutationRevision,
    temporal.globalOperationCount,
    temporal.laneOperationCount,
  );
}

export interface TemplateCompilerProcessContentExecutionRequest {
  readonly plan: TemplateCompilerProcessContentPlan;
  readonly driver: TemplateCompilerSiteExecutionDriverReference;
}

/** Execute one exact built-in plan as one committed callable-effect operation. */
export function executeTemplateCompilerProcessContent(
  request: TemplateCompilerProcessContentExecutionRequest,
): TemplateCompilerProcessContentResult {
  const { plan, driver } = request;
  if (!plan.isExact() || plan.auSlot == null || plan.callable == null || plan.metadata == null || plan.definition == null) {
    throw new Error('Only one exact processContent plan can execute.');
  }
  const removalSchedule = validateExecutionDriver(plan, driver);
  const execution = plan.execution;
  const target = execution.callableEffectTarget(driver.context, plan.callable, plan.host);
  const attempt = execution.beginOperation({
    operationKey: `${driver.lane.localKey}:site:process-content:${plan.host.occurrenceKey}:${driver.expectedLaneOperationCount}`,
    context: driver.context,
    operationKind: TemplateCompilerOperationKind.ProcessContent,
    executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
    target,
    causeHandles: processContentCauseHandles(plan),
    sourceAddressHandle: plan.definition.processContent?.addressHandle ?? plan.definition.sourceAddressHandle,
    siteExecutionDriver: driver,
  });
  for (const removal of removalSchedule) {
    execution.detachDirectChild(attempt, plan.host, removal.liveOrdinal, removal.occurrence);
  }
  const operation = execution.completeOperation(
    attempt,
    new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete),
  );
  const removals = operation.mutationBatch.nodeDetachmentMutations.map((mutation) =>
    new TemplateCompilerProcessContentRemoval(mutation.node, mutation.previousOrdinal, mutation)
  );
  return new TemplateCompilerProcessContentResult(
    processContentResultAuthority,
    plan,
    driver,
    operation,
    plan.metadata,
    plan.nameCarrier,
    removals,
    false,
  );
}

class ProcessContentTemporalAuthority {
  constructor(
    readonly bootstrapClosure: TemplateCompilerInvocationBootstrapClosure,
    readonly driver: TemplateCompilerSiteExecutionDriverReference | null,
    readonly frontier: TemplateCompilerSiteExecutionFrontier,
    readonly forestMutationRevision: number,
    readonly globalOperationCount: number,
    readonly laneOperationCount: number,
  ) {}
}

function validatePlanningAuthority(
  request: TemplateCompilerProcessContentPlanningRequest,
): ProcessContentTemporalAuthority {
  const { execution, compilerReads, elementRead, host } = request;
  const driver = isSiteDriver(request.siteAuthority) ? request.siteAuthority : null;
  const bootstrapClosure = driver?.frontier.bootstrapClosure ?? request.siteAuthority;
  const lane = bootstrapClosure.lane;
  if (
    execution.bootstrapClosure(lane) !== bootstrapClosure
    || compilerReads.world !== bootstrapClosure.hookBootstrap.compilerWorld
    || elementRead.observation.readKind !== TemplateCompilerReadKind.ElementResource
    || elementRead.observation.compilerScopeIdentityHandle !== compilerReads.world.resourceScope.identityHandle
    || !compilerReads.readAll().includes(elementRead.observation)
    || compilerReads.readElement(liveElementLookupName(host)).observation !== elementRead.observation
    || execution.forest.nodeForOccurrenceKey(host.occurrenceKey) !== host
    || !belongsToInvocationContent(host, lane.compilerContent)
  ) {
    throw new Error('ProcessContent planning read, host, compiler world, or bootstrap authority is foreign.');
  }
  if (driver == null) {
    const frontier = execution.captureSiteExecutionFrontier(bootstrapClosure);
    return new ProcessContentTemporalAuthority(
      bootstrapClosure,
      null,
      frontier,
      frontier.forestMutationRevision,
      frontier.globalOperationCount,
      frontier.laneOperationCount,
    );
  }
  execution.assertCurrentSiteExecutionDriver(driver);
  return new ProcessContentTemporalAuthority(
    bootstrapClosure,
    driver,
    driver.frontier,
    driver.expectedForestMutationRevision,
    driver.expectedGlobalOperationCount,
    driver.expectedLaneOperationCount,
  );
}

function validateExecutionDriver(
  plan: TemplateCompilerProcessContentPlan,
  driver: TemplateCompilerSiteExecutionDriverReference,
): readonly ProcessContentPlannedRemoval[] {
  const execution = plan.execution;
  const lane = plan.bootstrapClosure.lane;
  const plannedChildren = plan.auSlot?.removedChildren ?? [];
  const removalSchedule = liveRemovalSchedule(plan.host, plannedChildren);
  execution.assertCurrentSiteExecutionDriver(driver);
  if (
    driver.lane !== lane
    || driver.context.bootstrapClosure !== plan.bootstrapClosure
    || (plan.planningDriver == null ? driver.frontier !== plan.frontier : driver !== plan.planningDriver)
    || execution.siteExecutionContext(lane) !== driver.context
    || execution.invocationPhase(lane) !== TemplateCompilerInvocationPhase.SiteExecution
    || execution.forest.mutationRevision !== plan.forestMutationRevision
    || driver.expectedForestMutationRevision !== plan.forestMutationRevision
    || driver.expectedGlobalOperationCount !== plan.globalOperationCount
    || driver.expectedLaneOperationCount !== plan.laneOperationCount
    || !plan.elementRead.observation.validate().isCurrent
    || execution.forest.nodeForOccurrenceKey(plan.host.occurrenceKey) !== plan.host
    || removalSchedule == null
  ) {
    throw new Error('ProcessContent execution plan or site driver is foreign, stale, or no longer current.');
  }
  return removalSchedule;
}

function openPlan(
  request: TemplateCompilerProcessContentPlanningRequest,
  temporal: ProcessContentTemporalAuthority,
  definition: CustomElementDefinition | null,
  reasonKind: TemplateCompilerProcessContentOpenReasonKind,
  summary: string,
): TemplateCompilerProcessContentPlan {
  return new TemplateCompilerProcessContentPlan(
    processContentPlanAuthority,
    TemplateCompilerProcessContentPlanState.Open,
    request.execution,
    temporal.bootstrapClosure,
    null,
    temporal.frontier,
    request.compilerReads,
    request.elementRead,
    request.host,
    definition,
    null,
    null,
    null,
    null,
    null,
    new TemplateCompilerProcessContentOpenReason(reasonKind, summary),
    temporal.forestMutationRevision,
    temporal.globalOperationCount,
    temporal.laneOperationCount,
  );
}

function canonicalAuSlotDefinition(
  result: TemplateResolvedResource,
  definition: CustomElementDefinition,
): boolean {
  const builtIn = result.builtInResource;
  return isRuntimeHtmlAuSlotBuiltInResource(builtIn)
    && builtIn.productHandle != null
    && result.resource?.resourceKind === ResourceDefinitionKind.CustomElement
    && result.resource.resourceProductHandle === builtIn.productHandle
    && result.resource.definitionProductHandle === definition.productHandle
    && definition.name === builtIn.name
    && definition.target.localName === builtIn.targetName
    && definition.processContent?.localName === AU_SLOT_PROCESS_CONTENT_TARGET_NAME;
}

function callableReference(definition: CustomElementDefinition): TemplateCompilerCallableReference | null {
  const callable = definition.processContent;
  if (callable == null) return null;
  const sourceAddress = callable.addressHandle ?? callable.declarationSourceAddressHandle;
  return callable.identityHandle == null && sourceAddress == null
    ? null
    : new TemplateCompilerCallableReference(null, callable.identityHandle, sourceAddress);
}

function liveAuSlotInput(
  host: TemplateCompilerElementOccurrence,
): AuSlotCompilerProcessContentInput<TemplateCompilerNodeOccurrence, TemplateCompilerAttributeOccurrence> {
  return new AuSlotCompilerProcessContentInput(
    liveAttributes(host),
    host.readChildren().map((child) => new AuSlotCompilerChildSnapshot(
      child,
      child instanceof TemplateCompilerElementOccurrence ? liveAttributes(child) : null,
    )),
  );
}

function liveAttributes(
  element: TemplateCompilerElementOccurrence,
): readonly AuSlotCompilerAttributeSnapshot<TemplateCompilerAttributeOccurrence>[] {
  return element.readAttributes().map((attribute) => new AuSlotCompilerAttributeSnapshot(
    attribute,
    qualifiedAttributeName(attribute),
    attribute.value,
    attribute.namespaceUri,
  ));
}

function liveElementLookupName(host: TemplateCompilerElementOccurrence): string {
  const asElement = host.readAttributes().find((attribute) => qualifiedAttributeName(attribute) === 'as-element');
  return runtimeElementLookupName(host.tagName, host.namespace, asElement?.value ?? null);
}

function qualifiedAttributeName(attribute: TemplateCompilerAttributeOccurrence): string {
  return attribute.prefix == null ? attribute.name : `${attribute.prefix}:${attribute.name}`;
}

function belongsToInvocationContent(
  host: TemplateCompilerNodeOccurrence,
  content: TemplateCompilerNodeOccurrence,
): boolean {
  let current: TemplateCompilerNodeOccurrence | null = host;
  while (current != null) {
    if (current === content) return true;
    current = current.parent;
  }
  return false;
}

function isSiteDriver(
  authority: TemplateCompilerProcessContentSiteAuthority,
): authority is TemplateCompilerSiteExecutionDriverReference {
  return authority instanceof TemplateCompilerSiteExecutionDriverReference;
}

function processContentCauseHandles(plan: TemplateCompilerProcessContentPlan): readonly ClaimEndpointHandle[] {
  const definition = plan.definition!;
  if (definition.productHandle == null) {
    throw new Error('Exact processContent definition has no product cause handle.');
  }
  const handles: ClaimEndpointHandle[] = [definition.productHandle];
  const builtInHandle = plan.auSlot?.builtInResource.productHandle ?? null;
  if (builtInHandle != null && !handles.includes(builtInHandle)) handles.push(builtInHandle);
  return handles;
}

class ProcessContentPlannedRemoval {
  constructor(
    readonly occurrence: TemplateCompilerNodeOccurrence,
    readonly liveOrdinal: number,
  ) {}
}

/** Derive every event-time live ordinal in one pass over the current direct-child width. */
function liveRemovalSchedule(
  host: TemplateCompilerElementOccurrence,
  plannedChildren: readonly TemplateCompilerNodeOccurrence[],
): readonly ProcessContentPlannedRemoval[] | null {
  const planned = new Set(plannedChildren);
  if (planned.size !== plannedChildren.length) return null;
  const schedule: ProcessContentPlannedRemoval[] = [];
  let nextPlannedOrdinal = 0;
  let liveOrdinal = 0;
  for (const child of host.readChildren()) {
    if (!planned.has(child)) {
      liveOrdinal++;
      continue;
    }
    if (plannedChildren[nextPlannedOrdinal++] !== child || child.parent !== host) return null;
    schedule.push(new ProcessContentPlannedRemoval(child, liveOrdinal));
  }
  return nextPlannedOrdinal === plannedChildren.length ? schedule : null;
}
