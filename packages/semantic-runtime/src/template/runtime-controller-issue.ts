import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { ConfigurationIdentity } from '../kernel/identity.js';
import { MaterializedProduct } from '../kernel/materialization.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type ProductKindKey,
} from '../kernel/vocabulary.js';
import type { RuntimeHtmlControllerFrameworkErrorCode } from './framework-error-code.js';

export const enum RuntimeControllerIssuePhase {
  RendererResourceLookup = 'renderer-resource-lookup',
  ObserverSetup = 'observer-setup',
  TemplateControllerConstruction = 'template-controller-construction',
  TemplateControllerLink = 'template-controller-link',
  TemplateControllerActivation = 'template-controller-activation',
  ControllerActivation = 'controller-activation',
  BindableSet = 'bindable-set',
  CompositionComponentLookup = 'composition-component-lookup',
}

export const enum RuntimeControllerIssueKind {
  ElementResourceNotFound = 'element-resource-not-found',
  AttributeResourceNotFound = 'attribute-resource-not-found',
  AttributeTemplateControllerResourceNotFound = 'attribute-template-controller-resource-not-found',
  ViewFactoryProviderNotReady = 'view-factory-provider-not-ready',
  ControllerPropertyNotCoercible = 'controller-property-not-coercible',
  ControllerPropertyNoChangeHandler = 'controller-property-no-change-handler',
  RepeatInvalidKeyBindingCommand = 'repeat-invalid-key-binding-command',
  RepeatExtraneousBinding = 'repeat-extraneous-binding',
  RepeatInvalidContextualBindingCommand = 'repeat-invalid-contextual-binding-command',
  AuComposeInvalidScopeBehavior = 'au-compose-invalid-scope-behavior',
  AuComposeInvalidFlushMode = 'au-compose-invalid-flush-mode',
  AuComposeComponentNameNotFound = 'au-compose-component-name-not-found',
  ElseWithoutIf = 'else-without-if',
  SwitchInvalidUsage = 'switch-invalid-usage',
  SwitchNoMultipleDefault = 'switch-no-multiple-default',
  PortalInvalidInsertPosition = 'portal-invalid-insert-position',
  PortalQueryEmpty = 'portal-query-empty',
  PortalNoTarget = 'portal-no-target',
  PromiseInvalidUsage = 'promise-invalid-usage',
}

export type RuntimeControllerIssueField =
  | 'phase'
  | 'issueKind'
  | 'message'
  | 'frameworkErrorCode'
  | 'source';

/** Framework-runtime issue discovered while emulating controller construction or hydration. */
export class RuntimeControllerIssue {
  readonly productKindKey: ProductKindKey = KernelVocabulary.Configuration.ControllerIssue.key;

  constructor(
    /** Product handle for the materialized controller issue. */
    readonly productHandle: ProductHandle,
    /** Identity for this controller issue product. */
    readonly identityHandle: IdentityHandle,
    /** Runtime controller that owns the failed framework path. */
    readonly controllerProductHandle: ProductHandle,
    /** Runtime controller identity that owns the failed framework path. */
    readonly controllerIdentityHandle: IdentityHandle,
    /** Lowered instruction whose hydration/constructor path produced the issue. */
    readonly instructionProductHandle: ProductHandle | null,
    /** Controller phase that detected the issue. */
    readonly phase: RuntimeControllerIssuePhase,
    /** Stable semantic issue kind used by diagnostics and repair planning. */
    readonly issueKind: RuntimeControllerIssueKind,
    /** Human-readable message from the modeled framework boundary. */
    readonly message: string,
    /** Exact Aurelia framework error code when this issue models an ErrorNames throw. */
    readonly frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode | null,
    /** Source address for the authored template option that triggered the issue. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<RuntimeControllerIssueField>[] = [],
  ) {}
}

export class RuntimeControllerIssuePublication {
  constructor(
    readonly issue: RuntimeControllerIssue,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Publishes controller-owned framework runtime issue products. */
export class RuntimeControllerIssuePublisher {
  constructor(
    readonly store: KernelStore,
  ) {}

  publish(
    local: string,
    controllerProductHandle: ProductHandle,
    controllerIdentityHandle: IdentityHandle,
    instructionProductHandle: ProductHandle | null,
    provenanceHandle: ProvenanceHandle,
    phase: RuntimeControllerIssuePhase,
    issueKind: RuntimeControllerIssueKind,
    message: string,
    frameworkErrorCode: RuntimeHtmlControllerFrameworkErrorCode | null,
    sourceAddressHandle: AddressHandle | null,
  ): RuntimeControllerIssuePublication {
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const issue = new RuntimeControllerIssue(
      productHandle,
      identityHandle,
      controllerProductHandle,
      controllerIdentityHandle,
      instructionProductHandle,
      phase,
      issueKind,
      message,
      frameworkErrorCode,
      sourceAddressHandle,
    );
    return new RuntimeControllerIssuePublication(
      issue,
      recordsForRuntimeControllerIssue(issue, provenanceHandle),
    );
  }
}

function recordsForRuntimeControllerIssue(
  issue: RuntimeControllerIssue,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return [
    new ConfigurationIdentity(
      issue.identityHandle,
      KernelVocabulary.Configuration.ControllerIssue.key,
      issue.controllerIdentityHandle,
      issue.sourceAddressHandle,
      issue.issueKind,
    ),
    new MaterializedProduct(
      issue.productHandle,
      KernelVocabulary.Configuration.ControllerIssue.key,
      issue.identityHandle,
      issue.sourceAddressHandle,
      provenanceHandle,
    ),
  ];
}
