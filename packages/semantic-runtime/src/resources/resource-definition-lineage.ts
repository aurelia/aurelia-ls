import type { ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { BuiltInResource } from './built-in-resources.js';
import { ResourceProductDetails, type ResourceDefinitionHeaderDetail } from './product-details.js';
import { ResourceDefinitionHeaderEmission } from './resource-definition-header-emission.js';

/** Recover the source header that converged into a full resource definition. */
export function readResourceDefinitionHeaderDetail(
  store: KernelStore,
  productHandle: ProductHandle,
): ResourceDefinitionHeaderDetail | null {
  const direct = store.productDetails.read(ResourceProductDetails.DefinitionHeader, productHandle);
  if (direct != null) {
    return direct;
  }
  for (const claimHandle of store.readClaimsForObject(productHandle)) {
    const claim = store.readClaim(claimHandle);
    if (claim?.predicateKey !== KernelVocabulary.Resource.ConvergesToDefinition.key) {
      continue;
    }
    const headerProduct = store.readProduct(claim.subjectHandle as ProductHandle);
    if (headerProduct == null) {
      continue;
    }
    const header = store.productDetails.read(ResourceProductDetails.DefinitionHeader, headerProduct.handle);
    if (header != null) {
      return header;
    }
  }
  return null;
}

/** Return framework catalog identity only when the selected definition actually converged from a built-in header. */
export function readBuiltInResourceForDefinition(
  store: KernelStore,
  productHandle: ProductHandle,
): BuiltInResource | null {
  const header = readResourceDefinitionHeaderDetail(store, productHandle);
  return header == null || header instanceof ResourceDefinitionHeaderEmission
    ? null
    : header;
}
