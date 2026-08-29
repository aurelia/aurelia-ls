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

/** Effective coercion options installed by one StandardConfiguration registration occurrence. */
export class StandardConfigurationCoercionConfiguration {
  constructor(
    readonly enableCoercion: ConfiguredBooleanDecision,
    readonly coerceNullish: ConfiguredBooleanDecision,
  ) {}
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

/**
 * Converge StandardConfiguration's two defaulted coercion options for one exact admitted registry value.
 *
 * Direct assignments close independently. A callback with additional control flow keeps both fields open because the
 * unmodeled part of that same callback may overwrite either field after the assignments that were recovered.
 */
export function standardConfigurationCoercionConfigurationForAdmission(
  store: KernelMaterializationReadView,
  configuration: ConfigurationKernelEmission,
  admission: RegistrationAdmissionProduct,
): StandardConfigurationCoercionConfiguration {
  let enableCoercion = defaultCoercionDecision();
  let coerceNullish = defaultCoercionDecision();
  let callbackPressure: {
    readonly sourceAddressHandle: AddressHandle | null;
    readonly openSeamHandles: readonly OpenSeamHandle[];
  } | null = null;

  for (const contribution of configurationOptionContributionsForAdmission(configuration, admission)) {
    if (contribution.configurationKind !== FrameworkRegistrationKind.StandardConfiguration) {
      continue;
    }
    if (isOptionPath(contribution, 'customize')) {
      const openSeamHandles = contributionAndStepOpenSeamHandles(store, configuration, contribution);
      if (openSeamHandles.length > 0) {
        callbackPressure = {
          sourceAddressHandle: contribution.sourceAddressHandle,
          openSeamHandles,
        };
      }
      continue;
    }
    if (isOptionPath(contribution, 'coercingOptions')) {
      const openSeamHandles = contributionAndStepOpenSeamHandles(store, configuration, contribution);
      enableCoercion = openCoercionDecision(enableCoercion, contribution.sourceAddressHandle, openSeamHandles);
      coerceNullish = openCoercionDecision(coerceNullish, contribution.sourceAddressHandle, openSeamHandles);
      continue;
    }
    if (isOptionPath(contribution, 'coercingOptions', 'enableCoercion')) {
      enableCoercion = coercionDecisionForContribution(store, configuration, contribution, enableCoercion.recoveryValue);
      continue;
    }
    if (isOptionPath(contribution, 'coercingOptions', 'coerceNullish')) {
      coerceNullish = coercionDecisionForContribution(store, configuration, contribution, coerceNullish.recoveryValue);
    }
  }

  if (callbackPressure != null) {
    enableCoercion = openCoercionDecision(
      enableCoercion,
      callbackPressure.sourceAddressHandle,
      callbackPressure.openSeamHandles,
    );
    coerceNullish = openCoercionDecision(
      coerceNullish,
      callbackPressure.sourceAddressHandle,
      callbackPressure.openSeamHandles,
    );
  }
  return new StandardConfigurationCoercionConfiguration(enableCoercion, coerceNullish);
}

function defaultCoercionDecision(): ConfiguredBooleanDecision {
  return new ConfiguredBooleanDecision(
    FrameworkCapabilityConfigurationState.Default,
    false,
    null,
  );
}

function coercionDecisionForContribution(
  store: KernelMaterializationReadView,
  configuration: ConfigurationKernelEmission,
  contribution: ConfigurationOptionContribution,
  recoveryValue: boolean,
): ConfiguredBooleanDecision {
  return contribution.value.valueKind === ConfigurationOptionValueKind.Boolean
    ? new ConfiguredBooleanDecision(
        FrameworkCapabilityConfigurationState.Closed,
        contribution.value.value,
        contribution.sourceAddressHandle,
      )
    : new ConfiguredBooleanDecision(
        FrameworkCapabilityConfigurationState.Open,
        recoveryValue,
        contribution.sourceAddressHandle,
        contributionAndStepOpenSeamHandles(store, configuration, contribution),
      );
}

function openCoercionDecision(
  decision: ConfiguredBooleanDecision,
  sourceAddressHandle: AddressHandle | null,
  openSeamHandles: readonly OpenSeamHandle[],
): ConfiguredBooleanDecision {
  return new ConfiguredBooleanDecision(
    FrameworkCapabilityConfigurationState.Open,
    decision.recoveryValue,
    sourceAddressHandle,
    openSeamHandles,
  );
}

function isOptionPath(
  contribution: ConfigurationOptionContribution,
  ...path: readonly string[]
): boolean {
  return contribution.optionPath.length === path.length
    && contribution.optionPath.every((part, index) => part === path[index]);
}

function contributionAndStepOpenSeamHandles(
  store: KernelMaterializationReadView,
  configuration: ConfigurationKernelEmission,
  contribution: ConfigurationOptionContribution,
): readonly OpenSeamHandle[] {
  const step = configuration.steps.find((candidate) =>
    candidate.producedProductHandles.includes(contribution.productHandle)
  ) ?? null;
  return [...new Set([
    ...contributionOpenSeamHandles(store, contribution),
    ...(step == null
      ? []
      : store.readMaterializationsByOwner(step.identityHandle)
        .flatMap((materialization) => materialization.openSeamHandles)),
  ])];
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
