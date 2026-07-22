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
import type { NodeObserverLocatorConfiguration } from '../observation/observer-locator.js';
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
  TemplateAttributeMapperService,
  TemplateCompilerService,
  TemplateCompilerWorld,
  TemplateExpressionParserService,
  TemplateRenderingService,
  TemplateResourceResolverService,
  TemplateResourceScope,
} from './compiler-world.js';
import type {
  TemplateCompilerServiceReference,
  TemplateVisibleResource,
} from './compiler-world-reference.js';
import type { RuntimeRenderer } from './runtime-renderer.js';

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
    || !sameNodeObserverLocatorConfiguration(
      previous.nodeObserverLocatorConfiguration,
      next.nodeObserverLocatorConfiguration,
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
  ) {
    return KernelPublicationDecisionKind.Replace;
  }
  return combineDecisions(
    compareArrays(previous.resources, next.resources, (left, right) =>
      compareTemplateVisibleResource(left, right, context)),
    compareArrays(previous.syntaxResources, next.syntaxResources, (left, right) =>
      compareTemplateVisibleResource(left, right, context)),
    witnessDecision(
      sameContainerWitness(previous.container, next.container, context)
        && sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
        && sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context),
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

export function compareTemplateResourceResolverServiceDetails(
  previous: TemplateResourceResolverService,
  next: TemplateResourceResolverService,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  return combineDecisions(
    compareContainerService(previous, next, context),
    compareArrays(previous.resources, next.resources, (left, right) =>
      compareTemplateVisibleResource(left, right, context)),
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
      previous.rendererKind,
      next.rendererKind,
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
  return sameValues(
    previous.serviceKind,
    next.serviceKind,
    previous.productHandle,
    next.productHandle,
    previous.identityHandle,
    next.identityHandle,
  );
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
      sameValues(left.tagName, right.tagName, left.propertyName, right.propertyName));
}

function sameNodeObserverLocatorConfiguration(
  previous: NodeObserverLocatorConfiguration | null,
  next: NodeObserverLocatorConfiguration | null,
): boolean {
  if (previous == null || next == null) return previous === next;
  return previous.allowDirtyCheck === next.allowDirtyCheck
    && sameArrays(previous.nodeConfigs, next.nodeConfigs, (left, right) =>
      left.tagName === right.tagName
        && left.propertyName === right.propertyName
        && sameRuntimeNodeObserverConfig(left.config, right.config))
    && sameArrays(previous.globalConfigs, next.globalConfigs, (left, right) =>
      left.propertyName === right.propertyName
        && sameRuntimeNodeObserverConfig(left.config, right.config))
    && sameArrays(previous.accessorOverrides, next.accessorOverrides, (left, right) =>
      left.tagName === right.tagName && left.propertyName === right.propertyName)
    && sameArrays(previous.globalAccessorOverrides, next.globalAccessorOverrides, (left, right) => left === right);
}

function sameRuntimeNodeObserverConfig(
  previous: NodeObserverLocatorConfiguration['nodeConfigs'][number]['config'],
  next: NodeObserverLocatorConfiguration['nodeConfigs'][number]['config'],
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
