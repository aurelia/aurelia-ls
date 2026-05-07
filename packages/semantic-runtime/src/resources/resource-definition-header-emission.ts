import type {
  AddressHandle,
  ClaimHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import type { ResourceDefinitionHeader } from './resource-definition.js';
import type { ResourceTargetReference } from './resource-reference.js';

/** Typed handle surface for a resource definition header that was admitted into the kernel. */
export class ResourceDefinitionHeaderEmission {
  constructor(
    /** Emission-local key shared by header, target, convergence, and materialization records. */
    readonly localKey: string,
    /** Index of the source observation that produced this header. */
    readonly observationIndex: number,
    /** Product handle for the materialized resource-definition header. */
    readonly productHandle: ProductHandle,
    /** Primary resource identity, when recognition produced one unambiguous identity. */
    readonly primaryIdentityHandle: IdentityHandle | null,
    /** Target reference for the resource implementation, when statically visible. */
    readonly targetReference: ResourceTargetReference | null,
    /** Recognized Aurelia resource kind for this header. */
    readonly resourceKind: ResourceDefinitionHeader['type'],
    /** Runtime lookup names or pattern strings observed for this header. */
    readonly lookupNames: readonly string[],
    /** Source address for the header carrier. */
    readonly sourceAddressHandle: AddressHandle,
    /** Provenance handle for the header recognition observation. */
    readonly provenanceHandle: ProvenanceHandle,
    /** Claims emitted for resource identities and aliases. */
    readonly claimHandles: readonly ClaimHandle[],
  ) {}
}
