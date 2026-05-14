import type {
  AuthoringCapabilityKey,
  AuthoringOpenReasonKind,
  AuthoringOperationKind,
  AuthoringSupportState,
} from './ontology.js';

/** One advertised authoring capability with explicit uncertainty. */
export class AuthoringCapability {
  readonly kind = 'authoring-capability' as const;

  constructor(
    readonly key: AuthoringCapabilityKey,
    readonly supportState: AuthoringSupportState,
    /** Operations needed to exercise this capability. */
    readonly operations: readonly AuthoringOperationKind[],
    /** Why the capability is partial or open, if it is not fully supported or verifiable. */
    readonly openReasonKinds: readonly AuthoringOpenReasonKind[] = [],
    readonly summary: string | null = null,
  ) {}
}

/** Negotiation surface the AI can inspect before promising an app shape to the user. */
export class AuthoringCapabilitySet {
  readonly kind = 'authoring-capability-set' as const;

  constructor(
    readonly capabilities: readonly AuthoringCapability[],
  ) {}

  read(key: AuthoringCapabilityKey): AuthoringCapability | null {
    return this.capabilities.find((capability) => capability.key === key) ?? null;
  }
}
