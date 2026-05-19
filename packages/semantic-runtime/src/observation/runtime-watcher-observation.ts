import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { RuntimeWatcherReference } from '../template/runtime-watcher.js';
import type { CheckerTypeMemberKind } from '../type-system/type-shape.js';
import type { RuntimeObservedDependencyKind } from './runtime-binding-observation.js';

export type RuntimeWatcherObservedDependencyField =
  | 'watcher'
  | 'expression'
  | 'dependencyKind'
  | 'expressionKind'
  | 'sourceName'
  | 'sourceRootName'
  | 'memberName'
  | 'keyExpression'
  | 'methodName'
  | 'observedMemberKind'
  | 'observedMemberSource'
  | 'span'
  | 'source';

/** Expression read collected by a controller-owned watcher execution path. */
export class RuntimeWatcherObservedDependency {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly watcher: RuntimeWatcherReference,
    readonly expressionProductHandle: ProductHandle | null,
    readonly dependencyKind: RuntimeObservedDependencyKind,
    readonly expressionKind: string,
    readonly sourceName: string | null,
    readonly sourceRootName: string | null,
    readonly memberName: string | null,
    readonly keyExpression: string | null,
    readonly methodName: string | null,
    readonly observedMemberKind: CheckerTypeMemberKind | `${CheckerTypeMemberKind}` | null,
    readonly observedMemberSourceAddressHandle: AddressHandle | null,
    readonly spanStart: number | null,
    readonly spanEnd: number | null,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeWatcherObservedDependencyField>[] = [],
  ) {}
}
