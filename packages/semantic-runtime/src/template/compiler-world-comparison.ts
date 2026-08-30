import type { AppRootReference } from '../configuration/app-root.js';
import type { ContainerReference } from '../di/container-reference.js';
import type { KernelRecordHandle } from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import {
  KernelPublicationDecisionKind,
  sameKernelFieldProvenance,
  sameKernelRecordWitness,
  type KernelComparablePublicationDecision,
  type KernelPublicationComparisonContext,
} from '../kernel/publication-comparison.js';
import type {
  ObserverLocatorConfiguration,
} from '../observation/observer-locator.js';
import type { AttributePatternDefinitionEntry } from '../resources/attribute-pattern-definition.js';
import type { ResourceTargetReference } from '../resources/resource-reference.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';
import type {
  AttributeParserMachine,
  AttributeParserService,
  AttributePatternExecutable,
  CompiledAttributePattern,
} from './attribute-syntax.js';
import type { AttributeMapperConfiguration } from './attribute-mapper.js';
import type {
  BindingCommandExecutable,
  BindingCommandResolverService,
} from './binding-command-execution.js';
import type { TemplateCompilerIssue } from './compiler-issue.js';
import type {
  TemplateCompilerHookEntry,
  TemplateCompilerHookOpenReason,
  TemplateCompilerHookSet,
} from './compiler-hook-world.js';
import type {
  TemplateAttributeMapperService,
  TemplateCompilerService,
  TemplateCompilerWorld,
  TemplateExpressionParserService,
  TemplateRenderingService,
  TemplateResourceResolverService,
  TemplateResourceScopeBlockedLookup,
  TemplateResourceScopeExclusion,
  TemplateResourceScopeLookup,
  TemplateResourceScope,
  TemplateResourceScopeReference,
} from './compiler-world.js';
import type {
  TemplateCompilerServiceReference,
  TemplateVisibleResource,
} from './compiler-world-reference.js';
import type { RuntimeRenderer } from './runtime-renderer.js';
import type { RuntimeKeyMappingConfiguration } from './runtime-event-modifier.js';
import type {
  CssClassMappingAuthority,
  CssClassMappingOpenReason,
} from './css-class-mapping.js';

/** Slot-owned comparison for a compiler world and the semantic service references it exposes. */
export function compareTemplateCompilerWorldDetails(
  previous: TemplateCompilerWorld,
  next: TemplateCompilerWorld,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  if (
    !sameValues(
      previous.productHandle,
      next.productHandle,
      previous.identityHandle,
      next.identityHandle,
      previous.worldKind,
      next.worldKind,
      previous.resourceScopeProductHandle,
      next.resourceScopeProductHandle,
    )
    || !sameNullable(previous.appRoot, next.appRoot, sameAppRootSemantics)
    || !sameContainerSemantics(previous.container, next.container)
    || !sameObserverLocatorConfiguration(
      previous.observerLocatorConfiguration,
      next.observerLocatorConfiguration,
    )
    || !sameRuntimeKeyMappingConfiguration(
      previous.runtimeKeyMappingConfiguration,
      next.runtimeKeyMappingConfiguration,
    )
    || !sameArrays(previous.services, next.services, sameCompilerServiceReferenceSemantics)
  ) {
    return KernelPublicationDecisionKind.Replace;
  }
  return witnessDecision(
    sameNullable(previous.appRoot, next.appRoot, (left, right) =>
      sameKernelRecordWitness(left.addressHandle, right.addressHandle, context))
      && sameContainerWitness(previous.container, next.container, context)
      && sameArrays(previous.services, next.services, (left, right) =>
        sameKernelRecordWitness(left.addressHandle, right.addressHandle, context))
      && sameRuntimeKeyMappingWitness(
        previous.runtimeKeyMappingConfiguration,
        next.runtimeKeyMappingConfiguration,
        context,
      )
      && sameObserverLocatorConfigurationWitness(
        previous.observerLocatorConfiguration,
        next.observerLocatorConfiguration,
        context,
      )
      && sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
      && sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context),
  );
}

/** Slot-owned comparison for the ordered resource and syntax visibility of one compiler world. */
export function compareTemplateResourceScopeDetails(
  previous: TemplateResourceScope,
  next: TemplateResourceScope,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  if (
    !sameValues(previous.productHandle, next.productHandle, previous.identityHandle, next.identityHandle)
    || !sameContainerSemantics(previous.container, next.container)
    || !sameNullable(previous.parent, next.parent, sameTemplateResourceScopeReferenceSemantics)
  ) {
    return KernelPublicationDecisionKind.Replace;
  }
  return combineDecisions(
    compareArrays(previous.resources, next.resources, (left, right) =>
      compareTemplateVisibleResource(left, right, context)),
    compareArrays(previous.exclusions, next.exclusions, (left, right) =>
      compareTemplateResourceScopeExclusion(left, right, context)),
    compareArrays(previous.lookups, next.lookups, (left, right) =>
      compareTemplateResourceScopeLookup(left, right, context)),
    compareArrays(previous.blockedLookups, next.blockedLookups, (left, right) =>
      compareTemplateResourceScopeBlockedLookup(left, right, context)),
    compareArrays(previous.syntaxResources, next.syntaxResources, (left, right) =>
      compareTemplateVisibleResource(left, right, context)),
    witnessDecision(
      sameContainerWitness(previous.container, next.container, context)
        && sameTemplateResourceScopeReferenceWitness(previous.parent, next.parent, context)
        && sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
        && sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context),
    ),
  );
}

function compareTemplateResourceScopeBlockedLookup(
  previous: TemplateResourceScopeBlockedLookup,
  next: TemplateResourceScopeBlockedLookup,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  if (!sameValues(previous.lookupKey, next.lookupKey, previous.lane, next.lane)) {
    return KernelPublicationDecisionKind.Replace;
  }
  return witnessDecision(sameKernelRecordWitness(
    previous.sourceAddressHandle,
    next.sourceAddressHandle,
    context,
  ));
}

function compareTemplateResourceScopeLookup(
  previous: TemplateResourceScopeLookup,
  next: TemplateResourceScopeLookup,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  if (!sameValues(previous.lookupKey, next.lookupKey, previous.lane, next.lane)) {
    return KernelPublicationDecisionKind.Replace;
  }
  return combineDecisions(
    compareTemplateVisibleResource(previous.winner, next.winner, context),
    witnessDecision(sameKernelRecordWitness(
      previous.sourceAddressHandle,
      next.sourceAddressHandle,
      context,
    )),
  );
}

function compareTemplateResourceScopeExclusion(
  previous: TemplateResourceScopeExclusion,
  next: TemplateResourceScopeExclusion,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  if (
    !sameValues(
      previous.reason,
      next.reason,
      previous.winnerLane,
      next.winnerLane,
      previous.loserLane,
      next.loserLane,
    )
    || !sameArrays(previous.lookupKeys, next.lookupKeys, (left, right) => left === right)
  ) {
    return KernelPublicationDecisionKind.Replace;
  }
  return combineDecisions(
    compareTemplateVisibleResource(previous.winner, next.winner, context),
    compareTemplateVisibleResource(previous.loser, next.loser, context),
    witnessDecision(
      sameKernelRecordWitness(
        previous.winnerKeySourceAddressHandle,
        next.winnerKeySourceAddressHandle,
        context,
      )
        && sameKernelRecordWitness(
          previous.loserKeySourceAddressHandle,
          next.loserKeySourceAddressHandle,
          context,
        ),
    ),
  );
}

export function compareTemplateCompilerServiceDetails(
  previous: TemplateCompilerService,
  next: TemplateCompilerService,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  return compareContainerService(
    previous,
    next,
    context,
    sameValues(previous.debug, next.debug, previous.resolveResources, next.resolveResources),
  );
}

export function compareTemplateCompilerHookSetDetails(
  previous: TemplateCompilerHookSet,
  next: TemplateCompilerHookSet,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  if (
    !sameValues(
      previous.productHandle,
      next.productHandle,
      previous.identityHandle,
      next.identityHandle,
      previous.membershipState,
      next.membershipState,
    )
    || !sameArrays(previous.entries, next.entries, sameTemplateCompilerHookEntrySemantics)
    || !sameArrays(previous.openReasons, next.openReasons, sameTemplateCompilerHookOpenReasonSemantics)
  ) {
    return KernelPublicationDecisionKind.Replace;
  }
  return witnessDecision(
    sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
      && sameArrays(previous.entries, next.entries, (left, right) =>
        sameKernelRecordWitness(left.cause.sourceAddressHandle, right.cause.sourceAddressHandle, context)
          && sameKernelRecordWitness(
            left.callable.sourceAddressHandle,
            right.callable.sourceAddressHandle,
            context,
          )
          && sameKernelRecordWitness(
            left.cssClassMapping?.sourceAddressHandle ?? null,
            right.cssClassMapping?.sourceAddressHandle ?? null,
            context,
          ))
      && sameArrays(previous.openReasons, next.openReasons, (left, right) =>
        sameKernelRecordWitness(left.sourceAddressHandle, right.sourceAddressHandle, context)),
  );
}

export function compareCssClassMappingAuthorityDetails(
  previous: CssClassMappingAuthority,
  next: CssClassMappingAuthority,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  if (
    !sameValues(
      previous.productHandle,
      next.productHandle,
      previous.identityHandle,
      next.identityHandle,
      previous.defaultPropertyState,
      next.defaultPropertyState,
    )
    || !sameArrays(previous.properties, next.properties, (left, right) => sameValues(
      left.className,
      right.className,
      left.propertyState,
      right.propertyState,
      left.mappedClassName,
      right.mappedClassName,
    ))
    || !sameArrays(previous.openReasons, next.openReasons, sameCssClassMappingOpenReasonSemantics)
  ) {
    return KernelPublicationDecisionKind.Replace;
  }
  return witnessDecision(
    sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
      && sameArrays(previous.openReasons, next.openReasons, (left, right) =>
        sameKernelRecordWitness(left.sourceAddressHandle, right.sourceAddressHandle, context)),
  );
}

export function compareTemplateResourceResolverServiceDetails(
  previous: TemplateResourceResolverService,
  next: TemplateResourceResolverService,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  return combineDecisions(
    compareContainerService(previous, next, context),
    compareArrays(previous.resources, next.resources, (left, right) =>
      compareTemplateVisibleResource(left, right, context)),
    compareArrays(previous.lookups, next.lookups, (left, right) =>
      compareTemplateResourceScopeLookup(left, right, context)),
    compareArrays(previous.blockedLookups, next.blockedLookups, (left, right) =>
      compareTemplateResourceScopeBlockedLookup(left, right, context)),
  );
}

export function compareTemplateExpressionParserServiceDetails(
  previous: TemplateExpressionParserService,
  next: TemplateExpressionParserService,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  return compareContainerService(previous, next, context);
}

export function compareTemplateAttributeMapperServiceDetails(
  previous: TemplateAttributeMapperService,
  next: TemplateAttributeMapperService,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  return compareContainerService(
    previous,
    next,
    context,
    sameAttributeMapperConfiguration(previous.configuration, next.configuration),
  );
}

export function compareTemplateRenderingServiceDetails(
  previous: TemplateRenderingService,
  next: TemplateRenderingService,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  return combineDecisions(
    compareContainerService(previous, next, context),
    compareArrays(previous.renderers, next.renderers, (left, right) =>
      compareRuntimeRendererDetails(left, right, context)),
  );
}

export function compareAttributeParserServiceDetails(
  previous: AttributeParserService,
  next: AttributeParserService,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  if (!sameValues(previous.productHandle, next.productHandle, previous.identityHandle, next.identityHandle)) {
    return KernelPublicationDecisionKind.Replace;
  }
  return combineDecisions(
    compareArrays(previous.patternExecutables, next.patternExecutables, (left, right) =>
      compareAttributePatternExecutableDetails(left, right, context)),
    compareNullableDetails(previous.machine, next.machine, (left, right) =>
      compareAttributeParserMachineDetails(left, right, context)),
    witnessDecision(
      sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
        && sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context),
    ),
  );
}

export function compareAttributeParserMachineDetails(
  previous: AttributeParserMachine,
  next: AttributeParserMachine,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  if (!sameValues(previous.productHandle, next.productHandle, previous.identityHandle, next.identityHandle)) {
    return KernelPublicationDecisionKind.Replace;
  }
  return combineDecisions(
    compareArrays(previous.compiledPatterns, next.compiledPatterns, (left, right) =>
      compareCompiledAttributePatternDetails(left, right, context)),
    witnessDecision(
      sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
        && sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context),
    ),
  );
}

export function compareBindingCommandResolverDetails(
  previous: BindingCommandResolverService,
  next: BindingCommandResolverService,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  if (!sameValues(previous.productHandle, next.productHandle, previous.identityHandle, next.identityHandle)) {
    return KernelPublicationDecisionKind.Replace;
  }
  return combineDecisions(
    compareArrays(previous.commands, next.commands, (left, right) =>
      compareBindingCommandExecutableDetails(left, right, context)),
    witnessDecision(
      sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
        && sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context),
    ),
  );
}

/** Shared comparison authority for parser services and compiler-world carriers that embed a compiled pattern. */
export function compareCompiledAttributePatternDetails(
  previous: CompiledAttributePattern,
  next: CompiledAttributePattern,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  if (
    !sameValues(
      previous.productHandle,
      next.productHandle,
      previous.identityHandle,
      next.identityHandle,
      previous.executableProductHandle,
      next.executableProductHandle,
      previous.definition.pattern,
      next.definition.pattern,
      previous.definition.symbols,
      next.definition.symbols,
      previous.score.statics,
      next.score.statics,
      previous.score.dynamics,
      next.score.dynamics,
      previous.score.symbols,
      next.score.symbols,
    )
    || !sameArrays(previous.tokens, next.tokens, (left, right) =>
      sameValues(left.tokenKind, right.tokenKind, left.value, right.value))
    || !sameArrays(previous.symbols, next.symbols, (left, right) => left === right)
  ) {
    return KernelPublicationDecisionKind.Replace;
  }
  return witnessDecision(
    sameAttributePatternDefinitionWitness(previous.definition, next.definition, context)
      && sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context),
  );
}

/** Shared comparison authority for parser services and compiler-world carriers that embed a pattern executable. */
export function compareAttributePatternExecutableDetails(
  previous: AttributePatternExecutable,
  next: AttributePatternExecutable,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  if (
    !sameValues(
      previous.productHandle,
      next.productHandle,
      previous.identityHandle,
      next.identityHandle,
      previous.definitionProductHandle,
      next.definitionProductHandle,
      previous.executionKind,
      next.executionKind,
    )
    || !sameNullable(previous.target, next.target, sameResourceTargetSemantics)
    || !sameArrays(previous.patterns, next.patterns, sameAttributePatternDefinitionSemantics)
  ) {
    return KernelPublicationDecisionKind.Replace;
  }
  return witnessDecision(
    sameNullable(previous.target, next.target, (left, right) =>
      sameResourceTargetWitness(left, right, context))
      && sameArrays(previous.patterns, next.patterns, (left, right) =>
        sameAttributePatternDefinitionWitness(left, right, context))
      && sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
      && sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context),
  );
}

/** Shared comparison authority for command resolvers and compiler-world carriers that embed a command executable. */
export function compareBindingCommandExecutableDetails(
  previous: BindingCommandExecutable,
  next: BindingCommandExecutable,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  if (
    !sameValues(
      previous.productHandle,
      next.productHandle,
      previous.identityHandle,
      next.identityHandle,
      previous.definitionProductHandle,
      next.definitionProductHandle,
      previous.name,
      next.name,
      previous.key,
      next.key,
      previous.ignoreAttr,
      next.ignoreAttr,
      previous.executionKind,
      next.executionKind,
    )
    || !sameArrays(previous.aliases, next.aliases, (left, right) => left === right)
    || !sameNullable(previous.target, next.target, sameResourceTargetSemantics)
  ) {
    return KernelPublicationDecisionKind.Replace;
  }
  return witnessDecision(
    sameNullable(previous.target, next.target, (left, right) =>
      sameResourceTargetWitness(left, right, context))
      && sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
      && sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context),
  );
}

/** Shared comparison authority for rendering services and independently published renderer products. */
export function compareRuntimeRendererDetails(
  previous: RuntimeRenderer,
  next: RuntimeRenderer,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  if (
    !sameValues(
      previous.productHandle,
      next.productHandle,
      previous.identityHandle,
      next.identityHandle,
      previous.targetName,
      next.targetName,
      previous.exportVisibility,
      next.exportVisibility,
      previous.rendererKind,
      next.rendererKind,
      previous.targetInstructionType,
      next.targetInstructionType,
      previous.packageId,
      next.packageId,
      previous.group,
      next.group,
      previous.targetInstructionKind,
      next.targetInstructionKind,
      previous.runtimeBindingKind,
      next.runtimeBindingKind,
      previous.semanticBindingKindKey,
      next.semanticBindingKindKey,
    )
    || !sameArrays(previous.scopeEffectKinds, next.scopeEffectKinds, (left, right) => left === right)
  ) {
    return KernelPublicationDecisionKind.Replace;
  }
  return witnessDecision(
    sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
      && sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context),
  );
}

export function compareTemplateCompilerIssueDetails(
  previous: TemplateCompilerIssue,
  next: TemplateCompilerIssue,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  if (!sameValues(
    previous.productHandle,
    next.productHandle,
    previous.identityHandle,
    next.identityHandle,
    previous.phase,
    next.phase,
    previous.issueKind,
    next.issueKind,
    previous.message,
    next.message,
    previous.frameworkErrorCode,
    next.frameworkErrorCode,
    previous.severity,
    next.severity,
  ) || !sameArrays(previous.relatedInformation, next.relatedInformation, (left, right) =>
    left.message === right.message)) {
    return KernelPublicationDecisionKind.Replace;
  }
  return witnessDecision(
    sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
      && sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context)
      && sameArrays(previous.relatedInformation, next.relatedInformation, (left, right) =>
        sameKernelRecordWitness(left.sourceAddressHandle, right.sourceAddressHandle, context)),
  );
}

function compareContainerService<
  TService extends {
    readonly productHandle: string;
    readonly identityHandle: string;
    readonly container: ContainerReference;
    readonly sourceAddressHandle: KernelRecordHandle | null;
    readonly fieldProvenance: readonly FieldProvenance[];
  },
>(
  previous: TService,
  next: TService,
  context: KernelPublicationComparisonContext,
  additionalSemanticEquality = true,
): KernelComparablePublicationDecision {
  if (
    !additionalSemanticEquality
    || !sameValues(previous.productHandle, next.productHandle, previous.identityHandle, next.identityHandle)
    || !sameContainerSemantics(previous.container, next.container)
  ) {
    return KernelPublicationDecisionKind.Replace;
  }
  return witnessDecision(
    sameContainerWitness(previous.container, next.container, context)
      && sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
      && sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context),
  );
}

function compareTemplateVisibleResource(
  previous: TemplateVisibleResource,
  next: TemplateVisibleResource,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  if (
    !sameValues(
      previous.resourceKind,
      next.resourceKind,
      previous.name,
      next.name,
      previous.resourceProductHandle,
      next.resourceProductHandle,
      previous.resourceIdentityHandle,
      next.resourceIdentityHandle,
      previous.definitionProductHandle,
      next.definitionProductHandle,
      previous.visibilityKind,
      next.visibilityKind,
    )
    || !sameArrays(previous.aliases, next.aliases, (left, right) => left === right)
  ) {
    return KernelPublicationDecisionKind.Replace;
  }
  return witnessDecision(sameKernelRecordWitness(
    previous.sourceAddressHandle,
    next.sourceAddressHandle,
    context,
  ));
}

function sameCompilerServiceReferenceSemantics(
  previous: TemplateCompilerServiceReference,
  next: TemplateCompilerServiceReference,
): boolean {
  // Open-seam handles name the exact callable pressure and are semantic membership of this candidate.
  return sameValues(
    previous.serviceKind,
    next.serviceKind,
    previous.productHandle,
    next.productHandle,
    previous.identityHandle,
    next.identityHandle,
  );
}

function sameTemplateCompilerHookEntrySemantics(
  previous: TemplateCompilerHookEntry,
  next: TemplateCompilerHookEntry,
): boolean {
  return sameValues(
    previous.lane,
    next.lane,
    previous.laneOrdinal,
    next.laneOrdinal,
    previous.sourceOrdinal,
    next.sourceOrdinal,
    previous.hookKind,
    next.hookKind,
    previous.cause.causeKind,
    next.cause.causeKind,
    previous.cause.productHandle,
    next.cause.productHandle,
    previous.cause.identityHandle,
    next.cause.identityHandle,
    previous.cause.registryEffectKey,
    next.cause.registryEffectKey,
    previous.cssClassMapping?.productHandle ?? null,
    next.cssClassMapping?.productHandle ?? null,
    previous.cssClassMapping?.identityHandle ?? null,
    next.cssClassMapping?.identityHandle ?? null,
    previous.provider.resolutionKind,
    next.provider.resolutionKind,
    previous.provider.reason,
    next.provider.reason,
    previous.callable.authorityKind,
    next.callable.authorityKind,
    previous.callable.identityHandle,
    next.callable.identityHandle,
    previous.callable.callableSlotKey,
    next.callable.callableSlotKey,
    previous.callable.reason,
    next.callable.reason,
  )
    && sameArrays(
      previous.provider.openSeamHandles,
      next.provider.openSeamHandles,
      (left, right) => left === right,
    )
    && sameArrays(
      previous.callable.openSeamHandles,
      next.callable.openSeamHandles,
      (left, right) => left === right,
    );
}

function sameCssClassMappingOpenReasonSemantics(
  previous: CssClassMappingOpenReason,
  next: CssClassMappingOpenReason,
): boolean {
  return sameValues(
    previous.reasonKind,
    next.reasonKind,
    previous.summary,
    next.summary,
    previous.sourceOrdinal,
    next.sourceOrdinal,
    previous.mappingArgumentOrdinal,
    next.mappingArgumentOrdinal,
    previous.sourceModuleKey,
    next.sourceModuleKey,
  ) && sameArrays(previous.openSeamHandles, next.openSeamHandles, (left, right) => left === right);
}

function sameTemplateCompilerHookOpenReasonSemantics(
  previous: TemplateCompilerHookOpenReason,
  next: TemplateCompilerHookOpenReason,
): boolean {
  return sameValues(
    previous.reasonKind,
    next.reasonKind,
    previous.lane,
    next.lane,
    previous.summary,
    next.summary,
  )
    && sameArrays(previous.openSeamHandles, next.openSeamHandles, (left, right) => left === right);
}

function sameAppRootSemantics(previous: AppRootReference, next: AppRootReference): boolean {
  return sameValues(
    previous.identityHandle,
    next.identityHandle,
    previous.productHandle,
    next.productHandle,
    previous.localName,
    next.localName,
  );
}

function sameContainerSemantics(previous: ContainerReference, next: ContainerReference): boolean {
  return sameValues(
    previous.identityHandle,
    next.identityHandle,
    previous.productHandle,
    next.productHandle,
    previous.localName,
    next.localName,
  );
}

function sameContainerWitness(
  previous: ContainerReference,
  next: ContainerReference,
  context: KernelPublicationComparisonContext,
): boolean {
  return sameKernelRecordWitness(previous.addressHandle, next.addressHandle, context);
}

function sameTemplateResourceScopeReferenceSemantics(
  previous: TemplateResourceScopeReference,
  next: TemplateResourceScopeReference,
): boolean {
  return sameValues(
    previous.productHandle,
    next.productHandle,
    previous.identityHandle,
    next.identityHandle,
  ) && sameContainerSemantics(previous.container, next.container);
}

function sameTemplateResourceScopeReferenceWitness(
  previous: TemplateResourceScopeReference | null,
  next: TemplateResourceScopeReference | null,
  context: KernelPublicationComparisonContext,
): boolean {
  return previous == null || next == null
    ? previous === next
    : sameContainerWitness(previous.container, next.container, context)
      && sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context);
}

function sameResourceTargetSemantics(
  previous: ResourceTargetReference,
  next: ResourceTargetReference,
): boolean {
  return sameValues(
    previous.identityHandle,
    next.identityHandle,
    previous.localName,
    next.localName,
    previous.moduleKey,
    next.moduleKey,
  ) && sameNullable(previous.targetType, next.targetType, sameCheckerTypeReferenceSemantics);
}

function sameResourceTargetWitness(
  previous: ResourceTargetReference,
  next: ResourceTargetReference,
  context: KernelPublicationComparisonContext,
): boolean {
  return sameKernelRecordWitness(previous.addressHandle, next.addressHandle, context)
    && sameKernelRecordWitness(
      previous.declarationSourceAddressHandle,
      next.declarationSourceAddressHandle,
      context,
    )
    && sameNullable(previous.targetType, next.targetType, (left, right) =>
      sameKernelRecordWitness(left.sourceAddressHandle, right.sourceAddressHandle, context));
}

function sameCheckerTypeReferenceSemantics(
  previous: CheckerTypeReference,
  next: CheckerTypeReference,
): boolean {
  return sameValues(
    previous.productHandle,
    next.productHandle,
    previous.identityHandle,
    next.identityHandle,
    previous.semanticKey,
    next.semanticKey,
    previous.display,
    next.display,
    previous.shapeKind,
    next.shapeKind,
    previous.origin,
    next.origin,
  );
}

function sameAttributePatternDefinitionSemantics(
  previous: AttributePatternDefinitionEntry,
  next: AttributePatternDefinitionEntry,
): boolean {
  return previous.pattern === next.pattern && previous.symbols === next.symbols;
}

function sameAttributePatternDefinitionWitness(
  previous: AttributePatternDefinitionEntry,
  next: AttributePatternDefinitionEntry,
  context: KernelPublicationComparisonContext,
): boolean {
  return sameKernelRecordWitness(previous.addressHandle, next.addressHandle, context)
    && sameKernelRecordWitness(previous.provenanceHandle, next.provenanceHandle, context);
}

function sameAttributeMapperConfiguration(
  previous: AttributeMapperConfiguration,
  next: AttributeMapperConfiguration,
): boolean {
  return sameArrays(previous.mappings, next.mappings, (left, right) =>
    sameValues(
      left.tagName,
      right.tagName,
      left.attributeName,
      right.attributeName,
      left.propertyName,
      right.propertyName,
    ))
    && sameArrays(previous.twoWayRules, next.twoWayRules, (left, right) =>
      left.predicateSlot.key === right.predicateSlot.key);
}

function sameObserverLocatorConfiguration(
  previous: ObserverLocatorConfiguration,
  next: ObserverLocatorConfiguration,
): boolean {
  return previous.node.allowDirtyCheck === next.node.allowDirtyCheck
    && sameArrays(previous.node.nodeConfigs, next.node.nodeConfigs, (left, right) =>
      left.tagName === right.tagName
        && left.propertyName === right.propertyName
        && sameRuntimeNodeObserverConfig(left.config, right.config))
    && sameArrays(previous.node.globalConfigs, next.node.globalConfigs, (left, right) =>
      left.propertyName === right.propertyName
        && sameRuntimeNodeObserverConfig(left.config, right.config))
    && sameArrays(previous.node.accessorOverrides, next.node.accessorOverrides, (left, right) =>
      left.tagName === right.tagName && left.propertyName === right.propertyName)
    && sameArrays(previous.node.globalAccessorOverrides, next.node.globalAccessorOverrides, (left, right) => left === right)
    && sameArrays(previous.objectAdapters, next.objectAdapters, (left, right) =>
      left.order === right.order && left.adapterName === right.adapterName);
}

function sameObserverLocatorConfigurationWitness(
  previous: ObserverLocatorConfiguration,
  next: ObserverLocatorConfiguration,
  context: KernelPublicationComparisonContext,
): boolean {
  return sameArrays(previous.objectAdapters, next.objectAdapters, (left, right) =>
    sameKernelRecordWitness(left.sourceAddressHandle, right.sourceAddressHandle, context)
      && sameKernelRecordWitness(left.provenanceHandle, right.provenanceHandle, context));
}

function sameRuntimeKeyMappingConfiguration(
  previous: RuntimeKeyMappingConfiguration,
  next: RuntimeKeyMappingConfiguration,
): boolean {
  return previous.metaDomainClosed === next.metaDomainClosed
    && previous.keyDomainClosed === next.keyDomainClosed
    && sameArrays(previous.meta, next.meta, (left, right) =>
      left.modifier === right.modifier && left.runtimeName === right.runtimeName)
    && sameArrays(previous.keys, next.keys, (left, right) =>
      left.modifier === right.modifier && left.runtimeName === right.runtimeName);
}

function sameRuntimeKeyMappingWitness(
  previous: RuntimeKeyMappingConfiguration,
  next: RuntimeKeyMappingConfiguration,
  context: KernelPublicationComparisonContext,
): boolean {
  return sameArrays(previous.meta, next.meta, (left, right) =>
    sameKernelRecordWitness(left.sourceAddressHandle, right.sourceAddressHandle, context)
      && sameKernelRecordWitness(left.provenanceHandle, right.provenanceHandle, context))
    && sameArrays(previous.keys, next.keys, (left, right) =>
      sameKernelRecordWitness(left.sourceAddressHandle, right.sourceAddressHandle, context)
        && sameKernelRecordWitness(left.provenanceHandle, right.provenanceHandle, context));
}

function sameRuntimeNodeObserverConfig(
  previous: ObserverLocatorConfiguration['node']['nodeConfigs'][number]['config'],
  next: ObserverLocatorConfiguration['node']['nodeConfigs'][number]['config'],
): boolean {
  return sameValues(
    previous.observerKind,
    next.observerKind,
    previous.observerConstructorName,
    next.observerConstructorName,
    previous.readonlyValue,
    next.readonlyValue,
    previous.defaultValue,
    next.defaultValue,
    previous.openReason,
    next.openReason,
    previous.fieldStates.type,
    next.fieldStates.type,
    previous.fieldStates.events,
    next.fieldStates.events,
    previous.fieldStates.readonly,
    next.fieldStates.readonly,
    previous.fieldStates.default,
    next.fieldStates.default,
  ) && sameArrays(previous.eventNames, next.eventNames, (left, right) => left === right);
}

function compareNullableDetails<TValue>(
  previous: TValue | null,
  next: TValue | null,
  compare: (previous: TValue, next: TValue) => KernelComparablePublicationDecision,
): KernelComparablePublicationDecision {
  return previous == null || next == null
    ? previous === next
      ? KernelPublicationDecisionKind.Retain
      : KernelPublicationDecisionKind.Replace
    : compare(previous, next);
}

function compareArrays<TValue>(
  previous: readonly TValue[],
  next: readonly TValue[],
  compare: (previous: TValue, next: TValue) => KernelComparablePublicationDecision,
): KernelComparablePublicationDecision {
  if (previous.length !== next.length) return KernelPublicationDecisionKind.Replace;
  let decision: KernelComparablePublicationDecision = KernelPublicationDecisionKind.Retain;
  for (let index = 0; index < previous.length; index += 1) {
    decision = combineDecisions(decision, compare(previous[index]!, next[index]!));
    if (decision === KernelPublicationDecisionKind.Replace) return decision;
  }
  return decision;
}

function combineDecisions(
  ...decisions: readonly KernelComparablePublicationDecision[]
): KernelComparablePublicationDecision {
  return decisions.includes(KernelPublicationDecisionKind.Replace)
    ? KernelPublicationDecisionKind.Replace
    : decisions.includes(KernelPublicationDecisionKind.RefreshWitness)
      ? KernelPublicationDecisionKind.RefreshWitness
      : KernelPublicationDecisionKind.Retain;
}

function witnessDecision(sameWitness: boolean): KernelComparablePublicationDecision {
  return sameWitness
    ? KernelPublicationDecisionKind.Retain
    : KernelPublicationDecisionKind.RefreshWitness;
}

function sameNullable<TValue>(
  previous: TValue | null,
  next: TValue | null,
  compare: (previous: TValue, next: TValue) => boolean,
): boolean {
  return previous == null || next == null
    ? previous === next
    : compare(previous, next);
}

function sameArrays<TValue>(
  previous: readonly TValue[],
  next: readonly TValue[],
  compare: (previous: TValue, next: TValue) => boolean,
): boolean {
  return previous.length === next.length
    && previous.every((value, index) => compare(value, next[index]!));
}

function sameValues(...values: readonly unknown[]): boolean {
  for (let index = 0; index < values.length; index += 2) {
    if (values[index] !== values[index + 1]) return false;
  }
  return true;
}
