import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { ProductKindKey } from '../kernel/vocabulary.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { ConfigurationFrameworkErrorCode } from './framework-error-code.js';

export const enum ConfigurationIssuePhase {
  ScopeApi = 'scope-api',
  FrameworkServiceCustomization = 'framework-service-customization',
}

export const enum ConfigurationIssueKind {
  NullScope = 'null-scope',
  CreateScopeWithNullContext = 'create-scope-with-null-context',
  NodeObserverMappingExisted = 'node-observer-mapping-existed',
  AttrMapperDuplicateMapping = 'attr-mapper-duplicate-mapping',
}

/** Source-backed configuration issue that models a known framework failure path. */
export class ConfigurationIssue {
  readonly productKindKey: ProductKindKey = KernelVocabulary.Configuration.Issue.key;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly projectKey: string,
    readonly phase: ConfigurationIssuePhase,
    readonly issueKind: ConfigurationIssueKind,
    readonly message: string,
    readonly sourceAddressHandle: AddressHandle | null,
    /** Exact Aurelia framework error code when this issue models a framework ErrorNames throw. */
    readonly frameworkErrorCode: ConfigurationFrameworkErrorCode | null,
  ) {}
}
