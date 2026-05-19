import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';

export const enum ProxyObservableEscapeKind {
  /** `ProxyObservable.getRaw(value)` returns the backing raw object when `value` is proxied. */
  GetRaw = 'getRaw',
  /** `ProxyObservable.unwrap(value)` removes a proxy wrapper when the value can be proxied. */
  Unwrap = 'unwrap',
}

export type ProxyObservableEscapeField =
  | 'escapeKind'
  | 'argumentSourceName'
  | 'argumentRootName'
  | 'source';

/** Source-level use of Aurelia's ProxyObservable escape APIs. */
export class ProxyObservableEscape {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly escapeKind: ProxyObservableEscapeKind,
    readonly argumentSourceName: string | null,
    readonly argumentRootName: string | null,
    readonly sourceAddressHandle: AddressHandle,
    readonly fieldProvenance: readonly FieldProvenance<ProxyObservableEscapeField>[] = [],
  ) {}
}

export class ProxyObservableEscapeProjectResult {
  constructor(
    readonly escapes: readonly ProxyObservableEscape[],
  ) {}

  readEscapes(): readonly ProxyObservableEscape[] {
    return this.escapes;
  }
}
