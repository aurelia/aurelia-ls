import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import { ContainerIdentityKind } from '../kernel/identity.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import { ContainerRegistrationOperation } from './container-registration.js';
import {
  ContainerConfiguration,
  ContainerConfigurationInput,
} from './container-configuration.js';
import {
  ContainerFactoryLookup,
  ContainerLookupState,
  ContainerResourceLookup,
  ContainerResolverLookup,
} from './container-lookup.js';
import {
  ContainerFactorySlot,
  ContainerResourceSlot,
  type ContainerResolverLikeSlot,
  ContainerResolverSlot,
  ContainerSelfResolverSlot,
} from './container-slot.js';

export type ContainerField =
  | 'containerKind'
  | 'parent'
  | 'root'
  | 'source';

/** Lightweight reference to a modeled container. */
export class ContainerReference {
  constructor(
    /** Container identity when world construction has modeled it. */
    readonly identityHandle: IdentityHandle | null,
    /** Container product handle when this reference points at a materialized container product. */
    readonly productHandle: ProductHandle | null,
    /** Source address for the expression or app boundary that mentioned the container. */
    readonly addressHandle: AddressHandle | null,
    /** Local source name for traces when identity is still open. */
    readonly localName: string | null,
  ) {}
}

export type ContainerRegisterEntry =
  | ContainerRegistrationOperation
  | ContainerResolverSlot
  | ContainerSelfResolverSlot
  | ContainerResourceSlot
  | ContainerFactorySlot;

export type ContainerChildFactory = (
  parent: Container,
  configuration: ContainerConfiguration,
) => Container;

export type ContainerResourceSlotFactory = (
  target: Container,
  source: ContainerResourceSlot,
) => ContainerResourceSlot;

/** Abstract Aurelia container before or during DI world construction. */
@auLink('kernel:Container')
export class Container {
  private _registerDepth = 0;
  private readonly _resolvers = new Map<IdentityHandle, ContainerResolverLikeSlot[]>();
  private readonly _factories: Map<IdentityHandle, ContainerFactorySlot>;
  private readonly res = new Map<string, ContainerResourceSlot>();
  private readonly _disposableResolvers = new Map<IdentityHandle, Set<ContainerResolverLikeSlot>>();
  private readonly _parent: Container | null;
  private readonly _parentReference: ContainerReference | null;
  private readonly _rootReference: ContainerReference;
  private readonly config: ContainerConfiguration;
  private readonly registrationOperations: ContainerRegistrationOperation[] = [];
  private readonly childContainers: Container[] = [];
  private disposed = false;
  readonly id: IdentityHandle;
  readonly root: Container;

  constructor(
    /** Product handle for the kernel materialized-product envelope that represents this container. */
    readonly productHandle: ProductHandle,
    /** Container identity for this abstract container. */
    readonly identityHandle: IdentityHandle,
    /** Runtime-shaped container role. */
    readonly containerKind: ContainerIdentityKind,
    /** Parent container reference, if this is a child container. */
    parent: ContainerReference | null,
    /** Root container reference for lookup and factory sharing, when known. */
    rootReference: ContainerReference | null,
    /** Source address for the app boundary or expression that produced this container. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<ContainerField>[] = [],
    /** Runtime-shaped container configuration. */
    config: ContainerConfiguration = ContainerConfiguration.DEFAULT,
    /** Parent emulator frame for ancestor lookups. */
    parentContainer: Container | null = null,
  ) {
    this.id = identityHandle;
    this.config = config;
    this._parent = parentContainer;
    this._parentReference = parent;
    this.root = parentContainer?.root ?? this;
    this._rootReference = rootReference ?? this.root.toReference();
    this._factories = parentContainer?._factories ?? new Map();
  }

  /** Runtime-shaped depth from the root container. */
  get depth(): number {
    return this._parent == null ? 0 : this._parent.depth + 1;
  }

  /** Parent container emulator frame. */
  get parent(): Container | null {
    return this._parent;
  }

  /** Whether this emulator frame has been disposed. */
  get isDisposed(): boolean {
    return this.disposed;
  }

  /** Store-local reference for this modeled container. */
  toReference(): ContainerReference {
    return new ContainerReference(
      this.identityHandle,
      this.productHandle,
      this.sourceAddressHandle,
      null,
    );
  }

  /** Durable parent reference for kernel facts and answer envelopes. */
  readParentReference(): ContainerReference | null {
    return this._parentReference ?? this._parent?.toReference() ?? null;
  }

  /** Durable root reference for kernel facts and answer envelopes. */
  readRootReference(): ContainerReference {
    return this._rootReference;
  }

  /** Register already-materialized DI effects against this container. */
  register(...entries: ContainerRegisterEntry[]): this {
    ++this._registerDepth;
    try {
      for (const entry of entries) {
        if (entry instanceof ContainerRegistrationOperation) {
          this.registrationOperations.push(entry);
        } else if (entry instanceof ContainerResolverSlot) {
          this.registerResolver(entry);
        } else if (entry instanceof ContainerSelfResolverSlot) {
          this.registerSelfResolver(entry);
        } else if (entry instanceof ContainerResourceSlot) {
          this.registerResource(entry);
        } else if (entry instanceof ContainerFactorySlot) {
          this.registerFactory(entry);
        }
      }
    } finally {
      --this._registerDepth;
    }
    return this;
  }

  /** Apply a resolver row to the container's resolver map. */
  registerResolver(slot: ContainerResolverSlot): ContainerResolverSlot {
    this.addResolverSlot(slot);
    if (slot.isDisposable) {
      const disposableSlots = this._disposableResolvers.get(slot.keyIdentityHandle);
      if (disposableSlots == null) {
        this._disposableResolvers.set(slot.keyIdentityHandle, new Set([slot]));
      } else {
        disposableSlots.add(slot);
      }
    }
    return slot;
  }

  /** Apply the built-in `IContainer` self resolver row created by the container constructor path. */
  registerSelfResolver(slot: ContainerSelfResolverSlot): ContainerSelfResolverSlot {
    this.addResolverSlot(slot);
    return slot;
  }

  /** Add or replace a runtime resource lookup row. */
  registerResource(slot: ContainerResourceSlot): ContainerResourceSlot {
    this.res.set(slot.resourceKey, slot);
    return slot;
  }

  /** Add or replace a root-shared factory row. */
  registerFactory(slot: ContainerFactorySlot): void {
    this._factories.set(slot.keyIdentityHandle, slot);
  }

  /** True when a resolver row exists locally, or in ancestors when requested. */
  has(keyIdentityHandle: IdentityHandle, searchAncestors: boolean = false): boolean {
    return this.readResolverSlots(keyIdentityHandle).length > 0
      || this.readResourceSlots().some((slot) => slot.keyIdentityHandle === keyIdentityHandle)
      || (searchAncestors && (this._parent?.has(keyIdentityHandle, true) ?? false));
  }

  /** True when a runtime resource key is visible in this container or optionally its ancestors. */
  hasResource(resourceKey: string, searchAncestors: boolean = false): boolean {
    return this.res.has(resourceKey)
      || (searchAncestors && (this._parent?.hasResource(resourceKey, true) ?? false));
  }

  /** Runtime-shaped resolver lookup with explicit search path and auto-registration pressure. */
  getResolver(keyIdentityHandle: IdentityHandle, autoRegister: boolean = true): ContainerResolverLookup {
    if (this.disposed) {
      return new ContainerResolverLookup(
        ContainerLookupState.Disposed,
        keyIdentityHandle,
        this.toReference(),
        null,
        [],
        [this.toReference()],
        autoRegister,
      );
    }

    const searchPath: ContainerReference[] = [];
    let current: Container | null = this;
    while (current != null) {
      searchPath.push(current.toReference());
      const slots = current.readResolverSlots(keyIdentityHandle);
      if (slots.length > 0) {
        return new ContainerResolverLookup(
          ContainerLookupState.Hit,
          keyIdentityHandle,
          this.toReference(),
          current.toReference(),
          slots,
          searchPath,
          autoRegister,
        );
      }

      if (current._parent == null) {
        if (autoRegister) {
          return this._jitRegister(keyIdentityHandle, current, searchPath);
        }
        return new ContainerResolverLookup(
          ContainerLookupState.Miss,
          keyIdentityHandle,
          this.toReference(),
          null,
          [],
          searchPath,
          autoRegister,
        );
      }
      current = current._parent;
    }

    return new ContainerResolverLookup(
      ContainerLookupState.Miss,
      keyIdentityHandle,
      this.toReference(),
      null,
      [],
      searchPath,
      autoRegister,
    );
  }

  /** Runtime `get` shape, represented as a resolver lookup rather than executing user constructors or callbacks. */
  get(keyIdentityHandle: IdentityHandle): ContainerResolverLookup {
    return this.getResolver(keyIdentityHandle, true);
  }

  /** Runtime `getAll` shape. Search ancestors concatenates every resolver row; local search returns first hit. */
  getAll(keyIdentityHandle: IdentityHandle, searchAncestors: boolean = false): readonly ContainerResolverLookup[] {
    if (!searchAncestors) {
      const lookup = this.getResolver(keyIdentityHandle, false);
      return lookup.state === ContainerLookupState.Hit ? [lookup] : [];
    }

    const lookups: ContainerResolverLookup[] = [];
    let current: Container | null = this;
    while (current != null) {
      const slots = current.readResolverSlots(keyIdentityHandle);
      if (slots.length > 0) {
        lookups.push(new ContainerResolverLookup(
          ContainerLookupState.Hit,
          keyIdentityHandle,
          this.toReference(),
          current.toReference(),
          slots,
          [current.toReference()],
          false,
        ));
      }
      current = current._parent;
    }
    return lookups;
  }

  /** True when the root-shared factory map has a row for the key. */
  hasFactory(keyIdentityHandle: IdentityHandle): boolean {
    return this._factories.has(keyIdentityHandle);
  }

  /** Read a root-shared factory row without constructing a factory. */
  getFactory(keyIdentityHandle: IdentityHandle): ContainerFactoryLookup {
    if (this.disposed) {
      return new ContainerFactoryLookup(
        ContainerLookupState.Disposed,
        keyIdentityHandle,
        this.toReference(),
        null,
      );
    }
    const slot = this._factories.get(keyIdentityHandle) ?? null;
    return new ContainerFactoryLookup(
      slot == null ? ContainerLookupState.Miss : ContainerLookupState.Hit,
      keyIdentityHandle,
      this.toReference(),
      slot,
    );
  }

  /** Runtime `registerTransformer` shape. Transformer bodies are not executed; the factory row remains the carrier. */
  registerTransformer(keyIdentityHandle: IdentityHandle): ContainerFactoryLookup {
    return this.getFactory(keyIdentityHandle);
  }

  /** Runtime `invoke` shape. Constructor execution is deferred; factory lookup exposes the activation pressure. */
  invoke(typeIdentityHandle: IdentityHandle): ContainerFactoryLookup {
    return this.getFactory(typeIdentityHandle);
  }

  /** Product-aware child creation. The caller supplies the child factory because it owns handle/provenance minting. */
  createChild(factory: ContainerChildFactory, input?: ContainerConfiguration | ContainerConfigurationInput): Container {
    const configuration = this.configurationForChild(input);
    const child = factory(this, configuration);
    this.childContainers.push(child);
    return child;
  }

  /** Runtime `disposeResolvers` shape: delete every resolver key that has a disposable marker. */
  disposeResolvers(): void {
    for (const keyIdentityHandle of this._disposableResolvers.keys()) {
      this._resolvers.delete(keyIdentityHandle);
    }
    this._disposableResolvers.clear();
  }

  /**
   * Product-aware resource inheritance. Runtime copies parent resources through `registerResolver`; the tooling model
   * requires the caller to mint child-owned slot products with provenance before mutating this container.
   */
  useResources(container: Container, factory: ContainerResourceSlotFactory): readonly ContainerResourceSlot[] {
    const imported: ContainerResourceSlot[] = [];
    for (const slot of container.readResourceSlots()) {
      imported.push(this.registerResource(factory(this, slot)));
    }
    return imported;
  }

  /** Runtime `find(kind, name)` / `find(key)` shape over resource rows. */
  find(kindOrKey: string, name: string | null = null): ContainerResourceLookup {
    const resourceKey = name == null ? kindOrKey : `au:${kindOrKey}:${name}`;
    if (this.disposed) {
      return new ContainerResourceLookup(
        ContainerLookupState.Disposed,
        resourceKey,
        this.toReference(),
        null,
        null,
      );
    }

    const local = this.res.get(resourceKey) ?? null;
    if (local != null) {
      return new ContainerResourceLookup(
        ContainerLookupState.Hit,
        resourceKey,
        this.toReference(),
        this.toReference(),
        local,
      );
    }

    const rootContainer = this.root;
    const rootSlot = rootContainer === this ? null : rootContainer.res.get(resourceKey) ?? null;
    return new ContainerResourceLookup(
      rootSlot == null ? ContainerLookupState.Miss : ContainerLookupState.Hit,
      resourceKey,
      this.toReference(),
      rootSlot == null ? null : rootContainer.toReference(),
      rootSlot,
    );
  }

  /** Dispose all local container rows. */
  dispose(): void {
    this.disposeResolvers();
    this._resolvers.clear();
    this.res.clear();
    if (this.root === this) {
      this._factories.clear();
    }
    this.disposed = true;
  }

  readRegistrationOperations(): readonly ContainerRegistrationOperation[] {
    return [...this.registrationOperations];
  }

  readResolverSlots(keyIdentityHandle?: IdentityHandle): readonly ContainerResolverLikeSlot[] {
    if (keyIdentityHandle != null) {
      return [...(this._resolvers.get(keyIdentityHandle) ?? [])];
    }
    return [...this._resolvers.values()].flat();
  }

  readResourceSlots(): readonly ContainerResourceSlot[] {
    return [...this.res.values()];
  }

  readFactorySlots(): readonly ContainerFactorySlot[] {
    return [...this._factories.values()];
  }

  readChildContainers(): readonly Container[] {
    return [...this.childContainers];
  }

  private addResolverSlot(slot: ContainerResolverLikeSlot): void {
    const slots = this._resolvers.get(slot.keyIdentityHandle);
    if (slots == null) {
      this._resolvers.set(slot.keyIdentityHandle, [slot]);
    } else {
      slots.push(slot);
    }
  }

  /** Runtime `_jitRegister` boundary. Default resolver and registry bodies are modeled by later producers. */
  private _jitRegister(
    keyIdentityHandle: IdentityHandle,
    handler: Container,
    searchPath: readonly ContainerReference[],
  ): ContainerResolverLookup {
    const slots = handler.readResolverSlots(keyIdentityHandle);
    if (slots.length > 0) {
      return new ContainerResolverLookup(
        ContainerLookupState.Hit,
        keyIdentityHandle,
        this.toReference(),
        handler.toReference(),
        slots,
        searchPath,
        true,
      );
    }

    return new ContainerResolverLookup(
      ContainerLookupState.JitRegistration,
      keyIdentityHandle,
      this.toReference(),
      handler.toReference(),
      [],
      searchPath,
      true,
    );
  }

  private configurationForChild(
    input: ContainerConfiguration | ContainerConfigurationInput | null | undefined,
  ): ContainerConfiguration {
    if (input == null && this.config.inheritParentResources) {
      if (this.config === ContainerConfiguration.DEFAULT) {
        return this.config;
      }
      return ContainerConfiguration.from(new ContainerConfigurationInput(
        false,
        this.config.defaultResolverPolicy,
        this.config.sourceAddressHandle,
        this.config.fieldProvenance,
      ));
    }
    return ContainerConfiguration.from(input ?? this.config);
  }
}
