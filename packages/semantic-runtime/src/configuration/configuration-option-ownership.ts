import { evaluationValuesShareLineage } from '../evaluation/value-relation.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  FrameworkRegistrationAdmission,
  RegistryRegistrationAdmission,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import type { ConfigurationKernelEmission } from './configuration-kernel-emitter.js';
import type { ConfigurationOptionContribution } from './configuration-option.js';

/**
 * Read the source value whose runtime configuration instance is admitted.
 *
 * The registration carrier can be a later identifier or recursive container; the value reference retains the
 * initializer that option contributions actually mutate.
 */
export function configurationValueSourceAddressHandleForAdmission(
  admission: RegistrationAdmissionProduct,
): AddressHandle | null {
  if (admission instanceof FrameworkRegistrationAdmission) {
    return admission.registeredValue?.addressHandle ?? null;
  }
  if (admission instanceof RegistryRegistrationAdmission) {
    return admission.registryValue?.addressHandle ?? null;
  }
  return null;
}

/** Join option contributions to the exact configuration value admitted through this registration. */
export function configurationOptionContributionsForAdmission(
  configuration: ConfigurationKernelEmission,
  admission: RegistrationAdmissionProduct,
): readonly ConfigurationOptionContribution[] {
  const admittedCarrier = configuration.evaluationBindings.registrationCarrierForAdmission(
    admission.productHandle,
  );
  const configurationValueSource = configuration.evaluationBindings.runtimeValueSourceNodeForProduct(
    admission.productHandle,
  );
  return configuration.optionContributions.filter((contribution) => {
    const contributionValue = configuration.evaluationBindings
      .configurationValueForOptionContribution(contribution.productHandle);
    if (admittedCarrier != null && contributionValue != null) {
      return evaluationValuesShareLineage(admittedCarrier.value, contributionValue);
    }
    // Registry-method inventories intentionally have no project-execution value until DI invokes the registry.
    // Source-node identity retains that declaration ownership without reconstructing it from compressed spans.
    const contributionSource = configuration.evaluationBindings.runtimeValueSourceNodeForProduct(
      contribution.productHandle,
    );
    return configurationValueSource != null && contributionSource === configurationValueSource;
  });
}
