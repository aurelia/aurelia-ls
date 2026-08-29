import type { BrowserEffectiveTemplateEmission } from './browser-effective-template-materializer.js';
import type { CurrentnessAuthority } from '../kernel/generation-authority.js';
import {
  browserTemplateCorrespondenceMarkupDigest,
  browserTemplateCorrespondenceOccurrenceIdentityKey,
} from './browser-template-correspondence.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import type { CustomElementDefinition } from '../resources/custom-element-definition.js';
import type { TemplateCompilationUnitEmission } from './compilation-unit-materializer.js';
import type { TemplateSource } from './compilation-unit.js';
import type {
  TemplateCompilationFrontDoorEmission,
  TemplateCompilationFamilyFrontDoorEmission,
  TemplateCompilerOccurrencePrecedentEmission,
  TemplateResourceCompilationEmission,
} from './template-compilation-project-pass.js';
import {
  TemplateCompilerHookOperationStage,
  TemplateCompilerHookOperationTarget,
  TemplateCompilerInvocationPhase,
  type TemplateCompilerInvocationBootstrapClosure,
  TemplateCompilerOperationCompletionKind,
  TemplateCompilerOperationKind,
  type TemplateCompilerExecutionLaneReference,
  type TemplateCompilerExecutionSession,
} from './template-compiler-execution.js';
import { TemplateCompilerLocalExtractionState } from './template-compiler-local-extraction.js';
import type { TemplateCompilerOccurrenceForest } from './template-compiler-occurrence.js';
import {
  TemplateCompilerNormalizedSiteIndexState,
  type TemplateCompilerNormalizedSiteIndex,
  type TemplateCompilerNormalizedSiteIndexResult,
} from './template-compiler-normalized-site-index.js';

const siteInvocationBindingAuthority = {};
const occurrencePrecedentInvocationBindingAuthority = {};
const rootSiteInvocationIngressAuthority = {};

export const enum TemplateCompilerSiteInvocationMembershipLane {
  App = 'app',
  Authoring = 'authoring',
}

export const enum TemplateCompilerSiteInvocationBindingReasonKind {
  AppGenerationUnavailable = 'app-generation-unavailable',
  AppFrontDoorAuthorityMismatch = 'app-front-door-authority-mismatch',
  GraphPrecedentMismatch = 'graph-precedent-mismatch',
  CurrentFrontDoorMembershipMismatch = 'current-front-door-membership-mismatch',
  OccurrencePrecedentMembershipMismatch = 'occurrence-precedent-membership-mismatch',
  ExecutionClosureMismatch = 'execution-closure-mismatch',
  RootLaneMismatch = 'root-lane-mismatch',
  BootstrapMismatch = 'bootstrap-mismatch',
  CompilerWorldMismatch = 'compiler-world-mismatch',
  HookSetMismatch = 'hook-set-mismatch',
  LocalTemplatesUnsupported = 'local-templates-unsupported',
  BrowserTreeMismatch = 'browser-tree-mismatch',
  BrowserPublicationUnavailable = 'browser-publication-unavailable',
  BrowserSourceMismatch = 'browser-source-mismatch',
  BrowserMarkupMismatch = 'browser-markup-mismatch',
}

export const enum TemplateCompilerSiteInvocationIngressKind {
  RootBrowser = 'root-browser',
}

/** Exact browser-effective ingress for the execution forest's root invocation. */
export class TemplateCompilerRootSiteInvocationIngress {
  readonly ingressKind = TemplateCompilerSiteInvocationIngressKind.RootBrowser;
  readonly #authority: object;

  constructor(
    authority: object,
    readonly browserEmission: BrowserEffectiveTemplateEmission,
  ) {
    if (authority !== rootSiteInvocationIngressAuthority) {
      throw new Error('Root site invocation ingress is a module-constructed capability.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === rootSiteInvocationIngressAuthority;
  }
}

export type TemplateCompilerSiteInvocationIngress = TemplateCompilerRootSiteInvocationIngress;

function prepareTemplateCompilerRootSiteInvocationIngress(
  browserEmission: BrowserEffectiveTemplateEmission,
): TemplateCompilerRootSiteInvocationIngress {
  return new TemplateCompilerRootSiteInvocationIngress(rootSiteInvocationIngressAuthority, browserEmission);
}

interface TemplateCompilerSiteInvocationBindingRequest {
  readonly execution: TemplateCompilerExecutionSession;
  readonly bootstrapClosure: TemplateCompilerInvocationBootstrapClosure;
  readonly ingress: TemplateCompilerSiteInvocationIngress;
  readonly graphExact: TemplateCompilerNormalizedSiteIndexResult;
  readonly currentFrontDoor: TemplateCompilationFrontDoorEmission;
  readonly currentFamily: TemplateCompilationFamilyFrontDoorEmission;
}

/** Extracted lanes remain unsupported until occurrence-backed HTML ingress or an exact authored-site crosswalk exists. */
export const enum TemplateCompilerSiteInvocationFrontierKind {
  ExtractedOccurrenceIngressUnavailable = 'extracted-occurrence-ingress-unavailable',
}

export class TemplateCompilerSiteInvocationBindingReason {
  constructor(
    readonly reasonKind: TemplateCompilerSiteInvocationBindingReasonKind,
    readonly summary: string,
  ) {}
}

export interface TemplateCompilerRootSiteInvocationBindingRequest {
  readonly execution: TemplateCompilerExecutionSession;
  readonly bootstrapClosure: TemplateCompilerInvocationBootstrapClosure;
  readonly browserEmission: BrowserEffectiveTemplateEmission;
  readonly graphExact: TemplateCompilerNormalizedSiteIndexResult;
  readonly currentFrontDoor: TemplateCompilationFrontDoorEmission;
  readonly currentFamily: TemplateCompilationFamilyFrontDoorEmission;
}

export interface TemplateCompilerFrontDoorCurrentnessAuthority extends CurrentnessAuthority {
  ownsTemplateCompilerFrontDoor(frontDoor: TemplateCompilationFrontDoorEmission): boolean;
}

export interface TemplateCompilerRootOccurrencePrecedentInvocationBindingRequest {
  /** Current app generation that owns the supplied front door and family. */
  readonly appCurrentness: TemplateCompilerFrontDoorCurrentnessAuthority;
  readonly execution: TemplateCompilerExecutionSession;
  readonly bootstrapClosure: TemplateCompilerInvocationBootstrapClosure;
  readonly browserEmission: BrowserEffectiveTemplateEmission;
  readonly occurrencePrecedent: TemplateCompilerOccurrencePrecedentEmission;
  readonly currentFrontDoor: TemplateCompilationFrontDoorEmission;
  readonly currentFamily: TemplateCompilationFamilyFrontDoorEmission;
}

/**
 * Current raw-source authority for one root browser invocation, before a post-local traversal world is selected.
 *
 * Unlike `TemplateCompilerSiteInvocationBinding`, this capability may contain extracted child lanes. It proves only
 * normalized authored-site identity and bootstrap provenance; it does not authorize a cursor or claim that the
 * precedent's pre-local compiler world is the eventual traversal world.
 */
export class TemplateCompilerOccurrencePrecedentInvocationBinding {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly appCurrentness: TemplateCompilerFrontDoorCurrentnessAuthority,
    readonly execution: TemplateCompilerExecutionSession,
    readonly bootstrapClosure: TemplateCompilerInvocationBootstrapClosure,
    readonly ingress: TemplateCompilerRootSiteInvocationIngress,
    readonly occurrencePrecedent: TemplateCompilerOccurrencePrecedentEmission,
    readonly currentFrontDoor: TemplateCompilationFrontDoorEmission,
    readonly currentFamily: TemplateCompilationFamilyFrontDoorEmission,
    readonly membershipLane: TemplateCompilerSiteInvocationMembershipLane,
    private readonly exactIndex: TemplateCompilerNormalizedSiteIndex,
  ) {
    if (authority !== occurrencePrecedentInvocationBindingAuthority) {
      throw new Error('Occurrence-precedent invocation bindings are module-constructed capabilities.');
    }
    this.#authority = authority;
  }

  get lane(): TemplateCompilerExecutionLaneReference {
    return this.bootstrapClosure.lane;
  }

  get forest(): TemplateCompilerOccurrenceForest {
    return this.execution.forest;
  }

  get browserEmission(): BrowserEffectiveTemplateEmission {
    return this.ingress.browserEmission;
  }

  get graphExact(): TemplateCompilerNormalizedSiteIndexResult {
    return this.occurrencePrecedent.normalizedSites;
  }

  get index(): TemplateCompilerNormalizedSiteIndex {
    return this.exactIndex;
  }

  get compilation(): TemplateResourceCompilationEmission {
    return this.exactIndex.compilation;
  }

  get definition(): CustomElementDefinition {
    return this.exactIndex.definition;
  }

  get unit(): TemplateCompilationUnitEmission {
    return this.exactIndex.unit;
  }

  get source(): TemplateSource {
    return this.exactIndex.unit.templateSource;
  }

  get preLocalCompilerWorld(): TemplateCompilerWorldEmission {
    return this.occurrencePrecedent.preLocalCompilerWorld;
  }

  isModuleConstructed(): boolean {
    return this.#authority === occurrencePrecedentInvocationBindingAuthority;
  }

  /** App/browser lifetime only; lane-frontier currentness belongs to the later ingress consumer. */
  isCurrent(): boolean {
    return this.appCurrentness.isCurrent()
      && this.appCurrentness.ownsTemplateCompilerFrontDoor(this.currentFrontDoor)
      && this.browserEmission.publication.isCurrent();
  }
}

export const enum TemplateCompilerOccurrencePrecedentInvocationBindingState {
  Exact = 'exact',
  Open = 'open',
  Mismatch = 'mismatch',
}

export class TemplateCompilerOccurrencePrecedentInvocationBindingResult {
  readonly state: TemplateCompilerOccurrencePrecedentInvocationBindingState;

  constructor(
    readonly binding: TemplateCompilerOccurrencePrecedentInvocationBinding | null,
    readonly reasons: readonly TemplateCompilerSiteInvocationBindingReason[],
  ) {
    this.state = binding != null
      ? TemplateCompilerOccurrencePrecedentInvocationBindingState.Exact
      : reasons.length > 0 && reasons.every((entry) =>
          entry.reasonKind === TemplateCompilerSiteInvocationBindingReasonKind.AppGenerationUnavailable
          || entry.reasonKind === TemplateCompilerSiteInvocationBindingReasonKind.BrowserPublicationUnavailable
        )
        ? TemplateCompilerOccurrencePrecedentInvocationBindingState.Open
        : TemplateCompilerOccurrencePrecedentInvocationBindingState.Mismatch;
  }
}

/**
 * Nominal no-local invocation capability joining one event-time compiler invocation to current authored precedent.
 *
 * This is not a cursor, target plan, family-completion receipt, or extracted-lane capability. Browser correspondence
 * frontiers remain owned by the later cursor. All derived compiler facts come from the exact GraphExact index basis.
 */
export class TemplateCompilerSiteInvocationBinding {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly execution: TemplateCompilerExecutionSession,
    readonly bootstrapClosure: TemplateCompilerInvocationBootstrapClosure,
    readonly ingress: TemplateCompilerSiteInvocationIngress,
    readonly graphExact: TemplateCompilerNormalizedSiteIndexResult,
    readonly currentFrontDoor: TemplateCompilationFrontDoorEmission,
    readonly currentFamily: TemplateCompilationFamilyFrontDoorEmission,
    readonly membershipLane: TemplateCompilerSiteInvocationMembershipLane,
    private readonly exactIndex: TemplateCompilerNormalizedSiteIndex,
  ) {
    if (authority !== siteInvocationBindingAuthority) {
      throw new Error('Template compiler site invocation bindings are module-constructed capabilities.');
    }
    this.#authority = authority;
  }

  get lane(): TemplateCompilerExecutionLaneReference {
    return this.bootstrapClosure.lane;
  }

  get forest(): TemplateCompilerOccurrenceForest {
    return this.execution.forest;
  }

  get browserEmission(): BrowserEffectiveTemplateEmission {
    return this.ingress.browserEmission;
  }

  get index(): TemplateCompilerNormalizedSiteIndex {
    return this.exactIndex;
  }

  get compilation(): TemplateResourceCompilationEmission {
    return this.exactIndex.compilation;
  }

  get definition(): CustomElementDefinition {
    return this.exactIndex.definition;
  }

  get unit(): TemplateCompilationUnitEmission {
    return this.exactIndex.unit;
  }

  get source(): TemplateSource {
    return this.exactIndex.unit.templateSource;
  }

  get compilerWorld(): TemplateCompilerWorldEmission {
    return this.exactIndex.compilerWorld;
  }

  isModuleConstructed(): boolean {
    return this.#authority === siteInvocationBindingAuthority;
  }
}

export const enum TemplateCompilerSiteInvocationBindingState {
  Exact = 'exact',
  Mismatch = 'mismatch',
}

export class TemplateCompilerSiteInvocationBindingResult {
  readonly state: TemplateCompilerSiteInvocationBindingState;

  constructor(
    readonly binding: TemplateCompilerSiteInvocationBinding | null,
    readonly reasons: readonly TemplateCompilerSiteInvocationBindingReason[],
  ) {
    this.state = binding == null
      ? TemplateCompilerSiteInvocationBindingState.Mismatch
      : TemplateCompilerSiteInvocationBindingState.Exact;
  }
}

/** Bind one exact, current, no-local root invocation without admitting any cursor or structural output. */
export function bindTemplateCompilerRootSiteInvocation(
  request: TemplateCompilerRootSiteInvocationBindingRequest,
): TemplateCompilerSiteInvocationBindingResult {
  return bindTemplateCompilerSiteInvocation({
    execution: request.execution,
    bootstrapClosure: request.bootstrapClosure,
    ingress: prepareTemplateCompilerRootSiteInvocationIngress(request.browserEmission),
    graphExact: request.graphExact,
    currentFrontDoor: request.currentFrontDoor,
    currentFamily: request.currentFamily,
  });
}

/** Bind one current raw whole-source precedent to its exact root browser/bootstrap invocation. */
export function bindTemplateCompilerRootOccurrencePrecedentInvocation(
  request: TemplateCompilerRootOccurrencePrecedentInvocationBindingRequest,
): TemplateCompilerOccurrencePrecedentInvocationBindingResult {
  const reasons: TemplateCompilerSiteInvocationBindingReason[] = [];
  const graphExact = request.occurrencePrecedent.normalizedSites;
  const index = graphExact.state === TemplateCompilerNormalizedSiteIndexState.GraphExact
    ? graphExact.index
    : null;
  if (
    index == null
    || index.compilation !== index.basis.compilation
    || index.compilation !== request.occurrencePrecedent.compilation
  ) {
    reasons.push(reason(
      TemplateCompilerSiteInvocationBindingReasonKind.GraphPrecedentMismatch,
      'Occurrence invocation requires its retained raw precedent and exact normalized-site index.',
    ));
    return new TemplateCompilerOccurrencePrecedentInvocationBindingResult(null, reasons);
  }
  if (!request.appCurrentness.isCurrent()) {
    reasons.push(reason(
      TemplateCompilerSiteInvocationBindingReasonKind.AppGenerationUnavailable,
      'Occurrence precedent front-door membership belongs to a stale or unavailable app generation.',
    ));
  } else if (!request.appCurrentness.ownsTemplateCompilerFrontDoor(request.currentFrontDoor)) {
    reasons.push(reason(
      TemplateCompilerSiteInvocationBindingReasonKind.AppFrontDoorAuthorityMismatch,
      'Occurrence precedent front door does not belong to the supplied current app authority.',
    ));
  }

  const ingress = prepareTemplateCompilerRootSiteInvocationIngress(request.browserEmission);
  const membershipLane = validateCurrentOccurrencePrecedentMembership(request, reasons);
  const sharedRequest: TemplateCompilerSiteInvocationBindingRequest = {
    execution: request.execution,
    bootstrapClosure: request.bootstrapClosure,
    ingress,
    graphExact,
    currentFrontDoor: request.currentFrontDoor,
    currentFamily: request.currentFamily,
  };
  validateExecutionClosure(sharedRequest, reasons);
  validateRootExecutionIngress(sharedRequest, reasons);
  validateBootstrapAuthority(sharedRequest, index, reasons);
  validateRootBrowserInput(
    sharedRequest,
    index,
    request.occurrencePrecedent.sourceRevision,
    reasons,
  );
  if (reasons.length > 0 || membershipLane == null) {
    return new TemplateCompilerOccurrencePrecedentInvocationBindingResult(null, reasons);
  }
  return new TemplateCompilerOccurrencePrecedentInvocationBindingResult(
    new TemplateCompilerOccurrencePrecedentInvocationBinding(
      occurrencePrecedentInvocationBindingAuthority,
      request.appCurrentness,
      request.execution,
      request.bootstrapClosure,
      ingress,
      request.occurrencePrecedent,
      request.currentFrontDoor,
      request.currentFamily,
      membershipLane,
      index,
    ),
    [],
  );
}

/** Bind one exact current invocation through its explicit compiler-input ingress authority. */
function bindTemplateCompilerSiteInvocation(
  request: TemplateCompilerSiteInvocationBindingRequest,
): TemplateCompilerSiteInvocationBindingResult {
  const reasons: TemplateCompilerSiteInvocationBindingReason[] = [];
  const index = request.graphExact.state === TemplateCompilerNormalizedSiteIndexState.GraphExact
    ? request.graphExact.index
    : null;
  if (index == null || index.compilation !== index.basis.compilation) {
    reasons.push(reason(
      TemplateCompilerSiteInvocationBindingReasonKind.GraphPrecedentMismatch,
      'Invocation binding requires one GraphExact authored-precedent index and its exact retained compilation.',
    ));
    return new TemplateCompilerSiteInvocationBindingResult(null, reasons);
  }

  const membershipLane = validateCurrentMembership(request, index, reasons);
  validateExecutionClosure(request, reasons);
  validateRootExecutionIngress(request, reasons);
  validateBootstrapAuthority(request, index, reasons);
  validateNoLocalBootstrap(request, reasons);
  validateRootBrowserInput(
    request,
    index,
    index.definition.template?.authoredSourceRevision ?? null,
    reasons,
  );
  if (reasons.length > 0 || membershipLane == null) {
    return new TemplateCompilerSiteInvocationBindingResult(null, reasons);
  }
  return new TemplateCompilerSiteInvocationBindingResult(
    new TemplateCompilerSiteInvocationBinding(
      siteInvocationBindingAuthority,
      request.execution,
      request.bootstrapClosure,
      request.ingress,
      request.graphExact,
      request.currentFrontDoor,
      request.currentFamily,
      membershipLane,
      index,
    ),
    [],
  );
}

function validateCurrentMembership(
  request: TemplateCompilerSiteInvocationBindingRequest,
  index: TemplateCompilerNormalizedSiteIndex,
  reasons: TemplateCompilerSiteInvocationBindingReason[],
): TemplateCompilerSiteInvocationMembershipLane | null {
  const compilation = index.compilation;
  const family = request.currentFamily;
  const frontDoor = request.currentFrontDoor;
  const familyAppCount = occurrenceCount(family.appCompilations, compilation);
  const familyAuthoringCount = occurrenceCount(family.authoringCompilations, compilation);
  const frontDoorAppCount = occurrenceCount(frontDoor.appCompilations, compilation);
  const frontDoorAuthoringCount = occurrenceCount(frontDoor.authoringCompilations, compilation);
  const familyCount = occurrenceCount(frontDoor.families, family);
  const appMembership = familyAppCount === 1
    && familyAuthoringCount === 0
    && frontDoorAppCount === 1
    && frontDoorAuthoringCount === 0;
  const authoringMembership = familyAppCount === 0
    && familyAuthoringCount === 1
    && frontDoorAppCount === 0
    && frontDoorAuthoringCount === 1;
  if (
    frontDoor.familyForOwner(family.ownerHandle) !== family
    || familyCount !== 1
    || family.ownerHandle !== compilation.familyOwnerHandle
    || (!appMembership && !authoringMembership)
  ) {
    reasons.push(reason(
      TemplateCompilerSiteInvocationBindingReasonKind.CurrentFrontDoorMembershipMismatch,
      'GraphExact compilation is not one exact app/authoring member of the supplied current family and front door.',
    ));
    return null;
  }
  return appMembership
    ? TemplateCompilerSiteInvocationMembershipLane.App
    : TemplateCompilerSiteInvocationMembershipLane.Authoring;
}

function validateCurrentOccurrencePrecedentMembership(
  request: TemplateCompilerRootOccurrencePrecedentInvocationBindingRequest,
  reasons: TemplateCompilerSiteInvocationBindingReason[],
): TemplateCompilerSiteInvocationMembershipLane | null {
  const precedent = request.occurrencePrecedent;
  const family = request.currentFamily;
  const frontDoor = request.currentFrontDoor;
  const familyAppCount = occurrenceCount(family.appOccurrencePrecedents, precedent);
  const familyAuthoringCount = occurrenceCount(family.authoringOccurrencePrecedents, precedent);
  const familyCount = occurrenceCount(frontDoor.families, family);
  const appMembership = familyAppCount === 1 && familyAuthoringCount === 0;
  const authoringMembership = familyAppCount === 0 && familyAuthoringCount === 1;
  if (
    !family.occurrencePrecedentsRequested
    || frontDoor.familyForOwner(family.ownerHandle) !== family
    || familyCount !== 1
    || family.ownerHandle !== precedent.compilation.familyOwnerHandle
    || (!appMembership && !authoringMembership)
  ) {
    reasons.push(reason(
      TemplateCompilerSiteInvocationBindingReasonKind.OccurrencePrecedentMembershipMismatch,
      'Raw occurrence precedent is not one exact app/authoring member of the supplied current family and front door.',
    ));
    return null;
  }
  return appMembership
    ? TemplateCompilerSiteInvocationMembershipLane.App
    : TemplateCompilerSiteInvocationMembershipLane.Authoring;
}

function validateExecutionClosure(
  request: TemplateCompilerSiteInvocationBindingRequest,
  reasons: TemplateCompilerSiteInvocationBindingReason[],
): void {
  const { execution, bootstrapClosure: closure } = request;
  const lane = closure.lane;
  const lanes = execution.sequence.readLanes();
  const laneIsOwned = lanes.includes(lane);
  const closureIsStored = laneIsOwned && execution.bootstrapClosure(lane) === closure;
  const phaseIsClosed = laneIsOwned
    && execution.invocationPhase(lane) === TemplateCompilerInvocationPhase.BootstrapClosed;
  const laneOperations = laneIsOwned ? execution.sequence.readLaneOperations(lane) : [];
  if (
    !closureIsStored
    || !phaseIsClosed
    || lane.targetPlan != null
    || laneOperations.length !== closure.laneOperationCount
    || execution.forest.mutationRevision !== closure.forestMutationRevision
  ) {
    reasons.push(reason(
      TemplateCompilerSiteInvocationBindingReasonKind.ExecutionClosureMismatch,
      'Invocation closure is not the exact stored same-lane bootstrap frontier before target admission.',
    ));
  }
}

function validateRootExecutionIngress(
  request: TemplateCompilerSiteInvocationBindingRequest,
  reasons: TemplateCompilerSiteInvocationBindingReason[],
): void {
  const { execution, bootstrapClosure: closure } = request;
  const lane = closure.lane;
  const lanes = execution.sequence.readLanes();
  const noContexts = execution.sequence.readContexts().length === 0
    && execution.structuralExecution == null;
  const roots = execution.forest.readRoots();
  if (
    !request.ingress.isModuleConstructed()
    || request.ingress.ingressKind !== TemplateCompilerSiteInvocationIngressKind.RootBrowser
    || lanes[0] !== lane
    || lane.ordinal !== 0
    || !noContexts
    || roots.length !== 1
    || roots[0] !== execution.forest.compilerCarrier
    || lane.compilerCarrier !== execution.forest.compilerCarrier
    || lane.compilerContent !== execution.forest.compilerContent
  ) {
    reasons.push(reason(
      TemplateCompilerSiteInvocationBindingReasonKind.RootLaneMismatch,
      'Bootstrap closure lane is not the execution forest root carrier/content invocation.',
    ));
  }
}

function validateBootstrapAuthority(
  request: TemplateCompilerSiteInvocationBindingRequest,
  index: TemplateCompilerNormalizedSiteIndex,
  reasons: TemplateCompilerSiteInvocationBindingReason[],
): void {
  const closure = request.bootstrapClosure;
  const hook = closure.hookBootstrap;
  const local = closure.localExtraction;
  if (
    !hook.isExact()
    || !local.isExact()
    || hook.lane !== closure.lane
    || local.lane !== closure.lane
    || local.failure != null
  ) {
    reasons.push(reason(
      TemplateCompilerSiteInvocationBindingReasonKind.BootstrapMismatch,
      'Stored hook/local bootstrap results are not exact, same-lane, failure-free invocation receipts.',
    ));
  }
  if (hook.compilerWorld !== index.compilerWorld) {
    reasons.push(reason(
      TemplateCompilerSiteInvocationBindingReasonKind.CompilerWorldMismatch,
      'Hook bootstrap compiler world is not the exact normalized precedent compiler-world object.',
    ));
  }
  const firstOperation = hook.operations[0] ?? null;
  if (
    firstOperation == null
    || firstOperation.operationKind !== TemplateCompilerOperationKind.CompilerHook
    || firstOperation.completion.completionKind !== TemplateCompilerOperationCompletionKind.Complete
    || !(firstOperation.target instanceof TemplateCompilerHookOperationTarget)
    || firstOperation.target.operationStage !== TemplateCompilerHookOperationStage.HookSetResolution
    || firstOperation.target.entryOrdinal != null
    || firstOperation.target.callable != null
    || firstOperation.target.hookSet !== index.compilerWorld.compilerHooks
  ) {
    reasons.push(reason(
      TemplateCompilerSiteInvocationBindingReasonKind.HookSetMismatch,
      'First exact bootstrap operation does not resolve the normalized world\'s exact hook set.',
    ));
  }
}

function validateNoLocalBootstrap(
  request: TemplateCompilerSiteInvocationBindingRequest,
  reasons: TemplateCompilerSiteInvocationBindingReason[],
): void {
  const closure = request.bootstrapClosure;
  const local = closure.localExtraction;
  if (
    local.state !== TemplateCompilerLocalExtractionState.NoLocalTemplates
    || local.operations.length !== 0
    || local.completedExtractions.length !== 0
    || local.handoff != null
    || closure.childLaneTransfers.length !== 0
  ) {
    reasons.push(reason(
      TemplateCompilerSiteInvocationBindingReasonKind.LocalTemplatesUnsupported,
      'Only no-local invocations are supported; extracted lanes require occurrence-backed compilation ingress.',
    ));
  }
}

function validateRootBrowserInput(
  request: TemplateCompilerSiteInvocationBindingRequest,
  index: TemplateCompilerNormalizedSiteIndex,
  expectedSourceRevision: string | null,
  reasons: TemplateCompilerSiteInvocationBindingReason[],
): void {
  const browser = request.ingress.browserEmission;
  const forestTree = request.execution.forest.inputTree;
  const browserTree = browser.tree;
  if (!browser.isModuleConstructed() || !browser.publication.isCurrent()) {
    reasons.push(reason(
      TemplateCompilerSiteInvocationBindingReasonKind.BrowserPublicationUnavailable,
      'Browser-effective input does not retain one current module-owned publication candidate.',
    ));
  }
  if (
    forestTree.productHandle !== browserTree.productHandle
    || forestTree.identityHandle !== browserTree.identityHandle
    || forestTree.addressHandle !== browserTree.sourceAddressHandle
    || forestTree.treeKind !== browserTree.treeKind
  ) {
    reasons.push(reason(
      TemplateCompilerSiteInvocationBindingReasonKind.BrowserTreeMismatch,
      'Execution forest input tree is not the exact supplied browser-effective structural tree.',
    ));
  }
  const source = index.unit.templateSource;
  const browserSource = browserTree.templateSource;
  const expectedOccurrenceIdentity = browserTemplateCorrespondenceOccurrenceIdentityKey(source.identityHandle);
  if (
    !sameTemplateSourceReference(browserSource, source)
    || browser.correspondence.templateIdentity !== source.identityHandle
    || browser.correspondence.occurrenceIdentityKey !== expectedOccurrenceIdentity
    || expectedSourceRevision == null
    || browser.correspondence.sourceRevision !== expectedSourceRevision
  ) {
    reasons.push(reason(
      TemplateCompilerSiteInvocationBindingReasonKind.BrowserSourceMismatch,
      'Browser correspondence and GraphExact compilation do not retain one exact source identity/revision/reference.',
    ));
  }
  const markup = source.markup;
  if (
    markup == null
    || browser.correspondence.markupDigest !== browserTemplateCorrespondenceMarkupDigest(markup)
  ) {
    reasons.push(reason(
      TemplateCompilerSiteInvocationBindingReasonKind.BrowserMarkupMismatch,
      'Browser correspondence identity/digest does not match the non-null GraphExact source identity and markup.',
    ));
  }
}

function sameTemplateSourceReference(
  browser: BrowserEffectiveTemplateEmission['tree']['templateSource'],
  compiler: TemplateSource,
): boolean {
  return browser.productHandle === compiler.productHandle
    && browser.identityHandle === compiler.identityHandle
    && browser.sourceKind === compiler.sourceKind
    && browser.phase === compiler.phase
    && browser.templateAddressHandle === compiler.templateAddressHandle
    && browser.sourceAddressHandle === compiler.sourceAddressHandle;
}

function occurrenceCount<TValue>(values: readonly TValue[], expected: TValue): number {
  let count = 0;
  for (const value of values) {
    if (value === expected) count++;
  }
  return count;
}

function reason(
  reasonKind: TemplateCompilerSiteInvocationBindingReasonKind,
  summary: string,
): TemplateCompilerSiteInvocationBindingReason {
  return new TemplateCompilerSiteInvocationBindingReason(reasonKind, summary);
}
