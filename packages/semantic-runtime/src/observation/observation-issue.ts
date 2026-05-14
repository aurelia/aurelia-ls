import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { ObservationFrameworkErrorCode } from './framework-error-code.js';

export const enum ObservationIssuePhase {
  AstTrackDecorator = 'ast-track-decorator',
  ComputedDecorator = 'computed-decorator',
  ObservableDecorator = 'observable-decorator',
}

export const enum ObservationIssueKind {
  InvalidAstTrackDecoratorUsage = 'invalid-ast-track-decorator-usage',
  InvalidComputedDecoratorUsage = 'invalid-computed-decorator-usage',
  InvalidObservableDecoratorUsage = 'invalid-observable-decorator-usage',
}

export type ObservationIssueField =
  | 'phase'
  | 'issueKind'
  | 'message'
  | 'frameworkErrorCode'
  | 'source';

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
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<ObservationIssueField>[] = [],
  ) {}
}
