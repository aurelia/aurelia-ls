import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';

export const enum ResourceIssuePhase {
  BindableDecorator = 'bindable-decorator',
  CustomElementDefinition = 'custom-element-definition',
  ResourceDefinitionApi = 'resource-definition-api',
  ProcessContentDecorator = 'process-content-decorator',
  ChildrenDecorator = 'children-decorator',
  SlottedDecorator = 'slotted-decorator',
  ResourceRegistration = 'resource-registration',
  WatchDecorator = 'watch-decorator',
  WatchMetadata = 'watch-metadata',
}

export const enum ResourceIssueKind {
  InvalidBindableDecoratorUsageSymbol = 'invalid-bindable-decorator-usage-symbol',
  InvalidBindableDecoratorUsageClassWithoutConfiguration = 'invalid-bindable-decorator-usage-class-without-configuration',
  InvalidBindableDecoratorUsageClassWithoutPropertyNameConfiguration = 'invalid-bindable-decorator-usage-class-without-property-name-configuration',
  InvalidProcessContentHook = 'invalid-process-content-hook',
  WatchNullConfig = 'watch-null-config',
  WatchInvalidChangeHandler = 'watch-invalid-change-handler',
  WatchNonMethodDecoratorUsage = 'watch-non-method-decorator-usage',
  ChildrenInvalidQuery = 'children-invalid-query',
  SlottedDecoratorInvalidUsage = 'slotted-decorator-invalid-usage',
  ControllerNoShadowOnContainerless = 'controller-no-shadow-on-containerless',
  ControllerWatchInvalidCallback = 'controller-watch-invalid-callback',
  CustomElementDefinitionOnlyName = 'custom-element-definition-only-name',
  CustomElementDefinitionNotFound = 'custom-element-definition-not-found',
  CustomAttributeDefinitionNotFound = 'custom-attribute-definition-not-found',
  ValueConverterDefinitionNotFound = 'value-converter-definition-not-found',
  BindingBehaviorDefinitionNotFound = 'binding-behavior-definition-not-found',
  CustomElementAlreadyRegistered = 'custom-element-already-registered',
  CustomAttributeAlreadyRegistered = 'custom-attribute-already-registered',
  ValueConverterAlreadyRegistered = 'value-converter-already-registered',
  BindingBehaviorAlreadyRegistered = 'binding-behavior-already-registered',
}

export type ResourceIssueSeverity =
  | 'information'
  | 'warning'
  | 'error';

export type ResourceIssueField =
  | 'phase'
  | 'issueKind'
  | 'message'
  | 'severity'
  | 'frameworkErrorCode'
  | 'source';

/** Source-backed resource metadata failure corresponding to an Aurelia runtime-html boundary. */
export class ResourceIssue {
  constructor(
    /** Product handle for the materialized issue product. */
    readonly productHandle: ProductHandle,
    /** Identity for this resource issue product. */
    readonly identityHandle: IdentityHandle,
    /** Project that owns the resource metadata source. */
    readonly projectKey: string,
    /** Resource definition identity that owns this issue, when available. */
    readonly ownerDefinitionIdentityHandle: IdentityHandle | null,
    /** Resource metadata phase that detected the issue. */
    readonly phase: ResourceIssuePhase,
    /** Stable semantic issue kind used by diagnostics and repair planning. */
    readonly issueKind: ResourceIssueKind,
    /** Human-readable message from the modeled framework boundary. */
    readonly message: string,
    /** Exact Aurelia framework error code when this issue models a framework ErrorNames throw. */
    readonly frameworkErrorCode: string | null,
    /** Source address for the authored metadata that triggered the issue. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<ResourceIssueField>[] = [],
    /** Diagnostic severity implied by the modeled framework path. */
    readonly severity: ResourceIssueSeverity = 'error',
  ) {}
}
