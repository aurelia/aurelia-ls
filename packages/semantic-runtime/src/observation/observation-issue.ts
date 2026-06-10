import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { ObservationFrameworkErrorCode } from './framework-error-code.js';

export const enum ObservationIssuePhase {
  /** Invalid or unsupported @astTrack(...) usage discovered from authored TypeScript decorators. */
  AstTrackDecorator = 'ast-track-decorator',
  /** Invalid or unsupported @computed(...) usage discovered from authored TypeScript decorators. */
  ComputedDecorator = 'computed-decorator',
  /** Invalid or unsupported @observable(...) usage discovered from authored TypeScript decorators. */
  ObservableDecorator = 'observable-decorator',
  /** Template binding observation gap discovered after binding/data-flow dependency materialization. */
  BindingObservation = 'binding-observation',
}

export const enum ObservationIssueKind {
  /** @astTrack(...) was applied to a source shape that Aurelia cannot use as a trackable observer declaration. */
  InvalidAstTrackDecoratorUsage = 'invalid-ast-track-decorator-usage',
  /** @computed(...) was applied to a source shape that Aurelia cannot use as a computed observer declaration. */
  InvalidComputedDecoratorUsage = 'invalid-computed-decorator-usage',
  /** @observable(...) was applied to a source shape that Aurelia cannot turn into an observable member. */
  InvalidObservableDecoratorUsage = 'invalid-observable-decorator-usage',
  /** Template calls an undecorated method whose body reads state that astEvaluate will not proxy-observe. */
  NonTrackableTemplateMethodCall = 'non-trackable-template-method-call',
}

export type ObservationIssueField =
  | 'phase'
  | 'issueKind'
  | 'message'
  | 'frameworkErrorCode'
  | 'source'
  | 'subjectName'
  | 'relatedSources';

/** Source-backed observation failure corresponding to an Aurelia runtime boundary. */
export class ObservationIssue {
  constructor(
    /** Product handle for the materialized issue product. */
    readonly productHandle: ProductHandle,
    /** Identity for this observation issue product. */
    readonly identityHandle: IdentityHandle,
    /** Project that owns the source. */
    readonly projectKey: string,
    /** Observation phase that detected the issue. */
    readonly phase: ObservationIssuePhase,
    /** Stable semantic issue kind used by diagnostics and repair planning. */
    readonly issueKind: ObservationIssueKind,
    /** Human-readable message from the modeled framework boundary. */
    readonly message: string,
    /** Exact Aurelia framework error code when this issue models a framework ErrorNames throw. */
    readonly frameworkErrorCode: ObservationFrameworkErrorCode | null,
    /** Source address for the authored site that triggered the issue. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Additional source addresses that explain the issue without taking over its primary diagnostic location. */
    readonly relatedSourceAddressHandles: readonly AddressHandle[] = [],
    /** Issue-specific subject name, such as the called method, when repair planning needs a compact handle. */
    readonly subjectName: string | null = null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<ObservationIssueField>[] = [],
  ) {}
}
