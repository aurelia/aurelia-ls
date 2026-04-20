import type {
  ContainerWorldRef,
  KeyRef,
  RegistrationRef,
  SourceNodeRef,
  SymbolRef,
} from './refs.js';

export class Registration {
  readonly id: string;
  readonly owner: SymbolRef | SourceNodeRef;
  readonly source: SourceNodeRef;
  readonly world: ContainerWorldRef;
  readonly key: KeyRef | null;

  constructor(
    readonly ref: RegistrationRef,
  ) {
    this.id = ref.id;
    this.owner = ref.owner;
    this.source = ref.source;
    this.world = ref.world;
    this.key = ref.key;
  }
}
