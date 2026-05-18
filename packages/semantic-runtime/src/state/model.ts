import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { ConfigurationOptionValueKind } from '../configuration/configuration-option.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';

export type StateStoreOptionsOrHandlerKind =
  | 'absent'
  | 'options-object'
  | 'action-handler'
  | 'ambiguous';

/** One @aurelia/state store configuration admitted before AppTask execution creates the runtime Store. */
export class StateStoreConfiguration {
  constructor(
    /** Product handle for the materialized store-configuration envelope. */
    readonly productHandle: ProductHandle,
    /** Identity for this configured store. */
    readonly identityHandle: IdentityHandle,
    /** Store name, with `default` reserved for StateDefaultConfiguration.init(...). */
    readonly name: string | null,
    /** True when this is the default store that will register the IStore alias during AppTask execution. */
    readonly isDefault: boolean,
    /** Configuration-option value lane for the initial state argument. */
    readonly initialStateKind: ConfigurationOptionValueKind | `${ConfigurationOptionValueKind}` | null,
    /** Overload interpretation of the optional options-or-handler argument. */
    readonly optionsOrHandlerKind: StateStoreOptionsOrHandlerKind,
    /** Number of statically visible action-handler callback arguments. */
    readonly actionHandlerCount: number,
    /** Source address for the StateDefaultConfiguration builder call. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Source address for the store name argument when one is authored. */
    readonly nameSourceAddressHandle: AddressHandle | null,
    /** Source address for the initial state argument. */
    readonly initialStateSourceAddressHandle: AddressHandle | null,
    /** Static type of the initial state object that StateBindingBehavior exposes as the binding context. */
    readonly initialStateType: CheckerTypeReference | null,
    /** Source address for the overload-bearing options-or-handler argument. */
    readonly optionsOrHandlerSourceAddressHandle: AddressHandle | null,
    /** Source addresses for callback arguments classified as action handlers. */
    readonly actionHandlerSourceAddressHandles: readonly AddressHandle[] = [],
  ) {}
}
