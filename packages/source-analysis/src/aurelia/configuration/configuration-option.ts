import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';

export const enum ConfigurationOptionContributionKind {
  /** Option value came from a runtime default object before user customization. */
  DefaultValue = 'default-value',
  /** Option value came from a user customization callback. */
  CustomizeCallback = 'customize-callback',
  /** Option value came from a builder method argument such as `.withStore(...)`. */
  BuilderArgument = 'builder-argument',
  /** Option value was copied or forwarded from another configuration object. */
  Forwarded = 'forwarded',
  /** Option value exists but its producing shape is not classified yet. */
  Unknown = 'unknown',
}

export const enum ConfigurationOptionValueKind {
  /** Value expression exists but could not be classified. */
  Unknown = 'unknown',
  /** No value is present for this option path. */
  Absent = 'absent',
  /** A boolean literal option value. */
  Boolean = 'boolean',
  /** A string literal option value. */
  String = 'string',
  /** A numeric literal option value. */
  Number = 'number',
  /** A null option value. */
  Null = 'null',
  /** An object literal or object-like evaluated value. */
  Object = 'object',
  /** An array literal or array-like evaluated value. */
  Array = 'array',
  /** A function/callback value. */
  Callback = 'callback',
  /** A declaration, resource, DI key, or other semantic identity reference. */
  Identity = 'identity',
  /** A product produced by another source-analysis substrate. */
  Product = 'product',
}

export type ConfigurationOptionField =
  | 'contributionKind'
  | 'optionPath'
  | 'value'
  | 'source';

/** Option value expression exists but could not be classified. */
export class UnknownConfigurationOptionValue {
  readonly valueKind = ConfigurationOptionValueKind.Unknown;

  constructor(
    /** Source address for the value expression. */
    readonly addressHandle: AddressHandle | null,
    /** Local name or expression preview for traces when the value is not closed. */
    readonly localName: string | null,
  ) {}
}

/** No value was present for this option path. */
export class AbsentConfigurationOptionValue {
  readonly valueKind = ConfigurationOptionValueKind.Absent;

  constructor(
    /** Source address for the absent slot, when meaningful. */
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Boolean literal option value. */
export class BooleanConfigurationOptionValue {
  readonly valueKind = ConfigurationOptionValueKind.Boolean;

  constructor(
    /** Closed boolean option value. */
    readonly value: boolean,
    /** Source address for the literal or expression that produced this value. */
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** String literal option value. */
export class StringConfigurationOptionValue {
  readonly valueKind = ConfigurationOptionValueKind.String;

  constructor(
    /** Closed string option value. */
    readonly value: string,
    /** Source address for the literal or expression that produced this value. */
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Numeric literal option value. */
export class NumberConfigurationOptionValue {
  readonly valueKind = ConfigurationOptionValueKind.Number;

  constructor(
    /** Closed numeric option value. */
    readonly value: number,
    /** Source address for the literal or expression that produced this value. */
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Null literal option value. */
export class NullConfigurationOptionValue {
  readonly valueKind = ConfigurationOptionValueKind.Null;

  constructor(
    /** Source address for the literal or expression that produced this value. */
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Object-like option value that should stay referential until a narrower product shape exists. */
export class ObjectConfigurationOptionValue {
  readonly valueKind = ConfigurationOptionValueKind.Object;

  constructor(
    /** Product handle when another substrate materialized the object-like value. */
    readonly productHandle: ProductHandle | null,
    /** Source address for the object expression. */
    readonly addressHandle: AddressHandle | null,
    /** Local name or expression preview for traces. */
    readonly localName: string | null,
  ) {}
}

/** Array-like option value that should stay referential until a narrower product shape exists. */
export class ArrayConfigurationOptionValue {
  readonly valueKind = ConfigurationOptionValueKind.Array;

  constructor(
    /** Product handle when another substrate materialized the array-like value. */
    readonly productHandle: ProductHandle | null,
    /** Source address for the array expression. */
    readonly addressHandle: AddressHandle | null,
    /** Local name or expression preview for traces. */
    readonly localName: string | null,
  ) {}
}

/** Callback option value. The callback body is not executed by this model. */
export class CallbackConfigurationOptionValue {
  readonly valueKind = ConfigurationOptionValueKind.Callback;

  constructor(
    /** Identity handle for declaration-backed callbacks. */
    readonly identityHandle: IdentityHandle | null,
    /** Product handle when another substrate materialized the callback. */
    readonly productHandle: ProductHandle | null,
    /** Source address for the callback expression or declaration. */
    readonly addressHandle: AddressHandle | null,
    /** Local callback name for traces. */
    readonly localName: string | null,
  ) {}
}

/** Option value that points at a semantic identity. */
export class IdentityConfigurationOptionValue {
  readonly valueKind = ConfigurationOptionValueKind.Identity;

  constructor(
    /** Identity handle for the referenced declaration, DI key, resource, or semantic product. */
    readonly identityHandle: IdentityHandle,
    /** Source address for the reference expression. */
    readonly addressHandle: AddressHandle | null,
    /** Local name for traces. */
    readonly localName: string | null,
  ) {}
}

/** Option value that points at another materialized product. */
export class ProductConfigurationOptionValue {
  readonly valueKind = ConfigurationOptionValueKind.Product;

  constructor(
    /** Product handle for the referenced value. */
    readonly productHandle: ProductHandle,
    /** Source address for the reference expression. */
    readonly addressHandle: AddressHandle | null,
    /** Local name for traces. */
    readonly localName: string | null,
  ) {}
}

export type ConfigurationOptionValue =
  | UnknownConfigurationOptionValue
  | AbsentConfigurationOptionValue
  | BooleanConfigurationOptionValue
  | StringConfigurationOptionValue
  | NumberConfigurationOptionValue
  | NullConfigurationOptionValue
  | ObjectConfigurationOptionValue
  | ArrayConfigurationOptionValue
  | CallbackConfigurationOptionValue
  | IdentityConfigurationOptionValue
  | ProductConfigurationOptionValue;

/**
 * One source-backed contribution to a configuration option path.
 *
 * This intentionally does not decide final option precedence. Configuration convergence can fold ordered
 * contributions once a producer knows the configuration object's runtime policy.
 */
export class ConfigurationOptionContribution {
  constructor(
    /** Product handle for the materialized-product envelope that represents this option contribution. */
    readonly productHandle: ProductHandle,
    /** Identity for this option contribution. */
    readonly identityHandle: IdentityHandle,
    /** Source lane that produced the contribution. */
    readonly contributionKind: ConfigurationOptionContributionKind,
    /** Runtime option path, such as `coercingOptions.enableCoercion` or `devToolsOptions.disable`. */
    readonly optionPath: readonly string[],
    /** Value reference observed for this option path. */
    readonly value: ConfigurationOptionValue,
    /** Source address for the assignment, property, argument, or forwarding site. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<ConfigurationOptionField>[] = [],
  ) {}
}
