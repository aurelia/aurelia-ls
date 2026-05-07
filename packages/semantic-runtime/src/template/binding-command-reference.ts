import type {
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';

/** Reference to a binding-command executable without retaining handler instances. */
export class BindingCommandExecutableReference {
  constructor(
    /** Product handle for the executable command model, when emitted. */
    readonly productHandle: ProductHandle | null,
    /** Identity for the executable command model, when emitted. */
    readonly identityHandle: IdentityHandle | null,
    /** Runtime command name such as `bind`, `two-way`, or `trigger`. */
    readonly name: string,
    /** Runtime DI/resource key, when materialized. */
    readonly key: string | null,
  ) {}
}
