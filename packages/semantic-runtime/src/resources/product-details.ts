import type { ProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import { defineProductDetailSlot } from '../kernel/product-details.js';
import {
  kernelFieldProvenanceReferences,
  kernelProductDetailReference,
  kernelRecordReferences,
  mergeKernelDetailReferences,
  type KernelDetailReference,
} from '../kernel/detail-references.js';
import type { ProductHandle } from '../kernel/handles.js';
import { TemplateDetailDescriptors } from '../template/detail-descriptors.js';
import { checkerTypeReferenceKernelReferences } from '../type-system/structural-references.js';
import type {
  BindableDefinition,
  BindableDefinitionContribution,
  BindableSetterDefinition,
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
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    kernelRecordReferences(...handles),
    handles.map((handle) => kernelProductDetailReference(descriptor, handle)),
  );
}

function resourceTargetReferenceReferences(
  target: ResourceTargetReference | null,
): readonly KernelDetailReference[] {
  return target == null
    ? []
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
): readonly KernelDetailReference[] {
  return kernelRecordReferences(alias.addressHandle, alias.provenanceHandle);
}

function resourceDependencyReferences(
  dependency: ResourceDependencyReference,
): readonly KernelDetailReference[] {
  return kernelRecordReferences(dependency.identityHandle);
}

function instructionReferences(
  instruction: InstructionReference,
): readonly KernelDetailReference[] {
  return productDetailReferences(TemplateDetailDescriptors.Instruction, instruction.productHandle);
}

function bindableSetterReferences(
  setter: BindableSetterDefinition | null,
): readonly KernelDetailReference[] {
  return resourceTargetReferenceReferences(setter?.target ?? null);
}

function bindableReferences(
  bindable: BindableDefinition,
): readonly KernelDetailReference[] {
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
): readonly KernelDetailReference[] {
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
): readonly KernelDetailReference[] {
  return resourceTargetReferenceReferences(propertyKey?.target ?? null);
}

function watchExpressionReferences(
  expression: WatchExpressionDefinition | null,
): readonly KernelDetailReference[] {
  return expression == null
    ? []
    : mergeKernelDetailReferences(
        watchPropertyKeyReferences(expression.propertyKey),
        resourceTargetReferenceReferences(expression.target),
      );
}

function watchCallbackReferences(
  callback: WatchCallbackDefinition | null,
): readonly KernelDetailReference[] {
  return callback == null
    ? []
    : mergeKernelDetailReferences(
        watchPropertyKeyReferences(callback.methodName),
        resourceTargetReferenceReferences(callback.target),
      );
}

function watchReferences(
  watch: WatchDefinition,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    watchExpressionReferences(watch.expression),
    watchCallbackReferences(watch.callback),
    kernelFieldProvenanceReferences(watch.fieldProvenance),
  );
}

function watchContributionReferences(
  watch: WatchDefinitionContribution,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    watchExpressionReferences(watch.expression),
    watchCallbackReferences(watch.callback),
    kernelFieldProvenanceReferences(watch.fieldProvenance),
  );
}

function captureReferences(
  capture: CustomElementCaptureDefinition | null,
): readonly KernelDetailReference[] {
  return resourceTargetReferenceReferences(capture?.predicateTarget ?? null);
}

function templateReferences(
  template: CustomElementTemplateDefinition | null,
): readonly KernelDetailReference[] {
  return kernelRecordReferences(template?.addressHandle);
}

function customElementContributionReferences(
  contribution: CustomElementDefinitionContribution,
): readonly KernelDetailReference[] {
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
): readonly KernelDetailReference[] {
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
): readonly KernelDetailReference[] {
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
): readonly KernelDetailReference[] {
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
): readonly KernelDetailReference[] {
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
): readonly KernelDetailReference[] {
  switch (definition.type) {
    case ResourceDefinitionKind.CustomElement:
      return customElementReferences(definition);
    case ResourceDefinitionKind.CustomAttribute:
      return customAttributeReferences(definition);
    case ResourceDefinitionKind.ValueConverter:
    case ResourceDefinitionKind.BindingBehavior:
    case ResourceDefinitionKind.BindingCommand:
      return thinNamedDefinitionReferences(definition);
    case ResourceDefinitionKind.AttributePattern:
      return mergeKernelDetailReferences(
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
  }
}

function definitionHeaderReferences(
  header: ResourceDefinitionHeaderDetail,
): readonly KernelDetailReference[] {
  return header instanceof ResourceDefinitionHeaderEmission
    ? mergeKernelDetailReferences(
        resourceTargetReferenceReferences(header.targetReference),
        kernelRecordReferences(...header.lookupNameSourceAddressHandles, ...header.claimHandles),
      )
    : kernelFieldProvenanceReferences(header.fieldProvenance);
}

function resourceIssueReferences(
  issue: ResourceIssue,
): readonly KernelDetailReference[] {
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
): readonly KernelDetailReference[] {
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
): readonly KernelDetailReference[] {
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
