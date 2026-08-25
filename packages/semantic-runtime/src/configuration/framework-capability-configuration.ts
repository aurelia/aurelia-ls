import type {
  AddressHandle,
  OpenSeamHandle,
} from '../kernel/handles.js';
import type { KernelMaterializationReadView } from '../kernel/store.js';
import type { RegistrationAdmissionProduct } from '../registration/registration-admission.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import type { ConfigurationKernelEmission } from './configuration-kernel-emitter.js';
import {
  ConfigurationOptionValueKind,
  type ConfigurationOptionContribution,
} from './configuration-option.js';
import { configurationOptionContributionsForAdmission } from './configuration-option-ownership.js';

export const enum FrameworkCapabilityConfigurationState {
  /** No authored override changed the framework default. */
  Default = 'default',
  /** Static evaluation proved the effective configured value. */
  Closed = 'closed',
  /** An authored override exists, but its effective value is not statically closed. */
  Open = 'open',
}

export const enum FrameworkCapabilityConfigurationMembership {
  /** Closed configuration proves that this exact surface is present. */
  Included = 'included',
  /** Closed configuration proves that this exact surface is absent. */
  Excluded = 'excluded',
  /** Authored configuration exists, but this exact surface's membership cannot be closed. */
  Open = 'open',
}

export class ConfiguredBooleanDecision {
  constructor(
    readonly state: FrameworkCapabilityConfigurationState,
    readonly recoveryValue: boolean,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly openSeamHandles: readonly OpenSeamHandle[] = [],
  ) {}

  membership(): FrameworkCapabilityConfigurationMembership {
    if (this.state === FrameworkCapabilityConfigurationState.Open) {
      return FrameworkCapabilityConfigurationMembership.Open;
    }
    return this.recoveryValue
      ? FrameworkCapabilityConfigurationMembership.Included
      : FrameworkCapabilityConfigurationMembership.Excluded;
  }

  exclusionSourceAddressHandle(): AddressHandle | null {
    return this.membership() === FrameworkCapabilityConfigurationMembership.Excluded
      ? this.sourceAddressHandle
      : null;
  }
}

export class I18nTranslationSyntaxConfiguration {
  constructor(
    readonly state: FrameworkCapabilityConfigurationState,
    readonly recoveryAliases: readonly string[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly openSeamHandles: readonly OpenSeamHandle[] = [],
  ) {}

  recoveryCatalogIncludes(rawName: string): boolean {
    return rawName === 't-params.bind'
      || this.recoveryAliases.some((alias) => rawName === alias || rawName === `${alias}.bind`);
  }

  membership(rawName: string): FrameworkCapabilityConfigurationMembership {
    if (rawName === 't-params.bind') {
      return FrameworkCapabilityConfigurationMembership.Included;
    }
    if (this.state === FrameworkCapabilityConfigurationState.Open) {
      return FrameworkCapabilityConfigurationMembership.Open;
    }
    return this.recoveryCatalogIncludes(rawName)
      ? FrameworkCapabilityConfigurationMembership.Included
      : FrameworkCapabilityConfigurationMembership.Excluded;
  }

  exclusionSourceAddressHandle(rawName: string): AddressHandle | null {
    return this.membership(rawName) === FrameworkCapabilityConfigurationMembership.Excluded
      ? this.sourceAddressHandle
      : null;
  }
}

export class ValidationHtmlResourceConfiguration {
  constructor(
    readonly subscriberCustomAttribute: ConfiguredBooleanDecision,
    readonly subscriberCustomElement: ConfiguredBooleanDecision,
  ) {}

  recoveryCatalogIncludes(resourceName: string): boolean {
    switch (resourceName) {
      case 'validation-errors':
        return this.subscriberCustomAttribute.recoveryValue;
      case 'validation-container':
        return this.subscriberCustomElement.recoveryValue;
      default:
        return true;
    }
  }

  membership(resourceName: string): FrameworkCapabilityConfigurationMembership {
    switch (resourceName) {
      case 'validation-errors':
        return this.subscriberCustomAttribute.membership();
      case 'validation-container':
        return this.subscriberCustomElement.membership();
      default:
        return FrameworkCapabilityConfigurationMembership.Included;
    }
  }

  openSeamHandles(resourceName: string): readonly OpenSeamHandle[] {
    switch (resourceName) {
      case 'validation-errors':
        return this.subscriberCustomAttribute.openSeamHandles;
      case 'validation-container':
        return this.subscriberCustomElement.openSeamHandles;
      default:
        return [];
    }
  }

  exclusionSourceAddressHandle(resourceName: string): AddressHandle | null {
    switch (resourceName) {
      case 'validation-errors':
        return this.subscriberCustomAttribute.exclusionSourceAddressHandle();
      case 'validation-container':
        return this.subscriberCustomElement.exclusionSourceAddressHandle();
      default:
        return null;
    }
  }
}

export function i18nTranslationSyntaxConfigurationForAdmission(
  store: KernelMaterializationReadView,
  configuration: ConfigurationKernelEmission,
  admission: RegistrationAdmissionProduct,
): I18nTranslationSyntaxConfiguration {
  let result = new I18nTranslationSyntaxConfiguration(
    FrameworkCapabilityConfigurationState.Default,
    ['t'],
    null,
  );
  for (const contribution of configurationOptionContributionsForAdmission(configuration, admission)) {
    if (!isSingleOption(contribution, FrameworkRegistrationKind.I18nConfiguration, 'translationAttributeAliases')) {
      continue;
    }
    result = contribution.value.valueKind === ConfigurationOptionValueKind.StringArray
      ? new I18nTranslationSyntaxConfiguration(
          FrameworkCapabilityConfigurationState.Closed,
          contribution.value.values,
          contribution.sourceAddressHandle,
        )
      : new I18nTranslationSyntaxConfiguration(
          FrameworkCapabilityConfigurationState.Open,
          ['t'],
          contribution.sourceAddressHandle,
          contributionOpenSeamHandles(store, contribution),
        );
  }
  return result;
}

export function validationHtmlResourceConfigurationForAdmission(
  store: KernelMaterializationReadView,
  configuration: ConfigurationKernelEmission,
  admission: RegistrationAdmissionProduct,
): ValidationHtmlResourceConfiguration {
  let subscriberCustomAttribute = new ConfiguredBooleanDecision(
    FrameworkCapabilityConfigurationState.Default,
    true,
    null,
  );
  let subscriberCustomElement = new ConfiguredBooleanDecision(
    FrameworkCapabilityConfigurationState.Default,
    true,
    null,
  );
  for (const contribution of configurationOptionContributionsForAdmission(configuration, admission)) {
    if (isSingleOption(
      contribution,
      FrameworkRegistrationKind.ValidationHtmlConfiguration,
      'UseSubscriberCustomAttribute',
    )) {
      subscriberCustomAttribute = contribution.value.valueKind === ConfigurationOptionValueKind.Boolean
        ? new ConfiguredBooleanDecision(
            FrameworkCapabilityConfigurationState.Closed,
            contribution.value.value,
            contribution.sourceAddressHandle,
          )
        : new ConfiguredBooleanDecision(
            FrameworkCapabilityConfigurationState.Open,
            true,
            contribution.sourceAddressHandle,
            contributionOpenSeamHandles(store, contribution),
          );
      continue;
    }
    if (!isSingleOption(
      contribution,
      FrameworkRegistrationKind.ValidationHtmlConfiguration,
      'SubscriberCustomElementTemplate',
    )) {
      continue;
    }
    switch (contribution.value.valueKind) {
      case ConfigurationOptionValueKind.String:
        subscriberCustomElement = new ConfiguredBooleanDecision(
          FrameworkCapabilityConfigurationState.Closed,
          contribution.value.value.length > 0,
          contribution.sourceAddressHandle,
        );
        break;
      case ConfigurationOptionValueKind.Null:
      case ConfigurationOptionValueKind.Undefined:
        subscriberCustomElement = new ConfiguredBooleanDecision(
          FrameworkCapabilityConfigurationState.Closed,
          false,
          contribution.sourceAddressHandle,
        );
        break;
      default:
        subscriberCustomElement = new ConfiguredBooleanDecision(
          FrameworkCapabilityConfigurationState.Open,
          true,
          contribution.sourceAddressHandle,
          contributionOpenSeamHandles(store, contribution),
        );
        break;
    }
  }
  return new ValidationHtmlResourceConfiguration(
    subscriberCustomAttribute,
    subscriberCustomElement,
  );
}

function contributionOpenSeamHandles(
  store: KernelMaterializationReadView,
  contribution: ConfigurationOptionContribution,
): readonly OpenSeamHandle[] {
  return [...new Set(
    store.readMaterializationsByOwner(contribution.identityHandle)
      .flatMap((materialization) => materialization.openSeamHandles),
  )];
}

function isSingleOption(
  contribution: ConfigurationOptionContribution,
  configurationKind: FrameworkRegistrationKind,
  optionName: string,
): boolean {
  return contribution.configurationKind === configurationKind
    && contribution.optionPath.length === 1
    && contribution.optionPath[0] === optionName;
}
