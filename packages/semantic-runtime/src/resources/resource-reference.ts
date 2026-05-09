import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import type { CheckerTypeReference } from '../type-system/type-shape.js';

/**
 * Resource-layer reference to a TypeScript value, declaration, or callable without retaining AST state.
 */
export class ResourceTargetReference {
  constructor(
    readonly identityHandle: IdentityHandle | null,
    readonly addressHandle: AddressHandle | null,
    readonly localName: string | null,
    readonly targetType: CheckerTypeReference | null = null,
  ) {}
}

export class ResourceAliasDefinition {
  constructor(
    readonly name: string,
    readonly addressHandle: AddressHandle | null = null,
    readonly provenanceHandle: ProvenanceHandle | null = null,
  ) {}
}

export class ResourceDependencyReference {
  constructor(
    readonly identityHandle: IdentityHandle | null,
    readonly keyName: string | null = null,
    readonly moduleKey: string | null = null,
    readonly localName: string | null = null,
  ) {}
}

export class InstructionReference {
  constructor(
    readonly productHandle: ProductHandle,
  ) {}
}
