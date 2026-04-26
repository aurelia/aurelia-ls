import { auLink } from './au-link.js';
import type {
  ContainerWorldRef,
  KeyRef,
  RegistrationRef,
} from './refs.js';
import { Registration } from './registration.js';
import { Resolver } from './resolver.js';

export interface ContainerEntry {
  readonly key: KeyRef;
  readonly world: ContainerWorldRef;
  readonly resolver: Resolver;
}

export interface ContainerLookupRequest {
  readonly includeAncestors?: boolean;
}

export interface ContainerState {
  readonly world: ContainerWorldRef;
  readonly entries: readonly ContainerEntry[];
}

export const CONTAINER_CONTRACT_OPERATION_KINDS = [
  'register',
  'get',
  'get-all',
  'get-resolver',
  'has',
  'invoke',
  'create-child',
  'resource-lookup',
] as const;

export type ContainerContractOperationKind =
  typeof CONTAINER_CONTRACT_OPERATION_KINDS[number];

type MutableContainerEntry = {
  key: KeyRef;
  world: ContainerWorldRef;
  resolver: Resolver;
};

@auLink('kernel:IContainer')
export class ContainerContract {
  readonly kind = 'container-contract' as const;

  constructor(
    readonly operations: readonly ContainerContractOperationKind[] = CONTAINER_CONTRACT_OPERATION_KINDS,
    readonly hasRoot: boolean = true,
    readonly canCreateChild: boolean = true,
  ) {}
}

@auLink('kernel:Container', true)
export class Container {
  readonly root: Container;
  readonly parent: Container | null;
  readonly world: ContainerWorldRef;

  private readonly entries = new Map<string, MutableContainerEntry>();

  constructor(
    world: ContainerWorldRef,
    parent: Container | null = null,
  ) {
    this.world = world;
    this.parent = parent;
    this.root = parent?.root ?? this;
  }

  createChild(
    world: ContainerWorldRef,
  ): Container {
    return new Container(world, this);
  }

  register(
    registrationInput: RegistrationRef | Registration,
  ): this {
    const registration = registrationInput instanceof Registration
      ? registrationInput
      : new Registration(registrationInput);

    if (registration.key == null) {
      return this;
    }

    const entry = this.getOrCreateEntry(registration.key, registration.world);
    entry.resolver.addRegistration(registration);
    return this;
  }

  get(
    key: KeyRef,
    request: ContainerLookupRequest = {},
  ): Registration | null {
    return this.getResolver(key, request)?.latest() ?? null;
  }

  getResolver(
    key: KeyRef,
    request: ContainerLookupRequest = {},
  ): Resolver | null {
    const entries = this.collectEntries(key, request.includeAncestors ?? true);
    return entries.at(-1)?.resolver ?? null;
  }

  getAll(
    key: KeyRef,
    request: ContainerLookupRequest = {},
  ): readonly Registration[] {
    const entries = this.collectEntries(key, request.includeAncestors ?? false);
    return entries.flatMap((entry) => entry.resolver.all());
  }

  findResource(
    key: KeyRef,
  ): Resolver | null {
    if (key.keyKind !== 'resource') {
      return null;
    }

    const own = this.entries.get(key.id);
    const root = this.root.entries.get(key.id);
    return own?.resolver ?? (this.root === this ? null : (root?.resolver ?? null));
  }

  inspectState(): ContainerState {
    return {
      world: this.world,
      entries: [...this.entries.values()].map((entry) => ({
        key: entry.key,
        world: entry.world,
        resolver: entry.resolver,
      })),
    };
  }

  private collectEntries(
    key: KeyRef,
    includeAncestors: boolean,
  ): readonly MutableContainerEntry[] {
    const own = this.entries.get(key.id);
    if (!includeAncestors || this.parent == null) {
      return own == null ? [] : [own];
    }

    return [
      ...(own == null ? [] : [own]),
      ...this.parent.collectEntries(key, true),
    ];
  }

  private getOrCreateEntry(
    key: KeyRef,
    world: ContainerWorldRef,
  ): MutableContainerEntry {
    const existing = this.entries.get(key.id);
    if (existing != null) {
      return existing;
    }

    const created: MutableContainerEntry = {
      key,
      world,
      resolver: new Resolver(key, world),
    };
    this.entries.set(key.id, created);
    return created;
  }
}
