import type { BundleArray } from './bundle-array.js';
import type { BundleSpread, RegistryFactoryMethod, RegistryMethod } from './registry-object.js';
import type { SourceNodeRef } from '../refs.js';

export class BundleMember {
  constructor(
    readonly id: string,
    readonly source: SourceNodeRef | null,
    readonly referenceName: string,
    readonly note: string | null = null,
  ) {}
}

export class BundleExpansion {
  constructor(
    readonly id: string,
    readonly originMethod: RegistryMethod | RegistryFactoryMethod,
    readonly spread: BundleSpread,
    readonly bundle: BundleArray | null,
    readonly members: readonly BundleMember[] = [],
    readonly note: string | null = null,
  ) {}
}
