import type { ConfigurationRegistrationProduction } from '../registrations/index.js';
import type { AdmittedSubject } from '../admissions/index.js';
import type { CompilerCapability } from '../compiler/index.js';
import type { RegistryObject, RegisterArgument } from './registry-object.js';
import type { BundleExpansion } from './bundle-expansion.js';

export class ConfigurationContribution {
  constructor(
    readonly id: string,
    readonly configuration: RegistryObject,
    readonly directProductions: readonly ConfigurationRegistrationProduction[] = [],
    readonly directRegisterArguments: readonly RegisterArgument[] = [],
    readonly bundleExpansions: readonly BundleExpansion[] = [],
    readonly admittedSubjects: readonly AdmittedSubject[] = [],
    readonly compilerCapabilities: readonly CompilerCapability[] = [],
    readonly openSeams: readonly string[] = [],
  ) {}
}
