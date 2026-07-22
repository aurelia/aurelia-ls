import type { ProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import { defineProductDetailSlot } from '../kernel/product-details.js';
import {
  kernelFieldProvenanceReferences,
  kernelProductDetailReference,
  kernelRecordReferences,
  mergeKernelDetailReferences,
  type KernelDetailReferenceClosure,
} from '../kernel/detail-references.js';
import type { ProductHandle } from '../kernel/handles.js';
import { ResourceDetailDescriptors } from '../resources/detail-descriptors.js';
import { RouterDetailDescriptors } from './detail-descriptors.js';
import type {
  EndpointModel,
  RouteableComponentReference,
  RouteConfigContributionReference,
  RouteContextParameterReadModel,
  RouteConfigContributionModel,
  RouteConfigModel,
  RouteConfigReference,
  RouteRecognizerReference,
} from './model.js';
import { RouteRecognizerModelKind } from './model.js';

function productDetailReferences(
  descriptor: ProductDetailDescriptor<unknown>,
  ...handles: readonly (ProductHandle | null | undefined)[]
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(...handles),
    handles.map((handle) => kernelProductDetailReference(descriptor, handle)),
  );
}

function routeableComponentReferences(
  component: RouteableComponentReference | null,
): KernelDetailReferenceClosure {
  return component == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        kernelRecordReferences(
          component.productHandle,
          component.identityHandle,
          component.sourceAddressHandle,
          component.resolvedIdentityHandle,
        ),
        productDetailReferences(ResourceDetailDescriptors.Definition, component.resolvedProductHandle),
      );
}

function routeConfigReferenceReferences(
  route: RouteConfigReference,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    productDetailReferences(RouterDetailDescriptors.RouteConfig, route.productHandle),
    kernelRecordReferences(route.identityHandle, route.sourceAddressHandle),
  );
}

function contributionReferenceReferences(
  contribution: RouteConfigContributionReference,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    productDetailReferences(RouterDetailDescriptors.RouteConfigContribution, contribution.productHandle),
    kernelRecordReferences(contribution.identityHandle, contribution.sourceAddressHandle),
  );
}

function routeRecognizerReferenceReferences(
  reference: RouteRecognizerReference | null,
): KernelDetailReferenceClosure {
  return reference == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        reference.recognizerKind === RouteRecognizerModelKind.Endpoint
          ? productDetailReferences(RouterDetailDescriptors.Endpoint, reference.productHandle)
          : kernelRecordReferences(reference.productHandle),
        kernelRecordReferences(reference.identityHandle, reference.sourceAddressHandle),
      );
}

function routeConfigContributionReferences(
  contribution: RouteConfigContributionModel,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    routeableComponentReferences(contribution.component),
    contribution.childRoutes.flatMap(contributionReferenceReferences),
    routeableComponentReferences(contribution.fallback),
    kernelRecordReferences(
      ...contribution.pathSourceAddressHandles,
      contribution.redirectToSourceAddressHandle,
    ),
    kernelFieldProvenanceReferences(contribution.fieldProvenance),
  );
}

function routeConfigReferences(
  route: RouteConfigModel,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    routeableComponentReferences(route.component),
    route.childRoutes.flatMap(routeConfigReferenceReferences),
    routeableComponentReferences(route.fallback),
    route.sourceContribution == null
      ? []
      : contributionReferenceReferences(route.sourceContribution),
    kernelRecordReferences(
      ...route.pathSourceAddressHandles,
      route.redirectToSourceAddressHandle,
    ),
    kernelFieldProvenanceReferences(route.fieldProvenance),
  );
}

function endpointReferences(
  endpoint: EndpointModel,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    routeRecognizerReferenceReferences(endpoint.recognizer),
    routeRecognizerReferenceReferences(endpoint.configurableRoute),
    routeRecognizerReferenceReferences(endpoint.primaryEndpoint),
    routeRecognizerReferenceReferences(endpoint.residualEndpoint),
    kernelFieldProvenanceReferences(endpoint.fieldProvenance),
  );
}

function routeContextParameterReadReferences(
  read: RouteContextParameterReadModel,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    routeableComponentReferences(read.component),
    read.routeConfigs.flatMap(routeConfigReferenceReferences),
    kernelFieldProvenanceReferences(read.fieldProvenance),
  );
}

/** Typed detail slots for router products consumed by inquiry and API layers. */
export const RouterProductDetails = {
  RouteConfigContribution: defineProductDetailSlot(
    RouterDetailDescriptors.RouteConfigContribution,
    routeConfigContributionReferences,
  ),
  RouteConfig: defineProductDetailSlot(
    RouterDetailDescriptors.RouteConfig,
    routeConfigReferences,
  ),
  Endpoint: defineProductDetailSlot(
    RouterDetailDescriptors.Endpoint,
    endpointReferences,
  ),
  RouteContextParameterRead: defineProductDetailSlot(
    RouterDetailDescriptors.RouteContextParameterRead,
    routeContextParameterReadReferences,
  ),
} as const;
