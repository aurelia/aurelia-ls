import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { RegistrationKeyReference } from '../registration/registration-reference.js';

export const enum AppTaskSlot {
  Creating = 'creating',
  Hydrating = 'hydrating',
  Hydrated = 'hydrated',
  Activating = 'activating',
  Activated = 'activated',
  Deactivating = 'deactivating',
  Deactivated = 'deactivated',
}

export const enum AppTaskCallbackKind {
  /** Callback is invoked with no resolved DI value. */
  NoArgument = 'no-argument',
  /** Callback is invoked with `container.get(key)`. */
  ResolvedKey = 'resolved-key',
}

export type AppTaskField =
  | 'slot'
  | 'key'
  | 'callback'
  | 'source';

/** Reference to a callback function without executing or retaining the function object. */
export class ConfigurationCallbackReference {
  constructor(
    /** Identity for declaration-backed callbacks, when available. */
    readonly identityHandle: IdentityHandle | null,
    /** Product handle when another substrate materialized the callback as a product. */
    readonly productHandle: ProductHandle | null,
    /** Source address for the callback expression, method, or declaration. */
    readonly addressHandle: AddressHandle | null,
    /** Local name or trace label for the callback while identity is open. */
    readonly localName: string | null,
  ) {}
}

/** Reference to a modeled AppTask without retaining the runtime task instance. */
export class AppTaskReference {
  constructor(
    /** Identity for this task, when materialization has closed. */
    readonly identityHandle: IdentityHandle | null,
    /** Product handle for the materialized task, when emitted. */
    readonly productHandle: ProductHandle | null,
    /** Source address for the task factory or registration expression. */
    readonly addressHandle: AddressHandle | null,
    /** Slot if the reference has already been classified. */
    readonly slot: AppTaskSlot | null,
  ) {}
}

/**
 * Runtime-shaped IAppTask definition produced by `AppTask.*(...)`.
 *
 * The task is an IRegistry value at registration time, but its callback effect is deferred until AppRoot dispatches
 * the matching lifecycle slot. This model preserves the slot/key/callback contract without running the callback.
 */
@auLink('runtime-html:IAppTask')
export class AppTaskDefinition {
  constructor(
    /** Product handle for the materialized-product envelope that represents this AppTask. */
    readonly productHandle: ProductHandle,
    /** Identity for this modeled AppTask. */
    readonly identityHandle: IdentityHandle,
    /** Lifecycle slot selected by the AppTask factory. */
    readonly slot: AppTaskSlot,
    /** Runtime callback lane: no argument, resolved DI key, or open. */
    readonly callbackKind: AppTaskCallbackKind,
    /** Key resolved before invoking the callback, if the factory used the keyed overload. */
    readonly key: RegistrationKeyReference | null,
    /** Callback source reference. The callback body is not executed by this model. */
    readonly callback: ConfigurationCallbackReference | null,
    /** Source address for the `AppTask.*(...)` call or equivalent registry construction. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<AppTaskField>[] = [],
  ) {}

  /** Store-local reference for products that point at this AppTask. */
  toReference(): AppTaskReference {
    return new AppTaskReference(
      this.identityHandle,
      this.productHandle,
      this.sourceAddressHandle,
      this.slot,
    );
  }
}
