import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { AureliaReference } from './aurelia.js';
import type { AppRootReference } from './app-root.js';
import type { AppTaskReference } from './app-task.js';

export const enum ConfigurationSequenceKind {
  /** Sequence that admits an Aurelia app facade, root config, registrations, and root component. */
  App = 'app',
  /** Sequence owned by a framework or application plugin configuration object. */
  Plugin = 'plugin',
  /** Sequence owned by an IRegistry-shaped value whose register body is being interpreted. */
  Registry = 'registry',
  /** Sequence owned by a builder-like configuration value before it is registered. */
  Builder = 'builder',
  /** Sequence exists but its owner or shape is not classified yet. */
  Unknown = 'unknown',
}

export const enum ConfigurationStepKind {
  /** An Aurelia facade is constructed or recovered from a static facade helper. */
  CreateAurelia = 'create-aurelia',
  /** Registration arguments are admitted through `Aurelia.register(...)`. */
  AureliaRegister = 'aurelia-register',
  /** Root configuration is admitted through `Aurelia.app(...)`. */
  AureliaApp = 'aurelia-app',
  /** Registration arguments are admitted through `container.register(...)`. */
  ContainerRegister = 'container-register',
  /** An IRegistry-compatible value's `register(container, ...)` method is interpreted. */
  RegistryRegister = 'registry-register',
  /** A `.customize(...)` call produces or forwards configuration option contributions. */
  Customize = 'customize',
  /** A builder method mutates configuration state before registration. */
  BuilderMutation = 'builder-mutation',
  /** A configuration option is assigned, copied, or defaulted. */
  OptionContribution = 'option-contribution',
  /** A plugin-style `configure` function or export participates in app admission. */
  PluginConfigure = 'plugin-configure',
  /** The step exists, but the source shape is not classified yet. */
  Unknown = 'unknown',
}

export type ConfigurationSequenceField =
  | 'sequenceKind'
  | 'owner'
  | 'steps'
  | 'source';

export type ConfigurationStepField =
  | 'stepKind'
  | 'sequence'
  | 'ordinal'
  | 'receiver'
  | 'producedProducts'
  | 'registrationAdmissions'
  | 'appTasks'
  | 'source';

/** Reference to a modeled configuration sequence. */
export class ConfigurationSequenceReference {
  constructor(
    /** Identity for this sequence, when sequence ownership has closed. */
    readonly identityHandle: IdentityHandle | null,
    /** Product handle for the materialized sequence, when emitted. */
    readonly productHandle: ProductHandle | null,
    /** Source address for the expression, declaration, or app boundary that owns the sequence. */
    readonly addressHandle: AddressHandle | null,
    /** Local source name used only for traces while identity is still open. */
    readonly localName: string | null,
  ) {}
}

/** Reference to one ordered configuration step. */
export class ConfigurationStepReference {
  constructor(
    /** Identity for this step, when materialization has closed. */
    readonly identityHandle: IdentityHandle | null,
    /** Product handle for the materialized step, when emitted. */
    readonly productHandle: ProductHandle | null,
    /** Source address for the call, declaration, assignment, or dispatch point. */
    readonly addressHandle: AddressHandle | null,
    /** Ordinal inside the owning sequence when order is known. */
    readonly ordinal: number | null,
  ) {}
}

/**
 * Ordered configuration flow before registration admissions are spent into a DI world.
 *
 * A sequence is not a compiler stage. It is source/evaluation order for one app, plugin, registry body, or builder
 * object.
 */
export class ConfigurationSequence {
  constructor(
    /** Product handle for the materialized-product envelope that represents this sequence. */
    readonly productHandle: ProductHandle,
    /** Identity for this modeled sequence. */
    readonly identityHandle: IdentityHandle,
    /** Sequence lane observed from source and static evaluation. */
    readonly sequenceKind: ConfigurationSequenceKind,
    /** Aurelia facade that owns this sequence, if applicable. */
    readonly aurelia: AureliaReference | null,
    /** AppRoot boundary that owns this sequence, if applicable. */
    readonly appRoot: AppRootReference | null,
    /** Ordered steps observed for this sequence. */
    readonly steps: readonly ConfigurationStepReference[],
    /** Source address for the sequence owner. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<ConfigurationSequenceField>[] = [],
  ) {}

  /** Store-local reference for products that point at this sequence. */
  toReference(): ConfigurationSequenceReference {
    return new ConfigurationSequenceReference(
      this.identityHandle,
      this.productHandle,
      this.sourceAddressHandle,
      null,
    );
  }
}

/**
 * One ordered configuration action or observation.
 *
 * Steps connect configuration flow to products produced elsewhere. They preserve order and provenance without
 * executing registrations, app-task callbacks, or arbitrary user code.
 */
export class ConfigurationStep {
  constructor(
    /** Product handle for the materialized-product envelope that represents this step. */
    readonly productHandle: ProductHandle,
    /** Identity for this modeled step. */
    readonly identityHandle: IdentityHandle,
    /** Step lane observed from source and static evaluation. */
    readonly stepKind: ConfigurationStepKind,
    /** Owning configuration sequence. */
    readonly sequence: ConfigurationSequenceReference | null,
    /** Order inside the owning sequence when known. */
    readonly ordinal: number | null,
    /** Receiver identity for method-call steps, when closed. */
    readonly receiverIdentityHandle: IdentityHandle | null,
    /** Receiver product for method-call steps, when materialized. */
    readonly receiverProductHandle: ProductHandle | null,
    /** Products produced or selected by this step. */
    readonly producedProductHandles: readonly ProductHandle[],
    /** Registration admissions offered by this step before DI spending. */
    readonly registrationAdmissionProductHandles: readonly ProductHandle[],
    /** AppTasks created, registered, or selected by this step. */
    readonly appTasks: readonly AppTaskReference[],
    /** Source address for the call, declaration, assignment, or dispatch point. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<ConfigurationStepField>[] = [],
  ) {}

  /** Store-local reference for products that point at this step. */
  toReference(): ConfigurationStepReference {
    return new ConfigurationStepReference(
      this.identityHandle,
      this.productHandle,
      this.sourceAddressHandle,
      this.ordinal,
    );
  }
}
