import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { FrameworkRawErrorAuthority } from '../kernel/framework-raw-error-authority.js';
import type { EvaluationFrameworkErrorCode } from './framework-error-code.js';
import type { EvaluationValueKind } from './values.js';

export const enum EvaluationIssuePhase {
  ModuleLoaderTransform = 'module-loader-transform',
  KernelApiCall = 'kernel-api-call',
  MetadataApiCall = 'metadata-api-call',
}

export const enum EvaluationIssueKind {
  InvalidModuleTransformInput = 'invalid-module-transform-input',
  EventAggregatorPublishInvalidEventName = 'event-aggregator-publish-invalid-event-name',
  EventAggregatorSubscribeInvalidEventName = 'event-aggregator-subscribe-invalid-event-name',
  FirstDefinedNoValue = 'first-defined-no-value',
  MetadataDefineWithoutKey = 'metadata-define-without-key',
}

export const enum EvaluationIssueSubjectKind {
  ModuleLoaderLoadCall = 'module-loader-load-call',
  AliasedResourcesRegistry = 'aliased-resources-registry',
  EventAggregatorPublishCall = 'event-aggregator-publish-call',
  EventAggregatorSubscribeCall = 'event-aggregator-subscribe-call',
  FirstDefinedCall = 'first-defined-call',
  MetadataDefineCall = 'metadata-define-call',
}

export type EvaluationIssueSeverity =
  | 'information'
  | 'warning'
  | 'error';

export type EvaluationIssueField =
  | 'phase'
  | 'issueKind'
  | 'message'
  | 'severity'
  | 'frameworkErrorCode'
  | 'subjectKind'
  | 'actualValueKind'
  | 'inputExpressionText'
  | 'source';

/** Source-backed issue owned by static evaluation or a framework-shaped evaluator handoff. */
export class EvaluationIssue {
  constructor(
    /** Product handle for the materialized issue product. */
    readonly productHandle: ProductHandle,
    /** Identity for this evaluation issue product. */
    readonly identityHandle: IdentityHandle,
    /** Project that owns the source expression. */
    readonly projectKey: string,
    /** Evaluation phase that detected the issue. */
    readonly phase: EvaluationIssuePhase,
    /** Stable semantic issue kind used by diagnostics and repair planning. */
    readonly issueKind: EvaluationIssueKind,
    /** Source shape that caused the framework handoff to evaluate a value. */
    readonly subjectKind: EvaluationIssueSubjectKind,
    /** Human-readable message from the modeled framework boundary. */
    readonly message: string,
    /** Exact Aurelia framework error code when this issue models a framework ErrorNames throw. */
    readonly frameworkErrorCode: EvaluationFrameworkErrorCode | null,
    /** Exact Aurelia raw Error authority when the framework branch has no ErrorNames/Events label. */
    readonly frameworkRawErrorAuthority: FrameworkRawErrorAuthority | null,
    /** Best-known evaluator kind for the value rejected by the framework. */
    readonly actualValueKind: EvaluationValueKind | `${EvaluationValueKind}` | null,
    /** Authored expression text for the module-like input, used by diagnostics and repair planning. */
    readonly inputExpressionText: string | null,
    /** Source address for the expression that triggered the issue. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<EvaluationIssueField>[] = [],
    /** Diagnostic severity implied by the modeled framework path. */
    readonly severity: EvaluationIssueSeverity = 'error',
  ) {}
}
