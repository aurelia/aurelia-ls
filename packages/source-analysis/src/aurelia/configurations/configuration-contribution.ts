import type { ConfigurationRegistrationProduction } from '../registrations/index.js';
import type { RegistrableSubject } from '../registrables/index.js';
import type { RegistryObject, RegisterArgument } from './registry-object.js';
import type { BundleExpansion } from './bundle-expansion.js';

export class ConfigurationContribution {
  constructor(
    readonly id: string,
    readonly configuration: RegistryObject,
    readonly directProductions: readonly ConfigurationRegistrationProduction[] = [],
    readonly directRegisterArguments: readonly RegisterArgument[] = [],
    readonly bundleExpansions: readonly BundleExpansion[] = [],
    readonly admittedSubjects: readonly RegistrableSubject[] = [],
    readonly openSeams: readonly string[] = [],
  ) {}
}
