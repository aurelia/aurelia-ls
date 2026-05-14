import { frameworkErrorCode } from '../kernel/framework-error-code.js';

/**
 * Aurelia validation error-code labels that validation source analysis can cite
 * when it models the same framework rule-construction or hydration branch.
 */
export const ValidationFrameworkErrorCode = {
  /** `validation ErrorNames.rule_provider_no_rule_found`; a PropertyRule modifier ran before any rule was added. */
  RuleProviderNoRuleFound: frameworkErrorCode('validation', 'ErrorNames', 'rule_provider_no_rule_found', 'AUR4101'),
  /** `validation ErrorNames.unable_to_parse_accessor_fn`; validation property accessor parsing rejected the function. */
  UnableToParseAccessorFunction: frameworkErrorCode('validation', 'ErrorNames', 'unable_to_parse_accessor_fn', 'AUR4102'),
  /** `validation ErrorNames.hydrate_rule_unsupported`; the default model-rule hydrator met an unknown rule key. */
  HydrateRuleUnsupported: frameworkErrorCode('validation', 'ErrorNames', 'hydrate_rule_unsupported', 'AUR4105'),
  /** `validation ErrorNames.hydrate_rule_invalid_name`; the default model-rule hydrator met an empty property path. */
  HydrateRuleInvalidName: frameworkErrorCode('validation', 'ErrorNames', 'hydrate_rule_invalid_name', 'AUR4106'),
  /** `validation ErrorNames.group_rule_invalid_execution_result`; a closed group-rule result targets no group property. */
  GroupRuleInvalidExecutionResult: frameworkErrorCode('validation', 'ErrorNames', 'group_rule_invalid_execution_result', 'AUR4108'),
} as const;

export type ValidationFrameworkErrorCode =
  typeof ValidationFrameworkErrorCode[keyof typeof ValidationFrameworkErrorCode];
