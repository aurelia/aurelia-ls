import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import { auLink } from '../kernel/au-link.js';
import type { ConfigurationOptionValueKind } from '../configuration/configuration-option.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';

export type StateStoreOptionsOrHandlerKind =
  | 'absent'
  | 'options-object'
  | 'action-handler'
  | 'ambiguous';

export const enum StateGetterBindingStoreResolutionKind {
  /** The decorator targets the default IStore registration. */
  DefaultStore = 'default-store',
  /** The decorator targets a literal named store through IStoreRegistry.getStore(...). */
  NamedStore = 'named-store',
  /** The decorator uses a runtime-dependent store-name expression that cannot be resolved statically. */
  DynamicStoreName = 'dynamic-store-name',
  /** The decorator names a store that is not configured in the current app world. */
  MissingStore = 'missing-store',
}

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

/** Controller-added StateGetterBinding created by @fromState(...) for a field or setter target. */
@auLink('state:StateGetterBinding')
export class StateGetterBinding {
  constructor(
    /** Product handle for the materialized state getter binding. */
    readonly productHandle: ProductHandle,
    /** Identity for this state getter binding source site. */
    readonly identityHandle: IdentityHandle,
    /** Source address for the @fromState(...) decorator application. */
    readonly sourceAddressHandle: AddressHandle,
    /** Source address for the selector function expression passed to @fromState(...). */
    readonly selectorSourceAddressHandle: AddressHandle,
    /** Source address for the decorated field/setter name, when the target has a name span. */
    readonly targetSourceAddressHandle: AddressHandle | null,
    /** Authored target kind accepted by the framework decorator. */
    readonly targetKind: string,
    /** Decorated field or setter name when statically available. */
    readonly targetName: string | null,
    /** Null means default store, undefined means runtime-dependent store expression, string means named store. */
    readonly storeName: string | null | undefined,
    /** Static store-resolution lane for this binding. */
    readonly storeResolutionKind: StateGetterBindingStoreResolutionKind,
    /** Configured store product reached by the decorator when statically closed. */
    readonly storeProductHandle: ProductHandle | null,
    /** Configured store identity reached by the decorator when statically closed. */
    readonly storeIdentityHandle: IdentityHandle | null,
    /** Selector expression source text as authored. */
    readonly selectorText: string,
    /** Static return type of the selector function when the TypeChecker can project it. */
    readonly selectorReturnType: CheckerTypeReference | null,
    /** Static TypeScript type of the decorated target field/setter when the TypeChecker can project it. */
    readonly targetMemberType: CheckerTypeReference | null,
    /** Explanation for dynamic or missing store/type handoff; null means the modeled source binding is closed. */
    readonly openReason: string | null,
  ) {}
}
