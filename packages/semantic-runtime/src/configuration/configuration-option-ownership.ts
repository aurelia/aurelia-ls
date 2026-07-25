import { sourceSpansEqual } from '../kernel/address.js';
import { evaluationValuesShareLineage } from '../evaluation/value-relation.js';
import type { AddressHandle } from '../kernel/handles.js';
import { sourceSpanAddressForAddress } from '../kernel/source-address.js';
import type { KernelStoreReadView } from '../kernel/store.js';
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
  store: KernelStoreReadView,
  configuration: ConfigurationKernelEmission,
  admission: RegistrationAdmissionProduct,
): readonly ConfigurationOptionContribution[] {
  const admittedValue = configuration.evaluationBindings.registrationValueForAdmission(
    admission.productHandle,
  );
  const configurationValueSource = sourceSpanAddressForAddress(
    store,
    configurationValueSourceAddressHandleForAdmission(admission),
  );
  return configuration.optionContributions.filter((contribution) => {
    const contributionValue = configuration.evaluationBindings
      .configurationValueForOptionContribution(contribution.productHandle);
    if (admittedValue != null && contributionValue != null) {
      return evaluationValuesShareLineage(admittedValue, contributionValue);
    }
    const contributionSource = sourceSpanAddressForAddress(
      store,
      contribution.configurationValueSourceAddressHandle,
    );
    return (
      configurationValueSource != null
      && contributionSource != null
      && sourceSpansEqual(configurationValueSource, contributionSource)
    );
  });
}
