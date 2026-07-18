import { SemanticClaim } from '../kernel/claim.js';
import type { ProductHandle } from '../kernel/handles.js';
import { MaterializedProduct } from '../kernel/materialization.js';
import type { ProductDetailReadView } from '../kernel/product-details.js';
import type { KernelMaterializationReadView, KernelStoreReadView } from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { BuiltInResource } from './built-in-resources.js';
import { ResourceProductDetails, type ResourceDefinitionHeaderDetail } from './product-details.js';
import { ResourceDefinitionHeaderEmission } from './resource-definition-header-emission.js';

/** Recover the source header that converged into a full resource definition. */
export function readResourceDefinitionHeaderDetail(
  store: KernelStoreReadView & KernelMaterializationReadView & ProductDetailReadView,
  productHandle: ProductHandle,
): ResourceDefinitionHeaderDetail | null {
  const direct = store.readProductDetail(ResourceProductDetails.DefinitionHeader, productHandle);
  if (direct != null) {
    return direct;
  }

  for (const materialization of store.readMaterializations()) {
    if (!materialization.productHandles.includes(productHandle)) {
      continue;
    }
    for (const claimHandle of materialization.claimHandles) {
      const claim = store.read(claimHandle);
      if (
        !(claim instanceof SemanticClaim)
        || claim.objectHandle !== productHandle
        || claim.predicateKey !== KernelVocabulary.Resource.ConvergesToDefinition.key
      ) {
        continue;
      }
      const headerProduct = store.read(claim.subjectHandle);
      if (!(headerProduct instanceof MaterializedProduct)) {
        continue;
      }
      const header = store.readProductDetail(ResourceProductDetails.DefinitionHeader, headerProduct.handle);
      if (header != null) {
        return header;
      }
    }
  }
  return null;
}

/** Return framework catalog identity only when the selected definition actually converged from a built-in header. */
export function readBuiltInResourceForDefinition(
  store: KernelStoreReadView & KernelMaterializationReadView & ProductDetailReadView,
  productHandle: ProductHandle,
): BuiltInResource | null {
  const header = readResourceDefinitionHeaderDetail(store, productHandle);
  return header == null || header instanceof ResourceDefinitionHeaderEmission
    ? null
    : header;
}
