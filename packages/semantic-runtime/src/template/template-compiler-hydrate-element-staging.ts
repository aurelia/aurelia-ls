import type { AddressHandle } from '../kernel/handles.js';
import {
  CustomElementDefinition,
  customElementRequiresShadowHost,
} from '../resources/custom-element-definition.js';
import { TemplateResourceVisibilityKind } from './compiler-world-reference.js';
import type { TemplateVisibleResourceReference } from './compiler-world-reference.js';
import {
  TemplateCompilerReadKind,
  type TemplateCompilerObservedValue,
  type TemplateCompilerReadObservation,
  type TemplateCompilerReadView,
  TemplateCompilerScopeClosureState,
} from './compiler-read-view.js';
import {
  TemplateResourceResolutionKind,
  type TemplateResolvedResource,
} from './compiler-world.js';
import { HtmlNamespaceKind, type HtmlElement } from './html-ir.js';
import { AuSlotProcessContentInstructionData } from './instruction-ir.js';
import type { TemplateInstruction } from './instruction-ir.js';
import {
  TemplateCompilerElementInstructionStagingState,
} from './template-compiler-instruction-staging.js';
import type { TemplateCompilerLiveAttributeOwnerResult } from './template-compiler-live-attribute-assembly.js';
import {
  TemplateCompilerLiveAttributeCompletion,
  TemplateCompilerLiveAttributeStructuralEffectKind,
} from './template-compiler-live-attribute-assembly.js';
import type { TemplateCompilerLiveElementInstructionStagingResult } from './template-compiler-live-instruction-staging.js';
import type {
  TemplateCompilerProcessContentResult,
} from './template-compiler-process-content.js';
import {
  TemplateCompilerElementOccurrence,
  TemplateCompilerTextOccurrence,
  type TemplateCompilerAttributeOccurrence,
  type TemplateCompilerNodeOccurrence,
} from './template-compiler-occurrence.js';
import { runtimeElementResourceName } from './runtime-dom-name.js';
import {
  groupTemplateCompilerProjectionChildren,
  TemplateCompilerProjectionChildSnapshot,
  type TemplateCompilerProjectionGroupingPlan,
  TemplateCompilerProjectionGroupingInput,
} from './template-compiler-projection-grouping.js';

const hydrateElementStagingAuthority = {};

export const enum TemplateCompilerHydrateElementStagingState {
  NotApplicable = 'not-applicable',
  Exact = 'exact',
  Pending = 'pending',
  Open = 'open',
  Invalid = 'invalid',
}

export const enum TemplateCompilerHydrateElementBlockerScope {
  Envelope = 'envelope',
  Downstream = 'downstream',
}

export const enum TemplateCompilerHydrateElementBlockerKind {
  ElementReadForeign = 'element-read-foreign',
  ElementReadStale = 'element-read-stale',
  ElementScopeOpen = 'element-scope-open',
  HeaderOnlyDefinition = 'header-only-definition',
  OwnerAuthorityMismatch = 'owner-authority-mismatch',
  OwnerCompilerReadsOpen = 'owner-compiler-reads-open',
  OwnerAssemblyOpen = 'owner-assembly-open',
  OwnerAssemblyInvalid = 'owner-assembly-invalid',
  OwnerInstructionStagingOpen = 'owner-instruction-staging-open',
  ResolveResourcesReadMissing = 'resolve-resources-read-missing',
  ResolveResourcesReadForeign = 'resolve-resources-read-foreign',
  ResolveResourcesReadStale = 'resolve-resources-read-stale',
  ResolveResourcesScopeOpen = 'resolve-resources-scope-open',
  BindableInstructionOwnershipMismatch = 'bindable-instruction-ownership-mismatch',
  CaptureSyntaxPublicationPending = 'capture-syntax-publication-pending',
  ProcessContentExecutionRequired = 'process-content-execution-required',
  ProcessContentResultForeign = 'process-content-result-foreign',
  ProcessContentNameSourceAuthorityOpen = 'process-content-name-source-authority-open',
  ProjectionExtractionPending = 'projection-extraction-pending',
  SourceAuthorityOpen = 'source-authority-open',
  ForestMutationRevisionDrift = 'forest-mutation-revision-drift',
  OperationEndpointDrift = 'operation-endpoint-drift',
  ContainerlessShadowHostInvalid = 'containerless-shadow-host-invalid',
  TemplateControllerPlacementPending = 'template-controller-placement-pending',
  ContainerlessPlacementPending = 'containerless-placement-pending',
  TargetRowPlacementPending = 'target-row-placement-pending',
}

export class TemplateCompilerHydrateElementBlocker {
  constructor(
    readonly blockerKind: TemplateCompilerHydrateElementBlockerKind,
    readonly scope: TemplateCompilerHydrateElementBlockerScope,
    readonly summary: string,
  ) {}
}

export const enum TemplateCompilerHydrateElementProcessContentState {
  Absent = 'absent',
  Exact = 'exact',
  Required = 'required',
  Foreign = 'foreign',
}

export class TemplateCompilerHydrateElementProcessContentDraft {
  constructor(
    readonly state: TemplateCompilerHydrateElementProcessContentState,
    /** Framework wire data only. */
    readonly metadata: AuSlotProcessContentInstructionData | null,
    /** Audit/replay carrier kept out of framework wire metadata. */
    readonly result: TemplateCompilerProcessContentResult | null,
  ) {}
}

export const enum TemplateCompilerHydrateElementProjectionState {
  None = 'none',
  PendingExtraction = 'pending-extraction',
}

export class TemplateCompilerHydrateElementProjectionDraft {
  constructor(
    readonly state: TemplateCompilerHydrateElementProjectionState,
    readonly postProcessChildren: readonly TemplateCompilerNodeOccurrence[],
    readonly grouping: TemplateCompilerProjectionGroupingPlan<
      TemplateCompilerNodeOccurrence,
      TemplateCompilerAttributeOccurrence
    >,
  ) {
    const groupedChildren = [
      ...grouping.extractedContributors.map((contributor) => contributor.node),
      ...grouping.residualChildren.map((child) => child.node),
    ];
    const groupedChildSet = new Set(groupedChildren);
    if (
      (state === TemplateCompilerHydrateElementProjectionState.PendingExtraction)
        !== (grouping.extractedContributors.length > 0)
      || groupedChildren.length !== postProcessChildren.length
      || groupedChildSet.size !== groupedChildren.length
      || postProcessChildren.some((child) => !groupedChildSet.has(child))
    ) {
      throw new Error('HydrateElement projection draft lost child grouping or extraction state authority.');
    }
  }
}

export class TemplateCompilerHydrateElementContainerlessDraft {
  constructor(
    readonly effective: boolean,
    readonly fromDefinition: boolean,
    readonly fromUsage: boolean,
  ) {}
}

export class TemplateCompilerHydrateElementSourceDraft {
  constructor(
    readonly authoredElement: HtmlElement | null,
    readonly inputAddressHandle: AddressHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly hasGenerationCause: boolean,
  ) {}
}

export class TemplateCompilerHydrateElementExecutionEndpointDraft {
  constructor(
    readonly forestMutationRevision: number,
    readonly globalOperationCount: number,
    readonly laneOperationCount: number,
  ) {}
}

/** Closed semantic fields for one reached custom-element envelope; no instruction handle is allocated here. */
export class TemplateCompilerHydrateElementEnvelopeDraft {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly siteKey: string,
    readonly element: TemplateCompilerElementOccurrence,
    readonly owner: TemplateCompilerLiveAttributeOwnerResult,
    readonly elementRead: TemplateCompilerObservedValue<TemplateResolvedResource | null>,
    readonly resolveResourcesRead: TemplateCompilerObservedValue<boolean>,
    readonly definition: CustomElementDefinition,
    readonly elementName: string,
    readonly resourceLookupName: string,
    readonly resource: TemplateVisibleResourceReference | null,
    readonly bindableInstructions: readonly TemplateInstruction[],
    readonly captures: TemplateCompilerLiveElementInstructionStagingResult['captures'],
    readonly processContent: TemplateCompilerHydrateElementProcessContentDraft,
    readonly projection: TemplateCompilerHydrateElementProjectionDraft,
    readonly containerless: TemplateCompilerHydrateElementContainerlessDraft,
    readonly source: TemplateCompilerHydrateElementSourceDraft,
    readonly endpoint: TemplateCompilerHydrateElementExecutionEndpointDraft,
  ) {
    if (
      authority !== hydrateElementStagingAuthority
      || owner.element !== element
      || owner.instructionStaging.elementBindableInstructions !== bindableInstructions
      || owner.instructionStaging.captures !== captures
      || definition.name !== elementName
    ) {
      throw new Error('HydrateElement envelope draft lost reached owner, definition, or instruction staging authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === hydrateElementStagingAuthority;
  }
}

export class TemplateCompilerHydrateElementStagingResult {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly state: TemplateCompilerHydrateElementStagingState,
    readonly element: TemplateCompilerElementOccurrence,
    readonly owner: TemplateCompilerLiveAttributeOwnerResult,
    readonly draft: TemplateCompilerHydrateElementEnvelopeDraft | null,
    readonly blockers: readonly TemplateCompilerHydrateElementBlocker[],
    readonly compilerReads: readonly TemplateCompilerReadObservation[],
  ) {
    const envelopeBlockers = blockers.filter(isEnvelopeBlocker);
    const invalid = envelopeBlockers.some(isInvalidBlocker);
    if (
      authority !== hydrateElementStagingAuthority
      || owner.element !== element
      || (state === TemplateCompilerHydrateElementStagingState.NotApplicable) !== (draft == null && blockers.length === 0)
      || (state === TemplateCompilerHydrateElementStagingState.Exact) !== (draft != null && envelopeBlockers.length === 0)
      || (state === TemplateCompilerHydrateElementStagingState.Pending) !== (
        draft != null
        && envelopeBlockers.length > 0
        && !invalid
      )
      || (state === TemplateCompilerHydrateElementStagingState.Invalid) !== invalid
      || (state === TemplateCompilerHydrateElementStagingState.Open) !== (
        draft == null && blockers.length > 0 && !invalid
      )
    ) {
      throw new Error('HydrateElement staging result lost exact/pending/open/invalid ownership.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === hydrateElementStagingAuthority;
  }

  get instructionReady(): boolean {
    // Downstream identity/row placement work does not make already-closed instruction fields semantically unknown.
    return this.state === TemplateCompilerHydrateElementStagingState.Exact;
  }
}

export interface TemplateCompilerHydrateElementStagingRequest {
  readonly familyOwnerKey: string;
  readonly compilerReads: TemplateCompilerReadView;
  readonly element: TemplateCompilerElementOccurrence;
  readonly lookupName: string;
  readonly elementRead: TemplateCompilerObservedValue<TemplateResolvedResource | null>;
  readonly resolveResourcesRead: TemplateCompilerObservedValue<boolean> | null;
  readonly owner: TemplateCompilerLiveAttributeOwnerResult;
  readonly processContent: TemplateCompilerProcessContentResult | null;
  readonly postProcessChildren: readonly TemplateCompilerNodeOccurrence[];
  readonly forestMutationRevision: number;
  readonly expectedForestMutationRevision: number;
  readonly globalOperationCount: number;
  readonly expectedGlobalOperationCount: number;
  readonly laneOperationCount: number;
  readonly expectedLaneOperationCount: number;
}

/** Close HydrateElement semantic fields without allocating an instruction or creating target rows. */
export function stageTemplateCompilerHydrateElementEnvelope(
  request: TemplateCompilerHydrateElementStagingRequest,
): TemplateCompilerHydrateElementStagingResult {
  const reads: TemplateCompilerReadObservation[] = [
    request.elementRead.observation,
    ...(request.resolveResourcesRead == null ? [] : [request.resolveResourcesRead.observation]),
  ];
  const blockers: TemplateCompilerHydrateElementBlocker[] = [];
  const read = request.elementRead;
  if (!elementReadBelongsToRequest(request)) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.ElementReadForeign,
      'Element resource read does not belong to this lookup, compiler scope, or reached read view.',
    ));
    return openResult(request, blockers, reads);
  }
  if (!read.observation.validate().isCurrent) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.ElementReadStale,
      'Element resource read is no longer current.',
    ));
    return openResult(request, blockers, reads);
  }
  if (read.observation.closure.state !== TemplateCompilerScopeClosureState.Closed) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.ElementScopeOpen,
      'Element resource read does not own one closed compiler scope.',
    ));
    return openResult(request, blockers, reads);
  }
  if (read.value == null) {
    return new TemplateCompilerHydrateElementStagingResult(
      hydrateElementStagingAuthority,
      TemplateCompilerHydrateElementStagingState.NotApplicable,
      request.element,
      request.owner,
      null,
      [],
      reads,
    );
  }
  if (request.resolveResourcesRead == null) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.ResolveResourcesReadMissing,
      'Custom-element envelope staging requires the paired resolveResources compiler read.',
    ));
    return openResult(request, blockers, reads);
  }
  if (!resolveResourcesReadBelongsToRequest(request)) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.ResolveResourcesReadForeign,
      'resolveResources read belongs to another compiler scope or read view.',
    ));
    return openResult(request, blockers, reads);
  }
  if (!request.resolveResourcesRead.observation.validate().isCurrent) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.ResolveResourcesReadStale,
      'resolveResources read is no longer current.',
    ));
    return openResult(request, blockers, reads);
  }
  if (request.resolveResourcesRead.observation.closure.state !== TemplateCompilerScopeClosureState.Closed) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.ResolveResourcesScopeOpen,
      'resolveResources read does not own one closed compiler scope.',
    ));
    return openResult(request, blockers, reads);
  }

  const resolution = read.value;
  const definition = resolution.definition instanceof CustomElementDefinition
    ? resolution.definition
    : null;
  if (
    definition == null
    || resolution.resolutionKind !== TemplateResourceResolutionKind.Definition
    || resolution.resource == null
    || resolution.resource.visibilityKind === TemplateResourceVisibilityKind.Open
    || resolution.resource.definitionProductHandle !== definition.productHandle
  ) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.HeaderOnlyDefinition,
      'Element lookup did not close over one visible full custom-element definition.',
    ));
    return openResult(request, blockers, reads);
  }
  const ownerReads = request.owner.compilerReads();
  for (const ownerRead of ownerReads) retainRead(reads, ownerRead);
  if (
    request.owner.element !== request.element
    || request.owner.lookupName !== request.lookupName
  ) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.OwnerAuthorityMismatch,
      'Live attribute owner belongs to another reached element or effective lookup name.',
    ));
    return openResult(request, blockers, reads);
  }
  if (ownerReads.some((ownerRead) =>
    !request.compilerReads.readAll().includes(ownerRead)
    || ownerRead.closure.state !== TemplateCompilerScopeClosureState.Closed
    || !ownerRead.validate().isCurrent
  )) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.OwnerCompilerReadsOpen,
      'Live attribute owner does not retain only current closed reads from this compiler read view.',
    ));
    return openResult(request, blockers, reads);
  }
  if (request.owner.completion === TemplateCompilerLiveAttributeCompletion.Open) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.OwnerAssemblyOpen,
      'Live attribute owner assembly remained open.',
    ));
    return openResult(request, blockers, reads);
  }
  if (request.owner.completion === TemplateCompilerLiveAttributeCompletion.Invalid) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.OwnerAssemblyInvalid,
      'Live attribute owner assembly is invalid.',
    ));
  }
  if (request.owner.instructionStaging.state !== TemplateCompilerElementInstructionStagingState.Complete) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.OwnerInstructionStagingOpen,
      'Live owner instruction staging is not complete.',
    ));
  }
  if (
    request.owner.element !== request.element
    || request.owner.instructionStaging.finalOwnerView !== request.owner.finalOwnerView
    || request.owner.instructionStaging.elementBindableInstructions.some((instruction) =>
      !request.owner.instructionStaging.instructions.includes(instruction)
    )
  ) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.BindableInstructionOwnershipMismatch,
      'Bindable instructions or final owner view belong to another owner staging result.',
    ));
  }
  if (!sameOccurrenceSequence(request.postProcessChildren, request.element.readChildren())) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.ForestMutationRevisionDrift,
      'Post-process child snapshot no longer matches the live occurrence forest.',
    ));
  }
  if (request.forestMutationRevision !== request.expectedForestMutationRevision) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.ForestMutationRevisionDrift,
      'Compiler forest mutation revision differs from the cursor-owned expected endpoint.',
    ));
  }
  if (
    request.globalOperationCount !== request.expectedGlobalOperationCount
    || request.laneOperationCount !== request.expectedLaneOperationCount
  ) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.OperationEndpointDrift,
      'Compiler global or lane operation count differs from the cursor-owned expected endpoint.',
    ));
  }

  const processContent = processContentDraft(request, definition, blockers);
  if (
    processContent.state === TemplateCompilerHydrateElementProcessContentState.Required
    || processContent.state === TemplateCompilerHydrateElementProcessContentState.Foreign
  ) {
    return openResult(request, blockers, reads);
  }
  const projection = projectionDraft(request.element, request.postProcessChildren, definition, blockers);
  const fromUsage = request.owner.structuralEffects.includes(
    TemplateCompilerLiveAttributeStructuralEffectKind.UsageContainerless,
  );
  const fromDefinition = definition.containerless === true;
  const containerless = new TemplateCompilerHydrateElementContainerlessDraft(
    fromDefinition || fromUsage,
    fromDefinition,
    fromUsage,
  );
  if (containerless.effective) {
    blockers.push(downstreamBlocker(
      TemplateCompilerHydrateElementBlockerKind.ContainerlessPlacementPending,
      'Containerless target placement remains a downstream structural join.',
    ));
  }
  if (
    containerless.effective
    && customElementRequiresShadowHost(definition.shadowOptions, definition.hasSlots)
  ) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.ContainerlessShadowHostInvalid,
      'Containerless custom elements are incompatible with native shadow DOM or native slot projection.',
    ));
  }
  if (request.owner.instructionStaging.templateControllers.length > 0) {
    blockers.push(downstreamBlocker(
      TemplateCompilerHydrateElementBlockerKind.TemplateControllerPlacementPending,
      'Template-controller context placement remains a downstream structural join.',
    ));
  }
  blockers.push(downstreamBlocker(
    TemplateCompilerHydrateElementBlockerKind.TargetRowPlacementPending,
    'HydrateElement target-row placement is intentionally outside envelope staging.',
  ));
  if (request.owner.instructionStaging.captures.length > 0) {
    blockers.push(downstreamBlocker(
      TemplateCompilerHydrateElementBlockerKind.CaptureSyntaxPublicationPending,
      'Capture syntax is exact; stable product handles await the instruction publication boundary.',
    ));
  }

  const source = sourceDraft(request);
  if (
    source.authoredElement == null
    && source.inputAddressHandle == null
    && !source.hasGenerationCause
  ) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.SourceAuthorityOpen,
      'Reached element has no authored, browser-structural, or generated source cause.',
    ));
  }
  const draft = new TemplateCompilerHydrateElementEnvelopeDraft(
    hydrateElementStagingAuthority,
    `family:${request.familyOwnerKey}:element:${request.element.occurrenceKey}:hydrate-element`,
    request.element,
    request.owner,
    request.elementRead,
    request.resolveResourcesRead,
    definition,
    definition.name,
    request.lookupName,
    request.resolveResourcesRead.value ? resolution.resource.toReference() : null,
    request.owner.instructionStaging.elementBindableInstructions,
    request.owner.instructionStaging.captures,
    processContent,
    projection,
    containerless,
    source,
    new TemplateCompilerHydrateElementExecutionEndpointDraft(
      request.forestMutationRevision,
      request.globalOperationCount,
      request.laneOperationCount,
    ),
  );
  const envelopeBlockers = blockers.filter(isEnvelopeBlocker);
  const state = envelopeBlockers.some(isInvalidBlocker)
    ? TemplateCompilerHydrateElementStagingState.Invalid
    : envelopeBlockers.length > 0
      ? TemplateCompilerHydrateElementStagingState.Pending
      : TemplateCompilerHydrateElementStagingState.Exact;
  return new TemplateCompilerHydrateElementStagingResult(
    hydrateElementStagingAuthority,
    state,
    request.element,
    request.owner,
    draft,
    blockers,
    reads,
  );
}

function elementReadBelongsToRequest(request: TemplateCompilerHydrateElementStagingRequest): boolean {
  const observation = request.elementRead.observation;
  return observation.readKind === TemplateCompilerReadKind.ElementResource
    && observation.canonicalKey === request.lookupName.toLowerCase()
    && observation.compilerScopeIdentityHandle === request.compilerReads.world.resourceScope.identityHandle
    && request.compilerReads.readAll().includes(observation)
    && request.compilerReads.readElement(request.lookupName).observation === observation;
}

function resolveResourcesReadBelongsToRequest(request: TemplateCompilerHydrateElementStagingRequest): boolean {
  const read = request.resolveResourcesRead;
  if (read == null) return false;
  const observation = read.observation;
  return observation.readKind === TemplateCompilerReadKind.TemplateCompiler
    && observation.canonicalKey === 'resolve-resources'
    && observation.compilerScopeIdentityHandle === request.compilerReads.world.resourceScope.identityHandle
    && request.compilerReads.readAll().includes(observation)
    && request.compilerReads.readResolveResources().observation === observation;
}

function processContentDraft(
  request: TemplateCompilerHydrateElementStagingRequest,
  definition: CustomElementDefinition,
  blockers: TemplateCompilerHydrateElementBlocker[],
): TemplateCompilerHydrateElementProcessContentDraft {
  if (definition.processContent == null) {
    if (request.processContent != null) {
      blockers.push(envelopeBlocker(
        TemplateCompilerHydrateElementBlockerKind.ProcessContentResultForeign,
        'A processContent result was supplied for a definition without a processContent hook.',
      ));
      return new TemplateCompilerHydrateElementProcessContentDraft(
        TemplateCompilerHydrateElementProcessContentState.Foreign,
        null,
        request.processContent,
      );
    }
    return new TemplateCompilerHydrateElementProcessContentDraft(
      TemplateCompilerHydrateElementProcessContentState.Absent,
      null,
      null,
    );
  }
  const result = request.processContent;
  if (result == null) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.ProcessContentExecutionRequired,
      'Custom-element processContent must execute exactly before envelope closure.',
    ));
    return new TemplateCompilerHydrateElementProcessContentDraft(
      TemplateCompilerHydrateElementProcessContentState.Required,
      null,
      null,
    );
  }
  if (
    !result.isModuleConstructed()
    || result.plan.host !== request.element
    || result.plan.definition !== definition
    || result.plan.elementRead.observation !== request.elementRead.observation
    || result.plan.compilerReads !== request.compilerReads
  ) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.ProcessContentResultForeign,
      'processContent result belongs to another host, definition, or compiler read authority.',
    ));
    return new TemplateCompilerHydrateElementProcessContentDraft(
      TemplateCompilerHydrateElementProcessContentState.Foreign,
      null,
      result,
    );
  }
  const nameSourceAddressHandle = result.nameCarrier == null
    ? null
    : request.owner.contributions.find((contribution) =>
      contribution.frame.attribute === result.nameCarrier
    )?.frame.source.authoredAttribute?.valueAddressHandle ?? null;
  if (result.nameCarrier != null && nameSourceAddressHandle == null) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.ProcessContentNameSourceAuthorityOpen,
      'AuSlot name metadata is exact, but its live attribute has no singular authored value source.',
    ));
  }
  return new TemplateCompilerHydrateElementProcessContentDraft(
    TemplateCompilerHydrateElementProcessContentState.Exact,
    new AuSlotProcessContentInstructionData(result.metadata.name, nameSourceAddressHandle),
    result,
  );
}

function projectionDraft(
  host: TemplateCompilerElementOccurrence,
  children: readonly TemplateCompilerNodeOccurrence[],
  definition: CustomElementDefinition,
  blockers: TemplateCompilerHydrateElementBlocker[],
): TemplateCompilerHydrateElementProjectionDraft {
  const grouping = groupTemplateCompilerProjectionChildren(new TemplateCompilerProjectionGroupingInput(
    host,
    host.inputReference?.addressHandle ?? null,
    definition.shadowOptions != null,
    children.map((child) => {
      const slotAttribute = child instanceof TemplateCompilerElementOccurrence
        ? child.readAttributes().find((attribute) => qualifiedAttributeName(attribute) === 'au-slot') ?? null
        : null;
      return new TemplateCompilerProjectionChildSnapshot(
        child,
        slotAttribute,
        slotAttribute?.value ?? null,
        slotAttribute?.inputReference?.addressHandle ?? null,
        null,
        child.inputReference?.addressHandle ?? null,
        child instanceof TemplateCompilerTextOccurrence && child.text.trim() === '',
        child instanceof TemplateCompilerElementOccurrence
          && child.namespace === HtmlNamespaceKind.Html
          && runtimeElementResourceName(child.tagName, child.namespace) === 'template',
        child instanceof TemplateCompilerElementOccurrence
          ? child.readAttributes().filter((attribute) => attribute !== slotAttribute).length
          : 0,
      );
    }),
  ));
  const pending = grouping.extractedContributors.length > 0;
  if (pending) {
    blockers.push(envelopeBlocker(
      TemplateCompilerHydrateElementBlockerKind.ProjectionExtractionPending,
      'Post-process live children are grouped exactly and await context allocation and structural extraction.',
    ));
  }
  return new TemplateCompilerHydrateElementProjectionDraft(
    pending
      ? TemplateCompilerHydrateElementProjectionState.PendingExtraction
      : TemplateCompilerHydrateElementProjectionState.None,
    [...children],
    grouping,
  );
}

function sourceDraft(request: TemplateCompilerHydrateElementStagingRequest): TemplateCompilerHydrateElementSourceDraft {
  const inputAddressHandle = request.element.inputReference?.addressHandle ?? null;
  return new TemplateCompilerHydrateElementSourceDraft(
    request.owner.authoredElement,
    inputAddressHandle,
    request.owner.authoredElement?.sourceAddressHandle ?? inputAddressHandle,
    request.element.generation != null,
  );
}

function openResult(
  request: TemplateCompilerHydrateElementStagingRequest,
  blockers: readonly TemplateCompilerHydrateElementBlocker[],
  reads: readonly TemplateCompilerReadObservation[],
): TemplateCompilerHydrateElementStagingResult {
  return new TemplateCompilerHydrateElementStagingResult(
    hydrateElementStagingAuthority,
    blockers.some(isInvalidBlocker)
      ? TemplateCompilerHydrateElementStagingState.Invalid
      : TemplateCompilerHydrateElementStagingState.Open,
    request.element,
    request.owner,
    null,
    blockers,
    reads,
  );
}

function envelopeBlocker(
  blockerKind: TemplateCompilerHydrateElementBlockerKind,
  summary: string,
): TemplateCompilerHydrateElementBlocker {
  return new TemplateCompilerHydrateElementBlocker(
    blockerKind,
    TemplateCompilerHydrateElementBlockerScope.Envelope,
    summary,
  );
}

function downstreamBlocker(
  blockerKind: TemplateCompilerHydrateElementBlockerKind,
  summary: string,
): TemplateCompilerHydrateElementBlocker {
  return new TemplateCompilerHydrateElementBlocker(
    blockerKind,
    TemplateCompilerHydrateElementBlockerScope.Downstream,
    summary,
  );
}

function sameOccurrenceSequence(
  left: readonly TemplateCompilerNodeOccurrence[],
  right: readonly TemplateCompilerNodeOccurrence[],
): boolean {
  return left.length === right.length && left.every((child, index) => child === right[index]);
}

function retainRead(
  reads: TemplateCompilerReadObservation[],
  read: TemplateCompilerReadObservation,
): void {
  if (!reads.includes(read)) reads.push(read);
}

function isEnvelopeBlocker(blocker: TemplateCompilerHydrateElementBlocker): boolean {
  return blocker.scope === TemplateCompilerHydrateElementBlockerScope.Envelope;
}

function isInvalidBlocker(blocker: TemplateCompilerHydrateElementBlocker): boolean {
  return blocker.blockerKind === TemplateCompilerHydrateElementBlockerKind.ContainerlessShadowHostInvalid
    || blocker.blockerKind === TemplateCompilerHydrateElementBlockerKind.OwnerAssemblyInvalid;
}

function qualifiedAttributeName(attribute: { readonly name: string; readonly prefix: string | null }): string {
  return attribute.prefix == null ? attribute.name : `${attribute.prefix}:${attribute.name}`;
}
