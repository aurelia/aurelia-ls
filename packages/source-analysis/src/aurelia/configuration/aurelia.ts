import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { ContainerReference } from '../di/container.js';
import type { AppRootReference } from './app-root.js';

export type AureliaField =
  | 'container'
  | 'rootProvider'
  | 'pendingRoot'
  | 'activeRoot'
  | 'source';

/** Reference to a modeled Aurelia runtime facade without retaining a live runtime object. */
export class AureliaReference {
  constructor(
    /** Identity for this modeled Aurelia facade, when construction has closed. */
    readonly identityHandle: IdentityHandle | null,
    /** Product handle for the materialized Aurelia facade, when emitted. */
    readonly productHandle: ProductHandle | null,
    /** Source address for the expression that created or mentioned the facade. */
    readonly addressHandle: AddressHandle | null,
    /** Local source name used only for traces while identity is still open. */
    readonly localName: string | null,
  ) {}
}

/**
 * Runtime-shaped Aurelia facade for app admission.
 *
 * This models the container/root-provider/root handoff that matters before start/stop lifecycle execution. It does
 * not execute lifecycle tasks, DOM events, or root activation.
 */
@auLink('runtime-html:Aurelia')
export class Aurelia {
  constructor(
    /** Product handle for the materialized-product envelope that represents this facade. */
    readonly productHandle: ProductHandle,
    /** Identity for this modeled Aurelia facade. */
    readonly identityHandle: IdentityHandle,
    /** Root container owned by the facade constructor path. */
    readonly container: ContainerReference,
    /** Product handle for the IAppRoot provider row registered by the constructor path, when modeled. */
    readonly rootProviderProductHandle: ProductHandle | null,
    /** App root produced by `.app(...)` but not necessarily started. */
    readonly pendingRoot: AppRootReference | null,
    /** Root that has been prepared by start-like analysis, if that later pass runs. */
    readonly activeRoot: AppRootReference | null,
    /** Source address for the constructor or static app admission expression. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<AureliaField>[] = [],
  ) {}

  /** Store-local reference for app/configuration products that point at this facade. */
  toReference(): AureliaReference {
    return new AureliaReference(
      this.identityHandle,
      this.productHandle,
      this.sourceAddressHandle,
      null,
    );
  }
}
