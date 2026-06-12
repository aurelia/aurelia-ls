import type {
  AddressHandle,
  ClaimHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  productDetailHandle,
  productDetailOptionalIdentityHandle,
  productDetailProvenanceHandle,
  productDetailRequiredAddressHandle,
} from '../kernel/product-details.js';
import type { ResourceDefinitionHeader } from './resource-definition.js';
import type { ResourceTargetReference } from './resource-reference.js';

const ResourceDefinitionHeaderDetailKind = 'resource.definition-header';

/** Typed handle surface for a resource definition header that was admitted into the kernel. */
export class ResourceDefinitionHeaderEmission {
  constructor(
    /** Emission-local key shared by header, target, convergence, and materialization records. */
    readonly localKey: string,
    /** Index of the source observation that produced this header. */
    readonly observationIndex: number,
    /** Target reference for the resource implementation, when statically visible. */
    readonly targetReference: ResourceTargetReference | null,
    /** Recognized Aurelia resource kind for this header. */
    readonly resourceKind: ResourceDefinitionHeader['type'],
    /** Runtime lookup names or pattern strings observed for this header. */
    readonly lookupNames: readonly string[],
    /** Claims emitted for resource identities and aliases. */
    readonly claimHandles: readonly ClaimHandle[],
  ) {}

  /** Product handle for the materialized resource-definition header. */
  get productHandle(): ProductHandle {
    return productDetailHandle(this, ResourceDefinitionHeaderDetailKind);
  }

  /** Primary resource identity, when recognition produced one unambiguous identity. */
  get primaryIdentityHandle(): IdentityHandle | null {
    return productDetailOptionalIdentityHandle(this, ResourceDefinitionHeaderDetailKind);
  }

  /** Source address for the header carrier. */
  get sourceAddressHandle(): AddressHandle {
    return productDetailRequiredAddressHandle(this, ResourceDefinitionHeaderDetailKind);
  }

  /** Provenance handle for the header recognition observation. */
  get provenanceHandle(): ProvenanceHandle {
    return productDetailProvenanceHandle(this, ResourceDefinitionHeaderDetailKind);
  }
}
