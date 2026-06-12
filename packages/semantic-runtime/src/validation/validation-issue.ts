import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { ValidationFrameworkErrorCode } from './framework-error-code.js';

export const enum ValidationIssuePhase {
  FluentRuleConstruction = 'fluent-rule-construction',
  AccessorParsing = 'accessor-parsing',
  ModelRuleHydration = 'model-rule-hydration',
  GroupRuleExecution = 'group-rule-execution',
}

export const enum ValidationIssueKind {
  RuleProviderNoRuleFound = 'rule-provider-no-rule-found',
  UnableToParseAccessorFunction = 'unable-to-parse-accessor-function',
  HydrateRuleUnsupported = 'hydrate-rule-unsupported',
  HydrateRuleInvalidName = 'hydrate-rule-invalid-name',
  GroupRuleInvalidExecutionResult = 'group-rule-invalid-execution-result',
}

export type ValidationIssueSeverity =
  | 'error';

/** Source-backed @aurelia/validation issue where framework rule construction or hydration would throw. */
export class ValidationIssue {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly projectKey: string,
    readonly ownerIdentityHandle: IdentityHandle | null,
    readonly phase: ValidationIssuePhase,
    readonly issueKind: ValidationIssueKind,
    readonly message: string,
    readonly frameworkErrorCode: ValidationFrameworkErrorCode,
    readonly localName: string | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly severity: ValidationIssueSeverity = 'error',
  ) {}
}
