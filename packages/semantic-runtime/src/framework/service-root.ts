import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { KernelStoreRecord } from '../kernel/store.js';
import type { ProductKindKey } from '../kernel/vocabulary.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';

export const enum FrameworkServiceRootKind {
  Container = 'container',
  Service = 'service',
}

export const enum FrameworkServiceRootBasis {
  DiActivationBacked = 'di-activation-backed',
  ContainerGetBacked = 'container-get-backed',
  AppTaskDeclaredKey = 'apptask-declared-key',
  DirectConstructor = 'direct-constructor',
  FrameworkTypeAnnotation = 'framework-type-annotation',
  DeclarationSourceMatched = 'declaration-source-matched',
  CandidateOpen = 'candidate-open',
}

export function frameworkServiceRootBasisResolvesDiKey(
  basis: FrameworkServiceRootBasis,
): boolean {
  switch (basis) {
    case FrameworkServiceRootBasis.DiActivationBacked:
    case FrameworkServiceRootBasis.ContainerGetBacked:
    case FrameworkServiceRootBasis.AppTaskDeclaredKey:
      return true;
    case FrameworkServiceRootBasis.DirectConstructor:
    case FrameworkServiceRootBasis.FrameworkTypeAnnotation:
    case FrameworkServiceRootBasis.DeclarationSourceMatched:
    case FrameworkServiceRootBasis.CandidateOpen:
      return false;
  }
}

export class FrameworkServiceRoot {
  readonly productKindKey: ProductKindKey = KernelVocabulary.Framework.ServiceRoot.key;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly projectKey: string,
    readonly rootKind: FrameworkServiceRootKind,
    readonly serviceFamily: string | null,
    readonly serviceKeyName: string,
    readonly basis: FrameworkServiceRootBasis,
    readonly sourcePath: string,
    readonly start: number,
    readonly end: number,
    readonly evidenceStart: number,
    readonly evidenceEnd: number,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly evidenceSourceAddressHandle: AddressHandle | null,
    readonly ownerIdentityHandle: IdentityHandle | null = null,
    readonly ownerProductHandle: ProductHandle | null = null,
  ) {}
}

export class FrameworkServiceRootProjectResult {
  constructor(
    readonly roots: readonly FrameworkServiceRoot[],
    readonly records: readonly KernelStoreRecord[],
  ) {}

  readRoots(): readonly FrameworkServiceRoot[] {
    return this.roots;
  }
}
