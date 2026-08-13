import { createHash } from 'node:crypto';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import {
  FrameworkCapabilityConfigurationMembership,
  validationHtmlResourceConfigurationForAdmission,
} from '../configuration/framework-capability-configuration.js';
import { registrationOperationsVisibleToContainer } from '../di/world-construction.js';
import {
  frameworkRegistrationKindForOperation,
  type ContainerRegistrationOperation,
} from '../di/container-registration.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  OpenSeamReasonKind,
  openSeamBoundaryKindForReason,
  type OpenSeam,
} from '../kernel/open-seam.js';
import type { KernelStore } from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  FrameworkRegistrationCapability,
  frameworkRegistrationCapabilitiesForKind,
} from '../registration/framework-registration-manifest.js';
import { runtimeResourceKeyForKind } from '../resources/resource-kind.js';
import {
  TemplateCompilerWorldKind,
  TemplateResourceScopeExclusionReason,
  TemplateResourceScopeLane,
  type TemplateResourceScope,
  type TemplateResourceScopeExclusion,
} from '../template/compiler-world.js';
import type { TemplateVisibleResource } from '../template/compiler-world-reference.js';
import { templateResourceCursorSelections } from './template-completion.js';
import {
  ResourceInventoryBuilder,
  distinctTemplateScopeSelections,
  templateScopeSelection,
  type TemplateScopeSelection,
} from './resource-discovery.js';
import {
  SemanticAppQueryKind,
  SemanticRuntimeAnswerCoverage,
  SemanticRuntimeAnswerResult,
  SemanticRuntimeAnswerSelection,
  type SemanticResourceAvailabilityExplanation,
  type SemanticResourceAvailabilityExplanationBlocker,
  type SemanticResourceAvailabilityExplanationConclusion,
  type SemanticResourceAvailabilityExplanationConclusionKind,
  type SemanticResourceAvailabilityExplanationConfigurationEvidence,
  type SemanticResourceAvailabilityExplanationContender,
  type SemanticResourceAvailabilityExplanationEvidence,
  type SemanticResourceAvailabilityExplanationNextStep,
  type SemanticResourceAvailabilityExplanationResult,
  type SemanticResourceAvailabilityExplanationSubject,
  type SemanticResourceAvailabilityExplanationUncertainty,
  type SemanticResourceAvailabilityExplanationUncertaintyReason,
  type SemanticResourceInventoryRow,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeSourceCursorInput,
} from './contracts.js';
import { answer } from './answer-helpers.js';
import {
  describeAddress,
  semanticExactSourceReference,
  type SemanticSourceReference,
} from './source-reference.js';
import { resolveSemanticSourceCursor } from './source-cursor.js';

interface ResourceConfigurationFacts {
  readonly evidence: SemanticResourceAvailabilityExplanationConfigurationEvidence;
  readonly openSeams: readonly OpenSeam[];
}

interface ResourceExplanationFacts {
  readonly explanation: SemanticResourceAvailabilityExplanation;
  readonly coverage: SemanticRuntimeAnswerCoverage;
}

/** Explain one exact top-level resource's canonical runtime lookup in one cursor-selected compiler scope. */
export function readSemanticResourceAvailabilityExplanation(
  workspaceRootDir: string,
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  cursor: SemanticRuntimeSourceCursorInput | null | undefined,
  resourceIdentityKey: string | null | undefined,
  requestedScopeIdentityKey: string | null | undefined,
): SemanticRuntimeAnswer<SemanticResourceAvailabilityExplanationResult> {
  const emptyValue = (
    displayText: string,
    contenders: readonly SemanticResourceAvailabilityExplanationContender[] = [],
  ): SemanticResourceAvailabilityExplanationResult => ({
    displayText,
    projectKey: emission.project.projectKey,
    explanation: null,
    contenders,
  });
  const discoveryTruncated = emission.project.sourceDiscovery?.truncated === true;
  const absentCoverage = discoveryTruncated
    ? SemanticRuntimeAnswerCoverage.Truncated
    : SemanticRuntimeAnswerCoverage.Complete;
  if (cursor == null) {
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      'Resource availability explanation requires a source cursor.',
      emptyValue('No template cursor was supplied.'),
      { selection: SemanticRuntimeAnswerSelection.Absent, coverage: absentCoverage },
    );
  }
  if (resourceIdentityKey == null || resourceIdentityKey.length === 0) {
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      'Resource availability explanation requires an exact resource identity.',
      emptyValue('No top-level resource identity was supplied.'),
      { selection: SemanticRuntimeAnswerSelection.Absent, coverage: absentCoverage },
    );
  }

  const inventory = new ResourceInventoryBuilder(emission, store, false);
  inventory.collect();
  const resource = inventory.rowForIdentityKey(resourceIdentityKey);
  if (resource == null) {
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      'The requested resource identity is not present in the current project inventory.',
      emptyValue('Choose a current top-level Resource Explorer entry before explaining availability.'),
      { selection: SemanticRuntimeAnswerSelection.Absent, coverage: absentCoverage },
    );
  }
  if (resource.registrationKey == null) {
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      'The requested resource does not have a canonical runtime lookup key.',
      emptyValue(`${resource.name} cannot be explained through canonical-name availability.`),
      { selection: SemanticRuntimeAnswerSelection.Absent, coverage: absentCoverage },
    );
  }
  const registrationKey = resource.registrationKey;

  const cursorResolution = resolveSemanticSourceCursor(
    workspaceRootDir,
    emission.project.rootDir,
    cursor,
    emission.project.inputGeneration.host,
  );
  if (cursorResolution.cursor?.offset == null) {
    const summary = cursorResolution.summary ?? 'The supplied template cursor could not be resolved.';
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      summary,
      emptyValue(summary),
      { selection: SemanticRuntimeAnswerSelection.Absent, coverage: absentCoverage },
    );
  }

  const selections = distinctTemplateScopeSelections(
    templateResourceCursorSelections(
      store,
      emission,
      cursorResolution.cursor.filePath,
      cursorResolution.cursor.offset,
    ).map((selection) => templateScopeSelection(emission, store, inventory, selection)),
  );
  if (selections.length === 0) {
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      'No compiled template resource was available for the supplied source cursor.',
      emptyValue('No compiled template owns this cursor.'),
      { selection: SemanticRuntimeAnswerSelection.Absent, coverage: absentCoverage },
    );
  }

  const explanations = selections.map((selection) => resourceExplanationForScope(
    emission,
    store,
    inventory,
    { ...resource, registrationKey },
    selection,
    cursor,
    discoveryTruncated,
  ));
  const contenders = explanations.map(({ explanation }) => ({
    subject: explanation.subject,
    conclusionKind: explanation.conclusion.kind,
  }));
  const requestedIndex = requestedScopeIdentityKey == null
    ? -1
    : selections.findIndex((selection) =>
      selection.candidate.scopeIdentityKey === requestedScopeIdentityKey
    );
  if (requestedScopeIdentityKey != null && requestedIndex < 0) {
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      'The requested template compiler scope is not available at the current source cursor.',
      emptyValue('Choose a current template compiler scope before explaining resource availability.', contenders),
      { selection: SemanticRuntimeAnswerSelection.Absent, coverage: coverageForFacts(explanations) },
    );
  }
  if (requestedScopeIdentityKey == null && explanations.length > 1) {
    return answer(
      SemanticRuntimeAnswerResult.Answered,
      `The source cursor belongs to ${explanations.length} equally specific template compiler scopes.`,
      emptyValue('Choose a template compiler scope before explaining resource availability.', contenders),
      { selection: SemanticRuntimeAnswerSelection.Ambiguous, coverage: coverageForFacts(explanations) },
    );
  }

  const selected = explanations[requestedIndex < 0 ? 0 : requestedIndex]!;
  return answer(
    SemanticRuntimeAnswerResult.Answered,
    selected.explanation.conclusion.explanation,
    {
      displayText: selected.explanation.conclusion.title,
      projectKey: emission.project.projectKey,
      explanation: selected.explanation,
      contenders: [{
        subject: selected.explanation.subject,
        conclusionKind: selected.explanation.conclusion.kind,
      }],
    },
    { selection: SemanticRuntimeAnswerSelection.Exact, coverage: selected.coverage },
  );
}

function resourceExplanationForScope(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  inventory: ResourceInventoryBuilder,
  resource: SemanticResourceInventoryRow,
  selection: TemplateScopeSelection,
  cursor: SemanticRuntimeSourceCursorInput,
  discoveryTruncated: boolean,
): ResourceExplanationFacts {
  const scope = selection.selection.resource.compilation.compilerWorld.resourceScope;
  const subject = resourceExplanationSubject(emission, resource, selection);
  const effective = effectiveCanonicalResource(scope, inventory, resource);
  const exclusion = canonicalExclusion(scope, inventory, resource);
  const configuration = resourceConfigurationFacts(emission, store, scope, resource);
  const unresolvedModules = inventory.completeness().unresolvedModules;
  const compilation = selection.selection.resource.compilation;
  const compilerWorld = compilation.compilerWorld;
  const appRootOwnerProductHandle = compilation.appRootDefinitionProductHandle;
  const componentScopeLineageOpen = compilerWorld.world.worldKind === TemplateCompilerWorldKind.Component
    && (
      appRootOwnerProductHandle == null
      || compilation.definition.productHandle !== appRootOwnerProductHandle
    );
  // Without an exact seam-to-slot ordering witness, a registration-hiding seam on the consulting chain can precede
  // and replace a modeled positive winner just as easily as it can fill a modeled absence. It can also invalidate the
  // effective configuration path whose closed membership excluded this resource, so every conclusion stays open.
  const registrationBlockers = registrationHidingOpenSeams(emission, scope);
  const blockers = projectOpenSeamBlockers(
    store,
    [...configuration.openSeams, ...registrationBlockers],
  );
  const conclusion = resourceExplanationConclusion(
    resource,
    effective,
    exclusion,
    exclusion == null ? null : inventory.rowForVisibleResource(exclusion.winner),
    configuration.evidence,
    blockers,
    discoveryTruncated,
    unresolvedModules,
    componentScopeLineageOpen,
  );
  const evidence = resourceExplanationEvidence(
    store,
    inventory,
    effective,
    exclusion,
    configuration.evidence,
    blockers,
  );
  const uncertainty = resourceExplanationUncertainty(
    configuration.evidence,
    blockers,
    registrationBlockers.length,
    discoveryTruncated,
    unresolvedModules,
    componentScopeLineageOpen,
  );
  const explanation: SemanticResourceAvailabilityExplanation = {
    subject,
    conclusion,
    evidence,
    uncertainty,
    currentness: {
      authority: 'answer-analysis-basis',
      explanation: 'The answer envelope analysisBasis is the sole freshness and revision authority for this explanation.',
    },
    nextSteps: resourceExplanationNextSteps(subject, conclusion.kind, evidence, cursor),
  };
  return {
    explanation,
    coverage: uncertainty.state === 'closed'
      ? SemanticRuntimeAnswerCoverage.Complete
      : uncertainty.state === 'truncated'
        ? SemanticRuntimeAnswerCoverage.Truncated
        : SemanticRuntimeAnswerCoverage.Open,
  };
}

function resourceExplanationSubject(
  emission: AureliaAppWorldProjectEmission,
  resource: SemanticResourceInventoryRow,
  selection: TemplateScopeSelection,
): SemanticResourceAvailabilityExplanationSubject {
  const registrationKey = resource.registrationKey;
  if (registrationKey == null) {
    throw new Error('Resource availability explanation requires a canonical registration key.');
  }
  return {
    subjectKey: stableExplanationKey('resource-availability-subject', [
      emission.project.projectKey,
      resource.identityKey,
      registrationKey,
      selection.candidate.templateIdentityKey,
      selection.candidate.scopeIdentityKey,
    ]),
    projectKey: emission.project.projectKey,
    resourceIdentityKey: resource.identityKey,
    resourceKind: resource.resourceKind,
    name: resource.name,
    lookupKind: 'canonical-name',
    registrationKey,
    resource,
    template: selection.candidate,
  };
}

function effectiveCanonicalResource(
  scope: TemplateResourceScope,
  inventory: ResourceInventoryBuilder,
  requested: SemanticResourceInventoryRow,
): TemplateVisibleResource | null {
  const lookup = scope.lookups.find((candidate) => candidate.lookupKey === requested.registrationKey) ?? null;
  return lookup != null
    && inventory.rowForVisibleResource(lookup.winner)?.identityKey === requested.identityKey
    ? lookup.winner
    : null;
}

function canonicalExclusion(
  scope: TemplateResourceScope,
  inventory: ResourceInventoryBuilder,
  requested: SemanticResourceInventoryRow,
): TemplateResourceScopeExclusion | null {
  for (const exclusion of scope.exclusions) {
    if (
      exclusion.reason !== TemplateResourceScopeExclusionReason.LookupKeyConflict
      || !exclusion.lookupKeys.includes(requested.registrationKey!)
    ) {
      continue;
    }
    if (inventory.rowForVisibleResource(exclusion.loser)?.identityKey === requested.identityKey) {
      return exclusion;
    }
  }
  return null;
}

function resourceExplanationConclusion(
  resource: SemanticResourceInventoryRow,
  effective: TemplateVisibleResource | null,
  exclusion: TemplateResourceScopeExclusion | null,
  exclusionWinner: SemanticResourceInventoryRow | null,
  configuration: SemanticResourceAvailabilityExplanationConfigurationEvidence,
  blockers: readonly SemanticResourceAvailabilityExplanationBlocker[],
  discoveryTruncated: boolean,
  unresolvedModules: number,
  componentScopeLineageOpen: boolean,
): SemanticResourceAvailabilityExplanationConclusion {
  if (configuration.state === 'open') {
    return {
      kind: 'admission-unknown',
      title: `${resource.name} availability depends on runtime configuration`,
      explanation: `Static analysis cannot close whether the active configuration admits ${resource.name} by its canonical name.`,
      action: 'Inspect the dynamic configuration value before changing resource registration.',
    };
  }
  // A resource can remain in scope through a surviving alias after losing its canonical key. Exact canonical-key
  // conflict evidence therefore outranks raw product presence for this deliberately canonical-only V1 query.
  if (exclusion != null) {
    const qualified = blockers.length > 0 || discoveryTruncated || unresolvedModules > 0 || componentScopeLineageOpen;
    const winnerName = exclusionWinner?.name ?? exclusion.winner.name;
    return {
      kind: 'shadowed',
      title: qualified
        ? `${resource.name} is shadowed by ${winnerName} in the modeled registrations`
        : `${resource.name} is shadowed by ${winnerName}`,
      explanation: qualified
        ? `${resource.name} loses canonical key ${resource.registrationKey} to ${winnerName}, but incomplete registration evidence can still change that ordering.`
        : `${resource.name} lost canonical key ${resource.registrationKey} to ${winnerName}.`,
      action: qualified
        ? `Inspect ${winnerName}, the contender, and retained uncertainty before changing registration order.`
        : `Inspect ${winnerName} and the contender registration sources before changing registration order.`,
    };
  }
  if (effective != null) {
    const qualified = blockers.length > 0 || discoveryTruncated || unresolvedModules > 0 || componentScopeLineageOpen;
    return {
      kind: 'available',
      title: qualified
        ? `${resource.name} is available in the modeled registrations`
        : `${resource.name} is available`,
      explanation: qualified
        ? `The modeled registrations select ${resource.name} for canonical key ${resource.registrationKey}, but incomplete registration evidence can still change that winner.`
        : `${resource.name} is the effective resource for canonical key ${resource.registrationKey}.`,
      action: qualified
        ? 'Inspect the retained uncertainty before relying on this winner.'
        : 'No registration change is indicated for this template scope.',
    };
  }
  if (configuration.state === 'excluded') {
    const qualified = blockers.length > 0 || discoveryTruncated || unresolvedModules > 0 || componentScopeLineageOpen;
    return {
      kind: 'configured-out',
      title: qualified
        ? `${resource.name} is configured out by the modeled provider`
        : `${resource.name} is configured out`,
      explanation: qualified
        ? `The modeled framework provider has a closed configuration that excludes ${resource.name}, but incomplete registration evidence can still supply the same canonical key.`
        : `The admitted framework provider has a closed configuration that excludes ${resource.name}.`,
      action: qualified
        ? 'Inspect both the excluding configuration value and retained registration uncertainty.'
        : 'Inspect the excluding configuration value if this resource should be enabled.',
    };
  }
  if (blockers.length > 0 || discoveryTruncated || unresolvedModules > 0 || componentScopeLineageOpen) {
    return {
      kind: 'admission-unknown',
      title: `${resource.name} admission is uncertain`,
      explanation: `The modeled scope does not contain ${resource.name}, but incomplete registration evidence prevents a closed not-admitted conclusion.`,
      action: 'Inspect the retained blockers or complete source discovery before changing registration.',
    };
  }
  return {
    kind: 'not-admitted',
    title: `${resource.name} is not admitted`,
    explanation: `${resource.name} is known to the project inventory but is not admitted to this closed template resource scope.`,
    action: 'Inspect the app or component registration path if this resource should be available here.',
  };
}

function resourceExplanationEvidence(
  store: KernelStore,
  inventory: ResourceInventoryBuilder,
  effective: TemplateVisibleResource | null,
  exclusion: TemplateResourceScopeExclusion | null,
  configuration: SemanticResourceAvailabilityExplanationConfigurationEvidence,
  blockers: readonly SemanticResourceAvailabilityExplanationBlocker[],
): SemanticResourceAvailabilityExplanationEvidence {
  const winner = exclusion?.winner ?? effective ?? null;
  return {
    effectiveResource: winner == null ? null : inventory.rowForVisibleResource(winner),
    availabilitySource: effective == null ? null : describeAddress(store, effective.sourceAddressHandle),
    exclusion: exclusion == null
      ? null
      : {
          reason: exclusion.reason === TemplateResourceScopeExclusionReason.DuplicateProduct
            ? 'duplicate-product'
            : 'lookup-key-conflict',
          lookupKeys: exclusion.lookupKeys,
          contenderLane: exclusion.loserLane === TemplateResourceScopeLane.Local ? 'local' : 'parent',
          contenderSource: describeAddress(
            store,
            exclusion.loserKeySourceAddressHandle ?? exclusion.loser.sourceAddressHandle,
          ),
          winnerSource: describeAddress(
            store,
            exclusion.winnerKeySourceAddressHandle ?? exclusion.winner.sourceAddressHandle,
          ),
        },
    configuration,
    blockers,
  };
}

function resourceConfigurationFacts(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  scope: TemplateResourceScope,
  resource: SemanticResourceInventoryRow,
): ResourceConfigurationFacts {
  if (
    resource.origin.packageName !== '@aurelia/validation-html'
    || (resource.name !== 'validation-errors' && resource.name !== 'validation-container')
  ) {
    return { evidence: notIndicatedConfigurationEvidence(), openSeams: [] };
  }
  const containerIdentityHandle = scope.container.identityHandle;
  const container = containerIdentityHandle == null
    ? null
    : emission.appWorld.diWorld.containers.find((candidate) =>
      candidate.identityHandle === containerIdentityHandle
    ) ?? null;
  if (container == null) {
    return { evidence: notIndicatedConfigurationEvidence(), openSeams: [] };
  }
  const operations = registrationOperationsVisibleToContainer(
    container,
    emission.appWorld.diWorld,
    emission.containerChainFacts,
  ).filter((operation) => {
    const frameworkKind = frameworkRegistrationKindForOperation(operation);
    return frameworkKind != null
      && frameworkRegistrationCapabilitiesForKind(frameworkKind)
        .includes(FrameworkRegistrationCapability.ValidationHtmlDefaultResources);
  });
  if (operations.length === 0) {
    return { evidence: notIndicatedConfigurationEvidence(), openSeams: [] };
  }
  let included = false;
  let open = false;
  const sources: SemanticSourceReference[] = [];
  const openSeams: OpenSeam[] = [];
  for (const operation of operations) {
    const configuration = validationHtmlResourceConfigurationForAdmission(
      store,
      emission.appWorld.configuration,
      operation.admission,
    );
    const membership = configuration.membership(resource.name);
    included ||= membership === FrameworkCapabilityConfigurationMembership.Included;
    open ||= membership === FrameworkCapabilityConfigurationMembership.Open;
    const source = validationHtmlConfigurationSourceHandle(configuration, resource.name);
    if (membership !== FrameworkCapabilityConfigurationMembership.Included) {
      const projected = describeAddress(store, source);
      if (projected != null) sources.push(projected);
    }
    for (const handle of configuration.openSeamHandles(resource.name)) {
      const seam = store.readOpenSeam(handle);
      if (seam != null) openSeams.push(seam);
    }
  }
  if (included) {
    return { evidence: notIndicatedConfigurationEvidence(), openSeams: [] };
  }
  return {
    evidence: {
      state: open ? 'open' : 'excluded',
      requiredCapability: FrameworkRegistrationCapability.ValidationHtmlDefaultResources,
      sources: uniqueSourceReferences(sources),
    },
    openSeams,
  };
}

function validationHtmlConfigurationSourceHandle(
  configuration: ReturnType<typeof validationHtmlResourceConfigurationForAdmission>,
  resourceName: string,
): AddressHandle | null {
  return resourceName === 'validation-errors'
    ? configuration.subscriberCustomAttribute.sourceAddressHandle
    : configuration.subscriberCustomElement.sourceAddressHandle;
}

function notIndicatedConfigurationEvidence(): SemanticResourceAvailabilityExplanationConfigurationEvidence {
  return {
    state: 'not-indicated',
    requiredCapability: null,
    sources: [],
  };
}

function registrationHidingOpenSeams(
  emission: AureliaAppWorldProjectEmission,
  scope: TemplateResourceScope,
): readonly OpenSeam[] {
  const containerIdentityHandle = scope.container.identityHandle;
  const chain = containerIdentityHandle == null
    ? null
    : new Set(emission.containerChainFacts.containerChainIdentityHandles(containerIdentityHandle));
  const seams: OpenSeam[] = [];
  for (const scoped of emission.appWorld.diWorld.registrationOpenSeamScopes) {
    const operationContainer = scoped.operation?.container.identityHandle ?? null;
    if (
      (chain == null || operationContainer == null || chain.has(operationContainer))
      && registrationOpenSeamCanHideResource(scoped.operation)
    ) {
      seams.push(scoped.seam);
    }
  }
  for (const scoped of emission.appWorld.configuration.openSeamScopes) {
    if (!isConfigurationRegistrationHidingOpenSeam(scoped.seam)) continue;
    if (
      chain == null
      || scoped.containerIdentityHandle == null
      || chain.has(scoped.containerIdentityHandle)
    ) {
      seams.push(scoped.seam);
    }
  }
  return uniqueOpenSeams(seams);
}

function registrationOpenSeamCanHideResource(
  operation: ContainerRegistrationOperation | null,
): boolean {
  if (operation == null) return true;
  // Recognized framework groups project resource catalogs through their own closed catalog family. Their residual
  // DI-body seam covers non-resource providers and must not make every built-in resource perpetually uncertain.
  const frameworkKind = frameworkRegistrationKindForOperation(operation);
  return frameworkKind == null;
}

function isConfigurationRegistrationHidingOpenSeam(seam: OpenSeam): boolean {
  switch (seam.seamKindKey) {
    case KernelVocabulary.Di.OpenRegistryBody.key:
      return true;
    case KernelVocabulary.Di.OpenRegistrationSpending.key:
      return seam.reasonKinds.some(isRegistrationHidingReason);
    case KernelVocabulary.Registration.OpenKeyExpression.key:
    case KernelVocabulary.Registration.OpenValueExpression.key:
    case KernelVocabulary.Registration.OpenStrategy.key:
    case KernelVocabulary.Registration.OpenSpread.key:
    case KernelVocabulary.Registration.OpenAliasTarget.key:
      return true;
    default:
      return false;
  }
}

function isRegistrationHidingReason(reason: OpenSeamReasonKind): boolean {
  switch (reason) {
    case OpenSeamReasonKind.DiRegistrationContainerOpen:
    case OpenSeamReasonKind.DiRegistrationAdmissionOpen:
    case OpenSeamReasonKind.DiRegistrationKeyOpen:
    case OpenSeamReasonKind.DiRegistrationStrategyOpen:
    case OpenSeamReasonKind.DiRegistrationPublicationOpen:
    case OpenSeamReasonKind.DiRegistryBodyOpen:
    case OpenSeamReasonKind.DiResourceSlotOpen:
      return true;
    default:
      return false;
  }
}

function projectOpenSeamBlockers(
  store: KernelStore,
  seams: readonly OpenSeam[],
): readonly SemanticResourceAvailabilityExplanationBlocker[] {
  return uniqueOpenSeams(seams).map((seam) => ({
    kind: 'open-seam',
    seamKindKey: seam.seamKindKey,
    summary: seam.summary,
    reasonKinds: seam.reasonKinds,
    boundaryKinds: [...new Set(seam.reasonKinds.map(openSeamBoundaryKindForReason))],
    sources: uniqueSourceReferences([
      describeAddress(store, seam.addressHandle),
      ...seam.reasonSources.map((reasonSource) => describeAddress(store, reasonSource.addressHandle)),
    ].filter((source): source is SemanticSourceReference => source != null)),
  }));
}

function resourceExplanationUncertainty(
  configuration: SemanticResourceAvailabilityExplanationConfigurationEvidence,
  blockers: readonly SemanticResourceAvailabilityExplanationBlocker[],
  registrationBlockerCount: number,
  discoveryTruncated: boolean,
  unresolvedModules: number,
  componentScopeLineageOpen: boolean,
): SemanticResourceAvailabilityExplanationUncertainty {
  const reasons: SemanticResourceAvailabilityExplanationUncertaintyReason[] = [];
  if (configuration.state === 'open') reasons.push('configuration-membership-open');
  if (componentScopeLineageOpen) reasons.push('component-scope-lineage-open');
  if (registrationBlockerCount > 0) reasons.push('registration-admission-open');
  if (blockers.length > 0) reasons.push('blocking-open-seam');
  if (unresolvedModules > 0) reasons.push('unresolved-modules');
  if (discoveryTruncated) reasons.push('source-discovery-truncated');
  const uniqueReasons = [...new Set(reasons)];
  if (discoveryTruncated) {
    return {
      state: 'truncated',
      reasons: uniqueReasons,
      explanation: `Project source discovery was truncated, so this conclusion is limited to the admitted source basis.${blockerSummarySuffix(blockers)}`,
    };
  }
  if (uniqueReasons.length > 0) {
    return {
      state: 'open',
      reasons: uniqueReasons,
      explanation: `This conclusion remains open because ${uniqueReasons.map(uncertaintyReasonText).join('; ')}.${blockerSummarySuffix(blockers)}`,
    };
  }
  return {
    state: 'closed',
    reasons: [],
    explanation: 'No modeled registration, configuration, or discovery uncertainty remains for this conclusion.',
  };
}

function blockerSummarySuffix(
  blockers: readonly SemanticResourceAvailabilityExplanationBlocker[],
): string {
  const summaries = [...new Set(blockers.map((blocker) => blocker.summary.trim()).filter(Boolean))];
  if (summaries.length === 0) return '';
  const remaining = summaries.length - 1;
  return ` First blocker: ${summaries[0]}${remaining > 0 ? ` (${remaining} more distinct blocker${remaining === 1 ? '' : 's'} retained.)` : ''}`;
}

function uncertaintyReasonText(reason: SemanticResourceAvailabilityExplanationUncertaintyReason): string {
  switch (reason) {
    case 'registration-admission-open':
      return 'resource registration admission could not be closed';
    case 'configuration-membership-open':
      return 'the resource configuration value remains dynamic';
    case 'component-scope-lineage-open':
      return 'component child-container resource lineage is not yet modeled as a closed chain';
    case 'blocking-open-seam':
      return 'typed registration blockers remain';
    case 'unresolved-modules':
      return 'one or more source modules remain unresolved';
    case 'source-discovery-truncated':
      return 'project source discovery was truncated';
  }
}

function resourceExplanationNextSteps(
  subject: SemanticResourceAvailabilityExplanationSubject,
  conclusionKind: SemanticResourceAvailabilityExplanationConclusionKind,
  evidence: SemanticResourceAvailabilityExplanationEvidence,
  cursor: SemanticRuntimeSourceCursorInput,
): readonly SemanticResourceAvailabilityExplanationNextStep[] {
  const steps: SemanticResourceAvailabilityExplanationNextStep[] = [];
  const causalSource = conclusionKind === 'shadowed'
    ? evidence.exclusion?.winnerSource ?? null
    : conclusionKind === 'configured-out'
      ? evidence.configuration.sources[0] ?? null
      : conclusionKind === 'admission-unknown'
        ? evidence.blockers[0]?.sources[0] ?? evidence.configuration.sources[0] ?? null
        : evidence.availabilitySource;
  if (causalSource != null) {
    steps.push({
      kind: 'inspect-source',
      label: conclusionKind === 'shadowed'
        ? 'Open the registration that owns the canonical key.'
        : conclusionKind === 'configured-out'
          ? 'Open the configuration value that excludes this resource.'
          : conclusionKind === 'admission-unknown'
            ? 'Open the first source that leaves admission uncertain.'
            : 'Open the source that makes this resource available.',
      source: causalSource,
      relatedQueryKind: null,
      targetQuery: null,
    });
  }
  const declarationSource = subject.resource.sources.navigation
    ?? subject.resource.sources.declaration;
  if (
    declarationSource != null
    && !steps.some((step) => sameSourceReference(step.source, declarationSource))
  ) {
    steps.push({
      kind: 'inspect-source',
      label: 'Open the requested resource declaration.',
      source: declarationSource,
      relatedQueryKind: null,
      targetQuery: null,
    });
  }
  steps.push({
    kind: 'requery',
    label: 'Refresh this explanation against the current template and resource scope.',
    source: null,
    relatedQueryKind: SemanticAppQueryKind.ResourceAvailabilityExplanation,
    targetQuery: {
      kind: SemanticAppQueryKind.ResourceAvailabilityExplanation,
      cursor,
      resourceIdentityKey: subject.resourceIdentityKey,
      templateResourceScopeIdentityKey: subject.template.scopeIdentityKey,
    },
  });
  return steps.slice(0, 3);
}

function canonicalRegistrationKey(resource: TemplateVisibleResource): string | null {
  return runtimeResourceKeyForKind(resource.resourceKind, resource.name);
}

function coverageForFacts(facts: readonly ResourceExplanationFacts[]): SemanticRuntimeAnswerCoverage {
  if (facts.some((fact) => fact.coverage === SemanticRuntimeAnswerCoverage.Truncated)) {
    return SemanticRuntimeAnswerCoverage.Truncated;
  }
  return facts.some((fact) => fact.coverage === SemanticRuntimeAnswerCoverage.Open)
    ? SemanticRuntimeAnswerCoverage.Open
    : SemanticRuntimeAnswerCoverage.Complete;
}

function stableExplanationKey(namespace: string, values: readonly unknown[]): string {
  return `${namespace}:${createHash('sha256').update(JSON.stringify(values)).digest('hex').slice(0, 24)}`;
}

function uniqueOpenSeams(seams: readonly OpenSeam[]): readonly OpenSeam[] {
  return [...new Map(seams.map((seam) => [seam.handle, seam] as const)).values()];
}

function uniqueSourceReferences(
  sources: readonly SemanticSourceReference[],
): readonly SemanticSourceReference[] {
  return [...new Map(sources.map((source) => [JSON.stringify(source), source] as const)).values()];
}

function sameSourceReference(
  left: SemanticSourceReference | null,
  right: SemanticSourceReference,
): boolean {
  if (left == null) return false;
  const leftExact = semanticExactSourceReference(left);
  const rightExact = semanticExactSourceReference(right);
  return leftExact != null && rightExact != null
    ? JSON.stringify(leftExact) === JSON.stringify(rightExact)
    : JSON.stringify(left) === JSON.stringify(right);
}
