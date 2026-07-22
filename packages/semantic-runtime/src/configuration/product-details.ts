import { defineProductDetailSlot } from '../kernel/product-details.js';
import type { ProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import {
  kernelHotDetailReference,
  kernelFieldProvenanceReferences,
  kernelProductDetailReference,
  kernelRecordReferences,
  mergeKernelDetailReferences,
  noKernelDetailReferences,
  type KernelDetailReferenceClosure,
} from '../kernel/detail-references.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { ContainerReference } from '../di/container-reference.js';
import { ResourceDetailDescriptors } from '../resources/detail-descriptors.js';
import type { ResourceTargetReference } from '../resources/resource-reference.js';
import { TemplateDetailDescriptors } from '../template/detail-descriptors.js';
import { TypeSystemHotDetailDescriptors } from '../type-system/detail-descriptors.js';
import { checkerTypeReferenceKernelReferences } from '../type-system/structural-references.js';
import type {
  BindingContext,
  BindingContextSlot,
  BindingScope,
  BindingScopeCreator,
  OverrideContext,
} from './scope.js';
import { BindingScopeCreatorKind } from './scope.js';
import type {
  ControllerReference,
  ControllerProduct,
  ViewFactory,
} from './controller.js';
import { ControllerPhase } from './controller.js';
import { ConfigurationDetailDescriptors } from './detail-descriptors.js';
import { bindingScopeReferenceKernelReferences } from './structural-references.js';

function productDetailReferences(
  descriptor: ProductDetailDescriptor<unknown>,
  ...handles: readonly (ProductHandle | null | undefined)[]
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(...handles),
    handles.map((handle) => kernelProductDetailReference(descriptor, handle)),
  );
}

function containerReferenceReferences(
  reference: ContainerReference,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(
      reference.productHandle,
      reference.identityHandle,
      reference.addressHandle,
    ),
  );
}

function resourceTargetReferenceReferences(
  reference: ResourceTargetReference | null,
): KernelDetailReferenceClosure {
  return reference == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        kernelRecordReferences(
          reference.identityHandle,
          reference.addressHandle,
          reference.declarationSourceAddressHandle,
        ),
        checkerTypeReferenceKernelReferences(reference.targetType),
      );
}

function controllerReferenceReferences(
  reference: ControllerReference | null,
): KernelDetailReferenceClosure {
  return reference == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        productDetailReferences(ConfigurationDetailDescriptors.Controller, reference.productHandle),
        kernelRecordReferences(reference.identityHandle, reference.addressHandle),
      );
}

function bindingContextSlotReferences(
  slot: BindingContextSlot,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(slot.targetIdentityHandle, slot.sourceAddressHandle),
    checkerTypeReferenceKernelReferences(slot.targetType),
    slot.memberTypes.flatMap((member) => mergeKernelDetailReferences(
      checkerTypeReferenceKernelReferences(member.targetType),
      kernelRecordReferences(member.sourceAddressHandle),
    )),
    kernelFieldProvenanceReferences(slot.fieldProvenance),
    [
      kernelHotDetailReference(TypeSystemHotDetailDescriptors.TypeMember, slot.targetTypeMemberHandle),
      kernelHotDetailReference(TypeSystemHotDetailDescriptors.TypeMember, slot.targetTypeSourceMemberHandle),
    ],
  );
}

function bindingContextReferences(
  context: BindingContext | OverrideContext,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(context.ownerProductHandle),
    checkerTypeReferenceKernelReferences(context.contextType),
    context.slots.flatMap(bindingContextSlotReferences),
    kernelFieldProvenanceReferences(context.fieldProvenance),
  );
}

function bindingScopeDetailReference(
  scope: BindingScope | null,
): KernelDetailReferenceClosure {
  return scope == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        productDetailReferences(ConfigurationDetailDescriptors.BindingScope, scope.productHandle),
        kernelRecordReferences(scope.identityHandle, scope.sourceAddressHandle),
      );
}

function bindingContextDetailReference(
  context: BindingContext,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    productDetailReferences(ConfigurationDetailDescriptors.BindingContext, context.productHandle),
    kernelRecordReferences(context.identityHandle, context.sourceAddressHandle),
  );
}

function overrideContextDetailReference(
  context: OverrideContext,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    productDetailReferences(ConfigurationDetailDescriptors.OverrideContext, context.productHandle),
    kernelRecordReferences(context.identityHandle, context.sourceAddressHandle),
  );
}

function scopeCreatorReferences(
  creator: BindingScopeCreator,
): KernelDetailReferenceClosure {
  const detailSlot = (() => {
    switch (creator.creatorKind) {
      case BindingScopeCreatorKind.RuntimeBindingScopeEffect:
        return TemplateDetailDescriptors.RuntimeBindingScopeEffect;
      case BindingScopeCreatorKind.RuntimeAssignment:
      case BindingScopeCreatorKind.ListenerEvent:
      case BindingScopeCreatorKind.StateBinding:
      case BindingScopeCreatorKind.TemplateControllerCondition:
      case BindingScopeCreatorKind.TemplateControllerBranch:
      case BindingScopeCreatorKind.TemplateControllerValueScope:
        return TemplateDetailDescriptors.Instruction;
    }
  })();
  return mergeKernelDetailReferences(
    productDetailReferences(detailSlot, creator.productHandle),
    kernelRecordReferences(creator.sourceAddressHandle),
  );
}

function bindingScopeReferences(
  scope: BindingScope,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    bindingScopeDetailReference(scope.runtimeParent),
    bindingContextDetailReference(scope.bindingContext),
    overrideContextDetailReference(scope.overrideContext),
    scope.scopeCreators.flatMap(scopeCreatorReferences),
    bindingScopeDetailReference(scope.predecessor),
    kernelFieldProvenanceReferences(scope.fieldProvenance),
  );
}

function controllerReferences(
  controller: ControllerProduct,
): KernelDetailReferenceClosure {
  const common = mergeKernelDetailReferences(
    containerReferenceReferences(controller.container),
    bindingScopeReferenceKernelReferences(controller.scope),
    controllerReferenceReferences(controller.parent),
    kernelRecordReferences(controller.hostAddressHandle),
    kernelFieldProvenanceReferences(controller.fieldProvenance),
  );

  switch (controller.phase) {
    case ControllerPhase.Base:
      return mergeKernelDetailReferences(
        common,
        productDetailReferences(ResourceDetailDescriptors.Definition, controller.definitionProductHandle),
        productDetailReferences(TemplateDetailDescriptors.RuntimeBinding, ...(controller.bindingProductHandles ?? [])),
      );
    case ControllerPhase.Component:
      return mergeKernelDetailReferences(
        common,
        productDetailReferences(ResourceDetailDescriptors.Definition, controller.definitionProductHandle),
        resourceTargetReferenceReferences(controller.viewModel),
        productDetailReferences(TemplateDetailDescriptors.RuntimeBinding, ...(controller.bindingProductHandles ?? [])),
      );
    case ControllerPhase.Hydratable:
      return mergeKernelDetailReferences(
        common,
        productDetailReferences(ResourceDetailDescriptors.Definition, controller.definitionProductHandle),
        controller.children.flatMap(controllerReferenceReferences),
        productDetailReferences(TemplateDetailDescriptors.RuntimeBinding, ...(controller.bindingProductHandles ?? [])),
      );
    case ControllerPhase.SyntheticView:
      return mergeKernelDetailReferences(
        common,
        controller.children.flatMap(controllerReferenceReferences),
        productDetailReferences(TemplateDetailDescriptors.RuntimeBinding, ...(controller.bindingProductHandles ?? [])),
        productDetailReferences(ConfigurationDetailDescriptors.ViewFactory, controller.viewFactoryProductHandle),
        productDetailReferences(TemplateDetailDescriptors.InstructionSequence, controller.instructionSequenceProductHandle),
        kernelRecordReferences(
          controller.locationAddressHandle,
          controller.shadowRootAddressHandle,
          controller.nodeSequenceProductHandle,
        ),
      );
    case ControllerPhase.CustomAttribute:
      return mergeKernelDetailReferences(
        common,
        productDetailReferences(ResourceDetailDescriptors.Definition, controller.definitionProductHandle),
        resourceTargetReferenceReferences(controller.viewModel),
      );
    case ControllerPhase.DryCustomElement:
    case ControllerPhase.ContextualCustomElement:
      return mergeKernelDetailReferences(
        common,
        productDetailReferences(ResourceDetailDescriptors.Definition, controller.definitionProductHandle),
        resourceTargetReferenceReferences(controller.viewModel),
        productDetailReferences(TemplateDetailDescriptors.RuntimeBinding, ...(controller.bindingProductHandles ?? [])),
      );
    case ControllerPhase.CompiledCustomElement:
      return mergeKernelDetailReferences(
        common,
        productDetailReferences(ResourceDetailDescriptors.Definition, controller.definitionProductHandle),
        resourceTargetReferenceReferences(controller.viewModel),
        productDetailReferences(TemplateDetailDescriptors.RuntimeBinding, ...(controller.bindingProductHandles ?? [])),
        kernelRecordReferences(
          controller.locationAddressHandle,
          controller.shadowRootAddressHandle,
          controller.nodeSequenceProductHandle,
        ),
      );
    case ControllerPhase.HydratedCustomElement:
      return mergeKernelDetailReferences(
        common,
        productDetailReferences(ResourceDetailDescriptors.Definition, controller.definitionProductHandle),
        resourceTargetReferenceReferences(controller.viewModel),
        productDetailReferences(TemplateDetailDescriptors.RuntimeBinding, ...(controller.bindingProductHandles ?? [])),
        kernelRecordReferences(controller.lifecycleHooksProductHandle),
      );
  }
}

function viewFactoryReferences(
  viewFactory: ViewFactory,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    containerReferenceReferences(viewFactory.container),
    productDetailReferences(ResourceDetailDescriptors.Definition, viewFactory.definitionProductHandle),
    productDetailReferences(TemplateDetailDescriptors.Instruction, viewFactory.instructionProductHandle),
    productDetailReferences(TemplateDetailDescriptors.InstructionSequence, viewFactory.instructionSequenceProductHandle),
    controllerReferenceReferences(viewFactory.parent),
    kernelFieldProvenanceReferences(viewFactory.fieldProvenance),
  );
}

/** Typed detail slots for configuration products used by later inquiry and compiler-world passes. */
export const ConfigurationProductDetails = {
  Controller: defineProductDetailSlot(
    ConfigurationDetailDescriptors.Controller,
    controllerReferences,
  ),
  ViewFactory: defineProductDetailSlot(
    ConfigurationDetailDescriptors.ViewFactory,
    viewFactoryReferences,
  ),
  BindingContext: defineProductDetailSlot(
    ConfigurationDetailDescriptors.BindingContext,
    bindingContextReferences,
  ),
  OverrideContext: defineProductDetailSlot(
    ConfigurationDetailDescriptors.OverrideContext,
    bindingContextReferences,
  ),
  BindingScope: defineProductDetailSlot(
    ConfigurationDetailDescriptors.BindingScope,
    bindingScopeReferences,
  ),
  Issue: defineProductDetailSlot(
    ConfigurationDetailDescriptors.Issue,
    noKernelDetailReferences,
  ),
} as const;
