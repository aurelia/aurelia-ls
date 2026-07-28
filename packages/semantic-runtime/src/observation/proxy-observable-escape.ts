import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';

export const enum ProxyObservableEscapeKind {
  /** `ProxyObservable.getRaw(value)` returns the backing raw object when `value` is proxied. */
  GetRaw = 'getRaw',
  /** `ProxyObservable.unwrap(value)` removes a proxy wrapper when the value can be proxied. */
  Unwrap = 'unwrap',
}

/** Source-level use of Aurelia's ProxyObservable escape APIs. */
export class ProxyObservableEscape {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly escapeKind: ProxyObservableEscapeKind,
    readonly argumentSourceName: string | null,
    readonly argumentRootName: string | null,
    readonly sourceAddressHandle: AddressHandle,
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
