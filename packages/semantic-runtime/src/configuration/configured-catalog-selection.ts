import {
  frameworkRegistrationKindForOperation,
  type ContainerRegistrationOperation,
} from '../di/container-registration.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { FrameworkRegistrationKind } from '../registration/registration-reference.js';

interface ConfiguredCatalogSelection {
  readonly registrationAdmissionProductHandle: ProductHandle;
  readonly frameworkKind: FrameworkRegistrationKind;
  readonly catalogProductHandles: readonly ProductHandle[];
}

/** Catalogs selected by the framework effects actually spent at these registration occurrences. */
export function catalogProductHandlesForOperations(
  operations: readonly ContainerRegistrationOperation[],
  selections: readonly ConfiguredCatalogSelection[],
): ReadonlySet<ProductHandle> {
  const catalogProductHandles = new Set<ProductHandle>();
  for (const operation of operations) {
    const frameworkKind = frameworkRegistrationKindForOperation(operation);
    if (frameworkKind == null) continue;
    for (const selection of selections) {
      if (
        selection.registrationAdmissionProductHandle !== operation.admission.productHandle
        || selection.frameworkKind !== frameworkKind
      ) continue;
      for (const catalogProductHandle of selection.catalogProductHandles) {
        catalogProductHandles.add(catalogProductHandle);
      }
    }
  }
  return catalogProductHandles;
}
