import type { ProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import { defineProductDetailSlot } from '../kernel/product-details.js';
import {
  kernelFieldProvenanceReferences,
  kernelProductDetailReference,
  kernelRecordReferences,
  mergeKernelDetailReferences,
  sameKernelDetailReferences,
  type KernelDetailReferenceClosure,
} from '../kernel/detail-references.js';
import {
  KernelPublicationDecisionKind,
  type KernelComparablePublicationDecision,
  type KernelPublicationComparisonContext,
} from '../kernel/publication-comparison.js';
import { KernelPublicationSurface } from '../kernel/publication-surface.js';
import type { ProductHandle } from '../kernel/handles.js';
import { TemplateDetailDescriptors } from '../template/detail-descriptors.js';
import { checkerTypeReferenceKernelReferences } from '../type-system/structural-references.js';
import {
  BindableDefinition,
  type BindableDefinitionContribution,
  type BindableSetterDefinition,
} from './bindable-definition.js';
import type {
  BuiltInResourceCatalog,
  ConfiguredBuiltInResourceCatalogSelection,
} from './built-in-resources.js';
import type {
  CustomAttributeDefinition,
  CustomAttributeDefinitionContribution,
} from './custom-attribute-definition.js';
import type {
  CustomElementCaptureDefinition,
  CustomElementDefinition,
  CustomElementDefinitionContribution,
  CustomElementTemplateDefinition,
} from './custom-element-definition.js';
import type {
  FullResourceDefinition,
} from './resource-definition.js';
import {
  ResourceDetailDescriptors,
  type ResourceDefinitionHeaderDetail,
} from './detail-descriptors.js';
import { ResourceDefinitionHeaderEmission } from './resource-definition-header-emission.js';
import type { ResourceIssue } from './resource-issue.js';
import { ResourceDefinitionKind } from './resource-kind.js';
import type {
  InstructionReference,
  ResourceAliasDefinition,
  ResourceDependencyReference,
  ResourceTargetReference,
} from './resource-reference.js';
import type {
  WatchCallbackDefinition,
  WatchDefinition,
  WatchDefinitionContribution,
  WatchExpressionDefinition,
  WatchPropertyKeyDefinition,
} from './watch-definition.js';

export type { ResourceDefinitionHeaderDetail } from './detail-descriptors.js';

function productDetailReferences(
  descriptor: ProductDetailDescriptor<unknown>,
  ...handles: readonly (ProductHandle | null | undefined)[]
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(...handles),
    handles.map((handle) => kernelProductDetailReference(descriptor, handle)),
  );
}

function resourceTargetReferenceReferences(
  target: ResourceTargetReference | null,
): KernelDetailReferenceClosure {
  return target == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        kernelRecordReferences(
          target.identityHandle,
          target.addressHandle,
          target.declarationSourceAddressHandle,
        ),
        checkerTypeReferenceKernelReferences(target.targetType),
      );
}

function resourceAliasReferences(
  alias: ResourceAliasDefinition,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(kernelRecordReferences(alias.addressHandle, alias.provenanceHandle));
}

function resourceDependencyReferences(
  dependency: ResourceDependencyReference,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(kernelRecordReferences(dependency.identityHandle));
}

function instructionReferences(
  instruction: InstructionReference,
): KernelDetailReferenceClosure {
  return productDetailReferences(TemplateDetailDescriptors.Instruction, instruction.productHandle);
}

function bindableSetterReferences(
  setter: BindableSetterDefinition | null,
): KernelDetailReferenceClosure {
  return resourceTargetReferenceReferences(setter?.target ?? null);
}

function bindableReferences(
  bindable: BindableDefinition,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(
      bindable.sourceAddressHandle,
      bindable.nameSourceAddressHandle,
      bindable.attributeSourceAddressHandle,
      bindable.callbackSourceAddressHandle,
      bindable.modeSourceAddressHandle,
      bindable.setSourceAddressHandle,
    ),
    bindableSetterReferences(bindable.set),
    resourceTargetReferenceReferences(bindable.propertyTarget),
    resourceTargetReferenceReferences(bindable.callbackTarget),
    kernelFieldProvenanceReferences(bindable.fieldProvenance),
  );
}

function bindableContributionReferences(
  bindable: BindableDefinitionContribution,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(
      bindable.sourceAddressHandle,
      bindable.nameSourceAddressHandle,
      bindable.attributeSourceAddressHandle,
      bindable.callbackSourceAddressHandle,
      bindable.modeSourceAddressHandle,
      bindable.setSourceAddressHandle,
    ),
    bindableSetterReferences(bindable.set),
    kernelFieldProvenanceReferences(bindable.fieldProvenance),
  );
}

function watchPropertyKeyReferences(
  propertyKey: WatchPropertyKeyDefinition | null,
): KernelDetailReferenceClosure {
  return resourceTargetReferenceReferences(propertyKey?.target ?? null);
}

function watchExpressionReferences(
  expression: WatchExpressionDefinition | null,
): KernelDetailReferenceClosure {
  return expression == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        watchPropertyKeyReferences(expression.propertyKey),
        resourceTargetReferenceReferences(expression.target),
      );
}

function watchCallbackReferences(
  callback: WatchCallbackDefinition | null,
): KernelDetailReferenceClosure {
  return callback == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        watchPropertyKeyReferences(callback.methodName),
        resourceTargetReferenceReferences(callback.target),
      );
}

function watchReferences(
  watch: WatchDefinition,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    watchExpressionReferences(watch.expression),
    watchCallbackReferences(watch.callback),
    kernelFieldProvenanceReferences(watch.fieldProvenance),
  );
}

function watchContributionReferences(
  watch: WatchDefinitionContribution,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    watchExpressionReferences(watch.expression),
    watchCallbackReferences(watch.callback),
    kernelFieldProvenanceReferences(watch.fieldProvenance),
  );
}

function captureReferences(
  capture: CustomElementCaptureDefinition | null,
): KernelDetailReferenceClosure {
  return resourceTargetReferenceReferences(capture?.predicateTarget ?? null);
}

function templateReferences(
  template: CustomElementTemplateDefinition | null,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(kernelRecordReferences(template?.addressHandle));
}

function customElementContributionReferences(
  contribution: CustomElementDefinitionContribution,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    resourceTargetReferenceReferences(contribution.target),
    contribution.aliases.flatMap(resourceAliasReferences),
    captureReferences(contribution.capture),
    templateReferences(contribution.template),
    contribution.instructions.flatMap(instructionReferences),
    contribution.dependencies.flatMap(resourceDependencyReferences),
    kernelRecordReferences(contribution.injectable),
    contribution.surrogates.flatMap(instructionReferences),
    contribution.bindables.flatMap(bindableContributionReferences),
    contribution.watches.flatMap(watchContributionReferences),
    resourceTargetReferenceReferences(contribution.processContent),
    kernelFieldProvenanceReferences(contribution.fieldProvenance),
  );
}

function customElementReferences(
  definition: CustomElementDefinition,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    resourceTargetReferenceReferences(definition.target),
    definition.aliases.flatMap(resourceAliasReferences),
    captureReferences(definition.capture),
    templateReferences(definition.template),
    definition.instructions.flatMap(instructionReferences),
    definition.dependencies.flatMap(resourceDependencyReferences),
    kernelRecordReferences(definition.injectable),
    definition.surrogates.flatMap(instructionReferences),
    definition.bindables.flatMap(bindableReferences),
    definition.watches.flatMap(watchReferences),
    resourceTargetReferenceReferences(definition.processContent),
    definition.contributions.flatMap(customElementContributionReferences),
    kernelRecordReferences(definition.nameSourceAddressHandle),
    kernelFieldProvenanceReferences(definition.fieldProvenance),
  );
}

function customAttributeContributionReferences(
  contribution: CustomAttributeDefinitionContribution,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    resourceTargetReferenceReferences(contribution.target),
    contribution.aliases.flatMap(resourceAliasReferences),
    contribution.bindables.flatMap(bindableContributionReferences),
    contribution.watches.flatMap(watchContributionReferences),
    contribution.dependencies.flatMap(resourceDependencyReferences),
    kernelFieldProvenanceReferences(contribution.fieldProvenance),
  );
}

function customAttributeReferences(
  definition: CustomAttributeDefinition,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    resourceTargetReferenceReferences(definition.target),
    definition.aliases.flatMap(resourceAliasReferences),
    definition.bindables.flatMap(bindableReferences),
    definition.watches.flatMap(watchReferences),
    definition.dependencies.flatMap(resourceDependencyReferences),
    definition.contributions.flatMap(customAttributeContributionReferences),
    kernelRecordReferences(definition.nameSourceAddressHandle),
    kernelFieldProvenanceReferences(definition.fieldProvenance),
  );
}

function thinNamedDefinitionReferences(
  definition: Extract<FullResourceDefinition, {
    readonly type: ResourceDefinitionKind.ValueConverter
      | ResourceDefinitionKind.BindingBehavior
      | ResourceDefinitionKind.BindingCommand;
  }>,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    resourceTargetReferenceReferences(definition.target),
    definition.aliases.flatMap(resourceAliasReferences),
    definition.contributions.flatMap((contribution) => mergeKernelDetailReferences(
      resourceTargetReferenceReferences(contribution.target),
      contribution.aliases.flatMap(resourceAliasReferences),
      kernelFieldProvenanceReferences(contribution.fieldProvenance),
    )),
    kernelRecordReferences(definition.nameSourceAddressHandle),
    kernelFieldProvenanceReferences(definition.fieldProvenance),
  );
}

function resourceDefinitionReferences(
  definition: FullResourceDefinition,
): KernelDetailReferenceClosure {
  let definitionReferences: KernelDetailReferenceClosure;
  switch (definition.type) {
    case ResourceDefinitionKind.CustomElement:
      definitionReferences = customElementReferences(definition);
      break;
    case ResourceDefinitionKind.CustomAttribute:
      definitionReferences = customAttributeReferences(definition);
      break;
    case ResourceDefinitionKind.ValueConverter:
    case ResourceDefinitionKind.BindingBehavior:
    case ResourceDefinitionKind.BindingCommand:
      definitionReferences = thinNamedDefinitionReferences(definition);
      break;
    case ResourceDefinitionKind.AttributePattern:
      definitionReferences = mergeKernelDetailReferences(
        resourceTargetReferenceReferences(definition.target),
        definition.patterns.flatMap((pattern) => kernelRecordReferences(
          pattern.addressHandle,
          pattern.provenanceHandle,
        )),
        definition.contributions.flatMap((contribution) => mergeKernelDetailReferences(
          resourceTargetReferenceReferences(contribution.target),
          contribution.patterns.flatMap((pattern) => kernelRecordReferences(
            pattern.addressHandle,
            pattern.provenanceHandle,
          )),
          kernelFieldProvenanceReferences(contribution.fieldProvenance),
        )),
        kernelFieldProvenanceReferences(definition.fieldProvenance),
      );
      break;
  }
  return mergeKernelDetailReferences(
    definitionReferences,
    kernelRecordReferences(definition.sourceAddressHandle),
  );
}

class ResourceDefinitionReferenceProjection {
  readonly semantic: KernelDetailReferenceClosure;
  readonly witness: KernelDetailReferenceClosure;

  constructor(
    all: KernelDetailReferenceClosure,
    witness: KernelDetailReferenceClosure,
  ) {
    const allKeys = new Set(all.map((reference) => reference.key));
    const unownedWitness = witness.find((reference) => !allKeys.has(reference.key)) ?? null;
    if (unownedWitness != null) {
      throw new Error(`Resource witness reference ${unownedWitness.key} is absent from its structural closure.`);
    }
    const witnessKeys = new Set(witness.map((reference) => reference.key));
    this.semantic = mergeKernelDetailReferences(
      all.filter((reference) => !witnessKeys.has(reference.key)),
    );
    this.witness = witness;
    Object.freeze(this);
  }
}

function resourceDefinitionReferenceProjection(
  definition: FullResourceDefinition,
): ResourceDefinitionReferenceProjection {
  return new ResourceDefinitionReferenceProjection(
    resourceDefinitionReferences(definition),
    resourceDefinitionWitnessReferences(definition),
  );
}

function resourceTargetWitnessReferences(
  target: ResourceTargetReference | null,
): KernelDetailReferenceClosure {
  return target == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(kernelRecordReferences(
        target.addressHandle,
        target.declarationSourceAddressHandle,
        target.targetType?.sourceAddressHandle,
      ));
}

function bindableWitnessReferences(
  bindable: BindableDefinition | BindableDefinitionContribution,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(
      bindable.sourceAddressHandle,
      bindable.nameSourceAddressHandle,
      bindable.attributeSourceAddressHandle,
      bindable.callbackSourceAddressHandle,
      bindable.modeSourceAddressHandle,
      bindable.setSourceAddressHandle,
    ),
    resourceTargetWitnessReferences(bindable.set?.target ?? null),
    bindable instanceof BindableDefinition
      ? resourceTargetWitnessReferences(bindable.propertyTarget)
      : [],
    bindable instanceof BindableDefinition
      ? resourceTargetWitnessReferences(bindable.callbackTarget)
      : [],
    kernelFieldProvenanceReferences(bindable.fieldProvenance),
  );
}

function watchPropertyKeyWitnessReferences(
  propertyKey: WatchPropertyKeyDefinition | null,
): KernelDetailReferenceClosure {
  return resourceTargetWitnessReferences(propertyKey?.target ?? null);
}

function watchExpressionWitnessReferences(
  expression: WatchExpressionDefinition | null,
): KernelDetailReferenceClosure {
  return expression == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        watchPropertyKeyWitnessReferences(expression.propertyKey),
        resourceTargetWitnessReferences(expression.target),
      );
}

function watchCallbackWitnessReferences(
  callback: WatchCallbackDefinition | null,
): KernelDetailReferenceClosure {
  return callback == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        watchPropertyKeyWitnessReferences(callback.methodName),
        resourceTargetWitnessReferences(callback.target),
      );
}

function watchWitnessReferences(
  watch: WatchDefinition | WatchDefinitionContribution,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    watchExpressionWitnessReferences(watch.expression),
    watchCallbackWitnessReferences(watch.callback),
    kernelFieldProvenanceReferences(watch.fieldProvenance),
  );
}

function customElementContributionWitnessReferences(
  contribution: CustomElementDefinitionContribution,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    resourceTargetWitnessReferences(contribution.target),
    contribution.aliases.flatMap(resourceAliasReferences),
    resourceTargetWitnessReferences(contribution.capture?.predicateTarget ?? null),
    templateReferences(contribution.template),
    contribution.bindables.flatMap(bindableWitnessReferences),
    contribution.watches.flatMap(watchWitnessReferences),
    resourceTargetWitnessReferences(contribution.processContent),
    kernelFieldProvenanceReferences(contribution.fieldProvenance),
  );
}

function customAttributeContributionWitnessReferences(
  contribution: CustomAttributeDefinitionContribution,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    resourceTargetWitnessReferences(contribution.target),
    contribution.aliases.flatMap(resourceAliasReferences),
    contribution.bindables.flatMap(bindableWitnessReferences),
    contribution.watches.flatMap(watchWitnessReferences),
    kernelFieldProvenanceReferences(contribution.fieldProvenance),
  );
}

function resourceDefinitionWitnessReferences(
  definition: FullResourceDefinition,
): KernelDetailReferenceClosure {
  const shared = mergeKernelDetailReferences(
    kernelRecordReferences(definition.sourceAddressHandle),
    resourceTargetWitnessReferences(definition.target),
    kernelFieldProvenanceReferences(definition.fieldProvenance),
  );
  switch (definition.type) {
    case ResourceDefinitionKind.CustomElement:
      return mergeKernelDetailReferences(
        shared,
        definition.aliases.flatMap(resourceAliasReferences),
        resourceTargetWitnessReferences(definition.capture.predicateTarget),
        templateReferences(definition.template),
        definition.bindables.flatMap(bindableWitnessReferences),
        definition.watches.flatMap(watchWitnessReferences),
        resourceTargetWitnessReferences(definition.processContent),
        definition.contributions.flatMap(customElementContributionWitnessReferences),
        kernelRecordReferences(definition.nameSourceAddressHandle),
      );
    case ResourceDefinitionKind.CustomAttribute:
      return mergeKernelDetailReferences(
        shared,
        definition.aliases.flatMap(resourceAliasReferences),
        definition.bindables.flatMap(bindableWitnessReferences),
        definition.watches.flatMap(watchWitnessReferences),
        definition.contributions.flatMap(customAttributeContributionWitnessReferences),
        kernelRecordReferences(definition.nameSourceAddressHandle),
      );
    case ResourceDefinitionKind.ValueConverter:
    case ResourceDefinitionKind.BindingBehavior:
    case ResourceDefinitionKind.BindingCommand:
      return mergeKernelDetailReferences(
        shared,
        definition.aliases.flatMap(resourceAliasReferences),
        definition.contributions.flatMap((contribution) => mergeKernelDetailReferences(
          resourceTargetWitnessReferences(contribution.target),
          contribution.aliases.flatMap(resourceAliasReferences),
          kernelFieldProvenanceReferences(contribution.fieldProvenance),
        )),
        kernelRecordReferences(definition.nameSourceAddressHandle),
      );
    case ResourceDefinitionKind.AttributePattern:
      return mergeKernelDetailReferences(
        shared,
        definition.patterns.flatMap((pattern) => kernelRecordReferences(
          pattern.addressHandle,
          pattern.provenanceHandle,
        )),
        definition.contributions.flatMap((contribution) => mergeKernelDetailReferences(
          resourceTargetWitnessReferences(contribution.target),
          contribution.patterns.flatMap((pattern) => kernelRecordReferences(
            pattern.addressHandle,
            pattern.provenanceHandle,
          )),
          kernelFieldProvenanceReferences(contribution.fieldProvenance),
        )),
      );
  }
}

type ResourceDefinitionComparisonValue =
  | string
  | number
  | boolean
  | null
  | readonly ResourceDefinitionComparisonValue[];

class ResourceDefinitionComparisonProjection {
  constructor(
    readonly semantic: ResourceDefinitionComparisonValue,
    readonly witness: ResourceDefinitionComparisonValue,
    readonly semanticReferences: KernelDetailReferenceClosure,
    readonly witnessReferences: KernelDetailReferenceClosure,
  ) {}
}

/** Exact definition result consumed by compiler reads and the definition detail slot comparator. */
export function resourceDefinitionComparisonRevisionParts(
  definition: FullResourceDefinition | null,
): readonly string[] {
  if (definition == null) {
    return ['no-definition'];
  }
  const projection = resourceDefinitionComparisonProjection(definition);
  return [
    'definition',
    JSON.stringify(projection.semantic),
    JSON.stringify(projection.witness),
    'semantic-references',
    JSON.stringify(projection.semanticReferences.map((reference) => [
      reference.surface,
      reference.handle,
      reference.detailKind,
    ])),
    'witness-references',
    JSON.stringify(projection.witnessReferences.map((reference) => [
      reference.surface,
      reference.handle,
      reference.detailKind,
    ])),
  ];
}

export function compareResourceDefinitionDetails(
  previous: FullResourceDefinition,
  next: FullResourceDefinition,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  const left = resourceDefinitionComparisonProjection(previous);
  const right = resourceDefinitionComparisonProjection(next);
  if (
    !sameKernelDetailReferences(left.semanticReferences, right.semanticReferences)
    || !sameResourceDefinitionComparisonValue(left.semantic, right.semantic)
  ) {
    return KernelPublicationDecisionKind.Replace;
  }
  let refreshWitness = !sameResourceDefinitionComparisonValue(left.witness, right.witness)
    || !sameKernelDetailReferences(left.witnessReferences, right.witnessReferences);
  const semanticReferenceDecision = compareResourceDefinitionRecordReferences(
    left.semanticReferences,
    right.semanticReferences,
    context,
  );
  if (semanticReferenceDecision === KernelPublicationDecisionKind.Replace) {
    return KernelPublicationDecisionKind.Replace;
  }
  refreshWitness ||= semanticReferenceDecision === KernelPublicationDecisionKind.RefreshWitness;
  if (sameKernelDetailReferences(left.witnessReferences, right.witnessReferences)) {
    refreshWitness ||= compareResourceDefinitionRecordReferences(
      left.witnessReferences,
      right.witnessReferences,
      context,
    ) !== KernelPublicationDecisionKind.Retain;
  }
  return refreshWitness
    ? KernelPublicationDecisionKind.RefreshWitness
    : KernelPublicationDecisionKind.Retain;
}

function compareResourceDefinitionRecordReferences(
  previous: KernelDetailReferenceClosure,
  next: KernelDetailReferenceClosure,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  let decision: KernelComparablePublicationDecision = KernelPublicationDecisionKind.Retain;
  for (let index = 0; index < previous.length; index += 1) {
    const reference = previous[index]!;
    const candidate = next[index]!;
    if (
      reference.surface === KernelPublicationSurface.Record
      && candidate.surface === KernelPublicationSurface.Record
    ) {
      const recordDecision = context.compareRecordHandles(reference.handle, candidate.handle);
      if (recordDecision === KernelPublicationDecisionKind.Replace) {
        return KernelPublicationDecisionKind.Replace;
      }
      if (recordDecision === KernelPublicationDecisionKind.RefreshWitness) {
        decision = KernelPublicationDecisionKind.RefreshWitness;
      }
    }
  }
  return decision;
}

function resourceDefinitionComparisonProjection(
  definition: FullResourceDefinition,
): ResourceDefinitionComparisonProjection {
  const sharedSemantic: ResourceDefinitionComparisonValue = [
    definition.type,
    definition.productHandle,
    definition.identityHandle,
    resourceTargetSemanticValue(definition.target),
  ];
  const sharedWitness: ResourceDefinitionComparisonValue = [
    definition.sourceAddressHandle,
    resourceTargetWitnessValue(definition.target),
    fieldProvenanceComparisonValue(definition.fieldProvenance),
  ];
  const references = resourceDefinitionReferenceProjection(definition);
  switch (definition.type) {
    case ResourceDefinitionKind.CustomElement:
      return new ResourceDefinitionComparisonProjection(
        [
          sharedSemantic,
          definition.name,
          definition.aliases.map((alias) => alias.name),
          definition.key,
          [definition.capture.kind, resourceTargetSemanticValue(definition.capture.predicateTarget)],
          templateSemanticValue(definition.template),
          definition.instructions.map(instructionSemanticValue),
          definition.dependencies.map(dependencySemanticValue),
          definition.injectable,
          definition.needsCompile,
          definition.surrogates.map(instructionSemanticValue),
          definition.bindables.map(bindableSemanticValue),
          definition.containerless,
          definition.shadowOptions?.mode ?? null,
          definition.hasSlots,
          definition.enhance,
          definition.watches.map(watchSemanticValue),
          definition.strict,
          resourceTargetSemanticValue(definition.processContent),
          definition.contributions.map(customElementContributionSemanticValue),
        ],
        [
          sharedWitness,
          definition.aliases.map(aliasWitnessValue),
          resourceTargetWitnessValue(definition.capture.predicateTarget),
          templateWitnessValue(definition.template),
          definition.bindables.map(bindableWitnessValue),
          definition.watches.map(watchWitnessValue),
          resourceTargetWitnessValue(definition.processContent),
          definition.contributions.map(customElementContributionWitnessValue),
          definition.nameSourceAddressHandle,
        ],
        references.semantic,
        references.witness,
      );
    case ResourceDefinitionKind.CustomAttribute:
      return new ResourceDefinitionComparisonProjection(
        [
          sharedSemantic,
          definition.name,
          definition.aliases.map((alias) => alias.name),
          definition.key,
          definition.isTemplateController,
          definition.bindables.map(bindableSemanticValue),
          definition.noMultiBindings,
          definition.watches.map(watchSemanticValue),
          definition.dependencies.map(dependencySemanticValue),
          definition.containerStrategy,
          definition.defaultProperty,
          definition.contributions.map(customAttributeContributionSemanticValue),
        ],
        [
          sharedWitness,
          definition.aliases.map(aliasWitnessValue),
          definition.bindables.map(bindableWitnessValue),
          definition.watches.map(watchWitnessValue),
          definition.contributions.map(customAttributeContributionWitnessValue),
          definition.nameSourceAddressHandle,
        ],
        references.semantic,
        references.witness,
      );
    case ResourceDefinitionKind.ValueConverter:
    case ResourceDefinitionKind.BindingBehavior:
    case ResourceDefinitionKind.BindingCommand:
      return new ResourceDefinitionComparisonProjection(
        [
          sharedSemantic,
          definition.name,
          definition.aliases.map((alias) => alias.name),
          definition.key,
          definition.contributions.map((contribution) => [
            contribution.contributionKind,
            resourceTargetSemanticValue(contribution.target),
            contribution.name,
            contribution.aliases.map((alias) => alias.name),
            contribution.key,
          ]),
        ],
        [
          sharedWitness,
          definition.aliases.map(aliasWitnessValue),
          definition.contributions.map((contribution) => [
            resourceTargetWitnessValue(contribution.target),
            contribution.aliases.map(aliasWitnessValue),
            fieldProvenanceComparisonValue(contribution.fieldProvenance),
          ]),
          definition.nameSourceAddressHandle,
        ],
        references.semantic,
        references.witness,
      );
    case ResourceDefinitionKind.AttributePattern:
      return new ResourceDefinitionComparisonProjection(
        [
          sharedSemantic,
          definition.patterns.map(attributePatternSemanticValue),
          definition.contributions.map((contribution) => [
            contribution.contributionKind,
            resourceTargetSemanticValue(contribution.target),
            contribution.patterns.map(attributePatternSemanticValue),
          ]),
        ],
        [
          sharedWitness,
          definition.patterns.map(attributePatternWitnessValue),
          definition.contributions.map((contribution) => [
            resourceTargetWitnessValue(contribution.target),
            contribution.patterns.map(attributePatternWitnessValue),
            fieldProvenanceComparisonValue(contribution.fieldProvenance),
          ]),
        ],
        references.semantic,
        references.witness,
      );
  }
}

function resourceTargetSemanticValue(
  target: ResourceTargetReference | null,
): ResourceDefinitionComparisonValue {
  return target == null
    ? null
    : [
      target.identityHandle,
      target.localName,
      target.moduleKey,
      target.targetType == null
        ? null
        : [
          target.targetType.productHandle,
          target.targetType.identityHandle,
          target.targetType.semanticKey,
          target.targetType.display,
          target.targetType.shapeKind,
          target.targetType.origin,
        ],
    ];
}

function resourceTargetWitnessValue(
  target: ResourceTargetReference | null,
): ResourceDefinitionComparisonValue {
  return target == null
    ? null
    : [
      target.addressHandle,
      target.declarationSourceAddressHandle,
      target.targetType?.sourceAddressHandle ?? null,
    ];
}

function aliasWitnessValue(
  alias: ResourceAliasDefinition,
): ResourceDefinitionComparisonValue {
  return [alias.addressHandle, alias.provenanceHandle];
}

function dependencySemanticValue(
  dependency: ResourceDependencyReference,
): ResourceDefinitionComparisonValue {
  return [
    dependency.identityHandle,
    dependency.keyName,
    dependency.moduleKey,
    dependency.localName,
    dependency.dependencyKind,
    dependency.registryKind,
  ];
}

function instructionSemanticValue(
  instruction: InstructionReference,
): ResourceDefinitionComparisonValue {
  return instruction.productHandle;
}

function templateSemanticValue(
  template: CustomElementTemplateDefinition | null,
): ResourceDefinitionComparisonValue {
  return template == null ? null : [template.kind, template.markup];
}

function templateWitnessValue(
  template: CustomElementTemplateDefinition | null,
): ResourceDefinitionComparisonValue {
  return template == null
    ? null
    : [
      template.addressHandle,
      template.authoredSourceRevision,
      template.sourceMap == null
        ? null
        : [template.sourceMap.decodedLength, template.sourceMap.decodedToSourceOffsets],
    ];
}

function bindableSemanticValue(
  bindable: BindableDefinition,
): ResourceDefinitionComparisonValue {
  return [
    bindable.attribute,
    bindable.callback,
    bindable.mode,
    bindable.name,
    bindable.set.kind,
    resourceTargetSemanticValue(bindable.set.target),
    resourceTargetSemanticValue(bindable.propertyTarget),
    resourceTargetSemanticValue(bindable.callbackTarget),
  ];
}

function bindableWitnessValue(
  bindable: BindableDefinition,
): ResourceDefinitionComparisonValue {
  return [
    bindable.sourceAddressHandle,
    bindable.nameSourceAddressHandle,
    bindable.attributeSourceAddressHandle,
    bindable.callbackSourceAddressHandle,
    bindable.modeSourceAddressHandle,
    bindable.setSourceAddressHandle,
    resourceTargetWitnessValue(bindable.set.target),
    resourceTargetWitnessValue(bindable.propertyTarget),
    resourceTargetWitnessValue(bindable.callbackTarget),
    fieldProvenanceComparisonValue(bindable.fieldProvenance),
  ];
}

function bindableContributionSemanticValue(
  bindable: BindableDefinitionContribution,
): ResourceDefinitionComparisonValue {
  return [
    bindable.contributionKind,
    bindable.propertyName,
    bindable.attribute,
    bindable.callback,
    bindable.mode,
    bindable.name,
    bindable.set == null
      ? null
      : [bindable.set.kind, resourceTargetSemanticValue(bindable.set.target)],
  ];
}

function bindableContributionWitnessValue(
  bindable: BindableDefinitionContribution,
): ResourceDefinitionComparisonValue {
  return [
    bindable.sourceAddressHandle,
    bindable.nameSourceAddressHandle,
    bindable.attributeSourceAddressHandle,
    bindable.callbackSourceAddressHandle,
    bindable.modeSourceAddressHandle,
    bindable.setSourceAddressHandle,
    resourceTargetWitnessValue(bindable.set?.target ?? null),
    fieldProvenanceComparisonValue(bindable.fieldProvenance),
  ];
}

function watchSemanticValue(
  watch: WatchDefinition,
): ResourceDefinitionComparisonValue {
  return [
    watchExpressionSemanticValue(watch.expression),
    watchCallbackSemanticValue(watch.callback),
    watch.flush,
  ];
}

function watchWitnessValue(
  watch: WatchDefinition,
): ResourceDefinitionComparisonValue {
  return [
    watchExpressionWitnessValue(watch.expression),
    watchCallbackWitnessValue(watch.callback),
    fieldProvenanceComparisonValue(watch.fieldProvenance),
  ];
}

function watchContributionSemanticValue(
  watch: WatchDefinitionContribution,
): ResourceDefinitionComparisonValue {
  return [
    watch.contributionKind,
    watchExpressionSemanticValue(watch.expression),
    watchCallbackSemanticValue(watch.callback),
    watch.flush,
  ];
}

function watchContributionWitnessValue(
  watch: WatchDefinitionContribution,
): ResourceDefinitionComparisonValue {
  return [
    watchExpressionWitnessValue(watch.expression),
    watchCallbackWitnessValue(watch.callback),
    fieldProvenanceComparisonValue(watch.fieldProvenance),
  ];
}

function watchExpressionSemanticValue(
  expression: WatchExpressionDefinition | null,
): ResourceDefinitionComparisonValue {
  return expression == null
    ? null
    : [
      expression.kind,
      watchPropertyKeySemanticValue(expression.propertyKey),
      resourceTargetSemanticValue(expression.target),
    ];
}

function watchExpressionWitnessValue(
  expression: WatchExpressionDefinition | null,
): ResourceDefinitionComparisonValue {
  return expression == null
    ? null
    : [
      watchPropertyKeyWitnessValue(expression.propertyKey),
      resourceTargetWitnessValue(expression.target),
    ];
}

function watchCallbackSemanticValue(
  callback: WatchCallbackDefinition | null,
): ResourceDefinitionComparisonValue {
  return callback == null
    ? null
    : [
      callback.kind,
      watchPropertyKeySemanticValue(callback.methodName),
      resourceTargetSemanticValue(callback.target),
    ];
}

function watchCallbackWitnessValue(
  callback: WatchCallbackDefinition | null,
): ResourceDefinitionComparisonValue {
  return callback == null
    ? null
    : [
      watchPropertyKeyWitnessValue(callback.methodName),
      resourceTargetWitnessValue(callback.target),
    ];
}

function watchPropertyKeySemanticValue(
  propertyKey: WatchPropertyKeyDefinition | null,
): ResourceDefinitionComparisonValue {
  return propertyKey == null
    ? null
    : [
      propertyKey.kind,
      propertyKey.text,
      propertyKey.number,
      resourceTargetSemanticValue(propertyKey.target),
    ];
}

function watchPropertyKeyWitnessValue(
  propertyKey: WatchPropertyKeyDefinition | null,
): ResourceDefinitionComparisonValue {
  return resourceTargetWitnessValue(propertyKey?.target ?? null);
}

function customElementContributionSemanticValue(
  contribution: CustomElementDefinitionContribution,
): ResourceDefinitionComparisonValue {
  return [
    contribution.contributionKind,
    resourceTargetSemanticValue(contribution.target),
    contribution.name,
    contribution.aliases.map((alias) => alias.name),
    contribution.key,
    contribution.capture == null
      ? null
      : [contribution.capture.kind, resourceTargetSemanticValue(contribution.capture.predicateTarget)],
    templateSemanticValue(contribution.template),
    contribution.instructions.map(instructionSemanticValue),
    contribution.dependencies.map(dependencySemanticValue),
    contribution.injectable,
    contribution.needsCompile,
    contribution.surrogates.map(instructionSemanticValue),
    contribution.bindables.map(bindableContributionSemanticValue),
    contribution.containerless,
    contribution.shadowOptions?.mode ?? null,
    contribution.hasSlots,
    contribution.enhance,
    contribution.watches.map(watchContributionSemanticValue),
    contribution.strict,
    resourceTargetSemanticValue(contribution.processContent),
  ];
}

function customElementContributionWitnessValue(
  contribution: CustomElementDefinitionContribution,
): ResourceDefinitionComparisonValue {
  return [
    resourceTargetWitnessValue(contribution.target),
    contribution.aliases.map(aliasWitnessValue),
    resourceTargetWitnessValue(contribution.capture?.predicateTarget ?? null),
    templateWitnessValue(contribution.template),
    contribution.bindables.map(bindableContributionWitnessValue),
    contribution.watches.map(watchContributionWitnessValue),
    resourceTargetWitnessValue(contribution.processContent),
    fieldProvenanceComparisonValue(contribution.fieldProvenance),
  ];
}

function customAttributeContributionSemanticValue(
  contribution: CustomAttributeDefinitionContribution,
): ResourceDefinitionComparisonValue {
  return [
    contribution.contributionKind,
    resourceTargetSemanticValue(contribution.target),
    contribution.name,
    contribution.aliases.map((alias) => alias.name),
    contribution.key,
    contribution.isTemplateController,
    contribution.bindables.map(bindableContributionSemanticValue),
    contribution.noMultiBindings,
    contribution.watches.map(watchContributionSemanticValue),
    contribution.dependencies.map(dependencySemanticValue),
    contribution.containerStrategy,
    contribution.defaultProperty,
  ];
}

function customAttributeContributionWitnessValue(
  contribution: CustomAttributeDefinitionContribution,
): ResourceDefinitionComparisonValue {
  return [
    resourceTargetWitnessValue(contribution.target),
    contribution.aliases.map(aliasWitnessValue),
    contribution.bindables.map(bindableContributionWitnessValue),
    contribution.watches.map(watchContributionWitnessValue),
    fieldProvenanceComparisonValue(contribution.fieldProvenance),
  ];
}

function attributePatternSemanticValue(
  pattern: { readonly pattern: string; readonly symbols: string },
): ResourceDefinitionComparisonValue {
  return [pattern.pattern, pattern.symbols];
}

function attributePatternWitnessValue(
  pattern: { readonly addressHandle: string | null; readonly provenanceHandle: string | null },
): ResourceDefinitionComparisonValue {
  return [pattern.addressHandle, pattern.provenanceHandle];
}

function fieldProvenanceComparisonValue(
  provenance: readonly { readonly field: string; readonly provenanceHandle: string }[],
): ResourceDefinitionComparisonValue {
  return provenance.map((entry) => [entry.field, entry.provenanceHandle]);
}

function sameResourceDefinitionComparisonValue(
  previous: ResourceDefinitionComparisonValue,
  next: ResourceDefinitionComparisonValue,
): boolean {
  if (!isResourceDefinitionComparisonValues(previous) || !isResourceDefinitionComparisonValues(next)) {
    return previous === next;
  }
  return previous.length === next.length
    && previous.every((value, index) => sameResourceDefinitionComparisonValue(value, next[index]!));
}

function isResourceDefinitionComparisonValues(
  value: ResourceDefinitionComparisonValue,
): value is readonly ResourceDefinitionComparisonValue[] {
  return Array.isArray(value);
}

function definitionHeaderReferences(
  header: ResourceDefinitionHeaderDetail,
): KernelDetailReferenceClosure {
  return header instanceof ResourceDefinitionHeaderEmission
    ? mergeKernelDetailReferences(
        resourceTargetReferenceReferences(header.targetReference),
        kernelRecordReferences(...header.lookupNameSourceAddressHandles, ...header.claimHandles),
      )
    : mergeKernelDetailReferences(kernelFieldProvenanceReferences(header.fieldProvenance));
}

function resourceIssueReferences(
  issue: ResourceIssue,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(
      issue.ownerDefinitionIdentityHandle,
      ...issue.relatedInformation.map((information) => information.sourceAddressHandle),
    ),
    kernelFieldProvenanceReferences(issue.fieldProvenance),
  );
}

function builtInCatalogReferences(
  catalog: BuiltInResourceCatalog,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    catalog.resources.flatMap((resource) => mergeKernelDetailReferences(
      productDetailReferences(ResourceDetailDescriptors.DefinitionHeader, resource.productHandle),
      kernelRecordReferences(resource.identityHandle, resource.sourceAddressHandle),
      kernelFieldProvenanceReferences(resource.fieldProvenance),
    )),
    kernelFieldProvenanceReferences(catalog.fieldProvenance),
  );
}

function configuredCatalogSelectionReferences(
  selection: ConfiguredBuiltInResourceCatalogSelection,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(selection.registrationAdmissionProductHandle),
    productDetailReferences(ResourceDetailDescriptors.BuiltInCatalog, ...selection.catalogProductHandles),
    kernelFieldProvenanceReferences(selection.fieldProvenance),
  );
}

/** Typed detail slots for resource products before DI and template compiler visibility spend them. */
export const ResourceProductDetails = {
  DefinitionHeader: defineProductDetailSlot(
    ResourceDetailDescriptors.DefinitionHeader,
    definitionHeaderReferences,
  ),
  Definition: defineProductDetailSlot(
    ResourceDetailDescriptors.Definition,
    resourceDefinitionReferences,
    compareResourceDefinitionDetails,
  ),
  Issue: defineProductDetailSlot(
    ResourceDetailDescriptors.Issue,
    resourceIssueReferences,
  ),
  BuiltInCatalog: defineProductDetailSlot(
    ResourceDetailDescriptors.BuiltInCatalog,
    builtInCatalogReferences,
  ),
  ConfiguredBuiltInResourceCatalogSelection: defineProductDetailSlot(
    ResourceDetailDescriptors.ConfiguredBuiltInResourceCatalogSelection,
    configuredCatalogSelectionReferences,
  ),
} as const;
