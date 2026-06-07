import type {
  AppBuilderDomainFieldDescriptor,
  AppBuilderDomainIdentityValueKind,
  AppBuilderDomainSlotKind,
} from './domain-model.js';

/** Where a concrete app-builder domain descriptor came from before lowering. */
export enum AppBuilderDomainSourceKind {
  /** Domain descriptor was materialized from caller-supplied slot assignments. */
  CallerSupplied = 'caller-supplied',
}

/** Concrete domain shape consumed by source lowerers after caller/domain input is resolved. */
export interface AppBuilderDomainDescriptor {
  readonly id: string;
  readonly sourceKind: AppBuilderDomainSourceKind;
  readonly title: string;
  readonly summary: string;
  readonly entityTitle: string;
  readonly entityTypeName: string;
  readonly collectionMemberName: string;
  readonly identityMemberName: string;
  readonly identityValueKind: AppBuilderDomainIdentityValueKind;
  readonly fields: readonly AppBuilderDomainFieldDescriptor[];
  readonly slotKinds: readonly AppBuilderDomainSlotKind[];
}
